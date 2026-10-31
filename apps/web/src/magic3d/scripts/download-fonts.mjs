#!/usr/bin/env node
/**
 * Descarcă fonturile din scripts/fonts-list.json de pe Google Fonts, în public/fonts/.
 * RULAT DE TINE, local (containerul agentului nu ajunge la Google Fonts).
 *
 *   node scripts/download-fonts.mjs
 *   node scripts/download-fonts.mjs --only "Roboto,Lora"     # doar anumite familii
 *   node scripts/download-fonts.mjs --force                  # re-descarcă și ce există deja
 *   node scripts/download-fonts.mjs --dir public/fonts       # alt folder țintă
 *
 * Ce face:
 *  - ia lista de greutăți disponibile per familie din metadatele publice Google Fonts
 *    (o singură cerere), ca să nu ceară greutăți inexistente;
 *  - descarcă TOATE greutățile disponibile (inclusiv italic), în format .ttf;
 *  - salvează ca Familie-Greutate.ttf (400 => -Regular.ttf), fără spații în nume;
 *  - la a doua rulare sare peste fișierele care există deja (fără --force);
 *  - la final raportează ce a reușit și ce a eșuat, cu motiv.
 *
 * Necesită Node 18+ (fetch global).
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const argVal = (name, def) => { const i = argv.indexOf(name); return i >= 0 && argv[i + 1] ? argv[i + 1] : def; };
const FORCE = argv.includes('--force');
const ONLY = (argVal('--only', '') || '').split(',').map((s) => s.trim()).filter(Boolean);
const OUT_DIR = resolve(ROOT, argVal('--dir', join('public', 'fonts')));
const LIST_FILE = join(ROOT, 'scripts', 'fonts-list.json');
const METADATA_URL = 'https://fonts.google.com/metadata/fonts';
const CSS_URL = 'https://fonts.googleapis.com/css';
// UA-uri în ordinea preferinței: primul care întoarce .ttf câștigă (Safari vechi primește TTF)
const UAS = [
  'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; en-US) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1',
  'Mozilla/5.0 (Windows NT 5.1; rv:10.0) Gecko/20100101 Firefox/10.0',
  'node-fetch',
];

/**
 * IESIRILE FOLOSESC `process.exitCode` + `return`, NU `process.exit`.
 *
 * Regula e de nucleu (vezi docs/design/): `process.exit` taie procesul cat timp handle-urile
 * inca se inchid. Scriptul asta nu incarca WASM, deci n-ar crapa — dar regula e uniforma tocmai
 * ca sa nu trebuiasca decis de fiecare data care fisier e „sigur". Corpul e invelit in `main()`
 * ca `return` sa poata opri executia acolo unde `process.exit` o oprea.
 */
async function main() {
  if (typeof fetch !== 'function') { console.error('Ai nevoie de Node 18+ (fetch global).'); process.exitCode = 1; return; }
  if (!existsSync(LIST_FILE)) { console.error(`Lipsește ${LIST_FILE}`); process.exitCode = 1; return; }
  mkdirSync(OUT_DIR, { recursive: true });

  const lista = JSON.parse(readFileSync(LIST_FILE, 'utf8'));
  const cerute = [];
  for (const [categorie, familii] of Object.entries(lista.categorii ?? {}))
    for (const f of familii) if (!ONLY.length || ONLY.some((o) => o.toLowerCase() === f.toLowerCase())) cerute.push({ familie: f, categorie });

  if (!cerute.length) { console.error('Nicio familie de descărcat (verifică --only).'); process.exitCode = 1; return; }

  const slug = (s) => s.replace(/[^A-Za-z0-9]/g, '');
  const numeFisier = (familie, weight, italic) => {
    const w = String(weight);
    const suf = w === '400' ? (italic ? 'Italic' : 'Regular') : (italic ? `${w}italic` : w);
    return `${slug(familie)}-${suf}.ttf`;
  };

  async function getText(url, ua) {
    const r = await fetch(url, { headers: { 'User-Agent': ua, 'Accept': 'text/css,*/*' } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.text();
  }

  /** metadatele publice: familie -> greutăți disponibile (o singură cerere) */
  async function metadate() {
    try {
      const r = await fetch(METADATA_URL, { headers: { 'User-Agent': UAS[2] } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const txt = (await r.text()).replace(/^\)\]\}'\s*/, '');   // prefix anti-JSON-hijacking
      const j = JSON.parse(txt);
      const map = new Map();
      for (const f of j.familyMetadataList ?? []) map.set(f.family.toLowerCase(), Object.keys(f.fonts ?? { 400: 1 }));
      return map;
    } catch (e) {
      console.warn(`  ! nu am putut lua metadatele (${e.message}); folosesc greutățile uzuale`);
      return null;
    }
  }

  /** @font-face-urile pentru o familie+greutăți; întoarce [{weight, italic, url}] */
  async function faces(familie, specs) {
    let lastErr = 'necunoscut';
    for (const ua of UAS) {
      try {
        const url = `${CSS_URL}?family=${encodeURIComponent(familie)}:${specs.join(',')}&subset=latin,latin-ext`;
        const css = await getText(url, ua);
        const out = [];
        for (const block of css.split('@font-face').slice(1)) {
          const src = block.match(/url\((https:[^)]+\.ttf)\)/);
          if (!src) continue;
          const w = block.match(/font-weight:\s*(\d+)/);
          const it = /font-style:\s*italic/.test(block);
          out.push({ weight: w ? w[1] : '400', italic: it, url: src[1] });
        }
        if (out.length) return out;
        lastErr = 'răspuns fără .ttf';
      } catch (e) { lastErr = e.message; }
    }
    throw new Error(lastErr);
  }

  async function descarca(url, dest) {
    const r = await fetch(url, { headers: { 'User-Agent': UAS[0] } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 1000) throw new Error('fișier suspect de mic');
    writeFileSync(dest, buf);
    return buf.length;
  }

  // ---------------- rulare ----------------
  console.log(`\nDescărcare fonturi -> ${OUT_DIR}`);
  console.log(`${cerute.length} familii cerute${ONLY.length ? ` (filtru: ${ONLY.join(', ')})` : ''}${FORCE ? ' · --force' : ''}\n`);

  const meta = await metadate();
  const raport = { descarcate: [], sarite: [], esuate: [] };
  let fisiereNoi = 0, octeti = 0;

  for (const { familie, categorie } of cerute) {
    const disponibile = meta?.get(familie.toLowerCase()) ?? null;
    if (meta && !disponibile) {
      raport.esuate.push({ familie, categorie, motiv: 'nu există pe Google Fonts (pune fișierul manual în public/fonts/)' });
      console.log(`  ✗ ${familie.padEnd(24)} nu există pe Google Fonts`);
      continue;
    }
    const specs = (disponibile ?? ['400', '700']).map((k) => String(k).replace('i', 'italic'));
    try {
      const lista2 = await faces(familie, specs);
      let noi = 0, sarite = 0;
      for (const f of lista2) {
        const dest = join(OUT_DIR, numeFisier(familie, f.weight, f.italic));
        if (!FORCE && existsSync(dest) && statSync(dest).size > 1000) { sarite++; continue; }
        try { octeti += await descarca(f.url, dest); noi++; } catch (e) { raport.esuate.push({ familie, categorie, motiv: `${f.weight}${f.italic ? 'i' : ''}: ${e.message}` }); }
      }
      fisiereNoi += noi;
      if (noi) raport.descarcate.push({ familie, categorie, noi, sarite });
      else raport.sarite.push({ familie, categorie, sarite });
      console.log(`  ${noi ? '↓' : '·'} ${familie.padEnd(24)} ${String(noi).padStart(2)} noi, ${String(sarite).padStart(2)} existente  (${lista2.length} greutăți)`);
    } catch (e) {
      raport.esuate.push({ familie, categorie, motiv: e.message });
      console.log(`  ✗ ${familie.padEnd(24)} ${e.message}`);
    }
  }

  console.log('\n' + '─'.repeat(64));
  console.log(`descărcate: ${raport.descarcate.length} familii (${fisiereNoi} fișiere, ${(octeti / 1048576).toFixed(1)} MB)`);
  console.log(`deja existente (sărite): ${raport.sarite.length} familii`);
  if (raport.esuate.length) {
    console.log(`eșuate: ${raport.esuate.length}`);
    for (const f of raport.esuate) console.log(`   ✗ ${f.familie} — ${f.motiv}`);
  }
  console.log(`\nUrmătorul pas: rulează scanarea (npm run scan-tematici) sau apasă „rescanează” în aplicație.\n`);
}

await main();
