/**
 * APP STAMPILA — geometria produsului.
 *
 * O fata cu desenul in relief (textul si/sau logo-ul clientului) si un maner, doua corpuri lipite:
 *   · CERNEALA: fata din TPU, manerul din PLA; desenul e oglindit, ca pe hartie sa se citeasca drept;
 *   · LUT / FONDANT / BISCUITI: relief mai adanc, oglindirea la alegere (un desen simetric nu o cere).
 * Forma fetei: rotunda, patrata, dreptunghiulara sau dupa conturul desenului. Pe marginea de sus,
 * fata si talpa manerului au aceeasi urechiusa: lipite cu urechiusele una peste alta, desenul sta
 * cum arata marcajul de pe varful manerului (sageata spre sus sau desenul neoglindit).
 *
 * Coordonatele sunt Y in jos (sus = Y negativ), ca textul si imaginea. Fata se printeaza cu
 * relieful in sus, manerul in picioare pe talpa. Nimic nu e judecat aici: diagnosticul spune cat
 * din desen e prea subtire, constructorul hotaraste ce avertizari arata.
 */
import { configureManifold as configEmblema, ariaSubtire, centreaza, continut, incadreaza, type ModContinut } from '../../core/geometry/emblema.js';
import { STAMPILA } from './config.js';

let MOD: any = null;
export function configureManifold(mod: any): void { MOD = mod; configEmblema(mod); }

export type FormaStampila = 'rotunda' | 'patrata' | 'dreptunghi' | 'contur';
export type ManerStampila = 'cilindru' | 'ciuperca' | 'bloc';

export interface ParamStampila {
  varianta: 'cerneala' | 'lut';
  mod: ModContinut;
  font: any;
  text: string;
  imagine: string;
  forma: FormaStampila;
  latime: number;
  inaltime: number;
  bordura: number;
  relief: number;
  /** Doar la lut; la cerneala desenul e mereu oglindit. */
  oglindit: boolean;
  maner: ManerStampila;
  marcaj: 'sageata' | 'model';
}

export type RolStampila = 'fata' | 'maner' | 'marcaj';

export interface DiagStampila {
  gol: boolean;
  incape: boolean;
  oglindit: boolean;
  /** Aria desenului mai subtire decat linia minima a variantei, mm². */
  ariaSubtire: number;
  liniaMin: number;
  glifeLipsa: string[];
  latime: number;
  inaltime: number;
}

export interface RezultatStampila {
  piese: Array<{ rol: RolStampila; manifold: any }>;
  diag: DiagStampila;
  /** Desenul asa cum se citeste pe hartie (neoglindit), in mm, in coordonatele fetei. */
  desen: any | null;
}

const dreptunghi = (w: number, h: number, r: number) => MOD.CrossSection.square([w, h], true).offset(-r, 'Round').offset(r, 'Round');

/** Doar inelele exterioare: conturul fara gaurile literelor. */
function plin(cs: any): any {
  const exterioare = (cs.toPolygons() as Array<Array<[number, number]>>).filter((inel) => {
    let a = 0;
    for (let i = 0; i < inel.length; i++) { const [x1, y1] = inel[i], [x2, y2] = inel[(i + 1) % inel.length]; a += x1 * y2 - x2 * y1; }
    return a > 0;
  });
  return new MOD.CrossSection(exterioare, 'NonZero');
}

/** Varful de sus (Y minim) al conturului pe verticala din mijloc. */
function sus(cs: any): number {
  const b = cs.bounds();
  const fasie = cs.intersect(MOD.CrossSection.square([0.4, b.max[1] - b.min[1] + 2]).translate([-0.2, b.min[1] - 1]));
  return fasie.isEmpty() ? b.min[1] : fasie.bounds().min[1];
}

/** Sageata spre sus (Y negativ), in [-1, 1]. */
function sageata(): any {
  const { CrossSection } = MOD;
  const cap = new CrossSection([[[0, -1], [-0.62, -0.18], [0.62, -0.18]]], 'Positive');
  return cap.add(CrossSection.square([0.42, 1.2]).translate([-0.21, -0.2]));
}

export function buildStampila(p: ParamStampila): RezultatStampila {
  const { CrossSection, Manifold } = MOD;
  const latime = Math.max(STAMPILA.latimeMin, Math.min(STAMPILA.latimeMax, p.latime));
  const inaltime = p.forma === 'rotunda' || p.forma === 'patrata' ? latime : Math.max(STAMPILA.inaltimeMin, Math.min(STAMPILA.latimeMax, p.inaltime));
  const bordura = Math.max(0, p.bordura);
  const departe = bordura + STAMPILA.margine;
  const oglindit = p.varianta === 'cerneala' || p.oglindit;
  const liniaMin = p.varianta === 'lut' ? STAMPILA.liniaMinLut : STAMPILA.liniaMin;
  const c = continut({ mod: p.mod, font: p.font, text: p.text, imagine: p.imagine, imagineFataDeText: STAMPILA.imagineFataDeText, golImagineText: STAMPILA.golImagineText });

  // Conturul fetei si desenul asezat in el (amandoua neoglindite: cum se vede pe hartie).
  let contur: any;
  let desen: any = null;
  let incape = true;
  if (p.forma === 'contur') {
    const cutie = CrossSection.square([latime - 2 * departe, inaltime - 2 * departe], true);
    if (c.sectiune) {
      const r = incadreaza(c.sectiune, cutie, STAMPILA.factorIncadrare, STAMPILA.incercariIncadrare);
      desen = r.sectiune;
      contur = plin(desen.offset(departe, 'Round'));
      // Bucati separate (litere departe una de alta): conturul lor comun.
      if (contur.decompose().filter((b: any) => b.area() > STAMPILA.arieAschie).length > 1) contur = desen.hull().offset(departe, 'Round');
    } else {
      contur = dreptunghi(latime, inaltime, STAMPILA.razaColt);
    }
  } else {
    contur = p.forma === 'rotunda' ? CrossSection.circle(latime / 2, STAMPILA.segmente) : dreptunghi(latime, inaltime, STAMPILA.razaColt);
    if (c.sectiune) {
      const r = incadreaza(c.sectiune, contur.offset(-departe, 'Round'), STAMPILA.factorIncadrare, STAMPILA.incercariIncadrare);
      desen = r.sectiune;
      incape = r.incape;
    }
  }
  const mijloc = contur.bounds();
  const dx = -(mijloc.min[0] + mijloc.max[0]) / 2, dy = -(mijloc.min[1] + mijloc.max[1]) / 2;
  contur = contur.translate([dx, dy]);
  if (desen) desen = desen.translate([dx, dy]);
  const cheie = CrossSection.circle(STAMPILA.razaCheie, 32).translate([0, sus(contur)]);
  const talpa = contur.add(cheie);
  const inel = bordura > 0 ? contur.subtract(contur.offset(-bordura, 'Round')) : null;

  // Fata: placa + relief, oglindita stanga-dreapta (relieful in sus, cum se printeaza).
  const oglinda = (cs: any) => (oglindit ? cs.mirror([1, 0]) : cs);
  let peFata = desen;
  if (inel) peFata = peFata ? peFata.add(inel) : inel;
  let fata = Manifold.extrude(oglinda(talpa), STAMPILA.grosimeFata);
  if (peFata) fata = fata.add(Manifold.extrude(oglinda(peFata), p.relief).translate([0, 0, STAMPILA.grosimeFata]));

  // Manerul, in picioare pe talpa (talpa are conturul fetei asa cum sta lipita: neoglindit).
  const b = contur.bounds();
  const minim = Math.min(b.max[0] - b.min[0], b.max[1] - b.min[1]);
  let maner = Manifold.extrude(talpa, STAMPILA.talpa);
  let varf: any;
  let zVarf: number;
  if (p.maner === 'bloc') {
    maner = Manifold.extrude(talpa, STAMPILA.blocInaltime);
    varf = contur;
    zVarf = STAMPILA.blocInaltime;
  } else if (p.maner === 'cilindru') {
    const d = Math.max(STAMPILA.cilindruMin, Math.min(STAMPILA.cilindruMax, minim * STAMPILA.cilindruFractie));
    maner = maner.add(Manifold.cylinder(STAMPILA.cilindruInaltime, d / 2, d / 2, STAMPILA.segmente).translate([0, 0, STAMPILA.talpa]));
    varf = CrossSection.circle(d / 2, STAMPILA.segmente);
    zVarf = STAMPILA.talpa + STAMPILA.cilindruInaltime;
  } else {
    const dp = Math.max(STAMPILA.ciupercaPiciorMin, Math.min(STAMPILA.ciupercaPiciorMax, minim * STAMPILA.ciupercaPicior));
    const dc = dp + STAMPILA.ciupercaCap;
    const z0 = STAMPILA.talpa + STAMPILA.ciupercaPiciorInaltime;
    // Sub palaria ciupercii, un con la 45°: se printeaza fara suport.
    const con = (dc - dp) / 2;
    maner = Manifold.union([
      maner,
      Manifold.cylinder(STAMPILA.ciupercaPiciorInaltime + 0.01, dp / 2, dp / 2, STAMPILA.segmente).translate([0, 0, STAMPILA.talpa]),
      Manifold.cylinder(con, dp / 2, dc / 2, STAMPILA.segmente).translate([0, 0, z0]),
      Manifold.cylinder(STAMPILA.ciupercaCapInaltime, dc / 2, dc / 2, STAMPILA.segmente).translate([0, 0, z0 + con - 0.01]),
    ]);
    varf = CrossSection.circle(dc / 2, STAMPILA.segmente);
    zVarf = z0 + con - 0.01 + STAMPILA.ciupercaCapInaltime;
  }

  // Marcajul de pe varf: desenul neoglindit (cum iese pe hartie) sau o sageata spre urechiusa.
  const zonaMarcaj = varf.offset(-STAMPILA.marcajMargine, 'Round');
  const model = p.marcaj === 'model' && desen ? centreaza(desen) : sageata();
  const marcajCs = incadreaza(model, zonaMarcaj, STAMPILA.factorIncadrare, STAMPILA.incercariIncadrare).sectiune;
  const marcaj = Manifold.extrude(marcajCs, STAMPILA.marcajInaltime).translate([0, 0, zVarf]);

  return {
    piese: [{ rol: 'fata', manifold: fata }, { rol: 'maner', manifold: maner }, { rol: 'marcaj', manifold: marcaj }],
    diag: {
      gol: !desen,
      incape,
      oglindit,
      ariaSubtire: desen ? ariaSubtire(desen, liniaMin, STAMPILA.factorColt * (liniaMin / 2) ** 2) : 0,
      liniaMin,
      glifeLipsa: c.glifeLipsa,
      latime: b.max[0] - b.min[0],
      inaltime: b.max[1] - b.min[1],
    },
    desen,
  };
}
