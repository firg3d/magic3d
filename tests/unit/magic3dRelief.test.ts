import { describe, expect, it } from "vitest";
import {
  AVERTISMENT_TRIUNGHIURI,
  grilaGrosimi,
  hartaGri,
  MAX_TRIUNGHIURI,
  pasFolosit,
  previzualizare,
  SETARI_RELIEF_IMPLICITE,
  triunghiuriRelief,
  type FormaRelief,
  type SetariRelief,
} from "@/magic3d/logo/relief";

/** O poza gri: in stanga negru, in dreapta alb, cu un degrade intre ele. */
function poza(latime: number, inaltime: number, lum: (x: number, y: number) => number) {
  const data = new Uint8ClampedArray(latime * inaltime * 4);
  for (let y = 0; y < inaltime; y += 1) {
    for (let x = 0; x < latime; x += 1) {
      const v = Math.round(255 * lum(x, y));
      data.set([v, v, v, 255], (y * latime + x) * 4);
    }
  }
  return { width: latime, height: inaltime, data };
}

const degrade = poza(80, 60, (x) => x / 79);
const jumatati = poza(80, 60, (x) => (x < 40 ? 0 : 1));

/** Fiecare muchie apare in exact doua triunghiuri, in sensuri opuse: corpul e inchis etans. */
function etans(positions: Float32Array) {
  const cheie = (i: number) => `${positions[i].toFixed(4)},${positions[i + 1].toFixed(4)},${positions[i + 2].toFixed(4)}`;
  const muchii = new Map<string, number>();
  for (let t = 0; t < positions.length; t += 9) {
    const v = [cheie(t), cheie(t + 3), cheie(t + 6)];
    for (let k = 0; k < 3; k += 1) {
      const a = v[k];
      const b = v[(k + 1) % 3];
      muchii.set(`${a}|${b}`, (muchii.get(`${a}|${b}`) ?? 0) + 1);
    }
  }
  for (const [muchie, numar] of muchii) {
    const [a, b] = muchie.split("|");
    if (numar !== 1 || muchii.get(`${b}|${a}`) !== 1) return false;
  }
  return true;
}

/** Volumul cu semn (teorema divergentei): pozitiv cand normalele privesc spre afara. */
function volum(positions: Float32Array) {
  let v = 0;
  for (let t = 0; t < positions.length; t += 9) {
    const [ax, ay, az, bx, by, bz, cx, cy, cz] = positions.subarray(t, t + 9);
    v += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
  }
  return v;
}

const setari = (schimbari: Partial<SetariRelief>): SetariRelief => ({ ...SETARI_RELIEF_IMPLICITE.litofanie, latime: 40, rezolutie: 1, bordura: 0, ...schimbari });

describe("litofanie: grosimea dupa luminozitate", () => {
  it("negrul e la grosimea maxima, albul la cea minima", () => {
    const grila = grilaGrosimi(hartaGri(jumatati), setari({ grosimeMin: 0.8, grosimeMax: 3.2 }));
    const rand = grila.nx + 1;
    expect(grila.grosimi[10 * rand + 1]).toBeCloseTo(3.2, 1);
    expect(grila.grosimi[10 * rand + grila.nx - 1]).toBeCloseTo(0.8, 1);
    const toate = Array.from(grila.grosimi);
    expect(Math.min(...toate)).toBeGreaterThanOrEqual(0.8 - 1e-6);
    expect(Math.max(...toate)).toBeLessThanOrEqual(3.2 + 1e-6);
  });

  it("bordura e plina, la grosimea maxima", () => {
    const grila = grilaGrosimi(hartaGri(poza(80, 60, () => 1)), setari({ bordura: 3 }));
    expect(grila.grosimi[0]).toBeCloseTo(3.2, 6);
    // Mijlocul, alb, ramane subtire.
    const mijloc = Math.floor(grila.nz / 2) * (grila.nx + 1) + Math.floor(grila.nx / 2);
    expect(grila.grosimi[mijloc]).toBeCloseTo(0.8, 6);
  });

  it("relieful: baza plus inaltimea, deschisul sus (sau inchisul, la cerere)", () => {
    const sus = grilaGrosimi(hartaGri(jumatati), setari({ mod: "relief", baza: 2, inaltime: 3, inaltDeschis: true }));
    const jos = grilaGrosimi(hartaGri(jumatati), setari({ mod: "relief", baza: 2, inaltime: 3, inaltDeschis: false }));
    const rand = sus.nx + 1;
    expect(sus.grosimi[10 * rand + sus.nx - 1]).toBeCloseTo(5, 1);
    expect(jos.grosimi[10 * rand + jos.nx - 1]).toBeCloseTo(2, 1);
  });

  it("marimea pe obiect: latimea ceruta, adancimea dupa proportia pozei", () => {
    const grila = grilaGrosimi(hartaGri(degrade), setari({ latime: 40 }));
    expect(grila.latime).toBe(40);
    expect(grila.adancime).toBeCloseTo(30, 6);
  });
});

describe("litofanie: forme inchise etans", () => {
  for (const forma of ["plata", "inima", "curbata", "cilindru"] as FormaRelief[]) {
    it(`${forma}: fiecare muchie intre exact doua triunghiuri, normalele spre afara`, () => {
      const s = setari({ forma, bordura: forma === "inima" ? 2 : 0 });
      const positions = triunghiuriRelief(grilaGrosimi(hartaGri(degrade), s), s);
      expect(positions.length % 9).toBe(0);
      expect(etans(positions)).toBe(true);
      expect(volum(positions)).toBeGreaterThan(0);
    });
  }

  it("plata sta pe placa (Y de la 0) si e cat latimea ceruta", () => {
    const s = setari({});
    const positions = triunghiuriRelief(grilaGrosimi(hartaGri(degrade), s), s);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < positions.length; i += 3) {
      minX = Math.min(minX, positions[i]); maxX = Math.max(maxX, positions[i]);
      minY = Math.min(minY, positions[i + 1]); maxY = Math.max(maxY, positions[i + 1]);
    }
    expect(maxX - minX).toBeCloseTo(40, 6);
    expect(minY).toBeCloseTo(0, 6);
    expect(maxY).toBeLessThanOrEqual(3.2 + 1e-6);
  });

  it("cilindrul are circumferinta = latimea pozei (raza latime / 2pi)", () => {
    const s = setari({ forma: "cilindru", latime: 62.83 });
    const positions = triunghiuriRelief(grilaGrosimi(hartaGri(degrade), s), s);
    let maxR = 0;
    for (let i = 0; i < positions.length; i += 3) maxR = Math.max(maxR, Math.hypot(positions[i], positions[i + 2] + 10));
    expect(maxR).toBeCloseTo(10, 1);
  });
});

describe("marimea mesh-ului si previzualizarea", () => {
  it("rezolutia se mareste singura ca obiectul sa nu treaca de limita de triunghiuri", () => {
    const pas = pasFolosit(250, 250, 0.15);
    expect(pas).toBeGreaterThan(0.15);
    expect(4 * (250 / pas) * (250 / pas)).toBeLessThanOrEqual(MAX_TRIUNGHIURI * 1.01);
    const grila = grilaGrosimi(hartaGri(degrade), { ...SETARI_RELIEF_IMPLICITE.litofanie, latime: 250, rezolutie: 0.15 });
    expect(grila.simplificata).toBe(true);
    expect(AVERTISMENT_TRIUNGHIURI).toBeLessThan(MAX_TRIUNGHIURI);
  });

  it("previzualizarea cu lumina din spate: unde peretele e subtire, lumina e mai puternica", () => {
    const s = setari({});
    const imagine = previzualizare(grilaGrosimi(hartaGri(jumatati), s), s);
    const rosu = (x: number, y: number) => imagine.data[(y * imagine.width + x) * 4];
    const y = Math.floor(imagine.height / 2);
    expect(rosu(imagine.width - 2, y)).toBeGreaterThan(rosu(1, y) * 5);
  });
});
