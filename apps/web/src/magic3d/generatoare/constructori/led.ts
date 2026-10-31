import {
  buildLed, configureManifold, evalueazaFont, FATA_MAX_UTIL, JOC_BANDA, PATA_MAX, PERETE_CANAL, TRASATURA_MIN,
  type LocCanal, type PozitieCanal, type TipAgatare, type TipBanda,
} from "@/magic3d/apps/led/led";
import { t } from "@/magic3d/core/i18n/index";
import { num, piese, str, type Constructor } from "@/magic3d/generatoare/constructori/comun";

/* Litere LED: corpul opac si fata translucida, montate (ca in vederea "ansamblu" din main.ts vechi). */

/** Cifrele din mesaje, formatate ca in bara de stare veche. */
const f = (n: number, k = 1) => n.toLocaleString("en-US", { maximumFractionDigits: k });

export const led: Constructor = (p, mod, fonturi) => {
  configureManifold(mod);
  const litera = (Array.from(str(p, "litera").trim())[0] ?? "A").toUpperCase();
  const tipBanda = num(p, "tipBanda") as TipBanda;
  const tipAgatare = str(p, "tipAgatare") as TipAgatare;
  const cfg = {
    litera,
    font: fonturi.font,
    inaltimeLitera: num(p, "inaltimeLitera"),
    adancimeCorp: num(p, "adancimeCorp"),
    ingrosare: num(p, "ingrosare"),
    grosimePerete: num(p, "grosimePerete"),
    grosimeSpate: num(p, "grosimeSpate"),
    latimeBanda: num(p, "latimeBanda"),
    tipBanda,
    latimePrag: num(p, "latimePrag"),
    adancimePrag: num(p, "adancimePrag"),
    grosimeFata: num(p, "grosimeFata"),
    jocFata: num(p, "jocFata"),
    diametruCanal: num(p, "diametruCanal"),
    pozitieCanal: str(p, "pozitieCanal") as PozitieCanal,
    locCanal: str(p, "locCanal") as LocCanal,
    tipAgatare,
    surubCap: num(p, "surubCap"),
    surubTija: num(p, "surubTija"),
    inaltimeCapSurub: num(p, "inaltimeCapSurub"),
    latimeGrila: num(p, "latimeGrila"),
  };
  const r = buildLed(cfg);
  const d = r.diagnostice;

  // Doar randurile cu `warn` din bara de stare veche: restul sunt informatii, nu avertizari.
  const av: string[] = [];
  const ig = d.ingrosare;
  if (cfg.ingrosare > 0 && ig.contraForme < ig.contraFormeInitial) {
    av.push(t("led.statusContraFormeAstupate", { n: ig.contraFormeInitial - ig.contraForme, mm: f(ig.mm) }));
  }
  const o = d.optic;
  if (!o.uniform) {
    av.push(t(o.bandaPotrivita ? "led.statusOpticPuncteAlta" : "led.statusOpticPuncte", {
      dist: f(o.distantaMM), pas: f(o.pasMM), tip: tipBanda, adanc: f(cfg.adancimeCorp, 0),
      minim: f(o.adancimeMinima, 0), alta: o.bandaPotrivita ?? "",
    }));
  }
  if (o.fataPreaGroasa) av.push(t("led.statusFataGroasa", { g: f(cfg.grosimeFata), prag: f(FATA_MAX_UTIL) }));
  if (!d.camereUtile) {
    av.push(t(ig.necesarMM ? "led.statusBandaNuIncapeIngros" : "led.statusBandaNuIncape", {
      lat: f(cfg.latimeBanda), joc: f(JOC_BANDA), p: f(cfg.grosimePerete, 2), ingros: f(ig.necesarMM),
    }));
    // verdictul de font din selectorul vechi (verdictBanda): de la ce inaltime de litera ar merge
    const v = evalueazaFont(cfg.font, litera, cfg.inaltimeLitera, cfg.grosimePerete, cfg.latimePrag, cfg.latimeBanda, cfg.ingrosare);
    if (!v.ok) {
      av.push(t(v.inaltimeMinMM ? "led.fontRespinsInalt" : "led.fontRespins",
        { trasatura: v.trasaturaMaxMM.toFixed(1), necesar: v.necesarMM.toFixed(1), inaltmin: v.inaltimeMinMM }));
    }
  }
  if (d.fata.faraPrag) {
    av.push(t("led.statusFaraPrag", { p: f(cfg.grosimePerete, 2) }));
  } else {
    if (d.fata.coliziuneMM3 > 0) av.push(t("led.statusFataSeLoveste", { v: f(d.fata.coliziuneMM3, 2) }));
    if (d.fata.subBuzaMM <= -0.05) av.push(t("led.statusFataIese", { mm: f(-d.fata.subBuzaMM, 2) }));
  }
  if (tipAgatare !== "fara") {
    const a = d.agatare;
    const numeTip = t("led.agatare" + tipAgatare[0].toUpperCase() + tipAgatare.slice(1));
    if (!a.pozitii.length) av.push(t("led.statusFaraAgatare", { tip: numeTip }));
    else if (Math.abs(a.inclinare) >= 0.5) av.push(t("led.statusStramb", { unghi: f(Math.abs(a.inclinare)) }));
  }
  const cn = d.canal;
  if (!cn.punct) {
    av.push(t("led.statusFaraCanal", { d: f(cn.diametruMM), perete: f(PERETE_CANAL) }));
  } else if (cn.peretRamasMM < PERETE_CANAL - 0.01) {
    av.push(t("led.statusCanal", { tip: t("led.canal_" + cn.pozitie), d: f(cn.diametruMM), loc: t("led.loc_" + cn.loc), perete: f(cn.peretRamasMM, 2) }));
  }
  if (d.bucati !== d.bucatiLitera) av.push(t("led.statusBucati", { n: d.bucati, litera: d.bucatiLitera }));
  if (d.trasaturi.ariaMaxMM2 > PATA_MAX) {
    av.push(t("led.statusPereteSubtire", { prag: f(TRASATURA_MIN, 2), arie: f(d.trasaturi.ariaMaxMM2, 1) }));
  }
  if (d.glifeLipsa.length) av.push(t("led.statusGlifaLipsa", { litere: d.glifeLipsa.join(" ") }));

  return {
    piese: piese(
      { nume: t("led.numeCorp", { litera }), culoare: str(p, "culoare"), manifold: r.corpOpac },
      r.corpFata ? { nume: t("led.numeFata", { litera }), culoare: str(p, "culoareFata"), manifold: r.corpFata } : null,
    ),
    avertizari: av,
  };
};
