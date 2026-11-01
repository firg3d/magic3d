/**
 * APP MATRITA DE SILICON — geometria produsului.
 *
 * Din modelul clientului, tot ce trebuie pentru o matrita de silicon din doua jumatati:
 *   · POZITIVUL: modelul scalat, optional plin (fara golurile interioare);
 *   · PLACA DE SEPARATIE: tine locul jumatatii de jos la prima turnare; e cutia pana la planul de
 *     separatie, minus modelul, cu CHEILE (emisfere) deasupra - jumatatea de sus le ia ca gropite,
 *     iar cea de jos, turnata a doua, le umple: cele doua jumatati se aliniaza singure;
 *   · CUTIA DE TURNARE: peretii la `distanta` de model, in doua sau patru bucati prinse cu cleme pe
 *     nervuri, asezati in canelura unui fund separat;
 *   · CANALUL DE TURNARE (cu palnie) in punctul cel mai inalt si RASUFLATORILE in urmatoarele
 *     puncte inalte, ca tije printate lipite pe model.
 * Volumele de silicon ale fiecarei jumatati se masoara pe geometrie.
 *
 * Planul de separatie: automat la cea mai mare sectiune orizontala a modelului, sau la o inaltime
 * aleasa, inclinat in jurul lui X si Y (aceeasi taiere cu plan ca in editor: trimByPlane).
 * Coordonate: Z in sus; interiorul cutiei de la z = 0 (fata fundului) la z = H, centrat pe x-y.
 */
import { decodeazaModel } from '../../core/geometry/codare.js';
import { configureManifold as configMatrita, contrapanta } from '../../core/geometry/matrita.js';
import { SILICON } from './config.js';

let MOD: any = null;
export function configureManifold(mod: any): void { MOD = mod; configMatrita(mod); }

export interface ParamSilicon {
  model: string;
  scara: number;
  umplere: boolean;
  distanta: number;
  separatie: 'auto' | 'manual';
  /** La separatia manuala: inaltimea planului, % din inaltimea modelului. */
  inaltimeSeparatie: number;
  inclinareX: number;
  inclinareY: number;
  pereti: 2 | 4;
  /** Mutarea canalului de turnare fata de punctul cel mai inalt, mm. */
  canalDx: number;
  canalDy: number;
}

export type RolSilicon = 'pozitiv' | 'separatie' | 'perete' | 'clema' | 'fund' | 'canal' | 'rasuflatoare';

export interface DiagSilicon {
  lipsa: '' | 'model';
  /** Volumele de silicon (fara marja), mm³: jumatatea de sus (turnata prima) si cea de jos. */
  volumSus: number;
  volumJos: number;
  /** Interiorul cutiei, modelul si tijele din interior, mm³ (pentru verificare). */
  volumInterior: number;
  volumModel: number;
  volumTije: number;
  /** Contrapanta fiecarei jumatati a modelului, mm². */
  contrapantaSus: number;
  contrapantaJos: number;
  /** Planul iese prin fundul sau capacul cutiei (inclinat prea mult). */
  planIese: boolean;
  /** Vreo cheie atinge modelul. */
  cheieAtinge: boolean;
  /** Centrele cheilor si punctele tijelor (x, y, z). */
  chei: Array<[number, number, number]>;
  canal: [number, number, number] | null;
  rasuflatori: Array<[number, number, number]>;
  /** Interiorul cutiei: latime, adancime, inaltime; si planul (normala, offset). */
  interior: [number, number, number];
  normala: [number, number, number];
  offset: number;
  razaCheie: number;
}

export interface RezultatSilicon {
  piese: Array<{ rol: RolSilicon; manifold: any }>;
  diag: DiagSilicon;
}

/** Normala planului: z rotit cu inclinareX in jurul lui X, apoi cu inclinareY in jurul lui Y (ca Manifold.rotate). */
export function normalaPlan(inclinareX: number, inclinareY: number): [number, number, number] {
  const ax = (inclinareX * Math.PI) / 180, ay = (inclinareY * Math.PI) / 180;
  return [Math.cos(ax) * Math.sin(ay), -Math.sin(ax), Math.cos(ax) * Math.cos(ay)];
}

/** Modelul clientului ca manifold, scalat, cu baza la z = 0, centrat pe x-y; optional fara goluri interioare. */
function pozitiv(p: ParamSilicon): any | null {
  const { Manifold, Mesh } = MOD;
  const plasa = decodeazaModel(p.model);
  if (!plasa) return null;
  const mesh = new Mesh({ numProp: 3, vertProperties: plasa.varfuri, triVerts: plasa.triunghiuri });
  mesh.merge();
  let m: any;
  try {
    m = new Manifold(mesh);
  } catch {
    return null;
  }
  if (m.isEmpty() || m.volume() <= 0) return null;
  if (p.umplere) {
    // Golurile interioare sunt invelisuri separate, cu volum negativ: raman doar cele pline.
    const pline = m.decompose().filter((x: any) => x.volume() > 0);
    if (pline.length) m = Manifold.union(pline);
  }
  const s = Math.max(SILICON.scaraMin, Math.min(SILICON.scaraMax, p.scara)) / 100;
  const b = m.boundingBox();
  return m.translate([-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2, -b.min[2]]).scale(s);
}

/** Varfurile unui corp, ca puncte. */
function varfuri(m: any): Array<[number, number, number]> {
  const g = m.getMesh();
  const out: Array<[number, number, number]> = [];
  for (let i = 0; i < g.vertProperties.length; i += g.numProp) out.push([g.vertProperties[i], g.vertProperties[i + 1], g.vertProperties[i + 2]]);
  return out;
}

export function buildSilicon(p: ParamSilicon): RezultatSilicon {
  const { Manifold, CrossSection } = MOD;
  const model0 = pozitiv(p);
  const zero: DiagSilicon = {
    lipsa: 'model', volumSus: 0, volumJos: 0, volumInterior: 0, volumModel: 0, volumTije: 0, contrapantaSus: 0, contrapantaJos: 0,
    planIese: false, cheieAtinge: false, chei: [], canal: null, rasuflatori: [], interior: [0, 0, 0], normala: [0, 0, 1], offset: 0, razaCheie: 0,
  };
  if (!model0) return { piese: [], diag: zero };

  const d = Math.max(SILICON.distantaMin, Math.min(SILICON.distantaMax, p.distanta));
  const bm = model0.boundingBox();
  const mx = (bm.max[0] - bm.min[0]) / 2, my = (bm.max[1] - bm.min[1]) / 2, mh = bm.max[2] - bm.min[2];
  const model = model0.translate([0, 0, d]);
  const W = 2 * (mx + d), D = 2 * (my + d), H = mh + 2 * d;
  const interiorCs = CrossSection.square([W, D], true);
  const interior = Manifold.extrude(interiorCs, H);

  // Planul: inaltimea (automat: sectiunea cea mai mare a modelului), normala, offsetul (n · x = offset).
  let zp: number;
  if (p.separatie === 'manual') {
    zp = d + (mh * Math.max(0, Math.min(100, p.inaltimeSeparatie))) / 100;
  } else {
    let cea = -1;
    zp = d + mh / 2;
    for (let z = d + SILICON.pasSeparatie / 2; z < d + mh; z += SILICON.pasSeparatie) {
      const a = model.slice(z).area();
      if (a > cea + 1e-6) { cea = a; zp = z; }
    }
  }
  const lim = SILICON.inclinareMax;
  const ix = Math.max(-lim, Math.min(lim, p.inclinareX)), iy = Math.max(-lim, Math.min(lim, p.inclinareY));
  const n = normalaPlan(ix, iy);
  const offset = n[2] * zp;
  const zPlan = (x: number, y: number) => (offset - n[0] * x - n[1] * y) / n[2];
  const colturi = [[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2]].map(([x, y]) => zPlan(x, y));
  const planIese = colturi.some((z) => z <= 0.5 || z >= H - 0.5);

  // Cheile: patru emisfere pe plan, la jumatatea distantei dintre model si pereti, simetrice fata de centru.
  const razaCheie = Math.max(1.5, Math.min(SILICON.razaCheie, d / 2 - 1.5));
  const kx = mx + d / 2, ky = my + d / 2;
  const chei: Array<[number, number, number]> = [[-kx, -ky], [kx, -ky], [-kx, ky], [kx, ky]].map(([x, y]) => [x, y, zPlan(x, y)]);
  const emisfere = Manifold.union(chei.map((c) => Manifold.sphere(razaCheie, 48).translate(c).trimByPlane(n, n[0] * c[0] + n[1] * c[1] + n[2] * c[2])));
  const cheieAtinge = emisfere.intersect(model).volume() > 0.001;

  // Canalul in punctul cel mai inalt (mutat cu canalDx/Dy spre alt punct de sus), rasuflatorile in urmatoarele.
  const sus = varfuri(model).filter(([x, y, z]) => z > zPlan(x, y) + 1);
  const top = sus.reduce((a, b) => (b[2] > a[2] ? b : a), sus[0] ?? [0, 0, d + mh]);
  const tinta = [top[0] + p.canalDx, top[1] + p.canalDy];
  let canal = top;
  if (p.canalDx || p.canalDy) {
    // Punctul de sus cel mai apropiat (pe orizontala) de tinta; la egalitate, cel mai inalt.
    const dist = (v: [number, number, number]) => Math.hypot(v[0] - tinta[0], v[1] - tinta[1]);
    canal = sus.reduce((a, b) => (dist(b) < dist(a) - 0.01 || (Math.abs(dist(b) - dist(a)) <= 0.01 && b[2] > a[2]) ? b : a), top);
  }
  const rasuflatori: Array<[number, number, number]> = [];
  for (const v of [...sus].sort((a, b) => b[2] - a[2])) {
    if (rasuflatori.length >= SILICON.rasuflatori) break;
    if ([canal, ...rasuflatori].every((q) => Math.hypot(v[0] - q[0], v[1] - q[1]) >= SILICON.distantaRasuflatori)) rasuflatori.push(v);
  }
  const tija = (pt: [number, number, number], diametru: number, palnie: boolean) => {
    const z0 = pt[2] - SILICON.intrareModel;
    const r = diametru / 2;
    let t = Manifold.cylinder(H - z0, r, r, 32).translate([pt[0], pt[1], z0]);
    if (palnie) t = t.add(Manifold.cylinder(SILICON.inaltimePalnie, r, SILICON.diametruPalnie / 2, 48).translate([pt[0], pt[1], H]));
    return t;
  };
  const tije = [tija(canal, SILICON.diametruCanal, true), ...rasuflatori.map((v) => tija(v, SILICON.diametruRasuflatoare, false))];
  const tijeInterior = Manifold.union(tije).intersect(interior).subtract(model);

  // Siliconul: sus = deasupra planului, fara model, chei si tije; jos = sub plan plus cheile, fara model.
  const deasupra = interior.trimByPlane(n, offset);
  const dedesubt = interior.trimByPlane([-n[0], -n[1], -n[2]], -offset);
  const siliconSus = deasupra.subtract(model).subtract(emisfere).subtract(tijeInterior);
  const siliconJos = dedesubt.add(emisfere).subtract(model);

  // Contrapanta fiecarei jumatati a modelului, cu planul adus orizontal (jos intoarsa cu fata in sus).
  const aliniat = model.translate([0, 0, -zp]).rotate([0, -iy, 0]).rotate([-ix, 0, 0]);
  const parteSus = aliniat.trimByPlane([0, 0, 1], 0);
  const parteJos = aliniat.trimByPlane([0, 0, -1], 0).rotate([180, 0, 0]);
  const cp = (m: any) => (m.isEmpty() ? 0 : contrapanta(m, SILICON.pasSeparatie));

  // Placa de separatie: sub plan, cu joc fata de pereti, plus cheile, minus modelul.
  const joc = Manifold.extrude(interiorCs.offset(-SILICON.jocBloc, 'Miter'), H);
  const separatie = dedesubt.intersect(joc).add(emisfere).subtract(model);

  // Peretii: inelul din jurul interiorului, din canelura (z < 0) pana la capac, taiat in 2 sau 4 bucati,
  // cu cate doua nervuri fata in fata la fiecare taietura (clema aluneca peste ele).
  const t = SILICON.perete, g = SILICON.canelura;
  const inel = Manifold.extrude(interiorCs.offset(t, 'Miter').subtract(interiorCs), H + g).translate([0, 0, -g]);
  const rt = SILICON.grosimeNervura, rl = SILICON.lungimeNervura, c = SILICON.taiere;
  // Nervurile intra o jumatate de milimetru in perete, ca sa fie una cu el.
  const nervuriX = (y0: number, semn: number) => [-1, 1].map((sx) => Manifold.cube([rt, rl + 0.5, H], false).translate([sx < 0 ? -c / 2 - rt : c / 2, semn < 0 ? y0 - rl : y0 - 0.5, 0]));
  const nervuriY = (x0: number, semn: number) => [-1, 1].map((sy) => Manifold.cube([rl + 0.5, rt, H], false).translate([semn < 0 ? x0 - rl : x0 - 0.5, sy < 0 ? -c / 2 - rt : c / 2, 0]));
  let cadru = Manifold.union([inel, ...nervuriX(-D / 2 - t, -1), ...nervuriX(D / 2 + t, 1)]);
  let taieturi = Manifold.cube([c, D + 2 * (t + rl) + 2, H + g + 2], true).translate([0, 0, H / 2]);
  if (p.pereti === 4) {
    cadru = Manifold.union([cadru, ...nervuriY(-W / 2 - t, -1), ...nervuriY(W / 2 + t, 1)]);
    taieturi = taieturi.add(Manifold.cube([W + 2 * (t + rl) + 2, c, H + g + 2], true).translate([0, 0, H / 2]));
  }
  const pereti = cadru.subtract(taieturi).decompose();

  // Clemele: un U care aluneca peste perechea de nervuri, cat peretele de inalt.
  const cj = SILICON.jocClema, pc = SILICON.pereteClema;
  const golClema = 2 * rt + c + 2 * cj;
  const clemaCs = CrossSection.square([golClema + 2 * pc, rl + cj + pc]).subtract(CrossSection.square([golClema, rl + cj]).translate([pc, 0]));
  const clema = Manifold.extrude(clemaCs, H);
  const clemeN = p.pereti === 4 ? 4 : 2;

  // Fundul: placa cu canelura in care stau peretii.
  const exterior = interiorCs.offset(t, 'Miter');
  const fund = Manifold.extrude(exterior.offset(SILICON.margineFund, 'Round'), SILICON.fund).translate([0, 0, -SILICON.fund])
    .subtract(Manifold.extrude(exterior.offset(SILICON.jocCanelura, 'Miter').subtract(interiorCs.offset(-SILICON.jocCanelura, 'Miter')), g + 0.01).translate([0, 0, -g]));

  const piese: RezultatSilicon['piese'] = [
    { rol: 'pozitiv', manifold: model0 },
    { rol: 'separatie', manifold: separatie },
    ...pereti.map((m: any) => ({ rol: 'perete' as const, manifold: m })),
    ...Array.from({ length: clemeN }, () => ({ rol: 'clema' as const, manifold: clema })),
    { rol: 'fund', manifold: fund },
    { rol: 'canal', manifold: tije[0] },
    ...tije.slice(1).map((m) => ({ rol: 'rasuflatoare' as const, manifold: m })),
  ];
  return {
    piese,
    diag: {
      lipsa: '',
      volumSus: siliconSus.volume(),
      volumJos: siliconJos.volume(),
      volumInterior: interior.volume(),
      volumModel: model.volume(),
      volumTije: tijeInterior.volume(),
      contrapantaSus: cp(parteSus),
      contrapantaJos: cp(parteJos),
      planIese,
      cheieAtinge,
      chei,
      canal,
      rasuflatori,
      interior: [W, D, H],
      normala: n,
      offset,
      razaCheie,
    },
  };
}
