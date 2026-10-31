import { groupedShape } from "@/lib/editorBooleans";
import { boundsForPositions, cleanModelDimension, MIN_SHAPE_DIMENSION } from "@/lib/editorMeshCore";
import { createLocalId } from "@/lib/localIds";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";
import type { Magic3dGenerat, PiesaGenerata } from "@/magic3d/generatoare/tipuri";

/*
 * Piesele unui generator ca forme ale editorului: fiecare piesa un corp mesh in culoarea ei, iar
 * toate impreuna un "pachet" (groupOperation "bundle"): se misca impreuna, nu se taie unele pe
 * altele si ies ca obiecte separate la export (3MF multicolor). Pe pachet sta `magic3d`, ca
 * generatorul sa poata fi redeschis cu aceleasi valori.
 */

/** O piesa ca forma mesh, in acelasi cadru ca restul pieselor (centrul comun in X/Z, baza la Y=0). Folosita si de "Din poză sau logo". */
export function corp(piesa: PiesaGenerata, centruX: number, centruZ: number, minY: number): WorkplaneShape | null {
  const bounds = boundsForPositions(Array.from(piesa.positions));
  if (!bounds) return null;
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cz = (bounds.minZ + bounds.maxZ) / 2;
  const width = Math.max(MIN_SHAPE_DIMENSION, bounds.maxX - bounds.minX);
  const height = Math.max(MIN_SHAPE_DIMENSION, bounds.maxY - bounds.minY);
  const depth = Math.max(MIN_SHAPE_DIMENSION, bounds.maxZ - bounds.minZ);
  const positions: number[] = new Array(piesa.positions.length);
  for (let i = 0; i < piesa.positions.length; i += 3) {
    positions[i] = piesa.positions[i] - cx;
    positions[i + 1] = piesa.positions[i + 1] - bounds.minY;
    positions[i + 2] = piesa.positions[i + 2] - cz;
  }
  return canonicalizeShape({
    id: createLocalId("magic3d-piesa"),
    name: piesa.nume,
    kind: "mesh",
    color: piesa.culoare,
    x: cx - centruX,
    z: cz - centruZ,
    elevation: bounds.minY - minY,
    size: Math.max(width, depth),
    width: cleanModelDimension(width),
    depth: cleanModelDimension(depth),
    height: cleanModelDimension(height),
    rotation: 0,
    importedMesh: {
      positions,
      baseWidth: width,
      baseDepth: depth,
      baseHeight: height,
      triangleCount: Math.floor(positions.length / 9),
      sourceFormat: "json",
    },
    locked: false,
    hidden: false,
  } as WorkplaneShape);
}

/**
 * Pachetul din piese, asezat pe placa in centru (sau, la o reconstructie, unde statea `vechi`,
 * cu aceeasi rotatie si acelasi nume).
 */
export function pachetGenerat(piese: PiesaGenerata[], nume: string, meta: Magic3dGenerat, vechi?: WorkplaneShape | null): WorkplaneShape {
  const toate = piese.flatMap((piesa) => Array.from(piesa.positions));
  const bounds = boundsForPositions(toate);
  if (!bounds) throw new Error("generatorul nu a produs nicio piesa");
  const centruX = (bounds.minX + bounds.maxX) / 2;
  const centruZ = (bounds.minZ + bounds.maxZ) / 2;
  const corpuri = piese.map((piesa) => corp(piesa, centruX, centruZ, bounds.minY)).filter((shape): shape is WorkplaneShape => shape !== null);
  const loc = vechi
    ? { x: vechi.x, z: vechi.z, elevation: vechi.elevation ?? 0, rotation: vechi.rotation, rotationX: vechi.rotationX, rotationZ: vechi.rotationZ }
    : { x: 0, z: 0, elevation: 0, rotation: 0 };
  if (corpuri.length === 1) {
    return canonicalizeShape({ ...corpuri[0], id: vechi?.id ?? createLocalId("magic3d"), name: vechi?.name ?? nume, ...loc, magic3d: meta });
  }
  const pachet = groupedShape(corpuri);
  if (!pachet) throw new Error("piesele nu au putut fi puse intr-un pachet");
  return canonicalizeShape({
    ...pachet,
    id: vechi?.id ?? createLocalId("magic3d"),
    name: vechi?.name ?? nume,
    groupOperation: "bundle",
    ...loc,
    locked: vechi?.locked ?? false,
    hidden: vechi?.hidden ?? false,
    magic3d: meta,
  });
}
