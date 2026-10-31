/**
 * TEST PERMANENT — CAZURILE „MESH DESCHIS".
 *
 * Patru combinații literă×font produceau mesh deschis (8–16 muchii de frontieră,
 * 0 non-manifold) și nu se generau deloc. Cauza: earcut nu acoperă tot capacul când
 * două inele se ating într-un vârf, sau când o gaură e coliniară cu puntea pe care
 * earcut o trage spre conturul exterior. Poligoanele astea se construiesc acum cu
 * triangulatorul lui manifold (PASUL 8b din textSolid).
 *
 * `Sacramento „ut"` NU e acoperit de testul de alfabet (font script, combinație de
 * două litere), deci trebuie verificat aici.
 *
 * Oracol independent: volumul unei extrudări = aria netă după union × grosime.
 *
 * Rulare:  npm run test:openmesh
 */
// @ts-ignore — opentype.js nu are declarații de tip (ca în restul proiectului)
import opentype from 'opentype.js';
import ManifoldModule from 'manifold-3d';
import { join, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { textSolid, configureManifold, type SolidReport } from '../core/geometry/textSolid.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const wasm: any = await ManifoldModule();
wasm.setup();
configureManifold(wasm);

const H = 120, G = 25;
const CAZURI: { font: string; text: string; deRezerva: number }[] = [
  { font: 'PlayfairDisplay-Regular.ttf', text: 'B', deRezerva: 1 },   // 2 inele care se ating
  { font: 'Baloo2-Regular.ttf', text: '6', deRezerva: 1 },            // 1 inel care atinge alt inel
  { font: 'Baloo2-Regular.ttf', text: '9', deRezerva: 1 },            // idem
  { font: 'Sacramento-Regular.ttf', text: 'ut', deRezerva: 1 },       // punte coliniară cu o gaură
];
// martori pe aceleași fonturi: trebuie să meargă în continuare pe drumul earcut
const MARTORI: { font: string; text: string }[] = [
  { font: 'PlayfairDisplay-Regular.ttf', text: 'A' },
  { font: 'PlayfairDisplay-Regular.ttf', text: '8' },
  { font: 'Baloo2-Regular.ttf', text: '0' },
  { font: 'Baloo2-Regular.ttf', text: '8' },
  { font: 'Sacramento-Regular.ttf', text: 'un' },
];

const caleFont = (f: string) => ['public/fonts', 'fonts'].map((d) => join(ROOT, d, f)).find(existsSync) ?? null;
let esecuri = 0;
const check = (nume: string, ok: boolean, detaliu = '') => {
  console.log(`${ok ? '  OK  ' : '  EȘEC'} ${nume}${detaliu ? '  — ' + detaliu : ''}`);
  if (!ok) esecuri++;
};

console.log('\nCAZURI REPARATE (foste „mesh deschis")');
for (const c of CAZURI) {
  const cale = caleFont(c.font);
  if (!cale) { check(`${c.font} „${c.text}"`, false, 'font negăsit'); continue; }
  const rep: Partial<SolidReport> = {};
  let solid: any = null, eroare = '';
  try { solid = textSolid(opentype.loadSync(cale), c.text, H, G, rep); } catch (e: any) { eroare = e?.message ?? String(e); }
  const nume = `${c.font.replace('-Regular.ttf', '')} „${c.text}"`;
  if (!solid) { check(nume, false, `${rep.failedStep}: ${eroare}`); continue; }
  const volAsteptat = (rep.areaOutputMm2 ?? 0) * G;
  const vol = solid.volume();
  check(`${nume} se generează`, String(solid.status()) === 'NoError', String(solid.status()));
  check(`  volum = aria după union × grosime`, Math.abs(vol - volAsteptat) / volAsteptat < 5e-3,
    `${vol.toFixed(1)} vs ${volAsteptat.toFixed(1)} mm³`);
  check(`  a folosit calea de rezervă`, (rep.polysDeRezerva ?? 0) === c.deRezerva, `${rep.polysDeRezerva} poligoane`);
}

console.log('\nMARTORI (trebuie să rămână pe drumul earcut, neatins)');
for (const m of MARTORI) {
  const cale = caleFont(m.font);
  if (!cale) { check(`${m.font} „${m.text}"`, false, 'font negăsit'); continue; }
  const rep: Partial<SolidReport> = {};
  let solid: any = null, eroare = '';
  try { solid = textSolid(opentype.loadSync(cale), m.text, H, G, rep); } catch (e: any) { eroare = e?.message ?? String(e); }
  const nume = `${m.font.replace('-Regular.ttf', '')} „${m.text}"`;
  if (!solid) { check(nume, false, eroare); continue; }
  check(`${nume} generat pe drumul earcut`, (rep.polysDeRezerva ?? 0) === 0 && rep.rawClosed === true,
    `rezervă ${rep.polysDeRezerva} · frontieră ${rep.rawBoundaryEdges} · non-manifold ${rep.rawNonManifoldEdges}`);
}

console.log(esecuri ? `\n${esecuri} verificări EȘUATE\n` : '\n✅ Cele 4 cazuri se generează; martorii nu s-au mișcat.\n');
/**
 * `process.exitCode`, NU `process.exit`.
 *
 * Dupa o operatie manifold, `process.exit` taie procesul cat timp WASM-ul inca se inchide, iar
 * libuv crapa pe Windows cu „Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)" si cod 127.
 * Suita raporta ESEC desi toate verificarile trecusera. Vezi regula din docs/design/.
 */
process.exitCode = esecuri ? 1 : 0;
