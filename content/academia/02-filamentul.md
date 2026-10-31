---
slug: academia/ce-filament-alegi
titlu: "Filamentul: ce alegi și pentru ce"
h1: "Ce filament alegi pentru printarea 3D și cum decizi corect"
titluSeo: "Ce filament alegi pentru print 3D — PLA, PETG, ABS, TPU | Academia 3D"
metaDescriere: "PLA sau PETG? Ce filament rezistă în mașină vara, ce se decolorează la soare, ce se vinde cel mai bine. Ghid practic de alegere a filamentului, după destinația obiectului."
cuvinteCheie:
  - ce filament pentru print 3d
  - pla sau petg
  - filament pentru exterior
  - petg vs pla diferente
  - filament rezistent la caldura
  - ce filament pentru brelocuri
capitol: 2
citire: 8
---

# Ce filament alegi pentru printarea 3D și cum decizi corect

Majoritatea ghidurilor despre filamente încep cu un tabel: temperatură de topire, rezistență la tracțiune, modul de elasticitate. Tabelul e corect și nu te ajută cu nimic, pentru că întrebarea pe care ți-o pui de fapt nu e „care are modulul mai mare", ci „obiectul ăsta se strică sau nu, acolo unde ajunge".

Așa că hai să inversăm ordinea. Nu pornim de la material, pornim de la destinație.

În atelierul nostru ținem stoc permanent din PLA, PETG, ASA, TPU, nylon și compozite cu fibră de carbon, pentru că fiecare rezolvă altceva. Mai jos e cum decidem care intră în ce comandă.

---

## Întrebarea care decide aproape totul: unde ajunge obiectul?

**Rămâne în casă, la temperatura camerei, ferit de soare?** PLA. Nu te complica. E cel mai ieftin, cel mai ușor de printat, are cele mai multe culori și cele mai bune detalii. Brelocuri, decorațiuni, litere pentru rafturi, jucării, cadouri, obiecte de birou — toate merg în PLA și nu ai nevoie de altceva.

**Stă în mașină?** Nu PLA. Aici e greșeala care se plătește cel mai des, și se plătește la primul client nemulțumit.

Merită o explicație, pentru că cifra surprinde pe toată lumea. PLA începe să se înmoaie în jur de 55–60 °C. Habitaclul unei mașini parcate la soare, vara, în România, ajunge frecvent la 60–70 °C, iar bordul, unde bate soarele direct, trece de 80. Un breloc de PLA lăsat pe bord se curbează. Un suport de telefon prins de grilaj se lasă și cade. Nu e o defecțiune de printare, e materialul greșit.

Pentru mașină: PETG, care rezistă până în jur de 80 °C, sau ASA, care rezistă și mai mult. PETG e alegerea rezonabilă în majoritatea cazurilor.

**Stă afară, în soare, luni de zile?** Aici problema nu mai e căldura, e ultravioletul. PLA devine casant și se decolorează. PETG rezistă rezonabil, dar culorile deschise se schimbă vizibil în timp. Dacă obiectul trebuie să arate bine peste doi ani — plăcuțe de casă, semne de grădină, numere de apartament — materialul corect e ASA. E făcut exact pentru asta, e varianta rezistentă la UV a lui ABS.

Două comenzi recente din atelier arată de ce contează. Prima: o clemă de închidere de portbagaj auto, care se rupsese și nu se mai fabrica. Am scanat fragmentele, am reconstruit geometria și am printat înlocuitorul din ASA — piesa stă afară, în soare și în ger, deci PLA sau PETG ar fi cedat într-un sezon. A doua: un set de butoane de bord pentru un Land Rover Defender, degradate în timp, reproduse tot din ASA negru. Aici nu e doar UV — e și temperatura din habitaclu, plus faptul că sunt atinse zilnic, deci trebuie să nu se lustruiască și să nu se deformeze. Ambele sunt cazuri în care alegerea materialului nu e o preferință, e diferența dintre o piesă care ține și una care se aruncă peste patru luni.

**Trebuie să se îndoaie fără să se rupă?** TPU. Flexibil, foarte rezistent la uzură, dar se printează încet și cere de obicei un extruder direct. Nu îl alege pentru că e „mai rezistent" în general — îl alegi doar când chiar ai nevoie de flexibilitate.

**Trebuie să suporte forță mecanică sau frecare?** PETG e mai tenace decât PLA: se îndoaie înainte să se rupă, în loc să crape brusc. PLA e de fapt mai rigid și mai rezistent la tracțiune pură, dar cedează fără avertisment. Pentru piese funcționale, cârlige, suporturi cu sarcină, PETG e alegerea mai sigură.

---

## Cele patru materiale, pe scurt

**PLA** e materialul cu care înveți și cu care rămâi pentru majoritatea produselor decorative. Se printează la 200–220 °C, cu patul la 55–60. Nu are nevoie de incintă și îi place răcirea bună. Reproduce detaliile mai bine decât orice altceva accesibil, iar variantele silk, mate sau cu sclipici sunt cele care se vând vizual. Slăbiciunea lui e una singură, dar e serioasă: nu suportă căldura.

**PETG** e materialul pentru obiecte care trebuie să reziste. 230–250 °C la duză, 70–85 la pat. Se lipește foarte bine de placă — atât de bine încât uneori e o problemă, pentru că poate smulge bucăți din suprafață; o soluție e o foaie de lipici stick ca strat de separare. Face stringing mai mult decât PLA și e mai sensibil la umiditate. Detaliile fine ies puțin mai moale decât la PLA. În schimb nu se topește în mașină și nu se rupe brusc.

**ABS și ASA** sunt materialele pentru condiții dure. Rezistă la temperaturi mari, ASA rezistă și la UV. Dar cer o incintă închisă, altfel fac warping garantat, emit vapori care nu trebuie inhalați, deci ai nevoie de ventilație, și sunt considerabil mai pretențioase la reglaj. Nu le alege dacă nu ai nevoie explicită de ele.

**TPU** e cauciucul printabil. Există în mai multe durități; cu cât e mai moale, cu atât e mai greu de printat. Se printează lent, adesea sub 30 mm/s, și absoarbe umiditate rapid. Merită doar când flexibilitatea e cerința.

---

## Umiditatea: problema pe care o subestimează toată lumea

Dacă ar fi să reții un singur lucru practic din capitolul ăsta, ăsta ar fi: **filamentul absoarbe apă din aer, iar apa strică printurile**.

La topire, umiditatea din filament se transformă în vapori. Rezultatul e o combinație de pocnituri fine în timpul printării, suprafețe rugoase, fire între piese, straturi care nu se leagă bine și piese vizibil mai fragile. Oamenii petrec zile reglând temperaturi și retracții, când problema e o rolă care a stat trei luni deschisă lângă fereastră.

Ordinea sensibilității, de la cel mai higroscopic: nylon, TPU, PETG, PLA. Chiar și PLA, care e cel mai tolerant, se degradează vizibil după câteva luni în aer liber, mai ales într-un apartament fără dezumidificare.

Soluția e banală și ieftină. Rolele se țin în pungi etanșe cu silicagel, nu pe raft. Rolele deschise se usucă periodic, în uscător de filament sau în cuptor la temperatură mică, câteva ore. Iar dacă printezi comercial, un uscător activ din care alimentezi direct e una dintre cele mai bune investiții de sub 500 de lei pe care le poți face.

---

## Ce contează când vinzi

Dacă printezi ca să vinzi, criteriile se schimbă puțin. Rezistența rămâne importantă, dar apar altele.

**Culoarea contează mai mult decât crezi.** Un breloc în PLA silk auriu se vinde mai bine decât același breloc în PLA mat gri, la același cost de material. Efectele vizuale — silk, mat, cu tranziții de culoare, fosforescent — sunt diferențiatorul cel mai ieftin pe care îl ai.

**Consecvența între role e o problemă reală.** Același producător, aceeași culoare, alt lot: nuanța poate diferi vizibil. Dacă ai o comandă de cincizeci de bucăți identice, cumperi tot materialul odată. Un client care primește douăzeci de piese într-o nuanță și treizeci în alta se plânge, și are dreptate.

**Filamentele ieftine costă mai mult.** O rolă cu diametru inconsecvent produce sub-extrudare intermitentă. O rolă cu impurități înfundă duza. O rolă înfășurată prost se încurcă și oprește printul la ora patru dimineața, după unsprezece ore de lucru. Diferența de preț dintre un filament mediocru și unul bun se recuperează la primul print eșuat.

**Materialele cu particule mănâncă duze.** Filamentele cu fibră de carbon, cu lemn, cu metal sau cu sclipici sunt abrazive și uzează duza de alamă rapid — uneori într-o singură rolă. Pentru ele ai nevoie de duză din oțel călit sau cu vârf de rubin. Dacă nu schimbi duza, vei crede că imprimanta s-a stricat.

---

## Cât material intră de fapt într-un obiect

O întrebare care apare imediat ce începi să calculezi prețuri: cât filament consumă o piesă?

Regula rapidă e că un obiect mic decorativ — un breloc, o literă, o plăcuță — consumă undeva între cinci și cincisprezece grame. O rolă standard de un kilogram înseamnă deci ordinul a o sută de bucăți, în funcție de dimensiune și de umplere.

Dar estimarea din cap e aproape întotdeauna greșită, uneori cu un factor bun. Umplerea, numărul de pereți, suporturile și materialul de curățare la schimbarea culorii schimbă totul. Singura cifră în care poți avea încredere e cea pe care ți-o dă slicerul după ce chiar felie modelul — și ăsta e motivul pentru care orice calcul serios de preț pornește de la slicer, nu de la o formulă geometrică.

Revenim la asta în capitolul patru, unde discutăm ce se întâmplă când nu mai printezi o bucată, ci cincizeci.

---

## Ce urmează

Materialul potrivit nu ajută dacă imprimanta nu îl poate printa fiabil. În capitolul următor discutăm cum îți alegi mașina — nu după lista de specificații, ci după ce vrei să faci cu ea.
