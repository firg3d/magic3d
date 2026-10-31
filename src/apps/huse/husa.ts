/**
 * APP HUSE — geometria produsului (HUS.1, B.6).
 *
 * Șase șabloane, compuse din primitivele de nucleu (`core/primitive/`). Aici stă doar ce e
 * SPECIFIC HUSEI: ce cotă a telefonului intră în ce primitivă, și în ce ordine se scad corpurile.
 *
 * SISTEMUL DE COORDONATE, moștenit din datele de telefon și păstrat până la export:
 *   · X spre dreapta, PRIVIT DIN SPATE;  · Y în sus;  · Z spre exterior, dinspre spate.
 *   · Telefonul ocupă Z de la 0 (spatele lui) la `grosime`; sticla iese peste, cu
 *     `ecran.proeminentaFataDeCorp`.
 *
 * Husa îmbracă spatele și lateralele: fundul ei stă la Z negativ, iar buza urcă peste fața
 * telefonului. La print se așază cu spatele pe placă, fără suporturi.
 */
import { dreptunghiRotunjit, marginiDecupaj, conturDecupaj, inaltimeMaximaBuza,
  adancimeSubtiere, pozitiiFlexColt, unesteDecupaje,
  type Punct, type MarginiDecupaj } from '../../core/primitive/index.js';
import { configureManifold as configBoolean, uneste, SUPRAPUNERE } from '../../core/primitive/boolean.js';
import { configureManifold as configCioburi, curataCioburi } from '../../core/primitive/cioburi.js';
import { configureManifold as configPlan, puntiPeGoluri } from '../../core/primitive/plan.js';
import { configureManifold as configTextSolid, textSolid } from '../../core/geometry/textSolid.js';
import type { Ring } from '../../core/geometry/forme2d.js';
import { tipar, type ParamTipar } from '../../core/geometry/tipare.js';
import { configureManifold as configSemnatura, aplicaMarcaj, TEXTURA_LATIME_MIN,
  TEXTURA_INALTIME_MIN, MICRO_INALTIME, MICRO_ADANCIME,
  type ContextMarcaj, type RegiuneMarcaj, type RaportMarcaj } from '../../core/semnatura/index.js';

let MOD: any = null;
export function configureManifold(mod: any): void {
  MOD = mod; configBoolean(mod); configTextSolid(mod); configSemnatura(mod); configCioburi(mod); configPlan(mod);
}

// ---------- datele telefonului, cât folosește husa ----------

export interface Con { unghi: number | null; distanta: number | null; referinta: string | null }
export interface Lentila { x: number; y: number; diametru: number; proeminentaSuplimentara: number; con?: Con | null }
export interface Buton {
  tip: string; latura: 'stanga' | 'dreapta'; y: number; lungime: number; latime: number;
  acoperibil: boolean;
  /** `inaltime` = întinderea pe Y (de-a lungul laturii), `latime` = pe X, în carcasă */
  keepout?: { latime: number; inaltime: number; razaColt?: number } | null;
}
export interface Telefon {
  id: string; model: string;
  corp: {
    lungime: number; latime: number; grosime: number; razaColt: number;
    profilMargine: 'plat' | 'curbat'; razaMuchie: number;
    grosimeMaxHusaSpate?: number | null;
    zonaIncarcare?: { x: number; y: number; diametru: number } | null;
  };
  ecran: { proeminentaFataDeCorp: number };
  insulaCamera: {
    forma: 'patrat' | 'pilula-verticala' | 'bara-lata' | 'lentila-simpla';
    x: number; y: number; latime: number; inaltime: number; razaColt: number; proeminenta: number;
    lentile: Lentila[];
    blit: { x: number; y: number; diametru: number; con?: Con | null };
  };
  butoane: Buton[];
  port: { latura: string; x: number; latime: number; inaltime: number; tip: string };
  decupajeJos: { tip: string; x: number; latime: number }[];
  decupajeSus: { tip: string; x: number; latime: number }[];
  verificat: boolean;
}

export type Material = 'tpu' | 'rigid';
export type CeExporti = 'rama' | 'husa' | 'bumper';

export interface HusaConfig {
  telefon: Telefon;
  material: Material;
  ceExporti: CeExporti;
  /** grosimea peretelui (mm) — B.7, 1,2–2,0, implicit 1,4 */
  grosimePerete: number;
  /** cât urcă buza peste fața telefonului (mm) — B.7, 0,8–1,5, implicit 1,0 */
  buzaEcran: number;
  /** jocul pe fiecare parte (mm) — TPU 0,25, rigid 0,40 */
  joc: number;
  /** butoanele acoperibile se acoperă cu perete subțiat în loc de decupaj */
  butoaneAcoperite: boolean;
  /** marginea dorită în jurul insulei camerei (mm) */
  margineCamera: number;
  /**
   * Fontul cu care se gravează eticheta ramei de probă. Aplicația îl încarcă și îl dă mai
   * departe; geometria nu aduce singură fișiere. Lipsa lui nu e o eroare — rama iese fără
   * etichetă, nu deloc.
   */
  fontGravare?: any;
  /**
   * Contextul de marcaj, fără regiune — regiunea o dă husa, fiindcă doar ea știe unde e spatele.
   * Lipsa lui înseamnă „fără marcaj": rama de probă și testele de geometrie pură.
   */
  marcaj?: Omit<ContextMarcaj, 'regiune'>;
  /** decorarea spatelui (HUS.2.3); lipsa ei înseamnă spate plin */
  spate?: ParamSpate;
}

/** ce trebuie spus omului, măsurat pe piesa construită */
export interface HusaDiagnostic {
  /** înălțimea totală a piesei (mm) */
  inaltimeTotala: number;
  /** amprenta pe placă, cu piesa culcată pe spate */
  amprenta: [number, number];
  volumCM3: number;
  marginiCamera: MarginiDecupaj;
  /** buza din jurul camerei: cât s-a cerut, cât permite conul, cât s-a construit */
  buzaCamera: { ceruta: number; maximPermis: number; construita: number };
  ferestre: Fereastra[];
  punti: PunteFereastra[];
  flex: TaieturaFlexHusa[];
  /** grosimea spatelui în inelul de încărcare, și limita, când există */
  incarcare: { grosimeSpate: number; limita: number | null; peste: boolean } | null;
  bucati: number;
  triunghiuri: number;
  incapePePlaca: boolean;
  /** doar la rama de probă */
  bresa: BresaRama | null;
  gravare: string | null;
  /** cea mai subțire secțiune a piesei: banda de material de peste ferestre (mm) */
  bandaPesteFerestre: number;
  /** grosimile care decid dacă husa e „subțire" sau „un bloc" (HUS.2.2) */
  grosime: GrosimeHusa;
  /** buza de fixare: câte segmente și cât acoperă din față (HUS.2.1) */
  retentie: { segmente: number; suprapunereCeruta: number };
  /** raportul marcajului, când s-a aplicat (HUS.2.4) */
  marcaj: RaportMarcaj | null;
  /** raportul spatelui (HUS.2.3) */
  spate: RaportSpate | null;
  /** zonele care nu se acoperă și au primit gaura lor (HUS.2.5) */
  keepOut: DecupajKeepOut[];
  /** cioburi numerice aruncate înainte de export (regulă de nucleu) */
  cioburiSterse: number;
  volumCioburi: number;
}

/**
 * GROSIMILE (HUS.2.2), măsurate pe piesă.
 *
 * Referința care a pornit regula: o husă cumpărată pentru 16 Pro ieșea 14,25 mm, fiindcă ridica
 * TOT spatele ca să înglobeze platoul camerei. Noi construim în jurul insulei: spatele rămâne
 * `perete`, iar buza camerei e un inel local. Deci cifra care contează nu e maximul piesei, ci
 * grosimea ÎN AFARA zonei camerei — acolo se vede dacă husa e subțire sau e un bloc.
 */
export interface GrosimeHusa {
  /** maximul piesei, adică pe vârful buzei de cameră (mm) */
  totala: number;
  /** grosimea în afara amprentei camerei (mm) */
  inAfaraCamerei: number;
  /** cu cât e mai groasă decât telefonul, în afara camerei (mm) */
  pesteTelefon: number;
  /**
   * Cât adaugă HUSA, măsurat de la fața reală a telefonului (sticlă inclusă).
   *
   * `pesteTelefon` se raportează la `corp.grosime`, cota din specificație. La iPhone SE 3 sticla
   * iese 0,94 mm peste ramă, deci husa pare cu 0,94 mai groasă fără să fi pus un micron în plus:
   * nu poate coborî sub o sticlă care iese. Ținta se judecă pe cifra asta, iar cealaltă se
   * raportează ca atare.
   */
  contributiaHusei: number;
  /** ținta din HUS.2.2 (mm) */
  tinta: number;
  /** true = peste țintă; probabil spatele înglobează platoul în loc să-l decupeze */
  peste: boolean;
}

/** ținta HUS.2.2: în afara zonei camerei, husa nu îngroașă telefonul cu mai mult (mm) */
export const TINTA_PESTE_TELEFON = 3.0;

export interface HusaResult { corp: any; diagnostic: HusaDiagnostic; ms: number }

// ---------- ȘABLONUL 1 — corpHusa ----------

/**
 * Conturul telefonului, în plan. Toate celelalte contururi pornesc de la el prin offset.
 */
export function conturTelefon(t: Telefon, segmente = 24): Punct[] {
  return dreptunghiRotunjit(t.corp.latime, t.corp.lungime, t.corp.razaColt, segmente);
}

/** unde stă fața telefonului pe Z: grosimea corpului plus cât iese sticla peste ramă */
export const fataZ = (t: Telefon) => t.corp.grosime + t.ecran.proeminentaFataDeCorp;

/**
 * ȘABLONUL 1 — CORPUL HUSEI.
 *
 * Un bloc plin pe conturul exterior, din care se scoate cavitatea telefonului și deschiderea
 * ecranului. Buza rămâne de la sine: e inelul dintre conturul exterior și deschidere.
 *
 * DE CE SE SCADE, NU SE ADUNĂ. Se putea construi ca fund + patru pereți + buză, adunate. Ar fi
 * ieșit același lucru cu patru booleene în plus și cu fețe coplanare la fiecare îmbinare — adică
 * exact combinația care produce cochilii degenerate. Un bloc din care scoți e o singură cale.
 */
export function corpHusa(cfg: HusaConfig): any {
  const { Manifold, CrossSection } = MOD;
  const t = cfg.telefon;
  const g = cfg.grosimePerete, j = cfg.joc;

  const contur = new CrossSection([conturTelefon(t)], 'Positive');
  const exterior = contur.offset(j + g, 'Round');
  const cavitate = contur.offset(j, 'Round');
  /**
   * DESCHIDEREA FRONTALĂ E RETRASĂ CU `buzaEcran` DE LA MARGINEA CORPULUI (HUS.2.1), nu de la
   * cavitate.
   *
   * Până la HUS.2 se scădea din cavitate: `offset(joc − buză)`. Cu jocul implicit, buza acoperea
   * fața telefonului cu 0,75 mm în loc de 1,00 — parametrul spunea un lucru și făcea altul, iar
   * diferența era exact jocul, adică tocmai cota pe care omul o mișcă. Acum retragerea se
   * măsoară de la CONTURUL TELEFONULUI, deci „buză 1,0" înseamnă 1,0 mm de suprapunere peste
   * față, la orice joc.
   */
  const deschidere = contur.offset(-cfg.buzaEcran, 'Round');
  contur.delete();

  const sus = fataZ(t) + cfg.buzaEcran;
  // blocul plin: de la fundul husei (−g) până deasupra buzei
  let corp = Manifold.extrude(exterior, sus + g).translate([0, 0, -g]);

  /**
   * CAVITATEA SE OPREȘTE LA FAȚA TELEFONULUI, NU URCĂ PESTE EA.
   *
   * Până la HUS.2 era extrudată `sus + 1`, adică prin toată buza. Cum deschiderea ecranului e
   * un SUBSET al cavității, scăderea ei de după nu mai avea ce tăia: buza de fixare nu s-a
   * construit niciodată, iar peretele doar se înălța cu `buzaEcran` peste față, drept, fără să
   * se întoarcă deloc peste ecran. Volumul, bounding box-ul și testul de joc arătau toate bine —
   * verificarea de înălțime („buza urcă peste fața telefonului") măsura tocmai înălțimea, nu
   * întoarcerea. S-a văzut abia când am măsurat suprapunerea: 0,00 mm peste tot.
   *
   * Husa aceea n-ar fi ținut telefonul: ar fi ieșit pe față la prima atingere.
   */
  const golTelefon = Manifold.extrude(cavitate, fataZ(t));
  let nou = corp.subtract(golTelefon);
  golTelefon.delete(); corp.delete(); corp = nou;

  // deschiderea ecranului, de la fața telefonului în sus
  if (deschidere.area() > 1e-6) {
    const golEcran = Manifold.extrude(deschidere, cfg.buzaEcran + 1).translate([0, 0, fataZ(t)]);
    nou = corp.subtract(golEcran);
    golEcran.delete(); corp.delete(); corp = nou;
  }

  exterior.delete(); cavitate.delete(); deschidere.delete();

  // buza întreruptă, la rigid
  for (const seg of intreruperiBuza(cfg)) {
    const taietor = taietorIntrerupere(cfg, seg);
    nou = corp.subtract(taietor);
    taietor.delete(); corp.delete(); corp = nou;
  }
  return corp;
}

/** cât din traseul drept al unei laturi lungi rămâne fără buză, la presetul rigid */
export const FRACTIE_INTRERUPERE_BUZA = 1 / 3;

export interface SegmentBuza { latura: 'stanga' | 'dreapta'; de: number; pana: number }

/**
 * BUZA SE ÎNTRERUPE LA MIJLOCUL LATURILOR LUNGI, DOAR LA RIGID (DECIZIE, HUS.2.1).
 *
 * TPU-ul se întinde la montare, deci buza poate face tot conturul. PETG-ul nu se întinde deloc:
 * o buză continuă care intră 1,0 mm peste fața telefonului face deschiderea frontală mai mică
 * decât telefonul, iar telefonul pur și simplu nu are pe unde să intre. Se lasă o fereastră la
 * mijlocul fiecărei laturi lungi: acolo telefonul coboară drept, apoi alunecă sub buza rămasă,
 * iar tăieturile de flex din colțuri (șablonul 6) fac restul.
 *
 * LUNGIMEA E O ALEGERE, NU O MĂSURĂTOARE, și e scrisă ca atare: o treime din traseul drept al
 * laturii. Nu am din ce s-o deduc — ar trebui știut cât se îndoaie piesa la montare, iar asta se
 * află la prima probă fizică, nu din desen. Se raportează în milimetri la fiecare pilot ca
 * operatorul s-o poată corecta după ce ține husa în mână.
 */
export function intreruperiBuza(cfg: HusaConfig): SegmentBuza[] {
  if (cfg.material !== 'rigid') return [];
  const capat = capatTraseuDrept(cfg.telefon, 'stanga');
  const jumatate = capat * FRACTIE_INTRERUPERE_BUZA;
  const ferestre = ferestreButoane(cfg);
  const out: SegmentBuza[] = [];
  for (const latura of ['stanga', 'dreapta'] as const) {
    let de = -jumatate, pana = jumatate;
    /**
     * ÎNTRERUPEREA SE FEREȘTE DE FERESTRE — aceeași regulă ca peste tot: ce e comod cedează în
     * fața minimului structural.
     *
     * Fereastra unui buton taie banda telefonului (Z de la 0 la grosime); întreruperea taie banda
     * buzei (de la fața telefonului în sus). Suprapuse pe aceeași lățime, cele două împreună
     * RETEAZĂ peretele pe toată înălțimea. Pe husa completă asta trece neobservat, fiindcă fundul
     * ține piesa; pe rama de probă, care n-are fund, inelul se rupe — iPhone 15 rigid ieșea în
     * trei bucăți, iPhone 16 în patru.
     *
     * Deci întreruperea se retrage la `PERETE_MIN` de orice fereastră de pe aceeași latură.
     */
    for (const f of ferestre.filter((x) => x.latura === latura)) {
      const fSt = f.centru - f.lungime / 2, fDr = f.centru + f.lungime / 2;
      if (fDr <= de || fSt >= pana) continue;              // nu se ating
      if (fSt <= de && fDr >= pana) { de = pana = 0; break; }  // fereastra o acoperă toată
      if (fSt <= de) de = fDr + PERETE_MIN; else pana = Math.min(pana, fSt - PERETE_MIN);
    }
    if (pana - de >= INTRERUPERE_MIN) out.push({ latura, de, pana });
  }
  return out;
}

/** sub atâta, o întrerupere de buză nu mai ajută la montare (mm) */
export const INTRERUPERE_MIN = 5;

/** tăietorul unei întreruperi: mănâncă doar banda buzei, de la fața telefonului în sus */
export function taietorIntrerupere(cfg: HusaConfig, seg: SegmentBuza): any {
  const t = cfg.telefon;
  return taietorFereastra(cfg, {
    nume: 'intrerupere buza', latura: seg.latura,
    centru: (seg.de + seg.pana) / 2, lungime: seg.pana - seg.de,
    zJos: fataZ(t), zSus: fataZ(t) + cfg.buzaEcran + 1,
    raza: 0, peretRamas: 0, brut: [seg.de, seg.pana],
    margine: { ceruta: 0, inceput: 0, sfarsit: 0 }, stramt: [], depasireColt: 0,
  });
}

/**
 * RAMA DE PROBĂ — șablonul 1 tăiat la 3 mm de la buza ecranului în jos, fără spate.
 *
 * Se printează în zece minute și spune ce niciun calcul nu spune: intră telefonul, și cade
 * decupajul camerei unde trebuie. De-aia păstrează fereastra camerei — altfel ar verifica doar
 * jocul, nu și alinierea.
 */
export const INALTIME_RAMA = 3;

export function ramaDeProba(cfg: HusaConfig, corp: any): any {
  const { Manifold } = MOD;
  const t = cfg.telefon;
  const sus = fataZ(t) + cfg.buzaEcran;
  const jos = sus - INALTIME_RAMA;
  // se taie cu un bloc mare, nu cu unul potrivit exact: fețele coplanare sunt fragile
  const lat = t.corp.latime + 40, lung = t.corp.lungime + 40;
  const taietor = Manifold.cube([lat, lung, jos + 100], true).translate([0, 0, (jos - 100) / 2 + 0]);
  const rama = corp.subtract(taietor);
  taietor.delete();
  return rama;
}

/** cat se intoarce buza dinspre spate peste fata din spate a telefonului (mm) */
export const BUZA_SPATE = 1.0;

/**
 * BUMPERUL: HUSA CU SPATELE DESCHIS, DAR CU BUZA (HUS.2.B1).
 *
 * Din peretele din spate ramane o buza de `BUZA_SPATE` de jur imprejur; restul se scoate.
 * Telefonul e prins intre doua buze — cea de pe fata ecranului si cea dinspre spate — si se vede
 * prin fereastra mare dintre ele.
 *
 * DE CE NU SE TAIE PUR SI SIMPLU LA `z = 0`. Prima varianta facea exact asta, iar piesa iesea
 * curata la toate masuratorile: o bucata, buza de sus continua, telefonul blocat cu 240-304 mm3
 * la ridicare. Numai ca il bloca DOAR pe fata: in spate nu mai era nimic de care sa se opreasca,
 * deci telefonul aluneca afara pe unde intrase, tinut doar de frecarea peretilor. Buza dinspre
 * spate inchide sensul ala.
 *
 * Retragerea se masoara de la CONTURUL TELEFONULUI, nu de la cavitate — aceeasi conventie ca la
 * `buzaEcran` (HUS.2.1): „buza 1,0" inseamna 1,0 mm de suprapunere peste spate, la orice joc.
 *
 * AMANDOUA BUZELE TREBUIE SA FIE CONTINUE pe tot conturul. O bucla intrerupta nu strange, se
 * desface — exact ce s-a intamplat la rama de proba, unde bresa camerei taia si peretele.
 * Masurat inainte de a construi, ca sa nu iasa o cerinta imposibila: pe husa completa buza de sus
 * e DEJA continua la toate cele opt modele (0 intreruperi in felia de la `fataZ + buza/2`),
 * fiindca ferestrele de butoane si port se opresc sub ea — ele taie peretele, unde le e treaba,
 * in 6-8 locuri.
 */
export function bumperDeschis(cfg: HusaConfig, corp: any): any {
  const { Manifold, CrossSection } = MOD;
  const t = cfg.telefon;
  const contur = new CrossSection([conturTelefon(t)], 'Positive');
  const inel = contur.offset(-BUZA_SPATE, 'Round');
  contur.delete();

  /*
   * BUZA SE DA LA O PARTE DIN DREPTUL INSULEI CAMEREI.
   *
   * Masurat din cote, pe toate cele opt modele complete: marginea insulei NU trece de marginea
   * interioara a buzei — dar la 17 Pro si 17 Pro Max o atinge exact, 0,00 mm marja (insula 69,8
   * mm pe un corp de 71,6; buza intra pana la 34,9, insula ajunge la 34,9). Deci astazi nu se
   * suprapun, dar sunt tangente la doua modele din opt.
   *
   * Fereastra e reuniunea dintre golul din mijloc si amprenta insulei cu marginea ei — aceeasi
   * regiune pe care husa completa o foloseste ca sa decupeze camera. Pe modelele de acum nu
   * schimba nimic (verificat: volum identic la toate opt). Rostul ei e ca la primul model cu
   * insula mai lata buza sa se retraga singura in dreptul ei, in loc sa se aseze CALARE pe insula
   * si sa impiedice telefonul sa intre. Alternativa ar fi fost subtierea buzei peste tot din
   * cauza unui singur model.
   */
  const { regiune: amprentaCamera } = regiuneDecupajCamera(cfg);
  const fereastra = inel.add(amprentaCamera);
  inel.delete(); amprentaCamera.delete();
  /*
   * FEREASTRA MERGE PANA JOS, nu doar prin placa din spate.
   *
   * Camera are pe husa completa un guler ridicat care tine lentila de pe masa; el sta pe placa
   * din spate si coboara sub ea — la SE 3 pana la −3,27, la 17 Pro Max pana la −6,83. Un cutter
   * oprit la grosimea placii il taia pe jumatate: partea dinauntrul ferestrei disparea, partea
   * de sub cutter ramanea, si iesea un ciot agatat de buza de 1 mm. Nu e nici guler, nici lipsa
   * de guler — e o bucata de nicaieri, si se vedea doar in bounding box.
   *
   * Bumperul n-are spate, deci n-are ce proteja: gulerul se scoate intreg. Asa `z` incepe fix la
   * `−grosimePerete`, adica fix la fata exterioara a buzei, si piesa e previzibila.
   */
  const gol = Manifold.extrude(fereastra, 200).translate([0, 0, -200 + 1]);
  fereastra.delete();
  const fara = corp.subtract(gol);
  gol.delete();

  /*
   * SI TOT CE MAI RAMANE SUB FATA BUZEI SE TAIE, ca spatele sa fie plan.
   *
   * Gulerul camerei nu sta doar in mijloc: la 15/15 Pro insula are 44 mm pe un corp de 71,6, deci
   * marginea ei ajunge la 1,5 mm de contur, iar gulerul se contopeste cu peretele. Partea aia e
   * IN AFARA ferestrei, deci scaderea de mai sus n-o atinge — ramanea o aripa care cobora pana la
   * −6,18 sub buza. Nu se vedea in volum si nici in numarul de bucati; se vedea in `z` minim, si
   * s-ar fi vazut si pe placa, fiindca piesa s-ar fi sprijinit pe aripa aia in loc de buza.
   *
   * Dupa taiere, spatele bumperului e plan la `−grosimePerete` si se printeaza culcat pe el.
   */
  const lat = t.corp.latime + 40, lung = t.corp.lungime + 40;
  const submers = Manifold.cube([lat, lung, 200], true).translate([0, 0, -100 - cfg.grosimePerete]);
  const out = fara.subtract(submers);
  submers.delete(); fara.delete();
  return out;
}

// ---------- ȘABLONUL 2 — decupajul camerei ----------

/** cât se ridică buza peste vârful lentilei (mm) */
export const MARJA_BUZA = 1.0;
/** peretele minim printabil, 3 linii la duza 0,4 (mm) */
export const PERETE_MIN = 1.2;

/**
 * REGIUNEA DECUPAJULUI = (insulă + margine) ∩ AMPRENTA CAVITĂȚII.
 *
 * Intersecția nu e o precauție, e regula. Fără ea, decupajul cu margine se poate întinde peste
 * peretele lateral și deschide o fantă în el — la iPhone 15 Pro insula ajunge la 1,04 mm de
 * marginea corpului, iar o margine de 1,0 mm plus racordul o duce exact acolo.
 *
 * Cu intersecția, decupajul se oprește singur la fața interioară a peretelui, oricât de mare ar
 * fi marginea cerută. Peretele rămâne întreg prin construcție, nu prin noroc.
 */
export function regiuneDecupajCamera(cfg: HusaConfig): { regiune: any; margini: MarginiDecupaj } {
  const { CrossSection } = MOD;
  const t = cfg.telefon, i = t.insulaCamera;
  const margini = marginiDecupaj({ x: i.x, y: i.y, latime: i.latime, inaltime: i.inaltime },
    { latime: t.corp.latime, lungime: t.corp.lungime }, cfg.margineCamera);

  const dorit = new CrossSection([conturDecupaj({ x: i.x, y: i.y, latime: i.latime, inaltime: i.inaltime },
    margini, i.razaColt)], 'Positive');
  const contur = new CrossSection([conturTelefon(t)], 'Positive');
  const cavitate = contur.offset(cfg.joc, 'Round');
  const regiune = dorit.intersect(cavitate);
  dorit.delete(); contur.delete(); cavitate.delete();
  return { regiune, margini };
}

/**
 * ÎNĂLȚIMEA BUZEI DIN JURUL CAMEREI.
 *
 * Cerută: până peste VÂRFUL LENTILEI, plus o marjă. B.6 scrie formula ca `proeminenta + 1,0`,
 * adică doar peste platou — dar măsurat pe cotele reale, pe trei din patru piloți lentila iese cu
 * încă 1,63–1,73 mm peste platou, deci buza aceea ar rămâne sub vârful ei cu 0,63–0,73 mm și
 * n-ar apăra nimic. Aici se socotește peste vârf: `proeminenta + max(proeminentaSuplimentara) + marjă`.
 *
 * Permisă: conul de keepout al fiecărei lentile o limitează, iar cel LARG e cel care strânge.
 * Se ia minimul peste toate lentilele, la distanța de la axa fiecăreia până la marginea
 * decupajului — acolo stă buza.
 */
export function inaltimeBuzaCamera(cfg: HusaConfig, margini: MarginiDecupaj): {
  ceruta: number; maximPermis: number; construita: number;
} {
  const i = cfg.telefon.insulaCamera;
  const varf = i.proeminenta + Math.max(0, ...i.lentile.map((l) => l.proeminentaSuplimentara));
  const ceruta = varf + MARJA_BUZA;

  // marginile decupajului, ca dreptunghi, ca să pot măsura distanța de la fiecare lentilă la el
  const stX = i.x - i.latime / 2 - margini.stanga, drX = i.x + i.latime / 2 + margini.dreapta;
  const joY = i.y - i.inaltime / 2 - margini.jos, suY = i.y + i.inaltime / 2 + margini.sus;
  let maximPermis = Infinity;
  for (const l of i.lentile) {
    const departare = Math.min(l.x - stX, drX - l.x, l.y - joY, suY - l.y);
    maximPermis = Math.min(maximPermis, inaltimeMaximaBuza(l.con, Math.max(0, departare)));
  }
  return { ceruta, maximPermis, construita: Math.min(ceruta, maximPermis) };
}

/**
 * ȘABLONUL 2 — decupajul camerei, plus buza de protecție.
 *
 * Decupajul se scade DOAR DIN SPATE: de sub fundul husei până la fața lui interioară (Z = 0).
 * Nu trece mai sus, deci nu poate atinge peretele lateral nici pe verticală, așa cum intersecția
 * din `regiuneDecupajCamera` îl oprește pe orizontală.
 */
export function decupajCamera(cfg: HusaConfig, corp: any): {
  corp: any; margini: MarginiDecupaj; buza: ReturnType<typeof inaltimeBuzaCamera>;
} {
  const { Manifold } = MOD;
  const g = cfg.grosimePerete;
  const { regiune, margini } = regiuneDecupajCamera(cfg);
  const buza = inaltimeBuzaCamera(cfg, margini);

  // gaura: de la 1 mm sub fundul husei până exact la fața interioară a spatelui
  const gaura = Manifold.extrude(regiune, g + 1).translate([0, 0, -g - 1]);
  let out = corp.subtract(gaura);
  gaura.delete();

  /**
   * BUZA e un inel în jurul decupajului, coborât sub fundul husei.
   *
   * Se ADAUGĂ, nu se scade: e material peste cel existent. Se sprijină pe fundul husei, deci nu
   * plutește. Pe laturile unde marginea s-a strâns la zero, inelul iese oricum din intersecția
   * cu amprenta cavității — acolo peretele lateral e chiar buza, cum spune regula.
   */
  if (buza.construita > 0.01) {
    const exterior = regiune.offset(cfg.grosimePerete, 'Round');
    const inel = exterior.subtract(regiune);
    if (inel.area() > 1e-6) {
      /**
       * BUZA INTRĂ `SUPRAPUNERE` ÎN FUNDUL HUSEI, nu se oprește la el.
       *
       * Lipită exact la Z = −g, atinge fundul într-un singur plan, iar două corpuri care se
       * ating pe o față coplanară nu se unesc: ies DOUĂ componente. Prins de testul de
       * conectivitate — volumul era corect, forma arăta corect, dar exportul ar fi dat un 3MF cu
       * două obiecte, adică fix ce interzice stratul 1 din A.2.
       *
       * Unirea trece prin `uneste`, care verifică intersecția înainte de boolean: dacă vreodată
       * suprapunerea dispare dintr-o schimbare de cote, se oprește cu eroare, nu livrează tăcut
       * două piese.
       */
      const corpBuza = Manifold.extrude(inel, buza.construita + SUPRAPUNERE)
        .translate([0, 0, -g - buza.construita]);
      const cu = uneste(out, corpBuza, 'buza camerei pe fundul husei');
      corpBuza.delete(); out.delete(); out = cu;
    }
    exterior.delete(); inel.delete();
  }
  regiune.delete();
  return { corp: out, margini, buza };
}

// ---------- ȘABLOANELE 3 și 4 — ferestre în peretele lateral ----------

/**
 * DE CE 3 ȘI 4 SUNT ACELAȘI LUCRU.
 *
 * Un buton, un port și o grilă de difuzor sunt, geometric, aceeași piesă: o fereastră în peretele
 * lateral, așezată pe un traseu drept, cu o întindere de-a lungul lui și o adâncime în perete.
 * Se deosebesc doar prin cotele care le dau întinderea și prin cât perete rămâne la exterior
 * (zero la decupaj, 0,8 mm la buton acoperit). Un singur tăietor le face pe toate; ce diferă e
 * calculul intervalelor, care stă separat, mai jos.
 *
 * ÎNĂLȚIMEA E ÎNTOTDEAUNA BANDA ÎNTREAGĂ, Z de la 0 la `corp.grosime`, și asta NU e o alegere de
 * comoditate — e singurul lucru pe care datele îl permit:
 *
 *   · `decupajeJos` și `decupajeSus` au doar `x` și `latime`. Nicio cotă pe Z. O fereastră
 *     parțială ar cere o poziție pe Z care nu există în ghid și pe care nu am voie s-o inventez.
 *   · La butoane există `latime` (întinderea pe Z), dar nu și centrul pe Z. Aceeași situație.
 *   · Cotele care EXISTĂ o confirmă: keepout-ul Camera Control e 8,40 mm pe Z, iar telefonul are
 *     7,81 mm grosime. Keepout-ul e mai înalt decât banda, deci nu poate fi respectat altfel
 *     decât tăind banda toată. La fel portul: 6,60 + 2 × 1,00 = 8,60 > 7,81.
 *
 * Deasupra benzii rămâne inelul buzei, dedesubt fundul husei: fereastra e o gaură în perete, nu o
 * despicare a piesei.
 */

/** cât se lărgește decupajul unui buton la fiecare capăt (mm) — B.6, șablonul 3: +1,5 pe lungime */
export const MARGINE_BUTON = 0.75;
/** cât perete rămâne peste un buton acoperit (mm) — B.6, șablonul 3 */
export const PERETE_SUBTIAT = 0.8;
/** marginea portului, pe fiecare latură (mm) — B.6, șablonul 4 */
export const MARGINE_PORT = 1.0;
/** sub atâta distanță, două decupaje de jos/sus se unesc (mm) — B.6, șablonul 4 */
export const DIST_UNIRE = 3.0;
/** raza capetelor unei ferestre, când nu vine din keepout (mm) */
export const RAZA_FEREASTRA = 1.0;
/**
 * Raza capetelor unei ferestre de keepout, când fișierul n-o dă (mm).
 *
 * Nu e cotă de telefon, e finisaj de piesă: pilotul avea 2,2, loturile noi o omit. O fereastră de
 * 25 mm cu colțuri de 1 mm arată tăiată cu foarfeca; 2,2 e ce avea deja modelul care o scria.
 */
export const RAZA_KEEPOUT = 2.2;

export type Latura = 'stanga' | 'dreapta' | 'jos' | 'sus';

export interface Fereastra {
  nume: string;
  latura: Latura;
  /** centrul pe axa de parcurs: Y la laturile laterale, X la jos/sus */
  centru: number;
  /** întinderea pe axa de parcurs, marginile incluse */
  lungime: number;
  zJos: number;
  zSus: number;
  raza: number;
  /** cât perete rămâne la exterior; 0 = decupaj adevărat */
  peretRamas: number;
  /** intervalul cotei brute, fără margini — pentru măsurători */
  brut: [number, number];
  /** marginea cerută și cea acordată la fiecare capăt */
  margine: { ceruta: number; inceput: number; sfarsit: number };
  /**
   * De ce s-a strâns marginea, când s-a strâns — DATE, nu propoziții: textul se compune în
   * interfață, prin dicționar, ca peste tot în proiect.
   */
  stramt: { capat: 'inceput' | 'sfarsit'; motiv: 'vecin' | 'colt' }[];
  /** cu cât intră fereastra în racordul colțului (mm); 0 = se oprește pe traseul drept */
  depasireColt: number;
}

/** capătul traseului drept al unei laturi: dincolo de el începe racordul colțului */
export function capatTraseuDrept(t: Telefon, latura: Latura): number {
  const total = (latura === 'stanga' || latura === 'dreapta') ? t.corp.lungime : t.corp.latime;
  return total / 2 - t.corp.razaColt;
}

interface Brut {
  nume: string; st: number; dr: number; ceruta: number; raza: number; peretRamas: number;
}

/**
 * FERESTRELE CARE NU POT LĂSA PUNTE SE UNESC.
 *
 * Dacă nici cotele brute, fără nicio margine, nu lasă `PERETE_MIN` între două ferestre, puntea
 * nu se poate construi: ar ieși un dinte mai subțire decât o linie de extrudare, care se rupe la
 * prima montare. Se scoate, nu se subțiază — aceeași alegere ca la decupajele de jos, unde regula
 * există deja în document.
 */
function uneste_cePreaAproape(brute: Brut[]): Brut[] {
  const ord = [...brute].sort((a, b) => a.st - b.st);
  const grupe: Brut[] = [];
  for (const b of ord) {
    const u = grupe[grupe.length - 1];
    if (u && b.st - u.dr < PERETE_MIN) {
      u.dr = Math.max(u.dr, b.dr);
      u.nume += ' + ' + b.nume;
      u.ceruta = Math.min(u.ceruta, b.ceruta);
      u.raza = Math.min(u.raza, b.raza);
      u.peretRamas = Math.min(u.peretRamas, b.peretRamas);
    } else grupe.push({ ...b });
  }
  return grupe;
}

/**
 * Ferestrele butoanelor de pe ambele laturi, cu marginile deja strânse.
 *
 * MARGINEA SE STRÂNGE CA SĂ RĂMÂNĂ PUNTE — aceeași regulă ca marginea camerei de la șablonul 2.
 * `MARGINE_BUTON` e o margine de CONFORT: butonul se apasă mai ușor printr-o gaură puțin mai
 * mare. `PERETE_MIN` e o cerință STRUCTURALĂ. Când se ceartă, cedează confortul.
 *
 * Se vede pe iPhone SE 3: butoanele de volum stau la 1,99 mm unul de altul. Cu +0,75 la fiecare
 * capăt ar rămâne 0,49 mm de material între ele. Cu regula asta, marginile se strâng la 0,395 și
 * puntea rămâne exact 1,20.
 *
 * Camera Control folosește `keepout.latime`, nu lungimea butonului, și nu primește margine peste
 * el: keepout-ul E deja degajarea cerută de Apple, nu o cotă de piesă peste care se mai adaugă.
 * Are `acoperibil: false`, deci nu ajunge niciodată perete subțiat.
 */
export function ferestreButoane(cfg: HusaConfig): Fereastra[] {
  const t = cfg.telefon;
  const out: Fereastra[] = [];
  for (const latura of ['stanga', 'dreapta'] as const) {
    const ale = t.butoane.filter((b) => b.latura === latura);
    if (!ale.length) continue;
    const capat = capatTraseuDrept(t, latura);
    const grupe = uneste_cePreaAproape(ale.map((b) => {
      /**
       * CONVENȚIA KEEPOUT: `inaltime` = întinderea pe Y, `latime` = pe X (în carcasă).
       *
       * Camera Control e o pilulă VERTICALĂ pe latura telefonului: 25,00 mm pe Y, 8,40 pe X.
       * Codul citea `latime` ca întindere pe Y, ceea ce mergea doar fiindcă pilotul `iphone-16`
       * avea cele două numere etichetate invers. La primul lot nou s-a văzut: fereastra ieșea
       * 8,40 mm pentru un buton de 17,10. Acum convenția e una singură, iar pilotul s-a
       * conformat — nicio cotă schimbată, doar două numere puse la locul lor.
       */
      const lung = b.keepout ? b.keepout.inaltime : b.lungime;
      return {
        nume: b.tip, st: b.y - lung / 2, dr: b.y + lung / 2,
        ceruta: b.keepout ? 0 : MARGINE_BUTON,
        raza: b.keepout?.razaColt ?? RAZA_KEEPOUT,
        peretRamas: (b.acoperibil && cfg.butoaneAcoperite) ? PERETE_SUBTIAT : 0,
      };
    }));

    for (let i = 0; i < grupe.length; i++) {
      const g = grupe[i];
      const stramt: Fereastra['stramt'] = [];
      /** cât poate crește un capăt fără să strice puntea spre vecin sau spre colț */
      const limita = (spre: 'inceput' | 'sfarsit'): number => {
        const vecin = spre === 'inceput' ? grupe[i - 1] : grupe[i + 1];
        // ce prisosește peste puntea minimă se împarte între cele două ferestre care o mărginesc
        const laVecin = vecin
          ? Math.max(0, (spre === 'inceput' ? g.st - vecin.dr : vecin.st - g.dr) - PERETE_MIN) / 2
          : Infinity;
        const laColt = Math.max(0, (capat - PERETE_MIN) - (spre === 'inceput' ? -g.st : g.dr));
        const lim = Math.min(laVecin, laColt);
        if (lim < g.ceruta - 1e-9) stramt.push({ capat: spre, motiv: laVecin < laColt ? 'vecin' : 'colt' });
        return Math.min(g.ceruta, lim);
      };
      const mInc = limita('inceput'), mSf = limita('sfarsit');
      out.push({
        nume: g.nume, latura,
        centru: ((g.st - mInc) + (g.dr + mSf)) / 2,
        lungime: (g.dr + mSf) - (g.st - mInc),
        zJos: 0, zSus: t.corp.grosime,
        raza: g.raza, peretRamas: g.peretRamas,
        brut: [g.st, g.dr],
        margine: { ceruta: g.ceruta, inceput: mInc, sfarsit: mSf },
        stramt,
        depasireColt: Math.max(0, Math.max(-(g.st - mInc), g.dr + mSf) - capat),
      });
    }
  }
  return out;
}

/**
 * Ferestrele de jos și de sus: portul plus grilele.
 *
 * PORTUL primește +1,0 mm pe latură; GRILELE nu primesc nimic. B.6 dă marginea explicit doar
 * portului, și are dreptate: în port intră un cablu care trebuie să treacă pe lângă husă, într-o
 * grilă nu intră nimic. Distincția nu e cosmetică — de ea depinde ce se unește: pe iPhone 15, cu
 * grilele la cotă brută, cea mai mică distanță rămâne 3,44 mm, deci difuzorul rămâne separat. Cu
 * +1,0 și pe grile ar fi coborât sub 3 și s-ar fi topit totul într-o singură gură de 40 mm.
 */
export function ferestreJosSus(cfg: HusaConfig): Fereastra[] {
  const t = cfg.telefon;
  const out: Fereastra[] = [];
  for (const latura of ['jos', 'sus'] as const) {
    /**
     * PE LATURA DE SUS NU SE TAIE FEREASTRA PENTRU MICROFON (DECIZIE, la sesizarea operatorului:
     * „gaura asta din partea de sus e inutila si urata vizual").
     *
     * Sunetul trece prin 1,4 mm de TPU; microfonul n-are nevoie de gaura, si de-aia husele de pe
     * piata nu taie muchia de sus. In schimb gaura se vede: e singura intrerupere de pe latura
     * aia, chiar in campul vizual cand tii telefonul.
     *
     * Si cotele o spun: la toate cele 24 de modele complete decupajul de sus e un „microfon" lat
     * de 14,0-14,5 mm, cand microfonul real de jos are 1,35 mm in aceleasi date. Peste zece ori
     * mai mare decat lucrul pe care ar trebui sa-l descopere. Latimea aia se corecteaza separat,
     * la recitirea datelor; regula de aici tine si dupa ce se corecteaza, fiindca nici un
     * microfon de 1,35 mm nu cere fereastra.
     *
     * Se filtreaza DOAR microfoanele, si doar sus: daca vreun model viitor pune difuzor sau port
     * pe muchia de sus, el se decupeaza in continuare.
     */
    const brute = latura === 'jos' ? t.decupajeJos : t.decupajeSus;
    const lista: { tip: string; x: number; latime: number }[] = brute
      .filter((d) => !(latura === 'sus' && d.tip === 'microfon'))
      .map((d) => ({ ...d }));
    if (latura === 'jos' && t.port && t.port.latura === 'jos' && t.port.latime > 0) {
      lista.push({ tip: t.port.tip, x: t.port.x, latime: t.port.latime + 2 * MARGINE_PORT });
    }
    if (!lista.length) continue;
    const capat = capatTraseuDrept(t, latura);
    for (const u of unesteDecupaje(lista, DIST_UNIRE)) {
      const depasire = Math.max(0, (Math.abs(u.x) + u.latime / 2) - capat);
      out.push({
        nume: u.tip, latura, centru: u.x, lungime: u.latime,
        zJos: 0, zSus: t.corp.grosime,
        raza: RAZA_FEREASTRA, peretRamas: 0,
        brut: [u.x - u.latime / 2, u.x + u.latime / 2],
        margine: { ceruta: 0, inceput: 0, sfarsit: 0 },
        stramt: [], depasireColt: depasire,
      });
    }
  }
  return out;
}

/**
 * TĂIETORUL unei ferestre.
 *
 * Secțiunea se desenează în planul (traseu, Z) — acolo se văd capetele rotunjite ale unei fante
 * de buton, așa cum le vede omul din afară. Extrudarea merge pe NORMALA peretelui, iar matricea
 * duce sistemul local acolo unde trebuie.
 *
 * Laturile opuse se fac prin OGLINDIRE, nu prin negarea unei coloane din matrice: o coloană
 * negată dă determinant negativ, adică normale întoarse pe dos, iar booleanul de după ar tăia
 * greșit fără să spună de ce.
 *
 * Pleacă din centrul piesei (0) spre exterior. Nu strică nimic pe drum: între Z = 0 și grosimea
 * telefonului interiorul e cavitatea, deci gol.
 */
export function taietorFereastra(cfg: HusaConfig, f: Fereastra): any {
  const { Manifold, CrossSection } = MOD;
  const t = cfg.telefon;
  const lateral = f.latura === 'stanga' || f.latura === 'dreapta';
  const jumatate = (lateral ? t.corp.latime : t.corp.lungime) / 2;
  // până unde merge tăietorul pe normală: la decupaj trece dincolo de perete, la buton acoperit
  // se oprește cu `peretRamas` înainte de fața exterioară
  const h = jumatate + cfg.joc + cfg.grosimePerete - f.peretRamas + (f.peretRamas > 0 ? 0 : 2);

  const cs = new CrossSection([dreptunghiRotunjit(f.lungime, f.zSus - f.zJos, f.raza)], 'Positive')
    .translate([f.centru, (f.zJos + f.zSus) / 2]);
  const solid = Manifold.extrude(cs, h);
  cs.delete();

  // coloanele = imaginile axelor locale; ambele variante au determinant +1
  const M = lateral
    // local x → Y, local y → Z, local z → +X
    ? [0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1]
    // local x → X, local y → Z, local z → −Y
    : [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1];
  let asezat = solid.transform(M as any);
  solid.delete();
  if (f.latura === 'stanga' || f.latura === 'sus') {
    const oglindit = asezat.mirror(lateral ? [1, 0, 0] : [0, 1, 0]);
    asezat.delete(); asezat = oglindit;
  }
  return asezat;
}

/** puntea de material dintre două ferestre vecine, sau dintre o fereastră și colț */
export interface PunteFereastra {
  latura: Latura;
  /** numele ferestrelor care mărginesc puntea; `null` = capătul traseului drept (colțul) */
  de: string | null;
  pana: string | null;
  /** lățimea punții rămase (mm); negativă = fereastra a trecut de colț */
  latime: number;
}

/**
 * PUNȚILE DINTRE FERESTRE ȘI PÂNĂ LA COLȚ.
 *
 * Se măsoară pe intervalele CONSTRUITE, nu pe cotele din JSON: marginile, strângerea lor și
 * unirile schimbă exact ce contează. „Colț" e punctul în care peretele drept se termină și începe
 * racordul — dincolo de el fereastra nu mai taie un perete plan, ci unul care se curbează.
 */
export function puntiFerestre(cfg: HusaConfig, ferestre: Fereastra[]): PunteFereastra[] {
  const out: PunteFereastra[] = [];
  const st = (f: Fereastra) => f.centru - f.lungime / 2;
  const dr = (f: Fereastra) => f.centru + f.lungime / 2;
  for (const latura of ['stanga', 'dreapta', 'jos', 'sus'] as Latura[]) {
    const ale = ferestre.filter((f) => f.latura === latura).sort((a, b) => st(a) - st(b));
    if (!ale.length) continue;
    const capat = capatTraseuDrept(cfg.telefon, latura);
    out.push({ latura, de: null, pana: ale[0].nume, latime: st(ale[0]) + capat });
    for (let i = 1; i < ale.length; i++) {
      out.push({ latura, de: ale[i - 1].nume, pana: ale[i].nume, latime: st(ale[i]) - dr(ale[i - 1]) });
    }
    out.push({ latura, de: ale[ale.length - 1].nume, pana: null, latime: capat - dr(ale[ale.length - 1]) });
  }
  return out;
}

/**
 * ȘABLOANELE 3 ȘI 4 — scad ferestrele din corp.
 *
 * Toate deodată, într-o singură scădere: tăietorii care se ating între ei (butoane de volum la
 * 1,2 mm punte) se contopesc întâi în plan, deci booleanul cu corpul nu mai vede fețe coplanare
 * la fiecare pas.
 */
export function aplicaFerestre(cfg: HusaConfig, corp: any, ferestre: Fereastra[]): any {
  if (!ferestre.length) return corp;
  const taietori = ferestre.map((f) => taietorFereastra(cfg, f));
  let tot = taietori[0];
  for (let i = 1; i < taietori.length; i++) {
    const nou = tot.add(taietori[i]);
    if (i > 1) tot.delete();
    tot = nou;
  }
  const out = corp.subtract(tot);
  if (taietori.length > 1) tot.delete();
  for (const x of taietori) x.delete();
  return out;
}

// ---------- ȘABLONUL 6 — tăieturi de flexibilitate ----------

/** lățimea unei tăieturi de flex (mm) — B.6, șablonul 6 */
export const LATIME_FLEX = 0.8;
/** cu cât se dă tăietura la o parte pe arcul colțului, când camera i-a luat locul (grade) */
export const MUTARE_FLEX = 22.5;

export interface TaieturaFlexHusa {
  nume: string;
  /** punctul de pe conturul telefonului unde iese tăietura */
  punct: Punct;
  /** direcția spre exterior (grade) */
  unghi: number;
  /** cu câte grade s-a mutat de pe diagonala colțului */
  mutat: number;
  /** distanța până la decupajul camerei, în locul ales (mm) */
  departare: number;
  /** false = niciun loc de pe arcul colțului nu e destul de departe; tăietura nu se face */
  asezat: boolean;
}

/**
 * Distanța în plan dintre două regiuni 2D, căutată prin dilatare (mm).
 *
 * manifold nu dă distanțe, dă intersecții. Se dilată prima regiune până atinge a doua; cât a
 * trebuit dilatată E distanța. Peste `max` întoarce `max`: nu interesează cât de departe sunt
 * lucrurile care oricum nu se ating.
 */
export function distantaPlan(a: any, b: any, max = 8): number {
  const acum = a.intersect(b);
  const seAting = acum.area() > 1e-9;
  acum.delete();
  if (seAting) return 0;
  let jos = 0, sus = max;
  for (let k = 0; k < 16; k++) {
    const mij = (jos + sus) / 2;
    const dil = a.offset(mij, 'Round');
    const comun = dil.intersect(b);
    const atinge = comun.area() > 1e-9;
    dil.delete(); comun.delete();
    if (atinge) sus = mij; else jos = mij;
  }
  return sus;
}

/**
 * ȘABLONUL 6 — TĂIETURI DE FLEXIBILITATE LA COLȚURI (doar presetul rigid).
 *
 * Un PETG nu se întinde. Ca telefonul să intre, colțul husei trebuie să se poată deschide, iar o
 * fantă de 0,8 mm prin peretele lateral îi dă unde. Fanta merge de la fața interioară a spatelui
 * (Z = 0) până peste buză: dacă s-ar opri sub buză, tocmai inelul care trebuie să se depărteze ar
 * rămâne întreg. Sub Z = 0 nu coboară, fiindcă acolo e BALAMAUA: fundul husei, materialul pe care
 * colțul se îndoaie în loc să se rupă.
 *
 * DE CE SE DĂ LA O PARTE DIN DREPTUL CAMEREI (DECIZIE, B.6, cu motivul măsurat aici).
 * Decupajul camerei scoate fundul husei de la −perete până la Z = 0. Fanta de flex scoate
 * peretele de la Z = 0 în sus. Puse în același loc, nu lasă o punte îngustă între ele: nu lasă
 * NIMIC — peretele e retezat pe toată înălțimea, iar balamaua pe care ar trebui să se îndoaie
 * colțul nu mai există acolo.
 *
 * ÎNCOTRO SE MUTĂ SE MĂSOARĂ, NU SE DEDUCE. Prima variantă alegea latura după cât spațiu lasă
 * insula până la marginea corpului, iar pe cotele reale cele două laturi ale colțului ies la
 * 0,01–0,19 mm una de alta: alegerea se făcea pe zgomot. Aici se caută pe arcul colțului poziția
 * de la care decupajul camerei e la cel puțin `PERETE_MIN`, pornind de la diagonală și
 * depărtându-se în ambele sensuri.
 *
 * DACĂ NU EXISTĂ NICIUNA, TĂIETURA NU SE FACE. Pe iPhone 15, 15 Pro și 16 insula camerei ajunge
 * la ~1,2 mm de două laturi ale corpului, deci decupajul ei acoperă tot arcul colțului de sus:
 * oriunde ai pune fanta, retezi peretele. Trei colțuri care se îndoaie sunt mai bune decât patru
 * dintre care unul e rupt din fabrică.
 */
export function taieturiFlex(cfg: HusaConfig): TaieturaFlexHusa[] {
  if (cfg.material !== 'rigid') return [];
  const { CrossSection } = MOD;
  const t = cfg.telefon, i = t.insulaCamera;
  const colturi = pozitiiFlexColt(t.corp.latime, t.corp.lungime, t.corp.razaColt);
  const nume = ['dreapta-sus', 'stanga-sus', 'stanga-jos', 'dreapta-jos'];

  // colțul camerei = cel mai apropiat de centrul insulei
  let coltCamera = 0, celMaiAproape = Infinity;
  colturi.forEach((c, k) => {
    const d = Math.hypot(c.centru[0] - i.x, c.centru[1] - i.y);
    if (d < celMaiAproape) { celMaiAproape = d; coltCamera = k; }
  });

  const { regiune } = regiuneDecupajCamera(cfg);
  const pePozitie = (c: typeof colturi[0], grade: number): Punct => {
    const rad = (c.unghi + grade) * Math.PI / 180;
    return [c.centruRacord[0] + c.raza * Math.cos(rad), c.centruRacord[1] + c.raza * Math.sin(rad)];
  };
  const departareaDe = (p: Punct): number => {
    const s = new CrossSection([dreptunghiRotunjit(LATIME_FLEX, LATIME_FLEX, 0)], 'Positive').translate(p);
    const d = distantaPlan(s, regiune);
    s.delete();
    return d;
  };

  const out = colturi.map((c, k): TaieturaFlexHusa => {
    if (k !== coltCamera) {
      return { nume: nume[k], punct: c.centru, unghi: c.unghi, mutat: 0,
        departare: Infinity, asezat: true };
    }
    // se caută pe arc, pornind de la diagonală și depărtându-se în ambele sensuri
    let cea = { grade: 0, d: departareaDe(c.centru) };
    for (let g = MUTARE_FLEX; g <= 45 + 1e-9 && cea.d < PERETE_MIN; g += MUTARE_FLEX) {
      for (const semn of [1, -1]) {
        const d = departareaDe(pePozitie(c, semn * g));
        if (d > cea.d) cea = { grade: semn * g, d };
        if (cea.d >= PERETE_MIN) break;
      }
    }
    return {
      nume: nume[k], punct: pePozitie(c, cea.grade), unghi: c.unghi + cea.grade,
      mutat: cea.grade, departare: cea.d, asezat: cea.d >= PERETE_MIN,
    };
  });
  regiune.delete();
  return out;
}

/**
 * Tăietorul unei fante de flex: o lamă subțire, întoarsă pe direcția colțului, care traversează
 * peretele de la cavitate până dincolo de fața exterioară.
 */
export function taietorFlex(cfg: HusaConfig, f: TaieturaFlexHusa): any {
  const { Manifold } = MOD;
  const t = cfg.telefon;
  const sus = fataZ(t) + cfg.buzaEcran;
  const adanc = cfg.joc + cfg.grosimePerete + 2;   // de la contur, spre exterior
  const inalt = sus + 1;                            // de la Z = 0 în sus, cu 1 mm peste buză
  const lama = Manifold.cube([adanc, LATIME_FLEX, inalt], true)
    .rotate([0, 0, f.unghi])
    .translate([
      f.punct[0] + Math.cos(f.unghi * Math.PI / 180) * (adanc / 2 - 1),
      f.punct[1] + Math.sin(f.unghi * Math.PI / 180) * (adanc / 2 - 1),
      inalt / 2,
    ]);
  return lama;
}

export function aplicaFlex(cfg: HusaConfig, corp: any, taieturi: TaieturaFlexHusa[]): any {
  const facute = taieturi.filter((f) => f.asezat);
  if (!facute.length) return corp;
  const lame = facute.map((f) => taietorFlex(cfg, f));
  let tot = lame[0];
  for (let k = 1; k < lame.length; k++) {
    const nou = tot.add(lame[k]);
    if (k > 1) tot.delete();
    tot = nou;
  }
  const out = corp.subtract(tot);
  if (lame.length > 1) tot.delete();
  for (const x of lame) x.delete();
  return out;
}

// ---------- B.10 — MANECHINUL ----------

/** cât ies butoanele din corp, în manechin (mm) — B.10 */
export const RELIEF_BUTON = 0.5;

/**
 * MANECHINUL — telefonul desenat în husă, ca omul să vadă alinierea înainte să printeze.
 *
 * NU SE EXPORTĂ NICIODATĂ. Nu apare în `exportBodies`, deci nu poate ajunge într-un 3MF nici din
 * greșeală: e doar un `SceneObject` translucid.
 *
 * CORPUL FOLOSEȘTE CAVITATEA SCOBITĂ (contur + joc), NU CONTURUL NOMINAL. Cu conturul nominal,
 * telefonul ar apărea plutind, cu o fantă de 0,25 mm de jur împrejur, iar omul ar citi jocul —
 * care e corect și intenționat — drept greșeală. Manechinul răspunde la „stă bine în husă?", nu
 * la „ce dimensiune are telefonul?"; pentru a doua întrebare există fișa de producție.
 *
 * INSULA, LENTILELE ȘI BLIȚUL rămân la cota NOMINALĂ: acolo întrebarea chiar e de aliniere —
 * cade fereastra camerei peste insulă? — și un contur umflat ar ascunde exact abaterea căutată.
 *
 * BUTOANELE: lungimea și lățimea sunt cote reale, dar POZIȚIA LOR PE Z NU EXISTĂ în ghidul Apple
 * (vezi șablonul 3). În manechin sunt desenate la mijlocul benzii. E o alegere de DESEN, nu o
 * cotă: nu intră în nicio geometrie exportată, iar alinierea care contează — pe Y, față de
 * fereastra husei — e exactă.
 */
export function manechinTelefon(cfg: HusaConfig): any {
  const { Manifold, CrossSection } = MOD;
  const t = cfg.telefon, i = t.insulaCamera;

  const contur = new CrossSection([conturTelefon(t)], 'Positive');
  const cavitate = contur.offset(cfg.joc, 'Round');
  contur.delete();
  let corp = Manifold.extrude(cavitate, fataZ(t));
  cavitate.delete();

  const adauga = (piesa: any, unde: string) => {
    const nou = uneste(corp, piesa, unde);
    piesa.delete(); corp.delete(); corp = nou;
  };

  // insula camerei: iese din spate, adică spre Z negativ, și intră `SUPRAPUNERE` în corp
  if (i.latime > 0 && i.inaltime > 0 && i.proeminenta > 0) {
    const cs = new CrossSection([dreptunghiRotunjit(i.latime, i.inaltime, i.razaColt)], 'Positive')
      .translate([i.x, i.y]);
    const platou = Manifold.extrude(cs, i.proeminenta + SUPRAPUNERE)
      .translate([0, 0, -i.proeminenta]);
    cs.delete();
    adauga(platou, 'insula camerei pe manechin');
  }
  for (const [k, l] of i.lentile.entries()) {
    if (!(l.diametru > 0)) continue;
    const h = i.proeminenta + Math.max(0, l.proeminentaSuplimentara) + SUPRAPUNERE;
    const cil = Manifold.cylinder(h, l.diametru / 2, l.diametru / 2, 48, false)
      .translate([l.x, l.y, -(h - SUPRAPUNERE)]);
    adauga(cil, `lentila ${k} pe manechin`);
  }
  if (i.blit && i.blit.diametru > 0) {
    const h = i.proeminenta + SUPRAPUNERE;
    const cil = Manifold.cylinder(h, i.blit.diametru / 2, i.blit.diametru / 2, 32, false)
      .translate([i.blit.x, i.blit.y, -(h - SUPRAPUNERE)]);
    adauga(cil, 'blitul pe manechin');
  }

  // butoanele: relief pe laterale, la mijlocul benzii
  for (const b of t.butoane) {
    if (!(b.lungime > 0 && b.latime > 0)) continue;
    const semn = b.latura === 'dreapta' ? 1 : -1;
    const gros = RELIEF_BUTON + SUPRAPUNERE;
    const cub = Manifold.cube([gros, b.lungime, b.latime], true)
      .translate([semn * (t.corp.latime / 2 + cfg.joc + RELIEF_BUTON / 2 - SUPRAPUNERE / 2),
        b.y, t.corp.grosime / 2]);
    adauga(cub, `butonul ${b.tip} pe manechin`);
  }

  return corp;
}

// ---------- ORCHESTRATORUL ----------

/**
 * Construiește husa, în ordinea în care șabloanele au voie să se scadă unul din altul.
 *
 * ORDINEA NU E ARBITRARĂ. Camera înaintea ferestrelor, fiindcă tăietura de flex se așază după
 * unde a ajuns decupajul camerei. Flexul la sfârșit, fiindcă e singurul care taie prin tot ce
 * s-a construit înainte. Rama de probă se decupează din piesa GATA, nu se construiește separat:
 * altfel ar putea ieși o ramă care se potrivește pe un telefon pe care husa nu se potrivește.
 */
export function buildHusa(cfg: HusaConfig, placa: { w: number; d: number }): HusaResult {
  const t0 = Date.now();
  const t = cfg.telefon;

  const corp1 = corpHusa(cfg);
  const r2 = decupajCamera(cfg, corp1);
  corp1.delete();

  const keepOut = decupajeKeepOut(cfg);
  const cuKeepOut = aplicaKeepOut(cfg, r2.corp, keepOut);
  if (cuKeepOut !== r2.corp) r2.corp.delete();

  /**
   * NICI DECUPAJELE FUNCTIONALE NU SE PUN PE RAMA DE PROBA.
   *
   * Aceeasi cauza ca la flex, cu alt simptom. Rama e o banda de 3 mm de sub buza, iar ferestrele
   * de butoane si port se intind pe toata inaltimea peretelui — deci taie fix prin banda aia.
   * Masurat pe felie, la jumatatea inaltimii inelului: 6 arce la 15 Pro, 7 la 15, 8 la 16 Pro /
   * 16 Pro Max / 17 Pro / 17 Pro Max, 9 la 16. Doar SE 3 scapa cu unul singur, fiindca are mai
   * putine decupaje.
   *
   * DE CE N-A PRINS-O NIMENI PANA ACUM: numaratoarea de componente pe VOLUM raporta „1 bucata",
   * si pe drept — ferestrele nu acopera toata inaltimea benzii peste tot, deci piesa ramane
   * legata pe deasupra sau pe dedesubtul unora. Un inel ciuruit la mijloc si intreg pe margini e
   * o singura componenta. Felia il vede, volumul nu.
   *
   * Rama intreaba „intra telefonul si cade decupajul camerei unde trebuie?". Butoanele si portul
   * n-au ce raspunde acolo: relieful lor sta sub banda, deci nici nu impiedica montarea. Singura
   * intrerupere ramane bresa camerei.
   */
  const ferestre = cfg.ceExporti === 'rama' ? [] : [...ferestreButoane(cfg), ...ferestreJosSus(cfg)];
  const corp3 = aplicaFerestre(cfg, cuKeepOut, ferestre);
  if (corp3 !== cuKeepOut) cuKeepOut.delete();

  /**
   * FLEXUL NU SE PUNE PE RAMA DE PROBĂ.
   *
   * Aceeași cauză ca la colțul camerei: fanta se sprijină pe fundul husei, care e balamaua pe
   * care colțul se îndoaie. Rama n-are fund — e doar inelul de 3 mm de sub buză. O fantă acolo
   * nu slăbește un colț, ci taie inelul în două. Prins de test: rigid + ramă ieșea în 3 bucăți
   * la 15/15 Pro/16 și în 4 la SE 3, exact câte fante se așezaseră.
   *
   * Nu e o pierdere: rama întreabă „intră telefonul și cade decupajul camerei unde trebuie?",
   * nu „se îndoaie colțul?". A doua întrebare o pune husa completă.
   */
  /*
   * NICI BUMPERUL NU PRIMESTE FLEX, din aceeasi cauza ca rama.
   *
   * Fanta de flex se sprijina pe fundul husei, care e balamaua pe care coltul se indoaie.
   * Bumperul n-are fund: o fanta acolo n-ar slabi un colt, ci ar taia inelul. Si nici n-are ce
   * castiga — un inel deschis in spate se indoaie oricum.
   */
  const flex = cfg.ceExporti === 'husa' ? taieturiFlex(cfg) : [];
  const corp4 = aplicaFlex(cfg, corp3, flex);
  if (corp4 !== corp3) corp3.delete();

  let corp = corp4;
  if (cfg.ceExporti === 'bumper') {
    corp = bumperDeschis(cfg, corp4);
    corp4.delete();
  }

  let bresa: BresaRama | null = null;
  let gravare: string | null = null;
  if (cfg.ceExporti === 'rama') {
    corp = ramaDeProba(cfg, corp);
    corp4.delete();
    // breșa camerei: se taie DUPĂ trunchiere, ca să atingă doar inelul
    bresa = bresaRama(cfg);
    if (bresa) {
      /**
       * BRESA SE TAIE DOAR DIN BUZA, NU SI DIN PERETELE LATERAL.
       *
       * Banda de 3 mm a ramei are doua zone pe Z: peretele lateral, intre `0` si `fataZ(t)` —
       * partea care imbraca grosimea telefonului — si buza, intre `fataZ(t)` si `fataZ(t) +
       * buzaEcran`, ledgeul care se intoarce peste fata. Retentia vine din amandoua: peretele
       * strange conturul, buza tine telefonul sa nu iasa pe fata.
       *
       * Taietorul mergea de la `sus − INALTIME_RAMA − 1`, adica prin toata banda si dincolo de
       * ea. Inelul iesea deschis complet pe latura camerei: nu doar fereastra de inspectie
       * lipsea, ci si peretele de sub ea, iar rama devenea un „C" care se desface la colturile
       * de sus. Bresa exista ca sa se vada alinierea insulei, nu ca sa taie retentia.
       *
       * `zJos = fataZ(t)` opreste taietorul exact la trecerea perete → buza. Sub el peretele
       * ramane bucla inchisa pe tot conturul; deasupra, buza are o singura intrerupere.
       */
      const sus = fataZ(t) + cfg.buzaEcran;
      const taietor = taietorFereastra(cfg, {
        nume: 'camera', latura: bresa.latura, centru: bresa.centru, lungime: bresa.lungime,
        zJos: fataZ(t), zSus: sus + 1,
        raza: RAZA_FEREASTRA, peretRamas: 0, brut: [0, 0],
        margine: { ceruta: 0, inceput: 0, sfarsit: 0 }, stramt: [], depasireColt: 0,
      });
      const cu = corp.subtract(taietor);
      taietor.delete(); corp.delete(); corp = cu;
    }
    const g = gravareRama(cfg, corp, cfg.fontGravare);
    if (g) { corp.delete(); corp = g.corp; gravare = g.text; }
  }

  /**
   * SPATELE ÎNAINTE DE MARCAJ. Marcajul e ultimul lucru care atinge piesa: dacă o decorare ar
   * veni peste el, insula netedă din textură — stratul 2 — ar fi mâncată tocmai de ce trebuia
   * s-o scoată în evidență.
   */
  let spate: RaportSpate | null = null;
  if (cfg.ceExporti === 'husa' && cfg.spate) {
    const r = spateHusa(cfg, corp, cfg.spate);
    if (r.corp !== corp) corp.delete();
    corp = r.corp;
    spate = r.raport;
  }

  /**
   * MARCAJUL, DOAR PE HUSA COMPLETĂ. Rama de probă e un consumabil de atelier de zece minute,
   * nu un produs livrat: n-are ce semna, iar textura de 30 × 15 mm nici n-ar încăpea pe un inel
   * de 3 mm.
   */
  let marcaj: RaportMarcaj | null = null;
  if (cfg.ceExporti !== 'rama' && cfg.marcaj) {
    /*
     * AMÂNDOUĂ ZONELE SUNT PE FEȚE EXTERIOARE, dar cadrele lor diferă, deci și corecția aplicată
     * inelelor diferă — vezi `pregatesteInele`. Nucleul nu se atinge: corectura stă aici, unde
     * se știe pe ce suprafață ajunge marcajul.
     */
    const peSina = cfg.ceExporti === 'bumper';
    const unde = peSina ? 'sina' : 'spate';
    const m = cfg.marcaj;
    const r = aplicaMarcaj(corp, {
      ...m,
      siluetaSemnatura: () => pregatesteInele(m.siluetaSemnatura(), unde),
      logo: m.logo ? { ...m.logo, contururi: pregatesteInele(m.logo.contururi, unde) } : m.logo,
      regiune: peSina ? regiuneMarcajBumper(cfg) : regiuneMarcajHusa(cfg),
    });
    if (r.corp !== corp) corp.delete();
    corp = peSina
      ? microMarcajBumper(cfg, r.corp, r.raport.microText)
      : microMarcajHusa(cfg, r.corp, r.raport.microText);
    if (corp !== r.corp) r.corp.delete();
    marcaj = r.raport;
  }

  /**
   * CIOBURILE SE SCOT ÎNAINTE DE ORICE MĂSURĂTOARE (regulă de nucleu).
   *
   * Aici, nu în șablonul care le-a produs: o piesă trece prin șase scăderi, iar oricare poate
   * lăsa resturi. Un singur loc, pe drumul tuturor, e mai ieftin decât șase precauții care se
   * pot uita. Și e ÎNAINTE de diagnostic, ca `bucati` să spună ce iese la export, nu ce a fost
   * pe drum.
   */
  const curat = curataCioburi(corp, `husa ${t.id}`);
  if (curat.corp !== corp) corp.delete();
  corp = curat.corp;

  const bb = corp.boundingBox();
  const amprenta: [number, number] = [bb.max[0] - bb.min[0], bb.max[1] - bb.min[1]];
  const limita = t.corp.grosimeMaxHusaSpate ?? null;

  /**
   * GROSIMEA ÎN AFARA CAMEREI, măsurată pe piesă, nu socotită din parametri.
   *
   * Se scoate din piesă amprenta camerei — coloana verticală de deasupra și de sub decupaj — și
   * se măsoară ce rămâne. Dacă cineva ar ridica vreodată spatele ca să înglobeze platoul, cifra
   * asta ar sări imediat; una calculată ca `telefon + perete + joc` ar rămâne frumoasă și
   * mincinoasă.
   */
  const { regiune: ampCam } = regiuneDecupajCamera(cfg);
  /**
   * Zona camerei include ȘI INELUL BUZEI, care stă în AFARA regiunii decupajului. Fără offset,
   * „în afara camerei" ar fi cuprins tocmai buza de protecție, iar cifra ar fi ieșit egală cu
   * maximul piesei — adică n-ar fi măsurat nimic.
   */
  const zonaCamera = ampCam.offset(cfg.grosimePerete + 0.1, 'Round');
  const inaltimeTotala = bb.max[2] - bb.min[2];
  const coloanaCamera = MOD.Manifold.extrude(zonaCamera, inaltimeTotala + 4).translate([0, 0, bb.min[2] - 2]);
  ampCam.delete(); zonaCamera.delete();
  const faraCamera = corp.subtract(coloanaCamera);
  coloanaCamera.delete();
  const bbFara = faraCamera.boundingBox();
  const inAfaraCamerei = faraCamera.volume() > 1e-9 ? bbFara.max[2] - bbFara.min[2] : inaltimeTotala;
  faraCamera.delete();
  const pesteTelefon = inAfaraCamerei - t.corp.grosime;

  const diagnostic: HusaDiagnostic = {
    inaltimeTotala,
    amprenta,
    volumCM3: corp.volume() / 1000,
    marginiCamera: r2.margini,
    buzaCamera: r2.buza,
    ferestre, punti: puntiFerestre(cfg, ferestre), flex,
    /**
     * GROSIMEA SPATELUI SE JUDECĂ DOAR ÎN INELUL DE ÎNCĂRCARE (B.8).
     *
     * `grosimeMaxHusaSpate` e limita peste care încărcarea magnetică nu mai trece — 2,1 mm la
     * modelele cu inel, 5,0 la SE. În afara cercului husa poate fi oricât de groasă. Fără
     * delimitarea asta, avertismentul ar fi apărut pe toată piesa la parametrii impliciți, adică
     * ar fi devenit zgomot pe care omul învață să-l ignore.
     */
    /*
     * ...SI DOAR CAND ZONA CHIAR E PASTRATA PLINA.
     *
     * Cu MagSafe oprit spatele e perforat intentionat peste cerc, deci nu mai exista cuplaj de
     * protejat: o avertizare de grosime acolo ar fi despre o insusire la care omul tocmai a
     * renuntat. Un avertisment fals-pozitiv nu e neutru — e felul in care oamenii invata sa
     * ignore avertismentele adevarate.
     */
    incarcare: t.corp.zonaIncarcare && !(cfg.spate?.stil === 'perforat' && cfg.spate.magsafe === false)
      ? { grosimeSpate: cfg.grosimePerete, limita,
        peste: limita !== null && cfg.grosimePerete > limita + 1e-9 }
      : null,
    bucati: corp.decompose().length,
    triunghiuri: corp.numTri(),
    incapePePlaca: amprenta[0] <= placa.w && amprenta[1] <= placa.d,
    bresa, gravare,
    /**
     * CEA MAI SUBȚIRE SECȚIUNE A PIESEI, spusă pe față (fișa de producție).
     *
     * Ferestrele laterale țin banda întreagă pe Z, deci ce rămâne deasupra lor e buza ecranului
     * plus cât iese sticla peste corp. La modelele cu ramă plată sticla nu iese deloc, deci
     * rămâne exact buza — 1,00 mm la parametrii impliciți. E normal și e printabil (cinci
     * straturi la 0,2 mm), dar e locul unde piesa cedează prima dată, deci se scrie.
     */
    bandaPesteFerestre: t.ecran.proeminentaFataDeCorp + cfg.buzaEcran,
    grosime: {
      totala: inaltimeTotala, inAfaraCamerei, pesteTelefon,
      contributiaHusei: inAfaraCamerei - fataZ(t),
      tinta: TINTA_PESTE_TELEFON,
      peste: (inAfaraCamerei - fataZ(t)) > TINTA_PESTE_TELEFON + 1e-9,
    },
    retentie: {
      segmente: cfg.material === 'rigid' ? 2 * 2 : 1,   // rigid: două întreruperi taie inelul în patru arce
      suprapunereCeruta: cfg.buzaEcran,
    },
    marcaj, spate, keepOut, cioburiSterse: 0, volumCioburi: 0,
  };
  diagnostic.cioburiSterse = curat.sterse;
  diagnostic.volumCioburi = curat.volumSters;
  return { corp, diagnostic, ms: Date.now() - t0 };
}

/**
 * PIESA GATA DE PRINT: coborâtă cu fundul la Z = 0.
 *
 * Husa se construiește cu spatele telefonului la Z = 0, deci fundul ei stă la −grosimePerete.
 * Trimisă așa la slicer, ar pluti sub placă. Întoarce un corp NOU: cel din arenă rămâne al
 * previzualizării, iar conducta de export îl ia în stăpânire pe acesta.
 */
export function pentruPrint(corp: any): any {
  const bb = corp.boundingBox();
  return corp.translate([0, 0, -bb.min[2]]);
}

// ---------- RAMA DE PROBĂ — breșa camerei și gravarea ----------

/** înălțimea literelor gravate pe ramă (mm) */
export const INALTIME_GRAVARE = 1.4;
/** cât de adânc se gravează (mm) */
export const ADANCIME_GRAVARE = 0.3;

/** latura de care stă camera: cea de care insula e mai aproape */
export function laturaCamerei(t: Telefon): 'sus' | 'jos' {
  const i = t.insulaCamera;
  const pana = {
    sus: t.corp.lungime / 2 - (i.y + i.inaltime / 2),
    jos: (i.y - i.inaltime / 2) + t.corp.lungime / 2,
  };
  return pana.sus <= pana.jos ? 'sus' : 'jos';
}

export interface BresaRama {
  latura: 'sus' | 'jos';
  centru: number;
  lungime: number;
  /** cât din întinderea insulei a rămas dincolo de tangenta colțului și s-a tăiat */
  taiatLaColt: number;
}

/**
 * BREȘA CAMEREI ÎN INELUL RAMEI (B.6, corectat la HUS.1).
 *
 * Rama n-are spate. Decupajul camerei se scade DIN SPATE, între −perete și Z = 0, adică sub tot
 * ce rămâne din ramă — deci în ramă nu poate exista ca decupaj. Ce poate exista e o BREȘĂ în
 * inelul de 3 mm, pe latura de care stă camera: pui rama pe telefon, te uiți prin ea și vezi dacă
 * insula cade unde trebuie față de marginile breșei.
 *
 * ÎNTINDEREA E CEA A INSULEI, TĂIATĂ LA TRASEUL DREPT. Insula depășește tangenta colțului la toți
 * piloții — dacă breșa ar merge după ea, ar mânca tocmai colțul, adică lucrul pentru care se
 * printează rama. Cât s-a tăiat se raportează, nu se ascunde.
 */
export function bresaRama(cfg: HusaConfig): BresaRama | null {
  const t = cfg.telefon, i = t.insulaCamera;
  if (!(i.latime > 0)) return null;
  const latura = laturaCamerei(t);
  const capat = capatTraseuDrept(t, latura);
  const st = Math.max(-capat, i.x - i.latime / 2);
  const dr = Math.min(capat, i.x + i.latime / 2);
  if (dr - st < 1) return null;   // sub un milimetru nu e o breșă, e o zgârietură
  const dorit = i.latime;
  return { latura, centru: (st + dr) / 2, lungime: dr - st, taiatLaColt: dorit - (dr - st) };
}

/** eticheta scurtă a modelului, din slug: `iphone-15-pro` → `15 Pro`, `iphone-se-3` → `SE 3` */
const CUVINTE_MODEL: Record<string, string> = {
  pro: 'Pro', max: 'Max', plus: 'Plus', mini: 'mini', se: 'SE', air: 'Air',
};
export function etichetaScurta(id: string): string {
  return id.replace(/^iphone-?/, '').split('-')
    .map((c) => CUVINTE_MODEL[c] ?? c).join(' ').trim();
}

/**
 * Ce scrie pe ramă: modelul și jocul cu care a fost construită.
 *
 * Fără ele, patru rame printate în aceeași după-amiază sunt patru inele identice la ochi. Jocul e
 * jumătatea care contează: dacă operatorul printează aceeași ramă la 0,25 și la 0,30 ca să vadă
 * care intră mai bine, cifra de pe piesă e singurul lucru care i le mai deosebește după ce le-a
 * scos de pe placă.
 */
export function textGravare(cfg: HusaConfig): string {
  return `${etichetaScurta(cfg.telefon.id)} · ${cfg.joc.toFixed(2).replace('.', ',')}`;
}

/**
 * GRAVAREA pe fața de sus a inelului, pe latura OPUSĂ camerei.
 *
 * Sus, fiindcă acolo inelul e cel mai lat: între deschiderea ecranului și fața exterioară sunt
 * `buză + perete` milimetri, iar la parametrii impliciți asta înseamnă 2,40 — destul pentru
 * litere de 1,4 mm cu margine de o parte și de alta. Pe laterale ar fi rămas 1,00 mm de bandă
 * peste ferestre, adică nimic.
 *
 * Pe latura opusă camerei, fiindcă acolo e breșa; și fiindcă la citire ții rama cu camera în sus.
 *
 * Textul se micșorează singur dacă nu încape pe porțiunea dreaptă a laturii: o gravare care intră
 * în racordul colțului iese strâmbă și nu se mai citește.
 */
export function gravareRama(cfg: HusaConfig, rama: any, font: any): { corp: any; text: string; inaltime: number } | null {
  if (!font) return null;
  const { Manifold } = MOD;
  const t = cfg.telefon;
  const text = textGravare(cfg);
  const latimeInel = cfg.buzaEcran + cfg.grosimePerete;
  const inaltimeMax = Math.min(INALTIME_GRAVARE, latimeInel - 1.0);
  if (inaltimeMax < 0.6) return null;

  const disponibil = 2 * capatTraseuDrept(t, laturaCamerei(t) === 'sus' ? 'jos' : 'sus') * 0.9;
  let inaltime = inaltimeMax;
  const solidDin = (h: number) => {
    const sil = siluetaText(font, text, h, 'interioara');
    const sol = Manifold.extrude(sil, ADANCIME_GRAVARE + 1);
    sil.delete();
    return sol;
  };
  let solid = solidDin(inaltime);
  let bb = solid.boundingBox();
  const latime = bb.max[0] - bb.min[0];
  if (latime > disponibil) {
    inaltime = inaltime * (disponibil / latime);
    solid.delete();
    solid = solidDin(inaltime);
    bb = solid.boundingBox();
  }

  // inelul de sus: între offset(joc − buză) și offset(joc + perete); mijlocul lui e la
  const mijlocInel = cfg.joc + (cfg.grosimePerete - cfg.buzaEcran) / 2;
  const semn = laturaCamerei(t) === 'sus' ? -1 : 1;   // gravarea stă pe latura opusă camerei
  const sus = fataZ(t) + cfg.buzaEcran;
  const asezat = solid.translate([
    -(bb.min[0] + bb.max[0]) / 2,
    semn * (t.corp.lungime / 2 + mijlocInel) - (bb.min[1] + bb.max[1]) / 2,
    sus - ADANCIME_GRAVARE - bb.min[2],
  ]);
  solid.delete();
  const corp = rama.subtract(asezat);
  asezat.delete();
  return { corp, text, inaltime };
}

// ---------- HUS.2.4 — MARCAJUL (integrarea SEM.1) ----------

/** cât de departe de muchia de jos a spatelui se așază zona de marcaj (mm) */
export const MARGINE_ZONA_MARCAJ = 3;

/**
 * ZONA DE MARCAJ A HUSEI — pe spate, lângă muchia de jos, opusă camerei.
 *
 * Nucleul nu ghicește zona dintr-un bounding box, fiindcă la o husă ar nimeri pe insula camerei.
 * Aici se dă explicit: jos, unde spatele e liber de decupaj și unde mâna acoperă piesa oricum.
 *
 * ABATERE DE LA STRATUL 3 (A.2), DE RAPORTAT, NU REPARATĂ DE MINE.
 * A.2 cere ca zona să stea pe RACORDUL CURBAT dintre spate și muchia de jos, tocmai ca un petec
 * plan lipit în slicer să nu se potrivească. Husa asta n-are un asemenea racord: spatele e o
 * placă plană de `grosimePerete`, iar peretele urcă vertical din ea. Chiar dacă i-aș rotunji
 * muchia exterioară, arcul ar avea sub 2,2 mm înălțime de suprafață, iar stratul 2 cere o zonă
 * texturată de minimum 30 × 15 mm — pe un arc de 2 mm nu încape.
 *
 * Deci marcajul stă pe SPATELE PLAN. Straturile 1, 2 și 4 rămân întregi (un singur corp,
 * semnătură ca insulă în textură, poarta derivată din licență); stratul 3 nu e satisfăcut, și
 * n-are cum să fie pe geometria asta fără o decizie de produs: ori racord mult mai mare (schimbă
 * silueta husei), ori zonă de textură mai mică decât cere A.2.
 */
export function regiuneMarcajHusa(cfg: HusaConfig): RegiuneMarcaj {
  const t = cfg.telefon;
  const latime = Math.min(TEXTURA_LATIME_MIN, 2 * capatTraseuDrept(t, 'jos'));
  const inaltime = TEXTURA_INALTIME_MIN;
  const y = -(t.corp.lungime / 2 + cfg.joc) + MARGINE_ZONA_MARCAJ + inaltime / 2;
  return {
    // fața exterioară a spatelui; normala iese din piesă, adică în jos pe Z
    centru: [0, y, -cfg.grosimePerete],
    normala: [0, 0, -1],
    tangenta: [1, 0, 0],
    latime, inaltime,
  };
}

/**
 * CEL MAI LUNG TRONSON DREPT LIBER DE PE O SINA LATERALA (HUS.2.B2).
 *
 * „Liber" = intre racordurile de colt si in afara ferestrelor de butoane, cu `PERETE_MIN` de o
 * parte si de alta ca marcajul sa nu inceapa exact la muchia unui decupaj. La butoanele cu
 * keepout se ia intinderea keepout-ului, nu a butonului: fereastra reala e a keepout-ului.
 *
 * Se calculeaza din DATE, nu din geometria construita: e nevoie de el inainte sa existe piesa,
 * ca sa se stie unde se aseaza zona de marcaj.
 */
export function tronsonLiberSina(t: Telefon, latura: 'stanga' | 'dreapta'): { centru: number; lungime: number } {
  const y0 = -t.corp.lungime / 2 + t.corp.razaColt;
  const y1 = t.corp.lungime / 2 - t.corp.razaColt;
  const ocupate: [number, number][] = [];
  for (const b of t.butoane) {
    if (b.latura !== latura) continue;
    // conventia keepout: `inaltime` = intinderea pe Y, adica de-a lungul sinei
    const lung = b.keepout ? b.keepout.inaltime : b.lungime;
    ocupate.push([b.y - lung / 2 - PERETE_MIN, b.y + lung / 2 + PERETE_MIN]);
  }
  ocupate.sort((a, b) => a[0] - b[0]);

  let cursor = y0;
  let best = { centru: 0, lungime: 0 };
  const propune = (a: number, b: number) => {
    const lg = b - a;
    if (lg > best.lungime) best = { centru: (a + b) / 2, lungime: lg };
  };
  for (const [a, b] of ocupate) {
    if (a > cursor) propune(cursor, Math.min(a, y1));
    cursor = Math.max(cursor, b);
  }
  if (cursor < y1) propune(cursor, y1);
  return best;
}

/**
 * ZONA DE MARCAJ A BUMPERULUI: sina din DREAPTA, jumatatea de jos (DECIZIE, HUS.2.B2).
 *
 * Bumperul n-are spate, deci marcajul nu poate sta unde sta la husa completa. Sina de jos pare
 * candidatul evident, dar exact acolo intra decupajul portului, centrat. Sina din stanga se
 * strange la 26-34 mm pe familia 16/17, fiindca Camera Control ii mananca mijlocul. Dreapta da
 * 61-76 mm liberi pe toate cele opt modele complete, mereu in jumatatea de jos — masurat din
 * date, nu presupus.
 *
 * Orientarea: normala spre exteriorul sinei (+X), tangenta de-a lungul ei (+Y), deci textul curge
 * spre varful telefonului. Cu „sus" = +Z, un cititor asezat in +X are dreapta la +Y — cadrul e
 * consistent.
 *
 * Inaltimea zonei e toata fata exterioara, de la spatele deschis pana la varful buzei: `fataZ +
 * buzaEcran`, adica 8,8-9,8 mm dupa model. Banda semnaturii vizibile are 7 mm, deci ramane peste
 * un milimetru de margine de fiecare parte.
 */
export function regiuneMarcajBumper(cfg: HusaConfig): RegiuneMarcaj {
  const t = cfg.telefon;
  const tronson = tronsonLiberSina(t, 'dreapta');
  // fata exterioara a sinei: de sub buza dinspre spate pana la varful celei de pe fata
  const jos = -cfg.grosimePerete, sus = fataZ(t) + cfg.buzaEcran;
  const inaltimeFata = sus - jos;
  return {
    centru: [t.corp.latime / 2 + cfg.joc + cfg.grosimePerete, tronson.centru, (jos + sus) / 2],
    normala: [1, 0, 0],
    tangenta: [0, 1, 0],
    latime: tronson.lungime,
    inaltime: inaltimeFata,
  };
}

/**
 * MICRO-MARCAJUL (A.3), pe fața INTERIOARĂ a spatelui.
 *
 * Acolo nu-l vede nimeni în folosire: e sub telefon. Nu e opțional și nu apare în UI — dacă
 * apare pe piață un fișier „curat", se știe din ce licență a ieșit.
 *
 * Se gravează în sus, în cavitate: 0,3 mm dintr-un spate de 1,4 nu-l slăbește, iar telefonul nu
 * stă pe fundul husei, ci pe pereți.
 */
export function microMarcajHusa(cfg: HusaConfig, corp: any, text: string): any {
  if (!cfg.fontGravare || !text) return corp;
  const { Manifold } = MOD;
  const t = cfg.telefon;
  /**
   * MICRO-MARCAJUL PRIMEȘTE ȘI EL PUNȚI.
   *
   * E mic și ascuns, dar se printează la fel: „M3D 2026-09-06" are goluri în 0, 6, 3 și D, iar
   * fără punți fiecare rămâne un pinten izolat pe fundul gravurii. Că nu-l citește nimeni nu-l
   * face să se printeze mai bine.
   */
  const sil = siluetaText(cfg.fontGravare, text, MICRO_INALTIME, 'interioara');
  const cuPunti = puntiPeGoluri(sil, PUNTE_MICRO);
  if (cuPunti.cs !== sil) sil.delete();
  const solid = Manifold.extrude(cuPunti.cs, MICRO_ADANCIME + 1);
  cuPunti.cs.delete();
  const bb = solid.boundingBox();
  const latimeText = bb.max[0] - bb.min[0];
  const disponibil = 2 * capatTraseuDrept(t, 'jos') * 0.9;
  let final = solid;
  if (latimeText > disponibil) {
    const k = disponibil / latimeText;
    final = solid.scale([k, k, 1]);
    solid.delete();
  }
  const b2 = final.boundingBox();
  // jos în cavitate, sub zona de marcaj exterioară, cu fața gravată în sus dinspre Z = 0
  /**
   * ADÂNCIMEA MICRO-MARCAJULUI E `MICRO_ADANCIME`, NU MAI MULT.
   *
   * Prima așezare punea tăietorul între −1,00 și +0,30 mm: gravura intra 1,0 mm într-un spate de
   * 1,4 și lăsa 0,4 sub ea. Nu se vedea în volum — 12 mm³ dintr-o piesă de 18 000 — și nici pe
   * ecran, fiindcă e pe fața dinăuntru. A ieșit la iveală abia când felia de la 0,98 mm sub fața
   * exterioară a arătat material lipsă acolo unde nu avea ce căuta.
   *
   * Acum tăietorul stă între −0,30 și +1,00: scoate exact `MICRO_ADANCIME` din placă, iar restul
   * iese în cavitate, unde nu e nimic de tăiat.
   */
  const asezat = final.translate([
    -(b2.min[0] + b2.max[0]) / 2,
    -(t.corp.lungime / 2) + MARGINE_ZONA_MARCAJ + MICRO_INALTIME - (b2.min[1] + b2.max[1]) / 2,
    -b2.min[2] - MICRO_ADANCIME,
  ]);
  final.delete();
  const out = corp.subtract(asezat);
  asezat.delete();
  return out;
}

/**
 * MICRO-MARCAJUL BUMPERULUI (A.3) — pe fața INTERIOARĂ a șinei din stânga.
 *
 * Bumperul n-are spate, deci n-are fundul cavității în care husa completă își gravează micro-
 * marcajul. Fără o așezare proprie, `microMarcajHusa` ar tăia în aer: cutter-ul ar cădea sub
 * `z = 0`, unde bumperul nu mai are material, iar amprenta ar dispărea în tăcere — exact genul de
 * lipsă pe care volumul n-o arată, fiindcă nu s-a scos nimic de nicăieri.
 *
 * Se pune pe partea opusă semnăturii, ca să nu se calce: semnătura e pe șina dreaptă, amprenta pe
 * interiorul celei stângi. Acolo n-o vede nimeni la folosire — e sub telefon, ca și la husă.
 *
 * ORIENTAREA E ACEEAȘI CA PE ȘINA EXTERIOARĂ, și nu din întâmplare: cititorul stă tot în +X
 * (aici înăuntrul cavității, acolo în afara piesei) și privește tot spre −X. Fața s-a întors, dar
 * s-a întors și partea din care se citește, iar cele două se anulează. Deci silueta se pregătește
 * la fel — Y întors o dată, X neatins.
 */
export function microMarcajBumper(cfg: HusaConfig, corp: any, text: string): any {
  if (!cfg.fontGravare || !text) return corp;
  const { Manifold } = MOD;
  const t = cfg.telefon;

  const sil = siluetaText(cfg.fontGravare, text, MICRO_INALTIME, 'interioara');
  const cuPunti = puntiPeGoluri(sil, PUNTE_MICRO);
  if (cuPunti.cs !== sil) sil.delete();
  const solid = Manifold.extrude(cuPunti.cs, MICRO_ADANCIME + 1);
  cuPunti.cs.delete();

  const tronson = tronsonLiberSina(t, 'stanga');
  const bb = solid.boundingBox();
  const latimeText = bb.max[0] - bb.min[0];
  const disponibil = tronson.lungime * 0.9;
  let final = solid;
  if (latimeText > disponibil) {
    const k = disponibil / latimeText;
    final = solid.scale([k, k, 1]);
    solid.delete();
  }

  /**
   * Centrat în cadrul LOCAL, apoi adus pe șină cu permutarea ciclică (x, y, z) → (y, z, x):
   * X local ajunge de-a lungul șinei, Y local pe verticală, Z local pe normala peretelui. E o
   * rotație curată (determinant +1), nu o oglindire — dacă ar fi oglindire, textul ar ieși
   * întors și verificarea de orientare ar cădea.
   *
   * Cutter-ul stă între −`MICRO_ADANCIME` și +1 pe Z local, deci intră exact `MICRO_ADANCIME` în
   * perete și restul în cavitate, unde n-are ce tăia.
   */
  const b2 = final.boundingBox();
  const centrat = final.translate([
    -(b2.min[0] + b2.max[0]) / 2,
    -(b2.min[1] + b2.max[1]) / 2,
    -b2.min[2] - MICRO_ADANCIME,
  ]);
  final.delete();
  const xFata = -(t.corp.latime / 2 + cfg.joc);
  const asezat = centrat.transform([
    0, 1, 0, 0,
    0, 0, 1, 0,
    1, 0, 0, 0,
    xFata, tronson.centru, (fataZ(t) + cfg.buzaEcran) / 2, 1,
  ]);
  centrat.delete();
  const out = corp.subtract(asezat);
  asezat.delete();
  return out;
}

// ---------- HUS.2.3 — ȘABLONUL 5, SPATELE ----------

/**
 * STILURILE SPATELUI.
 *
 * „gravat" si „perforat" sunt DOUA OPTIUNI SEPARATE, nu una (addendum HUS.2): un model sapat
 * lasa husa inchisa, unul perforat o strapunge si se vede telefonul prin el. Diferenta se vede
 * la print si se simte la mana, deci se alege, nu se deduce.
 */
export type StilSpate = 'plin' | 'tipar-gravat' | 'perforat' | 'nume-gravat' | 'nume-decupat';
export type ColtSnur = 'fara' | 'stanga-jos' | 'dreapta-jos';

/** cât se lasă liber de la marginea spatelui până la decorare (mm) */
export const MARGINE_SPATE = 3;
/** distanța minimă cerută între text și decupajul camerei (mm) — B.8 */
export const DIST_TEXT_CAMERA = 3;
/** adâncimea gravării pe spate (mm) */
export const ADANCIME_GRAVARE_SPATE = 0.5;
/** lățimea unei punți care ține un contur interior de litera lui (mm) */
export const PUNTE_LITERA = 0.8;
/** diametrul orificiului de șnur (mm) */
export const DIAM_SNUR = 3;
/** puntea care ține conturul interior al unei litere din micro-marcaj (mm) */
export const PUNTE_MICRO = 0.35;

export interface RaportSpate {
  stil: StilSpate;
  /** cate gauri au fost omise fiindca ar fi cazut in inelul de incarcare */
  gauriOmise: number;
  /**
   * Daca zona de incarcare a fost ocolita. `null` la stilurile fara gauri: acolo intrebarea
   * n-are obiect, si un `false` ar spune ca s-a renuntat la ceva ce nici nu se punea.
   */
  magsafe: boolean | null;
  /** cate gauri au ramas */
  gauri: number;
  /** cat material s-a pierdut prin subtierea puntilor sub prag (mm²); 0 = niciuna era subtire */
  ariaSubPrag: number;
  /** distanța măsurată de la decorare la decupajul camerei (mm); Infinity = fără decorare */
  panaLaCamera: number;
  /** conturi interioare (O, A, B…) care ar fi căzut și au primit punte */
  puntiAdaugate: number;
  /** true = s-a cerut decupat, dar textul nu putea fi decupat și a rămas gravat */
  fortatGravat: boolean;
  aria: number;
}

/**
 * ZONA DECORABILĂ A SPATELUI.
 *
 * Ce rămâne din spate după ce se scot: marginea (decorarea nu ajunge pe racordul cu peretele),
 * zona camerei cu tot cu buza ei, și zona de marcaj de la bază. Ultima nu e negociabilă — acolo
 * stau textura și semnătura (A.2, stratul 2), iar un nume decupat peste ele ar face marcajul
 * ilizibil, adică exact ce încearcă stratul să împiedice.
 */
export function zonaSpate(cfg: HusaConfig): any {
  const { CrossSection } = MOD;
  const t = cfg.telefon;
  const contur = new CrossSection([conturTelefon(t)], 'Positive');
  const util = contur.offset(cfg.joc + cfg.grosimePerete - MARGINE_SPATE, 'Round');
  contur.delete();

  const { regiune } = regiuneDecupajCamera(cfg);
  const zonaCam = regiune.offset(cfg.grosimePerete + DIST_TEXT_CAMERA, 'Round');
  regiune.delete();
  const faraCamera = util.subtract(zonaCam);
  util.delete(); zonaCam.delete();

  const rm = regiuneMarcajHusa(cfg);
  const zonaMarcaj = new CrossSection([dreptunghiRotunjit(rm.latime + 2 * MARGINE_SPATE,
    rm.inaltime + 2 * MARGINE_SPATE, 2)], 'Positive').translate([rm.centru[0], rm.centru[1]]);
  const out = faraCamera.subtract(zonaMarcaj);
  faraCamera.delete(); zonaMarcaj.delete();
  return out;
}

/**
 * PUNȚILE CARE ȚIN CONTURURILE INTERIOARE.
 *
 * La un text DECUPAT, mijlocul lui „O" e o insulă: după tăiere cade din piesă și rămâne pe placă.
 * B.8 dă două ieșiri — punți, sau forțarea modului gravat. Aici se pun punți, fiindcă un „O" fără
 * mijloc nu mai e un „O".
 *
 * Puntea e o bară VERTICALĂ prin centrul golului, care iese din el în sus și în jos: taie
 * trăsătura literei în două locuri, deci leagă insula de restul spatelui prin material continuu.
 * Se scade din TĂIETOR, nu se adaugă la piesă — ce nu se taie rămâne.
 */
/**
 * PUNȚILE TEXTULUI DECUPAT — acum din nucleu (`core/primitive/plan.ts`).
 *
 * Aceeași nevoie a apărut și la marcaj: mijlocul lui „O" trebuie legat de restul, ori că e tăiat
 * prin spate, ori că e gravat. Al doilea consumator o mută în nucleu; aici rămâne doar alegerea
 * de produs — cât de lată e puntea.
 */
function puntiPentruGoluri(cutter: any, _latimeText: number): { cutter: any; punti: number } {
  const r = puntiPeGoluri(cutter, PUNTE_LITERA);
  return { cutter: r.cs, punti: r.punti };
}

/**
 * PE CE FAȚĂ STĂ TEXTUL — și, de aici, din ce parte se citește.
 *
 * `interioara` = fața gravată are normala spre **+Z**, deci se citește DIN PARTEA în care s-a
 * gravat: fundul cavității (micro-marcajul) și fața de sus a inelului ramei de probă. Rama n-are
 * „interior", dar criteriul nu e apartenența, ci sensul citirii.
 *
 * `exterioara` = normala spre **−Z**, adică fața exterioară a spatelui, cea care stă pe placă la
 * print. Textul de acolo se citește de pe partea OPUSĂ celei pe care e gravat.
 *
 * Măsurat, nu presupus: se sondează materialul de deasupra și de dedesubtul gropii. Semnătura și
 * numele de pe spate au groapa la z −1,40..−0,90 cu material numai deasupra — se deschid în jos.
 * Micro-marcajul, la −0,30..0,00, și eticheta ramei, la 8,51..8,81, au material numai dedesubt.
 */
export type FataText = 'interioara' | 'exterioara';

/**
 * SILUETA UNUI TEXT, GATA DE AȘEZAT PE PIESĂ — întoarsă după fața care o poartă.
 *
 * Două corecții, nu una, fiindcă sunt două cauze diferite:
 *
 * **Y, întotdeauna.** `textSolid` întoarce glife în convenția `getPath`, cu Y ÎN JOS: linia de
 * bază stă la Y mare. Pusă ca atare într-un spațiu cu Y în sus, litera iese răsturnată pe
 * verticală — „L" ajunge „Γ". Se vede doar pe glife asimetrice, deci a stat ascunsă în spatele
 * unor „ANA" și „M3D".
 *
 * **X, doar pe fața exterioară.** Cititorul stă în partea în care arată normala feței. Pentru
 * fața exterioară a spatelui (normala −Z) el privește dinspre −Z spre +Z, iar cu „sus" = +Y
 * modelul îi arată +X la STÂNGA. Un text scris de-a lungul lui +X îi iese deci oglindit. Cele
 * două fețe cer oglindiri INVERSE: ce e corect pe una e greșit pe cealaltă.
 *
 * Prima corectură le-a tratat la fel — Y pe toate trei — și a reparat numai jumătatea de sus a
 * problemei. Micro-marcajul, care e pe fața interioară, chiar a ieșit bine; semnătura și numele,
 * care sunt pe cea exterioară, au rămas oglindite pe fața care contează.
 *
 * DE CE AICI ȘI NU ÎN `textSolid`. Acolo ar fi un singur loc, dar `textSolid` e folosit de
 * unsprezece din cele douăsprezece generatoare înghețate (DECIZIA 1: nicio modificare de
 * geometrie la ele). Mai rău: o RĂSTURNARE nu schimbă nici volumul, nici numărul de triunghiuri,
 * nici componentele — exact cotele pe care le compară regresia. S-ar fi oglindit textul în toate
 * cele douăsprezece, în tăcere, cu regresia verde. Și, oricum, orientarea nu e o proprietate a
 * textului, ci a feței pe care ajunge: `textSolid` n-are de unde s-o știe.
 *
 * Semnătura NU trece pe aici — ea intră în `aplicaMarcaj`, unde `matriceCadru` îi întoarce Y-ul.
 * Oglindirea ei pe X se face la intrare, în `buildHusa`; vezi `oglindesteX`.
 */
export function siluetaText(font: any, text: string, inaltime: number, fata: FataText): any {
  const brut = textSolid(font, text, inaltime, 1);
  const sil = brut.project();
  brut.delete();
  const peY = sil.mirror([0, 1]);
  sil.delete();
  if (fata === 'interioara') return peY;
  const peX = peY.mirror([1, 0]);
  peY.delete();
  return peX;
}

/**
 * INELE 2D OGLINDITE PE O AXA, cu ordinea punctelor întoarsă la loc.
 *
 * Negarea unei coordonate inversează sensul de parcurgere al fiecărui inel, iar nucleul
 * construiește `CrossSection` cu regula `NonZero`: un contur exterior devenit invers ar fi citit
 * ca gaură, și marcajul ar ieși ca un dreptunghi plin cu litere scoase din el. Inversarea
 * ordinii îl pune la loc.
 */
function oglindesteInele(inele: Ring[], axa: 'x' | 'y'): Ring[] {
  return inele.map((inel) => inel
    .map(([x, y]) => (axa === 'x' ? [-x, y] : [x, -y]) as [number, number])
    .reverse());
}

/**
 * CUM SE PREGĂTESC INELELE PENTRU O REGIUNE — și de ce nu e aceeași operație peste tot.
 *
 * `matriceCadru` duce X-ul local în `tangenta` și Y-ul local în `normala × tangenta`. Textul
 * iese corect doar dacă, după transformare, X-ul local ajunge la DREAPTA cititorului și Y-ul
 * local în SUS — iar cititorul stă în partea în care arată normala. Cele două regiuni ale
 * proiectului au cadre diferite, deci cer corecții diferite:
 *
 *   SPATELE   n = (0,0,−1), t = (+X)  →  b = n × t = (0,−1,0)
 *             Cititorul (din −Z, cu sus = +Y) are dreapta la −X, deci `t` îi cade în STÂNGA:
 *             trebuie oglindit pe X. Pe verticală însă `b` arată deja în jos, ceea ce anulează
 *             convenția Y-jos a lui `textSolid` — deci Y-ul NU se atinge.
 *
 *   ȘINA      n = (+1,0,0), t = (0,+1,0)  →  b = n × t = (0,0,+1)
 *             Cititorul (din +X, cu sus = +Z) are dreapta la +Y, deci `t` îi cade exact la
 *             dreapta: X-ul NU se atinge. Dar `b` arată în sus, deci nu mai compensează nimic
 *             convenția Y-jos — trebuie oglindit pe Y.
 *
 * Măsurat, cu un „L" asimetric, în cadrul cititorului: pe șină, cu oglindirea de spate aplicată
 * din inerție, ieșea (+0,83; +0,67) — adică rotit 180°, exact ce prezice tabelul de mai sus.
 */
function pregatesteInele(inele: Ring[], unde: 'spate' | 'sina'): Ring[] {
  return oglindesteInele(inele, unde === 'spate' ? 'x' : 'y');
}

/** aria semnată a unui inel; pozitivă = contur exterior, negativă = gaură */
function ariaInel(inel: Punct[]): number {
  let a = 0;
  for (let i = 0; i < inel.length; i++) {
    const [x1, y1] = inel[i], [x2, y2] = inel[(i + 1) % inel.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

/** distanța de la un punct la un segment */
function distPctSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/**
 * Atinge inelul discul (cx, cy, raza)?
 *
 * Exact, și fără nicio operație de geometrie: e destul ca vreo latură să treacă la mai puțin de
 * rază de centru, sau ca centrul să fie înăuntru. Un test doar pe VÂRFURI ar rata o celulă care
 * taie discul cu o latură — la un pas de 8 mm și o rază de 28,75, o coardă de 8 mm intră 0,28 mm
 * peste cerc, adică exact cât să lase o crestătură în zona care trebuia să rămână plină.
 */
function atingeDiscul(inel: Punct[], cx: number, cy: number, raza: number): boolean {
  for (let i = 0; i < inel.length; i++) {
    const [ax, ay] = inel[i], [bx, by] = inel[(i + 1) % inel.length];
    if (distPctSegment(cx, cy, ax, ay, bx, by) <= raza) return true;
  }
  let inauntru = false;
  for (let i = 0, j = inel.length - 1; i < inel.length; j = i++) {
    const [xi, yi] = inel[i], [xj, yj] = inel[j];
    if ((yi > cy) !== (yj > cy) && cx < ((xj - xi) * (cy - yi)) / (yj - yi) + xi) inauntru = !inauntru;
  }
  return inauntru;
}

export interface ParamSpate {
  stil: StilSpate;
  text: string;
  /** fontul textului de pe spate; lipsa lui coboară stilul la `plin` */
  font?: any;
  inaltimeText: number;
  tipar: ParamTipar;
  snur: ColtSnur;
  /**
   * COMPATIBILITATE MAGSAFE, doar la spatele perforat; implicit pornită.
   *
   * Husa printată n-are magneți — nu se pot printa. „Compatibil MagSafe" înseamnă că spatele
   * rămâne PLIN și subțire în cercul `zonaIncarcare`, ca magnetul din telefon și din încărcător
   * să se atragă prin material. Perforarea acolo slăbește cuplajul.
   *
   * Oprit, perforarea merge uniform peste tot spatele: piesa arată curat, dar nu se mai prinde de
   * încărcătorul magnetic. E un compromis pe care îl alege omul, nu unul pe care îl luăm noi.
   */
  magsafe?: boolean;
}

/**
 * ȘABLONUL 5 — SPATELE.
 *
 * Se aplică ÎNAINTE de marcaj: marcajul e ultimul lucru care atinge piesa, ca stratul 2 (insula
 * netedă în textură) să nu fie mâncat de o decorare pusă peste el.
 */
export function spateHusa(cfg: HusaConfig, corp: any, p: ParamSpate): { corp: any; raport: RaportSpate } {
  const { Manifold, CrossSection } = MOD;
  const t = cfg.telefon;
  const g = cfg.grosimePerete;
  const magsafe = p.magsafe !== false;
  const raport: RaportSpate = { stil: p.stil, gauriOmise: 0, gauri: 0, ariaSubPrag: 0,
    magsafe: p.stil === 'perforat' ? magsafe : null,
    panaLaCamera: Infinity, puntiAdaugate: 0, fortatGravat: false, aria: 0 };
  let out = corp;

  const zona = zonaSpate(cfg);
  raport.aria = zona.area();

  if (p.stil === 'perforat' || p.stil === 'tipar-gravat') {
    const b = zona.bounds();
    const ex = (b.max[0] - b.min[0]) / 2 + p.tipar.pas;
    const ey = (b.max[1] - b.min[1]) / 2 + p.tipar.pas;
    const R = Math.hypot(ex, ey);
    const pereti = tipar(CrossSection, p.tipar, { ex, ey, R });
    let goluri = zona.subtract(pereti);
    pereti.delete();

    if (p.stil === 'perforat') {
      /**
       * NICIO GAURA IN INELUL DE INCARCARE — CAT TIMP MAGSAFE E PORNIT (addendum HUS.2).
       *
       * Perforarea acolo slabeste cuplajul magnetic exact unde sta magnetul. Gaurile care ar cadea
       * in cerc se OMIT INTREGI, nu se taie la marginea lui: o gaura ciopartita lasa o semiluna
       * subtire, adica fix defectul pe care regula il evita.
       *
       * Cu MagSafe oprit nu se omite nimic: omul a ales spate perforat uniform in schimbul
       * cuplajului, si atunci cercul n-are niciun statut special.
       *
       * Testul e exact si nu costa nicio operatie de geometrie: o celula atinge discul daca
       * centrul cercului e in ea, sau daca vreo latura trece la mai putin de raza de el.
       */
      const zi = magsafe ? t.corp.zonaIncarcare : null;
      if (zi && zi.diametru > 0) {
        const raza = zi.diametru / 2;
        const inele = goluri.toPolygons() as Punct[][];
        const pastrate: Punct[][] = [];
        for (const inel of inele) {
          if (!atingeDiscul(inel, zi.x, zi.y, raza)) pastrate.push(inel);
          else raport.gauriOmise++;
        }
        goluri.delete();
        goluri = pastrate.length ? new CrossSection(pastrate, 'Positive') : new CrossSection([], 'Positive');
      }

      /**
       * PUNTEA DINTRE GAURI VECINE >= PERETE_MIN, GARANTATA PRIN CONSTRUCTIE.
       *
       * Parametrul de tipar da grosimea peretelui dintre celule, dar marginea zonei decorabile
       * taie celulele oriunde nimereste, si acolo raman aschii mai subtiri decat oriunde in
       * interior. O DESCHIDERE morfologica pe material — strang cu jumatate de punte, apoi
       * lasesc inapoi — sterge orice trasatura sub prag; ce ramane e, prin definitie, mai lat.
       *
       * Cat material a fost sub prag se raporteaza: daca cifra e mare, densitatea ceruta e prea
       * mare pentru piesa, si omul trebuie sa afle, nu sa primeasca in tacere alt model.
       */
      const material = zona.subtract(goluri);
      const strans = material.offset(-PERETE_MIN / 2, 'Round');
      const brut = strans.offset(PERETE_MIN / 2, 'Round');
      strans.delete();
      /**
       * SIMPLIFICAREA nu e cosmetica: deschiderea lasa firicele de latime numerica — contururi de
       * 0,1 x 0,0 mm — iar dupa boolean ele ies COMPONENTE CU VOLUM ZERO. Piesa raporta 3 pana la
       * 7 bucati in loc de una, desi in afara primei nu era niciun material: bbox de o zecime de
       * milimetru, volum 0,0 mm3. Un 3MF cu sase cochilii goale e exact ce interzice stratul 1
       * din A.2, si nu s-ar fi vazut nici in volum, nici pe ecran.
       */
      const deschis = brut.simplify(0.02);
      brut.delete();
      raport.ariaSubPrag = Math.max(0, material.area() - deschis.area());
      goluri.delete();
      goluri = zona.subtract(deschis).simplify(0.02);
      material.delete(); deschis.delete();
    }

    raport.gauri = (goluri.toPolygons() as Punct[][]).filter((r) => ariaInel(r) > 0).length;
    if (goluri.area() > 1e-6) {
      const adanc = p.stil === 'perforat' ? g + 2 : ADANCIME_GRAVARE_SPATE + 1;
      const cut = Manifold.extrude(goluri, adanc).translate([0, 0, -g - 1]);
      const nou = out.subtract(cut);
      cut.delete();
      if (out !== corp) out.delete();
      out = nou;
    }
    goluri.delete();
  }

  if ((p.stil === 'nume-gravat' || p.stil === 'nume-decupat') && p.font && p.text.trim()) {
    // gravat sau decupat, numele se citește de pe spatele husei, adică de pe fața exterioară
    const sil = siluetaText(p.font, p.text, p.inaltimeText, 'exterioara');
    const b = sil.bounds();
    const latimeText = b.max[0] - b.min[0];
    const disponibil = zona.bounds();
    const latDisp = disponibil.max[0] - disponibil.min[0];
    const k = latimeText > latDisp * 0.9 ? (latDisp * 0.9) / latimeText : 1;
    const asezat = sil.scale([k, k]).translate([
      -(b.min[0] + b.max[0]) / 2 * k + (disponibil.min[0] + disponibil.max[0]) / 2,
      -(b.min[1] + b.max[1]) / 2 * k + (disponibil.min[1] + disponibil.max[1]) / 2,
    ]);
    sil.delete();

    // B.8: textul nu se apropie de decupajul camerei sub 3 mm — se măsoară, nu se presupune
    const { regiune } = regiuneDecupajCamera(cfg);
    raport.panaLaCamera = distantaPlan(asezat, regiune, 20);
    regiune.delete();

    // textul se ține în zona decorabilă: dacă a ieșit din ea, ce iese nu se taie
    const inZona = asezat.intersect(zona);
    asezat.delete();

    if (inZona.area() > 1e-6) {
      if (p.stil === 'nume-gravat') {
        const cut = Manifold.extrude(inZona, ADANCIME_GRAVARE_SPATE + 1).translate([0, 0, -g - 1]);
        const nou = out.subtract(cut);
        cut.delete();
        if (out !== corp) out.delete();
        out = nou;
      } else {
        const { cutter, punti } = puntiPentruGoluri(inZona, p.inaltimeText * 0.2);
        raport.puntiAdaugate = punti;
        const cut = Manifold.extrude(cutter, g + 2).translate([0, 0, -g - 1]);
        const incercare = out.subtract(cut);
        cut.delete();
        /**
         * DACĂ TOT CADE CEVA, SE FORȚEAZĂ GRAVATUL (B.8, a doua ieșire).
         *
         * Punțile rezolvă conturul interior al unei litere, dar nu orice font: la un cursiv cu
         * bucle subțiri, tăierea poate desprinde și altceva. Verificarea e pe piesă — număr de
         * componente — nu pe o listă de litere „periculoase", fiindcă lista aia depinde de font.
         */
        if (incercare.decompose().length === 1) {
          if (out !== corp) out.delete();
          out = incercare;
        } else {
          incercare.delete();
          raport.fortatGravat = true;
          const cutG = Manifold.extrude(inZona, ADANCIME_GRAVARE_SPATE + 1).translate([0, 0, -g - 1]);
          const nou = out.subtract(cutG);
          cutG.delete();
          if (out !== corp) out.delete();
          out = nou;
        }
        if (cutter !== inZona) cutter.delete();
      }
    }
    inZona.delete();
  }

  zona.delete();

  /**
   * ORIFICIUL DE ȘNUR (B.7 §10) — pe DIAGONALA racordului, nu în colțul unui dreptunghi.
   *
   * Prima așezare îl punea la `latime/2 − margine` pe X și `lungime/2 − margine` pe Y, adică în
   * colțul unui dreptunghi ascuțit. Husa are colțuri rotunjite cu ~19 mm: punctul acela cădea în
   * AER, la 20,6 mm de centrul racordului, dintr-o rază de 19,05. Gaura scotea 0,0 mm³ — se vedea
   * doar măsurând, fiindcă piesa rămânea validă și dintr-o bucată.
   *
   * DE RAPORTAT, nu reparat de mine: gaura trece prin PLACA SPATELUI, deci șnurul iese pe sub
   * telefon. Nu există alt loc — între cavitate și fața exterioară sunt `grosimePerete` = 1,4 mm,
   * iar într-o bandă de 1,4 nu intră o gaură de 3. Un șnur adevărat cere o urechiușă îngroșată
   * în colț, adică o decizie de produs, nu o cotă.
   */
  if (p.snur !== 'fara') {
    const semn = p.snur === 'dreapta-jos' ? 1 : -1;
    const cx = semn * (t.corp.latime / 2 - t.corp.razaColt);
    const cy = -(t.corp.lungime / 2 - t.corp.razaColt);
    const razaExt = t.corp.razaColt + cfg.joc + cfg.grosimePerete;
    const d = razaExt - MARGINE_SPATE - DIAM_SNUR / 2;
    const unghi = (semn > 0 ? -45 : 225) * Math.PI / 180;
    const x = cx + d * Math.cos(unghi);
    const y = cy + d * Math.sin(unghi);
    const gaura = Manifold.cylinder(g + 2, DIAM_SNUR / 2, DIAM_SNUR / 2, 32, false)
      .translate([x, y, -g - 1]);
    const nou = out.subtract(gaura);
    gaura.delete();
    if (out !== corp) out.delete();
    out = nou;
  }

  return { corp: out, raport };
}

// ---------- HUS.2.5 — ZONELE CARE NU SE ACOPERĂ ----------

/** marginea în jurul unui keepOut expus (mm) */
export const MARGINE_KEEPOUT = 0.5;

export interface DecupajKeepOut { nume: string; x: number; y: number; latime: number; inaltime: number }

/**
 * ZONELE `keepOut` CARE NU INTRĂ ÎN DECUPAJUL CAMEREI PRIMESC GAURA LOR.
 *
 * B.8 cere ca decupajul camerei „să nu intersecteze niciun keep-out de blitz/microfon". Citit pe
 * cotele reale, sensul e invers de cum sună: keepOut-urile astea sunt orificii care NU SE ACOPERĂ,
 * iar dacă decupajul camerei nu ajunge la ele, husa le astupă.
 *
 * Se vede la iPhone 16: blițul stă la x = −5,80, pe sticla spatelui, iar insula camerei ține de la
 * −34,73 la −9,66. Blițul e în afara ei cu 3,86 mm, deci husa îl acoperea — o husă care stinge
 * blițul e o husă stricată, și nimic din geometrie n-o spunea.
 *
 * Deci: fiecare keepOut care nu e deja descoperit de decupajul camerei primește gaura lui, cu
 * `MARGINE_KEEPOUT` în jur, tăiată doar din spate, ca decupajul camerei.
 */
export function decupajeKeepOut(cfg: HusaConfig): DecupajKeepOut[] {
  const t = cfg.telefon;
  const { CrossSection } = MOD;

  /**
   * BLIȚUL E ȘI EL O ZONĂ CARE NU SE ACOPERĂ, chiar dacă nu stă în lista `keepOut`.
   *
   * Găsit pe iPhone SE 3: blițul lui e la x = −10,79, iar insula camerei ține de la −29,27 la
   * −17,13 — deci în afara ei, și husa îl acoperea. iPhone 16 scăpase doar fiindcă blițul lui
   * fusese trecut, de mână, ca intrare în `keepOut`.
   *
   * O regulă care ține doar cât timp cineva își aduce aminte să scrie un rând în JSON nu e o
   * regulă. `insulaCamera.blit` e o cotă pe care o are FIECARE model, deci se citește de acolo:
   * dacă blițul nu cade în fereastra camerei, primește gaura lui. Nimic de transcris în plus.
   */
  const zone: DecupajKeepOut[] = [];
  const b = t.insulaCamera.blit;
  if (b && b.diametru > 0) {
    zone.push({ nume: 'blit', x: b.x, y: b.y, latime: b.diametru, inaltime: b.diametru });
  }
  for (const k of ((t as any).keepOut ?? []) as DecupajKeepOut[]) {
    if (k.latime > 0 && k.inaltime > 0) zone.push({ ...k });
  }
  if (!zone.length) return [];

  const { regiune } = regiuneDecupajCamera(cfg);
  const petec = (z: DecupajKeepOut) =>
    new CrossSection([dreptunghiRotunjit(z.latime, z.inaltime, Math.min(z.latime, z.inaltime) / 2)],
      'Positive').translate([z.x, z.y]);

  const out: DecupajKeepOut[] = [];
  let acoperit = regiune;   // ce e deja descoperit: fereastra camerei, plus găurile acordate
  for (const z of zone) {
    const p = petec(z);
    const ramas = p.subtract(acoperit);
    const descoperit = ramas.area() <= 1e-6;
    ramas.delete();
    if (!descoperit) {
      out.push(z);
      // gaura acordată descoperă și ce se suprapune peste ea: două zone lipite nu iau două găuri
      const lat = p.offset(MARGINE_KEEPOUT, 'Round');
      const nou = acoperit.add(lat);
      lat.delete();
      if (acoperit !== regiune) acoperit.delete();
      acoperit = nou;
    }
    p.delete();
  }
  if (acoperit !== regiune) acoperit.delete();
  regiune.delete();
  return out;
}

/** taie găurile keepOut prin spate, până la fața interioară */
export function aplicaKeepOut(cfg: HusaConfig, corp: any, decupaje: DecupajKeepOut[]): any {
  if (!decupaje.length) return corp;
  const { Manifold, CrossSection } = MOD;
  const g = cfg.grosimePerete;
  let out = corp;
  for (const k of decupaje) {
    const cs = new CrossSection([dreptunghiRotunjit(k.latime + 2 * MARGINE_KEEPOUT,
      k.inaltime + 2 * MARGINE_KEEPOUT,
      Math.min(k.latime, k.inaltime) / 2 + MARGINE_KEEPOUT)], 'Positive').translate([k.x, k.y]);
    const gaura = Manifold.extrude(cs, g + 1).translate([0, 0, -g - 1]);
    cs.delete();
    const nou = out.subtract(gaura);
    gaura.delete();
    if (out !== corp) out.delete();
    out = nou;
  }
  return out;
}
