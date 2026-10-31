/**
 * GENERATOR DE IMAGINI OPEN GRAPH — SVG → PNG cu sharp, 1200×630 per pagină.
 *
 * DE CE SVG→SHARP, NU HEADLESS CHROME. Determinist, fără binar de browser în CI, sub o
 * secundă pentru toate imaginile. Chrome headless pentru OG e o soluție regretată la primul
 * deploy.
 *
 * PATRU CAPCANE ale lui librsvg (motorul din sharp), toate ocolite aici:
 *
 *   1. TEXT. librsvg n-are layout de text — fără wrap, iar <textPath>/dominant-baseline sunt
 *      inconsecvente. Deci titlurile se convertesc în <path> cu opentype.js: dispare și
 *      problema wrap-ului, și dependența de fonturi instalate în sistem. Ruperea pe linii o
 *      facem noi, măsurând lățimea cu advanceWidth.
 *
 *   2. IMAGINI ÎNCORPORATE. librsvg NU face fetch la fișiere externe din SVG-ul rasterizat —
 *      referințele relative pică TĂCUT, imaginea lipsește fără eroare. Deci randarea și logoul
 *      intră ca `data:...;base64`. Dacă randarea încă nu există, se pune un fundal, nu o
 *      referință spartă.
 *
 *   3. CULORI. Fără currentColor, fără variabile CSS, fără oklch(). Doar hex literal.
 *      linearGradient merge (testat); filter și mask sunt neuniforme — evitate.
 *
 *   4. VALIDARE. După rasterizare se verifică 1200×630 ȘI că imaginea NU e uniformă (un SVG
 *      invalid dă un dreptunghi gol, fără să arunce). Prinde cazul fără să te uiți la 18 fișiere.
 */
import opentype from 'opentype.js';
import sharp from 'sharp';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './continut.mjs';

const W = 1200, H = 630;
// tokenii de design, ca HEX LITERAL (librsvg nu știe var(--...))
const C = { brand: '#5b4dd1', brand2: '#8b5cf6', ink: '#16131f', panel: '#ffffff',
  muted: '#c9c2e6', bgCard: '#f1eefb' };

const fontTitlu = opentype.loadSync(join(ROOT, 'public', 'fonts', 'Poppins-700.ttf'));
const fontCorp = opentype.loadSync(join(ROOT, 'public', 'fonts', 'Poppins-Regular.ttf'));

/** lățimea unui text la o mărime, în px (advanceWidth însumat) */
function latime(font, text, size) {
  return font.getAdvanceWidth(text, size);
}

/**
 * Rupe textul în linii care încap în `maxW`. `maxLinii` plafonează — ce depășește se taie cu „…".
 * Plafonul e cel care ține sub-titlul deasupra subsolului: fără el, un text lung se revărsa
 * peste marginea de jos și peste „magic3d.ro". Prins la prima probă a imaginii OG.
 */
function linii(font, text, size, maxW, maxLinii = Infinity) {
  const cuv = text.split(/\s+/);
  const out = []; let linie = ''; let i = 0;
  for (; i < cuv.length; i++) {
    const proba = linie ? `${linie} ${cuv[i]}` : cuv[i];
    if (latime(font, proba, size) > maxW && linie) {
      out.push(linie); linie = cuv[i];
      if (out.length >= maxLinii) break;   // plafon atins, mai sunt cuvinte
    } else linie = proba;
  }
  const auRamas = i < cuv.length - 1;   // s-a oprit din cauza plafonului, nu a terminat
  if (linie && out.length < maxLinii) out.push(linie);
  if (auRamas) {
    // „…" DOAR când chiar am tăiat text — altfel un titlu care se termină în „." ar da „.…"
    let u = out[out.length - 1];
    while (u && latime(font, u + '…', size) > maxW) u = u.replace(/\s*\S+$/, '');
    out[out.length - 1] = (u || out[out.length - 1]) + '…';
  }
  return out;
}

/** un bloc de text ca <path>-uri, aliniat stânga, întors ca {svg, inaltime} */
function textPath(font, text, size, x, y, maxW, culoare, interlinie = 1.15, maxLinii = Infinity) {
  const ls = linii(font, text, size, maxW, maxLinii);
  const pasY = size * interlinie;
  const paths = ls.map((l, i) => {
    const p = font.getPath(l, x, y + i * pasY, size);
    return `<path d="${p.toPathData(2)}" fill="${culoare}"/>`;
  });
  return { svg: paths.join('\n'), inaltime: ls.length * pasY };
}

/**
 * fișier -> data URI base64, sau null dacă lipsește (nu spargem SVG-ul)
 *
 * ORICE RASTER SE CONVERTEȘTE ÎN PNG ÎNAINTE. librsvg citește PNG și JPEG, dar NU WebP sau AVIF:
 * un `<image href="data:image/webp;...">` nu dă eroare, pur și simplu nu desenează nimic. Prima
 * imagine OG a Academiei a ieșit cu banda violet goală exact așa — fotografiile Academiei sunt
 * importate doar în WebP și AVIF, fiindcă pentru web nu-ți trebuie altceva.
 */
async function dataURI(caleRel) {
  const abs = join(ROOT, caleRel);
  if (!existsSync(abs)) return null;
  const png = /\.png$/i.test(caleRel)
    ? readFileSync(abs)
    : await sharp(abs).png().toBuffer();
  return `data:image/png;base64,${png.toString('base64')}`;
}

/**
 * Construiește SVG-ul unei imagini OG: bandă violet în dreapta cu randarea produsului
 * (sau fundal, dacă lipsește), logo + titlu + o linie de sub-titlu în stânga.
 */
async function svgOG({ titlu, subtitlu, randare }) {
  const logo = await dataURI('public/brand/magic3d-marca.png');
  const randUri = randare ? await dataURI(randare) : null;

  // titlul: cel mult 3 linii, ancorat sus. Sub-titlul: cel mult 2 linii, imediat dedesubt.
  // Subsolul (bară + magic3d.ro) stă fix la ~560, iar plafoanele garantează că textul nu ajunge
  // acolo, indiferent de lungimea în cealaltă limbă.
  const T = textPath(fontTitlu, titlu, 60, 80, 210, 620, C.ink, 1.12, 3);
  const S = textPath(fontCorp, subtitlu, 27, 80, 210 + T.inaltime + 30, 610, '#5a5570', 1.3, 2);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${C.brand}"/>
      <stop offset="1" stop-color="${C.brand2}"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="${C.panel}"/>
  <!-- banda din dreapta: randarea produsului, cu fundal violet dedesubt -->
  <rect x="760" y="0" width="440" height="${H}" fill="url(#g)"/>
  ${randUri
    ? `<image href="${randUri}" x="800" y="115" width="360" height="400" preserveAspectRatio="xMidYMid meet"/>`
    : `<rect x="820" y="175" width="320" height="280" rx="20" fill="#ffffff" opacity="0.14"/>`}
  ${logo ? `<image href="${logo}" x="80" y="72" width="88" height="88"/>` : ''}
  <text x="184" y="130" font-family="Poppins" font-size="34" font-weight="700" fill="${C.ink}">Magic3D</text>
  ${T.svg}
  ${S.svg}
  <rect x="80" y="548" width="56" height="6" rx="3" fill="${C.brand}"/>
  <text x="80" y="592" font-family="Poppins" font-size="24" fill="#5a5570">magic3d.ro</text>
</svg>`;
}

/** rasterizează + VALIDEAZĂ (dimensiuni + non-uniformitate) */
export async function scrieOG(caleIesire, spec) {
  const svg = await svgOG(spec);
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  const meta = await sharp(buf).metadata();
  if (meta.width !== W || meta.height !== H) {
    throw new Error(`OG ${caleIesire}: dimensiuni ${meta.width}×${meta.height}, așteptat ${W}×${H}`);
  }
  // non-uniformitate: un SVG invalid dă un dreptunghi gol. stdev pe canale ~0 = imagine plată.
  const st = await sharp(buf).stats();
  const varianta = Math.max(...st.channels.map((c) => c.stdev));
  if (varianta < 2) {
    throw new Error(`OG ${caleIesire}: imagine aproape uniformă (stdev max ${varianta.toFixed(1)}) — SVG probabil invalid`);
  }
  const abs = join(ROOT, caleIesire);
  mkdirSync(join(abs, '..'), { recursive: true });
  writeFileSync(abs, buf);
  return { cale: caleIesire, kb: Math.round(buf.length / 1024), stdev: +varianta.toFixed(1),
    areRandare: !!(spec.randare && existsSync(join(ROOT, spec.randare))) };
}
