---
title: Vícebarevné malování
summary: Obarvi model trojúhelník po trojúhelníku, vzory i obrázky, pro tolik filamentů, kolik tvoje tiskárna zvládne, a exportuj vícebarevný 3MF.
---

## Přechod k malování

{{m3d:pictura.tab}} je třetí karta vedle {{ui:editor.modeGeometry}} a {{ui:editor.modeSketch}}. Vezme vybraná tělesa, nebo všechna viditelná, když není nic vybráno. Na úvodní stránce {{m3d:start.picturaIncearca}} otevře nový návrh s vázou rovnou v malování a {{m3d:start.coloreazaTitlu}} návrh s tvým vlastním STL, 3MF nebo OBJ - už obarvený 3MF si barvy ponechá.

Maluje se po trojúhelnících. Každá dokončená akce se uloží na těleso a objeví se v historii editoru jako {{m3d:pictura.aplicat}}. Když potom změníš tvar tělesa ve 3D editoru, barvy už nesedí a odloží se; posunutí nebo otočení je zachová.

## Štětec, kbelík, kapátko a guma

- {{m3d:pictura.pensula}} ([[B]]) barví trojúhelníky v kruhu. {{m3d:pictura.vizibil}} zůstává na viditelném povrchu; {{m3d:pictura.prin}} dosáhne i na odvrácenou stranu. Drž [[Shift]], abys během malování mazal.
- {{m3d:pictura.galeata}} ([[G]]) vyplní oblast až po ostré hrany - úhel určuje, jak ostré - nebo nahradí barvu ({{m3d:pictura.aceeasiCuloare}}).
- {{m3d:pictura.pipeta}} ([[I]]) převezme barvu trojúhelníku.
- {{m3d:pictura.radiera}} ([[E]]) vrátí základní barvu.

Táhni po modelu, abys maloval; táhni vedle něj nebo pravým tlačítkem, abys otáčel pohled. [[Ctrl]]+[[Z]] vrátí krok malování.

## Výběr obdélníkem nebo lasem

{{m3d:pictura.selectie}} ([[S]]) vybírá kreslením v pohledu: obdélníkem nebo volným lasem, jen viditelné plochy, nebo i skrz model. [[Shift]] přidává, [[Alt]] ubírá, [[Esc]] maže. Výběr dostane samostatně {{m3d:pictura.culoarePeSelectie}}, barevný vzor nebo zjemnění.

## Filamenty a paleta dílny

Vpravo je každý slot filament: slot 1 je základní barva tělesa, ostatní jsou ve sliceru filamenty 2, 3 a tak dále. Klikni na slot, abys jím maloval, a vyber jeho barvu z {{m3d:pictura.paleta}} nebo jako {{m3d:pictura.culoareProprie}}. Oko vedle slotu skryje, co je na tom filamentu. Nejvýš 16 slotů.

## Tiskárna a počet barev

V části {{m3d:pictura.imprimanta}} vybereš vícebarevný systém - řídí se tiskárnou z nastavení editoru - a kolik barev zvládne (AMS lite 4, AMS 4 na jednotku, MMU3 5 a další), nebo počet ručně. Má-li model víc barev, {{m3d:pictura.reducere}} je sloučí do nejbližších odstínů, z použitých barev nebo z filamentů dílny: barvy můžeš zamknout, výsledek uvidíš na modelu ještě před použitím, nebo ručně sloučíš dva sloty. {{m3d:pictura.estimari}} ukáže výměny filamentu, ztracený materiál a čas navíc - orientačně, rozhoduje slicer.

## Barevné vzory

{{m3d:pictura.modele}} namaluje celý model, jednu barvu nebo výběr spočítaným vzorem: pruhy, spirála, kostky, puntíky, vlny, cikcak, přechody, maskování, mramor, Voronoi, šestiúhelníky, dřevo, vločky, srdce a hvězdy. Mění ho velikost, úhel, hustota, seed a projekce. Pojmenované předvolby (Meloun, Vojenský, Vánoce, Galaxie, Zebra, Duha, Bílý mramor) přinesou své barvy a {{m3d:pictura.modeleleMele}} uchová tvoje kombinace v tomto prohlížeči.

## Obrázek na modelu

{{m3d:pictura.imaginePeModel}} vezme PNG, JPG nebo SVG, převede ho na pár barev filamentu (před a po vedle sebe) a promítne ho ze směru, kam se díváš: vyber {{m3d:pictura.imagine}} ([[M]]) a klikni na model, pak nastav šířku, otočení a polohu. Nahrávej jen obrázky, které smíš používat. Velké trojúhelníky dělají zubaté okraje - nejdřív zjemni.

## Úprava modelu

{{m3d:pictura.retusare}} připraví síť: {{m3d:pictura.subdivizeazaSelectia}} rozdělí velké trojúhelníky na zvolenou délku hrany, aniž by měnil tvar (nejvýš dva miliony trojúhelníků; soubor s nimi roste); {{m3d:pictura.repara}} sloučí zdvojené vrcholy, zavře malé díry a otočí normály ven; {{m3d:pictura.simplifica}} prořídí velmi velké modely. Nová síť se vrátí do tělesa v editoru.

## Export a tisk u nás

{{m3d:pictura.export}} zapíše 3MF s barvou na každém trojúhelníku - pro Bambu Studio a OrcaSlicer, nebo pro PrusaSlicer - se seznamem filamentů v pořadí slotů. {{m3d:pictura.printeazaLaNoi}} pošle obarvený 3MF a seznam filamentů dílně přes panel nabídky. Barvy, které dílna nemá skladem, se označí spolu s nejbližšími filamenty skladem a tlačítkem, které je použije.
