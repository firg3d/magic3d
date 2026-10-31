// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { calculeazaPiesa, COTE, JOC, MATERIALE, TIPURI_PIESE, valoriImplicite, type Material } from "@/magic3d/logo/piese";
import { construiestePiesa } from "@/magic3d/logo/pieseConstructie";

const masura = (piesa: ReturnType<typeof calculeazaPiesa>, cheie: string) => piesa.masuri.find((m) => m.cheie === cheie)!;

describe("piese din masuratori: dimensiunile si jocul din configuratie", () => {
  it("jocul creste cu materialul care se strange mai mult: PLA <= PETG <= ASA", () => {
    for (const potrivire of ["alunecare", "presare", "surub"] as const) {
      expect(JOC.PLA[potrivire]).toBeLessThanOrEqual(JOC.PETG[potrivire]);
      expect(JOC.PETG[potrivire]).toBeLessThanOrEqual(JOC.ASA[potrivire]);
    }
  });

  for (const material of MATERIALE as Material[]) {
    it(`bucsa in ${material}: gaura = axul + de doua ori jocul de alunecare; exteriorul ramane, sau intra stramt`, () => {
      const liber = calculeazaPiesa("bucsa", { diamAx: 8, diamExterior: 16, lungime: 10 }, material);
      expect(masura(liber, "diamAx").final).toBeCloseTo(8 + 2 * JOC[material].alunecare, 6);
      expect(masura(liber, "diamExterior").final).toBe(16);
      const inGaura = calculeazaPiesa("bucsa", { diamAx: 8, diamExterior: 16, lungime: 10 }, material, { inGaura: true });
      expect(masura(inGaura, "diamExterior").final).toBeCloseTo(16 - 2 * JOC[material].presare, 6);
      // Corpurile: cilindrul plin la diametrul exterior, gaura la diametrul cu joc, mai lunga ca sa taie de tot.
      const [plin, gaura] = liber.corpuri;
      expect(plin.latime).toBe(16);
      expect(plin.inaltime).toBe(10);
      expect(gaura.gaura).toBe(true);
      expect(gaura.latime).toBeCloseTo(8 + 2 * JOC[material].alunecare, 6);
      expect(gaura.inaltime).toBeGreaterThan(10);
    });
  }

  it("capacul: cavitatea = tubul + jocul de presare, exteriorul = cavitatea + doi pereti", () => {
    const p = calculeazaPiesa("capac", { diamTubExterior: 25, adancime: 10, perete: 2, grosimeCapac: 2 }, "PETG");
    const cavitate = 25 + 2 * JOC.PETG.presare;
    expect(masura(p, "diamTubExterior").final).toBeCloseTo(cavitate, 6);
    expect(masura(p, "diamExteriorCapac").final).toBeCloseTo(cavitate + 4, 6);
    expect(p.corpuri[0].inaltime).toBe(12);
    expect(p.corpuri[1].elevatie).toBe(2);
  });

  it("dopul: mai mic decat interiorul tubului cu jocul de presare, cu guler la margine", () => {
    const p = calculeazaPiesa("dop", { diamTubInterior: 20, adancime: 10, guler: 2, grosimeCapac: 2 }, "ASA");
    expect(masura(p, "diamTubInterior").final).toBeCloseTo(20 - 2 * JOC.ASA.presare, 6);
    expect(masura(p, "diamGuler").final).toBe(24);
  });

  it("suportul in L: gaurile = surubul + jocul de surub; fara surub, fara gauri", () => {
    const cu = calculeazaPiesa("suportL", { latime: 20, bratOrizontal: 40, bratVertical: 40, grosime: 4, diamSurub: 4 }, "PLA");
    expect(masura(cu, "diamSurub").final).toBeCloseTo(4 + 2 * JOC.PLA.surub, 6);
    expect(cu.corpuri.filter((c) => c.gaura)).toHaveLength(2);
    expect(cu.corpuri.filter((c) => c.gaura && c.culcat)).toHaveLength(1);
    const fara = calculeazaPiesa("suportL", { latime: 20, bratOrizontal: 40, bratVertical: 40, grosime: 4, diamSurub: 0 }, "PLA");
    expect(fara.corpuri.some((c) => c.gaura)).toBe(false);
  });

  it("clema: interiorul = teava + jocul de presare, doua gauri de surub in placa", () => {
    const p = calculeazaPiesa("clema", { diamTeava: 22, latime: 12, perete: 3, diamSurub: 4 }, "PLA");
    expect(masura(p, "diamTeava").final).toBeCloseTo(22 + 2 * JOC.PLA.presare, 6);
    expect(p.corpuri.filter((c) => c.gaura && c.culcat)).toHaveLength(2);
  });

  it("adaptorul: capetele intra stramt, canalul = capatul mic minus doi pereti; canal prea mic -> avertizare", () => {
    const p = calculeazaPiesa("adaptor", { diam1: 12, diam2: 20, lungimeCapat: 15, perete: 2 }, "PLA");
    expect(masura(p, "diam1").final).toBeCloseTo(12 - 2 * JOC.PLA.presare, 6);
    expect(masura(p, "diam2").final).toBeCloseTo(20 - 2 * JOC.PLA.presare, 6);
    expect(masura(p, "canal").final).toBeCloseTo(12 - 2 * JOC.PLA.presare - 4, 6);
    expect(p.corpuri.find((c) => c.forma === "con")?.diamSus).toBeCloseTo(20 - 2 * JOC.PLA.presare, 6);
    const ingust = calculeazaPiesa("adaptor", { diam1: 4, diam2: 20, lungimeCapat: 15, perete: 2 }, "PLA");
    expect(ingust.avertizari).toContain("canalPreaMic");
  });

  it("o cota in afara limitelor e adusa in limite, una lipsa ia valoarea de pornire", () => {
    const p = calculeazaPiesa("bucsa", { diamAx: -5, lungime: Number.NaN }, "PLA");
    const cota = COTE.bucsa.find((c) => c.cheie === "diamAx")!;
    expect(masura(p, "diamAx").masurat).toBe(cota.min);
    expect(masura(p, "lungime").masurat).toBe(COTE.bucsa.find((c) => c.cheie === "lungime")!.implicit);
  });

  it("fiecare tip se calculeaza din valorile de pornire si are cel putin un corp plin", () => {
    for (const tip of TIPURI_PIESE) {
      const p = calculeazaPiesa(tip, valoriImplicite(tip), "PLA");
      expect(p.corpuri.some((c) => !c.gaura), tip).toBe(true);
    }
  });
});

describe("piesa ca forme ale editorului", () => {
  it("bucsa devine un grup: cilindrul plin si gaura", () => {
    const forma = construiestePiesa(calculeazaPiesa("bucsa", valoriImplicite("bucsa"), "PLA"), "Bucșă");
    expect(forma.name).toBe("Bucșă");
    expect(forma.groupedShapes).toHaveLength(2);
    expect(forma.groupedShapes!.filter((s) => s.hole)).toHaveLength(1);
    expect(forma.groupedShapes!.every((s) => s.kind === "cylinder")).toBe(true);
  });
});
