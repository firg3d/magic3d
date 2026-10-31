import type { CerereRelief, InfoRelief, RaspunsRelief, SursaRelief } from "@/magic3d/logo/relief.worker";
import type { SetariRelief } from "@/magic3d/logo/relief";

/*
 * Partea de pagina a reliefului si litofaniei. Previzualizarea: doar cererea cea mai noua conteaza
 * (un glisor tras cere zeci pe secunda). Poza ajunge in worker o singura data, la prima cerere pe ea.
 */

let worker: Worker | null = null;
let urmatorul = 1;
let ultimaPrevizualizare = 0;
let sursaTrimisa = 0;
const asteptari = new Map<number, { resolve: (r: RaspunsRelief | null) => void; reject: (e: Error) => void }>();

function porneste(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL("./relief.worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (event: MessageEvent<RaspunsRelief>) => {
    const raspuns = event.data;
    const asteptare = asteptari.get(raspuns.id);
    if (!asteptare) return;
    asteptari.delete(raspuns.id);
    if (!raspuns.ok) asteptare.reject(new Error(raspuns.eroare));
    else if (raspuns.tip === "previzualizare" && raspuns.id !== ultimaPrevizualizare) asteptare.resolve(null);
    else asteptare.resolve(raspuns);
  };
  worker.onerror = (event) => {
    for (const [, asteptare] of asteptari) asteptare.reject(new Error(event.message || "relief worker"));
    asteptari.clear();
    worker?.terminate();
    worker = null;
    sursaTrimisa = 0;
  };
  return worker;
}

function trimite(cerere: Omit<CerereRelief, "id" | "date">, date: SursaRelief): Promise<RaspunsRelief | null> {
  const id = urmatorul++;
  if (cerere.tip === "previzualizare") ultimaPrevizualizare = id;
  const w = porneste();
  // Poza pleaca spre worker doar cand e noua pentru el.
  const cuDate = sursaTrimisa !== cerere.sursa ? { ...cerere, id, date } : { ...cerere, id };
  sursaTrimisa = cerere.sursa;
  return new Promise((resolve, reject) => {
    asteptari.set(id, { resolve, reject });
    w.postMessage(cuDate as CerereRelief);
  });
}

export type PrevizualizareRelief = { imagine: { width: number; height: number; data: Uint8ClampedArray }; info: InfoRelief };

/** Previzualizarea (lumina din spate sau relief luminat) si ce ar avea obiectul; null daca intre timp s-a cerut alta. */
export async function previzualizeazaRelief(sursa: number, date: SursaRelief, setari: SetariRelief): Promise<PrevizualizareRelief | null> {
  const raspuns = await trimite({ tip: "previzualizare", sursa, setari }, date);
  return raspuns && raspuns.ok && raspuns.tip === "previzualizare" ? { imagine: raspuns.imagine, info: raspuns.info } : null;
}

/** Triunghiurile obiectului (Y in sus, mm) si ce a iesit. */
export async function construiesteRelief(sursa: number, date: SursaRelief, setari: SetariRelief): Promise<{ positions: Float32Array; info: InfoRelief }> {
  const raspuns = await trimite({ tip: "construieste", sursa, setari }, date);
  if (!raspuns || !raspuns.ok || raspuns.tip !== "construieste") throw new Error("relief");
  return { positions: raspuns.positions, info: raspuns.info };
}
