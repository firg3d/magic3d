import { strFromU8, unzipSync } from "fflate";
import type { CrossSection, Manifold, ManifoldToplevel } from "manifold-3d";
import { beforeAll, describe, expect, it } from "vitest";
import { inArena } from "@/magic3d/core/geometry/arena";
import { proiectBambu } from "@/magic3d/core/assets/bambu3mf";
import { jocMatrite, SETARI_IMPLICITE, TERMO, type SetariTermo } from "@/magic3d/termo/config";
import { FORME, formaExemplu, type Inel } from "@/magic3d/termo/forme";
import { clema, construiesteTermo, latimeIngusta, type CheiePiesa, type RezultatTermo } from "@/magic3d/termo/geometrie";
import { contextOferta, piesePrint, proiectTermo } from "@/magic3d/termo/export";
import { mesajOferta, OFERTA_IMPLICIT, seIncadreaza } from "@/magic3d/oferta/oferta";
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

/** Piesa de print cu cheia data. */
function pr(rez: RezultatTermo, cheie: CheiePiesa): Manifold {
  const p = rez.print.find((x) => x.cheie === cheie);
  if (!p) throw new Error(`lipseste ${cheie}`);
  return p.corp;
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
      chei: rez.print.map((p) => p.cheie),
      bucati: { plasa: bucati(pr(rez, "plasa")), jos: bucati(pr(rez, "jos")), sus: bucati(pr(rez, "sus")) },
      status: rez.print.map((p) => p.corp.status()),
      cutii: rez.print.map((p) => p.corp.boundingBox()),
    }));
    expect(r.chei).toEqual(["plasa", "jos", "sus"]);
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
    const volum = (model: SetariTermo["model"]) => cu(formaExemplu("hexagon"), setari({ model, densitate: 40 }), (rez) => pr(rez, "plasa").volume());
    const plin = volum("gyroid");
    const gaurit = volum("fagure");
    expect(gaurit).toBeLessThan(plin * 0.85);
    expect(gaurit).toBeGreaterThan(plin * 0.3);
  });

  it("la ~104 mm, cotele seamana cu cele masurate pe referinta (doar ca ordin de marime)", () => {
    // Referinta (masurata, nu inclusa): bloc ~ contur + 5.5 / parte, cavitate 21.35, fund 3.65, dom = adancime - 1.
    const r = cu(formaExemplu("nor"), setari({ latime: 104, adancime: 20 }), (rez) => ({ info: rez.info, jos: pr(rez, "jos").boundingBox(), sus: pr(rez, "sus").boundingBox() }));
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
  it("cutie dintr-o forma simetrica: doua plase in oglinda, cleme, un singur set de matrite", () => {
    const r = cu(formaExemplu("inima"), setari({ mod: "cutie" }), (rez) => {
      const { jos } = rez.folosire;
      const H = jos.boundingBox().max[2];
      const L = H - TERMO.locasAdancime;
      const gura = new mod.CrossSection(rez.gura, "EvenOdd");
      // Plasa B se formeaza tot in matrita A: gaurile ambelor plase trebuie sa stea pe polita, nu deasupra cavitatii.
      const oglinda = rez.gauriCleme.map(([x, y]) => (rez.info.simetrie === "y" ? [x, -y] : [-x, y]) as [number, number]);
      const peCavitate = [...rez.gauriCleme, ...oglinda].map(([x, y]) => mod.CrossSection.circle(TERMO.gauraClemaDiametru / 2 + 0.3, 24).translate([x, y]).intersect(gura).area());
      return {
        info: rez.info,
        chei: rez.print.map((p) => p.cheie),
        bucatiCleme: bucati(pr(rez, "cleme")),
        golurileRamei: rez.folosire.plasa.slice(L - 1).decompose().filter((b) => b.area() > 1).length,
        peCavitate,
        volume: [pr(rez, "plasa").volume(), pr(rez, "plasa2").volume()],
      };
    });
    expect(r.info.simetrie).toBe("x");
    expect(r.info.seturi).toBe(1);
    expect(r.chei).toEqual(["plasa", "plasa2", "cleme", "jos", "sus"]);
    expect(r.info.cleme).toBeGreaterThanOrEqual(TERMO.clemeMin);
    expect(r.bucatiCleme).toBe(r.info.cleme);
    // Rama e intrerupta in dreptul fiecarei cleme: atatea bucati de rama cate cleme.
    expect(r.golurileRamei).toBe(r.info.cleme);
    for (const a of r.peCavitate) expect(a).toBeLessThan(0.01);
    expect(r.volume[1]).toBeCloseTo(r.volume[0], 1);
  });

  it("cutie dintr-o forma nesimetrica: al doilea set de matrite, in oglinda", () => {
    const r = cu(formaExemplu("frunza"), setari({ mod: "cutie", latime: 110 }), (rez) => ({
      info: rez.info,
      chei: rez.print.map((p) => p.cheie),
      volume: [pr(rez, "jos").volume(), pr(rez, "jos2").volume(), pr(rez, "sus").volume(), pr(rez, "sus2").volume()],
    }));
    expect(r.info.simetrie).toBeNull();
    expect(r.info.seturi).toBe(2);
    expect(r.info.avertizari).toContain("avAsimetric");
    expect(r.chei).toEqual(["plasa", "plasa2", "cleme", "jos", "sus", "jos2", "sus2"]);
    expect(r.volume[1]).toBeCloseTo(r.volume[0], 0);
    expect(r.volume[3]).toBeCloseTo(r.volume[2], 0);
  });

  it("clema prinde cele doua membrane: golul, bratele si umflaturile au cotele din config", () => {
    const m = inArena(() => {
      const c = clema(mod);
      const b = c.boundingBox();
      // La mijlocul latimii, prin umflaturi: golul ramas intre ele; langa margine, golul intreg.
      const golPrinUmflaturi = (z: number, x: number) => {
        const s = c.slice(z);
        const linie = mod.CrossSection.square([0.05, 20]).translate([x, -5]);
        return linie.subtract(s).intersect(mod.CrossSection.square([0.05, b.max[1] - 2 * TERMO.clemaPerete + 0.002]).translate([x, TERMO.clemaPerete - 0.001])).area() / 0.05;
      };
      const xU = TERMO.clemaPerete + TERMO.gauraClemaDepartare;
      return { bucati: c.decompose().length, b, golMargine: golPrinUmflaturi(0.3, xU), golUmflaturi: golPrinUmflaturi(TERMO.clemaLatime / 2, xU) };
    }, () => []);
    const gol = 2 * TERMO.membrana + TERMO.clemaJoc;
    expect(m.bucati).toBe(1);
    expect(m.b.max[2] - m.b.min[2]).toBeCloseTo(TERMO.clemaLatime, 3);
    expect(m.b.max[1] - m.b.min[1]).toBeCloseTo(2 * TERMO.clemaPerete + gol, 3);
    expect(m.golMargine).toBeCloseTo(gol, 2);
    // Umflaturile strang locul cat sa intre in gauri: mai putin decat cele doua membrane.
    expect(m.golUmflaturi).toBeCloseTo(gol - 2 * TERMO.clemaUmflatura, 2);
    expect(m.golUmflaturi).toBeLessThan(2 * TERMO.membrana);
  });

  it("previzualizarea: membrana formata sta in jocul dintre matrite, iar cutia se inchide fara suprapuneri", () => {
    const r = inArena(() => {
      const rez = construiesteTermo(mod, formaExemplu("inima"), setari({ mod: "cutie" }), true);
      if (!rez.vedere) throw new Error("fara vedere");
      const format = rez.vedere.rezultat[0].corp;
      const { jos, sus } = rez.folosire;
      return {
        nRezultat: rez.vedere.rezultat.length,
        nPresare: rez.vedere.presare.length,
        inJos: format.intersect(jos).volume(),
        inSus: format.intersect(sus).volume(),
        jumatati: rez.vedere.rezultat[0].corp.intersect(rez.vedere.rezultat[1].corp).volume(),
        volum: format.volume(),
      };
    }, () => []);
    expect(r.nRezultat).toBe(2);
    expect(r.nPresare).toBe(3);
    expect(r.volum).toBeGreaterThan(1000);
    expect(r.inJos).toBeLessThan(0.5);
    expect(r.inSus).toBeLessThan(0.5);
    expect(r.jumatati).toBeLessThan(0.5);
  });

  it("3MF-ul cutiei are o placa pe piesa, iar clemele se printeaza pline", () => {
    const s = setari({ mod: "cutie" });
    const { piese, info } = cu(formaExemplu("inima"), s, (rez) => ({ piese: piesePrint(rez), info: rez.info }));
    const fisiere = unzipSync(proiectBambu(proiectTermo(piese, s, "ro", "inima", info)));
    const config = strFromU8(fisiere["Metadata/model_settings.config"]);
    expect(config.match(/<plate>/g)).toHaveLength(5);
    expect(config).toContain('value="Plasă B"');
    expect(config).toContain('key="sparse_infill_density" value="100%"');
    expect(strFromU8(fisiere["Metadata/instructiuni.txt"])).toContain("cleme");
  });

  it("oferta: proiectul Bambu, detaliile, piesa cea mai mare si formarea in atelier ajung in mesaj", () => {
    const s = setari({ mod: "cutie" });
    const { piese, info } = cu(formaExemplu("inima"), s, (rez) => ({ piese: piesePrint(rez), info: rez.info }));
    const atelier = contextOferta(piese, info, s, "Inimă", true);
    const doarPrint = contextOferta(piese, info, s, "Inimă", false);
    expect(atelier.servicii?.[0].bifat).toBe(true);
    expect(doarPrint.servicii?.[0].bifat).toBe(false);
    expect(atelier.detalii).toContain("120 × 109.9 mm");
    expect(atelier.detalii).toContain(`${info.cleme} cleme`);
    // Fiecare piesa incape singura in volumul atelierului, desi toate impreuna nu ar incapea.
    expect(seIncadreaza(atelier.piesaMaxima!, OFERTA_IMPLICIT.volumMaxMm)).toBe(true);
    expect(atelier.piesaMaxima!.x).toBeLessThan(TERMO.placa);
    const config = strFromU8(unzipSync(atelier.threeMf!)["Metadata/model_settings.config"]);
    expect(config.match(/<plate>/g)).toHaveLength(piese.length);
    const baza = { nume: "Ana", telefon: "0700000000", oras: "Cluj", material: "PLA", culoare: "", cantitate: 2, student: false, observatii: "", dimensiuni: "", volum: "", greutate: "", link: "https://magic3d.ro/oferta/d.php?id=x", zile: 20 };
    const mesaj = mesajOferta(OFERTA_IMPLICIT.mesaj, { ...baza, generator: atelier.generator, detalii: atelier.detalii, servicii: atelier.servicii!.filter((x) => x.bifat).map((x) => x.mesaj) });
    expect(mesaj).toContain("Generator: Termoformare din poză → Inimă");
    expect(mesaj).toContain(`Detalii: ${atelier.detalii}`);
    expect(mesaj).toContain("Servicii: Formare în atelier: da");
    const faraServicii = mesajOferta(OFERTA_IMPLICIT.mesaj, { ...baza, servicii: [] });
    expect(faraServicii).not.toContain("Servicii:");
    expect(faraServicii).not.toContain("Detalii:");
  });
});
