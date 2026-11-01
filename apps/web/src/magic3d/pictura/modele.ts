/*
 * Modele de culoare generate procedural, fara fisiere externe: fiecare triunghi primeste un nivel
 * 0..k-1 dupa pozitia centrului sau (si normala, pentru proiectia triplanara). Nivelul se
 * transforma apoi in slot prin lista de culori a modelului.
 *
 * Totul e determinist: acelasi model, aceiasi parametri si acelasi seed dau aceleasi culori.
 */

export const MODELE = [
  "dungi", "dungiOblice", "spirala", "carouri", "buline", "valuri", "zigzag",
  "gradientInaltime", "gradientRadial", "gradientAxa", "camuflaj", "marmura", "voronoi",
  "hexagoane", "lemn", "fulgi", "inimi", "stele",
] as const;
export type Model = (typeof MODELE)[number];

export const PROIECTII = ["sus", "fata", "lateral", "cilindric", "sferic", "triplanar"] as const;
export type Proiectie = (typeof PROIECTII)[number];

export type ParametriModel = {
  model: Model;
  /** Marimea motivului, in mm (latimea unei dungi, latura unui carou...). */
  marime: number;
  /** Rotirea motivului, in grade. */
  unghi: number;
  /** 0..1: cat din celula ocupa forma (buline, fulgi...), contrastul la zgomot. */
  densitate: number;
  seed: number;
  /** Cate culori foloseste modelul (2..8). */
  culori: number;
  proiectie: Proiectie;
};

export const PARAMETRI_IMPLICITI: ParametriModel = { model: "dungi", marime: 5, unghi: 0, densitate: 0.5, seed: 1, culori: 2, proiectie: "triplanar" };

export const CULORI_MODEL_MAX = 8;

/** Proiectia pe care o cere un model, daca are una a lui (spirala se infasoara pe cilindru). */
export function proiectieModel(p: ParametriModel): Proiectie {
  if (p.model === "spirala") return "cilindric";
  return p.proiectie;
}

// --- zgomot determinist ----------------------------------------------------------------------

function hash2(x: number, y: number, seed: number) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function neted(t: number) {
  return t * t * (3 - 2 * t);
}

/** Zgomot de valoare, 0..1. */
function zgomot(x: number, y: number, seed: number) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const fx = neted(x - xi), fy = neted(y - yi);
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed), c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

/** Zgomot fractal (4 octave), 0..1. */
function fbm(x: number, y: number, seed: number) {
  let s = 0, amp = 0.5, f = 1, tot = 0;
  for (let o = 0; o < 4; o += 1) {
    s += amp * zgomot(x * f, y * f, seed + o * 101);
    tot += amp;
    amp *= 0.5;
    f *= 2.03;
  }
  return s / tot;
}

const mod = (a: number, n: number) => ((a % n) + n) % n;

// --- forme in celula -------------------------------------------------------------------------

/** Inima in [-1,1]^2 (varful in jos): ecuatia clasica (x^2 + y^2 - 1)^3 - x^2 y^3 <= 0. */
function inInima(x: number, y: number) {
  const X = x * 1.25, Y = -y * 1.25 + 0.25;
  const a = X * X + Y * Y - 1;
  return a * a * a - X * X * Y * Y * Y <= 0;
}

/** Stea cu 5 colturi in cercul unitate. */
function inStea(x: number, y: number) {
  const r = Math.hypot(x, y);
  if (r > 1) return false;
  const t = Math.atan2(x, y);
  const seg = (Math.PI * 2) / 5;
  const u = mod(t, seg) / seg; // 0..1 intre doua colturi
  const raza = 1 - 0.62 * (1 - Math.abs(u * 2 - 1));
  return r <= raza;
}

/** Fulg: sase brate subtiri cu ramuri, in cercul unitate. */
function inFulg(x: number, y: number) {
  const r = Math.hypot(x, y);
  if (r > 1) return false;
  const t = mod(Math.atan2(y, x), Math.PI / 3);
  const unghiBrat = Math.min(t, Math.PI / 3 - t);
  const dist = r * Math.sin(unghiBrat);
  if (dist < 0.09) return true;
  // ramurile, la doua treimi din brat
  const lungime = r * Math.cos(unghiBrat);
  return lungime > 0.45 && lungime < 0.8 && Math.abs(dist - (lungime - 0.45) * 0.9) < 0.07;
}

// --- coordonate ------------------------------------------------------------------------------

export type Cutie = { min: [number, number, number]; max: [number, number, number] };

/** Coordonatele 2D (mm) ale unui punct dupa proiectie, fata de centrul corpului. Y e in sus. */
function proiecteaza(pr: Proiectie, x: number, y: number, z: number, nx: number, ny: number, nz: number, raza: number): [number, number] {
  switch (pr) {
    case "sus": return [x, -z];
    case "fata": return [x, y];
    case "lateral": return [-z, y];
    case "cilindric": return [Math.atan2(z, x) * raza, y];
    case "sferic": {
      const r = Math.hypot(x, y, z) || 1;
      return [Math.atan2(z, x) * raza, Math.asin(Math.max(-1, Math.min(1, y / r))) * raza];
    }
    default: {
      const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
      if (ay >= ax && ay >= az) return [x, -z];
      if (ax >= az) return [-z, y];
      return [x, y];
    }
  }
}

/**
 * Nivelurile (0..culori-1) pentru triunghiurile date prin centre si normale. `progres` primeste
 * fractia facuta; daca intoarce false, calculul se opreste (anulare) si rezultatul e null.
 */
export function calculeazaModel(
  centre: Float32Array,
  normale: Float32Array,
  cutie: Cutie,
  p: ParametriModel,
  progres?: (fractie: number) => boolean | void,
): Uint8Array | null {
  const n = centre.length / 3;
  const out = new Uint8Array(n);
  const k = Math.max(1, Math.min(CULORI_MODEL_MAX, Math.round(p.culori)));
  const s = Math.max(0.05, p.marime);
  const dens = Math.min(1, Math.max(0, p.densitate));
  const seed = Math.round(p.seed) | 0;
  const cx = (cutie.min[0] + cutie.max[0]) / 2, cy = (cutie.min[1] + cutie.max[1]) / 2, cz = (cutie.min[2] + cutie.max[2]) / 2;
  const inaltime = Math.max(1e-6, cutie.max[1] - cutie.min[1]);
  const razaCil = Math.max(1e-6, Math.max(cutie.max[0] - cutie.min[0], cutie.max[2] - cutie.min[2]) / 2);
  const razaSfera = Math.max(1e-6, Math.hypot(cutie.max[0] - cutie.min[0], cutie.max[1] - cutie.min[1], cutie.max[2] - cutie.min[2]) / 2);
  const pr = proiectieModel(p);
  const raza = pr === "sferic" ? razaSfera : razaCil;
  const unghi = ((p.model === "dungiOblice" && p.unghi === 0 ? 45 : p.unghi) * Math.PI) / 180;
  const cos = Math.cos(unghi), sin = Math.sin(unghi);
  const nivel = (v: number) => mod(Math.floor(v), k);
  const pasProgres = 50_000;

  // Diagonala proiectiei, pentru gradientul pe o axa.
  let uMin = Infinity, uMax = -Infinity;
  if (p.model === "gradientAxa") {
    for (let i = 0; i < n; i += 1) {
      const [u0, v0] = proiecteaza(pr, centre[i * 3] - cx, centre[i * 3 + 1] - cy, centre[i * 3 + 2] - cz, normale[i * 3], normale[i * 3 + 1], normale[i * 3 + 2], raza);
      const u = u0 * cos - v0 * sin;
      if (u < uMin) uMin = u;
      if (u > uMax) uMax = u;
    }
  }
  const razaMax = Math.hypot(cutie.max[0] - cutie.min[0], cutie.max[2] - cutie.min[2]) / 2 || 1;

  for (let i = 0; i < n; i += 1) {
    if (progres && i % pasProgres === 0 && i > 0 && progres(i / n) === false) return null;
    const x = centre[i * 3] - cx, y = centre[i * 3 + 1] - cy, z = centre[i * 3 + 2] - cz;
    const [u0, v0] = proiecteaza(pr, x, y, z, normale[i * 3], normale[i * 3 + 1], normale[i * 3 + 2], raza);
    const u = u0 * cos - v0 * sin;
    const v = u0 * sin + v0 * cos;
    let r = 0;
    switch (p.model) {
      case "dungi":
      case "dungiOblice":
        r = nivel(u / s);
        break;
      case "spirala":
        // dungi infasurate pe cilindru, urcand cu un pas de k dungi pe o tura
        r = nivel((u + v * Math.tan(Math.max(5, Math.min(85, p.unghi || 30)) * Math.PI / 180)) / s);
        break;
      case "carouri":
        r = nivel(Math.floor(u / s) + Math.floor(v / s));
        break;
      case "buline":
      case "fulgi":
      case "inimi":
      case "stele": {
        const ci = Math.floor(u / s), cj = Math.floor(v / s);
        const lx = ((u / s - ci) * 2 - 1) / Math.max(0.1, dens), ly = ((v / s - cj) * 2 - 1) / Math.max(0.1, dens);
        const inauntru = p.model === "buline" ? lx * lx + ly * ly <= 1
          : p.model === "fulgi" ? inFulg(lx, ly)
            : p.model === "inimi" ? inInima(lx, ly)
              : inStea(lx, ly);
        r = inauntru ? (k === 1 ? 0 : 1 + Math.floor(hash2(ci, cj, seed) * (k - 1))) : 0;
        break;
      }
      case "valuri":
        r = nivel((v + s * 0.6 * Math.sin((u / (s * 2.2)) * Math.PI * 2)) / s);
        break;
      case "zigzag": {
        const t = mod(u / (s * 2), 1);
        r = nivel((v + s * 0.8 * (Math.abs(t * 2 - 1) * 2 - 1)) / s);
        break;
      }
      case "gradientInaltime":
        r = Math.min(k - 1, Math.floor(((centre[i * 3 + 1] - cutie.min[1]) / inaltime) * k));
        break;
      case "gradientRadial":
        r = Math.min(k - 1, Math.floor((Math.hypot(x, z) / razaMax) * k));
        break;
      case "gradientAxa":
        r = Math.min(k - 1, Math.floor(((u - uMin) / Math.max(1e-6, uMax - uMin)) * k));
        break;
      case "camuflaj": {
        const f = fbm(u / (s * 3), v / (s * 3), seed);
        // contrastul (densitatea) intinde valorile in jurul mijlocului
        const c = Math.min(0.999, Math.max(0, (f - 0.5) * (1 + dens * 2.5) + 0.5));
        r = Math.floor(c * k);
        break;
      }
      case "marmura": {
        const turb = fbm(u / (s * 2), v / (s * 2), seed) * (2 + dens * 10);
        const val = (Math.sin(u / s + turb) + 1) / 2;
        r = Math.min(k - 1, Math.floor(val * k));
        break;
      }
      case "voronoi": {
        const ci = Math.floor(u / s), cj = Math.floor(v / s);
        let best = Infinity, celula = 0;
        for (let a = -1; a <= 1; a += 1) for (let b = -1; b <= 1; b += 1) {
          const px = ci + a + hash2(ci + a, cj + b, seed), py = cj + b + hash2(ci + a, cj + b, seed + 17);
          const d = (u / s - px) ** 2 + (v / s - py) ** 2;
          if (d < best) { best = d; celula = Math.floor(hash2(ci + a, cj + b, seed + 31) * k); }
        }
        r = celula;
        break;
      }
      case "hexagoane": {
        // coordonate axiale pe o grila de hexagoane cu latura s
        const q = ((Math.sqrt(3) / 3) * u - (1 / 3) * v) / s;
        const rr = ((2 / 3) * v) / s;
        let rx = Math.round(q), rz = Math.round(rr);
        const ry = Math.round(-q - rr);
        const dx = Math.abs(rx - q), dy = Math.abs(ry - (-q - rr)), dz = Math.abs(rz - rr);
        if (dx > dy && dx > dz) rx = -ry - rz;
        else if (!(dy > dz)) rz = -rx - ry;
        r = k >= 3 ? mod(rx - rz, 3) % k : mod(rx + rz * 2, k);
        break;
      }
      case "lemn": {
        const d = Math.hypot(u, v) / s + fbm(u / (s * 4), v / (s * 4), seed) * (1 + dens * 4);
        r = nivel(d);
        break;
      }
    }
    out[i] = r;
  }
  progres?.(1);
  return out;
}

/** Cutia unei multimi de varfuri (x,y,z). */
export function cutieVarfuri(varfuri: Float32Array): Cutie {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < varfuri.length; i += 3) for (let k = 0; k < 3; k += 1) {
    const v = varfuri[i + k];
    if (v < min[k]) min[k] = v;
    if (v > max[k]) max[k] = v;
  }
  if (varfuri.length === 0) return { min: [0, 0, 0], max: [0, 0, 0] };
  return { min, max };
}

export function esteParametriModel(v: unknown): v is ParametriModel {
  if (!v || typeof v !== "object") return false;
  const x = v as Record<string, unknown>;
  return MODELE.includes(x.model as Model) && PROIECTII.includes(x.proiectie as Proiectie)
    && ["marime", "unghi", "densitate", "seed", "culori"].every((k) => typeof x[k] === "number" && Number.isFinite(x[k] as number));
}
