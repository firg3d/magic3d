import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { ManifoldToplevel } from "manifold-3d";
import { it } from "vitest";
import { SILICON } from "@/magic3d/apps/silicon/config";
import { inArena } from "@/magic3d/core/geometry/arena";
import { codeazaModel } from "@/magic3d/core/geometry/codare";
import { configureManifold as configText, textSolid } from "@/magic3d/core/geometry/textSolid";
import { silicon } from "@/magic3d/generatoare/constructori/silicon";
import { SILICON_DEF } from "@/magic3d/generatoare/defs/silicon";
import { arhivaGenerat, proiectGenerat } from "@/magic3d/generatoare/export";
import type { Parametri } from "@/magic3d/generatoare/tipuri";
import { font, genereazaCu, manifold } from "../unit/magic3dGenUtil";

/*
 * Proba matritei de silicon: 3MF-urile Bambu si STL-urile pentru doua modele proprii, facute aici:
 * un cub de 30 mm cu "M3D" gravat si un om de zapada din trei sfere cu nas. TERMO_IESIRE = folderul
 * (implicit silicon-proba/).
 */

function triunghiuri(m: { getMesh(): { vertProperties: Float32Array; triVerts: Uint32Array; numProp: number } }): Float32Array {
  const g = m.getMesh();
  const out = new Float32Array(g.triVerts.length * 3);
  g.triVerts.forEach((v, i) => out.set(g.vertProperties.subarray(v * g.numProp, v * g.numProp + 3), i * 3));
  return out;
}

it("scrie probele de matrita de silicon", async () => {
  const mod = (await manifold()) as ManifoldToplevel;
  const modele = inArena(() => {
    const { Manifold } = mod;
    configText(mod);
    const text = textSolid(font("Baloo2-800.ttf"), "M3D", 8, 1.5, {});
    const tb = text.boundingBox();
    const cub = Manifold.cube([30, 30, 30], false).translate([-15, -15, 0]).subtract(text.translate([-(tb.min[0] + tb.max[0]) / 2, -(tb.min[1] + tb.max[1]) / 2, 29]));
    const om = Manifold.union([
      Manifold.sphere(14, 64).translate([0, 0, 14]),
      Manifold.sphere(10, 64).translate([0, 0, 34]),
      Manifold.sphere(7, 64).translate([0, 0, 49]),
      Manifold.cylinder(6, 1.6, 0.4, 24).rotate([90, 0, 0]).translate([0, -6.5, 49]),
    ]);
    return { cub: codeazaModel(triunghiuri(cub), SILICON.maxTriunghiuri)!, om: codeazaModel(triunghiuri(om), SILICON.maxTriunghiuri)! };
  }, () => []);
  const iesire = path.resolve(process.env.TERMO_IESIRE ?? "silicon-proba");
  mkdirSync(iesire, { recursive: true });
  const variante: Array<[string, Partial<Parametri>]> = [
    ["silicon-cub-inscriptie", { model: modele.cub }],
    ["silicon-om-zapada-4-pereti", { model: modele.om, pereti: "4", inclinareX: 0 }],
  ];
  for (const [nume, extra] of variante) {
    const p = { ...SILICON_DEF.implicit, ...extra } as Parametri;
    const r = genereazaCu(silicon, p);
    writeFileSync(path.join(iesire, `${nume}.3mf`), proiectGenerat(r.piese, SILICON_DEF, p));
    writeFileSync(path.join(iesire, `${nume}-stl.zip`), arhivaGenerat(r.piese, SILICON_DEF, p));
    writeFileSync(path.join(iesire, `${nume}.txt`), [`piese: ${r.piese.length}`, ...r.avertizari].join("\n"));
  }
}, 240_000);
