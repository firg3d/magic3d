/**
 * APP NUME LED — implementează AppDefinition și rulează prin nucleu (runApp).
 *
 * Nu importă NIMIC din alte aplicații (izolare). Corpul luminos vine din
 * core/geometry/luminos.ts — același modul care servește Litere LED — iar măsurătorile de
 * cuvânt din core/geometry/cuvant.ts, același care servește Nume 3D.
 *
 * Deosebirea de panou față de Litere LED: acolo se alege UN CARACTER dintr-o listă, aici se
 * SCRIE un text. Și apare butonul care caută îngroșarea de la care cuvântul devine o piesă
 * întreagă cu bandă în ea — la un font cursiv, răspunsul „nu merge" ar fi fals: merge, de la
 * o anumită îngroșare, iar aplicația o calculează în loc s-o ceară ghicită.
 */
import { t as tr } from '../../core/i18n/index.js';
import type { AppDefinition, PanelControl, PanelGroup, SceneObject, StatusItem, ExportBody } from '../../core/app.js';
import { runApp } from '../../core/ui/shell.js';
import { manifoldToGeometry, initManifold } from '../../core/geometry/manifold.js';
import { inArena, adunaHandle, elibereaza } from '../../core/geometry/arena.js';
import { configureManifold as configNumeLed, buildNumeLed, pentruPrint, ingrosareaCareMerge,
  evalueazaFont, PERETE_OPAC_MIN, FATA_MAX_UTIL, BENZI, POZITII_CANAL, LOCURI_CANAL,
  INGROSARE_MAX, PAS_INGROSARE, INALTIME_MIN, INALTIME_MAX, INALTIME_PAS,
  type NumeLedResult, type TipAgatare, type TipBanda, type PozitieCanal, type LocCanal,
  type VerdictFont, type ModProdus } from './nume-led.js';
import { loadFontManifest, loadFont, fontCached, fontGroups, previewURL, allFonts } from '../../core/assets/fonts.js';
import { creeazaEvaluatorFonturi } from '../../core/assets/evaluare-fonturi.js';

interface State {
  text: string;
  font: string;
  modProdus: ModProdus;
  inaltimeLitera: number;
  adancimeCorp: number;
  ingrosare: number;
  grosimePerete: number;
  grosimeSpate: number;
  latimeBanda: number;
  tipBanda: TipBanda;
  latimePrag: number;
  adancimePrag: number;
  grosimeFata: number;
  jocFata: number;
  diametruCanal: number;
  pozitieCanal: PozitieCanal;
  locCanal: LocCanal;
  vedere: 'ansamblu' | 'faraFata' | 'explodat';
  tipAgatare: TipAgatare;
  surubCap: number;
  surubTija: number;
  inaltimeCapSurub: number;
  latimeGrila: number;
  culoare: string;
  culoareFata: string;
  /** ultimul sfat de îngroșare, cerut cu butonul; null = nu s-a cerut încă */
  sfatIngrosare: number | null;
}
const state: State = {
  text: 'Maria',
  // font cursiv implicit: la un cuvânt luminos, cursivul e singurul care leagă literele într-o
  // piesă cu un tunel continuu. Măsurat pe „Maria" — vezi comentariul din nume-led.ts.
  font: 'GreatVibes-Regular.ttf',
  modProdus: 'perete',
  inaltimeLitera: 80,
  adancimeCorp: 25,
  // 3 mm, nu 0: la cursiv fără îngroșare cuvântul iese în bucăți și fără loc de bandă. Valoarea
  // implicită trebuie să dea un produs care merge, nu unul pe care omul îl repară singur.
  ingrosare: 3,
  grosimePerete: 2,
  grosimeSpate: 2,
  latimeBanda: 10,
  tipBanda: 60,
  latimePrag: 1.2,
  adancimePrag: 2,
  grosimeFata: 1.6,
  jocFata: 0.2,
  diametruCanal: 4,
  // pe perete cablul iese prin spate; la schimbarea modului se mută singur (vezi onControl)
  pozitieCanal: 'spate',
  locCanal: 'jos',
  vedere: 'ansamblu',
  tipAgatare: 'cheie',
  surubCap: 5,
  surubTija: 2.5,
  inaltimeCapSurub: 3,
  latimeGrila: 20,
  culoare: '#2b2f38',
  culoareFata: '#f2efe6',
  sfatIngrosare: null,
};

let ctx: any = null;
let last: NumeLedResult | null = null;

const config = () => ({
  text: state.text, font: fontCached(state.font), modProdus: state.modProdus,
  inaltimeLitera: state.inaltimeLitera, adancimeCorp: state.adancimeCorp,
  ingrosare: state.ingrosare, grosimePerete: state.grosimePerete, grosimeSpate: state.grosimeSpate,
  latimeBanda: state.latimeBanda, tipBanda: state.tipBanda, latimePrag: state.latimePrag,
  adancimePrag: state.adancimePrag, grosimeFata: state.grosimeFata, jocFata: state.jocFata,
  diametruCanal: state.diametruCanal, pozitieCanal: state.pozitieCanal, locCanal: state.locCanal,
  tipAgatare: state.tipAgatare, surubCap: state.surubCap, surubTija: state.surubTija,
  inaltimeCapSurub: state.inaltimeCapSurub, latimeGrila: state.latimeGrila,
  placa: ctx?.placa() ?? { w: 256, d: 256 },
});

function construieste(): NumeLedResult {
  const r = inArena(() => buildNumeLed(config() as any), (rez) => [rez]);
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

/**
 * VERDICTELE FONTURILOR. Criteriul e al CUVÂNTULUI întreg, nu al unei glife: un font poate fi
 * bun pentru „O" și prost pentru „Madalina".
 */
const evaluator = creeazaEvaluatorFonturi<VerdictFont>(
  () => `${state.text}|${state.inaltimeLitera}|${state.ingrosare}|${state.grosimePerete}|${state.latimePrag}|${state.latimeBanda}`,
  (font) => evalueazaFont(font, state.text, state.inaltimeLitera, state.grosimePerete,
    state.latimePrag, state.latimeBanda, state.ingrosare),
);

function motivRespins(v: VerdictFont): string {
  return tr(v.inaltimeMinMM ? 'numeled.fontRespinsInalt' : 'numeled.fontRespins',
    { trasatura: v.trasaturaMaxMM.toFixed(1), necesar: v.necesarMM.toFixed(1), inaltmin: v.inaltimeMinMM });
}

function fontControl(): PanelControl {
  const item = (f: { fisier: string; familie: string; lipsaDiacritice: string[] }) => {
    const v = evaluator.verdict(f.fisier);
    return { value: f.fisier, label: f.familie, url: previewURL(f as any), missing: f.lipsaDiacritice,
      ...(v && !v.ok ? { respins: motivRespins(v) } : {}) };
  };
  const grupuri = fontGroups().map((g) => ({ categorie: g.categorie, items: g.items.map(item) }));
  const cereVerdict = async (fisier: string): Promise<string | null> => {
    const v = await evaluator.cere(fisier);
    return v && !v.ok ? motivRespins(v) : null;
  };
  return { kind: 'fontselect', cereVerdict, key: 'font', label: tr('numeled.font'), value: state.font,
    groups: grupuri };
}

const app: AppDefinition = {
  title: 'numeled',
  id: 'numeled',

  async init(c) {
    ctx = c;
    configNumeLed(await initManifold());
    await loadFontManifest();
    if (!allFonts().some((f) => f.fisier === state.font)) {
      state.font = (fontGroups().find((g) => g.categorie === 'Cursiv')?.items[0] ?? allFonts()[0])?.fisier ?? '';
    }
    if (state.font) await loadFont(state.font).catch(() => { /* font indisponibil */ });
  },

  async reloadLibraries() { await loadFontManifest(); },

  panels(): PanelGroup[] {
    return [
      { title: tr('numeled.grupText'), controls: [
        { kind: 'text', key: 'text', label: tr('numeled.text'), value: state.text },
        fontControl(),
        { kind: 'number', key: 'inaltimeLitera', label: tr('numeled.inaltimeLitera'),
          min: INALTIME_MIN, max: INALTIME_MAX, step: INALTIME_PAS, value: state.inaltimeLitera },
        /**
         * ÎNGROȘAREA e primul control, nu unul ascuns printre finisaje: la un cuvânt cursiv ea
         * decide dacă produsul EXISTĂ. Fără ea, literele nu se leagă și banda n-are unde intra.
         */
        { kind: 'number', key: 'ingrosare', label: tr('numeled.ingrosare'),
          min: 0, max: INGROSARE_MAX, step: PAS_INGROSARE, value: state.ingrosare },
        { kind: 'button', key: 'gasesteIngrosare', label: tr('numeled.gasesteIngrosare') },
        ...(state.sfatIngrosare !== null ? [{ kind: 'note' as const, key: 'sfat',
          label: tr('numeled.sfat'),
          value: state.sfatIngrosare < 0 ? tr('numeled.sfatNiciuna')
            : state.sfatIngrosare === 0 ? tr('numeled.sfatMergeAsa')
              : tr('numeled.sfatValoare', { mm: state.sfatIngrosare }) }] : []),
      ] },
      { title: tr('numeled.grupMontaj'), controls: [
        { kind: 'select', key: 'modProdus', label: tr('numeled.modProdus'), value: state.modProdus,
          options: [{ value: 'masa', label: tr('numeled.mod_masa') },
            { value: 'perete', label: tr('numeled.mod_perete') }] },
        ...(state.modProdus === 'perete' ? [{ kind: 'select' as const, key: 'tipAgatare',
          label: tr('numeled.tipAgatare'), value: state.tipAgatare,
          options: [{ value: 'cheie', label: tr('numeled.agatare_cheie') },
            { value: 'grila', label: tr('numeled.agatare_grila') }] }] : []),
        { kind: 'select', key: 'pozitieCanal', label: tr('numeled.pozitieCanal'), value: state.pozitieCanal,
          options: POZITII_CANAL.map((p) => ({ value: p, label: tr('numeled.canal_' + p) })) },
        { kind: 'select', key: 'locCanal', label: tr('numeled.locCanal'), value: state.locCanal,
          options: LOCURI_CANAL.map((p) => ({ value: p, label: tr('numeled.loc_' + p) })) },
        { kind: 'number', key: 'diametruCanal', label: tr('numeled.diametruCanal'),
          min: 2, max: 10, step: 0.5, value: state.diametruCanal },
      ] },
      { title: tr('numeled.grupLumina'), controls: [
        { kind: 'select', key: 'tipBanda', label: tr('numeled.tipBanda'), value: String(state.tipBanda),
          options: BENZI.map((b) => ({ value: String(b), label: tr('numeled.banda' + b) })) },
        { kind: 'number', key: 'latimeBanda', label: tr('numeled.latimeBanda'),
          min: 4, max: 20, step: 0.5, value: state.latimeBanda },
        { kind: 'number', key: 'adancimeCorp', label: tr('numeled.adancimeCorp'),
          min: 8, max: 60, step: 1, value: state.adancimeCorp },
        { kind: 'number', key: 'grosimeFata', label: tr('numeled.grosimeFata'),
          min: 0.8, max: 4, step: 0.2, value: state.grosimeFata },
      ] },
      { title: tr('numeled.grupPereti'), controls: [
        { kind: 'number', key: 'grosimePerete', label: tr('numeled.grosimePerete'),
          min: 1, max: 6, step: 0.2, value: state.grosimePerete },
        { kind: 'number', key: 'grosimeSpate', label: tr('numeled.grosimeSpate'),
          min: 1, max: 6, step: 0.2, value: state.grosimeSpate },
        { kind: 'number', key: 'latimePrag', label: tr('numeled.latimePrag'),
          min: 0.6, max: 4, step: 0.2, value: state.latimePrag },
        { kind: 'number', key: 'adancimePrag', label: tr('numeled.adancimePrag'),
          min: 1, max: 6, step: 0.2, value: state.adancimePrag },
        { kind: 'number', key: 'jocFata', label: tr('numeled.jocFata'),
          min: 0, max: 0.6, step: 0.05, value: state.jocFata },
      ] },
      { title: tr('numeled.grupAfisare'), controls: [
        { kind: 'select', key: 'vedere', label: tr('numeled.vedere'), value: state.vedere,
          options: [{ value: 'ansamblu', label: tr('numeled.vedere_ansamblu') },
            { value: 'faraFata', label: tr('numeled.vedere_faraFata') },
            { value: 'explodat', label: tr('numeled.vedere_explodat') }] },
        { kind: 'color', key: 'culoare', label: tr('numeled.culoare'), value: state.culoare },
        { kind: 'color', key: 'culoareFata', label: tr('numeled.culoareFata'), value: state.culoareFata },
      ] },
    ];
  },

  onControl(key, value) {
    if (key === 'gasesteIngrosare') {
      const font = fontCached(state.font);
      if (!font) return;
      /**
       * Butonul APLICĂ, nu doar anunță.
       *
       * Prima variantă doar scria un sfat în panou și chema `refresh()` — iar `refresh()`
       * reconstruiește toată geometria. Măsurat în browser: căutarea 527 ms, reconstrucția
       * 2733 ms, adică 2.7 secunde de așteptare pentru o geometrie care nu se schimbase cu
       * nimic. Punând chiar valoarea găsită, reconstrucția are un motiv, iar omul primește
       * cuvântul reparat în loc de o instrucțiune.
       */
      const gasit = ingrosareaCareMerge(font, state.text, state.inaltimeLitera,
        state.grosimePerete, state.latimePrag, state.latimeBanda);
      state.sfatIngrosare = gasit;
      if (gasit >= 0) state.ingrosare = gasit;
      ctx?.refresh();
      return;
    }
    /**
     * FONTUL se comută abia după ce s-a încărcat. Altfel reconstrucția pleacă pe un font
     * neparsat și cade pe `unitsPerEm`, iar pe ecran rămâne modelul vechi cu o eroare.
     * Aceeași reparație ca în Nume/Cuvinte/Cutii/LED.
     */
    if (key === 'font') {
      const nouFont = value as string;
      if (fontCached(nouFont)) { state.font = nouFont; state.sfatIngrosare = null; return; }
      loadFont(nouFont).then(() => { state.font = nouFont; state.sfatIngrosare = null; ctx?.refresh(); }).catch(() => {});
      return;
    }
    if (key === 'tipBanda') { state.tipBanda = Number(value) as TipBanda; return; }
    /**
     * La schimbarea montajului, cablul se mută singur acolo unde e firesc: pe perete iese prin
     * SPATE, ascuns de piesă; pe masă iese pe DEDESUBT, ascuns de blat. Un canal prin spate la
     * o piesă care stă pe masă ar scoate firul chiar în fața privitorului.
     */
    if (key === 'modProdus') {
      state.modProdus = value as ModProdus;
      state.pozitieCanal = state.modProdus === 'perete' ? 'spate' : 'jos';
      return;
    }
    if (key === 'text') { state.text = String(value); state.sfatIngrosare = null; return; }
    if (key === 'ingrosare') { state.ingrosare = Number(value); return; }
    (state as any)[key] = typeof (state as any)[key] === 'number' ? Number(value) : value;
  },

  onMove() { /* piesă unică, nimic de mutat */ },

  rebuild() {
    const r = construieste();
    const d = r.diagnostice, c = r.cuvant;
    const f = (n: number, k = 1) => n.toLocaleString('en-US', { maximumFractionDigits: k });

    /**
     * CUM SE VEDE, după unde ajunge piesa.
     *   · perete — culcată, cu gura în sus: exact cum se printează și cum stă pe zid.
     *   · masa   — ÎN PICIOARE, cu talpa la y = 0, ca la Nume 3D. Altfel omul ar judeca
     *              stabilitatea unei piese pe care o vede culcată.
     */
    const asezat = (corp: any) => {
      if (state.modProdus === 'perete') return corp.rotate([90, 0, 0]);
      const bb = corp.boundingBox();
      return corp.translate([0, -bb.max[1], 0]);
    };

    const corp = asezat(r.corpOpac);
    const objects: SceneObject[] = [
      { id: 'corp', nume: tr('numeled.numeCorp', { text: state.text }),
        geometry: manifoldToGeometry(corp), color: state.culoare, movable: false,
        warn: c.bucati > 1 },
    ];
    corp.delete();

    if (r.corpFata && state.vedere !== 'faraFata') {
      const ridicat = state.vedere === 'explodat'
        ? r.corpFata.translate([0, 0, state.adancimeCorp]) : null;
      const fa = asezat(ridicat ?? r.corpFata);
      objects.push({ id: 'fata', nume: tr('numeled.numeFata', { text: state.text }),
        geometry: manifoldToGeometry(fa), color: state.culoareFata, movable: false,
        warn: d.fata.coliziuneMM3 > 0 });
      fa.delete(); ridicat?.delete();
    }

    const status: StatusItem[] = [
      { key: 'dim', text: tr('numeled.statusDim', { w: f(d.dimLitera[0]), h: f(d.dimLitera[1]),
        a: f(state.adancimeCorp), t: f(d.inaltimeTotala) }) },
    ];

    /**
     * BUCĂȚILE — cota care decide dacă produsul e ce a cerut omul.
     *
     * Un cuvânt într-o singură bucată are UN tunel continuu: o bandă, un cablu, o piesă.
     * Două bucăți înseamnă două benzi și un fir prin aer între litere — se poate, dar e alt
     * produs, iar omul trebuie să afle acum, nu după print.
     */
    if (c.bucati > 1) {
      status.push({ key: 'bucati', text: tr('numeled.statusBucati', { n: c.bucati }), warn: true });
    } else {
      status.push({ key: 'bucati', text: tr('numeled.statusOPiesa') });
    }
    if (c.camereUtile === 0) {
      status.push({ key: 'camere', text: tr('numeled.statusFaraCamera'), warn: true });
    }
    /**
     * CONSUMUL se dă doar când banda chiar are unde intra.
     *
     * Altfel bara se contrazicea singură: „banda nu încape nicăieri" și, un rând mai jos,
     * „21.2 cm bandă · 12 LED". Lungimea se măsoară pe camerele cavității, iar când niciuna nu
     * e utilă cifra descrie un traseu pe care banda nu poate merge. O cifră cu care omul s-ar
     * duce la magazin trebuie să fie adevărată, sau să lipsească.
     */
    if (d.banda.lungimeCM > 0 && c.camereUtile > 0) {
      status.push({ key: 'banda', text: tr('numeled.statusConsum', { cm: f(d.banda.lungimeCM),
        led: d.banda.nrLED, w: f(d.banda.putereW), v: d.banda.tensiuneV, tip: state.tipBanda }) });
    }
    // OPTIC: distanța de la LED la difuzor trebuie să treacă de pasul dintre LED-uri, altfel
    // se văd punctele în loc de o suprafață luminoasă.
    if (!d.optic.uniform) {
      status.push({ key: 'optic', text: tr('numeled.statusPuncte', { d: f(d.optic.distantaMM),
        pas: f(d.optic.pasMM), adanc: f(d.optic.adancimeMinima) }), warn: true });
    }
    if (d.optic.fataPreaGroasa) {
      status.push({ key: 'fataGroasa', text: tr('numeled.statusFataGroasa', { max: f(FATA_MAX_UTIL) }), warn: true });
    }
    if (state.grosimePerete < PERETE_OPAC_MIN) {
      status.push({ key: 'perete', text: tr('numeled.statusPereteSubtire', { p: f(state.grosimePerete, 2),
        min: f(PERETE_OPAC_MIN, 2) }), warn: true });
    }
    // STABILITATEA — doar pe masă. Pe perete piesa atârnă, deci întrebarea n-are sens.
    if (c.stabilitate) {
      status.push(c.stabilitate.staSingura
        ? { key: 'stabil', text: tr('numeled.statusStaSingur', { unghi: f(c.stabilitate.unghiMinGrade),
          arie: f(c.stabilitate.ariaMM2, 0) }) }
        : { key: 'stabil', text: tr('numeled.statusCade', { arie: f(c.stabilitate.ariaMM2, 0) }), warn: true });
    }
    // PLACA — cuvântul se printează culcat pe spate, deci amprenta e chiar silueta lui
    if (!c.potrivire.incape) {
      status.push({ key: 'placa', text: c.potrivire.inaltimeMaxMM
        ? tr('numeled.statusNuIncape', { w: f(c.potrivire.latimeMM), h: f(c.potrivire.adancimeMM),
          max: c.potrivire.inaltimeMaxMM })
        : tr('numeled.statusNuIncapeDeloc', { w: f(c.potrivire.latimeMM), h: f(c.potrivire.adancimeMM) }),
      warn: true });
    }
    return { objects, status };
  },

  /**
   * EXPORTUL — două piese, în culori diferite, dar ACELAȘI obiect fizic: `grup` le ține
   * împreună la aranjarea pe placă, ca fața să nu plece pe altă placă decât corpul ei.
   */
  exportBodies(): ExportBody[] {
    const r = last ?? construieste();
    const out: ExportBody[] = [
      { name: tr('numeled.piesaCorp'), manifold: pentruPrint(r.corpOpac), culoare: state.culoare,
        orientare: tr('numeled.orientareCorp'), grup: 'nume' },
    ];
    if (r.corpFata) {
      /**
       * FAȚA SE COBOARĂ LA Z=0.
       *
       * Nucleul o construiește în POZIȚIA DE MONTAJ — la 25 mm deasupra spatelui — fiindcă așa
       * verificarea de coliziune întreabă chiar ce trebuie: se lovesc piesele acolo unde vor
       * sta? Dar la print e o piesă separată, care se așază pe placă. Fără coborârea asta ar
       * pleca la slicer plutind 25 mm în aer, pe suporți.
       */
      const f0 = pentruPrint(r.corpFata);
      const bb = f0.boundingBox();
      const asezata = f0.translate([0, 0, -bb.min[2]]);
      f0.delete();
      out.push({ name: tr('numeled.piesaFata'), manifold: asezata,
        culoare: state.culoareFata, orientare: tr('numeled.orientareFata'), grup: 'nume' });
    }
    return out;
  },

  exportName() { return `nume-led-${slug(state.text)}-${state.inaltimeLitera}mm`; },

  exportNotes(): string[] {
    const r = last;
    if (!r) return [];
    const d = r.diagnostice;
    return [
      tr('numeled.notaBanda', { cm: d.banda.lungimeCM.toFixed(0), tip: state.tipBanda,
        led: d.banda.nrLED, w: d.banda.putereW.toFixed(1), v: d.banda.tensiuneV }),
      tr('numeled.notaMontaj', { mod: tr('numeled.mod_' + state.modProdus) }),
      tr('numeled.notaFata'),
    ];
  },

  getPreset() { return { v: 1, stare: { ...state } }; },
  loadPreset(p: any) {
    if (p && p.stare) { Object.assign(state, p.stare); state.sfatIngrosare = null; }
  },
};

runApp(app);
