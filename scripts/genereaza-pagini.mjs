/**
 * GENERATORUL DE PAGINI — din conținut + șabloane, la build.
 *
 *   node scripts/genereaza-pagini.mjs
 *
 * Scrie fișierele HTML ale landing-ului (RO la rădăcină, EN sub /en/), sitemap.xml, robots.txt,
 * și tipărește lista intrărilor Vite de adăugat. Rulează ÎNAINTE de `vite build` — vezi
 * scriptul `build` din package.json.
 *
 * Verificarea de sincronizare (scripts/continut.mjs) rulează prima: dacă limbile diverg,
 * generarea nici nu începe. Mai bine un build picat decât o pagină EN cu goluri.
 *
 * NU atinge intrările Vite ale aplicațiilor (litere.html, brelocuri.html, ...). Landing-ul RO
 * se scrie chiar în `index.html`, deci rădăcina domeniului deschide pagina de prezentare, nu
 * generatorul; Litere Decor s-a mutat la `litere.html`, unde duc toate butoanele „deschide".
 * Paginile de aplicație (partea 3) se vor scrie sub `aplicatii/<slug>/index.html`.
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { incarcaVerificat, ROOT, LIMBI } from './continut.mjs';
import { head, bodyLanding, jsonLdLanding, bodyAcademia, bodyCapitol, jsonLdAcademia,
  jsonLdCapitol, figura, caleCapitol, bodyContact, bodyAplicatie, jsonLdContact, url } from './sabloane.mjs';
import { scrieOG } from './og.mjs';
import { capitole, corpHub, imagini, md } from './academia.mjs';

const site = incarcaVerificat();   // aruncă dacă limbile nu-s sincronizate

/** unde se scrie landing-ul fiecărei limbi și sub ce cale publică apare */
const TINTE_LANDING = {
  ro: { fisier: 'index.html', cale: '/' },
  en: { fisier: 'en/index.html', cale: '/en/' },
};

/** calea, dacă fișierul chiar există — scrieOG desenează un fundal când randarea lipsește */
const existaFisier = (rel) => (existsSync(join(ROOT, rel)) ? rel : null);

const scrise = [];
function scrie(relativ, continut) {
  const abs = join(ROOT, relativ);
  mkdirSync(join(abs, '..'), { recursive: true });
  writeFileSync(abs, continut);
  scrise.push(relativ);
}

// ── landing, per limbă ──────────────────────────────────────────────────────
for (const limba of LIMBI) {
  const c = site[limba];
  const alt = site[LIMBI.find((l) => l !== limba)];
  const t = TINTE_LANDING[limba];
  const html = head(c, alt, {
    titlu: c.meta.titlu,
    descriere: c.meta.descriere,
    ogDescriere: c.meta.og,
    cale: '',
    ogImagine: limba === 'ro' ? '/landing/og-landing.png' : '/landing/og-landing-en.png',
    jsonLd: jsonLdLanding(c),
  }) + '\n' + bodyLanding(c, alt, t.cale);
  scrie(t.fisier, html);
}

// ── ACADEMIA 3D, ÎN AMBELE LIMBI ────────────────────────────────────────────
//
// Un capitol se publică SIMULTAN în română și engleză, sau deloc. De asta lista de mai jos
// conține NUMERE de capitol, nu slug-uri: nu poți publica jumătate de pereche fără să observi.
// Dacă o limbă n-are fișierul, generarea pică aici, cu numele lui — nu iese un site în care
// linkul „English" duce la 404.
const PUBLICATE = [1, 2];

const IMG = imagini();
/** fotografia folosită ca sursă pentru imaginea Open Graph a fiecărei pagini */
const SURSA_OG = { 0: 'atelier-linie', 1: 'atelier-linie', 2: 'butoane-land-rover' };

/** capitolele fiecărei limbi, verificate să existe amândouă */
const ACAD = {};
for (const limba of LIMBI) {
  const caps = capitole(limba);
  const hub = caps.find((x) => x.capitol === 0);
  if (!hub) throw new Error(`Academia ${limba}: lipsește hub-ul (capitolul 0)`);
  const reale = caps.filter((x) => x.capitol > 0);
  for (const n of PUBLICATE) {
    if (!reale.some((x) => x.capitol === n)) {
      throw new Error(`Academia: capitolul ${n} e declarat publicat, dar lipsește în „${limba}". `
        + 'Un capitol se adaugă în ambele limbi deodată.');
    }
  }
  ACAD[limba] = { hub, reale, publicate: reale.filter((x) => PUBLICATE.includes(x.capitol)) };
}

/** același capitol în cealaltă limbă — pentru hreflang reciproc */
const perechea = (limba, capNr) => {
  const alta = LIMBI.find((l) => l !== limba);
  const x = capNr === 0 ? ACAD[alta].hub : ACAD[alta].reale.find((y) => y.capitol === capNr);
  return x ? `/${x.slug}/` : null;
};

for (const limba of LIMBI) {
  const c = site[limba];
  const alt = site[LIMBI.find((l) => l !== limba)];
  const AC = c.academia;
  const { hub, reale, publicate } = ACAD[limba];
  const publicat = (cap) => PUBLICATE.includes(cap.capitol);
  /** textul alternativ al unei fotografii, în limba paginii */
  const altFoto = (id) => (limba === 'ro' ? IMG[id]?.alt : IMG[id]?.altEn);
  /** rădăcina de limbă pentru fișierul scris pe disc: '' la română, 'en/' la engleză */
  const dir = limba === 'ro' ? '' : `${c.radacina.replace(/^\/|\/$/g, '')}/`;

  const fotoAutor = figura(IMG['atelier-linie'], { etichetaLipsa: AC.fotoLipsa,
    alt: altFoto('atelier-linie'), dimensiuni: '(max-width: 820px) 100vw, 320px' });

  // hub: titlurile de nivel 3 din lista capitolelor devin linkuri către cele publicate.
  // Textul rămâne exact cum e scris în fișier — se schimbă doar ce e în jurul lui.
  const corpHubHtml = md(corpHub(hub), {
    fisier: hub.fisier,
    peTitlu: (nivel, titlu) => {
      if (nivel !== 3) return null;
      const n = titlu.match(/^(\d)\./);
      const cap = n && reale.find((x) => x.capitol === Number(n[1]));
      if (!cap || !publicat(cap)) return `${titlu} <span class="tag tag-soon">${AC.curand}</span>`;
      return `<a href="${caleCapitol(c, cap.slug)}" data-capitol="${cap.slug}">${titlu}</a>`;
    },
  });

  scrie(`${dir}${hub.slug}/index.html`, head(c, alt, {
    titlu: hub.titluSeo,
    descriere: hub.metaDescriere,
    cale: `/${hub.slug}/`,
    caleAlt: perechea(limba, 0),
    ogImagine: `/landing/og-academia${limba === 'ro' ? '' : '-en'}.png`,
    jsonLd: jsonLdAcademia(c, hub, publicate),
    stiluri: ['/academia/academia.css'],
  }) + '\n' + bodyAcademia(c, { corp: corpHubHtml, foto: fotoAutor }));

  for (const cap of publicate) {
    // fotografiile capitolului: fiecare secțiune care are una în manifest o primește imediat
    // după primul paragraf. Mai multe fotografii pot împărți o secțiune — se așază în ordinea
    // din manifest. Cele care lipsesc randează un locaș gol, marcat ca atare.
    const peSectiune = {};
    for (const [id, v] of Object.entries(IMG)) {
      const sect = limba === 'ro' ? v.sectiune : v.sectiuneEn;
      if (sect) (peSectiune[sect] ??= []).push(id);
    }
    const corp = md(cap.corp, {
      fisier: cap.fisier,
      dupaPrimulParagraf: (sectiune) => (peSectiune[sectiune] ?? [])
        .map((id) => figura(IMG[id], { etichetaLipsa: AC.fotoLipsa, alt: altFoto(id) })).join('\n'),
    });
    // VECINUL și TOTALUL vin din lista de capitole a CURSULUI (`academia.carduri`), nu din câte
    // fișiere are limba curentă. Altfel pagina engleză spunea „Chapter 2 of 2", fiindcă doar
    // două capitole sunt traduse — deși cursul are patru, și scrie asta chiar pe hub.
    // Titlul unui capitol încă nepublicat se ia tot de acolo, deci rămâne în limba paginii.
    const vecin = (n) => {
      const card = AC.carduri.find((x) => x.capitol === n);
      if (!card) return null;
      const x = reale.find((y) => y.capitol === n);
      return x && publicat(x)
        ? { slug: x.slug, titlu: x.titlu, publicat: true }
        : { slug: hub.slug, titlu: card.titlu, publicat: false };
    };
    scrie(`${dir}${cap.slug}/index.html`, head(c, alt, {
      titlu: cap.titluSeo,
      descriere: cap.metaDescriere,
      cale: `/${cap.slug}/`,
      caleAlt: perechea(limba, cap.capitol),
      ogImagine: `/landing/og-academia-${cap.capitol}${limba === 'ro' ? '' : '-en'}.png`,
      jsonLd: jsonLdCapitol(c, cap, hub),
      stiluri: ['/academia/academia.css'],
      tip: 'article',
    }) + '\n' + bodyCapitol(c, {
      cap, corp, foto: fotoAutor, total: AC.carduri.length, slugHub: hub.slug,
      anterior: vecin(cap.capitol - 1), urmator: vecin(cap.capitol + 1),
    }));
  }
}

// ── CONTACT ȘI CONTRIBUȚII, în ambele limbi ─────────────────────────────────
//
// Aceeași cale ca tot restul: `head()` pentru antet, `bodyContact()` pentru corp, hreflang
// reciproc între /contact și /en/contact. Formularul postează către endpointul PHP, care stă
// în rădăcina publică — de aceea pagina nu are nevoie de nimic special la build.
const CALE_CONTACT = { ro: 'contact', en: 'contact' };
for (const limba of LIMBI) {
  const c = site[limba];
  const alt = site[LIMBI.find((l) => l !== limba)];
  const dir = limba === 'ro' ? '' : `${c.radacina.replace(/^\/|\/$/g, '')}/`;
  scrie(`${dir}${CALE_CONTACT[limba]}/index.html`, head(c, alt, {
    titlu: c.contact.titluSeo,
    descriere: c.contact.metaDescriere,
    cale: `/${CALE_CONTACT[limba]}/`,
    caleAlt: `/${CALE_CONTACT[LIMBI.find((l) => l !== limba)]}/`,
    ogImagine: `/landing/og-contact${limba === 'ro' ? '' : '-en'}.png`,
    jsonLd: jsonLdContact(c),
    stiluri: ['/academia/academia.css', '/contact/contact.css'],
  }) + '\n' + bodyContact(c));
}

// ── pagina de aplicație: huse iPhone ────────────────────────────────────────
// Aceeași cale ca la contact. E singura pagină de aplicație deocamdată (DECIZIE, HUS.2); se
// adaugă lângă cardul din landing, nu îl înlocuiește.
//
// CÂT TIMP APLICAȚIA E ASCUNSĂ, pagina nu se mai generează. O pagină publică la care nu duce
// niciun link din site tot ajunge indexată, iar aia ar trimite oameni la un generator despre care
// tocmai am hotărât că nu e gata. Sursa adevărului e `ascuns` din `content/site.*.json`, ca să
// nu existe două locuri de ținut minte.
const CALE_HUSE = 'aplicatii/huse-iphone';
const huseAscunse = (site.ro.aplicatiiLista ?? []).some((x) => x.slug === 'huse-iphone' && x.ascuns);
for (const limba of huseAscunse ? [] : LIMBI) {
  const c = site[limba];
  const alt = site[LIMBI.find((l) => l !== limba)];
  const dir = limba === 'ro' ? '' : `${c.radacina.replace(/^\/|\/$/g, '')}/`;
  const pag = c.paginaHuse;
  scrie(`${dir}${CALE_HUSE}/index.html`, head(c, alt, {
    titlu: `${pag.titlu} — Magic3D`,
    descriere: pag.descriere,
    cale: `/${CALE_HUSE}/`,
    caleAlt: `/${CALE_HUSE}/`,
    ogImagine: '/produse/huse-iphone.png',
    stiluri: ['/academia/academia.css'],
  }) + '\n' + bodyAplicatie(c, pag, '/huse.html')   /* aplicatiile au O SINGURA pagina, iar limba se
    comuta la rulare din shell: `en/<aplicatie>.html` nu exista pentru niciuna. Prima
    varianta a paginii EN trimitea acolo, si suita de linkuri a prins-o. */);
}

// ── imagini Open Graph, per limbă ───────────────────────────────────────────
// Randarea încorporată e o FOTOGRAFIE de produs reală din public/produse/, nu o ilustrație
// vectorială. Cardurile folosesc aceleași randări (vezi aplicatiiLista din content).
const og = [];
for (const limba of LIMBI) {
  const c = site[limba];
  const cale = limba === 'ro' ? 'public/landing/og-landing.png' : 'public/landing/og-landing-en.png';
  og.push(await scrieOG(cale, {
    titlu: c.hero.h1Inainte + ' ' + c.hero.h1Accent + '.',
    subtitlu: c.meta.og,
    randare: 'public/produse/litere-decor.png',
  }));
}

// OG-ul Academiei: aceeași cale SVG→PNG, cu fotografia atelierului în bandă în locul randării
for (const limba of LIMBI) {
  const sufix = limba === 'ro' ? '' : '-en';
  const { hub: h, publicate: pub } = ACAD[limba];
  const foto = (nr) => existaFisier(`public/academia/img/${SURSA_OG[nr] ?? 'atelier-linie'}-1000.webp`);
  og.push(await scrieOG(`public/landing/og-academia${sufix}.png`, {
    titlu: h.h1, subtitlu: h.metaDescriere, randare: foto(0),
  }));
  for (const cap of pub) {
    og.push(await scrieOG(`public/landing/og-academia-${cap.capitol}${sufix}.png`, {
      titlu: cap.h1, subtitlu: cap.metaDescriere, randare: foto(cap.capitol),
    }));
  }
}

for (const limba of LIMBI) {
  const c = site[limba];
  og.push(await scrieOG(`public/landing/og-contact${limba === 'ro' ? '' : '-en'}.png`, {
    titlu: c.contact.h1,
    subtitlu: c.contact.metaDescriere,
    randare: existaFisier('public/academia/img/atelier-linie-1000.webp'),
  }));
}

// ── sitemap.xml, cu hreflang per intrare ────────────────────────────────────
// Doar paginile INDEXABILE. Aplicațiile în lucru nu au pagină și nu intră aici,
// cum cere cerința. Paginile de aplicație se adaugă la partea 3.
const dom = site.ro.site.domeniu;
// fiecare intrare: perechea RO/EN de URL-uri absolute
const paginiSitemap = [
  { ro: `${dom}/`, en: `${dom}/en/` },
  { ro: `${dom}/${CALE_CONTACT.ro}/`, en: `${dom}/en/${CALE_CONTACT.en}/` },
];
// Academia are acum pereche în ambele limbi: intră ca perechi, cu hreflang, ca landing-ul.
const paginiAcademia = [
  { ro: `${dom}/${ACAD.ro.hub.slug}/`, en: `${dom}/en/${ACAD.en.hub.slug}/` },
  ...PUBLICATE.map((n) => ({
    ro: `${dom}/${ACAD.ro.reale.find((x) => x.capitol === n).slug}/`,
    en: `${dom}/en/${ACAD.en.reale.find((x) => x.capitol === n).slug}/`,
  })),
];
const intrareSitemap = (p) => `  <url>
    <loc>${p.ro}</loc>
    <xhtml:link rel="alternate" hreflang="ro" href="${p.ro}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${p.en}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${p.ro}"/>
  </url>`;
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml">
${[...paginiSitemap, ...paginiAcademia].map(intrareSitemap).join('\n')}
</urlset>
`;
scrie('public/sitemap.xml', sitemap);

// ── robots.txt ──────────────────────────────────────────────────────────────
scrie('public/robots.txt',
  `User-agent: *\nAllow: /\n\nSitemap: ${site.ro.site.domeniu}/sitemap.xml\n`);

console.log(`\nPagini generate (${scrise.length}):`);
for (const f of scrise) console.log(`  ${f}`);
console.log(`\nImagini OG generate (${og.length}); cardurile folosesc randările din public/produse/`);
console.log('\nIntrări Vite pentru landing (în vite.config.ts, build.rollupOptions.input):');
console.log(`  landing:   resolve(__dirname, 'index.html')      // pagina de prezentare, la radacina`);
console.log(`  litere:    resolve(__dirname, 'litere.html')     // aplicatia Litere Decor`);
console.log(`  landingEn: resolve(__dirname, 'en/index.html')`);
for (const limba of LIMBI) {
  const dir = limba === 'ro' ? '' : 'en/';
  const { hub: h, publicate: pub } = ACAD[limba];
  for (const x of [h, ...pub]) {
    console.log(`  ${limba}${x.capitol}: resolve(__dirname, '${dir}${x.slug}/index.html')`);
  }
  console.log(`  contact${limba}: resolve(__dirname, '${dir}${CALE_CONTACT[limba]}/index.html')`);
}
