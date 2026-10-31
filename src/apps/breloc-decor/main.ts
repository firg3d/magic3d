/**
 * APP BRELOC DECOR — implementează AppDefinition și rulează prin nucleu (runApp).
 * Nu cablează nimic imperativ din nucleu: declară controale, construiește geometrie.
 * Nu importă NIMIC din alte aplicații (izolare); solidul din font și registrul de fonturi
 * vin din core/.
 */
import { t as tr } from '../../core/i18n/index.js';
import type { AppDefinition, PanelControl, PanelGroup, SceneObject, StatusItem, ExportBody } from '../../core/app.js';
import { runApp } from '../../core/ui/shell.js';
import { manifoldToGeometry, initManifold } from '../../core/geometry/manifold.js';
import { configureManifold as configDecor, buildDecor, initialaDin, inaltimeNume,
  FUND_MIN, SECTIUNE_MIN, PATA_MAX, TRASATURA_MIN, type DecorResult, type PozitieInel } from './decor.js';
import { loadFontManifest, loadFont, fontCached, fontGroups, previewURL, allFonts } from '../../core/assets/fonts.js';

interface State {
  nume: string; initialaManuala: string | null;
  fontBaza: string; fontNume: string;
  inaltimeBaza: number; latimeRama: number; grosimeBaza: number; adancimeRama: number;
  marimeNume: number; offsetNume: number; umpleGauri: boolean;
  unghi: number; offX: number; offY: number;
  grosimeNume: number; iesireMiez: number; adancimeInlay: number; joc: number; bazaUrmeazaNumele: boolean;
  inel: boolean; pozitieInel: PozitieInel; inelX: number; inelY: number;
  diametruInel: number; gauraInel: number; grosimeInel: number;
  culoareBaza: string; culoareFundal: string; culoareMiez: string;
}
const state: State = {
  nume: 'Laura', initialaManuala: null,
  fontBaza: 'PlayfairDisplay-Regular.ttf', fontNume: 'Pacifico-Regular.ttf',
  inaltimeBaza: 45, latimeRama: 2, grosimeBaza: 5, adancimeRama: 1.5,
  marimeNume: 1, offsetNume: 2, umpleGauri: true,
  unghi: 10, offX: 0, offY: 2,
  grosimeNume: 3.5, iesireMiez: 0.7, adancimeInlay: 1.5, joc: 0.25, bazaUrmeazaNumele: true,
  inel: true, pozitieInel: 'centru', inelX: 0, inelY: 0,
  diametruInel: 7, gauraInel: 3.8, grosimeInel: 3.5,
  culoareBaza: '#B2DFDB', culoareFundal: '#FFFFFF', culoareMiez: '#5D6270',
};

let ctx: { refresh(): void } | null = null;
let last: DecorResult | null = null;
const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]/g, '') || 'x';
const initiala = () => state.initialaManuala || initialaDin(state.nume);
const fontGata = () => !!fontCached(state.fontBaza) && !!fontCached(state.fontNume);
/** fundul locașului, în coordonatele modelului — acolo se așază inserția la previzualizare */
const zLocas = () => state.grosimeBaza - state.adancimeRama - state.adancimeInlay;

/** brelocul stă CULCAT: grosimea pe verticala lumii, amprenta în planul plăcii */
const G = (m: any) => { const g = manifoldToGeometry(m); g.rotateX(-Math.PI / 2); return g; };

const config = () => ({
  initiala: initiala(), fontBaza: fontCached(state.fontBaza),
  inaltimeBaza: state.inaltimeBaza, latimeRama: state.latimeRama,
  grosimeBaza: state.grosimeBaza, adancimeRama: state.adancimeRama,
  nume: state.nume, fontNume: fontCached(state.fontNume), marimeNume: state.marimeNume,
  offsetNume: state.offsetNume, umpleGauri: state.umpleGauri,
  unghi: state.unghi, offX: state.offX, offY: state.offY,
  grosimeNume: state.grosimeNume, iesireMiez: state.iesireMiez,
  adancimeInlay: state.adancimeInlay, joc: state.joc, bazaUrmeazaNumele: state.bazaUrmeazaNumele,
  inel: state.inel, pozitieInel: state.pozitieInel, inelX: state.inelX, inelY: state.inelY,
  diametruInel: state.diametruInel, gauraInel: state.gauraInel, grosimeInel: state.grosimeInel,
});

function fontControl(key: 'fontBaza' | 'fontNume'): PanelControl {
  return { kind: 'fontselect', key, label: tr('decor.font'), value: state[key],
    groups: fontGroups().map((g) => ({ categorie: g.categorie,
      items: g.items.map((f) => ({ value: f.fisier, label: f.familie, url: previewURL(f), missing: f.lipsaDiacritice })) })) };
}

const app: AppDefinition = {
  title: 'breloc-decor',
  id: 'breloc-decor',

  async init(c) {
    ctx = c;
    configDecor(await initManifold());
    await loadFontManifest();
    const alege = (dorit: string, categorie: string) =>
      allFonts().some((f) => f.fisier === dorit) ? dorit
        : (fontGroups().find((g) => g.categorie === categorie)?.items[0] ?? allFonts()[0])?.fisier ?? '';
    state.fontBaza = alege(state.fontBaza, 'Serif display');
    state.fontNume = alege(state.fontNume, 'Cursiv');
    for (const f of [state.fontBaza, state.fontNume]) if (f) await loadFont(f).catch(() => { /* indisponibil */ });
  },
  async reloadLibraries() { await loadFontManifest(); },

  panels(): PanelGroup[] {
    return [
      { title: tr('decor.grupNume'), controls: [
        { kind: 'text', key: 'nume', label: tr('decor.nume'), value: state.nume },
        fontControl('fontNume'),
        { kind: 'number', key: 'marimeNume', label: tr('decor.marime'), min: 0.4, max: 2.5, step: 0.05, value: state.marimeNume },
        { kind: 'note', key: 'notaH', label: tr('decor.inaltimeScris'), value: tr('decor.mm', { v: inaltimeNume(state.inaltimeBaza, state.marimeNume).toFixed(1) }) },
        { kind: 'number', key: 'offsetNume', label: tr('decor.offsetNume'), min: 0.5, max: 6, step: 0.1, value: state.offsetNume },
        { kind: 'checkbox', key: 'umpleGauri', label: tr('decor.umpleGauri'), value: state.umpleGauri },
        { kind: 'number', key: 'unghi', label: tr('decor.unghi'), min: -30, max: 30, step: 1, value: state.unghi },
        { kind: 'color', key: 'culoareFundal', label: tr('decor.culoareFundal'), value: state.culoareFundal },
        { kind: 'color', key: 'culoareMiez', label: tr('decor.culoareMiez'), value: state.culoareMiez },
      ] },
      { title: tr('decor.grupBaza'), controls: [
        { kind: 'text', key: 'initialaManuala', label: tr('decor.initiala'), value: initiala() },
        fontControl('fontBaza'),
        { kind: 'number', key: 'inaltimeBaza', label: tr('decor.inaltimeBaza'), min: 25, max: 90, step: 1, value: state.inaltimeBaza },
        { kind: 'number', key: 'latimeRama', label: tr('decor.latimeRama'), min: 0.5, max: 8, step: 0.5, value: state.latimeRama },
        { kind: 'number', key: 'grosimeBaza', label: tr('decor.grosimeBaza'), min: 3, max: 12, step: 0.5, value: state.grosimeBaza },
        { kind: 'number', key: 'adancimeRama', label: tr('decor.adancimeRama'), min: 0.5, max: 5, step: 0.5, value: state.adancimeRama },
        { kind: 'color', key: 'culoareBaza', label: tr('decor.culoareBaza'), value: state.culoareBaza },
      ] },
      { title: tr('decor.grupMontaj'), controls: [
        { kind: 'number', key: 'grosimeNume', label: tr('decor.grosimeNume'), min: 1.5, max: 8, step: 0.5, value: state.grosimeNume },
        { kind: 'number', key: 'iesireMiez', label: tr('decor.iesireMiez'), min: 0, max: 3, step: 0.1, value: state.iesireMiez },
        { kind: 'number', key: 'adancimeInlay', label: tr('decor.adancimeInlay'), min: 0.5, max: 5, step: 0.5, value: state.adancimeInlay },
        { kind: 'number', key: 'joc', label: tr('decor.joc'), min: 0, max: 0.6, step: 0.05, value: state.joc },
        { kind: 'checkbox', key: 'bazaUrmeazaNumele', label: tr('decor.bazaUrmeaza'), value: state.bazaUrmeazaNumele },
      ] },
      { title: tr('decor.grupInel'), controls: [
        { kind: 'checkbox', key: 'inel', label: tr('decor.inelActiv'), value: state.inel },
        { kind: 'select', key: 'pozitieInel', label: tr('decor.pozitieInel'), value: state.pozitieInel, options: [
          { value: 'stanga', label: tr('decor.inelStanga') },
          { value: 'centru', label: tr('decor.inelCentru') },
          { value: 'dreapta', label: tr('decor.inelDreapta') },
        ] },
        { kind: 'number', key: 'inelX', label: tr('decor.inelX'), min: -30, max: 30, step: 0.5, value: state.inelX },
        { kind: 'number', key: 'inelY', label: tr('decor.inelY'), min: -10, max: 10, step: 0.5, value: state.inelY },
        { kind: 'number', key: 'diametruInel', label: tr('decor.diametruInel'), min: 4, max: 16, step: 0.5, value: state.diametruInel },
        { kind: 'number', key: 'gauraInel', label: tr('decor.gauraInel'), min: 2, max: 10, step: 0.2, value: state.gauraInel },
        { kind: 'number', key: 'grosimeInel', label: tr('decor.grosimeInel'), min: 1.5, max: 8, step: 0.5, value: state.grosimeInel },
      ] },
    ];
  },

  onControl(key, value) {
    if (key === 'initialaManuala') {
      // gol => revine la prima literă a numelui; scris de mână => rămâne ce a ales omul
      const v = String(value).trim();
      state.initialaManuala = v ? [...v][0].toLocaleUpperCase('ro-RO') : null;
      return;
    }
    if (key === 'fontBaza' || key === 'fontNume') {
      (state as any)[key] = value;
      if (!fontCached(value as string)) loadFont(value as string).then(() => ctx?.refresh()).catch(() => { /* indisponibil */ });
      return;
    }
    (state as any)[key] = value;
  },

  rebuild() {
    // fonturile se încarcă leneș: cât nu sunt gata, se păstrează modelul de dinainte
    if (!fontGata()) return { objects: [], status: [{ key: 'font', text: tr('decor.statusFont') }] };
    const r = buildDecor(config()); last = r;
    const d = r.diagnostice;
    const zl = zLocas();
    const objects: SceneObject[] = [
      { id: 'baza', nume: tr('decor.numeBaza', { litera: initiala() }), geometry: G(r.corpBaza), color: state.culoareBaza, movable: false },
      // inserția se ARATĂ montată (ridicată la fundul locașului), dar se EXPORTĂ culcată la zero
      { id: 'nume', nume: tr('decor.numeInsertie', { nume: state.nume }),
        geometry: G(r.corpFundal.translate([0, 0, zl])), color: state.culoareFundal, movable: true,
        warn: d.numeInAfaraMM2 > 1 || d.bucatiNume > 1,
        corpuri: [{ geometry: G(r.corpFundal.translate([0, 0, zl])), color: state.culoareFundal },
                  { geometry: G(r.corpMiez.translate([0, 0, zl])), color: state.culoareMiez }] },
    ];
    const f = (n: number, k = 1) => n.toLocaleString('en-US', { maximumFractionDigits: k });
    const status: StatusItem[] = [
      { key: 'baza', text: tr('decor.statusBaza', { w: f(d.dimBaza[0]), h: f(d.dimBaza[1]), g: f(state.grosimeBaza) }) },
      { key: 'nume', text: tr('decor.statusNume', { w: f(d.dimNume[0]), h: f(d.dimNume[1]), joc: f(d.joc, 2) }) },
      { key: 'time', text: tr('decor.statusTimp', { ms: f(r.ms, 0) }) },
    ];
    // fundul locașului: sub el trebuie să rămână material, altfel baza e o ramă găurită
    if (d.fundRamas < FUND_MIN) status.push({ key: 'fund', text: tr('decor.statusFundSubtire', { mm: f(d.fundRamas, 2), prag: FUND_MIN }), warn: true });
    if (d.numeInAfaraMM2 > 1) status.push({ key: 'afara', text: tr('decor.statusNumeInAfara', { arie: f(d.numeInAfaraMM2, 0) }), warn: true });
    if (d.bucatiNume > 1) status.push({ key: 'bucati', text: tr('decor.statusBucati', { n: d.bucatiNume }), warn: true });
    if (d.inel) {
      status.push({ key: 'inel', text: tr('decor.statusInel', { perete: f(d.inel.perete, 2), s: f(d.inel.sectiuneMM2, 1) }) });
      if (d.inel.sectiuneMM2 < SECTIUNE_MIN) status.push({ key: 'sect', text: tr('decor.statusInelSubtire', { s: f(d.inel.sectiuneMM2, 1), prag: SECTIUNE_MIN }), warn: true });
    }
    if (d.trasaturiNume.ariaMaxMM2 > PATA_MAX) status.push({ key: 'subtire', text: tr('decor.statusTrasaturi', { prag: f(TRASATURA_MIN, 2), arie: f(d.trasaturiNume.ariaMaxMM2, 1) }), warn: true });
    if (d.glifeLipsa.length) status.push({ key: 'glife', text: tr('decor.statusGlife', { litere: d.glifeLipsa.join(' ') }), warn: true });
    return { objects, status };
  },

  // inserția se trage în planul plăcii; world X -> model X, world Z -> model Y
  onMove(id, dx, dy) { if (id === 'nume') { state.offX = +(state.offX + dx).toFixed(2); state.offY = +(state.offY + dy).toFixed(2); } },
  onRotate(id, delta) { if (id === 'nume') state.unghi = +(state.unghi - delta).toFixed(1); },
  getTransform(id) {
    if (id !== 'nume') return null;
    return { pos: [state.offX, -state.offY, 0], rot: [0, 0, state.unghi], scale: [100, 100, 100],
      canMove: true, canRotate: true, canScale: false, moveOnGround: true, rotAxes: ['y'] };
  },
  resetRot(id) { if (id === 'nume') state.unghi = 0; },
  align(id, how) {
    if (id !== 'nume') return;
    if (how === 'centerX' || how === 'centerXY') state.offX = 0;
    if (how === 'centerY' || how === 'centerXY') state.offY = 0;
  },

  exportBodies(): ExportBody[] {
    if (!last) return [];
    const d = last.diagnostice;
    if (d.glifeLipsa.length) throw new Error(tr('decor.blocatGlife', { litere: d.glifeLipsa.join(' ') }));
    if (d.fundRamas <= 0) throw new Error(tr('decor.blocatFund'));
    // viewport-ul afișează modelul cu Y oglindit; fără aceeași oglindire, fișierul ar ieși invers
    const readable = (m: any) => m.mirror([0, 1, 0]);
    const nume = `decor_${slug(state.nume)}`;
    return [
      { name: `${nume}_baza_${slug(initiala())}`, manifold: readable(last.corpBaza), culoare: state.culoareBaza, orientare: tr('decor.orientareBaza') },
      { name: `${nume}_1_fundal`, manifold: readable(last.corpFundal), culoare: state.culoareFundal, orientare: tr('decor.orientareNume'), grup: nume },
      { name: `${nume}_2_miez`, manifold: readable(last.corpMiez), culoare: state.culoareMiez, orientare: tr('decor.orientareNume'), grup: nume },
    ];
  },
  exportName() { return `breloc-decor-${slug(state.nume)}-${state.inaltimeBaza}mm`; },
  exportNotes() {
    return [
      tr('decor.notaMontaj', { joc: state.joc, ad: state.adancimeInlay }),
      tr('decor.notaCuloare'),
      state.inel ? tr('decor.notaInel', { d: state.gauraInel }) : tr('decor.notaFaraInel'),
    ];
  },

  objectInfo(id) {
    if (!last) return null;
    const m = id === 'nume' ? last.corpFundal : last.corpBaza;
    const bb = m.boundingBox();
    return { nume: id === 'nume' ? tr('decor.numeInsertie', { nume: state.nume }) : tr('decor.numeBaza', { litera: initiala() }),
      dimMM: [+(bb.max[0] - bb.min[0]).toFixed(1), +(bb.max[1] - bb.min[1]).toFixed(1), +(bb.max[2] - bb.min[2]).toFixed(1)],
      volumeMM3: +m.volume().toFixed(0), triangles: m.numTri() };
  },

  getPreset() { return { v: 1, stare: { ...state } }; },
  async loadPreset(p: any) {
    if (!p || p.v !== 1) throw new Error(tr('presets.formatNecunoscut'));
    Object.assign(state, p.stare);
    await Promise.all([state.fontBaza, state.fontNume].map((f) => loadFont(f).catch(() => { /* indisponibil */ })));
  },
  snapshot() { return { ...state }; },
  restore(s: any) { Object.assign(state, s); },
};

runApp(app);
