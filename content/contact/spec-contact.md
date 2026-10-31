# Pagina de contact Magic3D — specificație

## Ce s-a schimbat față de `contact.php` existent

| Problemă în versiunea actuală | Reparație |
|---|---|
| Cheia secretă reCAPTCHA hardcodată în fișier | Mutată în `../config-magic3d.php`, în afara rădăcinii publice |
| `HTTP_HOST` folosit nefiltrat la construirea linkurilor din email | Verificat față de o listă de domenii permise |
| Directorul de încărcări fără protecție la execuție | `.htaccess` scris automat: motor PHP oprit, handlere eliminate, `Content-Disposition: attachment` |
| Validare doar după extensie | Extensie plus verificare MIME reală cu `finfo` |
| Fișierele rămân pe disc la nesfârșit | Curățare automată după 30 de zile |
| Fără limitare de rată | 5 trimiteri pe oră per IP |
| Un singur fișier | Până la 4, câte 15MB |

**De făcut acum, înainte de orice:** rotește cheia secretă reCAPTCHA. Cea din
fișierul actual a fost expusă.

## Fișierul de configurare

`config-magic3d.php`, cu un nivel deasupra rădăcinii publice:

```php
<?php
return [
    'recaptcha_secret' => 'CHEIA_NOUA_DUPA_ROTIRE',
    'destinatar'       => 'contact@firg3d.com',
    'domenii_permise'  => ['magic3d.ro', 'www.magic3d.ro'],
];
```

Adaugă-l în `.gitignore`.

## Câmpurile formularului

| Nume câmp | Tip | Obligatoriu | Observații |
|---|---|---|---|
| `categorie` | select | da | `problema`, `tematica`, `generator`, `baza`, `licenta`, `altele` |
| `aplicatie` | select | nu | cele 9 aplicații, plus `platforma` și `nu-se-aplica` |
| `nume` | text | da | max 120 caractere |
| `email` | email | da | validat server-side |
| `mesaj` | textarea | da | minim 20 caractere, max 8000 |
| `fisiere` | file, multiple | nu | max 4 × 15MB; imagini, STL, 3MF, OBJ, ZIP, PDF |
| `diagnostic` | hidden | nu | completat automat de aplicație |
| `limba` | hidden | da | `ro` sau `en` |
| `website` | hidden | — | capcană anti-spam, trebuie să rămână gol |
| `g-recaptcha-response` | — | da | reCAPTCHA v2 checkbox |

## Relația cu `raport.php` existent

Magic3D are deja `public/raport.php` pentru raportarea problemelor, cu blocul de
diagnostic din `raport.ts`. Nu construi două fluxuri paralele.

Varianta recomandată: `contact-magic3d.php` îl înlocuiește pe `raport.php`.
Butonul de raportare din aplicație deschide pagina de contact cu
`?categorie=problema&aplicatie=<curenta>`, iar blocul de diagnostic existent se
scrie în câmpul ascuns `diagnostic`. Utilizatorul îl poate vedea și șterge
înainte de trimitere — e o cerință rezonabilă de confidențialitate, iar
diagnosticul conține starea licenței.

---

# Prompt pentru Claude Code

```
Adaugă pagina de contact și contribuții pentru Magic3D.

Fișierele sunt în content/contact/:
  contact-magic3d.php   — endpointul, gata scris
  spec-contact.md       — acest document, cu toate câmpurile

═══ PARTEA 1: pagina ═══

Intrare Vite nouă, în ambele limbi:
  /contact   →   /en/contact

Foloseşte exact aceeași infrastructură ca paginile de aplicație și ca
Academia: același generator din site.<lang>.json, același șablon,
același OG prin SVG→PNG. Nu construi un sistem paralel.

Tot textul trece prin site.ro.json și site.en.json — etichete de
câmpuri, opțiunile din select, mesajele de eroare, textul de succes.
Nimic hardcodat în șablon.

Pagina nu e doar un formular. Deasupra lui, o secțiune scurtă care
spune ce fel de mesaje sunt utile:
  - probleme întâlnite, cu capturi de ecran
  - propuneri de tematici și decorațiuni noi
  - idei de generatoare care lipsesc
  - propuneri de baze și postamente
  - întrebări despre licența comercială

Formularul se pre-completează din parametrii URL: ?categorie=... și
?aplicatie=... Validează valorile față de listele din spec; o valoare
necunoscută se ignoră, nu produce eroare.

Câmpul „aplicatie" se afișează doar pentru categoriile unde are sens
(problema, tematica, baza) și se ascunde pentru licenta și altele.

Încărcarea fișierelor: zonă drag-and-drop plus buton clasic,
previzualizare pentru imagini, buton de ștergere per fișier, contor
„2 din 4". Validare client-side pentru mărime și extensie, ca
utilizatorul să afle înainte de upload — dar validarea server-side
rămâne singura de încredere.

Stări clare: în curs de trimitere (buton dezactivat, indicator),
succes (mesaj, formular golit), eroare (mesajul exact de la server,
nu unul generic).

reCAPTCHA v2 checkbox. Cheia publică din site.<lang>.json, nu
hardcodată.

═══ PARTEA 2: înlocuiește raport.php ═══

public/raport.php se retrage. Butonul de raportare din aplicație
deschide /contact?categorie=problema&aplicatie=<aplicația curentă>.

Blocul de diagnostic construit azi în raport.ts se scrie în câmpul
ascuns „diagnostic", DAR utilizatorul trebuie să îl poată vedea și
șterge înainte de trimitere: un panou pliabil „Ce trimitem despre
sesiunea ta", cu conținutul vizibil și un buton de eliminare.
Diagnosticul conține starea licenței — nu se trimite pe ascuns.

Rezolvă și problema semnalată anterior: eticheta de licență ajunge în
raport fără diacritice. Folosește varianta cu diacritice.

═══ NU STRICA CE MERGE ═══

Academia, capitolele existente, paginile de aplicație, landingul și
logica de licențiere din src/core/config/licenta-token.ts trebuie să
funcționeze exact ca înainte.

Înainte de orice modificare într-un fișier partajat — generatorul de
pagini, șabloanele, componentele comune — verifică ce altceva îl
consumă. Dacă o schimbare cerută de pagina de contact ar schimba
comportamentul altei pagini, oprește-te și spune-mi; nu alege tu
compromisul.

═══ VERIFICĂRI, cu rezultate raportate ═══

- pagina randează identic în ro și en, cu tot textul din fișierele de
  conținut
- verificarea de sincronizare între site.ro.json și site.en.json trece
- hreflang complet și reciproc pe ambele variante
- sitemap.xml conține ambele pagini
- pre-completarea din URL funcționează, iar o valoare invalidă e
  ignorată fără eroare
- trimitere fără reCAPTCHA respinsă
- fișier peste 15MB respins client-side, cu mesaj clar
- al cincilea fișier refuzat
- capcana „website" completată → răspuns 200 fără email trimis
- panoul de diagnostic se poate goli, iar cererea pleacă fără el
- toate suitele existente trec

Adaugă config-magic3d.php în .gitignore și scrie în README pașii de
instalare pe hosting: unde se pune fișierul de configurare, ce
permisiuni are directorul de încărcări, cum se verifică că .htaccess-ul
a fost scris.

Raportează onest ce a rămas parțial.
```
