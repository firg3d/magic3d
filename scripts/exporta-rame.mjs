/**
 * EXPORTĂ CELE 4 RAME DE PROBĂ pentru OPRIREA 2 (HUS.1, B.11).
 *
 * Rama e piesa care răspunde la întrebarea pe care niciun calcul n-o poate închide: intră
 * telefonul? Se printează în zece minute, se pune pe telefon, și abia după aia are rost husa
 * completă. Scriptul scoate câte una per model-pilot, cu parametrii impliciți.
 *
 * Fișierele merg în `out/rame/`, nu în depozit: sunt rezultate, nu sursă.
 *
 * Rulare:  npm run exporta:rame
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, readdirSync } from 'node:fs';
import ManifoldModule from 'manifold-3d';
// @ts-ignore — opentype.js nu are declaratii de tip, ca peste tot in proiect
import opentype from 'opentype.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

async function main() {
  const { configureManifold, buildHusa, pentruPrint } = await import('../src/apps/huse/husa.ts');
  const { build3MF } = await import('../src/core/geometry/export3mf.ts');

  const mod = await ManifoldModule();
  mod.setup();
  configureManifold(mod);

  /**
   * Fontul gravării se citește de pe disc, nu prin `loadFont`: acela cere un URL, iar aici nu
   * există browser. Aceeași cale ca în suita de alfabet.
   */
  const buf = readFileSync(join(ROOT, 'public', 'fonts', 'Inter-Regular.ttf'));
  const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));

  // cei patru piloti plus lotul 1 (bara lata si cele doua Pro cu platou patrat)
  /**
   * TOATE MODELELE COMPLETE, nu o lista scrisa de mana.
   *
   * Lista fixa a ramas in urma la primul lot nou: modelele intrau in depozit, testele le prindeau
   * (ele iterau deja pe `esteComplet`), dar ramele nu se exportau pentru ele si nimeni n-avea ce
   * printa. Un pas manual care se uita e un pas care nu exista.
   */
  const { esteComplet } = await import('../src/core/telefoane/complet.ts');
  const PILOTI = readdirSync(join(ROOT, 'date', 'telefoane', 'apple'))
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(ROOT, 'date', 'telefoane', 'apple', f), 'utf8')))
    .filter((t) => esteComplet(t))
    .map((t) => t.id)
    .sort();
  const IESIRE = join(ROOT, 'out', 'rame');
  mkdirSync(IESIRE, { recursive: true });

  console.log('\nRAME DE PROBĂ — ' + PILOTI.length + ' modele-pilot\n');
  for (const id of PILOTI) {
    const t = JSON.parse(readFileSync(join(ROOT, 'date', 'telefoane', 'apple', `${id}.json`), 'utf8'));
    const cfg = {
      telefon: t, material: 'tpu', ceExporti: 'rama',
      grosimePerete: 1.4, buzaEcran: 1.0, joc: 0.25,
      butoaneAcoperite: false, margineCamera: 1.0, fontGravare: font,
    };
    const r = buildHusa(cfg, { w: 256, d: 256 });
    const d = r.diagnostic;
    const piesa = pentruPrint(r.corp);
    const octeti = await build3MF([{ name: `Rama ${t.model}`, manifold: piesa, culoare: '#2b2f38' }]);
    const cale = join(IESIRE, `rama-${id}.3mf`);
    writeFileSync(cale, octeti);
    console.log(`  ${t.model.padEnd(28)} ${d.amprenta[0].toFixed(1)} × ${d.amprenta[1].toFixed(1)} mm`
      + ` · înălțime ${d.inaltimeTotala.toFixed(2)} mm · ${d.volumCM3.toFixed(2)} cm³`
      + ` · ${d.bucati} bucată/bucăți · ${(octeti.length / 1024).toFixed(1)} KB`);
    console.log(`     gravat „${d.gravare ?? '—'}" · breșa camerei pe latura ${d.bresa?.latura ?? '—'}`
      + (d.bresa ? `, ${d.bresa.lungime.toFixed(2)} mm (tăiat la colț ${d.bresa.taiatLaColt.toFixed(2)} mm)` : ''));
    piesa.delete(); r.corp.delete();
  }
  console.log(`\nScrise în out/rame/\n`);
}

await main();
