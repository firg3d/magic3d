/*
 * Desenul colorat pe plasa: din aceeasi poza ca silueta se scot zonele de culoare. Poza se reduce
 * la cate culori duce imprimanta aleasa, cu aceeasi logica si aceeasi paleta ca modul Pictura
 * (sistemul multicolor da limita; culorile se aleg in OKLab din filamentele atelierului sau din
 * culorile pozei). Fiecare culoare devine un set de inele in cadrul siluetei (pixelii ei, y in sus),
 * ca geometria sa le aseze exact peste forma.
 *
 * Fara DOM: ruleaza in workerul termoformarii si in teste.
 */
import { shrinkRaster, traceMaskRings, type RasterPixels } from "@/lib/rasterTrace";
import { FARA, reduceImagine } from "@/magic3d/pictura/imagine";
import { limitaCulori, sistem } from "@/magic3d/pictura/imprimante";
import { PALETA_ATELIER } from "@/magic3d/pictura/paleta";
import type { SetariTermo } from "@/magic3d/termo/config";

type Inel = Array<[number, number]>;

export type StraturiCulori = {
  /** Culorile alese, "#rrggbb"; prima e baza (zona cea mai mare), pe care se printeaza plasa insasi. */
  culori: string[];
  /** Pe culoare, inelele zonelor ei, in cadrul siluetei, y in sus (la baza: gol, ea e toata forma). */
  inele: Inel[][];
};

/** Latura la care se micsoreaza poza pentru culori: detaliile mai mici oricum se pierd in plasa. */
const LATURA = 320;

/** Cate culori duce imprimanta aleasa (cel putin doua: plasa si un desen). */
export const culoriMaxime = (setari: Pick<SetariTermo, "sistemCulori">) => Math.max(2, limitaCulori(sistem(setari.sistemCulori)));

/** Cate culori are desenul, plasa inclusa: cele cerute, niciodata peste limita imprimantei. */
export const numarCulori = (setari: Pick<SetariTermo, "sistemCulori" | "culori">) => {
  const max = culoriMaxime(setari);
  return Math.max(2, Math.min(max, setari.culori > 0 ? Math.round(setari.culori) : max));
};

/** Fundalul pozei, ca la silueta: transparent, sau culoarea mediana de pe margine. */
function fundal(p: RasterPixels): string | undefined {
  const { width: w, height: h, data } = p;
  const margine: number[] = [];
  let transparente = 0;
  for (let i = 0; i < w * h; i += 1) {
    const x = i % w, y = (i - x) / w;
    if (x && y && x < w - 1 && y < h - 1) continue;
    margine.push(i);
    if (data[i * 4 + 3] < 128) transparente += 1;
  }
  if (transparente > margine.length / 2) return undefined;
  const mediana = (c: number) => {
    const v = margine.filter((i) => data[i * 4 + 3] >= 128).map((i) => data[i * 4 + c]).sort((a, b) => a - b);
    return v.length ? v[Math.floor(v.length / 2)] : 255;
  };
  return "#" + [mediana(0), mediana(1), mediana(2)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

/**
 * Zonele de culoare ale pozei. `cadru` e marimea siluetei (in pixelii ei), ca inelele sa cada in
 * acelasi loc. Null cand poza nu are culori in afara fundalului.
 */
export function straturiCulori(pixeli: RasterPixels, cadru: { latime: number; inaltime: number }, setari: SetariTermo): StraturiCulori | null {
  const p = shrinkRaster(pixeli, LATURA);
  const paleta = setari.paletaCulori === "atelier" ? PALETA_ATELIER.filamente.filter((f) => f.disponibil).map((f) => f.hex) : [];
  const redusa = reduceImagine(p.data, p.width, p.height, paleta, numarCulori(setari), fundal(p));
  if (redusa.culori.length < 2) return null;
  const k = cadru.latime / p.width;
  const total = p.width * p.height;
  const numar = redusa.culori.map((_, c) => redusa.index.reduce((s, x) => s + (x === c ? 1 : 0), 0));
  const ordine = redusa.culori.map((_, c) => c).sort((a, b) => numar[b] - numar[a]);
  const inele = ordine.map((c, poz) => {
    if (poz === 0) return [];
    const masca = new Float32Array(total);
    for (let i = 0; i < total; i += 1) masca[i] = redusa.index[i] === c && redusa.index[i] !== FARA ? 1 : 0;
    try {
      return traceMaskRings({ width: p.width, height: p.height, data: masca }, { smoothing: 1, minSpeck: Math.max(4, total * 0.0008), maxSegments: 900 })
        .map((inel) => inel.map(({ x, y }) => [x * k, -y * k] as [number, number]));
    } catch {
      return []; // o culoare doar din pete foarte mici: s-ar pierde in plasa
    }
  });
  const pastrate = ordine.map((c, i) => ({ culoare: redusa.culori[c], inele: inele[i] })).filter((s, i) => i === 0 || s.inele.length > 0);
  if (pastrate.length < 2) return null;
  return { culori: pastrate.map((s) => s.culoare), inele: pastrate.map((s) => s.inele) };
}
