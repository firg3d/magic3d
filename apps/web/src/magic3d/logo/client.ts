import type { RasterPixels } from "@/lib/rasterTrace";
import type { CerereTrasare, RaspunsTrasare } from "@/magic3d/logo/logo.worker";
import type { OptiuniTrasare, TrasareLogo } from "@/magic3d/logo/trasare";

/*
 * Partea de pagina a conturarii: o singura cerere e "vie" - un prag mutat cu cursorul cere zeci pe
 * secunda, iar raspunsul unei cereri depasite e ignorat.
 */

let worker: Worker | null = null;
let urmatorul = 1;
let ultima = 0;
const asteptari = new Map<number, { resolve: (t: TrasareLogo | null) => void; reject: (e: Error) => void }>();

function porneste(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL("./logo.worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (event: MessageEvent<RaspunsTrasare>) => {
    const raspuns = event.data;
    const asteptare = asteptari.get(raspuns.id);
    if (!asteptare) return;
    asteptari.delete(raspuns.id);
    // O cerere depasita de una mai noua nu mai conteaza.
    if (raspuns.id !== ultima) asteptare.resolve(null);
    else if (raspuns.ok) asteptare.resolve(raspuns.trasare);
    else asteptare.reject(new Error(raspuns.eroare));
  };
  worker.onerror = (event) => {
    for (const [, asteptare] of asteptari) asteptare.reject(new Error(event.message || "logo worker"));
    asteptari.clear();
    worker?.terminate();
    worker = null;
  };
  return worker;
}

/** Un SVG ca pixeli, desenat in pagina (browserele nu decodeaza SVG in workeri), la latura ceruta. */
export async function pixeliDinSvg(text: string, latura: number): Promise<RasterPixels> {
  const url = URL.createObjectURL(new Blob([text], { type: "image/svg+xml" }));
  try {
    const imagine = new Image();
    imagine.src = url;
    await imagine.decode();
    const latime0 = imagine.naturalWidth || 1000;
    const inaltime0 = imagine.naturalHeight || 1000;
    const factor = latura / Math.max(latime0, inaltime0);
    const latime = Math.max(1, Math.round(latime0 * factor));
    const inaltime = Math.max(1, Math.round(inaltime0 * factor));
    const panza = document.createElement("canvas");
    panza.width = latime;
    panza.height = inaltime;
    const context = panza.getContext("2d");
    if (!context) throw new Error("canvas");
    context.drawImage(imagine, 0, 0, latime, inaltime);
    return { width: latime, height: inaltime, data: context.getImageData(0, 0, latime, inaltime).data };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Conturul unei imagini; null cand intre timp a fost ceruta alta conturare. */
export function traseaza(sursa: { fisier: Blob } | { pixeli: RasterPixels }, optiuni: OptiuniTrasare): Promise<TrasareLogo | null> {
  const id = urmatorul++;
  ultima = id;
  const cerere: CerereTrasare = { id, optiuni, ...sursa };
  return new Promise((resolve, reject) => {
    asteptari.set(id, { resolve, reject });
    porneste().postMessage(cerere);
  });
}
