import { GLOB_NUME, SETARI_PRINT_GLOB_NUME } from "@/magic3d/apps/craciun/config";
import { buildGlobNume, configureManifold, grilaPachet, listaNume, type Decor, type FormaGlob, type Legatura, type RolPiesa } from "@/magic3d/apps/craciun/globNume";
import { t } from "@/magic3d/core/i18n/index";
import { bool, num, piese, str, type Constructor, type PiesaManifold } from "@/magic3d/generatoare/constructori/comun";

/*
 * Glob cu nume decupat (colectia "Craciun"). Un ornament e un obiect cu pana la trei parti: rama cu
 * numele, decorul (cand are alta culoare) si fundalul. "Pachet familie": o lista de nume face cate
 * un ornament pe nume, asezate in grila pe placile patului ales (si pe placile urmatoare).
 */

const CULOARE: Record<RolPiesa, string> = { rama: "culoareRama", decor: "culoareDecor", fundal: "culoareFundal" };

export const globNume: Constructor = (p, mod, fonturi) => {
  configureManifold(mod);
  const culoareRama = str(p, "culoareRama").toLowerCase();
  const baza = {
    forma: str(p, "forma") as FormaGlob,
    latime: Math.max(GLOB_NUME.latimeMin, Math.min(GLOB_NUME.latimeMax, num(p, "latime"))),
    latimeRama: num(p, "latimeRama"),
    grosime: num(p, "grosime"),
    font: fonturi.font,
    legatura: str(p, "legatura") as Legatura,
    decor: str(p, "decor") as Decor,
    densitate: num(p, "densitate"),
    samanta: num(p, "samanta"),
    fundal: bool(p, "fundal"),
    decorCaRama: str(p, "culoareDecor").toLowerCase() === culoareRama,
  };
  const pat = num(p, "pat") || 180;
  const avertizari: string[] = [];
  const nume = listaNume(str(p, "lista"));
  const lista = nume.length ? nume : [str(p, "text")];

  const construite = lista.map((text) => ({ text, r: buildGlobNume({ ...baza, text }) }));
  const cutii = construite.map(({ r }) => {
    const b = r.piese.map((x) => x.manifold.boundingBox());
    return { min: [Math.min(...b.map((q) => q.min[0])), Math.min(...b.map((q) => q.min[1]))], max: [Math.max(...b.map((q) => q.max[0])), Math.max(...b.map((q) => q.max[1]))] };
  });
  const grila = grilaPachet(lista.length, Math.max(...cutii.map((c) => c.max[0] - c.min[0])), Math.max(...cutii.map((c) => c.max[1] - c.min[1])), pat);
  const toate: PiesaManifold[] = [];
  construite.forEach(({ text, r }, i) => {
    const d = r.diag;
    const eticheta = text.trim() || t("globNume.faraNume");
    if (d.nuIncape) avertizari.push(t("globNume.avertNuIncape", { nume: eticheta }));
    else if (d.comprimare < 1) avertizari.push(t("globNume.avertComprimat", { nume: eticheta, procent: Math.round((1 - d.comprimare) * 100) }));
    if (d.bucati > 1) avertizari.push(t("globNume.avertBucati", { nume: eticheta, n: d.bucati }));
    if (d.subtire > GLOB_NUME.pierdereLinieMax) avertizari.push(t("globNume.avertSubtire", { nume: eticheta, mm: GLOB_NUME.linieMin }));
    if (d.glifeLipsa.length) avertizari.push(t("globNume.avertGlife", { litere: [...new Set(d.glifeLipsa)].join(" ") }));
    if (d.decorPus < d.decorCerut) avertizari.push(t("globNume.avertDecor", { nume: eticheta, pus: d.decorPus, cerut: d.decorCerut }));
    const { x, y, placa } = grila[i];
    const [x0, y0] = cutii[i].min;
    for (const piesa of r.piese) {
      toate.push({
        nume: t(`globNume.piesa_${piesa.rol}`, { nume: eticheta }),
        culoare: str(p, CULOARE[piesa.rol]),
        manifold: piesa.manifold.translate([x - x0 + placa * (pat + GLOB_NUME.distantaPlaci), y - y0, 0]),
        print: { placa, obiect: t("globNume.obiect", { nume: eticheta }), setari: SETARI_PRINT_GLOB_NUME },
      });
    }
  });
  if (nume.length > 1) avertizari.push(t("globNume.notaPachet", { n: nume.length, placi: Math.max(...grila.map((g) => g.placa)) + 1 }));
  return { piese: piese(...toate), avertizari };
};
