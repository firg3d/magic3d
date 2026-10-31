---
title: Muchii teșite și rotunjite, corpuri golite
summary: Teșitură și rotunjire pe muchiile alese, pereți de grosime egală pentru cutii, căni și carcase.
---

## Teșirea și rotunjirea muchiilor

Muchiile ascuțite arată rar bine pe o piesă printată și nici nu sunt deosebit de rezistente. O **teșitură** taie muchia oblic, o **rotunjire** o rotunjește. Ambele acționează pe muchiile pe care dai clic.

1. Selectează corpul (sau grupul).
2. Dă clic pe {{ui:editor.tool.fillet}} sau {{ui:editor.tool.chamfer}} în panglică, apasă [[B]] pentru rotunjire sau [[Shift+B]] pentru teșitură, ori dă clic dreapta pe corp și alege comanda din meniu.
3. Muchiile corpului se luminează. Dă clic pe cele care trebuie tratate. Încă un clic scoate din nou o muchie. Cu [[Shift]] adaugi sau scoți o singură muchie.
4. Setează mărimea și confirmă cu {{ui:edge.apply}} sau [[Enter]]. După aceea fereastra rămâne deschisă pe noul corp, cu aceeași mărime, așa că următoarea rotunjire sau teșitură poate urma imediat; {{ui:edge.done}}, [[Esc]] sau crucea o închid. Cu [[Shift]] sau [[Ctrl]], un clic pe {{ui:edge.topEdges}}, {{ui:edge.bottomEdges}}, {{ui:edge.verticalEdges}} sau {{ui:edge.horizontalEdges}} adaugă acele muchii la cele alese, în loc să le înlocuiască.

![Unealta „Rotunjește muchiile": toate muchiile ascuțite sunt selectate, imaginea arată previzualizarea cu o rază de 4 mm.](shot:fillet-preview)

Panoul stă în dreapta sus. Dacă acoperă muchii pe care vrei să dai clic, trage-l deoparte de bara de titlu; data viitoare se deschide tot acolo, la fel ca {{ui:editor.tool.hollow}} și {{ui:editor.tool.array}}. Dă dublu clic pe bara de titlu ca să-l pui la loc.

Dacă alegi o formă din lista de forme cât timp panoul e deschis, acesta se închide fără să aplice nimic, iar muchiile pe care ai dat clic sunt uitate. Clicul plasează atunci noua formă, în loc să aleagă muchii.

În panou găsești:

- {{ui:edge.allSharpEdges}} selectează toate muchiile deodată, {{ui:edge.clear}} golește selecția.
- **{{ui:edge.radius}}** pentru rotunjire. Pentru teșitură setezi {{ui:edge.distance}} sau {{ui:edge.angle}}.
- {{ui:edge.variableRadius}} (doar la rotunjire) lasă raza să se schimbe de-a lungul unei muchii: mică la un capăt, mai mare la celălalt, uniform între ele, ca acolo unde un perete drept întâlnește unul înclinat. Dă clic pe o singură muchie, apoi setează {{ui:edge.radiusStart}} și {{ui:edge.radiusEnd}}. Care capăt contează ca început rezultă din felul în care a fost construită muchia; dacă raza mai mare iese la capătul greșit, {{ui:edge.swapEnds}} o inversează. Funcționează pe câte o muchie, așa că rotunjește mai multe muchii una după alta. {{ui:edge.editAction}} aduce înapoi ambele valori.
- {{ui:edge.sharpThreshold}} decide ce muchii contează ca ascuțite. O valoare de 25° tratează ca muchii doar frângerile clare și lasă în pace trecerile line.
- {{ui:edge.verticalEdges}} alege muchiile care stau drept în sus, cum sunt colțurile unei cutii: o singură rotunjire rotunjește atunci toate colțurile verticale deodată.
- {{ui:edge.topEdges}} alege doar muchiile de-a lungul părții celei mai de sus a corpului. E calea rapidă pentru o formă de tăiat fursecuri: construiește conturul într-o schiță ca linie de contur, apoi teșește muchiile de sus. {{ui:edge.angle}} setează cât de abruptă e teșitura; ea nu poate ajunge mai departe decât grosimea peretelui.
- {{ui:edge.bottomEdges}} alege doar muchiile de-a lungul părții celei mai de jos a corpului, oglinda lui {{ui:edge.topEdges}}. E calea rapidă să rotunjești sau să teșești doar baza unei piese.
- {{ui:edge.chamfillet}}, ales în partea de sus a ferestrei de teșire, lângă {{ui:editor.tool.chamfer}}, face baza printabilă a unei piese: o teșitură la placă ce trece tangențial într-o rotunjire spre perete, așa că primele straturi nu au nevoie de suport, iar muchia se termină totuși moale. {{ui:edge.distance}} e înălțimea pe care o ocupă baza, {{ui:edge.angle}} (între 15° și 75°) abruptețea teșiturii la placă. Alege muchiile cu {{ui:edge.bottomEdges}}.
- {{ui:edge.onlyVisibleEdges}} ascunde muchiile care se află în spatele corpului, din unghiul din care privești. Implicit, fiecare muchie se vede prin corp, ceea ce devine derutant la o piesă încărcată; cu comutatorul pornit vezi, și poți da clic, doar pe muchiile orientate spre tine. Rotește vederea ca să ajungi la celelalte. O muchie desenată cu roșu (vezi mai jos) se vede întotdeauna.
- {{ui:edge.tangentChains}}: un clic alege atunci și muchiile care trec lin una în alta, de exemplu toate muchiile din jurul unei fețe cu colțuri rotunjite. Comutatorul decide doar ce alege un clic: nucleul CAD continuă oricum o teșitură sau o rotunjire de-a lungul unor astfel de muchii care continuă lin. Panoul îți spune pe câte muchii în plus se întâmplă asta.
- {{ui:edge.keepSize}} păstrează teșitura sau rotunjirea la mărimea pe care o are, chiar dacă scalezi corpul mai târziu.
- {{ui:edge.previewQuality}} ({{ui:edge.draft}}, {{ui:edge.standard}} sau {{ui:edge.fine}}) decide cât de fin e calculată previzualizarea. Pentru piese dificile, {{ui:edge.draft}} e mai rapid.

În timp ce ajustezi mărimea, Magic3D recalculează previzualizarea. Poate dura un moment. Poți continua să ajustezi; se calculează ultima valoare aleasă.

Dacă mărimea e prea mare pentru muchie, Magic3D îți spune și propune o valoare mai mică. Adesea ajung unul sau doi milimetri mai puțin. La unghiuri ascuțite, o rotunjire are nevoie de mai mult loc decât sugerează raza ei. Pe un ecran mic, panoul derulează singur în jos, ca mesajul să fie la vedere.

Când o selecție care mergea eșuează după ce dai clic pe încă o muchie, acea muchie devine roșie și e desenată mai groasă: e cea care nu poate fi tratată împreună cu celelalte la această mărime. Dă din nou clic pe ea ca s-o scoți sau micșorează mărimea. Dacă dai clic pe alte muchii cât timp mesajul e afișat, prima rămâne roșie. Când nu există o selecție anterioară care a mers - chiar primul clic sau o mărime pe care tocmai ai crescut-o - devin roșii muchiile care eșuează chiar și singure, sau toate, dacă problema e doar combinația lor.

Și muchia de sub cursor e desenată mai groasă, așa că vezi pe care o va alege un clic.

O gaură acceptă și ea {{ui:editor.tool.chamfer}} și {{ui:editor.tool.fillet}}, la fel și {{ui:editor.tool.hollow}}, {{ui:editor.tool.offset}} și {{ui:editor.tool.deleteFace}}: rămâne gaură și taie cu noua ei formă. Rotunjirea celor patru muchii verticale ale unei găuri-cutie taie un locaș cu colțuri interioare rotunde, iar o gaură mărită cu {{ui:editor.tool.offset}} taie cu atât mai mult loc. Ca să tratezi muchia unde o gaură întâlnește piesa, tratează în schimb grupul terminat: acea muchie îi aparține lui.

### Retragerea unei tratări de muchie

Un corp tratat poate fi oricând tratat din nou. Selectează-l din nou și deschide unealta - Rotunjire, Teșitură sau Golire, fiecare arată lista: la {{ui:edge.featureHistory}} vezi ce are deja aplicat. {{ui:edge.revertAction}} retrage o singură tratare. Atenție: dacă deasupra stau tratări mai noi, pleacă și ele, iar panoul îți spune câte.

Lângă o teșitură, o rotunjire sau o golire există și {{ui:edge.editAction}}. Retrage tratarea la fel, dar redeschide imediat unealta cu aceleași muchii și valoarea veche. Schimbi valoarea și o aplici din nou: o rotunjire de 3 mm devine una de 5 mm fără să mai dai clic pe muchii. Dacă deasupra stau tratări mai noi, pleacă și ele și aici. Asta e valabil pentru tratările de muchii pe care le faci de acum înainte; cele mai vechi oferă doar retragerea, la fel ca piesele individuale ale unui grup.

La un grup, de exemplu un cilindru cu o gaură, muchia tratată aparține corpului terminat, nu uneia dintre piesele lui. Așa că grupul devine un singur corp. {{ui:editor.tool.ungroup}} funcționează în continuare pe el: retrage mai întâi tratările de muchii și apoi desface grupul, într-un singur pas pe care [[Ctrl]]+[[Z]] îl anulează. Retrage tratarea cum e descris mai sus și grupul revine cu toate piesele lui. Cel mai simplu e să tratezi muchiile la final. Asta e valabil și pentru filete: unealta de muchii ia un filet ca fiind corpul lui exact, așa că unui bloc cu o gaură filetată i se rotunjesc muchiile cu filetul la locul lui. Calcularea muchiilor unui filet durează mai mult decât la o formă simplă: câteva secunde pentru un M6 și cam o jumătate de minut pentru un filet de țeavă G1/2.

> **Bine de știut:** Magic3D lucrează cu geometrie CAD reală pentru rotunjiri și teșituri, nu doar cu un mesh (rețea de triunghiuri). De aceea o muchie rotunjită rămâne o muchie rotunjită și în exportul STEP.

O piesă importată ca STEP își păstrează și ea geometria CAD: teșiturile, rotunjirile și golirea funcționează pe corpul din fișier, oricât de fin ar fi desenată piesa pe ecran. STL, OBJ și 3MF aduc doar triunghiuri, iar o piesă desenată fin poate fi prea densă pentru unealta de muchii. Dacă o piesă e disponibilă și ca STEP, import-o pe aceea.

## Golirea corpurilor

Cutiile, cănile, carcasele și capacele au un lucru în comun: sunt goale pe dinăuntru, cu pereți de grosime egală. Exact asta face {{ui:editor.tool.hollow}}.

1. Selectează corpul și dă clic pe {{ui:editor.tool.hollow}} sau dă clic dreapta pe corp și alege comanda din meniu.
2. Setează {{ui:shell.wall}}.
3. La {{ui:shell.openings}}, pornește laturile care rămân deschise: {{ui:shell.side.top}}, {{ui:shell.side.bottom}}, {{ui:shell.side.front}}, {{ui:shell.side.back}}, {{ui:shell.side.left}} sau {{ui:shell.side.right}}, câte vrei - doar {{ui:shell.side.front}} face un locaș pentru un sertar, {{ui:shell.side.left}} și {{ui:shell.side.right}} un tunel. Fără nicio latură pornită, corpul rămâne închis de jur împrejur, cu o cavitate în mijloc. {{ui:shell.side.closed}} oprește toate laturile cu un clic. {{ui:shell.side.top}} e deja pornit când se deschide panoul; un clic pe el închide din nou partea de sus. Un corp închis de jur împrejur arată neschimbat din exterior: vederea în secțiune arată cavitatea.
4. Decide dacă {{ui:shell.edges}} trebuie să fie {{ui:shell.edges.round}} sau {{ui:shell.edges.sharp}}.
5. Dă clic pe {{ui:shell.apply}}.

![Panoul de golire cu grosimea peretelui, un comutator pentru fiecare latură care rămâne deschisă și muchiile interioare.](shot:hollow-panel)

Pereții cresc spre interior. Exteriorul rămâne cum e.

{{ui:shell.edges}} contează doar acolo unde pereții interiori se depărtează - la o treaptă a corpului sau în jurul unei deschideri. Colțurile cavității unei cutii simple sunt întotdeauna ascuțite, cu ambele setări. Pentru un interior rotunjit, rotunjește mai întâi muchiile exterioare ale corpului (vezi mai sus), apoi golește-l: interiorul urmează cu raza minus grosimea peretelui. Dacă interiorul rotunjit nu poate fi construit, ceea ce se poate întâmpla la un contur făcut din foarte multe bucăți drepte scurte, cum e un desen vectorizat, Magic3D construiește în schimb același corp golit cu colțuri interioare ascuțite.

![Rezultatul: o carcasă cu perete de 3 mm, deschisă sus.](shot:hollow-result)

![Aceeași cutie cu doar latura din față deschisă: un locaș pentru un sertar.](shot:hollow-sides)

Pentru fiecare latură deschisă, corpul are nevoie de o față plană chiar la marginea lui pe acea latură. De aceea sferele și formele libere nu pot fi golite așa. Dacă peretele e prea gros pentru corp, Magic3D îți spune și îți cere unul mai subțire. O cutie rotunjită ale cărei muchii de sus și de jos sunt și ele rotunjite e un astfel de caz: peretele ei trebuie să fie clar mai subțire decât acea rotunjire sau setează mai întâi rotunjirea la 0.

Un corp cu un locaș - un bloc cu o gaură care nu trece până la capăt, făcut grupând o cutie cu o gaură ridicată - poate fi și el golit, cu partea de sus deschisă: pereții din jurul locașului sunt goliți și ei, așa că între peretele exterior și locaș rămâne un inel de cavitate, deschis sus, iar sub fundul locașului stă o cavitate subțire.

**Corpurile care se termină într-un vârf,** cum sunt un con sau un triunghi rotit prin revoluție, nu au sus o față plană care să poată rămâne deschisă. Nici o cavitate complet închisă nu merge acolo, pentru că un vârf nu poate fi deplasat spre interior: chiar și cu un perete de 1 mm primești mesajul că pereții nu pot fi atât de groși. Desenează în schimb peretele în profil înainte de revoluție: duplică conturul, scalează copia uniform, pune-o în mijlocul conturului mare și taie-l pe cel mare cu ea, apoi aplică revoluția pe tot (capitolul Schițe, secțiunea Revoluție). Distanța dintre cele două contururi e grosimea peretelui.

Dacă redimensionezi mai târziu un corp golit, Magic3D îl golește din nou, imediat, la noua mărime. Peretele rămâne la fel de gros cum l-ai ales, inclusiv la corpurile rotunde. Un cilindru pe care îl tragi mai mult într-o direcție decât în cealaltă devine o elipsă. Rotunjirile și teșiturile pe care le-ai pus după golire se aplică din nou pe aceleași muchii.

> **Sfat:** Cu o duză de 0,4 mm, un perete de 1,2 până la 2 mm e un început bun: destul de subțire ca să economisească material, destul de gros pentru o piesă solidă.

## Un capac pentru un corp deschis

{{ui:editor.tool.lid}} face capacul pentru un corp deschis sus: o cutie pe care ai golit-o cu partea de sus deschisă, un ghiveci, o tavă. Selectează corpul și dă clic pe {{ui:editor.tool.lid}}. În fereastră alegi tipul:

- {{ui:lid.type.plug}}: o placă la fel de mare ca corpul, cu o buză dedesubt care intră în deschidere.
- {{ui:lid.type.cap}}: o placă mai lată decât corpul cu grosimea unui perete, cu o bordură dedesubt care trece peste exterior.
- {{ui:lid.type.both}}: o placă mai lată decât corpul cu grosimea unui perete, cu amândouă: o buză în deschidere și o bordură peste exterior. Peretele corpului stă într-un șanț între ele, ca la o cutie pentru mâncare.
- {{ui:lid.type.flat}}: doar placa, de pus deasupra sau de lipit.

Apoi setezi {{ui:lid.thickness}}, {{ui:lid.fit}} ({{ui:lid.gap}} dintre capac și corp: 0,1 mm strâns, 0,2 mm normal, 0,3 mm larg sau orice valoare până la 1 mm) și cât de jos ajunge buza sau bordura și cât de gros e peretele ei. Dă clic pe {{ui:lid.apply}}: capacul stă lângă corp, întors cu placa în jos, așa că se printează fără suport. Corpul rămâne cum e. Capacul urmează orice contur, rotund sau colțuros, pentru că e luat chiar din corp, imediat sub marginea lui. Un corp fără deschidere sus primește doar un capac plat; pe celelalte golește-le mai întâi cu partea de sus deschisă.

> **Sfat:** Cât de strâns stă un capac depinde de imprimantă. Printează mai întâi o cutie mică cu capacul ei; dacă e prea strâns, alege potrivirea următoare, mai largă.

## Decalarea corpurilor

Fiecare față a unui corp poate fi mutată cu aceeași distanță, în afară sau înăuntru. De asta are nevoie o îmbinare prin presare, un capac sau o îmbinare cu clic: un joc de 0,1 până la 0,3 mm de jur împrejur, în timp ce detaliile rămân unde sunt, ceea ce scalarea nu îți poate da.

1. Selectează un corp și dă clic pe {{ui:editor.tool.offset}} sau dă clic dreapta pe corp și alege comanda de acolo.
2. Alege {{ui:offset.grow}} sau {{ui:offset.shrink}} și setează {{ui:offset.distance}}.
3. {{ui:offset.edges}} decid colțurile exterioare: rotunjit păstrează suprafața decalată rotundă acolo, ascuțit lasă fețele să continue până se întâlnesc.
4. Bifează {{ui:offset.copy}} ca să păstrezi piesa cum e și să primești corpul mărit ca o copie care e deja gaură. Grupează acea gaură cu piesa pereche și ea taie exact jocul pe care l-ai ales.
5. Dă clic pe {{ui:offset.apply}}.

Bifează {{ui:offset.sideways}} când doar conturul trebuie să crească sau să scadă: laturile se mută cu distanța, iar fiecare față plană de sus și de jos rămâne la înălțimea ei. Un panou primește o bordură de jur împrejur, o bază devine mai lată, iar corpul nu devine mai înalt. La un corp în trepte, fiecare treaptă își păstrează propria înălțime. Un text decalat prin contururile lui își păstrează și el înălțimea în acest caz.

Fără bifă, este decalat corpul însuși. Devine un corp exact fix, ca după o teșitură: lista din partea de sus a panoului retrage decalarea, iar {{ui:edge.editAction}} redeschide unealta cu distanța veche. Pot fi decalate doar corpurile care sunt corpuri CAD exacte - cutii, cilindri și celelalte forme, grupuri din ele, piese STEP importate. Un corp care e doar un mesh, cum sunt multe importuri STL, adesea nu poate fi decalat. O distanță prea mare pentru corp, de exemplu o micșorare dincolo de peretele lui cel mai subțire, e refuzată.

Un text ale cărui litere nucleul nu le poate decala ca un corp - în unele fonturi un A, B, M, N, W sau 9 - e decalat în schimb prin contururile lui: primește umplerea {{ui:prop.textWider}} cu distanța (mai îngustă când se micșorează) și crește cu tot atât sus și jos. Rămâne un text pe care îl poți edita în continuare. Asta funcționează pentru un text cu litere pline și fără rotunjire; unul care are deja un mod de umplere e refuzat, ca înainte.

## Ștergerea fețelor

O rotunjire care încurcă, o gaură în locul greșit, un bosaj de care nu mai ai nevoie: {{ui:editor.tool.deleteFace}} le scoate din nou de pe corp, fără să construiască corpul din nou.

1. Selectează corpul și dă clic pe {{ui:editor.tool.deleteFace}} sau dă clic dreapta pe corp și alege comanda din meniu.
2. Dă clic pe fiecare față a ce trebuie să dispară: fețele unei muchii rotunjite, peretele unei găuri, latura și partea de sus a unui bosaj. O față aleasă se luminează; încă un clic o scoate din nou. Panoul numără fețele.
3. Dă clic pe {{ui:deleteFace.apply}} sau apasă [[Delete]]. [[Esc]] închide unealta fără să schimbe nimic.

Fețele din jurul celor șterse cresc până când golul se închide. O cutie cu muchiile de sus rotunjite își recapătă muchiile ascuțite, o gaură e umplută, un bosaj dispare. Corpul rămâne exact, așa că poate fi din nou rotunjit și teșit, iar exportul STEP își păstrează fețele adevărate. [[Ctrl]]+[[Z]] retrage ștergerea într-un singur pas. Ea apare și la {{ui:edge.featureHistory}}, alături de rotunjiri și teșituri, unde {{ui:edge.revertAction}} o retrage; pentru ea nu există {{ui:edge.editAction}}. La un grup, rezultatul e un singur corp, ca la o tratare de muchii.

Alege toate fețele a ce trebuie să dispară, și doar pe acelea. Dacă fețele din jur nu pot închide golul, Magic3D îți spune și nimic nu se schimbă: o latură principală a unei cutii, de exemplu, nu are niciun vecin care să-i poată lua locul. Dacă ștergi doar fundul unui locaș, el devine o gaură care trece de-a dreptul, pentru că pereții locașului continuă până pe partea cealaltă.

{{ui:editor.tool.deleteFace}} are nevoie de fețe exacte: funcționează pe piesele importate ca STEP și pe formele din Magic3D. Ce păstrează Magic3D ca mesh nu are astfel de fețe: un STL, OBJ sau 3MF importat, un corp tăiat, înfășurat sau simplificat ori o formă foarte detaliată, cum e un text lung. Importă o piesă ca STEP dacă poți. La o piesă importată detaliată, câteva fețe pot fi prea mult pentru nucleul CAD: după 45 de secunde ștergerea e oprită și nimic nu se schimbă. Un corp redimensionat după o tratare de muchii, cu păstrarea mărimii muchiei, nu are fețe exacte la noua mărime până când redimensionarea nu e retrasă.
