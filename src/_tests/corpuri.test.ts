/**
 * TEST PERMANENT — CORPURILE NU IES DIN OBIECTUL LOR.
 *
 * Un model multi-corp e randat și exportat pe corpuri separate, dar geometria compusă
 * rămâne referința pentru buzunar și mișcare solidară. Dacă un corp primește altă
 * transformare decât compusul, iese din el — și obiectul apare deformat, cu piesele
 * suprapuse sau împrăștiate.
 *
 * Bugul concret care a motivat testul: transformarea de așezare se calcula din bounding box,
 * iar aplicată separat fiecărui corp centra fiecare corp pe el însuși. Microfonul din 6 piese
 * înșiruite pe 20 mm devenea 6 forme în același punct.
 *
 * Se verifică în DOUĂ locuri: la ieșirea din parser și după transformarea din assembly.
 *
 * Rulare:  npm run test:corpuri
 */
// @ts-ignore — opentype.js nu are declarații de tip (ca în restul proiectului)
import opentype from 'opentype.js';
import ManifoldModule from 'manifold-3d';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { threeMFToManifold } from '../core/assets/threemf-load.js';
import { configureManifold as cfgText } from '../core/geometry/textSolid.js';
import { configureManifold as cfgAsm, buildAssembly } from '../apps/litere/assembly.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TOL = 0.01;   // mm

const wasm: any = await ManifoldModule();
wasm.setup(); cfgText(wasm); cfgAsm(wasm);

let esecuri = 0;
const check = (nume: string, ok: boolean, detaliu = '') => {
  console.log(`${ok ? '  OK  ' : '  EȘEC'} ${nume}${detaliu ? '  — ' + detaliu : ''}`);
  if (!ok) esecuri++;
};
const incarca = async (cale: string) => {
  const b = readFileSync(cale);
  return (await threeMFToManifold(wasm, b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength))) as any;
};
/** fiecare corp trebuie să încapă în bounding box-ul compusului */
function corpuriInCompus(compus: any, corpuri: any[]): { ok: boolean; iesite: string[] } {
  const C = compus.boundingBox();
  const iesite: string[] = [];
  corpuri.forEach((c, i) => {
    const b = (c.manifold ?? c).boundingBox();
    const inauntru = [0, 1, 2].every((k) => b.min[k] >= C.min[k] - TOL && b.max[k] <= C.max[k] + TOL);
    if (!inauntru) iesite.push(`corp ${i + 1}`);
  });
  return { ok: iesite.length === 0, iesite };
}
/** corpurile trebuie să-și păstreze pozițiile RELATIVE după transformare */
function relatiiPastrate(inainte: any[], dupa: any[]): { ok: boolean; abatereMax: number } {
  const centru = (m: any) => { const b = m.boundingBox(); return [0, 1, 2].map((k) => (b.min[k] + b.max[k]) / 2); };
  let max = 0;
  for (let i = 1; i < inainte.length; i++) {
    // distanța față de primul corp, invariantă la mutare (scara e uniformă, deci se raportează)
    const dI = centru(inainte[i].manifold).map((v, k) => v - centru(inainte[0].manifold)[k]);
    const dD = centru(dupa[i].manifold).map((v, k) => v - centru(dupa[0].manifold)[k]);
    const nI = Math.hypot(...dI), nD = Math.hypot(...dD);
    if (nI > 1e-6) max = Math.max(max, Math.abs(nD / nI - 1));   // raport, scara fiind uniformă
  }
  return { ok: max < 0.01, abatereMax: +max.toFixed(5) };
}

// ---------- 1. la ieșirea din parser: TOATE modelele multi-corp din bibliotecă ----------
console.log('\nLA IEȘIREA DIN PARSER');
for (const zona of ['tematici', 'base']) {
  const dir = join(ROOT, 'public', zona);
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir).filter((x) => /\.3mf$/i.test(x)).sort()) {
    const r = await incarca(join(dir, f));
    if (!r.ok) { check(`${zona}/${f}`, false, r.motiv); continue; }
    const info = r.data.info ?? [];
    if (info.length < 2) continue;                       // un singur corp: nimic de verificat
    const v = corpuriInCompus(r.data.manifold, info);
    check(`${zona}/${f.replace('.3mf', '')} (${info.length} corpuri)`, v.ok, v.iesite.join(', '));
  }
}

// ---------- 2. după transformarea din assembly ----------
console.log('\nDUPĂ TRANSFORMAREA DIN ASSEMBLY');
{
  const font = opentype.loadSync(join(ROOT, 'fonts', 'Baloo2-Regular.ttf'));
  const cazuri = [
    { fisier: join(ROOT, 'public', 'tematici', 'microfon.3mf'), rot: [0, 0, 0] as [number, number, number] },
    { fisier: join(ROOT, 'public', 'tematici', 'creioane.3mf'), rot: [0, 0, 0] as [number, number, number] },
    // cu rotație: transformarea se complică, dar corpurile trebuie să rămână solidare
    { fisier: join(ROOT, 'public', 'tematici', 'cartonase.3mf'), rot: [15, 25, 40] as [number, number, number] },
  ].filter((c) => existsSync(c.fisier));

  for (const caz of cazuri) {
    const nume = caz.fisier.split(/[\\/]/).pop()!.replace('.3mf', '');
    const r = await incarca(caz.fisier);
    if (!r.ok) { check(nume, false, r.motiv); continue; }
    const info = r.data.info ?? [];
    const sc = 35 / (Math.max(...r.data.dim) || 1);
    const scalat = (m: any) => m.scale([sc, sc, sc]);
    const rez: any = buildAssembly({
      litera: 'A', fontLitera: font, inaltimeLitera: 120, grosimeLitera: 25,
      chenarActiv: true, latimeChenar: 3, adancimeChenar: 3, razaMuchie: 1.2, taiereBaza: 2,
      scris: '', fontScris: font, inaltimeScris: 40, reliefScris: 2.5,
      offsetX: 0, offsetY: 0, rotatieScris: 0, scrisRotX: 0, scrisRotY: 0, scrisPozitieZ: -1,
      modScris: 'locas', grosimeScris: 4.5, jocInsertie: 0.2, baza: null,
      tematici: [{ id: 't1', nume, manifold: scalat(r.data.manifold), offX: 0, offY: 0,
        rotX: caz.rot[0], rotY: caz.rot[1], rotZ: caz.rot[2], pozitieZ: -3, culoare: '#888888',
        corpuri: info.map((c: any) => ({ nume: c.nume, culoare: c.culoare, manifold: scalat(c.manifold) })) }],
    } as any);
    const piesa = rez.pieseTematici[0];
    check(`${nume} · ${info.length} corpuri plasate`, (piesa.corpuri?.length ?? 0) === info.length,
      `${piesa.corpuri?.length ?? 0}`);
    const v = corpuriInCompus(piesa.manifold, piesa.corpuri ?? []);
    check(`  toate corpurile în compus (rot ${caz.rot.join(',')})`, v.ok, v.iesite.join(', '));
    const rel = relatiiPastrate(info.map((c: any) => ({ manifold: scalat(c.manifold) })), piesa.corpuri ?? []);
    check('  pozițiile relative păstrate', rel.ok, `abatere ${(rel.abatereMax * 100).toFixed(3)}%`);
  }
}

console.log(esecuri ? `\n${esecuri} verificări EȘUATE\n` : '\n✅ Corpurile stau în obiectul lor, înainte și după transformare.\n');
process.exitCode = esecuri ? 1 : 0;
