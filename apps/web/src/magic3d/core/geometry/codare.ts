/*
 * Date binare pastrate ca text in parametrii generatoarelor (Parametri accepta doar text, numere si
 * bife): harta de gri a unei poze (relieful din poza) si plasa unui model STL incarcat de client.
 * Fara DOM si fara manifold: le folosesc panoul, worker-ul generatoarelor si testele.
 *
 *   harta: "g1;latime;inaltime;<base64 octeti de gri, rand cu rand, y in jos>"
 *   model: "m1;<base64>" cu: varfuri (uint32), triunghiuri (uint32), cutia (6 x float32),
 *          varfurile cuantizate pe 16 biti in cutie, apoi indicii (uint32).
 */

function laBase64(octeti: Uint8Array): string {
  let s = "";
  for (let i = 0; i < octeti.length; i += 0x8000) s += String.fromCharCode(...octeti.subarray(i, i + 0x8000));
  return btoa(s);
}

function dinBase64(text: string): Uint8Array {
  const s = atob(text);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i += 1) out[i] = s.charCodeAt(i);
  return out;
}

export type HartaGri = { latime: number; inaltime: number; /** 0 = negru, 255 = alb; rand cu rand, y in jos. */ gri: Uint8Array };

export function codeazaHarta(h: HartaGri): string {
  return `g1;${h.latime};${h.inaltime};${laBase64(h.gri)}`;
}

export function decodeazaHarta(text: string): HartaGri | null {
  const [v, w, h, date] = text.split(";");
  const latime = Number(w), inaltime = Number(h);
  if (v !== "g1" || !(latime > 0 && inaltime > 0) || !date) return null;
  try {
    const gri = dinBase64(date);
    return gri.length === latime * inaltime ? { latime, inaltime, gri } : null;
  } catch {
    return null;
  }
}

/** Harta de gri din pixeli RGBA, micsorata (medie pe blocuri) la cel mult `latura` pe partea mare; transparent = alb. */
export function hartaDinPixeli(p: { width: number; height: number; data: ArrayLike<number> }, latura: number): HartaGri {
  const f = Math.min(1, latura / Math.max(p.width, p.height));
  const latime = Math.max(1, Math.round(p.width * f));
  const inaltime = Math.max(1, Math.round(p.height * f));
  const gri = new Uint8Array(latime * inaltime);
  for (let y = 0; y < inaltime; y += 1) {
    for (let x = 0; x < latime; x += 1) {
      const x0 = Math.floor((x * p.width) / latime), x1 = Math.max(x0 + 1, Math.floor(((x + 1) * p.width) / latime));
      const y0 = Math.floor((y * p.height) / inaltime), y1 = Math.max(y0 + 1, Math.floor(((y + 1) * p.height) / inaltime));
      let suma = 0, n = 0;
      for (let yy = y0; yy < y1; yy += 1) {
        for (let xx = x0; xx < x1; xx += 1) {
          const i = (yy * p.width + xx) * 4;
          const a = p.data[i + 3] / 255;
          const l = 0.2126 * p.data[i] + 0.7152 * p.data[i + 1] + 0.0722 * p.data[i + 2];
          suma += l * a + 255 * (1 - a);
          n += 1;
        }
      }
      gri[y * latime + x] = Math.round(suma / n);
    }
  }
  return { latime, inaltime, gri };
}

export type PlasaModel = { varfuri: Float32Array; triunghiuri: Uint32Array };

/** Triunghiurile neindexate (x, y, z pe varf), sudate si cuantizate; null cand sunt mai multe decat `maxTriunghiuri`. */
export function codeazaModel(positions: ArrayLike<number>, maxTriunghiuri: number): string | null {
  const n = Math.floor(positions.length / 9);
  if (n === 0 || n > maxTriunghiuri) return null;
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < n * 9; i += 1) { const a = i % 3; min[a] = Math.min(min[a], positions[i]); max[a] = Math.max(max[a], positions[i]); }
  const scara = max.map((m, a) => (m - min[a] > 0 ? 65535 / (m - min[a]) : 0));
  const id = new Map<string, number>();
  const q: number[] = [];
  const idx = new Uint32Array(n * 3);
  for (let v = 0; v < n * 3; v += 1) {
    const k = [0, 1, 2].map((a) => Math.round((positions[v * 3 + a] - min[a]) * scara[a]));
    const cheie = k.join(",");
    let i = id.get(cheie);
    if (i === undefined) { i = id.size; id.set(cheie, i); q.push(...k); }
    idx[v] = i;
  }
  const nv = id.size;
  const buf = new ArrayBuffer(8 + 24 + nv * 6 + idx.length * 4 + ((nv * 6) % 4));
  const dv = new DataView(buf);
  dv.setUint32(0, nv, true);
  dv.setUint32(4, n, true);
  [...min, ...max].forEach((v, i) => dv.setFloat32(8 + i * 4, v, true));
  q.forEach((v, i) => dv.setUint16(32 + i * 2, v, true));
  const start = 32 + nv * 6 + ((nv * 6) % 4);
  idx.forEach((v, i) => dv.setUint32(start + i * 4, v, true));
  return `m1;${laBase64(new Uint8Array(buf))}`;
}

export function decodeazaModel(text: string): PlasaModel | null {
  if (!text.startsWith("m1;")) return null;
  try {
    const b = dinBase64(text.slice(3));
    const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
    const nv = dv.getUint32(0, true), n = dv.getUint32(4, true);
    const cutie = Array.from({ length: 6 }, (_, i) => dv.getFloat32(8 + i * 4, true));
    const start = 32 + nv * 6 + ((nv * 6) % 4);
    if (b.byteLength < start + n * 12) return null;
    const varfuri = new Float32Array(nv * 3);
    for (let i = 0; i < nv * 3; i += 1) {
      const a = i % 3;
      varfuri[i] = cutie[a] + (dv.getUint16(32 + i * 2, true) / 65535) * (cutie[a + 3] - cutie[a]);
    }
    const triunghiuri = new Uint32Array(n * 3);
    for (let i = 0; i < n * 3; i += 1) {
      const v = dv.getUint32(start + i * 4, true);
      if (v >= nv) return null;
      triunghiuri[i] = v;
    }
    return { varfuri, triunghiuri };
  } catch {
    return null;
  }
}
