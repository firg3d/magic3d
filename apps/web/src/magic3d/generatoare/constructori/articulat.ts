import { buildArticulat, configureManifold } from "@/magic3d/apps/articulat/articulat";
import { t } from "@/magic3d/core/i18n/index";
import { bool, num, piese, str, type Constructor } from "@/magic3d/generatoare/constructori/comun";

/*
 * Brelocuri Articulate: un segment (cu balamaua lui) si o litera per caracter, ca in vechea
 * previzualizare. Geometria e deja cu Z in sus (lantul culcat, litera deasupra), exact ce asteapta
 * conversia spre scena. Lantul e UN singur print in place: pozitiile raman cele absolute, iar jocurile
 * balamalelor tin segmentele vecine despartite — de aceea fiecare segment e piesa proprie.
 */

export const articulat: Constructor = (p, mod, fonturi) => {
  configureManifold(mod);
  const r = buildArticulat({
    text: str(p, "text").trim() || " ",
    font: fonturi.font,
    inaltimeLitera: num(p, "inaltimeLitera"),
    alturaLitera: num(p, "alturaLitera"),
    alto: num(p, "alto"),
    ancho: num(p, "ancho"),
    largo: num(p, "largo"),
    linkPrim: bool(p, "linkPrim"),
    linkUltim: bool(p, "linkUltim"),
    culoareBaza: str(p, "culoareBaza"),
    culoareLitera: str(p, "culoareLitera"),
  });
  const d = r.diagnostice;
  const avertizari: string[] = [];
  if (d.seLipesc) avertizari.push(t("articulat.avertLipit"));
  if (d.subMasa) avertizari.push(t("articulat.avertSubMasa"));
  if (d.literaLata.length) avertizari.push(t("articulat.avertLata", { litere: d.literaLata.join(" ") }));
  if (d.glifeLipsa.length) avertizari.push(t("articulat.statusGlifa", { litere: d.glifeLipsa.join(" ") }));
  return {
    piese: piese(
      ...r.blocuri.map((m, i) => ({ nume: t("articulat.numeSegment", { i: i + 1 }), culoare: str(p, "culoareBaza"), manifold: m })),
      ...r.litere.map((m, i) => ({ nume: t("articulat.numeLitera", { i: i + 1 }), culoare: str(p, "culoareLitera"), manifold: m })),
    ),
    avertizari,
  };
};
