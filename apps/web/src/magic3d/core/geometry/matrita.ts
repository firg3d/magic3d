/**
 * MATRITE TURNATE — corpurile din care se fac tavile, presele si masterele pentru silicon.
 *
 *   · corpCuDraft: un contur ridicat cu unghi de scoatere (peretii se strang spre varf) si racordare
 *     la varf; ca pozitiv e forma turnata, oglindit in jos e cavitatea dintr-o tava. Se construieste
 *     in trepte de `pas` (cat un strat de print): fiecare treapta e conturul strans cat la marginea
 *     ei de sus, deci nicaieri nu apare o contrapanta.
 *   · campInaltimi: o harta de gri ca relief (alb = inalt), pentru fundul unei cavitati.
 *   · contrapanta: cat dintr-un pozitiv nu iese drept din matrita (sectiuni mai late decat cele
 *     de sub ele), ca sa se poata avertiza pentru modelele importate.
 *
 * Unghiurile, pasul, inaltimile si pragurile vin de la apelant; nucleul nu alege nimic de produs.
 */
import type { HartaGri } from './codare.js';
import { decodeazaContur } from './conturImagine.js';
import { formaDecor, normalizeaza, type FormaDecor } from './formeDecor.js';

let MOD: any = null;
export function configureManifold(mod: any): void { MOD = mod; }

/** Cat se strange conturul la inaltimea z (0 = baza larga) a unui corp inalt de `h`. */
export function strangere(z: number, h: number, draftGrade: number, racordare: number): number {
  let d = z * Math.tan((draftGrade * Math.PI) / 180);
  const r = Math.min(racordare, h);
  if (r > 0 && z > h - r) {
    const u = z - (h - r);
    d += r - Math.sqrt(Math.max(0, r * r - u * u));
  }
  return d;
}

/**
 * Conturul `contur` ridicat de la z = 0 la z = h, strans cu unghiul de scoatere si racordat la varf.
 * Null cand conturul dispare inainte de varf (prea ingust pentru unghiul cerut).
 */
export function corpCuDraft(contur: any, h: number, draftGrade: number, racordare: number, pas: number): any | null {
  const { Manifold } = MOD;
  if (draftGrade <= 0 && racordare <= 0) return Manifold.extrude(contur, h);
  const n = Math.max(1, Math.ceil(h / pas));
  const trepte: any[] = [];
  for (let k = 0; k < n; k += 1) {
    const z0 = (k * h) / n, z1 = ((k + 1) * h) / n;
    const d = strangere(z1, h, draftGrade, racordare);
    const cs = d > 0 ? contur.offset(-d, 'Round') : contur;
    if (cs.isEmpty()) return null;
    trepte.push(Manifold.extrude(cs, z1 - z0 + (k < n - 1 ? 0.001 : 0)).translate([0, 0, z0]));
  }
  return Manifold.union(trepte);
}

/**
 * Relieful unei harti de gri pe dreptunghiul latime x inaltime (mm), centrat, cu randul 0 la y negativ
 * (Y in jos, ca imaginea): de la z = 0 pana la `baza + hMax·gri/255`. Inchis etans: fata de sus, fundul
 * plat si cei patru pereti.
 */
export function campInaltimi(harta: HartaGri, latime: number, inaltime: number, hMax: number, baza: number): any {
  const { Manifold, Mesh } = MOD;
  const nx = harta.latime, ny = harta.inaltime;
  const varfuri = new Float32Array(nx * ny * 2 * 3);
  const sus = (i: number, j: number) => j * nx + i;
  const jos = (i: number, j: number) => nx * ny + j * nx + i;
  for (let j = 0; j < ny; j += 1) {
    for (let i = 0; i < nx; i += 1) {
      const x = nx > 1 ? -latime / 2 + (i * latime) / (nx - 1) : 0;
      const y = ny > 1 ? -inaltime / 2 + (j * inaltime) / (ny - 1) : 0;
      const z = baza + (hMax * harta.gri[j * nx + i]) / 255;
      varfuri.set([x, y, z], sus(i, j) * 3);
      varfuri.set([x, y, 0], jos(i, j) * 3);
    }
  }
  const t: number[] = [];
  for (let j = 0; j < ny - 1; j += 1) {
    for (let i = 0; i < nx - 1; i += 1) {
      // Sus cu normala in +z, fundul cu normala in -z.
      t.push(sus(i, j), sus(i + 1, j), sus(i + 1, j + 1), sus(i, j), sus(i + 1, j + 1), sus(i, j + 1));
      t.push(jos(i, j), jos(i + 1, j + 1), jos(i + 1, j), jos(i, j), jos(i, j + 1), jos(i + 1, j + 1));
    }
  }
  // Un perete intre doua puncte de sus (a0 -> a1) si cele de sub ele (b0, b1), cu normala spre exterior.
  const perete = (a0: number, a1: number, b0: number, b1: number) => t.push(a0, b1, b0, a0, a1, b1);
  for (let i = 0; i < nx - 1; i += 1) {
    perete(sus(i + 1, 0), sus(i, 0), jos(i + 1, 0), jos(i, 0));
    perete(sus(i, ny - 1), sus(i + 1, ny - 1), jos(i, ny - 1), jos(i + 1, ny - 1));
  }
  for (let j = 0; j < ny - 1; j += 1) {
    perete(sus(0, j), sus(0, j + 1), jos(0, j), jos(0, j + 1));
    perete(sus(nx - 1, j + 1), sus(nx - 1, j), jos(nx - 1, j + 1), jos(nx - 1, j));
  }
  const plasa = new Mesh({ numProp: 3, vertProperties: varfuri, triVerts: new Uint32Array(t) });
  plasa.merge();
  return new Manifold(plasa);
}

/**
 * Cat (mm², adunat pe sectiuni la fiecare `pas`) din pozitivul `m` (baza la z minim) iese in afara
 * sectiunilor de sub el: partea care tine piesa turnata intr-o matrita rigida cand e scoasa prin
 * deschidere (baza pozitivului). 0 = se scoate drept.
 */
export function contrapanta(m: any, pas: number): number {
  const b = m.boundingBox();
  let arie = 0;
  let dedesubt = m.slice(b.min[2] + pas / 2);
  for (let z = b.min[2] + (3 * pas) / 2; z < b.max[2]; z += pas) {
    const s = m.slice(z);
    arie += s.subtract(dedesubt.offset(0.02, 'Miter')).area();
    dedesubt = dedesubt.intersect(s);
  }
  return arie;
}

/** Unde a ajuns dreptunghiul imaginii dupa incadrare: centrul (mm) si marimea, ca relieful din poza sa cada pe contur. */
export type CadruImagine = { cx: number; cy: number; latime: number; inaltime: number };

/**
 * Conturul unei cavitati: o forma proprie (formeDecor, Y in sus, intoarsa in Y in jos) sau conturul unei
 * imagini (conturImagine), incadrat in patratul `latime` si centrat. Pentru imagine, si cadrul ei.
 */
export function conturDinSursa(sursa: 'forma' | 'imagine', forma: FormaDecor, imagine: string, latime: number): { contur: any; cadru: CadruImagine | null } | null {
  const { CrossSection } = MOD;
  if (sursa === 'forma') {
    const inele = normalizeaza(formaDecor(forma)).map((r) => r.map(([x, y]) => [x * latime / 2, -y * latime / 2] as [number, number]));
    return { contur: new CrossSection(inele, 'NonZero'), cadru: null };
  }
  const c = decodeazaContur(imagine);
  if (!c) return null;
  const cs = new CrossSection(c.inele, 'EvenOdd');
  if (cs.isEmpty()) return null;
  const b = cs.bounds();
  const s = latime / Math.max(b.max[0] - b.min[0], b.max[1] - b.min[1]);
  const mx = (b.min[0] + b.max[0]) / 2, my = (b.min[1] + b.max[1]) / 2;
  return {
    contur: cs.translate([-mx, -my]).scale(s),
    cadru: { cx: (c.latime / 2 - mx) * s, cy: (c.inaltime / 2 - my) * s, latime: c.latime * s, inaltime: c.inaltime * s },
  };
}
