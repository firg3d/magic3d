/**
 * ȘABLOANELE PAGINILOR — HTML din conținut, nu conținut în HTML.
 *
 * Fiecare funcție primește `c` (conținutul unei limbi din site.<lang>.json) și `alt` (perechea
 * în cealaltă limbă, pentru hreflang). Întorc HTML complet, servit ca atare: tot textul e în
 * DOM la livrare, nu injectat după hidratare — condiție pentru SEO și pentru cititoarele de
 * ecran, spusă explicit în cerință.
 *
 * DE CE FUNCȚII, NU UN MOTOR DE ȘABLOANE. Zero dependențe noi în bundle e o cerință dură.
 * Template literals fac exact ce trebuie și nu adaugă nimic.
 */

import { PRODUSE, linkCheckout } from '../src/core/config/produse.js';

/** escape pentru text în HTML — conținutul e al nostru, dar disciplina se ține oricum */
const e = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** escape pentru atribute */
const a = (s) => e(s).replace(/"/g, '&quot;');
/** {acolade} inlocuite cu valori — aceeasi conventie ca `t()` din aplicatie */
const interp = (sir, valori) => String(sir).replace(/\{(\w+)\}/g, (m, k) => (valori[k] !== undefined ? valori[k] : m));
/**
 * URL absolut din domeniu + rădăcină de limbă + cale relativă.
 *
 * Rădăcina de landing se normalizează cu `/` la final: `https://magic3d.ro/` și
 * `https://magic3d.ro/en/`. canonical fără slash la un director e o inconsecvență pe care
 * crawlerele o tratează ca pagină separată — exact ce hreflang încearcă să prevină.
 */
export const url = (c, cale = '') => {
  const baza = c.site.domeniu + (c.radacina === '/' ? '' : c.radacina);
  const plin = baza + cale;
  return cale === '' ? plin.replace(/\/?$/, '/') : plin;
};

/**
 * Adresa unei APLICAȚII, cu limba în ea.
 *
 * Aplicațiile sunt o singură pagină per produs, nu una per limbă: interfața lor se traduce din
 * dicționar, în browser. Deci de pe landing-ul englez se pleacă cu `?lang=en`, iar aplicația
 * pornește direct în engleză, fără să dublăm 12 fișiere HTML.
 */
export const urlApp = (c, cale) =>
  (c.limba === 'ro' ? cale : `${cale}${cale.includes('?') ? '&' : '?'}lang=${c.limba}`);

/**
 * <head> comun: meta, hreflang, canonical, Open Graph, JSON-LD.
 *
 * hreflang leagă cele două limbi ȘI declară x-default → RO, cum cere cerința. canonical e
 * absolut. OG-ul primește o imagine per pagină; dacă lipsește încă (vezi lista de active
 * neproduse), se omite, nu se pune una spartă.
 */
export function head(c, alt, { titlu, descriere, cale = '', caleAlt, ogImagine, jsonLd, stiluri = [], tip = 'website', ogDescriere }) {
  // og:description e, pe landing, un text scurt scris special pentru card (`meta.og`) — nu
  // descrierea de motor de căutare. O pagină cu subiect propriu și-o dă pe a ei; fără asta,
  // Academia ar fi partajată pe rețele cu textul despre generatoarele parametrice.
  const ogDesc = ogDescriere ?? descriere ?? c.meta.og;
  const canonical = url(c, cale);
  // `alt` lipsă = pagina NU are încă pereche în cealaltă limbă (Academia, deocamdată). Atunci nu
  // se emite niciun hreflang: o pereche declarată către un URL care dă 404 e mai rea decât una
  // nedeclarată — Google o raportează ca eroare și ignoră tot grupul.
  // CALEA PERECHII poate să difere de a paginii curente. Pe landing sunt identice („/"), dar
  // Academia are slug-uri traduse: /academia/ce-filament-alegi/ ↔ /en/academy/which-filament-to-choose/.
  // Fără `caleAlt`, hreflang-ul ar arăta către /en/academia/ce-filament-alegi/, care nu există.
  const cAlt = caleAlt ?? cale;
  const roC = c.limba === 'ro' ? c : alt;
  const caleRo = c.limba === 'ro' ? cale : cAlt;
  const alternative = alt ? `
<link rel="alternate" hreflang="${c.limba}" href="${a(canonical)}">
<link rel="alternate" hreflang="${alt.limba}" href="${a(url(alt, cAlt))}">
<link rel="alternate" hreflang="x-default" href="${a(url(roC, caleRo))}">` : '';
  return `<!doctype html>
<html lang="${c.limba}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(titlu)}</title>
<meta name="description" content="${a(descriere)}">
<meta name="author" content="${a(c.site.autor)}">
<meta name="theme-color" content="#5b4dd1">
<link rel="canonical" href="${a(canonical)}">${alternative}
<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:type" content="${a(tip)}">
<meta property="og:locale" content="${c.limba === 'ro' ? 'ro_RO' : 'en_US'}">
<meta property="og:site_name" content="${a(c.site.nume)}">
<meta property="og:title" content="${a(titlu)}">
<meta property="og:description" content="${a(ogDesc)}">
<meta property="og:url" content="${a(canonical)}">${ogImagine ? `
<meta property="og:image" content="${a(url(c, ogImagine))}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">` : ''}
<meta name="twitter:card" content="${ogImagine ? 'summary_large_image' : 'summary'}">
<meta name="twitter:title" content="${a(titlu)}">
<meta name="twitter:description" content="${a(ogDesc)}">
<link rel="stylesheet" href="/landing/landing.css">${stiluri.map((f) => `
<link rel="stylesheet" href="${a(f)}">`).join('')}
<script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2)}
</script>
</head>`;
}

/** JSON-LD pentru landing: aplicația + organizația + site-ul cu căutare + FAQ */
export function jsonLdLanding(c) {
  const dom = c.site.domeniu;
  const preturi = c.preturi.planuri.filter((p) => p.pret !== '0').map((p) => ({
    '@type': 'Offer', price: p.pret, priceCurrency: 'RON', name: p.nume,
  }));
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': `${dom}/#org`, name: c.site.autor, url: `${dom}/`,
        description: c.site.descriereOrganizatie },
      { '@type': 'WebSite', '@id': `${dom}/#site`, url: `${dom}/`, name: c.site.nume,
        inLanguage: c.limba === 'ro' ? 'ro-RO' : 'en-US',
        publisher: { '@id': `${dom}/#org` },
        potentialAction: { '@type': 'SearchAction',
          target: { '@type': 'EntryPoint', urlTemplate: `${dom}/?q={q}` }, 'query-input': 'required name=q' } },
      { '@type': 'SoftwareApplication', name: c.site.nume, applicationCategory: 'DesignApplication',
        operatingSystem: 'Web', inLanguage: c.limba === 'ro' ? 'ro-RO' : 'en-US',
        publisher: { '@id': `${dom}/#org` },
        offers: preturi },
      { '@type': 'FAQPage', mainEntity: c.intrebari.lista.map((x) => ({
        '@type': 'Question', name: x.q,
        acceptedAnswer: { '@type': 'Answer', text: x.a } })) },
    ],
  };
}

/** header cu navigație + comutator de limbă ca LINK real (hreflang), nu buton JS */
function header(c, alt, cale, { ancoraLanding = '' } = {}) {
  const n = c.nav;
  // pe o pagină din afara landing-ului, „#aplicatii" nu duce nicăieri: ancorele primesc rădăcina
  const A_ = (id) => `${ancoraLanding}#${id}`;
  // LINK RELATIV LA RĂDĂCINĂ, nu absolut. `url()` produce https://magic3d.ro/en/ — corect în
  // <head>, unde hreflang cere URL absolut, dar greșit pentru butonul din pagină: de pe
  // localhost sau de pe orice mediu de probă te scoate pe domeniul de producție. Iar pe pagina
  // EN, `url(alt, cale)` cu cale='/en/' dădea chiar pagina curentă — butonul „Română" ducea
  // înapoi la engleză.
  const radacinaAlt = alt ? (alt.radacina === '/' ? '/' : `${alt.radacina.replace(/\/$/, '')}/`) : null;
  const linkLimba = radacinaAlt;
  return `<header class="hd">
  <a class="skip" href="#continut">${e(c.limba === 'ro' ? 'Sari la conținut' : 'Skip to content')}</a>
  <div class="wrap hd-in">
    <a class="logo" href="${c.radacina || '/'}" aria-label="${a(c.site.nume)}">
      <img src="/brand/magic3d-logo.svg" alt="${a(c.site.nume)}" width="150" height="36">
    </a>
    <nav class="nav" aria-label="${a(n.aplicatii)}">
      <a href="${A_('aplicatii')}">${e(n.aplicatii)}</a>
      <a href="${A_('cum')}">${e(n.cum)}</a>
      <a href="${A_('comparatie')}">${e(n.comparatie)}</a>
      <a href="${A_('preturi')}">${e(n.preturi)}</a>
      <a href="${A_('intrebari')}">${e(n.intrebari)}</a>
    </nav>
    <div class="hd-act">
      ${linkLimba ? `<a class="lang" href="${a(linkLimba)}" hreflang="${alt.limba}" lang="${alt.limba}">${e(n.spreLimba)}</a>` : ''}
      <a class="btn btn-p" href="${a(urlApp(c, '/litere.html'))}">${e(n.deschide)}</a>
    </div>
  </div>
</header>`;
}

/** corpul landing-ului — structura narativă păstrată, execuția reconstruită */
export function bodyLanding(c, alt, cale) {
  const H = c.hero, B = c.beneficii, AP = c.aplicatii, CUM = c.cum, CMP = c.comparatie,
    PC = c.parcurs, PR = c.preturi, IN = c.intrebari, FI = c.final, SB = c.subsol;

  // Cardul duce direct la aplicatia care ruleaza. Cine are si pagina de detaliu (`pagina`)
  // primeste un link SEPARAT sub card: un <a> in alt <a> e HTML invalid, iar un card care duce
  // in doua locuri dupa unde nimeresti nu e o alegere, e o loterie.
  const cardAplicatie = (ap) => {
    const card = `<a class="card" href="${a(urlApp(c, ap.app ?? ('/aplicatii/' + ap.slug)))}">
    <div class="card-art"><img src="${a(ap.thumb)}" alt="${a(ap.altThumb)}" width="600" height="450" loading="lazy" decoding="async"></div>
    <div class="card-b">
      <span class="tag tag-ok">${e(AP.etichetaGata)}</span>
      <h3>${e(ap.nume)}</h3>
      <p>${e(ap.rezumat)}</p>
      <span class="card-link">${e(AP.deschide)} →</span>
    </div>
  </a>`;
    if (!ap.pagina) return card;
    return `<div class="card-wrap">${card}
    <a class="card-detaliu" href="${a(urlApp(c, ap.pagina))}">${e(AP.afla)} →</a>
  </div>`;
  };

  // cardul „în lucru / în curând": dacă are `link`, întreg cardul e clicabil (ex. cardul de
  // tokeni). Randarea (dacă are `thumb`) apare estompată, cu un badge „În Curând" peste ea.
  const cardLucru = (x) => {
    const art = x.thumb
      ? `<div class="card-art card-art-soon"><img src="${a(x.thumb)}" alt="" width="600" height="450" loading="lazy" decoding="async"><span class="soon-badge">${e(AP.etichetaLucru)}</span></div>`
      : `<div class="card-art card-art-soon" aria-hidden="true"><span class="soon-badge">${e(AP.etichetaLucru)}</span></div>`;
    const corp = `<div class="card-b">
      <span class="tag tag-soon">${e(AP.etichetaLucru)}</span>
      <h3>${e(x.titlu)}</h3>
      <p>${e(x.text)}</p>
      <span class="card-link${x.link ? '' : ' card-link-mut'}">${e(x.link ? (x.cta ?? AP.inDezvoltare) : AP.inDezvoltare)}${x.link ? ' →' : ''}</span>
    </div>`;
    return x.link
      ? `<a class="card card-soon" href="${a(x.link)}">${art}${corp}</a>`
      : `<div class="card card-soon">${art}${corp}</div>`;
  };

  const cardPret = (p) => {
    const rec = p.cheie === 'comercial';
    // PRETUL PRODUSELOR DIN MAGAZIN vine din produse.ts, nu din continut: e acelasi numar care
    // apare pe butonul de cumparare si la casa, si trebuie schimbat intr-un singur loc.
    const prod = p.produs ? PRODUSE[p.produs] : null;
    const pret = prod ? String(prod.pret) : p.pret;
    const moneda = prod ? prod.moneda : p.moneda;
    const pretLinie = p.pretAn
      ? `<div class="pret"><b>${e(pret)}</b> ${e(moneda)}<span>/${e(p.perioada.replace(/^pe |^per /, ''))}</span></div>
         <div class="pret-alt">${e(p.pretAn)} ${e(moneda)} ${e(p.perioadaAn)} · <em>${e(p.economie)}</em></div>`
      : `<div class="pret"><b>${e(pret)}</b> ${e(moneda)}${p.perioada ? `<span>/${e(p.perioada)}</span>` : ''}</div>`;
    // La produsele din magazin, butonul duce DIRECT LA CHECKOUT, iar linkul catre pagina de
    // detalii ramane dedesubt. Fila noua peste tot: omul poate avea lucru nesalvat in aplicatie.
    const actiune = prod
      ? `<a class="btn btn-p" href="${a(linkCheckout(p.produs, c.limba))}"
          target="_blank" rel="noopener noreferrer">${e(p.ctaCumpara)} — ${e(pret)} ${e(moneda)}</a>
        <a class="pcard-detalii" href="${a(p.link)}">${e(p.ctaDetalii)} →</a>`
      : `<a class="btn ${rec ? 'btn-p' : 'btn-g'}" href="${a(p.link)}">${e(p.cta)}</a>`;
    return `<div class="pcard${rec ? ' pcard-rec' : ''}">
      ${rec ? `<span class="pcard-badge">${e(PR.recomandat)}</span>` : ''}
      <h3>${e(p.nume)}</h3>
      <p class="pcard-sub">${e(p.text)}</p>
      ${pretLinie}
      <ul>${p.puncte.map((pt) => `<li>${e(pt)}</li>`).join('')}</ul>
      ${actiune}
    </div>`;
  };

  return `<body>
${header(c, alt, cale)}
<main id="continut">

  <section class="hero">
    <div class="wrap hero-in">
      <div class="hero-txt">
        <h1>${e(H.h1Inainte)} <em>${e(H.h1Accent)}</em>.</h1>
        <p class="lead">${e(H.lead)}</p>
        <div class="cta">
          <a class="btn btn-p btn-lg" href="${a(urlApp(c, '/litere.html'))}">${e(H.ctaPrimar)} →</a>
          <a class="btn btn-g btn-lg" href="#cum">${e(H.ctaSecundar)}</a>
        </div>
        <ul class="trust">${H.incredere.map((t) =>
          `<li><b${t.numara ? ` data-numara="${a(t.cifra)}"` : ''}>${e(t.numara ? '0' : t.cifra)}</b><span>${e(t.text)}</span></li>`).join('')}</ul>
      </div>
      <div class="hero-demo" aria-hidden="true">
        <img class="hero-img" src="/produse/litere-decor.png" alt="" width="1100" height="825" fetchpriority="high" decoding="async"
          onerror="this.closest('.hero-demo').classList.add('fara-img')">
        <div class="consola" data-consola data-nume='${a(JSON.stringify(H.consolaNume))}'>
          <div class="consola-ttl">${e(H.consolaTitlu)}</div>
          <div class="consola-nume">${e(H.consolaNume[0])}</div>
          <dl class="consola-par">${H.consolaParametri.map((p) =>
            `<div><dt>${e(p.eticheta)}</dt><dd data-par='${a(JSON.stringify(p.valori))}'>${e(p.valori[0])}</dd></div>`).join('')}</dl>
        </div>
      </div>
    </div>
  </section>

  <section class="sec sec-alt">
    <div class="wrap">
      <h2 class="reveal">${e(B.titlu)}</h2>
      <div class="grid-3">${B.carduri.map((x) =>
        `<div class="benef reveal"><h3>${e(x.titlu)}</h3><p>${e(x.text)}</p></div>`).join('')}</div>
    </div>
  </section>

  <section class="sec" id="aplicatii">
    <div class="wrap">
      <h2 class="reveal">${e(AP.titlu)}</h2>
      <p class="sub reveal">${e(AP.sub)}</p>
      <div class="cards">
        ${(c.aplicatiiLista ?? []).filter((x) => !x.ascuns).map(cardAplicatie).join('\n        ')}
        ${AP.inLucru.map(cardLucru).join('\n        ')}
      </div>
    </div>
  </section>

  <section class="sec sec-alt" id="cum">
    <div class="wrap">
      <h2 class="reveal">${e(CUM.titlu)}</h2>
      <ol class="pasi">${CUM.pasi.map((p, i) =>
        `<li class="reveal"><span class="pas-n">${i + 1}</span><h3>${e(p.titlu)}</h3><p>${e(p.text)}</p></li>`).join('')}</ol>
    </div>
  </section>

  <section class="sec" id="comparatie">
    <div class="wrap">
      <h2 class="reveal">${e(CMP.titlu)}</h2>
      <div class="tabel-wrap reveal">
      <table class="cmp">
        <thead><tr><th></th><th>${e(CMP.capCad)}</th><th class="cmp-noi">${e(CMP.capNoi)}</th></tr></thead>
        <tbody>${CMP.randuri.map((r) =>
          `<tr><th scope="row">${e(r.criteriu)}</th><td>${e(r.cad)}</td><td class="cmp-noi">${e(r.noi)}</td></tr>`).join('')}</tbody>
      </table>
      </div>
    </div>
  </section>

${sectiuneAcademia(c)}

  <section class="sec sec-alt" id="parcurs">
    <div class="wrap">
      <h2 class="reveal">${e(PC.titlu)}</h2>
      <p class="sub reveal">${e(PC.sub)}</p>
      <div class="prog reveal">
        <strong>${e(PC.stadiu)}</strong>
        <div class="bara"><i style="--p:${PC.procent}%"></i></div>
        <div class="bara-lab"><span><b>${e(PC.etichetaBara)}</b></span><span>${e(PC.versiune)}</span></div>
        <div class="mile">${PC.etape.map((m) =>
          `<div class="m ${m.stare === 'gata' ? 'm-gata' : ''}"><div class="m-s">${e(m.stare === 'gata' ? PC.gata : PC.urmeaza)}</div><h4>${e(m.titlu)}</h4><p>${e(m.text)}</p></div>`).join('')}</div>
      </div>
    </div>
  </section>

  <section class="sec" id="preturi">
    <div class="wrap">
      <h2 class="reveal">${e(PR.titlu)}</h2>
      <p class="sub reveal">${e(PR.sub)}</p>
      <div class="preturi">${PR.planuri.map(cardPret).join('')}</div>
      <p class="pret-v2 reveal">${e(PR.notaV2)}</p>
      ${PR.incurajare ? `<p class="pret-incurajare reveal">${e(PR.incurajare)}</p>` : ''}
    </div>
  </section>

  <section class="sec sec-alt" id="intrebari">
    <div class="wrap wrap-ingust">
      <h2 class="reveal">${e(IN.titlu)}</h2>
      <div class="faq">${IN.lista.map((x) =>
        `<details class="reveal"><summary>${e(x.q)}</summary><div class="faq-a"><p>${e(x.a)}</p></div></details>`).join('')}</div>
    </div>
  </section>

  <section class="sec sec-final">
    <div class="wrap">
      <div class="final reveal">
        <h2>${e(FI.titlu)}</h2>
        <p>${e(FI.text)}</p>
        <a class="btn btn-p btn-lg" href="${a(urlApp(c, '/litere.html'))}">${e(FI.cta)} →</a>
      </div>
    </div>
  </section>

</main>
${subsol(c)}
<script type="module" src="/landing/landing.js"></script>
</body>
</html>`;
}

/** subsolul comun landing-ului și paginilor Academiei */
function subsol(c) {
  const SB = c.subsol, PR = c.preturi;
  return `<footer class="ft">
  <div class="wrap ft-in">
    <span><b>${e(SB.semnatura)}</b></span>
    <span>${e(SB.rezumat)}</span>
    <span class="ft-lk"><a href="${a(`${R(c)}/contact/`)}">${e(c.contact.navContact)}</a> · <a href="${a(PR.planuri[1].link)}">${e(SB.licenta)}</a> · <a href="${a(PR.planuri[2].link)}">${e(SB.suporter)}</a></span>
  </div>
</footer>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// ACADEMIA 3D
//
// Aceleași funcții, același <head>, același header și subsol ca landing-ul. Ce e propriu
// Academiei: corpul vine din markdown-ul din `content/academia/`, nu din JSON, fiindcă e proză
// scrisă de om, iar JSON-ul nu e un format în care se scrie proză.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Organizația, cu datele reale ale firmei.
 *
 * E blocul care face diferența dintre „încă un ghid tradus" și o sursă cu autoritate: CUI,
 * adresă, telefon, profilurile care confirmă că firma există și lucrează. Se folosește ca
 * `provider` și `publisher` peste tot în Academie.
 */
export const ORGANIZATIE = {
  '@type': 'Organization',
  '@id': 'https://firg3d.ro/#firg3d',
  name: 'Firg3D Printing SRL',
  url: 'https://firg3d.ro',
  logo: 'https://praktik3d.ro/cdn/shop/files/LOGO_PRAKTIK3D_3805b50e-07d3-4064-944d-1667642f4e48.png',
  taxID: '51519313',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Strada Doina nr. 9',
    addressLocality: 'București',
    postalCode: '052151',
    addressCountry: 'RO',
  },
  telephone: '+40744330466',
  email: 'contact@firg3d.com',
  sameAs: [
    'https://praktik3d.ro',
    'https://www.facebook.com/firg3d/',
    'https://www.instagram.com/praktik3d/',
    'https://www.youtube.com/@Firg3D3d',
    'https://www.tiktok.com/@praktik3dd',
  ],
};

/** autorul capitolelor: PERSOANĂ, nu brand — conținutul semnat de un om se tratează altfel */
export const AUTOR = {
  '@type': 'Person',
  // @id stabil, independent de limbă: aceeași persoană semnează și paginile RO, și cele EN
  '@id': 'https://magic3d.ro/#autor',
  name: 'Ion V. Frunzac',
  worksFor: { '@id': ORGANIZATIE['@id'] },
};

/**
 * Prefixul de limbă pentru linkuri interne: '' la română, '/en' la engleză.
 *
 * `radacina` e '/' la română, iar `/${'/'}${slug}` ar da „//academia/..." — un link care
 * funcționează în browser, dar arată a greșeală și ajunge așa în canonical și în sitemap.
 */
const R = (c) => (c.radacina === '/' ? '' : c.radacina.replace(/\/$/, ''));

/** adresa unei pagini din Academie, în limba lui `c` */
export const caleCapitol = (c, slug) => `${R(c)}/${slug}/`;

/** JSON-LD pentru hub: un Course gratuit, cu capitolele PUBLICATE ca părți */
export function jsonLdAcademia(c, hub, publicate) {
  const dom = c.site.domeniu;
  const adresa = (slug) => `${dom}${caleCapitol(c, slug)}`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      ORGANIZATIE,
      {
        '@type': 'Course',
        '@id': `${adresa(hub.slug)}#curs`,
        name: hub.titlu,
        description: hub.metaDescriere,
        url: adresa(hub.slug),
        inLanguage: c.limba === 'ro' ? 'ro-RO' : 'en-GB',
        isAccessibleForFree: true,
        educationalLevel: 'beginner',
        teaches: hub.cuvinteCheie ?? [],
        provider: { '@id': ORGANIZATIE['@id'] },
        publisher: { '@id': ORGANIZATIE['@id'] },
        author: AUTOR,
        // DOAR capitolele care au pagină. Un `hasPart` către un URL care dă 404 e o promisiune
        // pe care structura o face în numele nostru și pe care site-ul n-o ține.
        hasPart: publicate.map((cap) => ({
          '@type': 'Article',
          '@id': `${adresa(cap.slug)}#articol`,
          name: cap.titlu,
          headline: cap.h1,
          url: adresa(cap.slug),
          description: cap.metaDescriere,
          position: cap.capitol,
        })),
      },
    ],
  };
}

/** JSON-LD pentru un capitol: Article semnat + firul Ariadnei. FĂRĂ FAQPage — e proză. */
export function jsonLdCapitol(c, cap, hub) {
  const dom = c.site.domeniu;
  const adresa = (slug) => `${dom}${caleCapitol(c, slug)}`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      ORGANIZATIE,
      {
        '@type': 'Article',
        '@id': `${adresa(cap.slug)}#articol`,
        headline: cap.h1,
        name: cap.titlu,
        description: cap.metaDescriere,
        url: adresa(cap.slug),
        inLanguage: c.limba === 'ro' ? 'ro-RO' : 'en-GB',
        isAccessibleForFree: true,
        keywords: (cap.cuvinteCheie ?? []).join(', '),
        author: AUTOR,
        publisher: { '@id': ORGANIZATIE['@id'] },
        isPartOf: { '@id': `${adresa(hub.slug)}#curs` },
        articleSection: hub.titlu,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: c.site.nume, item: `${dom}${R(c)}/` },
          { '@type': 'ListItem', position: 2, name: hub.titlu, item: adresa(hub.slug) },
          { '@type': 'ListItem', position: 3, name: cap.titlu, item: adresa(cap.slug) },
        ],
      },
    ],
  };
}

/**
 * O fotografie din manifest, ca <picture> cu AVIF + WebP și srcset pe trei lățimi.
 *
 * `width`/`height` sunt cele MĂSURATE la import, nu ghicite: fără ele browserul nu știe cât loc
 * să rezerve și pagina sare când sosește imaginea.
 *
 * Fotografia care LIPSEȘTE randează un locaș vizibil, cu textul ei. Nu se pune altă poză în loc:
 * într-un capitol despre cum arată defectele, o piesă reușită pusă pe post de defect e chiar
 * eroarea pe care capitolul o combate.
 */
export function figura(img, { legenda, etichetaLipsa, alt, dimensiuni = '(max-width: 820px) 100vw, 760px' }) {
  if (!img) return '';
  // `alt` primit = textul în limba paginii. Lipsă = româna din manifest, ca înainte.
  const text = alt ?? img.alt;
  if (img.lipsa) {
    return `<figure class="ac-foto ac-foto-lipsa">
      <div class="ac-slot"><span>${e(etichetaLipsa)}</span></div>
      <figcaption>${e(text)}</figcaption>
    </figure>`;
  }
  const set = (f) => img.surse.filter((s) => s.format === f)
    .sort((x, y) => x.w - y.w).map((s) => `${s.fisier} ${s.w}w`).join(', ');
  const mare = img.surse.filter((s) => s.format === 'webp').reduce((x, y) => (y.w > x.w ? y : x));
  return `<figure class="ac-foto">
    <picture>
      <source type="image/avif" srcset="${a(set('avif'))}" sizes="${a(dimensiuni)}">
      <source type="image/webp" srcset="${a(set('webp'))}" sizes="${a(dimensiuni)}">
      <img src="${a(mare.fisier)}" alt="${a(text)}" width="${img.w}" height="${img.h}"
        loading="lazy" decoding="async">
    </picture>${legenda ? `
    <figcaption>${e(legenda)}</figcaption>` : ''}
  </figure>`;
}

/** caseta de autor, sub fiecare capitol și pe hub — legătura către atelierul care semnează */
function casetaAutor(AC, foto) {
  return `<aside class="ac-autor">
    ${foto}
    <div class="ac-autor-txt">
      <h2>${e(AC.autorTitlu)}</h2>
      <p>${e(AC.autorText)}</p>
      <p><a class="ac-lk" href="https://praktik3d.ro/pages/despre-noi" target="_blank" rel="noopener">${e(AC.autorLink)} →</a></p>
    </div>
  </aside>`;
}

/** pagina hub: corpul din markdown + cardurile capitolelor + caseta de autor */
export function bodyAcademia(c, { corp, foto }) {
  const AC = c.academia;
  return `<body class="ac">
${header(c, null, '', { ancoraLanding: `${R(c)}/` })}
<main id="continut" class="ac-main">
  <article class="wrap wrap-ingust ac-proza ac-hub">
${corp}
  </article>

  <div class="wrap wrap-ingust">
${casetaAutor(AC, foto)}
  </div>
</main>
${subsol(c)}
<script type="module" src="/academia/academia.js"></script>
</body>
</html>`;
}

/**
 * pagina unui capitol: proza, bara de navigare și caseta de autor.
 *
 * Navigarea de jos are trei locuri fixe — anteriorul, poziția, următorul — iar capitolele
 * nepublicate încă apar ca text mut, nu ca link către o pagină care nu există.
 */
export function bodyCapitol(c, { cap, corp, foto, total, anterior, urmator, slugHub }) {
  const AC = c.academia;
  const capat = (x, eticheta, clasa) => {
    if (!x) return '<span class="ac-nav-gol"></span>';
    return x.publicat
      ? `<a class="ac-nav-lk ${clasa}" href="${a(caleCapitol(c, x.slug))}"><span>${e(eticheta)}</span><b>${e(x.titlu)}</b></a>`
      : `<span class="ac-nav-lk ac-nav-mut ${clasa}"><span>${e(eticheta)}</span><b>${e(x.titlu)} · ${e(AC.curand)}</b></span>`;
  };
  return `<body class="ac">
${header(c, null, '', { ancoraLanding: `${R(c)}/` })}
<main id="continut" class="ac-main">
  <nav class="wrap wrap-ingust ac-firimituri" aria-label="${a(AC.firimituri)}">
    <a href="${a(`${R(c)}/`)}">${e(c.site.nume)}</a> <span>›</span>
    <a href="${a(caleCapitol(c, slugHub))}">${e(AC.scurt)}</a> <span>›</span>
    <span aria-current="page">${e(cap.titlu)}</span>
  </nav>

  <article class="wrap wrap-ingust ac-proza" data-capitol="${a(cap.slug)}">
    <p class="ac-meta">${e(AC.capitol)} ${cap.capitol} ${e(AC.din)} ${total}${cap.citire ? ` · ${cap.citire} ${e(AC.minute)}` : ''}</p>
${corp}
  </article>

  <nav class="wrap wrap-ingust ac-nav" aria-label="${a(AC.navCapitole)}">
    ${capat(anterior, AC.anterior, 'ac-nav-prev')}
    <span class="ac-nav-poz">${cap.capitol} ${e(AC.din)} ${total}</span>
    ${capat(urmator, AC.urmator, 'ac-nav-next')}
  </nav>

  <div class="wrap wrap-ingust">
${casetaAutor(AC, foto)}
  </div>
</main>
${subsol(c)}
<script type="module" src="/academia/academia.js"></script>
</body>
</html>`;
}

/** secțiunea de pe landing, între „De ce nu CAD" și „Parcurs" */
export function sectiuneAcademia(c) {
  const AC = c.academia;
  const card = (x) => {
    const corp = `<span class="ac-card-nr">${e(AC.capitol)} ${x.capitol}</span>
      <h3>${e(x.titlu)}</h3>
      <p>${e(x.text)}</p>
      ${x.gata ? `<span class="card-link">${e(AC.citeste)} →</span>` : `<span class="tag tag-soon">${e(AC.curand)}</span>`}`;
    return `<a class="ac-card${x.gata ? '' : ' ac-card-soon'}" href="${a(caleCapitol(c, x.link))}">${corp}</a>`;
  };
  return `  <section class="sec sec-academia" id="academia">
    <div class="wrap">
      <span class="ac-eticheta reveal">${e(AC.eticheta)}</span>
      <h2 class="reveal">${e(AC.titlu)}</h2>
      <p class="sub reveal">${e(AC.sub)}</p>
      <div class="ac-grid reveal">${AC.carduri.map(card).join('')}</div>
      <div class="cta reveal">
        <a class="btn btn-p btn-lg" href="${a(caleCapitol(c, AC.linkHub))}">${e(AC.ctaPrimar)} →</a>
        <a class="btn btn-g btn-lg" href="${a(caleCapitol(c, AC.linkPrimulCapitol))}">${e(AC.ctaSecundar)}</a>
      </div>
      <p class="ac-semnatura reveal">${e(AC.incheiere)}</p>
    </div>
  </section>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTACT ȘI CONTRIBUȚII
//
// Un formular servit ca HTML complet, ca restul site-ului: toate câmpurile, etichetele și
// opțiunile sunt în DOM la livrare, nu construite de JavaScript. Scriptul de pe pagină adaugă
// doar ce nu se poate exprima static — trage-și-lasă, previzualizări, stările de trimitere.
// Fără el, formularul tot se completează și tot se trimite: acțiunea e reală, nu interceptată.
//
// LIMITELE SUNT ALE ENDPOINTULUI, nu ale paginii. `contact-magic3d.php` acceptă 4 fișiere ×
// 15 MB și o listă fixă de categorii și aplicații; aceleași valori se declară o dată aici și
// ajung în HTML, în validarea din browser și în textele de eroare. O verificare în plus în
// browser nu înlocuiește niciodată una server-side — doar îi scutește omului un upload inutil.
// ═══════════════════════════════════════════════════════════════════════════

/** limitele endpointului, în ordinea în care le verifică și el */
export const LIMITE_CONTACT = {
  fisiereMax: 4,
  megaMax: 15,
  mesajMin: 20,
  mesajMax: 8000,
  numeMax: 120,
  extensii: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'stl', '3mf', 'obj', 'zip', 'pdf'],
  /** categoriile pentru care întrebarea „la ce aplicație" are sens */
  cuAplicatie: ['problema', 'tematica', 'baza'],
};

/**
 * JSON-LD pentru pagina de contact: ContactPage + organizația care răspunde.
 *
 * Aceeași organizație ca în Academie, prin `@id` — nu o a doua descriere a aceleiași firme.
 * Două definiții ale aceluiași lucru sub identificatori diferiți sunt exact ce încurcă un
 * motor de căutare care încearcă să afle cine e în spatele site-ului.
 */
export function jsonLdContact(c) {
  const dom = c.site.domeniu;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      ORGANIZATIE,
      {
        '@type': 'ContactPage',
        '@id': `${dom}${R(c)}/contact/#pagina`,
        name: c.contact.titluSeo,
        description: c.contact.metaDescriere,
        url: `${dom}${R(c)}/contact/`,
        inLanguage: c.limba === 'ro' ? 'ro-RO' : 'en-GB',
        isPartOf: { '@type': 'WebSite', url: `${dom}${R(c)}/`, name: c.site.nume },
        about: { '@id': ORGANIZATIE['@id'] },
      },
    ],
  };
}

/**
 * PAGINA DE APLICATIE — deocamdata una singura, huse iPhone (DECIZIE, HUS.2).
 *
 * Nu inlocuieste cardul din landing: se adauga langa el, printr-un „Afla mai multe". Celelalte
 * generatoare n-au pagina, si nu primesc una acum.
 *
 * Nota de la final NU e optionala si nu e footer decorativ: B.12 cere ca fiecare loc unde se
 * pomeneste iPhone sa spuna, in aceeasi pagina, ca Magic3D nu e afiliat cu Apple.
 */
export function bodyAplicatie(c, pag, hrefApp) {
  return `<body class="ac">
${header(c, null, '', { ancoraLanding: `${R(c)}/` })}
<main id="continut" class="ac-main">
  <div class="wrap wrap-ingust ac-proza">
    <h1>${e(pag.titlu)}</h1>
    <p class="ct-intro">${e(pag.descriere)}</p>
    ${pag.sectiuni.map((x) => `<section>
      <h2>${e(x.titlu)}</h2>
      <p>${e(x.text)}</p>
    </section>`).join('\n    ')}
    <p><a class="btn btn-p btn-lg" href="${a(hrefApp)}">${e(pag.cta)}</a></p>
    <p><small>${e(pag.nota)}</small></p>
  </div>
</main>
${subsol(c)}
</body>
</html>`;
}

export function bodyContact(c) {
  const K = c.contact;
  const L = LIMITE_CONTACT;
  const accept = L.extensii.map((x) => `.${x}`).join(',');

  const optiune = (o, implicit) =>
    `<option value="${a(o.valoare)}"${o.valoare === implicit ? ' selected' : ''}>${e(o.eticheta)}</option>`;

  // Textele de care are nevoie scriptul ajung la el ca DATE, într-un bloc JSON, nu ca șiruri
  // scrise în cod: sunt ale conținutului, iar pagina engleză trebuie să le primească pe ale ei.
  const texte = JSON.stringify({
    erori: K.erori, contorFisiere: K.contorFisiere, stergeFisier: K.stergeFisier,
    trimite: K.trimite, seTrimite: K.seTrimite, succes: K.succes,
    limite: L, categorii: K.categorii.map((x) => x.valoare), aplicatii: K.aplicatii.map((x) => x.valoare),
  });

  return `<body class="ac ct">
${header(c, null, '', { ancoraLanding: `${R(c)}/` })}
<main id="continut" class="ac-main">
  <div class="wrap wrap-ingust ac-proza">
    <h1>${e(K.h1)}</h1>
    <p class="ct-intro">${e(K.intro)}</p>
  </div>

  <section class="wrap wrap-ingust ct-utile">
    <h2>${e(K.utileTitlu)}</h2>
    <ul>${K.utile.map((x) => `
      <li><b>${e(x.titlu)}</b><span>${e(x.text)}</span></li>`).join('')}
    </ul>
  </section>

  <section class="wrap wrap-ingust ct-form-wrap">
    <h2>${e(K.formTitlu)}</h2>
    <form class="ct-form" method="post" action="${a(K.endpoint)}" enctype="multipart/form-data"
      data-texte='${a(texte)}'>

      <label class="ct-camp">
        <span class="ct-eticheta">${e(K.etichetaCategorie)}</span>
        <select name="categorie" required>${K.categorii.map((o) => optiune(o)).join('')}</select>
      </label>

      <label class="ct-camp" data-camp="aplicatie">
        <span class="ct-eticheta">${e(K.etichetaAplicatie)}</span>
        <select name="aplicatie">${K.aplicatii.map((o) => optiune(o, 'nu-se-aplica')).join('')}</select>
      </label>

      <div class="ct-rand">
        <label class="ct-camp">
          <span class="ct-eticheta">${e(K.etichetaNume)}</span>
          <input type="text" name="nume" maxlength="${L.numeMax}" required
            placeholder="${a(K.placeholderNume)}" autocomplete="name">
        </label>
        <label class="ct-camp">
          <span class="ct-eticheta">${e(K.etichetaEmail)}</span>
          <input type="email" name="email" required
            placeholder="${a(K.placeholderEmail)}" autocomplete="email">
        </label>
      </div>

      <label class="ct-camp">
        <span class="ct-eticheta">${e(K.etichetaMesaj)}</span>
        <textarea name="mesaj" rows="8" minlength="${L.mesajMin}" maxlength="${L.mesajMax}" required
          placeholder="${a(K.placeholderMesaj)}"></textarea>
      </label>

      <div class="ct-camp">
        <span class="ct-eticheta">${e(K.etichetaFisiere)} <em class="ct-contor" hidden></em></span>
        <div class="ct-zona" data-zona>
          <p><b>${e(K.dropzone)}</b> ${e(K.dropzoneSau)}
            <button type="button" class="ct-alege">${e(K.butonFisiere)}</button></p>
          <p class="ct-nota">${e(interp(K.notaFisiere, { max: L.fisiereMax, mb: L.megaMax }))}</p>
          <input type="file" name="fisiere[]" multiple accept="${a(accept)}" hidden>
        </div>
        <ul class="ct-lista" data-lista></ul>
      </div>

      <input type="hidden" name="limba" value="${a(c.limba)}">
      <input type="hidden" name="diagnostic" value="">
      <!-- capcană: un robot completează tot ce găsește; un om nu vede câmpul niciodată -->
      <div class="ct-capcana" aria-hidden="true">
        <label>Website<input type="text" name="website" tabindex="-1" autocomplete="off"></label>
      </div>

      ${K.recaptchaCheie
      ? `<div class="g-recaptcha" data-sitekey="${a(K.recaptchaCheie)}"></div>`
      : `<p class="ct-avertisment">${e(K.recaptchaLipsa)}</p>`}

      <div class="ct-actiuni">
        <button type="submit" class="btn btn-p btn-lg">${e(K.trimite)}</button>
        <p class="ct-stare" role="status" aria-live="polite"></p>
      </div>
    </form>
  </section>
</main>
${subsol(c)}
${K.recaptchaCheie ? '<script src="https://www.google.com/recaptcha/api.js" async defer></script>' : ''}
<script type="module" src="/contact/contact.js"></script>
</body>
</html>`;
}
