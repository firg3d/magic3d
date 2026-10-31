/**
 * TEST PERMANENT — NUME 3D
 *
 * Verificările din docs/plan-nume-si-cuvinte.md, ca aserțiuni:
 *
 *   1. NUMELE SE GENEREAZĂ — toate numele × toate fonturile, geometrie validă, fără glife pierdute.
 *   2. LITERELE SE LEAGĂ — la fonturile cursive, bucățile în plus sunt PUNCTE, nu litere: cea mai
 *      mică bucată e cu un ordin de mărime sub cea mai mare. Măsurat, nu presupus.
 *   3. COMPONENTE CONEXE, nu genus — numele are goluri prin proiect (ochiul lui „a"), deci genus-ul
 *      nu spune nimic despre integritatea piesei.
 *   4. PLACA — când numele nu încape, înălțimea propusă TREBUIE să încapă. Sfatul se verifică
 *      reconstruind, nu se calculează la limită.
 *   5. Exportul nu iese în oglindă și pleacă de la Z=0.
 *
 * Rulare:  npm run test:nume
 *          npx tsx src/_tests/nume.test.ts GreatVibes     (doar câteva fonturi, pentru iterat)
 */
// @ts-ignore — opentype.js nu are declarații de tip (ca în restul proiectului)
import opentype from 'opentype.js';
import ManifoldModule from 'manifold-3d';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { configureManifold, buildNume as buildNumeBrut, pentruPrint, evalueazaFont, INALTIME_MIN, PAS_INALTIME,
  MARGINE_PLACA, PUNTE_MIN, RAZA_PUNTE, UNGHI_MIN, GROSIME_MIN, MATERIAL_PESTE_LOCAS,
  type NumeConfig } from '../apps/nume/nume.js';
import { instrumenteazaArena, inArena, adunaHandle, elibereaza as elibereazaArena } from '../core/geometry/arena.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FONT_DIR = join(ROOT, 'public', 'fonts');

const filtru = process.argv.slice(2);
const FONTS = readdirSync(FONT_DIR)
  .filter((f) => /\.(ttf|otf)$/i.test(f))
  .filter((f) => !filtru.length || filtru.some((q) => f.toLowerCase().includes(q.toLowerCase())))
  .sort();
/** nume reale, de lungimi diferite, cu și fără diacritice și fără litere ascendente */
const NUME = ['Ana', 'matei', 'Ianis', 'Ilinca', 'Mădălina', 'Alexandra'];
const PLACA = { w: 256, d: 256 };
/** parametrii IMPLICIȚI ai aplicației — testul apără configurația cu care se deschide */
const IMPLICIT = { inaltimeLitera: 60, grosime: 35, punti: true, latimePunte: 1.2,
  contur: "rama" as const, latimeContur: 5, netezireContur: 4, grosimeContur: 6,
  modProdus: "masa" as const, tipAgatare: "fara" as const, surubCap: 5, surubTija: 2.5,
  inaltimeCapSurub: 3, latimeGrila: 20, capac: true, grosimeCapac: 2, placa: PLACA };
/** configurația de PERETE: placa se îngroașă la comutare, exact ca în aplicație */
const PERETE = { modProdus: "perete" as const, tipAgatare: "cheie" as const, grosimeContur: 7.5 };
/** blocurile care verifică locașul din PLACĂ cer explicit varianta cu placă în spate */
const CU_PLACA = { ...PERETE, contur: "placa" as const };
/** fonturile la care literele chiar se leagă — verificat mai jos prin măsurare, nu presupus */
const CURSIVE = ['GreatVibes', 'AlexBrush', 'Allura', 'DancingScript', 'Pacifico', 'Parisienne',
  'Satisfy', 'Sacramento', 'Yellowtail'];

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
 * se elibereaza doar prin `.delete()`, GC-ul JS n-o atinge. Peste 440 de fonturi, suma umple
 * heap-ul si WASM-ul incepe sa arunce erori care nu seamana a memorie epuizata. Aceeasi clasa
 * de defect ca la litere, brelocuri, fagure si led.
 *
 * Fiecare constructie ruleaza in arena proprie; se tin ultimele patru rezultate, fiindca
 * verificarile compara cel mult doua piese deodata.
 */
const recente: any[] = [];
const buildNume: typeof buildNumeBrut = (cfg: any) => {
  const r = inArena(() => buildNumeBrut(cfg), (x) => [x]);
  recente.push(r);
  if (recente.length > 4) elibereazaArena(adunaHandle(recente.shift()));
  return r;
};


const cfg = (over: Partial<NumeConfig> & { font: any; text: string }): NumeConfig => ({ ...IMPLICIT, ...over });
/** piesa fizică: numele plus conturul. Verificările de talpă, bucăți și placă privesc ansamblul. */
const intreg = (r: { corp: any; contur: any | null }) => (r.contur ? wasm.Manifold.union([r.corp, r.contur]) : r.corp);
const elibereaza = (r: { corp: any; contur: any | null; capac?: any | null }) => {
  r.corp.delete(); r.contur?.delete(); r.capac?.delete();
};

console.log(`\nTEST NUME 3D — ${FONTS.length} fonturi × ${NUME.length} nume`);
console.log(`(literă ${IMPLICIT.inaltimeLitera} mm · grosime ${IMPLICIT.grosime} mm · placă ${PLACA.w}×${PLACA.d} mm)`);

const t0 = Date.now();
let testate = 0;
/** censul numelor care nu încap pe placă la parametrii impliciți (diagnostic, nu defect) */
let nuIncap = 0;
/** câte combinații ies dintr-o singură bucată după punți */
let intregi = 0;
let lungimeMaxPunte = 0;

// =====================================================================
// MĂTURAREA: toate numele × toate fonturile
// =====================================================================
{
  const stat = { ms: 0, msK: '', tri: 0, latMax: 0, latK: '' };
  for (const f of FONTS) {
    const font = load(f);
    const rand: string[] = [];
    for (const text of NUME) {
      testate++;
      const eticheta = `${nume(f)} „${text}"`;
      let r;
      try {
        r = buildNume(cfg({ font, text }));
      } catch (e: any) { fail(`${eticheta}: buildNume a aruncat — ${e?.message ?? e}`); rand.push('E'); continue; }
      const d = r.diagnostice;
      let bun = true;

      // ---- 1: fiecare caracter cerut trebuie să producă geometrie (dacă fontul are glifa)
      const lipsaReale = d.glifeLipsa.filter((ch) => font.charToGlyphIndex(ch) !== 0);
      if (lipsaReale.length) { fail(`${eticheta}: fontul are glifa dar nu iese geometrie: ${lipsaReale.join(' ')}`); bun = false; }

      // ---- 3: bucățile RAPORTATE trebuie să fie chiar bucățile PIESEI (nume + contur)
      const tot = intreg(r);
      const parti = tot.decompose();
      if (parti.length !== d.bucati) { fail(`${eticheta}: piesa are ${parti.length} bucăți, diagnosticul ${d.bucati}`); bun = false; }
      for (const p of parti) p.delete();
      if (d.ariiBucatiMM2.length !== d.bucatiInainte) { fail(`${eticheta}: ${d.bucatiInainte} bucăți, ${d.ariiBucatiMM2.length} arii`); bun = false; }
      // punțile ori leagă tot, ori spun cât a rămas — nu există „a mers pe jumătate" în tăcere
      if (d.bucati > 1 && d.punti.ramase === 0) {
        fail(`${eticheta}: ${d.bucati} bucăți, dar punțile raportează 0 rămase`); bun = false;
      }
      // limita e cea mai mare dintre fracțiunea din înălțime și dimensiunea bucății legate;
      // bucata cea mai mare e ancora și nu se leagă niciodată, deci plafonul e a doua ca mărime
      const plafon = Math.max(RAZA_PUNTE * IMPLICIT.inaltimeLitera, Math.sqrt(d.ariiBucatiMM2[1] ?? 0));
      if (d.punti.lungimeMaxMM > plafon + 1e-6) {
        fail(`${eticheta}: punte de ${d.punti.lungimeMaxMM} mm, peste limita de ${plafon.toFixed(1)}`); bun = false;
      }
      if (d.bucati === 1) intregi++;
      lungimeMaxPunte = Math.max(lungimeMaxPunte, d.punti.lungimeMaxMM);

      // dimensiunile raportate trebuie să fie ale solidului, nu ale configurației
      const bbN = r.corp.boundingBox();
      if (Math.abs(bbN.max[2] - bbN.min[2] - IMPLICIT.grosime) > 1e-6) {
        fail(`${eticheta}: numele are ${(bbN.max[2] - bbN.min[2]).toFixed(2)} mm grosime, cerută ${IMPLICIT.grosime}`); bun = false;
      }
      const bb = tot.boundingBox();
      // TALPA PIESEI la y = 0: numele stă pe masă (pe contur, când există), iar viewport-ul nu mai
      // are ce corecta. Cu placă în spate, literele plutesc la lățimea conturului deasupra mesei.
      if (Math.abs(bb.max[1]) > 1e-6) { fail(`${eticheta}: talpa la y=${bb.max[1].toFixed(3)}, așteptat 0`); bun = false; }
      // piesa pleacă de la z=0 (placa stă pe masă la print)
      if (Math.abs(bb.min[2]) > 1e-6) { fail(`${eticheta}: piesa pleacă de la z=${bb.min[2].toFixed(3)}, nu de la 0`); bun = false; }
      if (Math.abs(bb.max[2] - bb.min[2] - d.dim[2]) > 1e-6) {
        fail(`${eticheta}: grosime totală ${(bb.max[2] - bb.min[2]).toFixed(2)} mm, raportată ${d.dim[2]}`); bun = false;
      }

      if (!d.placa.incape) nuIncap++;
      if (d.dim[0] > stat.latMax) { stat.latMax = d.dim[0]; stat.latK = eticheta; }
      stat.tri = Math.max(stat.tri, d.triunghiuri);
      if (r.ms > stat.ms) { stat.ms = r.ms; stat.msK = eticheta; }
      if (tot !== r.corp) tot.delete();
      elibereaza(r);
      rand.push(bun ? (d.bucati > 1 ? 'b' : (d.placa.incape ? '✓' : 'p')) : '✗');
    }
    console.log(`  ${nume(f).padEnd(20)} ${rand.join('')}`);
  }
  console.log(`\n  legendă: ✓ o piesă · b rămâne în bucăți · p nu încape pe placă · ✗ EȘEC · E eroare`);
  console.log(`  o singură bucată după punți: ${intregi} din ${testate} · cea mai lungă punte ${lungimeMaxPunte.toFixed(1)} mm (limita ${(RAZA_PUNTE * IMPLICIT.inaltimeLitera).toFixed(0)})`);
  console.log(`  nu încap pe placă la ${IMPLICIT.inaltimeLitera} mm: ${nuIncap} din ${testate}`);
  console.log(`  cel mai lat ${stat.latK} ${stat.latMax.toFixed(0)} mm`);
  console.log(`  cel mai scump ${stat.msK} ${stat.ms.toFixed(0)} ms · mesh maxim ${stat.tri.toLocaleString('en-US')} triunghiuri`);
}

// =====================================================================
// LITERELE SE LEAGĂ — premisa pe care stă tot planul
//
// „La fonturi cursive literele se leagă singure, iar bucățile în plus sunt punctele de pe «i»."
// Nu e o presupunere: se verifică. Un nume de N litere care iese în N bucăți e un font la care
// NU se leagă, iar aplicația trebuie să știe diferența ca s-o poată spune.
// =====================================================================
{
  const disponibile = FONTS.filter((f) => CURSIVE.some((c) => f.startsWith(c)));
  if (!disponibile.length) console.log('\n  (fonturile cursive nu sunt în filtru — verificarea de legare, sărită)');
  else {
    console.log('\n  LITERELE SE LEAGĂ, iar punțile închid restul');
    for (const f of disponibile) {
      const font = load(f);
      const detalii: string[] = [];
      for (const text of ['matei', 'Ianis', 'Alexandra']) {
        // fără punți: literele trebuie să se lege ÎNTRE ELE, altfel premisa planului cade
        const fara = buildNume(cfg({ font, text, punti: false, contur: 'fara' }));
        const df = fara.diagnostice;
        const litere = [...text].length;
        if (df.bucati >= litere) {
          fail(`${nume(f)} „${text}": ${df.bucati} bucăți la ${litere} litere — literele NU se leagă`);
        }
        elibereaza(fara);
        // cu punți: O SINGURĂ COMPONENTĂ CONEXĂ. Verificarea centrală din plan.
        const r = buildNume(cfg({ font, text, contur: 'fara' }));
        const d = r.diagnostice;
        if (d.bucati !== 1) {
          fail(`${nume(f)} „${text}": ${d.bucati} bucăți după punți (${d.punti.punti.length} puse, ${d.punti.ramase} rămase)`);
        }
        // CE sunt bucățile în plus — cens, nu prag. Măsurat: la „matei" și „Ianis" bucata mică e sub
        // 5% din cea mare, deci chiar e punctul de pe „i". La „Alexandra" însă, la cinci fonturi
        // cursive din nouă, trece de 20% (AlexBrush 999 din 2606 mm²): acolo se desprinde o BUCATĂ
        // DE CUVÂNT, nu un punct. Un prag pe raport ar fi fost o presupunere; invariantul adevărat
        // e o singură componentă DUPĂ punți, și e chiar cel verificat mai sus.
        const proc = df.bucati > 1 ? Math.round((100 * df.ariiBucatiMM2[df.ariiBucatiMM2.length - 1]) / df.ariiBucatiMM2[0]) : 0;
        detalii.push(`${text} ${df.bucati}b${df.bucati > 1 ? `(${proc}%)` : ''}→${d.bucati}`);
        elibereaza(r);
      }
      ok(`${nume(f).padEnd(15)} ${detalii.join(' · ')}`);
    }
  }
}

// =====================================================================
// PUNȚILE CHIAR LEAGĂ — și sunt destul de groase ca să nu se rupă
//
// „Punți ≥ 2 extrudări" din plan e o cerință de rezistență: la duză de 0.4 mm asta înseamnă
// 0.8 mm, iar panoul nu are voie să coboare sub. Iar o punte care nu schimbă numărul de bucăți
// e material adăugat degeaba: se verifică pe același caz, cu punți și fără.
// =====================================================================
{
  if (PUNTE_MIN < 0.8) fail(`lățimea minimă de punte e ${PUNTE_MIN} mm, sub cele două extrudări de 0.4`);
  const f = FONTS.find((x) => x.startsWith('GreatVibes')) ?? FONTS[0];
  const font = load(f);
  const fara = buildNume(cfg({ font, text: 'matei', punti: false, contur: 'fara' }));
  const cu = buildNume(cfg({ font, text: 'matei', contur: 'fara' }));
  if (fara.diagnostice.bucati < 2) fail(`„matei" la ${nume(f)} iese deja într-o bucată — cazul nu verifică nimic`);
  if (cu.diagnostice.bucati !== 1) fail(`„matei": punțile n-au închis piesa (${cu.diagnostice.bucati} bucăți)`);
  // materialul adăugat trebuie să fie MIC: o punte, nu o placă
  const adaos = cu.corp.volume() - fara.corp.volume();
  if (adaos <= 0) fail('punțile n-au adăugat material');
  ok(`punțile leagă „matei" la ${nume(f)}: ${fara.diagnostice.bucati} bucăți → 1, cu ${(adaos / 1000).toFixed(2)} cm³ în plus (${(100 * adaos / fara.corp.volume()).toFixed(1)}% din piesă)`);
  elibereaza(fara); elibereaza(cu);
}

// =====================================================================
// VERDICTUL DE FONT — „literele nu se ating" trebuie să fie adevărat
//
// Aplicația marchează fonturile la care numele iese în tot atâtea bucăți câte litere are. Dacă
// verdictul spune una și geometria alta, omul primește un sfat pe care îl poate infirma singur.
// =====================================================================
{
  console.log('\n  VERDICTUL DE FONT — se leagă literele?');
  let respinse = 0;
  for (const f of FONTS) {
    const font = load(f);
    const v = evalueazaFont(font, 'Alexandra', IMPLICIT.inaltimeLitera);
    const r = buildNume(cfg({ font, text: 'Alexandra', punti: false, contur: 'fara' }));
    if (v.bucati !== r.diagnostice.bucati) {
      fail(`${nume(f)}: verdictul spune ${v.bucati} bucăți, geometria are ${r.diagnostice.bucati}`);
    }
    if (v.ok !== (v.bucati < v.litere && v.ramase === 0)) fail(`${nume(f)}: verdict ok=${v.ok} la ${v.bucati} bucăți / ${v.litere} litere / ${v.ramase} rămase`);
    // un font marcat BUN trebuie să lege literele ȘI la celelalte nume, nu doar la ăsta
    if (v.ok && CURSIVE.some((c) => f.startsWith(c))) {
      const alt = buildNume(cfg({ font, text: 'Ilinca', punti: false, contur: 'fara' }));
      if (alt.diagnostice.bucati >= 6) fail(`${nume(f)}: marcat bun, dar „Ilinca" iese în ${alt.diagnostice.bucati} bucăți`);
      elibereaza(alt);
    }
    if (!v.ok) respinse++;
    elibereaza(r);
  }
  ok(`${respinse} fonturi din ${FONTS.length} marcate „literele nu se ating", verificat pe geometrie`);

  // CAZUL ÎN CARE PUNȚILE NU AJUNG. Măsurat: Satisfy scrie „Mădălina" în trei blocuri, la 30.6 și
  // 35.7 mm unul de altul la o literă de 60 mm — peste orice punte rezonabilă. Verdictul trebuie
  // să spună asta ÎNAINTE, în selector, iar geometria să confirme: piesa chiar iese în bucăți.
  const fs = FONTS.find((x) => x.startsWith('Satisfy'));
  if (fs) {
    const font = load(fs);
    const v = evalueazaFont(font, 'Mădălina', IMPLICIT.inaltimeLitera);
    const r = buildNume(cfg({ font, text: 'Mădălina', contur: 'fara' }));
    if (v.ok) fail('Satisfy „Mădălina": verdict bun, deși bucățile rămân libere');
    if (v.ramase !== r.diagnostice.punti.ramase) {
      fail(`Satisfy „Mădălina": verdictul prevede ${v.ramase} bucăți libere, construcția lasă ${r.diagnostice.punti.ramase}`);
    }
    if (r.diagnostice.bucati === 1) fail('Satisfy „Mădălina": piesa iese întreagă, deci verdictul e prea aspru');
    ok(`Satisfy „Mădălina": verdictul prevede ${v.ramase} bucăți libere, construcția lasă tot ${r.diagnostice.punti.ramase} — se spune înainte, nu după print`);
    elibereaza(r);
  }
}

// =====================================================================
// STABILITATEA — sfatul trebuie să funcționeze, iar măsurătoarea să fie a fizicii
//
// „Un nume care cade nu se livrează", deci verificarea BLOCHEAZĂ exportul — iar un blocaj greșit
// e mai rău decât niciunul. Se verifică trei lucruri:
//   · marja e chiar distanța de la verticala centrului de masă la marginea sprijinului;
//   · lățimea de contur propusă chiar face piesa să stea (reconstrucție, nu formulă);
//   · o piesă declarată stabilă nu are centrul de masă în afara tălpii.
// =====================================================================
{
  console.log('\n  STABILITATEA — remediul propus chiar ține');
  let verificate = 0, cad = 0, faraRemediu = 0;
  for (const f of FONTS) {
    const font = load(f);
    for (const text of ['Ana', 'Alexandra']) {
      const r = buildNume(cfg({ font, text }));
      const s = r.diagnostice.stabilitate;
      elibereaza(r);
      // coerență: unghiul e atan(marjă / înălțimea centrului), sau 0 când centrul e în afară
      const asteptat = s.marjaMM <= 0 ? 0 : +((Math.atan(s.marjaMM / s.inaltimeCentruMM) * 180) / Math.PI).toFixed(1);
      if (Math.abs(s.unghiMinGrade - asteptat) > 0.15) {
        fail(`${nume(f)} „${text}": unghi ${s.unghiMinGrade}° la marjă ${s.marjaMM} mm și centru la ${s.inaltimeCentruMM} mm (așteptat ${asteptat}°)`);
      }
      if (s.staSingura !== (s.unghiMinGrade >= UNGHI_MIN)) {
        fail(`${nume(f)} „${text}": staSingura=${s.staSingura} la ${s.unghiMinGrade}°, pragul e ${UNGHI_MIN}°`);
      }
      if (s.staSingura) continue;
      cad++;
      if (s.remediu.fel === 'niciunul') { faraRemediu++; continue; }
      // REMEDIUL, verificat prin reconstrucție la valoarea propusă. Conturul rămâne CEL DIN
      // CONFIGURAȚIE — aplicația caută lățimea pentru varianta aleasă, iar reconstruit cu alta
      // sfatul n-ar mai fi al aceleiași piese. Excepția e `fel: 'contur'`, unde chiar nu există
      // contur și se propune pornirea lui, ca placă în spate.
      const cu = buildNume(cfg({ font, text, latimeContur: s.remediu.latimeMM,
        ...(s.remediu.fel === 'contur' ? { contur: 'placa' as const } : {}) }));
      const sc = cu.diagnostice.stabilitate;
      elibereaza(cu);
      if (!sc.staSingura) {
        fail(`${nume(f)} „${text}": propune contur de ${s.remediu.latimeMM} mm, dar acolo tot cade (${sc.unghiMinGrade}°)`);
      }
      verificate++;
    }
  }
  ok(`${cad} combinații cad la conturul implicit; ${verificate} remedii verificate prin reconstrucție, ${faraRemediu} fără remediu (font cu coadă lungă)`);

  // O PIESĂ LATĂ ȘI SUBȚIRE TREBUIE SĂ CADĂ. Fără cazul ăsta, verificarea ar putea fi mereu „da"
  // și nimeni n-ar observa: la Pacifico stă orice.
  const fg = FONTS.find((x) => x.startsWith('GreatVibes'));
  if (fg) {
    const font = load(fg);
    const subtire = buildNume(cfg({ font, text: 'Alexandra', contur: 'fara', grosime: GROSIME_MIN }));
    if (subtire.diagnostice.stabilitate.staSingura) {
      fail(`„Alexandra" la ${GROSIME_MIN} mm grosime, fără contur, e declarată stabilă — verificarea nu prinde nimic`);
    }
    ok(`„Alexandra" la ${GROSIME_MIN} mm fără contur: ${subtire.diagnostice.stabilitate.unghiMinGrade}° — cade, cum trebuie`);
    elibereaza(subtire);
  }
}

// =====================================================================
// PLACA — sfatul trebuie să funcționeze
//
// Aplicația nu spune doar „nu încape", ci „încape până la 45 mm". Cifra aia se reconstruiește
// aici și se cere să încapă cu adevărat — și, cu un pas mai sus, să NU mai încapă (altfel sfatul
// e corect dar inutil de prudent).
// =====================================================================
{
  console.log('\n  PLACA — înălțimea propusă chiar încape');
  const uw = PLACA.w - 2 * MARGINE_PLACA, ud = PLACA.d - 2 * MARGINE_PLACA;
  const incape = (w: number, h: number) => (w <= uw + 1e-6 && h <= ud + 1e-6) || (h <= uw + 1e-6 && w <= ud + 1e-6);
  let verificate = 0, prudente = 0;
  const detalii: string[] = [];
  /**
   * Cutia REALĂ a piesei, exact cum o măsoară aplicația: corpul reunit cu conturul.
   *
   * `diagnostice.dim` e rotunjit la 0.1 mm — o valoare de AFIȘAJ. Folosită într-o aserțiune de
   * încadrare, ea poate spune „încape" pentru o piesă care depășește placa cu până la 0.05 mm,
   * iar testul acuză aplicația de prudență pentru o diferență care nu există.
   */
  const cutiaReala = (r: { corp: any; contur: any | null }): [number, number] => {
    const a = r.corp.boundingBox();
    const min = a.min.slice(), max = a.max.slice();
    if (r.contur) {
      const b = r.contur.boundingBox();
      for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], b.min[i]); max[i] = Math.max(max[i], b.max[i]); }
    }
    return [max[0] - min[0], max[1] - min[1]];
  };
  for (const f of FONTS) {
    const font = load(f);
    for (const text of ['Alexandra', 'Ianis']) {
      const r = buildNume(cfg({ font, text }));
      const p = r.diagnostice.placa;
      elibereaza(r);
      if (p.incape) continue;
      if (!p.inaltimeMaxMM) {
        // „nici la minim" — trebuie să fie adevărat, nu o renunțare comodă
        const min = buildNume(cfg({ font, text, inaltimeLitera: INALTIME_MIN }));
        const dm = min.diagnostice;
        if (incape(dm.dim[0], dm.dim[1])) {
          fail(`${nume(f)} „${text}": raportat „nu încape nici la ${INALTIME_MIN} mm", dar la ${INALTIME_MIN} mm are ${dm.dim[0]}×${dm.dim[1]} mm`);
        }
        elibereaza(min);
        continue;
      }
      const la = buildNume(cfg({ font, text, inaltimeLitera: p.inaltimeMaxMM }));
      const d = la.diagnostice;
      if (!incape(d.dim[0], d.dim[1])) {
        fail(`${nume(f)} „${text}": propune ${p.inaltimeMaxMM} mm, dar acolo numele are ${d.dim[0]}×${d.dim[1]} mm — sfatul nu funcționează`);
      }
      elibereaza(la);
      verificate++;
      // un pas mai sus NU trebuie să încapă, altfel sfatul lasă milimetri pe masă degeaba
      const sus = buildNume(cfg({ font, text, inaltimeLitera: p.inaltimeMaxMM + PAS_INALTIME }));
      const ds = sus.diagnostice;
      // `dim` e ROTUNJIT la 0.1 mm (valoare de afișaj), iar aplicația compară cotele exacte.
      // Se măsoară aici cutia reală, ca să nu declarăm „prea prudent" o piesă care de fapt
      // depășește placa cu sutimi — diferența dintre cele două măsurători e tot ce trebuie ca
      // testul să acuze pe nedrept.
      const cb = cutiaReala(sus);
      if (incape(cb[0], cb[1])) {
        prudente++;
        detalii.push(`${nume(f)} „${text}": la ${p.inaltimeMaxMM + PAS_INALTIME} mm are `
          + `${cb[0].toFixed(3)}×${cb[1].toFixed(3)} mm și tot încape (propus ${p.inaltimeMaxMM} mm)`);
      }
      elibereaza(sus);
    }
  }
  if (prudente) fail(`${prudente} sfaturi prea prudente: ${detalii.join(' · ')}`);
  ok(`${verificate} înălțimi propuse, verificate prin reconstrucție`);
}

// =====================================================================
// AGĂȚAREA PE PERETE
//
// Verificarea care contează nu e că locașul e gol — asta era adevărat și pe geometria stricată
// de la Cutii Litere și Litere Fagure, unde capul șurubului nu putea gliza. Capul se simulează
// ca SOLID și i se cere drumul: liber pe toată cursa, la nivelul lui, și blocat de buză în
// poziția finală. Plus ce e specific unui NUME: două puncte, la aceeași înălțime.
// =====================================================================
{
  console.log('\n  AGĂȚAREA PE PERETE — capul intră, glisează și rămâne captiv');
  const { Manifold, CrossSection } = wasm;
  const rCap = IMPLICIT.surubCap / 2, hCap = IMPLICIT.inaltimeCapSurub;
  const fontAg = load(FONTS.find((x) => x.startsWith('GreatVibes')) ?? FONTS[0]);

  for (const tip of ['cheie', 'grila'] as const) {
    const r = buildNume(cfg({ font: fontAg, text: 'Maria', ...PERETE, tipAgatare: tip }));
    const a = r.diagnostice.agatare;
    const tot = intreg(r);
    if (!a.pozitii.length) { fail(`„Maria" ${tip}: sistemul nu a încăput în placă`); elibereaza(r); continue; }

    // 1. DOUĂ PUNCTE, la ACEEAȘI înălțime — invariantul specific unei piese late: un singur
    //    șurub ar lăsa numele să se răsucească. Egalitatea pe y face piesa dreaptă prin
    //    construcție, deci înclinarea raportată trebuie să fie zero.
    // La „cheie" perechea e regula: conturul e mic și încape de două ori. La „grila" canalul e
    // mult mai lat (20 mm plus peretele), iar măsurătoarea spune că perechea încape rar — acolo
    // se cere doar ca, DACĂ sunt două, invariantul să fie respectat.
    if (tip === 'cheie' && a.pozitii.length !== 2) fail(`„Maria" cheie: ${a.pozitii.length} puncte, la o piesă lată se cer două`);
    if (a.pozitii.length === 2) {
      if (Math.abs(a.pozitii[0][1] - a.pozitii[1][1]) > 1e-9) fail(`„Maria" ${tip}: punctele nu sunt la aceeași înălțime`);
      if (a.inclinare !== 0) fail(`„Maria" ${tip}: două puncte simetrice, dar înclinare raportată ${a.inclinare}°`);
    }

    // 2. PIESA RĂMÂNE ÎNTREAGĂ. Locașul e o scădere făcută DUPĂ ce se numără bucățile, iar la
    //    gaura străpunsă taie prin tot: dacă ar cădea pe o trăsătură îngustă, ar putea-o reteza.
    //    Numărul raportat n-ar mai fi adevărat, așa că se cere pe solidul final.
    {
      const parti = tot.decompose();
      if (parti.length !== 1) fail(`„Maria" ${tip}: piesa iese în ${parti.length} bucăți după ce s-a săpat locașul`);
      for (const x of parti) x.delete();
    }

    // 3. LOCAȘUL E GOL pe toată adâncimea, și PESTE el a rămas material plin
    for (const p of a.pozitii) {
      const dy = tip === 'grila' ? 2 : 0;
      const sonda = Manifold.cylinder(a.adancime - 0.4, rCap * 0.6, rCap * 0.6, 32, false)
        .translate([p[0], p[1] - dy, 0.2]);
      const lovit = tot.intersect(sonda);
      const v = lovit.volume();
      lovit.delete(); sonda.delete();
      if (v > 1e-3) fail(`„Maria" ${tip}: locașul nu e gol la (${p[0].toFixed(0)}, ${p[1].toFixed(0)}) — ${v.toFixed(2)} mm³`);
      // materialul de peste locaș: fără el, șurubul ar rupe placa la prima atârnare
      const peste = Manifold.cylinder(MATERIAL_PESTE_LOCAS - 0.1, rCap * 0.6, rCap * 0.6, 32, false)
        .translate([p[0], p[1] - dy, a.adancime + 0.05]);
      const plin = tot.intersect(peste);
      const fractie = plin.volume() / peste.volume();
      plin.delete(); peste.delete();
      if (fractie < 0.99) fail(`„Maria" ${tip}: peste locaș materialul e ${(fractie * 100).toFixed(0)}% — a străpuns`);
    }

    // 4. DRUMUL CAPULUI e liber pe toată cursa (aceeași sondă ca la Cutii Litere)
    const [px, py] = a.pozitii[0];
    const yStart = tip === 'cheie' ? py : py - rCap;
    const yFinal = py - (tip === 'cheie' ? IMPLICIT.surubCap : 8);
    const disc = Manifold.cylinder(hCap, rCap, rCap, 48, false);
    let drum: any = null;
    for (let i = 0; i <= 8; i++) {
      const y = yStart + ((yFinal - yStart) * i) / 8;
      const d = disc.translate([px, y, a.standoff]);
      if (drum) { const u = drum.add(d); drum.delete(); d.delete(); drum = u; } else drum = d;
    }
    const lovit = tot.intersect(drum);
    const vLovit = lovit.volume();
    lovit.delete(); drum.delete(); disc.delete();
    if (vLovit > 1) fail(`„Maria" ${tip}: capul se lovește de material pe drum (${vLovit.toFixed(1)} mm³) — nu poate gliza`);
    else ok(`„Maria" ${tip} — ${a.pozitii.length === 2 ? `două puncte la ${a.distantaMM} mm` : 'un punct'}`
      + `, capul Ø${IMPLICIT.surubCap} glisează liber ${(yStart - yFinal).toFixed(0)} mm`);

    // 5. la „cheie", BUZA îl reține: la nivelul ei nu mai încape capul
    if (tip === 'cheie') {
      const sect = tot.slice(a.standoff / 2);
      const mare = CrossSection.square([2000, 2000], true);
      const gol = mare.subtract(sect);
      const incape = gol.offset(-rCap, 'Round');
      const sonda = CrossSection.circle(0.2, 16).translate([px, yFinal]);
      const comun = incape.intersect(sonda);
      const arie = comun.area();
      comun.delete(); sonda.delete(); incape.delete(); gol.delete(); mare.delete(); sect.delete();
      if (arie > 1e-6) fail('„Maria" cheie: la nivelul buzei încă încape capul — numele se trage de pe șurub');
      else ok('„Maria" cheie — prin buză nu mai încape capul: rămâne captiv');
    }
    if (tot !== r.corp) tot.delete();
    elibereaza(r);
  }

  // 5. PLACA PREA SUBȚIRE — sfatul trebuie să fie adevărat, ca peste tot în aplicație.
  //
  // Se mătură TOATĂ plaja de grosimi, nu doar una: fereastra periculoasă e la mijloc. La 4 mm
  // nu se sapă nimic și se vede imediat; la 6 mm prima variantă săpa un locaș de 4 mm, din care
  // tija ia 2, deci camerei îi rămâneau 2 pentru un cap de 3 — locaș gol, material peste el,
  // toate verificările de atunci verzi, și niciun șurub care să intre. Regula e una singură:
  // ori nu se sapă deloc și se spune de la ce grosime merge, ori camera ține capul întreg.
  {
    let sapate = 0, refuzate = 0;
    for (let g = 3; g <= 12; g += 0.5) {
      const r = buildNume(cfg({ font: fontAg, text: 'Maria', ...CU_PLACA, grosimeContur: g }));
      const a = r.diagnostice.agatare;
      elibereaza(r);
      if (a.pozitii.length) {
        sapate++;
        const camera = a.adancime - a.standoff;
        if (camera < IMPLICIT.inaltimeCapSurub - 1e-9) {
          fail(`placă de ${g} mm: s-a săpat un locaș cu camera de ${camera.toFixed(1)} mm, la un cap de ${IMPLICIT.inaltimeCapSurub}`);
        }
        if (a.adancime + MATERIAL_PESTE_LOCAS > g + 1e-9) {
          fail(`placă de ${g} mm: locaș de ${a.adancime} mm plus ${MATERIAL_PESTE_LOCAS} de material peste el nu încap`);
        }
      } else {
        refuzate++;
        if (!a.grosimeNecesaraMM) fail(`placă de ${g} mm: refuzat, dar nu se propune nicio grosime`);
        else {
          // sfatul, verificat prin reconstrucție
          const gros = buildNume(cfg({ font: fontAg, text: 'Maria', ...CU_PLACA, grosimeContur: a.grosimeNecesaraMM }));
          if (!gros.diagnostice.agatare.pozitii.length) {
            fail(`placă de ${g} mm: propune ${a.grosimeNecesaraMM} mm, dar acolo locașul tot nu încape`);
          }
          elibereaza(gros);
        }
      }
    }
    ok(`grosimi de placă 3→12 mm: ${refuzate} refuzate cu grosimea propusă verificată, ${sapate} săpate cu camera peste înălțimea capului`);
  }

  // 5b. GAURA STRĂPUNSĂ chiar străpunge — altfel e un buzunar oarb în care nu intră șurubul
  {
    const r = buildNume(cfg({ font: fontAg, text: 'Maria', ...CU_PLACA, tipAgatare: 'gaura' }));
    const a = r.diagnostice.agatare;
    if (!a.pozitii.length) fail('gaura străpunsă: nicio poziție găsită');
    else {
      const tot = intreg(r);
      const [px, py] = a.pozitii[0];
      const bb = tot.boundingBox();
      // sondă subțire pe TOATĂ grosimea piesei, în axul găurii: trebuie să nu atingă nimic
      const sonda = wasm.Manifold.cylinder(bb.max[2] - bb.min[2] + 2, IMPLICIT.surubTija * 0.3, IMPLICIT.surubTija * 0.3, 24, false)
        .translate([px, py, bb.min[2] - 1]);
      const lovit = tot.intersect(sonda);
      const v = lovit.volume();
      lovit.delete(); sonda.delete();
      if (v > 1e-3) fail(`gaura străpunsă: nu străpunge — ${v.toFixed(2)} mm³ de material în ax`);
      else ok(`gaura străpunsă — trece prin toată placa de ${a.materialMM} mm`);
      const parti = tot.decompose();
      if (parti.length !== 1) fail(`gaura străpunsă: piesa iese în ${parti.length} bucăți`);
      for (const x of parti) x.delete();
      if (tot !== r.corp) tot.delete();
    }
    elibereaza(r);
  }

  // 5b2. CAPACUL ȘI CAPUL ÎNGROPAT — la gaura străpunsă, în locaș intră DOUĂ lucruri
  //      (capul șurubului jos, capacul peste el). Se verifică amândouă, plus că piesa de capac
  //      chiar INTRĂ: coliziune zero în poziția de montaj, ca la fața de la Litere LED.
  {
    const r = buildNume(cfg({ font: fontAg, text: 'Maria', ...PERETE, tipAgatare: 'gaura' }));
    const a = r.diagnostice.agatare;
    if (!a.pozitii.length) fail('gaură cu capac: nicio poziție găsită');
    else if (!r.capac) fail('gaură cu capac: nu s-a generat niciun capac');
    else {
      const bucatiCapac = r.capac.decompose();
      if (bucatiCapac.length !== a.pozitii.length) {
        fail(`gaură cu capac: ${bucatiCapac.length} capace la ${a.pozitii.length} găuri`);
      }
      for (const x of bucatiCapac) x.delete();
      // adâncimea locașului = capul + capacul + joc; sub capac trebuie să rămână capul întreg
      const subCapac = a.adancime - 0.2 - a.grosimeCapacMM;
      if (subCapac < IMPLICIT.inaltimeCapSurub - 1e-9) {
        fail(`gaură cu capac: sub capac rămân ${subCapac.toFixed(1)} mm, la un cap de ${IMPLICIT.inaltimeCapSurub}`);
      }
      // COLIZIUNE ZERO: capacul, în poziția în care e construit, nu se lovește de piesă
      const tot = intreg(r);
      const lovit = tot.intersect(r.capac);
      const v = lovit.volume();
      lovit.delete();
      if (v > 1e-3) fail(`gaură cu capac: capacul se lovește de piesă cu ${v.toFixed(2)} mm³ — nu intră în locaș`);
      // și nu iese în relief: fața lui rămâne sub fața piesei
      const bc = r.capac.boundingBox(), bt = tot.boundingBox();
      if (bc.max[2] > bt.max[2] - 0.1) fail(`gaură cu capac: fața capacului la z=${bc.max[2].toFixed(2)}, piesa la ${bt.max[2].toFixed(2)} — iese în relief`);
      else ok(`gaură cu capac — ${a.pozitii.length} capace de ${a.grosimeCapacMM} mm, coliziune zero, ${subCapac.toFixed(1)} mm liberi sub ele pentru cap`);
      if (tot !== r.corp) tot.delete();
    }
    elibereaza(r);
  }

  // 5c. RAMA — banda are 5 mm, locașul cere peste 8: dacă s-ar căuta doar în ea, sistemul n-ar
  //     încăpea niciodată. Silueta spatelui e a PIESEI, deci literele intră și ele în joc.
  {
    const r = buildNume(cfg({ font: fontAg, text: 'Maria', ...PERETE }));
    const a = r.diagnostice.agatare;
    if (!a.pozitii.length) fail('ramă: locașul nu încape nicăieri, deși literele au 35 mm grosime');
    else ok(`ramă — ${a.pozitii.length} ${a.pozitii.length > 1 ? 'puncte' : 'punct'}, locaș de ${a.adancime} mm din ${a.materialMM} disponibili`);
    elibereaza(r);
  }

  // 6. PE MASĂ NU SE SAPĂ NIMIC ÎN SPATE, oricât ar cere configurația: modul e cel care decide
  {
    const masa = buildNume(cfg({ font: fontAg, text: 'Maria', tipAgatare: 'cheie', grosimeContur: 7.5 }));
    if (masa.diagnostice.agatare.pozitii.length) fail('mod „masă": s-a săpat totuși un locaș de agățare');
    else ok('mod „masă": niciun locaș în spate, deși tipul de agățare era cerut');
    elibereaza(masa);
  }

  // 7. TALPA DREAPTĂ e o proprietate a modului „masă", nu a conturului
  {
    const masa = buildNume(cfg({ font: fontAg, text: 'Maria' }));
    const perete = buildNume(cfg({ font: fontAg, text: 'Maria', ...PERETE }));
    const tm = intreg(masa), tp = intreg(perete);
    const bm = tm.boundingBox(), bp = tp.boundingBox();
    // pe perete conturul își păstrează forma întreagă, deci coboară sub linia de bază a literelor
    if (bp.max[1] - bp.min[1] <= bm.max[1] - bm.min[1] + 1e-6) {
      fail('pe perete piesa nu e mai înaltă decât pe masă — talpa dreaptă se taie și acolo');
    } else {
      ok(`talpa dreaptă doar pe masă: ${(bm.max[1] - bm.min[1]).toFixed(0)} mm pe birou, ${(bp.max[1] - bp.min[1]).toFixed(0)} mm pe perete`);
    }
    if (tm !== masa.corp) tm.delete();
    if (tp !== perete.corp) tp.delete();
    elibereaza(masa); elibereaza(perete);
  }
}

// =====================================================================
// EXPORTUL — nu în oglindă, și de la Z=0
// =====================================================================
{
  const font = load(FONTS.find((f) => f.startsWith('GreatVibes')) ?? FONTS[0]);
  const r = buildNume(cfg({ font, text: 'Ana' }));
  const tot = intreg(r);
  const p = pentruPrint(tot);
  const bb = tot.boundingBox(), bp = p.boundingBox();
  if (Math.abs(bp.min[2]) > 1e-6) fail(`exportul pleacă de la z=${bp.min[2].toFixed(3)}, nu de la 0`);
  // oglindirea e pe Y: X și Z rămân, Y se întoarce (talpa era la 0, ajunge tot la 0)
  if (Math.abs((bp.max[0] - bp.min[0]) - (bb.max[0] - bb.min[0])) > 1e-6) fail('exportul schimbă lățimea');
  if (Math.abs((bp.max[1] - bp.min[1]) - (bb.max[1] - bb.min[1])) > 1e-6) fail('exportul schimbă înălțimea');
  if (Math.abs(p.volume() - tot.volume()) > 1e-3) fail('exportul schimbă volumul');
  ok(`exportul păstrează dimensiunile și pleacă de la z=0`);
  p.delete(); if (tot !== r.corp) tot.delete(); elibereaza(r);
}

// =====================================================================
const dt = (Date.now() - t0) / 1000;
if (esecuri.length) {
  console.error(`\n❌ ${esecuri.length} eșecuri:\n${esecuri.join('\n')}\n`);
  // vezi regula din docs/design/: process.exit dupa manifold crapa libuv pe Windows
  process.exitCode = 1;
} else {
  console.log(`\n✅ Nume 3D OK — ${testate} combinații în ${dt.toFixed(1)}s.\n`);
}
