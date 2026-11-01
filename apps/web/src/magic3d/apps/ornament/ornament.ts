/**
 * ORNAMENTE DE CRACIUN — geometria (manifold, Z in sus, Y IN JOS ca la toate generatoarele Magic3D:
 * scena editorului oglindeste Y, deci un text desenat cu Y in jos se citeste corect pe placa).
 *
 * Doua feluri:
 *  - plat: forma (cerc, stea, brad, fulg, inima), numele (drept sau pe arc), anul, o pictograma,
 *    rama, in relief sau gravate; prinderea e o gaura, o ureche sau un carlig. Baza, textul si rama
 *    sunt corpuri separate, ca sa poata fi printate in culori diferite.
 *  - glob: o sfera goala (sau turtita) taiata la ecuator; fiecare jumatate se printeaza pe
 *    taietura, cu domul in sus. O calota subtire se sustine singura strat cu strat (fiecare inel
 *    sta pe cel de dedesubt); doar polul se inchide la sfarsit, ca o punte scurta. Un tavan la 45°
 *    in interiorul unei sfere nu se poate face fara a ingrosa enorm peretele, deci nu se incearca:
 *    printabilitatea se verifica pe straturi (arieNesustinuta). Jumatatile se imbina cu un inel
 *    (locas pe fiecare jumatate, cu racord la 45°) sau cu stifturi din filament; numele e
 *    proiectat pe emisfera de sus, anul pe cea de jos.
 *
 * Toate cotele vin din config.ts. Fisierul intoarce geometrie si diagnostice; textele de
 * avertizare le alege constructorul.
 */

import { capHeightUnitati, configureManifold as configTextSolid, textSolid } from '../../core/geometry/textSolid.js';
import { arieRing, centroid, type Pt, type Ring } from '../../core/geometry/forme2d.js';
import { formaDecor, type FormaDecor } from '../../core/geometry/formeDecor.js';
import { ORNAMENT } from './config.js';

let MOD: any = null;
export function configureManifold(mod: any): void { MOD = mod; configTextSolid(mod); }

export type TipOrnament = 'plat' | 'glob';
export type ModText = 'relief' | 'gravat';
export type Prindere = 'gaura' | 'ureche' | 'carlig';
export type Imbinare = 'inel' | 'stifturi';
export type Pictograma = FormaDecor | 'fara';

export interface ParamOrnament {
  tip: TipOrnament;
  forma: FormaDecor;
  diametru: number;
  grosime: number;
  font: any;
  text: string;
  text2: string;
  inaltimeText: number;
  /** Arcul pe care sta numele, in grade (0 = drept). */
  curbare: number;
  mod: ModText;
  relief: number;
  rama: number;
  pictograma: Pictograma;
  prindere: Prindere;
  diametruGaura: number;
  perete: number;
  turtire: number;
  imbinare: Imbinare;
}

export type RolPiesa = 'baza' | 'text' | 'rama' | 'sus' | 'jos' | 'textSus' | 'textJos' | 'inel';
export interface PiesaOrnament { rol: RolPiesa; manifold: any }

export interface DiagnosticOrnament {
  /** Inaltimea finala a numelui (dupa incadrare), mm. */
  inaltimeNume: number;
  /** Continutul a fost micsorat ca sa incapa; nu a incaput nici la cea mai mica marime. */
  micsorat: boolean;
  nuIncape: boolean;
  /** Globul: peretele folosit (poate fi ridicat la minim) si aria in consola pe jumatati. */
  perete: number;
  consola: number;
  /** Caracterele fara glifa in font. */
  glifeLipsa: string[];
}

export interface RezultatOrnament { piese: PiesaOrnament[]; diag: DiagnosticOrnament }

// ---------------------------------------------------------------- ajutoare 2D

/** Inelele unei forme decorative (Y in sus, [-1, 1]) la raza ceruta, cu Y in jos. */
function inele(forma: FormaDecor, raza: number, cx = 0, cy = 0): Ring[] {
  return formaDecor(forma).map((r) => r.map(([x, y]) => [cx + x * raza, cy - y * raza] as Pt).reverse());
}

const sectiune = (r: Ring[]) => new MOD.CrossSection(r, 'NonZero');

/**
 * Unde se agata: pe axa de mijloc a formei (X-ul cutiei), marginea de sus a conturului pe acea
 * verticala. La o inima e scobitura dintre lobi, nu varful unui lob: acolo urechea se leaga de forma.
 */
function varf(cs: any): Pt {
  const b = cs.bounds();
  const x = (b.min[0] + b.max[0]) / 2;
  const fasie = cs.intersect(MOD.CrossSection.square([0.4, b.max[1] - b.min[1] + 2]).translate([x - 0.2, b.min[1] - 1]));
  return [x, fasie.isEmpty() ? b.min[1] : fasie.bounds().min[1]];
}

/** Partea din `a` care iese din `b`, ca arie. */
const iese = (a: any, b: any) => a.subtract(b).area();

// ---------------------------------------------------------------- textul

/** Solidul unui text, cu linia de baza centrata pe (0, 0) pe orizontala (Y in jos, deasupra liniei = Y negativ). */
function textCentrat(font: any, text: string, h: number, grosime: number, glifeLipsa: string[]): any | null {
  if (!text.trim()) return null;
  const rep: any = {};
  const s = textSolid(font, text, h, grosime, rep);
  for (const g of rep.glifeLipsa ?? []) glifeLipsa.push(...(g.caractere ?? []));
  const b = s.boundingBox();
  return s.translate([-(b.min[0] + b.max[0]) / 2, 0, 0]);
}

/** Numele pe un arc (convex in sus) de `unghi` grade, cu centrul liniei de baza in (0, 0). */
function textPeArc(font: any, text: string, h: number, grosime: number, unghi: number, glifeLipsa: string[]): any | null {
  if (!text.trim()) return null;
  const capHeight = capHeightUnitati(font);
  const px = (h * font.unitsPerEm) / capHeight;
  const total = font.getAdvanceWidth(text, px);
  const razaArc = total / ((unghi * Math.PI) / 180);
  const litere: any[] = [];
  let pana = 0;
  for (const ch of [...text]) {
    const avans = font.getAdvanceWidth(ch, px);
    if (ch.trim()) {
      const g = textCentrat(font, ch, h, grosime, glifeLipsa);
      if (g) {
        const theta = (pana + avans / 2 - total / 2) / razaArc;
        // Litera se roteste cu tangenta arcului; arcul are centrul la (0, razaArc), deci varful lui e in (0, 0).
        litere.push(g.rotate([0, 0, (theta * 180) / Math.PI]).translate([razaArc * Math.sin(theta), razaArc - razaArc * Math.cos(theta), 0]));
      }
    }
    pana += avans;
  }
  return litere.length ? MOD.Manifold.union(litere) : null;
}

// ---------------------------------------------------------------- ornamentul plat

function ornamentPlat(p: ParamOrnament): RezultatOrnament {
  const { Manifold, CrossSection } = MOD;
  const raza = p.diametru / 2;
  const glifeLipsa: string[] = [];
  let contur = sectiune(inele(p.forma, raza));
  // Fulgul are doar brate subtiri: numele sta pe un medalion rotund din mijloc.
  if (p.forma === 'fulg') contur = contur.add(CrossSection.circle(raza * ORNAMENT.medalionFulg, 96));
  const sus = varf(contur);

  // ---- prinderea ----
  const rGaura = p.diametruGaura / 2;
  const rExt = rGaura + ORNAMENT.peretePrindere;
  let gaura: any = null;
  let zonaPrindere: any = null;
  if (p.prindere === 'gaura') {
    // Coboara de la varf pana cand gaura, cu peretele ei, incape intreaga in forma.
    let y = sus[1] + rExt;
    while (y < sus[1] + raza && iese(CrossSection.circle(rExt, 48).translate([sus[0], y]), contur) > 0.05) y += 0.5;
    gaura = CrossSection.circle(rGaura, 48).translate([sus[0], y]);
    zonaPrindere = CrossSection.circle(rExt + ORNAMENT.margineContinut, 48).translate([sus[0], y]);
  } else {
    // Urechea (sau carligul) sta deasupra varfului, legata de forma printr-un gat.
    const c: Pt = [sus[0], sus[1] - rGaura];
    const gat = CrossSection.square([rExt * 1.3, rExt + ORNAMENT.peretePrindere * 2]).translate([c[0] - rExt * 0.65, c[1]]);
    contur = contur.add(CrossSection.circle(rExt, 48).translate(c)).add(gat);
    gaura = CrossSection.circle(rGaura, 48).translate(c);
    if (p.prindere === 'carlig') {
      // Deschiderea carligului, spre dreapta-sus: pe acolo intra ata sau creanga.
      const d = p.diametruGaura * ORNAMENT.deschidereCarlig;
      gaura = gaura.add(CrossSection.square([rExt * 2, d]).translate([0, -d / 2]).rotate(-45).translate(c));
    }
    zonaPrindere = CrossSection.circle(rExt, 48).translate(c);
  }

  // ---- continutul: pictograma, numele, anul, stivuite si centrate ----
  const interior = contur.offset(-(p.rama + ORNAMENT.margineContinut), 'Round').subtract(zonaPrindere);
  const relief = p.relief;
  const construiesteContinut = (h: number) => {
    const elemente: any[] = [];
    const nume = p.curbare > 0 ? textPeArc(p.font, p.text, h, relief, p.curbare, glifeLipsa) : textCentrat(p.font, p.text, h, relief, glifeLipsa);
    const an = textCentrat(p.font, p.text2, h * ORNAMENT.randDoi, relief, glifeLipsa);
    const marimePict = (p.diametru * ORNAMENT.pictograma * h) / p.inaltimeText;
    const pict = p.pictograma !== 'fara' ? Manifold.extrude(sectiune(inele(p.pictograma, marimePict / 2)), relief) : null;
    let y = 0;
    const gol = h * 0.35;
    for (const e of [pict, nume, an]) {
      if (!e) continue;
      const b = e.boundingBox();
      elemente.push(e.translate([0, y - b.min[1], 0]));
      y += b.max[1] - b.min[1] + gol;
    }
    if (!elemente.length) return null;
    const tot = Manifold.union(elemente);
    const b = tot.boundingBox();
    return tot.translate([-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2, 0]);
  };
  // Locul continutului: intai centroidul interiorului, apoi alte inaltimi pe axa lui (la brad, partea
  // lata de jos); cel mai apropiat de centroid unde incape. Daca nu incape nicaieri, se micsoreaza.
  const [cx, cy] = centroid(interior);
  const bi = interior.bounds();
  const candidati = [cy];
  for (let d = 1.5; cy - d > bi.min[1] || cy + d < bi.max[1]; d += 1.5) candidati.push(cy + d, cy - d);
  const aseaza = (c: any) => {
    if (!c) return { corp: null, incape: true };
    const umbra = c.project();
    for (const y of candidati) if (iese(umbra.translate([cx, y]), interior) <= 0.01) return { corp: c.translate([cx, y, 0]), incape: true };
    return { corp: c.translate([cx, cy, 0]), incape: false };
  };
  let h = p.inaltimeText;
  let asezat = aseaza(construiesteContinut(h));
  let micsorat = false;
  for (let i = 0; !asezat.incape && i < ORNAMENT.incercariIncadrare; i += 1) {
    h *= ORNAMENT.factorIncadrare;
    micsorat = true;
    asezat = aseaza(construiesteContinut(h));
  }
  const continut = asezat.corp;
  const nuIncape = !asezat.incape;

  // ---- corpurile ----
  let baza = Manifold.extrude(contur.subtract(gaura), p.grosime);
  const piese: PiesaOrnament[] = [];
  if (continut) {
    if (p.mod === 'relief') {
      piese.push({ rol: 'text', manifold: continut.translate([0, 0, p.grosime]) });
    } else {
      // Gravat: locasul in fata bazei si, in el, corpul de umplere (la nivel), in culoarea textului.
      const adanc = Math.min(relief, p.grosime - 0.8);
      const umplere = Manifold.extrude(continut.project(), adanc).translate([0, 0, p.grosime - adanc]);
      baza = baza.subtract(umplere);
      piese.push({ rol: 'text', manifold: umplere });
    }
  }
  if (p.rama > 0) {
    const inel = contur.subtract(contur.offset(-p.rama, 'Round')).subtract(gaura.offset(ORNAMENT.peretePrindere * 0.5, 'Round'));
    piese.push({ rol: 'rama', manifold: Manifold.extrude(inel, relief).translate([0, 0, p.grosime]) });
  }
  piese.unshift({ rol: 'baza', manifold: baza });
  return { piese, diag: { inaltimeNume: +h.toFixed(2), micsorat, nuIncape, perete: 0, consola: 0, glifeLipsa } };
}

// ---------------------------------------------------------------- globul 3D

/** Sectiunea fara gauri: doar conturele exterioare. */
function plina(cs: any): any {
  const exterioare = (cs.toPolygons() as Ring[]).filter((r) => arieRing(r) > 0);
  return new MOD.CrossSection(exterioare, 'NonZero');
}

/**
 * Aria care s-ar printa in gol, strat cu strat: ce iese dintr-un strat peste cel de dedesubt, marit
 * cu cat poate iesi un strat in consola (pasul ori tangenta unghiului maxim). O bucata inchisa de
 * stratul de dedesubt din toate partile (polul unei calote) se face ca punte, cat timp nu e mai lata
 * decat puntea maxima; restul se aduna.
 */
export function arieNesustinuta(m: any): number {
  const b = m.boundingBox();
  const pas = ORNAMENT.pasConsola;
  const iesire = pas * Math.tan((ORNAMENT.consolaMax * Math.PI) / 180);
  let arie = 0;
  let jos = m.slice(b.min[2] + pas / 2);
  for (let z = b.min[2] + 1.5 * pas; z < b.max[2]; z += pas) {
    const sus = m.slice(z);
    const gol = sus.subtract(jos.offset(iesire, 'Round'));
    if (!gol.isEmpty()) {
      const acoperit = plina(jos);
      for (const bucata of gol.decompose()) {
        const punte = iese(bucata, acoperit) < 0.01 && bucata.offset(-ORNAMENT.punteMax / 2, 'Round').isEmpty();
        if (!punte) arie += bucata.area();
      }
    }
    jos = sus;
  }
  return arie;
}

function glob(p: ParamOrnament): RezultatOrnament {
  const { Manifold, CrossSection } = MOD;
  const seg = ORNAMENT.segmente;
  const R = p.diametru / 2;
  const f = Math.max(ORNAMENT.turtireMin, Math.min(1, p.turtire));
  const w = Math.max(ORNAMENT.pereteMinGlob, p.perete);
  const glifeLipsa: string[] = [];
  const ri = R - w;
  const zi = f * R - w;
  const exterior = Manifold.sphere(R, seg).scale([1, 1, f]);
  const gol = Manifold.sphere(1, seg).scale([ri, ri, zi]);
  let coaja = exterior.subtract(gol);

  // ---- textul, proiectat pe fata dinspre +Y (oglinda din scena il intoarce cu fata spre privitor) ----
  const latimeMax = p.diametru * ORNAMENT.latimeTextGlob;
  const raza = (lat: number) => R * Math.cos((lat * Math.PI) / 180);
  const fascicul = (text: string, h0: number, lat: number) => {
    const t0 = textCentrat(p.font, text, h0, 1, glifeLipsa);
    if (!t0) return null;
    const b0 = t0.boundingBox();
    // Cat permite cercul de latitudine: textul nu trece de ~0.78 din coarda lui.
    const factor = Math.min(1, (latimeMax * raza(lat)) / R / Math.max(1e-6, b0.max[0] - b0.min[0]));
    let sec = t0.project();
    if (factor < 1) sec = sec.scale(factor);
    const bs = sec.bounds();
    sec = sec.translate([0, -(bs.min[1] + bs.max[1]) / 2]);
    const zc = f * R * Math.sin((lat * Math.PI) / 180);
    // Extrudat pe Z, apoi culcat: Y-ul textului (in jos) devine -Z, iar extrudarea merge spre +Y.
    return { corp: Manifold.extrude(sec, 2 * R).rotate([-90, 0, 0]).translate([0, 0, zc]), h: h0 * factor };
  };
  const nume = fascicul(p.text, p.inaltimeText, ORNAMENT.latitudineNume);
  const an = fascicul(p.text2, p.inaltimeText * ORNAMENT.randDoi, ORNAMENT.latitudineAn);
  const pieleExt = exterior.scale([1 + p.relief / R, 1 + p.relief / R, 1 + p.relief / R]).subtract(exterior);
  const pieleInt = exterior.subtract(exterior.scale([1 - p.relief / R, 1 - p.relief / R, 1 - p.relief / R]));
  const textPe = (fasc: { corp: any } | null) => {
    if (!fasc) return null;
    if (p.mod === 'relief') return fasc.corp.intersect(pieleExt);
    const loc = fasc.corp.intersect(pieleInt);
    coaja = coaja.subtract(loc);
    return loc;
  };
  const textNume = textPe(nume);
  const textAn = textPe(an);

  // ---- taietura si imbinarea ----
  let sus = coaja.trimByPlane([0, 0, 1], 0);
  let jos = coaja.trimByPlane([0, 0, -1], 0);
  const piese: PiesaOrnament[] = [];
  if (p.imbinare === 'inel') {
    const rInt = ri - 0.5;
    const rExt = ri + w * ORNAMENT.fractieInel;
    const h = ORNAMENT.locasInel;
    // Locasul: inel drept de inaltime h, apoi racord la 45° spre interior (fara tavan orizontal).
    const drept = Manifold.cylinder(h, rExt, rExt, seg).subtract(Manifold.cylinder(h + 1, rInt, rInt, seg).translate([0, 0, -0.5]));
    const hc = rExt - rInt;
    const racord = Manifold.cylinder(hc, rExt, rInt, seg).subtract(Manifold.cylinder(hc + 1, rInt, rInt, seg).translate([0, 0, -0.5])).translate([0, 0, h]);
    const locas = Manifold.union([drept, racord]).translate([0, 0, -0.01]);
    sus = sus.subtract(locas);
    jos = jos.subtract(locas.mirror([0, 0, 1]));
    const tol = ORNAMENT.tolerantaInel;
    const inel = Manifold.cylinder(2 * h - 2 * tol, rExt - tol, rExt - tol, seg).subtract(Manifold.cylinder(2 * h + 1, rInt + 0.1, rInt + 0.1, seg).translate([0, 0, -0.5]));
    piese.push({ rol: 'inel', manifold: inel });
  } else {
    // Bosaje lipite de perete, cu gauri pentru bucati de filament de 1,75 mm.
    const rb = ORNAMENT.razaBosaj;
    const hb = ORNAMENT.adancimeStift + 2;
    const rg = (ORNAMENT.diametruStift + ORNAMENT.tolerantaStift) / 2;
    for (let k = 0; k < ORNAMENT.stifturi; k += 1) {
      const a = Math.PI / 2 + (2 * Math.PI * k) / ORNAMENT.stifturi;
      const x = (ri - rb * 0.4) * Math.cos(a), y = (ri - rb * 0.4) * Math.sin(a);
      const bosaj = Manifold.cylinder(hb, rb, rb, 32).translate([x, y, 0]).intersect(exterior);
      const gauraS = Manifold.cylinder(ORNAMENT.adancimeStift + 0.01, rg, rg, 24).translate([x, y, -0.01]);
      sus = sus.add(bosaj).subtract(gauraS);
      jos = jos.add(bosaj.mirror([0, 0, 1])).subtract(gauraS.mirror([0, 0, 1]));
    }
  }

  // ---- urechea de sus: placa verticala cu gaura in picatura (fara consola) ----
  const L = ORNAMENT.urecheLatime, H = ORNAMENT.urecheInaltime, g = ORNAMENT.urecheGrosime, d = ORNAMENT.urecheGaura;
  const placa2 = CrossSection.square([L, H + 2]).translate([-L / 2, 0]).offset(-1.5, 'Round').offset(1.5, 'Round');
  const yGaura = H + 2 - L / 2;
  const picatura = CrossSection.circle(d / 2, 32).add(CrossSection.square([d / Math.SQRT2, d / Math.SQRT2], true).rotate(45).translate([0, d / Math.SQRT2 / 2])).translate([0, yGaura]);
  const ureche = Manifold.extrude(placa2.subtract(picatura), g).rotate([90, 0, 0]).translate([0, g / 2, f * R - 2]);
  sus = sus.add(ureche);

  // ---- pozitia de print: fiecare jumatate pe taietura ----
  const intoarsa = (m: any) => m.rotate([180, 0, 0]);
  const josPrint = intoarsa(jos);
  piese.unshift({ rol: 'sus', manifold: sus }, { rol: 'jos', manifold: josPrint });
  if (textNume) piese.push({ rol: textNume.boundingBox().min[2] >= 0 ? 'textSus' : 'textJos', manifold: textNume });
  if (textAn) piese.push({ rol: 'textJos', manifold: intoarsa(textAn) });
  const consola = Math.max(arieNesustinuta(sus), arieNesustinuta(josPrint));
  return {
    piese,
    diag: { inaltimeNume: +(nume?.h ?? 0).toFixed(2), micsorat: false, nuIncape: false, perete: w, consola: +consola.toFixed(1), glifeLipsa },
  };
}

export function buildOrnament(p: ParamOrnament): RezultatOrnament {
  if (!MOD) throw new Error('ornament: manifold neconfigurat');
  return p.tip === 'glob' ? glob(p) : ornamentPlat(p);
}

/** Pachetul familie: aceeasi configuratie, cate un ornament plat pe nume. */
export function listaNume(text: string): string[] {
  return text.split(/[,;\n]+/).map((n) => n.trim()).filter(Boolean).slice(0, ORNAMENT.numeMax);
}

/** Pozitiile (centre, mm) pe o grila care umple placa; peste ea, placa urmatoare. */
export function grilaPachet(n: number, latime: number, adancime: number): Array<{ x: number; y: number; placa: number }> {
  const pasX = latime + ORNAMENT.distantaPachet;
  const pasY = adancime + ORNAMENT.distantaPachet;
  const peRand = Math.max(1, Math.floor((ORNAMENT.placa + ORNAMENT.distantaPachet) / pasX));
  const randuri = Math.max(1, Math.floor((ORNAMENT.placa + ORNAMENT.distantaPachet) / pasY));
  const pePlaca = peRand * randuri;
  return Array.from({ length: n }, (_, i) => {
    const k = i % pePlaca;
    return { x: (k % peRand) * pasX, y: Math.floor(k / peRand) * pasY, placa: Math.floor(i / pePlaca) };
  });
}
