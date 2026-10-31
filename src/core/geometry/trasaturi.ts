/**
 * NUCLEU — MATERIAL PREA SUBȚIRE CA SĂ SE PRINTEZE, o singură copie.
 *
 * A stat în două copii (apps/brelocuri, apps/fagure) și urma să apară a treia (apps/cutii).
 * Regula proiectului spune că o bucată trece în nucleu la al doilea consumator; iar
 * docs/plan-cutii-litere.md o cerea pe nume, la capitolul „consecință pentru celelalte
 * aplicații". Cele două copii aveau ACEEAȘI logică și aceleași praguri; difereau doar prin
 * felul în care numărau componentele. S-a păstrat varianta care descompune direct secțiunea
 * 2D — cealaltă o extruda cu înălțimea 1 ca să folosească `volume()` drept arie, ocolire care
 * nu mai e necesară și care cerea instanța Manifold degeaba.
 *
 * Ce NU intră aici: ce face aplicația cu măsurătoarea. Fișierul întoarce cifre; fiecare
 * aplicație judecă singură dacă avertizează, blochează exportul sau tace.
 */

/** material mai îngust decât pragul printabil, măsurat pe o siluetă */
export interface DiagnosticTrasaturi {
  /** cea mai mare pată de material sub prag (mm²) — asta separă o trăsătură subțire de un vârf */
  ariaMaxMM2: number;
  /** tot materialul sub prag (mm²), inclusiv vârfurile ascuțite */
  ariaTotalaMM2: number;
  pragMM: number;
}

/**
 * Trăsătura minimă printabilă: 2 extrudări la duză de 0.4 mm. Sub atât peretele iese zimțat,
 * pentru că slicer-ul nu mai poate pune două treceri alăturate.
 */
export const TRASATURA_MIN = 0.85;

/**
 * De la ce pată de material sub prag se dă avertisment (mm²).
 *
 * CALIBRAT, nu ales din burtă: pe cele 22 de fonturi din bibliotecă, la înălțimea de 40 mm,
 * fonturile cu trăsături groase urcă la cel mult 0.66 mm² (doar vârfuri ascuțite rotunjite de
 * deschidere), iar primul font cu hairline real sare la 1.03. Pragul stă în golul dintre ele.
 * Vezi src/_tests/brelocuri.test.ts, care verifică amândouă capetele.
 */
export const PATA_MAX = 1;

/**
 * Raza celui mai mare cerc care încape în siluetă — adică JUMĂTATE din cea mai groasă trăsătură
 * a literei. Căutare binară pe eroziune: `sil.offset(-r)` e gol exact peste raza asta.
 *
 * Perechea lui `trasaturiSubtiri`: acolo se caută materialul cel mai ÎNGUST, aici cel mai LAT.
 *
 * De ce contează: interiorul unei litere-cutie există exact acolo unde trăsătura are loc pentru
 * doi pereți plus o cameră, deci condiția „rămâne interior utilizabil" se scrie
 * 2·r ≥ 2·perete + lățimea minimă cerută. La Cutii Litere din ea ies reparațiile propuse omului
 * și filtrarea fonturilor; la Litere LED, dacă încape banda.
 *
 * COSTĂ — 14 offseturi pe siluetă, adică de câteva ori o reconstrucție întreagă. De aceea se
 * cheamă LENEȘ, doar când chiar e nevoie de cifră.
 *
 * NU e trăsătura MINIMĂ: aia e altă măsurătoare, pentru alte întrebări.
 */
export function razaInscrisaMaxima(sil: any): number {
  const b = sil.bounds();
  let jos = 0, sus = Math.min(b.max[0] - b.min[0], b.max[1] - b.min[1]) / 2 + 1;
  for (let i = 0; i < 14; i++) {
    const m = (jos + sus) / 2;
    const e = sil.offset(-m, 'Round');
    const gol = e.area() <= 1e-6;
    e.delete();
    if (gol) sus = m; else jos = m;
  }
  return jos;
}

/**
 * Material mai îngust decât `prag`, prin DESCHIDERE morfologică (erodare + dilatare cu prag/2):
 * ce nu supraviețuiește deschiderii e material în care nu încap două treceri de duză.
 *
 * Vârfurile ascuțite ale literei se rotunjesc și ele la deschidere, deci apar în diferență —
 * dar ca pete IZOLATE, de ordinul razei². O trăsătură subțire dă o pată lungă, de zeci de ori
 * mai mare. De asta criteriul e cea mai MARE componentă, nu suma: altfel o literă cu multe
 * colțuri ascuțite ar fi acuzată pe nedrept.
 */
export function trasaturiSubtiri(sil: any, prag: number): DiagnosticTrasaturi {
  const raza = prag / 2;
  const erodat = sil.offset(-raza, 'Round');
  const deschis = erodat.offset(raza, 'Round');
  erodat.delete();
  const subtiri = sil.subtract(deschis);
  deschis.delete();
  const total = subtiri.area();
  if (total <= 1e-6) { subtiri.delete(); return { ariaMaxMM2: 0, ariaTotalaMM2: 0, pragMM: prag }; }
  const bucati = subtiri.decompose();
  const arii = bucati.length ? bucati.map((b: any) => b.area()) : [total];
  for (const b of bucati) b.delete();
  subtiri.delete();
  return { ariaMaxMM2: +Math.max(...arii).toFixed(3), ariaTotalaMM2: +total.toFixed(3), pragMM: prag };
}
