/**
 * GENERATORUL BIBLIOTECII DE SIMBOLURI — scrie public/simboluri/manifest.json.
 *
 * Simbolurile sunt contururi PLATE, extrudate exact ca silueta unei litere. Ele se compun aici,
 * din primitive (cercuri, elipse, dreptunghiuri, poligoane) unite și scăzute cu `polygon-clipping`
 * — aceeași bibliotecă folosită de `textSolid` ca să dizolve suprapunerile dintre litere. Așa un
 * microfon e trei forme unite, nu 60 de puncte scrise de mână și imposibil de corectat.
 *
 * Rezultatul e DECLARATIV: aplicația citește doar manifestul, nu rulează niciodată scriptul ăsta.
 * Se rulează la mână, când se adaugă un simbol nou:  npm run simboluri
 *
 * CONVENȚII
 * · se desenează cu y în SUS, într-o casetă de vreo 100 de unități; scara finală vine din metrici
 * · `polygon-clipping` întoarce inelele exterioare în sens trigonometric și găurile invers, adică
 *   fix ce așteaptă `new CrossSection(inele, 'Positive')`
 * · METRICILE SE DECLARĂ, nu se derivă din desen: avans, înălțime și linie de bază, în MIIMI de
 *   înălțime de literă. Un simbol declarat o dată merge la orice mărime și la orice font.
 *
 * CARACTERUL care invocă simbolul trebuie să fie unul pe care fonturile NU îl au — altfel omul
 * n-ar mai putea scrie caracterul lui adevărat. Verificat pe cele 22 de fonturi din folder:
 * „&" e în toate 22 și „∞" în 15, deci ele NU intră în bibliotecă — se scriu direct și ies în
 * chiar desenul fontului ales, ceea ce e mai bine decât orice desen al nostru.
 */
import polygonClipping from 'polygon-clipping';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ---------- primitive, toate ca MultiPolygon ----------
const cerc = (cx, cy, r, n = 48) => [[Array.from({ length: n }, (_, i) => {
  const a = (2 * Math.PI * i) / n; return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
})]];
const elipsa = (cx, cy, rx, ry, rotDeg = 0, n = 48) => {
  const t = (rotDeg * Math.PI) / 180, cos = Math.cos(t), sin = Math.sin(t);
  return [[Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * i) / n, x = rx * Math.cos(a), y = ry * Math.sin(a);
    return [cx + x * cos - y * sin, cy + x * sin + y * cos];
  })]];
};
const drept = (x0, y0, x1, y1) => [[[[x0, y0], [x1, y0], [x1, y1], [x0, y1]]]];
const poli = (pts) => [[pts.map(([x, y]) => [x, y])]];
const uneste = (...g) => polygonClipping.union(g[0], ...g.slice(1));
const scade = (a, ...b) => polygonClipping.difference(a, ...b);
/** aceeași formă, repetată la N unghiuri în jurul originii */
const inRoata = (forma, n, faza = 0) => {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = faza + (2 * Math.PI * i) / n, cos = Math.cos(a), sin = Math.sin(a);
    out.push(forma.map((p) => p.map((r) => r.map(([x, y]) => [x * cos - y * sin, x * sin + y * cos]))));
  }
  return uneste(...out);
};

// ---------- desenele ----------
const inima = (() => {
  const pts = [];
  for (let i = 0; i < 72; i++) {
    const t = (2 * Math.PI * i) / 72;
    pts.push([16 * Math.sin(t) ** 3,
      13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)]);
  }
  return poli(pts.reverse());   // curba merge în sens orar; o întoarcem
})();

const stea = (colturi, rIn) => poli(Array.from({ length: colturi * 2 }, (_, i) => {
  const a = Math.PI / 2 + (Math.PI * i) / colturi, r = i % 2 === 0 ? 1 : rIn;
  return [r * Math.cos(a), r * Math.sin(a)];
}));

const casa = poli([[-0.5, -0.5], [0.5, -0.5], [0.5, 0.12], [0.62, 0.12], [0, 0.62], [-0.62, 0.12], [-0.5, 0.12]]);

/** cap de notă + codiță; `x` mută grupul, ca să se poată pune două alături */
const notaCap = (x, y = 0) => uneste(elipsa(x, y, 11, 8, 20), drept(x + 6.5, y, x + 10.5, y + 34));

const nota = uneste(
  notaCap(-8),
  // steagul: o pană care coboară din vârful codiței
  poli([[1.5, 34], [12, 27], [16, 16], [12, 20], [6, 24], [1.5, 24]]),
);

const noteDuble = uneste(
  notaCap(-24), notaCap(6),
  drept(-17.5, 27, 16.5, 34),   // bara care le leagă
);

// CAPSULA trebuie sa fie MULT mai lata decat corpul, altfel iese o lampa. Prima incercare avea
// bila de 15 pe un corp de 11 si se citea „acadea": diferenta de doar patru unitati nu se vede.
const microfon = uneste(
  cerc(0, 20, 16),                                    // capsula
  drept(-9, 2, 9, 7),                                 // inelul de sub ea
  poli([[-7, 6], [7, 6], [5, -16], [-5, -16]]),       // corpul, subțire și ușor conic
  uneste(elipsa(0, -20, 10, 4.5), drept(-10, -20, 10, -15)),  // talpa
);

const floare = scade(
  uneste(inRoata(elipsa(0, 15, 8, 11), 6), cerc(0, 0, 8)),
  cerc(0, 0, 4.5),                                   // ochiul florii, gaură adevărată
);

// foile se suprapun între ele și cu codița: trei cercuri care se ating tangent ar da trei piese
const trifoi = uneste(
  inRoata(cerc(0, 11, 10), 3, Math.PI / 2),
  poli([[-2, 4], [2, 4], [3.5, -26], [-1, -26]]),   // codița, urcată în foi
);

// FLUTURELE nu se poate face din patru elipse: oricât le-ai depărta, se ating pe diagonală și
// ies o pată. Aripa e UN SINGUR contur, cu crestătura dintre lobul de sus și cel de jos tăiată
// în el — abia atunci se vede că sunt două aripi, nu un ghem.
const aripa = [[2, 20], [12, 28], [24, 25], [27, 12], [18, 4], [9, 2],
  [17, -4], [21, -13], [15, -21], [6, -19], [2, -9]];
const fluture = uneste(
  elipsa(0, 2, 3.2, 21),                              // corpul, care face talia
  poli([...aripa].reverse()),                         // aripa dreaptă, în sens trigonometric
  poli(aripa.map(([x, y]) => [-x, y])),               // oglindită
);

const luna = scade(cerc(0, 0, 20), cerc(9, 6, 17));

// razele pornesc din DISC, nu de lângă el: la 14 pe un disc de 13 rămânea un milimetru de aer
const soare = uneste(cerc(0, 0, 13), inRoata(poli([[-4, 10], [4, 10], [0, 25]]), 8));

// LĂBUȚA: degetele ating perinița, nu plutesc lângă ea. Cinci bucăți separate ar fi corecte
// anatomic și greșite ca piesă — la conturul „fără" s-ar desprinde.
// Degetele ating perinița, dar doar cu vârful: la o suprapunere de opt unități se topeau în ea
// și lăbuța ieșea o pată. Un milimetru și jumătate ține piesa întreagă și lasă lobii să se vadă.
const labuta = uneste(
  elipsa(0, -10, 15, 12),
  elipsa(-12.5, 3, 5.5, 8, -25), elipsa(-5, 9, 5.5, 8.5), elipsa(5, 9, 5.5, 8.5), elipsa(12.5, 3, 5.5, 8, 25),
);

const coroana = uneste(
  poli([[-22, -14], [22, -14], [22, 2], [14, 16], [8, 0], [0, 14], [-8, 0], [-14, 16], [-22, 2]]),
  cerc(-14, 17, 4), cerc(0, 15, 4), cerc(14, 17, 4),
);

const cheie = uneste(
  scade(cerc(-16, 0, 12), cerc(-16, 0, 5.5)),
  drept(-8, -3.5, 24, 3.5),
  drept(14, -11, 18, -3), drept(21, -9, 24, -3),      // dinții
);

// în sens TRIGONOMETRIC: dat invers, `polygon-clipping` îl ia drept gaură și nu mai rămâne nimic
const avion = poli([
  [0, 26], [-4, 18], [-4, 4], [-26, -6], [-26, -12], [-4, -6], [-4, -16], [-10, -21], [-10, -25],
  [0, -22], [10, -25], [10, -21], [4, -16], [4, -6], [26, -12], [26, -6], [4, 4], [4, 18],
]);

const ancora = uneste(
  scade(cerc(0, 22, 8), cerc(0, 22, 4)),
  drept(-3, -22, 3, 18),
  drept(-14, 8, 14, 13),                              // traversa
  // brațele de jos: un inel gros, din care se păstrează doar jumătatea de jos
  scade(scade(cerc(0, -6, 20), cerc(0, -6, 14)), drept(-22, -6, 22, 20)),
  poli([[-22, -6], [-16, -6], [-19, -14]]), poli([[22, -6], [16, -6], [19, -14]]),
);

const cadou = uneste(
  drept(-22, -20, 22, 12),
  drept(-3, -20, 3, 18),                              // panglica verticală
  drept(-22, -2, 22, 4),                              // panglica orizontală
  scade(cerc(-8, 18, 7), cerc(-8, 18, 3)),            // bucla stângă
  scade(cerc(8, 18, 7), cerc(8, 18, 3)),
);

const fulger = poli([[4, 28], [-14, 2], [-2, 2], [-8, -28], [12, -2], [0, -2]]);

const cruce = uneste(drept(-5, -26, 5, 26), drept(-16, 6, 16, 16));

const cafea = uneste(
  poli([[-14, 14], [14, 14], [10, -12], [-10, -12]]), // ceașca
  scade(cerc(16, 4, 9), cerc(16, 4, 5)),              // toarta
  uneste(drept(-20, -18, 20, -13), elipsa(0, -13, 20, 3)), // farfuria
);

// ---------- manifestul ----------
//
// METRICILE, în miimi de înălțime de literă. Alese ca simbolul să stea în rând cu literele:
// înălțimea între 55% și 70% din capHeight (cât o minusculă rotundă), talpa aproape de linia de
// bază, iar avansul cu vreo 20% mai mare decât desenul, ca aerul din jur să nu vină din bbox.
const SIMBOLURI = [
  { id: 'inima', nume: 'Inimă', caracter: '♥', avans: 900, inaltime: 640, linieBaza: 20, geom: inima },
  { id: 'stea', nume: 'Stea', caracter: '★', avans: 880, inaltime: 660, linieBaza: 10, geom: stea(5, 0.382) },
  { id: 'casa', nume: 'Casă', caracter: '⌂', avans: 820, inaltime: 620, linieBaza: 0, geom: casa },
  { id: 'nota', nume: 'Notă muzicală', caracter: '♪', avans: 620, inaltime: 720, linieBaza: 0, geom: nota },
  { id: 'note', nume: 'Note duble', caracter: '♫', avans: 980, inaltime: 700, linieBaza: 0, geom: noteDuble },
  { id: 'microfon', nume: 'Microfon', caracter: '🎤', avans: 700, inaltime: 780, linieBaza: 0, geom: microfon },
  { id: 'floare', nume: 'Floare', caracter: '❀', avans: 900, inaltime: 640, linieBaza: 20, geom: floare },
  { id: 'trifoi', nume: 'Trifoi', caracter: '☘', avans: 800, inaltime: 700, linieBaza: 0, geom: trifoi },
  { id: 'fluture', nume: 'Fluture', caracter: '🦋', avans: 1000, inaltime: 620, linieBaza: 30, geom: fluture },
  { id: 'luna', nume: 'Lună', caracter: '☾', avans: 720, inaltime: 660, linieBaza: 20, geom: luna },
  { id: 'soare', nume: 'Soare', caracter: '☀', avans: 900, inaltime: 640, linieBaza: 30, geom: soare },
  { id: 'labuta', nume: 'Lăbuță', caracter: '🐾', avans: 880, inaltime: 620, linieBaza: 20, geom: labuta },
  { id: 'coroana', nume: 'Coroană', caracter: '♛', avans: 940, inaltime: 580, linieBaza: 40, geom: coroana },
  { id: 'cheie', nume: 'Cheie', caracter: '🔑', avans: 940, inaltime: 520, linieBaza: 60, geom: cheie },
  { id: 'avion', nume: 'Avion', caracter: '✈', avans: 940, inaltime: 700, linieBaza: 0, geom: avion },
  { id: 'ancora', nume: 'Ancoră', caracter: '⚓', avans: 840, inaltime: 760, linieBaza: 0, geom: ancora },
  { id: 'cadou', nume: 'Cadou', caracter: '🎁', avans: 900, inaltime: 700, linieBaza: 0, geom: cadou },
  { id: 'fulger', nume: 'Fulger', caracter: '⚡', avans: 660, inaltime: 740, linieBaza: 0, geom: fulger },
  { id: 'cruce', nume: 'Cruce', caracter: '✝', avans: 720, inaltime: 720, linieBaza: 0, geom: cruce },
  { id: 'cafea', nume: 'Cafea', caracter: '☕', avans: 940, inaltime: 560, linieBaza: 30, geom: cafea },
];

const r2 = (n) => Math.round(n * 100) / 100;
const arie = (p) => { let a = 0; for (let i = 0; i < p.length; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length]; a += x1 * y2 - x2 * y1; } return a / 2; };

const simboluri = SIMBOLURI.map((s) => {
  // polygon-clipping închide inelele (ultim = primul); scoatem duplicatul, ca la textSolid
  const inele = [];
  for (const poligon of s.geom) {
    for (const inel of poligon) {
      const p = inel.map(([x, y]) => [r2(x), r2(y)]);
      if (p.length >= 2) { const f = p[0], l = p[p.length - 1]; if (f[0] === l[0] && f[1] === l[1]) p.pop(); }
      if (p.length >= 3) inele.push(p);
    }
  }
  const gauri = inele.filter((p) => arie(p) < 0).length;
  const bucati = inele.length - gauri;
  if (bucati !== 1) console.warn(`  ⚠ ${s.id}: ${bucati} bucăți separate — piesa s-ar desprinde la conturul „fără"`);
  const { geom, ...rest } = s;
  return { ...rest, contur: inele, bucati, gauri };
});

mkdirSync(join(ROOT, 'public', 'simboluri'), { recursive: true });
writeFileSync(join(ROOT, 'public', 'simboluri', 'manifest.json'),
  JSON.stringify({ versiune: 2, simboluri: simboluri.map(({ bucati, gauri, ...s }) => s) }, null, 1));

console.log(`\n${simboluri.length} simboluri scrise în public/simboluri/manifest.json\n`);
for (const s of simboluri) {
  console.log(`  ${s.caracter} ${s.nume.padEnd(16)} ${String(s.contur.reduce((n, r) => n + r.length, 0)).padStart(4)} puncte · ${s.bucati} bucată${s.gauri ? ` · ${s.gauri} găuri` : ''}`);
}
console.log();
