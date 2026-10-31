import { buildAssembly, configureManifold as configAssembly, solideMemorate } from "@/magic3d/apps/litere/assembly";
import { configureManifold as configTextSolid } from "@/magic3d/core/geometry/textSolid";
import { t } from "@/magic3d/core/i18n/index";
import { bool, num, piese, str, type Constructor } from "@/magic3d/generatoare/constructori/comun";

/*
 * Litere Decor fara tematici si fara baza (acelea sunt piese din biblioteca de modele). Rotunjirea
 * muchiei e memorata intre constructii (solideMemorate), deci solidele ei trec peste arena worker-ului.
 */
export const litere: Constructor = (p, mod, fonturi) => {
  configTextSolid(mod);
  configAssembly(mod);
  const scris = str(p, "scris").trim();
  const modScris = str(p, "modScris") as "relief" | "gravat" | "locas";
  const r = buildAssembly({
    litera: str(p, "litera") || "A",
    fontLitera: fonturi.fontLitera,
    inaltimeLitera: num(p, "inaltimeLitera"),
    grosimeLitera: num(p, "grosimeLitera"),
    culoareLitera: str(p, "culoareLitera"),
    scris,
    fontScris: fonturi.fontScris,
    inaltimeScris: num(p, "inaltimeScris"),
    reliefScris: num(p, "reliefScris"),
    culoareScris: str(p, "culoareScris"),
    scrisOffX: num(p, "offsetX"),
    scrisOffY: num(p, "offsetY"),
    rotatieScris: num(p, "rotatieScris"),
    scrisRotX: 0,
    scrisRotY: 0,
    // In relief scrisul sta pe fata literei; gravat sau in locas intra cat spune "pozitieScris".
    scrisPozitieZ: modScris === "relief" ? 0 : num(p, "pozitieScris"),
    modScris,
    grosimeScris: num(p, "grosimeScris"),
    jocInsertie: num(p, "jocInsertie"),
    chenarActiv: bool(p, "chenarActiv"),
    latimeChenar: num(p, "latimeChenar"),
    adancimeChenar: num(p, "adancimeChenar"),
    razaMuchie: num(p, "razaMuchie"),
    taiereBaza: num(p, "taiereBaza"),
    tematici: [],
    puntiAutomate: true,
    baza: null,
  });
  const d = r.diagnostice;
  const avertizari: string[] = [];
  for (const lipsa of d.glifeLipsa) avertizari.push(t("litere.glifeLipsa", { sursa: lipsa.sursa, litere: lipsa.caractere.join(" ") }));
  if (d.stabilitate.avertisment) avertizari.push(d.stabilitate.avertisment);
  for (const obiect of d.obiecteContact) {
    if (obiect.floats) avertizari.push(t("litere.scrisPluteste", { nume: obiect.nume }));
  }
  return {
    piese: piese(
      { nume: t("litere.numeLitera", { litera: str(p, "litera") }), culoare: str(p, "culoareLitera"), manifold: r.corpLitera },
      scris && r.corpScris ? { nume: t("litere.numeScris", { scris }), culoare: str(p, "culoareScris"), manifold: r.corpScris } : null,
    ),
    avertizari,
    pastreaza: solideMemorate(),
  };
};
