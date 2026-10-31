import type { RasterPixels } from "@/lib/rasterTrace";
import { blurGreyImage, sampleGreyImage, type GreyImage } from "@/lib/surfaceTextureImages";

/*
 * Poza -> relief / litofanie: luminozitatea imaginii ca grosime, pe o grila de puncte, inchisa
 * etans (fata cu relief, spatele, peretii de la margine), fara DOM - ruleaza in relief.worker.ts.
 *
 * Litofanie: unde poza e inchisa, peretele e gros (lumina trece putin), unde e deschisa, subtire.
 * Relief pe placa: baza plus o inaltime dupa luminozitate (portrete, peisaje, animale).
 * Plata si inima stau culcate pe placa (inima e grila taiata dupa contur); curbata si cilindrul
 * (lampa) stau in picioare: grila e indoita pe un arc, cu fata neteda in afara si relieful inauntru.
 */

export type ModRelief = "litofanie" | "relief";
export type FormaRelief = "plata" | "curbata" | "cilindru" | "inima";

export type SetariRelief = {
  mod: ModRelief;
  forma: FormaRelief;
  /** Latimea pozei pe obiect, in mm (la cilindru: circumferinta). */
  latime: number;
  /** Litofanie: grosimea unde poza e alba, si unde e neagra. */
  grosimeMin: number;
  grosimeMax: number;
  /** Relief: grosimea bazei si cat urca relieful peste ea. */
  baza: number;
  inaltime: number;
  /** Relief: deschis = sus (altfel inchis = sus). */
  inaltDeschis: boolean;
  /** Bordura plina de jur imprejur, in mm (0 = fara). */
  bordura: number;
  /** Distanta dintre puncte, in mm: mai mic = mai fin, mai multe triunghiuri. */
  rezolutie: number;
  /** Curbata: cat de mult se indoaie, in grade de arc. */
  arc: number;
  /** Netezirea pozei, in trepte de un sfert de mm pe obiect (0 = deloc). */
  netezire: number;
};

export const SETARI_RELIEF_IMPLICITE: Record<ModRelief, SetariRelief> = {
  litofanie: { mod: "litofanie", forma: "plata", latime: 100, grosimeMin: 0.8, grosimeMax: 3.2, baza: 2, inaltime: 3, inaltDeschis: true, bordura: 3, rezolutie: 0.3, arc: 120, netezire: 0 },
  relief: { mod: "relief", forma: "plata", latime: 100, grosimeMin: 0.8, grosimeMax: 3.2, baza: 2, inaltime: 3, inaltDeschis: true, bordura: 3, rezolutie: 0.3, arc: 120, netezire: 1 },
};

export const LIMITE_RELIEF = {
  latime: [20, 250],
  grosimeMin: [0.4, 5],
  grosimeMax: [1, 10],
  baza: [0.6, 10],
  inaltime: [0.4, 15],
  bordura: [0, 15],
  rezolutie: [0.15, 1],
  arc: [30, 300],
  netezire: [0, 4],
} as const;

/** Peste atatea triunghiuri obiectul devine greu de lucrat si de exportat: rezolutia se mareste singura. */
export const MAX_TRIUNGHIURI = 600_000;
/** De la atatea triunghiuri panoul avertizeaza ca exportul si printul vor fi lente. */
export const AVERTISMENT_TRIUNGHIURI = 300_000;
/** Poza e micsorata la cel mult atatea puncte pe latura mare inainte de a fi citita. */
export const MAX_LATURA_RELIEF = 1600;

/** Luminozitatea pozei (0 negru - 255 alb), micsorata la `maxLatura`; transparentul conteaza ca alb. */
export function hartaGri(pixeli: RasterPixels, maxLatura = MAX_LATURA_RELIEF): GreyImage {
  const factor = Math.min(1, maxLatura / Math.max(pixeli.width, pixeli.height));
  const latime = Math.max(2, Math.round(pixeli.width * factor));
  const inaltime = Math.max(2, Math.round(pixeli.height * factor));
  const data = new Uint8Array(latime * inaltime);
  for (let y = 0; y < inaltime; y += 1) {
    const sy = Math.min(pixeli.height - 1, Math.floor((y + 0.5) / factor));
    for (let x = 0; x < latime; x += 1) {
      const sx = Math.min(pixeli.width - 1, Math.floor((x + 0.5) / factor));
      const i = (sy * pixeli.width + sx) * 4;
      const alfa = pixeli.data[i + 3] / 255;
      const lum = 0.2126 * pixeli.data[i] + 0.7152 * pixeli.data[i + 1] + 0.0722 * pixeli.data[i + 2];
      data[y * latime + x] = Math.round(lum * alfa + 255 * (1 - alfa));
    }
  }
  return { width: latime, height: inaltime, data };
}

export type Grila = {
  /** Celule pe latime si pe inaltimea pozei. */
  nx: number;
  nz: number;
  /** Pasul folosit, in mm (poate fi mai mare decat cel cerut, ca sa nu treaca de MAX_TRIUNGHIURI). */
  pas: number;
  /** Marimea pozei pe obiect, in mm. */
  latime: number;
  adancime: number;
  /** Grosimea in fiecare punct, (nx+1) x (nz+1), rand dupa rand de sus. */
  grosimi: Float32Array;
  /** Ce celule fac parte din obiect (inima taie restul), nx x nz. */
  masca: Uint8Array;
  /** Celulele se continua de la ultima coloana la prima (cilindrul). */
  inchisaPeLatime: boolean;
  /** Pasul a fost marit fata de cel cerut. */
  simplificata: boolean;
};

/** Triunghiurile pe care le-ar avea obiectul la pasul dat (4 pe celula, plus peretii de margine). */
export function triunghiuriEstimate(nx: number, nz: number) {
  return 4 * nx * nz + 4 * (nx + nz);
}

/** Pasul cerut, sau unul mai mare daca altfel obiectul ar trece de MAX_TRIUNGHIURI. */
export function pasFolosit(latime: number, adancime: number, rezolutie: number, maxTriunghiuri = MAX_TRIUNGHIURI) {
  const minim = Math.sqrt((4 * latime * adancime) / maxTriunghiuri);
  return Math.max(rezolutie, minim);
}

/** Inima clasica, (x^2 + y^2 - 1)^3 - x^2 y^3 <= 0, intinsa pe dreptunghiul pozei. */
function inInima(u: number, v: number) {
  const x = (u - 0.5) * 2.5;
  const y = (0.5 - v) * 2.5 + 0.2;
  return (x * x + y * y - 1) ** 3 - x * x * y ** 3 <= 0;
}

/** Grosimile pe grila, dupa poza si setari. `pas` il poate fixa apelantul (previzualizarea). */
export function grilaGrosimi(gri: GreyImage, setari: SetariRelief, pasCerut?: number): Grila {
  const latime = setari.latime;
  const adancime = (latime * gri.height) / gri.width;
  const pas = pasCerut ?? pasFolosit(latime, adancime, setari.rezolutie);
  const nx = Math.max(2, Math.round(latime / pas));
  const nz = Math.max(2, Math.round(adancime / pas));
  // Netezirea e in mm pe obiect (un sfert de mm pe treapta), deci arata la fel in previzualizare si in obiect.
  const razaPx = (setari.netezire * 0.25 * gri.width) / latime;
  const imagine = razaPx >= 0.5 ? blurGreyImage(gri, razaPx) : gri;
  const inchisaPeLatime = setari.forma === "cilindru";
  const masca = new Uint8Array(nx * nz).fill(1);
  if (setari.forma === "inima") for (let j = 0; j < nz; j += 1) for (let i = 0; i < nx; i += 1) masca[j * nx + i] = inInima((i + 0.5) / nx, (j + 0.5) / nz) ? 1 : 0;

  // Distanta (in celule) pana la marginea obiectului, pentru bordura: margine dreptunghi sau contur de inima.
  const bordura = setari.bordura > 0 ? Math.max(1, Math.round(setari.bordura / pas)) : 0;
  const pePrag = new Uint8Array(nx * nz);
  if (bordura > 0) {
    const distanta = new Int32Array(nx * nz).fill(-1);
    const coada: number[] = [];
    for (let j = 0; j < nz; j += 1) {
      for (let i = 0; i < nx; i += 1) {
        const k = j * nx + i;
        if (!masca[k]) continue;
        const laMargineZ = j === 0 || j === nz - 1;
        const laMargineX = !inchisaPeLatime && (i === 0 || i === nx - 1);
        const vecinAfara = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([di, dj]) => {
          let ii = i + di;
          const jj = j + dj;
          if (inchisaPeLatime) ii = (ii + nx) % nx;
          return ii >= 0 && ii < nx && jj >= 0 && jj < nz && !masca[jj * nx + ii];
        });
        if (laMargineZ || laMargineX || vecinAfara) { distanta[k] = 0; coada.push(k); }
      }
    }
    for (let q = 0; q < coada.length; q += 1) {
      const k = coada[q];
      const i = k % nx;
      const j = Math.floor(k / nx);
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        let ii = i + di;
        const jj = j + dj;
        if (inchisaPeLatime) ii = (ii + nx) % nx;
        if (ii < 0 || ii >= nx || jj < 0 || jj >= nz) continue;
        const kk = jj * nx + ii;
        if (!masca[kk] || distanta[kk] >= 0) continue;
        distanta[kk] = distanta[k] + 1;
        coada.push(kk);
      }
    }
    for (let k = 0; k < pePrag.length; k += 1) if (distanta[k] >= 0 && distanta[k] < bordura) pePrag[k] = 1;
  }

  const plin = setari.mod === "litofanie" ? setari.grosimeMax : setari.baza + setari.inaltime;
  const grosime = (lum: number) => {
    if (setari.mod === "litofanie") return setari.grosimeMax - (setari.grosimeMax - setari.grosimeMin) * lum;
    return setari.baza + setari.inaltime * (setari.inaltDeschis ? lum : 1 - lum);
  };
  const grosimi = new Float32Array((nx + 1) * (nz + 1));
  for (let j = 0; j <= nz; j += 1) {
    for (let i = 0; i <= nx; i += 1) {
      // Un punct e pe bordura cand oricare celula de langa el e.
      let bord = false;
      for (const [ci, cj] of [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]]) {
        let ii = ci;
        if (inchisaPeLatime) ii = (ii + nx) % nx;
        if (ii >= 0 && ii < nx && cj >= 0 && cj < nz && pePrag[cj * nx + ii]) bord = true;
      }
      const u = (inchisaPeLatime ? (i % nx) : i) / nx;
      grosimi[j * (nx + 1) + i] = bord ? plin : grosime(sampleGreyImage(imagine, u, 1 - j / nz, true));
    }
  }
  return { nx, nz, pas, latime, adancime, grosimi, masca, inchisaPeLatime, simplificata: pas > setari.rezolutie + 1e-9 };
}

type V3 = [number, number, number];

/**
 * Unde ajunge in spatiu punctul (i, j) al grilei la grosimea t: culcat pe placa (plata, inima, Y in
 * sus) sau indoit pe un arc in picioare (curbata, cilindru: fata neteda la raza R, relieful spre centru).
 */
function asezare(grila: Grila, setari: SetariRelief): (i: number, j: number, t: number) => V3 {
  const { nx, nz, latime, adancime } = grila;
  if (setari.forma === "plata" || setari.forma === "inima") {
    return (i, j, t) => [(i / nx - 0.5) * latime, t, (j / nz - 0.5) * adancime];
  }
  const unghiTotal = setari.forma === "cilindru" ? 2 * Math.PI : (Math.min(300, Math.max(30, setari.arc)) * Math.PI) / 180;
  const raza = latime / unghiTotal;
  return (i, j, t) => {
    const unghi = (i / nx - 0.5) * unghiTotal;
    const r = raza - t;
    return [r * Math.sin(unghi), (1 - j / nz) * adancime, r * Math.cos(unghi) - raza];
  };
}

/** Triunghiurile obiectului (fara indexuri, Y in sus, mm), inchise etans, cu normalele spre afara. */
export function triunghiuriRelief(grila: Grila, setari: SetariRelief): Float32Array {
  const { nx, nz, grosimi, masca, inchisaPeLatime } = grila;
  const loc = asezare(grila, setari);
  const coloana = (i: number) => (inchisaPeLatime ? i % nx : i);
  const t = (i: number, j: number) => grosimi[j * (nx + 1) + coloana(i)];
  const p = (i: number, j: number, sus: boolean) => loc(coloana(i), j, sus ? t(i, j) : 0);
  // Buffer care creste la nevoie: 6 colturi x 3 coordonate pe patrulater.
  let out = new Float32Array(Math.max(1024, triunghiuriEstimate(nx, nz) * 9));
  let n = 0;
  const pune = (v: V3) => {
    if (n + 3 > out.length) { const mai = new Float32Array(out.length * 2); mai.set(out); out = mai; }
    out[n] = v[0]; out[n + 1] = v[1]; out[n + 2] = v[2];
    n += 3;
  };

  // Patrulaterul a-b-c-d, intors asa incat fata sa priveasca dinspre punctul `interior`.
  const quad = (a: V3, b: V3, c: V3, d: V3, interior: V3) => {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const normala = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
    const centru = [(a[0] + b[0] + c[0] + d[0]) / 4, (a[1] + b[1] + c[1] + d[1]) / 4, (a[2] + b[2] + c[2] + d[2]) / 4];
    const afara = normala[0] * (centru[0] - interior[0]) + normala[1] * (centru[1] - interior[1]) + normala[2] * (centru[2] - interior[2]);
    const [q0, q1, q2, q3] = afara >= 0 ? [a, b, c, d] : [a, d, c, b];
    pune(q0); pune(q1); pune(q2); pune(q0); pune(q2); pune(q3);
  };
  const inCelula = (i: number, j: number) => {
    let ii = i;
    if (inchisaPeLatime) ii = (ii + nx) % nx;
    return ii >= 0 && ii < nx && j >= 0 && j < nz && masca[j * nx + ii] === 1;
  };

  for (let j = 0; j < nz; j += 1) {
    for (let i = 0; i < nx; i += 1) {
      if (!masca[j * nx + i]) continue;
      // Punctul din mijlocul celulei, la jumatatea grosimii: de la el se uita spre afara toate fetele celulei.
      const tm = (t(i, j) + t(i + 1, j) + t(i + 1, j + 1) + t(i, j + 1)) / 8;
      const interior = loc(i + 0.5, j + 0.5, tm);
      quad(p(i, j, true), p(i, j + 1, true), p(i + 1, j + 1, true), p(i + 1, j, true), interior);
      quad(p(i, j, false), p(i, j + 1, false), p(i + 1, j + 1, false), p(i + 1, j, false), interior);
      // Pereti unde celula vecina lipseste.
      if (!inCelula(i - 1, j)) quad(p(i, j, false), p(i, j + 1, false), p(i, j + 1, true), p(i, j, true), interior);
      if (!inCelula(i + 1, j)) quad(p(i + 1, j, false), p(i + 1, j + 1, false), p(i + 1, j + 1, true), p(i + 1, j, true), interior);
      if (!inCelula(i, j - 1)) quad(p(i, j, false), p(i + 1, j, false), p(i + 1, j, true), p(i, j, true), interior);
      if (!inCelula(i, j + 1)) quad(p(i, j + 1, false), p(i + 1, j + 1, false), p(i + 1, j + 1, true), p(i, j + 1, true), interior);
    }
  }
  return out.slice(0, n);
}

/**
 * Previzualizarea: litofania cu lumina din spate (lumina trece dupa grosime, exponential, in
 * alb cald), relieful luminat de sus-stanga. RGBA, cate un pixel pe celula.
 */
export function previzualizare(grila: Grila, setari: SetariRelief): { width: number; height: number; data: Uint8ClampedArray } {
  const { nx, nz, grosimi, masca, pas } = grila;
  const data = new Uint8ClampedArray(nx * nz * 4);
  const t = (i: number, j: number) => grosimi[Math.min(nz, Math.max(0, j)) * (nx + 1) + Math.min(nx, Math.max(0, i))];
  // Cat de mult opreste lumina peretele: la grosimea maxima trece cam o douasprezecime.
  const k = Math.log(12) / Math.max(0.1, setari.grosimeMax - setari.grosimeMin);
  for (let j = 0; j < nz; j += 1) {
    for (let i = 0; i < nx; i += 1) {
      const o = (j * nx + i) * 4;
      if (!masca[j * nx + i]) continue;
      const gros = (t(i, j) + t(i + 1, j) + t(i, j + 1) + t(i + 1, j + 1)) / 4;
      if (setari.mod === "litofanie") {
        const lumina = Math.exp(-k * Math.max(0, gros - setari.grosimeMin));
        data[o] = 255 * lumina;
        data[o + 1] = 236 * lumina;
        data[o + 2] = 200 * lumina;
      } else {
        const dx = (t(i + 1, j) - t(i - 1, j)) / (2 * pas);
        const dz = (t(i, j + 1) - t(i, j - 1)) / (2 * pas);
        const lumina = Math.min(1, Math.max(0.15, 0.62 + 0.55 * (-dx * 0.7 - dz * 0.7) / Math.sqrt(1 + dx * dx + dz * dz)));
        data[o] = 235 * lumina;
        data[o + 1] = 240 * lumina;
        data[o + 2] = 236 * lumina;
      }
      data[o + 3] = 255;
    }
  }
  return { width: nx, height: nz, data };
}
