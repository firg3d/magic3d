/**
 * NUCLEU — PIESA DINTR-UN CUVÂNT: punți, contur colorat, stabilitate, agățare pe perete.
 *
 * Tot ce se întâmplă cu un cuvânt extrudat gros, DUPĂ ce silueta lui există: bucățile care
 * plutesc se leagă cu punți, conturul colorat se dilată și se netezește, piesa se măsoară dacă
 * stă pe masă sau se sapă ca să atârne pe perete, iar amprenta se compară cu placa de print.
 *
 * A fost scris pentru Nume 3D. Cuvinte Decor e ACEEAȘI piesă — un cuvânt gros, cu contur, care
 * stă sau atârnă — și diferă într-un singur punct: o poziție din cuvânt poate fi un SIMBOL adus
 * din bibliotecă, nu o glifă de font. Al doilea consumator, deci nucleu, ca textSolid, fonts,
 * agatare și punti înaintea lui. Copierea a costat deja o dată: textSolid a ajuns în trei copii
 * divergente, iar una scala Courgette de 5.2× prea mare.
 *
 * CUSĂTURA e o singură funcție: `solid(înălțime, grosime)`, care întoarce solidul brut al
 * cuvântului. Nucleul nu știe dacă înăuntru e un font, o bibliotecă de simboluri sau amândouă;
 * are nevoie să-l poată CERE DIN NOU la altă înălțime, fiindcă sfaturile („încape până la 45 mm",
 * „lățește conturul la 9 mm") se verifică prin reconstrucție, nu se calculează.
 *
 * Ce NU intră aici: texte de interfață, culori, liste de fonturi. Fișierul întoarce geometrie și
 * măsurători; aplicația judecă ce e acceptabil și cum se spune.
 */
import { t } from '../i18n/index.js';
import { type SolidReport } from './textSolid.js';
import { conturExterior, leagaComponente, planificaPunti, type RaportPunti } from './punti.js';
import { arieRing, centroid, laturiCerc, type Pt, type Ring } from './forme2d.js';
import { pozitieAgatare, inclinareAgatare, conturCheie, conturGrila, conturCerc,
  JOC_CAPAC, STANDOFF_TIJA, type TipAgatare } from './agatare.js';

export type { TipAgatare, SolidReport };

let MOD: any = null;
export function configureManifold(mod: any): void { MOD = mod; }

/**
 * DE UNDE VINE SOLIDUL CUVÂNTULUI.
 *
 * Se cere la o înălțime dată, nu o singură dată: aproape toate sfaturile aplicației se verifică
 * reconstruind (înălțimea care încape pe placă, lățimea de contur la care piesa stă). O siluetă
 * scalată n-ar fi același lucru — aplatizarea conturului are toleranță ABSOLUTĂ, deci o literă
 * mai mică iese cu alte vârfuri.
 */
export type SursaSolid = (inaltime: number, grosime: number, rep?: Partial<SolidReport>) => any;

/** înălțimea literei (capHeight), în mm — limitele panoului ȘI ale sfaturilor */
export const INALTIME_MIN = 20;
export const INALTIME_MAX = 200;
export const PAS_INALTIME = 5;
/** grosimea de sine stătător. Sub 15 mm numele nu mai stă singur decât rezemat. */
export const GROSIME_MIN = 8;
export const GROSIME_MAX = 60;
/** marginea plăcii folosită de așezarea automată (core/geometry/layout.ts) */
export const MARGINE_PLACA = 5;
/** lățimea minimă a unei punți: două extrudări la duză de 0.4 mm. Sub atât se rupe la manipulare. */
export const PUNTE_MIN = 0.8;
export const PUNTE_MAX = 4;
/**
 * Cât de departe are voie să fie o bucată ca să merite legată, ca fracțiune din înălțimea literei.
 * PROPORȚIONAL, nu în milimetri: distanța de la punctul lui „i" la literă e o proprietate a
 * desenului fontului, deci crește odată cu litera. Un prag fix ar lega totul la 200 mm și nimic
 * la 25 mm. 0.3 acoperă și punctele, și literele desprinse — vezi lungimile măsurate în test.
 */
export const RAZA_PUNTE = 0.3;

/**
 * CÂT MERITĂ O PUNTE depinde de ce ține.
 *
 * Pentru un punct de pe „i" e o fracțiune din înălțimea literei. Pentru o treime de cuvânt
 * desprinsă — Satisfy „Mădălina" iese în trei blocuri de 1818, 793 și 1328 mm² — orice punte e
 * mai bună decât o bucată liberă în cutie. Deci limita e cea mai mare dintre fracțiunea din
 * înălțime și DIMENSIUNEA bucății: o punte mai scurtă decât piesa pe care o ține se justifică
 * singură. Aceeași regulă la evaluarea fonturilor și la construcție, ca verdictul din selector
 * să nu poată contrazice ce iese pe ecran.
 */
export function limitePunte(arii: number[], inaltime: number, factor = 1): number[] {
  return arii.map((a) => Math.max(RAZA_PUNTE * inaltime * factor, Math.sqrt(a)));
}

/**
 * PUNTI ADAPTIVE — raza creste DOAR cat e nevoie.
 *
 * Raza implicita (`RAZA_PUNTE`) e potrivita pentru majoritatea fonturilor, dar la unele
 * literele stau prea departe ca sa fie legate: Caveat, Montserrat-100 si NanumPenScript ieseau
 * in 2-3 bucati, adica piese care se rup in mana. Mesajul era limpede — „4 ramase dupa punti" —
 * deci puntile se planificau, doar ca nu ajungeau.
 *
 * Marirea razei implicite ar fi fost gresita: ar fi adaugat punti si acolo unde nu trebuie,
 * schimband iesiri care merg azi. Asa, se incearca intai raza normala; daca piesa ramane in
 * bucati, se reia cu una mai mare, marginit. Cazurile sanatoase nici nu ating factorii de mai
 * sus — ies din prima incercare.
 *
 * Ultimul factor e plafonul: peste el, o „punte" ar fi o bara lunga si urata prin aer, iar
 * raspunsul corect nu mai e o punte, ci un avertisment — care exista deja.
 */
const TREPTE_PUNTE = [1, 1.5, 2.2, 3.2];

/**
 * Treptele de reincercare, taiate la plafonul cerut de aplicatie. Fara plafon (sau cu 1) se
 * intoarce o singura treapta, adica exact comportamentul de dinainte de reincercarea adaptiva.
 */
export function trepteePunte(factorMax = 1): number[] {
  return TREPTE_PUNTE.filter((f) => f <= factorMax + 1e-9);
}

/**
 * Unde ajunge piesa. Nu e o etichetă, mută geometria:
 *   · `masa`   — talpa se taie DREPT la linia de bază, ca piesa să stea; stabilitatea blochează
 *                exportul; niciun locaș în spate.
 *   · `perete` — conturul își păstrează forma întreagă (o talpă dreaptă n-are ce căuta pe perete),
 *                stabilitatea nu se mai măsoară — piesa atârnă, nu stă — și apare sistemul de
 *                agățare, săpat în SPATELE piesei.
 */
export type ModProdus = 'masa' | 'perete';
/** cât material trebuie să rămână peste locaș ca să reziste la greutatea piesei (mm) */
export const MATERIAL_PESTE_LOCAS = 2;
/** înălțimea canalului la agățătoarea cu dinți (mm) */
const CANAL_GRILA = 8;

export interface ParamCuvant {
  /** producătorul solidului brut — o glifă, un cuvânt, un cuvânt cu simboluri */
  solid: SursaSolid;
  /** înălțimea literei (capHeight), mm — scara la care se cere solidul */
  inaltime: number;
  grosime: number;
  modProdus: ModProdus;
  tipAgatare: TipAgatare;
  /** diametrul capului și al tijei șurubului de perete (mm) */
  surubCap: number;
  surubTija: number;
  inaltimeCapSurub: number;
  /** lățimea canalului la agățătoarea cu dinți (mm) */
  latimeGrila: number;
  /** la „gaura": se generează și capacul care ascunde capul șurubului */
  capac: boolean;
  grosimeCapac: number;
  /** leagă automat bucățile care plutesc (puncte, diacritice, litere care nu se ating) */
  punti: boolean;
  latimePunte: number;
  /**
   * Cât are voie să crească raza punților dacă piesa rămâne în bucăți. Lipsă sau 1 = deloc.
   *
   * CONSTRÂNGEREA APARȚINE APLICAȚIEI, nu nucleului. Prima variantă a reîncercării adaptive era
   * cablată aici, cu plafon 3.2 pentru toată lumea — și a reparat Cuvinte Decor stricând Nume
   * 3D: 17 eșecuri de tipul „punte de 28.88 mm, peste limita de 26.3". Amândouă cerințele sunt
   * legitime, și diferite:
   *
   *   · Cuvinte Decor — literele TREBUIE să se atingă; o punte mai lungă e prețul corect;
   *   · Nume 3D — numele stă singur în picioare, iar o punte lungă e o bară slabă prin aer.
   *
   * Nucleul nu poate alege între ele fără să greșească pentru una, așa că nu alege: primește.
   * O aplicație nouă își declară valoarea explicit, în loc să moștenească tăcut politica alteia.
   */
  factorMaxPunte?: number;
  contur: TipContur;
  latimeContur: number;
  netezireContur: number;
  /** grosimea plăcii din spate; ignorată la ramă, care are grosimea numelui */
  grosimeContur: number;
  /** placa de print, ca să se poată spune CÂT încape, nu doar că nu încape */
  placa: { w: number; d: number };
}

/**
 * Cum arată a doua culoare:
 *   · `placa` — numele stă pe o placă profilată, ca la brelocuri. Mai simplă, mai rigidă, și dă
 *     suprafață de sprijin: talpa devine conturul plăcii, nu câteva picioare de literă.
 *   · `rama`  — bandă în ACELAȘI plan cu numele, care îi urmează conturul.
 */
export type TipContur = 'fara' | 'placa' | 'rama';
export const TIPURI_CONTUR: TipContur[] = ['fara', 'placa', 'rama'];
export const CONTUR_MIN = 1;
export const CONTUR_MAX = 25;
export const PAS_CONTUR = 0.5;
/** cât intră rama în literă, ca reuniunea lor să fie un solid, nu două care se ating (mm) */
const SUPRAPUNERE_RAMA = 0.1;

export interface DiagnosticCuvant {
  /** lățime × înălțime × grosime, în mm */
  dim: [number, number, number];
  /** bucăți neconectate DUPĂ punți. Verificarea care contează cel mai mult: trebuie să fie 1. */
  bucati: number;
  /** bucăți ÎNAINTE de punți. Cursivele dau 1–4; bucățile în plus sunt punctele și diacriticele. */
  bucatiInainte: number;
  /** aria fiecărei bucăți (înainte de punți), descrescător — punct sau literă desprinsă? */
  ariiBucatiMM2: number[];
  /** punțile puse; `ramase` = bucăți prea departe ca să merite legate */
  punti: RaportPunti;
  /** conturul a legat singur bucățile, deci nu s-a mai pus nicio punte */
  legatDeContur: boolean;
  /** contra-forme astupate de netezirea conturului: un „a" fără ochi nu mai e „a" */
  contraFormeInchise: number;
  /** aria conturului, mm² — 0 când nu e cerut */
  ariaConturMM2: number;
  /** stă singură piesa pe masă? La Nume 3D răspunsul BLOCHEAZĂ exportul. Doar în modul „masă". */
  stabilitate: Stabilitate;
  /** sistemul de agățare, doar în modul „perete" */
  agatare: DiagnosticAgatare;
  /** caractere cerute pentru care fontul nu produce geometrie */
  glifeLipsa: string[];
  materialCM3: number;
  triunghiuri: number;
  /** încadrarea în placă, cu înălțimea până la care ÎNCAPE (verificată prin reconstrucție) */
  placa: PotrivirePlaca;
}

export interface PotrivirePlaca {
  incape: boolean;
  /** amprenta de print: numele stă CULCAT pe spate, deci lățimea × înălțimea literei */
  latimeMM: number;
  adancimeMM: number;
  /** cea mai mare înălțime de literă la care numele încape; 0 = nici la minimul din panou */
  inaltimeMaxMM: number;
}

export interface RezultatCuvant {
  corp: any;
  /** conturul colorat, ca al doilea corp; null când nu e cerut */
  contur: any | null;
  /** capacele care ascund capul șurubului — PIESE SEPARATE, nu parte din nume */
  capac: any | null;
  diagnostice: DiagnosticCuvant;
  ms: number;
}

/** ce ARATĂ generatorul = model oglindit pe Y; exportul trebuie să coincidă, altfel iese invers */
export function pentruPrint(corp: any): any {
  return corp.mirror([0, 1, 0]);
}

/**
 * Solidul numelui, așezat: centrat pe X, cu TALPA la y = 0 (fonturile vin y-jos, deci talpa e
 * maximul lui Y) și cu grosimea pe Z, de la 0. Așa stă în picioare în viewport fără nicio
 * transformare, iar exportul e aceeași piesă oglindită.
 */
function solidAsezat(cfg: ParamCuvant, rep?: Partial<SolidReport>): any {
  const brut = cfg.solid(cfg.inaltime, cfg.grosime, rep);
  const bb = brut.boundingBox();
  const asezat = brut.translate([-(bb.min[0] + bb.max[0]) / 2, -bb.max[1], 0]);
  brut.delete();
  return asezat;
}

/** încape amprenta pe placă, în oricare din cele două orientări? (așezarea rotește cu 90°) */
function incapePe(w: number, d: number, placa: { w: number; d: number }): boolean {
  const uw = placa.w - 2 * MARGINE_PLACA, ud = placa.d - 2 * MARGINE_PLACA;
  return (w <= uw + 1e-6 && d <= ud + 1e-6) || (d <= uw + 1e-6 && w <= ud + 1e-6);
}

/**
 * PÂNĂ LA CE ÎNĂLȚIME ÎNCAPE — cifra pe care o cere planul („avertisment care spune cât încape").
 *
 * Proporția dă doar punctul de plecare. Răspunsul se VERIFICĂ reconstruind numele la valoarea
 * propusă: lățimea nu scade chiar liniar cu înălțimea (aplatizarea conturului are toleranță
 * ABSOLUTĂ, deci o literă mai mică nu e o copie la scară a celei mari), iar un sfat care nu
 * funcționează e mai rău decât niciun sfat. Aceeași lecție ca la reparațiile din Cutii Litere.
 *
 * Se coboară din pas în pas de la estimare în jos, ca valoarea întoarsă să fie una pe care
 * omul chiar o poate tasta în panou.
 */
function inaltimeaCareIncape(cfg: ParamCuvant, latime: number, adancime: number): number {
  const raport = Math.min(
    (cfg.placa.w - 2 * MARGINE_PLACA) / Math.max(latime, 1e-6),
    (cfg.placa.d - 2 * MARGINE_PLACA) / Math.max(adancime, 1e-6),
  );
  /** încape piesa construită la înălțimea h? (se reconstruiește PIESA, nu doar numele:
   *  conturul adaugă lățime de fiecare parte, iar amprenta care contează e a piesei care
   *  chiar pleacă la print) */
  const incapeLa = (h: number): boolean => {
    const c = construieste({ ...cfg, inaltime: h });
    const bb = cutiaPiesei([c.corp, c.contur]);
    c.corp.delete(); c.contur?.delete(); c.capac?.delete();
    return incapePe(bb.max[0] - bb.min[0], bb.max[1] - bb.min[1], cfg.placa);
  };

  // estimarea, rotunjită în JOS la pasul panoului; de acolo se coboară până când chiar încape
  let h = Math.min(cfg.inaltime, Math.floor((cfg.inaltime * raport) / PAS_INALTIME) * PAS_INALTIME);
  for (; h >= INALTIME_MIN; h -= PAS_INALTIME) {
    if (!incapeLa(h)) continue;
    // ȘI ÎNAPOI ÎN SUS. Estimarea de plecare presupune că amprenta crește proporțional cu
    // înălțimea, dar conturul adaugă o lățime CONSTANTĂ, nescalată — deci la litere mici
    // estimarea iese prea mică, iar sfatul lăsa milimetri nefolosiți. Coborârea singură nu
    // putea corecta asta niciodată, fiindcă pleca deja de sub adevăr.
    while (h + PAS_INALTIME <= cfg.inaltime && incapeLa(h + PAS_INALTIME)) h += PAS_INALTIME;
    return h;
  }
  return 0;
}

// =====================================================================
// STABILITATEA — la 35 mm grosime nu mai e informativă, e blocantă
//
// „Un nume care cade nu se livrează." Deci întrebarea nu e „cât de mare e talpa" — o talpă
// mare dar îngustă e tot un domino. Întrebarea e la CE ÎNCLINARE se răstoarnă, iar aia se
// calculează exact: poligonul de sprijin e înfășurătoarea convexă a punctelor de contact, iar
// piesa cade când verticala centrului de masă iese din el.
//
// Centrul de masă nu cere nicio integrare pe mesh: ambele corpuri sunt extrudări de grosime
// constantă, deci fiecare are centrul chiar deasupra centroidului secțiunii lui, la jumătatea
// grosimii. `centroid` din core/geometry/forme2d.ts îl dă direct.
// =====================================================================

/** felia de la talpă în care se caută contactul cu masa, mm */
const FELIE_TALPA = 0.5;
/**
 * Unghiul de răsturnare sub care piesa nu se livrează.
 *
 * 8°: la o piesă de birou de 60–80 mm înălțime asta înseamnă că suportă o împingere laterală de
 * ~14% din greutate fără să plece, adică o atingere cu mâna sau o masă zdruncinată. Sub atât,
 * numele stă doar cât nu-l atinge nimeni. Nu e o cifră luată din aer: la variantele măsurate,
 * rama de 35 mm dă 25–40°, iar placa subțire de 6 mm dă valori negative — cade singură.
 */
export const UNGHI_MIN = 8;

export interface Stabilitate {
  /** aria de contact cu masa, mm² */
  ariaMM2: number;
  /** la ce înclinare a mesei se răstoarnă piesa, grade. 0 = pleacă singură. */
  unghiMinGrade: number;
  /** cât are de mers verticala centrului de masă până iese din sprijin, mm */
  marjaMM: number;
  /** înălțimea centrului de masă deasupra mesei, mm */
  inaltimeCentruMM: number;
  staSingura: boolean;
  /** ce se poate face ca să stea; se caută doar când NU stă */
  remediu: RemediuStabilitate;
}

/**
 * CE SE POATE FACE ca numele să stea.
 *   · `contur`  — nu are contur deloc; cu unul de `latimeMM` stă
 *   · `latime`  — are contur, dar prea îngust; de la `latimeMM` stă
 *   · `niciunul`— nici la conturul maxim nu stă. Se întâmplă la fonturile cu o coadă lungă sub
 *                 linia de bază: piesa se sprijină pe vârful ei, iar niciun contur n-o lățește
 *                 destul. Răspunsul corect e alt font, nu alt parametru.
 */
export interface RemediuStabilitate { fel: 'niciunul' | 'contur' | 'latime'; latimeMM: number }

/** înfășurătoarea convexă (lanț monoton Andrew), în sens trigonometric */
function infasuratoare(p: Pt[]): Pt[] {
  if (p.length < 3) return p.slice();
  const s = [...p].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const jos: Pt[] = [], sus: Pt[] = [];
  for (const q of s) { while (jos.length >= 2 && cross(jos[jos.length - 2], jos[jos.length - 1], q) <= 0) jos.pop(); jos.push(q); }
  for (let i = s.length - 1; i >= 0; i--) { const q = s[i]; while (sus.length >= 2 && cross(sus[sus.length - 2], sus[sus.length - 1], q) <= 0) sus.pop(); sus.push(q); }
  jos.pop(); sus.pop();
  return jos.concat(sus);
}

/**
 * Amprenta pe masă: materialul din felia de la talpă, proiectat pe podea.
 * `rotate([90,0,0])` duce (x,y,z) în (x,−z,y), deci proiecția e chiar planul mesei, în (x, −z).
 */
function talpaPiesei(corpuri: any[]): { arie: number; puncte: Pt[] } {
  const { Manifold } = MOD;
  const bb = cutiaPiesei(corpuri);
  const felie = Manifold.cube([bb.max[0] - bb.min[0] + 2, FELIE_TALPA, bb.max[2] - bb.min[2] + 2])
    .translate([bb.min[0] - 1, bb.max[1] - FELIE_TALPA, bb.min[2] - 1]);
  let arie = 0;
  const puncte: Pt[] = [];
  for (const corp of corpuri) {
    if (!corp) continue;
    const jos = corp.intersect(felie);
    if (jos.volume() > 1e-9) {
      const rotit = jos.rotate([90, 0, 0]);
      const sec = rotit.project();
      arie += sec.area();
      for (const inel of sec.toPolygons() as Ring[]) for (const pt of inel) puncte.push([pt[0], pt[1]]);
      sec.delete(); rotit.delete();
    }
    jos.delete();
  }
  felie.delete();
  return { arie, puncte };
}

/** centrul de masă al piesei, în coordonate de model (extrudări de grosime constantă) */
function centruDeMasa(corpuri: any[]): { x: number; y: number; z: number } {
  let m = 0, x = 0, y = 0, z = 0;
  for (const corp of corpuri) {
    if (!corp) continue;
    const sec = corp.project();
    const [cx, cy] = centroid(sec);
    const a = sec.area();
    sec.delete();
    const bb = corp.boundingBox();
    const g = bb.max[2] - bb.min[2];
    const v = a * g;
    m += v; x += cx * v; y += cy * v; z += ((bb.min[2] + bb.max[2]) / 2) * v;
  }
  return m > 0 ? { x: x / m, y: y / m, z: z / m } : { x: 0, y: 0, z: 0 };
}

export function masoaraStabilitate(corpuri: any[]): Omit<Stabilitate, 'remediu'> {
  const { arie, puncte } = talpaPiesei(corpuri);
  const cm = centruDeMasa(corpuri);
  // talpa e la y = 0 și materialul are y < 0, deci înălțimea centrului deasupra mesei e −y
  const inaltimeCentru = -cm.y;
  const hull = infasuratoare(puncte);
  if (hull.length < 3 || inaltimeCentru <= 0) {
    return { ariaMM2: +arie.toFixed(1), unghiMinGrade: 0, marjaMM: 0, inaltimeCentruMM: +inaltimeCentru.toFixed(1), staSingura: false };
  }
  // proiecția centrului de masă pe podea, în ACEEAȘI convenție ca amprenta: (x, −z)
  const p: Pt = [cm.x, -cm.z];
  let marja = Infinity;
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i], b = hull[(i + 1) % hull.length];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    // înfășurătoarea e trigonometrică, deci „în interior" = la stânga fiecărei laturi
    marja = Math.min(marja, ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) / len);
  }
  const unghi = marja <= 0 ? 0 : (Math.atan(marja / inaltimeCentru) * 180) / Math.PI;
  return {
    ariaMM2: +arie.toFixed(1),
    unghiMinGrade: +unghi.toFixed(1),
    marjaMM: +marja.toFixed(1),
    inaltimeCentruMM: +inaltimeCentru.toFixed(1),
    staSingura: unghi >= UNGHI_MIN,
  };
}

/**
 * DE LA CE LĂȚIME DE CONTUR STĂ — remediul, verificat prin reconstrucție, nu dedus.
 *
 * Conturul e singurul parametru care chiar lățește TALPA: el coboară până la linia de bază tot
 * ce e la mai puțin de R de ea, deci un contur mai lat aduce mai multe litere în sprijin. Grosimea
 * numelui nu ajută — ea mută și centrul de masă odată cu sprijinul.
 *
 * Se caută în trepte de 2.5 mm, apoi se rafinează în jos cu pasul panoului, ca valoarea întoarsă
 * să fie una tastabilă și cea mai mică dintre cele care merg. Verificat rebuild cu rebuild: un
 * „mărește la 12 mm" care tot cade e mai rău decât niciun sfat.
 */
function remediuStabilitate(cfg: ParamCuvant): RemediuStabilitate {
  const fel = cfg.contur === 'fara' ? 'contur' : 'latime';
  const baza: ParamCuvant = cfg.contur === 'fara' ? { ...cfg, contur: 'placa' } : cfg;
  const start = cfg.contur === 'fara' ? CONTUR_MIN : cfg.latimeContur + PAS_CONTUR;
  const tine = (lat: number) => {
    const c = construieste({ ...baza, latimeContur: lat });
    const s = masoaraStabilitate([c.corp, c.contur]);
    c.corp.delete(); c.contur?.delete(); c.capac?.delete();
    return s.staSingura;
  };
  let gasit = 0;
  for (let lat = start; lat <= CONTUR_MAX + 1e-9; lat += 2.5) { if (tine(lat)) { gasit = lat; break; } }
  if (!gasit) return { fel: 'niciunul', latimeMM: 0 };
  // rafinare în jos: cea mai mică lățime din pasul panoului care încă ține
  for (let lat = gasit - PAS_CONTUR; lat >= start - 1e-9; lat -= PAS_CONTUR) {
    if (!tine(lat)) break;
    gasit = lat;
  }
  return { fel, latimeMM: +gasit.toFixed(1) };
}

// =====================================================================
// AGĂȚAREA PE PERETE
//
// Aceeași construcție ca la Cutii Litere, Litere Fagure și Litere LED, din același modul de
// nucleu: CANAL ÎN T săpat în spatele piesei — fanta tijei lângă perete, camera capului mai
// adânc. Un locaș dintr-un singur contur ar avea lățimea tijei la orice adâncime, iar capul
// n-ar avea pe unde gliza.
//
// CE E ALTFEL LA UN NUME, față de o literă singură:
//
// 1. PIESA E LATĂ. O literă e mai înaltă decât lată și atârnă ca un pendul scurt, deci un
//    singur șurub ajunge. Un nume de 200-500 mm agățat într-un punct se răsucește la fiecare
//    atingere. Deci se cer DOUĂ puncte, cât mai depărtate, iar distanța dintre ele se raportează
//    ca s-o poată însemna pe perete.
// 2. NU E NEVOIE DE PLASTURE. La cutie fundul are 2 mm și la LED spatele are 2 mm, deci locașul
//    ar străpunge în cavitate și trebuie armat pe interior. Aici piesa e PLINĂ: 35 mm de nume
//    sau 6 mm de placă. Singura întrebare e dacă materialul din spate e destul, iar când nu e,
//    răspunsul e o cifră — vezi `grosimeaCareTinesurubul`.
// =====================================================================

export interface DiagnosticAgatare {
  tip: TipAgatare;
  /** unul sau două puncte, în coordonatele modelului */
  pozitii: Pt[];
  /** adâncimea locașului, CALCULATĂ din standoff + capul șurubului */
  adancime: number;
  standoff: number;
  /** cu câte grade atârnă strâmb (0 la două puncte — dreapta care le unește e orizontală) */
  inclinare: number;
  /** distanța dintre cele două șuruburi, mm; 0 la un singur punct */
  distantaMM: number;
  /** materialul disponibil în spate acolo unde se sapă (mm) */
  materialMM: number;
  /** grosimea de la care ar încăpea locașul; 0 = încape deja sau nu s-a putut găsi */
  grosimeNecesaraMM: number;
  /** grosimea capacului, la „gaura"; 0 = fără capac */
  grosimeCapacMM: number;
}

/**
 * COTA FEȚEI, măsurată pe solid într-un punct.
 *
 * O sondă verticală subțire, intersectată cu corpurile: cel mai de sus punct al materialului din
 * axul găurii. Deduse din parametri, cotele ar fi greșite tocmai în cazul interesant — cu placă
 * în spate, fața e la grosimea plăcii deasupra benzii de contur și cu tot numele mai sus deasupra
 * unei litere.
 */
function fataLa(Manifold: any, corpuri: (any | null)[], p: Pt, raza: number): number {
  const proba = Manifold.cylinder(4000, raza, raza, 16, false).translate([p[0], p[1], -2000]);
  let z = 0;
  for (const c of corpuri) {
    if (!c) continue;
    const i = c.intersect(proba);
    if (i.volume() > 1e-9) z = Math.max(z, i.boundingBox().max[2]);
    i.delete();
  }
  proba.delete();
  return z;
}

/** cele două contururi ale locașului: nivelul tijei (lângă perete) și nivelul capului (mai adânc) */
function formeAgatare(cfg: ParamCuvant): { tija: Ring[]; cap: Ring[] } | null {
  const rCap = (cfg.surubCap + JOC_CAPAC) / 2;
  const rTija = (cfg.surubTija + JOC_CAPAC) / 2;
  if (cfg.tipAgatare === 'cheie') {
    return { tija: conturCheie(rCap, rTija, cfg.surubCap), cap: conturCheie(rCap, rCap, cfg.surubCap) };
  }
  if (cfg.tipAgatare === 'grila') {
    const l = cfg.latimeGrila, h = CANAL_GRILA;
    return {
      tija: conturGrila(l, h, 2, 6),
      // capul se sprijină pe muchia cu șei, deci jumătatea lui de sus ajunge DEASUPRA canalului
      cap: [[[-l / 2, -h - rCap], [l / 2, -h - rCap], [l / 2, 0], [-l / 2, 0]]],
    };
  }
  // la gaură, forma care decide AȘEZAREA e locașul CAPULUI, nu gaura tijei: pe tijă ar fi încăput
  // și acolo unde capul nu are loc, iar locașul ar fi ieșit prin marginea piesei
  if (cfg.tipAgatare === 'gaura') return { tija: conturCerc(rTija), cap: conturCerc(rCap) };
  return null;
}

/**
 * CÂT MATERIAL E ÎN SPATE, acolo unde se sapă.
 *
 * Cu placă în spate, locașul se sapă în ea și are la dispoziție DOAR grosimea plăcii: în banda
 * de contur din jurul literelor nu e nimic altceva. Fără placă (sau cu ramă, care are aceeași
 * grosime cu numele), în spate e piesa întreagă.
 */
const materialInSpate = (cfg: ParamCuvant) => (cfg.contur === 'placa' ? cfg.grosimeContur : cfg.grosime);

/**
 * ADÂNCIMEA LOCAȘULUI NU E PARAMETRU, la niciunul din sisteme, și din același motiv: în el intră
 * lucruri de dimensiuni cunoscute, iar o valoare liberă permite exact configurația care nu merge.
 *   gaura        capul șurubului + capacul de peste el (altfel capacul rămâne afară)
 *   cheie/grila  standoff tijă + capul șurubului      (altfel capul n-are pe unde gliza)
 */
function adancimeaLocasului(cfg: ParamCuvant): number {
  if (cfg.tipAgatare === 'gaura') return cfg.inaltimeCapSurub + grosimeaCapacului(cfg) + 0.2;
  return Math.min(STANDOFF_TIJA + cfg.inaltimeCapSurub + JOC_CAPAC,
    materialInSpate(cfg) - MATERIAL_PESTE_LOCAS);
}
/** grosimea capacului, 0 când nu se cere unul */
const grosimeaCapacului = (cfg: ParamCuvant) =>
  (cfg.tipAgatare === 'gaura' && cfg.capac ? cfg.grosimeCapac : 0);

/**
 * ÎNCAPE CAPUL ȘURUBULUI în cameră?
 *
 * Condiția nu e „s-a putut săpa ceva", ci „camera e mai adâncă decât capul". Prima variantă
 * cerea doar un milimetru peste standoff, iar la o placă de 6 mm ieșea un locaș de 4 mm: tija
 * ocupă 2, deci camerei îi rămâneau 2 pentru un cap de 3. Locașul se săpa, verificările de
 * „e gol" și „a rămas material peste" treceau, și tot nu se putea agăța nimic în el — exact
 * felul de defect care s-a mai văzut de două ori în proiect, pe piesa randată, nu în cifre.
 */
function incapeLocasul(cfg: ParamCuvant): boolean {
  // la gaură, sub locaș trebuie să rămână cel puțin 1 mm de material prin care trece tija
  if (cfg.tipAgatare === 'gaura') return materialInSpate(cfg) >= adancimeaLocasului(cfg) + 1;
  return adancimeaLocasului(cfg) >= STANDOFF_TIJA + cfg.inaltimeCapSurub - 1e-9;
}

/**
 * DE LA CE GROSIME ÎNCAPE LOCAȘUL — remediul, dedus din chiar formula de mai sus.
 *
 * Aici nu e nevoie de reconstrucție ca la stabilitate sau la placă: adâncimea nu depinde de
 * forma literei, doar de cotele șurubului. Cifra e exactă, nu estimată — și se ROTUNJEȘTE la
 * pasul panoului, ca să fie una tastabilă.
 */
export function grosimeMinimaLocas(inaltimeCapSurub: number): number {
  return STANDOFF_TIJA + inaltimeCapSurub + JOC_CAPAC + MATERIAL_PESTE_LOCAS;
}
function grosimeaCareTineSurubul(cfg: ParamCuvant): number {
  const pas = cfg.contur === 'placa' ? PAS_CONTUR : 1;
  const necesar = cfg.tipAgatare === 'gaura'
    ? adancimeaLocasului(cfg) + 1
    : grosimeMinimaLocas(cfg.inaltimeCapSurub);
  return +(Math.ceil(necesar / pas) * pas).toFixed(1);
}

/** verdictul unei surse pentru textul curent: iese cuvântul o piesă, și cu ce preț? */
export interface VerdictLegare {
  /** se poate livra: literele se ating pe alocuri ȘI punțile ajung la tot ce a rămas */
  ok: boolean;
  bucati: number;
  litere: number;
  /** bucăți pe care nici punțile nu le prind — motivul cel mai serios de respingere */
  ramase: number;
  /** cea mai lungă punte necesară, mm: peste fracțiunea din înălțime, legătura se vede */
  puntaMaxMM: number;
}

/**
 * MĂSURAT, nu dedus din categoria din manifest.
 *
 * Categoria „Cursiv" nu e criteriul: Tangerine, Courgette și Kaushan Script sunt cursive și
 * totuși scriu literele despărțit — măsurat, „Alexandra" iese în 9 bucăți la fiecare din ele,
 * adică fix una pe literă. Iar întrebarea care contează la un nume care stă singur în picioare e
 * chiar asta: se ating literele între ele?
 *
 * Se măsoară la grosime de 1 mm: numărul de componente conexe nu depinde de extrudare, iar
 * evaluarea trebuie să fie ieftină — rulează pentru toate fonturile, în fundal.
 */
export function verdictLegare(solid: SursaSolid, litere: number, inaltime: number,
                              factorMaxPunte = 1): VerdictLegare {
  const s = solid(inaltime, 1);
  const parti: any[] = s.decompose();
  const contur: Ring[] = [];
  const arii: number[] = [];
  for (const p of parti) {
    const c = p.project();
    contur.push(conturExterior(c)); arii.push(c.area());
    c.delete(); p.delete();
  }
  s.delete();
  // punțile se PLANIFICĂ, nu se construiesc: verdictul are nevoie de numere, nu de solide
  const ancora = arii.indexOf(Math.max(...arii));
  const ancore = arii.map((_, i) => i === ancora);
  const trepte = trepteePunte(factorMaxPunte);
  let r = planificaPunti(contur, ancore, limitePunte(arii, inaltime, trepte[0]));
  for (const f of trepte.slice(1)) {
    if (r.ramase === 0) break;
    r = planificaPunti(contur, ancore, limitePunte(arii, inaltime, f));
  }
  return {
    ok: (litere <= 1 || parti.length < litere) && r.ramase === 0,
    bucati: parti.length,
    litere,
    ramase: r.ramase,
    puntaMaxMM: r.lungimeMaxMM,
  };
}

/** ce iese din construcție: numele, conturul (dacă e cerut) și măsurătorile de pe drum */
interface Corpuri {
  corp: any;
  contur: any | null;
  /** capacele care ascund capul șurubului, ca PIESE SEPARATE; null când nu se cer */
  capac: any | null;
  bucatiInainte: number;
  ariiBucati: number[];
  punti: RaportPunti;
  legatDeContur: boolean;
  /** contra-forme (ochiul lui „a") pe care netezirea conturului le-a astupat */
  contraFormeInchise: number;
  ariaConturMM2: number;
  /** bucățile PIESEI (nume + contur), numărate fără să se unească solidele — vezi `bucatiPiesa` */
  bucati: number;
  agatare: DiagnosticAgatare;
}

/** câte contra-forme (inele cu arie negativă) are o secțiune — ochiul lui „a", bucla lui „e" */
function contraForme(cs: any): number {
  return (cs.toPolygons() as Ring[]).filter((r) => arieRing(r) < 0).length;
}
/** componentele conexe ale unei secțiuni = inelele ei EXTERIOARE (arie pozitivă) */
function componente2D(cs: any): number {
  return (cs.toPolygons() as Ring[]).filter((r) => arieRing(r) > 0).length;
}

/**
 * AURA unei siluete: dilatare cu R, apoi ÎNCHIDERE morfologică (offset(+S).offset(−S)).
 *
 * Tehnica e din brelocuri și e folosită peste tot unde o formă are nevoie de un contur colorat.
 * Netezirea nu e cosmetică — o dilatare simplă păstrează fiecare colț interior dintre litere, iar
 * la un cuvânt cursiv acolo se adună crestături adânci exact în banda cea mai îngustă.
 */

/**
 * FORMA CONTURULUI unei piese: aura, plus talpa dreaptă când piesa stă pe masă.
 *
 * Netezirea nu e cosmetică — o dilatare simplă păstrează fiecare colț interior dintre litere, iar
 * la un cuvânt cursiv acolo se adună crestături adânci exact în banda cea mai îngustă.
 *
 * TALPĂ DREAPTĂ, tăiată chiar la linia de bază — DOAR pe masă. Fără tăietură, conturul iese cu R
 * sub tălpi și ridică literele de pe masă; piesa se sprijină atunci pe muchia de jos a unei plăci
 * de 6 mm, cu tot cuvântul de 35 mm în față. Măsurat: centrul de masă cade cu 12 mm în AFARA
 * sprijinului. Pe perete tăietura n-are ce căuta: piesa atârnă, nu stă.
 */
export function auraContur(sil: any, latime: number, netezire: number): any {
  const dilatat = latime > 0 ? sil.offset(latime, 'Round') : sil.offset(0, 'Round');
  if (netezire <= 0) return dilatat;
  const umflat = dilatat.offset(netezire, 'Round');
  const neted = umflat.offset(-netezire, 'Round');
  umflat.delete(); dilatat.delete();
  return neted;
}

function formaContur(cfg: ParamCuvant, sil: any): any {
  const { CrossSection } = MOD;
  const dilatat = auraContur(sil, cfg.latimeContur, cfg.netezireContur);
  const forma = dilatat;
  if (cfg.modProdus === 'masa') {
    const podea = CrossSection.square([4000, 2000], false).translate([-2000, -2000]);
    const taiat = forma.intersect(podea);
    podea.delete();
    forma.delete();
    return taiat;
  }
  return forma;
}

/**
 * NUMELE + CONTURUL, ca două corpuri așezate: centrate pe X, cu TALPA ANSAMBLULUI la y = 0.
 *
 * Conturul e tehnica din brelocuri, neschimbată fiindcă e deja validată acolo: silueta dilatată
 * cu R, apoi ÎNCHISĂ morfologic (offset(+S).offset(-S)). Netezirea nu e cosmetică — o dilatare
 * simplă păstrează fiecare colț interior dintre litere, iar la un nume cursiv acolo se adună
 * crestături adânci exact în banda cea mai îngustă a plăcii.
 *
 * Conturul se ia din silueta numelui DUPĂ punți, nu înainte: altfel placa ar ocoli o punte și ar
 * lăsa-o să iasă din contur.
 */
function construieste(cfg: ParamCuvant, rep?: Partial<SolidReport>): Corpuri {
  const { Manifold, CrossSection } = MOD;
  const brut = solidAsezat(cfg, rep);

  // BUCĂȚILE, cu aria fiecăreia: numărul singur nu spune dacă bucata în plus e punctul de pe „i"
  // (câteva zeci de mm²) sau o literă întreagă desprinsă (mii). Diferența schimbă răspunsul.
  const parti: any[] = brut.decompose();
  const ariiPerParte = parti.map((p: any) => {
    const s = p.project(); const a = s.area(); s.delete(); return +a.toFixed(1);
  });
  const arii = [...ariiPerParte].sort((a: number, b: number) => b - a);

  // PUNȚILE. Ancoră e bucata cea mai MARE — la un nume nu există „literă de dedesubt" de care să
  // se agațe restul, cum e la scrisul în relief; corpul cuvântului e chiar el ancora.
  let corp = brut;
  let raport: RaportPunti = { componente: parti.length, punti: [], ramase: parti.length - 1, lungimeMaxMM: 0 };

  // CONTURUL LEAGĂ ÎNAINTE SĂ LEGE PUNȚILE.
  //
  // O bandă de 5 mm dilatată și închisă cu 4 astupă golurile de până la ~18 mm — mai mult decât
  // ține o punte obișnuită. Când chiar le astupă pe toate, punțile n-au ce căuta acolo: bara e
  // în culoarea CUVÂNTULUI, deci ar traversa banda închisă la culoare ca un fir auriu, vizibil
  // pe fața piesei. S-a văzut la Cuvinte Decor, pe „ma♥ma": două fire de la inimă la litere.
  //
  // Deci se calculează întâi conturul pe silueta NELEGATĂ și se numără componentele lui. Dacă e
  // una singură, piesa e deja întreagă și nu se pune nicio punte.
  let formaProba: any = null;
  if (parti.length > 1 && cfg.contur !== 'fara') {
    const sil0 = brut.project();
    formaProba = formaContur(cfg, sil0);
    sil0.delete();
    if (componente2D(formaProba) === 1) raport = { componente: parti.length, punti: [], ramase: 0, lungimeMaxMM: 0 };
    else { formaProba.delete(); formaProba = null; }
  }
  const conturLeaga = !!formaProba;
  if (parti.length > 1 && cfg.punti && !conturLeaga) {
    const ceaMare = ariiPerParte.indexOf(Math.max(...ariiPerParte));
    const ancore = parti.map((_: any, i: number) => i === ceaMare);
    const leaga = (factor: number) => leagaComponente(Manifold, parti, ancore, {
      latime: cfg.latimePunte, grosime: cfg.grosime, z: 0,
      distantaMax: limitePunte(ariiPerParte, cfg.inaltime, factor),
    });
    const trepte = trepteePunte(cfg.factorMaxPunte);
    let r = leaga(trepte[0]);
    for (const f of trepte.slice(1)) {
      if (r.raport.ramase === 0) break;
      // incercarea nereusita se ARUNCA: barele ei sunt handle-uri WASM, iar altfel s-ar
      // acumula cate un set la fiecare font care are nevoie de reincercare
      for (const b of r.bare) b.delete();
      r = leaga(f);
    }
    raport = r.raport;
    if (r.bare.length) {
      // NICIO PUNTE SUB TALPĂ. Bara e o prismă lată `latimePunte`, centrată pe linia dintre cele
      // mai apropiate două puncte; când punctele alea sunt chiar pe linia de bază — cazul obișnuit
      // la fonturile drepte — jumătate din lățimea ei iese sub talpă. Măsurat: 0.055 mm la Anton,
      // 0.6 la Bebas Neue. Numele s-ar sprijini atunci pe o nervură de 1.2 mm în loc de tălpile
      // literelor, adică s-ar legăna. Bara se ridică până se face la nivel cu talpa; acolo devine
      // pânză de sprijin, nu picior.
      const bare = r.bare.map((b: any) => {
        const bb = b.boundingBox();
        return bb.max[1] > 0 ? b.translate([0, -bb.max[1], 0]) : b;
      });
      corp = Manifold.union([brut, ...bare]);
      brut.delete();
      for (const b of r.bare) b.delete();
      for (const b of bare) if (!r.bare.includes(b)) b.delete();
    }
  }
  for (const p of parti) p.delete();

  // ---------------- CONTURUL COLORAT ----------------
  let contur: any = null;
  let contraFormeInchise = 0;
  let ariaConturMM2 = 0;
  let bucatiPiesa = 0;
  {
    const p: any[] = corp.decompose();
    bucatiPiesa = p.length;
    for (const x of p) x.delete();
  }
  if (cfg.contur !== 'fara') {
    const sil = corp.project();
    const forma = formaProba ?? formaContur(cfg, sil);
    formaProba = null;
    ariaConturMM2 = +forma.area().toFixed(1);
    contraFormeInchise = Math.max(0, contraForme(sil) - contraForme(forma));
    // BUCĂȚILE PIESEI, numărate în 2D. Fiecare bucată a numelui e cuprinsă în dilatarea ei, deci
    // stă pe contur; iar conturul are exact atâtea componente câte inele exterioare are secțiunea
    // lui. Unirea celor două solide doar ca să le numărăm ar costa 185 ms din 300 pe „Mădălina" —
    // măsurat. Testul face totuși unirea și cere același număr, ca scurtătura să nu poată minți.
    bucatiPiesa = componente2D(forma);
    if (cfg.contur === 'placa') {
      // placa STĂ ÎN SPATE: numele urcă pe Z cu grosimea ei, deci se printează pe placă
      contur = Manifold.extrude(forma, cfg.grosimeContur);
      const mutat = corp.translate([0, 0, cfg.grosimeContur]);
      corp.delete();
      corp = mutat;
    } else {
      // RAMĂ: bandă în ACELAȘI plan cu numele, aceeași grosime — o piesă, două culori.
      //
      // Banda intră 0.1 mm ÎN literă, nu se oprește exact pe conturul ei. Tăiată la fix, cele
      // două corpuri s-ar atinge pe o suprafață perfect coincidentă — cazul fragil de care s-a
      // lovit proiectul de fiecare dată — iar reuniunea lor ieșea în bucăți: „matei" în 2,
      // „Mădălina" în 5. Bucățile în plus erau contra-formele astupate de netezire (ochiul lui
      // „a", al lui „e"), insule de bandă care ating litera doar pe un perete vertical.
      // Cu suprapunere reală, piesa e una singură, iar cei 0.1 mm nu se văd nici pe ecran, nici
      // la print.
      const interior = sil.offset(-SUPRAPUNERE_RAMA, 'Round');
      const inel = forma.subtract(interior);
      interior.delete();
      contur = Manifold.extrude(inel, cfg.grosime);
      inel.delete();
    }
    forma.delete();
    sil.delete();
    // REAȘEZARE: conturul iese cu R sub talpa literelor, deci ansamblul stă pe el, ca pe un soclu.
    // Talpa e a ansamblului, nu a numelui — altfel piesa ar plana deasupra mesei în viewport.
    const bbC = contur.boundingBox();
    const dx = -(bbC.min[0] + bbC.max[0]) / 2, dy = -bbC.max[1];
    const c2 = corp.translate([dx, dy, 0]); corp.delete(); corp = c2;
    const k2 = contur.translate([dx, dy, 0]); contur.delete(); contur = k2;
  }

  // ---------------- AGĂȚAREA PE PERETE ----------------
  //
  // Locașul se sapă în SPATELE piesei (z = 0) și se scade din AMBELE corpuri: cu placă în spate
  // el cade în placă, cu ramă poate cădea și pe literă, și pe bandă. Scăderea din corpul în care
  // nu intră nu schimbă nimic — dar nu trebuie ghicit în care intră.
  let capac: any = null;
  let agatare: DiagnosticAgatare = { tip: cfg.tipAgatare, pozitii: [], adancime: 0, standoff: STANDOFF_TIJA,
    inclinare: 0, distantaMM: 0, materialMM: 0, grosimeNecesaraMM: 0, grosimeCapacMM: 0 };
  if (cfg.modProdus === 'perete' && cfg.tipAgatare !== 'fara') {
    // SILUETA SPATELUI = tot ce atinge peretele, nu doar corpul din spate. La ramă banda are
    // 5 mm lățime, iar locașul de cheie cere peste 8: căutat doar în ea, sistemul n-ar încăpea
    // niciodată, deși literele de lângă au aceeași grosime și sunt la fel de bune. La placă
    // uniunea e chiar conturul ei, fiindcă el cuprinde literele.
    const silNume = corp.project();
    let silSpate = silNume;
    if (contur) {
      const silContur = contur.project();
      silSpate = silNume.add(silContur);
      silContur.delete(); silNume.delete();
    }
    const cm = centroid(silSpate);
    const adancime = adancimeaLocasului(cfg);
    const forme = formeAgatare(cfg);
    // DOUĂ PUNCTE cerute explicit: piesa e lată, iar un singur șurub o lasă să se răsucească
    const incape = incapeLocasul(cfg);
    const pozitii = forme && incape
      ? pozitieAgatare(CrossSection, silSpate, forme.cap, cm[0], cm[1], true) : [];
    agatare = {
      tip: cfg.tipAgatare, pozitii, adancime: +adancime.toFixed(2), standoff: STANDOFF_TIJA,
      inclinare: inclinareAgatare(pozitii, cm),
      distantaMM: pozitii.length > 1 ? +(pozitii[1][0] - pozitii[0][0]).toFixed(1) : 0,
      materialMM: +materialInSpate(cfg).toFixed(1),
      grosimeNecesaraMM: incape ? 0 : grosimeaCareTineSurubul(cfg),
      grosimeCapacMM: +grosimeaCapacului(cfg).toFixed(1),
    };
    if (forme && pozitii.length) {
      const rCap = (cfg.surubCap + JOC_CAPAC) / 2, rTija = (cfg.surubTija + JOC_CAPAC) / 2;
      const cTija = new CrossSection(forme.tija, 'Positive');
      const cCap = new CrossSection(forme.cap, 'Positive');
      let tTija: any = null, tCap: any = null;
      for (const pz of pozitii) {
        const a = cTija.translate(pz), b = cCap.translate(pz);
        if (tTija) { const u = tTija.add(a); tTija.delete(); a.delete(); tTija = u; } else tTija = a;
        if (tCap) { const u = tCap.add(b); tCap.delete(); b.delete(); tCap = u; } else tCap = b;
      }
      cTija.delete(); cCap.delete();
      let cutter: any;
      if (cfg.tipAgatare === 'gaura') {
        // GAURA STRĂPUNSĂ: prin piesă trece doar TIJA; capul se îngroapă într-un locaș săpat
        // din FAȚĂ, iar peste el intră capacul. Fața nu e la aceeași cotă peste tot — cu placă
        // în spate, deasupra benzii de contur e la 7.5 mm, iar deasupra unei litere la 42.5 —
        // deci se MĂSOARĂ pe solid, cu o sondă verticală, nu se deduce din parametri.
        const fete = pozitii.map((pz) => fataLa(Manifold, [corp, contur], pz, rTija));
        const total = Math.max(...fete) + 1;
        const c1 = Manifold.extrude(tTija, total + 0.4).translate([0, 0, -0.2]);
        let cLocas: any = null;
        for (let i = 0; i < pozitii.length; i++) {
          const disc = Manifold.cylinder(adancime + 0.2, rCap, rCap, laturiCerc(rCap), false)
            .translate([pozitii[i][0], pozitii[i][1], fete[i] - adancime]);
          if (cLocas) { const u = cLocas.add(disc); cLocas.delete(); disc.delete(); cLocas = u; } else cLocas = disc;
        }
        cutter = cLocas ? c1.add(cLocas) : c1;
        if (cLocas) { c1.delete(); cLocas.delete(); }
        // CAPACUL: piesă separată, care intră cu presiune în locaș și ascunde capul șurubului.
        // Stă în PARTEA DE SUS a locașului — dedesubtul lui rămâne loc pentru cap — iar fața lui
        // se oprește cu 0.2 mm sub fața piesei, ca să nu iasă în relief dacă intră strâmb.
        const gCapac = grosimeaCapacului(cfg);
        if (gCapac >= 0.6) {
          const rc = rCap - JOC_CAPAC / 2;
          for (let i = 0; i < pozitii.length; i++) {
            const disc = Manifold.cylinder(gCapac, rc, rc, laturiCerc(rc), false)
              .translate([pozitii[i][0], pozitii[i][1], fete[i] - 0.2 - gCapac]);
            if (capac) { const u = capac.add(disc); capac.delete(); disc.delete(); capac = u; } else capac = disc;
          }
        }
      } else {
        // canalul în T: fanta tijei deschisă la spate, camera capului îngropată. Se suprapun cu o
        // sutime — lipite exact, ar avea fețe coplanare și ar lăsa cochilii degenerate.
        const c1 = Manifold.extrude(tTija, STANDOFF_TIJA + 0.21).translate([0, 0, -0.2]);
        const c2 = Manifold.extrude(tCap, Math.max(0.01, adancime - STANDOFF_TIJA)).translate([0, 0, STANDOFF_TIJA]);
        cutter = c1.add(c2);
        c1.delete(); c2.delete();
      }
      tTija.delete(); tCap.delete();
      const c3 = corp.subtract(cutter); corp.delete(); corp = c3;
      if (contur) { const k3 = contur.subtract(cutter); contur.delete(); contur = k3; }
      cutter.delete();
    }
    silSpate.delete();
  }

  return { corp, contur, capac, bucatiInainte: parti.length, ariiBucati: arii, punti: raport,
    legatDeContur: conturLeaga, contraFormeInchise, ariaConturMM2, bucati: bucatiPiesa, agatare };
}

/** cutia PIESEI, din cele două corpuri — fără să le unească (unirea e scumpă, vezi `bucatiPiesa`) */
function cutiaPiesei(corpuri: any[]): { min: number[]; max: number[] } {
  let min: number[] | null = null, max: number[] | null = null;
  for (const c of corpuri) {
    if (!c) continue;
    const b = c.boundingBox();
    min = min ? min.map((v, i) => Math.min(v, b.min[i])) : b.min.slice();
    max = max ? max.map((v, i) => Math.max(v, b.max[i])) : b.max.slice();
  }
  return { min: min ?? [0, 0, 0], max: max ?? [0, 0, 0] };
}

export function construiestePiesa(cfg: ParamCuvant): RezultatCuvant {
  if (!MOD) throw new Error(t('geometry.manifoldNeconfigurat', { functie: 'construiestePiesa' }));
  const t0 = performance.now();

  const rep: Partial<SolidReport> = {};
  const c = construieste(cfg, rep);

  const bb = cutiaPiesei([c.corp, c.contur]);
  const latime = bb.max[0] - bb.min[0], adancime = bb.max[1] - bb.min[1];
  const incape = incapePe(latime, adancime, cfg.placa);
  const placa: PotrivirePlaca = {
    incape,
    latimeMM: +latime.toFixed(1),
    adancimeMM: +adancime.toFixed(1),
    inaltimeMaxMM: incape ? cfg.inaltime : inaltimeaCareIncape(cfg, latime, adancime),
  };

  // volumele se ADUNĂ: cele două corpuri se ating pe un plan, dar nu se întrepătrund
  // STABILITATEA se măsoară doar pe MASĂ. O piesă de perete nu stă, atârnă — a raporta „cade"
  // despre ea ar fi un avertisment despre o situație care nu se întâmplă, iar blocarea exportului
  // ar opri fix produsul cerut.
  const stabilitate: Stabilitate = cfg.modProdus === 'masa'
    ? (() => { const st = masoaraStabilitate([c.corp, c.contur]);
      return { ...st, remediu: st.staSingura ? { fel: 'niciunul' as const, latimeMM: 0 } : remediuStabilitate(cfg) }; })()
    : { ariaMM2: 0, unghiMinGrade: 0, marjaMM: 0, inaltimeCentruMM: 0, staSingura: true,
      remediu: { fel: 'niciunul', latimeMM: 0 } };

  const volum = c.corp.volume() + (c.contur ? c.contur.volume() : 0) + (c.capac ? c.capac.volume() : 0);
  const triunghiuri = c.corp.numTri() + (c.contur ? c.contur.numTri() : 0) + (c.capac ? c.capac.numTri() : 0);

  return {
    corp: c.corp,
    contur: c.contur,
    capac: c.capac,
    diagnostice: {
      dim: [+latime.toFixed(1), +adancime.toFixed(1), +(bb.max[2] - bb.min[2]).toFixed(1)],
      bucati: c.bucati,
      bucatiInainte: c.bucatiInainte,
      ariiBucatiMM2: c.ariiBucati,
      punti: c.punti,
      legatDeContur: c.legatDeContur,
      contraFormeInchise: c.contraFormeInchise,
      ariaConturMM2: c.ariaConturMM2,
      stabilitate,
      agatare: c.agatare,
      glifeLipsa: rep.missingGlyphs ?? [],
      materialCM3: +(volum / 1000).toFixed(1),
      triunghiuri,
      placa,
    },
    ms: performance.now() - t0,
  };
}
