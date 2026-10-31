/**
 * APP NUME LED — un CUVÂNT luminos: Nume 3D pus în corpul luminos de la Litere LED.
 *
 * Ce e specific aici, și nu există la niciuna dintre cele două aplicații-părinte, e o TENSIUNE
 * pe care produsul o are din construcție și pe care aplicația trebuie s-o rezolve pe față:
 *
 *   · Nume 3D vrea CURSIV — la un font cursiv literele se leagă între ele, iar cuvântul iese
 *     o singură piesă care stă în picioare.
 *   · Corpul luminos vrea TRĂSĂTURĂ GROASĂ — în ea trebuie să încapă doi pereți opaci, două
 *     praguri și banda LED.
 *   · Cursivul e subțire. Măsurat, „Maria" la 90 mm: GreatVibes iese în 3 bucăți cu 11 camere,
 *     dintre care în NICIUNA nu încape o bandă de 10 mm. Cuvântul ar ieși gol pe dinăuntru și
 *     stins — exact defectul pe care produsul trebuie să-l evite.
 *
 * ÎNGROȘAREA le împacă pe amândouă, și e singurul parametru care poate: mărește cavitatea fără
 * să miște înălțimea cerută a literei, iar peretele opac nu poate coborî sub pragul optic.
 * Măsurat pe aceeași „Maria" la 90 mm: de la 3 mm îngroșare GreatVibes devine O SINGURĂ piesă
 * cu UN SINGUR tunel continuu prin tot cuvântul — o bandă intră pe la un capăt și luminează tot
 * numele. DancingScript de la 4 mm, Pacifico de la 2 mm.
 *
 * De-asta aplicația nu se mulțumește să respingă un font: CALCULEAZĂ îngroșarea de la care
 * merge și o spune. Un „fontul ăsta nu merge" ar fi o minciună — merge, la 3 mm.
 *
 * TOATĂ geometria vine din nucleu: corpul luminos din `luminos.ts` (comun cu Litere LED),
 * măsurătorile de cuvânt din `cuvant.ts` (comune cu Nume 3D). Aici e doar cusătura.
 */
import { configureManifold as configTextSolid, textSolid, type SolidReport } from '../../core/geometry/textSolid.js';
import { configureManifold as configLuminos, construiesteCorpLuminos, verdictBanda,
  ingroasa, bucatiDin, JOC_BANDA, INGROSARE_MAX, PAS_INGROSARE,
  type ParamLuminos, type RezultatLuminos, type VerdictFont } from '../../core/geometry/luminos.js';
import { razaInscrisaMaxima } from '../../core/geometry/trasaturi.js';
import { configureManifold as configCuvant, masoaraStabilitate, MARGINE_PLACA,
  type ModProdus, type Stabilitate } from '../../core/geometry/cuvant.js';

let MOD: any = null;

export function configureManifold(mod: any): void {
  MOD = mod;
  configTextSolid(mod);
  configLuminos(mod);
  configCuvant(mod);
}

export {
  PERETE_OPAC_MIN, FANTA_MIN, BENZI, pasLED, GROSIME_BANDA, PUTERE_PE_METRU, TENSIUNE,
  FATA_MAX_UTIL, PERETE_CANAL, POZITII_CANAL, LOCURI_CANAL, INGROSARE_MAX, PAS_INGROSARE,
  JOC_BANDA, MATERIAL_PESTE_LOCAS, TRASATURA_MIN, PATA_MAX, STANDOFF_TIJA, pentruPrint,
} from '../../core/geometry/luminos.js';
export type {
  TipBanda, PozitieCanal, LocCanal, Camera, TipAgatare, VerdictFont, DiagnosticOptic,
  DiagnosticBanda, DiagnosticCanal, DiagnosticFata, DiagnosticAgatare,
} from '../../core/geometry/luminos.js';
export type { ModProdus, Stabilitate } from '../../core/geometry/cuvant.js';

/**
 * Plaja de înălțimi din panou. E ÎNĂLȚIMEA LITEREI, nu a cuvântului — la fel ca în Nume 3D,
 * fiindcă asta e cota pe care omul o are în cap („litere de 8 cm").
 *
 * Minimul e mai mare decât la Nume 3D (20 mm): sub ~50 mm trăsătura n-are cum să adăpostească
 * doi pereți opaci de 1.6 mm, două praguri și o bandă — nici cu îngroșarea la maxim.
 */
export const INALTIME_MIN = 50;
export const INALTIME_MAX = 250;
export const INALTIME_PAS = 5;

export interface NumeLedConfig extends Omit<ParamLuminos, 'solid'> {
  text: string;
  font: any;
  /** pe masă sau pe perete — mută canalul de cablu și decide dacă se măsoară stabilitatea */
  modProdus: ModProdus;
  /** placa de print, pentru avertismentul de potrivire (mm) */
  placa: { w: number; d: number };
}

/** cât încape pe placă — cuvântul se printează CULCAT PE SPATE, deci amprenta e chiar silueta */
export interface PotrivirePlaca {
  incape: boolean;
  latimeMM: number;
  adancimeMM: number;
  /** cea mai mare înălțime de literă la care cuvântul încape; 0 = nici la minimul din panou */
  inaltimeMaxMM: number;
}

export interface DiagnosticNumeLed {
  potrivire: PotrivirePlaca;
  /** doar la `masa` — pe perete piesa atârnă, nu stă */
  stabilitate: Stabilitate | null;
  /**
   * ÎNGROȘAREA DE LA CARE MERGE (mm), 0 dacă merge deja așa.
   * −1 = nici la maximul plajei nu se leagă și nu încape banda: fontul chiar nu e de cuvinte
   * luminoase la înălțimea asta.
   */
  ingrosareRecomandata: number;
  /** în câte bucăți iese cuvântul; 1 = o piesă, o bandă, un cablu */
  bucati: number;
  camereUtile: number;
}

export interface NumeLedResult extends RezultatLuminos {
  cuvant: DiagnosticNumeLed;
}

/** cusătura: silueta = cuvântul întreg scris cu fontul ales */
const sursa = (cfg: { text: string; font: any }) =>
  (inaltime: number, grosime: number, rep?: Partial<SolidReport>) =>
    textSolid(cfg.font, cfg.text, inaltime, grosime, rep);

/** silueta cuvântului, la o înălțime dată — plată, fără corp; folosită de căutările 2D */
function siluetaCuvant(font: any, text: string, inaltime: number): any {
  const brut = textSolid(font, text, inaltime, 1);
  const sil = brut.project();
  brut.delete();
  return sil;
}

/**
 * Cu ce toleranță se simplifică silueta pentru CĂUTAREA sfatului (mm).
 * Numai pentru sfat — geometria care se printează nu se simplifică niciodată.
 */
const TOLERANTA_SFAT = 0.2;

/** cât de groasă trebuie să fie trăsătura ca să încapă tot ce intră în ea (mm) */
export const trasaturaNecesara = (grosimePerete: number, latimePrag: number, latimeBanda: number) =>
  2 * (grosimePerete + latimePrag) + latimeBanda + JOC_BANDA;

/**
 * ÎNGROȘAREA DE LA CARE CUVÂNTUL DEVINE UN PRODUS (mm); −1 = nu există una în plajă.
 *
 * Două condiții, amândouă obligatorii, și exact ele descriu produsul:
 *   1. ÎNCAPE BANDA — cea mai groasă trăsătură ține doi pereți, două praguri și banda cu joc.
 *   2. O SINGURĂ BUCATĂ — literele s-au legat între ele, deci există UN tunel continuu prin tot
 *      cuvântul. Două bucăți înseamnă două benzi și un fir prin aer între ele.
 *
 * AMÂNDOUĂ SE MĂSOARĂ PE SILUETA CHIAR ÎNGROȘATĂ. Pare risipă — dilatarea cu raza k mărește
 * cercul maxim înscris cu exact k, deci pragul benzii ar ieși dintr-o împărțire, fără nicio
 * geometrie. Am scris varianta aia și dă un răspuns FALS.
 *
 * De ce: îngroșarea nu e o dilatare simplă, ci dilatare urmată de ÎNCHIDERE morfologică, iar
 * închiderea lipește trăsăturile alăturate într-un bloc. Cercul înscris intră apoi în bloc, nu
 * într-o trăsătură. Măsurat pe „Maria" cu GreatVibes: la 2.5 mm îngroșare raza reală e 16.94 mm,
 * nu 6.73 cât prezice formula — de două ori și jumătate mai mult. Formula cerea 4.5 mm acolo
 * unde 2.5 ajung, iar construcția 3D confirmă 2.5: o bucată, o cameră utilă.
 *
 * Morala, a treia oară în funcția asta: aici nimic nu se deduce, se măsoară.
 *
 * Se caută DE JOS ÎN SUS și se iese la primul care merge — răspunsurile utile sunt mici, iar o
 * îngroșare mică e și cea mai ieftină de calculat. (Căutarea binară ar fi părut mai deșteaptă:
 * măsurat, e de 4× mai lentă, fiindcă începe prin a evalua maximul, iar costul crește abrupt cu
 * raza. Mai puțini pași nu înseamnă mai repede când pașii nu costă la fel.)
 *
 * DOUĂ LUCRURI O FAC IEFTINĂ, amândouă găsite măsurând, nu ghicind unde se duce timpul:
 *
 *   · ORDINEA. Numărarea bucăților costă 2 ms, raza înscrisă 2139 — de o mie de ori mai mult.
 *     Se întreabă întâi ieftinul; când literele nici măcar nu s-au legat, raza nici nu se mai
 *     calculează.
 *   · SIMPLIFICAREA. Silueta lui „Maria" în GreatVibes are 1298 de puncte, moștenite din
 *     aplatizarea curbelor fontului. La toleranță de 0.2 mm rămân 454, raza scade de la 2139 ms
 *     la 413, iar valoarea ei se mișcă de la 16.94 mm la 16.98 — a cincea parte dintr-o zecime,
 *     pe un răspuns care oricum se dă din 0.5 în 0.5 mm.
 *
 * Sfatul se cere tot cu un BUTON: chiar și așa costă zecimi de secundă, nu microsecunde, iar
 * o recalculare la fiecare tastă apăsată s-ar simți.
 */
export function ingrosareaCareMerge(font: any, text: string, inaltime: number,
  grosimePerete: number, latimePrag: number, latimeBanda: number): number {
  const necesar = trasaturaNecesara(grosimePerete, latimePrag, latimeBanda);
  const bruta = siluetaCuvant(font, text, inaltime);
  const sil = bruta.simplify(TOLERANTA_SFAT);
  bruta.delete();
  let raspuns = -1;
  for (let n = 0; n * PAS_INGROSARE <= INGROSARE_MAX + 1e-9; n++) {
    const k = n * PAS_INGROSARE;
    const s = k > 0 ? ingroasa(sil, k) : sil;
    // ieftinul întâi: fără litere legate, raza nici nu contează
    const merge = bucatiDin(s) === 1 && 2 * razaInscrisaMaxima(s) >= necesar;
    if (s !== sil) s.delete();
    if (merge) { raspuns = +k.toFixed(2); break; }
  }
  sil.delete();
  return raspuns;
}

/**
 * Verdictul unui font pentru CUVÂNTUL curent — ce se vede în selectorul de fonturi.
 *
 * Deosebirea față de Litere LED: acolo întrebarea e despre o glifă, aici despre tot cuvântul,
 * cu îngroșarea aplicată. Un font poate fi bun pentru „O" și prost pentru „Madalina".
 */
export function evalueazaFont(font: any, text: string, inaltime: number,
  grosimePerete: number, latimePrag: number, latimeBanda: number, ingrosare = 0): VerdictFont {
  const sil = siluetaCuvant(font, text, inaltime);
  const v = verdictBanda(sil, { inaltime, grosimePerete, latimePrag, latimeBanda, ingrosare,
    inaltimeMax: INALTIME_MAX, inaltimePas: INALTIME_PAS });
  sil.delete();
  return v;
}

/** încape amprenta pe placă, în oricare din cele două orientări? (așezarea rotește cu 90°) */
function incapePe(w: number, d: number, placa: { w: number; d: number }): boolean {
  const uw = placa.w - 2 * MARGINE_PLACA, ud = placa.d - 2 * MARGINE_PLACA;
  return (w <= uw + 1e-6 && d <= ud + 1e-6) || (d <= uw + 1e-6 && w <= ud + 1e-6);
}

/**
 * PÂNĂ LA CE ÎNĂLȚIME DE LITERĂ ÎNCAPE CUVÂNTUL PE PLACĂ.
 *
 * Se VERIFICĂ, nu se deduce din proporție: aplatizarea conturului are toleranță ABSOLUTĂ, deci
 * un cuvânt mai mic nu e o copie la scară a celui mare, iar un sfat care nu funcționează e mai
 * rău decât niciun sfat. Aceeași lecție ca la Nume 3D, unde e deja scrisă.
 */
function inaltimeaCareIncape(font: any, text: string, inaltime: number, ingrosare: number,
  latime: number, adancime: number, placa: { w: number; d: number }): number {
  const uw = placa.w - 2 * MARGINE_PLACA, ud = placa.d - 2 * MARGINE_PLACA;
  const raport = Math.min(Math.max(uw, ud) / Math.max(latime, adancime),
    Math.min(uw, ud) / Math.min(latime, adancime));
  let h = Math.floor((inaltime * raport) / INALTIME_PAS) * INALTIME_PAS;
  for (; h >= INALTIME_MIN; h -= INALTIME_PAS) {
    const sil = siluetaCuvant(font, text, h);
    const s = ingrosare > 0 ? ingroasa(sil, ingrosare) : sil;
    const b = s.bounds();
    const ok = incapePe(b.max[0] - b.min[0], b.max[1] - b.min[1], placa);
    if (s !== sil) s.delete();
    sil.delete();
    if (ok) return h;
  }
  return 0;
}

export function buildNumeLed(cfg: NumeLedConfig): NumeLedResult {
  if (!MOD) throw new Error('manifold neconfigurat: buildNumeLed');
  const r = construiesteCorpLuminos({ ...cfg, solid: sursa(cfg) }) as NumeLedResult;
  const [latime, adancime] = r.diagnostice.dimLitera;
  const incape = incapePe(latime, adancime, cfg.placa);

  /**
   * STABILITATEA se măsoară doar pe masă — pe perete piesa atârnă, nu stă.
   *
   * Nucleul o cere cu TALPA LA y = 0 și materialul la y < 0, deci corpurile se aduc acolo
   * înainte. Nu e o formalitate: măsurătoarea compară centrul de masă cu poligonul de sprijin,
   * iar amândouă se citesc față de linia mesei.
   *
   * Se măsoară ANSAMBLUL, corp plus față: fața translucidă e o piesă reală, cu masa ei, lipită
   * în plan vertical pe toată suprafața cuvântului.
   */
  let stabilitate: Stabilitate | null = null;
  if (cfg.modProdus === 'masa') {
    const corpuri = [r.corpOpac, r.corpFata].filter(Boolean);
    const asezate = corpuri.map((c: any) => {
      const bb = c.boundingBox();
      return c.translate([0, -bb.max[1], 0]);
    });
    stabilitate = { ...masoaraStabilitate(asezate), remediu: { fel: 'niciunul', latimeMM: 0 } };
    for (const a of asezate) a.delete();
  }

  r.cuvant = {
    potrivire: {
      incape, latimeMM: +latime.toFixed(1), adancimeMM: +adancime.toFixed(1),
      inaltimeMaxMM: incape ? 0
        : inaltimeaCareIncape(cfg.font, cfg.text, cfg.inaltimeLitera, cfg.ingrosare,
          latime, adancime, cfg.placa),
    },
    stabilitate,
    ingrosareRecomandata: 0,
    bucati: r.diagnostice.bucati,
    camereUtile: r.diagnostice.camereUtile,
  };
  return r;
}
