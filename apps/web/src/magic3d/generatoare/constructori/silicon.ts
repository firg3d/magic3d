import { PRINTER_PRESETS } from "@/lib/printerPresets.generated";
import { SETARI_PRINT_SILICON, SILICON } from "@/magic3d/apps/silicon/config";
import { buildSilicon, configureManifold, type ParamSilicon, type RolSilicon } from "@/magic3d/apps/silicon/silicon";
import { t } from "@/magic3d/core/i18n/index";
import { bool, num, piese, str, type Constructor, type PiesaManifold } from "@/magic3d/generatoare/constructori/comun";

/*
 * Matrita de silicon: fiecare piesa mare (fundul, placa de separatie, fiecare perete) pe placa ei;
 * pozitivul, clemele si tijele impreuna pe ultima placa. Volumele de silicon se arata ca note, cu marja.
 */

const SETARI: Record<RolSilicon, Record<string, string>> = {
  pozitiv: SETARI_PRINT_SILICON.model,
  separatie: SETARI_PRINT_SILICON.cutie,
  perete: SETARI_PRINT_SILICON.cutie,
  fund: SETARI_PRINT_SILICON.cutie,
  clema: SETARI_PRINT_SILICON.mic,
  canal: SETARI_PRINT_SILICON.mic,
  rasuflatoare: SETARI_PRINT_SILICON.mic,
};
const MARI: RolSilicon[] = ["fund", "separatie", "perete"];

export const silicon: Constructor = (p, mod) => {
  configureManifold(mod);
  const cfg: ParamSilicon = {
    model: str(p, "model"),
    scara: num(p, "scara"),
    umplere: bool(p, "umplere"),
    distanta: num(p, "distanta"),
    separatie: str(p, "separatie") === "manual" ? "manual" : "auto",
    inaltimeSeparatie: num(p, "inaltimeSeparatie"),
    inclinareX: num(p, "inclinareX"),
    inclinareY: num(p, "inclinareY"),
    pereti: str(p, "pereti") === "4" ? 4 : 2,
    canalDx: num(p, "canalDx"),
    canalDy: num(p, "canalDy"),
  };
  const r = buildSilicon(cfg);
  const d = r.diag;
  const avertizari: string[] = [];
  if (d.lipsa) return { piese: [], avertizari: [t("silicon.avertModel")] };
  const imprimanta = PRINTER_PRESETS.find((x) => x.id === str(p, "imprimanta")) ?? PRINTER_PRESETS.find((x) => x.id === SILICON.imprimanta)!;

  if (cfg.distanta < SILICON.grosimeMin) avertizari.push(t("silicon.avertGrosime", { mm: cfg.distanta, min: SILICON.grosimeMin }));
  if (d.planIese) avertizari.push(t("silicon.avertPlan"));
  if (d.cheieAtinge) avertizari.push(t("silicon.avertCheie"));
  const cp = Math.max(d.contrapantaSus, d.contrapantaJos);
  if (cp > SILICON.contrapantaMax) avertizari.push(t("silicon.avertContrapanta", { mm2: cp.toFixed(0) }));

  // Pe placi: fiecare piesa mare pe placa ei, restul impreuna pe ultima; in scena placile stau una langa alta.
  const pas = imprimanta.width + 20;
  let placa = 0;
  let cursor = 0;
  const mici: PiesaManifold[] = [];
  const toate: PiesaManifold[] = [];
  const preaMari = new Set<string>();
  const nume = (rol: RolSilicon) => t(`silicon.piesa_${rol}`);
  for (const piesa of r.piese) {
    const b = piesa.manifold.boundingBox();
    const [lx, ly, lz] = [0, 1, 2].map((a) => b.max[a] - b.min[a]);
    const [mic, mare] = [Math.min(lx, ly), Math.max(lx, ly)];
    if (mare > Math.max(imprimanta.width, imprimanta.depth) || mic > Math.min(imprimanta.width, imprimanta.depth) || lz > imprimanta.height) preaMari.add(nume(piesa.rol));
    const culoare = str(p, "culoare");
    if (MARI.includes(piesa.rol)) {
      toate.push({
        nume: nume(piesa.rol),
        culoare,
        manifold: piesa.manifold.translate([placa * pas - (b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2, -b.min[2]]),
        print: { placa, obiect: `${nume(piesa.rol)} ${placa + 1}`, setari: SETARI[piesa.rol] },
      });
      placa += 1;
    } else {
      mici.push({ nume: nume(piesa.rol), culoare, manifold: piesa.manifold.translate([cursor - b.min[0], -(b.min[1] + b.max[1]) / 2, -b.min[2]]), print: { obiect: nume(piesa.rol), setari: SETARI[piesa.rol] } });
      cursor += lx + 5;
    }
  }
  for (const m of mici) toate.push({ ...m, manifold: (m.manifold as { translate(v: number[]): unknown }).translate([placa * pas - cursor / 2, 0, 0]), print: { ...m.print, placa, obiect: `${m.nume} (${toate.length + 1})` } });
  if (cursor > imprimanta.width) preaMari.add(t("silicon.placaMici"));
  if (preaMari.size) avertizari.push(t("silicon.avertPat", { piese: [...preaMari].join(", "), imprimanta: `${imprimanta.vendor} ${imprimanta.model}`, l: imprimanta.width, a: imprimanta.depth, h: imprimanta.height }));

  const marja = 1 + num(p, "marja") / 100;
  const ml = (mm3: number) => (mm3 * marja) / 1000;
  avertizari.push(t("silicon.notaVolum", {
    sus: ml(d.volumSus).toFixed(0), gSus: (ml(d.volumSus) * SILICON.densitate).toFixed(0),
    jos: ml(d.volumJos).toFixed(0), gJos: (ml(d.volumJos) * SILICON.densitate).toFixed(0),
    marja: num(p, "marja"), densitate: SILICON.densitate,
  }));
  return { piese: piese(...toate), avertizari };
};
