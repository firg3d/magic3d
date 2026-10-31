import { strFromU8, unzipSync } from "fflate";
import type { CrossSection, Manifold, ManifoldToplevel } from "manifold-3d";
import { beforeAll, describe, expect, it } from "vitest";
import { inArena } from "@/magic3d/core/geometry/arena";
import { proiectBambu } from "@/magic3d/termo/bambu3mf";
import { jocMatrite, SETARI_IMPLICITE, TERMO, type SetariTermo } from "@/magic3d/termo/config";
import { FORME, formaExemplu, type Inel } from "@/magic3d/termo/forme";
import { construiesteTermo, latimeIngusta, type RezultatTermo } from "@/magic3d/termo/geometrie";
import { piesePrint, proiectTermo } from "@/magic3d/termo/export";
import { ineleCuYSus, siluetaDinPixeli } from "@/magic3d/termo/silueta";
import { manifold } from "./magic3dGenUtil";

/*
 * Termoformarea pe forme proprii (desenate din formule in forme.ts, nicio imagine a altcuiva):
 * cele trei piese se construiesc, se potrivesc cu jocul cerut, zonele inguste se ingroasa, iar
 * 3MF-ul are placile si setarile pe obiect. Masuratorile se fac pe geometrie, nu pe info-ul rotunjit.
 */

let mod: ManifoldToplevel;

beforeAll(async () => {
  mod = (await manifold()) as ManifoldToplevel;
});

const setari = (extra: Partial<SetariTermo> = {}): SetariTermo => ({ ...SETARI_IMPLICITE, ...extra });

/** Construieste si elibereaza tot ce a facut manifold-ul; intoarce ce cere `masoara`, calculat inainte de eliberare. */
function cu<T>(inele: Inel[], s: SetariTermo, masoara: (r: RezultatTermo) => T): T {
  return inArena(() => masoara(construiesteTermo(mod, inele, s)), () => []);
}

/** Bucatile unui corp, fara aschii. */
const bucati = (m: Manifold) => m.decompose().filter((b) => b.volume() > 1).length;

/** Golul matritei de jos la cota z, in interiorul conturului marit cu `margine` (fara gaurile stifturilor si fara ce e in afara blocului). */
function golLa(jos: Manifold, z: number, contur: number[][][], margine: number): CrossSection {
  const zona = new mod.CrossSection(contur as [number, number][][], "EvenOdd").offset(margine, "Round");
  return zona.subtract(jos.slice(z));
}

/** Cercurile unite printr-o punte ingusta: o forma cu o zona care trebuie ingrosata. */
function haltera(latimePunte: number): Inel[] {
  const a = mod.CrossSection.circle(30, 96).translate([-40, 0]);
  const b = mod.CrossSection.circle(30, 96).translate([40, 0]);
  const punte = mod.CrossSection.square([80, latimePunte], true);
  return inArena(() => mod.CrossSection.union([a, b, punte]).toPolygons() as Inel[], () => []);
}

/** O forma desenata in pixeli (fundal alb sau transparent), ca o imagine incarcata. */
function rasterizeaza(inele: Inel[], latura: number, fundal: "alb" | "transparent"): { width: number; height: number; data: Uint8ClampedArray } {
  const pts = inele.flat();
  const minX = Math.min(...pts.map((p) => p[0])), maxX = Math.max(...pts.map((p) => p[0]));
  const minY = Math.min(...pts.map((p) => p[1])), maxY = Math.max(...pts.map((p) => p[1]));
  const f = (latura * 0.8) / Math.max(maxX - minX, maxY - minY);
  const data = new Uint8ClampedArray(latura * latura * 4);
  for (let y = 0; y < latura; y += 1) {
    // Par-impar pe linia y, in coordonatele formei (y in sus).
    const fy = maxY - (y + 0.5 - latura * 0.1) / f;
    const taieri: number[] = [];
    for (const inel of inele) for (let i = 0, j = inel.length - 1; i < inel.length; j = i++) {
      const [x1, y1] = inel[i], [x2, y2] = inel[j];
      if ((y1 > fy) !== (y2 > fy)) taieri.push(x1 + ((fy - y1) * (x2 - x1)) / (y2 - y1));
    }
    taieri.sort((a, b) => a - b);
    for (let x = 0; x < latura; x += 1) {
      const fx = minX + (x + 0.5 - latura * 0.1) / f;
      const inauntru = taieri.filter((t) => t < fx).length % 2 === 1;
      const k = (y * latura + x) * 4;
      if (inauntru) { data[k] = 40; data[k + 1] = 90; data[k + 2] = 200; data[k + 3] = 255; }
      else if (fundal === "alb") { data[k] = 255; data[k + 1] = 255; data[k + 2] = 255; data[k + 3] = 255; }
    }
  }
  return { width: latura, height: latura, data };
}

describe("Termoformare din poză", { timeout: 60_000 }, () => {
  it.each(FORME)("construieste plasa si cele doua matrite din forma proprie %s", (forma) => {
    const r = cu(formaExemplu(forma), setari(), (rez) => ({
      info: rez.info,
      bucati: { plasa: bucati(rez.print.plasa), jos: bucati(rez.print.jos), sus: bucati(rez.print.sus) },
      status: [rez.print.plasa, rez.print.jos, rez.print.sus].map((m) => m.status()),
      cutii: [rez.print.plasa, rez.print.jos, rez.print.sus].map((m) => m.boundingBox()),
    }));
    expect(r.status).toEqual(["NoError", "NoError", "NoError"]);
    expect(r.bucati).toEqual({ plasa: 1, jos: 1, sus: 1 });
    // In pozitia de print toate stau pe masa.
    for (const c of r.cutii) expect(Math.abs(c.min[2])).toBeLessThan(1e-6);
    expect(r.cutii[0].max[2] - r.cutii[0].min[2]).toBeCloseTo(TERMO.ramaInaltime, 3);
    expect(r.info.incape).toBe(true);
    expect(r.info.aerisiri).toBeGreaterThan(0);
    expect(r.info.stifturi).toBe(TERMO.stifturi);
  });

  it("matritele lasa intre ele jocul cerut (membrana + 0.2), masurat pe sectiuni", () => {
    const joc = jocMatrite();
    const s = setari({ latime: 120, adancime: 22 });
    const masuri = cu(formaExemplu("inima"), s, (rez) => {
      const { jos, sus, plasa } = rez.folosire;
      const H = jos.boundingBox().max[2];
      const L = H - TERMO.locasAdancime;
      const D = rez.info.adancime;
      const rezultate: Array<{ d: number; preaAproape: number; preaDeparte: number; asteptat: number }> = [];
      for (const d of [1, 4, 8, 12, 16, 19]) {
        if (d >= D - joc) continue;
        const z = L - d;
        // Fara canalul ramei: doar cavitatea, care sta in interiorul canalului.
        const gol = golLa(jos, z, rez.contur, -(TERMO.ramaLatime + TERMO.canalJoc + 0.05));
        // Doar domul: stifturile stau in gaurile lor, cu jocul lor.
        const dom = sus.slice(z).intersect(new mod.CrossSection(rez.contur, "EvenOdd"));
        // Domul nu intra in banda de joc a cavitatii...
        const preaAproape = dom.subtract(gol.offset(-(joc - 0.02), "Round")).area();
        // ...si nici nu se departeaza de ea mai mult decat cer treptele si geometria peretelui.
        const R = D;
        const asteptat = Math.sqrt(R * R - d * d) - Math.sqrt((R - joc) ** 2 - d * d);
        const preaDeparte = gol.offset(-(asteptat + TERMO.pasLateralMax + 0.1), "Round").subtract(dom).area();
        rezultate.push({ d, preaAproape, preaDeparte, asteptat });
      }
      // Pe verticala, in mijlocul fundului: cavitatea la D sub membrana, domul la D - joc.
      const fundCavitate = L - D;
      const varfDom = sus.boundingBox().min[2];
      // Plasa (inca plata) sta in matrita de jos fara sa o atinga; domul o traverseaza doar in gura
      // cavitatii, unde o va forma; matritele nu se ating intre ele.
      const gura = new mod.CrossSection(rez.gura, "EvenOdd").extrude(H + 10).translate([0, 0, -5]);
      const ciocniri = [plasa.intersect(jos).volume(), plasa.subtract(gura).intersect(sus).volume(), jos.intersect(sus).volume()];
      return { rezultate, vertical: varfDom - fundCavitate, ciocniri };
    });
    expect(masuri.rezultate.length).toBeGreaterThan(3);
    for (const m of masuri.rezultate) {
      expect(m.preaAproape, `adancime ${m.d}`).toBeLessThan(0.5);
      expect(m.preaDeparte, `adancime ${m.d}`).toBeLessThan(0.5);
      expect(m.asteptat).toBeGreaterThanOrEqual(joc - 1e-9);
    }
    expect(masuri.vertical).toBeCloseTo(joc, 2);
    for (const v of masuri.ciocniri) expect(v).toBeLessThan(0.01);
  });

  it("rama plasei intra in canal cu jocul lui, iar membrana sta pe polita", () => {
    const m = cu(formaExemplu("hexagon"), setari(), (rez) => {
      const { jos, plasa } = rez.folosire;
      const H = jos.boundingBox().max[2];
      const L = H - TERMO.locasAdancime;
      const rama = plasa.slice(L - 1);
      const canal = golLa(jos, L - 1, rez.contur, TERMO.locasJoc + 0.05);
      return {
        ramaInCanal: rama.subtract(canal.offset(-(TERMO.canalJoc - 0.02), "Round")).area(),
        ramaArie: rama.area(),
        jocJosRama: plasa.boundingBox().min[2] - (H - TERMO.ramaInaltime - TERMO.canalPeste),
        membranaPestePolita: plasa.boundingBox().min[2] < L,
      };
    });
    expect(m.ramaArie).toBeGreaterThan(10);
    expect(m.ramaInCanal).toBeLessThan(0.2);
    expect(m.jocJosRama).toBeGreaterThan(0.2);
    expect(m.membranaPestePolita).toBe(true);
  });

  it("ingroasa zonele prea inguste si le semnaleaza", () => {
    const inele = haltera(3);
    const r = cu(inele, setari({ latime: 140 }), (rez) => ({ info: rez.info, ingust: latimeIngusta(new mod.CrossSection(rez.contur, "EvenOdd")), zone: rez.zone.length }));
    expect(r.info.zoneIngrosate).toBeGreaterThan(0);
    expect(r.zone).toBeGreaterThan(0);
    expect(r.info.avertizari).toContain("avIngrosat");
    // Puntea de 3 mm (la scara 140/140) a ajuns cel putin la latimea minima.
    expect(r.ingust).toBeGreaterThanOrEqual(TERMO.latimeMinima - 0.3);
    // O forma lata nu are ce ingrosa.
    const lat = cu(formaExemplu("hexagon"), setari(), (rez) => rez.info.zoneIngrosate);
    expect(lat).toBe(0);
  });

  it("limiteaza adancimea la cea sigura pentru zona cea mai ingusta", () => {
    const r = cu(formaExemplu("stea"), setari({ adancime: 60 }), (rez) => rez.info);
    expect(r.adancime).toBeLessThanOrEqual(r.adancimeSigura);
    expect(r.adancimeSigura).toBeLessThanOrEqual(TERMO.adancimeDinIngust * r.ingust + 0.1);
    expect(r.avertizari).toContain("avAdancime");
  });

  it.each([["alb"], ["transparent"]] as const)("scoate fundalul (%s) si contureaza silueta unei imagini", (fundal) => {
    const pixeli = rasterizeaza(formaExemplu("frunza"), 400, fundal);
    const s = siluetaDinPixeli(pixeli, { detaliu: 3, inversare: false });
    expect(s.inele.length).toBeGreaterThan(0);
    const info = cu(ineleCuYSus(s.inele), setari({ latime: 100 }), (rez) => rez.info);
    expect(info.latime).toBeCloseTo(100, 0);
    // Frunza e mai lata decat inalta (raport ~0.6 la desen, aplecata).
    expect(info.inaltime).toBeGreaterThan(40);
    expect(info.inaltime).toBeLessThan(90);
  });

  it("modelul fagure decupeaza gauri in membrana, rama ramane plina", () => {
    const volum = (model: SetariTermo["model"]) => cu(formaExemplu("hexagon"), setari({ model, densitate: 40 }), (rez) => rez.print.plasa.volume());
    const plin = volum("gyroid");
    const gaurit = volum("fagure");
    expect(gaurit).toBeLessThan(plin * 0.85);
    expect(gaurit).toBeGreaterThan(plin * 0.3);
  });

  it("la ~104 mm, cotele seamana cu cele masurate pe referinta (doar ca ordin de marime)", () => {
    // Referinta (masurata, nu inclusa): bloc ~ contur + 5.5 / parte, cavitate 21.35, fund 3.65, dom = adancime - 1.
    const r = cu(formaExemplu("nor"), setari({ latime: 104, adancime: 20 }), (rez) => ({ info: rez.info, jos: rez.print.jos.boundingBox(), sus: rez.print.sus.boundingBox() }));
    const inaltimeJos = r.jos.max[2] - r.jos.min[2];
    expect(inaltimeJos).toBeCloseTo(TERMO.fundJos + TERMO.locasAdancime + r.info.adancime, 3);
    expect(r.jos.max[0] - r.jos.min[0]).toBeGreaterThanOrEqual(104 + 2 * TERMO.margineBloc - 0.1);
    expect(r.jos.max[0] - r.jos.min[0]).toBeLessThan(104 + 2 * (TERMO.margineBloc + TERMO.stiftDiametru + TERMO.stiftPerete));
    // Domul coboara cu jocul mai putin decat cavitatea.
    const inaltimeDom = r.sus.max[2] - r.sus.min[2] - TERMO.placaSus;
    expect(inaltimeDom).toBeCloseTo(TERMO.locasAdancime + r.info.adancime - jocMatrite(), 3);
  });

  it("3MF-ul are o placa pe piesa, setarile pe obiect si instructiunile", () => {
    const piese = cu(formaExemplu("inima"), setari(), (rez) => piesePrint(rez));
    const bytes = proiectBambu(proiectTermo(piese, setari(), "ro"));
    const fisiere = unzipSync(bytes);
    for (const cale of ["[Content_Types].xml", "_rels/.rels", "3D/3dmodel.model", "3D/_rels/3dmodel.model.rels", "Metadata/model_settings.config", "Metadata/instructiuni.txt"]) expect(fisiere[cale], cale).toBeDefined();
    const config = strFromU8(fisiere["Metadata/model_settings.config"]);
    expect(config.match(/<plate>/g)).toHaveLength(3);
    expect(config).toContain('key="top_shell_layers" value="0"');
    expect(config).toContain('key="sparse_infill_pattern" value="gyroid"');
    expect(config).toContain('key="layer_height" value="0.28"');
    const model = strFromU8(fisiere["3D/3dmodel.model"]);
    expect(model.match(/<item /g)).toHaveLength(3);
    expect(model).toContain('requiredextensions="p"');
    // Fiecare obiect din model_settings exista in model, iar componentele lor au fisierele lor.
    const iduri = [...config.matchAll(/<object id="(\d+)">/g)].map((m) => m[1]);
    for (const id of iduri) expect(model).toContain(`<object id="${id}"`);
    for (const m of model.matchAll(/p:path="\/(3D\/Objects\/[^"]+)"/g)) expect(fisiere[m[1]], m[1]).toBeDefined();
    expect(strFromU8(fisiere["Metadata/instructiuni.txt"])).toMatch(/°C/);
  });

  it("se reconstruieste de mai multe ori fara sa lase obiecte manifold vii", () => {
    for (const latime of [80, 120, 160]) {
      const info = cu(formaExemplu("hexagon"), setari({ latime }), (rez) => rez.info);
      expect(info.latime).toBeCloseTo(latime, 0);
    }
  });
});
