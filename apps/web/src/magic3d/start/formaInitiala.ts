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

const CHEIE_PICTURA = "magic3d.deschidePictura";

/** Designul nou se deschide direct in modul Pictura (cardul de pe pagina de start). */
export function noteazaDeschidePictura(): void {
  try {
    window.sessionStorage.setItem(CHEIE_PICTURA, "da");
  } catch {
    // fara stocare: designul se deschide in Editor 3D
  }
}

/** Daca s-a cerut modul Pictura (o singura data). */
export function preiaDeschidePictura(): boolean {
  try {
    if (window.sessionStorage.getItem(CHEIE_PICTURA) !== "da") return false;
    window.sessionStorage.removeItem(CHEIE_PICTURA);
    return true;
  } catch {
    return false;
  }
}

/*
 * Fisierul ales pe cardul "Coloreaza un model": ramane in memorie (poate avea zeci de MB), nu in
 * sessionStorage. Pagina de start si editorul sunt aceeasi pagina, deci ajunge la editor.
 */
let fisierPictura: File | null = null;

export function noteazaFisierPictura(fisier: File): void {
  fisierPictura = fisier;
}

/** Fisierul de importat in modul Pictura (o singura data). */
export function preiaFisierPictura(): File | null {
  const f = fisierPictura;
  fisierPictura = null;
  return f;
}
