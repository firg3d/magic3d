/*
 * Cand retusarea schimba plasa unui corp (subdivizare, reparare, simplificare), corpul din editor
 * trebuie sa aiba exact aceleasi triunghiuri, in aceeasi ordine, altfel pictura nu se mai potriveste.
 * Corpul devine o plasa importata (kind "mesh") cu triunghiurile noi, in acelasi loc in scena.
 */
import { importedShapeFromTriangleSoup } from "@/lib/stlImport";
import type { WorkplaneShape } from "@/types/layerling";
import type { PlasaPictura } from "@/magic3d/pictura/date";

/** Triunghiurile plasei, cate noua numere, in coordonatele scenei. */
export function supaDinPlasa(p: PlasaPictura): number[] {
  const out = new Array<number>(p.fete.length * 3);
  for (let t = 0; t < p.fete.length / 3; t += 1) for (let k = 0; k < 3; k += 1) {
    const i = p.fete[t * 3 + k] * 3;
    out[t * 9 + k * 3] = p.varfuri[i];
    out[t * 9 + k * 3 + 1] = p.varfuri[i + 1];
    out[t * 9 + k * 3 + 2] = p.varfuri[i + 2];
  }
  return out;
}

/**
 * Corpul `shape` cu plasa `p` (coordonatele scenei): acelasi id, nume, culoare si stare, asezat
 * unde sta plasa. Nu mai e o forma parametrica (nici generator Magic3D): e o plasa.
 */
export function corpCuPlasaNoua(shape: WorkplaneShape, p: PlasaPictura): WorkplaneShape {
  const supa = supaDinPlasa(p);
  const nou = importedShapeFromTriangleSoup(shape.name, supa, undefined, "json");
  let minX = Infinity, maxX = -Infinity, minY = Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < supa.length; i += 3) {
    if (supa[i] < minX) minX = supa[i];
    if (supa[i] > maxX) maxX = supa[i];
    if (supa[i + 1] < minY) minY = supa[i + 1];
    if (supa[i + 2] < minZ) minZ = supa[i + 2];
    if (supa[i + 2] > maxZ) maxZ = supa[i + 2];
  }
  return {
    ...nou,
    id: shape.id,
    name: shape.name,
    color: shape.color,
    hole: shape.hole,
    locked: shape.locked,
    hidden: shape.hidden,
    x: (minX + maxX) / 2,
    z: (minZ + maxZ) / 2,
    elevation: minY,
  };
}
