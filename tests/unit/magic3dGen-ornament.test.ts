import type { ManifoldToplevel } from "manifold-3d";
import { beforeAll, describe, expect, it } from "vitest";
import { ORNAMENT } from "@/magic3d/apps/ornament/config";
import { arieNesustinuta, buildOrnament, configureManifold, type ParamOrnament } from "@/magic3d/apps/ornament/ornament";
import { inArena } from "@/magic3d/core/geometry/arena";
import { ornament } from "@/magic3d/generatoare/constructori/ornament";
import { ORNAMENT_DEF } from "@/magic3d/generatoare/defs/ornament";
import { contextGenerat, proiectGenerat } from "@/magic3d/generatoare/export";
import { strFromU8, unzipSync } from "fflate";
import type { Parametri } from "@/magic3d/generatoare/tipuri";
import { font, fontExista, genereazaCu, limite, manifold, verificaPiese } from "./magic3dGenUtil";

/*
 * Ornamentele de Craciun, pe date proprii: ornamentul plat (cu textul in contur, gravat la nivel,
 * pachetul familie dintr-o lista de nume) si globul din doua jumatati (se inchide cu jocul din
 * config, se printeaza fara suporturi). Masuratorile se fac pe geometrie.
 */

let mod: ManifoldToplevel;
beforeAll(async () => {
  mod = (await manifold()) as ManifoldToplevel;
});

const p = (extra: Partial<Parametri> = {}): Parametri => ({ ...ORNAMENT_DEF.implicit, ...extra });

/** Configuratia geometriei direct (fara constructor), pentru masuratori pe corpuri. */
function cfg(extra: Partial<ParamOrnament> = {}): ParamOrnament {
  const i = ORNAMENT_DEF.implicit;
  return {
    tip: "plat", forma: "cerc", diametru: Number(i.diametru), grosime: Number(i.grosime), font: font(String(i.font)),
    text: String(i.text), text2: String(i.text2), inaltimeText: Number(i.inaltimeText), curbare: 0, mod: "relief",
    relief: Number(i.relief), rama: Number(i.rama), pictograma: "stea", prindere: "ureche", diametruGaura: Number(i.diametruGaura),
    perete: Number(i.perete), turtire: 1, imbinare: "inel", ...extra,
  };
}

const cu = <T,>(c: ParamOrnament, f: (r: ReturnType<typeof buildOrnament>) => T): T => inArena(() => {
  configureManifold(mod);
  return f(buildOrnament(c));
}, () => []);

describe("Ornamente de Crăciun", { timeout: 120_000 }, () => {
  it("are fontul implicit livrat", () => {
    expect(fontExista(String(ORNAMENT_DEF.implicit.font))).toBe(true);
  });

  it.each(["cerc", "stea", "brad", "fulg", "inima"])("ornamentul plat %s: baza, textul si rama, textul in interiorul ramei", (forma) => {
    const r = cu(cfg({ forma: forma as ParamOrnament["forma"], text: "Mihaela", curbare: forma === "cerc" ? 90 : 0 }), (rez) => {
      const baza = rez.piese.find((x) => x.rol === "baza")!.manifold;
      const text = rez.piese.find((x) => x.rol === "text")!.manifold;
      const contur = baza.project();
      return {
        roluri: rez.piese.map((x) => x.rol),
        iese: text.project().subtract(contur.offset(-Number(ORNAMENT_DEF.implicit.rama), "Round")).area(),
        bucatiBaza: baza.decompose().filter((b: { volume(): number }) => b.volume() > 1).length,
        diag: rez.diag,
      };
    });
    expect(r.roluri).toEqual(["baza", "text", "rama"]);
    expect(r.iese).toBeLessThan(0.01);
    expect(r.bucatiBaza).toBe(1);
    expect(r.diag.nuIncape).toBe(false);
  });

  it("micsoreaza un text prea lung pana incape si avertizeaza cand ajunge prea mic", () => {
    const r = genereazaCu(ornament, p({ text: "Constantinopolitana Maximiliana", diametru: 50 }));
    verificaPiese(ORNAMENT_DEF, r);
    expect(r.avertizari.some((a) => /micșorat|nu încape/.test(a))).toBe(true);
  });

  it("gravat: locasul din baza e umplut la nivel de corpul textului", () => {
    const r = cu(cfg({ mod: "gravat" }), (rez) => {
      const baza = rez.piese.find((x) => x.rol === "baza")!.manifold;
      const text = rez.piese.find((x) => x.rol === "text")!.manifold;
      return { suprapunere: baza.intersect(text).volume(), sus: text.boundingBox().max[2], volum: text.volume() };
    });
    expect(r.volum).toBeGreaterThan(10);
    expect(r.suprapunere).toBeLessThan(0.01);
    expect(r.sus).toBeCloseTo(Number(ORNAMENT_DEF.implicit.grosime), 3);
  });

  it("prinderea: gaura si urechea strapung baza, carligul are gaura deschisa spre margine", () => {
    const sectiune = (prindere: ParamOrnament["prindere"]) => cu(cfg({ prindere }), (rez) => {
      const s = rez.piese.find((x) => x.rol === "baza")!.manifold.slice(1);
      return { contururi: s.toPolygons().length, arie: s.area(), bucati: s.decompose().length };
    });
    const gaura = sectiune("gaura"), ureche = sectiune("ureche"), carlig = sectiune("carlig");
    // Conturul exterior plus gaura.
    expect(gaura.contururi).toBeGreaterThanOrEqual(2);
    expect(ureche.contururi).toBeGreaterThanOrEqual(2);
    // Carligul: deschiderea uneste gaura cu exteriorul, deci un singur contur si mai putin material decat urechea.
    expect(carlig.contururi).toBe(1);
    expect(carlig.arie).toBeLessThan(ureche.arie);
    for (const x of [gaura, ureche, carlig]) expect(x.bucati).toBe(1);
  });

  it("pachetul familie: 5 nume fac 5 ornamente, fiecare cu baza, textul si rama lui", () => {
    const nume = ["Ana", "Mihai", "Ioana", "Radu", "Elena"];
    const r = genereazaCu(ornament, p({ lista: nume.join(", ") }));
    verificaPiese(ORNAMENT_DEF, r);
    const obiecte = new Set(r.piese.map((x) => x.print?.obiect));
    expect(obiecte.size).toBe(5);
    for (const n of nume) expect(r.piese.filter((x) => x.nume.includes(n))).toHaveLength(3);
    // Ornamentele nu se suprapun pe placa.
    const cutii = [...obiecte].map((o) => {
      const piese = r.piese.filter((x) => x.print?.obiect === o).map(limite);
      return { minX: Math.min(...piese.map((b) => b.minX)), maxX: Math.max(...piese.map((b) => b.maxX)), minZ: Math.min(...piese.map((b) => b.minZ)), maxZ: Math.max(...piese.map((b) => b.maxZ)) };
    });
    for (let i = 0; i < cutii.length; i += 1) for (let j = i + 1; j < cutii.length; j += 1) {
      const a = cutii[i], b = cutii[j];
      expect(a.maxX <= b.minX || b.maxX <= a.minX || a.maxZ <= b.minZ || b.maxZ <= a.minZ).toBe(true);
    }
  });

  it("globul: inelul intra in locasurile ambelor jumatati cu jocul din config, fara suporturi la print", () => {
    const r = cu(cfg({ tip: "glob", text: "Ana", text2: "2026" }), (rez) => {
      const sus = rez.piese.find((x) => x.rol === "sus")!.manifold;
      const jos = rez.piese.find((x) => x.rol === "jos")!.manifold;
      const inel = rez.piese.find((x) => x.rol === "inel")!.manifold;
      // Raza locasului: cel mai indepartat punct al golului din sectiunea de langa taietura.
      const razaGol = (m: { slice(z: number): { toPolygons(): number[][][] } }) => {
        const poligoane = m.slice(1).toPolygons();
        const interioare = poligoane.map((q) => Math.max(...q.map(([x, y]) => Math.hypot(x, y)))).sort((a, b) => a - b);
        return interioare[0];
      };
      const bi = inel.boundingBox();
      return {
        roluri: rez.piese.map((x) => x.rol),
        locasSus: razaGol(sus),
        locasJos: razaGol(jos),
        razaInel: (bi.max[0] - bi.min[0]) / 2,
        inaltimeInel: bi.max[2] - bi.min[2],
        consola: rez.diag.consola,
        // Inelul e deschis si drept: nimic nu se printeaza in gol.
        consolaInel: arieNesustinuta(inel),
        pePlaca: [sus.boundingBox().min[2], jos.boundingBox().min[2]],
      };
    });
    expect(r.roluri).toEqual(["sus", "jos", "inel", "textSus", "textJos"]);
    expect(r.locasSus).toBeCloseTo(r.locasJos, 1);
    expect(r.locasSus - r.razaInel).toBeCloseTo(ORNAMENT.tolerantaInel, 1);
    expect(r.inaltimeInel).toBeLessThan(2 * ORNAMENT.locasInel);
    expect(r.consola).toBeLessThan(ORNAMENT.consolaArieMax);
    expect(r.consolaInel).toBeLessThan(0.01);
    for (const z of r.pePlaca) expect(Math.abs(z)).toBeLessThan(1e-6);
  });

  it("globul cu stifturi: gaurile din cele doua jumatati cad una peste alta", () => {
    const r = cu(cfg({ tip: "glob", imbinare: "stifturi", text: "", text2: "" }), (rez) => {
      const sus = rez.piese.find((x) => x.rol === "sus")!.manifold;
      const jos = rez.piese.find((x) => x.rol === "jos")!.manifold;
      // Jumatatea de jos e intoarsa pe X: oglindita inapoi, sectiunea ei langa taietura trebuie sa fie a celei de sus.
      const a = sus.slice(1);
      const b = jos.mirror([0, 1, 0]).slice(1);
      return { diferenta: a.subtract(b).area() + b.subtract(a).area(), gauri: a.toPolygons().length };
    });
    expect(r.gauri).toBeGreaterThanOrEqual(1 + ORNAMENT.stifturi);
    expect(r.diferenta).toBeLessThan(1);
  });

  it("constructorul globului pune jumatatile si inelul pe placi separate", () => {
    const r = genereazaCu(ornament, p({ tip: "glob" }));
    verificaPiese(ORNAMENT_DEF, r);
    const placi = new Set(r.piese.map((x) => x.print?.placa));
    expect(placi.size).toBe(3);
  });

  it("3MF-ul: ornamentul plat e un obiect cu trei parti pe trei extrudere; globul are o placa pe piesa", () => {
    const plat = genereazaCu(ornament, p());
    const cfgPlat = strFromU8(unzipSync(proiectGenerat(plat.piese, ORNAMENT_DEF, p()))["Metadata/model_settings.config"]);
    expect(cfgPlat.match(/<plate>/g)).toHaveLength(1);
    expect(cfgPlat.match(/<object id=/g)).toHaveLength(1);
    expect(cfgPlat.match(/<part id=/g)).toHaveLength(3);
    for (const e of [1, 2, 3]) expect(cfgPlat).toContain(`<metadata key="extruder" value="${e}"/>`);
    const glob = genereazaCu(ornament, p({ tip: "glob" }));
    const fisiere = unzipSync(proiectGenerat(glob.piese, ORNAMENT_DEF, p({ tip: "glob" })));
    expect(strFromU8(fisiere["Metadata/model_settings.config"]).match(/<plate>/g)).toHaveLength(3);
    expect(strFromU8(fisiere["Metadata/instructiuni.txt"])).toContain("inel");
    // Oferta: fiecare obiect incape singur in volumul atelierului.
    const context = contextGenerat(glob.piese, ORNAMENT_DEF, p({ tip: "glob" }));
    expect(context.piesaMaxima!.x).toBeLessThan(ORNAMENT.diametruMax + 20);
    expect(context.detalii).toContain("Glob 3D");
  });
});
