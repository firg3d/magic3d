/**
 * APP BRELOCURI — implementează AppDefinition și rulează prin nucleu (runApp).
 * Nu cablează nimic imperativ din nucleu: declară controale, construiește geometrie.
 * Nu importă NIMIC din apps/litere (izolare). Solidul din font vine din core/geometry/textSolid.ts,
 * comun tuturor aplicațiilor, ca și registrul de fonturi din core/assets/fonts.ts.
 */
import { t as tr } from '../../core/i18n/index.js';
import type { AppDefinition, PanelControl, PanelGroup, SceneObject, StatusItem, ExportBody } from '../../core/app.js';
import { runApp } from '../../core/ui/shell.js';
import { manifoldToGeometry, initManifold } from '../../core/geometry/manifold.js';
import { inArena, adunaHandle, elibereaza } from '../../core/geometry/arena.js';
import { configureManifold as configBreloc, buildBreloc, pozitieValida, pasValid, inaltimeDinLungime, SECTIUNE_MIN,
  PATA_MAX, TRASATURA_MIN, type BrelocResult, type TipPrindere, type LaturaPrindere } from './breloc.js';
import { loadFontManifest, loadFont, fontCached, fontGroups, previewURL, allFonts } from '../../core/assets/fonts.js';

interface State {
  text: string;
  lungimePlacuta: number;
  latura: LaturaPrindere;
  font: string;
  reliefLitera: number;
  culoareLitera: string;
  latimePlacuta: number;
  netezire: number;
  grosimePlacuta: number;
  diametruGaura: number;
  tipPrindere: TipPrindere;
  grosimePrindere: number;
  /** unde a fost trasă prinderea; null = se așază automat */
  pozitiePrindere: [number, number] | null;
  culoarePlacuta: string;
}
/** proporțiile cu care pornește fiecare tip de prindere, când e ales din meniu */
const IMPLICITE_PRINDERE: Record<TipPrindere, { diametruGaura: number; grosimePrindere: number }> = {
  gaura: { diametruGaura: 3.5, grosimePrindere: 0 },
  ureche: { diametruGaura: 4, grosimePrindere: 2.5 },
  inel: { diametruGaura: 9, grosimePrindere: 3 },
};
const state: State = {
  // produsul din poza de referință e un NUME, nu o inițială: aplicația se deschide pe cazul
  // obișnuit. O singură literă rămâne cazul particular, merge la fel.
  text: 'Mateo',
  lungimePlacuta: 70,
  latura: 'stanga',
  font: 'Baloo2-Regular.ttf',
  reliefLitera: 1.8,
  culoareLitera: '#FFFFFF',
  // 3 mm, ca în poză: plăcuța e o ramă subțire în jurul numelui. Gaura nu mai are nevoie de
  // bandă lată, fiindcă urechea își aduce materialul ei.
  latimePlacuta: 3,
  netezire: 2,
  grosimePlacuta: 3,
  diametruGaura: 4,
  tipPrindere: 'ureche',
  grosimePrindere: 2.5,
  pozitiePrindere: null,
  culoarePlacuta: '#E8709B',
};
/** culoarea mânerului de tragere — accentul interfeței, ca să nu fie luat drept material */
const CULOARE_MARCAJ = '#1a8cff';

let ctx: { refresh(): void } | null = null;
let last: BrelocResult | null = null;

/**
 * MEMORIA WASM. Obiectele Manifold sunt handle-uri embind: memoria lor sta in heap-ul WASM si
 * se elibereaza doar prin `.delete()`, GC-ul JS n-o atinge. O reconstructie aloca sute de
 * intermediare; fara eliberare heap-ul creste monoton pana cand WASM-ul incepe sa arunce
 * („memory access out of bounds", „table index is out of bounds", „parameter 0 has unknown
 * type <gunoi>"). Simptomul pentru utilizator nu e „crapa", ci „modelul nu se actualizeaza":
 * reconstructia arunca si pe ecran ramane geometria veche.
 *
 * Acelasi tipar ca in `apps/litere/build.ts`. Vezi `core/geometry/arena.ts` pentru mecanism.
 */
function construieste(): BrelocResult {
  const r = inArena(() => buildBreloc(config()), (rez) => [rez]);
  // rezultatul precedent nu mai e afisat si nu mai poate fi exportat: se elibereaza ce nu e
  // partajat cu cel nou. Daca buildBreloc ar fi aruncat, am fi iesit mai sus, iar precedentul
  // ar fi ramas viu — corect, fiindca pe ecran ramane el.
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
 * Înălțimea literei nu mai e parametru: se calculează din lungimea cerută a brelocului.
 * Un breloc se comandă „de 70 mm", nu „cu litere de 15 mm" — iar „Mateo" și „Alexandra"
 * trebuie să iasă la fel de lungi, altfel nu se pot pune pe același inel de chei.
 */
const inaltimeLitera = () =>
  inaltimeDinLungime(fontCached(state.font), state.text, state.lungimePlacuta, state.latimePlacuta);

function fontControl(): PanelControl {
  return { kind: 'fontselect', key: 'font', label: tr('brelocuri.font'), value: state.font,
    groups: fontGroups().map((g) => ({ categorie: g.categorie,
      items: g.items.map((f) => ({ value: f.fisier, label: f.familie, url: previewURL(f), missing: f.lipsaDiacritice })) })) };
}


/**
 * Din spațiul modelului în spațiul lumii: brelocul stă CULCAT pe placă.
 * manifoldToGeometry dă (x, −y, z) — fața literei în planul XY, grosimea pe Z. Rotația de
 * −90° pe X duce grosimea pe verticala lumii (Y) și amprenta în planul plăcii (XZ), deci
 * ce se vede în viewport e chiar cum se așază pe placă. Talpa e deja la Z=0 în model.
 */
const G = (m: any) => { const g = manifoldToGeometry(m); g.rotateX(-Math.PI / 2); return g; };

/**
 * Fontul e încărcat LENEȘ: între click-ul din selector și parsarea lui trece o clipă în care
 * `fontCached` întoarce undefined. Fără garda asta, reconstrucția din acel interval arunca
 * („Cannot read properties of undefined (reading 'unitsPerEm')") și utilizatorul vedea o
 * bandă de eroare la fiecare schimbare de font — un defect al așteptării, nu al modelului.
 */
const fontGata = () => !!fontCached(state.font);

const config = () => ({
  text: state.text, font: fontCached(state.font), inaltimeLitera: inaltimeLitera(),
  reliefLitera: state.reliefLitera, latimePlacuta: state.latimePlacuta, netezire: state.netezire,
  grosimePlacuta: state.grosimePlacuta, diametruGaura: state.diametruGaura,
  tipPrindere: state.tipPrindere, grosimePrindere: state.grosimePrindere,
  pozitiePrindere: state.pozitiePrindere, latura: state.latura,
});

/**
 * Poziția prinderii, în coordonatele modelului, oricum ar fi ea obținută (automat sau trasă).
 * Tragerea „pe sol" dă (dx, dy) pe axele X și Z ale lumii, iar afișarea e
 * world = (modelX, modelZ, modelY) — deci world X -> model X, world Z -> model Y, fără schimbare
 * de semn. De asta deplasările se adună direct, fără conversie.
 */
const pozitiaPrinderii = (): [number, number] =>
  state.pozitiePrindere ?? (last?.diagnostice.gaura.pozitie ?? [0, 0]);

const app: AppDefinition = {
  title: 'brelocuri',
  id: 'brelocuri',

  async init(c) {
    ctx = c;
    // nucleul pornește modulul geometric; aplicația doar îl pasează logicii de breloc
    configBreloc(await initManifold());
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
      { title: tr('brelocuri.grupLitera'), controls: [
        { kind: 'text', key: 'text', label: tr('brelocuri.text'), value: state.text },
        fontControl(),
        { kind: 'number', key: 'lungimePlacuta', label: tr('brelocuri.lungime'), min: 25, max: 150, step: 1, value: state.lungimePlacuta },
        // înălțimea nu se cere, se raportează: e rezultatul lungimii și al lungimii numelui
        { kind: 'note', key: 'notaInaltime', label: tr('brelocuri.inaltimeRezultata'), value: tr('brelocuri.mm', { v: inaltimeLitera().toFixed(1) }) },
        { kind: 'number', key: 'reliefLitera', label: tr('brelocuri.relief'), min: 0.6, max: 4, step: 0.1, value: state.reliefLitera },
        { kind: 'color', key: 'culoareLitera', label: tr('brelocuri.culoareLitera'), value: state.culoareLitera },
      ] },
      { title: tr('brelocuri.grupPlacuta'), controls: [
        { kind: 'number', key: 'latimePlacuta', label: tr('brelocuri.latimePlacuta'), min: 2, max: 15, step: 0.5, value: state.latimePlacuta },
        { kind: 'number', key: 'netezire', label: tr('brelocuri.netezire'), min: 0, max: 6, step: 0.5, value: state.netezire },
        { kind: 'number', key: 'grosimePlacuta', label: tr('brelocuri.grosimePlacuta'), min: 1.5, max: 6, step: 0.5, value: state.grosimePlacuta },
        { kind: 'color', key: 'culoarePlacuta', label: tr('brelocuri.culoarePlacuta'), value: state.culoarePlacuta },
      ] },
      { title: tr('brelocuri.grupPrindere'), controls: [
        { kind: 'select', key: 'tipPrindere', label: tr('brelocuri.tip'), value: state.tipPrindere, options: [
          { value: 'gaura', label: tr('brelocuri.tipGaura') },
          { value: 'ureche', label: tr('brelocuri.tipUreche') },
          { value: 'inel', label: tr('brelocuri.tipInel') },
        ] },
        // aceeași mărime, alt nume: la inel gaura E interiorul inelului
        { kind: 'number', key: 'diametruGaura',
          label: state.tipPrindere === 'inel' ? tr('brelocuri.diametruInterior') : tr('brelocuri.diametruGaura'),
          min: 2, max: 20, step: 0.5, value: state.diametruGaura },
        ...(state.tipPrindere === 'gaura' ? [] : [
          { kind: 'number', key: 'grosimePrindere', label: tr('brelocuri.grosimePrindere'), min: 1.5, max: 6, step: 0.5, value: state.grosimePrindere } as PanelControl,
        ]),
        { kind: 'select', key: 'latura', label: tr('brelocuri.latura'), value: state.latura, options: [
          { value: 'stanga', label: tr('brelocuri.laturaStanga') },
          { value: 'dreapta', label: tr('brelocuri.laturaDreapta') },
          { value: 'sus', label: tr('brelocuri.laturaSus') },
        ] },
        { kind: 'note', key: 'notaTragere', label: tr('brelocuri.pozitie'),
          value: state.pozitiePrindere ? tr('brelocuri.pozitieManuala', { x: state.pozitiePrindere[0].toFixed(1), y: (-state.pozitiePrindere[1]).toFixed(1) }) : tr('brelocuri.pozitieAuto') },
        ...(state.pozitiePrindere ? [{ kind: 'button', key: 'asazaAutomat', label: tr('brelocuri.asazaAutomat') } as PanelControl] : []),
      ] },
    ];
  },

  onControl(key, value) {
    if (key === 'asazaAutomat') { state.pozitiePrindere = null; return; }
    if (key === 'tipPrindere') {
      state.tipPrindere = value as TipPrindere;
      // proporțiile pornesc de la cele potrivite tipului: o ureche cu gaură de 9 mm sau un
      // inel cu interior de 3.5 n-ar fi ce a cerut omul din meniu
      Object.assign(state, IMPLICITE_PRINDERE[state.tipPrindere]);
      state.pozitiePrindere = null;   // altă mărime, altă zonă validă — se reașază singură
      return;
    }
    // gaura sau peretele s-au schimbat: poziția manuală rămâne, dar poate fi respinsă la
    // reconstrucție dacă nu mai încape. Se raportează, nu se mută pe furiș.
    if (key === 'font') {
      state.font = value as string;
      if (!fontCached(state.font)) loadFont(state.font).then(() => ctx?.refresh()).catch(() => { /* font indisponibil */ });
      return;
    }
    (state as any)[key] = value;
  },

  rebuild() {
    // fontul încă se parsează: se păstrează modelul de dinainte și se spune de ce, în loc să
    // arunce. `loadFont` cheamă oricum `refresh` când termină, deci starea asta e de o clipă.
    if (!fontGata()) {
      const obiecte = last ? [{ id: 'breloc', nume: tr('brelocuri.numeBreloc', { text: state.text }),
        geometry: G(last.corpIntreg), color: state.culoarePlacuta, movable: false,
        corpuri: [{ geometry: G(last.corpPlacuta), color: state.culoarePlacuta },
                  { geometry: G(last.corpLitera), color: state.culoareLitera }] }] : [];
      return { objects: obiecte, status: [{ key: 'font', text: tr('brelocuri.statusFontSeIncarca') }] };
    }
    const r = construieste();
    const d = r.diagnostice;
    // O SINGURĂ piesă fizică, două culori: se randează ca două corpuri, dar rămâne un obiect
    // în listă și în scenă — exact cum se și printează.
    const objects: SceneObject[] = [
      { id: 'breloc', nume: tr('brelocuri.numeBreloc', { text: state.text }),
        geometry: G(r.corpIntreg), color: state.culoarePlacuta, movable: false, warn: d.bucati > 1,
        corpuri: [{ geometry: G(r.corpPlacuta), color: state.culoarePlacuta }, { geometry: G(r.corpLitera), color: state.culoareLitera }] },
    ];
    // MÂNERUL prinderii: singurul obiect mișcabil din scenă. Nu se exportă — vezi exportBodies.
    if (r.corpMarcaj) {
      objects.push({ id: 'prindere', nume: tr('brelocuri.numePrindere'), geometry: G(r.corpMarcaj),
        color: CULOARE_MARCAJ, movable: true, warn: d.gaura.pozitieRespinsa });
    }
    const f = (n: number, k = 1) => n.toLocaleString('en-US', { maximumFractionDigits: k });
    const status: StatusItem[] = [
      { key: 'placuta', text: tr('brelocuri.statusPlacuta', { w: f(d.dimPlacuta[0]), h: f(d.dimPlacuta[1]),
        gt: f(d.grosimeTotala), gp: f(state.grosimePlacuta), gl: f(state.reliefLitera) }) },
      { key: 'litera', text: tr('brelocuri.statusText', { w: f(d.dimLitera[0]), h: f(d.dimLitera[1]), inaltime: f(inaltimeLitera()) }) },
      { key: 'time', text: tr('brelocuri.statusTimp', { ms: f(r.ms, 0) }) },
    ];
    // GAURA: fără poziție validă nu se taie nimic — un breloc fără gaură se vede și se
    // repară dintr-un parametru, o gaură prin literă ar pleca așa la print.
    const g = d.gaura;
    if (!g.pozitie) {
      status.push({ key: 'gaura', text: g.pozitieRespinsa
        ? tr('brelocuri.statusPozitieRespinsa')
        : state.tipPrindere === 'gaura'
          ? tr('brelocuri.statusFaraGaura', { latime: f(g.latimeNecesara) })
          : tr('brelocuri.statusFaraLoc'), warn: true });
    } else {
      status.push({ key: 'gaura', text: tr('brelocuri.statusGaura', { d: f(state.diametruGaura), perete: f(g.perete, 2), litera: f(g.panaLaLitera, 2) }) });
      // verificările obligatorii, măsurate pe rezultat: dacă vreuna cade, se vede aici
      if (g.atingeLitera) status.push({ key: 'gauraLitera', text: tr('brelocuri.statusGauraAtinge'), warn: true });
      if (g.perete < 2) status.push({ key: 'gauraPerete', text: tr('brelocuri.statusPereteSubtire', { perete: f(g.perete, 2) }), warn: true });
      // secțiunea buclei — peretele singur nu spune destul, forța trece prin perete × grosime
      if (g.sectiuneMM2 < SECTIUNE_MIN) {
        status.push({ key: 'sectiune', text: tr('brelocuri.statusSectiuneMica', { s: f(g.sectiuneMM2, 1), prag: SECTIUNE_MIN }), warn: true });
      }
    }
    // Trăsături sub pragul printabil: nu e defect de geometrie, e o alegere de font prea
    // subțire pentru înălțimea cerută. Se spune, nu se blochează — fontul e al clientului.
    if (d.trasaturi.ariaMaxMM2 > PATA_MAX) {
      status.push({ key: 'subtire', text: tr('brelocuri.statusTrasaturaSubtire', { prag: f(TRASATURA_MIN, 2), arie: f(d.trasaturi.ariaMaxMM2, 1) }), warn: true });
    }
    // aceeași măsurătoare pe plăcuță: la ureche/inel, un gât prea subțire se rupe la prima cheie
    if (d.trasaturiPlacuta.ariaMaxMM2 > PATA_MAX) {
      status.push({ key: 'gat', text: tr('brelocuri.statusGatSubtire', { prag: f(TRASATURA_MIN, 2) }), warn: true });
    }
    // Plăcuța trebuie să lege totul într-o singură bucată. Mai multe bucăți = literă cu
    // accent sau punct pe care dilatarea nu l-a prins: din imprimantă ies piese separate.
    if (d.bucati > 1) status.push({ key: 'bucati', text: tr('brelocuri.statusBucati', { n: d.bucati }), warn: true });
    if (d.glifeLipsa.length) status.push({ key: 'glifa', text: tr('brelocuri.statusGlifaLipsa', { litere: d.glifeLipsa.join(' ') }), warn: true });
    return { objects, status };
  },

  // brelocul e o piesă fixă; se mută doar prinderea. (dx, dy) = axele planului plăcii,
  // care sunt chiar X și Y ale modelului (vezi pozitiaPrinderii).
  onMove(id, dx, dy) {
    if (id !== 'prindere') return;
    const [x, y] = pozitiaPrinderii();
    state.pozitiePrindere = [+(x + dx).toFixed(2), +(y + dy).toFixed(2)];
  },
  /**
   * Limitarea tragerii la pozițiile chiar valide. Nucleul folosește valoarea întoarsă și pentru
   * previzualizare, deci ce se vede în timpul tragerii E rezultatul — prinderea nu poate ajunge
   * peste literă nici măcar pentru o clipă.
   *
   * Când direcția cerută e blocată, se încearcă fiecare axă separat: altfel mânerul s-ar
   * împotmoli la marginea zonei în loc să alunece pe ea.
   */
  clampMove(id, dx, dy) {
    if (id !== 'prindere' || !last) return { dx, dy };
    const [x, y] = pozitiaPrinderii();
    const zona = last.zonaPrindere;
    // întâi direcția cerută, apoi fiecare axă separat — asta face alunecarea pe marginea zonei
    for (const [ax, ay] of [[dx, dy], [dx, 0], [0, dy]] as [number, number][]) {
      if ((ax || ay) && pozitieValida(zona, [x + ax, y + ay])) return { dx: ax, dy: ay };
    }
    // saltul e prea mare (mouse rapid): se merge cât se poate pe drumul cerut
    const p = pasValid(zona, [x, y], [x + dx, y + dy]);
    if (p) return { dx: p[0] - x, dy: p[1] - y };
    return { dx: 0, dy: 0, warn: tr('brelocuri.limitaTragere') };
  },
  getTransform(id) {
    if (id !== 'prindere' || !last?.diagnostice.gaura.pozitie) return null;
    const [x, y] = pozitiaPrinderii();
    // Y-ul modelului crește în jos; în bară se arată cu semnul pe care îl vede omul pe ecran
    return { pos: [x, -y, 0], rot: [0, 0, 0], scale: [100, 100, 100],
      canMove: true, canRotate: false, canScale: false, moveOnGround: true };
  },
  applyTransform(id, op) {
    if (id !== 'prindere' || op.kind !== 'move') return;
    const [x, y] = pozitiaPrinderii();
    const v = op.value ?? 0;
    const nou: [number, number] = op.axis === 'x'
      ? [op.mode === 'absolute' ? v : x + v, y]
      : op.axis === 'z' || op.axis === 'y'
        ? [x, op.mode === 'absolute' ? -v : y - v]
        : [x, y];
    // se merge spre valoarea cerută cât permite zona, nu „totul sau nimic"
    const p = pasValid(last!.zonaPrindere, [x, y], nou);
    if (p) state.pozitiePrindere = [+p[0].toFixed(2), +p[1].toFixed(2)];
  },
  resetRot() { /* prinderea nu se rotește */ },

  exportBodies(): ExportBody[] {
    if (!last) return [];
    const d = last.diagnostice;
    if (d.glifeLipsa.length) throw new Error(tr('brelocuri.blocatFaraGeometrie', { litere: d.glifeLipsa.join(' ') }));
    // `readable`: viewport-ul afișează modelul cu Y oglindit (fonturile vin cu y în jos).
    // Fără aceeași oglindire la export, fișierul ar ieși în oglindă față de ce s-a văzut.
    const readable = (m: any) => m.mirror([0, 1, 0]);
    // Două corpuri, ACELAȘI `grup`: e o singură piesă fizică, cu schimbare de culoare la
    // înălțimea plăcuței. Gruparea ține corpurile împreună la așezarea pe placă.
    const nume = `breloc_${slug(state.text)}`;
    const orientare = tr('brelocuri.orientarePrint');
    return [
      { name: `${nume}_1_placuta`, manifold: readable(last.corpPlacuta), culoare: state.culoarePlacuta, orientare, grup: nume },
      { name: `${nume}_2_litera`, manifold: readable(last.corpLitera), culoare: state.culoareLitera, orientare, grup: nume },
    ];
  },
  exportName() { return `breloc-${slug(state.text)}-${state.lungimePlacuta}mm`; },
  /** fișa de producție: brelocul NU se asamblează, deci nota spune ce se întâmplă la print */
  exportNotes() {
    const n = [tr('brelocuri.notaCuloare', { z: state.grosimePlacuta })];
    const g = last?.diagnostice.gaura;
    n.push(g?.pozitie
      ? tr('brelocuri.notaGaura', { d: state.diametruGaura, perete: g.perete.toFixed(1) })
      : tr('brelocuri.notaFaraGaura'));
    if ((last?.diagnostice.trasaturi.ariaMaxMM2 ?? 0) > PATA_MAX) n.push(tr('brelocuri.notaSubtire', { prag: TRASATURA_MIN }));
    return n;
  },

  objectInfo(id) {
    if (!last || id === 'prindere') return null;   // mânerul nu e produs, n-are fișă
    // lățime × înălțime × grosime, cum se măsoară brelocul în mână (nu axele lumii)
    const m = last.corpIntreg; const bb = m.boundingBox();
    return { nume: tr('brelocuri.numeBreloc', { text: state.text }),
      dimMM: [+(bb.max[0] - bb.min[0]).toFixed(1), +(bb.max[1] - bb.min[1]).toFixed(1), +(bb.max[2] - bb.min[2]).toFixed(1)],
      volumeMM3: +m.volume().toFixed(0), triangles: m.numTri() };
  },

  getPreset() { return { v: 1, stare: { ...state } }; },
  async loadPreset(p: any) {
    if (!p || p.v !== 1) throw new Error(tr('presets.formatNecunoscut'));
    Object.assign(state, p.stare);
    // preseturi salvate cât brelocul avea o singură literă și înălțime cerută direct:
    // se citesc mai departe, traduse în text + lungime, ca să nu se piardă ce a salvat omul
    const vechi = p.stare as { litera?: string; inaltimeLitera?: number };
    if (typeof vechi.litera === 'string' && p.stare.text === undefined) state.text = vechi.litera;
    if (typeof state.lungimePlacuta !== 'number') state.lungimePlacuta = 70;
    if (state.latura === undefined) state.latura = 'stanga';
    await loadFont(state.font).catch(() => { /* font indisponibil */ });
  },
  snapshot() { return { ...state }; },
  restore(s: any) { Object.assign(state, s); },
};

runApp(app);
