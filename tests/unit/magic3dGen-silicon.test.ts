import type { ManifoldToplevel } from "manifold-3d";
import { beforeAll, describe, expect, it } from "vitest";
import { SILICON } from "@/magic3d/apps/silicon/config";
import { buildSilicon, configureManifold, type ParamSilicon } from "@/magic3d/apps/silicon/silicon";
import { inArena } from "@/magic3d/core/geometry/arena";
import { codeazaModel } from "@/magic3d/core/geometry/codare";
import { centroid } from "@/magic3d/core/geometry/forme2d";
import { configureManifold as configText, textSolid } from "@/magic3d/core/geometry/textSolid";
import { silicon } from "@/magic3d/generatoare/constructori/silicon";
import { SILICON_DEF } from "@/magic3d/generatoare/defs/silicon";
import { contextGenerat } from "@/magic3d/generatoare/export";
import type { Parametri } from "@/magic3d/generatoare/tipuri";
import { font, genereazaCu, manifold, verificaPiese } from "./magic3dGenUtil";

/*
 * Matrita de silicon pe modele proprii, facute aici: un cub de 30 mm cu "M3D" gravat pe fata de sus,
 * un cub gol pe dinauntru si o clepsidra (cu contrapanta). Distanta, cheile si volumele se masoara
 * pe geometrie.
 */

let mod: ManifoldToplevel;
const modele: Record<string, string> = {};
beforeAll(async () => {
  mod = (await manifold()) as ManifoldToplevel;
  inArena(() => {
    const { Manifold } = mod;
    configText(mod);
    const text = textSolid(font("Baloo2-800.ttf"), "M3D", 8, 1.5, {});
    const tb = text.boundingBox();
    const inscriptie = text.translate([-(tb.min[0] + tb.max[0]) / 2, -(tb.min[1] + tb.max[1]) / 2, 30 - 1]);
    const cub = Manifold.cube([30, 30, 30], false).translate([-15, -15, 0]);
    const gol = cub.subtract(Manifold.cube([16, 16, 16], true).translate([0, 0, 15]));
    const clepsidra = Manifold.union([Manifold.cylinder(5, 10, 10, 48), Manifold.cylinder(10.02, 4, 4, 48).translate([0, 0, 4.99]), Manifold.cylinder(5, 10, 10, 48).translate([0, 0, 15])]);
    for (const [nume, m] of Object.entries({ inscriptie: cub.subtract(inscriptie), cub, gol, clepsidra })) modele[nume] = codeazaModel(triunghiuri(m), SILICON.maxTriunghiuri)!;
    return [];
  }, () => []);
});

function triunghiuri(m: { getMesh(): { vertProperties: Float32Array; triVerts: Uint32Array; numProp: number } }): Float32Array {
  const g = m.getMesh();
  const out = new Float32Array(g.triVerts.length * 3);
  g.triVerts.forEach((v, i) => out.set(g.vertProperties.subarray(v * g.numProp, v * g.numProp + 3), i * 3));
  return out;
}

const cfg = (extra: Partial<ParamSilicon> = {}): ParamSilicon => ({
  model: modele.inscriptie, scara: 100, umplere: true, distanta: 10, separatie: "auto", inaltimeSeparatie: 50, inclinareX: 0, inclinareY: 0, pereti: 2, canalDx: 0, canalDy: 0, ...extra,
});
const ps = (extra: Partial<Parametri> = {}): Parametri => ({ ...SILICON_DEF.implicit, model: modele.inscriptie, ...extra });

describe("Matriță de silicon din model 3D", { timeout: 180_000 }, () => {
  it("cubul cu inscriptie: pozitiv, placa de separatie, pereti, cleme, fund, canal si rasuflatori, toate intregi", () => {
    const r = genereazaCu(silicon, ps());
    verificaPiese(SILICON_DEF, r);
    const nume = r.piese.map((x) => x.nume);
    expect(nume.filter((n) => n === "Perete")).toHaveLength(2);
    expect(nume.filter((n) => n === "Clemă")).toHaveLength(2);
    for (const n of ["Pozitiv (modelul)", "Placă de separație", "Fund", "Canal de turnare"]) expect(nume).toContain(n);
    expect(r.avertizari.some((a) => a.includes("ml") && a.includes("g"))).toBe(true);
  });

  it.each([2, 4] as const)("cutia cu %i pereti e la distanta ceruta de model, pe toate laturile si deasupra", (pereti) => {
    const r = inArena(() => {
      configureManifold(mod);
      const rez = buildSilicon(cfg({ pereti, distanta: 12 }));
      const model = rez.piese.find((x) => x.rol === "pozitiv")!.manifold.boundingBox();
      const pereteGeo = mod.Manifold.union(rez.piese.filter((x) => x.rol === "perete").map((x) => x.manifold));
      const b = pereteGeo.boundingBox();
      const felie = pereteGeo.slice(20);
      // Golul dintre pereti, masurat pe o fasie ingusta (departe de taieturile de la x = 0 si y = 0).
      const gol = (fasie: unknown, axa: 0 | 1) => {
        const bucati = felie.intersect(fasie).decompose().map((x: { bounds(): { min: number[]; max: number[] } }) => x.bounds());
        return Math.min(...bucati.filter((q) => q.min[axa] > 0).map((q) => q.min[axa])) - Math.max(...bucati.filter((q) => q.max[axa] < 0).map((q) => q.max[axa]));
      };
      const S = mod.CrossSection;
      const g = [gol(S.square([400, 2]).translate([-200, 4]), 0), gol(S.square([2, 400]).translate([4, -200]), 1)];
      return { bucati: rez.piese.filter((x) => x.rol === "perete").length, model, gol: g, inaltime: b.max[2] - b.min[2], interior: rez.diag.interior };
    }, () => []);
    expect(r.bucati).toBe(pereti);
    const lx = r.model.max[0] - r.model.min[0], ly = r.model.max[1] - r.model.min[1], lz = r.model.max[2] - r.model.min[2];
    expect(r.gol[0]).toBeCloseTo(lx + 24, 1);
    expect(r.gol[1]).toBeCloseTo(ly + 24, 1);
    expect(r.interior[2]).toBeCloseTo(lz + 24, 3);
    expect(r.inaltime).toBeCloseTo(lz + 24 + SILICON.canelura, 3);
  });

  it("cheile sunt simetrice fata de centru si ies din placa de separatie deasupra planului", () => {
    const r = inArena(() => {
      configureManifold(mod);
      const rez = buildSilicon(cfg());
      const placa = rez.piese.find((x) => x.rol === "separatie")!.manifold;
      const z = rez.diag.chei[0][2] + rez.diag.razaCheie / 2;
      const cercuri = placa.slice(z).decompose().filter((c: { area(): number }) => c.area() > 1).map((c: never) => centroid(c));
      return { chei: rez.diag.chei, cercuri, atinge: rez.diag.cheieAtinge };
    }, () => []);
    expect(r.chei).toHaveLength(4);
    for (const [x, y, z] of r.chei) {
      for (const [sx, sy] of [[-1, 1], [1, -1], [-1, -1]]) expect(r.chei.some(([a, b, c]) => Math.abs(a - sx * x) < 1e-6 && Math.abs(b - sy * y) < 1e-6 && Math.abs(c - z) < 1e-6)).toBe(true);
    }
    expect(r.cercuri).toHaveLength(4);
    const sum = r.cercuri.reduce((s: number[], [x, y]: number[]) => [s[0] + x, s[1] + y], [0, 0]);
    expect(Math.abs(sum[0])).toBeLessThan(0.05);
    expect(Math.abs(sum[1])).toBeLessThan(0.05);
    expect(r.atinge).toBe(false);
  });

  it("volumul de silicon: cele doua jumatati = cutia minus modelul minus tijele (si cubul plin: 50³ - 30³ - tije)", () => {
    const r = inArena(() => {
      configureManifold(mod);
      const a = buildSilicon(cfg()).diag;
      const b = buildSilicon(cfg({ model: modele.cub })).diag;
      return { a, b };
    }, () => []);
    for (const d of [r.a, r.b]) {
      expect(d.volumInterior).toBeCloseTo(d.interior[0] * d.interior[1] * d.interior[2], 0);
      expect(Math.abs(d.volumSus + d.volumJos - (d.volumInterior - d.volumModel - d.volumTije)) / d.volumInterior).toBeLessThan(1e-4);
      expect(d.volumSus).toBeGreaterThan(0);
      expect(d.volumJos).toBeGreaterThan(0);
    }
    expect(r.b.volumInterior).toBeCloseTo(50 ** 3, 0);
    expect(r.b.volumModel).toBeCloseTo(30 ** 3, 0);
    expect(r.b.volumSus + r.b.volumJos).toBeCloseTo(50 ** 3 - 30 ** 3 - r.b.volumTije, -1);
  });

  it("umplerea golurilor interioare face pozitivul plin", () => {
    const v = inArena(() => {
      configureManifold(mod);
      return [buildSilicon(cfg({ model: modele.gol, umplere: false })).diag.volumModel, buildSilicon(cfg({ model: modele.gol, umplere: true })).diag.volumModel];
    }, () => []);
    expect(v[0]).toBeCloseTo(30 ** 3 - 16 ** 3, -1);
    expect(v[1]).toBeCloseTo(30 ** 3, -1);
  });

  it("planul automat sta la cea mai mare sectiune; inclinat, cheile raman pe el", () => {
    const r = inArena(() => {
      configureManifold(mod);
      const drept = buildSilicon(cfg({ model: modele.clepsidra }));
      const inclinat = buildSilicon(cfg({ inclinareX: 10, inclinareY: -5 }));
      const n = inclinat.diag.normala;
      return {
        zDrept: drept.diag.offset,
        peplan: inclinat.diag.chei.map(([x, y, z]) => n[0] * x + n[1] * y + n[2] * z - inclinat.diag.offset),
        iese: inclinat.diag.planIese,
      };
    }, () => []);
    // Clepsidra: discurile mari (raza 10) jos (z 0-5) si sus (15-20), deasupra fundului de 10 mm.
    expect(r.zDrept).toBeLessThan(10 + 5);
    for (const e of r.peplan) expect(Math.abs(e)).toBeLessThan(1e-6);
    expect(r.iese).toBe(false);
  });

  it("zona sub-taiata -> avertizare (clepsidra); cubul se scoate fara avertizare", () => {
    const cu = genereazaCu(silicon, ps({ model: modele.clepsidra }));
    const fara = genereazaCu(silicon, ps({ model: modele.cub }));
    expect(cu.avertizari.some((a) => a.includes("sub-tăiate"))).toBe(true);
    expect(fara.avertizari.some((a) => a.includes("sub-tăiate"))).toBe(false);
  });

  it("canalul in punctul cel mai inalt, rasuflatorile departe de el; canalul se poate muta", () => {
    const r = inArena(() => {
      configureManifold(mod);
      const a = buildSilicon(cfg({ model: modele.cub }));
      const b = buildSilicon(cfg({ canalDx: 12, canalDy: 12 }));
      const c = buildSilicon(cfg());
      return { a: a.diag, b: b.diag, c: c.diag };
    }, () => []);
    const top = 10 + 30;
    expect(r.a.canal![2]).toBeCloseTo(top, 3);
    for (const v of r.a.rasuflatori) expect(Math.hypot(v[0] - r.a.canal![0], v[1] - r.a.canal![1])).toBeGreaterThanOrEqual(SILICON.distantaRasuflatori);
    // Cubul cu inscriptie are multe puncte pe fata de sus: canalul mutat ajunge mai aproape de tinta.
    const tinta = [r.c.canal![0] + 12, r.c.canal![1] + 12];
    expect(Math.hypot(r.b.canal![0] - tinta[0], r.b.canal![1] - tinta[1])).toBeLessThan(Math.hypot(r.c.canal![0] - tinta[0], r.c.canal![1] - tinta[1]) - 1);
  });

  it("verifica patul imprimantei alese si pune optiunea de atelier in oferta", () => {
    const mare = genereazaCu(silicon, ps({ scara: 400 }));
    expect(mare.avertizari.some((a) => a.includes("A1 mini"))).toBe(true);
    const p = ps();
    const r = genereazaCu(silicon, p);
    expect(r.avertizari.some((a) => a.includes("A1 mini"))).toBe(false);
    expect(contextGenerat(r.piese, SILICON_DEF, p).servicii?.map((s) => s.id)).toEqual(["silicon"]);
  });

  it("fara model: avertizare, nicio piesa", () => {
    const r = genereazaCu(silicon, ps({ model: "" }));
    expect(r.piese).toHaveLength(0);
    expect(r.avertizari[0]).toContain("model");
  });
});
