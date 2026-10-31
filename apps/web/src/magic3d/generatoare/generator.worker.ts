/// <reference lib="webworker" />
import { getManifoldRuntime, setManifoldAssetBase } from "@/lib/editorMeshCore";
import { instrumenteazaArena, inArena } from "@/magic3d/core/geometry/arena";
import { foloseste } from "@/magic3d/core/i18n/index";
import { construieste, incarcaFonturi, triunghiuri } from "@/magic3d/generatoare/constructori";
import type { CerereGenerare, RaspunsGenerare } from "@/magic3d/generatoare/tipuri";

/*
 * Worker-ul generatoarelor Magic3D: un heap WASM separat de al editorului. Fiecare constructie
 * ruleaza intr-o arena (core/geometry/arena.ts): tot ce creeaza manifold-ul se elibereaza dupa ce
 * piesele au fost copiate in triunghiuri, ca reconstructiile repetate sa nu umple heap-ul.
 */

let instrumentat = false;

self.onmessage = async (event: MessageEvent<CerereGenerare>) => {
  const cerere = event.data;
  try {
    setManifoldAssetBase(cerere.assetBase);
    const mod = await getManifoldRuntime();
    if (!instrumentat) {
      instrumenteazaArena(mod);
      instrumentat = true;
    }
    foloseste(cerere.limba);
    const fonturi = await incarcaFonturi(cerere.assetBase, cerere.parametri);
    const start = performance.now();
    const rezultat = inArena(
      () => {
        const construit = construieste(cerere.generator, cerere.parametri, mod, fonturi);
        return { piese: triunghiuri(construit.piese), avertizari: construit.avertizari, pastreaza: construit.pastreaza ?? [] };
      },
      (rez) => rez.pastreaza,
    );
    const raspuns: RaspunsGenerare = { id: cerere.id, ok: true, rezultat: { piese: rezultat.piese, avertizari: rezultat.avertizari, ms: Math.round(performance.now() - start) } };
    (self as unknown as DedicatedWorkerGlobalScope).postMessage(raspuns, rezultat.piese.map((piesa) => piesa.positions.buffer));
  } catch (error) {
    const raspuns: RaspunsGenerare = { id: cerere.id, ok: false, eroare: error instanceof Error ? error.message : String(error) };
    (self as unknown as DedicatedWorkerGlobalScope).postMessage(raspuns);
  }
};
