/// <reference lib="webworker" />

import { buildMessage } from "@/lib/buildStamp";
import { calculeazaModel } from "@/magic3d/pictura/modele";
import type { CerereModelWorker, RaspunsModelWorker } from "@/magic3d/pictura/calculWorker";

self.postMessage(buildMessage());

// Un model pe tot corpul, in afara firului paginii; progresul pleaca din cand in cand, iar anularea
// inseamna ca pagina opreste workerul.
self.onmessage = (event: MessageEvent<CerereModelWorker>) => {
  const { id, centre, normale, cutie, parametri } = event.data;
  try {
    let ultim = 0;
    const niveluri = calculeazaModel(centre, normale, cutie, parametri, (f) => {
      if (f - ultim >= 0.05 || f === 1) {
        ultim = f;
        self.postMessage({ id, progres: f } satisfies RaspunsModelWorker);
      }
    })!;
    self.postMessage({ id, niveluri } satisfies RaspunsModelWorker, { transfer: [niveluri.buffer] });
  } catch (error) {
    self.postMessage({ id, eroare: error instanceof Error ? error.message : String(error) } satisfies RaspunsModelWorker);
  }
};
