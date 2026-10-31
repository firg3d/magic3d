/**
 * EXPORTĂ CELE DOUĂ HUSE ale OPRIRII 3 (HUS.2): același model, gratuit și licențiat.
 *
 * Gratuit → semnătura Praktik3D gravată la baza spatelui, în zona texturată.
 * Licențiat → logo propriu din SVG, în același loc, fără semnătură.
 *
 * PERECHE P-256 EFEMERĂ, generată la fiecare rulare. Cheia privată de producție nu e în depozit
 * și nu trebuie să fie, deci un token semnat cu ea nu se poate fabrica aici. Scriptul își face
 * perechea lui, o pune în verificator prin `foloseteCheiaPublica` și semnează cu ea — așa
 * exportul licențiat trece prin ACELAȘI `crypto.subtle.verify` ca în produs, cu semnătură reală,
 * fără niciun token valid de producție în cod.
 *
 * Rulare:  npm run exporta:huse
 */
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ManifoldModule from 'manifold-3d';
// @ts-ignore — opentype.js nu are declaratii de tip, ca peste tot in proiect
import opentype from 'opentype.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MODEL = 'iphone-16';

/** un logo de probă: triunghi cu un cerc decupat, trăsături peste 0,8 mm după normalizare */
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40">
  <path d="M8 34 L30 6 L52 34 Z"/>
  <rect x="62" y="8" width="10" height="26"/>
  <rect x="76" y="8" width="34" height="9"/>
  <rect x="76" y="25" width="34" height="9"/>
</svg>`;

const b64url = (u) => Buffer.from(u).toString('base64')
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function main() {
  const { configureManifold, buildHusa, pentruPrint, tronsonLiberSina } = await import('../src/apps/huse/husa.ts');
  const { build3MF } = await import('../src/core/geometry/export3mf.ts');
  const { citesteSvg } = await import('../src/core/semnatura/svg.ts');
  const { textSolid, configureManifold: configText } = await import('../src/core/geometry/textSolid.ts');
  const { MARCAJ_LATIME, MARCAJ_INALTIME } = await import('../src/core/semnatura/index.ts');
  const { foloseteCheiaPublica, verificaToken } = await import('../src/core/config/licenta-token.ts');

  const mod = await ManifoldModule();
  mod.setup();
  configureManifold(mod);
  configText(mod);

  const incarca = (nume) => {
    const b = readFileSync(join(ROOT, 'public', 'fonts', nume));
    return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  };
  const font = incarca('Inter-Regular.ttf');
  /**
   * SEMNATURA IESE PE INTER-900, ca in aplicatie (decizia de marca, corectura HUS.2).
   *
   * Scriptul lua Inter-Regular pentru tot, deci husa exportata de aici avea semnatura mai
   * subtire decat cea generata din interfata — acelasi model, doua piese diferite. Gravarea
   * ramane pe Regular: eticheta ramei si micro-marcajul au patru-sase caractere si se citesc
   * oricum.
   */
  const fontSemnatura = incarca('Inter-900.ttf');

  const siluetaSemnatura = () => {
    const brut = textSolid(fontSemnatura, 'praktik3d.ro', MARCAJ_INALTIME, 1);
    const sil = brut.project();
    brut.delete();
    const b = sil.bounds();
    const k = MARCAJ_LATIME / (b.max[0] - b.min[0]);
    const centrat = sil.scale([k, k])
      .translate([-(b.min[0] + b.max[0]) / 2 * k, -(b.min[1] + b.max[1]) / 2 * k]);
    const inele = centrat.toPolygons();
    sil.delete(); centrat.delete();
    return inele;
  };

  // licența de probă, semnată cu perechea efemeră
  const pereche = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  foloseteCheiaPublica(Buffer.from(await crypto.subtle.exportKey('spki', pereche.publicKey)).toString('base64'));
  const payload = { id: '0007', nume: 'Atelier Proba SRL', expira: '2099-01-01', plan: '1an', comercial: true };
  const corpTok = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' },
    pereche.privateKey, new TextEncoder().encode(corpTok));
  const token = `M3D1.${corpTok}.${b64url(new Uint8Array(sig))}`;
  const stareComerciala = await verificaToken(token);

  const logo = citesteSvg(LOGO_SVG, mod);

  const t = JSON.parse(readFileSync(join(ROOT, 'date', 'telefoane', 'apple', `${MODEL}.json`), 'utf8'));
  const baza = {
    telefon: t, material: 'tpu', ceExporti: 'husa',
    grosimePerete: 1.4, buzaEcran: 1.0, joc: 0.25,
    butoaneAcoperite: false, margineCamera: 1.0, fontGravare: font,
    spate: { stil: 'plin', text: '', inaltimeText: 18,
      tipar: { model: 'fagure', pas: 8, grosimePerete: 2, unghi: 0, varianta: 1 }, snur: 'fara' },
  };

  const IESIRE = join(ROOT, 'out', 'huse');
  mkdirSync(IESIRE, { recursive: true });
  console.log(`\nHUSE — ${t.model}, gratuit si licentiat\n`);

  for (const [eticheta, marcaj, stil] of [
    ['gratuit', { stare: { fel: 'lipsa' }, siluetaSemnatura, azi: new Date() }, 'plin'],
    ['licentiat', { stare: stareComerciala, siluetaSemnatura, logo, azi: new Date() }, 'plin'],
    // addendum HUS.2: si un export perforat, cu logo-ul gravat pe zona plina de la baza spatelui
    ['perforat', { stare: { fel: 'lipsa' }, siluetaSemnatura, azi: new Date() }, 'perforat'],
  ]) {
    const r = buildHusa({ ...baza, marcaj, spate: { ...baza.spate, stil } }, { w: 256, d: 256 });
    const d = r.diagnostic;
    const piesa = pentruPrint(r.corp);
    const octeti = await build3MF([{ name: `Husa ${t.model} ${eticheta}`, manifold: piesa, culoare: '#2b2f38' }]);
    writeFileSync(join(IESIRE, `husa-${MODEL}-${eticheta}.3mf`), octeti);
    console.log(`  ${eticheta.padEnd(10)} marcaj ${d.marcaj.mod.padEnd(13)} −${d.marcaj.volumScosMM3.toFixed(1)} mm³`
      + ` · micro „${d.marcaj.microText}" · ${d.volumCM3.toFixed(3)} cm³`
      + ` · ${d.bucati} bucata · ${(octeti.length / 1024).toFixed(1)} KB`);
    console.log(`             grosime ${d.grosime.inAfaraCamerei.toFixed(2)} mm in afara camerei`
      + ` (husa pune ${d.grosime.contributiaHusei.toFixed(2)}) · ${d.grosime.totala.toFixed(2)} pe buza camerei`);
    if (d.spate && d.spate.stil === 'perforat') {
      console.log(`             ${d.spate.gauri} gauri, ${d.spate.gauriOmise} omise in inelul de incarcare`
        + ` · punti sub prag ${d.spate.ariaSubPrag.toFixed(1)} mm²`);
    }
    piesa.delete(); r.corp.delete();
  }
  /**
   * BUMPERELE, cate unul pe pilot (HUS.2.B, cerinta OPRIRII 3).
   *
   * Spate deschis, retentie doar din buza, semnatura pe sina din dreapta. Se exporta pe toti cei
   * patru piloti, nu doar pe modelul de proba: sina dreapta are tronson liber diferit la fiecare,
   * si abia asa se vede daca regula „cel mai lung tronson liber" tine peste tot.
   */
  const PILOTI = ['iphone-15', 'iphone-15-pro', 'iphone-16', 'iphone-se-3'];
  console.log(`BUMPERE — spate deschis, semnatura pe sina dreapta`);
  console.log('');
  for (const id of PILOTI) {
    const tel = JSON.parse(readFileSync(join(ROOT, 'date', 'telefoane', 'apple', `${id}.json`), 'utf8'));
    const cfg = { ...baza, telefon: tel, ceExporti: 'bumper', spate: undefined,
      marcaj: { stare: { fel: 'lipsa' }, siluetaSemnatura, azi: new Date() } };
    const r = buildHusa(cfg, { w: 256, d: 256 });
    const d = r.diagnostic;
    const tronson = tronsonLiberSina(tel, 'dreapta');
    const piesa = pentruPrint(r.corp);
    const octeti = await build3MF([{ name: `Bumper ${tel.model}`, manifold: piesa, culoare: '#2b2f38' }]);
    writeFileSync(join(IESIRE, `bumper-${id}.3mf`), octeti);
    console.log(`  ${tel.model.padEnd(28)} ${d.volumCM3.toFixed(3)} cm3 · ${d.bucati} bucata`
      + ` · inaltime ${d.inaltimeTotala.toFixed(2)} mm · ${(octeti.length / 1024).toFixed(1)} KB`);
    console.log(`  ${''.padEnd(28)} marcaj ${d.marcaj.mod} -${d.marcaj.volumScosMM3.toFixed(1)} mm3`
      + ` pe sina dreapta (${tronson.lungime.toFixed(1)} mm liberi) · micro „${d.marcaj.microText}"`);
    piesa.delete(); r.corp.delete();
  }
  console.log('');

  console.log(`\nScrise in out/huse/\n`);
}

await main();
