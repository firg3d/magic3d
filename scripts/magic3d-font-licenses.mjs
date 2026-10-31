import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import opentype from "opentype.js";

/*
 * Magic3D: scrie apps/web/public/magic3d/fonts/LICENTE.md din fonturile insesi - pentru fiecare
 * familie, nota de copyright si licenta din tabela "name" a fisierului (campurile 0, 13 si 14).
 * Textele integrale ale licentelor stau langa: OFL-1.1.txt si LICENSE-Apache-2.0.txt.
 * Un font a carui licenta nu e nici OFL, nici Apache apare la "De verificat" - nu se livreaza
 * pana nu e lamurit. Rulare dupa ce se adauga fonturi: node scripts/magic3d-font-licenses.mjs
 */

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "apps", "web", "public", "magic3d", "fonts");
const name = (font, key) => {
  const entry = font.names?.[key];
  return (entry?.en ?? Object.values(entry ?? {})[0] ?? "").replace(/\s+/g, " ").trim();
};

// Fonts whose file does not name its licence, checked by hand in github.com/google/fonts
// (the folder a family sits in, ofl/ or apache/, is its licence there).
const CHECKED = {
  Tangerine: "OFL-1.1", // google/fonts ofl/tangerine/OFL.txt
  Yellowtail: "Apache-2.0", // google/fonts apache/yellowtail/LICENSE.txt
};

const families = new Map();
for (const file of readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".ttf")).sort()) {
  const bytes = readFileSync(join(dir, file));
  const font = opentype.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  const family = name(font, "fontFamily") || file;
  const license = `${name(font, "license")} ${name(font, "licenseURL")}`;
  const kind = /open font license|OFL|openfontlicense/i.test(license) ? "OFL-1.1" : /apache/i.test(license) ? "Apache-2.0" : CHECKED[family] ?? "?";
  const entry = families.get(family) ?? { files: [], copyright: new Set(), kind };
  entry.files.push(file);
  if (name(font, "copyright")) entry.copyright.add(name(font, "copyright"));
  if (entry.kind === "?" && kind !== "?") entry.kind = kind;
  families.set(family, entry);
}

const lines = [
  "# Licențele fonturilor Magic3D",
  "",
  "Fonturile din acest director vin de la Google Fonts. Fiecare are licența și nota de copyright scrise și în fișierul .ttf.",
  "Textele integrale: [OFL-1.1.txt](OFL-1.1.txt) (SIL Open Font License 1.1) și [LICENSE-Apache-2.0.txt](LICENSE-Apache-2.0.txt).",
  "",
  "Generat de `scripts/magic3d-font-licenses.mjs`; nu edita de mână.",
  "",
];
const unknown = [...families].filter(([, entry]) => entry.kind === "?");
if (unknown.length) {
  lines.push("## De verificat", "", ...unknown.map(([family, entry]) => `- **${family}** (${entry.files.join(", ")}): licența nu e scrisă în font.`), "");
}
lines.push("## Familii", "", "| Familie | Licență | Copyright |", "|---|---|---|");
for (const [family, entry] of [...families].sort((a, b) => a[0].localeCompare(b[0]))) {
  lines.push(`| ${family} | ${entry.kind} | ${[...entry.copyright].join(" · ").replace(/\|/g, "/") || "-"} |`);
}
writeFileSync(join(dir, "LICENTE.md"), lines.join("\n") + "\n");
console.log(`familii: ${families.size}, OFL: ${[...families.values()].filter((e) => e.kind === "OFL-1.1").length}, Apache: ${[...families.values()].filter((e) => e.kind === "Apache-2.0").length}, de verificat: ${unknown.length}`);
