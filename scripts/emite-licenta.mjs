/**
 * EMITEREA LICENTELOR COMERCIALE. Se ruleaza pe calculatorul tau, niciodata pe server.
 *
 *   node scripts/emite-licenta.mjs --cheie-noua
 *       Creeaza perechea de chei. O DATA, la inceput. Scrie cheia privata in
 *       `.licenta/cheie-privata.jwk` (ignorat de git) si tipareste cheia publica, pe care o
 *       lipesti in `src/core/config/licenta-token.ts`.
 *
 *   node scripts/emite-licenta.mjs --nume "Atelier Popescu SRL" --plan 1an [--id 0007]
 *       Emite un token. Il trimiti clientului; el il lipeste in Setari.
 *
 * DE CE ASA. Cheia privata nu ajunge niciodata in aplicatie, deci nimeni nu poate emite
 * licente in afara de tine — nici macar cineva care citeste tot codul livrat. Aplicatia are
 * doar cheia publica, cu care verifica dar nu poate semna.
 *
 * PASTREAZA `.licenta/cheie-privata.jwk`. Daca o pierzi, nu mai poti emite licente pe aceeasi
 * cheie publica, iar tokenurile deja vandute raman valide dar nu mai poti face altele noi:
 * ar trebui sa schimbi cheia publica din aplicatie, ceea ce le-ar invalida pe TOATE.
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';


/**
 * IESIRILE FOLOSESC `process.exitCode` + `return`, NU `process.exit`.
 *
 * Regula e de nucleu (vezi docs/design/): `process.exit` taie procesul cat timp handle-urile
 * inca se inchid, iar dupa o operatie manifold libuv crapa pe Windows. Scriptul asta nu incarca
 * WASM, deci n-ar crapa — dar regula e uniforma tocmai ca sa nu trebuiasca decis de fiecare data
 * care fisier e „sigur", si ca verificarea din CI sa fie una simpla.
 *
 * Corpul e invelit in `main()` ca `return` sa poata opri executia exact acolo unde `process.exit`
 * o oprea. Fara invelis, `exitCode` ar seta doar codul, iar scriptul ar merge mai departe — la
 * publicare, ar fi insemnat sa urce un build despre care tocmai spusese ca e stricat.
 */
async function main() {
  const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
  const DIR = join(ROOT, '.licenta');
  const CALE_PRIVATA = join(DIR, 'cheie-privata.jwk');

  const b64url = (buf) => Buffer.from(buf).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const arg = (nume, implicit = null) => {
    const i = process.argv.indexOf(`--${nume}`);
    return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : implicit;
  };

  if (process.argv.includes('--cheie-noua')) {
    if (existsSync(CALE_PRIVATA)) {
      console.error(`\nEXISTA DEJA o cheie privata la ${CALE_PRIVATA}.`);
      console.error('Daca o inlocuiesti, TOATE licentele emise pana acum devin invalide.');
      console.error('Sterge fisierul manual daca chiar asta vrei.\n');
      process.exitCode = 1; return;
    }
    const pereche = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    const privata = await crypto.subtle.exportKey('jwk', pereche.privateKey);
    const publica = await crypto.subtle.exportKey('spki', pereche.publicKey);
    mkdirSync(DIR, { recursive: true });
    writeFileSync(CALE_PRIVATA, JSON.stringify(privata, null, 2));
    console.log(`\nCheia privata scrisa in  ${CALE_PRIVATA}`);
    console.log('PASTREAZ-O. Fara ea nu mai poti emite licente noi.\n');
    console.log('Lipeste linia de mai jos in src/core/config/licenta-token.ts, la CHEIE_PUBLICA_B64:\n');
    console.log(`  '${Buffer.from(publica).toString('base64')}';\n`);
    process.exitCode = 0; return;
  }

  if (!existsSync(CALE_PRIVATA)) {
    console.error('\nNu exista cheie privata. Ruleaza intai:  node scripts/emite-licenta.mjs --cheie-noua\n');
    process.exitCode = 1; return;
  }

  const PLANURI = { '1luna': 1, '3luni': 3, '1an': 12 };
  const plan = arg('plan');
  if (!PLANURI[plan]) {
    console.error(`\nPlan lipsa sau necunoscut. Alege dintre: ${Object.keys(PLANURI).join(', ')}`);
    console.error('Exemplu:  node scripts/emite-licenta.mjs --nume "Atelier Popescu SRL" --plan 1an\n');
    process.exitCode = 1; return;
  }
  const nume = arg('nume');
  if (!nume) { console.error('\nLipseste --nume "Persoana sau firma"\n'); process.exitCode = 1; return; }

  // Numarul licentei: dat explicit, altfel urmatorul liber din registru.
  const CALE_REGISTRU = join(DIR, 'registru.json');
  const registru = existsSync(CALE_REGISTRU) ? JSON.parse(readFileSync(CALE_REGISTRU, 'utf8')) : [];
  const id = arg('id') ?? String(registru.length + 1).padStart(4, '0');

  // Ultima zi de valabilitate, INCLUSIV. Ziua din luna se pastreaza; daca luna tinta e mai
  // scurta (31 ian + 1 luna), JS trece in luna urmatoare, asa ca dam inapoi la ultima zi reala.
  const azi = new Date();
  const cap = new Date(azi.getFullYear(), azi.getMonth() + PLANURI[plan], azi.getDate());
  if (cap.getDate() !== azi.getDate()) cap.setDate(0);
  const expira = `${cap.getFullYear()}-${String(cap.getMonth() + 1).padStart(2, '0')}-${String(cap.getDate()).padStart(2, '0')}`;

  const sarcina = b64url(new TextEncoder().encode(JSON.stringify({ id, nume, expira, plan })));
  const cheiePrivata = await crypto.subtle.importKey(
    'jwk', JSON.parse(readFileSync(CALE_PRIVATA, 'utf8')),
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'],
  );
  const semnatura = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, cheiePrivata, new TextEncoder().encode(sarcina),
  );
  const token = `M3D1.${sarcina}.${b64url(semnatura)}`;

  registru.push({ id, nume, plan, emis: azi.toISOString().slice(0, 10), expira });
  writeFileSync(CALE_REGISTRU, JSON.stringify(registru, null, 2));

  console.log(`\n  Licenta #${id} — ${nume}`);
  console.log(`  Plan: ${plan}  ·  valabila pana la ${expira} inclusiv\n`);
  console.log('  Token de trimis clientului:\n');
  console.log(`  ${token}\n`);
  console.log(`  (inregistrata in ${CALE_REGISTRU})\n`);
}

await main();
