import { DESCHIDE_LOGO } from "@/magic3d/logo/asset";
import type { Mod } from "@/magic3d/termo/config";
import type { FormaExemplu } from "@/magic3d/termo/forme";

/*
 * Termoformarea deschisa din alt loc, cu valori gata alese (de pilda "Glob din plasa" din
 * generatoare: cerc, cutie, 80 mm). Panoul poate sa nu fie montat inca, deci presetarea asteapta
 * aici pana o preia expertul; evenimentul muta panoul pe fila termoformarii daca era deja deschis.
 */

export const DESCHIDE_TERMO = "magic3d:open-termo";
export type PresetTermo = { forma?: FormaExemplu; mod?: Mod; latime?: number };

let asteptat: PresetTermo | null = null;

export function deschideTermo(preset: PresetTermo): void {
  asteptat = preset;
  window.dispatchEvent(new Event(DESCHIDE_LOGO));
  window.dispatchEvent(new Event(DESCHIDE_TERMO));
}

/** Exista o presetare nepreluata (panoul trebuie sa se deschida pe fila termoformarii). */
export const existaPresetTermo = () => asteptat !== null;

/** Presetarea, o singura data. */
export function preiaPresetTermo(): PresetTermo | null {
  const p = asteptat;
  asteptat = null;
  return p;
}
