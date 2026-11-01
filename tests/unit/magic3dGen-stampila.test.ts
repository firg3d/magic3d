import type { ManifoldToplevel } from "manifold-3d";
import { strFromU8, unzipSync } from "fflate";
import { beforeAll, describe, expect, it } from "vitest";
import { PRESA } from "@/magic3d/apps/presa/config";
import { buildPresa, configureManifold as configPresa, type ParamPresa } from "@/magic3d/apps/presa/presa";
import { STAMPILA } from "@/magic3d/apps/stampila/config";
import { buildStampila, configureManifold as configStampila, type ParamStampila } from "@/magic3d/apps/stampila/stampila";
import { inArena } from "@/magic3d/core/geometry/arena";
import { codeazaContur, decodeazaContur } from "@/magic3d/core/geometry/conturImagine";
import { centroid } from "@/magic3d/core/geometry/forme2d";
import { presa } from "@/magic3d/generatoare/constructori/presa";
import { stampila } from "@/magic3d/generatoare/constructori/stampila";
import { PRESA_DEF } from "@/magic3d/generatoare/defs/presa";
import { STAMPILA_DEF } from "@/magic3d/generatoare/defs/stampila";
import { contextGenerat, proiectGenerat } from "@/magic3d/generatoare/export";
import { grupuriFonturi, type FontItem } from "@/magic3d/generatoare/fonturi";
import type { Parametri } from "@/magic3d/generatoare/tipuri";
import MANIFEST from "../../apps/web/public/magic3d/fonts/fonts-manifest.json";
import { font, fontExista, genereazaCu, limite, manifold, verificaPiese } from "./magic3dGenUtil";

/*
 * Stampila si presa de hartie, pe date proprii: imaginile sunt contururi desenate aici (un "L",
 * un patrat cu o linie subtire), nu fisiere. Oglindirea, jocul matritelor si balamaua se masoara
 * pe geometrie, nu pe diagnosticul raportat.
 */

let mod: ManifoldToplevel;
beforeAll(async () => {
  mod = (await manifold()) as ManifoldToplevel;
});

const dreptunghi = (x0: number, y0: number, x1: number, y1: number) => [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
/** Un "L" (bara in stanga, talpa jos, Y in jos): asimetric si stanga-dreapta, si sus-jos. */
const L = codeazaContur(100, 100, [[{ x: 0, y: 0 }, { x: 25, y: 0 }, { x: 25, y: 75 }, { x: 100, y: 75 }, { x: 100, y: 100 }, { x: 0, y: 100 }]]);
/** Un patrat plin si, alaturi, o linie de 2 px pe o imagine inalta de 80 px. */
const CU_LINIE = codeazaContur(200, 100, [dreptunghi(10, 10, 90, 90), dreptunghi(100, 49, 190, 51)]);
const FARA_LINIE = codeazaContur(200, 100, [dreptunghi(10, 10, 90, 90), dreptunghi(100, 30, 190, 70)]);

const ps = (extra: Partial<Parametri> = {}): Parametri => ({ ...STAMPILA_DEF.implicit, ...extra });
const pp = (extra: Partial<Parametri> = {}): Parametri => ({ ...PRESA_DEF.implicit, ...extra });

function cfgStampila(extra: Partial<ParamStampila> = {}): ParamStampila {
  const i = STAMPILA_DEF.implicit;
  return {
    varianta: "cerneala", mod: "imagine", font: font(String(i.font)), text: String(i.text), imagine: L, forma: "rotunda",
    latime: 40, inaltime: 25, bordura: 0, relief: Number(i.reliefCerneala), oglindit: true, maner: "cilindru", marcaj: "model", ...extra,
  };
}

function cfgPresa(extra: Partial<ParamPresa> = {}): ParamPresa {
  const i = PRESA_DEF.implicit;
  return { corp: "cleste", mod: "text", font: font(String(i.font)), text: String(i.text), imagine: "", diametru: 36, bordura: 1, relief: 0.8, hartie: PRESA.hartie, ...extra };
}

/** Unde e masa unei sectiuni fata de mijlocul cutiei ei: semnul spune de ce parte e bara "L"-ului. */
function decalaj(cs: { bounds(): { min: number[]; max: number[] } }): [number, number] {
  const b = cs.bounds();
  const [cx, cy] = centroid(cs);
  return [cx - (b.min[0] + b.max[0]) / 2, cy - (b.min[1] + b.max[1]) / 2];
}

describe("Ștampilă personalizată", { timeout: 120_000 }, () => {
  it("are fontul implicit livrat, vizibil in lista panoului, si conturul imaginii se codeaza fara pierderi", () => {
    // Panoul arata un font pe familie; un implicit ascuns ar aparea in lista ca alt font.
    const vizibile = grupuriFonturi(MANIFEST as FontItem[]).flatMap((g) => g.items.map((f) => f.fisier));
    for (const def of [STAMPILA_DEF, PRESA_DEF]) {
      expect(fontExista(String(def.implicit.font))).toBe(true);
      expect(vizibile).toContain(def.implicit.font);
    }
    const c = decodeazaContur(L)!;
    expect(c.inele[0]).toHaveLength(6);
    expect(c.inele[0][3]).toEqual([100, 75]);
    expect(decodeazaContur("")).toBeNull();
    expect(decodeazaContur("c1;10;10;1,2,3")).toBeNull();
  });

  it("stampila de cerneala implicita: fata, maner si marcaj, fiecare intreg", () => {
    const r = genereazaCu(stampila, ps());
    verificaPiese(STAMPILA_DEF, r);
    expect(r.piese.map((x) => x.nume)).toEqual(["Fața ștampilei", "Mânerul ștampilei", "Marcaj"]);
    expect(r.avertizari).toEqual([]);
  });

  it("cerneala: fata e oglindita (relieful in sus), marcajul de pe varf si desenul raman drepte", () => {
    const r = inArena(() => {
      configStampila(mod);
      const rez = buildStampila(cfgStampila());
      const fata = rez.piese.find((x) => x.rol === "fata")!.manifold;
      const marcaj = rez.piese.find((x) => x.rol === "marcaj")!.manifold;
      const zm = marcaj.boundingBox();
      return {
        relief: decalaj(fata.slice(STAMPILA.grosimeFata + 0.5)),
        marcaj: decalaj(marcaj.slice((zm.min[2] + zm.max[2]) / 2)),
        desen: decalaj(rez.desen),
        oglindit: rez.diag.oglindit,
      };
    }, () => []);
    expect(r.oglindit).toBe(true);
    // Desenul (cum iese pe hartie): bara L-ului in stanga, talpa jos (Y in jos = pozitiv).
    expect(r.desen[0]).toBeLessThan(-1);
    expect(r.desen[1]).toBeGreaterThan(1);
    // Relieful fetei: oglindit stanga-dreapta, sus-jos neschimbat.
    expect(r.relief[0]).toBeGreaterThan(1);
    expect(r.relief[1]).toBeGreaterThan(1);
    // Marcajul de pe varf: ca desenul.
    expect(r.marcaj[0]).toBeLessThan(-0.5);
    expect(r.marcaj[1]).toBeGreaterThan(0.5);
  });

  it("lut fara oglindire: relieful fetei sta ca desenul; relieful e mai adanc", () => {
    const r = inArena(() => {
      configStampila(mod);
      const rez = buildStampila(cfgStampila({ varianta: "lut", oglindit: false, relief: 3.5 }));
      const fata = rez.piese.find((x) => x.rol === "fata")!.manifold;
      return { relief: decalaj(fata.slice(STAMPILA.grosimeFata + 1)), inaltime: fata.boundingBox().max[2] };
    }, () => []);
    expect(r.relief[0]).toBeLessThan(-1);
    expect(r.inaltime).toBeCloseTo(STAMPILA.grosimeFata + 3.5, 3);
  });

  it("logo cu o linie mai subtire decat minimul printabil -> avertizare; fara linia subtire, nu", () => {
    const cu = genereazaCu(stampila, ps({ continut: "imagine", imagine: CU_LINIE }));
    const fara = genereazaCu(stampila, ps({ continut: "imagine", imagine: FARA_LINIE }));
    expect(cu.avertizari.some((a) => a.includes(`${STAMPILA.liniaMin} mm`))).toBe(true);
    expect(fara.avertizari).toEqual([]);
  });

  it("textul implicit (font gros) nu are linii prea subtiri; forma dupa contur urmeaza desenul", () => {
    const r = inArena(() => {
      configStampila(mod);
      const contur = buildStampila(cfgStampila({ mod: "text", forma: "contur", latime: 60, inaltime: 20, bordura: 1 }));
      const drept = buildStampila(cfgStampila({ mod: "text", forma: "dreptunghi", latime: 60, inaltime: 20, bordura: 1 }));
      const aria = (x: typeof contur) => x.piese[0].manifold.slice(0.5).area();
      return { subtire: contur.diag.ariaSubtire, contur: aria(contur), drept: aria(drept) };
    }, () => []);
    expect(r.subtire).toBe(0);
    expect(r.contur).toBeLessThan(r.drept * 0.95);
  });

  it.each(["ciuperca", "cilindru", "bloc"])("manerul %s sta pe talpa si are marcajul pe varf", (maner) => {
    const r = genereazaCu(stampila, ps({ maner }));
    verificaPiese(STAMPILA_DEF, r);
    const [, m, marcaj] = r.piese.map(limite);
    // Scena are Y in sus: talpa la 0, marcajul deasupra varfului.
    expect(m.minY).toBeCloseTo(0, 3);
    expect(marcaj.minY).toBeCloseTo(m.maxY, 2);
  });

  it("3MF: la cerneala fata si manerul pe placi separate; la lut pe aceeasi placa", () => {
    const placi = (p: Parametri) => {
      const r = genereazaCu(stampila, p);
      const fisiere = unzipSync(proiectGenerat(r.piese, STAMPILA_DEF, p));
      const cfg = strFromU8(fisiere["Metadata/model_settings.config"]);
      return { placi: (cfg.match(/<plate>/g) ?? []).length, obiecte: (cfg.match(/<object /g) ?? []).length, note: strFromU8(fisiere["Metadata/model_settings.config"]).length > 0 };
    };
    expect(placi(ps())).toMatchObject({ placi: 2, obiecte: 2 });
    expect(placi(ps({ varianta: "lut" }))).toMatchObject({ placi: 1, obiecte: 2 });
  });
});

describe("Presă pentru hârtie (embosser)", { timeout: 180_000 }, () => {
  it.each(["cleste", "placi"])("%s: pozitivul si negativul, intregi, fara avertizari la textul implicit", (corp) => {
    const r = genereazaCu(presa, pp({ corp }));
    verificaPiese(PRESA_DEF, r);
    expect(r.piese).toHaveLength(2);
    expect(r.avertizari).toEqual([]);
  });

  it.each(["cleste", "placi"] as const)("%s: inchis, negativul cuprinde pozitivul cu jocul corect pe toata suprafata (sectiuni)", (corp) => {
    const r = inArena(() => {
      configPresa(mod);
      const { CrossSection } = mod;
      const rez = buildPresa(cfgPresa({ corp }));
      const poz = rez.piese.find((x) => x.rol === "pozitiv")!.manifold;
      const neg = rez.inchide(rez.piese.find((x) => x.rol === "negativ")!.manifold);
      const joc = rez.diag.joc;
      const h = 0.8;
      const P = rez.emblema.translate(rez.centru);
      const zona = CrossSection.circle(36 / 2 + PRESA.marginePernuta - 0.5, 96).translate(rez.centru);
      const s = rez.zFata;
      const masuri: Record<string, number>[] = [];
      // In relief (unde negativul a coborat peste hartie), in locas deasupra reliefului si la tavanul lui.
      for (const z of [s + PRESA.hartie + 0.1, s + h - 0.1, s + h + joc - 0.04]) {
        const N = neg.slice(z).intersect(zona);
        const locas = zona.subtract(N);
        const relief = z < s + h ? poz.slice(z).intersect(zona) : CrossSection.square([0, 0]);
        masuri.push({
          // nimic din negativ mai aproape de emblema decat jocul
          atinge: P.offset(joc - 0.03, "Round").intersect(N).area(),
          // locasul nu e mai larg decat emblema + joc
          larg: locas.subtract(P.offset(joc + 0.03, "Round")).area(),
          locas: locas.area(),
          // relieful pozitivului e emblema
          relief: z < s + h ? relief.subtract(P).area() + P.subtract(relief).area() : 0,
        });
      }
      const tavan = zona.subtract(neg.slice(s + h + joc + 0.04).intersect(zona)).area();
      return { masuri, tavan, ciocnire: poz.intersect(neg).volume() };
    }, () => []);
    for (const m of r.masuri) {
      expect(m.atinge).toBeLessThan(0.05);
      expect(m.larg).toBeLessThan(0.05);
      expect(m.locas).toBeGreaterThan(10);
      expect(m.relief).toBeLessThan(0.5);
    }
    expect(r.tavan).toBeLessThan(0.05);
    expect(r.ciocnire).toBeLessThan(0.001);
  });

  it("cleste: balamaua se roteste libera de la deschis la inchis (fara ciocniri la niciun unghi)", () => {
    const ciocniri = inArena(() => {
      configPresa(mod);
      const rez = buildPresa(cfgPresa());
      const a = rez.piese.find((x) => x.rol === "pozitiv")!.manifold;
      const b = rez.piese.find((x) => x.rol === "negativ")!.manifold;
      return [0, 30, 60, 90, 120, 150, 180].map((u) => a.intersect(b.translate([0, 0, -rez.ax]).rotate([u, 0, 0]).translate([0, 0, rez.ax])).volume());
    }, () => []);
    for (const v of ciocniri) expect(v).toBeLessThan(0.001);
  });

  it("emblema cu detalii mai fine decat ia hartia -> avertizare", () => {
    const r = genereazaCu(presa, pp({ continut: "imagine", imagine: CU_LINIE }));
    expect(r.avertizari.some((a) => a.includes(`${PRESA.detaliuMin} mm`))).toBe(true);
  });

  it("3MF: clestele e un obiect din doua parti pe o placa; oferta poarta parametrii, fara conturul imaginii", () => {
    const p = pp({ continut: "ambele", imagine: L });
    const r = genereazaCu(presa, p);
    const cfg = strFromU8(unzipSync(proiectGenerat(r.piese, PRESA_DEF, p))["Metadata/model_settings.config"]);
    expect((cfg.match(/<plate>/g) ?? []).length).toBe(1);
    expect((cfg.match(/<object /g) ?? []).length).toBe(1);
    expect((cfg.match(/<part /g) ?? []).length).toBe(2);
    const oferta = contextGenerat(r.piese, PRESA_DEF, p);
    expect(oferta.firma).toBe(true);
    expect(oferta.detalii).toContain("Ex Libris");
    expect(oferta.detalii).not.toContain("c1;");
  });
});
