---
slug: academia/de-la-o-bucata-la-o-comanda
titlu: "De la o bucată la o comandă"
h1: "De la o bucată la o comandă: ce se schimbă când printezi 50"
titluSeo: "Producție cu imprimanta 3D — de la o bucată la 50 | Academia 3D"
metaDescriere: "Ce se schimbă când treci de la un print la o comandă de cincizeci: așezarea pe placă, calculul real al prețului, ce se uzează în serie și cum păstrezi repetabilitatea."
cuvinteCheie:
  - productie printare 3d
  - cat costa un print 3d
  - cum calculez pretul unui print 3d
  - printare 3d in serie
  - vanzare produse printate 3d
capitol: 4
citire: 9
---

# De la o bucată la o comandă: ce se schimbă când printezi 50

Prima comandă mai mare vine de obicei pe neașteptate. Cineva vede un breloc pe care l-ai făcut, întreabă dacă poți face patruzeci pentru o petrecere, cu nume diferite, până sâmbăta viitoare. Spui da, pentru că unul ți-a luat patruzeci de minute și patruzeci de bucăți par o chestiune de aritmetică.

Nu sunt. Producția în serie nu e același lucru repetat de cincizeci de ori — e o activitate diferită, cu costuri diferite și cu moduri de eșec pe care printul singular nu ți le arată niciodată.

Capitolul ăsta e scris din operarea unui atelier cu douăzeci de imprimante, unde comenzile de serie sunt rutină, nu excepție. Nimic din ce urmează nu e teorie.

---

## Timpul nu se înmulțește, se acumulează

Prima capcană e aritmetica. Patruzeci de minute pe piesă, patruzeci de piese, înseamnă douăzeci și șapte de ore de mașină. Pare mult, dar gestionabil pe o săptămână.

Ce nu apare în calcul e restul. Fiecare comandă personalizată înseamnă un fișier nou de pregătit. Fiecare placă înseamnă timp de răcire, desprindere, curățare. Fiecare piesă înseamnă îndepărtat brimul, curățat firele, verificat. Fiecare schimbare de culoare înseamnă oprit, schimbat rola, repornit.

Regula pe care o descoperă toată lumea, mai devreme sau mai târziu: **timpul de mașină e ușor de estimat, timpul de om nu**, iar al doilea e adesea comparabil cu primul. Dacă îți calculezi prețul doar pe orele de imprimantă, lucrezi pe degeaba fără să înțelegi de ce.

Al doilea lucru care surprinde: timpul de pregătire a fișierelor nu scade cu volumul, dacă fiecare piesă e diferită. Patruzeci de nume diferite înseamnă patruzeci de fișiere. Dacă fiecare îți ia zece minute în CAD, ai pierdut aproape șapte ore înainte să pornești imprimanta — mai mult decât un sfert din timpul total de mașină. Aici se prăbușesc majoritatea comenzilor personalizate: nu la printare, la pregătire.

---

## Așezarea pe placă: nu maximiza numărul, minimizează riscul

Instinctul e să pui cât mai multe piese pe placă, ca să faci mai puține treceri. E greșit, și greșeala se plătește exact atunci când doare.

Când printezi douăzeci de piese pe o placă și una singură se desprinde la ora a patra, capul o târăște prin celelalte. Nu pierzi o piesă, pierzi placa. Patru ore și materialul pentru douăzeci de bucăți.

De aceea, la producție, plăcile se încarcă la 60–70% din capacitate, nu la maximum. Piesele se distanțează suficient cât o desprindere să nu contamineze vecinii. Iar comenzile mari se sparg în plăci mai mici — două plăci de zece sunt mai sigure decât una de douăzeci, chiar dacă durează per total cu puțin mai mult.

Contează și **poziția pe pat**. Marginile și colțurile aderă de obicei mai slab decât centrul, iar temperatura nu e perfect uniformă pe toată suprafața. Piesele critice se pun în centru. Dacă printezi douăzeci de bucăți identice și cele de la margine ies constant mai proaste, nu e întâmplare, e harta termică a patului tău.

---

## Ce se uzează în serie, și nu se uzează la o bucată

La un print pe săptămână, consumabilele par eterne. La producție continuă, se consumă vizibil, iar degradarea e graduală, deci nu o observi până când calitatea a scăzut deja.

**Duza se uzează.** Orificiul se lărgește microscopic, iar liniile de print devin mai groase și mai neregulate. Cu filamente obișnuite durează mult. Cu filamente cu sclipici, cu fibră sau cu lemn, poate fi o chestiune de o rolă sau două. Simptomul e că printuri care ieșeau perfect acum două luni ies aproximativ, cu aceleași setări.

**Placa de print își pierde aderența.** Nu brusc, ci pe zone — de obicei acolo unde ai printat cel mai des. Ajungi să ai o placă pe care centrul nu mai ține, dar marginile da, ceea ce e derutant până înțelegi ce se întâmplă.

**Filamentul se umezește în timpul comenzii.** O rolă deschisă luni și lăsată pe mașină o săptămână absoarbe suficientă umiditate cât ultimele piese să iasă vizibil mai proaste decât primele. Dacă ai o comandă lungă, ține rola în uscător pe toată durata, nu doar înainte.

**Iar setările nu se degradează, dar contextul se schimbă.** Temperatura din atelier vara nu e cea din iarnă. Aceleași setări dau rezultate diferite în iulie și în decembrie, mai ales la răcire și la aderență.

De aici o practică simplă și foarte utilă: **prima și ultima piesă din fiecare comandă se compară**. Dacă diferă vizibil, ceva s-a degradat pe parcurs, și vrei să știi asta înainte să livrezi.

---

## Cum calculezi prețul real

Formula pe care o folosește toată lumea la început e materialul plus ceva. E greșită, și e motivul pentru care mulți oameni care printează comercial descoperă după un an că nu au câștigat nimic.

Prețul corect are cinci componente.

**Materialul** e cel mai ușor. Grame consumate înmulțit cu prețul pe gram. Dar grame *reale*, luate din slicer după feliere, nu estimate din volumul modelului. Include suporturile, brimul și materialul de curățare la schimbările de culoare. La piese multicolor mici, materialul irosit poate depăși materialul din piesă — dacă îl ignori, calculul e greșit cu sute de procente.

**Timpul de mașină** înseamnă amortizarea imprimantei plus curentul plus consumabilele, împărțite la orele de funcționare. Nu e mare per oră, dar nu e zero, iar la volum se vede.

**Timpul de om** e componenta pe care o omite toată lumea și e adesea cea mai mare. Pregătirea fișierelor, încărcarea plăcilor, desprinderea, curățarea, finisarea, ambalarea. Cronometreaz-o o dată, sincer, pe o comandă reală. Cifra te va surprinde.

**Rebutul** e procentul de piese care ies prost. Chiar și cu o mașină bună și setări bune, la producție continuă rata nu e zero. Dacă e 5%, prețul trebuie să o conțină, altfel fiecare piesă eșuată îți mănâncă marja de la alte două.

**Marja** e ce rămâne, și trebuie să existe. Dacă acoperi doar costurile, nu ai o afacere, ai un hobby scump cu pași suplimentari.

Un test util: dacă ai calculat prețul și ți se pare prea mare ca să îl ceri, refă calculul — de obicei ai uitat timpul de om. Iar dacă e corect și tot ți se pare mare, problema nu e prețul, e produsul. Un obiect care nu suportă prețul lui real nu merită produs.

**Ordinele de mărime cu care lucrăm**, ca reper: o piesă mică, sub 50 de grame, cu geometrie simplă, pornește de la 25 de lei. O piesă medie, între 50 și 250 de grame în PLA sau PETG, de la 50. O piesă tehnică în ASA, nylon sau compozit cu fibră, de la 150 — diferența nu vine doar din material, ci din reglaj, rebut mai mare și timp de mașină mai lung. Modelarea de la zero, când clientul nu are fișier, pornește de la 100 de lei și e adesea partea cea mai scumpă a comenzii, pentru că e integral timp de om.

Ce se vede din cifrele astea: **saltul de la 25 la 150 de lei nu e proporțional cu materialul.** O piesă în ASA nu consumă de șase ori mai mult filament decât una în PLA. Diferența e în tot ce nu se vede — reglajul, incinta, rata de eșec, atenția. Dacă îți construiești prețurile pornind doar de la grame, vei subevalua exact lucrările care îți consumă cel mai mult.

---

## Repetabilitatea: singura care face diferența pe termen lung

Un atelier care produce constant nu are mai mult noroc decât unul care produce inconsecvent. Are proces.

Concret, asta înseamnă trei lucruri.

**Fișiere standardizate.** Aceleași setări, același profil, aceeași orientare, de fiecare dată. Dacă fiecare comandă e reconfigurată de la zero, fiecare comandă e un experiment cu rezultat incert.

**Documentație care merge cu fișierul.** Ce culori, în ce ordine, la ce strat se schimbă filamentul, ce se verifică înainte de livrare. Nu în capul tău — scris, lângă fișier. Testul e simplu: dacă mâine ai da comanda unui colaborator fără să îi explici nimic, ar putea să o ducă la capăt? Dacă nu, procesul tău nu există, doar obiceiurile tale.

**Verificare înainte de livrare, nu după.** O listă scurtă: dimensiunea corectă, fără fire, fără urme de brim, culorile corecte, numărul corect de bucăți. Cinci minute care previn un retur.

---

## Unde se rupe lanțul: pregătirea fișierelor

Dacă te uiți la unde se pierde de fapt timpul într-o comandă personalizată, răspunsul aproape întotdeauna e la început. Nu la printare — la configurarea celor patruzeci de fișiere diferite.

E o muncă repetitivă, care nu cere creativitate și nu aduce valoare clientului, dar consumă ore și e plină de erori mici: un nume scris greșit, o literă care nu intră în locaș, o piesă care nu a fost verificată dacă se sprijină pe postament. Erorile astea se descoperă de obicei după printare, când costă material și timp.

Exact aici a apărut Magic3D. Nu ca alternativă la un program CAD — un CAD e potrivit când proiectezi ceva nou. Ci pentru cazul opus: când același obiect trebuie generat de patruzeci de ori, cu alt nume, altă culoare, altă dimensiune, dar aceeași geometrie. Scrii textul, alegi fontul, aplicația verifică singură ce nu se vede — dacă piesa intră în locaș, dacă litera se sprijină, dacă nu rămân goluri închise în material — și exportă un 3MF cu piesele deja așezate pe plăci, cu fișa de producție alături.

Toate cele șapte generatoare sunt gratuite pentru uz personal, fără cont și fără instalare. Dacă vinzi ce produci cu ele, ai nevoie de o licență comercială — o singură achiziție, fără expirare, care susține dezvoltarea.

Iar dacă ai ajuns până aici din capitolul întâi, ai deja mai multă înțelegere despre ce se strică și de ce decât are majoritatea oamenilor care își cumpără prima imprimantă. Restul se învață printând.

---

## Testul

Patru capitole, câteva zeci de detalii practice. Testul de mai jos are cincisprezece întrebări, cinci minute, și îți spune ce ai reținut și unde merită să revii. Nu se salvează nicăieri și nu îți cere nimic — e doar pentru tine.
