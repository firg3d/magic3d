import type { ManifoldToplevel } from "manifold-3d";
import { strFromU8, unzipSync } from "fflate";
import { beforeAll, describe, expect, it } from "vitest";
import { PRESA_LUT } from "@/magic3d/apps/presalut/config";
import { buildPresaLut, configureManifold as configPresaLut, type ParamPresaLut } from "@/magic3d/apps/presalut/presalut";
import { TAVA } from "@/magic3d/apps/tava/config";
import { buildTava, configureManifold as configTava, type ParamTava } from "@/magic3d/apps/tava/tava";
import { inArena } from "@/magic3d/core/geometry/arena";
import { codeazaHarta, codeazaModel, decodeazaHarta, decodeazaModel } from "@/magic3d/core/geometry/codare";
import { codeazaContur } from "@/magic3d/core/geometry/conturImagine";
import { centroid } from "@/magic3d/core/geometry/forme2d";
import { strangere } from "@/magic3d/core/geometry/matrita";
import { presalut } from "@/magic3d/generatoare/constructori/presalut";
import { tava } from "@/magic3d/generatoare/constructori/tava";
import { PRESA_LUT_DEF } from "@/magic3d/generatoare/defs/presalut";
import { TAVA_DEF } from "@/magic3d/generatoare/defs/tava";
import { proiectGenerat } from "@/magic3d/generatoare/export";
import type { Parametri } from "@/magic3d/generatoare/tipuri";
import { font, genereazaCu, manifold, verificaPiese } from "./magic3dGenUtil";

/*
 * Matrita tava, masterul pentru silicon si presa pentru lut/sapun, pe date proprii: formele
 * Magic3D, un "L" desenat aici, un cub si o ciuperca facute in test. Unghiul de scoatere, volumele
 * si inchiderea presei se masoara pe geometrie.
 */

let mod: ManifoldToplevel;
beforeAll(async () => {
  mod = (await manifold()) as ManifoldToplevel;
});

const L = codeazaContur(100, 100, [[{ x: 0, y: 0 }, { x: 25, y: 0 }, { x: 25, y: 75 }, { x: 100, y: 75 }, { x: 100, y: 100 }, { x: 0, y: 100 }]]);
const pt = (extra: Partial<Parametri> = {}): Parametri => ({ ...TAVA_DEF.implicit, ...extra });

function cfgTava(extra: Partial<ParamTava> = {}): ParamTava {
  return {
    mod: "tava", sursa: "forma", forma: "inima", imagine: "", harta: "", reliefPoza: false, inaltimeRelief: 1.5, model: "",
    latime: 40, adancime: 15, draft: 5, racordare: 0, randuri: 1, coloane: 1, distanta: 6, rama: 8, ...extra,
  };
}

/** Triunghiurile unui corp manifold, neindexate, ca dintr-un STL. */
function triunghiuri(m: { getMesh(): { vertProperties: Float32Array; triVerts: Uint32Array; numProp: number } }): Float32Array {
  const g = m.getMesh();
  const out = new Float32Array(g.triVerts.length * 3);
  g.triVerts.forEach((v, i) => out.set(g.vertProperties.subarray(v * g.numProp, v * g.numProp + 3), i * 3));
  return out;
}

/** Aria dreptunghiului cu colturi rotunjite (latura a, raza r), largit cu j. */
const arieDreptunghi = (a: number, r: number, j = 0) => a * a - (4 - Math.PI) * r * r + (4 * a - (8 - 2 * Math.PI) * r) * j + Math.PI * j * j;

function decalaj(cs: { bounds(): { min: number[]; max: number[] } }): [number, number] {
  const b = cs.bounds();
  const [cx, cy] = centroid(cs);
  return [cx - (b.min[0] + b.max[0]) / 2, cy - (b.min[1] + b.max[1]) / 2];
}

describe("Codarea datelor din parametri", () => {
  it("harta de gri si modelul STL se citesc inapoi", () => {
    const h = { latime: 3, inaltime: 2, gri: new Uint8Array([0, 50, 100, 150, 200, 255]) };
    expect(decodeazaHarta(codeazaHarta(h))).toEqual(h);
    expect(decodeazaHarta("g1;3;3;AAAA")).toBeNull();
    const tri = new Float32Array([0, 0, 0, 10, 0, 0, 0, 10, 0, 10, 0, 0, 10, 10, 0, 0, 10, 0]);
    const m = decodeazaModel(codeazaModel(tri, 10)!)!;
    expect(m.varfuri.length / 3).toBe(4);
    expect(m.triunghiuri.length).toBe(6);
    expect(Math.max(...m.varfuri)).toBeCloseTo(10, 3);
    expect(codeazaModel(tri, 1)).toBeNull();
  });
});

describe("Matriță tavă", { timeout: 180_000 }, () => {
  it("tava implicita: o piesa intreaga, cu notele de volum", () => {
    const r = genereazaCu(tava, pt());
    verificaPiese(TAVA_DEF, r);
    expect(r.piese).toHaveLength(1);
    expect(r.avertizari.some((a) => a.includes("ml"))).toBe(true);
  });

  it.each(["inima", "stea", "patrat"] as const)("%s: unghiul de scoatere e pe toti peretii cavitatii, la orice adancime", (forma) => {
    const r = inArena(() => {
      configTava(mod);
      const c = cfgTava({ forma });
      const rez = buildTava(c);
      const t = rez.piese[0].manifold;
      const H = t.boundingBox().max[2];
      const plin = t.slice(0.5);
      // Cavitatea e pozitivul rotit (y -> -y); conturul ei la deschidere:
      const C = rez.contur.mirror([0, 1]);
      const pas = Math.max(TAVA.pasDraft, c.adancime / TAVA.treapteMax);
      return [1, 4, 8, 12, 14.6].map((u) => {
        const gol = plin.subtract(t.slice(H - u));
        const d = strangere(u, c.adancime, c.draft, c.racordare);
        const dJos = strangere(Math.min(c.adancime, u + pas), c.adancime, c.draft, c.racordare);
        return {
          d,
          // golul nu iese din conturul strans cu unghiul la adancimea lui...
          iese: gol.subtract(C.offset(-d + 0.03, "Round")).area(),
          // ...si cuprinde conturul strans cu o treapta mai jos (unghiul e pe tot perimetrul, nu doar pe unii pereti)
          lipsa: C.offset(-dJos - 0.03, "Round").subtract(gol).area(),
          arie: gol.area(),
        };
      });
    }, () => []);
    for (const m of r) {
      expect(m.d).toBeGreaterThan(0);
      expect(m.iese).toBeLessThan(0.05);
      expect(m.lipsa).toBeLessThan(0.05);
    }
    for (let i = 1; i < r.length; i += 1) expect(r[i].arie).toBeLessThan(r[i - 1].arie);
  });

  it("forma din imagine: piesa turnata se citeste drept; cavitatea e ea rotita, nu oglindita", () => {
    const r = inArena(() => {
      configTava(mod);
      const rez = buildTava(cfgTava({ sursa: "imagine", imagine: L, draft: 0 }));
      const t = rez.piese[0].manifold;
      const H = t.boundingBox().max[2];
      return { piesa: decalaj(rez.pozitiv.slice(5)), cavitate: decalaj(t.slice(0.5).subtract(t.slice(H - 5))) };
    }, () => []);
    // Piesa: bara L-ului in stanga, talpa jos (Y in jos = pozitiv); cavitatea: aceeasi stanga, talpa intoarsa.
    expect(r.piesa[0]).toBeLessThan(-1);
    expect(r.piesa[1]).toBeGreaterThan(1);
    expect(r.cavitate[0]).toBeLessThan(-1);
    expect(r.cavitate[1]).toBeLessThan(-1);
  });

  it("relieful din poza adanceste fundul cavitatii (piesa iese in relief)", () => {
    const gri = new Uint8Array(16 * 16).map((_, i) => ((i % 16) * 255) / 15);
    const harta = codeazaHarta({ latime: 16, inaltime: 16, gri });
    const patrat = codeazaContur(100, 100, [[{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }]]);
    const r = inArena(() => {
      configTava(mod);
      const fara = buildTava(cfgTava({ sursa: "imagine", imagine: patrat, harta, draft: 0 }));
      const cu = buildTava(cfgTava({ sursa: "imagine", imagine: patrat, harta, reliefPoza: true, inaltimeRelief: 2, draft: 0 }));
      return { fara: fara.pozitiv.boundingBox().max[2], cu: cu.pozitiv.boundingBox().max[2], volum: [fara.diag.volumForma, cu.diag.volumForma] };
    }, () => []);
    expect(r.fara).toBeCloseTo(15, 3);
    expect(r.cu).toBeGreaterThan(16.8);
    expect(r.volum[1]).toBeGreaterThan(r.volum[0]);
  });

  it("master pentru silicon: volumul de silicon e corect pe un cilindru si pe un cub", () => {
    const r = inArena(() => {
      configTava(mod);
      const cilindru = buildTava(cfgTava({ mod: "master", forma: "cerc", latime: 20, adancime: 10, draft: 0 }));
      const cub = mod.Manifold.cube([20, 20, 20], true);
      const model = codeazaModel(triunghiuri(cub), TAVA.maxTriunghiuri)!;
      const dinCub = buildTava(cfgTava({ mod: "master", sursa: "model", model, latime: 20 }));
      return { cilindru: cilindru.diag, cub: dinCub.diag, piese: cilindru.piese.map((x) => x.rol) };
    }, () => []);
    const a = 20 + 2 * 8;
    const coloana = TAVA.soclu;
    const umplere = (h: number) => arieDreptunghi(a, TAVA.razaColt, TAVA.jocRama) * (coloana + h + TAVA.capacSilicon) - arieDreptunghi(a, TAVA.razaColt) * coloana;
    // Cercul formelor Magic3D e un poligon cu 96 de laturi.
    const disc = (96 / 2) * 100 * Math.sin((2 * Math.PI) / 96);
    expect(r.piese).toEqual(["master", "rama"]);
    expect(r.cilindru.volumForma).toBeCloseTo(disc * 10, 0);
    expect(Math.abs(r.cilindru.volumSilicon - (umplere(10) - disc * 10)) / r.cilindru.volumSilicon).toBeLessThan(0.003);
    expect(r.cub.volumForma).toBeCloseTo(8000, 0);
    expect(Math.abs(r.cub.volumSilicon - (umplere(20) - 8000)) / r.cub.volumSilicon).toBeLessThan(0.003);
  });

  it("model STL cu contrapanta -> avertizare; un con cu baza jos se scoate drept", () => {
    const modele = inArena(() => {
      const { Manifold } = mod;
      const ciuperca = Manifold.union([Manifold.cylinder(10, 5, 5, 48), Manifold.cylinder(4, 10, 10, 48).translate([0, 0, 10])]);
      const con = Manifold.cylinder(12, 10, 4, 48);
      return { ciuperca: codeazaModel(triunghiuri(ciuperca), TAVA.maxTriunghiuri)!, con: codeazaModel(triunghiuri(con), TAVA.maxTriunghiuri)! };
    }, () => []);
    const cu = genereazaCu(tava, pt({ sursa: "model", model: modele.ciuperca, randuri: 1, coloane: 2 }));
    const fara = genereazaCu(tava, pt({ sursa: "model", model: modele.con, randuri: 1, coloane: 2 }));
    expect(cu.avertizari.some((a) => a.includes("contrapante"))).toBe(true);
    expect(fara.avertizari.some((a) => a.includes("contrapante"))).toBe(false);
    verificaPiese(TAVA_DEF, fara);
  });

  it("fara imagine sau cu model lipsa: avertizare, nicio piesa", () => {
    expect(genereazaCu(tava, pt({ sursa: "imagine" })).avertizari[0]).toContain("imagine");
    expect(genereazaCu(tava, pt({ sursa: "model" })).piese).toHaveLength(0);
  });

  it("3MF: masterul pe o placa si rama pe a doua", () => {
    const p = pt({ mod: "master" });
    const r = genereazaCu(tava, p);
    const cfg = strFromU8(unzipSync(proiectGenerat(r.piese, TAVA_DEF, p))["Metadata/model_settings.config"]);
    expect((cfg.match(/<plate>/g) ?? []).length).toBe(2);
  });
});

describe("Presă pentru lut și săpun", { timeout: 180_000 }, () => {
  const pl = (extra: Partial<Parametri> = {}): Parametri => ({ ...PRESA_LUT_DEF.implicit, ...extra });
  function cfgLut(extra: Partial<ParamPresaLut> = {}): ParamPresaLut {
    return { sursa: "forma", forma: "patrat", imagine: "", latime: 60, adancime: 8, perete: 4, draft: 3, racordare: 1, font: font("Baloo2-800.ttf"), text: "Lavanda", ...extra };
  }

  it("doua jumatati intregi, pe aceeasi placa", () => {
    const r = genereazaCu(presalut, pl());
    verificaPiese(PRESA_LUT_DEF, r);
    expect(r.piese).toHaveLength(2);
    expect(r.avertizari.filter((a) => !a.includes("ml"))).toEqual([]);
  });

  it.each(["patrat", "inima"] as const)("%s: inchisa, cavitatile se intalnesc la separatie, stifturile intra in gauri, canalul e in jur", (forma) => {
    const r = inArena(() => {
      configPresaLut(mod);
      const rez = buildPresaLut(cfgLut({ forma }));
      const jos = rez.piese.find((x) => x.rol === "jos")!.manifold;
      const sus = rez.inchide(rez.piese.find((x) => x.rol === "sus")!.manifold);
      const H = rez.separatie;
      // Sectiunile pline (fundul fiecarei jumatati), din care se scade sectiunea de langa separatie.
      const plinJos = jos.slice(1);
      const plinSus = sus.slice(sus.boundingBox().max[2] - 1);
      // Doar in dreptul conturului (in jos sunt si canalul de surplus si iesirile lui, la aceeasi adancime).
      const zona = rez.contur.offset(PRESA_LUT.golCanal / 2, "Round");
      const cavJos = plinJos.subtract(jos.slice(H - 0.3)).intersect(zona);
      const cavSus = plinSus.subtract(sus.slice(H + 0.3)).intersect(zona);
      const canal = plinJos.subtract(jos.slice(H - PRESA_LUT.adancimeCanal / 2));
      return {
        nepotrivire: cavJos.subtract(cavSus).area() + cavSus.subtract(cavJos).area(),
        cavitate: cavJos.area(),
        canal: canal.area(),
        ciocnire: jos.intersect(sus).volume(),
        stifturiSus: jos.boundingBox().max[2] - H,
        golSus: sus.boundingBox().min[2] - H,
      };
    }, () => []);
    expect(r.cavitate).toBeGreaterThan(1000);
    expect(r.nepotrivire).toBeLessThan(0.05 * r.cavitate);
    expect(r.canal).toBeGreaterThan(r.cavitate + 50);
    expect(r.ciocnire).toBeLessThan(0.001);
    expect(r.stifturiSus).toBeCloseTo(PRESA_LUT.inaltimeStift, 1);
    expect(r.golSus).toBeGreaterThan(-0.01);
  });

  it("textul de pe fata de sus e gravat in jumatatea de sus", () => {
    const v = inArena(() => {
      configPresaLut(mod);
      const sus = (text: string) => buildPresaLut(cfgLut({ text })).piese.find((x) => x.rol === "sus")!.manifold.volume();
      return [sus(""), sus("Lavanda")];
    }, () => []);
    expect(v[1]).toBeLessThan(v[0] - 20);
  });

  it("o singura fata: stampila mare de sapun (fata, maner, marcaj)", () => {
    const r = genereazaCu(presalut, pl({ tip: "fata" }));
    expect(r.piese).toHaveLength(3);
    for (const piesa of r.piese) expect(piesa.positions.length).toBeGreaterThan(0);
  });
});
