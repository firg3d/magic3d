---
slug: academy/why-3d-prints-fail
titlu: "The first print that fails, and why"
h1: "Why your 3D print fails and how to fix each problem"
titluSeo: "Why your 3D print fails — causes and fixes | The 3D Academy"
metaDescriere: "The print will not stick to the bed, the corners lift, the layers split. The real causes of the most common 3D printing problems and how to fix them, explained by a workshop that prints every day."
cuvinteCheie:
  - print not sticking to bed
  - why does my 3d print come off
  - 3d printing warping
  - 3d printing problems
  - split layers 3d print
  - corners lifting 3d print
capitol: 1
citire: 9
---

# Why your 3D print fails and how to fix each problem

Everyone who buys a 3D printer goes through the same week. The first print comes out well, because it is the test cube the manufacturer prepared with care. The second one comes out well too. And the third, the one that matters, the one you downloaded for someone in particular, comes off the bed halfway through and turns into a tangle of plastic.

That is where most of the people who give up start. Not because 3D printing is hard, but because the defects look spectacular and seem to come from nowhere. In reality there are five or six problems that repeat endlessly, each with a perfectly explainable mechanical or thermal cause, and once you recognise them by how they look, you fix them in minutes.

This chapter is organised by how the defect looks, not by its cause. That is how you search when you have the broken part in your hand.

---

## The print will not stick to the bed

It is problem number one and by far the most common. The first layer goes down but does not adhere: the strand of plastic drags behind the nozzle, gathers into blobs, or the part comes loose after a few minutes and starts wandering across the plate.

**The cause nobody checks first: grease.** You touched the plate with your fingers. The sebum from your skin is enough for the plastic not to grip, and it is invisible. The plate is washed with warm water and dish soap, rinsed, and wiped with a clean cloth. Isopropyl alcohol cleans dust, but it does not remove grease as well as detergent does. That is the first check, before any setting, and it solves a surprising number of cases.

**The second cause: the distance between nozzle and bed.** If the nozzle is too high, the plastic falls onto the plate instead of being pressed into it and does not make enough contact. If it is too low, the plastic is squashed, squeezes out sideways and leaves ridges behind. A correct first layer looks like a flattened band, with the edges just merging into each other, with no gaps and no raised ridges.

Modern printers level automatically, but automatic compensation does not mean there is nothing left to adjust. The Z offset remains, and it is set by hand, usually in steps of 0.02 mm, while you print a single-layer test square. It is worth doing that once, deliberately, looking at the result, instead of trusting the default value.

**The third: the bed temperature.** PLA sticks well at 55–60 °C. PETG wants 70–85 °C. If you changed the filament and forgot the profile, that is the explanation.

**The fourth: the type of plate.** A textured PEI plate holds PLA and PETG very well, but it needs heat to work. A smooth plate demands an impeccably clean surface. And older plates, with adhesive or tape, lose their grip over time and have to be replaced — that is not a fault, it is a consumable.

If you have checked all of that and the part has a small base or sharp corners, add a **brim**: a few contours attached to the part, in the same layer, which increase the contact area. They snap off with a fingernail at the end. It is the solution people avoid because it feels like cheating, but in production it is used all the time.

---

## The corners lift off the plate

The part does not come off completely, but the corners curl upwards and the base is no longer flat. The phenomenon is called *warping* and it is strictly a problem of thermal contraction.

The plastic leaves the nozzle hot and contracts as it cools. The bottom layers, stuck to the plate, cannot contract freely. The layers above them cool down and pull on them. When the pulling force exceeds the adhesion, the corner lifts — and it always lifts at the corners, because that is where the stress concentrates.

How bad it gets depends directly on the material. PLA contracts little and rarely warps. PETG does it more often. ABS and ASA do it almost always, unless you have a closed enclosure.

What helps, in order of effectiveness:

**A draught of cold air** over the printer is the most underestimated culprit. An open window behind the table, or an air conditioner blowing that way, ruins prints without you understanding why, and the problem appears intermittently, which makes it even harder to diagnose. An open printer should not stand in a draught.

**A bed 5–10 °C hotter** keeps the base warm for longer and reduces the stress.

**Weaker cooling** on the first layers. The part fan is useful for detail and for bridges, but on the first layers it works against you. Most good profiles keep it off for the first layer and ramp it up gradually.

**An enclosure**, even an improvised one, for the materials that genuinely need it. For ABS it is not optional. For PETG it is a bonus. For PLA it is often counterproductive, because PLA needs good cooling.

And if the part has square corners and still warps, a one-millimetre fillet at the base, added in the model, changes a lot — the stress no longer has anywhere to concentrate.

---

## The layers split

The part comes out to size, looks acceptable, but breaks easily between layers, like a sheet coming apart into slices. Sometimes you can see it with the naked eye: horizontal whitish lines on the walls.

That is **delamination**, and it means the layers have not welded to each other. The molten plastic has to partially remelt the layer beneath it in order to bond to it. If that does not happen, you have a stack of overlapping strands, not an object.

**A nozzle temperature that is too low** is the most frequent cause. Every spool is slightly different, even in the same material and from the same manufacturer. If you print PLA at 200 °C and it splits, go up to 210–215 and test again. The difference is immediately visible.

**Wet filament** is the second cause, and the one almost nobody suspects. Plastic absorbs moisture from the air. When melted, the water turns to steam, leaves the nozzle as tiny explosions — you hear fine popping while printing — and ruins the bond between layers. PETG, nylon and TPU absorb quickly; PLA more slowly, but it absorbs too. A filament kept three months on a shelf, in a flat in Bucharest in summer, is wet. It is dried in a filament dryer, or in an oven at low temperature, for a few hours.

**Cooling that is too strong** chills the layer before it has a chance to bond. If you print PETG with the fan at 100%, bring it down to 30–50%.

**Speed that is too high** for the chosen temperature produces the same effect: the plastic has no time to bond. Speed and temperature go together — if you raise one, you have to raise the other.

---

## Thin strings between parts

The part is fine, but between the walls and between the objects on the plate there are fine strands of plastic, like a spider web. It is called *stringing*, and it does not affect strength, but it ruins the appearance — and if you are selling, the appearance is the product.

It happens because plastic oozes from the nozzle when it should not, during travel moves. It is fought with **retraction**: the extruder pulls the filament back a few millimetres before travelling.

If you have stringing, check in this order: **filament moisture**, again — it is the most common and most ignored cause; **too high a temperature**, which makes the plastic too fluid, so drop it by 5–10 °C; and **the retraction distance**, which differs a lot between a direct extruder and a Bowden one.

PETG strings more than PLA by its nature. You do not eliminate it completely, you reduce it until it becomes negligible, and the rest is cleaned off with a heat gun passed quickly over the part.

---

## The base is wider than the rest

The first layers bulge outwards, like an elephant's foot — hence the name, *elephant foot*. The part no longer fits the socket it was designed for, and on keychains and tags it shows immediately.

The cause is that the first layer is pressed too hard into the plate, or that the bed is too hot and the plastic at the bottom stays soft under the weight of the layers above.

You raise the Z offset slightly, drop the bed temperature by 5 °C after the first layers, or use the first-layer compensation that most slicers have — a small negative value, around 0.1–0.2 mm, which shrinks the bottom contour by exactly the right amount.

---

## The walls have gaps, or the strand is missing in places

The extruder makes a rhythmic clicking sound, the walls have thin or missing sections, and the infill looks broken. This is **under-extrusion**: less plastic comes out than the model asks for.

Most often, **the nozzle is partly blocked**. It is cleaned with a brass brush and a cold pull, or replaced — nozzles are cheap consumables and, if you print with filled filaments, they wear out faster than you think.

In second place, **wet filament** again. In third, **the extruder wheel tension**, either too weak to push or so tight that it flattens the filament. And if you print fast with a 0.4 mm nozzle, you may simply be asking for more flow than the heat block can melt.

---

## The part is shifted in the middle

The print goes well up to a point, and then everything above it is offset sideways by a few millimetres. This is *layer shifting*, and it is a mechanical problem, not a settings one.

Either the head hit something — a part that came loose, a blob of plastic — and lost steps. Or a belt is slack. Or a wheel is jammed or worn. Or you are printing faster than the mechanics accept, with accelerations that make the motors lose steps.

Check the mechanics first: the belts should sound like a taut string, not slack. Then reduce the speed by 20–30% and test. If the problem disappears, the mechanics need adjusting, not a more aggressive profile.

---

## How to approach any new defect

There is a single rule that saves hours: **change one thing at a time**. When a print fails, the temptation is to change temperature, speed, cooling and retraction all at once. If it works, you do not know what worked. If it does not, you do not know what you broke.

Print a small test object, not the real part. A 20 mm cube or a temperature tower gives you the answer in twenty minutes, not in six hours.

And write down what works. A notebook, a file, anywhere: material, manufacturer, nozzle temperature, bed temperature, speed. In three months, when you buy another spool of the same material and it comes out badly, you have something to compare against. Workshops that work consistently are not lucky — they have notes.

---

## What comes next

Many of the problems above share the same root: the wrong material for what you want to make, or the right material kept in the wrong conditions. In the next chapter we take the filaments one by one and judge them by a single practical question — where the object ends up after it leaves the printer.
