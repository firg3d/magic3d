/*
 * "Termoformare din poză": o plasa plata printata, incalzita si presata intre doua matrite devine
 * un bol de forma imaginii. Toate cotele si setarile de print stau aici, nu in geometrie: un prag
 * care ar putea fi altul la alt material sau alta imprimanta e o valoare de configuratie.
 *
 * Cotele sunt in mm. "Adancimea" e cat coboara bolul sub planul plasei.
 */

export const TERMO = {
  /** Plasa: grosimea membranei (devine plasa prin setarile din 3MF: fara straturi pline, gyroid). */
  membrana: 0.8,
  /** Rama plasei: inaltimea totala (cu membrana cu tot) si latimea. */
  ramaInaltime: 4.0,
  ramaLatime: 1.6,
  /** Jocul dintre matrite = grosimea membranei + atat. */
  jocPeste: 0.2,
  /** Adancimea implicita, ca fractiune din latime. */
  adancimeDinLatime: 0.19,
  /** Adancimea sigura: cel mult atat din latimea celei mai inguste zone. */
  adancimeDinIngust: 0.45,
  /** Adancimea minima care mai are sens. */
  adancimeMin: 4,
  /** Matrita de jos: cat iese blocul peste contur, pe fiecare parte; grosimea fundului. */
  margineBloc: 5.5,
  fundJos: 3.5,
  /** Matrita de sus: grosimea placii de apasare. */
  placaSus: 3.0,
  /** Locasul membranei in matrita de jos: cat e mai larg decat conturul si cat de adanc. */
  locasJoc: 0.25,
  locasAdancime: 1.2,
  /** Canalul ramei: rama + atat pe fiecare parte; adanc cat rama + atat. */
  canalJoc: 0.25,
  canalPeste: 0.8,
  /** Polita interioara pe care sta membrana, intre canal si gura cavitatii. */
  polita: 1.55,
  /** Pasul treptelor peretelui rotunjit (= inaltimea stratului matritelor, deci treptele nu se vad). */
  pasTreapta: 0.28,
  /** Cat se poate muta, cel mult, peretele intre doua trepte (langa fundul rotunjit). */
  pasLateralMax: 0.6,
  /** Raza minima a racordarii peretelui. */
  razaMin: 2,
  /** Gaurile de aerisire din fundul cavitatii. */
  aerisiri: 4,
  aerisireDiametru: 2,
  /** Stifturile de centrare (pe matrita de sus) si jocul lor in gaurile matritei de jos. */
  stifturi: 2,
  stiftDiametru: 5,
  stiftLungime: 6,
  stiftJoc: 0.2,
  /** Peretele de material din jurul gaurii unui stift. */
  stiftPerete: 2.5,
  /** Zonele mai inguste de atat se ingroasa (latime, mm). */
  latimeMinima: 6,
  /** Cat se pastreaza din arie, cel putin, ca o latime sa fie "a formei" si nu a unui varf (cautarea zonei celei mai inguste). */
  ariePastrata: 0.97,
  /** Aschiile mai mici de atat (mm²) nu conteaza ca zone. */
  aschieMax: 0.5,
  /** Cutie: cat de departe de margine e gaura de clema in flansa si diametrul ei. */
  gauraClemaDepartare: 3.2,
  gauraClemaDiametru: 2.4,
  /** Cat se lateste polita in jurul unei gauri de clema (raza, de la centrul gaurii la gura cavitatii). */
  pernitaClema: 3.4,
  /** Clema in U: latimea, peretele, jocul peste cele doua membrane, cat ies umflaturile care intra in gauri. */
  clemaLatime: 6,
  clemaPerete: 1.2,
  clemaJoc: 0.25,
  clemaUmflatura: 0.35,
  /** O clema la atatia mm de contur, intre limite. */
  clemaPas: 70,
  clemeMin: 4,
  clemeMax: 10,
  /** Cat poate diferi o forma de oglinda ei (din arie) ca sa fie "simetrica": un singur set de matrite la cutie. */
  simetrieToleranta: 0.02,
  /** Previzualizarea presarii: cat de sus sta matrita de sus deasupra celei de jos. */
  ridicareSus: 18,
  culoareCleme: "#d9822b",
  /** Latimile sugerate in panou si limitele. */
  latimiSugerate: [80, 120, 160],
  latimeImplicita: 120,
  latimeMin: 40,
  /** Placa imprimantei tinta (Bambu A1 mini): blocul trebuie sa incapa pe ea. */
  placa: 180,
  /** Culorile pieselor in editor. */
  culoarePlasa: "#f2b134",
  /*
   * Desenul colorat pe plasa (masurat pe un model de referinta: piese de culoare plate, cat
   * membrana, suprapuse peste ea, fara pereti; liniile negre cu umplere 50%, fata 35%).
   */
  /** Petele mai mici de celula^2 (mm^2) se pierd in plasa si se lasa deoparte. */
  celulaPlasa: 2.5,
  /** O zona mai ingusta de atat (mm) e linie (contur, ochi, gura) si primeste umplerea deasa. */
  latimeLinie: 3.2,
  /** Umplerea liniilor subtiri si a zonelor mari de culoare, procente. */
  densitateLinii: 50,
  densitateZone: 35,
  /** Rama colorata: cat iese modificatorul in afara siluetei (mm) si cat depaseste rama in sus/jos. */
  modificatorPeste: 3,
  modificatorInaltime: 1,
  /** Peste acest raport adancime/latime, desenul se lateste vizibil spre margini: avertizare. */
  raportDesen: 0.22,
  culoareJos: "#2c7be5",
  culoareSus: "#1f8a5b",
};

export type Material = "PLA" | "PETG";
export const MATERIALE: Material[] = ["PLA", "PETG"];

/** Temperaturile de lucru, pentru instructiuni (°C) si secundele de presare. */
export const FORMARE: Record<Material, { incalzire: [number, number]; extrudare: number; presare: [number, number] }> = {
  PLA: { incalzire: [70, 80], extrudare: 220, presare: [20, 30] },
  PETG: { incalzire: [85, 95], extrudare: 245, presare: [20, 30] },
};

/** Modelul plasei: "gyroid" il face slicer-ul din membrana plina; "fagure" e decupat in model. */
export type ModelPlasa = "gyroid" | "fagure";

export type Mod = "bol" | "cutie";

/** Desenul pe plasa: o singura culoare, sau zonele de culoare din poza. */
export type Desen = "fara" | "culori";
export type PaletaCulori = "atelier" | "imagine";
/** Jumatatea din spate a cutiei: tot desenul in oglinda, doar liniile si culoarea dominanta, sau simpla. */
export type Spate = "oglinda" | "contur" | "simplu";

export type SetariTermo = {
  mod: Mod;
  /** Latimea conturului, mm. */
  latime: number;
  /** Adancimea bolului, mm. */
  adancime: number;
  material: Material;
  model: ModelPlasa;
  /** Densitatea plasei, procente (gyroid in slicer sau cat ramane plin la fagure). */
  densitate: number;
  desen: Desen;
  /** Sistemul multicolor al imprimantei (imprimante-multicolor.json): da numarul maxim de culori. */
  sistemCulori: string;
  /** Cate culori are desenul, plasa inclusa; 0 = cate duce imprimanta. */
  culori: number;
  paletaCulori: PaletaCulori;
  /** Rama colorata separat (modificator), in culoarea aleasa ("" = cea mai inchisa din desen). */
  ramaColorata: boolean;
  culoareRama: string;
  spate: Spate;
};

export const SETARI_IMPLICITE: SetariTermo = {
  mod: "bol",
  latime: TERMO.latimeImplicita,
  adancime: Math.round(TERMO.latimeImplicita * TERMO.adancimeDinLatime),
  material: "PLA",
  model: "gyroid",
  densitate: 30,
  desen: "culori",
  sistemCulori: "bambu-ams-lite",
  culori: 0,
  paletaCulori: "atelier",
  ramaColorata: false,
  culoareRama: "",
  spate: "contur",
};

export const LIMITE = {
  densitate: [15, 60],
} as const;

/** Cat de departe de contur sta centrul unui stift (dupa locas si un perete de 1.5 mm). */
export const departeStift = () => TERMO.locasJoc + 1.5 + TERMO.stiftDiametru / 2 + TERMO.stiftJoc;

/** Latimea maxima a conturului: blocul, cu stifturile la capetele lui, sa incapa pe placa. */
export const latimeMaxima = () => Math.floor(TERMO.placa - 2 * (departeStift() + TERMO.stiftDiametru / 2 + TERMO.stiftJoc + TERMO.stiftPerete));

/** Jocul dintre matrite. */
export const jocMatrite = () => TERMO.membrana + TERMO.jocPeste;

/**
 * Setarile de print scrise in 3MF, pe obiect (cheile Bambu Studio / OrcaSlicer). Plasa: fara
 * straturi pline sus si jos, deci membrana iese ca o retea gyroid; matritele: straturi groase, pereti
 * mai multi, PETG (sta mai bine la caldura decat PLA-ul plasei).
 */
export const SETARI_PRINT = {
  plasa: (densitate: number) => ({
    layer_height: "0.2",
    wall_loops: "2",
    top_shell_layers: "0",
    bottom_shell_layers: "0",
    sparse_infill_pattern: "gyroid",
    sparse_infill_density: `${densitate}%`,
    skin_infill_density: `${densitate}%`,
    skeleton_infill_density: `${densitate}%`,
    infill_direction: "70",
  }),
  /** La fagure, gaurile sunt in model: membrana se printeaza plina. */
  plasaFagure: () => ({ layer_height: "0.2", wall_loops: "2" }),
  /** Clemele: mici, deci pline (multi pereti) si cu straturi fine, ca umflaturile sa iasa rotunde. */
  cleme: () => ({ layer_height: "0.12", wall_loops: "4", sparse_infill_density: "100%" }),
  matrita: () => ({ layer_height: "0.28", wall_loops: "3", sparse_infill_density: "15%", sparse_infill_pattern: "grid" }),
};

/** Extruderul / filamentul fiecarei piese in 3MF (1 = plasa, 2 = matritele). */
export const EXTRUDER = { plasa: 1, matrita: 2 } as const;

