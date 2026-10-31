import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

/*
 * Magic3D: trece paleta calda a layerling (maro, bej, portocaliu) pe paleta rece Magic3D
 * (gri reci si verdele marcii, #15803d), in toate fisierele .css din apps/web/src.
 *
 * Regula, nu o lista: o culoare cu nuanta intre 15 si 50 de grade (portocaliu-maro) primeste
 * nuanta verde a marcii Magic3D, aceeasi luminozitate, iar saturatia neutrelor scade - un bej devine
 * gri rece, nu verzui. Rosul (avertizari, stergere) si culorile filamentelor (culorile obiectelor
 * din scena) raman cum sunt. Se poate rula din nou dupa o sincronizare cu upstream: o culoare
 * deja convertita nu mai cade in intervalul cald.
 *
 * Rulare: node scripts/magic3d-recolor.mjs
 */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "apps", "web", "src");
const BRAND_HUE = 142; // verdele marcii Magic3D (#15803d)
const EXPLICIT = new Map([
  ["#dd7906", "#15803d"], // --primary
]);
// Liniile care definesc culorile filamentelor: sunt culori de obiect, nu de interfata.
const KEEP_LINE = /--filament-|--hover-accent/;

function hexToRgb(hex) {
  let h = hex.slice(1);
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
const toHex = (rgb) => "#" + rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToRgb([h, s, l]) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

/** Luminanta relativa (WCAG): ce ochiul citeste ca deschis/inchis, spre deosebire de L-ul din HSL. */
function luminance(rgb) {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function convert(rgb) {
  const [h, s] = rgbToHsl(rgb);
  if (s < 0.04 || h < 15 || h > 50) return null;
  // Neutrele calde (bej, maro) devin gri reci, abia colorate; accentele raman vii.
  const saturation = s < 0.45 ? Math.min(s * 0.45, 0.16) : Math.min(s, 0.6);
  // Aceeasi luminanta ca originalul: un auriu si un violet cu acelasi L din HSL nu arata la fel de
  // deschise, iar o grila aurie deschisa ar iesi violet inchis. Cautam L-ul care pastreaza luminanta.
  const target = luminance(rgb);
  let low = 0;
  let high = 1;
  for (let i = 0; i < 30; i += 1) {
    const mid = (low + high) / 2;
    if (luminance(hslToRgb([BRAND_HUE, saturation, mid])) < target) low = mid;
    else high = mid;
  }
  return hslToRgb([BRAND_HUE, saturation, (low + high) / 2]);
}

function recolor(text) {
  let changed = 0;
  const lines = text.split("\n").map((line) => {
    if (KEEP_LINE.test(line)) return line;
    let out = line.replace(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g, (hex) => {
      const lower = hex.toLowerCase();
      if (EXPLICIT.has(lower)) { changed++; return EXPLICIT.get(lower); }
      const next = convert(hexToRgb(lower));
      if (!next) return hex;
      changed++;
      return toHex(next);
    });
    out = out.replace(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(,\s*[\d.]+\s*)?\)/g, (all, r, g, b, alpha) => {
      const next = convert([Number(r), Number(g), Number(b)]);
      if (!next) return all;
      changed++;
      const [nr, ng, nb] = next.map(Math.round);
      return alpha ? `rgba(${nr}, ${ng}, ${nb}${alpha.replace(/\s+/g, " ").replace(/^,/, ",")})` : `rgb(${nr}, ${ng}, ${nb})`;
    });
    return out;
  });
  return { text: lines.join("\n"), changed };
}

function* cssFiles(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* cssFiles(path);
    else if (name.endsWith(".css")) yield path;
  }
}

// Culorile de interfata scrise in cod: planul de lucru, manerele din scena, rigla, bara browserului.
// Nu si shapeCatalog.ts sau paletele de culori ale corpurilor: acelea sunt culori de filament.
const CODE_FILES = [
  "lib/workplaneGrid.ts",
  "components/workplane/viewportScene.ts",
  "components/workplane/ViewportOverlays.tsx",
  "app/layout.tsx",
].map((file) => join(root, file));
// Testele care compara cu valorile implicite ale planului de lucru trec prin aceeasi regula,
// ca asteptarile lor sa urmeze codul.
const TEST_FILES = ["shadingSettings", "workplaneGrid", "workspaceColorSettings", "axisArrows", "gridLinesGrow"]
  .map((name) => join(root, "..", "..", "..", "tests", "unit", `${name}.test.ts`));
CODE_FILES.push(...TEST_FILES);

function recolorCode(text) {
  const first = recolor(text);
  let changed = first.changed;
  const out = first.text.replace(/\b0x([0-9a-fA-F]{6})\b/g, (all, hex) => {
    const next = convert(hexToRgb("#" + hex));
    if (!next) return all;
    changed++;
    return "0x" + toHex(next).slice(1);
  });
  return { text: out, changed };
}

let total = 0;
for (const file of [...cssFiles(root), ...CODE_FILES]) {
  const { text, changed } = (file.endsWith(".css") ? recolor : recolorCode)(readFileSync(file, "utf8"));
  if (changed) {
    writeFileSync(file, text);
    total += changed;
    console.log(`${relative(root, file)}: ${changed}`);
  }
}
console.log(`culori convertite: ${total}`);
