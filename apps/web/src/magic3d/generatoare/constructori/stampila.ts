import { SETARI_PRINT_STAMPILA } from "@/magic3d/apps/stampila/config";
import { buildStampila, configureManifold, type ParamStampila, type RolStampila } from "@/magic3d/apps/stampila/stampila";
import type { ModContinut } from "@/magic3d/core/geometry/emblema";
import { t } from "@/magic3d/core/i18n/index";
import { bool, num, piese, str, type Constructor } from "@/magic3d/generatoare/constructori/comun";

/*
 * Stampila: fata (cu desenul in relief) si manerul (cu marcajul de orientare pe varf). La cerneala
 * fata si manerul sunt obiecte pe placi separate (TPU, respectiv PLA); la lut stau pe aceeasi placa.
 */

const CULOARE: Record<RolStampila, string> = { fata: "culoareFata", maner: "culoareManer", marcaj: "culoareMarcaj" };

export const stampila: Constructor = (p, mod, fonturi) => {
  configureManifold(mod);
  const varianta = str(p, "varianta") === "lut" ? "lut" : "cerneala";
  const cfg: ParamStampila = {
    varianta,
    mod: str(p, "continut") as ModContinut,
    font: fonturi.font,
    text: str(p, "text"),
    imagine: str(p, "imagine"),
    forma: str(p, "forma") as ParamStampila["forma"],
    latime: num(p, "latime"),
    inaltime: num(p, "inaltime"),
    bordura: num(p, "bordura"),
    relief: varianta === "lut" ? num(p, "reliefLut") : num(p, "reliefCerneala"),
    oglindit: bool(p, "oglindit"),
    maner: str(p, "maner") as ParamStampila["maner"],
    marcaj: str(p, "marcaj") === "sageata" ? "sageata" : "model",
  };
  const r = buildStampila(cfg);
  const avertizari: string[] = [];
  if (r.diag.gol) avertizari.push(t(cfg.mod === "text" ? "stampila.avertFaraText" : "stampila.avertFaraImagine"));
  if (!r.diag.incape) avertizari.push(t("stampila.avertNuIncape"));
  if (r.diag.ariaSubtire > 0) avertizari.push(t("stampila.avertSubtire", { mm: r.diag.liniaMin, mm2: r.diag.ariaSubtire.toFixed(1) }));
  if (r.diag.glifeLipsa.length) avertizari.push(t("stampila.avertGlife", { litere: [...new Set(r.diag.glifeLipsa)].join(" ") }));

  // Fata in stanga, manerul in dreapta; la cerneala fiecare pe placa lui.
  const pas = r.diag.latime / 2 + 6;
  const lut = varianta === "lut";
  return {
    piese: piese(...r.piese.map((piesa) => {
      const fata = piesa.rol === "fata";
      return {
        nume: t(`stampila.piesa_${piesa.rol}`),
        culoare: str(p, CULOARE[piesa.rol]),
        manifold: piesa.manifold.translate([fata ? -pas : pas, 0, 0]),
        print: {
          placa: fata || lut ? 0 : 1,
          obiect: t(fata ? "stampila.piesa_fata" : "stampila.piesa_maner"),
          setari: fata ? SETARI_PRINT_STAMPILA.fata : SETARI_PRINT_STAMPILA.maner,
        },
      };
    })),
    avertizari,
  };
};
