/**
 * PLASATOR DE RANDARE — imagine-tampon 600×450 pentru cardurile aplicatiilor NOI, pana cand
 * exista randarea fotorealista adevarata (capturata in browserul real, vezi
 * public/landing/_captura-randari.js).
 *
 * DE CE EXISTA. Cardurile „disponibile" au nevoie de un thumb; o randare WebGL adevarata cere
 * un browser care compune cadre pe ecran, ceea ce mediul automat nu are. Ca sa nu ramana cardul
 * cu imagine sparta, punem un tampon in acelasi ton ca randarile reale (fundal lavanda #f1eefb),
 * cu o placheta si numele aplicatiei. Se inlocuieste 1:1 cand pica randarea reala peste el.
 *
 * ACELEASI capcane librsvg ca la og.mjs: text -> <path> cu opentype, doar hex literal, si se
 * valideaza dimensiunea + neuniformitatea dupa rasterizare.
 *
 *   node scripts/plasator-produs.mjs
 */
import opentype from 'opentype.js';
import sharp from 'sharp';
import { join } from 'node:path';
import { ROOT } from './continut.mjs';

const W = 600, H = 450;
const C = { brand: '#5b4dd1', brand2: '#8b5cf6', ink: '#2a2340', bg: '#f1eefb', bg2: '#ffffff', umbra: '#d9d1f2', slab: '#efeaff' };

const fontTitlu = opentype.loadSync(join(ROOT, 'public', 'fonts', 'Poppins-700.ttf'));
const fontCorp = opentype.loadSync(join(ROOT, 'public', 'fonts', 'Poppins-Regular.ttf'));

function latime(font, text, size) {
  const s = size / font.unitsPerEm; let w = 0;
  for (const g of font.stringToGlyphs(text)) w += (g.advanceWidth || 0) * s;
  return w;
}
/** text centrat pe X in jurul lui cx, ca <path> */
function textPathCentrat(font, text, size, cx, y, culoare) {
  const w = latime(font, text, size);
  const p = font.getPath(text, cx - w / 2, y, size);
  return `<path d="${p.toPathData(2)}" fill="${culoare}"/>`;
}

function svg(nume, subtitlu) {
  const cx = W / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="f" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.bg2}"/><stop offset="1" stop-color="${C.bg}"/>
    </linearGradient>
    <linearGradient id="p" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.brand2}"/><stop offset="1" stop-color="${C.brand}"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#f)"/>
  <ellipse cx="${cx}" cy="322" rx="150" ry="26" fill="${C.umbra}"/>
  <rect x="${cx - 140}" y="120" width="280" height="180" rx="26" fill="url(#p)"/>
  <rect x="${cx - 140}" y="120" width="280" height="58" rx="26" fill="${C.bg2}" opacity="0.16"/>
  ${textPathCentrat(fontTitlu, nume, 30, cx, 224, C.bg2)}
  ${textPathCentrat(fontCorp, subtitlu, 17, cx, 372, C.ink)}
</svg>`;
}

async function scrie(fisier, nume, subtitlu) {
  const cale = join(ROOT, 'public', 'produse', fisier);
  const buf = await sharp(Buffer.from(svg(nume, subtitlu))).png().toBuffer();
  const meta = await sharp(buf).metadata();
  if (meta.width !== W || meta.height !== H) throw new Error(`${fisier}: dimensiune ${meta.width}x${meta.height}`);
  const stats = await sharp(buf).stats();
  const uniform = stats.channels.every((c) => c.stdev < 2);
  if (uniform) throw new Error(`${fisier}: imagine uniforma (SVG invalid?)`);
  const { writeFileSync } = await import('node:fs');
  writeFileSync(cale, buf);
  console.log(`  ${fisier}  ${meta.width}x${meta.height}  (tampon — inlocuieste cu randarea reala)`);
}

console.log('\nPlasatoare de produs (tampon, pana la randarea reala):');
await scrie('placute.png', 'Placute & Etichete', 'randare in curand');
await scrie('articulat.png', 'Brelocuri Articulate', 'randare in curand');
await scrie('huse-iphone.png', 'Huse iPhone', 'randare in curand');
console.log('');
