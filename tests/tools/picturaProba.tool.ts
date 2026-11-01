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
});
