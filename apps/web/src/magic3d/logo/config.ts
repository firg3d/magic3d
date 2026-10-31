/*
 * "Pornește de la ce ai" - logo / desen -> obiect: limitele si valorile implicite, intr-un singur loc.
 * Imaginea nu pleaca nicaieri: se contureaza in browser si nu se pastreaza in proiect, ramane doar forma.
 */

export const LOGO = {
  /** Latura maxima, in pixeli, la care se micsoreaza o imagine inainte de contur (mai mult = mai fin, mai lent). */
  maxLaturaPx: 1000,
  /** Fisierele mai mari de atat nu se incarca. */
  maxMbFisier: 15,
  /** Cate culori din imagine pot deveni straturi separate. */
  maxCulori: 4,
  /** Cate segmente de linie are tot conturul, cel mult: destul de putine ca nucleul CAD sa construiasca repede. */
  maxSegmente: 1600,
  /** Culoarea reliefului la monocrom si a bazei. */
  culoareRelief: "#1f8a5b",
  culoareBaza: "#f4f7f5",
};

export type TipIesire = "placuta" | "breloc" | "stampila" | "semn" | "prajitura";

export const IESIRI: TipIesire[] = ["placuta", "breloc", "stampila", "semn", "prajitura"];

export type SetariIesire = {
  tip: TipIesire;
  /** Latimea logo-ului, in mm. */
  marime: number;
  /** Grosimea bazei, in mm. */
  baza: number;
  /** Cat iese logo-ul din baza (sau cat de adanc e gravat), in mm. */
  relief: number;
  /** Plachuta: relief sau gravat. */
  gravat: boolean;
  /** Latimea ramei, in mm (0 = fara rama). */
  rama: number;
  /** Raza colturilor bazei, in mm. */
  colturi: number;
  /** Diametrul gaurii de prindere (plăcuță) sau de inel (breloc), in mm; 0 = fara. */
  gaura: number;
};

export const SETARI_IMPLICITE: Record<TipIesire, SetariIesire> = {
  placuta: { tip: "placuta", marime: 60, baza: 3, relief: 1.6, gravat: false, rama: 2, colturi: 4, gaura: 0 },
  breloc: { tip: "breloc", marime: 40, baza: 3, relief: 1.2, gravat: false, rama: 2, colturi: 0, gaura: 4 },
  stampila: { tip: "stampila", marime: 40, baza: 6, relief: 2, gravat: false, rama: 0, colturi: 2, gaura: 0 },
  semn: { tip: "semn", marime: 100, baza: 4, relief: 1.6, gravat: false, rama: 3, colturi: 4, gaura: 0 },
  prajitura: { tip: "prajitura", marime: 70, baza: 0, relief: 0, gravat: false, rama: 0, colturi: 0, gaura: 0 },
};

/** Limitele campurilor din panou. */
export const LIMITE = {
  marime: [10, 250],
  baza: [0.6, 20],
  relief: [0.4, 10],
  rama: [0, 15],
  colturi: [0, 20],
  gaura: [0, 12],
} as const;
