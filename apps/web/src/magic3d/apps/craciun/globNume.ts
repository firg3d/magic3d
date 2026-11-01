/**
 * GLOB CU NUME DECUPAT — geometria (manifold, Z in sus, Y IN JOS ca la toate generatoarele Magic3D).
 *
 * Un ornament plat, cu fundalul decupat: rama (cerc, oval, stea, brad) cu urechea de agatat,
 * numele care traverseaza golul si se prinde de rama la ambele capete, decorul (fulgi, stelute,
 * brazi) asezat in golurile ramase, fiecare element agatat de rama, si optional un disc subtire in
 * spate, pe alta culoare.
 *
 * Totul se lucreaza in 2D (CrossSection) si se extrude la sfarsit. Rama, numele si legaturile lor
 * sunt o singura piesa; ca sa ramana asa, dupa asezarea numelui:
 *  - capetele care nu ajung la rama primesc o punte orizontala pana in ea;
 *  - literele care stau singure (font bloc) se leaga printr-o bara discreta pe linia de baza;
 *  - punctele si diacriticele se leaga de cea mai apropiata parte deja legata (core/geometry/punti).
 * Se verifica apoi ca a rezultat o singura bucata (fara aschii sub GLOB_NUME.aschieMax).
 *
 * Toate cotele vin din config.ts. Fisierul intoarce geometria si diagnosticele; textele de
 * avertizare le alege constructorul.
 */

import { centroid, type Pt, type Ring } from '../../core/geometry/forme2d.js';
import { formaDecor } from '../../core/geometry/formeDecor.js';
import { conturExterior, planificaPunti } from '../../core/geometry/punti.js';
import { citesteCale } from '../../core/geometry/svgCale.js';
import { configureManifold as configTextSolid, textSolid } from '../../core/geometry/textSolid.js';
import { GLOB_NUME } from './config.js';
import { FORME_SVG } from './formeSvg.js';

let MOD: any = null;
export function configureManifold(mod: any): void { MOD = mod; configTextSolid(mod); }

export type FormaGlob = 'cerc' | 'oval' | 'stea' | 'brad';
export type Legatura = 'auto' | 'bara' | 'fara';
export type Decor = 'fara' | 'fulgi' | 'stele' | 'brazi' | 'amestec';

export interface ParamGlobNume {
  forma: FormaGlob;
  latime: number;
  latimeRama: number;
  grosime: number;
  font: any;
  text: string;
  legatura: Legatura;
  decor: Decor;
  /** Cate elemente de decor se cer (0 = fara). */
  densitate: number;
  /** Samanta modelului aleator: acelasi numar, acelasi decor. */
  samanta: number;
  fundal: boolean;
  /** Decorul are culoarea ramei: atunci e in aceeasi piesa cu ea. */
  decorCaRama: boolean;
}

export interface DiagnosticGlobNume {
  /** Inaltimea literelor mari (mm) si comprimarea pe latime (1 = deloc). */
  inaltimeNume: number;
  comprimare: number;
  /** Numele nu incape nici comprimat la maxim, la inaltimea minima. */
  nuIncape: boolean;
  /** Numele atinge rama in stanga si in dreapta (dupa punti). */
  atingeStanga: boolean;
  atingeDreapta: boolean;
  /** Punti puse: la capete si spre bucatile desprinse; bara de legatura a literelor. */
  puntiCapete: number;
  puntiBucati: number;
  bara: boolean;
  /** Bucatile ramei cu numele (fara aschii): 1 = o singura piesa. */
  bucati: number;
  /** Partea din nume mai subtire decat linia minima. */
  subtire: number;
  decorCerut: number;
  decorPus: number;
  glifeLipsa: string[];
}

export type RolPiesa = 'rama' | 'decor' | 'fundal';
export interface PiesaGlob { rol: RolPiesa; manifold: any }

export interface RezultatGlobNume {
  piese: PiesaGlob[];
  diag: DiagnosticGlobNume;
  /** Cele trei straturi 2D (pentru teste): rama cu numele, numele cu legaturile lui, decorul. */
  plan: { rama: any; nume: any; decor: any };
}

// ---------------------------------------------------------------- ajutoare 2D

/** Inelele unei forme decorative (Y in sus, [-1, 1]) la raza ceruta, cu Y in jos. */
function inele(forma: 'stea' | 'brad', raza: number): Ring[] {
  return formaDecor(forma).map((r) => r.map(([x, y]) => [x * raza, -y * raza] as Pt).reverse());
}

function conturForma(p: ParamGlobNume): any {
  const { CrossSection } = MOD;
  const r = p.latime / 2;
  if (p.forma === 'cerc') return CrossSection.circle(r, GLOB_NUME.segmente);
  if (p.forma === 'oval') return CrossSection.circle(r, GLOB_NUME.segmente).scale([1, GLOB_NUME.raportOval]);
  return new CrossSection(inele(p.forma, r), 'NonZero');
}

/** Varful de agatat: pe axa de mijloc a formei, marginea de sus a conturului pe acea verticala. */
function varf(cs: any): Pt {
  const b = cs.bounds();
  const x = (b.min[0] + b.max[0]) / 2;
  const fasie = cs.intersect(MOD.CrossSection.square([0.4, b.max[1] - b.min[1] + 2]).translate([x - 0.2, b.min[1] - 1]));
  return [x, fasie.isEmpty() ? b.min[1] : fasie.bounds().min[1]];
}

/** Coarda interiorului la inaltimea y, cea care contine x (sau cea mai lata): [stanga, dreapta]. */
function coarda(cs: any, y: number, x?: number): [number, number] | null {
  const b = cs.bounds();
  const fasie = cs.intersect(MOD.CrossSection.square([b.max[0] - b.min[0] + 2, 0.2]).translate([b.min[0] - 1, y - 0.1]));
  const bucati = fasie.decompose().map((c: any) => c.bounds()).map((q: any) => [q.min[0], q.max[0]] as [number, number]);
  if (!bucati.length) return null;
  const cu = x === undefined ? undefined : bucati.find(([a, d]: [number, number]) => a <= x && x <= d);
  return cu ?? bucati.reduce((m: [number, number], c: [number, number]) => (c[1] - c[0] > m[1] - m[0] ? c : m));
}

/** Bara de latime w intre doua puncte, cu capetele prelungite cu `prel` (intra in material). */
function bara2d(a: Pt, b: Pt, w: number, prel = 0.8): any {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const L = Math.hypot(dx, dy) || 1;
  return MOD.CrossSection.square([L + 2 * prel, w], true)
    .rotate((Math.atan2(dy, dx) * 180) / Math.PI)
    .translate([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
}

/** O sectiune goala (elementul neutru al reuniunii). */
const gol = () => { const q = MOD.CrossSection.square([1, 1]); return q.subtract(q); };

/** Bucatile care conteaza (aria peste pragul de aschie). */
const bucatiReale = (cs: any) => cs.decompose().filter((c: any) => c.area() > GLOB_NUME.aschieMax);

/** Punct in poligoane (par-impar), pentru esantionarea zonei de decor. */
function inPoligoane(pol: Pt[][], x: number, y: number): boolean {
  let in_ = false;
  for (const r of pol) {
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const [xi, yi] = r[i], [xj, yj] = r[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) in_ = !in_;
    }
  }
  return in_;
}

/** Generator determinist (mulberry32): aceeasi samanta, acelasi decor. */
function aleator(samanta: number): () => number {
  let s = (samanta >>> 0) || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Un desen din forme/*.svg la marimea `marime` (mm, latura viewBox-ului), cu liniile late de `w`. */
export function formaSvg(nume: string, marime: number, w: number): any {
  const { CrossSection } = MOD;
  const desen = FORME_SVG[nume];
  if (!desen) throw new Error(`forma necunoscuta: ${nume}`);
  const k = marime / 100;
  const parti: any[] = [];
  const pline: Ring[] = desen.pline.flatMap((d) => citesteCale(d).filter((s) => s.inchisa).map((s) => s.puncte.map(([x, y]) => [x * k, y * k] as Pt)));
  if (pline.length) parti.push(new CrossSection(pline, 'NonZero'));
  const cap = CrossSection.circle(w / 2, 16);
  for (const d of desen.linii) {
    for (const s of citesteCale(d)) {
      const pts = s.puncte.map(([x, y]) => [x * k, y * k] as Pt);
      if (s.inchisa) pts.push(pts[0]);
      for (let i = 1; i < pts.length; i++) parti.push(CrossSection.hull([cap.translate(pts[i - 1]), cap.translate(pts[i])]));
    }
  }
  return CrossSection.union(parti);
}

const DESENE: Record<Exclude<Decor, 'fara'>, string[]> = {
  fulgi: ['fulg', 'fulg-simplu'],
  stele: ['steluta'],
  brazi: ['brad'],
  amestec: ['fulg', 'steluta', 'fulg-simplu', 'brad'],
};

// ---------------------------------------------------------------- numele

/** Numele ca sectiune 2D: inaltimea literelor mari h, comprimat pe X cu sx; linia de baza pe y = 0. */
function nume2d(font: any, text: string, h: number, sx: number, glifeLipsa: string[]): any | null {
  if (!text.trim()) return null;
  const rep: any = {};
  const solid = textSolid(font, text, h, 1, rep);
  for (const g of rep.glifeLipsa ?? []) glifeLipsa.push(...(g.caractere ?? []));
  const cs = solid.slice(0.5);
  return sx === 1 ? cs : cs.scale([sx, 1]);
}

// ---------------------------------------------------------------- ornamentul

export function buildGlobNume(p: ParamGlobNume): RezultatGlobNume {
  const { Manifold, CrossSection } = MOD;
  const G = GLOB_NUME;
  const glifeLipsa: string[] = [];

  let contur = conturForma(p);
  const interior = contur.offset(-p.latimeRama, 'Round');
  const ring = contur.subtract(interior);
  const intrare = G.patrundere * p.latimeRama;

  // ---- urechea, deasupra varfului, legata de rama printr-un gat ----
  const sus = varf(contur);
  const rGaura = G.diametruGaura / 2;
  const rExt = rGaura + G.pereteUreche;
  const cUreche: Pt = [sus[0], sus[1] - rGaura];
  const gat = CrossSection.square([rExt * 1.3, rExt + p.latimeRama]).translate([cUreche[0] - rExt * 0.65, cUreche[1]]);
  contur = contur.add(CrossSection.circle(rExt, 48).translate(cUreche)).add(gat);
  const gaura = CrossSection.circle(rGaura, 48).translate(cUreche);
  const zonaUreche = CrossSection.circle(rExt + G.distantaDecor, 48).translate(cUreche).add(gat.offset(G.distantaDecor, 'Round'));

  // ---- numele: marimea, apoi asezarea pe linia centrului interiorului ----
  const bi = interior.bounds();
  const [cx, cy] = centroid(interior);
  const hRef = 10;
  const ref = nume2d(p.font, p.text, hRef, 1, glifeLipsa);
  let nume: any = null;
  let h = 0, sx = 1, nuIncape = false;
  let atingeStanga = false, atingeDreapta = false, puntiCapete = 0, puntiBucati = 0, bara = false;
  let legaturi: any = gol();
  if (ref && !ref.isEmpty()) {
    const rb = ref.bounds();
    const inaltRef = rb.max[1] - rb.min[1], latRef = rb.max[0] - rb.min[0];
    const c0 = coarda(interior, cy, cx) ?? [bi.min[0], bi.max[0]];
    const tinta = c0[1] - c0[0] + 2 * intrare;
    const hInaltime = (hRef * G.inaltimeTextMax * (bi.max[1] - bi.min[1])) / inaltRef;
    const hLatime = (hRef * tinta) / latRef;
    h = Math.min(hInaltime, hLatime);
    if (h < G.textMin) {
      // Un nume lung: intai se ingusteaza (pana la comprimareMax) la inaltimea minima, apoi se micsoreaza.
      h = G.textMin;
      sx = Math.max(G.comprimareMax, tinta / ((latRef * h) / hRef));
      if ((latRef * h * sx) / hRef > tinta + 0.01) {
        nuIncape = true;
        h = (hRef * tinta) / (latRef * sx);
      }
    }
    const brut = nume2d(p.font, p.text, h, sx, [])!;
    const b = brut.bounds();
    // Centrul cutiei numelui pe centrul interiorului: pe X exact, pe Y la inaltimea centroidului.
    // Ingrosat putin: liniile fine ale unui font de mana trec astfel de linia minima printabila.
    nume = brut.translate([cx - (b.min[0] + b.max[0]) / 2, cy - (b.min[1] + b.max[1]) / 2]).offset(G.ingrosareText, "Round");
    const baza = cy - (b.min[1] + b.max[1]) / 2; // unde a ajuns linia de baza (y = 0 in nume2d)
    const nb = nume.bounds();
    const wPunte = Math.min(G.punteMax, Math.max(G.punteMin, G.puntePeInaltime * h));

    // ---- capetele: atinge rama? altfel o punte orizontala din varful cel mai departat ----
    const puncte: Pt[] = (nume.toPolygons() as any[]).flatMap((r: any) => r.map((q: any) => [q[0], q[1]] as Pt));
    const atinge = (latura: -1 | 1) => {
      const jumatate = CrossSection.square([bi.max[0] - bi.min[0] + 40, bi.max[1] - bi.min[1] + 40]).translate([latura < 0 ? cx - (bi.max[0] - bi.min[0] + 40) : cx, bi.min[1] - 20]);
      return nume.intersect(ring).intersect(jumatate).area() > 0.3;
    };
    const capete: any[] = [];
    for (const latura of [-1, 1] as const) {
      if (atinge(latura)) continue;
      const extrem = puncte.reduce((m, q) => (latura < 0 ? (q[0] < m[0] ? q : m) : (q[0] > m[0] ? q : m)), puncte[0]);
      const c = coarda(interior, extrem[1], cx) ?? c0;
      const la: Pt = [latura < 0 ? c[0] - intrare : c[1] + intrare, extrem[1]];
      capete.push(bara2d([extrem[0] - latura * 0.6, extrem[1]], la, wPunte, 0.2));
      puntiCapete += 1;
    }
    if (capete.length) legaturi = legaturi.add(CrossSection.union(capete));

    // ---- literele care stau singure: bara pe linia de baza (font bloc) ----
    const legat = (cs: any) => bucatiReale(cs.add(ring).add(legaturi));
    const desprinse = (cs: any) => legat(cs).filter((c: any) => c.intersect(ring).isEmpty());
    const literaIntreaga = desprinse(nume).some((c: any) => c.area() > 0.25 * h * h);
    if (p.legatura === 'bara' || (p.legatura === 'auto' && literaIntreaga)) {
      const wBara = Math.max(G.punteMin, G.baraPeInaltime * h);
      const yb = baza - G.baraPesteBaza * h;
      const c = coarda(interior, yb, cx) ?? c0;
      legaturi = legaturi.add(bara2d([c[0] - intrare, yb], [c[1] + intrare, yb], wBara, 0));
      bara = true;
    }

    // ---- punctele si diacriticele: punti spre cea mai apropiata parte legata ----
    // Bucatile numelui fara rama: conturul unei bucati ancorate e litera, nu cercul ramei (altfel
    // distanta de la un punct de "i" ar fi masurata pana la marginea de afara a ornamentului).
    const bucati = bucatiReale(nume.add(legaturi));
    const ancorat = bucati.map((c: any) => !c.intersect(ring).isEmpty());
    if (ancorat.some((a: boolean) => !a)) {
      const plan = planificaPunti(bucati.map((c: any) => conturExterior(c)), ancorat, 0.9 * (nb.max[1] - nb.min[1]));
      if (plan.punti.length) legaturi = legaturi.add(CrossSection.union(plan.punti.map((q) => bara2d(q.de, q.la, wPunte))));
      puntiBucati = plan.punti.length;
    }
    legaturi = legaturi.intersect(contur);
    atingeStanga = atinge(-1) || !legaturi.add(nume).intersect(ring).intersect(CrossSection.square([cx - bi.min[0] + 20, bi.max[1] - bi.min[1] + 40]).translate([bi.min[0] - 20, bi.min[1] - 20])).isEmpty();
    atingeDreapta = atinge(1) || !legaturi.add(nume).intersect(ring).intersect(CrossSection.square([bi.max[0] - cx + 20, bi.max[1] - bi.min[1] + 40]).translate([cx, bi.min[1] - 20])).isEmpty();
  }
  const numeTot = nume ? nume.add(legaturi) : gol();

  // ---- decorul: elemente agatate de rama, departe de nume si unul de altul ----
  const decorCerut = p.decor === 'fara' ? 0 : Math.max(0, Math.round(p.densitate));
  const elemente: any[] = [];
  if (decorCerut) {
    const rnd = aleator(p.samanta);
    const desene = DESENE[p.decor as Exclude<Decor, 'fara'>];
    const ocolit = numeTot.offset(G.distantaDecor, 'Round').add(zonaUreche);
    let ocupat = gol();
    for (let n = 0; n < decorCerut; n++) {
      for (let incercare = 0; incercare < G.incercariDecor; incercare++) {
        const marime = p.latime * (G.decorMin + rnd() * (G.decorMax - G.decorMin));
        const desen = desene[Math.floor(rnd() * desene.length) % desene.length];
        // Centrul intr-o banda de-a lungul ramei: elementul intra sub ea cat cere config-ul.
        const banda = interior.offset(-marime * (0.5 - G.decorSubRamaMax), 'Round').subtract(interior.offset(-marime * (0.5 - G.decorSubRamaMin), 'Round'));
        if (banda.isEmpty()) continue;
        const pol: Pt[][] = (banda.toPolygons() as any[]).map((r: any) => r.map((q: any) => [q[0], q[1]] as Pt));
        const bb = banda.bounds();
        let loc: Pt | null = null;
        for (let k = 0; k < 40 && !loc; k++) {
          const x = bb.min[0] + rnd() * (bb.max[0] - bb.min[0]);
          const y = bb.min[1] + rnd() * (bb.max[1] - bb.min[1]);
          if (inPoligoane(pol, x, y)) loc = [x, y];
        }
        if (!loc) continue;
        const el = formaSvg(desen, marime, G.latimeLinieDecor).rotate(rnd() * 360).translate(loc).intersect(contur);
        const arie = el.area();
        if (arie < 1) continue;
        if (el.intersect(ocolit).area() > 0.01) continue;
        if (el.intersect(ocupat).area() > 0.01) continue;
        if (el.intersect(ring).area() < 0.5) continue;
        if (el.subtract(ring).area() < 0.35 * arie) continue;
        elemente.push(el);
        ocupat = ocupat.add(el.offset(G.distantaIntreDecor, 'Round'));
        break;
      }
    }
  }
  const decor = elemente.length ? CrossSection.union(elemente) : gol();

  // ---- piesele: rama cu numele (si decorul, cand are culoarea ei), decorul, fundalul ----
  const rama2d = contur.subtract(interior).add(numeTot).add(p.decorCaRama ? decor : gol()).subtract(gaura);
  const decor2d = p.decorCaRama ? gol() : decor.subtract(rama2d);
  // Numarate pe decorul intreg (care intra sub rama), nu pe cel decupat: bucatile lipite doar pe o muchie nu se unesc sigur.
  const bucatiRama = bucatiReale(rama2d.add(decor)).length;

  // Doua zone care se ating intr-un singur colt dau, extrudate, o muchie cu patru fete (slicerul o
  // semnaleaza ca eroare). Piesele pline se inchid (colturile se unesc), golurile se deschid (se despart).
  // Varfurile aproape suprapuse (sub G.colt) se elimina: in fisier, varfurile cu aceeasi pozitie se unesc.
  const inchide = (cs: any) => cs.offset(G.colt, 'Miter').offset(-G.colt, 'Miter').simplify(G.colt / 2);
  const deschide = (cs: any) => cs.offset(-G.colt, 'Miter').offset(G.colt, 'Miter').simplify(G.colt / 2);
  let rama3d = Manifold.extrude(inchide(rama2d), p.grosime);
  if (nume) rama3d = rama3d.add(Manifold.extrude(inchide(nume.intersect(contur)), p.grosime + G.textPeste));
  // Reuniunea celor doua extrudari poate lasa varfuri la sub G.colt unul de altul; se strang.
  rama3d = rama3d.simplify(G.colt / 2);
  const piese: PiesaGlob[] = [{ rol: 'rama', manifold: rama3d }];
  if (!decor2d.isEmpty()) piese.push({ rol: 'decor', manifold: Manifold.extrude(deschide(decor2d), p.grosime) });
  if (p.fundal) {
    const fundal2d = deschide(interior.offset(p.latimeRama / 2, 'Round').subtract(rama2d).subtract(decor2d));
    if (!fundal2d.isEmpty()) piese.push({ rol: 'fundal', manifold: Manifold.extrude(fundal2d, Math.min(G.grosimeFundal, p.grosime)) });
  }

  // ---- liniile prea subtiri ale numelui (deschidere morfologica cu linia minima) ----
  let subtire = 0;
  if (nume) {
    const deschis = nume.offset(-G.linieMin / 2, 'Round').offset(G.linieMin / 2, 'Round');
    subtire = (nume.area() - deschis.intersect(nume).area()) / Math.max(1e-9, nume.area());
  }

  return {
    piese,
    plan: { rama: rama2d, nume: numeTot, decor },
    diag: {
      inaltimeNume: h, comprimare: sx, nuIncape, atingeStanga, atingeDreapta, puntiCapete, puntiBucati, bara,
      bucati: bucatiRama, subtire, decorCerut, decorPus: elemente.length, glifeLipsa,
    },
  };
}

// ---------------------------------------------------------------- pachetul familie

export function listaNume(text: string): string[] {
  return text.split(/[,;\n]+/).map((n) => n.trim()).filter(Boolean).slice(0, GLOB_NUME.numeMax);
}

/** Asezarea in grila pe placi de latura `pat`: coltul fiecarui ornament si placa lui. */
export function grilaPachet(n: number, latime: number, adancime: number, pat: number): Array<{ x: number; y: number; placa: number }> {
  const pasX = latime + GLOB_NUME.distantaPachet;
  const pasY = adancime + GLOB_NUME.distantaPachet;
  const peRand = Math.max(1, Math.floor((pat + GLOB_NUME.distantaPachet) / pasX));
  const randuri = Math.max(1, Math.floor((pat + GLOB_NUME.distantaPachet) / pasY));
  const pePlaca = peRand * randuri;
  return Array.from({ length: n }, (_, i) => {
    const k = i % pePlaca;
    return { x: (k % peRand) * pasX, y: Math.floor(k / peRand) * pasY, placa: Math.floor(i / pePlaca) };
  });
}
