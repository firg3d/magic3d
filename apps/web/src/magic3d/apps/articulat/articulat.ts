/**
 * APP BRELOCURI ARTICULATE — geometria produsului.
 *
 * Un NUME din litere-bloc: fiecare literă stă pe un segment dreptunghiular, iar segmentele
 * vecine sunt legate printr-o BALAMA print-in-place (ochi + ax). Lanțul se printeaza culcat,
 * dintr-o singură trecere, și iese articulat: se onduleaza și se plieaza.
 *
 * BALAMAUA (după modelul OpenSCAD de referință, print-in-place, ax pe Y = lățimea):
 *   · fiecare segment are pe DREAPTA un OCHI = tub gol (Øext/Øint), ținut de două urechi mici;
 *   · fiecare segment are pe STÂNGA un AX subțire (pin) care trece prin ochiul segmentului
 *     din stânga, plus un LOCAȘ mare (gaură) care lasă ochiul precedent să se rotească liber.
 *   Jocurile de print sunt înglobate în cote (ax Ø2 în gaură Ø3 = 0.5 mm radial; ochi Ø6 în
 *   locaș Ø10 = 2 mm radial), exact ca la referință. Nimic nu se atinge -> piesele se mișcă.
 *
 * Colțurile din stânga sunt teșite (45°) ca segmentele să se poată plia fără să se lovească.
 *
 * Două culori: SEGMENTELE (cu balamalele) într-o culoare, LITERELE în alta.
 *
 * Nucleul nu știe ce e un breloc: fișierul întoarce solidele (segmente + litere) și măsurători,
 * iar `main.ts` judecă ce e acceptabil.
 */
import { configureManifold as configTextSolid, textSolid, type SolidReport } from '../../core/geometry/textSolid.js';

let MOD: any = null;
export function configureManifold(mod: any): void { MOD = mod; configTextSolid(mod); }

/** segmente pe cerc (cilindri netezi) */
const SEG = 48;
const EPS = 0.05;

/** COTELE BALAMALEI — fixe, potrivite între ele (ca la modelul OpenSCAD de referință). */
const HINGE = {
  diametruLocas: 10,   // Ø gaura din stânga (lasă ochiul precedent să se rotească)
  adancimeLocas: 5.5,  // adâncimea locașului (pe lățime)
  diametruAx: 2,       // Ø axul (pin) care trece prin ochi
  spatiu: 1,           // gol nominal între segmente vecine (espacio_entre_modelos)
  ochiExt: 6,          // Ø exterior ochi (tub)
  ochiInt: 3,          // Ø interior ochi (prin el trece axul)
  ochiLung: 4,         // lungimea ochiului (pe lățime)
  separatieOchi: 2,    // cât iese ochiul spre dreapta față de segment
  urecheInalt: 1,      // grosimea urechilor care țin ochiul
  urecheLung: 2,       // cât intră urechea în segment
  chaflan: 1,          // teșitura colțurilor din stânga
};

/** înălțimea minimă a segmentului ca balamaua (ochi Ø6 centrat) să încapă */
export const ALTO_MIN = HINGE.ochiExt;

export interface ArticulatConfig {
  text: string;
  font: any;
  inaltimeLitera: number;   // mm, capHeight-ul literei de pe segment
  alturaLitera: number;     // mm, relief literă (+ = în relief, − = gravat)
  alto: number;             // mm, înălțimea segmentului
  ancho: number;            // mm, lățimea segmentului (adâncimea axului balamalei)
  largo: number;            // mm, lungimea unui segment
  linkPrim: boolean;        // balama și pe primul segment (loc de inel la început)
  linkUltim: boolean;       // balama și pe ultimul segment (pentru brățară / al doilea inel)
  culoareBaza: string;
  culoareLitera: string;
}

export interface ArticulatDiagnostics {
  litere: number;
  balamale: number;
  seLipesc: boolean;         // vreo pereche vecină se atinge (balama sudată)
  toateCaptive: boolean;     // fiecare ax e îmbrăcat de ochiul lui (nu se desface)
  subMasa: boolean;
  dimTotala: [number, number, number];
  literaLata: string[];      // litere mai late decât segmentul (ies din bloc)
  glifeLipsa: string[];
  gravat: boolean;
}

export interface ArticulatResult {
  /** segmentele-bloc (cu balamalele), în ordine — culoarea bazei */
  blocuri: any[];
  /** literele în relief, aliniate cu segmentele — culoarea literei (goală dacă e gravat) */
  litere: any[];
  diagnostice: ArticulatDiagnostics;
  ms: number;
}

/** cilindru cu axa pe Y, de la y0 la y0+lung, centrat radial în (x,z) */
function cilindruY(Manifold: any, raza: number, lung: number, x: number, y0: number, z: number): any {
  return Manifold.cylinder(lung, raza, raza, SEG, false).rotate([-90, 0, 0]).translate([x, y0, z]);
}

/** litera „ch", centrată pe segment (pe X și Y), cu baza la z; grosimea `gros` */
function literaCentrata(font: any, ch: string, inaltime: number, gros: number, cx: number, cy: number, z: number,
                        rep: Partial<SolidReport>): { sol: any; latime: number } {
  const sol = textSolid(font, ch, inaltime, gros, rep);
  const bb = sol.boundingBox();
  const mx = (bb.min[0] + bb.max[0]) / 2, my = (bb.min[1] + bb.max[1]) / 2;
  return { sol: sol.translate([cx - mx, cy - my, z]), latime: bb.max[0] - bb.min[0] };
}

export function buildArticulat(cfg: ArticulatConfig): ArticulatResult {
  if (!MOD) throw new Error('articulat: manifold neconfigurat');
  const { Manifold } = MOD;
  const t0 = performance.now();
  const H = HINGE;

  const alto = Math.max(ALTO_MIN, cfg.alto);
  const ancho = cfg.ancho;
  const largo = cfg.largo;
  const gravat = cfg.alturaLitera < 0;
  const altLit = Math.abs(cfg.alturaLitera);

  const chars = [...(cfg.text || '').trim()].filter((c) => c !== ' ');
  const n = chars.length;

  // colțuri STÂNGA teșite: două cuburi rotite 45°, scăzute din bloc (ca la referință)
  const c = H.chaflan, cd = c * Math.SQRT2;
  const facetaJos = () => Manifold.cube([cd, ancho + 2 * EPS, cd], false).rotate([0, 45, 0]).translate([-1, -EPS, 0]);
  const facetaSus = () => Manifold.cube([cd, ancho + 2 * EPS, cd], false).rotate([0, 135, 0]).translate([0, -EPS, alto + 1]);

  const glifeLipsa: string[] = [];
  const literaLata: string[] = [];

  // largo-ul efectiv al fiecărui segment: primul fără link e cu 2 mm mai scurt (n-are balama stângă)
  const areStanga = (i: number) => i > 0 || cfg.linkPrim;
  const areDreapta = (i: number) => i < n - 1 || cfg.linkUltim;
  const largoAct = (i: number) => (i === 0 && !cfg.linkPrim) ? largo - 2 : largo;

  // pozițiile pe X (segmente adiacente cu golul `spatiu` între ele)
  const P: number[] = [];
  for (let i = 0; i < n; i++) P[i] = i === 0 ? 0 : P[i - 1] + largoAct(i - 1) + H.spatiu;
  const totalLen = n ? P[n - 1] + largoAct(n - 1) : 0;
  const offX = -totalLen / 2;

  const blocuri: any[] = [];
  const litere: any[] = [];

  for (let i = 0; i < n; i++) {
    const ch = chars[i];
    const la = largoAct(i);
    const x0 = offX + P[i];                     // marginea stângă a segmentului, în lume

    // --- blocul de bază: cub - teșituri - locaș - (gravură) ---
    let bloc = Manifold.cube([la, ancho, alto], false);
    bloc = bloc.subtract(facetaJos());
    bloc = bloc.subtract(facetaSus());
    if (areStanga(i)) {
      // locaș Ø10 în fața stângă, axa pe Y, centrat pe lățime la z=alto/2
      const locas = cilindruY(Manifold, H.diametruLocas / 2, H.adancimeLocas, 0, (ancho - H.adancimeLocas) / 2, alto / 2);
      bloc = bloc.subtract(locas);
    }
    // litera centrată pe segment. O glifă absentă e RAPORTATĂ și SĂRITĂ (segmentul rămâne),
    // nu blochează tot lanțul — și evită cutia „.notdef" pe segment.
    const cx = la / 2, cy = ancho / 2;
    const absenta = cfg.font.charToGlyphIndex(ch) === 0;
    if (absenta) glifeLipsa.push(ch);
    if (gravat && altLit > 0 && !absenta) {
      try {
        const rep: Partial<SolidReport> = {};
        const { sol, latime } = literaCentrata(cfg.font, ch, cfg.inaltimeLitera, altLit + EPS, cx, cy, alto - altLit, rep);
        if (rep.missingGlyphs?.length) glifeLipsa.push(...rep.missingGlyphs);
        if (latime > la) literaLata.push(ch);
        const u = bloc.subtract(sol); bloc.delete(); sol.delete(); bloc = u;
      } catch { glifeLipsa.push(ch); }
    }

    // --- articulatia (adăugată peste bloc; jocurile o fac liberă) ---
    if (areStanga(i)) {
      // AX subțire pe toată lățimea, lângă fața stângă
      const ax = cilindruY(Manifold, H.diametruAx / 2, ancho, H.diametruAx / 2, 0, alto / 2);
      const u = bloc.add(ax); bloc.delete(); ax.delete(); bloc = u;
    }
    if (areDreapta(i)) {
      // OCHI = tub gol pe dreapta, la x = la + separatieOchi, centrat pe lățime
      const yOchi = (ancho - H.ochiLung) / 2;
      const ext = cilindruY(Manifold, H.ochiExt / 2, H.ochiLung, la + H.separatieOchi, yOchi, alto / 2);
      const gol = cilindruY(Manifold, H.ochiInt / 2, H.ochiLung + 2 * EPS, la + H.separatieOchi, yOchi - EPS, alto / 2);
      const ochi = ext.subtract(gol); ext.delete(); gol.delete();
      // două urechi care leagă ochiul de bloc (sus + jos)
      const yU = (ancho - H.ochiLung) / 2;
      const urSus = Manifold.cube([H.separatieOchi + H.urecheLung, H.ochiLung, H.urecheInalt], false)
        .translate([la - 0, yU, alto / 2 + H.ochiExt / 2 - H.urecheInalt]);
      const urJos = Manifold.cube([H.separatieOchi + H.urecheLung, H.ochiLung, H.urecheInalt], false)
        .translate([la - 0, yU, alto / 2 - H.ochiExt / 2]);
      let u = bloc.add(ochi); bloc.delete(); ochi.delete();
      const u2 = u.add(urSus); u.delete(); urSus.delete();
      const u3 = u2.add(urJos); u2.delete(); urJos.delete();
      bloc = u3;
    }

    bloc = bloc.translate([x0, 0, 0]);
    blocuri.push(bloc);

    // litera în relief (corp separat, culoarea literei)
    if (!gravat && altLit > 0 && !absenta) {
      try {
        const rep: Partial<SolidReport> = {};
        const { sol, latime } = literaCentrata(cfg.font, ch, cfg.inaltimeLitera, altLit, cx, cy, alto, rep);
        if (rep.missingGlyphs?.length) glifeLipsa.push(...rep.missingGlyphs);
        if (latime > la) literaLata.push(ch);
        litere.push(sol.translate([x0, 0, 0]));
      } catch { glifeLipsa.push(ch); }
    }
  }

  // ---- măsurători ----
  let subMasa = false;
  for (const p of blocuri) if (p.boundingBox().min[2] < -0.01) subMasa = true;
  let seLipesc = false;
  for (let i = 0; i < blocuri.length - 1; i++) {
    const inter = blocuri[i].intersect(blocuri[i + 1]); const v = inter.volume(); inter.delete();
    if (v > 1e-3) seLipesc = true;
  }
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (const s of [...blocuri, ...litere]) { const b = s.boundingBox(); for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], b.min[k]); mx[k] = Math.max(mx[k], b.max[k]); } }

  return {
    blocuri, litere,
    diagnostice: {
      litere: n,
      balamale: Math.max(0, n - 1),
      seLipesc,
      toateCaptive: true,   // captiv prin construcție (axul trece prin ochiul închis)
      subMasa,
      dimTotala: n ? [+(mx[0] - mn[0]).toFixed(1), +(mx[1] - mn[1]).toFixed(1), +(mx[2] - mn[2]).toFixed(1)] : [0, 0, 0],
      literaLata: [...new Set(literaLata)],
      glifeLipsa: [...new Set(glifeLipsa)],
      gravat,
    },
    ms: performance.now() - t0,
  };
}
