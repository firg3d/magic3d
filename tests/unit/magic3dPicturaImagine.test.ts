import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { FARA, proiecteazaDecal, reduceImagine } from "@/magic3d/pictura/imagine";
import { dreptunghi, inPoligon, selecteazaInPoligon } from "@/magic3d/pictura/selectie";
import { topologie } from "@/magic3d/pictura/topologie";
import type { PlasaPictura } from "@/magic3d/pictura/date";

function plasa(geom: THREE.BufferGeometry): PlasaPictura {
  return { varfuri: new Float32Array(geom.getAttribute("position").array as ArrayLike<number>), fete: new Uint32Array(geom.index!.array as ArrayLike<number>) };
}

/** Imagine RGBA din randuri de culori ("" = transparent). */
function imagine(randuri: string[][]) {
  const h = randuri.length, w = randuri[0].length;
  const px = new Uint8ClampedArray(w * h * 4);
  randuri.flat().forEach((c, i) => {
    if (!c) return;
    px.set([parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16), 255], i * 4);
  });
  return { px, w, h };
}

describe("pictura: imagine redusa la culorile paletei", () => {
  const R = "#d02020", B = "#2040c0", W = "#ffffff";
  const { px, w, h } = imagine([[R, R, B, B], [R, R, B, B], [W, W, "", ""]]);
  const paleta = ["#c8282e", "#1f5fbf", "#1f8a5b", "#f4f4f1"];

  it("alege cele mai apropiate filamente si nu trece de numarul cerut", () => {
    const r = reduceImagine(px, w, h, paleta, 3);
    expect(r.culori.length).toBeLessThanOrEqual(3);
    expect(r.culori).toEqual(expect.arrayContaining(["#c8282e", "#1f5fbf", "#f4f4f1"]));
    expect(r.culori[r.index[0]]).toBe("#c8282e");
    expect(r.culori[r.index[3]]).toBe("#1f5fbf");
    expect(r.index[10]).toBe(FARA); // transparent
    expect(reduceImagine(px, w, h, paleta, 1).culori).toHaveLength(1);
  });

  it("marginile netezite (multe nuante amestecate, fiecare rara) nu iau locul unei linii subtiri", () => {
    // 100x100: jumatate bej, jumatate rosu, o linie neagra de 2 px, si 60 de nuante de margine unice.
    const w = 100, h = 100;
    const px = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
      const c = y < 50 ? [232, 219, 183] : [193, 46, 31];
      px.set([...c, 255], (y * w + x) * 4);
    }
    for (let x = 10; x < 90; x += 1) for (const y of [70, 71]) px.set([10, 10, 10, 255], (y * w + x) * 4);
    for (let k = 0; k < 60; k += 1) px.set([120 + k * 2, 40 + k * 3, 200 - k * 2, 255], (49 * w + 20 + k) * 4);
    const r = reduceImagine(px, w, h, ["#f4f4f1", "#c8282e", "#1d1f1e", "#1f5fbf", "#f5c518", "#7b3fa0", "#ee7a1e"], 4);
    expect(r.culori).toContain("#1d1f1e");
    expect(r.culori[r.index[70 * w + 50]]).toBe("#1d1f1e");
  });

  it("fundalul cerut nu coloreaza nimic", () => {
    const r = reduceImagine(px, w, h, paleta, 3, "#ffffff");
    expect(r.index[8]).toBe(FARA);
    expect(r.culori).not.toContain("#f4f4f1");
  });
});

describe("pictura: imaginea proiectata pe model", () => {
  it("de sus, pe o placa: jumatatea stanga ia prima culoare, dreapta a doua, restul ramane", () => {
    const placa = plasa(new THREE.PlaneGeometry(40, 40, 40, 40).rotateX(-Math.PI / 2));
    const top = topologie(placa);
    const img = { latime: 2, inaltime: 1, culori: ["#ff0000", "#0000ff"], index: new Uint8Array([0, 1]) };
    // privit de sus, cu "sus"-ul imaginii spre -Z (departe de privitor)
    const r = proiecteazaDecal(top, img, { centru: [0, 0, 0], directie: [0, -1, 0], sus: [0, 0, -1], latime: 20, rotire: 0, mutare: [0, 0] });
    for (let t = 0; t < top.triunghiuri; t += 1) {
      const x = top.centre[t * 3], z = top.centre[t * 3 + 2];
      const inauntru = Math.abs(x) < 10 && Math.abs(z) < 5;
      if (!inauntru) expect(r[t]).toBe(FARA);
      else expect(r[t]).toBe(x < 0 ? 0 : 1);
    }
    // Rotita cu 180 de grade, culorile isi schimba partea.
    const rot = proiecteazaDecal(top, img, { centru: [0, 0, 0], directie: [0, -1, 0], sus: [0, 0, -1], latime: 20, rotire: 180, mutare: [0, 0] });
    const stanga = [...Array(top.triunghiuri).keys()].find((t) => top.centre[t * 3] < -2 && top.centre[t * 3] > -8 && Math.abs(top.centre[t * 3 + 2]) < 2)!;
    expect(rot[stanga]).toBe(1);
  });

  it("nu picteaza fetele intoarse de la proiector", () => {
    const cub = plasa(new THREE.BoxGeometry(10, 10, 10));
    const top = topologie(cub);
    const img = { latime: 1, inaltime: 1, culori: ["#ff0000"], index: new Uint8Array([0]) };
    const r = proiecteazaDecal(top, img, { centru: [0, 0, 0], directie: [0, -1, 0], sus: [0, 0, -1], latime: 100, rotire: 0, mutare: [0, 0] });
    for (let t = 0; t < top.triunghiuri; t += 1) expect(r[t] === 0).toBe(top.normale[t * 3 + 1] > 0.99);
  });
});

describe("pictura: selectie cu dreptunghi si lasou", () => {
  it("punct in poligon", () => {
    const patrat = dreptunghi([0, 0], [10, 10]);
    expect(inPoligon(5, 5, patrat)).toBe(true);
    expect(inPoligon(15, 5, patrat)).toBe(false);
    const L = [[0, 0], [10, 0], [10, 3], [3, 3], [3, 10], [0, 10]] as [number, number][];
    expect(inPoligon(2, 8, L)).toBe(true);
    expect(inPoligon(8, 8, L)).toBe(false);
  });

  it("pe sfera, privita din fata, ia numai triunghiurile din dreptunghi intoarse spre camera", () => {
    const sfera = plasa(new THREE.SphereGeometry(10, 32, 16));
    const top = topologie(sfera);
    const laEcran = (x: number, y: number): [number, number, boolean] => [x, -y, true]; // privire de-a lungul lui -Z, Y in sus
    const vizibile = selecteazaInPoligon(top, dreptunghi([-4, -4], [4, 4]), laEcran, [0, 0, 100]);
    const prin = selecteazaInPoligon(top, dreptunghi([-4, -4], [4, 4]), laEcran, null);
    expect(vizibile.length).toBeGreaterThan(0);
    expect(prin.length).toBeGreaterThan(vizibile.length); // si fetele din spate
    for (const t of vizibile) {
      expect(Math.abs(top.centre[t * 3])).toBeLessThanOrEqual(4);
      expect(top.centre[t * 3 + 2]).toBeGreaterThan(0);
    }
  });
});
