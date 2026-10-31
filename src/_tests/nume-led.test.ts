/**
 * TEST PERMANENT — NUME LED
 *
 * Verificările sunt puse pe greșelile CARE S-AU FĂCUT la construcția aplicației, nu pe o listă
 * teoretică. Toate trei au trecut de compilare și de citit:
 *
 *   1. SFATUL E ADEVĂRAT. `ingrosareaCareMerge` a dat de două ori un răspuns fals — o dată prea
 *      mare (formula închisă pentru raza înscrisă ignoră închiderea morfologică), o dată prea
 *      mare din altă cauză (scurtătura cu un singur offset). Amândouă compilau. Testul cere ca
 *      valoarea întoarsă să fie CONFIRMATĂ de construcția 3D, iar treapta de dedesubt să fie
 *      respinsă de ea — adică e chiar MINIMUL, nu doar o valoare care merge.
 *   2. FAȚA INTRĂ ÎN CORP fără coliziune, în poziția de montaj, ca la Litere LED.
 *   3. AVERTISMENTUL DE PLACĂ E ADEVĂRAT: la înălțimea propusă cuvântul chiar încape.
 *
 * Plus invarianții de montaj: pe masă stabilitatea se măsoară, pe perete nu.
 *
 * Rulare:  npm run test:numeled
 */
// @ts-ignore — opentype.js nu are declarații de tip (ca în restul proiectului)
import opentype from 'opentype.js';
import ManifoldModule from 'manifold-3d';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { configureManifold, buildNumeLed, ingrosareaCareMerge, pentruPrint,
  PAS_INGROSARE, type NumeLedConfig } from '../apps/nume-led/nume-led.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FONT_DIR = join(ROOT, 'public', 'fonts');

const failures: string[] = [];
const checks: string[] = [];
const ok = (m: string) => checks.push('  ✓ ' + m);
const fail = (m: string) => failures.push('  ✗ ' + m);

const mod = await ManifoldModule();
mod.setup();
configureManifold(mod);

const incarca = (f: string) => opentype.parse(readFileSync(join(FONT_DIR, f)).buffer);

/** parametrii IMPLICIȚI ai aplicației — testul apără configurația cu care se deschide */
const IMPLICIT = {
  inaltimeLitera: 80, adancimeCorp: 25, grosimePerete: 2, grosimeSpate: 2, latimeBanda: 10,
  tipBanda: 60 as const, latimePrag: 1.2, adancimePrag: 2, grosimeFata: 1.6, jocFata: 0.2,
  diametruCanal: 4, pozitieCanal: 'spate' as const, locCanal: 'jos' as const,
  tipAgatare: 'cheie' as const, surubCap: 5, surubTija: 2.5, inaltimeCapSurub: 3,
  latimeGrila: 20, placa: { w: 256, d: 256 },
};

const CAZURI: [string, string][] = [
  ['GreatVibes-Regular.ttf', 'Maria'],
  ['DancingScript-700.ttf', 'Ana'],
  ['Pacifico-Regular.ttf', 'Luca'],
  ['Baloo2-700.ttf', 'Ema'],
];
const disponibile = CAZURI.filter(([f]) => existsSync(join(FONT_DIR, f)));
if (disponibile.length < CAZURI.length) {
  console.log(`  ℹ ${CAZURI.length - disponibile.length} font(uri) lipsesc, se sar`);
}

const construieste = (font: any, text: string, ingrosare: number, modProdus: 'masa' | 'perete' = 'perete') =>
  buildNumeLed({ ...IMPLICIT, text, font, ingrosare, modProdus } as unknown as NumeLedConfig);

console.log(`\nTEST NUME LED — ${disponibile.length} cazuri (literă ${IMPLICIT.inaltimeLitera} mm)\n`);

for (const [fisier, text] of disponibile) {
  const font = incarca(fisier);
  const et = `${fisier.replace(/\.[to]tf$/i, '')} „${text}"`;

  // ---------- 1. SFATUL E ADEVĂRAT, ȘI E MINIMUL ----------
  const k = ingrosareaCareMerge(font, text, IMPLICIT.inaltimeLitera,
    IMPLICIT.grosimePerete, IMPLICIT.latimePrag, IMPLICIT.latimeBanda);
  if (k < 0) {
    ok(`${et} — niciun prag în plajă; sfatul o spune, nu inventează o valoare`);
  } else {
    const la = construieste(font, text, k);
    const bun = la.cuvant.bucati === 1 && la.cuvant.camereUtile >= 1;
    if (bun) ok(`${et} — sfatul ${k} mm confirmat de construcție: 1 bucată, ${la.cuvant.camereUtile} cameră(e) utilă(e)`);
    else fail(`${et} — sfatul spune ${k} mm, dar construcția dă ${la.cuvant.bucati} bucăți și ${la.cuvant.camereUtile} camere utile`);

    // ...și e chiar MINIMUL: cu o treaptă mai jos nu trebuie să meargă
    if (k >= PAS_INGROSARE) {
      const subK = +(k - PAS_INGROSARE).toFixed(2);
      const jos = construieste(font, text, subK);
      const mergeSiJos = jos.cuvant.bucati === 1 && jos.cuvant.camereUtile >= 1;
      if (mergeSiJos) fail(`${et} — sfatul ${k} mm nu e minimul: merge și la ${subK} mm`);
      else ok(`${et} — ${k} mm e minimul; la ${subK} mm nu merge`);
    }

    // ---------- 2. FAȚA INTRĂ ÎN CORP ----------
    if (la.corpFata) {
      if (la.diagnostice.fata.coliziuneMM3 === 0) ok(`${et} — fața intră în locaș, coliziune zero`);
      else fail(`${et} — fața se lovește de corp: ${la.diagnostice.fata.coliziuneMM3} mm³`);
      if (la.diagnostice.fata.sprijinMM > 0) ok(`${et} — fața se sprijină pe ${la.diagnostice.fata.sprijinMM.toFixed(2)} mm de prag`);
      else fail(`${et} — fața n-are pe ce sta: sprijin ${la.diagnostice.fata.sprijinMM} mm`);
    }

    // ---------- 3. AVERTISMENTUL DE PLACĂ E ADEVĂRAT ----------
    const p = la.cuvant.potrivire;
    if (!p.incape && p.inaltimeMaxMM > 0) {
      const mic = buildNumeLed({ ...IMPLICIT, text, font, ingrosare: k, modProdus: 'perete',
        inaltimeLitera: p.inaltimeMaxMM } as unknown as NumeLedConfig);
      if (mic.cuvant.potrivire.incape) ok(`${et} — „încape până la ${p.inaltimeMaxMM} mm" verificat prin reconstrucție`);
      else fail(`${et} — sfatul de placă minte: la ${p.inaltimeMaxMM} mm tot nu încape`);
    }

    // ---------- 4. MONTAJUL ----------
    const masa = construieste(font, text, k, 'masa');
    if (masa.cuvant.stabilitate) ok(`${et} — pe masă stabilitatea se măsoară (sprijin ${masa.cuvant.stabilitate.ariaMM2.toFixed(0)} mm²)`);
    else fail(`${et} — pe masă stabilitatea a ieșit nulă`);
    if (la.cuvant.stabilitate === null) ok(`${et} — pe perete stabilitatea NU se măsoară; piesa atârnă`);
    else fail(`${et} — pe perete s-a măsurat stabilitate, deși piesa atârnă`);

    // ---------- 5. EXPORTUL ----------
    /**
     * AMBELE PIESE PLEACĂ DE LA Z=0, ca la export.
     *
     * Fața e construită de nucleu în poziția de MONTAJ, la 25 mm deasupra spatelui — corect
     * pentru verificarea de coliziune, greșit pentru placă. Aplicația o coboară; testul verifică
     * exact ce iese din `exportBodies`, nu corpul brut, altfel ar trece peste chiar defectul
     * ăsta. (Așa a și fost prins: prima versiune trimitea fața la slicer plutind 25 mm în aer.)
     */
    for (const [nume, corp] of [['corp', la.corpOpac], ['față', la.corpFata]] as [string, any][]) {
      if (!corp) continue;
      const pr = pentruPrint(corp);
      const bb0 = pr.boundingBox();
      const gata = nume === 'față' ? pr.translate([0, 0, -bb0.min[2]]) : pr;
      const bb = gata.boundingBox();
      if (Math.abs(bb.min[2]) < 1e-6) ok(`${et} — ${nume} pleacă de la Z=0 la export`);
      else fail(`${et} — ${nume} pleacă de la Z=${bb.min[2].toFixed(2)}, nu de la 0`);
      if (gata !== pr) gata.delete();
      pr.delete();
    }
  }
}

console.log('─── VERIFICĂRI ───');
for (const c of checks) console.log(c);
if (failures.length) {
  console.error('\n─── EȘECURI ───');
  for (const f of failures) console.error(f);
  console.error(`\n❌ Nume LED: ${failures.length} eșec(uri).\n`);
  // vezi regula din docs/design/: process.exit dupa manifold crapa libuv pe Windows
  process.exitCode = 1;
} else {
  console.log(`\n✅ Nume LED OK — ${checks.length} verificări.\n`);
}
