/**
 * COLECTIA "CRACIUN" — cotele, pragurile si perioada sezonului (mm, grade).
 * Geometria (globNume.ts) nu contine praguri proprii: le ia de aici. Valorile implicite vin din
 * masuratorile de referinta (Etapa 0): rama 5 mm x 2,55 mm, fulgi din linii de 1,3-2,2 mm, fundal 1,2 mm.
 */

export const GLOB_NUME = {
  /** Latimea ornamentului (fara ureche). */
  latimeMin: 60,
  latimeMax: 120,
  latime: 90,
  /** Ovalul: inaltimea fata de latime. */
  raportOval: 0.88,
  /** Rama: latime si grosime. */
  latimeRama: 5,
  latimeRamaMin: 3,
  latimeRamaMax: 10,
  grosime: 2.5,
  grosimeMin: 2.5,
  grosimeMax: 4,
  /** Cat iese textul peste rama (se vede ca strat separat). */
  textPeste: 0.3,

  // ---- numele ----
  /** Cat de inalt poate fi numele, ca fractiune din inaltimea interiorului. */
  inaltimeTextMax: 0.42,
  /** Sub atat numele nu mai iese citet; scade intai latimea (pana la `comprimareMax`), apoi apare avertizarea. */
  textMin: 7,
  comprimareMax: 0.7,
  /** Cat intra capetele numelui in rama, ca fractiune din latimea ramei. */
  patrundere: 0.5,
  /** Puntile (de la capete la rama si spre diacritice): latimea, ca fractiune din inaltimea numelui, intre un minim si un maxim. */
  puntePeInaltime: 0.08,
  punteMin: 1.2,
  punteMax: 2,
  /** Bara discreta care leaga literele unui font bloc: latimea si cat urca peste linia de baza (fractiuni din inaltime). */
  baraPeInaltime: 0.14,
  baraPesteBaza: 0.1,
  /** Cat se ingroasa conturul literelor (pe fiecare parte), ca liniile fine sa iasa la print. */
  ingrosareText: 0.2,
  /** Cea mai subtire linie printabila (duza 0,4); sub ea, avertizare. */
  linieMin: 0.8,
  /** Partea din nume care poate disparea la testul liniei minime inainte de avertizare. */
  pierdereLinieMax: 0.03,
  /** Aria sub care o bucata desprinsa e o aschie, nu o piesa (ca ASCHIE_MAX din fagure.ts). */
  aschieMax: 1,

  // ---- decorul ----
  /** Distanta minima dintre decor si nume. */
  distantaDecor: 1.5,
  /** Distanta dintre doua elemente de decor. */
  distantaIntreDecor: 1,
  /** Latimea liniilor de decor (fulgii desenati cu linii). */
  latimeLinieDecor: 1.5,
  /** Marimea unui element, ca fractiune din latimea ornamentului. */
  decorMin: 0.16,
  decorMax: 0.28,
  /** Cat de adanc intra un element sub rama (ca sa se lege de ea), ca fractiune din marimea lui. */
  decorSubRamaMin: 0.15,
  decorSubRamaMax: 0.45,
  /** Elemente cerute la densitatea maxima si incercari de asezare pe element. */
  decorMaxBucati: 12,
  incercariDecor: 60,

  // ---- fundalul ----
  grosimeFundal: 1.2,

  // ---- urechea ----
  diametruGaura: 4,
  pereteUreche: 3,

  // ---- pachetul familie ----
  numeMax: 30,
  distantaPachet: 6,
  distantaPlaci: 20,

  /** Cat se inchid / deschid colturile in care doua zone se ating intr-un punct (vezi globNume.ts). */
  colt: 0.05,

  segmente: 128,
};

/** Fonturile oferite (toate OFL-1.1, cu diacritice romanesti complete; vezi public/magic3d/fonts/LICENTE.md). */
export const FONTURI_CRACIUN = {
  script: ["GreatVibes-Regular.ttf", "Allura-Regular.ttf", "DancingScript-700.ttf", "Pacifico-Regular.ttf", "KaushanScript-Regular.ttf"],
  rotunjite: ["Baloo2-800.ttf", "Baloo2-700.ttf", "Nunito-800.ttf"],
  bloc: ["BebasNeue-Regular.ttf", "Anton-Regular.ttf", "ArchivoBlack-Regular.ttf", "Oswald-700.ttf"],
};

/** Paturile de imprimanta pentru asezarea pachetului (latura, mm). */
export const PATURI = [180, 256] as const;

/** Setarile de print ale obiectului (masurate pe referinte: strat 0,2, 3D honeycomb 15%, 2 pereti, 5 sus / 3 jos). */
export const SETARI_PRINT_GLOB_NUME = { layer_height: "0.2", wall_loops: "2", top_shell_layers: "5", bottom_shell_layers: "3", sparse_infill_pattern: "3dhoneycomb", sparse_infill_density: "15%" };

/** Perioada in care pagina de start arata colectia (luna, zi; trece peste Anul Nou). */
export const SEZON_CRACIUN = { de: [11, 1] as const, pana: [1, 6] as const };

export function inSezonCraciun(data: Date): boolean {
  const z = (data.getMonth() + 1) * 100 + data.getDate();
  const de = SEZON_CRACIUN.de[0] * 100 + SEZON_CRACIUN.de[1];
  const pana = SEZON_CRACIUN.pana[0] * 100 + SEZON_CRACIUN.pana[1];
  return de <= pana ? z >= de && z <= pana : z >= de || z <= pana;
}

/**
 * TURTA DULCE — ornament "glazurat" din sabloane desenate (turta/*.svg): biscuitul (baza) si
 * glazura ca un cordon rotunjit deasupra, fiecare element de glazura o piesa separata.
 * Valorile implicite vin din corecturile clientului: 75 mm pe latura mare, baza 3,5 mm cu muchia de
 * sus rotunjita, cordon de 2 mm x 0,9 mm la 2,8 mm de margine, numele cu linii de minim 1,2 mm.
 */
export const TURTA = {
  /** Latura cea mai mare a ornamentului (cu urechea), aceeasi pentru toate formele unui set. */
  marimeMin: 50,
  marimeMax: 120,
  marime: 75,
  grosimeBaza: 3.5,
  grosimeBazaMin: 2.5,
  grosimeBazaMax: 5,
  /** Raza muchiei de sus a bazei (rotunjita in trepte, cate una pe pas de profil). */
  rotunjireMuchie: 0.7,

  // ---- cordonul de glazura ----
  /** Distanta de la marginea bazei la marginea cordonului (constanta pe tot conturul). */
  distantaCordon: 2.8,
  distantaCordonMin: 1.5,
  distantaCordonMax: 4,
  latimeCordon: 2,
  latimeCordonMin: 1.8,
  latimeCordonMax: 2.2,
  inaltimeCordon: 0.9,
  inaltimeCordonMin: 0.8,
  inaltimeCordonMax: 1,
  /** Profilul rotunjit: cate trepte pe inaltime si cat ramane, cel putin, varful (latimea de sus). */
  pasiProfil: 5,
  varfMin: 0.6,
  /** Liniile de decor din sablon (zigzag, zambet) si spatiul liber dintre doua elemente de glazura. */
  latimeLinieDecor: 1.6,
  distantaGlazura: 1,
  /** Liniile de decor (valuri peste incheieturi) stau la cel putin atat de cordon, la ambele capete. */
  distantaDecorCordon: 1.5,
  /** Cat se rotunjesc, peste jumatate din latime, colturile concave ale liniei de mijloc a cordonului. */
  racordCordon: 0.3,
  /** Aria sub care o bucata de cordon (intr-un varf ingust) nu se mai pune, mm2. */
  cordonMinArie: 80,
  /** Racordarea urechii cu conturul (raza). */
  racordUreche: 1.5,

  // ---- numele, doar in name-zone ----
  /** Inaltimea literelor mari: limitele (aceleasi pentru tot setul); sub minim, intai doua randuri. */
  numeMin: 4.5,
  numeMax: 8,
  /** Spatiul dintre doua randuri, ca fractiune din inaltimea literelor. */
  spatiuRanduri: 0.35,
  /** Pana unde coboara numele (cu avertizare) cand nu incape nici pe doua randuri la minim; ramane in zona. */
  numeMinAbsolut: 1,
  /** Ingrosarea conturului literelor (pe fiecare parte) si linia minima a numelui. */
  ingrosareText: 0.25,
  linieMin: 1.2,
  pierdereLinieMax: 0.03,

  colt: 0.05,
};

export const CULORI_TURTA = { baza: "#ae835b", glazura: "#ffffff", detalii: "#c8282e", ochi: "#38261f", obraji: "#efa17f" };

/** Setarile de print ale obiectului (masurate pe referinte: strat 0,2, grid 15%, 2 pereti, 5 sus / 3 jos). */
export const SETARI_PRINT_TURTA = { layer_height: "0.2", wall_loops: "2", top_shell_layers: "5", bottom_shell_layers: "3", sparse_infill_pattern: "grid", sparse_infill_density: "15%" };

/** Formele, in ordinea din panou (cate un sablon in turta/*.svg); celelalte se adauga pe masura ce sunt desenate. */
export const FORME_TURTA = ["om", "glob", "brad", "stea", "ren", "ciorap", "ursulet", "sac", "inima", "clopotel"] as const;

/** Nivelurile de decor: fiecare sablon are elementele desenate pe niveluri cumulative. */
export const NIVELURI_TURTA = ["simplu", "mediu", "bogat"] as const;
