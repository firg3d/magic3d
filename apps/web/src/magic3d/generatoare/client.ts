import { getLanguage } from "@/lib/i18n";
import type { CerereGenerare, Parametri, RaspunsGenerare, RezultatGenerare } from "@/magic3d/generatoare/tipuri";

/*
 * Partea de pagina a worker-ului de generatoare. O singura constructie e "vie": una noua o face pe
 * cea veche inutila, iar raspunsul ei intarziat e ignorat (miscarea unui cursor cere zeci pe secunda).
 */

let worker: Worker | null = null;
let urmatorul = 1;
const asteptari = new Map<number, { resolve: (r: RezultatGenerare) => void; reject: (e: Error) => void }>();

function porneste(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL("./generator.worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (event: MessageEvent<RaspunsGenerare>) => {
    const raspuns = event.data;
    const asteptare = asteptari.get(raspuns.id);
    if (!asteptare) return;
    asteptari.delete(raspuns.id);
    if (raspuns.ok) asteptare.resolve(raspuns.rezultat);
    else asteptare.reject(new Error(raspuns.eroare));
  };
  worker.onerror = (event) => {
    // Un worker cazut (heap WASM epuizat) se reporneste la urmatoarea cerere, cu heap gol.
    for (const [, asteptare] of asteptari) asteptare.reject(new Error(event.message || "generator worker"));
    asteptari.clear();
    worker?.terminate();
    worker = null;
  };
  return worker;
}

export function genereaza(generator: string, parametri: Parametri): Promise<RezultatGenerare> {
  const id = urmatorul++;
  const cerere: CerereGenerare = {
    id,
    generator,
    parametri,
    limba: getLanguage() === "ro" ? "ro" : "en",
    assetBase: new URL(".", window.location.href).href,
  };
  return new Promise((resolve, reject) => {
    asteptari.set(id, { resolve, reject });
    porneste().postMessage(cerere);
  });
}
