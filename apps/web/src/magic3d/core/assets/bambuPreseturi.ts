import type { FilamentBambu, SlicerBambu } from "@/magic3d/core/assets/bambu3mf";

/*
 * Preseturile de sistem Bambu Studio pe care le pot numi proiectele Magic3D. Proiectul nu copiaza
 * setarile lor: le numeste, iar Bambu Studio le completeaza din preseturile pe care le are instalate.
 * Numele si codurile sunt cele din profilurile Bambu Studio (resources/profiles/BBL).
 *
 * Imprimanta de baza e A1 mini cu duza 0.4: incape pe orice imprimanta Bambu, iar la deschidere Bambu
 * Studio propune singur trecerea pe imprimanta conectata.
 */

export type MaterialBambu = "PLA" | "PETG";

const A1_MINI = {
  model: "Bambu Lab A1 mini",
  varianta: "0.4",
  duza: 0.4,
  imprimanta: "Bambu Lab A1 mini 0.4 nozzle",
  proces: "0.20mm Standard @BBL A1M",
  filamente: {
    PLA: { preset: "Bambu PLA Basic @BBL A1M", id: "GFA00" },
    PETG: { preset: "Bambu PETG HF @BBL A1M", id: "GFG02" },
  },
} as const;

/** Proiectul pe A1 mini, cu un slot pentru fiecare filament dat (in ordinea sloturilor). */
export function slicerA1Mini(filamente: ReadonlyArray<{ material: MaterialBambu; culoare: string }>): SlicerBambu {
  const sloturi: FilamentBambu[] = filamente.map(({ material, culoare }) => ({ ...A1_MINI.filamente[material], culoare, tip: material }));
  return { model: A1_MINI.model, varianta: A1_MINI.varianta, duza: A1_MINI.duza, imprimanta: A1_MINI.imprimanta, proces: A1_MINI.proces, filamente: sloturi };
}
