import { buildPlacuta, configureManifold } from "@/magic3d/apps/placute/placute";
import { t } from "@/magic3d/core/i18n/index";
import { num, piese, str, type Constructor } from "@/magic3d/generatoare/constructori/comun";

/** Codurile de avertizare din geometrie ("tip:a:b") in text, cu traducerile Magic3D (ca in main.ts vechi). */
function avert(cod: string): string {
  const [tip, a, b] = cod.split(":");
  if (tip === "perete") return t("placute.avertPerete", { mm: a, min: b });
  if (tip === "terusIngust") return t("placute.avertTerus", { mm: a, min: b });
  if (tip === "magnetSubtire") return t("placute.avertMagnet", { mm: a });
  return cod;
}

export const placute: Constructor = (p, mod, fonturi) => {
  configureManifold(mod);
  const text = str(p, "text").trim() || " ";
  const r = buildPlacuta({
    text,
    font: fonturi.font,
    inaltimeText: num(p, "inaltimeText"),
    reliefText: num(p, "reliefText"),
    latimePlacuta: num(p, "latimePlacuta"),
    netezire: num(p, "netezire"),
    grosimePlacuta: num(p, "grosimePlacuta"),
    prindere: str(p, "prindere") as Parameters<typeof buildPlacuta>[0]["prindere"],
    diametruGaura: num(p, "diametruGaura"),
    lungimeTerus: num(p, "lungimeTerus"),
    culoarePlacuta: str(p, "culoarePlacuta"),
    culoareText: str(p, "culoareText"),
  });
  const avertizari = [r.diagnostice.avert ? avert(r.diagnostice.avert) : ""];
  if (r.diagnostice.glifeLipsa.length) avertizari.push(t("placute.statusGlifa", { litere: r.diagnostice.glifeLipsa.join(" ") }));
  return {
    piese: piese(
      { nume: t("placute.numePlacuta", { text }), culoare: str(p, "culoarePlacuta"), manifold: r.corpPlacuta },
      r.corpText ? { nume: t("placute.numeText", { text }), culoare: str(p, "culoareText"), manifold: r.corpText } : null,
    ),
    avertizari: avertizari.filter(Boolean),
  };
};
