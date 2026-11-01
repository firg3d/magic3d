import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { it } from "vitest";
import { ornament } from "@/magic3d/generatoare/constructori/ornament";
import { ORNAMENT_DEF } from "@/magic3d/generatoare/defs/ornament";
import { arhivaGenerat, proiectGenerat } from "@/magic3d/generatoare/export";
import type { Parametri } from "@/magic3d/generatoare/tipuri";
import { genereazaCu, manifold } from "../unit/magic3dGenUtil";

/*
 * Proba ornamentelor: 3MF-urile Bambu si STL-urile pentru trei variante pe date proprii (disc cu
 * nume, glob 3D, pachet familie), ca sa fie deschise in slicer. TERMO_IESIRE = folderul (implicit ornament-proba/).
 */

const VARIANTE: Record<string, Partial<Parametri>> = {
  disc: { text: "Ana", text2: "2026", forma: "cerc", curbare: 0 },
  glob: { tip: "glob", text: "Ana", text2: "2026" },
  pachet: { forma: "stea", lista: "Ana, Mihai, Ioana, Radu, Elena", text2: "2026", pictograma: "fara" },
};

it("scrie probele de ornament", async () => {
  await manifold();
  const iesire = path.resolve(process.env.TERMO_IESIRE ?? "ornament-proba");
  mkdirSync(iesire, { recursive: true });
  for (const [nume, extra] of Object.entries(VARIANTE)) {
    const p = { ...ORNAMENT_DEF.implicit, ...extra } as Parametri;
    const r = genereazaCu(ornament, p);
    writeFileSync(path.join(iesire, `ornament-${nume}.3mf`), proiectGenerat(r.piese, ORNAMENT_DEF, p));
    writeFileSync(path.join(iesire, `ornament-${nume}-stl.zip`), arhivaGenerat(r.piese, ORNAMENT_DEF, p));
    writeFileSync(path.join(iesire, `ornament-${nume}.txt`), [`piese: ${r.piese.length}`, ...r.avertizari].join("\n"));
  }
}, 120_000);
