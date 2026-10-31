/**
 * APP BRELOCURI — geometria produsului.
 *
 * Un breloc dintr-o SINGURĂ literă. Pentru că e o singură literă, nu e nevoie de union
 * între siluete înainte de dilatare — silueta solidului din font e direct conturul de plecare.
 *
 *   sil     = silueta literei (proiecția solidului din font)
 *   contur  = sil.offset(+R)                 R = lățimea plăcuței în jurul literei
 *   neted   = contur.offset(+S).offset(-S)   S = netezire: închide crestăturile
 *   plăcuța = extrude(neted, Gp)             z ∈ [0, Gp]
 *   litera  = extrude(sil, Gl) ridicat la Gp z ∈ [Gp, Gp+Gl]
 *   gaura   = cilindru Ø Dg, străpuns prin plăcuță, poziționat automat
 *
 * NETEZIREA e esențială, nu cosmetică: o dilatare simplă păstrează fiecare colț interior al
 * literei, iar la „A" sau „R" ies crestături. Dilatare urmată de retragere (închidere
 * morfologică) le astupă și dă forma curgătoare de „bubble letter".
 *
 * Etapa curentă: plăcuța + litera în relief + gaura de inel. Verificările permanente
 * (testele) vin la pasul 6 (vezi docs/plan-brelocuri.md).
 */
import { t } from '../../core/i18n/index.js';
import { configureManifold as configTextSolid, textSolid, capHeightUnitati, type SolidReport } from '../../core/geometry/textSolid.js';
import { trasaturiSubtiri, TRASATURA_MIN, PATA_MAX, type DiagnosticTrasaturi } from '../../core/geometry/trasaturi.js';

// măsurătoarea de material subțire s-a mutat în nucleu (era în două copii identice, aici și la
// fagure). Se re-exportă ca importurile existente — panoul și testul — să rămână neatinse.
export { TRASATURA_MIN, PATA_MAX };
export type { DiagnosticTrasaturi };

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

/** peretele minim între gaură și marginea plăcuței, în mm (regulă de produs, nu parametru) */
export const PERETE_MIN = 2;
/**
 * Secțiunea minimă a materialului care ține cheile, în mm².
 *
 * Peretele singur nu spune destul: el se măsoară în PLANUL plăcuței, dar bucla se rupe pe
 * secțiunea ei întreagă, perete × grosime. Un generator comercial pe care l-am citit are inel
 * Ø5 cu gaură Ø3 pe bază de 2 mm — perete 1 mm, secțiune 2 mm², adică o buclă care ține un set
 * de chei pe cât material intră într-un fir de spaghete. Pragul de aici e produsul celor două
 * minime pe care le respectăm oricum: 2 mm perete × 2 mm grosime.
 */
export const SECTIUNE_MIN = 4;
/** căutarea lucrează cu marja asta în plus, ca verificările să treacă strict, nu chiar la limită */
const MARJA = 0.1;
/** cilindrul iese puțin peste plăcuță sus și jos: fețe coplanare = geometrie fragilă */
const DEPASIRE = 0.2;
/** segmente pe cerc — fix, ca rezultatul să nu depindă de setările globale ale modulului */
const SEGMENTE = 64;
/**
 * Cât are voie centrul urechii/inelului să iasă în afara conturului, ca fracțiune din raza
 * exterioară. La 0.4·R suprapunerea cu plăcuța e ~25% din disc — destul cât gâtul să nu fie
 * o atingere într-un punct. Peste atât, urechea atârnă de prea puțin material.
 */
const LIPIRE = 0.4;
/** contrapunct (gaură interioară) sub aria asta se elimină — prea mic ca să iasă curat la print (spec §3) */
export const CONTRAPUNCT_MIN_MM2 = 4;
/** lățimea minimă printabilă a plăcuței, în mm (spec §6a: erode 0.8 / dilate 0.8) */
export const LATIME_MIN = 1.6;
/** distanța minimă de la gaura inelului până la orice margine, în mm (spec §6c) */
export const MARGINE_GAURA_MIN = 1.2;
/** diametrul minim al găurii inelului, sub care nu intră o verigă standard (spec §6c) */
export const GAURA_MIN = 3.0;

/** cum se agață brelocul: doar gaură, ureche cu gaură, sau inel plin */
export type TipPrindere = 'gaura' | 'ureche' | 'inel';
/** la ce capăt se caută singură prinderea */
export type LaturaPrindere = 'stanga' | 'dreapta' | 'sus';

/**
 * Ce înălțime de literă scoate un breloc de lungimea cerută.
 *
 * Se rezolvă exact, dintr-o măsurătoare, nu prin încercări: tot conturul textului se scalează
 * LINIAR cu înălțimea, iar plăcuța adaugă exact lățimea ei de fiecare parte (offsetul nu
 * schimbă bounding box-ul mai mult decât raza lui, iar netezirea nu-l mișcă deloc). Deci
 *   lungimePlacuta = latimeText(h) + 2·latimePlacuta,  cu latimeText(h) = h · k
 * și k se află dintr-o singură măsurătoare a conturului, fără să construim solidul.
 *
 * Se măsoară CERNEALA (bounding box-ul conturului), nu lățimea de avans: brelocul e lung cât
 * se vede, nu cât spune fontul că înaintează cursorul.
 */
export function inaltimeDinLungime(font: any, text: string, lungimePlacuta: number, latimePlacuta: number): number {
  const H0 = 20;
  let latime0 = 0;
  try {
    const fontSize = H0 * font.unitsPerEm / capHeightUnitati(font);
    const bb = font.getPath(text, 0, 0, fontSize).getBoundingBox();
    latime0 = bb.x2 - bb.x1;
  } catch { /* text gol sau font stricat */ }
  if (!(latime0 > 0)) return H0;
  const dorit = lungimePlacuta - 2 * latimePlacuta;
  // sub 3 mm nu mai e literă, e o dungă; peste 200 nu mai e breloc
  return Math.max(3, Math.min(200, (dorit * H0) / latime0));
}

export interface BrelocConfig {
  text: string;
  font: any;                 // font opentype deja parsat
  inaltimeLitera: number;    // mm, măsurat pe capHeight
  reliefLitera: number;      // mm, cât iese litera din plăcuță
  latimePlacuta: number;     // mm, cât ține plăcuța în jurul literei
  netezire: number;          // mm, raza de închidere a crestăturilor
  grosimePlacuta: number;    // mm
  diametruGaura: number;     // mm, gaura (interiorul inelului); <= 0 => fără gaură
  tipPrindere: TipPrindere;
  /** peretele urechii/inelului în jurul găurii (mm). Ignorat la tipul „gaura". */
  grosimePrindere: number;
  /** poziția CERUTĂ a centrului, în coordonatele modelului; null = se caută automat */
  pozitiePrindere: [number, number] | null;
  /** la ce capăt se așază singură prinderea, când nu e trasă manual */
  latura: LaturaPrindere;
}

/** rezultatul poziționării prinderii + măsurătorile celor două verificări de siguranță */
export interface DiagnosticGaura {
  /** centrul folosit, în coordonatele modelului; null = nu există poziție validă */
  pozitie: [number, number] | null;
  /** poziția cerută manual a fost respinsă (invalidă după o schimbare de parametri) */
  pozitieRespinsa: boolean;
  /** peretele MĂSURAT de la gaură la marginea plăcuței (mm) */
  perete: number;
  /** spațiul MĂSURAT de la gaură până la literă (mm) */
  panaLaLitera: number;
  /** verificarea 1: gaura atinge litera (trebuie să fie false) */
  atingeLitera: boolean;
  /** secțiunea materialului care preia forța: perete măsurat × grosimea plăcuței (mm²) */
  sectiuneMM2: number;
  /** lățimea de plăcuță de la care gaura ar încăpea, pentru mesajul de ajutor */
  latimeNecesara: number;
}

export interface BrelocDiagnostics {
  /** lățime × înălțime, în mm */
  dimPlacuta: [number, number];
  dimLitera: [number, number];
  grosimeTotala: number;
  ariaPlacutaMM2: number;
  ariaLiteraMM2: number;
  /** bucăți neconectate: >1 = brelocul se rupe în mai multe piese (plăcuța nu le leagă) */
  bucati: number;
  gaura: DiagnosticGaura;
  trasaturi: DiagnosticTrasaturi;
  /** aceeași măsurătoare, pe PLĂCUȚĂ: prinde un gât prea subțire la ureche/inel */
  trasaturiPlacuta: DiagnosticTrasaturi;
  /** caractere cerute pentru care fontul nu produce geometrie */
  glifeLipsa: string[];
  triunghiuri: number;
  // ---- verificări de fabricabilitate (spec §6) ----
  /** §6d: ariile contrapunctelor eliminate din plăcuță (prea mici să iasă curat) */
  contrapuncteEliminate: number[];
  /** §6g: aria de literă rămasă în afara plăcuței (trebuie 0) */
  litereInAfaraMM2: number;
  /** §6a: procentul de arie pierdut la deschiderea cu LATIME_MIN (>1% = zone prea subțiri) */
  procPierdut: number;
  /** §6a: centrul zonei celei mai subțiri, în coordonatele modelului (sau null) */
  zonaSubtire: [number, number] | null;
  /** §6e: genus măsurat al plăcuței */
  genus: number;
  /** §6e: genus așteptat = găuri păstrate + inel */
  genusAsteptat: number;
  /** §6e: genus corect (altfel geometrie coruptă) */
  genusOK: boolean;
  /** §6c: gaura inelului are Ø ≥ GAURA_MIN */
  gauraDiamOK: boolean;
  /** §6c: gaura inelului la ≥ MARGINE_GAURA_MIN de orice margine */
  gauraMargineOK: boolean;
}

export interface BrelocResult {
  corpPlacuta: any;
  corpLitera: any;
  /** plăcuța + litera ca un singur solid: o piesă fizică, două culori */
  corpIntreg: any;
  /**
   * MÂNER de interfață, nu produs: inelul subțire desenat în jurul găurii, ca prinderea să
   * poată fi apucată și trasă cu mouse-ul. Nu intră niciodată în export.
   */
  corpMarcaj: any | null;
  /**
   * Mulțimea pozițiilor valide pentru centrul prinderii (CrossSection). Interfața o folosește
   * ca să limiteze tragerea la fiecare mișcare de mouse, fără să reconstruiască tot brelocul.
   */
  zonaPrindere: any;
  diagnostice: BrelocDiagnostics;
  ms: number;
}

/**
 * Silueta literei cu contra-formele UMPLUTE (triunghiul lui „A", ochiul lui „P").
 *
 * Fără asta, gaura de inel ar putea ajunge fix în golul lui „A": plăcuța e solidă acolo
 * (offsetul de câțiva mm închide contra-forma), iar punctul chiar respectă și distanța față
 * de trăsături și peretele până la marginea plăcuței. Formal valid, ca produs — greșit.
 * Inelul se prinde pe LÂNGĂ literă, nu prin ea.
 */
function siluetaPlina(CrossSection: any, sil: any): any {
  const arie = (r: [number, number][]) => {
    let a = 0;
    for (let i = 0; i < r.length; i++) { const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % r.length]; a += x1 * y2 - x2 * y1; }
    return a / 2;
  };
  // CrossSection normalizează winding-ul: inelele exterioare au arie pozitivă, găurile negativă
  const exterioare = sil.toPolygons().filter((r: [number, number][]) => arie(r) > 0);
  return exterioare.length ? new CrossSection(exterioare, 'Positive') : sil;
}

/**
 * Cât se mai poate umfla discul găurii până când `esteOk` cedează — căutare binară.
 * Măsoară efectiv peretele și spațiul până la literă, în loc să le presupună din construcție:
 * verificarea are astfel o valoare de arătat, nu doar un „da".
 */
function creste(disc: any, esteOk: (crescut: any) => boolean, maxim = 25): number {
  // Obiectele manifold trăiesc în heap-ul WASM și se eliberează abia la un GC al JS-ului.
  // Într-o buclă strânsă (testul face mii de construcții) GC-ul nu apucă să ruleze și heap-ul
  // se termină — de asta temporarele se șterg pe loc, nu se lasă pe seama colectorului.
  const test = (d: number) => {
    const crescut = d > 0 ? disc.offset(d, 'Round') : disc;
    const ok = esteOk(crescut);
    if (crescut !== disc) crescut.delete();
    return ok;
  };
  if (!test(0)) return 0;
  let jos = 0, sus = maxim;
  for (let i = 0; i < 9; i++) { const m = (jos + sus) / 2; if (test(m)) jos = m; else sus = m; }
  return jos;
}
/** aria unei operații 2D, cu temporarul eliberat imediat (vezi nota din `creste`) */
function arie(cs: any): number { const a = cs.area(); cs.delete(); return a; }
/** disc de rază `r` centrat în `p`; cercul netranslatat nu rămâne în urmă */
function disc(CrossSection: any, r: number, p: [number, number], segmente = SEGMENTE): any {
  const c = CrossSection.circle(r, segmente);
  const d = c.translate(p);
  c.delete();
  return d;
}


/** aria semnată a unui inel (CCW > 0) */
function ariaSemnata(r: [number, number][]): number {
  let a = 0;
  for (let i = 0; i < r.length; i++) { const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % r.length]; a += x1 * y2 - x2 * y1; }
  return a / 2;
}
/**
 * Elimină din plăcuță contrapunctele (găurile interioare) cu aria sub `minArie` — spec §3: un
 * contrapunct prea mic nu iese curat la print. Găurile păstrate rămân. Întoarce plăcuța curată,
 * ariile eliminate și câte găuri au rămas (pentru verificarea de genus).
 */
function eliminaContrapuncte(CrossSection: any, cs: any, minArie: number): { cs: any; eliminate: number[]; gauriPastrate: number } {
  const polys: [number, number][][] = cs.toPolygons();
  const exterioare: [number, number][][] = [], gauri: [number, number][][] = [];
  for (const r of polys) (ariaSemnata(r) > 0 ? exterioare : gauri).push(r);
  const eliminate: number[] = [], pastrate: [number, number][][] = [];
  for (const h of gauri) { const a = Math.abs(ariaSemnata(h)); if (a < minArie) eliminate.push(+a.toFixed(2)); else pastrate.push(h); }
  if (!eliminate.length) return { cs, eliminate: [], gauriPastrate: gauri.length };
  const nou = new CrossSection([...exterioare, ...pastrate], 'Positive');
  cs.delete();
  return { cs: nou, eliminate, gauriPastrate: pastrate.length };
}

export function buildBreloc(cfg: BrelocConfig): BrelocResult {
  if (!MOD) throw new Error(t('geometry.manifoldNeconfigurat', { functie: 'buildBreloc' }));
  const { Manifold, CrossSection } = MOD;
  const t0 = performance.now();

  const rep: Partial<SolidReport> = {};
  const literaBruta = textSolid(cfg.font, cfg.text, cfg.inaltimeLitera, cfg.reliefLitera, rep);
  /**
   * Scoate componentele cu arie ZERO ramase dupa offset.
   *
   * Nu e o masura de siguranta, e o reparatie. Inchiderea morfologica
   * (`offset(+S).offset(-S)`) lasa uneori un poligon degenerat, fara nicio arie — reziduu
   * numeric, nu geometrie. `decompose()` il numara insa ca o componenta, si de acolo mai
   * departe totul crede ca piesa e in doua bucati.
   *
   * Masurat pe CormorantGaramond-600italic „S": dupa netezire ies doua componente, cu ariile
   * [0, 1758.2]. Placuta e intreaga; a doua „bucata" nu exista. Testul raporta „brelocul se
   * rupe" pentru o fantoma, iar o reuniune cu forma de dinainte n-o putea repara, fiindca
   * reuniunea cu o forma de arie zero o pastreaza.
   */
  const faraCioburi = (cs: any) => {
    const parti: any[] = cs.decompose();
    const bune = parti.filter((p: any) => p.area() > 1e-9);
    if (bune.length === parti.length) { for (const p of parti) p.delete(); return cs; }
    const curat = bune.length ? CrossSection.union(bune) : cs;
    for (const p of parti) p.delete();
    if (bune.length) cs.delete();
    return curat;
  };

  const silBruta = literaBruta.project();

  let conturBrut = cfg.latimePlacuta > 0 ? silBruta.offset(cfg.latimePlacuta, 'Round') : silBruta;
  // închidere morfologică: dilatare + retragere cu aceeași rază. Astupă crestăturile mai
  // înguste de 2S, fără să miște conturul exterior.
  if (cfg.netezire > 0) {
    conturBrut = conturBrut.offset(cfg.netezire, 'Round').offset(-cfg.netezire, 'Round');
    conturBrut = faraCioburi(conturBrut);
  }

  // centrat pe origine în X/Y, după plăcuță (ea e piesa care se ține în mână). Se centrează
  // SILUETELE, nu solidele: căutarea găurii lucrează apoi direct în coordonatele finale.
  // Aceeași geometrie ajunge și în viewport și în fișierul de print.
  const rb = conturBrut.bounds();
  const cx = (rb.min[0] + rb.max[0]) / 2, cy = (rb.min[1] + rb.max[1]) / 2;
  const contur = conturBrut.translate([-cx, -cy]);
  const sil = silBruta.translate([-cx, -cy]);
  const silPlina = siluetaPlina(CrossSection, sil);

  // ---------------- PRINDEREA (gaură / ureche / inel) ----------------
  // Toate trei sunt aceeași construcție: un disc exterior de rază rOut (zero la „gaura", fiindcă
  // acolo materialul e chiar plăcuța) și o gaură de rază r în mijlocul lui.
  //
  // Zona în care are voie să stea CENTRUL nu se caută prin încercări — e o regiune 2D:
  //   · gaura nu atinge litera  ->  în afara siluetei PLINE umflate cu r
  //   · la tipul „gaura": perete >= PERETE_MIN până la margine  ->  în conturul retras cu r+perete
  //   · la ureche/inel: urechea își aduce materialul ei, deci centrul poate ieși din contur,
  //     dar nu mai mult de LIPIRE·rOut, altfel gâtul devine o atingere într-un punct.
  const r = cfg.diametruGaura / 2;
  const rOut = cfg.tipPrindere === 'gaura' ? 0 : r + Math.max(0, cfg.grosimePrindere);
  // fără gaură => zonă goală. `contur.subtract(contur)` și nu `new CrossSection([])`:
  // constructorul cu listă goală crapă în manifold (citește polygons[0].length).
  const zonaPrindere = r <= 0 ? contur.subtract(contur)
    : (cfg.tipPrindere === 'gaura'
      ? contur.offset(-(r + PERETE_MIN + MARJA), 'Round')
      : contur.offset(LIPIRE * rOut, 'Round')
    ).subtract(silPlina.offset(r + MARJA, 'Round'));

  let centru: [number, number] | null = null;
  let pozitieRespinsa = false;
  if (r > 0) {
    if (cfg.pozitiePrindere) {
      // poziție cerută manual: se acceptă doar dacă e validă ACUM. Poate să nu mai fie, dacă
      // s-a schimbat litera sau lățimea plăcuței după ce a fost trasă acolo.
      if (pozitieValida(zonaPrindere, cfg.pozitiePrindere)) centru = cfg.pozitiePrindere;
      else pozitieRespinsa = true;
    } else {
      // AUTOMAT: cel mai depărtat punct valid pe banda capătului ales. Banda e îngustă, nu un
      // segment: extremul se ia din bounds, iar 0.02 mm ține eroarea laterală sub marja de 0.1.
      //
      // Un NUME e lat, nu înalt: inelul lui atârnă la un capăt, nu deasupra mijlocului
      // cuvântului. De asta capătul e o alegere, nu o constantă — la o singură literă „sus"
      // rămâne firescul, la „Alejandro" nu.
      const inalt = rb.max[1] - rb.min[1] + 2 * (rOut + 2);
      const lat = rb.max[0] - rb.min[0] + 2 * (rOut + 2);
      const banda = cfg.latura === 'sus' ? CrossSection.square([0.02, inalt], true)
        : CrossSection.square([lat, 0.02], true);
      const peBanda = zonaPrindere.intersect(banda);
      banda.delete();
      if (peBanda.area() > 1e-9) {
        const b = peBanda.bounds();
        // y-ul modelului crește în JOS (fonturile vin y-jos), deci „cel mai sus" = y minim
        centru = cfg.latura === 'sus' ? [0, b.min[1]]
          : [cfg.latura === 'stanga' ? b.min[0] : b.max[0], 0];
      }
      peBanda.delete();
    }
  }

  // materialul urechii/inelului intră în contur ÎNAINTE de netezire, ca închiderea morfologică
  // să racordeze singură gâtul — exact acolo unde s-ar rupe altfel
  let conturFinal = contur;
  if (centru && rOut > 0) {
    const material = disc(CrossSection, rOut, centru);
    conturFinal = contur.add(material);
    material.delete();
    if (cfg.netezire > 0) {
      const dilatat = conturFinal.offset(cfg.netezire, 'Round');
      conturFinal.delete();
      conturFinal = dilatat.offset(-cfg.netezire, 'Round');
      dilatat.delete();
    }
  }

  // spec §3 + §6d: scoate contrapunctele prea mici din plăcuță și reține ce s-a eliminat
  const ep = eliminaContrapuncte(CrossSection, conturFinal, CONTRAPUNCT_MIN_MM2);
  conturFinal = ep.cs;
  const contrapuncteEliminate = ep.eliminate;
  const gauriPastrate = ep.gauriPastrate;

  let corpPlacuta = Manifold.extrude(conturFinal, cfg.grosimePlacuta);
  const discGaura = centru ? disc(CrossSection, r, centru) : null;
  let corpMarcaj: any = null;
  if (centru) {
    const cilindru = Manifold.cylinder(cfg.grosimePlacuta + 2 * DEPASIRE, r, r, SEGMENTE, false)
      .translate([centru[0], centru[1], -DEPASIRE]);
    const gaurit = corpPlacuta.subtract(cilindru);
    cilindru.delete(); corpPlacuta.delete();
    corpPlacuta = gaurit;
    // mânerul de tragere: un inel subțire pe fața plăcuței, în jurul găurii
    const exterior = CrossSection.circle(r + 0.9, SEGMENTE), interior = CrossSection.circle(r, SEGMENTE);
    const inel = exterior.subtract(interior);
    exterior.delete(); interior.delete();
    corpMarcaj = Manifold.extrude(inel, 0.5).translate([centru[0], centru[1], cfg.grosimePlacuta]);
    inel.delete();
  }
  // VERIFICĂRILE, măsurate pe rezultat (nu deduse din construcție)
  const gaura: DiagnosticGaura = {
    pozitie: centru,
    pozitieRespinsa,
    perete: discGaura ? +creste(discGaura, (c) => arie(c.subtract(conturFinal)) <= 1e-6).toFixed(2) : 0,
    panaLaLitera: discGaura ? +creste(discGaura, (c) => arie(c.intersect(silPlina)) <= 1e-6).toFixed(2) : 0,
    atingeLitera: discGaura ? arie(discGaura.intersect(silPlina)) > 1e-6 : false,
    // peretele cere r + PERETE_MIN de la margine, iar litera încă r: în banda plăcuței
    // (lată R în orice direcție) încape doar de la R >= 2r + PERETE_MIN în sus.
    // Se aplică DOAR tipului „gaura"; urechea și inelul își aduc materialul lor.
    latimeNecesara: +(cfg.diametruGaura + PERETE_MIN).toFixed(1),
    sectiuneMM2: 0,
  };
  // secțiunea se calculează DUPĂ perete, fiindcă îl folosește: bucla se rupe pe perete ×
  // grosime, nu pe perete singur. La „gaura" e banda de plăcuță dintre gaură și margine,
  // la ureche/inel e chiar peretele inelului — aceeași formulă, același material solicitat.
  gaura.sectiuneMM2 = +(gaura.perete * cfg.grosimePlacuta).toFixed(2);

  // litera stă PE fața plăcuței: baza ei la z = grosimePlacuta, deci cele două corpuri se
  // ating pe un plan. Printate împreună = o piesă cu schimbare de culoare, fără lipit.
  const corpLitera = literaBruta.translate([-cx, -cy, cfg.grosimePlacuta]);
  const corpIntreg = corpPlacuta.add(corpLitera);

  // spec §6g: literele trebuie să fie complet conținute în plăcuță (R_litere \ R_placa = ∅)
  const litereInAfaraMM2 = +arie(sil.subtract(conturFinal)).toFixed(2);

  // spec §6a: lățime minimă — deschidere morfologică cu 0.8; ce se pierde = zone sub 1.6 mm
  const desc = conturFinal.offset(-LATIME_MIN / 2, 'Round').offset(LATIME_MIN / 2, 'Round');
  const pierdut = conturFinal.subtract(desc); desc.delete();
  const ariaPierdutaMM2 = pierdut.area();
  const ariaPlaca = conturFinal.area();
  const procPierdut = ariaPlaca > 0 ? +(100 * ariaPierdutaMM2 / ariaPlaca).toFixed(2) : 0;
  const zb = ariaPierdutaMM2 > 1e-3 ? pierdut.bounds() : null;
  const zonaSubtire: [number, number] | null = zb ? [+((zb.min[0] + zb.max[0]) / 2).toFixed(1), +((zb.min[1] + zb.max[1]) / 2).toFixed(1)] : null;
  pierdut.delete();

  // spec §6e: genus = găuri păstrate în plăcuță + 1 pentru gaura inelului (dacă există)
  const genus = corpPlacuta.genus();
  const genusAsteptat = gauriPastrate + (centru ? 1 : 0);

  const bbL = literaBruta.boundingBox();
  const rf = conturFinal.bounds();
  return {
    corpPlacuta,
    corpLitera,
    corpIntreg,
    corpMarcaj,
    zonaPrindere,
    diagnostice: {
      dimPlacuta: [+(rf.max[0] - rf.min[0]).toFixed(1), +(rf.max[1] - rf.min[1]).toFixed(1)],
      dimLitera: [+(bbL.max[0] - bbL.min[0]).toFixed(1), +(bbL.max[1] - bbL.min[1]).toFixed(1)],
      grosimeTotala: +(cfg.grosimePlacuta + cfg.reliefLitera).toFixed(2),
      ariaPlacutaMM2: +conturFinal.area().toFixed(1),
      ariaLiteraMM2: +sil.area().toFixed(1),
      bucati: corpIntreg.decompose().length,
      gaura,
      trasaturi: trasaturiSubtiri(sil, TRASATURA_MIN),
      trasaturiPlacuta: trasaturiSubtiri(conturFinal, TRASATURA_MIN),
      glifeLipsa: rep.missingGlyphs ?? [],
      triunghiuri: corpIntreg.numTri(),
      // spec §6
      contrapuncteEliminate,                                   // §6d
      litereInAfaraMM2,                                        // §6g (0 = ok)
      procPierdut,                                             // §6a (% arie sub LATIME_MIN)
      zonaSubtire,                                             // §6a (unde, coord model)
      genus,                                                   // §6e
      genusAsteptat,                                           // §6e
      genusOK: genus === genusAsteptat,                        // §6e
      gauraDiamOK: !centru || cfg.diametruGaura >= GAURA_MIN,  // §6c
      gauraMargineOK: !centru || gaura.perete >= MARGINE_GAURA_MIN, // §6c
    },
    ms: performance.now() - t0,
  };
}

/** poziția e validă în zona dată? Folosit de interfață la limitarea tragerii. */
export function pozitieValida(zona: any, p: [number, number]): boolean {
  if (!MOD || !zona) return false;
  const punct = disc(MOD.CrossSection, 0.01, p, 8);
  const ok = arie(zona.intersect(punct)) > 0;
  punct.delete();
  return ok;
}

/**
 * Cel mai depărtat punct valid pe drumul de la `de` spre `catre` (bisecție pe segment).
 * null dacă nici măcar primul pas nu e valid.
 *
 * Fără asta, o cerere care sare peste marginea zonei e refuzată în întregime: la câmpurile
 * numerice asta înseamnă că o poziție diagonală perfect validă nu poate fi atinsă, fiindcă
 * fiecare axă în parte trece prin afara zonei. Aici se merge cât se poate și se oprește la
 * margine — ca un obiect care se sprijină de perete, nu ca unul care refuză să se miște.
 */
export function pasValid(zona: any, de: [number, number], catre: [number, number]): [number, number] | null {
  if (pozitieValida(zona, catre)) return catre;
  const la = (t: number): [number, number] => [de[0] + (catre[0] - de[0]) * t, de[1] + (catre[1] - de[1]) * t];
  let jos = 0, sus = 1;
  for (let i = 0; i < 8; i++) { const m = (jos + sus) / 2; if (pozitieValida(zona, la(m))) jos = m; else sus = m; }
  return jos > 0 ? la(jos) : null;
}
