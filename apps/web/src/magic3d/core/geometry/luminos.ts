/**
 * NUCLEU — CORPUL LUMINOS: o siluetă oarecare devine o piesă cu bandă LED înăuntru.
 *
 * Produsul are DOUĂ piese: un corp OPAC (pereți + spate, cu banda înăuntru) și o față
 * TRANSLUCIDĂ care îl închide. Lumina difuzează prin față.
 *
 * DE CE STĂ ÎN NUCLEU. A plecat din `apps/led` la AL DOILEA CONSUMATOR — Nume LED, care pune
 * un cuvânt întreg în locul unei litere. Nimic din construcția asta nu știe ce e o literă:
 * primește o siluetă și lucrează pe ea. Aceeași mutare, din același motiv, ca geometria de
 * piesă care a plecat din `apps/nume` în `cuvant.ts` când a apărut Cuvinte Decor.
 *
 * CUSĂTURA e `solid`: cine cheamă spune DIN CE se face silueta — o glifă, un cuvânt, orice —
 * iar restul lanțului nu observă diferența.
 *
 * Corpul e exact o cutie, deci nu se rescrie: vine din `cutie.ts`, același modul care servește
 * Cutii Litere. Aici se adaugă doar ce e specific luminii — pragul pe care stă fața, canalul de
 * cablu și constrângerile optice.
 */
import { t } from '../i18n/index.js';
import { type SolidReport } from './textSolid.js';
import { trasaturiSubtiri, razaInscrisaMaxima, TRASATURA_MIN, PATA_MAX, type DiagnosticTrasaturi } from './trasaturi.js';
import { cavitateCutie, corpCutie, type Camera } from './cutie.js';
import { centroid, arieRing, type Pt, type Ring } from './forme2d.js';
import { pozitieAgatare, inclinareAgatare, conturCheie, conturGrila,
  PERETE_GAURA, JOC_CAPAC, STANDOFF_TIJA, type TipAgatare } from './agatare.js';

export { TRASATURA_MIN, PATA_MAX, STANDOFF_TIJA };
export type { DiagnosticTrasaturi, Camera, TipAgatare };

let MOD: any = null;

/**
 * Primește instanța manifold și o pasează mai departe solidului din font.
 * NU pornește singur modulul: aplicația îl ia din nucleu, testele îl pornesc pe al lor.
 */
export function configureManifold(mod: any): void {
  MOD = mod;
}

/**
 * Peretele opac minim (mm).
 *
 * NU e un prag de printabilitate — la 0.85 mm peretele iese curat. E un prag OPTIC: sub ~1.6 mm
 * PLA-ul lasă lumina să treacă, iar litera „curge" pe lateral în loc să lumineze doar prin față.
 * Exact defectul pe care produsul ăsta trebuie să-l evite.
 */
export const PERETE_OPAC_MIN = 1.6;

/**
 * Sub ce lățime un gol nu se printează ca gol (mm) — două extrudări, ca la orice perete.
 * Fantele mai înguste se umplu la loc: slicer-ul le-ar umple oricum, prost.
 */
export const FANTA_MIN = 0.8;

/**
 * Tipurile de bandă oferite, în LED pe metru. Pasul dintre LED-uri iese direct din ele:
 * 1000/n mm — 33.3 la 30/m, 16.7 la 60/m, 8.3 la 120/m.
 */
export const BENZI = [30, 60, 120] as const;
export type TipBanda = typeof BENZI[number];

/** distanța dintre două LED-uri consecutive (mm) */
export const pasLED = (tip: TipBanda) => 1000 / tip;

/**
 * Grosimea benzii cu tot cu adeziv (mm) — o bandă 5050 pe suport flexibil.
 *
 * Nu e cosmetică: banda stă LIPITĂ PE SPATE, deci LED-urile sunt cu atâta mai aproape de față
 * decât fundul cavității. Fără termenul ăsta, distanța optică ar ieși cu 3 mm mai mare decât e
 * în realitate — adică exact în direcția care ascunde defectul.
 */
export const GROSIME_BANDA = 3;

/**
 * Puterea pe metru, pentru fiecare tip de bandă (W/m), la 12 V.
 * Valori de catalog pentru bandă 2835/5050 obișnuită; servesc la dimensionarea sursei, nu la
 * calcule de precizie.
 */
export const PUTERE_PE_METRU: Record<TipBanda, number> = { 30: 7.2, 60: 14.4, 120: 19.2 };

/** tensiunea de alimentare presupusă (V) */
export const TENSIUNE = 12;

/**
 * Peste ce grosime fața translucidă nu mai aduce uniformitate, doar pierde lumină (mm).
 * Sub 1.2 se vede structura stratului și LED-urile transpar; peste 2.5 difuzia nu se mai
 * îmbunătățește, dar litera se stinge.
 */
export const FATA_MAX_UTIL = 2.5;

/**
 * Cât material trebuie să rămână în jurul canalului de cablu (mm).
 * Sub atât peretele se rupe chiar de acolo — canalul e o crestătură, iar o crestătură e locul
 * din care pleacă fisura.
 */
export const PERETE_CANAL = 1.2;

/** unde iese cablul */
export const POZITII_CANAL = ['spate', 'jos', 'lateral'] as const;
export type PozitieCanal = typeof POZITII_CANAL[number];

/** unde pe literă iese cablul — dintre pozițiile VALIDE, nu dintre toate */
export const LOCURI_CANAL = ['jos', 'mijloc', 'sus'] as const;
export type LocCanal = typeof LOCURI_CANAL[number];

/** cât de mult se poate îngroșa litera și cu ce pas umblă controlul (mm) */
export const INGROSARE_MAX = 10;
export const PAS_INGROSARE = 0.5;

/** jocul cu care banda trebuie să intre în cavitate (mm) */
export const JOC_BANDA = 1;

/**
 * CUSĂTURA — producătorul solidului brut din care iese silueta.
 *
 * Aceeași formă ca `SursaSolid` din `cuvant.ts`, și din același motiv: nucleul nu are voie să
 * știe dacă primește o glifă sau un cuvânt. `apps/led` dă o literă, `apps/nume-led` dă un
 * cuvânt întreg, iar construcția de mai jos nu se schimbă cu nimic.
 */
export type SursaSolid = (inaltime: number, grosime: number, rep?: Partial<SolidReport>) => any;

export interface ParamLuminos {
  /** din ce se face silueta — vezi SursaSolid */
  solid: SursaSolid;
  inaltimeLitera: number;    // mm, măsurat pe capHeight
  /** H — adâncimea interioară a corpului, de la fața interioară a spatelui la gură (mm) */
  adancimeCorp: number;
  /**
   * ÎNGROȘAREA literei, pe fiecare parte (mm). 0 = silueta fontului, neatinsă.
   *
   * La un font subțire — Cormorant, Great Vibes — trăsătura n-are loc pentru doi pereți, două
   * praguri și bandă. Îngroșarea rezolvă exact asta: litera devine mai voluminoasă, iar
   * cavitatea din ea se lărgește cu de două ori valoarea de aici.
   */
  ingrosare: number;
  /** Wp — peretele opac, cel văzut din față (mm) */
  grosimePerete: number;
  /** Gs — grosimea spatelui (mm) */
  grosimeSpate: number;
  /** lățimea benzii LED (mm) — decide dacă încape în cavitate */
  latimeBanda: number;
  /** tipul benzii, în LED pe metru — decide PASUL, deci adâncimea minimă */
  tipBanda: TipBanda;
  /** Lp — cât iese pragul spre interior, adică pe ce lățime se sprijină fața (mm) */
  latimePrag: number;
  /** Ap — pe ce adâncime de la gură e lărgit locașul feței (mm) */
  adancimePrag: number;
  /** Gf — grosimea feței translucide (mm) */
  grosimeFata: number;
  /** Jf — jocul cu care fața intră în locaș, pe fiecare parte (mm) */
  jocFata: number;
  /** diametrul canalului de cablu (mm) */
  diametruCanal: number;
  /** pe unde iese cablul */
  pozitieCanal: PozitieCanal;
  /** unde pe literă: jos, la mijloc sau sus */
  locCanal: LocCanal;
  /** cum se agață litera pe perete */
  tipAgatare: TipAgatare;
  /** Ø capului și Ø tijei șurubului (mm) */
  surubCap: number;
  surubTija: number;
  /** ÎNĂLȚIMEA capului (mm) — din ea se CALCULEAZĂ adâncimea locașului */
  inaltimeCapSurub: number;
  /** lățimea agățătoarei cu dinți (mm) */
  latimeGrila: number;
}

export interface DiagnosticLuminos {
  /** lățime × înălțime, în mm */
  dimLitera: [number, number];
  /** cât s-a îngroșat litera și ce a costat asta */
  ingrosare: DiagnosticIngrosare;
  /** înălțimea totală a corpului = spate + adâncime (mm) */
  inaltimeTotala: number;
  ariaPlinaMM2: number;
  ariaCavitateMM2: number;
  /** camerele cavității; banda intră doar în cele „utile" */
  camere: Camera[];
  camereUtile: number;
  /** retragerea a golit tot interiorul: iese un bloc plin, nu un corp de literă */
  interiorGol: boolean;
  /** fante sub FANTA_MIN, umplute la loc */
  fanteUmplute: number;
  /** CONECTIVITATE — invariantul: NU genus, care crește cu fiecare cameră */
  bucati: number;
  bucatiLitera: number;
  /** material sub pragul printabil, măsurat pe inelul de perete */
  trasaturi: DiagnosticTrasaturi;
  /** FAȚA translucidă și potrivirea ei în prag */
  fata: DiagnosticFata;
  /** CONSTRÂNGERILE OPTICE — partea care diferențiază produsul */
  optic: DiagnosticOptic;
  /** canalul de cablu */
  canal: DiagnosticCanal;
  /** agățarea pe perete */
  agatare: DiagnosticAgatare;
  /** de câtă bandă e nevoie, câte LED-uri și cât consumă */
  banda: DiagnosticBanda;
  glifeLipsa: string[];
  triunghiuri: number;
  timpi: { font: number; interior: number; extrudare: number; verificari: number };
}

/** cum se potrivește fața în locașul ei — verificarea centrală a pasului 3 */
export interface DiagnosticFata {
  ariaMM2: number;
  /** câte bucăți iese fața (la „i" sunt două) */
  bucati: number;
  /** pe ce lățime se sprijină pe prag (mm) = lățimea pragului minus joc */
  sprijinMM: number;
  /** cu cât rămâne sub buza corpului (mm); negativ = iese în relief */
  subBuzaMM: number;
  /**
   * COLIZIUNEA cu corpul, în poziția de montaj (mm³). Trebuie să fie ZERO.
   * Aceeași natură de verificare ca la inlay-ul de la Litere Decor: piesa se aduce în poziția
   * de montaj și se cere ca intersecția cu locașul să fie goală.
   */
  coliziuneMM3: number;
  /** pragul a ieșit gol (literă prea îngustă): fața n-are pe ce sta */
  faraPrag: boolean;
}

/**
 * Ce decide dacă litera arată ca o SUPRAFAȚĂ luminoasă sau ca un ȘIR DE PUNCTE.
 *
 * Regula practică, singura care contează: distanța de la LED la fața translucidă trebuie să fie
 * cel puțin cât pasul dintre LED-uri. Sub atât, conurile de lumină nu apucă să se suprapună
 * până la difuzor și fiecare LED se vede separat. E un defect care se descoperă DUPĂ print,
 * deci aplicația trebuie să-l spună înainte, cu cifre.
 */
export interface DiagnosticOptic {
  /** distanța dintre două LED-uri (mm) */
  pasMM: number;
  /** distanța reală de la LED la fața interioară a difuzorului (mm) */
  distantaMM: number;
  /** distanța ≥ pas: lumina iese uniformă */
  uniform: boolean;
  /** ce adâncime de corp ar fi nevoie ca să iasă uniform, la banda curentă (mm) */
  adancimeMinima: number;
  /** cea mai RARĂ bandă care ar merge la adâncimea curentă; 0 = niciuna dintre cele oferite */
  bandaPotrivita: number;
  /** fața e mai groasă decât pragul peste care se pierde luminozitate fără câștig */
  fataPreaGroasa: boolean;
}

/** unde a ieșit canalul de cablu și dacă a mai rămas perete în jurul lui */
export interface DiagnosticCanal {
  pozitie: PozitieCanal;
  loc: LocCanal;
  diametruMM: number;
  /** punctul prin care trece axa, în coordonatele modelului; null = n-a încăput */
  punct: [number, number] | null;
  /** cât material a rămas în jurul lui, pe direcția critică (mm) */
  peretRamasMM: number;
}

/**
 * Ce cumpără și cu ce alimentează omul. Sunt exact informațiile pe care altfel le calculează
 * cineva pe hârtie, greșit.
 */
export interface DiagnosticBanda {
  /** lungimea de bandă necesară (cm) */
  lungimeCM: number;
  /** câte LED-uri intră pe lungimea aia */
  nrLED: number;
  /** consumul (W) la tensiunea presupusă */
  putereW: number;
  tensiuneV: number;
}

/** unde s-a putut agăța litera și cât material a rămas peste locaș */
export interface DiagnosticAgatare {
  tip: TipAgatare;
  pozitii: Pt[];
  /** adâncimea TOTALĂ a canalului în T (mm) */
  adancime: number;
  /** adâncimea nivelului de tijă — buza care reține capul (mm) */
  standoff: number;
  /** cu câte grade va sta litera strâmb pe perete */
  inclinare: number;
  /** cât urcă plasturele de armare pe INTERIOR (mm) */
  inaltimePlasture: number;
}

/** ce s-a schimbat în literă din cauza îngroșării */
export interface DiagnosticIngrosare {
  /** cât s-a îngroșat, pe fiecare parte (mm) */
  mm: number;
  /** contra-formele („ochiul" lui O, triunghiul lui A) rămase după îngroșare */
  contraForme: number;
  /** câte erau înainte — dacă scad, îngroșarea a astupat una */
  contraFormeInitial: number;
  /** de câtă îngroșare ar fi nevoie ca banda să încapă (mm); 0 = încape deja */
  necesarMM: number;
}

export interface RezultatLuminos {
  corpOpac: any;
  /** fața translucidă, în POZIȚIA DE MONTAJ (nu la origine) */
  corpFata: any | null;
  diagnostice: DiagnosticLuminos;
  ms: number;
}

/**
 * Câte bucăți neconectate are o siluetă (sau un solid).
 * `decompose` întoarce obiecte noi în heap-ul WASM; se eliberează pe loc, altfel o buclă de
 * mii de construcții (testul) termină heap-ul înainte să apuce GC-ul JS să ruleze.
 */
/**
 * Câte CONTRA-FORME are silueta — „ochiul" lui O, triunghiul lui A, buclele lui B.
 * `toPolygons` dă conturile exterioare în sens trigonometric și găurile invers, deci se numără
 * inelele cu arie NEGATIVĂ. Contează la îngroșare: dilatarea le strânge și, peste o anumită
 * valoare, le astupă cu totul — litera devine o pată, iar asta trebuie spus, nu descoperit.
 */
/**
 * Litera îngroșată: DILATARE, apoi ÎNCHIDERE morfologică — aceeași tehnică validată la Brelocuri.
 * Dilatarea singură păstrează fiecare colț interior, iar la „A" sau „R" rămân crestături adânci
 * între trăsăturile apropiate; închiderea le astupă și dă forma curgătoare. Raza de închidere e
 * chiar îngroșarea: crestăturile pe care le lasă o dilatare de R sunt de ordinul lui R.
 */
export function ingroasa(sil: any, mm: number): any {
  const umflat = sil.offset(mm, 'Round');
  const inchis = umflat.offset(mm, 'Round');
  const neted = inchis.offset(-mm, 'Round');
  umflat.delete(); inchis.delete();
  return neted;
}

function contraForme(cs: any): number {
  return (cs.toPolygons() as Ring[]).filter((r) => arieRing(r) < 0).length;
}

export function bucatiDin(cs: any): number {
  const p = cs.decompose();
  const n = p.length;
  for (const x of p) x.delete();
  return n;
}

/**
 * Corpul pregătit de PRINT.
 *
 * Fonturile vin cu y în jos; fără oglindire piesa ar ieși în oglindă față de ce s-a văzut pe
 * ecran. Viewport-ul aplică el însuși aceeași oglindire, deci cele două rămân ACELAȘI obiect.
 *
 * Corpul se extrudează pe +Z cu spatele la Z=0, deci pleacă la print exact cum trebuie: spatele
 * pe placă, gura în sus, fără suporți.
 */
/**
 * Marja cu care se dau inaltimile propuse. Calibrata la Cutii Litere, pe acelasi motiv: valoarea
 * se calculeaza la limita exacta, unde cavitatea are latime zero.
 */
const MARJA = 1.02;

/** verdictul unui font la litera si configuratia curente */
export interface VerdictFont {
  /** ramane cavitate in care intra banda */
  ok: boolean;
  /** cea mai groasa trasatura a literei in fontul asta (mm) */
  trasaturaMaxMM: number;
  /** cat e nevoie: doi pereti + doua praguri + latimea benzii cu joc (mm) */
  necesarMM: number;
  /** inaltimea de litera de la care ar merge (mm); 0 = nici la maximul panoului */
  inaltimeMinMM: number;
}

/**
 * Incape banda in silueta asta, la configuratia curenta?
 *
 * FILTRAREA E MASURATA, NU O LISTA. Un font cursiv subtire nu e „de proasta calitate" in sine —
 * e prea subtire PENTRU CONFIGURATIA ASTA. La 150 mm nu incape banda in el; la 250 mm incape.
 * O lista fixa ar minti in ambele sensuri, iar la LED constrangerea e mai stransa decat la
 * cutii: pe langa cei doi pereti opaci se scad si cele doua praguri pe care sta fata.
 *
 *     trasatura maxima >= 2×(perete + prag) + latimea benzii + joc
 *
 * Aceeasi masuratoare (raza cercului maxim inscris) din care iese si cavitatea reala, deci
 * selectorul si geometria nu se pot contrazice.
 */
export function verdictBanda(sil: any, p: {
  inaltime: number; grosimePerete: number; latimePrag: number; latimeBanda: number;
  ingrosare?: number; inaltimeMax: number; inaltimePas: number;
}): VerdictFont {
  // verdictul trebuie dat pe piesa CARE SE CONSTRUIEȘTE, nu pe silueta fontului: cu îngroșare
  // pusă, un font respins devine bun, iar selectorul ar minți dacă n-ar ține cont de ea
  const r = razaInscrisaMaxima(sil) + (p.ingrosare ?? 0);
  const necesar = 2 * (p.grosimePerete + p.latimePrag) + p.latimeBanda + JOC_BANDA;
  // scalarea piesei scaleaza raza inscrisa, deci inaltimea minima iese direct din raport
  const inaltimeMin = r > 1e-6
    ? Math.ceil((p.inaltime * necesar * MARJA) / (2 * r) / p.inaltimePas) * p.inaltimePas
    : Infinity;
  return {
    ok: 2 * r >= necesar,
    trasaturaMaxMM: +(2 * r).toFixed(1),
    necesarMM: +necesar.toFixed(1),
    inaltimeMinMM: Number.isFinite(inaltimeMin) && inaltimeMin <= p.inaltimeMax ? inaltimeMin : 0,
  };
}

/**
 * Cât material rămâne peste locașul de agățare (mm). Aici atârnă litera pe un inel de PLA.
 * Calibrat la Cutii Litere; nu se confundă cu pragul de printabilitate — acolo întrebarea e
 * dacă IESE, aici dacă REZISTĂ.
 */
export const MATERIAL_PESTE_LOCAS = 2;

/** înălțimea canalului agățătoarei cu dinți (mm) */
const CANAL_GRILA = 8;

/**
 * CELE DOUĂ CONTURURI ALE LOCAȘULUI — nivelul tijei și nivelul capului.
 *
 * Locașul e un CANAL ÎN T, nu un buzunar cu pereți drepți: lângă perete trece doar fanta tijei
 * (materialul de acolo e BUZA care reține capul), iar mai adânc urmează camera în care
 * CĂLĂTOREȘTE capul, lată cât el. Un singur contur la o singură adâncime ar da o fantă de
 * lățimea tijei la orice adâncime, iar capul n-ar avea pe unde gliza — defectul găsit la Cutii
 * Litere și la Litere Fagure, pe piesa randată.
 */
function formeAgatare(cfg: ParamLuminos): { tija: Ring[]; cap: Ring[] } | null {
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
  return null;
}

export function pentruPrint(corp: any): any {
  return corp.mirror([0, 1, 0]);
}

export function construiesteCorpLuminos(cfg: ParamLuminos): RezultatLuminos {
  if (!MOD) throw new Error(t('geometry.manifoldNeconfigurat', { functie: 'construiesteCorpLuminos' }));
  const { Manifold, CrossSection } = MOD;
  const t0 = performance.now();

  // ---- silueta literei, centrată pe origine ----
  const rep: Partial<SolidReport> = {};
  const bruta = cfg.solid(cfg.inaltimeLitera, cfg.adancimeCorp, rep);
  const silBruta = bruta.project();
  bruta.delete();
  const b0 = silBruta.bounds();
  const silFont = silBruta.translate([-(b0.min[0] + b0.max[0]) / 2, -(b0.min[1] + b0.max[1]) / 2]);
  silBruta.delete();

  // ---- ÎNGROȘAREA ----
  //
  // Aceeași tehnică ca la Brelocuri, unde e deja validată: DILATARE, apoi ÎNCHIDERE morfologică.
  // Dilatarea singură păstrează fiecare colț interior al literei, iar la „A" sau „R" rămân
  // crestături adânci între trăsăturile apropiate; închiderea (umflare urmată de retragere) le
  // astupă și dă forma curgătoare. Raza de închidere e chiar îngroșarea: crestăturile pe care le
  // lasă o dilatare de R sunt de ordinul lui R.
  //
  // De ce e nevoie: la un font subțire trăsătura n-are loc pentru doi pereți, două praguri și
  // bandă. Îngroșarea e singurul parametru care mărește CAVITATEA fără să miște înălțimea cerută
  // a literei — peretele nu poate coborî sub pragul optic, iar banda nu se poate îngusta.
  const contraInitial = contraForme(silFont);
  const sil = cfg.ingrosare > 0 ? ingroasa(silFont, cfg.ingrosare) : silFont;
  const tFont = performance.now();

  const rb = sil.bounds();
  const latime = rb.max[0] - rb.min[0], inaltime = rb.max[1] - rb.min[1];

  // ---- CAVITATEA BENZII ----
  //
  // Cavitatea în care stă banda e retrasă cu PERETE + PRAG, nu doar cu peretele: pragul e o
  // îngroșare a peretelui pe partea dinspre spate, iar banda stă pe spate, deci în zona îngustă.
  // Din nucleu, cu pragul de lățime utilă pus pe LĂȚIMEA BENZII — o cameră în care nu intră
  // banda nu ajută cu nimic la o literă luminoasă. Același mecanism ca la cutii, alt prag.
  const cav = cavitateCutie(CrossSection, sil, { grosimePerete: cfg.grosimePerete + cfg.latimePrag,
    adancime: cfg.adancimeCorp - cfg.adancimePrag, latimeCameraMin: cfg.latimeBanda + JOC_BANDA,
    fantaMin: FANTA_MIN });
  const tInterior = performance.now();

  // ---- CORPUL, cu LOCAȘUL FEȚEI ----
  //
  // PRAGUL E O LĂRGIRE A CAVITĂȚII SPRE GURĂ, nu o consolă spre interior — și asta e decizia
  // care face piesa printabilă. Formularea din plan („prag = interior \ interior retras") descrie
  // un umăr care iese spre înăuntru: la print, cu spatele pe placă, ar fi o consolă orizontală
  // suspendată de jur împrejur. Aici cavitatea se LĂRGEȘTE spre gură, deci mergând în sus
  // materialul doar dispare — zero suspendat, zero suporți. Umărul rezultat privește în SUS și
  // pe el se așază fața.
  //
  // Consecința care contează optic: peretele văzut din față rămâne la grosimea PLINĂ (Wp), nu
  // subțiat de locaș. Dacă locașul ar fi fost tăiat din exteriorul peretelui, inelul opac din
  // față ar fi coborât sub pragul de 1.6 mm și litera ar fi curs pe lateral exact pe contur.
  const locasFata = sil.offset(-cfg.grosimePerete, 'Round');
  const faraPrag = locasFata.area() <= 1e-6;
  // blocul are înălțimea PLINĂ (spate + adâncime), iar cavitatea benzii se oprește sub locașul
  // feței — altfel locașul s-ar tăia peste vârful piesei și n-ar tăia nimic. Exact asta s-a
  // întâmplat la prima încercare: corpul ieșea 25 mm în loc de 27, iar bara de stare o spunea.
  let corpOpac = corpCutie(Manifold, sil, cav.cavitate, cfg.grosimeSpate,
    cfg.adancimeCorp, cfg.adancimeCorp - cfg.adancimePrag);
  if (!faraPrag) {
    // locașul urcă până la gură și iese 0.2 mm peste ea: fețe coplanare = boolean fragil
    const cutter = Manifold.extrude(locasFata, cfg.adancimePrag + 0.2)
      .translate([0, 0, cfg.grosimeSpate + cfg.adancimeCorp - cfg.adancimePrag]);
    const cu = corpOpac.subtract(cutter);
    cutter.delete(); corpOpac.delete();
    corpOpac = cu;
  }
  // ---- AGĂȚAREA PE PERETE ----
  //
  // Aceeași construcție ca la Cutii Litere, din același modul de nucleu: canal în T săpat în
  // SPATELE literei, cu plasturele de armare pe INTERIOR. Spatele are 2 mm, iar locașul ~5 mm —
  // fără plasture ar străpunge direct în cavitate, adică fix acolo unde stă banda. Îngroșarea
  // pe spate ar depărta litera de perete; pastila de pe interior stă sub bandă și nu se vede.
  const cmSil = centroid(sil);
  const forme = formeAgatare(cfg);
  // adâncimea se CALCULEAZĂ: tija pe standoff + capul pe înălțimea lui. Un parametru liber ar
  // permite exact configurația în care capul nu încape.
  const adancimeAgatare = Math.max(STANDOFF_TIJA + 1,
    Math.min(STANDOFF_TIJA + cfg.inaltimeCapSurub + JOC_CAPAC,
      cfg.grosimeSpate + cfg.adancimeCorp - cfg.adancimePrag - MATERIAL_PESTE_LOCAS - 1));
  const inaltimePlasture = Math.max(cfg.grosimeSpate, adancimeAgatare + MATERIAL_PESTE_LOCAS);
  // poziția se caută pe conturul CEL MAI MARE — camera capului
  const pozAgatare = forme ? pozitieAgatare(CrossSection, sil, forme.cap, cmSil[0], cmSil[1]) : [];
  if (forme && pozAgatare.length) {
    const cTija = new CrossSection(forme.tija, 'Positive');
    const cCap = new CrossSection(forme.cap, 'Positive');
    const dilatat = cCap.offset(PERETE_GAURA, 'Round');
    let tTija: any = null, tCap: any = null, plasture: any = null;
    for (const p of pozAgatare) {
      const a = cTija.translate(p), b = cCap.translate(p), pl = dilatat.translate(p);
      if (tTija) { const u = tTija.add(a); tTija.delete(); a.delete(); tTija = u; } else tTija = a;
      if (tCap) { const u = tCap.add(b); tCap.delete(); b.delete(); tCap = u; } else tCap = b;
      if (plasture) { const u = plasture.add(pl); plasture.delete(); pl.delete(); plasture = u; } else plasture = pl;
    }
    cTija.delete(); cCap.delete(); dilatat.delete();
    const pad = Manifold.extrude(plasture, inaltimePlasture);
    const cu = corpOpac.add(pad);
    pad.delete(); corpOpac.delete();
    corpOpac = cu;
    // canalul în T: fanta tijei deschisă la spate, camera capului îngropată. Se suprapun cu o
    // sutime — lipite exact, ar avea fețe coplanare și ar lăsa cochilii degenerate.
    const c1 = Manifold.extrude(tTija, STANDOFF_TIJA + 0.21).translate([0, 0, -0.2]);
    const c2 = Manifold.extrude(tCap, adancimeAgatare - STANDOFF_TIJA).translate([0, 0, STANDOFF_TIJA]);
    const cutter = c1.add(c2);
    c1.delete(); c2.delete(); tTija.delete(); tCap.delete(); plasture.delete();
    const gaurit = corpOpac.subtract(cutter);
    cutter.delete(); corpOpac.delete();
    corpOpac = gaurit;
  }

  // ---- CANALUL DE CABLU ----
  //
  // Poziția NU se alege din bounding box, ci prin EROZIUNE: mulțimea centrelor în care discul
  // „canal + perete rămas" încape întreg e chiar cavitatea retrasă cu raza aia. Orice vârf al
  // conturului ei e un centru valid PRIN CONSTRUCȚIE — nu mai trebuie verificat după aceea,
  // și nu se poate nimeri într-un loc unde peretele s-ar subția sub prag.
  //
  // Dintre centrele valide se ia cel mai de JOS (y maxim în spațiul fontului): acolo iese
  // cablul firesc, sub literă, și nu se vede.
  const rCanal = cfg.diametruCanal / 2;
  let canalPunct: [number, number] | null = null;
  let peretRamas = 0;
  if (cav.cavitate) {
    const zona = cav.cavitate.offset(-(rCanal + PERETE_CANAL), 'Round');
    if (zona.area() > 1e-6) {
      // toate centrele valide, sortate pe verticală (y crește în JOS)
      const valide: [number, number][] = [];
      for (const ring of zona.toPolygons() as [number, number][][]) for (const p of ring) valide.push([p[0], p[1]]);
      valide.sort((a, b) => a[1] - b[1]);
      // „reglabil" înseamnă că omul alege DINTRE POZIȚIILE VALIDE, nu că mută liber un punct
      // care apoi ar putea cădea în perete. Cele trei opțiuni indexează aceeași listă.
      canalPunct = cfg.locCanal === 'sus' ? valide[0]
        : cfg.locCanal === 'mijloc' ? valide[Math.floor(valide.length / 2)]
          : valide[valide.length - 1];
      peretRamas = PERETE_CANAL;
    }
    zona.delete();
  }
  if (canalPunct) {
    const [cx, cy] = canalPunct;
    let cutter: any;
    if (cfg.pozitieCanal === 'spate') {
      // vertical prin SPATE: cablul iese pe fața care stă pe perete. Cilindrul depășește 0.2 mm
      // de fiecare parte — fețe coplanare = boolean fragil.
      cutter = Manifold.cylinder(cfg.grosimeSpate + 0.4, rCanal, rCanal, 32, false)
        .translate([cx, cy, -0.2]);
    } else {
      // orizontal prin PERETE. Axa stă la o rază plus perete deasupra spatelui, deci sub ea
      // rămâne material; iar deasupra trebuie să rămână până la locașul feței.
      const zAxa = cfg.grosimeSpate + rCanal + PERETE_CANAL;
      const lung = cfg.grosimePerete + cfg.latimePrag + 6;
      const cil = Manifold.cylinder(lung, rCanal, rCanal, 32, false);
      cutter = cfg.pozitieCanal === 'jos'
        // y crește în JOS, deci „iese pe dedesubt" înseamnă spre +Y
        ? cil.rotate([-90, 0, 0]).translate([cx, cy - 1, zAxa])
        : cil.rotate([0, 90, 0]).translate([cx + 1, cy, zAxa]).mirror([1, 0, 0]);
      cil.delete();
      // cât rămâne deasupra canalului, până la locașul feței: e cota care poate pica
      peretRamas = Math.min(PERETE_CANAL,
        cfg.grosimeSpate + cfg.adancimeCorp - cfg.adancimePrag - (zAxa + rCanal));
    }
    const gaurit = corpOpac.subtract(cutter);
    cutter.delete(); corpOpac.delete();
    corpOpac = gaurit;
  }

  const status = String(corpOpac.status());
  if (status !== 'NoError') throw new Error(t('led.geometrieInvalida', { status }));

  // ---- FAȚA TRANSLUCIDĂ ----
  // Contur = locașul retras cu jocul, deci intră cu Jf pe fiecare parte. Se construiește direct
  // în POZIȚIA DE MONTAJ: așa verificarea de coliziune întreabă chiar ce trebuie — se lovesc
  // piesele acolo unde vor sta? — fără să mai fie nevoie de o transformare care ar putea greși.
  const fata2D = faraPrag ? null : locasFata.offset(-cfg.jocFata, 'Round');
  const corpFata = fata2D && fata2D.area() > 1e-6
    ? Manifold.extrude(fata2D, cfg.grosimeFata)
      .translate([0, 0, cfg.grosimeSpate + cfg.adancimeCorp - cfg.adancimePrag])
    : null;
  const tExtrudare = performance.now();

  // material subțire, măsurat pe INELUL de perete — secțiunea reală la orice înălțime peste spate
  const inel = cav.cavitate ? sil.subtract(cav.cavitate) : sil;
  const trasaturi = trasaturiSubtiri(inel, TRASATURA_MIN);

  // ---- COLIZIUNEA CELOR DOUĂ PIESE ----
  // Fața e deja în poziția de montaj, deci întrebarea e directă: se ating? Trebuie ZERO.
  // Verificare de aceeași natură cu inlay-ul de la Litere Decor, unde piesa se aduce înapoi în
  // locaș și se cere ca ce iese din contur să fie gol.
  let coliziuneMM3 = 0;
  if (corpFata) {
    const comun = corpOpac.intersect(corpFata);
    coliziuneMM3 = +comun.volume().toFixed(3);
    comun.delete();
  }

  // ---- CONSTRÂNGERILE OPTICE ----
  //
  // Distanța care contează NU e adâncimea corpului: banda stă lipită pe spate, iar fața e
  // coborâtă în locaș. Deci de la LED până la difuzor rămâne adâncimea MINUS locașul feței
  // MINUS grosimea benzii. Diferența e de 5 mm la valorile implicite — destul cât să treacă
  // drept uniformă o literă care nu e.
  const pasMM = pasLED(cfg.tipBanda);
  const distantaMM = cfg.adancimeCorp - cfg.adancimePrag - GROSIME_BANDA;
  // ce adâncime ar fi nevoie ca distanța să atingă pasul, la banda de acum
  const adancimeMinima = Math.ceil(pasMM + cfg.adancimePrag + GROSIME_BANDA);
  // cea mai RARĂ bandă care merge la adâncimea de acum — banda mai deasă costă mai mult curent,
  // deci nu se recomandă una mai deasă decât e nevoie
  const bandaPotrivita = BENZI.find((tip) => pasLED(tip) <= distantaMM) ?? 0;
  const optic: DiagnosticOptic = {
    pasMM: +pasMM.toFixed(1),
    distantaMM: +distantaMM.toFixed(1),
    uniform: distantaMM >= pasMM,
    adancimeMinima,
    bandaPotrivita,
    fataPreaGroasa: cfg.grosimeFata > FATA_MAX_UTIL,
  };

  // ---- CÂTĂ BANDĂ, CÂTE LED-URI, CÂȚI WAȚI ----
  //
  // Lungimea se ia pe LINIA MEDIANĂ a benzii, nu pe conturul cavității: banda are lățime, iar
  // pe un contur curb marginea exterioară e mai lungă decât cea interioară. Diferența e reală —
  // la o literă cu multe curbe, conturul cavității supraestimează cu procente bune, adică taman
  // în direcția în care omul cumpără bandă degeaba.
  let lungimeMM = 0;
  if (cav.cavitate) {
    const mediana = cav.cavitate.offset(-cfg.latimeBanda / 2, 'Round');
    const traseu = mediana.area() > 1e-6 ? mediana : cav.cavitate;
    for (const ring of traseu.toPolygons() as [number, number][][]) {
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i], b = ring[(i + 1) % ring.length];
        lungimeMM += Math.hypot(b[0] - a[0], b[1] - a[1]);
      }
    }
    mediana.delete();
  }
  const lungimeM = lungimeMM / 1000;
  const banda: DiagnosticBanda = {
    lungimeCM: +(lungimeMM / 10).toFixed(1),
    // se rotunjește în JOS: pe bandă se taie doar la marcaj, deci pe lungimea asta încap atâtea
    nrLED: Math.floor(lungimeM * cfg.tipBanda),
    putereW: +(lungimeM * PUTERE_PE_METRU[cfg.tipBanda]).toFixed(1),
    tensiuneV: TENSIUNE,
  };

  // ---- CÂTĂ ÎNGROȘARE AR FI NEVOIE ----
  //
  // Se calculează pe silueta FONTULUI, nu pe cea deja îngroșată: întrebarea e „de la ce valoare
  // încape banda", nu „cât mai lipsește față de cât am pus". Așa cifra nu se mișcă sub om în
  // timp ce trage de cursor.
  // Se calculează pe silueta FONTULUI, nu pe cea deja îngroșată: întrebarea e „de la ce valoare
  // încape banda", nu „cât mai lipsește față de cât am pus". Așa cifra nu se mișcă sub om în
  // timp ce trage de cursor.
  //
  // Estimarea închisă (d = (necesar − trăsătură)/2) e doar PUNCT DE PLECARE, nu răspuns: la
  // Cormorant „A" ieșea 0 — adică „banda încape și fără îngroșare" — pe o literă în care nu
  // încăpea. Cauza e aceeași ca la reparațiile din Cutii Litere: valoarea calculată la limita
  // exactă cade fix pe muchie, iar „erodează cu a, apoi cu b" e egal cu „erodează cu a+b" doar
  // în continuu. Deci răspunsul se VERIFICĂ, reconstruind cavitatea la valorile candidate.
  //
  // Se caută LENEȘ, doar când banda chiar nu încape — adică exact când omul are nevoie de cifră.
  const necesarIngrosare = cav.camereUtile ? 0 : (() => {
    const r = razaInscrisaMaxima(silFont);
    const necesar = 2 * (cfg.grosimePerete + cfg.latimePrag) + cfg.latimeBanda + JOC_BANDA;
    const start = Math.max(PAS_INGROSARE, Math.ceil(((necesar - 2 * r) / 2) / PAS_INGROSARE) * PAS_INGROSARE);
    for (let d = start; d <= INGROSARE_MAX + 1e-9; d += PAS_INGROSARE) {
      const s2 = ingroasa(silFont, d);
      const c2 = cavitateCutie(CrossSection, s2, { grosimePerete: cfg.grosimePerete + cfg.latimePrag,
        adancime: cfg.adancimeCorp - cfg.adancimePrag, latimeCameraMin: cfg.latimeBanda + JOC_BANDA,
        fantaMin: FANTA_MIN });
      const merge = c2.camereUtile > 0;
      if (c2.cavitate && c2.cavitate !== c2.interior) c2.cavitate.delete();
      c2.interior.delete(); s2.delete();
      if (merge) return +d.toFixed(1);
    }
    return 0;
  })();
  const tVerificari = performance.now();

  const diagnostice: DiagnosticLuminos = {
    dimLitera: [+latime.toFixed(1), +inaltime.toFixed(1)],
    ingrosare: { mm: cfg.ingrosare, contraForme: contraForme(sil),
      contraFormeInitial: contraInitial, necesarMM: necesarIngrosare },
    inaltimeTotala: +(cfg.grosimeSpate + cfg.adancimeCorp).toFixed(1),
    ariaPlinaMM2: +sil.area().toFixed(1),
    ariaCavitateMM2: +(cav.cavitate ? cav.cavitate.area() : 0).toFixed(1),
    camere: cav.camere,
    camereUtile: cav.camereUtile,
    interiorGol: cav.interiorGol,
    fanteUmplute: cav.fanteUmplute,
    bucati: bucatiDin(corpOpac),
    bucatiLitera: bucatiDin(sil),
    trasaturi,
    optic,
    banda,
    agatare: { tip: cfg.tipAgatare, pozitii: pozAgatare, adancime: +adancimeAgatare.toFixed(2),
      standoff: STANDOFF_TIJA, inclinare: inclinareAgatare(pozAgatare, cmSil),
      inaltimePlasture: +inaltimePlasture.toFixed(2) },
    canal: { pozitie: cfg.pozitieCanal, loc: cfg.locCanal, diametruMM: cfg.diametruCanal, punct: canalPunct,
      peretRamasMM: +peretRamas.toFixed(2) },
    fata: {
      ariaMM2: +(fata2D ? fata2D.area() : 0).toFixed(1),
      bucati: corpFata ? bucatiDin(corpFata) : 0,
      sprijinMM: +Math.max(0, cfg.latimePrag - cfg.jocFata).toFixed(2),
      subBuzaMM: +(cfg.adancimePrag - cfg.grosimeFata).toFixed(2),
      coliziuneMM3,
      faraPrag,
    },
    glifeLipsa: rep.missingGlyphs ?? [],
    triunghiuri: corpOpac.numTri() + (corpFata ? corpFata.numTri() : 0),
    timpi: {
      font: +(tFont - t0).toFixed(1),
      interior: +(tInterior - tFont).toFixed(1),
      extrudare: +(tExtrudare - tInterior).toFixed(1),
      verificari: +(tVerificari - tExtrudare).toFixed(1),
    },
  };

  // temporarele trăiesc în heap-ul WASM și se eliberează abia la un GC al JS-ului
  if (inel !== sil) inel.delete();
  locasFata.delete(); fata2D?.delete();
  if (cav.cavitate && cav.cavitate !== cav.interior) cav.cavitate.delete();
  cav.interior.delete();
  if (sil !== silFont) sil.delete();
  silFont.delete();

  return { corpOpac, corpFata, diagnostice, ms: performance.now() - t0 };
}
