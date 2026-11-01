/*
 * Importul pentru modul Pictura (cardul "Coloreaza un model" de pe pagina de start): STL, 3MF sau
 * OBJ devin corpuri in editor, iar culorile din fisier raman culori pe triunghi.
 *
 * - 3MF: pictura din slicer (paint_color / mmu_segmentation) sau culorile 3MF, cu filamentele lui;
 * - OBJ cu culori (.mtl sau culori pe varf): partile de o culoare se strang intr-un singur corp,
 *   fiecare parte pe slotul culorii ei;
 * - STL: un corp de o culoare.
 * Corpurile se aseaza impreuna, centrate pe plansa si puse pe ea.
 */
import { createLocalId } from "@/lib/localIds";
import { meshForShape } from "@/lib/editorMeshCore";
import { importedShapesFromObj } from "@/lib/objImport";
import { importedShapeFromStl } from "@/lib/stlImport";
import type { WorkplaneShape } from "@/types/layerling";
import { SLOTURI_MAXIME, salveazaPictura, type CorpPictat } from "@/magic3d/pictura/date";
import { citestePictura3mf } from "@/magic3d/pictura/pictura3mf";
import { corpCuPlasaNoua } from "@/magic3d/pictura/plasaEditor";
import { sloturiInitiale } from "@/magic3d/pictura/paleta";

export type ImportPictura = { forme: WorkplaneShape[]; sloturi: string[]; pictat: boolean };

export const EXTENSII_PICTURA = [".stl", ".3mf", ".obj"];

/** Un corp facut din mai multe forme (in coordonatele scenei), fiecare pe slotul culorii ei. */
function corpDinForme(forme: readonly WorkplaneShape[], nume: string): { corp: CorpPictat; sloturi: string[] } {
  const sloturi: string[] = [];
  const varfuri: number[] = [];
  const fete: number[] = [];
  const culori: number[] = [];
  for (const forma of forme) {
    const culoare = (forma.color ?? "#808080").toLowerCase();
    let slot = sloturi.indexOf(culoare);
    if (slot < 0 && sloturi.length < SLOTURI_MAXIME) { sloturi.push(culoare); slot = sloturi.length - 1; }
    const m = meshForShape(forma);
    const baza = varfuri.length / 3;
    m.vertices.forEach(([x, y, z]) => varfuri.push(x, y, z));
    m.faces.forEach(([a, b, c]) => { fete.push(a + baza, b + baza, c + baza); culori.push(Math.max(0, slot)); });
  }
  return { corp: { id: createLocalId("pictura"), nume, varfuri: new Float32Array(varfuri), fete: new Uint32Array(fete), culori: new Uint8Array(culori) }, sloturi };
}

/** Formele editorului pentru corpurile pictate, impreuna, centrate pe plansa si puse pe ea. */
export function formeDinCorpuri(corpuri: readonly CorpPictat[], sloturi: readonly string[], culoareBaza?: string): WorkplaneShape[] {
  const pictat = sloturi.length > 1 || corpuri.some((c) => c.culori.some((x) => x !== 0));
  const forme = corpuri.map((corp) => {
    const sablon: WorkplaneShape = {
      id: createLocalId("pictura"), name: corp.nume, kind: "mesh", color: culoareBaza ?? sloturi[0] ?? "#808080",
      x: 0, z: 0, size: 1, width: 1, depth: 1, height: 1, rotation: 0,
    };
    const forma = corpCuPlasaNoua(sablon, corp);
    return pictat ? { ...forma, pictura: salveazaPictura(corp, sloturi) } : forma;
  });
  // Toate impreuna: centrul lor pe mijlocul plansei, cel mai de jos punct pe plansa.
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, minY = Infinity;
  for (const f of forme) {
    minX = Math.min(minX, f.x - f.width / 2); maxX = Math.max(maxX, f.x + f.width / 2);
    minZ = Math.min(minZ, f.z - f.depth / 2); maxZ = Math.max(maxZ, f.z + f.depth / 2);
    minY = Math.min(minY, f.elevation ?? 0);
  }
  const dx = (minX + maxX) / 2, dz = (minZ + maxZ) / 2;
  return forme.map((f) => ({ ...f, x: f.x - dx, z: f.z - dz, elevation: (f.elevation ?? 0) - minY }));
}

export async function importaPentruPictura(fisier: File): Promise<ImportPictura> {
  const nume = fisier.name.replace(/\.[^.]+$/, "") || "Model";
  const ext = fisier.name.toLowerCase().slice(fisier.name.lastIndexOf("."));
  if (ext === ".3mf") {
    const citit = citestePictura3mf(new Uint8Array(await fisier.arrayBuffer()), nume);
    const sloturi = citit.sloturi.map((s) => s.culoare);
    return { forme: formeDinCorpuri(citit.corpuri, sloturi), sloturi, pictat: citit.pictat || sloturi.length > 1 };
  }
  if (ext === ".obj") {
    const rez = importedShapesFromObj(fisier.name, await fisier.text());
    if (rez.shapes.length > 1) {
      const { corp, sloturi } = corpDinForme(rez.shapes, nume);
      return { forme: formeDinCorpuri([corp], sloturi), sloturi, pictat: true };
    }
    const forma = rez.shapes[0];
    return { forme: [{ ...forma, x: 0, z: 0, elevation: 0 }], sloturi: sloturiInitiale(forma.color), pictat: false };
  }
  if (ext === ".stl") {
    const forma = importedShapeFromStl(fisier.name, await fisier.arrayBuffer());
    return { forme: [{ ...forma, x: 0, z: 0, elevation: 0 }], sloturi: sloturiInitiale(forma.color), pictat: false };
  }
  throw new Error(`Format necunoscut: ${fisier.name}`);
}
