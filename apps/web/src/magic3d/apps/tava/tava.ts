/**
 * APP MATRITA TAVA — geometria produsului.
 *
 * O tava cu cavitati in grila, pentru turnare deschisa (sapun, ceara, ipsos, rasina, ciocolata), sau
 * MASTERUL pentru o matrita de silicon: aceleasi forme ridicate pe o placa, cu o rama de turnare in
 * jurul lor si volumul de silicon calculat.
 *
 * Forma turnata (POZITIVUL) e aceeasi in amandoua: conturul (forma proprie sau imaginea clientului)
 * ridicat cu unghi de scoatere si racordat la varf, cu relieful din poza pe varf; sau un model STL.
 * In tava, cavitatea e pozitivul rotit cu fata in jos (rotire, nu oglindire): piesa scoasa si
 * intoarsa e pozitivul insusi, deci textul si desenul se citesc drept.
 *
 * Coordonate: Z in sus, Y in jos pe desen (ca imaginea). Nimic nu e judecat aici: diagnosticul da
 * volumele si contrapanta, constructorul hotaraste avertizarile.
 */
import { decodeazaHarta, decodeazaModel } from '../../core/geometry/codare.js';
import type { FormaDecor } from '../../core/geometry/formeDecor.js';
import { campInaltimi, configureManifold as configMatrita, contrapanta, conturDinSursa, corpCuDraft, strangere } from '../../core/geometry/matrita.js';
import { TAVA } from './config.js';

let MOD: any = null;
export function configureManifold(mod: any): void { MOD = mod; configMatrita(mod); }

export interface ParamTava {
  mod: 'tava' | 'master';
  sursa: 'forma' | 'imagine' | 'model';
  forma: FormaDecor;
  imagine: string;
  /** Harta de gri a imaginii (codare.ts), pentru relieful din poza; "" = fara. */
  harta: string;
  reliefPoza: boolean;
  inaltimeRelief: number;
  model: string;
  latime: number;
  adancime: number;
  draft: number;
  racordare: number;
  randuri: number;
  coloane: number;
  distanta: number;
  rama: number;
}

export type RolTava = 'tava' | 'master' | 'rama';

export interface DiagTava {
  /** Ce lipseste ca sa existe o forma: imaginea, modelul, sau conturul dispare sub unghiul cerut. */
  lipsa: '' | 'imagine' | 'model' | 'ingust';
  /** Volumul unei forme turnate si al tuturor, mm³. */
  volumForma: number;
  volumTotal: number;
  /** Master: volumul de silicon de turnat, mm³. */
  volumSilicon: number;
  /** Model STL: contrapanta, mm² (vezi core/geometry/matrita.ts). */
  contrapanta: number;
  /** Cutia pieselor pe placa (mm): cea mai mare dintre ele. */
  latime: number;
  adancime: number;
  /** Inaltimea pozitivului (adancimea cavitatii), mm. */
  inaltime: number;
}

export interface RezultatTava {
  piese: Array<{ rol: RolTava; manifold: any }>;
  diag: DiagTava;
  /** Pozitivul unei celule (baza la z = 0, centrat): forma turnata. */
  pozitiv: any | null;
  /** Conturul de la baza pozitivului (2D), cand forma vine dintr-un contur. */
  contur: any | null;
}

/** Pozitivul unei celule, cu baza la z = 0 si centrat pe x-y. */
function pozitiv(p: ParamTava): { corp: any | null; contur: any | null; lipsa: DiagTava['lipsa']; contrapanta: number } {
  const { Manifold, Mesh } = MOD;
  if (p.sursa === 'model') {
    const plasa = decodeazaModel(p.model);
    if (!plasa) return { corp: null, contur: null, lipsa: 'model', contrapanta: 0 };
    const mesh = new Mesh({ numProp: 3, vertProperties: plasa.varfuri, triVerts: plasa.triunghiuri });
    mesh.merge();
    let m: any;
    try {
      m = new Manifold(mesh);
    } catch {
      return { corp: null, contur: null, lipsa: 'model', contrapanta: 0 };
    }
    if (m.isEmpty()) return { corp: null, contur: null, lipsa: 'model', contrapanta: 0 };
    const b = m.boundingBox();
    const dx = b.max[0] - b.min[0], dy = b.max[1] - b.min[1], dz = b.max[2] - b.min[2];
    const s = Math.min(p.latime / Math.max(dx, dy), TAVA.adancimeMax / dz);
    m = m.translate([-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2, -b.min[2]]).scale(s);
    return { corp: m, contur: null, lipsa: '', contrapanta: contrapanta(m, TAVA.pasDraft) };
  }
  const sursa = conturDinSursa(p.sursa, p.forma, p.imagine, p.latime);
  if (!sursa) return { corp: null, contur: null, lipsa: 'imagine', contrapanta: 0 };
  const pas = Math.max(TAVA.pasDraft, p.adancime / TAVA.treapteMax);
  let corp = corpCuDraft(sursa.contur, p.adancime, p.draft, p.racordare, pas);
  if (!corp) return { corp: null, contur: sursa.contur, lipsa: 'ingust', contrapanta: 0 };
  const harta = p.reliefPoza && p.sursa === 'imagine' ? decodeazaHarta(p.harta) : null;
  if (harta && sursa.cadru && p.inaltimeRelief > 0) {
    // Relieful din poza pe varful pozitivului (fata piesei turnate), doar in conturul de la varf.
    const varf = sursa.contur.offset(-strangere(p.adancime, p.adancime, p.draft, p.racordare), 'Round');
    const c = sursa.cadru;
    const relief = campInaltimi(harta, c.latime, c.inaltime, p.inaltimeRelief, TAVA.bazaHarta).translate([c.cx, c.cy, 0]);
    const decupat = relief.intersect(Manifold.extrude(varf, p.inaltimeRelief + 1));
    corp = corp.add(decupat.translate([0, 0, p.adancime - TAVA.bazaHarta]));
  }
  return { corp, contur: sursa.contur, lipsa: '', contrapanta: 0 };
}

export function buildTava(p: ParamTava): RezultatTava {
  const { Manifold, CrossSection } = MOD;
  const randuri = Math.max(1, Math.min(TAVA.randuriMax, Math.round(p.randuri)));
  const coloane = Math.max(1, Math.min(TAVA.coloaneMax, Math.round(p.coloane)));
  const poz = pozitiv(p);
  const gol: DiagTava = { lipsa: poz.lipsa, volumForma: 0, volumTotal: 0, volumSilicon: 0, contrapanta: poz.contrapanta, latime: 0, adancime: 0, inaltime: 0 };
  if (!poz.corp) return { piese: [], diag: gol, pozitiv: null, contur: poz.contur };

  const b = poz.corp.boundingBox();
  const cw = b.max[0] - b.min[0], ch = b.max[1] - b.min[1], h = b.max[2] - b.min[2];
  const pasX = cw + p.distanta, pasY = ch + p.distanta;
  const loc = (r: number, c: number): [number, number] => [(c - (coloane - 1) / 2) * pasX, (r - (randuri - 1) / 2) * pasY];
  const grilaW = coloane * cw + (coloane - 1) * p.distanta;
  const grilaH = randuri * ch + (randuri - 1) * p.distanta;
  const n = randuri * coloane;
  const dreptunghi = (w: number, d: number, r: number) => CrossSection.square([w, d], true).offset(-r, 'Round').offset(r, 'Round');
  const volumForma = poz.corp.volume();
  const piese: RezultatTava['piese'] = [];
  let volumSilicon = 0;
  let latime: number, adancime: number;

  if (p.mod === 'tava') {
    // Cavitatea: pozitivul rotit cu fata in jos, cu deschiderea la fata de sus a tavii.
    const cavitate = poz.corp.rotate([180, 0, 0]);
    const H = h + TAVA.fund;
    latime = grilaW + 2 * p.rama;
    adancime = grilaH + 2 * p.rama;
    const bloc = Manifold.extrude(dreptunghi(latime, adancime, TAVA.razaColt), H);
    const goluri: any[] = [];
    for (let r = 0; r < randuri; r += 1) for (let c = 0; c < coloane; c += 1) goluri.push(cavitate.translate([...loc(r, c), H + 0.001]));
    piese.push({ rol: 'tava', manifold: bloc.subtract(Manifold.union(goluri)) });
  } else {
    // Masterul: placa, soclul (pe care sta rama) si pozitivele pe soclu; rama de turnare separat.
    const soclu = dreptunghi(grilaW + 2 * p.rama, grilaH + 2 * p.rama, TAVA.razaColt);
    const interior = soclu.offset(TAVA.jocRama, 'Round');
    const exterior = interior.offset(TAVA.pereteRama, 'Round');
    const z0 = TAVA.bazaMaster + TAVA.soclu;
    const pozitive: any[] = [];
    for (let r = 0; r < randuri; r += 1) for (let c = 0; c < coloane; c += 1) pozitive.push(poz.corp.translate([...loc(r, c), z0 - 0.001]));
    const placa = Manifold.union([
      Manifold.extrude(exterior, TAVA.bazaMaster),
      Manifold.extrude(soclu, TAVA.soclu + 0.001).translate([0, 0, TAVA.bazaMaster - 0.001]),
      ...pozitive,
    ]);
    const inaltimeRama = TAVA.soclu + h + TAVA.capacSilicon;
    const rama = Manifold.extrude(exterior.subtract(interior), inaltimeRama);
    // Siliconul: tot ce e in interiorul ramei, de pe placa pana la capac, minus soclul si pozitivele.
    const umplere = Manifold.extrude(interior, inaltimeRama).translate([0, 0, TAVA.bazaMaster]);
    volumSilicon = umplere.subtract(placa).volume();
    const eb = exterior.bounds();
    latime = eb.max[0] - eb.min[0];
    adancime = eb.max[1] - eb.min[1];
    piese.push({ rol: 'master', manifold: placa }, { rol: 'rama', manifold: rama });
  }

  return {
    piese,
    diag: { ...gol, volumForma, volumTotal: volumForma * n, volumSilicon, latime, adancime, inaltime: h },
    pozitiv: poz.corp,
    contur: poz.contur,
  };
}
