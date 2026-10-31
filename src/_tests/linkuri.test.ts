/**
 * TEST DE LINKURI INTERNE — niciun link din site nu duce în 404.
 *
 * DE CE EXISTĂ. La pregătirea pentru publicare, `landing.html` a devenit `index.html`. Trei
 * linkuri au rămas în urmă, printre ele LOGOUL din bara de sus a fiecărei aplicații — adică
 * exact calea pe care o apasă omul ca să se întoarcă acasă. Buildul a trecut, testele au trecut,
 * și s-a văzut abia pe serverul live. Un link mort nu strică nimic la compilare: e doar un șir
 * de caractere până în clipa în care cineva dă click pe el.
 *
 * CE VERIFICĂ. Fiecare adresă internă scrisă în paginile HTML de mână/generate și în sursele
 * TypeScript trebuie să corespundă unui fișier care chiar există în depozit.
 *
 * CE NU POATE VEDEA. Adresele compuse la rulare din bucăți (`'/' + nume + '.html'`). Aici se
 * verifică ce e scris ca literal. `aplicatii.ts` ține căile aplicațiilor ca literali tocmai ca
 * să intre sub verificarea asta.
 *
 * Rulare:  npm run test:linkuri
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const rel = (p: string) => relative(ROOT, p).replace(/\\/g, '/');

const failures: string[] = [];
const checks: string[] = [];
const ok = (m: string) => checks.push('  ✓ ' + m);
const fail = (m: string) => failures.push('  ✗ ' + m);

/** directoarele în care stă site-ul; `dist/` e rezultatul, nu sursa */
const IGNORA = new Set(['node_modules', 'dist', '.git', 'out', 'content', 'docs']);

function walk(dir: string, potrivit: RegExp, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (IGNORA.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, potrivit, out);
    else if (potrivit.test(name)) out.push(p);
  }
  return out;
}

/**
 * Unde caută serverul o adresă.
 *
 * `/` și `/en/` ajung la `index.html` din directorul respectiv — comportamentul implicit al
 * oricărui server web pentru un director. Restul se caută întâi în rădăcina depozitului (acolo
 * stau paginile de aplicație și cele generate), apoi în `public/`, al cărui conținut e copiat
 * ca atare în build.
 */
function existaTinta(adresa: string): boolean {
  const cale = adresa.replace(/[?#].*$/, '').replace(/^\//, '');
  // o adresă cu „/" la final e ori o pagină (`/en/` → `en/index.html`), ori un prefix de
  // resurse din care se compun URL-uri la rulare (`/tematici/` → `public/tematici/`)
  const candidati = cale.endsWith('/') ? [join(cale, 'index.html'), cale] : [cale];
  for (const c of candidati) {
    if (existsSync(join(ROOT, c))) return true;
    if (existsSync(join(ROOT, 'public', c))) return true;
  }
  return false;
}

/** true dacă poziția `idx` din `cod` cade într-un comentariu de linie sau de bloc */
function inComentariu(cod: string, idx: number): boolean {
  const inceputLinie = cod.lastIndexOf('\n', idx) + 1;
  const inainte = cod.slice(inceputLinie, idx);
  return /^\s*\*/.test(inainte) || inainte.includes('//');
}

/**
 * Ce nu se verifică: adrese externe, ancore, protocoale, și `/assets/` — acela e produs de
 * bundler cu hash în nume, nu există în sursă.
 */
const SARIT = /^(https?:|mailto:|tel:|#|\/\/|\/assets\/|data:|javascript:)/;

// ---------- 1. paginile HTML ----------
const pagini = walk(ROOT, /\.html$/);
let totalHtml = 0;
for (const f of pagini) {
  const cod = readFileSync(f, 'utf8');
  for (const m of cod.matchAll(/(?:href|src|action)\s*=\s*"([^"]+)"/g)) {
    const adresa = m[1];
    if (!adresa.startsWith('/') || SARIT.test(adresa)) continue;
    totalHtml++;
    if (!existaTinta(adresa)) {
      const linie = cod.slice(0, m.index).split('\n').length;
      fail(`${rel(f)}:${linie} → ${adresa} nu există`);
    }
  }
}
if (!failures.length) ok(`${totalHtml} adrese interne în ${pagini.length} pagini HTML, toate rezolvă`);

// ---------- 2. sursele TypeScript ----------
const surse = walk(join(ROOT, 'src'), /\.ts$/);
let totalTs = 0;
for (const f of surse) {
  const cod = readFileSync(f, 'utf8');
  // literali care arată a pagină: '/ceva.html' sau '/ceva/'
  for (const m of cod.matchAll(/['"`](\/[a-z0-9\-/]*\.html|\/[a-z0-9\-]+\/)['"`]/gi)) {
    const adresa = m[1];
    if (SARIT.test(adresa)) continue;
    if (inComentariu(cod, m.index!)) continue;   // comentariile nu sunt linkuri
    totalTs++;
    if (!existaTinta(adresa)) {
      const linie = cod.slice(0, m.index).split('\n').length;
      fail(`${rel(f)}:${linie} → ${adresa} nu există`);
    }
  }
}
ok(`${totalTs} adrese interne scrise în surse TypeScript`);

// ---------- 3. numele mort ----------
// `landing.html` a existat până la pregătirea pentru publicare. Dacă reapare undeva, e o
// referință rămasă în urmă, nu un fișier nou.
for (const f of [...pagini, ...surse]) {
  const cod = readFileSync(f, 'utf8');
  const idx = cod.indexOf('landing.html');
  if (idx < 0) continue;
  if (inComentariu(cod, idx)) continue;   // comentariile istorice sunt permise
  const linie = cod.slice(0, idx).split('\n').length;
  fail(`${rel(f)}:${linie} → „landing.html" nu mai există; pagina de start e „/"`);
}

// ---------- 4. fiecare pagină e înregistrată în vite.config.ts ----------
/**
 * O PAGINĂ CARE NU E ÎN `vite.config.ts` NU AJUNGE ÎN BUILD — și dă 404 la client.
 *
 * Comentariul din vite.config.ts spunea deja „o aplicație nouă TREBUIE adăugată aici", și
 * adăuga: „testul de izolare verifică deja că fiecare aplicație are exact o pagină; dacă adaugi
 * una și uiți linia de mai jos, se vede la prima încărcare a buildului". Se vedea, dar nimeni
 * nu verifica: `huse.html` a stat neînregistrat de la HUS.1 până la HUS.2, iar toate suitele
 * erau verzi. O instrucțiune scrisă într-un comentariu nu e o plasă de siguranță.
 */
const { APLICATII } = await import('../core/config/aplicatii.js');
const vite = readFileSync(join(ROOT, 'vite.config.ts'), 'utf8');
const inputBloc = vite.slice(vite.indexOf('input: {'), vite.indexOf('},', vite.indexOf('input: {')));
const inregistrate = new Set([...inputBloc.matchAll(/resolve\(__dirname,\s*'([^']+)'\)/g)].map((m) => m[1]));

/**
 * `public/` se COPIAZĂ de Vite ca atare, nu se construiește: paginile de acolo — 404.html — n-au
 * ce căuta în `input` și nu lipsesc din build dacă nu-s trecute.
 */
const deInregistrat = pagini
  .map((f) => rel(f))
  .filter((r) => !r.startsWith('public/') && !r.startsWith('docs/'));
const lipsa = deInregistrat.filter((r) => !inregistrate.has(r));
if (lipsa.length) {
  for (const r of lipsa) fail(`${r} nu e în vite.config.ts — n-ar ajunge în build`);
} else {
  ok(`toate cele ${deInregistrat.length} pagini sunt înregistrate în vite.config.ts`);
}
const fantome = [...inregistrate].filter((r) => !existsSync(join(ROOT, r)));
if (fantome.length) for (const r of fantome) fail(`vite.config.ts trimite la ${r}, care nu există`);

// ---------- 5. aplicatiile ascunse nu apar in UI, dar raman in build ----------
/**
 * O APLICAȚIE ASCUNSĂ E ASCUNSĂ ÎN TOATE CELE TREI LOCURI, sau în niciunul.
 *
 * Ascunderea atinge patru fișiere: registrul de aplicații (comutatorul), conținutul site-ului
 * (grila de pe prima pagină), generatorul de pagini și `vite.config.ts`. Trei din patru înseamnă
 * o aplicație care nu apare în grilă dar are pagină publică indexabilă — adică exact ce voiam să
 * evităm, doar mai greu de observat.
 *
 * Și invers: pagina APLICAȚIEI trebuie să rămână în build. Ascuns nu înseamnă șters — se ajunge
 * la ea direct pe adresă, pentru dezvoltare.
 */
const ascunse = APLICATII.filter((a) => a.ascuns);
for (const ap of ascunse) {
  const numeFisier = ap.href.replace(/^\//, '');
  if (inregistrate.has(numeFisier)) {
    ok(`${ap.href} e ascunsă din UI dar rămâne în build (se ajunge direct pe adresă)`);
  } else {
    fail(`${ap.href} e ascunsă, dar a fost scoasă și din vite.config.ts — nu mai e accesibilă deloc`);
  }

  /** nicio pagină generată nu mai duce la ea */
  for (const f of pagini) {
    const html = readFileSync(f, 'utf8');
    if (html.includes(`href="${ap.href}"`)) {
      fail(`${rel(f)} trimite la ${ap.href}, dar aplicația e ascunsă`);
    }
  }
}
if (ascunse.length) ok(`${ascunse.length} aplicație/aplicații ascunse, niciuna linkată din paginile generate`);

// ---------- raport ----------
console.log('\n─── LINKURI INTERNE ───');
for (const c of checks) console.log(c);
if (failures.length) {
  console.error('\n─── LINKURI MOARTE ───');
  for (const f of failures) console.error(f);
  console.error(`\n${failures.length} link(uri) duc în 404.\n`);
  // vezi regula din docs/design/: process.exit dupa manifold crapa libuv pe Windows
  process.exitCode = 1;
} else {
  console.log('\n✓ niciun link intern mort\n');
}
