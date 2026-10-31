/**
 * APP PLĂCUȚE & ETICHETE — implementează AppDefinition, rulează prin nucleu.
 * Nu importă din alte aplicații (izolare). Geometria vine din ./placute.js.
 */
import { t as tr } from '../../core/i18n/index.js';
import type { AppDefinition, PanelGroup, SceneObject, StatusItem, ExportBody } from '../../core/app.js';
import { runApp } from '../../core/ui/shell.js';
import { manifoldToGeometry, initManifold } from '../../core/geometry/manifold.js';
import { inArena, adunaHandle, elibereaza } from '../../core/geometry/arena.js';
import { configureManifold as configPlacute, buildPlacuta, type Prindere, type PlacutaResult }
  from './placute.js';
import { loadFontManifest, loadFont, fontCached, fontGroups, previewURL, allFonts } from '../../core/assets/fonts.js';

interface State {
  text: string; font: string;
  inaltimeText: number; reliefText: number; latimePlacuta: number; netezire: number;
  grosimePlacuta: number; prindere: Prindere; diametruGaura: number; lungimeTerus: number;
  culoarePlacuta: string; culoareText: string;
}

const state: State = {
  text: 'Ana', font: 'Baloo2-Regular.ttf',
  inaltimeText: 24, reliefText: 1.8, latimePlacuta: 7, netezire: 2,
  grosimePlacuta: 3, prindere: 'terus', diametruGaura: 4, lungimeTerus: 45,
  culoarePlacuta: '#5b4dd1', culoareText: '#ffffff',
};

let ctx: { refresh(): void; placa(): { w: number; d: number } } | null = null;
let last: PlacutaResult | null = null;

/** MEMORIA WASM — arenă în jurul reconstrucției, ca peste tot. Vezi core/geometry/arena.ts. */
function construieste(): PlacutaResult {
  const r = inArena(() => buildPlacuta(config()), (rez) => [rez]);
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
const config = () => ({ ...state, text: state.text.trim() || ' ', font: fontCached(state.font) });

/** traduce codul de avertisment emis de geometrie (`tip:arg:arg`) în text pentru interfață */
function avertText(cod: string): string {
  if (!cod) return '';
  const [tip, a, b] = cod.split(':');
  if (tip === 'perete') return tr('placute.avertPerete', { mm: a, min: b });
  if (tip === 'terusIngust') return tr('placute.avertTerus', { mm: a, min: b });
  if (tip === 'magnetSubtire') return tr('placute.avertMagnet', { mm: a });
  return cod;
}

function fontControl() {
  const grupuri = fontGroups().map((g) => ({ categorie: g.categorie,
    items: g.items.map((f) => ({ value: f.fisier, label: f.familie, url: previewURL(f as any), missing: f.lipsaDiacritice })) }));
  return { kind: 'fontselect' as const, key: 'font', label: tr('placute.font'), value: state.font, groups: grupuri };
}

const app: AppDefinition = {
  title: 'placute',
  id: 'placute',

  async init(c) {
    ctx = c as any;
    configPlacute(await initManifold());
    await loadFontManifest();
    if (!allFonts().some((f) => f.fisier === state.font)) state.font = allFonts()[0]?.fisier ?? '';
    if (state.font) await loadFont(state.font).catch(() => { /* font indisponibil */ });
  },
  async reloadLibraries() { await loadFontManifest(); },

  panels(): PanelGroup[] {
    const prinderi = [
      { value: 'terus', label: tr('placute.prindTerus') },
      { value: 'pahar', label: tr('placute.prindPahar') },
      { value: 'magnet', label: tr('placute.prindMagnet') },
    ];
    const grupPrindere: PanelGroup = { title: tr('placute.grupPrindere'), controls: [
      { kind: 'select', key: 'prindere', label: tr('placute.prindere'), value: state.prindere, options: prinderi },
      // dimensiunea prinderii: gaură/fantă/Ø magnet — aceeași manetă, etichetă după caz
      { kind: 'number', key: 'diametruGaura', label: tr(state.prindere === 'magnet' ? 'placute.diamMagnet' : 'placute.diamGaura'),
        min: state.prindere === 'magnet' ? 4 : 2, max: state.prindere === 'magnet' ? 20 : 12, step: 0.5, value: state.diametruGaura },
      // lungimea țărușului apare DOAR la tăbliță de plantă — altfel n-are ce controla
      ...(state.prindere === 'terus'
        ? [{ kind: 'number' as const, key: 'lungimeTerus', label: tr('placute.lungimeTerus'), min: 15, max: 90, step: 1, value: state.lungimeTerus }]
        : []),
    ] };
    return [
      { title: tr('placute.grupText'), controls: [
        { kind: 'text', key: 'text', label: tr('placute.text'), value: state.text },
        fontControl(),
        { kind: 'number', key: 'inaltimeText', label: tr('placute.inaltime'), min: 8, max: 60, step: 1, value: state.inaltimeText },
        { kind: 'number', key: 'reliefText', label: tr('placute.relief'), min: 0, max: 6, step: 0.2, value: state.reliefText },
        { kind: 'color', key: 'culoareText', label: tr('placute.culoareText'), value: state.culoareText },
      ] },
      { title: tr('placute.grupPlacuta'), controls: [
        { kind: 'number', key: 'latimePlacuta', label: tr('placute.latime'), min: 2, max: 20, step: 0.5, value: state.latimePlacuta },
        { kind: 'number', key: 'grosimePlacuta', label: tr('placute.grosime'), min: 2, max: 8, step: 0.5, value: state.grosimePlacuta },
        { kind: 'number', key: 'netezire', label: tr('placute.netezire'), min: 0, max: 6, step: 0.5, value: state.netezire },
        { kind: 'color', key: 'culoarePlacuta', label: tr('placute.culoarePlacuta'), value: state.culoarePlacuta },
      ] },
      grupPrindere,
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
    // plăcuța se așază CULCATĂ pe placă, fața (textul) în sus: rotim -90° pe X ca grosimea (Z)
    // să devină verticală. Extrudarea pornește de la Z=0, deci baza cade exact pe y=0 (nu trece prin placă).
    const geom = (m: any) => { const g = manifoldToGeometry(m); g.rotateX(-Math.PI / 2); return g; };
    const objects: SceneObject[] = [
      { id: 'placuta', nume: tr('placute.numePlacuta', { text: state.text }),
        geometry: geom(r.corpPlacuta), color: state.culoarePlacuta, movable: false },
      ...(r.corpText ? [{ id: 'text', nume: tr('placute.numeText', { text: state.text }),
        geometry: geom(r.corpText), color: state.culoareText, movable: false }] : []),
    ];
    const f = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 1 });
    const status: StatusItem[] = [
      { key: 'dim', text: tr('placute.statusDim', { w: f(d.dimPlacuta[0]), h: f(d.dimPlacuta[1]), g: f(d.grosimeTotala) }) },
      { key: 'prind', text: tr('placute.statusPrindere', { prindere: tr('placute.prind' + d.prindere[0].toUpperCase() + d.prindere.slice(1)) }) },
      { key: 'time', text: tr('placute.statusTimp', { ms: f(r.ms) }) },
    ];
    if (d.avert) status.push({ key: 'avert', text: avertText(d.avert), warn: true });
    if (d.glifeLipsa.length) status.push({ key: 'glifa', text: tr('placute.statusGlifa', { litere: d.glifeLipsa.join(' ') }), warn: true });
    return { objects, status };
  },

  onMove() { /* piesă unică, nu se mută */ },

  exportBodies(): ExportBody[] {
    if (!last) return [];
    if (last.diagnostice.glifeLipsa.length) throw new Error(tr('placute.blocatGlifa', { litere: last.diagnostice.glifeLipsa.join(' ') }));
    const bodies: ExportBody[] = [
      { name: `placuta_${slug(state.text)}`, manifold: last.corpPlacuta, culoare: state.culoarePlacuta,
        orientare: tr('placute.orientarePlacuta') },
    ];
    if (last.corpText) bodies.push({ name: `text_${slug(state.text)}`, manifold: last.corpText,
      culoare: state.culoareText, orientare: tr('placute.orientareText'), grup: `placuta_${slug(state.text)}` });
    return bodies;
  },
  exportName() { return `placuta-${slug(state.text)}-${state.prindere}`; },
  exportNotes() {
    if (!last) return [];
    const n = [tr('placute.notaPrindere', { prindere: tr('placute.prind' + state.prindere[0].toUpperCase() + state.prindere.slice(1)) })];
    if (last.diagnostice.avert) n.push(avertText(last.diagnostice.avert));
    return n;
  },

  objectInfo(id) {
    if (!last) return null;
    const m = id === 'text' ? last.corpText : last.corpPlacuta;
    if (!m) return null;
    const bb = m.boundingBox();
    return { nume: id === 'text' ? tr('placute.numeText', { text: state.text }) : tr('placute.numePlacuta', { text: state.text }),
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
