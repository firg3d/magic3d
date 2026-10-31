/**
 * TEST PERMANENT — LITERE FAGURE
 *
 * Verificările din docs/plan-litere-fagure.md plus cele apărute pe parcurs, ca aserțiuni:
 *
 *   1. CONECTIVITATE — cea mai importantă. Modelul trebuie prins de ramă peste tot; nicio
 *      bucată plutitoare în interior. Se măsoară prin numărul de COMPONENTE CONEXE, care
 *      trebuie să rămână cel al literei (1 la „A", 2 la „i").
 *   2. Grosime minimă de perete — detectorul se aprinde sub prag și tace peste.
 *   3. Fără așchii — nicio bucată sub 1 mm², măsurat pe SOLID, nu pe numărătoarea din
 *      diagnostice: buildFagure raportează câte a eliminat, testul verifică independent.
 *   4. Alfabetul × toate fonturile × toate cele nouă tipare produc geometrie validă, iar cele
 *      nouă tipare dau nouă rezultate DIFERITE (un tipar scăpat din dispecerizare ar desena tăcut altceva).
 *   5. Stabilitatea — litera stă în picioare; detectorul are ambele capete.
 *   6. Modul gravat — buzunarul plus umplutura dau exact placa plină.
 *   7. Agățarea pe perete — locașul e gol, peretele din jur plin, fanta DEASUPRA cercului,
 *      litera atârnă drept (un punct pe verticala centrului de masă, sau două simetrice).
 *   8. Exportul nu iese în oglindă, iar întoarcerea cu spatele în sus e o rotație, nu o oglindire.
 *
 * TREI CAPCANE, toate găsite prin eșecuri pe geometrie CORECTĂ, nu presupuse:
 *
 * · GENUS-UL nu se aplică la model: tiparul creează sute de goluri PRIN PROIECT, deci genus-ul
 *   crește cu fiecare celulă. Invariantul corect e numărul de componente conexe.
 * · GENUS-UL nu se aplică nici la gaura de agățare, dar din alt motiv: plasturele de material
 *   ASTUPĂ celule (genus scade) iar gaura adaugă una la loc — la „E", „W", „Z", „4" se anulează
 *   exact. Se măsoară geometria, cu sonde cilindrice.
 * · SONDELE trebuie să stea bine ÎN INTERIORUL plasturelui. O sondă care iese în fagure
 *   găsește un gol al modelului și acuză pe nedrept — s-a întâmplat de două ori.
 *
 * Rulare:  npm run test:fagure
 *          npx tsx src/_tests/fagure.test.ts Baloo Cinzel     (doar câteva fonturi, pentru iterat)
 * Iese cu cod 1 la orice verificare picată.
 */
// @ts-ignore — opentype.js nu are declarații de tip (ca în restul proiectului)
import opentype from 'opentype.js';
import ManifoldModule from 'manifold-3d';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { configureManifold, buildFagure as buildFagureBrut, pentruPrint, ASCHIE_MAX, PATA_MAX, TRASATURA_MIN, PERETE_GAURA, JOC_CAPAC, type Model } from '../apps/fagure/fagure.js';
import { instrumenteazaArena, inArena } from '../core/geometry/arena.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FONT_DIR = join(ROOT, 'public', 'fonts');

const filtru = process.argv.slice(2);
/**
 * PARTEA din catalog pe care o ia procesul asta, ca `2/3`. Rulatorul imparte testul in mai
 * multe procese; fara variabila de mediu, se ia tot.
 *
 * DE CE E NEVOIE. Heap-ul WASM nu se micsoreaza NICIODATA. Masurat pe drumul asta: desi codul
 * lui fagure isi elibereaza singur intermediarele (249 de obiecte alocate pe constructie, 245
 * deja moarte cand ajunge arena la ele), memoria tot creste cu ~74-107 KB la fiecare
 * constructie. Nu e o scurgere de obiecte — e FRAGMENTARE: alocari mari, de dimensiuni mereu
 * altele, pe care alocatorul nu le mai poate refolosi. Impotriva ei niciun .delete() nu ajuta.
 *
 * La 27 de fonturi testul incapea. La 440 sunt ~16.000 de constructii doar in maturarea
 * principala, adica peste un gigaoctet numai din fragmentare, iar procesul CRAPA cu
 * "memory access out of bounds" — nu pica, crapa, deci nici macar nu se citea ca test picat.
 *
 * Impartirea NU reduce acoperirea: toate fonturile trec, doar in procese diferite, fiecare cu
 * heap-ul lui proaspat.
 */
const PARTE = process.env.PARTE ?? '';
const toateFonturile = readdirSync(FONT_DIR)
  .filter((f) => /\.(ttf|otf)$/i.test(f))
  .filter((f) => !filtru.length || filtru.some((q) => f.toLowerCase().includes(q.toLowerCase())))
  .sort();
const FONTS = (() => {
  const m = /^(\d+)\/(\d+)$/.exec(PARTE);
  if (!m) return toateFonturile;
  const [i, n] = [Number(m[1]), Number(m[2])];
  // felii intretesute, nu blocuri: fiecare parte prinde fonturi din tot alfabetul, deci un
  // esec local nu se poate ascunde intr-o singura parte
  return toateFonturile.filter((_, k) => k % n === i - 1);
})();
/**
 * Fontul de referință al secțiunilor care verifică o proprietate a GEOMETRIEI, nu a fontului:
 * modul gravat, locașurile de agățare, glisarea capului de șurub.
 *
 * NUMIT EXACT, niciodată căutat pe subșir. `FONTS.find(x => x.includes('Baloo2'))` alegea
 * Baloo2-Regular câtă vreme era singurul din familie. După ce catalogul a crescut la 440 de
 * fonturi, lista sortată începe cu Baloo2-500 — o greutate mai subțire — și testul a început
 * să pice cu „grila: n-a încăput pe «8»". Măsurat: grila de 20 mm intră pe „8" la Regular,
 * 600, 700 și 800, dar NU la 500. Nu se stricase nimic în aplicație; se schimbase fontul sub
 * test, tăcut.
 *
 * Se caută în `toateFonturile`, nu în `FONTS`: acesta din urmă poate fi o felie (vezi PARTE),
 * iar atunci fontul de referință ar lipsi din unele procese și s-ar cădea pe alt font — exact
 * substituția tăcută pe care numirea explicită o previne.
 */
const FONT_REFERINTA = toateFonturile.find((x) => x === 'Baloo2-Regular.ttf') ?? toateFonturile[0];
/** exact ce se poate alege din panou */
const CARACTERE = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'];
/** parametrii IMPLICIȚI ai aplicației — testul apără configurația cu care se deschide */
const IMPLICIT = { inaltimeLitera: 120, grosime: 14, model: 'fagure' as Model,
  pasCelula: 8, grosimePerete: 1.2, latimeRama: 2.5, unghiModel: 0, variantaModel: 1, taiereBaza: 0,
  modModel: 'strapuns' as const, adancimeGravare: 2, talpaPlina: 6,
  tipAgatare: 'fara' as const, capacel: true, surubCap: 5, surubTija: 2.5,
  inaltimeCapSurub: 3, grosimeCapac: 2,
  latimeGrila: 20 };
/** toate tiparele: fiecare trece prin aceleași verificări */
const MODELE: Model[] = ['fagure', 'perforat', 'voronoi', 'diagonal', 'triunghiular', 'caramida', 'valuri', 'radial', 'spirala'];
/**
 * Fonturile pe care se rulează TOATE tiparele. Produsul complet (toate caracterele × toate
 * fonturile × toate tiparele) ar însemna peste 6000 de construcții, adică minute în `npm test`.
 * Acoperirea se împarte în două măturări care se completează: alfabetul întreg × toate
 * fonturile pe tiparul implicit, și alfabetul întreg × toate tiparele pe trei fonturi alese
 * să fie cât mai diferite între ele (gros, cu serife subțiri, cursiv).
 */
const FONTURI_TOATE_MODELELE = ['Baloo2', 'Cinzel-', 'GreatVibes'];
/** fonturi cu trăsături groase: detectorul de pereți subțiri TREBUIE să tacă pe ele */
const GROASE = ['Baloo2', 'Anton', 'ArchivoBlack', 'Fredoka', 'BebasNeue', 'AlfaSlabOne'];

const load = (f: string) => {
  const b = readFileSync(join(FONT_DIR, f));
  return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
};
const nume = (f: string) => f.replace(/-(Regular|Bold|Italic).*\.(ttf|otf)$/i, '').replace(/\.(ttf|otf)$/i, '');

/**
 * Eliberează corpurile unei construcții. Manifold trăiește în heap-ul WASM și se curăță abia
 * la un GC al JS-ului; într-o buclă de mii de construcții GC-ul nu apucă să ruleze.
 */
const elibereaza = (r: { corpLitera: any; corpModel: any | null; corpCapac: any | null }) => {
  // `isDeleted` inainte de fiecare stergere: unele drumuri trec printr-o arena, care poate
  // fi ajuns deja la aceleasi corpuri. Fara garda, a doua stergere arunca
  // „BindingError: Manifold instance already deleted" si opreste testul in loc sa-l pice.
  for (const c of [r.corpLitera, r.corpModel, r.corpCapac]) {
    if (c && !c.isDeleted()) c.delete();
  }
};

const esecuri: string[] = [];
const fail = (m: string) => esecuri.push('  ✗ ' + m);

const wasm: any = await ManifoldModule();
wasm.setup();
configureManifold(wasm);
instrumenteazaArena(wasm);

/**
 * MEMORIA WASM. Obiectele Manifold sunt handle-uri embind: memoria lor sta in heap-ul WASM si
 * se elibereaza doar prin `.delete()`, GC-ul JS n-o atinge. Testul construieste litere fagure
 * peste tot catalogul de fonturi si epuiza heap-ul pe la jumatate, crapand cu
 * „RuntimeError: memory access out of bounds" — nu pica, CRAPA, deci nici macar nu se citea ca
 * un test picat. A aparut cand catalogul a crescut la 440 de fonturi: aceeasi bucla, mult mai
 * lunga. Aceeasi clasa de defect ca la litere si brelocuri.
 *
 * Fiecare constructie ruleaza intr-o arena proprie; se tin ultimele patru rezultate, fiindca
 * verificarile compara cel mult doua litere deodata.
 */
const buildFagure: typeof buildFagureBrut = (cfg: any) =>
  inArena(() => buildFagureBrut(cfg), (x) => [x]);

console.log(`\nTEST LITERE FAGURE — ${MODELE.length} tipare${PARTE ? ` · partea ${PARTE} (${FONTS.length} din ${toateFonturile.length} fonturi)` : ''}`);
console.log(`(literă ${IMPLICIT.inaltimeLitera} mm · pas ${IMPLICIT.pasCelula} mm · perete ${IMPLICIT.grosimePerete} mm · ramă ${IMPLICIT.latimeRama} mm)`);

const t0 = Date.now();
let testate = 0, sarite = 0;
/** censul literelor pe care rama înghite tot interiorul (font subțire — nu e defect) */
const pline: string[] = [];

/**
 * Toate verificările pe o singură construcție; întoarce simbolul de pus în tabel.
 *
 * APELATĂ ÎNTOTDEAUNA ÎN ARENĂ (vezi mai jos). Nu doar `buildFagure` alocă aici: `decompose`
 * întoarce componente noi, iar sondele de geometrie construiesc cilindri. Peste 440 de fonturi
 * suma epuiza heap-ul WASM și testul CRĂPA cu „memory access out of bounds" — nu pica, crăpa.
 * Nimic din ce alocă nu trebuie să supraviețuiască apelului, deci arena se închide cu lista de
 * păstrate goală.
 */
function verifica(model: Model, f: string, ch: string, stat: {
  economieMin: number; economieMax: number; aschii: number; tri: number; ms: number; msK: string;
}, font: any): string {
  testate++;
  const eticheta = `${model} ${nume(f)} „${ch}"`;
  let r;
  try {
    r = buildFagure({ ...IMPLICIT, model, litera: ch, font });
  } catch (e: any) {
    fail(`${eticheta}: buildFagure a aruncat — ${e?.message ?? e}`); return 'E';
  }
  const d = r.diagnostice;
  let ok = true;
  // ---- 4: geometrie validă (buildFagure aruncă la status != NoError) și glifă întreagă
  if (d.glifeLipsa.length) { fail(`${eticheta}: glifă fără geometrie`); ok = false; }
  // ---- 1: CONECTIVITATE — tot atâtea bucăți câte are litera în sine
  if (d.bucati !== d.bucatiLitera) {
    fail(`${eticheta}: ${d.bucati} bucăți, litera are ${d.bucatiLitera} — model desprins de ramă`); ok = false;
  }
  // ---- 3: FĂRĂ AȘCHII — măsurat pe solid, independent de numărătoarea din diagnostice
  const parti = r.corpLitera.decompose();
  const prag = ASCHIE_MAX * IMPLICIT.grosime;
  const mici = parti.filter((p: any) => p.volume() < prag);
  if (mici.length) {
    fail(`${eticheta}: ${mici.length} așchii rămase sub ${ASCHIE_MAX} mm² (cea mai mică ${(Math.min(...mici.map((p: any) => p.volume())) / IMPLICIT.grosime).toFixed(2)} mm²)`);
    ok = false;
  }
  // componentele solidului trebuie să fie ACELEAȘI cu cele numărate în 2D
  if (parti.length !== d.bucati) { fail(`${eticheta}: solidul are ${parti.length} bucăți, silueta ${d.bucati}`); ok = false; }
  for (const p of parti) p.delete();
  // ---- censuri
  stat.aschii += d.aschii;
  if (d.faraInterior || d.economie < 0.02) pline.push(eticheta);
  else { stat.economieMin = Math.min(stat.economieMin, d.economie); stat.economieMax = Math.max(stat.economieMax, d.economie); }
  stat.tri = Math.max(stat.tri, d.triunghiuri);
  if (r.ms > stat.ms) { stat.ms = r.ms; stat.msK = eticheta; }
  elibereaza(r);
  return ok ? (d.faraInterior ? 'p' : '✓') : '✗';
}
const statNou = () => ({ economieMin: 1, economieMax: 0, aschii: 0, tri: 0, ms: 0, msK: '' });
const rezumat = (s: ReturnType<typeof statNou>) =>
  `economie ${(s.economieMin * 100).toFixed(0)}–${(s.economieMax * 100).toFixed(0)}% · ${s.aschii} așchii eliminate`
  + ` · cel mai scump ${s.msK} ${s.ms.toFixed(0)} ms · mesh maxim ${s.tri.toLocaleString('en-US')} triunghiuri`;

// ---- MĂTURAREA 1: alfabetul întreg × toate fonturile, pe tiparul implicit ----
console.log(`\n  ── toate fonturile, tiparul implicit („${IMPLICIT.model}") ──`);
{
  const stat = statNou();
  for (const f of FONTS) {
    const font = load(f);
    const celule = CARACTERE.map((ch) => {
      if (font.charToGlyphIndex(ch) === 0) { sarite++; return '·'; }
      return inArena(() => verifica(IMPLICIT.model, f, ch, stat, font), () => []);
    });
    console.log(`  ${nume(f).padEnd(20)} ${celule.join('')}`);
  }
  console.log(`     ${rezumat(stat)}`);
}

// ---- MĂTURAREA 2: alfabetul întreg × toate tiparele, pe fonturi cât mai diferite ----
const FONTS_M = FONTS.filter((x) => FONTURI_TOATE_MODELELE.some((g) => x.includes(g)));
console.log(`\n  ── toate tiparele × ${FONTS_M.map(nume).join(', ') || '(niciun font potrivit în filtru)'} ──`);
for (const model of MODELE) {
  const stat = statNou();
  const celule: string[] = [];
  for (const f of FONTS_M) {
    const font = load(f);
    for (const ch of CARACTERE) {
      if (font.charToGlyphIndex(ch) === 0) { celule.push('·'); sarite++; continue; }
      celule.push(inArena(() => verifica(model, f, ch, stat, font), () => []));
    }
  }
  console.log(`  ${model.padEnd(13)} ${celule.join('')}`);
  if (celule.length) console.log(`     ${rezumat(stat)}`);
}

console.log(`\n  legendă: ✓ ok · p literă plină (rama acoperă tot interiorul — font subțire) · ✗ verificare picată · E eroare · · glifă inexistentă`);
console.log(`  ${testate} combinații verificate (${sarite} glife inexistente) în ${((Date.now() - t0) / 1000).toFixed(0)} s · ${pline.length} litere ies pline`);

// ---------------------------------------------------------------------------
// 1b. CONECTIVITATEA, forțată: pas mic și ramă subțire, unde modelul are cele mai multe
// șanse să se desprindă. Dacă pipeline-ul are o slăbiciune, aici iese.
// ---------------------------------------------------------------------------
console.log('\n  conectivitate la parametri extremi (toate modelele, 2 fonturi):');
/**
 * EXACT doua fonturi, nu orice fisier care contine sirurile astea.
 *
 * Filtrul era pe subsir, iar cand catalogul a crescut la 440 de fonturi a inceput sa prinda
 * 14: toate greutatile Baloo2 si Cinzel, plus CinzelDecorative. Sectiunea a crescut de sapte
 * ori fara ca cineva sa vrea — comentariul de deasupra spune, si acum spunea deja, „2 fonturi".
 *
 * Nu e o taiere de acoperire, e restaurarea intentiei. Asta e un test de PARAMETRI extremi,
 * nu de fonturi: greutatea 600 a aceleiasi familii nu spune nimic nou despre ce se intampla la
 * pas 4 si rama 1.5. Fonturile trec oricum, toate 440, prin maturarea principala de mai sus.
 *
 * Costul cresterii ascunse era real: modelele grele (perforat la pas 4 aloca ~0.5 MB pe
 * constructie) ajungeau la ~19.000 de constructii in sectiunea asta, iar procesul crapa cu
 * „memory access out of bounds" — heap-ul WASM nu se micsoreaza niciodata, deci nici tot
 * eliberatul din lume nu-l mai aducea inapoi.
 */
const FONTURI_EXTREME = ['Baloo2-Regular.ttf', 'Cinzel-Regular.ttf'];
for (const p of [
  { pasCelula: 4, grosimePerete: 0.8, latimeRama: 1.5 },
  { pasCelula: 20, grosimePerete: 3, latimeRama: 1.5 },
  { pasCelula: 4, grosimePerete: 3, latimeRama: 6 },
  { pasCelula: 8, grosimePerete: 1.2, latimeRama: 2.5, unghiModel: 45 },
]) {
  for (const model of MODELE) {
    let n = 0, rupte = 0;
    for (const f of FONTURI_EXTREME.filter((g) => toateFonturile.includes(g))) {
      const font = load(f);
      for (const ch of CARACTERE) {
        if (font.charToGlyphIndex(ch) === 0) continue;
        n++;
        // TOATA iteratia intr-o arena, nu doar constructia: verificarile aloca si ele
        // (decompose, cilindri de sonda), iar peste 440 de fonturi suma epuiza heap-ul WASM.
        // Cu `pastreaza` gol, nimic nu supravietuieste iteratiei — nici nu e nevoie.
        inArena(() => {
          const r = buildFagure({ ...IMPLICIT, ...p, model, litera: ch, font });
          const d = r.diagnostice;
          if (d.bucati !== d.bucatiLitera) { rupte++; fail(`${model} pas ${p.pasCelula}/perete ${p.grosimePerete}/ramă ${p.latimeRama} ${nume(f)} „${ch}": ${d.bucati} bucăți vs ${d.bucatiLitera}`); }
        }, () => []);
      }
    }
    console.log(`    pas ${String(p.pasCelula).padEnd(2)} perete ${String(p.grosimePerete).padEnd(3)} ramă ${String(p.latimeRama).padEnd(3)} unghi ${String(p.unghiModel ?? 0).padEnd(2)}  ${model.padEnd(13)} ${n} caractere · ${rupte} rupte`);
  }
}

// ---------------------------------------------------------------------------
// 2. DETECTORUL de pereți subțiri: se aprinde sub prag, tace peste.
// Peretele e un PARAMETRU aici, nu o proprietate a fontului ca la brelocuri — deci ambele
// capete se pot cere direct, iar pragul e apărat de o regresie tăcută în ambele sensuri.
// ---------------------------------------------------------------------------
console.log('\n  detector de pereți subțiri:');
for (const g of GROASE) {
  const f = FONTS.find((x) => x.includes(g));
  if (!f) continue;
  const font = load(f);
  // sub prag: 0.8 mm < 0.85 mm => trebuie să se aprindă
  const subtire = buildFagure({ ...IMPLICIT, litera: 'A', font, grosimePerete: 0.8 });
  if (subtire.diagnostice.trasaturi.ariaMaxMM2 <= PATA_MAX) fail(`detectorul TACE pe ${g} cu perete 0.8 mm (${subtire.diagnostice.trasaturi.ariaMaxMM2} mm² <= ${PATA_MAX})`);
  // peste prag: 2 mm, cu mult peste 0.85 => trebuie să tacă pe tot alfabetul
  let max = 0, chMax = '';
  for (const ch of CARACTERE) {
    if (font.charToGlyphIndex(ch) === 0) continue;
    const r = buildFagure({ ...IMPLICIT, litera: ch, font, grosimePerete: 2 });
    const a = r.diagnostice.trasaturi.ariaMaxMM2;
    if (a > max) { max = a; chMax = ch; }
    elibereaza(r);
  }
  if (max > PATA_MAX) fail(`detectorul se aprinde pe fontul gros ${g} cu perete 2 mm („${chMax}", ${max} mm²) — prag prea strâns`);
  else console.log(`    ✓ ${g.padEnd(14)} se aprinde la perete 0.8 (${subtire.diagnostice.trasaturi.ariaMaxMM2} mm²) · tace la 2 mm (cel mult ${max.toFixed(3)} mm²)`);
  elibereaza(subtire);
}

// ---------------------------------------------------------------------------
// MODELUL CHIAR STRĂPUNGE. Fără asta, un tipar gol ar trece toate verificările de mai sus
// (o literă plină e perfect conexă și n-are nici așchii, nici pereți subțiri).
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// TIPARELE SUNT DISTINCTE ÎNTRE ELE.
// Dispecerizarea e un lanț de ternare; un tipar scăpat din lanț n-ar da eroare, ar produce
// tăcut altceva — meniul ar avea opt intrări din care două ar desena la fel.
// ---------------------------------------------------------------------------
console.log(`\n  cele ${MODELE.length} tipare dau ${MODELE.length} rezultate diferite:`);
{
  const font = load(FONT_REFERINTA);
  const arii = new Map<Model, number>();
  for (const model of MODELE) {
    const r = buildFagure({ ...IMPLICIT, model, litera: 'O', font });
    arii.set(model, r.diagnostice.ariaFinalaMM2);
    elibereaza(r);
  }
  const vazute = new Map<number, Model>();
  for (const [model, arie] of arii) {
    const alt = vazute.get(arie);
    if (alt) fail(`„${model}" și „${alt}" dau exact aceeași arie (${arie} mm²) — tipar scăpat din dispecerizare`);
    vazute.set(arie, model);
  }
  console.log(`    ${[...arii].map(([m, a]) => `${m} ${a.toFixed(0)}`).join(' · ')}`);
}

// ---------------------------------------------------------------------------
// VORONOI — așezarea e ALEATOARE, dar DETERMINISTĂ.
// Aceiași parametri trebuie să dea aceeași literă la fiecare reconstrucție (altfel modelul
// ar tremura la orice mișcare de cursor și n-ar putea fi nici salvat ca preset), iar
// „varianta" trebuie chiar să schimbe ceva — altfel butonul e mort.
// ---------------------------------------------------------------------------
console.log('\n  voronoi — aleator, dar determinist:');
{
  const font = load(FONT_REFERINTA);
  const arie = (v: number) => {
    const r = buildFagure({ ...IMPLICIT, model: 'voronoi', litera: 'O', font, variantaModel: v });
    const a = r.diagnostice.ariaFinalaMM2; elibereaza(r); return a;
  };
  const a1 = arie(1), a1bis = arie(1), a2 = arie(2), a3 = arie(3);
  if (a1 !== a1bis) fail(`voronoi nu e determinist: aceeași variantă dă ${a1} și apoi ${a1bis} mm²`);
  else console.log(`    ✓ aceeași variantă -> aceeași literă (${a1} mm², de două ori)`);
  if (a1 === a2 || a1 === a3 || a2 === a3) fail(`„varianta" nu schimbă așezarea: ${a1} / ${a2} / ${a3} mm²`);
  else console.log(`    ✓ variantele 1/2/3 dau așezări diferite — ${a1} / ${a2} / ${a3} mm²`);
}

console.log('\n  modelul străpunge (litera nu iese plină):');
for (const model of MODELE) {
  const randuri: string[] = [];
  for (const g of GROASE) {
    const f = FONTS.find((x) => x.includes(g));
    if (!f) continue;
    const r = buildFagure({ ...IMPLICIT, model, litera: 'O', font: load(f) });
    const d = r.diagnostice;
    if (d.economie < 0.25) fail(`${model} ${g} „O": doar ${(d.economie * 100).toFixed(0)}% material scos — modelul nu străpunge`);
    randuri.push(`${g} ${(d.economie * 100).toFixed(0)}%`);
    elibereaza(r);
  }
  console.log(`    ✓ ${model.padEnd(13)} „O" — ${randuri.join(' · ')}`);
}

// ---------------------------------------------------------------------------
// STABILITATE — litera stă în picioare, deci trebuie să și rămână.
//
// Verificarea are două capete, ca orice detector din proiect: trebuie să se aprindă pe o
// literă subțire și să tacă pe una groasă. Plus RETEZAREA TĂLPII, care e reparația oferită
// omului: la o literă rotundă trebuie să crească măsurabil sprijinul.
// ---------------------------------------------------------------------------
console.log('\n  stabilitate:');
{
  const font = load(FONT_REFERINTA);
  const masoara = (litera: string, grosime: number, taiereBaza = 0) => {
    const r = buildFagure({ ...IMPLICIT, litera, font, grosime, taiereBaza });
    const s = r.diagnostice.stabilitate; elibereaza(r); return s;
  };
  const subtire = masoara('A', 5), gros = masoara('A', 25);
  if (subtire.staSingura) fail(`detectorul TACE pe „A" de 120 mm cu grosime 5 mm (${subtire.unghiFataSpate}°)`);
  else console.log(`    ✓ se aprinde la grosime 5 mm — ${subtire.unghiFataSpate}° față/spate, sprijin ${subtire.ariaSprijinMM2} mm²`);
  if (!gros.staSingura) fail(`detectorul se aprinde pe „A" de 120 mm cu grosime 25 mm (${gros.unghiFataSpate}°, ${gros.unghiLateral}° lateral, ${gros.ariaSprijinMM2} mm²) — prag prea strâns`);
  else console.log(`    ✓ tace la grosime 25 mm — ${gros.unghiFataSpate}° față/spate, sprijin ${gros.ariaSprijinMM2} mm²`);
  // censul la parametrii impliciți, ca pragul să nu se rupă tăcut de realitate
  const cens = (g: number, t: number) => ['A', 'O', 'I', 'M', 'S']
    .map((ch) => { const s = masoara(ch, g, t); return `${ch} ${s.unghiFataSpate}°/${s.ariaSprijinMM2}mm²`; }).join(' · ');
  console.log(`    la implicit (grosime ${IMPLICIT.grosime} mm, retezare ${IMPLICIT.taiereBaza} mm): ${cens(IMPLICIT.grosime, IMPLICIT.taiereBaza)}`);
  // censul care a ales grosimea implicită: de la 14 mm toate literele trec pragul, la 12 nu.
  // Fonturile cu terminații ROTUNJITE (Baloo 2) ating masa pe o linie, deci rămân sub pragul
  // de sprijin până la retezare — exact cazul pentru care există parametrul.
  for (const [g, t] of [[8, 0], [12, 0], [14, 1.5]] as [number, number][]) {
    console.log(`    grosime ${g} retezare ${t}: ${cens(g, t)}`);
  }
  // RETEZAREA TĂLPII: la „O" trebuie să facă o diferență vizibilă
  const fara = masoara('O', IMPLICIT.grosime), cu = masoara('O', IMPLICIT.grosime, 2);
  if (cu.ariaSprijinMM2 <= fara.ariaSprijinMM2) fail(`retezarea tălpii nu mărește sprijinul la „O": ${fara.ariaSprijinMM2} -> ${cu.ariaSprijinMM2} mm²`);
  else console.log(`    ✓ retezarea de 2 mm la „O" — sprijin ${fara.ariaSprijinMM2} -> ${cu.ariaSprijinMM2} mm²`);

  // TALPA PLINĂ: material jos, deci centrul de masă coboară și unghiul crește. Trebuie să
  // lucreze la TOATE tiparele — asta e chiar motivul pentru care s-a ales în locul unui
  // gradient pe celule, care n-ar fi mers la benzile ce traversează litera de jos până sus.
  for (const model of MODELE) {
    const cu0 = buildFagure({ ...IMPLICIT, model, litera: 'A', font, talpaPlina: 0 });
    const cu20 = buildFagure({ ...IMPLICIT, model, litera: 'A', font, talpaPlina: 20 });
    const h0 = cu0.diagnostice.stabilitate.inaltimeCM, h20 = cu20.diagnostice.stabilitate.inaltimeCM;
    if (h20 >= h0) fail(`talpa plină nu coboară centrul de masă la „${model}": ${h0} -> ${h20} mm`);
    if (cu20.diagnostice.ariaFinalaMM2 <= cu0.diagnostice.ariaFinalaMM2) {
      fail(`talpa plină nu adaugă material la „${model}": ${cu0.diagnostice.ariaFinalaMM2} -> ${cu20.diagnostice.ariaFinalaMM2} mm²`);
    }
    if (model === MODELE[0]) console.log(`    ✓ talpă plină 20 mm la „${model}" — centrul de masă ${h0} -> ${h20} mm, unghi ${cu0.diagnostice.stabilitate.unghiFataSpate}° -> ${cu20.diagnostice.stabilitate.unghiFataSpate}°`);
    elibereaza(cu0); elibereaza(cu20);
  }
  console.log(`    ✓ talpa plină lucrează la toate cele ${MODELE.length} tipare`);
}

// ---------------------------------------------------------------------------
// MODUL GRAVAT — placa rămâne întreagă, modelul devine scobitură umplută cu a doua culoare.
//
// Verificarea tare e pe VOLUME: buzunarul și piesa care îl umple trebuie să fie exact
// complementare, deci volumul plăcii gravate plus volumul umpluturii trebuie să dea fix
// volumul plăcii pline. Orice dilatare, joc sau nepotrivire de adâncime strică egalitatea.
// ---------------------------------------------------------------------------
console.log('\n  mod gravat (a doua culoare):');
{
  const font = load(FONT_REFERINTA);
  for (const model of MODELE) {
    const g = buildFagure({ ...IMPLICIT, model, litera: 'B', font, modModel: 'gravat' });
    const d = g.diagnostice;
    const eticheta = `gravat ${model} „B"`;
    if (!g.corpModel) { fail(`${eticheta}: nu s-a generat corpul de umplutură`); continue; }
    // 1. placa e ÎNTREAGĂ: gravarea nu are voie să taie litera în bucăți
    if (d.bucati !== d.bucatiLitera) fail(`${eticheta}: ${d.bucati} bucăți, litera are ${d.bucatiLitera}`);
    // 2. buzunar + umplutură = placa plină
    const asteptat = d.ariaPlinaMM2 * IMPLICIT.grosime;
    const obtinut = g.corpLitera.volume() + g.corpModel.volume();
    if (Math.abs(obtinut - asteptat) / asteptat > 0.002) {
      fail(`${eticheta}: placa gravată + umplutura = ${obtinut.toFixed(0)} mm³, placa plină ${asteptat.toFixed(0)} mm³`);
    }
    // 3. scobitura NU străpunge: umplutura stă în treimea de sus a plăcii
    const bb = g.corpModel.boundingBox();
    const jos = IMPLICIT.grosime - IMPLICIT.adancimeGravare;
    if (Math.abs(bb.min[2] - jos) > 1e-6 || Math.abs(bb.max[2] - IMPLICIT.grosime) > 1e-6) {
      fail(`${eticheta}: umplutura ocupă z ${bb.min[2].toFixed(2)}..${bb.max[2].toFixed(2)}, se aștepta ${jos}..${IMPLICIT.grosime}`);
    }
    if (model === MODELE[0]) console.log(`    ✓ ${MODELE.length} tipare · buzunar + umplutură = placa plină · scobitura z ${jos}..${IMPLICIT.grosime} mm`);
    elibereaza(g);
  }
  // adâncimea cerută peste grosime se limitează, nu străpunge placa
  const adanc = buildFagure({ ...IMPLICIT, litera: 'B', font, modModel: 'gravat', adancimeGravare: 50 });
  const bb = adanc.corpModel!.boundingBox();
  if (bb.min[2] < 0.999) fail(`adâncimea de 50 mm pe o placă de ${IMPLICIT.grosime} mm a străpuns: scobitura coboară la z=${bb.min[2].toFixed(2)}`);
  else console.log(`    ✓ adâncimea peste grosime se limitează — rămâne ${bb.min[2].toFixed(1)} mm de placă sub model`);
  elibereaza(adanc);
}

// ---------------------------------------------------------------------------
// GAURA DE AGĂȚARE — pe o literă goală pe dinăuntru, gaura nu poate fi doar tăiată: ar cădea
// între celule. Plasturele de material trebuie să o închidă de jur împrejur.
//
// GENUS-UL NU E BUN NICI AICI, dar din alt motiv decât la model. Plasturele ASTUPĂ celule
// (genus scade cu câte a acoperit), iar gaura adaugă una la loc — la „E", „W", „Z" și „4" se
// anulează exact, iar o verificare „genus + 1" ar da eșec pe o geometrie perfect corectă.
// (Verificat: prima variantă a testului chiar a picat pe ele.)
//
// Se măsoară direct GEOMETRIA, cu două sonde:
//   · un cilindru mai subțire decât gaura, prin toată placa  -> trebuie să fie GOL
//   · un inel în jurul găurii, până sub marginea plasturelui  -> trebuie să fie PLIN
// Împreună spun exact ce trebuie: gaura există și are material de jur împrejur.
// ---------------------------------------------------------------------------
console.log('\n  agățare pe perete:');
{
  const { Manifold } = wasm;
  const font = load(FONT_REFERINTA);
  const G = IMPLICIT.grosime;
  /** cât material are litera într-un cilindru de probă */
  const sonda = (corp: any, x: number, y: number, raza: number, z0: number, h: number) => {
    const cil = Manifold.cylinder(h, raza, raza, 32, false).translate([x, y, z0]);
    const parte = corp.intersect(cil);
    const v = parte.volume(), plin = cil.volume();
    parte.delete(); cil.delete();
    return { v, plin };
  };

  // ---- GAURA CU LOCAȘ DE CAP, pe tot alfabetul ----
  // Șurubul trece PRIN literă și se înfige în perete; capul lui se îngroapă într-un locaș din
  // FAȚĂ, acoperit apoi de un capac printat separat. Trei lucruri de măsurat:
  //   · tija are gaură pe toată grosimea
  //   · capul are locaș, dinspre față, pe adâncimea cerută
  //   · inelul din jurul LOCAȘULUI (nu al tijei) e plin pe toată grosimea
  //
  // GENUS-UL NU E BUN AICI, și prima variantă a testului chiar a picat pe asta: plasturele
  // ASTUPĂ celule (genus scade), iar gaura adaugă una la loc — la „E", „W", „Z" și „4" se
  // anulează exact.
  let n = 0, fara = 0;
  const faraLoc: string[] = [];
  const r = IMPLICIT.surubTija / 2;
  const rLacas = (IMPLICIT.surubCap + JOC_CAPAC) / 2;
  for (const ch of CARACTERE) {
    if (font.charToGlyphIndex(ch) === 0) continue;
    const cu = buildFagure({ ...IMPLICIT, litera: ch, font, tipAgatare: 'gaura' });
    const p = cu.diagnostice.agatare.pozitii[0];
    if (!p) { fara++; faraLoc.push(ch); elibereaza(cu); continue; }
    n++;
    const adanc = cu.diagnostice.agatare.adancime;
    if (cu.diagnostice.bucati !== cu.diagnostice.bucatiLitera) {
      fail(`gaură „${ch}": ${cu.diagnostice.bucati} bucăți, litera are ${cu.diagnostice.bucatiLitera} — plasturele a rupt modelul`);
    }
    const gol = sonda(cu.corpLitera, p[0], p[1], r * 0.85, -1, G + 2);
    if (gol.v > 1) fail(`gaură „${ch}": a rămas material în gaura tijei (${gol.v.toFixed(1)} mm³)`);
    // locașul capului: gol dinspre FAȚĂ, pe adâncimea cerută
    const lacas = sonda(cu.corpLitera, p[0], p[1], rLacas * 0.85, G - adanc + 0.2, adanc - 0.2);
    if (lacas.v > lacas.plin * 0.02) fail(`gaură „${ch}": capul șurubului n-are loc — ${lacas.v.toFixed(1)} mm³ în locaș`);
    // Sub locaș trebuie să rămână material (altfel locașul ar fi doar o gaură mai mare).
    //
    // Sonda se așază în INELUL dintre gaura tijei și peretele locașului, cu poziția și raza
    // DERIVATE din cele două, nu scrise ca fracții fixe. Prima variantă folosea `rLacas * 0.6`
    // și rază 0.5 — potrivite pentru șurubul Ø6/Ø3 de atunci, dar la Ø5/Ø2.5 sonda ajunge peste
    // gaura tijei și acuză o geometrie corectă (a picat pe toate cele 36 de caractere). E a
    // treia oară când o sondă prost așezată dă verdict fals; de aceea acum se calculează.
    const rSonda = ((rLacas - r) / 2) * 0.8;
    const subLacas = sonda(cu.corpLitera, p[0] + (r + rLacas) / 2, p[1], rSonda, 0, G - adanc - 0.2);
    if (subLacas.v < subLacas.plin * 0.95) fail(`gaură „${ch}": locașul a mâncat toată grosimea (${subLacas.v.toFixed(2)} din ${subLacas.plin.toFixed(2)} mm³)`);
    // inelul din jurul LOCAȘULUI, plin pe toată grosimea
    const ext = Manifold.cylinder(G, rLacas + PERETE_GAURA - 0.3, rLacas + PERETE_GAURA - 0.3, 48, false).translate([p[0], p[1], 0]);
    const int = Manifold.cylinder(G + 2, rLacas + 0.3, rLacas + 0.3, 48, false).translate([p[0], p[1], -1]);
    const inel = ext.subtract(int);
    const plin = cu.corpLitera.intersect(inel);
    if (plin.volume() < inel.volume() * 0.98) {
      fail(`gaură „${ch}": peretele din jur nu e plin — ${plin.volume().toFixed(0)} din ${inel.volume().toFixed(0)} mm³`);
    }
    plin.delete(); inel.delete(); ext.delete(); int.delete();
    elibereaza(cu);
  }
  console.log(`    ✓ gaură cu locaș de cap, ${n} caractere: tija străpunge, capul are locaș, peretele din jur e plin · ${fara} fără loc${faraLoc.length ? ' (' + faraLoc.join(' ') + ')' : ''}`);
  if (fara > (n + fara) / 4) fail(`gaura n-a încăput la ${fara} din ${n + fara} caractere: ${faraLoc.join(' ')}`);

  // ---- CAPACUL — piesă separată, cu LOC SUB EL pentru capul șurubului ----
  //
  // Verificarea care contează: în locaș intră DOUĂ lucruri, capul și capacul. Un locaș adânc
  // cât capacul îl lasă afară cu toată înălțimea capului. Se măsoară spațiul rămas dedesubt,
  // nu adâncimea totală — a doua nu spune nimic singură.
  {
    const cu = buildFagure({ ...IMPLICIT, litera: 'A', font, tipAgatare: 'gaura' });
    const a = cu.diagnostice.agatare;
    if (!cu.corpCapac) fail('capacul n-a fost generat, deși e cerut');
    else {
      const bb = cu.corpCapac.boundingBox();
      const dCapac = bb.max[0] - bb.min[0], hCapac = bb.max[2] - bb.min[2];
      // 1. intră în locaș: mai mic decât el, dar nu cu mult
      if (dCapac >= IMPLICIT.surubCap + JOC_CAPAC) fail(`capacul (Ø${dCapac.toFixed(2)}) nu intră în locaș (Ø${(IMPLICIT.surubCap + JOC_CAPAC).toFixed(2)})`);
      if (dCapac < IMPLICIT.surubCap - 0.5) fail(`capacul (Ø${dCapac.toFixed(2)}) joacă în locaș`);
      // 2. SUB CAPAC rămâne loc pentru capul șurubului
      if (a.spatiuCap < IMPLICIT.inaltimeCapSurub - 1e-6) {
        fail(`sub capac au rămas ${a.spatiuCap} mm, iar capul șurubului are ${IMPLICIT.inaltimeCapSurub} — capacul ar ieși afară`);
      }
      // 3. fața capacului nu iese din literă
      if (bb.max[2] > IMPLICIT.grosime - 0.1) fail(`capacul iese din fața literei (z=${bb.max[2].toFixed(2)} la grosime ${IMPLICIT.grosime})`);
      // 4. e o piesă SEPARATĂ: nu se atinge de literă (altfel s-ar printa lipit)
      const atins = cu.corpCapac.intersect(cu.corpLitera);
      if (atins.volume() > 1e-6) fail(`capacul se suprapune cu litera (${atins.volume().toFixed(3)} mm³) — n-ar fi piesă separată`);
      atins.delete();
      // 5. locașul chiar e gol pe toată adâncimea, inclusiv sub capac
      const subCapac = sonda(cu.corpLitera, cu.diagnostice.agatare.pozitii[0][0], cu.diagnostice.agatare.pozitii[0][1],
        rLacas * 0.8, IMPLICIT.grosime - a.adancime + 0.2, a.spatiuCap - 0.2);
      if (subCapac.v > subCapac.plin * 0.02) fail(`sub capac nu e gol pentru capul șurubului (${subCapac.v.toFixed(2)} mm³)`);
      console.log(`    ✓ capac Ø${dCapac.toFixed(2)} × ${hCapac.toFixed(1)} mm în locaș Ø${(IMPLICIT.surubCap + JOC_CAPAC).toFixed(2)} × ${a.adancime} mm, cu ${a.spatiuCap} mm sub el pentru capul de ${IMPLICIT.inaltimeCapSurub} mm`);
    }
    elibereaza(cu);
  }

  // ---- capacul se subțiază dacă litera nu e destul de groasă, nu iese afară ----
  {
    const subtire = buildFagure({ ...IMPLICIT, litera: 'A', font, tipAgatare: 'gaura', grosime: 6 });
    const a = subtire.diagnostice.agatare;
    if (subtire.corpCapac) {
      const bb = subtire.corpCapac.boundingBox();
      if (bb.max[2] > 6 - 0.1) fail(`pe placă de 6 mm capacul iese din față (z=${bb.max[2].toFixed(2)})`);
      console.log(`    ✓ pe placă de 6 mm: locaș ${a.adancime} mm, capac ${a.grosimeCapac} mm, ${a.spatiuCap} mm sub el — nimic nu iese`);
    }
    elibereaza(subtire);
  }

  // ---- GRAVAT: sistemul de agățare NU se vede pe fața literei ----
  // Plasturele plin din jurul locașului are rost doar la STRĂPUNS, unde ține locașul prins.
  // La gravat placa e întreagă oricum, iar plasturele doar netezea tiparul — din față se citea
  // forma sistemului de agățare. Se verifică prin ARIA MODELULUI: cu locaș în spate trebuie să
  // rămână EXACT cât fără el.
  {
    for (const tip of ['cheie', 'grila'] as const) {
      // se caută o literă pe care sistemul CHIAR încape — „A" nu primește o agățătoare de
      // 20 mm, iar un eșec acolo n-ar spune nimic despre ce se verifică aici
      let gasit = false;
      for (const ch of CARACTERE) {
        if (font.charToGlyphIndex(ch) === 0) continue;
        const cu = buildFagure({ ...IMPLICIT, litera: ch, font, modModel: 'gravat', tipAgatare: tip });
        if (!cu.diagnostice.agatare.pozitii.length) { elibereaza(cu); continue; }
        const fara2 = buildFagure({ ...IMPLICIT, litera: ch, font, modModel: 'gravat', tipAgatare: 'fara' });
        const d0 = fara2.diagnostice.ariaModelMM2, d1 = cu.diagnostice.ariaModelMM2;
        if (Math.abs(d1 - d0) > 0.01) fail(`gravat + ${tip} „${ch}": tiparul de pe față s-a schimbat, ${d0} -> ${d1} mm² — sistemul de agățare se vede`);
        else console.log(`    ✓ gravat + ${tip} („${ch}"): locașul din spate nu atinge tiparul de pe față (${d0} mm², neschimbat)`);
        elibereaza(cu); elibereaza(fara2);
        gasit = true; break;
      }
      if (!gasit) fail(`gravat + ${tip}: n-a încăput la niciun caracter`);
    }
  }

  // ---- GAURA DE CHEIE ----
  // Cele trei lucruri care o fac să funcționeze, măsurate pe rezultat:
  //   1. NU străpunge — rămâne perete spre față
  //   2. capul șurubului intră în cercul mare
  //   3. fanta e DEASUPRA cercului (litera se lasă în jos peste șurub, deci față de literă
  //      șurubul urcă; invers, litera ar cădea de pe șurub)
  {
    const cheie = buildFagure({ ...IMPLICIT, litera: 'M', font, tipAgatare: 'cheie' });
    const p = cheie.diagnostice.agatare.pozitii[0];
    const adanc = cheie.diagnostice.agatare.adancime;
    if (!p) fail('gaura de cheie n-a încăput nici pe „M"');
    else {
      // 1. spre față trebuie să rămână material: sonda de la adâncimea locașului în sus e plină
      const spreFata = sonda(cheie.corpLitera, p[0], p[1], IMPLICIT.surubCap / 2 * 0.8, adanc + 0.2, G - adanc - 0.2);
      if (spreFata.v < spreFata.plin * 0.98) fail(`cheie: locașul a străpuns — ${spreFata.v.toFixed(0)} din ${spreFata.plin.toFixed(0)} mm³ spre față`);
      // 2. cercul mare e scobit pe adâncimea cerută, dinspre spate
      const capul = sonda(cheie.corpLitera, p[0], p[1], IMPLICIT.surubCap / 2 * 0.8, 0, adanc - 0.2);
      if (capul.v > capul.plin * 0.02) fail(`cheie: capul șurubului nu are loc — ${capul.v.toFixed(1)} mm³ de material în cerc`);
      // 3. fanta e DEASUPRA (y mai mic), nu dedesubt.
      // Sonda de „dedesubt" stă în PLASTURE, la o jumătate de milimetru sub marginea cercului,
      // nu la o cursă întreagă mai jos: acolo s-a ieșit deja din plasture, în fagure, iar
      // sonda ar găsi un gol al modelului și ar acuza pe nedrept. (Prima variantă chiar a picat
      // așa, pe o geometrie corectă.)
      const cursa = IMPLICIT.surubCap;
      const fanta = sonda(cheie.corpLitera, p[0], p[1] - cursa, IMPLICIT.surubTija / 2 * 0.7, 0, adanc - 0.2);
      const dedesubt = sonda(cheie.corpLitera, p[0], p[1] + IMPLICIT.surubCap / 2 + 0.75, 0.4, 0, adanc - 0.2);
      if (fanta.v > fanta.plin * 0.02) fail(`cheie: fanta nu e goală deasupra cercului (${fanta.v.toFixed(1)} mm³)`);
      if (dedesubt.v < dedesubt.plin * 0.9) fail(`cheie: sub cerc e gol — fanta pare inversată (${dedesubt.v.toFixed(2)} din ${dedesubt.plin.toFixed(2)} mm³)`);
      console.log(`    ✓ gaură de cheie: nu străpunge (${(G - adanc).toFixed(1)} mm perete), capul intră, fanta e DEASUPRA cercului`);
    }
    elibereaza(cheie);
  }

  // ---- CAPUL ȘURUBULUI CHIAR GLISEAZĂ ----
  //
  // Verificarea care LIPSEA, și din cauza asta locașul a plecat greșit. Cele trei sonde de mai
  // sus sunt toate adevărate și pe geometria stricată: locașul nu străpunge, cercul e gol, fanta
  // e deasupra. Ce nu se verifica e chiar rostul locașului — că primește capul ȘI că el poate
  // gliza. Cu un singur contur, fanta avea lățimea TIJEI la orice adâncime, deci capul intra în
  // cerc și rămânea acolo: litera se punea pe șurub și cădea înapoi. Se vedea pe piesa randată.
  //
  // Aici capul e simulat ca solid și i se cere drumul: LIBER pe toată cursa, la nivelul lui, și
  // BLOCAT de buza de la suprafață în poziția finală.
  for (const [tip, litera] of [['cheie', 'M'], ['grila', '8']] as ['cheie', 'M'][]) {
    const r = buildFagure({ ...IMPLICIT, litera, font, tipAgatare: tip });
    const a = r.diagnostice.agatare;
    if (!a.pozitii.length) { fail(`${tip}: n-a încăput pe „${litera}"`); elibereaza(r); continue; }
    const [px, py] = a.pozitii[0];
    const rCap = (IMPLICIT.surubCap + JOC_CAPAC) / 2, hCap = IMPLICIT.inaltimeCapSurub;
    // y crește în JOS: litera coborâtă înseamnă șurubul urcat. La „grila" capul intră oriunde pe
    // canal, dar centrul lui nu poate coborî sub marginea de jos cu mai mult de o rază.
    const yStart = tip === 'cheie' ? py : py - rCap;
    const yFinal = py - (tip === 'cheie' ? IMPLICIT.surubCap : 8);

    const disc = wasm.Manifold.cylinder(hCap, rCap, rCap, 48, false);
    let drum: any = null;
    for (let i = 0; i <= 8; i++) {
      const d = disc.translate([px, yStart + ((yFinal - yStart) * i) / 8, a.standoff]);
      if (drum) { const u = drum.add(d); drum.delete(); d.delete(); drum = u; } else drum = d;
    }
    const lovit = r.corpLitera.intersect(drum);
    const vLovit = lovit.volume();
    lovit.delete(); drum.delete(); disc.delete();
    if (vLovit > 1) fail(`${tip} „${litera}": capul se lovește de material pe drum (${vLovit.toFixed(1)} mm³) — nu poate gliza`);
    else console.log(`    ✓ ${tip} „${litera}" — capul Ø${IMPLICIT.surubCap} glisează liber ${(yStart - yFinal).toFixed(0)} mm, de la intrare la poziția finală`);

    // BUZA îl reține: la nivelul ei, în poziția finală, nu mai încape un cap. Se erodează golul
    // cu raza capului — dacă punctul final nu supraviețuiește, capul nu poate ieși drept.
    // NU se măsoară „cât la sută din inel e plin": la orice gaură de cheie fanta taie o felie
    // din inel, deci cifra iese ~74% oricât de bine ar fi făcut locașul.
    if (tip === 'cheie') {
      const sect = r.corpLitera.slice(a.standoff / 2);
      const mare = wasm.CrossSection.square([1000, 1000], true);
      const gol = mare.subtract(sect);
      const incape = gol.offset(-rCap, 'Round');
      const sonda2 = wasm.CrossSection.circle(0.2, 16).translate([px, yFinal]);
      const comun = incape.intersect(sonda2);
      const arie = comun.area();
      comun.delete(); sonda2.delete(); incape.delete(); gol.delete(); mare.delete(); sect.delete();
      if (arie > 1e-6) fail(`cheie „${litera}": la nivelul buzei încă încape un cap Ø${IMPLICIT.surubCap} — litera se trage de pe șurub`);
      else console.log(`    ✓ cheie „${litera}" — prin buză nu mai încape capul: rămâne captiv`);
    }
    elibereaza(r);
  }

  // ---- AGĂȚĂTOAREA CU DINȚI ----
  {
    // Sondele se fac pe PRIMA literă unde agățătoarea chiar încape, nu pe una aleasă dinainte.
    // Alegerea dinainte a fost greșită o dată: pariasem pe „M", ca literă lată — dar „M" are
    // exact la mijloc golul dintre picioare, deci e cel mai prost caz pentru o bandă orizontală,
    // nu cel mai bun. Eșec e doar dacă nu încape NICĂIERI.
    let grila: ReturnType<typeof buildFagure> | null = null, litG = '';
    for (const ch of CARACTERE) {
      if (font.charToGlyphIndex(ch) === 0) continue;
      const r2 = buildFagure({ ...IMPLICIT, litera: ch, font, tipAgatare: 'grila' });
      if (r2.diagnostice.agatare.pozitii.length) { grila = r2; litG = ch; break; }
      elibereaza(r2);
    }
    const p = grila?.diagnostice.agatare.pozitii[0];
    const adanc = grila?.diagnostice.agatare.adancime ?? 0;
    if (!grila || !p) fail('agățătoarea cu dinți nu încape la niciun caracter');
    else {
      // Sondele stau bine în interiorul PLASTURELUI: canalul e înalt de 8 mm, iar plasturele îl
      // depășește cu 1.5 mm, deci o sondă de Ø12 la 4 mm deasupra ancorei iese deja în fagure și
      // găsește goluri ale modelului. (A picat exact așa, pe o geometrie corectă.)
      const spreFata = sonda(grila.corpLitera, p[0], p[1] - 4, 3, adanc + 0.2, G - adanc - 0.2);
      if (spreFata.v < spreFata.plin * 0.98) fail(`grilă: canalul a străpuns — ${spreFata.v.toFixed(0)} din ${spreFata.plin.toFixed(0)} mm³`);
      const canal = sonda(grila.corpLitera, p[0], p[1] - 4, 2, 0, adanc - 0.2);
      if (canal.v > canal.plin * 0.05) fail(`grilă: canalul nu e gol (${canal.v.toFixed(1)} mm³)`);
      console.log(`    ✓ agățătoare cu dinți („${litG}"): canal gol pe ${adanc} mm, perete întreg spre față`);
    }
    if (grila) elibereaza(grila);
  }

  // ---- LITERA ATÂRNĂ DREAPTĂ ----
  // Punctul de sprijin trebuie sa fie pe verticala CENTRULUI DE MASĂ, nu pe mijlocul
  // dreptunghiului — altfel litera se rotește pe perete. Se cere pe tot alfabetul: fie
  // înclinare sub o jumătate de grad, fie o valoare raportată onest, niciodată mai mult decât
  // atât cât permite căutarea laterală.
  {
    let stramb = 0, fara2 = 0, maxi = 0, chMax = '', n2 = 0, doua = 0;
    const lipsa: string[] = [];
    for (const ch of CARACTERE) {
      if (font.charToGlyphIndex(ch) === 0) continue;
      n2++;
      const rez = buildFagure({ ...IMPLICIT, litera: ch, font, tipAgatare: 'cheie' });
      const d = rez.diagnostice.agatare;
      // „n-are loc" e un rezultat legitim, raportat în interfață — o literă îngustă chiar
      // n-are unde să primească locașul cu perete întreg. Nu e eșec de unul singur; ar fi
      // dacă s-ar întâmpla pe jumătate de alfabet.
      if (!d.pozitii.length) { fara2++; lipsa.push(ch); elibereaza(rez); continue; }
      if (d.pozitii.length === 2) {
        doua++;
        // două puncte trebuie să fie SIMETRICE față de centrul de masă și la ACEEAȘI înălțime,
        // altfel n-ar rezolva nimic — litera s-ar roti tot până centrul de masă ajunge dedesubt
        const [a, b2] = d.pozitii;
        if (Math.abs(a[1] - b2[1]) > 1e-6) fail(`cheie „${ch}": cele două puncte nu sunt la aceeași înălțime (${a[1]} / ${b2[1]})`);
        if (Math.abs(d.inclinare) > 1e-9) fail(`cheie „${ch}": două puncte, dar înclinare raportată ${d.inclinare}°`);
      }
      const inc = Math.abs(d.inclinare);
      if (inc >= 0.5) { stramb++; if (inc > maxi) { maxi = inc; chMax = ch; } }
      // sub centrul de masă litera s-ar întoarce cu susul în jos; deasupra dar mult lateral
      // s-ar culca. Amândouă sunt oprite în căutare, nu doar raportate.
      if (inc > 10.5) fail(`cheie „${ch}": înclinare ${d.inclinare}° — peste limita de 10° a căutării`);
      elibereaza(rez);
    }
    if (fara2 > n2 / 3) fail(`gaura de cheie n-a încăput la ${fara2} din ${n2} caractere: ${lipsa.join(' ')}`);
    console.log(`    ✓ gaură de cheie, ${n2} caractere: ${n2 - stramb - fara2 - doua} dintr-un punct pe verticala centrului de masă, ${doua} din DOUĂ puncte simetrice, ${stramb} înclinate (maxim ${maxi.toFixed(1)}°${chMax ? ' la „' + chMax + '"' : ''}), ${fara2} fără loc${lipsa.length ? ' (' + lipsa.join(' ') + ')' : ''}`);
  }

  // ---- ce nu încape e REFUZAT, nu forțat ----
  const uriasa = buildFagure({ ...IMPLICIT, litera: 'I', font, tipAgatare: 'grila', latimeGrila: 80 });
  if (uriasa.diagnostice.agatare.pozitii.length) fail('o agățătoare de 80 mm a fost acceptată pe „I" (litera are 38 mm)');
  else console.log('    ✓ agățătoarea care nu încape e refuzată, nu forțată');
  elibereaza(uriasa);

  // ---- ORIENTAREA DE PRINT: locașul din spate se printează cu spatele în SUS ----
  const cheie2 = buildFagure({ ...IMPLICIT, litera: 'M', font, tipAgatare: 'cheie' });
  const pc = cheie2.diagnostice.agatare.pozitii[0];
  if (!pc) fail('gaura de cheie n-a încăput pe „M" — nu se poate verifica orientarea de print');
  else {
    const normal = pentruPrint(cheie2.corpLitera), intors = pentruPrint(cheie2.corpLitera, true);
    const bbI = intors.boundingBox();
    if (Math.abs(bbI.min[2]) > 1e-6) fail(`piesa întoarsă nu stă pe placă: minZ = ${bbI.min[2]}`);
    if (Math.abs(intors.volume() - normal.volume()) > 1e-3) fail('întoarcerea a schimbat volumul — nu mai e o rotație');
    // locașul e deschis la z mic în varianta normală și la z mare în cea întoarsă.
    // `pentruPrint` oglindește Y, deci sonda merge la −y față de coordonatele modelului.
    const jos = sonda(normal, pc[0], -pc[1], 2, 0, 1);
    const susI = sonda(intors, pc[0], pc[1], 2, bbI.max[2] - 1, 1);
    if (jos.v > jos.plin * 0.02) fail('varianta normală: locașul nu e deschis la spate');
    if (susI.v > susI.plin * 0.02) fail('varianta întoarsă: locașul nu a ajuns sus');
    console.log(`    ✓ întoarsă cu spatele în sus: minZ=0, volum neschimbat (${normal.volume().toFixed(0)} mm³), locașul deschis în sus`);
    normal.delete(); intors.delete();
  }
  elibereaza(cheie2);
}

// ---------------------------------------------------------------------------
// EXPORTUL NU IESE ÎN OGLINDĂ.
//
// Viewport-ul afișează modelul ca (x, −y, z), fiindcă fonturile vin cu y în jos. Exportul
// trebuie să aplice aceeași oglindire; altfel fișierul iese invers față de ce s-a văzut pe
// ecran — exact defectul care a scăpat o dată la aplicația de litere și s-a văzut pe placă.
//
// Verificarea nu compară cu construcția (ar fi tautologică), ci cu o proprietate a literei:
// după orientarea de print, „P" are materialul concentrat SUS (bucla), iar „L" JOS (talpa).
// O oglindire în plus le inversează pe amândouă.
// ---------------------------------------------------------------------------
console.log('\n  exportul nu iese în oglindă:');
{
  const f = FONTS.find((x) => x.includes('ArchivoBlack')) ?? FONTS[0];
  const font = load(f);
  /** fracțiunea de material din jumătatea de SUS a piesei, în orientarea de print */
  const fractiuneSus = (ch: string): number => {
    const r = buildFagure({ ...IMPLICIT, litera: ch, font });
    const m = pentruPrint(r.corpLitera);
    const bb = m.boundingBox();
    const mij = (bb.min[1] + bb.max[1]) / 2;
    const cutie = wasm.Manifold.cube([bb.max[0] - bb.min[0] + 2, (bb.max[1] - bb.min[1]) / 2 + 1, bb.max[2] - bb.min[2] + 2])
      .translate([bb.min[0] - 1, mij, bb.min[2] - 1]);
    const sus = m.intersect(cutie);
    const fr = sus.volume() / m.volume();
    sus.delete(); cutie.delete(); m.delete(); elibereaza(r);
    return fr;
  };
  for (const [ch, unde] of [['P', 'sus'], ['L', 'jos']] as [string, string][]) {
    if (font.charToGlyphIndex(ch) === 0) continue;
    const fr = fractiuneSus(ch);
    const ok = unde === 'sus' ? fr > 0.55 : fr < 0.45;
    if (!ok) fail(`„${ch}": ${(fr * 100).toFixed(0)}% din material e sus — se aștepta materialul preponderent ${unde}; exportul pare oglindit`);
    else console.log(`    ✓ „${ch}" — ${(fr * 100).toFixed(0)}% din material sus (așteptat: preponderent ${unde})`);
  }
}

// ---------------------------------------------------------------------------
if (esecuri.length) {
  console.error(`\n❌ VERIFICĂRI PICATE (${esecuri.length}):`);
  for (const e of esecuri.slice(0, 40)) console.error(e);
  if (esecuri.length > 40) console.error(`  … și încă ${esecuri.length - 40}`);
  console.error('');
  // vezi regula din docs/design/: process.exit dupa manifold crapa libuv pe Windows
  process.exitCode = 1;
} else {
  console.log(`\n✅ Litere Fagure OK — ${testate} combinații, conectivitate păstrată, zero așchii, pereți peste ${TRASATURA_MIN} mm.\n`);
}
