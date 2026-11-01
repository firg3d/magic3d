import { GLOB_MODELE, SETARI_PRINT_GLOB_MODELE } from "@/magic3d/apps/craciun/config";
import { buildGlobModele, configureManifold, type ConstructieGlob, type ModelGlob, type RolGlob } from "@/magic3d/apps/craciun/globModele";
import { t } from "@/magic3d/core/i18n/index";
import { num, piese, str, type Constructor, type PiesaManifold } from "@/magic3d/generatoare/constructori/comun";

/*
 * Globuri cu modele (colectia "Craciun"). Piesele se printeaza separat: pe prima placa globul (doua
 * jumatati si inelul, sau corpul pentru modul vaza), pe a doua capacul; numele sta pe jumatatea de sus
 * (sau pe corp), ca parte a ei.
 */

const intre = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Obiectul in care intra fiecare piesa si setarile lui de print. */
const OBIECT: Record<RolGlob, { obiect: RolGlob; setari: keyof typeof SETARI_PRINT_GLOB_MODELE }> = {
  corp: { obiect: "corp", setari: "vaza" },
  text: { obiect: "corp", setari: "vaza" },
  sus: { obiect: "sus", setari: "jumatate" },
  jos: { obiect: "jos", setari: "jumatate" },
  inel: { obiect: "inel", setari: "capac" },
  capac: { obiect: "capac", setari: "capac" },
};

export const globModele: Constructor = (p, mod, fonturi) => {
  configureManifold(mod);
  const G = GLOB_MODELE;
  const constructie = str(p, "constructie") as ConstructieGlob;
  const text = str(p, "text");
  const r = buildGlobModele({
    diametru: intre(num(p, "diametru"), G.diametruMin, G.diametruMax),
    perete: num(p, "perete"),
    constructie,
    model: str(p, "model") as ModelGlob,
    numar: num(p, "numar"),
    adancime: intre(num(p, "adancime"), G.adancimeMin, G.adancimeMax),
    rasucire: intre(num(p, "rasucire"), -G.rasucireMax, G.rasucireMax),
    ture: intre(num(p, "ture"), G.tureMin, G.tureMax),
    latimeFanta: intre(num(p, "latimeFanta"), G.latimeFantaMin, G.latimeFantaMax),
    font: fonturi.font,
    text,
  });
  const avertizari: string[] = [];
  const d = r.diag;
  if (d.fanteInVaza) avertizari.push(t("globModele.avertFanteVaza"));
  if (d.nuIncape) avertizari.push(t("globModele.avertNuIncape", { nume: text, mm: G.textMin }));
  if (d.glifeLipsa.length) avertizari.push(t("globNume.avertGlife", { litere: [...new Set(d.glifeLipsa)].join(" ") }));
  if (d.consola > G.consolaArieMax) avertizari.push(t("globModele.avertConsola", { mm2: Math.round(d.consola) }));

  const toate: PiesaManifold[] = r.piese.map((piesa) => {
    // textul sta pe jumatatea de sus la globul din jumatati, pe corp la modul vaza
    const loc = piesa.rol === "text" && constructie !== "vaza" ? OBIECT.sus : OBIECT[piesa.rol];
    const culoare = piesa.rol === "capac" ? "culoareCapac" : piesa.rol === "text" ? "culoareText" : "culoare";
    return {
      nume: t(`globModele.piesa_${piesa.rol}`),
      culoare: str(p, culoare),
      manifold: piesa.manifold,
      // capacul (alta culoare) pe placa lui: pe aceeasi placa, filamentul s-ar schimba la fiecare strat
      print: { placa: piesa.rol === "capac" ? 1 : 0, obiect: t(`globModele.obiect_${loc.obiect}`), setari: SETARI_PRINT_GLOB_MODELE[loc.setari] },
    };
  });
  return { piese: piese(...toate), avertizari };
};
