import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/*
 * Magic3D: scrie apps/web/src/magic3d/apps/craciun/formeSvg.ts din desenele SVG de langa el
 * (apps/craciun/forme/*.svg). SVG-urile sunt sursa: se editeaza in orice editor vectorial, cu
 * viewBox -50 -50 100 100; o cale cu fill="none" si stroke e o linie (latimea o da generatorul),
 * celelalte sunt contururi pline. Arcele (A) nu sunt suportate: se transforma in curbe la salvare.
 * Rulare dupa ce se schimba un desen: node scripts/magic3d-craciun-forme.mjs
 * (un test verifica fisierul generat fata de SVG-uri).
 */

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "apps", "web", "src", "magic3d", "apps", "craciun");

export function formeDinSvg(folder) {
  const forme = {};
  for (const fisier of readdirSync(folder).filter((f) => f.endsWith(".svg")).sort()) {
    const svg = readFileSync(join(folder, fisier), "utf8");
    const cai = [...svg.matchAll(/<path\b([^>]*?)\/?>/g)].map((m) => ({
      d: m[1].match(/\sd="([^"]*)"/)?.[1] ?? "",
      linie: /fill="none"/.test(m[1]) && /stroke="/.test(m[1]),
    })).filter((c) => c.d.trim());
    forme[fisier.replace(/\.svg$/, "")] = { pline: cai.filter((c) => !c.linie).map((c) => c.d), linii: cai.filter((c) => c.linie).map((c) => c.d) };
  }
  return forme;
}

export function modulForme(forme) {
  return `/* Generat de scripts/magic3d-craciun-forme.mjs din forme/*.svg; nu edita de mana. */\n\n` +
    `/** Desenele de decor (viewBox -50 -50 100 100): caile pline si liniile, ca atribute \`d\` SVG. */\n` +
    `export const FORME_SVG: Record<string, { pline: string[]; linii: string[] }> = ${JSON.stringify(forme, null, 2)};\n`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  writeFileSync(join(dir, "formeSvg.ts"), modulForme(formeDinSvg(join(dir, "forme"))));
  console.log("formeSvg.ts scris");
}
