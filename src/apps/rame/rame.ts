/**
 * APP RAME TEMATICE — geometria produsului.
 *
 * O ramă tematică STÂND ÎN PICIOARE pe o bază ovală, cu numele aplicat peste ea. Trei piese care
 * se printează separat și se lipesc: baza, rama, plăcuța cu numele.
 *
 * DE CE TREI PIESE ȘI NU UNA. Rama e o rețea de fire de 3 mm, iar numele o traversează pe
 * deasupra. Într-o singură piesă ar trebui printate împreună, iar firele rămase în aer sub litere
 * ar cere suporți exact pe fața care se vede. Separate, fiecare se printează culcată, pe fața ei
 * plată, fără niciun suport — și fiecare în culoarea ei, fără schimbări de filament.
 *
 * NUMELE ÎȘI GRAVEAZĂ LOCUL. În ramă se sapă silueta plăcuței, cu joc, pe câțiva zecimi de
 * milimetru. Nu e o îmbinare care ține — e un REPER: la lipit se vede exact unde vine numele, iar
 * adezivul are unde să stea. Fără el, poziționarea unei plăcuțe pe o rețea de fire se face din
 * ochi, o dată pentru fiecare bucată vândută.
 *
 * Ce se refolosește din nucleu, neatins:
 *   · `core/geometry/fir.ts`      traseele îngroșate din care se face orice ramă lineară
 *   · `core/geometry/cuvant.ts`   plăcuța cu nume — litere, aură, punți, o singură componentă
 *   · `masoaraStabilitate`        unghiul de răsturnare al ansamblului, aceeași măsurătoare
 *
 * Ce NU intră aici: texte de interfață. Fișierul întoarce geometrie și măsurători.
 */
import { t } from '../../core/i18n/index.js';
import { configureManifold as configTextSolid, textSolid, type SolidReport } from '../../core/geometry/textSolid.js';
import { configureManifold as configCuvant, construiestePiesa, masoaraStabilitate, UNGHI_MIN,
  type RezultatCuvant, type Stabilitate } from '../../core/geometry/cuvant.js';
import { fire, arcLasat } from '../../core/geometry/fir.js';
import { laturiCerc, type Pt, type Ring } from '../../core/geometry/forme2d.js';
import { trasaturiSubtiri } from '../../core/geometry/trasaturi.js';

let MOD: any = null;
export function configureManifold(mod: any): void {
  MOD = mod;
  configTextSolid(mod);
  configCuvant(mod);
}

// =====================================================================
// BIBLIOTECA DE RAME
//
// O ramă e o FUNCȚIE, nu un contur salvat: grosimea firului și mărimea se schimbă din panou, iar
// un desen fix ar trebui rescris la fiecare valoare. Simbolurile din Cuvinte Decor stau invers —
// acolo forma e dată o dată și doar se scalează.
// =====================================================================

export type TipRama = 'panza' | 'stea' | 'inima' | 'cerc';
export const TIPURI_RAMA: TipRama[] = ['panza', 'stea', 'inima', 'cerc'];

export interface ParamRama {
  tip: TipRama;
  /** raza exterioară, mm — jumătate din lățimea ramei */
  raza: number;
  grosimeFir: number;
  /** câte spițe are pânza / câte colțuri are steaua */
  colturi: number;
  /** câte inele concentrice */
  inele: number;
  /** cât atârnă firele între spițe, ca fracțiune din rază. 0 = arce de cerc, nu pânză. */
  lasare: number;
}

/** unghiul spiței `i`; −π/2 = în sus, deci una dintre ele privește exact în jos */
const unghiSpita = (i: number, n: number) => (2 * Math.PI * i) / n - Math.PI / 2;

/**
 * PÂNZA DE PĂIANJEN: spițe drepte din centru + inele care ATÂRNĂ între ele.
 *
 * Numărul de spițe se ia PAR și cel puțin 6: cu un număr impar nicio spiță nu privește în jos,
 * iar rama n-ar avea vârf cu care să intre în bază.
 */
function traseePanza(p: ParamRama): Pt[][] {
  const n = Math.max(6, Math.round(p.colturi / 2) * 2);
  const trasee: Pt[][] = [];
  for (let i = 0; i < n; i++) {
    const a = unghiSpita(i, n);
    trasee.push([[0, 0], [p.raza * Math.cos(a), p.raza * Math.sin(a)]]);
  }
  for (let k = 1; k <= p.inele; k++) {
    const r = (p.raza * k) / p.inele;
    for (let i = 0; i < n; i++) {
      trasee.push(arcLasat(0, 0, r, unghiSpita(i, n), unghiSpita(i + 1, n), p.lasare));
    }
  }
  return trasee;
}

/** STEA: conturul unei stele cu `colturi` vârfuri, plus razele către ele */
function traseeStea(p: ParamRama): Pt[][] {
  const n = Math.max(5, p.colturi);
  const rIn = p.raza * 0.42;
  const contur: Pt[] = [];
  for (let i = 0; i <= 2 * n; i++) {
    const a = Math.PI / 2 + (Math.PI * i) / n;
    const r = i % 2 === 0 ? p.raza : rIn;
    contur.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  const trasee: Pt[][] = [contur];
  for (let i = 0; i < n; i++) {
    const a = Math.PI / 2 + (2 * Math.PI * i) / n;
    trasee.push([[0, 0], [p.raza * Math.cos(a), p.raza * Math.sin(a)]]);
  }
  return trasee;
}

/**
 * INIMA: conturul clasic, plus inele mai mici inauntru - o rama, nu o inima plina.
 *
 * SPITELE NU SUNT DECOR. Fara ele inelele sunt copii scalate care nu se ating: masurat, la R=50
 * firul de 3 mm inca acopera distanta dintre ele, dar la R=80 se desprind si rama iese in 2
 * bucati - adica se rupe in mana la prima atingere. Inelele fiind scalate FATA DE ORIGINE, o raza
 * care pleaca din centru le taie pe toate, deci o singura spita le leaga pe toate deodata.
 */
function traseeInima(p: ParamRama): Pt[][] {
  const punct = (t: number, k: number): Pt => {
    const x = 16 * Math.sin(t) ** 3;
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    // y NEGAT: în spațiul modelului jos = y mare, iar fără negare inima stă pe lobi, cu vârful
    // în sus. Nu e doar urât — vârful era atunci CEL MAI DE SUS punct, iar piciorul, centrat pe
    // x=0, nu mai prindea nimic: la R=120 rama ieșea în două bucăți, bara separat.
    return [(x * p.raza * k) / 17, (-y * p.raza * k) / 17];
  };
  const contur = (k: number): Pt[] =>
    Array.from({ length: 73 }, (_, i) => punct((2 * Math.PI * i) / 72, k));
  const trasee: Pt[][] = [];
  const nInele = Math.max(1, p.inele);
  for (let k = 0; k < nInele; k++) trasee.push(contur(1 - k * 0.3));
  if (nInele > 1) {
    const n = Math.max(6, p.colturi);
    for (let i = 0; i < n; i++) trasee.push([[0, 0], punct((2 * Math.PI * i) / n, 1)]);
  }
  return trasee;
}

/** CERC: inele concentrice legate prin spițe — rama cea mai simplă și cea mai rigidă */
function traseeCerc(p: ParamRama): Pt[][] {
  const n = Math.max(6, Math.round(p.colturi / 2) * 2);
  const trasee: Pt[][] = [];
  for (let k = 1; k <= p.inele; k++) {
    const r = (p.raza * k) / p.inele;
    trasee.push(arcLasat(0, 0, r, 0, 2 * Math.PI, 0, 8 * Math.max(3, p.inele)));
  }
  for (let i = 0; i < n; i++) {
    const a = unghiSpita(i, n);
    trasee.push([[0, 0], [p.raza * Math.cos(a), p.raza * Math.sin(a)]]);
  }
  return trasee;
}

const TRASEE: Record<TipRama, (p: ParamRama) => Pt[][]> = {
  panza: traseePanza, stea: traseeStea, inima: traseeInima, cerc: traseeCerc,
};

/**
 * Silueta ramei, în planul XY, centrată pe origine. Convenția fonturilor (y în JOS) nu contează
 * aici — desenele sunt simetrice pe verticală sau se desenează direct în ea.
 */
export function siluetaRama(cfg: ParamRama): any {
  const trasee = TRASEE[cfg.tip](cfg);
  return new MOD.CrossSection(fire(trasee, cfg.grosimeFir), 'Positive');
}

// =====================================================================
// PIESA ÎNTREAGĂ
// =====================================================================

export const RAZA_MIN = 30;
export const RAZA_MAX = 120;
export const FIR_MIN = 2;
export const FIR_MAX = 8;
/** cât intră rama în bază — destul cât să nu se clatine, nu atât cât să taie baza în două */
export const INFIGERE_MIN = 3;
export const INFIGERE_MAX = 12;

export interface RameConfig {
  text: string;
  font: any;
  rama: ParamRama;
  /** grosimea ramei pe axa de adâncime, mm */
  grosimeRama: number;
  /** înălțimea literei plăcuței cu nume */
  inaltimeText: number;
  grosimeText: number;
  latimeAura: number;
  netezireAura: number;
  /** cât de adânc se gravează silueta plăcuței în ramă — REPER, nu îmbinare */
  adancimeGravura: number;
  /** jocul dintre plăcuță și gravură */
  jocGravura: number;
  /** baza ovală */
  lungimeBaza: number;
  latimeBaza: number;
  inaltimeBaza: number;
  adancimeInfigere: number;
  jocInfigere: number;
  /** lățimea piciorului — bara de la baza ramei care intră în locaș */
  latimePicior: number;
  /** cât din picior rămâne VIZIBIL deasupra bazei */
  inaltimePicior: number;
  placa: { w: number; d: number };
}

export interface DiagnosticRame {
  /** lățime × înălțime × adâncime ale ansamblului, mm */
  dim: [number, number, number];
  /** bucățile fiecărei piese — toate trebuie să fie 1 */
  bucatiRama: number;
  bucatiText: number;
  /** aria gravurii chiar săpate în ramă: pe o rețea de fire, doar o parte din siluetă prinde material */
  ariaGravuraMM2: number;
  /** amprenta ramei în locașul din bază — suprafața pe care se ține lipitura */
  ariaLocasMM2: number;
  /** câte limbi separate intră în bază. Una singură, lată, e mai bună decât trei subțiri. */
  limbiLocas: number;
  /** cât la sută din silueta plăcuței cade pe fir — sub 25% lipirea se face din ochi */
  reperProcent: number;
  /**
   * Materialul rămas SUB firul cerut, mm². Zero înseamnă că firul e la fel de gros peste tot;
   * o valoare mare înseamnă crestături în coturi, adică exact locurile unde se rupe.
   */
  ariaFirSubtireMM2: number;
  stabilitate: Stabilitate;
  materialCM3: number;
  triunghiuri: number;
  glifeLipsa: string[];
  incapePePlaca: boolean;
}

export interface RameResult {
  baza: any;
  rama: any;
  text: any;
  aura: any | null;
  diagnostice: DiagnosticRame;
  ms: number;
}

/** ce ARATĂ generatorul = model oglindit pe Y; exportul trebuie să coincidă */
export function pentruPrint(corp: any): any {
  return corp.mirror([0, 1, 0]);
}

/** oval alungit, în planul mesei (x lung, z lat) */
function siluetaBaza(lungime: number, latime: number): any {
  const a = lungime / 2, b = latime / 2;
  const n = Math.max(48, laturiCerc(a));
  const inel: Ring = [];
  for (let i = 0; i < n; i++) {
    const t = (2 * Math.PI * i) / n;
    inel.push([a * Math.cos(t), b * Math.sin(t)]);
  }
  return new MOD.CrossSection([inel], 'Positive');
}

export function buildRama(cfg: RameConfig): RameResult {
  if (!MOD) throw new Error(t('geometry.manifoldNeconfigurat', { functie: 'buildRama' }));
  const { Manifold, CrossSection } = MOD;
  const t0 = performance.now();

  // ---------------- RAMA ----------------
  const silRama = siluetaRama(cfg.rama);
  const bbR = silRama.bounds();
  // așezată: centrată pe X, cu vârful de jos la y = 0 (fonturile vin y-jos, deci „jos" e y mare)
  const silAsezata = silRama.translate([-(bbR.min[0] + bbR.max[0]) / 2, -bbR.max[1]]);
  silRama.delete();

  // PICIORUL. Fără el rama se sprijină pe bază exact cu vârful unui fir: măsurat, pânza intra în
  // locaș cu O SINGURĂ limbă de 64 mm², steaua cu 28 mm². O piesă de 100 mm înălțime lipită pe
  // 28 mm² se rupe din prima atingere — și se rupe din lipitură, adică se poate reface, dar la
  // client. Bara de la bază leagă firele de jos într-o singură limbă lată și dă locașului pereți
  // adevărați: la 25 mm lățime și 6 mm grosime, suprafața de lipire urcă la ~370 mm².
  const w = cfg.latimePicior / 2;
  // CÂT DE ÎNALTĂ e bara: destul cât să prindă materialul ramei din dreptul ei. O înălțime fixă
  // merge la pânză, unde o spiță coboară până în vârf, și cade la inimă, unde sub x=0 e crestătura
  // dintre lobi — măsurat, la R=120 golul e de 18 mm, iar bara de 9 mm rămânea piesă separată.
  const bandaJos = new CrossSection([[[-w, 0], [-w, -1e4], [w, -1e4], [w, 0]] as Pt[]], 'Positive');
  const inBanda = silAsezata.intersect(bandaJos);
  const urcare = inBanda.isEmpty() ? 0 : -inBanda.bounds().max[1] + 1;
  bandaJos.delete(); inBanda.delete();
  const hPicior = cfg.adancimeInfigere + Math.max(cfg.inaltimePicior, urcare);
  // sensul TRIGONOMETRIC nu e o preferință: cu 'Positive', un inel în sens invers are înfășurare
  // negativă și e citit ca GAURĂ. Prima variantă avea colțurile în ordine inversă, iar piciorul
  // pur și simplu nu apărea — măsurătoarea locașului ieșea identică cu cea de dinaintea lui.
  const picior = new CrossSection([[[-w, 0], [-w, -hPicior], [w, -hPicior], [w, 0]] as Pt[]], 'Positive');
  const silRamaAsz = silAsezata.add(picior);
  picior.delete(); silAsezata.delete();

  // ---------------- PLĂCUȚA CU NUME ----------------
  // Vine din nucleu, cu tot ce știe el: litere, aură, punți, verificarea de o singură componentă.
  // `perete` ca mod de produs, fiindcă plăcuța nu stă pe masă — nu i se taie talpa dreaptă și nu
  // i se măsoară stabilitatea, alea sunt ale ansamblului.
  const rep: Partial<SolidReport> = {};
  const placuta: RezultatCuvant = construiestePiesa({
    solid: (h: number, g: number, r?: Partial<SolidReport>) => textSolid(cfg.font, cfg.text, h, g, r ?? rep),
    inaltime: cfg.inaltimeText, grosime: cfg.grosimeText,
    punti: true, latimePunte: 1.2,
    // 3.2 ca la Cuvinte Decor: aici literele TREBUIE să se atingă — plăcuța se lipește ca o
    // bucată, iar o literă rămasă liberă ar cădea de pe ramă. La Nume 3D valoarea e alta,
    // fiindcă acolo o punte lungă e o bară slabă prin aer care ține piesa în picioare.
    factorMaxPunte: 3.2,
    contur: cfg.latimeAura > 0 ? 'rama' : 'fara',
    latimeContur: cfg.latimeAura, netezireContur: cfg.netezireAura, grosimeContur: cfg.grosimeText,
    modProdus: 'perete', tipAgatare: 'fara',
    surubCap: 5, surubTija: 2.5, inaltimeCapSurub: 3, latimeGrila: 20, capac: false, grosimeCapac: 0,
    placa: cfg.placa,
  });

  // ---------------- AȘEZAREA ----------------
  // JOS = Y MARE, ca peste tot în nucleu: `talpaPiesei` măsoară amprenta în felia de la `max[1]`.
  // Iar TALPA STĂ LA y = 0 — nu e o convenție internă, e podeaua: viewport-ul așază placa de
  // print în planul y = 0 și inversează Y. Prima variantă construia baza de la y = 0 în JOS, așa
  // că ansamblul apărea atârnat sub placă, cu grila tăind exact prin bază.
  const sus = -cfg.inaltimeBaza;                       // fața de sus a bazei; talpa rămâne la 0
  const yRama = sus + cfg.adancimeInfigere;            // unde ajunge capătul de jos al ramei
  const ramaAsz = Manifold.extrude(silRamaAsz, cfg.grosimeRama).translate([0, yRama, 0]);

  const silBaza = siluetaBaza(cfg.lungimeBaza, cfg.latimeBaza);
  // baza se construiește culcată (planul ei e XZ) și se ridică: extrude pe Y prin rotație
  let baza = Manifold.extrude(silBaza, cfg.inaltimeBaza).rotate([-90, 0, 0])
    .translate([0, sus, cfg.grosimeRama / 2]);
  silBaza.delete();

  // ---------------- LOCAȘUL RAMEI ÎN BAZĂ ----------------
  // Silueta părții ÎNGROPATE, dilatată cu jocul — aceeași regulă ca la locașurile din Litere
  // Decor: se taie din ce intră cu adevărat, nu din toată rama.
  const BIG = 4000;
  const subBaza = ramaAsz.intersect(Manifold.cube([BIG, BIG, BIG], true).translate([0, sus + BIG / 2, 0]));
  let ariaLocas = 0;
  const limbi = subBaza.decompose();
  const nLimbi = subBaza.volume() > 1e-6 ? limbi.length : 0;
  for (const l of limbi) l.delete();
  if (subBaza.volume() > 1e-6) {
    // rotate([90,0,0]) duce (x,y,z) în (x,−z,y): proiecția e chiar planul mesei. Extrudarea de
    // mai jos o întoarce cu rotate([−90,0,0]), inversa exactă, deci cutter-ul se așază înapoi
    // peste ramă — pe x și pe z n-are ce să alunece.
    const silIngropat = subBaza.rotate([90, 0, 0]).project();
    const locas = cfg.jocInfigere > 0 ? silIngropat.offset(cfg.jocInfigere, 'Round') : silIngropat;
    ariaLocas = locas.area();
    // Cutter-ul iese 0.2 mm peste fața de sus (fețele coplanare fac booleanul fragil), dar nu
    // străpunge talpa — un locaș străpuns ar lăsa rama să se vadă pe dedesubt.
    // JOCUL intră și în adâncime, nu doar în contur: altfel fundul locașului și capătul ramei
    // cad exact în același plan, iar la print 0.1 mm de bavură ține rama ridicată și clătinând.
    const cutter = Manifold.extrude(locas, cfg.adancimeInfigere + cfg.jocInfigere + 0.2)
      .rotate([-90, 0, 0]).translate([0, sus - 0.2, 0]);
    const gaurita = baza.subtract(cutter);
    cutter.delete(); baza.delete(); baza = gaurita;
    if (locas !== silIngropat) locas.delete();
    silIngropat.delete();
  }
  subBaza.delete();

  // ---------------- PLĂCUȚA PE RAMĂ, ȘI GRAVURA ----------------
  // Plăcuța vine din nucleu așezată cu talpa la y = 0; se mută pe mijlocul ramei, pe FAȚA ei.
  const bbP = placuta.contur
    ? [placuta.corp.boundingBox(), placuta.contur.boundingBox()]
    : [placuta.corp.boundingBox()];
  const minX = Math.min(...bbP.map((b) => b.min[0])), maxX = Math.max(...bbP.map((b) => b.max[0]));
  const minY = Math.min(...bbP.map((b) => b.min[1])), maxY = Math.max(...bbP.map((b) => b.max[1]));
  // centrul RAMEI, nu al ansamblului: `bbR` e silueta dinaintea piciorului, deci numele stă în
  // mijlocul pânzei, nu coborât de bara care intră în bază.
  const centruRamaY = yRama - (bbR.max[1] - bbR.min[1]) / 2;
  const dx = -(minX + maxX) / 2, dy = centruRamaY - (minY + maxY) / 2;
  const dz = cfg.grosimeRama - cfg.adancimeGravura;
  const muta = (m: any) => m.translate([dx, dy, dz]);
  const text = muta(placuta.corp);
  const aura = placuta.contur ? muta(placuta.contur) : null;
  placuta.corp.delete(); placuta.contur?.delete(); placuta.capac?.delete();

  // GRAVURA: silueta plăcuței, dilatată cu joc, săpată în fața ramei. Pe o rețea de fire prinde
  // doar unde e material — de asta se MĂSOARĂ cât a prins, nu se presupune.
  const silText = text.project();
  const silAura = aura ? aura.project() : null;
  const silPlacuta = silAura ? silText.add(silAura) : silText;
  const silGravura = cfg.jocGravura > 0 ? silPlacuta.offset(cfg.jocGravura, 'Round') : silPlacuta;
  const cutterGrav = Manifold.extrude(silGravura, cfg.adancimeGravura + 0.2).translate([0, 0, dz]);
  const ramaGrav = ramaAsz.subtract(cutterGrav);
  const ariaGravura = ramaAsz.volume() - ramaGrav.volume();
  cutterGrav.delete(); ramaAsz.delete();
  const ariaPlacuta = silGravura.area();
  if (silGravura !== silPlacuta) silGravura.delete();
  if (silPlacuta !== silText) silPlacuta.delete();
  silAura?.delete(); silText.delete();

  // ---------------- MĂSURĂTORI ----------------
  // Firul se măsoară pe SILUETĂ, nu pe parametru: un fir de 3 mm cerut poate ieși de 2 mm în
  // cotul dintre două segmente. Pragul e 90% din cel cerut — sub atât, e crestătură, nu rotunjire.
  const silFir = ramaGrav.project();
  const ariaSubtire = trasaturiSubtiri(silFir, cfg.rama.grosimeFir * 0.9).ariaMaxMM2;
  silFir.delete();

  const corpuri = [baza, ramaGrav, text, aura].filter(Boolean);
  const st = masoaraStabilitate([baza, ramaGrav, text, aura].filter(Boolean));
  const stabilitate: Stabilitate = { ...st, remediu: { fel: 'niciunul', latimeMM: 0 } };
  const bucatiR = ramaGrav.decompose();
  const nR = bucatiR.length;
  for (const p of bucatiR) p.delete();

  let minB = [Infinity, Infinity, Infinity], maxB = [-Infinity, -Infinity, -Infinity];
  let volum = 0, tri = 0;
  for (const c of corpuri) {
    const b = c.boundingBox();
    minB = minB.map((v, i) => Math.min(v, b.min[i]));
    maxB = maxB.map((v, i) => Math.max(v, b.max[i]));
    volum += c.volume(); tri += c.numTri();
  }
  const uw = cfg.placa.w - 10, ud = cfg.placa.d - 10;
  const lat = maxB[0] - minB[0], inalt = maxB[1] - minB[1];
  // la print fiecare piesă stă culcată: rama e cea mai mare, iar amprenta ei e lățime × înălțime
  const incape = (lat <= uw && inalt <= ud) || (inalt <= uw && lat <= ud);

  return {
    baza, rama: ramaGrav, text, aura,
    diagnostice: {
      dim: [+lat.toFixed(1), +inalt.toFixed(1), +(maxB[2] - minB[2]).toFixed(1)],
      bucatiRama: nR, bucatiText: placuta.diagnostice.bucati,
      ariaLocasMM2: +ariaLocas.toFixed(1), limbiLocas: nLimbi,
      ariaGravuraMM2: +(ariaGravura / Math.max(cfg.adancimeGravura, 1e-6)).toFixed(1),
      reperProcent: ariaPlacuta > 0
        ? +((100 * (ariaGravura / Math.max(cfg.adancimeGravura, 1e-6))) / ariaPlacuta).toFixed(0) : 0,
      ariaFirSubtireMM2: +ariaSubtire.toFixed(1),
      stabilitate,
      materialCM3: +(volum / 1000).toFixed(1),
      triunghiuri: tri,
      glifeLipsa: placuta.diagnostice.glifeLipsa,
      incapePePlaca: incape,
    },
    ms: performance.now() - t0,
  };
}

export { UNGHI_MIN };
