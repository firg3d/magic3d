/**
 * NUCLEU — miniaturi offscreen (Node). Randare software (z-buffer + shading plat)
 * a unui mesh într-o vedere 3/4 izometrică, apoi encodare PNG (RGBA) prin zlib.
 * Fără GPU / canvas. Folosit doar de scaner; browserul nu importă acest modul.
 */
import { deflateSync } from 'node:zlib';

type V3 = [number, number, number];

// ---------- PNG encoder minimal (RGBA, 8-bit) ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Uint8Array): Uint8Array {
  const len = data.length;
  const out = new Uint8Array(12 + len);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, len);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(8 + len, crc32(out.subarray(4, 8 + len)));
  return out;
}
function encodePNG(rgba: Uint8Array, w: number, h: number): Buffer {
  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = new Uint8Array(13); const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, w); dv.setUint32(4, h); ihdr[8] = 8; ihdr[9] = 6; // 8-bit, RGBA
  // filtrare 0 (none) pe fiecare scanline
  const raw = new Uint8Array((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; raw.set(rgba.subarray(y * w * 4, (y + 1) * w * 4), y * (w * 4 + 1) + 1); }
  const idat = deflateSync(raw);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', new Uint8Array(0))].map((c) => Buffer.from(c)));
}

// ---------- randare software ----------
const norm = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

/** PNG (Buffer) cu o vedere 3/4 a mesh-ului; fundal transparent. */
export function renderThumb(verts: number[][], tris: number[], size = 256, color: V3 = [150, 162, 205]): Buffer {
  // vedere: rotație Y apoi X (3/4 de sus)
  const ay = -0.6, ax = 0.52;
  const cy = Math.cos(ay), sy = Math.sin(ay), cx = Math.cos(ax), sx = Math.sin(ax);
  const view = (p: number[]): V3 => {
    const x1 = p[0] * cy + p[2] * sy, z1 = -p[0] * sy + p[2] * cy, y1 = p[1];
    const y2 = y1 * cx - z1 * sx, z2 = y1 * sx + z1 * cx;
    return [x1, y2, z2];
  };
  const vv = verts.map(view);
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
  for (const p of vv) { if (p[0] < minx) minx = p[0]; if (p[0] > maxx) maxx = p[0]; if (p[1] < miny) miny = p[1]; if (p[1] > maxy) maxy = p[1]; }
  const margin = size * 0.08;
  const span = Math.max(maxx - minx, maxy - miny) || 1;
  const s = (size - 2 * margin) / span;
  const ox = margin + (size - 2 * margin - (maxx - minx) * s) / 2 - minx * s;
  const oy = margin + (size - 2 * margin - (maxy - miny) * s) / 2 - miny * s;
  const px = (p: V3) => [ox + p[0] * s, size - (oy + p[1] * s)]; // y ecran în jos

  const rgba = new Uint8Array(size * size * 4);
  const zbuf = new Float32Array(size * size).fill(-Infinity);
  const light = norm([-0.35, 0.55, 0.75]);

  for (let t = 0; t < tris.length; t += 3) {
    const a = vv[tris[t]], b = vv[tris[t + 1]], c = vv[tris[t + 2]];
    if (!a || !b || !c) continue;
    // normală în spațiul vedere
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], wx = c[0] - a[0], wy = c[1] - a[1], wz = c[2] - a[2];
    let n: V3 = [uy * wz - uz * wy, uz * wx - ux * wz, ux * wy - uy * wx];
    const nl = Math.hypot(n[0], n[1], n[2]); if (nl < 1e-9) continue; n = [n[0] / nl, n[1] / nl, n[2] / nl];
    const diff = Math.abs(n[0] * light[0] + n[1] * light[1] + n[2] * light[2]); // dublă față
    const sh = 0.4 + 0.6 * diff;
    const R = Math.min(255, color[0] * sh), G = Math.min(255, color[1] * sh), B = Math.min(255, color[2] * sh);
    const pa = px(a), pb = px(b), pc = px(c);
    const x0 = Math.max(0, Math.floor(Math.min(pa[0], pb[0], pc[0]))), x1 = Math.min(size - 1, Math.ceil(Math.max(pa[0], pb[0], pc[0])));
    const y0 = Math.max(0, Math.floor(Math.min(pa[1], pb[1], pc[1]))), y1 = Math.min(size - 1, Math.ceil(Math.max(pa[1], pb[1], pc[1])));
    const area = (pb[0] - pa[0]) * (pc[1] - pa[1]) - (pb[1] - pa[1]) * (pc[0] - pa[0]);
    if (Math.abs(area) < 1e-6) continue;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const w0 = ((pb[0] - x) * (pc[1] - y) - (pb[1] - y) * (pc[0] - x)) / area;
      const w1 = ((pc[0] - x) * (pa[1] - y) - (pc[1] - y) * (pa[0] - x)) / area;
      const w2 = 1 - w0 - w1;
      if (w0 < -0.001 || w1 < -0.001 || w2 < -0.001) continue;
      const z = w0 * a[2] + w1 * b[2] + w2 * c[2];
      const idx = y * size + x;
      if (z <= zbuf[idx]) continue;
      zbuf[idx] = z;
      const o = idx * 4; rgba[o] = R; rgba[o + 1] = G; rgba[o + 2] = B; rgba[o + 3] = 255;
    }
  }
  return encodePNG(rgba, size, size);
}
