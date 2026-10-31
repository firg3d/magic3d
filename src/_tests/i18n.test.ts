/**
 * TEST PERMANENT — FĂRĂ TEXT SCRIS DIRECT ÎN COD.
 *
 * Tot textul vizibil trece prin dicționar (src/core/i18n/ro.json) și funcția t().
 * Testul parsează fiecare .ts din core/ și apps/ cu compilatorul TypeScript și caută
 * ȘIRURI (nu comentarii — comentariile rămân în română, intenționat) care conțin
 * diacritice românești. Fiecare astfel de șir e text scăpat în cod.
 *
 * Verifică în plus integritatea dicționarului: chei folosite dar inexistente și
 * chei definite dar nefolosite.
 *
 * Rulare:  npm run test:i18n
 */
import ts from 'typescript';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(ROOT, 'src');
const DIACRITICE = /[ăâîșțĂÂÎȘȚşţŞŢ]/;

/**
 * Excepții. Fiecare are motiv scris — dacă motivul nu convinge, textul trebuie mutat în dicționar.
 * `fisier` se potrivește pe prefix, ca să acopere un modul întreg unde e justificat.
 */
const PERMISE: { fisier: string; motiv: string }[] = [
  { fisier: 'core/assets/scan.ts', motiv: 'unealtă de dezvoltare: scrie în terminal la scanare, nu în interfață' },
  { fisier: 'core/i18n/index.ts', motiv: 'avertismentul de cheie lipsă, din chiar modulul de traduceri' },
];
/** o singură literă („ș", „Ă") e DATĂ — setul de diacritice verificat în glifele fontului */
const esteCaracterIzolat = (s: string) => [...s].length === 1;

function fisiereTS(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) { if (n !== 'node_modules' && n !== '_tests') fisiereTS(p, out); }
    else if (n.endsWith('.ts') && !n.endsWith('.d.ts')) out.push(p);
  }
  return out;
}

const scapate: { fisier: string; linie: number; text: string }[] = [];
const cheiFolosite = new Set<string>();

for (const zona of ['core', 'apps']) {
  for (const f of fisiereTS(join(SRC, zona))) {
    const rel = relative(SRC, f).replace(/\\/g, '/');
    const sf = ts.createSourceFile(f, readFileSync(f, 'utf8'), ts.ScriptTarget.ESNext, true);
    const vizita = (n: ts.Node) => {
      // chei folosite: t('...')
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && (n.expression.text === 't' || n.expression.text === 'tr')
        && n.arguments[0] && ts.isStringLiteralLike(n.arguments[0])) cheiFolosite.add((n.arguments[0] as ts.StringLiteralLike).text);
      // șiruri cu diacritice = text scăpat
      const esteSir = ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateHead(n)
        || ts.isTemplateMiddle(n) || ts.isTemplateTail(n);
      if (esteSir && DIACRITICE.test((n as any).text)) {
        const txt = (n as any).text.trim();
        if (!esteCaracterIzolat(txt) && !PERMISE.some((p) => rel === p.fisier)) {
          scapate.push({ fisier: rel, linie: sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1, text: txt.slice(0, 90) });
        }
      }
      ts.forEachChild(n, vizita);
    };
    vizita(sf);
  }
}

// ---- integritatea dicționarului ----
const dictPath = join(SRC, 'core', 'i18n', 'ro.json');
const dict = JSON.parse(readFileSync(dictPath, 'utf8')) as Record<string, any>;
const chei = new Set<string>();
(function plat(o: any, prefix = '') {
  for (const [k, v] of Object.entries(o)) {
    const cheie = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) plat(v, cheie); else chei.add(cheie);
  }
})(dict);

const lipsa = [...cheiFolosite].filter((k) => !chei.has(k)).sort();
const nefolosite = [...chei].filter((k) => !cheiFolosite.has(k)).sort();

console.log(`\nDicționar: ${chei.size} chei · folosite direct prin t('...'): ${cheiFolosite.size}`);
if (scapate.length) {
  console.log(`\n❌ TEXT SCRIS DIRECT ÎN COD (${scapate.length}):`);
  for (const s of scapate) console.log(`   ${s.fisier}:${s.linie}  „${s.text}"`);
} else console.log('✓ niciun șir cu diacritice în afara dicționarului');

if (lipsa.length) { console.log(`\n❌ CHEI FOLOSITE DAR INEXISTENTE (${lipsa.length}):`); for (const k of lipsa) console.log(`   ${k}`); }
else console.log('✓ toate cheile folosite există în dicționar');

// cheile compuse dinamic (t(`obiect.${tip}`)) nu apar în scanare -> doar informativ
if (nefolosite.length) console.log(`\nℹ chei nefolosite direct (pot fi compuse dinamic): ${nefolosite.length}\n   ${nefolosite.join(', ')}`);

// ---- ENGLEZA ACOPERĂ ROMÂNA ----
//
// Două verificări, amândouă pentru defecte care nu se văd la dezvoltator:
//
//   1. ACOPERIREA. O cheie nouă scrisă doar în română cade pe română în interfața engleză —
//      `t()` are plasa asta intenționat, ca ecranul să nu arate „piesa.statusCade". Dar plasa
//      nu trebuie să devină starea normală, așa că aici lipsa e eșec, nu avertisment.
//
//   2. PARAMETRII. `{n}`, `{litere}`, `{mm}` sunt înlocuiți la randare. Un parametru scris
//      greșit sau pierdut la traducere lasă acolada goală pe ecran — „{unghi}° înclinare" —
//      și se vede abia la client, fiindcă nimeni nu citește toate cele 1178 de rânduri.
const dictEn = JSON.parse(readFileSync(join(SRC, 'core', 'i18n', 'en.json'), 'utf8')) as Record<string, any>;
const platEn = new Map<string, string>();
(function plat(o: any, prefix = '') {
  for (const [k, v] of Object.entries(o)) {
    const cheie = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) plat(v, cheie); else platEn.set(cheie, String(v));
  }
})(dictEn);
const platRo = new Map<string, string>();
(function plat(o: any, prefix = '') {
  for (const [k, v] of Object.entries(o)) {
    const cheie = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) plat(v, cheie); else platRo.set(cheie, String(v));
  }
})(dict);

const netraduse = [...platRo.keys()].filter((k) => !platEn.has(k)).sort();
const inPlusEn = [...platEn.keys()].filter((k) => !platRo.has(k)).sort();
const parametri = (s: string) => [...new Set(s.match(/\{(\w+)\}/g) ?? [])].sort().join(',');
const parametriDiferiti = [...platRo.entries()]
  .filter(([k, v]) => platEn.has(k) && parametri(v) !== parametri(platEn.get(k)!))
  .map(([k, v]) => `${k}: ro {${parametri(v)}} vs en {${parametri(platEn.get(k)!)}}`);

if (netraduse.length) { console.log(`
❌ CHEI FĂRĂ TRADUCERE ÎN EN (${netraduse.length}):`); for (const k of netraduse.slice(0, 30)) console.log(`   ${k}`); }
else console.log(`✓ engleza acoperă toate cele ${platRo.size} chei`);
if (inPlusEn.length) { console.log(`
❌ CHEI ÎN EN CARE NU EXISTĂ ÎN RO (${inPlusEn.length}):`); for (const k of inPlusEn.slice(0, 30)) console.log(`   ${k}`); }
if (parametriDiferiti.length) { console.log(`
❌ PARAMETRI DIFERIȚI ÎNTRE LIMBI (${parametriDiferiti.length}):`); for (const k of parametriDiferiti.slice(0, 30)) console.log(`   ${k}`); }
else console.log('✓ aceiași parametri în ambele limbi');

const esec = scapate.length + lipsa.length + netraduse.length + inPlusEn.length + parametriDiferiti.length;
console.log(esec ? `\n${esec} probleme\n` : '\n✅ i18n curat.\n');
/**
 * `process.exitCode`, NU `process.exit`.
 *
 * Dupa o operatie manifold, `process.exit` taie procesul cat timp WASM-ul inca se inchide, iar
 * libuv crapa pe Windows cu „Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)" si cod 127.
 * Suita raporta ESEC desi toate verificarile trecusera. Vezi regula din docs/design/.
 */
process.exitCode = esec ? 1 : 0;
