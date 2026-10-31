/*
 * Formele de exemplu ale termoformarii, desenate aici din formule: nicio imagine sau model al
 * altcuiva. Inele cu y in sus, in unitati oarecare (geometria scaleaza la latimea ceruta).
 */

export type Inel = Array<[number, number]>;
export type FormaExemplu = "hexagon" | "inima" | "nor" | "stea" | "frunza";
export const FORME: FormaExemplu[] = ["hexagon", "inima", "nor", "stea", "frunza"];

const PUNCTE = 180;
const cerc = (n: number, f: (t: number) => [number, number]): Inel => Array.from({ length: n }, (_, i) => f((2 * Math.PI * i) / n));

/** Hexagonul Magic3D: sase laturi cu colturile rotunjite. */
function hexagon(): Inel {
  const raza = 1;
  const rotunjire = 0.12;
  const inel: Inel = [];
  for (let k = 0; k < 6; k += 1) {
    const unghi = (Math.PI / 3) * k + Math.PI / 6;
    // Centrul arcului de colt sta pe bisectoare, la distanta potrivita ca arcul sa atinga laturile.
    const d = raza - rotunjire / Math.cos(Math.PI / 6);
    const cx = d * Math.cos(unghi);
    const cy = d * Math.sin(unghi);
    for (let i = 0; i <= 8; i += 1) {
      const a = unghi - Math.PI / 6 + ((Math.PI / 3) * i) / 8;
      inel.push([cx + rotunjire * Math.cos(a), cy + rotunjire * Math.sin(a)]);
    }
  }
  return inel;
}

const inima = (): Inel => cerc(PUNCTE, (t) => [16 * Math.sin(t) ** 3, 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)]);

/** Norul: reuniunea a cinci cercuri, citita pe raze din centru (forma e "stelata" fata de el). */
function nor(): Inel {
  const cercuri: Array<[number, number, number]> = [[-0.55, -0.1, 0.38], [-0.15, 0.2, 0.48], [0.35, 0.15, 0.42], [0.7, -0.12, 0.3], [0.05, -0.2, 0.36]];
  return cerc(PUNCTE * 2, (t) => {
    const dx = Math.cos(t);
    const dy = Math.sin(t);
    let r = 0;
    for (const [cx, cy, raza] of cercuri) {
      // Raza din origine intersectata cu cercul: cea mai departata intersectie.
      const b = dx * cx + dy * cy;
      const c = cx * cx + cy * cy - raza * raza;
      const disc = b * b - c;
      if (disc >= 0) r = Math.max(r, b + Math.sqrt(disc));
    }
    return [r * dx, r * dy];
  });
}

function stea(): Inel {
  const inel: Inel = [];
  for (let i = 0; i < 10; i += 1) {
    const unghi = Math.PI / 2 + (Math.PI / 5) * i;
    const raza = i % 2 === 0 ? 1 : 0.55;
    inel.push([raza * Math.cos(unghi), raza * Math.sin(unghi)]);
  }
  return inel;
}

/** Frunza: varf ascutit intr-o parte, rotunda in cealalta, putin aplecata. */
function frunza(): Inel {
  const aplecare = Math.PI / 7;
  return cerc(PUNCTE, (t) => {
    const x = Math.cos(t);
    const y = 0.42 * Math.sin(t) * Math.sqrt((1 - Math.cos(t)) / 2);
    return [x * Math.cos(aplecare) - y * Math.sin(aplecare), x * Math.sin(aplecare) + y * Math.cos(aplecare)];
  });
}

export function formaExemplu(forma: FormaExemplu): Inel[] {
  switch (forma) {
    case "hexagon": return [hexagon()];
    case "inima": return [inima()];
    case "nor": return [nor()];
    case "stea": return [stea()];
    case "frunza": return [frunza()];
  }
}

/** Calea SVG a unor inele cu y in sus, incadrata in [0, latura] (pentru miniaturi si previzualizare). */
export function caleSvgInele(inele: Inel[], latura: number, margine = 0): { d: string; latime: number; inaltime: number } {
  const xs = inele.flat().map((p) => p[0]);
  const ys = inele.flat().map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const factor = (latura - 2 * margine) / Math.max(maxX - minX, maxY - minY, 1e-9);
  const latime = (maxX - minX) * factor + 2 * margine;
  const inaltime = (maxY - minY) * factor + 2 * margine;
  const d = inele
    .map((inel) => inel.map(([x, y], i) => `${i ? "L" : "M"}${((x - minX) * factor + margine).toFixed(2)} ${((maxY - y) * factor + margine).toFixed(2)}`).join("") + "Z")
    .join("");
  return { d, latime, inaltime };
}
