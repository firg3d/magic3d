import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { ManifoldToplevel } from "manifold-3d";
import { it } from "vitest";
import { inArena } from "@/magic3d/core/geometry/arena";
import { proiectBambu } from "@/magic3d/termo/bambu3mf";
import { SETARI_IMPLICITE } from "@/magic3d/termo/config";
import { arhivaStl, instructiuni, piesePrint, proiectTermo } from "@/magic3d/termo/export";
import { formaExemplu, type FormaExemplu } from "@/magic3d/termo/forme";
import { construiesteTermo } from "@/magic3d/termo/geometrie";
import { manifold } from "../unit/magic3dGenUtil";

/*
 * Proba de termoformare: 3MF-ul Bambu si STL-urile pentru o forma proprie, ca sa fie deschise in
 * slicer. TERMO_FORMA (implicit inima), TERMO_LATIME, TERMO_IESIRE (folderul; implicit termo-proba/).
 */

it("scrie proba de termoformare", async () => {
  const mod = (await manifold()) as ManifoldToplevel;
  const forma = (process.env.TERMO_FORMA ?? "inima") as FormaExemplu;
  const setari = { ...SETARI_IMPLICITE, latime: Number(process.env.TERMO_LATIME ?? SETARI_IMPLICITE.latime), mod: (process.env.TERMO_MOD ?? "bol") as "bol" | "cutie" };
  setari.adancime = Math.round(setari.latime * 0.19);
  const iesire = path.resolve(process.env.TERMO_IESIRE ?? "termo-proba");
  mkdirSync(iesire, { recursive: true });
  const { piese, info, sectiune } = inArena(() => {
    const rez = construiesteTermo(mod, formaExemplu(forma), setari);
    // Sectiunea verticala prin mijloc (planul y = 0), la folosire: piesele rotite ca planul sa devina orizontal.
    const taie = (m: typeof rez.folosire.jos) => m.rotate([-90, 0, 0]).slice(0).toPolygons() as Array<Array<[number, number]>>;
    return { piese: piesePrint(rez), info: rez.info, sectiune: { jos: taie(rez.folosire.jos), sus: taie(rez.folosire.sus), plasa: taie(rez.folosire.plasa) } };
  }, () => []);
  const toate = [...sectiune.jos, ...sectiune.sus, ...sectiune.plasa].flat();
  const minX = Math.min(...toate.map((p) => p[0])), maxX = Math.max(...toate.map((p) => p[0]));
  const minY = Math.min(...toate.map((p) => p[1])), maxY = Math.max(...toate.map((p) => p[1]));
  const s = 1000 / (maxX - minX);
  const cale = (inele: Array<Array<[number, number]>>) => inele.map((inel) => inel.map(([x, y], i) => `${i ? "L" : "M"}${((x - minX) * s + 20).toFixed(1)} ${((maxY - y) * s + 20).toFixed(1)}`).join("") + "Z").join("");
  writeFileSync(path.join(iesire, `termo-${forma}${setari.mod === "cutie" ? "-cutie" : ""}-sectiune.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${1040} ${((maxY - minY) * s + 40).toFixed(0)}"><rect width="100%" height="100%" fill="#fff"/>` +
    `<path d="${cale(sectiune.jos)}" fill="#2c7be5" fill-rule="evenodd"/><path d="${cale(sectiune.sus)}" fill="#1f8a5b" fill-rule="evenodd"/><path d="${cale(sectiune.plasa)}" fill="#f2b134" fill-rule="evenodd"/></svg>`);
  const text = instructiuni(info, setari, forma, "ro");
  writeFileSync(path.join(iesire, `termo-${forma}${setari.mod === "cutie" ? "-cutie" : ""}.3mf`), proiectBambu(proiectTermo(piese, setari, "ro", forma, info)));
  writeFileSync(path.join(iesire, `termo-${forma}${setari.mod === "cutie" ? "-cutie" : ""}-stl.zip`), arhivaStl(piese, text, "ro"));
  writeFileSync(path.join(iesire, `termo-${forma}${setari.mod === "cutie" ? "-cutie" : ""}.json`), JSON.stringify(info, null, 2));
}, 60_000);
