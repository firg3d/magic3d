/**
 * ORIENTAREA TEXTULUI — pe piesă și în 3MF-ul exportat, DUPĂ FAȚA CARE-L POARTĂ.
 *
 * REPERUL FIZIC: husa se printează cu exteriorul spatelui pe placă. Un text se citește privind
 * fața pe care e gravat DINSPRE PARTEA ÎN CARE ARATĂ NORMALA EI. De aici, două clase:
 *
 *  - față INTERIOARĂ (normala +Z): fundul cavității — micro-marcajul — și fața de sus a inelului
 *    ramei de probă. Cititorul stă de partea gravării, deci textul merge DIRECT.
 *  - față EXTERIOARĂ (normala −Z): spatele husei — semnătura, logo-ul, numele gravat. Cititorul
 *    privește de pe partea opusă, deci textul trebuie OGLINDIT PE X în fișier.
 *
 * Cele două cer oglindiri INVERSE: ce e corect pe una e greșit pe cealaltă. Prima corectură le-a
 * tratat la fel și a reparat numai jumătatea de sus — micro-marcajul chiar a ieșit bine,
 * semnătura și numele au rămas oglindite pe fața care contează.
 *
 * FAȚA NU SE DECLARĂ, SE MĂSOARĂ. Se sondează materialul de deasupra și de dedesubtul gropii
 * gravate: unde nu e material, acolo se deschide groapa, și aia e fața. O adnotare scrisă de mână
 * ar fi repetat exact presupunerea care a produs bug-ul.
 *
 * Verificarea are două părți, fiindcă una singură n-ar fi de ajuns:
 *
 *  1. GROAPA GRAVATĂ, măsurată pe piesă: se construiește husa cu litera și fără, se scade una din
 *     alta, și se ia centroidul proiecției față de centrul cutiei ei. Semnele așteptate vin din
 *     unitatea de text pentru șirul chiar folosit, cu X-ul întors pe fața exterioară.
 *
 *  2. EXPORTUL E VERBATIM: se dezarhivează 3MF-ul, se citesc vârfurile din `3D/3dmodel.model` și
 *     se compară cu ale mesh-ului manifold, pereche cu pereche în ordine. `build3MF` scrie
 *     coordonatele modelului ca atare, fără negarea de Y din `manifoldToGeometry`: preview-ul și
 *     fișierul NU sunt în același sistem, iar fișierul e cel care se printează.
 *
 * Rulare:  npx tsx scripts/verifica-oglindire-3mf.mjs
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';
import ManifoldModule from 'manifold-3d';
import opentype from 'opentype.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** dezarhivează `3D/3dmodel.model` dintr-un 3MF ținut în memorie (ZIP minimal, fără dependențe) */
function modelXml(zip) {
  const buf = Buffer.from(zip);
  for (let i = 0; i + 4 <= buf.length; i++) {
    if (buf.readUInt32LE(i) !== 0x04034b50) continue;
    const metoda = buf.readUInt16LE(i + 8);
    const compr = buf.readUInt32LE(i + 18);
    const nLen = buf.readUInt16LE(i + 26), eLen = buf.readUInt16LE(i + 28);
    const nume = buf.subarray(i + 30, i + 30 + nLen).toString('utf8');
    if (nume !== '3D/3dmodel.model') continue;
    const d = buf.subarray(i + 30 + nLen + eLen, i + 30 + nLen + eLen + compr);
    return (metoda === 0 ? d : inflateRawSync(d)).toString('utf8');
  }
  throw new Error('3D/3dmodel.model lipseste din arhiva');
}

/** vârfurile scrise în fișier */
function varfuri3MF(xml) {
  const v = [];
  for (const m of xml.matchAll(/<vertex x="([^"]*)" y="([^"]*)" z="([^"]*)"\/>/g)) {
    v.push([+m[1], +m[2], +m[3]]);
  }
  return v;
}

/** vârfurile mesh-ului manifold, în coordonatele modelului */
function varfuriModel(m) {
  const mesh = m.getMesh();
  const vp = mesh.vertProperties, np = mesh.numProp;
  const v = [];
  for (let i = 0; i < vp.length / np; i++) v.push([vp[i * np], vp[i * np + 1], vp[i * np + 2]]);
  return v;
}

/**
 * Vârfurile din fișier, față de cele din model, PERECHE CU PERECHE ÎN ORDINE.
 *
 * `build3MF` scrie vârfurile în ordinea mesh-ului, deci perechea `i` din fișier e vârful `i` din
 * model — comparație directă, cu toleranță de un micron pentru cele 5 zecimale ale scrierii.
 *
 * Prima variantă compara MULȚIMILE, pe chei rotunjite la trei zecimale, și raporta 16 nepotriviri
 * din 4036. Erau toate false: un 1,23449 din model dă cheia „1.234", iar acelasi vârf scris ca
 * „1.2345" și recitit dă „1.235". Rotunjirea la limită, nu geometrie. Comparația în ordine n-are
 * problema asta — diferența maximă măsurată așa e sub o zecime de micron.
 *
 * `oglindite` numără vârfurile care nu se potrivesc direct dar se potrivesc cu Y-ul schimbat de
 * semn: ăsta e semnalul care ar prinde o răsturnare strecurată la scriere.
 */
function comparaVarfuri(model, fisier) {
  if (model.length !== fisier.length) {
    return { total: model.length, inFisier: fisier.length, lipsa: model.length, oglindite: 0, maxDif: NaN };
  }
  let lipsa = 0, oglindite = 0, maxDif = 0;
  for (let i = 0; i < model.length; i++) {
    const a = model[i], b = fisier[i];
    const d = Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
    maxDif = Math.max(maxDif, d);
    if (d <= 1e-3) continue;
    lipsa++;
    if (Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] + b[1]), Math.abs(a[2] - b[2])) <= 1e-3) oglindite++;
  }
  return { total: model.length, inFisier: fisier.length, lipsa, oglindite, maxDif };
}

/**
 * PE CE FAȚĂ SE DESCHIDE GROAPA — măsurat, nu declarat.
 *
 * Se pune un cub subțire chiar sub și chiar peste groapă, la centrul ei, și se vede unde mai e
 * material în piesa fără text. Partea goală e fața pe care s-a gravat.
 */
function fataGropii(Manifold, gol, groapa) {
  const b = groapa.boundingBox();
  const cx = (b.min[0] + b.max[0]) / 2, cy = (b.min[1] + b.max[1]) / 2;
  const lat = Math.max(0.4, (b.max[0] - b.min[0]) * 0.2);
  const sonda = (z) => {
    const c = Manifold.cube([lat, lat, 0.2], true).translate([cx, cy, z]);
    const v = c.intersect(gol).volume();
    c.delete();
    return v;
  };
  const sub = sonda(b.min[2] - 0.2), peste = sonda(b.max[2] + 0.2);
  if (sub < 1e-6 && peste > 1e-6) return { fata: 'exterioara', zMin: b.min[2], zMax: b.max[2] };
  if (peste < 1e-6 && sub > 1e-6) return { fata: 'interioara', zMin: b.min[2], zMax: b.max[2] };
  throw new Error(`fata gropii e neclara: material sub ${sub.toFixed(3)}, peste ${peste.toFixed(3)} mm3`);
}

/** centroidul unei regiuni 2D, față de centrul cutiei ei */
function masa(cs) {
  const inele = cs.toPolygons();
  let A = 0, cx = 0, cy = 0;
  let mnX = Infinity, mxX = -Infinity, mnY = Infinity, mxY = -Infinity;
  for (const inel of inele) {
    for (let i = 0; i < inel.length; i++) {
      const p = inel[i], q = inel[(i + 1) % inel.length];
      const f = p[0] * q[1] - q[0] * p[1];
      A += f; cx += (p[0] + q[0]) * f; cy += (p[1] + q[1]) * f;
      mnX = Math.min(mnX, p[0]); mxX = Math.max(mxX, p[0]);
      mnY = Math.min(mnY, p[1]); mxY = Math.max(mxY, p[1]);
    }
  }
  A /= 2;
  return {
    dx: cx / (6 * A) - (mnX + mxX) / 2, dy: cy / (6 * A) - (mnY + mxY) / 2,
    lat: mxX - mnX, inalt: mxY - mnY,
  };
}

async function main() {
  const husa = await import('../src/apps/huse/husa.ts');
  const { configureManifold, buildHusa, pentruPrint, microMarcajHusa, textGravare } = husa;
  const { build3MF } = await import('../src/core/geometry/export3mf.ts');
  const txt = await import('../src/core/geometry/textSolid.ts');

  const mod = await ManifoldModule();
  mod.setup(); configureManifold(mod); txt.configureManifold(mod);

  const fb = readFileSync(join(ROOT, 'public', 'fonts', 'Inter-900.ttf'));
  const font = opentype.parse(fb.buffer.slice(fb.byteOffset, fb.byteOffset + fb.byteLength));

  const t = JSON.parse(readFileSync(join(ROOT, 'date', 'telefoane', 'apple', 'iphone-16.json'), 'utf8'));
  const baza = {
    telefon: t, material: 'tpu', ceExporti: 'husa',
    grosimePerete: 1.4, buzaEcran: 1.0, joc: 0.25,
    butoaneAcoperite: false, margineCamera: 1.0, fontGravare: font,
    spate: {
      stil: 'plin', text: '', inaltimeText: 18, snur: 'fara',
      tipar: { model: 'fagure', pas: 8, grosimePerete: 2, unghi: 0, varianta: 1 },
    },
  };
  const fara = { stare: { fel: 'lipsa' }, siluetaSemnatura: () => [], azi: new Date(2026, 8, 6) };

  /** silueta BRUTĂ, cum o primește aplicația: `matriceCadru` e cea care-i întoarce Y-ul */
  const siluetaL = () => {
    const b = txt.textSolid(font, 'L', 2.5, 1);
    const sil = b.project(); b.delete();
    const inele = sil.toPolygons(); sil.delete();
    return inele;
  };

  const cfgRama = { ...baza, ceExporti: 'rama', telefon: { ...t, id: 'iphone-L' }, marcaj: fara };

  /**
   * CE ÎNSEAMNĂ „CORECT" PENTRU FIECARE CALE — și de ce nu e o cifră fixă.
   *
   * Două lucruri schimbă semnele așteptate, și amândouă au produs deja diagnostice greșite:
   *
   * ȘIRUL. Eticheta ramei NU poate fi un „L" singur — `textGravare` îi lipește mereu jocul, deci
   * e „L · 0,25", iar orientarea ei corectă are masa în dreapta-sus. Un criteriu fix (−,−) ar fi
   * declarat oglindit exact exemplarul bun.
   *
   * FAȚA. Pe fața exterioară criteriul se întoarce pe X. Un criteriu care ignoră fața a lăsat
   * semnătura și numele să treacă verzi oglindite.
   *
   * Deci semnele se iau din unitatea de text, pentru șirul chiar folosit, pe fața chiar măsurată.
   * Nu e circular: unitatea e ancorată de cazul „L" singur, unde reperul fizic decide direct.
   */
  const asteptat = (text, fata) => {
    const u = husa.siluetaText(font, text, 2.0, fata);
    const m = masa(u); u.delete();
    return m;
  };

  /** cele patru căi: fiecare dă piesa FĂRĂ text și piesa CU textul de probă */
  const cai = [
    ['semnatura gravata', 'L', () => [
      buildHusa({ ...baza, marcaj: fara }, { w: 256, d: 256 }).corp,
      buildHusa({ ...baza, marcaj: { ...fara, siluetaSemnatura: siluetaL } }, { w: 256, d: 256 }).corp,
    ]],
    ['nume gravat pe spate', 'L', () => [
      buildHusa({ ...baza, marcaj: fara }, { w: 256, d: 256 }).corp,
      buildHusa({ ...baza, marcaj: fara,
        spate: { ...baza.spate, stil: 'nume-gravat', text: 'L', font } }, { w: 256, d: 256 }).corp,
    ]],
    ['micro-marcaj', 'L', () => {
      const a = buildHusa({ ...baza, marcaj: fara }, { w: 256, d: 256 }).corp;
      return [a, microMarcajHusa({ ...baza }, a, 'L')];
    }],
    // `buildHusa` gravează eticheta singur când are font, deci rama fără text se cere fără font
    [`eticheta ramei ("${textGravare(cfgRama)}")`, textGravare(cfgRama), () => [
      buildHusa({ ...cfgRama, fontGravare: null }, { w: 256, d: 256 }).corp,
      buildHusa(cfgRama, { w: 256, d: 256 }).corp,
    ]],
  ];

  console.log('\nORIENTAREA TEXTULUI, PE PIESA SI IN 3MF — criteriul se intoarce pe X intre fete\n');
  let rele = 0;
  for (const [nume, text, face] of cai) {
    const [gol, cu] = face();

    // 1. groapa, pe piesă
    const groapa = gol.subtract(cu);
    const pr = groapa.project();
    const m = masa(pr);
    const f = fataGropii(mod.Manifold, gol, groapa);
    const a = asteptat(text, f.fata);
    const bun = Math.sign(m.dx) === Math.sign(a.dx) && Math.sign(m.dy) === Math.sign(a.dy);
    if (!bun) rele++;
    console.log(`  ${bun ? 'OK  ' : 'ESEC'} ${nume.padEnd(26)} fata ${f.fata.padEnd(11)}`
      + ` X ${m.dx.toFixed(2).padStart(6)}  Y ${m.dy.toFixed(2).padStart(6)}`
      + `   (asteptat ${a.dx > 0 ? '+' : '−'}X ${a.dy > 0 ? '+' : '−'}Y,`
      + ` groapa z ${f.zMin.toFixed(2)}..${f.zMax.toFixed(2)})`);
    groapa.delete(); pr.delete();

    // 2. fișierul poartă exact aceleași coordonate
    const piesa = pentruPrint(cu);
    const xml = modelXml(await build3MF([{ name: nume, manifold: piesa }]));
    const c = comparaVarfuri(varfuriModel(piesa), varfuri3MF(xml));
    const verbatim = c.lipsa === 0;
    if (!verbatim) rele++;
    console.log(`       ${verbatim ? '3MF verbatim' : '3MF DIFERIT'}: ${c.total} varfuri, ${c.lipsa} nepotrivite`
      + `, abatere maxima ${(c.maxDif * 1000).toFixed(4)} um`
      + (c.oglindite ? `, din care ${c.oglindite} OGLINDITE PE Y` : ''));

    for (const x of [gol, cu, piesa]) x.delete();
  }

  console.log('');
  if (rele) {
    console.error(`${rele} verificare(i) picate — textul iese oglindit.\n`);
    process.exitCode = 1;
  } else {
    console.log('Toate cele patru cai au orientarea ceruta de fata lor, si 3MF-ul poarta aceleasi coordonate.\n');
  }
}

await main();
