---
title: Meerkleurig schilderen
summary: Een model driehoek voor driehoek kleuren, met patronen en afbeeldingen, voor zoveel filamenten als je printer aankan, en exporteren als meerkleurige 3MF.
---

## Naar het schilderen

{{m3d:pictura.tab}} is het derde tabblad, naast {{ui:editor.modeGeometry}} en {{ui:editor.modeSketch}}. Het neemt de geselecteerde lichamen, of alle zichtbare als er niets is geselecteerd. Op de startpagina opent {{m3d:start.picturaIncearca}} een nieuw ontwerp met een vaas al in het schilderen, en {{m3d:start.coloreazaTitlu}} een met je eigen STL, 3MF of OBJ - een 3MF die al gekleurd is, houdt zijn kleuren.

Er wordt op driehoeken geschilderd. Elke afgeronde actie wordt op het lichaam bewaard en staat in de geschiedenis van de editor als {{m3d:pictura.aplicat}}. Verander je daarna de vorm van een lichaam in de 3D-editor, dan passen de kleuren niet meer en worden ze opzijgezet; verplaatsen of draaien houdt ze.

## Penseel, emmer, pipet en gum

- {{m3d:pictura.pensula}} ([[B]]) kleurt de driehoeken in de cirkel. {{m3d:pictura.vizibil}} blijft op het oppervlak dat je ziet; {{m3d:pictura.prin}} bereikt ook de achterkant. Houd [[Shift]] ingedrukt om te gummen tijdens het schilderen.
- {{m3d:pictura.galeata}} ([[G]]) vult een gebied tot de scherpe randen - de hoek bepaalt hoe scherp - of vervangt een kleur ({{m3d:pictura.aceeasiCuloare}}).
- {{m3d:pictura.pipeta}} ([[I]]) neemt de kleur van een driehoek over.
- {{m3d:pictura.radiera}} ([[E]]) zet de basiskleur terug.

Sleep over het model om te schilderen; sleep ernaast, of met de rechterknop, om het beeld te draaien. [[Ctrl]]+[[Z]] maakt een schilderstap ongedaan.

## Selecteren met een rechthoek of lasso

{{m3d:pictura.selectie}} ([[S]]) selecteert door op het beeld te tekenen: een rechthoek of een vrije lasso, alleen de vlakken die je ziet of ook door het model. [[Shift]] voegt toe, [[Alt]] haalt weg, [[Esc]] wist. Een selectie krijgt in haar eentje {{m3d:pictura.culoarePeSelectie}}, een kleurpatroon of een onderverdeling.

## Filamenten en het palet van de werkplaats

Rechts is elke plek een filament: plek 1 is de basiskleur van het lichaam, de andere zijn filament 2, 3 enzovoort in de slicer. Klik op een plek om ermee te schilderen en kies de kleur uit {{m3d:pictura.paleta}} of als {{m3d:pictura.culoareProprie}}. Het oog naast een plek verbergt wat op dat filament ligt. Tot 16 plekken.

## Printer en aantal kleuren

Onder {{m3d:pictura.imprimanta}} kies je het meerkleurensysteem - het volgt de printer uit de instellingen van de editor - en hoeveel kleuren het aankan (AMS lite 4, AMS 4 per eenheid, MMU3 5 en andere), of een aantal met de hand. Heeft het model meer kleuren, dan voegt {{m3d:pictura.reducere}} ze samen tot de dichtstbijzijnde tinten, uit de gebruikte kleuren of uit de filamenten van de werkplaats: je kunt kleuren vastzetten, het resultaat vooraf op het model zien of twee plekken met de hand samenvoegen. {{m3d:pictura.estimari}} geeft filamentwissels, verloren materiaal en extra tijd - een richtwaarde, de slicer beslist.

## Kleurpatronen

{{m3d:pictura.modele}} schildert het hele model, één kleur of de selectie met een berekend patroon: strepen, spiraal, ruiten, stippen, golven, zigzag, verlopen, camouflage, marmer, Voronoi, zeshoeken, hout, sneeuwvlokken, harten en sterren. Grootte, hoek, dichtheid, seed en projectie veranderen het. Benoemde voorinstellingen (Watermeloen, Leger, Kerst, Melkweg, Zebra, Regenboog, Wit marmer) brengen hun kleuren mee, en {{m3d:pictura.modeleleMele}} bewaart je eigen combinaties in deze browser.

## Afbeelding op het model

{{m3d:pictura.imaginePeModel}} neemt een PNG, JPG of SVG, brengt die terug tot een paar filamentkleuren (voor en na naast elkaar) en projecteert ze vanuit de richting waarin je kijkt: kies {{m3d:pictura.imagine}} ([[M]]) en klik op het model, stel dan breedte, draaiing en positie in. Upload alleen afbeeldingen die je mag gebruiken. Grote driehoeken geven kartelranden - eerst onderverdelen.

## Het model bijwerken

{{m3d:pictura.retusare}} maakt het net klaar: {{m3d:pictura.subdivizeazaSelectia}} deelt grote driehoeken tot de gekozen randlengte, zonder de vorm te veranderen (tot twee miljoen driehoeken; het bestand groeit mee); {{m3d:pictura.repara}} voegt dubbele punten samen, sluit kleine gaten en draait de normalen naar buiten; {{m3d:pictura.simplifica}} dunt heel grote modellen uit. Het nieuwe net gaat terug naar het lichaam in de editor.

## Exporteren en bij ons printen

{{m3d:pictura.export}} schrijft een 3MF met de kleur op elke driehoek - voor Bambu Studio en OrcaSlicer, of voor PrusaSlicer - met de lijst van filamenten in de volgorde van de plekken. {{m3d:pictura.printeazaLaNoi}} stuurt de gekleurde 3MF en de filamentlijst via het offertepaneel naar de werkplaats. Kleuren die de werkplaats niet op voorraad heeft, worden gemarkeerd, met de dichtstbijzijnde filamenten op voorraad en een knop die ze gebruikt.
