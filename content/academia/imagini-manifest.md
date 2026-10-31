---
sursa: praktik3d.ro (CDN Shopify)
iesire: public/academia/img/
latimi: [640, 1000, 1600]
formate: [avif, webp]
---

# Manifestul imaginilor din Academia 3D

Fișierul ăsta e INTRAREA lui `scripts/importa-imagini-academia.mjs`. Tabelul de mai jos se
citește ca date, nu ca documentație: fiecare rând devine un set de fișiere în `public/academia/img/`
și o intrare în `public/academia/imagini.json`, cu dimensiunile reale măsurate după conversie.

**De ce se importă, nu se face hotlink.** Fotografiile sunt exporturi WhatsApp servite de pe CDN-ul
Shopify al magazinului Praktik3D — 200–400 kB fiecare, în JPEG, la dimensiuni pe care nu le
controlăm. Servite direct de acolo, LCP-ul paginii depinde de un CDN străin și de un magazin care
poate să-și rearanjeze fișierele oricând. Se descarcă O SINGURĂ DATĂ (originalul rămâne în
`content/academia/_sursa/`, iar rulările următoare îl refolosesc), se convertesc local în AVIF și
WebP la trei lățimi, și se servesc de pe magic3d.ro cu `width`/`height` explicite.

**Coloana `stare`** spune dacă fotografia există:

- `sursa` — are URL, se descarcă și se convertește;
- `lipsa` — încă nu există. Intră totuși în `imagini.json`, marcată, iar pagina randează un LOCAȘ
  GOL în locul ei. Nu se substituie cu altceva: o fotografie de piesă reușită pusă în locul unui
  defect ar fi exact minciuna pe care capitolul 1 o combate.

## Atelier și autoritate

Fotografiile care arată CINE scrie. Se folosesc în caseta de autor, pe hub și în capitolele unde
subiectul e chiar atelierul.

| id | stare | fisier | sectiune | sectiune_en | alt | alt_en | unde |
|---|---|---|---|---|---|---|---|
| atelier-linie | sursa | WhatsApp_Image_2026-08-04_at_09.37.42_2.jpg |  |  | Imprimante 3D în funcțiune în atelierul Firg3D din București | 3D printers running in the Firg3D workshop in Bucharest | hub, caseta de autor, landing |
| atelier-paralel | sursa | WhatsApp_Image_2026-08-04_at_09.37.43.jpg |  |  | Imprimante 3D printând comenzi în paralel | 3D printers running customer orders in parallel | hub |
| stoc-filamente | sursa | WhatsApp_Image_2026-08-04_at_09.37.42_1.jpg | cele-patru-materiale-pe-scurt | the-four-materials-briefly | Stoc de filamente pentru printare 3D, role de PLA, PETG și ASA pe rafturi | Filament stock for 3D printing: PLA, PETG and ASA spools on the shelves | capitolul 2 |
| piese-finalizate | sursa | WhatsApp_Image_2026-08-04_at_09.37.42.jpg |  |  | Obiecte printate 3D finalizate | Finished 3D printed objects | capitolul 4 |
| laser-format-mare | sursa | WhatsApp_Image_2026-08-04_at_09.44.34.jpg |  |  | Gravor laser și imprimantă 3D de format mare 800x1000 mm | Laser engraver and large-format 800x1000 mm 3D printer | capitolul 3 |

## Studii de caz

Piese reale, din comenzi reale. Sunt fotografiile care despart un ghid tradus de un text scris
dintr-un atelier: se vede piesa, nu o randare.

Fotografia cu butoanele Land Rover — ORIGINALUL LÂNGĂ COPIE — e cea mai valoroasă din tot setul.
Comparația directă comunică instant ce înseamnă reproducerea unei piese, fără explicație. E
imaginea principală a capitolului 2 și sursa pentru imaginea lui Open Graph.

| id | stare | fisier | sectiune | sectiune_en | alt | alt_en | unde |
|---|---|---|---|---|---|---|---|
| butoane-land-rover | sursa | WhatsApp_Image_2026-08-03_at_17.30.55_1.jpg | intrebarea-care-decide-aproape-totul-unde-ajunge-obiectul | the-question-that-settles-almost-everything-where-does-the-object-end-up | Butoane de bord Land Rover Defender reproduse prin scanare 3D și printate din ASA negru, originalul alături de copii | Land Rover Defender dashboard buttons reproduced by 3D scanning and printed in black ASA, the original next to the copies | capitolul 2, imagine principală și sursă OG |
| clema-asa | sursa | WhatsApp_Image_2026-08-03_at_17.28.23_1.jpg | intrebarea-care-decide-aproape-totul-unde-ajunge-obiectul | the-question-that-settles-almost-everything-where-does-the-object-end-up | Clemă de închidere portbagaj auto, reprodusă prin scanare 3D și printată din ASA negru | Car boot latch clip, reproduced by 3D scanning and printed in black ASA | capitolul 2, aceeași secțiune |
| rotita-sla | sursa | WhatsApp_Image_2026-08-03_at_17.30.56_2.jpg |  |  | Rotiță zimțată de 7 mm pentru ceas turometru, reprodusă prin printare SLA cu rășină | A 7 mm toothed gear for a tachometer, reproduced by SLA resin printing | capitolul 3, când FDM nu e suficient |
| macheta-velier | sursa | WhatsApp_Image_2026-08-04_at_09.02.46.jpg |  |  | Machetă de velier modelată 3D după fotografii și printată din PLA multicolor | A sailing ship model, 3D modelled from photographs and printed in multicolour PLA | capitolul 3, multicolor |

Toate se iau de sub `https://cdn.shopify.com/s/files/1/1051/2688/7769/files/`, cu excepția siglei,
care nu se importă (nu se folosește în Academie).

**Coloana `sectiune`** e slug-ul titlului de nivel 2 sub care se așază fotografia, în capitolul
din coloana `unde`. Goală = fotografia e disponibilă, dar capitolul care o folosește nu e încă
scris. Mai multe fotografii pot împărți aceeași secțiune: se așază una după alta, în ordinea din
manifest.

## Fotografiile de defecte — LIPSESC și blochează ilustrarea capitolului 1

Cele șapte de mai jos sunt singurele care nu pot fi înlocuite cu nimic: toate fotografiile
existente arată lucrări REUȘITE, iar capitolul 1 e despre opusul lor. Nu se randează și nu se
substituie. Coloana `sectiune` spune sub ce subtitlu din capitol se așază fiecare.

Format cerut, identic pentru toate: același fundal, aceeași lumină, aceeași distanță, și o piesă
CORECTĂ alături — comparația comunică mai mult decât defectul singur.

| id | stare | sectiune | sectiune_en | alt | alt_en | unde |
|---|---|---|---|---|---|---|
| defect-desprindere | lipsa | printul-nu-se-lipeste-de-pat | the-print-will-not-stick-to-the-bed | Print desprins de pe pat, cu ghemul de filament format în jurul duzei, lângă aceeași piesă printată corect | A print that came off the bed, with the tangle of filament around the nozzle, next to the same part printed correctly | capitolul 1 |
| defect-warping | lipsa | colturile-se-ridica-de-pe-placa | the-corners-lift-off-the-plate | Colț ridicat de pe placă, văzut lateral, cu baza vizibil curbată, lângă o piesă cu baza plană | A corner lifted off the plate, seen from the side, with the base visibly curled, next to a part with a flat base | capitolul 1 |
| defect-delaminare | lipsa | straturile-se-despica | the-layers-split | Piesă cu straturile despicate, ruptă în mână, lângă o piesă cu straturile sudate | A part with split layers, broken by hand, next to a part whose layers are welded | capitolul 1 |
| defect-stringing | lipsa | fire-subtiri-intre-piese | thin-strings-between-parts | Fire subțiri de plastic între două piese printate pe aceeași placă, lângă aceleași piese fără fire | Thin plastic strings between two parts printed on the same plate, next to the same parts without them | capitolul 1 |
| defect-picior-elefant | lipsa | baza-e-mai-lata-decat-restul | the-base-is-wider-than-the-rest | Piesă cu baza lățită, picior de elefant, alături de aceeași piesă cu baza dreaptă | A part with a splayed base, elephant foot, next to the same part with a straight base | capitolul 1 |
| defect-subextrudare | lipsa | peretii-au-goluri-sau-firul-lipseste-pe-alocuri | the-walls-have-gaps-or-the-strand-is-missing-in-places | Perete cu goluri din sub-extrudare, lângă un perete printat complet | A wall with gaps from under-extrusion, next to a fully printed wall | capitolul 1 |
| defect-decalaj | lipsa | piesa-e-decalata-la-mijloc | the-part-is-shifted-in-the-middle | Piesă cu straturile decalate lateral de la mijloc în sus, lângă o piesă aliniată | A part with the layers shifted sideways from the middle up, next to an aligned part | capitolul 1 |
