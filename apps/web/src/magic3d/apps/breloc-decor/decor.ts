/**
 * APP BRELOC DECOR — geometria produsului.
 *
 * Alt produs decât „Brelocuri", deși amândouă se agață de chei. Aici sunt DOUĂ piese care se
 * montează una în alta:
 *
 *   BAZA   — inițiala numelui, mare, dilatată cu o ramă. Fața ei e scobită ca o tăviță: rama
 *            rămâne în relief pe margine, iar în fundul tăviței e săpat un locaș pe forma
 *            numelui. Inelul de agățare iese din ramă, sus.
 *   NUMELE — numele întreg, scris, ca inserție separată în două culori: un fundal (conturul
 *            numelui dilatat) și miezul (literele propriu-zise), care iese peste fundal.
 *
 * Cusătura dintre ele e o singură formă 2D — silueta fundalului numelui. Din ea se scade
 * locașul (dilatat cu jocul de montaj) și tot din ea se construiește piesa (nedilatată). Așa
 * jocul e prin construcție exact cel cerut, în loc să fie o diferență între două forme
 * calculate separat, care s-ar putea desincroniza la orice schimbare de parametru.
 *
 * Convenția de axe, ca peste tot unde se lucrează cu siluete din fonturi: y crește în JOS.
 */
import { t } from '../../core/i18n/index.js';
import { configureManifold as configTextSolid, textSolid, capHeightUnitati, type SolidReport } from '../../core/geometry/textSolid.js';
import { trasaturiSubtiri, TRASATURA_MIN, PATA_MAX, type DiagnosticTrasaturi } from '../../core/geometry/trasaturi.js';

export { TRASATURA_MIN, PATA_MAX };
export type { DiagnosticTrasaturi };

let MOD: any = null;
/** primește instanța manifold din nucleu și o pasează solidului din font */
export function configureManifold(mod: any): void { MOD = mod; configTextSolid(mod); }

/** peretele minim de material sub locaș, ca baza să nu se străpungă (mm) */
export const FUND_MIN = 1;
/** secțiunea minimă a inelului care ține cheile: perete × grosime (mm²) */
export const SECTIUNE_MIN = 4;
/** Aria sub care o bucata desprinsa e o aschie, nu o piesa (aceeasi valoare ca ASCHIE_MAX din fagure.ts). */
const ASCHIE_MAX_MM2 = 1;
/** segmente pe cerc — fix, ca rezultatul să nu depindă de setările globale ale modulului */
const SEGMENTE = 64;
/** scobiturile ies puțin peste fața piesei: fețe coplanare = geometrie fragilă */
const DEPASIRE = 0.2;
/**
 * Raportul dintre înălțimea inițialei și cea a numelui scris.
 * Numele trebuie să încapă în tăvița literei; la 1/3.5 din înălțimea bazei încape la
 * majoritatea combinațiilor, iar restul se regla din „mărimea numelui".
 */
const RAPORT_NUME = 1 / 3.5;

export type PozitieInel = 'stanga' | 'centru' | 'dreapta';

export interface DecorConfig {
  /** inițiala de fundal; se ia din nume, dar poate fi și scrisă de mână */
  initiala: string;
  fontBaza: any;
  inaltimeBaza: number;      // mm, înălțimea inițialei
  latimeRama: number;        // mm, rama din jurul literei
  grosimeBaza: number;       // mm
  adancimeRama: number;      // mm, cât e scobită tăvița sub muchia ramei

  nume: string;
  fontNume: any;
  marimeNume: number;        // factor față de raportul implicit
  offsetNume: number;        // mm, conturul din jurul scrisului
  umpleGauri: boolean;       // contra-formele din contur se astupă
  unghi: number;             // grade, înclinarea numelui
  offX: number; offY: number;
  grosimeNume: number;       // mm, piesa de nume
  iesireMiez: number;        // mm, cât iese miezul peste fundalul lui
  adancimeInlay: number;     // mm, cât intră numele sub fundul tăviței
  joc: number;               // mm, jocul de montaj

  /**
   * Baza cuprinde și amprenta numelui, nu doar litera.
   *
   * Fără asta, un nume mai lat decât inițiala („Laura" pe „L") iese în afara literei, iar
   * capetele inserției rămân în aer: locașul se sapă unde e material și se oprește unde nu e.
   * Generatorul de la care pornește produsul are exact defectul ăsta la propriile lui valori
   * implicite. Cu opțiunea pornită, conturul bazei e reuniunea literei cu fundalul numelui —
   * forma literei se vede în continuare, dar inserția are pat pe toată lungimea ei.
   */
  bazaUrmeazaNumele: boolean;

  inel: boolean;
  pozitieInel: PozitieInel;
  inelX: number; inelY: number;
  diametruInel: number;      // mm, diametrul exterior
  gauraInel: number;         // mm
  grosimeInel: number;       // mm
}

export interface DecorDiagnostics {
  dimBaza: [number, number];
  dimNume: [number, number];
  /** material rămas sub locaș (mm); ≤0 = baza e străpunsă */
  fundRamas: number;
  /** aria de nume care iese în afara literei (mm²); >0 = inserția atârnă peste ramă */
  numeInAfaraMM2: number;
  /** bucăți neconectate ale piesei de nume: >1 = inserția iese în mai multe bucăți */
  bucatiNume: number;
  /** jocul CERUT, care e și cel obținut (locașul e silueta piesei dilatată cu el) */
  joc: number;
  inel: { perete: number; sectiuneMM2: number } | null;
  trasaturiNume: DiagnosticTrasaturi;
  glifeLipsa: string[];
  triunghiuri: number;
}

export interface DecorResult {
  /** baza: litera-tăviță cu ramă, locaș și inel */
  corpBaza: any;
  /** inserția: fundalul numelui */
  corpFundal: any;
  /** inserția: miezul (literele) care iese peste fundal */
  corpMiez: any;
  diagnostice: DecorDiagnostics;
  ms: number;
}

/** aria semnată a unui inel (CCW > 0) */
function ariaSemnata(r: [number, number][]): number {
  let a = 0;
  for (let i = 0; i < r.length; i++) { const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % r.length]; a += x1 * y2 - x2 * y1; }
  return a / 2;
}
/** silueta cu contra-formele umplute — echivalentul lui `fill()` din OpenSCAD */
function umple(CrossSection: any, cs: any): any {
  const exterioare = cs.toPolygons().filter((r: [number, number][]) => ariaSemnata(r) > 0);
  return exterioare.length ? new CrossSection(exterioare, 'Positive') : cs;
}
/** aria unei operații 2D, cu temporarul eliberat imediat (heap-ul WASM nu așteaptă GC-ul JS) */
function arie(cs: any): number { const a = cs.area(); cs.delete(); return a; }
/** cât se mai poate umfla un disc până cedează condiția — căutare binară */
function creste(d0: any, esteOk: (crescut: any) => boolean, maxim = 25): number {
  const test = (d: number) => {
    const c = d > 0 ? d0.offset(d, 'Round') : d0;
    const ok = esteOk(c);
    if (c !== d0) c.delete();
    return ok;
  };
  if (!test(0)) return 0;
  let jos = 0, sus = maxim;
  for (let i = 0; i < 9; i++) { const m = (jos + sus) / 2; if (test(m)) jos = m; else sus = m; }
  return jos;
}

/** înălțimea implicită a scrisului, din înălțimea bazei */
export const inaltimeNume = (inaltimeBaza: number, marime: number) => inaltimeBaza * RAPORT_NUME * marime;

/** prima literă a numelui, ca majusculă — inițiala de fundal */
export function initialaDin(nume: string): string {
  const c = [...nume.trim()][0] ?? 'A';
  return c.toLocaleUpperCase('ro-RO');
}

export function buildDecor(cfg: DecorConfig): DecorResult {
  if (!MOD) throw new Error(t('geometry.manifoldNeconfigurat', { functie: 'buildDecor' }));
  const { Manifold, CrossSection } = MOD;
  const t0 = performance.now();
  const rep: Partial<SolidReport> = {};
  const rep2: Partial<SolidReport> = {};

  // ---------------- BAZA: inițiala, cu ramă ----------------
  const solidBaza = textSolid(cfg.fontBaza, cfg.initiala, cfg.inaltimeBaza, cfg.grosimeBaza, rep);
  const silBazaBruta = solidBaza.project();
  const conturBruta = cfg.latimeRama > 0 ? silBazaBruta.offset(cfg.latimeRama, 'Round') : silBazaBruta;
  // centrat pe origine după conturul exterior: piesa se ține în mână de ramă
  const rb = conturBruta.bounds();
  const cx = (rb.min[0] + rb.max[0]) / 2, cy = (rb.min[1] + rb.max[1]) / 2;
  const contur = conturBruta.translate([-cx, -cy]);
  const silBaza = silBazaBruta.translate([-cx, -cy]);

  // ---------------- NUMELE: solid, înclinat, mutat ----------------
  const h = inaltimeNume(cfg.inaltimeBaza, cfg.marimeNume);
  const solidNume = textSolid(cfg.fontNume, cfg.nume, h, cfg.grosimeNume, rep2);
  const bbN = solidNume.boundingBox();
  const nx = (bbN.min[0] + bbN.max[0]) / 2, ny = (bbN.min[1] + bbN.max[1]) / 2;
  // se rotește în jurul PROPRIULUI centru, apoi se mută: altfel înclinarea l-ar și plimba
  const numeAsezat = solidNume.translate([-nx, -ny, 0]).rotate([0, 0, cfg.unghi]).translate([cfg.offX, cfg.offY, 0]);
  const silNume = numeAsezat.project();
  const fundalBrut = cfg.offsetNume > 0 ? silNume.offset(cfg.offsetNume, 'Round') : silNume;
  const fundal = cfg.umpleGauri ? umple(CrossSection, fundalBrut) : fundalBrut;

  // ---------------- CONTURUL FINAL AL BAZEI ----------------
  // Centrarea rămâne pe literă, nu pe reuniune: altfel o schimbare de nume ar plimba toată
  // piesa prin scenă, iar poziția inserției (offX/offY) ar însemna altceva de la o tastă la alta.
  const rama = cfg.bazaUrmeazaNumele && cfg.latimeRama > 0 ? fundal.offset(cfg.latimeRama, 'Round') : null;
  const conturFinal = rama ? contur.add(rama) : contur;
  // fundul tăviței urmează același contur, retras cu rama: unde s-a lățit baza pentru nume,
  // tăvița se lățește la fel — altfel numele ar sta pe o ramă plină, nu în scobitură
  const zonaTavita = cfg.bazaUrmeazaNumele ? silBaza.add(fundal) : silBaza;

  // ---------------- TĂVIȚA + LOCAȘUL ----------------
  const zFund = cfg.grosimeBaza - cfg.adancimeRama;              // fundul tăviței
  const zLocas = zFund - cfg.adancimeInlay;                      // fundul locașului
  let corpBaza = Manifold.extrude(conturFinal, cfg.grosimeBaza);
  // scobitura mare: rama rămâne pe margine, restul feței coboară cu adâncimea ramei
  const scobitura = Manifold.extrude(zonaTavita, cfg.adancimeRama + DEPASIRE).translate([0, 0, zFund]);
  corpBaza = corpBaza.subtract(scobitura); scobitura.delete();
  // locașul numelui: silueta piesei DILATATĂ cu jocul — de aici vine potrivirea, prin construcție
  const silLocas = cfg.joc > 0 ? fundal.offset(cfg.joc, 'Round') : fundal;
  const locas = Manifold.extrude(silLocas, cfg.adancimeRama + cfg.adancimeInlay + DEPASIRE).translate([0, 0, zLocas]);
  corpBaza = corpBaza.subtract(locas); locas.delete();

  // ---------------- INELUL ----------------
  let inelDiag: DecorDiagnostics['inel'] = null;
  if (cfg.inel && cfg.diametruInel > cfg.gauraInel) {
    const rOut = cfg.diametruInel / 2, rIn = cfg.gauraInel / 2;
    const dx = cfg.pozitieInel === 'stanga' ? -cfg.inaltimeBaza / 3 : cfg.pozitieInel === 'dreapta' ? cfg.inaltimeBaza / 3 : 0;
    // y-ul modelului crește în JOS, deci „sus" înseamnă minus. Inelul se lipește de marginea
    // de sus a conturului, nu de bounding box-ul literei: acolo chiar e material.
    const bbCF = conturFinal.bounds();
    // inelul IESE din contur, nu se ingroapa in el: centrul urca peste marginea de sus cu 40%%
    // din raza, deci discul se suprapune ~60%% cu piesa. Ingropat, n-ar adauga material si ar
    // lasa doar o gaura in mijlocul literei. (y creste in JOS, deci „mai sus" = minus)
    const cxI = dx + cfg.inelX, cyI = bbCF.min[1] - rOut * 0.4 - cfg.inelY;
    const cerc = CrossSection.circle(rOut, SEGMENTE), discInel = cerc.translate([cxI, cyI]); cerc.delete();
    const corpInel = Manifold.extrude(discInel, cfg.grosimeInel);
    const cerc2 = CrossSection.circle(rIn, SEGMENTE), gaura = cerc2.translate([cxI, cyI]); cerc2.delete();
    const taietor = Manifold.extrude(gaura, cfg.grosimeInel + 2 * DEPASIRE).translate([0, 0, -DEPASIRE]);
    corpBaza = corpBaza.add(corpInel).subtract(taietor);
    corpInel.delete(); taietor.delete();
    // peretele MĂSURAT pe conturul final (inelul unit cu litera), nu presupus din diametre
    const conturCuInel = conturFinal.add(discInel);
    const perete = +creste(gaura, (c) => arie(c.subtract(conturCuInel)) <= 1e-6).toFixed(2);
    inelDiag = { perete, sectiuneMM2: +(perete * cfg.grosimeInel).toFixed(2) };
    conturCuInel.delete(); discInel.delete(); gaura.delete();
  }

  // ---------------- PIESA DE NUME ----------------
  const corpFundal = Manifold.extrude(fundal, cfg.grosimeNume);
  // miezul pornește puțin mai sus decât talpa, ca fața de jos să rămână o singură culoare
  const corpMiez = Manifold.extrude(silNume, cfg.grosimeNume + cfg.iesireMiez).translate([0, 0, 0.2]);

  // ---------------- VERIFICĂRI ----------------
  // numele care iese în afara literei atârnă peste ramă și nu se mai poate lipi
  const inAfara = +arie(fundal.subtract(zonaTavita)).toFixed(1);
  // Doar bucatile reale: o aschie de 0.18 mm² langa litera nu e o piesa (CLAUDE.md, "decompose().length
  // nu e un numar de piese"). Pragul e aria unei aschii, inmultita cu grosimea insertiei.
  const parti: any[] = corpFundal.decompose();
  const bucatiNume = parti.filter((p) => p.volume() > ASCHIE_MAX_MM2 * cfg.grosimeNume).length;
  // dimensiunea se ia de pe SOLIDUL final, nu de pe contur: inelul e adăugat la solid, deci
  // conturul nu-l cuprinde, iar piesa ar fi raportată mai mică decât e în mână
  const bbB = corpBaza.boundingBox(), bbNume = fundal.bounds();

  const diagnostice: DecorDiagnostics = {
    dimBaza: [+(bbB.max[0] - bbB.min[0]).toFixed(1), +(bbB.max[1] - bbB.min[1]).toFixed(1)],
    dimNume: [+(bbNume.max[0] - bbNume.min[0]).toFixed(1), +(bbNume.max[1] - bbNume.min[1]).toFixed(1)],
    fundRamas: +zLocas.toFixed(2),
    numeInAfaraMM2: inAfara,
    bucatiNume,
    joc: cfg.joc,
    inel: inelDiag,
    trasaturiNume: trasaturiSubtiri(silNume, TRASATURA_MIN),
    glifeLipsa: [...new Set([...(rep.missingGlyphs ?? []), ...(rep2.missingGlyphs ?? [])])],
    triunghiuri: corpBaza.numTri() + corpFundal.numTri() + corpMiez.numTri(),
  };

  return { corpBaza, corpFundal, corpMiez, diagnostice, ms: performance.now() - t0 };
}
