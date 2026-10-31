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
});
