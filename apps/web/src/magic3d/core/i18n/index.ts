/**
 * NUCLEU — dicționar de texte. Tot ce vede utilizatorul trece pe aici.
 *
 * DOUĂ LIMBI: română (`ro.json`, limba primară, în care se scrie) și engleză (`en.json`).
 * Structura a fost pregătită de la început pentru asta, iar adăugarea englezei chiar a fost o
 * adăugare de fișier, nu o rescriere de interfață.
 *
 *   t('toolbar.muta')                          -> „mută" / „move"
 *   t('status.baza', { w: 164, d: 229, h: 3 }) -> „bază 164×229×3 mm"
 *
 * ROMÂNA E PLASA DE SIGURANȚĂ. O cheie fără traducere cade pe română, nu pe cheia brută: mai
 * bine un rând în română într-o interfață engleză decât „piesa.statusCade" pe ecran. Testul
 * `npm run test:i18n` cere oricum acoperire completă — plasa e pentru clipa dintre scrierea
 * unei chei noi și traducerea ei, nu pentru trai permanent.
 *
 * CUM SE ALEGE LIMBA, în ordine:
 *   1. `?lang=en` din adresă — asta folosesc linkurile de pe landing-ul englez;
 *   2. alegerea salvată în `localStorage`, din comutatorul de limbă;
 *   3. `<html lang>` al paginii;
 *   4. română.
 *
 * Alegerea se aplică la ÎNCĂRCARE, o singură dată. Nu există re-randare la comutare: `t()` e
 * apelat din zeci de locuri care își construiesc DOM-ul o dată, iar comutatorul reîncarcă
 * pagina. Simplu, în loc de un ecran pe jumătate tradus.
 */
import ro from './ro.json';
import en from './en.json';

export type Limba = 'ro' | 'en';
export const LIMBI: Limba[] = ['ro', 'en'];
const CHEIE_STOCARE = 'magic3d.limba';

/** aplatizează dicționarul: { 'toolbar.muta': 'mută', ... } */
function aplatizeaza(o: any, prefix = '', out: Record<string, string> = {}): Record<string, string> {
  for (const [k, v] of Object.entries(o)) {
    const cheie = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') aplatizeaza(v, cheie, out); else out[cheie] = String(v);
  }
  return out;
}

const DICTIONARE: Record<Limba, Record<string, string>> = {
  ro: aplatizeaza(ro),
  en: aplatizeaza(en),
};

function limbaCeruta(): Limba {
  try {
    const dinUrl = new URLSearchParams(location.search).get('lang');
    if (dinUrl === 'en' || dinUrl === 'ro') return dinUrl;
    const salvata = localStorage.getItem(CHEIE_STOCARE);
    if (salvata === 'en' || salvata === 'ro') return salvata;
    if (document.documentElement.lang === 'en') return 'en';
  } catch { /* fără DOM (teste în Node) sau fără stocare: rămâne româna */ }
  return 'ro';
}

let LIMBA: Limba = limbaCeruta();
let TEXTE = DICTIONARE[LIMBA];

export const limba = (): Limba => LIMBA;

/**
 * Schimbă limba și REÎNCARCĂ pagina.
 *
 * Reîncărcarea nu e lene: interfața se construiește o dată la pornire, din zeci de locuri care
 * nu ascultă nimic. O comutare „la cald" ar lăsa jumătate din ecran în limba veche — exact
 * genul de defect care se vede la client, nu la dezvoltator.
 */
export function seteazaLimba(l: Limba): void {
  try { localStorage.setItem(CHEIE_STOCARE, l); } catch { /* fără stocare: doar tura asta */ }
  const u = new URL(location.href);
  u.searchParams.delete('lang');          // alegerea salvată are ultimul cuvânt, nu adresa veche
  location.href = u.toString();
}

/** doar pentru teste: fixează limba fără DOM și fără reîncărcare */
export function foloseste(l: Limba): void { LIMBA = l; TEXTE = DICTIONARE[l]; }

/** cheile fiecărei limbi — testul de i18n compară acoperirea */
export const cheile = (l: Limba): string[] => Object.keys(DICTIONARE[l]);

/**
 * Textul pentru o cheie, cu valori interpolate în `{acolade}`.
 * Cheia lipsă NU aruncă: se întoarce româna, iar dacă nici acolo nu există, chiar cheia — ca
 * defectul să fie vizibil în interfață și semnalat în consolă, nu să lase ecranul gol.
 */
export function t(cheie: string, valori?: Record<string, string | number>): string {
  let s = TEXTE[cheie];
  if (s === undefined && LIMBA !== 'ro') {
    s = DICTIONARE.ro[cheie];
    if (s !== undefined) console.warn(`[i18n] netradus în ${LIMBA}: ${cheie}`);
  }
  if (s === undefined) { console.warn(`[i18n] cheie lipsă: ${cheie}`); return cheie; }
  return valori ? s.replace(/\{(\w+)\}/g, (m, k) => (valori[k] !== undefined ? String(valori[k]) : m)) : s;
}

/** plural românesc simplu: 1 = singular, restul = plural (2..19 iau „de", tratat în chei) */
export const plural = (n: number, unu: string, multe: string) => (n === 1 ? unu : multe);
