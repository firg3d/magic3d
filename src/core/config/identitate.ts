/**
 * NUCLEU — identitatea firmei: logo, nume, site.
 *
 * E CONFIGURAȚIE DE APLICAȚIE, nu setare de captură: se face o dată și se folosește în mai
 * multe locuri. Azi doar la watermark-ul din modul prezentare; vezi `docs/roadmap.md` pentru
 * folosirile planificate (antetul fișei de producție, oferte, etichete).
 *
 * De asta stă aici și nu în modulul de prezentare — ca următorul consumator să nu fie nevoit
 * să scoată datele dintr-un panou de fotografiat.
 */

import { t } from '../i18n/index.js';

export type ColtWatermark = 'stanga-sus' | 'dreapta-sus' | 'stanga-jos' | 'dreapta-jos';

export interface IdentitateFirma {
  /** PNG cu transparență, ca data URL (logo-urile de firmă sunt mici; localStorage ajunge) */
  logo?: string;
  logoNume?: string;
  nume?: string;
  site?: string;
  /** setările watermark-ului: țin de identitate, nu de o captură anume */
  watermark: {
    activ: boolean;
    colt: ColtWatermark;
    opacitate: number;   // 0..1
    /** lățimea logo-ului ca FRACȚIUNE din lățimea imaginii — nu pixeli, ca să arate la fel
     *  la 2000 și la 4000 px */
    latimeProcent: number;
    /** marginea față de colț, tot ca fracțiune din lățimea imaginii */
    margineProcent: number;
  };
}

const KEY = 'magic3d-identitate';
const IMPLICIT: IdentitateFirma = {
  watermark: { activ: true, colt: 'dreapta-jos', opacitate: 0.3, latimeProcent: 0.12, margineProcent: 0.03 },
};

export function citesteIdentitate(): IdentitateFirma {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!v || typeof v !== 'object') return structuredClone(IMPLICIT);
    return { ...IMPLICIT, ...v, watermark: { ...IMPLICIT.watermark, ...(v.watermark ?? {}) } };
  } catch { return structuredClone(IMPLICIT); }
}

export function scrieIdentitate(v: IdentitateFirma): boolean {
  try { localStorage.setItem(KEY, JSON.stringify(v)); return true; } catch { return false; }
}

/** true dacă imaginea chiar are pixeli transparenți; altfel logo-ul va apărea ca dreptunghi */
export async function areTransparenta(dataURL: string): Promise<boolean> {
  const img = await incarcaImagine(dataURL);
  const c = document.createElement('canvas');
  c.width = Math.min(img.width, 160); c.height = Math.min(img.height, 160);
  const x = c.getContext('2d'); if (!x) return true;
  x.drawImage(img, 0, 0, c.width, c.height);
  const d = x.getImageData(0, 0, c.width, c.height).data;
  for (let i = 3; i < d.length; i += 4) if (d[i] < 250) return true;
  return false;
}

function incarcaImagine(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error(t('ident.imagineInvalida')));
    i.src = src;
  });
}

/**
 * Suprapune logo-ul peste un PNG deja randat și întoarce alt PNG.
 * Dimensiunea și marginea sunt PROCENTE din lățimea imaginii, deci aceeași încadrare
 * la 2000 și la 4000 px. Dacă nu există logo sau watermark-ul e oprit, întoarce imaginea
 * neatinsă — fără canvas, fără recodare.
 */
export async function aplicaWatermark(pngDataURL: string, id: IdentitateFirma): Promise<string> {
  if (!id.logo || !id.watermark.activ) return pngDataURL;
  const [baza, logo] = await Promise.all([incarcaImagine(pngDataURL), incarcaImagine(id.logo)]);
  const c = document.createElement('canvas');
  c.width = baza.width; c.height = baza.height;
  const x = c.getContext('2d');
  if (!x) return pngDataURL;
  x.drawImage(baza, 0, 0);

  const w = c.width * id.watermark.latimeProcent;
  const h = w * (logo.height / Math.max(1, logo.width));
  const m = c.width * id.watermark.margineProcent;
  const dreapta = id.watermark.colt.startsWith('dreapta');
  const jos = id.watermark.colt.endsWith('jos');
  const px = dreapta ? c.width - m - w : m;
  const py = jos ? c.height - m - h : m;

  x.globalAlpha = Math.max(0, Math.min(1, id.watermark.opacitate));
  x.drawImage(logo, px, py, w, h);
  x.globalAlpha = 1;
  return c.toDataURL('image/png');
}
