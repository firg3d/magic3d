/**
 * NUCLEU — FIRUL: o polilinie îngroșată la o lățime dată, ca inele gata de `CrossSection`.
 *
 * Orice ramă desenată din linii — pânză de păianjen, coroniță, ghirlandă, plasă — se face la fel:
 * se descrie TRASEUL, apoi se îngroașă. Aici stă îngroșarea, ca desenul să rămână doar o listă de
 * puncte.
 *
 * ÎMBINAREA ROTUNDĂ NU E COSMETICĂ. Prima variantă (în spike) construia doar câte un patrulater
 * per segment. Pe partea din AFARA curburii, între două patrulatere consecutive rămâne o
 * crestătură în unghi — iar acolo materialul e mai subțire decât firul cerut. Detectorul de
 * trăsături subțiri din `trasaturi.ts` a semnalat-o la toate cele șase configurații încercate;
 * cu un disc la fiecare vârf, toate ies uniforme. La un fir de 3 mm care ține o piesă în
 * picioare, crestătura aia e chiar locul unde s-ar rupe.
 *
 * Inelele se întorc în sens TRIGONOMETRIC și se suprapun între ele: `new CrossSection(inele,
 * 'Positive')` le unește singur, prin regula de înfășurare — aceeași soluție ca la tiparele din
 * Litere Fagure, unde reuniunea explicită a zeci de benzi era operația scumpă.
 */
import { arieRing, laturiCerc, poligon, type Pt, type Ring } from './forme2d.js';

/**
 * Firul de lățime `latime` de-a lungul unei polilinii.
 *
 * `capete` spune dacă traseul se termină rotunjit (implicit) sau tăiat drept. Rotunjit e ce vrei
 * aproape mereu: un capăt tăiat drept lasă un colț ascuțit care se vede și se agață.
 */
export function fir(pts: Pt[], latime: number, capete: 'rotund' | 'drept' = 'rotund'): Ring[] {
  const out: Ring[] = [];
  const r = latime / 2;
  const laturi = laturiCerc(r);
  const primul = capete === 'rotund' ? 0 : 1;
  const ultimul = capete === 'rotund' ? pts.length - 1 : pts.length - 2;
  for (let i = primul; i <= ultimul; i++) {
    if (i < 0 || i >= pts.length) continue;
    out.push(poligon(pts[i][0], pts[i][1], r, laturi));
  }
  for (let i = 0; i + 1 < pts.length; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy);
    if (L < 1e-9) continue;                       // puncte duplicate: segmentul n-are direcție
    const nx = (-dy / L) * r, ny = (dx / L) * r;
    const inel: Ring = [[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]];
    out.push(arieRing(inel) > 0 ? inel : inel.reverse());
  }
  return out;
}

/** același fir, pe mai multe trasee — inelele se adună, reuniunea o face regula de înfășurare */
export function fire(trasee: Pt[][], latime: number, capete: 'rotund' | 'drept' = 'rotund'): Ring[] {
  const out: Ring[] = [];
  for (const t of trasee) out.push(...fir(t, latime, capete));
  return out;
}

/**
 * Un arc de cerc ca polilinie, cu `lasare` din rază trasă spre centru la mijloc.
 *
 * Lăsarea e ce face diferența dintre o PÂNZĂ și o roată de bicicletă, și e un singur număr:
 * 0 dă arce de cerc, 0.18 dă firele care atârnă între spițe.
 */
export function arcLasat(cx: number, cy: number, raza: number, a0: number, a1: number,
  lasare = 0, pasi = 10): Pt[] {
  const p: Pt[] = [];
  for (let s = 0; s <= pasi; s++) {
    const t = s / pasi;
    const a = a0 + (a1 - a0) * t;
    // parabolă: 1 la capete, (1 − lăsare) la mijloc
    const r = raza * (1 - lasare * 4 * t * (1 - t));
    p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return p;
}
