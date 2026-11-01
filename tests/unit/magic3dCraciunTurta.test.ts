import { readFileSync } from "node:fs";
import path from "node:path";
import { strFromU8, unzipSync } from "fflate";
import { beforeAll, describe, expect, it } from "vitest";
import { inArena } from "@/magic3d/core/geometry/arena";
import { FONTURI_CRACIUN, FORME_TURTA, NIVELURI_TURTA, TURTA } from "@/magic3d/apps/craciun/config";
import { buildTurta, configureManifold, type ParamTurta } from "@/magic3d/apps/craciun/turta";
import { TURTA_SVG } from "@/magic3d/apps/craciun/turtaSvg";
import { TURTA_DULCE_DEF } from "@/magic3d/generatoare/defs/turta-dulce";
import { proiectGenerat } from "@/magic3d/generatoare/export";
// @ts-expect-error scriptul e JavaScript simplu, fara tipuri
import { modulTurta, turtaDinSvg } from "../../scripts/magic3d-craciun-forme.mjs";
import { font, genereaza, manifold } from "./magic3dGenUtil";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mod: any;
beforeAll(async () => {
  mod = await manifold();
  configureManifold(mod);
}, 60_000);

const BAZA: Omit<ParamTurta, "forma" | "text" | "font" | "nivel"> = {
  marime: TURTA.marime, grosimeBaza: TURTA.grosimeBaza, distantaCordon: TURTA.distantaCordon, latimeCordon: TURTA.latimeCordon, inaltimeCordon: TURTA.inaltimeCordon,
};
const NUME = ["Ana", "Alexandra-Maria", "Ștefănuț", "Țuțu", "Ăîâ"];
const TOATE_FONTURILE = [...FONTURI_CRACIUN.rotunjite, ...FONTURI_CRACIUN.script, ...FONTURI_CRACIUN.bloc];

describe("turta dulce din sabloane", () => {
  for (const forma of FORME_TURTA) {
    it(`${forma}: numele sta doar in zona lui si nu atinge decorul; cordonul e la aceeasi distanta pe tot conturul`, () => {
      const f = font(FONTURI_CRACIUN.rotunjite[0]);
      for (const nivel of ["simplu", "bogat"] as const) for (const text of ["Ana", "Ștefănuț", "Alexandra-Maria"]) {
        inArena(() => {
          const r = buildTurta({ ...BAZA, forma, nivel, obraji: true, font: f, text });
          const { contur, zona, nume, decor, cordon } = r.plan;
          // Numele nu iese din zona.
          expect(nume.subtract(zona).area(), `${forma} ${nivel} ${text}`).toBeLessThan(0.05);
          // Nimic din decor nu atinge numele.
          for (const d of decor) expect(d.intersect(nume).area(), `${forma} ${nivel} ${text}`).toBeLessThan(0.001);
          // Cordonul: marginea lui de afara chiar la distanta setata, pe tot conturul (masurat numeric).
          expect(cordon.subtract(contur.offset(-(TURTA.distantaCordon - 0.05), "Round")).area()).toBeLessThan(0.01);
          const banda = contur.offset(-(TURTA.distantaCordon + 0.3), "Round").subtract(contur.offset(-(TURTA.distantaCordon + TURTA.latimeCordon - 0.3), "Round"));
          // doar unde forma e destul de lata pentru cordon (deschiderea conturului): in varfurile inguste nu se pune
          const lat = TURTA.distantaCordon + TURTA.latimeCordon + 1.5;
          const mare = banda.intersect(contur.offset(-lat, "Round").offset(lat, "Round"));
          const acoperit = cordon.intersect(mare).area() / mare.area();
          expect(acoperit, `${forma} acoperirea benzii cordonului`).toBeGreaterThan(0.8);
          return [];
        }, () => []);
      }
    }, 240_000);
  }

  it("silueta e simetrica fata de axa verticala; urechea e pe axa, deasupra capului", () => {
    inArena(() => {
      const r = buildTurta({ ...BAZA, forma: "om", nivel: "bogat", obraji: true, font: font(FONTURI_CRACIUN.rotunjite[0]), text: "" });
      const { forma } = r.plan;
      const b = forma.bounds();
      const cx = (b.min[0] + b.max[0]) / 2;
      expect(Math.abs(cx)).toBeLessThan(0.05);
      const oglinda = forma.mirror([1, 0]);
      expect(forma.subtract(oglinda).area() / forma.area()).toBeLessThan(0.002);
      // decorul ramas: oglindit peste el insusi
      const decor = mod.CrossSection.union(r.plan.decor);
      expect(decor.subtract(decor.mirror([1, 0])).area() / decor.area()).toBeLessThan(0.01);
      return [];
    }, () => []);
  }, 60_000);

  it("cordonul: continuu, latime constanta (±0,1 mm) pe tot traseul, la distanta setata; valurile stau la 1,5 mm de el", () => {
    inArena(() => {
      const r = buildTurta({ ...BAZA, forma: "om", nivel: "mediu", obraji: false, font: font(FONTURI_CRACIUN.rotunjite[0]), text: "Ioana" });
      const { cordon, contur } = r.plan;
      const w = TURTA.latimeCordon;
      // o singura bucata, cu golul ei: inel continuu
      expect(cordon.decompose().filter((c: { area(): number }) => c.area() > 1)).toHaveLength(1);
      // nicaieri mai lat decat w + 0,2: strans cu (w/2 + 0,1) dispare
      expect(cordon.offset(-(w / 2 + 0.1), "Round").area()).toBeLessThan(0.01);
      // nicaieri mai ingust decat w - 0,2: deschiderea cu (w/2 - 0,1) il pastreaza aproape intreg
      const deschis = cordon.offset(-(w / 2 - 0.1), "Round").offset(w / 2 - 0.1, "Round");
      expect(deschis.area() / cordon.area()).toBeGreaterThan(0.97);
      expect(cordon.subtract(contur.offset(-(TURTA.distantaCordon - 0.05), "Round")).area()).toBeLessThan(0.01);
      // liniile de decor (valuri) nu se apropie de cordon sub distanta ceruta
      for (const d of r.plan.decor) expect(d.intersect(cordon.offset(TURTA.distantaDecorCordon - 0.05, "Round")).area()).toBeLessThan(0.01);
      return [];
    }, () => []);
  }, 60_000);

  it("numele se citeste normal: de la stanga la dreapta, cu susul in sus (in plan si in fisierul 3MF)", () => {
    // "L": bara verticala in stanga, piciorul jos (Y in jos in plan; in 3MF, Y in sus).
    const r = inArena(() => {
      const t = buildTurta({ ...BAZA, forma: "om", nivel: "simplu", obraji: false, font: font(FONTURI_CRACIUN.bloc[0]), text: "L" });
      const b = t.plan.nume.bounds();
      const sfert = (x0: number, x1: number, y0: number, y1: number) => t.plan.nume.intersect(mod.CrossSection.square([(x1 - x0) * (b.max[0] - b.min[0]), (y1 - y0) * (b.max[1] - b.min[1])]).translate([b.min[0] + x0 * (b.max[0] - b.min[0]), b.min[1] + y0 * (b.max[1] - b.min[1])])).area();
      return { stangaSus: sfert(0, 0.5, 0, 0.5), dreaptaSus: sfert(0.5, 1, 0, 0.5), dreaptaJos: sfert(0.5, 1, 0.5, 1) };
    }, () => []);
    expect(r.stangaSus).toBeGreaterThan(5 * r.dreaptaSus);
    expect(r.dreaptaJos).toBeGreaterThan(5 * r.dreaptaSus);
    // In 3MF (Z in sus, privit de sus): piciorul lui L e la Y mic, bara la X mic.
    const p = { ...TURTA_DULCE_DEF.implicit, text: "L", font: FONTURI_CRACIUN.bloc[0], nivel: "simplu" };
    const fisiere = unzipSync(proiectGenerat(genereaza("turta-dulce", p).piese, TURTA_DULCE_DEF, p));
    const model = Object.entries(fisiere).find(([k]) => k.startsWith("3D/Objects/"))![1];
    const obiecte = [...strFromU8(model).matchAll(/<object id="(\d+)"[^>]*>([\s\S]*?)<\/object>/g)];
    const setari = strFromU8(fisiere["Metadata/model_settings.config"]);
    const nume = [...setari.matchAll(/<part id="(\d+)" subtype="normal_part">\s*<metadata key="name" value="([^"]*)"/g)].find((m) => /nume|name/i.test(m[2]))!;
    const vs = [...obiecte.find((o) => o[1] === nume[1])![2].matchAll(/<vertex x="([^"]+)" y="([^"]+)" z="([^"]+)"/g)].map((m) => [Number(m[1]), Number(m[2])]);
    const xs = vs.map((v) => v[0]), ys = vs.map((v) => v[1]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const inSfert = (fx: (x: number) => boolean, fy: (y: number) => boolean) => vs.filter(([x, y]) => fx(x) && fy(y)).length;
    const mijX = (x0 + x1) / 2, mijY = (y0 + y1) / 2;
    // sus-dreapta (x mare, y mare) e gol la "L" corect privit de sus
    expect(inSfert((x) => x > mijX + 0.1 * (x1 - x0), (y) => y > mijY + 0.1 * (y1 - y0))).toBe(0);
    expect(inSfert((x) => x < mijX, (y) => y > mijY)).toBeGreaterThan(0);
  }, 60_000);

  it("un cuvant nu se desparte pe doua randuri; doua randuri doar la spatiu sau cratima", () => {
    const f = font(FONTURI_CRACIUN.rotunjite[0]);
    const d1 = inArena(() => buildTurta({ ...BAZA, forma: "om", nivel: "simplu", obraji: false, font: f, text: "Ștefănuț" }).diag, () => []);
    expect(d1.randuri).toBe(1);
    const d2 = inArena(() => buildTurta({ ...BAZA, forma: "om", nivel: "simplu", obraji: false, font: f, text: "Alexandra-Maria" }).diag, () => []);
    expect(d2.randuri).toBe(2);
  }, 60_000);

  it("Ș si Ț au virgula dedesubt: glifele U+0218..U+021B exista si au o bucata sub linia de baza", () => {
    for (const fisier of TOATE_FONTURILE) {
      const f = font(fisier) as { charToGlyphIndex(c: string): number; getPath(t: string, x: number, y: number, s: number): { getBoundingBox(): { y2: number } } };
      for (const c of ["Ș", "ș", "Ț", "ț"]) {
        expect(f.charToGlyphIndex(c), `${fisier} ${c}`).toBeGreaterThan(0);
        // virgula coboara sub linia de baza (in opentype, Y in jos: y2 > 0), spre deosebire de litera fara ea
        const baza = { "Ș": "S", "ș": "s", "Ț": "T", "ț": "t" }[c]!;
        expect(f.getPath(c, 0, 0, 100).getBoundingBox().y2, `${fisier} ${c}`).toBeGreaterThan(f.getPath(baza, 0, 0, 100).getBoundingBox().y2 + 5);
      }
    }
  });

  it("diacriticele: Ștefănuț, Țuțu, Ăîâ ies complete pe toate fonturile din lista (fara glife lipsa)", () => {
    for (const fisier of TOATE_FONTURILE) {
      const f = font(fisier) as { charToGlyphIndex(c: string): number };
      for (const c of "ȘșȚțĂăÂâÎî") expect(f.charToGlyphIndex(c), `${fisier} ${c}`).toBeGreaterThan(0);
      for (const text of ["Ștefănuț", "Țuțu", "Ăîâ"]) {
        const d = inArena(() => buildTurta({ ...BAZA, forma: FORME_TURTA[0], nivel: "simplu", obraji: false, font: f, text }).diag, () => []);
        expect(d.glifeLipsa, `${fisier} ${text}`).toEqual([]);
      }
    }
  }, 240_000);

  it("toate ornamentele dintr-un set au aceeasi marime maxima (latura cea mai mare)", () => {
    const lista = ["Ana", "Ștefănuț", "Alexandra-Maria"];
    const p = { ...TURTA_DULCE_DEF.implicit, lista: lista.join("\n"), pat: "256" };
    const r = genereaza("turta-dulce", p);
    const pe = new Map<string, Float32Array[]>();
    for (const x of r.piese) pe.set(String(x.print?.obiect), [...(pe.get(String(x.print?.obiect)) ?? []), x.positions]);
    const laturi = [...pe.values()].map((lista2) => {
      const mn = [Infinity, Infinity], mx = [-Infinity, -Infinity];
      for (const q of lista2) for (let i = 0; i < q.length; i += 3) { mn[0] = Math.min(mn[0], q[i]); mx[0] = Math.max(mx[0], q[i]); mn[1] = Math.min(mn[1], q[i + 2]); mx[1] = Math.max(mx[1], q[i + 2]); }
      return Math.max(mx[0] - mn[0], mx[1] - mn[1]);
    });
    expect(laturi).toHaveLength(3);
    for (const l of laturi) expect(l).toBeCloseTo(TURTA.marime, 0);
  }, 120_000);

  it("piesele: biscuitul pe extruderul lui, fiecare element de glazura o parte pe glazura, petele pe al treilea; glazura sta pe biscuit", () => {
    const p = { ...TURTA_DULCE_DEF.implicit, text: "Ioana", nivel: "bogat", treiCulori: true, ochi: "alb", obraji: false };
    const r = genereaza("turta-dulce", p);
    expect(r.piese.filter((x) => x.culoare === p.culoareBaza)).toHaveLength(1);
    expect(r.piese.some((x) => x.culoare === p.culoareDetalii)).toBe(true);
    const minY = (q: Float32Array) => { let m = Infinity; for (let i = 1; i < q.length; i += 3) m = Math.min(m, q[i]); return m; };
    const maxY = (q: Float32Array) => { let m = -Infinity; for (let i = 1; i < q.length; i += 3) m = Math.max(m, q[i]); return m; };
    for (const x of r.piese.filter((q) => q.culoare !== p.culoareBaza)) {
      expect(minY(x.positions)).toBeCloseTo(TURTA.grosimeBaza, 3);
      expect(maxY(x.positions)).toBeCloseTo(TURTA.grosimeBaza + TURTA.inaltimeCordon, 3);
    }
    const setari = strFromU8(unzipSync(proiectGenerat(r.piese, TURTA_DULCE_DEF, p))["Metadata/model_settings.config"]);
    expect(new Set([...setari.matchAll(/<part id="\d+" subtype="normal_part">[\s\S]*?key="extruder" value="(\d)"/g)].map((m) => m[1]))).toEqual(new Set(["1", "2", "3"]));
  }, 60_000);

  it("sabloanele: turtaSvg.ts e generat din turta/*.svg si fiecare are biscuit, ureche cu gaura si zona numelui", () => {
    const dir = path.resolve(__dirname, "../../apps/web/src/magic3d/apps/craciun");
    expect(readFileSync(path.join(dir, "turtaSvg.ts"), "utf8")).toBe(modulTurta(turtaDinSvg(path.join(dir, "turta"))));
    for (const forma of FORME_TURTA) {
      const s = TURTA_SVG[forma];
      // agatarea: o gaura sau decupaje (la sac, prin bucla fundei)
      expect(s.base.length && (s.gaura.length || s.decupaje.length) && s.zonaNume.length, forma).toBeTruthy();
      // nivelurile sunt cumulative: bogat are cel putin cat mediu, mediu cat simplu, si bogat are decor
      const pana = (n: number) => s.decor.filter((d) => NIVELURI_TURTA.indexOf(d.nivel as (typeof NIVELURI_TURTA)[number]) <= n).length;
      expect(pana(2), forma).toBeGreaterThan(0);
      expect(pana(2) >= pana(1) && pana(1) >= pana(0), forma).toBe(true);
      for (const d of s.decor) expect(NIVELURI_TURTA, forma).toContain(d.nivel);
    }
  });
});
