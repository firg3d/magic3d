/**
 * RULATORUL SUITEI — le executa pe TOATE, apoi raporteaza.
 *
 * DE CE EXISTA. `npm test` era un lant cu `&&`: prima suita picata le ascundea pe toate cele
 * de dupa. Asta a costat concret. Testul de brelocuri CRAPA (epuizare de heap WASM), dar
 * lantul se oprea inainte la alfabet, deci craparea a stat invizibila pana cand alfabetul a
 * fost reparat — moment in care a aparut ca o „regresie noua", desi era veche de zile.
 *
 * Un test care poate sa taca nu e o plasa de siguranta. Aici fiecare suita ruleaza indiferent
 * de ce s-a intamplat inainte, iar la final se vede tabloul complet: ce a trecut, ce a picat,
 * ce a CRAPAT (altceva decat a picat) si cat a durat fiecare.
 *
 * Rulare:  npm test           (toate)
 *          npm test goluri    (doar suitele al caror nume contine „goluri")
 */
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'src', '_tests');

// Ordinea conteaza: intai cele ieftine si structurale (izolare, i18n), ca o greseala de
// arhitectura sa iasa in doua secunde, nu dupa un sfert de ora de geometrie.
const ORDINE = ['isolation', 'i18n', 'linkuri', 'primitive', 'huse', 'regresie-export', 'semnatura', 'licenta', 'produse', 'layout', 'spike', 'openmesh', 'corpuri', 'goluri',
  'memorie', 'alphabet', 'brelocuri', 'fagure', 'cutii', 'led', 'nume', 'rame', 'cuvinte', 'placute', 'articulat'];

const filtru = process.argv.slice(2);
const gasite = readdirSync(DIR).filter((f) => f.endsWith('.test.ts')).map((f) => f.replace('.test.ts', ''));
// intai cele din ORDINE, apoi orice suita noua pe care nimeni n-a trecut-o in lista
const suite = [...ORDINE.filter((n) => gasite.includes(n)), ...gasite.filter((n) => !ORDINE.includes(n))]
  .filter((n) => !filtru.length || filtru.some((q) => n.toLowerCase().includes(q.toLowerCase())));

/**
 * Suite care nu incap intr-un singur proces si se ruleaza in mai multe parti.
 *
 * Heap-ul WASM nu se micsoreaza niciodata, iar constructiile mari de dimensiuni mereu altele
 * il fragmenteaza: chiar cu tot eliberat, pragul urca. Fagure face ~16.000 de constructii doar
 * in maturarea principala si CRAPA cu "memory access out of bounds" — nu pica, crapa.
 *
 * Fiecare parte primeste o felie intretesuta din catalogul de fonturi, prin variabila PARTE.
 * Acoperirea ramane INTREAGA: toate fonturile trec, doar in procese diferite, fiecare cu
 * heap-ul lui proaspat.
 */
const PARTI = { fagure: 3 };

const ruleaza = (nume, parte = '') => new Promise((rezolva) => {
  const t0 = Date.now();
  const p = spawn('npx', ['tsx', join(DIR, `${nume}.test.ts`)], {
    stdio: 'inherit', shell: true,
    env: parte ? { ...process.env, PARTE: parte } : process.env,
  });
  p.on('close', (cod, semnal) => rezolva({
    nume: parte ? `${nume} ${parte}` : nume, cod, semnal, ms: Date.now() - t0,
  }));
});

console.log(`\n${'='.repeat(70)}\nSUITA — ${suite.length} teste, toate se ruleaza indiferent de esecuri\n${'='.repeat(70)}`);
const rezultate = [];
for (const s of suite) {
  const n = PARTI[s] ?? 1;
  for (let i = 1; i <= n; i++) {
    const parte = n > 1 ? `${i}/${n}` : '';
    console.log(`\n${'-'.repeat(70)}\n▶  ${s}${parte ? `  (partea ${parte})` : ''}\n${'-'.repeat(70)}`);
    rezultate.push(await ruleaza(s, parte));
  }
}

console.log(`\n${'='.repeat(70)}\nREZUMAT\n${'='.repeat(70)}`);
const sec = (ms) => `${(ms / 1000).toFixed(1)}s`;
for (const r of rezultate) {
  // cod 0 = trecut · cod != 0 fara semnal = aserttiuni picate · semnal = crapat
  const stare = r.cod === 0 ? 'OK    ' : r.semnal ? `CRAPAT` : `PICAT `;
  console.log(`  ${stare} ${r.nume.padEnd(12)} ${sec(r.ms).padStart(8)}${r.semnal ? `  (semnal ${r.semnal})` : ''}`);
}
const rele = rezultate.filter((r) => r.cod !== 0);
const total = rezultate.reduce((s, r) => s + r.ms, 0);
console.log(`\n  ${rezultate.length - rele.length}/${rezultate.length} trecute · ${sec(total)} in total`);
/**
 * ULTIMA LINIE SPUNE ADEVARUL.
 *
 * Pana acum scria „Toate suitele au trecut" NECONDITIONAT, chiar si dupa ce enumerase suitele
 * picate cu doua randuri mai sus. Codul de iesire era corect — 1 — dar omul care se uita la
 * coada rularii citea ca totul e verde. O plasa de siguranta care minte in ultima propozitie e
 * mai rea decat una care lipseste: pe una care lipseste te uiti singur.
 */
if (rele.length) {
  console.log(`\n  Suite cu probleme: ${rele.map((r) => r.nume).join(', ')}`);
  console.log(`\n  ${rele.length} ${rele.length === 1 ? 'suita a picat' : 'suite au picat'}.\n`);
  // vezi regula din docs/design/
  process.exitCode = 1;
} else {
  console.log('\n  Toate suitele au trecut.\n');
}
