/**
 * NUCLEU — forme decorative desenate din formule (nicio imagine a altcuiva): inima, stea, brad,
 * fulg, cerc, clopotel. Inele cu Y IN SUS, in sens trigonometric, incadrate in [-1, 1] pe latura
 * mare. Unele forme sunt date ca mai multe inele care se suprapun (bradul, fulgul): se citesc cu
 * regula "NonZero", care le reuneste.
 *
 * Folosite de ornamente (apps/ornament) si de exemplele termoformarii.
 */

import { arieRing, poligon, type Pt, type Ring } from './forme2d.js';

export type FormaDecor = 'cerc' | 'stea' | 'brad' | 'fulg' | 'inima' | 'clopotel' | 'patrat' | 'hexagon';
export const FORME_DECOR: FormaDecor[] = ['cerc', 'stea', 'brad', 'fulg', 'inima', 'clopotel', 'patrat', 'hexagon'];

const PUNCTE = 160;

/** In sens trigonometric (aria pozitiva). */
const trig = (r: Ring): Ring => (arieRing(r) < 0 ? [...r].reverse() : r);

/** Inelele incadrate in [-1, 1] pe latura mare, centrate pe cutie. */
export function normalizeaza(inele: Ring[]): Ring[] {
  const pts = inele.flat();
  const minX = Math.min(...pts.map((p) => p[0])), maxX = Math.max(...pts.map((p) => p[0]));
  const minY = Math.min(...pts.map((p) => p[1])), maxY = Math.max(...pts.map((p) => p[1]));
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const f = 2 / Math.max(maxX - minX, maxY - minY, 1e-9);
  return inele.map((r) => trig(r.map(([x, y]) => [(x - cx) * f, (y - cy) * f] as Pt)));
}

export const inima = (): Ring[] => [
  Array.from({ length: PUNCTE }, (_, i) => {
    const t = (2 * Math.PI * i) / PUNCTE;
    return [16 * Math.sin(t) ** 3, 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)] as Pt;
  }),
];

/** Steaua cu `colturi` varfuri si raza interioara `interior` (din cea exterioara), cu un varf in sus. */
export function stea(colturi = 5, interior = 0.55): Ring[] {
  const r: Ring = [];
  for (let i = 0; i < 2 * colturi; i += 1) {
    const unghi = Math.PI / 2 + (Math.PI / colturi) * i;
    const raza = i % 2 === 0 ? 1 : interior;
    r.push([raza * Math.cos(unghi), raza * Math.sin(unghi)]);
  }
  return [r];
}

export const cerc = (): Ring[] => [poligon(0, 0, 1, 96)];

/** Bradul: trei triunghiuri suprapuse si trunchiul. */
export function brad(): Ring[] {
  const tri = (yJos: number, yVarf: number, latime: number): Ring => [[-latime / 2, yJos], [latime / 2, yJos], [0, yVarf]];
  // Etaje late si mult suprapuse: in mijlocul bradului trebuie sa incapa un nume.
  return [tri(-0.62, 0.3, 1.9), tri(-0.25, 0.66, 1.45), tri(0.15, 1, 1), [[-0.15, -1], [0.15, -1], [0.15, -0.55], [-0.15, -0.55]]];
}

/** Dreptunghiul de latime `l` de la origine pana la `lungime`, rotit cu `unghi` (radiani), plus un decalaj de-a lungul lui. */
function brat(unghi: number, start: number, lungime: number, l: number): Ring {
  const c = Math.cos(unghi), s = Math.sin(unghi);
  const p = (u: number, v: number): Pt => [u * c - v * s, u * s + v * c];
  return [p(start, -l / 2), p(start + lungime, -l / 2), p(start + lungime, l / 2), p(start, l / 2)];
}

/** Fulgul: sase brate cu cate doua ramuri, si un hexagon in mijloc. */
export function fulg(): Ring[] {
  const inele: Ring[] = [poligon(0, 0, 0.22, 6, Math.PI / 6)];
  for (let k = 0; k < 6; k += 1) {
    const a = (Math.PI / 3) * k + Math.PI / 2;
    inele.push(brat(a, 0, 1, 0.14));
    for (const semn of [-1, 1]) {
      // Ramura pleaca din brat la 0.55 si se deschide la 45°.
      const baza: Pt = [0.55 * Math.cos(a), 0.55 * Math.sin(a)];
      const r = brat(a + (semn * Math.PI) / 4, 0, 0.32, 0.11).map(([x, y]) => [x + baza[0], y + baza[1]] as Pt);
      inele.push(r);
    }
  }
  return inele;
}

/** Clopotelul: crestetul rotund, corpul care se lateste, buza, limba si toarta. */
export function clopotel(): Ring[] {
  const corp: Ring = [[-0.78, -0.6], [0.78, -0.6], [0.45, 0.35], [-0.45, 0.35]];
  const buza: Ring = [[-0.92, -0.72], [0.92, -0.72], [0.92, -0.55], [-0.92, -0.55]];
  return [poligon(0, 0.35, 0.45, 48), corp, buza, poligon(0, -0.82, 0.16, 24), poligon(0, 0.86, 0.14, 24)];
}

/** Poligon regulat cu colturile rotunjite (raza `rotunjire`), circumscris cercului unitate. */
function poligonRotunjit(laturi: number, faza: number, rotunjire: number): Ring {
  const inel: Ring = [];
  const jum = Math.PI / laturi;
  for (let k = 0; k < laturi; k += 1) {
    const unghi = faza + 2 * jum * k;
    // Centrul arcului de colt sta pe bisectoare, la distanta potrivita ca arcul sa atinga laturile.
    const d = 1 - rotunjire / Math.cos(jum);
    for (let i = 0; i <= 8; i += 1) {
      const a = unghi - jum + (2 * jum * i) / 8;
      inel.push([d * Math.cos(unghi) + rotunjire * Math.cos(a), d * Math.sin(unghi) + rotunjire * Math.sin(a)]);
    }
  }
  return inel;
}

/** Hexagonul Magic3D: sase laturi cu colturile rotunjite. */
export const hexagon = (): Ring[] => [poligonRotunjit(6, Math.PI / 6, 0.12)];

/** Patratul cu colturile usor rotunjite, cu laturile pe axe. */
export const patrat = (): Ring[] => normalizeaza([poligonRotunjit(4, Math.PI / 4, 0.12)]);

export function formaDecor(forma: FormaDecor): Ring[] {
  switch (forma) {
    case 'cerc': return cerc();
    case 'stea': return stea();
    case 'brad': return brad();
    case 'fulg': return fulg();
    case 'inima': return inima();
    case 'clopotel': return clopotel();
    case 'patrat': return patrat();
    case 'hexagon': return hexagon();
  }
}
