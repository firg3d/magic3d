/**
 * TEST PERMANENT — BRELOCURI ARTICULATE (litere-bloc + balama print-in-place ochi/ax).
 *
 * Verifica invariantii de produs (lant articulat printat pe loc, dupa modelul OpenSCAD):
 *   · N litere -> N segmente (+ N litere in relief la modul relief);
 *   · fiecare segment e MANIFOLD valid si o SINGURA bucata (ochiul e prins de urechi);
 *   · segmentele vecine NU se ating (jocul de print e respectat -> balamaua se misca);
 *   · nimic sub masa si nimic peste inaltimea segmentului (se printeaza culcat);
 *   · literele in relief stau deasupra segmentului;
 *   · modul gravat: litera scazuta din segment, fara corp separat;
 *   · caracterele fara glifa sunt raportate.
 *
 * Rulare:  npm run test:articulat
 */
// @ts-ignore
import opentype from 'opentype.js';
import ManifoldModule from 'manifold-3d';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { instrumenteazaArena, inArena } from '../core/geometry/arena.js';
import { configureManifold as cfgText } from '../core/geometry/textSolid.js';
import { configureManifold, buildArticulat, ALTO_MIN } from '../apps/articulat/articulat.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const M: any = await ManifoldModule(); M.setup(); cfgText(M); configureManifold(M);
instrumenteazaArena(M);

let esecuri = 0;
const check = (nume: string, ok: boolean, det = '') => {
  console.log(`${ok ? '  OK  ' : '  ESEC'} ${nume}${det ? '  - ' + det : ''}`);
  if (!ok) esecuri++;
};
const font = opentype.loadSync(join(ROOT, 'fonts', 'Baloo2-Regular.ttf'));
const baza = (over: any = {}): any => ({
  text: 'Ava', font, inaltimeLitera: 8, alturaLitera: 1, alto: 6, ancho: 12, largo: 15,
  linkPrim: true, linkUltim: false, culoareBaza: '#1D7400', culoareLitera: '#ffffff', ...over,
});

console.log('\nFIECARE SEGMENT E O PIESA VALIDA, DINTR-O BUCATA');
for (const text of ['Ava', 'Ethan', 'CLAUDIU']) {
  inArena(() => {
    const r = buildArticulat(baza({ text }));
    const n = [...text].filter((c) => c !== ' ').length;
    check(`„${text}": ${n} segmente`, r.blocuri.length === n, `${r.blocuri.length}`);
    check(`„${text}": ${n} litere in relief`, r.litere.length === n, `${r.litere.length}`);
    let valide = true, unice = true, det = '';
    for (const p of r.blocuri) {
      if (String(p.status()) !== 'NoError') { valide = false; det = String(p.status()); }
      const parti = p.decompose(); const k = parti.length; for (const q of parti) q.delete();
      if (k !== 1) { unice = false; det = `bucati=${k}`; }
    }
    check(`„${text}": toate segmentele manifold valid`, valide, det);
    check(`„${text}": fiecare segment o singura bucata (ochiul e prins)`, unice, det);
  }, () => []);
}

console.log('\nBALAMAUA SE MISCA (print-in-place)');
inArena(() => {
  const r = buildArticulat(baza({ text: 'Ethan' }));
  check('segmentele vecine NU se lipesc (joc respectat)', r.diagnostice.seLipesc === false);
  check('nimic sub masa (se printeaza culcat)', r.diagnostice.subMasa === false);
  check('4 balamale pentru 5 litere', r.diagnostice.balamale === 4, `${r.diagnostice.balamale}`);
}, () => []);

console.log('\nSE PRINTEAZA CULCAT, LITERA DEASUPRA SEGMENTULUI');
inArena(() => {
  const alto = 6, altura = 1;
  const r = buildArticulat(baza({ text: 'Ava', alto, alturaLitera: altura }));
  let ok = true, det = '';
  for (const p of r.blocuri) { const b = p.boundingBox(); if (b.min[2] < -0.01 || b.max[2] > alto + 0.01) { ok = false; det = `z[${b.min[2].toFixed(2)},${b.max[2].toFixed(2)}]`; } }
  check('segmentele + balamalele stau in inaltimea segmentului (z in [0,alto])', ok, det);
  let okL = true, detL = '';
  for (const l of r.litere) { const b = l.boundingBox(); if (b.min[2] < alto - 0.02 || b.max[2] > alto + altura + 0.02) { okL = false; detL = `z[${b.min[2].toFixed(2)},${b.max[2].toFixed(2)}]`; } }
  check('literele in relief stau deasupra segmentului (z in [alto, alto+relief])', okL, detL);
}, () => []);

console.log('\nMOD GRAVAT (litera scazuta, o culoare)');
inArena(() => {
  const r = buildArticulat(baza({ text: 'Ava', alturaLitera: -1 }));
  check('gravat: niciun corp de litera separat', r.litere.length === 0, `${r.litere.length}`);
  check('gravat: diagnostic marcat', r.diagnostice.gravat === true);
  let ok = true;
  for (const p of r.blocuri) { if (String(p.status()) !== 'NoError') ok = false; }
  check('gravat: segmentele raman manifold valid', ok);
}, () => []);

console.log('\nOPTIUNILE DE BALAMA (link primul/ultimul)');
inArena(() => {
  // fara link pe capete: primul n-are ax stang, ultimul n-are ochi drept -> tot o piesa/segment
  const r = buildArticulat(baza({ text: 'Ana', linkPrim: false, linkUltim: false }));
  let unice = true; for (const p of r.blocuri) { const q = p.decompose(); if (q.length !== 1) unice = false; for (const x of q) x.delete(); }
  check('fara link pe capete: fiecare segment tot o bucata', unice);
  check('nu se lipesc', r.diagnostice.seLipesc === false);
}, () => []);

console.log('\nINTEGRITATE GLIFE');
inArena(() => {
  // '好' (CJK) nu exista intr-un font latin -> raportat ca glifa lipsa, litera sarita
  const r = buildArticulat(baza({ text: 'A好B' }));
  check('caracter fara glifa raportat', r.diagnostice.glifeLipsa.length > 0, r.diagnostice.glifeLipsa.join(''));
}, () => []);

console.log(`\nALTO_MIN = ${ALTO_MIN} mm`);
console.log(`\n${esecuri ? `${esecuri} ESECURI` : 'toate verificarile au trecut'}`);
/**
 * `process.exitCode`, NU `process.exit`.
 *
 * Dupa o operatie manifold, `process.exit` taie procesul cat timp WASM-ul inca se inchide, iar
 * libuv crapa pe Windows cu „Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)" si cod 127.
 * Suita raporta ESEC desi toate verificarile trecusera. Vezi regula din docs/design/.
 */
process.exitCode = esecuri ? 1 : 0;
