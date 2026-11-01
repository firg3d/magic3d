/*
 * Vecinii, normalele si centrele triunghiurilor unei plase, plus uneltele care lucreaza pe ele:
 * pensula (triunghiurile dintr-o sfera) si galeata (o zona pana la muchiile ascutite, sau o zona
 * de aceeasi culoare). Totul pe typed arrays: o plasa de un milion de triunghiuri incape.
 */
import type { PlasaPictura } from "@/magic3d/pictura/date";

export type Topologie = {
  triunghiuri: number;
  /** Normala unitara pe triunghi (x,y,z). */
  normale: Float32Array;
  /** Centrul pe triunghi (x,y,z). */
  centre: Float32Array;
  /** Pana la 3 vecini pe triunghi, cate unul pe latura; -1 unde latura e libera. */
  vecini: Int32Array;
  /** Grila de centre pentru cautarea in sfera. */
  grila: { pas: number; min: [number, number, number]; celule: Map<string, number[]> };
};

/** Cheia unui varf dupa pozitie: plasele importate au varfuri dublate pe aceeasi pozitie. */
function cheiVarfuri(plasa: PlasaPictura): Uint32Array {
  const v = plasa.varfuri;
  const chei = new Uint32Array(v.length / 3);
  const harta = new Map<string, number>();
  for (let i = 0; i < chei.length; i += 1) {
    const k = `${Math.round(v[i * 3] * 1e4)},${Math.round(v[i * 3 + 1] * 1e4)},${Math.round(v[i * 3 + 2] * 1e4)}`;
    let id = harta.get(k);
    if (id === undefined) { id = harta.size; harta.set(k, id); }
    chei[i] = id;
  }
  return chei;
}

export function topologie(plasa: PlasaPictura): Topologie {
  const { varfuri: v, fete: f } = plasa;
  const n = f.length / 3;
  const normale = new Float32Array(n * 3);
  const centre = new Float32Array(n * 3);
  let min: [number, number, number] = [Infinity, Infinity, Infinity];
  let max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (let t = 0; t < n; t += 1) {
    const a = f[t * 3] * 3, b = f[t * 3 + 1] * 3, c = f[t * 3 + 2] * 3;
    const ux = v[b] - v[a], uy = v[b + 1] - v[a + 1], uz = v[b + 2] - v[a + 2];
    const wx = v[c] - v[a], wy = v[c + 1] - v[a + 1], wz = v[c + 2] - v[a + 2];
    let x = uy * wz - uz * wy, y = uz * wx - ux * wz, z = ux * wy - uy * wx;
    const l = Math.hypot(x, y, z) || 1;
    x /= l; y /= l; z /= l;
    normale[t * 3] = x; normale[t * 3 + 1] = y; normale[t * 3 + 2] = z;
    for (let k = 0; k < 3; k += 1) {
      const m = (v[a + k] + v[b + k] + v[c + k]) / 3;
      centre[t * 3 + k] = m;
      if (m < min[k]) min[k] = m;
      if (m > max[k]) max[k] = m;
    }
  }
  if (n === 0) { min = [0, 0, 0]; max = [0, 0, 0]; }

  // Vecinii: fiecare latura (pereche de varfuri dupa pozitie) leaga cele doua triunghiuri ale ei.
  const chei = cheiVarfuri(plasa);
  const vecini = new Int32Array(n * 3).fill(-1);
  const laturi = new Map<number, number>();
  const nrVarfuri = Math.max(1, chei.reduce((m, x) => (x > m ? x : m), 0) + 1);
  for (let t = 0; t < n; t += 1) {
    for (let e = 0; e < 3; e += 1) {
      const p = chei[f[t * 3 + e]], q = chei[f[t * 3 + ((e + 1) % 3)]];
      const k = Math.min(p, q) * nrVarfuri + Math.max(p, q);
      const altul = laturi.get(k);
      if (altul === undefined) laturi.set(k, t * 3 + e);
      else if (altul >= 0) {
        const to = Math.floor(altul / 3);
        if (vecini[altul] === -1 && vecini[t * 3 + e] === -1) { vecini[altul] = t; vecini[t * 3 + e] = to; }
        // O latura cu trei triunghiuri (plasa ne-manifold) nu leaga mai departe.
        laturi.set(k, -1);
      }
    }
  }

  const diag = Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
  const pas = Math.max(diag / Math.max(1, Math.cbrt(n)) , 1e-3);
  const celule = new Map<string, number[]>();
  for (let t = 0; t < n; t += 1) {
    const k = `${Math.floor((centre[t * 3] - min[0]) / pas)},${Math.floor((centre[t * 3 + 1] - min[1]) / pas)},${Math.floor((centre[t * 3 + 2] - min[2]) / pas)}`;
    let lista = celule.get(k);
    if (!lista) { lista = []; celule.set(k, lista); }
    lista.push(t);
  }
  return { triunghiuri: n, normale, centre, vecini, grila: { pas, min, celule } };
}

/** Triunghiurile cu centrul in sfera. */
export function inSfera(top: Topologie, centru: readonly [number, number, number], raza: number): number[] {
  const { pas, min, celule } = top.grila;
  const out: number[] = [];
  const r2 = raza * raza;
  const lo = [0, 1, 2].map((k) => Math.floor((centru[k] - raza - min[k]) / pas));
  const hi = [0, 1, 2].map((k) => Math.floor((centru[k] + raza - min[k]) / pas));
  const celuleDeVazut = (hi[0] - lo[0] + 1) * (hi[1] - lo[1] + 1) * (hi[2] - lo[2] + 1);
  const verifica = (t: number) => {
    const dx = top.centre[t * 3] - centru[0], dy = top.centre[t * 3 + 1] - centru[1], dz = top.centre[t * 3 + 2] - centru[2];
    if (dx * dx + dy * dy + dz * dz <= r2) out.push(t);
  };
  if (celuleDeVazut > celule.size) {
    for (const lista of celule.values()) lista.forEach(verifica);
    return out;
  }
  for (let x = lo[0]; x <= hi[0]; x += 1) for (let y = lo[1]; y <= hi[1]; y += 1) for (let z = lo[2]; z <= hi[2]; z += 1) {
    celule.get(`${x},${y},${z}`)?.forEach(verifica);
  }
  return out;
}

export type ModPensula = "vizibil" | "prin";

/**
 * Triunghiurile pe care le acopera pensula. `lovit` e triunghiul de sub cursor si intra mereu.
 * "prin": tot ce e in sfera, si pe partea cealalta a modelului. "vizibil": numai suprafata legata
 * de triunghiul lovit, intoarsa spre privitor (`spreCamera` = directia de la model spre camera).
 */
export function subPensula(
  top: Topologie,
  lovit: number,
  centru: readonly [number, number, number],
  raza: number,
  mod: ModPensula,
  spreCamera?: readonly [number, number, number],
): number[] {
  if (lovit < 0 || lovit >= top.triunghiuri) return [];
  if (mod === "prin") {
    const toate = inSfera(top, centru, raza);
    return toate.includes(lovit) ? toate : [lovit, ...toate];
  }
  const inauntru = new Set(inSfera(top, centru, raza));
  const spre = (t: number) => !spreCamera
    || top.normale[t * 3] * spreCamera[0] + top.normale[t * 3 + 1] * spreCamera[1] + top.normale[t * 3 + 2] * spreCamera[2] > 0;
  const vazut = new Set<number>([lovit]);
  const coada = [lovit];
  for (let i = 0; i < coada.length; i += 1) {
    const t = coada[i];
    for (let e = 0; e < 3; e += 1) {
      const u = top.vecini[t * 3 + e];
      if (u < 0 || vazut.has(u) || !inauntru.has(u) || !spre(u)) continue;
      vazut.add(u);
      coada.push(u);
    }
  }
  return coada;
}

export type ModGaleata = "muchii" | "culoare";

/**
 * Galeata: zona legata de triunghiul de start. "muchii": trece de la un triunghi la vecin cat timp
 * unghiul dintre fetele lor e cel mult `unghiGrade` (o muchie mai ascutita opreste umplerea).
 * "culoare": trece numai pe triunghiuri cu aceeasi culoare ca startul (inlocuieste o culoare).
 */
export function zonaGaleata(top: Topologie, start: number, mod: ModGaleata, unghiGrade: number, culori?: Uint8Array): number[] {
  if (start < 0 || start >= top.triunghiuri) return [];
  const prag = Math.cos((Math.min(180, Math.max(0, unghiGrade)) * Math.PI) / 180) - 1e-6;
  const n = top.normale;
  const culoareStart = culori?.[start];
  const vazut = new Uint8Array(top.triunghiuri);
  vazut[start] = 1;
  const coada = [start];
  for (let i = 0; i < coada.length; i += 1) {
    const t = coada[i];
    for (let e = 0; e < 3; e += 1) {
      const u = top.vecini[t * 3 + e];
      if (u < 0 || vazut[u]) continue;
      if (mod === "culoare") {
        if (!culori || culori[u] !== culoareStart) continue;
      } else if (n[t * 3] * n[u * 3] + n[t * 3 + 1] * n[u * 3 + 1] + n[t * 3 + 2] * n[u * 3 + 2] < prag) continue;
      vazut[u] = 1;
      coada.push(u);
    }
  }
  return coada;
}
