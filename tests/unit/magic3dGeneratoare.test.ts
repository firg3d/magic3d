import { readFileSync } from "node:fs";
import path from "node:path";
import ManifoldModule from "manifold-3d";
import opentype from "opentype.js";
import { beforeAll, describe, expect, it } from "vitest";
import { instrumenteazaArena, inArena } from "@/magic3d/core/geometry/arena";
import { GENERATOARE, parametriCompleti, PLACUTE } from "@/magic3d/generatoare/catalog";
import { areConstructor, construieste, triunghiuri } from "@/magic3d/generatoare/constructori";
import { esteMagic3dGenerat, type PiesaGenerata } from "@/magic3d/generatoare/tipuri";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { exportLylProject, importLylProject } from "@/lib/lylProject";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import type { WorkplaneShape } from "@/types/layerling";

const fonts = path.resolve(__dirname, "../../apps/web/public/magic3d/fonts");
let mod: unknown;

function font(fisier: string) {
  const bytes = readFileSync(path.join(fonts, fisier));
  return opentype.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
}

function limite(piesa: PiesaGenerata) {
  const p = piesa.positions;
  const b = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (let i = 0; i < p.length; i += 3) {
    b.minX = Math.min(b.minX, p[i]); b.maxX = Math.max(b.maxX, p[i]);
    b.minY = Math.min(b.minY, p[i + 1]); b.maxY = Math.max(b.maxY, p[i + 1]);
    b.minZ = Math.min(b.minZ, p[i + 2]); b.maxZ = Math.max(b.maxZ, p[i + 2]);
  }
  return b;
}

function genereaza(id: string, parametri: Record<string, string | number | boolean>, fisierFont: string) {
  return inArena(() => {
    const construit = construieste(id, parametri, mod, font(fisierFont));
    return { piese: triunghiuri(construit.piese), avertizari: construit.avertizari };
  }, () => []);
}

beforeAll(async () => {
  const m = await (ManifoldModule as unknown as () => Promise<{ setup(): void }>)();
  m.setup();
  instrumenteazaArena(m);
  mod = m;
});

describe("generatoarele Magic3D in editor", () => {
  it("are un constructor pentru fiecare generator din catalog, cu fontul implicit livrat", () => {
    for (const def of GENERATOARE) {
      expect(areConstructor(def.id), def.id).toBe(true);
      if (typeof def.implicit.font === "string") expect(() => readFileSync(path.join(fonts, def.implicit.font as string)), def.id).not.toThrow();
    }
  });

  it("completeaza parametrii salvati cu cei impliciti si ignora ce nu mai exista", () => {
    const p = parametriCompleti(PLACUTE, { text: "Ion", inaltimeText: "mare", vechi: 3 } as never);
    expect(p.text).toBe("Ion");
    expect(p.inaltimeText).toBe(PLACUTE.implicit.inaltimeText);
    expect("vechi" in p).toBe(false);
    expect(esteMagic3dGenerat({ generator: "placute", versiune: 1, parametri: p })).toBe(true);
    expect(esteMagic3dGenerat({ generator: "placute", versiune: 1, parametri: { x: {} } })).toBe(false);
  });

  it("construieste o placuta cu text: doua piese inchise, asezate pe placa", () => {
    const r = genereaza("placute", { ...PLACUTE.implicit, prindere: "gaura" }, "Baloo2-Regular.ttf");
    expect(r.piese).toHaveLength(2);
    for (const piesa of r.piese) {
      expect(piesa.positions.length % 9).toBe(0);
      // Volumul cu semn e pozitiv doar cu fetele spre exterior: o oglindire fara triunghiuri intoarse l-ar face negativ.
      const q = piesa.positions;
      let volum = 0;
      for (let i = 0; i < q.length; i += 9) {
        volum += (q[i] * (q[i + 4] * q[i + 8] - q[i + 5] * q[i + 7]) - q[i + 1] * (q[i + 3] * q[i + 8] - q[i + 5] * q[i + 6]) + q[i + 2] * (q[i + 3] * q[i + 7] - q[i + 4] * q[i + 6])) / 6;
      }
      expect(volum).toBeGreaterThan(0);
    }
    const placuta = limite(r.piese[0]);
    expect(placuta.minY).toBeCloseTo(0, 3);
    expect(placuta.maxY).toBeCloseTo(Number(PLACUTE.implicit.grosimePlacuta), 1);
    const text = limite(r.piese[1]);
    expect(text.maxY).toBeGreaterThan(placuta.maxY);
  });

  it("intoarce textul citibil din fata: tarusul spre privitor (+Z), piciorul lui L la dreapta jos", () => {
    const r = genereaza("placute", { ...PLACUTE.implicit, text: "L", prindere: "terus", lungimeTerus: 40 }, "Baloo2-Regular.ttf");
    const placuta = limite(r.piese[0]);
    const text = limite(r.piese[1]);
    // Tarusul iese sub text, adica spre fata scenei.
    expect(placuta.maxZ - text.maxZ).toBeGreaterThan(30);
    // Litera L: jos (spre +Z) e mai lata spre dreapta decat sus. Oglindita, ar fi invers.
    const p = r.piese[1].positions;
    const sus = { maxX: -Infinity };
    const jos = { maxX: -Infinity };
    const prag = (text.maxZ - text.minZ) * 0.2;
    for (let i = 0; i < p.length; i += 3) {
      if (p[i + 2] < text.minZ + prag) sus.maxX = Math.max(sus.maxX, p[i]);
      if (p[i + 2] > text.maxZ - prag) jos.maxX = Math.max(jos.maxX, p[i]);
    }
    expect(jos.maxX - sus.maxX).toBeGreaterThan(2);
  });

  it("pastreaza parametrii generatorului intr-un fisier .lyl, iar unii stricati il opresc", async () => {
    const meta = { generator: "placute", versiune: 1, parametri: { ...PLACUTE.implicit, text: "Ion" } };
    const box: WorkplaneShape = { id: "b", name: "Placuta", kind: "box", color: "#15803d", x: 0, z: 0, size: 20, width: 20, depth: 20, height: 3, rotation: 0, magic3d: meta };
    const pack = (shape: WorkplaneShape) => exportLylProject({
      projectName: "Gen", createdAt: 1_700_000_000_000, modifiedAt: 1_700_000_100_000, shapes: [shape],
      history: [editorHistoryEntry([shape], [])], historyIndex: 0, assets: [], workspace: DEFAULT_WORKPLANE_WORKSPACE,
      snapGrid: DEFAULT_SNAP_GRID, placementElevation: 0, savedViews: null, view: null,
    });
    const restored = await importLylProject(await pack(box));
    expect(restored.shapes[0].magic3d).toEqual(meta);
    await expect(importLylProject(await pack({ ...box, magic3d: { generator: "placute", versiune: 1, parametri: { x: [1] } } as never }))).rejects.toThrow(/magic3d/);
  });
});
