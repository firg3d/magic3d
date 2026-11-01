/*
 * 3MF-ul de proba al desenului colorat pe plasa: o imagine proprie in 4 culori (oval bej, zona rosie,
 * zona albastra, linii negre), bol de 120 mm, plus varianta cutie.
 *
 *   TERMO_OUT=<dosar> npx vitest run --config tests/vitest.tools.config.ts tests/tools/termoCuloriProba.tool.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { ManifoldToplevel } from "manifold-3d";
import { it } from "vitest";
import { inArena } from "@/magic3d/core/geometry/arena";
import { proiectBambu } from "@/magic3d/core/assets/bambu3mf";
import { SETARI_IMPLICITE, type SetariTermo } from "@/magic3d/termo/config";
import { straturiCulori } from "@/magic3d/termo/culoriPoza";
import { construiesteTermo, piesePrint } from "@/magic3d/termo/geometrie";
import { proiectTermo } from "@/magic3d/termo/export";
import { ineleCuYSus, siluetaDinPixeli } from "@/magic3d/termo/silueta";
import { manifold } from "../unit/magic3dGenUtil";

const BEJ = [232, 219, 183], ROSU = [193, 46, 31], ALBASTRU = [31, 95, 191], NEGRU = [10, 10, 10];

function poza() {
  const w = 240, h = 240;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    let c = [255, 255, 255];
    if (((x - 120) / 105) ** 2 + ((y - 120) / 105) ** 2 <= 1) {
      c = BEJ;
      if (y < 85 && y > 30) c = ROSU;
      if (y > 160 && y < 200 && x > 70 && x < 170) c = ALBASTRU;
      if ((y >= 110 && y < 113 && ((x > 70 && x < 105) || (x > 135 && x < 170))) || (y >= 140 && y < 143 && x > 85 && x < 155)) c = NEGRU;
    }
    data.set([c[0], c[1], c[2], 255], (y * w + x) * 4);
  }
  return { width: w, height: h, data };
}

it("scrie 3MF-urile de proba", async () => {
  const mod = (await manifold()) as ManifoldToplevel;
  const out = process.env.TERMO_OUT ?? path.resolve("tmp/termo");
  mkdirSync(out, { recursive: true });
  const p = poza();
  const sil = siluetaDinPixeli(p);
  for (const [nume, extra] of [["bol", {}], ["cutie", { mod: "cutie", spate: "contur", ramaColorata: true }]] as const) {
    const s: SetariTermo = { ...SETARI_IMPLICITE, latime: 120, adancime: 18, desen: "culori", sistemCulori: "bambu-ams-lite", culori: 4, paletaCulori: "atelier", ...extra };
    const straturi = straturiCulori(p, { latime: sil.latime, inaltime: sil.inaltime }, s);
    const bytes = inArena(() => {
      const rez = construiesteTermo(mod, ineleCuYSus(sil.inele), s, false, straturi);
      return proiectBambu(proiectTermo(piesePrint(rez), s, "ro", "Proba culori", rez.info));
    }, () => []);
    writeFileSync(path.join(out, `termo-culori-${nume}.3mf`), bytes);
  }
}, 120_000);
