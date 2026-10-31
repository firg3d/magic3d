/**
 * TEST PERMANENT — HUSE (HUS.1, B.13).
 *
 * VERIFICAREA CENTRALĂ, rulată DUPĂ FIECARE ȘABLON care scade din corp, nu doar la sfârșit:
 *
 *   1. telefonul la cota REALĂ intră fără să atingă husa;
 *   2. un telefon UMFLAT cu jocul chiar atinge.
 *
 * A doua nu e redundantă, e jumătatea care contează. Prima singură ar trece și dacă jocul ar fi
 * de trei ori mai mare decât cel cerut — adică exact defectul care se descoperă abia când husa
 * cade de pe telefon. Împreună, cele două prind și strâmt, și larg.
 *
 * Se rulează după fiecare șablon fiindcă orice scădere poate mușca din cavitate fără să se vadă
 * în volum: un decupaj deplasat cu un milimetru schimbă 30 mm³ dintr-o piesă de 20.000.
 *
 * Rulare:  npm run test:huse
 */
import ManifoldModule from 'manifold-3d';
// @ts-ignore — opentype.js nu are declarații de tip (ca în restul proiectului)
import opentype from 'opentype.js';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { configureManifold, corpHusa, ramaDeProba, decupajCamera, conturTelefon, fataZ,
  regiuneDecupajCamera, inaltimeBuzaCamera, PERETE_MIN,
  ferestreButoane, ferestreJosSus, aplicaFerestre, puntiFerestre, PERETE_SUBTIAT,
  taieturiFlex, aplicaFlex, taietorFlex, taietorFereastra, distantaPlan,
  buildHusa, manechinTelefon, pentruPrint, etichetaScurta, laturaCamerei, INALTIME_RAMA,
  siluetaText, microMarcajHusa, microMarcajBumper, tronsonLiberSina,
  capatTraseuDrept, intreruperiBuza,
  type HusaConfig, type Telefon, type Fereastra } from '../apps/huse/husa.js';
import { SUPRAPUNERE } from '../core/primitive/boolean.js';
import { dreptunghiRotunjit as dreptunghiRotunjitTest } from '../core/primitive/index.js';
import { textSolid } from '../core/geometry/textSolid.js';
import { MARIMI } from '../core/semnatura/index.js';
import { esteComplet } from '../core/telefoane/complet.js';
import { puntiPeGoluri as puntiPeGoluriTest, inCutie as inCutieTest,
  trasaturaMinima as trasaturaMinimaTest } from '../core/primitive/plan.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const mod = await ManifoldModule();
mod.setup();
configureManifold(mod);
const { Manifold, CrossSection } = mod;

let esecuri = 0;
const check = (nume: string, ok: boolean, detaliu = '') => {
  console.log(`${ok ? '  OK  ' : '  ESEC'} ${nume}${detaliu ? '  - ' + detaliu : ''}`);
  if (!ok) esecuri++;
};

const tel = (id: string): Telefon =>
  JSON.parse(readFileSync(join(ROOT, 'date', 'telefoane', 'apple', `${id}.json`), 'utf8'));
const PILOTI = ['iphone-15', 'iphone-15-pro', 'iphone-16', 'iphone-se-3'];

/** fontul gravării, citit de pe disc: în node nu există `loadFont`, care cere un URL */
const fontGravare = (() => {
  const b = readFileSync(join(ROOT, 'public', 'fonts', 'Inter-Regular.ttf'));
  return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
})();

const config = (t: Telefon, over: Partial<HusaConfig> = {}): HusaConfig => ({
  telefon: t, material: 'tpu', ceExporti: 'husa',
  grosimePerete: 1.4, buzaEcran: 1.0, joc: 0.25, butoaneAcoperite: false, margineCamera: 1.0,
  fontGravare,
  ...over,
});

/**
 * CELE DOUĂ VERIFICĂRI DE JOC, împreună. Se cheamă după fiecare șablon.
 *
 * `+ 0.02` la telefonul umflat: fără el, forma umflată ar atinge husa exact tangent, iar
 * booleanul ar putea da volum zero din motive numerice, nu geometrice.
 */
function jocCorect(cfg: HusaConfig, husa: any, dupa: string): void {
  const t = cfg.telefon;
  const cs = new CrossSection([conturTelefon(t)], 'Positive');
  const telefon = Manifold.extrude(cs, fataZ(t));
  const lovire = husa.intersect(telefon);
  const volReal = lovire.volume();

  const csJoc = cs.offset(cfg.joc + 0.02, 'Round');
  const umflat = Manifold.extrude(csJoc, fataZ(t));
  const lovireUmflat = husa.intersect(umflat);
  const volUmflat = lovireUmflat.volume();

  check(`${dupa}: telefonul real intră liber`, volReal < 1e-3, `${volReal.toFixed(4)} mm³`);
  check(`${dupa}: umflat cu jocul, chiar atinge`, volUmflat > 1, `${volUmflat.toFixed(2)} mm³`);

  for (const x of [cs, telefon, lovire, csJoc, umflat, lovireUmflat]) x.delete();
}

console.log(`\nHUSE — ${PILOTI.length} modele-pilot\n`);

for (const id of PILOTI) {
  const t = tel(id);
  const cfg = config(t);
  console.log(`── ${t.model} ──`);

  // ---------- ȘABLONUL 1 ----------
  const corp1 = corpHusa(cfg);
  check('corpul e o singură bucată, geometrie validă',
    String(corp1.status()) === 'NoError' && corp1.decompose().length === 1);
  jocCorect(cfg, corp1, 'după șablonul 1');

  const bb = corp1.boundingBox();
  const exteriorAsteptat = t.corp.latime + 2 * (cfg.joc + cfg.grosimePerete);
  check('  exteriorul = telefon + 2 × (joc + perete)',
    Math.abs((bb.max[0] - bb.min[0]) - exteriorAsteptat) < 1e-6,
    `${(bb.max[0] - bb.min[0]).toFixed(2)} vs ${exteriorAsteptat.toFixed(2)} mm`);
  check('  fundul husei stă la −grosimePerete',
    Math.abs(bb.min[2] + cfg.grosimePerete) < 1e-6, `${bb.min[2].toFixed(3)}`);
  check('  buza urcă peste fața telefonului',
    Math.abs(bb.max[2] - (fataZ(t) + cfg.buzaEcran)) < 1e-6, `${bb.max[2].toFixed(2)} mm`);

  // rama de probă
  const rama = ramaDeProba(cfg, corp1);
  const rbb = rama.boundingBox();
  check('  rama de probă are exact 3 mm', Math.abs((rbb.max[2] - rbb.min[2]) - 3) < 1e-6);
  rama.delete();

  // ---------- ȘABLONUL 2 ----------
  const r2 = decupajCamera(cfg, corp1);
  check('după decupajul camerei: o bucată, geometrie validă',
    String(r2.corp.status()) === 'NoError' && r2.corp.decompose().length === 1,
    `${r2.corp.decompose().length} bucăți, ${r2.corp.status()}`);
  jocCorect(cfg, r2.corp, 'după șablonul 2');

  /**
   * PERETELE DIN JURUL DECUPAJULUI ≥ 1,2 mm.
   *
   * Dacă pică, e bug de intersecție: regiunea decupajului a mușcat din peretele lateral. Se
   * măsoară pe felia peretelui, la jumătatea înălțimii lui — acolo unde decupajul NU trebuie să
   * ajungă deloc, fiindcă se scade doar din spate.
   */
  const zPerete = fataZ(t) / 2;
  const felie = r2.corp.trimByPlane([0, 0, 1], zPerete).trimByPlane([0, 0, -1], -(zPerete + 0.2));
  const sectiune = felie.project();
  const conturExt = new CrossSection([conturTelefon(t)], 'Positive').offset(cfg.joc + cfg.grosimePerete, 'Round');
  const cavitate = new CrossSection([conturTelefon(t)], 'Positive').offset(cfg.joc, 'Round');
  const perete = conturExt.subtract(cavitate);
  // ce lipsește din inelul de perete la înălțimea asta = ce a mușcat decupajul
  const lipsa = perete.subtract(sectiune);
  check('  peretele lateral e ÎNTREG la înălțimea lui',
    lipsa.area() < 0.5, `lipsesc ${lipsa.area().toFixed(3)} mm² din inelul de perete`);
  for (const x of [felie, sectiune, conturExt, cavitate, perete, lipsa]) x.delete();

  // marginile și buza, raportate
  const m = r2.margini;
  const buza = inaltimeBuzaCamera(cfg, m);
  console.log(`     margini: st ${m.stanga.toFixed(2)} dr ${m.dreapta.toFixed(2)} jos ${m.jos.toFixed(2)} sus ${m.sus.toFixed(2)}`
    + (m.laPerete.length ? ` · la perete: ${m.laPerete.join(', ')}` : '')
    + (m.stramte.length ? ` · strâmte: ${m.stramte.join(', ')}` : ''));
  console.log(`     buză cameră: cerută ${buza.ceruta.toFixed(2)} · permisă `
    + `${buza.maximPermis === Infinity ? 'fără limită' : buza.maximPermis.toFixed(2)} · construită ${buza.construita.toFixed(2)} mm`);
  check('  buza construită nu depășește ce permite conul',
    buza.construita <= buza.maximPermis + 1e-9);
  check('  buza acoperă vârful lentilei sau e limitată de con',
    buza.construita >= buza.ceruta - 1e-9 || buza.construita === buza.maximPermis);

  /**
   * DE CE EXISTA REGULA DE SUPRAPUNERE, dovedit pe geometria asta, nu pe una sintetica.
   *
   * Buza lipita EXACT de fundul husei da doua componente; cu 0,001 mm de suprapunere, una
   * singura. Am incercat sa reproduc defectul cu forme simple — cuburi, inel peste placa
   * gaurita — si nici una n-a picat. Deci nu se poate spune dinainte care contact e periculos:
   * verificarea din `uneste` ramane neconditionata, iar dovada ei sta aici.
   */
  if (id === 'iphone-15') {
    const c = corpHusa(cfg);
    const { regiune, margini: mg } = regiuneDecupajCamera(cfg);
    const bz = inaltimeBuzaCamera(cfg, mg);
    const gaura = Manifold.extrude(regiune, cfg.grosimePerete + 1).translate([0, 0, -cfg.grosimePerete - 1]);
    const cuGaura = c.subtract(gaura);
    const ext = regiune.offset(cfg.grosimePerete, 'Round');
    const inel = ext.subtract(regiune);
    for (const [eticheta, supra] of [['lipit exact', 0], [`suprapus ${SUPRAPUNERE} mm`, SUPRAPUNERE]] as [string, number][]) {
      const cb = Manifold.extrude(inel, bz.construita + supra).translate([0, 0, -cfg.grosimePerete - bz.construita]);
      const unit = cuGaura.add(cb);
      const n = unit.decompose().length;
      check(`  buza ${eticheta}: ${n} bucata(i)`, supra === 0 ? n === 2 : n === 1, `${n}`);
      cb.delete(); unit.delete();
    }
    for (const x of [c, regiune, gaura, cuGaura, ext, inel]) x.delete();
  }

  // ---------- ȘABLOANELE 3 și 4 ----------
  const ferestre = [...ferestreButoane(cfg), ...ferestreJosSus(cfg)];
  const corp34 = aplicaFerestre(cfg, r2.corp, ferestre);
  check(`după butoane + port (${ferestre.length} ferestre): o bucată, geometrie validă`,
    String(corp34.status()) === 'NoError' && corp34.decompose().length === 1,
    `${corp34.decompose().length} bucăți`);
  jocCorect(cfg, corp34, 'după șabloanele 3 și 4');

  /**
   * GROSIMEA DE PERETE RĂMASĂ, MĂSURATĂ PE PIESĂ.
   *
   * Nu pe intervale: intervalele spun unde AR TREBUI să fie materialul, iar întrebarea e dacă
   * chiar e. O bară subțire se trece prin perete, perpendicular pe el, la jumătatea benzii, și
   * se măsoară cât material a atins. În fereastră trebuie să iasă zero; între ferestre, peretele
   * întreg; peste un buton acoperit, exact grosimea subțiată.
   */
  const grosimeInPerete = (husa: any, latura: string, pozitie: number): number => {
    const lateral = latura === 'stanga' || latura === 'dreapta';
    const jum = (lateral ? t.corp.latime : t.corp.lungime) / 2;
    const semn = (latura === 'dreapta' || latura === 'sus') ? 1 : -1;
    const centruN = semn * (jum + cfg.joc + cfg.grosimePerete / 2);
    const L = cfg.grosimePerete + 4;
    const bara = lateral
      ? Manifold.cube([L, 0.2, 0.2], true).translate([centruN, pozitie, t.corp.grosime / 2])
      : Manifold.cube([0.2, L, 0.2], true).translate([pozitie, centruN, t.corp.grosime / 2]);
    const m = husa.intersect(bara);
    const v = m.volume();
    const bb = m.boundingBox();
    const gros = v < 1e-9 ? 0 : (lateral ? bb.max[0] - bb.min[0] : bb.max[1] - bb.min[1]);
    bara.delete(); m.delete();
    return gros;
  };

  console.log('     ferestre:');
  for (const f of ferestre) {
    const masurat = grosimeInPerete(corp34, f.latura, f.centru);
    console.log(`       ${f.latura.padEnd(7)} ${f.nume.padEnd(26)} `
      + `centru ${f.centru.toFixed(2).padStart(7)}  lung ${f.lungime.toFixed(2).padStart(6)}  `
      + `perete măsurat ${masurat.toFixed(3)} mm`
      + (f.stramt.length ? `  · strâns la ${f.stramt.map((x) => `${x.capat}/${x.motiv}`).join(', ')}` : '')
      + (f.depasireColt > 1e-6 ? `  · intră ${f.depasireColt.toFixed(2)} mm în racordul colțului` : ''));
    check(`  ${f.nume} (${f.latura}): peretele măsurat = ${f.peretRamas.toFixed(2)} cerut`,
      Math.abs(masurat - f.peretRamas) < 0.02, `${masurat.toFixed(3)} mm`);
  }

  /**
   * PUNȚILE DINTRE FERESTRE VECINE ≥ 1,2 mm — cerința structurală.
   *
   * Puntea până la COLȚ e altceva și nu intră în prag: dincolo de punctul de tangență peretele
   * nu se termină, se curbează. O fereastră care ajunge acolo nu lasă material subțire, ci taie
   * mai departe prin racord. Se raportează cât intră, fiindcă schimbă cum arată piesa, dar
   * pragul de perete n-are ce căuta pe o distanță care nu măsoară perete.
   */
  const punti = puntiFerestre(cfg, ferestre);
  const eticheta = (p: typeof punti[0]) => `${p.de ?? 'colț'} ↔ ${p.pana ?? 'colț'}`;
  for (const p of punti) {
    console.log(`       punte ${p.latura.padEnd(7)} ${eticheta(p).padEnd(38)} ${p.latime.toFixed(3).padStart(8)} mm`
      + (p.de === null || p.pana === null ? '   (până la racord — informativ)' : ''));
  }
  for (const p of punti.filter((x) => x.de !== null && x.pana !== null)) {
    check(`  punte ${p.latura} ${eticheta(p)} ≥ ${PERETE_MIN}`, p.latime >= PERETE_MIN - 1e-6,
      `${p.latime.toFixed(3)} mm`);
    // și materialul chiar e acolo, nu doar în aritmetica intervalelor
    const ale = ferestre.filter((f) => f.latura === p.latura).sort((a, b) => a.centru - b.centru);
    const idx = ale.findIndex((f) => f.nume === p.de);
    if (idx >= 0 && ale[idx + 1]) {
      const mij = ((ale[idx].centru + ale[idx].lungime / 2) + (ale[idx + 1].centru - ale[idx + 1].lungime / 2)) / 2;
      const gros = grosimeInPerete(corp34, p.latura, mij);
      check(`    puntea e material adevărat`, gros >= PERETE_MIN - 1e-6, `${gros.toFixed(3)} mm`);
    }
  }

  /**
   * BENZILE DE DEASUPRA ȘI DE SUB FEREASTRĂ.
   *
   * Fereastra ține banda întreagă, deci ce rămâne deasupra ei e buza ecranului, iar dedesubt
   * fundul husei. Se raportează amândouă: la piloții cu ramă plată sticla nu iese deloc peste
   * corp, deci deasupra ferestrei rămâne exact buza — 1,00 mm la parametrii impliciți.
   */
  console.log(`     bandă peste fereastră: ${(t.ecran.proeminentaFataDeCorp + cfg.buzaEcran).toFixed(2)} mm`
    + ` · sub fereastră: ${cfg.grosimePerete.toFixed(2)} mm`);

  // butoanele acoperite: aceeași piesă, alt parametru
  const cfgAcop = config(t, { butoaneAcoperite: true });
  const acoperibile = t.butoane.filter((b) => b.acoperibil);
  if (acoperibile.length) {
    const c1 = corpHusa(cfgAcop);
    const c2 = decupajCamera(cfgAcop, c1);
    const fA = [...ferestreButoane(cfgAcop), ...ferestreJosSus(cfgAcop)];
    const cA = aplicaFerestre(cfgAcop, c2.corp, fA);
    check(`acoperite: o bucată`, String(cA.status()) === 'NoError' && cA.decompose().length === 1);
    jocCorect(cfgAcop, cA, 'după 3 și 4, butoane acoperite');
    for (const f of fA.filter((x) => x.peretRamas > 0)) {
      const gros = grosimeInPerete(cA, f.latura, f.centru);
      check(`  ${f.nume} acoperit: perete ${PERETE_SUBTIAT} mm`,
        Math.abs(gros - PERETE_SUBTIAT) < 0.02, `${gros.toFixed(3)} mm`);
    }
    check('  câte un buton neacoperibil rămâne decupat',
      fA.filter((x) => x.peretRamas === 0).length > 0);
    cA.delete(); c2.corp.delete(); c1.delete();
  }

  // ---------- ȘABLONUL 6 — flex la colțuri, doar rigid ----------
  check('la TPU nu se taie flex', taieturiFlex(cfg).length === 0);
  const cfgR = config(t, { material: 'rigid', joc: 0.4 });
  const cR1 = corpHusa(cfgR);
  const cR2 = decupajCamera(cfgR, cR1);
  const fR = [...ferestreButoane(cfgR), ...ferestreJosSus(cfgR)];
  const cR3 = aplicaFerestre(cfgR, cR2.corp, fR);
  const flex = taieturiFlex(cfgR);
  const cR4 = aplicaFlex(cfgR, cR3, flex);
  const asezate = flex.filter((f) => f.asezat);
  check(`rigid: 4 colțuri cercetate, ${asezate.length} tăieturi așezate`,
    flex.length === 4 && asezate.length >= 3);
  for (const f of flex) {
    const dep = f.departare === Infinity ? 'departe de cameră' : `${f.departare.toFixed(2)} mm de decupajul camerei`;
    console.log(`     flex ${f.nume.padEnd(12)} ${f.asezat ? 'așezat' : 'OMIS  '}`
      + `${f.mutat ? ` (mutat ${f.mutat > 0 ? '+' : ''}${f.mutat}°)` : ''}  ${dep}`);
  }
  /**
   * NICIO FANTĂ NU SE PUNE PESTE DECUPAJUL CAMEREI.
   *
   * Verificarea care ține regula onestă: decupajul camerei scoate fundul husei până la Z = 0,
   * fanta scoate peretele de la Z = 0 în sus. Suprapuse, retează peretele pe toată înălțimea și
   * colțul rămâne fără balama.
   */
  for (const f of asezate) {
    check(`  ${f.nume}: fanta stă la ≥ ${PERETE_MIN} mm de decupajul camerei`,
      f.departare >= PERETE_MIN - 1e-6,
      f.departare === Infinity ? 'alt colț' : `${f.departare.toFixed(2)} mm`);
  }
  check('rigid: piesa rămâne o singură bucată după flex',
    String(cR4.status()) === 'NoError' && cR4.decompose().length === 1,
    `${cR4.decompose().length} bucăți`);
  jocCorect(cfgR, cR4, 'după șablonul 6 (rigid)');

  /**
   * FLEXUL NU SE AȘAZĂ LÂNGĂ O FEREASTRĂ.
   *
   * Se măsoară pe secțiunea reală, la jumătatea benzii: se dilată amprenta tăieturii până atinge
   * amprenta ferestrei, iar cât a trebuit dilatată e distanța dintre ele. Aceeași cerință de
   * 1,2 mm ca între ferestre — o lamă de flex e tot o gaură în perete.
   */
  const sectiune2D = (m: any, z: number) => {
    const felie = m.trimByPlane([0, 0, 1], z).trimByPlane([0, 0, -1], -(z + 0.2));
    const p = felie.project();
    felie.delete();
    return p;
  };
  const zB = t.corp.grosime / 2;
  const secFerestre = fR.map((f) => {
    const c = taietorFereastra(cfgR, f);
    const s = sectiune2D(c, zB);
    c.delete();
    return { nume: f.nume, s };
  });
  let minFlex = Infinity, undeMin = '';
  for (const fl of flex) {
    const c = taietorFlex(cfgR, fl);
    const s = sectiune2D(c, zB);
    c.delete();
    for (const w of secFerestre) {
      const d = distantaPlan(s, w.s);
      if (d < minFlex) { minFlex = d; undeMin = `${fl.nume} ↔ ${w.nume}`; }
    }
    s.delete();
  }
  for (const w of secFerestre) w.s.delete();
  check(`  flex ↔ cea mai apropiată fereastră ≥ ${PERETE_MIN}`, minFlex >= PERETE_MIN - 1e-6,
    `${minFlex.toFixed(2)} mm (${undeMin})`);

  /**
   * BALAMAUA CHIAR EXISTĂ SUB FIECARE FANTĂ.
   *
   * Se măsoară pe piesă, nu pe intenție: o bară verticală prin dreptul fantei trebuie să atingă
   * material sub Z = 0 — fundul husei. Zero acolo înseamnă perete retezat pe toată înălțimea.
   */
  for (const f of flex.filter((x) => x.asezat)) {
    const bara = Manifold.cube([0.2, 0.2, cfg.grosimePerete], true)
      .translate([f.punct[0], f.punct[1], -cfg.grosimePerete / 2]);
    const m = cR4.intersect(bara);
    const v = m.volume();
    bara.delete(); m.delete();
    check(`  ${f.nume}: balama sub fantă`, v > 1e-4, `${(v / 0.04).toFixed(2)} mm grosime de fund`);
  }

  cR4.delete(); cR3.delete(); cR2.corp.delete(); cR1.delete();

  corp34.delete(); r2.corp.delete(); corp1.delete();
  console.log('');
}

/**
 * ORCHESTRATORUL, CAP-COADĂ — ce chiar pleacă la slicer.
 *
 * Șabloanele verificate pe rând nu spun nimic despre ordinea în care se cheamă. Aici se
 * construiește prin `buildHusa`, exact cum o face aplicația, în amândouă produsele.
 */
console.log('── orchestrator: buildHusa ──');
for (const id of PILOTI) {
  const t = tel(id);
  for (const material of ['tpu', 'rigid'] as const) {
    for (const ceExporti of ['rama', 'husa'] as const) {
      const cfg = config(t, { material, ceExporti, joc: material === 'rigid' ? 0.4 : 0.25 });
      const r = buildHusa(cfg, { w: 256, d: 256 });
      const d = r.diagnostic;
      const eticheta = `${t.model} · ${material} · ${ceExporti}`;
      check(`${eticheta}: o bucată, geometrie validă`,
        String(r.corp.status()) === 'NoError' && d.bucati === 1,
        `${d.bucati} buc · ${d.triunghiuri} tri · ${d.volumCM3.toFixed(1)} cm³ · ${r.ms} ms`);
      check(`  încape pe placa de 256`, d.incapePePlaca,
        `${d.amprenta[0].toFixed(1)} × ${d.amprenta[1].toFixed(1)} mm`);
      if (ceExporti === 'husa') jocCorect(cfg, r.corp, `  ${material}`);
      /**
       * PIESA DE PRINT SE AȘAZĂ PE PLACĂ. Husa se construiește cu fundul la −grosimePerete;
       * trimisă așa la slicer, ar pluti sub placă și ar primi suporturi pentru nimic.
       */
      const print = pentruPrint(r.corp);
      const pb = print.boundingBox();
      check(`  piesa de print stă pe placă`, Math.abs(pb.min[2]) < 1e-9, `z min ${pb.min[2].toFixed(4)}`);
      check(`  corpul din arenă a rămas întreg`, r.corp.volume() > 0);
      print.delete(); r.corp.delete();
    }
  }
}

/**
 * BUZA DE FIXARE ȘI GROSIMEA TOTALĂ (HUS.2.1 + HUS.2.2).
 *
 * Cele două întrebări la care răspunde husa completă, și pe care rama de probă nu le poate pune:
 * ține telefonul, și e subțire?
 */
console.log('');
console.log('── buza de fixare + grosimea (HUS.2.1, HUS.2.2) ──');
for (const id of PILOTI) {
  const t = tel(id);
  for (const material of ['tpu', 'rigid'] as const) {
    const cfg = config(t, { material, ceExporti: 'husa', joc: material === 'rigid' ? 0.4 : 0.25 });
    const r = buildHusa(cfg, { w: 256, d: 256 });
    const d = r.diagnostic;
    const zBuza = fataZ(t) + Math.min(0.2, cfg.buzaEcran / 2);

    /**
     * SUPRAPUNEREA BUZEI PESTE FAȚA TELEFONULUI, măsurată acolo unde buza EXISTĂ.
     *
     * O bară de-a lungul normalei, la înălțimea buzei, spune până unde intră materialul peste
     * conturul telefonului. La rigid se sondează în afara întreruperii — acolo buza chiar e.
     */
    const suprapunere = (latura: 'stanga' | 'dreapta' | 'jos' | 'sus', pozitie: number): number => {
      const lateral = latura === 'stanga' || latura === 'dreapta';
      const jum = (lateral ? t.corp.latime : t.corp.lungime) / 2;
      const semn = (latura === 'dreapta' || latura === 'sus') ? 1 : -1;
      const L = cfg.buzaEcran + cfg.joc + cfg.grosimePerete + 4;
      const centru = semn * (jum + (cfg.joc + cfg.grosimePerete - cfg.buzaEcran) / 2);
      const bara = lateral
        ? Manifold.cube([L, 0.2, 0.2], true).translate([centru, pozitie, zBuza])
        : Manifold.cube([0.2, L, 0.2], true).translate([pozitie, centru, zBuza]);
      const m = r.corp.intersect(bara);
      const v = m.volume();
      const bbm = m.boundingBox();
      // cât intră materialul dincolo de conturul telefonului, spre interior
      const margineInterioara = lateral
        ? (semn > 0 ? bbm.min[0] : -bbm.max[0]) : (semn > 0 ? bbm.min[1] : -bbm.max[1]);
      bara.delete(); m.delete();
      return v < 1e-9 ? 0 : jum - margineInterioara;
    };

    const capatLat = capatTraseuDrept(t, 'stanga') * 0.8;
    const probe: [string, number][] = [
      ['stanga', capatLat], ['dreapta', -capatLat],
      ['jos', 0], ['sus', 0],
    ] as any;
    const valori = probe.map(([lat, poz]) => suprapunere(lat as any, poz));
    const minS = Math.min(...valori);
    console.log(`     ${t.model.padEnd(28)} ${material.padEnd(5)} suprapunere buză `
      + valori.map((v) => v.toFixed(2)).join(' / ') + ` mm (cerut ${cfg.buzaEcran.toFixed(2)})`);
    check(`${t.model} · ${material}: buza acoperă fața cu ${cfg.buzaEcran} mm pe tot conturul`,
      Math.abs(minS - cfg.buzaEcran) < 0.05, `minim ${minS.toFixed(3)} mm`);

    /**
     * TELEFONUL NU IESE PE FAȚĂ: un telefon la cotă reală, ridicat, se lovește de buză.
     *
     * Fără verificarea asta, o „buză" poate exista în volum și să nu rețină nimic — de exemplu
     * dacă ar fi ieșit în afara conturului telefonului, unde n-are ce ține.
     */
    const csT = new CrossSection([conturTelefon(t)], 'Positive');
    const telefonSolid = Manifold.extrude(csT, fataZ(t));
    const ridicat = telefonSolid.translate([0, 0, 0.5]);
    const lovire = r.corp.intersect(ridicat);
    check(`  telefonul nu iese pe față`, lovire.volume() > 1, `${lovire.volume().toFixed(1)} mm³ de buză în cale`);
    lovire.delete(); ridicat.delete(); telefonSolid.delete();

    /**
     * DESCHIDEREA FRONTALĂ — cât de larg e golul prin care intră telefonul.
     *
     * La rigid, întreruperile buzei o duc până la cavitate; la TPU rămâne strânsă, iar diferența
     * o acoperă întinderea materialului. Cifra se raportează ca PROCENT de întindere necesară,
     * fiindcă asta e ce trebuie să știe operatorul, nu un milimetru abstract.
     */
    const felie = r.corp.trimByPlane([0, 0, 1], zBuza).trimByPlane([0, 0, -1], -(zBuza + 0.15));
    const sect = felie.project();
    // exact conturul exterior: cu un guler în plus, „golul" ar cuprinde și aerul din jurul piesei
    const plin = new CrossSection([conturTelefon(t)], 'Positive').offset(cfg.joc + cfg.grosimePerete, 'Round');
    const gol = plin.subtract(sect);
    const solidGol = Manifold.extrude(gol, 1);
    const bg = solidGol.boundingBox();
    const latimeDeschidere = bg.max[0] - bg.min[0];
    const intindere = 100 * (t.corp.latime - latimeDeschidere) / t.corp.latime;
    console.log(`     ${''.padEnd(28)} ${material.padEnd(5)} deschidere frontală `
      + `${latimeDeschidere.toFixed(2)} mm faţă de telefon ${t.corp.latime.toFixed(2)} `
      + `→ întindere necesară ${intindere.toFixed(1)}%`);
    check(`  la rigid deschiderea lasă telefonul să intre`,
      material !== 'rigid' || intindere <= 0, `${intindere.toFixed(1)}%`);
    for (const x of [felie, sect, plin, gol, solidGol, csT]) x.delete();

    // GROSIMEA (HUS.2.2)
    const gr = d.grosime;
    console.log(`     ${''.padEnd(28)} ${material.padEnd(5)} grosime în afara camerei `
      + `${gr.inAfaraCamerei.toFixed(2)} mm = telefon + ${gr.pesteTelefon.toFixed(2)} `
      + `(husa pune ${gr.contributiaHusei.toFixed(2)}) · pe buza camerei ${gr.totala.toFixed(2)} mm`);
    check(`  husa adaugă ≤ ${gr.tinta} mm peste fața telefonului`, !gr.peste,
      `+${gr.contributiaHusei.toFixed(2)} mm`);
    check(`  buza camerei chiar e locală`, gr.totala > gr.inAfaraCamerei + 0.5,
      `${(gr.totala - gr.inAfaraCamerei).toFixed(2)} mm mai înaltă doar la cameră`);

    jocCorect(cfg, r.corp, `  ${material} după buza de fixare`);
    r.corp.delete();
  }
}

console.log('');
/**
 * ZONELE CARE NU SE ACOPERĂ (HUS.2.5).
 *
 * Fiecare `keepOut` din datele telefonului e un orificiu care trebuie să rămână liber. Se
 * verifică pe piesă: o bară verticală prin centrul lui nu trebuie să atingă material.
 */
console.log('');
console.log('── zonele care nu se acoperă (HUS.2.5) ──');
for (const id of PILOTI) {
  const t = tel(id);
  const cfg = config(t, { ceExporti: 'husa' });
  const r = buildHusa(cfg, { w: 256, d: 256 });
  const lista = (t as any).keepOut as { nume: string; x: number; y: number; latime: number }[];
  console.log(`     ${t.model.padEnd(28)} ${lista.length} zone · ${r.diagnostic.keepOut.length} cu gaură proprie`
    + (r.diagnostic.keepOut.length ? `: ${r.diagnostic.keepOut.map((k) => k.nume).join(', ')}` : ''));
  for (const k of lista) {
    const bara = Manifold.cube([0.3, 0.3, cfg.grosimePerete + 2], true)
      .translate([k.x, k.y, -cfg.grosimePerete / 2]);
    const m = r.corp.intersect(bara);
    const v = m.volume();
    bara.delete(); m.delete();
    check(`  ${t.model}: „${k.nume}" e liber`, v < 1e-6, `${v.toFixed(4)} mm³ de husă peste el`);
  }
  check(`  ${t.model}: piesa rămâne o bucată după găurile keepOut`, r.diagnostic.bucati === 1);
  jocCorect(cfg, r.corp, `  după keepOut`);
  r.corp.delete();
}

console.log('');
/**
 * INELUL RAMEI DE PROBA — DOUA FELII, fiindca banda are doua zone cu cerinte diferite.
 *
 * Rama de 3 mm e compusa din peretele lateral, intre `0` si `fataZ(t)`, si buza, deasupra lui.
 * Peretele strange conturul; buza tine telefonul sa nu iasa pe fata. Bresa camerei e fereastra
 * de inspectie a aliniamentului si are voie sa taie DOAR buza:
 *
 *   felie prin perete (jos)  →  0 intreruperi, bucla inchisa pe tot conturul
 *   felie prin buza  (sus)   →  1 intrerupere, pe latura camerei
 *
 * O SINGURA FELIE NU AJUNGE, si asta s-a vazut de doua ori la rand. Prima data, o felie la
 * mijloc a aratat 6-9 arce acolo unde numaratoarea de componente pe VOLUM raporta „1 bucata" —
 * ferestrele nu acopereau toata inaltimea benzii, deci piesa ramanea legata pe alte inaltimi.
 * A doua oara, aceeasi felie a aratat cuminte „1 intrerupere" pentru o rama deschisa complet pe
 * latura camerei: la jumatatea benzii bresa exista legitim, iar felia n-avea cum sa spuna ca ea
 * coboara si prin perete, unde n-are ce cauta.
 *
 * Numarul de intreruperi se citeste din felie: doua sau mai multe bucati inseamna atatea
 * intreruperi; o singura bucata cu gaura inseamna inel inchis (zero); o singura bucata fara
 * gaura inseamna exact una.
 *
 * SI LOCUL CONTEAZA, nu doar numarul. O rama cu o singura bresa, dar in alta parte, ar trece
 * numaratoarea si tot n-ar arata alinierea camerei. Latura goala se citeste din geometrie si se
 * compara cu `insulaCamera.y` din DATE, nu cu ce a decis codul.
 */
console.log('');
console.log('── inelul ramei de proba ──');
{
  const toate = readdirSync(join(ROOT, 'date', 'telefoane', 'apple'))
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(ROOT, 'date', 'telefoane', 'apple', f), 'utf8')) as Telefon)
    .filter((t) => esteComplet(t as never));
  check(`rama se verifica pe toate cele ${toate.length} modele complete`, toate.length >= 8, `${toate.length}`);

  for (const t of toate) {
    const cfg = config(t, { ceExporti: 'rama' });
    const r = buildHusa(cfg, { w: 256, d: 256 });

    /** felia la inaltimea `z`: bucati, gauri, intreruperi si proiectia, pentru masuratori */
    const felieLa = (z: number) => {
      const cutit = Manifold.cube([500, 500, 0.2], true).translate([0, 0, z]);
      const felie = r.corp.intersect(cutit);
      const proiectie = felie.project();
      const parti = proiectie.decompose();
      const gauri = (proiectie.toPolygons() as [number, number][][]).filter((inel) => {
        let A = 0;
        for (let k = 0; k < inel.length; k++) {
          const p1 = inel[k], p2 = inel[(k + 1) % inel.length];
          A += p1[0] * p2[1] - p2[0] * p1[1];
        }
        return A < 0;
      }).length;
      const intreruperi = parti.length >= 2 ? parti.length : (gauri > 0 ? 0 : 1);
      cutit.delete(); felie.delete();
      for (const x of parti) x.delete();
      return { proiectie, parti: parti.length, gauri, intreruperi };
    };

    /**
     * INALTIMILE se iau din geometria husei, nu din bounding box: `fataZ(t)` e chiar trecerea
     * perete -> buza. Peretele se taie la mijlocul portiunii lui din banda, buza la mijlocul ei.
     */
    const zTrecere = fataZ(t);
    const zPerete = (zTrecere + (zTrecere + cfg.buzaEcran - INALTIME_RAMA)) / 2;
    const zBuza = zTrecere + cfg.buzaEcran / 2;

    const perete = felieLa(zPerete);
    console.log(`     ${t.model.padEnd(22)} perete z ${zPerete.toFixed(2)}:`
      + ` ${perete.parti} bucata/i, ${perete.gauri} gaura/i -> ${perete.intreruperi} intrerupere(i)`);
    check(`  ${t.model}: peretele lateral e bucla inchisa (0 intreruperi)`,
      perete.intreruperi === 0, `${perete.intreruperi}`);
    perete.proiectie.delete();

    const buza = felieLa(zBuza);
    const proiectie = buza.proiectie;

    /**
     * BRESA, IZOLATA CA REGIUNE — nu cautata cu o sonda intr-un loc presupus.
     *
     * Prima incercare punea o sonda pe axa mediana, la capatul de sus si la cel de jos, si se
     * uita unde lipseste material. A dat „neclara" pe trei modele — nu fiindca geometria ar fi
     * fost gresita, ci fiindca BRESA NU E CENTRATA pe x = 0: sta peste insula camerei, care la
     * 16 e la x -22,2 si la SE 3 la -23,2. Sonda cadea langa ea.
     *
     * Metoda buna nu presupune unde e: conturul exterior al feliei e convex, deci anvelopa lui
     * convexa e chiar inelul intreg. Scazand felia din anvelopa ramane golul din mijloc plus
     * canalul bresei; intersectat cu o banda strict in interiorul peretelui, ramane exact bresa.
     *
     * Banda se ia cu 0,4 mm mai ingusta decat peretele (`joc + grosimePerete`): la latimea
     * exacta ar musca 0,3 mm din golul din mijloc pe tot perimetrul si ar aduna 130 mm2 de
     * fals-pozitiv, mai mult decat bresa insasi.
     */
    const anvelopa = proiectie.hull();
    const interior = anvelopa.offset(-(cfg.joc + cfg.grosimePerete - 0.4), 'Miter');
    const inelPerete = anvelopa.subtract(interior);
    const restul = anvelopa.subtract(proiectie);
    const bresa = restul.intersect(inelPerete);
    const bucatiBresa = bresa.decompose();

    let A2 = 0, bx = 0, by = 0;
    for (const inel of bresa.toPolygons() as [number, number][][]) {
      for (let k = 0; k < inel.length; k++) {
        const p1 = inel[k], p2 = inel[(k + 1) % inel.length];
        const f = p1[0] * p2[1] - p2[0] * p1[1];
        A2 += f; bx += (p1[0] + p2[0]) * f; by += (p1[1] + p2[1]) * f;
      }
    }
    A2 /= 2;
    const cbx = bx / (6 * A2), cby = by / (6 * A2);
    const laturaGoala = cby > 0 ? 'sus' : 'jos';
    const laturaAsteptata = t.insulaCamera.y > 0 ? 'sus' : 'jos';
    const i0 = t.insulaCamera.x - t.insulaCamera.latime / 2;
    const i1 = t.insulaCamera.x + t.insulaCamera.latime / 2;

    console.log(`     ${''.padEnd(22)} buza   z ${zBuza.toFixed(2)}:`
      + ` ${buza.parti} bucata/i, ${buza.gauri} gaura/i -> ${buza.intreruperi} intrerupere(i)`
      + ` · bresa ${Math.abs(A2).toFixed(1)} mm2 la (${cbx.toFixed(1)}, ${cby.toFixed(1)})`);
    check(`  ${t.model}: buza are exact o intrerupere`, buza.intreruperi === 1, `${buza.intreruperi}`);
    check(`  ${t.model}: bresa e o singura regiune`, bucatiBresa.length === 1, `${bucatiBresa.length}`);
    check(`  ${t.model}: bresa e pe latura camerei (insulaCamera.y ${t.insulaCamera.y.toFixed(1)})`,
      laturaGoala === laturaAsteptata, `${laturaGoala} fata de ${laturaAsteptata}`);
    /**
     * SI PESTE INSULA, nu doar pe latura buna. O bresa in coltul opus al aceleiasi laturi ar
     * trece verificarea de latura si tot n-ar arata alinierea camerei, care e singurul motiv
     * pentru care bresa exista.
     */
    check(`  ${t.model}: bresa cade peste insula camerei (x ${i0.toFixed(1)}..${i1.toFixed(1)})`,
      cbx >= i0 && cbx <= i1, `x ${cbx.toFixed(1)}`);

    /**
     * SI TOT INTRA PE TELEFON. Fara ferestre, inelul e plin pe tot conturul; daca relieful unui
     * buton ar urca in banda de 3 mm, rama ar avea o umflatura acolo si n-ar mai intra curat.
     * Din cote parea ca nu urca — dar asta se masoara, nu se deduce.
     */
    const man = manechinTelefon(cfg);
    const ciocnire = man.intersect(r.corp);
    const vol = ciocnire.volume();
    check(`  ${t.model}: manechinul nu atinge inelul plin`, vol < 0.5, `${vol.toFixed(2)} mm3`);

    for (const x of [proiectie, anvelopa, interior, inelPerete, restul, bresa, ...bucatiBresa,
      man, ciocnire, r.corp]) x.delete();
  }
}

console.log('');
/**
 * BUMPERUL (HUS.2.B1-B3) — spate deschis, retentie doar din buza, marcaj pe sina dreapta.
 *
 * RETENTIA E TOATA CERINTA AICI. Husa completa tine telefonul cu spatele plus buza; bumperul
 * n-are spate, deci ramane numai buza. O buza intrerupta undeva nu strange — exact ce s-a
 * intamplat la rama de proba, unde bresa camerei taia si peretele si inelul se desfacea la
 * colturi. De-aia se masoara cu ACEEASI metoda, felie la doua inaltimi:
 *
 *   felie prin buza   →  0 intreruperi, bucla inchisa pe tot conturul
 *   felie prin perete →  ferestrele functionale, care AU voie sa taie acolo
 *
 * Masurat inainte de a construi, ca sa nu iasa o cerinta imposibila: pe husa completa buza e deja
 * continua la toate cele opt modele, fiindca ferestrele se opresc sub ea. Bumperul mosteneste
 * proprietatea; testul o pazeste.
 */
console.log('');
console.log('── bumper: spate deschis, buza continua, marcaj pe sina ──');
{
  const toate = readdirSync(join(ROOT, 'date', 'telefoane', 'apple'))
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(ROOT, 'date', 'telefoane', 'apple', f), 'utf8')) as Telefon)
    .filter((t) => esteComplet(t as never));

  const fontSem = (() => {
    const b = readFileSync(join(ROOT, 'public', 'fonts', 'Inter-900.ttf'));
    return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
  })();
  const marcajGol = { stare: { fel: 'lipsa' } as any, siluetaSemnatura: () => [], azi: new Date(2026, 8, 6) };
  /** silueta BRUTA a unui „L", cum o primeste aplicatia */
  const siluetaL = (): any[] => {
    const b = textSolid(fontSem, 'L', 2.5, 1);
    const sil = b.project(); b.delete();
    const p2 = sil.toPolygons(); sil.delete();
    return p2;
  };

  /** intreruperile inelului la inaltimea `z` */
  const intreruperiLa = (corp: any, z: number): number => {
    const cutit = Manifold.cube([500, 500, 0.2], true).translate([0, 0, z]);
    const felie = corp.intersect(cutit);
    const pr = felie.project();
    const parti = pr.decompose();
    const gauri = (pr.toPolygons() as [number, number][][]).filter((inel) => {
      let A = 0;
      for (let k = 0; k < inel.length; k++) {
        const p1 = inel[k], p2 = inel[(k + 1) % inel.length];
        A += p1[0] * p2[1] - p2[0] * p1[1];
      }
      return A < 0;
    }).length;
    const n = parti.length >= 2 ? parti.length : (gauri > 0 ? 0 : 1);
    for (const x of [cutit, felie, pr, ...parti]) x.delete();
    return n;
  };

  for (const t of toate) {
    const cfg = config(t, { ceExporti: 'bumper', fontGravare: fontSem, marcaj: marcajGol });
    const r = buildHusa(cfg, { w: 256, d: 256 });
    const bb = r.corp.boundingBox();
    const zBuza = fataZ(t) + cfg.buzaEcran / 2;
    const zPerete = fataZ(t) / 2;
    const nBuza = intreruperiLa(r.corp, zBuza);
    const nPerete = intreruperiLa(r.corp, zPerete);

    /**
     * BUZA DINSPRE SPATE — a doua bucla care tine telefonul, si a doua care trebuie sa fie
     * continua. Se taie la jumatatea grosimii peretelui, adica prin ea.
     */
    const nBuzaSpate = intreruperiLa(r.corp, -cfg.grosimePerete / 2);

    /** fereastra din spate: cat se vede din telefon prin ea */
    const felieSpate = Manifold.cube([500, 500, 0.2], true).translate([0, 0, -cfg.grosimePerete / 2]);
    const inelSpate = r.corp.intersect(felieSpate);
    const prSpate = inelSpate.project();
    const ariaInel = prSpate.area();

    console.log(`     ${t.model.padEnd(22)} ${r.diagnostic.volumCM3.toFixed(3)} cm³`
      + ` · z ${bb.min[2].toFixed(2)}..${bb.max[2].toFixed(2)}`
      + ` · buza sus ${nBuza} · buza spate ${nBuzaSpate} · perete ${nPerete}`
      + ` · inel spate ${ariaInel.toFixed(0)} mm²`);
    check(`  ${t.model}: bumperul e o singura bucata`, r.diagnostic.bucati === 1, `${r.diagnostic.bucati}`);
    check(`  ${t.model}: buza de pe fata e continua pe tot conturul`, nBuza === 0, `${nBuza} intreruperi`);
    check(`  ${t.model}: buza dinspre spate e continua pe tot conturul`, nBuzaSpate === 0,
      `${nBuzaSpate} intreruperi`);
    check(`  ${t.model}: peretele are ferestrele functionale`, nPerete >= 2, `${nPerete}`);
    /**
     * SPATELE E PLAN LA `-grosimePerete`, fara nimic dedesubt.
     *
     * Gulerul camerei coboara pe husa completa pana la −3,3 (SE 3) sau −6,8 (17 Pro Max). Pe
     * bumper n-are ce proteja si n-are de ce sa se agate: daca ramane, piesa se sprijina pe el la
     * print in loc sa stea pe buza. Nu se vede nici in volum, nici in numarul de bucati — se vede
     * in `z` minim, si pe placa.
     */
    check(`  ${t.model}: spatele e plan, fara guler ramas dedesubt`,
      Math.abs(bb.min[2] + cfg.grosimePerete) < 1e-6, `z min ${bb.min[2].toFixed(3)}`);
    for (const x of [felieSpate, inelSpate, prSpate]) x.delete();

    /**
     * MARCAJUL PE SINA DREAPTA: incape in tronsonul liber, nu atinge niciun buton, si se citeste
     * corect din exteriorul sinei.
     *
     * Orientarea se masoara in cadrul cititorului, care pentru sina dreapta are dreapta la +Y si
     * sus la +Z. Piesa se roteste cu permutarea ciclica (x,y,z) -> (y,z,x), o rotatie curata, ca
     * proiectia sa cada chiar pe planul sinei.
     */
    const tronson = tronsonLiberSina(t, 'dreapta');
    check(`  ${t.model}: tronsonul liber de pe sina dreapta incape semnatura`,
      tronson.lungime >= MARIMI.vizibila.latime, `${tronson.lungime.toFixed(1)} mm`);

    const cuL = buildHusa(config(t, { ceExporti: 'bumper', fontGravare: fontSem,
      marcaj: { ...marcajGol, siluetaSemnatura: siluetaL } }), { w: 256, d: 256 });
    const groapa = r.corp.subtract(cuL.corp);
    const gb = groapa.boundingBox();
    const rot = groapa.transform([0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1]);
    const pr = rot.project();
    let A = 0, ax = 0, ay = 0, mnX = Infinity, mxX = -Infinity, mnY = Infinity, mxY = -Infinity;
    for (const inel of pr.toPolygons() as [number, number][][]) {
      for (let k = 0; k < inel.length; k++) {
        const p1 = inel[k], p2 = inel[(k + 1) % inel.length];
        const f = p1[0] * p2[1] - p2[0] * p1[1];
        A += f; ax += (p1[0] + p2[0]) * f; ay += (p1[1] + p2[1]) * f;
        mnX = Math.min(mnX, p1[0]); mxX = Math.max(mxX, p1[0]);
        mnY = Math.min(mnY, p1[1]); mxY = Math.max(mxY, p1[1]);
      }
    }
    A /= 2;
    const dY = ax / (6 * A) - (mnX + mxX) / 2;
    const dZ = ay / (6 * A) - (mnY + mxY) / 2;
    console.log(`     ${''.padEnd(22)} tronson ${tronson.lungime.toFixed(1)} mm · groapa y`
      + ` ${gb.min[1].toFixed(1)}..${gb.max[1].toFixed(1)} · orientare Y ${dY.toFixed(2)} Z ${dZ.toFixed(2)}`);
    check(`  ${t.model}: marcajul cade in tronsonul liber`,
      gb.min[1] > tronson.centru - tronson.lungime / 2 && gb.max[1] < tronson.centru + tronson.lungime / 2,
      `${gb.min[1].toFixed(1)}..${gb.max[1].toFixed(1)} in ${(tronson.centru - tronson.lungime / 2).toFixed(1)}..${(tronson.centru + tronson.lungime / 2).toFixed(1)}`);
    check(`  ${t.model}: „L" pe sina se citeste corect din exterior`, dY < 0 && dZ < 0,
      `(${dY.toFixed(2)}, ${dZ.toFixed(2)})`);
    for (const x of [groapa, rot, pr, cuL.corp]) x.delete();

    /**
     * RETENTIA, IN AMBELE SENSURI — cerinta care justifica tot restul.
     *
     * Bumperul tine telefonul intre doua buze: cea de pe fata ecranului si cea dinspre spate. Se
     * masoara efectul direct, pe piesa, nu doar conditia structurala:
     *
     *   NU IESE PE FATA:  manechinul ridicat cu 0,5 mm se izbeste de buza de sus.
     *   NU IESE PE SPATE: manechinul coborat cu 0,5 mm se izbeste de buza dinspre spate. Fara ea,
     *                     bumperul l-ar fi tinut doar cu frecarea peretilor.
     *   INTRA:            la locul lui, contactul nu e mai mare decat pe husa completa.
     *
     * PRAGUL PENTRU „INTRA" E COMPARATIV, nu o cifra. Manechinul atinge orice husa pe racordurile
     * de colt, unde ambele suprafete sunt fatetate: iese contact de ordinul zecilor de mm³,
     * imprastiat in sute de aschii de 0,00 mm³ — 99,35 mm³ pe husa completa la 17 Pro fata de
     * 57,80 pe bumper. E artefact de teselare, nu interferenta, si o cifra fixa ar fi ori prea
     * larga ori arbitrara. Reperul corect e husa completa, care se monteaza demonstrat.
     */
    const manLoc = manechinTelefon(cfg);
    const contactBumper = manLoc.intersect(r.corp);
    const laLoc = contactBumper.volume();
    const husaIntreaga = buildHusa(config(t, { ceExporti: 'husa', fontGravare: fontSem,
      marcaj: marcajGol, spate: { stil: 'plin', text: '', inaltimeText: 18, snur: 'fara',
        tipar: { model: 'fagure', pas: 8, grosimePerete: 2, unghi: 0, varianta: 1 } as any } }),
    { w: 256, d: 256 });
    const contactHusa = manLoc.intersect(husaIntreaga.corp);
    const laLocHusa = contactHusa.volume();

    const ridicat = manLoc.translate([0, 0, 0.5]);
    const coborat = manLoc.translate([0, 0, -0.5]);
    const blocatSus = ridicat.intersect(r.corp);
    const blocatJos = coborat.intersect(r.corp);
    const volSus = blocatSus.volume(), volJos = blocatJos.volume();

    check(`  ${t.model}: telefonul intra la fel de bine ca in husa completa`,
      laLoc <= laLocHusa + 1e-6, `${laLoc.toFixed(2)} faţă de ${laLocHusa.toFixed(2)} mm³`);
    check(`  ${t.model}: telefonul NU iese pe fata (buza de sus il blocheaza)`, volSus > 50,
      `${volSus.toFixed(1)} mm³ la 0,5 mm ridicare`);
    check(`  ${t.model}: telefonul NU iese pe spate (buza dinspre spate il blocheaza)`, volJos > 50,
      `${volJos.toFixed(1)} mm³ la 0,5 mm coborare`);
    for (const x of [manLoc, contactBumper, husaIntreaga.corp, contactHusa,
      ridicat, coborat, blocatSus, blocatJos]) x.delete();

    /**
     * MICRO-MARCAJUL (A.3) EXISTA SI PE BUMPER. Fara asezarea lui proprie ar cadea sub `z = 0`,
     * unde bumperul n-are material: n-ar taia nimic si ar disparea in tacere, fara ca volumul sa
     * arate ceva — nu s-a scos nimic de nicaieri.
     */
    const faraMicro = buildHusa(config(t, { ceExporti: 'bumper', fontGravare: null, marcaj: marcajGol }),
      { w: 256, d: 256 });
    const cuMicro = microMarcajBumper(config(t, { ceExporti: 'bumper', fontGravare: fontSem }),
      faraMicro.corp, 'M3D 2026-09-06');
    const difMicro = faraMicro.corp.subtract(cuMicro);
    const volMicro = difMicro.volume();
    check(`  ${t.model}: micro-marcajul scoate material de pe sina interioara`, volMicro > 0.1,
      `${volMicro.toFixed(2)} mm³`);
    for (const x of [faraMicro.corp, cuMicro, difMicro, r.corp]) x.delete();
  }

  /**
   * EXPORTUL COMERCIAL FARA MARCAJ = PIESA NEMARCATA PLUS MICRO-MARCAJUL. Nimic altceva.
   *
   * Formularea canonica, dupa corectura operatorului: „comercial fara marcaj = doar
   * micro-marcajul cu nr. licenta, nimic altceva". Prima redactare zicea „identic cu nemarcat",
   * ceea ce se batea cap in cap cu A.3: micro-marcajul NU e optional, nici cu licenta
   * comerciala — doar ca poarta numarul licentei in loc de data. Masurat: diferenta e de
   * 4,64 mm³, adica exact groapa lui.
   *
   * Ce trebuie sa fie adevarat, si se verifica aici, e ca in afara de el nu ramane NIMIC: nici
   * banda de textura, nici vreo urma de semnatura. Se compara prin diferenta simetrica fata de
   * piesa nemarcata pe care s-a aplicat doar micro-marcajul — doua corpuri care se scad reciproc
   * la zero sunt acelasi corp, nu doar unul de aceeasi marime.
   */
  const tRef = toate[0];
  const comercial = { fel: 'valida', serie: 'CF1',
    licenta: { id: '0007', nume: 'Atelier Proba SRL', expira: '2099-01-01', plan: '1an', comercial: true },
  } as any;
  const cuDrept = buildHusa(config(tRef, { ceExporti: 'bumper', fontGravare: fontSem,
    marcaj: { stare: comercial, siluetaSemnatura: () => [], azi: new Date(2026, 8, 6),
      textura: { activa: false } } }), { w: 256, d: 256 });
  const faraDeloc = buildHusa(config(tRef, { ceExporti: 'bumper', fontGravare: fontSem }),
    { w: 256, d: 256 });
  const doarMicro = microMarcajBumper(config(tRef, { ceExporti: 'bumper', fontGravare: fontSem }),
    faraDeloc.corp, cuDrept.diagnostic.marcaj!.microText);
  const d1 = cuDrept.corp.subtract(doarMicro).volume();
  const d2 = doarMicro.subtract(cuDrept.corp).volume();
  const doarMicroVol = faraDeloc.corp.subtract(doarMicro).volume();
  console.log(`     ${'comercial fara marcaj'.padEnd(22)} ${cuDrept.diagnostic.volumCM3.toFixed(4)} cm³`
    + ` · micro „${cuDrept.diagnostic.marcaj!.microText}" ${doarMicroVol.toFixed(2)} mm³`
    + ` · diferenţă simetrică ${(d1 + d2).toFixed(4)} mm³`);
  check(`  comercial fara marcaj: nu ramane decat micro-marcajul`, d1 + d2 < 1e-6,
    `${(d1 + d2).toFixed(6)} mm³`);
  check(`  si micro-marcajul chiar exista, cu numarul licentei`,
    doarMicroVol > 0.1 && cuDrept.diagnostic.marcaj!.microText.includes('0007'),
    `${doarMicroVol.toFixed(2)} mm³, „${cuDrept.diagnostic.marcaj!.microText}"`);
  for (const x of [cuDrept.corp, faraDeloc.corp, doarMicro]) x.delete();
}

console.log('');
/**
 * FEREASTRA DE CAMERA CONTROL, PE TOATE MODELELE COMPLETE.
 *
 * Convenția `keepout`: `inaltime` = întinderea pe Y (de-a lungul laturii), `latime` = pe X.
 * Camera Control e o pilulă verticală: 25,00 mm pe Y, 8,40 pe X.
 *
 * Verificarea nu se uită la lista de piloți, ci la TOATE modelele complete din depozit: exact
 * greșeala asta a intrat pe ușa din dos, cu un model nou care scria cele două numere în cealaltă
 * ordine. Un test legat de patru fișiere n-ar fi prins-o nici a doua oară.
 */
console.log('');
console.log('── fereastra Camera Control ──');
{
  const toate = readdirSync(join(ROOT, 'date', 'telefoane', 'apple'))
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(ROOT, 'date', 'telefoane', 'apple', f), 'utf8')) as Telefon)
    .filter((t) => esteComplet(t as never));
  const cuCC = toate.filter((t) => t.butoane.some((b) => b.keepout));
  check(`modele complete: ${toate.length}, dintre care ${cuCC.length} cu Camera Control`,
    toate.length >= 8 && cuCC.length >= 5, `${toate.length} / ${cuCC.length}`);
  for (const t of cuCC) {
    const cfg = config(t, { ceExporti: 'husa' });
    const cc = ferestreButoane(cfg).find((f) => f.nume.includes('camera-control'))!;
    const k = t.butoane.find((b) => b.keepout)!.keepout!;
    console.log(`     ${t.model.padEnd(22)} keepout ${k.latime} × ${k.inaltime} → fereastră ${cc.lungime.toFixed(2)} mm pe Y`);
    check(`  ${t.model}: fereastra CC = întinderea pe Y a keepout-ului`,
      Math.abs(cc.lungime - k.inaltime) < 1e-9 && cc.lungime > k.latime,
      `${cc.lungime.toFixed(2)} faţă de ${k.inaltime}`);
  }
}

console.log('');
/**
 * ORIENTAREA TEXTULUI PE FIECARE CALE (R.4, extins).
 *
 * Reperul, stabilit de operator pe geometria fizică: husa se citește privind spatele telefonului
 * din exterior, deci +X e la dreapta cititorului și +Y în sus. O glifă „L" corectă are masa în
 * stânga-jos — centroidul la (−X, −Y) față de centrul cutiei ei.
 *
 * SE MĂSOARĂ FIECARE CALE SEPARAT, fiindcă pot să divergă și chiar au divergit: semnătura trece
 * prin `matriceCadru`, care îi întoarce Y-ul o dată, iar celelalte trei luau ieșirea `textSolid`
 * ca atare — Y în jos. Trei din patru erau răsturnate, și nu s-a văzut fiindcă textele de probă
 * („ANA", „M3D") sunt aproape simetrice.
 *
 * O RĂSTURNARE NU SCHIMBĂ NICI VOLUMUL, NICI TRIUNGHIURILE, NICI COMPONENTELE. Nicio verificare
 * de până acum n-o putea prinde; de-aia asta măsoară un centroid, care e singura dintre ele care
 * își schimbă semnul.
 */
console.log('');
console.log('── orientarea textului pe fiecare cale (R.4) ──');
{
  const fontSem = (() => {
    const b = readFileSync(join(ROOT, 'public', 'fonts', 'Inter-900.ttf'));
    return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
  })();
  /** centroidul unei regiuni 2D, față de centrul cutiei ei */
  const masa = (cs: any): { dx: number; dy: number } => {
    const inele = cs.toPolygons() as [number, number][][];
    let A = 0, cx = 0, cy = 0, minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const inel of inele) {
      for (let i = 0; i < inel.length; i++) {
        const [x1, y1] = inel[i], [x2, y2] = inel[(i + 1) % inel.length];
        const f = x1 * y2 - x2 * y1;
        A += f; cx += (x1 + x2) * f; cy += (y1 + y2) * f;
        minX = Math.min(minX, x1); maxX = Math.max(maxX, x1);
        minY = Math.min(minY, y1); maxY = Math.max(maxY, y1);
      }
    }
    A /= 2;
    return { dx: cx / (6 * A) - (minX + maxX) / 2, dy: cy / (6 * A) - (minY + maxY) / 2 };
  };
  const t = tel('iphone-16');
  const cfgOgl = (over: Partial<HusaConfig> = {}) =>
    config(t, { ceExporti: 'husa', fontGravare: fontSem, ...over });

  /**
   * 1. UNITATEA, PE AMÂNDOUĂ FEȚELE.
   *
   * `siluetaText` hrănește numele de pe spate, micro-marcajul și eticheta ramei; cele trei doar
   * o mută și o scalează uniform după aceea, deci dacă ea e bună pe fața cerută, sunt și ele.
   *
   * Pe fața INTERIOARĂ (normala +Z: fundul cavității, fața de sus a inelului) cititorul stă în
   * partea gravării, deci un „L" are masa în stânga-jos. Pe cea EXTERIOARĂ (normala −Z: spatele
   * husei, cel care stă pe placă) cititorul privește de pe partea opusă, deci același „L" trebuie
   * să stea oglindit pe X în fișier: masa în DREAPTA-jos. Cele două fețe cer oglindiri inverse.
   */
  const su = siluetaText(fontSem, 'L', 2.5, 'interioara');
  const mu = masa(su);
  su.delete();
  console.log(`     siluetaText interioară     X ${mu.dx.toFixed(2)}  Y ${mu.dy.toFixed(2)}`);
  check('siluetaText interioară: „L" are masa în stânga-jos', mu.dx < 0 && mu.dy < 0,
    `(${mu.dx.toFixed(2)}, ${mu.dy.toFixed(2)})`);

  const se = siluetaText(fontSem, 'L', 2.5, 'exterioara');
  const me = masa(se);
  se.delete();
  console.log(`     siluetaText exterioară     X ${me.dx.toFixed(2)}  Y ${me.dy.toFixed(2)}`);
  check('siluetaText exterioară: „L" are masa în dreapta-jos', me.dx > 0 && me.dy < 0,
    `(${me.dx.toFixed(2)}, ${me.dy.toFixed(2)})`);
  check('cele două fețe sunt oglinzi pe X, nu variante independente',
    Math.abs(me.dx + mu.dx) < 1e-6 && Math.abs(me.dy - mu.dy) < 1e-6,
    `interioară (${mu.dx.toFixed(2)}, ${mu.dy.toFixed(2)}) vs exterioară (${me.dx.toFixed(2)}, ${me.dy.toFixed(2)})`);

  /** 2. SEMNĂTURA, cap-coadă — silueta îi vine BRUTĂ, ca în aplicație; `matriceCadru` o întoarce */
  const siluetaBruta = (): any[] => {
    const b = textSolid(fontSem, 'L', 2.5, 1);
    const sil = b.project();
    b.delete();
    const p2 = sil.toPolygons();
    sil.delete();
    return p2;
  };
  const gol = buildHusa(cfgOgl({ marcaj: { stare: { fel: 'lipsa' } as any,
    siluetaSemnatura: () => [], azi: new Date(2026, 8, 6) } }), { w: 256, d: 256 });
  const cuL = buildHusa(cfgOgl({ marcaj: { stare: { fel: 'lipsa' } as any,
    siluetaSemnatura: siluetaBruta, azi: new Date(2026, 8, 6) } }), { w: 256, d: 256 });
  const difS = gol.corp.subtract(cuL.corp);
  const prS = difS.project();
  const mS = masa(prS);
  console.log(`     semnătura gravată          X ${mS.dx.toFixed(2)}  Y ${mS.dy.toFixed(2)}`);
  // zona de marcaj e pe fața exterioară, deci reperul e oglindit pe X: masa în DREAPTA-jos
  check('semnătura (fața exterioară): „L" are masa în dreapta-jos', mS.dx > 0 && mS.dy < 0,
    `(${mS.dx.toFixed(2)}, ${mS.dy.toFixed(2)})`);
  for (const x of [gol.corp, cuL.corp, difS, prS]) x.delete();

  /** 3. NUMELE DE PE SPATE, cap-coadă */
  const plin = buildHusa(cfgOgl(), { w: 256, d: 256 });
  const cuNume = buildHusa(cfgOgl({ spate: { stil: 'nume-gravat', text: 'L', font: fontSem,
    inaltimeText: 18, snur: 'fara',
    tipar: { model: 'fagure', pas: 8, grosimePerete: 2, unghi: 0, varianta: 1 } as any } }),
  { w: 256, d: 256 });
  const difN = plin.corp.subtract(cuNume.corp);
  const prN = difN.project();
  const mN = masa(prN);
  console.log(`     numele gravat pe spate     X ${mN.dx.toFixed(2)}  Y ${mN.dy.toFixed(2)}`);
  check('numele de pe spate (fața exterioară): „L" are masa în dreapta-jos', mN.dx > 0 && mN.dy < 0,
    `(${mN.dx.toFixed(2)}, ${mN.dy.toFixed(2)})`);
  for (const x of [plin.corp, cuNume.corp, difN, prN]) x.delete();

  /** 4. MICRO-MARCAJUL, cap-coadă — fața INTERIOARĂ, deci criteriul se întoarce pe X */
  const bazaM = buildHusa(cfgOgl({ marcaj: { stare: { fel: 'lipsa' } as any,
    siluetaSemnatura: () => [], azi: new Date(2026, 8, 6) } }), { w: 256, d: 256 });
  const cuMicro = microMarcajHusa(cfgOgl(), bazaM.corp, 'L');
  const difM = bazaM.corp.subtract(cuMicro);
  const prM = difM.project();
  const mM = masa(prM);
  console.log(`     micro-marcajul             X ${mM.dx.toFixed(2)}  Y ${mM.dy.toFixed(2)}`);
  check('micro-marcajul (fața interioară): „L" are masa în stânga-jos', mM.dx < 0 && mM.dy < 0,
    `(${mM.dx.toFixed(2)}, ${mM.dy.toFixed(2)})`);
  for (const x of [bazaM.corp, cuMicro, difM, prM]) x.delete();
}

console.log('');
/**
 * SEMNĂTURA CITIBILĂ (corectura HUS.2) — cele patru verificări cerute, pe piesă.
 *
 * În pozele de la slicer, marcajul se pierdea în textură și contururile interioare ale literelor
 * rămâneau pinteni izolați. Aici se măsoară că nu mai e cazul: mărimea, trăsătura, punțile, și
 * faptul că semnătura stă pe bandă PLINĂ, nu peste textură.
 */
console.log('');
console.log('── semnătura citibilă (corectura HUS.2) ──');
{
  // fontul GRAS, ca in produs: semnătura se măsoară pe ce iese, nu pe altceva
  const fontSemnatura = (() => {
    const b = readFileSync(join(ROOT, 'public', 'fonts', 'Inter-900.ttf'));
    return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
  })();
  const silueta = (): any[] => {
    const brut = textSolid(fontSemnatura, 'praktik3d.ro', 2.5, 1);
    const sil = brut.project();
    brut.delete();
    const inele = sil.toPolygons();
    sil.delete();
    return inele;
  };
  const t = tel('iphone-16');
  const g = 1.4;

  for (const marime of ['vizibila', 'discreta'] as const) {
    const cfg = config(t, { ceExporti: 'husa', marcaj: {
      stare: { fel: 'lipsa' } as any, siluetaSemnatura: silueta, marime,
      azi: new Date(2026, 8, 6) } });
    const r = buildHusa(cfg, { w: 256, d: 256 });
    const m = r.diagnostic.marcaj!;
    const prag = MARIMI[marime].trasaturaMin;
    console.log(`     ${marime.padEnd(9)} cutie ${m.cutie.latime} × ${m.cutie.inaltime} mm · `
      + `trăsătura ${m.trasaturaMinMM.toFixed(2)} mm (prag ${prag}) · ${m.puntiAdaugate} punți · `
      + `−${m.volumScosMM3.toFixed(1)} mm³`);

    /**
     * Cutia e cât încape, nu o cifră fixă: „vizibilă" crește până la trei sferturi din zona de
     * marcaj, ca adresa completă să aibă trăsături cât mai groase. Restul rămâne textură.
     */
    check(`${marime}: cutia e cât încape în zonă`,
      m.cutie.latime <= MARIMI[marime].latime + 1e-9 && m.cutie.latime > 0,
      `${m.cutie.latime.toFixed(2)} mm din maxim ${MARIMI[marime].latime}`);
    check(`  contururile interioare au primit punți`, m.puntiAdaugate >= 4, `${m.puntiAdaugate}`);
    /**
     * TRĂSĂTURA SUB PRAG DĂ AVERTISMENT, cum cere A.5 — nu blocaj și nu tăcere.
     *
     * DE RAPORTAT: pe fontul de atelier, „praktik3d.ro" la 17 mm lățime are trăsături de 0,25 mm.
     * Douăsprezece caractere pe 17 mm înseamnă ~1,4 mm de glifă; la un font de greutate normală
     * grosimea liniei iese de ordinul zecimilor. Ca să ajungă la 1,0 mm ar trebui un wordmark de
     * vreo patru ori mai lat — adică vreo 68 mm, care nu încap pe spate și n-ar mai fi semnătură.
     * Deci pragul din corectură nu e atins de forma actuală a wordmark-ului; se raportează.
     */
    check(`  trăsătura sub prag e raportată, nu tăcută`, m.subtire === (m.trasaturaMinMM < prag),
      `${m.trasaturaMinMM.toFixed(2)} faţă de ${prag} → subtire=${m.subtire}`);
    check(`  piesa rămâne o bucată`, r.diagnostic.bucati === 1);

    /**
     * SEMNĂTURA STĂ PE BANDĂ PLINĂ, nu peste textură.
     *
     * Gravura are 0,5 mm, textura 0,35. La 0,42 mm sub fața exterioară, textura s-a terminat, iar
     * semnătura nu: felia de acolo arată material peste tot, MAI PUȚIN literele. Dacă textura ar
     * trece pe sub semnătură, ar lipsi material și în afara literelor.
     */
    const z = -g + 0.42;
    const felie = r.corp.trimByPlane([0, 0, 1], z).trimByPlane([0, 0, -1], -(z + 0.06));
    const sect = felie.project();
    const rm = { x: 0, y: -(t.corp.lungime / 2 + 0.25) + 3 + 15 / 2 };
    const fereastra = new CrossSection([dreptunghiRotunjitTest(m.cutie.latime + 2.4, m.cutie.inaltime + 2.4, 0.5)],
      'Positive').translate([rm.x, rm.y]);
    const inFereastra = fereastra.subtract(sect);
    const banda = new CrossSection([dreptunghiRotunjitTest(30, 15, 0.5)], 'Positive').translate([rm.x, rm.y]);
    const inAfara = banda.subtract(fereastra).subtract(sect);
    const bA = inAfara.bounds();
    console.log(`               lipsă în fereastră ${inFereastra.area().toFixed(2)} mm² · `
      + `lipsă în jur ${inAfara.area().toFixed(2)} mm² la x[${bA.min[0].toFixed(1)}, ${bA.max[0].toFixed(1)}] `
      + `y[${bA.min[1].toFixed(1)}, ${bA.max[1].toFixed(1)}]`);
    // pragul se scalează cu mărimea: literele mici scot mai puțin material, e firesc
    check(`  literele sunt mai adânci decât textura`,
      inFereastra.area() > m.cutie.latime * m.cutie.inaltime * 0.02,
      `${inFereastra.area().toFixed(2)} mm² din cutia de ${(m.cutie.latime * m.cutie.inaltime).toFixed(0)} mm²`);
    check(`  textura nu trece pe sub semnătură`, inAfara.area() < 1.5,
      `${inAfara.area().toFixed(2)} mm² lipsă în jurul ferestrei`);
    for (const x of [felie, sect, fereastra, inFereastra, banda, inAfara]) x.delete();
    r.corp.delete();
  }

  /**
   * FĂRĂ PUNȚI, CONTURURILE INTERIOARE CHIAR RĂMÂN INSULE.
   *
   * Dovada că punțile nu sunt o precauție teoretică: se numără componentele feliei de la fundul
   * gravurii. Cu punți, pintenii sunt legați de restul; fără ele, fiecare e o insulă separată.
   */
  const cs = new CrossSection(silueta(), 'NonZero');
  const scalat = inCutieTest(cs, 17, 4.7);
  cs.delete();
  const fara = scalat.decompose ? 0 : 0;
  const cuPunti = puntiPeGoluriTest(scalat, 0.6);
  const goluriFara = (scalat.toPolygons() as any[]).filter((r: any) => {
    let a = 0;
    for (let i = 0; i < r.length; i++) { const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % r.length]; a += x1 * y2 - x2 * y1; }
    return a < 0;
  }).length;
  const goluriCu = (cuPunti.cs.toPolygons() as any[]).filter((r: any) => {
    let a = 0;
    for (let i = 0; i < r.length; i++) { const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % r.length]; a += x1 * y2 - x2 * y1; }
    return a < 0;
  }).length;
  console.log(`     goluri în siluetă: ${goluriFara} fără punți → ${goluriCu} cu punți (${cuPunti.punti} bare)`);
  check(`punțile chiar închid golurile`, goluriCu === 0 && cuPunti.punti === goluriFara,
    `${goluriFara} → ${goluriCu}`);
  if (cuPunti.cs !== scalat) cuPunti.cs.delete();
  scalat.delete();
  void fara;
}

console.log('');
/**
 * SPATELE (HUS.2.3, șablonul 5) — cele patru stiluri, pe piesa reală.
 *
 * B.13(3) cere ca un text decupat cu „O", „A", „B" să iasă UN SINGUR corp conex. Verificarea e
 * pe numărul de componente, nu pe o listă de litere periculoase: lista aia depinde de font.
 */
console.log('');
console.log('── spatele (HUS.2.3) ──');
{
  const TIPAR: any = { model: 'fagure', pas: 8, grosimePerete: 2, unghi: 0, varianta: 1 };
  for (const id of PILOTI) {
    const t = tel(id);
    const baza = buildHusa(config(t, { ceExporti: 'husa' }), { w: 256, d: 256 });
    const volPlin = baza.diagnostic.volumCM3;
    baza.corp.delete();

    for (const stil of ['tipar-gravat', 'perforat', 'nume-gravat', 'nume-decupat'] as const) {
      const cfg = config(t, { ceExporti: 'husa', spate: {
        stil, text: 'ABO', font: fontGravare, inaltimeText: 18, tipar: TIPAR, snur: 'fara' } });
      const r = buildHusa(cfg, { w: 256, d: 256 });
      const sp = r.diagnostic.spate!;
      const scos = (volPlin - r.diagnostic.volumCM3) * 1000;
      console.log(`     ${t.model.padEnd(28)} ${stil.padEnd(8)} −${scos.toFixed(0)} mm³`
        + ` · zonă decorabilă ${sp.aria.toFixed(0)} mm²`
        + (sp.panaLaCamera !== Infinity ? ` · text↔cameră ${sp.panaLaCamera.toFixed(2)} mm` : '')
        + (sp.puntiAdaugate ? ` · ${sp.puntiAdaugate} punți` : '')
        + (sp.fortatGravat ? ' · FORȚAT GRAVAT' : ''));
      check(`${t.model} · spate ${stil}: un singur corp, geometrie validă`,
        String(r.corp.status()) === 'NoError' && r.diagnostic.bucati === 1,
        `${r.diagnostic.bucati} bucăți`);
      check(`  chiar s-a scos material`, scos > 10, `${scos.toFixed(0)} mm³`);
      if (stil.startsWith('nume-')) {
        check(`  textul stă la ≥ ${3} mm de decupajul camerei`,
          sp.panaLaCamera >= 3 - 1e-6, `${sp.panaLaCamera.toFixed(2)} mm`);
      }
      if (stil === 'nume-decupat') {
        check(`  conturile interioare au primit punți`, sp.puntiAdaugate >= 3 || sp.fortatGravat,
          `${sp.puntiAdaugate} punți, forțat gravat: ${sp.fortatGravat}`);
      }
      jocCorect(config(t, { ceExporti: 'husa' }), r.corp, `  spate ${stil}`);
      r.corp.delete();
    }

    // orificiul de șnur: o gaură adevărată, nu o intenție
    const cuSnur = buildHusa(config(t, { ceExporti: 'husa', spate: {
      stil: 'plin', text: '', inaltimeText: 18, tipar: TIPAR, snur: 'stanga-jos' } }), { w: 256, d: 256 });
    const difSnur = (volPlin - cuSnur.diagnostic.volumCM3) * 1000;
    check(`${t.model}: orificiul de șnur scoate material`, difSnur > 5 && difSnur < 30,
      `${difSnur.toFixed(1)} mm³`);
    check(`  piesa rămâne o bucată`, cuSnur.diagnostic.bucati === 1);
    cuSnur.corp.delete();
  }
}

console.log('');
/**
 * B.13(5) — RECONSTRUCȚIA SUB 1,5 s.
 *
 * Cerința e despre ce simte omul când schimbă un parametru. Se măsoară pe cel mai scump lucru pe
 * care îl poate cere: husa completă cu spate perforat, plus manechinul, care se reface și el la
 * fiecare pas. Pragul e generos față de măsurătoare tocmai ca verificarea să nu devină un
 * detector de mașini încărcate.
 */
console.log('');
console.log('── reconstrucția (B.13.5) ──');
{
  const TIPAR: any = { model: 'fagure', pas: 8, grosimePerete: 2, unghi: 0, varianta: 1 };
  let maxim = 0, undeMax = '';
  for (const id of PILOTI) {
    const t = tel(id);
    const linie: string[] = [];
    for (const stil of ['plin', 'perforat', 'nume-decupat'] as const) {
      const cfg = config(t, { ceExporti: 'husa', spate: {
        stil, text: 'ANA', font: fontGravare, inaltimeText: 18, tipar: TIPAR, snur: 'fara' } });
      const t0 = performance.now();
      const r = buildHusa(cfg, { w: 256, d: 256 });
      const m = manechinTelefon(cfg);
      const ms = performance.now() - t0;
      if (ms > maxim) { maxim = ms; undeMax = `${t.model} · ${stil}`; }
      linie.push(`${stil} ${ms.toFixed(0)}`);
      r.corp.delete(); m.delete();
    }
    console.log(`     ${t.model.padEnd(28)} ${linie.join(' · ')} ms`);
  }
  check(`reconstrucția stă sub 1,5 s la cel mai scump caz`, maxim < 1500,
    `${undeMax} — ${maxim.toFixed(0)} ms`);
}

console.log('');
/**
 * ALINIEREA CAMEREI ȘI AȘEZAREA PE PLACĂ (addendum 2, HUS.2).
 *
 * Întrebarea din captură — „insula manechinului nu coincide cu decupajul husei" — se închide
 * aici, pe cote, nu pe ochi.
 */
console.log('');
console.log('── alinierea camerei + așezarea pe placă ──');
for (const id of PILOTI) {
  const t = tel(id);
  const cfg = config(t, { ceExporti: 'husa' });
  const i = t.insulaCamera;

  /**
   * FEREASTRA CUPRINDE INSULA — B.13(2), cu limita pe care regula marginii strânse o impune.
   *
   * Ce cade în afara CAVITĂȚII nu poate fi acoperit de decupaj: acolo nu mai e spate, e perete.
   * Deci cerința adevărată e „insula ∩ cavitate ⊆ decupaj", și ea se poate verifica.
   */
  const { regiune } = regiuneDecupajCamera(cfg);
  const insula = new CrossSection([dreptunghiRotunjitTest(i.latime, i.inaltime, i.razaColt)], 'Positive')
    .translate([i.x, i.y]);
  const contur = new CrossSection([conturTelefon(t)], 'Positive');
  const cavitate = contur.offset(cfg.joc, 'Round');
  contur.delete();
  const insulaUtila = insula.intersect(cavitate);
  const neacoperit = insulaUtila.subtract(regiune);
  const inAfaraCavitatii = insula.area() - insulaUtila.area();
  console.log(`     ${t.model.padEnd(28)} insulă ${insula.area().toFixed(0)} mm² · `
    + `în afara cavității ${inAfaraCavitatii.toFixed(1)} · neacoperit ${neacoperit.area().toFixed(3)} mm²`);
  check(`${t.model}: fereastra cuprinde insula (cât încape în cavitate)`,
    neacoperit.area() < 0.5, `${neacoperit.area().toFixed(3)} mm² neacoperiți`);

  /**
   * MANECHINUL ȘI FEREASTRA SUNT PE ACELEAȘI COTE.
   *
   * Manechinul așază insula la `insulaCamera.x/y` din JSON, iar fereastra se construiește din
   * aceleași cote. Se verifică pe SOLID, nu pe intenție: insula manechinului, tăiată la Z < 0,
   * trebuie să treacă prin fereastră fără să atingă husa mai mult decât relieful butoanelor.
   */
  const m = manechinTelefon(cfg);
  const insulaSolid = m.trimByPlane([0, 0, -1], 0.05);
  const r = buildHusa(cfg, { w: 256, d: 256 });
  const lovire = r.corp.intersect(insulaSolid);
  /**
   * UNDE se ating, nu doar CÂT. Cerința adevărată e ca nimic să nu se lovească acolo unde husa
   * PUTEA să deschidă — adică în interiorul cavității. Ce cade în afara ei nu e vina husei.
   *
   * DE RAPORTAT, nu reparat: la iPhone 15 și 15 Pro, dreptunghiul `insulaCamera` din JSON iese
   * din conturul propriu al telefonului, la colțul de sus-stânga. Insula are raza de colț 9 mm,
   * telefonul 17,4 — iar arcul insulei taie pe dinafară arcul corpului. O insulă de cameră nu
   * poate ieși din telefon, deci ori raza insulei e transcrisă mai mică decât e, ori
   * dreptunghiul e keepout-ul din desen, care are voie să treacă peste contur. Cotele nu se
   * ating de mine; se măsoară și se raportează.
   */
  const proiectie = lovire.volume() > 1e-9 ? lovire.project() : null;
  const inCavitate = proiectie ? proiectie.intersect(cavitate) : null;
  const ariaInterioara = inCavitate ? inCavitate.area() : 0;
  const inAfara = proiectie ? proiectie.area() - ariaInterioara : 0;
  console.log(`       lovire ${lovire.volume().toFixed(2)} mm³ · în cavitate ${ariaInterioara.toFixed(3)} mm² · `
    + `în afara conturului ${inAfara.toFixed(2)} mm²`);
  check(`  insula manechinului nu se lovește de husă ÎN cavitate`, ariaInterioara < 0.5,
    `${ariaInterioara.toFixed(3)} mm² înăuntru`);
  proiectie?.delete(); inCavitate?.delete();

  /**
   * AȘEZAREA PE PLACĂ — MĂSURATĂ ÎN SPAȚIUL SCENEI, nu al modelului.
   *
   * `manifoldToGeometry` NEAGĂ Y la conversie (convenția Y-jos moștenită din motorul de text).
   * Deci verticala scenei e −Y din model: punctul cel mai de jos pe ecran e cel cu Y-ul cel mai
   * MARE aici, iar „stă pe placă" înseamnă `max Y == 0`, nu `min Y == 0`.
   *
   * Prima variantă a acestei verificări măsura `min` — adică repeta exact greșeala din aplicație
   * în loc s-o prindă, și trecea verde în timp ce piesa atârna sub placă în toate cele trei
   * orientări. Un test scris în același sistem de coordonate greșit ca produsul nu verifică
   * nimic; de-aia se măsoară acum acolo unde se vede, în scenă.
   */
  const sceneY = (bb: any) => ({ jos: -bb.max[1], sus: -bb.min[1] });
  for (const ceExporti of ['husa', 'rama'] as const) {
    const piesa = ceExporti === 'husa' ? r : buildHusa(config(t, { ceExporti }), { w: 256, d: 256 });
    for (const [nume, rot] of [['pe spate', [90, 0, 0]], ['pe față', [-90, 0, 0]],
      ['în picioare', [0, 0, 0]]] as [string, [number, number, number]][]) {
      const h = piesa.corp.rotate(rot);
      // aceeași aritmetică pe care o face `rebuild()`: coboară cu `−max`, o dată, pentru tot
      const sus = h.boundingBox().max[1];
      const asezat = h.translate([0, -sus, 0]);
      const mm = m.rotate(rot).translate([0, -sus, 0]);
      const sh = sceneY(asezat.boundingBox()), sm = sceneY(mm.boundingBox());
      check(`  ${ceExporti} · ${nume}: piesa stă exact pe placă`, Math.abs(sh.jos) < 1e-9,
        `jos în scenă ${sh.jos.toFixed(6)}`);
      check(`    nimic nu trece sub placă`, sh.jos >= -1e-9 && sh.sus > 0,
        `[${sh.jos.toFixed(3)}, ${sh.sus.toFixed(3)}]`);
      if (ceExporti === 'husa') {
        check(`    manechinul urmează husa, nu cade separat`, sm.jos >= sh.jos - 1e-6,
          `manechin ${sm.jos.toFixed(2)} faţă de husă ${sh.jos.toFixed(2)}`);
      }
      h.delete(); asezat.delete(); mm.delete();
    }
    if (ceExporti !== 'husa') piesa.corp.delete();
  }

  for (const x of [regiune, insula, cavitate, insulaUtila, neacoperit, m, insulaSolid, lovire, r.corp]) x.delete();
}

console.log('');
/**
 * SPATELE PERFORAT (addendum HUS.2) — cele patru verificări cerute, toate pe piesa construită.
 */
console.log('');
console.log('── spate perforat (addendum HUS.2) ──');
{
  const TIPAR: any = { model: 'fagure', pas: 8, grosimePerete: 2, unghi: 0, varianta: 1 };
  const spateCu = (stil: any) => ({ stil, text: '', inaltimeText: 18, tipar: TIPAR, snur: 'fara' as const });
  for (const id of PILOTI) {
    const t = tel(id);
    const g = 1.4;
    const plin = buildHusa(config(t, { ceExporti: 'husa', spate: spateCu('plin') }), { w: 256, d: 256 });
    const grav = buildHusa(config(t, { ceExporti: 'husa', spate: spateCu('tipar-gravat') }), { w: 256, d: 256 });
    const perf = buildHusa(config(t, { ceExporti: 'husa', spate: spateCu('perforat') }), { w: 256, d: 256 });
    const sp = perf.diagnostic.spate!;
    console.log(`     ${t.model.padEnd(28)} perforat: ${sp.gauri} găuri, ${sp.gauriOmise} omise în inelul de încărcare`
      + ` · punți sub prag ${sp.ariaSubPrag.toFixed(1)} mm²`);

    /**
     * PERFORATUL STRĂPUNGE, GRAVATUL NU. `genus` numără tunelele: o gravură nu adaugă niciunul,
     * o gaură adaugă exact unul. Fără cifra asta, „perforat" și „gravat" arată la fel în volum
     * și în bounding box, iar diferența s-ar vedea abia la print.
     */
    const gPlin = plin.corp.genus(), gGrav = grav.corp.genus(), gPerf = perf.corp.genus();
    check(`${t.model}: gravatul NU străpunge`, gGrav === gPlin, `genus ${gGrav} faţă de ${gPlin}`);
    /**
     * Tunelurile pot fi CU CÂTEVA MAI PUȚINE decât găurile raportate, și e corect așa: o gaură de
     * tipar care cade peste o deschidere existentă — gaura blițului, cea de microfon — se
     * contopește cu ea într-un singur tunel. Deci se cere „aproape toate", nu „exact toate", și
     * niciodată mai multe decât găuri.
     */
    check(`  perforatul chiar străpunge`,
      gPerf - gPlin > 50 && gPerf - gPlin <= sp.gauri && gPerf - gPlin >= sp.gauri * 0.9,
      `${gPerf - gPlin} tuneluri noi din ${sp.gauri} găuri raportate`);
    check(`  perforatul scoate mai mult material decât gravatul`,
      perf.diagnostic.volumCM3 < grav.diagnostic.volumCM3,
      `${perf.diagnostic.volumCM3.toFixed(3)} vs ${grav.diagnostic.volumCM3.toFixed(3)} cm³`);

    /**
     * ZERO GĂURI ÎN INELUL DE ÎNCĂRCARE. Se sondează o rețea de puncte în cerc: peste tot
     * trebuie găsită grosimea întreagă a spatelui.
     */
    const zi = (t as any).corp.zonaIncarcare;
    let subtiri = 0, sonde = 0, deLaCamera = 0;
    if (zi) {
      const raza = zi.diametru / 2;
      const plinLaPunct = (x: number, y: number, piesa: any) => {
        const bara = Manifold.cube([0.15, 0.15, g + 2], true).translate([x, y, -g / 2]);
        const m = piesa.intersect(bara);
        const v = m.volume();
        bara.delete(); m.delete();
        return v >= 0.15 * 0.15 * g * 0.98;
      };
      for (let a = 0; a < 360; a += 15) {
        for (const rr of [0.2, 0.5, 0.8, 0.97]) {
          const x = zi.x + raza * rr * Math.cos(a * Math.PI / 180);
          const y = zi.y + raza * rr * Math.sin(a * Math.PI / 180);
          sonde++;
          if (plinLaPunct(x, y, perf.corp)) continue;
          /**
           * Se compară cu husa cu SPATE PLIN, nu cu o așteptare.
           *
           * Pe iPhone 15 Pro inelul de încărcare urcă până la y = 27,07, iar decupajul camerei
           * coboară până la 25,77 — se suprapun cu 1,30 mm. Acolo spatele lipsește oricum, din
           * cotele telefonului, nu din perforare. Regula addendumului e despre GĂURI DE TIPAR;
           * o verificare care nu face distincția ar cere reparat ceva ce nu se poate repara.
           */
          if (plinLaPunct(x, y, plin.corp)) subtiri++; else deLaCamera++;
        }
      }
    }
    check(`  nicio gaură de tipar în inelul de încărcare (${sonde} sonde)`, subtiri === 0,
      `${subtiri} de la perforare` + (deLaCamera ? `, ${deLaCamera} de la decupajul camerei` : ''));
    check(`  raportul spune că zona a fost ocolită`, sp.magsafe === true, `${sp.magsafe}`);

    /**
     * MAGSAFE OPRIT: PERFORAREA MERGE UNIFORM, INCLUSIV PESTE CERC.
     *
     * Comutatorul are voie să existe numai dacă schimbă ceva măsurabil. Se sondează ACEEAȘI
     * rețea de puncte: cu MagSafe pornit trebuie să fie plin peste tot, cu el oprit trebuie să
     * apară găuri. O verificare care doar citește parametrul înapoi n-ar dovedi nimic — ar trece
     * la fel de bine și dacă geometria l-ar ignora complet.
     *
     * Se cere ȘI ca `gauriOmise` să scadă la zero: nu doar că apar găuri, ci că nu se mai omite
     * niciuna, adică regula chiar s-a stins, nu s-a mutat.
     */
    const perfFara = buildHusa(config(t, { ceExporti: 'husa',
      spate: { ...spateCu('perforat'), magsafe: false } }), { w: 256, d: 256 });
    const spFara = perfFara.diagnostic.spate!;
    let gauriInCerc = 0;
    if (zi) {
      const raza = zi.diametru / 2;
      const plinLaPunct = (x: number, y: number, piesa: any) => {
        const bara = Manifold.cube([0.15, 0.15, g + 2], true).translate([x, y, -g / 2]);
        const m = piesa.intersect(bara);
        const v = m.volume();
        bara.delete(); m.delete();
        return v >= 0.15 * 0.15 * g * 0.98;
      };
      for (let a = 0; a < 360; a += 15) {
        for (const rr of [0.2, 0.5, 0.8, 0.97]) {
          const x = zi.x + raza * rr * Math.cos(a * Math.PI / 180);
          const y = zi.y + raza * rr * Math.sin(a * Math.PI / 180);
          if (!plinLaPunct(x, y, perfFara.corp) && plinLaPunct(x, y, plin.corp)) gauriInCerc++;
        }
      }
    }
    console.log(`     ${''.padEnd(28)} fără MagSafe: ${spFara.gauri} găuri, ${spFara.gauriOmise} omise`
      + ` · ${gauriInCerc} sonde găsesc gaură în cerc (din ${sonde})`);
    check(`  fără MagSafe, perforarea intră în inelul de încărcare`, gauriInCerc > 0,
      `${gauriInCerc} sonde din ${sonde}`);
    check(`  fără MagSafe, nicio gaură nu se mai omite`, spFara.gauriOmise === 0,
      `${spFara.gauriOmise} omise`);
    check(`  raportul spune că zona NU a fost ocolită`, spFara.magsafe === false, `${spFara.magsafe}`);

    /**
     * SI VERIFICAREA DE GROSIME MAGNETICA SE STINGE. Cu spatele perforat intentionat peste cerc
     * nu mai exista cuplaj de protejat; un avertisment acolo ar fi despre o insusire la care omul
     * tocmai a renuntat, iar avertismentele false sunt felul in care oamenii invata sa le ignore
     * pe cele adevarate.
     */
    check(`  fără MagSafe, verificarea de grosime magnetică e inactivă`,
      perfFara.diagnostic.incarcare === null && perf.diagnostic.incarcare !== null,
      `fără ${perfFara.diagnostic.incarcare === null ? 'null' : 'activă'},`
      + ` cu ${perf.diagnostic.incarcare === null ? 'null' : 'activă'}`);

    /**
     * PUNTEA RAMANE PESTE PRAG SI ASA — MASURATA PE FELIE, nu citita din raport.
     *
     * Prima incercare cerea `ariaSubPrag < 5`, un prag pe care mi-l alesesem singur. Era gresit:
     * varianta CU MagSafe raporteaza deja 25,2 mm² sub prag, iar cea fara raporteaza 23,4 — mai
     * putin. `ariaSubPrag` spune cat material a fost sub prag INAINTE de deschiderea morfologica
     * si a fost curatat, nu cat a ramas; nu e o masura a puntii finale.
     *
     * Ce cere addendumul e altceva: puntea RAMASA sa fie peste `PERETE_MIN`. Se masoara direct,
     * pe o felie prin spate, cu deschiderea morfologica din nucleu. Perforarea uniforma iese
     * firesc mai stransa decat cea care ocoleste cercul — mai multe gauri pe aceeasi suprafata —
     * deci verificarea are si sens, nu e o formalitate.
     */
    const feliaSpate = (piesa: any) => {
      const cutit = Manifold.cube([500, 500, 0.2], true).translate([0, 0, -g / 2]);
      const f = piesa.intersect(cutit);
      const pr = f.project();
      cutit.delete(); f.delete();
      return pr;
    };
    const fCu = feliaSpate(perf.corp), fFara = feliaSpate(perfFara.corp);
    const trCu = trasaturaMinimaTest(fCu, 1.6, 0.05);
    const trFara = trasaturaMinimaTest(fFara, 1.6, 0.05);
    console.log(`     ${''.padEnd(28)} trăsătura minimă pe felia spatelui:`
      + ` cu MagSafe ${trCu.toFixed(2)} mm, fără ${trFara.toFixed(2)} mm`);
    check(`  punțile rămân peste ${PERETE_MIN} mm în ambele cazuri`,
      trCu >= PERETE_MIN - 1e-9 && trFara >= PERETE_MIN - 1e-9,
      `cu ${trCu.toFixed(2)}, fără ${trFara.toFixed(2)}`);
    for (const x of [fCu, fFara, perfFara.corp]) x.delete();

    /**
     * REGIUNEA DE MARCAJ RĂMÂNE PLINĂ — logo-ul se gravează pe material, nu peste găuri.
     * Se sondează centrul zonei de marcaj pe piesa perforată FĂRĂ marcaj aplicat.
     */
    const rm = { x: 0, y: -(t.corp.lungime / 2 + 0.25) + 3 + 15 / 2 };
    let goale = 0;
    for (const dx of [-12, -6, 0, 6, 12]) {
      for (const dy of [-5, 0, 5]) {
        const bara = Manifold.cube([0.15, 0.15, g + 2], true).translate([rm.x + dx, rm.y + dy, -g / 2]);
        const m = perf.corp.intersect(bara);
        const v = m.volume();
        bara.delete(); m.delete();
        if (v < 0.15 * 0.15 * g * 0.98) goale++;
      }
    }
    check(`  zona de marcaj a rămas plină (15 sonde)`, goale === 0, `${goale} sonde goale`);

    /**
     * PUNTEA ≥ 1,2 mm, MĂSURATĂ PE PIESĂ, nu pe regiunea 2D din care s-a tăiat.
     *
     * Se ia felia plăcii spatelui, se strânge cu jumătate de punte și se lasă înapoi. Dacă
     * secțiunea n-are nicio trăsătură sub prag, deschiderea o lasă aproape neatinsă; ce se pierde
     * e doar rotunjirea colțurilor.
     */
    const felie = perf.corp.trimByPlane([0, 0, 1], -g + 0.2).trimByPlane([0, 0, -1], -(-g + 0.4));
    const sect = felie.project();
    const strans = sect.offset(-PERETE_MIN / 2 + 0.02, 'Round');
    const deschis = strans.offset(PERETE_MIN / 2 - 0.02, 'Round');
    const pierdut = sect.area() - deschis.area();
    const procent = 100 * pierdut / sect.area();
    check(`  nicio punte sub ${PERETE_MIN} mm în placa spatelui`, procent < 3,
      `deschiderea pierde ${pierdut.toFixed(1)} mm² din ${sect.area().toFixed(0)} (${procent.toFixed(2)}%)`);
    for (const x of [felie, sect, strans, deschis]) x.delete();

    jocCorect(config(t, { ceExporti: 'husa' }), perf.corp, `  perforat`);
    plin.corp.delete(); grav.corp.delete(); perf.corp.delete();
  }
}

console.log('');
/**
 * MARCAJUL PE HUSĂ (HUS.2.4) — testele A.7(2)–(4), rulate pe produsul adevărat.
 *
 * SEM.1 le-a probat pe un cilindru de probă. Aici întrebarea e alta: se comportă la fel pe o
 * piesă cu pereți de 1,4 mm, decupaje și buză? Un marcaj care merge pe un cilindru plin poate
 * găuri un spate subțire, iar asta nu se vede decât pe geometria reală.
 */
console.log('');
console.log('── marcajul pe husă (HUS.2.4, A.7) ──');
{
  const silueta = (): any[] => {
    const brut = textSolid(fontGravare, 'praktik3d.ro', 2.5, 1);
    const sil = brut.project();
    brut.delete();
    const b = sil.bounds();
    const k = 9 / (b.max[0] - b.min[0]);
    const centrat = sil.scale([k, k]).translate([-(b.min[0] + b.max[0]) / 2 * k, -(b.min[1] + b.max[1]) / 2 * k]);
    const inele = centrat.toPolygons();
    sil.delete(); centrat.delete();
    return inele;
  };
  const licBaza = { id: '0007', nume: 'Atelier Proba SRL', expira: '2027-01-01', plan: '1an' as const };
  const STARI: Record<string, any> = {
    gratuit: { fel: 'invalid', motiv: 'cod nerecunoscut' },
    expirat: { fel: 'expirat', licenta: { ...licBaza, comercial: true } },
    suporter: { fel: 'valida', plan: 'suporter', serie: 1 },
    comercial: { fel: 'valida', licenta: { ...licBaza, comercial: true } },
  };
  const cu = (t: Telefon, stare: any, extra: any = {}) => buildHusa(
    config(t, { ceExporti: 'husa', marcaj: { stare, siluetaSemnatura: silueta,
      azi: new Date(2026, 8, 6), ...extra } }), { w: 256, d: 256 });

  for (const id of PILOTI) {
    const t = tel(id);
    const gol = buildHusa(config(t, { ceExporti: 'husa' }), { w: 256, d: 256 });
    const volNemarcat = gol.diagnostic.volumCM3 * 1000;
    const genusNemarcat = gol.corp.genus();
    gol.corp.delete();

    const g = cu(t, STARI.gratuit);
    console.log(`     ${t.model.padEnd(28)} gratuit: ${g.diagnostic.marcaj!.mod}, `
      + `−${g.diagnostic.marcaj!.volumScosMM3.toFixed(1)} mm³, micro „${g.diagnostic.marcaj!.microText}"`);
    check(`${t.model}: gratuit → semnătură, un singur corp`,
      g.diagnostic.marcaj!.mod === 'semnatura' && g.diagnostic.bucati === 1
      && String(g.corp.status()) === 'NoError', `${g.diagnostic.bucati} bucăți`);
    check(`  s-a scos material din corp`, g.diagnostic.marcaj!.volumScosMM3 > 5,
      `${g.diagnostic.marcaj!.volumScosMM3.toFixed(1)} mm³`);
    check(`  textura e aplicată`, g.diagnostic.marcaj!.texturaAplicata);
    /**
     * SPATELE NU S-A GĂURIT. Marcajul intră 0,5 mm și textura 0,35 într-un spate de 1,4 — dacă
     * ar fi trecut prin el, piesa ar fi avut o gaură, nu o gravură. `genus` numără tunelele.
     */
    /**
     * SPATELE NU S-A GĂURIT. Marcajul intră 0,5 mm și textura 0,35 într-un spate de 1,4. Dacă ar
     * fi trecut prin el, piesa ar fi căpătat tuneluri noi — `genus` le numără. Se compară cu
     * piesa nemarcată, nu cu o cifră fixă: husa are deja tuneluri de la ferestre.
     */
    check(`  spatele n-a fost găurit`, g.corp.genus() === genusNemarcat,
      `genus ${g.corp.genus()} faţă de ${genusNemarcat} nemarcat`);
    jocCorect(config(t, { ceExporti: 'husa' }), g.corp, `  marcat gratuit`);

    const c = cu(t, STARI.comercial, { textura: { activa: false } });
    check(`  comercial + fără marcaj = doar micro-marcajul`,
      c.diagnostic.marcaj!.mod === 'fara' && c.diagnostic.marcaj!.volumScosMM3 === 0,
      `mod ${c.diagnostic.marcaj!.mod}, −${c.diagnostic.marcaj!.volumScosMM3} mm³`);
    check(`  volumul licențiat > volumul gratuit`,
      c.diagnostic.volumCM3 > g.diagnostic.volumCM3,
      `${c.diagnostic.volumCM3.toFixed(3)} vs ${g.diagnostic.volumCM3.toFixed(3)} cm³`);

    /**
     * A.7(4): token expirat sau de suporter → EXPORT IDENTIC CU CEL GRATUIT.
     *
     * De la restrângerea A.3 (HUS.2), numărul licenței se gravează doar unde există drept
     * comercial. Un token de suporter e valid, dar fără drept, deci primește amprenta generică —
     * exact ca exportul gratuit. Acum „identic" e adevărat la milimetru cub, nu doar la
     * semnătură, iar verificarea o poate cere ca atare.
     */
    for (const [nume, stare] of [['expirat', STARI.expirat], ['suporter', STARI.suporter]] as [string, any][]) {
      const x = cu(t, stare);
      const m = x.diagnostic.marcaj!;
      check(`  ${nume} → identic cu gratuit`,
        m.mod === 'semnatura'
        && m.microText === g.diagnostic.marcaj!.microText
        && Math.abs(x.diagnostic.volumCM3 - g.diagnostic.volumCM3) < 1e-9,
        `micro „${m.microText}", ${x.diagnostic.volumCM3.toFixed(6)} vs ${g.diagnostic.volumCM3.toFixed(6)} cm³`);
      x.corp.delete();
    }
    console.log(`     ${''.padEnd(28)} nemarcat ${volNemarcat.toFixed(0)} → gratuit `
      + `${(g.diagnostic.volumCM3 * 1000).toFixed(0)} → licențiat ${(c.diagnostic.volumCM3 * 1000).toFixed(0)} mm³`);
    g.corp.delete(); c.corp.delete();
  }
}

console.log('');
/**
 * RAMA DE PROBĂ — breșa camerei și eticheta gravată.
 *
 * Rama n-are spate, deci decupajul camerei nu poate exista în ea (se scade sub Z = 0, adică sub
 * tot ce rămâne din ramă). Ce există e o BREȘĂ în inel, pe latura camerei.
 */
console.log('');
console.log('── rama de probă: breșă + gravare ──');
for (const id of PILOTI) {
  const t = tel(id);
  const cfg = config(t, { ceExporti: 'rama' });
  const r = buildHusa(cfg, { w: 256, d: 256 });
  const d = r.diagnostic;
  const b = d.bresa;
  console.log(`     ${t.model.padEnd(28)} gravat „${d.gravare}" · breșă ${b ? b.lungime.toFixed(2) : '—'} mm`
    + (b ? ` pe latura ${b.latura}, tăiat la colț ${b.taiatLaColt.toFixed(2)} mm` : ''));
  check(`${t.model}: rama rămâne o bucată după breșă și gravare`,
    String(r.corp.status()) === 'NoError' && d.bucati === 1, `${d.bucati}`);
  check(`  eticheta scrie modelul și jocul`,
    d.gravare === `${etichetaScurta(t.id)} · 0,25`, `${d.gravare}`);
  check(`  breșa stă pe latura camerei`, b !== null && b.latura === laturaCamerei(t), `${b?.latura}`);
  /**
   * BREȘA E O GAURĂ ADEVĂRATĂ ÎN BUZĂ — ȘI NUMAI ÎN EA.
   *
   * Se măsoară cu aceeași bară prin perete folosită la ferestre, dar la DOUĂ înălțimi, fiindcă
   * cele două zone ale ramei au cerințe opuse în dreptul breșei: buza trebuie să lipsească
   * acolo, peretele lateral trebuie să fie întreg.
   *
   * Verificarea a fost o singură bară, la mijlocul benzii — adică în perete. Trecea verde
   * tocmai fiindcă breșa cobora și acolo, unde n-avea ce căuta: inelul ieșea deschis complet pe
   * latura camerei și rama devenea un „C" care se desface la colțurile de sus. O măsurătoare
   * într-un singur punct nu poate distinge „fereastră de inspecție" de „retenție tăiată"; două,
   * cu așteptări contrare, pot.
   */
  if (b) {
    const yBara = (b.latura === 'sus' ? 1 : -1) * (t.corp.lungime / 2 + cfg.joc + cfg.grosimePerete / 2);
    const prinInel = (z: number): number => {
      const bara = Manifold.cube([0.2, cfg.grosimePerete + 4, 0.2], true).translate([b.centru, yBara, z]);
      const m = r.corp.intersect(bara);
      const v = m.volume();
      bara.delete(); m.delete();
      return v;
    };
    const vBuza = prinInel(fataZ(t) + cfg.buzaEcran / 2);
    const vPerete = prinInel(fataZ(t) - (INALTIME_RAMA - cfg.buzaEcran) / 2);
    check(`  buza e deschisă în dreptul breșei`, vBuza < 1e-9, `${vBuza.toFixed(4)} mm³`);
    check(`  peretele lateral rămâne întreg sub breșă`, vPerete > 1e-3, `${vPerete.toFixed(4)} mm³`);
  }
  /**
   * GRAVAREA SCOATE MATERIAL. O ramă „gravată" cu volum neschimbat e o ramă pe care textul a
   * căzut alături de piesă — se vede doar dacă se măsoară.
   */
  const faraText = buildHusa(config(t, { ceExporti: 'rama', fontGravare: null }), { w: 256, d: 256 });
  const dif = faraText.diagnostic.volumCM3 - d.volumCM3;
  check(`  gravarea a scos material`, dif > 1e-4 && dif < 0.02,
    `${(dif * 1000).toFixed(1)} mm³`);
  check(`  fără font, rama iese oricum`, faraText.diagnostic.gravare === null
    && faraText.diagnostic.bucati === 1);
  faraText.corp.delete(); r.corp.delete();
}

console.log('');
/**
 * MANECHINUL — un corp, niciodată exportat, care chiar cuprinde telefonul.
 */
console.log('');
console.log('── manechin ──');
for (const id of PILOTI) {
  const t = tel(id);
  const cfg = config(t);
  const m = manechinTelefon(cfg);
  const bb = m.boundingBox();
  check(`${t.model}: manechinul e o bucată`,
    String(m.status()) === 'NoError' && m.decompose().length === 1, `${m.decompose().length}`);
  // corpul folosește CAVITATEA (contur + joc), nu conturul nominal — vezi B.10
  check(`  lățimea = telefon + 2 × joc`,
    Math.abs((bb.max[0] - bb.min[0]) - (t.corp.latime + 2 * cfg.joc + 2 * 0.5)) < 1e-6
    || Math.abs((bb.max[0] - bb.min[0]) - (t.corp.latime + 2 * cfg.joc)) < 1e-6,
    `${(bb.max[0] - bb.min[0]).toFixed(2)} mm`);
  check(`  insula camerei iese din spate`, bb.min[2] < -1e-6, `z min ${bb.min[2].toFixed(2)} mm`);
  /**
   * MANECHINUL ÎNCAPE ÎN HUSĂ.
   *
   * Fără butoane și fără insulă, corpul lui e exact cavitatea: se atinge de husă pe toată
   * suprafața, dar nu intră în ea. Se măsoară cât din manechin cade în materialul husei —
   * butoanele ies 0,5 mm în ferestre, deci puțin, dar nu zero.
   */
  const husa = buildHusa(cfg, { w: 256, d: 256 });
  const comun = husa.corp.intersect(m);
  const vol = comun.volume();
  check(`  manechinul nu intră în husă mai mult decât relieful butoanelor`,
    vol < 200, `${vol.toFixed(1)} mm³`);
  comun.delete(); husa.corp.delete(); m.delete();
}

console.log(`${esecuri ? `${esecuri} ESECURI` : 'toate verificarile au trecut'}`);
/**
 * `process.exitCode`, NU `process.exit`.
 *
 * Bisectat: dupa o UNIRE manifold (`add`), `process.exit` taie procesul cat timp WASM-ul inca se
 * inchide, iar libuv crapa pe Windows cu „Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)"
 * si cod 127 — adica suita raporta ESEC desi toate verificarile trecusera. Acelasi cod cu
 * `exitCode` iese 0. Verificat izolat: `add` + `exit` = 127, `add` + `exitCode` = 0, `add` singur
 * = 0, `decompose` singur cu `exit` = 0.
 */
process.exitCode = esecuri ? 1 : 0;
