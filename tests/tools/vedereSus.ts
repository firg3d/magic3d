import { deflateSync } from "node:zlib";
import type { PiesaGenerata } from "@/magic3d/generatoare/tipuri";

/* Ajutor pentru instrumentele de proba: vederea de sus a pieselor generate, ca PNG. */

/** Vederea de sus a pieselor (scena: X la dreapta, Z adancimea), fiecare in culoarea ei; PNG. */
export function png(piese: PiesaGenerata[], pxmm = 4): Uint8Array {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of piese) for (let i = 0; i < p.positions.length; i += 3) {
    minX = Math.min(minX, p.positions[i]); maxX = Math.max(maxX, p.positions[i]);
    minY = Math.min(minY, p.positions[i + 1]); maxY = Math.max(maxY, p.positions[i + 1]);
    minZ = Math.min(minZ, p.positions[i + 2]); maxZ = Math.max(maxZ, p.positions[i + 2]);
  }
  const W = Math.ceil((maxX - minX) * pxmm) + 2, H = Math.ceil((maxZ - minZ) * pxmm) + 2;
  const img = new Uint8Array(W * H * 3).fill(255);
  const zb = new Float32Array(W * H).fill(-Infinity);
  for (const p of piese) {
    const c = [1, 3, 5].map((k) => parseInt(p.culoare.slice(k, k + 2), 16));
    const q = p.positions;
    for (let t = 0; t < q.length; t += 9) {
      const v = [0, 1, 2].map((k) => [(q[t + k * 3] - minX) * pxmm + 1, (q[t + k * 3 + 2] - minZ) * pxmm + 1, q[t + k * 3 + 1]]);
      const [A, B, C] = v;
      const den = (B[1] - C[1]) * (A[0] - C[0]) + (C[0] - B[0]) * (A[1] - C[1]);
      if (Math.abs(den) < 1e-9) continue;
      const x0 = Math.max(0, Math.floor(Math.min(A[0], B[0], C[0]))), x1 = Math.min(W - 1, Math.ceil(Math.max(A[0], B[0], C[0])));
      const y0 = Math.max(0, Math.floor(Math.min(A[1], B[1], C[1]))), y1 = Math.min(H - 1, Math.ceil(Math.max(A[1], B[1], C[1])));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const l1 = ((B[1] - C[1]) * (x + 0.5 - C[0]) + (C[0] - B[0]) * (y + 0.5 - C[1])) / den;
        const l2 = ((C[1] - A[1]) * (x + 0.5 - C[0]) + (A[0] - C[0]) * (y + 0.5 - C[1])) / den;
        if (l1 < 0 || l2 < 0 || l1 + l2 > 1) continue;
        const z = l1 * A[2] + l2 * B[2] + (1 - l1 - l2) * C[2];
        const k = y * W + x;
        if (z <= zb[k]) continue;
        zb[k] = z;
        const umbra = 0.6 + 0.4 * (z - minY) / Math.max(1e-6, maxY - minY);
        img.set(c.map((x) => Math.round(x * umbra)), k * 3);
      }
    }
  }
  const raw = new Uint8Array((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) raw.set(img.subarray(y * W * 3, (y + 1) * W * 3), y * (W * 3 + 1) + 1);
  const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b: Uint8Array) => { let r = -1; for (const x of b) r = crcT[(r ^ x) & 255] ^ (r >>> 8); return (r ^ -1) >>> 0; };
  const bucata = (tip: string, date: Uint8Array) => {
    const out = new Uint8Array(12 + date.length);
    const dv = new DataView(out.buffer);
    dv.setUint32(0, date.length);
    out.set(new TextEncoder().encode(tip), 4);
    out.set(date, 8);
    dv.setUint32(8 + date.length, crc(out.subarray(4, 8 + date.length)));
    return out;
  };
  const ihdr = new Uint8Array(13);
  new DataView(ihdr.buffer).setUint32(0, W);
  new DataView(ihdr.buffer).setUint32(4, H);
  ihdr.set([8, 2, 0, 0, 0], 8);
  const parti = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), bucata("IHDR", ihdr), bucata("IDAT", new Uint8Array(deflateSync(raw))), bucata("IEND", new Uint8Array())];
  const tot = new Uint8Array(parti.reduce((s, x) => s + x.length, 0));
  let o = 0;
  for (const x of parti) { tot.set(x, o); o += x.length; }
  return tot;
}
