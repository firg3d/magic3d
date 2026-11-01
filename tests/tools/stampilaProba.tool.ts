import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { it } from "vitest";
import { codeazaContur } from "@/magic3d/core/geometry/conturImagine";
import { presa } from "@/magic3d/generatoare/constructori/presa";
import { stampila } from "@/magic3d/generatoare/constructori/stampila";
import { PRESA_DEF } from "@/magic3d/generatoare/defs/presa";
import { STAMPILA_DEF } from "@/magic3d/generatoare/defs/stampila";
import { arhivaGenerat, proiectGenerat } from "@/magic3d/generatoare/export";
import type { Constructor } from "@/magic3d/generatoare/constructori/comun";
import type { GeneratorDef, Parametri } from "@/magic3d/generatoare/tipuri";
import { genereazaCu, manifold } from "../unit/magic3dGenUtil";

/*
 * Proba stampilei si a presei de hartie: 3MF-urile Bambu si STL-urile pe date proprii (text si un
 * "logo" desenat aici: o stea cu un cerc gol in mijloc). TERMO_IESIRE = folderul (implicit stampila-proba/).
 */

/** Steaua cu cinci colturi si gaura rotunda, in pixelii unei imagini de 200 x 200 (Y in jos). */
function logo(): string {
  const stea = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 ? 42 : 95;
    const u = -Math.PI / 2 + (i * Math.PI) / 5;
    return { x: 100 + r * Math.cos(u), y: 105 + r * Math.sin(u) };
  });
  const gaura = Array.from({ length: 32 }, (_, i) => ({ x: 100 + 18 * Math.cos((i * Math.PI) / 16), y: 105 + 18 * Math.sin((i * Math.PI) / 16) }));
  return codeazaContur(200, 200, [stea, gaura]);
}

const VARIANTE: Array<[string, GeneratorDef, Constructor, Partial<Parametri>]> = [
  ["stampila-cerneala", STAMPILA_DEF, stampila, {}],
  ["stampila-logo-lut", STAMPILA_DEF, stampila, { varianta: "lut", continut: "ambele", imagine: logo(), text: "Atelier", forma: "rotunda", latime: 50, maner: "cilindru" }],
  ["presa-cleste", PRESA_DEF, presa, {}],
  ["presa-placi-logo", PRESA_DEF, presa, { corp: "placi", continut: "imagine", imagine: logo() }],
];

it("scrie probele de stampila si presa", async () => {
  await manifold();
  const iesire = path.resolve(process.env.TERMO_IESIRE ?? "stampila-proba");
  mkdirSync(iesire, { recursive: true });
  for (const [nume, def, constructor, extra] of VARIANTE) {
    const p = { ...def.implicit, ...extra } as Parametri;
    const r = genereazaCu(constructor, p);
    writeFileSync(path.join(iesire, `${nume}.3mf`), proiectGenerat(r.piese, def, p));
    writeFileSync(path.join(iesire, `${nume}-stl.zip`), arhivaGenerat(r.piese, def, p));
    writeFileSync(path.join(iesire, `${nume}.txt`), [`piese: ${r.piese.length}`, ...r.avertizari].join("\n"));
  }
}, 180_000);
