/**
 * TEST PERMANENT — BUZUNARELE NU CREEAZĂ GOLURI ÎNCHISE.
 *
 * Clasa de defect pe care o prinde e INVIZIBILĂ: nu se vede în viewport, nu apare în
 * statistici, nu strică niciun volum raportat. Ajunge direct la print.
 *
 * Bugul concret care a motivat testul: buzunarele se tăiau de la un PLAN UNIC, fixat la
 * fundul scobiturii din chenar (`faceZ`). Cutter-ul ocupa intervalul [faceZ − adâncime,
 * faceZ + 0.05]. Sub scobitură asta e un buzunar deschis, corect. Dar pe CHENAR, care
 * urcă încă 3 mm peste `faceZ`, același interval e complet îngropat: scobea un strat de
 * material sub un capac intact. Litera „M" cu scrisul „Madalina" ieșea cu 22 de cavități
 * sigilate, cu tavane nesusținute peste ele, iar inlay-ul nu avea locaș pe porțiunea de
 * chenar și rămânea suspendat. Nimic din toate astea nu se vedea.
 *
 * Reparat prin construcția cu coajă: `coajă = literă \ (literă coborâtă cu d)`, apoi
 * `buzunar = coajă ∩ prisma siluetei`. Stratul urmează suprafața locală, deci iese
 * întotdeauna la suprafață.
 *
 * DOUĂ VERIFICĂRI, complementare:
 *
 *   A. GENUS NESCHIMBAT de buzunar. Nu „genus === 0": litera „A" are o gaură străpunsă,
 *      deci genus 1 în mod legitim. Invariantul corect e că tăierea unui buzunar DESCHIS
 *      nu schimbă topologia. Pe bugul vechi: 0 -> 22.
 *
 *   B. BUZUNARUL SPARGE SUPRAFAȚA. Genus-ul prinde golul închis, dar nu prinde cazul în
 *      care buzunarul pur și simplu n-ar ajunge la chenar. Deci se verifică direct și că
 *      materialul de deasupra planului dispare acolo unde buzunarul traversează chenarul —
 *      adică inlay-ul chiar are unde să intre.
 *
 * Acoperă toate obiectele care primesc buzunar: literă (scris), literă (tematici) și bază.
 *
 * Rulare:  npm run test:goluri
 */
// @ts-ignore — opentype.js nu are declarații de tip (ca în restul proiectului)
import opentype from 'opentype.js';
import ManifoldModule from 'manifold-3d';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { threeMFToManifold } from '../core/assets/threemf-load.js';
import { textSolid, configureManifold as cfgText } from '../core/geometry/textSolid.js';
import { configureManifold as cfgAsm, buildAssembly, orientForPrint } from '../apps/litere/assembly.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OVERHANG = 0.05;

const M: any = await ManifoldModule();
M.setup(); cfgText(M); cfgAsm(M);
const { Manifold } = M;

let esecuri = 0;
const check = (nume: string, ok: boolean, detaliu = '') => {
  console.log(`${ok ? '  OK  ' : '  EȘEC'} ${nume}${detaliu ? '  — ' + detaliu : ''}`);
  if (!ok) esecuri++;
};

const fontL = opentype.loadSync(join(ROOT, 'fonts', 'AlexBrush-Regular.ttf'));
const fontS = opentype.loadSync(join(ROOT, 'fonts', 'Pacifico-Regular.ttf'));
const fontB = opentype.loadSync(join(ROOT, 'fonts', 'Baloo2-Regular.ttf'));

/** config de referință: chenar activ, scris în locaș care traversează și rama */
const baza = (over: any = {}): any => ({
  litera: 'M', fontLitera: fontL, inaltimeLitera: 120, grosimeLitera: 25, culoareLitera: '#889EC8',
  scris: 'Madalina', fontScris: fontS, inaltimeScris: 40, reliefScris: 2.5, culoareScris: '#FFFFFF',
  scrisOffX: 0.84, scrisOffY: -35.2, rotatieScris: 0, scrisRotX: 0, scrisRotY: 0,
  scrisPozitieZ: -1.04, modScris: 'locas', grosimeScris: 4.5, jocInsertie: 0.2,
  chenarActiv: true, latimeChenar: 3, adancimeChenar: 3, razaMuchie: 1.2, taiereBaza: 2,
  tematici: [], baza: null, ...over,
});

/** prismă pe toată înălțimea, dintr-o siluetă 2D */
const prisma = (sil: any, ref: any) => {
  const b = ref.boundingBox();
  return Manifold.extrude(sil, (b.max[2] - b.min[2]) + 2 * OVERHANG).translate([0, 0, b.min[2] - OVERHANG]);
};
/** volumul de material aflat DEASUPRA cotei z, în coloana siluetei */
const materialPeste = (solid: any, sil: any, z: number) => {
  const BIG = 4000;
  const c = solid.boundingBox();
  return solid.intersect(prisma(sil, solid)).intersect(
    Manifold.cube([BIG, BIG, BIG], true).translate(
      [(c.min[0] + c.max[0]) / 2, (c.min[1] + c.max[1]) / 2, z + BIG / 2])).volume();
};

// ---------- 0. PIESA INTRĂ ÎN LOCAȘ — verificarea care contează cel mai mult ----------
// Testul decisiv, și cel care lipsea. Toate celelalte verifică proprietăți ale literei;
// asta verifică singurul lucru care contează la montaj: că piesa de inlay și litera NU ocupă
// același spațiu. Dacă se suprapun, piesa nu intră, oricât de frumos ar arăta buzunarul.
//
// A prins două reparații greșite, ambele care păreau corecte pe hărți de cote:
//   · cutter oprit la `faceZ + OVERHANG`: chenarul rămâne capac -> coliziune 673 mm³
//   · buzunar cu adâncime locală („coajă"): fundul urmează suprafața, dar piesa e PLATĂ,
//     deci se lovește de pragul de pe chenar -> aceeași coliziune, 673 mm³
// Corect: fundul buzunarului e plat, la fața inferioară a piesei, iar cutter-ul străpunge
// tot materialul de deasupra. Coliziune 0.
console.log('\nPIESA DE INLAY INTRĂ ÎN LOCAȘ');
for (const [nume, over] of [
  ['A / Baloo 2 / „Andrei" (implicit)', { litera: 'A', fontLitera: fontB, scris: 'Andrei' }],
  ['M / Alex Brush / „Madalina"', {}],
  ['scris mai adânc, −2.5 mm', { scrisPozitieZ: -2.5 }],
  ['chenar adânc, 5 mm', { adancimeChenar: 5 }],
  ['fără chenar (control)', { chenarActiv: false }],
] as [string, any][]) {
  const r = buildAssembly(baza(over));
  const v = r.corpLitera.intersect(r.corpScris).volume();
  check(`${nume}: coliziune inlay ↔ literă`, v < 1, `${v.toFixed(1)} mm³`);
}

// ---------- 0b. SCRIS ÎNCLINAT — exportul nu trebuie să refuze montajul ----------
// Orice înclinare (scrisRotX / scrisRotY) făcea ca buzunarul să se prăbușească: se tăia din
// silueta părții îngropate, iar o piesă înclinată intră în material doar pe o margine.
// Măsurat pe „V"/Cinzel Decorative cu „Vladimir": aria buzunarului 2200 -> 136 mm² la 10°,
// iar exportul se oprea cu „NU intră în buzunar, 410 mm² în afara conturului".
console.log('\nSCRIS ÎNCLINAT — EXPORTUL NU REFUZĂ MONTAJUL');
for (const [nume, over] of [
  ['drept', {}],
  ['rotit în plan 45°', { rotatieScris: -45 }],
  ['înclinat X 10°', { rotatieScris: -45, scrisRotX: 10 }],
  ['înclinat Y 15°', { rotatieScris: -45, scrisRotY: 15 }],
  ['înclinat X 12° + Y 12°', { rotatieScris: -45, scrisRotX: 12, scrisRotY: 12 }],
] as [string, any][]) {
  const r = buildAssembly(baza(over));
  let ok = true, det = '';
  try {
    orientForPrint('litera', r.corpLitera, [{ name: 'scris', manifold: r.corpScris, isInlay: true,
      pocketSil: r.pocketSils['scris'], solidMontaj: r.solideMontaj['scris'] }], 0.2);
  } catch (e: any) { ok = false; det = String(e?.message ?? e).slice(0, 60); }
  check(`scris ${nume}: exportul acceptă montajul`, ok, det);
}

// ---------- A. LITERA — buzunarul scrisului ----------
console.log('\nLITERA — BUZUNARUL SCRISULUI');
{
  const fara = buildAssembly(baza({ scris: '' }));
  const cu = buildAssembly(baza());

  const gFara = fara.corpLitera.genus(), gCu = cu.corpLitera.genus();
  check('genus neschimbat de buzunar', gFara === gCu, `fără buzunar ${gFara} · cu buzunar ${gCu}`);

  // B — buzunarul sparge fața chenarului acolo unde îl traversează
  const recessSil = textSolid(fontL, 'M', 120, 25, {}).project();
  const chenarZone = recessSil.offset(3, 'Round').subtract(recessSil);
  const faceZ = 25 - 3;
  const pocketSil = cu.pocketSils['scris'];
  const peChenar = pocketSil.intersect(chenarZone);
  const aria = peChenar.area();
  check('  scrisul chiar traversează chenarul (precondiție)', aria > 10, `${aria.toFixed(1)} mm²`);
  if (aria > 10) {
    const scazut = materialPeste(fara.corpLitera, peChenar, faceZ + OVERHANG)
      - materialPeste(cu.corpLitera, peChenar, faceZ + OVERHANG);
    const asteptat = aria * 1.04;
    check('  buzunarul sparge fața chenarului, nu sapă pe sub ea',
      scazut > asteptat * 0.5, `${scazut.toFixed(0)} din ~${asteptat.toFixed(0)} mm³ așteptați`);
  }
}

// ---------- litera cu gaură străpunsă: genus legitim ≠ 0, testul nu dă fals pozitiv ----------
console.log('\nLITERA „A" — TOPOLOGIE LEGITIM NENULĂ');
{
  const fara = buildAssembly(baza({ litera: 'A', scris: '' }));
  const cu = buildAssembly(baza({ litera: 'A' }));
  const gFara = fara.corpLitera.genus(), gCu = cu.corpLitera.genus();
  check('genus neschimbat de buzunar', gFara === gCu, `fără buzunar ${gFara} · cu buzunar ${gCu}`);
}

// ---------- B. LITERA — buzunarele tematicilor (aceeași funcție, același risc) ----------
console.log('\nLITERA — BUZUNARELE TEMATICILOR');
{
  const f = join(ROOT, 'public', 'tematici', 'Q trefla.3mf');
  if (!existsSync(f)) {
    console.log('  (sărit: Q trefla.3mf lipsește)');
  } else {
    const b = readFileSync(f);
    const r: any = await threeMFToManifold(M, b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
    if (!r.ok) { check('Q trefla se încarcă', false, r.motiv); }
    else {
      const sc = 45 / (Math.max(...r.data.dim) || 1);
      const tem = r.data.manifold.scale([sc, sc, sc]);
      console.log(`  (genus al modelului sursă, ca referință: ${tem.genus()})`);
      const cfg = (over: any) => baza({ scris: '', tematici: [{
        id: 't1', nume: 'trefla', manifold: tem, offX: 0, offY: 0,
        rotX: 0, rotY: 0, rotZ: 0, pozitieZ: -1.5, culoare: '#888888', ...over }] });
      const fara = buildAssembly(baza({ scris: '' }));
      const cu = buildAssembly(cfg({}));
      const gFara = fara.corpLitera.genus(), gCu = cu.corpLitera.genus();
      check('genus al literei neschimbat de buzunarul tematicii', gFara === gCu,
        `fără buzunar ${gFara} · cu buzunar ${gCu}`);

      const recessSil = textSolid(fontL, 'M', 120, 25, {}).project();
      const chenarZone = recessSil.offset(3, 'Round').subtract(recessSil);
      const pocketSil = cu.pocketSils['t1'];
      const peChenar = pocketSil ? pocketSil.intersect(chenarZone) : null;
      const aria = peChenar ? peChenar.area() : 0;
      check('  tematica chiar traversează chenarul (precondiție)', aria > 10, `${aria.toFixed(1)} mm²`);
      if (aria > 10) {
        const scazut = materialPeste(fara.corpLitera, peChenar, 22 + OVERHANG)
          - materialPeste(cu.corpLitera, peChenar, 22 + OVERHANG);
        check('  buzunarul sparge fața chenarului, nu sapă pe sub ea',
          scazut > aria * 1.5 * 0.5, `${scazut.toFixed(0)} din ~${(aria * 1.5).toFixed(0)} mm³ așteptați`);
      }
    }
  }
}

// ---------- C. BAZA — buzunarul de înfigere ----------
// Planul de tăiere e fața de SUS a bazei (cota maximă), deci buzunarul iese întotdeauna la
// suprafață și nu poate crea capac. Se verifică oricum, inclusiv pe o bază cu relief puternic
// („nor", 9.16 mm relief central), unde adâncimea locală de înfigere variază.
console.log('\nBAZA — BUZUNARUL DE ÎNFIGERE');
for (const nume of ['inima', 'disc vinyl', 'nor']) {
  const f = join(ROOT, 'public', 'base', `${nume}.3mf`);
  if (!existsSync(f)) { console.log(`  (sărit: ${nume}.3mf lipsește)`); continue; }
  const b = readFileSync(f);
  const r: any = await threeMFToManifold(M, b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  if (!r.ok) { check(nume, false, r.motiv); continue; }
  const sc = 200 / (Math.max(...r.data.dim) || 1);
  const bm = r.data.manifold.scale([sc, sc, sc]);
  const gSursa = bm.genus();
  const rez = buildAssembly(baza({ baza: {
    manifold: bm, corpuri: [], adancimeInfigere: 3, jocInfigere: 0.2,
    pozitieLiteraX: 0, pozitieLiteraZ: 0, rotatieLitera: 0 } }));
  const gDupa = rez.corpBaza.genus();
  check(`${nume}: genus neschimbat de buzunar`, gSursa === gDupa,
    `sursă ${gSursa} · cu buzunar ${gDupa}`);
  // DEFECT CUNOSCUT, semnalat dar netratat aici: pe bazele cu relief puternic, litera se
  // așază la cota APEXULUI, iar buzunarul se taie de la același plan unic. Dacă apexul nu
  // cade sub talpa literei, nu se taie nimic și litera plutește — în timp ce `contactProcent`
  // raportează 100%, fiindcă e o suprapunere de siluete 2D, fără Z. Se închide odată cu
  // metrica de contact 3D; până atunci rămâne avertisment, nu eșec.
  // LITERA TREBUIE SĂ INTRE ÎN BAZĂ, inclusiv înclinată. Litera se rotește pe toate trei axele,
  // deci talpa nu mai e paralelă cu fața bazei; locașul rămâne o prismă verticală. Piesa are voie
  // să se sprijine pe mai puțin, dar NU are voie să se suprapună cu materialul bazei.
  for (const [eticheta, rx, rz] of [['dreaptă', 0, 0], ['înclinată 20°/15°', 20, 15]] as [string, number, number][]) {
    const r2 = buildAssembly(baza({ baza: {
      manifold: bm, corpuri: [], adancimeInfigere: 3, jocInfigere: 0.2,
      pozitieLiteraX: 0, pozitieLiteraZ: 0, rotatieLitera: 0, rotatieLiteraX: rx, rotatieLiteraZ: rz } }));
    const col = r2.corpLitera.intersect(r2.corpBaza).volume();
    check(`  ${nume}, literă ${eticheta}: coliziune literă ↔ bază`, col < 1, `${col.toFixed(1)} mm³`);
  }

  // CONTACTUL RAPORTAT TREBUIE SĂ CORESPUNDĂ REALITĂȚII.
  // Era doar semnalare, acum e aserțiune dură. Metrica veche intersecta două siluete 2D și
  // raporta 100% pe baza „nor" în timp ce locașul nu tăia nimic și litera plutea complet.
  // Invariantul: dacă nu s-a scos material din bază, nu există contact — și invers.
  const taiat = bm.volume() - rez.corpBaza.volume();
  const c = rez.diagnostice.baza!.contactProcent;
  check(`  ${nume}: contactul raportat corespunde realității`, (taiat > 1) === (c >= 40),
    `locaș tăiat ${taiat.toFixed(0)} mm³ · contact raportat ${c}%`);
  // „nor" e cazul de referință cerut: relief central 9.16 mm, litera nu ajunge la material.
  check(`    ${nume}: contact ${nume === 'nor' ? 'SUB' : 'PESTE'} pragul de avertizare de 40%`,
    nume === 'nor' ? c < 40 : c >= 40, `${c}%`);
}
console.log(esecuri ? `\n${esecuri} verificări EȘUATE — buzunarele lasă goluri închise\n`
                    : '\n✅ Niciun buzunar nu lasă goluri închise; toate sparg suprafața.\n');
process.exitCode = esecuri ? 1 : 0;
