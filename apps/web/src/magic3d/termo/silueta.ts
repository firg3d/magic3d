import { shrinkRaster, traceMaskRings, RASTER_TRACE_EMPTY, type RasterPixels } from "@/lib/rasterTrace";

/*
 * Imaginea -> silueta pentru termoformare: doar conturul exterior conteaza, deci fundalul se scoate
 * (transparenta sau culoarea de pe margini) si tot ce ramane e forma. Fara DOM: ruleaza in worker
 * si in teste. Inelele sunt in pixelii imaginii micsorate (x la dreapta, y in jos).
 */

export type InelPx = Array<{ x: number; y: number }>;

export type OptiuniSilueta = {
  /** "Detaliu contur": 1 = neted, putine colturi; 5 = urmareste fidel marginea. */
  detaliu: number;
  /** Ia fundalul drept forma (cand imaginea e o forma deschisa pe fond inchis, de pilda). */
  inversare: boolean;
};

export const OPTIUNI_SILUETA: OptiuniSilueta = { detaliu: 3, inversare: false };

/** Ce inseamna fiecare treapta de detaliu: latura la care se contureaza, netezirea, petele lasate deoparte (% din imagine). */
export const DETALIU = [
  { latura: 300, netezire: 4, pete: 1, segmente: 300 },
  { latura: 450, netezire: 3, pete: 0.5, segmente: 500 },
  { latura: 600, netezire: 2, pete: 0.25, segmente: 800 },
  { latura: 800, netezire: 1, pete: 0.1, segmente: 1100 },
  { latura: 1000, netezire: 0, pete: 0.05, segmente: 1400 },
] as const;

/** Cat de departe (RGB) de culoarea fundalului trebuie sa fie un pixel ca sa fie forma. */
const PRAG_FUNDAL = 48;

export type Silueta = { latime: number; inaltime: number; inele: InelPx[] };

export function siluetaDinPixeli(sursa: RasterPixels, optiuni: OptiuniSilueta = OPTIUNI_SILUETA): Silueta {
  const treapta = DETALIU[Math.max(0, Math.min(DETALIU.length - 1, Math.round(optiuni.detaliu) - 1))];
  const pixeli = shrinkRaster(sursa, treapta.latura);
  const { width, height, data } = pixeli;
  const total = width * height;
  const peMargine = (i: number) => {
    const x = i % width;
    const y = (i - x) / width;
    return x === 0 || y === 0 || x === width - 1 || y === height - 1;
  };
  // Fundalul: transparent cand majoritatea marginii e transparenta; altfel culoarea mediana a marginii.
  const margine: number[] = [];
  let transparente = 0;
  for (let i = 0; i < total; i += 1) {
    if (!peMargine(i)) continue;
    margine.push(i);
    if (data[i * 4 + 3] < 128) transparente += 1;
  }
  const fundalTransparent = transparente > margine.length / 2;
  const mediana = (canal: number) => {
    const valori = margine.filter((i) => data[i * 4 + 3] >= 128).map((i) => data[i * 4 + canal]).sort((a, b) => a - b);
    return valori.length ? valori[Math.floor(valori.length / 2)] : 255;
  };
  const fundal = [mediana(0), mediana(1), mediana(2)];
  const masca = new Float32Array(total);
  for (let i = 0; i < total; i += 1) {
    const opac = data[i * 4 + 3] >= 128;
    let forma = opac;
    if (opac && !fundalTransparent) {
      const d = Math.hypot(data[i * 4] - fundal[0], data[i * 4 + 1] - fundal[1], data[i * 4 + 2] - fundal[2]);
      forma = d > PRAG_FUNDAL;
    }
    masca[i] = (optiuni.inversare ? !forma : forma) ? 1 : 0;
  }
  const inele = traceMaskRings({ width, height, data: masca }, {
    smoothing: treapta.netezire,
    minSpeck: Math.max(3, (total * treapta.pete) / 100),
    maxSegments: treapta.segmente,
  });
  if (!inele.length) throw new Error(RASTER_TRACE_EMPTY);
  return { latime: width, inaltime: height, inele };
}

/** Inelele in pixeli -> puncte cu y in sus (unitatea nu conteaza: geometria scaleaza la latimea ceruta). */
export const ineleCuYSus = (inele: InelPx[]): Array<Array<[number, number]>> => inele.map((inel) => inel.map((p) => [p.x, -p.y] as [number, number]));
