/*
 * Probele medalionului cu banda: randare 3D, vedere de sus si 3MF pentru fiecare varianta si nume.
 *
 *   MEDALION_OUT=<dosar> npx vitest run --config tests/vitest.tools.config.ts tests/tools/medalionProba.tool.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, it } from "vitest";
import { MEDALION_BANDA_DEF } from "@/magic3d/generatoare/defs/medalion-banda";
import { proiectGenerat } from "@/magic3d/generatoare/export";
import type { Parametri } from "@/magic3d/generatoare/tipuri";
import { genereaza, manifold } from "../unit/magic3dGenUtil";
import { randare3d } from "./randare3d";

const NUME = (process.env.MEDALION_NUME ?? "Ana,Ștefănuț,Alexandra-Maria").split(",");
const VARIANTE: Array<[string, Parametri]> = [
  ["cerc", {}],
  ["oval-inclinat", { forma: "oval", inclinare: 12, decor: "fulgi" }],
  ["decupat", { fundal: "decupat", decor: "brazi", capete: false }],
  ["oameni", { decor: "oameni", densitate: 2, culoareDecor: "#2f7d4f" }],
];

beforeAll(async () => {
  await manifold();
}, 60_000);

it("scrie probele", () => {
  const out = process.env.MEDALION_OUT ?? path.resolve("tmp/medalion");
  mkdirSync(out, { recursive: true });
  for (const [eticheta, extra] of VARIANTE) {
    for (const text of NUME) {
      const p = { ...MEDALION_BANDA_DEF.implicit, text, ...extra };
      const r = genereaza("medalion-banda", p);
      const fisier = `${eticheta}-${text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()}`;
      writeFileSync(path.join(out, `${fisier}-3d.png`), randare3d(r.piese, { latime: 600, azimut: 0, elevatie: 55 }));
      writeFileSync(path.join(out, `${fisier}-sus.png`), randare3d(r.piese, { latime: 600, azimut: 0, elevatie: 89.9 }));
      writeFileSync(path.join(out, `${fisier}.3mf`), proiectGenerat(r.piese, MEDALION_BANDA_DEF, p));
      writeFileSync(path.join(out, `${fisier}.txt`), [`piese: ${r.piese.length}`, ...r.avertizari].join("\n"));
    }
  }
}, 600_000);
