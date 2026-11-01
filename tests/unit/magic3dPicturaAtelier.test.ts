// @vitest-environment jsdom
import * as THREE from "three";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { meshForShape } from "@/lib/editorMeshCore";
import { exportMeshesToStl } from "@/lib/stlExport";
import { plasaDin, reaplicaPictura, type CorpPictat } from "@/magic3d/pictura/date";
import { importaPentruPictura } from "@/magic3d/pictura/importPictura";
import { culoriFaraStoc, detaliiOferta } from "@/magic3d/pictura/ofertaPictura";
import { PALETA_ATELIER } from "@/magic3d/pictura/paleta";
import { exportaPictura3mf } from "@/magic3d/pictura/pictura3mf";
import { topologie } from "@/magic3d/pictura/topologie";
import { preiaDeschidePictura, preiaFisierPictura } from "@/magic3d/start/formaInitiala";
import { StartPictura } from "@/magic3d/start/StartSectiuni";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function corp(geom: THREE.BufferGeometry, nume: string): CorpPictat {
  const varfuri = new Float32Array(geom.getAttribute("position").array as ArrayLike<number>);
  const fete = new Uint32Array(geom.index!.array as ArrayLike<number>);
  return { id: nume, nume, varfuri, fete, culori: new Uint8Array(fete.length / 3) };
}

describe("pictura: import pentru Pictura", () => {
  it("un 3MF colorat intra cu culorile pe triunghi, care se reaplica pe corpul din editor", async () => {
    const c = corp(new THREE.SphereGeometry(10, 24, 12).translate(40, 10, -5), "Bila");
    const t = topologie(c);
    for (let i = 0; i < t.triunghiuri; i += 1) c.culori[i] = t.centre[i * 3 + 1] > 10 ? 2 : t.centre[i * 3] > 40 ? 1 : 0;
    const bytes = exportaPictura3mf([c], [{ culoare: "#f4f4f1" }, { culoare: "#c8282e" }, { culoare: "#1f5fbf" }], "Bila");
    const r = await importaPentruPictura(new File([bytes as BlobPart], "bila.3mf"));
    expect(r.pictat).toBe(true);
    expect(r.sloturi).toEqual(["#f4f4f1", "#c8282e", "#1f5fbf"]);
    expect(r.forme).toHaveLength(1);
    const f = r.forme[0];
    expect(f.kind).toBe("mesh");
    // Centrat pe plansa si pus pe ea.
    expect(Math.abs(f.x)).toBeLessThan(1e-6);
    expect(Math.abs(f.z)).toBeLessThan(1e-6);
    expect(f.elevation).toBeCloseTo(0, 6);
    const m = meshForShape(f);
    expect(reaplicaPictura(f.pictura!, plasaDin(m.vertices, m.faces))).toEqual(c.culori);
  });

  it("un STL intra ca un singur corp, fara pictura", async () => {
    const forma = { id: "b", name: "Cub", kind: "box", color: "#15803d", x: 0, z: 0, size: 10, width: 10, depth: 10, height: 10, rotation: 0 } as const;
    const m = meshForShape(forma);
    const stl = exportMeshesToStl([{ name: "cub", vertices: m.vertices, faces: m.faces }]);
    const r = await importaPentruPictura(new File([stl as BlobPart], "cub.stl"));
    expect(r.pictat).toBe(false);
    expect(r.forme).toHaveLength(1);
    expect(r.forme[0].pictura).toBeUndefined();
  });

  it("un OBJ cu doua materiale devine un corp cu doua sloturi", async () => {
    const obj = [
      "mtllib x.mtl",
      "v 0 0 0", "v 10 0 0", "v 0 10 0", "v 10 10 0",
      "v 20 0 0", "v 30 0 0", "v 20 10 0",
      "usemtl rosu", "f 1 2 3", "f 2 4 3",
      "usemtl albastru", "f 5 6 7",
    ].join("\n");
    // Culorile pe varf (OBJ extins) sunt citite fara .mtl.
    const objCulori = obj.replace(/^v (\S+) (\S+) (\S+)$/gm, (_l, x) => `v ${x} ${_l.split(" ")[2]} ${_l.split(" ")[3]} ${Number(x) < 15 ? "0.8 0.1 0.1" : "0.1 0.2 0.8"}`);
    const r = await importaPentruPictura(new File([objCulori], "doua.obj"));
    expect(r.forme).toHaveLength(1);
    expect(r.sloturi.length).toBe(2);
    expect(r.pictat).toBe(true);
  });

  it("refuza alte formate", async () => {
    await expect(importaPentruPictura(new File(["x"], "poza.png"))).rejects.toThrow();
  });
});

describe("pictura: legatura cu atelierul", () => {
  const pe_stoc = PALETA_ATELIER.filamente.filter((f) => f.disponibil);
  const lipsa = PALETA_ATELIER.filamente.find((f) => !f.disponibil)!;

  it("culorile folosite care nu sunt pe stoc primesc cel mai apropiat filament disponibil", () => {
    const sloturi = [pe_stoc[0].hex, "#d03035", lipsa.hex, "#123456"];
    const r = culoriFaraStoc(sloturi, [10, 5, 3, 0]);
    expect(r.map((x) => x.slot)).toEqual([1, 2]); // slotul 4 nu e folosit
    expect(r[0].propunere.nume).toBe("Roșu");
    expect(r.every((x) => x.propunere.disponibil)).toBe(true);
    expect(culoriFaraStoc([pe_stoc[0].hex, pe_stoc[1].hex], [1, 1])).toEqual([]);
  });

  it("mesajul de oferta are filamentele (nume + material), numarul de culori si schimbarile", () => {
    const d = detaliiOferta([pe_stoc[0].hex, pe_stoc[3].hex, "#d03035"], [10, 4, 2], 37);
    expect(d).toContain(`1 ${pe_stoc[0].nume} (${pe_stoc[0].material})`);
    expect(d).toContain(`2 ${pe_stoc[3].nume} (${pe_stoc[3].material})`);
    expect(d).toContain("3 #D03035");
    expect(d).toMatch(/3 (culori|colours)/);
    expect(d).toContain("37");
    expect(d).toMatch(/3 → Roșu/);
  });
});

describe("pagina de start: cardul Coloreaza un model", () => {
  it("fisierul ales ajunge la editor, care se deschide in modul Pictura", () => {
    const div = document.createElement("div");
    document.body.append(div);
    const root = createRoot(div);
    let create = 0;
    act(() => root.render(createElement(StartPictura, { onCreate: () => void create++ })));
    const input = div.querySelector("[data-testid='start-coloreaza-fisier']") as HTMLInputElement;
    expect(input.accept).toContain(".3mf");
    const f = new File(["solid x"], "piesa.stl");
    Object.defineProperty(input, "files", { value: [f], configurable: true });
    act(() => input.dispatchEvent(new Event("change", { bubbles: true })));
    expect(create).toBe(1);
    expect(preiaFisierPictura()).toBe(f);
    expect(preiaFisierPictura()).toBeNull();
    expect(preiaDeschidePictura()).toBe(true);
    act(() => root.unmount());
    div.remove();
  });
});
