# Spike: geometrie 3D din contururi de font cursiv

Întrebarea unică a acestui spike: **se poate genera geometrie 3D validă
(2-manifold închis) din contururile unui font cursiv, unde literele se
suprapun?** Dacă nu, restul proiectului nu are sens.

Răspuns: **DA.** Toate cele 3 cazuri produc un solid manifold închis
(`status() == NoError`), verificat și independent de manifold-3d.

## Rulare

```bash
npm install
npm run spike      # rulează cele 3 cazuri, scrie out/*.stl
```

(Dacă `tsx` nu pornește: `npm approve-scripts esbuild`.)

## Ce face

`src/textSolid.ts` — o singură funcție `textSolid(font, text, hMM, gMM)`:

1. `font.getPath()` → comenzi Bézier (scala aplicată devreme, după **capHeight**)
2. flatten adaptiv, toleranță 0.05 mm la scara finală
3. grupare în poligoane cu găuri prin **containment** (paritate de imbricare),
   winding normalizat după **aria semnată** — nu se presupune convenția fontului
4. **union** cu `polygon-clipping` — pasul critic, dizolvă suprapunerile literelor
5. scală după `capHeight` (nu bounding box) — "A" și "Q" ies la aceeași înălțime
6. `earcut` pe fața frontală
7. extrudare: față + spate (normale inversate) + pereți laterali, cu vârfuri
   **partajate** (indici comuni) ca mesh-ul să iasă închis
8. `Manifold` din mesh (aruncă dacă nu e 2-manifold orientabil)
9. `status()` check

`src/spike.ts` — cele 3 cazuri + diagnostice. `src/stl.ts` — export STL binar.

## Rezultate

| Caz | text | status | vol (mm³) | tri | comp. conexe | timp |
|-----|------|--------|-----------|-----|--------------|------|
| 1 | `A` (Archivo Black, 180×25) | NoError | 521 192 | 48 | 1 | ~7 ms |
| 2 | `matei` (Great Vibes, 45×2.5) | NoError | 1 934 | 2540 | 2 (corp + punct) | ~16 ms |
| 3 | `Ianis` (Great Vibes, 45×2.5) | NoError | 2 566 | 3312 | 3 (I + anis + punct) | ~14 ms |
| 4 | `O` (Archivo Black, 120×25) | NoError | 260 190 | 1032 | 1 | ~5 ms |
| 5 | `Ștefan` (Great Vibes, 45×2.5) | NoError | 3 323 | 3772 | 3 (Ș-body + tefan + virgulă) | ~14 ms |
| 6 | `Mădălina` (Great Vibes, 45×2.5) | NoError | 5 353 | 6000 | 5 (2 corpuri + 2 breve + punct) | ~21 ms |

- **Union chiar dizolvă suprapuneri:** caz 2 → 1.79%, caz 3 → 1.94%, caz 5 → 1.81%,
  caz 6 → 1.19% arie dizolvată. Literele cursive se suprapun real; union-ul le unește corect.
- **Punctul pe „i"** apare ca o componentă conexă separată în toate cazurile
  cursive, arie **17.06 mm²** (identică — același glif, aceeași scală).
- **Caz 4 (literă curbă):** muchia curbă e netedă la toleranță — săgeata max
  măsurată din mesh = **0.0398 mm ≤ 0.05 mm** (258 vârfuri pe contur, 2 bucle).
- **Caz 5/6 (diacritice RO):** verificare glife ÎNAINTE de generare — toate cele
  10 glife comma-below/breve sunt prezente în Great Vibes (Ș U+0218 ≠ cedila U+015E);
  nicio substituire, nicio cedilă. **Descoperire:** accentele plutitoare (breve
  peste ă, virgula sub Ș, punctul pe i) sunt **componente conexe separate** — la
  litere fizice ar cădea; au nevoie de bridging sau placă-suport.
- **Scală după capHeight** verificată: „A" iese exact 180.00 mm înălțime.
- **Watertight verificat independent:** 0 muchii de frontieră, 0 muchii
  non-manifold pe mesh-ul brut, înainte de orice procesare manifold-3d.

## Fonturi (SIL OFL)

- `fonts/ArchivoBlack-Regular.ttf` — sans-serif bold (majusculă)
- `fonts/GreatVibes-Regular.ttf` — cursiv conectat (nume)

## Instalare pe hosting: formularul de contact

Pagina `/contact` postează către `contact-magic3d.php`, care are nevoie de PHP activ și de o
configurare care NU stă în depozit. Pașii, în ordine:

**1. Cheia secretă reCAPTCHA, în afara rădăcinii publice.**
Copiază `content/contact/config-magic3d.example.php` pe server, cu un nivel DEASUPRA rădăcinii
publice, și redenumește-l `config-magic3d.php`:

```
/home/utilizator/config-magic3d.php      <- aici, NU în public
/home/utilizator/public_html/            <- rădăcina publică
```

Completează în el cheia secretă, destinatarul și domeniile permise. Fișierul e în `.gitignore`
și nu trebuie să ajungă niciodată în git. Cheia veche, care era scrisă direct în `contact.php`,
se consideră expusă: **rotește-o din consola Google înainte de a o pune aici.**

**2. Cheia publică, în conținut.**
`site.ro.json` și `site.en.json` au câmpul `contact.recaptchaCheie`, momentan gol. Pune cheia
publică (site key) în amândouă și rulează `npm run genereaza`. Cât timp e goală, pagina afișează
o notă că verificarea nu e configurată, iar trimiterile sunt respinse de server.

**3. magic3d.ro în lista de domenii a cheii reCAPTCHA.**
În consola Google, la cheia folosită, domeniul `magic3d.ro` trebuie să fie în lista de domenii
permise. Dacă lipsește, verificarea eșuează pentru toată lumea, iar formularul răspunde doar cu
mesajul generic „Verificarea «Nu sunt robot» a eșuat" — fără nimic în log care să spună de ce.

**4. Directorul de încărcări.**
`incarcari/` se creează singur, lângă `contact-magic3d.php`, la prima trimitere cu fișiere.
Are nevoie ca directorul părinte (rădăcina publică) să permită scriere: `755` pe director e de
ajuns dacă PHP rulează ca proprietarul. Dacă nu se creează, fă-l manual și dă-i `755`.

**5. Verifică protecția directorului.**
La prima încărcare, endpointul scrie `incarcari/.htaccess` care oprește motorul PHP și forțează
descărcarea. Verifică-l după prima trimitere:

```bash
cat public_html/incarcari/.htaccess
```

Trebuie să conțină `php_flag engine off` și `Header set Content-Disposition "attachment"`. Dacă
lipsește, directorul e executabil, iar un fișier încărcat ar putea rula ca script — oprește
formularul până îl pui manual.

**Ce NU se schimbă:** `raport.php` rămâne pe loc, cu butonul lui din aplicație. Cele două fluxuri
sunt distincte: raportul duce diagnosticul tehnic automat, formularul de contact duce mesaje
scrise de om, cu atașamente.
