import {
  buildBreloc,
  configureManifold,
  inaltimeDinLungime,
  PATA_MAX,
  SECTIUNE_MIN,
  TRASATURA_MIN,
  type LaturaPrindere,
  type TipPrindere,
} from "@/magic3d/apps/brelocuri/breloc";
import { t } from "@/magic3d/core/i18n/index";
import { num, piese, str, type Constructor } from "@/magic3d/generatoare/constructori/comun";

const f = (n: number, k = 1) => n.toLocaleString("en-US", { maximumFractionDigits: k });

/*
 * Brelocuri: numele pe o placuta, o singura piesa fizica in doua culori (placuta jos, textul peste),
 * deci doua corpuri. Manerul de tragere al prinderii din vechea aplicatie nu e produs si nu ajunge
 * aici: prinderea se aseaza mereu automat, pe latura aleasa.
 */
export const brelocuri: Constructor = (p, mod, fonturi) => {
  configureManifold(mod);
  const text = str(p, "text").trim() || " ";
  const latimePlacuta = num(p, "latimePlacuta");
  // inaltimea literei nu e parametru: rezulta din lungimea ceruta a brelocului
  const inaltimeLitera = inaltimeDinLungime(fonturi.font, text, num(p, "lungimePlacuta"), latimePlacuta);
  const tipPrindere = str(p, "tipPrindere") as TipPrindere;
  const r = buildBreloc({
    text,
    font: fonturi.font,
    inaltimeLitera,
    reliefLitera: num(p, "reliefLitera"),
    latimePlacuta,
    netezire: num(p, "netezire"),
    grosimePlacuta: num(p, "grosimePlacuta"),
    diametruGaura: num(p, "diametruGaura"),
    tipPrindere,
    grosimePrindere: num(p, "grosimePrindere"),
    pozitiePrindere: null,
    latura: str(p, "latura") as LaturaPrindere,
  });

  // avertizarile din bara de stare a vechii aplicatii (doar cele marcate warn)
  const d = r.diagnostice;
  const g = d.gaura;
  const avertizari: string[] = [];
  if (!g.pozitie) {
    avertizari.push(g.pozitieRespinsa
      ? t("brelocuri.statusPozitieRespinsa")
      : tipPrindere === "gaura"
        ? t("brelocuri.statusFaraGaura", { latime: f(g.latimeNecesara) })
        : t("brelocuri.statusFaraLoc"));
  } else {
    if (g.atingeLitera) avertizari.push(t("brelocuri.statusGauraAtinge"));
    if (g.perete < 2) avertizari.push(t("brelocuri.statusPereteSubtire", { perete: f(g.perete, 2) }));
    if (g.sectiuneMM2 < SECTIUNE_MIN) avertizari.push(t("brelocuri.statusSectiuneMica", { s: f(g.sectiuneMM2, 1), prag: SECTIUNE_MIN }));
  }
  if (d.trasaturi.ariaMaxMM2 > PATA_MAX) avertizari.push(t("brelocuri.statusTrasaturaSubtire", { prag: f(TRASATURA_MIN, 2), arie: f(d.trasaturi.ariaMaxMM2, 1) }));
  if (d.trasaturiPlacuta.ariaMaxMM2 > PATA_MAX) avertizari.push(t("brelocuri.statusGatSubtire", { prag: f(TRASATURA_MIN, 2) }));
  if (d.bucati > 1) avertizari.push(t("brelocuri.statusBucati", { n: d.bucati }));
  if (d.glifeLipsa.length) avertizari.push(t("brelocuri.statusGlifaLipsa", { litere: d.glifeLipsa.join(" ") }));

  return {
    piese: piese(
      { nume: t("brelocuri.numePlacuta", { text }), culoare: str(p, "culoarePlacuta"), manifold: r.corpPlacuta },
      { nume: t("brelocuri.numeLitera", { text }), culoare: str(p, "culoareLitera"), manifold: r.corpLitera },
    ),
    avertizari,
  };
};
