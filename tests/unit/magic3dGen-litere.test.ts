import { beforeAll, describe, expect, it } from "vitest";
import { litere } from "@/magic3d/generatoare/constructori/litere";
import { LITERE } from "@/magic3d/generatoare/defs/litere";
import { fontExista, genereazaCu, limite, manifold, verificaPiese } from "./magic3dGenUtil";

beforeAll(async () => {
  await manifold();
});

describe("Litere Decor in editor", () => {
  it("are fonturile implicite livrate", () => {
    expect(fontExista(String(LITERE.implicit.fontLitera))).toBe(true);
    expect(fontExista(String(LITERE.implicit.fontScris))).toBe(true);
  });

  it("construieste litera cu scrisul in locas: doua piese, scrisul in afara literei", () => {
    const r = genereazaCu(litere, LITERE.implicit);
    verificaPiese(LITERE, r);
    expect(r.piese).toHaveLength(2);
    const litera = limite(r.piese[0]);
    expect(litera.maxX - litera.minX).toBeGreaterThan(60);
    expect(litera.maxY - litera.minY).toBeGreaterThan(20);
  });

  it("se reconstruieste de mai multe ori la rand: rotunjirea memorata supravietuieste arenei", () => {
    for (const grosimeLitera of [20, 25, 30]) {
      const r = genereazaCu(litere, { ...LITERE.implicit, grosimeLitera });
      verificaPiese(LITERE, r);
    }
  });

  it("merge in relief, gravat si fara scris", () => {
    for (const modScris of ["relief", "gravat"]) verificaPiese(LITERE, genereazaCu(litere, { ...LITERE.implicit, modScris }));
    const doarLitera = genereazaCu(litere, { ...LITERE.implicit, scris: "", litera: "O" });
    verificaPiese(LITERE, doarLitera);
    expect(doarLitera.piese).toHaveLength(1);
  });

  it("sta in picioare, cu litera mai inalta decat groasa", () => {
    const litera = limite(genereazaCu(litere, { ...LITERE.implicit, scris: "" }).piese[0]);
    expect(litera.maxY - litera.minY).toBeGreaterThan(100);
    expect(litera.maxZ - litera.minZ).toBeLessThan(40);
  });

  it("lipeste o tematica multicolora pe litera: corpurile ei ies ca piese separate", () => {
    const r = genereazaCu(litere, { ...LITERE.implicit, fisier3mfTema1: "tematici/As romb.3mf", marimeTema1: 30, yTema1: 20 });
    verificaPiese(LITERE, r);
    expect(r.piese.length).toBeGreaterThan(2);
    expect(r.avertizari.filter((a) => /atinge/.test(a))).toEqual([]);
    // Tematica sta pe fata literei, iar fata e spre privitor (+Z), ca in vechea previzualizare.
    const litera = limite(r.piese[0]);
    const tema = limite(r.piese[r.piese.length - 1]);
    expect(tema.maxZ).toBeGreaterThan((litera.minZ + litera.maxZ) / 2);
  });

  it("aseaza litera in locasul unei baze, cu baza dedesubt", () => {
    const r = genereazaCu(litere, { ...LITERE.implicit, scris: "", fisier3mfBaza: "base/As romb.3mf", scaraBaza: 60, litera: "Ș" });
    verificaPiese(LITERE, r);
    const litera = limite(r.piese[0]);
    const baza = r.piese.slice(1).map(limite);
    expect(baza.length).toBeGreaterThan(0);
    // Baza e sub litera: talpa literei intra in baza (locasul), varful bazei e sub mijlocul literei.
    const varfBaza = Math.max(...baza.map((b) => b.maxY));
    expect(litera.minY).toBeLessThan(varfBaza);
    expect(varfBaza).toBeLessThan((litera.minY + litera.maxY) / 2);
    expect(r.avertizari.filter((a) => /diacritic|accent/i.test(a))).toEqual([]);
  });

  it("se citeste din fata: piciorul lui L e jos si spre dreapta, nu in oglinda", () => {
    const r = genereazaCu(litere, { ...LITERE.implicit, scris: "", litera: "L", razaMuchie: 0 });
    const b = limite(r.piese[0]);
    const q = r.piese[0].positions;
    const prag = (b.maxY - b.minY) * 0.15;
    let jos = -Infinity;
    let sus = -Infinity;
    for (let i = 0; i < q.length; i += 3) {
      if (q[i + 1] < b.minY + prag) jos = Math.max(jos, q[i]);
      if (q[i + 1] > b.maxY - prag) sus = Math.max(sus, q[i]);
    }
    expect(jos - sus).toBeGreaterThan(10);
  });

  it("avertizeaza la diacritice fara baza", () => {
    const r = genereazaCu(litere, { ...LITERE.implicit, scris: "", litera: "Ș" });
    expect(r.avertizari.some((a) => /bază|base/i.test(a))).toBe(true);
  });
});
