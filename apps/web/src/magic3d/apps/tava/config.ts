/*
 * Matrita tava (turnare deschisa) si masterul pentru silicon: limitele si cotele, intr-un singur loc.
 * Valorile sunt ale noastre, verificate la turnare (sapun, ceara, ipsos, ciocolata cu folie).
 */

export const TAVA = {
  latimeMin: 15,
  latimeMax: 120,
  adancimeMin: 3,
  adancimeMax: 40,
  /** Unghiul de scoatere implicit pe peretii cavitatii (grade) si racordarea la fund (mm). */
  draft: 4,
  racordare: 1.5,
  /** Treapta pe inaltime cu care se construieste unghiul (cat un strat), si cele mai multe trepte. */
  pasDraft: 0.2,
  treapteMax: 120,
  randuriMax: 6,
  coloaneMax: 8,
  /** Grosimea fundului sub cea mai adanca cavitate, mm. */
  fund: 2,
  razaColt: 3,
  /** Relieful din poza pe fundul cavitatii: cat de adanc (implicit), latura hartii si baza ei, mm. */
  reliefPoza: 1.5,
  laturaHarta: 128,
  bazaHarta: 0.02,
  /** Patul imprimantei pentru avertizare (A1 mini), mm. */
  pat: 180,
  /** Masterul pentru silicon: placa de baza, soclul pe care stau pozitivele, rama de turnare. */
  bazaMaster: 3,
  soclu: 1.5,
  jocRama: 0.3,
  pereteRama: 2.4,
  /** Cat silicon ramane deasupra celui mai inalt pozitiv, mm. */
  capacSilicon: 5,
  /** Siliconul de turnare (platina, tipic): g/ml. */
  densitateSilicon: 1.1,
  /** Modelele STL: cele mai multe triunghiuri pastrate in proiect, si cat contrapanta se tolereaza (mm²). */
  maxTriunghiuri: 30000,
  contrapantaMax: 1,
};

export const SETARI_PRINT_TAVA = {
  tava: { layer_height: '0.2', wall_loops: '3', top_shell_layers: '5', sparse_infill_density: '20%' },
  master: { layer_height: '0.12', wall_loops: '3', top_shell_layers: '6', sparse_infill_density: '20%' },
  rama: { layer_height: '0.2', wall_loops: '3', sparse_infill_density: '15%' },
};
