/**
 * Încărcare STL -> Manifold, cu validare. STL are vârfuri duplicate per-triunghi;
 * le deduplicăm pe poziție ca mesh-ul să fie topologic închis. Dacă rezultatul
 * NU e manifold, întoarcem null (apelantul raportează și nu-l adaugă). Fără reparare.
 */
export interface LoadedSTL { manifold: any; triangles: number; dim: [number, number, number]; }

export function stlToManifold(MOD: any, buf: ArrayBuffer): { ok: true; data: LoadedSTL } | { ok: false; motiv: string } {
  const verts: number[] = [];
  const tris: number[] = [];
  const map = new Map<string, number>();
  const key = (x: number, y: number, z: number) => `${Math.round(x * 1e4)},${Math.round(y * 1e4)},${Math.round(z * 1e4)}`;
  const idx = (x: number, y: number, z: number) => {
    const k = key(x, y, z); let i = map.get(k);
    if (i === undefined) { i = verts.length / 3; verts.push(x, y, z); map.set(k, i); }
    return i;
  };

  const dv = new DataView(buf);
  const u8 = new Uint8Array(buf);
  const nBin = buf.byteLength >= 84 ? dv.getUint32(80, true) : -1;
  const isBinary = nBin >= 0 && buf.byteLength === 84 + nBin * 50;

  if (isBinary) {
    let off = 84;
    for (let t = 0; t < nBin; t++) {
      off += 12;
      const a = idx(dv.getFloat32(off, true), dv.getFloat32(off + 4, true), dv.getFloat32(off + 8, true)); off += 12;
      const b = idx(dv.getFloat32(off, true), dv.getFloat32(off + 4, true), dv.getFloat32(off + 8, true)); off += 12;
      const c = idx(dv.getFloat32(off, true), dv.getFloat32(off + 4, true), dv.getFloat32(off + 8, true)); off += 12;
      off += 2;
      tris.push(a, b, c);
    }
  } else {
    const s = new TextDecoder().decode(u8);
    const re = /vertex\s+(-?[\d.eE+]+)\s+(-?[\d.eE+]+)\s+(-?[\d.eE+]+)/g;
    let m: RegExpExecArray | null; const tmp: number[] = [];
    while ((m = re.exec(s))) { tmp.push(idx(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]))); }
    for (let i = 0; i + 2 < tmp.length; i += 3) tris.push(tmp[i], tmp[i + 1], tmp[i + 2]);
  }

  if (tris.length === 0) return { ok: false, motiv: 'STL gol / neparsabil' };

  try {
    const mesh = new MOD.Mesh({ numProp: 3, vertProperties: new Float32Array(verts), triVerts: new Uint32Array(tris) });
    const man = new MOD.Manifold(mesh);
    const st = String(man.status());
    if (st !== 'NoError') return { ok: false, motiv: `nu e manifold (${st})` };
    const bb = man.boundingBox();
    return { ok: true, data: { manifold: man, triangles: tris.length / 3, dim: [bb.max[0] - bb.min[0], bb.max[1] - bb.min[1], bb.max[2] - bb.min[2]] } };
  } catch (e: any) {
    return { ok: false, motiv: `nu e manifold (${e?.message ?? e})` };
  }
}
