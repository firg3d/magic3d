/// <reference lib="webworker" />
import type { RasterPixels } from "@/lib/rasterTrace";
import type { GreyImage } from "@/lib/surfaceTextureImages";
import { grilaGrosimi, hartaGri, pasFolosit, previzualizare, triunghiuriEstimate, triunghiuriRelief, type SetariRelief } from "@/magic3d/logo/relief";

/*
 * Relief / litofanie in afara paginii: decodarea pozei, grila si sutele de mii de triunghiuri.
 * Poza ultima decodata ramane aici (dupa `sursa`), ca o setare mutata sa nu o decodeze din nou; nu
 * pleaca nicaieri - inapoi merg previzualizarea si triunghiurile.
 */

export type SursaRelief = { fisier: Blob } | { pixeli: RasterPixels };
export type CerereRelief =
  | { id: number; tip: "previzualizare"; sursa: number; date?: SursaRelief; setari: SetariRelief }
  | { id: number; tip: "construieste"; sursa: number; date?: SursaRelief; setari: SetariRelief };
export type InfoRelief = { latime: number; adancime: number; pas: number; triunghiuri: number; simplificata: boolean };
export type RaspunsRelief =
  | { id: number; ok: true; tip: "previzualizare"; imagine: { width: number; height: number; data: Uint8ClampedArray }; info: InfoRelief }
  | { id: number; ok: true; tip: "construieste"; positions: Float32Array; info: InfoRelief }
  | { id: number; ok: false; eroare: string };

/** Cate puncte are previzualizarea pe latura mare: destul ca sa se vada poza, putin ca sa fie imediata. */
const PREVIZUALIZARE_PUNCTE = 240;

let cache: { sursa: number; gri: GreyImage } | null = null;

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

async function gri(cerere: CerereRelief): Promise<GreyImage> {
  if (cache && cache.sursa === cerere.sursa) return cache.gri;
  if (!cerere.date) throw new Error("sursa");
  const pixeli = "fisier" in cerere.date ? await pixeliDinFisier(cerere.date.fisier) : cerere.date.pixeli;
  cache = { sursa: cerere.sursa, gri: hartaGri(pixeli) };
  return cache.gri;
}

self.onmessage = async (event: MessageEvent<CerereRelief>) => {
  const cerere = event.data;
  try {
    const imagine = await gri(cerere);
    if (cerere.tip === "previzualizare") {
      const pasMare = Math.max(cerere.setari.rezolutie, cerere.setari.latime / PREVIZUALIZARE_PUNCTE);
      const mica = grilaGrosimi(imagine, cerere.setari, pasMare);
      // Ce ar avea obiectul construit, din dimensiuni, fara sa construim grila intreaga la fiecare mutare.
      const adancime = (cerere.setari.latime * imagine.height) / imagine.width;
      const pas = pasFolosit(cerere.setari.latime, adancime, cerere.setari.rezolutie);
      const nx = Math.max(2, Math.round(cerere.setari.latime / pas));
      const nz = Math.max(2, Math.round(adancime / pas));
      const info: InfoRelief = { latime: cerere.setari.latime, adancime, pas, triunghiuri: triunghiuriEstimate(nx, nz), simplificata: pas > cerere.setari.rezolutie + 1e-9 };
      const raspuns: RaspunsRelief = { id: cerere.id, ok: true, tip: "previzualizare", imagine: previzualizare(mica, cerere.setari), info };
      self.postMessage(raspuns);
      return;
    }
    const grila = grilaGrosimi(imagine, cerere.setari);
    const positions = triunghiuriRelief(grila, cerere.setari);
    const info: InfoRelief = { latime: grila.latime, adancime: grila.adancime, pas: grila.pas, triunghiuri: positions.length / 9, simplificata: grila.simplificata };
    const raspuns: RaspunsRelief = { id: cerere.id, ok: true, tip: "construieste", positions, info };
    self.postMessage(raspuns, [positions.buffer]);
  } catch (error) {
    const raspuns: RaspunsRelief = { id: cerere.id, ok: false, eroare: error instanceof Error ? error.message : String(error) };
    self.postMessage(raspuns);
  }
};
