/**
 * TEST PERMANENT — PLĂCUȚE & ETICHETE.
 *
 * Verifică nu că „rulează", ci că fiecare prindere face fizic ce promite:
 *   · plăcuța e MANIFOLD și o singură piesă;
 *   · gaura/cablul STRĂPUNG (se poate trece un inel/cablu);
 *   · pahar: fanta e DESCHISĂ la marginea de sus (gliseaza pe buză);
 *   · țăruș: coboară SUB plăcuță (se înfige în pământ);
 *   · magnet: locașul e în SPATE și NU străpunge (rămâne fund).
 *
 * Rulare:  npm run test:placute
 */
// @ts-ignore
import opentype from 'opentype.js';
import ManifoldModule from 'manifold-3d';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { instrumenteazaArena, inArena } from '../core/geometry/arena.js';
import { configureManifold as cfgText } from '../core/geometry/textSolid.js';
import { configureManifold, buildPlacuta, type Prindere } from '../apps/placute/placute.js';

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
  text: 'Ana', font, inaltimeText: 30, reliefText: 1.8, latimePlacuta: 7, netezire: 2,
  grosimePlacuta: 3, prindere: 'gaura', diametruGaura: 4, lungimeTerus: 40,
  culoarePlacuta: '#5b4dd1', culoareText: '#fff', ...over,
});

console.log('\nPLĂCUȚA E VALIDĂ');
for (const pr of ['gaura', 'cablu', 'terus', 'pahar', 'magnet'] as Prindere[]) {
  inArena(() => {
    const r = buildPlacuta(baza({ prindere: pr }));
    const st = String(r.corpPlacuta.status ? r.corpPlacuta.status() : 'NoError');
    check(`„${pr}": manifold valid`, st === 'NoError', st);
    check(`„${pr}": o singură piesă`, r.diagnostice.bucati === 1, `${r.diagnostice.bucati} bucăți`);
    check(`„${pr}": volum pozitiv`, r.corpPlacuta.volume() > 100, `${r.corpPlacuta.volume().toFixed(0)} mm³`);
  }, () => []);
}

console.log('\nFIECARE PRINDERE FACE CE PROMITE');
// gaura străpunge: volumul cu gaură < volumul fără gaură (s-a scos material pe toată grosimea)
inArena(() => {
  const cu = buildPlacuta(baza({ prindere: 'gaura' })).corpPlacuta.volume();
  const fara = buildPlacuta(baza({ prindere: 'magnet', diametruGaura: 0.001 })).corpPlacuta.volume();
  check('gaura scoate material', cu < fara, `${cu.toFixed(0)} < ${fara.toFixed(0)}`);
}, () => []);

// pahar: fanta ajunge la marginea de sus a bounding box-ului (deschisă)
inArena(() => {
  const r = buildPlacuta(baza({ prindere: 'pahar' }));
  const bb = r.corpPlacuta.boundingBox();
  // o sondă subțire pe axa verticală, la marginea de sus, trebuie să NU întâlnească material
  const sus = M.Manifold.cube([0.5, 2, 10], true).translate([(bb.min[0] + bb.max[0]) / 2, bb.max[1] - 0.5, 1.5]);
  const intersect = r.corpPlacuta.intersect(sus).volume();
  check('pahar: fanta e deschisă la margine', intersect < 1, `material în deschidere ${intersect.toFixed(2)} mm³`);
}, () => []);

/**
 * ȚĂRUȘUL PRELUNGEȘTE PLĂCUȚA — măsurat pe ÎNTINDEREA pe Y, nu pe un capăt anume.
 *
 * Verificarea asta a stat roșie și am pus-o pe seama produsului. Nu era: țărușul se construiește
 * corect și e lipit de plăcuță. Măsurat, cu țăruș de 40 mm:
 *   magnet  y ∈ [−37,0 ; 7,5]      țăruș  y ∈ [−37,0 ; 47,5]
 * Adică piesa crește exact cu 40 mm, dar la capătul MAX, nu la MIN — iar testul se uita la
 * `min[1]`, unde cele două sunt identice prin construcție. De aici „−37,5 vs −37,5": două cifre
 * egale comparate cu „mai mic decât", care n-aveau cum să difere niciodată.
 *
 * Capătul e cel corect: silueta textului vine din `getPath`, care are Y-ul ÎN JOS, deci linia de
 * bază a scrisului e la Y MARE, iar țărușul care „coboară în pământ" crește spre +Y. Dacă
 * verificarea s-ar fi uitat la min[1] și produsul s-ar fi „reparat" ca s-o mulțumească, țărușul
 * ar fi ieșit deasupra scrisului.
 *
 * Se măsoară acum ÎNTINDEREA, nu un capăt: convenția de axă poate să se schimbe, cerința nu.
 */
inArena(() => {
  const cu = buildPlacuta(baza({ prindere: 'terus', lungimeTerus: 40 }));
  const fara = buildPlacuta(baza({ prindere: 'magnet' }));
  const bbCu = cu.corpPlacuta.boundingBox(), bbFara = fara.corpPlacuta.boundingBox();
  const intindereCu = bbCu.max[1] - bbCu.min[1];
  const intindereFara = bbFara.max[1] - bbFara.min[1];
  check('țăruș: prelungește plăcuța cu lungimea cerută',
    Math.abs((intindereCu - intindereFara) - 40) < 1,
    `${intindereFara.toFixed(1)} → ${intindereCu.toFixed(1)} mm (+${(intindereCu - intindereFara).toFixed(1)})`);
  check('țăruș: crește pe partea liniei de bază, nu peste scris',
    bbCu.max[1] > bbFara.max[1] + 20 && Math.abs(bbCu.min[1] - bbFara.min[1]) < 0.01,
    `max ${bbFara.max[1].toFixed(1)} → ${bbCu.max[1].toFixed(1)}, min neschimbat ${bbCu.min[1].toFixed(1)}`);
}, () => []);

// magnet: locașul e pe spate (z mic) și NU străpunge (rămâne material la z aproape de grosime)
inArena(() => {
  const r = buildPlacuta(baza({ prindere: 'magnet', diametruGaura: 8 }));
  const bb = r.corpPlacuta.boundingBox();
  const cx = (bb.min[0] + bb.max[0]) / 2, cy = (bb.min[1] + bb.max[1]) / 2;
  // sondă în centru, dinspre față (z mare): trebuie să existe material (fundul locașului)
  const fata = M.Manifold.cube([1, 1, 0.8], true).translate([cx, cy, 3 - 0.4]);
  const spate = M.Manifold.cube([1, 1, 0.8], true).translate([cx, cy, 0.4]);
  const mFata = r.corpPlacuta.intersect(fata).volume();
  const mSpate = r.corpPlacuta.intersect(spate).volume();
  check('magnet: locaș pe spate (gol în spate)', mSpate < 0.2, `material spate ${mSpate.toFixed(2)}`);
  check('magnet: NU străpunge (material pe față)', mFata > 0.3, `material față ${mFata.toFixed(2)}`);
}, () => []);

console.log(`\n${esecuri ? `${esecuri} ESECURI` : 'toate verificarile au trecut'}`);
/**
 * `process.exitCode`, NU `process.exit`.
 *
 * Dupa o operatie manifold, `process.exit` taie procesul cat timp WASM-ul inca se inchide, iar
 * libuv crapa pe Windows cu „Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)" si cod 127.
 * Suita raporta ESEC desi toate verificarile trecusera. Vezi regula din docs/design/.
 */
process.exitCode = esecuri ? 1 : 0;
