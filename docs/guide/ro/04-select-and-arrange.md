---
title: Selectare și aranjare
summary: Cum selectezi forme, cum le găsești în lista de obiecte, cum le aliniezi, oglindești, rotești, le așezi pe o față și le multiplici în modele.
---

## Selectarea

Un clic pe o formă o selectează. Cu [[Shift]] adaugi altele sau le scoți din nou. Cât timp ții [[Shift]] apăsat și sunt selectate două sau mai multe forme, un număr mic sub cursor le numără. Un clic în spațiul gol golește selecția, la fel și [[Esc]]. Trage un cadru pe planul de lucru gol ca să selectezi tot ce atinge acesta; cu [[Shift]] ținut apăsat, cadrul adaugă ce nu era selectat și scoate ce era. Dacă vrei să alegi o singură piesă dintr-un grup înghesuit, activează {{ui:workspace.frameByDirection}} în setări (zona {{ui:workspace.appearance}}): un cadru tras spre dreapta ia atunci doar ce se află complet în interiorul lui, unul tras spre stânga ia în continuare tot ce atinge, iar linia lui e punctată. Ține [[Alt]] apăsat în timp ce tragi ca să inversezi cadrul doar pentru acea tragere, de exemplu ca să iei corpuri întregi din partea din care direcția nu ți-ar permite. Iar [[Ctrl]]+[[A]] selectează toate corpurile vizibile. Când tragi un corp sau un mâner al cadrului, [[Esc]] anulează cât timp butonul mouse-ului e încă apăsat: totul revine cum era și nimic nu se adaugă în istoric.

O formă aflată în spatele alteia, cum ar fi o gaură în interiorul unui corp, o poți atinge fără să rotești vederea: dă clic dreapta pe acel loc și alege {{ui:contextMenu.selectOther}}. Meniul listează atunci fiecare formă de sub cursor, din față spre spate. Cea pe care stă cursorul e conturată în vedere, chiar și prin formele din fața ei; un clic o selectează, iar cu [[Shift]] o adaugă la selecție. Intrarea apare ori de câte ori sub cursor se află mai multe forme; pe o tabletă, o apăsare lungă deschide același meniu.

Ce îți stă în cale ascunzi ({{ui:editor.tool.hideSelected}}, [[Ctrl]]+[[H]]). Formele ascunse rămân în proiect, doar că nu se văd și nu intră în export; fereastra de export îți spune dinainte câte sunt. [[Ctrl]]+[[Shift]]+[[H]] le aduce înapoi pe toate. Ce trebuie să rămână pe loc blochezi cu lacătul din partea de sus a setărilor sau cu [[Ctrl]]+[[L]]. O formă blocată nu poate fi mutată, redimensionată, rotită, recolorată sau ștearsă: mânerele ei devin gri, lângă săgeata de deasupra apare un lacăt, iar uneltele care ar modifica-o sunt dezactivate. Când treci cu cursorul peste un mâner vezi în continuare dimensiunile, iar o tastă care ar modifica forma afișează „Obiect blocat". Cât timp în selecție se află o formă blocată, nici celelalte nu se schimbă. Ascunderea, redenumirea, copierea și duplicarea funcționează în continuare.

Un număr pe butonul grupului {{ui:editor.group.visibility}} arată câte forme sunt ascunse, iar un clic pe el le afișează din nou pe toate. Un proiect deschis cu forme ascunse îți spune asta o dată, cu un buton care le afișează.

## Lista de obiecte

Când ai multe piese, e ușor să pierzi șirul în vedere. Lista de obiecte ({{ui:editor.tool.showOutliner}} sau [[Ctrl]]+[[Shift]]+[[O]]) arată toate formele sub formă de listă. Rămâne deschisă sau închisă așa cum ai lăsat-o, pentru fiecare proiect, până o închizi; alegerea e păstrată în browser.

![Lista de obiecte: grupul „Group" cu două piese și o sferă lângă el. O pictogramă de dosar deschide grupul.](shot:object-list)

- Un clic pe o intrare selectează forma, inclusiv piesele dintr-un grup. Cu [[Shift]] ținut apăsat adaugi alte intrări sau le scoți din nou, exact ca în vedere. Săgețile deschid și închid grupurile.
- Eticheta arată dacă o piesă e {{ui:outliner.solid}} sau {{ui:outliner.hole}}.
- Lacătul și ochiul blochează și ascund piese individuale.
- {{ui:outliner.rename}} dă unei piese un nume propriu; creionul de lângă nume, din partea de sus a setărilor, face același lucru pentru forma selectată. Numele potrivite ajută enorm în proiectele mai mari.
- Butonul A–Z din bara de titlu ({{ui:outliner.sortByName}}) sortează alfabetic formele cărora le-ai dat nume, cu numerele socotite ca numere (Piesa 2 înaintea Piesei 10). Formele care au încă numele implicit rămân dedesubt, în ordinea în care le-ai adăugat, cea mai nouă ultima, iar piesele din grupuri sunt sortate la fel. Se schimbă doar lista, niciodată proiectul. Un al doilea clic arată din nou totul în ordinea adăugării, iar browserul ține minte alegerea.
- Câmpul de căutare găsește formele după nume și după tip, deci și „cilindru" sau „gaură". Caută și în interiorul grupurilor, oricât de adânc ar fi imbricate: un grup care conține o potrivire rămâne în listă și se deschide ca să arate piesele găsite și grupurile care duc la ele. Un grup găsit după propriul nume îți arată toate piesele când îl deschizi.
- Săgeata din extrema stângă a barei de titlu restrânge lista la bara de titlu și înapoi.

Lista stă andocată imediat la dreapta cubului de vedere. Trage-o de bara de titlu ca s-o pui oriunde pe planul de lucru; trece pe sub cubul de vedere și bara camerei. Las-o din nou lângă cubul de vedere sau dă dublu clic pe bara de titlu și se andochează la loc. Locul în care era și dacă era restrânsă sunt ținute minte în acest browser.

## Introducerea unei poziții

Cardul {{ui:inspector.position}} din panoul de proprietăți arată unde stă corpul selectat, iar poziția o poți scrie: {{ui:prop.positionX}} și {{ui:prop.positionY}} sunt mijlocul cutiei lui pe placă, cu aceleași semne ca distanțele afișate pe planul de lucru, iar {{ui:prop.positionZ}} e înălțimea feței lui de jos. Cu {{ui:inspector.positionFrom}} din partea de sus a cardului treci la {{ui:inspector.positionEdge}}: X și Y arată atunci marginile din stânga și din față ale corpului, așa că pui o margine exact pe o cotă. Setarea rămâne până treci înapoi la {{ui:inspector.positionCentre}}. X crește spre dreapta, Y spre spate și Z în sus, după regula mâinii drepte, ca în Tinkercad și în programele CAD; săgețile axelor de pe placă arată direcțiile. Valorile se dau în unitatea pe care ai setat-o, iar glisoarele ajung la fel de departe ca tragerea.

## Piese parcate lângă placă

Poți trage o formă dincolo de marginea plăcii și s-o lași acolo, cam la o lățime de placă dincolo de fiecare latură, ca s-o păstrezi pentru mai târziu. Tastele săgeți o mută oricât de departe vrei. O piesă parcată face în continuare parte din proiect și intră în export împreună cu restul. Ca s-o lași pe dinafară, ascunde-o sau exportă doar selecția. Dacă ai ales o imprimantă, Magic3D te avertizează la export când ceva stă în afara plăcii ei.

## Alinierea în timpul mutării

Când tragi o formă pe planul de lucru, ea se aliniază la alte forme: marginea ei din stânga, dreapta, față sau spate ori centrul ei ajunge exact pe o margine sau pe centrul altei forme. O linie de ghidare roz arată de ce se ține. Așa două piese stau lipite una lângă alta sau centrate una în spatele celeilalte fără să scrii numere. Funcționează și cu grila oprită.

Ține [[Shift]] apăsat în timp ce tragi ca să păstrezi mutarea pe o singură axă: forma urmează direcția, X sau Y, pe care ai tras mai mult și o lasă în pace pe cealaltă. Cel mai bine apeși [[Shift]] după ce ai început deja să tragi; pe o formă care nu e încă selectată, un clic cu [[Shift]] doar o adaugă la selecție.

Cu [[Alt]] ținut apăsat deja când începe tragerea, tragi o copie, ca în Tinkercad: forma rămâne unde e, iar copia ajunge unde dai drumul. Dacă apeși [[Alt]] abia pe drum, alinierea se oprește temporar; forma urmează atunci doar grila. Și o copie se aliniază doar după ce dai drumul la [[Alt]] pe drum. Ca să oprești alinierea de tot, folosește meniul grilei din dreapta jos ({{ui:inspector.objectSnap}}) sau setările. Deocamdată se aliniază doar mutarea pe planul de lucru normal, nu ridicarea și nici redimensionarea.

## Alinierea

Două sau mai multe forme selectate se aliniază cu {{ui:editor.tool.align}}: în jurul selecției apar puncte pentru stânga, centru și dreapta, față, centru și spate, sus, centru și jos. Un clic pe un punct mută toate formele acolo. Dacă dai mai întâi clic pe una dintre formele selectate, ea rămâne pe loc, iar celelalte se aliniază cu ea. O formă blocată din selecție este singură această formă fixă. Stânga, dreapta, față, spate, sus și jos se iau după cutia din jurul formei; centrul unui triunghi, al unui pentagon sau al unei stele e mijlocul lor propriu, așa că o gaură centrată pe una stă în mijlocul formei, nu al cutiei ei.

O formă rotită sub un unghi, să zicem 45°, are pentru aliniere cutia din jurul ei, nu propriile margini. Ca să aliniezi după margini, pune mai întâi un plan de lucru pe o față a acelei forme ({{ui:camera.placeWorkplane}}, apoi clic pe față): punctele stau atunci pe axele acelui plan, iar formele sunt măsurate și mutate de-a lungul lor, ca în Tinkercad. Resetează planul de lucru ca să aliniezi din nou după placă.

![Alinierea arată țintele posibile ca puncte în jurul selecției.](shot:align)

Tasta este [[L]]. [[Esc]] anulează.

### Potrivirea dimensiunilor

Ține [[Alt]] apăsat în timp ce aliniezi și punctele devin pătrate: un clic nu mai mută formele, ci le schimbă dimensiunea. Un punct de pe o latură întinde fiecare formă până la acea latură, cealaltă latură a ei rămânând pe loc, ca și cum i-ai fi tras mânerul acolo. Punctul din mijloc lasă fiecare formă pe locul ei și îi dă lățimea, lungimea sau înălțimea pe acea direcție. Așa înlocuiești, de exemplu, o cutie cu un cilindru de aceeași mărime sau o bucată stricată dintr-un mesh cu o formă curată. Treci peste un punct cu [[Alt]] ținut apăsat și vezi dinainte cât de mari devin formele.

Referința e forma pe care ai dat clic prima; doar celelalte se schimbă. Fără ea, punctele de pe laturi întind toate formele până la latura cea mai îndepărtată, iar punctul din mijloc le dă tuturor mărimea celei mai mari. Un cilindru rămâne rotund, deci crește și pe cealaltă direcție. O formă rotită sub un unghi rămâne cum e; formele rotite cu 90° funcționează.

## Oglindirea

{{ui:editor.tool.mirror}} ([[M]] sau clic dreapta pe selecție și alegi comanda) întoarce selecția față de un plan: {{ui:mirror.leftRight}}, {{ui:mirror.frontBack}} sau {{ui:mirror.topBottom}}. Dă clic pe săgeata axei potrivite. E util la piesele simetrice: construiești o jumătate, o copiezi și oglindești copia.

## Rotirea și stabilirea pivotului

Rotești cu săgețile curbe de pe formă, cu numerele din setări sau cu [[R]], în pași de 45°. Când tragi pe cercul de rotație, rotirea se aliniază la fiecare diviziune, adică la fiecare 22,5°; ține [[Shift]] pentru pași mai fini și apar diviziuni suplimentare la fiecare 11,25°. Trage în afara cercului ca să rotești liber în pași de 1° sau, cu [[Shift]], în pași de 45°. În mod normal selecția se rotește în jurul centrului ei. Uneori nu e bine așa, de exemplu când un tub înclinat trebuie rotit mai departe la capătul lui. Pentru asta există {{ui:editor.tool.rotationPivot}}: după aceea dai clic pe o față. O față plană dă centrul ei, de exemplu axa capătului unui tub. La un grup sau un pachet, fața continuă peste piesele care se ating, ca la un singur corp, iar pivotul ajunge în mijlocul întregii fețe după ce piesele sunt unite, cu excepția unui grup sau pachet care conține text ori a unui pachet care are o gaură printre piese. Selecția se rotește acum în jurul acelui punct. Un al doilea clic pe unealtă îl elimină din nou.

Unghiurile rămân la corp. În setările lui, {{ui:inspector.rotation}} le arată ca {{ui:prop.rotateX}}, {{ui:prop.rotateY}} și {{ui:prop.rotateZ}}, denumite ca la poziție: Y merge de-a curmezișul plăcii, Z e în sus. Scrie acolo un unghi și corpul se rotește la el - în jurul centrului sau în jurul propriului pivot, dacă are unul. Cât timp e selectat un corp rotit, unghiurile lui apar și sub el pe planul de lucru; {{ui:workspace.showRotationAngles}} din setări oprește asta.

![Un corp rotit în jurul a două axe: unghiurile lui stau dedesubt, iar cardul Rotație din setările lui le primește ca numere.](shot:rotation-card)

Cu **un singur corp** selectat, pivotul aparține acelui corp: selectează alte piese și revino, iar el e tot acolo. Se mută, se rotește și se scalează împreună cu corpul, e salvat în proiect și revine cu Anulează. Sub {{ui:inspector.position}}, pivotul are propriile X, Y și Z, pe care le poți scrie sau ajusta, iar {{ui:inspector.pivotRemove}} îl elimină. Poți trage cu mouse-ul și marcajul roșu al pivotului: alunecă pe suprafața corpurilor și se aliniază la colțuri, la mijloacele muchiilor și la muchii, așa că bolțul unei balamale ajunge exact pe un colț. Cu mai multe corpuri selectate, pivotul e doar pentru acea selecție, iar o selecție nouă îl elimină. Gruparea sau împachetarea lor îl păstrează: grupul preia pivotul ca fiind al lui, cu X, Y și Z sub {{ui:inspector.position}}. Ține Shift apăsat în timp ce tragi marcajul roșu și el se aliniază în schimb la centrul feței de sub cursor - axa unei fețe rotunde, mijlocul uneia plane sau vârful unui con -, văzând prin corpurile transparente.

## Așezarea pe o față

Vrei ca o piesă să stea pe cea mai bună latură pentru printare? Selecteaz-o, dă clic pe {{ui:editor.tool.layFlat}} și apoi pe fața care trebuie să ajungă jos. Cât timp miști cursorul peste piesă, fața de sub el se luminează, așa că vezi pe care urmează s-o alegi; rotește vederea ca să verifici celelalte laturi. Piesa se rotește astfel încât această față să stea pe planul de lucru.

Vrei ca două piese să se întâlnească față în față sau să fie aliniate la același nivel? Selectează piesa care trebuie să se miște, dă clic pe {{ui:editor.tool.mateFaces}}, apoi pe fața ei și după aceea pe fața celeilalte piese. În panou, {{ui:mate.mode.against}} pune fețele una în alta (spate în spate, atingându-se), {{ui:mate.mode.flush}} le așază în același plan, una lângă alta; {{ui:mate.gap}} lasă loc între ele, de exemplu pentru joc. {{ui:mate.apply}} mută piesa: o rotește pe drumul cel mai scurt până când fețele sunt paralele - deloc, dacă deja sunt - și apoi o glisează doar spre cealaltă față, așa că își păstrează locul lateral. Cealaltă piesă rămâne unde e, iar un singur Anulează retrage totul.

![Panoul Aliniază fețele: piesa care se mișcă e aleasă, urmează o față a celeilalte piese, apoi față în față sau la același nivel și un spațiu opțional.](shot:mate-faces)

**Găuri pe aceeași axă:** {{ui:mate.mode.concentric}} aliniază în schimb fețe rotunde: o gaură peste o gaură, un bolț într-o gaură, un șurub în gaura lui de trecere. Alege modul înainte să dai clic pe fețe. Apoi dă clic pe interiorul rotund al unei găuri (sau pe exteriorul unui bolț) de pe piesa care se mișcă și pe o față rotundă a celeilalte piese; toată fața rotundă se luminează când arăți spre ea. {{ui:mate.apply}} rotește piesa pe drumul cel mai scurt până când cele două axe sunt paralele și o glisează drept, de-a curmezișul, pe cealaltă axă. De-a lungul axei rămâne unde era, așa că un bolț își păstrează înălțimea; împinge-l înăuntru după aceea. Funcționează și pe mesh-uri importate, cât timp gaura e făcută din fațete în jurul unei axe.

**Un unghi exact între două fețe:** {{ui:editor.tool.mateFaces}} lasă fețele paralele; nu există o unealtă separată pentru un unghi între ele, dar așa ajungi acolo. Întâi adu fețele împreună cu {{ui:editor.tool.mateFaces}}, ca să fie paralele. Apoi pune pivotul pe muchia unde se întâlnesc ({{ui:editor.tool.rotationPivot}}, clic pe muchie sau pe un colț) și scrie unghiul, de exemplu 15 sau 30, în cardul {{ui:inspector.rotation}} al piesei. Ea se rotește în jurul acelui pivot. Axele cardului sunt axele plăcii, așa că metoda funcționează când muchia merge de-a lungul lui X, Y sau Z.

La fel de simple sunt {{ui:editor.tool.dropToWorkplane}} ([[D]]), care coboară selecția pe planul de lucru, și {{ui:editor.tool.centerOnWorkplane}}. Cu planul de lucru pe o față, aceasta centrează pe punctul pe care l-ai ales cu [[W]] și mută selecția doar de-a lungul acelei fețe, așa că ce stă pe ea rămâne pe ea.

[[C]] ridică selecția, ca Cruise din Tinkercad: urmează cursorul și se așază pe fața altui corp peste care te afli, inclusiv pe fețe înclinate. Un clic o lasă acolo, [[Esc]] o lasă unde era. Fața ei de jos stă atunci pe față, aliniată cu marginile feței, cum ar sta o formă nouă; își păstrează propria rotire în jurul axei verticale. Mai multe piese călătoresc împreună și își păstrează distanțele. Deasupra plăcii goale, [[C]] ridică din nou în picioare pe planul de lucru o piesă înclinată. Fără tastatură, meniul unei apăsări lungi are {{ui:contextMenu.carry}} pentru același lucru.

## Modele: rând și cerc

Pentru grile de găuri, cercuri de șuruburi și coroane de dinți există {{ui:editor.tool.array}}. Selectează formele care trebuie multiplicate și dă clic pe unealtă în panglică.

![Modelul în modul „Cerc": copiile apar mai întâi ca previzualizare.](shot:pattern-tool)

- **{{ui:array.mode.row}}:** Selecția se repetă la distanțe egale. Rândul avansează pe toate cele trei axe deodată, cu {{ui:array.spacingX}}, {{ui:array.spacingY}} și {{ui:array.spacingZ}}: una dintre ele dă un rând drept, două sau trei un rând diagonal sau o scară. O distanță negativă așază rândul în sens invers.
- **{{ui:array.fit}}:** Pentru găuri de-a lungul unei plăci, un suport de chei sau un cuier. Pune prima bucată pe corp sau în el, alege {{ui:array.fit.x}} sau {{ui:array.fit.y}} și setează {{ui:array.fitGap}}: originalul se mută atât de mult spre interior față de capătul mai apropiat (de la margine până la latura bucății), iar ultima copie păstrează același spațiu față de capătul îndepărtat. Distanța urmează atunci {{ui:array.count}}: cinci găuri sau nouă, ele umplu mereu placa uniform.
- **{{ui:array.mode.circle}}:** Selecția se distribuie în jurul unui centru. Câte copii sunt setezi la {{ui:array.count}}, iar {{ui:array.angle}} e 360° pentru un cerc complet. Alege dacă copiile se rotesc odată cu cercul. {{ui:array.rise}} ridică fiecare copie puțin mai mult decât pe cea dinainte (un șurub sau o spirală ascendentă), iar {{ui:array.radiusChange}} o mută mai departe de centru sau mai aproape de el (o spirală plată); împreună dau o spirală conică. O spirală se înfășoară cel mult o dată: un unghi peste 360° contează ca cerc complet, iar copiile sunt cel mult 100.

Sfat: pune mai întâi pivotul pe o față cu {{ui:editor.tool.rotationPivot}}; atunci centrul cercului stă exact acolo.

După aceea, bucățile păstrează centrul cercului ca pivot, și după ce sunt grupate. Acolo își are locul o altă piesă, de exemplu o bilă în mijlocul a trei picioare: mijlocul cutiei bucăților nu e centrul, pentru că trei picioare umplu o cutie mai lată într-o direcție decât în cealaltă. Dă clic dreapta pe bucăți și alege {{ui:contextMenu.markPivot}}, iar centrul piesei pe care o tragi se aliniază pe el.

![Modelul în modul „Cerc", cu o ridicare și o schimbare de rază la fiecare copie: copiile urcă și se lărgesc ca o spirală.](shot:pattern-spiral)

Copiile apar mai întâi ca previzualizare. Abia {{ui:array.apply}} le creează. Dacă copiile sunt găuri, grupează-le după aceea cu corpul în care trebuie să taie.

Cu {{ui:array.groupCopies}} bifat, {{ui:array.apply}} grupează originalul și toate copiile într-un singur obiect, în același pas, cum ar face {{ui:editor.tool.group}}: o coroană de 36 de bucăți e atunci o singură piesă pe care o poți muta, colora sau folosi ca să tai. Peste 5 bucăți căsuța se bifează singură; după ce o bifezi sau o debifezi tu, rămâne cum ai setat-o. {{ui:editor.tool.ungroup}} aduce bucățile înapoi. Dacă gruparea nu reușește, modelul vine totuși ca bucăți separate, iar mesajul spune de ce.

## Model de găuri pe o față

Pentru aerisiri, grile de difuzor, coșuri și carcase, {{ui:holePattern.title}} distribuie găuri uniform pe o față plană. Nu mai trebuie să faci o gaură, s-o repeți și s-o așezi pe perete. Selectează exact un corp și dă clic pe {{ui:holePattern.title}} în grupul {{ui:editor.group.modify}} al barei de unelte, lângă model. Poți și să dai clic dreapta pe corp sau s-o găsești cu [[Ctrl]]+[[K]].

1. Dă clic pe o față plană a corpului. Contează toată fața plană din jurul clicului, nu doar triunghiul de sub cursor. O față curbă nu merge: primești un indiciu și dai clic pe una plană. La un grup sau un pachet, o față continuă peste piesele care se ating, ca la un singur corp; la un pachet doar dacă printre ele nu e nicio gaură. Piesele se unesc la scurt timp după ce se deschide unealta; până atunci sub cursor se luminează doar fața unei singure piese, iar un clic așteaptă unirea. La un grup sau pachet care conține text se luminează doar fața unei singure piese, iar clicul unește piesele.
2. În fereastră, setezi cum arată și cum stau găurile:
   - **{{ui:holePattern.form}}:** {{ui:holePattern.form.round}}, {{ui:holePattern.form.square}}, {{ui:holePattern.form.rectangle}}, {{ui:holePattern.form.hexagon}} sau {{ui:holePattern.form.slot}}.
   - **Mărimea:** {{ui:holePattern.size.diameter}} unei găuri rotunde, {{ui:holePattern.size.side}} unei găuri pătrate, {{ui:holePattern.size.width}} și {{ui:holePattern.size.height}} pentru un dreptunghi și o fantă. Pentru hexagon, mărimea este {{ui:holePattern.size.corners}}.
   - **{{ui:holePattern.spacing}}:** distanța de la mijlocul unei găuri la următoarea. Dacă e mai mică decât permit găurile, Magic3D o mărește la cea mai mică valoare posibilă, ca între găuri să rămână un perete. La dreptunghiuri și fante se măsoară de-a lungul rândului, de la stânga la dreapta.
   - **{{ui:holePattern.rowSpacing}}:** doar pentru dreptunghiuri și fante: distanța de la un rând la următorul. Așa găurile înguste și înalte stau aproape una de alta, iar rândurile rămân depărtate. O gaură lată de 2 mm și înaltă de 14 mm are nevoie de 4 mm de-a lungul rândului și de 16 mm de la un rând la altul, cu un perete de 2 mm.
   - **{{ui:holePattern.wall}}:** aceeași distanță spusă altfel: peretele rămas între două găuri vecine, adică grosimea peretelui în print. Setează-l și distanța de la centru la centru se ajustează (la dreptunghiuri și fante și distanța dintre rânduri), și invers. La hexagoane, dreptunghiuri și fante, Magic3D măsoară distanța cea mai mică dintre marginile lor.
   - **{{ui:holePattern.arrangement}}:** {{ui:holePattern.arrangement.grid}} pune găurile pe rânduri și coloane. {{ui:holePattern.arrangement.staggered}} decalează fiecare al doilea rând cu o jumătate de distanță și apropie rândurile, așa că fiecare gaură are vecini la aceeași distanță - cu hexagoane rezultă un fagure.
   - **{{ui:holePattern.margin}}:** distanța liberă dintre găuri și marginea feței. Se fac doar găurile care se află în întregime în interiorul feței minus această margine; orice ar trece de ea e lăsat deoparte. Marginea se păstrează și în jurul deschiderilor din față.
   - **{{ui:holePattern.depth}}:** {{ui:holePattern.depth.through}} (implicit) taie prin tot peretele. Cu {{ui:holePattern.depth.custom}} dai adâncimea în milimetri, de exemplu pentru locașuri.
3. Găurile apar imediat ca previzualizare pe față și urmează fiecare valoare. Fereastra spune câte găuri încap. {{ui:holePattern.repick}} alege altă față, [[Esc]] închide unealta și, ca celelalte ferestre de unelte, se mută trăgând de bara de titlu.
4. Abia {{ui:holePattern.apply}} face găurile.

Găurile sunt găuri obișnuite, grupate cu corpul, exact ca după {{ui:editor.tool.group}}: nimic nu e unit definitiv. {{ui:editor.tool.ungroup}} desface din nou grupul și eliberează fiecare gaură, pe care o poți apoi muta, modifica sau șterge separat. Totul e un singur pas pentru {{ui:editor.tool.undo}}. Unealta nu face mai mult de 400 de găuri deodată; în acest caz fă găurile mai mari sau distanța mai mare.

## Împingerea unei fețe în afară sau înăuntru

Pentru un perete mai gros, o pernă în relief pe o față sau un locaș tăiat în ea, unealta {{ui:faceTool.title}} lucrează pe o singură față plană. Funcționează și pe un STL importat, unde nu există o schiță de modificat. Selectează exact un corp și dă clic pe {{ui:faceTool.title}} în grupul {{ui:editor.group.modify}} al barei de unelte, lângă modelul de găuri. Poți și să dai clic dreapta pe corp sau s-o găsești cu [[Ctrl]]+[[K]].

1. Dă clic pe o față plană a corpului. Ca la modelul de găuri, contează toată fața plană din jurul clicului; o față curbă nu merge. La un grup sau un pachet, fața continuă peste piesele care se ating, ca la modelul de găuri.
2. În fereastră:
   - **{{ui:faceTool.direction}}:** alege {{ui:faceTool.direction.out}} pentru material care stă pe față sau {{ui:faceTool.direction.in}} pentru un locaș tăiat în ea. Un locaș nu merge mai adânc decât corpul din spatele feței; la un corp golit poate totuși ajunge până în cavitate.
   - **{{ui:faceTool.inset}}:** cât de departe rămâne noul contur în interiorul marginii feței. În afară, 0 ia toată fața, ceea ce îngroașă un perete. Deschiderile din față cresc cu aceeași valoare.
   - **{{ui:faceTool.radius}}:** rotunjește fiecare colț al conturului, și pe cele interioare, așa că un vârf ascuțit se termină cu un arc. O crestătură mai îngustă decât dublul razei se închide, iar o porțiune a feței mai îngustă decât dublul sumei dintre retragere și rază e lăsată deoparte.
   - **{{ui:faceTool.depth}}:** cât de mult iese partea nouă din față sau cât de adânc merge locașul.
   - **{{ui:faceTool.separate}}:** cu comutatorul pornit, partea nouă (sau gaura unui locaș) e un corp separat, lângă corp, în loc să fie grupată cu el, așa că o poți redimensiona, muta sau folosi imediat ca să tai.
3. Rezultatul apare imediat ca previzualizare și urmează fiecare valoare. {{ui:faceTool.repick}} alege altă față, [[Esc]] închide unealta.
4. Abia {{ui:faceTool.apply}} îl face.

Ce adaugă unealta e un corp-schiță obișnuit, grupat cu corpul dacă {{ui:faceTool.separate}} nu e pornit (altfel {{ui:group.edit}} nu are ce deschide, iar piesa e liberă): nimic nu e unit definitiv. {{ui:group.edit}} deschide grupul, iar {{ui:inspector.editSketch}} pe partea nouă arată conturul pe care îl urmează. Pe fața de sus sau de jos a unui corp-schiță simplu - o singură zonă, negrupat, neoglindit, fără conicitate, nerăsucit și neînclinat, fără contur, inel de breloc, rotunjire sau teșitură - acesta e chiar conturul corpului, preluat la construcție, așa că liniile și arcele lui rămân exacte oriunde nucleul CAD le poate prelua, pentru uneltele de muchii și pentru exportul STEP. Dacă e redimensionată ulterior, partea își păstrează retragerea. Pe orice altă față și pe fiecare față a unui mesh importat, conturul urmează triunghiurile feței, iar o curbă e făcută din bucăți drepte scurte. Totul e un singur pas pentru {{ui:editor.tool.undo}}. Ca să schimbi mai târziu retragerea sau raza, anulează și rulează din nou unealta. Ca să rotunjești apoi muchia de sus, folosește {{ui:editor.tool.fillet}} cu {{ui:edge.topEdges}} pe grup, ca ultim pas: ca orice tratare de muchii pe un grup, unește grupul într-un singur corp.

## Modificarea mai multor piese deodată

Cu mai multe piese selectate, panoul de proprietăți din dreapta arată câte sunt și oferă ce se aplică tuturor împreună: {{ui:inspector.solid}} sau {{ui:inspector.hole}}, o singură culoare pentru toate (un clic pe {{ui:inspector.solid}} deschide culorile) și blocarea. La o selecție amestecată, un clic le face pe toate solide sau pe toate găuri. Dacă vreuna dintre piese e blocată, se poate folosi doar blocarea. Dimensiunile se schimbă cu mânerele, cu {{ui:scalePercent.title}} sau scriind un număr într-o etichetă de dimensiune. Cu mai multe piese, numărul e mărimea întregii selecții: fiecare piesă crește odată cu ea, și spațiile dintre ele, ca atunci când tragi de un mâner. Solid și gaură funcționează și cu clic dreapta sau cu tastele [[S]] și [[H]].

## Scalarea în procente

Ca să faci una sau mai multe piese mai mari sau mai mici în aceeași proporție, de exemplu toate piesele unui fișier de print cu 20 %, folosește {{ui:scalePercent.title}}. Selectează piesele, dă clic dreapta pe ele și alege {{ui:scalePercent.title}} sau caut-o cu [[Ctrl]]+[[K]].

La {{ui:scalePercent.percent}} scrii noua mărime ca procent din cea actuală: 120 % înseamnă cu o cincime mai mare, 50 % jumătate. Lățimea, adâncimea și înălțimea se schimbă la fel, așa că proporțiile rămân. Baza rămâne unde e, așa că nimic nu se scufundă în placă.

Cu mai multe piese alegi cum cresc:

- **{{ui:scalePercent.mode.together}}:** Piesele cresc în jurul centrului lor comun, iar spațiile dintre ele cresc odată cu ele. Ansamblul devine mai mare ca și cum ar fi o singură piesă.
- **{{ui:scalePercent.mode.each}}:** Fiecare piesă crește pe loc, iar spațiile dintre ele rămân aceleași.

Câmpul procentului are focusul când se deschide fereastra, așa că de la tastatură e [[Ctrl]]+[[K]], procentul, [[Enter]]; [[Esc]] închide fereastra. Abia {{ui:scalePercent.apply}} (sau [[Enter]] în câmp) modifică proiectul, iar un pas înapoi anulează modificarea. Cu o piesă blocată în selecție, fereastra nu se deschide.

## Anularea

{{ui:editor.tool.undo}} ([[Ctrl]]+[[Z]]) și {{ui:editor.tool.redo}} ([[Ctrl]]+[[Shift]]+[[Z]] sau [[Ctrl]]+[[Y]]) te plimbă prin istoric. Câți pași călătoresc odată cu proiectul salvat setezi în setări, la {{ui:workspace.history}}. Arată spre oricare dintre butoane și indiciul lui numește pasul pe care l-ar anula sau reface, cu valoarea acolo unde pasul are una, de exemplu „Muchii rotunjite la Box (5 mm)" sau „3 obiecte mutate (12 mm)"; mesajul de după pas spune același lucru. Ca să te întorci mai mulți pași deodată, folosește vizualizarea istoricului de mai jos.

## Privire înapoi: vizualizarea istoricului

{{ui:editor.tool.history}}, lângă anulează și refă, deschide o vizualizare a istoricului fără să schimbe nimic. Zona de lucru arată proiectul cum era, iar un glisor din partea de jos trece prin fiecare pas de anulare: complet la dreapta e starea actuală, fiecare pas spre stânga e cu o anulare mai devreme, iar stările pe care le-ai anulat stau la dreapta celei actuale. Tastele săgeți trec prin stări, [[Esc]] revine la starea actuală. Rotița mouse-ului peste glisor face același lucru, o stare pe fiecare treaptă, până la una mai veche; [[Page Up]] și [[Page Down]] sar câte zece stări, [[Home]] merge la cea mai veche stare și [[End]] înapoi la cea actuală. Între timp poți roti și mări vederea și poți da clic pe obiecte ca să le aduci înapoi (vezi mai jos), dar nimic nu poate fi mutat; proiectul în sine rămâne exact cum este. Dacă bara acoperă ceva, trage-o deoparte de bara de titlu; un dublu clic pe ea o aduce înapoi. Butonul de listă din bara de titlu arată fiecare pas după nume, într-o listă, cel mai nou sus: un clic pe un pas merge la acea stare, starea în care se află proiectul e marcată {{ui:historyView.listNow}}, iar pașii pe care i-ai anulat sunt gri. Lista rămâne deschisă data viitoare dacă o lași deschisă.

Două lucruri poți lua cu tine dintr-o stare mai veche. {{ui:historyView.createProject}} pune acea stare într-un proiect nou în panoul de proiecte, numit după acesta, cu ora acelei stări între paranteze - un proiect salvat înainte ca Magic3D să înregistreze orele afișează în schimb „copie" - și cu istoricul până în acel punct, așa că anularea funcționează în continuare acolo. {{ui:historyView.export}} deschide exportul obișnuit cu acea stare drept proiect, așa că o poți salva ca STL, 3MF, STEP, imagine sau fișier LYL, cu istoricul până la acea stare.

Poți aduce înapoi în proiect și obiecte individuale. Dă clic pe un obiect din starea afișată - [[Shift]]+clic adaugă altele sau scoate unul din nou, un clic în spațiul gol nu alege nimic - și alege {{ui:historyView.bringBack}}. Vizualizarea se închide, iar o copie a fiecărui obiect ajunge în proiectul actual exact cum era în acea stare și pe locul pe care îl avea acolo, selectată, lângă ce conține proiectul acum; nimic altceva nu se schimbă. E un singur pas, așa că anularea îl retrage. Folosește-o pentru o versiune a unei piese pe care ai modificat-o între timp sau pentru una pe care ai șters-o. Un grup revine întreg; notele și punctele de referință de pe un obiect rămân în urmă. Numele lui poartă ora acelei stări, de exemplu „Box (12:32)", așa că e ușor de deosebit de versiunea pe care o are proiectul acum. Ca să aduci înapoi o piesă din interiorul unui grup, selectează grupul și alege {{ui:historyView.openGroup}} sau apasă [[E]], ca în proiect: piesele lui sunt așezate acolo unde le-ar pune editarea grupului, gata de ales, iar bara spune în ce grup te afli. {{ui:historyView.backOut}} îl închide din nou. Asta e doar pentru privit - grupul, proiectul și istoricul rămân cum sunt.

{{ui:historyView.delete}} stă singur în stânga jos a barei. După o întrebare de confirmare, șterge definitiv toți pașii anteriori: proiectul păstrează starea pe care o are acum (nu pe cea afișată), Anulează nu mai are la ce să se întoarcă, iar un fișier salvat după aceea nu are istoric. Folosește-l ca să partajezi un proiect fără trecutul lui sau ca să începi pașii de anulare de la zero. Nu poate fi anulat; ca să partajezi un fișier fără să-ți atingi proiectul, alege în schimb {{ui:export.historyNone}} la export.
