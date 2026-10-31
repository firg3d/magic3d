/**
 * NUCLEU — primitive 2D pe inele de puncte, comune aplicațiilor.
 *
 * Bucăți mici, dar folosite acum de mai mult de o aplicație: tiparele din Litere Fagure și
 * sistemul de agățare (core/geometry/agatare.ts, de unde le ia și Cutii Litere). Nu conțin
 * nicio decizie de produs — doar geometrie de care ai nevoie ca să descrii un contur.
 *
 * Convenția, aceeași peste tot în proiect: inelele se dau în sens TRIGONOMETRIC (arie semnată
 * pozitivă), fiindcă `new CrossSection(inele, 'Positive')` umple unde numărul de înfășurări e
 * pozitiv. Un inel dat invers devine gaură — ceea ce uneori chiar se vrea.
 */

export type Pt = [number, number];
export type Ring = Pt[];

/** rotația în jurul originii, ca funcție — o rotație păstrează sensul, deci și semnul ariei */
export const rotator = (unghiDeg: number) => {
  const a = (unghiDeg * Math.PI) / 180, cos = Math.cos(a), sin = Math.sin(a);
  return (x: number, y: number): Pt => [x * cos - y * sin, x * sin + y * cos];
};

/** poligon regulat cu N laturi, în sens trigonometric */
export function poligon(cx: number, cy: number, raza: number, laturi: number, faza = 0, rot = rotator(0)): Ring {
  const ring: Ring = [];
  for (let v = 0; v < laturi; v++) {
    const th = faza + (2 * Math.PI * v) / laturi;
    ring.push(rot(cx + raza * Math.cos(th), cy + raza * Math.sin(th)));
  }
  return ring;
}

/**
 * Câte laturi ia un cerc de raza dată, la aceeași toleranță de 0.05 mm cu care se aplatizează
 * conturul fontului. Numărul FIX ar fi o capcană: la pas mic ies mii de găuri, iar 28 de laturi
 * fiecare înseamnă zeci de mii de vârfuri degeaba — destule cât să termine heap-ul WASM.
 */
export const laturiCerc = (raza: number) => Math.max(8, Math.min(32, Math.ceil(raza * 8)));

/** aria cu semn a unui contur (pozitivă = sens trigonometric) */
export function arieRing(r: Ring): number {
  let a = 0;
  for (let i = 0; i < r.length; i++) { const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % r.length]; a += x1 * y2 - x2 * y1; }
  return a / 2;
}

/**
 * Centroidul unei secțiuni. Pentru o piesă de grosime uniformă, centrul de masă stă chiar
 * deasupra lui — nu e nevoie de nicio integrare pe volum.
 *
 * `toPolygons` dă conturile exterioare în sens trigonometric și găurile invers, deci golurile
 * intră cu semn negativ de la sine.
 */
export function centroid(cs: any): Pt {
  let a2 = 0, cx = 0, cy = 0;
  for (const ring of cs.toPolygons() as Ring[]) {
    for (let i = 0; i < ring.length; i++) {
      const [x1, y1] = ring[i], [x2, y2] = ring[(i + 1) % ring.length];
      const f = x1 * y2 - x2 * y1;
      a2 += f; cx += (x1 + x2) * f; cy += (y1 + y2) * f;
    }
  }
  return Math.abs(a2) < 1e-9 ? [0, 0] : [cx / (3 * a2), cy / (3 * a2)];
}
