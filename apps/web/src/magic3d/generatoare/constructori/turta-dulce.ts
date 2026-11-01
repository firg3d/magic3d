import { GLOB_NUME, SETARI_PRINT_TURTA, TURTA } from "@/magic3d/apps/craciun/config";
import { grilaPachet, listaNume } from "@/magic3d/apps/craciun/pachet";
import { buildTurta, configureManifold, type NivelTurta, type PiesaTurta } from "@/magic3d/apps/craciun/turta";
import { t } from "@/magic3d/core/i18n/index";
import { bool, num, piese, str, type Constructor, type PiesaManifold } from "@/magic3d/generatoare/constructori/comun";

/*
 * Turta dulce (colectia "Craciun"). Un ornament e un obiect: baza pe culoarea ei si fiecare element
 * de glazura o parte separata pe culoarea glazurii (petele, la cerere, pe a treia culoare).
 * "Pachet familie": o lista de nume face cate un ornament pe nume, asezate pe placile patului ales.
 */

export const turtaDulce: Constructor = (p, mod, fonturi) => {
  configureManifold(mod);
  const baza = {
    forma: str(p, "forma"),
    marime: Math.max(TURTA.marimeMin, Math.min(TURTA.marimeMax, num(p, "marime"))),
    grosimeBaza: num(p, "grosimeBaza"),
    distantaCordon: num(p, "distantaCordon"),
    latimeCordon: num(p, "latimeCordon"),
    inaltimeCordon: num(p, "inaltimeCordon"),
    nivel: str(p, "nivel") as NivelTurta,
    obraji: bool(p, "obraji"),
    font: fonturi.font,
  };
  const culoare = (rol: PiesaTurta["rol"]) => {
    if (rol === "baza") return str(p, "culoareBaza");
    if (rol === "ochi") return str(p, "ochi") === "inchis" ? str(p, "culoareOchi") : str(p, "culoareGlazura");
    if (rol === "obraz") return str(p, "culoareObraji");
    if (rol === "detaliu" && bool(p, "treiCulori")) return str(p, "culoareDetalii");
    return str(p, "culoareGlazura");
  };
  const pat = num(p, "pat") || 180;
  const avertizari: string[] = [];
  const nume = listaNume(str(p, "lista"));
  const lista = nume.length ? nume : [str(p, "text")];

  const construite = lista.map((text) => ({ text, r: buildTurta({ ...baza, text }) }));
  const cutii = construite.map(({ r }) => {
    const b = r.piese.map((x) => x.manifold.boundingBox());
    return { min: [Math.min(...b.map((q) => q.min[0])), Math.min(...b.map((q) => q.min[1]))], max: [Math.max(...b.map((q) => q.max[0])), Math.max(...b.map((q) => q.max[1]))] };
  });
  const grila = grilaPachet(lista.length, Math.max(...cutii.map((c) => c.max[0] - c.min[0])), Math.max(...cutii.map((c) => c.max[1] - c.min[1])), pat);
  const toate: PiesaManifold[] = [];
  construite.forEach(({ text, r }, i) => {
    const d = r.diag;
    const eticheta = text.trim() || t("turta.faraNume");
    if (d.subMinim) avertizari.push(t("turta.avertNuIncape", { nume: eticheta, mm: d.numeMin }));
    else if (d.randuri > 1) avertizari.push(t("turta.notaDouaRanduri", { nume: eticheta }));
    if (d.decorAscuns) avertizari.push(t("turta.notaDecorAscuns", { nume: eticheta, n: d.decorAscuns }));
    if (d.subtire > TURTA.pierdereLinieMax) avertizari.push(t("turta.avertSubtire", { nume: eticheta, mm: TURTA.linieMin }));
    if (d.glifeLipsa.length) avertizari.push(t("turta.avertGlife", { litere: [...new Set(d.glifeLipsa)].join(" ") }));
    const { x, y, placa } = grila[i];
    const [x0, y0] = cutii[i].min;
    const contor = new Map<string, number>();
    for (const piesa of r.piese) {
      const n = (contor.get(piesa.fel) ?? 0) + 1;
      contor.set(piesa.fel, n);
      toate.push({
        nume: t(`turta.piesa_${piesa.fel}`, { nume: eticheta, n }),
        culoare: culoare(piesa.rol),
        manifold: piesa.manifold.translate([x - x0 + placa * (pat + GLOB_NUME.distantaPlaci), y - y0, 0]),
        print: { placa, obiect: t("turta.obiect", { nume: eticheta, forma: t(`turta.forma_${baza.forma}`) }), setari: SETARI_PRINT_TURTA },
      });
    }
  });
  if (nume.length > 1) avertizari.push(t("turta.notaPachet", { n: nume.length, placi: Math.max(...grila.map((g) => g.placa)) + 1 }));
  return { piese: piese(...toate), avertizari };
};
