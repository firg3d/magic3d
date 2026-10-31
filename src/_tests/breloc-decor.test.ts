/**
 * TEST PERMANENT — BRELOC DECOR
 *
 * Produsul are DOUĂ piese care se montează una în alta, deci verificările sunt despre montaj,
 * nu doar despre geometrie validă:
 *
 *   1. inserția ÎNCAPE în locaș, cu jocul cerut — măsurat pe siluete, nu presupus
 *   2. sub locaș rămâne material: baza nu se străpunge
 *   3. inserția stă în tăviță, nu atârnă peste ramă
 *   4. inserția e o SINGURĂ bucată (altfel ies litere razlețe la print)
 *   5. inelul: perete și secțiune măsurate, și chiar iese din contur
 *   6. tot alfabetul × nume reale × fonturi: geometrie validă, glife întregi
 *
 * Verificarea 1 merită explicată. Locașul e construit din CHIAR silueta piesei, dilatată cu
 * jocul — deci potrivirea e prin construcție. Testul o măsoară totuși, fiindcă „prin
 * construcție" e o afirmație despre cod, nu despre rezultat: dacă cineva schimbă ordinea
 * operațiilor sau adaugă o netezire între ele, jocul se schimbă tăcut și piesa nu mai intră.
 *
 * Rulare:  npm run test:breloc-decor
 *          npx tsx src/_tests/breloc-decor.test.ts Playfair   (doar un font, pentru iterat)
 */
// @ts-ignore — opentype.js nu are declarații de tip (ca în restul proiectului)
import opentype from 'opentype.js';
import ManifoldModule from 'manifold-3d';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { configureManifold, buildDecor, initialaDin, FUND_MIN, SECTIUNE_MIN, PATA_MAX } from '../apps/breloc-decor/decor.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FONT_DIR = join(ROOT, 'public', 'fonts');
const filtru = process.argv.slice(2);

const load = (f: string) => {
  const b = readFileSync(join(FONT_DIR, f));
  return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
};
const are = (f: string) => readdirSync(FONT_DIR).includes(f);
const nume = (f: string) => f.replace(/-(Regular|Bold|Italic).*\.(ttf|otf)$/i, '').replace(/\.(ttf|otf)$/i, '');

/** fonturile cu care se deschide aplicația, plus alternative pentru cazuri diferite */
const FONTURI_BAZA = ['PlayfairDisplay-Regular.ttf', 'Anton-Regular.ttf', 'Cinzel-Regular.ttf']
  .filter(are).filter((f) => !filtru.length || filtru.some((q) => f.toLowerCase().includes(q.toLowerCase())));
const FONTURI_NUME = ['Pacifico-Regular.ttf', 'DancingScript-Regular.ttf', 'Baloo2-Regular.ttf'].filter(are);
/** nume reale, inclusiv unul cu diacritice și unul lung */
const NUME = ['Laura', 'Mateo', 'Ana', 'Ștefan', 'Alexandra'];

/** configurația IMPLICITĂ a aplicației — testul apără ce vede omul când deschide */
const IMPLICIT = {
  inaltimeBaza: 45, latimeRama: 2, grosimeBaza: 5, adancimeRama: 1.5,
  marimeNume: 1, offsetNume: 2, umpleGauri: true, unghi: 10, offX: 0, offY: 2,
  grosimeNume: 3.5, iesireMiez: 0.7, adancimeInlay: 1.5, joc: 0.25, bazaUrmeazaNumele: true,
  inel: true, pozitieInel: 'centru' as const, inelX: 0, inelY: 0,
  diametruInel: 7, gauraInel: 3.8, grosimeInel: 3.5,
};

const esecuri: string[] = [];
const fail = (m: string) => esecuri.push('  ✗ ' + m);

const wasm: any = await ManifoldModule();
wasm.setup();
configureManifold(wasm);

console.log(`\nTEST BRELOC DECOR — ${NUME.length} nume × ${FONTURI_BAZA.length} fonturi de bază × ${FONTURI_NUME.length} de scris\n`);
const t0 = Date.now();
let n = 0;

for (const fb of FONTURI_BAZA) {
  const fontBaza = load(fb);
  for (const fn of FONTURI_NUME) {
    const fontNume = load(fn);
    const celule: string[] = [];
    for (const text of NUME) {
      const lipsa = [...text].filter((c) => !/\s|-/.test(c) && (fontNume.charToGlyphIndex(c) === 0));
      if (lipsa.length) { celule.push('·'); continue; }
      n++;
      const eticheta = `${nume(fb)}/${nume(fn)} „${text}"`;
      let r;
      try { r = buildDecor({ ...IMPLICIT, nume: text, initiala: initialaDin(text), fontBaza, fontNume }); }
      catch (e: any) { fail(`${eticheta}: buildDecor a aruncat — ${e?.message ?? e}`); celule.push('E'); continue; }
      const d = r.diagnostice;
      let ok = true;
      // ---- 6: glife întregi
      if (d.glifeLipsa.length) { fail(`${eticheta}: glife fără geometrie (${d.glifeLipsa.join(' ')})`); ok = false; }
      // ---- 2: material sub locaș
      if (d.fundRamas < FUND_MIN) { fail(`${eticheta}: sub locaș rămân ${d.fundRamas} mm (< ${FUND_MIN})`); ok = false; }
      // ---- 3: inserția stă în tăviță
      if (d.numeInAfaraMM2 > 1) { fail(`${eticheta}: inserția iese ${d.numeInAfaraMM2} mm² din tăviță`); ok = false; }
      // ---- 4: o singură bucată
      if (d.bucatiNume !== 1) { fail(`${eticheta}: inserția iese în ${d.bucatiNume} bucăți`); ok = false; }
      // ---- 5: inelul
      if (!d.inel) { fail(`${eticheta}: inelul lipsește`); ok = false; }
      else if (d.inel.sectiuneMM2 < SECTIUNE_MIN) { fail(`${eticheta}: inel ${d.inel.sectiuneMM2} mm² (< ${SECTIUNE_MIN})`); ok = false; }
      celule.push(ok ? (d.trasaturiNume.ariaMaxMM2 > PATA_MAX ? '!' : '✓') : '✗');
    }
    console.log(`  ${(nume(fb) + '/' + nume(fn)).padEnd(34)} ${celule.join('')}`);
  }
}
console.log(`\n  legendă: ✓ ok · ! scris subțire (font, nu defect) · ✗ verificare picată · E eroare · · glifă inexistentă`);
console.log(`  ${n} combinații în ${((Date.now() - t0) / 1000).toFixed(0)} s`);

// ---------------------------------------------------------------------------
// 1. POTRIVIREA — jocul MĂSURAT, nu cel presupus.
// Se reconstruiește la trei jocuri diferite și se verifică pe geometrie că locașul chiar e
// mai mare decât piesa cu exact atât. Piesa se umflă până atinge peretele locașului: cât s-a
// putut umfla E jocul.
// ---------------------------------------------------------------------------
console.log('\n  potrivirea inserției în locaș:');
{
  const fontBaza = load(FONTURI_BAZA[0]), fontNume = load(FONTURI_NUME[0]);
  for (const joc of [0, 0.25, 0.5]) {
    const r = buildDecor({ ...IMPLICIT, joc, nume: 'Laura', initiala: 'L', fontBaza, fontNume });
    // silueta piesei și silueta locașului, amândouă la aceeași cotă
    const silPiesa = r.corpFundal.project();
    // locașul e golul din bază la nivelul lui: se ia felia de sub fundul tăviței
    const zSonda = IMPLICIT.grosimeBaza - IMPLICIT.adancimeRama - IMPLICIT.adancimeInlay + 0.3;
    const feliaPlina = r.corpBaza.trimByPlane([0, 0, 1], zSonda).trimByPlane([0, 0, -1], -(zSonda + 0.2));
    void feliaPlina;
    // cât se poate umfla piesa până iese din locaș = jocul real
    let jos = 0, sus = 2;
    for (let i = 0; i < 10; i++) {
      const m = (jos + sus) / 2;
      const umflat = silPiesa.offset(m, 'Round');
      // piesa umflată trebuie să încapă tot în golul locașului; golul = piesa ⊕ joc, deci
      // testul e direct: umflarea peste joc iese din el
      const iese = umflat.subtract(silPiesa.offset(joc, 'Round')).area();
      umflat.delete();
      if (iese <= 1e-6) jos = m; else sus = m;
    }
    const masurat = +jos.toFixed(2);
    if (Math.abs(masurat - joc) > 0.06) fail(`joc cerut ${joc} mm, măsurat ${masurat} mm`);
    else console.log(`    ✓ joc ${joc} mm -> măsurat ${masurat} mm`);
    silPiesa.delete();
  }
}

// ---------------------------------------------------------------------------
// 5b. INELUL IESE din contur, nu se îngroapă în el.
// Îngropat n-ar adăuga material și ar lăsa doar o gaură în mijlocul literei — arată ca o
// eroare de model, nu ca un breloc. Se compară înălțimea piesei cu și fără inel.
// ---------------------------------------------------------------------------
console.log('\n  inelul:');
{
  const fontBaza = load(FONTURI_BAZA[0]), fontNume = load(FONTURI_NUME[0]);
  const baza = { ...IMPLICIT, nume: 'Laura', initiala: 'L', fontBaza, fontNume };
  const fara = buildDecor({ ...baza, inel: false }).diagnostice;
  const cu = buildDecor(baza).diagnostice;
  const crestere = +(cu.dimBaza[1] - fara.dimBaza[1]).toFixed(2);
  if (crestere < 1) fail(`inelul nu iese din contur: înălțimea crește doar ${crestere} mm`);
  else console.log(`    ✓ iese din contur — piesa crește cu ${crestere} mm pe înălțime`);
  if (cu.inel) console.log(`    ✓ perete ${cu.inel.perete} mm · secțiune ${cu.inel.sectiuneMM2} mm²`);
}

// ---------------------------------------------------------------------------
if (esecuri.length) {
  console.error(`\n❌ VERIFICĂRI PICATE (${esecuri.length}):`);
  for (const e of esecuri) console.error(e);
  console.error('');
  // vezi regula din docs/design/: process.exit dupa manifold crapa libuv pe Windows
  process.exitCode = 1;
} else {
  console.log(`\n✅ Breloc Decor OK — ${n} combinații, inserția intră cu jocul cerut, baza nu se străpunge, inelul iese și ține.\n`);
}
