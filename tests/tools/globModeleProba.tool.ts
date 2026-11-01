/*
 * Probele globurilor cu modele: randare 3D a globului asamblat (fara capac si inel), vedere din lateral,
 * 3MF si diagnosticele, pentru fiecare model si constructie.
 *
 *   GLOB_OUT=<dosar> npx vitest run --config tests/vitest.tools.config.ts tests/tools/globModeleProba.tool.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, it } from "vitest";
import { GLOB_MODELE_DEF } from "@/magic3d/generatoare/defs/glob-modele";
import { proiectGenerat } from "@/magic3d/generatoare/export";
import type { Parametri } from "@/magic3d/generatoare/tipuri";
import { genereaza, manifold } from "../unit/magic3dGenUtil";
import { randare3d } from "./randare3d";

const MODELE = (process.env.GLOB_MODELE ?? "nervuri,rasucite,spirala,fante,romburi,hexagoane,fatete").split(",");
const VARIANTE: Array<[string, Parametri]> = (process.env.GLOB_VARIANTE ?? "jumatati,vaza,nume").split(",").map((v) => [v, v === "vaza" ? { constructie: "vaza" } : v === "nume" ? { text: "Ștefănuț" } : {}]);
const EXTRA: Record<string, Parametri> = { spirala: { numar: 6, ture: 1.25 }, fante: { numar: 16 }, romburi: { numar: 16 }, hexagoane: { numar: 16 }, fatete: { numar: 12 } };

beforeAll(async () => {
  await manifold();
}, 60_000);

it("scrie probele", () => {
  const out = process.env.GLOB_OUT ?? path.resolve("tmp/glob-modele");
  mkdirSync(out, { recursive: true });
  for (const model of MODELE) {
    for (const [eticheta, extra] of VARIANTE) {
      const p = { ...GLOB_MODELE_DEF.implicit, model, ...EXTRA[model], ...extra };
      const t0 = Date.now();
      const r = genereaza("glob-modele", p);
      const ms = Date.now() - t0;
      const fisier = `${model}-${eticheta}`;
      // globul asamblat pentru randare: corpul, sau jumatatea de sus (cu numele) peste cea de jos intoarsa
      const vizibile = r.piese.filter((x) => !/Capac|Cap|Inel|Ring/.test(x.nume));
      writeFileSync(path.join(out, `${fisier}-3d.png`), randare3d(vizibile, { latime: 700, azimut: 20, elevatie: 25 }));
      writeFileSync(path.join(out, `${fisier}.3mf`), proiectGenerat(r.piese, GLOB_MODELE_DEF, p));
      writeFileSync(path.join(out, `${fisier}.txt`), [`piese: ${r.piese.length}`, `ms: ${ms}`, ...r.avertizari].join("\n"));
    }
  }
}, 900_000);
