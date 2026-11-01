/*
 * Presa de hartie (embosser): limitele si cotele, intr-un singur loc. Valorile sunt ale noastre,
 * verificate pe carton si hartie de 160-300 g/m².
 */

export const PRESA = {
  /** Diametrul emblemei: o presa de mana nu apasa uniform pe mai mult (raza maxima 20 mm). */
  diametruMin: 20,
  diametruMax: 40,
  /** Grosimea hartiei implicita: carton subtire, mm. */
  hartie: 0.3,
  /** Toleranta de print adaugata peste grosimea hartiei: jocul = hartie + toleranta, mm. */
  toleranta: 0.1,
  /** Cel mai fin detaliu pe care hartia il mai ia, mm. */
  detaliuMin: 0.8,
  /**
   * Ce pierde un colt ascutit la verificarea liniilor subtiri creste cu patratul jumatatii de linie:
   * bucatile pierdute mai mici de atatea ori (linie/2)² sunt colturi (varfurile unei stele), nu linii.
   */
  factorColt: 3,
  /** Golul dintre continut si inelul de margine al emblemei, mm. */
  margine: 1.2,
  factorIncadrare: 0.95,
  incercariIncadrare: 24,
  imagineFataDeText: 2.2,
  golImagineText: 0.35,
  /** Pernuta care poarta matrita iese peste emblema cu atat, mm, si are inaltimea `pernuta`. */
  marginePernuta: 4,
  pernuta: 2,
  /** Clestele: grosimea bratelor, latimea minima, cat iese bratul dincolo de pernuta, mm. */
  grosimeBrat: 5,
  latimeMinBrat: 30,
  capatBrat: 3,
  /** Golul dintre balama si pernuta, mm. */
  golBalama: 4,
  /** Balamaua print-in-place (forma Balama a editorului): ax Ø3, jocul implicit al editorului, cinci zale. */
  razaAx: 1.5,
  jocBalama: 0.4,
  zale: 5,
  /** Doua placi simple cu stifturi de centrare. */
  grosimePlaca: 4,
  stifturi: [100, 220, 320],
  diametruStift: 4,
  tolerantaStift: 0.2,
  /** Cat intra stiftul in placa cealalta inainte ca matritele sa se atinga, mm. */
  intrareStift: 3,
  segmente: 96,
};

export const SETARI_PRINT_PRESA = { layer_height: '0.12', wall_loops: '4', sparse_infill_density: '40%' };
