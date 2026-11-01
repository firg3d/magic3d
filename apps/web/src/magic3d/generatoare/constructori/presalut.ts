import { PRESA_LUT, SETARI_PRINT_PRESA_LUT } from "@/magic3d/apps/presalut/config";
import { buildPresaLut, configureManifold, type ParamPresaLut } from "@/magic3d/apps/presalut/presalut";
import type { FormaDecor } from "@/magic3d/core/geometry/formeDecor";
import { t } from "@/magic3d/core/i18n/index";
import { num, piese, str, type Constructor } from "@/magic3d/generatoare/constructori/comun";
import { stampila } from "@/magic3d/generatoare/constructori/stampila";
import { STAMPILA_DEF } from "@/magic3d/generatoare/defs/stampila";

/*
 * Presa pentru lut si sapun. Doua jumatati: cele doua pe aceeasi placa, fiecare obiect separat.
 * O singura fata: stampila pentru lut (acelasi constructor), cu marimea, relieful si manerul de aici.
 */

export const presalut: Constructor = (p, mod, fonturi, modele) => {
  if (str(p, "tip") === "fata") {
    return stampila({
      ...STAMPILA_DEF.implicit,
      varianta: "lut",
      continut: str(p, "continut"),
      text: str(p, "text"),
      font: str(p, "font"),
      imagine: str(p, "imagine"),
      forma: str(p, "formaFata"),
      latime: num(p, "latime"),
      inaltime: Math.round(num(p, "latime") * 0.7),
      reliefLut: num(p, "relief"),
      oglindit: true,
      maner: str(p, "maner"),
      culoareFata: str(p, "culoare"),
      culoareManer: str(p, "culoare"),
    }, mod, fonturi, modele);
  }
  configureManifold(mod);
  const cfg: ParamPresaLut = {
    sursa: str(p, "sursa") === "imagine" ? "imagine" : "forma",
    forma: str(p, "forma") as FormaDecor,
    imagine: str(p, "imagine"),
    latime: Math.max(PRESA_LUT.latimeMin, Math.min(PRESA_LUT.latimeMax, num(p, "latime"))),
    adancime: Math.max(PRESA_LUT.adancimeMin, Math.min(PRESA_LUT.adancimeMax, num(p, "adancime"))),
    perete: Math.max(PRESA_LUT.pereteMin, Math.min(PRESA_LUT.pereteMax, num(p, "perete"))),
    draft: num(p, "draft"),
    racordare: num(p, "racordare"),
    font: fonturi.font,
    text: str(p, "text"),
  };
  const r = buildPresaLut(cfg);
  const avertizari: string[] = [];
  if (r.diag.lipsa) avertizari.push(t(`tava.avert_${r.diag.lipsa}`));
  if (!r.diag.textIncape) avertizari.push(t("presalut.avertText"));
  if (r.diag.glifeLipsa.length) avertizari.push(t("stampila.avertGlife", { litere: [...new Set(r.diag.glifeLipsa)].join(" ") }));
  if (!r.diag.lipsa) avertizari.push(t("presalut.notaVolum", { ml: (r.diag.volum / 1000).toFixed(0) }));
  // Amandoua pe o placa cand incap una langa alta; altfel jumatatea de sus pe a doua placa.
  const cutii = r.piese.map((piesa) => piesa.manifold.boundingBox());
  const latime = cutii.length ? Math.max(...cutii.map((b) => b.max[0])) - Math.min(...cutii.map((b) => b.min[0])) : 0;
  const separat = latime > PRESA_LUT.pat;
  return {
    piese: piese(...r.piese.map((piesa) => ({
      nume: t(`presalut.piesa_${piesa.rol}`),
      culoare: str(p, "culoare"),
      manifold: piesa.manifold,
      print: { placa: separat && piesa.rol === "sus" ? 1 : 0, obiect: t(`presalut.piesa_${piesa.rol}`), setari: SETARI_PRINT_PRESA_LUT },
    }))),
    avertizari,
  };
};
