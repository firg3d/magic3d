/**
 * NUCLEU — CAILE SVG CA POLILINII.
 *
 * Citeste atributul `d` al unei cai SVG si intoarce subcaile ca liste de puncte (curbele aplatizate),
 * fiecare cu semnul ca e inchisa (Z) sau nu. Ce inseamna o subcale (contur plin sau linie de grosime
 * data) hotaraste cine o foloseste.
 *
 * Comenzi: M L H V C S Q T Z, absolute si relative, cu coordonate repetate implicit. Arcele (A) nu
 * sunt suportate: un desen care le are se salveaza cu ele transformate in curbe.
 */
import type { Pt } from './forme2d.js';

export interface Subcale { puncte: Pt[]; inchisa: boolean }

const NUMAR = /-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;

/** Cate segmente are o curba aplatizata. */
const SEGMENTE_CURBA = 12;

export function citesteCale(d: string): Subcale[] {
  const tokeni = d.match(/[MmLlHhVvCcSsQqTtZzAa]|-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? [];
  const subcai: Subcale[] = [];
  let curenta: Subcale | null = null;
  let x = 0, y = 0, x0 = 0, y0 = 0;
  // ultimul punct de control, pentru S si T (reflectat fata de punctul curent)
  let ctrl: Pt | null = null;
  let i = 0;
  let cmd = '';
  const numar = () => Number(tokeni[i++]);
  const areNumar = () => i < tokeni.length && NUMAR.test(tokeni[i]) && (NUMAR.lastIndex = 0, true);
  const adauga = (p: Pt) => { if (!curenta) { curenta = { puncte: [[x, y]], inchisa: false }; subcai.push(curenta); } curenta.puncte.push(p); };
  const cubica = (c1: Pt, c2: Pt, p: Pt) => {
    const a: Pt = [x, y];
    for (let k = 1; k <= SEGMENTE_CURBA; k++) {
      const t = k / SEGMENTE_CURBA, u = 1 - t;
      adauga([u * u * u * a[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p[0], u * u * u * a[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p[1]]);
    }
  };
  const patratica = (c: Pt, p: Pt) => {
    const a: Pt = [x, y];
    for (let k = 1; k <= SEGMENTE_CURBA; k++) {
      const t = k / SEGMENTE_CURBA, u = 1 - t;
      adauga([u * u * a[0] + 2 * u * t * c[0] + t * t * p[0], u * u * a[1] + 2 * u * t * c[1] + t * t * p[1]]);
    }
  };
  while (i < tokeni.length) {
    if (/[A-Za-z]/.test(tokeni[i])) cmd = tokeni[i++];
    const rel = cmd === cmd.toLowerCase();
    const ox = rel ? x : 0, oy = rel ? y : 0;
    switch (cmd.toUpperCase()) {
      case 'M': {
        x = ox + numar(); y = oy + numar(); x0 = x; y0 = y;
        curenta = { puncte: [[x, y]], inchisa: false };
        subcai.push(curenta);
        cmd = rel ? 'l' : 'L'; // perechile care urmeaza unui M sunt linii
        ctrl = null;
        break;
      }
      case 'L': { const nx = ox + numar(), ny = oy + numar(); adauga([nx, ny]); x = nx; y = ny; ctrl = null; break; }
      case 'H': { const nx = ox + numar(); adauga([nx, y]); x = nx; ctrl = null; break; }
      case 'V': { const ny = oy + numar(); adauga([x, ny]); y = ny; ctrl = null; break; }
      case 'C': {
        const c1: Pt = [ox + numar(), oy + numar()], c2: Pt = [ox + numar(), oy + numar()], p: Pt = [ox + numar(), oy + numar()];
        cubica(c1, c2, p); x = p[0]; y = p[1]; ctrl = c2; break;
      }
      case 'S': {
        const c1: Pt = ctrl ? [2 * x - ctrl[0], 2 * y - ctrl[1]] : [x, y];
        const c2: Pt = [ox + numar(), oy + numar()], p: Pt = [ox + numar(), oy + numar()];
        cubica(c1, c2, p); x = p[0]; y = p[1]; ctrl = c2; break;
      }
      case 'Q': {
        const c: Pt = [ox + numar(), oy + numar()], p: Pt = [ox + numar(), oy + numar()];
        patratica(c, p); x = p[0]; y = p[1]; ctrl = c; break;
      }
      case 'T': {
        const c: Pt = ctrl ? [2 * x - ctrl[0], 2 * y - ctrl[1]] : [x, y];
        const p: Pt = [ox + numar(), oy + numar()];
        patratica(c, p); x = p[0]; y = p[1]; ctrl = c; break;
      }
      case 'Z': {
        if (curenta) curenta.inchisa = true;
        x = x0; y = y0; curenta = null; ctrl = null;
        // dupa Z poate urma direct o comanda noua; numerele fara comanda nu au sens
        if (areNumar()) throw new Error('svg: numar dupa Z');
        break;
      }
      case 'A': throw new Error('svg: arcele (A) nu sunt suportate');
      default: throw new Error(`svg: comanda necunoscuta "${cmd}"`);
    }
  }
  return subcai.filter((s) => s.puncte.length > 1);
}

/** Caile dintr-un document SVG: `d` si daca e linie (fill="none" cu stroke) sau contur plin. */
export function caiDinSvg(svg: string): Array<{ d: string; linie: boolean }> {
  return [...svg.matchAll(/<path\b([^>]*?)\/?>/g)].map((m) => {
    const atribute = m[1];
    const d = atribute.match(/\sd="([^"]*)"/)?.[1] ?? '';
    const linie = /fill="none"/.test(atribute) && /stroke="/.test(atribute);
    return { d, linie };
  }).filter((c) => c.d.trim());
}
