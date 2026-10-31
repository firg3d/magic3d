/**
 * Asamblare literă + scris + tematici, mod ASAMBLAT cu locașuri.
 *
 * Principii cheie (din task):
 * - BUZUNARELE se fac din SILUETA PROIECTATĂ (project -> offset(joc) -> extrude),
 *   niciodată din scăderea directă a solidului (altfel apar contra-goluri).
 * - Poziția scrisului/tematicilor vine ca OFFSET față de centrul literei
 *   (scrisOffX/Y, tem.offX/Y). buildAssembly calculează centrul și adună offsetul;
 *   e stare persistentă a UI, reconstrucția o CITEȘTE. Centrarea (offset=0) e în UI.
 * - Nu rescrie textSolid.ts. Primește modulul Manifold prin configureManifold.
 */
import { t } from '../../core/i18n/index.js';
import { textSolid, SolidReport } from '../../core/geometry/textSolid.js';
import { conturExterior, leagaComponente } from '../../core/geometry/punti.js';

let MOD: any = null;
export function configureManifold(mod: any) { MOD = mod; }

type Pt = [number, number];

export interface TematicaInput {
  id: string;
  nume: string;
  manifold: any;          // solid deja scalat+orientat (bază la z=0, la origine)
  offX: number; offY: number; // OFFSET (mm) față de centrul literei, plan față (+X dreapta, +Y sus)
  rotX: number; rotY: number; rotZ: number; // grade, 3 axe (ordinea manifold X,Y,Z)
  pozitieZ: number;       // mm pe axa de adâncime: 0 = fața literei, negativ = intră, pozitiv = iese
  culoare: string;
  /** corpurile SEPARATE ale modelului, exact cum vin din fișier (multi-color) */
  corpuri?: { nume: string; manifold: any; culoare?: string }[];
}

export interface AssemblyConfig {
  litera: string; fontLitera: any; inaltimeLitera: number; grosimeLitera: number; culoareLitera: string;
  scris: string; fontScris: any; inaltimeScris: number; reliefScris: number; culoareScris: string;
  scrisOffX: number; scrisOffY: number; // OFFSET față de centrul literei (+X dreapta, +Y sus)
  rotatieScris: number; scrisRotX: number; scrisRotY: number; // Z, X, Y (grade)
  scrisPozitieZ: number;  // mm pe axa de adâncime: 0 = fața literei, negativ = intră, pozitiv = iese
  modScris: 'relief' | 'gravat' | 'locas';
  grosimeScris: number;   // grosimea piesei de scris (inlay/gravură). Adâncimea buzunarului
                          // NU vine de aici — e cât e îngropat, adică din scrisPozitieZ.
  jocInsertie: number;    // default 0.2
  chenarActiv: boolean; latimeChenar: number; adancimeChenar: number;
  razaMuchie: number;     // mm, 0-3, rotunjire muchie superioară (default 1.2)
  taiereBaza: number;     // default 2 (doar pentru literele rotunde)
  tematici: TematicaInput[];
  puntiAutomate?: boolean;
  // BAZĂ (postament) — o singură bază activă; null = litera e ancora (comportament curent)
  baza?: {
    manifold: any;             // baza COMPUSĂ (geometrie de ansamblu: buzunar + mișcare solidară)
    /** corpurile SEPARATE, exact cum vin din fișier — folosite la export, cu culoarea fiecăruia.
     *  Nu se recompun niciodată: corpurile care se ating ar deveni o singură componentă. */
    corpuri?: { manifold: any; culoare?: string; nume: string }[];
    adancimeInfigere: number;  // mm, default 5
    jocInfigere: number;       // mm, default 0.2
    pozitieLiteraX: number; pozitieLiteraZ: number; // litera pe suprafața bazei
    rotatieLitera: number;     // grade, în jurul axei verticale (Y)
    /** înclinarea literei pe celelalte două axe. Litera nu mai stă drept, deci talpa nu mai e
     *  paralelă cu fața bazei: locașul rămâne o prismă verticală, iar contactul se face doar pe
     *  punctele cele mai de jos. Piesa intră, dar sprijinul e mai mic — vezi roadmap. */
    rotatieLiteraX?: number; rotatieLiteraZ?: number;
  } | null;
}

export interface Piesa { id: string; nume: string; manifold: any; culoare: string;
  /** aceleași corpuri, plasate cu ACEEAȘI transformare ca solidul compus */
  corpuri?: { nume: string; manifold: any; culoare?: string }[]; }

export interface Diagnostics {
  mod: 'relief' | 'gravat' | 'locas';
  faceZ: number;
  capHeightMM: number;
  literaCenter: Pt;
  literaBBox: { min: number[]; max: number[] };
  taiereBazaAplicata: boolean;
  volumInainteScadere: number;   // volumul literei înainte de buzunare
  volumDupaScadere: number;      // după buzunare (trebuie strict mai mic dacă s-a scăzut)
  stabilitate: { ariaFelieMM2: number; pragMM2: number; staSingura: boolean; avertisment?: string };
  contact?: { componenteTotal: number; plutitoare: { index: number; ariaMM2: number; centru: Pt }[] };
  punti?: { generate: number; plutitoareRamase: number };
  slivereEliminate: { litera: number; scris: number };
  // INTEGRITATE: glife vizibile cerute care NU au produs geometrie (literă lipsă) -> blochează export
  glifeLipsa: { sursa: string; caractere: string[] }[];
  // slivere eliminate, cu arie + poziție (raportate în UI, nu doar numărate)
  slivereDetalii: { sursa: string; area: number; x: number; y: number }[];
  // contact per obiect (scris locaș + tematici): plutește dacă nu atinge deloc litera
  obiecteContact: { id: string; nume: string; contactMM2: number; floats: boolean; adancimeEfectiva?: number; limitaAtinsa?: boolean; preaSubtire?: boolean;
    grosime?: number; intra?: number; iese?: number; dimX?: number; dimY?: number; dimZ?: number; iesePrag?: boolean }[];
  // BAZĂ (postament), dacă există
  baza?: { prezent: boolean; grosimeBaza: number; adancimeEfectiva: number; limitaAtinsa: boolean; contactProcent: number; fitOk: boolean; dimBaza: [number, number, number] };
}

const LITERE_TAIERE = 'COGJOQSUcgjoqsu';
const OVERHANG = 0.2;

// ---------- geometrie 2D (contact/punți, mod relief) ----------
/** centrul bounding box-ului unui contur — doar pentru a RAPORTA unde plutește o bucată */
function bboxCenterOfRing(r: Pt[]): Pt { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (const [x, y] of r) { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y); } return [(a + c) / 2, (b + d) / 2]; }
function bboxCenter2(bb: any): Pt { return [(bb.min[0] + bb.max[0]) / 2, (bb.min[1] + bb.max[1]) / 2]; }
/** lățimea punții: 1.2 mm = trei extrudări la duză de 0.4, adică o punte care nu se rupe la manipulare */
const PUNTE_LATIME = 1.2;
/** peste 15 mm puntea devine mai vizibilă decât punctul pe care îl ține */
const PUNTE_DISTANTA_MAX = 15;

// ---------- plasare solid: rotație 3 axe în jurul centrului 3D, centru XY -> (posX,posY), bază -> baseZ ----------
// rot = [rx,ry,rz] grade (ordinea manifold: X, apoi Y, apoi Z).
/**
 * Transformarea de așezare, calculată O SINGURĂ DATĂ din `referinta` și aplicabilă apoi
 * oricărui corp din același obiect.
 *
 * De ce contează: centrarea și punerea bazei la `baseZ` se calculează din bounding box.
 * Dacă se recalculează pentru fiecare corp în parte, fiecare corp se centrează pe el însuși
 * și toate se suprapun — un microfon din 6 piese înșiruite devine 6 forme una peste alta.
 * Cu o singură transformare rigidă, corpurile își păstrează pozițiile relative.
 */
function transformarePlasare(referinta: any, posX: number, posY: number, rot: [number, number, number], baseZ: number): (m: any) => any {
  const roteste = rot[0] || rot[1] || rot[2];
  let c: [number, number, number] = [0, 0, 0];
  let dupaRotatie = referinta;
  if (roteste) {
    const b = referinta.boundingBox();
    c = [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2];
    dupaRotatie = referinta.translate([-c[0], -c[1], -c[2]]).rotate(rot).translate([c[0], c[1], c[2]]);
  }
  const bb = dupaRotatie.boundingBox();
  const dx = posX - (bb.min[0] + bb.max[0]) / 2;
  const dy = posY - (bb.min[1] + bb.max[1]) / 2;
  const dz = baseZ - bb.min[2];
  return (m: any) => {
    const rotit = roteste ? m.translate([-c[0], -c[1], -c[2]]).rotate(rot).translate([c[0], c[1], c[2]]) : m;
    return rotit.translate([dx, dy, dz]);
  };
}
function placeSolid(solid: any, posX: number, posY: number, rot: [number, number, number], baseZ: number): any {
  return transformarePlasare(solid, posX, posY, rot, baseZ)(solid);
}

/**
 * "Așază pe fața plată": rotația (rx,ry în grade, ordinea manifold X apoi Y) care aduce
 * normala celei mai mari fețe plane spre +Z. Grupează normalele triunghiurilor (toleranță 5°),
 * alege grupul cu aria totală maximă.
 */
export function dominantFaceRotation(manifold: any): [number, number, number] {
  const mesh = manifold.getMesh();
  const np = mesh.numProp, vp: Float32Array = mesh.vertProperties, tv: Uint32Array = mesh.triVerts;
  const groups: { n: number[]; area: number }[] = [];
  const COS5 = Math.cos((5 * Math.PI) / 180);
  for (let t = 0; t < tv.length; t += 3) {
    const a = tv[t], b = tv[t + 1], c = tv[t + 2];
    const P = (i: number) => [vp[i * np], vp[i * np + 1], vp[i * np + 2]];
    const [ax, ay, az] = P(a), [bx, by, bz] = P(b), [cx, cy, cz] = P(c);
    const ux = bx - ax, uy = by - ay, uz = bz - az, wx = cx - ax, wy = cy - ay, wz = cz - az;
    let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
    const mag = Math.hypot(nx, ny, nz); if (mag < 1e-9) continue;
    const area = mag / 2; nx /= mag; ny /= mag; nz /= mag;
    let g = groups.find((gr) => gr.n[0] * nx + gr.n[1] * ny + gr.n[2] * nz > COS5);
    if (!g) { g = { n: [nx, ny, nz], area: 0 }; groups.push(g); }
    g.area += area;
  }
  if (!groups.length) return [0, 0, 0];
  const dom = groups.reduce((m, g) => (g.area > m.area ? g : m));
  const [nx, ny, nz] = dom.n;
  // aliniază N -> +Z: întâi X (anulează Y), apoi Y (anulează X). Ordinea = a manifold.
  const rx = Math.atan2(ny, nz);                       // după rotația X, Y devine 0
  const nz2 = Math.sqrt(ny * ny + nz * nz) * (nz < 0 && ny === 0 ? -1 : 1) || Math.hypot(ny, nz);
  const ry = -Math.atan2(nx, nz2);                     // apoi anulează X
  const deg = (r: number) => +((r * 180) / Math.PI).toFixed(2);
  return [deg(rx), deg(ry), 0];
}

/**
 * LOCAȘ GENERALIZAT (aceeași funcție pt. tematici și bază, plan receptor ca parametru).
 * projectOnPlane: proiectează un solid pe planul receptor — rotește ca normala planului să fie +Z
 *   (project() proiectează pe Z), apoi project(). rot=null => plan frontal (față literă, ca la tematici).
 * pocketCutter: dintr-o siluetă (deja proiectată pe planul receptor) construiește cutter-ul:
 *   offset(joc) -> extrude(adâncime+overhang) -> poziționează sub plan -> (opțional) rotește înapoi
 *   în frame-ul solidului receptor. planeZ = poziția planului pe axa lui normală (în frame rotit).
 */
function projectOnPlane(objSolid: any, rot?: [number, number, number]): any {
  return (rot ? objSolid.rotate(rot) : objSolid).project();
}
function pocketCutter(sil: any, planeZ: number, depth: number, joc: number, invRot?: [number, number, number],
                     topZ?: number): any {
  const s = joc > 0 ? sil.offset(joc, 'Round') : sil;
  const sus = topZ ?? planeZ + OVERHANG;
  const cutter = MOD.Manifold.extrude(s, sus - (planeZ - depth)).translate([0, 0, planeZ - depth]);
  return invRot ? cutter.rotate(invRot) : cutter;
}

/**
 * LOCAȘ ÎN TREPTE, urmând conturul piesei — nu prismă cu fund plat.
 *
 * Folosit în DOUĂ locuri: locașul scrisului/tematicilor în literă și locașul tălpii în bază.
 *
 * O prismă cu fund plat pe toată adâncimea are două defecte. Nu ia forma literei: gaura din
 * bază e amprenta tălpii extrudată drept în jos, deci pare o decupare brută. Și sprijină prost:
 * la o literă cursivă picioarele se termină la înălțimi diferite, iar cel care intră 0.5 mm
 * stă deasupra unui gol adânc cât cel mai de jos picior.
 *
 * Aici fiecare felie orizontală primește exact silueta materialului aflat la acea cotă SAU MAI
 * JOS. Rezultă un locaș care se îngustează în adâncime și se oprește la cota fiecărui picior:
 * piciorul care intră 0.5 mm are locaș de 0.5 mm, cel care intră 3 mm are locaș de 3 mm.
 *
 * Condiția de montabilitate e respectată prin construcție. Litera coboară vertical, deci tot
 * materialul care ajunge sub o cotă trebuie să treacă PRIN ea; folosind „la sau sub cotă"
 * siluetele sunt monotone spre suprafață, deci nu apare niciun prag care să blocheze coborârea.
 */
function socketVertical(buried: any, planeZ: number, adancime: number, joc: number, topZ: number): any {
  const { Manifold } = MOD;
  const bb = buried.boundingBox();
  const cx = (bb.min[0] + bb.max[0]) / 2, cy = (bb.min[1] + bb.max[1]) / 2;
  const BIG = 4000;
  const N = Math.max(1, Math.min(24, Math.ceil(adancime / 0.4)));   // pas ~0.4 mm, plafonat
  const h = adancime / N;
  const straturi: any[] = [];
  for (let k = 0; k < N; k++) {
    const zTop = planeZ - k * h, zJos = planeZ - (k + 1) * h;
    const subTop = buried.intersect(Manifold.cube([BIG, BIG, BIG], true).translate([cx, cy, zTop - BIG / 2]));
    if (subTop.volume() <= 1e-9) continue;                          // sub cota asta nu mai e nimic
    let s = subTop.project();
    if (joc > 0) s = s.offset(joc, 'Round');
    // primul strat urcă până PESTE tot materialul de deasupra planului (chenarul literei),
    // altfel rama ar rămâne capac peste locaș și piesa n-ar avea pe unde intra
    const sus = k === 0 ? Math.max(topZ, planeZ + OVERHANG) : zTop;
    straturi.push(Manifold.extrude(s, sus - zJos).translate([0, 0, zJos]));
  }
  if (!straturi.length) return Manifold.cube([1e-3, 1e-3, 1e-3]).translate([1e6, 1e6, 1e6]);
  return Manifold.union(straturi);
}

/** Varianta pentru talpa literei în bază: acolo adâncimea merge pe axa Y a modelului. */
function socketTalpa(buried: any, planeZ: number, adEff: number, joc: number): any {
  return socketVertical(buried.rotate([-90, 0, 0]), planeZ, adEff, joc, planeZ + OVERHANG).rotate([90, 0, 0]);
}

/** Stabilitate: contact la BAZĂ (felie 0.5 mm la talpă, proiectată pe podeaua XZ). */
function checkStability(corpLitera: any): Diagnostics['stabilitate'] {
  const { Manifold } = MOD;
  const bb = corpLitera.boundingBox();
  const dx = bb.max[0] - bb.min[0], dz = bb.max[2] - bb.min[2];
  const yBottom = bb.max[1]; // font y-jos: talpa = max Y
  const slab = Manifold.cube([dx + 2, 0.5, dz + 2]).translate([bb.min[0] - 1, yBottom - 0.5, bb.min[2] - 1]);
  const aria = corpLitera.intersect(slab).rotate([90, 0, 0]).project().area();
  const prag = 400;
  const staSingura = aria >= prag;
  return { ariaFelieMM2: aria, pragMM2: prag, staSingura, avertisment: staSingura ? undefined : t('geometry.nuStaSingura', { aria: aria.toFixed(1), prag }) };
}

/** Construiește litera: chenar (tavă cu ramă) opțional + tăiere la bază pentru litere rotunde.
 *  Întoarce și silueta exterioară (pt. rotunjire outer) și silueta recess (pt. rotunjire inner). */
function buildLetterSolid(config: AssemblyConfig, repLitera: Partial<SolidReport>): { solid: any; faceZ: number; taiereAplicata: boolean; outerSil: any; recessSil: any | null } {
  const { Manifold } = MOD;
  const base = textSolid(config.fontLitera, config.litera, config.inaltimeLitera, config.grosimeLitera, repLitera);
  let solid: any, faceZ: number, outerSil: any, recessSil: any | null = null;

  if (config.chenarActiv) {
    // extrudare a conturului dilatat cu latimeChenar, minus conturul original scăzut de sus pe adancimeChenar
    const sil = base.project();
    const outer = sil.offset(config.latimeChenar, 'Round');
    solid = Manifold.extrude(outer, config.grosimeLitera);
    const recess = Manifold.extrude(sil, config.adancimeChenar + OVERHANG).translate([0, 0, config.grosimeLitera - config.adancimeChenar]);
    solid = solid.subtract(recess);
    // `faceZ` e fundul scobiturii, NU fața chenarului: e planul de referință pentru poziția
    // pieselor (scris, tematici), fiindcă acolo se așază ele. Buzunarul se taie de la fața
    // inferioară a piesei în SUS, până peste vârful literei, deci trece și prin chenar —
    // vezi comentariul de la scăderea buzunarelor.
    faceZ = config.grosimeLitera - config.adancimeChenar;
    outerSil = outer; recessSil = sil;
  } else {
    solid = base;
    faceZ = config.grosimeLitera;
    outerSil = base.project();
  }

  // TASK 4 — tăiere plată la bază pentru litere rotunde
  let taiereAplicata = false;
  if (config.taiereBaza > 0 && LITERE_TAIERE.includes(config.litera)) {
    const bb = solid.boundingBox();
    const yBottom = bb.max[1];
    const block = Manifold.cube([bb.max[0] - bb.min[0] + 2, config.taiereBaza + OVERHANG, bb.max[2] - bb.min[2] + 2])
      .translate([bb.min[0] - 1, yBottom - config.taiereBaza, bb.min[2] - 1]);
    solid = solid.subtract(block);
    taiereAplicata = true;
  }
  return { solid, faceZ, taiereAplicata, outerSil, recessSil };
}

/**
 * Pasul tinta al treptelor de rotunjire, masurat pe ARC. Compromis masurat pe litera M/Alex Brush:
 *   0.15 mm -> 1285 ms, 103k triunghiuri   (praguri cat 3/4 dintr-un strat de print)
 *   0.10 mm -> 2270 ms, 141k triunghiuri   <- ales
 *   0.07 mm -> 3837 ms, 196k triunghiuri
 *   0.05 mm -> 5806 ms, 270k triunghiuri
 * Sub 0.1 mm castigul vizual nu mai justifica timpul: pragul e deja jumatate de strat de print.
 */
const PAS_ROTUNJIRE_MM = 0.1;

/**
 * Numarul de trepte pentru o rotunjire de raza r.
 *
 * Plicul de rotunjire e construit din straturi extrudate, deci suprafata iese in TREPTE, nu
 * neteda. Cu 8 trepte pe 1.2 mm ieseau praguri de 0.075-0.15 mm — comparabile cu un strat de
 * print de 0.2 mm, deci vizibile in slicer si usor de confundat cu straturi de printare.
 * Se dimensioneaza dupa lungimea ARCULUI, nu dupa raza: tinta e un prag de ~0.05 mm de-a lungul
 * profilului, adica un sfert din stratul de print.
 */
function nrTrepteRotunjire(r: number): number {
  const arc = r * Math.PI / 2;
  return Math.max(8, Math.min(64, Math.ceil(arc / PAS_ROTUNJIRE_MM)));
}

/** Rotunjire muchie superioară EXTERIOARĂ: profil sfert de cerc pe ultimii r mm, prin
 *  intersecție cu un plic construit din straturi (conturul se retrage progresiv). */
function roundTopOuter(letter: any, outerSil: any, grosime: number, r: number): any {
  const { Manifold } = MOD;
  if (r <= 0) return letter;
  const N = nrTrepteRotunjire(r);
  const layers: any[] = [Manifold.extrude(outerSil, grosime - r)];
  // esantionare pe UNGHI, nu pe inaltime: pe un sfert de cerc, pasii egali pe inaltime dau
  // trepte radiale mari langa varf. Pe unghi, pragurile ies egale de-a lungul profilului.
  for (let i = 0; i < N; i++) {
    const t0 = (i / N) * (Math.PI / 2), t1 = ((i + 1) / N) * (Math.PI / 2);
    const z0 = grosime - r + r * Math.sin(t0), z1 = grosime - r + r * Math.sin(t1);
    const inset = r * (1 - Math.cos(t1));            // retragerea la capatul de SUS -> plic inscris
    const s = inset > 1e-4 ? outerSil.offset(-inset, 'Round') : outerSil;
    if (s.isEmpty()) continue;
    layers.push(Manifold.extrude(s, (z1 - z0) + 1e-3).translate([0, 0, z0]));
  }
  return letter.intersect(Manifold.union(layers));
}

/** Rotunjire muchie superioară INTERIOARĂ a chenarului (rază mai mică): se scade un
 *  plic care lărgește progresiv scobitura pe ultimii r mm -> muchie fină, nu bulbucată. */
function roundTopInner(letter: any, recessSil: any, grosime: number, r: number): any {
  const { Manifold } = MOD;
  if (r <= 0) return letter;
  const N = nrTrepteRotunjire(r);
  const tools: any[] = [];
  for (let i = 0; i < N; i++) {
    const t0 = (i / N) * (Math.PI / 2), t1 = ((i + 1) / N) * (Math.PI / 2);
    const z0 = grosime - r + r * Math.sin(t0), z1 = grosime - r + r * Math.sin(t1);
    const s = recessSil.offset(r * (1 - Math.cos(t1)), 'Round');
    tools.push(Manifold.extrude(s, (z1 - z0) + 1e-3).translate([0, 0, z0]));
  }
  return letter.subtract(Manifold.union(tools));
}

/**
 * Rotunjirea literei, MEMORATĂ. E singura operație scumpă din tot ansamblul (94% din timp pe
 * o literă cursivă) și depinde exclusiv de literă: font, caracter, înălțime, grosime, chenar,
 * rază. Scrisul, tematicile și baza nu o influențează.
 *
 * Fără memorare, fiecare tastă apăsată în câmpul de text plătea rotunjirea din nou, deși
 * litera rămânea aceeași — de aici senzația de aplicație greoaie.
 *
 * Trei intrări, cele mai recent folosite. Una singură ar fi golită la fiecare comutare între
 * două litere; mai multe n-ar aduce nimic, fiindcă solidele Manifold sunt mari.
 */
const CACHE_ROTUNJIRE_MAX = 3;
const cacheRotunjire: { cheie: string; solid: any }[] = [];
function literaRotunjita(solid: any, config: AssemblyConfig, outerSil: any, recessSil: any): any {
  const cheie = JSON.stringify([
    config.litera, config.inaltimeLitera, config.grosimeLitera, config.razaMuchie,
    config.chenarActiv, config.latimeChenar, config.adancimeChenar, config.taiereBaza,
    (config.fontLitera?.names?.fullName?.en ?? '') + '|' + (config.fontLitera?.numGlyphs ?? 0),
  ]);
  const gasit = cacheRotunjire.findIndex((x) => x.cheie === cheie);
  if (gasit >= 0) {
    const [hit] = cacheRotunjire.splice(gasit, 1);   // readuce în față: cea mai recent folosită
    cacheRotunjire.unshift(hit);
    return hit.solid;
  }
  let r = roundTopOuter(solid, outerSil, config.grosimeLitera, config.razaMuchie);
  if (config.chenarActiv && recessSil) r = roundTopInner(r, recessSil, config.grosimeLitera, config.razaMuchie * 0.5);
  cacheRotunjire.unshift({ cheie, solid: r });
  // evacuarea trebuie să ELIBEREZE solidul: e un handle în heap-ul WASM, pe care GC-ul JS
  // nu-l atinge. Fără asta, cache-ul scurgea un solid rotunjit la fiecare literă nouă.
  while (cacheRotunjire.length > CACHE_ROTUNJIRE_MAX) {
    const evacuat = cacheRotunjire.pop();
    try { if (evacuat && !evacuat.solid.isDeleted()) evacuat.solid.delete(); } catch { /* deja mort */ }
  }
  return r;
}

/** Solidele ţinute între reconstrucţii de memo-cache-ul rotunjirii — arena nu are voie să le ia. */
export function solideMemorate(): any[] { return cacheRotunjire.map((x) => x.solid); }

export function buildAssembly(config: AssemblyConfig): {
  corpLitera: any; corpScris: any | null; pieseTematici: Piesa[]; pocketSils: Record<string, any>;
  /** partea ÎNGROPATĂ a fiecărei piese, ca solid — referința verificării de potrivire la export */
  solideMontaj: Record<string, any>; diagnostice: Diagnostics; corpBaza: any | null;
  corpBazaCorpuri: { nume: string; culoare?: string; manifold: any }[];
} {
  if (!MOD) throw new Error(t('geometry.manifoldNeconfigurat', { functie: 'buildAssembly' }));
  const { Manifold } = MOD;
  const puntiAutomate = config.puntiAutomate ?? true;

  const repLitera: Partial<SolidReport> = {};
  const repScris: Partial<SolidReport> = {};
  let { solid: corpLitera, faceZ, taiereAplicata, outerSil, recessSil } = buildLetterSolid(config, repLitera);
  const literaCenter = bboxCenter2(corpLitera.boundingBox());
  // OFFSET (față de centru, +Y sus) -> poziție absolută în coord. model (y-jos)
  const scrisPozX = literaCenter[0] + config.scrisOffX;
  const scrisPozY = literaCenter[1] - config.scrisOffY;

  // ---------------- ROTUNJIREA MUCHIEI — ÎNAINTE de buzunare ----------------
  // Rezultatul e IDENTIC cu varianta de dinainte, care rotunjea la sfârșit: intersecția cu
  // plicul și scăderea sculei comută cu scăderea buzunarelor,  (L∖P)∩E = (L∩E)∖P.
  // Mutată aici pentru că e de departe cea mai scumpă operație — 1665 ms din 1766 pe „M"
  // cursiv — iar aici depinde DOAR de literă, deci se poate memora între reconstrucții.
  // La tastarea scrisului, litera nu se schimbă: fiecare tastă costa o rotunjire completă.
  if (config.razaMuchie > 0) {
    corpLitera = literaRotunjita(corpLitera, config, outerSil, recessSil);
  }

  const volumInainte = corpLitera.volume();
  const literaShadow = corpLitera.project(); // silueta literei ÎNAINTE de buzunare (pentru contact)
  let corpScris: any | null = null;
  const pieseTematici: Piesa[] = [];
  let contact: Diagnostics['contact'];
  let punti: Diagnostics['punti'];
  const obiecteContact: Diagnostics['obiecteContact'] = [];

  // Cererile de buzunar se COLECTEAZĂ, nu se scad individual. Se scad unite,
  // pe grupuri de (adâncime, joc), ca obiectele care se ating să nu lase pereți
  // subțiri (<0.4 mm) între buzunare.
  const pocketReqs: { id?: string; sil: any; buried: any; depth: number; joc: number }[] = [];

  // Limită de siguranță comună (scris + tematici): nu îngropa mai adânc decât rămâne ≥2 mm perete.
  const maxByWall = config.grosimeLitera - (config.chenarActiv ? config.adancimeChenar : 0) - 2;
  const BIG = 2000;
  /** partea de sub planul feței -> siluetă + adâncime (ACEEAȘI regulă pentru scris și tematici) */
  const parteaIngropata = (solid: any) => {
    const pbb = solid.boundingBox();
    if (pbb.min[2] >= faceZ - 1e-6) return null;
    const belowBox = Manifold.cube([BIG, BIG, BIG], true).translate([literaCenter[0], literaCenter[1], faceZ - BIG / 2]);
    const buried = solid.intersect(belowBox);
    if (buried.volume() <= 1e-6) return null;
    return { sil: buried.project(), depth: faceZ - buried.boundingBox().min[2], buried };
  };

  // ---------------- SCRIS (poziție LIBERĂ pe Z, exact ca tematicile) ----------------
  if (config.scris.trim().length > 0) {
    let pozZ = config.scrisPozitieZ;
    let limitaAtinsa = false;
    if (-pozZ > maxByWall) { pozZ = -maxByWall; limitaAtinsa = true; }
    const rot: [number, number, number] = [config.scrisRotX, config.scrisRotY, config.rotatieScris];
    const gros = config.modScris === 'relief' ? config.reliefScris : config.grosimeScris;
    let piece = textSolid(config.fontScris, config.scris, config.inaltimeScris, gros, repScris);
    piece = placeSolid(piece, scrisPozX, scrisPozY, rot, faceZ + pozZ);
    const pbb = piece.boundingBox();
    const intra = Math.max(0, faceZ - pbb.min[2]), iese = Math.max(0, pbb.max[2] - faceZ);
    let pd = 0;
    if (config.modScris === 'relief') {
      const r = reliefContactBridges(corpLitera, piece, config.reliefScris, faceZ, puntiAutomate);
      corpScris = r.piece; contact = r.contact; punti = r.punti;
    } else {
      const ing = parteaIngropata(piece);        // buzunarul = consecința poziției, ca la tematici
      if (ing) { pd = ing.depth; pocketReqs.push({ id: config.modScris === 'gravat' ? undefined : 'scris', sil: ing.sil, buried: ing.buried, depth: pd, joc: config.modScris === 'gravat' ? 0 : config.jocInsertie }); }
      corpScris = config.modScris === 'gravat' ? null : piece;
    }
    if (corpScris) {
      const c = piece.project().intersect(literaShadow).area();
      obiecteContact.push({ id: 'scris', nume: `Scris „${config.scris}"`, contactMM2: c, floats: c <= 1e-6,
        adancimeEfectiva: +pd.toFixed(2), limitaAtinsa, grosime: +(pbb.max[2] - pbb.min[2]).toFixed(2),
        intra: +intra.toFixed(2), iese: +iese.toFixed(2) });
    }
  }

  // ---------------- TEMATICI (poziție LIBERĂ pe Z; buzunarul = consecința) ----------------
  // Obiectul se așază cu baza la faceZ + pozitieZ (0 = fața literei, negativ = intră în material).
  // Buzunarul se taie din SILUETA proiectată a PĂRȚII ÎNGROPATE (sub planul feței), dilatată cu joc.
  for (const tem of config.tematici) {
    let pozZ = tem.pozitieZ;
    let limitaAtinsa = false;
    if (-pozZ > maxByWall) { pozZ = -maxByWall; limitaAtinsa = true; } // nu depăși peretele din spate
    // transformarea se calculează din SOLIDUL COMPUS și se aplică identic tuturor corpurilor
    const asaza = transformarePlasare(tem.manifold, literaCenter[0] + tem.offX, literaCenter[1] - tem.offY, [tem.rotX, tem.rotY, tem.rotZ], faceZ + pozZ);
    const placed = asaza(tem.manifold);
    const corpuriPlasate = (tem.corpuri ?? []).map((c) => ({ nume: c.nume, culoare: c.culoare, manifold: asaza(c.manifold) }));
    const pbb = placed.boundingBox();
    const objThick = pbb.max[2] - pbb.min[2];
    const preaSubtire = objThick < 1.0;
    // partea îngropată -> buzunar (ACEEAȘI funcție folosită și pentru scris)
    let pd = 0;
    const ing = parteaIngropata(placed);
    if (ing) { pd = ing.depth; pocketReqs.push({ id: tem.id, sil: ing.sil, buried: ing.buried, depth: pd, joc: config.jocInsertie }); }
    pieseTematici.push({ id: tem.id, nume: tem.nume, manifold: placed, culoare: tem.culoare,
      corpuri: corpuriPlasate.length ? corpuriPlasate : undefined });
    const c = placed.project().intersect(literaShadow).area();
    const intra = Math.max(0, faceZ - pbb.min[2]), iese = Math.max(0, pbb.max[2] - faceZ);
    obiecteContact.push({
      id: tem.id, nume: tem.nume, contactMM2: c, floats: c <= 1e-6, adancimeEfectiva: +pd.toFixed(2), limitaAtinsa, preaSubtire,
      grosime: +objThick.toFixed(2), intra: +intra.toFixed(2), iese: +iese.toFixed(2),
      dimX: +(pbb.max[0] - pbb.min[0]).toFixed(2), dimY: +(pbb.max[1] - pbb.min[1]).toFixed(2), dimZ: +objThick.toFixed(2),
    });
  }

  // ---------------- AMPRENTĂ UNITĂ: union pe siluete -> offset(joc) pe UNIT -> extrude -> o scădere per grup ----------------
  const grupuri = new Map<string, { depth: number; joc: number; sils: any[]; burieds: any[] }>();
  for (const r of pocketReqs) {
    const k = `${Math.round(r.depth * 1e3)}|${Math.round(r.joc * 1e3)}`;
    if (!grupuri.has(k)) grupuri.set(k, { depth: r.depth, joc: r.joc, sils: [], burieds: [] });
    grupuri.get(k)!.sils.push(r.sil); grupuri.get(k)!.burieds.push(r.buried);
  }
  for (const g of grupuri.values()) {
    const burial = g.burieds.length === 1 ? g.burieds[0] : MOD.Manifold.union(g.burieds);
    // BUZUNARUL E NEGATIVUL PIESEI, nu un strat de grosime constantă.
    // Piesa de inlay e o placă PLATĂ: fața ei inferioară e un singur plan, la `faceZ - depth`.
    // Deci buzunarul are fundul plat la acea cotă și trebuie să străpungă TOT materialul de
    // deasupra, oricât ar fi — 1.04 mm în scobitură, dar 4.04 mm acolo unde trece peste chenar.
    // Cutter-ul urcă până peste vârful literei; unde nu există material, nu taie nimic.
    //
    // Două variante greșite, ambele încercate și măsurate:
    //   · oprit la `faceZ + OVERHANG`  -> chenarul rămâne ca un capac peste buzunar: 22 de
    //     cavități sigilate în literă, iar piesa tot nu intră (coliziune 673 mm³).
    //   · strat de grosime locală („coajă", `literă \ literă-coborâtă-cu-d`) -> fundul urmează
    //     suprafața, deci pe chenar rămâne la 23.96 în loc de 20.96. Piesa e plată, nu urmează
    //     suprafața, deci se lovește de prag: aceeași coliziune de 673 mm³.
    // Rama chenarului iese întreruptă acolo unde o traversează scrisul — corect: golul se
    // umple cu piesa de inlay, în culoarea ei.
    const lb = corpLitera.boundingBox();
    // Locaș în TREPTE, nu prismă. Pentru o piesă plată neînclinată treptele au toate aceeași
    // siluetă, deci iese exact prisma de dinainte — comportament neschimbat. Dar dacă piesa e
    // ÎNCLINATĂ (scrisRotX/scrisRotY), ea intră în material doar pe o parte, iar prisma tăiată
    // din silueta părții îngropate era mult mai mică decât piesa: exportul refuza montajul
    // („NU intră în buzunar", 410 mm² în afara conturului). Socketul urmează piesa.
    corpLitera = corpLitera.subtract(
      socketVertical(burial, faceZ, g.depth, g.joc, lb.max[2] + OVERHANG));
  }

  // silueta buzunarului per piesă (model frame, dilatată cu joc) — pt. verificarea de potrivire la export
  const pocketSils: Record<string, any> = {};
  const solideMontaj: Record<string, any> = {};
  for (const req of pocketReqs) {
    if (!req.id) continue;
    pocketSils[req.id] = req.joc > 0 ? req.sil.offset(req.joc, 'Round') : req.sil;
    solideMontaj[req.id] = req.buried;   // partea ÎNGROPATĂ, ca solid: trece prin aceleași transformări ca piesa
  }

  // ---------------- BAZĂ (postament): reframe ancoră + transformare de GRUP uniformă ----------------
  let corpBaza: any | null = null;
  let corpBazaCorpuri: { nume: string; culoare?: string; manifold: any }[] = [];
  let diagBaza: Diagnostics['baza'];
  if (config.baza) {
    const bz = config.baza;
    const bm0 = bz.manifold.rotate([90, 0, 0]);      // Z-up local -> model; fața superioară spre world-up (-Y)
    const bb0 = bm0.boundingBox();
    const Hb = bb0.max[1] - bb0.min[1];
    // Înfigerea e coordonată LIBERĂ, ca poziția Z a tematicilor: de la 0 (litera atinge
    // suprafața) până la grosimea bazei. Singura oprire fizică e fața inferioară — mai jos
    // litera ar ieși pe dedesubt. Nicio altă limită: cât material rămâne sub literă e
    // decizia utilizatorului, semnalată dar nu impusă.
    const adEff = Math.max(0, Math.min(bz.adancimeInfigere, Hb));
    const limitaAtinsa = bz.adancimeInfigere > Hb - 3 + 1e-6;
    const lc0 = corpLitera.boundingBox();
    const cxm = (lc0.min[0] + lc0.max[0]) / 2, czm = (lc0.min[2] + lc0.max[2]) / 2;
    const cym = (lc0.min[1] + lc0.max[1]) / 2;
    // ROTAȚIA GRUPULUI, pe toate trei axele, în jurul centrului literei.
    // Înclinarea pe X/Z schimbă cota tălpii, deci `MY` (planul pe care se așază baza) NU se
    // mai poate lua din bounding box-ul dinainte de rotație — se recalculează după.
    const rotGrup = (m: any) => m.translate([-cxm, -cym, -czm])
      .rotate([bz.rotatieLiteraX ?? 0, bz.rotatieLitera, bz.rotatieLiteraZ ?? 0])
      .translate([cxm, cym, czm]);
    const MY = rotGrup(corpLitera).boundingBox().max[1];   // talpa literei DUPĂ rotație
    // GRUP UNIFORM pe literă + scris + tematici: rotație (centrul literei) + poziție XZ + înfigere (+Y)
    const gx = (m: any) => rotGrup(m).translate([bz.pozitieLiteraX, adEff, bz.pozitieLiteraZ]);
    corpLitera = gx(corpLitera);
    if (corpScris) corpScris = gx(corpScris);
    // ATENȚIE: transformarea de grup trebuie aplicată și corpurilor RANDATE separat, nu doar
    // solidului compus. Compusul dă buzunarul (și se mișcă cu litera), dar la display se văd
    // `corpuri` — dacă rămân la poziția de dinainte de grup, piesa apare decalată față de
    // scobitura ei (offset = înfigerea bazei). Aceeași regulă ca la corpurile bazei (mai jos).
    for (const p of pieseTematici) {
      p.manifold = gx(p.manifold);
      if (p.corpuri) p.corpuri = p.corpuri.map((c) => ({ ...c, manifold: gx(c.manifold) }));
    }
    // plasează baza centrată sub literă, cu fața superioară la MY (talpă literei)
    const bcx = (bb0.min[0] + bb0.max[0]) / 2, bcz = (bb0.min[2] + bb0.max[2]) / 2;
    const tBaza: [number, number, number] = [cxm - bcx, MY - bb0.min[1], czm - bcz];
    corpBaza = bm0.translate(tBaza);
    // ACELEAȘI operații pe fiecare corp separat (rotire + aceeași translație calculată din compus)
    corpBazaCorpuri = (bz.corpuri ?? []).map((c) => ({ nume: c.nume, culoare: c.culoare, manifold: c.manifold.rotate([90, 0, 0]).translate(tBaza) }));
    // BUZUNAR VERTICAL din TALPA literei (partea infixată, model Y ≥ MY), ACEEAȘI funcție de locaș.
    // Plan receptor = fața superioară a bazei; rotația [-90,0,0] duce model +Y -> -Z (corp bază la -z de plan).
    const BIGb = 2000;
    const slab = Manifold.cube([BIGb, BIGb, BIGb], true).translate([0, MY + BIGb / 2, 0]); // model Y ∈ [MY, MY+BIG]
    const buried = corpLitera.intersect(slab);
    let talpaSil: any = null;
    let contactProcent = 0, fitOk = true;
    if (buried.volume() > 1e-6) {
      talpaSil = projectOnPlane(buried, [-90, 0, 0]);                 // silueta TĂLPII pe planul bazei
      // CONTACT REAL, în 3D. Obligatoriu ÎNAINTE de scăderea locașului: după scădere,
      // materialul din coloana tălpii tocmai a fost scos, deci ar ieși mereu zero.
      //
      // Vechea măsurătoare intersecta două SILUETE proiectate — „umbra tălpii" cu „umbra bazei".
      // N-avea Z deloc, deci raporta 100% ori de câte ori litera stătea deasupra bazei, chiar
      // dacă între ele era aer. Pe baza „nor" (relief central 9.16 mm) dădea 100% în timp ce
      // locașul nu tăia absolut nimic și litera plutea complet.
      //
      // Acum se măsoară cât din amprenta tălpii chiar are material de bază sub ea, pe adâncimea
      // de înfigere: se ia coloana verticală a tălpii, se intersectează cu baza ÎNTREAGĂ și se
      // proiectează ce a rămas. Aer sub talpă => arie mică => procent mic.
      const coloanaTalpa = pocketCutter(talpaSil, -MY, adEff, 0, [90, 0, 0]);
      const subTalpa = corpBaza.intersect(coloanaTalpa);
      const ariaContact = subTalpa.volume() > 1e-9 ? projectOnPlane(subTalpa, [-90, 0, 0]).area() : 0;
      const cutterBaza = socketTalpa(buried, -MY, adEff, bz.jocInfigere);
      corpBaza = corpBaza.subtract(cutterBaza);
      corpBazaCorpuri = corpBazaCorpuri.map((c) => ({ ...c, manifold: c.manifold.subtract(cutterBaza) }));
      const ta = talpaSil.area();
      contactProcent = ta > 1e-6 ? +(100 * ariaContact / ta).toFixed(1) : 0;
      // POTRIVIRE: talpa trebuie să încapă în buzunar (siluetă dilatată cu joc) — construit așa, deci trece
      const pocket = bz.jocInfigere > 0 ? talpaSil.offset(bz.jocInfigere, 'Round') : talpaSil;
      fitOk = talpaSil.subtract(pocket).area() < 2;
      pocketSils['__baza'] = pocket;
    }
    const dbb = corpBaza.boundingBox();
    diagBaza = { prezent: true, grosimeBaza: +Hb.toFixed(2), adancimeEfectiva: +adEff.toFixed(2), limitaAtinsa, contactProcent, fitOk, dimBaza: [+(dbb.max[0] - dbb.min[0]).toFixed(1), +(dbb.max[2] - dbb.min[2]).toFixed(1), +Hb.toFixed(1)] };
  }

  const volumDupa = corpLitera.volume();
  const lbb = corpLitera.boundingBox();
  const diagnostice: Diagnostics = {
    mod: config.modScris, faceZ, capHeightMM: config.inaltimeLitera, literaCenter,
    literaBBox: { min: lbb.min.slice(), max: lbb.max.slice() },
    taiereBazaAplicata: taiereAplicata,
    volumInainteScadere: volumInainte, volumDupaScadere: volumDupa,
    stabilitate: checkStability(corpBaza ?? corpLitera), // pe BAZĂ când există (litera „O" pe postament e stabilă)
    contact, punti,
    slivereEliminate: { litera: repLitera.sliversRemoved ?? 0, scris: repScris.sliversRemoved ?? 0 },
    glifeLipsa: [
      ...(repLitera.missingGlyphs?.length ? [{ sursa: t('litere.sursaLitera'), caractere: repLitera.missingGlyphs }] : []),
      ...(repScris.missingGlyphs?.length ? [{ sursa: t('litere.sursaScris'), caractere: repScris.missingGlyphs }] : []),
    ],
    slivereDetalii: [
      ...(repLitera.sliversDetail ?? []).map((s) => ({ sursa: t('litere.sursaLitera'), ...s })),
      ...(repScris.sliversDetail ?? []).map((s) => ({ sursa: t('litere.sursaScris'), ...s })),
    ],
    obiecteContact,
    baza: diagBaza,
  };
  return { corpLitera, corpScris, pieseTematici, pocketSils, solideMontaj, diagnostice, corpBaza, corpBazaCorpuri };
}

// ---------------- ORIENTARE PENTRU PRINT (la export) ----------------
export interface PrintBody { name: string; manifold: any; minZ: number;
  /** corpurile piesei, orientate și așezate cu ACEEAȘI transformare ca solidul compus */
  corpuri?: { nume: string; manifold: any; culoare?: string }[]; }
export interface PrintPiece { name: string; manifold: any; isInlay: boolean; pocketSil?: any;
  /** partea ÎNGROPATĂ a piesei (solid, frame model) — referința reală a verificării de potrivire */
  solidMontaj?: any;
  corpuri?: { nume: string; manifold: any; culoare?: string }[]; }

// Ce ARATĂ generatorul (display) = model reflectat pe Y. Exportul trebuie să
// coincidă cu display-ul, altfel litera iese OGLINDITĂ (BUG critic).
const readable = (m: any): any => m.mirror([0, 1, 0]);

/**
 * Așează totul gata de printat pe placă, în ACEEAȘI orientare ca generatorul (nu oglindit):
 * - litera culcată pe spate, buzunarele în sus, baza la Z=0;
 * - fiecare piesă de inlay cu fața vizibilă în JOS (readable apoi 180° pe X), baza la Z=0,
 *   ALĂTURI de literă.
 * VERIFICARE OBLIGATORIE: fiecare inlay trebuie să intre în buzunar fără coliziune; altfel EROARE.
 */
export function orientForPrint(literaName: string, litera: any, pieces: PrintPiece[], jocInsertie = 0.2): PrintBody[] {
  const readableLetter = readable(litera);
  const out: PrintBody[] = [];
  const lbbR = readableLetter.boundingBox();
  const lit = readableLetter.translate([0, 0, -lbbR.min[2]]);
  out.push({ name: literaName, manifold: lit, minZ: lit.boundingBox().min[2] });

  const centerSil = (s: any) => { const b = s.bounds(); return s.translate([-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2]); };

  const GAP = 10;
  let cursorX = lbbR.max[0] + GAP;
  const yBase = lbbR.min[1];
  for (const p of pieces) {
    // PIESA DE INLAY SE PRINTEAZĂ CU FAȚA VIZIBILĂ ÎN SUS.
    // Înainte se întorcea cu fața în jos, ca să iasă netedă pe placă. Dar placa texturată își
    // lasă amprenta exact pe fața care rămâne la vedere, iar suprafața de sus se controlează
    // mai bine din slicer. Fața care intră în locaș ajunge pe placă — nu se vede oricum.
    // Rotația e o mișcare rigidă, nu o oglindire: forma literelor rămâne corectă în ambele cazuri.
    const orienteaza = (m: any) => readable(m);
    const fd = orienteaza(p.manifold);
    const bb = fd.boundingBox();
    // aceeași translație pentru toate corpurile piesei, ca să nu se desprindă unele de altele
    const aseaza = (m: any) => m.translate([cursorX - bb.min[0], yBase - bb.min[1], -bb.min[2]]);
    const placed = aseaza(fd);                                                        // bază Z=0, alături
    const corpuriPlasate = (p.corpuri ?? []).map((c) => ({ nume: c.nume, culoare: c.culoare, manifold: aseaza(orienteaza(c.manifold)) }));

    // --- VERIFICARE POTRIVIRE (2D, prinde mirror-ul automat) ---
    // Readuc piesa EXPORTATĂ în orientarea de montaj (întorc fața sus) și compar silueta cu
    // forma buzunarului din literă (adusă în aceeași orientare readable, INDEPENDENT de piesă).
    // Dacă piesa e oglindită față de buzunar, forma asimetrică iese din contur -> EROARE.
    if (p.isInlay && p.pocketSil) {
      // Se compară silueta părții ÎNGROPATE, nu a piesei întregi. O piesă ÎNCLINATĂ intră în
      // material doar parțial: restul stă deasupra feței și n-are ce căuta în buzunar. Cu
      // piesa întreagă, orice înclinare declanșa fals „NU intră în buzunar" și oprea exportul.
      // Trece prin ACELEAȘI transformări ca piesa (`orienteaza` + `aseaza`), deci o oglindire
      // greșită pe drumul de export s-ar vedea în continuare.
      const refMontaj = p.solidMontaj ? aseaza(orienteaza(p.solidMontaj)) : placed;
      const inlaySil = centerSil(refMontaj.project());   // partea care chiar intră
      const pocketR = readable(MOD.Manifold.extrude(p.pocketSil, 1)).project(); // buzunarul (din literă) în orientare readable
      const pocketSil = centerSil(pocketR);
      const iesitMM2 = inlaySil.subtract(pocketSil).area();
      if (iesitMM2 > 2.0) {
        throw new Error(t('geometry.nuIntraInBuzunar', { nume: p.name, aria: iesitMM2.toFixed(1) }));
      }
    }

    out.push({ name: p.name, manifold: placed, minZ: placed.boundingBox().min[2],
      corpuri: corpuriPlasate.length ? corpuriPlasate : undefined });
    cursorX += (bb.max[0] - bb.min[0]) + GAP;
  }
  return out;
}

// ---------------- relief: contact + punți (secundar acum, păstrat) ----------------
/**
 * Punțile propriu-zise stau în `core/geometry/punti.ts` de când au al doilea consumator
 * (Nume 3D — un nume cursiv iese tot într-o bucată, plus punctele de pe „i"). Aici rămâne
 * decizia SPECIFICĂ scrisului în relief: ancorată e bucata a cărei umbră atinge litera.
 */
function reliefContactBridges(corpLitera: any, piece: any, relief: number, faceZ: number, punti: boolean) {
  const literaShadow = corpLitera.project();
  const parts: any[] = piece.decompose();
  const comps = parts.map((p: any, i: number) => {
    const sh = p.project(); const aria = sh.area(); const inter = sh.intersect(literaShadow).area();
    return { index: i, aria, centru: bboxCenterOfRing(conturExterior(sh)), ancorata: inter > 1e-6 };
  });
  const plut = comps.filter((c) => !c.ancorata);
  let bare: any[] = [];
  if (punti && comps.some((c) => c.ancorata)) {
    bare = leagaComponente(MOD.Manifold, parts, comps.map((c) => c.ancorata), {
      latime: PUNTE_LATIME, grosime: relief, z: faceZ, distantaMax: PUNTE_DISTANTA_MAX,
    }).bare;
  }
  let outPiece = piece;
  let ramase = plut.length;
  if (bare.length) {
    outPiece = MOD.Manifold.union([piece, ...bare]);
    // rămase, MĂSURAT pe rezultat: o bucată legată de o bucată legată e ancorată și ea
    ramase = outPiece.decompose().filter((p: any) => p.project().intersect(literaShadow).area() <= 1e-6).length;
  }
  return {
    piece: outPiece,
    contact: { componenteTotal: comps.length, plutitoare: plut.map((c) => ({ index: c.index, ariaMM2: c.aria, centru: c.centru })) },
    punti: { generate: bare.length, plutitoareRamase: ramase },
  };
}
