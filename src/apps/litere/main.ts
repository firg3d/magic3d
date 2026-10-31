/**
 * APP LITERE — implementează AppDefinition și rulează prin nucleu (runApp).
 * NU cablează imperativ nimic din nucleu: nu creează Viewer, nu construiește DOM,
 * nu atinge canvas-ul. Doar declară controale + construiește geometrie prin core.
 */
import { t as tr } from '../../core/i18n/index.js';
import type { AppDefinition, PanelGroup, PanelControl, SceneObject, StatusItem, ExportBody, LibraryItem } from '../../core/app.js';
import { runApp } from '../../core/ui/shell.js';
import { manifoldToGeometry, manifoldModule } from '../../core/geometry/manifold.js';
import { inArena } from '../../core/geometry/arena.js';
import { stlToManifold } from '../../core/assets/stl-load.js';
import { threeMFToManifold } from '../../core/assets/threemf-load.js';
import type { AssemblyConfig, TematicaInput } from './assembly.js';
import { orientForPrint, dominantFaceRotation, type PrintPiece } from './assembly.js';
import { loadFontManifest, loadFont, fontCached, fontGroups, fontByKey, previewURL, allFonts, type FontItem } from '../../core/assets/fonts.js';
import { initLitere, build, BuildResult } from './build.js';

interface Tematica {
  id: string; fisier: string; nume: string; tema: string; raw: any; dim: [number, number, number]; nrCorpuri: number;
  scaleX: number; scaleY: number; scaleZ: number; keepProp: boolean; // scară % per axă
  pozitieZ: number; // mm pe axa de adâncime: 0 = fața literei, negativ = intră, pozitiv = iese
  rotX: number; rotY: number; rotZ: number; culoare: string; offX: number; offY: number;
  /** corpurile separate din fișier, fiecare cu culoarea lui — aceeași formă ca la bază */
  corpuri: CorpColorat[];
}
/** un corp dintr-un model importat: geometrie proprie, culoare curentă și cea din fișier */
interface CorpColorat { nume: string; manifold: any; culoare?: string; culoareOriginala?: string; }
interface State {
  litera: string; fontLitera: string; inaltimeLitera: number; grosimeLitera: number; culoareLitera: string;
  chenarActiv: boolean; latimeChenar: number; adancimeChenar: number; razaMuchie: number; taiereBaza: number;
  scris: string; fontScris: string; inaltimeScris: number; reliefScris: number; culoareScris: string;
  offsetX: number; offsetY: number; rotatieScris: number; scrisRotX: number; scrisRotY: number; scrisPozitieZ: number;
  modScris: 'relief' | 'gravat' | 'locas'; grosimeScris: number; jocInsertie: number;
  iesireMax: number; // TASK 3: prag avertisment „iese prea mult" (mm)
  tematici: Tematica[];
  // BAZĂ (postament) — o singură bază activă
  baza: Baza | null;
  pozitieLiteraX: number; pozitieLiteraZ: number; rotatieLitera: number; rotatieLiteraX: number; rotatieLiteraZ: number; adancimeInfigere: number; jocInfigere: number;
}
interface Baza { fisier: string; nume: string; raw: any; dim: [number, number, number]; nrCorpuri: number; scaleX: number; scaleY: number; scaleZ: number; keepProp: boolean;
  /** corpurile SEPARATE, exact ca în fișier: geometrie proprie + culoare curentă/originală */
  corpuri: CorpColorat[]; }
const state: State = {
  litera: 'A', fontLitera: 'Baloo2-Regular.ttf', inaltimeLitera: 120, grosimeLitera: 25, culoareLitera: '#889EC8',
  chenarActiv: true, latimeChenar: 3, adancimeChenar: 3, razaMuchie: 1.2, taiereBaza: 2,
  scris: 'Andrei', fontScris: 'Pacifico-Regular.ttf', inaltimeScris: 40, reliefScris: 2.5, culoareScris: '#FFFFFF',
  // poziția scrisului: valori calibrate pentru combinația implicită (A / Baloo 2 / 120 mm)
  offsetX: 0.84, offsetY: -35.2, rotatieScris: 0, scrisRotX: 0, scrisRotY: 0, scrisPozitieZ: -1.04, modScris: 'locas', grosimeScris: 4.5, jocInsertie: 0.2,
  iesireMax: 8,
  tematici: [],
  baza: null, pozitieLiteraX: 0, pozitieLiteraZ: 0, rotatieLitera: 0, rotatieLiteraX: 0, rotatieLiteraZ: 0, adancimeInfigere: 5, jocInfigere: 0.2,
};
const PALETTE = ['#88aaff', '#ff9a6b', '#7fd6a0', '#e6708f', '#c9a0ff', '#f2c14e'];
/**
 * Ce se poate pune pe postament. Nu doar A-Z: numere de casă, ani și vârste la petreceri
 * sunt comenzi la fel de dese ca o inițială.
 * Fiecare caracter e oferit DOAR dacă fontul ales chiar are glifa — altfel clientul ar
 * alege ceva ce nu se generează. Verificarea se face la construirea panoului.
 */
/**
 * DIACRITICE — active doar când există bază.
 *
 * Fără bază litera stă în picioare: căciula lui Ă, circumflexul și virgula de sub Ș/Ț sunt
 * piese de 2–3 mm, nemanipulabile la montaj și fără sprijin. Cu bază litera e culcată în
 * locaș, iar accentul se sprijină și se lipește.
 *
 * Eliminarea se face pe CARACTERE, înainte de generare — nu tăind accentul din contur.
 * Sunt incluse și variantele cu cedilă (Ş/Ţ), substituentele greșite pentru română, ca să
 * nu scape un text lipit din altă parte.
 */
const HARTA_DIACRITICE: Record<string, string> = {
  'Ș': 'S', 'ș': 's', 'Ț': 'T', 'ț': 't', 'Ş': 'S', 'ş': 's', 'Ţ': 'T', 'ţ': 't',
  'Ă': 'A', 'ă': 'a', 'Â': 'A', 'â': 'a', 'Î': 'I', 'î': 'i',
};
const faraDiacritice = (txt: string) => [...txt].map((c) => HARTA_DIACRITICE[c] ?? c).join('');
/** diacriticele sunt permise doar cu bază */
const diacriticePermise = () => !!state.baza;
const literaEfectiva = () => (diacriticePermise() ? state.litera : faraDiacritice(state.litera));
const scrisEfectiv = () => (diacriticePermise() ? state.scris : faraDiacritice(state.scris));
/**
 * Fonturi din bibliotecă ce conțin TOATE caracterele date — sugestii când fontul ales nu
 * are diacriticele cerute. `lipsaDiacritice` vine din scanare, per fișier.
 */
function fonturiCareAu(caractere: string[]): string[] {
  const fam = new Set<string>();
  for (const g of fontGroups()) {
    for (const f of g.items) if (caractere.every((ch) => !f.lipsaDiacritice.includes(ch))) fam.add(f.familie);
  }
  return [...fam].slice(0, 4);
}
/** caracterele care ne interesează la sugestii: doar diacriticele, restul n-au alternativă */
const doarDiacritice = (caractere: string[]) => caractere.filter((c) => c in HARTA_DIACRITICE);

/** perechile chiar înlocuite acum (pentru bara de stare), fără duplicate */
function diacriticeEliminate(): string[] {
  if (diacriticePermise()) return [];
  const perechi = new Set<string>();
  for (const c of state.litera + state.scris) if (HARTA_DIACRITICE[c]) perechi.add(`${c}→${HARTA_DIACRITICE[c]}`);
  return [...perechi];
}

const CARACTERE: { grup: string; caractere: string[] }[] = [
  { grup: 'litere', caractere: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('') },
  { grup: 'diacritice', caractere: ['Ă', 'Â', 'Î', 'Ș', 'Ț'] },
  { grup: 'cifre', caractere: '0123456789'.split('') },
  { grup: 'simboluri', caractere: ['&', '♥'] },
];
interface BazaGeom { raw: any; dim: [number, number, number]; nrCorpuri: number; nume: string; corpuri: { nume: string; manifold: any; culoare?: string }[] }
const baseGeom = new Map<string, BazaGeom>();
let ctx: { refresh(): void } | null = null;
/** alege un font implicit din manifest dacă cel salvat nu există (după rescanare) */
const primulFont = (pref: string[], fallback: () => FontItem | undefined) => {
  for (const p of pref) { const f = allFonts().find((x) => x.fisier === p); if (f) return f.fisier; }
  return fallback()?.fisier ?? '';
};
/** asigură fontul în cache, apoi cere o reîmprospătare (încărcare leneșă) */
function ensureFont(key: string) {
  if (!key || fontCached(key)) return;
  loadFont(key).then(() => ctx?.refresh()).catch(() => { /* font indisponibil */ });
}
let manifest: { fisier: string; nume: string; tema: string; corpuri?: any[]; dimensiuniTotale: any; thumb?: string }[] = [];
let baseManifest: { fisier: string; nume: string; tema: string; thumb?: string }[] = [];
let last: BuildResult | null = null;
let idCounter = 0;
const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]/g, '') || 'x';
const norm = (deg: number) => { let d = ((deg + 180) % 360 + 360) % 360 - 180; return +d.toFixed(1); };

/** (re)încarcă manifestele bibliotecilor. Geometria bazelor NU se atinge aici — vezi `geometrieBaza`. */
async function loadManifests(): Promise<void> {
  const bust = `?t=${Date.now()}`; // ocolește cache-ul după rescanare
  try { manifest = await (await fetch('/tematici/manifest.json' + bust)).json(); } catch { manifest = []; }
  try { baseManifest = await (await fetch('/base/base-manifest.json' + bust)).json(); } catch { baseManifest = []; }
}

/**
 * Geometria unei baze, din cache sau de pe disc — LENEȘ, exact ca la tematici (`geometrieTematica`).
 *
 * Înainte se construiau TOATE bazele la pornire: 20 de fișiere .3mf, 7,5 MB, 551k triunghiuri.
 * Măsurat, etapa lua 5–9 s din cele ~6–11 s până la prima literă, iar `Manifold.compose()`
 * (evaluat leneș, forțat de `boundingBox()`) era singur 6,7 s din ele. Se plăteau la FIECARE
 * pornire, chiar dacă nu alegeai nicio bază — iar grila bibliotecii n-are nevoie de geometrie,
 * doar de nume + miniatură, care vin din manifest. Acum solidul se face la prima alegere.
 */
async function geometrieBaza(fisier: string): Promise<BazaGeom | null> {
  if (baseGeom.has(fisier)) return baseGeom.get(fisier)!;
  const b = baseManifest.find((x) => x.fisier === fisier);
  if (!b) return null;
  try {
    const buf = await (await fetch('/base/' + b.fisier.split('/').map(encodeURIComponent).join('/'))).arrayBuffer();
    const is3mf = /\.3mf$/i.test(b.fisier);
    const L = is3mf ? await threeMFToManifold(manifoldModule(), buf) : stlToManifold(manifoldModule(), buf);
    if (!L.ok) return null;
    const g = { raw: L.data.manifold, dim: L.data.dim, nrCorpuri: is3mf ? (L.data as any).corpuri : 1, nume: b.nume,
      corpuri: ((L.data as any).info ?? []).map((i: any) => ({ nume: i.nume, manifold: i.manifold, culoare: i.culoare })) };
    baseGeom.set(fisier, g);
    return g;
  } catch { return null; }                                      // bază neîncărcabilă
}

/** selector de font grupat pe categorii, cu previzualizare + marcaj diacritice lipsă */
function fontControl(key: string, value: string): PanelControl {
  return { kind: 'fontselect', key, label: 'font', value,
    groups: fontGroups().map((g) => ({ categorie: g.categorie,
      items: g.items.map((f) => ({ value: f.fisier, label: f.familie, url: previewURL(f), missing: f.lipsaDiacritice })) })) };
}

/**
 * `rapid` = previzualizare: se sare rotunjirea muchiei, care costa ~2300 ms din ~2950 pe o
 * litera necachetata. Sare DOAR finisajul: pozitii, buzunare, jocuri si cote de montaj sunt
 * identice, fiindca rotunjirea comuta cu scaderea buzunarelor — (L\P)nE = (LnE)\P. Deci ce
 * se masoara pe previzualizare ramane valabil, doar muchiile se vad ascutite pana la
 * reconstructia fina, care vine singura dupa ce omul se opreste din tras de cursor.
 */
function buildConfig(rapid = false): AssemblyConfig {
  const tematici: TematicaInput[] = state.tematici.map((t) => ({
    id: t.id, nume: t.nume, manifold: t.raw.scale([t.scaleX / 100, t.scaleY / 100, t.scaleZ / 100]), offX: t.offX, offY: t.offY,
    rotX: t.rotX, rotY: t.rotY, rotZ: t.rotZ, pozitieZ: t.pozitieZ, culoare: t.culoare,
    // corpurile merg scalate identic cu solidul compus, ca să rămână suprapuse perfect
    corpuri: t.corpuri.length > 1
      ? t.corpuri.map((c) => ({ nume: c.nume, culoare: c.culoare, manifold: c.manifold.scale([t.scaleX / 100, t.scaleY / 100, t.scaleZ / 100]) }))
      : undefined,
  }));
  return {
    litera: literaEfectiva(), fontLitera: fontCached(state.fontLitera), inaltimeLitera: state.inaltimeLitera, grosimeLitera: state.grosimeLitera, culoareLitera: state.culoareLitera,
    scris: scrisEfectiv(), fontScris: fontCached(state.fontScris), inaltimeScris: state.inaltimeScris, reliefScris: state.reliefScris, culoareScris: state.culoareScris,
    scrisOffX: state.offsetX, scrisOffY: state.offsetY, rotatieScris: state.rotatieScris, scrisRotX: state.scrisRotX, scrisRotY: state.scrisRotY, scrisPozitieZ: state.scrisPozitieZ,
    modScris: state.modScris, grosimeScris: state.grosimeScris, jocInsertie: state.jocInsertie,
    chenarActiv: state.chenarActiv, latimeChenar: state.latimeChenar, adancimeChenar: state.adancimeChenar,
    razaMuchie: rapid ? 0 : state.razaMuchie, taiereBaza: state.taiereBaza, tematici, puntiAutomate: true,
    baza: state.baza ? {
      manifold: state.baza.raw.scale([state.baza.scaleX / 100, state.baza.scaleY / 100, state.baza.scaleZ / 100]),
      corpuri: state.baza.corpuri.map((c) => ({ nume: c.nume, culoare: c.culoare,
        manifold: c.manifold.scale([state.baza!.scaleX / 100, state.baza!.scaleY / 100, state.baza!.scaleZ / 100]) })),
      adancimeInfigere: state.adancimeInfigere, jocInfigere: state.jocInfigere,
      pozitieLiteraX: state.pozitieLiteraX, pozitieLiteraZ: state.pozitieLiteraZ, rotatieLitera: state.rotatieLitera,
      rotatieLiteraX: state.rotatieLiteraX, rotatieLiteraZ: state.rotatieLiteraZ,
    } : null,
  };
}

/**
 * Controalele de culoare PER CORP — aceleași pentru bază și pentru tematici.
 * Cheile `corpCol{i}` / `corpReset{i}` sunt interpretate în `onControl` în funcție de
 * selecția curentă, deci nu trebuie prefixate per tip de obiect.
 */
function controaleCorpuri(corpuri: CorpColorat[]): PanelControl[] {
  if (corpuri.length < 2) return [];       // un singur corp: rămâne controlul simplu de culoare
  const controale: PanelControl[] = corpuri.map((c, i) => (
    { kind: 'color', key: `corpCol${i}`, label: tr('litere.corpCuloare', { n: i + 1, nume: c.nume ? ' · ' + c.nume : '' }), value: c.culoare ?? '#cccccc' }
  ));
  // Buton UNIC, mereu prezent: schimbarea de culoare nu re-randează panoul (`color` nu
  // restructurează), deci un buton condiționat n-ar apărea decât la următoarea re-randare.
  // Unul singur ține și pentru modelele cu 16 corpuri, unde 16 butoane ar fi zgomot.
  if (corpuri.some((c) => c.culoareOriginala)) controale.push({ kind: 'button', key: 'corpResetToate', label: tr('litere.reseteazaCulori') });
  return controale;
}
/** corpurile pentru randare separată: geometrie + culoarea curentă din stare */
function corpuriPentruScena(plasate: { nume: string; manifold: any; culoare?: string }[] | undefined,
                            dinStare: CorpColorat[], G: (m: any) => any, implicita: string) {
  if (!plasate?.length || plasate.length < 2) return undefined;
  return plasate.map((c, i) => ({ geometry: G(c.manifold), color: dinStare[i]?.culoare ?? c.culoare ?? implicita }));
}
/** corpurile importate dintr-un fișier -> forma din stare, cu culoarea originală reținută */
const corpuriDinFisier = (info: any[] | undefined): CorpColorat[] =>
  (info ?? []).map((c, i) => ({ nume: c.nume || tr('objects.corpN', { n: i + 1 }), manifold: c.manifold,
    culoare: c.culoare, culoareOriginala: c.culoare }));

/**
 * Intervalul în care înfigerea are efect. Sub bază trebuie să rămână ≥3 mm material, deci
 * maximul depinde de grosimea ei. Valoarea CERUTĂ se limitează la scriere, nu doar la
 * aplicare: altfel starea urcă nelimitat în timp ce geometria stă pe loc, iar litera pare
 * că nu se mișcă (și trage „în gol" până valoarea revine în interval).
 */
function intervalInfigere(): { min: number; max: number; grosimeBaza: number } {
  const b = state.baza;
  const grosimeBaza = b ? +(b.dim[2] * b.scaleZ / 100).toFixed(2) : 0;
  return { min: 0, max: grosimeBaza, grosimeBaza };   // 0 = doar atinge, max = fața inferioară
}
const limiteazaInfigere = (v: number) => { const i = intervalInfigere(); return +Math.max(i.min, Math.min(i.max, v)).toFixed(2); };

/** opțiunile selectorului de caracter, filtrate după ce are fontul ales */
function optiuniCaracter(): { value: string; label: string; grup: string }[] {
  const font = fontCached(state.fontLitera);
  const are = (ch: string) => !font || font.charToGlyphIndex(ch) !== 0;
  const out: { value: string; label: string; grup: string }[] = [];
  for (const g of CARACTERE) {
    if (g.grup === 'diacritice' && !diacriticePermise()) continue;   // fără bază: grupul dispare
    for (const ch of g.caractere) if (are(ch)) out.push({ value: ch, label: ch, grup: tr('litere.grup_' + g.grup) });
  }
  // caracterul curent (cel EFECTIV) rămâne în listă chiar dacă fontul nu-l are: altfel
  // dispare selecția și panoul arată altceva decât modelul
  const curent = literaEfectiva();
  if (!out.some((o) => o.value === curent)) out.unshift({ value: curent, label: curent, grup: tr('litere.grup_litere') });
  return out;
}

// ---------- PRESETURI ----------
// Se salvează DOAR date serializabile: manifolds-urile tematicilor și ale bazei nu intră
// în JSON, se reîncarcă din bibliotecă după fișier la restaurare.
interface StarePreset {
  v: 1;
  stare: Omit<State, 'tematici' | 'baza'>;
  tematici: (Omit<Tematica, 'raw' | 'dim' | 'nrCorpuri'>)[];
  baza: { fisier: string; scaleX: number; scaleY: number; scaleZ: number; keepProp: boolean; culori: (string | undefined)[] } | null;
}
function serializeazaStare(): StarePreset {
  const { tematici, baza, ...restul } = state;
  return {
    v: 1,
    stare: JSON.parse(JSON.stringify(restul)),
    tematici: tematici.map(({ raw, dim, nrCorpuri, ...t }) => { void raw; void dim; void nrCorpuri; return { ...t }; }),
    baza: baza ? { fisier: baza.fisier, scaleX: baza.scaleX, scaleY: baza.scaleY, scaleZ: baza.scaleZ,
      keepProp: baza.keepProp, culori: baza.corpuri.map((c) => c.culoare) } : null,
  };
}
async function incarcaStare(p: StarePreset) {
  if (!p || p.v !== 1) throw new Error(tr('presets.formatNecunoscut'));
  Object.assign(state, p.stare);
  // preseturile salvate înainte de înclinarea literei n-au câmpurile astea; fără reset ar
  // rămâne valorile scenei curente și litera ar apărea strâmbă la încărcare.
  if (typeof state.rotatieLiteraX !== 'number') state.rotatieLiteraX = 0;
  if (typeof state.rotatieLiteraZ !== 'number') state.rotatieLiteraZ = 0;
  // aici chiar așteptăm fontul: panoul și geometria se construiesc imediat după
  await Promise.all([state.fontLitera, state.fontScris].map((f) => loadFont(f).catch(() => { /* font indisponibil */ })));
  // tematici: geometria se reîncarcă din bibliotecă, transformările vin din preset
  state.tematici = [];
  const lipsa: string[] = [];
  for (const t of p.tematici) {
    const g = await geometrieTematica(t.fisier);
    if (!g) { lipsa.push(t.nume); continue; }
    state.tematici.push({ ...t, raw: g.manifold, dim: g.dim, nrCorpuri: g.nrCorpuri });
  }
  // bază
  state.baza = null;
  if (p.baza) {
    const g = await geometrieBaza(p.baza.fisier);
    if (!g) lipsa.push(p.baza.fisier);
    else state.baza = { fisier: p.baza.fisier, nume: g.nume, raw: g.raw, dim: g.dim, nrCorpuri: g.nrCorpuri,
      scaleX: p.baza.scaleX, scaleY: p.baza.scaleY, scaleZ: p.baza.scaleZ, keepProp: p.baza.keepProp,
      corpuri: (g.corpuri ?? []).map((c, i) => ({ nume: c.nume, manifold: c.manifold,
        culoare: p.baza!.culori[i] ?? c.culoare, culoareOriginala: c.culoare })) };
  }
  if (lipsa.length) throw new Error(tr('presets.lipsescModele', { lista: lipsa.join(', ') }));
}
/** geometria unei tematici, din cache sau de pe disc */
const temaGeom = new Map<string, { manifold: any; dim: [number, number, number]; nrCorpuri: number }>();
async function geometrieTematica(fisier: string) {
  if (temaGeom.has(fisier)) return temaGeom.get(fisier)!;
  const m = manifest.find((x) => x.fisier === fisier); if (!m) return null;
  const buf = await (await fetch('/tematici/' + m.fisier.split('/').map(encodeURIComponent).join('/'))).arrayBuffer();
  const is3mf = /\.3mf$/i.test(m.fisier);
  const loaded = is3mf ? await threeMFToManifold(manifoldModule(), buf) : stlToManifold(manifoldModule(), buf);
  if (!loaded.ok) return null;
  const g = { manifold: loaded.data.manifold, dim: loaded.data.dim, nrCorpuri: is3mf ? (loaded.data as any).corpuri : 1 };
  temaGeom.set(fisier, g);
  return g;
}

const app: AppDefinition = {
  title: 'litere-generator',

  async init(c) {
    ctx = c;
    await initLitere();
    await loadFontManifest();
    // fonturile implicite se pot să nu existe în folder -> alegem alternative din manifest
    state.fontLitera = primulFont([state.fontLitera], () => fontGroups().find((g) => g.categorie !== 'Cursiv')?.items[0] ?? allFonts()[0]);
    state.fontScris = primulFont([state.fontScris], () => fontGroups().find((g) => g.categorie === 'Cursiv')?.items[0] ?? allFonts()[0]);
    for (const k of [state.fontLitera, state.fontScris]) if (k) await loadFont(k).catch(() => {});
    await loadManifests();
  },

  /** după rescanarea pe server: reia manifestele (inclusiv fonturile noi) */
  async reloadLibraries() { await loadFontManifest(); await loadManifests(); },

  panels(sel): PanelGroup[] {
    // NOTĂ: panoul stâng conține DOAR proprietăți. Transformările (poziție/rotație/scară)
    // sunt în bara de unelte de sus (valide pentru orice obiect).
    if (sel && sel.startsWith('tem')) {
      const t = state.tematici.find((x) => x.id === sel);
      if (!t) return [];
      const realX = t.dim[0] * t.scaleX / 100, realY = t.dim[1] * t.scaleY / 100, realZ = t.dim[2] * t.scaleZ / 100;
      // O SINGURĂ sursă pentru intră/iese: valorile MĂSURATE pe solidul plasat, aceleași pe
      // care le folosește bara de stare. Calculul din stare (`pozitieZ + grosime`) devine
      // greșit de îndată ce obiectul e rotit, fiindcă grosimea pe Z nu mai e dimensiunea Z.
      const masurat = last?.diagnostice.obiecteContact.find((o) => o.id === t.id);
      const intra = masurat ? (masurat.intra ?? 0) : Math.max(0, -t.pozitieZ);
      const iese = masurat ? (masurat.iese ?? 0) : Math.max(0, t.pozitieZ + realZ);
      return [{ title: tr('litere.grupTematica', { nume: t.nume, corpuri: t.nrCorpuri > 1 ? tr('litere.sufixCorpuri', { n: t.nrCorpuri }) : '' }), controls: [
        { kind: 'note', key: 'infoDim', label: tr('litere.dimensiuniReale'), value: tr('litere.dimensiuniVal', { x: realX.toFixed(1), y: realY.toFixed(1), z: realZ.toFixed(1) }) },
        { kind: 'note', key: 'infoZ', label: tr('litere.intraIese'), value: tr('litere.intraIeseVal', { intra: intra.toFixed(1), iese: iese.toFixed(1) }) },
        // Scara e o transformare (mânerele rămân în bara de sus), dar VALORILE ei sunt
        // proprietăți ale obiectului, deci stau aici. „grosime mm" e cea practică: setezi
        // direct dimensiunea pe adâncime, fără să calculezi procente.
        { kind: 'checkbox', key: 'keepProp', label: tr('litere.pastreazaProportii'), value: t.keepProp },
        ...(t.keepProp
          ? [{ kind: 'number', key: 'scaraUnif', label: tr('litere.scaraProcent'), min: 5, max: 500, step: 1, value: +t.scaleX.toFixed(1) } as PanelControl,
             { kind: 'number', key: 'mmLongest', label: tr('litere.dimensiuneMax'), min: 2, max: 400, step: 0.5, value: +(Math.max(...t.dim) * t.scaleX / 100).toFixed(1) } as PanelControl]
          : [{ kind: 'number', key: 'scaleX', label: tr('litere.scaraX'), min: 5, max: 500, step: 1, value: +t.scaleX.toFixed(1) } as PanelControl,
             { kind: 'number', key: 'scaleY', label: tr('litere.scaraY'), min: 5, max: 500, step: 1, value: +t.scaleY.toFixed(1) } as PanelControl,
             { kind: 'number', key: 'scaleZ', label: tr('litere.scaraZ'), min: 5, max: 500, step: 1, value: +t.scaleZ.toFixed(1) } as PanelControl]),
        { kind: 'number', key: 'grosime', label: tr('litere.grosimeAdancime'), min: 0.2, max: 100, step: 0.1, value: +realZ.toFixed(2) },
        ...(t.corpuri.length > 1
          ? controaleCorpuri(t.corpuri)
          : [{ kind: 'color', key: 'culoare', label: tr('litere.culoare'), value: t.culoare } as PanelControl]),
        { kind: 'button', key: 'sterge', label: tr('litere.stergeTematica') },
      ] }];
    }
    const scrisGrp: PanelGroup = { title: tr('litere.grupScris'), controls: [
      { kind: 'text', key: 'scris', label: tr('litere.text'), value: state.scris },
      fontControl('fontScris', state.fontScris),
      { kind: 'number', key: 'inaltimeScris', label: tr('litere.inaltime'), min: 5, max: 200, step: 1, value: state.inaltimeScris },
      { kind: 'select', key: 'modScris', label: tr('litere.mod'), value: state.modScris, options: [{ value: 'relief', label: tr('litere.modRelief') }, { value: 'gravat', label: tr('litere.modGravat') }, { value: 'locas', label: tr('litere.modLocas') }] },
      { kind: 'number', key: 'reliefScris', label: tr('litere.relief'), min: 0.4, max: 20, step: 0.1, value: state.reliefScris },
      { kind: 'number', key: 'grosimeScris', label: tr('litere.grosimePiesa'), min: 0.5, max: 30, step: 0.5, value: state.grosimeScris },
      { kind: 'number', key: 'jocInsertie', label: tr('litere.jocInsertie'), min: 0, max: 1, step: 0.05, value: state.jocInsertie },
      { kind: 'color', key: 'culoareScris', label: tr('litere.culoare'), value: state.culoareScris },
    ] };
    if (sel === 'scris') return [scrisGrp];
    const literaGrp: PanelGroup = { title: tr('litere.grupLitera'), controls: [
      // valoarea afișată e caracterul EFECTIV: fără bază, „Ș" se generează ca „S", deci
      // asta trebuie să arate și selectorul. `state.litera` rămâne neatins — dacă revine
      // baza, revine și diacritica, fără să fi pierdut alegerea.
      { kind: 'select', key: 'litera', label: tr('litere.litera'), value: literaEfectiva(), options: optiuniCaracter() },
      fontControl('fontLitera', state.fontLitera),
      { kind: 'number', key: 'inaltimeLitera', label: tr('litere.inaltimeCap'), min: 20, max: 300, step: 1, value: state.inaltimeLitera },
      { kind: 'number', key: 'grosimeLitera', label: tr('litere.grosime'), min: 3, max: 60, step: 0.5, value: state.grosimeLitera },
      { kind: 'color', key: 'culoareLitera', label: tr('litere.culoare'), value: state.culoareLitera },
      { kind: 'checkbox', key: 'chenarActiv', label: tr('litere.chenar'), value: state.chenarActiv },
      { kind: 'number', key: 'latimeChenar', label: tr('litere.latimeChenar'), min: 0.5, max: 15, step: 0.5, value: state.latimeChenar },
      { kind: 'number', key: 'adancimeChenar', label: tr('litere.adancimeChenar'), min: 0.5, max: 20, step: 0.5, value: state.adancimeChenar },
      { kind: 'number', key: 'razaMuchie', label: tr('litere.razaMuchie'), min: 0, max: 3, step: 0.1, value: state.razaMuchie },
      { kind: 'number', key: 'taiereBaza', label: tr('litere.taiereBaza'), min: 0, max: 15, step: 0.5, value: state.taiereBaza },
      { kind: 'number', key: 'iesireMax', label: tr('litere.pragIesire'), min: 1, max: 50, step: 1, value: state.iesireMax },
    ] };
    // BAZĂ selectată → PROPRIETĂȚI (joc + scară + eliminare). Transformările (poziție/rotație/
    // adâncime înfigere) sunt în bara de sus, aplicate literei pe bază.
    if (sel === 'baza' && state.baza) {
      const b = state.baza;
      const dz = b.dim[2] * b.scaleZ / 100;
      return [{ title: tr('litere.grupBaza', { nume: b.nume, corpuri: b.nrCorpuri > 1 ? tr('litere.sufixCorpuri', { n: b.nrCorpuri }) : '' }), controls: [
        { kind: 'note', key: 'infoBaza', label: tr('litere.dimensiuniReale'), value: tr('litere.dimensiuniVal', { x: (b.dim[0] * b.scaleX / 100).toFixed(0), y: (b.dim[1] * b.scaleY / 100).toFixed(0), z: dz.toFixed(0) }) },
        // GROSIMEA BAZEI, în mm. Fișierul dă o grosime fixă (discul de vinil are 5 mm), iar
        // înfigerea nu poate depăși atât — la 4.89 dintr-o bază de 4.9 buzunarul o străpunge
        // și iese gaură, nu locaș. Cu grosimea reglabilă rămâne material sub literă.
        { kind: 'number', key: 'grosimeBaza', label: tr('litere.grosimeBaza'), min: 1, max: 100, step: 0.5,
          value: +dz.toFixed(2) },
        { kind: 'number', key: 'adancimeInfigere', label: tr('litere.adancimeInfigere'),
          min: intervalInfigere().min, max: intervalInfigere().max, step: 0.1, value: limiteazaInfigere(state.adancimeInfigere) },
        { kind: 'note', key: 'infoInfigere', label: tr('litere.intervalInfigere'),
          value: tr('litere.intervalInfigereVal', { ad: limiteazaInfigere(state.adancimeInfigere), grosime: intervalInfigere().grosimeBaza }) },
        { kind: 'number', key: 'jocInfigere', label: tr('litere.jocInfigere'), min: 0, max: 1, step: 0.05, value: state.jocInfigere },
        { kind: 'checkbox', key: 'bazaKeepProp', label: tr('litere.pastreazaProportii'), value: b.keepProp },
        ...(b.keepProp
          ? [{ kind: 'number', key: 'bazaScara', label: tr('litere.scaraProcent'), min: 10, max: 400, step: 1, value: +b.scaleX.toFixed(1) } as PanelControl]
          : [{ kind: 'number', key: 'bazaScaraX', label: tr('litere.scaraX'), min: 10, max: 400, step: 1, value: +b.scaleX.toFixed(1) } as PanelControl,
             { kind: 'number', key: 'bazaScaraY', label: tr('litere.scaraY'), min: 10, max: 400, step: 1, value: +b.scaleY.toFixed(1) } as PanelControl,
             { kind: 'number', key: 'bazaScaraZ', label: tr('litere.scaraZ'), min: 10, max: 400, step: 1, value: +b.scaleZ.toFixed(1) } as PanelControl]),
        // culoare PER CORP, cu revenire la culoarea din fișier (același ajutor ca la tematici)
        ...controaleCorpuri(b.corpuri),
        { kind: 'button', key: 'eliminaBaza', label: tr('litere.eliminaBaza') },
      ] }];
    }
    return [literaGrp, scrisGrp];
  },

  onControl(key, value, sel) {
    if (sel && sel.startsWith('tem')) {
      const t = state.tematici.find((x) => x.id === sel); if (!t) return;
      const v = value as any;
      // culoare per corp, aceleași chei ca la bază — obiectul vizat vine din selecție
      if (key === 'corpResetToate') { for (const c of t.corpuri) c.culoare = c.culoareOriginala; return; }
      if (/^corpCol\d+$/.test(key)) {
        const c = t.corpuri[+key.replace(/\D/g, '')];
        if (c) c.culoare = v as string;
        return;
      }
      switch (key) {
        case 'sterge': state.tematici = state.tematici.filter((x) => x.id !== sel); return;
        case 'keepProp': t.keepProp = v; return;
        case 'scaraUnif': t.scaleX = t.scaleY = t.scaleZ = v; return;
        case 'mmLongest': { const orig = Math.max(...t.dim) || 1; const pct = (v / orig) * 100; t.scaleX = t.scaleY = t.scaleZ = +pct.toFixed(2); return; }
        case 'grosime': { const dz = t.dim[2] || 1; t.scaleZ = +((v / dz) * 100).toFixed(2); return; } // grosime mm -> scaleZ (doar Z)
        case 'flatFace': { const [rx, ry] = dominantFaceRotation(t.raw.scale([t.scaleX / 100, t.scaleY / 100, t.scaleZ / 100])); t.rotX = rx; t.rotY = ry; t.rotZ = 0; return; }
        case 'resetRot': t.rotX = t.rotY = t.rotZ = 0; return;
        case 'rotX+90': t.rotX = norm(t.rotX + 90); return; case 'rotX-90': t.rotX = norm(t.rotX - 90); return;
        case 'rotY+90': t.rotY = norm(t.rotY + 90); return; case 'rotY-90': t.rotY = norm(t.rotY - 90); return;
        case 'rotZ+90': t.rotZ = norm(t.rotZ + 90); return; case 'rotZ-90': t.rotZ = norm(t.rotZ - 90); return;
        default: (t as any)[key] = v; return; // offX, offY, adancimeLocas, scaleX/Y/Z, rotX/Y/Z, culoare
      }
    }
    if (key === 'fontLitera' || key === 'fontScris') { (state as any)[key] = value; ensureFont(value as string); return; }
    if (key === 'modScris') { state.modScris = value as any; state.scrisPozitieZ = value === 'relief' ? 0 : -+(state.grosimeScris * 2 / 3).toFixed(2); return; }
    if (key === 'centreaza') { state.offsetX = 0; state.offsetY = 0; return; }
    if (key === 'resetRotScris') { state.scrisRotX = 0; state.scrisRotY = 0; state.rotatieScris = 0; return; }
    if (key === 'eliminaBaza') { state.baza = null; return; }
    if (state.baza && key === 'grosimeBaza') {
      // Grosimea cerută în mm devine scară pe axa de grosime a bazei (Z local, verticala
      // după `rotate([90,0,0])` din assembly). Nu atinge X/Y: amprenta rămâne cea aleasă.
      const b = state.baza;
      const gros = Math.max(1, value as number);
      if (b.dim[2] > 1e-6) b.scaleZ = +(100 * gros / b.dim[2]).toFixed(4);
      if (b.keepProp) b.keepProp = false;   // grosimea e acum independentă; altfel scara uniformă o suprascrie
      state.adancimeInfigere = limiteazaInfigere(state.adancimeInfigere);   // reașază în noul interval
      return;
    }
    if (state.baza && key === 'adancimeInfigere') { state.adancimeInfigere = limiteazaInfigere(value as number); return; }
    if (state.baza && key === 'corpResetToate') {
      for (const c of state.baza.corpuri) c.culoare = c.culoareOriginala;
      return;
    }
    if (state.baza && /^corpCol\d+$/.test(key)) {
      const c = state.baza.corpuri[+key.replace(/\D/g, '')];
      if (c) c.culoare = value as string;
      return;
    }
    if (state.baza && key.startsWith('baza')) {
      const b = state.baza; const v = value as any;
      if (key === 'bazaKeepProp') b.keepProp = v;
      else if (key === 'bazaScara') { b.scaleX = b.scaleY = b.scaleZ = v; }
      else if (key === 'bazaScaraX') b.scaleX = v; else if (key === 'bazaScaraY') b.scaleY = v; else if (key === 'bazaScaraZ') b.scaleZ = v;
      return;
    }
    (state as any)[key] = value;
    if (key === 'litera' || key === 'scris') { state.offsetX = 0; state.offsetY = 0; } // recentrare doar la literă/text
  },

  suportaPreviewRapid: true,
  rebuild(optiuni) {
    const r = build(buildConfig(!!optiuni?.rapid)); last = r; const d = r.diagnostice;
    // ANCORĂ: piesa care stă pe masă. Fără bază = litera; cu bază = baza. Talpa ancorei -> world Y=0.
    // world Y = -model Y, deci ridicăm toate geometriile cu max(model Y) al ancorei ca talpa ei să ajungă la 0.
    const anchor = r.corpBaza ?? r.corpLitera;
    const abb = anchor.boundingBox();
    const lift = abb.max[1];                                  // talpa ancorei -> world Y=0
    const cx = (abb.min[0] + abb.max[0]) / 2, cz = (abb.min[2] + abb.max[2]) / 2; // centrează pe placă (origine)
    const G = (m: any) => { const g = manifoldToGeometry(m); g.translate(-cx, lift, -cz); return g; };
    const floats = new Map<string, boolean>(); const subt = new Map<string, boolean>();
    for (const oc of d.obiecteContact) { floats.set(oc.id, oc.floats); if (oc.preaSubtire) subt.set(oc.id, true); }
    const objects: SceneObject[] = [];
    if (r.corpBaza) {
      // corpurile bazei se randează separat, fiecare cu culoarea lui; geometria compusă
      // rămâne pentru buzunar, selecție și mișcare solidară, dar nu se randează
      const corpuri = (r.corpBazaCorpuri ?? []).map((c, i) => ({ geometry: G(c.manifold),
        color: state.baza!.corpuri[i]?.culoare ?? c.culoare ?? '#cccccc' }));
      objects.push({ id: 'baza', nume: tr('litere.numeBaza', { nume: state.baza!.nume }),
        geometry: G(r.corpBaza), color: corpuri[0]?.color ?? '#a99a82', movable: false,
        corpuri: corpuri.length ? corpuri : undefined });
    }
    objects.push({ id: 'litera', nume: tr('litere.numeLitera', { litera: literaEfectiva() }), geometry: G(r.corpLitera), color: state.culoareLitera, movable: !!state.baza });
    if (r.corpScris) objects.push({ id: 'scris', nume: tr('litere.numeScris', { scris: scrisEfectiv() }), geometry: G(r.corpScris), color: state.culoareScris, movable: true, warn: floats.get('scris') });
    for (const p of r.pieseTematici) {
      const stareT = state.tematici.find((x) => x.id === p.id);
      const corpuri = corpuriPentruScena(p.corpuri, stareT?.corpuri ?? [], G, p.culoare);
      objects.push({ id: p.id, nume: p.nume + (subt.get(p.id) ? tr('litere.sufixPreaSubtire') : ''),
        corpuri, color: corpuri?.[0]?.color ?? p.culoare, geometry: G(p.manifold), movable: true, warn: floats.get(p.id) });
    }
    const f = (n: number, k = 2) => n.toLocaleString('en-US', { maximumFractionDigits: k });
    const taie = d.volumDupaScadere < d.volumInainteScadere;
    const dx = d.literaBBox.max[0] - d.literaBBox.min[0], dy = Math.abs(d.literaBBox.max[1] - d.literaBBox.min[1]);
    const status: StatusItem[] = [
      { key: 'stab', text: d.stabilitate.staSingura
        ? tr('status.stabil', { aria: f(d.stabilitate.ariaFelieMM2), taiat: d.taiereBazaAplicata ? tr('status.taiat') : '' })
        : tr('status.instabil', { aria: f(d.stabilitate.ariaFelieMM2), prag: d.stabilitate.pragMM2 }), warn: !d.stabilitate.staSingura },
      { key: 'vol', text: tr('status.vol', { mod: d.mod, inainte: f(d.volumInainteScadere, 0), dupa: f(d.volumDupaScadere, 0),
        taie: taie ? tr('status.taie') : '',
        punti: d.mod === 'relief' && d.contact ? tr('status.plutPunti', { plut: d.contact.plutitoare.length, punti: d.punti?.generate ?? 0 }) : '' }) },
      { key: 'dims', text: tr('status.dims', { cap: f(d.capHeightMM), w: f(dx), d: f(dy), n: state.tematici.length }) },
      { key: 'time', text: tr('status.recalc', { ms: f(r.ms) }) },
    ];
    // INTEGRITATE glife: caracter cerut fără geometrie -> avertisment + export blocat
    const eliminate = diacriticeEliminate();
    if (eliminate.length) status.push({ key: 'diacritice', text: tr('status.diacriticeEliminate', { lista: eliminate.join(', ') }) });
    for (const gl of d.glifeLipsa) {
      // sugestia de font are sens doar pentru diacritice (cu bază); pentru o glifă
      // oarecare lipsă nu putem recomanda nimic util
      const alt = doarDiacritice(gl.caractere);
      const sugestie = alt.length ? tr('status.sugestieFonturi', { fonturi: fonturiCareAu(alt).join(', ') }) : '';
      status.push({ key: 'glifa-' + gl.sursa, text: tr('status.glifeLipsa', { sursa: gl.sursa, litere: gl.caractere.join(' ') }) + sugestie, warn: true });
    }
    // slivere eliminate peste 0.05 mm² -> raportează arie + poziție
    const sliv = d.slivereDetalii.filter((s) => s.area > 0.05);
    if (sliv.length) status.push({ key: 'sliver', text: tr('status.slivere', { n: sliv.length,
      lista: sliv.map((s) => tr('status.sliverItem', { aria: s.area.toFixed(3), x: s.x, y: s.y })).join(', ') }), warn: true });
    const plut = d.obiecteContact.filter((o) => o.floats);
    if (plut.length) status.push({ key: 'float', text: tr('status.plutesc', { n: plut.length, lista: plut.map((o) => o.nume).join(', ') }), warn: true });
    const lim = d.obiecteContact.filter((o) => o.limitaAtinsa);
    if (lim.length) status.push({ key: 'lim', text: tr('status.zLimitata', {
      lista: lim.map((o) => tr('status.zLimitataItem', { nume: o.nume, mm: o.intra ?? 0 })).join(', ') }), warn: true });
    // TASK 3: obiecte care ies mult în afară (prag configurabil, nu blochează)
    const outObj = d.obiecteContact.filter((o) => (o.iese ?? 0) > state.iesireMax);
    if (outObj.length) status.push({ key: 'iese', text: tr('status.iese', {
      lista: outObj.map((o) => tr('status.ieseItem', { nume: o.nume, mm: o.iese ?? 0 })).join('; ') }), warn: true });
    // BAZĂ: contact talpă↔bază (avertisment, nu blochează), limită infigere, potrivire
    if (d.baza) {
      status.push({ key: 'baza', text: tr('status.baza', { w: d.baza.dimBaza[0], d: d.baza.dimBaza[1], h: d.baza.dimBaza[2], ad: d.baza.adancimeEfectiva }) });
      // Contactul e măsurat în 3D (cât din amprenta tălpii are material de bază sub ea, pe
      // adâncimea de înfigere), deci un procent mic înseamnă chiar aer. Sub 40% lipirea nu mai
      // ține, așa că mesajul devine avertisment explicit, nu o simplă cifră.
      if (d.baza.contactProcent < 40) {
        status.push({ key: 'bazacontact', text: tr('status.contactSlab', { procent: d.baza.contactProcent }), warn: true });
      } else if (d.baza.contactProcent < 99.5) {
        status.push({ key: 'bazacontact', text: tr('status.contactBaza', { procent: d.baza.contactProcent }) });
      }
      // informativ, fără blocare: peste 80% din grosime rămâne puțin material dedesubt
      const ramas = +(d.baza.grosimeBaza - d.baza.adancimeEfectiva).toFixed(2);
      if (d.baza.adancimeEfectiva > 0.8 * d.baza.grosimeBaza) status.push({ key: 'bazalim', text: tr('status.materialRamas', { mm: ramas }) });
      if (!d.baza.fitOk) status.push({ key: 'bazafit', text: tr('status.nuSePotriveste'), warn: true });
    }
    return { objects, status };
  },

  // (dx, dy) = axele din planul de lucru, dz = perpendiculara (a treia săgeată din modul „mută")
  onMove(id, dx, dy, dz = 0) {
    if (id === 'litera') {   // pe bază: planul e XZ, verticala schimbă cât e înfiptă litera
      state.pozitieLiteraX = +(state.pozitieLiteraX + dx).toFixed(2);
      state.pozitieLiteraZ = +(state.pozitieLiteraZ + dy).toFixed(2);
      if (dz) state.adancimeInfigere = limiteazaInfigere(state.adancimeInfigere - dz);
      return;
    }
    if (id === 'scris') { state.offsetX += dx; state.offsetY += dy; if (dz) state.scrisPozitieZ = +(state.scrisPozitieZ + dz).toFixed(2); return; }
    const t = state.tematici.find((x) => x.id === id);
    if (t) { t.offX += dx; t.offY += dy; if (dz) t.pozitieZ = +(t.pozitieZ + dz).toFixed(2); }
  },
  // rotația din inel: world Y e oglindit față de model, deci pe ORICE axă Δworld => -Δ pe rot model.
  onRotate(id, deltaDeg, axis = 'z') {
    const m = (cur: number) => norm(cur - deltaDeg);
    if (id === 'scris') { if (axis === 'x') state.scrisRotX = m(state.scrisRotX); else if (axis === 'y') state.scrisRotY = m(state.scrisRotY); else state.rotatieScris = m(state.rotatieScris); return; }
    if (id === 'litera') { if (axis === 'x') state.rotatieLiteraX = m(state.rotatieLiteraX); else if (axis === 'y') state.rotatieLitera = m(state.rotatieLitera); else state.rotatieLiteraZ = m(state.rotatieLiteraZ); return; }
    const t = state.tematici.find((x) => x.id === id); if (!t) return;
    if (axis === 'x') t.rotX = m(t.rotX); else if (axis === 'y') t.rotY = m(t.rotY); else t.rotZ = m(t.rotZ);
  },
  onScale(id, factor) {
    if (id === 'scris') { state.inaltimeScris = Math.max(5, Math.round(state.inaltimeScris * factor)); return; }
    const t = state.tematici.find((x) => x.id === id); if (!t) return;
    const clamp = (n: number) => Math.min(400, Math.max(5, +(n * factor).toFixed(2)));
    if (t.keepProp) { t.scaleX = t.scaleY = t.scaleZ = clamp(t.scaleX); }
    else { t.scaleX = clamp(t.scaleX); t.scaleY = clamp(t.scaleY); t.scaleZ = clamp(t.scaleZ); }
  },
  // adâncime: world +Z = spre privitor = iese; pozitieZ crește. (0 = fața literei)
  onDepth(id, dz) {
    // litera pe bază: săgeata verticală = adâncimea de înfigere (sus = mai puțin înfiptă)
    if (id === 'litera') { if (state.baza) state.adancimeInfigere = Math.max(0.5, +(state.adancimeInfigere - dz).toFixed(2)); return; }
    const t = state.tematici.find((x) => x.id === id); if (t) t.pozitieZ = +(t.pozitieZ + dz).toFixed(2);
  },

  // ---- TRANSFORMĂRI GENERICE (bara de sus) — mapate pe parametrii fiecărui tip ----
  getTransform(id) {
    // `rotPlan`: scrisul și tematicile trăiesc pe fața literei. Pe bază, litera se poate roti,
    // deci fața ei nu mai e paralelă cu planul XY al lumii. Fără asta, tragerea „la dreapta"
    // muta piesa în diagonală (rotație 30°) sau perpendicular (90°) — măsurat.
    const planFata = state.baza ? state.rotatieLitera : 0;
    if (id === 'scris') return { pos: [state.offsetX, state.offsetY, state.scrisPozitieZ], rot: [state.scrisRotX, state.scrisRotY, state.rotatieScris], scale: [100, 100, 100], canMove: true, canRotate: true, canScale: false, rotPlan: planFata };
    // fără săgeata de adâncime pe bază: intervalul util e de 1–3 mm, prea mic pentru o
    // săgeată de translație. Adâncimea se reglează din câmpul numeric al panoului bazei.
    // Litera se rotește pe TOATE trei axele, cerut explicit. Consecință acceptată: înclinată pe
    // X sau Z, talpa nu mai e paralelă cu fața bazei, iar locașul rămâne prismă verticală — piesa
    // intră, dar se sprijină doar pe punctele cele mai de jos. Fără `rotAxes`, deci gizmo-ul arată
    // toate inelele; fiecare are acum unde să se salveze, deci niciunul nu mai revine.
    if (id === 'litera') return state.baza ? { pos: [state.pozitieLiteraX, state.adancimeInfigere, state.pozitieLiteraZ], rot: [state.rotatieLiteraX, state.rotatieLitera, state.rotatieLiteraZ], scale: [100, 100, 100], canMove: true, canRotate: true, canScale: false, moveOnGround: true,
      movesWith: [...(state.scris.trim() ? ['scris'] : []), ...state.tematici.map((t) => t.id)] } : null;   // copiii urmează litera
    if (id === 'baza') { const b = state.baza; return b ? { pos: [0, 0, 0], rot: [0, 0, 0], scale: [b.scaleX, b.scaleY, b.scaleZ], keepProp: b.keepProp, canMove: false, canRotate: false, canScale: true } : null; }
    const t = state.tematici.find((x) => x.id === id);
    return t ? { pos: [t.offX, t.offY, t.pozitieZ], rot: [t.rotX, t.rotY, t.rotZ], scale: [t.scaleX, t.scaleY, t.scaleZ], keepProp: t.keepProp, canMove: true, canRotate: true, canScale: true, rotPlan: planFata } : null;
  },
  applyTransform(id, op) {
    const set = (cur: number, v: number) => (op.mode === 'absolute' ? v : cur + v);
    const cS = (n: number) => Math.min(400, Math.max(5, +n.toFixed(2)));
    const t = state.tematici.find((x) => x.id === id);
    if (op.kind === 'rotate') {
      const v = op.value ?? 0, ax = op.axis;
      if (id === 'scris') { if (ax === 'x') state.scrisRotX = norm(set(state.scrisRotX, v)); else if (ax === 'y') state.scrisRotY = norm(set(state.scrisRotY, v)); else state.rotatieScris = norm(set(state.rotatieScris, v)); }
      else if (id === 'litera') { if (ax === 'x') state.rotatieLiteraX = norm(set(state.rotatieLiteraX, v)); else if (ax === 'y') state.rotatieLitera = norm(set(state.rotatieLitera, v)); else state.rotatieLiteraZ = norm(set(state.rotatieLiteraZ, v)); }
      else if (t) { if (ax === 'x') t.rotX = norm(set(t.rotX, v)); else if (ax === 'y') t.rotY = norm(set(t.rotY, v)); else t.rotZ = norm(set(t.rotZ, v)); }
    } else if (op.kind === 'move') {
      const v = op.value ?? 0, ax = op.axis;
      if (id === 'scris') { if (ax === 'x') state.offsetX = +set(state.offsetX, v).toFixed(2); else if (ax === 'y') state.offsetY = +set(state.offsetY, v).toFixed(2); else state.scrisPozitieZ = +set(state.scrisPozitieZ, v).toFixed(2); }
      else if (id === 'litera') { if (ax === 'x') state.pozitieLiteraX = +set(state.pozitieLiteraX, v).toFixed(2); else if (ax === 'z') state.pozitieLiteraZ = +set(state.pozitieLiteraZ, v).toFixed(2); else if (ax === 'y') state.adancimeInfigere = limiteazaInfigere(set(state.adancimeInfigere, v)); }
      else if (t) { if (ax === 'x') t.offX = +set(t.offX, v).toFixed(2); else if (ax === 'y') t.offY = +set(t.offY, v).toFixed(2); else t.pozitieZ = +set(t.pozitieZ, v).toFixed(2); }
    } else if (op.kind === 'scale') {
      const v = op.value ?? 100, ax = op.axis;
      if (id === 'baza' && state.baza) { const b = state.baza; if (!ax || b.keepProp) b.scaleX = b.scaleY = b.scaleZ = cS(op.mode === 'absolute' ? v : b.scaleX * v / 100); else if (ax === 'x') b.scaleX = cS(set(b.scaleX, 0) === b.scaleX ? (op.mode === 'absolute' ? v : b.scaleX * v / 100) : v); }
      else if (t) {
        const nv = (cur: number) => cS(op.mode === 'absolute' ? v : cur * v / 100);
        if (!ax || t.keepProp) t.scaleX = t.scaleY = t.scaleZ = nv(t.scaleX);
        else if (ax === 'x') t.scaleX = nv(t.scaleX); else if (ax === 'y') t.scaleY = nv(t.scaleY); else t.scaleZ = nv(t.scaleZ);
      }
    }
  },
  /** Litera nu poate fi trasă în afara bazei: se oprește când talpa ar acoperi sub 20% din bază.
   *  Aproximare rapidă pe amprente (dreptunghiuri) — se evaluează la fiecare mișcare de mouse. */
  // Litera pe bază NU se mai limitează la tragere: cât material stă peste postament e o
  // decizie estetică, nu o eroare. O literă mai lată decât baza e legitimă. Rămâne doar
  // avertismentul cu procentul, iar exportul se blochează exclusiv la contact ZERO —
  // acolo litera chiar n-are unde să se lipească.
  clampMove(id, dx, dy) { void id; return { dx, dy }; },
  align(id, how) {
    const cx = how === 'centerX' || how === 'centerXY', cy = how === 'centerY' || how === 'centerXY';
    if (id === 'scris') { if (cx) state.offsetX = 0; if (cy) state.offsetY = 0; }
    else { const t = state.tematici.find((x) => x.id === id); if (t) { if (cx) t.offX = 0; if (cy) t.offY = 0; } }
  },
  layFlat(id) {
    const t = state.tematici.find((x) => x.id === id); if (!t) return;
    const [rx, ry] = dominantFaceRotation(t.raw.scale([t.scaleX / 100, t.scaleY / 100, t.scaleZ / 100]));
    t.rotX = rx; t.rotY = ry; t.rotZ = 0;
  },
  resetRot(id) {
    if (id === 'scris') { state.scrisRotX = state.scrisRotY = state.rotatieScris = 0; return; }
    if (id === 'litera') { state.rotatieLitera = state.rotatieLiteraX = state.rotatieLiteraZ = 0; return; }
    const t = state.tematici.find((x) => x.id === id); if (t) t.rotX = t.rotY = t.rotZ = 0;
  },

  exportBodies(): ExportBody[] {
    if (!last) return [];
    // Orientarea pentru print alocă masiv (rotiri, oglindiri, verificarea de potrivire,
    // decompose) — toate în heap-ul WASM, pe care GC-ul JS nu-l atinge. Păstrăm doar corpurile
    // întoarse; intermediarele se eliberează la ieşirea din arenă. Vezi core/geometry/arena.ts.
    const brut = (): ExportBody[] => {
    if (!last) return [];
    const gl = last.diagnostice.glifeLipsa;
    if (gl.length) {
      const alt = doarDiacritice(gl.flatMap((g) => g.caractere));
      throw new Error(tr('exportLitere.blocatFaraGeometrie', { litere: gl.map((g) => `${g.sursa}: ${g.caractere.join(' ')}`).join('; ') })
        + (alt.length ? tr('status.sugestieFonturi', { fonturi: fonturiCareAu(alt).join(', ') }) : ''));
    }
    const bz = last.diagnostice.baza;
    if (bz && !bz.fitOk) throw new Error(tr('exportLitere.blocatNuSePotriveste'));
    // Contactul parțial e o alegere estetică, nu o eroare — se exportă cu avertisment.
    // Doar contactul ZERO blochează: litera n-are unde să se lipească.
    if (bz && bz.contactProcent <= 0) throw new Error(tr('exportLitere.blocatFaraContact'));
    const plut = last.diagnostice.obiecteContact.filter((o) => o.floats);
    if (plut.length) throw new Error(tr('exportLitere.blocatPlutesc', { n: plut.length, lista: plut.map((o) => o.nume).join(', ') }));
    const pieces: PrintPiece[] = [];
    if (last.corpScris) pieces.push({ name: `scris_${slug(scrisEfectiv())}`, manifold: last.corpScris, isInlay: state.modScris === 'locas', pocketSil: last.pocketSils['scris'], solidMontaj: last.solideMontaj['scris'] });
    for (const p of last.pieseTematici) pieces.push({ name: p.nume.replace(/\s+/g, '_'), manifold: p.manifold, isInlay: true,
      pocketSil: last.pocketSils[p.id], solidMontaj: last.solideMontaj[p.id], corpuri: p.corpuri });
    // fiecare piesă primește culoarea ei (scrisă în 3MF ca basematerials standard)
    const culoarePiesa = (nume: string): string | undefined => {
      if (nume.startsWith('litera_')) return state.culoareLitera;
      if (nume.startsWith('scris_')) return state.culoareScris;
      return state.tematici.find((t) => t.nume.replace(/\s+/g, '_') === nume)?.culoare;
    };
    const out: ExportBody[] = orientForPrint(`litera_${literaEfectiva()}`, last.corpLitera, pieces, state.jocInsertie)
      .flatMap((o) => {
        // literă = culcată pe spate, cu locașurile în sus; piesele de inlay = fața vizibilă în jos
        const orientare = o.name.startsWith('litera_') ? tr('exportLitere.fataLocasuriSus') : tr('exportLitere.fataVizibilaJos');
        if (!o.corpuri?.length) return [{ name: o.name, manifold: o.manifold, culoare: culoarePiesa(o.name), orientare }];
        // multi-color: un obiect per corp, grupate ca să nu fie despărțite pe placă
        const stareT = state.tematici.find((x) => x.nume.replace(/\s+/g, '_') === o.name);
        return o.corpuri.map((c, i) => ({
          name: `${o.name}_${i + 1}_${slug(c.nume)}`, manifold: c.manifold,
          culoare: stareT?.corpuri[i]?.culoare ?? c.culoare, orientare, grup: o.name,
        }));
      });
    // BAZĂ ca obiect separat: talpă (max model Y) -> Z=0, fața superioară (locaș) în sus; mirror ca restul
    if (last.corpBaza) {
      let b = last.corpBaza.rotate([-90, 0, 0]).mirror([0, 1, 0]);
      const bb = b.boundingBox();
      b = b.translate([0, 0, -bb.min[2]]);
      // Fiecare CORP separat (așa cum a venit din fișier) devine obiect propriu în 3MF,
      // cu culoarea lui. NU folosim decompose(): corpurile care se ating ar fi contopite.
      const corpuri = last.corpBazaCorpuri ?? [];
      if (corpuri.length) {
        const orient = (m: any) => { const r = m.rotate([-90, 0, 0]).mirror([0, 1, 0]); return r.translate([0, 0, -bb.min[2]]); };
        corpuri.forEach((c, i) => out.push({ name: `baza_${slug(state.baza!.nume)}_${i + 1}_${slug(c.nume)}`,
          manifold: orient(c.manifold), culoare: state.baza!.corpuri[i]?.culoare ?? c.culoare,
          // toate corpurile bazei sunt ACEEAȘI piesă fizică (culori suprapuse) -> nu se despart pe placă
          orientare: tr('exportLitere.fataSuperioaraSus'), grup: 'baza' }));
      } else {
        out.push({ name: `baza_${slug(state.baza!.nume)}`, manifold: b });
      }
    }
    return out;
    };
    return inArena(brut, (corpuri) => [corpuri]);
  },
  exportName() { return `${slug(literaEfectiva())}-${slug(scrisEfectiv())}-${state.inaltimeLitera}mm`; },
  /** fișa de producție: ce se lipește unde, cu ce jocuri */
  exportNotes() {
    // Fără antet „Montaj:": fișa de producție are deja secțiunea ei, iar linia asta
    // o dubla. Notele de aici sunt doar pașii calculați din model.
    const n: string[] = [];
    if (state.scris.trim() && state.modScris === 'locas') n.push(tr('exportLitere.montajScris', { scris: scrisEfectiv(), joc: state.jocInsertie }));
    for (const t of state.tematici) {
      const d = last?.diagnostice.obiecteContact.find((o) => o.id === t.id);
      n.push(tr('exportLitere.montajTematica', { nume: t.nume, mm: (d?.adancimeEfectiva ?? Math.max(0, -t.pozitieZ)).toFixed(1) }));
    }
    // adâncimea EFECTIVĂ, nu cea cerută: e limitată ca să rămână ≥3 mm material sub literă
    if (state.baza) {
      const ad = last?.diagnostice.baza?.adancimeEfectiva ?? state.adancimeInfigere;
      n.push(tr('exportLitere.montajBaza', { ad, joc: state.jocInfigere,
        limitat: last?.diagnostice.baza?.limitaAtinsa ? tr('exportLitere.montajBazaLimitat', { cerut: state.adancimeInfigere }) : '' }));
    }
    if (n.length === 1) n.push(tr('exportLitere.faraMontaj'));
    return n;
  },
  modeIndicator() { return state.modScris; },

  library(): LibraryItem[] { return manifest.map((m) => ({ id: m.fisier, nume: m.nume, tema: m.tema, thumb: m.thumb ? '/tematici/' + m.thumb.split('/').map(encodeURIComponent).join('/') : undefined })); },
  baseLibrary(): LibraryItem[] { return baseManifest.map((b) => ({ id: b.fisier, nume: b.nume, tema: b.tema, thumb: b.thumb ? '/base/' + b.thumb.split('/').map(encodeURIComponent).join('/') : undefined })); },
  getPreset() { return serializeazaStare(); },
  async loadPreset(preset) { await incarcaStare(preset as StarePreset); },
  async onAddBase(fisier) {
    const g = await geometrieBaza(fisier);
    if (g) state.baza = { fisier, nume: g.nume, raw: g.raw, dim: g.dim, nrCorpuri: g.nrCorpuri, scaleX: 100, scaleY: 100, scaleZ: 100, keepProp: true,
        corpuri: (g.corpuri ?? []).map((c) => ({ nume: c.nume, manifold: c.manifold, culoare: c.culoare, culoareOriginala: c.culoare })) };
  },
  objectInfo(id) {
    if (!last) return null;
    const key = id ?? 'litera';
    const m = key === 'litera' ? last.corpLitera : key === 'scris' ? last.corpScris : key === 'baza' ? last.corpBaza : last.pieseTematici.find((p) => p.id === key)?.manifold;
    if (!m) return null;
    const bb = m.boundingBox();
    const nume = key === 'litera' ? tr('litere.numeLitera', { litera: literaEfectiva() })
      : key === 'scris' ? tr('litere.numeScris', { scris: scrisEfectiv() })
      : key === 'baza' ? tr('litere.numeBaza', { nume: state.baza?.nume ?? '' })
      : (last.pieseTematici.find((p) => p.id === key)?.nume ?? key);
    return { nume, dimMM: [+(bb.max[0] - bb.min[0]).toFixed(1), +Math.abs(bb.max[1] - bb.min[1]).toFixed(1), +(bb.max[2] - bb.min[2]).toFixed(1)], volumeMM3: +m.volume().toFixed(0), triangles: m.numTri() };
  },
  async onAddFromLibrary(fisier) {
    const m = manifest.find((x) => x.fisier === fisier); if (!m) return;
    const buf = await (await fetch('/tematici/' + m.fisier.split('/').map(encodeURIComponent).join('/'))).arrayBuffer();
    const is3mf = /\.3mf$/i.test(m.fisier);
    const loaded = is3mf ? await threeMFToManifold(manifoldModule(), buf) : stlToManifold(manifoldModule(), buf);
    if (!loaded.ok) { alert(tr('litere.nuSaIncarcat', { nume: m.nume, eroare: loaded.motiv })); return; }
    const maxDim = Math.max(...loaded.data.dim) || 1;
    const sp = Math.round((35 / maxDim) * 100);
    const nrCorpuri = is3mf ? (loaded.data as any).corpuri : 1;
    const corpuri = corpuriDinFisier(is3mf ? (loaded.data as any).info : undefined);
    state.tematici.push({ id: 'tem' + (++idCounter), fisier: m.fisier, nume: m.nume, tema: m.tema, raw: loaded.data.manifold,
      dim: loaded.data.dim, nrCorpuri, scaleX: sp, scaleY: sp, scaleZ: sp, keepProp: true, pozitieZ: -3,
      rotX: 0, rotY: 0, rotZ: 0, culoare: PALETTE[state.tematici.length % PALETTE.length], offX: 0, offY: 0, corpuri });
  },

  id: 'litere',
  snapshot() { return { ...state, tematici: state.tematici.map((t) => ({ ...t })) }; },
  restore(s: any) { Object.assign(state, s, { tematici: (s.tematici as Tematica[]).map((t) => ({ ...t })) }); },
};

runApp(app);
