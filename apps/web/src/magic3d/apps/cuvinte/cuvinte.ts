/**
 * APP CUVINTE DECOR — ce e SPECIFIC: cuvântul în care o poziție poate fi un SIMBOL.
 *
 * Toată geometria de piesă — punți, contur colorat, stabilitate, agățare pe perete, potrivirea
 * pe placă — vine din `core/geometry/cuvant.ts`, aceeași care ține Nume 3D. Aici rămâne o
 * singură cusătură: cum se face solidul cuvântului.
 *
 * CONTRACTUL NU MAI E „un caracter → o glifă", ci „o poziție în cuvânt → un solid".
 *
 * Niciun font instalat nu are glifa ♥ (U+2665) — verificat la scanare, consemnat în roadmap —
 * deci inima nu se poate obține din contur de font. Textul rămâne un șir obișnuit, iar
 * caracterele care au simbol în bibliotecă se înlocuiesc la construcție. Restul lanțului nu
 * observă diferența: punțile leagă un simbol plutitor exact ca pe punctul lui „i", conturul îl
 * înconjoară la fel, iar stabilitatea îl numără în centrul de masă ca pe orice altă bucată.
 *
 * AȘEZAREA E DIN AVANSURI, nu din bounding box-uri. Textul se taie în grupe de litere și
 * simboluri, fiecare grupă se construiește o dată cu `textSolid` și se mută la cursor, iar
 * cursorul avansează cu lățimea DECLARATĂ — de font pentru litere, de manifest pentru simboluri.
 * Lipite după bounding box, literele ar intra în simbol de fiecare dată când ultima are o coadă
 * care iese din caseta ei, iar cursivele au mereu.
 */
import { textSolid, type SolidReport } from '../../core/geometry/textSolid.js';
import { simbolPentru, conturSimbol, avansSimbol, type Simbol } from './simboluri.js';

let MOD: any = null;
export function configureManifold(mod: any): void { MOD = mod; }

/** o poziție din cuvânt: o grupă de litere sau un simbol */
type Bucata = { fel: 'litere'; text: string } | { fel: 'simbol'; simbol: Simbol };

/** taie textul în grupe de litere și simboluri, păstrând ordinea */
export function bucatiCuvant(text: string): Bucata[] {
  const out: Bucata[] = [];
  let curent = '';
  for (const ch of text) {
    const s = simbolPentru(ch);
    if (s) {
      if (curent) { out.push({ fel: 'litere', text: curent }); curent = ''; }
      out.push({ fel: 'simbol', simbol: s });
    } else curent += ch;
  }
  if (curent) out.push({ fel: 'litere', text: curent });
  return out;
}

/**
 * Solidul cuvântului, cu simbolurile la locul lor. Aceeași semnătură cu `textSolid`, ca să poată
 * fi dat direct nucleului ca `SursaSolid` — de asta nici nu trebuie să știe cineva că textul are
 * simboluri în el.
 */
export function solidCuvant(font: any, text: string, inaltime: number, grosime: number,
  rep?: Partial<SolidReport>): any {
  const { Manifold, CrossSection } = MOD;
  const bucati = bucatiCuvant(text);
  const parti: any[] = [];
  const glifeLipsa: string[] = [];
  let cursor = 0;

  for (const b of bucati) {
    if (b.fel === 'litere') {
      const r: Partial<SolidReport> = {};
      const s = textSolid(font, b.text, inaltime, grosime, r);
      parti.push(cursor === 0 ? s : (() => { const m = s.translate([cursor, 0, 0]); s.delete(); return m; })());
      for (const ch of r.missingGlyphs ?? []) if (!glifeLipsa.includes(ch)) glifeLipsa.push(ch);
      // avansul vine de la font; dacă lipsește (font fără metrici), se cade pe lățimea desenată
      cursor += r.advanceMM ?? (parti[parti.length - 1].boundingBox().max[0] - cursor);
    } else {
      const cs = new CrossSection(conturSimbol(b.simbol, inaltime), 'Positive');
      const solid = Manifold.extrude(cs, grosime);
      cs.delete();
      parti.push(solid.translate([cursor, 0, 0]));
      solid.delete();
      cursor += avansSimbol(b.simbol, inaltime);
    }
  }
  if (!parti.length) throw new Error('cuvant gol');

  const corp = parti.length === 1 ? parti[0] : Manifold.union(parti);
  if (parti.length > 1) for (const p of parti) p.delete();
  if (rep) {
    rep.missingGlyphs = glifeLipsa;
    rep.advanceMM = cursor;
  }
  return corp;
}

/** câte poziții VIZIBILE are cuvântul — litere plus simboluri; spațiile nu se numără */
export const nrPozitii = (text: string) => [...text].filter((ch) => !/\s/u.test(ch)).length;

/**
 * Caracterele pe care nu le poate desena nimeni: fontul n-are glifă și nici biblioteca n-are
 * simbol. La Cuvinte Decor ele BLOCHEAZĂ exportul — mecanismul e cel de la Litere Decor, doar că
 * întrebarea are acum două surse de răspuns, nu una.
 */
export function caractereFaraSursa(font: any, text: string): string[] {
  const out: string[] = [];
  for (const ch of text) {
    if (/\s/u.test(ch) || simbolPentru(ch)) continue;
    if (font && font.charToGlyphIndex(ch) === 0 && !out.includes(ch)) out.push(ch);
  }
  return out;
}
