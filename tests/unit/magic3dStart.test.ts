// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { libraryShapeAssets } from "@/lib/shapeCatalog";
import { START } from "@/magic3d/start/config";
import { noteazaFormaInitiala, preiaFormaInitiala } from "@/magic3d/start/formaInitiala";
import { StartGeneratoare } from "@/magic3d/start/StartSectiuni";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement | null = null;
let root: Root | null = null;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = null;
  root = null;
  window.sessionStorage.clear();
});

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
