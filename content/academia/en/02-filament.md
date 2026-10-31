---
slug: academy/which-filament-to-choose
titlu: "Filament: what to choose and what for"
h1: "Which filament to choose for 3D printing, and how to decide properly"
titluSeo: "Which filament for 3D printing — PLA, PETG, ABS, TPU | The 3D Academy"
metaDescriere: "PLA or PETG? Which filament survives a car in summer, which one fades in the sun, which one sells best. A practical guide to choosing filament by where the object ends up."
cuvinteCheie:
  - which filament for 3d printing
  - pla or petg
  - filament for outdoor use
  - petg vs pla differences
  - heat resistant filament
  - filament for keychains
capitol: 2
citire: 8
---

# Which filament to choose for 3D printing, and how to decide properly

Most guides about filament start with a table: melting temperature, tensile strength, modulus of elasticity. The table is correct and it helps you with nothing, because the question you are actually asking is not "which one has the higher modulus", but "does this object survive where it ends up".

So let us reverse the order. We do not start from the material, we start from the destination.

In our workshop we keep permanent stock of PLA, PETG, ASA, TPU, nylon and carbon-fibre composites, because each one solves something different. Below is how we decide which one goes into which order.

---

## The question that settles almost everything: where does the object end up?

**Does it stay indoors, at room temperature, out of the sun?** PLA. Do not overthink it. It is the cheapest, the easiest to print, it has the most colours and the best detail. Keychains, decorations, letters for shelves, toys, gifts, desk objects — they all go in PLA and you need nothing else.

**Does it live in a car?** Not PLA. This is the mistake that gets paid for most often, and it gets paid for at the first unhappy customer.

It deserves an explanation, because the number surprises everyone. PLA starts to soften at around 55–60 °C. The cabin of a car parked in the sun, in summer, in Romania, frequently reaches 60–70 °C, and the dashboard, where the sun hits directly, goes past 80. A PLA keychain left on the dashboard curls. A phone holder clipped to the vent sags and falls. That is not a printing fault, it is the wrong material.

For a car: PETG, which holds up to around 80 °C, or ASA, which holds more. PETG is the reasonable choice in most cases.

**Does it stay outdoors, in the sun, for months?** Here the problem is no longer heat, it is ultraviolet. PLA becomes brittle and fades. PETG holds up reasonably, but light colours change visibly over time. If the object has to look good in two years — house signs, garden markers, apartment numbers — the correct material is ASA. It is made exactly for that; it is the UV-resistant version of ABS.

Two recent orders from the workshop show why it matters. The first: a car boot latch clip that had broken and was no longer manufactured. We scanned the fragments, rebuilt the geometry and printed the replacement in ASA — the part lives outdoors, in sun and in frost, so PLA or PETG would have given up within a season. The second: a set of dashboard buttons for a Land Rover Defender, degraded over time, reproduced in black ASA as well. Here it is not only UV — it is also the cabin temperature, plus the fact that they are touched daily, so they must not polish up and must not deform. Both are cases where the choice of material is not a preference, it is the difference between a part that lasts and one that gets thrown away after four months.

**Does it have to bend without breaking?** TPU. Flexible, very resistant to wear, but it prints slowly and usually needs a direct extruder. Do not pick it because it is "tougher" in general — pick it only when you genuinely need flexibility.

**Does it have to take mechanical force or friction?** PETG is tougher than PLA: it bends before it breaks, instead of cracking suddenly. PLA is in fact stiffer and stronger in pure tension, but it gives way without warning. For functional parts, hooks and load-bearing brackets, PETG is the safer choice.

---

## The four materials, briefly

**PLA** is the material you learn with and the one you stay with for most decorative products. It prints at 200–220 °C, with the bed at 55–60. It needs no enclosure and it likes good cooling. It reproduces detail better than anything else affordable, and the silk, matte or glitter variants are the ones that sell visually. It has a single weakness, but a serious one: it does not take heat.

**PETG** is the material for objects that have to last. 230–250 °C at the nozzle, 70–85 at the bed. It sticks to the plate very well — so well that it is sometimes a problem, because it can tear pieces out of the surface; one solution is a layer of glue stick as a release coat. It strings more than PLA and it is more sensitive to moisture. Fine detail comes out slightly softer than with PLA. In exchange, it does not melt in a car and it does not snap suddenly.

**ABS and ASA** are the materials for harsh conditions. They take high temperatures, and ASA takes UV as well. But they need a closed enclosure, otherwise they warp guaranteed, they emit fumes that should not be inhaled, so you need ventilation, and they are considerably fussier to tune. Do not choose them unless you explicitly need them.

**TPU** is printable rubber. It comes in several hardnesses; the softer it is, the harder it is to print. It prints slowly, often below 30 mm/s, and it absorbs moisture quickly. It is worth it only when flexibility is the requirement.

---

## Moisture: the problem everyone underestimates

If you were to keep a single practical thing from this chapter, it would be this: **filament absorbs water from the air, and water ruins prints**.

When melted, the moisture in the filament turns to steam. The result is a combination of fine popping while printing, rough surfaces, strings between parts, layers that do not bond well, and visibly more fragile parts. People spend days adjusting temperatures and retractions, when the problem is a spool that spent three months open next to a window.

The order of sensitivity, from the most hygroscopic: nylon, TPU, PETG, PLA. Even PLA, which is the most tolerant, degrades visibly after a few months in open air, especially in a flat without dehumidification.

The solution is trivial and cheap. Spools are kept in sealed bags with silica gel, not on a shelf. Open spools are dried periodically, in a filament dryer or in an oven at low temperature, for a few hours. And if you print commercially, an active dryer that you feed from directly is one of the best investments under 100 euro that you can make.

---

## What matters when you sell

If you print in order to sell, the criteria shift a little. Strength stays important, but others appear.

**Colour matters more than you think.** A keychain in gold silk PLA sells better than the same keychain in matte grey PLA, at the same material cost. Visual effects — silk, matte, colour transitions, glow in the dark — are the cheapest differentiator you have.

**Consistency between spools is a real problem.** Same manufacturer, same colour, different batch: the shade can differ visibly. If you have an order for fifty identical pieces, you buy all the material at once. A customer who receives twenty pieces in one shade and thirty in another complains, and they are right.

**Cheap filaments cost more.** A spool with an inconsistent diameter produces intermittent under-extrusion. A spool with impurities blocks the nozzle. A badly wound spool tangles and stops the print at four in the morning, after eleven hours of work. The price difference between a mediocre filament and a good one is recovered at the first failed print.

**Filled materials eat nozzles.** Filaments with carbon fibre, wood, metal or glitter are abrasive and wear out a brass nozzle quickly — sometimes within a single spool. For those you need a hardened steel or ruby-tipped nozzle. If you do not change the nozzle, you will think the printer has broken.

---

## How much material actually goes into an object

A question that appears as soon as you start calculating prices: how much filament does a part consume?

The quick rule is that a small decorative object — a keychain, a letter, a tag — consumes somewhere between five and fifteen grams. A standard one-kilogram spool therefore means on the order of a hundred pieces, depending on size and infill.

But estimating in your head is almost always wrong, sometimes by a good factor. Infill, the number of walls, supports and the purge material at a colour change all change everything. The only number you can trust is the one the slicer gives you after it has actually sliced the model — and that is why any serious price calculation starts from the slicer, not from a geometric formula.

We come back to this in chapter four, where we discuss what happens when you no longer print one piece, but fifty.

---

## What comes next

The right material does not help if the printer cannot print it reliably. In the next chapter we discuss how to choose your machine — not by the specification list, but by what you want to do with it.
