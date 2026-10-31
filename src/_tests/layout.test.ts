/**
 * TEST PERMANENT — AȘEZAREA PE PLACĂ LA EXPORT.
 *
 * Slicerul refuză fișierul dacă un obiect iese din placă. Aici verificăm PRIN COORDONATE:
 * margine 5 mm, 3 mm între piese, zero suprapuneri, trecere pe placă nouă când nu încap,
 * blocare când o piesă nu încape nici singură.
 *
 * Rulare:  npm run test:layout
 */
import ManifoldModule from 'manifold-3d';
import { layoutOnPlates, verificaInPlaca, type LayoutBody } from '../core/geometry/layout.js';

const wasm = await ManifoldModule();
wasm.setup();
const { Manifold } = wasm;

const MARGINE = 5, SPATIU = 3;
let fails = 0;
const check = (nume: string, ok: boolean, detaliu = '') => {
  console.log(`${ok ? '  OK  ' : '  EȘEC'} ${nume}${detaliu ? '  — ' + detaliu : ''}`);
  if (!ok) fails++;
};
/** corp de test: cutie w×d×h, plasată intenționat „aiurea" (coordonate negative, ca la generator) */
const cutie = (name: string, w: number, d: number, h = 10, grup?: string, dx = 0, dy = 0): LayoutBody =>
  ({ name, grup, manifold: Manifold.cube([w, d, h]).translate([-w / 2 - 40 + dx, -d / 2 - 30 + dy, 0]) });

const bb = (b: LayoutBody) => b.manifold.boundingBox();
const suprapun = (a: LayoutBody, b: LayoutBody) => {
  const A = bb(a), B = bb(b);
  const ox = Math.min(A.max[0], B.max[0]) - Math.max(A.min[0], B.min[0]);
  const oy = Math.min(A.max[1], B.max[1]) - Math.max(A.min[1], B.min[1]);
  return ox > 1e-6 && oy > 1e-6;
};
/** distanța liberă între două amprente (negativă = suprapunere) */
const distanta = (a: LayoutBody, b: LayoutBody) => {
  const A = bb(a), B = bb(b);
  const dx = Math.max(A.min[0] - B.max[0], B.min[0] - A.max[0]);
  const dy = Math.max(A.min[1] - B.max[1], B.min[1] - A.max[1]);
  return Math.max(dx, dy);
};

// ---- CAZ 1: cazul real (literă + scris + 2 corpuri de bază) pe placa 256×256 ----
console.log('\nCAZ 1 — A/Andrei + baza Teren pe placa 256×256');
const caz1 = [cutie('litera_A', 112, 130, 25), cutie('scris_Andrei', 96, 34, 4.5),
  cutie('baza_Teren_1_teren', 164, 229, 20, 'baza'), cutie('baza_Teren_2_linii', 160, 220, 1, 'baza', 2, 4)];
// relația dintre corpurile bazei ÎNAINTE de aranjare. Grupul poate fi rotit 90° pe Z, deci
// invariantul corect e DISTANȚA dintre centre, nu vectorul brut între colțuri.
const centru = (b: LayoutBody) => { const B = b.manifold.boundingBox(); return [(B.min[0] + B.max[0]) / 2, (B.min[1] + B.max[1]) / 2]; };
const dintreCentre = (a: LayoutBody, b: LayoutBody) => Math.hypot(centru(b)[0] - centru(a)[0], centru(b)[1] - centru(a)[1]);
const relInainte = dintreCentre(caz1[2], caz1[3]);
const r1 = layoutOnPlates(caz1, 256, 256, MARGINE, SPATIU);
check('nicio piesă prea mare', r1.preaMari.length === 0);
console.log(`  plăci necesare: ${r1.placi.length}`);
r1.placi.forEach((p, i) => {
  const v = verificaInPlaca(p, 256, 256);
  check(`placa ${i + 1}: toate în interior`, v.ok, v.iesite.join(', '));
  for (const b of p) {
    const B = bb(b);
    check(`  ${b.name} respectă marginea de ${MARGINE} mm`,
      B.min[0] >= MARGINE - 1e-6 && B.min[1] >= MARGINE - 1e-6 && B.max[0] <= 256 - MARGINE + 1e-6 && B.max[1] <= 256 - MARGINE + 1e-6,
      `X ${B.min[0].toFixed(1)}..${B.max[0].toFixed(1)}  Y ${B.min[1].toFixed(1)}..${B.max[1].toFixed(1)}`);
  }
  for (let a = 0; a < p.length; a++) for (let b = a + 1; b < p.length; b++) {
    if (p[a].grup && p[a].grup === p[b].grup) continue;   // același obiect fizic: suprapunerea e corectă
    check(`  ${p[a].name} ⟷ ${p[b].name} fără suprapunere, ≥${SPATIU} mm`,
      !suprapun(p[a], p[b]) && distanta(p[a], p[b]) >= SPATIU - 1e-6, `distanță ${distanta(p[a], p[b]).toFixed(2)} mm`);
  }
});
// corpurile bazei trebuie să rămână suprapuse, pe aceeași placă, cu aceeași relație
const t1 = r1.placi.flat().find((b) => b.name === 'baza_Teren_1_teren')!;
const t2 = r1.placi.flat().find((b) => b.name === 'baza_Teren_2_linii')!;
check('corpurile bazei pe aceeași placă', r1.placi.some((p) => p.includes(t1) && p.includes(t2)));
const relDupa = dintreCentre(t1, t2);
check('corpurile bazei păstrează relația (obiect multicolor intact)', Math.abs(relDupa - relInainte) < 1e-6,
  `distanță între centre ${relInainte.toFixed(3)} mm -> ${relDupa.toFixed(3)} mm`);
check('Z nemodificat (piesele rămân pe masă)', caz1.every((_, i) => true) && r1.placi.flat().every((b) => Math.abs(bb(b).min[2]) < 1e-6));

// ---- CAZ 2: nu încap toate -> mai multe plăci ----
console.log('\nCAZ 2 — 6 piese de 100×100 pe placa 180×180 (utile 170×170: 1/placă)');
const caz2 = Array.from({ length: 6 }, (_, i) => cutie(`p${i + 1}`, 100, 100));
const r2 = layoutOnPlates(caz2, 180, 180, MARGINE, SPATIU);
check('toate piesele așezate', r2.placi.flat().length === 6, `${r2.placi.flat().length}/6`);
check('6 plăci necesare', r2.placi.length === 6, `${r2.placi.length} plăci`);
check('fiecare placă verificată prin coordonate', r2.placi.every((p) => verificaInPlaca(p, 180, 180).ok));

// ---- CAZ 3: exact 2 pe rând, al treilea pe rând nou ----
console.log('\nCAZ 3 — 4 piese de 80×80 pe placa 180×180 (utile 170×170: 2×2)');
const caz3 = Array.from({ length: 4 }, (_, i) => cutie(`q${i + 1}`, 80, 80));
const r3 = layoutOnPlates(caz3, 180, 180, MARGINE, SPATIU);
check('o singură placă', r3.placi.length === 1, `${r3.placi.length}`);
check('toate în interior', verificaInPlaca(r3.placi[0], 180, 180).ok);
const p3 = r3.placi[0];
let ok3 = true;
for (let a = 0; a < p3.length; a++) for (let b = a + 1; b < p3.length; b++) if (suprapun(p3[a], p3[b]) || distanta(p3[a], p3[b]) < SPATIU - 1e-6) ok3 = false;
check('fără suprapuneri, ≥3 mm între toate', ok3);

// ---- CAZ 4: piesă prea mare -> raportată, exportul se blochează ----
console.log('\nCAZ 4 — piesă 300×50 pe placa 256×256');
const r4 = layoutOnPlates([cutie('urias', 300, 50), cutie('mic', 40, 40)], 256, 256, MARGINE, SPATIU);
check('„urias" raportat ca prea mare', r4.preaMari.length === 1 && r4.preaMari[0].name === 'urias',
  JSON.stringify(r4.preaMari));
check('dimensiunea raportată e cea reală', r4.preaMari[0]?.w === 300 && r4.preaMari[0]?.d === 50);

// ---- CAZ 5: piesă fix cât zona utilă (limita, nu trebuie respinsă) ----
console.log('\nCAZ 5 — piesă exact 246×246 pe placa 256×256');
const r5 = layoutOnPlates([cutie('lalimita', 246, 246)], 256, 256, MARGINE, SPATIU);
check('acceptată (nu e „prea mare")', r5.preaMari.length === 0);
check('așezată în interior', r5.placi.length === 1 && verificaInPlaca(r5.placi[0], 256, 256).ok);

console.log(fails ? `\n${fails} verificări EȘUATE\n` : '\nToate verificările au trecut.\n');
// process.exit() aici omoară procesul cât WASM-ul manifold încă are handle-uri deschise
// (assert libuv -> cod 127) și rupea lanțul `npm test`. Lăsăm procesul să se închidă singur.
process.exitCode = fails ? 1 : 0;
