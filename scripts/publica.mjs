/**
 * PUBLICARE PE HOSTING — build curat, verificare, sincronizare incrementală.
 *
 *   npm run publica              publică
 *   npm run publica -- --proba   face totul, dar NU urcă nimic (arată ce ar urca)
 *
 * DE CE INCREMENTAL. `dist/` are ~83 MB și peste 700 de fișiere, din care 45 MB sunt fonturi
 * care nu se schimbă niciodată. Un upload integral la fiecare publicare ar dura zeci de minute
 * pe un FTP de shared hosting și ar face publicarea ceva ce eviți — adică ceva ce se face rar și
 * prost. Se compară MĂRIMEA și DATA cu ce e pe server și se urcă doar ce diferă.
 *
 * CE NU SE ȘTERGE NICIODATĂ de pe server (vezi `PASTREAZA`): `incarcari/`, unde ajung fișierele
 * trimise prin formularul de contact, și `config-magic3d.php`, care ține cheia secretă reCAPTCHA
 * și nu există în depozit. O ștergere „de curățenie" acolo înseamnă atașamentele clienților
 * pierdute și formularul picat până pui la loc configurarea, manual, la 11 noaptea.
 *
 * PAROLA. `basic-ftp` deschide implicit FTPS (TLS explicit pe portul 21), deci datele de
 * conectare NU circulă în clar. Dacă serverul refuză TLS, scriptul cere confirmare explicită
 * prin `PUBLICA_NESECURIZAT=da` — nu coboară singur la FTP simplu.
 */
import { Client } from 'basic-ftp';
import JSZip from 'jszip';
import { readFileSync, readdirSync, statSync, existsSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative, dirname, posix } from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT } from './continut.mjs';


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
  const DIST = join(ROOT, 'dist');
  const PROBA = process.argv.includes('--proba');
  /** arhivă .zip pentru încărcare manuală prin File Manager, în locul sincronizării FTP */
  const ARHIVA = process.argv.includes('--arhiva');

  /** ce trebuie să existe în dist după build, altfel publicarea se oprește */
  const CRITICE = [
    'index.html',                                  // landing-ul, la rădăcină
    'litere.html',                                 // aplicația
    'contact-magic3d.php', 'raport.php',           // endpointurile PHP
    'sitemap.xml', 'robots.txt', '.htaccess', '404.html',
    'en/index.html',                               // o pagină din fiecare limbă
    'academia/index.html', 'en/academy/index.html',
    'contact/index.html', 'en/contact/index.html',
    'token.html', 'en/token.html',
  ];

  /** ce se lasă în pace pe server, orice s-ar întâmpla */
  const PASTREAZA = ['incarcari', 'config-magic3d.php', 'cgi-bin', '.well-known'];

  /**
   * Datele de conectare. Lipsa lor NU e o exceptie de programator: e un pas de configurare
   * nefacut, iar omul are nevoie de o propozitie, nu de un stack trace. In modul `--proba`,
   * lipsa lor lasa totusi buildul si verificarile sa ruleze — sunt partea care se poate proba
   * fara niciun cont.
   */
  let env = null;
  try {
    if (!ARHIVA) env = citesteEnv();
  } catch (e) {
    if (!PROBA) {
      console.error(`\n  ✗ ${e.message}\n`);
      process.exitCode = 1; return;
    }
    console.log(`\n  ⚠ ${e.message}`);
    console.log('    Proba continua doar cu buildul si verificarile; sincronizarea cere .env.\n');
  }
  const kb = (n) => `${(n / 1024).toFixed(0)} kB`;
  const secunde = (ms) => `${(ms / 1000).toFixed(1)} s`;

  function citesteEnv() {
    const cale = join(ROOT, '.env');
    if (!existsSync(cale)) {
      throw new Error('lipsește .env — copiază .env.exemplu și completează-l (vezi docs/PUBLICARE.md)');
    }
    const out = {};
    for (const linie of readFileSync(cale, 'utf8').split(/\r?\n/)) {
      const m = linie.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/);
      if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
    for (const cheie of ['PUBLICA_GAZDA', 'PUBLICA_UTILIZATOR', 'PUBLICA_PAROLA', 'PUBLICA_DIRECTOR']) {
      if (!out[cheie]) throw new Error(`lipsește ${cheie} din .env`);
    }
    return out;
  }

  /** toate fișierele din dist, cu mărime și dată, ca listă plată de căi POSIX */
  function fisiereLocale(dir = DIST, out = []) {
    for (const nume of readdirSync(dir)) {
      const cale = join(dir, nume);
      const st = statSync(cale);
      if (st.isDirectory()) fisiereLocale(cale, out);
      else out.push({ cale: relative(DIST, cale).split('\\').join('/'), marime: st.size, data: st.mtime });
    }
    return out;
  }

  /** listarea de pe server, recursivă, ca hartă cale -> {marime, data} */
  async function fisiereRemote(client, baza, prefix = '', harta = new Map()) {
    let lista;
    try { lista = await client.list(posix.join(baza, prefix)); } catch { return harta; }
    for (const f of lista) {
      const cale = prefix ? `${prefix}/${f.name}` : f.name;
      if (PASTREAZA.includes(f.name)) continue;
      if (f.isDirectory) await fisiereRemote(client, baza, cale, harta);
      else harta.set(cale, { marime: f.size, data: f.modifiedAt ?? null });
    }
    return harta;
  }

  // ── 1. build curat ──────────────────────────────────────────────────────────
  console.log('\n─── 1. BUILD CURAT ───');
  if (existsSync(DIST)) { rmSync(DIST, { recursive: true, force: true }); console.log('  dist/ șters'); }
  const t0 = Date.now();
  execFileSync('npm', ['run', 'build'], { cwd: ROOT, stdio: 'inherit', shell: true });
  console.log(`  build în ${secunde(Date.now() - t0)}`);

  // ── 2. verificarea fișierelor critice ───────────────────────────────────────
  console.log('\n─── 2. VERIFICARE ───');
  const lipsa = CRITICE.filter((f) => !existsSync(join(DIST, f)));
  if (lipsa.length) {
    console.error(`\n  ✗ lipsesc din dist/:\n${lipsa.map((f) => `      ${f}`).join('\n')}\n`);
    console.error('  Publicarea s-a oprit. Un site urcat fara una dintre astea e un site stricat.\n');
    process.exitCode = 1; return;
  }
  const locale = fisiereLocale();
  const total = locale.reduce((s, f) => s + f.marime, 0);
  console.log(`  ${CRITICE.length} fișiere critice, toate prezente`);
  console.log(`  ${locale.length} fișiere în dist/, ${(total / 1048576).toFixed(1)} MB`);

  /**
   * Textul din CITESTE-MA.txt, pus în arhivă.
   *
   * Scris pentru cineva care deschide arhiva peste trei luni și nu-și mai amintește nimic: unde
   * merge fiecare folder, ce se completează, și ce se verifică după.
   */
  const CITESTE_MA = `MAGIC3D — cum se instalează arhiva asta
  ════════════════════════════════════════════════════════════════════════

  Arhiva conține site-ul gata construit. Nu ai nevoie de Node, de npm sau
  de codul sursă ca s-o instalezi — doar de File Manager-ul din cPanel.


  1. UNDE MERGE FIECARE FOLDER
  ────────────────────────────────────────────────────────────────────────

  Pe server, structura trebuie să arate așa:

    /home/utilizator/
    ├── config-magic3d.php        <- din DEASUPRA_public_html/, redenumit
    │                                (UN NIVEL DEASUPRA rădăcinii publice)
    └── public_html/              <- tot ce e în public_html/ din arhivă
        ├── .htaccess
        ├── index.html            <- pagina de prezentare
        ├── litere.html           <- aplicația Litere Decor
        ├── contact-magic3d.php
        ├── raport.php
        ├── incarcari/            <- deja protejat, vezi punctul 4
        ├── academia/  en/  contact/  assets/  fonts/  tematici/
        ├── sitemap.xml
        └── robots.txt

    ┌──────────────────────────────────────────────────────────────────┐
    │ config-magic3d.php NU intră în public_html.                      │
    │                                                                   │
    │ Acolo, oricine îl poate cere din browser și îți citește cheia     │
    │ secretă. Un nivel mai sus, serverul web nu are cum să-l servească,│
    │ dar PHP-ul îl găsește, fiindcă îl caută la ../config-magic3d.php. │
    └──────────────────────────────────────────────────────────────────┘


  2. PAȘII
  ────────────────────────────────────────────────────────────────────────

    a) Dezarhivează local.

    b) Urcă TOT ce e în public_html/ din arhivă în public_html/ de pe
       server. Dacă folosești File Manager, poți urca direct .zip-ul și
       dezarhiva acolo — e mult mai rapid decât fișier cu fișier.

       ATENȚIE la fișierele care încep cu punct (.htaccess). Unele unelte
       nu le arată. În File Manager: Settings -> Show Hidden Files.

    c) Ia config-magic3d.php.exemplu din DEASUPRA_public_html/, urcă-l cu
       UN NIVEL deasupra lui public_html și redenumește-l
       config-magic3d.php.

    d) Deschide-l și completează cheia SECRETĂ reCAPTCHA. Cea veche, care
       a stat scrisă în contact.php, se consideră expusă: rotește-o din
       consola Google înainte.


  3. reCAPTCHA
  ────────────────────────────────────────────────────────────────────────

  Două lucruri, amândouă obligatorii:

    - cheia SECRETĂ în config-magic3d.php (punctul 2d);
    - domeniul magic3d.ro adăugat în lista de domenii a cheii, în consola
      Google reCAPTCHA.

  Dacă domeniul lipsește, formularul respinge TOATE trimiterile cu
  mesajul „Verificarea «Nu sunt robot» a eșuat", fără nimic în log care
  să spună de ce. E cea mai frecventă cauză a unui formular care „nu
  merge" după mutarea pe alt domeniu.

  Cheia PUBLICĂ e deja în paginile din arhivă. Dacă în pagina de contact
  scrie că verificarea nu e configurată, înseamnă că arhiva a fost făcută
  înainte de completarea ei: mai e nevoie de un build.


  4. DIRECTORUL DE ÎNCĂRCĂRI
  ────────────────────────────────────────────────────────────────────────

  public_html/incarcari/ vine în arhivă cu .htaccess-ul de protecție deja
  înăuntru: oprește motorul PHP și forțează descărcarea, ca un fișier
  încărcat prin formular să nu poată fi rulat pe server.

  Verifică, după dezarhivare, că fișierul chiar e acolo:

    cat public_html/incarcari/.htaccess

  Trebuie să conțină „php_flag engine off". Dacă lipsește, nu porni
  formularul până nu îl pui.

  Permisiuni: 755 pe director e de ajuns.


  5. LISTA DE VERIFICARE, DUPĂ INSTALARE
  ────────────────────────────────────────────────────────────────────────

  Deschide fiecare punct în browser și bifează:

    [ ] https://magic3d.ro     arată pagina de prezentare, nu aplicația

    [ ] https://magic3d.ro/academia/ce-filament-alegi/    lipit direct în
        bara de adrese, se deschide (nu 404)

    [ ] https://magic3d.ro/en/    versiunea engleză, iar butonul
        „Română" din colț duce înapoi

    [ ] https://magic3d.ro/contact/    trimite un mesaj de probă, cu o
        poză atașată; verifică emailul pe contact@firg3d.com

    [ ] ?licenta=<cod> activează licența — testează într-o fereastră
        PRIVATĂ, altfel ai deja licența din browserul tău:
        https://magic3d.ro/litere.html?licenta=CODUL
        Trebuie să apară bannerul verde, iar jos „Licență Comercială"

    [ ] https://magic3d.ro/token.html    butoanele de cumpărare duc la
        produsele corecte în Shopify, cu prețurile potrivite

    [ ] https://magic3d.ro/sitemap.xml    se deschide public

    [ ] http://www.magic3d.ro    scris așa în bară, trebuie să ajungi la
        https://magic3d.ro, dintr-un singur pas

  Dacă un punct pică, oprește-te la el: restul nu are sens până nu e
  rezolvat.


  6. CE NU E ÎN ARHIVĂ, INTENȚIONAT
  ────────────────────────────────────────────────────────────────────────

    - codul sursă, node_modules, .git — nu au ce căuta pe server;
    - .env cu datele de FTP — rămâne doar pe calculatorul tău;
    - config-magic3d.php REAL, cu cheia secretă — doar exemplul.


  ────────────────────────────────────────────────────────────────────────
  Documentația completă: docs/PUBLICARE.md, în depozit.
  `;

  // ── 3. ARHIVĂ pentru încărcare manuală ──────────────────────────────────────
  //
  // Pentru cine publică prin File Manager-ul din cPanel, nu prin FTP: un singur .zip, cu
  // structura serverului deja făcută înăuntru, gata de dezarhivat.
  //
  // DE CE DOUĂ FOLDERE ÎN ARHIVĂ. `config-magic3d.php` NU stă în rădăcina publică — acolo ar
  // putea fi cerut din browser, cu cheia secretă în el. Arhiva îl pune într-un folder numit
  // `DEASUPRA_public_html/`, ca numele însuși să spună unde merge; e greșeala care se face cel
  // mai des, și singura care expune o cheie.
  if (ARHIVA) {
    const stampila = (() => {
      const d = new Date();
      const p = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
    })();
    const caleZip = join(ROOT, `magic3d-${stampila}.zip`);
    const zip = new JSZip();

    /**
     * Ce se comprimă și ce nu.
     *
     * Fonturile, HTML-ul, CSS-ul și JS-ul se strâng bine. Imaginile moderne (AVIF, WebP), 3MF-urile
     * (care sunt ele însele zip-uri) și .wasm sunt deja comprimate: trecute prin deflate, cresc
     * timpul de arhivare cu minute și câștigă zecimi de procent.
     */
    const DEJA_COMPRIMATE = /\.(avif|webp|png|jpe?g|gif|3mf|zip|wasm|woff2?)$/i;
    const optiuni = (nume) => (DEJA_COMPRIMATE.test(nume)
      ? { compression: 'STORE' }
      : { compression: 'DEFLATE', compressionOptions: { level: 6 } });

    for (const f of locale) {
      zip.file(`public_html/${f.cale}`, readFileSync(join(DIST, f.cale)), optiuni(f.cale));
    }

    /**
     * `incarcari/.htaccess`, PREGENERAT.
     *
     * Endpointul îl scrie singur la prima încărcare cu fișiere, dar până atunci directorul poate
     * exista neprotejat. Conținutul se ia CHIAR DIN PHP, nu se rescrie aici: două copii ale
     * aceleiași protecții divergează, iar cea din arhivă ar rămâne în urmă fără să afle nimeni.
     */
    const sursaPhp = readFileSync(join(ROOT, 'public', 'contact-magic3d.php'), 'utf8');
    const bloc = sursaPhp.match(/\$htaccess[\s\S]*?implode\("\\n",\s*\[([\s\S]*?)\]\)/);
    const linii = bloc
      ? [...bloc[1].matchAll(/'([^']*)'/g)].map((m) => m[1])
      : [];
    if (!linii.length) {
      console.error('  ✗ nu am putut citi protecția .htaccess din contact-magic3d.php');
      console.error('    Arhiva s-ar fi făcut cu un director de încărcări neprotejat.\n');
      process.exitCode = 1; return;
    }
    zip.file('public_html/incarcari/.htaccess', linii.join('\n') + '\n');

    // configurarea, în folderul al cărui nume spune unde merge
    zip.file('DEASUPRA_public_html/config-magic3d.php.exemplu',
      readFileSync(join(ROOT, 'content', 'contact', 'config-magic3d.example.php')));

    zip.file('CITESTE-MA.txt', CITESTE_MA);

    const continut = await zip.generateAsync({ type: 'nodebuffer', streamFiles: true });
    writeFileSync(caleZip, continut);

    /**
     * VERIFICAREA DE DUPĂ: se redeschide arhiva scrisă pe disc și se caută în ea fișierele care
     * se pierd cel mai ușor — cele care încep cu punct. Multe unelte de arhivare le sar tăcut, iar
     * un site fără `.htaccess` merge la prima vedere: fără redirect, fără HTTPS forțat, fără cache
     * și cu directoarele la vedere. Se vede abia când cineva caută pe Google.
     */
    const recitit = await JSZip.loadAsync(readFileSync(caleZip));
    const numeInArhiva = Object.keys(recitit.files).filter((n) => !recitit.files[n].dir);
    const OBLIGATORII = [
      'public_html/.htaccess',
      'public_html/404.html',
      'public_html/index.html',
      'public_html/litere.html',
      'public_html/raport.php',
      'public_html/contact-magic3d.php',
      'public_html/sitemap.xml',
      'public_html/robots.txt',
      'public_html/incarcari/.htaccess',
      'DEASUPRA_public_html/config-magic3d.php.exemplu',
      'CITESTE-MA.txt',
    ];
    const lipsaDinZip = OBLIGATORII.filter((n) => !numeInArhiva.includes(n));
    const INTERZISE = numeInArhiva.filter((n) => /(^|\/)(\.env|node_modules|\.git)(\/|$)/.test(n)
      || n.endsWith('/config-magic3d.php') || n === 'config-magic3d.php');

    console.log('\n─── VERIFICAREA ARHIVEI ───');
    for (const n of OBLIGATORII) {
      console.log(`  ${lipsaDinZip.includes(n) ? '✗ LIPSEȘTE' : '✓'}  ${n}`);
    }
    if (INTERZISE.length) {
      console.error(`\n  ✗ au intrat fișiere care nu trebuiau: ${INTERZISE.join(', ')}\n`);
      process.exitCode = 1; return;
    }
    if (lipsaDinZip.length) {
      console.error('\n  ✗ arhiva e incompletă — vezi lipsurile de mai sus.\n');
      process.exitCode = 1; return;
    }
    console.log('  ✓ niciun .env, node_modules, .git sau config real în arhivă');

    const st = statSync(caleZip);
    console.log('\n─── ARHIVA E GATA ───');
    console.log(`  cale:     ${caleZip}`);
    console.log(`  mărime:   ${(st.size / 1048576).toFixed(1)} MB`);
    console.log(`  fișiere:  ${numeInArhiva.length}`);
    console.log(`  durata:   ${secunde(Date.now() - t0)}\n`);
    process.exitCode = 0; return;
  }

  // ── 3. sincronizare ─────────────────────────────────────────────────────────
  console.log(`\n─── 3. ${PROBA ? 'PROBĂ (nu se urcă nimic)' : 'SINCRONIZARE'} ───`);
  if (!env) {
    console.log('  sarita: fara .env nu exista unde sa se urce.\n');
    console.log('─── PROBA S-A OPRIT DUPA VERIFICARI ───');
    console.log(`  ${locale.length} fisiere, ${(total / 1048576).toFixed(1)} MB, gata de urcat.\n`);
    process.exitCode = 0; return;
  }

  const client = new Client(30_000);
  client.ftp.verbose = false;
  const t1 = Date.now();
  let urcate = 0, octetiUrcati = 0, sarite = 0, sterse = 0;

  try {
    const nesecurizat = (env.PUBLICA_NESECURIZAT ?? '').toLowerCase() === 'da';
    await client.access({
      host: env.PUBLICA_GAZDA,
      user: env.PUBLICA_UTILIZATOR,
      password: env.PUBLICA_PAROLA,
      port: Number(env.PUBLICA_PORT ?? 21),
      secure: nesecurizat ? false : true,
      secureOptions: { rejectUnauthorized: false },
    });
    console.log(`  conectat la ${env.PUBLICA_GAZDA}${nesecurizat ? '  ⚠ FĂRĂ TLS (parola circulă în clar)' : ' prin FTPS'}`);

    const baza = env.PUBLICA_DIRECTOR;
    const remote = await fisiereRemote(client, baza);
    console.log(`  pe server: ${remote.size} fișiere`);

    for (const f of locale) {
      const r = remote.get(f.cale);
      // se urcă dacă lipsește, dacă marimea difera, sau daca fisierul local e mai nou.
      // Marimea singura ar rata o editare care pastreaza numarul de octeti; data singura ar urca
      // tot dupa un `git clone`, care pune data de acum pe toate.
      const schimbat = !r || r.marime !== f.marime || (r.data && f.data > r.data);
      if (!schimbat) { sarite++; continue; }
      if (!PROBA) {
        const dirRemote = posix.join(baza, posix.dirname(f.cale));
        await client.ensureDir(dirRemote);
        await client.uploadFrom(join(DIST, f.cale), posix.join(baza, f.cale));
        await client.cd(baza);
      }
      urcate++; octetiUrcati += f.marime;
      if (urcate <= 20 || urcate % 25 === 0) console.log(`    ↑ ${f.cale}  ${kb(f.marime)}`);
    }

    // ștergeri: doar ce NU mai există local și nu e pe lista de păstrate
    const localeSet = new Set(locale.map((f) => f.cale));
    for (const cale of remote.keys()) {
      if (localeSet.has(cale)) continue;
      if (PASTREAZA.some((p) => cale === p || cale.startsWith(`${p}/`))) continue;
      if (!PROBA) { try { await client.remove(posix.join(baza, cale)); } catch { /* deja plecat */ } }
      sterse++;
      console.log(`    ✕ ${cale}`);
    }
  } catch (e) {
    console.error(`\n  ✗ ${e.message}\n`);
    process.exitCode = 1;
  } finally {
    client.close();
  }

  // ── 4. raport ───────────────────────────────────────────────────────────────
  console.log(`\n─── ${PROBA ? 'PROBĂ' : 'GATA'} ───`);
  console.log(`  urcate:    ${urcate} din ${locale.length} fișiere  (${(octetiUrcati / 1048576).toFixed(1)} MB)`);
  console.log(`  neatinse:  ${sarite}  — identice cu ce e pe server`);
  console.log(`  șterse:    ${sterse}`);
  console.log(`  păstrate:  ${PASTREAZA.join(', ')}`);
  console.log(`  durata:    ${secunde(Date.now() - t1)}\n`);
}

await main();
