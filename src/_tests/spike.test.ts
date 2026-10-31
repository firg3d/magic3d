/**
 * TEST PERMANENT — CELE 6 CAZURI DE VALIDARE (fostul src/spike.ts).
 *
 * Erau un script rulat manual; volumele lor sunt referința de non-regresie cerută la
 * fiecare schimbare de geometrie, așa că devin aserțiuni dure. Dacă un volum se schimbă
 * cu mai mult de 0.01 mm³, testul pică — chiar dacă mesh-ul rămâne valid.
 *
 * Acoperă: contur cu gaură, litere care se suprapun (union), componente separate
 * (punctul pe „i"), netezimea muchiei curbe, diacritice RO comma-below (NU cedilă).
 *
 * Rulare:  npm run test:spike
 */
// @ts-ignore — opentype.js nu are declarații de tip (ca în restul proiectului)
import opentype from 'opentype.js';
import ManifoldModule from 'manifold-3d';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { textSolid, configureManifold, type SolidReport } from '../core/geometry/textSolid.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FONTS = join(ROOT, 'fonts');

interface Caz {
  nume: string; font: string; text: string; h: number; g: number;
  volum: number;        // mm³, referința de non-regresie
  componente: number;   // corpuri conexe așteptate
  netezime?: boolean;   // caz 4: sageata muchiei ≤ toleranța de flatten
  glifeRO?: boolean;    // caz 5/6: diacriticele cerute trebuie să existe în font
  note: string;
}

const CAZURI: Caz[] = [
  { nume: 'caz1_A', font: 'ArchivoBlack-Regular.ttf', text: 'A', h: 180, g: 25,
    volum: 521191.60, componente: 1, note: 'un contur cu o gaură interioară' },
  { nume: 'caz2_matei', font: 'GreatVibes-Regular.ttf', text: 'matei', h: 45, g: 2.5,
    volum: 1934.40, componente: 2, note: 'litere care se suprapun — testul real al union-ului' },
  { nume: 'caz3_Ianis', font: 'GreatVibes-Regular.ttf', text: 'Ianis', h: 45, g: 2.5,
    volum: 2565.74, componente: 3, note: 'punctul pe „i" rămâne componentă separată' },
  { nume: 'caz4_O', font: 'ArchivoBlack-Regular.ttf', text: 'O', h: 120, g: 25,
    volum: 260189.71, componente: 1, netezime: true, note: 'literă curbă: netezimea muchiei' },
  { nume: 'caz5_Stefan', font: 'GreatVibes-Regular.ttf', text: 'Ștefan', h: 45, g: 2.5,
    volum: 3323.07, componente: 3, glifeRO: true, note: 'diacritice RO (Ș comma-below)' },
  { nume: 'caz6_Madalina', font: 'GreatVibes-Regular.ttf', text: 'Mădălina', h: 45, g: 2.5,
    volum: 5352.76, componente: 5, glifeRO: true, note: 'diacritice RO (ă breve)' },
];

/** comma-below pentru ș/ț — cedila (U+015E…) e substituentul GREȘIT, nu se acceptă */
const RO_CERUTE: [string, number][] = [['Ș', 0x0218], ['ș', 0x0219], ['Ț', 0x021A], ['ț', 0x021B],
  ['Ă', 0x0102], ['ă', 0x0103], ['Î', 0x00CE], ['î', 0x00EE], ['Â', 0x00C2], ['â', 0x00E2]];
const CEDILA_INTERZISA = [0x015E, 0x015F, 0x0162, 0x0163];

const wasm: any = await ManifoldModule();
wasm.setup();
configureManifold(wasm);

let esecuri = 0;
const check = (nume: string, ok: boolean, detaliu = '') => {
  console.log(`${ok ? '  OK  ' : '  EȘEC'} ${nume}${detaliu ? '  — ' + detaliu : ''}`);
  if (!ok) esecuri++;
};
const f = (n: number, d = 2) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

type V2 = [number, number];
const dist = (a: V2, b: V2) => Math.hypot(a[0] - b[0], a[1] - b[1]);
/** raza cercului prin 3 puncte (Infinity dacă sunt coliniare) */
function razaCircum(a: V2, b: V2, c: V2): number {
  const arie2 = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
  if (arie2 < 1e-12) return Infinity;
  return (dist(a, b) * dist(b, c) * dist(c, a)) / (2 * arie2);
}
/**
 * Netezimea măsurată DIN MESH-UL FINAL, independent de textSolid: se extrag buclele de
 * frontieră ale feței frontale și, pentru fiecare muchie, sageata față de curba locală.
 */
function netezime(solid: any, grosime: number): { bucle: number; muchieMax: number; sageataMax: number } {
  const mesh = solid.getMesh();
  const vp: Float32Array = mesh.vertProperties, tv: Uint32Array = mesh.triVerts, np: number = mesh.numProp;
  const peFata = (i: number) => vp[i * np + 2] > grosime - 1e-3;
  const P = (i: number): V2 => [vp[i * np], vp[i * np + 1]];
  const cheie = (a: number, b: number) => (a < b ? `${a}_${b}` : `${b}_${a}`);
  const nrMuchii = new Map<string, number>();
  for (let t = 0; t < tv.length; t += 3) {
    const [a, b, c] = [tv[t], tv[t + 1], tv[t + 2]];
    if (!(peFata(a) && peFata(b) && peFata(c))) continue;
    for (const [u, v] of [[a, b], [b, c], [c, a]] as [number, number][]) nrMuchii.set(cheie(u, v), (nrMuchii.get(cheie(u, v)) ?? 0) + 1);
  }
  const vecini = new Map<number, number[]>();
  for (const [k, n] of nrMuchii) {
    if (n !== 1) continue;                                   // muchie de frontieră = perimetrul feței
    const [a, b] = k.split('_').map(Number);
    (vecini.get(a) ?? vecini.set(a, []).get(a)!).push(b);
    (vecini.get(b) ?? vecini.set(b, []).get(b)!).push(a);
  }
  const vazute = new Set<number>();
  let bucle = 0, muchieMax = 0, sageataMax = 0;
  for (const start of vecini.keys()) {
    if (vazute.has(start)) continue;
    const bucla: number[] = [];
    let prev = -1, cur = start;
    while (cur !== -1 && !vazute.has(cur)) {
      vazute.add(cur); bucla.push(cur);
      const next = (vecini.get(cur) ?? []).find((n) => n !== prev && !vazute.has(n));
      prev = cur; cur = next ?? -1;
    }
    if (bucla.length < 3) continue;
    bucle++;
    for (let i = 0; i < bucla.length; i++) {
      const pA = P(bucla[i]), pB = P(bucla[(i + 1) % bucla.length]);
      const pPrev = P(bucla[(i - 1 + bucla.length) % bucla.length]);
      const L = dist(pA, pB); if (L > muchieMax) muchieMax = L;
      const R = razaCircum(pPrev, pA, pB);
      if (isFinite(R) && R > 0) {
        const h = L / 2;
        const sag = h >= R ? R : R - Math.sqrt(R * R - h * h);
        if (sag > sageataMax) sageataMax = sag;
      }
    }
  }
  return { bucle, muchieMax, sageataMax };
}

console.log('\n=== 6 cazuri de validare (referința de non-regresie) ===');
const tabel: string[] = [];
for (const c of CAZURI) {
  console.log(`\n${c.nume}  „${c.text}"  h=${c.h} g=${c.g}  (${c.note})`);
  const font = opentype.loadSync(join(FONTS, c.font));

  if (c.glifeRO) {
    const lipsa = RO_CERUTE.filter(([, cp]) => font.charToGlyphIndex(String.fromCodePoint(cp)) === 0);
    check('  toate glifele RO cerute există în font', lipsa.length === 0, lipsa.map(([n]) => n).join(' '));
    const cedila = [...c.text].map((ch) => ch.codePointAt(0)!).filter((cp) => CEDILA_INTERZISA.includes(cp));
    check('  textul folosește comma-below, nu cedilă', cedila.length === 0);
  }

  const rep: Partial<SolidReport> = {};
  let solid: any = null, eroare = '';
  try { solid = textSolid(font, c.text, c.h, c.g, rep); } catch (e: any) { eroare = e?.message ?? String(e); }
  if (!solid) {
    check(`  ${c.nume} se generează`, false, `${rep.failedStep ?? '?'}: ${eroare}`);
    tabel.push(`  ${c.nume.padEnd(14)} EȘEC (${rep.failedStep ?? '?'})`);
    continue;
  }

  const status = String(solid.status());
  const volum = solid.volume();
  const comp = solid.decompose().length;   // doar măsurare, nu separare de corpuri la import
  check('  status manifold NoError', status === 'NoError', status);
  check(`  volum = ${f(c.volum)} mm³`, Math.abs(volum - c.volum) <= 0.01, `măsurat ${f(volum)} mm³ (Δ ${f(volum - c.volum, 4)})`);
  check(`  ${c.componente} componente conexe`, comp === c.componente, `${comp}`);
  check('  mesh brut închis (0 muchii de frontieră)', rep.rawClosed === true && (rep.rawBoundaryEdges ?? 0) === 0,
    `frontieră ${rep.rawBoundaryEdges} · non-manifold ${rep.rawNonManifoldEdges}`);

  if (c.netezime) {
    const s = netezime(solid, c.g);
    const tol = rep.flattenToleranceMm ?? 0.05;
    check(`  muchie curbă netedă la ${tol} mm`, s.sageataMax <= tol + 1e-6,
      `${s.bucle} bucle · muchie max ${f(s.muchieMax, 3)} mm · sageată max ${f(s.sageataMax, 4)} mm`);
  }
  tabel.push(`  ${c.nume.padEnd(14)} ${status.padEnd(8)} ${f(volum).padStart(12)} mm³  ${comp} comp  ${rep.triangles} tri`);
}

// ---------- BUZUNARUL BAZEI ----------
// A doua referință de non-regresie, pentru montajul literă↔postament. Volumul e invariant
// la mutare/rotire, deci diferența dintre baza întreagă și baza după scădere E buzunarul.
{
  // Valoare actualizata dupa eliminarea regulii de material minim sub litera:
  // infigerea e acum coordonata libera, limitata doar de grosimea bazei (Teren = 2.9 mm).
  //
  // RECALIBRAT A DOUA OARA: 1786.75 -> 1217.21 mm3, scadere intentionata de 32%.
  // Locasul talpii nu mai e o prisma cu fund plat, ci un socket in TREPTE: fiecare felie
  // primeste silueta materialului aflat la acea cota SAU MAI JOS, deci locasul se ingusteaza
  // in adancime si se opreste la cota fiecarui picior. Se scoate mai putin material tocmai
  // fiindca baza sprijina acum conturul talpii, in loc sa lase gol sub picioarele scurte:
  // prisma veche lasa piciorul care intra 0.5 mm suspendat peste un gol adanc cat cel mai de
  // jos picior. Vezi `socketTalpa` in assembly.ts.
  // +1.68 mm3 (0.14%) fata de 1217.21: rotunjirea are acum trepte de 0.1 mm in loc de 0.15,
  // iar retesalarea plicului muta marginal silueta talpii. Nu e schimbare de comportament.
  const BUZUNAR_MM3 = 1218.89;  // Teren.3mf, litera A/Baloo 2 120 mm, infigere efectiva 2.9 mm
  const { readFileSync } = await import('node:fs');
  const { threeMFToManifold } = await import('../core/assets/threemf-load.js');
  const { configureManifold: cfgAsm, buildAssembly } = await import('../apps/litere/assembly.js');
  cfgAsm(wasm);
  const b = readFileSync(join(ROOT, 'public', 'base', 'Teren.3mf'));
  const baza: any = await threeMFToManifold(wasm, b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  console.log('\nbuzunarul bazei (Teren.3mf)');
  if (!baza.ok) check('  Teren.3mf se încarcă', false, baza.motiv);
  else {
    const r: any = buildAssembly({
      litera: 'A', fontLitera: opentype.loadSync(join(FONTS, 'Baloo2-Regular.ttf')), inaltimeLitera: 120, grosimeLitera: 25,
      chenarActiv: true, latimeChenar: 3, adancimeChenar: 3, razaMuchie: 1.2, taiereBaza: 2,
      scris: 'Andrei', fontScris: opentype.loadSync(join(FONTS, 'Pacifico-Regular.ttf')), inaltimeScris: 40, reliefScris: 2.5,
      offsetX: 0.84, offsetY: -35.2, rotatieScris: 0, scrisRotX: 0, scrisRotY: 0, scrisPozitieZ: -1.04,
      modScris: 'locas', grosimeScris: 4.5, jocInsertie: 0.2, tematici: [],
      baza: { manifold: baza.data.manifold,
        corpuri: baza.data.info.map((c: any) => ({ manifold: c.manifold, culoare: c.culoare, nume: c.nume })),
        adancimeInfigere: 5, jocInfigere: 0.2, pozitieLiteraX: 0, pozitieLiteraZ: 0, rotatieLitera: 0 },
    } as any);
    const buzunar = baza.data.manifold.volume() - r.corpBaza.volume();
    check(`  buzunar = ${BUZUNAR_MM3} mm³`, Math.abs(buzunar - BUZUNAR_MM3) <= 0.01, `${buzunar.toFixed(3)} mm³`);
    check('  litera se potrivește în locaș', r.diagnostice.baza.fitOk === true);
    check('  adâncime efectivă = grosimea bazei (2.9 mm), cerut 5 mm',
      r.diagnostice.baza.adancimeEfectiva === 2.9, `${r.diagnostice.baza.adancimeEfectiva} mm`);
    check('  corpurile bazei rămân separate', r.corpBazaCorpuri.length === 2, `${r.corpBazaCorpuri.length}`);
  }
}

console.log('\nSUMAR:');
for (const r of tabel) console.log(r);
console.log(esecuri ? `\n${esecuri} verificări EȘUATE\n` : '\n✅ Toate cele 6 cazuri, identice cu referința.\n');
/**
 * `process.exitCode`, NU `process.exit`.
 *
 * Dupa o operatie manifold, `process.exit` taie procesul cat timp WASM-ul inca se inchide, iar
 * libuv crapa pe Windows cu „Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)" si cod 127.
 * Suita raporta ESEC desi toate verificarile trecusera. Vezi regula din docs/design/.
 */
process.exitCode = esecuri ? 1 : 0;
