import { readFileSync } from "node:fs";
import path from "node:path";
import { strFromU8, unzipSync } from "fflate";
import { beforeAll, describe, expect, it } from "vitest";
import { inArena } from "@/magic3d/core/geometry/arena";
import { citesteCale } from "@/magic3d/core/geometry/svgCale";
import { FONTURI_CRACIUN, GLOB_NUME, inSezonCraciun } from "@/magic3d/apps/craciun/config";
import { FORME_SVG } from "@/magic3d/apps/craciun/formeSvg";
import { buildGlobNume, configureManifold, type ParamGlobNume } from "@/magic3d/apps/craciun/globNume";
import { GLOB_NUME_DEF } from "@/magic3d/generatoare/defs/glob-nume";
import { contextGenerat, proiectGenerat } from "@/magic3d/generatoare/export";
import type { PiesaGenerata } from "@/magic3d/generatoare/tipuri";
// @ts-expect-error scriptul e JavaScript simplu, fara tipuri
import { formeDinSvg, modulForme } from "../../scripts/magic3d-craciun-forme.mjs";
import { font, genereaza, manifold } from "./magic3dGenUtil";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mod: any;
beforeAll(async () => {
  mod = await manifold();
  configureManifold(mod);
}, 60_000);

const BAZA: Omit<ParamGlobNume, "text" | "font"> = { forma: "cerc", latime: 90, latimeRama: 5, grosime: 2.5, legatura: "auto", decor: "fulgi", densitate: 6, samanta: 1, fundal: false, decorCaRama: false };

/** Bucatile unei sectiuni, numarate din geometrie (fara aschii). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const bucati = (cs: any) => cs.decompose().filter((c: any) => c.area() > GLOB_NUME.aschieMax).length;

describe("glob cu nume decupat", () => {
  const NUME = ["Ana", "Ion", "Ștefănuț", "Alexandra-Maria", "Bogdan", "Țuțu", "Măriuca", "Ilinca", "Gheorghe", "Ioan-Ștefan"];

  for (const fisier of [FONTURI_CRACIUN.script[0], FONTURI_CRACIUN.rotunjite[0], FONTURI_CRACIUN.bloc[0]]) {
    it(`${fisier}: fiecare din 10 nume da o singura piesa, prinsa de rama la ambele capete, iar decorul nu atinge numele`, () => {
      const f = font(fisier);
      for (const text of NUME) {
        inArena(() => {
          const r = buildGlobNume({ ...BAZA, font: f, text });
          // Rama cu numele si legaturile lui, plus decorul (care intra sub rama): o singura bucata.
          expect(bucati(r.plan.rama.add(r.plan.decor)), text).toBe(1);
          // Numele atinge rama in stanga si in dreapta centrului (masurat din geometrie).
          const inel = r.plan.rama.subtract(r.plan.nume);
          const b = r.plan.rama.bounds();
          const cx = (b.min[0] + b.max[0]) / 2;
          const jumatate = (stanga: boolean) => mod.CrossSection.square([b.max[0] - b.min[0], b.max[1] - b.min[1] + 2]).translate([stanga ? cx - (b.max[0] - b.min[0]) : cx, b.min[1] - 1]);
          const contact = (stanga: boolean) => r.plan.nume.offset(0.05, "Round").intersect(inel).intersect(jumatate(stanga)).area();
          expect(contact(true), `${text} stanga`).toBeGreaterThan(0.2);
          expect(contact(false), `${text} dreapta`).toBeGreaterThan(0.2);
          // Decorul nu se apropie de nume mai mult decat distanta minima.
          expect(r.plan.decor.intersect(r.plan.nume.offset(GLOB_NUME.distantaDecor - 0.05, "Round")).area(), text).toBeLessThan(0.01);
          expect(r.diag.decorPus).toBeGreaterThan(0);
          return [];
        }, () => []);
      }
    }, 240_000);
  }

  it("toate formele de rama, cu si fara fundal: o singura piesa", () => {
    const f = font(FONTURI_CRACIUN.script[3]);
    for (const forma of ["cerc", "oval", "stea", "brad"] as const) {
      for (const fundal of [false, true]) {
        inArena(() => {
          const r = buildGlobNume({ ...BAZA, forma, fundal, font: f, text: "Elena" });
          expect(bucati(r.plan.rama.add(r.plan.decor)), `${forma} ${fundal}`).toBe(1);
          expect(r.piese.some((x) => x.rol === "fundal")).toBe(fundal);
          return [];
        }, () => []);
      }
    }
  }, 120_000);

  it("in 3MF, fiecare muchie are exact doua fete (fara colturi in care zonele se ating intr-un punct)", () => {
    // Masurat pe fisier: acolo varfurile cu aceeasi pozitie se unesc, deci un colt atins intr-un punct apare aici.
    const rele: string[] = [];
    for (const [text, extra] of [["Ana", {}], ["Ștefănuț", { fundal: true, culoareDecor: "#1d1f1e", decor: "amestec" }], ["Ioana", { forma: "stea", font: "Baloo2-700.ttf" }], ["MIHAI", { font: "BebasNeue-Regular.ttf", decor: "stele" }]] as const) {
      const p = { ...GLOB_NUME_DEF.implicit, text, ...extra };
      const fisiere = unzipSync(proiectGenerat(genereaza("glob-nume", p).piese, GLOB_NUME_DEF, p));
      for (const [nume, date] of Object.entries(fisiere).filter(([k]) => k.startsWith("3D/Objects/"))) {
        for (const m of strFromU8(date).matchAll(/<object id="(\d+)"[^>]*>([\s\S]*?)<\/object>/g)) {
          const muchii = new Map<string, number>();
          for (const t of m[2].matchAll(/<triangle v1="(\d+)" v2="(\d+)" v3="(\d+)"/g)) {
            const v = [Number(t[1]), Number(t[2]), Number(t[3])];
            for (let k = 0; k < 3; k++) { const a = v[k], b = v[(k + 1) % 3]; const cheie = a < b ? `${a},${b}` : `${b},${a}`; muchii.set(cheie, (muchii.get(cheie) ?? 0) + 1); }
          }
          const n = [...muchii.values()].filter((x) => x !== 2).length;
          if (n) rele.push(`${text} ${nume}#${m[1]}: ${n}`);
        }
      }
    }
    expect(rele).toEqual([]);
  }, 120_000);

  it("acelasi numar de model da acelasi decor, altul da altul", () => {
    const f = font(FONTURI_CRACIUN.script[0]);
    const arie = (samanta: number) => inArena(() => buildGlobNume({ ...BAZA, font: f, text: "Ana", samanta }).plan.decor.area(), () => []);
    expect(arie(7)).toBeCloseTo(arie(7), 6);
    expect(Math.abs(arie(7) - arie(8))).toBeGreaterThan(1);
  }, 60_000);

  it("liniile numelui trec de linia minima printabila la fonturile oferite", () => {
    for (const fisier of [...FONTURI_CRACIUN.script, ...FONTURI_CRACIUN.rotunjite, ...FONTURI_CRACIUN.bloc]) {
      const d = inArena(() => buildGlobNume({ ...BAZA, decor: "fara", font: font(fisier), text: "Maria" }).diag, () => []);
      expect(d.subtire, fisier).toBeLessThanOrEqual(GLOB_NUME.pierdereLinieMax);
    }
  }, 120_000);
});

describe("pachet familie", () => {
  const LISTA = ["Ana", "Mihai", "Ștefănuț", "Ioana", "Radu", "Elena", "Matei", "Sofia", "Andrei", "Maria", "Luca", "Alexandra-Maria"];

  /** Cutia unui grup de piese in scena (X, Z = adancimea), mm. */
  const cutie = (piese: PiesaGenerata[]) => {
    const c = { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity };
    for (const p of piese) for (let i = 0; i < p.positions.length; i += 3) {
      c.x0 = Math.min(c.x0, p.positions[i]); c.x1 = Math.max(c.x1, p.positions[i]);
      c.z0 = Math.min(c.z0, p.positions[i + 2]); c.z1 = Math.max(c.z1, p.positions[i + 2]);
    }
    return c;
  };

  for (const pat of ["180", "256"]) {
    it(`12 nume pe patul de ${pat}: 12 obiecte, fiecare pe placa lui, fara suprapuneri si in pat`, () => {
      const p = { ...GLOB_NUME_DEF.implicit, decor: "fara", lista: LISTA.join("\n"), pat };
      const r = genereaza("glob-nume", p);
      const obiecte = new Map<string, PiesaGenerata[]>();
      for (const x of r.piese) obiecte.set(`${x.print?.placa}|${x.print?.obiect}`, [...(obiecte.get(`${x.print?.placa}|${x.print?.obiect}`) ?? []), x]);
      expect(obiecte.size).toBe(12);
      for (const nume of LISTA) expect([...obiecte.keys()].some((k) => k.includes(`„${nume}”`)), nume).toBe(true);
      const latura = Number(pat);
      const pePlaca = new Map<number, ReturnType<typeof cutie>[]>();
      for (const piese of obiecte.values()) {
        const placa = piese[0].print!.placa!;
        pePlaca.set(placa, [...(pePlaca.get(placa) ?? []), cutie(piese)]);
      }
      for (const [placa, cutii] of pePlaca) {
        const x0 = Math.min(...cutii.map((c) => c.x0)), x1 = Math.max(...cutii.map((c) => c.x1));
        const z0 = Math.min(...cutii.map((c) => c.z0)), z1 = Math.max(...cutii.map((c) => c.z1));
        expect(x1 - x0, `placa ${placa}`).toBeLessThanOrEqual(latura);
        expect(z1 - z0, `placa ${placa}`).toBeLessThanOrEqual(latura);
        for (let i = 0; i < cutii.length; i++) for (let j = i + 1; j < cutii.length; j++) {
          const a = cutii[i], b = cutii[j];
          const separate = a.x1 <= b.x0 || b.x1 <= a.x0 || a.z1 <= b.z0 || b.z1 <= a.z0;
          expect(separate, `placa ${placa}: ${i} si ${j}`).toBe(true);
        }
      }
      if (pat === "256") expect(pePlaca.size).toBeLessThan(12);
    }, 240_000);
  }

  it("3MF-ul: obiectele pe placi, culorile pe extrudere, imprimanta dupa pat; oferta are numarul de bucati", () => {
    const p = { ...GLOB_NUME_DEF.implicit, lista: "Ana\nIon\nEla", pat: "256", fundal: true, culoareDecor: "#f5c518" };
    const r = genereaza("glob-nume", p);
    const fisiere = unzipSync(proiectGenerat(r.piese, GLOB_NUME_DEF, p));
    const cfg = JSON.parse(strFromU8(fisiere["Metadata/project_settings.config"])) as Record<string, unknown>;
    expect(cfg.printer_settings_id).toBe("Bambu Lab A1 0.4 nozzle");
    expect(cfg.filament_colour).toEqual(["#C8282E", "#F5C518", "#F4F4F1"]);
    const setari = strFromU8(fisiere["Metadata/model_settings.config"]);
    expect([...setari.matchAll(/<object id=/g)]).toHaveLength(3);
    // rama pe 1, decorul pe 2, fundalul pe 3, in fiecare obiect
    expect(new Set([...setari.matchAll(/key="extruder" value="(\d)"/g)].map((m) => m[1]))).toEqual(new Set(["1", "2", "3"]));
    expect(setari).toContain('key="sparse_infill_pattern" value="3dhoneycomb"');
    const detalii = contextGenerat(r.piese, GLOB_NUME_DEF, p).detalii ?? "";
    expect(detalii).toMatch(/^(Bucăți|Pieces): 3 · /);
    expect(detalii).toMatch(/: Ana, Ion, Ela( ·|$)/);
  }, 120_000);
});

describe("formele de decor (SVG proprii)", () => {
  it("formeSvg.ts e generat din forme/*.svg (node scripts/magic3d-craciun-forme.mjs)", () => {
    const dir = path.resolve(__dirname, "../../apps/web/src/magic3d/apps/craciun");
    expect(readFileSync(path.join(dir, "formeSvg.ts"), "utf8")).toBe(modulForme(formeDinSvg(path.join(dir, "forme"))));
    expect(Object.keys(FORME_SVG).sort()).toEqual(["brad", "fulg", "fulg-simplu", "steluta"]);
  });

  it("caile SVG: linii, curbe, relative si inchise", () => {
    const [a] = citesteCale("M 0 0 L 10 0 l 0 10 H 0 Z");
    expect(a.inchisa).toBe(true);
    expect(a.puncte).toEqual([[0, 0], [10, 0], [10, 10], [0, 10]]);
    const [c] = citesteCale("M0,0 C 0 10 10 10 10 0");
    expect(c.inchisa).toBe(false);
    expect(c.puncte.at(-1)).toEqual([10, 0]);
    expect(Math.max(...c.puncte.map((q) => q[1]))).toBeCloseTo(7.5, 1);
    expect(() => citesteCale("M 0 0 A 5 5 0 0 1 10 0")).toThrow();
  });
});

describe("sezonul si fonturile", () => {
  it("colectia apare intre 1 noiembrie si 6 ianuarie", () => {
    expect(inSezonCraciun(new Date(2026, 10, 1))).toBe(true);
    expect(inSezonCraciun(new Date(2026, 11, 24))).toBe(true);
    expect(inSezonCraciun(new Date(2027, 0, 6))).toBe(true);
    expect(inSezonCraciun(new Date(2027, 0, 7))).toBe(false);
    expect(inSezonCraciun(new Date(2026, 9, 31))).toBe(false);
    expect(inSezonCraciun(new Date(2026, 6, 15))).toBe(false);
  });

  it("fonturile oferite: minim 3 de mana, 2 rotunjite, 2 bloc, toate OFL si cu fisierul exact", () => {
    const dir = path.resolve(__dirname, "../../apps/web/public/magic3d/fonts");
    expect(FONTURI_CRACIUN.script.length).toBeGreaterThanOrEqual(3);
    expect(FONTURI_CRACIUN.rotunjite.length).toBeGreaterThanOrEqual(2);
    expect(FONTURI_CRACIUN.bloc.length).toBeGreaterThanOrEqual(2);
    const licente = readFileSync(path.join(dir, "LICENTE.md"), "utf8");
    const manifest = JSON.parse(readFileSync(path.join(dir, "fonts-manifest.json"), "utf8")) as Array<{ fisier: string; familie: string; lipsaDiacritice: string[] }>;
    for (const fisier of [...FONTURI_CRACIUN.script, ...FONTURI_CRACIUN.rotunjite, ...FONTURI_CRACIUN.bloc]) {
      const intrare = manifest.find((x) => x.fisier === fisier);
      expect(intrare, fisier).toBeDefined();
      expect(intrare!.lipsaDiacritice, fisier).toEqual([]);
      expect(licente).toMatch(new RegExp(`\\| ${intrare!.familie} \\| OFL-1\\.1 \\|`));
    }
  });
});
