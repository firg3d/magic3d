import { ORNAMENT, SETARI_PRINT_ORNAMENT } from "@/magic3d/apps/ornament/config";
import { buildOrnament, configureManifold, grilaPachet, listaNume, type ParamOrnament, type RolPiesa } from "@/magic3d/apps/ornament/ornament";
import type { FormaDecor } from "@/magic3d/core/geometry/formeDecor";
import { t } from "@/magic3d/core/i18n/index";
import { num, piese, str, type Constructor, type PiesaManifold } from "@/magic3d/generatoare/constructori/comun";

/*
 * Ornamente de Craciun. Un ornament plat e un obiect cu pana la trei parti (baza, textul, rama),
 * fiecare in culoarea ei; globul are doua jumatati, textul lor si inelul de imbinare, fiecare pe
 * placa ei. "Pachet familie": o lista de nume face cate un ornament plat pe nume, asezate pe grila
 * placii (si pe placile urmatoare cand nu mai incap).
 */

const CULOARE: Record<RolPiesa, string> = { baza: "culoareBaza", text: "culoareText", rama: "culoareRama", sus: "culoareBaza", jos: "culoareBaza", textSus: "culoareText", textJos: "culoareText", inel: "culoareBaza" };

export const ornament: Constructor = (p, mod, fonturi) => {
  configureManifold(mod);
  const cfg: ParamOrnament = {
    tip: str(p, "tip") === "glob" ? "glob" : "plat",
    forma: str(p, "forma") as FormaDecor,
    diametru: Math.max(ORNAMENT.diametruMin, Math.min(ORNAMENT.diametruMax, num(p, "diametru"))),
    grosime: num(p, "grosime"),
    font: fonturi.font,
    text: str(p, "text"),
    text2: str(p, "text2"),
    inaltimeText: num(p, "inaltimeText"),
    curbare: num(p, "curbare"),
    mod: str(p, "mod") === "gravat" ? "gravat" : "relief",
    relief: num(p, "relief"),
    rama: num(p, "rama"),
    pictograma: str(p, "pictograma") as ParamOrnament["pictograma"],
    prindere: str(p, "prindere") as ParamOrnament["prindere"],
    diametruGaura: num(p, "diametruGaura"),
    perete: num(p, "perete"),
    turtire: num(p, "turtire"),
    imbinare: str(p, "imbinare") === "stifturi" ? "stifturi" : "inel",
  };
  const avertizari: string[] = [];
  const nume = cfg.tip === "plat" ? listaNume(str(p, "lista")) : [];
  if (str(p, "lista").trim() && cfg.tip === "glob") avertizari.push(t("ornament.avertPachetGlob"));
  const lista = nume.length ? nume : [cfg.text];

  const toate: PiesaManifold[] = [];
  const construite = lista.map((text) => ({ text, r: buildOrnament({ ...cfg, text }) }));
  // Grila pachetului dupa cutia reala a celui mai mare ornament (urechea iese din diametru).
  const cutii = construite.map(({ r }) => {
    const b = r.piese.map((x) => x.manifold.boundingBox());
    return { min: [Math.min(...b.map((q) => q.min[0])), Math.min(...b.map((q) => q.min[1]))], max: [Math.max(...b.map((q) => q.max[0])), Math.max(...b.map((q) => q.max[1]))] };
  });
  const grila = grilaPachet(lista.length, Math.max(...cutii.map((c) => c.max[0] - c.min[0])), Math.max(...cutii.map((c) => c.max[1] - c.min[1])));
  construite.forEach(({ text, r }, i) => {
    const d = r.diag;
    const eticheta = text.trim() || t("ornament.faraNume");
    if (d.nuIncape) avertizari.push(t("ornament.avertNuIncape", { nume: eticheta }));
    else if (d.micsorat && d.inaltimeNume < ORNAMENT.textMin) avertizari.push(t("ornament.avertTextMic", { nume: eticheta, mm: d.inaltimeNume.toFixed(1), min: ORNAMENT.textMin }));
    if (d.glifeLipsa.length) avertizari.push(t("ornament.avertGlife", { litere: [...new Set(d.glifeLipsa)].join(" ") }));
    if (cfg.tip === "glob") {
      if (d.perete > cfg.perete) avertizari.push(t("ornament.avertPerete", { mm: d.perete }));
      if (d.consola > ORNAMENT.consolaArieMax) avertizari.push(t("ornament.avertConsola", { mm2: d.consola }));
      // Jumatatile una langa alta pe X, fiecare pe placa ei, textul cu jumatatea lui; inelul pe placa lui.
      const pas = cfg.diametru + 10;
      const loc: Record<RolPiesa, [number, number]> = { sus: [0, 0], textSus: [0, 0], jos: [pas, 1], textJos: [pas, 1], inel: [2 * pas, 2], baza: [0, 0], text: [0, 0], rama: [0, 0] };
      for (const piesa of r.piese) {
        const [x, placa] = loc[piesa.rol];
        const obiect = piesa.rol === "textSus" ? "sus" : piesa.rol === "textJos" ? "jos" : piesa.rol;
        toate.push({
          nume: t(`ornament.piesa_${piesa.rol}`, { nume: eticheta }),
          culoare: str(p, CULOARE[piesa.rol]),
          manifold: piesa.manifold.translate([x, 0, 0]),
          print: { placa, obiect: t(`ornament.piesa_${obiect}`, { nume: eticheta }), setari: piesa.rol === "inel" ? SETARI_PRINT_ORNAMENT.mic : SETARI_PRINT_ORNAMENT.glob },
        });
      }
      return;
    }
    const { x, y, placa } = grila[i];
    const [x0, y0] = cutii[i].min;
    for (const piesa of r.piese) {
      toate.push({
        nume: t(`ornament.piesa_${piesa.rol}`, { nume: eticheta }),
        culoare: str(p, CULOARE[piesa.rol]),
        manifold: piesa.manifold.translate([x - x0 + placa * (ORNAMENT.placa + ORNAMENT.distantaPlaci), y - y0, 0]),
        print: { placa, obiect: t("ornament.obiect", { nume: eticheta }), setari: SETARI_PRINT_ORNAMENT.plat },
      });
    }
  });
  if (nume.length > 1) avertizari.push(t("ornament.notaPachet", { n: nume.length, placi: Math.max(...grila.map((g) => g.placa)) + 1 }));
  return { piese: piese(...toate), avertizari };
};
