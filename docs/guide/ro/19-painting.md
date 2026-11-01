---
title: Pictura multicoloră
summary: Colorezi un model triunghi cu triunghi, cu modele și imagini, pentru câte filamente duce imprimanta ta, și exporți un 3MF multicolor.
---

## Intrarea în pictură

{{m3d:pictura.tab}} e al treilea tab, lângă {{ui:editor.modeGeometry}} și {{ui:editor.modeSketch}}. Ia corpurile selectate sau, când nu e nimic selectat, pe toate cele vizibile. Pe pagina de start, {{m3d:start.picturaIncearca}} deschide un design nou cu o vază deja în pictură, iar {{m3d:start.coloreazaTitlu}} deschide unul cu STL-ul, 3MF-ul sau OBJ-ul tău - un 3MF deja colorat își păstrează culorile.

Pictura se face pe triunghiuri. Fiecare acțiune terminată se salvează pe corp și apare în istoricul editorului ca {{m3d:pictura.aplicat}}. Dacă schimbi apoi forma unui corp în Editor 3D, culorile nu se mai potrivesc și sunt lăsate deoparte; mutarea sau rotirea corpului le păstrează.

## Pensulă, găleată, pipetă și radieră

- {{m3d:pictura.pensula}} ([[B]]) colorează triunghiurile din cerc. {{m3d:pictura.vizibil}} rămâne pe suprafața pe care o vezi; {{m3d:pictura.prin}} ajunge și pe partea cealaltă. Ține [[Shift]] ca să ștergi în timp ce pictezi.
- {{m3d:pictura.galeata}} ([[G]]) umple o zonă până la muchiile ascuțite - unghiul spune cât de ascuțite - sau înlocuiește o culoare ({{m3d:pictura.aceeasiCuloare}}).
- {{m3d:pictura.pipeta}} ([[I]]) preia culoarea unui triunghi.
- {{m3d:pictura.radiera}} ([[E]]) pune înapoi culoarea de bază.

Tragi pe model ca să pictezi; tragi lângă el, sau cu butonul drept, ca să rotești vederea. [[Ctrl]]+[[Z]] anulează un pas de pictură.

## Selecție cu dreptunghi sau lasou

{{m3d:pictura.selectie}} ([[S]]) selectează desenând pe vedere: un dreptunghi sau un lasou liber, doar pe fețele pe care le vezi sau și prin model. [[Shift]] adaugă, [[Alt]] scade, [[Esc]] golește. O selecție primește doar ea {{m3d:pictura.culoarePeSelectie}}, un model de culoare sau o subdivizare.

## Filamentele și paleta atelierului

În dreapta, fiecare slot e un filament: slotul 1 e culoarea de bază a corpului, celelalte sunt filamentele 2, 3 și așa mai departe în slicer. Dai clic pe un slot ca să pictezi cu el, apoi îi alegi culoarea din {{m3d:pictura.paleta}} sau ca {{m3d:pictura.culoareProprie}}. Ochiul de lângă slot ascunde ce e pe filamentul acela, ca să verifici. Cel mult 16 sloturi.

## Imprimanta și numărul de culori

La {{m3d:pictura.imprimanta}} alegi sistemul multicolor - urmează imprimanta aleasă în setările editorului - și câte culori duce (AMS lite 4, AMS 4 pe unitate, MMU3 5 și altele), sau un număr ales de mână. Când modelul are mai multe culori, {{m3d:pictura.reducere}} le strânge în nuanțele cele mai apropiate, din culorile folosite sau din filamentele atelierului: poți fixa culori care trebuie să rămână, vezi rezultatul pe model înainte să-l aplici sau unești de mână două sloturi. {{m3d:pictura.estimari}} îți dă schimbările de filament, materialul pierdut și timpul în plus - orientativ, decide slicerul.

## Modele de culoare

{{m3d:pictura.modele}} pictează tot modelul, o culoare sau selecția cu un model calculat pe loc: dungi, spirală, carouri, buline, valuri, zigzag, gradienți, camuflaj, marmură, Voronoi, hexagoane, lemn, fulgi, inimi și stele. Mărimea, unghiul, densitatea, seed-ul și proiecția îl schimbă. Presetările cu nume (Pepene, Militar, Crăciun, Galaxie, Zebră, Curcubeu, Marmură albă) își aduc culorile, iar {{m3d:pictura.modeleleMele}} îți păstrează combinațiile în acest browser.

## Imagine pe model

{{m3d:pictura.imaginePeModel}} ia un PNG, JPG sau SVG, îl reduce la câteva culori de filament (înainte și după, alături) și îl proiectează din direcția din care privești: alegi {{m3d:pictura.imagine}} ([[M]]) și dai clic pe model, apoi reglezi lățimea, rotirea și poziția. Încarcă doar imagini pe care ai dreptul să le folosești. Triunghiurile mari fac margini zimțate - subdivizează întâi.

## Retușarea modelului

{{m3d:pictura.retusare}} pregătește plasa: {{m3d:pictura.subdivizeazaSelectia}} taie triunghiurile mari până la latura aleasă, fără să schimbe forma (cel mult două milioane de triunghiuri; fișierul crește odată cu ele); {{m3d:pictura.repara}} unește vârfurile dublate, închide găurile mici și întoarce normalele spre exterior; {{m3d:pictura.simplifica}} rărește modelele foarte mari. Plasa nouă ajunge înapoi în corpul din editor.

## Exportul și printarea la noi

{{m3d:pictura.export}} scrie un 3MF cu culoarea pe fiecare triunghi - pentru Bambu Studio și OrcaSlicer sau pentru PrusaSlicer - cu lista filamentelor în ordinea sloturilor. {{m3d:pictura.printeazaLaNoi}} trimite 3MF-ul colorat și lista de filamente atelierului, prin panoul de ofertă. Culorile care nu sunt pe stocul atelierului sunt semnalate, cu cele mai apropiate filamente de pe stoc și un buton care le folosește.
