/**
 * APP LITERE FAGURE — implementează AppDefinition și rulează prin nucleu (runApp).
 * Nu cablează nimic imperativ din nucleu: declară controale, construiește geometrie.
 * Nu importă NIMIC din alte aplicații (izolare). Solidul din font vine din core/geometry/textSolid.ts,
 * comun tuturor aplicațiilor, ca și registrul de fonturi din core/assets/fonts.ts.
 */
import { t as tr } from '../../core/i18n/index.js';
import type { AppDefinition, PanelControl, PanelGroup, SceneObject, StatusItem, ExportBody } from '../../core/app.js';
import { runApp } from '../../core/ui/shell.js';
import { manifoldToGeometry, initManifold } from '../../core/geometry/manifold.js';
import { inArena, adunaHandle, elibereaza } from '../../core/geometry/arena.js';
import { configureManifold as configFagure, buildFagure, pentruPrint, PATA_MAX, TRASATURA_MIN, UNGHI_RASTURNARE_MIN, JOC_CAPAC, type FagureResult, type Model, type TipAgatare } from './fagure.js';
import { loadFontManifest, loadFont, fontCached, fontGroups, previewURL, allFonts } from '../../core/assets/fonts.js';

interface State {
  litera: string;
  font: string;
  inaltimeLitera: number;
  grosime: number;
  culoare: string;
  model: Model;
  pasCelula: number;
  grosimePerete: number;
  latimeRama: number;
  unghiModel: number;
  variantaModel: number;
  taiereBaza: number;
  modModel: 'strapuns' | 'gravat';
  adancimeGravare: number;
  culoareModel: string;
  tipAgatare: TipAgatare;
  capacel: boolean;
  surubCap: number;
  surubTija: number;
  inaltimeCapSurub: number;
  grosimeCapac: number;
  latimeGrila: number;
  talpaPlina: number;
}
const state: State = {
  litera: 'A',
  font: 'ArchivoBlack-Regular.ttf',
  inaltimeLitera: 120,
  // 14 mm, nu 8: la 120 mm înălțime o placă de 8 mm se răstoarnă la 4°, iar aplicația nu are
  // voie să se deschidă într-o configurație pe care propria ei verificare o respinge. Vezi
  // censul din src/_tests/fagure.test.ts — de la 14 mm toate literele trec pragul de 6°.
  grosime: 14,
  culoare: '#E8709B',
  model: 'fagure',
  pasCelula: 8,
  grosimePerete: 1.2,
  latimeRama: 2.5,
  unghiModel: 0,
  variantaModel: 1,
  taiereBaza: 0,
  modModel: 'strapuns',
  adancimeGravare: 2,
  culoareModel: '#F0A02C',
  tipAgatare: 'fara',
  capacel: true,
  // Un șurub mic de perete: cap Ø5, tijă Ø2.5.
  //
  // CALIBRAT DE DOUĂ ORI, de fiecare dată în jos, și de fiecare dată pe cifre. Întâi Ø8 -> Ø6:
  // locașul de cheie cere un plasture plin cât toată trăsătura literei. Apoi Ø6 -> Ø5, când
  // locașul a devenit CANAL ÎN T: camera capului e lată cât el pe toată cursa, nu doar în
  // cercul de intrare, deci plasturele crește. Măsurat pe Baloo2 la 120 mm — câte caractere
  // din 36 NU primesc sistemul: Ø6 -> 12, Ø5 -> 2, Ø4.5 -> 0. De la 150 mm în sus, niciunul
  // la nicio mărime. Aplicația nu are voie să se deschidă într-o configurație în care refuză
  // o treime din alfabet.
  surubCap: 5,
  surubTija: 2.5,
  // capul unui șurub Ø6 are ~3 mm; locașul trebuie să-l primească PE EL plus capacul
  inaltimeCapSurub: 3,
  grosimeCapac: 2,
  latimeGrila: 20,
  talpaPlina: 6,
};

/**
 * Ce se poate genera. Litera stă ÎN PICIOARE, ca la Litere Decor: diacriticele n-au pe ce se
 * sprijini (căciula lui Ă ar atârna în aer), deci nu se oferă.
 */
const CARACTERE: { grup: string; caractere: string[] }[] = [
  { grup: 'litere', caractere: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('') },
  { grup: 'cifre', caractere: '0123456789'.split('') },
];

/** ordinea din meniu: întâi cele geometrice, apoi cele decorative */
const MODELE: Model[] = ['fagure', 'perforat', 'voronoi', 'diagonal', 'triunghiular', 'caramida', 'valuri', 'radial', 'spirala'];
/** eticheta unui tipar; cheile sunt „fagure.modelFagure", „fagure.modelPerforat" ș.a.m.d. */
const numeModel = (m: Model) => tr('fagure.model' + m[0].toUpperCase() + m.slice(1));

let ctx: { refresh(): void } | null = null;
let last: FagureResult | null = null;

/**
 * MEMORIA WASM. Obiectele Manifold sunt handle-uri embind — memoria lor sta in heap-ul WASM si
 * GC-ul JS n-o atinge. Masurat: aceasta aplicatie crea ~270 de obiecte in afara oricarei arene
 * la FIECARE reconstructie, cel mai mult din tot proiectul, iar testul ei crapa cu
 * „memory access out of bounds". Simptomul pentru utilizator nu e „crapa", ci „modelul nu se
 * actualizeaza": reconstructia arunca si pe ecran ramane geometria veche.
 *
 * Acelasi tipar ca in apps/litere/build.ts. Vezi core/geometry/arena.ts pentru mecanism.
 */
function construieste(): FagureResult {
  const r = inArena(() => buildFagure(config()), (rez) => [rez]);
  // rezultatul precedent nu mai e afisat si nu mai poate fi exportat. Daca buildFagure ar fi
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
  for (const g of CARACTERE) for (const ch of g.caractere) if (are(ch)) out.push({ value: ch, label: ch, grup: tr('fagure.grup_' + g.grup) });
  // caracterul curent rămâne în listă chiar dacă fontul nu-l are: altfel selectorul ar arăta
  // altceva decât modelul
  if (!out.some((o) => o.value === state.litera)) out.unshift({ value: state.litera, label: state.litera, grup: tr('fagure.grup_litere') });
  return out;
}

function fontControl(): PanelControl {
  return { kind: 'fontselect', key: 'font', label: tr('fagure.font'), value: state.font,
    groups: fontGroups().map((g) => ({ categorie: g.categorie,
      items: g.items.map((f) => ({ value: f.fisier, label: f.familie, url: previewURL(f), missing: f.lipsaDiacritice })) })) };
}


const config = () => ({
  litera: state.litera, font: fontCached(state.font),
  inaltimeLitera: state.inaltimeLitera, grosime: state.grosime,
  model: state.model, pasCelula: state.pasCelula, grosimePerete: state.grosimePerete,
  latimeRama: state.latimeRama, unghiModel: state.unghiModel, variantaModel: state.variantaModel,
  taiereBaza: state.taiereBaza, modModel: state.modModel, adancimeGravare: state.adancimeGravare,
  talpaPlina: state.talpaPlina, tipAgatare: state.tipAgatare, capacel: state.capacel,
  surubCap: state.surubCap, surubTija: state.surubTija,
  inaltimeCapSurub: state.inaltimeCapSurub, grosimeCapac: state.grosimeCapac,
  latimeGrila: state.latimeGrila,
});

/** locașurile din spate se printează cu spatele în SUS; gaura străpunsă n-are nevoie */
const spateInSus = () => state.tipAgatare === 'cheie' || state.tipAgatare === 'grila';

const app: AppDefinition = {
  title: 'fagure',
  id: 'fagure',

  async init(c) {
    ctx = c;
    // nucleul pornește modulul geometric; aplicația doar îl pasează logicii produsului
    configFagure(await initManifold());
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
      { title: tr('fagure.grupLitera'), controls: [
        { kind: 'select', key: 'litera', label: tr('fagure.litera'), value: state.litera, options: optiuniCaracter() },
        fontControl(),
        { kind: 'number', key: 'inaltimeLitera', label: tr('fagure.inaltime'), min: 40, max: 250, step: 5, value: state.inaltimeLitera },
        { kind: 'number', key: 'grosime', label: tr('fagure.grosime'), min: 3, max: 25, step: 0.5, value: state.grosime },
        { kind: 'number', key: 'taiereBaza', label: tr('fagure.taiereBaza'), min: 0, max: 5, step: 0.5, value: state.taiereBaza },
        { kind: 'color', key: 'culoare', label: tr('fagure.culoare'), value: state.culoare },
      ] },
      { title: tr('fagure.grupAgatare'), controls: [
        { kind: 'select', key: 'tipAgatare', label: tr('fagure.tipAgatare'), value: state.tipAgatare, options: [
          { value: 'fara', label: tr('fagure.agatareFara') },
          { value: 'cheie', label: tr('fagure.agatareCheie') },
          { value: 'grila', label: tr('fagure.agatareGrila') },
          { value: 'gaura', label: tr('fagure.agatareGaura') },
        ] },
        // fiecare tip își aduce parametrii lui; ceilalți n-ar face nimic dacă s-ar vedea
        ...(state.tipAgatare === 'cheie' || state.tipAgatare === 'gaura' ? [
          { kind: 'number', key: 'surubCap', label: tr('fagure.surubCap'), min: 5, max: 16, step: 0.5, value: state.surubCap } as PanelControl,
          { kind: 'number', key: 'surubTija', label: tr('fagure.surubTija'), min: 2, max: 8, step: 0.5, value: state.surubTija } as PanelControl,
        ] : []),
        ...(state.tipAgatare === 'gaura' ? [
          { kind: 'number', key: 'inaltimeCapSurub', label: tr('fagure.inaltimeCapSurub'), min: 1.5, max: 8, step: 0.5, value: state.inaltimeCapSurub } as PanelControl,
          { kind: 'checkbox', key: 'capacel', label: tr('fagure.capacel'), value: state.capacel } as PanelControl,
          ...(state.capacel
            ? [{ kind: 'number', key: 'grosimeCapac', label: tr('fagure.grosimeCapac'), min: 1, max: 6, step: 0.5, value: state.grosimeCapac } as PanelControl]
            : []),
          // adâncimea NU e parametru aici: în locaș intră capul șurubului ȘI capacul, deci se
          // calculează din amândouă. Se arată ca rezultat, ca omul să vadă cât se sapă.
          { kind: 'note', key: 'notaAdanc', label: tr('fagure.adancimeCap'),
            value: tr('fagure.adancimeCapCalcul', { adanc: (last?.diagnostice.agatare.adancime ?? 0).toFixed(1) }) } as PanelControl,
        ] : []),
        ...(state.tipAgatare === 'grila' ? [
          { kind: 'number', key: 'latimeGrila', label: tr('fagure.latimeGrila'), min: 12, max: 80, step: 2, value: state.latimeGrila } as PanelControl,
        ] : []),
        ...(state.tipAgatare === 'cheie' || state.tipAgatare === 'grila' ? [
          { kind: 'number', key: 'inaltimeCapSurub', label: tr('fagure.inaltimeCapSurub'), min: 1.5, max: 8, step: 0.5, value: state.inaltimeCapSurub } as PanelControl,
          // Nici aici adâncimea nu mai e parametru: locașul din spate e un CANAL ÎN T, iar în
          // el intră tija pe standoff plus capul pe înălțimea lui. O valoare liberă permitea
          // exact configurația în care capul n-avea pe unde gliza.
          { kind: 'note', key: 'notaAdancT', label: tr('fagure.adancimeCap'),
            value: tr('fagure.adancimeCanalT', { adanc: (last?.diagnostice.agatare.adancime ?? 0).toFixed(1),
              standoff: (last?.diagnostice.agatare.standoff ?? 0).toFixed(1), cap: state.inaltimeCapSurub }) } as PanelControl,
        ] : []),
        ...(state.tipAgatare !== 'fara' ? [
          { kind: 'note', key: 'notaSpate', label: tr('fagure.notaSpateEticheta'),
            value: tr(spateInSus() ? 'fagure.notaSpateValoare' : 'fagure.notaFataValoare') } as PanelControl,
        ] : []),
      ] },
      { title: tr('fagure.grupModel'), controls: [
        { kind: 'select', key: 'model', label: tr('fagure.model'), value: state.model, options: MODELE.map((m) => ({ value: m, label: numeModel(m) })) },
        { kind: 'select', key: 'modModel', label: tr('fagure.modModel'), value: state.modModel, options: [
          { value: 'strapuns', label: tr('fagure.modStrapuns') },
          { value: 'gravat', label: tr('fagure.modGravat') },
        ] },
        // adâncimea și a doua culoare n-au ce căuta în panou cât modelul trece prin placă
        ...(state.modModel === 'gravat' ? [
          { kind: 'number', key: 'adancimeGravare', label: tr('fagure.adancimeGravare'), min: 0.6, max: 8, step: 0.2, value: state.adancimeGravare } as PanelControl,
          { kind: 'color', key: 'culoareModel', label: tr('fagure.culoareModel'), value: state.culoareModel } as PanelControl,
        ] : []),
        { kind: 'number', key: 'pasCelula', label: tr('fagure.pasCelula'), min: 4, max: 20, step: 0.5, value: state.pasCelula },
        { kind: 'number', key: 'grosimePerete', label: tr('fagure.grosimePerete'), min: 0.8, max: 3, step: 0.1, value: state.grosimePerete },
        { kind: 'number', key: 'latimeRama', label: tr('fagure.latimeRama'), min: 1.5, max: 6, step: 0.5, value: state.latimeRama },
        { kind: 'number', key: 'talpaPlina', label: tr('fagure.talpaPlina'), min: 0, max: 25, step: 1, value: state.talpaPlina },
        { kind: 'number', key: 'unghiModel', label: tr('fagure.unghiModel'), min: 0, max: 90, step: 5, value: state.unghiModel },
        // grila dreaptă nu are intrare proprie în meniu fiindcă E diagonala la 45°;
        // se spune acolo unde omul o caută, nu într-un fișier de ajutor
        ...(state.model === 'diagonal'
          ? [{ kind: 'note', key: 'notaGrila', label: tr('fagure.grilaDreapta'), value: tr('fagure.grilaDreaptaCum') } as PanelControl]
          : []),
        // „varianta" se arată doar la voronoi, singurul tipar pe care o schimbă. Spre deosebire
        // de unghi (care lucrează la toate), aici afișarea permanentă ar fi un buton mort.
        ...(state.model === 'voronoi'
          ? [{ kind: 'number', key: 'variantaModel', label: tr('fagure.varianta'), min: 1, max: 999, step: 1, value: state.variantaModel } as PanelControl]
          : []),
      ] },
    ];
  },

  onControl(key, value) {
    if (key === 'font') {
      state.font = value as string;
      if (!fontCached(state.font)) loadFont(state.font).then(() => ctx?.refresh()).catch(() => { /* font indisponibil */ });
      return;
    }
    (state as any)[key] = value;
  },

  rebuild() {
    const r = construieste();
    const d = r.diagnostice;
    // litera stă ÎN PICIOARE: world Y = −model Y, deci talpa ajunge la Y=0 ridicând cu
    // max(model Y). Centrată pe placă în X și Z.
    const bb = r.corpLitera.boundingBox();
    const lift = bb.max[1];
    const cx = (bb.min[0] + bb.max[0]) / 2, cz = (bb.min[2] + bb.max[2]) / 2;
    const G = (m: any) => { const g = manifoldToGeometry(m); g.translate(-cx, lift, -cz); return g; };

    // La gravat sunt DOUĂ corpuri, dar UN SINGUR obiect: se printează împreună, ca o piesă cu
    // schimbare de culoare la înălțime. La fel ca plăcuța și litera de la brelocuri.
    const objects: SceneObject[] = [
      { id: 'litera', nume: tr('fagure.numeLitera', { litera: state.litera }),
        geometry: G(r.corpLitera), color: state.culoare, movable: false, warn: d.bucati > d.bucatiLitera,
        corpuri: r.corpModel
          ? [{ geometry: G(r.corpLitera), color: state.culoare }, { geometry: G(r.corpModel), color: state.culoareModel }]
          : undefined },
    ];
    // capacul e PIESĂ SEPARATĂ, nu corp al literei: se printează deoparte și se apasă în locaș
    // după ce litera e prinsă în perete. De asta stă și în listă ca obiect propriu.
    if (r.corpCapac) {
      objects.push({ id: 'capac', nume: tr('fagure.numeCapac', { n: d.agatare.pozitii.length }),
        geometry: G(r.corpCapac), color: state.culoare, movable: false });
    }
    const f = (n: number, k = 1) => n.toLocaleString('en-US', { maximumFractionDigits: k });
    const s = d.stabilitate;
    const status: StatusItem[] = [
      { key: 'litera', text: tr('fagure.statusLitera', { w: f(d.dimLitera[0]), h: f(d.dimLitera[1]), g: f(state.grosime) }) },
      // STABILITATE — litera stă în picioare, deci trebuie să și rămână. Numărul care contează
      // e unghiul de răsturnare, nu aria: o placă subțire cade peste muchia din față.
      { key: 'stabil', text: s.staSingura
        ? tr('fagure.statusStabil', { unghi: f(s.unghiFataSpate), arie: f(s.ariaSprijinMM2, 0) })
        : tr('fagure.statusInstabil', { unghi: f(s.unghiFataSpate), lat: f(s.unghiLateral), arie: f(s.ariaSprijinMM2, 0), prag: f(UNGHI_RASTURNARE_MIN, 0) }),
      warn: !s.staSingura },
      state.modModel === 'strapuns'
        ? { key: 'material', text: tr('fagure.statusMaterial', { arie: f(d.ariaFinalaMM2, 0), plin: f(d.ariaPlinaMM2, 0), economie: f(d.economie * 100, 0) }) }
        : { key: 'material', text: tr('fagure.statusGravat', { arie: f(d.ariaModelMM2, 0), plin: f(d.ariaPlinaMM2, 0), procent: f((d.ariaModelMM2 / Math.max(d.ariaPlinaMM2, 1)) * 100, 0), adancime: f(state.adancimeGravare) }) },
      { key: 'triunghiuri', text: tr('fagure.statusTriunghiuri', { n: f(d.triunghiuri, 0) }) },
      { key: 'time', text: tr('fagure.statusTimp', { ms: f(r.ms, 0), font: f(d.timpi.font, 0), tipar: f(d.timpi.tipar, 0), strapungere: f(d.timpi.strapungere, 0), extrudare: f(d.timpi.extrudare, 0) }) },
    ];
    // CONECTIVITATE — verificarea centrală: piesa trebuie să iasă din tot atâtea bucăți câte
    // are litera în sine („A" 1, „i" 2). Mai multe = model desprins de ramă.
    if (d.bucati > d.bucatiLitera) {
      status.push({ key: 'bucati', text: tr('fagure.statusBucati', { n: d.bucati, litera: d.bucatiLitera }), warn: true });
    }
    // rama a înghițit interiorul: nu e defect, dar omul trebuie să știe de ce nu vede model
    if (d.faraInterior) status.push({ key: 'plina', text: tr('fagure.statusFaraInterior', { rama: f(state.latimeRama) }), warn: true });
    if (d.aschii) status.push({ key: 'aschii', text: tr('fagure.statusAschii', { n: d.aschii, arie: f(d.ariaAschiiMM2, 2) }) });
    if (d.goluriMici) status.push({ key: 'goluri', text: tr('fagure.statusGoluriMici', { n: d.goluriMici }) });
    if (d.taiereBazaAplicata) status.push({ key: 'taiere', text: tr('fagure.statusTaiere', { mm: f(d.taiereBazaAplicata) }) });
    // agățarea: dacă a fost cerută dar n-a încăput, se spune — o literă fără sistem de agățare
    // se vede și se repară dintr-un parametru, una găurită prin model ar pleca așa la print
    if (state.tipAgatare !== 'fara') {
      const numeTip = tr('fagure.agatare' + state.tipAgatare[0].toUpperCase() + state.tipAgatare.slice(1));
      const poz = d.agatare.pozitii;
      status.push(poz.length
        ? { key: 'agatare', text: tr(poz.length > 1 ? 'fagure.statusAgatareDoua' : 'fagure.statusAgatare', {
          tip: numeTip, y: f(-poz[0][1]), adanc: f(d.agatare.adancime),
          dist: f(poz.length > 1 ? poz[1][0] - poz[0][0] : 0) }) }
        : { key: 'agatare', text: tr('fagure.statusFaraAgatare'), warn: true });
      // capacul intră până la fund doar dacă sub el a rămas loc pentru capul șurubului
      if (poz.length && last?.corpCapac) {
        const a = d.agatare;
        status.push(a.spatiuCap >= state.inaltimeCapSurub - 1e-6
          ? { key: 'capac', text: tr('fagure.statusCapac', { g: f(a.grosimeCapac), spatiu: f(a.spatiuCap), cap: f(state.inaltimeCapSurub) }) }
          : { key: 'capac', text: tr('fagure.statusCapacIese', { spatiu: f(a.spatiuCap), cap: f(state.inaltimeCapSurub) }), warn: true });
      }
      // înclinarea: sub o jumătate de grad nu se vede pe perete, deci nu se raportează
      if (poz.length) {
        status.push(Math.abs(d.agatare.inclinare) < 0.5
          ? { key: 'drept', text: tr(poz.length > 1 ? 'fagure.statusDreaptaDoua' : 'fagure.statusDreapta') }
          : { key: 'drept', text: tr('fagure.statusStramb', { unghi: f(Math.abs(d.agatare.inclinare)) }), warn: true });
      }
    }
    // pereți sub pragul printabil: nu e defect de geometrie, e o combinație de parametri
    if (d.trasaturi.ariaMaxMM2 > PATA_MAX) {
      status.push({ key: 'subtire', text: tr('fagure.statusPereteSubtire', { prag: f(TRASATURA_MIN, 2), arie: f(d.trasaturi.ariaMaxMM2, 1) }), warn: true });
    }
    if (d.glifeLipsa.length) status.push({ key: 'glifa', text: tr('fagure.statusGlifaLipsa', { litere: d.glifeLipsa.join(' ') }), warn: true });
    return { objects, status };
  },

  onMove() { /* litera e piesa unică a scenei; nu se mută */ },

  exportBodies(): ExportBody[] {
    if (!last) return [];
    if (last.diagnostice.glifeLipsa.length) throw new Error(tr('fagure.blocatFaraGeometrie', { litere: last.diagnostice.glifeLipsa.join(' ') }));
    // orientarea de print stă în modulul de geometrie (și e verificată acolo, în test):
    // interfața nu are voie să aibă propria părere despre cum se așază piesa pe placă
    const nume = `fagure_${slug(state.litera)}`;
    const sus = spateInSus();
    const orientare = tr(sus ? 'fagure.orientareSpate' : 'fagure.orientarePrint');
    const corpuri: ExportBody[] = last.corpModel
      // ACELAȘI `grup`: o piesă fizică, în două culori. Așezarea pe placă le ține împreună.
      ? [{ name: `${nume}_1_placa`, manifold: pentruPrint(last.corpLitera, sus), culoare: state.culoare, orientare, grup: nume },
        { name: `${nume}_2_model`, manifold: pentruPrint(last.corpModel, sus), culoare: state.culoareModel, orientare, grup: nume }]
      : [{ name: nume, manifold: pentruPrint(last.corpLitera, sus), culoare: state.culoare, orientare }];
    // capacul e altă piesă: FĂRĂ `grup`, ca aranjarea pe placă să-l așeze separat, nu peste literă
    if (last.corpCapac) {
      corpuri.push({ name: `${nume}_capac`, manifold: pentruPrint(last.corpCapac, sus),
        culoare: state.culoare, orientare: tr('fagure.orientareCapac') });
    }
    return corpuri;
  },
  exportName() { return `fagure-${slug(state.litera)}-${state.inaltimeLitera}mm`; },
  /** fișa de producție: ce e de știut la print, nu la asamblare — piesa e una singură */
  exportNotes() {
    const n = [
      state.modModel === 'strapuns'
        ? tr('fagure.notaPrint', { g: state.grosime })
        : tr('fagure.notaPrintGravat', { g: state.grosime, z: +(state.grosime - state.adancimeGravare).toFixed(1) }),
      tr('fagure.notaModel', { model: numeModel(state.model), pas: state.pasCelula, perete: state.grosimePerete, rama: state.latimeRama }),
    ];
    if (!last?.diagnostice.stabilitate.staSingura) n.push(tr('fagure.notaInstabil'));
    if (state.tipAgatare !== 'fara') {
      n.push(last?.diagnostice.agatare.pozitii.length
        ? tr('fagure.notaAgatare', {
          tip: tr('fagure.agatare' + state.tipAgatare[0].toUpperCase() + state.tipAgatare.slice(1)),
          adanc: last.diagnostice.agatare.adancime.toFixed(1),
        }) + (spateInSus() ? ' ' + tr('fagure.notaAgatareSpate') : '')
        : tr('fagure.notaFaraAgatare'));
      if (last?.corpCapac) n.push(tr('fagure.notaCapac', { joc: JOC_CAPAC }));
    }
    if ((last?.diagnostice.trasaturi.ariaMaxMM2 ?? 0) > PATA_MAX) n.push(tr('fagure.notaSubtire', { prag: TRASATURA_MIN }));
    return n;
  },

  objectInfo() {
    if (!last) return null;
    const m = last.corpLitera; const bb = m.boundingBox();
    return { nume: tr('fagure.numeLitera', { litera: state.litera }),
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
