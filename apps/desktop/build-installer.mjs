// Construieste installerul Windows (Magic3D-Setup-<versiune>.exe) din exportul static al site-ului.
//
//   npm run export            (din radacina repo-ului: face apps/web/.next-export)
//   npm run dist              (din apps/desktop: face installerul in apps/desktop/dist)
//
// electron-builder scrie intr-un folder temporar si abia apoi copiem installerul aici: makensis nu
// poate scrie fisierul final cand calea contine doua spatii la rand ("D:\Proiecte  AI\..."), si
// atunci opreste totul cu "Can't open output file".

import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const AICI = dirname(fileURLToPath(import.meta.url));
const EXPORT = join(AICI, "..", "web", ".next-export", "index.html");
const TEMP = join(tmpdir(), "magic3d-desktop-dist");
const versiune = JSON.parse(readFileSync(join(AICI, "package.json"), "utf8")).version;
const installer = `Magic3D-Setup-${versiune}.exe`;

if (!existsSync(EXPORT)) {
  console.error("Lipseste exportul static. Ruleaza intai `npm run export` in radacina repo-ului.");
  process.exitCode = 1;
} else {
  rmSync(TEMP, { recursive: true, force: true });
  const builder = join(AICI, "node_modules", "electron-builder", "cli.js");
  const rezultat = spawnSync(process.execPath, [builder, "--win", "nsis", `--config.directories.output=${TEMP}`], { cwd: AICI, stdio: "inherit" });
  if (rezultat.status !== 0) {
    process.exitCode = rezultat.status ?? 1;
  } else {
    mkdirSync(join(AICI, "dist"), { recursive: true });
    copyFileSync(join(TEMP, installer), join(AICI, "dist", installer));
    console.log(`Installer: ${join(AICI, "dist", installer)}`);
  }
}
