/**
 * APP DEMO — test de arhitectură (nu produs). Un cub parametric care se exportă,
 * folosind DOAR core/ prin AppDefinition. Nu importă NIMIC din apps/litere.
 * Dacă rulează, separarea nucleu/aplicație e reală.
 */
import { t } from '../../core/i18n/index.js';
import type { AppDefinition, SceneObject } from '../../core/app.js';
import { runApp } from '../../core/ui/shell.js';
import { initManifold, manifoldToGeometry } from '../../core/geometry/manifold.js';
import { configureManifold as configTextSolid, textSolid } from '../../core/geometry/textSolid.js';
import { configureManifold as configSemnatura, aplicaMarcaj, MARCAJ_LATIME, MARCAJ_INALTIME,
  type RegiuneMarcaj } from '../../core/semnatura/index.js';
import { stareLicenta } from '../../core/config/licenta.js';
import { loadFontManifest, loadFont, fontCached } from '../../core/assets/fonts.js';
import type { Ring } from '../../core/geometry/forme2d.js';

const state = { w: 40, h: 30, d: 20, color: '#1a8cff' };
let MOD: any;

/**
 * CORPUL DE PROBĂ AL MARCAJULUI — același cilindru culcat ca în suita de teste.
 *
 * Vitrina are nevoie de o piesă cu suprafață CURBATĂ: pe o față plată nu s-ar vedea că zona de
 * marcaj urmează racordul. Primul generator care poartă marcajul cu adevărat e husa (HUS.1);
 * până atunci, aici se poate vedea și fotografia rezultatul, în ambele stări de licență.
 */
const RAZA = 25, LUNG = 70;
const FONT_SEMNATURA = 'Arimo-Regular.ttf';

function siluetaSemnatura(): Ring[] {
  const f = fontCached(FONT_SEMNATURA);
  if (!f) return [];
  const brut = textSolid(f, 'praktik3d.ro', MARCAJ_INALTIME, 1);
  const sil = brut.project();
  brut.delete();
  const b = sil.bounds();
  const k = MARCAJ_LATIME / (b.max[0] - b.min[0]);
  const c = sil.scale([k, k]).translate([-(b.min[0] + b.max[0]) / 2 * k, -(b.min[1] + b.max[1]) / 2 * k]);
  const inele = c.toPolygons() as Ring[];
  sil.delete(); c.delete();
  return inele;
}

/**
 * Aceeași regiune ca în suita de teste: fața cu normala pe −Y a modelului.
 *
 * Pe ecran apare SUS, nu jos: viewport-ul inversează Y (placa de print stă la y = 0). Am mutat-o
 * o dată pe +Y crezând că o aduc la vedere, și a dispărut — de-aia scrie aici.
 */
const regiune: RegiuneMarcaj = {
  centru: [0, -RAZA, 0], normala: [0, -1, 0], tangenta: [1, 0, 0],
  latime: LUNG - 8, inaltime: RAZA,
};

/** cilindrul, cu marcajul aplicat după starea CURENTĂ a licenței */
function corpMarcat(): { corp: any; mod: string; scos: number } {
  const c0 = MOD.Manifold.cylinder(LUNG, RAZA, RAZA, 64, true).rotate([0, 90, 0]);
  const { corp, raport } = aplicaMarcaj(c0, { regiune, stare: stareLicenta(), siluetaSemnatura });
  if (corp !== c0) c0.delete();
  return { corp, mod: raport.mod, scos: raport.volumScosMM3 };
}

const cub = () => MOD.Manifold.cube([state.w, state.h, state.d], true);

const app: AppDefinition = {
  title: 'demo — cub parametric',
  // VITRINA de componente (VIS.1.4): pagina asta nu e in comutatorul de aplicatii si nu produce
  // un produs. Declara `poartaMarcaj` ca randul de licenta din bara de jos sa fie VIZIBIL si
  // verificabil pana cand apare primul generator care il poarta cu adevarat (husa, in HUS.1).
  poartaMarcaj: true,
  async init() {
    MOD = await initManifold();
    configTextSolid(MOD);
    configSemnatura(MOD);
    await loadFontManifest();
    await loadFont(FONT_SEMNATURA).catch(() => { /* fara font, semnatura iese goala */ });
  },
  panels() {
    return [{ title: 'Cub', controls: [
      { kind: 'number', key: 'w', label: t('demo.latime'), min: 5, max: 200, step: 1, value: state.w },
      { kind: 'number', key: 'h', label: t('demo.inaltime'), min: 5, max: 200, step: 1, value: state.h },
      { kind: 'number', key: 'd', label: t('demo.adancime'), min: 5, max: 200, step: 1, value: state.d },
      { kind: 'color', key: 'color', label: 'culoare', value: state.color },
    ] }];
  },
  onControl(key, value) { (state as any)[key] = value; },
  rebuild() {
    const { corp, mod, scos } = corpMarcat();
    const objects: SceneObject[] = [{ id: 'marcaj', nume: t('demo.corpMarcaj'),
      geometry: manifoldToGeometry(corp), color: state.color, movable: true }];
    const st = [{ key: 'mod', text: `marcaj: ${mod} · scos ${scos.toFixed(3)} mm³` }];
    corp.delete();
    return { objects, status: st };
  },
  onMove() { /* cubul e fix în acest test */ },
  exportBodies() { return [{ name: 'cub', manifold: cub() }]; },
  exportName() { return `cub-${state.w}x${state.h}x${state.d}`; },
};

runApp(app);
