# Magic3D — Semnătura Praktik3D și generatorul de huse iPhone

> **STARE: HUSELE SUNT ÎN FUNDAL PÂNĂ LA VALIDAREA COTELOR.**
>
> Aplicația e ascunsă din interfață — nu apare în comutator, n-are card în grila de pe prima
> pagină, nu i se generează pagina de prezentare. Codul, datele și testele rămân neatinse, iar
> suita continuă s-o acopere; `/huse.html` se deschide direct pe adresă, pentru dezvoltare.
>
> **De ce.** Din cele 26 de modele, patru sunt verificate fizic; restul sunt transcrise din desene
> și se recitesc, după ce prima husă printată pe cote estimate n-a nimerit (17 Pro Max: gaură
> inutilă sus, butoane în afară, muchie plată în loc de curbată). Un utilizator care printează o
> husă care nu se potrivește nu se întoarce.
>
> **Cum se reactivează:** se scoate `ascuns: true` din `src/core/config/aplicatii.ts` și din
> `content/site.*.json`. Testul de linkuri păzește ca ascunderea să fie completă în toate locurile
> sau în niciunul.

Document de design pentru agentul de cod. Două părți, două valuri separate, cu puncte de oprire obligatorii.

- **Partea A — Semnătura** (val SEM.1): mecanism de platformă, în nucleu, refolosit de toate generatoarele noi.
- **Partea B — Huse iPhone** (val HUS.1 și HUS.2): primul generator care folosește semnătura.

Regulă de citire: tot ce e marcat **DECIZIE** e închis și nu se rediscută în implementare. Tot ce e marcat **OPRIRE** e un punct în care agentul se oprește, raportează și așteaptă aprobare.

---

## Decizii de politică (închise)

1. **DECIZIE** Cele **12** generatoare existente rămân exact cum sunt: gratuite, fără filigran, fără semnătură. Nicio modificare de geometrie la ele. Test de regresie obligatoriu pe toate 12:

   litere · nume · brelocuri · fagure · cutii · cuvinte · LED · articulate · plăcuțe · rame · **brelocuri-decor** · **nume-led**

   *Corectat la implementare (2026-09-04).* Prima redactare spunea „11" și enumera 10: lipsea Brelocuri Decor. Nume LED a fost construit după redactarea documentului și e clasificat aici, explicit, ca generator EXISTENT — gratuit, fără semnătură. `src/apps/demo` e o pagină de probă, în afara comutatorului de aplicații, și nu intră în regresie.
2. **DECIZIE** Orice generator nou (începând cu husele) e gratuit pentru uz personal, dar exportul poartă semnătura Praktik3D integrată în geometrie.
3. **DECIZIE** Licența comercială (149 RON, tokenul ECDSA existent, format `M3D1.<payload>.<sig>`) permite: export fără semnătură, sau logo propriu din SVG în locul semnăturii.
4. **DECIZIE** Tokenul de suporter (15 RON) NU scoate semnătura. Rămâne ce e azi: fișiere token3d, fără drept comercial.

4b. **DECIZIE** Dreptul comercial se poartă într-un singur câmp nou de payload, `comercial?: boolean`, absent = `false`. Tokenurile ECDSA deja emise rămân valide și rămân fără drept comercial.

4c. **DECIZIE** Există o a doua cale de licențiere, pe care prima redactare a documentului n-o pomenea: **codurile fixe** (`src/core/config/coduri-fixe.ts`), permanente, fără titular și fără dată de expirare. Și ele acordă dreptul: `PlanFix` primește `comercial` — `true` pentru codul licenței web (149 RON), `false` pentru suporter.
5. **DECIZIE** Obiectivul tehnic nu e „imposibil de scos", ci „scoaterea costă mai mult decât 149 RON în timp, pricepere sau calitate". Nu se investește în protecții care contrazic generarea locală/offline.
6. **DECIZIE** Semnătura e discretă: wordmark „praktik3d.ro", gravat, dimensiune-țintă 9 × 2,5 mm, poziționat în zona curbată de la baza spatelui. Nu e un banner.

---

## PARTEA A — Semnătura (val SEM.1)

### A.1 Ce se construiește

Un modul de nucleu `nucleu/semnatura/` cu o singură funcție publică, apelată din interiorul funcției de construcție a geometriei fiecărui generator nou:

```ts
aplicaMarcaj(corp: Manifold, ctx: ContextMarcaj): Manifold
```

unde `ContextMarcaj` conține: regiunea de aplicare (suprafață + normală + cadru local), starea licenței verificate, logo-ul propriu (dacă există) și parametrii de textură ai regiunii.

Funcția returnează un **singur** Manifold. Nu returnează niciodată logo-ul ca obiect separat.

### A.2 Cele patru straturi de robustețe

**Strat 1 — Un singur corp.** Semnătura se scade boolean din corp cu manifold-3d. Exportul 3MF conține un singur obiect, fără componente, fără ierarhie. Nu există nimic de „șters" în slicer; pentru a o scoate trebuie adăugat material.

**Strat 2 — Integrare în textură.** În modul gratuit, regiunea din jurul semnăturii (minimum 30 × 15 mm) este obligatoriu texturată (pattern de grip, linii, fagure fin — reutilizează motorul de pattern din Litere Fagure). Semnătura e o insulă netedă gravată în interiorul texturii. Orice petec adăugat în slicer (Add part → Cube) apare ca o pată netedă vizibilă în mijlocul texturii. Regiunea texturată e parte din designul husei gratuite, nu o pedeapsă: se prezintă ca „zonă de grip".

**Strat 3 — Suprafață curbată.** Zona de aplicare e pe racordul curbat dintre spate și marginea inferioară, nu pe planul spatelui. Un cub plan nu se potrivește; umplerea cere modelare manuală.

**DECIZIE (HUS.2): straturile 2 și 3 sunt ALTERNATIVE — cel puțin unul, nu amândouă.** Pe o
suprafață plană, stratul 2 singur e suficient: textura cu semnătura ca insulă netedă în mijlocul
ei face petecul din slicer la fel de vizibil ca pe o curbură.

Motivul e măsurat, nu presupus: husa n-are racord curbat între spate și muchie — spatele e o
placă plană, iar peretele urcă vertical din ea. Chiar rotunjind muchia exterioară, arcul ar avea
sub 2,2 mm înălțime de suprafață, iar stratul 2 cere o zonă texturată de minimum 30 × 15 mm. Pe un
arc de 2 mm nu încape. Cerându-le pe amândouă, niciun generator cu piese subțiri n-ar fi putut
respecta A.2.

**Strat 4 — Poarta de licență nu e un `if` izolat.** Parametrii regiunii de marcaj (mod: `semnatura` | `logo-propriu` | `fara`) derivă din payload-ul verificat al tokenului, în aceeași funcție care construiește geometria. Fără payload valid, funcția nu are din ce construi varianta fără semnătură. Codul rămâne minificat. Se acceptă că un dezvoltator hotărât poate trece; nu e clientul-țintă.

### A.3 Amprenta pentru exporturile licențiate

Orice export cu licență validă primește un micro-marcaj în interiorul piesei (invizibil la utilizare): numărul licenței, gravat 0,3 mm, înălțime literă 2 mm, pe o suprafață interioară definită de generator. Scop: dacă apare pe piață un fișier „curat", se știe din ce licență a ieșit. Acest marcaj nu e opțional și nu apare în UI ca setare.

Exporturile gratuite primesc același micro-marcaj cu textul `M3D` + data exportului (AAAA-LL-ZZ), fără date personale.

Pe o licență activată prin **cod fix**, micro-marcajul gravează id-ul codului. Un cod fix nu are titular, deci identifică lotul, nu cumpărătorul.

**DECIZIE (HUS.2): numărul licenței se gravează DOAR la export comercial** (`comercial: true`).
La export gratuit ȘI la cel de suporter se gravează amprenta generică `M3D` + data.

Prima redactare spunea „orice export cu licență validă". Un token de suporter E valid — doar fără
drept comercial — deci primea numărul, iar piesa ieșea diferită de cea gratuită cu 6,9 mm³. Asta
contrazicea A.7(4), care cere ca un token de suporter să dea exact exportul gratuit. Restrângerea
împacă cele două clauze: amprenta nominativă are rost acolo unde există drept de vânzare, adică
unde un fișier „curat" ar putea ajunge pe piață. Măsurat după corectare: export gratuit, expirat
și de suporter ies identice la 1e-9 cm³, pe toți cei patru piloți.

**DESCHIS** — trasabilitatea per cumpărător pentru codurile fixe. Azi un cod fix e partajabil și amprenta nu spune cine l-a folosit. Val viitor; nu se rezolvă în SEM.1.

### A.4 Export

- 3MF cu un singur obiect; fără metadate de proiect (fără config Bambu/Orca, fără rețeta parametrică, fără nume de fișiere sursă).
- Fișa de producție primește o linie nouă: „Marcaj: semnătura Praktik3D" / „Marcaj: logo propriu" / „Marcaj: fără (licența nr. …)".
- STL rămâne disponibil doar unde era deja (token3d). Pentru generatoarele noi, export implicit 3MF.

### A.5 Logo propriu (licență)

- Upload SVG, max 200 KB, o singură culoare, fără text neconvertit în path (dacă există `<text>`, se refuză cu mesaj clar: „Convertește textul în contururi").
- Normalizare: se scalează la aceeași cutie de 9 × 2,5 mm (raport de aspect păstrat), se extrudează și se scade boolean în aceeași regiune curbată, cu aceeași adâncime (0,5 mm).
- Validare de printabilitate: nicio trăsătură sub 0,8 mm lățime (două linii cu duza 0,4). Dacă logo-ul are detalii mai fine, se afișează avertisment și previzualizare cu zonele problematice, iar utilizatorul alege să continue sau nu.
- Regiunea de textură rămâne prezentă și în modul comercial (e design, nu pedeapsă), dar poate fi dezactivată din UI doar cu licență.

### A.6 Texte de interfață și site (obligatoriu în același val)

- În fiecare generator nou, sub butonul de export: „Export gratuit cu semnătura Praktik3D. Vrei fără sau cu logo-ul tău? Licența comercială — 149 RON". Link către `token.html#comercial`.
- Pe landing, secțiunea de prețuri: cardul Gratuit primește rândul „Generatoarele de litere: fără filigran. Generatoarele noi: cu semnătura Praktik3D". Cardul Comercial primește rândul „Logo propriu sau fără semnătură pe toate generatoarele".
- FAQ nou: „Ce e semnătura Praktik3D?" — două propoziții: ce e, unde e, cum dispare.
- Versiunea EN echivalentă în `content/site.en.json`.

Promisiunea „fără filigran" existentă nu se șterge; se precizează că se referă la generatoarele de litere.

### A.7 Teste (obligatorii, în suita existentă)

1. Regresie: pentru fiecare din cele 11 generatoare existente, exportul e identic byte-cu-byte (sau, dacă serializarea nu e deterministă, identic ca volum și număr de triunghiuri) cu exportul dinaintea valului.
2. Export gratuit al unui generator nou: un singur obiect în 3MF; volumul corpului e mai mic decât volumul aceluiași corp fără marcaj cu o diferență în intervalul așteptat pentru semnătură (se calibrează la primul rulaj și se fixează ca interval).
3. Export cu token valid și mod `fara`: volumul egal cu corpul nemarcat (± micro-marcajul interior).
4. Token modificat (semnătură ECDSA invalidă), token expirat sau token de suporter: exportul e identic cu exportul gratuit.
5. Logo SVG cu trăsătură de 0,5 mm: avertisment afișat; export permis doar după confirmare.
6. Manifold: fiecare export trece verificarea de manifold existentă (fără găuri, fără autointersecții).

### A.7b DESCHIS — testul reconstrucției la schimbarea licenței

Marcajul iese din starea licenței, iar starea se poate schimba DUPĂ ce s-a construit piesa.
Verificarea licenței e asincronă, deci prima construcție pleacă înainte ca starea să fie gata.
Bug prins pe viu în SEM.1 și reparat: după `?licenta=…` bara spunea „Licență Comercială", iar
piesa rămânea cu semnătura până când se atingea un parametru — exportul ar fi plecat marcat, cu
licență activă.

Reparația e verificată manual, de două ori, dar **nu are test automat**: e comportament de
shell, greu de probat headless.

**Primește test în VIS.1**, când shell-ul se refactorizează: starea licenței → parametrii de
marcaj devine o funcție PURĂ, chemată la fiecare reconstrucție, cu test pe tranziția
„necunoscut → comercial". Nu blochează HUS.1.

### A.8 OPRIRE 1

După A.1–A.5 implementate și testele A.7 verzi, agentul se oprește și raportează: număr de teste rulate/trecute, diferența de volum măsurată pentru semnătură, două capturi (export gratuit, export licențiat). Nu se trece la Partea B fără aprobare.

---

## Reguli de cod (adăugate în timpul valurilor)

### R.1 — `process.exit(` interzis în scripturi și teste

Folosește `process.exitCode = n`. Verificat de `npm run verifica:reguli`, care rulează în CI și
în hook-ul de pre-commit.

**De ce.** După o operație manifold, `process.exit` taie procesul cât timp WASM-ul încă se
închide, iar libuv crapă pe Windows cu `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)`
și cod 127 — suita raportează EȘEC deși toate verificările au trecut. Izolat: `add` + `exit` =
127, `add` + `exitCode` = 0, `add` singur = 0, `decompose` + `exit` = 0.

Regula e **uniformă**, nu doar pentru fișierele care încarcă WASM: altfel ar trebui decis de
fiecare dată care fișier e „sigur", iar verificarea n-ar mai fi una simplă.

**Înlocuirea nu e mecanică peste tot.** Acolo unde ieșirea era TIMPURIE, `exitCode` singur ar lăsa
scriptul să meargă mai departe — la publicare, ar fi însemnat să urce un build despre care tocmai
spusese că e stricat. Fișierele acelea sunt învelite în `main()`, ca `return` să oprească execuția
exact unde o oprea `exit`.

*Notă istorică: reparația exista deja în `layout.test.ts`, scrisă într-o sesiune anterioară, cu
aceeași explicație. A fost redescoperită pe drumul lung fiindcă nu era scrisă nicăieri ca regulă.
De-aia are acum verificare automată: o lecție care stă într-un comentariu se învață de două ori.*

### R.4 — testele de poziție și orientare măsoară în spațiul SCENEI

*(numărul e 4, nu 2: R.2 și R.3 erau deja luate când s-a scris regula asta.)*

Orice verificare de poziție, orientare sau așezare pe placă se face **după** `manifoldToGeometry`,
în coordonatele scenei — niciodată în cele ale modelului.

**Conversia neagă Y.** `manifoldToGeometry` scrie `pos[i*3+1] = -src[i*np+1]`, convenția Y-jos
moștenită din motorul de text și purtată de tot proiectul. Deci **verticala scenei e −Y din
model**: punctul cel mai de jos pe ecran e cel cu Y-ul cel mai MARE aici, iar „stă pe placă"
înseamnă `max Y == 0`, nu `min Y == 0`.

**De ce e regulă, nu notă.** Am așezat husa cu `min` și am scris verificarea tot cu `min`. Testul
a trecut verde în timp ce piesa atârna sub placă în toate cele trei orientări — fiindcă repeta
exact greșeala în loc s-o prindă. Un test scris în același sistem de coordonate greșit ca produsul
nu verifică nimic; îi confirmă produsului propria eroare.

Nume LED făcea de la început ce trebuie — `translate([0, -bb.max[1], 0])`, cu comentariul „talpa
la y = 0". Existența unui exemplu corect în depozit nu m-a oprit: îl citisem și îl luasem drept
altceva. De-aia regula e scrisă, nu doar exemplificată.

#### R.4 se aplică și TEXTULUI — dar orientarea o dă FAȚA, nu calea de cod

**Textul pe suprafețe se verifică pe fiecare cale separat, fiindcă pot diverge — iar criteriul de
corectitudine se întoarce pe X între cele două fețe ale piesei.**

**Reperul fizic** (confirmat de operator pe piesa printată): husa se printează cu exteriorul
spatelui pe placă, semnătura atinge placa. Un text se citește privind fața pe care e gravat
**dinspre partea în care arată normala ei**. De aici, două clase, cu cerințe INVERSE:

| fața | normala | unde | orientarea în fișier |
|---|---|---|---|
| interioară | +Z | fundul cavității (micro-marcajul), fața de sus a inelului ramei | **directă** |
| exterioară | −Z | spatele husei (semnătura, logo-ul, numele gravat) | **oglindită pe X** |

*Rama de probă n-are „interior"; criteriul nu e apartenența, ci sensul citirii. Eticheta ei stă pe
o față cu normala +Z, deci intră în prima clasă.*

**Cum s-a ajuns aici, în două runde.** Prima rundă a măsurat un „L" asimetric pe fiecare cale și a
găsit trei din patru răsturnate **pe Y**:

| calea | centroidul unui „L" | verdict de atunci |
|---|---|---|
| semnătura gravată (prin `matriceCadru`) | (−0,78; −0,63) | corectă |
| numele gravat pe spate | (−2,14; **+**1,73) | răsturnată pe Y |
| micro-marcajul | (−0,30; **+**0,24) | răsturnată pe Y |
| eticheta ramei | (−0,30; **+**0,24) | răsturnată pe Y |

Y-ul era diagnosticat corect — `textSolid` întoarce glife în convenția `getPath`, cu Y în jos, iar
semnătura scăpase fiindcă `matriceCadru` construiește `b = n × t` și pentru spate (n = (0,0,−1),
t = (1,0,0)) duce local +Y în model −Y. Dar corectura a tratat toate căile la fel, ca și cum
orientarea ar fi o proprietate a textului. **Nu e: e o proprietate a feței.** Rezultatul a fost o
reparație pe jumătate — micro-marcajul, care e pe fața interioară, chiar a ieșit bine; semnătura
și numele, care sunt pe cea exterioară, au rămas oglindite pe fața care contează.

A doua rundă a măsurat și fața, sondând materialul de deasupra și de dedesubtul fiecărei gropi:

| calea | groapa (z) | material | fața |
|---|---|---|---|
| semnătura | −1,40 .. −0,90 | numai deasupra | exterioară |
| numele de pe spate | −1,40 .. −0,90 | numai deasupra | exterioară |
| micro-marcajul | −0,30 .. 0,00 | numai dedesubt | interioară |
| eticheta ramei | 8,51 .. 8,81 | numai dedesubt | interioară |

**Unde stau cele două corecturi.** `siluetaText(font, text, înălțime, față)` din
`src/apps/huse/husa.ts` întoarce Y-ul întotdeauna și X-ul doar pe fața exterioară. Semnătura și
logo-ul nu trec pe acolo — ele intră în `aplicaMarcaj`, deci li se oglindesc inelele pe X la
intrare, în `buildHusa` (`oglindesteX`). Negarea lui x inversează sensul de parcurgere al fiecărui
inel, iar nucleul construiește `CrossSection` cu regula `NonZero`: fără reinversarea ordinii
punctelor, conturul exterior ar fi citit ca gaură și marcajul ar ieși ca un dreptunghi plin cu
litere scoase din el. Că nu se întâmplă se vede pe volumul scos, neschimbat la micron: 54,8 mm³
semnătura, 77,0 mm³ logo-ul.

**De ce nu în `textSolid`, deși ar fi „un singur loc la sursă".** Trei motive, în ordinea
greutății. Orientarea nu e o proprietate a textului, ci a feței pe care ajunge — `textSolid` n-are
de unde s-o știe. Apoi, el hrănește unsprezece din cele douăsprezece generatoare înghețate
(DECIZIA 1). Și, cel mai rău: **o răsturnare nu schimbă nici volumul, nici numărul de triunghiuri,
nici componentele** — exact cele trei cote pe care le compara regresia. S-ar fi oglindit textul în
toate cele douăsprezece, în tăcere, cu suita verde.

De-aia regresia compară de acum și **centroidul proiecției**, singura dintre cotele ei care își
schimbă semnul la oglindire: 30 din cele 32 de corpuri au o asimetrie măsurabilă (≥ 0,02 mm), deci
un viitor mirror tăcut e vizibil pe ele.

**Criteriul nu e o cifră fixă.** Două lucruri îl mută, și amândouă au produs deja diagnostice
greșite. **Șirul**: eticheta ramei nu poate fi un „L" singur, fiindcă `textGravare` îi lipește
mereu jocul; pentru „L · 0,25" orientarea corectă are masa în dreapta-sus, iar un criteriu fix
(−X, −Y) ar fi declarat oglindit exact exemplarul bun. **Fața**: pe cea exterioară criteriul se
întoarce pe X, iar un criteriu care ignoră fața a lăsat semnătura și numele să treacă verzi
oglindite. Verificarea ia deci semnele din unitatea de text, pentru șirul chiar folosit, pe fața
chiar măsurată — cu ancoră în cazul „L" singur, unde reperul fizic decide direct.

**Fața se măsoară, nu se declară.** O adnotare scrisă de mână pe fiecare marcaj ar fi repetat
exact presupunerea care a produs bug-ul. `scripts/verifica-oglindire-3mf.mjs` pune un cub subțire
sub și peste groapă și se uită unde a mai rămas material.

#### Preview-ul și 3MF-ul NU sunt în același sistem

`build3MF` scrie coordonatele modelului **ca atare**; negarea de Y stă doar în
`manifoldToGeometry`, adică doar pe drumul către ecran. Verificat pe toate cele patru căi, vârf cu
vârf, în ordine: 4036 / 4035 / 4027 / 1790 vârfuri, zero nepotriviri, abatere maximă 0,005 µm —
rotunjirea celor cinci zecimale ale scrierii, nimic altceva.

Consecința practică: **fișierul e adevărul**, iar ce se măsoară în spațiul modelului e exact ce
ajunge în feliator. Verificarea stă în `scripts/verifica-oglindire-3mf.mjs` (`npm run
verifica:oglindire`) și face amândouă părțile — groapa gravată pe piesă, cu fața ei, și
identitatea fișierului cu modelul.

*(O primă variantă izola groapa direct din fișier, pe planul Z al podelei. Mergea pentru semnătură
și numele de pe spate — cifre identice cu cele din model — dar la micro-marcaj planul prindea și
coloana tăietorului care iese în cavitate: 2,43 mm lățime pentru un „L" de 1,35. Măsurătoarea pe
manifold n-are ambiguitatea asta.)*


## HUS.2.B — Bumperul (spate deschis)

Al treilea tip de piesă, lângă husa completă și rama de probă: pereții laterali pe tot conturul,
decupajele funcționale, și **două buze** — cea de fixare peste fața ecranului și una de
`BUZA_SPATE` = **1,0 mm dinspre spate**. Peretele din spate lipsește; din el rămâne doar buza,
de jur împrejur. Telefonul e prins între cele două și se vede prin fereastra dintre ele.

### De ce a intrat acum, nu „mai târziu"

Fiindcă locul semnăturii trebuia decis înainte, nu după. SEM.1 leagă exportul gratuit de marcaj,
iar un bumper fără loc de semnătură ori nu se poate exporta gratuit, ori sparge regula. Tipul de
piesă și locul marcajului se construiesc împreună.

### Retenția — singura cerință care contează aici

Prima variantă tăia pur și simplu la `z = 0` și ieșea curată la toate măsurătorile: o bucată, buza
de sus continuă, telefonul blocat cu 240-304 mm³ la ridicare. Numai că îl bloca **doar pe față**:
în spate nu mai era nimic de care să se oprească, deci aluneca afară pe unde intrase, ținut doar
de frecarea pereților. **Buza dinspre spate închide sensul ăla** — cerință a operatorului, și
corectă.

Amândouă buzele trebuie să fie continue pe tot conturul. O buclă întreruptă nu strânge, se desface
— exact ce s-a întâmplat la rama de probă, unde breșa camerei tăia și peretele. Se măsoară cu
ACEEAȘI metodă, felie la două înălțimi: prin fiecare buză → **0 întreruperi**; prin perete →
ferestrele funcționale, care au voie să taie acolo.

**Măsurat înainte de a construi**, ca să nu iasă o cerință imposibilă: pe husa completă buza de sus
e *deja* continuă la toate cele opt modele, fiindcă ferestrele se opresc sub ea — ele taie
peretele, în 5-8 locuri. Piesa rămâne o singură componentă fiindcă segmentele de perete atârnă de
buze.

Efectul se verifică în ambele sensuri: manechinul ridicat cu 0,5 mm rămâne blocat cu **240-353
mm³**, coborât cu 0,5 mm cu **222-303 mm³**.

**Pragul pentru „intră" e comparativ, nu o cifră.** Manechinul atinge orice husă pe racordurile de
colț, unde ambele suprafețe sunt fațetate: iese contact de ordinul zecilor de mm³, împrăștiat în
sute de așchii de 0,00 mm³ — 99,35 mm³ pe husa completă la 17 Pro față de 57,80 pe bumper. E
artefact de teselare, nu interferență, iar o cifră fixă ar fi ori prea largă ori arbitrară.
Reperul e husa completă, care se montează demonstrat.

### Două lucruri care nu se văd în volum

**Gulerul camerei.** Pe husa completă el coboară sub spate — până la −3,3 mm la SE 3 și −6,8 la
17 Pro Max — ca să țină lentila de pe masă. Pe bumper n-are ce proteja și n-are de ce să se agațe.
Un cutter oprit la grosimea plăcii îl tăia pe jumătate: partea dinăuntrul ferestrei dispărea,
partea de dedesubt rămânea, și ieșea un ciot agățat de buza de 1 mm. Nici volumul, nici numărul de
bucăți nu arătau nimic — se vedea doar în `z` minim, și s-ar fi văzut pe placă, fiindcă piesa s-ar
fi sprijinit pe ciot în loc de buză. Se scoate tot ce rămâne sub `−grosimePerete`; spatele
bumperului e plan.

**Buza față de insula camerei.** Măsurat din cote, pe toate cele opt: marginea insulei nu trece de
marginea interioară a buzei — dar la **17 Pro și 17 Pro Max o atinge exact, 0,00 mm marjă**
(insulă 69,8 mm pe un corp de 71,6). Fereastra din spate e deci reuniunea dintre golul din mijloc
și amprenta insulei cu marginea ei. Pe modelele de acum nu schimbă nimic — volum identic la toate
opt — dar la primul model cu insulă mai lată buza se retrage singură în dreptul ei, în loc să se
așeze călare pe insulă și să împiedice telefonul să intre.

Nici bumperul nu primește tăieturi de flex, din aceeași cauză ca rama: fanta se sprijină pe fundul
husei, iar aici nu există fund. Și n-ar avea ce câștiga — un inel deschis în spate se îndoaie
oricum.

### Semnătura: șina din dreapta, jumătatea de jos

**DECIZIE.** Nu pe spate (nu există), nu pe șina de jos (o taie portul, centrat), nu pe stânga
(Camera Control îi mănâncă mijlocul pe familia 16/17). Tronsonul liber, calculat din date —
intervalele butoanelor plus `PERETE_MIN` de fiecare parte, între racordurile de colț:

| model | stânga | **dreapta** |
|---|---|---|
| iPhone 15 Pro | 63,2 mm | **63,2 mm** |
| iPhone 15 | 66,8 mm | **63,0 mm** |
| iPhone 16 Pro Max | 33,7 mm | **76,4 mm** |
| iPhone 16 Pro | 27,9 mm | **63,0 mm** |
| iPhone 16 | 27,9 mm | **61,0 mm** |
| iPhone 17 Pro Max | 32,5 mm | **74,6 mm** |
| iPhone 17 Pro | 26,1 mm | **61,1 mm** |
| iPhone SE 3 | — | **70,1 mm** |

Dreapta dă 61-76 mm pe toate, mereu în jumătatea de jos; cei 24 mm ai semnăturii vizibile intră cu
marjă, cu aceeași regulă la toate modelele. Înălțimea feței exterioare e 10,21-11,15 mm (de la
fața buzei dinspre spate până la vârful celei de pe față), deci banda de 7 mm lasă margine
confortabilă.

### Orientarea pe șină: aceeași regulă, altă corecție

Regiunea șinei are `n = (+1,0,0)`, `t = (0,+1,0)`, deci `b = n × t = (0,0,+1)`. Cititorul stă în
+X, cu sus la +Z, și are dreapta la +Y — adică `t` îi cade exact la dreapta, deci **X-ul nu se
atinge**. Dar `b` arată în sus, deci nu mai compensează convenția Y-jos a lui `textSolid`, și
**Y-ul trebuie oglindit**.

Exact invers decât pe spate, unde `b = (0,−1,0)` compensa singur verticala și trebuia corectat X-ul.
Măsurat, cu un „L", în cadrul cititorului: cu oglindirea de spate aplicată din inerție pe șină,
ieșea (+0,83; +0,67) — rotit 180°. După corecție: (−0,83; −0,67) pe toate cele opt modele.

E a treia oară în valul ăsta când orientarea corectă se dovedește o proprietate a SUPRAFEȚEI, nu a
textului. De-aia corecția stă în `pregatesteInele(inele, unde)`, cu tabelul cadrelor scris lângă ea.

### Micro-marcajul, pe fața interioară a șinei din stânga

Bumperul n-are fundul cavității în care husa completă își gravează amprenta. Fără o așezare
proprie, cutter-ul ar cădea sub `z = 0`, unde nu mai e material: n-ar tăia nimic și **amprenta ar
dispărea în tăcere** — genul de lipsă pe care volumul n-o arată, fiindcă nu s-a scos nimic de
nicăieri. Se pune pe partea opusă semnăturii, cu aceeași pregătire de siluetă: cititorul stă tot
în +X (aici înăuntrul cavității), fața s-a întors dar s-a întors și partea din care se citește, iar
cele două se anulează.

### Exportul comercial fără marcaj — formularea corectă

**Comercial fără marcaj = doar micro-marcajul cu numărul licenței, nimic altceva.** Asta e
formularea care se citează mai departe; e și cea verificată în suită.

*Prima redactare a cerinței spunea „identic cu unul nemarcat". Nu poate fi: **A.3 spune că
micro-marcajul nu e opțional**, nici cu licență comercială — doar că poartă numărul licenței în
loc de dată. Măsurat, diferența e de 4,64 mm³, adică exact groapa lui. Corectat de operator după
raportare; se scrie aici ca să nu se reia data viitoare.*

Ce trebuie să fie adevărat, și se verifică pe piesă, e că în afară de micro-marcaj **nu rămâne
nimic**: nici bandă de textură, nici urmă de semnătură. Diferența simetrică față de piesa
nemarcată pe care s-a aplicat doar micro-marcajul e **0,000000 mm³** — două corpuri care se scad
reciproc la zero sunt același corp, nu doar unul de aceeași mărime.

### R.5 — conversia model→scenă e o REFLEXIE, nu o rotație *(DESCHISĂ, se rezolvă în VIS.1)*

`manifoldToGeometry` face `(x, y, z) → (x, −y, z)` și inversează sensul triunghiurilor. Asta e o
**reflexie**: preview-ul arată **imaginea în oglindă a piesei printate**, la orice unghi de cameră
— nicio orbitare n-o poate anula, fiindcă o oglindire nu e o rotație.

Pe piese simetrice nu se vede, și de-aia a stat nedescoperită prin toate cele douăsprezece
generatoare. Pe text se vede imediat: `praktik3d.ro` apărea corect pe ecran și oglindit în Bambu.
Nu erau două citiri ale aceleiași piese — erau două piese cu chiralitate opusă.

**Se corectează în VIS.1**, prin rotație reală Z-sus → Y-sus: `(x, y, z) → (x, z, −y)`, cu
re-validarea încadrării camerei și a regulii de așezare (R.4) pe toate cele 12 generatoare.
**Varianta corectă e rotația**, nu negarea suplimentară a lui X: aceea ar readuce chiralitatea
bună, dar ar răsturna piesa cu capul în jos.

**De ce nu acum.** Ambele soluții ating toate cele 12 generatoare și regula R.4 — e schimbare de
fundație, nu se face în mijlocul valului de huse. **Exportul e corect**, confirmat pe piesă și în
Bambu; doar ecranul minte. Până la VIS.1, generatoarele care poartă text vizibil arată un rând în
UI: *„Previzualizarea arată textul în oglindă; la print iese corect"* (`huse.statusPreviewOglinda`,
afișat doar când există marcaj vizibil sau nume pe spate — micro-marcajul stă pe fața interioară,
sub telefon, și nu-l caută nimeni pe ecran).

### R.3 — cioburile numerice se scot înainte de export

Vezi `src/core/primitive/cioburi.ts`. După orice deschidere morfologică sau boolean cu tipar,
componentele sub **1 mm³ (0,001 cm³)** se elimină; dacă rămâne mai mult de UNA, e **eroare**, nu
resturi.

**De ce.** Un `offset(−r)` urmat de `offset(+r)`, sau un boolean cu un tipar dens, lasă contururi
de lățime numerică — 0,1 × 0,0 mm. Nu se văd în volum, nu se văd pe ecran, nu schimbă bounding
box-ul, dar după boolean ies componente separate: cochilii goale cu volum 0,0 mm³. Prins la
spatele perforat al huselor — piesa raporta 3–7 bucăți în loc de una. Un 3MF cu șase cochilii
goale e exact ce interzice stratul 1 din A.2, iar slicerul le arată ca obiecte reale.

**Cele două jumătăți nu se despart.** Fără a doua, regula ar fi o mătură sub covor: o piesă ruptă
în două jumătăți adevărate ar trece mai departe cu jumătatea mai mare, iar omul ar primi jumătate
de husă.

Se cheamă o singură dată, pe drumul tuturor scăderilor, nu în șablonul care a produs resturile:
o piesă trece prin șase scăderi și oricare poate lăsa cioburi. Curățarea stă înaintea
diagnosticului, ca numărul de bucăți raportat să fie cel care iese la export.

*Măsurat pe tot proiectul:* niciunul dintre cele 12 generatoare existente nu produce cioburi la
setul fix de parametri — regresia le verifică acum la fiecare rulare, fără să le atingă geometria
(DECIZIA 1).

### R.2 — unirile de solide trec prin `uneste`

Vezi `src/core/primitive/boolean.ts`. Două corpuri care se ating coplanar **pot** rămâne două
componente — nu întotdeauna, și nu previzibil. `uneste` verifică intersecția înainte de boolean
și aruncă la atingere, cu numele locului.

---

## PARTEA B — Generatorul de huse iPhone

### B.1 Scop și non-scop

**Scop v1**
- Huse pentru iPhone, 26 de modele (lista în B.3).
- Două produse din același generator: **Rama de probă** (doar contur, 3 mm înălțime, print de 10 minute) și **Husa completă**.
- Material implicit TPU 95A; preset rigid (PETG) ca opțiune, cu joc mărit și tăieturi de flexibilitate la colțuri.
- Personalizare pe spate: nume gravat sau decupat (motorul de font existent), pattern (motorul din Fagure), logo SVG (doar cu licență).
- Manechin în preview: telefonul randat la cotă reală în husă, cu insula camerei și butoanele, ca utilizatorul să vadă alinierea înainte de export.

**Non-scop v1** (explicit, ca să nu intre în val)
- Android (date neoficiale; val separat după validarea modului „cotele mele").
- Portofel, suport de card, inel/stand, curea.
- Inel magnetic pentru încărcare (val separat; cere buzunare de magneți și verificare de interferență).
- Folii de ecran, atașamente de cameră.
- Modul „cotele mele" (măsurare ghidată) — v2.

### B.2 Sursa de date și regula de aur

Cotele se extrag din **Ghidul Apple de design pentru accesorii** (Accessory Design Guidelines, secțiunea Device Dimensional Drawings și keep-out-urile). Document public, nu cere cont MFi.

**DECIZIE** Nicio cotă nu se inventează și nu se deduce din altă sursă. Fiecare model are câmpurile `sursa` (versiunea ghidului + pagina) și `verificat` (`false` până la validarea fizică în atelier). Un model cu `verificat: false` se afișează în UI cu eticheta „din desenele Apple, neverificat fizic". Modelele fără cote complete nu se publică.

Agentul NU are acces la PDF. Fluxul e: agentul generează schema și fișierele JSON goale cu toate câmpurile, produce un tabel de completat, iar cotele se introduc manual din ghid. Agentul validează apoi consistența (B.5).

### B.3 Lista modelelor (26)

- iPhone 12 mini, 12, 12 Pro, 12 Pro Max
- iPhone 13 mini, 13, 13 Pro, 13 Pro Max
- iPhone 14, 14 Plus, 14 Pro, 14 Pro Max
- iPhone 15, 15 Plus, 15 Pro, 15 Pro Max
- iPhone 16, 16 Plus, 16 Pro, 16 Pro Max, 16e
- iPhone 17, 17 Pro, 17 Pro Max, iPhone Air
- iPhone SE (a 3-a generație)

Modelele lansate după data acestui document se adaugă când Apple actualizează ghidul; schema trebuie să le suporte fără cod nou.

### B.4 Schema de model (un JSON per model, în `date/telefoane/apple/<slug>.json`)

Toate cotele în mm, cu două zecimale. Sistem de coordonate: origine în centrul spatelui telefonului, X spre dreapta (privit din spate), Y în sus, Z spre exterior (spatele).

```json
{
  "id": "iphone-15-pro",
  "brand": "Apple",
  "model": "iPhone 15 Pro",
  "an": 2023,
  "corp": {
    "lungime": 0, "latime": 0, "grosime": 0,
    "razaColt": 0,
    "profilMargine": "plat | curbat",
    "razaMuchie": 0
  },
  "ecran": { "proeminentaFataDeCorp": 0 },
  "insulaCamera": {
    "forma": "patrat | pilula-verticala | bara-lata | lentila-simpla",
    "x": 0, "y": 0, "latime": 0, "inaltime": 0,
    "razaColt": 0, "proeminenta": 0,
    "lentile": [ { "x": 0, "y": 0, "diametru": 0, "proeminentaSuplimentara": 0 } ],
    "blit": { "x": 0, "y": 0, "diametru": 0 }
  },
  "butoane": [
    { "tip": "pornire | volum+ | volum- | actiune | mut | camera-control",
      "latura": "stanga | dreapta", "y": 0, "lungime": 0, "latime": 0, "acoperibil": true }
  ],
  "port": { "latura": "jos", "x": 0, "latime": 0, "inaltime": 0, "tip": "usb-c | lightning" },
  "decupajeJos": [ { "tip": "difuzor | microfon", "x": 0, "latime": 0 } ],
  "decupajeSus": [ { "tip": "microfon", "x": 0, "latime": 0 } ],
  "keepOut": [ { "nume": "", "x": 0, "y": 0, "latime": 0, "inaltime": 0, "motiv": "" } ],
  "sursa": { "document": "Apple Accessory Design Guidelines", "versiune": "", "pagina": 0 },
  "verificat": false,
  "verificatLa": null,
  "note": ""
}
```

`acoperibil: true` la un buton înseamnă că husa poate să-l acopere cu perete subțiat (TPU) în loc de decupaj. Camera Control se tratează implicit ca decupaj (are suprafață tactilă).

### B.5 Validări automate pe date (script `verifica-telefoane.ts`, rulat în CI)

- Toate câmpurile numerice obligatorii prezente și > 0 unde are sens.
- Insula camerei încape în corp cu margine ≥ 1 mm de la orice muchie.
- Lentilele încap în insulă.
- Butoanele nu se suprapun între ele pe aceeași latură.
- Portul e centrat sau explicit necentrat (câmp `x` ≠ 0 cere `note` nevidă).
- `verificat: true` cere `verificatLa` nevid.
- Raport: tabel cu modelele complete / incomplete / cu erori.

### B.6 Șabloane de geometrie (șase, nu 26)

Fiecare model alege un șablon prin `insulaCamera.forma` + `corp.profilMargine`. Șabloanele sunt compoziții din primitive:

1. **corpHusa** — offset exterior al conturului rounded-rect cu joc, gol interior la cotele telefonului + joc, perete `g`, buză ecran `b` deasupra feței telefonului. Margine exterioară cu racord `r`.
2. **decupajCamera** — pentru `patrat` / `pilula-verticala` / `lentila-simpla`: decupaj la conturul insulei + margine 1,0 mm; buză de protecție în jurul decupajului, înaltă cât **`proeminenta + max(proeminentaSuplimentara) + 1,0 mm`**. Pentru `bara-lata`: decupaj pe toată lățimea insulei, buză de protecție doar sus și jos.

   *Corectat la HUS.1 (2026-09-04): prima redactare scria `proeminenta + 1,0`, adică doar peste
   platou. **Greșeala era în document**, nu în implementare. Măsurat pe cotele reale, lentila mai
   iese cu 1,63–1,73 mm peste platou la trei din patru piloți, deci buza aceea rămânea sub vârful
   lentilei cu 0,63–0,73 mm și nu apăra nimic — singurul lucru pentru care există. Cu formula
   corectă ies 4,48–4,78 mm, iar conul de keepout permite 6,96–7,67, deci încape.*

   **1,0 mm peste vârful lentilei e minimul de protecție.** Când buza devine parametru în UI, sub
   vârf se emite avertismentul „buza nu acoperă lentila".
**Regiunea decupajului = (insulă + margine) ∩ amprenta cavității** (regulă adăugată la HUS.1).
Decupajul se scade DOAR DIN SPATE, de sub fundul husei până la fața interioară a spatelui —
niciodată din perete. Intersecția cu amprenta cavității îl oprește pe orizontală, limitarea la
fața interioară îl oprește pe verticală. Peretele rămâne întreg prin construcție, nu prin noroc.

Verificarea care însoțește regula: **grosimea minimă a peretelui în jurul decupajului ≥ 1,2 mm**.
Dacă pică, nu e o alegere de parametri, e **bug de intersecție** — regiunea a mușcat din perete.
Se măsoară pe felia peretelui, la jumătatea înălțimii lui, unde decupajul n-are ce căuta.

**Marginea strânsă (regulă adăugată la HUS.1, după cotele piloților).** La iPhone 15 Pro insula
ajunge la 34,26 mm dintr-o limită de 34,30 — practic atinge marginea corpului. Pe o astfel de
latură nu mai există loc nici pentru marginea de 1,0 mm, nici pentru buză.

Deci, pe fiecare latură separat:

- marginea decupajului = **min(marginea implicită, distanța de la insulă la marginea corpului)**;
- pe latura unde marginea s-a strâns la zero, **buza de protecție e chiar peretele lateral al
  husei** — nu se mai construiește una separată, fiindcă n-are unde.

Verificarea care însoțește regula e **informativă, nu avertisment**: „decupajul camerei ajunge la
perete — buza pe latura X e peretele". Nu e un defect al piesei, ci o consecință a telefonului;
un avertisment ar cere omului să repare ceva ce nu se poate repara.

3. **decupajButon** — decupaj dreptunghiular cu colțuri rotunjite, +1,5 mm pe lungime, sau perete subțiat la 0,8 mm dacă `acoperibil` și utilizatorul alege „acoperit".
4. **decupajPort** — port + 1,0 mm pe fiecare latură, decupajele de difuzor/microfon unite într-un singur decupaj dacă distanța dintre ele < 3 mm.

   **Ferestrele laterale țin banda întreagă pe Z** (regulă adăugată la HUS.1, din date, nu din
   comoditate). `decupajeJos` și `decupajeSus` au doar `x` și `latime` — nicio cotă pe Z. La
   butoane există `latime`, dar nu și centrul pe Z. O fereastră parțială ar cere o poziție care nu
   e în ghid și pe care regula de aur o interzice să fie inventată. Cotele care EXISTĂ o confirmă:
   keepout-ul Camera Control are 8,40 mm pe Z, iar iPhone 16 are 7,81 mm grosime; portul are
   6,60 + 2 × 1,00 = 8,60. Amândouă sunt mai înalte decât banda, deci nu se pot respecta decât
   tăind-o toată. Deasupra ferestrei rămâne inelul buzei, dedesubt fundul husei.

   **Marginea de confort cedează în fața peretelui minim** (aceeași formă ca regula marginii
   strânse de la șablonul 2). +1,5 mm pe lungimea butonului e confort — se apasă mai ușor printr-o
   gaură puțin mai mare. `PERETE_MIN` e structură. Când se ceartă, marginea se strânge, pe fiecare
   capăt separat, până puntea rămâne exact 1,2 mm. Măsurat pe iPhone SE 3: butoanele de volum stau
   la 1,99 mm unul de altul, iar cu marginea plină ar fi rămas 0,49 mm între decupaje. Dacă nici
   cotele brute nu lasă 1,2 mm, ferestrele se unesc — o punte imposibilă se scoate, nu se subțiază.

   **Marginea de 1,0 mm e a PORTULUI, nu a grilelor.** În port intră un cablu care trebuie să
   treacă pe lângă husă; într-o grilă de difuzor nu intră nimic. Distincția decide ce se unește: pe
   iPhone 15, cu grilele la cotă brută, cea mai mică distanță rămâne 3,44 mm și difuzorul rămâne
   separat. Cu +1,0 și pe grile ar fi coborât sub prag și tot fundul s-ar fi topit într-o singură
   gură de ~40 mm.

   **VERIFICAREA DE PERETE SE APLICĂ DOAR PE PORȚIUNEA PLANĂ A LATURII** (DECIZIE, HUS.1).
   Pragul de 1,2 mm măsoară punți: material între două ferestre vecine, pe traseul drept. Dincolo
   de punctul de tangență peretele nu se termină, se curbează — o fereastră care ajunge acolo nu
   lasă material subțire, ci taie mai departe prin racord.

   Acolo verificarea devine **informativă**: „decupajul intră în racord cu X mm", niciodată
   avertisment. Măsurat la piloți: 2,83–5,09 mm, din grilele care urmăresc muchia de jos. Nu e un
   defect care se poate repara — e forma telefonului, iar un avertisment ar cere omului să dreagă
   ceva ce nu se poate drege.
5. **spate** — plin / pattern / nume decupat / nume gravat / logo. Regiunea de textură + marcaj din Partea A este întotdeauna prezentă în zona de la baza spatelui.
6. **flexColt** (doar preset rigid) — tăieturi de flexibilitate la colțuri, 0,8 mm lățime, care lasă colțul să se deschidă la montare.

   **NUMĂRUL LOR E DERIVAT DIN GEOMETRIE, NU FIX PATRU** (DECIZIE, corectată la HUS.1 după
   măsurare). Regula: **unde insula camerei acoperă arcul colțului, nu se pune fantă.** Prima
   redactare scria „patru tăieturi", ca și cum ar fi o cotă a produsului; e o consecință a
   telefonului. Un colț se numără doar dacă are arc liber — adică dacă există pe el o poziție de
   la care decupajul camerei stă la cel puțin `PERETE_MIN`.

   Măsurat pe piloți: iPhone 15, 15 Pro și 16 primesc **trei**, iPhone SE 3 primește **patru**.

   **Tăietura din colțul camerei se pune pe latura OPUSĂ decupajului**, nu lângă el (regulă
   adăugată la HUS.1). Lângă decupaj, cele două slăbiri se adună în același loc: materialul dintre
   ele rămâne o punte îngustă, iar colțul se rupe acolo la prima montare, nu se îndoaie.

   *Măsurat la implementare (2026-09-05): efectul e mai rău decât „punte îngustă".* Decupajul
   camerei scoate fundul husei de la −perete până la Z = 0; fanta de flex scoate peretele de la
   Z = 0 în sus. Suprapuse, nu lasă o punte subțire — nu lasă NIMIC: peretele e retezat pe toată
   înălțimea, iar balamaua pe care ar trebui să se îndoaie colțul nu mai există acolo.

   **Încotro se mută se măsoară, nu se deduce.** Prima implementare alegea latura după cât spațiu
   lasă insula până la marginea corpului; pe cotele reale cele două laturi ale colțului ies la
   0,01–0,19 mm una de alta, adică alegerea se făcea pe zgomot. Corect: se caută pe arcul colțului,
   pornind de la diagonală și depărtându-se în ambele sensuri, prima poziție de la care decupajul
   camerei e la cel puțin `PERETE_MIN`.

   **Dacă nu există niciuna, tăietura nu se face.** Pe iPhone 15, 15 Pro și 16 insula ajunge la
   1,03–1,25 mm de două laturi ale corpului, deci decupajul ei acoperă tot arcul colțului de sus:
   oriunde ai pune fanta pe ±45°, retezi peretele. Cei trei piloți primesc trei tăieturi, nu
   patru; iPhone SE 3 primește patru, cu cea de lângă cameră mutată cu 22,5° și verificată la
   1,90 mm de decupaj. Trei colțuri care se îndoaie sunt mai bune decât patru dintre care unul e
   rupt din fabrică.

   Verificarea care ține regula onestă se face pe piesă: o bară verticală prin dreptul fiecărei
   fante trebuie să atingă material sub Z = 0. Zero acolo înseamnă perete retezat.

**Rama de probă** = șablonul 1 tăiat la 3 mm înălțime de la buza ecranului în jos, **fără fund**,
cu o **breșă în inel pe latura camerei** (DECIZIE, corectată la HUS.1).

*Contradicția din prima redactare, și de ce s-a corectat așa.* Textul spunea, în aceeași
propoziție, „fără spate" și „cu decupajul camerei păstrat ca fereastră". Decupajul camerei e
TOCMAI în spate: se scade între −perete și Z = 0, adică sub tot ce rămâne din ramă. Pe iPhone 15
rama ocupă Z de la 5,81 la 8,81 mm. Nu există nicio poziție în care ea să conțină acel decupaj.

Ce se poate verifica pe o ramă fără fund e ALINIEREA LATERALĂ a camerei, iar pentru asta ajunge o
breșă în inel: pui rama pe telefon, te uiți prin ea și vezi dacă insula cade unde trebuie față de
marginile breșei.

- **Latura**: cea de care insula stă mai aproape (la toți piloții, `sus`).
- **Întinderea**: cea a insulei, **tăiată la traseul drept**. Insula depășește tangenta colțului
  la toți piloții; dacă breșa ar merge după ea, ar mânca tocmai colțul, adică lucrul pentru care se
  printează rama. Cât s-a tăiat se raportează.
- Măsurat: 19,75 mm (15) · 27,98 (15 Pro) · 8,76 (16) · **1,89 (SE 3)**. Ultima e practic
  simbolică — la SE 3 insula stă aproape toată dincolo de tangentă.

**Flexul nu se pune pe rama de probă** (regulă adăugată la HUS.1, după un test picat). Aceeași
cauză ca la colțul camerei: fanta se sprijină pe fundul husei, care e balamaua. Rama n-are fund,
deci fanta nu slăbește un colț, ci taie inelul. Măsurat: rigid + ramă ieșea în 3 bucăți la
15/15 Pro/16 și în 4 la SE 3, exact câte fante se așezaseră.

**Fiecare ramă poartă gravat modelul și jocul** (DECIZIE, HUS.1): „15 · 0,25", literă de 1,4 mm,
adâncime 0,3 mm, pe fața de sus a inelului, pe latura opusă camerei. Sus fiindcă acolo inelul e cel
mai lat — `buză + perete`, 2,40 mm la parametrii impliciți; pe laterale ar fi rămas 1,00 mm de
bandă peste ferestre, adică nimic. Fără etichetă, patru rame printate în aceeași după-amiază sunt
patru inele identice la ochi, iar jocul e chiar cota pe care operatorul o compară între ele.

Fontul e fix (`Inter-Regular`), nu ales din UI: la 1,4 mm un font cursiv iese o pată. Lipsa
fontului nu oprește nimic — rama iese fără etichetă, nu deloc.

### B.7 Parametri expuși în UI (în această ordine)

1. Model (listă cu căutare; etichetă „neverificat fizic" unde e cazul)
2. Material: TPU 95A (implicit) / rigid PETG
3. Ce exporți: Rama de probă (recomandat prima dată) / Husa completă
4. Grosime perete: 1,2–2,0 mm (implicit 1,4)
5. Buză ecran: 0,8–1,5 mm (implicit 1,0)
6. Joc: TPU implicit 0,25; rigid implicit 0,40; reglabil ±0,15 în pași de 0,05
7. Butoane: decupate / acoperite (unde `acoperibil`)
8. Spate: plin / **model gravat** / **perforat** / nume gravat / nume decupat

   **DECIZIE (addendum HUS.2): „gravat" și „perforat" sunt două opțiuni SEPARATE**, nu una.
   Modelul gravat sapă în spate și husa rămâne închisă; perforatul străpunge peretele și se vede
   telefonul prin el. Diferența se vede la print și se simte la mână, deci se alege, nu se deduce.

   Verificările perforatului, toate pe geometrie reală:
   - **puntea dintre găuri vecine ≥ 1,2 mm.** Garantată prin construcție cu o DESCHIDERE
     morfologică pe material — strâns cu jumătate de punte, apoi lăsat înapoi — fiindcă marginea
     zonei decorabile taie celulele oriunde nimerește și acolo rămân așchii mai subțiri decât
     oriunde în interior. Cât material a fost sub prag se raportează: 9,6–30,5 mm² la piloți.
   - **nicio gaură în inelul de încărcare.** Găurile care ar atinge cercul se omit ÎNTREGI, nu se
     taie la marginea lui — o gaură ciopârțită lasă o semilună subțire, adică fix defectul pe care
     regula îl evită. Măsurat: 55 de găuri omise la fiecare pilot.
   - **margine ≥ 2 mm față de funcțional** (buza camerei, decupajele de butoane, portul). Vine din
     zona decorabilă, care se retrage 3 mm de la marginea corpului și 3 mm de la zona camerei.
   - **regiunea de marcaj rămâne plină.** Era deja exclusă din zona decorabilă înainte de
     addendum, deci n-a fost nimic de schimbat; se verifică acum explicit, cu 15 sonde.

   **Logo-ul e întotdeauna gravat, niciodată perforat** (addendum HUS.2): un logo perforat s-ar
   pierde printre găuri și ar slăbi husa. Perforarea e doar motivul decorativ din jur.

   *Capcană găsită la implementare:* deschiderea morfologică lasă firicele de lățime numerică —
   contururi de 0,1 × 0,0 mm — iar după boolean ele ies COMPONENTE CU VOLUM ZERO. Piesa raporta
   3–7 bucăți în loc de una, cu volum 0,0 mm³ fiecare. Un 3MF cu șase cochilii goale e exact ce
   interzice stratul 1 din A.2, și nu se vede nici în volum, nici pe ecran. Se curăță cu
   `simplify(0.02)` pe regiunile 2D, la sursă.
9. Text și font (motorul existent)
10. Orificiu șnur: fără / colț stânga-jos / colț dreapta-jos
11. Marcaj: semnătura Praktik3D (fix, gratuit) / logo propriu / fără (doar cu licență validă)
12. Placă imprimantă (existent)

Nu se expun: adâncimea semnăturii, poziția marcajului, textura obligatorie.

### B.8 Verificări înainte de export (afișate ca în celelalte aplicații)

- Perete ≥ 3 linii la duza 0,4 (≥ 1,2 mm).
- Buza ecranului nu intră în keep-out-uri.
- Decupajul camerei nu intersectează niciun keep-out de blitz/microfon.
- Textul decupat pe spate nu lasă insule desprinse (litere cu contur interior: O, A, D etc. → se forțează mod gravat sau se adaugă punți, ca la Cuvinte Decor).
- Nume decupat: distanța dintre litere și decupajul camerei ≥ 3 mm.
- Piesa încape pe placa aleasă; TPU se orientează cu spatele în jos, fără suporturi.

**Buza din jurul camerei — conul cel mai larg limitează** (regulă adăugată la HUS.1, măsurată).
Fiecare lentilă are un con de keepout. Pare că cel îngust ar fi cel restrictiv; e invers. Conul
se lărgește pornind de la suprafață, deci unul larg mătură mai mult spațiu și ajunge mai departe
în plan. Măsurat pe iPhone 15 Pro: camera principală (123°) ajunge la 15,27 mm în plan, iar
teleobiectivul (33,2°) se oprește la 1,05 mm — la 9 mm de axă nici nu ajunge. Deci **buza
respectă minimul peste toate lentilele**, iar minimul vine de la conul cel mai LARG. La aceeași
distanță de axă, cu cât mai departe de ea, cu atât buza poate fi mai înaltă.

**Grosimea totală se judecă față de FAȚA REALĂ a telefonului** (`corp.grosime +
ecran.proeminentaFataDeCorp`), nu față de `corp.grosime` (DECIZIE, HUS.2).

Ținta e „telefon + 3 mm" și măsoară cât adaugă HUSA. La iPhone SE 3 sticla iese 0,94 mm peste
ramă, iar husa nu poate coborî sub o sticlă care iese: raportată la cota din specificație dă
+3,34 și ar pica, deși pune exact aceiași 2,40 mm ca peste tot. Măsurat pe toți piloții: husa
adaugă **2,40 mm** în afara zonei camerei, iar buza camerei stă 4,48–4,78 mm mai sus doar local.

**Grosimea spatelui se verifică DOAR în inelul de încărcare** (`corp.zonaIncarcare`). Limita din
`corp.grosimeMaxHusaSpate` — 2,1 mm la modelele cu încărcare magnetică, 5,0 la SE — nu se aplică
pe tot spatele. În afara cercului, husa poate fi oricât de groasă fără să strice încărcarea.
Peretele implicit rămâne 1,4 mm; fără delimitarea asta, avertismentul ar fi apărut la parametrii
impliciți pe toată piesa, adică ar fi devenit zgomot.
- Avertisment dacă `verificat: false`: „Printează întâi Rama de probă".

### B.9 Fișa de producție (extindere)

Pe lângă ce există: material recomandat și temperatura-țintă ca interval (TPU 95A: 220–235 °C, viteză ≤ 40 mm/s, retracție minimă), orientare, „fără suporturi", linia de marcaj din A.4, și linia „Model: iPhone … — cote din ghidul Apple, verificat fizic: da/nu".

**Rând nou (HUS.1): cea mai subțire secțiune.** „Cea mai subțire secțiune: banda de material de
peste decupajele laterale, 1,00 mm. E normală — buza ecranului deasupra ferestrelor."

Nu e avertisment. Ferestrele laterale țin banda întreagă pe Z (vezi șablonul 4), deci deasupra lor
rămâne buza ecranului plus cât iese sticla peste corp; la modelele cu ramă plată sticla nu iese
deloc, deci rămâne exact buza — 1,00 mm la parametrii impliciți, adică cinci straturi la 0,2 mm.
Se printează fără probleme, dar e locul unde piesa cedează prima dată, și omul are dreptul să știe
unde e înainte s-o tragă pe telefon. La iPhone SE 3 iese 1,94 mm, fiindcă acolo sticla chiar iese
0,94 peste ramă.

### B.10 Manechin în preview

Din același JSON se construiește un corp simplificat al telefonului (rounded-rect + insula camerei + lentile + butoane ca proeminențe de 0,5 mm) randat semitransparent în interiorul husei. Un comutator „Arată telefonul" în panoul de preview, pornit implicit. Nu se exportă.

**ORIENTAREA IMPLICITĂ ÎN SCENĂ: CULCATĂ PE SPATE, cu fața ecranului în sus** (DECIZIE, addendum
HUS.2). E poziția în care se decorează spatele și în care se printează. Manechinul stă în husă în
aceeași orientare.

E rotație de AFIȘARE, nu de geometrie: piesa se construiește cu grosimea pe Z fiindcă așa se așază
pe placă la export, dar scena are Y-ul în sus, deci husa apărea ÎN PICIOARE — sprijinită pe muchia
de jos, poziție în care n-o vede nimeni niciodată. Corpul din arenă și `exportBodies` rămân
neatinse.

**Corpul folosește CAVITATEA SCOBITĂ (contur + joc), nu conturul nominal** (regulă adăugată la
HUS.1). Cu conturul nominal, telefonul ar apărea plutind, cu o fantă de 0,25 mm de jur împrejur,
iar omul ar citi jocul — care e corect și intenționat — drept greșeală. Insula, lentilele și
blițul rămân la cota NOMINALĂ: acolo întrebarea chiar e de aliniere, și un contur umflat ar
ascunde exact abaterea căutată.

**Poziția butoanelor pe Z nu există în ghid** (aceeași lipsă ca la șablonul 3). În manechin sunt
desenate la mijlocul benzii, iar asta e o alegere de DESEN, nu o cotă: nu intră în nicio geometrie
exportată, iar alinierea care contează — pe Y, față de fereastra husei — e exactă.

### B.11 Valuri și opriri

**HUS.1** — schema, scriptul de validare, cele șase șabloane, rama de probă, UI-ul cu parametrii 1–7 și 12, manechinul. Date completate pentru 4 modele-pilot alese de operator (recomandare: un standard, un Pro, un 16 cu Camera Control, SE 3). **OPRIRE 2**: raport cu cele 4 rame de probă exportate + rezultatul validării datelor. Operatorul printează ramele și confirmă jocul înainte de HUS.2.

**VIS.1** — între OPRIRE 2 și HUS.2 se intercalează un val de reîmprospătare vizuală și design system comun. Primește document separat. HUS.2 se construiește PESTE el, nu înaintea lui.

**DECIZIE (HUS.2): pagina `/aplicatii/huse-iphone` e deocamdată SINGURA.** Se adaugă LÂNGĂ
cardul din landing, printr-un link „Află mai multe", nu îl înlocuiește. Celelalte generatoare nu
primesc pagini acum.

**HUS.2** — husa completă, spatele (parametrii 8–11), integrarea cu Partea A, verificările B.8, fișa B.9, restul celor 22 de modele completate și validate, pagina dedicată `/aplicatii/huse-iphone` RO + EN cu textele de licență din A.6. **OPRIRE 3**: raport final cu numărul de modele publicate / neverificate, testele trecute, două exporturi (gratuit, licențiat) pentru același model.

### B.12 Formulare obligatorii pe site și în aplicație

- „Compatibil cu iPhone …" — niciodată „pentru iPhone" ca și cum ar fi produs Apple. Fără logo Apple, fără sigla MFi, fără „MagSafe" (dacă apare mai târziu inelul magnetic: „compatibil cu încărcare magnetică").
- Pe pagina aplicației: „Cotele provin din documentația publică Apple pentru accesorii. Magic3D nu este afiliat cu Apple."

### B.13 Teste specifice

1. Pentru fiecare model publicat: rama de probă și husa completă trec manifold, iar golul interior are exact cotele telefonului + joc (măsurat pe bounding box interior).
2. Decupajul camerei conține complet insula din JSON + margine, pentru toate cele patru forme.
3. Nume decupat cu litere „O", „A", „B": exportul nu conține corpuri desprinse (număr de componente conexe = 1).
4. Semnătura: testele A.7 (2)–(4) rulate pe cel puțin un model din fiecare șablon.
5. Schimbarea modelului în UI păstrează restul parametrilor și reface geometria sub 1,5 s pe un laptop obișnuit.

---

## Rezumat pentru operator

- Partea A e mică, dar schimbă politica platformei; se face prima, singură, și se verifică regresia pe cele 11 aplicații.
- Partea B e primul generator care trăiește cu noua politică. Datele sunt gâtul de sticlă, nu codul: două zile de extras cote din ghidul Apple, apoi 4 rame de probă printate în atelier înainte de restul.
- Cea mai valoroasă funcție pentru vânzarea licenței e „logo-ul tău pe spate", nu „scoate semnătura noastră". UI-ul și textele o prezintă în ordinea asta.
