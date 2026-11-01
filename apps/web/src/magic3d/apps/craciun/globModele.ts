/**
 * GLOBURI CU MODELE — geometria (manifold, Z in sus; X, Y in plan).
 *
 * Un glob de revolutie cu un model pe suprafata, gat si capac cu ureche:
 *  - profilul: sfera pana la GLOB_MODELE.latitudineUmar, apoi un con la 45° pana la gat, gatul drept;
 *    jos, la globul din jumatati, un con la 45° cu varful tesit, iar in modul vaza o baza plata la
 *    latitudinea la care consola ajunge la limita;
 *  - modelul e o deplasare radiala a suprafetei (nervuri drepte, rasucite, spirala, retea de romburi sau
 *    hexagoane) sau o forma (fatete: sectiuni poligonale, liniare intre benzi), stinsa spre gat, spre
 *    baza si spre banda numelui; fantele sunt taieturi prin perete (doar la globul gol);
 *  - plasa se construieste direct, pe randuri (profilul) si coloane (unghiul), cu atatea coloane cat sa
 *    prinda modelul: un multiplu al numarului de nervuri, ca fatetele sa iasa plane;
 *  - gol, din doua jumatati: interiorul paralel cu profilul, taietura la ecuator (sub banda numelui, daca
 *    exista), fiecare jumatate pe taietura, imbinate cu un inel presat in locasuri (ca globul din
 *    Ornament); dintr-o bucata: corpul plin, pentru modul vaza (feliatorul face un singur perete);
 *  - capacul: un pahar care intra peste gat, cu urechea deasupra; se printeaza cu gura in jos.
 *
 * Toate cotele vin din config.ts (GLOB_MODELE). Fisierul intoarce geometria si diagnosticele; textele
 * de avertizare le alege constructorul.
 */

import { arieRing, type Ring } from '../../core/geometry/forme2d.js';
import { GLOB_MODELE } from './config.js';
import { configureComun, nume2d } from './comun2d.js';

let MOD: any = null;
export function configureManifold(mod: any): void { MOD = mod; configureComun(mod); }

export type ModelGlob = 'nervuri' | 'rasucite' | 'spirala' | 'fante' | 'romburi' | 'hexagoane' | 'fatete';
export type ConstructieGlob = 'jumatati' | 'vaza';

export interface ParamGlobModele {
  diametru: number;
  perete: number;
  constructie: ConstructieGlob;
  model: ModelGlob;
  /** Nervuri, fante, linii pe cerc, celule pe cerc sau laturi ale fatetelor. */
  numar: number;
  adancime: number;
  /** Grade, de jos pana sus (nervurile rasucite). */
  rasucire: number;
  /** Ture de jos pana sus (spirala). */
  ture: number;
  latimeFanta: number;
  font: any;
  /** Numele pe banda de la ecuator; gol = fara banda. */
  text: string;
}

export interface DiagnosticGlobModele {
  inaltimeNume: number;
  nuIncape: boolean;
  /** Aria (mm²) care s-ar printa in gol, pe piesa cea mai expusa, in pozitia de print. */
  consola: number;
  /** Fantele cerute la modul vaza (un perete continuu nu poate avea gauri): s-au facut caneluri. */
  fanteInVaza: boolean;
  /** Coloanele plasei (pe cerc). */
  segmente: number;
  glifeLipsa: string[];
}

export type RolGlob = 'corp' | 'sus' | 'jos' | 'inel' | 'capac' | 'text';
export interface PiesaGlob { rol: RolGlob; manifold: any }

export interface RezultatGlobModele {
  piese: PiesaGlob[];
  diag: DiagnosticGlobModele;
  /** Pentru teste: corpul exterior (centrul sferei in origine), taietura, baza, gatul si profilul fara model. */
  plan: { exterior: any; zTaietura: number; zBaza: number; zGat: number; razaGat: number; profil: (z: number) => number };
}

const sm = (x: number) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };
const rad = (g: number) => (g * Math.PI) / 180;

/**
 * Corp de revolutie din randuri (z crescator, raza fara model) si coloane: raza(rho, phi, z) da raza
 * reala. Un rand cu raza 0 e un pol (un singur varf); primul si ultimul rand, daca nu sunt poli, se
 * inchid cu un capac plat. Fetele sunt orientate spre exterior.
 */
function corpRevolutie(randuri: Array<{ z: number; rho: number }>, N: number, raza: (rho: number, phi: number, z: number) => number): any {
  const { Manifold, Mesh } = MOD;
  const v: number[] = [];
  const t: number[] = [];
  const inele: Array<number | number[]> = [];
  for (const { z, rho } of randuri) {
    if (rho < 1e-6) { inele.push(v.length / 3); v.push(0, 0, z); continue; }
    const inel: number[] = [];
    for (let j = 0; j < N; j++) {
      const phi = (2 * Math.PI * j) / N;
      const r = raza(rho, phi, z);
      inel.push(v.length / 3);
      v.push(r * Math.cos(phi), r * Math.sin(phi), z);
    }
    inele.push(inel);
  }
  const capac = (inel: number[], z: number, sus: boolean) => {
    const c = v.length / 3;
    v.push(0, 0, z);
    for (let j = 0; j < N; j++) { const a = inel[j], b = inel[(j + 1) % N]; if (sus) t.push(c, a, b); else t.push(c, b, a); }
  };
  if (Array.isArray(inele[0])) capac(inele[0], randuri[0].z, false);
  for (let i = 0; i + 1 < inele.length; i++) {
    const jos = inele[i], sus = inele[i + 1];
    for (let j = 0; j < N; j++) {
      const k = (j + 1) % N;
      if (Array.isArray(jos) && Array.isArray(sus)) t.push(jos[j], jos[k], sus[k], jos[j], sus[k], sus[j]);
      else if (Array.isArray(sus)) t.push(jos as number, sus[k], sus[j]);
      else if (Array.isArray(jos)) t.push(jos[j], jos[k], sus as number);
    }
  }
  const ultim = inele[inele.length - 1];
  if (Array.isArray(ultim)) capac(ultim, randuri[randuri.length - 1].z, true);
  return new Manifold(new Mesh({ numProp: 3, vertProperties: new Float32Array(v), triVerts: new Uint32Array(t) }));
}

/** Distanta pana la cea mai apropiata latura a unei retele de hexagoane cu varful in sus, de pas L pe orizontala. */
function laturaHex(x: number, y: number, L: number): number {
  const vs = (1.5 * L) / Math.sqrt(3);
  const r0 = Math.floor(y / vs);
  let best = Infinity, dx = 0, dy = 0;
  for (let r = r0 - 1; r <= r0 + 1; r++) {
    const off = ((r % 2) + 2) % 2 ? L / 2 : 0;
    const cx = Math.round((x - off) / L) * L + off, cy = r * vs;
    const d = (x - cx) ** 2 + (y - cy) ** 2;
    if (d < best) { best = d; dx = x - cx; dy = y - cy; }
  }
  let m = 0;
  for (const a of [0, 60, 120]) m = Math.max(m, Math.abs(dx * Math.cos(rad(a)) + dy * Math.sin(rad(a))));
  return L / 2 - m;
}

/** Fetele care nu se sprijina pe nimic (strat cu strat) peste puntea maxima, adunate (mm²); ca in Ornament. */
function arieNesustinuta(m: any): number {
  const G = GLOB_MODELE;
  const b = m.boundingBox();
  const iesire = G.pasConsola * Math.tan(rad(G.consolaMax));
  const plina = (cs: any) => new MOD.CrossSection((cs.toPolygons() as Ring[]).filter((r) => arieRing(r) > 0), 'NonZero');
  let arie = 0;
  let jos = m.slice(b.min[2] + G.pasConsola / 2);
  for (let z = b.min[2] + 1.5 * G.pasConsola; z < b.max[2]; z += G.pasConsola) {
    const sus = m.slice(z);
    const gol = sus.subtract(jos.offset(iesire, 'Round'));
    if (!gol.isEmpty()) {
      const acoperit = plina(jos);
      for (const bucata of gol.decompose()) {
        const inchisa = bucata.subtract(acoperit).area() < 0.01;
        const punte = inchisa && bucata.offset(-G.punteMax / 2, 'Round').isEmpty();
        if (!punte) arie += bucata.area();
      }
    }
    jos = sus;
  }
  return arie;
}

export function buildGlobModele(p: ParamGlobModele): RezultatGlobModele {
  const { Manifold, CrossSection } = MOD;
  const G = GLOB_MODELE;
  const glifeLipsa: string[] = [];
  const R = p.diametru / 2;
  const w = Math.max(G.pereteMin, Math.min(G.pereteMax, p.perete));
  const vaza = p.constructie === 'vaza';
  const n = Math.max(G.numarMin, Math.min(G.numarMax, Math.round(p.numar)));
  const fanteInVaza = vaza && p.model === 'fante';
  // modelele din linii (spirala, retelele, canelurile) cer plasa cea mai deasa: liniile aproape culcate
  // trec altfel in trepte peste randuri
  const dinLinii = p.model === 'spirala' || p.model === 'romburi' || p.model === 'hexagoane' || fanteInVaza;
  const randuriSfera = dinLinii ? 2 * G.randuriSfera : G.randuriSfera;

  // ---- profilul: sfera, umarul la 45°, gatul; jos, baza plata (vaza) sau un con la 45° cu varful tesit ----
  // Conul de jos tine si tavanul interior al jumatatii de jos (printata cu varful in sus) in panta: o calota
  // inchisa la pol ar avea in varf un tavan aproape plat, larg, fara sprijin.
  const a = rad(G.latitudineUmar);
  const zS = R * Math.sin(a), rhoS = R * Math.cos(a);
  const rn = G.razaGat * p.diametru;
  const zN = zS + (rhoS - rn);
  const zT = zN + G.inaltimeGat;
  const latJos = vaza ? G.latitudineBaza : -G.latitudineUmar;
  const rhoVarf = G.razaVarf * rn;
  const zVarf = -zS - (rhoS - rhoVarf);
  const profil = (z: number) => (z < -zS ? rhoS - (-zS - z) : z <= zS ? Math.sqrt(Math.max(0, R * R - z * z)) : z <= zN ? rhoS - (z - zS) : rn);

  // ---- randurile: sfera (uniform pe latitudine), conul, gatul ----
  // La fatete, sfera devine un poligon pe latitudine, circumscris: in fiecare banda, raza pe directia
  // latitudinii l este R / cos(l - mijlocul benzii), adica o coarda tangenta la sfera la mijloc (peretele
  // nu se subtiaza); in ultima jumatate de banda se intoarce lin la sfera, ca sa intalneasca conul.
  const randuri: Array<{ z: number; rho: number }> = [];
  if (p.model === 'fatete') {
    const benzi = Math.max(3, Math.round(n * G.benziPeFatete));
    const sub = Math.max(2, Math.ceil(G.randuriSfera / benzi));
    const dl = (G.latitudineUmar - latJos) / benzi;
    for (let i = 0; i <= benzi * sub; i++) {
      const l = latJos + (dl * i) / sub;
      const mijloc = latJos + dl * (Math.min(benzi - 1, Math.floor(i / sub)) + 0.5);
      const lin = sm((G.latitudineUmar - l) / (dl / 2)) * (vaza ? 1 : sm((l - latJos) / (dl / 2)));
      const r = R + (R / Math.cos(rad(l - mijloc)) - R) * lin;
      randuri.push({ z: r * Math.sin(rad(l)), rho: r * Math.cos(rad(l)) });
    }
  } else {
    for (let i = 0; i <= randuriSfera; i++) {
      const l = latJos + ((G.latitudineUmar - latJos) * i) / randuriSfera;
      const z = R * Math.sin(rad(l));
      randuri.push({ z, rho: profil(z) });
    }
  }
  const pasCon = Math.max(1, Math.ceil((zN - zS) / (dinLinii ? 0.25 : 0.5)));
  if (!vaza) {
    const josCon: Array<{ z: number; rho: number }> = [];
    for (let i = 0; i < pasCon; i++) { const z = zVarf + ((-zS - zVarf) * i) / pasCon; josCon.push({ z, rho: profil(z) }); }
    randuri.unshift(...josCon);
  }
  for (let i = 1; i <= pasCon; i++) { const z = zS + ((zN - zS) * i) / pasCon; randuri.push({ z, rho: profil(z) }); }
  for (let i = 1; i <= Math.ceil(G.inaltimeGat); i++) { const z = zN + (G.inaltimeGat * i) / Math.ceil(G.inaltimeGat); randuri.push({ z, rho: rn }); }
  // baza plata (modul vaza): unde a ajuns primul rand
  const zBaza = randuri[0].z;

  // ---- numele: banda de la ecuator ----
  const areText = !!p.text.trim();
  const hb = G.inaltimeBanda;
  const reliefBanda = Math.max(G.reliefBandaMin, p.adancime);

  // ---- modelul, ca raza in functie de (rho, phi, z) ----
  const zLo = zBaza, zHi = zN;
  const H = zHi - zLo;
  const cerc = 2 * Math.PI * R;
  // marginile liniilor in panta (cel mult consolaMax fata de verticala la globul in picioare), nu in trepta
  const tranzitie = Math.max(G.tranzitieLinie, p.adancime / Math.tan(rad(G.consolaMax)) * 1.2);
  const linie = (d: number, lw: number) => sm((lw / 2 + tranzitie / 2 - d) / tranzitie);
  const kRomb = Math.max(1, Math.round((n * H) / cerc));
  const gradRomb = Math.hypot(n / cerc, kRomb / H);
  const L = cerc / n;
  const gradSpirala = Math.hypot(n / cerc, (n * p.ture) / H);
  const valoare = (phi: number, z: number): number => {
    const s = (z - zLo) / H;
    switch (p.model) {
      case 'nervuri': return (0.5 + 0.5 * Math.cos(n * phi)) ** 1.5;
      case 'rasucite': return (0.5 + 0.5 * Math.cos(n * (phi + rad(p.rasucire) * s))) ** 1.5;
      case 'spirala': {
        // distanta pe perpendiculara pe linie (liniile spiralei sunt aproape culcate)
        const u = (n * (phi + 2 * Math.PI * p.ture * s)) / (2 * Math.PI);
        return linie(Math.abs(u - Math.round(u)) / gradSpirala, G.latimeLinie * 1.4);
      }
      case 'romburi': {
        const u1 = (n * phi) / (2 * Math.PI) + kRomb * s, u2 = (n * phi) / (2 * Math.PI) - kRomb * s;
        const d = Math.min(Math.abs(u1 - Math.round(u1)), Math.abs(u2 - Math.round(u2))) / gradRomb;
        return linie(d, G.latimeLinie);
      }
      case 'hexagoane': return linie(laturaHex(R * phi, z - zLo, L), G.latimeLinie);
      case 'fante': {
        if (!fanteInVaza) return 0;
        // in modul vaza: caneluri (inspre interior) in locul fantelor
        const u = (n * phi) / (2 * Math.PI) + 0.5;
        return -linie(Math.abs(u - Math.round(u)) * L, p.latimeFanta);
      }
      default: return 0;
    }
  };
  const ponderi = (z: number) => {
    const stins = sm((z - zLo) / G.stingere) * sm((zHi - 1 - z) / G.stingere);
    const banda = areText ? sm((Math.abs(z) - hb / 2) / 1.5) : 1;
    return { stins, banda };
  };
  const raza = (rho: number, phi: number, z: number) => {
    const { stins, banda } = ponderi(z);
    const inBanda = (1 - banda) * reliefBanda;
    if (p.model === 'fatete') {
      const sector = (2 * Math.PI) / n;
      // laturile poligonului tangente la cercul randului (circumscris)
      const poli = 1 / Math.cos(((phi % sector) + sector) % sector - Math.PI / n);
      return (rho + rho * (poli - 1) * stins) * banda + (rho + inBanda) * (1 - banda);
    }
    return rho + p.adancime * valoare(phi, z) * stins * banda + inBanda;
  };

  // ---- plasa ----
  // pe cerc: la modelele din linii rezolutia cea mai mare; la nervuri, destule varfuri pe o perioada
  const pePerioada = dinLinii ? Math.floor(G.segmenteMax / n) : Math.max(1, Math.min(G.esantioanePerPerioada, Math.floor(G.segmenteMax / n)));
  const N = n * Math.max(Math.ceil(G.segmenteMin / n), pePerioada);
  const exterior = corpRevolutie(randuri, N, raza);

  // ---- textul pe banda (proiectat din fata, dinspre +Y, ca la globul din Ornament) ----
  let text: any = null;
  let hText = 0, nuIncape = false;
  if (areText) {
    const ref = nume2d(p.font, p.text, 10, 1, glifeLipsa);
    if (ref && !ref.isEmpty()) {
      const rb = ref.bounds();
      const hCutie = hb - 2 * G.margineBanda;
      const latime = G.latimeTextMax * p.diametru;
      hText = Math.min((10 * hCutie) / (rb.max[1] - rb.min[1]), (10 * latime) / (rb.max[0] - rb.min[0]));
      if (hText < G.textMin) nuIncape = true;
      const sec0 = nume2d(p.font, p.text, hText, 1, [])!;
      const b = sec0.bounds();
      const sec = sec0.translate([-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2]);
      const fascicul = Manifold.extrude(sec, 2 * R).rotate([-90, 0, 0]);
      const rb2 = R + reliefBanda;
      const piele = Manifold.sphere(rb2 + G.reliefText, 192).subtract(Manifold.sphere(rb2 - 0.3, 192));
      text = fascicul.intersect(piele).subtract(exterior);
    }
  }

  // ---- piesele ----
  const piese: PiesaGlob[] = [];
  const pas = p.diametru + 8;
  let zTaietura = 0;
  if (vaza) {
    piese.push({ rol: 'corp', manifold: exterior.translate([0, 0, -zBaza]) });
    if (text && !text.isEmpty()) piese.push({ rol: 'text', manifold: text.translate([0, 0, -zBaza]) });
  } else {
    // interiorul: paralel cu profilul (sfera R-w, conurile deplasate cu w pe normala), deschis sus prin gat si
    // jos printr-o gaura mica in varf: o jumatate care se inchide sus (printata cu varful in sus) are un tavan
    // pe care Bambu Studio il semnaleaza ca regiune plutitoare, chiar si cu interiorul in varf la 45°
    const Ri = R - w;
    const zSi = Ri * Math.sin(a);
    const zNi = zN + w - w * Math.SQRT2;
    const profilInt = (z: number) => (z < -zSi ? rhoS - (-zS - z) - w * Math.SQRT2 : z <= zSi ? Math.sqrt(Math.max(0, Ri * Ri - z * z)) : rhoS - (z - zS) - w * Math.SQRT2);
    // conul interior, paralel cu cel exterior, se strange intr-un varf putin sub varful tesit: acolo e
    // gaura din varf (un con mai ingust ar lasa o treapta orizontala la trecerea in sfera)
    const zFund = w * Math.SQRT2 - rhoS - zS;
    const rInt: Array<{ z: number; rho: number }> = [];
    for (let i = 0; i < pasCon; i++) { const z = zFund + ((-zSi - zFund) * i) / pasCon; rInt.push({ z, rho: i === 0 ? 0 : profilInt(z) }); }
    for (let i = 0; i <= G.randuriSfera; i++) { const l = -G.latitudineUmar + ((2 * G.latitudineUmar) * i) / G.randuriSfera; const z = Ri * Math.sin(rad(l)); rInt.push({ z, rho: profilInt(z) }); }
    for (let i = 1; i <= pasCon; i++) { const z = zSi + ((zNi - zSi) * i) / pasCon; rInt.push({ z, rho: profilInt(z) }); }
    const rVarf = Math.max(G.gauraVarfMin, rhoVarf - w);
    const gol = corpRevolutie(rInt, N, (rho) => rho)
      .add(Manifold.cylinder(zT - zNi + 2, rn - w, rn - w, 96).translate([0, 0, zNi - 1]))
      .add(Manifold.cylinder(Math.max(0, zFund - zVarf) + rVarf + 2, rVarf, rVarf, 48).translate([0, 0, zVarf - 1]));
    let coaja = exterior.subtract(gol);

    // fantele: prin perete, departe de taietura, de banda, de gat si de pol
    zTaietura = areText ? -(hb / 2 + G.margineFante) : 0;
    if (p.model === 'fante') {
      const wf = p.latimeFanta, m = G.margineFante;
      // jos, fantele coboara si pe con, ca sa ramana loc si cand taietura e sub banda numelui
      const josF = -zS - (rhoS - rhoVarf) * 0.35, susF = zS - m;
      const segmente: Array<[number, number]> = [[josF, zTaietura - G.locasInel - m], [areText ? hb / 2 + m : zTaietura + G.locasInel + m, susF]];
      const fante: any[] = [];
      for (const [z1, z2] of segmente) {
        if (z2 - z1 < wf * 2) continue;
        // stadion in planul (x, -z), extrudat spre +Y, apoi rotit spre fiecare unghi
        const st = CrossSection.hull([CrossSection.circle(wf / 2, 24).translate([0, -(z1 + wf / 2)]), CrossSection.circle(wf / 2, 24).translate([0, -(z2 - wf / 2)])]);
        const lama = Manifold.extrude(st, R + 5).rotate([-90, 0, 0]);
        for (let k = 0; k < n; k++) fante.push(lama.rotate([0, 0, (360 * (k + 0.5)) / n - 90]));
      }
      if (fante.length) coaja = coaja.subtract(Manifold.union(fante));
    }

    // taietura si imbinarea: locas pe fiecare jumatate, inel presat (ca la globul din Ornament)
    let sus = coaja.trimByPlane([0, 0, 1], zTaietura);
    let jos = coaja.trimByPlane([0, 0, -1], -zTaietura);
    // Locasul se masoara la capatul lui adanc: cand taietura nu e la ecuator, peretele se strange spre pol pe
    // inaltimea locasului. Masurat la taietura, ar lasa inauntru o buza subtire agatata doar sus (Bambu Studio:
    // regiune plutitoare) si afara un perete de zecimi de milimetru.
    const h = G.locasInel;
    const razaInt = (z: number) => Math.sqrt(Math.max(0, Ri * Ri - z * z));
    const rI = razaInt(Math.abs(zTaietura) + h + w) - 0.5, rE = razaInt(Math.abs(zTaietura) + h) + w * G.fractieInel;
    const drept = Manifold.cylinder(h, rE, rE, 128).subtract(Manifold.cylinder(h + 1, rI, rI, 128).translate([0, 0, -0.5]));
    const hc = rE - rI;
    const racord = Manifold.cylinder(hc, rE, rI, 128).subtract(Manifold.cylinder(hc + 1, rI, rI, 128).translate([0, 0, -0.5])).translate([0, 0, h]);
    const locas = Manifold.union([drept, racord]).translate([0, 0, zTaietura - 0.01]);
    sus = sus.subtract(locas);
    jos = jos.subtract(locas.mirror([0, 0, 1]).translate([0, 0, 2 * zTaietura]));
    const tol = G.tolerantaInel;
    const inel = Manifold.cylinder(2 * h - 2 * tol, rE - tol, rE - tol, 128).subtract(Manifold.cylinder(2 * h + 1, rI + 0.1, rI + 0.1, 128).translate([0, 0, -0.5]));

    // pozitia de print: fiecare jumatate pe taietura
    const josPrint = jos.rotate([180, 0, 0]);
    piese.push({ rol: 'sus', manifold: sus.translate([0, 0, -zTaietura]) });
    piese.push({ rol: 'jos', manifold: josPrint.translate([pas, 0, -josPrint.boundingBox().min[2]]) });
    piese.push({ rol: 'inel', manifold: inel.translate([0, pas, 0]) });
    if (text && !text.isEmpty()) piese.push({ rol: 'text', manifold: text.translate([0, 0, -zTaietura]) });
  }

  // ---- capacul: pahar peste gat, cu gura in jos, si urechea deasupra ----
  const ri = rn + G.tolerantaCapac, re = ri + G.pereteCapac, hcap = G.inaltimeCapac;
  let capac = Manifold.cylinder(hcap + G.pereteCapac, re, re, 96).subtract(Manifold.cylinder(hcap, ri, ri, 96).translate([0, 0, -0.01]));
  capac = capac.add(Manifold.cylinder(1.2, re + 0.8, re + 0.8, 96).subtract(Manifold.cylinder(1.3, ri, ri, 96).translate([0, 0, -0.05])));
  const Lu = G.urecheLatime, Hu = G.urecheInaltime, g = G.urecheGrosime, d = G.urecheGaura;
  const placa = CrossSection.square([Lu, Hu + 2]).translate([-Lu / 2, 0]).offset(-1.5, 'Round').offset(1.5, 'Round');
  const picatura = CrossSection.circle(d / 2, 32).add(CrossSection.square([d / Math.SQRT2, d / Math.SQRT2], true).rotate(45).translate([0, d / Math.SQRT2 / 2])).translate([0, Hu + 2 - Lu / 2]);
  capac = capac.add(Manifold.extrude(placa.subtract(picatura), g).rotate([90, 0, 0]).translate([0, g / 2, hcap + G.pereteCapac - 0.5]));
  piese.push({ rol: 'capac', manifold: capac.translate(vaza ? [pas, 0, 0] : [pas, pas, 0]) });

  const consola = Math.max(0, ...piese.filter((x) => x.rol === 'corp' || x.rol === 'sus' || x.rol === 'jos').map((x) => arieNesustinuta(x.manifold)));

  return {
    piese,
    plan: { exterior, zTaietura, zBaza, zGat: zN, razaGat: rn, profil },
    diag: { inaltimeNume: hText, nuIncape, consola, fanteInVaza, segmente: N, glifeLipsa },
  };
}
