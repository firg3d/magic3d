import opentype from "opentype.js";
import { parseaza3mf, type CorpModel } from "@/magic3d/core/assets/threemf";
import type { Constructor, Construit, Fonturi, Modele, PiesaManifold } from "@/magic3d/generatoare/constructori/comun";
import { articulat } from "@/magic3d/generatoare/constructori/articulat";
import { brelocDecor } from "@/magic3d/generatoare/constructori/breloc-decor";
import { brelocuri } from "@/magic3d/generatoare/constructori/brelocuri";
import { cutii } from "@/magic3d/generatoare/constructori/cutii";
import { cuvinte } from "@/magic3d/generatoare/constructori/cuvinte";
import { fagure } from "@/magic3d/generatoare/constructori/fagure";
import { led } from "@/magic3d/generatoare/constructori/led";
import { litere } from "@/magic3d/generatoare/constructori/litere";
import { numeLed } from "@/magic3d/generatoare/constructori/nume-led";
import { nume } from "@/magic3d/generatoare/constructori/nume";
import { ornament } from "@/magic3d/generatoare/constructori/ornament";
import { presa } from "@/magic3d/generatoare/constructori/presa";
import { stampila } from "@/magic3d/generatoare/constructori/stampila";
import { rame } from "@/magic3d/generatoare/constructori/rame";
import { placute } from "@/magic3d/generatoare/constructori/placute";
import type { Parametri, PiesaGenerata } from "@/magic3d/generatoare/tipuri";

/*
 * Partea de worker a generatoarelor: registrul constructorilor (unul per fisier in constructori/),
 * incarcarea fonturilor si trecerea pieselor din manifold in triunghiurile scenei.
 * Ruleaza doar in generator.worker.ts si in teste.
 */

export type { Construit, PiesaManifold };

const CONSTRUCTORI: Record<string, Constructor> = {
  articulat,
  "breloc-decor": brelocDecor,
  brelocuri,
  cutii,
  cuvinte,
  fagure,
  led,
  litere,
  nume,
  "nume-led": numeLed,
  placute,
  rame,
  ornament,
  stampila,
  presa,
};

const fonturi = new Map<string, Promise<unknown>>();

/** Un font din /magic3d/fonts/, parsat o singura data per worker. */
export function incarcaFont(assetBase: string, fisier: string): Promise<unknown> {
  let font = fonturi.get(fisier);
  if (!font) {
    font = fetch(new URL(`magic3d/fonts/${encodeURIComponent(fisier)}`, assetBase).href)
      .then((response) => {
        if (!response.ok) throw new Error(`font ${fisier}: HTTP ${response.status}`);
        return response.arrayBuffer();
      })
      .then((buffer) => opentype.parse(buffer));
    font.catch(() => fonturi.delete(fisier));
    fonturi.set(fisier, font);
  }
  return font;
}

/** Toate fonturile cerute de parametri: fiecare cheie care incepe cu "font" si are un nume de fisier. */
export async function incarcaFonturi(assetBase: string, p: Parametri): Promise<Fonturi> {
  const chei = Object.keys(p).filter((cheie) => /^font/.test(cheie) && typeof p[cheie] === "string" && p[cheie]);
  const parsate = await Promise.all(chei.map((cheie) => incarcaFont(assetBase, String(p[cheie]))));
  return Object.fromEntries(chei.map((cheie, i) => [cheie, parsate[i]]));
}

const modele = new Map<string, Promise<CorpModel[]>>();

/** Un model 3MF din /magic3d/ ("tematici/As romb.3mf"), citit o singura data per worker. */
export function incarcaModel(assetBase: string, cale: string): Promise<CorpModel[]> {
  let model = modele.get(cale);
  if (!model) {
    const url = new URL(`magic3d/${cale.split("/").map(encodeURIComponent).join("/")}`, assetBase).href;
    model = fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`model ${cale}: HTTP ${response.status}`);
        return response.arrayBuffer();
      })
      .then((buffer) => parseaza3mf(new Uint8Array(buffer)));
    model.catch(() => modele.delete(cale));
    modele.set(cale, model);
  }
  return model;
}

/** Toate modelele cerute de parametri: fiecare cheie care incepe cu "fisier3mf" si are o cale. */
export async function incarcaModele(assetBase: string, p: Parametri): Promise<Modele> {
  const chei = Object.keys(p).filter((cheie) => /^fisier3mf/.test(cheie) && typeof p[cheie] === "string" && p[cheie]);
  const citite = await Promise.all(chei.map((cheie) => incarcaModel(assetBase, String(p[cheie]))));
  return Object.fromEntries(chei.map((cheie, i) => [cheie, citite[i]]));
}

export const areConstructor = (id: string) => id in CONSTRUCTORI;

export function construieste(id: string, p: Parametri, mod: unknown, fonturiCerute: Fonturi, modeleCerute: Modele = {}): Construit {
  const constructor = CONSTRUCTORI[id];
  if (!constructor) throw new Error(`generator necunoscut: ${id}`);
  return constructor(p, mod, fonturiCerute, modeleCerute);
}

/**
 * Manifold (Z in sus) -> triunghiuri neindexate in scena (Y in sus): (x, y, z) -> (x, z, y).
 *
 * Generatoarele Magic3D lucreaza cu Y in jos, ca SVG si opentype: privit de sus intr-un sistem drept,
 * un "L" iese ca "Γ". Vechea previzualizare nega Y-ul (manifoldToGeometry) si de aceea arata corect.
 * Aici Y-ul piesei devine adancimea scenei fara semn schimbat, ceea ce e o oglindire, nu o rotatie:
 * piciorul lui "L" ajunge in fata si la dreapta, iar ordinea varfurilor fiecarui triunghi se
 * inverseaza, ca fetele sa ramana orientate spre exterior.
 */
export function manifoldInTriunghiuri(manifold: { getMesh(): { vertProperties: Float32Array; triVerts: Uint32Array; numProp: number } }): Float32Array {
  const mesh = manifold.getMesh();
  const { vertProperties: v, triVerts: tri, numProp } = mesh;
  const out = new Float32Array(tri.length * 3);
  for (let t = 0; t < tri.length; t += 3) {
    // a, c, b in loc de a, b, c: oglindirea intoarce sensul triunghiului.
    const ordine = [tri[t], tri[t + 2], tri[t + 1]];
    for (let k = 0; k < 3; k += 1) {
      const o = ordine[k] * numProp;
      const d = (t + k) * 3;
      out[d] = v[o];
      out[d + 1] = v[o + 2];
      out[d + 2] = v[o + 1];
    }
  }
  return out;
}

export function triunghiuri(lista: PiesaManifold[]): PiesaGenerata[] {
  return lista.map((piesa) => ({
    nume: piesa.nume,
    culoare: piesa.culoare,
    positions: manifoldInTriunghiuri(piesa.manifold as Parameters<typeof manifoldInTriunghiuri>[0]),
    ...(piesa.print ? { print: piesa.print } : {}),
  }));
}
