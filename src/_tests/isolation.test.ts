/**
 * TEST DE IZOLARE ÎNTRE APLICAȚII
 *
 * Verifică arhitectura din docs/roadmap.md:
 *   1. Fiecare aplicație se încarcă independent pe PAGINA EI (un singur modul de
 *      intrare per pagină .html). O eroare pe o pagină nu poate rula codul alteia.
 *   2. `core/` NU importă din `apps/`  (nucleul nu depinde de nicio aplicație).
 *   3. `apps/A` NU importă din `apps/B` (o eroare într-o aplicație nu poate ajunge
 *      în alta — sunt complet decuplate).
 *   4. Fiecare aplicație (apps/<x>/main.ts) are exact o pagină care o încarcă.
 *
 * Rulare:  npm run test:isolation   (sau: npx tsx src/_tests/isolation.test.ts)
 * Iese cu cod 1 dacă vreo regulă e încălcată.
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(ROOT, 'src');
const rel = (p: string) => relative(ROOT, p).replace(/\\/g, '/');

const failures: string[] = [];
const checks: string[] = [];
const ok = (m: string) => checks.push('  ✓ ' + m);
const fail = (m: string) => failures.push('  ✗ ' + m);

// ---------- utilitare ----------
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.ts$/.test(name)) out.push(p);
  }
  return out;
}
/** specificatorii tuturor importurilor (static, dinamic, export-from) */
function importSpecs(code: string): string[] {
  const specs: string[] = [];
  const re = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s*['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) specs.push(m[1] || m[2] || m[3]);
  return specs;
}
/** zona unui fișier: 'core', numele aplicației, sau null */
function zoneOf(absPath: string): { kind: 'core' | 'app' | 'other'; app?: string } {
  const r = rel(absPath);
  if (r.startsWith('src/core/')) return { kind: 'core' };
  const m = r.match(/^src\/apps\/([^/]+)\//);
  if (m) return { kind: 'app', app: m[1] };
  return { kind: 'other' };
}

// ---------- 1 + 4: pagini .html -> modul de intrare unic ----------
const htmlFiles = readdirSync(ROOT).filter((f) => /\.html$/.test(f));
const pageEntry = new Map<string, string>();   // pagină -> entry app
for (const html of htmlFiles) {
  const code = readFileSync(join(ROOT, html), 'utf8');
  const mods = [...code.matchAll(/<script[^>]*type=["']module["'][^>]*src=["']([^"']+)["']/g)].map((m) => m[1]);
  if (mods.length === 0) continue;               // ex. index.html (static, fără app)
  if (mods.length > 1) fail(`${html}: încarcă ${mods.length} module de intrare (așteptat 1 per pagină): ${mods.join(', ')}`);
  const entry = mods[0].replace(/^\//, '');
  // intrarea aplicațiilor trăiește în src/apps/; paginile de marketing (landing) își
  // servesc scriptul din public/ — o rezolvăm și acolo înainte de a decide că lipsește.
  const abs = existsSync(join(ROOT, entry)) ? join(ROOT, entry)
    : existsSync(join(ROOT, 'public', entry)) ? join(ROOT, 'public', entry) : '';
  if (!abs) { fail(`${html}: modulul de intrare ${entry} nu există`); continue; }
  const z = zoneOf(abs);
  // pagină statică de marketing (script din public/, nu o aplicație) — nu i se cere ecran de app
  if (z.kind !== 'app') { ok(`${html}: pagină statică (${entry})`); continue; }
  pageEntry.set(html, z.app!); ok(`${html} -> aplicația „${z.app}" (încărcare independentă)`);
}

// fiecare aplicație cu main.ts trebuie să aibă exact o pagină care o încarcă
const appDirs = existsSync(join(SRC, 'apps'))
  ? readdirSync(join(SRC, 'apps')).filter((d) => existsSync(join(SRC, 'apps', d, 'main.ts')))
  : [];
for (const app of appDirs) {
  const pages = [...pageEntry.entries()].filter(([, a]) => a === app).map(([p]) => p);
  if (pages.length === 0) fail(`aplicația „${app}" nu are pagină .html proprie (ecran propriu obligatoriu)`);
  else if (pages.length > 1) fail(`aplicația „${app}" e încărcată de ${pages.length} pagini: ${pages.join(', ')}`);
  else ok(`aplicația „${app}" are exact o pagină: ${pages[0]}`);
}

// ---------- 2 + 3: direcția importurilor ----------
let coreClean = true, appsClean = true;
for (const file of walk(SRC)) {
  if (rel(file).startsWith('src/_tests/')) continue;
  const z = zoneOf(file);
  if (z.kind === 'other') continue;
  const dir = dirname(file);
  for (const spec of importSpecs(readFileSync(file, 'utf8'))) {
    if (!spec.startsWith('.')) continue;                     // importuri npm — ignorate
    const target = resolve(dir, spec);
    const tz = zoneOf(target);
    if (z.kind === 'core' && tz.kind === 'app') {
      fail(`core importă din aplicație: ${rel(file)} -> ${spec}`); coreClean = false;
    }
    if (z.kind === 'app' && tz.kind === 'app' && tz.app !== z.app) {
      fail(`import încrucișat între aplicații: ${rel(file)} -> ${spec} (apps/${tz.app})`); appsClean = false;
    }
  }
}
if (coreClean) ok('core/ nu importă din nicio aplicație');
if (appsClean) ok('nicio aplicație nu importă din altă aplicație');

// ---------- raport ----------
console.log('\nTEST DE IZOLARE ÎNTRE APLICAȚII\n');
console.log(checks.join('\n') || '  (nicio verificare)');
if (failures.length) {
  console.error('\nEȘECURI:\n' + failures.join('\n') + '\n');
  // vezi regula din docs/design/: process.exit dupa manifold crapa libuv pe Windows
  process.exitCode = 1;
} else {
  console.log(`\n✅ Izolare OK — ${appDirs.length} aplicații, ${pageEntry.size} pagini independente.\n`);
}
