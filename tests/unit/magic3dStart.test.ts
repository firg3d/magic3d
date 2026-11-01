// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DESCHIDE_GENERATOARE, type CerereGeneratoare } from "@/magic3d/generatoare/GeneratoareButton";
import { cadru, IMPRIMANTA, PanouImprimanta } from "@/magic3d/start/PanouImprimanta";
import { libraryShapeAssets } from "@/lib/shapeCatalog";
import { START } from "@/magic3d/start/config";
import { noteazaFormaInitiala, preiaDeschidePictura, preiaFormaInitiala } from "@/magic3d/start/formaInitiala";
import { StartGeneratoare, StartPasi, StartPictura } from "@/magic3d/start/StartSectiuni";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement | null = null;
let root: Root | null = null;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = null;
  root = null;
  window.sessionStorage.clear();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function randeaza(element: ReturnType<typeof createElement>) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root!.render(element));
  return container;
}

describe("pagina de start Magic3D", () => {
  it("fiecare card de generator trimite la o forma care exista in biblioteca editorului", () => {
    const ids = new Set(libraryShapeAssets.map((asset) => asset.id));
    for (const generator of START.generatoare) expect(ids.has(generator.forma), generator.forma).toBe(true);
  });

  it("forma ceruta se preia o singura data", () => {
    noteazaFormaInitiala("gear");
    expect(preiaFormaInitiala()?.id).toBe("gear");
    expect(preiaFormaInitiala()).toBeNull();
  });

  it("o forma necunoscuta nu pune nimic pe plansa", () => {
    noteazaFormaInitiala("nu-exista");
    expect(preiaFormaInitiala()).toBeNull();
  });

  it("clicul pe un card noteaza forma si deschide un design nou", () => {
    let create = 0;
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() => root!.render(createElement(StartGeneratoare, { onCreate: () => void create++ })));
    expect(container.querySelectorAll("[data-testid^='start-generator-']")).toHaveLength(START.generatoare.length);
    act(() => (container!.querySelector("[data-testid='start-generator-qrCode']") as HTMLButtonElement).click());
    expect(create).toBe(1);
    expect(preiaFormaInitiala()?.id).toBe("qrCode");
  });
});

describe("pagina de start v2 (atelier)", () => {
  it("catalogul: fiecare rand de forma deschide editorul cu forma lui", () => {
    let create = 0;
    const c = randeaza(createElement(StartGeneratoare, { onCreate: () => void create++ }));
    for (const g of START.generatoare) {
      act(() => (c.querySelector(`[data-testid='start-generator-${g.forma}']`) as HTMLButtonElement).click());
      expect(preiaFormaInitiala()?.id, g.forma).toBe(g.forma);
    }
    act(() => (c.querySelector("[data-testid='start-logo']") as HTMLButtonElement).click());
    expect(preiaFormaInitiala()?.id).toBe("magic3dLogo");
    expect(create).toBe(START.generatoare.length + 1);
    // Numerotarea e continua, 01..NN, si fiecare rand are parametrul tehnic.
    const numere = [...c.querySelectorAll(".m3d-rand-numar")].map((n) => n.textContent);
    expect(numere[0]).toBe("01");
    expect(numere).toHaveLength(START.generatoare.length + 1 + START.personalizate.carduri.length + START.matrite.carduri.length);
    expect([...c.querySelectorAll(".m3d-rand-param")].every((p) => (p.textContent ?? "").length > 0)).toBe(true);
  });

  it("catalogul: randurile Personalizate si Matrite deschid editorul pe generatorul corect", () => {
    vi.useFakeTimers();
    let create = 0;
    const cerute: (string | undefined)[] = [];
    const asculta = (event: Event) => cerute.push((event as CustomEvent<CerereGeneratoare>).detail?.generator);
    window.addEventListener(DESCHIDE_GENERATOARE, asculta);
    const c = randeaza(createElement(StartGeneratoare, { onCreate: () => void create++ }));
    const asteptate = [...START.personalizate.carduri.map((x) => ["personalizat", x.generator]), ...START.matrite.carduri.map((x) => ["matrita", x.generator])];
    for (const [prefix, generator] of asteptate) {
      act(() => (c.querySelector(`[data-testid='start-${prefix}-${generator}']`) as HTMLButtonElement).click());
      act(() => void vi.advanceTimersByTime(1300));
    }
    window.removeEventListener(DESCHIDE_GENERATOARE, asculta);
    expect(create).toBe(asteptate.length);
    expect(cerute).toEqual(asteptate.map(([, g]) => g));
  });

  it("blocul Pictura deschide un design nou cu vaza, direct in modul Pictura", () => {
    let create = 0;
    const c = randeaza(createElement(StartPictura, { onCreate: () => void create++ }));
    const img = c.querySelector(".m3d-pictura-start-imagine img") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("/magic3d/start/pictura-vaza.png");
    expect(img.alt.length).toBeGreaterThan(10);
    expect(preiaDeschidePictura()).toBe(false);
    act(() => (c.querySelector("[data-testid='start-pictura']") as HTMLButtonElement).click());
    expect(create).toBe(1);
    expect(preiaFormaInitiala()?.id).toBe("vase");
    expect(preiaDeschidePictura()).toBe(true);
    expect(preiaDeschidePictura()).toBe(false);
  });

  it("butonul WhatsApp porneste cererea de oferta, cu numarul si mesajul atelierului", () => {
    const c = randeaza(createElement(StartPasi));
    const a = c.querySelector("[data-testid='start-whatsapp']") as HTMLAnchorElement;
    const url = new URL(a.href);
    expect(url.host).toBe("wa.me");
    expect(url.pathname).toBe(`/${START.whatsapp}`);
    expect([START.mesajWhatsApp.ro, START.mesajWhatsApp.en]).toContain(url.searchParams.get("text"));
    expect(a.target).toBe("_blank");
  });

  it("imprimanta: piesa creste si se termina in ciclul ei", () => {
    expect(cadru(0).strat).toBe(0);
    expect(cadru(IMPRIMANTA.print / 2).procent).toBe(50);
    const gata = cadru(IMPRIMANTA.print + 1);
    expect(gata.gata).toBe(true);
    expect(gata.strat).toBe(IMPRIMANTA.straturi);
    expect(gata.ramas).toBe("00:00");
    expect(cadru(IMPRIMANTA.print / 2).axaY).toBeGreaterThan(cadru(IMPRIMANTA.print / 4).axaY);
  });

  it("imprimanta: cu prefers-reduced-motion nu porneste animatia si ramane la 70%", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("reduce"), media: q, addEventListener() {}, removeEventListener() {} }));
    const raf = vi.spyOn(window, "requestAnimationFrame");
    const c = randeaza(createElement(PanouImprimanta));
    const panou = c.querySelector("[data-testid='start-imprimanta']") as HTMLElement;
    expect(panou.dataset.animat).toBe("nu");
    expect(raf).not.toHaveBeenCalled();
    expect((c.querySelector(".m3d-imprimanta-progres div") as HTMLElement).style.width).toBe("70%");
    vi.unstubAllGlobals();
  });

  it("imprimanta: fara miscare redusa, animatia porneste pe requestAnimationFrame", () => {
    const raf = vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 1);
    const c = randeaza(createElement(PanouImprimanta));
    expect((c.querySelector("[data-testid='start-imprimanta']") as HTMLElement).dataset.animat).toBe("da");
    expect(raf).toHaveBeenCalled();
  });

  it("tema Grafit aplica tokenurile, iar culorile stau doar in fisierul de tema", () => {
    const dir = path.resolve(__dirname, "../../apps/web/src/magic3d/start");
    const tema = readFileSync(path.join(dir, "tema.css"), "utf8");
    const grafit = tema.slice(tema.indexOf('html[data-theme="dark"] .m3d-start'));
    for (const [token, valoare] of [["--m3d-hartie", "#121815"], ["--m3d-grila", "#1b231e"], ["--m3d-cerneala", "#f4f2ec"], ["--m3d-verde", "#7fd1a8"]]) {
      expect(grafit).toMatch(new RegExp(`${token}:\\s*${valoare};`));
    }
    const asezare = readFileSync(path.join(dir, "start.css"), "utf8");
    expect(asezare.match(/#[0-9a-fA-F]{3,8}/g) ?? []).toEqual([]);
  });
});
