/**
 * Uneltele 2D comune generatoarelor colectiei "Craciun" (Y IN JOS, mm): varful de agatat, coarda
 * unei sectiuni la o inaltime, barele (punti), esantionarea unei zone, generatorul aleator
 * determinist, desenele de decor din forme/*.svg si numele ca sectiune 2D.
 */
import type { Pt, Ring } from "../../core/geometry/forme2d.js";
import { citesteCale } from "../../core/geometry/svgCale.js";
import { configureManifold as configTextSolid, textSolid } from "../../core/geometry/textSolid.js";
import { GLOB_NUME } from "./config.js";
import { FORME_SVG } from "./formeSvg.js";

let MOD: any = null;
export function configureComun(mod: any): void { MOD = mod; configTextSolid(mod); }

/** Varful de agatat: pe axa de mijloc a formei, marginea de sus a conturului pe acea verticala. */
export function varf(cs: any): Pt {
  const b = cs.bounds();
  const x = (b.min[0] + b.max[0]) / 2;
  const fasie = cs.intersect(MOD.CrossSection.square([0.4, b.max[1] - b.min[1] + 2]).translate([x - 0.2, b.min[1] - 1]));
  return [x, fasie.isEmpty() ? b.min[1] : fasie.bounds().min[1]];
}

/** Coarda interiorului la inaltimea y, cea care contine x (sau cea mai lata): [stanga, dreapta]. */
export function coarda(cs: any, y: number, x?: number): [number, number] | null {
  const b = cs.bounds();
  const fasie = cs.intersect(MOD.CrossSection.square([b.max[0] - b.min[0] + 2, 0.2]).translate([b.min[0] - 1, y - 0.1]));
  const bucati = fasie.decompose().map((c: any) => c.bounds()).map((q: any) => [q.min[0], q.max[0]] as [number, number]);
  if (!bucati.length) return null;
  const cu = x === undefined ? undefined : bucati.find(([a, d]: [number, number]) => a <= x && x <= d);
  return cu ?? bucati.reduce((m: [number, number], c: [number, number]) => (c[1] - c[0] > m[1] - m[0] ? c : m));
}

/** Bara de latime w intre doua puncte, cu capetele prelungite cu `prel` (intra in material). */
export function bara2d(a: Pt, b: Pt, w: number, prel = 0.8): any {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const L = Math.hypot(dx, dy) || 1;
  return MOD.CrossSection.square([L + 2 * prel, w], true)
    .rotate((Math.atan2(dy, dx) * 180) / Math.PI)
    .translate([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
}

/** O sectiune goala (elementul neutru al reuniunii). */
export const gol = () => { const q = MOD.CrossSection.square([1, 1]); return q.subtract(q); };

/** Bucatile care conteaza (aria peste pragul de aschie). */
export const bucatiReale = (cs: any) => cs.decompose().filter((c: any) => c.area() > GLOB_NUME.aschieMax);

/** Punct in poligoane (par-impar), pentru esantionarea zonei de decor. */
export function inPoligoane(pol: Pt[][], x: number, y: number): boolean {
  let in_ = false;
  for (const r of pol) {
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const [xi, yi] = r[i], [xj, yj] = r[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) in_ = !in_;
    }
  }
  return in_;
}

/** Generator determinist (mulberry32): aceeasi samanta, acelasi decor. */
export function aleator(samanta: number): () => number {
  let s = (samanta >>> 0) || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Un desen din forme/*.svg la marimea `marime` (mm, latura viewBox-ului), cu liniile late de `w`. */
export function formaSvg(nume: string, marime: number, w: number): any {
  const { CrossSection } = MOD;
  const desen = FORME_SVG[nume];
  if (!desen) throw new Error(`forma necunoscuta: ${nume}`);
  const k = marime / 100;
  const parti: any[] = [];
  const pline: Ring[] = desen.pline.flatMap((d) => citesteCale(d).filter((s) => s.inchisa).map((s) => s.puncte.map(([x, y]) => [x * k, y * k] as Pt)));
  if (pline.length) parti.push(new CrossSection(pline, 'NonZero'));
  const cap = CrossSection.circle(w / 2, 16);
  for (const d of desen.linii) {
    for (const s of citesteCale(d)) {
      const pts = s.puncte.map(([x, y]) => [x * k, y * k] as Pt);
      if (s.inchisa) pts.push(pts[0]);
      for (let i = 1; i < pts.length; i++) parti.push(CrossSection.hull([cap.translate(pts[i - 1]), cap.translate(pts[i])]));
    }
  }
  return CrossSection.union(parti);
}

/** Numele ca sectiune 2D: inaltimea literelor mari h, comprimat pe X cu sx; linia de baza pe y = 0. */
export function nume2d(font: any, text: string, h: number, sx: number, glifeLipsa: string[]): any | null {
  if (!text.trim()) return null;
  const rep: any = {};
  const solid = textSolid(font, text, h, 1, rep);
  for (const g of rep.glifeLipsa ?? []) glifeLipsa.push(...(g.caractere ?? []));
  const cs = solid.slice(0.5);
  return sx === 1 ? cs : cs.scale([sx, 1]);
}
