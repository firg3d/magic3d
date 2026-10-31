/**
 * TEST PERMANENT — CUVINTE DECOR
 *
 * Verificările din docs/plan-nume-si-cuvinte.md, secțiunea Cuvinte Decor:
 *
 *   1. O POZIȚIE → UN SOLID. Contractul nu mai e „un caracter → o glifă": un simbol din
 *      bibliotecă ține locul unei litere, iar restul lanțului nu observă diferența.
 *   2. METRICILE SE DECLARĂ, NU SE DERIVĂ. Înălțimea, linia de bază și avansul ies din manifest,
 *      nu din bounding box — și se verifică pe solidul construit, nu pe intenție.
 *   3. O SINGURĂ COMPONENTĂ CONEXĂ după punți (sau după contur, când el leagă singur).
 *   4. CUVINTE, nu litere: 3–6 caractere pe toate fonturile.
 *   5. Un caracter fără glifă ȘI fără simbol e RAPORTAT, ca să poată bloca exportul.
 *   6. Exportul nu iese în oglindă și pleacă de la Z=0.
 *
 * Rulare:  npm run test:cuvinte
 *          npx tsx src/_tests/cuvinte.test.ts GreatVibes
 */
// @ts-ignore — opentype.js nu are declarații de tip (ca în restul proiectului)
import opentype from 'opentype.js';
import ManifoldModule from 'manifold-3d';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { configureManifold as configTextSolid, type SolidReport } from '../core/geometry/textSolid.js';
import { configureManifold as configCuvant, construiestePiesa as construiestePiesaBrut, verdictLegare, pentruPrint,
  type ParamCuvant } from '../core/geometry/cuvant.js';
import { configureManifold as configCuvinte, solidCuvant, caractereFaraSursa, nrPozitii,
  bucatiCuvant } from '../apps/cuvinte/cuvinte.js';
import { incarcaSimboluri, simboluri, simbolPentru, gauriSimbol, type Simbol } from '../apps/cuvinte/simboluri.js';
import { instrumenteazaArena, inArena, adunaHandle, elibereaza as elibereazaArena } from '../core/geometry/arena.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FONT_DIR = join(ROOT, 'public', 'fonts');

const filtru = process.argv.slice(2);
const FONTS = readdirSync(FONT_DIR)
  .filter((f) => /\.(ttf|otf)$/i.test(f))
  .filter((f) => !filtru.length || filtru.some((q) => f.toLowerCase().includes(q.toLowerCase())))
  .sort();

const load = (f: string) => {
  const b = readFileSync(join(FONT_DIR, f));
  return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
};
const nume = (f: string) => f.replace(/-(Regular|Bold|Italic).*\.(ttf|otf)$/i, '').replace(/\.(ttf|otf)$/i, '');

const esecuri: string[] = [];
const fail = (m: string) => esecuri.push('  ✗ ' + m);
const ok = (m: string) => console.log('    ✓ ' + m);

const wasm: any = await ManifoldModule();
wasm.setup();
configTextSolid(wasm); configCuvant(wasm); configCuvinte(wasm);
instrumenteazaArena(wasm);

/**
 * MEMORIA WASM. Obiectele Manifold sunt handle-uri embind: memoria lor sta in heap-ul WASM si
 * se elibereaza doar prin `.delete()`, GC-ul JS n-o atinge. Peste 440 de fonturi suma umple
 * heap-ul si WASM-ul incepe sa arunce erori care nu seamana a memorie epuizata. Aceeasi clasa
 * de defect ca la litere, brelocuri, fagure si led.
 *
 * Fiecare constructie ruleaza in arena proprie; se tin ultimele patru rezultate, fiindca
 * verificarile compara cel mult doua piese deodata.
 */
const recente: any[] = [];
const construiestePiesa: typeof construiestePiesaBrut = (cfg: any) => {
  const r = inArena(() => construiestePiesaBrut(cfg), (x) => [x]);
  recente.push(r);
  if (recente.length > 4) elibereazaArena(adunaHandle(recente.shift()));
  return r;
};

// biblioteca de simboluri, citită de pe disc (în browser vine prin fetch)
const manifest = JSON.parse(readFileSync(join(ROOT, 'public', 'simboluri', 'manifest.json'), 'utf8'));
incarcaSimboluri(manifest.simboluri as Simbol[]);

const PLACA = { w: 256, d: 256 };
/** parametrii IMPLICIȚI ai aplicației — testul apără configurația cu care se deschide */
const IMPLICIT = { inaltime: 55, grosime: 35, punti: true, latimePunte: 1.2, factorMaxPunte: 3.2,
  contur: 'rama' as const, latimeContur: 5, netezireContur: 4, grosimeContur: 6,
  modProdus: 'masa' as const, tipAgatare: 'fara' as const, surubCap: 5, surubTija: 2.5,
  inaltimeCapSurub: 3, latimeGrila: 20, capac: true, grosimeCapac: 2, placa: PLACA };
/** cuvinte de 3–6 caractere, cu simbol pe fiecare poziție și fără niciunul */
const CUVINTE = ['ma♥ma', '♥ana', 'ana♥', 'casa⌂', 'ana★ion', 'iubire'];

const cfg = (font: any, text: string, over: Partial<ParamCuvant> = {}): ParamCuvant => ({
  ...IMPLICIT, ...over,
  solid: (h: number, g: number, rep?: Partial<SolidReport>) => solidCuvant(font, text, h, g, rep),
});
const intreg = (r: { corp: any; contur: any | null }) => (r.contur ? wasm.Manifold.union([r.corp, r.contur]) : r.corp);
const elibereaza = (r: { corp: any; contur: any | null; capac?: any | null }) => {
  r.corp.delete(); r.contur?.delete(); r.capac?.delete();
};

console.log(`\nTEST CUVINTE DECOR — ${FONTS.length} fonturi × ${CUVINTE.length} cuvinte`);
console.log(`(literă ${IMPLICIT.inaltime} mm · grosime ${IMPLICIT.grosime} mm · ${simboluri().length} simboluri în bibliotecă)`);

const t0 = Date.now();
let testate = 0, cuSimbol = 0;

// =====================================================================
// MĂTURAREA: toate cuvintele × toate fonturile
// =====================================================================
{
  const stat = { ms: 0, msK: '', tri: 0, latMax: 0, latK: '' };
  for (const f of FONTS) {
    const font = load(f);
    const rand: string[] = [];
    for (const text of CUVINTE) {
      testate++;
      const eticheta = `${nume(f)} „${text}"`;
      let r;
      try { r = construiestePiesa(cfg(font, text)); }
      catch (e: any) { fail(`${eticheta}: construiestePiesa a aruncat — ${e?.message ?? e}`); rand.push('E'); continue; }
      const d = r.diagnostice;
      let bun = true;
      const nSim = bucatiCuvant(text).filter((b) => b.fel === 'simbol').length;
      if (nSim) cuSimbol++;

      // ---- 1: fiecare poziție trebuie să producă geometrie. Un simbol nu e „glifă lipsă":
      //         `caractereFaraSursa` e cel care știe de amândouă sursele.
      const fara = caractereFaraSursa(font, text);
      const asteptate = [...text].filter((ch) => !/\s/u.test(ch) && !simbolPentru(ch) && font.charToGlyphIndex(ch) === 0);
      if (fara.length !== new Set(asteptate).size) {
        fail(`${eticheta}: ${fara.length} caractere fără sursă, așteptate ${new Set(asteptate).size}`); bun = false;
      }
      // simbolurile NU trebuie să apară niciodată ca glife lipsă — ele au altă sursă
      for (const ch of d.glifeLipsa) if (simbolPentru(ch)) { fail(`${eticheta}: simbolul „${ch}" raportat ca glifă lipsă`); bun = false; }

      // ---- 3: bucățile RAPORTATE trebuie să fie chiar bucățile PIESEI
      const tot = intreg(r);
      const parti = tot.decompose();
      if (parti.length !== d.bucati) { fail(`${eticheta}: piesa are ${parti.length} bucăți, diagnosticul ${d.bucati}`); bun = false; }
      for (const p of parti) p.delete();
      if (d.bucati !== 1) { fail(`${eticheta}: piesa iese în ${d.bucati} bucăți (${d.punti.ramase} rămase după punți)`); bun = false; }

      const bb = tot.boundingBox();
      if (Math.abs(bb.max[1]) > 1e-6) { fail(`${eticheta}: talpa la y=${bb.max[1].toFixed(3)}, așteptat 0`); bun = false; }
      if (Math.abs(bb.min[2]) > 1e-6) { fail(`${eticheta}: piesa pleacă de la z=${bb.min[2].toFixed(3)}`); bun = false; }

      if (d.dim[0] > stat.latMax) { stat.latMax = d.dim[0]; stat.latK = eticheta; }
      stat.tri = Math.max(stat.tri, d.triunghiuri);
      if (r.ms > stat.ms) { stat.ms = r.ms; stat.msK = eticheta; }
      if (tot !== r.corp) tot.delete();
      elibereaza(r);
      rand.push(bun ? (nSim ? '♥' : '✓') : '✗');
    }
    console.log(`  ${nume(f).padEnd(20)} ${rand.join('')}`);
  }
  console.log(`\n  legendă: ♥ cuvânt cu simbol · ✓ cuvânt simplu · ✗ EȘEC · E eroare`);
  console.log(`  ${cuSimbol} din ${testate} combinații au cel puțin un simbol`);
  console.log(`  cel mai lat ${stat.latK} ${stat.latMax.toFixed(0)} mm · cel mai scump ${stat.msK} ${stat.ms.toFixed(0)} ms · mesh maxim ${stat.tri.toLocaleString('en-US')}`);
}

// =====================================================================
// METRICILE SE DECLARĂ, NU SE DERIVĂ
//
// Verificarea care ține tot capitolul: înălțimea, linia de bază și avansul unui simbol vin din
// manifest. Se măsoară pe SOLIDUL construit (nu pe contur, nu pe intenție) și se cere să iasă
// exact cifrele declarate, la scara înălțimii de literă.
//
// Și reversul, ca verificarea să nu fie tautologică: lățimea DESENATĂ a simbolului trebuie să
// difere de avansul declarat. Dacă ar coincide, „declarat" și „derivat din bbox" ar da același
// rezultat și n-am ști pe care îl folosește codul.
// =====================================================================
{
  console.log('\n  METRICILE DECLARATE — măsurate pe solid');
  const font = load(FONTS.find((x) => x.startsWith('GreatVibes')) ?? FONTS[0]);
  const H = IMPLICIT.inaltime, mil = H / 1000;
  for (const s of simboluri()) {
    const rep: Partial<SolidReport> = {};
    const solid = solidCuvant(font, s.caracter, H, 10, rep);
    const bb = solid.boundingBox();
    const inaltimeReala = bb.max[1] - bb.min[1];
    // y crește în JOS: talpa simbolului e la y = −linieBaza, vârful cu `inaltime` mai sus
    const talpa = bb.max[1], varf = bb.min[1];
    const eroare = (a: number, b: number) => Math.abs(a - b);
    if (eroare(inaltimeReala, s.inaltime * mil) > 0.05) {
      fail(`„${s.nume}": înălțime ${inaltimeReala.toFixed(2)} mm, declarată ${(s.inaltime * mil).toFixed(2)}`);
    }
    if (eroare(talpa, -s.linieBaza * mil) > 0.05) {
      fail(`„${s.nume}": talpa la y=${talpa.toFixed(2)}, declarată ${(-s.linieBaza * mil).toFixed(2)}`);
    }
    if (eroare(rep.advanceMM ?? 0, s.avans * mil) > 0.05) {
      fail(`„${s.nume}": avans ${(rep.advanceMM ?? 0).toFixed(2)} mm, declarat ${(s.avans * mil).toFixed(2)}`);
    }
    // NEtautologic: desenul are altă lățime decât avansul, deci bbox-ul ar fi dat alt răspuns
    const latimeDesenata = bb.max[0] - bb.min[0];
    if (eroare(latimeDesenata, s.avans * mil) < 0.5) {
      fail(`„${s.nume}": lățimea desenată ${latimeDesenata.toFixed(2)} e egală cu avansul — verificarea nu deosebește declarat de derivat`);
    }
    ok(`„${s.nume}" — înălțime ${inaltimeReala.toFixed(1)} mm (declarată ${(s.inaltime * mil).toFixed(1)}), talpă la ${(-talpa).toFixed(1)} peste linia de bază, avans ${(rep.advanceMM ?? 0).toFixed(1)} față de ${latimeDesenata.toFixed(1)} desenați`);
    void varf;
    solid.delete();
  }
}

// =====================================================================
// TOATĂ BIBLIOTECA, simbol cu simbol
//
// Fiecare simbol trebuie să fie o SINGURĂ bucată — cinci degete de lăbuță desprinse ar fi corecte
// anatomic și greșite ca piesă — și trebuie să-și păstreze GOLURILE: ochiul florii, inelul cheii,
// spațiile dintre panglicile cadoului. Găurile sunt inelele cu arie negativă, iar întoarcerea lui
// y la trecerea în convenția fontului le-ar umple pe toate dacă s-ar forța aria pozitivă.
// =====================================================================
{
  console.log('\n  BIBLIOTECA, simbol cu simbol');
  const font = load(FONTS.find((x) => x.startsWith('GreatVibes')) ?? FONTS[0]);
  const H = IMPLICIT.inaltime;
  let totalGauri = 0;
  for (const s of simboluri()) {
    const solid = solidCuvant(font, s.caracter, H, 10);
    const parti = solid.decompose();
    if (parti.length !== 1) fail(`„${s.nume}": simbolul iese în ${parti.length} bucăți`);
    for (const p of parti) p.delete();
    // golurile declarate în manifest trebuie să se regăsească în solid
    const sec = solid.project();
    const gauriInSolid = (sec.toPolygons() as [number, number][][]) 
      .filter((r) => { let a = 0; for (let i = 0; i < r.length; i++) { const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % r.length]; a += x1 * y2 - x2 * y1; } return a < 0; }).length;
    if (gauriInSolid !== gauriSimbol(s)) {
      fail(`„${s.nume}": ${gauriInSolid} goluri în solid, ${gauriSimbol(s)} în manifest — întoarcerea lui y le-a umplut`);
    }
    totalGauri += gauriInSolid;
    sec.delete(); solid.delete();
    // și în cuvânt: o piesă, alături de litere
    const r = construiestePiesa(cfg(font, `a${s.caracter}a`));
    if (r.diagnostice.bucati !== 1) fail(`„a${s.caracter}a": piesa iese în ${r.diagnostice.bucati} bucăți`);
    elibereaza(r);
  }
  ok(`${simboluri().length} simboluri, fiecare o singură bucată, cu ${totalGauri} goluri păstrate în total`);
}

// =====================================================================
// SIMBOLUL E O POZIȚIE ÎN CUVÂNT, nu un adaos
//
// Se verifică pe lățimi: cuvântul cu simbol e mai lat decât cel fără exact cu avansul declarat.
// Dacă simbolul ar fi lipit după bounding box, diferența ar fi alta la fiecare font.
// =====================================================================
{
  console.log('\n  SIMBOLUL ÎNLOCUIEȘTE O POZIȚIE');
  const H = IMPLICIT.inaltime, mil = H / 1000;
  const inima = simbolPentru('♥')!;
  for (const f of FONTS.slice(0, 6)) {
    const font = load(f);
    const rA: Partial<SolidReport> = {}, rB: Partial<SolidReport> = {};
    const a = solidCuvant(font, 'mama', H, 10, rA);
    const b = solidCuvant(font, 'ma♥ma', H, 10, rB);
    const dif = (rB.advanceMM ?? 0) - (rA.advanceMM ?? 0);
    if (Math.abs(dif - inima.avans * mil) > 0.05) {
      fail(`${nume(f)}: simbolul adaugă ${dif.toFixed(2)} mm de avans, declarat ${(inima.avans * mil).toFixed(2)}`);
    }
    a.delete(); b.delete();
  }
  ok(`avansul simbolului e același la toate fonturile: ${(inima.avans * mil).toFixed(1)} mm, declarat o dată în manifest`);

  // și pe fiecare poziție: la început, la mijloc, la sfârșit
  const font = load(FONTS.find((x) => x.startsWith('GreatVibes')) ?? FONTS[0]);
  for (const text of ['♥ana', 'an♥a', 'ana♥']) {
    const buc = bucatiCuvant(text);
    if (!buc.some((x) => x.fel === 'simbol')) fail(`„${text}": simbolul nu a fost recunoscut`);
    const r = construiestePiesa(cfg(font, text));
    if (r.diagnostice.bucati !== 1) fail(`„${text}": piesa iese în ${r.diagnostice.bucati} bucăți`);
    elibereaza(r);
  }
  ok('simbolul merge pe orice poziție: la început, la mijloc, la sfârșit');
}

// =====================================================================
// CARACTER FĂRĂ NICIO SURSĂ — nici glifă, nici simbol
//
// Mecanismul e cel de la Litere Decor, dar întrebarea are acum DOUĂ surse de răspuns. Se verifică
// pe un caracter pe care fonturile chiar nu îl au și pe care biblioteca nu îl acoperă.
// =====================================================================
{
  const font = load(FONTS.find((x) => x.startsWith('GreatVibes')) ?? FONTS[0]);
  // ⌘ nu e în niciun font din folder și nu e în bibliotecă (verificat pe toate cele 22)
  const fara = caractereFaraSursa(font, 'ana⌘ion');
  if (!fara.includes('⌘')) fail('„⌘" nu e raportat ca fiind fără sursă, deși nu are nici glifă, nici simbol');
  // iar simbolurile din bibliotecă NU trebuie să apară acolo, deși niciun font nu le are
  const cuSimboluri = caractereFaraSursa(font, 'ma♥ma');
  if (cuSimboluri.length) fail(`simbolurile raportate ca fără sursă: ${cuSimboluri.join(' ')}`);
  if (font.charToGlyphIndex('♥') !== 0) fail('fontul chiar are glifa ♥ — premisa bibliotecii de simboluri cade');
  ok('„⌘" raportat ca fără sursă; „♥" nu, deși niciun font nu-l are — biblioteca îl acoperă');
  if (nrPozitii('ma♥ma') !== 5) fail(`„ma♥ma" numărat cu ${nrPozitii('ma♥ma')} poziții, așteptate 5`);
}

// =====================================================================
// RESTUL LANȚULUI, cu simbol în cuvânt: contur, stabilitate, placă, agățare, export
// =====================================================================
{
  console.log('\n  LANȚUL ÎNTREG merge la fel cu simbol în cuvânt');
  // cifrele de aici sunt ale unui font anume — la Cinzel, „ma♥ma" iese 301 mm și nu mai încape pe
  // placă, ceea ce e diagnostic corect, nu defect. Deci blocul se sare când fontul nu e în filtru.
  const fgv = FONTS.find((x) => x.startsWith('GreatVibes'));
  if (!fgv) console.log('    (Great Vibes lipsește din filtru — sărit)');
  else {
  const font = load(fgv);
  const r = construiestePiesa(cfg(font, 'ma♥ma'));
  const d = r.diagnostice;
  if (!d.stabilitate.staSingura) fail(`„ma♥ma" nu stă singură (${d.stabilitate.unghiMinGrade}°)`);
  if (!d.placa.incape) fail(`„ma♥ma" nu încape pe placă (${d.placa.latimeMM}×${d.placa.adancimeMM})`);
  if (!r.contur) fail('„ma♥ma": rama nu s-a construit');
  ok(`„ma♥ma" — o piesă, ${d.stabilitate.unghiMinGrade}° până la răsturnare, ${d.placa.latimeMM}×${d.placa.adancimeMM} mm pe placă`);

  // pe perete, cu gaură străpunsă și capac: aceleași verificări ca la Nume 3D
  const perete = construiestePiesa(cfg(font, 'ma♥ma', { modProdus: 'perete', tipAgatare: 'gaura' }));
  const a = perete.diagnostice.agatare;
  if (!a.pozitii.length) fail('„ma♥ma" pe perete: gaura străpunsă nu a încăput');
  else if (!perete.capac) fail('„ma♥ma" pe perete: capacul nu s-a generat');
  else {
    const tot = intreg(perete);
    const lovit = tot.intersect(perete.capac);
    const v = lovit.volume();
    lovit.delete();
    if (v > 1e-3) fail(`„ma♥ma": capacul se lovește de piesă cu ${v.toFixed(2)} mm³`);
    else ok(`„ma♥ma" pe perete — ${a.pozitii.length} găuri Ø${IMPLICIT.surubTija}, capac cu coliziune zero`);
    if (tot !== perete.corp) tot.delete();
  }
  elibereaza(perete);

  // EXPORTUL: nu în oglindă, de la Z=0
  const tot = intreg(r);
  const p = pentruPrint(tot);
  const bb = tot.boundingBox(), bp = p.boundingBox();
  if (Math.abs(bp.min[2]) > 1e-6) fail(`exportul pleacă de la z=${bp.min[2].toFixed(3)}`);
  if (Math.abs((bp.max[0] - bp.min[0]) - (bb.max[0] - bb.min[0])) > 1e-6) fail('exportul schimbă lățimea');
  if (Math.abs(p.volume() - tot.volume()) > 1e-3) fail('exportul schimbă volumul');
  ok('exportul păstrează dimensiunile și pleacă de la z=0');
  p.delete(); if (tot !== r.corp) tot.delete();
  elibereaza(r);
  }
}

// =====================================================================
// VERDICTUL DE FONT ține cont de simbol
// =====================================================================
{
  const font = load(FONTS.find((x) => x.startsWith('ArchivoBlack')) ?? FONTS[0]);
  const v = verdictLegare((h, g, rep) => solidCuvant(font, 'ma♥ma', h, g, rep), nrPozitii('ma♥ma'), IMPLICIT.inaltime, IMPLICIT.factorMaxPunte);
  if (v.bucati < 2) fail('la un font drept „ma♥ma" iese într-o bucată — verdictul nu poate deosebi nimic');
  ok(`verdictul numără simbolul ca poziție: ${v.bucati} bucăți la ${v.litere} poziții`);
}

// =====================================================================
const dt = (Date.now() - t0) / 1000;
if (esecuri.length) {
  console.error(`\n❌ ${esecuri.length} eșecuri:\n${esecuri.join('\n')}\n`);
  // vezi regula din docs/design/: process.exit dupa manifold crapa libuv pe Windows
  process.exitCode = 1;
} else {
  console.log(`\n✅ Cuvinte Decor OK — ${testate} combinații în ${dt.toFixed(1)}s.\n`);
}
