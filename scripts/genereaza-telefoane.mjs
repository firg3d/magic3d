/**
 * GENERATORUL SCHEMEI DE TELEFOANE (HUS.1, B.3 + B.4).
 *
 * Scrie cele 26 de fișiere din `date/telefoane/apple/`, cu TOATE cotele la `null` — nu la `0`.
 * Diferența nu e cosmetică: `0` e o cotă, și una greșită. `null` spune „încă nu se știe", iar
 * `verifica-telefoane.ts` îl citește ca „incomplet", nu ca eroare.
 *
 * DECIZIA B.2: nicio cotă nu se inventează. Agentul nu are acces la ghidul Apple, deci scrie
 * schema și tabelul de completat; cifrele le pune operatorul, din document.
 *
 * Scrie și `docs/date/telefoane-de-completat.md` — tabelul de transcris. Amândouă ies din
 * ACEEAȘI listă de câmpuri de mai jos: un câmp adăugat aici apare în JSON și în tabel deodată,
 * deci nu pot ajunge să spună lucruri diferite.
 *
 * Rulare:  node scripts/genereaza-telefoane.mjs
 *          node scripts/genereaza-telefoane.mjs --forteaza   (rescrie și fișierele completate)
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'date', 'telefoane', 'apple');
const DIR_TEST = join(ROOT, 'date', 'telefoane', '_test');
const TABEL = join(ROOT, 'docs', 'date', 'telefoane-de-completat.md');
const FORTEAZA = process.argv.includes('--forteaza');

/** B.3 — cele 26 de modele, în ordinea din document */
const MODELE = [
  ['iphone-12-mini', 'iPhone 12 mini', 2020], ['iphone-12', 'iPhone 12', 2020],
  ['iphone-12-pro', 'iPhone 12 Pro', 2020], ['iphone-12-pro-max', 'iPhone 12 Pro Max', 2020],
  ['iphone-13-mini', 'iPhone 13 mini', 2021], ['iphone-13', 'iPhone 13', 2021],
  ['iphone-13-pro', 'iPhone 13 Pro', 2021], ['iphone-13-pro-max', 'iPhone 13 Pro Max', 2021],
  ['iphone-14', 'iPhone 14', 2022], ['iphone-14-plus', 'iPhone 14 Plus', 2022],
  ['iphone-14-pro', 'iPhone 14 Pro', 2022], ['iphone-14-pro-max', 'iPhone 14 Pro Max', 2022],
  ['iphone-15', 'iPhone 15', 2023], ['iphone-15-plus', 'iPhone 15 Plus', 2023],
  ['iphone-15-pro', 'iPhone 15 Pro', 2023], ['iphone-15-pro-max', 'iPhone 15 Pro Max', 2023],
  ['iphone-16', 'iPhone 16', 2024], ['iphone-16-plus', 'iPhone 16 Plus', 2024],
  ['iphone-16-pro', 'iPhone 16 Pro', 2024], ['iphone-16-pro-max', 'iPhone 16 Pro Max', 2024],
  ['iphone-16e', 'iPhone 16e', 2025],
  ['iphone-17', 'iPhone 17', 2025], ['iphone-17-pro', 'iPhone 17 Pro', 2025],
  ['iphone-17-pro-max', 'iPhone 17 Pro Max', 2025], ['iphone-air', 'iPhone Air', 2025],
  ['iphone-se-3', 'iPhone SE (a 3-a generație)', 2022],
];

/** modelele-pilot pentru OPRIRE 2, alese de operator */
const PILOT = new Set(['iphone-15', 'iphone-15-pro', 'iphone-16', 'iphone-se-3']);

/**
 * CÂMPURILE SCALARE, cu unitatea și ce înseamnă fiecare.
 * `cale` e drumul în JSON; `eticheta` e capul de coloană din tabel.
 */
const SCALARE = [
  ['corp.lungime', 'lungime', 'mm — cota mare a corpului'],
  ['corp.latime', 'lățime', 'mm'],
  ['corp.grosime', 'grosime', 'mm — fără proeminența camerei'],
  ['corp.razaColt', 'rază colț', 'mm — raza colțului conturului'],
  ['corp.razaMuchie', 'rază muchie', 'mm — racordul dintre spate și laterală'],
  ['corp.grosimeMaxHusaSpate', 'grosime max husă', 'mm — cât acceptă Apple pe spate; peste ea, avertisment, nu blocare'],
  ['corp.zonaIncarcare.x', 'inel X', 'mm — centrul inelului de încărcare magnetică'],
  ['corp.zonaIncarcare.y', 'inel Y', 'mm'],
  ['corp.zonaIncarcare.diametru', 'inel Ø', 'mm — grosimea maximă se verifică DOAR în cercul ăsta'],
  ['ecran.proeminentaFataDeCorp', 'ecran iese', 'mm — cât iese sticla peste ramă; 0 dacă e la nivel'],
  ['insulaCamera.x', 'insulă X', 'mm — centrul insulei față de centrul spatelui, + spre dreapta'],
  ['insulaCamera.y', 'insulă Y', 'mm — + în sus'],
  ['insulaCamera.latime', 'insulă lățime', 'mm'],
  ['insulaCamera.inaltime', 'insulă înălțime', 'mm'],
  ['insulaCamera.razaColt', 'insulă rază', 'mm'],
  ['insulaCamera.proeminenta', 'insulă iese', 'mm — cât iese insula din spate'],
  ['port.x', 'port X', 'mm — 0 = centrat'],
  ['port.latime', 'port lățime', 'mm'],
  ['port.inaltime', 'port înălțime', 'mm'],
];

/** câmpurile de tip listă — au lungime variabilă, deci primesc tabel separat */
const LISTE = [
  ['insulaCamera.lentile', 'Lentile', ['x', 'y', 'diametru', 'proeminentaSuplimentara',
    'con.unghi', 'con.distanta', 'con.referinta']],
  ['butoane', 'Butoane', ['tip', 'latura', 'y', 'lungime', 'latime', 'acoperibil',
    'keepout.latime', 'keepout.inaltime', 'keepout.subtire.latime', 'keepout.subtire.inaltime']],
  ['decupajeJos', 'Decupaje jos', ['tip', 'x', 'latime']],
  ['decupajeSus', 'Decupaje sus', ['tip', 'x', 'latime']],
  ['keepOut', 'Zone interzise', ['nume', 'x', 'y', 'latime', 'inaltime', 'motiv']],
];

/** schema B.4, cu toate cotele la null */
function schemaGoala(id, model, an) {
  return {
    id, brand: 'Apple', model, an,
    corp: {
      lungime: null, latime: null, grosime: null, razaColt: null,
      profilMargine: null,          // 'plat' | 'curbat'
      razaMuchie: null,
      /**
       * Grosimea maxima pe care Apple o cere husei PE SPATE (mm). 2,1 la modelele cu incarcare
       * magnetica, 5,0 la SE. Peste ea, incarcarea magnetica slabeste sau nu mai prinde.
       *
       * AVERTISMENT, NU BLOCARE: e o cerinta a lui Apple pentru functionalitate completa, nu o
       * imposibilitate fizica. Cine vrea o husa mai groasa si nu foloseste incarcare magnetica
       * o poate face; aplicatia ii spune ce pierde.
       */
      grosimeMaxHusaSpate: null,
      /**
       * INELUL DE INCARCARE MAGNETICA: centrul si diametrul zonei in care conteaza grosimea.
       *
       * `grosimeMaxHusaSpate` NU se aplica pe tot spatele — doar aici. In afara cercului husa
       * poate fi oricat de groasa fara sa strice incarcarea. Fara campul asta, avertismentul ar
       * fi aparut la parametrii impliciti pe toata piesa, adica ar fi devenit zgomot.
       */
      zonaIncarcare: null,     // { x, y, diametru } sau null la modelele fara incarcare magnetica
    },
    ecran: { proeminentaFataDeCorp: null },
    insulaCamera: {
      forma: null,                  // 'patrat' | 'pilula-verticala' | 'bara-lata' | 'lentila-simpla'
      x: null, y: null, latime: null, inaltime: null,
      razaColt: null, proeminenta: null,
      /**
       * `lentile[].con` si `blit.con` — CONUL DE KEEPOUT: unghiul in care nu are voie sa intre
       * nimic, si distanta de la care se masoara. Din el iese inaltimea maxima a buzei de
       * protectie din jurul decupajului: o buza prea inalta intra in campul lentilei.
       *
       * `unghi` e cel INTERIOR acolo unde desenul da doua (blitul are 112° interior si 157°
       * exterior); exteriorul ramane in `note`, fiindca buza e constransa de cel interior.
       * `referinta` spune de la ce se masoara distanta — nu e mereu aceeasi suprafata.
       */
      lentile: [],
      blit: { x: null, y: null, diametru: null, con: null },
    },
    butoane: [],
    port: { latura: 'jos', x: null, latime: null, inaltime: null, tip: null },
    decupajeJos: [],
    decupajeSus: [],
    keepOut: [],
    /**
     * Sursa e desenul cotat PER DISPOZITIV de la developer.apple.com/accessories/dimensional-drawings,
     * nu „Accessory Design Guidelines" — ghidul nu mai contine desene. De-aia `fisier` si `foaie`:
     * un numar de pagina fara numele fisierului nu duce inapoi la sursa.
     */
    sursa: { document: 'Apple Dimensional Drawings (developer.apple.com/accessories/dimensional-drawings)',
      fisier: '', versiune: '', pagina: 0, foaie: '' },
    verificat: false,
    verificatLa: null,
    note: '',
  };
}

/**
 * MODELUL FICTIV, singurul cu valori (B.2).
 *
 * Nu poartă numele niciunui telefon real, ca nimeni să nu-l confunde cu o cotă adevărată, și e
 * exclus din build-ul de producție și din lista din interfață. Există fiindcă altfel nu se poate
 * dezvolta nimic: fără un model complet, șabloanele n-au pe ce rula, iar testele n-au ce măsura.
 *
 * Cotele sunt PLAUZIBILE, alese să exercite toate cele patru forme de insulă prin variante, nu
 * copiate de undeva.
 */
function modelFictiv() {
  return {
    id: 'fictiv', brand: '_test', model: 'Model fictiv de dezvoltare', an: 2026,
    fictiv: true,
    corp: { lungime: 147.00, latime: 71.50, grosime: 7.80, razaColt: 11.00,
      profilMargine: 'plat', razaMuchie: 1.50, grosimeMaxHusaSpate: 2.10,
      zonaIncarcare: { x: 0.00, y: 0.00, diametru: 56.00 } },
    ecran: { proeminentaFataDeCorp: 0.30 },
    insulaCamera: {
      forma: 'patrat', x: -18.50, y: 48.00, latime: 32.00, inaltime: 32.00,
      razaColt: 8.00, proeminenta: 2.20,
      // COORDONATE GLOBALE, ca la modelele reale: aceeasi origine ca insula (centrul spatelui),
      // nu fata de centrul insulei. Prima versiune le-a scris relative, si abia datele pilot au
      // aratat convetia adevarata — la iPhone SE centrul lentilei e identic cu al insulei.
      lentile: [
        { x: -25.50, y: 55.00, diametru: 13.50, proeminentaSuplimentara: 0.60,
          con: { unghi: 120.0, distanta: 8.50, referinta: 'sticla de acoperire a camerei' } },
        { x: -11.50, y: 41.00, diametru: 13.50, proeminentaSuplimentara: 0.60, con: null },
      ],
      blit: { x: -11.50, y: 55.00, diametru: 5.00,
        con: { unghi: 112.0, distanta: 8.00, referinta: 'sticla de acoperire a camerei' } },
    },
    butoane: [
      { tip: 'pornire', latura: 'dreapta', y: 22.00, lungime: 22.00, latime: 3.00, acoperibil: true, keepout: null },
      { tip: 'volum+', latura: 'stanga', y: 30.00, lungime: 16.00, latime: 3.00, acoperibil: true, keepout: null },
      { tip: 'volum-', latura: 'stanga', y: 10.00, lungime: 16.00, latime: 3.00, acoperibil: true, keepout: null },
      /**
       * Buton cu KEEPOUT propriu, ca sablonul sa aiba pe ce rula calea asta inainte de iPhone 16.
       * Decupajul NU e dreptunghiul butonului, ci zona din jur: la Camera Control, 25,00 x 8,40
       * tipic, si o zona mai larga pentru husele subtiri, masurata la 0,4 mm de suprafata.
       */
      { tip: 'actiune', latura: 'stanga', y: 46.00, lungime: 9.00, latime: 3.00, acoperibil: false,
        keepout: { latime: 16.00, inaltime: 7.00, razaColt: 2.00, unghiDegajare: 55.0,
          subtire: { latime: 20.00, inaltime: 10.50, laDistanta: 0.40, unghiDegajare: 25.0 } } },
    ],
    port: { latura: 'jos', x: 0, latime: 9.50, inaltime: 3.20, tip: 'usb-c' },
    decupajeJos: [
      { tip: 'difuzor', x: 18.00, latime: 14.00 },
      { tip: 'microfon', x: -18.00, latime: 6.00 },
    ],
    decupajeSus: [{ tip: 'microfon', x: 0, latime: 4.00 }],
    keepOut: [
      { nume: 'antena jos', x: 0, y: -70.00, latime: 60.00, inaltime: 4.00, motiv: 'banda de antena' },
    ],
    sursa: { document: '(fictiv — nu are sursa)', versiune: '-', pagina: 0 },
    verificat: false, verificatLa: null,
    note: 'Model FICTIV, pentru dezvoltare si teste. Nu corespunde niciunui telefon real.',
  };
}

// ---------- scrierea fișierelor ----------
mkdirSync(DIR, { recursive: true });
mkdirSync(DIR_TEST, { recursive: true });
mkdirSync(dirname(TABEL), { recursive: true });

/**
 * ARE COTE COMPLETATE? Un fișier cu măcar o cotă nenulă a fost atins de om.
 *
 * `--forteaza` NU trece peste asta. Prima versiune trecea, iar rularea ei a șters cotele celor
 * patru modele-pilot — transcrise cu mâna din desene, adică cel mai scump lucru din tot valul.
 * S-au recuperat din git și din fișierele primite, dar un script care poate distruge munca de
 * ore printr-un flag e o unealtă prost făcută, nu o greșeală de folosire.
 *
 * Ca să rescrii totuși un fișier completat, îl ștergi întâi. Ștergerea e un gest conștient;
 * un flag pus din obișnuință, nu.
 */
function areCote(cale) {
  const d = JSON.parse(readFileSync(cale, 'utf8'));
  const nenul = (o) => Object.values(o ?? {}).some((v) =>
    (typeof v === 'number' && v !== 0) || (Array.isArray(v) && v.length)
    || (v && typeof v === 'object' && nenul(v)));
  return nenul(d.corp) || nenul(d.insulaCamera) || (d.butoane?.length ?? 0) > 0;
}

let scrise = 0, sarite = 0, aparate = 0;
for (const [id, model, an] of MODELE) {
  const cale = join(DIR, `${id}.json`);
  if (existsSync(cale) && (!FORTEAZA || areCote(cale))) {
    if (FORTEAZA && areCote(cale)) aparate++;
    sarite++;
    continue;
  }
  writeFileSync(cale, JSON.stringify(schemaGoala(id, model, an), null, 2) + '\n');
  scrise++;
}
const caleFictiv = join(DIR_TEST, 'fictiv.json');
if (!existsSync(caleFictiv) || FORTEAZA) writeFileSync(caleFictiv, JSON.stringify(modelFictiv(), null, 2) + '\n');

// ---------- tabelul de completat ----------
const cap = (n) => `| model | ${n.join(' | ')} |\n|${'---|'.repeat(n.length + 1)}`;
const randGol = (nume, n) => `| ${nume} | ${Array(n).fill(' ').join(' | ')} |`;

let md = `# Cotele telefoanelor — de completat din ghidul Apple

> Generat de \`scripts/genereaza-telefoane.mjs\`. **Nu se editează de mână**: se completează
> fișierele JSON din \`date/telefoane/apple/\`, iar tabelul ăsta e doar foaia de transcriere.

Sursa: **Apple Accessory Design Guidelines**, secțiunile *Device Dimensional Drawings* și
keep-out-uri. Document public, nu cere cont MFi.

**Regula de aur (B.2):** nicio cotă nu se inventează și nu se deduce din altă sursă. Un model cu
cote incomplete nu apare în interfață. Un model complet dar cu \`verificat: false\` apare cu
eticheta „din desenele Apple, neverificat fizic".

Toate cotele în **mm, cu două zecimale**. Sistem de coordonate: originea în centrul spatelui,
**X** spre dreapta **privit din spate**, **Y** în sus, **Z** spre exterior.

Trei convenții stabilite la completarea piloților, ca să nu se mai deducă de fiecare dată:

1. **Lentilele și blițul sunt în coordonate GLOBALE**, aceeași origine ca insula — nu față de
   centrul insulei. La iPhone SE se vede direct: centrul lentilei e identic cu al insulei.
2. **\`butoane[].latura\` e tot privit din spate.** Butoanele de volum, care privite din față sunt
   pe stânga, apar pe **dreapta**. Dacă interfața vrea „stânga/dreapta" din față, se inversează
   la afișare, nu în date.
3. **Sursa e desenul cotat per dispozitiv**, de la developer.apple.com/accessories/dimensional-drawings
   — nu „Accessory Design Guidelines", care nu mai conține desene. De-aia \`sursa\` are și \`fisier\`
   (numele PDF-ului) și \`foaie\` (ce foaie și ce detalii); un număr de pagină singur nu duce înapoi
   la sursă.

**Modelele-pilot pentru OPRIRE 2** sunt marcate cu ★: iPhone 15, iPhone 15 Pro, iPhone 16,
iPhone SE (a 3-a generație). Cu ele se fac primele rame de probă.

---

## 1. Corp, ecran, insulă, port

Câmpuri cu valori din listă:
- \`corp.profilMargine\`: \`plat\` sau \`curbat\`
- \`insulaCamera.forma\`: \`patrat\`, \`pilula-verticala\`, \`bara-lata\` sau \`lentila-simpla\`
- \`port.tip\`: \`usb-c\` sau \`lightning\`

`;

md += cap(['profil', 'formă insulă', 'tip port', ...SCALARE.map((c) => c[1])]) + '\n';
for (const [id, model] of MODELE) {
  const nume = (PILOT.has(id) ? '★ ' : '') + model;
  md += randGol(nume, SCALARE.length + 3) + '\n';
}

md += `\n**Ce înseamnă fiecare coloană**\n\n`;
for (const [cale, eticheta, explicatie] of SCALARE) md += `- **${eticheta}** (\`${cale}\`) — ${explicatie}\n`;

md += `\n---\n\n## 2. Liste (lungime variabilă)\n
Astea nu încap într-un rând per model, fiindcă fiecare telefon are alt număr de lentile și de
butoane. Se completează direct în JSON, în listele respective.\n`;

for (const [cale, titlu, campuri] of LISTE) {
  md += `\n### ${titlu} — \`${cale}\`\n\n`;
  md += cap(campuri) + '\n';
  md += randGol('_(un rând per element)_', campuri.length) + '\n';
}

md += `
**Valori din listă:**
- \`lentile[].con.referinta\` și \`blit.con.referinta\`: \`sticla-fata\` sau \`sticla-spate\` —
  de la ce suprafață se măsoară \`distanta\`. Jeton închis, nu text liber.
- \`con.unghi\` e cel **interior** acolo unde desenul dă două (blițul are și unul exterior, mai
  larg); exteriorul rămâne în \`note\`, fiindcă buza e constrânsă de cel interior.
- \`butoane[].tip\`: \`pornire\`, \`volum+\`, \`volum-\`, \`actiune\`, \`mut\`, \`camera-control\`
- \`butoane[].latura\`: \`stanga\` sau \`dreapta\`
- \`butoane[].acoperibil\`: \`true\` dacă husa îl poate acoperi cu perete subțiat (TPU) în loc de
  decupaj. **Camera Control se tratează implicit ca decupaj** — are suprafață tactilă.
- \`decupaje*[].tip\`: \`difuzor\` sau \`microfon\`

---

## 3. Sursa, pentru fiecare model

Obligatoriu, altfel modelul nu se publică:

- \`sursa.versiune\` — versiunea ghidului (ex. „Release R18")
- \`sursa.pagina\` — pagina de unde ai luat desenul
- \`verificat\` — rămâne \`false\` până la măsurarea fizică în atelier
- \`verificatLa\` — data măsurării, când \`verificat\` devine \`true\`

---

## 4. Cum verifici ce ai completat

\`\`\`bash
npm run verifica:telefoane
\`\`\`

Spune care modele sunt complete, care incomplete și care au erori de consistență (insula nu
încape în corp, lentilele nu încap în insulă, butoane suprapuse pe aceeași latură). Cotele
lipsă sunt raportate ca **incomplete**, nu ca erori — încă nu s-au completat, nu sunt greșite.
`;

writeFileSync(TABEL, md);

console.log(`\nSCHEMA TELEFOANELOR`);
console.log(`  ${scrise} fișiere scrise, ${sarite} sărite (deja existau)`);
if (aparate) console.log(`  ${aparate} aveau cote completate: NU au fost rescrise, nici cu --forteaza`);
console.log(`  model fictiv: ${caleFictiv.replace(ROOT, '.')}`);
console.log(`  tabel:        ${TABEL.replace(ROOT, '.')}`);
console.log(`  ${MODELE.length} modele, dintre care ${PILOT.size} pilot\n`);
