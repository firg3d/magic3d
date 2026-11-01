import { zipSync } from "fflate";
import type { PiesaGenerata } from "@/magic3d/generatoare/tipuri";
import type { ContextOferta } from "@/magic3d/oferta/OfertaPanel";
import { proiectBambu, type PlacaBambu, type ProiectBambu } from "@/magic3d/core/assets/bambu3mf";
import { EXTRUDER, FORMARE, jocMatrite, SETARI_PRINT, TERMO, type SetariTermo } from "@/magic3d/termo/config";
import type { CheiePiesa, InfoTermo, PieseTermo } from "@/magic3d/termo/geometrie";
import { tt, type CheieTermo } from "@/magic3d/termo/texte";

export { piesePrint, type PieseTermo } from "@/magic3d/termo/geometrie";

/*
 * Piesele termoformarii in afara lui manifold: triunghiuri Z in sus (pentru 3MF si STL), piese ale
 * scenei (Y in sus, una langa alta) si proiectul Bambu cu placile, setarile si instructiunile.
 */

/** Ce stie exportul despre fiecare piesa: numele, culoarea din editor, extruderul. */
const PIESE: Record<CheiePiesa, { nume: CheieTermo; culoare: string; extruder: number }> = {
  plasa: { nume: "numePlasa", culoare: TERMO.culoarePlasa, extruder: EXTRUDER.plasa },
  plasa2: { nume: "numePlasa2", culoare: TERMO.culoarePlasa, extruder: EXTRUDER.plasa },
  cleme: { nume: "numeCleme", culoare: TERMO.culoareCleme, extruder: EXTRUDER.plasa },
  jos: { nume: "numeJos", culoare: TERMO.culoareJos, extruder: EXTRUDER.matrita },
  sus: { nume: "numeSus", culoare: TERMO.culoareSus, extruder: EXTRUDER.matrita },
  jos2: { nume: "numeJos2", culoare: TERMO.culoareJos, extruder: EXTRUDER.matrita },
  sus2: { nume: "numeSus2", culoare: TERMO.culoareSus, extruder: EXTRUDER.matrita },
};

/** Numele piesei: la bol plasa e doar "Plasa", la cutie "Plasa A". */
const numePiesa = (cheie: CheiePiesa, piese: PieseTermo, limba?: string) =>
  tt(cheie === "plasa" && piese.some((p) => p.cheie === "plasa2") ? "numePlasaA" : PIESE[cheie].nume, {}, limba);

/** Latimea pe X a unor triunghiuri. */
function limiteX(p: Float32Array): [number, number] {
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < p.length; i += 3) { min = Math.min(min, p[i]); max = Math.max(max, p[i]); }
  return [min, max];
}

/**
 * Piesele in scena editorului (Y in sus), asezate pe X una langa alta, in ordinea lor. Z-ul de print
 * devine Y-ul scenei, Y-ul de print adancimea (cu semn schimbat, ca privita de sus piesa sa nu fie
 * oglindita).
 */
export function pieseScena(piese: PieseTermo): PiesaGenerata[] {
  const distanta = 10;
  let x = 0;
  return piese.map(({ cheie, corp: p }) => {
    const [min, max] = limiteX(p);
    const dx = x - min;
    x += max - min + distanta;
    const positions = new Float32Array(p.length);
    for (let i = 0; i < p.length; i += 3) {
      positions[i] = p[i] + dx;
      positions[i + 1] = p[i + 2];
      positions[i + 2] = -p[i + 1];
    }
    return { nume: numePiesa(cheie, piese, undefined), culoare: PIESE[cheie].culoare, positions };
  });
}

export function instructiuni(info: InfoTermo, setari: SetariTermo, nume: string, limba?: string): string {
  const f = FORMARE[setari.material];
  const model = setari.model === "gyroid" ? tt("modelGyroid", { densitate: setari.densitate }, limba) : tt("modelFagure", { densitate: setari.densitate }, limba);
  const valori = { nume, material: setari.material, model, t1: f.incalzire[0], t2: f.incalzire[1], s1: f.presare[0], s2: f.presare[1], d: info.adancime, joc: jocMatrite().toFixed(1), l: info.latime, n: info.cleme };
  if (setari.mod !== "cutie") return tt("instructiuni", valori, limba);
  return tt(info.seturi === 2 ? "instructiuniCutie2" : "instructiuniCutie", valori, limba);
}

/** Proiectul Bambu: fiecare piesa pe placa ei, cu setarile ei (plasa ca retea, clemele pline, matritele groase). */
export function proiectTermo(piese: PieseTermo, setari: SetariTermo, limba?: string, nume = "Magic3D", info?: InfoTermo): ProiectBambu {
  const setariPlasa = setari.model === "gyroid" ? SETARI_PRINT.plasa(setari.densitate) : SETARI_PRINT.plasaFagure();
  const setariPiesa = (cheie: CheiePiesa) => (cheie === "plasa" || cheie === "plasa2" ? setariPlasa : cheie === "cleme" ? SETARI_PRINT.cleme() : SETARI_PRINT.matrita());
  const text = info ? instructiuni(info, setari, nume, limba) : tt("instructiuni", { nume }, limba);
  const placi: PlacaBambu[] = piese.map(({ cheie, corp }) => {
    const numeP = numePiesa(cheie, piese, limba);
    return { nume: numeP, obiecte: [{ nume: numeP, positions: corp, extruder: PIESE[cheie].extruder, setari: setariPiesa(cheie) }] };
  });
  return { titlu: tt("numeProiect", { forma: nume }, limba), instructiuni: text, pat: TERMO.placa, placi };
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

/** Toate STL-urile si instructiunile, intr-o arhiva. */
export function arhivaStl(piese: PieseTermo, text: string, limba?: string): Uint8Array {
  const fisier = (cheie: CheiePiesa) => `${numePiesa(cheie, piese, limba).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "-").toLowerCase()}.stl`;
  return zipSync({
    ...Object.fromEntries(piese.map(({ cheie, corp }) => [fisier(cheie), stl(corp)])),
    "instructiuni.txt": new TextEncoder().encode(text),
  }, { level: 6 });
}

/** Cutia celei mai mari piese (fiecare se printeaza pe placa ei), mm. */
export function piesaMaxima(piese: PieseTermo): { x: number; y: number; z: number } {
  const max = { x: 0, y: 0, z: 0 };
  for (const { corp } of piese) {
    const min = [Infinity, Infinity, Infinity];
    const sus = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < corp.length; i += 3) for (let a = 0; a < 3; a += 1) { min[a] = Math.min(min[a], corp[i + a]); sus[a] = Math.max(sus[a], corp[i + a]); }
    max.x = Math.max(max.x, sus[0] - min[0]);
    max.y = Math.max(max.y, sus[1] - min[1]);
    max.z = Math.max(max.z, sus[2] - min[2]);
  }
  return max;
}

/**
 * Cererea de oferta pentru termoformare: piesele ca proiect Bambu (placi si setari, ca atelierul sa
 * nu le refaca), detaliile pe un rand si serviciul "formare in atelier", bifat cand a fost ales.
 * Randurile din mesaj sunt in limba sablonului (romana); eticheta bifei, in limba paginii.
 */
export function contextOferta(piese: PieseTermo, info: InfoTermo, setari: SetariTermo, nume: string, atelier: boolean, limbaMesaj = "ro"): ContextOferta {
  const model = setari.model === "gyroid" ? tt("modelGyroid", { densitate: setari.densitate }, limbaMesaj) : tt("modelFagure", { densitate: setari.densitate }, limbaMesaj);
  const cutie = setari.mod === "cutie" ? tt("detaliiCutie", { n: info.cleme, seturi: tt(info.seturi === 2 ? "douaSeturi" : "unSet", {}, limbaMesaj) }, limbaMesaj) : "";
  const detalii = tt("detaliiOferta", {
    mod: tt(setari.mod === "cutie" ? "modCutie" : "modBol", {}, limbaMesaj),
    material: setari.material,
    model,
    l: info.latime,
    a: info.inaltime,
    d: info.adancime,
    cutie,
    placi: piese.length,
  }, limbaMesaj);
  return {
    generator: `${tt("titlu", {}, limbaMesaj)} → ${nume}`,
    firma: true,
    detalii,
    servicii: [{ id: "formare", eticheta: tt("serviciuFormare"), nota: tt("serviciuFormareNota"), mesaj: tt("mesajFormare", {}, limbaMesaj), bifat: atelier }],
    threeMf: proiectBambu(proiectTermo(piese, setari, limbaMesaj, nume, info)),
    piesaMaxima: piesaMaxima(piese),
  };
}
