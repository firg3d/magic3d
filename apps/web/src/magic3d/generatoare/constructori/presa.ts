import { SETARI_PRINT_PRESA } from "@/magic3d/apps/presa/config";
import { buildPresa, configureManifold, type ParamPresa } from "@/magic3d/apps/presa/presa";
import type { ModContinut } from "@/magic3d/core/geometry/emblema";
import { t } from "@/magic3d/core/i18n/index";
import { num, piese, str, type Constructor } from "@/magic3d/generatoare/constructori/comun";
import { PRESA } from "@/magic3d/apps/presa/config";

/*
 * Presa de hartie: pozitivul si negativul. Clestele e un singur obiect din doua parti (bratele se
 * printeaza impreuna, legate de balama); placile sunt doua obiecte pe aceeasi placa.
 */

export const presa: Constructor = (p, mod, fonturi) => {
  configureManifold(mod);
  const cfg: ParamPresa = {
    corp: str(p, "corp") === "placi" ? "placi" : "cleste",
    mod: str(p, "continut") as ModContinut,
    font: fonturi.font,
    text: str(p, "text"),
    imagine: str(p, "imagine"),
    diametru: num(p, "diametru"),
    bordura: num(p, "bordura"),
    relief: num(p, "relief"),
    hartie: num(p, "hartie"),
  };
  const r = buildPresa(cfg);
  const avertizari: string[] = [];
  if (r.diag.gol) avertizari.push(t(cfg.mod === "text" ? "presa.avertFaraText" : "presa.avertFaraImagine"));
  if (!r.diag.incape) avertizari.push(t("presa.avertNuIncape"));
  if (r.diag.ariaSubtire > 0) avertizari.push(t("presa.avertFin", { mm: PRESA.detaliuMin, mm2: r.diag.ariaSubtire.toFixed(1) }));
  if (r.diag.glifeLipsa.length) avertizari.push(t("presa.avertGlife", { litere: [...new Set(r.diag.glifeLipsa)].join(" ") }));
  const cleste = cfg.corp === "cleste";
  return {
    piese: piese(...r.piese.map((piesa) => ({
      nume: t(`presa.piesa_${piesa.rol}`),
      culoare: str(p, piesa.rol === "pozitiv" ? "culoarePozitiv" : "culoareNegativ"),
      manifold: piesa.manifold,
      print: { placa: 0, obiect: t(cleste ? "presa.obiectCleste" : `presa.piesa_${piesa.rol}`), setari: SETARI_PRINT_PRESA },
    }))),
    avertizari,
  };
};
