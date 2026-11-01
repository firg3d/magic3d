import type { SetariTermo } from "@/magic3d/termo/config";
import type { Inele } from "@/magic3d/termo/geometrie";
import type { OptiuniSilueta, Silueta } from "@/magic3d/termo/silueta";
import type { CerereTermo, RaspunsTermo, SursaTermo } from "@/magic3d/termo/termo.worker";

/*
 * Partea de pagina a termoformarii: pe fiecare fel de cerere (silueta, constructie) o singura
 * cerere e "vie" - un cursor tras cere zeci pe secunda, iar raspunsul unei cereri depasite e ignorat.
 */

type Construit = Extract<RaspunsTermo, { tip: "construieste" }>;
/** Cererea fara id, pe fiecare fel in parte (Omit simplu ar amesteca felurile). */
type FaraId<T> = T extends unknown ? Omit<T, "id"> : never;

let worker: Worker | null = null;
let urmatorul = 1;
const ultima = { silueta: 0, construieste: 0 };
const asteptari = new Map<number, { tip: keyof typeof ultima; resolve: (r: RaspunsTermo | null) => void; reject: (e: Error) => void }>();

function porneste(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL("./termo.worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (event: MessageEvent<RaspunsTermo>) => {
    const raspuns = event.data;
    const asteptare = asteptari.get(raspuns.id);
    if (!asteptare) return;
    asteptari.delete(raspuns.id);
    if (raspuns.id !== ultima[asteptare.tip]) asteptare.resolve(null);
    else if (raspuns.ok) asteptare.resolve(raspuns);
    else asteptare.reject(new Error(raspuns.eroare));
  };
  worker.onerror = (event) => {
    for (const [, asteptare] of asteptari) asteptare.reject(new Error(event.message || "termo worker"));
    asteptari.clear();
    worker?.terminate();
    worker = null;
  };
  return worker;
}

function cere(tip: keyof typeof ultima, cerere: FaraId<CerereTermo>): Promise<RaspunsTermo | null> {
  const id = urmatorul++;
  ultima[tip] = id;
  return new Promise((resolve, reject) => {
    asteptari.set(id, { tip, resolve, reject });
    porneste().postMessage({ ...cerere, id } as CerereTermo);
  });
}

/** Silueta imaginii `sursa` (un numar care o identifica; `date` doar prima data sau cand s-a schimbat). Null cand a fost depasita. */
export async function silueta(sursa: number, date: SursaTermo | undefined, optiuni: OptiuniSilueta): Promise<Silueta | null> {
  const r = await cere("silueta", { tip: "silueta", sursa, date, optiuni });
  return r && r.ok && r.tip === "silueta" ? r.silueta : null;
}

/** Cele trei piese si cotele; null cand a fost ceruta intre timp alta constructie. */
export async function construieste(inele: Inele, setari: SetariTermo, cadru?: { latime: number; inaltime: number }): Promise<Construit | null> {
  const r = await cere("construieste", { tip: "construieste", inele, setari, cadru, assetBase: new URL(".", window.location.href).href });
  return r && r.ok && r.tip === "construieste" ? r : null;
}
