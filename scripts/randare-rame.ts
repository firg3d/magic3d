/**
 * IMAGINEA DE PRODUS pentru Rame Tematice — din GEOMETRIA REALĂ, nu dintr-un desen.
 *
 * DE CE ASTA ȘI NU UN TAMPON. `plasator-produs.mjs` pune o plachetă colorată cu numele
 * aplicației, fiindcă o randare WebGL adevărată cere un browser care compune cadre pe ecran.
 * Dar produsul ăsta e plat pe adâncime: patru piese, fiecare o extrudare, așezate una în fața
 * alteia. Proiectate pe planul ecranului și desenate în ordinea adâncimii, siluetele dau exact
 * silueta produsului — aceleași cifre ca în aplicație, doar fără lumini.
 *
 * Ordinea contează și e chiar ordinea din scenă: baza și rama în spate (z 0…6), apoi aura și
 * numele (z 5.2…10.2). Desenate în ordinea asta, ce e în față acoperă ce e în spate.
 *
 *   npx tsx scripts/randare-rame.ts
 */
// @ts-ignore — opentype.js nu are declarații de tip (ca în restul proiectului)
import opentype from 'opentype.js';
import ManifoldModule from 'manifold-3d';
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { configureManifold, buildRama, type RameConfig } from '../src/apps/rame/rame.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const W = 600, H = 450;
const FUNDAL = '#f1eefb', UMBRA = '#d9d1f2';

const wasm: any = await ManifoldModule();
wasm.setup();
configureManifold(wasm);

const b = readFileSync(join(ROOT, 'public', 'fonts', 'GreatVibes-Regular.ttf'));
const font = opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);

const cfg: RameConfig = {
  text: 'Maria', font,
  rama: { tip: 'panza', raza: 50, grosimeFir: 3, colturi: 12, inele: 4, lasare: 0.18 },
  grosimeRama: 6, inaltimeText: 22, grosimeText: 5, latimeAura: 2.5, netezireAura: 2,
  adancimeGravura: 0.8, jocGravura: 0.3,
  lungimeBaza: 120, latimeBaza: 30, inaltimeBaza: 12, adancimeInfigere: 6, jocInfigere: 0.2,
  latimePicior: 25, inaltimePicior: 3,
  placa: { w: 256, d: 256 },
};

const r = buildRama(cfg);
/** piesele în ordinea adâncimii: ce vine mai târziu se desenează peste */
const piese: [any, string][] = [
  [r.baza, '#3A3A3C'], [r.rama, '#3A3A3C'], [r.aura, '#1C1C1E'], [r.text, '#C9A227'],
];

// cadrul: cutia tuturor pieselor, cu o margine
let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
for (const [m] of piese) {
  if (!m) continue;
  const bb = m.boundingBox();
  minX = Math.min(minX, bb.min[0]); maxX = Math.max(maxX, bb.max[0]);
  minY = Math.min(minY, bb.min[1]); maxY = Math.max(maxY, bb.max[1]);
}
const M = 30;
const scara = Math.min((W - 2 * M) / (maxX - minX), (H - 2 * M) / (maxY - minY));
const ox = W / 2 - ((minX + maxX) / 2) * scara;
// jos = y mare în model, deci ecranul primește y direct (nu invers)
const oy = H / 2 - ((minY + maxY) / 2) * scara;

function cale(m: any, culoare: string): string {
  const sil = m.project();
  const d = (sil.toPolygons() as [number, number][][])
    .map((inel) => 'M' + inel.map(([x, y]) => `${(ox + x * scara).toFixed(1)},${(oy + y * scara).toFixed(1)}`).join('L') + 'Z')
    .join('');
  sil.delete();
  return `<path d="${d}" fill="${culoare}" fill-rule="evenodd"/>`;
}

const yTalpa = oy + maxY * scara;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${FUNDAL}"/>
  <ellipse cx="${W / 2}" cy="${yTalpa.toFixed(1)}" rx="${((maxX - minX) * scara) / 2}" ry="9" fill="${UMBRA}"/>
  ${piese.filter(([m]) => m).map(([m, c]) => cale(m, c)).join('\n  ')}
</svg>`;

const buf = await sharp(Buffer.from(svg)).png().toBuffer();
const meta = await sharp(buf).metadata();
if (meta.width !== W || meta.height !== H) throw new Error(`dimensiune ${meta.width}×${meta.height}`);
const stats = await sharp(buf).stats();
if (stats.channels.every((c: any) => c.stdev < 2)) throw new Error('imagine uniformă — SVG invalid?');
writeFileSync(join(ROOT, 'public', 'produse', 'rame-tematice.png'), buf);
console.log(`  rame-tematice.png  ${meta.width}×${meta.height}  (siluete din geometria reală)`);
