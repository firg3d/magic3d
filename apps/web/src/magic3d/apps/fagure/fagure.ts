/**
 * APP LITERE FAGURE — geometria produsului.
 *
 * O literă în care INTERIORUL nu e material plin, ci un model străpuns. Ca să nu se rupă,
 * pe contur rămâne o ramă plină de care se prinde modelul:
 *
 *   sil      = silueta literei (proiecția solidului din font)
 *   interior = sil.offset(-W)                W = lățimea ramei
 *   ramă     = sil \ interior
 *   model    = tiparul 2D, generat pe tot dreptunghiul literei
 *   umplut   = model ∩ interior
 *   litera   = extrude(ramă ∪ umplut, G)
 *
 * Scris ca O SINGURĂ scădere, nu ca patru operații:
 *   ramă ∪ (model ∩ interior) = sil \ (interior \ model)
 * — același rezultat, două booleene în loc de patru, pe geometria cea mai scumpă din aplicație.
 *
 * Cele trei tipare (fagure hexagonal, grilă diagonală, triunghiular) diferă DOAR prin
 * poligoanele generate; restul lanțului e identic pentru toate.
 */
import { t } from '../../core/i18n/index.js';
import { configureManifold as configTextSolid, textSolid, type SolidReport } from '../../core/geometry/textSolid.js';
import { trasaturiSubtiri, TRASATURA_MIN, PATA_MAX, type DiagnosticTrasaturi } from '../../core/geometry/trasaturi.js';
import { laturiCerc, centroid, type Pt } from '../../core/geometry/forme2d.js';
import { pozitieAgatare, inclinareAgatare, conturCerc, conturCheie, conturGrila,
  PERETE_GAURA, JOC_CAPAC, STANDOFF_TIJA, type TipAgatare } from '../../core/geometry/agatare.js';
import { tipar, intindere, TIPARE, type Tipar } from '../../core/geometry/tipare.js';

// Măsurătoarea de material subțire, primitivele 2D, agățarea pe perete și motorul de tipare stau
// acum în nucleu: fiecare și-a găsit al doilea consumator (brelocuri, respectiv Cutii Litere).
// Se re-exportă ca importurile existente — panoul și testul — să rămână neatinse.
export { TRASATURA_MIN, PATA_MAX, PERETE_GAURA, JOC_CAPAC, STANDOFF_TIJA, TIPARE };
export type { DiagnosticTrasaturi, TipAgatare };

/** numele local al tiparului: aplicația l-a numit dintotdeauna „Model" */
export type Model = Tipar;

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
 * Sub ce arie o bucată desprinsă e AȘCHIE, nu piesă. Apar acolo unde modelul atinge rama
 * tangențial. Se elimină din geometrie — altfel ajung pe placă drept gunoi de un milimetru.
 * Același prag filtrează și GOLURILE prea mici: o gaură de sub 1 mm² nu se printează ca gaură,
 * iese o pată de material scămoșat.
 */
export const ASCHIE_MAX = 1;
/**
 * Sub ce unghi de înclinare literei i se spune că nu stă singură.
 *
 * O placă în picioare se răstoarnă în față/spate la unghiul atan((grosime/2) / înălțimeaCM) —
 * la 120 mm înălțime și 8 mm grosime asta înseamnă ~4°, adică o atingere. 6° e pragul de la
 * care litera suportă o masă înclinată și un curent de aer, fără să ceară postament.
 */
export const UNGHI_RASTURNARE_MIN = 6;
/**
 * Cât trebuie să atingă masa (mm²).
 *
 * CALIBRAT ÎN JOS, după ce cifrele au arătat că aria e un criteriu prost: pe un font cu
 * terminații rotunjite, „A" se sprijină pe DOUĂ picioare cu 140 mm² în total și pica pragul de
 * 150, în timp ce „O", care atinge masa aproape într-un punct, trecea cu 157. Aria nu deosebește
 * două picioare depărtate de un singur punct de sprijin — unghiurile o fac, și ele rămân
 * criteriul. Pragul stă acum jos, unde chiar prinde ceva: contact pe muchie de cuțit.
 */
export const SPRIJIN_MIN = 60;
/** cât de groasă e felia în care se măsoară contactul cu masa (mm) */
const FELIE_BAZA = 0.5;

export interface FagureConfig {
  litera: string;
  font: any;                 // font opentype deja parsat
  inaltimeLitera: number;    // mm, măsurat pe capHeight
  grosime: number;           // mm, grosimea plăcii
  model: Model;
  pasCelula: number;         // P — distanța dintre benzi/celule (mm)
  grosimePerete: number;     // T — grosimea peretelui modelului (mm)
  latimeRama: number;        // W — cât rămâne plin pe contur (mm)
  unghiModel: number;        // grade, rotația tiparului
  /** sămânța așezării aleatoare. Contează DOAR la voronoi; celelalte tipare o ignoră. */
  variantaModel: number;
  /** cât se retează din talpă ca să iasă plată (mm). 0 = litera rămâne întreagă. */
  taiereBaza: number;
  /** străpuns = golurile trec prin placă · gravat = scobituri pe față, umplute cu a doua culoare */
  modModel: 'strapuns' | 'gravat';
  /** cât de adânc se sapă modelul în modul gravat (mm) */
  adancimeGravare: number;
  /** cum se agață litera pe perete */
  tipAgatare: TipAgatare;
  /** Ø capului șurubului și Ø tijei (mm) — la „cheie" și la „gaura" */
  surubCap: number;
  surubTija: number;
  /** ÎNĂLȚIMEA capului șurubului (mm) — cât ocupă el din locaș, la „gaura" */
  inaltimeCapSurub: number;
  /** grosimea capacului (mm) */
  grosimeCapac: number;
  /** la „gaura": se generează și capacul care acoperă capul șurubului */
  capacel: boolean;
  /** lățimea agățătoarei cu dinți (mm) */
  latimeGrila: number;
  /**
   * Câți milimetri de la talpă în sus rămân PLINI, nestrăpunși (mm).
   *
   * Ăsta e răspunsul la „model mai des unde e nevoie de rezistență", și e altul decât cel din
   * plan (celule mai dese jos). Un gradient pe celule ar merge doar la tiparele cu celule —
   * la benzile diagonale o bandă traversează litera de jos până sus, deci n-are „o înălțime"
   * la care să i se schimbe grosimea. Talpa plină lucrează la toate nouă, pune materialul fix
   * unde se rupe piesa, și coboară centrul de masă, deci mărește și unghiul de răsturnare.
   */
  talpaPlina: number;
}

/**
 * STABILITATE — litera stă în picioare, deci trebuie să și rămână așa.
 *
 * O placă subțire nu cade fiindcă are prea puțin sprijin, ci fiindcă sprijinul e ÎNGUST pe
 * direcția grosimii: se răstoarnă peste muchia din față la un unghi de câteva grade. De asta
 * numărul care contează nu e aria (ca la aplicația de litere, unde piesele sunt groase), ci
 * unghiul — și se dă pe amândouă direcțiile, fiindcă lateral litera e de zeci de ori mai stabilă.
 */
export interface DiagnosticStabilitate {
  /** aria care chiar atinge masa (mm²) = lungimea de contact × grosime */
  ariaSprijinMM2: number;
  /** înălțimea centrului de masă deasupra tălpii (mm) */
  inaltimeCM: number;
  /** unghiul de răsturnare în față/spate — direcția slabă (grade) */
  unghiFataSpate: number;
  /** unghiul de răsturnare lateral (grade) */
  unghiLateral: number;
  staSingura: boolean;
}

export interface FagureDiagnostics {
  /** lățime × înălțime, în mm */
  dimLitera: [number, number];
  /** aria siluetei PLINE, înainte de străpungere (mm²) */
  ariaPlinaMM2: number;
  /** aria rămasă după străpungere (mm²); la gravat placa e întreagă, deci = aria plină */
  ariaFinalaMM2: number;
  /** aria acoperită de model (mm²) — la gravat, cât ia a doua culoare */
  ariaModelMM2: number;
  /** cât material s-a scos, ca fracțiune din litera plină (0..1) */
  economie: number;
  /** CONECTIVITATE — verificarea centrală a produsului */
  bucati: number;
  /** câte bucăți are litera în SINE („A" 1, „i" 2): referința pentru `bucati` */
  bucatiLitera: number;
  /** așchii eliminate: bucăți desprinse sub ASCHIE_MAX */
  aschii: number;
  ariaAschiiMM2: number;
  /** goluri prea mici ca să se printeze a gaură, umplute la loc */
  goluriMici: number;
  stabilitate: DiagnosticStabilitate;
  /** cât s-a retezat efectiv din talpă (mm) — 0 dacă nu s-a cerut */
  taiereBazaAplicata: number;
  /**
   * Agățarea pe perete: unde a încăput, sau null dacă nu are unde.
   * `inclinare` = cu câte grade va sta litera strâmb, dacă punctul de sprijin n-a putut fi
   * chiar pe verticala centrului de masă. Litera atârnată se rotește până centrul de masă
   * ajunge sub punctul de sprijin — unghiul e atan(abatere / distanța pe verticală).
   *
   * `grosimeCapac` = cât are capacul, `spatiuCap` = cât rămâne sub el pentru capul șurubului.
   * Al doilea e cel care se verifică: dacă e mai mic decât capul, capacul nu intră până la fund.
   */
  agatare: { tip: TipAgatare; pozitii: [number, number][]; adancime: number; inclinare: number;
    grosimeCapac: number; spatiuCap: number;
    /** adâncimea nivelului de TIJĂ, la locașurile din spate — buza care reține capul (mm).
     *  0 la „gaura", unde nu există canal în T. */
    standoff: number };
  /** rama a înghițit tot interiorul: nu s-a străpuns nimic (literă subțire sau ramă lată) */
  faraInterior: boolean;
  trasaturi: DiagnosticTrasaturi;
  /** caractere cerute pentru care fontul nu produce geometrie */
  glifeLipsa: string[];
  triunghiuri: number;
  /** timpi pe etape (ms): optimizarea pleacă de la măsurătoare, nu de la bănuială */
  timpi: { font: number; tipar: number; strapungere: number; extrudare: number };
}

export interface FagureResult {
  corpLitera: any;
  /** umplutura scobiturilor, în a doua culoare. null în modul străpuns. */
  corpModel: any | null;
  /** capacele care acoperă capul șurubului, ca PIESE SEPARATE. null dacă nu se cer. */
  corpCapac: any | null;
  diagnostice: FagureDiagnostics;
  ms: number;
}

// =====================================================================
// VERIFICĂRI
// =====================================================================


/**
 * Cât de sigur stă litera în picioare. Y-ul modelului crește în JOS, deci talpa e la y maxim.
 * Contactul se ia dintr-o felie subțire de la talpă, nu din amprenta întregii litere: „A" se
 * sprijină pe două picioare, nu pe tot triunghiul dintre ele.
 */
function stabilitate(CrossSection: any, sil: any, grosime: number): DiagnosticStabilitate {
  const b = sil.bounds();
  const yTalpa = b.max[1];
  const latime = b.max[0] - b.min[0] + 4;
  const felie = CrossSection.square([latime, FELIE_BAZA], true)
    .translate([(b.min[0] + b.max[0]) / 2, yTalpa - FELIE_BAZA / 2]);
  const contact = sil.intersect(felie);
  felie.delete();
  const lungimeContact = contact.area() / FELIE_BAZA;
  const cb = contact.bounds();
  const [cx, cy] = centroid(sil);
  contact.delete();

  const h = Math.max(yTalpa - cy, 1e-6);
  // lateral se pleacă de la marginea sprijinului cea mai apropiată de centrul de masă
  const margine = Math.max(0, Math.min(cx - cb.min[0], cb.max[0] - cx));
  const grade = (rad: number) => +((rad * 180) / Math.PI).toFixed(1);
  const ariaSprijinMM2 = +(lungimeContact * grosime).toFixed(0);
  const unghiFataSpate = grade(Math.atan(grosime / 2 / h));
  const unghiLateral = grade(Math.atan(margine / h));
  return {
    ariaSprijinMM2, inaltimeCM: +h.toFixed(1), unghiFataSpate, unghiLateral,
    staSingura: unghiFataSpate >= UNGHI_RASTURNARE_MIN && unghiLateral >= UNGHI_RASTURNARE_MIN
      && ariaSprijinMM2 >= SPRIJIN_MIN,
  };
}

/**
 * Câte bucăți REALE are o siluetă. Fragmentele sub `ASCHIE_MAX` nu se pun la socoteală.
 *
 * Numărătoarea simplă socotea firimiturile drept piese. Măsurat pe catalog: BowlbyOne „4" dă
 * trei componente, cu ariile 0.58, 0.18 și 9184 mm² — litera și două așchii. RubikWetPaint „C"
 * dă patru, dintre care trei sub 1 mm². Litera nu e în trei bucăți; numărătoarea socotea praf.
 *
 * Consecința era un eșec de test cu mesaj mincinos — „1 bucăți, litera are 3 — model desprins
 * de ramă" — când de fapt piesa era întreagă, iar cifra din dreapta era greșită.
 *
 * Pragul nu e ales aici: `ASCHIE_MAX` exista deja și se folosea exact așa la curățarea
 * golurilor (liniile 327 și 446). Acum se aplică și la numărat, ca două locuri din aceeași
 * aplicație să nu mai spună lucruri diferite despre aceeași siluetă.
 */
function bucatiDin(cs: any): number {
  const p = cs.decompose();
  const n = p.filter((x: any) => x.area() >= ASCHIE_MAX).length;
  for (const x of p) x.delete();
  return n;
}

// =====================================================================

/**
 * Corpul pregătit de PRINT — aceeași orientare cu ce se vede în viewport.
 *
 * Viewport-ul afișează modelul ca (x, −y, z): fonturile vin cu y în jos, iar fără oglindire
 * litera s-ar citi invers pe ecran. Exportul trebuie să aplice ACEEAȘI oglindire, altfel
 * fișierul iese în oglindă față de ce a văzut omul — defectul care a scăpat o dată la
 * aplicația de litere și s-a văzut abia pe placă.
 *
 * Stă în modulul de geometrie, nu în interfață: așa poate fi verificat în test, unde nu
 * există three.js. Talpa rămâne la Z=0 (oglindirea e pe Y, nu atinge Z), deci piesa se
 * printează culcată, fără suporți.
 *
 * `spateInSus` întoarce piesa cu spatele în sus, pentru locașurile de agățare. Altfel locașul
 * ar sta pe placă, iar tavanul lui s-ar printa în punte peste tot golul — la agățătoarea cu
 * dinți, o punte de trei centimetri. Întors, locașul e o scobitură deschisă în sus, adică
 * geometria cea mai ușoară de printat. E o ROTAȚIE, nu o oglindire: piesa rămâne aceeași.
 */
export function pentruPrint(corp: any, spateInSus = false): any {
  const citibil = corp.mirror([0, 1, 0]);
  if (!spateInSus) return citibil;
  const rotit = citibil.rotate([180, 0, 0]);
  citibil.delete();
  const bb = rotit.boundingBox();
  const asezat = rotit.translate([0, 0, -bb.min[2]]);
  rotit.delete();
  return asezat;
}

export function buildFagure(cfg: FagureConfig): FagureResult {
  if (!MOD) throw new Error(t('geometry.manifoldNeconfigurat', { functie: 'buildFagure' }));
  const { Manifold, CrossSection } = MOD;
  const t0 = performance.now();

  // ---- silueta literei, centrată pe origine ----
  const rep: Partial<SolidReport> = {};
  const bruta = textSolid(cfg.font, cfg.litera, cfg.inaltimeLitera, cfg.grosime, rep);
  const silBruta = bruta.project();
  bruta.delete();
  const r0 = silBruta.bounds();
  const cx = (r0.min[0] + r0.max[0]) / 2, cy = (r0.min[1] + r0.max[1]) / 2;
  const silIntreaga = silBruta.translate([-cx, -cy]);
  silBruta.delete();

  // ---- TĂIEREA LA BAZĂ ----
  // Reparația pentru exact ce raportează diagnosticul de stabilitate: „O" se sprijină pe un
  // punct, iar o retezare de doi milimetri îi dă talpă. Se face pe SILUETĂ, înainte de model,
  // ca rama să urmeze conturul nou — nu pe solid, la sfârșit, unde ar tăia și prin celule.
  let sil = silIntreaga;
  let taiereBazaAplicata = 0;
  if (cfg.taiereBaza > 0) {
    const b = silIntreaga.bounds();
    const w = b.max[0] - b.min[0] + 4, hh = b.max[1] - b.min[1] + 4;
    // se păstrează tot ce e DEASUPRA tălpii retezate (y-ul modelului crește în jos)
    const pastrat = CrossSection.square([w, hh], true)
      .translate([(b.min[0] + b.max[0]) / 2, b.max[1] - cfg.taiereBaza - hh / 2]);
    sil = silIntreaga.intersect(pastrat);
    pastrat.delete();
    taiereBazaAplicata = cfg.taiereBaza;
    silIntreaga.delete();
  }
  const tFont = performance.now();

  const rb = sil.bounds();
  const latime = rb.max[0] - rb.min[0], inaltime = rb.max[1] - rb.min[1];
  const model = tipar(CrossSection,
    { model: cfg.model, pas: cfg.pasCelula, grosimePerete: cfg.grosimePerete, unghi: cfg.unghiModel, varianta: cfg.variantaModel },
    intindere(latime, inaltime, cfg.unghiModel, cfg.pasCelula + cfg.grosimePerete));
  const tTipar = performance.now();

  // ---- GOLUL ----
  // interiorul = ce rămâne după ce se ia rama de pe contur. Dacă retragerea îl golește (literă
  // subțire sau ramă lată), nu se scade nimic: iese litera plină, semnalată în diagnostice.
  const interior = cfg.latimeRama > 0 ? sil.offset(-cfg.latimeRama, 'Round') : sil;
  const faraInterior = interior.area() <= 1e-6;
  let gol: any = null;
  let goluriMici = 0;
  if (!faraInterior) {
    const golBrut = interior.subtract(model);   // interiorul MINUS tipar = ce se scoate
    // GOLURILE PREA MICI se umplu la loc: sub un milimetru pătrat gaura nu iese gaură, ci o
    // pată de material scămoșat pe care slicer-ul o umple oricum, prost. Se filtrează AICI,
    // pe ce se scade, nu pe rezultat — altfel ar rămâne în geometrie.
    const gComp = golBrut.decompose();
    const gBune = gComp.filter((c: any) => c.area() >= ASCHIE_MAX);
    goluriMici = gComp.length - gBune.length;
    gol = goluriMici > 0 ? (gBune.length ? CrossSection.compose(gBune) : null) : golBrut;
    for (const c of gComp) c.delete();
    if (gol !== golBrut) golBrut.delete();
  }
  // ---- TALPA PLINĂ ----
  // Materialul se pune unde se rupe piesa: banda de jos nu se străpunge deloc. Se scoate din
  // GOL, nu se adaugă peste model — așa merge la toate cele nouă tipare deodată.
  if (gol && cfg.talpaPlina > 0) {
    const b = sil.bounds();
    const banda = CrossSection.square([b.max[0] - b.min[0] + 4, cfg.talpaPlina], true)
      .translate([(b.min[0] + b.max[0]) / 2, b.max[1] - cfg.talpaPlina / 2]);
    const g2 = gol.subtract(banda);
    banda.delete(); gol.delete();
    gol = g2;
  }

  const strapuns = cfg.modModel === 'strapuns';

  // ---- AGĂȚAREA PE PERETE ----
  // Litera e goală pe dinăuntru, deci locașul nu poate fi pur și simplu tăiat: ar cădea între
  // celule. Se adaugă întâi un PLASTURE plin (conturul dilatat cu peretele) — care umple
  // modelul local — și abia apoi se sapă în el. La gravat, plasturele scoate și scobitura.
  // La „gaura", șurubul trece PRIN literă și se înfige în perete, iar capul lui se îngroapă
  // într-un locaș din FAȚĂ, acoperit apoi de un capac printat separat. Conturul care decide
  // așezarea și plasturele e cel MARE (locașul capului), nu gaura tijei.
  const razaLacas = (cfg.surubCap + JOC_CAPAC) / 2;
  const razaTija = (cfg.surubTija + JOC_CAPAC) / 2;
  /**
   * LOCAȘUL DIN SPATE E UN CANAL ÎN T, nu un buzunar cu pereți drepți.
   *
   * Prima versiune tăia UN SINGUR contur, la o singură adâncime, și era greșită din principiu:
   * fanta avea lățimea TIJEI la orice adâncime, deci capul șurubului intra în cercul mare și nu
   * mai putea gliza nicăieri. Litera se punea pe șurub și cădea înapoi. Se vedea pe piesa
   * randată, nu în cifre — de aceea a scăpat de teste.
   *
   *   z ∈ [0, STANDOFF_TIJA]  lângă perete: fanta tijei + cercul de intrare. Materialul de
   *                           aici e BUZA care reține capul.
   *   z ∈ [STANDOFF_TIJA, …]  mai adânc: camera în care CĂLĂTOREȘTE capul, lată cât el.
   *
   * La „cheie" camera e aceeași gaură de cheie cu fanta lată cât capul — `conturCheie` o dă
   * direct, dacă i se cere aceeași rază și pentru tijă. La „grila" capul se sprijină pe muchia
   * cu șei, deci jumătatea lui de sus ajunge DEASUPRA canalului: camera se prelungește în sus
   * cu o rază de cap, altfel capul se izbește de materialul de peste canal.
   *
   * La „gaura" nu se pune problema: șurubul trece PRIN literă, capul se îngroapă într-un locaș
   * din față și nu glisează nicăieri.
   */
  const CANAL_GRILA = 8;
  const formeSpate = cfg.tipAgatare === 'cheie'
    // cursa = un diametru de cap: destul cât tija să ajungă în fantă și șurubul să nu mai
    // poată ieși, fără să lungească inutil locașul (pe o trăsătură de literă contează)
    ? { tija: conturCheie(razaLacas, razaTija, cfg.surubCap), cap: conturCheie(razaLacas, razaLacas, cfg.surubCap) }
    : cfg.tipAgatare === 'grila'
      ? { tija: conturGrila(cfg.latimeGrila, CANAL_GRILA, 2, 6),
        cap: [[[-cfg.latimeGrila / 2, -CANAL_GRILA - razaLacas], [cfg.latimeGrila / 2, -CANAL_GRILA - razaLacas],
          [cfg.latimeGrila / 2, 0], [-cfg.latimeGrila / 2, 0]] as Pt[]] }
      : null;
  // conturul care decide AȘEZAREA și PLASTURELE e cel mai mare: camera capului. Pe fanta tijei
  // ar fi încăput și acolo unde camera n-are loc, iar locașul ar fi ieșit prin marginea literei.
  const formaAgatare = cfg.tipAgatare === 'gaura' ? conturCerc(razaLacas) : formeSpate?.cap ?? null;
  // ADÂNCIMEA LOCAȘULUI NU E PARAMETRU LA NICIUNUL DIN CELE TREI, și din același motiv: în el
  // intră lucruri de dimensiuni cunoscute, iar o valoare liberă permite exact configurația care
  // nu funcționează.
  //   gaura        cap șurub + capac + joc          (capacul ar rămâne afară)
  //   cheie/grila  standoff tijă + cap șurub + joc  (capul n-ar avea pe unde gliza)
  const adancimeCeruta = cfg.tipAgatare === 'gaura'
    ? cfg.inaltimeCapSurub + cfg.grosimeCapac + 0.2
    : STANDOFF_TIJA + cfg.inaltimeCapSurub + JOC_CAPAC;
  const adancimeAgatare = Math.max(STANDOFF_TIJA + 1, Math.min(adancimeCeruta,
    cfg.grosime - (cfg.modModel === 'gravat' ? cfg.adancimeGravare : 0) - 1.5));
  const cmSil = centroid(sil);
  const pozitiiAgatare = formaAgatare
    ? pozitieAgatare(CrossSection, sil, formaAgatare, cmSil[0], cmSil[1]) : [];
  const inclinare = inclinareAgatare(pozitiiAgatare, cmSil);
  let plasture: any = null, taietura: any = null, taieturaCap: any = null, gauraTija: any = null;
  if (pozitiiAgatare.length && formaAgatare) {
    // la „gaura" se sapă un singur contur; la „cheie"/„grila" fanta tijei, iar camera capului
    // separat, mai adânc
    const forma = new CrossSection(formeSpate ? formeSpate.tija : formaAgatare, 'Positive');
    const formaCap = formeSpate ? new CrossSection(formeSpate.cap, 'Positive') : null;
    const dilatat = new CrossSection(formaAgatare, 'Positive').offset(PERETE_GAURA, 'Round');
    const tija = cfg.tipAgatare === 'gaura' ? new CrossSection(conturCerc(cfg.surubTija / 2), 'Positive') : null;
    for (const p of pozitiiAgatare) {
      const t = forma.translate(p), pl = dilatat.translate(p);
      if (taietura) { const u = taietura.add(t); taietura.delete(); t.delete(); taietura = u; } else taietura = t;
      if (plasture) { const u = plasture.add(pl); plasture.delete(); pl.delete(); plasture = u; } else plasture = pl;
      if (formaCap) {
        const c = formaCap.translate(p);
        if (taieturaCap) { const u = taieturaCap.add(c); taieturaCap.delete(); c.delete(); taieturaCap = u; } else taieturaCap = c;
      }
      if (tija) {
        const g = tija.translate(p);
        if (gauraTija) { const u = gauraTija.add(g); gauraTija.delete(); g.delete(); gauraTija = u; } else gauraTija = g;
      }
    }
    forma.delete(); formaCap?.delete(); dilatat.delete(); tija?.delete();
    if (gol) {
      // La STRĂPUNS plasturele e obligatoriu: modelul trece prin placă, deci în jurul
      // locașului trebuie material plin, altfel locașul ar cădea între celule.
      //
      // La GRAVAT placa e întreagă oricum, deci plasturele n-are ce ține — dar SE VEDEA:
      // netezea tiparul pe fața literei, iar din față se citea forma sistemului de agățare.
      // Acolo se scoate din tipar DOAR ce se sapă efectiv din față (locașul capului), iar
      // locașurile din spate („cheie", „grila") nu ating deloc desenul.
      const deScos = strapuns ? plasture : (cfg.tipAgatare === 'gaura' ? taietura : null);
      if (deScos) { const g2 = gol.subtract(deScos); gol.delete(); gol = g2; }
    }
  }

  // fața văzută: rama + pereții modelului. În modul străpuns E chiar piesa; în modul gravat e
  // doar desenul de pe placă, dar se calculează la fel, fiindcă pe ea se măsoară pereții subțiri.
  const fata = gol ? sil.subtract(gol) : sil;

  // ---- AȘCHII: bucăți desprinse sub prag, eliminate din geometrie ----
  // Se face pe componente, nu pe arie totală: o așchie e o bucată întreagă, mică. Doar la
  // STRĂPUNS: în gravat orice petic de față stă pe placa plină de dedesubt, deci nu se desprinde.
  const comp = strapuns ? fata.decompose() : [];
  const bune = comp.filter((c: any) => c.area() >= ASCHIE_MAX);
  const aschii = comp.length - bune.length;
  const ariaAschii = comp.reduce((s: number, c: any) => s + (c.area() < ASCHIE_MAX ? c.area() : 0), 0);
  let curat = fata;
  if (strapuns && aschii > 0 && bune.length) curat = CrossSection.compose(bune);
  for (const c of comp) c.delete();

  // silueta din care se ridică materialul: fața străpunsă, sau placa plină la gravat — în
  // amândouă cu plasturele adăugat și gaura scoasă
  const baza = strapuns ? curat : sil;
  const strapungeAgatarea = cfg.tipAgatare === 'gaura';
  let bazaG = baza;
  // plasturele se adaugă doar unde chiar ține ceva: la străpuns. La gravat placa e deja plină.
  if (plasture && strapuns) bazaG = baza.add(plasture);
  // prin placă trece doar TIJA; capul stă într-un locaș săpat din față, în 3D
  if (gauraTija) {
    const gaurit = bazaG.subtract(gauraTija);
    if (bazaG !== baza) bazaG.delete();
    bazaG = gaurit;
  }
  const tStrapungere = performance.now();

  // ---- CORPURILE ----
  // străpuns: o piesă, o culoare, golurile trec prin placă.
  // gravat:   placa rămâne întreagă, golul devine scobitură pe FAȚĂ, iar umplutura ei e a doua
  //           culoare. Cele două se printează împreună, ca la brelocuri: același obiect fizic,
  //           schimbare de culoare la înălțime, fără lipit.
  let corpLitera: any, corpModel: any = null;
  if (strapuns) {
    corpLitera = Manifold.extrude(bazaG, cfg.grosime);
  } else {
    const placa = Manifold.extrude(bazaG, cfg.grosime);
    if (gol) {
      const adancime = Math.min(cfg.adancimeGravare, cfg.grosime - 1);   // rămâne minim 1 mm de placă
      // scobitura iese 0.2 mm peste față: fețe coplanare = geometrie fragilă la boolean
      const cutter = Manifold.extrude(gol, adancime + 0.2).translate([0, 0, cfg.grosime - adancime]);
      corpLitera = placa.subtract(cutter);
      cutter.delete(); placa.delete();
      // piesa de umplut NU se dilată și nu primeste joc: se printează pe loc, nu se montează
      corpModel = Manifold.extrude(gol, adancime).translate([0, 0, cfg.grosime - adancime]);
    } else {
      corpLitera = placa;
    }
  }
  // ---- LOCAȘUL DE AGĂȚARE ----
  // Se sapă în 3D, nu în siluetă: nu străpunge, se oprește la `adancimeAgatare`. Cutter-ul iese
  // 0.2 mm dincolo de fața pe care se deschide, ca să nu rămână fețe coplanare la boolean.
  //
  // La „cheie" și „grila" locașul e în SPATE (z=0). La „gaura" e în FAȚĂ: șurubul trece prin
  // literă și se înfige în perete, iar capul lui trebuie îngropat, nu lăsat afară.
  // grosimea capacului, limitată de locaș: mereu rămâne cel puțin 0.4 mm sub el
  const grosimeCapacEfectiv = strapungeAgatarea ? Math.min(cfg.grosimeCapac, adancimeAgatare - 0.4) : 0;
  let corpCapac: any = null;
  if (taietura) {
    let cutter: any;
    if (strapungeAgatarea) {
      cutter = Manifold.extrude(taietura, adancimeAgatare + 0.2).translate([0, 0, cfg.grosime - adancimeAgatare]);
    } else {
      // CANALUL ÎN T: fanta tijei, deschisă la spate și oprită unde începe camera capului, plus
      // camera capului, îngropată. Se suprapun cu o sutime — lipite exact, ar avea fețe
      // coplanare, iar reuniunea lor lasă cochilii degenerate.
      const cTija = Manifold.extrude(taietura, STANDOFF_TIJA + 0.21).translate([0, 0, -0.2]);
      const cCap = Manifold.extrude(taieturaCap, adancimeAgatare - STANDOFF_TIJA).translate([0, 0, STANDOFF_TIJA]);
      cutter = cTija.add(cCap);
      cTija.delete(); cCap.delete();
    }
    const gaurit = corpLitera.subtract(cutter);
    cutter.delete(); corpLitera.delete();
    corpLitera = gaurit;

    // CAPACUL: piesă separată, care intră cu presiune în locaș și ascunde capul șurubului.
    //
    // Stă în PARTEA DE SUS a locașului, nu îl umple: dedesubtul lui rămâne loc pentru capul
    // șurubului. Se construiește chiar acolo, nu la origine — altfel ar sta îngropat în spatele
    // plăcii, suprapus peste literă, și n-ar mai fi o piesă de sine stătătoare. Fața lui rămâne
    // cu 0.2 mm sub fața literei, ca să nu iasă în relief dacă intră strâmb.
    if (strapungeAgatarea && cfg.capacel && grosimeCapacEfectiv >= 0.6) {
      const rc = razaLacas - JOC_CAPAC / 2;
      for (const p of pozitiiAgatare) {
        const disc = Manifold.cylinder(grosimeCapacEfectiv, rc, rc, laturiCerc(rc), false)
          .translate([p[0], p[1], cfg.grosime - 0.2 - grosimeCapacEfectiv]);
        if (corpCapac) { const u = corpCapac.add(disc); corpCapac.delete(); disc.delete(); corpCapac = u; } else corpCapac = disc;
      }
    }
  }

  // verificat, nu presupus: extrudarea unei siluete cu sute de goluri e exact locul unde
  // o geometrie invalidă ar trece neobservată până la slicer
  for (const corp of [corpLitera, corpModel, corpCapac]) {
    if (!corp) continue;
    const status = String(corp.status());
    if (status !== 'NoError') throw new Error(t('fagure.geometrieInvalida', { status }));
  }
  const tExtrudare = performance.now();

  // suprafața pe care stă litera: în gravat placa e întreagă, deci sprijinul e al siluetei
  const ariaFinala = bazaG.area();
  const diagnostice: FagureDiagnostics = {
    dimLitera: [+latime.toFixed(1), +inaltime.toFixed(1)],
    ariaPlinaMM2: +sil.area().toFixed(1),
    ariaFinalaMM2: +ariaFinala.toFixed(1),
    ariaModelMM2: +(gol ? gol.area() : 0).toFixed(1),
    economie: +(1 - ariaFinala / Math.max(sil.area(), 1e-9)).toFixed(3),
    // componentele sunt deja numărate la filtrarea așchiilor; nu se descompune a doua oară
    bucati: strapuns ? (bune.length || comp.length) : bucatiDin(sil),
    bucatiLitera: bucatiDin(sil),
    aschii,
    ariaAschiiMM2: +ariaAschii.toFixed(3),
    goluriMici,
    stabilitate: stabilitate(CrossSection, bazaG, cfg.grosime),
    taiereBazaAplicata,
    // adâncimea LOCAȘULUI, la toate trei tipurile: la „gaura" e locașul capului din față, nu
    // grosimea plăcii — prin placă trece doar tija
    agatare: { tip: cfg.tipAgatare, pozitii: pozitiiAgatare, adancime: +adancimeAgatare.toFixed(2), inclinare,
      standoff: strapungeAgatarea ? 0 : STANDOFF_TIJA,
      grosimeCapac: +grosimeCapacEfectiv.toFixed(2),
      spatiuCap: +Math.max(0, adancimeAgatare - 0.2 - grosimeCapacEfectiv).toFixed(2) },
    faraInterior,
    // pereții subțiri se măsoară pe FAȚĂ în ambele moduri: și gravat, o nervură prea îngustă
    // între două scobituri iese scămoșată
    trasaturi: trasaturiSubtiri(fata, TRASATURA_MIN),
    glifeLipsa: rep.missingGlyphs ?? [],
    triunghiuri: corpLitera.numTri() + (corpModel ? corpModel.numTri() : 0) + (corpCapac ? corpCapac.numTri() : 0),
    timpi: {
      font: +(tFont - t0).toFixed(1),
      tipar: +(tTipar - tFont).toFixed(1),
      strapungere: +(tStrapungere - tTipar).toFixed(1),
      extrudare: +(tExtrudare - tStrapungere).toFixed(1),
    },
  };

  // temporarele trăiesc în heap-ul WASM și se eliberează abia la un GC al JS-ului. Într-o buclă
  // strânsă (testul face sute de construcții) GC-ul nu apucă să ruleze și heap-ul se termină.
  model.delete();
  if (interior !== sil) interior.delete();
  if (gol) gol.delete();
  plasture?.delete(); taietura?.delete(); taieturaCap?.delete(); gauraTija?.delete();
  if (bazaG !== baza) bazaG.delete();
  if (curat !== fata) curat.delete();
  if (fata !== sil) fata.delete();
  sil.delete();

  return { corpLitera, corpModel, corpCapac, diagnostice, ms: performance.now() - t0 };
}
