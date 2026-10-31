/**
 * TEST DE REGRESIE — cele 12 generatoare existente nu se mișcă.
 *
 * DECIZIA 1 din `docs/design/semnatura-huse-iphone.md`: generatoarele existente rămân gratuite,
 * fără filigran, fără semnătură, cu geometria neatinsă. Valul SEM.1 pune `aplicaMarcaj` în
 * NUCLEU, iar nucleul e comun — deci orice atingere de nucleu le poate mișca fără să vrea.
 *
 * CE COMPARĂ, ȘI DE CE NU OCTEȚII. Documentul cere „identic byte-cu-byte (sau, dacă serializarea
 * nu e deterministă, identic ca volum și număr de triunghiuri)". Măsurat în Faza 0: două
 * exporturi 3MF ale ACELUIAȘI corp, la o secundă distanță, ies 1285 de octeți amândouă dar
 * diferă prin 10 octeți, primul la offsetul 10 — exact unde ZIP-ul scrie ora de modificare.
 * Serializarea NU e deterministă, deci se compară geometria.
 *
 * COMPONENTELE CONEXE nu erau cerute explicit în document, dar prind clasa de regresie de care
 * ne temem cel mai tare în valul ăsta: un marcaj scăpat ca obiect separat lasă volumul aproape
 * neschimbat și crește numărul de bucăți. Volumul singur n-ar vedea-o.
 *
 * Rulare:
 *   npm run test:regresie              — compară cu referințele salvate
 *   npm run test:regresie -- --scrie   — (re)scrie referințele. Se face O SINGURĂ DATĂ, înainte
 *                                        de SEM.1, și niciodată „ca să treacă testul".
 */
// @ts-ignore — opentype.js nu are declarații de tip (ca în restul proiectului)
import opentype from 'opentype.js';
import ManifoldModule from 'manifold-3d';
import { VOLUM_MINIM_COMPONENTA } from '../core/primitive/cioburi.js';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { adunaHandle } from '../core/geometry/arena.js';
import { CAZURI } from './fixture-regresie.js';

import * as litere from '../apps/litere/assembly.js';
import * as nume from '../apps/nume/nume.js';
import * as brelocuri from '../apps/brelocuri/breloc.js';
import * as fagure from '../apps/fagure/fagure.js';
import * as cutii from '../apps/cutii/cutii.js';
import * as cuvinte from '../apps/cuvinte/cuvinte.js';
import * as led from '../apps/led/led.js';
import * as articulat from '../apps/articulat/articulat.js';
import * as placute from '../apps/placute/placute.js';
import * as rame from '../apps/rame/rame.js';
import * as decor from '../apps/breloc-decor/decor.js';
import * as numeLed from '../apps/nume-led/nume-led.js';
import { configureManifold as configCuvantNucleu, construiestePiesa } from '../core/geometry/cuvant.js';


/**
 * IESIRILE FOLOSESC `process.exitCode` + `return`, NU `process.exit` — vezi regula din
 * docs/design/. Corpul e invelit in `main()` ca `return` sa poata opri executia acolo unde
 * `process.exit` o oprea; aici conteaza mai ales la `--scrie`, care trebuie sa se opreasca
 * dupa ce a scris referintele, nu sa mearga mai departe si sa le compare cu ele insele.
 */
async function main() {
  const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const FONT_DIR = join(ROOT, 'public', 'fonts');
  const CALE_REF = join(ROOT, 'src', '_tests', 'referinte-regresie.json');
  const SCRIE = process.argv.includes('--scrie');

  const mod = await ManifoldModule();
  mod.setup();
  for (const m of [litere, nume, brelocuri, fagure, cutii, cuvinte, led, articulat, placute, rame, decor, numeLed]) {
    (m as any).configureManifold?.(mod);
  }
  configCuvantNucleu(mod);

  const fonturi = new Map<string, any>();
  const font = (f: string) => {
    if (!fonturi.has(f)) fonturi.set(f, opentype.parse(readFileSync(join(FONT_DIR, f)).buffer));
    return fonturi.get(f);
  };

  /**
   * DISPOZITORUL. Fiecare generator are alt nume de funcție și altă formă de configurație — de-aia
   * setul fix de parametri stă în fixture, iar cusătura cu semnătura fiecărei funcții stă aici.
   * Un generator nou se adaugă cu un rând.
   */
  function construieste(app: string, cfg: any, f: string[]): any {
    switch (app) {
      case 'litere': return litere.buildAssembly({ ...cfg, fontLitera: font(f[0]), fontScris: font(f[1]) });
      case 'nume': return nume.buildNume({ ...cfg, font: font(f[0]) });
      case 'brelocuri': return brelocuri.buildBreloc({ ...cfg, font: font(f[0]) });
      case 'fagure': return fagure.buildFagure({ ...cfg, font: font(f[0]) });
      case 'cutii': return cutii.buildCutie({ ...cfg, font: font(f[0]) });
      case 'led': return led.buildLed({ ...cfg, font: font(f[0]) });
      case 'articulat': return articulat.buildArticulat({ ...cfg, font: font(f[0]) });
      case 'placute': return placute.buildPlacuta({ ...cfg, font: font(f[0]) });
      case 'rame': return rame.buildRama({ ...cfg, font: font(f[0]) });
      case 'breloc-decor': return decor.buildDecor({ ...cfg, fontBaza: font(f[0]), fontNume: font(f[1]) });
      case 'nume-led': return numeLed.buildNumeLed({ ...cfg, font: font(f[0]) });
      // Cuvinte Decor nu are `build` propriu: cusătura lui e solidul din nucleu, ca la Nume 3D.
      case 'cuvinte': {
        const ft = font(f[0]);
        const { text, ...rest } = cfg;
        return construiestePiesa({ ...rest,
          solid: (inaltime: number, grosime: number, rep?: any) =>
            cuvinte.solidCuvant(ft, text, inaltime, grosime, rep) } as any);
      }
      default: throw new Error(`generator necunoscut in fixture: ${app}`);
    }
  }

  interface Masura { volum: number; triunghiuri: number; bucati: number; cx: number; cy: number }

  /**
   * Măsoară TOATE corpurile dintr-un rezultat, indiferent de forma lui.
   *
   * Rezultatele au forme diferite — `corpOpac`/`corpFata`, `blocuri`/`litere`, `corpPlacuta` —
   * deci nu se pot enumera pe nume. `adunaHandle` din nucleu le găsește oriunde stau în obiect;
   * e chiar unealta cu care aplicațiile își eliberează memoria, deci nu poate rămâne în urmă față
   * de forma rezultatelor.
   *
   * Sortarea e după volum, ca ordinea să nu depindă de ordinea cheilor din obiect.
   */
  /**
   * CIOBURILE NUMERICE, cautate la TOATE generatoarele, nu doar la cel unde s-au vazut prima oara.
   *
   * Regula de nucleu (`core/primitive/cioburi.ts`) spune ca nicio piesa exportata n-are voie sa
   * duca cu ea componente sub `VOLUM_MINIM_COMPONENTA`. Aplicata doar in husa, ar fi o reparatie
   * locala; masurata aici, pe setul fix cu care ruleaza regresia, devine o afirmatie despre TOT
   * proiectul — si una care se strica zgomotos daca vreun tipar incepe sa lase resturi.
   *
   * Se MASOARA, nu se curata: generatoarele existente nu se ating (DECIZIA 1). Daca vreunul ar
   * incepe sa lase cioburi, aici se vede, nu in slicerul cuiva.
   */
  const cioburi: string[] = [];

  function masoara(rez: any, app = ''): Masura[] {
    const out: Masura[] = [];
    for (const h of adunaHandle(rez)) {
      if (typeof h?.volume !== 'function' || typeof h?.numTri !== 'function') continue;
      let parti: any[] = [];
      try { parti = h.decompose(); } catch { parti = []; }
      if (app && parti.length > 1) {
        const mici = parti.map((x) => x.volume()).filter((v) => v < VOLUM_MINIM_COMPONENTA);
        if (mici.length) {
          cioburi.push(`${app}: ${mici.length} componente sub ${VOLUM_MINIM_COMPONENTA} mm3 `
            + `(${mici.map((v) => v.toFixed(4)).join(', ')})`);
        }
      }
      out.push({ volum: +h.volume().toFixed(3), triunghiuri: h.numTri(), bucati: parti.length || 1,
        ...centru(h) });
      for (const p of parti) p.delete();
    }
    return out.sort((a, b) => b.volum - a.volum || b.triunghiuri - a.triunghiuri);
  }

  /**
   * CENTRUL DE MASĂ AL PROIECȚIEI, ca regresia să vadă și OGLINDIRILE.
   *
   * Volumul, numărul de triunghiuri și componentele sunt toate INVARIANTE la o răsturnare: un
   * text oglindit trece pe lângă ele fără să clipească. S-a văzut concret la huse — trei căi de
   * text erau răsturnate pe Y și nicio verificare n-avea cum s-o arate.
   *
   * Centroidul proiecției față de centrul cutiei ei își schimbă semnul la oglindire, deci e
   * exact cota care lipsea. Se rotunjește la trei zecimale, ca zgomotul numeric să nu producă
   * abateri false.
   */
  function centru(h: any): { cx: number; cy: number } {
    let pr: any = null;
    try { pr = h.project(); } catch { return { cx: 0, cy: 0 }; }
    const inele = pr.toPolygons() as [number, number][][];
    let A = 0, sx = 0, sy = 0, minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const inel of inele) {
      for (let i = 0; i < inel.length; i++) {
        const [x1, y1] = inel[i], [x2, y2] = inel[(i + 1) % inel.length];
        const f = x1 * y2 - x2 * y1;
        A += f; sx += (x1 + x2) * f; sy += (y1 + y2) * f;
        minX = Math.min(minX, x1); maxX = Math.max(maxX, x1);
        minY = Math.min(minY, y1); maxY = Math.max(maxY, y1);
      }
    }
    pr.delete();
    if (Math.abs(A) < 1e-9) return { cx: 0, cy: 0 };
    A /= 2;
    return {
      cx: +(sx / (6 * A) - (minX + maxX) / 2).toFixed(3),
      cy: +(sy / (6 * A) - (minY + maxY) / 2).toFixed(3),
    };
  }

  const acum: Record<string, Masura[]> = {};
  const erori: string[] = [];
  console.log(`\nREGRESIE — ${CAZURI.length} generatoare, set fix de parametri\n`);

  for (const caz of CAZURI) {
    try {
      const t0 = performance.now();
      const rez = construieste(caz.app, caz.cfg, caz.fonturi);
      const m = masoara(rez, caz.app);
      acum[caz.app] = m;
      const vol = m.reduce((s, x) => s + x.volum, 0);
      const tri = m.reduce((s, x) => s + x.triunghiuri, 0);
      console.log(`  ${caz.app.padEnd(14)} ${String(m.length).padStart(2)} corpuri | ${vol.toFixed(0).padStart(9)} mm3 | ${String(tri).padStart(7)} triunghiuri | ${(performance.now() - t0).toFixed(0)} ms`);
    } catch (e: any) {
      erori.push(`${caz.app}: ${e.message}`);
      console.log(`  ${caz.app.padEnd(14)} ESEC: ${e.message}`);
    }
  }

  if (erori.length) {
    console.error(`\n${erori.length} generator(oare) n-au putut fi construite:\n  ` + erori.join('\n  ') + '\n');
    // vezi regula din docs/design/: process.exit dupa manifold crapa libuv pe Windows
    process.exitCode = 1;
  } else {

    if (SCRIE) {
      writeFileSync(CALE_REF, JSON.stringify(acum, null, 2) + '\n');
      console.log(`\nReferinte scrise: ${CALE_REF}`);
      console.log(`  ${Object.keys(acum).length} generatoare, ${Object.values(acum).reduce((s, m) => s + m.length, 0)} corpuri.\n`);
      process.exitCode = 0; return;
    }

    if (!existsSync(CALE_REF)) {
      console.error('\nNu exista referinte. Ruleaza intai: npm run test:regresie -- --scrie\n');
      process.exitCode = 1; return;
    }

    const ref: Record<string, Masura[]> = JSON.parse(readFileSync(CALE_REF, 'utf8'));
    const abateri: string[] = [];
    for (const caz of CAZURI) {
      const a = acum[caz.app], r = ref[caz.app];
      if (!r) { abateri.push(`${caz.app}: lipseste din referinte`); continue; }
      if (a.length !== r.length) { abateri.push(`${caz.app}: ${a.length} corpuri, in referinta ${r.length}`); continue; }
      for (let i = 0; i < a.length; i++) {
        if (a[i].volum !== r[i].volum) abateri.push(`${caz.app} corp ${i}: volum ${a[i].volum} vs ${r[i].volum} mm3 (${(a[i].volum - r[i].volum).toFixed(3)})`);
        if (a[i].triunghiuri !== r[i].triunghiuri) abateri.push(`${caz.app} corp ${i}: ${a[i].triunghiuri} triunghiuri vs ${r[i].triunghiuri}`);
        if (a[i].bucati !== r[i].bucati) abateri.push(`${caz.app} corp ${i}: ${a[i].bucati} bucati vs ${r[i].bucati} — MARCAJ SCAPAT CA OBIECT SEPARAT?`);
        if (r[i].cx === undefined) abateri.push(`${caz.app} corp ${i}: referinta e veche, fara centroid — rescrie-o cu --scrie`);
        else if (a[i].cx !== r[i].cx || a[i].cy !== r[i].cy)
          abateri.push(`${caz.app} corp ${i}: centroid (${a[i].cx}, ${a[i].cy}) vs (${r[i].cx}, ${r[i].cy}) — OGLINDIRE? volumul si triunghiurile nu se schimba la o rasturnare`);
      }
    }

    if (abateri.length) {
      console.error(`\n--- ${abateri.length} ABATERI DE LA REFERINTA ---`);
      for (const d of abateri) console.error('  ESEC: ' + d);
      console.error('\nUn generator existent s-a miscat. DECIZIA 1 spune ca nu are voie.\n');
      process.exitCode = 1; return;
    }
    console.log(`\nRegresie curata — ${CAZURI.length} generatoare, ${Object.values(acum).reduce((s, m) => s + m.length, 0)} corpuri, identice cu referinta.`);
    if (cioburi.length) {
      console.error('\nCIOBURI NUMERICE — componente pe care exportul n-are voie sa le duca:');
      for (const c of cioburi) console.error('  ESEC: ' + c);
      process.exitCode = 1;
    } else {
      console.log(`Niciun ciob: toate corpurile celor ${CAZURI.length} generatoare sunt peste ${VOLUM_MINIM_COMPONENTA} mm3.\n`);
    }
  }
}

await main();
