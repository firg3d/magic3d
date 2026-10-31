/**
 * TEST PERMANENT — PRIMITIVELE DE CARCASĂ (HUS.1, B.6).
 *
 * Sunt funcții PURE: se testează cu numere, fără manifold, fără fonturi, fără fișiere. De-aia
 * suita asta rulează în milisecunde și poate fi rulată la fiecare salvare.
 *
 * Verificările folosesc COTELE REALE ale piloților acolo unde ele sunt chiar motivul pentru care
 * primitiva există — marginea strânsă de la iPhone 15 Pro nu e un caz inventat, e cel care a
 * cerut regula.
 *
 * Rulare:  npm run test:primitive
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ManifoldModule from 'manifold-3d';
import { dreptunghiRotunjit, marginiDecupaj, conturDecupaj, inaltimeMaximaBuza,
  adancimeSubtiere, pozitiiFlexColt, unesteDecupaje } from '../core/primitive/index.js';
import { configureManifold as configCioburi, curataCioburi } from '../core/primitive/cioburi.js';
import { configureManifold as configBoolean, uneste, AtingereCoplanara,
  SUPRAPUNERE } from '../core/primitive/boolean.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * Manifold se porneste AICI, nu in blocul de la sfarsit.
 *
 * Pornit tarziu, procesul iesea cu „Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)" din
 * libuv si cod 127 — adica suita raporta ESEC desi toate verificarile trecusera. Celelalte suite
 * care folosesc manifold il pornesc de la inceput si ies curat; asta e singura diferenta.
 */
const mod = await ManifoldModule();
mod.setup();
configBoolean(mod);
configCioburi(mod);
const { Manifold } = mod;

const telefon = (id: string) =>
  JSON.parse(readFileSync(join(ROOT, 'date', 'telefoane', 'apple', `${id}.json`), 'utf8'));

let esecuri = 0;
const check = (nume: string, ok: boolean, detaliu = '') => {
  console.log(`${ok ? '  OK  ' : '  ESEC'} ${nume}${detaliu ? '  - ' + detaliu : ''}`);
  if (!ok) esecuri++;
};
const aproape = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;

console.log('\nDREPTUNGHI ROTUNJIT');
{
  const p = dreptunghiRotunjit(70.6, 146.61, 17.24);
  const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]);
  check('respectă lățimea cerută', aproape(Math.max(...xs) - Math.min(...xs), 70.6, 1e-9),
    `${(Math.max(...xs) - Math.min(...xs)).toFixed(4)}`);
  check('  și înălțimea', aproape(Math.max(...ys) - Math.min(...ys), 146.61, 1e-9));
  check('  e centrat pe origine', aproape(Math.max(...xs) + Math.min(...xs), 0, 1e-9));

  // SENSUL contează: sub regula 'Positive' un inel în sens orar e o GAURĂ, nu o formă.
  // Lecția e deja plătită de două ori în proiect (bara de picior la Rame, logo-ul SVG la SEM.1).
  let arie = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length];
    arie += a[0] * b[1] - b[0] * a[1];
  }
  check('  inelul iese în sens TRIGONOMETRIC (arie pozitivă)', arie > 0, `arie ${(arie / 2).toFixed(0)} mm²`);

  const patrat = dreptunghiRotunjit(20, 20, 0);
  check('raza 0 dă patru colțuri, nu arce', patrat.length === 4, `${patrat.length} puncte`);
  const limitat = dreptunghiRotunjit(10, 40, 99);
  const lxs = limitat.map((q) => q[0]);
  check('raza se limitează singură la jumătatea laturii mici',
    aproape(Math.max(...lxs) - Math.min(...lxs), 10, 1e-6));
}

console.log('\nMARGINEA DECUPAJULUI, PE LATURI — cotele reale');
{
  const p = telefon('iphone-15-pro');
  const i = p.insulaCamera, c = p.corp;
  const m = marginiDecupaj({ x: i.x, y: i.y, latime: i.latime, inaltime: i.inaltime },
    { latime: c.latime, lungime: c.lungime }, 1.0);
  // insula ajunge la 34.26 dintr-o limita de 35.30 (jumatate din latime): raman 1.04 mm
  const disponibilStanga = (i.x - i.latime / 2) + c.latime / 2;
  check(`15 Pro: pe stânga rămân ${disponibilStanga.toFixed(2)} mm`, disponibilStanga > 0);
  check('  marginea de 1,0 mm încape fix', aproape(m.stanga, 1.0, 1e-9), `${m.stanga}`);
  check('  și nu se raportează ca strâmtă', !m.stramte.includes('stanga'));

  // cu o margine dorita mai mare decat spatiul, se stramteaza — si asta e regula
  const m2 = marginiDecupaj({ x: i.x, y: i.y, latime: i.latime, inaltime: i.inaltime },
    { latime: c.latime, lungime: c.lungime }, 2.0);
  check('cu margine dorită 2,0 mm, stânga se strâmtează', m2.stramte.includes('stanga'),
    `stanga = ${m2.stanga.toFixed(2)}`);
  check('  dar nu sub spațiul disponibil', m2.stanga <= disponibilStanga + 1e-9);

  // o insula lipita de margine: buza E peretele
  const lipit = marginiDecupaj({ x: 0, y: 0, latime: 70.6, inaltime: 40 },
    { latime: 70.6, lungime: 146.61 }, 1.0);
  check('insulă lipită de margine: laturile sunt „la perete"',
    lipit.laPerete.includes('stanga') && lipit.laPerete.includes('dreapta'),
    lipit.laPerete.join(', '));
  check('  iar marginea acolo e zero', aproape(lipit.stanga, 0) && aproape(lipit.dreapta, 0));
  check('  sus/jos rămân neatinse', !lipit.laPerete.includes('sus') && aproape(lipit.sus, 1.0));
}

console.log('\nCONTURUL DECUPAJULUI');
{
  const insula = { x: -12.17, y: 49.52, latime: 44.18, inaltime: 45.5 };
  const m = { stanga: 1.0, dreapta: 2.0, jos: 1.0, sus: 1.0,
    stramte: [] as never[], laPerete: [] as never[] };
  const p = conturDecupaj(insula, m, 11.0);
  const xs = p.map((q) => q[0]);
  check('lățimea = insula + cele două margini',
    aproape(Math.max(...xs) - Math.min(...xs), 44.18 + 3.0, 1e-6),
    `${(Math.max(...xs) - Math.min(...xs)).toFixed(3)}`);
  // marginile diferite mută centrul: nu mai coincide cu al insulei
  const centru = (Math.max(...xs) + Math.min(...xs)) / 2;
  check('  centrul se deplasează spre latura cu marginea mai mare',
    centru > insula.x, `${centru.toFixed(3)} vs insula ${insula.x}`);
  check('  cu exact jumătate din diferența de margini',
    aproape(centru - insula.x, 0.5, 1e-6), `${(centru - insula.x).toFixed(3)}`);
}

console.log('\nÎNĂLȚIMEA MAXIMĂ A BUZEI, din conul de keepout');
{
  const p15 = telefon('iphone-15');
  const con = p15.insulaCamera.lentile[0].con;
  const raza = p15.insulaCamera.lentile[0].diametru / 2;
  check(`15: conul e ${con.unghi}° la ${con.distanta} mm de ${con.referinta}`, !!con.unghi);

  /**
   * Conul se lărgește în sus, deci lângă lentilă strânge, iar mai departe lasă loc. Prima
   * versiune a primitivei scădea cu distanța — adică spunea exact pe dos.
   */
  const langa = inaltimeMaximaBuza(con, raza);
  const departe = inaltimeMaximaBuza(con, raza + 5);
  check('  mai departe de axă, buza poate fi mai înaltă', departe > langa,
    `${langa.toFixed(2)} mm la margine, ${departe.toFixed(2)} mm la +5`);
  check('  amândouă sunt finite și pozitive', langa > 0 && Number.isFinite(departe));

  // dincolo de raza conului la baza, nu mai exista limita
  const semi = (con.unghi / 2) * (Math.PI / 180);
  const razaLaBaza = Math.tan(semi) * con.distanta;
  check('  în afara conului nu se impune nicio limită',
    inaltimeMaximaBuza(con, razaLaBaza + 1) === Infinity, `raza la bază ${razaLaBaza.toFixed(2)} mm`);

  check('fără con, nicio limită — nu se inventează una',
    inaltimeMaximaBuza(null, 5) === Infinity && inaltimeMaximaBuza({ unghi: null, distanta: 3 }, 5) === Infinity);

  /**
   * CONUL LARG E CEL CARE LIMITEAZĂ, nu cel îngust — invers decât pare la prima vedere.
   * Camera principală are 123° și un con care ajunge la 15,27 mm în plan; teleobiectivul are
   * 33,2° și unul care se oprește la 1,05 mm, deci la 9 mm de axă nici nu ajunge.
   */
  const pro = telefon('iphone-15-pro');
  const larg = inaltimeMaximaBuza(pro.insulaCamera.lentile[0].con, 9);
  const tele = inaltimeMaximaBuza(pro.insulaCamera.lentile[2].con, 9);
  check('15 Pro: camera 1 (123°) limitează, teleobiectivul (33,2°) nu ajunge până acolo',
    Number.isFinite(larg) && tele === Infinity,
    `camera 1 ${larg.toFixed(2)} mm, tele ${tele === Infinity ? 'fara limita' : tele.toFixed(2)}`);
  check('  buza trebuie să respecte conul CEL MAI STRÂNS dintre toate lentilele',
    Math.min(...pro.insulaCamera.lentile.map((l: any) => inaltimeMaximaBuza(l.con, 9))) === larg);
}

console.log('\nPERETE SUBȚIAT');
{
  check('perete 1,4 subțiat la 0,8 → se scoate 0,6', aproape(adancimeSubtiere(1.4, 0.8)!, 0.6, 1e-9));
  check('perete deja mai subțire → nu se scobește nimic', adancimeSubtiere(0.6, 0.8) === null);
  check('perete exact cât ținta → tot nimic', adancimeSubtiere(0.8, 0.8) === null);
}

console.log('\nTĂIETURI DE FLEXIBILITATE');
{
  const t = pozitiiFlexColt(70.6, 146.61, 17.24);
  check('patru colțuri, câte una', t.length === 4);
  check('  toate pe diagonale', t.every((x) => [45, 135, 225, 315].includes(x.unghi)));
  const inauntru = t.every((x) => Math.abs(x.centru[0]) < 70.6 / 2 && Math.abs(x.centru[1]) < 146.61 / 2);
  check('  toate în interiorul conturului', inauntru);
}

console.log('\nDECUPAJE UNITE');
{
  const p15 = telefon('iphone-15');
  // 15 jos: microfon la 11.57 (10.65), microfon la -6.93 (1.35), difuzor la -16.23 (10.37)
  /**
   * La pragul din document (3 mm) cele trei decupaje ale lui 15 rămân separate: cea mai mică
   * distanță dintre ele e 3,44 mm. Nu e o scăpare a unirii, e ce spun cotele — de-aia testul
   * verifică ȘI pragul de la care chiar se unesc.
   */
  const unite = unesteDecupaje(p15.decupajeJos, 3.0);
  check(`15: cele ${p15.decupajeJos.length} decupaje de jos rămân separate la prag 3 mm`,
    unite.length === 3, unite.map((u) => `${u.tip} ${u.latime.toFixed(2)}`).join(' · '));
  const unite4 = unesteDecupaje(p15.decupajeJos, 3.5);
  check('  la prag 3,5 mm, difuzorul și microfonul de lângă el se unesc',
    unite4.length === 2, unite4.map((u) => `${u.tip} ${u.latime.toFixed(2)}`).join(' · '));

  const doua = unesteDecupaje([{ tip: 'a', x: 0, latime: 4 }, { tip: 'b', x: 5, latime: 4 }], 3.0);
  check('două la 1 mm distanță se unesc', doua.length === 1, `latime ${doua[0].latime}`);
  check('  și acoperă exact intervalul reunit', aproape(doua[0].latime, 9) && aproape(doua[0].x, 2.5));
  const separate = unesteDecupaje([{ tip: 'a', x: 0, latime: 4 }, { tip: 'b', x: 10, latime: 4 }], 3.0);
  check('două la 4 mm distanță rămân separate', separate.length === 2);
  check('unul singur rămâne unul singur', unesteDecupaje([{ tip: 'a', x: 0, latime: 4 }], 3).length === 1);
}

console.log('\nUNIREA SIGURA — atingerea coplanara se opreste, nu se livreaza');
{
  // doua corpuri care se ating EXACT pe o fata, fara suprapunere
  // `cube(...).translate(...)` lasa cubul intermediar in heap-ul WASM: se tine si se elibereaza.
  const a = Manifold.cube([10, 10, 10], true);
  const brut1 = Manifold.cube([10, 10, 10], true);
  const lipit = brut1.translate([0, 0, 10]);
  let aruncat: any = null;
  try { uneste(a, lipit, 'proba: cuburi lipite').delete(); } catch (e) { aruncat = e; }
  check('doua corpuri care doar se ating: unirea ARUNCA',
    aruncat instanceof AtingereCoplanara, aruncat ? aruncat.name : 'nu a aruncat');
  check('  mesajul spune UNDE', String(aruncat?.message).includes('cuburi lipite'));

  // acelasi caz, cu suprapunerea de nucleu: trece, si iese O SINGURA bucata
  const brut2 = Manifold.cube([10, 10, 10], true);
  const suprapus = brut2.translate([0, 0, 10 - SUPRAPUNERE]);
  const unit = uneste(a, suprapus, 'proba: cuburi suprapuse');
  const parti = unit.decompose();
  check(`cu suprapunere de ${SUPRAPUNERE} mm, unirea trece si da O SINGURA bucata`,
    parti.length === 1, `${parti.length} bucati`);
  for (const p of parti) p.delete();

  /**
   * ATINGEREA COPLANARA NU DA MEREU DOUA COMPONENTE — de-aia verificarea e neconditionata.
   *
   * Cuburile de mai sus, lipite exact, se unesc: `add` da o bucata. Pe geometria reala a husei,
   * acelasi fel de contact da DOUA (masurat in `huse.test.ts`). Din cod nu se vede in care caz
   * esti, iar cand nu se unesc, volumul si forma raman corecte — defectul apare abia in 3MF.
   *
   * Deci regula nu e „atingerea strica mereu", ci „atingerea nu garanteaza nimic". `uneste` cere
   * suprapunere, si atat.
   */
  const cuburiLipite = a.add(lipit);
  // `decompose` intoarce obiecte NOI in heap-ul WASM: se numara o data si se elibereaza.
  // Chemat de doua ori si nelasat, scapa handle-uri, iar procesul crapa la inchidere.
  const partiCuburi = cuburiLipite.decompose();
  const nCuburi = partiCuburi.length;
  for (const p of partiCuburi) p.delete();
  check('cuburi lipite: aici `add` chiar le uneste — atingerea nu strica MEREU',
    nCuburi === 1, `${nCuburi} bucati`);

  for (const x of [a, brut1, lipit, brut2, suprapus, unit, cuburiLipite]) x.delete();
}

/**
 * CIOBURILE NUMERICE (regula de nucleu, HUS.2).
 *
 * Cele trei cazuri care conteaza, pe geometrie construita anume, nu pe una gasita din intamplare:
 * o piesa curata trece neatinsa, un ciob se arunca, iar doua bucati ADEVARATE opresc exportul.
 */
{
  console.log('\nCIOBURI NUMERICE');
  // 1. piesa curata: se intoarce CHIAR ea, nereconstruita
  const curata = Manifold.cube([10, 10, 10], true);
  const r1 = curataCioburi(curata, 'proba curata');
  check('piesa curata trece neatinsa (acelasi corp)', r1.corp === curata && r1.sterse === 0);

  /**
   * 2. UN CIOB: un cub de 0,5 mm pe latura are 0,125 mm3, sub pragul de 1. Se arunca, si ramane
   *    piesa mare. Cioburile masurate in husa erau sub 0,001 mm3 — patru ordine de marime mai jos
   *    decat pragul — dar unul de 0,125 dovedeste ca pragul lucreaza, nu doar ca zeroul se pierde.
   */
  const ciob = Manifold.cube([0.5, 0.5, 0.5], true).translate([50, 0, 0]);
  const cuCiob = curata.add(ciob);
  const inainte = cuCiob.decompose();
  const nInainte = inainte.length;
  for (const x of inainte) x.delete();
  const r2 = curataCioburi(cuCiob, 'proba cu ciob');
  const dupa = r2.corp.decompose();
  const nDupa = dupa.length;
  for (const x of dupa) x.delete();
  check('ciobul sub prag se arunca', nInainte === 2 && nDupa === 1 && r2.sterse === 1,
    `${nInainte} → ${nDupa} bucati, ${r2.sterse} sterse, ${r2.volumSters.toFixed(3)} mm3`);

  /**
   * 3. DOUA BUCATI ADEVARATE: nu se repara tacit. Fara jumatatea asta, regula ar fi o matura sub
   *    covor — o piesa rupta in doua ar trece mai departe cu jumatatea mai mare, iar omul ar
   *    primi jumatate de husa.
   */
  const doua = curata.add(Manifold.cube([10, 10, 10], true).translate([50, 0, 0]));
  let aAruncat = false, mesaj = '';
  try { curataCioburi(doua, 'proba rupta'); } catch (e: any) { aAruncat = e.name === 'PiesaInBucati'; mesaj = e.message; }
  check('doua bucati adevarate opresc exportul', aAruncat, mesaj.slice(0, 60));

  for (const x of [curata, ciob, r2.corp, doua]) { try { x.delete(); } catch { /* deja sters */ } }
}

console.log(`\n${esecuri ? `${esecuri} ESECURI` : 'toate verificarile au trecut'}`);
/**
 * `process.exitCode`, NU `process.exit`.
 *
 * Bisectat: dupa o UNIRE manifold (`add`), `process.exit` taie procesul cat timp WASM-ul inca se
 * inchide, iar libuv crapa pe Windows cu „Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)"
 * si cod 127 — adica suita raporta ESEC desi toate verificarile trecusera. Acelasi cod cu
 * `exitCode` iese 0. Verificat izolat: `add` + `exit` = 127, `add` + `exitCode` = 0, `add` singur
 * = 0, `decompose` singur cu `exit` = 0.
 */
process.exitCode = esecuri ? 1 : 0;
