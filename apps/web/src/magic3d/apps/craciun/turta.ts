/**
 * TURTA DULCE — geometria (manifold, Z in sus, Y IN JOS ca la toate generatoarele Magic3D).
 *
 * Fiecare forma e un sablon desenat (turta/*.svg, curbe Bezier, straturi cu nume fixe):
 *  - base: biscuitul; hang + gaura: urechea integrata si gaura ei;
 *  - icing-outline: traseul cordonului (lipsa: offset constant al bazei, la distanta data);
 *  - icing-cap: zapada topita (forma plina, unde e cazul);
 *  - decor: glazura fixa, desenata simetric, pe niveluri cumulative (simplu / mediu / bogat);
 *  - name-zone: dreptunghiul in care sta numele.
 * Nimic nu se mai aseaza aleator. Numele sta doar in zona lui: marime intre limitele config-ului,
 * apoi pe doua randuri, apoi (cu avertizare) mai mic; un element de decor peste care ar cadea
 * numele se ascunde, nu numele.
 *
 * Glazura e un cordon cu profil rotunjit: fiecare element se extrude in trepte, cu sectiunea
 * stransa spre varf dupa un sfert de cerc. Baza are muchia de sus rotunjita la fel.
 *
 * Toate cotele vin din config.ts. Fisierul intoarce geometria si diagnosticele; textele de
 * avertizare le alege constructorul.
 */

import type { Pt, Ring } from '../../core/geometry/forme2d.js';
import { citesteCale } from '../../core/geometry/svgCale.js';
import { NIVELURI_TURTA, TURTA } from './config.js';
import { configureComun, gol, nume2d } from './comun2d.js';
import { TURTA_SVG } from './turtaSvg.js';

let MOD: any = null;
export function configureManifold(mod: any): void { MOD = mod; configureComun(mod); }

export type NivelTurta = (typeof NIVELURI_TURTA)[number];

export interface ParamTurta {
  forma: string;
  marime: number;
  grosimeBaza: number;
  distantaCordon: number;
  latimeCordon: number;
  inaltimeCordon: number;
  nivel: NivelTurta;
  /** Obrajii (bujorii) din sablon: se pun doar la cerere. */
  obraji: boolean;
  font: any;
  text: string;
}

/**
 * Rolul unei piese, dupa care isi ia culoarea: baza, glazura, o pata care poate avea a treia culoare
 * (nasturi, papion), ochii (alb sau inchis) si obrajii (rosii).
 */
export type RolTurta = 'baza' | 'glazura' | 'detaliu' | 'ochi' | 'obraz';
export type FelGlazura = 'cordon' | 'capac' | 'linie' | 'pata' | 'nume';
export interface PiesaTurta { rol: RolTurta; fel: FelGlazura | 'baza'; manifold: any }

export interface DiagnosticTurta {
  inaltimeNume: number;
  /** Inaltimea minima a numelui in acest sablon (mm). */
  numeMin: number;
  randuri: number;
  /** Numele nu a incaput in zona nici pe doua randuri la marimea minima (e pus mai mic). */
  subMinim: boolean;
  subtire: number;
  /** Elemente de decor ascunse pentru ca le-ar fi acoperit numele. */
  decorAscuns: number;
  elementeGlazura: number;
  glifeLipsa: string[];
}

export interface RezultatTurta {
  piese: PiesaTurta[];
  diag: DiagnosticTurta;
  /** Pentru teste, in 2D: biscuitul fara ureche, forma intreaga, zona numelui, numele, decorul ramas, cordonul. */
  plan: { contur: any; forma: any; zona: any; nume: any; decor: any[]; cordon: any };
}

// ---------------------------------------------------------------- ajutoare

/** Subcaile inchise ale unor cai SVG, transformate cu (k, dx, dy). */
function inchise(cai: string[], k: number, dx: number, dy: number): Ring[] {
  return cai.flatMap((d) => citesteCale(d).filter((s) => s.inchisa).map((s) => s.puncte.map(([x, y]) => [x * k + dx, y * k + dy] as Pt)));
}

/** O linie (polilinie) de latime w, cu capete rotunde: capsule intre puncte succesive. */
function linie2d(pts: Pt[], w: number): any {
  const { CrossSection } = MOD;
  const cap = CrossSection.circle(w / 2, 20);
  const parti = [];
  for (let i = 1; i < pts.length; i++) parti.push(CrossSection.hull([cap.translate(pts[i - 1]), cap.translate(pts[i])]));
  return CrossSection.union(parti);
}

const inchide = (cs: any) => cs.offset(TURTA.colt, 'Miter').offset(-TURTA.colt, 'Miter').simplify(TURTA.colt / 2);

/**
 * O sectiune extrudata cu profil rotunjit, de la z0, inalta h: treapta j are sectiunea stransa cu
 * r * (1 - sqrt(1 - (z/h)^2)) (un sfert de cerc), dar niciodata sub `varf` latime ramasa.
 */
function cuProfil(cs: any, z0: number, h: number, r: number, varf: number): any {
  const { Manifold } = MOD;
  const n = TURTA.pasiProfil;
  const trepte: any[] = [];
  for (let j = 0; j < n; j++) {
    const zMij = ((j + 0.5) / n) * h;
    const strans = Math.min(r * (1 - Math.sqrt(Math.max(0, 1 - (zMij / h) ** 2))), Math.max(0, r - varf / 2));
    const s = j === 0 ? cs : inchide(cs.offset(-strans, 'Round'));
    if (s.isEmpty()) break;
    trepte.push(Manifold.extrude(s, h / n + (j < n - 1 ? 0.001 : 0)).translate([0, 0, z0 + (j * h) / n]));
  }
  return Manifold.union(trepte);
}

/** Imparte un nume in doua randuri, doar la cratima sau la spatiul cel mai apropiat de mijloc; un cuvant nu se rupe niciodata (null). */
function douaRanduri(text: string): [string, string] | null {
  const t = text.trim();
  const rupturi = [...t.matchAll(/[-\s]/g)].map((m) => m.index!);
  if (rupturi.length) {
    const i = rupturi.reduce((b, x) => (Math.abs(x - t.length / 2) < Math.abs(b - t.length / 2) ? x : b));
    return [t.slice(0, t[i] === '-' ? i + 1 : i).trim(), t.slice(i + 1).trim()];
  }
  return null;
}

// ---------------------------------------------------------------- turta

export function buildTurta(p: ParamTurta): RezultatTurta {
  const { CrossSection } = MOD;
  const T = TURTA;
  const s = TURTA_SVG[p.forma];
  if (!s) throw new Error(`forma necunoscuta: ${p.forma}`);
  const glifeLipsa: string[] = [];

  // ---- scara: latura cea mai mare a biscuitului cu urechea = marimea ceruta, centrat ----
  const brut = new CrossSection(inchise([...s.base, ...s.hang], 1, 0, 0), 'NonZero');
  const bb = brut.bounds();
  const k = p.marime / Math.max(bb.max[0] - bb.min[0], bb.max[1] - bb.min[1]);
  const dx = -((bb.min[0] + bb.max[0]) / 2) * k, dy = -((bb.min[1] + bb.max[1]) / 2) * k;
  const strat = (cai: string[]) => (cai.length ? new CrossSection(inchise(cai, k, dx, dy), 'NonZero') : gol());

  // Decupajele (bucle de funda) sunt goluri in biscuit: cordonul le urmeaza ca pe margine.
  const contur = s.decupaje.length ? strat(s.base).subtract(strat(s.decupaje)) : strat(s.base);
  const gaura = strat(s.gaura);
  // Urechea se racordeaza lin cu conturul (o rotunjire concava la imbinare).
  const forma = contur.add(strat(s.hang)).offset(T.racordUreche, 'Round').offset(-T.racordUreche, 'Round');
  const baza2d = forma.subtract(gaura);

  // ---- cordonul: pe traseul desenat sau la distanta constanta de margine ----
  // Cordonul urmeaza conturul biscuitului, fara ocoluri; gaura de agatat (in sablon, sub cordon) e ocolita
  // doar de decor si de nume.
  const pentruGlazura = contur;
  const ocolitGaura = gaura.offset(T.distantaGlazura, 'Round');
  let cordon: any;
  if (s.conturGlazura.length) {
    const pts = citesteCale(s.conturGlazura[0])[0].puncte.map(([x, y]) => [x * k + dx, y * k + dy] as Pt);
    cordon = linie2d([...pts, pts[0]], p.latimeCordon);
  } else {
    // Linia de mijloc a cordonului, cu toate colturile rotunjite (raza mai mare decat jumatate din latime; la
    // ocolul gaurii apar si colturi ascutite iesite),
    // apoi o banda de latimea cordonului in jurul ei: latimea ramane aceeasi pe tot traseul, si la ocolul gaurii.
    const r = p.latimeCordon / 2 + T.racordCordon;
    const mijloc = pentruGlazura.offset(-(p.distantaCordon + p.latimeCordon / 2), 'Round').offset(r, 'Round').offset(-r, 'Round').offset(-r, 'Round').offset(r, 'Round');
    cordon = mijloc.offset(p.latimeCordon / 2, 'Round').subtract(mijloc.offset(-p.latimeCordon / 2, 'Round'));
  }
  // Insulele de cordon prea mici (in varfuri inguste: steluta bradului, coarnele renului) nu se pun.
  cordon = CrossSection.union(cordon.decompose().filter((c: any) => c.area() >= T.cordonMinArie));
  const interior = pentruGlazura.offset(-(p.distantaCordon + p.latimeCordon + T.distantaGlazura), 'Round').subtract(ocolitGaura);

  // ---- zapada topita si decorul nivelului ales ----
  // Liniile de decor (valuri peste incheieturi) se opresc la distantaDecorCordon de cordon, la ambele capete.
  const peCordon = pentruGlazura.offset(-(p.distantaCordon + p.latimeCordon + T.distantaDecorCordon), 'Round').subtract(ocolitGaura);
  const capac = s.capac.length ? strat(s.capac).intersect(interior) : gol();
  const pana = NIVELURI_TURTA.indexOf(p.nivel);
  let decor: Array<{ fel: FelGlazura; rol: RolTurta; cs: any }> = [];
  for (const d of s.decor) {
    if (NIVELURI_TURTA.indexOf(d.nivel as NivelTurta) > pana) continue;
    if (d.tip === 'obraz' && !p.obraji) continue;
    const rol: RolTurta = d.tip === 'ochi' ? 'ochi' : d.tip === 'obraz' ? 'obraz' : d.tip === 'linie' ? 'glazura' : 'detaliu';
    if (d.linie) {
      for (const sub of citesteCale(d.d)) {
        const pts = sub.puncte.map(([x, y]) => [x * k + dx, y * k + dy] as Pt);
        if (sub.inchisa) pts.push(pts[0]);
        decor.push({ fel: 'linie', rol: 'glazura', cs: linie2d(pts, T.latimeLinieDecor).intersect(peCordon) });
      }
    } else decor.push({ fel: 'pata', rol, cs: strat([d.d]).intersect(interior) });
  }
  // Elementele care s-ar atinge de unul deja pus nu se pun (piese separate nu se suprapun).
  const pastrate: typeof decor = [];
  for (const e of decor.filter((x) => x.cs.area() > 0.3)) if (pastrate.every((q) => q.cs.offset(T.distantaGlazura / 2, 'Round').intersect(e.cs).isEmpty())) pastrate.push(e);
  decor = pastrate;

  // ---- numele, doar in zona lui ----
  // Zonele, in ordine: prima e cea obisnuita (de pilda sub nasturi), urmatoarele sunt mai mari (si
  // cuprind decor, care se ascunde). In fiecare: un rand, apoi doua; abia la sfarsit, sub minim.
  const zone = s.zonaNume.map((d) => strat([d]).intersect(interior)).filter((z: any) => !z.isEmpty());
  let zona = zone[0] ?? gol();
  let numeCs: any = gol();
  let hNume = 0, randuri = 1, subMinim = false, subtire = 0, decorAscuns = 0;
  const text = p.text.trim();
  if (text && zone.length) {
    /** Randurile, la inaltimea h, centrate in zona z (unul sub altul, la spatiuRanduri). */
    const bloc = (z: any, linii: string[], h: number) => {
      const rand = linii.map((l) => nume2d(p.font, l, 10, 1, glifeLipsa)).filter(Boolean).map((cs: any) => {
        const b = cs.bounds();
        return cs.translate([-(b.min[0] + b.max[0]) / 2, 0]).scale(h / 10);
      });
      if (!rand.length) return null;
      const pas = h * (1 + T.spatiuRanduri);
      const tot = CrossSection.union(rand.map((r: any, i: number) => r.translate([0, i * pas])));
      const b = tot.bounds(), zb = z.bounds();
      return tot.translate([(zb.min[0] + zb.max[0]) / 2 - (b.min[0] + b.max[0]) / 2, (zb.min[1] + zb.max[1]) / 2 - (b.min[1] + b.max[1]) / 2]).offset(T.ingrosareText, 'Round');
    };
    const incape = (z: any, cs: any) => !!cs && cs.subtract(z).area() < 0.02;
    /** Cea mai mare inaltime (intre jos si sus) la care randurile incap in zona z; 0 = nici la jos. */
    const potrivit = (z: any, linii: string[], jos: number, sus: number) => {
      if (!incape(z, bloc(z, linii, jos))) return 0;
      if (incape(z, bloc(z, linii, sus))) return sus;
      for (let i = 0; i < 8; i++) { const m = (jos + sus) / 2; if (incape(z, bloc(z, linii, m))) jos = m; else sus = m; }
      return jos;
    };
    const hMin = s.numeMin ?? T.numeMin, hMax = s.numeMax ?? T.numeMax;
    let ales: { z: any; linii: string[]; h: number } | null = null;
    for (const z of zone) {
      for (const linii of [[text], douaRanduri(text)].filter((l): l is string[] => !!l)) {
        const h = potrivit(z, linii, hMin, hMax);
        if (h) { ales = { z, linii, h }; break; }
      }
      if (ales) break;
    }
    if (!ales) {
      subMinim = true;
      const z = zone[zone.length - 1];
      const doiR = douaRanduri(text);
      const un = potrivit(z, [text], T.numeMinAbsolut, hMin), doua = doiR ? potrivit(z, doiR, T.numeMinAbsolut, hMin) : 0;
      // Cel mai mare care inca incape in zona (numele nu iese niciodata din ea); la limita, cel mai mic.
      ales = un >= doua || !doiR ? { z, linii: [text], h: un || T.numeMinAbsolut } : { z, linii: doiR, h: doua };
    }
    zona = ales.z;
    randuri = ales.linii.length;
    hNume = ales.h;
    numeCs = bloc(ales.z, ales.linii, ales.h) ?? gol();
    // Decorul peste care ar cadea numele se ascunde (numele ramane intreg).
    const ocolit = numeCs.offset(T.distantaGlazura, 'Round');
    const ramas = decor.filter((e) => e.cs.intersect(ocolit).isEmpty());
    decorAscuns = decor.length - ramas.length;
    decor = ramas;
    const deschis = numeCs.offset(-T.linieMin / 2, 'Round').offset(T.linieMin / 2, 'Round');
    subtire = (numeCs.area() - deschis.intersect(numeCs).area()) / Math.max(1e-9, numeCs.area());
  }

  // ---- piesele: baza cu muchia rotunjita, apoi cate o piesa pe element de glazura ----
  const r = T.rotunjireMuchie;
  const piese: PiesaTurta[] = [{ rol: 'baza', fel: 'baza', manifold: MOD.Manifold.extrude(inchide(baza2d), p.grosimeBaza - r).add(cuProfil(inchide(baza2d), p.grosimeBaza - r, r, r, 0)) }];
  const glazura = (fel: FelGlazura, rol: RolTurta, cs: any) => {
    const c = inchide(cs);
    if (c.isEmpty()) return;
    piese.push({ rol, fel, manifold: cuProfil(c, p.grosimeBaza, p.inaltimeCordon, p.latimeCordon / 2, T.varfMin) });
  };
  glazura('cordon', 'glazura', cordon);
  if (!capac.isEmpty()) glazura('capac', 'glazura', capac);
  for (const e of decor) glazura(e.fel, e.rol, e.cs);
  if (!numeCs.isEmpty()) glazura('nume', 'glazura', numeCs);

  return {
    piese,
    plan: { contur, forma, zona, nume: numeCs, decor: decor.map((e) => e.cs), cordon },
    diag: { inaltimeNume: hNume, numeMin: s.numeMin ?? T.numeMin, randuri, subMinim, subtire, decorAscuns, elementeGlazura: piese.length - 1, glifeLipsa },
  };
}
