/**
 * APP LITERE LED — cusătura: o LITERĂ dintr-un font devine un corp luminos.
 *
 * TOATĂ GEOMETRIA a plecat în `core/geometry/luminos.ts` la al doilea consumator (Nume LED,
 * care pune un cuvânt întreg în locul literei). Aceeași mutare, din același motiv, ca geometria
 * de piesă care a plecat din `apps/nume` în `cuvant.ts` când a apărut Cuvinte Decor: nimic din
 * corpul luminos nu știe ce e o literă — primește o siluetă și lucrează pe ea.
 *
 * Ce rămâne aici e strict ce e AL LITEREI: solidul se face dintr-un font și un caracter, iar
 * plaja de înălțimi din panou e a acestei aplicații (60–300 mm pe o singură literă; un cuvânt
 * întreg are altă plajă).
 *
 * API-ul public a rămas NESCHIMBAT la mutare, deliberat: `main.ts` și suita de teste nu s-au
 * atins, deci ele sunt chiar dovada că mutarea n-a schimbat comportamentul.
 */
import { configureManifold as configTextSolid, textSolid, type SolidReport } from '../../core/geometry/textSolid.js';
import { configureManifold as configLuminos, construiesteCorpLuminos, verdictBanda,
  type ParamLuminos, type RezultatLuminos, type VerdictFont } from '../../core/geometry/luminos.js';

export function configureManifold(mod: any): void {
  configTextSolid(mod);
  configLuminos(mod);
}

// Constantele, limitele și tipurile corpului luminos vin din nucleu și se re-exportă, ca panoul
// și testul să nu aibă nevoie să știe unde stau. Aceeași soluție ca la nume.ts.
export {
  PERETE_OPAC_MIN, FANTA_MIN, BENZI, pasLED, GROSIME_BANDA, PUTERE_PE_METRU, TENSIUNE,
  FATA_MAX_UTIL, PERETE_CANAL, POZITII_CANAL, LOCURI_CANAL, INGROSARE_MAX, PAS_INGROSARE,
  JOC_BANDA, MATERIAL_PESTE_LOCAS, TRASATURA_MIN, PATA_MAX, STANDOFF_TIJA, pentruPrint,
} from '../../core/geometry/luminos.js';
export type {
  TipBanda, PozitieCanal, LocCanal, DiagnosticTrasaturi, Camera, TipAgatare, VerdictFont,
  DiagnosticFata, DiagnosticOptic, DiagnosticCanal, DiagnosticBanda, DiagnosticAgatare,
  DiagnosticIngrosare,
} from '../../core/geometry/luminos.js';
export type LedDiagnostics = import('../../core/geometry/luminos.js').DiagnosticLuminos;
export type LedResult = RezultatLuminos;

/**
 * Limitele de înălțime din panou — și SURSA UNICĂ pentru sfaturile date omului. Aceeași lecție
 * ca la Cutii Litere: dacă panoul și mesajul n-ar veni din același loc, aplicația ar ajunge să
 * recomande o valoare pe care propriul ei control n-o acceptă.
 */
export const INALTIME_MIN = 60;
export const INALTIME_MAX = 300;
export const INALTIME_PAS = 5;

/** ce cere aplicația de literă: un caracter și un font, peste parametrii corpului luminos */
export interface LedConfig extends Omit<ParamLuminos, 'solid'> {
  litera: string;
  font: any;                 // font opentype deja parsat
}

/** cusătura: silueta = litera scrisă cu fontul ales */
const sursa = (cfg: { litera: string; font: any }) =>
  (inaltime: number, grosime: number, rep?: Partial<SolidReport>) =>
    textSolid(cfg.font, cfg.litera, inaltime, grosime, rep);

export function buildLed(cfg: LedConfig): LedResult {
  return construiesteCorpLuminos({ ...cfg, solid: sursa(cfg) });
}

/**
 * Merge fontul ăsta la litera și configurația curente?
 *
 * FILTRAREA E MĂSURATĂ, NU O LISTĂ. Un font cursiv subțire nu e „de proastă calitate" în sine —
 * e prea subțire PENTRU CONFIGURAȚIA ASTA. La 150 mm nu încape banda în el; la 250 mm încape.
 * O listă fixă ar minți în ambele sensuri.
 */
export function evalueazaFont(font: any, litera: string, inaltimeLitera: number,
  grosimePerete: number, latimePrag: number, latimeBanda: number, ingrosare = 0): VerdictFont {
  const bruta = textSolid(font, litera, inaltimeLitera, 1);
  const sil = bruta.project();
  bruta.delete();
  const v = verdictBanda(sil, { inaltime: inaltimeLitera, grosimePerete, latimePrag, latimeBanda,
    ingrosare, inaltimeMax: INALTIME_MAX, inaltimePas: INALTIME_PAS });
  sil.delete();
  return v;
}
