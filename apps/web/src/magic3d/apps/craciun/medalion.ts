/**
 * MEDALION CU BANDA — geometria (manifold, Z in sus, Y IN JOS ca la toate generatoarele Magic3D).
 *
 * Un disc rotund sau oval cu rama si urechea de agatat; peste mijloc o banda (orizontala sau
 * inclinata) care trece peste rama si, optional, iese din ea cu doua capete pliate si crestate;
 * numele pe banda; decorul (fulgi, brazi, oameni de zapada) asezat simetric in zona de sus, in
 * picioare pe banda, si in zona de jos, in picioare pe rama. Fundalul e plin sau decupat; decupat,
 * banda si decorul tin ornamentul intr-o bucata (fiecare element sta pe banda sau pe rama).
 *
 * Banda se lucreaza intr-un cadru propriu (rotit cu inclinarea), unde e orizontala, cu centrul in
 * centrul discului; apoi se roteste inapoi. Corpul e in culoarea discului, de la placa in sus (fara
 * suporturi); banda, numele si decorul sunt placi colorate subtiri peste el (MEDALION.grosimeCuloare),
 * ca filamentul sa se schimbe doar in straturile de sus.
 *
 * Toate cotele vin din config.ts (MEDALION). Fisierul intoarce geometria si diagnosticele; textele
 * de avertizare le alege constructorul.
 */

import type { Pt } from '../../core/geometry/forme2d.js';
import { MEDALION } from './config.js';
import { bucatiReale, coarda, configureComun, formaSvg, gol, nume2d, varf } from './comun2d.js';

let MOD: any = null;
export function configureManifold(mod: any): void { MOD = mod; configureComun(mod); }

export type FormaMedalion = 'cerc' | 'oval';
export type FundalMedalion = 'plin' | 'decupat';
export type DecorMedalion = 'fulgi' | 'brazi' | 'oameni' | 'amestec' | 'fara';

export interface ParamMedalion {
  forma: FormaMedalion;
  latime: number;
  latimeRama: number;
  grosimeRama: number;
  fundal: FundalMedalion;
  latimeBanda: number;
  /** Grade; pozitiv = banda urca spre dreapta. */
  inclinare: number;
  capete: boolean;
  font: any;
  text: string;
  decor: DecorMedalion;
  /** Elemente pe fiecare zona (sus, jos). */
  densitate: number;
}

export interface DiagnosticMedalion {
  /** Inaltimea numelui (parametrul fontului, mm) si comprimarea pe latime (1 = deloc). */
  inaltimeNume: number;
  comprimare: number;
  /** Numele nu incape pe banda nici comprimat la maxim, la inaltimea minima. */
  nuIncape: boolean;
  /** Partea din nume mai subtire decat linia minima. */
  subtire: number;
  decorCerut: number;
  decorPus: number;
  /** Bucatile ornamentului (fara aschii): 1 = o singura piesa. */
  bucati: number;
  glifeLipsa: string[];
}

export type RolMedalion = 'disc' | 'banda' | 'text' | 'decor';
export interface PiesaMedalion { rol: RolMedalion; manifold: any }

export interface RezultatMedalion {
  piese: PiesaMedalion[];
  diag: DiagnosticMedalion;
  /** Straturile 2D (pentru teste): conturul, interiorul ramei, rama cu urechea, banda, numele, decorul. */
  plan: { contur: any; interior: any; rama: any; banda: any; text: any; decor: any };
}

/** Desenele fiecarui decor, de la mijloc spre margini (asezarea e simetrica). */
const DESENE: Record<Exclude<DecorMedalion, 'fara'>, string[]> = {
  fulgi: ['fulg', 'fulg-simplu'],
  brazi: ['brad'],
  oameni: ['om-zapada'],
  amestec: ['om-zapada', 'brad', 'fulg'],
};

/** Coarda verticala a sectiunii la x: [sus, jos] (Y in jos), sau null. */
function coardaV(cs: any, x: number): [number, number] | null {
  const b = cs.bounds();
  const fasie = cs.intersect(MOD.CrossSection.square([0.2, b.max[1] - b.min[1] + 2]).translate([x - 0.1, b.min[1] - 1]));
  if (fasie.isEmpty()) return null;
  const q = fasie.bounds();
  return [q.min[1], q.max[1]];
}

export function buildMedalion(p: ParamMedalion): RezultatMedalion {
  const { Manifold, CrossSection } = MOD;
  const M = MEDALION;
  const glifeLipsa: string[] = [];
  const R = p.latime / 2;

  const contur = p.forma === 'oval' ? CrossSection.circle(R, M.segmente).scale([1, M.raportOval]) : CrossSection.circle(R, M.segmente);
  const interior = contur.offset(-p.latimeRama, 'Round');

  // ---- urechea, deasupra varfului, cu gatul pana in mijlocul ramei ----
  const sus = varf(contur);
  const rGaura = M.diametruGaura / 2;
  const rExt = rGaura + M.pereteUreche;
  const cUreche: Pt = [sus[0], sus[1] - rGaura];
  const gat = CrossSection.square([rExt * 1.3, rGaura + p.latimeRama / 2]).translate([cUreche[0] - rExt * 0.65, cUreche[1]]);
  const gaura = CrossSection.circle(rGaura, 48).translate(cUreche);
  const exterior = contur.add(CrossSection.circle(rExt, 48).translate(cUreche)).add(gat);

  // ---- banda, in cadrul ei (orizontala, centrul in centrul discului) ----
  const w = p.latimeBanda;
  const conturL = contur.rotate(p.inclinare);
  const interiorL = interior.rotate(p.inclinare);
  const [L0, L1] = coarda(conturL, 0, 0) ?? [-R, R];
  let bandaL = CrossSection.square([L1 - L0 + 2, w]).translate([L0 - 1, -w / 2]).intersect(conturL);
  if (p.capete) {
    // Capetele ies din rama coborate cu `cadereCapat` (pliul) si crestate in V la varf.
    const lung = M.capat * w, crest = M.crestatura * w, cad = M.cadereCapat * w;
    const capat = (s: -1 | 1, L: number): Pt[] => [
      [L - s * p.latimeRama, -w / 2 + cad], [L + s * lung, -w / 2 + cad], [L + s * (lung - crest), cad], [L + s * lung, w / 2 + cad], [L - s * p.latimeRama, w / 2 + cad],
    ];
    const capete = new CrossSection([capat(1, L1), capat(-1, L0)], 'NonZero').subtract(interiorL);
    bandaL = bandaL.add(capete);
  }

  // ---- numele pe banda: cat mai mare intre marginile benzii si ale ramei ----
  let textL: any = null;
  let h = 0, sx = 1, nuIncape = false;
  const ref = nume2d(p.font, p.text, 10, 1, glifeLipsa);
  if (ref && !ref.isEmpty()) {
    const rb = ref.bounds();
    const inaltRef = rb.max[1] - rb.min[1], latRef = rb.max[0] - rb.min[0];
    const hCutie = w - 2 * M.margineBanda;
    // lungimea libera: interiorul ramei la marginile de sus si de jos ale cutiei numelui
    const cSus = coarda(interiorL, -hCutie / 2, 0), cJos = coarda(interiorL, hCutie / 2, 0);
    const st = Math.max(cSus?.[0] ?? -R, cJos?.[0] ?? -R) + M.margineRama;
    const dr = Math.min(cSus?.[1] ?? R, cJos?.[1] ?? R) - M.margineRama;
    const disponibil = Math.max(1, dr - st);
    h = Math.min((10 * hCutie) / inaltRef, (10 * disponibil) / latRef);
    if (h < M.textMin) {
      h = M.textMin;
      sx = Math.max(M.comprimareMax, disponibil / ((latRef * h) / 10));
      if ((latRef * h * sx) / 10 > disponibil + 0.01) {
        nuIncape = true;
        h = (10 * disponibil) / (latRef * sx);
      }
    }
    const brut = nume2d(p.font, p.text, h, sx, [])!;
    const b = brut.bounds();
    textL = brut.translate([(st + dr) / 2 - (b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2]).offset(M.ingrosareText, 'Round').intersect(bandaL);
  }

  const banda = bandaL.rotate(-p.inclinare);
  const text = textL ? textL.rotate(-p.inclinare) : gol();
  const bandaInterior = banda.intersect(interior);

  // ---- decorul: un rand simetric sus (in picioare pe banda) si unul jos (in picioare pe rama) ----
  const n = p.decor === 'fara' ? 0 : Math.max(0, Math.min(M.decorMaxBucati, Math.round(p.densitate)));
  const elemente: any[] = [];
  if (n) {
    const desene = DESENE[p.decor as Exclude<DecorMedalion, 'fara'>];
    // zonele: interiorul de deasupra si de dedesubtul benzii (in cadrul benzii: v < -w/2, v > w/2)
    const mare = 4 * R;
    const zonaSus = interiorL.intersect(CrossSection.square([mare, mare]).translate([-mare / 2, -w / 2 - mare])).rotate(-p.inclinare);
    const zonaJos = interiorL.intersect(CrossSection.square([mare, mare]).translate([-mare / 2, w / 2])).rotate(-p.inclinare);
    const departeDeBanda = banda.offset(M.distantaDecor, 'Round');
    const departeDeRama = exterior.subtract(interior.offset(-M.distantaDecor, 'Round'));
    const sMax = M.decorMax * p.latime;
    for (const [zona, peBanda] of [[zonaSus, true], [zonaJos, false]] as const) {
      if (zona.isEmpty()) continue;
      const zb = zona.bounds();
      // latimea zonei langa banda (sus) sau la mijlocul inaltimii ei (jos)
      const yRand = peBanda ? zb.max[1] - 0.3 * (zb.max[1] - zb.min[1]) : (zb.min[1] + zb.max[1]) / 2;
      const c = coarda(zona, yRand, 0) ?? [zb.min[0], zb.max[0]];
      const pas = (c[1] - c[0]) / n;
      for (let k = 0; k < n; k++) {
        const desen = desene[Math.round(Math.abs(k - (n - 1) / 2)) % desene.length];
        const x = c[0] + pas * (k + 0.5);
        const vI = coardaV(interior, x), vB = coardaV(bandaInterior, x);
        if (!vI || !vB) continue;
        // unde sta (Y in jos): pe marginea de sus a benzii, sau pe rama, jos
        const baza = peBanda ? vB[0] + M.suprapunereDecor : vI[1] + M.suprapunereDecor;
        const loc = peBanda ? vB[0] - vI[0] - M.distantaDecor : vI[1] - vB[1] - M.distantaDecor;
        const ref100 = formaSvg(desen, 100, (M.latimeLinieDecor * 100) / Math.max(1, Math.min(sMax, loc)));
        const r0 = ref100.bounds();
        const aspect = (r0.max[0] - r0.min[0]) / (r0.max[1] - r0.min[1]);
        let s = Math.min(sMax, loc, (pas - M.distantaDecor) / aspect);
        let pus = false;
        for (let incercare = 0; incercare < 8 && s >= M.decorMinMm && !pus; incercare++, s *= 0.88) {
          const marime = (100 * s) / (r0.max[1] - r0.min[1]);
          const el0 = formaSvg(desen, marime, M.latimeLinieDecor);
          const eb = el0.bounds();
          const el = el0.translate([x - (eb.min[0] + eb.max[0]) / 2, baza - eb.max[1]]);
          // ramane in interior; nu atinge numele; nu se apropie de partea (banda sau rama) pe care nu sta
          const decupat = el.intersect(interior).subtract(banda);
          if (decupat.area() < 0.5 * el.area()) continue;
          if (!text.isEmpty() && decupat.intersect(text.offset(M.distantaText, 'Round')).area() > 0.01) continue;
          if (peBanda && el.intersect(departeDeRama).area() > 0.01) continue;
          if (!peBanda && el.intersect(departeDeBanda).area() > 0.01) continue;
          if (elemente.some((e) => e.intersect(el.offset(M.distantaDecor / 2, 'Round')).area() > 0.01)) continue;
          elemente.push(decupat);
          pus = true;
        }
      }
    }
  }
  const decor = elemente.length ? CrossSection.union(elemente) : gol();

  // ---- piesele, fiecare o coloana de la placa ----
  const rama = exterior.subtract(interior).subtract(banda).subtract(gaura);
  const fundal = p.fundal === 'plin' ? interior.subtract(banda).subtract(decor) : gol();
  const bandaFaraText = banda.subtract(text);
  // Piesele vecine se ating pe o muchie comuna (decorul e decupat de banda si de rama); inchiderea cu
  // `colt` le uneste acolo unde poligoanele lor nu au aceleasi varfuri pe muchie.
  const bucati = bucatiReale(rama.add(fundal).add(banda).add(decor).offset(M.colt, 'Miter').offset(-M.colt, 'Miter')).length;

  // Doua zone care se ating intr-un singur colt dau, extrudate, o muchie cu patru fete; piesele pline
  // se inchid, golurile se deschid, varfurile aproape suprapuse se elimina (ca la globNume.ts).
  const inchide = (cs: any) => cs.offset(M.colt, 'Miter').offset(-M.colt, 'Miter').simplify(M.colt / 2);
  const deschide = (cs: any) => cs.offset(-M.colt, 'Miter').offset(M.colt, 'Miter').simplify(M.colt / 2);
  // Corpul, in culoarea discului, in trepte imbricate: fiecare treapta e tot ce urca cel putin pana la
  // inaltimea ei (fundal 2 < decor < banda < rama). Coloane doar alaturate s-ar atinge pe alocuri intr-un
  // punct (un varf de brad pe rama) si ar da muchii ciupite. Deasupra, placile colorate: banda, numele
  // (care iese peste banda) si decorul.
  const c = M.grosimeCuloare;
  const hBanda = p.grosimeRama - c;
  const hDecor = Math.min(M.inaltimeDecor, p.grosimeRama) - c;
  const trepte: Array<[any, number]> = [
    [rama.add(fundal).add(banda).add(decor), fundal.isEmpty() ? hDecor : Math.min(M.grosimeFundal, hDecor)],
    [rama.add(banda).add(decor), hDecor],
    [rama.add(banda), hBanda],
    [rama, p.grosimeRama],
  ];
  const disc = Manifold.union(trepte.filter(([cs]) => !cs.isEmpty()).map(([cs, h]) => Manifold.extrude(inchide(cs), h)));
  const piese: PiesaMedalion[] = [{ rol: 'disc', manifold: disc.simplify(M.colt / 2) }];
  if (!bandaFaraText.isEmpty()) piese.push({ rol: 'banda', manifold: Manifold.extrude(deschide(bandaFaraText), c).translate([0, 0, hBanda]) });
  if (!text.isEmpty()) piese.push({ rol: 'text', manifold: Manifold.extrude(inchide(text), c + M.textPeste).translate([0, 0, hBanda]) });
  if (!decor.isEmpty()) piese.push({ rol: 'decor', manifold: Manifold.extrude(deschide(decor), c).translate([0, 0, hDecor]) });

  // ---- liniile prea subtiri ale numelui (deschidere morfologica cu linia minima) ----
  let subtire = 0;
  if (!text.isEmpty()) {
    const deschis = text.offset(-M.linieMin / 2, 'Round').offset(M.linieMin / 2, 'Round');
    subtire = (text.area() - deschis.intersect(text).area()) / Math.max(1e-9, text.area());
  }

  return {
    piese,
    plan: { contur, interior, rama, banda, text, decor },
    diag: { inaltimeNume: h, comprimare: sx, nuIncape, subtire, decorCerut: 2 * n, decorPus: elemente.length, bucati, glifeLipsa },
  };
}
