# Publicarea pe magic3d.ro

Scris pentru cineva care nu a mai publicat un site. Se citește o dată, de sus în jos, iar la
publicările următoare ajunge un singur pas: `npm run publica`.

---

## Ce se urcă și ce nu

Se urcă **doar folderul `dist/`**, exact așa cum îl produce buildul. Nimic altceva: nu `src/`,
nu `node_modules/`, nu `content/`, nu `.git`. Acelea sunt materia primă din care se face `dist/`;
pe server n-au ce căuta și ar fi, unele, chiar periculoase.

**Nu se urcă niciodată** (scriptul le refuză singur):

| Ce | De ce |
|---|---|
| `.env` | conține parola contului de FTP |
| `config-magic3d.php` | conține cheia secretă reCAPTCHA — stă pe server, în afara rădăcinii publice |
| `node_modules/` | 400 MB de dependențe folosite doar la build |

**Nu se șterge niciodată de pe server**, chiar dacă nu există în `dist/`:

- `incarcari/` — fișierele trimise de oameni prin formularul de contact;
- `config-magic3d.php` — configurarea formularului;
- `cgi-bin/`, `.well-known/` — ale găzduirii și ale certificatului SSL.

---

## Structura pe server

Asta e partea unde se greșește cel mai des. `config-magic3d.php` stă **cu un nivel DEASUPRA**
rădăcinii publice, nu în ea:

```
/home/utilizator/
├── config-magic3d.php        ← AICI. Nu se poate citi din browser.
└── public_html/              ← rădăcina publică = tot ce e în dist/
    ├── .htaccess
    ├── index.html            ← pagina de prezentare (landing)
    ├── litere.html           ← aplicația Litere Decor
    ├── nume.html, rame.html, ...
    ├── contact-magic3d.php
    ├── raport.php
    ├── incarcari/            ← se creează singur, la prima trimitere cu fișiere
    ├── academia/  en/  contact/  assets/  fonts/  tematici/
    ├── sitemap.xml
    └── robots.txt
```

Dacă pui `config-magic3d.php` în `public_html/`, oricine îl poate cere de pe internet și îți
citește cheia secretă. Un nivel mai sus, serverul web nu are cum să-l servească — dar PHP-ul îl
citește, fiindcă îl caută cu `__DIR__ . '/../config-magic3d.php'`.

**Conținutul lui** e în `content/contact/config-magic3d.example.php`. Copiază-l, redenumește-l și
completează cheia secretă.

---

## Directorul de încărcări

`incarcari/` **se creează singur**, lângă `contact-magic3d.php`, la prima trimitere cu fișiere.
Ca să poată, `public_html/` trebuie să permită scriere procesului PHP — pe cPanel e cazul
implicit.

Dacă nu apare după o trimitere de probă cu atașament, fă-l manual din File Manager și dă-i
permisiunile **755**.

**Verifică protecția**, o singură dată, după prima trimitere cu fișier:

```bash
cat public_html/incarcari/.htaccess
```

Trebuie să conțină `php_flag engine off` și `Header set Content-Disposition "attachment"`. Alea
opresc execuția: fără ele, cineva care încarcă un fișier `.php` deghizat l-ar putea rula pe
serverul tău. Dacă fișierul lipsește, oprește formularul până îl pui manual.

---

## reCAPTCHA

Două lucruri, amândouă obligatorii:

1. **Cheia publică**, în `content/site.ro.json` și `content/site.en.json`, la
   `contact.recaptchaCheie`. Cât timp e goală, pagina spune deschis că verificarea nu e
   configurată, iar serverul respinge orice trimitere.
2. **`magic3d.ro` în lista de domenii a cheii**, în consola Google reCAPTCHA. Dacă lipsește,
   verificarea eșuează pentru toată lumea, iar formularul răspunde doar cu
   „Verificarea «Nu sunt robot» a eșuat" — fără nimic în log care să spună de ce. E cea mai
   frecventă cauză a unui formular care „nu merge" după mutarea pe domeniu nou.

Cheia **secretă** se pune în `config-magic3d.php`, pe server. Cea veche, care a stat scrisă în
`contact.php`, se consideră expusă: **rotește-o din consolă** înainte s-o folosești.

---

## Publicarea propriu-zisă

Prima dată:

```bash
cp .env.exemplu .env
```

Completează în `.env` gazda, utilizatorul, parola și directorul (`/public_html`). Datele sunt în
cPanel → FTP Accounts; fă-ți un cont dedicat, limitat la `public_html`, nu folosi contul
principal.

Apoi, de fiecare dată:

```bash
npm run publica
```

Face, în ordine: șterge `dist/`, rulează buildul curat, verifică fișierele critice, se conectează
prin FTPS și urcă **doar ce s-a schimbat**, comparând mărimea și data cu ce e pe server. La final
spune câte fișiere a urcat din total, câte a lăsat neatinse și cât a durat.

Ca să vezi ce ar face, fără să atingă serverul:

```bash
npm run publica -- --proba
```

### Fără FTP: o arhivă pentru File Manager

Dacă preferi să urci prin File Manager-ul din cPanel, sau dacă n-ai încă datele de FTP:

```bash
npm run publica -- --arhiva
```

Scrie la rădăcina proiectului `magic3d-<data>-<ora>.zip` (~57 MB), cu structura serverului deja
făcută înăuntru: `public_html/` cu tot ce se urcă, `DEASUPRA_public_html/` cu exemplul de
configurare, și `CITESTE-MA.txt` cu pașii și lista de verificare. Directorul `incarcari/` vine cu
protecția `.htaccess` deja în el, luată chiar din codul endpointului, ca cele două să nu poată
diverge.

Arhiva se verifică singură după scriere: se redeschide și se caută în ea fișierele care se pierd
cel mai ușor la arhivare — cele care încep cu punct, `.htaccess` în primul rând. Un site fără el
merge la prima vedere: fără redirect, fără HTTPS forțat, fără cache, cu directoarele la vedere.

**Despre parolă.** Scriptul folosește implicit **FTPS** (TLS explicit), deci datele de conectare
sunt criptate. Dacă serverul refuză TLS, singura cale rămâne FTP simplu, unde **parola circulă în
clar prin rețea** — scriptul nu coboară singur la el; trebuie să pui `PUBLICA_NESECURIZAT=da` în
`.env`, ca alegerea să fie conștientă. Dacă ajungi acolo, **cere de la hostgate acces SSH/SFTP**;
e gratuit la majoritatea planurilor și rezolvă problema definitiv.

---

## Lista de verificare, după prima publicare

Deschide fiecare punct în browser și bifează:

- [ ] **landingul se încarcă** — https://magic3d.ro arată pagina de prezentare, nu aplicația
- [ ] **o pagină interioară, deschisă direct în bara de adrese** — lipește
      https://magic3d.ro/academia/ce-filament-alegi/ și apasă Enter; trebuie să se deschidă, nu 404
- [ ] **versiunea EN** — https://magic3d.ro/en/ și butonul „Română" din colț duce înapoi
- [ ] **formularul de contact trimite** — https://magic3d.ro/contact/, completează și trimite un
      mesaj de probă cu o poză atașată; verifică emailul pe contact@firg3d.com
- [ ] **`?licenta=<cod>` activează licența** — deschide o **fereastră privată** (altfel ai deja
      licența din browserul tău) și intră pe
      https://magic3d.ro/litere.html?licenta=CODUL; trebuie să apară bannerul verde, iar în
      bara de jos „Licență Comercială"
- [ ] **linkurile de checkout** — butoanele de pe https://magic3d.ro/token.html duc la produsele
      corecte în Shopify, cu prețul potrivit
- [ ] **sitemap.xml e public** — https://magic3d.ro/sitemap.xml se deschide și conține toate cele
      5 perechi de adrese
- [ ] **HTTPS forțat și www redirecționat** — scrie în bară `http://www.magic3d.ro` și apasă
      Enter; trebuie să ajungi la `https://magic3d.ro`, dintr-un singur pas

Dacă un punct pică, oprește-te la el: restul listei nu are sens până nu e rezolvat.

---

## Ce e bine de știut despre cache

`.htaccess` cere browserelor să țină **un an** fișierele din `/fonts/`, `/tematici/`, `/base/` și
tot ce are hash în nume, fiindcă acelea nu se schimbă niciodată sub același nume. HTML-ul se ține
doar 5 minute, ca o publicare nouă să se vadă imediat.

Consecința: dacă înlocuiești un font sau o tematică **păstrându-i numele**, oamenii care au fost
deja pe site vor vedea versiunea veche luni de zile. Redenumește fișierul când îi schimbi
conținutul — e singura regulă de ținut minte.
