import type { GeneratorDef, Parametri } from "@/magic3d/generatoare/tipuri";
import { ARTICULAT } from "@/magic3d/generatoare/defs/articulat";
import { BRELOC_DECOR } from "@/magic3d/generatoare/defs/breloc-decor";
import { BRELOCURI } from "@/magic3d/generatoare/defs/brelocuri";
import { CUTII } from "@/magic3d/generatoare/defs/cutii";
import { CUVINTE } from "@/magic3d/generatoare/defs/cuvinte";
import { FAGURE } from "@/magic3d/generatoare/defs/fagure";
import { LED } from "@/magic3d/generatoare/defs/led";
import { LITERE } from "@/magic3d/generatoare/defs/litere";
import { NUME_LED } from "@/magic3d/generatoare/defs/nume-led";
import { NUME } from "@/magic3d/generatoare/defs/nume";
import { ORNAMENT_DEF } from "@/magic3d/generatoare/defs/ornament";
import { GLOB_NUME_DEF } from "@/magic3d/generatoare/defs/glob-nume";
import { TURTA_DULCE_DEF } from "@/magic3d/generatoare/defs/turta-dulce";
import { MEDALION_BANDA_DEF } from "@/magic3d/generatoare/defs/medalion-banda";
import { GLOB_MODELE_DEF } from "@/magic3d/generatoare/defs/glob-modele";
import { PRESA_DEF } from "@/magic3d/generatoare/defs/presa";
import { STAMPILA_DEF } from "@/magic3d/generatoare/defs/stampila";
import { TAVA_DEF } from "@/magic3d/generatoare/defs/tava";
import { PRESA_LUT_DEF } from "@/magic3d/generatoare/defs/presalut";
import { SILICON_DEF } from "@/magic3d/generatoare/defs/silicon";
import { RAME } from "@/magic3d/generatoare/defs/rame";
import { PLACUTE } from "@/magic3d/generatoare/defs/placute";

export { PLACUTE };

/*
 * Catalogul generatoarelor din editor. Valorile implicite si limitele vin din interfetele vechi
 * (src/apps/<generator>/main.ts din magic3d-legacy); culorile implicite urmeaza marca noua.
 * Un generator nou: defs/<id>.ts (parametrii) si constructori/<id>.ts (geometria), apoi cate o
 * linie aici si in constructori.ts. Parametrii de tip "font" au cheia care incepe cu "font".
 */

export const GENERATOARE: GeneratorDef[] = [LITERE, NUME, CUVINTE, PLACUTE, BRELOCURI, BRELOC_DECOR, RAME, ARTICULAT, FAGURE, CUTII, LED, NUME_LED, GLOB_NUME_DEF, TURTA_DULCE_DEF, MEDALION_BANDA_DEF, GLOB_MODELE_DEF, ORNAMENT_DEF, STAMPILA_DEF, PRESA_DEF, TAVA_DEF, PRESA_LUT_DEF, SILICON_DEF];

export const generatorDupaId = (id: string) => GENERATOARE.find((def) => def.id === id);

/** Valorile salvate peste cele implicite: o cheie noua primeste valoarea implicita, una disparuta se pierde. */
export function parametriCompleti(def: GeneratorDef, salvati: Parametri | undefined): Parametri {
  const out: Parametri = { ...def.implicit };
  for (const [cheie, valoare] of Object.entries(salvati ?? {})) {
    if (cheie in def.implicit && typeof valoare === typeof def.implicit[cheie]) out[cheie] = valoare;
  }
  return out;
}
