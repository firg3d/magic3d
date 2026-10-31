/// <reference lib="webworker" />
import type { RasterPixels } from "@/lib/rasterTrace";
import { traseazaLogo, type OptiuniTrasare, type TrasareLogo } from "@/magic3d/logo/trasare";

/*
 * Conturarea logo-urilor, in afara paginii: decodarea unei poze mari si k-means-ul pe culori ar
 * bloca interfata. Imaginea vine ca fisier (PNG, JPG) sau ca pixeli deja desenati (SVG) si nu
 * pleaca de aici nicaieri; inapoi merg doar inelele.
 */

export type CerereTrasare = { id: number; optiuni: OptiuniTrasare } & ({ fisier: Blob } | { pixeli: RasterPixels });
export type RaspunsTrasare = { id: number; ok: true; trasare: TrasareLogo } | { id: number; ok: false; eroare: string };

/** Pixelii unui fisier, desenati la cel mult dublul laturii de contur (micsorarea fina o face shrinkRaster). */
async function pixeliDinFisier(fisier: Blob, maxLatura: number): Promise<RasterPixels> {
  const imagine = await createImageBitmap(fisier);
  const factor = Math.min(1, (2 * maxLatura) / Math.max(imagine.width, imagine.height));
  const latime = Math.max(1, Math.round(imagine.width * factor));
  const inaltime = Math.max(1, Math.round(imagine.height * factor));
  const panza = new OffscreenCanvas(latime, inaltime);
  const context = panza.getContext("2d");
  if (!context) throw new Error("canvas");
  context.drawImage(imagine, 0, 0, latime, inaltime);
  imagine.close();
  const { data } = context.getImageData(0, 0, latime, inaltime);
  return { width: latime, height: inaltime, data };
}

self.onmessage = async (event: MessageEvent<CerereTrasare>) => {
  const cerere = event.data;
  try {
    const pixeli = "fisier" in cerere ? await pixeliDinFisier(cerere.fisier, cerere.optiuni.maxLatura) : cerere.pixeli;
    const raspuns: RaspunsTrasare = { id: cerere.id, ok: true, trasare: traseazaLogo(pixeli, cerere.optiuni) };
    self.postMessage(raspuns);
  } catch (error) {
    const raspuns: RaspunsTrasare = { id: cerere.id, ok: false, eroare: error instanceof Error ? error.message : String(error) };
    self.postMessage(raspuns);
  }
};
