/**
 * NUCLEU — REGISTRUL DE FONTURI, o singură copie, folosită de toate aplicațiile.
 *
 * A stat în trei copii (apps/litere, apps/brelocuri, apps/fagure), fiindcă izolarea interzice
 * importul dintr-o altă aplicație. Erau IDENTICE octet cu octet, în afara antetului — iar
 * fișierul propriu spunea, din 2026-08-01, că e „candidat de mutat în core/assets". Mutarea s-a
 * făcut acum, când urma să apară a patra copie (apps/cutii): regula proiectului e că nucleul
 * primește o bucată la al doilea consumator, nu la al patrulea. Același drum pe care l-a făcut
 * textSolid.ts, care apucase să divergă înainte de unificare.
 *
 * Ce NU intră aici: liste de fonturi „recomandate", praguri de trăsătură, decizii de produs.
 * Fișierul întoarce registrul și fontul parsat; fiecare aplicație judecă singură ce e potrivit.
 *
 * Sursa de adevăr e public/fonts/fonts-manifest.json, generat de scanare — deci apare
 * TOT ce se află în folder, indiferent dacă e sau nu în scripts/fonts-list.json
 * (fonturile puse manual primesc categoria „Altele”).
 *
 * Încărcarea e LENEȘĂ: la pornire nu se parsează zeci de fișiere, ci doar fontul cerut.
 * Diacriticele RO lipsă sunt calculate la scanare și citite din manifest.
 * Fonturile încărcate de pe disc (buton „încarcă font”) trăiesc doar în sesiune.
 */
import { t } from '../i18n/index.js';
// @ts-ignore — opentype.js nu are declarații de tip
import opentype from 'opentype.js';

export interface FontItem {
  fisier: string;          // numele fișierului (cheia unică) sau „local:<nume>” pentru cele de pe disc
  familie: string;
  categorie: string;
  weight: number;
  italic: boolean;
  eticheta: string;        // „Regular”, „Bold Italic”…
  lipsaDiacritice: string[];
  local?: boolean;
}

let MANIFEST: FontItem[] = [];
const cache = new Map<string, any>();       // fisier -> font opentype parsat
const localBuf = new Map<string, ArrayBuffer>();

export const fontURL = (f: FontItem) => (f.local ? '' : `/fonts/${encodeURIComponent(f.fisier)}`);

/** citește manifestul (după scanare). Nu parsează niciun font. */
export async function loadFontManifest(): Promise<FontItem[]> {
  try {
    const r = await fetch('/fonts/fonts-manifest.json?t=' + Date.now());
    const list = (await r.json()) as FontItem[];
    const locale = MANIFEST.filter((f) => f.local);
    MANIFEST = [...list, ...locale];
  } catch { MANIFEST = MANIFEST.filter((f) => f.local); }
  return MANIFEST;
}

export function allFonts(): FontItem[] { return MANIFEST; }
export function fontByKey(key: string): FontItem | undefined { return MANIFEST.find((f) => f.fisier === key); }

/** o intrare per FAMILIE (varianta cea mai apropiată de Regular), grupată pe categorii */
export function fontGroups(): { categorie: string; items: FontItem[] }[] {
  const perFamilie = new Map<string, FontItem>();
  for (const f of MANIFEST) {
    const cur = perFamilie.get(f.familie);
    const scor = (x: FontItem) => Math.abs(x.weight - 400) + (x.italic ? 50 : 0);
    if (!cur || scor(f) < scor(cur)) perFamilie.set(f.familie, f);
  }
  // „Altele" rămâne ultimul: e coșul fonturilor puse manual, nu o categorie de ales.
  // Categoriile necunoscute cad tot la coadă (indexOf -1 -> 99), deci lista nu trebuie
  // ținută sincronizată cu fonts-list.json — doar ordinea celor care contează.
  const ordine = ['Neutre', 'Serif display', 'Sans display', 'Decorative', 'Cursiv', 'Altele'];
  const grupuri = new Map<string, FontItem[]>();
  for (const f of perFamilie.values()) (grupuri.get(f.categorie) ?? grupuri.set(f.categorie, []).get(f.categorie)!).push(f);
  return [...grupuri.entries()]
    .sort((a, b) => (ordine.indexOf(a[0]) + 1 || 99) - (ordine.indexOf(b[0]) + 1 || 99) || a[0].localeCompare(b[0]))
    .map(([categorie, items]) => ({ categorie, items: items.sort((a, b) => a.familie.localeCompare(b.familie)) }));
}

/** parsează (și memorează) fontul cerut. Lenevos: doar la nevoie. */
export async function loadFont(key: string): Promise<any> {
  if (cache.has(key)) return cache.get(key);
  const item = fontByKey(key);
  let buf: ArrayBuffer;
  if (item?.local) {
    const b = localBuf.get(key); if (!b) throw new Error(t('fonts.localLipsa', { nume: key }));
    buf = b;
  } else {
    const res = await fetch(`/fonts/${encodeURIComponent(key)}`);
    if (!res.ok) throw new Error(t('fonts.nuPotIncarca', { nume: key, status: res.status }));
    buf = await res.arrayBuffer();
  }
  const font = opentype.parse(buf);
  cache.set(key, font);
  return font;
}
export function fontCached(key: string): any | undefined { return cache.get(key); }

const RO: [string, number][] = [['Ș', 0x0218], ['ș', 0x0219], ['Ț', 0x021A], ['ț', 0x021B], ['Ă', 0x0102], ['ă', 0x0103], ['Î', 0x00CE], ['î', 0x00EE], ['Â', 0x00C2], ['â', 0x00E2]];

// ÎNCĂRCAREA DE FONTURI DE PE DISC A FOST SCOASĂ INTENȚIONAT — a nu se readăuga.
//
// Fontul nu pleca nicăieri: era citit în browser și ținut doar în sesiune, deci nu era o
// problemă de server. Problema e de PRODUS. Utilizatorul putea încărca un font comercial și
// exporta din el un model pe care apoi să îl vândă. Licența acelui font nu ne aparține, nu o
// putem verifica, iar reclamația ar fi ajuns la platformă.
//
// Fonturile vin de acum EXCLUSIV din catalogul servit de platformă (`fonts/`, prin manifest),
// unde fiecare intrare e aleasă și licențiată de noi. Adăugarea de fonturi rămâne o operație
// de administrare, nu una din interfața utilizatorului.

/** URL pentru previzualizarea în interfață (local => blob) */
export function previewURL(f: FontItem): string {
  if (!f.local) return fontURL(f);
  const b = localBuf.get(f.fisier);
  return b ? URL.createObjectURL(new Blob([b])) : '';
}
