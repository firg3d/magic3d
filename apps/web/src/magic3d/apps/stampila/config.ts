/*
 * Stampila personalizata: limitele si cotele, intr-un singur loc. Valorile sunt alese de noi si
 * verificate la print (fata din TPU, manerul din PLA), nu preluate din alte generatoare.
 */

export const STAMPILA = {
  latimeMin: 20,
  latimeMax: 100,
  inaltimeMin: 15,
  /** Grosimea placii fetei (sub relief), mm. */
  grosimeFata: 2,
  /** Cea mai subtire linie care se mai printeaza si se mai imprima curat, mm: cerneala, respectiv lut. */
  liniaMin: 0.6,
  liniaMinLut: 1,
  /** Bucatile mai mici de atat (mm²) sunt aschii, nu parti ale conturului. */
  arieAschie: 0.25,
  /**
   * Ce pierde un colt ascutit la verificarea liniilor subtiri creste cu patratul jumatatii de linie:
   * bucatile pierdute mai mici de atatea ori (linie/2)² sunt colturi (varfurile unei stele), nu linii.
   */
  factorColt: 3,
  /** Golul dintre continut si bordura (sau marginea fetei), mm. */
  margine: 1.5,
  /** Raza colturilor la forma patrata si dreptunghiulara, mm. */
  razaColt: 2,
  factorIncadrare: 0.95,
  incercariIncadrare: 24,
  /** Imaginea deasupra textului: inaltimea ei in majuscule de text si golul pana la text. */
  imagineFataDeText: 2.2,
  golImagineText: 0.35,
  /** Urechiusa de orientare de pe marginea de sus a fetei si a talpii manerului, mm. */
  razaCheie: 2.5,
  /** Manerul: talpa (cat fata), apoi cilindrul, ciuperca sau blocul. */
  talpa: 5,
  cilindruFractie: 0.55,
  cilindruMin: 12,
  cilindruMax: 28,
  cilindruInaltime: 40,
  ciupercaPicior: 0.4,
  ciupercaPiciorMin: 10,
  ciupercaPiciorMax: 18,
  ciupercaPiciorInaltime: 26,
  ciupercaCap: 14,
  ciupercaCapInaltime: 8,
  blocInaltime: 22,
  /** Marcajul de orientare de pe varful manerului: cat iese si cat sta de margine, mm. */
  marcajInaltime: 0.6,
  marcajMargine: 2,
  segmente: 96,
};

export const SETARI_PRINT_STAMPILA = {
  fata: { layer_height: '0.12', wall_loops: '3', sparse_infill_density: '100%' },
  maner: { layer_height: '0.2', wall_loops: '3', sparse_infill_density: '20%' },
};
