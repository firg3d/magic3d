/*
 * Presa pentru lut si sapun (doua jumatati): limitele si cotele, intr-un singur loc. Valorile sunt
 * ale noastre, verificate cu sapun de glicerina si lut polimeric.
 */

export const PRESA_LUT = {
  latimeMin: 30,
  latimeMax: 120,
  /** Adancimea cavitatii in fiecare jumatate (piesa are de doua ori atat), mm. */
  adancimeMin: 3,
  adancimeMax: 25,
  draft: 3,
  racordare: 1.5,
  pasDraft: 0.2,
  treapteMax: 120,
  /** Grosimea peretilor (fund si margine), mm. */
  pereteMin: 2.4,
  pereteMax: 10,
  razaColt: 4,
  /** Canalul de surplus: cat de departe de cavitate, cat de lat si de adanc; iesiri spre margine. */
  golCanal: 1.5,
  latimeCanal: 2,
  adancimeCanal: 1,
  /** Stifturile de centrare (pe jumatatea de jos) si gaurile lor (in cea de sus). */
  diametruStift: 5,
  tolerantaStift: 0.2,
  inaltimeStift: 4,
  /** Textul in relief pe fata de sus a piesei: cat de adanc e gravat in jumatatea de sus, si golul pana la contur. */
  adancimeText: 1,
  margineText: 3,
  factorIncadrare: 0.95,
  incercariIncadrare: 24,
  /** Patul imprimantei (A1 mini): cand jumatatile nu incap impreuna, fiecare merge pe placa ei, mm. */
  pat: 180,
  /** Golul dintre cele doua jumatati asezate pe placa, mm. */
  distantaPlaca: 10,
};

export const SETARI_PRINT_PRESA_LUT = { layer_height: '0.16', wall_loops: '3', top_shell_layers: '6', sparse_infill_density: '25%' };
