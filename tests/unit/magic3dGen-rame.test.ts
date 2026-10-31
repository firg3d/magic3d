import { beforeAll, describe, expect, it } from "vitest";
import * as srcArticulat from "@/magic3d/apps/articulat/articulat";
import * as srcRame from "@/magic3d/apps/rame/rame";
import { inArena } from "@/magic3d/core/geometry/arena";
import { t } from "@/magic3d/core/i18n/index";
import { articulat } from "@/magic3d/generatoare/constructori/articulat";
import { rame } from "@/magic3d/generatoare/constructori/rame";
import { ALTO_MIN, ARTICULAT } from "@/magic3d/generatoare/defs/articulat";
import { LIMITE_RAME, RAME, TIPURI_RAMA } from "@/magic3d/generatoare/defs/rame";
import { font, fontExista, genereazaCu, limite, manifold, verificaPiese } from "./magic3dGenUtil";

let mod: unknown;
beforeAll(async () => {
  mod = await manifold();
}, 60_000);

describe("Rame Tematice in editor", () => {
  it("fontul implicit e livrat, iar limitele copiate in panou sunt cele din geometrie", () => {
    expect(fontExista(String(RAME.implicit.font))).toBe(true);
    const { RAZA_MIN, RAZA_MAX, FIR_MIN, FIR_MAX, INFIGERE_MIN, INFIGERE_MAX } = srcRame;
    expect(LIMITE_RAME).toEqual({ RAZA_MIN, RAZA_MAX, FIR_MIN, FIR_MAX, INFIGERE_MIN, INFIGERE_MAX });
    expect(TIPURI_RAMA).toEqual(srcRame.TIPURI_RAMA);
  });

  it("valorile implicite dau patru piese (cu aura), asamblate in picioare pe placa", () => {
    const r = genereazaCu(rame, RAME.implicit);
    verificaPiese(RAME, r);
    expect(r.piese).toHaveLength(4);
    const [baza, rama, text, aura] = r.piese.map(limite);
    // scena are Y in sus: talpa bazei pe placa, rama ridicata deasupra ei
    expect(baza.minY).toBeCloseTo(0, 3);
    expect(baza.maxY).toBeCloseTo(Number(RAME.implicit.inaltimeBaza), 3);
    expect(rama.maxY).toBeGreaterThan(Number(RAME.implicit.raza) * 1.5);
    expect(rama.minY).toBeGreaterThan(0);
    expect(rama.minY).toBeLessThan(baza.maxY); // piciorul intra in locas
    // numele sta pe fata ramei, in dreptul ei
    expect(text.minY).toBeGreaterThan(baza.maxY);
    expect(aura.maxY).toBeLessThan(rama.maxY);
    expect(r.avertizari.filter((a) => a.includes("bucăți"))).toEqual([]);
  });

  it("fara aura raman trei piese, ca in interfata veche", () => {
    const r = genereazaCu(rame, { ...RAME.implicit, latimeAura: 0 });
    verificaPiese(RAME, r);
    expect(r.piese).toHaveLength(3);
  });

  for (const tip of TIPURI_RAMA) {
    it(`construieste rama de tip ${tip}`, () => {
      const r = genereazaCu(rame, { ...RAME.implicit, tip });
      verificaPiese(RAME, r);
      expect(r.piese).toHaveLength(4);
      expect(r.piese[1].nume).toBe(t(`rame.tip_${tip}`));
    });
  }

  it("infigerea mai adanca decat baza se limiteaza, ca in onControl-ul vechi", () => {
    const r = genereazaCu(rame, { ...RAME.implicit, inaltimeBaza: 6, adancimeInfigere: 12 });
    verificaPiese(RAME, r);
    expect(limite(r.piese[0]).minY).toBeCloseTo(0, 3); // locasul nu strapunge talpa
  });
});

describe("Brelocuri Articulate in editor", () => {
  it("fontul implicit e livrat, iar ALTO_MIN e cel din geometrie", () => {
    expect(fontExista(String(ARTICULAT.implicit.font))).toBe(true);
    expect(ALTO_MIN).toBe(srcArticulat.ALTO_MIN);
  });

  it("valorile implicite dau un segment si o litera pentru fiecare caracter", () => {
    const r = genereazaCu(articulat, ARTICULAT.implicit);
    verificaPiese(ARTICULAT, r);
    const n = String(ARTICULAT.implicit.text).length;
    expect(r.piese).toHaveLength(2 * n);
    expect(r.piese.filter((p) => p.culoare === ARTICULAT.implicit.culoareBaza)).toHaveLength(n);
    expect(r.avertizari).toEqual([]);
    for (const p of r.piese) expect(limite(p).minY).toBeGreaterThan(-0.01); // nimic sub placa
  });

  it("literele gravate raman doar segmente", () => {
    const r = genereazaCu(articulat, { ...ARTICULAT.implicit, text: "ANA", alturaLitera: -1 });
    verificaPiese(ARTICULAT, r);
    expect(r.piese).toHaveLength(3);
  });

  it("segmentele vecine nu se ating: balamalele raman libere", () => {
    for (const p of [ARTICULAT.implicit, { ...ARTICULAT.implicit, linkUltim: true, alto: ALTO_MIN, ancho: 8, largo: 10 }]) {
      const r = genereazaCu(articulat, p);
      expect(r.avertizari).not.toContain(t("articulat.avertLipit"));
      const atingeri = inArena(() => {
        srcArticulat.configureManifold(mod);
        const b = srcArticulat.buildArticulat({ ...(p as never), text: String(p.text), font: font(String(p.font)) }).blocuri;
        const v: number[] = [];
        for (let i = 0; i < b.length - 1; i++) v.push(b[i].intersect(b[i + 1]).volume());
        return v;
      }, () => []);
      expect(atingeri).toHaveLength(String(p.text).length - 1);
      for (const v of atingeri) expect(v).toBeLessThan(1e-3);
    }
  });
});
