import { deflateSync } from "node:zlib";
import type { PiesaGenerata } from "@/magic3d/generatoare/tipuri";

/*
 * Randare 3D pentru instrumentele de proba: vedere 3/4 (ortografica), lumina directionala cu umbra
 * proiectata pe fundal, piesele in culorile lor. Scena are Y in sus (ca in editor). Iesire: PNG.
 */

type V = [number, number, number];
const scade = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cruce = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const punct = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: V): V => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

export function randare3d(piese: PiesaGenerata[], opt: { latime?: number; azimut?: number; elevatie?: number; fundal?: [number, number, number] } = {}): Uint8Array {
  const latimePx = opt.latime ?? 900;
  const az = ((opt.azimut ?? -20) * Math.PI) / 180, el = ((opt.elevatie ?? 58) * Math.PI) / 180;
  const fundal = opt.fundal ?? [236, 232, 226];
  // directia privirii (din camera spre scena) si baza ecranului
  const d = norm([Math.sin(az) * Math.cos(el), -Math.sin(el), -Math.cos(az) * Math.cos(el)]);
  const dreapta = norm(cruce(d, [0, 1, 0]));
  const sus = norm(cruce(dreapta, d));
  const lumina = norm([-0.45, -1, -0.35]); // vine de sus, din stanga-fata
  const tri: Array<{ p: V[]; c: number[] }> = [];
  for (const piesa of piese) {
    const c = [1, 3, 5].map((k) => parseInt(piesa.culoare.slice(k, k + 2), 16));
    const q = piesa.positions;
    for (let i = 0; i < q.length; i += 9) tri.push({ p: [[q[i], q[i + 1], q[i + 2]], [q[i + 3], q[i + 4], q[i + 5]], [q[i + 6], q[i + 7], q[i + 8]]], c });
  }
  const ecran = (p: V) => [punct(p, dreapta), -punct(p, sus), punct(p, d)] as V;
  const umbraPe = (p: V): V => { const t = p[1] / -lumina[1]; return [p[0] + lumina[0] * t, 0, p[2] + lumina[2] * t]; };
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const t of tri) for (const p of t.p) for (const s of [ecran(p), ecran(umbraPe(p))]) { x0 = Math.min(x0, s[0]); x1 = Math.max(x1, s[0]); y0 = Math.min(y0, s[1]); y1 = Math.max(y1, s[1]); }
  const SS = 2; // supraesantionare
  const marg = 0.06 * (x1 - x0);
  const k = (latimePx * SS) / (x1 - x0 + 2 * marg);
  const W = latimePx * SS, H = Math.ceil((y1 - y0 + 2 * marg) * k);
  const px = (s: V) => [(s[0] - x0 + marg) * k, (s[1] - y0 + marg) * k, s[2]] as V;
  const z = new Float32Array(W * H).fill(Infinity);
  const img = new Float32Array(W * H * 3);
  const umbra = new Float32Array(W * H);
  const rasterizeaza = (a: V, b: V, c: V, f: (i: number, adancime: number) => void) => {
    const den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
    if (Math.abs(den) < 1e-9) return;
    const xa = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0]))), xb = Math.min(W - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
    const ya = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1]))), yb = Math.min(H - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
    for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) {
      const l1 = ((b[1] - c[1]) * (x + 0.5 - c[0]) + (c[0] - b[0]) * (y + 0.5 - c[1])) / den;
      const l2 = ((c[1] - a[1]) * (x + 0.5 - c[0]) + (a[0] - c[0]) * (y + 0.5 - c[1])) / den;
      if (l1 < 0 || l2 < 0 || l1 + l2 > 1) continue;
      f(y * W + x, l1 * a[2] + l2 * b[2] + (1 - l1 - l2) * c[2]);
    }
  };
  // umbra proiectata pe fundal
  for (const t of tri) {
    const [a, b, c] = t.p.map((p) => px(ecran(umbraPe(p))));
    rasterizeaza(a, b, c, (i) => { umbra[i] = 1; });
  }
  // piesele: fete orientate spre camera, umbrire Lambert + ambient + un mic luciu
  for (const t of tri) {
    // manifoldInTriunghiuri oglindeste scena si inverseaza sensul varfurilor, deci fetele raman orientate spre
    // exterior (b x c). Cu c x b se desenau fetele din spate: la piesele plate in straturi nu se vedea, la un
    // glob gol aparea peretele interior in locul celui exterior.
    const n = norm(cruce(scade(t.p[1], t.p[0]), scade(t.p[2], t.p[0])));
    if (punct(n, d) >= 0) continue;
    const dif = Math.max(0, -punct(n, lumina));
    const h = norm([-lumina[0] - d[0], -lumina[1] - d[1], -lumina[2] - d[2]]);
    const luciu = Math.pow(Math.max(0, punct(n, h)), 40) * 0.25;
    const f = 0.42 + 0.62 * dif;
    const culoare = t.c.map((x) => Math.min(255, x * f + 255 * luciu));
    const [a, b, c] = t.p.map((p) => px(ecran(p)));
    rasterizeaza(a, b, c, (i, adancime) => {
      if (adancime >= z[i]) return;
      z[i] = adancime;
      img[i * 3] = culoare[0]; img[i * 3 + 1] = culoare[1]; img[i * 3 + 2] = culoare[2];
    });
  }
  // umbra moale: estompare simpla
  const moale = new Float32Array(W * H);
  const R = Math.round(6 * SS);
  for (let y = 0; y < H; y++) { let s = 0; for (let x = -R; x < W + R; x++) { if (x + R < W && x + R >= 0) s += umbra[y * W + x + R]; if (x - R - 1 >= 0 && x - R - 1 < W) s -= umbra[y * W + x - R - 1]; if (x >= 0 && x < W) moale[y * W + x] = s / (2 * R + 1); } }
  const moale2 = new Float32Array(W * H);
  for (let x = 0; x < W; x++) { let s = 0; for (let y = -R; y < H + R; y++) { if (y + R < H && y + R >= 0) s += moale[(y + R) * W + x]; if (y - R - 1 >= 0 && y - R - 1 < H) s -= moale[(y - R - 1) * W + x]; if (y >= 0 && y < H) moale2[y * W + x] = s / (2 * R + 1); } }
  // compunere si micsorare
  const w = W / SS, hh = Math.floor(H / SS);
  const out = new Uint8Array(w * hh * 3);
  for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) {
    const acc = [0, 0, 0];
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
      const i = (y * SS + sy) * W + x * SS + sx;
      if (z[i] < Infinity) for (let c = 0; c < 3; c++) acc[c] += img[i * 3 + c];
      else { const u = 1 - 0.32 * moale2[i]; for (let c = 0; c < 3; c++) acc[c] += fundal[c] * u; }
    }
    for (let c = 0; c < 3; c++) out[(y * w + x) * 3 + c] = Math.round(acc[c] / (SS * SS));
  }
  return png(out, w, hh);
}

function png(rgb: Uint8Array, W: number, H: number): Uint8Array {
  const raw = new Uint8Array((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) raw.set(rgb.subarray(y * W * 3, (y + 1) * W * 3), y * (W * 3 + 1) + 1);
  const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b: Uint8Array) => { let r = -1; for (const x of b) r = crcT[(r ^ x) & 255] ^ (r >>> 8); return (r ^ -1) >>> 0; };
  const bucata = (tip: string, date: Uint8Array) => {
    const o = new Uint8Array(12 + date.length);
    const dv = new DataView(o.buffer);
    dv.setUint32(0, date.length);
    o.set(new TextEncoder().encode(tip), 4);
    o.set(date, 8);
    dv.setUint32(8 + date.length, crc(o.subarray(4, 8 + date.length)));
    return o;
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
