/**
 * APP CUVINTE DECOR — BIBLIOTECA DE SIMBOLURI.
 *
 * Un simbol ține locul unei litere în cuvânt. Nu e o tematică: tematicile din `public/tematici/`
 * sunt modele 3D cu volum și orientare proprie — un microfon nu se poate extruda ca o glifă și
 * n-are cum să stea în rând cu literele. Simbolurile sunt CONTURURI PLATE, extrudate exact ca
 * silueta unei litere, deci stau în bibliotecă separată, la `public/simboluri/`.
 *
 * DE CE NU SE POT LUA DINTR-UN FONT: niciun font instalat nu are glifa ♥ (U+2665) — verificat
 * la scanare și consemnat în roadmap. Inima nu se obține din contur de font, deci contractul
 * intern nu mai poate fi „un caracter → o glifă", ci „o poziție în cuvânt → un solid, provenit
 * dintr-o glifă SAU dintr-o bibliotecă".
 *
 * METRICILE SE DECLARĂ, NU SE DERIVĂ. Un contur adus din fișier n-are lățime de avans, linie de
 * bază sau înălțime de cap — iar derivarea lor din bounding box dă rezultate greșite în chip
 * previzibil: o inimă centrată pe bbox iese prea sus (bbox-ul ei e mai înalt decât corpul optic)
 * și prea lipită de vecine (bbox-ul nu conține aerul din jur). Cele trei numere se scriu O DATĂ,
 * în manifest, la adăugarea simbolului:
 *
 *   avans      cât se mută cursorul după simbol
 *   inaltime   cât de înalt iese simbolul
 *   linieBaza  cât de sus stă talpa lui față de linia de bază
 *
 * Toate trei în MIIMI DE ÎNĂLȚIME DE LITERĂ (1000 = capHeight), deci un simbol declarat o dată
 * merge la orice mărime și la orice font, fără recalibrare.
 *
 * Conturul se desenează cu y în SUS, cum e natural pentru un desen; fonturile vin cu y în JOS,
 * iar întoarcerea o face `conturSimbol`, care inversează și sensul de parcurgere.
 */
import { arieRing, type Pt, type Ring } from '../../core/geometry/forme2d.js';

export interface Simbol {
  id: string;
  nume: string;
  /** caracterul care îl invocă în text (♥, ★, ⌂) — unul pe care fonturile NU îl au */
  caracter: string;
  /** cât se mută cursorul după simbol, în miimi de înălțime de literă */
  avans: number;
  /** înălțimea simbolului, în miimi de înălțime de literă */
  inaltime: number;
  /** cât de sus stă talpa simbolului față de linia de bază, în miimi */
  linieBaza: number;
  /**
   * Conturul, y în SUS, unități arbitrare — poziția și scara vin din metrici.
   *
   * Mai multe inele, nu unul singur: floarea are ochi, cheia are inel, cadoul are patru goluri
   * între panglici. Convenția e cea din tot proiectul — inel exterior în sens trigonometric,
   * gaură invers — fiindcă `new CrossSection(inele, 'Positive')` umple unde înfășurarea e
   * pozitivă. Compunerea se face în `scripts/simboluri.mjs`, cu `polygon-clipping`.
   */
  contur: Ring[];
}

let LISTA: Simbol[] = [];

/** înregistrează biblioteca (din fetch în browser, din fs în test) */
export function incarcaSimboluri(lista: Simbol[]): void { LISTA = lista; }
export function simboluri(): Simbol[] { return LISTA; }
export function simbolPentru(ch: string): Simbol | undefined { return LISTA.find((s) => s.caracter === ch); }
/** are textul vreun simbol? — decide dacă se poate merge pe drumul simplu, un singur textSolid */
export const areSimboluri = (text: string) => [...text].some((ch) => !!simbolPentru(ch));

/**
 * Conturul simbolului în MILIMETRI, în convenția fontului (y în JOS, linia de bază la y = 0),
 * cu originea la cursor — exact cum vine o glifă din `getPath`.
 *
 * Scara iese din `inaltime`, nu din desen: conturul se aduce la înălțimea declarată, oricât ar
 * fi fost desenat. Pe orizontală se CENTREAZĂ în avans, deci aerul din jur e simetric și declarat
 * o dată, nu moștenit din cât de larg a desenat cineva inima.
 */
export function conturSimbol(s: Simbol, inaltimeLiteraMM: number): Ring[] {
  const mm = inaltimeLiteraMM / 1000;              // un milimetru de miime
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const inel of s.contur) for (const [x, y] of inel) {
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  const k = (s.inaltime * mm) / Math.max(y1 - y0, 1e-9);   // scară uniformă, din înălțimea CERUTĂ
  const latime = (x1 - x0) * k;
  const stanga = (s.avans * mm - latime) / 2;              // centrat în avans
  const talpa = -s.linieBaza * mm;                         // y crește în JOS, deci „sus" e negativ
  // Inversarea lui y schimbă sensul de parcurgere, deci FIECARE inel se întoarce — nu se forțează
  // aria pozitivă pe toate, cum ar veni la îndemână: asta ar transforma găurile în material și
  // ochiul florii s-ar umple.
  return s.contur.map((inel) =>
    inel.map(([x, y]) => [stanga + (x - x0) * k, talpa - (y - y0) * k] as Pt).reverse());
}

/** câte inele sunt găuri — ochiul florii, inelul cheii. Doar pentru raportare. */
export const gauriSimbol = (s: Simbol) => s.contur.filter((r) => arieRing(r) < 0).length;

/** cât se mută cursorul după simbol, în mm */
export const avansSimbol = (s: Simbol, inaltimeLiteraMM: number) => (s.avans * inaltimeLiteraMM) / 1000;
