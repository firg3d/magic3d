/*
 * Calculul unui model de culoare intr-un Web Worker (workers/pictura.worker.ts), cu progres si
 * anulare. Unde workerul nu porneste (teste, browsere vechi), calculul se face pe loc.
 */
import { calculeazaModel, type Cutie, type ParametriModel } from "@/magic3d/pictura/modele";

export type CerereModelWorker = { id: number; centre: Float32Array; normale: Float32Array; cutie: Cutie; parametri: ParametriModel };
export type RaspunsModelWorker = { id: number; progres?: number; niveluri?: Uint8Array; eroare?: string };

export type CalculModel = { rezultat: Promise<Uint8Array | null>; anuleaza: () => void };

let urmatorul = 1;

export function calculeazaModelInFundal(
  centre: Float32Array,
  normale: Float32Array,
  cutie: Cutie,
  parametri: ParametriModel,
  progres: (fractie: number) => void,
): CalculModel {
  let worker: Worker | null = null;
  try {
    worker = typeof Worker === "function" ? new Worker(new URL("../../workers/pictura.worker.ts", import.meta.url), { type: "module" }) : null;
  } catch {
    worker = null;
  }
  if (!worker) {
    let anulat = false;
    const rezultat = Promise.resolve().then(() => calculeazaModel(centre, normale, cutie, parametri, (f) => { progres(f); return !anulat; }));
    return { rezultat, anuleaza: () => { anulat = true; } };
  }
  const w = worker;
  const id = urmatorul++;
  let incheie: (v: Uint8Array | null) => void = () => undefined;
  const rezultat = new Promise<Uint8Array | null>((ok, nu) => {
    incheie = ok;
    w.onmessage = (event: MessageEvent<RaspunsModelWorker | unknown>) => {
      const r = event.data as RaspunsModelWorker;
      if (!r || r.id !== id) return; // mesajul de versiune al workerului
      if (r.progres !== undefined) progres(r.progres);
      if (r.niveluri) { w.terminate(); ok(r.niveluri); }
      if (r.eroare) { w.terminate(); nu(new Error(r.eroare)); }
    };
    w.onerror = (e) => { w.terminate(); nu(new Error(e.message || "worker")); };
  });
  // Copii: centrele si normalele raman ale paginii.
  w.postMessage({ id, centre: centre.slice(), normale: normale.slice(), cutie, parametri } satisfies CerereModelWorker);
  return { rezultat, anuleaza: () => { w.terminate(); incheie(null); } };
}
