import { IMPLICIT_PIESA, PARAMETRI_PIESA, parametriText } from "@/magic3d/generatoare/defs/nume";
import type { GeneratorDef } from "@/magic3d/generatoare/tipuri";

/*
 * Cuvinte Decor: valorile si limitele din src/apps/cuvinte/main.ts (magic3d-legacy). Simbolurile
 * (♥ ★ ⌂ ...) se scriu direct in text, ca orice caracter: vechiul buton "adauga simbol" doar le
 * scria acolo, iar aici eticheta textului le enumera.
 */

export const CUVINTE: GeneratorDef = {
  id: "cuvinte",
  titlu: "comutator.cuvinte",
  versiune: 1,
  implicit: {
    text: "ma♥ma",
    font: "GreatVibes-Regular.ttf",
    inaltimeLitera: 55,
    ...IMPLICIT_PIESA,
  },
  parametri: [...parametriText("cuvinte", "cuvinte.grupCuvant", "cuvinte.textSimboluri"), ...PARAMETRI_PIESA],
};
