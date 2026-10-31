---
title: "Schițe: de la contur la corp"
summary: Desenează un contur plat, rotunjește-i sau teșește-i colțurile și trage-l sau rotește-l ca să devină un corp.
---

Nu orice se poate construi din forme de bază. Pentru piesele cu un contur propriu, cum ar fi un suport, profilul unui dinte sau o vază, desenezi întâi **conturul** și apoi faci din el un corp. Pentru asta există modul schiță.

## Începerea unei schițe

Sus, comută de la {{ui:editor.modeGeometry}} la {{ui:editor.modeSketch}}. În grupul {{ui:sketch.group.create}} din panglică stau alăturate trei butoane, după ce vrei să devină conturul:

- **{{ui:sketch.extrude}}:** Conturul e tras în sus, ca o formă de tăiat prăjituri.
- **{{ui:sketch.revolve}}:** Conturul e rotit în jurul unei axe, ca la strung. Așa ies vaze, căni, conuri și tot ce e rotund.
- **{{ui:sketch.sweep}}:** Conturul e tras de-a lungul unui traseu: un canal de cablu care cotește, un tub de protecție, un inel în jurul unei forme. Vezi mai jos „Baleiere de-a lungul unui traseu".

Editorul afișează apoi o foaie cu grilă. Aceasta e suprafața ta de desen.

## Desenarea

În modul schiță, panglica e împărțită în zone:

- **Desen:** {{ui:sketch.line}} face segmente drepte: dai clic pe puncte unul după altul; dacă ții apăsat [[Shift]], linia nouă se aliniază în pași de 15°, inclusiv orizontal și vertical. Lungimea și unghiul liniei noi apar lângă cursor. Poți și să tastezi cât de lungă să fie, vezi [Linii după numere](#linii-dupa-numere). {{ui:sketch.arc}} desenează un arc de cerc adevărat prin trei puncte: dai clic întâi pe cele două capete, apoi pe un al treilea punct prin care trece arcul; până la al treilea clic, o previzualizare urmărește cursorul, iar mesajul îți spune raza. Un capăt pe care dai clic peste un punct existent se unește cu el, așa că un arc poate închide un contur. [[Esc]] renunță la punctele puse până atunci și revine la {{ui:sketch.select}}. După aceea, arcul e geometrie obișnuită, din puncte și curbe: îl muți, îl tai sau îl ștergi ca pe orice altă linie. {{ui:sketch.bezier}} se modelează cu mânerele: dai clic pe un punct și tragi în direcția în care vrei să continue linia, ca la unealta stilou din Illustrator sau Inkscape. Cu cât tragi mai departe, cu atât se curbează mai tare; porțiunea spre punctul nou se curbează odată cu tragerea, așa că vezi ce obții. Dacă tragi în timp ce pui un punct, curba se îndoaie; dacă vii din Tinkercad și vrei doar să dai clic pe puncte, folosește {{ui:sketch.smooth}}. {{ui:sketch.smooth}} trasează o linie lină prin punctele pe care dai clic. Ca să închizi conturul, la sfârșit dai din nou clic pe primul punct. Ca să termini șirul de linii fără să închizi conturul, dă clic dreapta fără să miști cursorul sau dublu clic pe ultimul punct.
- **Forme:** {{ui:sketch.addShape}} oferă contururi gata făcute: {{ui:sketch.rectangle}}, {{ui:sketch.circle}}, {{ui:sketch.ellipse}}, {{ui:sketch.halfCircle}}, {{ui:sketch.pieSlice}}, {{ui:sketch.boltCircle}} (un disc cu găuri), {{ui:sketch.triangle}}, {{ui:sketch.hexagon}}, un {{ui:sketch.polygon}} și o {{ui:sketch.star}}. Dă clic pe una ca s-o pui în originea schiței sau trage-o din meniu unde o vrei. Jos în meniu, {{ui:sketch.polygonSides}} stabilește numărul de laturi ale poligonului și de vârfuri ale stelei, iar {{ui:sketch.starInner}} cât de adânc ajung văile stelei spre mijloc (între 10 și 90 la sută din raza exterioară); amândouă se aplică următoarei forme pe care o adaugi. Ca orice formă de schiță, după aceea sunt simple puncte de colț, așa că le poți muta, rotunji sau teși unul câte unul. Dreptunghiul pornește cu lățimea și adâncimea setate pentru cub la {{ui:workspace.shapeDefaults}} în setări, cercul și elipsa cu lățimea cilindrului de acolo; fără o valoare implicită proprie, precum și pentru celelalte forme, pornesc cu 20 mm diametru.
- **Suprapunere:** Dacă împingi două contururi închise unul peste altul, ele rămân două corpuri, care se unesc în editorul 3D; suprapunerea nu e o gaură. O gaură apare doar dintr-un contur aflat în întregime în interiorul altuia. Mutarea nu unește liniile acolo unde se intersectează, așa că poți despărți formele din nou. Dacă însă desenezi o linie peste altele, Magic3D pune un punct la fiecare intersecție.
- **Selecție:** {{ui:sketch.select}} mută puncte și linii. Un clic în interiorul unui contur închis selectează tot conturul, ca să-l poți trage sau redimensiona imediat; în interiorul unei găuri, alege gaura. Cadrul din jurul selecției are opt mânere: cele din colțuri schimbă lățimea și înălțimea împreună și păstrează proporțiile cât ții apăsat [[Shift]]. Cele de pe laturi schimbă o singură direcție. {{ui:sketch.keepProportions}} din bara care apare păstrează proporțiile fără [[Shift]]: colțurile și laturile întind atunci la fel în ambele direcții, iar o lățime sau o înălțime tastată o schimbă și pe cealaltă. Magic3D ține minte comutatorul. {{ui:sketch.lockOutline}}, alături, blochează conturul selectat, ca un corp blocat în editorul 3D ([[Ctrl]]+[[L]] face același lucru): nu mai poate fi mutat, redimensionat, rotit sau modificat, liniile lui devin mai palide și punctele gri, iar mânerele cadrului devin gri și nu mai răspund. Cât e selectat, un lacăt în colțul lui îl deblochează cu un clic. Liniile pot porni totuși din colțurile lui. {{ui:sketch.unlockOutline}} sau din nou [[Ctrl]]+[[L]] îl eliberează. Săgețile curbe de dincolo de colțurile cadrului rotesc toată selecția în jurul mijlocului ei: cifra de lângă cursor arată unghiul, iar cu [[Shift]] apăsat rotirea merge în pași de 15°. În timpul rotirii apare un inel: cu cursorul înăuntru, rotirea se aliniază la 22,5°, în afară merge în grade întregi, indiferent de grilă. [[R]] rotește un contur închis întreg cu 45° la fiecare apăsare. Dă clic pe eticheta cu lățimea sau înălțimea ca să tastezi o dimensiune nouă, inclusiv ca sumă („60+12.5") sau în procente („150%"). Câmpurile X și Y din bara de deasupra schiței arată unde se află mijlocul selecției, în mm față de originea schiței; tastează o valoare ca s-o muți acolo, de exemplu pentru o gaură la exact 12 mm de mijloc. Y crește în sus, ca în editorul 3D. Cu [[Shift]] apăsat, un clic pe un punct sau pe o linie îl adaugă la selecție sau îl scoate din nou, așa că poți alege mai multe și le poți muta împreună. Trage un dreptunghi peste un spațiu gol ca să selectezi tot ce e în el. Cu două sau mai multe contururi selectate, bara le și aliniază: la stânga, centrat sau la dreapta și sus, centrat sau jos, după cadrul din jurul tuturor. Fiecare contur se mută întreg și își păstrează forma; centrate pe ambele direcții, două cercuri devin un inel. Un contur blocat rămâne pe loc, iar celelalte se aliniază la el. Și o linie poate fi trasă (se mută prin cele două capete ale ei, sau toată selecția, dacă face parte din ea). Tastele săgeți mută selecția cu un pas de grilă, iar împreună cu [[Shift]] cu un pas mai mare; [[Shift]] ținut apăsat în timp ce tragi păstrează mutarea pe o singură axă. {{ui:sketch.refine}}: un clic pe un segment adaugă un punct, un clic pe un punct îl elimină. Mai sunt {{ui:sketch.erase}} (un clic pe un punct sau pe o linie îl șterge, o fereastră trasă peste mai multe șterge tot ce e în ea, iar cu ceva selectat butonul șterge selecția) și inserarea unei imagini-șablon ({{ui:sketch.addImage}}). Când elimini un punct, Magic3D unește cei doi vecini ai lui, ca să rămână conturul închis. Ca să închizi o deschidere, de exemplu după ce ai șters o latură a unui hexagon, trage un capăt liber peste celălalt: se aliniază acolo și cele două devin un singur punct, așa că conturul e din nou închis. La o intersecție, cum ar fi acolo unde o linie taie un cerc, se unesc laturile care continuă drept înainte: arc cu arc, linie cu linie, iar cercul rămâne rotund. Ca să scapi doar de o bucată dintr-un cerc, de exemplu pentru un colț rotunjit, dă clic cu radiera exact pe bucata de arc dintre două puncte; restul rămâne.
- **Clipboard:** {{ui:editor.tool.copy}}, {{ui:editor.tool.paste}}, {{ui:editor.tool.duplicate}} și {{ui:editor.tool.delete}} lucrează pe punctele, liniile și imaginile selectate, ca în editorul 3D; [[Ctrl]]+[[X]] decupează. Geometria lipită sau duplicată ajunge lângă original, la 10 mm distanță, într-un loc liber unde nu atinge nicio linie existentă, așa că nu se unește niciodată cu ce există deja. Rămâne selectată, ca s-o poți trage imediat la locul ei.
- **Istoric:** {{ui:sketch.undo}} și {{ui:sketch.redo}}.
- **{{ui:sketch.viewControls}}:** {{ui:editor.tool.note}} (sau [[N]]) pune o notă pe schiță, ca în editorul 3D: următorul clic o așază oriunde, inclusiv pe o linie. Trage de pioneză ca s-o muți; un clic pe pioneză pliază cartonașul. Notele unei schițe aparțin corpului ei: în vederea 3D stau deasupra unui corp extrudat sau baleiat și pe profilul desenat al unui corp de revoluție și se mișcă odată cu el. Când redeschizi schița, vezi toate notele corpului, inclusiv pe cele puse în 3D. {{ui:sketch.undo}} anulează o notă ca pe o linie, iar {{ui:sketch.cancel}} renunță la modificările notelor. Mai multe în capitolul „Măsurare și note".
- **Vedere:** Deplasează vederea cu butonul din mijloc al mouse-ului sau cu [[Shift]] ori [[Ctrl]] plus butonul drept, ca în editorul 3D. Fără nimic selectat, [[Ctrl]] și tastele săgeți o deplasează și ele: o zecime din vedere la o apăsare, jumătate dacă ții și [[Shift]]; schița se mișcă în direcția în care arată săgeata. [[Home]] încadrează toată schița în vedere, [[F]] face zoom pe selecție (fără nimic selectat, pe toată schița), iar [[+]] și [[−]] măresc și micșorează, ca în editorul 3D. Fără nimic selectat, un dublu clic pe un loc gol deplasează vederea astfel încât locul acela ajunge în mijloc, ca în editorul 3D; {{ui:workspace.doubleClickCentersView}} din setări dezactivează asta. {{ui:camera.tapeTools}} din bara laterală măsoară distanța dintre două puncte. Schița arată și cote imediat ce dai clic pe ceva: lungimea unei linii sau, pentru un punct, lungimile liniilor care se întâlnesc acolo. Butonul {{ui:sketch.showMeasurements}} din bara laterală ascunde și arată aceste cote când te încurcă, de exemplu când modelezi curbe; ruleta continuă să funcționeze. Pe o linie dreaptă poți da clic pe eticheta cotei și poți tasta lungimea în milimetri; [[Enter]] o aplică, [[Esc]] anulează. Linia își păstrează direcția, punctul de început rămâne pe loc, iar liniile de la celălalt capăt urmează. Dacă e selectat un punct de capăt, se mută acela. [[Alt]]+[[Enter]] lungește linia în ambele părți, în jurul mijlocului ei. Pe curbe, eticheta arată doar lungimea.

Un corp se obține doar dintr-un contur **închis**.

![Un contur în formă de L. La punctul de colț selectat, sus în stânga, se văd lungimile celor două linii în milimetri și unghiul dintre ele în grade.](shot:sketch-outline)

Tastele [[1]]–[[4]] aleg uneltele de desen, în ordinea din bară: {{ui:sketch.line}}, {{ui:sketch.bezier}}, {{ui:sketch.smooth}} și {{ui:sketch.refine}}. Funcționează cât timp nu desenezi o linie; în timpul desenării, cifrele sunt lungimea ei (vezi mai jos). Cu unealta {{ui:sketch.select}} și cu linii sau puncte selectate, aceleași taste le modifică: [[1]] face liniile drepte și punctele colțuri, [[2]] transformă liniile în curbe, iar [[3]] face punctele netede. Fără nimic selectat, aleg unealta ca înainte.

## Linii după numere

După ce ai pus primul punct cu {{ui:sketch.line}} sau {{ui:sketch.smooth}}, tastează pur și simplu un număr: lângă linie se deschid două câmpuri, {{ui:sketch.typedLength}} în milimetri și {{ui:sketch.typedAngle}} în grade. [[<]] sau [[Tab]] trece la unghi, așa că „50<30" dă o linie lungă de 50 mm la 30°, ca în AutoCAD. [[Enter]] pune punctul și poți tasta imediat linia următoare; [[Esc]] închide câmpurile fără să încheie șirul de linii.

Unghiul se măsoară în sens invers acelor de ceasornic, de la dreapta: 0° la dreapta, 90° în sus, 180° la stânga, 270° în jos. Dacă îl lași gol, linia urmează cursorul, așa că dai doar lungimea și arăți direcția cu mouse-ul. Sume ca „40+12.5" merg în ambele câmpuri. Dacă punctul ar ajunge în afara plăcii, câmpul îți spune asta și așteaptă altă valoare.

## Curbarea unei laturi drepte

Selectează o linie dreaptă și dă clic pe {{ui:sketch.curveLine}} în bara care apare: latura se arcuiește într-o curbă, ca în Tinkercad, și își arată cele două mânere. Trage de ele ca să modelezi curba; cu cât un mâner stă mai departe, cu atât curbura e mai puternică. Sub cursor, un mâner devine portocaliu și prinde și un clic dat chiar lângă el, așa că o imagine-șablon de dedesubt nu se mișcă din greșeală. {{ui:sketch.straightenLine}} face latura din nou dreaptă. Un punct selectat poate fi rotunjit cu {{ui:sketch.smooth}}: primește mânere proprii, iar liniile de lângă el devin curbe. Cu trei sau mai multe puncte selectate, {{ui:sketch.curveThroughPoints}} din bară trasează o singură curbă lină de la primul la ultimul, prin fiecare punct dintre ele, cum desenează unealta {{ui:sketch.smooth}}; liniile de dincolo de cele două capete rămân cum sunt. Alte programe îi spun „Fit curve" sau „Fit point spline". Cele două diferă: {{ui:sketch.curveLine}} curbează fiecare latură selectată separat și păstrează colțurile dintre ele, pentru un arc pe o latură; {{ui:sketch.curveThroughPoints}} trece o singură curbă prin puncte, fără să mai rămână colțuri, ca să netezești o margine zimțată obținută prin trasare. Dă clic pe un mâner și se aprinde: tastele săgeți îl mută apoi cu un pas de grilă, iar cu [[Shift]] cu un pas mai mare, ca să poți regla curba precis.

![Latura de jos a conturului în formă de L, curbată, cu cele două mânere ale ei la capete.](shot:sketch-curve)

## Citirea și tastarea unghiurilor

Dă clic pe un punct de colț unde se întâlnesc **două linii drepte**: lângă lungimi, Magic3D arată **unghiul** dintre ele în grade, cu un mic arc. Pe un contur închis e unghiul din interiorul formei, așa că o adâncitură are peste 180°. Dă clic pe valoare și tastează un unghi nou. Una dintre cele două linii se rotește atunci în jurul colțului și își păstrează lungimea, iar cealaltă rămâne pe loc. Linia care se rotește e desenată punctat; [[Tab]] trece la cealaltă, [[Enter]] aplică și [[Esc]] anulează. Ce atârnă la capătul îndepărtat al liniei rotite se mișcă odată cu ea.

Mutarea unui punct schimbă trei unghiuri: în punctul însuși și în cele două colțuri vecine, de la capetele îndepărtate ale liniilor lui. De aceea Magic3D le arată și pe acestea două, iar pe fiecare poți da clic și poți tasta. Așa setezi, de exemplu, colțul din stânga jos la 75,5° cât timp e selectat punctul din stânga sus, care se mută pentru asta. Și aici poți face calcule, de exemplu „90-14.5".

Un colț nu arată niciun unghi acolo unde se întâlnește cu o curbă sau unde se întâlnesc mai mult de două linii. Butonul {{ui:sketch.showMeasurements}} din bara laterală ascunde unghiul împreună cu lungimile.

## Rotunjirea sau teșirea colțurilor

Dă clic pe un punct de colț și alege {{ui:sketch.filletCorner}} sau {{ui:sketch.chamferCorner}}. Apare un mic câmp pentru {{ui:sketch.filletRadius}} sau pentru {{ui:sketch.chamferDistance}}. Introdu dimensiunea și confirmă cu bifa. Funcționează pentru colțurile dintre două linii drepte.

Merg și mai multe colțuri deodată: selectează-le cu [[Shift]] și câte un clic pe fiecare sau trage un cadru în jurul lor și alege {{ui:sketch.filletCorner}} sau {{ui:sketch.chamferCorner}} din bara care apare. Toate primesc aceeași rază sau distanță. Acolo unde două colțuri selectate au o latură comună, fiecare ia cel mult 45 % din ea, așa că un dreptunghi rotunjit de jur împrejur iese la fel în fiecare colț. Punctele care nu sunt colțuri între două linii drepte sunt lăsate deoparte, iar mesajul spune câte sunt. Un cadru în jurul unei forme întregi sau un clic în interiorul ei îi selectează colțurile și liniile împreună, iar bara oferă atunci, lângă uneltele pentru colțuri, {{ui:sketch.curveLine}} și {{ui:sketch.straightenLine}} pentru toate liniile selectate.

![Colțul din stânga sus e rotunjit cu o rază de 12 mm.](shot:sketch-fillet)

## Oglindirea

Selectează puncte și linii (clic, [[Shift]] și clic sau un cadru tras în jurul lor) și dă clic pe {{ui:sketch.mirror}} în bară. Apoi alege axa: {{ui:sketch.mirrorLeftRight}} oglindește față de axa verticală prin mijlocul plăcii, {{ui:sketch.mirrorTopBottom}} față de cea orizontală, iar {{ui:sketch.mirrorAcrossLine}} față de o linie dreaptă a schiței pe care dai clic după aceea. Copia se adaugă de cealaltă parte, iar originalul rămâne; nimic nu e legat, așa că le poți modifica separat. Punctele aflate pe axă sunt comune, așa că o jumătate de contur cu capetele pe axă devine un singur contur închis: desenează jumătate dintr-un suport, selecteaz-o, oglindește-o și fă corpul. O linie de construcție e o axă bună. [[Esc]] anulează.

## Linii de construcție

O linie de construcție te ajută să pui puncte fără să devină parte din corp. E desenată punctat și nu contează niciodată drept contur: o poți trage oricât de departe dincolo de formă, iar corpul nu crește.

- Activează {{ui:sketch.construction}} din grupul {{ui:sketch.group.draw}}. Liniile noi, inclusiv cele tastate după măsură, sunt atunci linii de construcție. Butonul te readuce la liniile normale.
- O linie deja desenată devine linie de construcție când dai clic pe ea și alegi {{ui:sketch.makeConstruction}}. {{ui:sketch.makeSolid}} o face din nou linie normală.
- Punctele noi se aliniază acolo unde o linie de construcție intersectează altă linie (un inel albastru arată asta) și la capetele liniei de construcție. Așa pui un colț la mijloc, la o distanță fixă de o margine sau pe o intersecție, fără să calculezi.
- Punctele noi se aliniază și la mijlocul fiecărei linii drepte din schiță, la centrul fiecărui cerc și colț rotunjit și la mijloacele laturilor unui corp afișat dedesubt (#624). Un punct pe care îl tragi ignoră mijlocul propriilor linii.
- {{ui:sketch.fromMiddle}} din grupul {{ui:sketch.group.draw}} desenează o linie pornind de la mijlocul ei: dai clic întâi pe mijloc, apoi pe capăt, iar linia se întinde la fel de mult și în partea cealaltă. Mijlocul devine un punct separat. Dă din nou clic pe buton ca să desenezi linii normale.
- O linie de construcție nu taie conturul acolo unde îl intersectează. La revoluție poate sta și la dreapta axei.

## Transformarea în corp

Dă clic pe {{ui:sketch.finishSketch}}. Conturul stă ca un corp pe planul de lucru. În setările lui schimbi înălțimea, culoarea și tot restul, ca la orice altă formă. Când îl redimensionezi, Magic3D îl reconstruiește din schiță o clipă mai târziu, iar schița crește odată cu el. Așa rămâne un corp exact, care acceptă teșituri și rotunjiri, iar data viitoare când îl editezi schița are dimensiunea corpului.

Dacă planul de lucru stă pe latura unui corp, desenezi așa cum privești latura aceea: sus în schiță înseamnă sus și pe corpul terminat. Conturul șters al corpului din vederea schiței arată unde se află. Dacă planul de lucru taie printr-un corp, vederea schiței arată în schimb conturul acelei secțiuni, așa că un corp golit apare ca un inel și poți alinia schița cu pereții lui. Un punct pe care îl pui sau îl tragi aproape de un colț al acestor contururi se aliniază exact pe el; un mic inel albastru arată asta. Așa preiei în schiță muchii ale altor corpuri, chiar dacă planul de lucru nu stă exact pe ele. Ca să urmărești ce ai construit deja, activează {{ui:sketch.showPartEdges}} (butonul cu straturi dintre butoanele de vedere din stânga): toate muchiile corpurilor sunt atunci desenate pe planul schiței, subțiri și șterse, ca și cum te-ai uita prin ele, indiferent la ce înălțime se află. Un plan vertical, pus de exemplu pe o față din față, arată astfel vederea din față. Alegerea se păstrează în browser.

![Conturul a devenit un corp. Colțul e rotunjit.](shot:sketch-result)

Cu {{ui:inspector.editSketch}} poți reveni oricând la schiță ca s-o modifici. Un dublu clic pe corp face același lucru, ca în Tinkercad (un corp blocat rămâne închis); {{ui:workspace.doubleClickOpensSketch}} din setări dezactivează asta. Prelucrările de muchii făcute deja pe corp se pierd totuși, pentru că muchiile se creează din nou. Un corp pe care l-ai rotit sau mutat în editorul 3D se deschide acolo unde stă pe placă, rotit cum îl vezi acolo și pe grila plăcii; doar un corp înclinat sau oglindit se deschide în propriul sistem de referință.

O schiță cu mai multe contururi face un singur corp, iar contururile care se suprapun se unesc în el. Ca să ai fiecare contur separat, selectează corpul și dă clic pe {{ui:inspector.separateParts}}: fiecare contur exterior devine un corp separat, cu găurile din el, și păstrează înălțimea, culoarea și locul corpului. Fiecare parte are propria schiță de editat, cu liniile de construcție, așa că poți ridica sau coborî părțile una câte una și le poți uni sau tăia după aceea. Prelucrările de muchii împiedică asta, la fel și un corp întins între timp: acesta e atunci despărțit ca mesh.

**Alt tip de corp din aceeași schiță:** eticheta din partea de sus a schiței spune ce devine, {{ui:sketch.modeBadgeExtrude}}, {{ui:sketch.modeBadgeRevolve}} sau {{ui:sketch.modeBadgeSweep}}. Dă clic pe ea și alege alt tip, chiar și în timp ce editezi un corp existent: un SVG importat, care vine extrudat, devine o vază sau un buton când îl comuți pe {{ui:sketch.modeBadgeRevolve}}. Un contur care trece peste axă se mută spre stânga până când marginea lui dreaptă ajunge pe axă, așa că jumătatea de secțiune a unui SVG se rotește în jurul laturii ei drepte; [[Ctrl]]+[[Z]] anulează mutarea. Când termini, corpul nou ia locul, numele și culoarea celui vechi, cu baza la aceeași înălțime. Prelucrările de muchii dispar, ca la orice editare a unei schițe.

### Revoluția

La revoluție desenezi jumătate din secțiune **la stânga axei** afișate în schiță. Alături vezi o previzualizare 3D a revoluției. Îți arată imediat cum va arăta corpul. O poți roti, deplasa și mări cu mouse-ul; butonul mic din colțul ei din dreapta sus sau un dublu clic pe ea readuce vederea inițială. Conturul trebuie să fie închis, altfel construiești o linie deschisă ca tușă, vezi mai jos. La sfârșit dă clic pe {{ui:sketch.finishRevolve}}. Celelalte corpuri ale proiectului se văd din față, în aceeași vedere ca profilul, cu axa în mijloc: desenează profilul lângă ele sau deasupra lor. Corpul stă acolo unde l-ai desenat, iar linia orizontală prin mijlocul schiței e solul: un profil desenat deasupra ei dă un corp care stă mai sus, iar punctul lui cel mai de jos e baza corpului.

Un corp de revoluție e un corp exact, ca unul extrudat: acceptă teșituri și rotunjiri și îl poți goli, pentru o cană sau o vază. Un corp de revoluție făcut cu o versiune mai veche de Magic3D e un mesh; deschide {{ui:inspector.editSketch}} și termină-l din nou ca să devină exact. Un profil care trece peste axă nu poate fi construit exact și devine mesh, ca înainte.

**O singură spirală continuă: {{ui:prop.pitch}}.** O revoluție transformă conturul în inele închise. Selectează corpul de revoluție și dă-i în panoul de proprietăți un {{ui:prop.pitch}} peste 0, adică distanța cu care urcă la fiecare tură, iar conturul se înfășoară atunci ca un helix: o singură spirală continuă, ca filamentul pe bobină sau ca un arc. {{ui:prop.sweep}} devine atunci {{ui:prop.turns}}, până la 200; un număr negativ înfășoară spre stânga. Turele mai apropiate decât înălțimea conturului se topesc într-un singur corp, așa că merge și un miez plin cu un pas fin. Un helix se construiește ca mesh, așa că rotunjirea, teșitura și golirea nu funcționează pe el; ține {{ui:prop.sides}} la o valoare mică dacă ai multe ture. Un pas de 0 face din nou inele.

## Baleiere de-a lungul unui traseu

{{ui:sketch.sweep}} trage un contur de-a lungul unui traseu: un canal de cablu care cotește, un tub de protecție, o apărătoare în jurul unei curele, un inel în jurul unui hexagon. Stă lângă {{ui:sketch.extrude}} și {{ui:sketch.revolve}} în grupul {{ui:sketch.group.create}}.

Desenezi două lucruri pe aceeași foaie:

- **Secțiunea**, ca un contur închis, ca de obicei. Desenează-o cum ai vedea-o privind de-a lungul traseului, de la începutul lui: transversal pe traseu înseamnă stânga și dreapta schiței, iar sus înseamnă sus pe corpul terminat. O secțiune goală, un canal sau un tub, e un contur cu altul în interior. Implicit, secțiunea e centrată pe traseu. Meniul de lângă eticheta modului, sus, îți permite să pui în schimb marginea ei stângă sau dreaptă pe traseu ({{ui:sketch.sweepAnchorLeft}}, {{ui:sketch.sweepAnchorRight}}, văzut de-a lungul traseului), astfel încât o șină poate sta pe o parte a liniei sau poate urma marginea unei piese. Corpul stă pe planul schiței cu punctul cel mai de jos al secțiunii.

- **Traseul**, ca {{ui:sketch.construction}}: activeaz-o și desenează linii sau curbe, un singur șir, deschis sau închis (un șir închis dă un inel). Traseul stă plat în planul schiței.

Desenează secțiunea lângă capătul traseului de unde vrei să înceapă; traseul începe la capătul cel mai apropiat de ea. Apoi dă clic pe {{ui:sketch.finishSweep}}. Un colț din bucăți drepte devine o îmbinare în unghi, o curbă rămâne lină, iar secțiunea rămâne verticală pe tot parcursul. Corpul e exact, ca unul extrudat: rotunjirea, teșitura și exportul STEP funcționează pe el. Dacă lipsește un contur închis sau un traseu ori dacă sunt mai multe trasee separate, Magic3D îți spune. Cu {{ui:inspector.editSketch}} poți reveni la schiță ca să schimbi secțiunea sau traseul.

## Construirea ca tușă

De obicei, suprafața din interiorul unui contur închis devine corpul. Cu {{ui:sketch.stroke}} din secțiunea {{ui:sketch.group.finish}} construiești în schimb linia însăși, cu o lățime pe care o alegi. Bifează {{ui:sketch.strokeOn}} în panou; schița arată imediat ce iese.

- Un **contur închis** devine un cadru. {{ui:sketch.strokeAlign}} spune unde stă peretele: {{ui:sketch.strokeAlign.center}} pe linia desenată, {{ui:sketch.strokeAlign.inside}} în interiorul ei sau {{ui:sketch.strokeAlign.outside}} în afara ei. În afară e util pentru o toleranță: desenează conturul unei găuri, de exemplu al unei coade de rândunică, și dă-i o tușă de 0,2 mm în afară ca să obții jocul de care are nevoie printarea.
- O **linie deschisă** devine o bandă, centrată pe linie. {{ui:sketch.strokeCap}} stabilește cum arată capetele ei: {{ui:sketch.strokeCap.flat}}, {{ui:sketch.strokeCap.square}} (mai lungă cu jumătate din lățime) sau {{ui:sketch.strokeCap.round}}.
- {{ui:sketch.strokeJoin}} se aplică la amândouă: {{ui:sketch.strokeJoin.miter}}, {{ui:sketch.strokeJoin.round}} sau {{ui:sketch.strokeJoin.bevel}}.

Schița păstrează linia desenată. Deschide-o din nou și continui să modifici linia și tușa; debifează căsuța și se construiește din nou suprafața. Pentru asta, curbele sunt împărțite în bucăți drepte scurte.

La o revoluție, tușa e un perete subțire: desenează peretele unei vaze sau al unei căni ca **o singură linie deschisă** la stânga axei, bifează {{ui:sketch.stroke}} și setează lățimea, iar revoluția rotește banda aceea. Ce trece peste axă e tăiat la nivelul ei.

## Umplere și siluetă

Poți seta tușa și fără să deschizi schița: în proprietățile unui corp din schiță, alege {{ui:prop.sketchFill.area}}, {{ui:prop.sketchFill.outside}}, {{ui:prop.sketchFill.inside}} sau {{ui:prop.sketchFill.center}} la {{ui:prop.sketchFill}}, cu {{ui:prop.sketchLineWidth}} și {{ui:sketch.strokeJoin}}. Corpul se reconstruiește imediat, acolo unde stă. Acestea corespund modurilor de umplere de la importul SVG din Tinkercad: implicit, linie exterioară și linie interioară. {{ui:prop.sketchFill.grow}} păstrează suprafața plină și o lărgește de jur împrejur cu lățimea liniei, cu colțuri ascuțite, rotunjite sau teșite: un strat de bază sub un logo pentru o printare multicoloră, pe care tușa exterioară singură l-ar da doar ca inel. {{ui:prop.sketchFill.shrink}} face invers: suprafața rămâne plină, iar marginea ei se retrage de jur împrejur cu lățimea liniei, inclusiv la găuri (care cresc). Folosește-le pe amândouă pe copii ale aceleiași schițe pentru o îmbinare: gaura la dimensiunea desenată, iar piesa care trece prin ea cu {{ui:prop.sketchFill.shrink}} de 0,5 mm, sau un perete în interiorul unei forme tăiate din același contur. O lățime mai mare decât permite conturul nu lasă nimic. În panoul de tușă al schiței, aceleași două opțiuni se află la {{ui:sketch.strokeAlign}}. Cu o linie în afară, în interior sau centrată, {{ui:prop.sketchCuttingEdge}} face peretele ascuțit sus: partea de sus se îngustează la lățimea aceea cu o teșitură de 45° pe ambele părți, ca la o formă de tăiat prăjituri. 0 lasă partea de sus plată; muchia rămâne când schimbi lățimea liniei.

{{ui:prop.sketchSilhouette}} lasă deoparte orice contur aflat în interiorul altuia: găurile și tot ce e în ele. Rămâne doar conturul exterior. Împreună cu {{ui:prop.sketchFill.outside}} face o formă de tăiat prăjituri: importă un SVG de două ori, o dată cu silueta ca suprafață pentru bază și o dată cu silueta și o tușă exterioară de 1–2 mm ca perete. Comutatorul se află și în panoul {{ui:sketch.stroke}} din modul schiță.

Rotunjirile și teșiturile de pe muchii dispar când corpul se reconstruiește, ca la editarea schiței.

## Pereți înclinați, pentru ștampile

Un corp extrudat dintr-o schiță are pereți verticali. O ștampilă, o matriță de embosare sau un poanson are nevoie de pereți înclinați, în afară și în interior, cu aceeași grosime a peretelui pe toată înălțimea. Magic3D nu are unghi de înclinare pentru extrudare, dar pentru contururile simple ajungi acolo cu {{ui:inspector.taper}}. O metodă care funcționează:

1. Desenează conturul cu gaura de care are nevoie și fă din el un corp. Duplică acest corp ([[Ctrl]]+[[D]]).
2. Pe primul corp, activează {{ui:prop.sketchSilhouette}}, ca gaura să fie umplută, și dă-i cu {{ui:inspector.taper}} o bază mai lată decât partea de sus.
3. Pe copie, deschide din nou schița și șterge conturul exterior, ca să rămână doar conturul găurii. Termină schița, comută corpul pe {{ui:inspector.hole}} și dă-i cu {{ui:inspector.taper}} o bază mai îngustă decât partea de sus.
4. Mută gaura în primul corp, acolo unde era gaura, și grupează-le pe cele două.

Pereții sunt acum înclinați în afară și în interior. Înclinarea scalează tot conturul, așa că metoda e exactă pentru formele simple, unde poți alege dimensiunile astfel încât pereții să fie paraleli, și doar aproximativă pentru detaliile fine, cum ar fi literele.

## O imagine ca șablon

Cu {{ui:sketch.addImage}} pui o fotografie sau un desen sub schiță și îl urmărești cu linii, oricând, chiar și înainte de prima linie. Îi poți seta dimensiunea, opacitatea și poziția. Când imaginea stă cum trebuie, blocheaz-o cu [[Ctrl]]+[[L]], ca să n-o muți din greșeală în timp ce desenezi. O imagine blocată nu te mai încurcă: clicurile trec prin ea, așa că poți alege linii și puncte de deasupra ei și poți trage un cadru peste ele. Lacătul din colțul ei o deblochează cu un clic; [[Alt]]+clic o selectează fără s-o deblocheze. Dacă setările ei de la marginea din dreapta acoperă imaginea, trage-le deoparte de bara de titlu; un dublu clic pe ea le andochează din nou.

La {{ui:sketch.imageAlign}} îndrepți o fotografie care n-a fost făcută drept:

- **{{ui:sketch.imageRotation}}:** Rotește imaginea în jurul centrului ei, cu săgețile curbe de dincolo de colțuri sau ca număr în grade. Cu [[Shift]], săgețile se aliniază în pași de 15°. În interiorul inelului care apare în timpul rotirii se aliniază la 22,5°, în afara lui la grade întregi.
- **{{ui:sketch.centreImageX}}** și **{{ui:sketch.centreImageY}}:** pun centrul imaginii pe X = 0 sau pe Y = 0. La o revoluție, X = 0 e axa, așa că imaginea stă atunci simetric față de ea.
- **{{ui:sketch.calibrateImage}}:** Butonul lui se află sus, chiar sub previzualizare. Dă clic pe două puncte din imagine a căror distanță o știi, capetele unei rigle sau un diametru cunoscut, și tastează distanța reală. Imaginea e scalată uniform astfel încât distanța aceea să fie corectă; primul punct rămâne unde era.
- **{{ui:sketch.cropImage}}:** Mânerele de pe cadru decupează acum imaginea în loc s-o scaleze; ce e tăiat rămâne stocat și revine cu {{ui:sketch.uncropImage}} sau când tragi din nou un mâner în afară.

Toate patru afectează doar referința, niciodată schița.

**{{ui:sketch.traceImage}}** te scutește de desenul de mână: alege {{ui:iconTag.part.dark}} sau {{ui:iconTag.part.light}}, setează {{ui:sketch.traceThreshold}}, adică pragul unde întunecatul trece în luminos, și dă clic pe {{ui:sketch.traceImageButton}}. Partea aceea a imaginii devine linii de schiță închise chiar acolo unde se află, rotite și decupate odată cu ea, pe care le editezi apoi ca pe orice alte linii. Apar selectate, așa că [[Delete]] le șterge din nou ca să încerci alt prag. Pentru o bordură în afara sau în interiorul conturului, dă corpului din schiță o tușă în afara sau în interiorul liniilor lui ori decalează corpul terminat.

## Taste în modul schiță

| Tastă | Efect |
| --- | --- |
| [[Esc]] | lasă jos unealta de notă; altfel lasă jos unealta (înapoi la {{ui:sketch.select}}), apoi golește selecția |
| [[Delete]] | șterge elementul selectat |
| [[Ctrl]]+[[C]] | copiază selecția |
| [[Ctrl]]+[[X]] | decupează selecția |
| [[Ctrl]]+[[V]] | lipește |
| [[Ctrl]]+[[D]] | duplică selecția |
| [[Ctrl]]+[[Z]] | anulează |
| [[Ctrl]]+[[A]] | selectează toate punctele și liniile |
| [[Ctrl]]+[[I]] | {{ui:sketch.addImage}} |
| [[Shift]] | la desenare: aliniază linia în pași de 15°; la tragere: păstrează mișcarea pe o singură axă |
| cifră, [[<]], [[Tab]], [[Enter]] | la desenare: tastează și setează lungimea și unghiul liniei următoare |
| [[R]] | rotește schița închisă cu 45° |
| [[Ctrl]]+[[L]] | blochează sau deblochează conturul selectat ori imaginea-șablon |
| [[N]] | pune o notă: următorul clic o așază pe schiță |
| [[Shift]]+[[N]] | arată sau ascunde notele |

> **Sfat:** Desenează cât mai puține puncte. Un contur cu câteva puncte bine plasate dă un corp mai neted decât o încâlceală de multe puncte.
