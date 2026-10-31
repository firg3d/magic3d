import {
  buildDecor,
  configureManifold,
  FUND_MIN,
  initialaDin,
  PATA_MAX,
  SECTIUNE_MIN,
  TRASATURA_MIN,
  type PozitieInel,
} from "@/magic3d/apps/breloc-decor/decor";
import { t } from "@/magic3d/core/i18n/index";
import { bool, num, piese, str, type Constructor } from "@/magic3d/generatoare/constructori/comun";

const f = (n: number, k = 1) => n.toLocaleString("en-US", { maximumFractionDigits: k });

/** distanta dintre baza si insertie pe placa, mm */
const DISTANTA_INSERTIE = 5;

type Solid = {
  boundingBox(): { min: number[]; max: number[] };
  translate(v: number[]): Solid;
  subtract(o: Solid): Solid;
};

/*
 * Brelocuri Decor: doua piese care se tiparesc separat si se lipesc dupa — baza (initiala, cu locas)
 * si insertia cu numele, ea insasi in doua culori (contur dedesubt, scris deasupra). Vechea aplicatie
 * arata insertia montata in locas, dar o exporta culcata; aici iese culcata, langa baza, cum se
 * tipareste.
 */
export const brelocDecor: Constructor = (p, mod, fonturi) => {
  configureManifold(mod);
  const nume = str(p, "nume").trim() || " ";
  // gol => prima litera a numelui; scris de mana => prima lui litera, ca majuscula
  const manual = str(p, "initiala").trim();
  const initiala = manual ? [...manual][0].toLocaleUpperCase("ro-RO") : initialaDin(nume);
  const r = buildDecor({
    initiala,
    fontBaza: fonturi.fontBaza,
    inaltimeBaza: num(p, "inaltimeBaza"),
    latimeRama: num(p, "latimeRama"),
    grosimeBaza: num(p, "grosimeBaza"),
    adancimeRama: num(p, "adancimeRama"),
    nume,
    fontNume: fonturi.fontNume,
    marimeNume: num(p, "marimeNume"),
    offsetNume: num(p, "offsetNume"),
    umpleGauri: bool(p, "umpleGauri"),
    unghi: num(p, "unghi"),
    offX: num(p, "offX"),
    offY: num(p, "offY"),
    grosimeNume: num(p, "grosimeNume"),
    iesireMiez: num(p, "iesireMiez"),
    adancimeInlay: num(p, "adancimeInlay"),
    joc: num(p, "joc"),
    bazaUrmeazaNumele: bool(p, "bazaUrmeazaNumele"),
    inel: bool(p, "inel"),
    pozitieInel: str(p, "pozitieInel") as PozitieInel,
    inelX: num(p, "inelX"),
    inelY: num(p, "inelY"),
    diametruInel: num(p, "diametruInel"),
    gauraInel: num(p, "gauraInel"),
    grosimeInel: num(p, "grosimeInel"),
  });

  // insertia, culcata la Z=0, mutata in dreapta bazei: altfel ar sta in acelasi loc cu baza
  const baza = r.corpBaza as Solid;
  const bb = baza.boundingBox();
  const bf = (r.corpFundal as Solid).boundingBox();
  const muta = [bb.max[0] + DISTANTA_INSERTIE - bf.min[0], (bb.min[1] + bb.max[1]) / 2 - (bf.min[1] + bf.max[1]) / 2, 0];
  const miez = (r.corpMiez as Solid).translate(muta);
  // miezul porneste din interiorul conturului (de la 0.2 mm): fara scadere, cele doua corpuri ar
  // ocupa acelasi volum si felierea n-ar sti ce culoare sa puna acolo
  const fundal = (r.corpFundal as Solid).translate(muta).subtract(miez);

  const d = r.diagnostice;
  const avertizari: string[] = [];
  if (d.fundRamas < FUND_MIN) avertizari.push(t("decor.statusFundSubtire", { mm: f(d.fundRamas, 2), prag: FUND_MIN }));
  if (d.numeInAfaraMM2 > 1) avertizari.push(t("decor.statusNumeInAfara", { arie: f(d.numeInAfaraMM2, 0) }));
  if (d.bucatiNume > 1) avertizari.push(t("decor.statusBucati", { n: d.bucatiNume }));
  if (d.inel && d.inel.sectiuneMM2 < SECTIUNE_MIN) avertizari.push(t("decor.statusInelSubtire", { s: f(d.inel.sectiuneMM2, 1), prag: SECTIUNE_MIN }));
  if (d.trasaturiNume.ariaMaxMM2 > PATA_MAX) avertizari.push(t("decor.statusTrasaturi", { prag: f(TRASATURA_MIN, 2), arie: f(d.trasaturiNume.ariaMaxMM2, 1) }));
  if (d.glifeLipsa.length) avertizari.push(t("decor.statusGlife", { litere: d.glifeLipsa.join(" ") }));

  return {
    piese: piese(
      { nume: t("decor.numeBaza", { litera: initiala }), culoare: str(p, "culoareBaza"), manifold: baza },
      { nume: t("decor.numeFundal", { nume }), culoare: str(p, "culoareFundal"), manifold: fundal },
      { nume: t("decor.numeMiez", { nume }), culoare: str(p, "culoareMiez"), manifold: miez },
    ),
    avertizari,
  };
};
