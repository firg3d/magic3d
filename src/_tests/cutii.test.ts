/**
 * TEST PERMANENT — CUTII LITERE
 *
 * Verificările din docs/plan-cutii-litere.md, ca aserțiuni:
 *
 *   1. INTERIOR UTILIZABIL — nu gol, nu fragmentat, iar când nu iese, MESAJUL E ADEVĂRAT:
 *      valorile propuse omului (perete maxim, înălțime minimă) chiar produc o cutie.
 *   2. GROSIME MINIMĂ ≥ 2 extrudări (0.85 mm) pe peretele final.
 *   3. CONECTIVITATE — numărul de componente conexe rămâne cel al literei.
 *   4. ETANȘEITATE — cutia e închisă: fundul plin pe toată silueta, gura deschisă pe toată
 *      cavitatea, iar volumul solidului se potrivește cu cel calculat din arii.
 *   5. ÎNCAPE PE PLACĂ — cutiile sunt piesele cele mai mari din proiect.
 *   6. ALFABET — toate literele × toate fonturile.
 *   7. Exportul nu iese în oglindă și pleacă cu fundul pe placă.
 *
 * DE CE NU GENUS. Cutia creează goluri PRIN PROIECT: fiecare cameră adaugă unul, iar la „A" sau
 * „O" canalul inelar adaugă încă unul. Invariantul de genus (cel folosit în goluri.test.ts, unde
 * are sens) ar da aici numai eșecuri false. Invariantul corect e numărul de componente conexe —
 * aceeași concluzie la care s-a ajuns și la Litere Fagure.
 *
 * Rulare:  npm run test:cutii
 *          npx tsx src/_tests/cutii.test.ts Baloo Cinzel     (doar câteva fonturi, pentru iterat)
 * Iese cu cod 1 la orice verificare picată.
 */
// @ts-ignore — opentype.js nu are declarații de tip (ca în restul proiectului)
import opentype from 'opentype.js';
import ManifoldModule from 'manifold-3d';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { configureManifold, buildCutie, pentruPrint, evalueazaFont, ABATERE_MAX, CAMERA_LATIME_MIN, FANTA_MIN,
  PATA_MAX, TRASATURA_MIN, PERETE_MIN, INALTIME_MIN, INALTIME_MAX, MATERIAL_PESTE_LOCAS,
  type CutiiConfig } from '../apps/cutii/cutii.js';
import { conturCheie, conturGrila } from '../core/geometry/agatare.js';
import { TIPARE } from '../core/geometry/tipare.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FONT_DIR = join(ROOT, 'public', 'fonts');

const filtru = process.argv.slice(2);
const FONTS = readdirSync(FONT_DIR)
  .filter((f) => /\.(ttf|otf)$/i.test(f))
  .filter((f) => !filtru.length || filtru.some((q) => f.toLowerCase().includes(q.toLowerCase())))
  .sort();
/** exact ce se poate alege din panou */
const CARACTERE = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'];
/** parametrii IMPLICIȚI ai aplicației — testul apără configurația cu care se deschide */
const IMPLICIT = { inaltimeLitera: 120, adancime: 60, grosimePerete: 2.5, grosimeFund: 2,
  tipAgatare: 'fara' as const, surubCap: 5, surubTija: 2.5, latimeGrila: 20, inaltimeCapSurub: 3,
  modelFund: 'fara' as const, pasFund: 8, pereteFund: 1.6, unghiFund: 0, variantaFund: 1, ramaFund: 2,
  traforPereti: false, formaGol: 'hexagon' as const, deschidere: 14, nervura: 2.5, bandaJos: 10, buzaSus: 6 };
/**
 * Placa STANDARD (256 mm, A1/P1S/X1C) — cutiile sunt piesele cele mai mari din proiect, deci
 * la ele verificarea e regula, nu excepția.
 *
 * NU se măsoară față de placa mini de 180 mm, deși prima versiune a testului o făcea și pica pe
 * două cazuri: Cinzel Decorative „W" iese 208×191 mm și Great Vibes „J" 214×190 mm, la 120 mm
 * înălțime de capital. Sunt piese legitime — fonturile decorative au fiorituri late — iar placa
 * mini e o alegere a utilizatorului, pentru care nucleul dă deja avertisment la export. Un test
 * pe 180 ar fi cerut aplicației să refuze produse bune.
 */
const PLACA = 256;
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
const { Manifold, CrossSection } = wasm;

const cfg = (over: Partial<CutiiConfig> & { font: any; litera: string }): CutiiConfig =>
  ({ ...IMPLICIT, ...over });

/**
 * Volumul solidului într-o felie orizontală [z0, z1], pe toată întinderea lui XY.
 * Așa se verifică fundul (trebuie plin) și gura (trebuie deschisă) fără să se presupună nimic
 * despre cum a fost construită piesa: se măsoară solidul final.
 */
function volumFelie(corp: any, z0: number, z1: number): number {
  const bb = corp.boundingBox();
  const w = bb.max[0] - bb.min[0] + 10, h = bb.max[1] - bb.min[1] + 10;
  const felie = Manifold.extrude(CrossSection.square([w, h], true), z1 - z0)
    .translate([(bb.min[0] + bb.max[0]) / 2, (bb.min[1] + bb.max[1]) / 2, z0]);
  const t = corp.intersect(felie);
  const v = t.volume();
  felie.delete(); t.delete();
  return v;
}

/**
 * Același lucru, dar limitat la o formă 2D: cât material are solidul între z0 și z1, DOAR sub
 * masca dată. Așa se întreabă „locașul e chiar gol?" și „peste el chiar a rămas material?",
 * fără să se creadă pe cuvânt formula de volum.
 */
function volumFelieMascata(corp: any, masca: any, z0: number, z1: number): number {
  const felie = Manifold.extrude(masca, z1 - z0).translate([0, 0, z0]);
  const t = corp.intersect(felie);
  const v = t.volume();
  felie.delete(); t.delete();
  return v;
}

/** conturul sistemului de agățare, așezat în pozițiile găsite — RECONSTRUIT, nu împrumutat */
function formaAgatarePlasata(tip: 'cheie' | 'grila', pozitii: [number, number][], c: typeof IMPLICIT): any {
  const inele = tip === 'cheie'
    ? conturCheie(c.surubCap / 2, c.surubTija / 2, c.surubCap)
    : conturGrila(c.latimeGrila, 8, 2, 6);
  let out: any = null;
  for (const p of pozitii) {
    const cs = new CrossSection(inele, 'Positive');
    const t = cs.translate(p); cs.delete();
    if (out) { const u = out.add(t); out.delete(); t.delete(); out = u; } else out = t;
  }
  return out;
}

console.log(`\nTEST CUTII LITERE — ${FONTS.length} fonturi × ${CARACTERE.length} caractere`);
console.log(`(literă ${IMPLICIT.inaltimeLitera} mm · adâncime ${IMPLICIT.adancime} mm · perete ${IMPLICIT.grosimePerete} mm · fund ${IMPLICIT.grosimeFund} mm)`);

const t0 = Date.now();
let testate = 0;
/** censul literelor la care nu iese cutie la parametrii impliciți (nu e defect: e diagnostic) */
const faraCutie: string[] = [];
/** cazuri pe care se verifică apoi că SFATUL dat omului e adevărat */
const deReparat: { f: string; ch: string; font: any }[] = [];
/** censul pieselor care depășesc placa la înălțimea implicită (diagnostic, nu defect) */
const pestePlaca: string[] = [];

// =====================================================================
// MĂTURAREA: alfabetul întreg × toate fonturile, la parametrii impliciți
// =====================================================================
{
  const stat = { volumMin: Infinity, volumMax: 0, abatereMax: 0, abatereK: '', ms: 0, msK: '', tri: 0, fante: 0,
    latura: 0, laturaK: '' };
  for (const f of FONTS) {
    const font = load(f);
    const rand: string[] = [];
    for (const ch of CARACTERE) {
      if (font.charToGlyphIndex(ch) === 0) { rand.push('·'); continue; }
      testate++;
      const eticheta = `${nume(f)} „${ch}"`;
      let r;
      try {
        r = buildCutie(cfg({ font, litera: ch }));
      } catch (e: any) { fail(`${eticheta}: buildCutie a aruncat — ${e?.message ?? e}`); rand.push('E'); continue; }
      const d = r.diagnostice;
      let bun = true;

      // ---- 6: glifa produce geometrie
      if (d.glifeLipsa.length) { fail(`${eticheta}: glifă fără geometrie`); bun = false; }

      // ---- 3: CONECTIVITATE — tot atâtea bucăți câte are litera în sine. NU genus.
      if (d.bucati !== d.bucatiLitera) {
        fail(`${eticheta}: ${d.bucati} bucăți, litera are ${d.bucatiLitera} — cutia s-a rupt`); bun = false;
      }
      // componentele solidului trebuie să fie ACELEAȘI cu cele numărate în 2D
      const parti = r.corpCutie.decompose();
      if (parti.length !== d.bucati) { fail(`${eticheta}: solidul are ${parti.length} bucăți, diagnosticul ${d.bucati}`); bun = false; }
      for (const p of parti) p.delete();

      // ---- 4: ETANȘEITATE prin volum (cifra vine din arii, nu din mesh)
      if (d.etanseitate.abatere > ABATERE_MAX) {
        fail(`${eticheta}: volum ${d.etanseitate.volumMasuratMM3} mm³, așteptat ${d.etanseitate.volumAsteptatMM3} (abatere ${(d.etanseitate.abatere * 100).toFixed(3)}%)`);
        bun = false;
      }
      if (d.etanseitate.abatere > stat.abatereMax) { stat.abatereMax = d.etanseitate.abatere; stat.abatereK = eticheta; }

      // ---- 5: ÎNCAPE PE PLACĂ
      const bb = r.corpCutie.boundingBox();
      const [dx, dy] = [bb.max[0] - bb.min[0], bb.max[1] - bb.min[1]];
      // AMÂNDOUĂ laturile trebuie să încapă: aranjarea din nucleu așază piesele cu axele
      // paralele cu placa, deci o piesă de 268×150 nu se salvează prin rotire pe o placă de 256.
      const latura = Math.max(dx, dy);
      if (latura > PLACA) {
        // Nu e defect în sine — o „K" de Alex Brush la 120 mm de capital are fiorituri de 27 cm,
        // și e o piesă legitimă, doar prea mare pentru placă. Ce TREBUIE să fie adevărat e că
        // există o înălțime în plaja panoului la care încape; altfel litera n-ar fi generabilă
        // deloc, iar aplicația ar oferi o combinație moartă. Nucleul avertizează la export.
        const hIncape = (IMPLICIT.inaltimeLitera * PLACA) / latura;
        if (hIncape < INALTIME_MIN) {
          fail(`${eticheta}: ${dx.toFixed(0)}×${dy.toFixed(0)} mm — nu încape pe placa de ${PLACA} mm nici la înălțimea minimă de ${INALTIME_MIN} mm`);
          bun = false;
        } else pestePlaca.push(`${eticheta} ${dx.toFixed(0)}×${dy.toFixed(0)} (încape sub ${Math.floor(hIncape)} mm)`);
      }
      if (latura > stat.latura) { stat.latura = latura; stat.laturaK = `${eticheta} ${dx.toFixed(0)}×${dy.toFixed(0)}`; }

      // ---- 1: interiorul — volumul raportat trebuie să fie chiar suma camerelor utile
      const sumaUtile = +d.camere.filter((c) => c.utila).reduce((s, c) => s + c.volumML, 0).toFixed(1);
      if (Math.abs(sumaUtile - d.volumUtilML) > 0.15) {
        fail(`${eticheta}: volum util ${d.volumUtilML} ml, dar camerele utile dau ${sumaUtile}`); bun = false;
      }
      if (d.camereUtile === 0) {
        faraCutie.push(eticheta);
        if (!d.reparatie) { fail(`${eticheta}: nu iese cutie, dar nu s-a calculat nicio reparație`); bun = false; }
        else if (deReparat.length < 40) deReparat.push({ f, ch, font });
      } else {
        if (d.volumUtilML <= 0) { fail(`${eticheta}: ${d.camereUtile} camere utile, dar volum util 0 ml`); bun = false; }
        if (d.reparatie) { fail(`${eticheta}: cutia iese, dar s-a calculat o reparație degeaba`); bun = false; }
        stat.volumMin = Math.min(stat.volumMin, d.volumUtilML);
        stat.volumMax = Math.max(stat.volumMax, d.volumUtilML);
      }

      // ---- 2: material sub pragul printabil — la fonturile GROASE detectorul trebuie să tacă
      if (GROASE.some((g) => f.startsWith(g)) && d.trasaturi.ariaMaxMM2 > PATA_MAX) {
        fail(`${eticheta}: font gros, dar ${d.trasaturi.ariaMaxMM2} mm² de material sub ${TRASATURA_MIN} mm`); bun = false;
      }

      stat.fante += d.fanteUmplute;
      stat.tri = Math.max(stat.tri, d.triunghiuri);
      if (r.ms > stat.ms) { stat.ms = r.ms; stat.msK = eticheta; }
      r.corpCutie.delete();
      rand.push(bun ? (d.camereUtile ? '✓' : 'p') : '✗');
    }
    console.log(`  ${nume(f).padEnd(20)} ${rand.join('')}`);
  }
  console.log(`\n  legendă: ✓ cutie · p fără interior utilizabil (diagnostic, nu defect) · ✗ EȘEC · E eroare · · glifă inexistentă`);
  console.log(`  volum util ${stat.volumMin.toFixed(0)}–${stat.volumMax.toFixed(0)} ml · ${stat.fante} fante sub ${FANTA_MIN} mm umplute la loc`);
  console.log(`  abatere maximă de etanșeitate ${(stat.abatereMax * 100).toExponential(1)}% (${stat.abatereK}), prag ${(ABATERE_MAX * 100).toFixed(1)}%`);
  console.log(`  cea mai mare piesă ${stat.laturaK} mm, pe placa de ${PLACA} mm`);
  console.log(`  cel mai scump ${stat.msK} ${stat.ms.toFixed(0)} ms · mesh maxim ${stat.tri.toLocaleString('en-US')} triunghiuri`);
}

// =====================================================================
// FUNDUL PLIN ȘI GURA DESCHISĂ — măsurate pe SOLID, nu presupuse din construcție
// =====================================================================
console.log('\n  fundul plin, gura deschisă:');
{
  for (const [f, ch] of [['ArchivoBlack-Regular.ttf', 'A'], ['ArchivoBlack-Regular.ttf', 'O'], ['Baloo2-Regular.ttf', 'B']] as [string, string][]) {
    if (!FONTS.includes(f)) continue;
    const r = buildCutie(cfg({ font: load(f), litera: ch }));
    const d = r.diagnostice;
    const Gf = IMPLICIT.grosimeFund, H = IMPLICIT.adancime;
    // FUNDUL: o felie din interiorul lui trebuie să fie plină pe TOATĂ silueta
    const vFund = volumFelie(r.corpCutie, 0.1, Gf - 0.1);
    const asteptatFund = d.ariaPlinaMM2 * (Gf - 0.2);
    if (Math.abs(vFund - asteptatFund) / asteptatFund > 1e-3) {
      fail(`${nume(f)} „${ch}": fundul nu e plin — ${vFund.toFixed(0)} mm³ în felie, așteptat ${asteptatFund.toFixed(0)}`);
    } else ok(`${nume(f)} „${ch}" — fund plin pe toată silueta (${d.ariaPlinaMM2} mm² × ${Gf} mm)`);
    // GURA: chiar sub buză, materialul trebuie să fie doar inelul de perete
    const vGura = volumFelie(r.corpCutie, Gf + H - 1, Gf + H);
    const asteptatGura = d.ariaPlinaMM2 - d.ariaCavitateMM2;
    if (Math.abs(vGura - asteptatGura) / asteptatGura > 1e-3) {
      fail(`${nume(f)} „${ch}": gura nu e deschisă — ${vGura.toFixed(0)} mm³ în felie, așteptat ${asteptatGura.toFixed(0)}`);
    } else ok(`${nume(f)} „${ch}" — gura deschisă pe ${d.ariaCavitateMM2} mm², perete ${asteptatGura.toFixed(0)} mm²`);
    r.corpCutie.delete();
  }
}

// =====================================================================
// SFATUL DAT OMULUI E ADEVĂRAT
//
// Verificarea care contează cel mai mult din tot fișierul: bara de stare spune „subțiază
// peretele la cel mult X" sau „mărește litera la cel puțin Y". Dacă valorile alea nu produc
// chiar o cutie, aplicația minte cu cifre, ceea ce e mai rău decât un mesaj generic.
// =====================================================================
console.log('\n  reparațiile propuse chiar repară:');
{
  let verificatePerete = 0, verificateInaltime = 0, imposibile = 0;
  for (const { f, ch, font } of deReparat) {
    const r = buildCutie(cfg({ font, litera: ch }));
    const rp = r.diagnostice.reparatie!;
    r.corpCutie.delete();
    if (rp.potPerete) {
      const r2 = buildCutie(cfg({ font, litera: ch, grosimePerete: rp.peretMaxMM }));
      if (r2.diagnostice.camereUtile === 0) {
        fail(`${nume(f)} „${ch}": sfatul „perete ≤ ${rp.peretMaxMM} mm" nu dă cutie`);
      } else verificatePerete++;
      r2.corpCutie.delete();
    }
    if (rp.potInaltime) {
      const r2 = buildCutie(cfg({ font, litera: ch, inaltimeLitera: rp.inaltimeMinMM }));
      if (r2.diagnostice.camereUtile === 0) {
        fail(`${nume(f)} „${ch}": sfatul „literă ≥ ${rp.inaltimeMinMM} mm" nu dă cutie`);
      } else verificateInaltime++;
      r2.corpCutie.delete();
    }
    if (!rp.potPerete && !rp.potInaltime) imposibile++;
  }
  ok(`${verificatePerete} sfaturi de perete și ${verificateInaltime} de înălțime, verificate prin reconstrucție`);
  if (imposibile) ok(`${imposibile} cazuri fără remediu în limitele panoului (perete ≥ ${PERETE_MIN} mm, literă ≤ ${INALTIME_MAX} mm) — acolo se cere alt font`);
}

// =====================================================================
// DETECTORUL DE CAMERĂ E MONOTON ȘI ARE AMBELE CAPETE
//
// Invariantul real nu e „comută pe un interval ales de mine" — prima versiune a testului cerea
// asta pe „A" la Archivo Black și pica, fiindcă fontul e atât de gros încât are cameră și la
// peretele maxim. Invariantul e MONOTONIA: o literă mai mare nu poate PIERDE camera. Fontul pe
// care se măsoară se alege din date, nu din presupunere: primul care n-are cameră la înălțimea
// minimă și are la cea maximă.
// =====================================================================
console.log('\n  detectorul de cameră:');
{
  const candidat = FONTS.map((f) => ({ f, font: load(f) })).find(({ font }) => {
    const jos = buildCutie(cfg({ font, litera: 'A', inaltimeLitera: 60 }));
    const sus = buildCutie(cfg({ font, litera: 'A', inaltimeLitera: 300 }));
    const bun = jos.diagnostice.camereUtile === 0 && sus.diagnostice.camereUtile > 0;
    jos.corpCutie.delete(); sus.corpCutie.delete();
    return bun;
  });
  if (!candidat) {
    console.log(`    – niciun font din selecție nu traversează pragul între 60 și 300 mm; verificarea are nevoie de unul subțire`);
  } else {
    const serie: boolean[] = [];
    for (let h = 60; h <= 300; h += 20) {
      const r = buildCutie(cfg({ font: candidat.font, litera: 'A', inaltimeLitera: h }));
      serie.push(r.diagnostice.camereUtile > 0);
      r.corpCutie.delete();
    }
    const comutari = serie.reduce((n, v, i) => n + (i && v !== serie[i - 1] ? 1 : 0), 0);
    if (comutari !== 1) fail(`la ${nume(candidat.f)} „A", detectorul comută de ${comutari} ori cu înălțimea (așteptat exact 1: camera nu se poate pierde mărind litera)`);
    else ok(`${nume(candidat.f)} „A" — detectorul comută o singură dată între 60 și 300 mm, și doar în sus`);
  }
  // o cameră lată trebuie declarată utilă
  const gros = load(FONTS.find((f) => f.startsWith('ArchivoBlack')) ?? FONTS[0]);
  const lat = buildCutie(cfg({ font: gros, litera: 'O', inaltimeLitera: 200, grosimePerete: PERETE_MIN }));
  if (!lat.diagnostice.camereUtile) fail(`„O" la 200 mm cu perete ${PERETE_MIN} mm ar trebui să aibă cameră`);
  else ok(`„O" la 200 mm — ${lat.diagnostice.volumUtilML} ml, camera peste pragul de ${CAMERA_LATIME_MIN} mm`);
  lat.corpCutie.delete();
}

// =====================================================================
// TRAFORAREA PEREȚILOR
//
// Golurile sunt pentru vegetație, deci trebuie să fie MARI și să treacă chiar prin perete. Ce
// se verifică nu e că apar goluri, ci trei lucruri pe care ochiul nu le vede în viewport:
// banda de jos și buza rămân ÎNTREGI, golurile chiar STRĂPUNG (nu sunt scobituri), iar piesa
// nu se rupe în bucăți.
// =====================================================================
console.log('\n  traforarea pereților:');
{
  const font = load(FONTS.find((f) => f.startsWith('ArchivoBlack')) ?? FONTS[0]);
  const Gf = IMPLICIT.grosimeFund, H = IMPLICIT.adancime;
  for (const forma of ['hexagon', 'rotund', 'dreptunghi'] as const) {
    const plin = buildCutie(cfg({ font, litera: 'A' }));
    const perete0 = volumFelie(plin.corpCutie, Gf + IMPLICIT.bandaJos / 2, Gf + IMPLICIT.bandaJos / 2 + 1);
    const buza0 = volumFelie(plin.corpCutie, Gf + H - IMPLICIT.buzaSus / 2, Gf + H - IMPLICIT.buzaSus / 2 + 1);
    plin.corpCutie.delete();

    const r = buildCutie(cfg({ font, litera: 'A', traforPereti: true, formaGol: forma }));
    const d = r.diagnostice, tf = d.trafor;
    if (!tf.randuri) { fail(`trafor „${forma}": niciun rând la 60 mm adâncime`); r.corpCutie.delete(); continue; }

    // 1. BANDA DE JOS ȘI BUZA rămân întregi — acolo se concentrează efortul
    const banda = volumFelie(r.corpCutie, Gf + IMPLICIT.bandaJos / 2, Gf + IMPLICIT.bandaJos / 2 + 1);
    const buza = volumFelie(r.corpCutie, Gf + H - IMPLICIT.buzaSus / 2, Gf + H - IMPLICIT.buzaSus / 2 + 1);
    if (Math.abs(banda - perete0) / perete0 > 1e-4) fail(`trafor „${forma}": banda de jos a fost tăiată (${banda.toFixed(0)} față de ${perete0.toFixed(0)} mm³)`);
    if (Math.abs(buza - buza0) / buza0 > 1e-4) fail(`trafor „${forma}": buza de sus a fost tăiată (${buza.toFixed(0)} față de ${buza0.toFixed(0)} mm³)`);

    // 2. GOLURILE STRĂPUNG: la mijlocul primului rând, peretele are mai puțin material
    const zMij = Gf + IMPLICIT.bandaJos + (H - IMPLICIT.bandaJos - IMPLICIT.buzaSus) / 4;
    const cuGol = volumFelie(r.corpCutie, zMij, zMij + 1);
    if (cuGol >= perete0 * 0.98) fail(`trafor „${forma}": la mijlocul rândului peretele e neatins (${cuGol.toFixed(0)} din ${perete0.toFixed(0)} mm³) — golurile nu străpung`);

    // 3. CONECTIVITATE și volum
    if (d.bucati !== d.bucatiLitera) fail(`trafor „${forma}": ${d.bucati} bucăți, litera are ${d.bucatiLitera}`);
    if (d.etanseitate.abatere > ABATERE_MAX) fail(`trafor „${forma}": abatere de volum ${(d.etanseitate.abatere * 100).toFixed(3)}%`);
    ok(`„${forma}" — ${tf.randuri} rânduri × ${tf.peRand} goluri, ${(tf.volumMM3 / 1000).toFixed(1)} cm³ scoși`
      + ` · perete la mijloc ${(100 - (cuGol / perete0) * 100).toFixed(0)}% străpuns · bandă și buză întregi`);
    r.corpCutie.delete();
  }

  // adâncimea decide câte rânduri intră — relația din care s-a pornit tot capitolul
  const cens: string[] = [];
  for (const adancime of [30, 60, 100, 150]) {
    const r = buildCutie(cfg({ font, litera: 'A', adancime, traforPereti: true }));
    cens.push(`${adancime} mm → ${r.diagnostice.trafor.randuri} rânduri`);
    if (adancime >= 60 && !r.diagnostice.trafor.randuri) fail(`la ${adancime} mm adâncime n-a intrat niciun rând`);
    r.corpCutie.delete();
  }
  ok(`adâncimea decide: ${cens.join(' · ')}`);

  // toate literele, cu trafor: conectivitatea și NERVURA sunt verificările centrale
  let rupte = 0, faraRand = 0, testateT = 0, nervuraMin = Infinity, nervuraK = '';
  for (const ch of CARACTERE) {
    testateT++;
    const r = buildCutie(cfg({ font, litera: ch, traforPereti: true }));
    const d = r.diagnostice, tf = d.trafor;
    if (d.bucati !== d.bucatiLitera) { fail(`trafor „${ch}": ${d.bucati} bucăți, litera are ${d.bucatiLitera}`); rupte++; }
    if (d.etanseitate.abatere > ABATERE_MAX) fail(`trafor „${ch}": abatere de volum ${(d.etanseitate.abatere * 100).toFixed(3)}%`);
    if (!tf.randuri) faraRand++;
    else {
      // NERVURA MĂSURATĂ pe secțiune, nu dedusă din pas. La parametrii impliciți nicio literă
      // n-are voie să iasă cu nervuri sub prag: acolo piesa se rupe în mână, plină cu material
      // umed. Fără eliminarea cioturilor de capăt, „A" ieșea cu 0.46 mm.
      if (tf.nervuraMinMM < IMPLICIT.nervura - 0.05) {
        fail(`trafor „${ch}": nervura cea mai îngustă ${tf.nervuraMinMM} mm, sub cei ${IMPLICIT.nervura} mm ceruți`);
      }
      if (tf.nervuraMinMM < nervuraMin) { nervuraMin = tf.nervuraMinMM; nervuraK = ch; }
    }
    r.corpCutie.delete();
  }
  ok(`${testateT} caractere cu pereți traforați: ${rupte} rupte, ${faraRand} fără rând`
    + ` · nervura cea mai îngustă ${nervuraMin.toFixed(2)} mm la „${nervuraK}" (prag ${IMPLICIT.nervura})`);
}

// =====================================================================
// MODELUL DE PE FUND
//
// Fundul e o suprafață plană, deci tiparele nucleului merg direct. Ce trebuie verificat nu e
// că apar goluri — ci că golurile stau NUMAI în fund: peretele se ridică din același contur, iar
// un cutter care iese 0.2 mm peste fund ar putea ciupi din talpa lui. Se măsoară pe solid.
// =====================================================================
console.log('\n  modelul de pe fund:');
{
  const font = load(FONTS.find((f) => f.startsWith('ArchivoBlack')) ?? FONTS[0]);
  const referinta = buildCutie(cfg({ font, litera: 'A' }));
  const Gf = IMPLICIT.grosimeFund, H = IMPLICIT.adancime;
  // peretele, măsurat pe cutia cu fund plin: felia de deasupra fundului
  const perete0 = volumFelie(referinta.corpCutie, Gf + 0.5, Gf + 2.5);
  const ariiFund = new Set<number>();
  referinta.corpCutie.delete();

  for (const model of TIPARE) {
    const r = buildCutie(cfg({ font, litera: 'A', modelFund: model }));
    const d = r.diagnostice;
    if (d.ariaGolFundMM2 <= 0) { fail(`fund „${model}": nu s-a străpuns nimic`); r.corpCutie.delete(); continue; }
    ariiFund.add(+d.ariaGolFundMM2.toFixed(1));

    // 1. PERETELE E NEATINS — aceeași felie, aceeași cifră ca la fundul plin
    const perete = volumFelie(r.corpCutie, Gf + 0.5, Gf + 2.5);
    if (Math.abs(perete - perete0) / perete0 > 1e-4) {
      fail(`fund „${model}": peretele s-a schimbat, ${perete.toFixed(0)} mm³ față de ${perete0.toFixed(0)} — cutter-ul de fund a ciupit din el`);
    }
    // 2. FUNDUL CHIAR E STRĂPUNS: felia din fund pierde exact aria golurilor
    const vFund = volumFelie(r.corpCutie, 0.1, Gf - 0.1);
    const asteptat = (d.ariaPlinaMM2 - d.ariaGolFundMM2) * (Gf - 0.2);
    if (Math.abs(vFund - asteptat) / asteptat > 1e-3) {
      fail(`fund „${model}": felia de fund are ${vFund.toFixed(0)} mm³, așteptat ${asteptat.toFixed(0)}`);
    }
    // 3. CONECTIVITATE: fundul străpuns nu are voie să lase insule plutitoare
    if (d.bucati !== d.bucatiLitera) fail(`fund „${model}": ${d.bucati} bucăți, litera are ${d.bucatiLitera}`);
    if (d.etanseitate.abatere > ABATERE_MAX) fail(`fund „${model}": abatere de volum ${(d.etanseitate.abatere * 100).toFixed(3)}%`);
    if (d.fundEtans) fail(`fund „${model}": raportat etanș, deși s-au străpuns ${d.ariaGolFundMM2} mm²`);
    r.corpCutie.delete();
  }
  ok(`cele ${TIPARE.length} tipare străpung fundul fără să atingă peretele, cu conectivitatea păstrată`);
  // un tipar scăpat din dispecerizare ar desena tăcut altceva — la fel ca la Litere Fagure
  if (ariiFund.size !== TIPARE.length) {
    fail(`cele ${TIPARE.length} tipare de fund dau doar ${ariiFund.size} arii distincte — unul desenează altceva decât spune`);
  } else ok(`cele ${TIPARE.length} tipare dau ${ariiFund.size} arii străpunse diferite`);

  // plasturele de agățare ASTUPĂ modelul: altfel gaura de cheie ar cădea între celule
  const cu = buildCutie(cfg({ font, litera: 'A', modelFund: 'fagure', tipAgatare: 'cheie' }));
  const a = cu.diagnostice.agatare;
  if (!a.pozitii.length) fail('fund cu model + cheie: sistemul n-a încăput');
  else {
    const forma = formaAgatarePlasata('cheie', a.pozitii as [number, number][], IMPLICIT);
    const vPeste = volumFelieMascata(cu.corpCutie, forma, a.adancime + 0.05, a.adancime + MATERIAL_PESTE_LOCAS);
    const asteptat = forma.area() * (MATERIAL_PESTE_LOCAS - 0.05);
    if (Math.abs(vPeste - asteptat) / asteptat > 5e-3) {
      fail(`fund cu model + cheie: peste locaș ${vPeste.toFixed(0)} mm³ în loc de ${asteptat.toFixed(0)} — modelul a mâncat plasturele`);
    } else ok('fund fagure + gaură de cheie — plasturele astupă modelul, locașul rămâne în material plin');
    forma.delete();
  }
  cu.corpCutie.delete();
}

// =====================================================================
// AGĂȚAREA PE PERETE
//
// Verificarea care contează: locașul se sapă în SPATELE cutiei, iar fundul are 2 mm — deci fără
// plasturele de pe interior ar străpunge direct în cavitate, iar cutia ar curge exact pe unde
// stă pe perete. Se măsoară pe SOLID, cu felii mascate pe conturul sistemului, reconstruit aici
// din nucleu — nu se ia pe încredere formula de volum din buildCutie.
// =====================================================================
console.log('\n  agățarea pe perete:');
{
  const font = load(FONTS.find((f) => f.startsWith('ArchivoBlack')) ?? FONTS[0]);
  for (const [ch, tip] of [['A', 'cheie'], ['O', 'cheie'], ['E', 'grila'], ['B', 'grila']] as ['A', 'cheie'][]) {
    const r = buildCutie(cfg({ font, litera: ch, tipAgatare: tip }));
    const d = r.diagnostice, a = d.agatare;
    if (!a.pozitii.length) { fail(`„${ch}" ${tip}: sistemul nu a încăput, deși litera e largă`); r.corpCutie.delete(); continue; }
    const forma = formaAgatarePlasata(tip, a.pozitii as [number, number][], IMPLICIT);
    const ariaForma = forma.area();

    // 1. LOCAȘUL E GOL pe toată adâncimea lui
    const vGol = volumFelieMascata(r.corpCutie, forma, 0.2, a.adancime - 0.2);
    if (vGol > 1e-3) fail(`„${ch}" ${tip}: locașul nu e gol — ${vGol.toFixed(2)} mm³ de material în el`);

    // 2. PESTE LOCAȘ A RĂMAS MATERIAL, plin, pe toată suprafața conturului. Asta e verificarea
    //    anti-străpungere: dacă locașul ar da în cavitate, felia de deasupra ar fi goală.
    const vPeste = volumFelieMascata(r.corpCutie, forma, a.adancime + 0.05, a.adancime + MATERIAL_PESTE_LOCAS);
    const asteptat = ariaForma * (MATERIAL_PESTE_LOCAS - 0.05);
    if (Math.abs(vPeste - asteptat) / asteptat > 5e-3) {
      fail(`„${ch}" ${tip}: peste locaș ${vPeste.toFixed(0)} mm³ în loc de ${asteptat.toFixed(0)} — a străpuns în cavitate`);
    } else ok(`„${ch}" ${tip} — locaș gol pe ${a.adancime} mm, ${MATERIAL_PESTE_LOCAS} mm de material plin peste el`);

    // 3. SPATELE E PLAT: plasturele urcă pe INTERIOR, nu în spate. Prima felie trebuie să fie
    //    exact silueta minus conturul locașului — nicio umflătură care ar depărta cutia de perete.
    const bb = r.corpCutie.boundingBox();
    if (Math.abs(bb.min[2]) > 1e-6) fail(`„${ch}" ${tip}: piesa începe la Z=${bb.min[2].toFixed(2)}, nu la 0`);
    const vSpate = volumFelie(r.corpCutie, 0.02, 0.18);
    const asteptatSpate = (d.ariaPlinaMM2 - ariaForma) * 0.16;
    if (Math.abs(vSpate - asteptatSpate) / asteptatSpate > 5e-3) {
      fail(`„${ch}" ${tip}: spatele nu e plat — felia de la Z=0 are ${vSpate.toFixed(0)} mm³, așteptat ${asteptatSpate.toFixed(0)}`);
    } else ok(`„${ch}" ${tip} — spatele plat: prima felie = silueta minus locașul (${(d.ariaPlinaMM2 - ariaForma).toFixed(0)} mm²)`);

    // 4. la „cheie", FANTA e DEASUPRA cercului: invers, cutia ar cădea de pe șurub
    if (tip === 'cheie') {
      const fb = forma.bounds();
      const p0 = a.pozitii[0];
      // y crește în JOS, deci fanta (care urcă) trebuie să scoată conturul peste centrul cercului
      if (fb.min[1] >= p0[1] - 1e-6) fail(`„${ch}": fanta nu e deasupra cercului — cutia ar cădea de pe șurub`);
      else ok(`„${ch}" cheie — fanta urcă ${(p0[1] - fb.min[1]).toFixed(1)} mm peste cercul capului`);
    }
    forma.delete(); r.corpCutie.delete();
  }
}

// ---- CAPUL ȘURUBULUI CHIAR INTRĂ ȘI CHIAR GLISEAZĂ ----
//
// Verificarea care LIPSEA, și din cauza asta locașul a plecat greșit: se măsura că e gol și că
// peste el a rămas material, dar NU că primește chiar capul șurubului. Prima versiune tăia un
// singur contur la o singură adâncime, deci fanta avea lățimea TIJEI la orice adâncime — capul
// intra în cercul mare și nu mai putea gliza nicăieri. Se vedea pe piesa randată, nu în cifre.
//
// Aici capul e simulat ca solid și i se cere drumul: LIBER pe toată cursa, la nivelul lui, și
// BLOCAT de buza de la suprafață în poziția finală. Amândouă — altfel cutia fie nu se agață,
// fie se trage pur și simplu de pe șurub.
console.log('\n  capul șurubului intră, glisează și rămâne captiv:');
{
  const font = load(FONTS.find((f) => f.startsWith('ArchivoBlack')) ?? FONTS[0]);
  const rCap = IMPLICIT.surubCap / 2, hCap = IMPLICIT.inaltimeCapSurub;
  const LAT = 48;

  for (const [ch, tip] of [['A', 'cheie'], ['O', 'cheie'], ['E', 'grila']] as ['A', 'cheie'][]) {
    const r = buildCutie(cfg({ font, litera: ch, tipAgatare: tip }));
    const a = r.diagnostice.agatare;
    if (!a.pozitii.length) { fail(`„${ch}" ${tip}: sistemul nu a încăput`); r.corpCutie.delete(); continue; }
    const [px, py] = a.pozitii[0];
    // y crește în JOS, deci cutia coborâtă înseamnă șurubul urcat: y scade.
    // La „cheie" capul intră prin cercul mare, deci pleacă chiar din centrul lui și urcă o cursă.
    // La „grilă" intră oriunde pe canal, dar CENTRUL lui nu poate coborî sub marginea de jos cu
    // mai mult de o rază — altfel jumătatea de sub el ar fi în material. Termină pe muchia cu șei.
    const yStart = tip === 'cheie' ? py : py - rCap;
    const yFinal = py - (tip === 'cheie' ? IMPLICIT.surubCap : 8);

    // 1. DRUMUL CAPULUI e liber pe toată cursa, la nivelul lui: se mătură cilindrul capului din
    //    poziția de intrare în cea finală și se cere ca nimic să nu-l atingă
    const disc = Manifold.cylinder(hCap, rCap, rCap, LAT, false);
    let drum: any = null;
    for (let i = 0; i <= 8; i++) {
      const y = yStart + ((yFinal - yStart) * i) / 8;
      const d = disc.translate([px, y, a.standoff]);
      if (drum) { const u = drum.add(d); drum.delete(); d.delete(); drum = u; } else drum = d;
    }
    const lovit = r.corpCutie.intersect(drum);
    const vLovit = lovit.volume();
    lovit.delete(); drum.delete();
    if (vLovit > 1) fail(`„${ch}" ${tip}: capul se lovește de material pe drum (${vLovit.toFixed(1)} mm³) — nu poate gliza`);
    else ok(`„${ch}" ${tip} — capul Ø${IMPLICIT.surubCap} glisează liber ${(yStart - yFinal).toFixed(0)} mm, de la intrare la poziția finală`);

    // 2. BUZA îl REȚINE. Cele două sisteme rețin ALTFEL, deci se măsoară altfel:
    if (tip === 'cheie') {
      // La cheie, invariantul e că prin buză NU MAI ÎNCAPE capul: deschiderea de la suprafață
      // e fanta tijei, mai îngustă decât el. Se erodează golul de la nivelul buzei cu raza
      // capului — dacă punctul final nu supraviețuiește eroziunii, capul nu poate ieși drept.
      //
      // NU se măsoară „cât la sută din inel e plin": la orice gaură de cheie fanta taie o
      // felie din inel, iar cifra iese ~74% ORICÂT de bine ar fi făcut locașul. Prima versiune
      // a testului cerea 85% și pica pe geometrie corectă.
      const sect = r.corpCutie.slice(a.standoff / 2);
      const cutieMare = CrossSection.square([1000, 1000], true);
      const gol = cutieMare.subtract(sect);
      const incape = gol.offset(-rCap, 'Round');
      const sonda = CrossSection.circle(0.2, 16).translate([px, yFinal]);
      const comun = incape.intersect(sonda);
      const arie = comun.area();
      comun.delete(); sonda.delete(); incape.delete(); gol.delete(); cutieMare.delete(); sect.delete();
      if (arie > 1e-6) fail(`„${ch}" cheie: la nivelul buzei încă încape un cap Ø${IMPLICIT.surubCap} — cutia se trage de pe șurub`);
      else ok(`„${ch}" cheie — prin buză nu mai încape capul: în poziția finală rămâne captiv`);
    } else {
      // La grilă capul se sprijină pe muchia cu șei, deci NU e închis de jur împrejur: canalul
      // rămâne deschis sub el, exact ca la o agățătoare de tablou. Ce trebuie să fie adevărat e
      // că JUMĂTATEA LUI DE SUS stă în spatele materialului — altfel n-ar avea pe ce se sprijini.
      const semi = Manifold.cube([2 * rCap, rCap, a.standoff - 0.4], true)
        .translate([px, yFinal - rCap / 2, 0.2 + (a.standoff - 0.4) / 2]);
      const vSemi = semi.volume();
      const plin = r.corpCutie.intersect(semi);
      const fractie = plin.volume() / vSemi;
      plin.delete(); semi.delete();
      if (fractie < 0.9) fail(`„${ch}" grila: peste cap materialul de la suprafață e doar ${(fractie * 100).toFixed(0)}% — nu are pe ce se sprijini`);
      else ok(`„${ch}" grila — deasupra capului buza e ${(fractie * 100).toFixed(0)}% plină: se sprijină pe muchia cu șei`);
    }
    disc.delete(); r.corpCutie.delete();
  }
}

// ---- măturare cu agățare: conectivitate și etanșeitate rămân, pe tot alfabetul ----
{
  const fonturi = FONTS.filter((f) => ['ArchivoBlack', 'Baloo2', 'Cinzel-'].some((g) => f.startsWith(g)));
  let fara = 0, testateAg = 0, doua = 0, inclinate = 0;
  for (const f of fonturi) {
    const font = load(f);
    for (const ch of CARACTERE) {
      if (font.charToGlyphIndex(ch) === 0) continue;
      testateAg++;
      const r = buildCutie(cfg({ font, litera: ch, tipAgatare: 'cheie' }));
      const d = r.diagnostice;
      if (d.bucati !== d.bucatiLitera) fail(`${nume(f)} „${ch}" cu agățare: ${d.bucati} bucăți, litera are ${d.bucatiLitera}`);
      if (d.etanseitate.abatere > ABATERE_MAX) {
        fail(`${nume(f)} „${ch}" cu agățare: abatere de volum ${(d.etanseitate.abatere * 100).toFixed(3)}%`);
      }
      if (!d.agatare.pozitii.length) fara++;
      else if (d.agatare.pozitii.length > 1) doua++;
      else if (Math.abs(d.agatare.inclinare) >= 0.5) inclinate++;
      r.corpCutie.delete();
    }
  }
  ok(`${testateAg} combinații cu gaură de cheie: ${doua} din DOUĂ puncte simetrice, ${inclinate} înclinate, ${fara} fără loc — conectivitate și etanșeitate păstrate`);
}

// ---- și SFATUL de la agățare e adevărat: la înălțimea propusă, sistemul chiar încape ----
{
  let verificate = 0, faraSolutie = 0;
  for (const f of FONTS.filter((x) => ['Cinzel-', 'CormorantGaramond', 'PlayfairDisplay'].some((g) => x.startsWith(g)))) {
    const font = load(f);
    for (const ch of CARACTERE) {
      if (font.charToGlyphIndex(ch) === 0) continue;
      const r = buildCutie(cfg({ font, litera: ch, tipAgatare: 'cheie' }));
      const a = r.diagnostice.agatare;
      r.corpCutie.delete();
      if (a.pozitii.length) continue;
      if (!a.inaltimeMinMM) { faraSolutie++; continue; }
      const r2 = buildCutie(cfg({ font, litera: ch, tipAgatare: 'cheie', inaltimeLitera: a.inaltimeMinMM }));
      if (!r2.diagnostice.agatare.pozitii.length) {
        fail(`${nume(f)} „${ch}": sfatul „literă ≥ ${a.inaltimeMinMM} mm" nu face loc gaurii de cheie`);
      } else verificate++;
      r2.corpCutie.delete();
    }
  }
  ok(`${verificate} sfaturi de înălțime pentru agățare, verificate prin reconstrucție`
    + (faraSolutie ? ` · ${faraSolutie} fără soluție în plaja panoului (acolo se cere cap mai mic sau alt font)` : ''));
}

// =====================================================================
// FILTRAREA FONTURILOR
//
// Selectorul arată gri fonturile care nu dau cutie la configurația curentă, cu motivul măsurat.
// Se verifică două lucruri: verdictul e ACELAȘI cu ce produce buildCutie (altfel selectorul ar
// spune una și geometria alta), și înălțimea propusă chiar funcționează.
// =====================================================================
console.log('\n  filtrarea fonturilor:');
{
  let deAcord = 0, respinse = 0, verificate = 0, faraSolutie = 0;
  for (const f of FONTS) {
    const font = load(f);
    for (const ch of ['A', 'O', 'E']) {
      if (font.charToGlyphIndex(ch) === 0) continue;
      const v = evalueazaFont(font, ch, IMPLICIT.inaltimeLitera, IMPLICIT.grosimePerete);
      const r = buildCutie(cfg({ font, litera: ch }));
      const chiar = r.diagnostice.camereUtile > 0;
      r.corpCutie.delete();
      // VERDICTUL ȘI GEOMETRIA TREBUIE SĂ SPUNĂ ACELAȘI LUCRU. Sunt aceeași măsurătoare, dar
      // pe drumuri diferite — dacă se despart, selectorul minte.
      if (v.ok !== chiar) {
        fail(`${nume(f)} „${ch}": selectorul spune ${v.ok ? 'merge' : 'NU merge'}, geometria spune contrariul`);
      } else deAcord++;
      if (v.ok) continue;
      respinse++;
      if (!v.inaltimeMinMM) { faraSolutie++; continue; }
      // ÎNĂLȚIMEA PROPUSĂ CHIAR FUNCȚIONEAZĂ — același standard ca la restul sfaturilor
      const r2 = buildCutie(cfg({ font, litera: ch, inaltimeLitera: v.inaltimeMinMM }));
      if (r2.diagnostice.camereUtile === 0) {
        fail(`${nume(f)} „${ch}": motivul spune „de la ${v.inaltimeMinMM} mm merge", dar la ${v.inaltimeMinMM} mm nu iese cutie`);
      } else verificate++;
      r2.corpCutie.delete();
    }
  }
  ok(`${deAcord} verdicte, toate în acord cu geometria · ${respinse} fonturi respinse, ${verificate} înălțimi propuse verificate`
    + (faraSolutie ? ` · ${faraSolutie} fără soluție în plaja panoului` : ''));
}

// =====================================================================
// EXPORTUL: nu iese în oglindă și pleacă cu fundul pe placă
// =====================================================================
console.log('\n  exportul:');
{
  const font = load(FONTS.find((f) => f.startsWith('ArchivoBlack')) ?? FONTS[0]);
  for (const [ch, unde] of [['P', 'sus'], ['L', 'jos']] as [string, string][]) {
    const r = buildCutie(cfg({ font, litera: ch }));
    const p = pentruPrint(r.corpCutie);
    const bb = p.boundingBox();
    // FUNDUL PE PLACĂ: oglindirea e pe Y, deci nu are voie să miște Z
    if (Math.abs(bb.min[2]) > 1e-6) fail(`„${ch}": corpul de export începe la Z=${bb.min[2].toFixed(2)}, nu pe placă`);
    // material preponderent sus (P) sau jos (L): dacă oglindirea lipsește, se inversează
    const mij = (bb.min[1] + bb.max[1]) / 2;
    const sus = Manifold.extrude(CrossSection.square([500, 500], true), bb.max[2] + 2).translate([0, mij + 250, -1]);
    const t = p.intersect(sus);
    const fractie = t.volume() / p.volume();
    t.delete(); sus.delete();
    const bine = unde === 'sus' ? fractie > 0.55 : fractie < 0.45;
    if (!bine) fail(`„${ch}": ${(fractie * 100).toFixed(0)}% din material sus, așteptat preponderent ${unde} — export în oglindă?`);
    else ok(`„${ch}" — ${(fractie * 100).toFixed(0)}% din material sus (așteptat preponderent ${unde}), fundul la Z=0`);
    p.delete(); r.corpCutie.delete();
  }
}

// =====================================================================
// RAPORT
// =====================================================================
const sec = ((Date.now() - t0) / 1000).toFixed(1);
if (pestePlaca.length) {
  console.log(`\n  peste placa de ${PLACA} mm la înălțimea implicită: ${pestePlaca.length} din ${testate} (toate încap micșorând litera)`);
  console.log(`  ${pestePlaca.slice(0, 6).join(' · ')}${pestePlaca.length > 6 ? ' …' : ''}`);
}
if (faraCutie.length) {
  console.log(`\n  fără interior utilizabil la parametrii impliciți: ${faraCutie.length} din ${testate}`);
  console.log(`  ${faraCutie.slice(0, 14).join(' · ')}${faraCutie.length > 14 ? ' …' : ''}`);
}
if (esecuri.length) {
  console.error(`\nEȘECURI (${esecuri.length}):\n` + esecuri.join('\n') + '\n');
  // vezi regula din docs/design/: process.exit dupa manifold crapa libuv pe Windows
  process.exitCode = 1;
} else {
  console.log(`\n✅ Cutii Litere OK — ${testate} combinații în ${sec}s: conectivitate păstrată, cutii etanșe, fund plin, sfaturi verificate.\n`);
}
