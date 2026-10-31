---
title: Solide și găuri
summary: Cum devin formele simple alezaje, canale și buzunare și cum modifici ulterior un grup.
---

Aceasta este cea mai importantă idee din Magic3D și se învață repede: **Fiecare formă este fie un solid, fie o gaură.** Un solid rămâne. O gaură este o unealtă care îndepărtează material.

## Solid sau gaură

Selectează o formă și dă clic pe {{ui:inspector.solid}} sau {{ui:inspector.hole}} în setările ei. Cu tastatura e mai repede: [[H]] face din selecție o gaură, [[S]] o face din nou solid. Ambele se găsesc și în meniul care se deschide cu clic dreapta pe corp. O gaură e afișată transparent, ca să vezi unde se află. [[T]] face un corp transparent, de exemplu ca să te uiți într-o carcasă; o a doua apăsare îl face din nou opac. Funcționează pe toată selecția: dacă vreun corp e deja transparent, toate devin opace, altfel toate devin transparente.

Cât timp nimic nu e grupat, cu o gaură nu se întâmplă nimic. Doar stă acolo și arată unde va dispărea ceva mai târziu.

![Cilindrul este o gaură. Iese prin partea de sus a cubului, ca să taie complet prin el.](shot:hole-before)

## Gruparea

Selectează solidele și gaura (sau găurile) și dă clic pe {{ui:editor.tool.group}} ([[Ctrl]]+[[G]]). Acum găurile îndepărtează materialul din solidele pe care le ating. Ce rămâne este o singură formă nouă.

![Rezultatul: un cub cu un alezaj.](shot:hole-after)

Așa obții:

- **Alezaje:** un cilindru ca gaură prin corp.
- **Canale:** o cutie alungită ca gaură la margine.
- **Buzunare:** o gaură care nu trece complet prin corp.
- **Filete într-o piesă:** o gaură filetată ca gaură, vezi [Filete și mecanică](chapter:threads-and-mechanics).

Dacă în grup sunt mai multe solide, ele se unesc. Două solide care se ating devin o singură piesă.

La mesh-uri (rețele de triunghiuri) mari, cum ar fi un STL importat cu sute de mii de triunghiuri, tăierea durează câteva secunde. Magic3D lucrează atunci în fundal și afișează „{{ui:status.computing}}"; între timp poți roti vederea și folosi interfața. Dacă modifici scena în acest timp, rezultatul e abandonat, iar Magic3D îți spune asta. La fel se întâmplă și cu {{ui:editor.tool.split}}.

Poți trata un grup ca pe o formă: îl muți, îl rotești, îl colorezi, îl grupezi din nou. {{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Shift]]+[[G]]) îl desface, iar piesele individuale revin.

### Transformarea unui grup în gaură

Un grup întreg poate fi și el solid sau gaură. Se aplică o regulă simplă:

- Dacă grupul e format doar din solide (sau doar din găuri), îl comuți ca întreg, iar piesele lui îl urmează.
- Dacă le conține pe amândouă, de exemplu un cub cu un alezaj, fiecare piesă își păstrează propria stare. Întregul grup devine atunci o unealtă, dar alezajul rămâne alezaj.

## Gruparea în pachet

Uneori piesele trebuie doar să rămână împreună, fără să devină una singură - de exemplu un logo alb pe o placă neagră, pentru un print multicolor. Pentru asta există {{ui:editor.tool.bundle}} ([[Ctrl]]+[[B]]), ca în Tinkercad. Un pachet se mută, se rotește și se redimensionează ca o formă, dar nimic nu se unește:

- Fiecare piesă își păstrează culoarea și rămâne solid sau gaură. Setările pachetului au aceleași carduri ca ale unui grup: {{ui:inspector.solid}} și {{ui:inspector.hole}} pentru tot pachetul (care păstrează culorile pieselor), {{ui:inspector.transparent}} ([[T]]) și {{ui:inspector.multicolor}} ([[Shift]]+[[M]]); cu Multicolor dezactivat, pachetul e afișat și exportat într-o singură culoare. {{ui:inspector.separateParts}} desface pachetul, cum face [[Ctrl]]+[[Shift]]+[[G]].
- Găurile nu taie nimic. Când grupezi pachetul cu alte piese, găurile lui taie acele piese, dar tot nu și solidele pachetului, ca în Tinkercad. Așa, de exemplu, un știft cu gaura lui alături poate fi folosit iar și iar ca pachet.
- La un export STL, 3MF sau OBJ, fiecare piesă e un corp separat; în 3MF și OBJ, cu culoarea ei.

{{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Shift]]+[[G]]) desface din nou un pachet, [[E]] îl deschide pentru editare ca pe un grup. Teșitura, rotunjirea și golirea nu funcționează pe un pachet, pentru că nu e un singur corp: grupează-l pentru asta sau lucrează pe piesele lui una câte una. Dacă o gaură din pachet trebuie să taie și solidele pachetului, desface pachetul și grupează-i piesele ([[Ctrl]]+[[G]]).

## Intersecția

{{ui:editor.tool.intersect}} păstrează doar ce au în comun două sau mai multe corpuri. Așază două forme suprapuse una peste alta, selectează-le pe amândouă și dă clic pe ea. Așa, dintr-un cilindru și o cutie obții o piesă cu o latură rotundă și una dreaptă. Un grup contează așa cum arată, cu tot cu găuri. Dacă e selectată și o gaură, rămâne ce au în comun toate solidele cu toate găurile. Dacă formele nu au nimic în comun, nu se schimbă nimic, iar un mesaj îți spune asta. Alături, {{ui:editor.tool.intersectPreview}} arată partea comună înainte s-o aplici: formele selectate devin transparente, iar ce au în comun e desenat cu verde. Selectează și mută fiecare formă separat, iar partea verde le urmează; {{ui:editor.tool.intersect}} o aplică, [[Esc]] închide previzualizarea.

{{ui:editor.tool.hull}} învelește formele selectate într-un singur corp convex, ca și cum ar fi împachetate în folie termocontractabilă: cel mai mic corp fără adâncituri care le cuprinde pe toate. O semisferă pe un cilindru devine o cupolă fără treaptă, patru cilindri în colțuri devin o cutie cu colțuri rotunde, două sfere o capsulă. Găurile din selecție sunt tăiate apoi din înveliș. Piesele rămân în el: {{ui:group.edit}} deschide învelișul ca pe un grup, iar dacă muți acolo o piesă și îl închizi, învelișul se reconstruiește. Învelișul este un mesh, așa că formele rotunde arată fațete, iar uneltele pentru muchii funcționează pe el ca pe orice mesh. Când sunt selectate doar găuri, învelișul e el însuși o gaură: două găuri cilindrice taie un canal.

{{ui:editor.tool.cookieCutter}} face o formă de tăiat fursecuri din selecție: un perete subțire în jurul conturului, înalt de 15 mm, și o bordură plată de 2 mm în jurul bazei lui, ca forma să stea pe bordură și degetul mare să aibă unde apăsa. Selectează un singur SVG importat sau un singur corp din schiță și se folosește conturul lui propriu. Un text culcat dă curbele proprii ale literelor. Orice altă formă, una construită, un mesh importat sau mai multe piese, dă conturul pe care stă: conturul pe care planul de lucru îl taie prin ea, așa că pune-o întâi pe planul de lucru. Piesele care se suprapun dau un singur contur în jurul tuturor, ca și cum ar fi grupate; piesele depărtate una de alta dau fiecare câte o formă, în același pachet. Conturul e oglindit stânga-dreapta: forma se printează stând pe bordură și se întoarce invers pentru tăiat, așa că un text sau un logo iese pe aluat în sensul corect. Partea de sus a peretelui se îngustează până la o muchie tăietoare lată de 0,4 mm. Găurile din contur, interiorul unui e sau al unui a, primesc pereți proprii, așa că sunt tăiate și ele din fursec. Ele sunt un corp separat în pachet, {{ui:cookieCutter.part.innerWalls}}: ca un text sau un model doar să se imprime în aluat, în loc să fie decupat, fă-i mai joși la Proprietăți. Cu un perete de 15 mm și un aluat gros de 5 mm, pereții interiori de 12 mm apasă 2 mm adâncime. Pereții interiori mai joși decât peretele exterior au partea de sus plată în loc de muchie tăietoare: ei doar apasă, iar o muchie ar lăsa vârfuri subțiri care se rup și șanțuri în care rămâne aluat. Dă-le o muchie la Proprietăți dacă vrei una. Două punți la bordură, pe partea pe care apasă mâna, prind fiecare perete interior de peretele din jurul lui, distribuite în jurul lui, late de 4 mm și înalte de 3 mm. Fiecare punte stă cu toată lățimea pe pereți, în mijlocul unei laturi care merge de-a lungul conturului, și niciodată peste altă bucată. Bucățile așezate una lângă alta, cum sunt literele unui nume, sunt legate și între ele, întâi cele mai apropiate, așa că punțile formează o rețea prin toate și chiar și o literă din mijlocul unui cuvânt e prinsă. Un clic pe unealtă deschide o fereastră mică: acolo alegi o {{ui:cookieCutter.support.plate}} în locul punților, care umple tot conturul pe partea pe care apeși, e mai stabilă și aderă mai bine la placa de printare, dar nu te mai lasă să împingi aluatul afară din spate. {{ui:cookieCutter.fillet}} pune mici pante de 45° acolo unde pereții stau pe bordură, pe punți sau pe placă, ca părțile subțiri, cum e punctul unui i, să nu se rupă; ele sunt un corp separat în pachet. Tot acolo stabilești cu cât sunt mai joși pereții interiori și dacă conturul e oglindit; valorile rămân pentru forma următoare. Înălțimea lor o schimbi la Proprietăți, ca pe a bordurii. Forma de fursecuri înlocuiește selecția ca un pachet de corpuri din schiță, iar {{ui:group.edit}} îl deschide. Peretele, pereții interiori și bordura sunt modurile de umplere ale schiței, o linie în afara siluetei: schimbă grosimea, înălțimea sau culoarea fiecăruia la Proprietăți, tot acolo și {{ui:prop.sketchCuttingEdge}} a peretelui (0 pentru partea de sus plată). Acolo unde o curbă strânsă nu lasă loc pentru o teșitură pe ambele părți, peretele e teșit doar pe exterior, până la aceeași muchie. Acolo unde un contur nu poate fi teșit deloc - un logo cu vârfuri ascuțite, un contur tăiat din triunghiurile unui corp - muchia e construită în schimb în trepte fine de 0,1 mm, pe care un strat de print de 0,2 mm nu le poate deosebi de pantă; un astfel de perete este un mesh de triunghiuri, nu un corp exact. Ca să păstrezi conturul așa cum e desenat, oglindește forma înapoi cu {{ui:editor.tool.mirror}}, {{ui:mirror.leftRight}}. Merge și o imagine PNG sau JPG: la import, e vectorizată într-un corp din schiță, iar forma de fursecuri îl urmează pe acesta.

{{ui:editor.tool.loftSketches}} unește două corpuri din schiță sau SVG-uri importate într-un singur corp: conturul celui de jos la bază, conturul celui de sus în vârf, cu pereți drepți între ele. Așa faci o pâlnie, o piesă de trecere de la pătrat la rotund sau un cadru care se îngustează spre vârf. Pune cele două corpuri unul deasupra celuilalt, unde le e locul, deplasate și rotite dacă vrei, selectează-le pe amândouă și dă clic pe unealtă. Loft-ul se întinde de la baza corpului de jos până la vârful celui de sus.

Fiecare dintre cele două are nevoie de exact un contur. Dacă unul are o gaură, de exemplu un inel, celălalt are nevoie de tot atâtea, iar găurile intră și ele în loft: două inele dau un perete gol pe dinăuntru. O schiță construită ca linie (o linie în exterior, în interior sau centrată, la Proprietăți) contează ca un astfel de inel. Un SVG importat vine umplut; ca să-l faci inel, dă-i o linie la Proprietăți. Ambele corpuri trebuie să stea culcate; unealta le refuză pe cele înclinate.

Loft-ul este un corp CAD exact; uneltele pentru muchii și exportul STEP îl tratează ca pe un singur corp. Cele două schițe rămân în el: {{ui:group.edit}} le deschide ca pe un grup, iar dacă muți sau modifici una acolo, ori îi editezi schița, și apoi închizi, loft-ul se reconstruiește. {{ui:editor.tool.ungroup}} eliberează din nou cele două schițe. Pentru două dreptunghiuri, cercuri sau poligoane există și forma Loft printre forme, ale cărei capete le stabilești prin numere.

## Decuparea unui corp din altul

Pentru piese care trebuie să se potrivească, un ax într-un guler, un șurub într-o carcasă, faci o piesă și o decupezi din cealaltă. Selectează cele două corpuri și dă clic pe {{ui:editor.tool.cutOut}} în zona {{ui:editor.group.combine}} sau dă clic dreapta și alege-o de acolo. Panoul numește piesa care rămâne și corpul care primește cavitatea; Magic3D ia ca piesă corpul mai mic, iar un clic pe {{ui:cutOut.swap}} le inversează. {{ui:cutOut.clearance}} face cavitatea mai mare decât piesa cu atât pe fiecare parte: 0 se potrivește exact, 0,2 mm e un joc obișnuit pentru o îmbinare printată. {{ui:cutOut.apply}} decupează o copie a piesei din celălalt corp și lasă piesa însăși acolo unde e. Rezultatul este un grup: {{ui:editor.tool.ungroup}} desface din nou decuparea. Un joc are nevoie ca piesa să fie un corp exact, la fel ca unealta {{ui:editor.tool.offset}}, pe care o folosește.

## Editarea unui grup

Dacă un alezaj a ieșit prea mic, nu trebuie să desfaci grupul și să-l construiești din nou. Selectează grupul și dă clic pe {{ui:group.edit}} în setările lui, pe pictograma de dosar din lista de obiecte, sau apasă [[E]]. Un dublu clic pe grup face același lucru, ca în Tinkercad, și pe un pachet; dacă nu vrei asta, dezactivează {{ui:workspace.doubleClickOpensGroup}} în setări. O piesă începe să se miște abia după ce cursorul a fost tras câțiva pixeli, așa că un clic sau un dublu clic tremurat nu o împinge. Piesele stau acum separat și le modifici cu orice unealtă: mărești o gaură, muți un corp, adaugi o gaură.

![Grupul în curs de editare: bara de jos conține Anulează și Gata, iar lista de obiecte arată piesele.](shot:open-group)

În partea de jos a imaginii apare o bară. {{ui:group.done}} reconstruiește grupul, cu numele, culoarea și starea lui de solid sau gaură. {{ui:common.cancel}} îl pune la loc neatins.

Dacă una dintre piese este ea însăși un grup, o poți edita la fel, și tot așa, cât de adânc merge proiectul tău. Bara arată unde te afli, de exemplu „Suport › Bosaj pentru șurub". {{ui:group.done}} și {{ui:common.cancel}} încheie mereu grupul cel mai din interior și te duc cu un nivel înapoi spre exterior. Cât timp ești în interiorul unui grup, pot fi editate doar grupurile dintre piesele lui; ca să editezi altul, termină întâi.

Spre deosebire de {{ui:editor.tool.ungroup}}, care desface definitiv un grup, editarea păstrează grupul: numele și setările lui rămân și te poți întoarce oricând cu {{ui:common.cancel}}.

O observație: rotunjirile și teșiturile puse pe **întregul** grup se pierd la reconstrucție. Bara te anunță despre asta.

## Secționarea

{{ui:editor.tool.split}} din zona {{ui:editor.group.modify}} taie selecția în două cu un plan - de exemplu o piesă prea mare pentru placa de printare sau una în interiorul căreia vrei să te uiți. Selectează unul sau mai multe solide sau găuri și dă clic pe ea. Un plan semitransparent arată exact pe unde va trece tăietura, iar o linie albă o marchează pe corpurile înseși, acolo unde planul le întâlnește; nimic nu se schimbă până nu aplici.

- {{ui:split.orientation}}: **X** face o tăietură verticală între stânga și dreapta, **Y** între față și spate, **Z** o tăietură orizontală între sus și jos. Axele sunt numite ca pe cardul Poziție, cu Z în sus. Planul pornește paralel cu planul de lucru, deci pe placa de bază cu Z.
- {{ui:split.workplane}}: {{ui:split.workplaneParallel}} așază planul paralel cu planul de lucru, {{ui:split.workplaneAcrossX}} și {{ui:split.workplaneAcrossY}} îl pun perpendicular pe el, transversal pe direcția X sau Y a acestuia. Acolo unde originea planului de lucru traversează selecția, planul trece prin ea, altfel prin mijloc. Așa pui planul de lucru pe o față înclinată cu [[W]] și tai chiar acolo, fără să rotești cursoarele.
- {{ui:split.position}}: locul pe unde trece planul, cu cursorul sau tastat. Pornește din mijloc. Poți și să tragi vârful săgeții de pe plan; planul se mută de-a lungul săgeții în pași de 0,1 mm.
- {{ui:split.pickFace}}, butonul de lângă poziție, așază planul pe o față: dă clic pe el, apoi pe față. Orientarea, ambele rotații și poziția sunt setate corespunzător. Cât timp alegi, un plan albastru sub cursor arată fața pe care o va lua. Merge și o față a unui corp care nu e selectat, ca să aliniezi tăietura cu ea, dar planul rămâne în limitele selecției. [[Esc]] oprește alegerea și lasă planul unde era.
- Cele două cursoare de rotație de dedesubt rotesc planul în jurul celorlalte două axe, până la 180° în fiecare sens, pentru o tăietură înclinată. Pot fi combinate.

{{ui:split.apply}} sau [[Enter]] face tăietura, [[Esc]] anulează (cât timp alegi o față, primul [[Esc]] doar oprește alegerea). Fiecare obiect pe care îl traversează planul devine două corpuri închise, numite după partea lor, de exemplu „Box (Z+)" și „Box (Z-)"; obiectele pe care nu le atinge rămân cum sunt. O gaură devine două găuri, iar un corp golit își păstrează cavitatea. Ambele jumătăți rămân unde erau - pentru printare, așază-le pe fiecare pe fața tăiată cu {{ui:editor.tool.layFlat}}.

Jumătățile sunt mesh-uri simple: setări precum numărul de laturi ale unui cilindru sau literele unui text dispar, așa că stabilește-le pe acestea întâi. [[Ctrl]]+[[Z]] readuce originalul dintr-un pas. Obiectele blocate și cele ascunse nu pot fi secționate.

Un mesh importat are nevoie de o suprafață închisă ca să poată fi secționat, grupat sau tăiat. Dacă are deschideri, cum ar fi ochii unei figurine lăsați deschiși sau o crăpătură într-o scanare, Magic3D le închide întâi cu un capac plat și îți spune câte a închis. Închide deschiderile mici și pe cele plate de orice mărime; o deschidere mare a cărei margine e curbată îți rămâne ție, iar mesajul îți spune asta. Închide-o în programul din care provine modelul sau cu o unealtă de reparat mesh-uri și importă-l din nou.

## Separarea pieselor

Dacă o formă e alcătuită din mai multe bucăți separate, cum ar fi un text format din litere individuale, {{ui:inspector.separateParts}} o împarte în forme independente. Opțiunea se găsește și în meniul care apare la clic dreapta pe formă.

> **Sfat:** Construiește găurile întotdeauna puțin mai lungi decât piesa prin care trebuie să treacă. Dacă gaura se termină exact la nivelul feței, uneori rămâne o pieliță subțire ca foaia. Un milimetru în plus te asigură.
