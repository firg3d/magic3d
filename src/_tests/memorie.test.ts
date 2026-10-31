/**
 * TEST PERMANENT — RECONSTRUCȚIILE NU SCURG MEMORIE WASM.
 *
 * Clasa de defect e insidioasă: nu se vede nici în geometrie, nici în volume, nici la primele
 * zeci de reconstrucții. Aplicația merge normal, apoi — după destul lucru — crapă cu erori
 * care nu seamănă deloc cu o scurgere de memorie:
 *
 *     memory access out of bounds
 *     table index is out of bounds
 *     parameter 0 has unknown type <caractere aiurea>
 *
 * Ultima e cea mai derutantă: e un nume de tip embind citit dintr-un pointer corupt, deci
 * arată ca o eroare de tipuri, nu ca un heap epuizat.
 *
 * CAUZA. Obiectele Manifold/CrossSection sunt handle-uri embind. Memoria lor stă în heap-ul
 * WASM și se eliberează DOAR prin `.delete()`; garbage collectorul JS nu o atinge. O
 * reconstrucție alocă sute de obiecte intermediare. `src/apps/litere/` nu elibera NICIUNUL —
 * singura aplicație din proiect fără `.delete()`, restul (fagure, cutii, led, cuvinte, nume,
 * brelocuri) eliberau corect.
 *
 * MĂSURAT ÎNAINTE DE REPARAȚIE: pe o scenă ușoară (o literă + scris, fără tematici),
 * reconstrucția numărul 113 arunca „memory access out of bounds". Cu tematici importate în
 * scenă, pragul vine considerabil mai devreme.
 *
 * SIMPTOMUL RAPORTAT DE UTILIZATOR nu era „aplicația crapă", ci „modelul nu se actualizează":
 * reconstrucția arunca, iar pe ecran rămânea geometria veche. De aici reclamațiile că tematica
 * mutată nu se mișcă și că textul șters rămâne în model.
 *
 * REPARAT prin arena din `core/geometry/arena.ts`: intermediarele se eliberează la ieșirea din
 * `build()`, iar rezultatul precedent se eliberează la reconstrucția următoare.
 *
 * Testul NU epuizează heap-ul (ar dura minute). Verifică direct contabilitatea, care e
 * semnalul precis: intermediarele chiar se eliberează, ce trebuie păstrat supraviețuiește,
 * iar numărul de obiecte vii NU crește de la o reconstrucție la alta.
 *
 * Rulare:  npm run test:memorie
 */
// @ts-ignore — opentype.js nu are declarații de tip (ca în restul proiectului)
import opentype from 'opentype.js';
import ManifoldModule from 'manifold-3d';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inArena, instrumenteazaArena, elibereaza } from '../core/geometry/arena.js';
import { configureManifold as cfgText } from '../core/geometry/textSolid.js';
import { configureManifold as cfgAsm } from '../apps/litere/assembly.js';
import { build, ultimulRaportArena } from '../apps/litere/build.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const M: any = await ManifoldModule();
M.setup(); cfgText(M); cfgAsm(M);
instrumenteazaArena(M);
const { Manifold } = M;

let esecuri = 0;
const check = (nume: string, ok: boolean, detaliu = '') => {
  console.log(`${ok ? '  OK  ' : '  ESEC'} ${nume}${detaliu ? '  - ' + detaliu : ''}`);
  if (!ok) esecuri++;
};

const fontL = opentype.loadSync(join(ROOT, 'fonts', 'AlexBrush-Regular.ttf'));
const fontS = opentype.loadSync(join(ROOT, 'fonts', 'Pacifico-Regular.ttf'));

/** config de referință; `scris` variază între reconstrucții, litera rămâne aceeași */
const cfg = (scris: string): any => ({
  litera: 'M', fontLitera: fontL, inaltimeLitera: 120, grosimeLitera: 25, culoareLitera: '#889EC8',
  scris, fontScris: fontS, inaltimeScris: 40, reliefScris: 2.5, culoareScris: '#FFFFFF',
  scrisOffX: 0.84, scrisOffY: -35.2, rotatieScris: 0, scrisRotX: 0, scrisRotY: 0,
  scrisPozitieZ: -1.04, modScris: 'locas', grosimeScris: 4.5, jocInsertie: 0.2,
  chenarActiv: true, latimeChenar: 3, adancimeChenar: 3, razaMuchie: 1.2, taiereBaza: 2,
  tematici: [], baza: null,
});

// ---------- 1. MECANISMUL ARENEI ----------
// Fără asta, restul testului ar putea trece degeaba: dacă arena n-ar înregistra nimic,
// „eliberate: 0" ar arăta la fel ca „nu era nimic de eliberat".
console.log('\nMECANISMUL ARENEI');
{
  const pastrat = inArena(
    () => {
      let ultim: any = null;
      for (let i = 0; i < 40; i++) ultim = Manifold.cube([1 + i, 1, 1], true);
      return ultim;
    },
    (rez) => [rez],
  );
  check('obiectul intors supravietuieste arenei', !pastrat.isDeleted());
  const v = pastrat.volume();
  check('obiectul pastrat e utilizabil dupa inchiderea arenei', v > 0, `volum ${v.toFixed(1)} mm3`);
  pastrat.delete();
}
{
  // 40 alocate, 1 pastrat -> 39 eliberate. Numarul exact conteaza: prinde si supra-eliberarea.
  let raport: any = null;
  const p = inArena(
    () => { let u: any = null; for (let i = 0; i < 40; i++) u = Manifold.cube([1 + i, 1, 1], true); return u; },
    (rez) => [rez],
    (r) => { raport = r; },
  );
  check('arena elibereaza exact intermediarele', raport?.eliberate === 39 && raport?.pastrate === 1,
    `alocate ${raport?.alocate}, pastrate ${raport?.pastrate}, eliberate ${raport?.eliberate}`);
  p.delete();
}
{
  // O constructie esuata nu are voie sa lase nimic in urma.
  const martori: any[] = [];
  let aAruncat = false;
  try {
    inArena(() => {
      for (let i = 0; i < 10; i++) martori.push(Manifold.cube([1 + i, 1, 1], true));
      throw new Error('esec simulat');
    }, () => []);
  } catch { aAruncat = true; }
  const vii = martori.filter((o) => !o.isDeleted()).length;
  check('arena se goleste si cand constructia arunca', aAruncat && vii === 0, `ramase vii ${vii} din 10`);
}

// ---------- 2. RECONSTRUCȚIA ELIBEREAZĂ INTERMEDIARELE ----------
console.log('\nRECONSTRUCTIA ELIBEREAZA INTERMEDIARELE');
const r1 = build(cfg('Madalina'));
const rap1 = ultimulRaportArena();
check('reconstructia aloca obiecte in arena', (rap1?.alocate ?? 0) > 50, `alocate ${rap1?.alocate}`);
check('reconstructia elibereaza majoritatea intermediarelor',
  !!rap1 && rap1.eliberate > rap1.pastrate * 3,
  `eliberate ${rap1?.eliberate}, pastrate ${rap1?.pastrate}`);
check('rezultatul intors e viu dupa reconstructie',
  !r1.corpLitera.isDeleted() && !!r1.corpScris && !r1.corpScris.isDeleted());
const volumR1 = r1.corpLitera.volume();
check('rezultatul e utilizabil (volum citibil)', volumR1 > 0, `${volumR1.toFixed(0)} mm3`);

// ---------- 3. REZULTATUL PRECEDENT SE ELIBEREAZĂ LA URMĂTOAREA RECONSTRUCȚIE ----------
// Asta e a doua jumătate a scurgerii: chiar dacă intermediarele s-ar elibera, rezultatele
// întoarse se acumulau câte unul pe reconstrucție.
console.log('\nREZULTATUL PRECEDENT SE ELIBEREAZA');
const vechiLitera = r1.corpLitera;
const vechiScris = r1.corpScris;
const r2 = build(cfg('Madalin'));
check('litera din reconstructia precedenta e eliberata', vechiLitera.isDeleted());
check('scrisul din reconstructia precedenta e eliberat', !!vechiScris && vechiScris.isDeleted());
check('rezultatul curent NU e afectat', !r2.corpLitera.isDeleted() && r2.corpLitera.volume() > 0);

// ---------- 4. NUMĂRUL DE OBIECTE VII NU CREȘTE ----------
// Semnalul care ar fi prins bugul din prima: dacă `pastrate` crește de la o reconstrucție la
// alta, ceva se acumulează. Constant => reconstrucțiile se anulează reciproc.
console.log('\nOBIECTELE VII NU SE ACUMULEAZA');
const cuvinte = ['Madalina', 'Andrei', 'Ioana', 'Cristian', 'Elena', 'Vlad', 'Maria', 'Radu'];
const pastrateSerie: number[] = [];
let aAruncatSerie: string | null = null;
try {
  for (let i = 0; i < 24; i++) {
    build(cfg(cuvinte[i % cuvinte.length]));
    pastrateSerie.push(ultimulRaportArena()?.pastrate ?? -1);
  }
} catch (e: any) { aAruncatSerie = String(e?.message ?? e); }
check('24 de reconstructii consecutive fara eroare', aAruncatSerie === null, aAruncatSerie ?? '');
const minP = Math.min(...pastrateSerie), maxP = Math.max(...pastrateSerie);
check('numarul de obiecte pastrate ramane marginit', maxP - minP <= 4,
  `min ${minP}, max ${maxP}, serie [${pastrateSerie.slice(0, 6).join(', ')}...]`);
// Creșterea liniară e semnătura scurgerii: prima jumătate vs a doua.
const jum = pastrateSerie.length >> 1;
const medie = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
const m1 = medie(pastrateSerie.slice(0, jum)), m2 = medie(pastrateSerie.slice(jum));
check('nicio crestere intre prima si a doua jumatate a seriei', m2 - m1 <= 2,
  `medie ${m1.toFixed(1)} -> ${m2.toFixed(1)}`);

// ---------- 5. MEMO-CACHE-UL ROTUNJIRII ÎȘI PĂSTREAZĂ SOLIDELE ----------
// Arena nu are voie să ia solidele memorate: dacă le-ar lua, reconstrucția următoare ar
// folosi un handle mort — exact eroarea „table index is out of bounds".
console.log('\nMEMO-CACHE-UL ROTUNJIRII SUPRAVIETUIESTE');
{
  let aAruncat: string | null = null;
  let ms = 0;
  try {
    const t0 = performance.now();
    const r = build(cfg('Madalina'));    // aceeasi litera => rotunjirea vine din cache
    ms = performance.now() - t0;
    if (r.corpLitera.isDeleted() || !(r.corpLitera.volume() > 0)) aAruncat = 'rezultat mort';
  } catch (e: any) { aAruncat = String(e?.message ?? e); }
  check('reconstructia pe cache nu foloseste un handle mort', aAruncat === null, aAruncat ?? `${ms.toFixed(0)} ms`);
}

// ---------- 6. CURĂȚENIE ----------
elibereaza([r2.corpLitera, r2.corpScris]);

console.log(`\n${esecuri ? `${esecuri} ESECURI` : 'toate verificarile au trecut'}`);
/**
 * `process.exitCode`, NU `process.exit`.
 *
 * Dupa o operatie manifold, `process.exit` taie procesul cat timp WASM-ul inca se inchide, iar
 * libuv crapa pe Windows cu „Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)" si cod 127.
 * Suita raporta ESEC desi toate verificarile trecusera. Vezi regula din docs/design/.
 */
process.exitCode = esecuri ? 1 : 0;
