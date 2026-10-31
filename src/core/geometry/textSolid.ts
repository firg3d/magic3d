/**
 * SOLIDUL DIN FONT — o singură copie, folosită de toate aplicațiile.
 *
 * A stat până la 2026-08-01 în trei copii (apps/litere, apps/brelocuri, apps/fagure), fiindcă
 * izolarea interzice importul dintr-o altă aplicație (src/_tests/isolation.test.ts). Copiile au
 * divergit exact cum era de așteptat: corecția de capHeight de la PASUL 5 a ajuns în două din
 * trei, iar în aplicația de litere Courgette a rămas de 5,2× prea mare. Regula de izolare
 * permite `apps/* -> core/*`; aici e locul potrivit.
 *
 * Ce NU intră aici: praguri, mesaje și decizii de produs. Fișierul întoarce geometrie și
 * măsurători; fiecare aplicație judecă singură ce e acceptabil.
 *
 * SPIKE de validare — o singură funcție: textSolid()
 *
 * Întrebarea la care răspunde acest fișier: se poate obține geometrie 3D
 * validă (2-manifold închis) din contururile unui font cursiv, unde literele
 * se suprapun?
 *
 * Pipeline (pașii din task, în ordine):
 *   1. font.getPath()          -> comenzi Bézier
 *   2. flatten                 -> segmente drepte, toleranță 0.05 mm la scara finală
 *   3. group + orient          -> poligoane cu găuri, orientare după ARIA SEMNATĂ
 *   4. union (polygon-clipping) -> PASUL CRITIC: dizolvă suprapunerile
 *   5. scale                   -> după capHeight, nu după bounding box
 *   6. earcut                  -> triunghiuri față frontală
 *   7. extrude                 -> față + spate + pereți laterali
 *   8. Manifold din mesh
 *   9. status() check
 *
 * Notă despre scală: pasul 5 (scale după capHeight) e aplicat DEVREME, la
 * getPath, ca toate coordonatele să fie deja în mm. Toleranța de flatten și
 * union-ul lucrează astfel direct la scara finală, exact cum cere task-ul.
 */

import { t } from '../i18n/index.js';
import polygonClipping from 'polygon-clipping';
import earcut from 'earcut';

// -------- tipuri locale --------
type Pt = [number, number];
type Ring = Pt[];
// Un poligon = inel exterior + zero sau mai multe găuri.
type PolyWithHoles = Ring[]; // [outer, hole1, hole2, ...]

export interface SolidReport {
  capHeightFontUnits: number;
  scaleMmPerFontUnit: number;
  flattenToleranceMm: number;
  /** cât se mută cursorul după tot textul, în mm — pentru cine așază mai multe bucăți în rând */
  advanceMM?: number;
  ringsIn: number;          // câte inele închise au ieșit din flatten
  solidsIn: number;         // câte inele solide (după containment)
  holesIn: number;          // câte inele-gaură (după containment)
  ringsAfterUnion: number;  // câte inele au ieșit din union (outer + holes)
  polysAfterUnion: number;  // câte poligoane distincte după union (după filtrarea sliverelor)
  sliversRemoved: number;   // poligoane cu arie < prag, eliminate după union
  sliverThresholdMm2: number;
  areaInputMm2: number;     // suma ariilor nete ale poligoanelor INTRATE (cu suprapuneri numărate de mai multe ori)
  areaOutputMm2: number;    // aria netă după union (suprapunerile dizolvate)
  triangles: number;
  vertices: number;
  rawBoundaryEdges: number;    // muchii de frontieră în mesh-ul BRUT (0 = închis)
  rawNonManifoldEdges: number; // muchii orientate duplicate (0 = 2-manifold)
  rawClosed: boolean;          // verificare independentă de manifold-3d
  polysDeRezerva?: number;     // poligoane construite cu triangulatorul manifold (earcut a cedat)
  failedStep?: string;
  // --- INTEGRITATE per glifă (mereu populate) ---
  glyphsRequested?: number;    // glife vizibile cerute (fără spații)
  glyphsWithGeom?: number;     // glife care au produs geometrie
  missingGlyphs?: string[];    // caractere vizibile FĂRĂ geometrie (glifă pierdută)
  glyphReport?: { char: string; hasGeom: boolean; area: number }[];
  sliversDetail?: { area: number; x: number; y: number }[]; // slivere eliminate: arie + poziție
  // --- DIAGNOSTIC (opțional): setează debug=true ca să capturezi valori pe etape ---
  debug?: boolean;
  dbg?: any;                   // { rings, input, unionRaw, union } cu bbox-uri
}

// Modulul Manifold WASM, injectat o singură dată de spike.ts.
// (Semnătura cerută pentru textSolid nu îl include, deci îl ținem la nivel de modul.)
let MOD: any = null;
export function configureManifold(mod: any) {
  MOD = mod;
}

// =====================================================================
// PASUL 1 + 2 — getPath + flatten adaptiv la toleranță în mm
// =====================================================================

/** distanța punct-segment, pentru metrica de planaritate a curbelor */
function distPointToSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function flattenCubic(
  out: Ring, x0: number, y0: number, x1: number, y1: number,
  x2: number, y2: number, x3: number, y3: number, tol: number, depth = 0,
) {
  // planaritate: distanța max a punctelor de control față de coardă
  const d1 = distPointToSeg(x1, y1, x0, y0, x3, y3);
  const d2 = distPointToSeg(x2, y2, x0, y0, x3, y3);
  if (depth > 32 || (d1 <= tol && d2 <= tol)) {
    out.push([x3, y3]);
    return;
  }
  // subdiviziune de Casteljau la t = 0.5
  const x01 = (x0 + x1) / 2, y01 = (y0 + y1) / 2;
  const x12 = (x1 + x2) / 2, y12 = (y1 + y2) / 2;
  const x23 = (x2 + x3) / 2, y23 = (y2 + y3) / 2;
  const xa = (x01 + x12) / 2, ya = (y01 + y12) / 2;
  const xb = (x12 + x23) / 2, yb = (y12 + y23) / 2;
  const xm = (xa + xb) / 2, ym = (ya + yb) / 2;
  flattenCubic(out, x0, y0, x01, y01, xa, ya, xm, ym, tol, depth + 1);
  flattenCubic(out, xm, ym, xb, yb, x23, y23, x3, y3, tol, depth + 1);
}

function flattenQuadratic(
  out: Ring, x0: number, y0: number, cx: number, cy: number,
  x1: number, y1: number, tol: number, depth = 0,
) {
  const d = distPointToSeg(cx, cy, x0, y0, x1, y1);
  if (depth > 32 || d <= tol) {
    out.push([x1, y1]);
    return;
  }
  const x01 = (x0 + cx) / 2, y01 = (y0 + cy) / 2;
  const x12 = (cx + x1) / 2, y12 = (cy + y1) / 2;
  const xm = (x01 + x12) / 2, ym = (y01 + y12) / 2;
  flattenQuadratic(out, x0, y0, x01, y01, xm, ym, tol, depth + 1);
  flattenQuadratic(out, xm, ym, x12, y12, x1, y1, tol, depth + 1);
}

/**
 * Transformă comenzile opentype (deja în mm — vezi nota despre scală) în
 * inele închise de puncte drepte.
 */
function commandsToRings(commands: any[], tol: number): Ring[] {
  const rings: Ring[] = [];
  let cur: Ring = [];
  let startX = 0, startY = 0, curX = 0, curY = 0;

  const closeCurrent = () => {
    if (cur.length >= 2) {
      // scoate punctul de închidere duplicat, dacă există
      const first = cur[0], last = cur[cur.length - 1];
      if (first[0] === last[0] && first[1] === last[1]) cur.pop();
      if (cur.length >= 3) rings.push(cur);
    }
    cur = [];
  };

  for (const c of commands) {
    switch (c.type) {
      case 'M':
        closeCurrent();
        cur = [[c.x, c.y]];
        startX = curX = c.x; startY = curY = c.y;
        break;
      case 'L':
        cur.push([c.x, c.y]);
        curX = c.x; curY = c.y;
        break;
      case 'Q':
        flattenQuadratic(cur, curX, curY, c.x1, c.y1, c.x, c.y, tol);
        curX = c.x; curY = c.y;
        break;
      case 'C':
        flattenCubic(cur, curX, curY, c.x1, c.y1, c.x2, c.y2, c.x, c.y, tol);
        curX = c.x; curY = c.y;
        break;
      case 'Z':
        closeCurrent();
        curX = startX; curY = startY;
        break;
    }
  }
  closeCurrent();
  return rings;
}

// =====================================================================
// PASUL 3 — grupare în poligoane cu găuri, orientare după aria semnată
//
// NU presupunem convenția fontului (TrueType outer=CW, PostScript=CCW sunt
// opuse). Determinăm solid-vs-gaură prin CONTAINMENT (paritatea adâncimii de
// imbricare), apoi normalizăm winding-ul după ARIA SEMNATĂ.
// =====================================================================

function signedArea(r: Ring): number {
  let a = 0;
  for (let i = 0, n = r.length; i < n; i++) {
    const [x1, y1] = r[i];
    const [x2, y2] = r[(i + 1) % n];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

function pointInRing(px: number, py: number, r: Ring): boolean {
  let inside = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i];
    const [xj, yj] = r[j];
    const intersect = (yi > py) !== (yj > py) &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Containment RING-vs-RING (nu punct-vs-inel).
 * Contururile unei glife NU se intersectează: sunt fie disjuncte, fie imbricate.
 * Deci „a e în b" se decide testând VÂRFURI ale lui a în b; votăm pe mai multe
 * vârfuri ca să fim robuști dacă unul cade numeric chiar pe muchia lui b.
 *
 * ATENȚIE (cauza bugului „A rămâne doar cu traversa"): NU folosi un punct din
 * INTERIORUL UMPLUT al lui a (ex. centroidul unui triunghi de la earcut). Pentru
 * un contur exterior care încercuiește o contra-formă (A, B, D, O, P, Q, R, 0, 6, 8, 9)
 * acel punct poate cădea FIX în contra-formă -> adâncime impară -> conturul exterior
 * e clasificat drept gaură, e aruncat, și rămâne doar contra-forma.
 */
function ringInsideRing(a: Ring, b: Ring): boolean {
  const n = a.length;
  if (n < 3 || b.length < 3) return false;
  // Imbricare ADEVĂRATĂ = tot CONTURUL lui a e în b. Eșantionăm de-a lungul MUCHIILOR,
  // nu doar vârfurile: unele fonturi (ex. Baloo 2 „A") desenează glifa din trăsături care
  // se suprapun — traversa lui „A" are toate VÂRFURILE îngropate în picioarele lui Λ, dar
  // mijlocul ei trece prin gol. Testată doar pe vârfuri ar fi declarată gaură și ar fi
  // scăzută (traversă dispărută + crestături în picioare).
  // Tolerăm câteva puncte în afară (contur-gaură care atinge tangent conturul exterior).
  const SAMPLES = 32;
  let inside = 0;
  for (let s = 0; s < SAMPLES; s++) {
    const t = (s / SAMPLES) * n;
    const i = Math.floor(t) % n, f = t - Math.floor(t);
    const p0 = a[i], p1 = a[(i + 1) % n];
    if (pointInRing(p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f, b)) inside++;
  }
  return inside >= SAMPLES * 0.9;
}

function forceWinding(r: Ring, wantPositive: boolean): Ring {
  const a = signedArea(r);
  const positive = a > 0;
  if (positive !== wantPositive) return r.slice().reverse();
  return r;
}

/**
 * Grupează inelele brute în poligoane [outer, ...holes] folosind adâncimea de
 * imbricare. Adâncime pară => solid, impară => gaură.
 */
function groupIntoPolygons(rings: Ring[]): PolyWithHoles[] {
  const depth = rings.map((r, i) => {
    let d = 0;
    for (let k = 0; k < rings.length; k++) {
      if (k === i) continue;
      if (ringInsideRing(r, rings[k])) d++;
    }
    return d;
  });

  const solids: number[] = [];
  const holes: number[] = [];
  rings.forEach((_, i) => (depth[i] % 2 === 0 ? solids : holes).push(i));

  // fiecare gaură intră în cel mai mic solid care o conține
  const polys: PolyWithHoles[] = solids.map((si) => [forceWinding(rings[si], true)]);
  for (const hi of holes) {
    let best = -1, bestArea = Infinity;
    for (let s = 0; s < solids.length; s++) {
      const si = solids[s];
      if (ringInsideRing(rings[hi], rings[si])) {
        const area = Math.abs(signedArea(rings[si]));
        if (area < bestArea) { bestArea = area; best = s; }
      }
    }
    if (best >= 0) polys[best].push(forceWinding(rings[hi], false));
  }
  return polys;
}

// =====================================================================
// PASUL 6 + 7 — earcut + extrudare, cu vârfuri PARTAJATE (indici comuni)
// între față/spate/pereți, ca mesh-ul să iasă închis (2-manifold).
// =====================================================================

interface MeshBuild {
  verts: number[];   // x,y,z, x,y,z, ...
  tris: number[];    // i0,i1,i2, ...
}

/**
 * Extrudează un poligon în `mb`. Întoarce FALSE și nu scrie nimic dacă earcut nu a
 * triangulat tot capacul — cazul se rezolvă pe calea de rezervă (vezi PASUL 8).
 */
function extrudePolygon(poly: PolyWithHoles, thickness: number, mb: MeshBuild, dbgEarcut?: any[]): boolean {
  // Normalizează: outer CCW (arie pozitivă), găuri CW (arie negativă).
  const outer = forceWinding(poly[0], true);
  const holes = poly.slice(1).map((h) => forceWinding(h, false));
  const allRings = [outer, ...holes];

  const flat: number[] = [];        // pentru earcut: x,y,x,y,...
  const holeStarts: number[] = [];
  let localCount = 0;
  allRings.forEach((ring, ri) => {
    if (ri > 0) holeStarts.push(localCount);
    for (const [x, y] of ring) { flat.push(x, y); localCount++; }
  });

  // Față frontală (z = thickness): winding earcut ca atare (CCW -> normală +z).
  const tri = earcut(flat, holeStarts.length ? holeStarts : undefined, 2);

  // O triangulare COMPLETĂ a unui poligon cu n vârfuri și h găuri dă exact n + 2h − 2
  // triunghiuri. Mai puține înseamnă că earcut a renunțat la o bucată de suprafață —
  // se întâmplă când două inele se ating într-un vârf, sau când o gaură e coliniară cu
  // puntea pe care earcut o trage spre conturul exterior. Capacul ar rămâne găurit și
  // mesh-ul deschis, așa că refuzăm rezultatul și lăsăm calea de rezervă să preia.
  const triAsteptate = localCount + 2 * holeStarts.length - 2;
  const complet = tri.length / 3 >= triAsteptate;
  if (dbgEarcut) dbgEarcut.push({ varfuri: localCount, gauri: holeStarts.length, triAsteptate, triObtinute: tri.length / 3 });
  if (!complet) return false;

  // Alocă doi indici (top la z=thickness, bot la z=0) pentru fiecare punct,
  // PARTAJAȚI între triangulare și pereți -> muchii comune -> mesh închis.
  const topIdx: number[][] = [];
  const botIdx: number[][] = [];
  for (const ring of allRings) {
    const t: number[] = [], b: number[] = [];
    for (const [x, y] of ring) {
      const ti = mb.verts.length / 3;
      mb.verts.push(x, y, thickness);
      const bi = mb.verts.length / 3;
      mb.verts.push(x, y, 0);
      t.push(ti); b.push(bi);
    }
    topIdx.push(t); botIdx.push(b);
  }

  // Concatenare locală -> global, pentru maparea indicilor earcut.
  const localToTop: number[] = [];
  const localToBot: number[] = [];
  for (let ri = 0; ri < allRings.length; ri++) {
    for (let k = 0; k < allRings[ri].length; k++) {
      localToTop.push(topIdx[ri][k]);
      localToBot.push(botIdx[ri][k]);
    }
  }

  for (let i = 0; i < tri.length; i += 3) {
    const a = tri[i], b = tri[i + 1], c = tri[i + 2];
    mb.tris.push(localToTop[a], localToTop[b], localToTop[c]);
    // Față dorsală (z = 0): winding inversat -> normală -z.
    mb.tris.push(localToBot[a], localToBot[c], localToBot[b]);
  }

  // Pereți laterali: pentru fiecare muchie A->B a fiecărui inel, două
  // triunghiuri. Regula e uniformă; winding-ul inelelor (outer CCW / hole CW)
  // face ca normalele să iasă consistent spre exterior.
  for (let ri = 0; ri < allRings.length; ri++) {
    const t = topIdx[ri], b = botIdx[ri];
    const n = t.length;
    for (let k = 0; k < n; k++) {
      const k2 = (k + 1) % n;
      const A0 = b[k], B0 = b[k2], B1 = t[k2], A1 = t[k];
      // [A0,B0,B1] și [A0,B1,A1] -> normală = T*(dy,-dx,0), spre exterior
      mb.tris.push(A0, B0, B1);
      mb.tris.push(A0, B1, A1);
    }
  }
  return true;
}

// =====================================================================
// SCALA — cap height în unități de font
// =====================================================================

/**
 * Înălțimea de cap a fontului, în unități de font. Asta e referința după care se scalează
 * textul: „40 mm" înseamnă 40 mm de la linia de bază la vârful unei majuscule, nu 40 mm de
 * bounding box (care ar face fiecare font altă mărime, după cât de mult coboară „g"-ul).
 *
 * `sCapHeight` din OS/2 e o valoare DECLARATĂ, și unele fonturi o declară greșit: Courgette
 * spune 301 la unitsPerEm 2048 (raport 0.147), în timp ce „H" măsurat are 1564. Luată de bună,
 * litera iese de 5.2 ori mai mare decât cât s-a cerut. Cap height-ul real e între 0.4 și 1.0
 * din em la orice font tipografic; în afara benzii, valoarea declarată se ignoră și se măsoară „H".
 *
 * Exportată fiindcă orice cod care traduce între milimetri și mărimea de font (ex. „ce înălțime
 * scoate un breloc de 70 mm lungime") trebuie să folosească EXACT aceeași scală ca textSolid.
 * A doua copie a regulii ar produce o nepotrivire tăcută între ce se cere și ce iese.
 */
/**
 * Sub pragul ăsta, un „H" măsurat mai scurt decât cap height-ul declarat înseamnă că
 * declarația e greșită, nu că fontul e special.
 *
 * Verificarea e cu un singur sens, și asta contează. Un „H" mai ÎNALT decât cap height-ul
 * declarat e normal la fonturile caligrafice, unde majuscula are florituri care urcă peste
 * linia de cap — 31 de fonturi din catalog sunt peste 1.05, până la 1.53. Un „H" mai SCURT
 * n-are nicio explicație tipografică: „H" e drept, fără depășire de rotunjire, deci ar trebui
 * să atingă exact linia de cap.
 *
 * Pragul vine din măsurătoare, nu din intuiție. Pe cele 435 de fonturi din catalog care chiar
 * folosesc `sCapHeight`, raportul H_măsurat/declarat arată așa:
 *     0.601  NanumPenScript      <- singurul rupt
 *     0.919  PixelifySans        <- font de pixeli, înălțimi cuantizate
 *     0.952  Mitr
 *     0.985+ tot restul
 * Între 0.60 și 0.92 nu există nimic. Orice prag din golul acela separă cazul stricat de
 * fonturile sănătoase; 0.85 stă la mijloc, cu marjă de ambele părți.
 */
const PRAG_CAP_CONTRAZIS = 0.85;

/** înălțimea reală a lui „H", în unități de font (0 dacă fontul n-are glifa) */
function inaltimeHMasurata(font: any): number {
  try {
    const g = font.charToGlyph('H');
    const bb = g && g.getBoundingBox ? g.getBoundingBox() : null;
    return bb && bb.y2 > bb.y1 ? bb.y2 - bb.y1 : 0;
  } catch { return 0; }
}

export function capHeightUnitati(font: any): number {
  const unitsPerEm: number = font.unitsPerEm;
  const os2 = font.tables && font.tables.os2;
  const declarat = os2 && os2.sCapHeight ? os2.sCapHeight : 0;
  let capHeight = declarat >= 0.4 * unitsPerEm && declarat <= unitsPerEm ? declarat : 0;
  const hMasurat = inaltimeHMasurata(font);
  // valoarea declarată e în bandă, dar o contrazice glifa: măsurătoarea are ultimul cuvânt
  if (capHeight > 0 && hMasurat > 0 && hMasurat < PRAG_CAP_CONTRAZIS * capHeight) capHeight = hMasurat;
  if (!capHeight || capHeight <= 0) capHeight = hMasurat;
  if (!capHeight || capHeight <= 0) capHeight = unitsPerEm * 0.7;
  return capHeight;
}

// =====================================================================
// FUNCȚIA PRINCIPALĂ
// =====================================================================

export function textSolid(
  font: any,
  text: string,
  inaltimeMM: number,
  grosimeMM: number,
  report?: Partial<SolidReport>,
  tolMmOverride?: number, // opțional: pentru diagnostic de toleranță de aplatizare
): any {
  if (!MOD) throw new Error(t('geometry.manifoldNeconfigurat', { functie: 'textSolid' }));
  const { Manifold, Mesh, CrossSection } = MOD;
  const rep: any = report ?? {};

  const stepFail = (step: string, msg: string): never => {
    rep.failedStep = step;
    throw new Error(`[${step}] ${msg}`);
  };

  // ---- PASUL 5 (aplicat devreme): scală după capHeight, nu bounding box ----
  const unitsPerEm: number = font.unitsPerEm;
  const capHeight = capHeightUnitati(font);

  const scale = inaltimeMM / capHeight;          // mm per unitate de font
  const fontSizePx = inaltimeMM * unitsPerEm / capHeight; // getPath -> deja mm
  const tolMm = tolMmOverride ?? 0.05;           // toleranță la scara finală

  rep.capHeightFontUnits = capHeight;
  rep.scaleMmPerFontUnit = scale;
  rep.flattenToleranceMm = tolMm;
  // AVANSUL întregului text, la scara finală. Cine compune un cuvânt din mai multe bucăți — o
  // grupă de litere, apoi un simbol, apoi altă grupă — are nevoie să știe unde se termină una
  // ca să înceapă următoarea. Calculat de font, nu din bounding box: al doilea ar lipi literele
  // de simbol, fiindcă nu conține nici aerul lateral, nici coada care iese din ultima glifă.
  try { rep.advanceMM = font.getAdvanceWidth(text, fontSizePx); } catch { /* font fără metrici */ }

  // --- DIAGNOSTIC: colector pe etape (activ doar cu debug=true) ---
  const dbg: any = rep.debug ? (rep.dbg = {}) : null;
  const bbox = (r: Ring) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of r) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return { x0: +x0.toFixed(1), x1: +x1.toFixed(1), y0: +y0.toFixed(1), y1: +y1.toFixed(1), w: +(x1 - x0).toFixed(1), h: +(y1 - y0).toFixed(1) };
  };

  // ---- PAȘII 1+2+3: PER GLIFĂ ----
  // Contururile se obțin PER CARACTER (getPaths), cu poziționarea din advance
  // width + kerning IDENTICĂ cu getPath (ambele folosesc același forEachGlyph).
  // Paritatea solid/gaură se calculează SEPARAT în interiorul fiecărei glife:
  // între glife suprapunerea e accidentală, nu ierarhică, deci o paritate globală
  // ar clasifica greșit conturul exterior al unei litere suprapuse drept gaură.
  // forEachGlyph dă glifa ȘI poziția ei într-o SINGURĂ trecere (aceeași folosită
  // intern de getPath) — kerning + advance + features (ligaturi) identice, iar
  // glifa și conturul ei rămân ALINIATE (getPaths + stringToGlyphs separat pot
  // diverge când fontul aplică ligaturi).
  const glyphItems: { glyph: any; path: any }[] = [];
  try {
    font.forEachGlyph(text, 0, 0, fontSizePx, undefined, (glyph: any, gx: number, gy: number, gfs: number) => {
      glyphItems.push({ glyph, path: glyph.getPath(gx, gy, gfs) });
    });
  } catch (e: any) {
    stepFail('1-getPath', e?.message ?? String(e));
  }

  const inputPolys: PolyWithHoles[] = [];
  let ringsTotal = 0;
  const glyphReport: { char: string; hasGeom: boolean; area: number }[] = [];
  const dbgRings: any[] = [];
  for (let gi = 0; gi < glyphItems.length; gi++) {
    const g = glyphItems[gi].glyph;
    const uni: number | undefined = g && (g.unicode ?? (g.unicodes && g.unicodes[0]));
    const char = uni != null ? String.fromCodePoint(uni) : (g?.name || '?');
    const isVisible = uni != null && !/\s/u.test(String.fromCodePoint(uni));
    // PASUL 2: flatten per glifă
    const gRings = commandsToRings(glyphItems[gi].path.commands, tolMm);
    ringsTotal += gRings.length;
    // PASUL 3: grupare (paritate) DOAR în interiorul acestei glife
    const gPolys = gRings.length ? groupIntoPolygons(gRings) : [];
    const gArea = gPolys.reduce((s, p) => s + Math.abs(signedArea(p[0])) - p.slice(1).reduce((h, r) => h + Math.abs(signedArea(r)), 0), 0);
    for (const p of gPolys) inputPolys.push(p);
    if (isVisible) glyphReport.push({ char, hasGeom: gArea > 1e-6, area: +gArea.toFixed(2) });
    if (dbg) {
      // clasificarea per inel, în interiorul glifei (aceeași regulă ca groupIntoPolygons)
      gRings.forEach((r, i) => {
        let depth = 0;
        for (let k = 0; k < gRings.length; k++) if (k !== i && ringInsideRing(r, gRings[k])) depth++;
        dbgRings.push({ gi, char, ...bbox(r), area: +signedArea(r).toFixed(1), depth, kind: depth % 2 === 0 ? 'SOLID' : 'HOLE' });
      });
    }
  }
  rep.ringsIn = ringsTotal;
  if (ringsTotal === 0) stepFail('2-flatten', t('geometry.zeroInele'));

  // INTEGRITATE: două feluri de literă pierdută, amândouă trebuie prinse.
  //  (a) fontul NU ARE glifa — `forEachGlyph` întoarce `.notdef`, care n-are `unicode`,
  //      deci nu apărea deloc în raport și caracterul dispărea în tăcere („Ștefan" ieșea
  //      „tefan" în fonturile fără Ș). Se verifică direct pe textul CERUT.
  //  (b) fontul are glifa, dar ea nu produce geometrie (bugul de clasificare a contururilor).
  const cerute = [...text].filter((ch) => !/\s/u.test(ch));
  const faraGlifa = cerute.filter((ch) => font.charToGlyphIndex(ch) === 0);
  const raport = [...faraGlifa.map((char) => ({ char, hasGeom: false, area: 0 })), ...glyphReport];
  rep.glyphReport = raport;
  rep.glyphsRequested = cerute.length;
  rep.glyphsWithGeom = raport.filter((x) => x.hasGeom).length;
  rep.missingGlyphs = [...new Set(raport.filter((x) => !x.hasGeom).map((x) => x.char))];
  if (dbg) dbg.rings = dbgRings;

  rep.solidsIn = inputPolys.length;
  rep.holesIn = inputPolys.reduce((s, p) => s + (p.length - 1), 0);
  // aria netă intrată (outer - holes), suprapunerile dintre litere numărate multiplu
  rep.areaInputMm2 = inputPolys.reduce((s, p) => {
    const outer = Math.abs(signedArea(p[0]));
    const holes = p.slice(1).reduce((h, r) => h + Math.abs(signedArea(r)), 0);
    return s + outer - holes;
  }, 0);
  if (dbg) dbg.input = inputPolys.map((p, i) => ({ i, ...bbox(p[0]), outerArea: +Math.abs(signedArea(p[0])).toFixed(1), holes: p.length - 1 }));

  // ---- PASUL 4: UNION (polygon-clipping) — PASUL CRITIC ----
  // Trimitem toate poligoanele ca un singur MultiPolygon; union dizolvă
  // suprapunerile dintre litere și păstrează găurile.
  let unioned: PolyWithHoles[];
  try {
    unioned = polygonClipping.union(inputPolys as any) as any;
  } catch (e: any) {
    stepFail('4-union', `polygon-clipping a aruncat: ${e?.message ?? String(e)} ` +
      `(intrate: ${inputPolys.length} poligoane, ${rep.ringsIn} inele)`);
    return; // unreachable
  }
  if (!unioned || unioned.length === 0) {
    stepFail('4-union', t('geometry.unionZeroPoligoane', { n: inputPolys.length }));
  }
  rep.ringsAfterUnion = unioned.reduce((s, p) => s + p.length, 0);
  if (dbg) dbg.unionRaw = unioned.map((p: any, i: number) => ({ i, ...bbox(p[0].map((pt: any) => [pt[0], pt[1]] as Pt)), outerArea: +Math.abs(signedArea(p[0].map((pt: any) => [pt[0], pt[1]] as Pt))).toFixed(1), rings: p.length }));
  rep.areaOutputMm2 = unioned.reduce((s: number, p: any) => {
    const outer = Math.abs(signedArea(p[0].map((pt: any) => [pt[0], pt[1]] as Pt)));
    const holes = p.slice(1).reduce((h: number, r: any) =>
      h + Math.abs(signedArea(r.map((pt: any) => [pt[0], pt[1]] as Pt))), 0);
    return s + outer - holes;
  }, 0);

  // ---- filtrare slivere: elimină poligoanele cu arie sub prag (la scara finală).
  // Coordonatele sunt deja în mm, deci aria e în mm². Nu se raportează individual,
  // nu se exportă; se raportează doar CÂTE au fost eliminate.
  const SLIVER_MM2 = 0.1;
  const sliversDetail: { area: number; x: number; y: number }[] = [];
  const kept: PolyWithHoles[] = [];
  for (const p of unioned as any[]) {
    const ringPts: Ring = p[0].map((pt: any) => [pt[0], pt[1]] as Pt);
    const outer = Math.abs(signedArea(ringPts));
    if (outer >= SLIVER_MM2) { kept.push(p); continue; }
    const c = bbox(ringPts);
    sliversDetail.push({ area: +outer.toFixed(4), x: +((c.x0 + c.x1) / 2).toFixed(1), y: +((c.y0 + c.y1) / 2).toFixed(1) });
  }
  unioned = kept;
  rep.sliverThresholdMm2 = SLIVER_MM2;
  rep.sliversRemoved = sliversDetail.length;
  rep.sliversDetail = sliversDetail;   // fiecare sliver eliminat: arie + poziție (raportat în UI)
  rep.polysAfterUnion = unioned.length;
  if (dbg) dbg.union = unioned.map((p: any, i: number) => ({ i, ...bbox(p[0].map((pt: any) => [pt[0], pt[1]] as Pt)), outerArea: +Math.abs(signedArea(p[0].map((pt: any) => [pt[0], pt[1]] as Pt))).toFixed(1), rings: p.length }));
  if (unioned.length === 0) stepFail('4-union', 'toate poligoanele au fost sub pragul de sliver');

  // ---- PAȘII 6 + 7: earcut + extrudare ----
  const mb: MeshBuild = { verts: [], tris: [] };
  const deRezerva: PolyWithHoles[] = [];   // poligoane pe care earcut nu le acoperă complet
  try {
    for (const poly of unioned) {
      // polygon-clipping închide inelele (ultim = prim); scoatem duplicatul.
      const cleaned: PolyWithHoles = poly.map((ring: any) => {
        const r: Ring = ring.map((p: any) => [p[0], p[1]] as Pt);
        if (r.length >= 2) {
          const f = r[0], l = r[r.length - 1];
          if (f[0] === l[0] && f[1] === l[1]) r.pop();
        }
        return r;
      }).filter((r) => r.length >= 3);
      if (cleaned.length === 0) continue;
      if (dbg) { (dbg.polys ??= []).push(cleaned.map((r) => r.map((p) => [+p[0].toFixed(4), +p[1].toFixed(4)]))); }
      if (!extrudePolygon(cleaned, grosimeMM, mb, dbg ? (dbg.earcut ??= []) : undefined)) deRezerva.push(cleaned);
    }
  } catch (e: any) {
    stepFail('6-7-earcut-extrude', e?.message ?? String(e));
  }
  rep.triangles = mb.tris.length / 3;
  rep.vertices = mb.verts.length / 3;
  rep.polysDeRezerva = deRezerva.length;
  if (mb.tris.length === 0 && deRezerva.length === 0) stepFail('6-7-earcut-extrude', 'zero triunghiuri generate');

  // Verificare INDEPENDENTĂ de manifold: fiecare muchie orientată trebuie să
  // apară exact o dată în ambele sensuri (mesh închis, orientabil). Dovedește
  // că logica de extrudare — nu reparațiile interne ale manifold — e corectă.
  {
    const edges = new Map<string, number>();
    for (let i = 0; i < mb.tris.length; i += 3) {
      const t = [mb.tris[i], mb.tris[i + 1], mb.tris[i + 2]];
      for (let e = 0; e < 3; e++) {
        const a = t[e], b = t[(e + 1) % 3];
        edges.set(`${a}_${b}`, (edges.get(`${a}_${b}`) ?? 0) + 1);
      }
    }
    let boundary = 0, nonManifold = 0;
    for (const [key, count] of edges) {
      const [a, b] = key.split('_');
      const opp = edges.get(`${b}_${a}`) ?? 0;
      if (opp === 0) {
        boundary++;                       // muchie de frontieră (gaură în mesh)
        // DIAGNOSTIC: unde anume e gaura, în coordonate
        if (dbg) (dbg.boundary ??= []).push({ a: mb.verts.slice(+a * 3, +a * 3 + 3), b: mb.verts.slice(+b * 3, +b * 3 + 3) });
      }
      if (count > 1) nonManifold++;       // aceeași muchie orientată repetată
    }
    rep.rawBoundaryEdges = boundary;
    rep.rawNonManifoldEdges = nonManifold;
    rep.rawClosed = boundary === 0 && nonManifold === 0;
  }

  // ---- PASUL 8: Manifold din mesh ----
  let manifold: any = null;
  try {
    if (mb.tris.length) {
      const mesh = new Mesh({
        numProp: 3,
        vertProperties: new Float32Array(mb.verts),
        triVerts: new Uint32Array(mb.tris),
      });
      manifold = new Manifold(mesh);
    }
  } catch (e: any) {
    stepFail('8-manifold', t('geometry.manifoldAAruncat', { eroare: e?.message ?? String(e) }));
  }

  // ---- PASUL 8b: calea de rezervă pentru poligoanele pe care earcut nu le acoperă ----
  // Triangulatorul lui manifold tratează corect inelele care se ating și punțile coliniare,
  // și produce prin construcție un corp închis. Îl folosim DOAR pentru poligoanele
  // problematice, ca restul geometriei să rămână bit-identică cu drumul de până acum.
  if (deRezerva.length) {
    try {
      for (const poly of deRezerva) {
        // regula „Positive": exteriorul CCW adaugă, găurile CW scad
        const cs = new CrossSection([forceWinding(poly[0], true), ...poly.slice(1).map((h) => forceWinding(h, false))], 'Positive');
        const corp = Manifold.extrude(cs, grosimeMM);
        manifold = manifold ? manifold.add(corp) : corp;
      }
    } catch (e: any) {
      stepFail('8b-rezerva', t('geometry.manifoldAAruncat', { eroare: e?.message ?? String(e) }));
    }
  }
  if (!manifold) stepFail('8-manifold', t('geometry.manifoldAAruncat', { eroare: 'niciun corp generat' }));

  // ---- PASUL 9: status() ----
  // status() întoarce un string din uniunea ErrorStatus (ex. 'NoError').
  const status = String(manifold.status());
  if (status !== 'NoError') {
    stepFail('9-status', `manifold.status() = ${status}`);
  }

  return manifold;
}
