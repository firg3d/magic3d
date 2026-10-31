import { sketchFromPieceRings } from "@/lib/svgSketch";
import type { SketchProfile } from "@/types/layerling";
import type { InelPx, TrasareLogo } from "@/magic3d/logo/trasare";

/*
 * Inelele conturate (pixeli) ca profile de schita in mm, toate in acelasi cadru: straturile de
 * culoare si silueta raman suprapuse exact. Ca la conturarea imaginilor din schita
 * (lib/sketchImageTrace.ts): mijlocul logo-ului in 0, x la dreapta, z in jos pe imagine.
 */

export type CadruLogo = {
  /** Mm pe pixel. */
  scara: number;
  /** Mijlocul siluetei, in pixeli. */
  cx: number;
  cy: number;
  /** Cat ocupa logo-ul, in mm. */
  latime: number;
  adancime: number;
};

/** Cadrul in care latura mare a siluetei are `marime` mm. */
export function cadruLogo(trasare: Pick<TrasareLogo, "silueta">, marime: number): CadruLogo {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const punct of trasare.silueta.flat()) {
    minX = Math.min(minX, punct.x);
    maxX = Math.max(maxX, punct.x);
    minY = Math.min(minY, punct.y);
    maxY = Math.max(maxY, punct.y);
  }
  const scara = marime / Math.max(1e-6, maxX - minX, maxY - minY);
  return { scara, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, latime: (maxX - minX) * scara, adancime: (maxY - minY) * scara };
}

const rotunjit = (valoare: number) => Math.round(valoare * 1000) / 1000;

/** Inelele ca profil de schita; `oglindit` le intoarce stanga-dreapta (stampila). */
export function profilDinInele(inele: readonly InelPx[], cadru: CadruLogo, oglindit = false, prefix = "logo"): SketchProfile {
  const semn = oglindit ? -1 : 1;
  const inMm = (punct: { x: number; y: number }) => ({ x: semn * (punct.x - cadru.cx) * cadru.scara, y: (punct.y - cadru.cy) * cadru.scara });
  const bucati = inele.map((inel) => inel.map((punct, i) => ({ start: inMm(punct), end: inMm(inel[(i + 1) % inel.length]) })));
  const schita = sketchFromPieceRings(bucati, ({ x, y }) => ({ x: rotunjit(x), z: rotunjit(y) }), prefix);
  return { points: schita.points, segments: schita.segments };
}

/** Inelele ca un desen SVG (pentru previzualizarea 2D), in pixeli, cu umplere evenodd. */
export function caleSvg(inele: readonly InelPx[]): string {
  return inele.map((inel) => `M${inel.map((p) => `${Math.round(p.x * 10) / 10} ${Math.round(p.y * 10) / 10}`).join("L")}Z`).join("");
}
