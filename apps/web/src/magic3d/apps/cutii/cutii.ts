/**
 * APP CUTII LITERE — geometria produsului.
 *
 * O literă cu PEREȚI ȘI FUND, goală pe dinăuntru: cutie pentru iarbă și lichen artificial,
 * flori sau dulciuri.
 *
 *   sil      = silueta literei (proiecția solidului din font)
 *   interior = sil.offset(-Wp)               Wp = grosimea peretelui
 *   cutia    = extrude(sil, Gf+H) \ extrude(interior, H).ridicat la Gf
 *
 * Scris ca O SINGURĂ scădere, nu ca reuniune de pereți cu fund: `fund ∪ pereți` cere întâi
 * `sil \ interior` în 2D și apoi o reuniune în 3D, adică două operații pe geometria cea mai
 * scumpă. Rezultatul e identic — un bloc plin din care se sapă cavitatea E aceeași cutie.
 *
 * CONTRA-FORMELE se rezolvă singure. La „A" sau „O", golul interior al literei nu face parte
 * din `sil`, deci nu apare nici în fund. Nu curge nimic prin el — e în afara cutiei. Peretele
 * înconjoară și conturul interior, iar cavitatea devine un canal inelar, o singură cameră.
 *
 * Solidul din font vine din core/geometry/textSolid.ts și măsurătoarea de material subțire din
 * core/geometry/trasaturi.ts — o singură copie, comună tuturor aplicațiilor. NU se copiază
 * local: copierea era soluția de dinainte de unificare, iar o copie nouă ar anula chiar munca
 * aceea. Izolarea interzice `apps/A -> apps/B`, nu `apps/A -> core/`.
 */
import { t } from '../../core/i18n/index.js';
import { configureManifold as configTextSolid, textSolid, type SolidReport } from '../../core/geometry/textSolid.js';
import { trasaturiSubtiri, razaInscrisaMaxima, TRASATURA_MIN, PATA_MAX, type DiagnosticTrasaturi } from '../../core/geometry/trasaturi.js';
import { cavitateCutie, corpCutie as construiesteCutie, type Camera } from '../../core/geometry/cutie.js';
import { centroid, arieRing, type Pt, type Ring } from '../../core/geometry/forme2d.js';
import { pozitieAgatare, inclinareAgatare, conturCheie, conturGrila,
  PERETE_GAURA, STANDOFF_TIJA, type TipAgatare } from '../../core/geometry/agatare.js';
import { tipar, intindere, TIPARE, type Tipar } from '../../core/geometry/tipare.js';

export { TRASATURA_MIN, PATA_MAX, PERETE_GAURA, STANDOFF_TIJA, TIPARE };
export type { DiagnosticTrasaturi, TipAgatare, Tipar, Camera };

/** modelul de pe fund: unul dintre tiparele nucleului, sau niciunul */
export type ModelFund = Tipar | 'fara';

/**
 * Forma unui gol din perete. NU e un tipar din nucleu, și diferența e de fond: acolo tiparele
 * umplu o suprafață PLANĂ, aici golurile se taie radial printr-un perete care urmează conturul
 * literei. Un fagure adevărat pe perete ar cere desfășurarea suprafeței și reînfășurarea
 * modelului — vezi comentariul de la `goluriPerete`.
 */
export type FormaGol = 'hexagon' | 'rotund' | 'dreptunghi';
export const FORME_GOL: FormaGol[] = ['hexagon', 'rotund', 'dreptunghi'];

let MOD: any = null;

/**
 * Primește instanța manifold și o pasează mai departe solidului din font.
 * NU pornește singur modulul: aplicația îl ia din nucleu, testele îl pornesc pe al lor.
 * Așa fișierul ăsta nu depinde de nimic din viewport (three.js) și e rulabil în node.
 */
export function configureManifold(mod: any): void {
  MOD = mod;
  configTextSolid(mod);
}

/**
 * Cât de lată trebuie să fie o cameră ca să poți pune ceva în ea (mm).
 *
 * E o decizie de PRODUS, nu una de printare: un gol de 3 mm se printează perfect, dar în el nu
 * intră nici un smoc de lichen, nici un colț de burete floral. Sub 6 mm cutia arată a cutie și
 * nu se poate umple — exact genul de piesă care se descoperă după print. Cu peretele implicit
 * de 2.5 mm, condiția devine „trăsătura literei ≥ 11 mm", adică vreo 110 mm de literă la un
 * font gros: chiar plaja în care se vinde produsul.
 */
export const CAMERA_LATIME_MIN = 6;

/**
 * Sub ce lățime un gol NU se printează ca gol (mm) — două extrudări, ca la orice perete.
 *
 * Fantele mai înguste de atât se umplu LA LOC, nu se lasă în geometrie: slicer-ul le-ar umple
 * oricum, dar prost, cu material scămoșat. Apar de la sine acolo unde trăsătura literei are fix
 * cât doi pereți plus un fir — la serife și la locul unde se întâlnesc două trăsături.
 */
export const FANTA_MIN = 0.8;

/**
 * Limitele parametrilor, ca reguli de produs — și SURSA UNICĂ pentru panou.
 *
 * Stau aici, nu în interfață, fiindcă din ele se compune sfatul dat când nu rămâne interior:
 * „subțiază peretele la cel mult 0 mm" e un sfat imposibil, și exact asta a ieșit în aplicație
 * înainte de a le lega. Panoul și mesajul trebuie să vină din același loc, altfel aplicația
 * ajunge să recomande o valoare pe care propriul ei control n-o acceptă.
 *
 * PERETE_MIN nu e pragul de printare (0.85 mm), ci unul de produs: cutia se ține în mână plină
 * cu material umed, iar sub 1.6 mm peretele cedează la strâns, oricât de curat s-ar printa.
 * INALTIME_MAX stă sub latura plăcii de print celei mai mari din listă.
 */
export const PERETE_MIN = 1.6;
export const PERETE_MAX = 6;
export const INALTIME_MIN = 60;
export const INALTIME_MAX = 300;
/** pasul cu care umblă controlul de înălțime din panou (mm) */
export const INALTIME_PAS = 5;

/**
 * Marja cu care se dau reparațiile propuse omului.
 *
 * NU e prudență decorativă. Reparația se calculează la limita exactă — înălțimea la care raza
 * înscrisă atinge fix `perete + jumătate de cameră` — iar la limită camera are lățime zero.
 * În plus, „erodează cu a, apoi cu b" e egal cu „erodează cu a+b" doar în continuu; pe poligoane
 * rămâne o aproximare de ordinul toleranței. Testul a găsit exact cazul: la Tangerine „3",
 * sfatul „literă ≥ 151 mm" nu producea cutie la 151 mm.
 */
export const MARJA_REPARATIE = 1.02;

/**
 * Cât material rămâne peste locașul de agățare (mm) — regulă de produs.
 *
 * Aici atârnă toată cutia plină cu vegetație, pe un inel de PLA în jurul fantei. 1.2 mm (trei
 * straturi) s-ar printa curat și s-ar rupe la prima atingere; 2 mm e minimul la care inelul
 * chiar ține. NU se confundă cu pragul de printabilitate de 0.85 mm — acolo întrebarea e dacă
 * iese, aici dacă rezistă.
 */
export const MATERIAL_PESTE_LOCAS = 2;

/** jocul pe cap și pe fantă (mm) — la FDM peretele iese cu o zecime în plus */
export const JOC_AGATARE = 0.4;

/**
 * MODUL DE PRODUS — două cutii diferite, nu un parametru cosmetic.
 *
 * `masa` stă pe masă și primește burete floral UD, deci fundul e obligatoriu plin și etanș.
 * `perete` se agață și primește lichen USCAT, deci fundul poate fi traforat mai târziu, iar
 * agățarea devine obligatorie. Modul mută implicitele odată; altfel omul ar avea de potrivit
 * patru parametri ca să ajungă la aceeași configurație.
 */
export type ModProdus = 'masa' | 'perete';

/**
 * Cât are voie să difere volumul MĂSURAT pe solid de cel CALCULAT din arii, ca fracțiune.
 *
 * Nu e o toleranță de fabricație, ci una numerică: ambele cifre ies din aceleași poligoane
 * (extrudarea unei secțiuni are volumul exact arie × înălțime), deci ar trebui să coincidă până
 * la eroarea de virgulă mobilă. Pragul de 0.1% e larg cu multe ordine de mărime față de ce se
 * măsoară în practică — tocmai ca să nu sară la zgomot, dar să prindă o cutie chiar spartă:
 * un cutter ieșit prin fund sau o cavitate scăpată peste contur mișcă volumul cu procente
 * întregi, nu cu miimi.
 */
export const ABATERE_MAX = 0.001;

/**
 * Ce trebuie schimbat ca să rămână interior. Se calculează DOAR când chiar nu rămâne — vezi
 * `razaInscrisaMaxima`, care costă o căutare binară de offseturi.
 */
export interface Reparatie {
  /** cea mai groasă trăsătură a literei (mm) = 2× raza cercului maxim înscris */
  trasaturaMaxMM: number;
  /** cât e nevoie: 2 pereți + o cameră utilizabilă (mm) */
  necesarMM: number;
  /** peretele maxim la care ar rămâne o cameră utilizabilă, la litera de acum (mm) */
  peretMaxMM: number;
  /** înălțimea de literă de la care peretele de acum ar lăsa o cameră utilizabilă (mm) */
  inaltimeMinMM: number;
  /**
   * Ce poate face omul, de fapt. Un „subțiază peretele la 0.4 mm" e un sfat pe care panoul
   * nu-l acceptă, deci nu e un sfat. Se decide aici, unde se cunosc și limitele.
   */
  potPerete: boolean;
  potInaltime: boolean;
}

export interface CutiiConfig {
  litera: string;
  font: any;                 // font opentype deja parsat
  inaltimeLitera: number;    // mm, măsurat pe capHeight
  adancime: number;          // H — adâncimea cutiei, de la fața fundului la gură (mm)
  grosimePerete: number;     // Wp
  grosimeFund: number;       // Gf
  /** cum se agață cutia pe perete. „fara" = cutie de masă. */
  tipAgatare: TipAgatare;
  /** Ø capului șurubului și Ø tijei (mm) — la „cheie" */
  surubCap: number;
  surubTija: number;
  /** lățimea agățătoarei cu dinți (mm) */
  latimeGrila: number;
  /**
   * ÎNĂLȚIMEA capului de șurub (mm) — cât ocupă el din locaș.
   *
   * Adâncimea locașului NU e parametru: se calculează din standoff + înălțimea asta. Un
   * parametru liber ar fi permis exact configurația în care capul nu încape.
   */
  inaltimeCapSurub: number;
  /** modelul străpuns prin FUND. „fara" = fund plin, etanș. */
  modelFund: ModelFund;
  /** pasul, peretele, unghiul și varianta tiparului de pe fund */
  pasFund: number;
  pereteFund: number;
  unghiFund: number;
  variantaFund: number;
  /** cât rămâne plin pe conturul cavității, ca fundul să nu se desprindă de pereți (mm) */
  ramaFund: number;
  /** TRAFORAREA PEREȚILOR: golurile prin care iese vegetația. false = pereți plini. */
  traforPereti: boolean;
  formaGol: FormaGol;
  /** cât de mare e deschiderea utilă (mm) — 10-18, ca lichenul să iasă prin ea */
  deschidere: number;
  /** cât material rămâne între două goluri (mm) */
  nervura: number;
  /** banda plină de la fund în sus (mm) — acolo se concentrează efortul și acolo stă apa */
  bandaJos: number;
  /** buza plină de la gură în jos (mm) — ține forma acolo unde peretele se deschide */
  buzaSus: number;
}

/** unde și cum s-a putut agăța cutia */
export interface DiagnosticAgatare {
  tip: TipAgatare;
  /** pozițiile găsite; gol = sistemul nu încape nicăieri cu perete întreg */
  pozitii: Pt[];
  adancime: number;
  /** cu câte grade va sta cutia strâmb pe perete (0 la două puncte simetrice) */
  inclinare: number;
  /** cât de sus urcă plasturele de armare, măsurat de la spatele cutiei (mm) */
  inaltimePlasture: number;
  /** cât material rămâne peste locaș (mm) */
  materialPesteLocas: number;
  /** adâncimea nivelului de TIJĂ, cel de lângă perete — buza care reține capul (mm) */
  standoff: number;
  /**
   * Când sistemul NU a încăput: înălțimea de literă de la care ar încăpea (mm), 0 dacă nici la
   * maximul panoului. Se calculează doar în cazul ăsta — vezi `inaltimeMinimaAgatare`.
   */
  inaltimeMinMM: number;
}

export interface CutiiDiagnostics {
  /** lățime × înălțime, în mm */
  dimLitera: [number, number];
  /** înălțimea totală a piesei = fund + adâncime (mm) */
  inaltimeTotala: number;
  /** aria siluetei (mm²) */
  ariaPlinaMM2: number;
  /** aria cavității săpate (mm²) */
  ariaCavitateMM2: number;
  /** aria străpunsă prin FUND (mm²); 0 = fund plin */
  ariaGolFundMM2: number;
  /** TRAFORAREA PEREȚILOR: câte rânduri au încăput, câte goluri pe rând, cât s-a scos */
  trafor: {
    randuri: number;
    peRand: number;
    /** banda utilă rămasă între talpa plină și buză (mm) */
    bandaMM: number;
    /** volumul scos din pereți (mm³) */
    volumMM3: number;
    /**
     * Cea mai îngustă bucată de material rămasă la mijlocul unui rând (mm) — nervura REALĂ.
     * 0 = nu s-a putut măsura (niciun rând).
     */
    nervuraMinMM: number;
  };
  /** goluri de fund sub FANTA_MIN, umplute la loc */
  goluriFundMici: number;
  /**
   * Fundul e ÎNCHIS, deci cutia ține apă. Fals de îndată ce fundul are model — și atunci
   * buretele floral ud nu se mai poate pune direct.
   */
  fundEtans: boolean;
  /** camerele cutiei, în ordinea descrescătoare a volumului */
  camere: Camera[];
  /** câte camere se pot chiar umple */
  camereUtile: number;
  /** VOLUMUL UTIL, în mililitri — numărul de vânzare. Doar camerele utilizabile, minus plasturele. */
  volumUtilML: number;
  /** cât din volum mănâncă plasturele de armare al agățării (ml) */
  volumPlasturML: number;
  agatare: DiagnosticAgatare;
  /** volumul camerelor prea înguste ca să se poată umple (ml) */
  volumPierdutML: number;
  /** fante sub FANTA_MIN, umplute la loc: nu s-ar fi printat a gol */
  fanteUmplute: number;
  /** retragerea a golit tot interiorul: iese un bloc plin, nu o cutie */
  interiorGol: boolean;
  /** ce e de schimbat ca să rămână interior. null cât timp cutia e în regulă. */
  reparatie: Reparatie | null;
  /** materialul piesei (cm³) */
  materialCM3: number;
  /** CONECTIVITATE — verificarea centrală: NU genus, care crește cu fiecare cameră */
  bucati: number;
  /** câte bucăți are litera în SINE („A" 1, „i" 2): referința pentru `bucati` */
  bucatiLitera: number;
  /**
   * ETANȘEITATE, ca verificare de volum: solidul măsurat față de cel calculat din arii.
   * Fundul e plin, deci cutia trebuie să fie închisă — buretele floral e ud.
   */
  etanseitate: { volumMasuratMM3: number; volumAsteptatMM3: number; abatere: number };
  /** material sub pragul printabil, măsurat pe INELUL de perete (secțiunea reală la print) */
  trasaturi: DiagnosticTrasaturi;
  /** caractere cerute pentru care fontul nu produce geometrie */
  glifeLipsa: string[];
  triunghiuri: number;
  /** timpi pe etape (ms): optimizarea pleacă de la măsurătoare, nu de la bănuială */
  timpi: { font: number; interior: number; extrudare: number; verificari: number };
}

export interface CutiiResult {
  corpCutie: any;
  diagnostice: CutiiDiagnostics;
  ms: number;
}

/**
 * Câte bucăți neconectate are o siluetă (sau un solid).
 * `decompose` întoarce obiecte noi în heap-ul WASM; se eliberează pe loc, altfel o buclă de
 * mii de construcții (testul) termină heap-ul înainte să apuce GC-ul JS să ruleze.
 */
function bucatiDin(cs: any): number {
  const p = cs.decompose();
  const n = p.length;
  for (const x of p) x.delete();
  return n;
}

/** aria comună a două secțiuni, cu temporarul eliberat pe loc */
function arieComuna(a: any, b: any): number {
  const x = a.intersect(b);
  const s = x.area();
  x.delete();
  return s;
}


/**
 * CELE DOUĂ CONTURURI ALE UNUI LOCAȘ DE AGĂȚARE — nivelul tijei și nivelul capului.
 *
 * Prima versiune tăia UN SINGUR contur, la o singură adâncime, și era greșită din principiu:
 * fanta avea lățimea tijei la ORICE adâncime, deci capul șurubului intra în cercul mare și nu
 * mai putea gliza nicăieri. Cutia se punea pe șurub și cădea înapoi. Văzut pe piesa randată.
 *
 * Un locaș de agățare care chiar ține e un CANAL ÎN T:
 *
 *   z ∈ [0, STANDOFF_TIJA]        lângă perete: trece doar TIJA (fantă îngustă) plus cercul
 *                                 mare de intrare. Materialul de aici e BUZA care reține capul.
 *   z ∈ [STANDOFF_TIJA, adâncime] mai adânc: camera în care CĂLĂTOREȘTE CAPUL, lată cât el.
 *
 * La „cheie" camera e aceeași gaură de cheie, dar cu fanta lată cât capul — `conturCheie` o dă
 * direct, dacă i se cere aceeași rază și pentru tijă. La „grila", capul se sprijină pe muchia cu
 * șei, deci jumătatea lui de sus ajunge DEASUPRA canalului: camera se prelungește în sus cu o
 * rază de cap. Fără prelungirea aia, capul se izbea de materialul de peste canal — al doilea
 * capăt al aceluiași defect.
 */
function formeAgatare(cfg: CutiiConfig): { tija: Ring[]; cap: Ring[] } | null {
  const rCap = (cfg.surubCap + JOC_AGATARE) / 2;
  const rTija = (cfg.surubTija + JOC_AGATARE) / 2;
  if (cfg.tipAgatare === 'cheie') {
    return {
      tija: conturCheie(rCap, rTija, cfg.surubCap),
      // aceeași formă, cu fanta lată cât capul: exact drumul pe care el trebuie să gliseze
      cap: conturCheie(rCap, rCap, cfg.surubCap),
    };
  }
  if (cfg.tipAgatare === 'grila') {
    const l = cfg.latimeGrila, h = CANAL_GRILA;
    return {
      tija: conturGrila(l, h, 2, 6),
      // dreptunghi simplu, prelungit în sus cu o rază de cap: șeile rețin TIJA, la nivelul de
      // sus; aici capul are voie să se plimbe
      cap: [[[-l / 2, -h - rCap], [l / 2, -h - rCap], [l / 2, 0], [-l / 2, 0]]],
    };
  }
  return null;
}

/** înălțimea canalului agățătoarei cu dinți (mm) */
const CANAL_GRILA = 8;

/** un strat de goluri: forma 2D (deja limitată la perete) și banda de înălțime pe care se taie */
interface StratGoluri { forma2D: any; z0: number; z1: number; }

/**
 * Profilul unui gol pe înălțime: câte felii și cât de lată e fiecare, ca fracțiune din
 * deschidere. Extrudarea dă prisme, deci o formă care se îngustează se obține din felii —
 * la 14 mm deschidere și 6 felii, treapta e de 2.3 mm, adică sub ce se vede printre fire de
 * lichen. Dreptunghiul n-are nevoie de felii, deci nu le plătește.
 */
function profilGol(forma: FormaGol): number[] {
  if (forma === 'dreptunghi') return [1];
  const n = 6;
  return Array.from({ length: n }, (_, i) => {
    const t = (i + 0.5) / n;
    // hexagon cu vârfurile la stânga și la dreapta: lățimea urcă liniar la mijloc și coboară
    return forma === 'hexagon' ? (t < 0.5 ? 0.5 + t : 0.5 + (1 - t))
      : Math.sqrt(Math.max(0, 1 - (2 * t - 1) ** 2));
  });
}

/**
 * TRAFORAREA PEREȚILOR — golurile mari prin care iese vegetația.
 *
 * NU e un tipar aplicat pe o suprafață, și nu poate fi: peretele urmează conturul literei, iar
 * un fagure adevărat pe el ar cere desfășurarea suprafeței și reînfășurarea modelului. În
 * schimb, golurile se așază MERGÂND PE CONTUR: se parcurge marginea cavității din pas în pas
 * de arc, iar în fiecare punct se pune un tăietor dreptunghiular orientat după tangentă, care
 * traversează peretele pe direcția normalei.
 *
 * DOUĂ DECIZII care fac diferența dintre o traforare și o literă găurită:
 *
 * 1. Tăietorii se intersectează cu INELUL DE PERETE, nu se aplică pe siluetă. Acolo unde
 *    trăsătura literei e prea îngustă ca să aibă interior, nu există perete — și atunci nu se
 *    taie nimic, în loc să se găurească material plin.
 * 2. Pasul se recalculează pe fiecare contur ca să se ÎNCHIDĂ exact: `perimetru / n`, nu pasul
 *    cerut. Altfel ultimul gol s-ar suprapune peste primul și ar rămâne o nervură de nimic
 *    exact acolo unde conturul se închide.
 *
 * Rândurile alternante se decalează cu o jumătate de pas, ca la un fagure — la două rânduri
 * (cât intră la 60 mm adâncime) asta e tot ce se poate citi din „fagure" pe un perete.
 */
function goluriPerete(CrossSection: any, cavitate: any, inelStrict: any, cfg: CutiiConfig,
  zJos: number): { straturi: StratGoluri[]; randuri: number; peRand: number } {
  /**
   * Masca de perete, LĂRGITĂ cu o zecime de milimetru.
   *
   * Nu e neglijență, e chiar reparația unui defect măsurat: intersectat exact cu inelul,
   * tăietorul capătă fețe laterale COPLANARE cu pereții cutiei, iar scăderea lasă cochilii
   * degenerate. La „O" ieșeau 10 bucăți, toate de volum ZERO, iar verificarea de conectivitate
   * le număra pe bună dreptate ca piese. Cu jocul de 0.1 mm tăietorul iese puțin în afara
   * peretelui — adică în gol, unde n-are ce tăia — și booleanul rămâne curat.
   */
  const inel = inelStrict.offset(0.1, 'Round');
  const banda = cfg.adancime - cfg.bandaJos - cfg.buzaSus;
  const pasZ = cfg.deschidere + cfg.nervura;
  const randuri = Math.floor((banda + cfg.nervura) / pasZ);
  if (randuri < 1) { inel.delete(); return { straturi: [], randuri: 0, peRand: 0 }; }
  // rândurile se distribuie egal în bandă: spațiile de sus, de jos și dintre ele sunt aceleași
  const gol = Math.min(cfg.deschidere, banda / randuri - cfg.nervura);
  const spatiu = (banda - randuri * gol) / (randuri + 1);

  // conturul pe care se merge: marginea cavității. Fiecare inel se parcurge separat, fiindcă
  // „A" are unul singur, dar „B" are trei, cu perimetre diferite.
  const contururi = (cavitate.toPolygons() as Ring[]).filter((r) => r.length >= 3);
  const profil = profilGol(cfg.formaGol);
  const straturi: StratGoluri[] = [];
  let peRand = 0;

  for (let k = 0; k < randuri; k++) {
    const z0Rand = zJos + spatiu * (k + 1) + gol * k;
    const decalaj = k % 2 ? 0.5 : 0;
    for (let f = 0; f < profil.length; f++) {
      const latimeF = cfg.deschidere * profil[f];
      const inele: Ring[] = [];
      for (const contur of contururi) {
        // lungimea cumulată, ca să se poată merge pe arc și nu pe vârfuri
        const n = contur.length;
        const lung: number[] = [0];
        for (let i = 0; i < n; i++) {
          const a = contur[i], b = contur[(i + 1) % n];
          lung.push(lung[i] + Math.hypot(b[0] - a[0], b[1] - a[1]));
        }
        const L = lung[n];
        const cate = Math.floor(L / (cfg.deschidere + cfg.nervura));
        if (cate < 2) continue;                      // contur prea scurt pentru două goluri
        if (f === 0 && k === 0) peRand += cate;
        const pas = L / cate;                        // pasul REAL, ca desenul să se închidă
        const sens = arieRing(contur) >= 0 ? 1 : -1; // spre exteriorul cavității
        let seg = 0;
        for (let c = 0; c < cate; c++) {
          const s = (c + decalaj) * pas;
          while (seg < n - 1 && lung[seg + 1] < s) seg++;
          const a = contur[seg], b = contur[(seg + 1) % n];
          const dx = b[0] - a[0], dy = b[1] - a[1], dl = Math.hypot(dx, dy) || 1;
          const u = (s - lung[seg]) / dl;
          const px = a[0] + dx * u, py = a[1] + dy * u;
          const tx = dx / dl, ty = dy / dl;             // tangenta
          const nx = sens * ty, ny = -sens * tx;        // normala spre exteriorul cavității
          // dreptunghi orientat: ±lățime/2 pe tangentă, de la −1 la perete+2 pe normală.
          // Depășirea nu strică nimic — intersecția cu inelul o taie oricum la perete.
          const h = latimeF / 2, i0 = -1, i1 = cfg.grosimePerete + 2;
          inele.push([
            [px + tx * h + nx * i0, py + ty * h + ny * i0],
            [px - tx * h + nx * i0, py - ty * h + ny * i0],
            [px - tx * h + nx * i1, py - ty * h + ny * i1],
            [px + tx * h + nx * i1, py + ty * h + ny * i1],
          ]);
        }
      }
      if (!inele.length) continue;
      const brut = new CrossSection(inele, 'Positive');
      /**
       * ÎNCHIDERE MORFOLOGICĂ pe tăietori, înainte de a-i limita la perete.
       *
       * Pasul nu garantează nervura, și diferența nu e mică: la un COLȚ al conturului doi
       * tăietori vecini sunt rotiți unul față de altul, se depărtează spre exteriorul peretelui
       * și se APROPIE spre interior. Măsurat pe „A" la parametrii impliciți, cea mai îngustă
       * nervură ieșea 0.46 mm — un fir care se rupe în mână, exact pe piesa care se ține plină
       * cu material umed.
       *
       * Dilatarea urmată de retragere cu nervura/2 contopește golurile despărțite de mai puțin
       * decât nervura, în loc să lase firul între ele. Un gol ceva mai lung e o piesă bună; o
       * nervură de o zecime nu e. Se face pe tăietorii BRUȚI: după limitarea la perete, aceeași
       * operație ar putea sări peste grosimea peretelui și ar uni goluri de pe fețe opuse.
       */
      const raza = cfg.nervura / 2;
      const umflat = brut.offset(raza, 'Round');
      const inchis = umflat.offset(-raza, 'Round');
      umflat.delete(); brut.delete();
      // AICI se decide că e traforare, nu găurire: numai ce cade pe perete
      let forma2D = inchis.intersect(inel);
      inchis.delete();
      if (forma2D.area() <= 1e-6) { forma2D.delete(); continue; }

      /**
       * CIOTURILE DE LA CAPĂTUL PEREȚILOR se scot cu totul.
       *
       * Închiderea de mai sus rezolvă nervura dintre două goluri, dar nu și cazul în care golul
       * cade lângă locul unde peretele SE TERMINĂ — vârful piciorului lui „A", terminația unei
       * serife. Acolo rămâne un ciot prins de nimic important. Măsurat, la „A" implicit: o
       * bucată de 0.9 × 2.5 mm în colțul din stânga jos.
       *
       * Nu se pot găsi cu detectorul de material subțire: peretele ARE 2.5 mm, deci un prag de
       * 2.5 l-ar declara subțire peste tot. Se caută pe COMPONENTE — la înălțimea unui rând,
       * fiecare nervură e o componentă separată, iar aria ei e lățime × grosimea peretelui.
       * Ce iese sub `nervura × perete` e ciot, și se adaugă la tăietor: un gol ceva mai lung e
       * o piesă bună, un fir de o zecime nu e.
       */
      const ramas = inelStrict.subtract(forma2D);
      const bucati = ramas.decompose();
      const cioturi = bucati.filter((c: any) => c.area() < cfg.nervura * cfg.grosimePerete);
      if (cioturi.length) {
        const deScos = CrossSection.compose(cioturi);
        // ciotul se ia cu 0.1 mm în plus, din același motiv pentru care masca de perete e
        // lărgită: pus exact pe cotă, marginea lui ar coincide cu fața peretelui și ar lăsa
        // fețe coplanare. Măsurat: apăreau componente de arie ZERO în secțiune, adică taman
        // zgomotul care ar fi făcut inutilă verificarea de nervură.
        const larg = deScos.offset(0.1, 'Round');
        const cu = forma2D.add(larg);
        larg.delete(); deScos.delete(); forma2D.delete();
        forma2D = cu;
      }
      for (const c of bucati) c.delete();
      ramas.delete();
      const z0 = z0Rand + (gol * f) / profil.length;
      // Feliile se SUPRAPUN cu o sutime, nu se ating: două felii lipite exact ar avea fețe
      // coplanare, iar reuniunea lor lasă cochilii degenerate. Măsurat: la „O" ieșeau 6 bucăți
      // de volum ZERO, fix la înălțimile dintre felii, iar verificarea de conectivitate le
      // număra pe bună dreptate ca piese.
      straturi.push({ forma2D, z0, z1: z0 + gol / profil.length + (f < profil.length - 1 ? 0.02 : 0) });
    }
  }
  inel.delete();
  return { straturi, randuri, peRand };
}

/**
 * De la ce înălțime de literă ar încăpea sistemul de agățare (mm). 0 = nici la maximul panoului.
 *
 * Se caută pe SILUETA SCALATĂ, nu pe conturul micșorat, și diferența nu e cosmetică: plasturele
 * din jurul locașului are 1.5 mm ABSOLUT și nu se scalează cu litera. Micșorând conturul aș fi
 * micșorat și plasturele, deci aș fi răspuns la altă întrebare. Scalarea siluetei e exact
 * echivalentă cu generarea literei la altă înălțime, și costă o operație 2D în loc de un
 * textSolid întreg per probă.
 *
 * DOUĂ CAPCANE, amândouă găsite de test pe cazuri reale, niciuna presupusă:
 *
 * 1. CĂUTAREA DE POZIȚIE NU E MONOTONĂ ÎN MĂRIMEA LITEREI. `pozitieAgatare` e o SCANARE
 *    DISCRETĂ (din 3 în 3 mm pe verticală, din 2 în 2 lateral), cu pași ABSOLUȚI; scalând
 *    silueta, aceleași poziții cad altundeva față de formă, iar un loc găsit la un factor poate
 *    fi ratat la unul mai mare. Prima versiune bisecta și rotunjea în sus, presupunând
 *    monotonie — au picat 12 combinații (Cinzel „N" „Y" „Z" „9", Cormorant „N" „Q" „S" „X" „Z",
 *    Playfair „G" „X" „Y").
 * 2. SILUETA SCALATĂ NU E LITERA REGENERATĂ. Aplatizarea conturului lucrează la o toleranță
 *    ABSOLUTĂ de 0.05 mm, deci o literă generată mai mare iese cu alte vârfuri, nu cu aceleași
 *    înmulțite. Diferența e sub o zecime de milimetru, dar verificarea de încăpere e exactă
 *    (arie ieșită ≤ 1e-6), deci o poziție la limită se schimbă. După reparația de la punctul 1
 *    mai rămăseseră două eșecuri exact din motivul ăsta (Cormorant „Q", Playfair „G").
 *
 * Deci: bisecția pe silueta scalată dă doar un PUNCT DE PLECARE ieftin, iar răspunsul se
 * VERIFICĂ regenerând litera la înălțimile candidate, exact cum o va face aplicația. Valoarea
 * întoarsă nu e neapărat cea mai mică posibilă — dar e una care chiar funcționează, și asta e
 * tot ce promite mesajul.
 *
 * Ca și reparația de interior, se cheamă LENEȘ — doar când sistemul chiar n-a încăput.
 */
function inaltimeMinimaAgatare(CrossSection: any, sil: any, forma: Ring[], cm: Pt, h: number,
  siluetaLa: (inaltime: number) => any): number {
  // proba IEFTINĂ, pe silueta scalată: bună ca să nimerim zona, nu ca să dăm răspunsul
  const cam = (k: number) => {
    const s = sil.scale([k, k]);
    const poz = pozitieAgatare(CrossSection, s, forma, cm[0] * k, cm[1] * k);
    s.delete();
    return poz.length > 0;
  };
  // proba ADEVĂRATĂ, pe litera regenerată — exact ce va construi aplicația
  const chiar = (inaltime: number) => {
    const s = siluetaLa(inaltime);
    const c = centroid(s);
    const poz = pozitieAgatare(CrossSection, s, forma, c[0], c[1]);
    s.delete();
    return poz.length > 0;
  };
  const kMax = INALTIME_MAX / h;
  if (kMax <= 1 || !cam(kMax)) return 0;
  let jos = 1, sus = kMax;
  for (let i = 0; i < 6; i++) { const m = (jos + sus) / 2; if (cam(m)) sus = m; else jos = m; }
  for (let hh = Math.ceil((h * sus) / INALTIME_PAS) * INALTIME_PAS; hh <= INALTIME_MAX; hh += INALTIME_PAS) {
    if (chiar(hh)) return hh;
  }
  return 0;
}

/** verdictul unui font la o literă și o configurație date */
export interface VerdictFont {
  /** iese cutie cu cameră utilizabilă */
  ok: boolean;
  /** cea mai groasă trăsătură a literei în fontul ăsta (mm) */
  trasaturaMaxMM: number;
  /** cât e nevoie: 2 pereți + o cameră (mm) */
  necesarMM: number;
  /** înălțimea de literă de la care ar merge (mm); 0 = nici la maximul panoului */
  inaltimeMinMM: number;
}

/**
 * Merge fontul ăsta la litera și configurația curente?
 *
 * FILTRAREA FONTURILOR SE FACE MĂSURAT, nu prin listă scrisă de mână — și nu din purism: o
 * listă fixă ar minți în ambele sensuri. Un font subțire respins la 120 mm devine perfect
 * utilizabil la 200; unul gros acceptat la 120 nu mai are interior dacă cineva îngroașă
 * peretele la 6 mm. Condiția reală e una singură și se poate calcula:
 *
 *     cea mai groasă trăsătură ≥ 2 × perete + o cameră utilizabilă
 *
 * Aceeași măsurătoare (raza cercului maxim înscris) care dă reparația din bara de stare, deci
 * cele două nu se pot contrazice — sunt literalmente aceeași funcție.
 *
 * COSTĂ un textSolid și o căutare binară per font, deci se cheamă din afara buclei de
 * reconstrucție (vezi evaluarea în fundal din main.ts), nu la fiecare mișcare de cursor.
 */
export function evalueazaFont(font: any, litera: string, inaltimeLitera: number,
  grosimePerete: number): VerdictFont {
  if (!MOD) throw new Error(t('geometry.manifoldNeconfigurat', { functie: 'evalueazaFont' }));
  const bruta = textSolid(font, litera, inaltimeLitera, 1);
  const sil = bruta.project();
  bruta.delete();
  const r = razaInscrisaMaxima(sil);
  sil.delete();
  const camRaza = CAMERA_LATIME_MIN / 2;
  const necesar = 2 * grosimePerete + CAMERA_LATIME_MIN;
  const inaltimeMin = r > 1e-6
    ? Math.ceil((inaltimeLitera * (grosimePerete + camRaza) * MARJA_REPARATIE) / r / INALTIME_PAS) * INALTIME_PAS
    : Infinity;
  return {
    ok: 2 * r >= necesar,
    trasaturaMaxMM: +(2 * r).toFixed(1),
    necesarMM: +necesar.toFixed(1),
    inaltimeMinMM: Number.isFinite(inaltimeMin) && inaltimeMin <= INALTIME_MAX ? inaltimeMin : 0,
  };
}

/**
 * Corpul pregătit de PRINT.
 *
 * Fonturile vin cu y în jos; fără oglindire piesa ar ieși în oglindă față de ce s-a văzut pe
 * ecran — defectul care a scăpat o dată la aplicația de litere și s-a văzut abia pe placă.
 * Viewport-ul aplică el însuși aceeași oglindire (vezi manifoldToGeometry), deci cele două
 * rămân ACELAȘI obiect fizic.
 *
 * Cutia se extrudează pe +Z cu fundul la Z=0, deci pleacă la print exact cum trebuie: fundul
 * pe placă, gura în sus, fără suporți. Nicio rotație de aici.
 *
 * Stă în modulul de geometrie, nu în interfață: așa poate fi verificat în test, unde nu
 * există three.js.
 */
export function pentruPrint(corp: any): any {
  return corp.mirror([0, 1, 0]);
}

export function buildCutie(cfg: CutiiConfig): CutiiResult {
  if (!MOD) throw new Error(t('geometry.manifoldNeconfigurat', { functie: 'buildCutie' }));
  const { Manifold, CrossSection } = MOD;
  const t0 = performance.now();

  // ---- silueta literei, centrată pe origine ----
  //
  // Ca funcție de înălțime, nu ca valoare: reparațiile au nevoie să REGENEREZE litera la altă
  // mărime, iar o siluetă scalată nu e același lucru (aplatizarea conturului are toleranță
  // absolută, deci o literă mai mare iese cu alte vârfuri).
  const rep: Partial<SolidReport> = {};
  const siluetaLa = (inaltime: number, raport?: Partial<SolidReport>): any => {
    const bruta = textSolid(cfg.font, cfg.litera, inaltime, cfg.adancime, raport);
    const s0 = bruta.project();
    bruta.delete();
    const b = s0.bounds();
    const s = s0.translate([-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2]);
    s0.delete();
    return s;
  };
  const sil = siluetaLa(cfg.inaltimeLitera, rep);
  const tFont = performance.now();

  const rb = sil.bounds();
  const latime = rb.max[0] - rb.min[0], inaltime = rb.max[1] - rb.min[1];
  const ariaSil = sil.area();

  // ---- INTERIORUL ----
  // Ce rămâne după ce se ia peretele de pe contur. La „I", la fonturile subțiri sau la pereți
  // groși poate ieși GOL sau rupt în fante — și atunci omul ar primi un bloc plin fără să
  // înțeleagă de ce. De aceea rezultatul se măsoară, nu se presupune.
  //
  // Măsurătoarea și clasificarea stau în nucleu (core/geometry/cutie.ts), fiindcă le folosește
  // și Litere LED. PRAGURILE rămân ale aplicației: „sub 6 mm nu se poate umple cu lichen" e o
  // decizie de produs de aici, nu una geometrică.
  const cav = cavitateCutie(CrossSection, sil, { grosimePerete: cfg.grosimePerete,
    adancime: cfg.adancime, latimeCameraMin: CAMERA_LATIME_MIN, fantaMin: FANTA_MIN });
  const { cavitate, camere, fanteUmplute, interiorGol, interior } = cav;
  const tInterior = performance.now();

  // ---- AGĂȚAREA PE PERETE ----
  //
  // Locașul se sapă în SPATELE cutiei (z=0), adică în fața exterioară a fundului — cea care stă
  // pe perete. Fundul are însă 2 mm, iar un locaș de 4 mm ar străpunge direct în cavitate.
  //
  // Reparația NU e o îngroșare pe spate: aia ar depărta cutia de perete și s-ar vedea. E un
  // PLASTURE PE INTERIOR — o pastilă ridicată din fundul cutiei, ascunsă sub vegetație. Spatele
  // rămâne perfect plat, iar peste locaș rămân MATERIAL_PESTE_LOCAS milimetri de material.
  const cmSil = centroid(sil);
  const forme = formeAgatare(cfg);
  // ADÂNCIMEA NU E PARAMETRU, se CALCULEAZĂ: în locaș intră tija pe standoff plus capul pe
  // înălțimea lui. Un parametru liber ar fi permis exact configurația în care capul nu încape —
  // aceeași lecție ca la capacul de la Litere Fagure.
  const adancimeCeruta = STANDOFF_TIJA + cfg.inaltimeCapSurub + 0.3;
  const adancimeAgatare = Math.max(STANDOFF_TIJA + 1, Math.min(adancimeCeruta,
    cfg.grosimeFund + cfg.adancime - MATERIAL_PESTE_LOCAS - 1));
  const inaltimePlasture = Math.max(cfg.grosimeFund, adancimeAgatare + MATERIAL_PESTE_LOCAS);
  // POZIȚIA se caută pe conturul CEL MAI MARE — camera capului. Pe cel al tijei ar fi încăput
  // și acolo unde camera nu are loc, iar locașul ar fi ieșit prin marginea literei.
  const pozitiiAgatare = forme
    ? pozitieAgatare(CrossSection, sil, forme.cap, cmSil[0], cmSil[1]) : [];

  let plasture: any = null, taieturaTija: any = null, taieturaCap: any = null;
  if (forme && pozitiiAgatare.length) {
    const cTija = new CrossSection(forme.tija, 'Positive');
    const cCap = new CrossSection(forme.cap, 'Positive');
    const dilatat = cCap.offset(PERETE_GAURA, 'Round');
    for (const p of pozitiiAgatare) {
      const a = cTija.translate(p), b = cCap.translate(p), pl = dilatat.translate(p);
      // la două puncte simetrice piesele se pot suprapune, deci se REUNESC, nu se însumează
      if (taieturaTija) { const u = taieturaTija.add(a); taieturaTija.delete(); a.delete(); taieturaTija = u; } else taieturaTija = a;
      if (taieturaCap) { const u = taieturaCap.add(b); taieturaCap.delete(); b.delete(); taieturaCap = u; } else taieturaCap = b;
      if (plasture) { const u = plasture.add(pl); plasture.delete(); pl.delete(); plasture = u; } else plasture = pl;
    }
    cTija.delete(); cCap.delete(); dilatat.delete();
  }

  // ---- MODELUL DE PE FUND ----
  //
  // Fundul e o suprafață PLANĂ, deci aici tiparele nucleului se aplică direct, exact ca la
  // Litere Fagure. (Pe pereți e altă problemă — vezi pasul următor din plan.)
  //
  // Golurile se generează doar în cavitate, retrasă cu rama: așa fundul rămâne prins de pereți
  // pe tot conturul, iar cutter-ul nu poate ciupi din talpa peretelui nici cu depășirea de
  // 0.2 mm, fiindcă acolo, peste fund, nu mai e material.
  let golFund: any = null;
  let goluriFundMici = 0;
  if (cfg.modelFund !== 'fara' && cavitate) {
    const zona = cfg.ramaFund > 0 ? cavitate.offset(-cfg.ramaFund, 'Round') : cavitate;
    if (zona.area() > 1e-6) {
      const zb = zona.bounds();
      const model2D = tipar(CrossSection,
        { model: cfg.modelFund, pas: cfg.pasFund, grosimePerete: cfg.pereteFund, unghi: cfg.unghiFund, varianta: cfg.variantaFund },
        intindere(zb.max[0] - zb.min[0], zb.max[1] - zb.min[1], cfg.unghiFund, cfg.pasFund + cfg.pereteFund));
      // tiparul se generează centrat pe origine, iar silueta e deja centrată — se scade direct
      const brut = zona.subtract(model2D);
      model2D.delete();
      // plasturele de agățare ASTUPĂ modelul local: altfel gaura de cheie ar cădea între celule
      const fara = plasture ? brut.subtract(plasture) : brut;
      if (fara !== brut) brut.delete();
      // golurile prea mici se umplu la loc, ca la cavitate: sub prag nu ies găuri, ies pete
      const comp = fara.decompose();
      const bune = comp.filter((c: any) => {
        const e = c.offset(-FANTA_MIN / 2, 'Round');
        const ok = e.area() > 1e-9;
        e.delete();
        return ok;
      });
      goluriFundMici = comp.length - bune.length;
      golFund = goluriFundMici === 0 ? fara : (bune.length ? CrossSection.compose(bune) : null);
      for (const c of comp) c.delete();
      if (golFund !== fara) fara.delete();
    }
    if (zona !== cavitate) zona.delete();
  }

  // inelul de perete — secțiunea reală a piesei la orice înălțime peste fund. Se calculează
  // aici, înainte de traforare, fiindcă golurile din pereți se taie CHIAR din el.
  const inel = cavitate ? sil.subtract(cavitate) : sil;

  // ---- TRAFORAREA PEREȚILOR ----
  // Banda plină de jos începe deasupra plasturelui de agățare: dacă plasturele ar urca în zona
  // golurilor, primul rând l-ar tăia exact acolo unde ține tot.
  const bandaJosEfectiva = Math.max(cfg.bandaJos, inaltimePlasture - cfg.grosimeFund);
  const trafor = cfg.traforPereti && cavitate
    ? goluriPerete(CrossSection, cavitate, inel, { ...cfg, bandaJos: bandaJosEfectiva },
      cfg.grosimeFund + bandaJosEfectiva)
    : { straturi: [] as StratGoluri[], randuri: 0, peRand: 0 };
  const straturiPerete = trafor.straturi;

  // ---- CUTIA ----
  // bloc plin, minus cavitatea, ridicată cu grosimea fundului — din nucleu, ca la LED
  let corpCutie = construiesteCutie(Manifold, sil, cavitate, cfg.grosimeFund, cfg.adancime);
  if (golFund) {
    // străpunge fundul, de la spate până în cavitate; iese 0.2 mm de fiecare parte
    const cutter = Manifold.extrude(golFund, cfg.grosimeFund + 0.4).translate([0, 0, -0.2]);
    const gaurit = corpCutie.subtract(cutter);
    cutter.delete(); corpCutie.delete();
    corpCutie = gaurit;
  }
  if (plasture) {
    const pad = Manifold.extrude(plasture, inaltimePlasture);
    const cu = corpCutie.add(pad);
    pad.delete(); corpCutie.delete();
    corpCutie = cu;
  }
  if (taieturaTija && taieturaCap) {
    // CANALUL ÎN T, tăiat pe două niveluri:
    //   · fanta tijei, deschisă la spate (coboară 0.2 mm sub piesă, ca să nu lase fețe
    //     coplanare), oprită acolo unde începe camera capului;
    //   · camera capului, îngropată — nu atinge fața din spate, iar materialul rămas peste ea
    //     e chiar buza care reține capul.
    // Se suprapun cu o sutime de milimetru: lipite exact, ar avea fețe coplanare.
    const cTija = Manifold.extrude(taieturaTija, STANDOFF_TIJA + 0.21).translate([0, 0, -0.2]);
    const cCap = Manifold.extrude(taieturaCap, adancimeAgatare - STANDOFF_TIJA).translate([0, 0, STANDOFF_TIJA]);
    const cutter = cTija.add(cCap);
    cTija.delete(); cCap.delete();
    const gaurit = corpCutie.subtract(cutter);
    cutter.delete(); corpCutie.delete();
    corpCutie = gaurit;
  }
  /**
   * VOLUMUL ÎNAINTE DE TRAFORARE — reperul verificării de etanșeitate.
   *
   * Până aici toate piesele sunt prisme, deci volumul se poate calcula EXACT din arii, iar
   * comparația e o verificare adevărată. Tăietorii de trafor nu mai permit asta, și nu din
   * lene: ei ies intenționat 0.1 mm în afara peretelui (ca să nu lase fețe coplanare), iar
   * `arie × înălțime` ar număra și golul de dincolo de perete. Prima versiune făcea exact
   * greșeala asta și raporta „cutia NU iese etanșă, 1.99% abatere" pe o cutie perfect corectă.
   *
   * Așa că verificarea de volum se oprește aici, unde e exactă. Traforarea își are propriile
   * verificări, mai puternice decât un volum: banda și buza rămân întregi, golurile chiar
   * străpung, nervurile se măsoară pe secțiune, iar piesa rămâne dintr-o bucată.
   */
  const volumInainteTrafor = corpCutie.volume();
  let ariaGolPereti = 0;
  if (straturiPerete.length) {
    // toate feliile se REUNESC întâi și se scad O SINGURĂ dată: la 2 rânduri × 6 felii ar fi
    // fost douăsprezece scăderi din geometria cea mai scumpă a piesei
    let cutter: any = null;
    for (const s of straturiPerete) {
      ariaGolPereti += s.forma2D.area();
      const felie = Manifold.extrude(s.forma2D, s.z1 - s.z0).translate([0, 0, s.z0]);
      if (cutter) { const u = cutter.add(felie); cutter.delete(); felie.delete(); cutter = u; } else cutter = felie;
    }
    const gaurit = corpCutie.subtract(cutter);
    cutter.delete(); corpCutie.delete();
    corpCutie = gaurit;
  }
  // verificat, nu presupus: aici ar trece neobservată o geometrie invalidă, până la slicer
  const status = String(corpCutie.status());
  if (status !== 'NoError') throw new Error(t('cutii.geometrieInvalida', { status }));
  const tExtrudare = performance.now();

  // ---- VERIFICĂRI ----
  const camereUtile = camere.filter((c) => c.utila).length;
  const volumBrutML = camere.filter((c) => c.utila).reduce((s, c) => s + c.volumML, 0);
  const volumPierdutML = +camere.filter((c) => !c.utila).reduce((s, c) => s + c.volumML, 0).toFixed(1);
  // PLASTURELE MĂNÂNCĂ DIN VOLUM. Doar partea care iese peste fund și cade chiar în cavitate —
  // ce stă în perete nu ocupa oricum nimic. Se scade din volumul promis: altfel aplicația ar
  // vinde mililitri pe care îi ocupă chiar ea.
  const ariaPlasturInCavitate = plasture && cavitate ? arieComuna(plasture, cavitate) : 0;
  const volumPlasturML = +((ariaPlasturInCavitate * Math.max(0, inaltimePlasture - cfg.grosimeFund)) / 1000).toFixed(1);
  const volumUtilML = +Math.max(0, volumBrutML - volumPlasturML).toFixed(1);

  // ETANȘEITATE prin volum: un bloc de Gf+H din care s-a scos o prismă de H peste cavitate.
  // Dacă solidul măsurat nu dă asta, undeva s-a spart ceva — cutter ieșit prin fund, cavitate
  // scăpată peste contur, boolean prost. Cifra e independentă de geometria construită: vine
  // din arii, nu din mesh.
  //
  // Cu agățare, formula are încă doi termeni, amândoi exacți fiindcă toate piesele sunt prisme:
  // plasturele adaugă material DOAR unde cade în cavitate (în perete era deja plin), iar locașul
  // scoate exact aria conturului pe adâncimea lui.
  const ariaCavitate = cavitate ? cavitate.area() : 0;
  const ariaGolFund = golFund ? golFund.area() : 0;
  const volumMasurat = corpCutie.volume();
  // cât s-a scos efectiv din pereți: diferență MĂSURATĂ, nu însumare de arii
  const volumTrafor = volumInainteTrafor - volumMasurat;
  const volumAsteptat = cfg.grosimeFund * (ariaSil - ariaGolFund) + cfg.adancime * (ariaSil - ariaCavitate)
    + ariaPlasturInCavitate * Math.max(0, inaltimePlasture - cfg.grosimeFund)
    // locasul are DOUA niveluri, deci doi termeni: fanta tijei pe standoff, camera capului
    // pe restul adancimii
    - (taieturaTija ? taieturaTija.area() * STANDOFF_TIJA : 0)
    - (taieturaCap ? taieturaCap.area() * (adancimeAgatare - STANDOFF_TIJA) : 0);
  const abatere = Math.abs(volumInainteTrafor - volumAsteptat) / Math.max(volumAsteptat, 1e-9);

  // material subțire, măsurat pe INELUL de perete — secțiunea pe care o vede chiar slicer-ul
  // la orice înălțime peste fund. Pe siluetă ar fi ieșit aproape la fel (peretele e mai gros
  // decât litera nicăieri), dar „aproape" nu e o verificare.
  const trasaturi = trasaturiSubtiri(inel, TRASATURA_MIN);

  // NERVURA REALĂ, măsurată pe SOLID, cu o secțiune orizontală prin mijlocul unui rând.
  //
  // Prima versiune folosea detectorul de material subțire pe inelul rămas, și era greșită din
  // principiu: inelul ARE grosimea peretelui, 2.5 mm, deci detectorul de „sub 2.5 mm" îl găsea
  // subțire pe tot, la orice configurație. Nervura nu e o grosime de perete, e o lățime DE-A
  // LUNGUL conturului — iar la o secțiune orizontală fiecare nervură iese ca o componentă
  // separată, de arie lățime × grosimea peretelui. Deci se taie și se măsoară.
  //
  // Contează fiindcă pasul nu garantează nervura: pe conturul unei contra-forme (bucla lui „O",
  // triunghiul lui „A") tăietorii CONVERG spre exteriorul peretelui, iar nervura reală iese mai
  // mică decât diferența pas − deschidere.
  let nervuraMinMM = 0;
  if (straturiPerete.length) {
    // felia cea mai LATĂ, nu prima: la un gol hexagonal prima felie e cea îngustă de jos, iar
    // acolo nervura iese firesc mai groasă. Critică e secțiunea prin mijlocul golului.
    const s0 = straturiPerete.reduce((a, b) => (b.forma2D.area() > a.forma2D.area() ? b : a));
    const sect = corpCutie.slice((s0.z0 + s0.z1) / 2);
    const comp = sect.decompose();
    if (comp.length) {
      nervuraMinMM = +(Math.min(...comp.map((c: any) => c.area())) / cfg.grosimePerete).toFixed(2);
    }
    for (const c of comp) c.delete();
    sect.delete();
  }

  // reparația se calculează LENEȘ, doar când chiar nu iese cutie: căutarea binară costă
  const reparatie: Reparatie | null = camereUtile === 0 ? (() => {
    const r = razaInscrisaMaxima(sil);
    const camRaza = CAMERA_LATIME_MIN / 2;
    const peretMax = Math.max(0, r / MARJA_REPARATIE - camRaza);
    // Scalarea literei scalează și raza înscrisă, deci înălțimea minimă iese direct din raport.
    // Se rotunjește în sus la PASUL PANOULUI: o valoare pe care controlul nu o atinge din
    // săgeți nu e un sfat, e o ghicitoare.
    const inaltimeMin = r > 1e-6
      ? Math.ceil((cfg.inaltimeLitera * (cfg.grosimePerete + camRaza) * MARJA_REPARATIE) / r / INALTIME_PAS) * INALTIME_PAS
      : Infinity;
    return {
      trasaturaMaxMM: +(2 * r).toFixed(1),
      necesarMM: +(2 * cfg.grosimePerete + CAMERA_LATIME_MIN).toFixed(1),
      // rotunjit ÎN JOS, nu la cel mai apropiat: valoarea asta pleacă spre om ca sfat („subțiază
      // peretele la cel mult atât"), iar o rotunjire în sus l-ar trimite cu o zecime peste limită
      peretMaxMM: Math.floor(peretMax * 10) / 10,
      inaltimeMinMM: Number.isFinite(inaltimeMin) ? inaltimeMin : 0,
      potPerete: peretMax >= PERETE_MIN,
      potInaltime: inaltimeMin <= INALTIME_MAX,
    };
  })() : null;
  // a doua reparație leneșă: de la ce înălțime ar încăpea sistemul de agățare. Stă AICI, înainte
  // de cronometru, nu la asamblarea diagnosticelor — altfel costul ei (zeci de ms) ar cădea în
  // afara defalcării pe etape, iar bara de stare ar arăta 16 ms la o reconstrucție de 70.
  const inaltimeMinAgatare = forme && !pozitiiAgatare.length
    ? inaltimeMinimaAgatare(CrossSection, sil, forme.cap, cmSil, cfg.inaltimeLitera, siluetaLa) : 0;
  const tVerificari = performance.now();

  const diagnostice: CutiiDiagnostics = {
    dimLitera: [+latime.toFixed(1), +inaltime.toFixed(1)],
    inaltimeTotala: +(cfg.grosimeFund + cfg.adancime).toFixed(1),
    ariaPlinaMM2: +ariaSil.toFixed(1),
    ariaCavitateMM2: +ariaCavitate.toFixed(1),
    ariaGolFundMM2: +ariaGolFund.toFixed(1),
    goluriFundMici,
    fundEtans: ariaGolFund <= 1e-6,
    trafor: { randuri: trafor.randuri, peRand: trafor.peRand,
      bandaMM: +(cfg.adancime - bandaJosEfectiva - cfg.buzaSus).toFixed(1),
      volumMM3: +volumTrafor.toFixed(0), nervuraMinMM },
    camere,
    camereUtile,
    volumUtilML,
    volumPlasturML,
    agatare: { tip: cfg.tipAgatare, pozitii: pozitiiAgatare, adancime: +adancimeAgatare.toFixed(2),
      inclinare: inclinareAgatare(pozitiiAgatare, cmSil),
      inaltimePlasture: +inaltimePlasture.toFixed(2), materialPesteLocas: MATERIAL_PESTE_LOCAS,
      standoff: STANDOFF_TIJA,
      inaltimeMinMM: inaltimeMinAgatare },
    volumPierdutML,
    fanteUmplute,
    interiorGol,
    reparatie,
    materialCM3: +(volumMasurat / 1000).toFixed(1),
    bucati: bucatiDin(corpCutie),
    bucatiLitera: bucatiDin(sil),
    etanseitate: { volumMasuratMM3: +volumInainteTrafor.toFixed(0), volumAsteptatMM3: +volumAsteptat.toFixed(0),
      abatere: +abatere.toFixed(6) },
    trasaturi,
    glifeLipsa: rep.missingGlyphs ?? [],
    triunghiuri: corpCutie.numTri(),
    timpi: {
      font: +(tFont - t0).toFixed(1),
      interior: +(tInterior - tFont).toFixed(1),
      extrudare: +(tExtrudare - tInterior).toFixed(1),
      verificari: +(tVerificari - tExtrudare).toFixed(1),
    },
  };

  // temporarele trăiesc în heap-ul WASM și se eliberează abia la un GC al JS-ului. Într-o buclă
  // strânsă (testul face sute de construcții) GC-ul nu apucă să ruleze și heap-ul se termină.
  if (inel !== sil) inel.delete();
  if (cavitate && cavitate !== interior) cavitate.delete();
  interior.delete();
  plasture?.delete(); taieturaTija?.delete(); taieturaCap?.delete(); golFund?.delete();
  for (const s of straturiPerete) s.forma2D.delete();
  sil.delete();

  return { corpCutie, diagnostice, ms: performance.now() - t0 };
}
