// @vitest-environment jsdom
/*
 * Fisierele de proba ale modului Pictura (docs/pictura-3mf.md): un cub si un cilindru pictati in
 * 4 sloturi, exportati pentru Bambu/Orca si pentru PrusaSlicer. Forme proprii, generate aici.
 *
 *   PICTURA_OUT=<dosar> npx vitest run --config tests/vitest.tools.config.ts tests/tools/picturaProba.tool.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import * as THREE from "three";
import { it } from "vitest";
import type { CorpPictat } from "@/magic3d/pictura/date";
import { exportaPictura3mf } from "@/magic3d/pictura/pictura3mf";
import { topologie, zonaGaleata } from "@/magic3d/pictura/topologie";
import { calculeazaModel, cutieVarfuri } from "@/magic3d/pictura/modele";
import { PRESETARI } from "@/magic3d/pictura/presetari";
import { FARA, proiecteazaDecal, reduceImagine } from "@/magic3d/pictura/imagine";
import { subdivizeaza, sudeazaVarfuri } from "@/magic3d/pictura/retusare";

function corp(geom: THREE.BufferGeometry, nume: string, x: number): CorpPictat {
  geom.translate(x, 0, 0);
  const poz = geom.getAttribute("position");
  const varfuri = new Float32Array(poz.array as ArrayLike<number>);
  const fete = new Uint32Array(geom.index!.array as ArrayLike<number>);
  return { id: nume, nume, varfuri, fete, culori: new Uint8Array(fete.length / 3) };
}

function fata(c: CorpPictat, normala: [number, number, number], slot: number) {
  const top = topologie(c);
  let start = -1;
  for (let t = 0; t < top.triunghiuri && start < 0; t += 1) {
    if (top.normale[t * 3] * normala[0] + top.normale[t * 3 + 1] * normala[1] + top.normale[t * 3 + 2] * normala[2] > 0.999) start = t;
  }
  zonaGaleata(top, start, "muchii", 30).forEach((t) => (c.culori[t] = slot));
}

it("scrie fisierele de proba", () => {
  const out = process.env.PICTURA_OUT ?? path.resolve("tmp/pictura");
  mkdirSync(out, { recursive: true });
  // Cubul: 20 mm, baza pe pat (Y in sus in editor); sus rosu, o latura albastra, alta galbena.
  const cub = corp(new THREE.BoxGeometry(20, 20, 20).translate(0, 10, 0), "Cub", -15);
  fata(cub, [0, 1, 0], 1);
  fata(cub, [1, 0, 0], 2);
  fata(cub, [0, 0, 1], 3);
  // Cilindrul: capacul rosu, peretele in dungi orizontale (pe inaltime) alb/galben.
  const cil = corp(new THREE.CylinderGeometry(8, 8, 20, 48, 8).translate(0, 10, 0), "Cilindru", 15);
  const top = topologie(cil);
  for (let t = 0; t < top.triunghiuri; t += 1) {
    const ny = top.normale[t * 3 + 1];
    if (ny > 0.99) cil.culori[t] = 1;
    else if (Math.abs(ny) < 0.01) cil.culori[t] = Math.floor(top.centre[t * 3 + 1] / 2.5) % 2 === 0 ? 0 : 3;
  }
  const sloturi = [
    { culoare: "#f4f4f1", nume: "Alb", material: "PLA" },
    { culoare: "#c8282e", nume: "Rosu", material: "PLA" },
    { culoare: "#1f5fbf", nume: "Albastru", material: "PLA" },
    { culoare: "#f5c518", nume: "Galben", material: "PLA" },
  ];
  writeFileSync(path.join(out, "pictura-proba-bambu.3mf"), exportaPictura3mf([cub, cil], sloturi, "Pictura proba", "bambu"));
  writeFileSync(path.join(out, "pictura-proba-prusa.3mf"), exportaPictura3mf([cub, cil], sloturi, "Pictura proba", "prusa"));

  // Etapa 2: o sfera cu presetarea "Curcubeu" (6 culori), generata procedural.
  const sfera = corp(new THREE.SphereGeometry(20, 96, 48).translate(0, 20, 0), "Sfera", 0);
  const curcubeu = PRESETARI.find((x) => x.id === "curcubeu")!;
  const t = topologie(sfera);
  const niveluri = calculeazaModel(t.centre, t.normale, cutieVarfuri(sfera.varfuri), curcubeu.parametri)!;
  sfera.culori.set(niveluri);
  writeFileSync(path.join(out, "pictura-proba-curcubeu.3mf"), exportaPictura3mf([sfera], curcubeu.culori.map((culoare) => ({ culoare })), "Curcubeu", "bambu"));

  // Etapa 3: un cub subdivizat la 0,6 mm, cu o imagine proprie (un cerc verde si un patrat rosu pe
  // alb) proiectata pe fata din fata, exportat pentru PrusaSlicer.
  const cubMare = corp(new THREE.BoxGeometry(30, 30, 30).translate(0, 15, 0), "Cub imagine", 0);
  const sudat = sudeazaVarfuri(cubMare);
  const fin = subdivizeaza(sudat, new Uint8Array(sudat.culori.length).fill(1), 0.6, 400_000);
  const lat = 120, ina = 120;
  const px = new Uint8ClampedArray(lat * ina * 4);
  for (let y = 0; y < ina; y += 1) for (let x = 0; x < lat; x += 1) {
    const i = (y * lat + x) * 4;
    const cerc = (x - 42) ** 2 + (y - 60) ** 2 < 30 ** 2;
    const patrat = x > 70 && x < 110 && y > 40 && y < 80;
    px.set(cerc ? [31, 138, 91, 255] : patrat ? [200, 40, 46, 255] : [255, 255, 255, 255], i);
  }
  const redusa = reduceImagine(px, lat, ina, ["#1f8a5b", "#c8282e", "#f4f4f1"], 2, "#ffffff");
  const topFin = topologie(fin);
  const idx = proiecteazaDecal(topFin, redusa, { centru: [0, 15, 15], directie: [0, 0, -1], sus: [0, 1, 0], latime: 26, rotire: 0, mutare: [0, 0] });
  const culoriImg = new Uint8Array(fin.culori.length);
  idx.forEach((k, i) => { if (k !== FARA) culoriImg[i] = k + 1; });
  const sloturiImg = [{ culoare: "#f4f4f1", nume: "Alb", material: "PLA" }, ...redusa.culori.map((culoare) => ({ culoare }))];
  writeFileSync(path.join(out, "pictura-proba-imagine-prusa.3mf"), exportaPictura3mf([{ id: "img", nume: "Cub imagine", varfuri: fin.varfuri, fete: fin.fete, culori: culoriImg }], sloturiImg, "Imagine pe model", "prusa"));
});
