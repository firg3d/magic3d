import { readFileSync } from "node:fs";
import path from "node:path";
import ManifoldModule from "manifold-3d";
import opentype from "opentype.js";
import { instrumenteazaArena, inArena } from "@/magic3d/core/geometry/arena";
import { parseaza3mf } from "@/magic3d/core/assets/threemf";
import { construieste, triunghiuri } from "@/magic3d/generatoare/constructori";
import type { Constructor } from "@/magic3d/generatoare/constructori/comun";
import type { GeneratorDef, Parametri, PiesaGenerata } from "@/magic3d/generatoare/tipuri";

/*
 * Ajutoare pentru testele generatoarelor Magic3D: manifold in Node, fonturile livrate si aceeasi
 * cale prin care trece worker-ul (arena, constructor, triunghiuri in scena).
 */

const fonts = path.resolve(__dirname, "../../apps/web/public/magic3d/fonts");
let mod: unknown = null;

export async function manifold(): Promise<unknown> {
  if (mod) return mod;
  const m = await (ManifoldModule as unknown as () => Promise<{ setup(): void }>)();
  m.setup();
  instrumenteazaArena(m);
  mod = m;
  return m;
}

export const fontExista = (fisier: string) => {
  try {
    readFileSync(path.join(fonts, fisier));
    return true;
  } catch {
    return false;
  }
};

export function font(fisier: string): unknown {
  const bytes = readFileSync(path.join(fonts, fisier));
  return opentype.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
}

/** Construieste ca worker-ul: fonturile din parametrii "font*", arena, triunghiuri in scena. */
export function genereaza(id: string, p: Parametri): { piese: PiesaGenerata[]; avertizari: string[] } {
  return genereazaCu((parametri, m, fonturi, modele) => construieste(id, parametri, m, fonturi, modele), p);
}

/** La fel, cu un constructor dat direct (inainte sa fie inregistrat in constructori.ts). */
export function genereazaCu(constructor: Constructor, p: Parametri): { piese: PiesaGenerata[]; avertizari: string[] } {
  if (!mod) throw new Error("apeleaza await manifold() in beforeAll");
  const fonturi = Object.fromEntries(Object.keys(p).filter((k) => /^font/.test(k) && typeof p[k] === "string" && p[k]).map((k) => [k, font(String(p[k]))]));
  return inArena(() => {
    const modele = Object.fromEntries(Object.keys(p).filter((k) => /^fisier3mf/.test(k) && typeof p[k] === "string" && p[k])
      .map((k) => [k, parseaza3mf(new Uint8Array(readFileSync(path.join(fonts, "..", String(p[k])))))]));
    const construit = constructor(p, mod, fonturi, modele);
    return { piese: triunghiuri(construit.piese), avertizari: construit.avertizari, pastreaza: construit.pastreaza ?? [] };
  }, (rez) => rez.pastreaza);
}

export function limite(piesa: PiesaGenerata) {
  const p = piesa.positions;
  const b = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (let i = 0; i < p.length; i += 3) {
    b.minX = Math.min(b.minX, p[i]); b.maxX = Math.max(b.maxX, p[i]);
    b.minY = Math.min(b.minY, p[i + 1]); b.maxY = Math.max(b.maxY, p[i + 1]);
    b.minZ = Math.min(b.minZ, p[i + 2]); b.maxZ = Math.max(b.maxZ, p[i + 2]);
  }
  return b;
}

/** Volumul cu semn (mm³): pozitiv doar cu fetele orientate spre exterior. */
export function volum(piesa: PiesaGenerata): number {
  const q = piesa.positions;
  let v = 0;
  for (let i = 0; i < q.length; i += 9) {
    v += (q[i] * (q[i + 4] * q[i + 8] - q[i + 5] * q[i + 7]) - q[i + 1] * (q[i + 3] * q[i + 8] - q[i + 5] * q[i + 6]) + q[i + 2] * (q[i + 3] * q[i + 7] - q[i + 4] * q[i + 6])) / 6;
  }
  return v;
}

/** Verificarile de baza pentru orice generator: macar o piesa, fiecare cu volum pozitiv si triunghiuri intregi. */
export function verificaPiese(def: GeneratorDef, rezultat: { piese: PiesaGenerata[] }): void {
  if (rezultat.piese.length === 0) throw new Error(`${def.id}: nicio piesa`);
  for (const piesa of rezultat.piese) {
    if (piesa.positions.length % 9 !== 0) throw new Error(`${def.id}/${piesa.nume}: triunghiuri incomplete`);
    if (!(volum(piesa) > 0)) throw new Error(`${def.id}/${piesa.nume}: volum ${volum(piesa)} (fete intoarse sau piesa goala)`);
  }
}
