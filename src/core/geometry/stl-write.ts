/** Export binar STL dintr-un Manifold (pentru verificare vizuală). */
import { writeFileSync } from 'node:fs';

export function writeBinarySTL(manifold: any, filepath: string): number {
  const mesh = manifold.getMesh();
  const vp: Float32Array = mesh.vertProperties;
  const tv: Uint32Array = mesh.triVerts;
  const numProp: number = mesh.numProp;
  const nTri = tv.length / 3;

  const buf = Buffer.alloc(84 + nTri * 50);
  buf.writeUInt32LE(nTri, 80);
  let off = 84;

  const vx = (i: number) => vp[i * numProp + 0];
  const vy = (i: number) => vp[i * numProp + 1];
  const vz = (i: number) => vp[i * numProp + 2];

  for (let t = 0; t < nTri; t++) {
    const a = tv[t * 3], b = tv[t * 3 + 1], c = tv[t * 3 + 2];
    const ax = vx(a), ay = vy(a), az = vz(a);
    const bx = vx(b), by = vy(b), bz = vz(b);
    const cx = vx(c), cy = vy(c), cz = vz(c);
    // normală din geometrie
    const ux = bx - ax, uy = by - ay, uz = bz - az;
    const wx = cx - ax, wy = cy - ay, wz = cz - az;
    let nx = uy * wz - uz * wy;
    let ny = uz * wx - ux * wz;
    let nz = ux * wy - uy * wx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len; ny /= len; nz /= len;

    buf.writeFloatLE(nx, off); buf.writeFloatLE(ny, off + 4); buf.writeFloatLE(nz, off + 8);
    buf.writeFloatLE(ax, off + 12); buf.writeFloatLE(ay, off + 16); buf.writeFloatLE(az, off + 20);
    buf.writeFloatLE(bx, off + 24); buf.writeFloatLE(by, off + 28); buf.writeFloatLE(bz, off + 32);
    buf.writeFloatLE(cx, off + 36); buf.writeFloatLE(cy, off + 40); buf.writeFloatLE(cz, off + 44);
    buf.writeUInt16LE(0, off + 48);
    off += 50;
  }

  writeFileSync(filepath, buf);
  return nTri;
}
