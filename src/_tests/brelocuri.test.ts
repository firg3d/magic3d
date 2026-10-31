/**
 * TEST PERMANENT — BRELOCURI
 *
 * Cele cinci verificări din docs/plan-brelocuri.md, ca aserțiuni, nu ca verificare manuală:
 *
 *   1. gaura nu atinge litera
 *   2. perete de la gaură la marginea plăcuței >= 2 mm
 *   3. trăsătura minimă a literei >= 2 extrudări (~0.85 mm la duză 0.4)
 *   4. gaura schimbă genus-ul cu exact +1 (nicio scobitură închisă, nicio gaură în plus)
 *   5. tot alfabetul × toate fonturile din folder produce geometrie validă
 *
 * Verificarea 3 e altfel decât celelalte, și trebuie spus de ce. Fonturile cu hairline
 * (Tangerine, Cinzel, Cormorant, cursivele) CHIAR au trăsături sub 0.85 mm la 40 mm înălțime.
 * Nu e un defect al generatorului, e o proprietate a fontului, iar clientul are voie să-l
 * aleagă dacă acceptă rezultatul. Deci nu se poate cere „niciun font nu pică": se verifică
 * DETECTORUL — că se aprinde pe fonturile subțiri și tace pe cele groase — iar aplicația
 * avertizează la rulare. Censul complet e tipărit mai jos, informativ.
 *
 * Rulare:  npm run test:brelocuri            (toate fonturile)
 *          npx tsx src/_tests/brelocuri.test.ts Baloo Cinzel   (doar câteva, pentru iterat)
 * Iese cu cod 1 la orice verificare picată.
 */
// @ts-ignore — opentype.js nu are declarații de tip (ca în restul proiectului)
import opentype from 'opentype.js';
import ManifoldModule from 'manifold-3d';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { configureManifold, buildBreloc as buildBrelocBrut, inaltimeDinLungime, PERETE_MIN, SECTIUNE_MIN, TRASATURA_MIN, PATA_MAX } from '../apps/brelocuri/breloc.js';
import { instrumenteazaArena, inArena, adunaHandle, elibereaza } from '../core/geometry/arena.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FONT_DIR = join(ROOT, 'public', 'fonts');

const filtru = process.argv.slice(2);
const FONTS = readdirSync(FONT_DIR)
  .filter((f) => /\.(ttf|otf)$/i.test(f))
  .filter((f) => !filtru.length || filtru.some((q) => f.toLowerCase().includes(q.toLowerCase())))
  .sort();
/** exact ce se poate alege din panou */
const CARACTERE = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 'Ă', 'Â', 'Î', 'Ș', 'Ț'];
/** parametrii IMPLICIȚI ai aplicației — testul apără configurația cu care se deschide */
const IMPLICIT = { inaltimeLitera: 40, reliefLitera: 1.8, latimePlacuta: 7, netezire: 2, grosimePlacuta: 3,
  diametruGaura: 3.5, tipPrindere: 'gaura' as const, grosimePrindere: 0, pozitiePrindere: null,
  latura: 'sus' as const };
/** numele cu care se deschide aplicația: text, nu un singur caracter */
const NUME = ['Mateo', 'Valeria', 'SANTIAGO', 'Emma', 'Ștefan', 'Ana-Maria'];
/** configurația implicită a aplicației pentru NUME — plăcuță subțire, ureche la stânga */
const IMPLICIT_NUME = { reliefLitera: 1.8, latimePlacuta: 3, netezire: 2, grosimePlacuta: 3,
  diametruGaura: 4, tipPrindere: 'ureche' as const, grosimePrindere: 2.5, pozitiePrindere: null,
  latura: 'stanga' as const };
const LUNGIME_CERUTA = 70;
/** celelalte două tipuri de prindere, cu proporțiile lor din meniu */
const PRINDERI = [
  { tip: 'ureche' as const, diametruGaura: 4, grosimePrindere: 2.5 },
  { tip: 'inel' as const, diametruGaura: 9, grosimePrindere: 3 },
];

/** fonturi cu trăsături groase: detectorul TREBUIE să tacă pe ele la parametrii impliciți */
const GROASE = ['Baloo2', 'Anton', 'ArchivoBlack', 'Fredoka', 'BebasNeue', 'AlfaSlabOne'];
/** font cu hairline real: detectorul TREBUIE să se aprindă */
const SUBTIRE = { font: 'Tangerine', litera: 'J' };
/** fonturile pe care se verifică genus-ul, litere cu și fără contra-formă */
const GENUS_FONTURI = ['Baloo2', 'Cinzel'];

const load = (f: string) => {
  const b = readFileSync(join(FONT_DIR, f));
  return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
};
const nume = (f: string) => f.replace(/-(Regular|Bold|Italic).*\.(ttf|otf)$/i, '').replace(/\.(ttf|otf)$/i, '');

const esecuri: string[] = [];
const fail = (m: string) => esecuri.push('  ✗ ' + m);
const subtiri: { k: string; arie: number }[] = [];

const wasm: any = await ManifoldModule();
wasm.setup();
configureManifold(wasm);
instrumenteazaArena(wasm);

/**
 * MEMORIA WASM. Testul construiește ~18.000 de brelocuri. Obiectele Manifold sunt handle-uri
 * embind: memoria lor stă în heap-ul WASM și se eliberează doar prin `.delete()`, GC-ul JS
 * n-o atinge. Fără eliberare, heap-ul se umple pe la jumătatea rulării și WASM-ul începe să
 * arunce „parameter 0 has unknown type" — un nume de tip citit dintr-un pointer corupt, care
 * arată ca o eroare de tipuri, nu ca o memorie epuizată. Exact așa a picat testul când
 * catalogul a crescut de la 27 la 440 de fonturi: aceeași buclă, de 16 ori mai lungă.
 *
 * Fiecare construcție rulează într-o arenă proprie: intermediarele se eliberează la ieșire.
 * Rezultatele trăiesc cât să fie măsurate — se țin ultimele patru, fiindcă verificările
 * compară cel mult două brelocuri deodată (cu gaură / fără gaură).
 */
const receente: any[] = [];
const buildBreloc: typeof buildBrelocBrut = (cfg: any) => {
  const r = inArena(() => buildBrelocBrut(cfg), (x) => [x]);
  receente.push(r);
  if (receente.length > 4) elibereaza(adunaHandle(receente.shift()));
  return r;
};

console.log(`\nTEST BRELOCURI — ${CARACTERE.length} caractere × ${FONTS.length} fonturi, la parametrii impliciți`);
console.log(`(literă ${IMPLICIT.inaltimeLitera} mm · plăcuță ${IMPLICIT.latimePlacuta} mm · gaură Ø${IMPLICIT.diametruGaura} mm · perete min ${PERETE_MIN} mm)\n`);

const t0 = Date.now();
let testate = 0, sarite = 0;

for (const f of FONTS) {
  const font = load(f);
  const celule: string[] = [];
  for (const ch of CARACTERE) {
    if (font.charToGlyphIndex(ch) === 0) { celule.push('·'); sarite++; continue; }
    testate++;
    const eticheta = `${nume(f)} „${ch}"`;
    let d;
    try {
      d = buildBreloc({ ...IMPLICIT, text: ch, font }).diagnostice;
    } catch (e: any) {
      fail(`${eticheta}: buildBreloc a aruncat — ${e?.message ?? e}`); celule.push('E'); continue;
    }
    let ok = true;
    // ---- 5: geometrie validă (buildBreloc aruncă la status != NoError), glifă întreagă, o piesă
    if (d.glifeLipsa.length) { fail(`${eticheta}: glifă fără geometrie`); ok = false; }
    if (d.bucati !== 1) { fail(`${eticheta}: ${d.bucati} bucăți neconectate (brelocul se rupe)`); ok = false; }
    // ---- gaura trebuie să existe la parametrii impliciți
    if (!d.gaura.pozitie) { fail(`${eticheta}: nicio poziție validă pentru gaură`); ok = false; }
    else {
      // ---- 1: gaura nu atinge litera
      if (d.gaura.atingeLitera) { fail(`${eticheta}: gaura atinge litera`); ok = false; }
      // ---- 2: perete >= minim
      if (d.gaura.perete < PERETE_MIN) { fail(`${eticheta}: perete ${d.gaura.perete} mm < ${PERETE_MIN} mm`); ok = false; }
    }
    // ---- 3: censul trăsăturilor subțiri (raportat, nu picat — vezi antetul)
    if (d.trasaturi.ariaMaxMM2 > PATA_MAX) subtiri.push({ k: eticheta, arie: d.trasaturi.ariaMaxMM2 });
    celule.push(ok ? (d.trasaturi.ariaMaxMM2 > PATA_MAX ? '!' : '✓') : '✗');
  }
  console.log(`  ${nume(f).padEnd(20)} ${celule.join('')}`);
}
console.log(`\n  legendă: ✓ ok · ! trăsături sub ${TRASATURA_MIN} mm (font subțire, nu defect) · ✗ verificare picată · E eroare · · glifă inexistentă`);
console.log(`  ${testate} combinații verificate (${sarite} glife inexistente) în ${((Date.now() - t0) / 1000).toFixed(0)} s`);

// ---------------------------------------------------------------------------
// 4. GENUS — gaura adaugă exact o trecere prin material.
// Nu se compară cu 1 fix: plăcuța lui „O" e deja inelară (contra-forma nu se închide la
// 7 mm), deci pleacă de la genus 1 și ajunge la 2. Referința e ACELAȘI breloc fără gaură.
// ---------------------------------------------------------------------------
console.log('\n  genus (gaura = exact +1 trecere prin material):');
for (const f of FONTS.filter((x) => GENUS_FONTURI.some((g) => x.includes(g)))) {
  const font = load(f);
  let n = 0;
  for (const ch of CARACTERE) {
    if (font.charToGlyphIndex(ch) === 0) continue;
    const fara = buildBreloc({ ...IMPLICIT, text: ch, font, diametruGaura: 0 });
    const cu = buildBreloc({ ...IMPLICIT, text: ch, font });
    if (!cu.diagnostice.gaura.pozitie) continue;      // fără gaură n-are ce compara
    n++;
    const g0 = fara.corpPlacuta.genus(), g1 = cu.corpPlacuta.genus();
    if (g1 !== g0 + 1) fail(`${nume(f)} „${ch}": genus ${g0} -> ${g1}, așteptat ${g0 + 1}`);
  }
  console.log(`    ${nume(f).padEnd(20)} ${n} litere verificate`);
}

// ---------------------------------------------------------------------------
// URECHE și INEL — aceleași verificări, plus gâtul care le leagă de plăcuță.
// Aici gaura are voie să iasă din contur (își aduce materialul ei), deci verificarea de
// perete se face pe conturul FINAL, iar cea de gât e detectorul de trăsături pe plăcuță.
// ---------------------------------------------------------------------------
console.log('\n  ureche și inel (toate caracterele, pe 2 fonturi):');
for (const p of PRINDERI) {
  for (const f of FONTS.filter((x) => GENUS_FONTURI.some((g) => x.includes(g)))) {
    const font = load(f);
    let n = 0, gaturi = 0;
    for (const ch of CARACTERE) {
      if (font.charToGlyphIndex(ch) === 0) continue;
      n++;
      const eticheta = `${p.tip} ${nume(f)} „${ch}"`;
      const d = buildBreloc({ ...IMPLICIT, text: ch, font, tipPrindere: p.tip,
        diametruGaura: p.diametruGaura, grosimePrindere: p.grosimePrindere }).diagnostice;
      if (!d.gaura.pozitie) { fail(`${eticheta}: nicio poziție validă`); continue; }
      if (d.gaura.atingeLitera) fail(`${eticheta}: gaura atinge litera`);
      if (d.gaura.perete < PERETE_MIN) fail(`${eticheta}: perete ${d.gaura.perete} mm < ${PERETE_MIN} mm`);
      if (d.bucati !== 1) fail(`${eticheta}: ${d.bucati} bucăți — prinderea nu e lipită de plăcuță`);
      if (d.gaura.sectiuneMM2 < SECTIUNE_MIN) fail(`${eticheta}: secțiune ${d.gaura.sectiuneMM2} mm² < ${SECTIUNE_MIN}`);
      if (d.trasaturiPlacuta.ariaMaxMM2 > PATA_MAX) { gaturi++; fail(`${eticheta}: gât sub ${TRASATURA_MIN} mm (${d.trasaturiPlacuta.ariaMaxMM2} mm²)`); }
    }
    console.log(`    ${p.tip.padEnd(8)} ${nume(f).padEnd(20)} ${n} caractere · ${gaturi} gâturi subțiri`);
  }
}

// ---------------------------------------------------------------------------
// NUME — brelocul cu un cuvânt întreg, la configurația cu care se deschide aplicația.
// Aici se verifică în plus DIMENSIONAREA: lungimea cerută se obține din înălțimea calculată,
// deci „Mateo" și „SANTIAGO" trebuie să iasă la fel de lungi. Toleranța e strânsă (0.5 mm)
// fiindcă relația e exactă, nu aproximativă — o abatere ar însemna că scala s-a rupt.
// ---------------------------------------------------------------------------
console.log(`\n  nume (lungime cerută ${LUNGIME_CERUTA} mm, ureche la stânga):`);
for (const f of FONTS.filter((x) => ['Baloo2', 'Anton', 'Pacifico'].some((g) => x.includes(g)))) {
  const font = load(f);
  for (const text of NUME) {
    const lipsa = [...text].filter((c) => !/\s|-/.test(c) && font.charToGlyphIndex(c) === 0);
    if (lipsa.length) { console.log(`    ${nume(f).padEnd(12)} „${text}" — fontul n-are ${lipsa.join(' ')}, sărit`); continue; }
    const h = inaltimeDinLungime(font, text, LUNGIME_CERUTA, IMPLICIT_NUME.latimePlacuta);
    const eticheta = `${nume(f)} „${text}"`;
    let d;
    try { d = buildBreloc({ ...IMPLICIT_NUME, text, font, inaltimeLitera: h }).diagnostice; }
    catch (e: any) { fail(`${eticheta}: buildBreloc a aruncat — ${e?.message ?? e}`); continue; }
    const abatere = Math.abs(d.dimPlacuta[0] - LUNGIME_CERUTA);
    // urechea iese în afara plăcuței textului, deci lungimea CERUTĂ e a plăcuței, nu a
    // dreptunghiului total — se verifică pe cea măsurată fără prindere
    const faraPrindere = buildBreloc({ ...IMPLICIT_NUME, text, font, inaltimeLitera: h, diametruGaura: 0 }).diagnostice;
    if (Math.abs(faraPrindere.dimPlacuta[0] - LUNGIME_CERUTA) > 0.5) {
      fail(`${eticheta}: plăcuța iese ${faraPrindere.dimPlacuta[0]} mm în loc de ${LUNGIME_CERUTA}`);
    }
    if (d.bucati !== 1) fail(`${eticheta}: ${d.bucati} bucăți neconectate`);
    if (!d.gaura.pozitie) fail(`${eticheta}: nicio poziție validă pentru prindere`);
    else {
      if (d.gaura.atingeLitera) fail(`${eticheta}: prinderea atinge textul`);
      if (d.gaura.perete < PERETE_MIN) fail(`${eticheta}: perete ${d.gaura.perete} mm`);
      // prinderea trebuie să stea la CAPĂTUL din stânga, nu deasupra mijlocului cuvântului
      if (d.gaura.pozitie[0] > -LUNGIME_CERUTA / 4) fail(`${eticheta}: prinderea a rămas la x=${d.gaura.pozitie[0].toFixed(1)}, nu la capătul din stânga`);
    }
    console.log(`    ${nume(f).padEnd(12)} „${text}" -> ${d.dimPlacuta[0]}×${d.dimPlacuta[1]} mm · literă ${h.toFixed(1)} mm · abatere ${abatere.toFixed(1)} · trăsături ${d.trasaturi.ariaMaxMM2}`);
  }
}

// ---------------------------------------------------------------------------
// SECȚIUNEA BUCLEI — verificarea trebuie să se aprindă pe proporțiile subțiri.
// Referința e un generator comercial citit ca sursă: inel Ø5 cu gaură Ø3 pe bază de 2 mm,
// adică perete 1 mm și secțiune 2 mm². Dacă detectorul tace pe cazul ăsta, nu apără nimic.
// ---------------------------------------------------------------------------
console.log('\n  secțiunea buclei:');
{
  const font = load(FONTS.find((x) => x.includes('Baloo2')) ?? FONTS[0]);
  const subtire = buildBreloc({ ...IMPLICIT, text: 'A', font, tipPrindere: 'inel',
    diametruGaura: 3, grosimePrindere: 1, grosimePlacuta: 2 }).diagnostice.gaura;
  if (subtire.pozitie && subtire.sectiuneMM2 >= SECTIUNE_MIN) fail(`secțiunea nu se aprinde pe inel Ø5/gaură Ø3 pe 2 mm (${subtire.sectiuneMM2} mm²)`);
  else console.log(`    ✓ se aprinde pe proporțiile subțiri — ${subtire.sectiuneMM2} mm² < ${SECTIUNE_MIN}`);
  const gros = buildBreloc({ ...IMPLICIT, text: 'A', font, tipPrindere: 'inel',
    diametruGaura: 9, grosimePrindere: 3 }).diagnostice.gaura;
  if (gros.pozitie && gros.sectiuneMM2 < SECTIUNE_MIN) fail(`secțiunea se aprinde pe inelul implicit (${gros.sectiuneMM2} mm²) — prag prea strâns`);
  else console.log(`    ✓ tace pe inelul implicit — ${gros.sectiuneMM2} mm²`);
}

// ---------------------------------------------------------------------------
// POZIȚIE MANUALĂ — o poziție cerută explicit NU poate trece peste literă.
// Asta e plasa de siguranță a tragerii cu mouse-ul: chiar dacă interfața ar greși limitarea,
// geometria refuză poziția în loc s-o taie prin literă.
// ---------------------------------------------------------------------------
console.log('\n  poziție manuală (plasa de siguranță):');
{
  const font = load(FONTS.find((x) => x.includes('Baloo2')) ?? FONTS[0]);
  const bazaA = { ...IMPLICIT, text: 'A', font };
  const ref = buildBreloc(bazaA);
  // chiar în mijlocul literei: silueta plină acoperă originea, deci trebuie respinsă
  const peLitera = buildBreloc({ ...bazaA, pozitiePrindere: [0, ref.diagnostice.gaura.pozitie![1] + 20] });
  if (peLitera.diagnostice.gaura.pozitie) fail('poziția manuală peste literă a fost ACCEPTATĂ');
  else if (!peLitera.diagnostice.gaura.pozitieRespinsa) fail('poziția manuală peste literă n-a fost raportată ca respinsă');
  else console.log('    ✓ poziția peste literă e respinsă, nu se taie gaura');
  // o poziție validă cerută explicit trebuie folosită EXACT, fără să fie mutată pe furiș
  const ceruta: [number, number] = [ref.diagnostice.gaura.pozitie![0], ref.diagnostice.gaura.pozitie![1] + 1];
  const ok = buildBreloc({ ...bazaA, pozitiePrindere: ceruta });
  if (!ok.diagnostice.gaura.pozitie) fail('o poziție validă cerută manual a fost respinsă');
  else if (Math.abs(ok.diagnostice.gaura.pozitie[1] - ceruta[1]) > 1e-6) fail('poziția manuală validă a fost mutată');
  else console.log('    ✓ o poziție validă cerută manual e folosită exact');
}

// ---------------------------------------------------------------------------
// 3. DETECTORUL de trăsături subțiri: se aprinde unde trebuie, tace unde trebuie.
// Asta apără pragul calibrat (PATA_MAX) de o regresie tăcută în ambele sensuri.
// ---------------------------------------------------------------------------
console.log('\n  detector de trăsături subțiri:');
const fSub = FONTS.find((x) => x.includes(SUBTIRE.font));
if (!fSub) console.log(`    (${SUBTIRE.font} lipsește din folder — capătul „subțire" nu s-a putut verifica)`);
else {
  const d = buildBreloc({ ...IMPLICIT, text: SUBTIRE.litera, font: load(fSub) }).diagnostice;
  if (d.trasaturi.ariaMaxMM2 <= PATA_MAX) fail(`detectorul TACE pe ${SUBTIRE.font} „${SUBTIRE.litera}" (${d.trasaturi.ariaMaxMM2} mm² <= ${PATA_MAX})`);
  else console.log(`    ✓ se aprinde pe ${SUBTIRE.font} „${SUBTIRE.litera}" — ${d.trasaturi.ariaMaxMM2} mm²`);
}
for (const g of GROASE) {
  const f = FONTS.find((x) => x.includes(g));
  if (!f) continue;
  const font = load(f);
  let max = 0, chMax = '';
  for (const ch of CARACTERE) {
    if (font.charToGlyphIndex(ch) === 0) continue;
    const a = buildBreloc({ ...IMPLICIT, text: ch, font }).diagnostice.trasaturi.ariaMaxMM2;
    if (a > max) { max = a; chMax = ch; }
  }
  if (max > PATA_MAX) fail(`detectorul se aprinde pe fontul gros ${g} („${chMax}", ${max} mm²) — prag prea strâns`);
  else console.log(`    ✓ tace pe ${g.padEnd(14)} — cel mult ${max.toFixed(3)} mm² („${chMax}")`);
}

// ---------------------------------------------------------------------------
if (subtiri.length) {
  subtiri.sort((a, b) => b.arie - a.arie);
  console.log(`\n  ℹ trăsături sub ${TRASATURA_MIN} mm la ${subtiri.length} din ${testate} combinații (proprietate de font, avertizată în aplicație):`);
  for (const s of subtiri.slice(0, 8)) console.log(`      ${s.k.padEnd(28)} ${s.arie.toFixed(2)} mm²`);
  if (subtiri.length > 8) console.log(`      … și încă ${subtiri.length - 8}`);
}

if (esecuri.length) {
  console.error(`\n❌ VERIFICĂRI PICATE (${esecuri.length}):`);
  for (const e of esecuri) console.error(e);
  console.error('');
  // vezi regula din docs/design/: process.exit dupa manifold crapa libuv pe Windows
  process.exitCode = 1;
} else {
  console.log(`\n✅ Brelocuri OK — ${testate} combinații, gaura nu atinge litera, perete >= ${PERETE_MIN} mm, genus +1, o singură piesă.\n`);
}
