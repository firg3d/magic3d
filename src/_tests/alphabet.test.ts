/**
 * TEST PERMANENT — TOT ALFABETUL, pe mai multe fonturi.
 *
 * Spike-ul testa doar „A" și „O": un bug care rupea alte litere (ex. „A" în Baloo 2,
 * unde conturul exterior era clasificat greșit drept gaură) trecea neobservat.
 *
 * Oracol INDEPENDENT de textSolid: aria netă a glifei calculată direct din contururile
 * fontului (suma ariilor cu semn — convenția de winding a fontului dă outer + / găuri −).
 *   volum așteptat = aria netă (mm²) × grosime (mm)
 * O literă care produce sub 10% din volumul așteptat = EȘEC (spec).
 * Se semnalează separat și abaterile mari (<90%), ca avertisment.
 *
 * Rulare:  npm run test:alphabet
 * Iese cu cod 1 dacă vreo literă eșuează.
 */
// @ts-ignore — opentype.js nu are declarații de tip (ca în restul proiectului)
import opentype from 'opentype.js';
import ManifoldModule from 'manifold-3d';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { configureManifold, textSolid, type SolidReport } from '../core/geometry/textSolid.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FONT_DIR = join(ROOT, 'public', 'fonts');

// TOATE fonturile din folder, nu o listă fixă: un font nou intră automat în test.
// Se poate restrânge la câteva pentru rulări rapide:  npx tsx ... Baloo2 Cinzel
const filtru = process.argv.slice(2);
const FONTS = readdirSync(FONT_DIR)
  .filter((f) => /\.(ttf|otf)$/i.test(f))
  .filter((f) => !filtru.length || filtru.some((q) => f.toLowerCase().includes(q.toLowerCase())))
  .sort();
const LITERE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const CIFRE = '0123456789'.split('');
// tot ce se poate alege din selectorul aplicației, nu doar A-Z: diacriticele majuscule și
// simbolurile ajung pe postament la fel de des (nume românești, „&", numere de casă).
const DIACRITICE = ['Ă', 'Â', 'Î', 'Ș', 'Ț'];
const SIMBOLURI = ['&'];
const H = 120, G = 25;
const PRAG_ESEC = 0.10;   // sub 10% din volumul așteptat => EȘEC (spec)
const PRAG_AVERT = 0.90;  // sub 90% => avertisment (suprapuneri legitime pot scădea aria)

const load = (f: string) => {
  const b = readFileSync(join(FONT_DIR, f));
  return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
};

/**
 * aria netă a glifei, din contururile fontului (independent de textSolid)
 *
 * Independența care contează e METODA: aria se calculează direct din contururi, nu prin
 * manifold. SCARA, în schimb, trebuie să fie aceeași ca în textSolid — altfel raportul
 * volum/așteptat compară două dimensiuni diferite și nu mai spune nimic despre geometrie.
 * De aceea aici se repetă și banda de sanitate pe sCapHeight (vezi PASUL 5 din
 * core/geometry/textSolid.ts). Scara însăși e verificată separat, la finalul fișierului,
 * prin înălțimea măsurată pe solidul final — acolo nu se împrumută nimic.
 */
function ariaNetaMM2(font: any, ch: string, hMM: number): number {
  const os2 = font.tables && font.tables.os2;
  const declarat = os2 && os2.sCapHeight ? os2.sCapHeight : 0;
  let cap = declarat >= 0.4 * font.unitsPerEm && declarat <= font.unitsPerEm ? declarat : 0;
  if (!cap || cap <= 0) { try { const bb = font.charToGlyph('H')?.getBoundingBox(); if (bb && bb.y2 > bb.y1) cap = bb.y2 - bb.y1; } catch { /* ignore */ } }
  if (!cap || cap <= 0) cap = font.unitsPerEm * 0.7;
  const fontSize = hMM * font.unitsPerEm / cap;          // aceeași scală ca în textSolid
  const path = font.charToGlyph(ch).getPath(0, 0, fontSize);
  let cx = 0, cy = 0, sx = 0, sy = 0;
  let ring: [number, number][] = [];
  const rings: [number, number][][] = [];
  const N = 16;
  const closeRing = () => { if (ring.length >= 3) rings.push(ring); ring = []; };
  for (const c of path.commands as any[]) {
    if (c.type === 'M') { closeRing(); ring = [[c.x, c.y]]; sx = cx = c.x; sy = cy = c.y; }
    else if (c.type === 'L') { ring.push([c.x, c.y]); cx = c.x; cy = c.y; }
    else if (c.type === 'Q') { for (let i = 1; i <= N; i++) { const t = i / N, u = 1 - t; ring.push([u * u * cx + 2 * u * t * c.x1 + t * t * c.x, u * u * cy + 2 * u * t * c.y1 + t * t * c.y]); } cx = c.x; cy = c.y; }
    else if (c.type === 'C') { for (let i = 1; i <= N; i++) { const t = i / N, u = 1 - t; ring.push([u * u * u * cx + 3 * u * u * t * c.x1 + 3 * u * t * t * c.x2 + t * t * t * c.x, u * u * u * cy + 3 * u * u * t * c.y1 + 3 * u * t * t * c.y2 + t * t * t * c.y]); } cx = c.x; cy = c.y; }
    else if (c.type === 'Z') { closeRing(); cx = sx; cy = sy; }
  }
  closeRing();
  // aria netă = Σ|solide| − Σ|găuri|, cu imbricarea determinată independent (toate
  // vârfurile unui inel în celălalt). Nu ne bazăm pe winding-ul fontului: unele fonturi
  // desenează găurile în același sens ca exteriorul.
  const arie = (r: [number, number][]) => { let a = 0; for (let i = 0; i < r.length; i++) { const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % r.length]; a += x1 * y2 - x2 * y1; } return Math.abs(a / 2); };
  const inRing = (px: number, py: number, r: [number, number][]) => { let ins = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if (((yi > py) !== (yj > py)) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) ins = !ins; } return ins; };
  // imbricare = tot CONTURUL în celălalt (eșantionare pe muchii, nu doar pe vârfuri:
  // traversa lui „A" în Baloo 2 are vârfurile îngropate în picioare dar mijlocul în gol)
  const nested = (a: [number, number][], b: [number, number][]) => {
    const S = 32, n = a.length; let ins = 0;
    for (let s = 0; s < S; s++) { const t = (s / S) * n, i = Math.floor(t) % n, f = t - Math.floor(t); const p0 = a[i], p1 = a[(i + 1) % n];
      if (inRing(p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f, b)) ins++; }
    return ins >= S * 0.9;
  };
  let net = 0;
  rings.forEach((r, i) => {
    let depth = 0;
    rings.forEach((o, k) => { if (k !== i && nested(r, o)) depth++; });
    net += depth % 2 === 0 ? arie(r) : -arie(r);
  });
  return Math.max(0, net);
}

const wasm: any = await ManifoldModule();
wasm.setup();
configureManifold(wasm);

interface Fail { font: string; ch: string; motiv: string; }
const fails: Fail[] = [];
const warns: Fail[] = [];
let testate = 0, sarite = 0;

console.log(`\nTEST ALFABET — ${LITERE.length} litere + ${DIACRITICE.length} diacritice + ${CIFRE.length} cifre + ${SIMBOLURI.length} simboluri × ${FONTS.length} fonturi, h=${H}mm g=${G}mm`);
console.log(`(EȘEC sub ${PRAG_ESEC * 100}% din volumul așteptat; avertisment sub ${PRAG_AVERT * 100}%)\n`);

for (const f of FONTS) {
  if (!existsSync(join(FONT_DIR, f))) { console.log(`  ${f.padEnd(26)} (font lipsă — sărit)`); continue; }
  const font = load(f);
  const cells: string[] = [];
  for (const ch of [...LITERE, ...DIACRITICE, ...CIFRE, ...SIMBOLURI]) {
    if (font.charToGlyphIndex(ch) === 0) { cells.push('·'); sarite++; continue; }  // glifă inexistentă
    testate++;
    const rep: Partial<SolidReport> = {};
    let vol = 0, err = '';
    try {
      const solid = textSolid(font, ch, H, G, rep);
      vol = solid.volume();
    } catch (e: any) { err = `${rep.failedStep ?? '?'}: ${e?.message ?? e}`; }
    if (err) { fails.push({ font: f, ch, motiv: `eroare [${err}]` }); cells.push('E'); continue; }
    if (rep.missingGlyphs?.length) { fails.push({ font: f, ch, motiv: 'glifă fără geometrie (integritate)' }); cells.push('✗'); continue; }
    const asteptat = ariaNetaMM2(font, ch, H) * G;
    const ratio = asteptat > 1e-6 ? vol / asteptat : 0;
    if (ratio < PRAG_ESEC) { fails.push({ font: f, ch, motiv: `volum ${vol.toFixed(0)} = ${(ratio * 100).toFixed(1)}% din așteptat ${asteptat.toFixed(0)}` }); cells.push('✗'); }
    else if (ratio < PRAG_AVERT) { warns.push({ font: f, ch, motiv: `${(ratio * 100).toFixed(0)}% din așteptat` }); cells.push('!'); }
    else cells.push('✓');
  }
  console.log(`  ${f.replace('-Regular.ttf', '').padEnd(20)} ${cells.join('')}`);
}

console.log(`\n  legendă: ✓ ok · ! abatere (<${PRAG_AVERT * 100}%) · ✗ EȘEC (<${PRAG_ESEC * 100}%) · E eroare · · glifă inexistentă`);
console.log(`  testate: ${testate} combinații (${sarite} glife inexistente, sărite)`);

// ---------- înălțimea CERUTĂ e înălțimea OBȚINUTĂ ----------
//
// Verificarea de mai sus e un RAPORT (volum obținut / volum așteptat), iar oracolul își
// calculează scara la fel ca textSolid. O eroare de scală se simplifică în ambele părți și
// testul rămâne verde — exact așa a supraviețuit luni de zile capHeight-ul declarat greșit de
// Courgette (301 la unitsPerEm 2048): litera ieșea de 5,2× peste cei 40 mm ceruți, cu ✓ peste tot.
//
// Aici se măsoară altceva, care nu se poate simplifica: cutia solidului FINAL, în mm, față de
// milimetrii ceruți. Reperul e „H", cel mai aproape de înălțimea de capital.
//
// Banda e LARGĂ, și asta e intenționat. „H" nu iese fix cât capitala la orice font: la cele
// caligrafice fioriturile trec peste, iar măsurat pe cele 22 de fonturi din folder valorile
// legitime merg până la 1.40× (CinzelDecorative — 1.31 GreatVibes, 1.23 Allura, 1.21 Satisfy).
// Nu există un prag strâns care să separe fiorituri de o scară greșită, așa că nu se încearcă:
// se prinde doar ordinul de mărime. Courgette dădea 5.2× — altă categorie decât orice desen.
// O eroare de scală de 1.5× ar scăpa; una care face litera nefolosibilă, nu.
const MIN_INALTIME = 0.9, MAX_INALTIME = 2.0;
const inaltimi: Fail[] = [];
const rapoarte: string[] = [];
for (const f of FONTS) {
  if (!existsSync(join(FONT_DIR, f))) continue;
  const font = load(f);
  if (font.charToGlyphIndex('H') === 0) continue;
  let real = 0;
  try {
    const bb = textSolid(font, 'H', H, G, {}).boundingBox();
    real = bb.max[1] - bb.min[1];
  } catch { continue; }   // eroarea de geometrie e deja raportată mai sus
  const raport = real / H;
  rapoarte.push(`${f.replace('-Regular.ttf', '')} ${raport.toFixed(2)}`);
  if (raport < MIN_INALTIME || raport > MAX_INALTIME)
    inaltimi.push({ font: f, ch: 'H', motiv: `înălțime ${real.toFixed(1)}mm în loc de ${H}mm (${raport.toFixed(2)}× cerut — scară greșită, nu desen)` });
}
console.log(`  înălțime „H" (raport față de ${H}mm cerut, band ${MIN_INALTIME}–${MAX_INALTIME}×):`);
console.log(`    ${rapoarte.join(' · ')}`);
if (inaltimi.length) fails.push(...inaltimi);
if (warns.length) { console.log(`\n  avertismente (${warns.length}):`); for (const w of warns.slice(0, 12)) console.log(`    ${w.font.replace('-Regular.ttf', '')} „${w.ch}" — ${w.motiv}`); if (warns.length > 12) console.log(`    … și încă ${warns.length - 12}`); }

if (fails.length) {
  console.error(`\n❌ EȘECURI (${fails.length}):`);
  for (const x of fails) console.error(`    ${x.font.replace('-Regular.ttf', '')} „${x.ch}" — ${x.motiv}`);
  console.error('');
  // vezi regula din docs/design/: process.exit dupa manifold crapa libuv pe Windows
  process.exitCode = 1;
} else {
  console.log(`\n✅ Alfabet OK — toate cele ${testate} combinații literă×font produc geometrie corectă.\n`);
}
