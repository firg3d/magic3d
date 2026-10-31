---
slug: academia/primul-print-care-iese-prost
titlu: "Primul print care iese prost și de ce"
h1: "De ce nu iese printul 3D și cum repari fiecare problemă"
titluSeo: "De ce nu iese printul 3D — cauze și soluții | Academia 3D Magic3D"
metaDescriere: "Printul nu se lipește de pat, colțurile se ridică, straturile se despică. Cauzele reale ale celor mai frecvente probleme la printarea 3D și cum le repari, explicate de un atelier care printează zilnic."
cuvinteCheie:
  - printul nu se lipeste de pat
  - de ce se desprinde printul 3d
  - warping printare 3d
  - probleme printare 3d
  - straturi despicate print 3d
  - colturile se ridica print 3d
capitol: 1
citire: 9
---

# De ce nu iese printul 3D și cum repari fiecare problemă

Toată lumea care își cumpără o imprimantă 3D trece prin aceeași săptămână. Primul print iese bine, pentru că e cubul de test pe care producătorul l-a pregătit cu grijă. Al doilea iese și el bine. Iar al treilea, cel care contează, cel pe care l-ai descărcat pentru cineva anume, se desprinde de pe pat la jumătate și se transformă într-un ghem de plastic.

De aici pornesc majoritatea oamenilor care renunță. Nu pentru că printarea 3D ar fi grea, ci pentru că defectele arată spectaculos și par să vină de nicăieri. În realitate sunt cinci sau șase probleme care se repetă la nesfârșit, fiecare cu o cauză mecanică sau termică perfect explicabilă, iar odată ce le recunoști după cum arată, le repari în câteva minute.

Capitolul ăsta e organizat după cum arată defectul, nu după cauză. Așa cauți când ai piesa stricată în mână.

---

## Printul nu se lipește de pat

E problema numărul unu și de departe cea mai frecventă. Primul strat se depune, dar nu aderă: firul de plastic se târăște după duză, se strânge în ghemotoace, sau piesa se desprinde după câteva minute și începe să se plimbe pe placă.

**Cauza pe care nimeni nu o verifică prima: grăsimea.** Ai atins placa cu degetele. Sebumul de pe piele e suficient ca plasticul să nu se prindă, iar el nu se vede. Placa se spală cu apă caldă și detergent de vase, se clătește, se șterge cu o lavetă curată. Alcoolul izopropilic curăță praful, dar nu îndepărtează grăsimea la fel de bine ca detergentul. Asta e prima verificare, înainte de orice setare, și rezolvă surprinzător de multe cazuri.

**A doua cauză: distanța dintre duză și pat.** Dacă duza e prea sus, plasticul cade pe placă în loc să fie apăsat în ea și nu are contact suficient. Dacă e prea jos, plasticul e strivit, iese pe lateral și lasă în urmă o suprafață cu creste. Primul strat corect arată ca o bandă turtită, cu marginile ușor unite între ele, fără goluri și fără muchii ridicate.

Imprimantele moderne fac nivelarea automat, dar compensarea automată nu înseamnă că nu mai ai nimic de reglat. Rămâne offsetul pe Z, care se ajustează manual, de obicei în pași de 0.02 mm, în timp ce printezi un pătrat de test de un strat. Merită să faci asta o dată, conștient, uitându-te la rezultat, în loc să te bazezi pe valoarea implicită.

**A treia: temperatura patului.** PLA se lipește bine la 55–60 °C. PETG cere 70–85 °C. Dacă ai schimbat filamentul și ai uitat profilul, e explicația.

**A patra: tipul de placă.** O placă texturată PEI ține foarte bine PLA și PETG, dar are nevoie de căldură ca să funcționeze. O placă netedă cere o suprafață impecabil de curată. Iar plăcile mai vechi, cu adeziv sau bandă, își pierd aderența în timp și trebuie înlocuite — nu e o defecțiune, e consumabil.

Dacă ai verificat toate astea și piesa are o bază mică sau colțuri ascuțite, adaugă un **brim**: câteva contururi lipite de piesă, în același strat, care măresc suprafața de contact. Se rup cu unghia la final. E soluția pe care oamenii o evită pentru că li se pare că trișează, dar în producție se folosește tot timpul.

---

## Colțurile se ridică de pe placă

Piesa nu se desprinde complet, dar colțurile se curbează în sus și baza nu mai e plană. Fenomenul se numește *warping* și e strict o problemă de contracție termică.

Plasticul iese din duză fierbinte și se contractă în timp ce se răcește. Straturile de jos, lipite de placă, nu se pot contracta liber. Straturile de deasupra se răcesc și trag de ele. Când forța de tracțiune depășește aderența, colțul se ridică — și se ridică întotdeauna la colțuri, pentru că acolo tensiunea se concentrează.

Cât de rău e depinde direct de material. PLA se contractă puțin și rareori face warping. PETG face mai des. ABS și ASA fac aproape întotdeauna, dacă nu ai o incintă închisă.

Ce ajută, în ordinea eficienței:

Un **curent de aer rece** peste imprimantă e cel mai subestimat vinovat. O fereastră deschisă în spatele mesei sau un aer condiționat care suflă în direcția aia îți strică printuri fără să înțelegi de ce, iar problema apare intermitent, ceea ce o face și mai greu de diagnosticat. O imprimantă deschisă nu trebuie să stea în curent.

**Temperatura patului mai mare** cu 5–10 °C ține baza caldă mai mult timp și reduce tensiunea.

**Răcirea mai slabă** pe primele straturi. Ventilatorul de piesă e util pentru detalii și pentru punți, dar pe primele straturi lucrează împotriva ta. Majoritatea profilelor bune îl țin oprit pe primul strat și îl pornesc treptat.

**O incintă**, chiar improvizată, pentru materialele care chiar au nevoie. Pentru ABS nu e opțional. Pentru PETG e un plus. Pentru PLA e adesea contraproductiv, pentru că PLA are nevoie de răcire bună.

Iar dacă piesa are colțuri drepte și tot face warping, o rotunjire de un milimetru la bază, adăugată în model, schimbă mult — tensiunea nu mai are unde să se concentreze.

---

## Straturile se despică

Piesa iese la dimensiune, arată acceptabil, dar se rupe ușor între straturi, ca o foaie care se desface în felii. Uneori se vede și cu ochiul liber: linii orizontale albicioase pe pereți.

Asta e **delaminare**, și înseamnă că straturile nu s-au sudat între ele. Plasticul topit trebuie să retopească parțial stratul de dedesubt ca să se lege de el. Dacă nu se întâmplă, ai un teanc de fire suprapuse, nu un obiect.

**Temperatura duzei prea joasă** e cauza cea mai frecventă. Fiecare rolă e ușor diferită, chiar și în același material și de la același producător. Dacă printezi PLA la 200 °C și se despică, urcă la 210–215 și testează din nou. Diferența e vizibilă imediat.

**Filamentul umed** e a doua cauză și cea pe care aproape nimeni nu o suspectează. Plasticul absoarbe umiditate din aer. La topire, apa se transformă în vapori, iese din duză ca mici explozii — auzi pocnituri fine în timpul printării — și strică legătura dintre straturi. PETG, nylonul și TPU absorb rapid; PLA mai lent, dar tot absoarbe. Un filament ținut trei luni pe raft, într-un apartament din București vara, e umed. Se usucă în uscător de filament sau în cuptor la temperatură joasă, câteva ore.

**Răcirea prea puternică** răcește stratul înainte să apuce să se lege. Dacă printezi PETG cu ventilatorul la 100%, îl reduci la 30–50%.

**Viteza prea mare** pentru temperatura aleasă produce același efect: plasticul nu are timp să se lege. Viteza și temperatura merg împreună — dacă urci una, trebuie să urci și cealaltă.

---

## Fire subțiri între piese

Piesa e bună, dar între pereți și între obiectele de pe placă rămân fire fine de plastic, ca o pânză de păianjen. Se numește *stringing* și nu afectează rezistența, dar strică aspectul — iar dacă vinzi, aspectul e produsul.

Apare pentru că plasticul curge din duză și când nu ar trebui, în timpul deplasărilor. Se combate cu **retracția**: extruderul trage filamentul înapoi câțiva milimetri înainte de deplasare.

Dacă ai stringing, verifică în ordine: **umiditatea filamentului**, din nou — e cauza cea mai frecventă și mai ignorată; **temperatura prea mare**, care face plasticul prea fluid, deci scade-o cu 5–10 °C; și **distanța de retracție**, care diferă mult între un extruder direct și unul Bowden.

PETG face stringing mai mult decât PLA prin natura lui. Nu îl elimini complet, îl reduci până devine neglijabil, iar restul se curăță cu un pistol cu aer cald trecut rapid peste piesă.

---

## Baza e mai lată decât restul

Primele straturi ies în afară, ca un picior de elefant — de unde și numele, *elephant foot*. Piesa nu mai intră în locașul pentru care a fost proiectată, iar la brelocuri și plăcuțe se vede imediat.

Cauza e că primul strat e apăsat prea tare în placă, sau că patul e prea cald și plasticul de jos rămâne moale sub greutatea straturilor de deasupra.

Ridici puțin offsetul pe Z, scazi temperatura patului cu 5 °C după primele straturi, sau folosești compensarea pentru primul strat pe care o au majoritatea slicerelor — o valoare negativă mică, în jur de 0.1–0.2 mm, care micșorează conturul de jos exact cât trebuie.

---

## Pereții au goluri sau firul lipsește pe alocuri

Extruderul face un zgomot ritmic de clic, pereții au porțiuni subțiri sau lipsă, iar umplutura arată spartă. E **sub-extrudare**: iese mai puțin plastic decât cere modelul.

Cel mai des, **duza e parțial înfundată**. Se curăță cu o pilă de aramă și o metodă de cold pull, sau se înlocuiește — duzele sunt consumabile ieftine și, dacă printezi cu filamente cu particule, se uzează mai repede decât crezi.

Pe locul doi, **filamentul umed** din nou. Pe locul trei, **tensiunea rolei de extruder**, prea slabă ca să împingă sau atât de strânsă încât aplatizează filamentul. Iar dacă printezi rapid cu duză de 0.4 mm, s-ar putea pur și simplu să ceri mai mult debit decât poate topi blocul de încălzire.

---

## Piesa e decalată la mijloc

Printul merge bine până la un punct, apoi tot ce urmează e deplasat lateral cu câțiva milimetri. E *layer shifting* și e o problemă mecanică, nu de setări.

Ori capul s-a lovit de ceva — o piesă desprinsă, un ghemotoc de plastic — și a pierdut pași. Ori o curea e slăbită. Ori o rolă e blocată sau uzată. Ori printezi mai repede decât acceptă mecanica, cu accelerații care fac motoarele să piardă pași.

Verifică întâi mecanica: curelele trebuie să sune ca o coardă întinsă, nu moale. Apoi redu viteza cu 20–30% și testează. Dacă problema dispare, mecanica are nevoie de reglaj, nu de un profil mai agresiv.

---

## Cum să abordezi orice defect nou

Există o singură regulă care economisește ore: **schimbă un singur lucru odată**. Când un print eșuează, tentația e să modifici temperatura, viteza, răcirea și retracția în același timp. Dacă merge, nu știi ce a mers. Dacă nu merge, nu știi ce ai stricat.

Printează un obiect mic de test, nu piesa reală. Un cub de 20 mm sau un turn de temperatură îți dă răspunsul în douăzeci de minute, nu în șase ore.

Și notează ce funcționează. Un caiet, un fișier, oriunde: material, producător, temperatura duzei, temperatura patului, viteză. Peste trei luni, când cumperi altă rolă din același material și iese prost, ai cu ce compara. Atelierele care lucrează constant nu au noroc — au notițe.

---

## Ce urmează

Multe dintre problemele de mai sus au aceeași rădăcină: materialul greșit pentru ce vrei să faci, sau materialul potrivit ținut în condiții greșite. În capitolul următor luăm filamentele la rând și le judecăm după o singură întrebare practică — unde ajunge obiectul după ce iese din imprimantă.
