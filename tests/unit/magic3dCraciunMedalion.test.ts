import { strFromU8, unzipSync } from "fflate";
import { beforeAll, describe, expect, it } from "vitest";
import { inArena } from "@/magic3d/core/geometry/arena";
import { FONT_MEDALION, FONTURI_CRACIUN, MEDALION } from "@/magic3d/apps/craciun/config";
import { buildMedalion, configureManifold, type ParamMedalion } from "@/magic3d/apps/craciun/medalion";
import { MEDALION_BANDA_DEF } from "@/magic3d/generatoare/defs/medalion-banda";
import { proiectGenerat } from "@/magic3d/generatoare/export";
import type { PiesaGenerata } from "@/magic3d/generatoare/tipuri";
import { font, genereaza, manifold } from "./magic3dGenUtil";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mod: any;
beforeAll(async () => {
  mod = await manifold();
  configureManifold(mod);
}, 60_000);

const BAZA: Omit<ParamMedalion, "font" | "text"> = {
  forma: "cerc", latime: MEDALION.latime, latimeRama: MEDALION.latimeRama, grosimeRama: MEDALION.grosimeRama, fundal: "plin",
  latimeBanda: MEDALION.latimeBanda, inclinare: 0, capete: true, decor: "amestec", densitate: 3,
};
const NUME = ["Ana", "Ion", "Ștefănuț", "Alexandra-Maria", "Țuțu", "Ăîâ", "Maria", "Bogdan", "Ilinca", "Constantin"];
const TOATE_FONTURILE = [...FONTURI_CRACIUN.script, ...FONTURI_CRACIUN.rotunjite, ...FONTURI_CRACIUN.bloc];

describe("medalion cu banda", () => {
  it("pentru 10 nume si mai multe variante: numele sta pe banda, in interiorul ramei, iar decorul nu atinge numele", () => {
    const f = font(FONT_MEDALION);
    const variante: Array<Partial<ParamMedalion>> = [{}, { forma: "oval", inclinare: 15 }, { fundal: "decupat", capete: false, decor: "brazi" }, { inclinare: -20, decor: "fulgi" }];
    for (const v of variante) for (const text of NUME) {
      inArena(() => {
        const r = buildMedalion({ ...BAZA, ...v, font: f, text });
        const { banda, interior, text: nume, decor } = r.plan;
        const eticheta = `${JSON.stringify(v)} ${text}`;
        expect(nume.area(), eticheta).toBeGreaterThan(5);
        expect(nume.subtract(banda).area(), eticheta).toBeLessThan(0.01);
        expect(nume.subtract(interior).area(), eticheta).toBeLessThan(0.01);
        expect(decor.intersect(nume.offset(MEDALION.distantaText - 0.05, "Round")).area(), eticheta).toBeLessThan(0.01);
        // decorul sta in interior, nu peste banda
        expect(decor.subtract(interior).area(), eticheta).toBeLessThan(0.01);
        expect(decor.intersect(banda).area(), eticheta).toBeLessThan(0.01);
        return [];
      }, () => []);
    }
  }, 240_000);

  it("banda traverseaza rama dintr-o parte in alta; capetele pliate ies din rama si sunt crestate", () => {
    inArena(() => {
      const f = font(FONT_MEDALION);
      const fara = buildMedalion({ ...BAZA, capete: false, font: f, text: "Ana" }).plan;
      const R = MEDALION.latime / 2;
      const bf = fara.banda.bounds();
      expect(bf.min[0]).toBeCloseTo(-R, 0);
      expect(bf.max[0]).toBeCloseTo(R, 0);
      // fara capete nu iese din disc
      expect(fara.banda.subtract(fara.contur).area()).toBeLessThan(0.01);
      const cu = buildMedalion({ ...BAZA, capete: true, font: f, text: "Ana" }).plan;
      const afara = cu.banda.subtract(cu.contur);
      const capete = afara.decompose().filter((c: { area(): number }) => c.area() > 1);
      expect(capete).toHaveLength(2);
      const bc = cu.banda.bounds();
      expect(bc.max[0]).toBeGreaterThan(R + 0.9 * MEDALION.capat * MEDALION.latimeBanda);
      expect(bc.min[0]).toBeLessThan(-R - 0.9 * MEDALION.capat * MEDALION.latimeBanda);
      // crestatura: pe axa capatului, varful e retras fata de colturi
      const w = MEDALION.latimeBanda, cad = MEDALION.cadereCapat * w;
      const fasie = (y: number) => cu.banda.intersect(mod.CrossSection.square([4 * R, 0.2]).translate([0, y - 0.1])).bounds().max[0];
      expect(fasie(cad)).toBeLessThan(fasie(cad - w / 2 + 0.5) - 0.8 * MEDALION.crestatura * w);
      return [];
    }, () => []);
  }, 60_000);

  it("inclinarea pozitiva ridica banda spre dreapta (Y in jos: capatul drept mai sus)", () => {
    inArena(() => {
      const r = buildMedalion({ ...BAZA, capete: false, inclinare: 20, font: font(FONT_MEDALION), text: "Ana" });
      const { banda } = r.plan;
      const y = (x: number) => { const b = banda.intersect(mod.CrossSection.square([0.4, 200]).translate([x - 0.2, -100])).bounds(); return (b.min[1] + b.max[1]) / 2; };
      expect(y(20)).toBeLessThan(y(-20) - 10);
      return [];
    }, () => []);
  }, 60_000);

  it("fundal decupat: rama, banda si decorul raman o singura piesa (fiecare element sta pe banda sau pe rama)", () => {
    const f = font(FONT_MEDALION);
    for (const decor of ["amestec", "fulgi", "brazi", "oameni"] as const) for (const text of ["Ana", "Ștefănuț", "Alexandra-Maria"]) {
      const d = inArena(() => buildMedalion({ ...BAZA, fundal: "decupat", decor, font: f, text }).diag, () => []);
      expect(d.bucati, `${decor} ${text}`).toBe(1);
      expect(d.decorPus, `${decor} ${text}`).toBeGreaterThan(0);
    }
  }, 240_000);

  it("decorul e simetric fata de axa verticala cand banda e orizontala", () => {
    inArena(() => {
      const r = buildMedalion({ ...BAZA, font: font(FONT_MEDALION), text: "" });
      const { decor } = r.plan;
      expect(r.diag.decorPus).toBe(6);
      expect(decor.subtract(decor.mirror([1, 0])).area() / decor.area()).toBeLessThan(0.01);
      return [];
    }, () => []);
  }, 60_000);

  it("numele se citeste normal: de la stanga la dreapta, cu susul in sus", () => {
    const r = inArena(() => {
      const t = buildMedalion({ ...BAZA, decor: "fara", font: font(FONTURI_CRACIUN.bloc[0]), text: "L" });
      const b = t.plan.text.bounds();
      const sfert = (x0: number, x1: number, y0: number, y1: number) => t.plan.text.intersect(mod.CrossSection.square([(x1 - x0) * (b.max[0] - b.min[0]), (y1 - y0) * (b.max[1] - b.min[1])]).translate([b.min[0] + x0 * (b.max[0] - b.min[0]), b.min[1] + y0 * (b.max[1] - b.min[1])])).area();
      return { stangaSus: sfert(0, 0.5, 0, 0.5), dreaptaSus: sfert(0.5, 1, 0, 0.5), dreaptaJos: sfert(0.5, 1, 0.5, 1) };
    }, () => []);
    expect(r.stangaSus).toBeGreaterThan(5 * r.dreaptaSus);
    expect(r.dreaptaJos).toBeGreaterThan(5 * r.dreaptaSus);
  }, 60_000);

  it("diacriticele ies complete pe toate fonturile din lista; liniile fontului implicit trec de minimul printabil", () => {
    for (const fisier of TOATE_FONTURILE) {
      for (const text of ["Ștefănuț", "Țuțu", "Ăîâ"]) {
        const d = inArena(() => buildMedalion({ ...BAZA, decor: "fara", font: font(fisier), text }).diag, () => []);
        expect(d.glifeLipsa, `${fisier} ${text}`).toEqual([]);
      }
    }
    for (const text of ["Ana", "Ștefănuț", "Alexandra-Maria"]) {
      const d = inArena(() => buildMedalion({ ...BAZA, decor: "fara", font: font(FONT_MEDALION), text }).diag, () => []);
      expect(d.subtire, text).toBeLessThanOrEqual(MEDALION.pierdereLinieMax);
      expect(d.nuIncape, text).toBe(false);
    }
  }, 240_000);

  it("piesele: corpul in culoarea discului de la placa; banda, numele si decorul placi subtiri deasupra (schimbarile de filament doar sus)", () => {
    const p = { ...MEDALION_BANDA_DEF.implicit, text: "Ioana", culoareDecor: "#2f7d4f" };
    const r = genereaza("medalion-banda", p);
    const inalt = (q: Float32Array) => { let mn = Infinity, mx = -Infinity; for (let i = 1; i < q.length; i += 3) { mn = Math.min(mn, q[i]); mx = Math.max(mx, q[i]); } return [mn, mx]; };
    const rol = (r2: string) => r.piese.find((x) => x.nume.startsWith(r2))!;
    const c = MEDALION.grosimeCuloare;
    expect(inalt(rol("Disc").positions)).toEqual([expect.closeTo(0, 3), expect.closeTo(MEDALION.grosimeRama, 3)]);
    expect(inalt(rol("Bandă").positions)).toEqual([expect.closeTo(MEDALION.grosimeRama - c, 3), expect.closeTo(MEDALION.grosimeRama, 3)]);
    expect(inalt(rol("Nume").positions)).toEqual([expect.closeTo(MEDALION.grosimeRama - c, 3), expect.closeTo(MEDALION.grosimeRama + MEDALION.textPeste, 3)]);
    expect(inalt(rol("Decor").positions)).toEqual([expect.closeTo(MEDALION.inaltimeDecor - c, 3), expect.closeTo(MEDALION.inaltimeDecor, 3)]);
    // sub orice placa colorata, corpul nu lasa gol: piesele colorate incep unde se termina corpul
    for (const x of r.piese.filter((q) => q.culoare !== p.culoareDisc)) expect(inalt(x.positions)[0], x.nume).toBeGreaterThanOrEqual(MEDALION.inaltimeDecor - c - 1e-3);
    const fisiere = unzipSync(proiectGenerat(r.piese, MEDALION_BANDA_DEF, p));
    const cfg = JSON.parse(strFromU8(fisiere["Metadata/project_settings.config"])) as Record<string, unknown>;
    expect(cfg.filament_colour).toEqual(["#FFFFFF", "#BB3D43", "#2F7D4F"]);
    const setari = strFromU8(fisiere["Metadata/model_settings.config"]);
    expect(new Set([...setari.matchAll(/<part id="\d+" subtype="normal_part">[\s\S]*?key="extruder" value="(\d)"/g)].map((m) => m[1]))).toEqual(new Set(["1", "2", "3"]));
    expect(setari).toContain('key="sparse_infill_pattern" value="lightning"');
  }, 60_000);

  it("in 3MF fiecare parte e o plasa inchisa: fiecare muchie are exact doua fete (altfel Bambu o repara si o semnaleaza)", () => {
    const variante = [{}, { fundal: "decupat", decor: "brazi" }, { forma: "oval", inclinare: 12, decor: "fulgi" }, { decor: "oameni", densitate: 2 }, { capete: false, inclinare: -25 }];
    for (const v of variante) for (const text of ["Ana", "Ștefănuț", "Alexandra-Maria"]) {
      const p = { ...MEDALION_BANDA_DEF.implicit, text, ...v };
      const fisiere = unzipSync(proiectGenerat(genereaza("medalion-banda", p).piese, MEDALION_BANDA_DEF, p));
      const model = strFromU8(Object.entries(fisiere).find(([k]) => k.startsWith("3D/Objects/"))![1]);
      for (const o of model.matchAll(/<object id="(\d+)"[^>]*>([\s\S]*?)<\/object>/g)) {
        const muchii = new Map<string, number>();
        for (const t of o[2].matchAll(/<triangle v1="(\d+)" v2="(\d+)" v3="(\d+)"/g)) {
          const [a, b, c] = t.slice(1).map(Number);
          for (const [x, y] of [[a, b], [b, c], [c, a]]) { const k = x < y ? `${x},${y}` : `${y},${x}`; muchii.set(k, (muchii.get(k) ?? 0) + 1); }
        }
        expect([...muchii.values()].filter((n) => n !== 2).length, `${JSON.stringify(v)} ${text} obiect ${o[1]}`).toBe(0);
      }
    }
  }, 240_000);

  it("pachet familie: 12 nume -> 12 medalioane pe placi, fara suprapuneri si in pat", () => {
    const LISTA = ["Ana", "Mihai", "Ștefănuț", "Ioana", "Radu", "Elena", "Matei", "Sofia", "Andrei", "Maria", "Luca", "Alexandra-Maria"];
    const p = { ...MEDALION_BANDA_DEF.implicit, lista: LISTA.join("\n"), pat: "256" };
    const r = genereaza("medalion-banda", p);
    const cutie = (piese: PiesaGenerata[]) => {
      const c = { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity };
      for (const q of piese) for (let i = 0; i < q.positions.length; i += 3) {
        c.x0 = Math.min(c.x0, q.positions[i]); c.x1 = Math.max(c.x1, q.positions[i]);
        c.z0 = Math.min(c.z0, q.positions[i + 2]); c.z1 = Math.max(c.z1, q.positions[i + 2]);
      }
      return c;
    };
    const obiecte = new Map<string, PiesaGenerata[]>();
    for (const x of r.piese) obiecte.set(`${x.print?.placa}|${x.print?.obiect}`, [...(obiecte.get(`${x.print?.placa}|${x.print?.obiect}`) ?? []), x]);
    expect(obiecte.size).toBe(12);
    const pePlaca = new Map<number, ReturnType<typeof cutie>[]>();
    for (const piese of obiecte.values()) pePlaca.set(piese[0].print!.placa!, [...(pePlaca.get(piese[0].print!.placa!) ?? []), cutie(piese)]);
    for (const [placa, cutii] of pePlaca) {
      expect(Math.max(...cutii.map((c) => c.x1)) - Math.min(...cutii.map((c) => c.x0)), `placa ${placa}`).toBeLessThanOrEqual(256);
      expect(Math.max(...cutii.map((c) => c.z1)) - Math.min(...cutii.map((c) => c.z0)), `placa ${placa}`).toBeLessThanOrEqual(256);
      for (let i = 0; i < cutii.length; i++) for (let j = i + 1; j < cutii.length; j++) {
        const a = cutii[i], b = cutii[j];
        expect(a.x1 <= b.x0 || b.x1 <= a.x0 || a.z1 <= b.z0 || b.z1 <= a.z0, `placa ${placa}: ${i} si ${j}`).toBe(true);
      }
    }
  }, 240_000);
});
