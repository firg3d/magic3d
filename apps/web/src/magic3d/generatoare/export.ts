import { zipSync } from "fflate";
import { layerlingToZUp } from "@/lib/meshCoordinates";
import { proiectBambu, type ObiectBambu, type PlacaBambu } from "@/magic3d/core/assets/bambu3mf";
import { t as tm } from "@/magic3d/core/i18n/index";
import type { ContextOferta } from "@/magic3d/oferta/OfertaPanel";
import type { GeneratorDef, Parametri, PiesaGenerata } from "@/magic3d/generatoare/tipuri";
import { tg } from "@/magic3d/generatoare/texte";

/*
 * Iesirea oricarui generator, fara editor: 3MF Bambu / Orca (piesele pe placile lor, partile
 * aceluiasi obiect impreuna, fiecare culoare pe extruderul ei), STL-urile si cererea de oferta.
 * Piesele vin in coordonatele scenei; in fisiere ajung ca la exportul editorului (Z in sus).
 */

/** Triunghiurile scenei (Y in sus) ca in fisiere (Z in sus), cu aceeasi conversie ca exportul STL al editorului. */
function zSus(positions: Float32Array): Float32Array {
  const out = new Float32Array(positions.length);
  for (let i = 0; i < positions.length; i += 3) {
    const [x, y, z] = layerlingToZUp([positions[i], positions[i + 1], positions[i + 2]]);
    out[i] = x;
    out[i + 1] = y;
    out[i + 2] = z;
  }
  return out;
}

/** Numele unui fisier, fara diacritice si spatii. */
export const numeFisier = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "magic3d";

/**
 * Proiectul Bambu al unei constructii: o placa pentru fiecare `print.placa` (implicit una), pe ea un
 * obiect pentru fiecare `print.obiect` (implicit unul, cu numele generatorului), cu piesele lui ca
 * parti. Fiecare culoare diferita primeste un extruder, in ordinea in care apare.
 */
export function proiectGenerat(piese: PiesaGenerata[], def: GeneratorDef, p: Parametri): ReturnType<typeof proiectBambu> {
  const titlu = tm(def.titlu);
  const culori: string[] = [];
  const extruder = (culoare: string) => {
    const c = culoare.toLowerCase();
    if (!culori.includes(c)) culori.push(c);
    return culori.indexOf(c) + 1;
  };
  const placiIndex = [...new Set(piese.map((x) => x.print?.placa ?? 0))].sort((a, b) => a - b);
  const placi: PlacaBambu[] = placiIndex.map((indexPlaca) => {
    const pePlaca = piese.filter((x) => (x.print?.placa ?? 0) === indexPlaca).map((x) => ({ x, z: zSus(x.positions) }));
    const obiecte = [...new Set(pePlaca.map(({ x }) => x.print?.obiect ?? titlu))];
    // Asezarea din scena se pastreaza: fiecare obiect sta fata de centrul placii unde l-a pus generatorul.
    const cutie = (lista: Float32Array[]) => {
      const min = [Infinity, Infinity], max = [-Infinity, -Infinity];
      for (const q of lista) for (let i = 0; i < q.length; i += 3) for (let a = 0; a < 2; a += 1) { min[a] = Math.min(min[a], q[i + a]); max[a] = Math.max(max[a], q[i + a]); }
      return [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2];
    };
    const centruPlaca = cutie(pePlaca.map(({ z }) => z));
    const lista: ObiectBambu[] = obiecte.map((nume) => {
      const parti = pePlaca.filter(({ x }) => (x.print?.obiect ?? titlu) === nume);
      const centru = cutie(parti.map(({ z }) => z));
      return {
        nume,
        positions: new Float32Array(),
        extruder: 1,
        setari: parti[0].x.print?.setari ?? {},
        parti: parti.map(({ x, z }) => ({ nume: x.nume, positions: z, extruder: extruder(x.culoare) })),
        pozitie: [centru[0] - centruPlaca[0], centru[1] - centruPlaca[1]],
      };
    });
    return { nume: placiIndex.length > 1 ? `${titlu} ${indexPlaca + 1}` : titlu, obiecte: lista };
  });
  return proiectBambu({ titlu, instructiuni: def.instructiuni?.(p) ?? titlu, pat: 180, placi });
}

/** STL-urile pieselor (cate unul pe piesa) si instructiunile, intr-o arhiva. */
export function arhivaGenerat(piese: PiesaGenerata[], def: GeneratorDef, p: Parametri): Uint8Array {
  const fisiere: Record<string, Uint8Array> = {};
  const folosite = new Map<string, number>();
  for (const piesa of piese) {
    let nume = numeFisier(piesa.nume);
    const n = folosite.get(nume) ?? 0;
    folosite.set(nume, n + 1);
    if (n) nume = `${nume}-${n + 1}`;
    fisiere[`${nume}.stl`] = stlBinar(zSus(piesa.positions));
  }
  const text = def.instructiuni?.(p);
  if (text) fisiere["instructiuni.txt"] = new TextEncoder().encode(text);
  return zipSync(fisiere, { level: 6 });
}

function stlBinar(positions: Float32Array): Uint8Array {
  const n = positions.length / 9;
  const buffer = new ArrayBuffer(84 + n * 50);
  const view = new DataView(buffer);
  new Uint8Array(buffer).set(new TextEncoder().encode("Magic3D"));
  view.setUint32(80, n, true);
  for (let t = 0; t < n; t += 1) {
    const o = 84 + t * 50;
    const q = (k: number) => positions[t * 9 + k];
    const ux = q(3) - q(0), uy = q(4) - q(1), uz = q(5) - q(2);
    const vx = q(6) - q(0), vy = q(7) - q(1), vz = q(8) - q(2);
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    [nx / l, ny / l, nz / l].forEach((v, i) => view.setFloat32(o + i * 4, v, true));
    for (let k = 0; k < 9; k += 1) view.setFloat32(o + 12 + k * 4, q(k), true);
  }
  return new Uint8Array(buffer);
}

/** Parametrii vizibili, pe un rand, pentru mesajul de oferta ("Tip: Glob 3D · Diametru mm: 80 · ..."). */
export function detaliiGenerat(def: GeneratorDef, p: Parametri): string {
  const valoare = <T,>(v: T | ((x: Parametri) => T)) => (typeof v === "function" ? (v as (x: Parametri) => T)(p) : v);
  return def.parametri
    .filter((d) => d.tip !== "culoare" && (!d.vizibil || d.vizibil(p)))
    .map((d) => {
      const v = p[d.cheie];
      if (v === "" || v === undefined) return "";
      const text = d.tip === "alegere" ? tm(d.optiuni.find((o) => o.valoare === v)?.eticheta ?? String(v)) : d.tip === "bifa" ? (v ? "✓" : "✗") : String(v);
      return `${tm(valoare(d.eticheta))}: ${text}`;
    })
    .filter(Boolean)
    .join(" · ");
}

/** Cutia celui mai mare obiect (piesele aceluiasi `print.obiect` si `print.placa` impreuna), mm. */
export function obiectMaxim(piese: PiesaGenerata[]): { x: number; y: number; z: number } {
  const grupuri = new Map<string, PiesaGenerata[]>();
  for (const x of piese) {
    const cheie = `${x.print?.placa ?? 0}|${x.print?.obiect ?? ""}`;
    grupuri.set(cheie, [...(grupuri.get(cheie) ?? []), x]);
  }
  const max = { x: 0, y: 0, z: 0 };
  for (const grup of grupuri.values()) {
    const min = [Infinity, Infinity, Infinity];
    const sus = [-Infinity, -Infinity, -Infinity];
    for (const { positions: q } of grup) for (let i = 0; i < q.length; i += 3) for (let a = 0; a < 3; a += 1) { min[a] = Math.min(min[a], q[i + a]); sus[a] = Math.max(sus[a], q[i + a]); }
    // Scena are Y in sus: latimea pe X, adancimea pe Z, inaltimea pe Y.
    max.x = Math.max(max.x, sus[0] - min[0]);
    max.y = Math.max(max.y, sus[2] - min[2]);
    max.z = Math.max(max.z, sus[1] - min[1]);
  }
  return max;
}

/** Cererea de oferta a unei constructii: numele generatorului, parametrii, proiectul Bambu si cel mai mare obiect (fiecare se printeaza pe placa lui). */
export function contextGenerat(piese: PiesaGenerata[], def: GeneratorDef, p: Parametri): ContextOferta {
  return { generator: `${tg("titlu")} → ${tm(def.titlu)}`, firma: true, detalii: detaliiGenerat(def, p), threeMf: proiectGenerat(piese, def, p), piesaMaxima: obiectMaxim(piese) };
}
