import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/*
 * Magic3D: scrie modulele de forme ale colectiei "Craciun" din desenele SVG de langa ele.
 *  - apps/craciun/forme/*.svg -> formeSvg.ts: decorul (fulgi, stelute, brazi);
 *  - apps/craciun/turta/*.svg -> turtaSvg.ts: sabloanele de turta dulce, pe straturi cu nume fixe
 *    (data-rol): base, hang, gaura, decupaj, icing-outline, icing-cap, decor (cu data-nivel), name-zone.
 * SVG-urile sunt sursa: se editeaza in orice editor vectorial, cu viewBox -50 -50 100 100; o cale
 * cu fill="none" si stroke e o linie (latimea o da generatorul), celelalte sunt contururi pline.
 * Arcele (A) nu sunt suportate: se transforma in curbe la salvare.
 * Rulare dupa ce se schimba un desen: node scripts/magic3d-craciun-forme.mjs
 * (un test verifica fisierele generate fata de SVG-uri).
 */

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "apps", "web", "src", "magic3d", "apps", "craciun");

function caiSvg(svg) {
  return [...svg.matchAll(/<path\b([^>]*?)\/?>/g)].map((m) => ({
    d: m[1].match(/\sd="([^"]*)"/)?.[1] ?? "",
    linie: /fill="none"/.test(m[1]) && /stroke="/.test(m[1]),
    rol: m[1].match(/\sdata-rol="([^"]*)"/)?.[1] ?? "",
  })).filter((c) => c.d.trim());
}

const svguri = (folder) => readdirSync(folder).filter((f) => f.endsWith(".svg")).sort().map((f) => [f.replace(/\.svg$/, ""), readFileSync(join(folder, f), "utf8")]);

export function formeDinSvg(folder) {
  const forme = {};
  for (const [nume, svg] of svguri(folder)) {
    const cai = caiSvg(svg);
    forme[nume] = { pline: cai.filter((c) => !c.linie).map((c) => c.d), linii: cai.filter((c) => c.linie).map((c) => c.d) };
  }
  return forme;
}

export function modulForme(forme) {
  return `/* Generat de scripts/magic3d-craciun-forme.mjs din forme/*.svg; nu edita de mana. */\n\n` +
    `/** Desenele de decor (viewBox -50 -50 100 100): caile pline si liniile, ca atribute \`d\` SVG. */\n` +
    `export const FORME_SVG: Record<string, { pline: string[]; linii: string[] }> = ${JSON.stringify(forme, null, 2)};\n`;
}

export function turtaDinSvg(folder) {
  const forme = {};
  for (const [nume, svg] of svguri(folder)) {
    const cai = [...svg.matchAll(/<path\b([^>]*?)\/?>/g)].map((m) => ({
      d: m[1].match(/\sd="([^"]*)"/)?.[1] ?? "",
      linie: /fill="none"/.test(m[1]) && /stroke="/.test(m[1]),
      rol: m[1].match(/\sdata-rol="([^"]*)"/)?.[1] ?? "",
      nivel: m[1].match(/\sdata-nivel="([^"]*)"/)?.[1] ?? "simplu",
      tip: m[1].match(/\sdata-tip="([^"]*)"/)?.[1] ?? "",
    })).filter((c) => c.d.trim());
    const cu = (rol) => cai.filter((c) => c.rol === rol).map((c) => c.d);
    forme[nume] = {
      base: cu("base"), hang: cu("hang"), gaura: cu("gaura"), decupaje: cu("decupaj"), conturGlazura: cu("icing-outline"), capac: cu("icing-cap"),
      decor: cai.filter((c) => c.rol === "decor").map((c) => ({ d: c.d, linie: c.linie, nivel: c.nivel, tip: c.tip })),
      zonaNume: cu("name-zone"),
      // limitele inaltimii numelui (mm), din atributele zonei; lipsa = cele din config
      ...Object.fromEntries([["numeMin", "data-min"], ["numeMax", "data-max"]].flatMap(([cheie, atr]) => {
        const m = svg.match(new RegExp(`<path\\b[^>]*data-rol="name-zone"[^>]*\\s${atr}="([\\d.]+)"`));
        return m ? [[cheie, Number(m[1])]] : [];
      })),
    };
  }
  return forme;
}

export function modulTurta(forme) {
  return `/* Generat de scripts/magic3d-craciun-forme.mjs din turta/*.svg; nu edita de mana. */\n\n` +
    `export type DecorSablon = { d: string; linie: boolean; nivel: string; tip: string };\n\n` +
    `/** Sabloanele de turta dulce (straturile din SVG, ca atribute \`d\`): biscuitul, urechea si gaura ei, traseul cordonului, zapada, decorul pe niveluri, zona numelui. */\n` +
    `export const TURTA_SVG: Record<string, { base: string[]; hang: string[]; gaura: string[]; decupaje: string[]; conturGlazura: string[]; capac: string[]; decor: DecorSablon[]; zonaNume: string[]; numeMin?: number; numeMax?: number }> =${JSON.stringify(forme, null, 2)};\n`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  writeFileSync(join(dir, "formeSvg.ts"), modulForme(formeDinSvg(join(dir, "forme"))));
  writeFileSync(join(dir, "turtaSvg.ts"), modulTurta(turtaDinSvg(join(dir, "turta"))));
  console.log("formeSvg.ts si turtaSvg.ts scrise");
}
