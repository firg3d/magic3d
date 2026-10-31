# Magic3D — Roadmap & Arhitectură

## Decizie de arhitectură: o aplicație per tip de produs

Fiecare tip de produs devine o **aplicație separată, cu ecran propriu** — NU o
opțiune în interiorul Litere Decor.

**Motiv:** ecrane simple, ușor de folosit. Un utilizator care vrea un breloc nu
trebuie să navigheze printre parametri de cutii sau de litere LED. Fiecare
aplicație arată exact controalele produsului ei.

### Dar codul NU se duplică

Fiecare aplicație e un `AppDefinition` (vezi [`src/core/app.ts`](../src/core/app.ts))
peste **același `core/`**. Nucleul rulează aplicația prin `runApp(app)`; nu știe
nimic despre litere, brelocuri sau cutii.

    apps/<produs>/  ->  core/        (NICIODATĂ invers, NICIODATĂ apps -> apps)

### Ce stă în `core/` (și de ce)

În nucleu rămân **strict** lucrurile unde o greșeală înseamnă **material aruncat**:

| Zonă din core/ | Fișier(e) | De ce e în core |
|---|---|---|
| Generare de solid din font | `core/geometry/textSolid.ts` | contururi Bézier → mesh 2-manifold închis; o eroare = piesă cu găuri |
| Boolean-uri | `core/geometry/*`, prin manifold-3d | subtract/intersect/union corecte = potrivire fizică |
| Export 3MF cu verificare de potrivire | `core/geometry/export3mf.ts` + `orientForPrint` | orientare + fit-check inlay↔locaș; oglindirea greșită = piesă inutilizabilă |
| Verificări de stabilitate și contact | (în pipeline-ul de asamblare) | obiect care plutește / literă instabilă = print eșuat |
| Bibliotecă de assets | `core/assets/scan.ts`, `stl-load.ts` | validare manifold la încărcare, comună tuturor aplicațiilor |
| Viewport cu manipulare directă | `core/viewport/scene.ts` | mută/rotește/scalează + mânere; buzunar calculat DUPĂ transformare |

> **Mutat la 2026-08-01.** Regula „se mută la al doilea consumator" a fost aplicată prea
> târziu: până la mutare existau trei copii (litere, brelocuri, fagure), iar ele
> divergiseră. Corecția de capHeight — fonturi care declară `sCapHeight` greșit, ca
> Courgette — intrase în două din trei, și aplicația de litere a rămas luni de zile cu
> litera de 5,2× peste înălțimea cerută, fără ca vreun test să se aprindă.
>
> Lecția nu e „mută mai devreme", ci **testul de alfabet nu putea prinde asta**: compara
> volumul obținut cu unul așteptat calculat la aceeași scară, deci eroarea de scală se
> simplifica. Acum are, separat, o verificare de înălțime măsurată pe solidul final.

### Ce stă în aplicație (și poate diverge liber)

Tot restul: **panouri, parametri, aranjare de piese**, mod de export specific,
ilustrații, texte. O aplicație poate arăta complet diferit de alta.

---

## REGULĂ de aur

1. **O aplicație nouă NU are voie să modifice `core/`.**
2. Dacă are nevoie de ceva ce nucleul nu face, **își scrie propria bucată** în
   `apps/<produs>/`.
3. Dacă chiar trebuie schimbat nucleul, **toate testele tuturor aplicațiilor
   trebuie să treacă** înainte de merge.
4. Nicio aplicație nu importă din altă aplicație (`apps/A` ↛ `apps/B`). Astfel o
   eroare într-una nu poate ajunge în cealaltă.

Regulile 1 și 4 sunt verificate automat de testul de izolare:
[`src/_tests/isolation.test.ts`](../src/_tests/isolation.test.ts) — rulează cu
`npm run test:isolation`. Fiecare aplicație se încarcă independent pe pagina ei
(un singur modul de intrare per pagină), iar o eroare într-una nu afectează
celelalte (pagini separate + fără importuri încrucișate).

---

## Datorie tehnică — de reparat când reapare

### 1. Clasificarea solid/gaură din `textSolid` (prioritate la următoarea apariție)
Funcția care decide ce contur e „solid" și ce e „gaură" a fost reparată de **trei ori**,
de fiecare dată cu altă euristică:

1. centroidul vârfurilor 0-1-2 (putea cădea în afara conturului concav);
2. centroidul primului triunghi earcut → **a rupt „A" în Baloo 2** (punctul cădea în
   contra-formă, conturul exterior devenea gaură și era aruncat);
3. containment inel-vs-inel testat pe vârfuri → **a rupt traversa lui „A"** (traversa are
   vârfurile îngropate în picioare, mijlocul în gol);
4. actual: eșantionare pe **muchii** cu prag de 90%.

**Pragul de 90% va eșua pe un font netestat.** Când se întâmplă, soluția NU e a cincea
euristică, ci **algoritmul standard**:

> sortează contururile după arie descrescătoare → construiește ierarhia de conținere
> testând un **punct garantat interior** (nu un vârf, nu un punct arbitrar) al conturului
> candidat față de contururile deja plasate → paritatea rezultă din **adâncimea în ierarhie**.

Punctul garantat interior se obține corect prin metoda „grid/ray": se ia o rază orizontală
prin interiorul conturului și se alege mijlocul primului segment interior — nu centroidul.
Testul [`src/_tests/alphabet.test.ts`](../src/_tests/alphabet.test.ts) (26 litere + 10 cifre
× 6 fonturi) e plasa de siguranță: rulează-l după orice atingere a clasificării.

### 2. Mesh deschis la extrudare — REZOLVAT
`Baloo2 „6"`, `Baloo2 „9"`, `PlayfairDisplay „B"`, `Sacramento „ut"` ieșeau cu mesh **deschis**
(8–16 muchii de frontieră, 0 non-manifold) și `Manifold` le respingea cu „Not manifold".

Diagnostic (script: [`openmesh.diag.ts`](../src/_tests/openmesh.diag.ts)): clasificarea
contururilor era corectă; vinovat era **earcut**. O triangulare completă a unui poligon cu
`n` vârfuri și `h` găuri dă exact `n + 2h − 2` triunghiuri — în cele 4 cazuri dădea mai puține
(2 triunghiuri lipsă per defect), iar muchiile de inel rămase neacoperite deveneau frontiere.
Toate muchiile de frontieră erau pe capace, **zero pe pereți**, ceea ce exclude constructorul
de pereți. Două forme ale aceleiași cauze: două inele care **se ating într-un vârf**
(distanță 0.000000 mm — B, 6, 9) sau o gaură **coliniară cu puntea** pe care earcut o trage
spre conturul exterior (Sacramento, toate muchiile la `y = −80.21`).

Reparație: `extrudePolygon` verifică numărul de triunghiuri și, dacă earcut nu acoperă tot,
**refuză rezultatul fără să scrie nimic**; poligonul se construiește la PASUL 8b cu
`CrossSection` + `Manifold.extrude`, al cărui triangulator tratează corect ambele situații.
Drumul earcut rămâne neatins acolo unde reușește, deci restul geometriei e bit-identică.
Plasă de siguranță: [`openmesh.test.ts`](../src/_tests/openmesh.test.ts) (cele 4 cazuri +
5 martori care trebuie să rămână pe earcut). `Sacramento „ut"` nu e acoperit de testul de
alfabet — font script, combinație de două litere — deci trăiește doar acolo.

### 3. Buzunar cu adâncime măsurată de la un plan unic — REZOLVAT la literă, DESCHIS la bază

Buzunarele se tăiau cu `pocketCutter` de la un plan unic, `faceZ` = fundul scobiturii din
chenar. Sub scobitură e corect. Pe **chenar**, care urcă încă 3 mm peste `faceZ`, cutter-ul
era complet îngropat: scobea material sub un capac intact. Litera „M" cu scrisul „Madalina"
ieșea cu **22 de cavități sigilate**, cu tavane nesusținute peste ele, iar inlay-ul nu avea
locaș pe porțiunea de chenar și rămânea suspendat. Invizibil în viewport și în statistici.

Reparat (`e587ec2`) prin construcția cu coajă:
`coajă = literă \ (literă coborâtă cu d)`, apoi `buzunar = coajă ∩ prisma siluetei`.
Stratul urmează suprafața locală, deci iese întotdeauna la suprafață.

Măsurători, literă „M"/Alex Brush 120 mm, scris „Madalina" la −1.04 mm, joc 0.2:

| zonă | plan unic | coajă |
|---|---|---|
| scobitură plană | 1.040 mm | 1.040 mm |
| chenar plan | 1.090 mm *(cavitate îngropată)* | 1.040 mm |
| bandă muchie interioară (0.6 mm) | 1.090 mm | 0.868 mm |
| bandă muchie exterioară (1.2 mm) | 1.090 mm | 0.693 mm |
| genus | **22** | **0** |

Aceleași măsurători pe **buzunarul unei tematici** (Q treflă 45 mm la −1.5 mm), care trece
prin aceeași funcție — defectul era identic, iar reparația îl acoperă:

| zonă | plan unic | coajă |
|---|---|---|
| scobitură plană | 1.500 mm | 1.500 mm |
| chenar plan | 1.700 mm *(cavitate îngropată)* | 1.500 mm |
| bandă muchie interioară | 1.700 mm | 1.326 mm |
| bandă muchie exterioară | 1.700 mm | 1.155 mm |
| genus | **5** | **0** |

**Muchia locașului rămâne vie, nu se rotunjește.** `roundTopOuter` lucrează pe `outerSil`,
`roundTopInner` pe `recessSil`; niciuna nu atinge silueta buzunarului. Măsurat prin
compararea ariei golului lângă suprafață cu aria la fund, în zonele plane: diferență
**0.000 mm², rază dedusă 0.0000 mm** — prismă perfect verticală, în ambele zone. Rotunjirea
afectează buzunarul doar indirect, prin cotele de suprafață din cele două benzi de muchie.

**Limitare cunoscută, acceptată:** pe banda exterioară de 1.2 mm adâncimea efectivă e
**0.693 mm** în loc de 1.04. Acolo suprafața se curbează spre vertical din rotunjire, iar
stratul cojii se măsoară pe verticală, nu perpendicular pe suprafață. Piesa de inlay are
muchii drepte, deci pe acea margine îngustă va sta puțin mai sus — ascunsă de rotunjire,
fără efect pe sprijin.

**Neexplicat, nu se urmărește:** reproducerea în Node dă 1215 → 1075 mm³, aplicația dăduse
2654 → 2428 mm³. Semnul și ordinul de mărime al procentului coincid (−11.6% vs −8.5%), dar
absolutele nu. Ipoteză neverificată: scriptul nu aplică `taiereBaza`. Comparația internă a
scriptului e făcută în condiții identice, deci concluziile de mai sus stau.

Plasă de siguranță: [`goluri.test.ts`](../src/_tests/goluri.test.ts) — verifică pe literă
(scris și tematici) și pe bază că **genus-ul nu se schimbă** la tăierea buzunarului, și că
buzunarul chiar **sparge fața chenarului**. Pe codul de dinainte de reparație dă 5 eșecuri.

#### Rămas de făcut: buzunarul din bază pe coajă
Buzunarul de înfigere ([`assembly.ts`](../src/apps/litere/assembly.ts), `cutterBaza`) taie tot
de la un plan unic — fața de sus a bazei. Planul e la cota **maximă**, deci nu poate crea
capac, iar litera intră oricum: buzunarul e chiar silueta tălpii îngropate. Efectul e doar
**sprijin neuniform**, fiindcă bazele au relief:

| bază | grosime | relief central | consecință la înfigere 3 mm |
|---|---|---|---|
| Joker mic negru/roșu, Q inimă ×2, Q treflă | 6.00 | 2.01 mm | adâncime locală 3.00 pe creastă, 0.99 în șanț |
| disc vinyl | 4.89 | 0.66 mm | 0.66 mm gol în șanțuri — acceptabil |
| Teren | 2.90 | 0.99 mm | înfigerea se limitează oricum la 2.90 |
| inima | 6.26 | **plană** | singura fără efect |
| nor | 15.40 | **9.16 mm** | litera atinge doar 19% din arie |

Se face **după** ce se închide buzunarul literei.

#### Deschis, prioritar: metrica de contact e 2D
`contactProcent` ([`assembly.ts`](../src/apps/litere/assembly.ts), în blocul bazei) e o
intersecție între două siluete proiectate. Nu conține Z. Pe baza „nor" raportează **100%**
deși buzunarul nu taie absolut nimic și litera plutește complet — caz reprodus în
`goluri.test.ts`, unde apare ca AVERTISMENT, nu ca eșec, până se repară.
Trebuie să măsoare atingere reală: intersecția solidului literei cu solidul bazei înainte
de scăderea buzunarului. Avertisment sub 40%: „litera atinge baza doar pe N% din talpă —
lipire slabă".

## Identitatea firmei — configurație, nu setare de captură

`src/core/config/identitate.ts` ține logo (PNG cu alfa, ca data URL), numele firmei, site-ul
și setările de watermark. Stă în `core/config/`, nu în modulul de prezentare, tocmai pentru
că **nu e o setare de fotografiat**: e configurație de aplicație, cu mai mulți consumatori.

Azi o folosește doar watermark-ul de la capturile din modul prezentare. Planificat:

- **antetul fișei de producție** (`.txt` de lângă 3MF) — logo + nume firmă în cap, ca fișa
  să poată merge direct la un colaborator. Atenție: fișa e text simplu; fie devine PDF, fie
  antetul rămâne doar text (nume + site), fără logo.
- **oferte și etichete** generate mai târziu — acolo logo-ul are sens ca imagine.

Consecință de design: orice consumator nou citește `citesteIdentitate()` și nu trebuie să
știe nimic despre modul prezentare. Dacă apare un al treilea consumator care are nevoie de
mai multe date (CUI, adresă, telefon), se adaugă în `IdentitateFirma`, nu într-un panou.

## Bilingv: română și engleză, cu comutator lângă setări — DE FĂCUT

Cerut după ce i18n-ul a fost construit deliberat FĂRĂ comutator. Infrastructura există și
ajută: tot textul vizibil trece deja prin `t('cheie')` din `src/core/i18n/ro.json`, verificat
de un test care interzice diacriticele românești în literalele din `.ts`. Deci nu e nimic
hardcodat de vânat — traducerea e o problemă de dicționar, nu de cod împrăștiat.

Ce trebuie totuși făcut, în ordinea dificultății:

**1. `en.json`, oglinda lui `ro.json`.** Peste 400 de chei, dintre care cele mai mari blocuri
sunt fișa de producție (42 de chei) și manualul de utilizare (81). Ambele sunt text lung, nu
etichete — aici e efortul real.

**2. `t()` citește limba curentă**, nu un dicționar fix. Plus salvarea alegerii în
`localStorage`, ca să persiste între sesiuni.

**3. RE-RANDAREA la schimbarea limbii.** Ăsta e punctul dificil, nu traducerea. Interfața se
construiește imperativ, cu `el(...)`: bara de unelte, panourile și lista de obiecte își citesc
textele o singură dată, la creare. Un comutator care schimbă doar variabila nu schimbă nimic pe
ecran. Trebuie un drum de reconstrucție completă a interfeței, care să păstreze starea —
selecția curentă, panoul deschis, poziția camerei. Fără asta, comutarea limbii ar reseta scena,
ceea ce e inacceptabil.

**4. Testul de i18n se extinde:** `en.json` trebuie să aibă exact același set de chei ca
`ro.json` — nici lipsă, nici în plus. Fără aserțiunea asta, o cheie tradusă pe jumătate apare
ca text gol în interfață și nu o prinde nimeni.

**5. Formatarea numerelor.** Fișa de producție grupează miile cu `ro-RO`. Trebuie să urmeze
limba, altfel un client englez primește „781.440" și citește șapte sute optzeci și unu virgulă
patru patru zero.

**Locul comutatorului:** lângă rotița de setări, ca două pastile scurte `RO | EN`, nu un meniu
derulant — se schimbă rar și trebuie să se vadă dintr-o privire care limbă e activă.

**Când:** nu blochează brelocurile și nu depinde de ele. Se poate face oricând, dar merită
făcut ÎNAINTE ca aplicația să plece la clienți, fiindcă orice text nou adăugat între timp
înseamnă încă o cheie de tradus de două ori.

## Comutator de produs lângă logo — DE FĂCUT, design agreat

Cele șapte produse rămân **aplicații separate** (regula de aur, izolarea impusă de test). Ce se
adaugă e doar navigarea: din exterior arată ca o singură aplicație cu șapte module.

**Buton lângă logo**, stânga sus, care arată produsul curent plus o săgeată. Apăsat, deschide un
panou cu carduri: pictogramă, nume, stare (disponibil / în curând). Același mecanism de panou
flotant ca restul uneltelor.

**Pictogramele se REFOLOSESC din `landing.html`.** Există deja ilustrații SVG pentru toate cele
șapte produse. Aceeași regulă ca la manual, unde pictogramele uneltelor se iau din setul barei:
o singură sursă, deci nu apar niciodată două variante ale aceleiași iconițe.

**Fără a sparge izolarea.** Selectorul stă în nucleu, fiindcă îl arată toate aplicațiile, dar
lista de produse e **date, nu cod** — un manifest cu nume, pagină, pictogramă și stare, exact
cum funcționează manifestul de tematici. Nucleul NU importă nimic din `apps/`. Un `import` către
fiecare aplicație ar dărâma testul de izolare; e greșeala ușor de făcut aici.

**Produsele indisponibile se arată gri**, cu eticheta „în curând", nu se ascund: clientul vede
ce urmează.

### Confirmarea de lucru pierdut — obligatorie

Comutarea încarcă altă pagină, deci **se pierde tot ce nu e salvat**. Cineva care a lucrat
douăzeci de minute la o literă și apasă din curiozitate pe „Brelocuri" pierde tot.

Dialogul trebuie să:
- spună clar că se pierde configurația curentă;
- **recomande finalizarea și exportul proiectului** înainte de a comuta;
- ofere pe loc salvarea unui preset, ca alternativă rapidă;
- ceară o confirmare explicită — la acceptare, totul se pierde.

Nu un „ești sigur?" generic. Textul trebuie să spună ce se pierde și ce ar trebui făcut întâi.

### Opțional, la împachetare
Aplicația desktop pornește fie pe landing, fie direct pe **ultimul produs folosit** — se reține
local, se schimbă din setări.

## Versiunea de probă pe web — decizie luată, de implementat la final

Problema: aplicațiile rulează integral în browser, fără cont și fără server. Cine deschide
adresa poate genera și exporta oricâte fișiere. Orice restricție pusă în JavaScript se poate
scoate, deci **la o aplicație web statică nu există protecție reală**.

### Soluția aleasă: o aplicație de probă SEPARATĂ

Nu se limitează aplicația reală. Se face **o a opta aplicație**, care conține de la bun început
doar atât:

- o singură literă, fixă
- o singură decorațiune, fixă
- un text prestabilit
- panourile de parametri **absente**, nu dezactivate

Utilizatorul poate folosi **uneltele**: mută, rotește, scalează, măsoară cu rigla, schimbă
vederea, exportă. Vede exact cum lucrează platforma și ce calitate are rezultatul.

### De ce e mai bună decât filigranul sau blocarea

**Absența bate blocarea.** Un buton dezactivat se reactivează din consolă în zece secunde. Un
panou care nu există în cod nu se poate activa. La fel, fonturile și tematicile pe care
aplicația de probă nu le încarcă nu pot fi obținute din ea.

Se potrivește și cu arhitectura: e încă un `AppDefinition` peste același nucleu, cu pagina lui.
Testul de izolare o ține separată de aplicațiile reale, fără efort suplimentar.

### Condiția care face diferența: PUBLICARE SEPARATĂ

Aplicația de probă trebuie publicată **singură**, în propriul build, cu propriul folder de
resurse. Dacă stă lângă celelalte, biblioteca de fonturi și tematici rămâne accesibilă direct
prin adresă, iar toată logica de mai sus cade.

Vite construiește o intrare per pagină, deci separarea e naturală — dar `public/` se copiază
integral. La împachetarea pentru web trebuie inclus doar setul minim: fontul folosit, tematica
folosită, nimic altceva.

**Fără condiția asta, aplicația de probă nu protejează nimic.**

### Ce rămâne de decis mai târziu

Dacă exportul din proba web e curat sau poartă un semn. Înclin spre curat: dacă poate exporta o
singură combinație fixă, oricum nu poate produce comenzi cu ea, iar un export curat convinge mai
bine de calitate.

### Când
După ce toate cele șapte aplicații sunt gata. Nu blochează nimic până atunci.

Notă: există deja `src/apps/demo/` — un cub parametric folosit ca test de arhitectură, nu un
produs. Aplicația de probă e altceva și primește folderul ei.

## Aplicații

### 0. Litere Decor — DISPONIBIL
Litere cu nume gravat/inlay + decorațiuni tematice, postamente, export pe plăci.
Referința pentru contractul `AppDefinition`. Pagina: `index.html`.

Fiecare aplicație viitoare: **ce e specific** vs **ce se refolosește din `core/`**.

### 1. Nume 3D
- **Specific:** aranjare de glife cursive legate; contur offsetat; stabilitate pe
  traseul cuvântului (nu per-literă).
- **Din core:** generare de solid din font, boolean-uri, export 3MF + fit-check,
  viewport.
- **⚠ NECUNOSCUTĂ MAJORĂ:** garantarea că literele se ating suficient cât obiectul
  să nu se rupă. **Spike separat înainte de implementare.**

### 2. Brelocuri
- **Specific:** literă mică (30–60 mm), culcată; inel de agățare; contur offsetat
  ca piesă separată dedesubt.
- **Din core:** solid din font, boolean-uri, export, viewport, verificări contact.
- **Verificare proprie:** grosime minimă la scară mică (piese subțiri la 30–60 mm).

### 3. Litere Fagure
- **Specific:** pattern parametric (hexagon / diagonală / triunghi) intersectat cu
  silueta literei; ramă solidă pe contur.
- **Din core:** solid din font (silueta), boolean-uri (intersecția pattern∩siluetă),
  export, viewport.
- **Verificare proprie:** grosimea pereților de pattern (să nu iasă sub-printabile).

### 4. Cutii Litere
- **Specific:** pereți + fund, interior gol adânc, fără față frontală.
- **Din core:** solid din font (conturul), boolean-uri (offset pereți, golire),
  export, verificări de stabilitate, viewport.

### 5. Cuvinte Decor
- **Specific:** aranjare multi-glifă cu **contact garantat** între litere;
  substituție de caractere cu simboluri (inimă, stea, casă); stabilitate pe ansamblu.
- **Din core:** solid din font, boolean-uri (union între glife), export, viewport.
- Înrudit cu *Nume 3D* (aceeași necunoscută de contact — vezi spike-ul de acolo).

#### Cerință: simbolul ca literă, nu ca decorațiune
Substituția de caractere cu simboluri e funcționalitatea **centrală** aici, și e altceva
decât ce face azi Litere Decor.

Constatare care o motivează: **niciunul dintre cele 22 de fonturi instalate nu are glifa ♥
(U+2665) sau ❤ (U+2764)**, deci inima nu se poate obține din contur de font. În Litere Decor
inima trăiește ca *tematică* (`public/tematici/simboluri/`), adică decorațiune: se
poziționează liber, intră în locaș, primește culoare — dar nu e corpul principal.

`L♥VE` cere altceva: simbolul trebuie să fie **corp de bază**, cu tot ce are o literă —
chenar, rază de muchie, tăiere la talpă, locaș pentru scris, contact cu vecinii pentru
union, verificare de stabilitate. Practic contractul intern al aplicației nu mai poate fi
„un caracter → o glifă de font", ci „o poziție în cuvânt → un solid, provenit fie dintr-o
glifă, fie dintr-un fișier". Sursa geometriei devine un detaliu, restul pipeline-ului
(chenar, locaș, contact, export) trebuie să funcționeze identic în ambele cazuri.

De decis la momentul respectiv: cum se stabilesc metricile tipografice ale unui simbol
adus din fișier (advance width, linia de bază, înălțimea de cap) ca să se alinieze cu
literele din jur — un STL nu le are, trebuie derivate din bounding box sau declarate.

### 6. Litere LED
- **Specific:** corp opac + față translucidă, ca **două piese separate**; cavitate
  pentru bandă LED; canal de cablu; constrângeri de grosime pentru difuzie uniformă.
- **Din core:** solid din font, boolean-uri (cavitate, canal), export multi-corp,
  viewport.
