import { zipSync } from "fflate";
import type { PiesaGenerata } from "@/magic3d/generatoare/tipuri";
import type { ProiectBambu } from "@/magic3d/termo/bambu3mf";
import { EXTRUDER, FORMARE, jocMatrite, SETARI_PRINT, TERMO, type SetariTermo } from "@/magic3d/termo/config";
import type { InfoTermo, PieseTermo } from "@/magic3d/termo/geometrie";
import { tt } from "@/magic3d/termo/texte";

export { piesePrint, type PieseTermo } from "@/magic3d/termo/geometrie";

/*
 * Piesele termoformarii in afara lui manifold: triunghiuri Z in sus (pentru 3MF si STL), piese ale
 * scenei (Y in sus, una langa alta) si proiectul Bambu cu placile, setarile si instructiunile.
 */

/** Latimea pe X a unor triunghiuri. */
function limiteX(p: Float32Array): [number, number] {
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < p.length; i += 3) { min = Math.min(min, p[i]); max = Math.max(max, p[i]); }
  return [min, max];
}

/**
 * Piesele in scena editorului (Y in sus), asezate pe X una langa alta: plasa, matrita de jos,
 * matrita de sus. Z-ul de print devine Y-ul scenei, Y-ul de print adancimea (cu semn schimbat, ca
 * privita de sus piesa sa nu fie oglindita).
 */
export function pieseScena(piese: PieseTermo): PiesaGenerata[] {
  const ordine = [
    { nume: tt("numePlasa"), culoare: TERMO.culoarePlasa, p: piese.plasa },
    { nume: tt("numeJos"), culoare: TERMO.culoareJos, p: piese.jos },
    { nume: tt("numeSus"), culoare: TERMO.culoareSus, p: piese.sus },
  ];
  const distanta = 10;
  let x = 0;
  return ordine.map(({ nume, culoare, p }) => {
    const [min, max] = limiteX(p);
    const dx = x - min;
    x += max - min + distanta;
    const positions = new Float32Array(p.length);
    for (let i = 0; i < p.length; i += 3) {
      positions[i] = p[i] + dx;
      positions[i + 1] = p[i + 2];
      positions[i + 2] = -p[i + 1];
    }
    return { nume, culoare, positions };
  });
}

export function instructiuni(info: InfoTermo, setari: SetariTermo, nume: string, limba?: string): string {
  const f = FORMARE[setari.material];
  const model = setari.model === "gyroid" ? tt("modelGyroid", { densitate: setari.densitate }, limba) : tt("modelFagure", { densitate: setari.densitate }, limba);
  return tt("instructiuni", { nume, material: setari.material, model, t1: f.incalzire[0], t2: f.incalzire[1], s1: f.presare[0], s2: f.presare[1], d: info.adancime, joc: jocMatrite().toFixed(1), l: info.latime }, limba);
}

/** Proiectul Bambu: plasa, matrita de jos, matrita de sus, fiecare pe placa ei, cu setarile ei. */
export function proiectTermo(piese: PieseTermo, setari: SetariTermo, limba?: string, nume = "Magic3D", info?: InfoTermo): ProiectBambu {
  const setariPlasa = setari.model === "gyroid" ? SETARI_PRINT.plasa(setari.densitate) : SETARI_PRINT.plasaFagure();
  const text = info ? instructiuni(info, setari, nume, limba) : tt("instructiuni", { nume }, limba);
  return {
    titlu: tt("numeProiect", { forma: nume }, limba),
    instructiuni: text,
    pat: TERMO.placa,
    placi: [
      { nume: tt("numePlasa", {}, limba), obiecte: [{ nume: tt("numePlasa", {}, limba), positions: piese.plasa, extruder: EXTRUDER.plasa, setari: setariPlasa }] },
      { nume: tt("numeJos", {}, limba), obiecte: [{ nume: tt("numeJos", {}, limba), positions: piese.jos, extruder: EXTRUDER.matrita, setari: SETARI_PRINT.matrita() }] },
      { nume: tt("numeSus", {}, limba), obiecte: [{ nume: tt("numeSus", {}, limba), positions: piese.sus, extruder: EXTRUDER.matrita, setari: SETARI_PRINT.matrita() }] },
    ],
  };
}

/** STL binar din triunghiuri Z in sus. */
export function stl(positions: Float32Array): Uint8Array {
  const n = positions.length / 9;
  const buffer = new ArrayBuffer(84 + n * 50);
  const view = new DataView(buffer);
  new Uint8Array(buffer).set(new TextEncoder().encode("Magic3D termoformare"));
  view.setUint32(80, n, true);
  for (let t = 0; t < n; t += 1) {
    const o = 84 + t * 50;
    const p = (k: number) => positions[t * 9 + k];
    const ux = p(3) - p(0), uy = p(4) - p(1), uz = p(5) - p(2);
    const vx = p(6) - p(0), vy = p(7) - p(1), vz = p(8) - p(2);
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    [nx / l, ny / l, nz / l].forEach((v, i) => view.setFloat32(o + i * 4, v, true));
    for (let k = 0; k < 9; k += 1) view.setFloat32(o + 12 + k * 4, p(k), true);
  }
  return new Uint8Array(buffer);
}

/** Cele trei STL-uri si instructiunile, intr-o arhiva. */
export function arhivaStl(piese: PieseTermo, text: string, limba?: string): Uint8Array {
  const fisier = (cheie: "numePlasa" | "numeJos" | "numeSus") => `${tt(cheie, {}, limba).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "-").toLowerCase()}.stl`;
  return zipSync({
    [fisier("numePlasa")]: stl(piese.plasa),
    [fisier("numeJos")]: stl(piese.jos),
    [fisier("numeSus")]: stl(piese.sus),
    "instructiuni.txt": new TextEncoder().encode(text),
  }, { level: 6 });
}
