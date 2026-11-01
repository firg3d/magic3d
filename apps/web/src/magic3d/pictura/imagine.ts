/*
 * Imagine pe model (decal): o poza (PNG, JPG, SVG) se reduce la cateva culori de filament si se
 * proiecteaza pe triunghiuri dintr-o directie, cu pozitie, latime si rotire.
 *
 * Reducerea: culorile imaginii se strang pe o grila de 32 de trepte pe canal (cu numarul de pixeli
 * ca pondere), apoi se aleg cele mai apropiate N culori din paleta data, in OKLab (reducere.ts).
 * Pixelii transparenti (sau de culoarea fundalului, la cerere) nu coloreaza nimic.
 */
import { distanta, reduceCulori } from "@/magic3d/pictura/reducere";
import type { Topologie } from "@/magic3d/pictura/topologie";

export const FARA = 255;

export type ImagineRedusa = {
  latime: number;
  inaltime: number;
  /** Culorile alese, "#rrggbb". */
  culori: string[];
  /** Pe pixel: indexul culorii, sau FARA. */
  index: Uint8Array;
};

const hex = (r: number, g: number, b: number) => `#${[r, g, b].map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0")).join("")}`;

/**
 * Reduce o imagine RGBA la cel mult `n` culori din `paleta`. `fundal`: o culoare de fundal care se
 * trateaza ca transparenta (de pilda albul unui JPG), cu toleranta OKLab `tolerantaFundal`.
 */
export function reduceImagine(rgba: Uint8ClampedArray | Uint8Array, latime: number, inaltime: number, paleta: readonly string[], n: number, fundal?: string, tolerantaFundal = 0.06): ImagineRedusa {
  const total = latime * inaltime;
  const cutie = new Map<number, { r: number; g: number; b: number; w: number }>();
  const cheiePixel = new Int32Array(total).fill(-1);
  for (let i = 0; i < total; i += 1) {
    const a = rgba[i * 4 + 3];
    if (a < 128) continue;
    const r = rgba[i * 4], g = rgba[i * 4 + 1], b = rgba[i * 4 + 2];
    const k = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    cheiePixel[i] = k;
    const c = cutie.get(k);
    if (c) { c.r += r; c.g += g; c.b += b; c.w += 1; } else cutie.set(k, { r, g, b, w: 1 });
  }
  const chei = [...cutie.keys()];
  const medii = chei.map((k) => { const c = cutie.get(k)!; return hex(c.r / c.w, c.g / c.w, c.b / c.w); });
  const fundalLow = fundal?.toLowerCase();
  const ponderi = chei.map((k, i) => (fundalLow && distanta(medii[i], fundalLow) <= tolerantaFundal ? 0 : cutie.get(k)!.w));
  const ePeFundal = chei.map((_, i) => ponderi[i] === 0);
  const index = new Uint8Array(total).fill(FARA);
  if (!chei.length || ponderi.every((w) => w === 0)) return { latime, inaltime, culori: [], index };
  const rez = reduceCulori({ sloturi: medii, ponderi, limita: Math.max(1, n), paleta });
  const pozitie = new Map(chei.map((k, i) => [k, i]));
  for (let i = 0; i < total; i += 1) {
    const k = cheiePixel[i];
    if (k < 0) continue;
    const j = pozitie.get(k)!;
    if (ePeFundal[j]) continue;
    index[i] = rez.mapare[j];
  }
  return { latime, inaltime, culori: rez.sloturi, index };
}

export type Decal = {
  /** Centrul imaginii pe model (coordonatele scenei). */
  centru: [number, number, number];
  /** Directia din care se proiecteaza (spre model), unitara. */
  directie: [number, number, number];
  /** "Sus"-ul imaginii, aproximativ perpendicular pe directie. */
  sus: [number, number, number];
  /** Latimea imaginii pe model, mm; inaltimea urmeaza proportia. */
  latime: number;
  /** Rotirea in planul imaginii, grade. */
  rotire: number;
  /** Mutarea in planul imaginii (dreapta, sus), mm. */
  mutare: [number, number];
};

function normalizeaza(v: [number, number, number]): [number, number, number] {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

function cruce(a: readonly number[], b: readonly number[]): [number, number, number] {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

/**
 * Pentru fiecare triunghi, indexul culorii imaginii care cade pe centrul lui, sau FARA (in afara
 * imaginii, pe un pixel transparent ori pe o fata intoarsa de la directia proiectiei).
 */
export function proiecteazaDecal(top: Topologie, imagine: ImagineRedusa, d: Decal): Uint8Array {
  const out = new Uint8Array(top.triunghiuri).fill(FARA);
  const dir = normalizeaza(d.directie);
  // baza planului imaginii: dreapta si sus, rotite cu `rotire`
  // privind de-a lungul directiei, cu sus-ul dat: dreapta = directie x sus
  const brut = cruce(dir, d.sus);
  const dreapta = Math.hypot(...brut) > 1e-6 ? normalizeaza(brut) : normalizeaza(cruce(dir, Math.abs(dir[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]));
  const sus0 = normalizeaza(cruce(dreapta, dir));
  const r = (d.rotire * Math.PI) / 180, cos = Math.cos(r), sin = Math.sin(r);
  const dx: [number, number, number] = [dreapta[0] * cos + sus0[0] * sin, dreapta[1] * cos + sus0[1] * sin, dreapta[2] * cos + sus0[2] * sin];
  const dy: [number, number, number] = [sus0[0] * cos - dreapta[0] * sin, sus0[1] * cos - dreapta[1] * sin, sus0[2] * cos - dreapta[2] * sin];
  const lat = Math.max(1e-3, d.latime);
  const ina = lat * (imagine.inaltime / Math.max(1, imagine.latime));
  for (let t = 0; t < top.triunghiuri; t += 1) {
    const nx = top.normale[t * 3], ny = top.normale[t * 3 + 1], nz = top.normale[t * 3 + 2];
    if (nx * dir[0] + ny * dir[1] + nz * dir[2] >= -1e-3) continue; // fata nu priveste spre proiector
    const px = top.centre[t * 3] - d.centru[0], py = top.centre[t * 3 + 1] - d.centru[1], pz = top.centre[t * 3 + 2] - d.centru[2];
    const u = (px * dx[0] + py * dx[1] + pz * dx[2] - d.mutare[0]) / lat + 0.5;
    const v = 0.5 - (px * dy[0] + py * dy[1] + pz * dy[2] - d.mutare[1]) / ina;
    if (u < 0 || u >= 1 || v < 0 || v >= 1) continue;
    out[t] = imagine.index[Math.floor(v * imagine.inaltime) * imagine.latime + Math.floor(u * imagine.latime)];
  }
  return out;
}
