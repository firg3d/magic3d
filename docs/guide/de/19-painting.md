---
title: Mehrfarbiges Bemalen
summary: Ein Modell Dreieck für Dreieck einfärben, mit Mustern und Bildern, für so viele Filamente wie dein Drucker kann, und als mehrfarbiges 3MF exportieren.
---

## Ins Bemalen wechseln

{{m3d:pictura.tab}} ist der dritte Reiter neben {{ui:editor.modeGeometry}} und {{ui:editor.modeSketch}}. Er nimmt die ausgewählten Körper oder, wenn nichts ausgewählt ist, alle sichtbaren. Auf der Startseite öffnet {{m3d:start.picturaIncearca}} ein neues Design mit einer Vase, schon im Bemalen, und {{m3d:start.coloreazaTitlu}} eines mit deiner eigenen STL-, 3MF- oder OBJ-Datei - ein bereits gefärbtes 3MF behält seine Farben.

Bemalt wird auf Dreiecken. Jede fertige Aktion wird am Körper gespeichert und steht im Verlauf des Editors als {{m3d:pictura.aplicat}}. Änderst du danach die Form eines Körpers im 3D-Editor, passen die Farben nicht mehr und werden beiseitegelegt; Verschieben oder Drehen behält sie.

## Pinsel, Eimer, Pipette und Radierer

- {{m3d:pictura.pensula}} ([[B]]) färbt die Dreiecke im Kreis. {{m3d:pictura.vizibil}} bleibt auf der sichtbaren Oberfläche; {{m3d:pictura.prin}} erreicht auch die Rückseite. Halte [[Shift]], um beim Malen zu radieren.
- {{m3d:pictura.galeata}} ([[G]]) füllt eine Fläche bis zu den scharfen Kanten - der Winkel legt fest, wie scharf - oder ersetzt eine Farbe ({{m3d:pictura.aceeasiCuloare}}).
- {{m3d:pictura.pipeta}} ([[I]]) nimmt die Farbe eines Dreiecks auf.
- {{m3d:pictura.radiera}} ([[E]]) setzt die Grundfarbe zurück.

Ziehe auf dem Modell, um zu malen; ziehe daneben oder mit der rechten Taste, um die Ansicht zu drehen. [[Ctrl]]+[[Z]] macht einen Malschritt rückgängig.

## Mit Rechteck oder Lasso auswählen

{{m3d:pictura.selectie}} ([[S]]) wählt aus, indem du auf der Ansicht zeichnest: ein Rechteck oder ein freies Lasso, nur die sichtbaren Flächen oder auch durch das Modell. [[Shift]] fügt hinzu, [[Alt]] nimmt weg, [[Esc]] leert. Eine Auswahl bekommt allein {{m3d:pictura.culoarePeSelectie}}, ein Farbmuster oder eine Unterteilung.

## Filamente und die Palette der Werkstatt

Rechts ist jeder Platz ein Filament: Platz 1 ist die Grundfarbe des Körpers, die anderen sind im Slicer die Filamente 2, 3 und so weiter. Klicke auf einen Platz, um mit ihm zu malen, und wähle seine Farbe aus {{m3d:pictura.paleta}} oder als {{m3d:pictura.culoareProprie}}. Das Auge neben einem Platz blendet aus, was auf diesem Filament liegt. Bis zu 16 Plätze.

## Drucker und Anzahl der Farben

Unter {{m3d:pictura.imprimanta}} wählst du das Mehrfarbensystem - es folgt dem in den Editor-Einstellungen gewählten Drucker - und wie viele Farben es kann (AMS lite 4, AMS 4 pro Einheit, MMU3 5 und andere), oder eine Zahl von Hand. Hat das Modell mehr Farben, fasst {{m3d:pictura.reducere}} sie zu den nächstgelegenen Tönen zusammen, aus den verwendeten Farben oder den Filamenten der Werkstatt: Du kannst Farben fixieren, das Ergebnis vor dem Anwenden auf dem Modell sehen oder zwei Plätze von Hand zusammenlegen. {{m3d:pictura.estimari}} nennt Filamentwechsel, Materialverlust und Mehrzeit - als Richtwert, der Slicer entscheidet.

## Farbmuster

{{m3d:pictura.modele}} bemalt das ganze Modell, eine Farbe oder die Auswahl mit einem berechneten Muster: Streifen, Spirale, Karos, Punkte, Wellen, Zickzack, Verläufe, Tarnmuster, Marmor, Voronoi, Sechsecke, Holz, Schneeflocken, Herzen und Sterne. Größe, Winkel, Dichte, Seed und Projektion verändern es. Benannte Vorlagen (Wassermelone, Militär, Weihnachten, Galaxie, Zebra, Regenbogen, Weißer Marmor) bringen ihre Farben mit, und {{m3d:pictura.modeleleMele}} behält deine eigenen Kombinationen in diesem Browser.

## Bild auf dem Modell

{{m3d:pictura.imaginePeModel}} nimmt eine PNG-, JPG- oder SVG-Datei, reduziert sie auf wenige Filamentfarben (vorher und nachher nebeneinander) und projiziert sie aus deiner Blickrichtung: Wähle {{m3d:pictura.imagine}} ([[M]]) und klicke auf das Modell, dann stelle Breite, Drehung und Lage ein. Lade nur Bilder hoch, die du verwenden darfst. Große Dreiecke machen gezackte Ränder - zuerst unterteilen.

## Das Modell nachbessern

{{m3d:pictura.retusare}} bereitet das Netz vor: {{m3d:pictura.subdivizeazaSelectia}} teilt große Dreiecke bis zur gewählten Kantenlänge, ohne die Form zu ändern (bis zu zwei Millionen Dreiecke; die Datei wächst mit); {{m3d:pictura.repara}} verbindet doppelte Punkte, schließt kleine Löcher und dreht die Normalen nach außen; {{m3d:pictura.simplifica}} dünnt sehr große Modelle aus. Das neue Netz geht zurück in den Körper im Editor.

## Export und Druck bei uns

{{m3d:pictura.export}} schreibt ein 3MF mit der Farbe auf jedem Dreieck - für Bambu Studio und OrcaSlicer oder für PrusaSlicer - mit der Liste der Filamente in der Reihenfolge der Plätze. {{m3d:pictura.printeazaLaNoi}} schickt das farbige 3MF und die Filamentliste über das Angebotspanel an die Werkstatt. Farben, die die Werkstatt nicht vorrätig hat, werden markiert, mit den nächstgelegenen vorrätigen Filamenten und einem Knopf, der sie übernimmt.
