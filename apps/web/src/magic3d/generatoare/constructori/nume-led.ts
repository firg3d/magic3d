import {
  buildNumeLed, configureManifold, FATA_MAX_UTIL, ingrosareaCareMerge, PERETE_OPAC_MIN,
  type LocCanal, type ModProdus, type PozitieCanal, type TipAgatare, type TipBanda,
} from "@/magic3d/apps/nume-led/nume-led";
import { t } from "@/magic3d/core/i18n/index";
import { bool, num, piese, str, type Constructor } from "@/magic3d/generatoare/constructori/comun";

/* Nume LED: corpul opac si fata translucida, montate (ca in vederea "ansamblu" din main.ts vechi). */

const f = (n: number, k = 1) => n.toLocaleString("en-US", { maximumFractionDigits: k });

/*
 * Ce avea starea veche fara control in panou: suruburile si agatatoarea cu dinti raman la valorile
 * implicite (cap 5 / tija 2.5 mm, cap de 3 mm, grila de 20 mm). Placa era a editorului vechi; aici placa e a
 * editorului, care isi verifica singur incadrarea. O placa "fara margini" face ca buildNumeLed sa
 * nu mai caute inaltimea care incape (inaltimeaCareIncape), munca degeaba aici.
 */
const SURUB_CAP = 5;
const SURUB_TIJA = 2.5;
const INALTIME_CAP_SURUB = 3;
const LATIME_GRILA = 20;
const PLACA = { w: 1e6, d: 1e6 };

export const numeLed: Constructor = (p, mod, fonturi) => {
  configureManifold(mod);
  const text = str(p, "text").trim() || "Maria";
  const av: string[] = [];
  const grosimePerete = num(p, "grosimePerete");
  const latimePrag = num(p, "latimePrag");
  const latimeBanda = num(p, "latimeBanda");
  const inaltimeLitera = num(p, "inaltimeLitera");
  let ingrosare = num(p, "ingrosare");
  if (bool(p, "ingrosareAuto")) {
    // ce facea butonul vechi, la fiecare generare: cauta ingrosarea minima si o pune
    const gasit = ingrosareaCareMerge(fonturi.font, text, inaltimeLitera, grosimePerete, latimePrag, latimeBanda);
    if (gasit >= 0) ingrosare = gasit;
    av.push(gasit < 0 ? t("numeled.sfatNiciuna") : gasit === 0 ? t("numeled.sfatMergeAsa") : t("numeled.sfatValoare", { mm: gasit }));
  }
  const tipBanda = num(p, "tipBanda") as TipBanda;
  const r = buildNumeLed({
    text,
    font: fonturi.font,
    modProdus: str(p, "modProdus") as ModProdus,
    inaltimeLitera,
    adancimeCorp: num(p, "adancimeCorp"),
    ingrosare,
    grosimePerete,
    grosimeSpate: num(p, "grosimeSpate"),
    latimeBanda,
    tipBanda,
    latimePrag,
    adancimePrag: num(p, "adancimePrag"),
    grosimeFata: num(p, "grosimeFata"),
    jocFata: num(p, "jocFata"),
    diametruCanal: num(p, "diametruCanal"),
    pozitieCanal: str(p, "pozitieCanal") as PozitieCanal,
    locCanal: str(p, "locCanal") as LocCanal,
    // ca in main.ts vechi: valoarea se transmite si pe masa, unde controlul e doar ascuns
    tipAgatare: str(p, "tipAgatare") as TipAgatare,
    surubCap: SURUB_CAP,
    surubTija: SURUB_TIJA,
    inaltimeCapSurub: INALTIME_CAP_SURUB,
    latimeGrila: LATIME_GRILA,
    placa: PLACA,
  });
  const d = r.diagnostice;
  const c = r.cuvant;

  // Randurile cu `warn` din bara de stare veche.
  if (c.bucati > 1) av.push(t("numeled.statusBucati", { n: c.bucati }));
  if (c.camereUtile === 0) av.push(t("numeled.statusFaraCamera"));
  if (!d.optic.uniform) {
    av.push(t("numeled.statusPuncte", { d: f(d.optic.distantaMM), pas: f(d.optic.pasMM), adanc: f(d.optic.adancimeMinima) }));
  }
  if (d.optic.fataPreaGroasa) av.push(t("numeled.statusFataGroasa", { max: f(FATA_MAX_UTIL) }));
  if (grosimePerete < PERETE_OPAC_MIN) {
    av.push(t("numeled.statusPereteSubtire", { p: f(grosimePerete, 2), min: f(PERETE_OPAC_MIN, 2) }));
  }
  if (c.stabilitate && !c.stabilitate.staSingura) av.push(t("numeled.statusCade", { arie: f(c.stabilitate.ariaMM2, 0) }));

  return {
    piese: piese(
      { nume: t("numeled.numeCorp", { text }), culoare: str(p, "culoare"), manifold: r.corpOpac },
      r.corpFata ? { nume: t("numeled.numeFata", { text }), culoare: str(p, "culoareFata"), manifold: r.corpFata } : null,
    ),
    avertizari: av,
  };
};
