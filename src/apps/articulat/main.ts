/**
 * APP BRELOCURI ARTICULATE — implementeaza AppDefinition, ruleaza prin nucleu.
 * Litere-bloc pe segmente, legate prin balama print-in-place (ochi + ax). Vezi ./articulat.ts.
 */
import { t as tr } from '../../core/i18n/index.js';
import type { AppDefinition, PanelGroup, SceneObject, StatusItem, ExportBody } from '../../core/app.js';
import { runApp } from '../../core/ui/shell.js';
import { manifoldToGeometry, initManifold } from '../../core/geometry/manifold.js';
import { inArena, adunaHandle, elibereaza } from '../../core/geometry/arena.js';
import { configureManifold as configArticulat, buildArticulat, ALTO_MIN, type ArticulatResult } from './articulat.js';
import { loadFontManifest, loadFont, fontCached, fontGroups, previewURL, allFonts } from '../../core/assets/fonts.js';

interface State {
  text: string; font: string;
  inaltimeLitera: number; alturaLitera: number;
  alto: number; ancho: number; largo: number;
  linkPrim: boolean; linkUltim: boolean;
  culoareBaza: string; culoareLitera: string;
}

const state: State = {
  text: 'CLAUDIU', font: 'Baloo2-Regular.ttf',
  inaltimeLitera: 8, alturaLitera: 1,
  alto: 6, ancho: 12, largo: 15,
  linkPrim: true, linkUltim: false,
  culoareBaza: '#1D7400', culoareLitera: '#ffffff',
};

let ctx: { refresh(): void } | null = null;
let last: ArticulatResult | null = null;

const config = () => ({
  text: state.text.trim() || ' ', font: fontCached(state.font),
  inaltimeLitera: state.inaltimeLitera, alturaLitera: state.alturaLitera,
  alto: state.alto, ancho: state.ancho, largo: state.largo,
  linkPrim: state.linkPrim, linkUltim: state.linkUltim,
  culoareBaza: state.culoareBaza, culoareLitera: state.culoareLitera,
});

/** MEMORIA WASM — arena in jurul reconstructiei, ca peste tot. */
function construieste(): ArticulatResult {
  const r = inArena(() => buildArticulat(config()), (rez) => [...rez.blocuri, ...rez.litere]);
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

function fontControl() {
  const grupuri = fontGroups().map((g) => ({ categorie: g.categorie,
    items: g.items.map((f) => ({ value: f.fisier, label: f.familie, url: previewURL(f as any), missing: f.lipsaDiacritice })) }));
  return { kind: 'fontselect' as const, key: 'font', label: tr('articulat.font'), value: state.font, groups: grupuri };
}

const app: AppDefinition = {
  title: 'articulat',
  id: 'articulat',

  async init(c) {
    ctx = c as any;
    const mod = await initManifold();
    configArticulat(mod);
    await loadFontManifest();
    if (!allFonts().some((f) => f.fisier === state.font)) state.font = allFonts()[0]?.fisier ?? '';
    if (state.font) await loadFont(state.font).catch(() => { /* font indisponibil */ });
  },
  async reloadLibraries() { await loadFontManifest(); },

  panels(): PanelGroup[] {
    return [
      { title: tr('articulat.grupText'), controls: [
        { kind: 'text', key: 'text', label: tr('articulat.text'), value: state.text },
        fontControl(),
        { kind: 'number', key: 'inaltimeLitera', label: tr('articulat.inaltime'), min: 4, max: 16, step: 0.5, value: state.inaltimeLitera },
        { kind: 'number', key: 'alturaLitera', label: tr('articulat.altura'), min: -4, max: 5, step: 0.1, value: state.alturaLitera },
      ] },
      { title: tr('articulat.grupSegment'), controls: [
        { kind: 'number', key: 'alto', label: tr('articulat.alto'), min: ALTO_MIN, max: 12, step: 0.5, value: state.alto },
        { kind: 'number', key: 'ancho', label: tr('articulat.ancho'), min: 8, max: 20, step: 1, value: state.ancho },
        { kind: 'number', key: 'largo', label: tr('articulat.largo'), min: 10, max: 30, step: 1, value: state.largo },
      ] },
      { title: tr('articulat.grupCulori'), controls: [
        { kind: 'color', key: 'culoareBaza', label: tr('articulat.culoareBaza'), value: state.culoareBaza },
        { kind: 'color', key: 'culoareLitera', label: tr('articulat.culoareLitera'), value: state.culoareLitera },
      ] },
      { title: tr('articulat.grupBreloc'), controls: [
        { kind: 'checkbox', key: 'linkPrim', label: tr('articulat.linkPrim'), value: state.linkPrim },
        { kind: 'checkbox', key: 'linkUltim', label: tr('articulat.linkUltim'), value: state.linkUltim },
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
    // se afiseaza CULCAT pe placa, cu litera in sus (ca la print). manifoldToGeometry da (x,-y,z);
    // rotatia -90 pe X duce inaltimea (Z: segment->litera) pe verticala lumii (Y), iar lungimea
    // numelui in planul placii. Transform pe geometrie, nu pe manifold — fara temporare in arena.
    const geomC = (mm: any) => { const g = manifoldToGeometry(mm); g.rotateX(-Math.PI / 2); return g; };
    const f = (num: number) => num.toLocaleString('en-US', { maximumFractionDigits: 1 });
    const r = construieste();
    const d = r.diagnostice;
    const objects: SceneObject[] = [];
    r.blocuri.forEach((mm, i) => objects.push({ id: `seg${i}`, nume: tr('articulat.numeSegment', { i: i + 1 }), geometry: geomC(mm), color: state.culoareBaza, movable: false }));
    r.litere.forEach((mm, i) => objects.push({ id: `lit${i}`, nume: tr('articulat.numeLitera', { i: i + 1 }), geometry: geomC(mm), color: state.culoareLitera, movable: false }));
    const status: StatusItem[] = [
      { key: 'litere', text: tr('articulat.statusLitere', { n: String(d.litere), b: String(d.balamale) }) },
      { key: 'dim', text: tr('articulat.statusDim', { w: f(d.dimTotala[0]), h: f(d.dimTotala[1]), g: f(d.dimTotala[2]) }) },
      { key: 'joc', text: tr('articulat.statusJoc', { ax: f(2), joc: f(0.5) }) },
      { key: 'time', text: tr('articulat.statusTimp', { ms: f(r.ms) }) },
    ];
    if (d.gravat) status.push({ key: 'gravat', text: tr('articulat.statusGravat') });
    if (d.seLipesc) status.push({ key: 'lipit', text: tr('articulat.avertLipit'), warn: true });
    if (d.subMasa) status.push({ key: 'masa', text: tr('articulat.avertSubMasa'), warn: true });
    if (d.literaLata.length) status.push({ key: 'lata', text: tr('articulat.avertLata', { litere: d.literaLata.join(' ') }), warn: true });
    if (d.glifeLipsa.length) status.push({ key: 'glifa', text: tr('articulat.statusGlifa', { litere: d.glifeLipsa.join(' ') }), warn: true });
    return { objects, status };
  },

  onMove() { /* piese articulate, pozitia e fixa in scena */ },

  exportBodies(): ExportBody[] {
    if (!last) return [];
    const d = last.diagnostice;
    if (d.glifeLipsa.length) throw new Error(tr('articulat.blocatGlifa', { litere: d.glifeLipsa.join(' ') }));
    if (d.seLipesc) throw new Error(tr('articulat.blocatLipit'));
    const s = slug(state.text);
    const bodies: ExportBody[] = [];
    // `readable`: viewport-ul afișează cu Y oglindit (fonturile vin cu y în jos). Fără aceeași
    // oglindire la export, fișierul ar ieși cu literele cu capul în jos față de ce s-a văzut.
    const readable = (m: any) => m.mirror([0, 1, 0]);
    // lanțul e UN singur print (print-in-place): pozițiile absolute se păstrează, un grup comun.
    last.blocuri.forEach((mm, i) => bodies.push({ name: `segment_${s}_${i + 1}`, manifold: readable(mm), culoare: state.culoareBaza, orientare: tr('articulat.orientare'), grup: `breloc_${s}` }));
    last.litere.forEach((mm, i) => bodies.push({ name: `litera_${s}_${i + 1}`, manifold: readable(mm), culoare: state.culoareLitera, orientare: tr('articulat.orientare'), grup: `breloc_${s}` }));
    return bodies;
  },
  exportName() { return `breloc-articulat-${slug(state.text)}`; },
  exportNotes() {
    if (!last) return [];
    const note = [tr('articulat.notaPrint', { joc: '0.5' }), tr('articulat.notaBalamale', { n: String(last.diagnostice.balamale) })];
    if (!last.diagnostice.gravat && state.alturaLitera > 0) note.push(tr('articulat.notaFilament'));
    return note;
  },

  objectInfo(id) {
    if (!last || !id) return null;
    const m = id.startsWith('lit') ? last.litere[Number(id.slice(3))] : id.startsWith('seg') ? last.blocuri[Number(id.slice(3))] : null;
    if (!m) return null;
    const bb = m.boundingBox();
    return { nume: id, dimMM: [+(bb.max[0] - bb.min[0]).toFixed(1), +(bb.max[1] - bb.min[1]).toFixed(1), +(bb.max[2] - bb.min[2]).toFixed(1)],
      volumeMM3: +m.volume().toFixed(0), triangles: m.numTri() as number };
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
