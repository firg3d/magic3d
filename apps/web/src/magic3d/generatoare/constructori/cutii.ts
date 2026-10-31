import {
  ABATERE_MAX, buildCutie, CAMERA_LATIME_MIN, configureManifold, INALTIME_MAX, PATA_MAX, PERETE_MIN, TRASATURA_MIN,
  type CutiiConfig, type Reparatie,
} from "@/magic3d/apps/cutii/cutii";
import { t } from "@/magic3d/core/i18n/index";
import { bool, num, piese, str, type Constructor } from "@/magic3d/generatoare/constructori/comun";
import { agatareCutie } from "@/magic3d/generatoare/defs/cutii";

const f = (n: number, k = 1) => n.toLocaleString("en-US", { maximumFractionDigits: k });
const mare = (s: string) => s[0].toUpperCase() + s.slice(1);

/** Ce se poate schimba ca sa iasa cutie; sfaturile imposibile dispar (ca `remediu` din main.ts vechi). */
function remediu(rp: Reparatie): string {
  if (rp.potPerete && rp.potInaltime) return t("cutii.remediuAmandoua", { peretemax: f(rp.peretMaxMM), inaltmin: f(rp.inaltimeMinMM, 0) });
  if (rp.potPerete) return t("cutii.remediuPerete", { peretemax: f(rp.peretMaxMM) });
  if (rp.potInaltime) return t("cutii.remediuLitera", { peretemin: f(PERETE_MIN), inaltmin: f(rp.inaltimeMinMM, 0) });
  return t("cutii.remediuFont", { peretemin: f(PERETE_MIN), inaltmax: f(INALTIME_MAX, 0) });
}

/*
 * Orientarea: cutia sta culcata, cu gura in sus, ca in vechea previzualizare. Acolo se rotea cu
 * +90 de grade pe X si apoi se nega Y-ul, ceea ce compus da exact (x, y, z) -> (x, z, y) - aceeasi
 * conversie pe care o face scena editorului. Deci corpul pleaca neatins: fundul e la Z=0 din
 * constructie, iar silueta e deja centrata.
 */
export const cutii: Constructor = (p, mod, fonturi) => {
  configureManifold(mod);
  const litera = str(p, "litera").trim().charAt(0) || "A";
  const tipAgatare = agatareCutie(p) as CutiiConfig["tipAgatare"];
  const traforPereti = bool(p, "traforPereti");
  const modelFund = str(p, "modelFund") as CutiiConfig["modelFund"];
  const r = buildCutie({
    litera,
    font: fonturi.font,
    inaltimeLitera: num(p, "inaltimeLitera"),
    adancime: num(p, "adancime"),
    grosimePerete: num(p, "grosimePerete"),
    grosimeFund: num(p, "grosimeFund"),
    tipAgatare,
    surubCap: num(p, "surubCap"),
    surubTija: num(p, "surubTija"),
    latimeGrila: num(p, "latimeGrila"),
    inaltimeCapSurub: num(p, "inaltimeCapSurub"),
    modelFund,
    pasFund: num(p, "pasFund"),
    pereteFund: num(p, "pereteFund"),
    unghiFund: num(p, "unghiFund"),
    variantaFund: num(p, "variantaFund"),
    ramaFund: num(p, "ramaFund"),
    traforPereti,
    formaGol: str(p, "formaGol") as CutiiConfig["formaGol"],
    deschidere: num(p, "deschidere"),
    nervura: num(p, "nervura"),
    bandaJos: num(p, "bandaJos"),
    buzaSus: num(p, "buzaSus"),
  });
  const d = r.diagnostice;

  // Avertizarile: randurile cu `warn` din bara de stare a vechii interfete, cu aceleasi texte.
  const avertizari: string[] = [];
  if (d.camereUtile === 0) avertizari.push(t("cutii.statusFaraVolum"));
  if (d.reparatie) {
    const rp = d.reparatie;
    avertizari.push(t(d.interiorGol ? "cutii.statusFaraInterior" : "cutii.statusInteriorIngust", {
      litera, p: f(num(p, "grosimePerete"), 2), trasatura: f(rp.trasaturaMaxMM),
      necesar: f(rp.necesarMM), camera: f(CAMERA_LATIME_MIN, 0), remediu: remediu(rp),
    }));
  }
  if (tipAgatare !== "fara") {
    const a = d.agatare;
    const numeTip = t("cutii.agatare" + mare(tipAgatare));
    if (!a.pozitii.length) {
      avertizari.push(t(a.inaltimeMinMM ? "cutii.statusFaraAgatareInalt" : "cutii.statusFaraAgatare",
        { tip: numeTip, inaltmin: f(a.inaltimeMinMM, 0), cap: f(num(p, "surubCap")) }));
    } else if (Math.abs(a.inclinare) >= 0.5) {
      avertizari.push(t("cutii.statusStramb", { unghi: f(Math.abs(a.inclinare)) }));
    }
  }
  if (traforPereti) {
    const tf = d.trafor;
    if (!tf.randuri) {
      avertizari.push(t("cutii.statusFaraRanduri", { banda: f(tf.bandaMM, 0),
        nevoie: f(num(p, "deschidere") + num(p, "nervura"), 1), adanc: f(num(p, "adancime"), 0) }));
    } else if (tf.nervuraMinMM < num(p, "nervura") - 0.05) {
      avertizari.push(t("cutii.statusNervuraSubtire", { min: f(tf.nervuraMinMM, 2), cerut: f(num(p, "nervura")) }));
    }
  }
  if (modelFund !== "fara" && !(d.ariaGolFundMM2 > 0)) avertizari.push(t("cutii.statusFundNestrapuns", { rama: f(num(p, "ramaFund")) }));
  if (d.etanseitate.abatere > ABATERE_MAX) {
    avertizari.push(t("cutii.statusScurgere", { masurat: f(d.etanseitate.volumMasuratMM3, 0),
      asteptat: f(d.etanseitate.volumAsteptatMM3, 0), abatere: f(d.etanseitate.abatere * 100, 2) }));
  } else if (d.camereUtile > 0 && !d.fundEtans) {
    avertizari.push(t("cutii.statusFundStrapuns"));
  }
  if (d.bucati !== d.bucatiLitera) avertizari.push(t("cutii.statusBucati", { n: d.bucati, litera: d.bucatiLitera }));
  if (d.trasaturi.ariaMaxMM2 > PATA_MAX) {
    avertizari.push(t("cutii.statusPereteSubtire", { prag: f(TRASATURA_MIN, 2), arie: f(d.trasaturi.ariaMaxMM2, 1) }));
  }
  if (d.glifeLipsa.length) avertizari.push(t("cutii.statusGlifaLipsa", { litere: d.glifeLipsa.join(" ") }));

  return {
    piese: piese({ nume: t("cutii.numeCutie", { litera }), culoare: str(p, "culoare"), manifold: r.corpCutie }),
    avertizari,
  };
};
