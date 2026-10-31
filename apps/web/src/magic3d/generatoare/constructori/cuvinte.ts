import { caractereFaraSursa, configureManifold as configCuvinte, solidCuvant } from "@/magic3d/apps/cuvinte/cuvinte";
import { incarcaSimboluri, simboluri, type Simbol } from "@/magic3d/apps/cuvinte/simboluri";
import { configureManifold as configCuvant, construiestePiesa } from "@/magic3d/core/geometry/cuvant";
import { configureManifold as configTextSolid } from "@/magic3d/core/geometry/textSolid";
import { t } from "@/magic3d/core/i18n/index";
import manifestSimboluri from "@/magic3d/date/simboluri/manifest.json";
import { avertizariPiesa, corpuri, parametriPiesa } from "@/magic3d/generatoare/constructori/nume";
import { num, str, type Constructor } from "@/magic3d/generatoare/constructori/comun";

/*
 * Cuvinte Decor: ca Nume 3D, cu solidul cuvantului din solidCuvant (simbolurile din biblioteca in
 * locul caracterelor lor) si cu punti mai lungi acceptate (factorMaxPunte 3.2, ca in main.ts vechi).
 */

/** Politica de produs din vechiul config(): aici literele TREBUIE sa se atinga. */
const FACTOR_MAX_PUNTE = 3.2;

export const cuvinte: Constructor = (p, mod, fonturi) => {
  configTextSolid(mod);
  configCuvant(mod);
  configCuvinte(mod);
  // biblioteca, o singura data per worker (vechiul main.ts: incarcaSimboluri(json.simboluri ?? []))
  if (!simboluri().length) incarcaSimboluri(((manifestSimboluri as { simboluri?: unknown[] }).simboluri ?? []) as Simbol[]);

  const font = fonturi.font;
  const text = str(p, "text").trim() || " ";
  const r = construiestePiesa({
    ...parametriPiesa(p),
    inaltime: num(p, "inaltimeLitera"),
    solid: (inaltime: number, grosime: number, rep?: object) => solidCuvant(font, text, inaltime, grosime, rep),
    factorMaxPunte: FACTOR_MAX_PUNTE,
  });
  const avertizari = avertizariPiesa(p, r.diagnostice);
  const fara = caractereFaraSursa(font, str(p, "text"));
  if (fara.length) avertizari.push(t("cuvinte.statusFaraSursa", { litere: fara.join(" ") }));
  return { piese: corpuri(p, r, t("cuvinte.numeCorp", { text: str(p, "text") })), avertizari };
};
