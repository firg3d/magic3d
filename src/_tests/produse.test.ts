/**
 * TEST PERMANENT — PRODUSELE DIN MAGAZIN.
 *
 * Doua lucruri se strica singure in timp, si amandoua costa bani:
 *
 *   1. UN AL DOILEA LINK DE CHECKOUT, scris de mana intr-o pagina. Cand se schimba varianta in
 *      Shopify, cel din produse.ts se actualizeaza si celalalt ramane sa duca la un produs care
 *      nu mai exista. Testul cauta „praktik3d.ro/cart" in tot depozitul si accepta doar fisierele
 *      care AU VOIE sa-l contina.
 *
 *   2. UN PRET RAMAS IN URMA. Numerele din paginile scrise de mana raman in HTML pentru cine are
 *      JavaScript oprit, dar trebuie sa fie aceleasi cu cele din produse.ts. Aici se compara.
 *
 * Rulare:  npm run test:produse
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRODUSE, linkCheckout, pretAfisat, type CheieProdus } from '../core/config/produse.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

let esecuri = 0;
const check = (nume: string, ok: boolean, detaliu = '') => {
  console.log(`${ok ? '  OK  ' : '  ESEC'} ${nume}${detaliu ? '  - ' + detaliu : ''}`);
  if (!ok) esecuri++;
};

console.log('\nLINKUL DE CHECKOUT');
{
  check('licenta, romana', linkCheckout('licenta') === 'https://praktik3d.ro/cart/58784023282009:1',
    linkCheckout('licenta'));
  check('licenta, engleza', linkCheckout('licenta', 'en') === 'https://praktik3d.ro/cart/58784023282009:1?locale=en',
    linkCheckout('licenta', 'en'));
  check('suporter, romana', linkCheckout('suporter') === 'https://praktik3d.ro/cart/58784804766041:1',
    linkCheckout('suporter'));
  check('suporter, engleza', linkCheckout('suporter', 'en') === 'https://praktik3d.ro/cart/58784804766041:1?locale=en',
    linkCheckout('suporter', 'en'));
  check('o limba necunoscuta cade pe romana, nu pe un parametru inventat',
    linkCheckout('licenta', 'de') === linkCheckout('licenta'), linkCheckout('licenta', 'de'));
  for (const [cheie, p] of Object.entries(PRODUSE)) {
    check(`  ${cheie}: linkul contine chiar variantId-ul`, p.checkout.includes(p.variantId), p.checkout);
    check(`  ${cheie}: cantitatea e 1`, p.checkout.endsWith(`:1`), p.checkout);
    check(`  ${cheie}: are sku`, !!p.sku, p.sku);
  }
  check('pretul afisat se compune intr-un singur loc', pretAfisat('licenta') === '149 RON', pretAfisat('licenta'));
}

console.log('\nNICIUN LINK DE CHECKOUT IN AFARA LUI produse.ts');
{
  /** fisierele care au voie sa contina adresa de checkout, si de ce */
  const PERMISE: Record<string, string> = {
    'src/core/config/produse.ts': 'sursa unica',
    'src/_tests/produse.test.ts': 'testul de fata, care o verifica',
    'token.html': 'pagina scrisa de mana: linkul e in HTML pentru cine are JS oprit, si e verificat mai jos',
    'en/token.html': 'la fel, varianta engleza',
    'index.html': 'landing-ul RO, generat din sabloane, care il iau din produse.ts',
    'en/index.html': 'la fel, varianta engleza',
  };
  const IGNORA = new Set(['node_modules', 'dist', '.git', '_sursa', 'incarcari']);
  const gasite: string[] = [];
  (function cauta(dir: string) {
    for (const nume of readdirSync(dir)) {
      if (IGNORA.has(nume)) continue;
      const cale = join(dir, nume);
      if (statSync(cale).isDirectory()) { cauta(cale); continue; }
      if (!/\.(ts|mjs|js|json|html|md)$/.test(nume)) continue;
      if (readFileSync(cale, 'utf8').includes('praktik3d.ro/cart')) {
        gasite.push(relative(ROOT, cale).replace(/\\/g, '/'));
      }
    }
  })(ROOT);

  for (const f of gasite) {
    check(`  ${f}`, f in PERMISE, f in PERMISE ? PERMISE[f] : 'NU are voie sa contina un link de checkout');
  }
  check(`adresa de checkout apare in ${gasite.length} fisiere, toate permise`,
    gasite.every((f) => f in PERMISE), gasite.filter((f) => !(f in PERMISE)).join(', '));
}

console.log('\nPRETURILE DIN PAGINILE SCRISE DE MANA');
{
  // paginile de tokeni pastreaza numerele in HTML pentru crawler si pentru JS oprit; scriptul
  // le rescrie la incarcare din produse.ts, dar daca cele doua diverg, ce vede crawlerul e vechi
  for (const pagina of ['token.html', 'en/token.html']) {
    const html = readFileSync(join(ROOT, pagina), 'utf8');
    for (const cheie of Object.keys(PRODUSE) as CheieProdus[]) {
      const p = PRODUSE[cheie];
      const rx = new RegExp(`data-produs="${cheie}" data-camp="pret">([^<]*)<`, 'g');
      const valori = [...html.matchAll(rx)].map((m) => m[1].trim());
      check(`  ${pagina}: ${cheie} — ${valori.length} locuri cu pret`, valori.length > 0, valori.join(', '));
      check(`    toate spun ${p.pret}`, valori.every((v) => v === String(p.pret)), valori.join(', ') || '-');
    }
    check(`  ${pagina}: linkurile de cumparare se deschid in fila noua`,
      [...html.matchAll(/data-camp="checkout"[\s\S]{0,240}?<\/a>/g)]
        .every((m) => m[0].includes('rel="noopener noreferrer"') && m[0].includes('target="_blank"')));
  }
}

console.log('\nFILA NOUA PE PAGINILE GENERATE');
{
  for (const pagina of ['index.html', 'en/index.html']) {
    const html = readFileSync(join(ROOT, pagina), 'utf8');
    const linkuri = [...html.matchAll(/<a[^>]*praktik3d\.ro\/cart[^>]*>/g)].map((m) => m[0]);
    check(`  ${pagina}: ${linkuri.length} linkuri de checkout`, linkuri.length === 2, String(linkuri.length));
    check('    toate cu target si rel',
      linkuri.every((l) => l.includes('target="_blank"') && l.includes('rel="noopener noreferrer"')));
  }
}

console.log(`\n${esecuri ? `${esecuri} ESECURI` : 'toate verificarile au trecut'}`);
/**
 * `process.exitCode`, NU `process.exit`.
 *
 * Dupa o operatie manifold, `process.exit` taie procesul cat timp WASM-ul inca se inchide, iar
 * libuv crapa pe Windows cu „Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)" si cod 127.
 * Suita raporta ESEC desi toate verificarile trecusera. Vezi regula din docs/design/.
 */
process.exitCode = esecuri ? 1 : 0;
