/*
 * Selectia cu dreptunghi sau lasou: un triunghi intra daca centrul lui, vazut de camera, cade in
 * poligonul desenat pe ecran. "Doar vizibile" lasa deoparte fetele intoarse de la camera.
 */
import type { Topologie } from "@/magic3d/pictura/topologie";

export type Punct = [number, number];

/** Punct in poligon (regula par-impar), in coordonate de ecran. */
export function inPoligon(x: number, y: number, poligon: readonly Punct[]): boolean {
  let in_ = false;
  for (let i = 0, j = poligon.length - 1; i < poligon.length; j = i++) {
    const [xi, yi] = poligon[i], [xj, yj] = poligon[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-12) + xi) in_ = !in_;
  }
  return in_;
}

/** Dreptunghiul dintre doua colturi, ca poligon. */
export function dreptunghi(a: Punct, b: Punct): Punct[] {
  return [[a[0], a[1]], [b[0], a[1]], [b[0], b[1]], [a[0], b[1]]];
}

/**
 * Triunghiurile din poligon. `laEcran` duce un punct al scenei pe ecran (x, y) si spune daca e in
 * fata camerei; `pozitieCamera` serveste pentru "doar vizibile".
 */
export function selecteazaInPoligon(
  top: Topologie,
  poligon: readonly Punct[],
  laEcran: (x: number, y: number, z: number) => [number, number, boolean],
  pozitieCamera: readonly [number, number, number] | null,
): number[] {
  if (poligon.length < 3) return [];
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of poligon) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  const out: number[] = [];
  for (let t = 0; t < top.triunghiuri; t += 1) {
    const cx = top.centre[t * 3], cy = top.centre[t * 3 + 1], cz = top.centre[t * 3 + 2];
    if (pozitieCamera) {
      const vx = pozitieCamera[0] - cx, vy = pozitieCamera[1] - cy, vz = pozitieCamera[2] - cz;
      if (top.normale[t * 3] * vx + top.normale[t * 3 + 1] * vy + top.normale[t * 3 + 2] * vz <= 0) continue;
    }
    const [sx, sy, inFata] = laEcran(cx, cy, cz);
    if (!inFata || sx < minX || sx > maxX || sy < minY || sy > maxY) continue;
    if (inPoligon(sx, sy, poligon)) out.push(t);
  }
  return out;
}
