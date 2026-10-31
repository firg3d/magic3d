import { beforeAll, describe, expect, it } from "vitest";
import { brelocDecor } from "@/magic3d/generatoare/constructori/breloc-decor";
import { brelocuri } from "@/magic3d/generatoare/constructori/brelocuri";
import { BRELOC_DECOR } from "@/magic3d/generatoare/defs/breloc-decor";
import { BRELOCURI } from "@/magic3d/generatoare/defs/brelocuri";
import type { Parametri } from "@/magic3d/generatoare/tipuri";
import { fontExista, genereazaCu, limite, manifold, verificaPiese } from "./magic3dGenUtil";

/* Brelocuri si Brelocuri Decor, construite pe calea worker-ului (arena, triunghiuri in scena). */

beforeAll(async () => {
  await manifold();
});

/** proportiile cu care pornea fiecare tip de prindere in vechea aplicatie (IMPLICITE_PRINDERE) */
const PRINDERI: Record<string, Parametri> = {
  gaura: { tipPrindere: "gaura", diametruGaura: 3.5, grosimePrindere: 0 },
  ureche: { tipPrindere: "ureche", diametruGaura: 4, grosimePrindere: 2.5 },
  inel: { tipPrindere: "inel", diametruGaura: 9, grosimePrindere: 3 },
};

describe("brelocuri", () => {
  const cu = (extra: Parametri = {}) => genereazaCu(brelocuri, { ...BRELOCURI.implicit, ...extra });

  it("are fontul implicit livrat", () => {
    expect(fontExista(String(BRELOCURI.implicit.font))).toBe(true);
  });

  it("cu valorile implicite: placuta si textul, doua corpuri ale aceleiasi piese, fara avertizari", () => {
    const r = cu();
    verificaPiese(BRELOCURI, r);
    expect(r.piese).toHaveLength(2);
    expect(r.piese.map((p) => p.culoare)).toEqual(["#E8709B", "#FFFFFF"]);
    expect(r.avertizari).toEqual([]);
    // textul sta pe placuta, deasupra ei
    const placuta = limite(r.piese[0]);
    const text = limite(r.piese[1]);
    expect(text.minY).toBeGreaterThanOrEqual(placuta.maxY - 1e-3);
    // brelocul iese cam cat s-a cerut (lungimea include si prinderea, deci doar marginea de jos)
    expect(placuta.maxX - placuta.minX).toBeGreaterThan(70 - 1);
  });

  for (const [tip, prindere] of Object.entries(PRINDERI)) {
    it(`prinderea "${tip}" construieste piese valide`, () => {
      const r = cu(prindere);
      verificaPiese(BRELOCURI, r);
      expect(r.piese).toHaveLength(2);
    });
  }

  for (const latura of ["stanga", "dreapta", "sus"]) {
    it(`prinderea pe latura "${latura}" construieste piese valide`, () => {
      const r = cu({ latura });
      verificaPiese(BRELOCURI, r);
      expect(r.piese).toHaveLength(2);
    });
  }

  it("lungimea ceruta schimba marimea brelocului", () => {
    const mic = limite(cu({ lungimePlacuta: 40 }).piese[0]);
    const mare = limite(cu({ lungimePlacuta: 120 }).piese[0]);
    expect(mare.maxX - mare.minX).toBeGreaterThan(mic.maxX - mic.minX + 50);
  });
});

describe("brelocuri decor", () => {
  const cu = (extra: Parametri = {}) => genereazaCu(brelocDecor, { ...BRELOC_DECOR.implicit, ...extra });

  it("are fonturile implicite livrate", () => {
    expect(fontExista(String(BRELOC_DECOR.implicit.fontBaza))).toBe(true);
    expect(fontExista(String(BRELOC_DECOR.implicit.fontNume))).toBe(true);
  });

  it("cu valorile implicite: baza, conturul si scrisul insertiei, fara avertizari", () => {
    const r = cu();
    verificaPiese(BRELOC_DECOR, r);
    expect(r.piese).toHaveLength(3);
    expect(r.piese.map((p) => p.culoare)).toEqual(["#B2DFDB", "#FFFFFF", "#5D6270"]);
    expect(r.avertizari).toEqual([]);
    const [baza, fundal, miez] = r.piese.map(limite);
    // insertia sta culcata langa baza, nu peste ea
    expect(fundal.minX).toBeGreaterThan(baza.maxX);
    expect(miez.minX).toBeGreaterThanOrEqual(fundal.minX - 1e-3);
    expect(fundal.minY).toBeCloseTo(0, 3);
    expect(miez.maxY).toBeGreaterThan(fundal.maxY);
  });

  for (const pozitieInel of ["stanga", "centru", "dreapta"]) {
    it(`inelul la "${pozitieInel}" construieste piese valide`, () => {
      const r = cu({ pozitieInel });
      verificaPiese(BRELOC_DECOR, r);
      expect(r.piese).toHaveLength(3);
    });
  }

  it("fara inel, fara goluri astupate, baza doar pe initiala: tot trei piese valide", () => {
    for (const extra of [{ inel: false }, { umpleGauri: false }, { bazaUrmeazaNumele: false }]) {
      const r = cu(extra);
      verificaPiese(BRELOC_DECOR, r);
      expect(r.piese).toHaveLength(3);
    }
  });

  it("initiala scrisa de mana inlocuieste prima litera a numelui", () => {
    const r = cu({ initiala: "m" });
    verificaPiese(BRELOC_DECOR, r);
    expect(r.piese[0].nume).toContain("M");
  });
});
