// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { traceRasterRings } from "@/lib/rasterTrace";
import { libraryShapeAssets } from "@/lib/shapeCatalog";
import { logoAsset } from "@/magic3d/logo/asset";
import { IESIRI, LIMITE, LOGO, SETARI_IMPLICITE } from "@/magic3d/logo/config";
import { dreptunghiRotunjit } from "@/magic3d/logo/constructie";
import { LogoPanel } from "@/magic3d/logo/LogoPanel";
import { cadruLogo, profilDinInele } from "@/magic3d/logo/profil";
import { OPTIUNI_IMPLICITE, traseazaLogo, type InelPx } from "@/magic3d/logo/trasare";
import { LINK_FIRME, mesajOferta, OFERTA_IMPLICIT } from "@/magic3d/oferta/oferta";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Rgba = [number, number, number, number];
const NEGRU: Rgba = [17, 17, 17, 255];
const ALB: Rgba = [255, 255, 255, 255];

/** O imagine de `latime` x `inaltime` pixeli, fiecare colorat de `vopsea(x, y)`. */
function imagine(latime: number, inaltime: number, vopsea: (x: number, y: number) => Rgba) {
  const data = new Uint8ClampedArray(latime * inaltime * 4);
  for (let y = 0; y < inaltime; y += 1) for (let x = 0; x < latime; x += 1) data.set(vopsea(x, y), (y * latime + x) * 4);
  return { width: latime, height: inaltime, data };
}

const arie = (inel: InelPx) => Math.abs(inel.reduce((s, a, i) => { const b = inel[(i + 1) % inel.length]; return s + a.x * b.y - b.x * a.y; }, 0)) / 2;
const inCerc = (x: number, y: number, cx: number, cy: number, r: number) => Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r;

/** Imaginea 1, logo simplu: un disc si un dreptunghi, negru pe alb (ca tests/fixtures/logo/logo-simplu.png). */
const logoSimplu = imagine(200, 150, (x, y) => (inCerc(x, y, 60, 75, 40) || (x >= 115 && x < 185 && y >= 35 && y < 115) ? NEGRU : ALB));

/** Imaginea 2, logo cu goluri tip "o"/"a": un inel si o bucla cu gol lipita de un picior (ca logo-goluri.png). */
const logoGoluri = imagine(210, 130, (x, y) => {
  const o = inCerc(x, y, 55, 65, 45) && !inCerc(x, y, 55, 65, 22);
  const bucla = inCerc(x, y, 145, 80, 30) && !inCerc(x, y, 145, 80, 14);
  const picior = x >= 167 && x < 182 && y >= 30 && y < 110;
  return o || bucla || picior ? NEGRU : ALB;
});

/** Imaginea 3, "poza": degrade, zgomot determinist si o forma inchisa moale (ca poza.png). */
const poza = imagine(240, 180, (x, y) => {
  const zgomot = ((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1 + 1) % 1;
  const fundal = 140 + 100 * Math.min(1, Math.hypot(x - 100, y - 90) / 160) + (zgomot - 0.5) * 90;
  const forma = Math.hypot((x - 100) / 45, (y - 85) / 55) <= 1;
  const v = forma ? 40 + (zgomot - 0.5) * 30 : fundal;
  return [v, v, v, 255];
});

/** Trei culori pe alb (ca logo-culori.png). */
const logoCulori = imagine(210, 150, (x, y) => {
  if (x >= 15 && x < 95 && y >= 20 && y < 130) return [31, 138, 91, 255];
  if (inCerc(x, y, 150, 55, 40)) return [224, 69, 58, 255];
  if (x >= 110 && x < 195 && y >= 105 && y < 130) return [43, 79, 214, 255];
  return ALB;
});

describe("logo / desen -> contur (trei imagini de test)", () => {
  it("logo simplu: doua contururi inchise, fara goluri, cu ariile formelor", () => {
    const t = traseazaLogo(logoSimplu, OPTIUNI_IMPLICITE);
    expect(t.straturi).toHaveLength(1);
    const inele = t.straturi[0].inele.map(arie).sort((a, b) => a - b);
    expect(inele).toHaveLength(2);
    expect(inele[0]).toBeGreaterThan(Math.PI * 40 * 40 * 0.95);
    expect(inele[0]).toBeLessThan(Math.PI * 40 * 40 * 1.05);
    expect(inele[1]).toBeGreaterThan(70 * 80 * 0.95);
  });

  it("logo cu goluri: golurile din \"o\" si din bucla raman goluri (patru inele, doua interioare)", () => {
    const t = traseazaLogo(logoGoluri, OPTIUNI_IMPLICITE);
    const arii = t.straturi[0].inele.map(arie).sort((a, b) => a - b);
    expect(arii).toHaveLength(4);
    // Cele doua goluri: raza 14 si 22.
    expect(arii[0]).toBeGreaterThan(Math.PI * 14 * 14 * 0.85);
    expect(arii[0]).toBeLessThan(Math.PI * 14 * 14 * 1.15);
    expect(arii[1]).toBeGreaterThan(Math.PI * 22 * 22 * 0.9);
    expect(arii[1]).toBeLessThan(Math.PI * 22 * 22 * 1.1);
  });

  it("poza: zgomotul nu da pete, forma inchisa ramane un contur, sub limita de segmente", () => {
    const t = traseazaLogo(poza, OPTIUNI_IMPLICITE);
    const inele = t.straturi[0].inele;
    expect(inele.length).toBeLessThanOrEqual(2);
    expect(inele.reduce((s, inel) => s + inel.length, 0)).toBeLessThanOrEqual(LOGO.maxSegmente);
    // Fara pragul de pete, acelasi zgomot lasa mai multe contururi.
    const faraFiltru = traseazaLogo(poza, { ...OPTIUNI_IMPLICITE, zgomot: 0, netezire: 0 });
    expect(faraFiltru.straturi[0].inele.length).toBeGreaterThanOrEqual(inele.length);
  });

  it("inversarea conturează cealalta parte", () => {
    const t = traseazaLogo(logoSimplu, { ...OPTIUNI_IMPLICITE, inversare: true });
    // Partea alba: fundalul, cu cele doua forme ca goluri.
    expect(t.straturi[0].inele.length).toBe(3);
  });

  it("multicolor: trei culori devin trei straturi, fundalul alb nu e strat", () => {
    const t = traseazaLogo(logoCulori, { ...OPTIUNI_IMPLICITE, culori: 3 });
    expect(t.straturi).toHaveLength(3);
    const canal = (hex: string, i: number) => parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16);
    const gasit = (r: number, g: number, b: number) => t.straturi.some((s) => Math.abs(canal(s.culoare, 0) - r) < 24 && Math.abs(canal(s.culoare, 1) - g) < 24 && Math.abs(canal(s.culoare, 2) - b) < 24);
    expect(gasit(31, 138, 91)).toBe(true);
    expect(gasit(224, 69, 58)).toBe(true);
    expect(gasit(43, 79, 214)).toBe(true);
    // Silueta: toate cele trei forme.
    expect(t.silueta.length).toBe(3);
  });

  it("multicolor pe fundal transparent: fiecare culoare e strat", () => {
    // Ca un PNG exportat dintr-un program de grafica: formele pe transparent, cu margine transparenta.
    const transparent = imagine(140, 80, (x, y) => (y < 10 || y >= 70 ? [0, 0, 0, 0] : x >= 10 && x < 60 ? [200, 30, 30, 255] : x >= 80 && x < 130 ? [30, 30, 200, 255] : [0, 0, 0, 0]));
    expect(traseazaLogo(transparent, { ...OPTIUNI_IMPLICITE, culori: 2 }).straturi).toHaveLength(2);
  });

  it("tracer-ul editorului ramane neschimbat cand nu primeste optiunile noi", () => {
    const vechi = traceRasterRings(logoSimplu);
    const nou = traceRasterRings(logoSimplu, { smoothing: 1, maxSide: 1000 });
    expect(nou.rings.map((r) => r.length)).toEqual(vechi.rings.map((r) => r.length));
  });
});

describe("logo -> profil in mm", () => {
  it("latura mare a logo-ului are exact marimea ceruta, centrat in 0", () => {
    const t = traseazaLogo(logoSimplu, OPTIUNI_IMPLICITE);
    const cadru = cadruLogo(t, 60);
    expect(Math.max(cadru.latime, cadru.adancime)).toBeCloseTo(60, 6);
    const profil = profilDinInele(t.straturi[0].inele, cadru);
    const xs = profil.points.map((p) => p.x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(60, 1);
    expect((Math.max(...xs) + Math.min(...xs)) / 2).toBeCloseTo(0, 1);
  });

  it("oglindit (stampila): acelasi contur, intors stanga-dreapta", () => {
    const t = traseazaLogo(logoSimplu, OPTIUNI_IMPLICITE);
    const cadru = cadruLogo(t, 60);
    const drept = profilDinInele(t.straturi[0].inele, cadru);
    const oglindit = profilDinInele(t.straturi[0].inele, cadru, true);
    // Discul e in stanga imaginii: la drept media x e negativa pe partea lui, la oglindit pozitiva.
    const mediaX = (p: typeof drept) => p.points.reduce((s, q) => s + q.x, 0) / p.points.length;
    expect(Math.sign(mediaX(drept))).toBe(-Math.sign(mediaX(oglindit)));
  });

  it("dreptunghiul rotunjit al bazei si al ramei are marimea ceruta", () => {
    const inel = dreptunghiRotunjit(80, 50, 6);
    const xs = inel.map((p) => p.x);
    const ys = inel.map((p) => p.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(80, 6);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(50, 6);
  });
});

describe("configuratie, biblioteca si oferta", () => {
  it("valorile implicite ale fiecarei iesiri stau in limitele campurilor", () => {
    for (const tip of IESIRI) {
      const s = SETARI_IMPLICITE[tip];
      expect(s.tip).toBe(tip);
      expect(s.marime).toBeGreaterThanOrEqual(LIMITE.marime[0]);
      expect(s.marime).toBeLessThanOrEqual(LIMITE.marime[1]);
      if (tip !== "prajitura") {
        expect(s.baza).toBeGreaterThanOrEqual(LIMITE.baza[0]);
        expect(s.relief).toBeGreaterThanOrEqual(LIMITE.relief[0]);
      }
    }
  });

  it("\"Din poză sau logo\" e in biblioteca de forme, langa codul QR", () => {
    const ids = libraryShapeAssets.map((asset) => asset.id);
    expect(ids).toContain(logoAsset.id);
    expect(ids.indexOf(logoAsset.id)).toBe(ids.indexOf("qrCode") + 1);
  });

  it("mesajul de oferta scrie generatorul si, la cerere, mentiunea pentru firme cu linkul", () => {
    const baza = { nume: "Ana", telefon: "0700000000", oras: "București", material: "PLA", culoare: "", cantitate: 10, student: false, observatii: "", dimensiuni: "60 × 40 × 5 mm", volum: "", greutate: "", link: "https://magic3d.ro/oferta/d.php?id=x", zile: 20 };
    const cu = mesajOferta(OFERTA_IMPLICIT.mesaj, { ...baza, generator: "Din poză sau logo → Plăcuță cu logo", firma: true });
    expect(cu).toContain("Generator: Din poză sau logo → Plăcuță cu logo");
    expect(cu).toContain(LINK_FIRME);
    const fara = mesajOferta(OFERTA_IMPLICIT.mesaj, baza);
    expect(fara).not.toContain("Generator:");
    expect(fara).not.toContain("Firmă:");
  });
});

describe("panoul \"Din poză sau logo\"", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;
  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    container = null;
  });

  it("porneste cu alegerea imaginii; obiectul apare abia dupa contur", () => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() => root!.render(createElement(LogoPanel, { onClose: () => undefined, onCreate: async () => ({ id: "x", nume: "x" }) })));
    expect(container.querySelector("[data-testid='logo-alege']")).not.toBeNull();
    expect(container.querySelector("[data-testid='logo-fisier']")?.getAttribute("accept")).toContain("image/png");
    expect(container.querySelector("[data-testid='logo-adauga']")).toBeNull();
  });
});
