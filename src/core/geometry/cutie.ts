/**
 * NUCLEU — CORPUL-CUTIE AL UNEI LITERE: pereți, fund, interior gol.
 *
 * Scris pentru Cutii Litere, folosit acum și de Litere LED — unde corpul opac E exact o cutie,
 * plus un capac translucid. Al doilea consumator = trece în nucleu, ca textSolid, fonts,
 * detectorul de trăsături, agățarea și tiparele înaintea lui.
 *
 *   interior = sil.offset(-Wp)                Wp = grosimea peretelui
 *   cutia    = extrude(sil, Gf+H) \ extrude(cavitate, H).ridicat la Gf
 *
 * Scris ca O SINGURĂ scădere, nu ca reuniune de pereți cu fund: `fund ∪ pereți` cere întâi
 * `sil \ interior` în 2D și apoi o reuniune în 3D, adică două operații pe geometria cea mai
 * scumpă. Rezultatul e identic — un bloc plin din care se sapă cavitatea E aceeași cutie.
 *
 * CONTRA-FORMELE se rezolvă singure. La „A" sau „O", golul interior al literei nu face parte
 * din `sil`, deci nu apare nici în fund. Nu curge nimic prin el — e în afara cutiei. Peretele
 * înconjoară și conturul interior, iar cavitatea devine un canal inelar, o singură cameră.
 *
 * CE NU INTRĂ AICI: pragurile. „Sub 6 mm o cameră nu se poate umple cu lichen" e o decizie a
 * aplicației de cutii; la LED constrângerea e cu totul alta — lățimea benzii. De aceea pragurile
 * sunt PARAMETRI, nu constante: fișierul măsoară și clasifică, aplicația hotărăște ce e
 * acceptabil.
 */

/** o cameră a cutiei: o componentă conexă a cavității */
export interface Camera {
  ariaMM2: number;
  /** volumul ei, în mililitri (arie × adâncime / 1000) */
  volumML: number;
  /** destul de lată cât să fie utilă — pragul îl dă aplicația */
  utila: boolean;
}

export interface CavitateCutie {
  /** secțiunea care se sapă din bloc; null = n-a rămas nimic printabil */
  cavitate: any | null;
  /** camerele rămase, în ordinea descrescătoare a volumului */
  camere: Camera[];
  /** câte camere trec pragul de lățime utilă */
  camereUtile: number;
  /** fante sub pragul de printabilitate, umplute LA LOC */
  fanteUmplute: number;
  /** retragerea a golit tot interiorul: iese un bloc plin, nu o cutie */
  interiorGol: boolean;
  /** interiorul brut, înainte de filtrare — al apelantului să-l elibereze */
  interior: any;
}

export interface ParamCavitate {
  /** Wp — grosimea peretelui (mm) */
  grosimePerete: number;
  /** H — adâncimea cutiei, pentru volumul camerelor (mm) */
  adancime: number;
  /**
   * Sub ce lățime o cameră nu mai e utilă pentru ce vrea aplicația (mm).
   * La cutii = cât trebuie ca să încapă lichen; la LED = lățimea benzii plus joc.
   */
  latimeCameraMin: number;
  /**
   * Sub ce lățime un gol NU se printează ca gol (mm). Fantele mai înguste se umplu la loc:
   * slicer-ul le-ar umple oricum, dar prost, cu material scămoșat.
   */
  fantaMin: number;
}

/** aria comună a două secțiuni, cu temporarul eliberat pe loc */
function arieComuna(a: any, b: any): number {
  const x = a.intersect(b);
  const s = x.area();
  x.delete();
  return s;
}

/**
 * Interiorul cutiei, clasificat pe camere.
 *
 * CELE DOUĂ PRAGURI SE APLICĂ PRIN EROZIUNE, NU PRIN ARIE. O fantă de 2×30 mm are 60 mm², adică
 * mai mult decât o cameră rotundă de 8 mm, dar în ea nu intră nimic. Aria nu deosebește o cameră
 * de o crăpătură lungă; lățimea o face. (Aceeași lecție ca la pragul de sprijin de la Litere
 * Fagure, unde aria dădea verdicte pe dos.)
 */
export function cavitateCutie(CrossSection: any, sil: any, p: ParamCavitate): CavitateCutie {
  const interior = sil.offset(-p.grosimePerete, 'Round');
  const interiorGol = interior.area() <= 1e-6;
  const camere: Camera[] = [];
  let cavitate: any = null;
  let fanteUmplute = 0;

  if (!interiorGol) {
    const eFanta = interior.offset(-p.fantaMin / 2, 'Round');
    const eCamera = interior.offset(-p.latimeCameraMin / 2, 'Round');
    const comp = interior.decompose();
    const bune: any[] = [];
    for (const c of comp) {
      const aria = c.area();
      if (arieComuna(c, eFanta) <= 1e-9) { fanteUmplute++; continue; }   // nu se printează a gol
      bune.push(c);
      camere.push({ ariaMM2: +aria.toFixed(1), volumML: +((aria * p.adancime) / 1000).toFixed(1),
        utila: arieComuna(c, eCamera) > 1e-9 });
    }
    eFanta.delete(); eCamera.delete();
    // când nimic nu s-a filtrat, cavitatea E chiar interiorul: nicio recompunere degeaba
    cavitate = fanteUmplute === 0 ? interior : (bune.length ? CrossSection.compose(bune) : null);
    for (const c of comp) c.delete();
    camere.sort((a, b) => b.volumML - a.volumML);
  }

  return { cavitate, camere, camereUtile: camere.filter((c) => c.utila).length,
    fanteUmplute, interiorGol, interior };
}

/**
 * Blocul plin din care s-a săpat cavitatea — cutia goală, fără nimic altceva.
 *
 * Fundul rămâne la z ∈ [0, Gf], cavitatea urcă de la Gf. Implicit ajunge până la gură; cu
 * `inaltimeCavitate` mai mic se oprește mai jos, iar deasupra ei aplicația poate tăia altceva —
 * la Litere LED, locașul lărgit în care se așază fața translucidă.
 *
 * Ce face aplicația mai departe cu solidul ăsta — traforează pereții, sapă un locaș de agățare,
 * adaugă un prag pentru o față translucidă — rămâne al ei.
 */
export function corpCutie(Manifold: any, sil: any, cavitate: any | null,
  grosimeFund: number, adancime: number, inaltimeCavitate = adancime): any {
  const plin = Manifold.extrude(sil, grosimeFund + adancime);
  if (!cavitate) return plin;
  // Cutter-ul iese 0.2 mm peste gură DOAR când cavitatea chiar ajunge acolo. Când se oprește mai
  // jos — la LED, unde deasupra ei urmează locașul lărgit al feței — depășirea ar muta umărul cu
  // două zecimi și ar strica exact cota pe care se sprijină fața.
  const pana = Math.min(inaltimeCavitate, adancime);
  const cutter = Manifold.extrude(cavitate, pana + (pana >= adancime ? 0.2 : 0))
    .translate([0, 0, grosimeFund]);
  const gol = plin.subtract(cutter);
  cutter.delete(); plin.delete();
  return gol;
}
