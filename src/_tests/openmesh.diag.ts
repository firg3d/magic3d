/**
 * DIAGNOSTIC (nu e test) — cele 4 cazuri „mesh deschis".
 *
 * Pentru fiecare caz: câte muchii de frontieră, pe ce capac, ce inel le produce,
 * dacă earcut a triangulat tot, și ce au în comun contururile. Fiecare caz e comparat
 * cu un caz care MERGE pe același font.
 *
 * Rulare:  npx tsx src/_tests/openmesh.diag.ts
 */
// @ts-ignore — opentype.js nu are declarații de tip
import opentype from 'opentype.js';
import ManifoldModule from 'manifold-3d';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { textSolid, configureManifold, type SolidReport } from '../core/geometry/textSolid.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const wasm: any = await ManifoldModule();
wasm.setup();
configureManifold(wasm);

const CAZURI: { font: string; text: string; eticheta: string; martor?: boolean }[] = [
  { font: 'PlayfairDisplay-Regular.ttf', text: 'B', eticheta: 'PlayfairDisplay „B"' },
  { font: 'PlayfairDisplay-Regular.ttf', text: 'A', eticheta: 'PlayfairDisplay „A"  (MARTOR)', martor: true },
  { font: 'PlayfairDisplay-Regular.ttf', text: '8', eticheta: 'PlayfairDisplay „8"  (MARTOR, tot 2 goluri)', martor: true },
  { font: 'Baloo2-Regular.ttf', text: '6', eticheta: 'Baloo2 „6"' },
  { font: 'Baloo2-Regular.ttf', text: '9', eticheta: 'Baloo2 „9"' },
  { font: 'Baloo2-Regular.ttf', text: '0', eticheta: 'Baloo2 „0"  (MARTOR, un gol)' },
  { font: 'Baloo2-Regular.ttf', text: '8', eticheta: 'Baloo2 „8"  (MARTOR, două goluri)', martor: true },
  { font: 'Sacramento-Regular.ttf', text: 'ut', eticheta: 'Sacramento „ut"' },
  { font: 'Sacramento-Regular.ttf', text: 'un', eticheta: 'Sacramento „un"  (MARTOR)', martor: true },
];

const H = 120, G = 25;
const cauta = (f: string) => {
  for (const d of ['public/fonts', 'fonts']) {
    const p = join(ROOT, d, f);
    try { opentype.loadSync(p); return p; } catch { /* încearcă următorul folder */ }
  }
  return null;
};
const nr = (n: number, d = 3) => n.toFixed(d);

for (const c of CAZURI) {
  const cale = cauta(c.font);
  console.log('\n' + '─'.repeat(78));
  console.log(c.eticheta);
  if (!cale) { console.log('  font negăsit — sar peste'); continue; }
  const font = opentype.loadSync(cale);

  const rep: Partial<SolidReport> = { debug: true };
  let eroare = '';
  try { textSolid(font, c.text, H, G, rep); } catch (e: any) { eroare = e?.message ?? String(e); }
  const dbg = rep.dbg ?? {};

  console.log(`  rezultat: ${eroare ? 'EȘEC @ ' + rep.failedStep : 'OK'}${eroare ? ' — ' + eroare : ''}`);
  console.log(`  contururi: ${rep.ringsIn} (solide ${rep.solidsIn} / găuri ${rep.holesIn}) -> după union: ${rep.polysAfterUnion} poligoane, ${rep.ringsAfterUnion} inele`);
  console.log(`  mesh brut: ${rep.triangles} tri · frontieră ${rep.rawBoundaryEdges} · non-manifold ${rep.rawNonManifoldEdges}`);

  // ---- earcut: a triangulat tot? ----
  for (const [i, e] of (dbg.earcut ?? []).entries()) {
    const lipsa = e.triAsteptate - e.triObtinute;
    console.log(`  earcut poligon ${i}: ${e.varfuri} vârfuri, ${e.gauri} găuri -> ${e.triObtinute}/${e.triAsteptate} triunghiuri` +
      (lipsa ? `   ⟵ LIPSESC ${lipsa}` : '   complet'));
  }

  // ---- unde sunt muchiile de frontieră ----
  const bd: { a: number[]; b: number[] }[] = dbg.boundary ?? [];
  if (bd.length) {
    const fata = bd.filter((e) => e.a[2] > G - 1e-6 && e.b[2] > G - 1e-6).length;
    const spate = bd.filter((e) => e.a[2] < 1e-6 && e.b[2] < 1e-6).length;
    console.log(`  frontieră: ${fata} pe capacul FRONTAL (z=${G}), ${spate} pe capacul DORSAL (z=0), ${bd.length - fata - spate} pe pereți`);
    for (const e of bd.slice(0, 6)) console.log(`     (${nr(e.a[0], 2)}, ${nr(e.a[1], 2)}, ${nr(e.a[2], 1)}) → (${nr(e.b[0], 2)}, ${nr(e.b[1], 2)}, ${nr(e.b[2], 1)})`);
    if (bd.length > 6) console.log(`     … încă ${bd.length - 6}`);
  }

  // ---- ce au contururile: tangențe între inele, auto-atingeri, segmente degenerate ----
  for (const [pi, poly] of (dbg.polys ?? []).entries()) {
    const inele: number[][][] = poly;
    let degenerate = 0, minSeg = Infinity;
    // toate vârfurile, cu inelul din care vin
    const harta = new Map<string, { inele: number[]; nr: number }>();
    inele.forEach((r, ri) => {
      for (let k = 0; k < r.length; k++) {
        const a = r[k], b = r[(k + 1) % r.length];
        const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (L < 1e-9) degenerate++; else if (L < minSeg) minSeg = L;
        const key = `${a[0].toFixed(4)}_${a[1].toFixed(4)}`;
        const e = harta.get(key) ?? { inele: [], nr: 0 };
        e.nr++; if (!e.inele.includes(ri)) e.inele.push(ri);
        harta.set(key, e);
      }
    });
    const intreInele = [...harta.entries()].filter(([, e]) => e.inele.length > 1);
    const autoAtingere = [...harta.entries()].filter(([, e]) => e.inele.length === 1 && e.nr > 1);
    // distanța minimă ÎNTRE ORICE DOUĂ INELE, în ambele sensuri (punct↔segment)
    const punctSegment = (p: number[], a: number[], b: number[]) => {
      const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
      const t = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)) : 0;
      return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
    };
    let minGap = Infinity, perechea = '';
    for (let i = 0; i < inele.length; i++) for (let j = 0; j < inele.length; j++) {
      if (i === j) continue;
      for (const p of inele[i]) for (let k = 0; k < inele[j].length; k++) {
        const d = punctSegment(p, inele[j][k], inele[j][(k + 1) % inele[j].length]);
        if (d < minGap) { minGap = d; perechea = `${i}↔${j}`; }
      }
    }
    console.log(`  poligon ${pi}: ${inele.length} inele (${inele.map((r) => r.length).join('+')} vârfuri) · segment minim ${nr(minSeg, 6)} mm · degenerate ${degenerate}`);
    console.log(`     vârfuri comune ÎNTRE inele: ${intreInele.length}${intreInele.length ? '  ' + intreInele.slice(0, 3).map(([k, e]) => `(${k.replace('_', ', ')}) inele ${e.inele.join('+')}`).join(' · ') : ''}`);
    console.log(`     AUTO-ATINGERI (același inel trece de 2 ori prin punct): ${autoAtingere.length}` +
      (autoAtingere.length ? '  ' + autoAtingere.slice(0, 3).map(([k, e]) => `(${k.replace('_', ', ')}) ×${e.nr}`).join(' · ') : ''));
    if (isFinite(minGap)) console.log(`     distanță minimă între inele: ${nr(minGap, 6)} mm  (${perechea})`);
  }
}
console.log('\n' + '─'.repeat(78) + '\n');
