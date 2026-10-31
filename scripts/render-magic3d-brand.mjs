import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/*
 * Magic3D: rasterizeaza simbolurile marcii din SVG-urile din apps/web/public/assets/magic3d/
 * in PNG-urile si .ico-ul pe care un SVG nu le acopera (iOS, manifestul web, /favicon.ico),
 * plus cartea pentru previzualizarea linkurilor (og:image).
 *
 * Marca Magic3D are trasee si curbe, nu doar dreptunghiuri, asa ca tests/tools/renderBrandIcons
 * din layerling nu o poate desena; o deseneaza browserul. Rezultatele stau in arbore, deci scriptul
 * trebuie rulat doar cand se schimba marca. Rulare: node scripts/render-magic3d-brand.mjs
 */

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const assets = resolve(root, "apps/web/public/assets/magic3d");
const browser = [
  process.env.CHROME_PATH,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean).find((path) => existsSync(path));
if (!browser) throw new Error("Nu am gasit Chromium/Edge. Seteaza CHROME_PATH.");

const work = mkdtempSync(join(tmpdir(), "magic3d-brand-"));

function shoot(html, width, height, out) {
  const page = join(work, "page.html");
  writeFileSync(page, html);
  const result = spawnSync(browser, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--default-background-color=00000000",
    `--user-data-dir=${join(work, "profile")}`,
    `--window-size=${width},${height}`,
    `--screenshot=${out}`,
    pathToFileURL(page).href,
  ], { encoding: "utf8", timeout: 60000 });
  if (!existsSync(out)) throw new Error(`Captura ${out} a esuat: ${result.stderr}`);
}

const svgPage = (svg, size) =>
  `<!doctype html><html><body style="margin:0;background:transparent">` +
  svg.replace(/width="\d+" height="\d+"/, `width="${size}" height="${size}"`) +
  `</body></html>`;

const icon = readFileSync(join(assets, "magic3d-icon.svg"), "utf8");
const maskable = readFileSync(join(assets, "magic3d-icon-maskable.svg"), "utf8");
const logo = readFileSync(join(assets, "magic3d-logo-construction.svg"), "utf8");

for (const [svg, size, name] of [
  [icon, 192, "magic3d-icon-192.png"],
  [icon, 512, "magic3d-icon-512.png"],
  [maskable, 512, "magic3d-icon-maskable-512.png"],
  [maskable, 180, "apple-touch-icon.png"],
]) {
  shoot(svgPage(svg, size), size, size, join(assets, name));
  console.log(name);
}

// favicon.ico: trei PNG-uri intr-un container ICO (Windows si orice browser le citesc asa).
// Ferestrele headless de 16 px nu pornesc, asa ca marimile mici se deseneaza pe un canvas si
// se citesc din DOM.
const sizes = [16, 32, 48];
const tiny = `<!doctype html><html><body><pre id="out"></pre><script>
  const img = new Image();
  img.onload = () => {
    document.getElementById("out").textContent = ${JSON.stringify(sizes)}.map((size) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const context = canvas.getContext("2d");
      context.imageSmoothingQuality = "high";
      context.drawImage(img, 0, 0, size, size);
      return canvas.toDataURL("image/png");
    }).join("\\n");
  };
  img.src = "data:image/svg+xml;base64,${Buffer.from(icon).toString("base64")}";
</script></body></html>`;
writeFileSync(join(work, "tiny.html"), tiny);
const dumped = spawnSync(browser, [
  "--headless=new", "--disable-gpu", `--user-data-dir=${join(work, "profile")}`,
  "--virtual-time-budget=5000", "--dump-dom", pathToFileURL(join(work, "tiny.html")).href,
], { encoding: "utf8", timeout: 60000 });
const urls = [...(dumped.stdout ?? "").matchAll(/data:image\/png;base64,([A-Za-z0-9+/=]+)/g)].map((m) => m[1]);
if (urls.length !== sizes.length) throw new Error(`favicon: am primit ${urls.length} imagini din ${sizes.length}`);
const pngs = urls.map((data) => Buffer.from(data, "base64"));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((size, i) => {
  const entry = 6 + 16 * i;
  header.writeUInt8(size, entry);
  header.writeUInt8(size, entry + 1);
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(pngs[i].length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += pngs[i].length;
});
writeFileSync(resolve(root, "apps/web/public/favicon.ico"), Buffer.concat([header, ...pngs]));
console.log("favicon.ico");

// Cartea pentru linkuri: 1280x640, marca si un rand de text.
const card = `<!doctype html><html><head><meta charset="utf-8"><style>
  body{margin:0;width:1280px;height:640px;display:flex;align-items:center;justify-content:center;gap:56px;
    background:linear-gradient(135deg,#ffffff 0%,#eef9f0 100%);font-family:"Segoe UI",Arial,sans-serif;color:#1b2433}
  .mark svg{width:300px;height:300px}
  h1{margin:0;font-size:108px;letter-spacing:-2px;font-weight:800;color:#1b2433}
  h1 b{background:linear-gradient(180deg,#3ccf4e,#0b7a22);-webkit-background-clip:text;color:transparent}
  h1 span{font-size:64px;color:#6b7280;font-weight:600}
  p{margin:12px 0 0;font-size:40px;line-height:1.25;max-width:720px}
  small{display:block;margin-top:24px;font-size:28px;color:#6b7280}
</style></head><body><div class="mark">${logo}</div><div><h1>Magic<b>3D</b><span>.ro</span></h1>
<p>CAD gratuit pentru printare 3D, direct în browser</p><small>magic3d.ro · fără cont · STL, 3MF, STEP</small></div></body></html>`;
shoot(card, 1280, 640, join(assets, "magic3d-social.png"));
console.log("magic3d-social.png");

rmSync(work, { recursive: true, force: true });
