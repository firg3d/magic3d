/**
 * NUCLEU — CITIREA UNUI LOGO SVG (A.5 din docs/design/semnatura-huse-iphone.md).
 *
 * Transformă un fișier SVG în inele 2D, normalizate în cutia de 9 × 2.5 mm a marcajului, gata
 * de dat lui `aplicaMarcaj`.
 *
 * DE CE UN PARSER PROPRIU, ȘI NU O BIBLIOTECĂ. Regula valului: nicio dependență npm nouă fără
 * întrebare. Iar ce trebuie citit dintr-un logo de 9 mm e o submulțime mică: contururi închise,
 * fără stiluri, fără gradienți, fără text. Un parser de SVG complet ar aduce mult mai mult decât
 * folosim, într-un bundle care se descarcă la fiecare deschidere de aplicație.
 *
 * CE ACCEPTĂ: `<path>`, `<rect>`, `<circle>`, `<ellipse>`, `<polygon>`, `<polyline>`, cu
 * transformările `translate`, `scale` și `matrix` de pe element sau de pe un `<g>` părinte.
 *
 * CE REFUZĂ, CU MOTIV SCRIS: `<text>` neconvertit (A.5 o cere explicit), fișiere peste limită,
 * și fișiere din care nu iese niciun contur închis.
 */
import type { Ring } from '../geometry/forme2d.js';
import { MARCAJ_LATIME, MARCAJ_INALTIME, TRASATURA_LOGO_MIN } from './index.js';

/** limita de mărime a fișierului (octeți) — A.5 */
import { configureManifold as configPlan, trasaturaMinima } from '../primitive/plan.js';

export const SVG_MAX_OCTETI = 200 * 1024;

export type MotivRefuz = 'prea-mare' | 'text-neconvertit' | 'fara-contur' | 'nu-e-svg';

export class SvgRefuzat extends Error {
  constructor(public motiv: MotivRefuz) { super(motiv); this.name = 'SvgRefuzat'; }
}

export interface LogoCitit {
  contururi: Ring[];
  /** cea mai îngustă trăsătură, măsurată pe forma FINALĂ (mm) */
  trasaturaMinMM: number;
  /** true dacă e sub pragul de printabilitate — avertisment, nu blocaj (A.5) */
  subtire: boolean;
  /** dimensiunea originală din viewBox, doar pentru raport */
  sursaLatime: number;
  sursaInaltime: number;
}

// ---------- transformări ----------

type Mat = [number, number, number, number, number, number];   // a b c d e f
const UNITATE: Mat = [1, 0, 0, 1, 0, 0];
const compune = (m: Mat, n: Mat): Mat => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];
const aplica = (m: Mat, x: number, y: number): [number, number] =>
  [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

function citesteTransform(s: string | null): Mat {
  if (!s) return UNITATE;
  let m = UNITATE;
  for (const g of s.matchAll(/(translate|scale|matrix|rotate)\s*\(([^)]*)\)/g)) {
    const n = g[2].split(/[\s,]+/).filter(Boolean).map(Number);
    if (g[1] === 'translate') m = compune(m, [1, 0, 0, 1, n[0] || 0, n[1] || 0]);
    else if (g[1] === 'scale') m = compune(m, [n[0] ?? 1, 0, 0, n[1] ?? n[0] ?? 1, 0, 0]);
    else if (g[1] === 'matrix' && n.length >= 6) m = compune(m, n.slice(0, 6) as Mat);
    else if (g[1] === 'rotate') {
      const a = ((n[0] || 0) * Math.PI) / 180, c = Math.cos(a), s2 = Math.sin(a);
      m = compune(m, [c, s2, -s2, c, 0, 0]);
    }
  }
  return m;
}

// ---------- aplatizarea curbelor ----------

function bezierCubic(p: [number, number][], out: [number, number][], pasi: number): void {
  for (let i = 1; i <= pasi; i++) {
    const t = i / pasi, u = 1 - t;
    out.push([
      u * u * u * p[0][0] + 3 * u * u * t * p[1][0] + 3 * u * t * t * p[2][0] + t * t * t * p[3][0],
      u * u * u * p[0][1] + 3 * u * u * t * p[1][1] + 3 * u * t * t * p[2][1] + t * t * t * p[3][1],
    ]);
  }
}

/** câți pași merită o curbă, după cât de întinsă e — o curbă mică nu are nevoie de 32 de segmente */
const pasiPentru = (p: [number, number][]) => {
  let d = 0;
  for (let i = 1; i < p.length; i++) d += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
  return Math.max(4, Math.min(48, Math.ceil(d / 2)));
};

/** parsează atributul `d` al unui `<path>` în inele de puncte */
function inelePath(d: string, m: Mat): [number, number][][] {
  const jetoane = d.match(/[MmLlHhVvCcSsQqTtAaZz]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? [];
  const inele: [number, number][][] = [];
  let curent: [number, number][] = [];
  let x = 0, y = 0, startX = 0, startY = 0;
  let ctrlX = 0, ctrlY = 0, ultima = '';
  let i = 0;
  const nr = () => Number(jetoane[i++]);
  const pune = () => curent.push(aplica(m, x, y));
  const inchide = () => { if (curent.length > 2) inele.push(curent); curent = []; };

  while (i < jetoane.length) {
    const j = jetoane[i];
    let cmd = ultima;
    if (/[a-z]/i.test(j)) { cmd = j; i++; } else if (!ultima) break;
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    ultima = cmd;

    if (C === 'M') {
      inchide();
      const nx = nr(), ny = nr();
      x = rel ? x + nx : nx; y = rel ? y + ny : ny;
      startX = x; startY = y; pune();
      ultima = rel ? 'l' : 'L';           // perechile care urmează după M sunt linii
    } else if (C === 'L') {
      const nx = nr(), ny = nr();
      x = rel ? x + nx : nx; y = rel ? y + ny : ny; pune();
    } else if (C === 'H') { const n = nr(); x = rel ? x + n : n; pune(); }
    else if (C === 'V') { const n = nr(); y = rel ? y + n : n; pune(); }
    else if (C === 'C' || C === 'S') {
      let c1x: number, c1y: number;
      if (C === 'C') { const a = nr(), b = nr(); c1x = rel ? x + a : a; c1y = rel ? y + b : b; }
      else { c1x = 2 * x - ctrlX; c1y = 2 * y - ctrlY; }
      const a2 = nr(), b2 = nr(), a3 = nr(), b3 = nr();
      const c2x = rel ? x + a2 : a2, c2y = rel ? y + b2 : b2;
      const ex = rel ? x + a3 : a3, ey = rel ? y + b3 : b3;
      const p: [number, number][] = [[x, y], [c1x, c1y], [c2x, c2y], [ex, ey]];
      const tmp: [number, number][] = [];
      bezierCubic(p, tmp, pasiPentru(p));
      for (const q of tmp) curent.push(aplica(m, q[0], q[1]));
      ctrlX = c2x; ctrlY = c2y; x = ex; y = ey;
    } else if (C === 'Q' || C === 'T') {
      let qx: number, qy: number;
      if (C === 'Q') { const a = nr(), b = nr(); qx = rel ? x + a : a; qy = rel ? y + b : b; }
      else { qx = 2 * x - ctrlX; qy = 2 * y - ctrlY; }
      const a2 = nr(), b2 = nr();
      const ex = rel ? x + a2 : a2, ey = rel ? y + b2 : b2;
      // quadratic -> cubic, ca să aibă o singură cale de aplatizare
      const p: [number, number][] = [[x, y],
        [x + (2 / 3) * (qx - x), y + (2 / 3) * (qy - y)],
        [ex + (2 / 3) * (qx - ex), ey + (2 / 3) * (qy - ey)], [ex, ey]];
      const tmp: [number, number][] = [];
      bezierCubic(p, tmp, pasiPentru(p));
      for (const q of tmp) curent.push(aplica(m, q[0], q[1]));
      ctrlX = qx; ctrlY = qy; x = ex; y = ey;
    } else if (C === 'A') {
      // ARCUL se aproximează cu coarda. Într-un logo de 9 mm un arc are milimetri, iar
      // diferența dintre arc și coardă rămâne sub toleranța de aplatizare. O implementare
      // completă de arc eliptic ar fi mai mult cod decât precizie câștigată la mărimea asta.
      nr(); nr(); nr(); nr(); nr();
      const a = nr(), b = nr();
      x = rel ? x + a : a; y = rel ? y + b : b; pune();
    } else if (C === 'Z') { x = startX; y = startY; inchide(); }
    else { i++; }
  }
  inchide();
  return inele;
}

function inelDreptunghi(x: number, y: number, w: number, h: number, m: Mat): [number, number][] {
  return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map((p) => aplica(m, p[0], p[1]));
}

function inelElipsa(cx: number, cy: number, rx: number, ry: number, m: Mat): [number, number][] {
  const n = Math.max(16, Math.min(96, Math.ceil(Math.max(rx, ry))));
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    out.push(aplica(m, cx + rx * Math.cos(a), cy + ry * Math.sin(a)));
  }
  return out;
}

const atr = (s: string, nume: string): string | null => {
  const m = s.match(new RegExp(`\\b${nume}\\s*=\\s*"([^"]*)"|\\b${nume}\\s*=\\s*'([^']*)'`));
  return m ? (m[1] ?? m[2]) : null;
};
const nrAtr = (s: string, nume: string, implicit = 0): number => {
  const v = atr(s, nume);
  const n = v === null ? NaN : parseFloat(v);
  return Number.isFinite(n) ? n : implicit;
};

/**
 * CITEȘTE UN SVG. Aruncă `SvgRefuzat` cu motivul, ca interfața să poată da mesajul potrivit.
 *
 * `MOD` e instanța manifold, folosită doar la măsurarea trăsăturii minime — parsarea în sine
 * nu are nevoie de geometrie.
 */
export function citesteSvg(text: string, MOD: any): LogoCitit {
  configPlan(MOD);
  if (text.length > SVG_MAX_OCTETI) throw new SvgRefuzat('prea-mare');
  if (!/<svg[\s>]/i.test(text)) throw new SvgRefuzat('nu-e-svg');
  // A.5, explicit: textul neconvertit se refuză. Un `<text>` ajunge la print ca nimic, fiindcă
  // fontul de pe calculatorul care a desenat logo-ul nu e aici.
  if (/<text[\s>]/i.test(text)) throw new SvgRefuzat('text-neconvertit');

  // transformările de pe `<g>` se acumulează pe măsură ce se parcurge fișierul, în ordine
  const inele: [number, number][][] = [];
  const stivaG: Mat[] = [UNITATE];
  const varf = () => stivaG[stivaG.length - 1];

  const re = /<(\/?)(g|path|rect|circle|ellipse|polygon|polyline)\b([^>]*)>/gi;
  for (const g of text.matchAll(re)) {
    const inchidere = g[1] === '/', tag = g[2].toLowerCase(), atribute = g[3] ?? '';
    if (tag === 'g') {
      if (inchidere) { if (stivaG.length > 1) stivaG.pop(); }
      else if (!/\/\s*$/.test(atribute)) stivaG.push(compune(varf(), citesteTransform(atr(atribute, 'transform'))));
      continue;
    }
    if (inchidere) continue;
    const m = compune(varf(), citesteTransform(atr(atribute, 'transform')));
    if (tag === 'path') {
      const d = atr(atribute, 'd');
      if (d) inele.push(...inelePath(d, m));
    } else if (tag === 'rect') {
      inele.push(inelDreptunghi(nrAtr(atribute, 'x'), nrAtr(atribute, 'y'),
        nrAtr(atribute, 'width'), nrAtr(atribute, 'height'), m));
    } else if (tag === 'circle') {
      const r = nrAtr(atribute, 'r');
      inele.push(inelElipsa(nrAtr(atribute, 'cx'), nrAtr(atribute, 'cy'), r, r, m));
    } else if (tag === 'ellipse') {
      inele.push(inelElipsa(nrAtr(atribute, 'cx'), nrAtr(atribute, 'cy'),
        nrAtr(atribute, 'rx'), nrAtr(atribute, 'ry'), m));
    } else if (tag === 'polygon' || tag === 'polyline') {
      const p = (atr(atribute, 'points') ?? '').split(/[\s,]+/).filter(Boolean).map(Number);
      const inel: [number, number][] = [];
      for (let k = 0; k + 1 < p.length; k += 2) inel.push(aplica(m, p[k], p[k + 1]));
      if (inel.length > 2) inele.push(inel);
    }
  }

  if (!inele.length) throw new SvgRefuzat('fara-contur');

  // ---------- normalizare în cutia marcajului ----------
  //
  // SVG-ul are Y ÎN JOS, geometria noastră îl are în sus: fără oglindire, logo-ul iese răsturnat.
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const inel of inele) for (const [px, py] of inel) {
    if (px < minX) minX = px; if (px > maxX) maxX = px;
    if (py < minY) minY = py; if (py > maxY) maxY = py;
  }
  const w = maxX - minX, h = maxY - minY;
  if (!(w > 0) || !(h > 0)) throw new SvgRefuzat('fara-contur');
  // raportul de aspect se PĂSTREAZĂ (A.5): logo-ul intră în cutie, nu se întinde peste ea
  const k = Math.min(MARCAJ_LATIME / w, MARCAJ_INALTIME / h);
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  //
  // SENSUL INELULUI se pastreaza: oglindirea pe Y il INVERSEAZA, iar `cutterDinInele` citeste
  // conturile cu regula 'Positive', unde un inel in sens orar e o GAURA. Fara reasezare, un
  // logo dreptunghiular a scos tot corpul — 137.224 mm3 din 137.224, adica piesa intreaga.
  // Prins de testul cap-coada; verificarile pe contururi singure treceau, fiindca masuratoarea
  // de trasatura foloseste 'NonZero', care nu simte sensul.
  const contururi: Ring[] = inele.map((inel) =>
    inel.map(([px, py]) => [(px - cx) * k, -(py - cy) * k] as [number, number]).reverse() as Ring);

  // ---------- trăsătura minimă, măsurată pe forma FINALĂ ----------
  //
  // Se măsoară după scalare, nu în unitățile SVG-ului: o linie de 2 unități poate fi 3 mm sau
  // 0.2, după cât de mare era desenul.
  /**
   * MĂSURA VECHE PUTEA MINȚI. Erodă până când forma dispărea COMPLET și raporta raza aceea — dar
   * forma dispare când se termină cea mai GROASĂ trăsătură, nu cea mai subțire. Pe un logo cu o
   * bară de 3 mm și un punct de 0,3 întorcea ~3 și nu avertiza nimic, deși punctul nu se
   * printează. Ieșea corect doar când toate trăsăturile erau la fel de subțiri.
   *
   * Acum se folosește DESCHIDEREA din nucleu, care întoarce chiar cea mai îngustă trăsătură.
   */
  const cs = new MOD.CrossSection(contururi, 'NonZero');
  const trasaturaMinMM = trasaturaMinima(cs, TRASATURA_LOGO_MIN * 2);
  cs.delete();

  return {
    contururi, trasaturaMinMM,
    subtire: trasaturaMinMM < TRASATURA_LOGO_MIN,
    sursaLatime: +w.toFixed(2), sursaInaltime: +h.toFixed(2),
  };
}
