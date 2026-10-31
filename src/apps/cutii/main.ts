/**
 * APP CUTII LITERE — implementează AppDefinition și rulează prin nucleu (runApp).
 * Nu cablează nimic imperativ din nucleu: declară controale, construiește geometrie.
 * Nu importă NIMIC din alte aplicații (izolare). Solidul din font vine din
 * core/geometry/textSolid.ts, registrul de fonturi din core/assets/fonts.ts.
 */
import { t as tr } from '../../core/i18n/index.js';
import type { AppDefinition, PanelControl, PanelGroup, SceneObject, StatusItem, ExportBody } from '../../core/app.js';
import { runApp } from '../../core/ui/shell.js';
import { manifoldToGeometry, initManifold } from '../../core/geometry/manifold.js';
import { inArena, adunaHandle, elibereaza } from '../../core/geometry/arena.js';
import { configureManifold as configCutii, buildCutie, pentruPrint, ABATERE_MAX, CAMERA_LATIME_MIN, FANTA_MIN, PATA_MAX, TRASATURA_MIN, PERETE_MIN, PERETE_MAX, INALTIME_MIN, INALTIME_MAX, MATERIAL_PESTE_LOCAS, TIPARE, FORME_GOL, evalueazaFont, type CutiiResult, type ModProdus, type TipAgatare, type ModelFund, type FormaGol, type VerdictFont } from './cutii.js';
import { loadFontManifest, loadFont, fontCached, fontGroups, previewURL, allFonts } from '../../core/assets/fonts.js';
import { creeazaEvaluatorFonturi } from '../../core/assets/evaluare-fonturi.js';

interface State {
  litera: string;
  font: string;
  inaltimeLitera: number;
  adancime: number;
  grosimePerete: number;
  grosimeFund: number;
  modProdus: ModProdus;
  tipAgatare: TipAgatare;
  surubCap: number;
  surubTija: number;
  latimeGrila: number;
  inaltimeCapSurub: number;
  modelFund: ModelFund;
  pasFund: number;
  pereteFund: number;
  unghiFund: number;
  variantaFund: number;
  ramaFund: number;
  traforPereti: boolean;
  formaGol: FormaGol;
  deschidere: number;
  nervura: number;
  bandaJos: number;
  buzaSus: number;
  culoare: string;
}
const state: State = {
  litera: 'A',
  font: 'ArchivoBlack-Regular.ttf',
  // 120 mm: la mai puțin, peretele de 2.5 mm mănâncă trăsătura și nu mai rămâne interior
  // la majoritatea fonturilor — condiția e trăsătura ≥ 2×perete + 6 mm de cameră.
  inaltimeLitera: 120,
  adancime: 60,
  grosimePerete: 2.5,
  // FUNDUL RĂMÂNE PLIN, și e o decizie, nu o lipsă: buretele floral e ud, iar lichenul trebuie
  // să stea pe ceva. Fundul cu model va fi opțiune secundară, nu implicită.
  grosimeFund: 2,
  // se deschide ca CUTIE DE MASĂ: e configurația etanșă, cea care nu poate dezamăgi. Modul de
  // perete se alege, cu tot ce aduce el (agățare obligatorie, lichen uscat).
  modProdus: 'masa',
  tipAgatare: 'fara',
  // șurub mic de perete, cap Ø5 / tijă Ø2.5 — aceeași calibrare ca la Litere Fagure, măsurată
  // acolo: de când locașul e CANAL ÎN T, camera capului e lată cât el pe toată cursa, deci
  // plasturele crește. La Ø6 pică 12 caractere din 36 (Baloo2, 120 mm), la Ø5 doar 2.
  surubCap: 5,
  surubTija: 2.5,
  latimeGrila: 20,
  // capul unui surub de perete Ø6 are ~3 mm; adancimea locasului se CALCULEAZA din el
  inaltimeCapSurub: 3,
  // FUNDUL PLIN E IMPLICITUL, și rămâne așa: e singura configurație în care buretele ud se
  // poate pune direct. Modelul de fund e opțiune, cu avertisment de etanșeitate.
  modelFund: 'fara',
  pasFund: 8,
  pereteFund: 1.6,
  unghiFund: 0,
  variantaFund: 1,
  ramaFund: 2,
  // TRAFORAREA PEREȚILOR — implicit OPRITĂ, ca și fundul: cutia se deschide etanșă. Se aprinde
  // pentru vegetație, și atunci golurile sunt MARI, nu fine.
  traforPereti: false,
  formaGol: 'hexagon',
  // 14 mm: sub 10 lichenul nu mai iese prin gol și se vede doar un perete găurit. Peste 18 nu
  // mai rămâne perete între ele la o literă de dimensiuni obișnuite.
  deschidere: 14,
  // 2.5, nu 1.6 ca la modelele fine: cutia se ține în mână plină cu material umed
  nervura: 2.5,
  // acolo se concentrează efortul și acolo stă apa
  bandaJos: 10,
  // ține forma la gură, unde peretele se deschide
  buzaSus: 6,
  culoare: '#8FBF6A',
};

/**
 * Ce se poate genera. Cutia stă CULCATĂ, cu gura în sus — deci, spre deosebire de literele în
 * picioare, forma n-ar împiedica diacriticele. Nu se oferă totuși: căciula lui „Ă" ar deveni o
 * cutiuță separată de câțiva milimetri, adică o piesă în plus pe placă și un gol în care nu
 * încape nimic. Se poate adăuga mai târziu, ca decizie de produs, nu din inerție.
 */
const CARACTERE: { grup: string; caractere: string[] }[] = [
  { grup: 'litere', caractere: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('') },
  { grup: 'cifre', caractere: '0123456789'.split('') },
];

let ctx: { refresh(): void } | null = null;
let last: CutiiResult | null = null;

/**
 * MEMORIA WASM. Obiectele Manifold sunt handle-uri embind: memoria lor sta in heap-ul WASM si
 * GC-ul JS n-o atinge. Fara arena, aceasta aplicatie crea obiecte la fiecare reconstructie
 * fara ca nimeni sa le numere; heap-ul creste pana cand WASM-ul incepe sa arunce, iar pe
 * ecran ramane modelul vechi. Acelasi tipar ca in apps/litere/build.ts; se verifica din
 * consola cu `__shell.contorArena()`, care trebuie sa ramana pe 0 intre reconstructii.
 */
function construieste(): CutiiResult {
  const r = inArena(() => buildCutie(config()), (rez) => [rez]);
  // rezultatul precedent nu mai e afisat si nu mai poate fi exportat. Daca constructia ar fi
  // aruncat, am fi iesit mai sus si precedentul ar fi ramas viu — corect, pe ecran ramane el.
  if (last) {
    const vii = adunaHandle(r);
    const deSters: any[] = [];
    for (const o of adunaHandle(last)) if (!vii.has(o)) deSters.push(o);
    elibereaza(deSters);
  }
  last = r;
  return r;
}
const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]/g, '') || 'x';

/** opțiunile selectorului de caracter, filtrate după ce are fontul ales */
function optiuniCaracter(): { value: string; label: string; grup: string }[] {
  const font = fontCached(state.font);
  const are = (ch: string) => !font || font.charToGlyphIndex(ch) !== 0;
  const out: { value: string; label: string; grup: string }[] = [];
  for (const g of CARACTERE) for (const ch of g.caractere) if (are(ch)) out.push({ value: ch, label: ch, grup: tr('cutii.grup_' + g.grup) });
  // caracterul curent rămâne în listă chiar dacă fontul nu-l are: altfel selectorul ar arăta
  // altceva decât modelul
  if (!out.some((o) => o.value === state.litera)) out.unshift({ value: state.litera, label: state.litera, grup: tr('cutii.grup_litere') });
  return out;
}

/**
 * VERDICTELE FONTURILOR, evaluate în FUNDAL.
 *
 * Filtrarea trebuie să fie dinamică — la 120 mm un font cursiv e respins, la 200 nu — deci nu
 * poate fi o listă. Dar măsurătoarea cere parsarea fontului și un textSolid, adică vreo 25 ms
 * de fiecare, iar la 22 de fonturi asta ar fi o secundă la fiecare mișcare de cursor.
 *
 * Deci se evaluează O SINGURĂ dată per configurație (literă + înălțime + perete), în fundal,
 * după primul randat, cu o cedare de fir între fonturi ca interfața să nu înghețe. Până sosesc
 * rezultatele niciun font nu e marcat — mai bine niciun avertisment decât unul fals.
 *
 * NU se face la pornire, în bloc: încărcarea leneșă a fonturilor e chiar reparația care a adus
 * boot-ul de la 10 s la 1 s, și n-are rost desfăcută.
 */
const evaluator = creeazaEvaluatorFonturi<VerdictFont>(
  // configurația de care depinde verdictul: literă, înălțime, perete
  () => `${state.litera}|${state.inaltimeLitera}|${state.grosimePerete}`,
  (font) => evalueazaFont(font, state.litera, state.inaltimeLitera, state.grosimePerete),
);

/** motivul afișat sub un font respins — cu cifre, ca peste tot în aplicație */
function motivRespins(v: VerdictFont): string {
  return tr(v.inaltimeMinMM ? 'cutii.fontRespinsInalt' : 'cutii.fontRespins',
    { trasatura: v.trasaturaMaxMM.toFixed(1), necesar: v.necesarMM.toFixed(1), inaltmin: v.inaltimeMinMM });
}

function fontControl(): PanelControl {
  const item = (f: { fisier: string; familie: string; lipsaDiacritice: string[] }) => {
    const v = evaluator.verdict(f.fisier);
    return { value: f.fisier, label: f.familie, url: previewURL(f as any), missing: f.lipsaDiacritice,
      ...(v && !v.ok ? { respins: motivRespins(v) } : {}) };
  };
  const grupuri = fontGroups().map((g) => ({ categorie: g.categorie, items: g.items.map(item) }));
  /**
   * Grupul „recomandate": fonturile care merg chiar la cea mai mică literă din panou, deci la
   * orice mărime rezonabilă. Iese din ACEEAȘI măsurătoare — un font merge la înălțimea h dacă
   * h ≥ înălțimea lui minimă — nu dintr-o listă ținută de mână.
   *
   * Fonturile apar și în categoria lor: grupul e o scurtătură, nu o altă clasificare.
   */
  const recomandate = fontGroups().flatMap((g) => g.items)
    .filter((f) => { const v = evaluator.verdict(f.fisier); return v && v.ok && v.inaltimeMinMM && v.inaltimeMinMM <= INALTIME_MIN; })
    .map(item);
  /**
   * Verdictul UNUI font, cerut de nucleu cand randul lui devine vizibil in lista.
   *
   * Fontul se descarca si se parseaza aici, o singura data. Inainte, aceeasi masuratoare se
   * facea pentru toate familiile la pornire — 204 fisiere pentru un panou inchis.
   */
  const cereVerdict = async (fisier: string): Promise<string | null> => {
    const v = await evaluator.cere(fisier);
    return v && !v.ok ? motivRespins(v) : null;
  };
  return { kind: 'fontselect', cereVerdict, key: 'font', label: tr('cutii.font'), value: state.font,
    groups: recomandate.length ? [{ categorie: tr('cutii.fonturiRecomandate'), items: recomandate }, ...grupuri] : grupuri };
}


const config = () => ({
  litera: state.litera, font: fontCached(state.font),
  inaltimeLitera: state.inaltimeLitera, adancime: state.adancime,
  grosimePerete: state.grosimePerete, grosimeFund: state.grosimeFund,
  tipAgatare: state.tipAgatare, surubCap: state.surubCap, surubTija: state.surubTija,
  latimeGrila: state.latimeGrila, inaltimeCapSurub: state.inaltimeCapSurub,
  modelFund: state.modelFund, pasFund: state.pasFund, pereteFund: state.pereteFund,
  unghiFund: state.unghiFund, variantaFund: state.variantaFund, ramaFund: state.ramaFund,
  traforPereti: state.traforPereti, formaGol: state.formaGol, deschidere: state.deschidere,
  nervura: state.nervura, bandaJos: state.bandaJos, buzaSus: state.buzaSus,
});

/** eticheta unui tipar; cheile sunt „cutii.tiparFagure", „cutii.tiparPerforat" ș.a.m.d. */
const numeTipar = (m: string) => tr('cutii.tipar' + m[0].toUpperCase() + m.slice(1));

const app: AppDefinition = {
  title: 'cutii',
  id: 'cutii',

  async init(c) {
    ctx = c;
    // nucleul pornește modulul geometric; aplicația doar îl pasează logicii produsului
    configCutii(await initManifold());
    await loadFontManifest();
    // fontul implicit se poate să nu existe în folder -> prima alternativă non-cursivă
    if (!allFonts().some((f) => f.fisier === state.font)) {
      state.font = (fontGroups().find((g) => g.categorie !== 'Cursiv')?.items[0] ?? allFonts()[0])?.fisier ?? '';
    }
    if (state.font) await loadFont(state.font).catch(() => { /* font indisponibil */ });
  },

  async reloadLibraries() { await loadFontManifest(); },

  panels(): PanelGroup[] {
    return [
      { title: tr('cutii.grupLitera'), controls: [
        { kind: 'select', key: 'litera', label: tr('cutii.litera'), value: state.litera, options: optiuniCaracter() },
        fontControl(),
        // limitele vin din modulul de geometrie, nu de aici: panoul și sfatul din bara de stare
        // trebuie să nu se poată contrazice (vezi `remediu`)
        { kind: 'number', key: 'inaltimeLitera', label: tr('cutii.inaltime'), min: INALTIME_MIN, max: INALTIME_MAX, step: 5, value: state.inaltimeLitera },
        { kind: 'color', key: 'culoare', label: tr('cutii.culoare'), value: state.culoare },
      ] },
      { title: tr('cutii.grupCutie'), controls: [
        { kind: 'select', key: 'modProdus', label: tr('cutii.modProdus'), value: state.modProdus, options: [
          { value: 'masa', label: tr('cutii.modMasa') },
          { value: 'perete', label: tr('cutii.modPerete') },
        ] },
        { kind: 'number', key: 'adancime', label: tr('cutii.adancime'), min: 20, max: 150, step: 5, value: state.adancime },
        { kind: 'number', key: 'grosimePerete', label: tr('cutii.grosimePerete'), min: PERETE_MIN, max: PERETE_MAX, step: 0.1, value: state.grosimePerete },
        { kind: 'number', key: 'grosimeFund', label: tr('cutii.grosimeFund'), min: 1.2, max: 6, step: 0.2, value: state.grosimeFund },
      ] },
      { title: tr('cutii.grupPereti'), controls: [
        { kind: 'checkbox', key: 'traforPereti', label: tr('cutii.traforPereti'), value: state.traforPereti },
        ...(state.traforPereti ? [
          { kind: 'select', key: 'formaGol', label: tr('cutii.formaGol'), value: state.formaGol,
            options: FORME_GOL.map((f) => ({ value: f, label: tr('cutii.gol' + f[0].toUpperCase() + f.slice(1)) })) } as PanelControl,
          { kind: 'number', key: 'deschidere', label: tr('cutii.deschidere'), min: 8, max: 24, step: 1, value: state.deschidere } as PanelControl,
          { kind: 'number', key: 'nervura', label: tr('cutii.nervura'), min: 1.6, max: 6, step: 0.1, value: state.nervura } as PanelControl,
          { kind: 'number', key: 'bandaJos', label: tr('cutii.bandaJos'), min: 4, max: 30, step: 1, value: state.bandaJos } as PanelControl,
          { kind: 'number', key: 'buzaSus', label: tr('cutii.buzaSus'), min: 3, max: 20, step: 1, value: state.buzaSus } as PanelControl,
          // câte rânduri intră NU e un parametru, e un rezultat: iese din adâncime minus banda
          // și buza, împărțit la deschidere plus nervură. Se arată ca să se vadă ce câștigă
          // omul mărind adâncimea — la 60 mm intră două, la 100 intră cinci.
          { kind: 'note', key: 'notaRanduri', label: tr('cutii.randuri'),
            value: tr('cutii.randuriCalcul', { n: last?.diagnostice.trafor.randuri ?? 0,
              peRand: last?.diagnostice.trafor.peRand ?? 0, banda: (last?.diagnostice.trafor.bandaMM ?? 0).toFixed(0) }) } as PanelControl,
        ] : []),
      ] },
      { title: tr('cutii.grupFund'), controls: [
        { kind: 'select', key: 'modelFund', label: tr('cutii.modelFund'), value: state.modelFund, options: [
          { value: 'fara', label: tr('cutii.fundPlin') },
          ...TIPARE.map((m) => ({ value: m, label: numeTipar(m) })),
        ] } as PanelControl,
        // parametrii tiparului n-au ce căuta în panou cât fundul e plin
        ...(state.modelFund !== 'fara' ? [
          { kind: 'number', key: 'pasFund', label: tr('cutii.pasFund'), min: 4, max: 25, step: 0.5, value: state.pasFund } as PanelControl,
          { kind: 'number', key: 'pereteFund', label: tr('cutii.pereteFund'), min: 1, max: 4, step: 0.1, value: state.pereteFund } as PanelControl,
          { kind: 'number', key: 'ramaFund', label: tr('cutii.ramaFund'), min: 0, max: 10, step: 0.5, value: state.ramaFund } as PanelControl,
          { kind: 'number', key: 'unghiFund', label: tr('cutii.unghiFund'), min: 0, max: 90, step: 5, value: state.unghiFund } as PanelControl,
          // „varianta" contează DOAR la voronoi; la restul ar fi un buton mort
          ...(state.modelFund === 'voronoi'
            ? [{ kind: 'number', key: 'variantaFund', label: tr('cutii.variantaFund'), min: 1, max: 999, step: 1, value: state.variantaFund } as PanelControl]
            : []),
        ] : []),
      ] },
      // grupul de agățare apare doar în modul perete: la o cutie de masă ar fi un panou mort
      ...(state.modProdus === 'perete' ? [{ title: tr('cutii.grupAgatare'), controls: [
        { kind: 'select', key: 'tipAgatare', label: tr('cutii.tipAgatare'), value: state.tipAgatare, options: [
          { value: 'cheie', label: tr('cutii.agatareCheie') },
          { value: 'grila', label: tr('cutii.agatareGrila') },
          { value: 'fara', label: tr('cutii.agatareFara') },
        ] } as PanelControl,
        ...(state.tipAgatare === 'cheie' ? [
          { kind: 'number', key: 'surubCap', label: tr('cutii.surubCap'), min: 5, max: 16, step: 0.5, value: state.surubCap } as PanelControl,
          { kind: 'number', key: 'surubTija', label: tr('cutii.surubTija'), min: 2, max: 8, step: 0.5, value: state.surubTija } as PanelControl,
        ] : []),
        ...(state.tipAgatare === 'grila' ? [
          { kind: 'number', key: 'latimeGrila', label: tr('cutii.latimeGrila'), min: 12, max: 80, step: 2, value: state.latimeGrila } as PanelControl,
        ] : []),
        ...(state.tipAgatare !== 'fara' ? [
          { kind: 'number', key: 'inaltimeCapSurub', label: tr('cutii.inaltimeCapSurub'), min: 1.5, max: 8, step: 0.5, value: state.inaltimeCapSurub } as PanelControl,
          // ADANCIMEA nu e parametru: in locas intra tija pe standoff plus capul pe inaltimea
          // lui. Se ARATA ca rezultat, ca omul sa vada cat se sapa.
          { kind: 'note', key: 'notaAdanc', label: tr('cutii.adancimeLocas'),
            value: tr('cutii.adancimeLocasCalcul', { adanc: (last?.diagnostice.agatare.adancime ?? 0).toFixed(1),
              standoff: (last?.diagnostice.agatare.standoff ?? 0).toFixed(1), cap: state.inaltimeCapSurub }) } as PanelControl,
          // plasturele nu e parametru: se CALCULEAZĂ din adâncime + materialul care trebuie să
          // rămână peste locaș. Un parametru liber ar fi permis exact configurația care se rupe.
          { kind: 'note', key: 'notaPlasture', label: tr('cutii.plasture'),
            value: tr('cutii.plasureCalcul', { h: (last?.diagnostice.agatare.inaltimePlasture ?? 0).toFixed(1),
              peste: MATERIAL_PESTE_LOCAS }) } as PanelControl,
        ] : []),
      ] }] : []),
    ];
  },

  onControl(key, value) {
    // MODUL mută implicitele odată. O cutie de perete fără agățare e o cutie pe care n-ai cum
    // s-o pui pe perete; una de masă cu locaș în fund e o cutie care se clatină.
    if (key === 'modProdus') {
      state.modProdus = value as ModProdus;
      if (state.modProdus === 'perete' && state.tipAgatare === 'fara') state.tipAgatare = 'cheie';
      // pe masă buretele e ud: fundul se închide la loc, altfel curge pe masă
      if (state.modProdus === 'masa') { state.tipAgatare = 'fara'; state.modelFund = 'fara'; }
      return;
    }
    if (key === 'font') {
      const nouFont = value as string;
      // NU comutam starea pana nu avem fontul PARSAT. Reconstructia porneste imediat dupa
      // `onControl`, iar cu fontul inca nesosit `textSolid` pica pe `unitsPerEm` si pe ecran
      // ramane modelul vechi, cu un mesaj de eroare. Inainte nu se vedea, fiindca evaluatorul
      // parsase deja toate fonturile la pornire — adica exact ce am scos.
      if (fontCached(nouFont)) { state.font = nouFont; return; }
      loadFont(nouFont).then(() => { state.font = nouFont; ctx?.refresh(); })
        .catch(() => { /* font indisponibil: ramane cel de dinainte */ });
      return;
    }
    (state as any)[key] = value;
  },

  rebuild() {
    const r = construieste();
    // evaluarea fonturilor pleacă în fundal, fără să blocheze randarea; se oprește singură
    // dacă rezultatele pentru configurația curentă există deja
    const d = r.diagnostice;
    // Cutia stă CULCATĂ, cu gura în sus: adâncimea (axa Z a modelului) trebuie să ajungă pe
    // verticala lumii. Rotația cu +90° pe X face exact asta — iar fiindcă viewport-ul aplică
    // el însuși oglindirea pe Y (vezi manifoldToGeometry), ce se vede pe ecran e chiar piesa
    // exportată, doar rotită: mirror∘rot(θ) = rot(−θ)∘mirror. Nu e altă geometrie.
    // Fundul ajunge fix la Y=0 (placa), iar silueta e deja centrată din construcție.
    const culcat = r.corpCutie.rotate([90, 0, 0]);
    const geom = manifoldToGeometry(culcat);
    culcat.delete();

    const objects: SceneObject[] = [
      { id: 'cutie', nume: tr('cutii.numeCutie', { litera: state.litera }),
        geometry: geom, color: state.culoare, movable: false, warn: d.bucati !== d.bucatiLitera },
    ];
    const f = (n: number, k = 1) => n.toLocaleString('en-US', { maximumFractionDigits: k });
    const status: StatusItem[] = [
      { key: 'litera', text: tr('cutii.statusLitera', { w: f(d.dimLitera[0]), h: f(d.dimLitera[1]),
        a: f(state.adancime), t: f(d.inaltimeTotala) }) },
      // VOLUMUL UTIL — cel mai valoros număr din aplicație. „Cutia ține 340 ml" e informație de
      // vânzare, nu detaliu tehnic, deci stă sus, nu printre diagnostice.
      d.camereUtile === 0
        ? { key: 'volum', text: tr('cutii.statusFaraVolum'), warn: true }
        : { key: 'volum', text: tr(d.camereUtile > 1 ? 'cutii.statusVolumMulte' : 'cutii.statusVolum', {
          ml: f(d.volumUtilML), n: d.camereUtile, arie: f(d.ariaCavitateMM2, 0) }) },
      { key: 'pereti', text: tr('cutii.statusPereti', { p: f(state.grosimePerete, 2), fund: f(state.grosimeFund),
        material: f(d.materialCM3) }) },
    ];
    /**
     * Ce se poate schimba ca să iasă cutie. Se compune din bucăți fiindcă sfaturile IMPOSIBILE
     * trebuie să dispară, nu să fie afișate cu valori absurde: „subțiază peretele la 0 mm" a
     * ieșit chiar așa în aplicație, la un font subțire. Când nu merge niciuna, răspunsul corect
     * nu e un parametru, ci alt font.
     */
    const remediu = (rp: NonNullable<typeof d.reparatie>) =>
      rp.potPerete && rp.potInaltime ? tr('cutii.remediuAmandoua', { peretemax: f(rp.peretMaxMM), inaltmin: f(rp.inaltimeMinMM, 0) })
        : rp.potPerete ? tr('cutii.remediuPerete', { peretemax: f(rp.peretMaxMM) })
          : rp.potInaltime ? tr('cutii.remediuLitera', { peretemin: f(PERETE_MIN), inaltmin: f(rp.inaltimeMinMM, 0) })
            : tr('cutii.remediuFont', { peretemin: f(PERETE_MIN), inaltmax: f(INALTIME_MAX, 0) });
    // NU RĂMÂNE INTERIOR — avertismentul cu valori concrete, nu generic: omul trebuie să afle
    // din bara de stare exact ce parametru să miște și până unde.
    if (d.reparatie) {
      const rp = d.reparatie;
      status.push({ key: 'interior', text: tr(d.interiorGol ? 'cutii.statusFaraInterior' : 'cutii.statusInteriorIngust', {
        litera: state.litera, p: f(state.grosimePerete, 2), trasatura: f(rp.trasaturaMaxMM),
        necesar: f(rp.necesarMM), camera: f(CAMERA_LATIME_MIN, 0), remediu: remediu(rp) }), warn: true });
    } else if (d.volumPierdutML > 0) {
      // camere prea înguste, dar cutia are și camere bune: e o notă, nu o oprire
      const n = d.camere.length - d.camereUtile;
      status.push({ key: 'inguste', text: tr(n > 1 ? 'cutii.statusCamereIngusteMulte' : 'cutii.statusCamereInguste', {
        n, min: f(CAMERA_LATIME_MIN, 0), ml: f(d.volumPierdutML) }) });
    }
    if (d.fanteUmplute) {
      status.push({ key: 'fante', text: tr(d.fanteUmplute > 1 ? 'cutii.statusFanteUmpluteMulte' : 'cutii.statusFanteUmplute',
        { n: d.fanteUmplute, prag: f(FANTA_MIN, 1) }) });
    }
    // AGĂȚAREA — dacă a fost cerută dar n-a încăput, se SPUNE. O cutie fără sistem de agățare
    // se vede și se repară dintr-un parametru; una plecată așa la print se descoperă pe perete.
    if (state.tipAgatare !== 'fara') {
      const a = d.agatare;
      const numeTip = tr('cutii.agatare' + state.tipAgatare[0].toUpperCase() + state.tipAgatare.slice(1));
      if (!a.pozitii.length) {
        // ca peste tot în aplicație: cifra concretă, nu îndemnul generic
        status.push({ key: 'agatare', text: tr(a.inaltimeMinMM ? 'cutii.statusFaraAgatareInalt' : 'cutii.statusFaraAgatare',
          { tip: numeTip, inaltmin: f(a.inaltimeMinMM, 0), cap: f(state.surubCap) }), warn: true });
      } else {
        status.push({ key: 'agatare', text: tr(a.pozitii.length > 1 ? 'cutii.statusAgatareDoua' : 'cutii.statusAgatare', {
          tip: numeTip, y: f(-a.pozitii[0][1]), adanc: f(a.adancime), plasture: f(a.inaltimePlasture),
          standoff: f(a.standoff), camera: f(a.adancime - a.standoff),
          dist: f(a.pozitii.length > 1 ? a.pozitii[1][0] - a.pozitii[0][0] : 0) }) });
        // sub o jumătate de grad nu se vede pe perete, deci nu se raportează
        status.push(Math.abs(a.inclinare) < 0.5
          ? { key: 'drept', text: tr(a.pozitii.length > 1 ? 'cutii.statusDreaptaDoua' : 'cutii.statusDreapta') }
          : { key: 'drept', text: tr('cutii.statusStramb', { unghi: f(Math.abs(a.inclinare)) }), warn: true });
        if (d.volumPlasturML > 0) {
          status.push({ key: 'plasture', text: tr('cutii.statusPlasture', { ml: f(d.volumPlasturML) }) });
        }
      }
    }
    // TRAFORAREA: câte goluri au ieșit, și dacă nervurile chiar au rămas peste prag
    if (state.traforPereti) {
      const tf = d.trafor;
      if (!tf.randuri) {
        status.push({ key: 'trafor', text: tr('cutii.statusFaraRanduri', { banda: f(tf.bandaMM, 0),
          nevoie: f(state.deschidere + state.nervura, 1), adanc: f(state.adancime, 0) }), warn: true });
      } else {
        status.push({ key: 'trafor', text: tr('cutii.statusTrafor', { n: tf.randuri * tf.peRand,
          randuri: tf.randuri, peRand: tf.peRand, deschidere: f(state.deschidere, 0),
          forma: tr('cutii.gol' + state.formaGol[0].toUpperCase() + state.formaGol.slice(1)),
          cm3: f(tf.volumMM3 / 1000) }) });
        // NERVURA e MĂSURATĂ pe o secțiune prin mijlocul rândului, nu dedusă din pas: pe
        // conturul unei contra-forme tăietorii converg spre exterior și nervura reală iese mai
        // mică decât diferența pas − deschidere.
        status.push(tf.nervuraMinMM >= state.nervura - 0.05
          ? { key: 'nervura', text: tr('cutii.statusNervura', { min: f(tf.nervuraMinMM, 2), cerut: f(state.nervura) }) }
          : { key: 'nervura', text: tr('cutii.statusNervuraSubtire', { min: f(tf.nervuraMinMM, 2),
            cerut: f(state.nervura) }), warn: true });
      }
    }
    // modelul de pe fund: cât s-a străpuns și ce goluri s-au umplut la loc
    if (state.modelFund !== 'fara') {
      status.push(d.ariaGolFundMM2 > 0
        ? { key: 'fund', text: tr('cutii.statusModelFund', { model: numeTipar(state.modelFund),
          arie: f(d.ariaGolFundMM2, 0), procent: f((d.ariaGolFundMM2 / Math.max(d.ariaPlinaMM2, 1)) * 100, 0) }) }
        : { key: 'fund', text: tr('cutii.statusFundNestrapuns', { rama: f(state.ramaFund) }), warn: true });
      if (d.goluriFundMici) {
        status.push({ key: 'fundMici', text: tr(d.goluriFundMici > 1 ? 'cutii.statusGoluriFundMulte' : 'cutii.statusGoluriFund',
          { n: d.goluriFundMici, prag: f(FANTA_MIN, 1) }) });
      }
    }
    // ETANȘEITATE. Solidul e închis oricum — asta se verifică pe volum. Ce se schimbă cu modelul
    // de fund e ce POATE ȚINE cutia: un fund străpuns nu mai ține apa de la burete, iar asta e
    // exact informația pentru care omul a ales o cutie de flori.
    status.push(d.etanseitate.abatere <= ABATERE_MAX
      ? { key: 'etans', text: !d.camereUtile ? tr('cutii.statusEtansBlocPlin')
        : !d.fundEtans ? tr('cutii.statusFundStrapuns')
          // fundul e plin, dar pereții traforați lasă apa să iasă peste banda de jos:
          // promisiunea se face pe cât ține cu adevărat, nu pe cât ar suna bine
          : d.trafor.randuri ? tr('cutii.statusEtansTrafor', { banda: f(state.bandaJos, 0) })
            : tr('cutii.statusEtans'), warn: d.camereUtile > 0 && !d.fundEtans }
      : { key: 'etans', text: tr('cutii.statusScurgere', { masurat: f(d.etanseitate.volumMasuratMM3, 0),
        asteptat: f(d.etanseitate.volumAsteptatMM3, 0), abatere: f(d.etanseitate.abatere * 100, 2) }), warn: true });
    // CONECTIVITATE — verificarea centrală: piesa trebuie să iasă din tot atâtea bucăți câte
    // are litera în sine. NU se folosește genus-ul: cutia are goluri prin proiect.
    if (d.bucati !== d.bucatiLitera) {
      status.push({ key: 'bucati', text: tr('cutii.statusBucati', { n: d.bucati, litera: d.bucatiLitera }), warn: true });
    }
    // pereți sub pragul printabil: nu e defect de geometrie, e o combinație de parametri
    if (d.trasaturi.ariaMaxMM2 > PATA_MAX) {
      status.push({ key: 'subtire', text: tr('cutii.statusPereteSubtire', { prag: f(TRASATURA_MIN, 2),
        arie: f(d.trasaturi.ariaMaxMM2, 1) }), warn: true });
    }
    if (d.glifeLipsa.length) status.push({ key: 'glifa', text: tr('cutii.statusGlifaLipsa', { litere: d.glifeLipsa.join(' ') }), warn: true });
    status.push({ key: 'triunghiuri', text: tr('cutii.statusTriunghiuri', { n: f(d.triunghiuri, 0) }) });
    status.push({ key: 'time', text: tr('cutii.statusTimp', { ms: f(r.ms, 0), font: f(d.timpi.font, 0),
      interior: f(d.timpi.interior, 0), extrudare: f(d.timpi.extrudare, 0), verificari: f(d.timpi.verificari, 0) }) });
    return { objects, status };
  },

  onMove() { /* cutia e piesa unică a scenei; nu se mută */ },

  exportBodies(): ExportBody[] {
    if (!last) return [];
    if (last.diagnostice.glifeLipsa.length) throw new Error(tr('cutii.blocatFaraGeometrie', { litere: last.diagnostice.glifeLipsa.join(' ') }));
    // orientarea de print stă în modulul de geometrie (și e verificată acolo, în test):
    // interfața nu are voie să aibă propria părere despre cum se așază piesa pe placă
    return [{ name: `cutie_${slug(state.litera)}`, manifold: pentruPrint(last.corpCutie),
      culoare: state.culoare, orientare: tr('cutii.orientarePrint') }];
  },
  exportName() { return `cutie-${slug(state.litera)}-${state.inaltimeLitera}mm`; },
  /** fișa de producție: ce e de știut la print și la umplut */
  exportNotes() {
    const d = last?.diagnostice;
    const n = [tr('cutii.notaPrint', { adanc: state.adancime, p: state.grosimePerete, fund: state.grosimeFund })];
    if (d?.camereUtile) {
      n.push(tr(d.camereUtile > 1 ? 'cutii.notaVolumMulte' : 'cutii.notaVolum', { ml: d.volumUtilML, n: d.camereUtile }));
      // fundul plin e o proprietate care se VINDE, nu un detaliu: buretele floral se pune ud
      if (d.fundEtans) {
        n.push(d.trafor.randuri ? tr('cutii.notaEtansTrafor', { banda: state.bandaJos }) : tr('cutii.notaEtans'));
      }
      else {
        n.push(tr('cutii.notaFundStrapuns', { model: numeTipar(state.modelFund) }));
        // ADERENȚA LA PLACĂ: un fund străpuns are contact redus cu placa, iar piesa e mare și
        // înaltă. E genul de detaliu care se plătește în rebuturi dacă lipsește din fișă.
        n.push(tr('cutii.notaBrim', { procent: Math.round((1 - d.ariaGolFundMM2 / Math.max(d.ariaPlinaMM2, 1)) * 100) }));
      }
    } else if (d) {
      n.push(tr('cutii.notaFaraInterior', { p: state.grosimePerete }));
    }
    if (d && d.volumPierdutML > 0 && d.camereUtile) n.push(tr('cutii.notaCamereInguste', { min: CAMERA_LATIME_MIN }));
    if (state.traforPereti && d?.trafor.randuri) {
      n.push(tr('cutii.notaTrafor', { n: d.trafor.randuri * d.trafor.peRand, deschidere: state.deschidere,
        banda: state.bandaJos, buza: state.buzaSus }));
    }
    if (state.tipAgatare !== 'fara' && d) {
      const a = d.agatare;
      n.push(a.pozitii.length
        ? tr('cutii.notaAgatare', { tip: tr('cutii.agatare' + state.tipAgatare[0].toUpperCase() + state.tipAgatare.slice(1)),
          adanc: a.adancime.toFixed(1), peste: a.materialPesteLocas,
          standoff: a.standoff.toFixed(1), camera: (a.adancime - a.standoff).toFixed(1) })
        : tr('cutii.notaFaraAgatare'));
      // PUNTEA — consecința directă a orientării de print, deci ține de fișa de producție, nu de
      // panou: locașul se deschide spre placă, iar tavanul lui se printează peste gol.
      if (a.pozitii.length) n.push(tr('cutii.notaPunte', { adanc: a.adancime.toFixed(1) }));
    }
    if ((d?.trasaturi.ariaMaxMM2 ?? 0) > PATA_MAX) n.push(tr('cutii.notaSubtire', { prag: TRASATURA_MIN }));
    return n;
  },

  objectInfo() {
    if (!last) return null;
    const m = last.corpCutie; const bb = m.boundingBox();
    return { nume: tr('cutii.numeCutie', { litera: state.litera }),
      dimMM: [+(bb.max[0] - bb.min[0]).toFixed(1), +(bb.max[1] - bb.min[1]).toFixed(1), +(bb.max[2] - bb.min[2]).toFixed(1)],
      volumeMM3: +m.volume().toFixed(0), triangles: m.numTri() };
  },

  getPreset() { return { v: 1, stare: { ...state } }; },
  async loadPreset(p: any) {
    if (!p || p.v !== 1) throw new Error(tr('presets.formatNecunoscut'));
    Object.assign(state, p.stare);
    await loadFont(state.font).catch(() => { /* font indisponibil */ });
  },
  snapshot() { return { ...state }; },
  restore(s: any) { Object.assign(state, s); },
};

runApp(app);
