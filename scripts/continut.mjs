/**
 * CONȚINUTUL SITE-ULUI — încărcare și verificare de sincronizare între limbi.
 *
 * DE CE EXISTĂ VERIFICAREA. Două fișiere de conținut care se pot desincroniza produc, peste
 * câteva luni, o pagină EN cu secțiuni goale — și nimeni n-o vede, fiindcă nimeni nu citește
 * site-ul în engleză la fel de des ca în română. Buildul pică aici, nu clientul o descoperă
 * acolo.
 *
 * VERIFICAREA E STRUCTURALĂ, NU DOAR PE CHEI. O comparație pe chei trece peste cazul care chiar
 * face rău: RO are patru carduri, EN are trei. Cheia `carduri` există în amândouă, tipul e
 * același, dar pagina EN iese cu o gaură în grilă. Deci se compară și TIPUL valorii, și
 * LUNGIMEA listelor.
 *
 * Ce NU se compară: textul propriu-zis. O traducere are voie să fie mai scurtă sau mai lungă.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const LIMBI = ['ro', 'en'];

const felul = (v) => (Array.isArray(v) ? 'listă' : v === null ? 'nul' : typeof v);

/**
 * Compară recursiv două structuri și adună TOATE diferențele, nu doar prima.
 *
 * Un raport cu o singură diferență te pune să rulezi buildul de zece ori ca să le găsești pe
 * toate. Se raportează calea completă (`sectiuni.produse.carduri[3].titlu`), fiindcă „lipsește
 * o cheie" fără cale e inutil într-un fișier de câteva sute de linii.
 */
export function diferente(a, b, numeA, numeB, cale = '', out = []) {
  const fa = felul(a), fb = felul(b);
  if (fa !== fb) {
    out.push(`${cale || '(rădăcină)'}: ${numeA} are ${fa}, ${numeB} are ${fb}`);
    return out;
  }
  if (fa === 'listă') {
    if (a.length !== b.length) {
      out.push(`${cale}: ${numeA} are ${a.length} elemente, ${numeB} are ${b.length}`);
      return out;   // cu lungimi diferite, compararea element cu element ar produce zgomot
    }
    a.forEach((_, i) => diferente(a[i], b[i], numeA, numeB, `${cale}[${i}]`, out));
    return out;
  }
  if (fa === 'object') {
    for (const k of Object.keys(a)) {
      if (!(k in b)) out.push(`${cale ? cale + '.' : ''}${k}: lipsește din ${numeB}`);
      else diferente(a[k], b[k], numeA, numeB, `${cale ? cale + '.' : ''}${k}`, out);
    }
    for (const k of Object.keys(b)) {
      if (!(k in a)) out.push(`${cale ? cale + '.' : ''}${k}: lipsește din ${numeA}`);
    }
  }
  return out;
}

/**
 * Traduceri uitate: text gol într-o limbă și plin în cealaltă.
 *
 * Verificarea e COMPARATIVĂ, nu absolută. Prima variantă respingea orice șir gol și a semnalat
 * imediat `preturi.planuri[0].perioada` — planul gratuit chiar n-are perioadă, în nicio limbă.
 * Un câmp gol peste tot e structură intenționată; unul gol doar într-o limbă e ce căutăm.
 *
 * Se apelează DUPĂ verificarea structurală, deci ambele au aceeași formă.
 */
export function traduceriUitate(a, b, numeA, numeB, cale = '', out = []) {
  if (typeof a === 'string' && typeof b === 'string') {
    const ga = !a.trim(), gb = !b.trim();
    if (ga !== gb) out.push(`${cale}: gol în ${ga ? numeA : numeB}, dar completat în ${ga ? numeB : numeA}`);
    return out;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    a.forEach((_, i) => traduceriUitate(a[i], b[i], numeA, numeB, `${cale}[${i}]`, out));
    return out;
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    for (const k of Object.keys(a)) {
      traduceriUitate(a[k], b[k], numeA, numeB, `${cale ? cale + '.' : ''}${k}`, out);
    }
  }
  return out;
}

/** Citește o limbă. Aruncă cu numele fișierului în mesaj — JSON stricat fără cale e o vânătoare. */
export function citeste(limba) {
  const cale = join(ROOT, 'content', `site.${limba}.json`);
  try {
    return JSON.parse(readFileSync(cale, 'utf8'));
  } catch (e) {
    throw new Error(`nu pot citi ${cale}: ${e.message}`);
  }
}

/**
 * Încarcă toate limbile și verifică. Aruncă la prima problemă structurală — buildul TREBUIE să
 * pice, nu să scoată pagini cu goluri.
 */
export function incarcaVerificat() {
  const site = Object.fromEntries(LIMBI.map((l) => [l, citeste(l)]));
  const probleme = [];
  const [baza, ...restul] = LIMBI;
  for (const l of restul) probleme.push(...diferente(site[baza], site[l], baza, l));
  // doar dacă structura e identică are sens comparația de conținut
  if (!probleme.length) {
    for (const l of restul) probleme.push(...traduceriUitate(site[baza], site[l], baza, l));
  }
  if (probleme.length) {
    throw new Error(
      `conținutul nu e sincronizat între limbi (${probleme.length} probleme):\n`
      + probleme.map((p) => `  · ${p}`).join('\n'),
    );
  }
  return site;
}
