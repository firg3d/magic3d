import { beforeAll, describe, expect, it } from "vitest";
import * as geomCutii from "@/magic3d/apps/cutii/cutii";
import { TIPARE as TIPARE_GEOM } from "@/magic3d/core/geometry/tipare";
import { t } from "@/magic3d/core/i18n/index";
import { cutii } from "@/magic3d/generatoare/constructori/cutii";
import { fagure } from "@/magic3d/generatoare/constructori/fagure";
import * as defCutii from "@/magic3d/generatoare/defs/cutii";
import { CUTII } from "@/magic3d/generatoare/defs/cutii";
import { FAGURE } from "@/magic3d/generatoare/defs/fagure";
import type { Parametri } from "@/magic3d/generatoare/tipuri";
import { fontExista, genereazaCu, limite, manifold, verificaPiese } from "./magic3dGenUtil";

/*
 * Litere Fagure si Cutii Litere in editor. Fagure e greu (vechiul rulator il impartea in trei
 * procese din cauza heap-ului WASM), deci aici: implicitele plus cateva variante la marimi modeste,
 * toate pe aceeasi instanta manifold.
 */

beforeAll(async () => {
  await manifold();
});

const cu = (def: { implicit: Parametri }, extra: Parametri): Parametri => ({ ...def.implicit, ...extra });

describe("Litere Fagure", () => {
  it("fontul implicit e livrat", () => {
    expect(fontExista(String(FAGURE.implicit.font))).toBe(true);
  });

  it("implicitele: o singura piesa, in picioare pe placa", () => {
    const r = genereazaCu(fagure, FAGURE.implicit);
    verificaPiese(FAGURE, r);
    expect(r.piese).toHaveLength(1);
    const b = limite(r.piese[0]);
    // talpa pe placa, litera in sus (~120 mm), grosimea (14 mm) pe adancimea scenei
    expect(b.minY).toBeCloseTo(0, 3);
    expect(b.maxY - b.minY).toBeGreaterThan(100);
    expect(b.maxZ - b.minZ).toBeCloseTo(14, 1);
    expect(r.avertizari).toEqual([]);
  });

  it.each(["perforat", "diagonal", "spirala"])("tiparul %s construieste o piesa valida", (model) => {
    const r = genereazaCu(fagure, cu(FAGURE, { model, litera: "H", inaltimeLitera: 80, grosime: 12 }));
    verificaPiese(FAGURE, r);
    expect(r.piese).toHaveLength(1);
  });

  it("gravat: placa si modelul, doua piese in doua culori", () => {
    const r = genereazaCu(fagure, cu(FAGURE, { model: "voronoi", modModel: "gravat", litera: "O", inaltimeLitera: 80, grosime: 12 }));
    verificaPiese(FAGURE, r);
    expect(r.piese).toHaveLength(2);
    expect(r.piese.map((p) => p.culoare)).toEqual([FAGURE.implicit.culoare, FAGURE.implicit.culoareModel]);
  });

  it("surub prin litera cu capac: capacul e piesa separata", () => {
    const r = genereazaCu(fagure, cu(FAGURE, { tipAgatare: "gaura", capacel: true, litera: "O", inaltimeLitera: 100 }));
    verificaPiese(FAGURE, r);
    expect(r.avertizari).toEqual([]);
    expect(r.piese).toHaveLength(2);
  });
});

describe("Cutii Litere", () => {
  it("fontul implicit e livrat, iar limitele copiate in definitie sunt cele din geometrie", () => {
    expect(fontExista(String(CUTII.implicit.font))).toBe(true);
    expect([defCutii.INALTIME_MIN, defCutii.INALTIME_MAX, defCutii.PERETE_MIN, defCutii.PERETE_MAX])
      .toEqual([geomCutii.INALTIME_MIN, geomCutii.INALTIME_MAX, geomCutii.PERETE_MIN, geomCutii.PERETE_MAX]);
    expect(defCutii.FORME_GOL).toEqual(geomCutii.FORME_GOL);
    expect(defCutii.TIPARE).toEqual(TIPARE_GEOM);
  });

  it("implicitele (cutie de masa): o piesa, culcata cu gura in sus", () => {
    const r = genereazaCu(cutii, CUTII.implicit);
    verificaPiese(CUTII, r);
    expect(r.piese).toHaveLength(1);
    const b = limite(r.piese[0]);
    expect(b.minY).toBeCloseTo(0, 3);
    // inaltimea pe placa = adancimea cutiei (60) plus fundul, nu inaltimea literei (120)
    expect(b.maxY - b.minY).toBeLessThan(80);
    expect(b.maxZ - b.minZ).toBeGreaterThan(100);
    expect(r.avertizari).toEqual([]);
  });

  it("pe masa agatarea nu se aplica, oricare ar fi valoarea ramasa", () => {
    const masa = genereazaCu(cutii, cu(CUTII, { modProdus: "masa", tipAgatare: "cheie", adancime: 30 }));
    const faraAgatare = genereazaCu(cutii, cu(CUTII, { modProdus: "masa", tipAgatare: "fara", adancime: 30 }));
    expect(masa.piese[0].positions.length).toBe(faraAgatare.piese[0].positions.length);
  });

  it("pe perete, cu gaura de cheie: o piesa valida, fara avertizari", () => {
    const r = genereazaCu(cutii, cu(CUTII, { modProdus: "perete", tipAgatare: "cheie", adancime: 40 }));
    verificaPiese(CUTII, r);
    expect(r.piese).toHaveLength(1);
    expect(r.avertizari).toEqual([]);
  });

  it("pereti traforati si fund cu model: o piesa, cu avertizarea de fund strapuns", () => {
    const r = genereazaCu(cutii, cu(CUTII, { traforPereti: true, modelFund: "fagure", adancime: 60 }));
    verificaPiese(CUTII, r);
    expect(r.piese).toHaveLength(1);
    expect(r.avertizari).toContain(t("cutii.statusFundStrapuns"));
  });
});
