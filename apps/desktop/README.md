# Magic3D pentru Windows

Același editor ca pe magic3d.ro, într-o aplicație Windows care merge și fără internet.
E un înveliș Electron peste exportul static al site-ului; codul editorului nu se schimbă.

## Construirea installerului

```bash
npm run export                 # din rădăcina repo-ului: apps/web/.next-export
cd apps/desktop
npm install
node node_modules/electron/install.js   # descarcă binarul Electron, o singură dată
npm run dist                   # apps/desktop/dist/Magic3D-Setup-<versiune>.exe
```

`npm start` pornește aplicația direct din export, fără installer.

## Ce merge altfel decât pe site

- Fișierele site-ului se servesc local, prin `app://magic3d/`. Proiectele rămân în aplicație, separat
  de cele salvate în browser.
- „Printează în România” trimite fișierele la `https://magic3d.ro/oferta/upload.php`, deci are
  nevoie de internet și de site-ul publicat.
- Proiectele de pe server (`store.php`) nu există în aplicație.
- Linkurile spre alte site-uri se deschid în browserul obișnuit.

Installerul nu e semnat digital, așa că la prima rulare Windows SmartScreen afișează
„Windows a protejat computerul”. Se trece cu „Mai multe informații” → „Rulează oricum”.
