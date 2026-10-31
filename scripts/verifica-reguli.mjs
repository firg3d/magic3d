/**
 * VERIFICAREA REGULILOR DE COD, rulata in CI si de hook-ul de pre-commit.
 *
 * Deocamdata una singura, dar locul e pregatit pentru urmatoarele.
 *
 * 1. `process.exit(` interzis in scripturi si teste.
 *
 *    Dupa o operatie manifold, `process.exit` taie procesul cat timp WASM-ul inca se inchide,
 *    iar libuv crapa pe Windows cu „Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)" si
 *    cod 127 — suita raporteaza ESEC desi toate verificarile au trecut. Izolat: `add` + `exit`
 *    = 127, `add` + `exitCode` = 0.
 *
 *    Regula e UNIFORMA, nu doar pentru fisierele care incarca WASM: altfel ar trebui decis de
 *    fiecare data care fisier e „sigur", iar verificarea n-ar mai fi una simpla.
 *
 *    Inlocuirea nu e mecanica peste tot: acolo unde iesirea era TIMPURIE, `exitCode` singur ar
 *    lasa scriptul sa mearga mai departe. Fisierele acelea sunt invelite in `main()`, ca
 *    `return` sa opreasca executia exact unde o oprea `exit`.
 *
 * Rulare:  npm run verifica:reguli
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ZONE = ['scripts', 'src'];
const IGNORA = new Set(['node_modules', 'dist', '.git']);

function fisiere(dir, out = []) {
  for (const n of readdirSync(dir)) {
    if (IGNORA.has(n)) continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) fisiere(p, out);
    else if (/\.(ts|mjs|js)$/.test(n)) out.push(p);
  }
  return out;
}

/**
 * Verificarea se sare PE EA INSASI.
 *
 * Mesajele ei numesc tiparul interzis ca sa poata fi citite de om, deci s-ar reclama singura.
 * E singura scutire, si e aici, la vedere — nu o lista de exceptii care creste in tacere.
 */
const EU = join(ROOT, 'scripts', 'verifica-reguli.mjs');

const gasite = [];
for (const z of ZONE) {
  for (const p of fisiere(join(ROOT, z))) {
    if (p === EU) continue;
    const linii = readFileSync(p, 'utf8').split('\n');
    linii.forEach((linie, i) => {
      /**
       * Comentariile pot vorbi DESPRE regula fara s-o incalce.
       *
       * Terminatia de linie se taie INTAI. Fisierele au CRLF, iar in JavaScript punctul din
       * expresiile regulate NU potriveste retur-de-car — deci tiparul de comentariu se oprea
       * inainte de sfarsitul liniei si nu prindea nimic. Efectul: verificarea se reclama pe ea
       * insasi, aratand un comentariu care vorbeste despre regula drept incalcare a ei.
       */
      const curat = linie.replace(/\r$/, '');
      const faraComentariu = curat.replace(/\/\/.*$/, '').replace(/^\s*\*.*$/, '');
      if (/process\.exit\s*\(/.test(faraComentariu)) {
        gasite.push(`${relative(ROOT, p).split(String.fromCharCode(92)).join('/')}:${i + 1}  ${linie.trim()}`);
      }
    });
  }
}

console.log('\nREGULI DE COD');
if (gasite.length) {
  console.error(`\n  process.exit( interzis — ${gasite.length} aparitii:\n`);
  for (const g of gasite) console.error('    ' + g);
  console.error('\n  Foloseste `process.exitCode = n`. Daca iesirea e TIMPURIE, inveleste corpul');
  console.error('  in `async function main()` si scrie `process.exitCode = n; return;`.\n');
  process.exitCode = 1;
} else {
  console.log('  ✓ niciun process.exit( in scripturi sau teste\n');
}
