/**
 * ORNAMENTE DE CRACIUN — toate cotele, tolerantele si pragurile intr-un singur loc (mm, grade).
 * Geometria (ornament.ts) nu contine praguri proprii: le ia de aici.
 */

export const ORNAMENT = {
  /** Diametrul (latura mare) permis. */
  diametruMin: 50,
  diametruMax: 100,

  // ---- ornamentul plat ----
  /** Spatiul lasat intre continut (text, pictograma) si interiorul ramei. */
  margineContinut: 1.2,
  /** Cel mai mic text care mai iese citet la print; sub el apare o avertizare. */
  textMin: 4,
  /** De cate ori, cel mult, se micsoreaza continutul ca sa incapa in contur (cu factorul de mai jos). */
  incercariIncadrare: 10,
  factorIncadrare: 0.9,
  /** Al doilea rand (anul), ca fractiune din inaltimea numelui. */
  randDoi: 0.62,
  /** Pictograma, ca fractiune din diametru. */
  pictograma: 0.24,
  /** Medalionul din mijlocul fulgului (pe care sta numele), ca fractiune din raza. */
  medalionFulg: 0.5,
  /** Peretele minim in jurul gaurii de agatat. */
  peretePrindere: 1.6,
  /** Cata deschidere are carligul, ca fractiune din diametrul gaurii. */
  deschidereCarlig: 0.55,

  // ---- globul 3D ----
  /** Peretele globului: implicit si cel mai subtire care se mai printeaza solid. */
  pereteGlob: 2.4,
  pereteMinGlob: 1.6,
  /** Cat de turtit poate fi globul pe verticala (1 = sfera). */
  turtireMin: 0.75,
  /** Imbinarea: inaltimea locasului de pe fiecare jumatate si jocul pe raza. */
  locasInel: 3,
  tolerantaInel: 0.2,
  /** Partea din perete pe care o ia inelul de imbinare. */
  fractieInel: 0.5,
  /** Stifturile: cate, diametrul (filament de 1,75 mm sau stift printat), jocul in gaura, adancimea pe fiecare jumatate. */
  stifturi: 3,
  diametruStift: 1.75,
  tolerantaStift: 0.15,
  adancimeStift: 4,
  /** Bosajele din interior in care intra stifturile: raza. */
  razaBosaj: 2.4,
  /** Urechea de sus: latime, inaltime, grosime, gaura. */
  urecheLatime: 10,
  urecheInaltime: 9,
  urecheGrosime: 3,
  urecheGaura: 4,
  /** Verificarea pe straturi: pasul (inaltimea stratului), unghiul maxim de consola (fata de verticala), cea mai lata punte acceptata. */
  pasConsola: 0.16,
  consolaMax: 50,
  punteMax: 12,
  /** Aria nesustinuta tolerata pe o jumatate (mm²) inainte de avertizare. */
  consolaArieMax: 30,
  /** Latitudinea centrului numelui (grade) pe emisfera de sus si a anului pe cea de jos. */
  latitudineNume: 28,
  latitudineAn: -26,
  /** Cat de lat poate fi numele pe glob, ca fractiune din diametru. */
  latimeTextGlob: 0.78,

  // ---- pachetul familie ----
  numeMax: 12,
  /** Distanta dintre ornamentele de pe aceeasi placa si latura placii tinta (Bambu A1 mini). */
  distantaPachet: 6,
  /** In scena, placile pachetului stau una langa alta, la atata distanta. */
  distantaPlaci: 20,
  placa: 180,

  /** Segmente pe cerc pentru sfera si cilindri. */
  segmente: 96,
};

/** Setarile de print pe obiect, scrise in 3MF (cheile Bambu Studio / OrcaSlicer). */
export const SETARI_PRINT_ORNAMENT = {
  plat: { layer_height: '0.16', wall_loops: '3', top_shell_layers: '5' },
  glob: { layer_height: '0.16', wall_loops: '3', sparse_infill_density: '15%' },
  mic: { layer_height: '0.12', wall_loops: '4', sparse_infill_density: '100%' },
};
