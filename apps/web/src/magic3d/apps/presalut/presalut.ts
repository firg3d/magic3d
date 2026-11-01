/**
 * APP PRESA PENTRU LUT SI SAPUN — geometria produsului (varianta cu doua jumatati).
 *
 * Doua jumatati care se inchid una peste alta: fiecare are jumatate din cavitate (conturul formei
 * proprii sau al imaginii clientului, cu unghi de scoatere si racordare la fund). Jumatatea de jos
 * are canalul de surplus in jurul cavitatii, cu iesiri spre margine, si trei stifturi de centrare
 * (al patrulea colt lipseste: jumatatile se inchid intr-un singur fel); cea de sus are gaurile
 * stifturilor si, optional, un text gravat in tavan, care iese in relief pe fata de sus a piesei.
 *
 * Totul se construieste in pozitia inchisa; jumatatea de sus se intoarce apoi pe placa (rotire 180°
 * in jurul axei X, la planul de separatie), cu cavitatea in sus. `inchide` o duce inapoi.
 */
import { configureManifold as configEmblema, continut, incadreaza } from '../../core/geometry/emblema.js';
import type { FormaDecor } from '../../core/geometry/formeDecor.js';
import { configureManifold as configMatrita, conturDinSursa, corpCuDraft, strangere } from '../../core/geometry/matrita.js';
import { PRESA_LUT } from './config.js';

let MOD: any = null;
export function configureManifold(mod: any): void { MOD = mod; configEmblema(mod); configMatrita(mod); }

export interface ParamPresaLut {
  sursa: 'forma' | 'imagine';
  forma: FormaDecor;
  imagine: string;
  latime: number;
  adancime: number;
  perete: number;
  draft: number;
  racordare: number;
  font: any;
  text: string;
}

export type RolPresaLut = 'jos' | 'sus';

export interface DiagPresaLut {
  lipsa: '' | 'imagine' | 'ingust';
  /** Volumul piesei (cele doua jumatati de cavitate), mm³. */
  volum: number;
  glifeLipsa: string[];
  textIncape: boolean;
}

export interface RezultatPresaLut {
  piese: Array<{ rol: RolPresaLut; manifold: any }>;
  diag: DiagPresaLut;
  /** Planul de separatie (fata de sus a jumatatii de jos), mm. */
  separatie: number;
  /** Jumatatea de sus, asa cum e pe placa, dusa in pozitia inchisa. */
  inchide: (sus: any) => any;
  /** Conturul cavitatii la planul de separatie. */
  contur: any | null;
}

export function buildPresaLut(p: ParamPresaLut): RezultatPresaLut {
  const { Manifold, CrossSection } = MOD;
  const nimic = (lipsa: DiagPresaLut['lipsa'], contur: any = null): RezultatPresaLut => ({ piese: [], diag: { lipsa, volum: 0, glifeLipsa: [], textIncape: true }, separatie: 0, inchide: (m) => m, contur });
  const sursa = conturDinSursa(p.sursa, p.forma, p.imagine, p.latime);
  if (!sursa) return nimic('imagine');
  const C = sursa.contur;
  const a = p.adancime;
  const pas = Math.max(PRESA_LUT.pasDraft, a / PRESA_LUT.treapteMax);
  const P = corpCuDraft(C, a, p.draft, p.racordare, pas);
  if (!P) return nimic('ingust', C);

  const Hb = p.perete + a;
  const Ht = p.perete + a;
  const b = C.bounds();
  const bw = b.max[0] - b.min[0], bh = b.max[1] - b.min[1];
  const rs = PRESA_LUT.diametruStift / 2;
  const g = PRESA_LUT.golCanal + PRESA_LUT.latimeCanal + 1 + rs;
  const W = bw + 2 * (g + rs + p.perete);
  const D = bh + 2 * (g + rs + p.perete);
  const bloc = CrossSection.square([W, D], true).offset(-PRESA_LUT.razaColt, 'Round').offset(PRESA_LUT.razaColt, 'Round');
  const cx = (b.min[0] + b.max[0]) / 2, cy = (b.min[1] + b.max[1]) / 2;
  const blocC = bloc.translate([cx, cy]);
  // Trei stifturi in colturi (fara cel din dreapta-jos): jumatatile nu se pot inchide gresit.
  const stifturi: Array<[number, number]> = [[-1, -1], [1, -1], [-1, 1]].map(([sx, sy]) => [cx + sx * (bw / 2 + g), cy + sy * (bh / 2 + g)]);

  // Jumatatea de jos: cavitatea in jos de la planul de separatie, canalul de surplus si iesirile lui.
  const canal = C.offset(PRESA_LUT.golCanal + PRESA_LUT.latimeCanal, 'Round').subtract(C.offset(PRESA_LUT.golCanal, 'Round'));
  const lc = PRESA_LUT.latimeCanal;
  // Iesirile: o cruce prin mijloc, de la canal pana dincolo de margine (nu prin cavitate si nici prin golul pana la canal).
  const iesiri = CrossSection.square([W + 2, lc]).translate([cx - W / 2 - 1, cy - lc / 2])
    .add(CrossSection.square([lc, D + 2]).translate([cx - lc / 2, cy - D / 2 - 1]))
    .subtract(C.offset(PRESA_LUT.golCanal + PRESA_LUT.latimeCanal / 2, 'Round'));
  let jos = Manifold.extrude(blocC, Hb);
  jos = jos.subtract(P.mirror([0, 0, 1]).translate([0, 0, Hb + 0.001]));
  jos = jos.subtract(Manifold.extrude(canal.add(iesiri), PRESA_LUT.adancimeCanal + 0.01).translate([0, 0, Hb - PRESA_LUT.adancimeCanal]));
  jos = Manifold.union([jos, ...stifturi.map(([x, y]) => Manifold.cylinder(PRESA_LUT.inaltimeStift + 0.01, rs, rs, 32).translate([x, y, Hb - 0.01]))]);

  // Jumatatea de sus, inchisa: cavitatea in sus de la separatie, gaurile stifturilor, textul in tavan.
  let sus = Manifold.extrude(blocC, Ht).translate([0, 0, Hb]);
  sus = sus.subtract(P.translate([0, 0, Hb - 0.001]));
  const rg = rs + PRESA_LUT.tolerantaStift;
  sus = sus.subtract(Manifold.union(stifturi.map(([x, y]) => Manifold.cylinder(PRESA_LUT.inaltimeStift + 0.6, rg, rg, 32).translate([x, y, Hb - 0.01]))));
  const glifeLipsa: string[] = [];
  let textIncape = true;
  if (p.text.trim()) {
    const t = continut({ mod: 'text', font: p.font, text: p.text, imagine: '', imagineFataDeText: 1, golImagineText: 0 });
    glifeLipsa.push(...t.glifeLipsa);
    const tavan = C.offset(-(strangere(a, a, p.draft, p.racordare) + PRESA_LUT.margineText), 'Round');
    if (t.sectiune && !tavan.isEmpty()) {
      const r = incadreaza(t.sectiune, tavan, PRESA_LUT.factorIncadrare, PRESA_LUT.incercariIncadrare);
      textIncape = r.incape;
      sus = sus.subtract(Manifold.extrude(r.sectiune, PRESA_LUT.adancimeText + 0.01).translate([0, 0, Hb + a - 0.01]));
    } else textIncape = false;
  }

  // Pe placa: jumatatea de sus intoarsa (rotire, nu oglindire), cu cavitatea in sus, langa cea de jos.
  const intoarce = (m: any) => m.translate([0, 0, -Hb]).rotate([180, 0, 0]).translate([0, 0, Hb]);
  const dx = W + PRESA_LUT.distantaPlaca;
  const coboara = Hb - Ht;
  const susPlaca = intoarce(sus).translate([dx, 0, -coboara]);
  return {
    piese: [{ rol: 'jos', manifold: jos }, { rol: 'sus', manifold: susPlaca }],
    diag: { lipsa: '', volum: 2 * P.volume(), glifeLipsa, textIncape },
    separatie: Hb,
    inchide: (m: any) => intoarce(m.translate([-dx, 0, coboara])),
    contur: C,
  };
}
