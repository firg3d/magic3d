---
title: Tabletă și ecran tactil
summary: Lucrul cu degetele sau cu un stylus: selectarea mai multor corpuri, rotirea și zoomul vederii, meniul apăsării lungi și ce trebuie să știi pe un iPad.
---

## Degete și stylus

Magic3D rulează în browserul unei tablete și ca aplicație de pe ecranul de pornire. Un deget face ce face butonul stâng al mouse-ului. Trei lucruri pe care o tabletă nu le are, butonul drept al mouse-ului, tasta Shift și rotița, au fiecare propria soluție:

| Vrei să | Pe o tabletă |
| --- | --- |
| Selectezi un corp | Atinge-l. |
| Selectezi mai multe corpuri | Atinge un corp: în stânga jos apare un buton rotund. Atinge-l și fiecare corp pe care îl atingi după aceea intră în selecție; o atingere pe un corp selectat îl scoate din nou. O atingere în spațiul gol nu schimbă nimic; o a doua atingere pe buton încheie modul și golește selecția. Sau ține un deget nemișcat o jumătate de secundă, alege {{ui:contextMenu.selectMultiple}}, apoi atinge corpurile unul după altul. |
| Selectezi toate corpurile | Ține un deget nemișcat în spațiul gol o jumătate de secundă și alege {{ui:contextMenu.selectAll}}. |
| Deschizi meniul unui clic dreapta | Ține un deget nemișcat pe un corp sau în spațiul gol o jumătate de secundă. |
| Muți un corp | Trage-l. |
| Redimensionezi, rotești sau ridici un corp | Trage de mânerele lui, pătratele mici și săgețile din jurul lui. Un deget le prinde și puțin din lateral. |
| Rotești vederea | Un deget în spațiul gol sau trage cubul de vedere. |
| Faci zoom | Două degete: depărtează-le ca să te apropii, apropie-le ca să te depărtezi. |
| Deplasezi vederea | Glisează cu două degete împreună. |
| Golești selecția | Atinge spațiul gol. Nu și cât timp {{ui:camera.touchRotate}} e pornit, când un deget rotește vederea; iar în {{ui:contextMenu.selectMultiple}} prima atingere în spațiul gol doar încheie modul și lasă selecția cum e, următoarea o golește. |

## Selectarea mai multor corpuri

Fără tasta Shift, {{ui:contextMenu.selectMultiple}} din meniul apăsării lungi face ce face Shift+clic pe un computer. Cât timp e pornit, un mesaj îți spune asta, iar fiecare atingere pe un corp îl adaugă la selecție sau îl scoate din nou. O atingere în spațiul gol sau [[Esc]] pe o tastatură încheie modul și lasă selecția cum e. Între timp, un deget în spațiul gol rotește în continuare vederea. Apoi {{ui:editor.tool.group}}, {{ui:editor.tool.align}} sau o mutare acționează pe toate corpurile pe care le-ai ales.

Același meniu are {{ui:contextMenu.carry}}, tasta [[C]] pentru un ecran tactil. Selecția urmează atunci degetul peste fețele altor corpuri; o atingere o lasă pe fața pe care o atingi, chiar și pe una înclinată, iar prima atingere e suficientă. Intrarea din meniu se găsește și căutând „set down" sau „cruise" (căutarea de comenzi, [[Ctrl]]+[[K]] pe o tastatură).

## Rotirea și zoomul vederii

Un deget în spațiul gol rotește vederea, două degete fac zoom și o deplasează. Un deget care pornește de pe un corp lucrează pe corp, nu pe vedere. Dacă preferi să rotească vederea, pornește {{ui:camera.touchRotate}} în bara camerei: un deget rotește atunci vederea în loc să selecteze, oriunde ar porni. Comutatorul apare doar pe un dispozitiv cu ecran tactil.

Cubul de vedere din stânga sus rotește vederea când îl tragi, iar o atingere pe una dintre fețele, colțurile sau muchiile lui sare la acea vedere. Vezi [Vederea și planul de lucru](chapter:view-and-workplane).

## Mânere, puncte mici și stylus

Vârful degetului acoperă ce țintește. Magic3D lasă un deget să ajungă puțin mai departe la mânere, puncte, linii și muchii decât un cursor de mouse, dar un stylus e mai fin. Asta e valabil pentru un creion pe care tableta îl recunoaște drept creion, cum e un Apple Pencil sau un S Pen. Un stylus simplu cu vârf de cauciuc contează pentru ecran ca un deget și nu e mai fin decât unul, așa că lucrează cu el ca și cu un deget. Un Apple Pencil care plutește deasupra ecranului pe un iPad arată și numele unui control după un moment, într-un mic balon, cum face cursorul mouse-ului cu un indiciu.

Dacă corpurile alunecă atunci când le ating copii sau mâini grăbite, pornește {{ui:workspace.selectBeforeMoving}} în setări: un corp trebuie atunci selectat mai întâi și abia următoarea tragere îl mută.

## Pe un iPad sau iPhone

- **Instalează-l ca aplicație.** În Safari, atinge pictograma Partajare și alege „Adaugă pe ecranul principal". Aplicația se deschide într-o fereastră proprie, fără bara de adrese, și funcționează fără conexiune; vezi [Offline și instalare](chapter:offline-and-install).
- **Proiectele tale stau în browser** (dacă nu găzduiești tu Magic3D și nu configurezi un dosar pe server). Nu există cont și nu se încarcă nimic. Safari are o regulă proprie împotriva urmăririi: șterge ce a stocat un site după șapte zile în care nu l-ai vizitat în Safari. O aplicație web adăugată pe ecranul principal e scutită de această regulă, așa cum documentează WebKit. Acesta e încă un motiv să folosești aplicația de pe ecranul principal și să faci copii de siguranță pentru lucrările importante: {{ui:dashboard.backupAll}} de pe pagina de start împachetează toate proiectele într-un singur fișier.
- **Fișiere.** Safari permite unei pagini să scrie într-un fișier doar printr-o descărcare, așa că {{ui:editor.export}} pune fișierul în Descărcări din aplicația Fișiere, iar [[Ctrl]]+[[S]] pe o tastatură îl descarcă din nou; vezi [Fișiere și salvare](chapter:files-and-saving).
- **Nu ai nevoie de tastatură.** Fiecare unealtă are un buton în panglică, iar un câmp numeric deschide tastatura de pe ecran. O tastatură conectată la iPad adaugă [scurtăturile de tastatură](chapter:shortcuts). O casetă de valoare de lângă un corp își deschide câmpul numeric la a doua atingere: prima atingere doar o marchează, așa că un deget care ajunge acolo din greșeală nu deschide tastatura.

## Ateliere cu copii

Degetele și stylusurile cu vârf de cauciuc funcționează la fel aici. Două setări ușurează lucrul cu o clasă: {{ui:workspace.selectBeforeMoving}}, ca o atingere să nu mute un corp din greșeală, și {{ui:camera.touchRotate}}, ca un deget să rotească mereu vederea. Butonul cu semnul întrebării din grupul Ajutor al panglicii pornește {{ui:interactiveHelp.title}}: o atingere pe orice buton, câmp sau mâner îl explică atunci, iar același buton sau [[Esc]] iese din acest mod.

Pentru o clasă întreagă, pornește {{ui:workspace.simpleMode}} în setări. Panglica păstrează atunci doar uneltele pe care le folosește un atelier (copiază, lipește, duplică, șterge, anulează, grupează, oglindește, teșitură, rotunjire, golire, aliniază, exportă), biblioteca de forme devine o listă scurtă, butoanele sunt mai mari, iar pagina de start arată proiectele și nimic altceva: fără noutăți, fără text de bun venit, fără butoane de ajutor și fără linkuri în afara Magic3D. Pornirea se face cu o atingere; oprirea, cu o apăsare ținută două secunde pe butonul care îi ia atunci locul. Un link care se termină cu `?mode=simple` îl pornește pe dispozitivul care îl deschide, iar `?mode=full` îl oprește din nou.
