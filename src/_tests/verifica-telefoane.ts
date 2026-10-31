/**
 * VERIFICAREA DATELOR DE TELEFOANE (HUS.1, B.5). Rulează în CI.
 *
 * DISTINCȚIA CARE CONTEAZĂ: o cotă LIPSĂ (`null`) e „incomplet", nu „greșit". Modelele se
 * completează pe rând, din ghidul Apple, iar un CI care se face roșu la fiecare model necompletat
 * ar fi zgomot din prima zi. Erori sunt doar cotele care se CONTRAZIC între ele — insula care nu
 * încape în corp, lentila care iese din insulă, două butoane peste același loc.
 *
 * Ieșire cu cod 1 DOAR la erori de consistență. Modelele incomplete se raportează și se numără.
 *
 * Rulare:  npm run verifica:telefoane
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { coteLipsa } from '../core/telefoane/complet.js';


/**
 * IESIRILE FOLOSESC `process.exitCode` + `return`, NU `process.exit` — vezi regula din
 * docs/design/. Corpul e invelit in `main()` ca `return` sa poata opri executia acolo unde
 * `process.exit` o oprea; aici conteaza mai ales la `--scrie`, care trebuie sa se opreasca
 * dupa ce a scris referintele, nu sa mearga mai departe si sa le compare cu ele insele.
 */
async function main() {
  const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const DIR = join(ROOT, 'date', 'telefoane', 'apple');
  const DIR_TEST = join(ROOT, 'date', 'telefoane', '_test');

  type Nr = number | null;

  /**
   * Conul de keepout al unei camere: unghiul in care nu intra nimic, si de unde se masoara.
   *
   * `referinta` e un JETON INCHIS, nu proza: din el iese direct de la ce suprafata se socoteste
   * distanta, iar sablonul trebuie sa poata decide fara sa citeasca text. Prima versiune accepta
   * orice sir, si ajunsesera trei formulari diferite pentru aceeasi suprafata.
   */
  const REFERINTE_CON = ['sticla-fata', 'sticla-spate'];
  interface Con { unghi: Nr; distanta: Nr; referinta: string | null }

  /**
   * Zona din jurul unui buton care trebuie sa ramana libera — NU e dreptunghiul butonului.
   * `subtire` e varianta pentru huse subtiri, masurata la `laDistanta` de suprafata; e mai LARGA
   * decat cea tipica, fiindca o husa subtire lasa mai putin loc de deget pe lateral.
   */
  interface Keepout {
    latime: Nr; inaltime: Nr; razaColt?: Nr; unghiDegajare?: Nr;
    subtire?: { latime: Nr; inaltime: Nr; laDistanta: Nr; unghiDegajare?: Nr } | null;
  }
  interface Telefon {
    id: string; model: string; fictiv?: boolean;
    corp: { lungime: Nr; latime: Nr; grosime: Nr; razaColt: Nr; profilMargine: string | null;
      razaMuchie: Nr;
      /** cat accepta Apple pe spate (mm); depasirea e AVERTISMENT in aplicatie, nu blocare */
      grosimeMaxHusaSpate?: Nr;
      /** inelul de incarcare magnetica: doar in cercul asta conteaza grosimea de mai sus */
      zonaIncarcare?: { x: Nr; y: Nr; diametru: Nr } | null };
    ecran: { proeminentaFataDeCorp: Nr };
    insulaCamera: {
      forma: string | null; x: Nr; y: Nr; latime: Nr; inaltime: Nr; razaColt: Nr; proeminenta: Nr;
      lentile: { x: Nr; y: Nr; diametru: Nr; proeminentaSuplimentara: Nr; con?: Con | null }[];
      blit: { x: Nr; y: Nr; diametru: Nr; con?: Con | null };
    };
    butoane: { tip: string; latura: string; y: Nr; lungime: Nr; latime: Nr; acoperibil: boolean;
      keepout?: Keepout | null }[];
    port: { latura: string; x: Nr; latime: Nr; inaltime: Nr; tip: string | null };
    decupajeJos: { tip: string; x: Nr; latime: Nr }[];
    decupajeSus: { tip: string; x: Nr; latime: Nr }[];
    keepOut: { nume: string; x: Nr; y: Nr; latime: Nr; inaltime: Nr; motiv: string }[];
    /**
     * `fisier` si `foaie` au aparut cand s-au completat primii piloti: cotele NU vin din
     * „Accessory Design Guidelines" (ghidul nu mai contine desene), ci din desenele cotate per
     * dispozitiv, PDF separat. Un numar de pagina fara numele fisierului n-ar duce inapoi la sursa.
     */
    sursa: { document: string; fisier?: string; versiune: string; pagina: number; foaie?: string };
    verificat: boolean; verificatLa: string | null; note: string;
  }

  /** marginea minimă dintre insula camerei și orice muchie a corpului (mm) — B.5 */
  const MARGINE_INSULA = 1;

  const FORME = ['patrat', 'pilula-verticala', 'bara-lata', 'lentila-simpla'];
  const PROFILE = ['plat', 'curbat'];
  const TIPURI_PORT = ['usb-c', 'lightning'];
  const TIPURI_BUTON = ['pornire', 'volum+', 'volum-', 'actiune', 'mut', 'camera-control'];

  /** cote care trebuie să fie strict pozitive când există */
  const POZITIVE: [string, (t: Telefon) => Nr][] = [
    ['corp.lungime', (t) => t.corp.lungime], ['corp.latime', (t) => t.corp.latime],
    ['corp.grosime', (t) => t.corp.grosime],
    ['insulaCamera.latime', (t) => t.insulaCamera.latime],
    ['insulaCamera.inaltime', (t) => t.insulaCamera.inaltime],
    ['port.latime', (t) => t.port.latime], ['port.inaltime', (t) => t.port.inaltime],
  ];

  interface Raport { id: string; model: string; lipsa: string[]; erori: string[] }

  function verifica(t: Telefon): Raport {
    const lipsa: string[] = [];
    const erori: string[] = [];
    const are = (v: unknown) => v !== null && v !== undefined && v !== '';

    /**
     * Lista vine din NUCLEU, nu de aici: aceeași listă hotărăște și ce modele apar în catalogul
     * aplicației. Două liste ar fi putut spune lucruri diferite despre același model.
     */
    lipsa.push(...coteLipsa(t as any));
    // Modelul FICTIV n-are sursa, prin definitie: nu e transcris din niciun desen. I se cer toate
    // cotele, fiindca sabloanele lucreaza pe el, dar nu i se cere de unde vin.
    if (!t.fictiv) {
      if (!are(t.sursa.versiune)) lipsa.push('sursa.versiune');
      if (!t.sursa.pagina) lipsa.push('sursa.pagina');
    }
    if (!t.butoane.length) lipsa.push('butoane (cel putin unul)');

    // ---------- de aici în jos, ERORI: cote care se contrazic ----------

    for (const [nume, ia] of POZITIVE) {
      const v = ia(t);
      if (v !== null && !(v > 0)) erori.push(`${nume} = ${v}, trebuie > 0`);
    }
    if (t.corp.profilMargine !== null && !PROFILE.includes(t.corp.profilMargine)) {
      erori.push(`corp.profilMargine „${t.corp.profilMargine}" nu e ${PROFILE.join(' / ')}`);
    }
    if (t.insulaCamera.forma !== null && !FORME.includes(t.insulaCamera.forma)) {
      erori.push(`insulaCamera.forma „${t.insulaCamera.forma}" nu e una din ${FORME.join(' / ')}`);
    }
    if (t.port.tip !== null && !TIPURI_PORT.includes(t.port.tip)) {
      erori.push(`port.tip „${t.port.tip}" nu e ${TIPURI_PORT.join(' / ')}`);
    }

    // INSULA ÎNCAPE ÎN CORP, cu margine — se verifică doar când sunt toate cotele
    const c = t.corp, i = t.insulaCamera;
    if ([c.lungime, c.latime, i.x, i.y, i.latime, i.inaltime].every((v) => v !== null)) {
      const stX = (i.x as number) - (i.latime as number) / 2, drX = (i.x as number) + (i.latime as number) / 2;
      const joY = (i.y as number) - (i.inaltime as number) / 2, suY = (i.y as number) + (i.inaltime as number) / 2;
      const limX = (c.latime as number) / 2 - MARGINE_INSULA, limY = (c.lungime as number) / 2 - MARGINE_INSULA;
      if (stX < -limX || drX > limX) {
        erori.push(`insula iese pe X: [${stX.toFixed(2)}, ${drX.toFixed(2)}] fata de ±${limX.toFixed(2)}`);
      }
      if (joY < -limY || suY > limY) {
        erori.push(`insula iese pe Y: [${joY.toFixed(2)}, ${suY.toFixed(2)}] fata de ±${limY.toFixed(2)}`);
      }
    }

    /**
     * LENTILELE ÎNCAP ÎN INSULĂ.
     *
     * Coordonatele lentilelor sunt în ACELAȘI sistem global ca insula — origine în centrul
     * spatelui — nu față de centrul insulei. Prima versiune a verificării presupunea „față de
     * insulă" și respingea toate cele patru modele-pilot, corect transcrise. Se vede fără dubiu
     * la iPhone SE, unde centrul lentilei e identic cu al insulei: dacă erau relative, ar fi fost
     * (0, 0).
     */
    if (i.latime !== null && i.inaltime !== null && i.x !== null && i.y !== null) {
      t.insulaCamera.lentile.forEach((l, k) => {
        if ([l.x, l.y, l.diametru].some((v) => v === null)) return;
        const r = (l.diametru as number) / 2;
        const dx = Math.abs((l.x as number) - (i.x as number));
        const dy = Math.abs((l.y as number) - (i.y as number));
        if (dx + r > (i.latime as number) / 2 + 1e-6 || dy + r > (i.inaltime as number) / 2 + 1e-6) {
          erori.push(`lentila ${k + 1} iese din insula: centru (${l.x}, ${l.y}), insula (${i.x}, ${i.y}) `
            + `${i.latime}x${i.inaltime}, raza ${r}`);
        }
      });
    }

    // BUTOANELE NU SE SUPRAPUN pe aceeași latură
    for (const latura of ['stanga', 'dreapta']) {
      const b = t.butoane.filter((x) => x.latura === latura && x.y !== null && x.lungime !== null)
        .map((x) => ({ tip: x.tip, jos: (x.y as number) - (x.lungime as number) / 2, sus: (x.y as number) + (x.lungime as number) / 2 }))
        .sort((p, q) => p.jos - q.jos);
      for (let k = 1; k < b.length; k++) {
        if (b[k].jos < b[k - 1].sus) {
          erori.push(`butoanele „${b[k - 1].tip}" si „${b[k].tip}" se suprapun pe ${latura}`);
        }
      }
    }
    for (const b of t.butoane) {
      if (!TIPURI_BUTON.includes(b.tip)) erori.push(`buton de tip necunoscut: „${b.tip}"`);
      if (!['stanga', 'dreapta'].includes(b.latura)) erori.push(`butonul „${b.tip}" are latura „${b.latura}"`);
    }

    // PORTUL necentrat cere explicatie — altfel nu se stie daca e cota sau greseala de transcriere
    if (t.port.x !== null && t.port.x !== 0 && !t.note.trim()) {
      erori.push(`port.x = ${t.port.x} (necentrat) dar campul "note" e gol`);
    }
    if (t.verificat && !t.verificatLa) erori.push('verificat: true dar verificatLa e gol');

    // ---------- campurile adaugate dupa primii piloti ----------
    const g = t.corp.grosimeMaxHusaSpate;
    if (g !== null && g !== undefined && !(g > 0)) erori.push(`corp.grosimeMaxHusaSpate = ${g}, trebuie > 0`);

    const z = t.corp.zonaIncarcare;
    if (z) {
      if (z.diametru !== null && !(z.diametru > 0)) erori.push(`zonaIncarcare.diametru = ${z.diametru}, trebuie > 0`);
      // inelul trebuie sa incapa pe spate; unul mai lat decat telefonul e o eroare de transcriere
      if (z.diametru !== null && z.x !== null && z.y !== null
        && c.latime !== null && c.lungime !== null) {
        const r = z.diametru / 2;
        if (Math.abs(z.x) + r > c.latime / 2 + 1e-6 || Math.abs(z.y) + r > c.lungime / 2 + 1e-6) {
          erori.push(`zonaIncarcare Ø${z.diametru} la (${z.x}, ${z.y}) nu incape pe spate ${c.latime}x${c.lungime}`);
        }
      }
    }

    const verificaCon = (c: Con | null | undefined, unde: string) => {
      if (!c) return;
      if (c.unghi !== null && !(c.unghi > 0 && c.unghi < 180)) erori.push(`${unde}.con.unghi = ${c.unghi}, asteptat intre 0 si 180`);
      if (c.distanta !== null && !(c.distanta > 0)) erori.push(`${unde}.con.distanta = ${c.distanta}, trebuie > 0`);
      if (!c.referinta) erori.push(`${unde}.con n-are referinta: nu se stie de la ce se masoara distanta`);
      else if (!REFERINTE_CON.includes(c.referinta)) {
        erori.push(`${unde}.con.referinta „${c.referinta}" nu e ${REFERINTE_CON.join(' / ')}`);
      }
    };
    t.insulaCamera.lentile.forEach((l, k) => verificaCon(l.con, `lentila ${k + 1}`));
    verificaCon(t.insulaCamera.blit.con, 'blit');

    for (const b of t.butoane) {
      const k = b.keepout;
      if (!k) continue;
      if (k.latime !== null && !(k.latime > 0)) erori.push(`keepout la „${b.tip}": latime ${k.latime}`);
      if (k.inaltime !== null && !(k.inaltime > 0)) erori.push(`keepout la „${b.tip}": inaltime ${k.inaltime}`);
      // zona pentru husa subtire e mai LARGA decat cea tipica; invers ar fi o eroare de transcriere
      if (k.subtire && k.latime !== null && k.subtire.latime !== null && k.subtire.latime < k.latime) {
        erori.push(`keepout la „${b.tip}": zona subtire (${k.subtire.latime}) mai ingusta decat cea tipica (${k.latime})`);
      }
      if (k.subtire && k.inaltime !== null && k.subtire.inaltime !== null && k.subtire.inaltime < k.inaltime) {
        erori.push(`keepout la „${b.tip}": zona subtire (${k.subtire.inaltime}) mai joasa decat cea tipica (${k.inaltime})`);
      }
    }

    return { id: t.id, model: t.model, lipsa, erori };
  }

  // ---------- rulare ----------
  if (!existsSync(DIR)) {
    console.error(`\nLipseste ${DIR}. Ruleaza intai: node scripts/genereaza-telefoane.mjs\n`);
    // vezi regula din docs/design/: process.exit dupa manifold crapa libuv pe Windows
    process.exitCode = 1;
  } else {
    const fisiere = readdirSync(DIR).filter((f) => f.endsWith('.json')).sort();
    const rapoarte = fisiere.map((f) => verifica(JSON.parse(readFileSync(join(DIR, f), 'utf8')) as Telefon));

    // modelul fictiv se verifica si el: daca el nu trece, sabloanele n-au pe ce lucra
    const caleFictiv = join(DIR_TEST, 'fictiv.json');
    const fictiv = existsSync(caleFictiv)
      ? verifica(JSON.parse(readFileSync(caleFictiv, 'utf8')) as Telefon) : null;

    const complete = rapoarte.filter((r) => !r.lipsa.length && !r.erori.length);
    const cuErori = rapoarte.filter((r) => r.erori.length);
    const incomplete = rapoarte.filter((r) => r.lipsa.length && !r.erori.length);

    console.log(`\nDATE TELEFOANE — ${rapoarte.length} modele\n`);
    console.log(`  complete:    ${complete.length}`);
    console.log(`  incomplete:  ${incomplete.length}   (cote inca necompletate — nu e o eroare)`);
    console.log(`  cu erori:    ${cuErori.length}`);

    if (fictiv) {
      const ok = !fictiv.erori.length && !fictiv.lipsa.length;
      console.log(`\n  model fictiv (dezvoltare): ${ok ? 'complet si consistent' : 'PROBLEME'}`);
      for (const e of fictiv.erori) console.log(`    EROARE  ${e}`);
      for (const l of fictiv.lipsa) console.log(`    lipsa   ${l}`);
    }

    if (complete.length) {
      console.log('\n  COMPLETE:');
      for (const r of complete) console.log(`    ${r.model}`);
    }
    if (incomplete.length) {
      console.log('\n  INCOMPLETE (primele cote care lipsesc):');
      for (const r of incomplete) {
        console.log(`    ${r.model.padEnd(32)} ${r.lipsa.length} cote — ${r.lipsa.slice(0, 3).join(', ')}${r.lipsa.length > 3 ? '…' : ''}`);
      }
    }
    if (cuErori.length) {
      console.error('\n  ERORI DE CONSISTENTA:');
      for (const r of cuErori) {
        console.error(`    ${r.model}`);
        for (const e of r.erori) console.error(`      ${e}`);
      }
    }

    const esec = cuErori.length > 0 || (fictiv ? fictiv.erori.length > 0 || fictiv.lipsa.length > 0 : false);
    console.log(esec ? '\nDate INCONSISTENTE — vezi erorile de mai sus.\n' : '\nDate consistente.\n');
    process.exitCode = esec ? 1 : 0; return;
  }
}

await main();
