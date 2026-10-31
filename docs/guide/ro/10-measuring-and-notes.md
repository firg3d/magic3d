---
title: Măsurători și note
summary: Ruletă, riglă și echer, distanțe față de origine, note care rămân atașate de o piesă și puncte de referință la care se aliniază lucrurile.
---

Ca să construiești o piesă exact, trebuie să măsori. Magic3D are pentru asta mai multe unelte. Niciuna nu ajunge într-un export. Grosimea peretelui și golurile din interiorul unei piese se măsoară cel mai bine în [vederea în secțiune](chapter:view-and-workplane), cu {{ui:camera.sectionMeasure}}.

## Ruleta

Ruleta stă în capătul de jos al barei camerei, pe marginea din stânga ({{ui:camera.tapeTools}}). Măsoară distanțe între colțuri, muchii și fețe. Un clic pe ea deschide cinci butoane. Dacă acoperă ce vrei să măsori, trage-le de mânerul din stânga oriunde pe planul de lucru; un dublu clic pe mâner le pune înapoi la locul lor:

![Ruleta cu butoanele ei: adaugă măsurătoare, mută punctele de măsurare, șterge măsurătoarea, muchii întregi, șterge toate măsurătorile.](shot:tape-menu)

1. **{{ui:camera.addMeasurement}}:** Dă clic pe un punct, trage până la următorul și dă clic pe el. Distanța primește o etichetă, cu axele de-a lungul cărora merge în față: X, Y sau Z pentru una dreaptă, XY, XZ sau YZ pentru una într-un plan, 3D pentru toate trei. Ține cursorul peste etichetă ca să vezi cât acoperă pe fiecare axă, iar peste un punct ca să-i vezi coordonatele. Cât timp plasezi al doilea punct, axele, distanța și întinderea pe fiecare axă apar lângă cursor. O măsurătoare aflată în mare parte în spatele altui corp se estompează; dacă ții cursorul peste linia sau eticheta ei, revine. Pe o muchie sau o față opusă, al doilea punct se aliniază în unghi drept față de primul când cursorul se apropie - sau oriunde pe muchia ori fața respectivă, cât ții apăsat [[Shift]]. Pe aceeași față sau pe planul de lucru, [[Shift]] ține măsurătoarea dreaptă, de-a lungul axei principale.
2. **{{ui:camera.moveMeasurement}}:** Apucă punctele și mută-le; numărul se actualizează.
3. **{{ui:camera.deleteMeasurement}}:** Apoi dă clic pe o măsurătoare ca s-o ștergi. Cât timp **{{ui:camera.addMeasurement}}** e activ, dacă ții apăsat [[Shift]] sau [[Ctrl]] ([[Cmd]] pe Mac) și dai clic pe un punct sau pe o linie de măsurare, aceasta se șterge imediat, fără să schimbi modul.
4. **{{ui:camera.tapeWholeEdges}}:** Un clic pe o muchie o măsoară în întregime, de exemplu lungimea unui cerc. Cu opțiunea oprită, un clic pune în schimb un punct pe muchie, iar al doilea punct poate fi oriunde, așa că poți măsura diametrul sau orice altă distanță. [[Alt]] inversează opțiunea pentru un singur clic. Pe un cerc, punctul opus primului se aliniază când cursorul se apropie, iar punctele stau pe cercul real, așa că diametrul iese exact.
5. **{{ui:camera.deleteAllMeasurements}}:** Șterge toate măsurătorile deodată. Pentru că asta nu se poate anula, Magic3D te întreabă înainte; dacă nu există măsurători, nu are ce face.
6. **{{ui:camera.tapeMarkMiddle}}:** În mijlocul fiecărei măsurători stă un mic semn rotund, cu jumătatea de jos plină. El pune un [punct de referință](#puncte-de-referinta) în mijlocul măsurătorii: după un clic pe o muchie rotundă, cum e marginea unei găuri, în centrul cercului respectiv - și pe un mesh (rețea de triunghiuri) importat, unde nimic altceva nu marchează mijlocul unei găuri - iar pentru un diametru sau orice măsurătoare dreaptă, la jumătatea ei. O formă pe care o tragi se aliniază apoi cu centrul ei la acest punct. Un punct care există deja nu se creează a doua oară. Ruleta se aliniază la un punct de referință ca la un colț, așa că poți măsura din centrul unui cerc sau din mijlocul unei linii: marchează-l, apoi dă clic pe punct.
7. **{{ui:camera.tapeTypeLength}}:** Când cel puțin un capăt al unei măsurători drepte stă pe un corp, poți da clic pe numărul ei. Scrie o lungime nouă și apasă [[Enter]]: corpul de la al doilea punct se mută de-a lungul liniei măsurate până când distanța este exact aceea, ca la rigla din Tinkercad. Dacă e selectat doar corpul de la primul punct, se mută acela. Punctele de măsurare rămân pe corp, așa că măsurătoarea îl urmează. Măsoară dintr-un colț, de pe o muchie sau dintr-un [punct de referință](#puncte-de-referinta), cum ar fi centrul unui cerc, ca să așezi piese la o distanță exactă. O lungime negativă duce corpul la acea distanță dincolo de primul punct, de exemplu 5 mm în interiorul marginii unei cutii.

[[Esc]] iese din modul de măsurare.

## Rigla

{{ui:shape.ruler}} o iei din biblioteca de forme. Este doar o unealtă de măsurare: nu apare în niciun export și nu poate fi nici grupată, nici tăiată. Pentru fiecare corp care atinge rigla sau se suprapune cu ea, arată dimensiunea ca un număr plutitor direct în vedere. Poți schimba numărul chiar acolo, iar corpul se adaptează. Ridică rigla în picioare sau înclin-o și va măsura pe propria ei direcție: în picioare lângă un corp, arată înălțimea corpului. Simbolul plus plutitor creează o copie a formei măsurate; apare cât timp rigla stă culcată. Scala ei imprimată este în milimetri pe o muchie lungă, cu zecile numerotate, și în inci pe cealaltă, cu o linie la fiecare a șaisprezecea parte de inci și incii întregi numerotați. Scala unității cu care lucrezi (comutatorul din dreapta jos) e pe muchia de sus; o riglă mai îngustă de 15 mm o are doar pe aceasta.

## Echerul

Uneori măsori mai bine în unghi drept. Dă clic pe {{ui:camera.cornerRulerTool}} în bara camerei, apoi pe planul de lucru. Acolo se așază un echer cu două brațe în unghi drept, cu gradații ca un echer de tâmplărie. Nici el nu are corp propriu. Dă clic aproape de colțul unui corp și colțul echerului se aliniază exact acolo. Proiectul păstrează echerul unde l-ai pus, și într-un fișier .lyl salvat: când redeschizi proiectul, e în același loc, rotit la fel și măsurând din aceleași puncte, până când îl ștergi.

Echerul stă pe planul de lucru. Dacă acesta e pe latura unui corp, și echerul stă pe acea latură, vezi [Vederea și planul de lucru](chapter:view-and-workplane). Așa cotezi pe un perete vertical: pune planul de lucru pe perete, așază echerul în colțul lui din stânga sus și dă clic pe mâner până când brațele arată spre dreapta și în jos.

- **Tragerea mânerului** îl mută.
- **Un clic scurt pe mâner** îl rotește cu 90°.
- **×-ul** de lângă el îl șterge.
- **Butonul mic din stânga mânerului** schimbă punctul de la care se măsoară: exteriorul unui corp (capăt, o pictogramă cu linii) sau mijlocul lui (mijloc, o cruce de vizare). Un comutator mic de același fel stă lângă fiecare număr verde și îl setează doar pe acela: pentru un cilindru în picioare, mijlocul pe cele două brațe și baza pe înălțime; pentru unul culcat, mijlocul pe lățime și un capăt pe lungime. Când toate trei coincid din nou, butonul de la mâner arată modul comun.

Dacă la unul dintre brațe stau corpuri, echerul le arată automat dimensiunile, selectate sau nu: corpuri în interiorul echerului, lângă un braț sau peste el. Un corp aflat în afară, în spatele colțului sau lângă un braț pe partea exterioară, nu primește. Asta funcționează doar pe placa de bază, nu pe latura unui corp. Butonul cu săgeată de sub mânerul echerului oprește această funcție, astfel încât doar corpurile selectate să-și arate dimensiunile; setarea se păstrează în proiect.

Când selectezi un corp, echerul arată cu verde cât de departe este acesta de colț, pe ambele brațe și pe înălțime. Dă clic pe un număr verde ca să scrii o distanță, iar corpul se mută exact acolo. Cu mai multe corpuri selectate, ele contează ca unul singur: echerul le măsoară conturul comun, iar o valoare scrisă le mută pe toate împreună, fără să le schimbe pozițiile unul față de altul.

Liniile de ghidaj ale numerelor verzi merg pe podea, în planul în care stă echerul, până la punctul de sub corp sau de lângă el; înălțimea are propria săgeată. Comutatorul fiecărui număr stă în cadrul numărului. Brațele și gradațiile sunt linii în spațiu: un corp din fața lor le ascunde, cum ar fi ascuns un echer real. Ochiul mic de sub mâner schimbă asta: cu ochiul tăiat, corpurile ascund echerul (setarea de pornire); cu ochiul deschis, echerul rămâne vizibil peste orice. Numerele de pe brațe se estompează acolo unde un corp stă în fața lor.

Cu mijlocul, numerele verzi se măsoară până la mijlocul corpului, inclusiv pe înălțime. Așa așezi o sferă cu centrul la exact 15 mm de o muchie, fără să scazi raza. Pe un perete, pui o gaură la 40 mm de stânga și 190 mm de sus astfel: selectează gaura, comută pe mijloc, scrie 40 și 190. Înălțimea se măsoară acolo de la perete spre exterior.

Atât ruleta, cât și echerul rămân pe loc cât timp lucrezi la o schiță și revii în vederea 3D. Niciuna nu apare în istoric. Echerul se păstrează în proiect, la fel și măsurătorile ruletei, în browser și în fișierul .lyl: sunt din nou acolo când redeschizi proiectul. Butonul cu ochi dintre butoanele ruletei ascunde toate măsurătorile și le arată din nou; se păstrează și dacă sunt ascunse, iar adăugarea, mutarea sau ștergerea unei măsurători le face mai întâi vizibile.

## Distanțe față de origine și în timpul mutării

În setări, la {{ui:workspace.appearance}}, există două comutatoare pentru dimensiuni în timp real:

- {{ui:workspace.showMoveDimensions}} arată cu cât muți în timp ce tragi. Asta include și ridicarea cu săgeata neagră de deasupra unui corp; deplasarea în sus sau în jos apare la colțul lui din față. După ce dai drumul, dă clic pe un astfel de număr și scrie distanța exactă; un minus înseamnă în jos.
- {{ui:workspace.showOriginDimensions}} arată distanțele selecției față de originea plăcii, și când sunt selectate mai multe corpuri.

Cu {{ui:workspace.dimensionsAlwaysVisible}}, dimensiunile rămân vizibile permanent. Un corp care nu stă pe planul de lucru își arată și înălțimea deasupra lui; dă clic pe număr ca să scrii una nouă.

Ca să scapi de ele pentru o clipă, apasă [[Q]]: dimensiunile și distanțele din jurul selecției dispar, așa că o piesă pe care o muți se vede ușor. [[Q]] din nou le aduce înapoi. Un mâner spre care arăți își arată în continuare dimensiunea.

## Note

O notă consemnează ce nu spune geometria: „Șurubul ăsta e cu 0,3 mm prea strâns", „mai printează capacul", „cota de la Peter". Plasează una cu {{ui:editor.tool.note}} sau cu tasta [[N]].

- Dacă plasezi nota **pe un corp**, se mută odată cu el.
- Dacă o plasezi **alături**, rămâne pe planul de lucru ({{ui:note.free}}).
- {{ui:note.detach}} desprinde de corp o notă atașată.
- {{ui:editor.tool.group}} ia o notă atașată în grup; {{ui:editor.tool.ungroup}} o dă piesei vizibile de sub ea, inclusiv unui grup din interior. Cât timp un grup e deschis cu {{ui:group.edit}}, notele lui se mută cu piesa de sub ele și revin la grup cu {{ui:group.done}}; anularea le pune înapoi cum erau.
- Dacă îi este șters corpul sau nu mai are niciun corp vizibil sub ea, nota rămâne unde era, pe planul de lucru.
- Tragerea acului mută nota. Un clic pe ac pliază cartonașul, rămâne doar numărul mic; încă un clic îl deschide din nou. Un clic în text îl editează.
- Cât timp scrii, [[Enter]] păstrează textul, iar [[Esc]] îl readuce la forma dinainte să începi; [[Shift]]+[[Enter]] începe un rând nou.
- **Într-o schiță**, {{ui:editor.tool.note}} sau [[N]] plasează tot o notă, oriunde pe schiță. Toate notele unei schițe aparțin corpului ei: în vederea 3D stau pe el, pe partea de sus a unui corp extrudat sau baleiat și pe profilul desenat al unuia obținut prin revoluție, și se mută cu el. Când redeschizi schița, ea arată notele corpului, inclusiv pe cele plasate în 3D. În schiță, Anulează ia înapoi o notă ca pe o linie, iar {{ui:sketch.cancel}} renunță la ce ai schimbat în note. [[Shift]]+[[N]] arată sau ascunde notele și aici.

Notele se salvează în proiect, nu apar în niciun export și pot fi arătate sau ascunse cu {{ui:visibility.notes}} (în {{ui:editor.visibilityOptions}}, săgeata de lângă pictograma ochi) sau cu [[Shift]]+[[N]].

## Puncte de referință

Un punct de referință este un simplu semn în spațiu, ca un semn de creion sau un punct de trasaj într-un atelier: nu aparține niciunui corp, nu se printează niciodată, iar alte lucruri se aliniază la el. Dă clic dreapta pe un corp și alege {{ui:contextMenu.markCenter}}, {{ui:contextMenu.markCorners}} sau {{ui:contextMenu.markMidpoints}}: punctele apar pe fața de sus a corpului (a întregii selecții, dacă ai selectat mai multe). {{ui:contextMenu.markFaceCenter}} pune în schimb unul în mijlocul feței plane pe care ai dat clic dreapta, de exemplu pe o latură sau la un capăt. Cu un pivot setat, {{ui:contextMenu.markPivot}} pune unul exact pe el, ca centrul altei piese să se alinieze la punctul în jurul căruia se rotește selecția.

- Trage un punct ca să-l muți: se aliniază la colțuri, la mijloacele muchiilor și fețelor corpurilor, la colțurile lor reale și la alte puncte; ține apăsat [[Alt]] ca să-l lași liber. Sau dă clic pe el ca să-i vezi coordonatele și să scrii altele noi; ele folosesc unitatea pe care ai setat-o. Fiecare cartonaș poate fi tras de titlu deoparte, dacă acoperă ceva, separat: celelalte rămân unde sunt, iar un dublu clic pe titlu îl pune înapoi. Cartonașul atins ultimul stă în fața celorlalte. **Șterge tot** într-un cartonaș sau **Șterge toate punctele de referință** în meniul de clic dreapta (al unui corp sau al unui loc gol din vederea 3D) șterge toate punctele deodată. {{ui:common.delete}} îl șterge.
- Și ruleta poate marca un punct: {{ui:camera.tapeMarkMiddle}}, semnul pe jumătate plin din mijlocul unei măsurători, pune unul la mijlocul ei, de exemplu în centrul unei găuri rotunde. Și măsoară dintr-un punct: ruleta se aliniază la punctele de referință ca la colțuri.
- Când tragi o formă, muchiile și centrul ei se aliniază la un punct, cum se aliniază la alte forme ({{ui:workspace.objectSnap}}). Și echerul se aliniază la puncte.
- Punctele se salvează în proiect, nu apar în niciun export și se arată sau se ascund împreună cu notele prin {{ui:visibility.notes}} ([[Shift]]+[[N]]).

## Imagini de referință

O imagine de referință este o poză după care aliniezi piese: pune o fotografie a unei plăci electronice pe fundul carcasei ei și așază distanțierele, găurile și decupajele pentru conectori direct pe ea. Este un ghidaj, nu un corp: nu se printează niciodată, nu se exportă niciodată (STL, 3MF, OBJ, STEP, SVG), nu face parte niciodată dintr-un grup, dintr-un pachet sau dintr-o tăiere, iar estimarea de printare o lasă deoparte.

- Deschide {{ui:editor.import}} și alege {{ui:import.referenceImage}}, apoi o imagine PNG, JPG, WebP, GIF sau BMP. Ea ajunge pe planul de lucru - pe placă sau pe fața pe care ai pus planul de lucru - cu latura mai lungă de 100 mm, pe jumătate transparentă.
- Mut-o, rotește-o și redimensioneaz-o cu mânerele ei, ca pe orice formă. Un corp aflat în fața ei e ales primul, așa că lucrul deasupra ei nu apucă poza.
- {{ui:referenceImage.seeThrough}} din setările ei o estompează de la complet opacă la abia vizibilă.
- {{ui:referenceImage.calibrate}} îi dă dimensiunea reală, ca în schiță: dă clic pe două puncte din poză a căror distanță reală o știi - de exemplu două găuri de prindere ale plăcii - și scrie distanța în {{ui:referenceImage.distance}}. Poza își păstrează proporțiile și mijlocul.
- Blocheaz-o cu lacătul din antetul setărilor ei și rămâne pe loc: clicurile trec atunci prin ea până la placă. Alege-o în lista de obiecte ca s-o deblochezi.
- Poza se salvează o singură dată în fișierul proiectului, oricât de des ar fi copiată sau anulată. O poză mare mărește fișierul cu tot atât; mesajul de la adăugare spune cât de mare este.
