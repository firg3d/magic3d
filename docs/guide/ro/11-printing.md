---
title: Pregătirea pentru printarea 3D
summary: Cum îți alegi imprimanta, cum ești avertizat când ceva nu încape și cum așezi piesa corect.
---

## Alegerea imprimantei

Deschide setările (rotița dințată din rândul de titlu, {{ui:editor.workspaceSettings}}) și treci la zona {{ui:workspace.workplane}}. Sub {{ui:workspace.printer}} îți alegi imprimanta dintr-o listă cu peste 230 de modele obișnuite, printre care Bambu Lab, Prusa, Creality, Anycubic, Elegoo și multe altele.

![Setările planului de lucru cu o imprimantă aleasă. Placa de printare și înălțimea maximă de printare vin din profilul slicerului.](shot:settings-workplane)

Se întâmplă trei lucruri:

- Planul de lucru ia mărimea plăcii de printare.
- În colțul planului de lucru apar numele imprimantei și volumul ei de printare. Dacă scrisul te încurcă, oprește-l cu {{ui:workspace.showPlateLabels}} sub {{ui:workspace.workplane}}; asta e valabil și pentru numele proiectului din stânga față.
- Magic3D te **avertizează** când ceva nu încape.

Profilurile de imprimantă vin din OrcaSlicer, deci sunt aceleași pe care le cunoaște slicerul tău. Dacă preferi să lucrezi fără imprimantă, alege {{ui:workspace.printerNone}}. Poți seta și manual mărimea planului de lucru.

Imprimantele delta, cum sunt cele de la FLSun sau SeeMeCNC ori Anycubic Predator, printează pe o placă rotundă. Cu una dintre ele, planul de lucru e și el rotund, cât de lată e placa, iar un corp e prea mare imediat ce trece de margine. Un corp rotund e măsurat după propriul contur, nu după cutia din jurul lui, așa că un cilindru aproape cât placa de lat tot încape.

## Când ceva nu încape

Un corp care iese peste marginea plăcii de printare e marcat. Un mesaj îți spune pe ce laturi iese și cu cât. La fel se întâmplă dacă piesa e **prea înaltă**: înălțimea se socotește de la cel mai de jos corp, exact cum așază slicerul modelul.

![Cutia e mai lată decât placa de printare a lui Bambu Lab A1 mini. Mesajul de jos spune cu cât.](shot:printer-overhang)

Avertismentul nu te oprește să lucrezi mai departe. E un indiciu, ca să nu afli abia în slicer că piesa e prea mare. O piesă prea mare poate fi adesea împărțită: tai-o în două cu {{ui:editor.tool.split}} și printează cele două jumătăți separat.

Dacă lași intenționat piese lângă placă, dă clic pe crucița mică din mesaj. Avertismentul dispare atunci exact pentru aceste corpuri. Odată ce unul dintre ele încape din nou și îl scoți afară mai târziu, sau alt corp iese în afară, mesajul revine. Corpurile ascunse nu contează niciodată, așa că și ascunderea pieselor lăsate deoparte funcționează.

## Așezarea corectă a piesei

Felul în care stă o piesă pe placă îi decide rezistența și aspectul. Te ajută două unelte din zona {{ui:editor.group.arrange}}:

- {{ui:editor.tool.layFlat}}: dă clic pe o față și piesa se culcă cu partea aceea în jos. Cea mai bună direcție de printare dintr-un singur clic.
- {{ui:editor.tool.dropToWorkplane}} ([[D]]): așază piesa pe planul de lucru când plutește undeva în aer.

Câteva reguli practice pentru direcție:

- Fețele mari și plate în jos. Acestea se prind cel mai bine.
- Așază piesele lungi, supuse la efort, astfel încât straturile să nu fie perpendiculare pe sarcină. Straturile sunt direcția cea mai slabă.
- Evită surplombele mai abrupte de 45° sau dă-le suporturi în slicer.

## Găsirea surplombelor

În meniul de lângă ochi ({{ui:editor.group.visibility}}), **Arată surplombele** pornește afișarea surplombelor. Fiecare față orientată în jos mai abrupt de 45° e atunci hașurată cu roșu și alb - acolo imprimanta ar avea nevoie de suporturi. Ce stă pe placă rămâne neutru. Așa vezi încă din proiectare dacă o sferă, un arc sau o gaură orizontală se printează fără suporturi; [gaura în formă de lacrimă](chapter:threads-and-mechanics) e făcută exact pentru asta. Rotește piesa sau culc-o pe altă față cu {{ui:editor.tool.layFlat}}, iar hașura se actualizează imediat.

Cât de abrupt reușește imprimanta ta se setează în setări, sub {{ui:workspace.appearance}}: de la 30° (prudent) la 70° (pentru imprimantele cu răcire bună a piesei). O față care se sprijină pe alt corp e marcată totuși - Magic3D se uită doar la fața în sine.

## Grosimea peretelui, joc și teșituri

- Pereții ar trebui să aibă cel puțin două linii de extrudare, deci 0,8 mm cu o duză de 0,4 mm. Piesele robuste au nevoie de 1,2 până la 2 mm.
- Acolo unde două piese intră una în alta îți trebuie joc: de obicei 0,2 până la 0,4 mm, în funcție de imprimantă. Fă o pereche mică de test înainte să printezi piesa mare.
- Mulți teșesc ușor muchia de jos care stă pe placă. Asta împiedică primul strat să se lățească („picior de elefant").

## Când ești gata

Alege {{ui:editor.export}} și apoi **STL** sau **3MF**. STL e cel mai simplu format. 3MF păstrează numele și culorile corpurilor individuale, așa că e util când printezi în mai multe culori. Fereastra de export arată și câte grame și câți metri de filament ar lua piesa printată plin. Mai multe în [Fișiere și salvare](chapter:files-and-saving).
