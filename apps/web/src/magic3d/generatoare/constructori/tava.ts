import { SETARI_PRINT_TAVA, TAVA } from "@/magic3d/apps/tava/config";
import { buildTava, configureManifold, type ParamTava, type RolTava } from "@/magic3d/apps/tava/tava";
import type { FormaDecor } from "@/magic3d/core/geometry/formeDecor";
import { t } from "@/magic3d/core/i18n/index";
import { bool, num, piese, str, type Constructor } from "@/magic3d/generatoare/constructori/comun";

/*
 * Matrita tava: o tava (un obiect) sau masterul pentru silicon (placa cu pozitivele, si rama de
 * turnare pe placa ei). Volumele se arata ca note: ml pe forma si in total, siliconul in ml si grame.
 */

const ml = (mm3: number) => (mm3 / 1000).toFixed(mm3 < 10_000 ? 1 : 0);

export const tava: Constructor = (p, mod) => {
  configureManifold(mod);
  const cfg: ParamTava = {
    mod: str(p, "mod") === "master" ? "master" : "tava",
    sursa: (["forma", "imagine", "model"] as const).find((s) => s === str(p, "sursa")) ?? "forma",
    forma: str(p, "forma") as FormaDecor,
    imagine: str(p, "imagine"),
    harta: str(p, "hartaImagine"),
    reliefPoza: bool(p, "reliefPoza"),
    inaltimeRelief: num(p, "inaltimeRelief"),
    model: str(p, "model"),
    latime: Math.max(TAVA.latimeMin, Math.min(TAVA.latimeMax, num(p, "latime"))),
    adancime: Math.max(TAVA.adancimeMin, Math.min(TAVA.adancimeMax, num(p, "adancime"))),
    draft: num(p, "draft"),
    racordare: num(p, "racordare"),
    randuri: num(p, "randuri"),
    coloane: num(p, "coloane"),
    distanta: num(p, "distanta"),
    rama: num(p, "rama"),
  };
  const r = buildTava(cfg);
  const d = r.diag;
  const avertizari: string[] = [];
  if (d.lipsa) avertizari.push(t(`tava.avert_${d.lipsa}`));
  if (d.contrapanta > TAVA.contrapantaMax) avertizari.push(t("tava.avertContrapanta", { mm2: d.contrapanta.toFixed(0) }));
  if (d.latime > TAVA.pat || d.adancime > TAVA.pat) avertizari.push(t("tava.avertPat", { l: d.latime.toFixed(0), a: d.adancime.toFixed(0), pat: TAVA.pat }));
  if (!d.lipsa) {
    avertizari.push(t("tava.notaVolum", { forma: ml(d.volumForma), total: ml(d.volumTotal) }));
    if (cfg.mod === "master") avertizari.push(t("tava.notaSilicon", { ml: ml(d.volumSilicon), g: ((d.volumSilicon / 1000) * TAVA.densitateSilicon).toFixed(0), densitate: TAVA.densitateSilicon }));
  }
  const PIESA: Record<RolTava, string> = { tava: "tava.piesaTava", master: "tava.piesaMaster", rama: "tava.piesaRama" };
  const SETARI: Record<RolTava, Record<string, string>> = { tava: SETARI_PRINT_TAVA.tava, master: SETARI_PRINT_TAVA.master, rama: SETARI_PRINT_TAVA.rama };
  return {
    piese: piese(...r.piese.map((piesa) => ({
      nume: t(PIESA[piesa.rol]),
      culoare: str(p, "culoare"),
      // Rama pe placa ei, langa master in scena.
      manifold: piesa.rol === "rama" ? piesa.manifold.translate([d.latime + 10, 0, 0]) : piesa.manifold,
      print: { placa: piesa.rol === "rama" ? 1 : 0, obiect: t(PIESA[piesa.rol]), setari: SETARI[piesa.rol] },
    }))),
    avertizari,
  };
};
