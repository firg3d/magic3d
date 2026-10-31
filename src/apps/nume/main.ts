/**
 * APP NUME 3D — implementează AppDefinition și rulează prin nucleu (runApp).
 * Nu cablează nimic imperativ din nucleu: declară controale, construiește geometrie.
 * Nu importă NIMIC din alte aplicații (izolare).
 *
 * Geometria piesei vine din `core/geometry/cuvant.ts`, iar panourile, bara de stare și fișa
 * care o descriu din `core/ui/panouri-cuvant.ts` — amândouă împărțite cu Cuvinte Decor. Aici
 * rămâne ce e propriu numelui: textul, fontul și verdictul lui.
 */
import { t as tr } from '../../core/i18n/index.js';
import type { AppDefinition, PanelGroup, SceneObject, StatusItem, ExportBody } from '../../core/app.js';
import { runApp } from '../../core/ui/shell.js';
import { manifoldToGeometry, initManifold } from '../../core/geometry/manifold.js';
import { inArena, adunaHandle, elibereaza } from '../../core/geometry/arena.js';
import { grupuriPiesa, stariPiesa, stariFinale, blocajPiesa, corpuriExport, notePiesa,
  comutaModProdus, type StarePiesa } from '../../core/ui/panouri-cuvant.js';
import { configureManifold as configNume, buildNume, evalueazaFont, INALTIME_MIN, INALTIME_MAX,
  PAS_INALTIME, GROSIME_MIN, GROSIME_MAX, RAZA_PUNTE, type NumeResult, type VerdictFont,
  type ModProdus } from './nume.js';
import { loadFontManifest, loadFont, fontCached, fontGroups, previewURL, allFonts } from '../../core/assets/fonts.js';
import { creeazaEvaluatorFonturi } from '../../core/assets/evaluare-fonturi.js';

interface State extends StarePiesa { text: string; font: string }

const state: State = {
  text: 'Maria',
  // cursiv de la bun început: e fontul la care literele se leagă singure, deci configurația
  // implicită arată produsul, nu problema lui
  font: 'GreatVibes-Regular.ttf',
  // 60, nu 80: măsurat, la 80 mm aproape orice nume depășește placa de 256 mm. Implicitul
  // trebuie să iasă printabil, nu doar frumos în viewport.
  inaltimeLitera: 60,
  // 30–40 mm e plaja în care numele stă singur pe masă; 35 e mijlocul ei
  grosime: 35,
  // PORNITE: la orice nume cu „i" punctul plutește, iar un punct care cade de pe piesă în
  // slicer nu se vede decât după print
  punti: true,
  latimePunte: 1.2,
  // RAMA ÎN JUR, din start: numele rămâne vizibil pe toată grosimea lui, iar banda îi urmează
  // conturul în a doua culoare. Măsurat, e și mai stabilă decât placa — talpa e la fel de adâncă
  // pe toată lățimea (17.5 mm rezervă față de 15.4), fiindcă banda are grosimea numelui.
  contur: 'rama',
  latimeContur: 5,
  // netezirea NU e cosmetică: fără ea colțurile interioare dintre litere rămân crestături
  netezireContur: 4,
  grosimeContur: 6,
  // se deschide ca obiect DE MASĂ: e configurația în care se vede produsul întreg, iar
  // stabilitatea — verificarea care blochează exportul — are sens de la primul randat
  modProdus: 'masa',
  tipAgatare: 'fara',
  // șurub mic de perete, cap Ø5 / tijă Ø2.5 — aceeași calibrare ca la Litere Fagure, Cutii și LED
  surubCap: 5,
  surubTija: 2.5,
  inaltimeCapSurub: 3,
  // 20, nu 40: măsurat, un canal de 40 mm nu încape în banda de contur a niciunui nume încercat.
  latimeGrila: 20,
  // capacul acoperă capul șurubului la gaura străpunsă: fără el, șurubul rămâne la vedere
  capac: true,
  grosimeCapac: 2,
  culoare: '#C9A227',
  culoareContur: '#3A3A3C',
  // capacul e piesă separată, deci propria lui culoare: unde cade — pe literă sau pe bandă —
  // depinde de unde a încăput locașul, iar o culoare ghicită ar fi greșită jumătate din timp
  culoareCapac: '#C9A227',
};

let ctx: { refresh(): void; placa(): { w: number; d: number } } | null = null;
let last: NumeResult | null = null;

/**
 * MEMORIA WASM. Obiectele Manifold sunt handle-uri embind: memoria lor sta in heap-ul WASM si
 * GC-ul JS n-o atinge. Fara arena, aceasta aplicatie crea obiecte la fiecare reconstructie
 * fara ca nimeni sa le numere; heap-ul creste pana cand WASM-ul incepe sa arunce, iar pe
 * ecran ramane modelul vechi. Acelasi tipar ca in apps/litere/build.ts; se verifica din
 * consola cu `__shell.contorArena()`, care trebuie sa ramana pe 0 intre reconstructii.
 */
function construieste(): NumeResult {
  const r = inArena(() => buildNume(config()), (rez) => [rez]);
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

/**
 * VERDICTELE FONTURILOR, evaluate în FUNDAL.
 *
 * Criteriul e specific produsului: la un nume care stă singur, un font e nepotrivit când literele
 * lui NU se ating deloc — atunci numele iese în tot atâtea bucăți câte litere are, iar aplicația
 * fie le leagă cu punți vizibile, fie livrează un puzzle. Nu e o listă scrisă de mână: „Cursiv"
 * din manifest nu e același lucru cu „literele se leagă" (Tangerine e cursiv și scrie despărțit).
 */
const evaluator = creeazaEvaluatorFonturi<VerdictFont>(
  () => `${state.text}|${state.inaltimeLitera}`,
  (font) => evalueazaFont(font, state.text.trim() || ' ', state.inaltimeLitera),
);

/** motivul afișat sub un font respins — cu cifre, ca peste tot în aplicație */
function motivRespins(v: VerdictFont): string {
  return v.ramase
    ? tr('nume.fontRespinsLibere', { n: v.ramase, litere: v.litere })
    : tr('nume.fontRespins', { n: v.bucati, litere: v.litere });
}

function fontControl() {
  const item = (f: { fisier: string; familie: string; lipsaDiacritice: string[] }) => {
    const v = evaluator.verdict(f.fisier);
    return { value: f.fisier, label: f.familie, url: previewURL(f as any), missing: f.lipsaDiacritice,
      ...(v && !v.ok ? { respins: motivRespins(v) } : {}) };
  };
  const grupuri = fontGroups().map((g) => ({ categorie: g.categorie, items: g.items.map(item) }));
  // „recomandate" = fonturile la care numele iese o piesă FĂRĂ punți lungi: legătura există, dar
  // nu se vede. Din aceeași măsurătoare cu restul, nu dintr-o listă ținută de mână.
  const recomandate = fontGroups().flatMap((g) => g.items)
    .filter((f) => { const v = evaluator.verdict(f.fisier); return v && v.ok && v.puntaMaxMM <= RAZA_PUNTE * state.inaltimeLitera; })
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
  return { kind: 'fontselect' as const, cereVerdict, key: 'font', label: tr('nume.font'), value: state.font,
    groups: recomandate.length ? [{ categorie: tr('nume.fonturiRecomandate'), items: recomandate }, ...grupuri] : grupuri };
}


const config = () => ({ ...state, text: state.text.trim() || ' ', font: fontCached(state.font),
  placa: ctx?.placa() ?? { w: 256, d: 256 } });

const app: AppDefinition = {
  title: 'nume',
  id: 'nume',

  async init(c) {
    ctx = c as any;
    configNume(await initManifold());
    await loadFontManifest();
    // fontul implicit se poate să nu existe în folder -> primul cursiv, altfel primul din listă
    if (!allFonts().some((f) => f.fisier === state.font)) {
      state.font = (fontGroups().find((g) => g.categorie === 'Cursiv')?.items[0] ?? allFonts()[0])?.fisier ?? '';
    }
    if (state.font) await loadFont(state.font).catch(() => { /* font indisponibil */ });
  },

  async reloadLibraries() { await loadFontManifest(); },

  panels(): PanelGroup[] {
    return [
      { title: tr('nume.grupNume'), controls: [
        { kind: 'text', key: 'text', label: tr('nume.text'), value: state.text },
        fontControl(),
        { kind: 'number', key: 'inaltimeLitera', label: tr('nume.inaltime'), min: INALTIME_MIN, max: INALTIME_MAX, step: PAS_INALTIME, value: state.inaltimeLitera },
        { kind: 'number', key: 'grosime', label: tr('nume.grosime'), min: GROSIME_MIN, max: GROSIME_MAX, step: 1, value: state.grosime },
        { kind: 'color', key: 'culoare', label: tr('nume.culoare'), value: state.culoare },
      ] },
      ...grupuriPiesa(state, last?.diagnostice ?? null),
    ];
  },

  onControl(key, value) {
    if (key === 'modProdus') { comutaModProdus(state, value as ModProdus); return; }
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
    const d = r.diagnostice;
    // numele stă în picioare: planul literei e vertical, grosimea e adâncimea pe masă. Modelul e
    // deja așezat așa (talpa la y=0), viewport-ul inversează Y — deci nicio rotație aici.
    // Doar centrarea pe adâncime, ca piesa să stea în mijlocul plăcii, nu în fața ei.
    const dz = -d.dim[2] / 2;
    const geom = (m: any) => { const c = m.translate([0, 0, dz]); const g = manifoldToGeometry(c); c.delete(); return g; };

    const objects: SceneObject[] = [
      { id: 'nume', nume: tr('nume.numeCorp', { text: state.text }), geometry: geom(r.corp),
        color: state.culoare, movable: false, warn: d.bucati > 1 },
      ...(r.contur ? [{ id: 'contur', nume: tr('piesa.numeContur'), geometry: geom(r.contur),
        color: state.culoareContur, movable: false }] : []),
      ...(r.capac ? [{ id: 'capac', nume: tr('piesa.numeCapac'), geometry: geom(r.capac),
        color: state.culoareCapac, movable: false }] : []),
    ];
    const status: StatusItem[] = stariPiesa(state, d, config().placa);
    // LITERELE NU SE ATING — la fonturile drepte răspunsul corect nu e un parametru, e alt font
    const v = evaluator.verdict(state.font);
    if (v && !v.ok && !v.ramase) {
      status.push({ key: 'font', text: tr('nume.statusFontDrept', { n: v.bucati, litere: v.litere }), warn: true });
    }
    if (d.glifeLipsa.length) status.push({ key: 'glifa', text: tr('nume.statusGlifaLipsa', { litere: d.glifeLipsa.join(' ') }), warn: true });
    status.push(...stariFinale(d, r.ms));
    return { objects, status };
  },

  onMove() { /* numele e piesa unică a scenei; nu se mută */ },

  exportBodies(): ExportBody[] {
    if (!last) return [];
    const d = last.diagnostice;
    if (d.glifeLipsa.length) throw new Error(tr('nume.blocatFaraGeometrie', { litere: d.glifeLipsa.join(' ') }));
    const blocaj = blocajPiesa(state, d);
    if (blocaj) throw new Error(blocaj);
    return corpuriExport(state, last, `nume_${slug(state.text)}`);
  },
  exportName() { return `nume-${slug(state.text)}-${state.inaltimeLitera}mm`; },
  exportNotes() { return last ? notePiesa(state, last.diagnostice) : []; },

  objectInfo(id) {
    if (!last) return null;
    const m = id === 'contur' ? last.contur : id === 'capac' ? last.capac : last.corp;
    if (!m) return null;
    const bb = m.boundingBox();
    return { nume: id === 'contur' ? tr('piesa.numeContur') : id === 'capac' ? tr('piesa.numeCapac')
      : tr('nume.numeCorp', { text: state.text }),
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
