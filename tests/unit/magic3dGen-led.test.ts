import { beforeAll, describe, expect, it } from "vitest";
import { led } from "@/magic3d/generatoare/constructori/led";
import { numeLed } from "@/magic3d/generatoare/constructori/nume-led";
import { LED } from "@/magic3d/generatoare/defs/led";
import { NUME_LED } from "@/magic3d/generatoare/defs/nume-led";
import { fontExista, genereazaCu, limite, manifold, verificaPiese } from "./magic3dGenUtil";

/*
 * Litere LED si Nume LED in editor: ca in vederea "ansamblu" a aplicatiilor vechi, doua piese,
 * corpul opac si fata translucida, fiecare in culoarea ei.
 */

beforeAll(async () => {
  await manifold();
});

describe("generatorul Litere LED", () => {
  it("are fontul implicit livrat", () => {
    expect(fontExista(String(LED.implicit.font))).toBe(true);
  });

  it("construieste corpul si fata din valorile implicite", () => {
    const r = genereazaCu(led, LED.implicit);
    verificaPiese(LED, r);
    expect(r.piese.map((p) => p.culoare)).toEqual([LED.implicit.culoare, LED.implicit.culoareFata]);
    const corp = limite(r.piese[0]);
    // litera de 150 mm (pe capHeight), stand culcata: inaltimea literei pe X/Z, adancimea pe Y
    expect(corp.maxZ - corp.minZ).toBeGreaterThan(140);
    expect(corp.maxY - corp.minY).toBeGreaterThan(25);
    // fata sta in gura corpului, nu alaturi
    const fata = limite(r.piese[1]);
    expect(fata.minX).toBeGreaterThanOrEqual(corp.minX - 0.01);
    expect(fata.maxX).toBeLessThanOrEqual(corp.maxX + 0.01);
    expect(r.avertizari).toEqual([]);
  }, 60_000);

  it("construieste cu alta banda, alta agatare si alt canal", () => {
    for (const v of [
      { tipBanda: "120", latimeBanda: "8", tipAgatare: "grila", pozitieCanal: "jos" },
      { tipBanda: "30", latimeBanda: "12", tipAgatare: "fara", pozitieCanal: "lateral", locCanal: "sus" },
    ]) {
      const r = genereazaCu(led, { ...LED.implicit, ...v });
      verificaPiese(LED, r);
      expect(r.piese).toHaveLength(2);
    }
  }, 120_000);

  it("avertizeaza cand banda nu incape", () => {
    const r = genereazaCu(led, { ...LED.implicit, litera: "I", inaltimeLitera: 60, latimeBanda: "12", grosimePerete: 4 });
    expect(r.avertizari.length).toBeGreaterThan(0);
  }, 60_000);
});

describe("generatorul Nume LED", () => {
  it("are fontul implicit livrat", () => {
    expect(fontExista(String(NUME_LED.implicit.font))).toBe(true);
  });

  it("construieste corpul si fata din valorile implicite, o singura piesa de cuvant", () => {
    const r = genereazaCu(numeLed, NUME_LED.implicit);
    verificaPiese(NUME_LED, r);
    expect(r.piese.map((p) => p.culoare)).toEqual([NUME_LED.implicit.culoare, NUME_LED.implicit.culoareFata]);
    // implicitul vechi (GreatVibes, 3 mm ingrosare) da o piesa cu loc de banda: nicio avertizare
    expect(r.avertizari).toEqual([]);
  }, 120_000);

  it("construieste pe masa, cu alta banda si cu ingrosarea gasita automat", () => {
    const masa = genereazaCu(numeLed, { ...NUME_LED.implicit, modProdus: "masa", pozitieCanal: "jos", tipBanda: "120" });
    verificaPiese(NUME_LED, masa);
    expect(masa.piese).toHaveLength(2);

    const auto = genereazaCu(numeLed, { ...NUME_LED.implicit, ingrosare: 0, ingrosareAuto: true, tipAgatare: "grila" });
    verificaPiese(NUME_LED, auto);
    expect(auto.piese).toHaveLength(2);
    // sfatul (valoarea pusa) apare in avertizari; fara bucati sau camera lipsa
    expect(auto.avertizari).toHaveLength(1);
    expect(auto.avertizari[0]).toMatch(/\d mm/);
  }, 180_000);
});
