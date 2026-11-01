// @vitest-environment jsdom
import * as THREE from "three";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { codeazaStare, decodeazaStare } from "@/magic3d/pictura/culoarePeTriunghi";
import { aceeasiPlasa, amprentaPlasei, codeazaCulori, decodeazaCulori, estePicturaSalvata, reaplicaPictura, salveazaPictura, type CorpPictat, type PlasaPictura } from "@/magic3d/pictura/date";
import { inSfera, subPensula, topologie, zonaGaleata } from "@/magic3d/pictura/topologie";
import { citestePictura3mf, exportaPictura3mf } from "@/magic3d/pictura/pictura3mf";
import { PALETA_ATELIER, estePaleta, sloturiInitiale } from "@/magic3d/pictura/paleta";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { meshForShape } from "@/lib/editorMeshCore";
import { exportLylProject, importLylProject } from "@/lib/lylProject";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import { plasaDin } from "@/magic3d/pictura/date";
import type { WorkplaneShape } from "@/types/layerling";

function plasa(geom: THREE.BufferGeometry, m?: THREE.Matrix4): PlasaPictura {
  const g = geom.index ? geom : geom;
  if (m) g.applyMatrix4(m);
  const poz = g.getAttribute("position");
  const varfuri = new Float32Array(poz.array as ArrayLike<number>);
  const fete = g.index ? new Uint32Array(g.index.array as ArrayLike<number>) : new Uint32Array(poz.count).map((_, i) => i);
  return { varfuri, fete };
}

const cub = () => plasa(new THREE.BoxGeometry(10, 10, 10));
const cilindru = () => plasa(new THREE.CylinderGeometry(5, 5, 10, 24, 1));
const sfera = () => plasa(new THREE.SphereGeometry(5, 32, 16));
const corp = (p: PlasaPictura, nume = "Corp"): CorpPictat => ({ ...p, id: nume, nume, culori: new Uint8Array(p.fete.length / 3) });

/** Triunghiurile cu normala aproape egala cu `n`. */
function cuNormala(p: PlasaPictura, n: [number, number, number]) {
  const top = topologie(p);
  const out: number[] = [];
  for (let t = 0; t < top.triunghiuri; t += 1) if (top.normale[t * 3] * n[0] + top.normale[t * 3 + 1] * n[1] + top.normale[t * 3 + 2] * n[2] > 0.999) out.push(t);
  return out;
}

/** Codul unui sir de biti, cum il scrie slicerul (vezi culoarePeTriunghi.ts). */
function cod(biti: number[]) {
  const b = [...biti];
  while (b.length % 4) b.push(0);
  let s = "";
  for (let i = 0; i < b.length; i += 4) s = (b[i] | (b[i + 1] << 1) | (b[i + 2] << 2) | (b[i + 3] << 3)).toString(16).toUpperCase() + s;
  return s;
}
const frunza = (stare: number) => (stare < 3 ? [0, 0, stare & 1, (stare >> 1) & 1] : [0, 0, 1, 1, ...[0, 1, 2, 3].map((k) => ((stare - 3) >> k) & 1)]);

describe("pictura: codul paint_color", () => {
  it("starile au codurile din fisierele Bambu Studio", () => {
    expect(codeazaStare(0)).toBe("");
    expect(codeazaStare(1)).toBe("4");
    expect(codeazaStare(2)).toBe("8");
    expect(codeazaStare(3)).toBe("0C");
    expect(codeazaStare(5)).toBe("2C");
    expect(codeazaStare(10)).toBe("7C");
    expect(codeazaStare(16)).toBe("DC");
    for (let s = 0; s <= 16; s += 1) expect(decodeazaStare(codeazaStare(s))).toBe(s);
    expect(() => codeazaStare(17)).toThrow();
  });

  it("un triunghi impartit de slicer ia culoarea care il acopera cel mai mult", () => {
    // 3 copii (2 laturi impartite): starile 2, 7, 7 -> 7.
    expect(decodeazaStare(cod([0, 1, 0, 0, ...frunza(7), ...frunza(7), ...frunza(2)]))).toBe(7);
    // 2 copii, al doilea impartit in 2: starea 1 acopera 1/2 + 1/4, starea 4 doar 1/4.
    expect(decodeazaStare(cod([1, 0, 0, 0, ...frunza(1), 1, 0, 0, 0, ...frunza(4), ...frunza(1)]))).toBe(1);
    // Aceeasi impartire, cu 4 pe trei sferturi.
    expect(decodeazaStare(cod([1, 0, 0, 0, ...frunza(4), 1, 0, 0, 0, ...frunza(4), ...frunza(1)]))).toBe(4);
  });
});

describe("pictura: pensula", () => {
  it("pe cub, in mijlocul fetei de sus, coloreaza exact cele doua triunghiuri ale fetei", () => {
    const p = cub();
    const top = topologie(p);
    const sus = cuNormala(p, [0, 1, 0]);
    expect(sus).toHaveLength(2);
    for (const mod of ["vizibil", "prin"] as const) {
      expect(subPensula(top, sus[0], [0, 5, 0], 3, mod, [0, 1, 0]).sort()).toEqual([...sus].sort());
    }
  });

  it("'doar fete vizibile' nu trece pe laturi, 'prin model' ia tot ce e in sfera", () => {
    const p = cub();
    const top = topologie(p);
    const sus = cuNormala(p, [0, 1, 0]);
    expect(subPensula(top, sus[0], [0, 5, 0], 9, "vizibil", [0, 1, 0]).sort()).toEqual([...sus].sort());
    expect(subPensula(top, sus[0], [0, 0, 0], 6, "prin")).toHaveLength(12);
    expect(inSfera(top, [0, 0, 0], 6)).toHaveLength(12);
  });

  it("pe sfera, pensula ia numai triunghiurile apropiate, legate si intoarse spre camera", () => {
    const p = sfera();
    const top = topologie(p);
    const lovit = (() => {
      let best = 0, d = -Infinity;
      for (let t = 0; t < top.triunghiuri; t += 1) if (top.normale[t * 3] > d) { d = top.normale[t * 3]; best = t; }
      return best;
    })();
    const ales = subPensula(top, lovit, [5, 0, 0], 1.5, "vizibil", [1, 0, 0]);
    expect(ales).toContain(lovit);
    for (const t of ales) {
      expect(Math.hypot(top.centre[t * 3] - 5, top.centre[t * 3 + 1], top.centre[t * 3 + 2])).toBeLessThanOrEqual(1.5);
      expect(top.normale[t * 3]).toBeGreaterThan(0);
    }
    expect(ales.length).toBeLessThan(top.triunghiuri / 10);
  });
});

describe("pictura: galeata", () => {
  it("pe cilindru se opreste la muchiile ascutite: capacul singur, apoi peretele singur", () => {
    const p = cilindru();
    const top = topologie(p);
    const capac = cuNormala(p, [0, 1, 0]);
    expect(capac).toHaveLength(24);
    expect(zonaGaleata(top, capac[0], "muchii", 30).sort((a, b) => a - b)).toEqual([...capac].sort((a, b) => a - b));
    // Peretele: 48 de triunghiuri, intre doua segmente vecine 15 grade.
    const perete = [...Array(top.triunghiuri).keys()].filter((t) => Math.abs(top.normale[t * 3 + 1]) < 0.01);
    expect(perete).toHaveLength(48);
    expect(zonaGaleata(top, perete[0], "muchii", 30).sort((a, b) => a - b)).toEqual(perete);
    // Cu un unghi sub 15 grade, peretele se opreste la prima muchie (cele doua triunghiuri ale segmentului).
    expect(zonaGaleata(top, perete[0], "muchii", 10)).toHaveLength(2);
  });

  it("pe cub, cu 90 de grade umple tot; cu 45 doar fata", () => {
    const p = cub();
    const top = topologie(p);
    expect(zonaGaleata(top, 0, "muchii", 90)).toHaveLength(12);
    expect(zonaGaleata(top, 0, "muchii", 45)).toHaveLength(2);
  });

  it("'aceeasi culoare' inlocuieste numai zona legata de culoarea de start", () => {
    const p = sfera();
    const top = topologie(p);
    const culori = new Uint8Array(top.triunghiuri);
    for (let t = 0; t < top.triunghiuri; t += 1) if (top.centre[t * 3 + 1] > 1) culori[t] = 2;
    const start = culori.indexOf(2);
    const zona = zonaGaleata(top, start, "culoare", 0, culori);
    expect(zona.length).toBe(culori.filter((c) => c === 2).length);
    expect(zona.every((t) => culori[t] === 2)).toBe(true);
  });
});

describe("pictura: salvarea in proiect", () => {
  it("culorile pe sarituri se citesc inapoi identic", () => {
    const c = new Uint8Array(100_000);
    c.fill(3, 10, 50_000);
    c[77_777] = 15;
    const text = codeazaCulori(c);
    expect(text.length).toBeLessThan(40);
    expect(decodeazaCulori(text, c.length)).toEqual(c);
    expect(decodeazaCulori(text, c.length + 1)).toBeNull();
    expect(decodeazaCulori("nu e base64!", 10)).toBeNull();
  });

  it("pictura se reaplica dupa mutare si rotire, dar nu dupa o schimbare de marime", () => {
    const c = corp(sfera());
    c.culori.fill(1, 0, 100);
    const salvata = salveazaPictura(c, ["#ffffff", "#ff0000"]);
    expect(estePicturaSalvata(JSON.parse(JSON.stringify(salvata)))).toBe(true);
    const mutata = plasa(new THREE.SphereGeometry(5, 32, 16), new THREE.Matrix4().makeRotationY(0.7).setPosition(30, 2, -11));
    expect(reaplicaPictura(salvata, mutata)).toEqual(c.culori);
    const marita = plasa(new THREE.SphereGeometry(5.2, 32, 16));
    expect(aceeasiPlasa(salvata.amprenta, amprentaPlasei(marita))).toBe(false);
    expect(reaplicaPictura(salvata, marita)).toBeNull();
    expect(reaplicaPictura(salvata, cub())).toBeNull();
  });
});

describe("pictura: 3MF multicolor", () => {
  const pictat = () => {
    const a = corp(cub(), "Cub");
    const top = topologie(a);
    zonaGaleata(top, cuNormala(a, [0, 1, 0])[0], "muchii", 30).forEach((t) => (a.culori[t] = 1));
    zonaGaleata(top, cuNormala(a, [1, 0, 0])[0], "muchii", 30).forEach((t) => (a.culori[t] = 2));
    const b = corp(cilindru(), "Cilindru");
    for (let t = 0; t < b.culori.length; t += 1) b.culori[t] = t % 4;
    return [a, b];
  };
  const sloturi = [{ culoare: "#f4f4f1", nume: "Alb", material: "PLA" }, { culoare: "#c8282e", nume: "Rosu", material: "PLA" }, { culoare: "#1f5fbf" }, { culoare: "#f5c518" }];

  it("fiecare triunghi poarta paint_color pentru slotul lui; slotul 1 ramane extruderul obiectului", () => {
    const [a] = pictat();
    const model = strFromU8(unzipSync(exportaPictura3mf([a], sloturi, "Test"))["3D/3dmodel.model"]);
    const tri = [...model.matchAll(/<triangle [^>]*\/>/g)].map((m) => m[0]);
    expect(tri).toHaveLength(12);
    tri.forEach((t, i) => {
      const slot = a.culori[i];
      expect(t).toContain(`p1="${slot}"`);
      if (slot === 0) expect(t).not.toContain("paint_color");
      else expect(t).toContain(`paint_color="${codeazaStare(slot + 1)}"`);
    });
    expect(model).toContain('<metadata name="Magic3D:Filamente">1:#F4F4F1 Alb (PLA); 2:#C8282E Rosu (PLA)');
  });

  it("export -> import in Magic3D: aceleasi culori pe aceleasi triunghiuri, aceleasi sloturi", () => {
    const corpuri = pictat();
    for (const pentru of ["bambu", "prusa"] as const) {
      const citit = citestePictura3mf(exportaPictura3mf(corpuri, sloturi, "Test", pentru), "Test");
      expect(citit.pictat).toBe(true);
      expect(citit.corpuri.map((c) => c.nume)).toEqual(["Cub", "Cilindru"]);
      citit.corpuri.forEach((c, i) => {
        expect(c.culori).toEqual(corpuri[i].culori);
        // Aceeasi geometrie, triunghi cu triunghi.
        const t0 = topologie(corpuri[i]);
        const t1 = topologie(c);
        for (let k = 0; k < t0.centre.length; k += 1) expect(t1.centre[k]).toBeCloseTo(t0.centre[k], 4);
      });
      expect(citit.sloturi.map((s) => s.culoare)).toEqual(sloturi.map((s) => s.culoare));
      expect(citit.sloturi[0].nume).toBe("Alb");
    }
  });

  it("varianta PrusaSlicer scrie acelasi cod in slic3rpe:mmu_segmentation", () => {
    const [a] = pictat();
    const model = strFromU8(unzipSync(exportaPictura3mf([a], sloturi, "", "prusa"))["3D/3dmodel.model"]);
    expect(model).toContain('slic3rpe:mmu_segmentation="8"');
    expect(model).not.toContain("paint_color");
  });

  it("un 3MF colorat fara pictura (colorgroup) isi pastreaza culorile ca sloturi", () => {
    const [a] = pictat();
    const bytes = exportaPictura3mf([a], sloturi);
    const fisiere = unzipSync(bytes);
    const model = strFromU8(fisiere["3D/3dmodel.model"]).replace(/ paint_color="[0-9A-F]+"/g, "");
    const fara = zipSync({ ...fisiere, "3D/3dmodel.model": strToU8(model), "Metadata/magic3d_pictura.json": strToU8("{}") });
    const citit = citestePictura3mf(fara);
    expect(citit.pictat).toBe(false);
    const c = citit.corpuri[0].culori;
    // Aceleasi grupuri de triunghiuri, culorile in ordinea in care apar.
    for (let i = 0; i < c.length; i += 1) for (let j = 0; j < c.length; j += 1) expect(c[i] === c[j]).toBe(a.culori[i] === a.culori[j]);
    expect(new Set(citit.sloturi.slice(0, 3).map((s) => s.culoare))).toEqual(new Set(sloturi.slice(0, 3).map((s) => s.culoare)));
  });
});

describe("pictura: paleta atelierului", () => {
  it("fisierul de config are 12 filamente exemplu, cu sincronizarea oprita", () => {
    expect(estePaleta(PALETA_ATELIER)).toBe(true);
    expect(PALETA_ATELIER.exemplu).toBe(true);
    expect(PALETA_ATELIER.filamente).toHaveLength(12);
    expect(PALETA_ATELIER.sincronizare.activ).toBe(false);
  });

  it("sloturile incep cu culoarea corpului si nu folosesc filamente care lipsesc", () => {
    const s = sloturiInitiale("#C8282E", 6);
    expect(s[0]).toBe("#c8282e");
    expect(s).toHaveLength(6);
    expect(new Set(s).size).toBe(6);
    const lipsa = PALETA_ATELIER.filamente.filter((f) => !f.disponibil).map((f) => f.hex);
    expect(s.slice(1).some((x) => lipsa.includes(x))).toBe(false);
  });
});

describe("pictura: in proiect (.lyl)", () => {
  const pack = (shape: WorkplaneShape) => exportLylProject({
    projectName: "Pictura", createdAt: 1_700_000_000_000, modifiedAt: 1_700_000_100_000, shapes: [shape],
    history: [editorHistoryEntry([shape], [])], historyIndex: 0, assets: [], workspace: DEFAULT_WORKPLANE_WORKSPACE,
    snapGrid: DEFAULT_SNAP_GRID, placementElevation: 0, savedViews: null, view: null,
  });
  const box: WorkplaneShape = { id: "b", name: "Cub", kind: "box", color: "#15803d", x: 0, z: 0, size: 20, width: 20, depth: 20, height: 20, rotation: 0 };

  it("pictura unui corp se salveaza si se reaplica pe corpul din editor, si dupa o mutare", async () => {
    const mesh = meshForShape(box);
    const c = corp(plasaDin(mesh.vertices, mesh.faces));
    c.culori.fill(2, 0, 4);
    const pictura = salveazaPictura(c, ["#15803d", "#c8282e", "#1f5fbf"]);
    const restored = (await importLylProject(await pack({ ...box, pictura }))).shapes[0];
    expect(restored.pictura).toEqual(pictura);
    const mutat = { ...restored, x: 37, z: -12, elevation: 4, rotation: 30 };
    const m2 = meshForShape(mutat);
    expect(reaplicaPictura(restored.pictura!, plasaDin(m2.vertices, m2.faces))).toEqual(c.culori);
    const marit = meshForShape({ ...restored, width: 30, size: 30 });
    expect(reaplicaPictura(restored.pictura!, plasaDin(marit.vertices, marit.faces))).toBeNull();
  });

  it("o pictura stricata opreste citirea proiectului", async () => {
    await expect(importLylProject(await pack({ ...box, pictura: { amprenta: { triunghiuri: 1 }, culori: 3, sloturi: [] } as never }))).rejects.toThrow(/pictura/);
  });
});
