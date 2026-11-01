import { strFromU8, unzipSync } from "fflate";
import { beforeAll, describe, expect, it } from "vitest";
import { inArena } from "@/magic3d/core/geometry/arena";
import { FONT_GLOB_MODELE, GLOB_MODELE } from "@/magic3d/apps/craciun/config";
import { buildGlobModele, configureManifold, type ModelGlob, type ParamGlobModele } from "@/magic3d/apps/craciun/globModele";
import { GLOB_MODELE_DEF } from "@/magic3d/generatoare/defs/glob-modele";
import { proiectGenerat } from "@/magic3d/generatoare/export";
import { font, genereaza, manifold } from "./magic3dGenUtil";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mod: any;
beforeAll(async () => {
  mod = await manifold();
  configureManifold(mod);
}, 60_000);

const MODELE: ModelGlob[] = ["nervuri", "rasucite", "spirala", "fante", "romburi", "hexagoane", "fatete"];
const BAZA: Omit<ParamGlobModele, "font" | "model" | "constructie"> = {
  diametru: GLOB_MODELE.diametru, perete: GLOB_MODELE.perete, numar: 16, adancime: GLOB_MODELE.adancime,
  rasucire: GLOB_MODELE.rasucire, ture: 1, latimeFanta: GLOB_MODELE.latimeFanta, text: "",
};

/** Plasele obiectelor din 3MF: varfuri si numarul muchiilor care nu au exact doua fete. */
function obiecte3mf(fisiere: Record<string, Uint8Array>) {
  // fiecare obiect al proiectului are fisierul lui in 3D/Objects
  const model = Object.entries(fisiere).filter(([k]) => k.startsWith("3D/Objects/")).map(([, v]) => strFromU8(v)).join("\n");
  return [...model.matchAll(/<object id="(\d+)"[^>]*>([\s\S]*?)<\/object>/g)].map((o) => {
    const v = [...o[2].matchAll(/<vertex x="([^"]+)" y="([^"]+)" z="([^"]+)"/g)].map((m) => [Number(m[1]), Number(m[2]), Number(m[3])]);
    const muchii = new Map<string, number>();
    for (const t of o[2].matchAll(/<triangle v1="(\d+)" v2="(\d+)" v3="(\d+)"/g)) {
      const [a, b, c] = t.slice(1).map(Number);
      for (const [x, y] of [[a, b], [b, c], [c, a]]) { const k = x < y ? `${x},${y}` : `${y},${x}`; muchii.set(k, (muchii.get(k) ?? 0) + 1); }
    }
    return { id: o[1], v, rele: [...muchii.values()].filter((n) => n !== 2).length };
  });
}

describe("globuri cu modele", () => {
  for (const constructie of ["jumatati", "vaza"] as const) {
    it(`${constructie}: fiecare model da plase inchise in 3MF, piese pe placa, in patul ales`, () => {
      for (const model of MODELE) {
        const p = { ...GLOB_MODELE_DEF.implicit, constructie, model, numar: 16 };
        const fisiere = unzipSync(proiectGenerat(genereaza("glob-modele", p).piese, GLOB_MODELE_DEF, p));
        const obiecte = obiecte3mf(fisiere);
        expect(obiecte.length, `${model}`).toBe(constructie === "vaza" ? 2 : 4);
        for (const o of obiecte) {
          expect(o.rele, `${constructie} ${model} obiect ${o.id}`).toBe(0);
          expect(o.v.reduce((m, q) => Math.min(m, q[2]), Infinity), `${model} obiect ${o.id}`).toBeCloseTo(0, 3);
        }
      }
    }, 240_000);
  }

  it("peretele nu se subtiaza: suprafata exterioara nu intra sub profilul neted (modelul iese in afara, fatetele sunt circumscrise)", () => {
    const f = font(FONT_GLOB_MODELE);
    for (const model of MODELE) {
      inArena(() => {
        const r = buildGlobModele({ ...BAZA, model, constructie: "jumatati", font: f });
        for (const z of [-25, -15, -5, 0, 5, 15, 25]) {
          const raze = (r.plan.exterior.slice(z).toPolygons() as number[][][]).flat().map(([x, y]) => Math.hypot(x, y));
          expect(Math.min(...raze), `${model} z=${z}`).toBeGreaterThanOrEqual(r.plan.profil(z) - 0.05);
        }
        return [];
      }, () => []);
    }
  }, 240_000);

  it("consola: globul din jumatati, cu fiecare model, ramane sub limita (fiecare jumatate pe taietura)", () => {
    const f = font(FONT_GLOB_MODELE);
    for (const model of MODELE) {
      const d = inArena(() => buildGlobModele({ ...BAZA, model, constructie: "jumatati", font: f }).diag, () => []);
      expect(d.consola, model).toBeLessThanOrEqual(GLOB_MODELE.consolaArieMax);
    }
    // modul vaza, cu nervuri (implicit): in picioare, fara consola peste limita
    const d = inArena(() => buildGlobModele({ ...BAZA, model: "rasucite", constructie: "vaza", font: f }).diag, () => []);
    expect(d.consola).toBeLessThanOrEqual(GLOB_MODELE.consolaArieMax);
  }, 240_000);

  it("gatul si capacul: capacul intra peste gat cu jocul din config; inelul intra in locasurile ambelor jumatati", () => {
    inArena(() => {
      const r = buildGlobModele({ ...BAZA, model: "nervuri", constructie: "jumatati", font: font(FONT_GLOB_MODELE) });
      const rn = r.plan.razaGat;
      // gatul: raza exterioara exact rn
      const gat = (r.plan.exterior.slice(r.plan.zGat + GLOB_MODELE.inaltimeGat / 2).toPolygons() as number[][][]).flat().map(([x, y]) => Math.hypot(x, y));
      expect(Math.max(...gat)).toBeCloseTo(rn, 1);
      // capacul: golul lui, la jumatatea inaltimii, are raza rn + joc
      const capac = r.piese.find((x) => x.rol === "capac")!.manifold;
      const b = capac.boundingBox();
      const cx = (b.min[0] + b.max[0]) / 2, cy = (b.min[1] + b.max[1]) / 2;
      const inele = capac.slice(GLOB_MODELE.inaltimeCapac / 2).toPolygons() as number[][][];
      const golCapac = Math.min(...inele.flat().map(([x, y]) => Math.hypot(x - cx, y - cy)));
      expect(golCapac).toBeCloseTo(rn + GLOB_MODELE.tolerantaCapac, 1);
      // inelul: mai ingust decat locasul (cu jocul), mai lat decat interiorul jumatatilor la taietura
      const inel = r.piese.find((x) => x.rol === "inel")!.manifold;
      const bi = inel.boundingBox();
      const rExtInel = (bi.max[0] - bi.min[0]) / 2;
      // locasul se masoara la capatul lui adanc (peretele se strange spre pol)
      const Ri = GLOB_MODELE.diametru / 2 - GLOB_MODELE.perete;
      const riAdanc = Math.sqrt(Ri ** 2 - (Math.abs(r.plan.zTaietura) + GLOB_MODELE.locasInel) ** 2);
      const riTaietura = Math.sqrt(Ri ** 2 - r.plan.zTaietura ** 2);
      expect(rExtInel).toBeCloseTo(riAdanc + GLOB_MODELE.perete * GLOB_MODELE.fractieInel - GLOB_MODELE.tolerantaInel, 2);
      expect(rExtInel).toBeGreaterThan(riTaietura);
      expect(bi.max[2] - bi.min[2]).toBeCloseTo(2 * GLOB_MODELE.locasInel - 2 * GLOB_MODELE.tolerantaInel, 2);
      return [];
    }, () => []);
  }, 60_000);

  it("fantele trec prin perete la globul gol; in modul vaza devin caneluri, cu avertizare", () => {
    const f = font(FONT_GLOB_MODELE);
    const volum = (model: ModelGlob) => inArena(() => buildGlobModele({ ...BAZA, model, constructie: "jumatati", font: f }).piese.filter((x) => x.rol === "sus" || x.rol === "jos").reduce((s, x) => s + x.manifold.volume(), 0), () => []);
    expect(volum("fante")).toBeLessThan(volum("nervuri") - 200);
    const p = { ...GLOB_MODELE_DEF.implicit, constructie: "vaza", model: "fante" };
    const r = genereaza("glob-modele", p);
    expect(r.avertizari.join(" ")).toMatch(/caneluri/);
  }, 120_000);

  it("numele: pe banda de la ecuator, pe jumatatea de sus, se citeste normal din fata (in 3MF)", () => {
    const p = { ...GLOB_MODELE_DEF.implicit, text: "L", font: "BebasNeue-Regular.ttf" };
    const r = genereaza("glob-modele", p);
    const text = r.piese.find((x) => /Nume|Name/.test(x.nume))!;
    expect(text.print?.obiect).toBe(r.piese.find((x) => /sus|Top/.test(x.nume))!.print?.obiect);
    const fisiere = unzipSync(proiectGenerat(r.piese, GLOB_MODELE_DEF, p));
    const setari = strFromU8(fisiere["Metadata/model_settings.config"]);
    const parte = [...setari.matchAll(/<part id="(\d+)" subtype="normal_part">\s*<metadata key="name" value="([^"]*)"/g)].find((m) => /Nume|Name/.test(m[2]))!;
    const vs = obiecte3mf(fisiere).find((o) => o.id === parte[1])!.v;
    const ys = vs.map((q) => q[1]), xs = vs.map((q) => q[0]), zs = vs.map((q) => q[2]);
    // privit din fata (dinspre -Y in 3MF): spre privitor, adica pe partea cu Y mic a obiectului
    const obiectSus = obiecte3mf(fisiere).find((o) => o.v.length > 1000)!;
    const yMijloc = (Math.min(...obiectSus.v.map((q) => q[1])) + Math.max(...obiectSus.v.map((q) => q[1]))) / 2;
    expect(Math.max(...ys)).toBeLessThan(yMijloc);
    // "L" citit din fata: bara in stanga (X mic), piciorul jos; sus-dreapta gol
    const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
    const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
    expect(vs.filter((q) => q[0] > mx + 0.1 * (x1 - x0) && q[2] > mz + 0.1 * (z1 - z0)).length).toBe(0);
    expect(vs.filter((q) => q[0] < mx && q[2] > mz).length).toBeGreaterThan(0);
    // banda: numele sta in inaltimea benzii
    expect(z1 - z0).toBeLessThanOrEqual(GLOB_MODELE.inaltimeBanda);
  }, 120_000);

  it("diacriticele numelui ies complete; numele prea lung primeste avertizare", () => {
    const d = inArena(() => buildGlobModele({ ...BAZA, model: "nervuri", constructie: "jumatati", font: font(FONT_GLOB_MODELE), text: "Ștefănuț" }).diag, () => []);
    expect(d.glifeLipsa).toEqual([]);
    expect(d.nuIncape).toBe(false);
    const r = genereaza("glob-modele", { ...GLOB_MODELE_DEF.implicit, diametru: 50, text: "Alexandra-Maria Popescu" });
    expect(r.avertizari.join(" ")).toMatch(/sub 4 mm/);
  }, 120_000);

  it("capacul (alta culoare) e pe placa lui: pe placa globului nu se schimba filamentul", () => {
    const r = genereaza("glob-modele", { ...GLOB_MODELE_DEF.implicit });
    for (const x of r.piese) expect(x.print?.placa, x.nume).toBe(/Capac|Cap/.test(x.nume) ? 1 : 0);
    expect(new Set(r.piese.filter((x) => x.print?.placa === 0).map((x) => x.culoare)).size).toBe(1);
  }, 60_000);

  it("setarile de print: jumatatile strat 0,16 adaptive cubic 10%; corpul pentru modul vaza cu spiral_mode", () => {
    for (const [constructie, cheie] of [["jumatati", 'key="sparse_infill_pattern" value="adaptivecubic"'], ["vaza", 'key="spiral_mode" value="1"']] as const) {
      const p = { ...GLOB_MODELE_DEF.implicit, constructie };
      const setari = strFromU8(unzipSync(proiectGenerat(genereaza("glob-modele", p).piese, GLOB_MODELE_DEF, p))["Metadata/model_settings.config"]);
      expect(setari, constructie).toContain(cheie);
      expect(setari, constructie).toContain('key="layer_height" value="0.16"');
    }
  }, 120_000);
});
