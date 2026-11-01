/*
 * Matrita de silicon din model 3D: limitele si cotele, intr-un singur loc. Valorile sunt ale noastre,
 * verificate cu silicon de turnare cu platina (Shore 20-30A) si cutii printate din PLA/PETG.
 */

export const SILICON = {
  /** Modelul clientului: scara (%) si cele mai multe triunghiuri pastrate in proiect. */
  scaraMin: 10,
  scaraMax: 400,
  maxTriunghiuri: 30000,
  /** Siliconul din jurul modelului (pana la pereti, fund si capac), mm: implicit, limite si minimul sub care avertizam. */
  distanta: 10,
  distantaMin: 5,
  distantaMax: 25,
  grosimeMin: 6,
  /** Planul de separatie: pasul cu care se cauta cea mai mare sectiune, inclinarea maxima (grade). */
  pasSeparatie: 0.5,
  inclinareMax: 30,
  /** Cutia de turnare: peretele, canelura din fund in care stau peretii si jocul lor, fundul. */
  perete: 2.4,
  canelura: 1.5,
  jocCanelura: 0.3,
  fund: 3,
  margineFund: 4,
  /** Nervurile de la imbinarile peretilor si clemele care le strang (joc = cat aluneca clema). */
  grosimeNervura: 3,
  lungimeNervura: 7,
  taiere: 0.2,
  pereteClema: 2.4,
  jocClema: 0.3,
  /** Placa de separatie (tine locul jumatatii de jos la prima turnare): jocul fata de pereti. */
  jocBloc: 0.3,
  /** Cheile de aliniere: emisfere pe planul de separatie, cu raza cel mult atat (mm). */
  razaCheie: 4,
  /** Canalul de turnare (cu palnie) si rasuflatorile: diametre, palnia, cat intra in model. */
  diametruCanal: 6,
  diametruPalnie: 16,
  inaltimePalnie: 8,
  diametruRasuflatoare: 2.4,
  rasuflatori: 2,
  distantaRasuflatori: 15,
  intrareModel: 1,
  /** Siliconul: densitatea (g/ml) si marja implicita (%). */
  densitate: 1.1,
  marja: 10,
  /** Contrapanta (mm², vezi core/geometry/matrita.ts) peste care avertizam ca piesa se scoate greu. */
  contrapantaMax: 20,
  /** Imprimanta implicita pentru verificarea patului (id din lib/printerPresets.generated.ts). */
  imprimanta: 'bambu-lab-a1-mini',
};

export const SETARI_PRINT_SILICON = {
  model: { layer_height: '0.12', wall_loops: '3', sparse_infill_density: '15%' },
  cutie: { layer_height: '0.2', wall_loops: '3', sparse_infill_density: '15%' },
  mic: { layer_height: '0.16', wall_loops: '4', sparse_infill_density: '100%' },
};
