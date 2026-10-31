import type { CorpModel } from "@/magic3d/core/assets/threemf";
import type { Parametri } from "@/magic3d/generatoare/tipuri";

/* Ce au in comun constructorii generatoarelor (partea de worker). */

export type PiesaManifold = { nume: string; culoare: string; manifold: unknown };
export type Construit = {
  piese: PiesaManifold[];
  avertizari: string[];
  /** Obiecte manifold care trebuie sa supravietuiasca arenei (de pilda un memo-cache intre constructii). */
  pastreaza?: unknown[];
};

/** Fonturile cerute de parametri, parsate de opentype.js, dupa cheia parametrului ("font", "fontNume"...). */
export type Fonturi = Record<string, unknown>;

/** Modelele 3MF cerute de parametri (cheile "fisier3mf...": "fisier3mfTema1", "fisier3mfBaza"), deja citite: corpurile fiecaruia. */
export type Modele = Record<string, CorpModel[]>;

/**
 * Un constructor: din parametri, modulul manifold si fonturi, piesele ca manifold-uri. Manifold-urile
 * intermediare nu trebuie eliberate: worker-ul ruleaza totul intr-o arena si o goleste dupa copiere.
 */
export type Constructor = (p: Parametri, mod: unknown, fonturi: Fonturi, modele: Modele) => Construit;

export const num = (p: Parametri, cheie: string) => Number(p[cheie]);
export const str = (p: Parametri, cheie: string) => String(p[cheie] ?? "");
export const bool = (p: Parametri, cheie: string) => p[cheie] === true;

/** Piesele goale (null/undefined) sau fara volum nu ajung pe placa. */
export function piese(...lista: (PiesaManifold | null | undefined | false)[]): PiesaManifold[] {
  return lista.filter((piesa): piesa is PiesaManifold => {
    if (!piesa || !piesa.manifold) return false;
    const m = piesa.manifold as { isEmpty?: () => boolean };
    return !m.isEmpty?.();
  });
}
