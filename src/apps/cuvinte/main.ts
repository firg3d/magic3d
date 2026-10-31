/**
 * APP CUVINTE DECOR — implementează AppDefinition și rulează prin nucleu (runApp).
 * Nu importă NIMIC din alte aplicații (izolare): geometria piesei vine din
 * `core/geometry/cuvant.ts`, panourile comune din `core/ui/panouri-cuvant.ts`, iar ce e propriu
 * cuvintelor — biblioteca de simboluri și substituția lor — stă în `simboluri.ts` și `cuvinte.ts`.
 */
import { t as tr } from '../../core/i18n/index.js';
import type { AppDefinition, PanelGroup, SceneObject, StatusItem, ExportBody } from '../../core/app.js';
import { runApp } from '../../core/ui/shell.js';
import { manifoldToGeometry, initManifold } from '../../core/geometry/manifold.js';
import { inArena, adunaHandle, elibereaza } from '../../core/geometry/arena.js';
import { grupuriPiesa, stariPiesa, stariFinale, blocajPiesa, corpuriExport, notePiesa,
  comutaModProdus, type StarePiesa } from '../../core/ui/panouri-cuvant.js';
import { configureManifold as configTextSolid } from '../../core/geometry/textSolid.js';
import { configureManifold as configCuvant, construiestePiesa, verdictLegare, INALTIME_MIN,
  INALTIME_MAX, PAS_INALTIME, GROSIME_MIN, GROSIME_MAX, RAZA_PUNTE,
  type RezultatCuvant, type VerdictLegare, type ModProdus } from '../../core/geometry/cuvant.js';
import { configureManifold as configCuvinte, solidCuvant, caractereFaraSursa, nrPozitii,
  bucatiCuvant } from './cuvinte.js';
import { incarcaSimboluri, simboluri, simbolPentru, gauriSimbol, type Simbol } from './simboluri.js';
import { loadFontManifest, loadFont, fontCached, fontGroups, previewURL, allFonts } from '../../core/assets/fonts.js';
import { creeazaEvaluatorFonturi } from '../../core/assets/evaluare-fonturi.js';

interface State extends StarePiesa { text: string; font: string; simbolAles: string }

const state: State = {
  // se deschide chiar cu produsul: un simbol ÎN LOCUL unei litere, nu lângă cuvânt. Măsurat,
  // „ma♥ma" iese 195×42 mm — încape pe placă — cu punți de cel mult 13 mm, iar rama implicită
  // de 5 mm închide golul de la sine, deci legătura nici nu se vede.
  text: 'ma♥ma',
  font: 'GreatVibes-Regular.ttf',
  // ce se adaugă la apăsarea butonului; se umple din bibliotecă la pornire
  simbolAles: '♥',
  inaltimeLitera: 55,
  grosime: 35,
  punti: true,
  latimePunte: 1.2,
  contur: 'rama',
  latimeContur: 5,
  netezireContur: 4,
  grosimeContur: 6,
  modProdus: 'masa',
  tipAgatare: 'fara',
  surubCap: 5,
  surubTija: 2.5,
  inaltimeCapSurub: 3,
  latimeGrila: 20,
  capac: true,
  grosimeCapac: 2,
  culoare: '#C9A227',
  culoareContur: '#3A3A3C',
  culoareCapac: '#C9A227',
};

let ctx: { refresh(): void; placa(): { w: number; d: number } } | null = null;
let last: RezultatCuvant | null = null;

/**
 * MEMORIA WASM. Obiectele Manifold sunt handle-uri embind: memoria lor sta in heap-ul WASM si
 * GC-ul JS n-o atinge. Fara arena, aceasta aplicatie crea obiecte la fiecare reconstructie
 * fara ca nimeni sa le numere; heap-ul creste pana cand WASM-ul incepe sa arunce, iar pe
 * ecran ramane modelul vechi. Acelasi tipar ca in apps/litere/build.ts; se verifica din
 * consola cu `__shell.contorArena()`, care trebuie sa ramana pe 0 intre reconstructii.
 */
function construieste(): RezultatCuvant {
  const r = inArena(() => construiestePiesa(config()), (rez) => [rez]);
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

/** cusătura: solidul cuvântului, cu simbolurile puse în locul caracterelor lor */
const sursa = (font: any, text: string) =>
  (inaltime: number, grosime: number, rep?: any) => solidCuvant(font, text, inaltime, grosime, rep);

const textCurat = () => state.text.trim() || ' ';

/**
 * VERDICTELE FONTURILOR, evaluate în FUNDAL — același criteriu ca la Nume 3D: un font e
 * nepotrivit când literele lui nu se ating deloc. Se măsoară pe CUVÂNTUL ÎNTREG, cu simbolurile
 * în el: un simbol e o bucată ca oricare alta și poate schimba verdictul, fiindcă stă între
 * litere care altfel s-ar fi legat.
 */
const evaluator = creeazaEvaluatorFonturi<VerdictLegare>(
  () => `${state.text}|${state.inaltimeLitera}`,
  (font) => verdictLegare(sursa(font, textCurat()), nrPozitii(textCurat()), state.inaltimeLitera, 3.2),
);

function motivRespins(v: VerdictLegare): string {
  return v.ramase
    ? tr('cuvinte.fontRespinsLibere', { n: v.ramase, litere: v.litere })
    : tr('cuvinte.fontRespins', { n: v.bucati, litere: v.litere });
}

function fontControl() {
  const item = (f: { fisier: string; familie: string; lipsaDiacritice: string[] }) => {
    const v = evaluator.verdict(f.fisier);
    return { value: f.fisier, label: f.familie, url: previewURL(f as any), missing: f.lipsaDiacritice,
      ...(v && !v.ok ? { respins: motivRespins(v) } : {}) };
  };
  const grupuri = fontGroups().map((g) => ({ categorie: g.categorie, items: g.items.map(item) }));
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
  return { kind: 'fontselect' as const, cereVerdict, key: 'font', label: tr('cuvinte.font'), value: state.font,
    groups: recomandate.length ? [{ categorie: tr('cuvinte.fonturiRecomandate'), items: recomandate }, ...grupuri] : grupuri };
}


const config = () => ({ ...state, inaltime: state.inaltimeLitera,
  solid: sursa(fontCached(state.font), textCurat()),
  // La produsul asta literele TREBUIE să se atingă: un cuvânt care iese în bucăți nu e o piesă,
  // se rupe în mână. De aceea se acceptă punți mai lungi decât la Nume 3D, unde o punte lungă
  // ar fi o bară slabă prin aer. Nu e o preferință a utilizatorului, e o politică de produs —
  // de aceea stă aici, nu în `state`. Vezi `factorMaxPunte` în core/geometry/cuvant.ts.
  factorMaxPunte: 3.2,
  placa: ctx?.placa() ?? { w: 256, d: 256 } });

const app: AppDefinition = {
  title: 'cuvinte',
  id: 'cuvinte',

  async init(c) {
    ctx = c as any;
    const mod = await initManifold();
    configTextSolid(mod); configCuvant(mod); configCuvinte(mod);
    await loadFontManifest();
    try {
      const r = await fetch('/simboluri/manifest.json?t=' + Date.now());
      incarcaSimboluri(((await r.json()).simboluri ?? []) as Simbol[]);
      if (!simbolPentru(state.simbolAles)) state.simbolAles = simboluri()[0]?.caracter ?? '';
    } catch { /* fără bibliotecă, aplicația rămâne un generator de cuvinte simple */ }
    if (!allFonts().some((f) => f.fisier === state.font)) {
      state.font = (fontGroups().find((g) => g.categorie === 'Cursiv')?.items[0] ?? allFonts()[0])?.fisier ?? '';
    }
    if (state.font) await loadFont(state.font).catch(() => { /* font indisponibil */ });
  },

  async reloadLibraries() { await loadFontManifest(); },

  panels(): PanelGroup[] {
    return [
      { title: tr('cuvinte.grupCuvant'), controls: [
        { kind: 'text', key: 'text', label: tr('cuvinte.text'), value: state.text },
        fontControl(),
        { kind: 'number', key: 'inaltimeLitera', label: tr('cuvinte.inaltime'), min: INALTIME_MIN, max: INALTIME_MAX, step: PAS_INALTIME, value: state.inaltimeLitera },
        { kind: 'number', key: 'grosime', label: tr('cuvinte.grosime'), min: GROSIME_MIN, max: GROSIME_MAX, step: 1, value: state.grosime },
        { kind: 'color', key: 'culoare', label: tr('cuvinte.culoare'), value: state.culoare },
      ] },
      // SIMBOLURILE se adaugă în text ca orice caracter — butonul doar îl scrie. Așa poziția lor
      // e chiar poziția din cuvânt, iar mutarea sau ștergerea se fac din câmpul de text, nu
      // dintr-o listă paralelă care ar trebui ținută în sincron cu el.
      //
      // Un selector, nu douăzeci de butoane: biblioteca crește, iar un panou cu un buton pe
      // simbol ar deveni un perete înainte de al zecelea.
      { title: tr('cuvinte.grupSimboluri'), controls: [
        { kind: 'select', key: 'simbolAles', label: tr('cuvinte.simbol'), value: state.simbolAles,
          options: simboluri().map((s) => ({ value: s.caracter,
            label: `${s.caracter}  ${s.nume}`, grup: tr('cuvinte.grupBiblioteca') })) },
        { kind: 'button', key: 'adaugaSimbol', label: tr('cuvinte.adaugaSimbol', { ch: state.simbolAles }) },
        { kind: 'note', key: 'notaSimboluri', label: tr('cuvinte.notaSimboluriEticheta'),
          value: tr('cuvinte.notaSimboluriCalcul', { n: numaraSimboluri(), total: nrPozitii(state.text),
            biblioteca: simboluri().length }) },
        // „&" NU intră în bibliotecă, și e o decizie, nu o scăpare: măsurat, toate cele 22 de
        // fonturi îl au. Un ampersand desenat de noi ar arăta străin lângă literele fontului,
        // iar cel din font e chiar desenul lui. Se spune, ca omul să nu-l caute în listă.
        { kind: 'note', key: 'notaAmpersand', label: tr('cuvinte.notaAmpersandEticheta'),
          value: tr('cuvinte.notaAmpersand') },
      ] },
      ...grupuriPiesa(state, last?.diagnostice ?? null),
    ];
  },

  onControl(key, value) {
    if (key === 'adaugaSimbol') { state.text += state.simbolAles; return; }
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
    const dz = -d.dim[2] / 2;
    const geom = (m: any) => { const c = m.translate([0, 0, dz]); const g = manifoldToGeometry(c); c.delete(); return g; };

    const objects: SceneObject[] = [
      { id: 'cuvant', nume: tr('cuvinte.numeCorp', { text: state.text }), geometry: geom(r.corp),
        color: state.culoare, movable: false, warn: d.bucati > 1 },
      ...(r.contur ? [{ id: 'contur', nume: tr('piesa.numeContur'), geometry: geom(r.contur),
        color: state.culoareContur, movable: false }] : []),
      ...(r.capac ? [{ id: 'capac', nume: tr('piesa.numeCapac'), geometry: geom(r.capac),
        color: state.culoareCapac, movable: false }] : []),
    ];
    const status: StatusItem[] = stariPiesa(state, d, config().placa);
    // CÂTE SIMBOLURI sunt în cuvânt — cifra care spune că substituția chiar s-a făcut. Fără ea,
    // un simbol care n-a fost recunoscut ar dispărea în tăcere din text.
    const nSim = numaraSimboluri();
    if (nSim) {
      const cu = bucatiCuvant(state.text).filter((b) => b.fel === 'simbol').map((b: any) => b.simbol as Simbol);
      const gauri = cu.reduce((n, x) => n + gauriSimbol(x), 0);
      status.push({ key: 'simboluri', text: tr(gauri ? 'cuvinte.statusSimboluriGauri' : 'cuvinte.statusSimboluri',
        { n: nSim, total: nrPozitii(state.text), gauri }) });
    }
    const v = evaluator.verdict(state.font);
    if (v && !v.ok && !v.ramase) {
      status.push({ key: 'font', text: tr('cuvinte.statusFontDrept', { n: v.bucati, litere: v.litere }), warn: true });
    }
    // CARACTERE FĂRĂ SURSĂ — nici glifă în font, nici simbol în bibliotecă. Contractul are acum
    // DOUĂ surse de răspuns, deci și mesajul trebuie să le numească pe amândouă.
    const fara = caractereFaraSursa(fontCached(state.font), state.text);
    if (fara.length) status.push({ key: 'fara', text: tr('cuvinte.statusFaraSursa', { litere: fara.join(' ') }), warn: true });
    status.push(...stariFinale(d, r.ms));
    return { objects, status };
  },

  onMove() { /* cuvântul e piesa unică a scenei; nu se mută */ },

  exportBodies(): ExportBody[] {
    if (!last) return [];
    const fara = caractereFaraSursa(fontCached(state.font), state.text);
    if (fara.length) throw new Error(tr('cuvinte.blocatFaraSursa', { litere: fara.join(' ') }));
    const blocaj = blocajPiesa(state, last.diagnostice);
    if (blocaj) throw new Error(blocaj);
    return corpuriExport(state, last, `cuvant_${slug(state.text)}`);
  },
  exportName() { return `cuvant-${slug(state.text)}-${state.inaltimeLitera}mm`; },
  exportNotes() {
    if (!last) return [];
    const n = notePiesa(state, last.diagnostice);
    const nSim = numaraSimboluri();
    if (nSim) n.push(tr('cuvinte.notaSimboluri', { n: nSim }));
    return n;
  },

  objectInfo(id) {
    if (!last) return null;
    const m = id === 'contur' ? last.contur : id === 'capac' ? last.capac : last.corp;
    if (!m) return null;
    const bb = m.boundingBox();
    return { nume: id === 'contur' ? tr('piesa.numeContur') : id === 'capac' ? tr('piesa.numeCapac')
      : tr('cuvinte.numeCorp', { text: state.text }),
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

/** câte poziții din cuvânt sunt simboluri, nu litere */
const numaraSimboluri = () => bucatiCuvant(state.text).filter((b) => b.fel === 'simbol').length;

runApp(app);
