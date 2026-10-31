import { pictureShapePart } from "@/lib/pictureIcon";
import { shrinkRaster, traceMaskRings, traceRasterRings, RASTER_TRACE_EMPTY, type RasterPixels } from "@/lib/rasterTrace";
import { LOGO } from "@/magic3d/logo/config";

/*
 * Logo / desen -> contururi: partea din imagine care devine obiect, ca inele inchise in pixelii
 * imaginii (x la dreapta, y in jos). Fara DOM, deci ruleaza in workerul logo.worker.ts.
 *
 * Monocrom: partea inchisa sau cea deschisa (alegerea automata a editorului, cu "Inverseaza").
 * Multicolor: culorile imaginii reduse la cele mai importante (k-means), fundalul fiind culoarea
 * de pe margini sau transparenta; fiecare culoare ramasa e un strat cu inelele ei. Silueta (tot ce
 * nu e fundal) da baza brelocului si forma de prajitura.
 */

export type InelPx = Array<{ x: number; y: number }>;

export type StratLogo = { culoare: string; inele: InelPx[]; pixeli: number };

export type TrasareLogo = {
  /** Marimea imaginii asa cum a fost conturata (micsorata la `maxLatura`). */
  latime: number;
  inaltime: number;
  /** Straturile de culoare, de la cel mai mare la cel mai mic; unul singur la monocrom. */
  straturi: StratLogo[];
  /** Tot obiectul, fara gauri intre culori: baza brelocului, forma de prajitura. */
  silueta: InelPx[];
};

export type OptiuniTrasare = {
  /** 1 = monocrom; 2-4 = atatea culori din imagine, fiecare corp separat. */
  culori: number;
  /** Pragul dintre inchis si deschis la monocrom, 0.05-0.95. */
  prag: number;
  /** De cate ori se netezeste marginea inainte de contur (0-4). */
  netezire: number;
  /** Petele mai mici de atat, in procente din imagine, se lasa deoparte (0-2). */
  zgomot: number;
  /** Monocrom: partea deschisa in loc de cea inchisa (sau invers fata de alegerea automata). */
  inversare: boolean;
  /** Latura maxima, in pixeli, la care se micsoreaza imaginea inainte de contur. */
  maxLatura: number;
};

export const OPTIUNI_IMPLICITE: OptiuniTrasare = { culori: 1, prag: 0.5, netezire: 1, zgomot: 0.05, inversare: false, maxLatura: LOGO.maxLaturaPx };

const hex = (r: number, g: number, b: number) => `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`;

/** Aria petelor lasate deoparte, in pixeli patrati, din procentul cerut. */
const pragZgomot = (optiuni: OptiuniTrasare, latime: number, inaltime: number) => Math.max(3, (latime * inaltime * Math.max(0, optiuni.zgomot)) / 100);

/** Imaginea conturata dupa optiuni. Arunca RASTER_TRACE_EMPTY cand nu ramane nimic de conturat. */
export function traseazaLogo(sursa: RasterPixels, optiuni: OptiuniTrasare = OPTIUNI_IMPLICITE): TrasareLogo {
  const pixeli = shrinkRaster(sursa, optiuni.maxLatura);
  const culori = Math.round(Math.min(LOGO.maxCulori, Math.max(1, optiuni.culori)));
  return culori === 1 ? monocrom(pixeli, optiuni) : multicolor(pixeli, culori, optiuni);
}

function monocrom(pixeli: RasterPixels, optiuni: OptiuniTrasare): TrasareLogo {
  const automat = pictureShapePart(pixeli);
  const parte = optiuni.inversare ? (automat === "dark" ? "light" : "dark") : automat;
  const { rings } = traceRasterRings(pixeli, {
    part: parte,
    threshold: optiuni.prag,
    smoothing: optiuni.netezire,
    minSpeck: pragZgomot(optiuni, pixeli.width, pixeli.height),
    maxSegments: LOGO.maxSegmente,
    maxSide: optiuni.maxLatura,
  });
  return { latime: pixeli.width, inaltime: pixeli.height, straturi: [{ culoare: LOGO.culoareRelief, inele: rings, pixeli: pixeli.width * pixeli.height }], silueta: rings };
}

/** Centrele culorilor (k-means in RGB, pornire determinista): mereu aceleasi straturi pentru aceeasi imagine. */
function centreCulori(esantion: number[][], k: number): number[][] {
  const centre: number[][] = [esantion[0]];
  while (centre.length < k) {
    // Urmatorul centru: culoarea cea mai departe de cele alese (pornire "farthest point").
    let departe = esantion[0];
    let distanta = -1;
    for (const culoare of esantion) {
      const d = Math.min(...centre.map((c) => (c[0] - culoare[0]) ** 2 + (c[1] - culoare[1]) ** 2 + (c[2] - culoare[2]) ** 2));
      if (d > distanta) { distanta = d; departe = culoare; }
    }
    if (distanta <= 0) break;
    centre.push(departe);
  }
  for (let pas = 0; pas < 12; pas += 1) {
    const suma = centre.map(() => [0, 0, 0, 0]);
    for (const culoare of esantion) {
      const i = celMaiApropiat(centre, culoare[0], culoare[1], culoare[2]);
      suma[i][0] += culoare[0]; suma[i][1] += culoare[1]; suma[i][2] += culoare[2]; suma[i][3] += 1;
    }
    suma.forEach((s, i) => { if (s[3]) centre[i] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]]; });
  }
  return centre;
}

function celMaiApropiat(centre: number[][], r: number, g: number, b: number) {
  let ales = 0;
  let distanta = Infinity;
  centre.forEach((c, i) => {
    const d = (c[0] - r) ** 2 + (c[1] - g) ** 2 + (c[2] - b) ** 2;
    if (d < distanta) { distanta = d; ales = i; }
  });
  return ales;
}

function multicolor(pixeli: RasterPixels, culori: number, optiuni: OptiuniTrasare): TrasareLogo {
  const { width, height, data } = pixeli;
  const total = width * height;
  const opac = (i: number) => data[i * 4 + 3] >= 128;
  const peMargine = (i: number) => { const x = i % width; const y = Math.floor(i / width); return x === 0 || y === 0 || x === width - 1 || y === height - 1; };
  // Fundal transparent: atunci nicio culoare nu e fundal, toate sunt straturi.
  let marginiTransparente = 0;
  let margini = 0;
  for (let i = 0; i < total; i += 1) if (peMargine(i)) { margini += 1; if (!opac(i)) marginiTransparente += 1; }
  const fundalTransparent = marginiTransparente > margini / 2;
  const k = fundalTransparent ? culori : culori + 1;

  const pas = Math.max(1, Math.floor(total / 20000));
  const esantion: number[][] = [];
  for (let i = 0; i < total; i += pas) if (opac(i)) esantion.push([data[i * 4], data[i * 4 + 1], data[i * 4 + 2]]);
  if (!esantion.length) throw new Error(RASTER_TRACE_EMPTY);
  const centre = centreCulori(esantion, k);

  const eticheta = new Int16Array(total).fill(-1);
  const numar = new Array(centre.length).fill(0);
  const peMarginiNumar = new Array(centre.length).fill(0);
  for (let i = 0; i < total; i += 1) {
    if (!opac(i)) continue;
    const c = celMaiApropiat(centre, data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
    eticheta[i] = c;
    numar[c] += 1;
    if (peMargine(i)) peMarginiNumar[c] += 1;
  }
  const fundal = fundalTransparent ? -1 : peMarginiNumar.indexOf(Math.max(...peMarginiNumar));
  const zgomot = pragZgomot(optiuni, width, height);
  const segmente = Math.max(200, Math.floor(LOGO.maxSegmente / centre.length));

  const masca = (contine: (c: number) => boolean) => {
    const out = new Float32Array(total);
    for (let i = 0; i < total; i += 1) if (eticheta[i] >= 0 && contine(eticheta[i])) out[i] = 1;
    return { width, height, data: out };
  };
  const contur = (contine: (c: number) => boolean) => {
    try {
      return traceMaskRings(masca(contine), { smoothing: optiuni.netezire, minSpeck: zgomot, maxSegments: segmente });
    } catch (error) {
      if (error instanceof Error && error.message === RASTER_TRACE_EMPTY) return [];
      throw error;
    }
  };

  const straturi: StratLogo[] = centre
    .map((c, i) => ({ i, c }))
    .filter(({ i }) => i !== fundal && numar[i] > 0)
    .sort((a, b) => numar[b.i] - numar[a.i])
    .map(({ i, c }) => ({ culoare: hex(c[0], c[1], c[2]), inele: contur((e) => e === i), pixeli: numar[i] }))
    .filter((strat) => strat.inele.length > 0);
  if (!straturi.length) throw new Error(RASTER_TRACE_EMPTY);
  const silueta = contur((e) => e !== fundal);
  return { latime: width, inaltime: height, straturi, silueta: silueta.length ? silueta : straturi[0].inele };
}
