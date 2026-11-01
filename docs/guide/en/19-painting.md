---
title: Multicolour painting
summary: Colour a model triangle by triangle, with patterns and pictures, for as many filaments as your printer takes, and export a multicolour 3MF.
---

## Entering painting

{{m3d:pictura.tab}} is the third tab, next to {{ui:editor.modeGeometry}} and {{ui:editor.modeSketch}}. It takes the selected bodies, or every visible one when nothing is selected. On the start page, {{m3d:start.picturaIncearca}} opens a new design with a vase already in painting, and {{m3d:start.coloreazaTitlu}} opens one with your own STL, 3MF or OBJ - a 3MF that is already coloured keeps its colours.

Painting works on triangles. Every finished action is saved on the body and appears in the editor's history as {{m3d:pictura.aplicat}}. If you later change a body's shape in the 3D Editor, its colours no longer fit and are set aside; moving or turning the body keeps them.

## Brush, bucket, eyedropper and eraser

- {{m3d:pictura.pensula}} ([[B]]) colours the triangles under the circle. {{m3d:pictura.vizibil}} stays on the surface you see; {{m3d:pictura.prin}} reaches the far side too. Hold [[Shift]] to erase while painting.
- {{m3d:pictura.galeata}} ([[G]]) fills an area up to the sharp edges - the angle sets how sharp - or replaces one colour ({{m3d:pictura.aceeasiCuloare}}).
- {{m3d:pictura.pipeta}} ([[I]]) picks up the colour of a triangle.
- {{m3d:pictura.radiera}} ([[E]]) puts the base colour back.

Drag on the model to paint; drag beside it, or with the right button, to turn the view. [[Ctrl]]+[[Z]] undoes a painting step.

## Selecting with a rectangle or lasso

{{m3d:pictura.selectie}} ([[S]]) selects by drawing on the view: a rectangle or a free lasso, only the faces you see or also through the model. [[Shift]] adds, [[Alt]] removes, [[Esc]] clears. A selection takes {{m3d:pictura.culoarePeSelectie}}, a colour pattern or a subdivision on its own.

## Filaments and the workshop palette

On the right, every slot is a filament: slot 1 is the base colour of the body, the others are filaments 2, 3 and so on in the slicer. Click a slot to paint with it, then pick its colour from {{m3d:pictura.paleta}} or {{m3d:pictura.culoareProprie}}. The eye next to a slot hides what is on that filament, to check it. Up to 16 slots.

## Printer and number of colours

Under {{m3d:pictura.imprimanta}} you choose the multicolour system - it follows the printer chosen in the editor's settings - and how many colours it takes (AMS lite 4, AMS 4 per unit, MMU3 5 and others), or a number by hand. When the model has more colours, {{m3d:pictura.reducere}} merges them into the closest shades, from the colours used or from the workshop's filaments: you can pin colours that must stay, see the result on the model before applying it, or merge two slots by hand. {{m3d:pictura.estimari}} gives the filament changes, wasted material and extra time - approximate, the slicer decides.

## Colour patterns

{{m3d:pictura.modele}} paints the whole model, one colour or the selection with a pattern computed on the spot: stripes, spiral, checks, dots, waves, zigzag, gradients, camouflage, marble, Voronoi, hexagons, wood, snowflakes, hearts and stars. Size, angle, density, seed and projection change it. Named presets (Watermelon, Military, Christmas, Galaxy, Zebra, Rainbow, White marble) bring their colours along, and {{m3d:pictura.modeleleMele}} keeps your own combinations in this browser.

## Image on the model

{{m3d:pictura.imaginePeModel}} takes a PNG, JPG or SVG, reduces it to a few filament colours (before and after side by side) and projects it from the direction you look at: pick {{m3d:pictura.imagine}} ([[M]]) and click the model, then set the width, rotation and position. Only upload pictures you have the right to use. Large triangles make jagged edges - subdivide first.

## Touching up the model

{{m3d:pictura.retusare}} prepares the mesh: {{m3d:pictura.subdivizeazaSelectia}} splits large triangles down to the edge length you set, without changing the shape (up to two million triangles; the file grows with them); {{m3d:pictura.repara}} merges duplicate vertices, closes small holes and turns the normals outwards; {{m3d:pictura.simplifica}} thins out very large models. The new mesh goes back into the body in the editor.

## Export and printing with us

{{m3d:pictura.export}} writes a 3MF with the colour on every triangle - for Bambu Studio and OrcaSlicer, or for PrusaSlicer - with the list of filaments in slot order. {{m3d:pictura.printeazaLaNoi}} sends the coloured 3MF and the filament list to the workshop through the quote panel. Colours that are not in the workshop's stock are flagged, with the closest filaments in stock and a button that uses them.
