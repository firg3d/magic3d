import { libraryShapeAssets } from "@/lib/shapeCatalog";
import type { ShapeAsset } from "@/types/layerling";

/*
 * Un card de generator de pe pagina de start deschide un design nou cu forma lui deja pe plansa:
 * pagina noteaza forma aici, iar editorul o pune pe plansa dupa ce designul nou s-a incarcat.
 * sessionStorage, nu localStorage: o forma ceruta intr-o fila nu trebuie sa apara in alta.
 */

const CHEIE = "magic3d.formaInitiala";

export function noteazaFormaInitiala(forma: string): void {
  try {
    window.sessionStorage.setItem(CHEIE, forma);
  } catch {
    // fara stocare: designul nou se deschide gol, ca de obicei
  }
}

/** Forma ceruta (o singura data: dupa citire nu mai e acolo), daca exista in biblioteca. */
export function preiaFormaInitiala(): ShapeAsset | null {
  try {
    const forma = window.sessionStorage.getItem(CHEIE);
    if (!forma) return null;
    window.sessionStorage.removeItem(CHEIE);
    return libraryShapeAssets.find((asset) => asset.id === forma) ?? null;
  } catch {
    return null;
  }
}
