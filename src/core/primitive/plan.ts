/**
 * NUCLEU — MĂSURI ȘI REPARAȚII PE REGIUNI 2D.
 *
 * Două unelte care erau scrise de două ori în proiect, fiecare puțin altfel:
 *   · `trasaturaMinima` — cât de subțire e cel mai îngust loc dintr-o siluetă;
 *   · `puntiPeGoluri`   — leagă conturul interior al unei litere („O", „a", „3") de restul, ca să
 *                          nu rămână insulă.
 *
 * Al doilea consumator le aduce în nucleu: le foloseau și textul decupat de pe spatele husei, și
 * marcajul din `core/semnatura/`.
 */

let MOD: any = null;
export function configureManifold(mod: any): void { MOD = mod; }

/**
 * CEA MAI ÎNGUSTĂ TRĂSĂTURĂ dintr-o siluetă (mm), prin DESCHIDERE morfologică.
 *
 * Se strânge cu `r/2` și se lasă înapoi cu `r/2`. Ce era mai subțire de `r` nu se mai întoarce,
 * deci aria scade: prima rază la care aria pierde ceva e chiar lățimea celui mai îngust loc.
 *
 * MĂSURĂTOAREA DE DINAINTE ERA ALTA, ȘI PUTEA MINȚI. Se erodă până când forma dispare COMPLET,
 * și se raporta raza aia ca „trăsătură minimă" — dar forma dispare când se termină cea mai
 * GROASĂ trăsătură, nu cea mai subțire. Pe un logo cu o bară de 3 mm și un punct de 0,3, întorcea
 * ~3 și nu avertiza nimic, deși punctul nu se printează. Ieșea corect doar când toate trăsăturile
 * erau la fel de subțiri — cazul în care oricum nu conta.
 *
 * Întoarce `max` dacă nimic nu e sub el: „mai gros decât ne interesează".
 */
export function trasaturaMinima(cs: any, max = 2, pas = 0.05): number {
  if (!MOD) throw new Error('manifold neconfigurat: trasaturaMinima');
  const aria0 = cs.area();
  if (aria0 <= 1e-9) return 0;
  /**
   * ÎMBINAREA E `Miter`, NU `Round`, ȘI ASTA DECIDE DACĂ MĂSURĂTOAREA E FOLOSIBILĂ.
   *
   * Cu `Round`, deschiderea rotunjește fiecare colț convex, iar aria scade chiar și pe o formă
   * fără nicio trăsătură subțire. Măsurat: un pătrat plin de 2 mm „raporta" 0,30 mm — pierderea
   * din cele patru colțuri trecea de prag. Cu `Miter`, un colț convex se reface exact, deci ce
   * lipsește după deschidere a lipsit fiindcă era prea îngust, nu fiindcă era ascuțit.
   *
   * Pragul rămâne mic (0,5% din arie) tocmai pentru că artefactul de colț nu mai există.
   */
  for (let r = pas; r <= max + 1e-9; r += pas) {
    const strans = cs.offset(-r / 2, 'Miter', 4);
    const deschis = strans.offset(r / 2, 'Miter', 4);
    const pierdut = aria0 - deschis.area();
    strans.delete(); deschis.delete();
    if (pierdut > aria0 * 0.005) return +r.toFixed(2);
  }
  return max;
}

/**
 * PUNȚI PE CONTURURILE INTERIOARE.
 *
 * Mijlocul lui „O" e o insulă: la un decupaj cade din piesă, la o gravură rămâne un pinten
 * izolat pe fundul gravurii, care se printează prost. În ambele cazuri se leagă de restul
 * printr-o bară verticală prin centrul golului, care iese din el în sus și în jos — taie
 * trăsătura literei în două locuri, deci face legătura.
 *
 * Se scade din TĂIETOR: ce nu se taie rămâne material.
 *
 * Întoarce chiar `cs` când n-are ce lega, ca o siluetă fără goluri să nu treacă printr-un boolean
 * degeaba.
 */
export function puntiPeGoluri(cs: any, latimePunte: number): { cs: any; punti: number } {
  if (!MOD) throw new Error('manifold neconfigurat: puntiPeGoluri');
  const { CrossSection } = MOD;
  const inele = cs.toPolygons() as [number, number][][];
  const bare: [number, number][][] = [];
  for (const inel of inele) {
    let aria2 = 0;
    for (let i = 0; i < inel.length; i++) {
      const [x1, y1] = inel[i], [x2, y2] = inel[(i + 1) % inel.length];
      aria2 += x1 * y2 - x2 * y1;
    }
    if (aria2 >= 0) continue;   // aria semnată negativă = gol
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [x, y] of inel) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    // bara iese din gol cu încă o înălțime de gol, ca să străpungă sigur trăsătura literei
    const h = (maxY - minY) * 1.5 + latimePunte;
    bare.push([[cx - latimePunte / 2, cy - h], [cx + latimePunte / 2, cy - h],
      [cx + latimePunte / 2, cy + h], [cx - latimePunte / 2, cy + h]]);
  }
  if (!bare.length) return { cs, punti: 0 };
  const barele = new CrossSection(bare, 'Positive');
  const out = cs.subtract(barele);
  barele.delete();
  return { cs: out, punti: bare.length };
}

/**
 * Scalează o siluetă în cutia cerută, PĂSTRÂND RAPORTUL, și o centrează în origine.
 *
 * Se încadrează pe latura care strânge: un wordmark lat într-o cutie înaltă rămâne lat, nu se
 * întinde pe verticală.
 */
export function inCutie(cs: any, latime: number, inaltime: number): any {
  const b = cs.bounds();
  const w = b.max[0] - b.min[0], h = b.max[1] - b.min[1];
  if (w <= 1e-9 || h <= 1e-9) return cs.translate([0, 0]);
  const k = Math.min(latime / w, inaltime / h);
  return cs.scale([k, k]).translate([-(b.min[0] + b.max[0]) / 2 * k, -(b.min[1] + b.max[1]) / 2 * k]);
}
