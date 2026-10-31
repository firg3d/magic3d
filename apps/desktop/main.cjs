// Magic3D pentru Windows: acelasi editor ca pe magic3d.ro, din exportul static, intr-o fereastra proprie.
//
// Fisierele site-ului se servesc local prin schema app://magic3d/, nu prin file://: editorul cere
// totul de la radacina (/_next/..., /occt/..., /magic3d/...) si are nevoie de o origine stabila,
// ca proiectele salvate in browser (IndexedDB, localStorage) sa ramana ale lui de la o pornire la alta.
// Doar cererea de oferta pleaca spre magic3d.ro, unde stau upload.php si config.json.

const { app, BrowserWindow, Menu, net, protocol, shell } = require("electron");
const { existsSync, statSync } = require("node:fs");
const { join, normalize, sep } = require("node:path");
const { pathToFileURL } = require("node:url");

const SCHEMA = "app";
const GAZDA = "magic3d";
const ORIGINE = `${SCHEMA}://${GAZDA}`;
const SITE_ONLINE = "https://magic3d.ro";

/** Exportul static: in aplicatia instalata e in resources/site, la dezvoltare e chiar exportul web. */
const SITE = app.isPackaged ? join(process.resourcesPath, "site") : join(__dirname, "..", "web", ".next-export");

/** Ce merge la server in loc sa fie cautat local. */
const LA_SERVER = new Set(["/oferta/upload.php", "/oferta/config.json"]);

protocol.registerSchemesAsPrivileged([
  { scheme: SCHEMA, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

async function raspunde(request) {
  const url = new URL(request.url);
  const cale = decodeURIComponent(url.pathname);

  if (LA_SERVER.has(cale)) {
    return net.fetch(`${SITE_ONLINE}${cale}${url.search}`, {
      method: request.method,
      headers: request.headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
      duplex: "half",
    });
  }

  // Scripturile PHP (store.php, proiectele de pe server) nu au ce rula aici.
  if (cale.endsWith(".php")) return new Response(null, { status: 404 });

  let fisier = normalize(join(SITE, cale));
  if (fisier !== SITE && !fisier.startsWith(SITE + sep)) return new Response(null, { status: 403 });
  if (existsSync(fisier) && statSync(fisier).isDirectory()) fisier = join(fisier, "index.html");
  if (!existsSync(fisier)) return net.fetch(pathToFileURL(join(SITE, "404.html")).href).then((r) => new Response(r.body, { status: 404, headers: r.headers }));
  return net.fetch(pathToFileURL(fisier).href);
}

const eAlNostru = (adresa) => adresa.startsWith(`${ORIGINE}/`) || adresa === ORIGINE;

function deschideFereastra() {
  const fereastra = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: "Magic3D",
    icon: join(SITE, "assets", "magic3d", "magic3d-icon-512.png"),
    backgroundColor: "#ffffff",
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true, spellcheck: false },
  });

  // Linkurile spre alte site-uri (WhatsApp, Praktik3D, GitHub) se deschid in browserul obisnuit.
  fereastra.webContents.setWindowOpenHandler(({ url }) => {
    if (eAlNostru(url)) return { action: "allow" };
    if (/^(https?|mailto):/i.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  fereastra.webContents.on("will-navigate", (event, url) => {
    if (eAlNostru(url)) return;
    event.preventDefault();
    if (/^(https?|mailto):/i.test(url)) void shell.openExternal(url);
  });

  void fereastra.loadURL(`${ORIGINE}/`);
  return fereastra;
}

if (!app.requestSingleInstanceLock()) {
  // A doua pornire aduce in fata fereastra deja deschisa, in loc sa mai deschida una peste aceleasi proiecte.
  app.quit();
} else {
  app.on("second-instance", () => {
    const fereastra = BrowserWindow.getAllWindows()[0];
    if (!fereastra) return;
    if (fereastra.isMinimized()) fereastra.restore();
    fereastra.focus();
  });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    protocol.handle(SCHEMA, raspunde);
    deschideFereastra();
  });

  app.on("window-all-closed", () => app.quit());
}
