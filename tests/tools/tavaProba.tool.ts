import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { it } from "vitest";
import { codeazaHarta } from "@/magic3d/core/geometry/codare";
import { codeazaContur } from "@/magic3d/core/geometry/conturImagine";
import type { Constructor } from "@/magic3d/generatoare/constructori/comun";
import { presalut } from "@/magic3d/generatoare/constructori/presalut";
import { tava } from "@/magic3d/generatoare/constructori/tava";
import { PRESA_LUT_DEF } from "@/magic3d/generatoare/defs/presalut";
import { TAVA_DEF } from "@/magic3d/generatoare/defs/tava";
import { arhivaGenerat, proiectGenerat } from "@/magic3d/generatoare/export";
import type { GeneratorDef, Parametri } from "@/magic3d/generatoare/tipuri";
import { genereazaCu, manifold } from "../unit/magic3dGenUtil";

/*
 * Proba matritei tava si a presei pentru lut/sapun: 3MF-urile Bambu si STL-urile pe date proprii
 * (formele Magic3D si o "frunza" desenata aici, cu relief din poza: un gradient cu nervura).
 * TERMO_IESIRE = folderul (implicit tava-proba/).
 */

/** O frunza ovala ascutita, in pixelii unei imagini de 120 x 80 (Y in jos), si harta ei de gri. */
function frunza(): { imagine: string; harta: string } {
  const inel = Array.from({ length: 64 }, (_, i) => {
    const u = (2 * Math.PI * i) / 64;
    return { x: 60 + 56 * Math.cos(u), y: 40 + 34 * Math.sin(u) * Math.abs(Math.cos(u / 2)) ** 0.6 };
  });
  const gri = new Uint8Array(60 * 40);
  for (let y = 0; y < 40; y += 1) for (let x = 0; x < 60; x += 1) gri[y * 60 + x] = Math.abs(y - 20) < 1.5 ? 255 : Math.round(120 + 100 * Math.sin((x / 60) * Math.PI));
  return { imagine: codeazaContur(120, 80, [inel]), harta: codeazaHarta({ latime: 60, inaltime: 40, gri }) };
}

const f = frunza();
const VARIANTE: Array<[string, GeneratorDef, Constructor, Partial<Parametri>]> = [
  ["tava-inimi", TAVA_DEF, tava, {}],
  ["tava-frunze-relief", TAVA_DEF, tava, { sursa: "imagine", imagine: f.imagine, hartaImagine: f.harta, reliefPoza: true, inaltimeRelief: 1.5, latime: 60, adancime: 12, randuri: 2, coloane: 2 }],
  ["master-silicon-hexagon", TAVA_DEF, tava, { mod: "master", forma: "hexagon", latime: 35, adancime: 15, randuri: 2, coloane: 2 }],
  ["presa-sapun-doua", PRESA_LUT_DEF, presalut, {}],
  ["presa-sapun-fata", PRESA_LUT_DEF, presalut, { tip: "fata", latime: 70 }],
];

it("scrie probele de matrita tava si presa pentru lut", async () => {
  await manifold();
  const iesire = path.resolve(process.env.TERMO_IESIRE ?? "tava-proba");
  mkdirSync(iesire, { recursive: true });
  for (const [nume, def, constructor, extra] of VARIANTE) {
    const p = { ...def.implicit, ...extra } as Parametri;
    const r = genereazaCu(constructor, p);
    writeFileSync(path.join(iesire, `${nume}.3mf`), proiectGenerat(r.piese, def, p));
    writeFileSync(path.join(iesire, `${nume}-stl.zip`), arhivaGenerat(r.piese, def, p));
    writeFileSync(path.join(iesire, `${nume}.txt`), [`piese: ${r.piese.length}`, ...r.avertizari].join("\n"));
  }
}, 240_000);
