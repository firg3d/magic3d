/**
 * APP LITERE LED — implementează AppDefinition și rulează prin nucleu (runApp).
 * Nu cablează nimic imperativ din nucleu: declară controale, construiește geometrie.
 * Nu importă NIMIC din alte aplicații (izolare). Corpul-cutie vine din core/geometry/cutie.ts,
 * solidul din font din core/geometry/textSolid.ts, registrul de fonturi din core/assets/fonts.ts.
 */
import { t as tr } from '../../core/i18n/index.js';
import type { AppDefinition, PanelControl, PanelGroup, SceneObject, StatusItem, ExportBody } from '../../core/app.js';
import { runApp } from '../../core/ui/shell.js';
import { manifoldToGeometry, initManifold } from '../../core/geometry/manifold.js';
import { inArena, adunaHandle, elibereaza } from '../../core/geometry/arena.js';
import { configureManifold as configLed, buildLed, pentruPrint, PERETE_OPAC_MIN, PATA_MAX, TRASATURA_MIN, JOC_BANDA, BENZI, FATA_MAX_UTIL, GROSIME_BANDA, POZITII_CANAL, LOCURI_CANAL, PERETE_CANAL, INALTIME_MIN, INALTIME_MAX, INGROSARE_MAX, PAS_INGROSARE, evalueazaFont, MATERIAL_PESTE_LOCAS, type LedResult, type TipAgatare, type TipBanda, type PozitieCanal, type LocCanal, type VerdictFont } from './led.js';
import { loadFontManifest, loadFont, fontCached, fontGroups, previewURL, allFonts } from '../../core/assets/fonts.js';
import { creeazaEvaluatorFonturi } from '../../core/assets/evaluare-fonturi.js';

interface State {
  litera: string;
  font: string;
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
}
const state: State = {
  litera: 'A',
  font: 'ArchivoBlack-Regular.ttf',
  inaltimeLitera: 150,
  // 25 mm: la banda implicită de 60 LED/m pasul e 16.7 mm, iar adâncimea trebuie să-l depășească
  // ca să nu se vadă punctele. Vezi avertismentul optic — pasul 4 din plan.
  adancimeCorp: 25,
  // 0 = silueta fontului, neatinsă. Se ridică doar când e nevoie — panoul spune de la ce
  // valoare încape banda, la litera și fontul curente.
  ingrosare: 0,
  // 2 mm, peste pragul OPTIC de 1.6: sub el peretele nu mai e opac și litera curge lateral
  grosimePerete: 2,
  grosimeSpate: 2,
  latimeBanda: 10,
  // 60 LED/m: pasul de 16.7 mm cere ~22 mm de adâncime utilă, adică fix plaja în care se
  // vinde produsul. La 30/m ar trebui 33 mm, la 120/m ajunge 9 — dar consumă mai mult.
  tipBanda: 60,
  // pragul iese 1.2 mm spre interior; fața se sprijină pe el pe 1 mm după joc
  latimePrag: 1.2,
  adancimePrag: 2,
  // 1.6 mm: sub 1.2 se vede structura stratului și LED-urile transpar; peste 2.5 pierzi
  // luminozitate fără câștig de uniformitate
  grosimeFata: 1.6,
  jocFata: 0.2,
  diametruCanal: 4,
  pozitieCanal: 'spate',
  locCanal: 'jos',
  vedere: 'ansamblu',
  // litera LED se agață aproape întotdeauna, deci pornește cu gaură de cheie
  tipAgatare: 'cheie',
  // Ø5/Ø2.5 — calibrat la Litere Fagure, măsurat: de când locașul e canal în T, camera capului
  // e lată cât el pe toată cursa, iar la Ø6 pică 12 caractere din 36
  surubCap: 5,
  surubTija: 2.5,
  inaltimeCapSurub: 3,
  latimeGrila: 20,
  culoare: '#3A3A3C',
  culoareFata: '#F2F0E6',
};

/**
 * Ce se poate genera. Litera stă CULCATĂ la print, cu gura în sus — forma n-ar împiedica
 * diacriticele, dar căciula lui „Ă" ar deveni un corp separat de câțiva milimetri, în care nu
 * încape nici bandă, nici cablu. Se poate adăuga mai târziu, ca decizie de produs.
 */
const CARACTERE: { grup: string; caractere: string[] }[] = [
  { grup: 'litere', caractere: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('') },
  { grup: 'cifre', caractere: '0123456789'.split('') },
];

let ctx: { refresh(): void } | null = null;
let last: LedResult | null = null;

/**
 * MEMORIA WASM. Obiectele Manifold sunt handle-uri embind: memoria lor sta in heap-ul WASM si
 * GC-ul JS n-o atinge. Fara arena, aceasta aplicatie crea obiecte la fiecare reconstructie
 * fara ca nimeni sa le numere; heap-ul creste pana cand WASM-ul incepe sa arunce, iar pe
 * ecran ramane modelul vechi. Acelasi tipar ca in apps/litere/build.ts; se verifica din
 * consola cu `__shell.contorArena()`, care trebuie sa ramana pe 0 intre reconstructii.
 */
function construieste(): LedResult {
  const r = inArena(() => buildLed(config()), (rez) => [rez]);
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
  for (const g of CARACTERE) for (const ch of g.caractere) if (are(ch)) out.push({ value: ch, label: ch, grup: tr('led.grup_' + g.grup) });
  if (!out.some((o) => o.value === state.litera)) out.unshift({ value: state.litera, label: state.litera, grup: tr('led.grup_litere') });
  return out;
}

/**
 * VERDICTELE FONTURILOR, evaluate in fundal de nucleu. Aici ramane doar CRITERIUL: la o litera
 * luminoasa un font e prea subtire cand in el nu mai incape banda, dupa ce se scad cei doi
 * pereti opaci si cele doua praguri pe care sta fata.
 */
const evaluator = creeazaEvaluatorFonturi<VerdictFont>(
  () => `${state.litera}|${state.inaltimeLitera}|${state.ingrosare}|${state.grosimePerete}|${state.latimePrag}|${state.latimeBanda}`,
  (font) => evalueazaFont(font, state.litera, state.inaltimeLitera, state.grosimePerete,
    state.latimePrag, state.latimeBanda, state.ingrosare),
);

/** motivul afisat sub un font respins — cu cifre, ca peste tot in aplicatie */
function motivRespins(v: VerdictFont): string {
  return tr(v.inaltimeMinMM ? 'led.fontRespinsInalt' : 'led.fontRespins',
    { trasatura: v.trasaturaMaxMM.toFixed(1), necesar: v.necesarMM.toFixed(1), inaltmin: v.inaltimeMinMM });
}

function fontControl(): PanelControl {
  const item = (f: { fisier: string; familie: string; lipsaDiacritice: string[] }) => {
    const v = evaluator.verdict(f.fisier);
    return { value: f.fisier, label: f.familie, url: previewURL(f as any), missing: f.lipsaDiacritice,
      ...(v && !v.ok ? { respins: motivRespins(v) } : {}) };
  };
  const grupuri = fontGroups().map((g) => ({ categorie: g.categorie, items: g.items.map(item) }));
  // „recomandate" = cele care merg chiar la cea mai mica litera din panou. Din aceeasi
  // masuratoare, nu dintr-o lista tinuta de mana.
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
  return { kind: 'fontselect', cereVerdict, key: 'font', label: tr('led.font'), value: state.font,
    groups: recomandate.length ? [{ categorie: tr('led.fonturiRecomandate'), items: recomandate }, ...grupuri] : grupuri };
}


const config = () => ({
  litera: state.litera, font: fontCached(state.font),
  inaltimeLitera: state.inaltimeLitera, adancimeCorp: state.adancimeCorp,
  ingrosare: state.ingrosare, grosimePerete: state.grosimePerete, grosimeSpate: state.grosimeSpate,
  latimeBanda: state.latimeBanda, tipBanda: state.tipBanda, latimePrag: state.latimePrag,
  adancimePrag: state.adancimePrag, grosimeFata: state.grosimeFata, jocFata: state.jocFata,
  diametruCanal: state.diametruCanal, pozitieCanal: state.pozitieCanal, locCanal: state.locCanal,
  tipAgatare: state.tipAgatare, surubCap: state.surubCap, surubTija: state.surubTija,
  inaltimeCapSurub: state.inaltimeCapSurub, latimeGrila: state.latimeGrila,
});

const app: AppDefinition = {
  title: 'led',
  id: 'led',

  async init(c) {
    ctx = c;
    configLed(await initManifold());
    await loadFontManifest();
    if (!allFonts().some((f) => f.fisier === state.font)) {
      state.font = (fontGroups().find((g) => g.categorie !== 'Cursiv')?.items[0] ?? allFonts()[0])?.fisier ?? '';
    }
    if (state.font) await loadFont(state.font).catch(() => { /* font indisponibil */ });
  },

  async reloadLibraries() { await loadFontManifest(); },

  panels(): PanelGroup[] {
    return [
      // VEDEREA e strict de interfață: nu atinge geometria și nu apare în export. De aceea
      // stă în capul panoului, ca lucru pe care îl schimbi des ca să te uiți înăuntru.
      { title: tr('led.grupVedere'), controls: [
        { kind: 'select', key: 'vedere', label: tr('led.vedere'), value: state.vedere, options: [
          { value: 'ansamblu', label: tr('led.vedereAnsamblu') },
          { value: 'faraFata', label: tr('led.vedereFaraFata') },
          { value: 'explodat', label: tr('led.vedereExplodat') },
        ] },
      ] },
      { title: tr('led.grupLitera'), controls: [
        { kind: 'select', key: 'litera', label: tr('led.litera'), value: state.litera, options: optiuniCaracter() },
        fontControl(),
        { kind: 'number', key: 'inaltimeLitera', label: tr('led.inaltime'), min: INALTIME_MIN, max: INALTIME_MAX, step: 5, value: state.inaltimeLitera },
        { kind: 'color', key: 'culoare', label: tr('led.culoare'), value: state.culoare },
      ] },
      { title: tr('led.grupCorp'), controls: [
        { kind: 'number', key: 'adancimeCorp', label: tr('led.adancimeCorp'), min: 10, max: 60, step: 1, value: state.adancimeCorp },
        // ÎNGROȘAREA e singurul parametru care mărește cavitatea fără să miște înălțimea cerută:
        // peretele nu poate coborî sub pragul optic, iar banda nu se poate îngusta.
        { kind: 'number', key: 'ingrosare', label: tr('led.ingrosare'), min: 0, max: INGROSARE_MAX, step: PAS_INGROSARE, value: state.ingrosare },
        // cifra de care are nevoie omul ca să nu ghicească: de la ce valoare încape banda
        { kind: 'note', key: 'notaIngrosare', label: tr('led.ingrosareNecesara'),
          value: (last?.diagnostice.ingrosare.necesarMM ?? 0) > 0
            ? tr('led.ingrosareNecesaraVal', { mm: last!.diagnostice.ingrosare.necesarMM })
            : tr('led.ingrosareNuTrebuie') },
        // minimul e cel OPTIC, nu cel de printare: sub 1.6 mm peretele lasă lumina să treacă
        { kind: 'number', key: 'grosimePerete', label: tr('led.grosimePerete'), min: PERETE_OPAC_MIN, max: 5, step: 0.1, value: state.grosimePerete },
        { kind: 'number', key: 'grosimeSpate', label: tr('led.grosimeSpate'), min: 1.2, max: 5, step: 0.2, value: state.grosimeSpate },
      ] },
      { title: tr('led.grupFata'), controls: [
        { kind: 'number', key: 'grosimeFata', label: tr('led.grosimeFata'), min: 1.2, max: 3, step: 0.1, value: state.grosimeFata },
        { kind: 'number', key: 'adancimePrag', label: tr('led.adancimePrag'), min: 1, max: 4, step: 0.2, value: state.adancimePrag },
        { kind: 'number', key: 'latimePrag', label: tr('led.latimePrag'), min: 0.6, max: 3, step: 0.1, value: state.latimePrag },
        { kind: 'number', key: 'jocFata', label: tr('led.jocFata'), min: 0.1, max: 0.5, step: 0.05, value: state.jocFata },
        { kind: 'color', key: 'culoareFata', label: tr('led.culoareFata'), value: state.culoareFata },
      ] },
      { title: tr('led.grupAgatare'), controls: [
        { kind: 'select', key: 'tipAgatare', label: tr('led.tipAgatare'), value: state.tipAgatare, options: [
          { value: 'cheie', label: tr('led.agatareCheie') },
          { value: 'grila', label: tr('led.agatareGrila') },
          { value: 'fara', label: tr('led.agatareFara') },
        ] } as PanelControl,
        ...(state.tipAgatare === 'cheie' ? [
          { kind: 'number', key: 'surubCap', label: tr('led.surubCap'), min: 4, max: 12, step: 0.5, value: state.surubCap } as PanelControl,
          { kind: 'number', key: 'surubTija', label: tr('led.surubTija'), min: 2, max: 6, step: 0.5, value: state.surubTija } as PanelControl,
        ] : []),
        ...(state.tipAgatare === 'grila' ? [
          { kind: 'number', key: 'latimeGrila', label: tr('led.latimeGrila'), min: 12, max: 80, step: 2, value: state.latimeGrila } as PanelControl,
        ] : []),
        ...(state.tipAgatare !== 'fara' ? [
          { kind: 'number', key: 'inaltimeCapSurub', label: tr('led.inaltimeCapSurub'), min: 1.5, max: 8, step: 0.5, value: state.inaltimeCapSurub } as PanelControl,
          // adâncimea NU e parametru: în locaș intră tija pe standoff plus capul pe înălțimea lui
          { kind: 'note', key: 'notaLocas', label: tr('led.adancimeLocas'),
            value: tr('led.adancimeLocasCalcul', { adanc: (last?.diagnostice.agatare.adancime ?? 0).toFixed(1),
              standoff: (last?.diagnostice.agatare.standoff ?? 0).toFixed(1), cap: state.inaltimeCapSurub,
              plasture: (last?.diagnostice.agatare.inaltimePlasture ?? 0).toFixed(1) }) } as PanelControl,
        ] : []),
      ] },
      { title: tr('led.grupCanal'), controls: [
        { kind: 'select', key: 'pozitieCanal', label: tr('led.pozitieCanal'), value: state.pozitieCanal,
          options: POZITII_CANAL.map((x) => ({ value: x, label: tr('led.canal_' + x) })) } as PanelControl,
        { kind: 'select', key: 'locCanal', label: tr('led.locCanal'), value: state.locCanal,
          options: LOCURI_CANAL.map((x) => ({ value: x, label: tr('led.loc_' + x) })) } as PanelControl,
        { kind: 'number', key: 'diametruCanal', label: tr('led.diametruCanal'), min: 2, max: 8, step: 0.5, value: state.diametruCanal } as PanelControl,
      ] },
      { title: tr('led.grupBanda'), controls: [
        { kind: 'select', key: 'tipBanda', label: tr('led.tipBanda'), value: String(state.tipBanda),
          options: BENZI.map((b) => ({ value: String(b), label: tr('led.banda' + b) })) } as PanelControl,
        { kind: 'select', key: 'latimeBanda', label: tr('led.latimeBanda'), value: String(state.latimeBanda), options: [
          { value: '8', label: tr('led.lat8') },
          { value: '10', label: tr('led.lat10') },
          { value: '12', label: tr('led.lat12') },
        ] },
      ] },
    ];
  },

  onControl(key, value) {
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
    if (key === 'latimeBanda') { state.latimeBanda = parseFloat(value as string); return; }
    if (key === 'tipBanda') { state.tipBanda = parseFloat(value as string) as TipBanda; return; }
    (state as any)[key] = value;
  },

  rebuild() {
    const r = construieste();
    const d = r.diagnostice;
    // Corpul stă CULCAT, cu gura în sus: adâncimea (axa Z a modelului) trebuie să ajungă pe
    // verticala lumii. Rotația cu +90° pe X face exact asta — iar fiindcă viewport-ul aplică el
    // însuși oglindirea pe Y, ce se vede pe ecran e chiar piesa exportată, doar rotită.
    const culcat = r.corpOpac.rotate([90, 0, 0]);
    const geom = manifoldToGeometry(culcat);
    culcat.delete();

    const objects: SceneObject[] = [
      { id: 'corp', nume: tr('led.numeCorp', { litera: state.litera }),
        geometry: geom, color: state.culoare, movable: false, warn: d.bucati !== d.bucatiLitera },
    ];
    // FAȚA, afișată după modul de vedere. Geometria e aceeași în toate trei — se schimbă doar
    // ce se pune în scenă și unde. Exportul nu se uită niciodată la asta.
    if (r.corpFata && state.vedere !== 'faraFata') {
      // la „explodat" fața se ridică deasupra literei, cât adâncimea corpului: se vede și
      // interiorul, și cum se potrivește capacul
      const ridicat = state.vedere === 'explodat'
        ? r.corpFata.translate([0, 0, state.adancimeCorp]) : null;
      const fCulcat = (ridicat ?? r.corpFata).rotate([90, 0, 0]);
      objects.push({ id: 'fata', nume: tr('led.numeFata', { litera: state.litera }),
        geometry: manifoldToGeometry(fCulcat), color: state.culoareFata, movable: false,
        warn: d.fata.coliziuneMM3 > 0 });
      fCulcat.delete(); ridicat?.delete();
    }
    const f = (n: number, k = 1) => n.toLocaleString('en-US', { maximumFractionDigits: k });
    const status: StatusItem[] = [
      { key: 'litera', text: tr('led.statusLitera', { w: f(d.dimLitera[0]), h: f(d.dimLitera[1]),
        a: f(state.adancimeCorp), t: f(d.inaltimeTotala) }) },
      { key: 'pereti', text: tr('led.statusPereti', { p: f(state.grosimePerete, 2), spate: f(state.grosimeSpate) }) },
    ];
    // CÂTĂ BANDĂ, CÂTE LED-URI, CÂȚI WAȚI — informația cu care omul se duce la magazin
    if (d.banda.lungimeCM > 0) {
      status.push({ key: 'banda2', text: tr('led.statusConsum', { cm: f(d.banda.lungimeCM),
        led: d.banda.nrLED, w: f(d.banda.putereW), v: d.banda.tensiuneV, tip: state.tipBanda }) });
    }
    // ÎNGROȘAREA: cât s-a pus și ce a costat. Contra-formele astupate sunt cel mai vizibil
    // efect — un „O" fără ochi nu mai e „O".
    if (state.ingrosare > 0) {
      const ig = d.ingrosare;
      status.push({ key: 'ingrosare', text: tr('led.statusIngrosare', { mm: f(ig.mm),
        crestere: f(2 * ig.mm) }) });
      if (ig.contraForme < ig.contraFormeInitial) {
        status.push({ key: 'contraForme', text: tr('led.statusContraFormeAstupate', {
          n: ig.contraFormeInitial - ig.contraForme, mm: f(ig.mm) }), warn: true });
      }
    }
    // ---- AVERTISMENTUL OPTIC — cel mai valoros din toată aplicația ----
    // O literă prost dimensionată arată ca un șir de puncte, iar asta se află abia după print.
    // De aceea mesajul e cu CIFRE și cu cele două ieșiri concrete: adâncime sau bandă mai deasă.
    const o = d.optic;
    status.push(o.uniform
      ? { key: 'optic', text: tr('led.statusOpticBun', { dist: f(o.distantaMM), pas: f(o.pasMM),
        tip: state.tipBanda }) }
      : { key: 'optic', text: tr(o.bandaPotrivita ? 'led.statusOpticPuncteAlta' : 'led.statusOpticPuncte', {
        dist: f(o.distantaMM), pas: f(o.pasMM), tip: state.tipBanda,
        adanc: f(state.adancimeCorp, 0), minim: f(o.adancimeMinima, 0), alta: o.bandaPotrivita }), warn: true });
    if (o.fataPreaGroasa) {
      status.push({ key: 'fataGroasa', text: tr('led.statusFataGroasa', { g: f(state.grosimeFata),
        prag: f(FATA_MAX_UTIL) }), warn: true });
    }
    // ÎNCAPE BANDA? Cavitatea e clasificată pe lățimea benzii, nu pe arie: o fantă lungă și
    // îngustă are arie mare, dar banda nu intră în ea.
    if (!d.camereUtile) {
      // Îngroșarea e răspunsul DIRECT aici, deci se dă cu cifra ei — nu „mărește litera",
      // care schimbă produsul, ci „îngroașă cu atât", care păstrează înălțimea cerută.
      status.push({ key: 'banda', text: tr(d.ingrosare.necesarMM ? 'led.statusBandaNuIncapeIngros' : 'led.statusBandaNuIncape', {
        lat: f(state.latimeBanda), joc: f(JOC_BANDA), p: f(state.grosimePerete, 2),
        ingros: f(d.ingrosare.necesarMM) }), warn: true });
    } else {
      status.push({ key: 'banda', text: tr(d.camereUtile > 1 ? 'led.statusBandaIncapeMulte' : 'led.statusBandaIncape',
        { lat: f(state.latimeBanda), n: d.camereUtile, arie: f(d.ariaCavitateMM2, 0) }) });
    }
    if (d.fanteUmplute) {
      status.push({ key: 'fante', text: tr('led.statusFanteUmplute', { n: d.fanteUmplute }) });
    }
    // FAȚA — potrivirea în prag. Coliziunea trebuie să fie ZERO, ca la inlay-ul de la litere.
    if (d.fata.faraPrag) {
      status.push({ key: 'fata', text: tr('led.statusFaraPrag', { p: f(state.grosimePerete, 2) }), warn: true });
    } else {
      status.push(d.fata.coliziuneMM3 <= 0
        ? { key: 'fata', text: tr('led.statusFata', { arie: f(d.fata.ariaMM2, 0), g: f(state.grosimeFata),
          sprijin: f(d.fata.sprijinMM, 2), joc: f(state.jocFata, 2) }) }
        : { key: 'fata', text: tr('led.statusFataSeLoveste', { v: f(d.fata.coliziuneMM3, 2) }), warn: true });
      // unde ajunge fața față de buză: informație de finisaj, nu defect
      status.push(Math.abs(d.fata.subBuzaMM) < 0.05
        ? { key: 'buza', text: tr('led.statusFataLaNivel') }
        : d.fata.subBuzaMM > 0
          ? { key: 'buza', text: tr('led.statusFataSubBuza', { mm: f(d.fata.subBuzaMM, 2) }) }
          : { key: 'buza', text: tr('led.statusFataIese', { mm: f(-d.fata.subBuzaMM, 2) }), warn: true });
      if (d.fata.bucati > d.bucatiLitera) {
        status.push({ key: 'fataBucati', text: tr('led.statusFataBucati', { n: d.fata.bucati, litera: d.bucatiLitera }) });
      }
    }
    // AGĂȚAREA: dacă a fost cerută dar n-a încăput, se SPUNE
    if (state.tipAgatare !== 'fara') {
      const a = d.agatare;
      const numeTip = tr('led.agatare' + state.tipAgatare[0].toUpperCase() + state.tipAgatare.slice(1));
      if (!a.pozitii.length) {
        status.push({ key: 'agatare', text: tr('led.statusFaraAgatare', { tip: numeTip }), warn: true });
      } else {
        status.push({ key: 'agatare', text: tr(a.pozitii.length > 1 ? 'led.statusAgatareDoua' : 'led.statusAgatare', {
          tip: numeTip, y: f(-a.pozitii[0][1]), adanc: f(a.adancime), standoff: f(a.standoff),
          camera: f(a.adancime - a.standoff), plasture: f(a.inaltimePlasture),
          dist: f(a.pozitii.length > 1 ? a.pozitii[1][0] - a.pozitii[0][0] : 0) }) });
        status.push(Math.abs(a.inclinare) < 0.5
          ? { key: 'drept', text: tr(a.pozitii.length > 1 ? 'led.statusDreaptaDoua' : 'led.statusDreapta') }
          : { key: 'drept', text: tr('led.statusStramb', { unghi: f(Math.abs(a.inclinare)) }), warn: true });
      }
    }
    // CANALUL DE CABLU: dacă n-a încăput, se SPUNE — o literă fără canal se descoperă când
    // ai deja banda lipită înăuntru.
    const cn = d.canal;
    status.push(cn.punct
      ? { key: 'canal', text: tr('led.statusCanal', { tip: tr('led.canal_' + cn.pozitie),
        d: f(cn.diametruMM), loc: tr('led.loc_' + cn.loc), perete: f(cn.peretRamasMM, 2) }), warn: cn.peretRamasMM < PERETE_CANAL - 0.01 }
      : { key: 'canal', text: tr('led.statusFaraCanal', { d: f(cn.diametruMM), perete: f(PERETE_CANAL) }), warn: true });
    // CONECTIVITATE — invariantul central. NU genus: cavitatea creează goluri prin proiect.
    if (d.bucati !== d.bucatiLitera) {
      status.push({ key: 'bucati', text: tr('led.statusBucati', { n: d.bucati, litera: d.bucatiLitera }), warn: true });
    }
    if (d.trasaturi.ariaMaxMM2 > PATA_MAX) {
      status.push({ key: 'subtire', text: tr('led.statusPereteSubtire', { prag: f(TRASATURA_MIN, 2),
        arie: f(d.trasaturi.ariaMaxMM2, 1) }), warn: true });
    }
    if (d.glifeLipsa.length) status.push({ key: 'glifa', text: tr('led.statusGlifaLipsa', { litere: d.glifeLipsa.join(' ') }), warn: true });
    status.push({ key: 'triunghiuri', text: tr('led.statusTriunghiuri', { n: f(d.triunghiuri, 0) }) });
    status.push({ key: 'time', text: tr('led.statusTimp', { ms: f(r.ms, 0), font: f(d.timpi.font, 0),
      interior: f(d.timpi.interior, 0), extrudare: f(d.timpi.extrudare, 0), verificari: f(d.timpi.verificari, 0) }) });
    return { objects, status };
  },

  onMove() { /* corpul e piesa unică a scenei; nu se mută */ },

  exportBodies(): ExportBody[] {
    if (!last) return [];
    if (last.diagnostice.glifeLipsa.length) throw new Error(tr('led.blocatFaraGeometrie', { litere: last.diagnostice.glifeLipsa.join(' ') }));
    const nume = `led_${slug(state.litera)}`;
    // ACELAȘI `grup`: cele două piese sunt o singură lucrare, deci așezarea pe placă le ține
    // împreună. Culori diferite fiindcă una e opacă și cealaltă translucidă.
    const out: ExportBody[] = [{ name: `${nume}_1_corp`, manifold: pentruPrint(last.corpOpac),
      culoare: state.culoare, orientare: tr('led.orientareCorp'), grup: nume }];
    if (last.corpFata) {
      // fața se coboară la Z=0: se printează culcată, pe placă, nu la înălțimea de montaj
      const f0 = pentruPrint(last.corpFata);
      const bb = f0.boundingBox();
      const asezata = f0.translate([0, 0, -bb.min[2]]);
      f0.delete();
      out.push({ name: `${nume}_2_fata`, manifold: asezata, culoare: state.culoareFata,
        orientare: tr('led.orientareFata'), grup: nume });
    }
    return out;
  },
  exportName() { return `led-${slug(state.litera)}-${state.inaltimeLitera}mm`; },
  exportNotes() {
    const n = [tr('led.notaPrintCorp', { adanc: state.adancimeCorp, p: state.grosimePerete, spate: state.grosimeSpate })];
    if (last?.corpFata) {
      n.push(tr('led.notaPrintFata', { g: state.grosimeFata, joc: state.jocFata,
        sprijin: last.diagnostice.fata.sprijinMM }));
      if (state.tipAgatare !== 'fara' && last.diagnostice.agatare.pozitii.length) {
        n.push(tr('led.notaAgatare', {
          tip: tr('led.agatare' + state.tipAgatare[0].toUpperCase() + state.tipAgatare.slice(1)),
          adanc: last.diagnostice.agatare.adancime.toFixed(1),
          standoff: last.diagnostice.agatare.standoff.toFixed(1) }));
      }
      if (state.ingrosare > 0) n.push(tr('led.notaIngrosare', { mm: state.ingrosare, crestere: 2 * state.ingrosare }));
      n.push(tr('led.notaConsum', { cm: last.diagnostice.banda.lungimeCM, tip: state.tipBanda,
        lat: state.latimeBanda, led: last.diagnostice.banda.nrLED, w: last.diagnostice.banda.putereW,
        v: last.diagnostice.banda.tensiuneV }));
      n.push(tr('led.notaCanal', { tip: tr('led.canal_' + state.pozitieCanal), d: state.diametruCanal }));
      n.push(tr('led.notaMontaj'));
    }
    if (last) {
      const o = last.diagnostice.optic;
      n.push(o.uniform
        ? tr('led.notaOpticBun', { tip: state.tipBanda, dist: o.distantaMM.toFixed(1), pas: o.pasMM.toFixed(1) })
        : tr('led.notaOpticPuncte', { tip: state.tipBanda, dist: o.distantaMM.toFixed(1), pas: o.pasMM.toFixed(1),
          minim: o.adancimeMinima }));
    }
    return n;
  },

  objectInfo() {
    if (!last) return null;
    const m = last.corpOpac; const bb = m.boundingBox();
    return { nume: tr('led.numeCorp', { litera: state.litera }),
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
