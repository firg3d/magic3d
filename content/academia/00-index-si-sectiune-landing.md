---
slug: academia
titlu: "Academia 3D"
h1: "Academia 3D — tot ce trebuie să știi ca să printezi bine"
titluSeo: "Academia 3D — curs gratuit de printare 3D în română | Magic3D"
metaDescriere: "Curs gratuit de printare 3D în română: de ce eșuează printurile, ce filament alegi, ce imprimantă îți iei și cum treci de la o bucată la o comandă. Scris de un atelier care printează zilnic."
cuvinteCheie:
  - curs printare 3d
  - printare 3d pentru incepatori
  - cum se printeaza 3d
  - ghid printare 3d romana
capitol: 0
---

# Academia 3D — tot ce trebuie să știi ca să printezi bine

Patru capitole scrise dintr-un atelier cu 20 de imprimante care rulează zilnic, nu dintr-un manual tradus. Fără cont, fără abonament, fără email cerut la intrare. Citești ce ai nevoie, când ai nevoie.

> **Cine a scris asta**
>
> Academia 3D e scrisă de echipa Firg3D Printing SRL, atelierul din Sectorul 5, București, care operează magazinul Praktik3D și platforma Magic3D. Printăm comercial din 2022, cu 20 de imprimante FDM, printare SLA cu rășină, scanare 3D și gravare laser, pentru comenzi de la o bucată la câteva sute.
>
> Tot ce citești aici vine din comenzi reale, nu din documentație de producător. Când o observație e valabilă doar în anumite condiții, o spunem.
>
> [Despre atelier și echipă →](https://praktik3d.ro/pages/despre-noi)

## De unde începi

Nu citi de la cap la coadă dacă ai deja o problemă. Alege după unde te afli:

**Ai imprimantă și printul tocmai a eșuat** → începe cu capitolul 1. Acolo sunt cele șapte defecte care se repetă, recunoscute după cum arată piesa.

**Ai imprimantă și nu știi ce material să cumperi** → capitolul 2. Se decide dintr-o singură întrebare: unde ajunge obiectul.

**Nu ai încă imprimantă** → capitolul 3. Trei categorii, nu douăzeci de modele.

**Printezi deja și vrei să vinzi** → capitolul 4. Ce se schimbă când treci de la o bucată la cincizeci, și cum calculezi prețul ca să nu lucrezi degeaba.

---

## Cele patru capitole

### 1. Primul print care iese prost și de ce
Aderență, colțuri ridicate, straturi despicate, fire între piese, bază lățită, pereți cu goluri, straturi decalate. Fiecare defect cu cauza reală și fixul, plus regula care economisește cele mai multe ore: schimbă un singur lucru odată.
*9 minute*

### 2. Filamentul: ce alegi și pentru ce
PLA, PETG, ABS, ASA, TPU — judecate după destinația obiectului, nu după tabele de proprietăți. De ce un breloc de PLA lăsat pe bordul mașinii se curbează, ce rezistă la soare, și de ce umiditatea filamentului strică mai multe printuri decât orice setare greșită.
*8 minute*

### 3. Ce imprimantă 3D să îți iei
Trei categorii: prima imprimantă, imprimanta pentru cine vrea să vândă, și multicolor. Ce contează cu adevărat la alegere, ce costă multicolorul în material irosit, și de ce două mașini medii bat una scumpă.
*8 minute*

### 4. De la o bucată la o comandă
Ce se schimbă când printezi cincizeci: așezarea pe placă, ce se uzează în serie, cele cinci componente ale prețului real, și unde se pierde de fapt timpul într-o comandă personalizată.
*9 minute*

### Testul
Cincisprezece întrebări, cinci minute. Fiecare răspuns greșit vine cu explicația și cu link către capitolul potrivit. Nu se salvează nimic, nu îți cere nimic.

---

# Secțiune pentru landing

Se așază între secțiunea „De ce nu pur și simplu un program CAD" și „Parcurs".

**Eticheta secțiunii:** ACADEMIA 3D

**Titlu:** Academia 3D. Gratuit pentru toți.

**Subtitlu:**
Patru capitole despre ce se strică la printare și de ce, scrise dintr-un atelier cu 20 de imprimante care rulează zilnic. Fără cont, fără abonament, fără email cerut la intrare.

**Cele patru carduri:**

| Capitol | Titlu card | Text card |
|---|---|---|
| 1 | Primul print care iese prost | Cele șapte defecte care se repetă, recunoscute după cum arată piesa. Cauza reală și fixul, pentru fiecare. |
| 2 | Ce filament alegi | Se decide dintr-o singură întrebare: unde ajunge obiectul. De ce PLA nu rezistă în mașină vara. |
| 3 | Ce imprimantă să îți iei | Trei categorii, nu douăzeci de modele. Ce costă de fapt multicolorul. |
| 4 | De la o bucată la o comandă | Ce se schimbă la cincizeci de bucăți și cum calculezi prețul ca să nu lucrezi degeaba. |

**Butoane:** „Intră în Academie →" (primar) · „Începe cu primul capitol" (secundar)

**Linie de încheiere sub butoane:**
Scrisă de Firg3D Printing SRL — 20 de imprimante, București, Sectorul 5, din 2022.

---

# Note pentru implementare

## URL-uri și hreflang

```
/academia                                   RO, pagina hub
/academia/primul-print-care-iese-prost
/academia/ce-filament-alegi
/academia/ce-imprimanta-3d-alegi
/academia/de-la-o-bucata-la-o-comanda
/academia/test
/en/academy...                              echivalentele EN, mai târziu
```

Capitolele se generează din același `site.<lang>.json` și același șablon ca paginile de aplicație. Fiecare capitol e o intrare Vite proprie, cu `hreflang`, canonical și OG generat prin SVG→PNG cu sharp, ca restul site-ului.

## JSON-LD

Pagina hub primește `Course` (`isAccessibleForFree: true`, `inLanguage: ro-RO`), cu `hasPart` pentru fiecare capitol.

`provider` și `publisher` sunt aceeași `Organization`, cu datele reale ale firmei — asta e ce transformă conținutul din „încă un ghid" în sursă cu autoritate:

```json
{
  "@type": "Organization",
  "name": "Firg3D Printing SRL",
  "url": "https://firg3d.ro",
  "logo": "https://praktik3d.ro/cdn/shop/files/LOGO_PRAKTIK3D_3805b50e-07d3-4064-944d-1667642f4e48.png",
  "taxID": "51519313",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Strada Doina nr. 9",
    "addressLocality": "București",
    "postalCode": "052151",
    "addressCountry": "RO"
  },
  "telephone": "+40744330466",
  "email": "contact@firg3d.com",
  "sameAs": [
    "https://praktik3d.ro",
    "https://www.facebook.com/firg3d/",
    "https://www.instagram.com/praktik3d/",
    "https://www.youtube.com/@Firg3D3d",
    "https://www.tiktok.com/@praktik3dd"
  ]
}
```

Fiecare capitol primește `Article` cu `author` de tip `Person` — „Ion V. Frunzac", cu `worksFor` către organizația de mai sus — plus `BreadcrumbList`. Autor persoană, nu brand: Google tratează diferit conținutul semnat de un om identificabil.

Nu pune `FAQPage` pe capitole — nu sunt întrebări și răspunsuri, e proză continuă. Marcajul greșit face mai mult rău decât lipsa lui.

## Legături între site-uri

Academia trăiește pe magic3d.ro, dar autoritatea vine de pe praktik3d.ro, care are deja vechime și trafic. Leagă-le în ambele sensuri:

- din caseta de autor a fiecărui capitol → `praktik3d.ro/pages/despre-noi`
- din capitolul 3, unde discuți fiabilitatea și consumabilele → `praktik3d.ro/pages/printare-3d-la-comanda-bucuresti`, pentru cine citește și își dă seama că nu vrea imprimantă, vrea serviciul
- de pe praktik3d.ro, din meniu sau din blog → `magic3d.ro/academia`

A doua e importantă comercial: o parte din cititorii capitolului 3 vor concluziona că nu merită să cumpere mașină. Ăia devin clienți praktik3d, dacă le dai unde să apese.

## Navigare între capitole

Fiecare capitol se termină cu o punte către următorul, deja scrisă în text. Sub ea, o bară de navigare: capitolul anterior, indicatorul de poziție (1 din 4), capitolul următor. Progresul se ține în `localStorage`, doar ca marcaj vizual „citit" pe pagina hub — fără conturi, fără sincronizare.

## Testul

Cincisprezece întrebări cu variante, fără cronometru și fără notă de trecere. La fiecare răspuns greșit: explicația în două rânduri plus link ancorat la secțiunea relevantă din capitol. La final, o listă cu capitolele de recitit, nu un scor.

Stare în `localStorage`, sub `magic3d.academia.*`, separat de cheile de licență. Buton de reluare.

## Imagini

Capitolul 1 e cel care cere cel mai mult: fiecare defect are nevoie de o fotografie reală a piesei stricate. Sunt fotografiile care fac diferența față de orice ghid tradus, și nu pot fi înlocuite cu randări. Lista minimă:

- print desprins de pe pat, cu ghemul de filament
- colț ridicat, văzut lateral, cu baza vizibil curbată
- piesă cu straturi despicate, ruptă în mână
- fire între două piese pe aceeași placă
- bază lățită, comparată cu o piesă corectă alături
- perete cu goluri din sub-extrudare
- piesă cu straturi decalate la mijloc

Format identic pentru toate: același fundal, aceeași lumină, aceeași distanță. Alături de fiecare, o piesă corectă pentru comparație — comparația comunică mai mult decât defectul singur.

**Ce există deja** (de pe praktik3d.ro, refolosibile direct):

| Fotografie | Sursă | Unde se folosește |
|---|---|---|
| Linia de producție, imprimante în funcțiune | Despre Noi | caseta de autor, hub, secțiunea de landing |
| Stocul de filamente | Despre Noi | capitolul 2 |
| Piese finalizate | Despre Noi | capitolul 4 |
| Laser și imprimanta de format mare | Despre Noi | capitolul 3 |
| Clemă portbagaj auto din ASA | Printare la comandă | capitolul 2, secțiunea UV și exterior |
| Butoane bord Land Rover, original lângă copie | Printare la comandă | capitolul 2, aceeași secțiune |
| Rotiță de 7 mm printată SLA | Printare la comandă | capitolul 3, secțiunea „Când FDM nu e suficient" |
| Machetă velier PLA multicolor | Printare la comandă | capitolul 3, secțiunea multicolor |

Fotografia cu butoanele Land Rover, unde originalul stă lângă copie, e cea mai valoroasă din tot setul — comparația directă comunică instant ce înseamnă reverse engineering, fără explicație.

Trebuie recomprimate: sunt exporturi WhatsApp servite de pe CDN-ul Shopify. Descarcă-le, convertește în WebP și AVIF, servește-le de pe magic3d.ro cu dimensiuni explicite. Nu le încărca prin hotlink de pe Shopify — pierzi controlul asupra LCP-ului.

**Ce lipsește și blochează capitolul 1:** toate fotografiile de mai sus arată lucrări reușite. Capitolul 1 are nevoie de opusul lor — cele șapte defecte, fotografiate ca atare. Nu se pot substitui și nu se pot randa. Cu 20 de imprimante în producție, materialul apare de la sine: de acum, orice print eșuat se fotografiază înainte să ajungă la coș, pe același fundal, cu o piesă corectă alături pentru comparație.

## Ordinea de publicare

Publică întâi capitolul 1, singur, cu pagina hub. E cel care aduce traficul valoros și e cel care îți arată, din termenii de căutare, ce trebuie să conțină restul. Capitolele 2–4 urmează la câteva săptămâni distanță.

Testul vine ultimul. Nu are sens înainte să existe toate cele patru capitole.
