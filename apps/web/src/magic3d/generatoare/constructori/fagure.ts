import { buildFagure, configureManifold, PATA_MAX, TRASATURA_MIN, UNGHI_RASTURNARE_MIN, type FagureConfig } from "@/magic3d/apps/fagure/fagure";
import { t } from "@/magic3d/core/i18n/index";
import { bool, num, piese, str, type Constructor } from "@/magic3d/generatoare/constructori/comun";

const f = (n: number, k = 1) => n.toLocaleString("en-US", { maximumFractionDigits: k });

/**
 * Litera sta IN PICIOARE, ca in vechea previzualizare: varful literei (Y negativ in model, ca la
 * opentype) ajunge sus, talpa pe placa (Z=0), grosimea spre privitor. E o rotatie proprie de -90
 * de grade in jurul lui X, nu o oglindire: (x, y, z) -> (x, z, -y). Fara ea, piesa ar sta culcata,
 * adica in orientarea de print, nu in cea in care e proiectata. Toate corpurile (litera, modelul
 * gravat, capacul) primesc aceeasi transformare, deci raman unde le arata vechea interfata.
 */
function inPicioare(corp: any, ref: { min: number[]; max: number[] }): any {
  const cx = (ref.min[0] + ref.max[0]) / 2;
  const cz = (ref.min[2] + ref.max[2]) / 2;
  return corp.translate([-cx, -ref.max[1], -cz]).rotate([-90, 0, 0]);
}

export const fagure: Constructor = (p, mod, fonturi) => {
  configureManifold(mod);
  const litera = str(p, "litera").trim().charAt(0) || "A";
  const tipAgatare = str(p, "tipAgatare") as FagureConfig["tipAgatare"];
  const modModel = str(p, "modModel") as FagureConfig["modModel"];
  const r = buildFagure({
    litera,
    font: fonturi.font,
    inaltimeLitera: num(p, "inaltimeLitera"),
    grosime: num(p, "grosime"),
    model: str(p, "model") as FagureConfig["model"],
    pasCelula: num(p, "pasCelula"),
    grosimePerete: num(p, "grosimePerete"),
    latimeRama: num(p, "latimeRama"),
    unghiModel: num(p, "unghiModel"),
    variantaModel: num(p, "variantaModel"),
    taiereBaza: num(p, "taiereBaza"),
    modModel,
    adancimeGravare: num(p, "adancimeGravare"),
    talpaPlina: num(p, "talpaPlina"),
    tipAgatare,
    capacel: bool(p, "capacel"),
    surubCap: num(p, "surubCap"),
    surubTija: num(p, "surubTija"),
    inaltimeCapSurub: num(p, "inaltimeCapSurub"),
    grosimeCapac: num(p, "grosimeCapac"),
    latimeGrila: num(p, "latimeGrila"),
  });
  const d = r.diagnostice;

  // Avertizarile: randurile cu `warn` din bara de stare a vechii interfete, cu aceleasi texte.
  const avertizari: string[] = [];
  const s = d.stabilitate;
  if (!s.staSingura) {
    avertizari.push(t("fagure.statusInstabil", { unghi: f(s.unghiFataSpate), lat: f(s.unghiLateral), arie: f(s.ariaSprijinMM2, 0), prag: f(UNGHI_RASTURNARE_MIN, 0) }));
  }
  if (d.bucati > d.bucatiLitera) avertizari.push(t("fagure.statusBucati", { n: d.bucati, litera: d.bucatiLitera }));
  if (d.faraInterior) avertizari.push(t("fagure.statusFaraInterior", { rama: f(num(p, "latimeRama")) }));
  if (tipAgatare !== "fara") {
    const a = d.agatare;
    if (!a.pozitii.length) avertizari.push(t("fagure.statusFaraAgatare"));
    else {
      if (r.corpCapac && a.spatiuCap < num(p, "inaltimeCapSurub") - 1e-6) {
        avertizari.push(t("fagure.statusCapacIese", { spatiu: f(a.spatiuCap), cap: f(num(p, "inaltimeCapSurub")) }));
      }
      if (Math.abs(a.inclinare) >= 0.5) avertizari.push(t("fagure.statusStramb", { unghi: f(Math.abs(a.inclinare)) }));
    }
  }
  if (d.trasaturi.ariaMaxMM2 > PATA_MAX) {
    avertizari.push(t("fagure.statusPereteSubtire", { prag: f(TRASATURA_MIN, 2), arie: f(d.trasaturi.ariaMaxMM2, 1) }));
  }
  if (d.glifeLipsa.length) avertizari.push(t("fagure.statusGlifaLipsa", { litere: d.glifeLipsa.join(" ") }));

  const ref = r.corpLitera.boundingBox();
  const culoare = str(p, "culoare");
  return {
    // La gravat: placa si modelul sunt doua corpuri ale aceleiasi piese, in doua culori. Capacul
    // e piesa separata (se printeaza deoparte si se apasa in locas dupa montare).
    piese: piese(
      { nume: t("fagure.numeLitera", { litera }), culoare, manifold: inPicioare(r.corpLitera, ref) },
      r.corpModel ? { nume: t("fagure.numeModel", { litera }), culoare: str(p, "culoareModel"), manifold: inPicioare(r.corpModel, ref) } : null,
      r.corpCapac ? { nume: t("fagure.numeCapac", { n: d.agatare.pozitii.length }), culoare, manifold: inPicioare(r.corpCapac, ref) } : null,
    ),
    avertizari,
  };
};

