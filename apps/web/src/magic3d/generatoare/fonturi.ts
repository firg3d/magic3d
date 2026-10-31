/*
 * Lista fonturilor Magic3D (public/magic3d/fonts/fonts-manifest.json): o intrare per familie, cea mai
 * apropiata de Regular, grupate pe categorii, ca in aplicatiile vechi.
 */

export type FontItem = {
  fisier: string;
  familie: string;
  categorie: string;
  weight: number;
  italic: boolean;
  eticheta: string;
  lipsaDiacritice: string[];
};

export type GrupFonturi = { categorie: string; items: FontItem[] };

let manifest: Promise<FontItem[]> | null = null;

export function incarcaManifestFonturi(): Promise<FontItem[]> {
  manifest ??= fetch("/magic3d/fonts/fonts-manifest.json")
    .then((response) => (response.ok ? (response.json() as Promise<FontItem[]>) : []))
    .catch(() => {
      manifest = null;
      return [];
    });
  return manifest;
}

const ORDINE = ["Neutre", "Serif display", "Sans display", "Decorative", "Cursiv", "Altele"];

export function grupuriFonturi(lista: FontItem[]): GrupFonturi[] {
  const perFamilie = new Map<string, FontItem>();
  const scor = (f: FontItem) => Math.abs(f.weight - 400) + (f.italic ? 50 : 0);
  for (const f of lista) {
    const curent = perFamilie.get(f.familie);
    if (!curent || scor(f) < scor(curent)) perFamilie.set(f.familie, f);
  }
  const grupuri = new Map<string, FontItem[]>();
  for (const f of perFamilie.values()) {
    const items = grupuri.get(f.categorie) ?? [];
    items.push(f);
    grupuri.set(f.categorie, items);
  }
  return [...grupuri.entries()]
    .sort((a, b) => (ORDINE.indexOf(a[0]) + 1 || 99) - (ORDINE.indexOf(b[0]) + 1 || 99) || a[0].localeCompare(b[0]))
    .map(([categorie, items]) => ({ categorie, items: items.sort((a, b) => a.familie.localeCompare(b.familie)) }));
}
