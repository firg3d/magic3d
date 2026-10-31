import opentype from "opentype.js";
import { buildPlacuta, configureManifold as configPlacute } from "@/magic3d/apps/placute/placute";
import { t } from "@/magic3d/core/i18n/index";
import type { Parametri, PiesaGenerata } from "@/magic3d/generatoare/tipuri";

/*
 * Partea de worker a generatoarelor: din parametri si un modul manifold, piesele ca manifold-uri.
 * Ruleaza doar in generator.worker.ts, unde manifold-ul si fonturile sunt deja incarcate.
 */

export type PiesaManifold = { nume: string; culoare: string; manifold: unknown };
export type Construit = { piese: PiesaManifold[]; avertizari: string[] };

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

const num = (p: Parametri, cheie: string) => Number(p[cheie]);
const str = (p: Parametri, cheie: string) => String(p[cheie] ?? "");

/** Codurile de avertizare din geometrie ("tip:a:b") in text, cu traducerile Magic3D. */
function avertPlacuta(cod: string): string {
  const [tip, a, b] = cod.split(":");
  if (tip === "perete") return t("placute.avertPerete", { mm: a, min: b });
  if (tip === "terusIngust") return t("placute.avertTerus", { mm: a, min: b });
  if (tip === "magnetSubtire") return t("placute.avertMagnet", { mm: a });
  return cod;
}

type Constructor = (p: Parametri, mod: unknown, font: unknown) => Construit;

const CONSTRUCTORI: Record<string, Constructor> = {
  placute(p, mod, font) {
    configPlacute(mod);
    const text = str(p, "text").trim() || " ";
    const r = buildPlacuta({
      text,
      font,
      inaltimeText: num(p, "inaltimeText"),
      reliefText: num(p, "reliefText"),
      latimePlacuta: num(p, "latimePlacuta"),
      netezire: num(p, "netezire"),
      grosimePlacuta: num(p, "grosimePlacuta"),
      prindere: str(p, "prindere") as Parameters<typeof buildPlacuta>[0]["prindere"],
      diametruGaura: num(p, "diametruGaura"),
      lungimeTerus: num(p, "lungimeTerus"),
      culoarePlacuta: str(p, "culoarePlacuta"),
      culoareText: str(p, "culoareText"),
    });
    const avertizari = [r.diagnostice.avert ? avertPlacuta(r.diagnostice.avert) : ""];
    if (r.diagnostice.glifeLipsa.length) avertizari.push(t("placute.statusGlifa", { litere: r.diagnostice.glifeLipsa.join(" ") }));
    return {
      piese: [
        { nume: t("placute.numePlacuta", { text }), culoare: str(p, "culoarePlacuta"), manifold: r.corpPlacuta },
        ...(r.corpText ? [{ nume: t("placute.numeText", { text }), culoare: str(p, "culoareText"), manifold: r.corpText }] : []),
      ],
      avertizari: avertizari.filter(Boolean),
    };
  },
};

export const areConstructor = (id: string) => id in CONSTRUCTORI;

export function construieste(id: string, p: Parametri, mod: unknown, font: unknown): Construit {
  const constructor = CONSTRUCTORI[id];
  if (!constructor) throw new Error(`generator necunoscut: ${id}`);
  return constructor(p, mod, font);
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

export function triunghiuri(piese: PiesaManifold[]): PiesaGenerata[] {
  return piese.map((piesa) => ({
    nume: piesa.nume,
    culoare: piesa.culoare,
    positions: manifoldInTriunghiuri(piesa.manifold as Parameters<typeof manifoldInTriunghiuri>[0]),
  }));
}
