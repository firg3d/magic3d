/**
 * APP NUME 3D — ce e SPECIFIC numelui: textul dintr-un font.
 *
 * Numele întreg, cu litere legate, extrudat gros și așezat pe masă. Nu e o literă mare: e
 * SCRISUL din Litere Decor la 30–40 mm în loc de 4.5, plus ce cere un obiect care stă singur.
 *
 * TOATĂ GEOMETRIA DE PIESĂ a plecat în `core/geometry/cuvant.ts` la al doilea consumator
 * (Cuvinte Decor): punțile, conturul colorat, stabilitatea, agățarea pe perete, potrivirea pe
 * placă. Ce rămâne aici e cusătura: solidul cuvântului se face dintr-un FONT și un TEXT, prin
 * `textSolid`. Cuvinte Decor pune în locul aceleiași cusături un cuvânt în care unele poziții
 * sunt simboluri din bibliotecă — iar restul lanțului nu observă diferența.
 *
 * DE CE NU CONSTRUIEȘTE CONTACTUL ÎNTRE LITERE. La fonturile cursive literele se leagă singure —
 * măsurat, la 80 mm: GreatVibes „matei" iese în 2 bucăți, „Ianis" în 3, „Madalina" în 3, iar
 * bucățile în plus sunt punctele de pe „i", nu litere despărțite. Corpul cuvântului e deja o
 * singură piesă. Deci contactul nu e temelia aplicației; e o opțiune pentru fonturi drepte, unde
 * răspunsul corect e adesea „alege un font cursiv".
 */
import { configureManifold as configTextSolid, textSolid, type SolidReport } from '../../core/geometry/textSolid.js';
import { configureManifold as configCuvant, construiestePiesa, verdictLegare,
  type ParamCuvant, type RezultatCuvant, type VerdictLegare } from '../../core/geometry/cuvant.js';

export function configureManifold(mod: any): void {
  configTextSolid(mod);
  configCuvant(mod);
}

// Constantele, limitele și tipurile piesei vin din nucleu și se re-exportă ca panoul și testul
// să nu aibă nevoie să știe unde stau. Aceeași soluție ca la brelocuri cu `TRASATURA_MIN`.
export {
  INALTIME_MIN, INALTIME_MAX, PAS_INALTIME, GROSIME_MIN, GROSIME_MAX, MARGINE_PLACA,
  PUNTE_MIN, PUNTE_MAX, RAZA_PUNTE, limitePunte, TIPURI_CONTUR, CONTUR_MIN, CONTUR_MAX,
  PAS_CONTUR, MATERIAL_PESTE_LOCAS, UNGHI_MIN, grosimeMinimaLocas, pentruPrint,
} from '../../core/geometry/cuvant.js';
export type {
  TipContur, ModProdus, TipAgatare, Stabilitate, RemediuStabilitate, DiagnosticAgatare,
  PotrivirePlaca, DiagnosticCuvant as NumeDiagnostics,
} from '../../core/geometry/cuvant.js';
export type NumeResult = RezultatCuvant;
/** verdictul unui font, care aici e chiar verdictul sursei de solid */
export type VerdictFont = VerdictLegare;

/** ce cere aplicația de nume: un text și un font, peste parametrii piesei */
export interface NumeConfig extends Omit<ParamCuvant, 'solid' | 'inaltime'> {
  text: string;
  font: any;
  inaltimeLitera: number;
}

/** cusătura: solidul cuvântului = textul scris cu fontul ales, la înălțimea cerută */
const sursa = (cfg: { text: string; font: any }) =>
  (inaltime: number, grosime: number, rep?: Partial<SolidReport>) =>
    textSolid(cfg.font, cfg.text, inaltime, grosime, rep);

export function buildNume(cfg: NumeConfig): NumeResult {
  return construiestePiesa({ ...cfg, inaltime: cfg.inaltimeLitera, solid: sursa(cfg) });
}

/**
 * MĂSURAT, nu dedus din categoria din manifest.
 *
 * Categoria „Cursiv" nu e criteriul: Tangerine, Courgette și Kaushan Script sunt cursive și
 * totuși scriu literele despărțit — măsurat, „Alexandra" iese în 9 bucăți la fiecare din ele,
 * adică fix una pe literă. Iar întrebarea care contează la un nume care stă singur în picioare e
 * chiar asta: se ating literele între ele?
 */
export function evalueazaFont(font: any, text: string, inaltime: number): VerdictFont {
  const litere = [...text].filter((ch) => !/\s/u.test(ch)).length;
  return verdictLegare(sursa({ text, font }), litere, inaltime);
}
