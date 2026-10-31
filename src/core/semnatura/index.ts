/**
 * NUCLEU — MARCAJUL PIESEI (valul SEM.1, partea A din docs/design/semnatura-huse-iphone.md).
 *
 * O singură funcție publică, `aplicaMarcaj`, chemată din INTERIORUL funcției care construiește
 * geometria fiecărui generator nou. Întoarce un SINGUR Manifold. Nu întoarce niciodată marcajul
 * ca obiect separat.
 *
 * CELE PATRU STRATURI (A.2), și de ce fiecare e aici și nu în altă parte:
 *
 *   1. UN SINGUR CORP. Marcajul se SCADE boolean din corp. În 3MF iese un obiect, fără
 *      componente, fără ierarhie. În slicer nu există nimic de „șters" — ca să-l scoți, trebuie
 *      să ADAUGI material, ceea ce e altă treabă decât un click pe Delete.
 *
 *   2. INTEGRARE ÎN TEXTURĂ. În modul gratuit, zona din jurul semnăturii e obligatoriu texturată,
 *      iar semnătura e o insulă netedă gravată în mijlocul texturii. Un petec adăugat în slicer
 *      peste ea apare ca o pată lucioasă în mijlocul unei suprafețe cu relief. Textura NU e o
 *      pedeapsă: e zona de grip a piesei, parte din design, și rămâne și în modul comercial.
 *
 *   3. SUPRAFAȚĂ CURBATĂ. Zona de aplicare vine de la generator ca un cadru local pe racordul
 *      curbat, nu pe un plan. Un cub plan nu se potrivește peste ea.
 *
 *   4. POARTA DE LICENȚĂ NU E UN `if` IZOLAT. `modDinContext` derivă modul din payload-ul
 *      VERIFICAT, în același modul cu geometria, iar `aplicaMarcaj` îl cheamă singură — cine
 *      cheamă nu poate transmite „fără semnătură" ca parametru, fiindcă nu există parametrul.
 *      Se acceptă că un dezvoltator hotărât trece de asta; nu el e clientul.
 *
 * CE NU FACE: nu atinge niciunul dintre cele 12 generatoare existente. Ele n-o cheamă, iar
 * `regresie-export.test.ts` o dovedește la fiecare rulare.
 */
import { areDreptComercial, type StareLicenta } from '../config/licenta-token.js';
import type { Ring } from '../geometry/forme2d.js';

import { configureManifold as configPlan, trasaturaMinima, puntiPeGoluri, inCutie }
  from '../primitive/plan.js';

let MOD: any = null;
export function configureManifold(mod: any): void { MOD = mod; configPlan(mod); }

/** înălțimea nominală a wordmark-ului „praktik3d.ro" (mm) — DECIZIA 6 */
/**
 * CELE DOUA MARIMI ALE SEMNATURII (corectura HUS.2).
 *
 * La 9 x 2,5 mm wordmark-ul se pierdea in textura si trasaturile lui cadeau sub pragul de print:
 * in slicer aparea ca un sir de pete, iar conturul interior al literelor lasa pinteni izolati.
 *
 * „Vizibila" e implicita si e cea corecta pentru un produs care poarta o marca: se citeste de la
 * distanta de la care tii telefonul. „Discreta" ramane pentru cine o vrea mica — dar tot lizibila
 * de aproape, nu o pata.
 *
 * PREZENTA nu e selectabila. Scoaterea semnaturii cere licenta comerciala; „vizibila/discreta"
 * schimba doar marimea.
 */
export type MarimeMarcaj = 'vizibila' | 'discreta';
export const MARIMI: Record<MarimeMarcaj, { latime: number; inaltime: number; trasaturaMin: number }> = {
  vizibila: { latime: 24, inaltime: 7, trasaturaMin: 1.0 },
  discreta: { latime: 9, inaltime: 2.5, trasaturaMin: 0.8 },
};

/**
 * „VIZIBILA" NU E O CIFRA FIXA — creste cu zona pe care generatorul o pune la dispozitie.
 *
 * DECIZIE (corectura HUS.2): semnatura implicita e adresa COMPLETA, `praktik3d.ro`, fiindca ea
 * e reclama. La 17 mm trasaturile ies de 0,25-0,40 mm, sub pragul de print; singurul lucru care
 * le ingroasa fara sa scurteze adresa e latimea. Deci se ia cat incape, pana la `latime`, dar nu
 * mai mult de trei sferturi din zona — restul ramane textura in jurul semnaturii, care e chiar
 * rostul stratului 2.
 */
export const FRACTIE_ZONA_MARCAJ = 0.75;

/** latimea puntii care tine conturul interior al unei litere (mm) */
export const PUNTE_MARCAJ = 0.6;

export const MARCAJ_LATIME = 9;
export const MARCAJ_INALTIME = 2.5;
/** cât de adânc se gravează (mm) */
/**
 * ADANCIMEA GRAVURII (mm). Minimul util e 0,4 — doua straturi la 0,2; sub atat gravura dispare
 * la prima trecere de netezire a slicerului.
 */
export const MARCAJ_ADANCIME = 0.5;

/** zona texturată minimă în jurul marcajului (mm) — A.2, stratul 2 */
export const TEXTURA_LATIME_MIN = 30;
export const TEXTURA_INALTIME_MIN = 15;

/** micro-marcajul din interiorul piesei (A.3) */
export const MICRO_ADANCIME = 0.3;
export const MICRO_INALTIME = 2;

/**
 * Cea mai îngustă trăsătură acceptată într-un logo încărcat (mm) — două linii la duza 0.4.
 * Sub atât, gravura nu se mai citește: straturile se ating și iese o adâncitură murdară.
 */
export const TRASATURA_LOGO_MIN = 0.8;

export type ModMarcaj = 'semnatura' | 'logo-propriu' | 'fara';

/**
 * UNDE se aplică marcajul: un cadru local pe suprafața piesei.
 *
 * Generatorul îl dă, fiindcă doar el știe unde e „racordul de la baza spatelui" la produsul lui.
 * Nucleul nu ghicește o zonă dintr-un bounding box: la o husă ar nimeri pe insula camerei.
 */
export interface RegiuneMarcaj {
  /** punctul de pe suprafață în care se centrează marcajul */
  centru: [number, number, number];
  /** normala suprafeței acolo, spre EXTERIOR (se normalizează singură) */
  normala: [number, number, number];
  /** direcția „la dreapta" a textului în planul suprafeței (se ortogonalizează față de normală) */
  tangenta: [number, number, number];
  /** cât loc e disponibil pe suprafață (mm); sub minimul de textură, textura se strânge */
  latime: number;
  inaltime: number;
}

/** conturul unui logo încărcat, deja normalizat de apelant la cutia de 9 × 2.5 mm */
export interface LogoPropriu {
  contururi: Ring[];
  /** cea mai îngustă trăsătură măsurată (mm); sub TRASATURA_LOGO_MIN se avertizează */
  trasaturaMinMM: number;
}

export interface ContextMarcaj {
  regiune: RegiuneMarcaj;
  /** starea licenței, DEJA VERIFICATĂ — nu un boolean venit de altundeva */
  stare: StareLicenta;
  /** logo-ul propriu, dacă omul a încărcat unul; ignorat fără drept comercial */
  logo?: LogoPropriu | null;
  /**
   * Sursa siluetei wordmark-ului „praktik3d.ro”, ca inele 2D în cutia de 9 × 2.5 mm.
   * Se dă din afară fiindcă nucleul de geometrie nu încarcă fonturi; aplicația o are deja.
   */
  siluetaSemnatura: () => Ring[];
  /** parametrii zonei texturate; `activa: false` se acceptă DOAR cu drept comercial */
  textura?: { activa: boolean; pas?: number; adancime?: number };
  /** data folosită în micro-marcajul exporturilor gratuite; implicit azi */
  azi?: Date;
  /** cât de mare e semnătura; implicit `vizibila` (corectura HUS.2) */
  marime?: MarimeMarcaj;
}

export interface RaportMarcaj {
  mod: ModMarcaj;
  /** textul gravat în micro-marcajul interior (A.3) */
  microText: string;
  /** cât material s-a scos, mm³ — cota pe care o verifică testele A.7 */
  volumScosMM3: number;
  /** zona texturată a fost aplicată */
  texturaAplicata: boolean;
  /** logo-ul are trăsături sub prag; exportul e permis, dar cu avertisment (A.5) */
  logoSubtire: boolean;
  /** mărimea folosită pentru semnătură */
  marime: MarimeMarcaj;
  /** cutia în care a intrat marcajul (mm) */
  cutie: { latime: number; inaltime: number };
  /** cea mai îngustă trăsătură a marcajului, măsurată pe forma finală (mm) */
  trasaturaMinMM: number;
  /** true = sub pragul mărimii alese; avertisment, nu blocaj */
  subtire: boolean;
  /** câte contururi interioare au primit punte */
  puntiAdaugate: number;
}

/**
 * MODUL, derivat din starea licenței. Singurul loc unde se decide.
 *
 * Fără drept comercial nu există cale către `fara` sau `logo-propriu`: funcția n-are din ce
 * construi varianta fără semnătură. Asta e stratul 4 din A.2 — poarta nu e un `if` pe care
 * cineva îl poate scoate dintr-un singur loc, e absența datelor necesare.
 */
export function modDinContext(ctx: ContextMarcaj): ModMarcaj {
  if (!areDreptComercial(ctx.stare)) return 'semnatura';
  if (ctx.logo && ctx.logo.contururi.length) return 'logo-propriu';
  return 'fara';
}

// ---------- algebră de cadru local ----------

type V3 = [number, number, number];
const scade = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const inmulteste = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const produsScalar = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const produsVectorial = (a: V3, b: V3): V3 =>
  [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
function normalizeaza(v: V3): V3 {
  const l = Math.hypot(v[0], v[1], v[2]);
  if (l < 1e-9) throw new Error('vector nul in cadrul de marcaj');
  return [v[0] / l, v[1] / l, v[2] / l];
}

/**
 * Matricea care duce un cutter construit în planul XY (extrudat pe +Z) în cadrul regiunii.
 *
 * X local = tangenta (ortogonalizată față de normală, ca un generator care dă o tangentă
 * aproximativă să nu strâmbe textul), Y local = normala × tangenta, Z local = normala.
 * Manifold cere matricea pe COLOANE, cu ultimul rând ignorat.
 */
function matriceCadru(reg: RegiuneMarcaj): number[] {
  const n = normalizeaza(reg.normala);
  const tBrut = reg.tangenta;
  const t = normalizeaza(scade(tBrut, inmulteste(n, produsScalar(tBrut, n))));
  const b = produsVectorial(n, t);
  const c = reg.centru;
  return [
    t[0], t[1], t[2], 0,
    b[0], b[1], b[2], 0,
    n[0], n[1], n[2], 0,
    c[0], c[1], c[2], 1,
  ];
}

/**
 * Cutter din inele 2D, extrudat pe adâncimea cerută și adus în cadrul regiunii.
 *
 * Depășește suprafața cu 0.2 mm spre exterior: fețe coplanare = boolean fragil, lecție deja
 * plătită la locașul feței din corpul luminos.
 */
function cutterDinInele(inele: Ring[], adancime: number, reg: RegiuneMarcaj): any {
  const { CrossSection } = MOD;
  const cs = new CrossSection(inele, 'Positive');
  const out = cutterDinCrossSection(cs, adancime, reg);
  cs.delete();
  return out;
}

function cutterDinCrossSection(cs: any, adancime: number, reg: RegiuneMarcaj): any {
  const { Manifold } = MOD;
  const solid = Manifold.extrude(cs, adancime + 0.2).translate([0, 0, -adancime]);
  const asezat = solid.transform(matriceCadru(reg));
  solid.delete();
  return asezat;
}

/**
 * ZONA TEXTURATĂ — stratul 2.
 *
 * Linii paralele fine, gravate, cu semnătura lăsată NETEDĂ în mijloc. Nu se folosește motorul de
 * tipare din `tipare.ts`: acela umple o siluetă cu celule pe toată suprafața ei, iar aici trebuie
 * o bandă dreptunghiulară pe o zonă mică, cu o fereastră liberă în ea. Un fagure de 8 mm într-o
 * bandă de 15 mm ar da două celule și jumătate.
 */
function ineleTextura(reg: RegiuneMarcaj, pas: number, fereastra: { w: number; h: number }): Ring[] {
  const w = Math.max(TEXTURA_LATIME_MIN, Math.min(reg.latime, TEXTURA_LATIME_MIN * 1.6));
  const h = Math.max(TEXTURA_INALTIME_MIN, Math.min(reg.inaltime, TEXTURA_INALTIME_MIN * 1.6));
  const grosimeLinie = pas * 0.45;
  const inele: Ring[] = [];
  // fereastra din jurul semnăturii, cu o margine care o lasă să respire
  const fw = fereastra.w / 2 + 1.2, fh = fereastra.h / 2 + 1.2;
  for (let y = -h / 2; y <= h / 2 - grosimeLinie; y += pas) {
    const y2 = y + grosimeLinie;
    // linia sare peste fereastra semnăturii: se taie în două segmente, stânga și dreapta
    const taie = y2 > -fh && y < fh;
    const segmente: [number, number][] = taie
      ? [[-w / 2, -fw], [fw, w / 2]]
      : [[-w / 2, w / 2]];
    for (const [x1, x2] of segmente) {
      if (x2 - x1 < grosimeLinie) continue;
      inele.push([[x1, y], [x2, y], [x2, y2], [x1, y2]] as Ring);
    }
  }
  return inele;
}

/**
 * MICRO-MARCAJUL INTERIOR (A.3) — nu e opțional și nu apare în interfață.
 *
 * Se gravează pe o față interioară, deci nu se vede la utilizare. Cu licență poartă numărul ei;
 * fără, doar `M3D` și data, fără nicio dată personală.
 */
export function microText(st: StareLicenta, azi = new Date()): string {
  /**
   * NUMĂRUL LICENȚEI SE GRAVEAZĂ DOAR LA EXPORT COMERCIAL (A.3, restrâns la HUS.2).
   *
   * Prima redactare zicea „orice export cu licență validă". Un token de SUPORTER e valid — doar
   * fără drept comercial — deci primea și el numărul, iar piesa ieșea diferită de cea gratuită.
   * Asta contrazicea A.7(4), care cere ca un token de suporter să dea exact exportul gratuit.
   *
   * Cele două clauze se împacă restrângând-o pe prima: amprenta nominativă are rost acolo unde
   * există drept de vânzare, adică unde un fișier „curat" ar putea ajunge pe piață. Fără drept
   * comercial se gravează amprenta generică — `M3D` + data — și atunci A.7(4) e adevărat prin
   * construcție, nu prin excepție.
   */
  if (areDreptComercial(st)) {
    if (st.fel === 'valida' && 'licenta' in st) return `M3D ${st.licenta.id}`;
    if (st.fel === 'valida') return `M3D CF${st.serie}`;   // cod fix: identifică lotul, nu omul
  }
  const z = (n: number) => String(n).padStart(2, '0');
  return `M3D ${azi.getFullYear()}-${z(azi.getMonth() + 1)}-${z(azi.getDate())}`;
}

/**
 * APLICĂ MARCAJUL. Întoarce un singur Manifold și raportul măsurat.
 *
 * Ordinea contează: textura întâi, marcajul după. Invers, liniile texturii ar tăia prin
 * semnătură — insula netedă trebuie să rămână netedă.
 */
export function aplicaMarcaj(corp: any, ctx: ContextMarcaj): { corp: any; raport: RaportMarcaj } {
  if (!MOD) throw new Error('manifold neconfigurat: aplicaMarcaj');
  const mod = modDinContext(ctx);
  const marime: MarimeMarcaj = ctx.marime ?? 'vizibila';
  const dorit = MARIMI[marime];
  const latimeCutie = Math.min(dorit.latime, ctx.regiune.latime * FRACTIE_ZONA_MARCAJ);
  const cutie = { latime: latimeCutie, inaltime: dorit.inaltime * (latimeCutie / dorit.latime),
    trasaturaMin: dorit.trasaturaMin };
  const prag = cutie.trasaturaMin;
  const volumInitial = corp.volume();

  // Textura rămâne pornită implicit, în ORICE mod: e design, nu pedeapsă (A.5).
  // Stingerea ei e singura setare care cere drept comercial.
  const vreaFaraTextura = ctx.textura?.activa === false;
  const texturaAplicata = !(vreaFaraTextura && areDreptComercial(ctx.stare));
  const pas = ctx.textura?.pas ?? 1.2;
  const adancTextura = ctx.textura?.adancime ?? 0.35;

  let rezultat = corp;

  if (texturaAplicata) {
    // fereastra din textură se face pe MĂRIMEA ALEASĂ: semnătura stă pe bandă plină, cu textura
    // în jurul ei, nu sub ea (stratul 2, citit corect)
    const inele = ineleTextura(ctx.regiune, pas, { w: cutie.latime, h: cutie.inaltime });
    if (inele.length) {
      const cutter = cutterDinInele(inele, adancTextura, ctx.regiune);
      const nou = rezultat.subtract(cutter);
      cutter.delete();
      if (rezultat !== corp) rezultat.delete();
      rezultat = nou;
    }
  }

  /**
   * MARCAJUL propriu-zis. `fara` sare peste — dar numai `modDinContext` poate întoarce `fara`.
   *
   * Silueta primită se rescalează AICI, în cutia mărimii alese: aplicația o dă normalizată o
   * singură dată, iar nucleul decide cât de mare se gravează. Așa mărimea e o decizie de marcaj,
   * nu una pe care fiecare generator o rezolvă altfel.
   */
  let logoSubtire = false;
  let trasaturaMinMM = 0, punti = 0;
  if (mod !== 'fara') {
    const inele = mod === 'logo-propriu' ? ctx.logo!.contururi : ctx.siluetaSemnatura();
    if (inele.length) {
      const brut = new MOD.CrossSection(inele, 'NonZero');
      const scalat = inCutie(brut, cutie.latime, cutie.inaltime);
      brut.delete();
      /**
       * PUNȚI PE CONTURURILE INTERIOARE, întotdeauna. „praktik3d.ro" are cinci: p, a, d, o și
       * bucla lui 3. Fără ele, fiecare rămâne un pinten izolat pe fundul gravurii — exact
       * punctele albe din pozele de la slicer.
       */
      const cuPunti = puntiPeGoluri(scalat, PUNTE_MARCAJ);
      punti = cuPunti.punti;
      if (cuPunti.cs !== scalat) scalat.delete();
      const final = cuPunti.cs;
      trasaturaMinMM = trasaturaMinima(final);
      /**
       * PRAGUL DIFERĂ DUPĂ CE SE GRAVEAZĂ.
       *
       * Un logo încărcat se judecă la `TRASATURA_LOGO_MIN` — două linii la duza 0,4, cerința A.5.
       * Semnătura are pragul mărimii ei, mai strâns la „vizibilă", fiindcă acolo scopul e să se
       * CITEASCĂ, nu doar să se printeze.
       */
      const pragAici = mod === 'logo-propriu' ? TRASATURA_LOGO_MIN : prag;
      logoSubtire = trasaturaMinMM < pragAici;
      const cutter = cutterDinCrossSection(final, MARCAJ_ADANCIME, ctx.regiune);
      final.delete();
      const nou = rezultat.subtract(cutter);
      cutter.delete();
      if (rezultat !== corp) rezultat.delete();
      rezultat = nou;
    }
  }

  const raport: RaportMarcaj = {
    mod,
    microText: microText(ctx.stare, ctx.azi),
    volumScosMM3: +(volumInitial - rezultat.volume()).toFixed(3),
    texturaAplicata,
    logoSubtire,
    marime, cutie: { latime: cutie.latime, inaltime: cutie.inaltime },
    trasaturaMinMM,
    subtire: mod !== 'fara' && trasaturaMinMM < (mod === 'logo-propriu' ? TRASATURA_LOGO_MIN : prag),
    puntiAdaugate: punti,
  };
  return { corp: rezultat, raport };
}
