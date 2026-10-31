import { beforeAll, describe, expect, it } from "vitest";
import * as nucleu from "@/magic3d/core/geometry/cuvant";
import en from "@/magic3d/core/i18n/en.json";
import ro from "@/magic3d/core/i18n/ro.json";
import { cuvinte } from "@/magic3d/generatoare/constructori/cuvinte";
import { nume } from "@/magic3d/generatoare/constructori/nume";
import { CUVINTE } from "@/magic3d/generatoare/defs/cuvinte";
import { LIMITE_PIESA, NUME } from "@/magic3d/generatoare/defs/nume";
import type { GeneratorDef, Parametri } from "@/magic3d/generatoare/tipuri";
import { fontExista, genereazaCu, limite, manifold, verificaPiese } from "./magic3dGenUtil";

beforeAll(async () => {
  await manifold();
});

const cheieExista = (dict: unknown, cheie: string) =>
  cheie.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), dict) !== undefined;

function eticheteFolosite(def: GeneratorDef): string[] {
  const chei = [def.titlu];
  for (const p of def.parametri) {
    chei.push(typeof p.eticheta === "string" ? p.eticheta : p.eticheta(def.implicit));
    if (p.grup) chei.push(p.grup);
    if (p.tip === "alegere") chei.push(...p.optiuni.map((o) => o.eticheta));
  }
  return chei;
}

describe.each([
  { def: NUME, constructor: nume },
  { def: CUVINTE, constructor: cuvinte },
])("generatorul $def.id", ({ def, constructor }) => {
  const gen = (p: Parametri = {}) => genereazaCu(constructor, { ...def.implicit, ...p });

  it("are fontul implicit livrat, etichetele in ambele limbi si limitele din nucleu", () => {
    expect(fontExista(String(def.implicit.font))).toBe(true);
    for (const cheie of eticheteFolosite(def)) {
      expect(cheieExista(ro, cheie), `ro: ${cheie}`).toBe(true);
      expect(cheieExista(en, cheie), `en: ${cheie}`).toBe(true);
    }
    for (const [k, v] of Object.entries(LIMITE_PIESA)) expect(nucleu[k as keyof typeof nucleu], k).toBe(v);
    for (const p of def.parametri) expect(p.cheie in def.implicit, p.cheie).toBe(true);
  });

  it("implicit: corpul si rama, o singura bucata care sta pe masa, fara avertizari", () => {
    const r = gen();
    verificaPiese(def, r);
    expect(r.piese.map((p) => p.culoare)).toEqual([def.implicit.culoare, def.implicit.culoareContur]);
    expect(r.avertizari).toEqual([]);
    // culcat pe spate (orientarea de print): grosimea e inaltimea in scena
    const b = limite(r.piese[0]);
    expect(b.maxY - b.minY).toBeCloseTo(Number(def.implicit.grosime), 0);
  });

  it("contur fara: doar corpul; placa in spate: corp si placa", () => {
    const fara = gen({ contur: "fara" });
    verificaPiese(def, fara);
    expect(fara.piese).toHaveLength(1);
    const placa = gen({ contur: "placa" });
    verificaPiese(def, placa);
    expect(placa.piese).toHaveLength(2);
  });

  it("pe perete cu gaura strapunsa si capac: corp, contur si capace", () => {
    const r = gen({ modProdus: "perete", tipAgatare: "gaura", capac: true });
    verificaPiese(def, r);
    expect(r.piese).toHaveLength(3);
    expect(r.piese[2].culoare).toBe(def.implicit.culoareCapac);
    const cheie = gen({ modProdus: "perete", tipAgatare: "cheie" });
    verificaPiese(def, cheie);
    expect(cheie.piese).toHaveLength(2);
  });
});

describe("simbolurile din Cuvinte Decor", () => {
  it("un cuvant cu ♥ si ★ iese intreg, fara caractere fara sursa", () => {
    expect(String(CUVINTE.implicit.text)).toContain("♥");
    const r = genereazaCu(cuvinte, { ...CUVINTE.implicit, text: "♥ana★" });
    verificaPiese(CUVINTE, r);
    expect(r.piese).toHaveLength(2);
    expect(r.avertizari.join(" ")).not.toMatch(/glif|glyph/);
  });

  it("la Nume 3D, ♥ nu are glifa si se spune", () => {
    const r = genereazaCu(nume, { ...NUME.implicit, text: "ma♥ma" });
    expect(r.avertizari.some((a) => a.includes("♥"))).toBe(true);
  });
});
