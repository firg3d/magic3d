/**
 * TEST PERMANENT — RAME TEMATICE
 *
 * Produsul e un ANSAMBLU din trei piese lipite, deci fiecare verificare privește o legătură care
 * se poate rupe fizic:
 *
 *   1. FIECARE PIESĂ, O SINGURĂ BUCATĂ — rama făcută din fire și numele făcut din litere. O ramă
 *      în două bucăți nu e o ramă, e două jumătăți care cad din mână. Măsurat pe solid, cu
 *      `decompose()`, nu presupus din desen. (La inimă s-a și întâmplat: inelele scalate nu se
 *      atingeau la R=80, iar defectul a apărut abia la măturarea pe două raze.)
 *   2. FIRUL NU SE SUBȚIAZĂ ÎN COTURI — îmbinarea rotundă e ce împiedică crestătura de pe partea
 *      din afara curburii. Se verifică cu detectorul de trăsături subțiri, pe silueta reală.
 *   3. LOCAȘUL EXISTĂ ȘI NU TAIE BAZA — rama chiar intră în bază (volumul bazei scade), dar nu
 *      atât cât s-o despartă în două.
 *   4. GRAVURA E UN REPER, NU O TĂIETURĂ — se sapă chiar acolo unde vine numele, la adâncimea
 *      cerută, și nu slăbește firul până la rupere.
 *   5. ANSAMBLUL STĂ — unghiul de răsturnare peste minimul care blochează exportul. Măsurat pe
 *      toate cele patru piese laolaltă, fiindcă numele urcă centrul de masă.
 *   6. Exportul nu iese în oglindă și pleacă de la Z=0.
 *
 * Rulare:  npm run test:rame
 *          npx tsx src/_tests/rame.test.ts panza      (un singur model, pentru iterat)
 */
// @ts-ignore — opentype.js nu are declarații de tip (ca în restul proiectului)
import opentype from 'opentype.js';
import ManifoldModule from 'manifold-3d';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { configureManifold, buildRama as buildRamaBrut, siluetaRama, pentruPrint, TIPURI_RAMA,
  UNGHI_MIN, type RameConfig, type TipRama } from '../apps/rame/rame.js';
import { trasaturiSubtiri } from '../core/geometry/trasaturi.js';
import { instrumenteazaArena, inArena, adunaHandle, elibereaza as elibereazaArena } from '../core/geometry/arena.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FONT_DIR = join(ROOT, 'public', 'fonts');

const filtru = process.argv.slice(2);
const MODELE = (TIPURI_RAMA as TipRama[]).filter((t) => !filtru.length || filtru.some((q) => t.includes(q)));
const RAZE = [30, 50, 80, 120];                        // toată plaja din panou, nu doar implicitul
const NUME = ['Ana', 'Mădălina'];
const PLACA = { w: 256, d: 256 };

/** parametrii IMPLICIȚI ai aplicației — testul apără configurația cu care se deschide */
const IMPLICIT = {
  grosimeFir: 3, colturi: 12, inele: 4, lasare: 0.18,
  grosimeRama: 6, inaltimeText: 22, grosimeText: 5, latimeAura: 2.5, netezireAura: 2,
  adancimeGravura: 0.8, jocGravura: 0.3, latimePicior: 25, inaltimePicior: 3,
  lungimeBaza: 120, latimeBaza: 30, inaltimeBaza: 12, adancimeInfigere: 6, jocInfigere: 0.2,
  placa: PLACA,
};

const esecuri: string[] = [];
const fail = (m: string) => esecuri.push('  ✗ ' + m);
const ok = (m: string) => console.log('    ✓ ' + m);

const wasm: any = await ManifoldModule();
wasm.setup();
configureManifold(wasm);
instrumenteazaArena(wasm);

/** memoria WASM: fiecare construcție în arena ei, se țin ultimele două (vezi core/geometry/arena.ts) */
const recente: any[] = [];
const buildRama: typeof buildRamaBrut = (cfg: any) => {
  const r = inArena(() => buildRamaBrut(cfg), (x) => [x]);
  recente.push(r);
  if (recente.length > 2) elibereazaArena(adunaHandle(recente.shift()));
  return r;
};

const font = opentype.parse((() => {
  const b = readFileSync(join(FONT_DIR, 'GreatVibes-Regular.ttf'));
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
})());

const cfg = (tip: TipRama, raza: number, over: Partial<RameConfig> = {}): RameConfig => ({
  ...IMPLICIT, text: 'Maria', font,
  rama: { tip, raza, grosimeFir: IMPLICIT.grosimeFir, colturi: IMPLICIT.colturi,
    inele: IMPLICIT.inele, lasare: IMPLICIT.lasare },
  ...over,
} as RameConfig);

console.log(`\nTEST RAME TEMATICE — ${MODELE.length} modele × ${RAZE.length} raze`);
console.log(`(fir ${IMPLICIT.grosimeFir} mm · ramă ${IMPLICIT.grosimeRama} mm · bază ${IMPLICIT.lungimeBaza}×${IMPLICIT.latimeBaza} mm)`);

const t0 = Date.now();
let testate = 0;

// =====================================================================
// 1+2. MĂTURAREA: fiecare model, la fiecare rază — o bucată, fir uniform, ansamblu stabil
// =====================================================================
{
  let unghiMin = Infinity, unghiMinK = '', reperMin = Infinity, reperMinK = '';
  for (const tip of MODELE) {
    const rand: string[] = [];
    for (const raza of RAZE) {
      testate++;
      const eticheta = `${tip} R=${raza}`;
      let r;
      try { r = buildRama(cfg(tip, raza)); }
      catch (e: any) { fail(`${eticheta}: buildRama a aruncat — ${e?.message ?? e}`); rand.push('E'); continue; }
      const d = r.diagnostice;
      let bun = true;

      if (d.bucatiRama !== 1) { fail(`${eticheta}: rama iese în ${d.bucatiRama} bucăți — firele nu se ating`); bun = false; }
      if (d.bucatiText !== 1) { fail(`${eticheta}: numele iese în ${d.bucatiText} bucăți`); bun = false; }
      if (d.glifeLipsa.length) { fail(`${eticheta}: glife lipsă — ${d.glifeLipsa.join(' ')}`); bun = false; }

      // ansamblul e mai instabil cu cât rama e mai mare: aici se vede unde se oprește plaja
      if (d.stabilitate.unghiMinGrade < unghiMin) { unghiMin = d.stabilitate.unghiMinGrade; unghiMinK = eticheta; }
      if (d.reperProcent < reperMin) { reperMin = d.reperProcent; reperMinK = eticheta; }
      if (d.materialCM3 <= 0) { fail(`${eticheta}: ansamblu fără material`); bun = false; }
      rand.push(bun ? '·' : '✗');
    }
    console.log(`    ${tip.padEnd(6)} ${rand.join('')}`);
  }
  ok(`${testate} combinații, fiecare piesă o singură bucată`);
  // pragurile se RAPORTEAZĂ, nu se inventează: cifra spune la ce rază produsul devine discutabil
  console.log(`      cel mai instabil: ${unghiMinK} la ${unghiMin.toFixed(0)}° · cel mai slab reper: ${reperMinK} la ${reperMin}%`);
  if (unghiMin < UNGHI_MIN) fail(`${unghiMinK}: ${unghiMin.toFixed(0)}° < ${UNGHI_MIN}° — ansamblul cade, dar aplicația îl oferă`);
}

// =====================================================================
// 2. FIRUL NU SE SUBȚIAZĂ ÎN COTURI (îmbinarea rotundă)
// =====================================================================
{
  for (const tip of MODELE) {
    for (const grosimeFir of [2, 3, 5]) {
      const sil = siluetaRama({ tip, raza: 60, grosimeFir, colturi: 12, inele: 4, lasare: 0.18 });
      // pragul e chiar firul cerut: unde apare o crestătură, materialul scade sub el
      const d = trasaturiSubtiri(sil, grosimeFir * 0.9);
      sil.delete();
      if (d.ariaMaxMM2 > 1) fail(`${tip} fir ${grosimeFir} mm: ${d.ariaMaxMM2.toFixed(1)} mm² sub ${(grosimeFir * 0.9).toFixed(1)} mm — coturile lasă crestături`);
    }
  }
  ok('firul rămâne uniform în coturi, la 2 / 3 / 5 mm');
}

// =====================================================================
// 3. LOCAȘUL: rama chiar intră în bază, iar baza rămâne întreagă
// =====================================================================
{
  const plin = buildRama(cfg('panza', 50, { adancimeInfigere: 0 } as any));
  const infipt = buildRama(cfg('panza', 50));
  const dif = plin.baza.volume() - infipt.baza.volume();
  if (dif <= 1) fail(`locașul nu se sapă: baza pierde doar ${dif.toFixed(2)} mm³`);
  const bucati = infipt.baza.decompose();
  if (bucati.length !== 1) fail(`locașul taie baza în ${bucati.length} bucăți`);
  for (const b of bucati) b.delete();
  ok(`locașul scoate ${(dif / 1000).toFixed(1)} cm³ din bază, care rămâne o piesă`);

  // PICIORUL CHIAR INTRĂ. Invariantul care contează la lipire: amprenta din locaș e cel puțin
  // piciorul întreg (lățime × grosimea ramei). Fără el, pânza intra cu 64 mm² și steaua cu 28 —
  // și defectul a mai apărut o dată, tăcut: colțurile piciorului erau în sens invers
  // trigonometric, iar 'Positive' l-a citit ca gaură, deci piciorul lipsea cu totul.
  for (const tip of MODELE) {
    const r = buildRama(cfg(tip, 60));
    const minim = IMPLICIT.latimePicior * IMPLICIT.grosimeRama * 0.9;
    if (r.diagnostice.ariaLocasMM2 < minim) {
      fail(`${tip}: rama intră în bază pe ${r.diagnostice.ariaLocasMM2} mm², sub piciorul de ${minim.toFixed(0)} mm² — piciorul nu ajunge în locaș`);
    }
    if (r.diagnostice.limbiLocas < 1) fail(`${tip}: nicio limbă în locaș`);
  }
  ok(`piciorul intră în locaș la toate modelele (cel puțin ${(IMPLICIT.latimePicior * IMPLICIT.grosimeRama).toFixed(0)} mm² de lipire)`);

  // RAMA CHIAR INTRĂ, fără să forțeze. Aici s-au ascuns trei defecte deodată, toate tăcute:
  // baza construită în cealaltă parte a planului (rama plutea 6 mm deasupra ei), proiecția
  // locașului rotită invers, și fundul locașului coplanar cu capătul ramei.
  for (const tip of MODELE) {
    const r = buildRama(cfg(tip, 60));
    const supra = r.baza.intersect(r.rama);
    if (supra.volume() > 1e-6) fail(`${tip}: rama și baza se suprapun pe ${supra.volume().toFixed(1)} mm³ — nu intră în locaș`);
    supra.delete();
    const u = MODELE.length ? r.baza.add(r.rama) : null;
    const n = u!.decompose();
    if (n.length !== 2) fail(`${tip}: rama și baza nu sunt piese libere (${n.length} componente) — locașul nu are joc`);
    for (const x of n) x.delete();
    u!.delete();
  }
  ok('rama intră în locaș cu joc, fără suprapunere cu baza');
}

// =====================================================================
// 4. GRAVURA e reper: se sapă unde vine numele, la adâncimea cerută
// =====================================================================
{
  const fara = buildRama(cfg('panza', 50, { adancimeGravura: 0.2 }));
  const cu = buildRama(cfg('panza', 50, { adancimeGravura: 1.6 }));
  if (!(cu.diagnostice.ariaGravuraMM2 > 0)) fail('gravura nu prinde deloc material');
  // aria gravată nu depinde de adâncime — dacă depinde, cutter-ul nu e drept
  const dA = Math.abs(cu.diagnostice.ariaGravuraMM2 - fara.diagnostice.ariaGravuraMM2);
  if (dA > cu.diagnostice.ariaGravuraMM2 * 0.02) {
    fail(`aria gravată se schimbă cu adâncimea (${fara.diagnostice.ariaGravuraMM2} → ${cu.diagnostice.ariaGravuraMM2} mm²)`);
  }
  // și chiar taie mai mult material când e mai adâncă
  if (!(cu.rama.volume() < fara.rama.volume())) fail('gravura mai adâncă nu scoate mai mult material');
  if (cu.rama.decompose().length !== 1) fail('gravura de 1.6 mm rupe rama în bucăți');
  ok(`gravura prinde ${cu.diagnostice.ariaGravuraMM2} mm² (${cu.diagnostice.reperProcent}% din plăcuță), la orice adâncime`);
}

// =====================================================================
// 5. NUMELE URCĂ CENTRUL DE MASĂ — baza îngustă trebuie să iasă instabilă, nu să treacă tăcut
// =====================================================================
{
  const ingust = buildRama(cfg('panza', 120, { latimeBaza: 20, lungimeBaza: 60 }));
  const lat = buildRama(cfg('panza', 120, { latimeBaza: 60, lungimeBaza: 200 }));
  if (!(lat.diagnostice.stabilitate.unghiMinGrade > ingust.diagnostice.stabilitate.unghiMinGrade)) {
    fail('baza lățită nu îmbunătățește unghiul de răsturnare — măsurătoarea nu vede baza');
  }
  ok(`baza contează: ${ingust.diagnostice.stabilitate.unghiMinGrade.toFixed(0)}° îngustă → ${lat.diagnostice.stabilitate.unghiMinGrade.toFixed(0)}° lată`);
}

// =====================================================================
// 5b. ANSAMBLUL STĂ PE PLACĂ, nu sub ea
//
// Viewport-ul așază placa de print în planul y = 0, iar `talpaPiesei` măsoară amprenta în felia
// de la `max[1]`. Amândouă cer același lucru: cel mai de jos punct al ansamblului să fie exact 0.
// Verificarea există fiindcă lipsa ei a costat o tură — toate cifrele ieșeau bune (piesele se
// atingeau, locașul se săpa, unghiul era mare), dar pe ecran grila plăcii tăia prin bază.
// =====================================================================
{
  for (const tip of MODELE) {
    const r = buildRama(cfg(tip, 60));
    const jos = Math.max(...[r.baza, r.rama, r.text, r.aura].filter(Boolean)
      .map((m: any) => m.boundingBox().max[1]));
    if (Math.abs(jos) > 1e-6) fail(`${tip}: talpa ansamblului e la y=${jos.toFixed(2)}, nu la 0 — piesa plutește sau intră în placă`);
  }
  ok('ansamblul se așază cu talpa exact pe placă');
}

// =====================================================================
// 6. EXPORTUL — nu în oglindă, și de la Z=0
// =====================================================================
{
  const r = buildRama(cfg('panza', 50, { text: NUME[1] }));
  for (const [nume, m] of [['baza', r.baza], ['rama', r.rama], ['text', r.text]] as [string, any][]) {
    const p = pentruPrint(m);
    const bb = m.boundingBox(), bp = p.boundingBox();
    for (const [i, ax] of [[0, 'lățimea'], [1, 'înălțimea'], [2, 'grosimea']] as [number, string][]) {
      if (Math.abs((bp.max[i] - bp.min[i]) - (bb.max[i] - bb.min[i])) > 1e-6) fail(`${nume}: exportul schimbă ${ax}`);
    }
    if (Math.abs(p.volume() - m.volume()) > 1e-3) fail(`${nume}: exportul schimbă volumul`);
    p.delete();
  }
  ok('cele trei piese se exportă cu dimensiunile păstrate');
}

// =====================================================================
const dt = (Date.now() - t0) / 1000;
if (esecuri.length) {
  console.error(`\n❌ ${esecuri.length} eșecuri:\n${esecuri.join('\n')}\n`);
  // vezi regula din docs/design/: process.exit dupa manifold crapa libuv pe Windows
  process.exitCode = 1;
} else {
  console.log(`\n✅ Rame tematice OK — ${testate} combinații în ${dt.toFixed(1)}s.\n`);
}
