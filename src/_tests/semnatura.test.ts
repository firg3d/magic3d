/**
 * TEST PERMANENT — MARCAJUL PIESEI (A.7 din docs/design/semnatura-huse-iphone.md).
 *
 * Verificările (2)–(6) din A.7. Punctul (1), regresia pe cele 12 generatoare existente, are
 * suita lui: `regresie-export.test.ts`.
 *
 * CORPUL DE PROBĂ e un CILINDRU CULCAT, nu un cub. Stratul 3 din A.2 spune că zona de marcaj stă
 * pe un racord curbat; pe o față plată n-ar demonstra nimic, fiindcă orice cutter drept se
 * potrivește pe un plan. Aici cutter-ul intră pe normala suprafeței, într-un loc unde suprafața
 * chiar se curbează sub el.
 *
 * SEMNĂTURA vine din motorul de font real (`textSolid` → proiecție → inele), nu din
 * dreptunghiuri sintetice: cusătura `siluetaSemnatura` trebuie probată cu ce va primi în produs.
 *
 * Rulare:  npm run test:semnatura
 */
// @ts-ignore — opentype.js nu are declarații de tip (ca în restul proiectului)
import opentype from 'opentype.js';
import ManifoldModule from 'manifold-3d';
import JSZip from 'jszip';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { configureManifold as configSemnatura, aplicaMarcaj, modDinContext, microText,
  MARCAJ_LATIME, MARCAJ_INALTIME, TRASATURA_LOGO_MIN, MARCAJ_ADANCIME,
  type ContextMarcaj, type RegiuneMarcaj } from '../core/semnatura/index.js';
import { configureManifold as configTextSolid, textSolid } from '../core/geometry/textSolid.js';
import { build3MF } from '../core/geometry/export3mf.js';
import { foloseteCheiaPublica, verificaToken, type StareLicenta } from '../core/config/licenta-token.js';
import { citesteSvg, SvgRefuzat, SVG_MAX_OCTETI } from '../core/semnatura/svg.js';
import type { Ring } from '../core/geometry/forme2d.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FONT_DIR = join(ROOT, 'public', 'fonts');

let esecuri = 0;
const check = (nume: string, ok: boolean, detaliu = '') => {
  console.log(`${ok ? '  OK  ' : '  ESEC'} ${nume}${detaliu ? '  - ' + detaliu : ''}`);
  if (!ok) esecuri++;
};

const mod = await ManifoldModule();
mod.setup();
configSemnatura(mod);
configTextSolid(mod);
const { Manifold } = mod;

const font = opentype.parse(readFileSync(join(FONT_DIR, 'Arimo-Regular.ttf')).buffer);

/**
 * Silueta wordmark-ului, din motorul de font, scalată în cutia de 9 × 2.5 mm.
 * Exact ce va face aplicația: un solid de text, proiectat, cu inelele lui.
 */
function siluetaSemnatura(): Ring[] {
  const brut = textSolid(font, 'praktik3d.ro', MARCAJ_INALTIME, 1);
  const sil = brut.project();
  brut.delete();
  const b = sil.bounds();
  const w = b.max[0] - b.min[0];
  const k = MARCAJ_LATIME / w;               // se strânge pe lățime la cutia cerută
  const centrat = sil.scale([k, k]).translate([-(b.min[0] + b.max[0]) / 2 * k, -(b.min[1] + b.max[1]) / 2 * k]);
  const inele = centrat.toPolygons() as Ring[];
  sil.delete(); centrat.delete();
  return inele.map((r) => r.map((p) => [p[0], p[1]]) as Ring);
}

/** CORPUL DE PROBĂ: cilindru culcat pe axa X — suprafață curbată, ca racordul unei huse. */
const RAZA = 25, LUNG = 70;
const corpProba = () => Manifold.cylinder(LUNG, RAZA, RAZA, 64, true).rotate([0, 90, 0]);

/**
 * Zona de marcaj, pe fața de jos a cilindrului: normala în jos (−Y), textul de-a lungul axei.
 * Punctul e chiar pe suprafață, deci cutter-ul intră radial, unde suprafața se curbează.
 */
const regiune: RegiuneMarcaj = {
  centru: [0, -RAZA, 0],
  normala: [0, -1, 0],
  tangenta: [1, 0, 0],
  latime: LUNG - 8,
  inaltime: 2 * RAZA * 0.5,
};

/**
 * PERECHE P-256 EFEMERA, generata la fiecare rulare.
 *
 * Cheia privata de productie nu e in depozit si nu trebuie sa fie, deci un token semnat cu ea
 * nu se poate fabrica aici. Suita isi face perechea ei, o pune in verificator prin
 * `foloseteCheiaPublica` si semneaza cu ea — asa A.7(3) si A.7(4) trec prin ACELASI
 * `crypto.subtle.verify` ca in produs, cu semnatura reala, fara niciun token valid de productie
 * in cod. La final cheia de productie se pune la loc.
 */
const b64url = (u: Uint8Array) => Buffer.from(u).toString('base64')
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const pereche = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
foloseteCheiaPublica(Buffer.from(await crypto.subtle.exportKey('spki', pereche.publicKey)).toString('base64'));

async function semneaza(payload: Record<string, unknown>): Promise<string> {
  const corp = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' },
    pereche.privateKey, new TextEncoder().encode(corp));
  return `M3D1.${corp}.${b64url(new Uint8Array(sig))}`;
}

const licBaza = { id: '0007', nume: 'Atelier Proba SRL', expira: '2027-01-01', plan: '1an' as const };
const STARI: Record<string, StareLicenta> = {
  lipsa: { fel: 'lipsa' },
  gratuit: { fel: 'invalid', motiv: 'cod nerecunoscut' },
  expirat: { fel: 'expirat', licenta: { ...licBaza, comercial: true } },
  suporter: { fel: 'valida', plan: 'suporter', serie: 1 },
  comercial: { fel: 'valida', licenta: { ...licBaza, comercial: true } },
  codFix: { fel: 'valida', plan: 'web-perpetua', serie: 1 },
};

const ctxDe = (stare: StareLicenta, extra: Partial<ContextMarcaj> = {}): ContextMarcaj =>
  ({ regiune, stare, siluetaSemnatura, azi: new Date(2026, 8, 4), ...extra });

/** construiește o dată și întoarce ce ne interesează, eliberând corpul */
function masoara(stare: StareLicenta, extra: Partial<ContextMarcaj> = {}) {
  const c0 = corpProba();
  const volumNemarcat = c0.volume();
  const { corp, raport } = aplicaMarcaj(c0, ctxDe(stare, extra));
  const parti = corp.decompose();
  const out = {
    volumNemarcat, volum: corp.volume(), raport,
    bucati: parti.length,
    status: String(corp.status()),
    genus: corp.genus(),
    corp,
  };
  for (const p of parti) p.delete();
  if (corp !== c0) c0.delete();
  return out;
}

console.log('\nA.7(2) — EXPORT GRATUIT');
{
  const r = masoara(STARI.gratuit);
  check('modul e „semnatura" fara licenta', r.raport.mod === 'semnatura', r.raport.mod);
  check('  s-a scos material', r.raport.volumScosMM3 > 0, `${r.raport.volumScosMM3} mm3`);
  check('  zona texturata e aplicata', r.raport.texturaAplicata === true);
  check('  corpul ramane O SINGURA bucata', r.bucati === 1, `${r.bucati} bucati`);
  check('  geometria e valida', r.status === 'NoError', r.status);
  console.log(`     volum scos: ${r.raport.volumScosMM3} mm3 din ${r.volumNemarcat.toFixed(0)}`);
  r.corp.delete();
}

console.log('\nA.7(2) — UN SINGUR OBIECT IN 3MF');
{
  const c0 = corpProba();
  const { corp } = aplicaMarcaj(c0, ctxDe(STARI.gratuit));
  const zip = await build3MF([{ name: 'proba', manifold: corp, culoare: '#334455' }] as any);
  // 3MF-ul e un ZIP: XML-ul se citeste dupa despachetare, nu din octetii bruti
  const arhiva = await JSZip.loadAsync(Buffer.from(zip));
  const numeModel = Object.keys(arhiva.files).find((n) => n.endsWith('.model'));
  const xml = numeModel ? await arhiva.files[numeModel].async('string') : '';
  const nrObiecte = (xml.match(/<object[\s>]/g) || []).length;
  const nrComponente = (xml.match(/<component[\s>]/g) || []).length;
  check('3MF-ul contine exact un obiect', nrObiecte === 1, `${nrObiecte} obiecte in ${numeModel}`);
  check('  si nicio componenta (fara ierarhie)', nrComponente === 0, `${nrComponente} componente`);
  corp.delete(); if (corp !== c0) c0.delete();
}

console.log('\nA.7(3) — LICENTA VALIDA, MODUL „FARA"');
{
  const r = masoara(STARI.comercial, { textura: { activa: false } });
  check('modul e „fara" cu drept comercial si fara logo', r.raport.mod === 'fara', r.raport.mod);
  check('  textura se poate stinge cu licenta', r.raport.texturaAplicata === false);
  check('  volumul e cel al corpului nemarcat',
    Math.abs(r.volum - r.volumNemarcat) < 1e-6, `${(r.volum - r.volumNemarcat).toFixed(3)} mm3`);
  check('  micro-marcajul poarta numarul licentei',
    r.raport.microText === 'M3D 0007', r.raport.microText);
  r.corp.delete();
}

console.log('\nA.7(3b) — LICENTA VALIDA, TEXTURA PASTRATA');
{
  // textura ramane pornita implicit chiar si cu licenta: e design, nu pedeapsa (A.5)
  const r = masoara(STARI.comercial);
  check('textura ramane pornita implicit si cu licenta', r.raport.texturaAplicata === true);
  check('  dar semnatura NU se mai graveaza', r.raport.mod === 'fara', r.raport.mod);
  r.corp.delete();
}

console.log('\nA.7(4) — TOKEN STRICAT, EXPIRAT SAU DE SUPORTER');
{
  const referinta = masoara(STARI.gratuit);
  for (const [nume, stare] of [['invalid', STARI.gratuit], ['expirat', STARI.expirat],
    ['suporter', STARI.suporter], ['lipsa', STARI.lipsa]] as [string, StareLicenta][]) {
    const r = masoara(stare);
    check(`„${nume}" da acelasi export ca cel gratuit`,
      r.raport.mod === 'semnatura' && Math.abs(r.volum - referinta.volum) < 1e-6,
      `${r.raport.mod}, diferenta ${(r.volum - referinta.volum).toFixed(4)} mm3`);
    r.corp.delete();
  }
  check('  un token EXPIRAT cu comercial: true tot nu scoate semnatura',
    modDinContext(ctxDe(STARI.expirat)) === 'semnatura');
  referinta.corp.delete();
}

console.log('\nA.7(4b) — COD FIX');
{
  const r = masoara(STARI.codFix, { textura: { activa: false } });
  check('codul fix web-perpetua da modul „fara"', r.raport.mod === 'fara', r.raport.mod);
  check('  micro-marcajul graveaza id-ul codului, nu un nume',
    r.raport.microText === 'M3D CF1', r.raport.microText);
  r.corp.delete();
}

console.log('\nA.7(5) — LOGO PROPRIU');
{
  const patrat = (w: number, h: number): Ring[] => [[[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]] as Ring];
  const gros = masoara(STARI.comercial, { logo: { contururi: patrat(9, 2.5), trasaturaMinMM: 2.5 } });
  check('cu logo incarcat, modul e „logo-propriu"', gros.raport.mod === 'logo-propriu', gros.raport.mod);
  check('  logo cu trasatura groasa nu da avertisment', gros.raport.logoSubtire === false);
  check('  s-a gravat ceva', gros.raport.volumScosMM3 > 0, `${gros.raport.volumScosMM3} mm3`);
  gros.corp.delete();

  /**
   * TRĂSĂTURA SE MĂSOARĂ PE FORMA GRAVATĂ, nu pe cea primită.
   *
   * De la corectura HUS.2, logo-ul se rescalează în cutia mărimii alese — „vizibilă" ajunge la
   * 22,5 mm pe husă. Un dreptunghi de 9 × 0,5 ajunge acolo la 1,33 mm grosime, deci NU mai e
   * subțire, oricât de subțire ar fi fost în fișierul primit. Fixtura de aici e proporțional mai
   * plată, ca să rămână sub prag DUPĂ scalare — altfel testul ar verifica cifra din fișier, nu
   * piesa.
   */
  const subtire = masoara(STARI.comercial, { logo: { contururi: patrat(9, 0.2), trasaturaMinMM: 0.2 } });
  check(`  logo subtire dupa scalare da avertisment (prag ${TRASATURA_LOGO_MIN})`,
    subtire.raport.logoSubtire === true);
  check('  dar exportul se face oricum — avertisment, nu blocaj',
    subtire.raport.volumScosMM3 > 0 && subtire.status === 'NoError');
  subtire.corp.delete();

  // fara drept comercial, logo-ul incarcat e IGNORAT
  const fara = masoara(STARI.gratuit, { logo: { contururi: patrat(9, 2.5), trasaturaMinMM: 2.5 } });
  check('  fara licenta, logo-ul incarcat e ignorat si ramane semnatura',
    fara.raport.mod === 'semnatura', fara.raport.mod);
  fara.corp.delete();
}

console.log('\nA.7(6) — MANIFOLD VALID IN TOATE MODURILE');
{
  for (const [nume, stare, extra] of [
    ['gratuit', STARI.gratuit, {}],
    ['fara', STARI.comercial, { textura: { activa: false } }],
    ['logo', STARI.comercial, { logo: { contururi: [[[-4.5, -1.25], [4.5, -1.25], [4.5, 1.25], [-4.5, 1.25]] as Ring], trasaturaMinMM: 2.5 } }],
  ] as [string, StareLicenta, Partial<ContextMarcaj>][]) {
    const r = masoara(stare, extra);
    check(`„${nume}": geometrie valida, o bucata`,
      r.status === 'NoError' && r.bucati === 1, `${r.status}, ${r.bucati} bucati`);
    r.corp.delete();
  }
}

console.log('\nA.7(3)+(4) CAP-COADA — TOKENURI SEMNATE CU ADEVARAT');
{
  const azi = new Date(2026, 8, 4);
  const tComercial = await semneaza({ ...licBaza, comercial: true });
  const tSimplu = await semneaza({ ...licBaza, comercial: false });
  const tVechi = await semneaza(licBaza);                       // fara camp: cum sunt cele emise
  const tExpirat = await semneaza({ ...licBaza, expira: '2026-01-01', comercial: true });
  const tStricat = tComercial.slice(0, -4) + 'AAAA';            // semnatura schimbata

  const stari = {
    comercial: await verificaToken(tComercial, azi),
    simplu: await verificaToken(tSimplu, azi),
    vechi: await verificaToken(tVechi, azi),
    expirat: await verificaToken(tExpirat, azi),
    stricat: await verificaToken(tStricat, azi),
  };
  check('tokenul semnat cu comercial: true e VALID', stari.comercial.fel === 'valida', stari.comercial.fel);
  check('  tokenul cu semnatura schimbata e RESPINS', stari.stricat.fel === 'invalid', stari.stricat.fel);
  check('  tokenul cu data trecuta e EXPIRAT', stari.expirat.fel === 'expirat', stari.expirat.fel);

  // A.7(3): mod „fara", volum egal cu al corpului nemarcat
  const fara = masoara(stari.comercial, { textura: { activa: false } });
  check('A.7(3) token semnat, mod „fara": volum egal cu nemarcat',
    fara.raport.mod === 'fara' && Math.abs(fara.volum - fara.volumNemarcat) < 1e-6,
    `${fara.raport.mod}, diferenta ${(fara.volum - fara.volumNemarcat).toFixed(4)} mm3`);
  fara.corp.delete();

  // A.7(4): stricat / expirat / fara drept -> identic cu gratuitul
  const referinta = masoara(STARI.gratuit);
  for (const [nume, st] of [['semnatura schimbata', stari.stricat], ['expirat', stari.expirat],
    ['comercial: false', stari.simplu], ['fara campul comercial', stari.vechi]] as [string, StareLicenta][]) {
    const r = masoara(st);
    check(`A.7(4) „${nume}" da exact exportul gratuit`,
      r.raport.mod === 'semnatura' && Math.abs(r.volum - referinta.volum) < 1e-6,
      `${r.raport.mod}, diferenta ${(r.volum - referinta.volum).toFixed(4)} mm3`);
    r.corp.delete();
  }
  referinta.corp.delete();

  // cheia de PRODUCTIE se pune la loc: un test nu are voie sa lase verificatorul schimbat
  foloseteCheiaPublica();
  check('  dupa test, tokenul efemer NU mai e acceptat de cheia de productie',
    (await verificaToken(tComercial, azi)).fel === 'invalid');
}

console.log('\nA.5 — CITIREA UNUI LOGO SVG');
{
  const refuz = (svg: string, motivAsteptat: string, nume: string) => {
    try { citesteSvg(svg, mod); check(nume, false, 'nu a refuzat'); }
    catch (e: any) {
      check(nume, e instanceof SvgRefuzat && e.motiv === motivAsteptat,
        e instanceof SvgRefuzat ? e.motiv : String(e.message));
    }
  };

  refuz('<svg xmlns="http://www.w3.org/2000/svg"><text x="0" y="10">Atelier</text></svg>',
    'text-neconvertit', 'un SVG cu <text> neconvertit e REFUZAT (A.5)');
  refuz('<svg></svg>'.padEnd(SVG_MAX_OCTETI + 10, ' '), 'prea-mare',
    `peste ${Math.round(SVG_MAX_OCTETI / 1024)} KB e refuzat`);
  refuz('nu sunt un svg', 'nu-e-svg', 'un fisier care nu e SVG e refuzat');
  refuz('<svg xmlns="http://www.w3.org/2000/svg"></svg>', 'fara-contur', 'un SVG gol e refuzat');

  const patrat = citesteSvg('<svg viewBox="0 0 100 100"><path d="M10 10 H90 V90 H10 Z"/></svg>', mod);
  check('un <path> simplu se citeste', patrat.contururi.length === 1, `${patrat.contururi.length} contururi`);
  {
    const xs = patrat.contururi[0].map((p) => p[0]), ys = patrat.contururi[0].map((p) => p[1]);
    const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);
    check('  se normalizeaza in cutia marcajului, cu raportul pastrat',
      Math.abs(w - h) < 1e-6 && h <= MARCAJ_INALTIME + 1e-6 && w <= MARCAJ_LATIME + 1e-6,
      `${w.toFixed(2)} x ${h.toFixed(2)} mm`);
  }

  const curbe = citesteSvg('<svg viewBox="0 0 100 100"><path d="M10 50 C10 10 90 10 90 50 C90 90 10 90 10 50 Z"/></svg>', mod);
  check('curbele Bezier se aplatizeaza', curbe.contururi[0].length > 20, `${curbe.contururi[0].length} puncte`);
  const cerc = citesteSvg('<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/></svg>', mod);
  check('<circle> se citeste', cerc.contururi.length === 1 && cerc.contururi[0].length >= 16);
  const grup = citesteSvg('<svg viewBox="0 0 100 100"><g transform="translate(10,10) scale(2)"><rect x="0" y="0" width="20" height="20"/></g></svg>', mod);
  check('transformarile de pe <g> se aplica', grup.contururi.length === 1);

  // SVG-ul are Y IN JOS: fara oglindire, logo-ul iese rasturnat
  const sus = citesteSvg('<svg viewBox="0 0 100 100"><path d="M0 0 H100 V20 H0 Z"/></svg>', mod);
  check('Y se rastoarna (SVG are Y in jos)',
    Math.max(...sus.contururi[0].map((p) => p[1])) > 0, 'banda de sus ramane sus');

  const gras = citesteSvg('<svg viewBox="0 0 100 100"><rect x="0" y="0" width="100" height="100"/></svg>', mod);
  check('un patrat plin nu e subtire', gras.subtire === false, `${gras.trasaturaMinMM} mm`);
  const fir = citesteSvg('<svg viewBox="0 0 100 100"><rect x="0" y="0" width="100" height="2"/></svg>', mod);
  check('o linie de 2 din 100 iese sub prag si da avertisment', fir.subtire === true, `${fir.trasaturaMinMM} mm`);
  check('  dar se citeste oricum — avertisment, nu blocaj', fir.contururi.length === 1);

  // cap-coada: logo-ul citit chiar se graveaza in corp
  const logo = citesteSvg('<svg viewBox="0 0 100 40"><path d="M5 5 H95 V35 H5 Z"/></svg>', mod);
  const r = masoara(STARI.comercial, { logo: { contururi: logo.contururi, trasaturaMinMM: logo.trasaturaMinMM } });
  check('logo-ul citit din SVG se graveaza in corp',
    r.raport.mod === 'logo-propriu' && r.raport.volumScosMM3 > 0 && r.status === 'NoError',
    `${r.raport.volumScosMM3} mm3`);
  r.corp.delete();
}

console.log('\nMICRO-MARCAJUL (A.3)');
{
  check('export gratuit: M3D + data, fara date personale',
    microText(STARI.gratuit, new Date(2026, 8, 4)) === 'M3D 2026-09-04',
    microText(STARI.gratuit, new Date(2026, 8, 4)));
  check('  nu contine numele titularului',
    !microText(STARI.comercial).includes('Atelier'), microText(STARI.comercial));
}

/**
 * A.5 PE LOGO-UL REAL — `LOGO_PRAKTIK3D.svg`, nu un dreptunghi sintetic.
 *
 * Un logo de proba desenat de mine ar trece prin parser fiindca l-as desena exact cum stiu ca-l
 * citeste. Al operatorului nu stie nimic despre parser: 15 path-uri, fiecare cu propriul
 * `transform="translate(...)"`, cinci culori, si trasaturi fine — punctul de pe „i", conturul
 * interior al lui „3D".
 */
{
  console.log('\nA.5 — LOGO-UL REAL PRAKTIK3D');
  const svg = readFileSync(join(ROOT, 'src', '_tests', 'fixturi', 'LOGO_PRAKTIK3D.svg'), 'utf8');
  const logo = citesteSvg(svg, mod);

  /**
   * TRANSFORMARILE CHIAR S-AU APLICAT.
   *
   * Toate cele 15 path-uri au coordonate in jurul originii si isi primesc locul din
   * `transform="translate(...)"`. Daca parserul le-ar ignora, s-ar aseza unul peste altul si
   * silueta ar iesi mult mai ingusta decat logo-ul — sau goala. Se masoara pe INTINDERE, care e
   * ce s-ar strica: cutia normalizata are 9 mm, iar continutul trebuie sa o umple.
   */
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const inel of logo.contururi) {
    for (const [x, y] of inel) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
  }
  const w = maxX - minX, h = maxY - minY;
  console.log(`     ${logo.contururi.length} contururi · cutie ${w.toFixed(2)} × ${h.toFixed(2)} mm`
    + ` · sursa ${logo.sursaLatime} × ${logo.sursaInaltime}`
    + ` · trasatura minima ${logo.trasaturaMinMM.toFixed(2)} mm`);
  check('logo real: s-au citit contururi din toate path-urile',
    logo.contururi.length >= 15, `${logo.contururi.length} contururi din 15 path-uri`);
  /**
   * TRANSFORMARILE CHIAR S-AU APLICAT — dovedit prin comparatie, nu prin presupunere.
   *
   * Prima verificare pe care am scris-o cerea ca silueta sa umple cutia PE LATIME. Gresit: cutia
   * are raportul 3,6, logo-ul 1,46 — deci se incadreaza pe INALTIME si iese 3,65 × 2,50, nu
   * 9 × 2,47. Verificarea masura o presupunere de-a mea, nu o cerinta.
   *
   * Ce voiam sa probez se probeaza direct: se parseaza ACELASI fisier cu transformarile scoase,
   * si cele doua siluete trebuie sa iasa DIFERITE. Daca parserul le-ar ignora, ar iesi identice —
   * si atunci cele 15 path-uri s-ar aseza unul peste altul in origine.
   */
  const faraTransform = citesteSvg(svg.replace(/transform="[^"]*"/g, ''), mod);
  let fMinX = Infinity, fMaxX = -Infinity, fMinY = Infinity, fMaxY = -Infinity;
  for (const inel of faraTransform.contururi) {
    for (const [x, y] of inel) {
      fMinX = Math.min(fMinX, x); fMaxX = Math.max(fMaxX, x);
      fMinY = Math.min(fMinY, y); fMaxY = Math.max(fMaxY, y);
    }
  }
  const raportFara = (fMaxX - fMinX) / (fMaxY - fMinY);
  console.log(`     fara transformari: sursa ${faraTransform.sursaLatime.toFixed(0)} × `
    + `${faraTransform.sursaInaltime.toFixed(0)}, raport ${raportFara.toFixed(3)}`);
  check('  transformarile s-au aplicat (silueta difera de cea fara ele)',
    Math.abs(faraTransform.sursaLatime - logo.sursaLatime) > 1
    || Math.abs(faraTransform.sursaInaltime - logo.sursaInaltime) > 1,
    `${faraTransform.sursaLatime.toFixed(0)} × ${faraTransform.sursaInaltime.toFixed(0)} `
    + `faţă de ${logo.sursaLatime.toFixed(0)} × ${logo.sursaInaltime.toFixed(0)}`);
  check('  se incadreaza pe latura care strange (inaltimea), nu se intinde',
    Math.abs(h - MARCAJ_INALTIME) < 0.01 && w < MARCAJ_LATIME,
    `${w.toFixed(2)} × ${h.toFixed(2)} in cutia ${MARCAJ_LATIME} × ${MARCAJ_INALTIME}`);

  /**
   * RAPORTUL SURSEI SE PASTREAZA. viewBox 1625 x 1180 => 1,377. Cutia ceruta e 9 x 2,5 => 3,6,
   * deci logo-ul se incadreaza pe LATIME si ramane mai scund decat cutia; daca s-ar intinde la
   * 2,5 pe inaltime, ar iesi turtit.
   */
  const raportSursa = logo.sursaLatime / logo.sursaInaltime;
  const raportIesit = w / h;
  check('  raportul logo-ului nu s-a deformat',
    Math.abs(raportIesit - raportSursa) / raportSursa < 0.02,
    `${raportIesit.toFixed(3)} faţă de ${raportSursa.toFixed(3)}`);
  check('  incape in cutia de 9 × 2,5 mm', w <= 9.001 && h <= 2.501, `${w.toFixed(2)} × ${h.toFixed(2)}`);

  /**
   * TRASATURILE FINE DECLANSEAZA AVERTISMENTUL, nu trec tacut.
   *
   * La 9 mm latime, punctul de pe „i" si golurile literelor ajung sub doua linii de duza 0,4.
   * A.5 cere avertisment si export PERMIS dupa confirmare — nu refuz.
   */
  check('  trasaturile fine dau avertisment', logo.subtire === true && logo.trasaturaMinMM < 0.8,
    `${logo.trasaturaMinMM.toFixed(3)} mm, sub ${TRASATURA_LOGO_MIN}`);

  /**
   * CULORILE COLAPSEAZA INTR-O SINGURA GRAVURA.
   *
   * Cele cinci culori sunt straturi suprapuse in desen. Gravat, iese SILUETA — un singur set de
   * contururi, o singura adancime. Se verifica pe piesa: marcajul aplicat scoate material o
   * SINGURA data, deci volumul scos e cel al siluetei, nu de cinci ori adancimea.
   */
  const r = masoara(STARI.comercial, { logo });
  check('  modul e „logo-propriu"', r.raport.mod === 'logo-propriu', r.raport.mod);
  check('  gravarea scoate material', r.raport.volumScosMM3 > 0, `${r.raport.volumScosMM3} mm3`);
  check('  corpul ramane o singura bucata', r.bucati === 1 && r.status === 'NoError',
    `${r.bucati} bucati, ${r.status}`);
  check('  avertismentul ajunge in raport', r.raport.logoSubtire === true);
  /**
   * ADANCIMEA E UNA SINGURA. Cinci straturi suprapuse ar fi sapat de cinci ori in acelasi loc;
   * corpul de proba are raza 25 mm, deci s-ar fi vazut. Se compara cu adancimea ceruta.
   */
  const bb = r.corp.boundingBox();
  console.log(`     volum scos ${r.raport.volumScosMM3} mm3 · bbox Y [${bb.min[1].toFixed(2)}, ${bb.max[1].toFixed(2)}]`);
  check('  n-a sapat mai adanc decat marcajul cere',
    bb.min[1] > -25 - 0.001 && bb.min[1] < -25 + MARCAJ_ADANCIME + 0.5,
    `fundul la ${bb.min[1].toFixed(3)}, raza corpului 25`);
  r.corp.delete();
}

console.log(`\n${esecuri ? `${esecuri} ESECURI` : 'toate verificarile au trecut'}`);
/**
 * `process.exitCode`, NU `process.exit`.
 *
 * Dupa o operatie manifold, `process.exit` taie procesul cat timp WASM-ul inca se inchide, iar
 * libuv crapa pe Windows cu „Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)" si cod 127.
 * Suita raporta ESEC desi toate verificarile trecusera. Vezi regula din docs/design/.
 */
process.exitCode = esecuri ? 1 : 0;
