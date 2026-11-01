import type { SlicerBambu } from "@/magic3d/core/assets/bambu3mf";

/*
 * Preseturile de sistem Bambu Studio pe care le pot numi proiectele Magic3D. Proiectul nu copiaza
 * setarile lor: le numeste, iar Bambu Studio le completeaza din preseturile pe care le are instalate.
 * Numele si codurile sunt cele din profilurile Bambu Studio (resources/profiles/BBL).
 *
 * Imprimanta de baza e A1 mini cu duza 0.4 (pat 180): incape pe orice imprimanta Bambu, iar la deschidere
 * Bambu Studio propune singur trecerea pe imprimanta conectata. Pentru placile de 256 mm: A1.
 */

export type MaterialBambu = "PLA" | "PETG";

type Imprimanta = { model: string; varianta: string; duza: number; imprimanta: string; proces: string; turn: { x: number; y: number }; filamente: Record<MaterialBambu, { preset: string; id: string }> };

const A1_MINI: Imprimanta = {
  model: "Bambu Lab A1 mini",
  varianta: "0.4",
  duza: 0.4,
  imprimanta: "Bambu Lab A1 mini 0.4 nozzle",
  proces: "0.20mm Standard @BBL A1M",
  // turnul (35 mm lat, cu bordura de 3) in coltul din fata-dreapta, departe de piesele centrate
  turn: { x: 135, y: 10 },
  filamente: {
    PLA: { preset: "Bambu PLA Basic @BBL A1M", id: "GFA00" },
    PETG: { preset: "Bambu PETG HF @BBL A1M", id: "GFG02" },
  },
};

const A1: Imprimanta = {
  model: "Bambu Lab A1",
  varianta: "0.4",
  duza: 0.4,
  imprimanta: "Bambu Lab A1 0.4 nozzle",
  proces: "0.20mm Standard @BBL A1",
  turn: { x: 211, y: 10 },
  filamente: {
    PLA: { preset: "Bambu PLA Basic @BBL A1", id: "GFA00" },
    PETG: { preset: "Bambu PETG HF @BBL A1", id: "GFG02" },
  },
};

const slicer = (imp: Imprimanta, filamente: ReadonlyArray<{ material: MaterialBambu; culoare: string }>): SlicerBambu => ({
  model: imp.model, varianta: imp.varianta, duza: imp.duza, imprimanta: imp.imprimanta, proces: imp.proces, turn: imp.turn,
  filamente: filamente.map(({ material, culoare }) => ({ ...imp.filamente[material], culoare, tip: material })),
});

/** Proiectul pe A1 mini, cu un slot pentru fiecare filament dat (in ordinea sloturilor). */
export const slicerA1Mini = (filamente: ReadonlyArray<{ material: MaterialBambu; culoare: string }>): SlicerBambu => slicer(A1_MINI, filamente);

/** Imprimanta dupa latura patului pe care au fost asezate placile: 180 = A1 mini, mai mare = A1 (256). */
export const slicerPentruPat = (pat: number, filamente: ReadonlyArray<{ material: MaterialBambu; culoare: string }>): SlicerBambu => slicer(pat > 180 ? A1 : A1_MINI, filamente);
