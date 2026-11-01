/*
 * Probele turtei dulce: randare 3D (vedere din fata, de sus in jos, cu lumina si umbra), vedere de
 * sus si 3MF pentru fiecare sablon, nume si nivel de decor.
 *
 *   TURTA_OUT=<dosar> npx vitest run --config tests/vitest.tools.config.ts tests/tools/turtaProba.tool.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, it } from "vitest";
import { FORME_TURTA } from "@/magic3d/apps/craciun/config";
import { TURTA_DULCE_DEF } from "@/magic3d/generatoare/defs/turta-dulce";
import { proiectGenerat } from "@/magic3d/generatoare/export";
import type { Parametri } from "@/magic3d/generatoare/tipuri";
import { genereaza, manifold } from "../unit/magic3dGenUtil";
import { randare3d } from "./randare3d";

const NUME = (process.env.TURTA_NUME ?? "Ioana,Ștefănuț,Alexandra-Maria").split(",");
const VARIANTE: Array<[string, Parametri]> = [["mediu", { nivel: "mediu" }], ["bogat", { nivel: "bogat", treiCulori: true, obraji: true }]];

beforeAll(async () => {
  await manifold();
}, 60_000);

it("scrie probele", () => {
  const out = process.env.TURTA_OUT ?? path.resolve("tmp/turta");
  mkdirSync(out, { recursive: true });
  for (const forma of FORME_TURTA) {
    for (const text of NUME) {
      for (const [eticheta, extra] of VARIANTE) {
        const p = { ...TURTA_DULCE_DEF.implicit, forma, text, ...extra, ...(process.env.TURTA_MARIME ? { marime: Number(process.env.TURTA_MARIME) } : {}) };
        const r = genereaza("turta-dulce", p);
        const fisier = `${forma}-${text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()}-${eticheta}`;
        writeFileSync(path.join(out, `${fisier}-3d.png`), randare3d(r.piese, { latime: 600, azimut: 0, elevatie: 55 }));
        writeFileSync(path.join(out, `${fisier}-sus.png`), randare3d(r.piese, { latime: 600, azimut: 0, elevatie: 89.9 }));
        writeFileSync(path.join(out, `${fisier}.3mf`), proiectGenerat(r.piese, TURTA_DULCE_DEF, p));
        writeFileSync(path.join(out, `${fisier}.txt`), [`piese: ${r.piese.length}`, ...r.avertizari].join("\n"));
      }
    }
  }
}, 600_000);
