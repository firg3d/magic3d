// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { SustineButon, SustineNota } from "@/magic3d/sustine/SustineButon";
import { CHEIE_ASCUNS, EXPORT_REUSIT, linkSustinere, numaraExport, type Pastrare } from "@/magic3d/sustine/config";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const BAZA = "https://praktik3d.ro/products/token-suporter-magic3d-sus%C8%9Bine-dezvoltarea?utm_source=magic3d&utm_medium=editor";

/** Un localStorage de proba, ca testele sa nu depinda de cel al mediului. */
function memorie(): Pastrare & { date: Map<string, string> } {
  const date = new Map<string, string>();
  return { date, getItem: (k) => date.get(k) ?? null, setItem: (k, v) => void date.set(k, v) };
}

let container: HTMLDivElement | null = null;
let root: Root | null = null;
function monteaza(element: ReturnType<typeof createElement>) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(element));
  return container;
}
afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = null;
  root = null;
});

const exporta = (format: string) => act(() => {
  window.dispatchEvent(new CustomEvent(EXPORT_REUSIT, { detail: { format } }));
});

describe("Susține Magic3D", () => {
  it("pune pe fiecare loc utm_content-ul lui si pastreaza restul adresei", () => {
    for (const loc of ["support-footer", "support-menu", "support-after-export"] as const) {
      const url = new URL(linkSustinere(loc, BAZA)!);
      expect(url.searchParams.get("utm_content")).toBe(loc);
      expect(url.searchParams.get("utm_source")).toBe("magic3d");
      expect(url.pathname).toBe("/products/token-suporter-magic3d-sus%C8%9Bine-dezvoltarea");
    }
    expect(linkSustinere("support-footer", "")).toBeNull();
    expect(linkSustinere("support-footer", "nu e o adresa")).toBeNull();
  });

  it("arata butonul cand adresa e setata, intr-un tab nou, si nimic cand lipseste", () => {
    for (const [loc, varianta] of [["support-footer", "subsol"], ["support-menu", "meniu"]] as const) {
      const cu = monteaza(createElement(SustineButon, { loc, varianta, baza: BAZA }));
      const a = cu.querySelector<HTMLAnchorElement>(`[data-testid="sustine-${loc}"]`)!;
      expect(a).not.toBeNull();
      expect(new URL(a.href).searchParams.get("utm_content")).toBe(loc);
      expect(a.target).toBe("_blank");
      expect(a.rel).toContain("noopener");
      act(() => root!.unmount());
      cu.remove();
      const fara = monteaza(createElement(SustineButon, { loc, varianta, baza: "" }));
      expect(fara.querySelector(`[data-testid="sustine-${loc}"]`)).toBeNull();
    }
  });

  it("numara exporturile: nota la primul, apoi o data la 10", () => {
    const store = memorie();
    const aparitii = Array.from({ length: 25 }, () => numaraExport(store));
    expect(aparitii.map((v, i) => (v ? i + 1 : 0)).filter(Boolean)).toEqual([1, 11, 21]);
    store.setItem(CHEIE_ASCUNS, "1");
    expect(Array.from({ length: 20 }, () => numaraExport(store)).some(Boolean)).toBe(false);
    expect(numaraExport(null)).toBe(false);
  });

  it("nota apare dupa un export STL/3MF/STEP, nu dupa SVG, si se inchide", () => {
    const store = memorie();
    const c = monteaza(createElement(SustineNota, { baza: BAZA, store }));
    exporta("SVG");
    expect(c.querySelector('[data-testid="sustine-nota"]')).toBeNull();
    exporta("STL");
    const link = c.querySelector<HTMLAnchorElement>('[data-testid="sustine-support-after-export"]')!;
    expect(new URL(link.href).searchParams.get("utm_content")).toBe("support-after-export");
    act(() => c.querySelector<HTMLButtonElement>('[data-testid="sustine-nota-inchide"]')!.click());
    expect(c.querySelector('[data-testid="sustine-nota"]')).toBeNull();
    // Urmatoarele noua exporturi nu o mai aduc; al 11-lea da.
    for (let i = 0; i < 9; i += 1) exporta("3MF");
    expect(c.querySelector('[data-testid="sustine-nota"]')).toBeNull();
    exporta("STEP");
    expect(c.querySelector('[data-testid="sustine-nota"]')).not.toBeNull();
  });

  it("„Nu mai arăta” o opreste de tot", () => {
    const store = memorie();
    const c = monteaza(createElement(SustineNota, { baza: BAZA, store }));
    exporta("STL");
    act(() => c.querySelector<HTMLButtonElement>('[data-testid="sustine-nota-nu-mai"]')!.click());
    expect(store.date.get(CHEIE_ASCUNS)).toBe("1");
    for (let i = 0; i < 30; i += 1) exporta("STL");
    expect(c.querySelector('[data-testid="sustine-nota"]')).toBeNull();
  });

  it("fara adresa, nota nu apare niciodata", () => {
    const c = monteaza(createElement(SustineNota, { baza: "", store: memorie() }));
    exporta("STL");
    expect(c.querySelector('[data-testid="sustine-nota"]')).toBeNull();
  });
});
