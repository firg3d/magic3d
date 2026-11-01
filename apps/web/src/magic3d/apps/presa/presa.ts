/**
 * APP PRESA DE HARTIE (embosser) — geometria produsului.
 *
 * Doua matrite pereche: POZITIVUL cu emblema in relief si NEGATIVUL cu locasul ei, mai larg si mai
 * adanc cu jocul (grosimea hartiei + toleranta), ca hartia prinsa intre ele sa se intinda fara sa
 * se rupa. Doua corpuri:
 *   · CLESTE: doua brate printate deschise, culcate, legate de balamaua print-in-place a editorului
 *     (core/geometry/balama.ts); se pliaza o data si raman legate;
 *   · PLACI: doua discuri cu stifturi de centrare, apasate cu mana sau intr-o menghina.
 * Emblema se citeste pe pozitiv privit de sus; negativul e oglinda ei, ca inchis sa cada peste.
 * Inchiderea (`inchide`) e aceeasi la amandoua: rotire 180° in jurul axei X, la inaltimea `ax`.
 */
import { balamaPliabila, configureManifold as configBalama } from '../../core/geometry/balama.js';
import { configureManifold as configEmblema, ariaSubtire, continut, incadreaza, type ModContinut } from '../../core/geometry/emblema.js';
import { PRESA } from './config.js';

let MOD: any = null;
export function configureManifold(mod: any): void { MOD = mod; configEmblema(mod); configBalama(mod); }

export interface ParamPresa {
  corp: 'cleste' | 'placi';
  mod: ModContinut;
  font: any;
  text: string;
  imagine: string;
  diametru: number;
  bordura: number;
  relief: number;
  hartie: number;
}

export type RolPresa = 'pozitiv' | 'negativ';

export interface DiagPresa {
  gol: boolean;
  incape: boolean;
  ariaSubtire: number;
  glifeLipsa: string[];
  joc: number;
}

export interface RezultatPresa {
  piese: Array<{ rol: RolPresa; manifold: any }>;
  diag: DiagPresa;
  /** Emblema (desen + inel), neoglindita, centrata pe origine, mm. */
  emblema: any | null;
  /** Unde sta emblema pe pozitiv (x, y) si la ce inaltime incepe relieful. */
  centru: [number, number];
  zFata: number;
  /** Inaltimea axei de inchidere (balamaua clestelui), mm. */
  ax: number;
  /** Negativul (asa cum e pe placa) dus in pozitia inchisa, peste pozitiv. */
  inchide: (negativ: any) => any;
}

export function buildPresa(p: ParamPresa): RezultatPresa {
  const { CrossSection, Manifold } = MOD;
  const D = Math.max(PRESA.diametruMin, Math.min(PRESA.diametruMax, p.diametru));
  const bordura = Math.max(0, p.bordura);
  const joc = p.hartie + PRESA.toleranta;
  const adancime = p.relief + PRESA.toleranta;
  const c = continut({ mod: p.mod, font: p.font, text: p.text, imagine: p.imagine, imagineFataDeText: PRESA.imagineFataDeText, golImagineText: PRESA.golImagineText });

  const cerc = CrossSection.circle(D / 2, PRESA.segmente);
  const inel = bordura > 0 ? cerc.subtract(CrossSection.circle(D / 2 - bordura, PRESA.segmente)) : null;
  let desen: any = null;
  let incape = true;
  if (c.sectiune) {
    const r = incadreaza(c.sectiune, CrossSection.circle(D / 2 - bordura - PRESA.margine, PRESA.segmente), PRESA.factorIncadrare, PRESA.incercariIncadrare);
    desen = r.sectiune;
    incape = r.incape;
  }
  const emblema = desen && inel ? desen.add(inel) : desen ?? inel;
  // Locasul: emblema largita cu jocul, oglindita fata de axa X (asa ajunge peste pozitiv la inchidere).
  const locas = emblema ? emblema.offset(joc, 'Round').mirror([0, 1]) : null;
  const pernuta = D + 2 * PRESA.marginePernuta;

  const piese: RezultatPresa['piese'] = [];
  let centru: [number, number];
  let zFata: number;
  let ax: number;
  let deplasare = 0;

  if (p.corp === 'placi') {
    const t = PRESA.grosimePlaca;
    zFata = t;
    ax = t + p.hartie / 2;
    centru = [0, 0];
    const raza = pernuta / 2 + PRESA.diametruStift / 2 + 1;
    const placa = CrossSection.circle(raza + PRESA.diametruStift / 2 + 2.5, PRESA.segmente);
    const loc = (unghi: number, semn: number): [number, number] => [raza * Math.cos((unghi * Math.PI) / 180), semn * raza * Math.sin((unghi * Math.PI) / 180)];
    let pozitiv = Manifold.extrude(placa, t);
    if (emblema) pozitiv = pozitiv.add(Manifold.extrude(emblema, p.relief).translate([0, 0, t]));
    const stift = PRESA.diametruStift / 2;
    pozitiv = Manifold.union([pozitiv, ...PRESA.stifturi.map((u) => Manifold.cylinder(p.hartie + PRESA.intrareStift, stift, stift, 32).translate([...loc(u, 1), t]))]);
    let negativ = Manifold.extrude(placa, t);
    if (locas) negativ = negativ.subtract(Manifold.extrude(locas, adancime + 0.01).translate([0, 0, t - adancime]));
    const gaura = stift + PRESA.tolerantaStift;
    negativ = negativ.subtract(Manifold.union(PRESA.stifturi.map((u) => Manifold.cylinder(t + 0.2, gaura, gaura, 32).translate([...loc(u, -1), -0.1]))));
    deplasare = 2 * (raza + stift + 2.5) + 8;
    piese.push({ rol: 'pozitiv', manifold: pozitiv }, { rol: 'negativ', manifold: negativ.translate([deplasare, 0, 0]) });
  } else {
    const t = PRESA.grosimeBrat;
    const s = t + PRESA.pernuta;
    zFata = s;
    ax = s + p.hartie / 2;
    const W = Math.max(PRESA.latimeMinBrat, pernuta);
    const bal = balamaPliabila({ latime: W, ax, razaAx: PRESA.razaAx, joc: PRESA.jocBalama, grosime: t, zale: PRESA.zale });
    if (Math.abs(bal.grosime - t) > 1e-6) throw new Error(`presa: bratul de ${t} mm nu incape sub axul balamalei (${bal.grosime} mm)`);
    const d = bal.inceputBrat;
    const yc = d + PRESA.golBalama + pernuta / 2;
    const L = yc + pernuta / 2 + PRESA.capatBrat;
    centru = [0, -yc];
    // Bratul continua frunza balamalei pe toata latimea, de unde incepe ea (departe de zalele celeilalte parti).
    const brat = (semn: number) => {
      const cs = CrossSection.square([W, L - d]).translate([-W / 2, d]).offset(-3, 'Round').offset(3, 'Round').add(CrossSection.square([W, 4]).translate([-W / 2, d]));
      return Manifold.extrude(semn < 0 ? cs.mirror([0, 1]) : cs, t);
    };
    const disc = CrossSection.circle(pernuta / 2, PRESA.segmente);
    let a = Manifold.union([brat(-1), Manifold.extrude(disc.translate([0, -yc]), PRESA.pernuta).translate([0, 0, t]), bal.a]);
    if (emblema) a = a.add(Manifold.extrude(emblema.translate([0, -yc]), p.relief).translate([0, 0, s]));
    let b = Manifold.union([brat(1), Manifold.extrude(disc.translate([0, yc]), PRESA.pernuta).translate([0, 0, t]), bal.b]);
    if (locas) b = b.subtract(Manifold.extrude(locas.translate([0, yc]), adancime + 0.01).translate([0, 0, s - adancime]));
    piese.push({ rol: 'pozitiv', manifold: a }, { rol: 'negativ', manifold: b });
  }

  const inchide = (negativ: any) => negativ.translate([-deplasare, 0, -ax]).rotate([180, 0, 0]).translate([0, 0, ax]);
  return {
    piese,
    diag: { gol: !desen, incape, ariaSubtire: desen ? ariaSubtire(desen, PRESA.detaliuMin, PRESA.factorColt * (PRESA.detaliuMin / 2) ** 2) : 0, glifeLipsa: c.glifeLipsa, joc },
    emblema,
    centru,
    zFata,
    ax,
    inchide,
  };
}
