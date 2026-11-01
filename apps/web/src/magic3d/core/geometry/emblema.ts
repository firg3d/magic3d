/**
 * CONTINUTUL UNEI EMBLEME — text, imagine sau amandoua, ca sectiune 2D gata de pus pe o fata.
 *
 * Il folosesc produsele care imprima un desen ales de client (stampila, presa de hartie): textul
 * din font, conturul imaginii incarcate (vezi conturImagine.ts) sau imaginea deasupra textului.
 * Coordonatele sunt in mm, cu Y in jos (ca textul din textSolid si pixelii imaginii), centrate
 * pe origine; oglindirea si inaltimea reliefului le hotaraste fiecare produs.
 *
 * Ce NU intra aici: limitele de produs. Grosimea minima a unei linii, cat se micsoreaza
 * continutul ca sa incapa, aria sub care o bucata e aschie - toate vin de la apelant.
 */
import { decodeazaContur } from './conturImagine.js';
import { configureManifold as configTextSolid, textSolid } from './textSolid.js';

let MOD: any = null;
export function configureManifold(mod: any): void { MOD = mod; configTextSolid(mod); }

export type ModContinut = 'text' | 'imagine' | 'ambele';

export interface CerereContinut {
  mod: ModContinut;
  font: any;
  text: string;
  /** Conturul imaginii, codat (conturImagine.ts); gol = fara imagine. */
  imagine: string;
  /** Inaltimea imaginii fata de inaltimea majusculelor textului, cand sunt amandoua. */
  imagineFataDeText: number;
  /** Golul dintre imagine si text, in inaltimi de majuscula. */
  golImagineText: number;
}

export interface Continut {
  /** Sectiunea in unitati naturale (majuscula textului = 10), centrata; null cand nu e nimic de pus. */
  sectiune: any | null;
  glifeLipsa: string[];
  areImagine: boolean;
  areText: boolean;
}

/** Inaltimea majusculei la care se construieste textul inainte de incadrare. */
const MAJUSCULA = 10;

/** Conturul imaginii ca sectiune, cu inaltimea `inaltime`, centrat; null cand nu e o imagine valida. */
export function sectiuneImagine(cod: string, inaltime: number): any | null {
  const contur = decodeazaContur(cod);
  if (!contur) return null;
  const { CrossSection } = MOD;
  // Par-impar: gaurile literelor si ale desenului raman gauri oricum ar fi orientate inelele.
  const cs = new CrossSection(contur.inele, 'EvenOdd');
  if (cs.isEmpty()) return null;
  return centreaza(cs.scale(inaltime / contur.inaltime));
}

function sectiuneText(font: any, text: string, glifeLipsa: string[]): any | null {
  if (!font || !text.trim()) return null;
  const rep: any = {};
  const solid = textSolid(font, text.trim(), MAJUSCULA, 1, rep);
  for (const g of rep.glifeLipsa ?? []) glifeLipsa.push(...(g.caractere ?? []));
  const cs = solid.project();
  return cs.isEmpty() ? null : centreaza(cs);
}

export function centreaza(cs: any): any {
  const b = cs.bounds();
  return cs.translate([-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2]);
}

/** Textul si/sau imaginea, una sub alta (imaginea sus, adica Y negativ), centrate pe origine. */
export function continut(c: CerereContinut): Continut {
  const glifeLipsa: string[] = [];
  const vreaText = c.mod !== 'imagine';
  const vreaImagine = c.mod !== 'text';
  const text = vreaText ? sectiuneText(c.font, c.text, glifeLipsa) : null;
  const imagine = vreaImagine ? sectiuneImagine(c.imagine, MAJUSCULA * (text ? c.imagineFataDeText : 1)) : null;
  if (!text || !imagine) return { sectiune: text ?? imagine, glifeLipsa, areImagine: !!imagine, areText: !!text };
  const bi = imagine.bounds();
  const bt = text.bounds();
  const gol = MAJUSCULA * c.golImagineText;
  const sus = imagine.translate([0, bt.min[1] - gol - bi.max[1]]);
  return { sectiune: centreaza(sus.add(text)), glifeLipsa, areImagine: true, areText: true };
}

/**
 * Continutul scalat ca sa stea in `zona`: intai dupa cutie, apoi micsorat cu `factor` pana nu mai
 * iese (cel mult `incercari` pasi). Intoarce sectiunea in mm si scara aplicata.
 */
export function incadreaza(cs: any, zona: any, factor: number, incercari: number, toleranta = 0.01): { sectiune: any; scara: number; incape: boolean } {
  const b = cs.bounds();
  const z = zona.bounds();
  const cx = (z.min[0] + z.max[0]) / 2;
  const cy = (z.min[1] + z.max[1]) / 2;
  let scara = Math.min((z.max[0] - z.min[0]) / (b.max[0] - b.min[0]), (z.max[1] - z.min[1]) / (b.max[1] - b.min[1]));
  let pus = cs.scale(scara).translate([cx, cy]);
  for (let i = 0; i < incercari && pus.subtract(zona).area() > toleranta; i++) {
    scara *= factor;
    pus = cs.scale(scara).translate([cx, cy]);
  }
  return { sectiune: pus, scara, incape: pus.subtract(zona).area() <= toleranta };
}

/**
 * Cat din `cs` e mai subtire de `latimeMin` (mm): ce dispare la o deschidere morfologica (strangere
 * cu jumatate de latime, apoi largire inapoi). Colturile ascutite pierd si ele putin; bucatile mai
 * mici de `arieMin` mm² se lasa deoparte, ca un colt sa nu para o linie subtire.
 */
export function ariaSubtire(cs: any, latimeMin: number, arieMin: number): number {
  const r = latimeMin / 2;
  const deschis = cs.offset(-r, 'Round').offset(r, 'Round');
  const pierdut = cs.subtract(deschis);
  let arie = 0;
  for (const bucata of pierdut.decompose()) {
    const a = bucata.area();
    if (a > arieMin) arie += a;
  }
  return arie;
}
