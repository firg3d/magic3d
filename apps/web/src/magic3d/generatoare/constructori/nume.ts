import { buildNume, configureManifold } from "@/magic3d/apps/nume/nume";
import {
  INALTIME_MIN,
  RAZA_PUNTE,
  UNGHI_MIN,
  CONTUR_MAX,
  type DiagnosticCuvant,
  type ModProdus,
  type RezultatCuvant,
  type TipAgatare,
  type TipContur,
} from "@/magic3d/core/geometry/cuvant";
import { t } from "@/magic3d/core/i18n/index";
import { bool, num, piese, str, type Constructor, type PiesaManifold } from "@/magic3d/generatoare/constructori/comun";
import type { Parametri } from "@/magic3d/generatoare/tipuri";

/*
 * Partea comuna Nume 3D / Cuvinte Decor: parametrii piesei (StarePiesa), avertizarile din bara de
 * stare veche (stariPiesa din core/ui/panouri-cuvant.ts, doar randurile cu warn) si corpurile.
 */

/** Placa pe care vechea aplicatie masura incadrarea cand nu stia alta (ctx.placa() lipsa). */
export const PLACA = { w: 256, d: 256 };

const f = (n: number, k = 1) => n.toLocaleString("en-US", { maximumFractionDigits: k });

/** Parametrii piesei, in forma ceruta de construiestePiesa (fara solid si inaltime). */
export function parametriPiesa(p: Parametri) {
  return {
    grosime: num(p, "grosime"),
    punti: bool(p, "punti"),
    latimePunte: num(p, "latimePunte"),
    contur: str(p, "contur") as TipContur,
    latimeContur: num(p, "latimeContur"),
    netezireContur: num(p, "netezireContur"),
    grosimeContur: num(p, "grosimeContur"),
    modProdus: str(p, "modProdus") as ModProdus,
    tipAgatare: str(p, "tipAgatare") as TipAgatare,
    surubCap: num(p, "surubCap"),
    surubTija: num(p, "surubTija"),
    inaltimeCapSurub: num(p, "inaltimeCapSurub"),
    latimeGrila: num(p, "latimeGrila"),
    capac: bool(p, "capac"),
    grosimeCapac: num(p, "grosimeCapac"),
    placa: PLACA,
  };
}

const numeTip = (tip: string) => t("piesa.agatare" + tip[0].toUpperCase() + tip.slice(1));

function textRemediu(r: DiagnosticCuvant["stabilitate"]["remediu"]): string {
  return r.fel === "contur" ? t("piesa.remediuContur", { lat: f(r.latimeMM) })
    : r.fel === "latime" ? t("piesa.remediuLatime", { lat: f(r.latimeMM) })
      : t("piesa.remediuFont", { max: f(CONTUR_MAX, 0) });
}

/** Randurile cu warn: true din stariPiesa (panouri-cuvant.ts), in aceeasi ordine si cu aceleasi texte. */
export function avertizariPiesa(p: Parametri, d: DiagnosticCuvant): string[] {
  const out: string[] = [];
  const inaltime = num(p, "inaltimeLitera");
  const contur = str(p, "contur");
  const mod = str(p, "modProdus");
  const tip = str(p, "tipAgatare");
  if (d.bucati > 1) {
    out.push(t(bool(p, "punti") ? "piesa.statusBucatiRamase" : "piesa.statusBucatiFaraPunti", {
      n: d.bucati, mic: f(d.ariiBucatiMM2[d.ariiBucatiMM2.length - 1] ?? 0, 0), max: f(RAZA_PUNTE * inaltime, 0) }));
  }
  if (contur !== "fara" && d.contraFormeInchise) {
    out.push(t("piesa.statusOchiInchisi", { n: d.contraFormeInchise, netezire: f(num(p, "netezireContur")) }));
  }
  const pl = d.placa;
  if (!pl.incape) {
    out.push(t(pl.inaltimeMaxMM ? "piesa.statusPreaLung" : "piesa.statusPreaLungDeloc", {
      w: f(pl.latimeMM, 0), h: f(pl.adancimeMM, 0), placaW: PLACA.w, placaD: PLACA.d,
      inaltmax: f(pl.inaltimeMaxMM, 0), inaltmin: INALTIME_MIN }));
  }
  if (mod === "perete" && tip !== "fara") {
    const a = d.agatare;
    if (!a.pozitii.length) {
      out.push(t(a.grosimeNecesaraMM ? "piesa.statusFaraAgatareSubtire" : "piesa.statusFaraAgatare", {
        tip: numeTip(tip), material: f(a.materialMM), gros: f(a.grosimeNecesaraMM),
        unde: t(contur === "placa" ? "piesa.undePlaca" : "piesa.undeNume") }));
    } else {
      if (tip === "gaura" && !a.grosimeCapacMM) out.push(t("piesa.statusFaraCapac"));
      if (Math.abs(a.inclinare) >= 0.5) out.push(t("piesa.statusStramb", { unghi: f(Math.abs(a.inclinare)) }));
    }
  }
  const s = d.stabilitate;
  if (mod !== "perete" && !s.staSingura) {
    out.push(t(s.marjaMM < 0 ? "piesa.statusCade" : "piesa.statusCadeUsor", {
      marja: f(Math.abs(s.marjaMM)), unghi: f(s.unghiMinGrade, 0), min: UNGHI_MIN,
      h: f(s.inaltimeCentruMM), remediu: textRemediu(s.remediu) }));
  }
  return out;
}

/** Corpurile din scena veche: numele/cuvantul, conturul, capacele (piesa separata). */
export function corpuri(p: Parametri, r: RezultatCuvant, numeCorp: string): PiesaManifold[] {
  return piese(
    { nume: numeCorp, culoare: str(p, "culoare"), manifold: r.corp },
    r.contur ? { nume: t("piesa.numeContur"), culoare: str(p, "culoareContur"), manifold: r.contur } : null,
    r.capac ? { nume: t("piesa.numeCapac"), culoare: str(p, "culoareCapac"), manifold: r.capac } : null,
  );
}

export const nume: Constructor = (p, mod, fonturi) => {
  configureManifold(mod);
  const text = str(p, "text").trim() || " ";
  // Nume 3D nu da factorMaxPunte (implicit 1): o punte lunga e o bara slaba prin aer.
  const r = buildNume({ ...parametriPiesa(p), text, font: fonturi.font, inaltimeLitera: num(p, "inaltimeLitera") });
  const d = r.diagnostice;
  const avertizari = avertizariPiesa(p, d);
  if (d.glifeLipsa.length) avertizari.push(t("nume.statusGlifaLipsa", { litere: d.glifeLipsa.join(" ") }));
  return { piese: corpuri(p, r, t("nume.numeCorp", { text: str(p, "text") })), avertizari };
};
