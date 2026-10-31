/**
 * IMPORTUL FOTOGRAFIILOR ACADEMIEI — descărcare o dată, conversie locală, dimensiuni reale.
 *
 *   node scripts/importa-imagini-academia.mjs
 *
 * Intrarea e `content/academia/imagini-manifest.md`, tabelele lui citite ca date. Ieșirea:
 * `public/academia/img/<id>-<lățime>.{avif,webp}` plus `public/academia/imagini.json`.
 *
 * TREI DECIZII, fiecare cu motivul ei:
 *
 * 1. DESCĂRCARE O SINGURĂ DATĂ. Originalul se păstrează în `content/academia/_sursa/`; rulările
 *    următoare îl refolosesc și nu mai ating CDN-ul. Un generator care descarcă la fiecare build
 *    e un build care pică atunci când magazinul e în mentenanță — și, în plus, lovește inutil un
 *    server care nu e al nostru.
 *
 * 2. NIMIC NU SE SERVEȘTE DE PE cdn.shopify.com. Nu e o preferință de stil: cu hotlink, LCP-ul
 *    paginii depinde de un CDN pe care nu-l controlăm și de fișiere care pot fi rearanjate de
 *    magazin oricând. Importate, sunt ale noastre, în formatele și la lățimile pe care le alegem.
 *
 * 3. DIMENSIUNILE SE MĂSOARĂ, NU SE DECLARĂ. `imagini.json` primește lățimea și înălțimea reale
 *    ale fiecărui fișier produs, citite din el după conversie. Atributele `width`/`height` din
 *    HTML există ca să rezerve spațiul înainte de descărcare — dacă sunt ghicite, layout-ul tot
 *    sare, doar că mai discret și mai greu de găsit.
 *
 * Rândurile marcate `lipsa` nu produc fișiere, dar intră în `imagini.json` cu `lipsa: true`:
 * pagina randează un locaș gol în locul lor. O fotografie care lipsește trebuie să se vadă că
 * lipsește, nu să fie înlocuită cu prima imagine care seamănă.
 */
import sharp from 'sharp';
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './continut.mjs';

const MANIFEST = join(ROOT, 'content', 'academia', 'imagini-manifest.md');
const SURSA = join(ROOT, 'content', 'academia', '_sursa');
const IESIRE = join(ROOT, 'public', 'academia', 'img');
const CDN = 'https://cdn.shopify.com/s/files/1/1051/2688/7769/files/';
const LATIMI = [640, 1000, 1600];
const FORMATE = [
  { ext: 'avif', opt: { quality: 55, effort: 6 } },
  { ext: 'webp', opt: { quality: 78 } },
];

/**
 * Citește TOATE tabelele din manifest, ca listă de obiecte cu cheile din antet.
 *
 * Un parser de markdown întreg ar fi mai mult decât trebuie: manifestul e scris de noi, iar
 * singurul lucru citit din el sunt rândurile de tabel. Rândurile fără `id` și `stare` se ignoră —
 * așa proza dintre tabele nu trebuie separată de date.
 */
function citesteManifest() {
  const linii = readFileSync(MANIFEST, 'utf8').split(/\r?\n/);
  const randuri = [];
  let antet = null;
  for (const linie of linii) {
    const l = linie.trim();
    if (!l.startsWith('|')) { antet = null; continue; }
    const celule = l.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    if (celule.every((c) => /^-+$/.test(c))) continue;          // linia de separare
    if (!antet) { antet = celule; continue; }
    const o = Object.fromEntries(antet.map((k, i) => [k, celule[i] ?? '']));
    if (o.id && o.stare) randuri.push(o);
  }
  return randuri;
}

/** descarcă o dată; a doua oară returnează fișierul din cache */
async function adu(fisier) {
  const local = join(SURSA, fisier);
  if (existsSync(local)) return { local, adus: false, octeti: statSync(local).size };
  const r = await fetch(CDN + fisier);
  if (!r.ok) throw new Error(`${fisier}: CDN a răspuns ${r.status} ${r.statusText}`);
  const buf = Buffer.from(await r.arrayBuffer());
  mkdirSync(SURSA, { recursive: true });
  writeFileSync(local, buf);
  return { local, adus: true, octeti: buf.length };
}

/**
 * Convertește o sursă în toate formatele × lățimile și întoarce dimensiunile MĂSURATE.
 *
 * Nu se mărește niciodată: `withoutEnlargement` taie lățimile peste originalul dat. O poză de
 * 900 px lățime scalată la 1600 nu adaugă detaliu, adaugă octeți.
 */
async function converteste(id, local) {
  mkdirSync(IESIRE, { recursive: true });
  const meta = await sharp(local).metadata();
  const surse = [];
  for (const w of LATIMI) {
    if (w > meta.width) continue;
    for (const f of FORMATE) {
      const nume = `${id}-${w}.${f.ext}`;
      const buf = await sharp(local).rotate()
        .resize({ width: w, withoutEnlargement: true })[f.ext](f.opt).toBuffer();
      writeFileSync(join(IESIRE, nume), buf);
      const m = await sharp(buf).metadata();
      surse.push({ fisier: `/academia/img/${nume}`, format: f.ext, w: m.width, h: m.height,
        kb: Math.round(buf.length / 1024) });
    }
  }
  if (!surse.length) throw new Error(`${id}: originalul are ${meta.width} px, sub cea mai mică lățime cerută`);
  return { surse, originalW: meta.width, originalH: meta.height };
}

// ── rulare ──────────────────────────────────────────────────────────────────
const randuri = citesteManifest();
const imagini = {};
let noi = 0, dinCache = 0, lipsa = 0;

console.log(`\nImagini Academia — ${randuri.length} intrări în manifest`);

for (const r of randuri) {
  if (!r.alt || !r.alt_en) {
    throw new Error(`${r.id}: lipsește textul alternativ în ${!r.alt ? 'română' : 'engleză'}. `
      + 'Fiecare fotografie are nevoie de el în amândouă limbile — un `alt` netradus ajunge '
      + 'într-o pagină engleză și se vede doar la cititorul de ecran, adică niciodată la noi.');
  }
  if (r.stare === 'lipsa') {
    imagini[r.id] = { lipsa: true, alt: r.alt, altEn: r.alt_en,
      sectiune: r.sectiune || null, sectiuneEn: r.sectiune_en || null, unde: r.unde };
    lipsa++;
    continue;
  }
  const { local, adus, octeti } = await adu(r.fisier);
  adus ? noi++ : dinCache++;
  const { surse, originalW, originalH } = await converteste(r.id, local);
  // lățimea de referință pentru `width`/`height` din HTML: cea mai mare produsă
  const ref = surse.reduce((a, b) => (b.w > a.w ? b : a));
  imagini[r.id] = {
    lipsa: false, alt: r.alt, altEn: r.alt_en,
    sectiune: r.sectiune || null, sectiuneEn: r.sectiune_en || null, unde: r.unde,
    w: ref.w, h: ref.h, raport: +(ref.w / ref.h).toFixed(4),
    surse,
  };
  const kbSursa = Math.round(octeti / 1024);
  const kbMic = Math.min(...surse.filter((s) => s.format === 'avif').map((s) => s.kb));
  console.log(`  ${r.id.padEnd(20)} ${originalW}×${originalH}  ${kbSursa} kB → ${surse.length} fișiere, cel mai mic AVIF ${kbMic} kB${adus ? '  (descărcat)' : ''}`);
}

for (const r of randuri.filter((x) => x.stare === 'lipsa')) {
  console.log(`  ${r.id.padEnd(20)} LIPSEȘTE — pagina randează un locaș gol`);
}

mkdirSync(join(ROOT, 'public', 'academia'), { recursive: true });
writeFileSync(join(ROOT, 'public', 'academia', 'imagini.json'), JSON.stringify(imagini, null, 2) + '\n');
console.log(`\n  ${noi} descărcate, ${dinCache} din cache, ${lipsa} lipsă.`);
console.log(`  public/academia/imagini.json scris (${Object.keys(imagini).length} intrări).\n`);
