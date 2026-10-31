---
title: Vederea și planul de lucru
summary: Cum te miști prin scenă, cum privești drept din față și cum așezi forme noi pe orice suprafață vrei.
---

## Deplasarea prin scenă

Cu mouse-ul:

| Ce faci | Ce se întâmplă |
| --- | --- |
| tragi cu butonul din dreapta | rotești vederea |
| dai clic cu butonul din dreapta | pe un corp, un meniu cu comenzile cele mai folosite: duplică, gaură sau solid, grupează, ascunde, blochează, șterge și altele; pe un loc gol, Lipește și Selectează tot |
| tragi cu butonul din mijloc | deplasezi vederea |
| rotița mouse-ului | zoom înainte și înapoi |
| ții apăsat [[Ctrl]] / [[Cmd]] și tragi cu butonul din stânga | deplasezi tot vederea (pe trackpadul unui MacBook: ține [[Cmd]], apasă și trage); pe Mac, dacă ții în schimb Control, vederea se rotește, pentru că Control-clic este clicul dreapta de pe Mac |
| dublu clic pe planul de lucru gol sau lângă placă | vederea se mută astfel încât locul respectiv ajunge în mijloc; apoi vederea se rotește în jurul lui |

Cât de repede face zoom rotița setezi cu {{ui:workspace.zoomSpeed}} în setări, la {{ui:workspace.appearance}}: un cursor de la 1 la 14, inițial pe 5. Setarea afectează doar rotița și trackpadul: butoanele și tastele [[+]] și [[−]] fac zoom mereu în aceiași pași mici. O treaptă a rotiței mouse-ului face același zoom în orice browser, iar trackpadul face zoom după cât de mult glisezi.

**Butoanele mouse-ului ca în slicer.** Dacă te-ai obișnuit cu Bambu Studio sau OrcaSlicer, setează {{ui:workspace.mouseScheme}} în setări, la {{ui:workspace.appearance}}, pe {{ui:workspace.mouseSchemeSlicer}}. Atunci, tragerea cu butonul din stânga pe un loc gol rotește vederea, butonul din dreapta o deplasează ca butonul din mijloc, iar Shift cu tragere cu butonul din stânga desenează caseta de selecție. Tragerea pe un corp tot îl mută, iar un clic dreapta scurt tot deschide meniul. Într-o schiță, butonul din dreapta deplasează și el vederea.

**Mouse 3D.** Un SpaceMouse sau alt mouse 3D rotește, deplasează și face zoom în vederea 3D: împinge capacul înainte ca să faci zoom înainte, glisează-l ca să deplasezi vederea, înclină-l ca să înclini vederea și răsucește-l ca să rotești vederea. În setări, la {{ui:workspace.appearance}}, dă clic pe {{ui:workspace.spaceMouseConnect}} și alege dispozitivul în fereastra pe care o deschide browserul; acesta ține minte alegerea, așa că e nevoie de pasul ăsta o singură dată. Funcționează în Chrome și Edge, care pot accesa astfel de dispozitive; Firefox și Safari nu pot.

Pe o tabletă sau pe un telefon, două degete fac zoom (le depărtezi sau le apropii) și deplasează vederea (le glisezi împreună). Un deget pe un loc gol rotește vederea, iar o atingere acolo anulează selecția; pe o formă sau pe un mâner lucrează pe proiect, exact ca butonul din stânga al mouse-ului. Ca să rotești vederea și cu un deget care pornește de pe o formă, activează {{ui:camera.touchRotate}} în bara camerei. Comutatorul apare pe dispozitivele cu ecran tactil.

O tabletă grafică cu stilou se comportă ca un mouse: vârful este butonul din stânga, butonul de pe corpul stiloului e cel din dreapta, pentru rotirea vederii și pentru meniu. Tastele rapide ale tabletei pot fi setate în driverul ei pe [scurtăturile de tastatură](chapter:shortcuts) din Magic3D.

**Pe tabletă, lucrează cu un stylus dacă poți.** Vârful lui e mult mai fin decât un deget și nu acoperă ce țintești, așa că punctele mici, liniile subțiri și mânerele dintr-o schiță, punctele de măsurare și muchiile sunt nimerite exact, iar lucrul mai îndelungat te obosește mai puțin. Magic3D lasă deja un deget să ajungă puțin mai departe la puncte, linii, mânere și muchii decât un cursor de mouse, dar un stylus rămâne varianta mai precisă. Asta e valabil pentru un stilou pe care tableta îl recunoaște ca stilou (un S Pen, un Apple Pencil și altele asemenea). Un stylus simplu, cu vârf de cauciuc, contează pentru ecran ca un deget și nu e mai fin decât unul.

Pe o tabletă nu există buton dreapta de mouse: ține un deget nemișcat pe o formă sau pe un loc gol o jumătate de secundă și se deschide meniul pe care îl deschide un clic dreapta, cu **Selectează tot** pe un loc gol. **Selectează mai multe** din același meniu ține locul tastei Shift pe tabletă: fiecare atingere pe un corp îl adaugă atunci la selecție sau îl scoate din ea, până când atingi un loc gol sau apeși [[Esc]]; un deget pe un loc gol tot rotește vederea. Mânerele din jurul unei forme selectate pot fi prinse cu degetul și de puțin de lângă ele.

### Cubul de vedere

Cubul din stânga sus arată încotro privești. Un clic pe una dintre fețele lui sare la vederea dreaptă de sus, de jos, din față, din spate, din stânga sau din dreapta. Un clic pe un colț al cubului privește modelul în diagonală din acel colț, iar un clic lângă o muchie privește dinspre acea muchie, între două fețe; locul se luminează cât timp cursorul e pe el. Tastele numerice de la [[1]] la [[6]] dau și ele vederile drepte. Dacă ții [[Shift]] împreună cu ele, vederea face și zoom pe selecție, cum face [[Shift]]+[[F]].

Trage cubul ca să rotești vederea, exact ca la tragerea cu butonul din dreapta al mouse-ului. Când nu e nimic selectat, și tastele săgeți rotesc vederea: 15° la o apăsare, 90° cu [[Shift]]. Ele rotesc modelul în direcția în care arată - [[→]] îi întoarce fața spre dreapta, [[↑]] îi înclină fața în sus. Cu [[Ctrl]] apăsat, săgețile glisează în schimb vederea pe ecran: o zecime din imagine la o apăsare, jumătate dacă ții și [[Shift]]. Modelul se mișcă în direcția în care arată săgețile. Dacă e ceva selectat, săgețile îl mută; dă întâi clic pe un loc gol ca să rotești vederea. Pe un ecran tactil merge cu un deget, fără să activezi {{ui:camera.touchRotate}}.

### Bara camerei

La marginea din stânga e o bară îngustă. De sus în jos:

- {{ui:camera.home}} aduce toată scena înapoi în cadru. Tasta este [[Home]]; o face și [[F]] când nu e nimic selectat.
- {{ui:camera.focusSelection}} face zoom pe selecție ([[F]] sau [[Shift]]+[[F]]).
- {{ui:camera.zoomIn}} și {{ui:camera.zoomOut}} fac zoom pas cu pas, la fel ca tastele [[+]] și [[−]].
- {{ui:camera.orthographic}} comută la o vedere plată, în care muchiile paralele rămân paralele. Pentru măsurat și pentru aliniat muchii e adesea mai comodă decât vederea în perspectivă. [[O]] comută înainte și înapoi, iar un al doilea clic revine.
- {{ui:camera.secondView}} deschide o a doua vedere a proiectului într-o fereastră separată, descrisă mai jos. Un al doilea clic o închide.
- {{ui:camera.hideWorkplane}} (ochiul deasupra unei grile) ascunde placa cu grila ei, ca să poți privi de jos partea de dedesubt a unui proiect. Se schimbă doar vederea: formele noi tot ajung pe planul de lucru. Un al doilea clic o afișează din nou.
- {{ui:camera.placeWorkplane}}, ruleta și echerul sunt unelte separate, descrise mai jos și în [Măsurare și note](chapter:measuring-and-notes).

Săgeata mică din capătul de sus al barei o ascunde dacă te încurcă. Același buton, tras, mută bara oriunde în editor, și într-o schiță; un dublu clic o pune la loc. Previzualizarea 3D a unei schițe cu revoluție se mută la fel, trăgând de titlul ei.

Un proiect se deschide așa cum l-ai lăsat: unghiul, zoomul și poziția vederii sunt păstrate împreună cu el în acest browser, așa că poți continua de unde te-ai oprit, chiar și după ce ai mers la pagina de start sau ai închis pagina. Un fișier salvat (.lyl) poartă vederea cu el, așa că se deschide în ea și în altă parte. Vederea nu face parte din istoricul de anulare.

Poți păstra și patru vederi proprii în fiecare proiect. [[Shift]]+[[7]], [[Shift]]+[[8]], [[Shift]]+[[9]] sau [[Shift]]+[[0]] salvează vederea exact cum este - unghiul, poziția, zoomul și dacă e plată sau în perspectivă - sub tasta respectivă, iar tasta singură ([[7]], [[8]], [[9]] sau [[0]]) o aduce înapoi. Un mesaj jos confirmă salvarea; dacă salvezi din nou sub aceeași tastă, vederea e înlocuită. La fel ca vederea de mai sus, vederile salvate rămân cu proiectul în acest browser și călătoresc într-un fișier salvat (.lyl), iar ele nu fac parte din istoricul de anulare.

### A doua vedere, într-o fereastră separată

{{ui:camera.secondView}} deschide o fereastră care arată același proiect printr-o cameră proprie, ca să-l poți vedea din două părți deodată - de exemplu din față, în timp ce lucrezi de sus. Orice modificare pe care o faci în editor apare acolo imediat; proiectul se modifică doar în fereastra principală, iar mânerele rămân tot acolo. În a doua fereastră, mouse-ul și cubul de vedere îi rotesc vederea la fel ca aici, la fel și tastele: de la [[1]] la [[6]], [[F]], [[Home]], [[O]], [[+]] și [[−]], tastele săgeți pentru rotire și [[Ctrl]] cu săgețile pentru glisare. Acolo, [[F]] face zoom pe ce e selectat în editor. Cele patru vederi salvate ale proiectului funcționează și acolo: [[7]], [[8]], [[9]] și [[0]] le aduc înapoi, iar [[Shift]] cu una dintre aceste taste salvează sub ea vederea acelei ferestre - pentru ambele ferestre. Bara ei proprie a camerei are {{ui:camera.home}}, {{ui:camera.focusSelection}}, {{ui:camera.zoomIn}}, {{ui:camera.zoomOut}}, {{ui:camera.orthographic}} și {{ui:camera.hideWorkplane}}, iar acestea acționează doar asupra acelei ferestre. Fereastra se deschide unde ai lăsat-o, la aceeași mărime, și se închide odată cu editorul. Pe telefoane și tablete, butonul nu apare.

## Privește înăuntru: vederea în secțiune

{{ui:camera.sectionView}}, ultimul buton din bară (unealta de tăiere), deschide vederea de-a lungul unui plan, ca să poți verifica pereții, cavitățile și piesele care intră una în alta. Nimic nu e tăiat de-adevăratelea: proiectul, fișierele lui și orice export rămân întregi. Acolo unde planul trece printr-un solid, tăietura e umplută cu culoarea corpului, puțin mai închisă, iar o gaură din interiorul lui rămâne goală, așa că poți deosebi plinul de gol; fața umplută apare la o clipă după ce planul se oprește. La {{ui:camera.sectionCutFace}} alegi cum arată tăietura: {{ui:camera.sectionCutFaceHatch}}, opțiunea inițială, o hașurează ca pe un desen, iar un corp aflat în interiorul altuia e hașurat în sens invers, ca să se deosebească; {{ui:camera.sectionCutFaceFill}} o umple simplu; {{ui:camera.sectionCutFaceOpen}} o lasă deschisă și privești în învelișul corpului. Alegerea e valabilă pentru toate proiectele.

- Alege axa pe care planul o traversează: X (lățime), Y (adâncime) sau Z (înălțime), ca în câmpurile de poziție. Planul pornește din mijlocul proiectului.
- {{ui:camera.sectionOrientation}} stabilește după ce se orientează aceste axe. {{ui:camera.sectionOrientationWorld}} ia axele proiectului. {{ui:camera.sectionOrientationWorkplane}} le ia pe ale planului de lucru: Z taie atunci paralel cu el, X și Y perpendicular pe el, iar poziția se măsoară de la originea lui. Cu planul de lucru pe o față înclinată, tai paralel cu acea față, iar tăietura se mută odată cu planul de lucru. {{ui:camera.sectionOrientationView}} întoarce planul cu fața spre ecran: îndepărtează ce se află în față, iar cursorul îl împinge mai adânc în proiect pe direcția privirii, de exemplu ca să ajungi la o piesă îngropată și să dai clic pe ea. După ce rotești vederea, dă din nou clic pe ea, iar tăietura urmează noua vedere.
- {{ui:camera.sectionCoarse}} mută planul de-a lungul întregului proiect, {{ui:camera.sectionFine}} îl mută puțin de o parte și de alta a locului unde se află, pentru zecimi de milimetru. Poți și să tastezi poziția.
- Butonul de lângă axe arată cealaltă parte a tăieturii, {{ui:camera.sectionReset}} pune planul înapoi în mijloc, iar {{ui:camera.sectionShowPlane}} ascunde planul albastru.
- Poți da clic și selecta ce scoate tăietura la vedere, inclusiv pereții interiori.
- {{ui:camera.sectionWorkplane}} pune planul de lucru pe tăietură. Acesta stă în planul secțiunii și privește în afara corpului care rămâne, ca fața pe care o lasă o tăietură. Dacă treci apoi la schiță, aceasta pornește exact acolo, iar conturul estompat arată tăietura, de-a lungul căreia poți desena și la care te poți alinia. Așa schițezi, de exemplu, un capac care se potrivește în cavitatea deschisă cu secțiunea. Butonul de lângă axe alege ce parte rămâne și, odată cu ea, încotro privește planul de lucru. Planul de lucru îl pui înapoi pe placa de bază ca de obicei.
- {{ui:camera.sectionSketch}} pornește o schiță nouă direct pe tăietură, cu contururile tăieturii deja în ea, ca linii: o gaură vine ca un cerc adevărat, un colț rotunjit ca un arc. Modifică-le, șterge ce nu-ți trebuie, desenează mai mult și termină: corpul crește din tăietură spre partea care e îndepărtată, așa că o piesă care trebuie să se potrivească cu alta, cum ar fi un capac, o inserție sau o garnitură, pornește chiar de la conturul acelei piese. Butonul de lângă axe alege acea parte. Ca la SVG, contează doar corpurile vizibile, iar găurile sunt deja scăzute.
- {{ui:camera.sectionMeasure}} măsoară direct pe tăietură: conturul apare cu albastru, iar două clicuri pe el dau distanța, plus componentele ei de-a lungul celor două axe ale planului. Ambele puncte se aliniază la contur, mai întâi la colțuri. Când al doilea clic cade oriunde pe peretele opus, se aliniază perpendicular pe primul punct - așa citești grosimea peretelui, golurile și jocul fără să țintești exact. Un al treilea clic pornește măsurarea următoare, [[Esc]] încheie măsurarea. Dacă muți planul, măsurarea se șterge. Pe un contur rotund, cum ar fi tăietura printr-un cilindru sau printr-o gaură, o cruciuliță mică marchează centrul, iar centrul se aliniază și el. Dă clic pe un punct de pe cerc, apoi du-te lângă punctul opus: al doilea clic cade exact peste centru, iar numărul arată Ø, diametrul. De la centru la un punct de pe cerc obții R, raza.
- {{ui:camera.sectionExportSvg}} salvează contururile din planul de tăiere ca SVG la scara 1:1, pentru laser, plotter, un șablon sau o garnitură. O tăietură pe X e văzută din dreapta, una pe Y din față, una pe Z de sus. Ca la export, intră doar corpurile vizibile, găurile sunt deja scăzute, iar corpurile de aceeași culoare sunt unite într-un singur contur. Fiecare culoare rămâne o cale separată, fără umplere, așa că software-ul laserului le ține separat, ca straturi.

Panoul stă agățat de butonul lui. Dacă acoperă ceva, trage-l de bara de titlu oriunde pe planul de lucru; data viitoare se deschide tot acolo. Dă dublu clic pe bara de titlu sau lasă-l lângă buton ca să-l pui la loc.

X-ul și [[Esc]] închid panoul; dacă e în curs o măsurare, [[Esc]] o încheie întâi pe ea. Tăietura rămâne până când o dezactivezi cu {{ui:camera.sectionActive}} sau te întorci la panoul de proiecte. Cât timp e activă, butonul ei rămâne evidențiat. Orice așezi pe partea îndepărtată apare doar după ce dezactivezi tăietura. O tabletă nu are [[Esc]], așa că acolo panoul are încă două butoane: {{ui:camera.sectionBack}} încheie măsurarea dacă e una în curs și altfel închide panoul, iar {{ui:camera.sectionConfirm}} închide panoul dintr-un pas. Pe un calculator, ele nu apar.

## Planul de lucru

Formele noi se aliniază cu planul de lucru. La început, acesta este placa de bază cu grila. Dar îl poți pune pe orice suprafață, ca să așezi ceva pe o latură sau pe o față înclinată.

1. Apasă [[W]] sau dă clic pe {{ui:camera.placeWorkplane}}.
2. Mișcă mouse-ul peste o față a unui corp. Aceasta se luminează.
3. Un clic pune planul de lucru acolo. Tot ce adaugi de acum stă pe acea față.

Dacă dai în schimb clic pe placa goală, planul de lucru stă culcat în locul unde ai dat clic, aliniat la grilă. Formele noi și o schiță terminată, inclusiv una cu revoluție, apar atunci acolo, nu în mijlocul plăcii. Cât timp planul de lucru stă astfel culcat pe placă, placa își arată doar conturul: două grile în același plan ar face un model care pâlpâie.

Altfel, pe o față, originea planului de lucru se aliniază la grilă. Dă clic aproape de un colț al feței și ea stă exact pe acel colț. Aproape de o muchie, stă pe muchie, iar grila se aliniază cu ea; așa alegi intenționat unghiul grilei. Fără colț sau muchie, grila de pe o față culcată merge paralel cu corpul, așa că pe o cutie rotită e rotită odată cu ea.

Un clic lângă placă sau [[Esc]] readuce planul de lucru pe placa de bază. Și mai rapid e {{ui:camera.resetWorkplane}}: butonul cu săgeata în jos stă în bara camerei sub ochi cât timp planul de lucru se află pe o față. [[Shift]]+[[W]] îl pune direct pe fața selectată în acel moment. [[Alt]]+[[W]] îl pune înapoi pe placa de bază oricând, indiferent dacă e ceva selectat sau nu. Dacă ții [[Shift]] în timp ce dai clic, planul e orientat invers.

Cât timp un plan de lucru stă pe o față, lângă {{ui:camera.placeWorkplane}} apare un ochi. El ascunde planul de lucru fără să-l anuleze, ca să vezi clar proiectul: formele noi tot ajung pe acea față, iar rotirea tot se face în jurul ei. Un clic pe ochi îl afișează din nou, la fel și setarea unui plan de lucru nou.

## Grila și alinierea

Grila arată mărimea plăcii. În dreapta jos se află **pasul de aliniere**: mutarea și scalarea se aliniază în pași de acea mărime, de exemplu 1 mm. Fă-l mai mic pentru lucru fin și mai mare pentru aranjat în linii mari. {{ui:editor.tool.snapToGrid}} din panglică mută ulterior formele selectate pe cea mai apropiată intersecție a grilei. În timpul mutării, formele se aliniază și la alte forme, vezi [Selectare și aranjare](chapter:select-and-arrange). Fără mouse: de la [[Alt]]+[[1]] la [[Alt]]+[[0]] alegi intrarea respectivă din meniu ([[Alt]]+[[1]] dezactivează alinierea), iar [[,]] și [[.]] fac pasul cu o treaptă mai fin sau mai mare. Merge și într-o schiță.

> **Sfat:** Nu mai roti vederea când potrivești exact piesele una cu alta. Folosește tastele numerice ca să treci la vederea dreaptă de sus sau din față și apasă [[O]] pentru afișarea plată. Vezi atunci imediat dacă două muchii sunt cu adevărat la același nivel.

### Fereastra de setări

Rotița dințată de pe rândul titlului ({{ui:editor.workspaceSettings}}) deschide setările. În stânga sunt cinci zone: {{ui:workspace.appearance}}, {{ui:workspace.measurement}}, {{ui:workspace.workplane}}, {{ui:workspace.shapeDefaults}} și {{ui:workspace.history}}. O modificare se aplică imediat. {{ui:workspace.makeDefault}}, jos, salvează setările curente ca implicite, ca un proiect nou să pornească cu ele. Un fișier pe care îl deschizi își aduce propriile setări; {{ui:workspace.useMyDefault}}, alături, aplică proiectului deschis culorile, grila și restul setărilor tale salvate, păstrându-i unitățile. Dacă setările tale implicite au o imprimantă, aceasta vine împreună cu mărimea plăcii ei; fără una, proiectul își păstrează placa și imprimanta. {{ui:workspace.close}}, în dreapta sus, închide fereastra. Partea aceasta trece prin setări una câte una.

### Aspect: temă, bara de unelte și cubul de vedere

{{ui:workspace.theme}} stabilește schema de culori a întregului program: {{ui:workspace.themeSystem}} urmează calculatorul tău, celelalte sunt {{ui:workspace.themeLight}}, {{ui:workspace.themeDark}} și {{ui:workspace.themeGraphite}}. O poți schimba și din dreapta sus a editorului.

{{ui:workspace.toolbarSize}} face mai mici sau mai mari butoanele panglicii de sus, meniul ei de forme, comenzile camerei din stânga și panoul de proprietăți din dreapta: {{ui:workspace.toolbarSizeSmall}}, {{ui:workspace.toolbarSizeMedium}} (cum a fost mereu) sau {{ui:workspace.toolbarSizeLarge}}. Mărimea mică lasă mai mult loc planului de lucru pe un laptop; cea mare e mai ușor de nimerit pe un ecran mare sau cu degetul. Cu butoane mari, grupurile panglicii trec pe un al doilea rând când fereastra e prea îngustă pentru ele. Mărimea e păstrată în acest browser și e valabilă pentru toate proiectele.

{{ui:workspace.shapeColors}} pune pe imaginile din biblioteca de forme culoarea cu care pornește o formă nouă (culoarea tipului ei sau cea salvată de tine cu {{ui:inspector.saveDefaults}}). Dezactiveaz-o dacă preferi imagini gri; browserul ține minte alegerea.

{{ui:workspace.viewCubePosition}} mută cubul de vedere în alt colț al planului de lucru: {{ui:workspace.viewCubePositionTopLeft}} (cum a fost mereu), {{ui:workspace.viewCubePositionTopRight}}, {{ui:workspace.viewCubePositionBottomLeft}} sau {{ui:workspace.viewCubePositionBottomRight}}. În orice colț în afară de stânga sus, comenzile camerei urcă în locul lăsat liber de cub. În dreapta jos, cubul stă chiar deasupra controlului {{ui:inspector.snapGrid}}. Cât timp proprietățile unei forme sunt deschise în dreapta, un cub din dreapta se mută la stânga lor. Colțul e păstrat în acest browser și e valabil pentru toate proiectele. Într-o fereastră îngustă, cum e cea a unui telefon, setarea e ascunsă, iar cubul rămâne în stânga sus.

### Aspect: modul rapid

{{ui:workspace.fastMode}} e pentru calculatoarele mai lente. Dezactivează umbrele, liniile de contur de pe toate corpurile și inerția camerei și desenează vederea doar la rezoluția ecranului. Setările tale sunt păstrate pentru mai târziu, iar comutatoarele pe care le suprascrie arată {{ui:workspace.offInFastMode}} cât timp e activ. Mai multe despre ce ajută pe un calculator lent găsești mai jos, la „Când Magic3D merge greu".

### Aspect: culorile zonei de lucru și ale schiței

Culorile zonei de lucru se setează la {{ui:workspace.appearance}}: {{ui:workspace.backgroundColor}} și {{ui:workspace.surfaceColor}} pentru tema luminoasă (temele întunecate le păstrează pe ale lor), pe lângă culoarea grilei de la {{ui:workspace.workplane}}. Fiecare culoare e un buton care arată culoarea. Un clic deschide o fereastră mică, cu câmpul de culori, un rând de culori gata alese, un câmp pentru valoarea hex și o săgeată care readuce culoarea la cea cu care a pornit Magic3D. [[Enter]] preia o valoare hex tastată, la fel și un clic în afara ferestrei.

Vederea de schiță are culorile ei: {{ui:workspace.sketchBackground}} pentru fereastra din jurul foii, {{ui:workspace.sketchPlateColor}} pentru foaia de sub grilă și {{ui:workspace.sketchGridColor}}, toate pentru tema luminoasă. {{ui:workspace.sketchMatch}} preia dintr-un clic cele trei culori ale zonei de lucru.

{{ui:workspace.classicLook}} configurează zona de lucru cum o arată Tinkercad: fundal alb, o grilă milimetrică albastru-pal cu o linie mai închisă la fiecare centimetru, linii de contur negre, lumină de sus cu umbre moi. Fiecare valoare poate fi schimbată și separat după aceea. Toate pornesc cum a arătat Magic3D dintotdeauna, iar ce ți se potrivește depinde de monitorul tău.

![Setările de la Aspect: culorile fundalului și ale planului de lucru pentru tema luminoasă și comutatorul pentru liniile de contur de pe toate corpurile.](shot:settings-appearance)

![Editorul în schema de culori întunecată. Schema de culori o setezi în dreapta sus: Sistem, Luminoasă, Întunecată sau Grafit.](shot:editor-dark)

### Aspect: săgețile axelor și liniile de contur

{{ui:workspace.showAxes}} (activat implicit) desenează trei săgeți în colțul din stânga spate al plăcii: **X** cu roșu spre dreapta, **Y** cu verde spre spate și **Z** cu albastru în sus, așa cum numără câmpurile de poziție. Asta e regula mâinii drepte, pe care o folosesc și Tinkercad, programele CAD și slicerele. Cu planul de lucru pe o față, săgețile îl urmează. Dezactivează-le de aici dacă te încurcă.

{{ui:workspace.edgeLines}} desenează un contur pe fiecare corp, în culoarea de la {{ui:workspace.edgeColor}} (inițial negru, ca în Tinkercad): ajută când culorile închise se contopesc. E dezactivat implicit, iar mesh-urile (rețele de triunghiuri) importate foarte mari sunt lăsate deoparte.

![Trei corpuri închise la culoare, cu liniile de contur activate: contururile le țin separate.](shot:edge-lines)

{{ui:workspace.strongHoles}} desenează găurile într-un gri mai închis, mai puțin transparent și cu o linie închisă în jur. Ajută când o gaură e greu de găsit printre corpuri transparente. Spre deosebire de liniile de contur, rămâne activ în modul rapid.

### Aspect: lumină și umbre

{{ui:workspace.showShadows}} activează și dezactivează umbrele proiectate. Două cursoare stabilesc cum sunt luminate corpurile. {{ui:workspace.shadowStrength}} spune cât de închise sunt umbrele proiectate, iar {{ui:workspace.shadeContrast}} mută lumina dinspre lumina ambientală uniformă spre lumina principală: spre „puternic", laturile umbrite devin mai închise și umbrele se văd mai mult, spre „moale", totul devine mai plat. La capătul de sus, contrastul devine foarte puternic, așa că laturile umbrite și umbrele devin cu adevărat întunecate. {{ui:workspace.shadowSoftness}} face marginile umbrelor moi în loc de clare. {{ui:workspace.lightAzimuth}} rotește lumina principală în jurul plăcii (0° din față, 90° din dreapta), iar {{ui:workspace.lightElevation}} o ridică; la 90° stă drept deasupra plăcii, ca în Tinkercad, iar umbrele cad chiar sub corpuri. {{ui:workspace.softLighting}} aduce cea mai mare parte a luminii dinspre locul din care privești, rotind-o odată cu vederea: nicio față nu rămâne întunecată, iar o față de culoare închisă orientată în sus nu mai e arsă până la alb. Lumina principală rămâne puțin, pentru umbre, iar cursorul de contrast funcționează în continuare. Dacă tot apare o reflexie puternică cu lumina pusă jos, ridică {{ui:workspace.lightElevation}} la 90°: atunci arată ca în Tinkercad. {{ui:workspace.lightReset}} readuce totul la valorile inițiale.

### Aspect: cote pe planul de lucru

{{ui:workspace.showMoveDimensions}} arată cu cât te miști în timp ce tragi, {{ui:workspace.showOriginDimensions}} distanțele selecției față de originea plăcii, și când sunt selectate mai multe corpuri. Cu {{ui:workspace.dimensionsAlwaysVisible}}, aceste cote rămân vizibile permanent, nu doar cât timp tragi. Cât timp e selectat un corp rotit, unghiurile lui apar sub el pe planul de lucru; {{ui:workspace.showRotationAngles}} dezactivează asta. Mai multe în [Măsurare și note](chapter:measuring-and-notes).

### Aspect: selectarea și mutarea

{{ui:workspace.selectBeforeMoving}}: un corp trebuie atunci selectat întâi și abia următoarea tragere îl mută. Ajută când copiii sau mâinile grăbite ating corpurile, precum și pe un ecran tactil.

{{ui:workspace.frameByDirection}}: un cadru tras spre dreapta selectează doar ce se află complet în interiorul lui, unul tras spre stânga tot ce atinge (desenat punctat), ca în SketchUp.

{{ui:workspace.doubleClickOpensSketch}} hotărăște dacă un dublu clic pe o schiță extrudată redeschide schița, ca în Tinkercad, iar {{ui:workspace.doubleClickOpensGroup}} dacă un dublu clic pe un grup sau pe un pachet îl deschide pentru editare. {{ui:workspace.doubleClickCentersView}} hotărăște dacă un dublu clic pe planul de lucru gol mută vederea în acel loc.

{{ui:workspace.objectSnap}} face ca muchiile și centrul unei forme să se alinieze la alte forme în timp ce o tragi; meniul grilei din dreapta jos are același comutator. {{ui:workspace.cruise}} face ca o formă nouă să stea agățată de cursorul mouse-ului și să aterizeze pe fața de sub el, ca Cruise din Tinkercad; dezactivat, o formă nouă apare în mijlocul plăcii. Mai multe în [Selectare și aranjare](chapter:select-and-arrange).

### Aspect: vederea

{{ui:workspace.startInPerspective}}: editorul se deschide atunci în vederea în perspectivă, nu în cea plată.

{{ui:workspace.startView}} stabilește unghiul în care se deschide un proiect nou și la care revine {{ui:camera.home}}. Rotește vederea și fă zoom cum îți place, apoi dă clic pe {{ui:workspace.startViewUseCurrent}}; {{ui:workspace.startViewStandard}} readuce vederea obișnuită, din dreapta față. E valabil pentru toate proiectele din acest browser. Un proiect pe care îl redeschizi se deschide tot așa cum l-ai lăsat.

{{ui:workspace.zoomSpeed}} e un cursor de la lent la rapid: cât de repede fac zoom rotița și trackpadul; butoanele și tastele de zoom își păstrează pașii lor mici. {{ui:workspace.cameraInertia}}: după ce eliberezi mouse-ul, vederea se mai rotește o clipă și încetinește lin. Dezactivată, se oprește imediat, ca în Tinkercad și Fusion 360.

{{ui:workspace.overhangAngle}} e unghiul de la care o față contează ca surplombă când activezi Afișează surplombele din meniul de vizibilitate: acele fețe sunt hașurate cu roșu și alb. 30° e prudent, 70° se bazează pe o răcire bună a printului; 45° e punctul de plecare obișnuit.

{{ui:workspace.booleanTriangleLimit}} limitează câte triunghiuri poate avea un mesh importat când îl tai, îl unești sau îl intersectezi, pentru că asta se calculează în browserul tău. Un mesh peste limită nu e procesat; simplifică întâi mesh-ul sau ridică limita dacă îți permite calculatorul. O limită mai mare poate bloca editorul pentru câteva secunde.

### Măsurare: unități, scară și pași de aliniere

La {{ui:workspace.measurement}} setezi {{ui:workspace.units}}, unitatea în care sunt afișate cotele ({{ui:workspace.scale}}: milimetri, centimetri sau metri în sistemul metric, inchi sau picioare în cel imperial), câte zecimale arată un număr ({{ui:workspace.accuracy}}), {{ui:workspace.snapGrid}} la care se aliniază mutarea și redimensionarea și pașii tăi de aliniere proprii, la {{ui:workspace.customSnapGrids}}.

La {{ui:workspace.measurement}} în setări stabilești {{ui:workspace.units}}. Cu {{ui:units.imperial}}, Magic3D arată toate cotele în inchi: pe formă, în panoul de proprietăți, pe ruletă și pe riglă. Grila de aliniere oferă atunci pași de la 1/64 la 1 inch, iar grila de pe placă e desenată în inchi (1/8 până la 1 inch, implicit 1/4 inch), cu o linie mai groasă la fiecare inch întreg. La {{ui:workspace.inchFormat}} alegi dacă inchii apar ca fracții, ca în Tinkercad (1 5/8, rotunjit la 1/64 inch), sau ca zecimale (1.625), cu atâtea zecimale câte sunt setate la {{ui:workspace.accuracy}}. Poți tasta în oricare formă, inclusiv „1 5/8". O cale rapidă între milimetri și inchi e comutatorul mic **mm | in** de lângă {{ui:inspector.snapGrid}}, în partea de jos a ferestrei de proprietăți: schimbă unitatea, grila plăcii și pasul de aliniere ca în setări, pentru acest proiect.

La {{ui:workspace.customSnapGrids}}, în același loc, adaugi pași de aliniere proprii: un nume și o mărime în milimetri, de exemplu „Pas pini 2,54 mm" pentru distanța dintre pinii cipurilor DIP, ai barelor de pini și găurile plăcilor de test, sau „MX Key Unit" cu 19,05 mm pentru distanța dintre tastele unei tastaturi. Meniul pasului de aliniere oferă atunci acea măsură întreagă, înjumătățită și în sferturi (1 ×, ½ × și ¼ ×), așa că formele pot fi mutate cu un pas, o jumătate de pas sau un sfert de pas. Dacă vrei doar măsura în sine, debifează {{ui:workspace.customSnapGridParts}} de lângă ea; meniul are atunci doar acel pas. Pașii proprii sunt păstrați cu proiectul și sunt incluși la {{ui:workspace.makeDefault}}.

### Planul de lucru: placa și imprimanta

{{ui:workspace.printer}} dimensionează planul de lucru după placa de printare a imprimantei tale și semnalează corpurile care trec dincolo de ea, vezi [Printare](chapter:printing). {{ui:workspace.showPlateLabels}} scrie pe placă numele proiectului, iar numele imprimantei și volumul de printare când e aleasă o imprimantă.

{{ui:workspace.size}} dă plăcii o mărime proprie, cu {{ui:workspace.width}} și {{ui:workspace.length}} în milimetri sau în unitatea aleasă. Grila trece mereu prin origine, așa că liniile mai groase stau pe axe oricât ar măsura placa.

### Planul de lucru: grila

{{ui:workspace.showGrid}} afișează sau ascunde grila de pe placă. {{ui:workspace.gridBlockSize}} stabilește distanța dintre liniile ei, iar {{ui:workspace.gridMajorEvery}} dacă linia mai închisă vine la fiecare 5 sau 10 pași ai grilei; {{ui:workspace.gridMajorColor}} dă acelei linii o culoare proprie, pe care o preiau și crucea din centru și marginea plăcii. {{ui:workspace.gridColor}} este culoarea liniilor obișnuite.

Fiecare linie a grilei se îngroașă când faci zoom înainte, ca în Tinkercad, și rămâne vizibilă când faci zoom înapoi. Dacă e prea mult pentru tine, dezactivează {{ui:workspace.gridLinesGrow}}, iar liniile rămân de un pixel la orice zoom, ca în schiță.

Dacă grila a dispărut, de exemplu pentru că o culoare a fost setată la fel ca a plăcii, {{ui:workspace.resetGrid}}, la finalul zonei {{ui:workspace.workplane}}, readuce la standard vizibilitatea, culorile, distanța dintre linii și grosimea lor, aici și în setările implicite salvate cu {{ui:workspace.makeDefault}}.

### Valori implicite ale formelor

La {{ui:workspace.shapeDefaults}} alegi o formă cu {{ui:workspace.shape}} și stabilești cum pornește când o adaugi: lățimea, lungimea și înălțimea ei. {{ui:workspace.useAppDefaults}} readuce forma la valorile cu care o pornește aplicația. Formele cu setări proprii le arată la {{ui:workspace.shapeDetails}}. Valorile se aplică formelor noi, nu celor aflate deja pe placă. {{ui:workspace.customLimit}} stabilește o limită proprie pentru cât de mare pot face acea formă mânerele și proprietățile; lăsat gol, rămân limitele obișnuite.

### Istoricul salvat

La {{ui:workspace.history}}, cursorul {{ui:workspace.savedHistory}} stabilește câte acțiuni încheiate rămân disponibile pentru Anulează după ce salvezi sau redeschizi un proiect. Valoarea implicită este de 100 de acțiuni într-un proiect. O limită mai mică șterge definitiv pașii de anulare mai vechi ai proiectului.

## Când Magic3D merge greu

Magic3D calculează și desenează totul în browserul tău. Pe un calculator mai vechi, cu o placă video slabă sau pe mai multe ecrane mari, vederea poate deveni greoaie. Iată ce ajută:

- **{{ui:workspace.fastMode}}**, la {{ui:workspace.appearance}}, dezactivează dintr-odată tot ce costă mult vederea: umbrele, liniile de contur de pe toate corpurile și inerția camerei. În plus, desenează vederea doar la rezoluția proprie a ecranului, ceea ce pe ecranele de rezoluție înaltă înseamnă de până la patru ori mai puțini pixeli. Setările tale sunt păstrate și se aplică din nou imediat ce îl dezactivezi.
- **Camera continuă să se rotească:** când eliberezi mouse-ul după rotire, vederea se mai rotește o clipă și încetinește lin. E intenționat, nu e o sacadare. Dacă ești obișnuit cu Tinkercad sau Fusion 360, dezactivează {{ui:workspace.cameraInertia}} la {{ui:workspace.appearance}}, iar vederea se oprește imediat.
- **Comutatoare individuale:** fără modul rapid, poți dezactiva și doar {{ui:workspace.showShadows}} sau {{ui:workspace.edgeLines}}.
- **Folosește placa video:** în Chrome deschide `chrome://gpu` (în Edge, `edge://gpu`). Lângă „WebGL" ar trebui să scrie „Hardware accelerated". Dacă scrie „Software only", accelerarea hardware e dezactivată în setările browserului. Pe Windows poți alege și „Performanță înaltă" pentru browser la Setări → Sistem → Afișaj → Grafică, ca să folosească placa video adevărată, nu pe cea mai slabă din procesor.
- **Simplifică mesh-urile importate mari:** un model cu multe sute de mii de triunghiuri încetinește orice vedere. Cum îl rărești afli în capitolul despre fișiere, la „Simplificarea unui mesh importat".
- **Închide alte file:** fiecare filă Magic3D deschisă și orice altă pagină 3D folosesc aceeași placă video.
