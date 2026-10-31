/**
 * NUCLEU — scene de fundal pentru fotografii de produs.
 *
 * O scenă NU e o poză: e un set de date care descrie și camera din care a fost făcută
 * fotografia, planul pe care stă obiectul, direcția și temperatura luminii. Fără ele
 * obiectul apare lipit peste imagine, cu umbra în direcția greșită.
 *
 * Fiecare scenă stă în `public/scene/<id>/` cu `scena.json` lângă imagine.
 */

/** ce trebuie să conțină `scena.json` */
import { t } from '../i18n/index.js';

export interface ScenaFoto {
  nume: string;
  descriere?: string;
  /** numele fișierului imagine, relativ la folderul scenei */
  imagine: string;
  camera: { pozitie: [number, number, number]; tinta: [number, number, number]; fov: number };
  /** planul pe care cade umbra — trebuie să coincidă cu suprafața din fotografie */
  planUmbra: { inaltime: number; rotatieY: number };
  /** direcția din care vine lumina în fotografie; umbra cade în sens opus */
  lumina: { directie: [number, number, number]; temperatura: number; intensitate: number };
  umbra: { opacitate: number };
  /** imaginea folosită și ca environment map, pentru reflexii pe plastic */
  environment?: boolean;
  /** unde cade linia orizontului în imagine (0..1 de sus în jos) — folosită la verificare */
  orizontProcent?: number;
  reperScara?: string;
  // completate la încărcare
  id?: string;
  urlImagine?: string;
}

export interface IntrareManifestScena { id: string; nume: string; fisier: string; thumb?: string; }

const RADACINA = '/scene/';

export async function incarcaManifestScene(): Promise<IntrareManifestScena[]> {
  try {
    const r = await fetch(RADACINA + 'manifest.json');
    if (!r.ok) return [];
    const j = await r.json();
    return Array.isArray(j?.scene) ? j.scene : [];
  } catch { return []; }        // fără folder de scene aplicația merge mai departe
}

export async function incarcaScena(intrare: IntrareManifestScena): Promise<ScenaFoto> {
  const r = await fetch(RADACINA + intrare.fisier);
  if (!r.ok) throw new Error(`${intrare.fisier} (${r.status})`);
  const s = (await r.json()) as ScenaFoto;
  const folder = intrare.fisier.slice(0, intrare.fisier.lastIndexOf('/') + 1);
  return { ...s, id: intrare.id, urlImagine: RADACINA + folder + s.imagine };
}

/**
 * Unde cade linia orizontului pe imagine, pentru camera declarată (0 = sus, 1 = jos).
 *
 * Orizontul planului orizontal apare la unghiul dintre axa camerei și orizontală. Serveşte
 * la potrivirea unei fotografii reale: dacă orizontul din poză nu cade acolo, obiectul va
 * părea că plutește sau că intră în masă, oricât de bine ar fi luminat.
 */
export function orizontCalculat(cam: ScenaFoto['camera']): number {
  const dy = cam.tinta[1] - cam.pozitie[1];
  const dx = cam.tinta[0] - cam.pozitie[0];
  const dz = cam.tinta[2] - cam.pozitie[2];
  const orizontal = Math.hypot(dx, dz);
  const pitch = Math.atan2(-dy, orizontal);          // pozitiv = camera privește în jos
  const tanHalf = Math.tan((cam.fov * Math.PI) / 180 / 2);
  const yNdc = Math.max(-1, Math.min(1, Math.tan(pitch) / tanHalf));
  return (1 - yNdc) / 2;
}

/**
 * Camera dedusă din fotografie: două muchii ale blatului + înălțimea de la care ai fotografiat.
 *
 * Două capcane, amândouă verificate numeric:
 *
 * 1. Muchia din spate a blatului NU e orizontul. Orizontul e linia de fugă a planului — unde
 *    blatul ar ajunge la infinit — și stă mereu DEASUPRA muchiei din spate. Pusă drept
 *    orizont, muchia înclină planul față de fotografie și umbra cade în aer.
 * 2. Din cele două muchii singure sistemul e SUBDETERMINAT: orice înclinație are o înălțime
 *    de cameră potrivită care dă exact aceleași două muchii. De asta `inaltimeCamera` e dată
 *    de tine (cât era obiectivul deasupra blatului), nu dedusă.
 *
 * @param muchieSpate     poziția muchiei din spate în imagine (0 = sus, 1 = jos)
 * @param muchieFata      poziția muchiei din față, la fel
 * @param adancimeBlat    adâncimea reală a blatului, mm
 * @param inaltimeCamera  cât era obiectivul deasupra blatului, mm
 */
export function cameraDinMuchii(o: {
  muchieSpate: number; muchieFata: number; adancimeBlat: number; inaltimeCamera: number; fov: number;
}) {
  const tanHalf = Math.tan((o.fov * Math.PI) / 180 / 2);
  const unghi = (frac: number) => Math.atan((1 - 2 * frac) * tanHalf);   // raza, față de axa camerei
  const aSpate = unghi(o.muchieSpate), aFata = unghi(o.muchieFata);
  if (aFata >= aSpate) throw new Error(t('scena.muchiiInversate'));

  // Cu h dat, adâncimea văzută depinde monoton de înclinație: o cameră mai aplecată vede
  // blatul mai scurt. Căutăm înclinația care reproduce adâncimea reală.
  const h = o.inaltimeCamera;
  const adancimeLa = (p: number) => h / Math.tan(p - aSpate) - h / Math.tan(p - aFata);
  let jos = aSpate + 1e-6, sus = Math.PI / 2 - 1e-6;
  if (adancimeLa(jos) < o.adancimeBlat) {
    throw new Error(t('scena.geometrieImposibila'));
  }
  for (let i = 0; i < 100; i++) {
    const mij = (jos + sus) / 2;
    if (adancimeLa(mij) > o.adancimeBlat) jos = mij; else sus = mij;
  }
  const p = (jos + sus) / 2;
  const zSpate = h / Math.tan(p - aSpate);
  const zFata = h / Math.tan(p - aFata);

  // Blatul are muchia din față la z = 0; camera stă în spatele ei, la înălțimea h.
  // Ținta e pe direcția de privire, la mijlocul blatului.
  const mij = (zSpate + zFata) / 2;
  const pozitie: [number, number, number] = [0, +h.toFixed(1), +zFata.toFixed(1)];
  const tinta: [number, number, number] = [0, +(h - mij * Math.tan(p)).toFixed(1), +(zFata - mij).toFixed(1)];
  return { pozitie, tinta, fov: o.fov, inclinatieGrade: +((p * 180) / Math.PI).toFixed(2),
    distantaSpate: +zSpate.toFixed(1), distantaFata: +zFata.toFixed(1),
    orizontProcent: +(((1 - Math.tan(p) / tanHalf) / 2)).toFixed(4) };
}

/** temperatura de culoare (K) -> culoare RGB aproximativă, pentru lumina principală */
export function temperaturaLaCuloare(k: number): number {
  const t = Math.max(1000, Math.min(12000, k)) / 100;
  const canal = (v: number) => Math.max(0, Math.min(255, v)) / 255;
  let r: number, g: number, b: number;
  if (t <= 66) { r = 255; g = 99.47 * Math.log(t) - 161.12; }
  else { r = 329.7 * Math.pow(t - 60, -0.1332); g = 288.12 * Math.pow(t - 60, -0.0755); }
  if (t >= 66) b = 255;
  else if (t <= 19) b = 0;
  else b = 138.52 * Math.log(t - 10) - 305.045;
  const [R, G, B] = [canal(r), canal(g), canal(b)];
  return (Math.round(R * 255) << 16) | (Math.round(G * 255) << 8) | Math.round(B * 255);
}
