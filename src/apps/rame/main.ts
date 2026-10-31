/**
 * APP RAME TEMATICE — implementează AppDefinition și rulează prin nucleu (runApp).
 * Nu importă NIMIC din alte aplicații (izolare); geometria vine din `apps/rame/rame.ts`, iar
 * bucățile împărțite cu Nume 3D și Cuvinte Decor din `core/geometry/`.
 */
import { t as tr } from '../../core/i18n/index.js';
import type { AppDefinition, PanelGroup, SceneObject, StatusItem, ExportBody } from '../../core/app.js';
import { runApp } from '../../core/ui/shell.js';
import { manifoldToGeometry, initManifold } from '../../core/geometry/manifold.js';
import { inArena, adunaHandle, elibereaza } from '../../core/geometry/arena.js';
import { configureManifold as configRame, buildRama, pentruPrint, TIPURI_RAMA, UNGHI_MIN,
  RAZA_MIN, RAZA_MAX, FIR_MIN, FIR_MAX, INFIGERE_MIN, INFIGERE_MAX,
  type RameResult, type TipRama } from './rame.js';
import { loadFontManifest, loadFont, fontCached, fontGroups, previewURL, allFonts } from '../../core/assets/fonts.js';

interface State {
  text: string; font: string;
  tip: TipRama; raza: number; grosimeFir: number; colturi: number; inele: number; lasare: number;
  grosimeRama: number; culoareRama: string;
  inaltimeText: number; grosimeText: number; culoareText: string;
  latimeAura: number; netezireAura: number; culoareAura: string;
  adancimeGravura: number; jocGravura: number;
  lungimeBaza: number; latimeBaza: number; inaltimeBaza: number;
  adancimeInfigere: number; jocInfigere: number; latimePicior: number; inaltimePicior: number;
  culoareBaza: string;
}

const state: State = {
  text: 'Maria',
  // cursiv din start: la fonturile drepte literele nu se ating, iar plăcuța ar ieși în bucăți
  font: 'GreatVibes-Regular.ttf',
  tip: 'panza',
  // 50, nu 80: măsurat, la R=80 ansamblul se răstoarnă la 21°, iar la 50 la 41° — de două ori
  // mai stabil, pe aceeași bază
  raza: 50,
  grosimeFir: 3,
  colturi: 12,
  inele: 4,
  // fără lăsare ies arce de cerc, adică o roată de bicicletă; 0.18 dă firele care atârnă
  lasare: 0.18,
  grosimeRama: 6,
  culoareRama: '#3A3A3C',
  inaltimeText: 22,
  grosimeText: 5,
  culoareText: '#C9A227',
  latimeAura: 2.5,
  netezireAura: 2,
  culoareAura: '#1C1C1E',
  // 0.8 mm: destul cât să se vadă și să țină adezivul, prea puțin cât să slăbească firul de 3 mm
  adancimeGravura: 0.8,
  jocGravura: 0.3,
  lungimeBaza: 120,
  latimeBaza: 30,
  inaltimeBaza: 12,
  adancimeInfigere: 6,
  jocInfigere: 0.2,
  // 25 mm de picior: masurat, fara el rama intra in baza cu o singura limba de 64 mm2 (steaua
  // 28), adica se rupe din lipitura la prima atingere
  latimePicior: 25,
  inaltimePicior: 3,
  culoareBaza: '#3A3A3C',
};

let ctx: { refresh(): void; placa(): { w: number; d: number } } | null = null;
let last: RameResult | null = null;

/** memoria WASM: obiectele manifold se eliberează numai explicit — vezi core/geometry/arena.ts */
function construieste(): RameResult {
  const r = inArena(() => buildRama(config()), (rez) => [rez]);
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

const config = () => ({
  text: state.text.trim() || ' ', font: fontCached(state.font),
  rama: { tip: state.tip, raza: state.raza, grosimeFir: state.grosimeFir,
    colturi: state.colturi, inele: state.inele, lasare: state.lasare },
  grosimeRama: state.grosimeRama,
  inaltimeText: state.inaltimeText, grosimeText: state.grosimeText,
  latimeAura: state.latimeAura, netezireAura: state.netezireAura,
  adancimeGravura: state.adancimeGravura, jocGravura: state.jocGravura,
  lungimeBaza: state.lungimeBaza, latimeBaza: state.latimeBaza, inaltimeBaza: state.inaltimeBaza,
  adancimeInfigere: state.adancimeInfigere, jocInfigere: state.jocInfigere,
  latimePicior: state.latimePicior, inaltimePicior: state.inaltimePicior,
  placa: ctx?.placa() ?? { w: 256, d: 256 },
});

function fontControl() {
  const item = (f: { fisier: string; familie: string; lipsaDiacritice: string[] }) =>
    ({ value: f.fisier, label: f.familie, url: previewURL(f as any), missing: f.lipsaDiacritice });
  return { kind: 'fontselect' as const, key: 'font', label: tr('rame.font'), value: state.font,
    groups: fontGroups().map((g) => ({ categorie: g.categorie, items: g.items.map(item) })) };
}

const app: AppDefinition = {
  title: 'rame',
  id: 'rame',

  async init(c) {
    ctx = c as any;
    configRame(await initManifold());
    await loadFontManifest();
    if (!allFonts().some((f) => f.fisier === state.font)) {
      state.font = (fontGroups().find((g) => g.categorie === 'Cursiv')?.items[0] ?? allFonts()[0])?.fisier ?? '';
    }
    if (state.font) await loadFont(state.font).catch(() => { /* font indisponibil */ });
  },

  async reloadLibraries() { await loadFontManifest(); },

  panels(): PanelGroup[] {
    const d = last?.diagnostice ?? null;
    return [
      { title: tr('rame.grupRama'), controls: [
        { kind: 'select', key: 'tip', label: tr('rame.tip'), value: state.tip,
          options: TIPURI_RAMA.map((v) => ({ value: v, label: tr(`rame.tip_${v}`) })) },
        { kind: 'number', key: 'raza', label: tr('rame.raza'), min: RAZA_MIN, max: RAZA_MAX, step: 5, value: state.raza },
        { kind: 'number', key: 'grosimeFir', label: tr('rame.grosimeFir'), min: FIR_MIN, max: FIR_MAX, step: 0.5, value: state.grosimeFir },
        { kind: 'number', key: 'colturi', label: tr('rame.colturi'), min: 6, max: 24, step: 1, value: state.colturi },
        { kind: 'number', key: 'inele', label: tr('rame.inele'), min: 1, max: 8, step: 1, value: state.inele },
        ...(state.tip === 'panza' ? [{ kind: 'number' as const, key: 'lasare', label: tr('rame.lasare'), min: 0, max: 0.4, step: 0.02, value: state.lasare }] : []),
        { kind: 'number', key: 'grosimeRama', label: tr('rame.grosimeRama'), min: 3, max: 12, step: 0.5, value: state.grosimeRama },
        { kind: 'color', key: 'culoareRama', label: tr('rame.culoare'), value: state.culoareRama },
        ...(d ? [{ kind: 'note' as const, key: 'notaRama', label: tr('rame.notaRamaEticheta'),
          value: tr(d.ariaFirSubtireMM2 > 1 ? 'rame.notaRamaSubtire' : 'rame.notaRamaCalcul',
            { fir: state.grosimeFir, gros: state.grosimeRama, bucati: d.bucatiRama, arie: d.ariaFirSubtireMM2 }) }] : []),
      ] },
      { title: tr('rame.grupNume'), controls: [
        { kind: 'text', key: 'text', label: tr('rame.text'), value: state.text },
        fontControl(),
        { kind: 'number', key: 'inaltimeText', label: tr('rame.inaltimeText'), min: 8, max: 60, step: 1, value: state.inaltimeText },
        { kind: 'number', key: 'grosimeText', label: tr('rame.grosimeText'), min: 2, max: 15, step: 0.5, value: state.grosimeText },
        { kind: 'color', key: 'culoareText', label: tr('rame.culoare'), value: state.culoareText },
        { kind: 'number', key: 'latimeAura', label: tr('rame.latimeAura'), min: 0, max: 8, step: 0.5, value: state.latimeAura },
        ...(state.latimeAura > 0 ? [
          { kind: 'number' as const, key: 'netezireAura', label: tr('rame.netezireAura'), min: 0, max: 6, step: 0.5, value: state.netezireAura },
          { kind: 'color' as const, key: 'culoareAura', label: tr('rame.culoareAura'), value: state.culoareAura },
        ] : []),
      ] },
      { title: tr('rame.grupGravura'), controls: [
        { kind: 'number', key: 'adancimeGravura', label: tr('rame.adancimeGravura'), min: 0.2, max: 2, step: 0.1, value: state.adancimeGravura },
        { kind: 'number', key: 'jocGravura', label: tr('rame.jocGravura'), min: 0, max: 1, step: 0.1, value: state.jocGravura },
        ...(d ? [{ kind: 'note' as const, key: 'notaGravura', label: tr('rame.notaGravuraEticheta'),
          value: tr('rame.notaGravuraCalcul', { pr: d.reperProcent, arie: d.ariaGravuraMM2 }) }] : []),
      ] },
      { title: tr('rame.grupBaza'), controls: [
        { kind: 'number', key: 'lungimeBaza', label: tr('rame.lungimeBaza'), min: 60, max: 250, step: 5, value: state.lungimeBaza },
        { kind: 'number', key: 'latimeBaza', label: tr('rame.latimeBaza'), min: 20, max: 80, step: 2, value: state.latimeBaza },
        { kind: 'number', key: 'inaltimeBaza', label: tr('rame.inaltimeBaza'), min: 6, max: 30, step: 1, value: state.inaltimeBaza },
        { kind: 'number', key: 'adancimeInfigere', label: tr('rame.adancimeInfigere'), min: INFIGERE_MIN, max: INFIGERE_MAX, step: 0.5, value: state.adancimeInfigere },
        { kind: 'number', key: 'jocInfigere', label: tr('rame.jocInfigere'), min: 0, max: 0.6, step: 0.05, value: state.jocInfigere },
        { kind: 'number', key: 'latimePicior', label: tr('rame.latimePicior'), min: 10, max: 80, step: 1, value: state.latimePicior },
        { kind: 'number', key: 'inaltimePicior', label: tr('rame.inaltimePicior'), min: 0, max: 10, step: 0.5, value: state.inaltimePicior },
        { kind: 'color', key: 'culoareBaza', label: tr('rame.culoare'), value: state.culoareBaza },
        ...(d ? [{ kind: 'note' as const, key: 'notaBaza', label: tr('rame.notaBazaEticheta'),
          value: tr('rame.notaBazaCalcul', { unghi: d.stabilitate.unghiMinGrade.toFixed(0),
            arie: d.stabilitate.ariaMM2.toFixed(0), adanc: state.adancimeInfigere,
            locas: d.ariaLocasMM2 }) }] : []),
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
    // înfigerea nu poate depăși baza: ar tăia-o în două și rama ar sta pe masă, nu pe ea
    if (key === 'inaltimeBaza' || key === 'adancimeInfigere') {
      state.adancimeInfigere = Math.min(state.adancimeInfigere, state.inaltimeBaza - 2);
    }
  },

  rebuild() {
    const r = construieste();
    const d = r.diagnostice;
    const geom = (m: any) => manifoldToGeometry(m);
    const objects: SceneObject[] = [
      { id: 'baza', nume: tr('rame.numeBaza'), geometry: geom(r.baza), color: state.culoareBaza, movable: false },
      { id: 'rama', nume: tr(`rame.tip_${state.tip}`), geometry: geom(r.rama), color: state.culoareRama,
        movable: false, warn: d.bucatiRama > 1 },
      { id: 'text', nume: tr('rame.numeText', { text: state.text }), geometry: geom(r.text),
        color: state.culoareText, movable: false, warn: d.bucatiText > 1 },
      ...(r.aura ? [{ id: 'aura', nume: tr('rame.numeAura'), geometry: geom(r.aura),
        color: state.culoareAura, movable: false }] : []),
    ];

    const status: StatusItem[] = [
      { key: 'dim', text: tr('rame.statusDim', { l: d.dim[0], h: d.dim[1], g: d.dim[2] }) },
      { key: 'piese', text: tr('rame.statusPiese', { n: r.aura ? 4 : 3 }) },
    ];
    if (d.bucatiRama > 1) status.push({ key: 'bucatiRama', text: tr('rame.statusRamaBucati', { n: d.bucatiRama }), warn: true });
    if (d.bucatiText > 1) status.push({ key: 'bucatiText', text: tr('rame.statusTextBucati', { n: d.bucatiText }), warn: true });
    if (d.ariaFirSubtireMM2 > 1) {
      status.push({ key: 'fir', text: tr('rame.statusFirSubtire', { arie: d.ariaFirSubtireMM2, fir: state.grosimeFir }), warn: true });
    }
    status.push(d.reperProcent < 25
      ? { key: 'reper', text: tr('rame.statusReperSlab', { pr: d.reperProcent }), warn: true }
      : { key: 'reper', text: tr('rame.statusReper', { pr: d.reperProcent, arie: d.ariaGravuraMM2 }) });
    status.push({ key: 'locas', text: d.limbiLocas > 1
      ? tr('rame.statusLocasLimbi', { arie: d.ariaLocasMM2, limbi: d.limbiLocas })
      : tr('rame.statusLocas', { arie: d.ariaLocasMM2 }) });
    status.push(d.stabilitate.unghiMinGrade < UNGHI_MIN
      ? { key: 'stabil', text: tr('rame.statusInstabil', { unghi: d.stabilitate.unghiMinGrade.toFixed(0), min: UNGHI_MIN }), warn: true }
      : { key: 'stabil', text: tr('rame.statusStabil', { unghi: d.stabilitate.unghiMinGrade.toFixed(0) }) });
    if (d.glifeLipsa.length) status.push({ key: 'glifa', text: tr('rame.statusGlifaLipsa', { litere: d.glifeLipsa.join(' ') }), warn: true });
    if (!d.incapePePlaca) status.push({ key: 'placa', text: tr('rame.statusPlaca'), warn: true });
    status.push({ key: 'material', text: tr('rame.statusMaterial', { cm3: d.materialCM3 }) });
    status.push({ key: 'tri', text: tr('rame.statusTri', { n: d.triunghiuri, ms: r.ms.toFixed(0) }) });
    return { objects, status };
  },

  onMove() { /* piesele stau împreună; se despart abia la export */ },

  exportBodies(): ExportBody[] {
    if (!last) return [];
    const d = last.diagnostice;
    if (d.glifeLipsa.length) throw new Error(tr('rame.blocatGlifa', { litere: d.glifeLipsa.join(' ') }));
    if (d.bucatiRama > 1) throw new Error(tr('rame.blocatRama', { n: d.bucatiRama }));
    if (d.bucatiText > 1) throw new Error(tr('rame.blocatText', { n: d.bucatiText }));
    if (d.stabilitate.unghiMinGrade < UNGHI_MIN) {
      throw new Error(tr('rame.blocatStabilitate', { unghi: d.stabilitate.unghiMinGrade.toFixed(0), min: UNGHI_MIN }));
    }
    const nume = `rama_${slug(state.text)}`;
    // FIECARE PIESĂ SEPARAT: baza, rama și plăcuța se printează una câte una, în culoarea lor.
    // Numele și aura lui împart `grup`: sunt același obiect fizic, în două culori suprapuse, iar
    // aranjarea pe placă trebuie să le miște împreună.
    return [
      { name: `${nume}_baza`, manifold: pentruPrint(last.baza), culoare: state.culoareBaza, orientare: tr('rame.orientareBaza') },
      { name: `${nume}_rama`, manifold: pentruPrint(last.rama), culoare: state.culoareRama, orientare: tr('rame.orientareRama') },
      { name: `${nume}_nume`, manifold: pentruPrint(last.text), culoare: state.culoareText, orientare: tr('rame.orientareText'), grup: `${nume}_nume` },
      ...(last.aura ? [{ name: `${nume}_aura`, manifold: pentruPrint(last.aura), culoare: state.culoareAura,
        orientare: tr('rame.orientareText'), grup: `${nume}_nume` }] : []),
    ];
  },
  exportName() { return `rama-${state.tip}-${slug(state.text)}-${state.raza * 2}mm`; },
  exportNotes() {
    if (!last) return [];
    const d = last.diagnostice;
    return [
      tr('rame.notaBaza', { l: state.lungimeBaza, lat: state.latimeBaza, h: state.inaltimeBaza,
        adanc: state.adancimeInfigere, joc: state.jocInfigere, arie: d.ariaLocasMM2 }),
      tr('rame.notaRama', { tip: tr(`rame.tip_${state.tip}`), d: state.raza * 2, fir: state.grosimeFir, gros: state.grosimeRama }),
      tr('rame.notaGravura', { adanc: state.adancimeGravura, pr: d.reperProcent }),
      tr('rame.notaMontaj'),
      tr('rame.notaStabil', { unghi: d.stabilitate.unghiMinGrade.toFixed(0), arie: d.stabilitate.ariaMM2.toFixed(0) }),
    ];
  },

  objectInfo(id) {
    if (!last) return null;
    const m = id === 'baza' ? last.baza : id === 'rama' ? last.rama : id === 'aura' ? last.aura : last.text;
    if (!m) return null;
    const bb = m.boundingBox();
    const nume = id === 'baza' ? tr('rame.numeBaza') : id === 'rama' ? tr(`rame.tip_${state.tip}`)
      : id === 'aura' ? tr('rame.numeAura') : tr('rame.numeText', { text: state.text });
    return { nume,
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
