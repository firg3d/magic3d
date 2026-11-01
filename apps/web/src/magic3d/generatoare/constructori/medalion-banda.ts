import { GLOB_NUME, MEDALION, SETARI_PRINT_MEDALION } from "@/magic3d/apps/craciun/config";
import { buildMedalion, configureManifold, type DecorMedalion, type FormaMedalion, type FundalMedalion, type RolMedalion } from "@/magic3d/apps/craciun/medalion";
import { grilaPachet, listaNume } from "@/magic3d/apps/craciun/pachet";
import { t } from "@/magic3d/core/i18n/index";
import { bool, num, piese, str, type Constructor, type PiesaManifold } from "@/magic3d/generatoare/constructori/comun";

/*
 * Medalion cu banda (colectia "Craciun"). Un ornament e un obiect cu pana la patru parti: discul cu
 * rama, banda, numele si decorul, fiecare pe culoarea lui. "Pachet familie": cate un medalion pe
 * nume, asezate in grila pe placile patului ales.
 */

const CULOARE: Record<RolMedalion, string> = { disc: "culoareDisc", banda: "culoareBanda", text: "culoareText", decor: "culoareDecor" };

const intre = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export const medalionBanda: Constructor = (p, mod, fonturi) => {
  configureManifold(mod);
  const M = MEDALION;
  const baza = {
    forma: str(p, "forma") as FormaMedalion,
    latime: intre(num(p, "latime"), M.latimeMin, M.latimeMax),
    latimeRama: intre(num(p, "latimeRama"), M.latimeRamaMin, M.latimeRamaMax),
    grosimeRama: intre(num(p, "grosimeRama"), M.grosimeRamaMin, M.grosimeRamaMax),
    fundal: str(p, "fundal") as FundalMedalion,
    latimeBanda: intre(num(p, "latimeBanda"), M.latimeBandaMin, M.latimeBandaMax),
    inclinare: intre(num(p, "inclinare"), -M.inclinareMax, M.inclinareMax),
    capete: bool(p, "capete"),
    font: fonturi.font,
    decor: str(p, "decor") as DecorMedalion,
    densitate: num(p, "densitate"),
  };
  const pat = num(p, "pat") || 180;
  const avertizari: string[] = [];
  const nume = listaNume(str(p, "lista"));
  const lista = nume.length ? nume : [str(p, "text")];

  const construite = lista.map((text) => ({ text, r: buildMedalion({ ...baza, text }) }));
  const cutii = construite.map(({ r }) => {
    const b = r.piese.map((x) => x.manifold.boundingBox());
    return { min: [Math.min(...b.map((q) => q.min[0])), Math.min(...b.map((q) => q.min[1]))], max: [Math.max(...b.map((q) => q.max[0])), Math.max(...b.map((q) => q.max[1]))] };
  });
  const grila = grilaPachet(lista.length, Math.max(...cutii.map((c) => c.max[0] - c.min[0])), Math.max(...cutii.map((c) => c.max[1] - c.min[1])), pat);
  const toate: PiesaManifold[] = [];
  construite.forEach(({ text, r }, i) => {
    const d = r.diag;
    const eticheta = text.trim() || t("globNume.faraNume");
    if (d.nuIncape) avertizari.push(t("medalion.avertNuIncape", { nume: eticheta }));
    else if (d.comprimare < 1) avertizari.push(t("globNume.avertComprimat", { nume: eticheta, procent: Math.round((1 - d.comprimare) * 100) }));
    if (d.subtire > M.pierdereLinieMax) avertizari.push(t("globNume.avertSubtire", { nume: eticheta, mm: M.linieMin }));
    if (d.glifeLipsa.length) avertizari.push(t("globNume.avertGlife", { litere: [...new Set(d.glifeLipsa)].join(" ") }));
    if (d.decorPus < d.decorCerut) avertizari.push(t("medalion.avertDecor", { nume: eticheta, pus: d.decorPus, cerut: d.decorCerut }));
    if (d.bucati > 1) avertizari.push(t("medalion.avertBucati", { nume: eticheta, n: d.bucati }));
    const { x, y, placa } = grila[i];
    const [x0, y0] = cutii[i].min;
    for (const piesa of r.piese) {
      toate.push({
        nume: t(`medalion.piesa_${piesa.rol}`, { nume: eticheta }),
        culoare: str(p, CULOARE[piesa.rol]),
        manifold: piesa.manifold.translate([x - x0 + placa * (pat + GLOB_NUME.distantaPlaci), y - y0, 0]),
        print: { placa, obiect: t("medalion.obiect", { nume: eticheta }), setari: SETARI_PRINT_MEDALION },
      });
    }
  });
  if (nume.length > 1) avertizari.push(t("globNume.notaPachet", { n: nume.length, placi: Math.max(...grila.map((g) => g.placa)) + 1 }));
  return { piese: piese(...toate), avertizari };
};
