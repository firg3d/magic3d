/**
 * APP HUSE IPHONE — implementează AppDefinition și rulează prin nucleu (runApp).
 *
 * Nu importă NIMIC din alte aplicații (izolare). Geometria stă în `husa.ts`, primitivele în
 * `core/primitive/`, iar cotele telefoanelor în `date/telefoane/apple/`, prin `catalog.ts`.
 *
 * ACEST VAL (HUS.1) acoperă parametrii 1–7 și 12 din B.7. Spatele, textul, orificiul de șnur și
 * marcajul — 8–11 — sunt HUS.2 și nu apar aici nici ca butoane inactive: un control care nu face
 * nimic e o promisiune neonorată la fiecare deschidere a panoului.
 */
import { t as tr } from '../../core/i18n/index.js';
import type { AppDefinition, PanelControl, PanelGroup, SceneObject, StatusItem, ExportBody } from '../../core/app.js';
import { runApp } from '../../core/ui/shell.js';
import { manifoldToGeometry, initManifold } from '../../core/geometry/manifold.js';
import { inArena, adunaHandle, elibereaza } from '../../core/geometry/arena.js';
import { configureManifold as configHusa, buildHusa, manechinTelefon, pentruPrint, PERETE_MIN,
  DIST_TEXT_CAMERA, tronsonLiberSina,
  type HusaConfig, type Material, type CeExporti, type Telefon, type HusaResult,
  type StilSpate, type ColtSnur } from './husa.js';
import { TIPARE, type Tipar } from '../../core/geometry/tipare.js';
import { areDreptComercial } from '../../core/config/licenta-token.js';
import { modeleDisponibile, modelDupaId } from './catalog.js';
import { loadFontManifest, loadFont, fontCached } from '../../core/assets/fonts.js';
import { stareLicenta } from '../../core/config/licenta.js';
import { textSolid } from '../../core/geometry/textSolid.js';
import { MARCAJ_LATIME, MARCAJ_INALTIME, type MarimeMarcaj } from '../../core/semnatura/index.js';

/**
 * SILUETA WORDMARK-ULUI, din motorul de font, strânsă în cutia de 9 × 2,5 mm.
 *
 * Nucleul de marcaj n-o produce singur: nu încarcă fonturi, ca să nu depindă de rețea în
 * mijlocul unei construcții. Aplicația o are deja încărcată pentru gravarea ramei.
 */
function siluetaSemnatura(): any[] {
  const font = fontCached(FONT_SEMNATURA) ?? fontCached(FONT_GRAVARE);
  if (!font) return [];
  const brut = textSolid(font, 'praktik3d.ro', MARCAJ_INALTIME, 1);
  const sil = brut.project();
  brut.delete();
  const b = sil.bounds();
  const k = MARCAJ_LATIME / (b.max[0] - b.min[0]);
  const centrat = sil.scale([k, k])
    .translate([-(b.min[0] + b.max[0]) / 2 * k, -(b.min[1] + b.max[1]) / 2 * k]);
  const inele = centrat.toPolygons();
  sil.delete(); centrat.delete();
  return inele;
}

/**
 * FONTUL GRAVĂRII e FIX, nu ales de om.
 *
 * Eticheta ramei („15 · 0,25") e o marcă de atelier de 1,4 mm, nu un element de design. Un font
 * cursiv la mărimea asta iese o pată, iar un selector de font ar sugera că se poate alege ceva ce
 * n-are ce alege.
 */
const FONT_GRAVARE = 'Inter-Regular.ttf';

/**
 * FONTUL SEMNATURII E GRAS, nu cel de gravare (DECIZIE, corectura HUS.2).
 *
 * Adresa completa `praktik3d.ro` are doisprezece caractere; la latimea care incape pe spate,
 * grosimea liniei iese de ordinul zecimilor de milimetru. Un Inter-900 aproape dubleaza
 * trasatura fata de Regular la aceeasi latime — masurat 0,40 fata de 0,25 la 17 mm. Nu ajunge
 * la prag, dar e diferenta dintre „poate iese" si „sigur nu iese" cu duza de 0,4.
 *
 * Eticheta ramei ramane pe Regular: acolo sunt patru-sase caractere si se citeste oricum.
 */
const FONT_SEMNATURA = 'Inter-900.ttf';

/** jocul implicit, pe material — B.7 §6. Rigidul cere mai mult: nu se întinde la montare. */
/**
 * ORIENTAREA IN SCENA — rotatie de AFISARE, atat.
 *
 * Geometria se construieste cu grosimea pe Z, fiindca asa se aseaza pe placa la export. Scena are
 * insa placa in planul XZ si Y-ul in sus, deci piesa nemiscata sta IN PICIOARE. Cele trei pozitii
 * raspund la trei intrebari diferite: „cum se decoreaza si se printeaza" (pe spate), „cum arata
 * perforarea si camera" (pe fata), „cum arata ca obiect" (in picioare).
 */
export type Orientare = 'spate' | 'fata' | 'picioare';
const ROTATII: Record<Orientare, [number, number, number]> = {
  // Verificat pe ecran, nu dedus: cu [-90,0,0] piesa se culca, dar cu SPATELE IN SUS. Semnul se
  // ia din ce se vede, nu din ce iese pe hartie — scena are propria ei conventie de axe.
  spate: [90, 0, 0],      // spatele jos, fata ecranului in sus (pozitia de print)
  fata: [-90, 0, 0],      // spatele in sus: se vede perforarea si camera
  picioare: [0, 0, 0],    // asa cum se construieste
};

const JOC_IMPLICIT: Record<Material, number> = { tpu: 0.25, rigid: 0.4 };
/** cât se poate abate omul de la jocul implicit (mm) */
const JOC_ABATERE = 0.15;

interface State {
  model: string;
  material: Material;
  ceExporti: CeExporti;
  grosimePerete: number;
  buzaEcran: number;
  joc: number;
  butoaneAcoperite: boolean;
  stilSpate: StilSpate;
  magsafe: boolean;
  textSpate: string;
  inaltimeTextSpate: number;
  tipar: Tipar;
  pasTipar: number;
  peretTipar: number;
  snur: ColtSnur;
  texturaMarcaj: boolean;
  marimeMarcaj: MarimeMarcaj;
  orientare: Orientare;
  aratTelefon: boolean;
  culoare: string;
  culoareTelefon: string;
}

const state: State = {
  model: modeleDisponibile()[0]?.id ?? '',
  material: 'tpu',
  ceExporti: 'rama',   // B.7 §3: prima dată se printează rama de probă, nu husa
  grosimePerete: 1.4,
  buzaEcran: 1.0,
  joc: JOC_IMPLICIT.tpu,
  butoaneAcoperite: false,
  stilSpate: 'plin',
  // implicit PORNIT: husa se prinde de incarcator daca omul nu cere altfel (addendum MagSafe)
  magsafe: true,
  textSpate: '',
  inaltimeTextSpate: 18,
  tipar: 'fagure',
  pasTipar: 8,
  peretTipar: 2,
  snur: 'fara',
  texturaMarcaj: true,
  marimeMarcaj: 'vizibila',
  orientare: 'spate',
  aratTelefon: true,   // B.10: comutatorul e pornit implicit
  culoare: '#2b2f38',
  /**
   * MACHETA E GRI DESCHIS, nu in tonul husei: gri inchis si opac arata ca o a doua piesa de
   * exportat. Deschis si translucid se citeste imediat ca telefonul de referinta.
   */
  culoareTelefon: '#c8c8cc',
};

let ctx: any = null;
let last: HusaResult | null = null;

const telefon = (): Telefon | null => modelDupaId(state.model);

function config(t: Telefon): HusaConfig {
  return {
    telefon: t, material: state.material, ceExporti: state.ceExporti,
    grosimePerete: state.grosimePerete, buzaEcran: state.buzaEcran, joc: state.joc,
    butoaneAcoperite: state.butoaneAcoperite,
    fontGravare: fontCached(FONT_GRAVARE),
    /**
     * MARCAJUL derivă din starea licenței VERIFICATE, aici, în aceeași funcție care compune
     * parametrii geometriei (stratul 4 din A.2). Nu există un parametru „fără semnătură" pe care
     * cineva să-l poată trimite din afară.
     */
    marcaj: { stare: stareLicenta(), siluetaSemnatura,
      // stingerea texturii e singura setare de marcaj care cere drept comercial (A.5)
      textura: { activa: state.texturaMarcaj }, marime: state.marimeMarcaj },
    spate: {
      stil: state.stilSpate, text: state.textSpate, font: fontCached(FONT_GRAVARE),
      magsafe: state.magsafe,
      inaltimeText: state.inaltimeTextSpate,
      tipar: { model: state.tipar, pas: state.pasTipar, grosimePerete: state.peretTipar,
        unghi: 0, varianta: 1 },
      snur: state.snur,
    },
    // marginea din jurul insulei camerei nu e parametru de UI (B.7: „nu se expun")
    margineCamera: 1.0,
  };
}

function construieste(t: Telefon): HusaResult {
  const r = inArena(() => buildHusa(config(t), ctx?.placa() ?? { w: 256, d: 256 }),
    (rez) => [rez.corp]);
  if (last) {
    const vii = adunaHandle(r);
    const deSters: any[] = [];
    for (const o of adunaHandle(last)) if (!vii.has(o)) deSters.push(o);
    elibereaza(deSters);
  }
  last = r;
  return r;
}

const app: AppDefinition = {
  title: 'huse',
  id: 'huse',
  /** primul generator care poartă semnătura Praktik3D (DECIZIE 2, partea A) */
  poartaMarcaj: true,
  detaliuMarcaj: () => tr('huse.marcaj_' + state.marimeMarcaj).toLowerCase(),

  async init(c) {
    ctx = c;
    configHusa(await initManifold());
    await loadFontManifest();
    // lipsa fontului nu oprește aplicația: rama iese fără etichetă, nu deloc
    await loadFont(FONT_GRAVARE).catch(() => { /* gravarea se sare */ });
    await loadFont(FONT_SEMNATURA).catch(() => { /* cade pe fontul de gravare */ });
  },

  panels(): PanelGroup[] {
    const t = telefon();
    const modele = modeleDisponibile();
    const jocBaza = JOC_IMPLICIT[state.material];
    const controaleModel: PanelControl[] = [
      { kind: 'select', key: 'model', label: tr('huse.model'), value: state.model,
        options: modele.map((m) => ({ value: m.id, label: m.model })) },
      /**
       * ETICHETA „NEVERIFICAT FIZIC" stă lângă model, nu în bara de status (B.2).
       * Acolo e momentul în care omul alege; un avertisment citit după ce a ales nu mai schimbă
       * nimic.
       */
      ...(t && !t.verificat ? [{ kind: 'note' as const, key: 'neverificat',
        label: tr('huse.sursaCote'), value: tr('huse.neverificat') }] : []),
      { kind: 'select', key: 'material', label: tr('huse.material'), value: state.material,
        options: [{ value: 'tpu', label: tr('huse.mat_tpu') },
          { value: 'rigid', label: tr('huse.mat_rigid') }] },
      { kind: 'select', key: 'ceExporti', label: tr('huse.ceExporti'), value: state.ceExporti,
        options: [{ value: 'rama', label: tr('huse.export_rama') },
          { value: 'husa', label: tr('huse.export_husa') },
          { value: 'bumper', label: tr('huse.export_bumper') }] },
    ];
    return [
      { title: tr('huse.grupModel'), controls: controaleModel },
      { title: tr('huse.grupCote'), controls: [
        { kind: 'number', key: 'grosimePerete', label: tr('huse.grosimePerete'),
          min: 1.2, max: 2.0, step: 0.1, value: state.grosimePerete },
        { kind: 'number', key: 'buzaEcran', label: tr('huse.buzaEcran'),
          min: 0.8, max: 1.5, step: 0.1, value: state.buzaEcran },
        { kind: 'number', key: 'joc', label: tr('huse.joc'),
          min: +(jocBaza - JOC_ABATERE).toFixed(2), max: +(jocBaza + JOC_ABATERE).toFixed(2),
          step: 0.05, value: state.joc },
        ...(t && t.butoane.some((b) => b.acoperibil) ? [{ kind: 'select' as const, key: 'butoaneAcoperite',
          label: tr('huse.butoane'), value: state.butoaneAcoperite ? 'da' : 'nu',
          options: [{ value: 'nu', label: tr('huse.butoane_decupate') },
            { value: 'da', label: tr('huse.butoane_acoperite') }] }] : []),
      ] },
      /**
       * SPATELE — parametrii 8-11 din B.7. Controalele care depind de stil apar doar cand stilul
       * le cere: un camp de text langa „spate plin" ar fi o promisiune goala.
       */
      { title: tr('huse.grupSpate'), controls: [
        /**
         * PE BUMPER NU EXISTA SPATE, deci nici stil de spate si nici snur — gaura de snur se
         * face intr-un colt al spatelui, iar acolo nu mai e material. Controalele nu se lasa
         * inactive, se scot: un selector care nu schimba nimic arata a bug cand nu se intampla
         * nimic. In locul lor ramane un rand care spune de ce.
         *
         * Marimea semnaturii ramane, fiindca marcajul EXISTA pe bumper — doar ca pe sina.
         */
        ...(state.ceExporti === 'bumper' ? [{ kind: 'note' as const, key: 'faraSpate',
          label: tr('huse.faraSpate'), value: tr('huse.faraSpateBumper') }] : [
        { kind: 'select' as const, key: 'stilSpate', label: tr('huse.stilSpate'), value: state.stilSpate,
          options: (['plin', 'tipar-gravat', 'perforat', 'nume-gravat', 'nume-decupat'] as const)
            .map((v) => ({ value: v, label: tr('huse.spate_' + v) })) },
        ...(state.stilSpate === 'nume-gravat' || state.stilSpate === 'nume-decupat' ? [
          { kind: 'text' as const, key: 'textSpate', label: tr('huse.textSpate'), value: state.textSpate },
          { kind: 'number' as const, key: 'inaltimeTextSpate', label: tr('huse.inaltimeTextSpate'),
            min: 8, max: 40, step: 1, value: state.inaltimeTextSpate },
        ] : []),
        /**
         * COMUTATORUL MAGSAFE APARE DOAR LA PERFORAT.
         *
         * La spate plin, gravat sau cu nume n-are ce ocoli: n-are gauri. Un comutator care nu
         * schimba nimic e mai rau decat lipsa lui — omul il muta, nu vede nicio diferenta, si de
         * atunci nu mai are incredere in niciun comutator din panou.
         */
        ...(state.stilSpate === 'perforat' ? [{ kind: 'select' as const, key: 'magsafe',
          label: tr('huse.magsafe'), value: state.magsafe ? 'da' : 'nu',
          options: [{ value: 'da', label: tr('huse.magsafeDa') },
            { value: 'nu', label: tr('huse.magsafeNu') }] }] : []),
        ...(state.stilSpate === 'tipar-gravat' || state.stilSpate === 'perforat' ? [
          { kind: 'select' as const, key: 'tipar', label: tr('huse.tipar'), value: state.tipar,
            options: TIPARE.map((v) => ({ value: v, label: tr('huse.tipar_' + v) })) },
          { kind: 'number' as const, key: 'pasTipar', label: tr('huse.pasTipar'),
            min: 4, max: 20, step: 0.5, value: state.pasTipar },
          { kind: 'number' as const, key: 'peretTipar', label: tr('huse.peretTipar'),
            min: 1.2, max: 5, step: 0.2, value: state.peretTipar },
        ] : []),
        ]),
        /**
         * MĂRIMEA SEMNĂTURII se alege; PREZENȚA ei nu. Scoaterea cere licență comercială, deci
         * lista are două valori, nu trei — un „fără" care n-ar funcționa ar fi o capcană.
         */
        { kind: 'select', key: 'marimeMarcaj', label: tr('huse.marimeMarcaj'), value: state.marimeMarcaj,
          options: (['vizibila', 'discreta'] as const)
            .map((v) => ({ value: v, label: tr('huse.marcaj_' + v) })) },
        ...(state.ceExporti === 'bumper' ? [] : [{ kind: 'select' as const, key: 'snur',
          label: tr('huse.snur'), value: state.snur,
          options: (['fara', 'stanga-jos', 'dreapta-jos'] as const)
            .map((v) => ({ value: v, label: tr('huse.snur_' + v) })) }]),
        /**
         * ZONA DE TEXTURA se poate stinge DOAR cu licenta comerciala (A.5). Fara ea, comutatorul
         * nu apare deloc: un buton care nu face nimic e mai rau decat lipsa lui.
         */
        ...(areDreptComercial(stareLicenta()) ? [{ kind: 'checkbox' as const, key: 'texturaMarcaj',
          label: tr('huse.texturaMarcaj'), value: state.texturaMarcaj }] : []),
      ] },
      { title: tr('huse.grupAfisare'), controls: [
        { kind: 'select', key: 'orientare', label: tr('huse.orientare'), value: state.orientare,
          options: (['spate', 'fata', 'picioare'] as const)
            .map((v) => ({ value: v, label: tr('huse.orientare_' + v) })) },
        /**
         * COMUTATORUL MACHETEI sta primul dupa orientare, si are pereche in lista de obiecte
         * (ochiul de vizibilitate): omul pune si scoate telefonul dintr-un click, ca sa se uite
         * in husa.
         */
        { kind: 'checkbox', key: 'aratTelefon', label: tr('huse.aratTelefon'), value: state.aratTelefon },
        { kind: 'color', key: 'culoare', label: tr('huse.culoare'), value: state.culoare },
        { kind: 'color', key: 'culoareTelefon', label: tr('huse.culoareTelefon'), value: state.culoareTelefon },
      ] },
    ];
  },

  onControl(key, value) {
    /**
     * JOCUL SE MUTĂ CU MATERIALUL.
     *
     * Presetul rigid cere 0,40, TPU-ul 0,25, iar reglajul e ±0,15 în jurul valorii curente. Dacă
     * jocul ar rămâne pe loc la schimbarea materialului, ar ieși imediat din intervalul propriu —
     * 0,25 la rigid înseamnă o husă care nu intră, iar glisorul nici n-ar mai avea unde să ajungă.
     */
    if (key === 'material') {
      state.material = value as Material;
      state.joc = JOC_IMPLICIT[state.material];
      return;
    }
    if (key === 'butoaneAcoperite') { state.butoaneAcoperite = value === 'da'; return; }
    if (key === 'magsafe') { state.magsafe = value === 'da'; return; }
    (state as any)[key] = typeof (state as any)[key] === 'number' ? Number(value) : value;
  },

  onMove() { /* piesă unică, nimic de mutat */ },

  rebuild() {
    const t = telefon();
    if (!t) return { objects: [], status: [{ key: 'gol', text: tr('huse.faraModele'), warn: true }] };
    const r = construieste(t);
    const d = r.diagnostic;
    const f = (n: number, k = 1) => n.toLocaleString('en-US', { maximumFractionDigits: k });

    /**
     * ORIENTAREA IMPLICITA IN SCENA: CULCATA PE SPATE, cu fata ecranului in sus.
     *
     * Geometria se construieste cu grosimea pe Z, fiindca asa se aseaza pe placa la export; dar
     * scena are Y-ul in sus, deci piesa aparea IN PICIOARE — o husa sprijinita pe muchia de jos,
     * pozitie in care nu o vede nimeni niciodata. Culcata e si pozitia in care se decoreaza
     * spatele, si cea in care se printeaza.
     *
     * E rotatie de AFISARE. Corpul din arena si `exportBodies` raman neatinse: la export placa e
     * planul XY, deci geometria construita e deja asezata corect.
     */
    /**
     * ASEZAREA IN SCENA: se roteste, apoi se COBOARA PE PLACA.
     *
     * Fara a doua parte, piesa strapungea grila: buza camerei coboara 5,88 mm sub spatele
     * telefonului, iar in scena aia inseamna sub podea. Se calculeaza o SINGURA deplasare, din
     * husa, si se aplica si machetei — altfel cele doua ar cadea fiecare pe placa separat si
     * telefonul ar iesi din husa.
     */
    const rot = ROTATII[state.orientare];
    const husaRotita = r.corp.rotate(rot);
    /**
     * SCENA ARE Y-UL INVERS FAȚĂ DE MODEL.
     *
     * `manifoldToGeometry` neagă Y la conversie (convenția Y-jos a textului, moștenită de tot
     * proiectul). Deci punctul cel mai de JOS din scenă e cel cu Y-ul cel mai MARE în model, iar
     * așezarea pe placă se face cu `−max`, nu cu `−min`.
     *
     * Prima variantă folosea `min` și trecea și testul — fiindcă testul măsura tot în spațiul
     * modelului, adică repeta greșeala în loc s-o prindă. Pe ecran, piesa atârna sub placă și o
     * atingea cu vârful, în toate cele trei orientări. Verificarea măsoară acum în spațiul SCENEI.
     *
     * Nume LED face exact la fel — `translate([0, -bb.max[1], 0])`, cu comentariul „talpa la
     * y = 0". Îl citisem și îl luasem drept altceva.
     */
    const sus = husaRotita.boundingBox().max[1];
    const peplaca = (m: any) => m.translate([0, -sus, 0]);

    const husaAsezata = peplaca(husaRotita);
    husaRotita.delete();
    const objects: SceneObject[] = [
      { id: 'husa', nume: tr('huse.numeCorp', { model: t.model }),
        geometry: manifoldToGeometry(husaAsezata), color: state.culoare, movable: false,
        warn: d.bucati > 1 },
    ];
    husaAsezata.delete();

    /**
     * MANECHINUL — construit la fiecare reconstrucție și eliberat imediat.
     *
     * Nu intră în arenă și nu se ține între rulaje: e ieftin față de husă, iar un al doilea corp
     * ținut viu ar dubla contabilitatea de handle-uri pentru ceva ce nu se exportă niciodată.
     */
    if (state.aratTelefon) {
      const m = manechinTelefon(config(t));
      const mr = m.rotate(rot);
      const ma = peplaca(mr);
      objects.push({ id: 'telefon', nume: tr('huse.numeTelefon', { model: t.model }),
        geometry: manifoldToGeometry(ma), color: state.culoareTelefon, movable: false,
        opacitate: 0.35 });
      m.delete(); mr.delete(); ma.delete();
    }

    const status: StatusItem[] = [
      { key: 'dim', text: tr('huse.statusDim', { w: f(d.amprenta[0]), h: f(d.amprenta[1]),
        t: f(d.inaltimeTotala), v: f(d.volumCM3) }) },
    ];

    if (state.ceExporti === 'bumper') {
      const t2 = telefon();
      status.push({ key: 'bumper', text: tr('huse.statusBumper') });
      if (t2) {
        status.push({ key: 'marcajSina', text: tr('huse.statusMarcajSina',
          { mm: f(tronsonLiberSina(t2, 'dreapta').lungime, 1) }) });
      }
    }

    if (state.ceExporti === 'rama') {
      status.push({ key: 'rama', text: d.gravare
        ? tr('huse.statusRamaGravata', { text: d.gravare }) : tr('huse.statusRama') });
      if (d.bresa) {
        status.push({ key: 'bresa', text: tr('huse.statusBresa',
          { l: f(d.bresa.lungime, 2), taiat: f(d.bresa.taiatLaColt, 2) }) });
      }
    }

    /*
     * BUZA CAMEREI — cea mai ușor de greșit cotă a piesei, și singura care se vede în poze.
     *
     * Pe bumper nu există: spatele e deschis, deci nimic nu se ridică peste lentilă. Rândul se
     * scoate, nu se afișează cu zero — o cotă adevărată despre o piesă care n-o are e tot o
     * minciună, doar cu cifra corectă.
     */
    if (state.ceExporti === 'bumper') {
      /* fără buză de cameră: n-are spate */
    } else if (d.buzaCamera.construita + 1e-9 < d.buzaCamera.ceruta) {
      status.push({ key: 'buza', text: tr('huse.statusBuzaLimitata',
        { c: f(d.buzaCamera.construita, 2), cer: f(d.buzaCamera.ceruta, 2) }), warn: true });
    } else {
      status.push({ key: 'buza', text: tr('huse.statusBuza', { c: f(d.buzaCamera.construita, 2) }) });
    }
    if (d.marginiCamera.laPerete.length) {
      status.push({ key: 'laPerete', text: tr('huse.statusLaPerete', { n: d.marginiCamera.laPerete.length }) });
    }

    // FERESTRELE și cea mai îngustă punte dintre două vecine
    const intre = d.punti.filter((p) => p.de !== null && p.pana !== null);
    const minPunte = intre.length ? Math.min(...intre.map((p) => p.latime)) : null;
    status.push({ key: 'ferestre', text: minPunte === null
      ? tr('huse.statusFerestre', { n: d.ferestre.length })
      : tr('huse.statusFerestrePunte', { n: d.ferestre.length, p: f(minPunte, 2) }),
    warn: minPunte !== null && minPunte < PERETE_MIN - 1e-6 });

    /**
     * INTRAREA ÎN RACORD e INFORMATIVĂ, nu avertisment (regulă, B.6 șablonul 4).
     *
     * Grilele urmăresc muchia telefonului, deci fereastra lor trece de tangenta colțului la toți
     * piloții. Nu e un defect care se poate repara — e forma telefonului. Un avertisment ar cere
     * omului să dreagă ceva ce nu se poate drege.
     */
    const inRacord = d.ferestre.filter((x) => x.depasireColt > 1e-6);
    if (inRacord.length) {
      status.push({ key: 'racord', text: tr('huse.statusRacord', { n: inRacord.length,
        max: f(Math.max(...inRacord.map((x) => x.depasireColt)), 2) }) });
    }

    if (d.keepOut.length) {
      status.push({ key: 'keepout', text: tr('huse.statusKeepOut',
        { n: d.keepOut.length, nume: d.keepOut.map((k) => k.nume).join(', ') }) });
    }
    if (d.spate && d.spate.stil !== 'plin') {
      if (d.spate.fortatGravat) {
        status.push({ key: 'fortat', text: tr('huse.statusFortatGravat'), warn: true });
      }
      if (d.spate.panaLaCamera !== Infinity && d.spate.panaLaCamera < DIST_TEXT_CAMERA - 1e-6) {
        status.push({ key: 'textCamera', text: tr('huse.statusTextCamera',
          { d: f(d.spate.panaLaCamera, 2), min: DIST_TEXT_CAMERA }), warn: true });
      }
      status.push({ key: 'spate', text: tr('huse.statusSpate',
        { stil: tr('huse.spate_' + d.spate.stil), aria: f(d.spate.aria, 0) }) });
      if (d.spate.stil === 'perforat') {
        status.push({ key: 'gauri', text: tr('huse.statusPerforat',
          { n: d.spate.gauri, omise: d.spate.gauriOmise }) });
        /**
         * PUNTEA prea subtire nu se ascunde: deschiderea morfologica o repara singura, dar daca
         * a trebuit sa repare mult inseamna ca densitatea ceruta e prea mare pentru piesa, iar
         * omul primeste alt model decat a cerut fara sa afle.
         */
        /*
         * RANDUL SE ARATA DOAR CAND MAGSAFE E OPRIT: e o consecinta a alegerii, nu o stare.
         * Cand e pornit, comportamentul e cel asteptat si n-are ce anunta.
         */
        if (d.spate.magsafe === false) {
          status.push({ key: 'faraMagsafe', text: tr('huse.statusFaraMagsafe'), warn: true });
        }
        if (d.spate.ariaSubPrag > 5) {
          status.push({ key: 'punteSubtire', text: tr('huse.statusPunteSubtire',
            { aria: f(d.spate.ariaSubPrag, 0), min: PERETE_MIN }), warn: true });
        }
      }
    }
    if (d.marcaj) {
      /*
       * Textul spune UNDE stă marcajul, deci diferă între husă și bumper: pe husă la baza
       * spatelui, pe bumper pe șina din dreapta. Numai semnătura are variantă proprie —
       * celelalte două moduri nu numesc locul.
       */
      const cheieMarcaj = state.ceExporti === 'bumper' && d.marcaj.mod === 'semnatura'
        ? 'huse.statusMarcajSina_semnatura' : 'huse.statusMarcaj_' + d.marcaj.mod;
      status.push({ key: 'marcaj', text: tr(cheieMarcaj, { mm: f(d.marcaj.volumScosMM3, 0) }) });
      if (d.marcaj.mod !== 'fara') {
        status.push({ key: 'marcajCutie', text: tr('huse.statusMarcajCutie',
          { l: f(d.marcaj.cutie.latime, 1), h: f(d.marcaj.cutie.inaltime, 1),
            t: f(d.marcaj.trasaturaMinMM, 2), p: d.marcaj.puntiAdaugate }) });
        if (d.marcaj.subtire) {
          status.push({ key: 'marcajSubtire', text: tr('huse.statusMarcajSubtire',
            { t: f(d.marcaj.trasaturaMinMM, 2) }), warn: true });
        }
      }
    }

    /**
     * PREVIEW-UL ARATA TEXTUL IN OGLINDA, SI E NORMAL PANA LA VIS.1 (regula R.5, deschisa).
     *
     * `manifoldToGeometry` face (x, y, z) -> (x, -y, z): o REFLEXIE, nu o rotatie. Ecranul arata
     * deci imaginea in oglinda a piesei printate, la orice unghi de camera — nicio orbitare n-o
     * anuleaza. Pe piese simetrice nu se vede; pe text, da.
     *
     * Fisierul exportat e corect (verificat pe piesa si in 3MF, vezi `npm run verifica:oglindire`),
     * deci n-are ce repara utilizatorul. Randul asta exista strict ca sa nu creada ca e stricat.
     * Se scoate cand VIS.1 reconstruieste scena cu rotatie reala Z-sus -> Y-sus.
     *
     * Doar unde chiar se vede text pe piesa: marcaj vizibil sau nume pe spate. Micro-marcajul e
     * pe fata interioara, sub telefon, si nu-l cauta nimeni pe ecran.
     */
    const areTextVizibil = (d.marcaj != null && d.marcaj.mod !== 'fara')
      || state.stilSpate === 'nume-gravat' || state.stilSpate === 'nume-decupat';
    if (areTextVizibil) status.push({ key: 'previewOglinda', text: tr('huse.statusPreviewOglinda') });

    if (state.butoaneAcoperite) {
      status.push({ key: 'acoperite', text: tr('huse.statusAcoperite') });
    }

    // FLEXUL — și, mai ales, colțurile la care NU s-a putut pune
    if (state.material === 'rigid') {
      const omise = d.flex.filter((x) => !x.asezat);
      status.push(omise.length
        ? { key: 'flex', text: tr('huse.statusFlexOmis',
          { n: d.flex.length - omise.length, omise: omise.length }), warn: true }
        : { key: 'flex', text: tr('huse.statusFlex', { n: d.flex.length }) });
    }

    // GROSIMEA SPATELUI, doar în inelul de încărcare (B.8)
    if (d.incarcare?.peste) {
      status.push({ key: 'incarcare', text: tr('huse.statusIncarcare',
        { g: f(d.incarcare.grosimeSpate, 2), max: f(d.incarcare.limita ?? 0, 2) }), warn: true });
    }

    if (d.bucati > 1) {
      status.push({ key: 'bucati', text: tr('huse.statusBucati', { n: d.bucati }), warn: true });
    }
    if (!d.incapePePlaca) {
      status.push({ key: 'placa', text: tr('huse.statusNuIncape',
        { w: f(d.amprenta[0]), h: f(d.amprenta[1]) }), warn: true });
    }
    if (!t.verificat && state.ceExporti === 'husa') {
      status.push({ key: 'proba', text: tr('huse.statusPrinteazaRama'), warn: true });
    }
    return { objects, status };
  },

  exportBodies(): ExportBody[] {
    const t = telefon();
    if (!t) return [];
    const r = last ?? construieste(t);
    /**
     * SE EXPORTĂ DOAR HUSA. Manechinul nu apare aici — nu e o omisiune, e regula B.10: telefonul
     * desenat există ca să se vadă alinierea, nu ca să ajungă în slicer.
     */
    return [{
      name: state.ceExporti === 'bumper' ? tr('huse.piesaBumper', { model: t.model })
        : state.ceExporti === 'rama' ? tr('huse.piesaRama', { model: t.model })
        : tr('huse.piesaHusa', { model: t.model }),
      manifold: pentruPrint(r.corp), culoare: state.culoare,
      orientare: tr('huse.orientare'),
    }];
  },

  exportName() {
    const t = telefon();
    return `${state.ceExporti}-${t?.id ?? 'model'}-${state.material}`;
  },

  exportNotes(): string[] {
    const t = telefon();
    if (!t) return [];
    const s = t as never as { sursa: { document: string; fisier?: string; versiune: string; pagina: number } };
    return [
      tr('huse.notaModel', { model: t.model,
        verificat: tr(t.verificat ? 'huse.verificatDa' : 'huse.verificatNu') }),
      tr('huse.notaSursa', { doc: s.sursa.fisier || s.sursa.document, pagina: s.sursa.pagina }),
      tr(state.material === 'tpu' ? 'huse.notaTpu' : 'huse.notaRigid'),
      tr('huse.notaOrientare'),
      ...(state.stilSpate === 'perforat'
        ? [tr(state.magsafe ? 'huse.notaMagsafeDa' : 'huse.notaMagsafeNu')] : []),
      /**
       * CEA MAI SUBȚIRE SECȚIUNE, scrisă pe fișă. Nu e un avertisment: 1,0 mm înseamnă cinci
       * straturi la 0,2 și se printează fără probleme. E locul unde piesa cedează prima dată,
       * deci omul are dreptul să știe unde e înainte să tragă husa pe telefon.
       */
      tr('huse.notaSectiuneSubtire', { mm: (last?.diagnostic.bandaPesteFerestre ?? 0).toFixed(2) }),
      tr('huse.notaGrosime', {
        g: (last?.diagnostic.grosime.inAfaraCamerei ?? 0).toFixed(2),
        c: (last?.diagnostic.grosime.totala ?? 0).toFixed(2) }),
      tr('huse.notaRetentie', { mm: state.buzaEcran.toFixed(2) }),
      tr('huse.notaApple'),
    ];
  },

  getPreset() { return { v: 1, stare: { ...state } }; },
  loadPreset(p: any) { if (p && p.stare) Object.assign(state, p.stare); },
};

runApp(app);
