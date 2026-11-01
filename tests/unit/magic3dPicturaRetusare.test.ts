import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { meshForShape } from "@/lib/editorMeshCore";
import { plasaDin, reaplicaPictura, salveazaPictura, type CorpPictat } from "@/magic3d/pictura/date";
import { corpCuPlasaNoua } from "@/magic3d/pictura/plasaEditor";
import { inchideGauri, marime3mfEstimata, orienteazaNormale, repara, simplifica, subdivizeaza, sudeazaVarfuri, type Plasa } from "@/magic3d/pictura/retusare";
import { topologie } from "@/magic3d/pictura/topologie";
import type { WorkplaneShape } from "@/types/layerling";

function plasa(geom: THREE.BufferGeometry): Plasa {
  const varfuri = new Float32Array(geom.getAttribute("position").array as ArrayLike<number>);
  const fete = geom.index ? new Uint32Array(geom.index.array as ArrayLike<number>) : new Uint32Array(varfuri.length / 3).map((_, i) => i);
  return { varfuri, fete, culori: new Uint8Array(fete.length / 3) };
}

const corp = (p: Plasa): CorpPictat => ({ ...p, id: "c", nume: "c" });

function arie(p: Plasa) {
  let s = 0;
  for (let t = 0; t < p.fete.length / 3; t += 1) {
    const a = new THREE.Vector3().fromArray(p.varfuri, p.fete[t * 3] * 3);
    const b = new THREE.Vector3().fromArray(p.varfuri, p.fete[t * 3 + 1] * 3);
    const c = new THREE.Vector3().fromArray(p.varfuri, p.fete[t * 3 + 2] * 3);
    s += b.sub(a).cross(c.sub(a)).length() / 2;
  }
  return s;
}

function volum(p: Plasa) {
  let v = 0;
  for (let t = 0; t < p.fete.length / 3; t += 1) {
    const a = new THREE.Vector3().fromArray(p.varfuri, p.fete[t * 3] * 3);
    const b = new THREE.Vector3().fromArray(p.varfuri, p.fete[t * 3 + 1] * 3);
    const c = new THREE.Vector3().fromArray(p.varfuri, p.fete[t * 3 + 2] * 3);
    v += a.dot(b.cross(c)) / 6;
  }
  return v;
}

/** Laturi folosite de un singur triunghi (o plasa inchisa nu are). */
function laturiLibere(p: Plasa) {
  const top = topologie(p);
  let n = 0;
  for (const x of top.vecini) if (x < 0) n += 1;
  return n;
}

const cubSudat = () => sudeazaVarfuri(plasa(new THREE.BoxGeometry(20, 20, 20)));

describe("pictura: subdivizare locala", () => {
  it("imparte doar zona selectata, pana sub lungimea ceruta, fara crapaturi si fara sa schimbe forma", () => {
    const p = cubSudat();
    expect(laturiLibere(p)).toBe(0);
    const sus = topologie(p);
    const sel = new Uint8Array(12);
    for (let t = 0; t < 12; t += 1) if (sus.normale[t * 3 + 1] > 0.99) { sel[t] = 1; p.culori[t] = 3; }
    const r = subdivizeaza(p, sel, 2, 100_000);
    expect(r.adaugate).toBeGreaterThan(100);
    expect(r.limitaAtinsa).toBe(false);
    expect(laturiLibere(r)).toBe(0);
    expect(arie(r)).toBeCloseTo(arie(p), 3);
    expect(volum(r)).toBeCloseTo(8000, 2);
    const t = topologie(r);
    for (let i = 0; i < t.triunghiuri; i += 1) {
      if (!r.selectie[i]) continue;
      for (let e = 0; e < 3; e += 1) {
        const a = r.fete[i * 3 + e], b = r.fete[i * 3 + ((e + 1) % 3)];
        expect(Math.hypot(r.varfuri[a * 3] - r.varfuri[b * 3], r.varfuri[a * 3 + 1] - r.varfuri[b * 3 + 1], r.varfuri[a * 3 + 2] - r.varfuri[b * 3 + 2])).toBeLessThanOrEqual(2 + 1e-6);
      }
      // Copiii fetei de sus pastreaza culoarea.
      expect(r.culori[i]).toBe(3);
      expect(t.normale[i * 3 + 1]).toBeGreaterThan(0.99);
    }
    // Fata de jos (neselectata) a ramas cum era.
    let jos = 0;
    for (let i = 0; i < t.triunghiuri; i += 1) if (t.normale[i * 3 + 1] < -0.99) jos += 1;
    expect(jos).toBe(2);
  });

  it("se opreste la limita de triunghiuri si spune asta", () => {
    const p = cubSudat();
    const r = subdivizeaza(p, new Uint8Array(12).fill(1), 0.1, 500);
    expect(r.limitaAtinsa).toBe(true);
    expect(r.fete.length / 3).toBeLessThanOrEqual(500);
    expect(laturiLibere(r)).toBe(0);
  });

  it("estimeaza marimea fisierului", () => {
    expect(marime3mfEstimata(1_000_000)).toBeGreaterThan(10_000_000);
    expect(marime3mfEstimata(0)).toBe(0);
  });
});

describe("pictura: reparare de baza", () => {
  it("uneste varfurile dublate si scoate triunghiurile turtite, cu culorile la locul lor", () => {
    const soup = plasa(new THREE.BoxGeometry(10, 10, 10).toNonIndexed());
    soup.culori.forEach((_, i) => (soup.culori[i] = i % 5));
    const s = sudeazaVarfuri(soup);
    expect(s.varfuri.length / 3).toBe(8);
    expect(s.unite).toBe(36 - 8);
    expect(s.culori).toEqual(soup.culori);
  });

  it("inchide o gaura mica si capacul ia culoarea de langa el", () => {
    const p = cubSudat();
    p.culori.fill(2);
    const t = topologie(p);
    const fara = [...Array(12).keys()].filter((i) => !(t.normale[i * 3 + 1] > 0.99)); // fara fata de sus
    const gaura: Plasa = { varfuri: p.varfuri, fete: new Uint32Array(fara.flatMap((i) => [p.fete[i * 3], p.fete[i * 3 + 1], p.fete[i * 3 + 2]])), culori: new Uint8Array(fara.length).fill(2) };
    expect(laturiLibere(gaura)).toBe(4);
    const r = inchideGauri(gaura);
    expect(r.inchise).toBe(1);
    expect(laturiLibere(r)).toBe(0);
    expect([...r.culori].every((c) => c === 2)).toBe(true);
    expect(Math.abs(volum(r))).toBeCloseTo(8000, 1);
  });

  it("intoarce triunghiurile rasturnate si normalele ies in afara", () => {
    const p = cubSudat();
    const f = new Uint32Array(p.fete);
    for (const t of [0, 3, 7]) { const x = f[t * 3 + 1]; f[t * 3 + 1] = f[t * 3 + 2]; f[t * 3 + 2] = x; }
    const r = orienteazaNormale({ ...p, fete: f });
    expect(volum(r)).toBeCloseTo(8000, 2);
    // Tot cubul intors pe dos se indreapta si el.
    const pe_dos = new Uint32Array(p.fete);
    for (let t = 0; t < 12; t += 1) { const x = pe_dos[t * 3 + 1]; pe_dos[t * 3 + 1] = pe_dos[t * 3 + 2]; pe_dos[t * 3 + 2] = x; }
    expect(volum(orienteazaNormale({ ...p, fete: pe_dos }))).toBeCloseTo(8000, 2);
    expect(repara({ ...p, fete: f }).raport.intoarse).toBeGreaterThan(0);
  });

  it("simplificarea pastreaza forma si culorile pe zone", async () => {
    const p = plasa(new THREE.SphereGeometry(10, 64, 32));
    const t = topologie(p);
    for (let i = 0; i < t.triunghiuri; i += 1) p.culori[i] = t.centre[i * 3 + 1] > 0 ? 1 : 0;
    const s = await simplifica(sudeazaVarfuri(p), 800);
    expect(s.fete.length / 3).toBeLessThan(1200);
    const ts = topologie(s);
    let gresite = 0;
    for (let i = 0; i < ts.triunghiuri; i += 1) if (Math.abs(ts.centre[i * 3 + 1]) > 1.5 && s.culori[i] !== (ts.centre[i * 3 + 1] > 0 ? 1 : 0)) gresite += 1;
    expect(gresite).toBe(0);
  });
});

describe("pictura: geometria noua ajunge in editor", () => {
  it("corpul devine o plasa cu aceleasi triunghiuri, in aceeasi ordine si in acelasi loc, iar pictura se reaplica", () => {
    const box: WorkplaneShape = { id: "b", name: "Cub", kind: "box", color: "#15803d", x: 12, z: -7, elevation: 3, size: 20, width: 20, depth: 20, height: 20, rotation: 25 };
    const m = meshForShape(box);
    const p0 = sudeazaVarfuri({ ...plasaDin(m.vertices, m.faces), culori: new Uint8Array(m.faces.length) });
    const sel = new Uint8Array(p0.fete.length / 3).fill(1);
    const r = subdivizeaza(p0, sel, 4, 50_000);
    r.culori.forEach((_, i) => (r.culori[i] = i % 3));
    const nou = corpCuPlasaNoua(box, r);
    expect(nou.id).toBe("b");
    expect(nou.kind).toBe("mesh");
    const m2 = meshForShape(nou);
    expect(m2.faces.length).toBe(r.fete.length / 3);
    const t0 = topologie(r);
    const t1 = topologie(plasaDin(m2.vertices, m2.faces));
    for (let i = 0; i < t0.centre.length; i += 1) expect(t1.centre[i]).toBeCloseTo(t0.centre[i], 3);
    const salvata = salveazaPictura(corp(r), ["#ffffff", "#ff0000", "#0000ff"]);
    expect(reaplicaPictura(salvata, plasaDin(m2.vertices, m2.faces))).toEqual(r.culori);
  });
});
