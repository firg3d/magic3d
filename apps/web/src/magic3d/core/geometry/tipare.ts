/**
 * NUCLEU — TIPARELE 2D: fagure, perforat, cărămidă, voronoi, diagonal, triunghiular, valuri,
 * radial, spirală. Nouă moduri de a umple o suprafață plană cu material și gol.
 *
 * Scrise pentru Litere Fagure, folosite acum și de Cutii Litere (modelul de pe fund). Al doilea
 * consumator = trec în nucleu, ca textSolid, fonts, detectorul de trăsături și agățarea.
 *
 * Ce NU intră aici: unde se aplică tiparul, ce ramă i se lasă, ce se face cu bucățile desprinse.
 * Fișierul întoarce o secțiune 2D cu materialul tiparului, întinsă cât i se cere; aplicația o
 * intersectează cu ce vrea ea.
 *
 * CONSTRUITE DIN POLIGOANE, NU DIN BOOLEENE. Constructorul CrossSection face el însuși
 * reuniunea (regula „Positive": se umple unde numărul de înfășurări e pozitiv). Benzile care se
 * încrucișează sunt deci unite gratis, fără nicio operație booleană: sute de poligoane intră ca
 * o singură construcție. De aceea inelele generate mai jos sunt toate în sens trigonometric
 * (arie semnată pozitivă), iar rotația se aplică pe vârfuri — o rotație păstrează sensul, deci
 * și semnul ariei.
 *
 * Tiparele se împart în două feluri, după cum e mai ieftin să fie descrise:
 *   · prin BENZI   — poligoanele SUNT materialul                 (diagonal, triunghiular,
 *                                                                  valuri, radial, spirală)
 *   · prin CELULE  — poligoanele sunt GOLUL, iar materialul e
 *                    dreptunghi \ ⋃celule, o singură scădere      (fagure, perforat, cărămidă)
 */
import { rotator, poligon, laturiCerc, arieRing, type Pt, type Ring } from './forme2d.js';

/**
 * Tiparele disponibile.
 *
 * „Grilă dreaptă" NU e în listă, și nu din uitare: `diagonal` e definit ca două familii la
 * `unghi ± 45°`, deci la unghi = 45 iese chiar grila dreaptă, la 0/90°. O intrare separată în
 * meniu ar fi același tipar sub alt nume.
 */
export type Tipar = 'fagure' | 'diagonal' | 'triunghiular' | 'perforat' | 'caramida' | 'valuri' | 'radial' | 'spirala' | 'voronoi';

/** toate tiparele, în ordinea din meniu: întâi cele geometrice, apoi cele decorative */
export const TIPARE: Tipar[] = ['fagure', 'perforat', 'voronoi', 'diagonal', 'triunghiular', 'caramida', 'valuri', 'radial', 'spirala'];

export interface ParamTipar {
  model: Tipar;
  /** P — distanța dintre benzi sau din centru în centru de celulă (mm) */
  pas: number;
  /** T — grosimea peretelui dintre goluri (mm) */
  grosimePerete: number;
  /** grade, rotația tiparului */
  unghi: number;
  /** sămânța așezării aleatoare. Contează DOAR la voronoi; celelalte tipare o ignoră. */
  varianta: number;
}

/**
 * Sub ce arie o celulă retrasă e prea mică pentru a fi gol (mm²).
 *
 * Contează doar la voronoi, unde doi centri prea apropiați lasă după retragere un ciob de
 * poligon. Celulele stinse rămân pur și simplu material.
 */
const CELULA_MIN = 1;


/**
 * Cât de departe trebuie generat tiparul, în spațiul LUI (adică după ce s-a rotit cu unghiul
 * cerut). Dreptunghiul literei, rotit cu −unghi, are semi-laturile de mai jos; peste ele se
 * adaugă un pas, ca tiparul să depășească silueta, nu să se oprească în ea.
 *
 * Contează: tiparele cu celule cresc cu ARIA acoperită. Un pătrat de latura diagonalei (ce era
 * înainte) înseamnă la „I" de trei ori mai multe celule decât are litera nevoie.
 */
export function intindere(latime: number, inaltime: number, unghiDeg: number, pad: number) {
  const a = (unghiDeg * Math.PI) / 180, c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
  const hx = latime / 2, hy = inaltime / 2;
  return { ex: hx * c + hy * s + pad, ey: hx * s + hy * c + pad, R: Math.hypot(hx, hy) + pad };
}

/**
 * Normalele STÂNGI în nodurile unei polilinii, mediate între segmentele vecine.
 * `inchis` = drumul se întoarce în primul punct (cerc), deci primul și ultimul nod au și ei
 * doi vecini.
 */
function normaleNod(pts: Pt[], inchis: boolean): Pt[] {
  const n = pts.length;
  const dir: Pt[] = [];
  for (let i = 0; i < (inchis ? n : n - 1); i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    dir.push([-dy / L, dx / L]);            // normala stângă a segmentului
  }
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = dir[inchis ? (i - 1 + dir.length) % dir.length : Math.max(0, i - 1)];
    const b = dir[inchis ? i % dir.length : Math.min(dir.length - 1, i)];
    const x = a[0] + b[0], y = a[1] + b[1], L = Math.hypot(x, y);
    out.push(L < 1e-9 ? b : [x / L, y / L]);
  }
  return out;
}

/**
 * O bandă de lățime T de-a lungul unei polilinii DESCHISE, ca UN SINGUR poligon: se merge pe
 * o parte a drumului și se vine înapoi pe cealaltă.
 *
 * Varianta evidentă — un patrulater per segment — dă același desen, dar cu de patru ori mai
 * multe vârfuri, cu mii de poligoane care se suprapun și cu câte o pană de gol în fiecare cot,
 * de astupat cu încă un poligon. La pas mic, reuniunea lor chiar termina heap-ul WASM.
 *
 * Curbele de aici (valuri, cercuri, spirală) au raza de curbură mult peste T/2, deci banda nu
 * se auto-intersectează, iar normalele mediate sunt destul de bune: lățimea scade cu
 * cos(cot/2), adică sub 1% la coturi de 10°.
 */
function banda(pts: Pt[], T: number): Ring {
  const h = T / 2;
  const nrm = normaleNod(pts, false);
  const stanga: Ring = [], dreapta: Ring = [];
  for (let i = 0; i < pts.length; i++) {
    stanga.push([pts[i][0] - nrm[i][0] * h, pts[i][1] - nrm[i][1] * h]);
    dreapta.push([pts[i][0] + nrm[i][0] * h, pts[i][1] + nrm[i][1] * h]);
  }
  return [...stanga, ...dreapta.reverse()];
}

/**
 * Aceeași bandă, pe un contur ÎNCHIS (fără punctul de start repetat): iese un inel, deci două
 * contururi — exteriorul în sens trigonometric și interiorul în sens invers, adică o gaură.
 *
 * Semnele contează și se compun corect cu restul: un punct din golul inelului peste care trece
 * o rază are înfășurarea +1 (exterior) −1 (interior) +1 (rază) = +1, deci rămâne material.
 */
function bandaInchisa(pts: Pt[], T: number): Ring[] {
  const h = T / 2;
  const nrm = normaleNod(pts, true);         // pe un contur trigonometric, normala stângă e spre INTERIOR
  const exterior: Ring = [], interior: Ring = [];
  for (let i = 0; i < pts.length; i++) {
    exterior.push([pts[i][0] - nrm[i][0] * h, pts[i][1] - nrm[i][1] * h]);
    interior.push([pts[i][0] + nrm[i][0] * h, pts[i][1] + nrm[i][1] * h]);
  }
  return [exterior, interior.reverse()];
}

/**
 * O familie de benzi paralele: lățime T, pas P (din ax în ax), rotite cu `unghiDeg`,
 * lungi cât să acopere discul de rază R centrat în origine.
 */
function familieBenzi(unghiDeg: number, P: number, T: number, R: number): Ring[] {
  const rot = rotator(unghiDeg);
  const n = Math.ceil(R / P) + 1;
  const h = T / 2;
  const out: Ring[] = [];
  for (let k = -n; k <= n; k++) {
    const d = k * P;
    out.push([rot(-R, d - h), rot(R, d - h), rot(R, d + h), rot(-R, d + h)]);
  }
  return out;
}

/**
 * Celulele hexagonale RETRASE cu T/2, pe grilă alternată de pas P (din centru în centru).
 *
 * Hexagon cu vârful în sus, circumraza rc: lățimea peste fețe e rc·√3, deci pasul cerut dă
 * rc = P/√3. Retragerea cu T/2 pe fiecare față coboară apotema de la P/2 la (P−T)/2, adică
 * circumraza la (P−T)/√3 — între doi vecini rămâne fix T.
 */
function celuleHexagoane(unghiDeg: number, P: number, T: number, ex: number, ey: number): Ring[] {
  const rc = P / Math.sqrt(3);            // circumraza celulei întregi
  const rr = (P - T) / Math.sqrt(3);      // circumraza celulei retrase
  if (rr <= 0) return [];                 // peretele înghite celula: nu mai e nimic de scos
  const rot = rotator(unghiDeg);
  const dy = 1.5 * rc;
  const nx = Math.ceil(ex / P) + 1, ny = Math.ceil(ey / dy) + 1;
  const out: Ring[] = [];
  for (let j = -ny; j <= ny; j++) {
    for (let i = -nx; i <= nx; i++) {
      out.push(poligon(i * P + (j % 2 ? P / 2 : 0), j * dy, rr, 6, Math.PI / 2, rot));
    }
  }
  return out;
}

/**
 * PERFORAT — găuri rotunde pe aceeași grilă alternată ca fagurele: toți cei șase vecini stau
 * la distanța P, deci raza (P−T)/2 lasă exact T între găuri, în orice direcție.
 *
 * Rămâne mult mai mult material decât la fagure (colțurile dintre găuri), deci e varianta
 * pentru litere care trebuie să și țină, nu doar să arate.
 */
function celuleCercuri(unghiDeg: number, P: number, T: number, ex: number, ey: number): Ring[] {
  const r = (P - T) / 2;
  if (r <= 0) return [];
  const rot = rotator(unghiDeg);
  const dy = (P * Math.sqrt(3)) / 2;
  const nx = Math.ceil(ex / P) + 1, ny = Math.ceil(ey / dy) + 1;
  const laturi = laturiCerc(r);
  const out: Ring[] = [];
  for (let j = -ny; j <= ny; j++) {
    for (let i = -nx; i <= nx; i++) {
      out.push(poligon(i * P + (j % 2 ? P / 2 : 0), j * dy, r, laturi, 0, rot));
    }
  }
  return out;
}

/**
 * CĂRĂMIDĂ — modul de 2P × P, rândurile decalate cu jumătate de cărămidă.
 * Golul e (2P−T) × (P−T), deci rostul rămâne T pe ambele direcții.
 */
function celuleCaramida(unghiDeg: number, P: number, T: number, ex: number, ey: number): Ring[] {
  const w = 2 * P - T, h = P - T;
  if (w <= 0 || h <= 0) return [];
  const rot = rotator(unghiDeg);
  const nx = Math.ceil(ex / (2 * P)) + 1, ny = Math.ceil(ey / P) + 1;
  const out: Ring[] = [];
  for (let j = -ny; j <= ny; j++) {
    for (let i = -nx; i <= nx; i++) {
      const cx = i * 2 * P + (j % 2 ? P : 0), cy = j * P;
      out.push([rot(cx - w / 2, cy - h / 2), rot(cx + w / 2, cy - h / 2),
        rot(cx + w / 2, cy + h / 2), rot(cx - w / 2, cy + h / 2)]);
    }
  }
  return out;
}

/**
 * Zgomot determinist din coordonatele celulei. NU `Math.random()`: aceiași parametri trebuie
 * să dea aceeași literă la fiecare reconstrucție, altfel modelul ar tremura la orice mișcare
 * de cursor, iar testul n-ar avea ce verifica. „Varianta" e sămânța, ca omul să poată cere
 * altă așezare fără să schimbe nimic altceva.
 */
function zgomot(i: number, j: number, samanta: number): number {
  let h = (i * 374761393 + j * 668265263 + samanta * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}


/** taie un poligon CONVEX cu semiplanul (p−o)·n ≤ d (Sutherland–Hodgman) */
function taiePlan(poly: Ring, o: Pt, nx: number, ny: number, d: number): Ring {
  const f = (p: Pt) => (p[0] - o[0]) * nx + (p[1] - o[1]) * ny - d;
  const out: Ring = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const fa = f(a), fb = f(b);
    if (fa <= 0) out.push(a);
    if ((fa < 0 && fb > 0) || (fa > 0 && fb < 0)) {
      const t = fa / (fa - fb);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}

/**
 * VORONOI — celule organice, ca o crăpătură naturală. Singurul tipar care nu se vede a fi
 * generat de o mașină.
 *
 * Nu se construiește diagrama Voronoi și nu se retrage apoi fiecare celulă (retragerea unei
 * reuniuni de celule care se ating pe muchii n-ar face nimic, iar retragerea fiecăreia în parte
 * ar însemna sute de operații de offset). Celula unui centru e direct INTERSECȚIA semiplanelor
 * mediane față de vecini, cu fiecare plan tras spre centru cu T/2 — între doi vecini rămâne
 * atunci exact T, prin construcție, fără nicio operație booleană. Poligoanele ies convexe.
 *
 * Se uită la vecinii din ±2 celule: cu deplasarea aleatoare limitată la 0.35·P, o celulă nu
 * poate ajunge mai departe de 2P.
 */
function celuleVoronoi(unghiDeg: number, P: number, T: number, ex: number, ey: number, samanta: number): Ring[] {
  const rot = rotator(unghiDeg);
  const DEPLASARE = 0.35;
  const nx = Math.ceil(ex / P) + 2, ny = Math.ceil(ey / P) + 2;
  const centru = (i: number, j: number): Pt => [
    (i + (zgomot(i, j, samanta) - 0.5) * 2 * DEPLASARE) * P,
    (j + (zgomot(i, j, samanta + 977) - 0.5) * 2 * DEPLASARE) * P,
  ];
  const out: Ring[] = [];
  for (let j = -ny; j <= ny; j++) {
    for (let i = -nx; i <= nx; i++) {
      const s = centru(i, j);
      let cel: Ring = [[s[0] - 2 * P, s[1] - 2 * P], [s[0] + 2 * P, s[1] - 2 * P],
        [s[0] + 2 * P, s[1] + 2 * P], [s[0] - 2 * P, s[1] + 2 * P]];
      for (let dj = -2; dj <= 2 && cel.length >= 3; dj++) {
        for (let di = -2; di <= 2 && cel.length >= 3; di++) {
          if (!di && !dj) continue;
          const q = centru(i + di, j + dj);
          const vx = q[0] - s[0], vy = q[1] - s[1], L = Math.hypot(vx, vy);
          if (L < 1e-9) continue;
          cel = taiePlan(cel, s, vx / L, vy / L, L / 2 - T / 2);
        }
      }
      // celulele stinse de retragere (doi centri prea apropiați) rămân pur și simplu material
      if (cel.length >= 3 && arieRing(cel) > CELULA_MIN) out.push(cel.map((p) => rot(p[0], p[1])));
    }
  }
  return out;
}

/**
 * VALURI — benzi sinusoidale, la același pas P între axe.
 * Amplitudinea și lungimea de undă sunt legate de pas (P/3 și 4P), ca să nu apară doi
 * parametri în plus în panou pentru un singur tipar. Panta maximă e ~28°, deci distanța
 * MĂSURATĂ perpendicular între două benzi rămâne (P−T)·cos28° — încă mult peste prag.
 */
function familieValuri(unghiDeg: number, P: number, T: number, ex: number, ey: number): Ring[] {
  const rot = rotator(unghiDeg);
  const A = P / 3, lungimeUnda = 4 * P;
  // 16 puncte pe lungimea de undă: abaterea coardei față de sinusoidă e A·(π/16)²/2 ≈ 0.006·P,
  // adică 0.05 mm la pasul implicit — chiar toleranța cu care se aplatizează și conturul literei
  const pas = lungimeUnda / 16;
  const n = Math.ceil(ey / P) + 1;
  const out: Ring[] = [];
  for (let k = -n; k <= n; k++) {
    const pts: Pt[] = [];
    for (let x = -ex; x <= ex + pas; x += pas) pts.push(rot(x, k * P + A * Math.sin((2 * Math.PI * x) / lungimeUnda)));
    out.push(banda(pts, T));
  }
  return out;
}

/**
 * RADIAL — raze din centru + inele concentrice, ca o pânză de păianjen.
 * Numărul de raze se alege ca la jumătatea razei distanța dintre ele să fie chiar pasul cerut.
 * Spre centru razele se apropie și materialul devine un butuc plin — e forma, nu un defect.
 */
function familieRadial(unghiDeg: number, P: number, T: number, R: number): Ring[] {
  const rot = rotator(unghiDeg);
  const out: Ring[] = [];
  const nRaze = Math.max(6, Math.round((Math.PI * R) / P));
  for (let k = 0; k < nRaze; k++) {
    const th = (2 * Math.PI * k) / nRaze;
    out.push(banda([rot(0, 0), rot(R * Math.cos(th), R * Math.sin(th))], T));
  }
  for (let k = 1; k <= Math.ceil(R / P); k++) {
    const r = k * P, N = laturiCerc(r);
    const pts: Pt[] = [];
    for (let v = 0; v < N; v++) { const th = (2 * Math.PI * v) / N; pts.push(rot(r * Math.cos(th), r * Math.sin(th))); }
    out.push(...bandaInchisa(pts, T));
  }
  return out;
}

/**
 * SPIRALĂ — o singură bandă continuă, r = (P/2π)·θ, deci o tură completă crește raza cu
 * exact pasul cerut. Eșantionată cu coarda constantă (nu cu unghiul constant): altfel spre
 * exterior segmentele ar deveni lungi cât o celulă, iar spre centru s-ar înghesui degeaba.
 */
function spirala(unghiDeg: number, P: number, T: number, R: number): Ring[] {
  const rot = rotator(unghiDeg);
  const b = P / (2 * Math.PI);
  const pts: Pt[] = [];
  // se pornește de la raza T, nu de la zero: sub T/2 marginea dinspre interior a benzii ar
  // trece dincolo de centru și banda s-ar auto-intersecta
  for (let th = T / b; th <= R / b;) {
    const r = b * th;
    pts.push(rot(r * Math.cos(th), r * Math.sin(th)));
    th += Math.min(0.4, 1.5 / Math.max(r, 1));
  }
  return [banda(pts, T)];
}

/** tiparul 2D, generat cât să acopere litera (vezi `intindere`) */
export function tipar(CrossSection: any, p: ParamTipar, ext: { ex: number; ey: number; R: number }): any {
  const { model, pas: P, grosimePerete: T, unghi: u } = p;
  const { ex, ey, R } = ext;
  // tiparele descrise prin CELULE: poligoanele sunt golul, materialul e ce rămâne
  const celule = model === 'fagure' ? celuleHexagoane(u, P, T, ex, ey)
    : model === 'perforat' ? celuleCercuri(u, P, T, ex, ey)
      : model === 'caramida' ? celuleCaramida(u, P, T, ex, ey)
        : model === 'voronoi' ? celuleVoronoi(u, P, T, ex, ey, p.varianta)
          : null;
  if (celule) {
    const cs = new CrossSection(celule, 'Positive');
    const plin = CrossSection.square([2 * R, 2 * R], true);
    const pereti = plin.subtract(cs);
    cs.delete(); plin.delete();
    return pereti;
  }
  // tiparele descrise prin BENZI: poligoanele SUNT materialul.
  // Familiile la unghi propriu (diagonal, triunghiular) primesc raza: rotite altfel decât
  // `unghiModel`, semi-laturile dreptunghiului nu le mai descriu întinderea.
  const benzi = model === 'diagonal' ? [u + 45, u - 45].flatMap((x) => familieBenzi(x, P, T, R))
    : model === 'triunghiular' ? [u, u + 60, u + 120].flatMap((x) => familieBenzi(x, P, T, R))
      : model === 'valuri' ? familieValuri(u, P, T, ex, ey)
        : model === 'radial' ? familieRadial(u, P, T, R)
          : spirala(u, P, T, R);
  return new CrossSection(benzi, 'Positive');
}
