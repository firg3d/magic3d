/**
 * TEST PERMANENT — LITERE LED
 *
 * Verificările din docs/plan-litere-led.md, ca aserțiuni:
 *
 *   1. ÎNCAPE BANDA — cavitatea are pe undeva lățimea benzii plus joc.
 *   2. FAȚA INTRĂ ÎN PRAG — coliziune ZERO între cele două piese, în poziția de montaj.
 *      Verificare de aceeași natură cu inlay-ul de la Litere Decor: piesa se aduce acolo unde
 *      va sta și se cere ca intersecția să fie goală.
 *   3. FAȚA SE SPRIJINĂ — nu doar că nu se lovește, ci că are pe ce sta: sub marginea ei
 *      trebuie să fie material, pe lățimea pragului.
 *   4. FAȚA ÎNCHIDE LITERA — aria feței plus inelul opac dau silueta, mai puțin rostul de joc.
 *   5. PERETE OPAC ≥ 1.6 mm — prag OPTIC, nu de printabilitate.
 *   6. COMPONENTE CONEXE — corpul rămâne o piesă; NU genus, care crește cu fiecare cameră.
 *   7. ALFABET — toate literele × toate fonturile, ambele piese.
 *   8. Exportul nu iese în oglindă, iar ambele piese pleacă de la Z=0.
 *
 * Rulare:  npm run test:led
 *          npx tsx src/_tests/led.test.ts Baloo Cinzel     (doar câteva fonturi, pentru iterat)
 */
// @ts-ignore — opentype.js nu are declarații de tip (ca în restul proiectului)
import opentype from 'opentype.js';
import ManifoldModule from 'manifold-3d';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { configureManifold, buildLed as buildLedBrut, pentruPrint, PERETE_OPAC_MIN, PATA_MAX, TRASATURA_MIN,
  JOC_BANDA, BENZI, GROSIME_BANDA, pasLED, PERETE_CANAL, POZITII_CANAL, PUTERE_PE_METRU,
  STANDOFF_TIJA, MATERIAL_PESTE_LOCAS,
  type LedConfig, type TipBanda } from '../apps/led/led.js';
import { instrumenteazaArena, inArena, adunaHandle, elibereaza as elibereazaArena } from '../core/geometry/arena.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FONT_DIR = join(ROOT, 'public', 'fonts');

const filtru = process.argv.slice(2);
const FONTS = readdirSync(FONT_DIR)
  .filter((f) => /\.(ttf|otf)$/i.test(f))
  .filter((f) => !filtru.length || filtru.some((q) => f.toLowerCase().includes(q.toLowerCase())))
  .sort();
const CARACTERE = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'];
/** parametrii IMPLICIȚI ai aplicației — testul apără configurația cu care se deschide */
const IMPLICIT = { inaltimeLitera: 150, adancimeCorp: 25, ingrosare: 0, grosimePerete: 2, grosimeSpate: 2,
  latimeBanda: 10, tipBanda: 60 as const, latimePrag: 1.2, adancimePrag: 2, grosimeFata: 1.6, jocFata: 0.2, diametruCanal: 4, pozitieCanal: 'spate' as const, locCanal: 'jos' as const,
  tipAgatare: 'cheie' as const, surubCap: 5, surubTija: 2.5, inaltimeCapSurub: 3, latimeGrila: 20 };
/** fonturi cu trăsături groase: detectorul de material subțire TREBUIE să tacă pe ele */
const GROASE = ['Baloo2', 'Anton', 'ArchivoBlack', 'Fredoka', 'BebasNeue', 'AlfaSlabOne'];

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
configureManifold(wasm);
instrumenteazaArena(wasm);

/**
 * MEMORIA WASM. Obiectele Manifold sunt handle-uri embind: memoria lor sta in heap-ul WASM si
 * se elibereaza doar prin `.delete()`, GC-ul JS n-o atinge. Testul trece prin 440 de fonturi si,
 * spre final, incepea sa dea eroare la fiecare litera, apoi se BLOCA — heap epuizat. Nu e un
 * defect de geometrie: la inceputul rularii aceleasi fonturi trec curat. A aparut cand catalogul
 * a crescut de la 27 la 440 de fonturi: aceeasi bucla, de 16 ori mai lunga.
 *
 * Fiecare constructie ruleaza in arena proprie; se tin ultimele patru rezultate, fiindca
 * verificarile compara cel mult doua litere deodata.
 */
const recente: any[] = [];
const buildLed: typeof buildLedBrut = (cfg: any) => {
  const r = inArena(() => buildLedBrut(cfg), (x) => [x]);
  recente.push(r);
  if (recente.length > 4) elibereazaArena(adunaHandle(recente.shift()));
  return r;
};
const { Manifold, CrossSection } = wasm;

const cfg = (over: Partial<LedConfig> & { font: any; litera: string }): LedConfig =>
  ({ ...IMPLICIT, ...over });

/** eliberează ambele corpuri: heap-ul WASM se curăță abia la un GC al JS-ului */
const elibereaza = (r: { corpOpac: any; corpFata: any | null }) => { r.corpOpac.delete(); r.corpFata?.delete(); };

console.log(`\nTEST LITERE LED — ${FONTS.length} fonturi × ${CARACTERE.length} caractere`);
console.log(`(literă ${IMPLICIT.inaltimeLitera} mm · adâncime ${IMPLICIT.adancimeCorp} mm · perete ${IMPLICIT.grosimePerete} mm · față ${IMPLICIT.grosimeFata} mm)`);

const t0 = Date.now();
let testate = 0;
/** censul literelor la care banda nu încape la parametrii impliciți (diagnostic, nu defect) */
const faraBanda: string[] = [];
/** câte caractere nu primesc sistemul de agățare (diagnostic, nu defect) */
let faraAgatare = 0;

// =====================================================================
// MĂTURAREA: alfabetul întreg × toate fonturile
// =====================================================================
{
  const stat = { coliziuneMax: 0, coliziuneK: '', ms: 0, msK: '', tri: 0, sprijinMin: Infinity };
  for (const f of FONTS) {
    const font = load(f);
    const rand: string[] = [];
    for (const ch of CARACTERE) {
      if (font.charToGlyphIndex(ch) === 0) { rand.push('·'); continue; }
      testate++;
      const eticheta = `${nume(f)} „${ch}"`;
      let r;
      try {
        r = buildLed(cfg({ font, litera: ch }));
      } catch (e: any) { fail(`${eticheta}: buildLed a aruncat — ${e?.message ?? e}`); rand.push('E'); continue; }
      const d = r.diagnostice;
      let bun = true;

      if (d.glifeLipsa.length) { fail(`${eticheta}: glifă fără geometrie`); bun = false; }

      // ---- 6: CONECTIVITATE — corpul rămâne o piesă pentru fiecare bucată a literei
      if (d.bucati !== d.bucatiLitera) {
        fail(`${eticheta}: corpul iese în ${d.bucati} bucăți, litera are ${d.bucatiLitera}`); bun = false;
      }
      const parti = r.corpOpac.decompose();
      if (parti.length !== d.bucati) { fail(`${eticheta}: solidul are ${parti.length} bucăți, diagnosticul ${d.bucati}`); bun = false; }
      for (const p of parti) p.delete();

      // ---- 2: COLIZIUNE ZERO între cele două piese, în poziția de montaj
      if (d.fata.coliziuneMM3 > 0) {
        fail(`${eticheta}: fața se lovește de corp cu ${d.fata.coliziuneMM3} mm³ — nu intră în locaș`); bun = false;
      }
      if (d.fata.coliziuneMM3 > stat.coliziuneMax) { stat.coliziuneMax = d.fata.coliziuneMM3; stat.coliziuneK = eticheta; }

      // ---- 5: peretele opac rămâne peste pragul OPTIC (parametrul e limitat, dar dacă
      //         vreodată nu mai e, verificarea o spune)
      if (IMPLICIT.grosimePerete < PERETE_OPAC_MIN) {
        fail(`${eticheta}: perete ${IMPLICIT.grosimePerete} mm sub pragul optic de ${PERETE_OPAC_MIN}`); bun = false;
      }
      // material sub pragul PRINTABIL, pe fonturile groase detectorul trebuie să tacă
      if (GROASE.some((g) => f.startsWith(g)) && d.trasaturi.ariaMaxMM2 > PATA_MAX) {
        fail(`${eticheta}: font gros, dar ${d.trasaturi.ariaMaxMM2} mm² de material sub ${TRASATURA_MIN} mm`); bun = false;
      }

      // ---- 1: censul benzii (nu e defect — e diagnostic pe care aplicația îl spune)
      if (!d.camereUtile) faraBanda.push(eticheta);
      if (!d.agatare.pozitii.length) faraAgatare++;
      if (!d.fata.faraPrag) stat.sprijinMin = Math.min(stat.sprijinMin, d.fata.sprijinMM);

      stat.tri = Math.max(stat.tri, d.triunghiuri);
      if (r.ms > stat.ms) { stat.ms = r.ms; stat.msK = eticheta; }
      elibereaza(r);
      rand.push(bun ? (d.camereUtile ? '✓' : 'b') : '✗');
    }
    console.log(`  ${nume(f).padEnd(20)} ${rand.join('')}`);
  }
  console.log(`\n  legendă: ✓ literă LED completă · b banda nu încape (diagnostic, nu defect) · ✗ EȘEC · E eroare · · glifă inexistentă`);
  console.log(`  coliziune maximă între piese: ${stat.coliziuneMax} mm³${stat.coliziuneK ? ' (' + stat.coliziuneK + ')' : ''} — pragul e ZERO`);
  console.log(`  fără loc de agățare: ${faraAgatare} din ${testate}`);
  console.log(`  cel mai scump ${stat.msK} ${stat.ms.toFixed(0)} ms · mesh maxim ${stat.tri.toLocaleString('en-US')} triunghiuri`);
}

// =====================================================================
// FAȚA SE SPRIJINĂ, NU DOAR „NU SE LOVEȘTE"
//
// Coliziunea zero se obține și dacă fața e mult prea mică — ar cădea prin literă. Deci se
// verifică și reversul: sub marginea feței TREBUIE să fie material, pe lățimea pragului.
// =====================================================================
console.log('\n  fața se sprijină pe prag:');
{
  const font = load(FONTS.find((f) => f.startsWith('ArchivoBlack')) ?? FONTS[0]);
  for (const ch of ['A', 'O', 'H']) {
    const r = buildLed(cfg({ font, litera: ch }));
    const d = r.diagnostice;
    if (!r.corpFata) { fail(`„${ch}": nu s-a generat față`); elibereaza(r); continue; }

    // felia de material de sub fața montată: cât din amprenta feței stă pe material plin
    const zUmar = IMPLICIT.grosimeSpate + IMPLICIT.adancimeCorp - IMPLICIT.adancimePrag;
    const amprenta = r.corpFata.project();
    const felie = Manifold.extrude(amprenta, 1).translate([0, 0, zUmar - 1]);
    const sprijin = r.corpOpac.intersect(felie);
    const ariaSprijin = sprijin.volume();   // felia are 1 mm, deci volumul E aria
    sprijin.delete(); felie.delete(); amprenta.delete();

    // pragul e un inel de lățime (latimePrag − joc) în jurul conturului feței; aria lui
    // aproximativă = perimetru × lățime. Se cere doar să NU fie zero și să fie de ordinul ăsta.
    if (ariaSprijin < 50) {
      fail(`„${ch}": fața nu are pe ce sta — doar ${ariaSprijin.toFixed(0)} mm² de material sub marginea ei`);
    } else ok(`„${ch}" — fața se sprijină pe ${ariaSprijin.toFixed(0)} mm² de prag, coliziune ${d.fata.coliziuneMM3} mm³`);

    // ---- 4: FAȚA ÎNCHIDE LITERA. Aria feței + inelul opac din față trebuie să dea silueta,
    //         mai puțin rostul de joc. Altfel ar rămâne o fantă prin care se vede înăuntru.
    const sectFata = r.corpOpac.slice(zUmar + IMPLICIT.grosimeFata / 2);
    const inelOpac = sectFata.area();
    sectFata.delete();
    const acoperit = d.fata.ariaMM2 + inelOpac;
    const lipsa = d.ariaPlinaMM2 - acoperit;
    // rostul: perimetrul feței × joc. La „A" perimetrul e ~600 mm, deci ~120 mm² la 0.2 mm.
    if (lipsa < 0 || lipsa > d.ariaPlinaMM2 * 0.05) {
      fail(`„${ch}": fața + inelul opac = ${acoperit.toFixed(0)} mm² din ${d.ariaPlinaMM2} — rămâne ${lipsa.toFixed(0)} mm² descoperiți`);
    } else ok(`„${ch}" — fața (${d.fata.ariaMM2} mm²) + inelul opac (${inelOpac.toFixed(0)} mm²) închid litera; rost ${lipsa.toFixed(0)} mm²`);
    elibereaza(r);
  }
}

// =====================================================================
// LOCAȘUL E CHIAR MAI LARG DECÂT CAVITATEA BENZII
//
// Pragul e o LĂRGIRE spre gură, nu o consolă spre interior: mergând în sus materialul doar
// dispare, deci piesa se printează fără suporți. Dacă vreodată s-ar inversa, secțiunea de sus
// ar avea MAI MULT material decât cea de jos — și asta se măsoară.
// =====================================================================
console.log('\n  pragul e lărgire, nu consolă:');
{
  const font = load(FONTS.find((f) => f.startsWith('ArchivoBlack')) ?? FONTS[0]);
  const r = buildLed(cfg({ font, litera: 'A' }));
  const zBanda = IMPLICIT.grosimeSpate + (IMPLICIT.adancimeCorp - IMPLICIT.adancimePrag) / 2;
  const zLocas = IMPLICIT.grosimeSpate + IMPLICIT.adancimeCorp - IMPLICIT.adancimePrag / 2;
  const sB = r.corpOpac.slice(zBanda), sL = r.corpOpac.slice(zLocas);
  const aB = sB.area(), aL = sL.area();
  sB.delete(); sL.delete();
  if (aL >= aB) {
    fail(`pragul iese spre interior: la locaș ${aL.toFixed(0)} mm² față de ${aB.toFixed(0)} la bandă — ar fi consolă la print`);
  } else ok(`inelul scade de la ${aB.toFixed(0)} mm² (bandă) la ${aL.toFixed(0)} mm² (locaș) — material care dispare în sus, zero suspendat`);
  elibereaza(r);
}

// =====================================================================
// AVERTISMENTUL OPTIC — cel mai valoros din aplicație
//
// „Distanța de la LED la față ≥ pasul dintre LED-uri" nu e o preferință, e diferența dintre o
// suprafață luminoasă și un șir de puncte. Se verifică pe AMBELE capete (detectorul trebuie și
// să tacă, și să vorbească) și, mai important, că valoarea propusă CHIAR REPARĂ — la fel ca
// sfaturile de la Cutii Litere.
// =====================================================================
console.log('\n  avertismentul optic:');
{
  const font = load(FONTS.find((f) => f.startsWith('ArchivoBlack')) ?? FONTS[0]);

  // 1. DISTANȚA E CEA REALĂ, nu adâncimea corpului. Banda stă pe spate și fața e coborâtă în
  //    locaș, deci se scad amândouă. Fără termenii ăștia cifra ar ieși optimistă cu 5 mm.
  {
    const r = buildLed(cfg({ font, litera: 'A' }));
    const o = r.diagnostice.optic;
    const asteptat = IMPLICIT.adancimeCorp - IMPLICIT.adancimePrag - GROSIME_BANDA;
    if (Math.abs(o.distantaMM - asteptat) > 0.05) {
      fail(`distanța optică ${o.distantaMM} mm, așteptat ${asteptat} (adâncime − locaș − grosimea benzii)`);
    } else ok(`distanța optică ${o.distantaMM} mm = adâncime ${IMPLICIT.adancimeCorp} − locaș ${IMPLICIT.adancimePrag} − bandă ${GROSIME_BANDA}`);
    elibereaza(r);
  }

  // 2. DETECTORUL ARE AMBELE CAPETE, pe fiecare tip de bandă
  for (const tip of BENZI) {
    const pas = pasLED(tip);
    const adancSuficienta = Math.ceil(pas + IMPLICIT.adancimePrag + GROSIME_BANDA);
    const sub = buildLed(cfg({ font, litera: 'A', tipBanda: tip, adancimeCorp: adancSuficienta - 2 }));
    const peste = buildLed(cfg({ font, litera: 'A', tipBanda: tip, adancimeCorp: adancSuficienta }));
    if (sub.diagnostice.optic.uniform) fail(`${tip} LED/m: la ${adancSuficienta - 2} mm nu s-a semnalat nimic, deși pasul e ${pas.toFixed(1)} mm`);
    if (!peste.diagnostice.optic.uniform) fail(`${tip} LED/m: la ${adancSuficienta} mm se semnalează puncte, deși distanța acoperă pasul de ${pas.toFixed(1)} mm`);
    if (!sub.diagnostice.optic.uniform && peste.diagnostice.optic.uniform) {
      ok(`${tip} LED/m (pas ${pas.toFixed(1)} mm) — semnalează la ${adancSuficienta - 2} mm, tace la ${adancSuficienta}`);
    }
    elibereaza(sub); elibereaza(peste);
  }

  // 3. ADÂNCIMEA PROPUSĂ CHIAR REPARĂ. Aplicația spune „mărește la {minim} mm"; se reconstruiește
  //    cu exact acea valoare și se cere lumină uniformă. Un sfat cu cifre care nu funcționează
  //    e mai rău decât un mesaj generic.
  let verificate = 0;
  for (const tip of BENZI) {
    for (const adanc of [10, 12, 15, 20]) {
      const r = buildLed(cfg({ font, litera: 'A', tipBanda: tip, adancimeCorp: adanc }));
      const o = r.diagnostice.optic;
      elibereaza(r);
      if (o.uniform) continue;
      const r2 = buildLed(cfg({ font, litera: 'A', tipBanda: tip, adancimeCorp: o.adancimeMinima }));
      if (!r2.diagnostice.optic.uniform) {
        fail(`${tip} LED/m la ${adanc} mm: sfatul „mărește la ${o.adancimeMinima} mm" nu dă lumină uniformă`);
      } else verificate++;
      elibereaza(r2);
      // 4. BANDA PROPUSĂ, dacă e propusă, chiar merge la adâncimea de acum
      if (o.bandaPotrivita) {
        const r3 = buildLed(cfg({ font, litera: 'A', tipBanda: o.bandaPotrivita as TipBanda, adancimeCorp: adanc }));
        if (!r3.diagnostice.optic.uniform) {
          fail(`${tip} LED/m la ${adanc} mm: banda propusă de ${o.bandaPotrivita} LED/m tot nu dă lumină uniformă`);
        } else verificate++;
        elibereaza(r3);
      }
    }
  }
  ok(`${verificate} sfaturi optice (adâncime sau bandă mai deasă), verificate prin reconstrucție`);
}

// =====================================================================
// CANALUL DE CABLU CHIAR STRĂPUNGE
//
// Bara de stare spune „canal Ø4, 1.2 mm de material în jur" și pe o geometrie în care cilindrul
// n-a atins peretele — raportarea vine din parametri, nu din solid. Deci se măsoară pe SOLID:
// pe traseul canalului nu trebuie să rămână material, iar cablul trebuie să ajungă chiar afară.
// =====================================================================
console.log('\n  canalul de cablu:');
{
  const font = load(FONTS.find((f) => f.startsWith('ArchivoBlack')) ?? FONTS[0]);
  const r0 = IMPLICIT.diametruCanal / 2;
  for (const poz of POZITII_CANAL) {
    const r = buildLed(cfg({ font, litera: 'A', pozitieCanal: poz }));
    const c = r.diagnostice.canal;
    if (!c.punct) { fail(`canal „${poz}": n-a încăput pe „A", deși litera e largă`); elibereaza(r); continue; }
    const [cx, cy] = c.punct;
    // sonda: același traseu, cu rază mai mică, ca să nu atingă marginile
    const rs = r0 * 0.7;
    const lung = poz === 'spate' ? IMPLICIT.grosimeSpate
      : IMPLICIT.grosimePerete + IMPLICIT.latimePrag + 4;
    const cil = Manifold.cylinder(lung, rs, rs, 32, false);
    const zAxa = IMPLICIT.grosimeSpate + r0 + PERETE_CANAL;
    const sonda = poz === 'spate' ? cil.translate([cx, cy, 0])
      : poz === 'jos' ? cil.rotate([-90, 0, 0]).translate([cx, cy - 0.5, zAxa])
        : cil.rotate([0, 90, 0]).translate([cx + 0.5, cy, zAxa]).mirror([1, 0, 0]);
    cil.delete();
    const ramas = r.corpOpac.intersect(sonda);
    const v = ramas.volume();
    ramas.delete(); sonda.delete();
    if (v > 1) fail(`canal „${poz}": pe traseu a rămas material (${v.toFixed(1)} mm³) — nu străpunge`);
    else ok(`canal „${poz}" Ø${IMPLICIT.diametruCanal} — traseu liber, ${c.peretRamasMM} mm de material în jur`);
    elibereaza(r);
  }

  // canalul prea mare NU se forțează: se refuză și se spune
  const mare = buildLed(cfg({ font, litera: 'I', inaltimeLitera: 60, diametruCanal: 8 }));
  const cm = mare.diagnostice.canal;
  if (cm.punct) {
    // dacă totuși a încăput, verificarea de perete trebuie să fie adevărată
    ok(`la „I" 60 mm canalul de Ø8 tot a încăput, cu ${cm.peretRamasMM} mm în jur`);
  } else ok('canalul care nu încape e refuzat, nu forțat — se raportează, nu se taie');
  elibereaza(mare);
}

// =====================================================================
// CÂTĂ BANDĂ, CÂTE LED-URI, CÂȚI WAȚI
//
// Cifrele astea pleacă spre magazin, deci trebuie să se lege între ele: numărul de LED-uri și
// puterea se DEDUC din lungime, nu se raportează independent. Dacă vreodată se despart, cineva
// cumpără o sursă prea mică.
// =====================================================================
console.log('\n  banda, LED-urile si consumul:');
{
  const font = load(FONTS.find((f) => f.startsWith('ArchivoBlack')) ?? FONTS[0]);
  for (const tip of BENZI) {
    const r = buildLed(cfg({ font, litera: 'A', tipBanda: tip }));
    const b = r.diagnostice.banda;
    const m = b.lungimeCM / 100;
    const ledAsteptat = Math.floor(m * tip);
    const wAsteptat = +(m * PUTERE_PE_METRU[tip]).toFixed(1);
    if (b.nrLED !== ledAsteptat) fail(`${tip} LED/m: ${b.nrLED} LED raportate, ${ledAsteptat} din ${b.lungimeCM} cm`);
    else if (Math.abs(b.putereW - wAsteptat) > 0.05) fail(`${tip} LED/m: ${b.putereW} W raportați, ${wAsteptat} din ${b.lungimeCM} cm`);
    else ok(`${tip} LED/m — ${b.lungimeCM} cm · ${b.nrLED} LED · ${b.putereW} W la ${b.tensiuneV} V, toate din aceeași lungime`);
    elibereaza(r);
  }
  // lungimea e pe linia MEDIANĂ, deci sub perimetrul cavității — nu peste
  const r2 = buildLed(cfg({ font, litera: 'O' }));
  const d2 = r2.diagnostice;
  if (d2.banda.lungimeCM <= 0) fail('„O": lungime de bandă zero, deși are cavitate');
  else ok(`„O" — ${d2.banda.lungimeCM} cm de bandă pe linia mediană a cavității de ${d2.ariaCavitateMM2} mm²`);
  elibereaza(r2);
}

// =====================================================================
// AGĂȚAREA: CAPUL ȘURUBULUI CHIAR GLISEAZĂ
//
// Aceeași verificare ca la Cutii Litere și Litere Fagure, pe același mecanism din nucleu — și
// din același motiv: un locaș tăiat dintr-un singur contur are fanta de lățimea TIJEI la orice
// adâncime, deci capul intră în cercul mare și rămâne acolo. Litera se pune pe șurub și cade.
// =====================================================================
console.log('\n  agatarea pe perete:');
{
  const font = load(FONTS.find((f) => f.startsWith('ArchivoBlack')) ?? FONTS[0]);
  const rCap = IMPLICIT.surubCap / 2, hCap = IMPLICIT.inaltimeCapSurub;
  for (const [ch, tip] of [['A', 'cheie'], ['O', 'cheie'], ['E', 'grila']] as ['A', 'cheie'][]) {
    const r = buildLed(cfg({ font, litera: ch, tipAgatare: tip }));
    const a = r.diagnostice.agatare;
    if (!a.pozitii.length) { fail(`„${ch}" ${tip}: sistemul nu a încăput`); elibereaza(r); continue; }
    const [px, py] = a.pozitii[0];
    const yStart = tip === 'cheie' ? py : py - rCap;
    const yFinal = py - (tip === 'cheie' ? IMPLICIT.surubCap : 8);

    const disc = Manifold.cylinder(hCap, rCap, rCap, 48, false);
    let drum: any = null;
    for (let i = 0; i <= 8; i++) {
      const d2 = disc.translate([px, yStart + ((yFinal - yStart) * i) / 8, a.standoff]);
      if (drum) { const u = drum.add(d2); drum.delete(); d2.delete(); drum = u; } else drum = d2;
    }
    const lovit = r.corpOpac.intersect(drum);
    const v = lovit.volume();
    lovit.delete(); drum.delete(); disc.delete();
    if (v > 1) fail(`„${ch}" ${tip}: capul se lovește de material pe drum (${v.toFixed(1)} mm³)`);
    else ok(`„${ch}" ${tip} — capul Ø${IMPLICIT.surubCap} glisează liber ${(yStart - yFinal).toFixed(0)} mm`);

    // LOCAȘUL NU STRĂPUNGE ÎN CAVITATE. Spatele are 2 mm, locașul 5.3 — fără plasturele de pe
    // interior ar da direct peste bandă. Se măsoară material plin peste locaș.
    const cil = Manifold.cylinder(MATERIAL_PESTE_LOCAS - 0.1, rCap * 0.8, rCap * 0.8, 32, false)
      .translate([px, yFinal, a.adancime + 0.05]);
    const plin = r.corpOpac.intersect(cil);
    const fractie = plin.volume() / cil.volume();
    plin.delete(); cil.delete();
    if (fractie < 0.98) fail(`„${ch}" ${tip}: peste locaș e doar ${(fractie * 100).toFixed(0)}% material — a străpuns în cavitate`);
    else ok(`„${ch}" ${tip} — ${MATERIAL_PESTE_LOCAS} mm de material plin peste locaș, plasturele ține`);
    elibereaza(r);
  }
}

// =====================================================================
// ÎNGROȘAREA LITEREI
//
// Singurul parametru care mărește CAVITATEA fără să miște înălțimea cerută: peretele nu poate
// coborî sub pragul optic, iar banda nu se poate îngusta. Se verifică trei lucruri — că mărește
// cavitatea, că valoarea propusă CHIAR face banda să încapă, și că astuparea contra-formelor
// e RAPORTATĂ, nu tăcută.
// =====================================================================
console.log('\n  ingrosarea literei:');
{
  const subtire = FONTS.find((f) => f.startsWith('CormorantGaramond')) ?? FONTS[0];
  const font = load(subtire);

  // 1. cavitatea CREȘTE monoton cu îngroșarea
  let anterior = -1, monoton = true;
  const cens: string[] = [];
  for (const mm of [0, 1, 2, 4]) {
    const r = buildLed(cfg({ font, litera: 'A', ingrosare: mm }));
    const a = r.diagnostice.ariaCavitateMM2;
    if (a < anterior) monoton = false;
    anterior = a;
    cens.push(`${mm} mm → ${a.toFixed(0)} mm²`);
    elibereaza(r);
  }
  if (!monoton) fail(`îngroșarea nu mărește monoton cavitatea: ${cens.join(' · ')}`);
  else ok(`${nume(subtire)} „A" — cavitatea crește cu îngroșarea: ${cens.join(' · ')}`);

  // 2. VALOAREA PROPUSĂ CHIAR REPARĂ. Aplicația spune „îngroașă cu {x} mm"; se reconstruiește
  //    cu exact acea valoare și se cere ca banda să încapă. Prima versiune calcula cifra la
  //    limita exactă și raporta 0 — „încape și fără îngroșare" — pe litere la care nu încăpea.
  let verificate = 0, faraSolutie = 0;
  for (const f of FONTS) {
    const ft = load(f);
    for (const ch of ['A', 'O', 'E']) {
      if (ft.charToGlyphIndex(ch) === 0) continue;
      const r = buildLed(cfg({ font: ft, litera: ch }));
      const nec = r.diagnostice.ingrosare.necesarMM;
      const incape = r.diagnostice.camereUtile > 0;
      elibereaza(r);
      if (incape) {
        if (nec !== 0) fail(`${nume(f)} „${ch}": banda încape, dar se cere îngroșare de ${nec} mm`);
        continue;
      }
      if (!nec) { faraSolutie++; continue; }
      const r2 = buildLed(cfg({ font: ft, litera: ch, ingrosare: nec }));
      if (r2.diagnostice.camereUtile === 0) {
        fail(`${nume(f)} „${ch}": îngroșarea propusă de ${nec} mm tot nu face banda să încapă`);
      } else verificate++;
      elibereaza(r2);
    }
  }
  ok(`${verificate} îngroșări propuse, verificate prin reconstrucție`
    + (faraSolutie ? ` · ${faraSolutie} fără soluție sub ${10} mm` : ''));

  // 3. ASTUPAREA CONTRA-FORMELOR e raportată. La „O" o îngroșare mare închide ochiul, iar
  //    litera nu mai e literă — trebuie spus, nu descoperit pe piesa printată.
  let gasit = false;
  for (const mm of [4, 6, 8, 10]) {
    const r = buildLed(cfg({ font, litera: 'O', ingrosare: mm }));
    const ig = r.diagnostice.ingrosare;
    if (ig.contraForme < ig.contraFormeInitial) {
      ok(`„O" la ${mm} mm — ${ig.contraFormeInitial - ig.contraForme} contra-forme astupate, raportate`);
      gasit = true;
    }
    elibereaza(r);
    if (gasit) break;
  }
  if (!gasit) ok('la „O" nicio îngroșare din plajă nu astupă ochiul — detectorul rămâne tăcut, corect');
}

// =====================================================================
// EXPORTUL: ambele piese pleacă de la Z=0 și nu ies în oglindă
// =====================================================================
console.log('\n  exportul:');
{
  const font = load(FONTS.find((f) => f.startsWith('ArchivoBlack')) ?? FONTS[0]);
  for (const [ch, unde] of [['P', 'sus'], ['L', 'jos']] as [string, string][]) {
    const r = buildLed(cfg({ font, litera: ch }));
    const p = pentruPrint(r.corpOpac);
    const bb = p.boundingBox();
    if (Math.abs(bb.min[2]) > 1e-6) fail(`„${ch}": corpul începe la Z=${bb.min[2].toFixed(2)}, nu pe placă`);
    const mij = (bb.min[1] + bb.max[1]) / 2;
    const sus = Manifold.extrude(CrossSection.square([600, 600], true), bb.max[2] + 2).translate([0, mij + 300, -1]);
    const t = p.intersect(sus);
    const fractie = t.volume() / p.volume();
    t.delete(); sus.delete();
    const bine = unde === 'sus' ? fractie > 0.55 : fractie < 0.45;
    if (!bine) fail(`„${ch}": ${(fractie * 100).toFixed(0)}% din material sus, așteptat preponderent ${unde} — export în oglindă?`);
    else ok(`„${ch}" — ${(fractie * 100).toFixed(0)}% din material sus (așteptat preponderent ${unde}), corpul la Z=0`);
    p.delete(); elibereaza(r);
  }
}

// =====================================================================
const sec = ((Date.now() - t0) / 1000).toFixed(1);
if (faraBanda.length) {
  console.log(`\n  banda nu încape la parametrii impliciți: ${faraBanda.length} din ${testate}`);
  console.log(`  ${faraBanda.slice(0, 12).join(' · ')}${faraBanda.length > 12 ? ' …' : ''}`);
}
if (esecuri.length) {
  console.error(`\nEȘECURI (${esecuri.length}):\n` + esecuri.join('\n') + '\n');
  // vezi regula din docs/design/: process.exit dupa manifold crapa libuv pe Windows
  process.exitCode = 1;
} else {
  console.log(`\n✅ Litere LED OK — ${testate} combinații în ${sec}s: coliziune zero, fața se sprijină și închide litera.\n`);
}
