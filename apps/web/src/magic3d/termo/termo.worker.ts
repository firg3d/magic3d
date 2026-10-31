/// <reference lib="webworker" />
import type { ManifoldToplevel } from "manifold-3d";
import { getManifoldRuntime, setManifoldAssetBase } from "@/lib/editorMeshCore";
import type { RasterPixels } from "@/lib/rasterTrace";
import { instrumenteazaArena, inArena } from "@/magic3d/core/geometry/arena";
import type { SetariTermo } from "@/magic3d/termo/config";
import { construiesteTermo, piesePrint, type Inele, type InfoTermo, type PieseTermo } from "@/magic3d/termo/geometrie";
import { siluetaDinPixeli, type OptiuniSilueta, type Silueta } from "@/magic3d/termo/silueta";

/*
 * Termoformarea in afara paginii: decodarea imaginii, silueta si cele trei piese (manifold, intr-o
 * arena, ca reconstructiile repetate sa nu umple heap-ul). Imaginea nu pleaca de aici; inapoi merg
 * inelele, triunghiurile pieselor si cotele.
 */

export type SursaTermo = { fisier: Blob } | { pixeli: RasterPixels };
export type CerereTermo =
  | { id: number; tip: "silueta"; sursa: number; date?: SursaTermo; optiuni: OptiuniSilueta }
  | { id: number; tip: "construieste"; inele: Inele; setari: SetariTermo; assetBase: string };
export type RaspunsTermo =
  | { id: number; ok: true; tip: "silueta"; silueta: Silueta }
  | { id: number; ok: true; tip: "construieste"; piese: PieseTermo; contur: Inele; zone: Inele; gura: Inele; info: InfoTermo; ms: number }
  | { id: number; ok: false; eroare: string };

let pixeliCache: { sursa: number; pixeli: RasterPixels } | null = null;
let instrumentat = false;

async function pixeliDinFisier(fisier: Blob): Promise<RasterPixels> {
  const imagine = await createImageBitmap(fisier);
  const factor = Math.min(1, 2000 / Math.max(imagine.width, imagine.height));
  const latime = Math.max(1, Math.round(imagine.width * factor));
  const inaltime = Math.max(1, Math.round(imagine.height * factor));
  const panza = new OffscreenCanvas(latime, inaltime);
  const context = panza.getContext("2d");
  if (!context) throw new Error("canvas");
  context.drawImage(imagine, 0, 0, latime, inaltime);
  imagine.close();
  return { width: latime, height: inaltime, data: context.getImageData(0, 0, latime, inaltime).data };
}

async function pixeli(cerere: Extract<CerereTermo, { tip: "silueta" }>): Promise<RasterPixels> {
  if (pixeliCache && pixeliCache.sursa === cerere.sursa) return pixeliCache.pixeli;
  if (!cerere.date) throw new Error("sursa");
  const decodati = "fisier" in cerere.date ? await pixeliDinFisier(cerere.date.fisier) : cerere.date.pixeli;
  pixeliCache = { sursa: cerere.sursa, pixeli: decodati };
  return decodati;
}

const trimite = (raspuns: RaspunsTermo, transfer: Transferable[] = []) => (self as unknown as DedicatedWorkerGlobalScope).postMessage(raspuns, transfer);

self.onmessage = async (event: MessageEvent<CerereTermo>) => {
  const cerere = event.data;
  try {
    if (cerere.tip === "silueta") {
      trimite({ id: cerere.id, ok: true, tip: "silueta", silueta: siluetaDinPixeli(await pixeli(cerere), cerere.optiuni) });
      return;
    }
    setManifoldAssetBase(cerere.assetBase);
    const mod = (await getManifoldRuntime()) as unknown as ManifoldToplevel;
    if (!instrumentat) {
      instrumenteazaArena(mod);
      instrumentat = true;
    }
    const start = performance.now();
    const rezultat = inArena(() => {
      const rez = construiesteTermo(mod, cerere.inele, cerere.setari);
      return { piese: piesePrint(rez), contur: rez.contur, zone: rez.zone, gura: rez.gura, info: rez.info };
    }, () => []);
    trimite({ id: cerere.id, ok: true, tip: "construieste", ...rezultat, ms: Math.round(performance.now() - start) }, [rezultat.piese.plasa.buffer, rezultat.piese.jos.buffer, rezultat.piese.sus.buffer]);
  } catch (error) {
    trimite({ id: cerere.id, ok: false, eroare: error instanceof Error ? error.message : String(error) });
  }
};
