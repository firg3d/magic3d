/*
 * Probele globului cu nume: 3MF-uri si o vedere de sus (PNG) pentru cateva nume, forme si fonturi.
 *
 *   GLOB_OUT=<dosar> npx vitest run --config tests/vitest.tools.config.ts tests/tools/globNumeProba.tool.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, it } from "vitest";
import { GLOB_NUME_DEF } from "@/magic3d/generatoare/defs/glob-nume";
import { proiectGenerat } from "@/magic3d/generatoare/export";
import type { Parametri } from "@/magic3d/generatoare/tipuri";
import { genereaza, manifold } from "../unit/magic3dGenUtil";
import { png } from "./vedereSus";

const PROBE: Array<[string, Parametri]> = [
  ["ana-cerc", { text: "Ana" }],
  ["stefanut-fundal", { text: "Ștefănuț", fundal: true, culoareDecor: "#1d1f1e", decor: "amestec" }],
  ["alexandra-oval", { text: "Alexandra-Maria", forma: "oval" }],
  ["mihai-bloc", { text: "MIHAI", font: "BebasNeue-Regular.ttf", decor: "stele", culoareDecor: "#f5c518" }],
  ["ioana-stea", { text: "Ioana", forma: "stea", font: "Baloo2-700.ttf", decor: "fulgi" }],
  ["radu-brad", { text: "Radu", forma: "brad", decor: "fara", font: "Pacifico-Regular.ttf" }],
];

beforeAll(async () => {
  await manifold();
}, 60_000);

it("scrie probele", () => {
  const out = process.env.GLOB_OUT ?? path.resolve("tmp/glob-nume");
  mkdirSync(out, { recursive: true });
  for (const [nume, extra] of PROBE) {
    const p = { ...GLOB_NUME_DEF.implicit, ...extra };
    const r = genereaza("glob-nume", p);
    writeFileSync(path.join(out, `${nume}.png`), png(r.piese));
    writeFileSync(path.join(out, `${nume}.3mf`), proiectGenerat(r.piese, GLOB_NUME_DEF, p));
    writeFileSync(path.join(out, `${nume}.txt`), [`piese: ${r.piese.map((x) => x.nume).join(", ")}`, ...r.avertizari].join("\n"));
  }
  const familie = { ...GLOB_NUME_DEF.implicit, lista: ["Ana", "Mihai", "Ștefănuț", "Ioana", "Radu", "Elena", "Matei", "Sofia", "Andrei", "Maria", "Luca", "Alexandra-Maria"].join("\n") };
  const r = genereaza("glob-nume", familie);
  writeFileSync(path.join(out, "familie.png"), png(r.piese, 2));
  writeFileSync(path.join(out, "familie.3mf"), proiectGenerat(r.piese, GLOB_NUME_DEF, familie));
  writeFileSync(path.join(out, "familie.txt"), r.avertizari.join("\n"));
}, 600_000);
