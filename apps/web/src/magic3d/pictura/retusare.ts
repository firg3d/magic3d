/*
 * Retusarea modelului inainte de pictura: subdivizare locala (triunghiuri prea mari pentru detaliu),
 * reparare de baza (varfuri dublate, gauri mici, normale intoarse) si simplificare. Nimic de aici nu
 * netezeste: punctele noi stau pe muchiile vechi, deci forma vizibila nu se schimba.
 *
 * Fiecare operatie pastreaza culorile: un triunghi impartit isi da culoarea copiilor, un capac de
 * gaura ia culoarea triunghiului de langa el, iar dupa simplificare fiecare triunghi nou ia culoarea
 * celui mai apropiat triunghi vechi.
 */
import { closeSmallMeshHoles } from "@/lib/meshHoleFill";
import { simplifyTrianglePositions } from "@/lib/meshSimplify";
import type { MeshData, Vec3 } from "@/lib/editorMeshCore";
import type { CorpPictat } from "@/magic3d/pictura/date";

export type Plasa = { varfuri: Float32Array; fete: Uint32Array; culori: Uint8Array };

function cheieLatura(a: number, b: number) {
  return a < b ? a * 4294967296 + b : b * 4294967296 + a;
}

function lungime2(v: ArrayLike<number>, a: number, b: number) {
  const dx = v[a * 3] - v[b * 3], dy = v[a * 3 + 1] - v[b * 3 + 1], dz = v[a * 3 + 2] - v[b * 3 + 2];
  return dx * dx + dy * dy + dz * dz;
}

export type RezultatSubdivizare = Plasa & { selectie: Uint8Array; adaugate: number; limitaAtinsa: boolean };

/**
 * Imparte triunghiurile selectate pana cand nicio latura nu mai e mai lunga de `lungimeMax` mm sau
 * pana la `triunghiuriMax` triunghiuri in total. Se taie mereu cea mai lunga latura, la mijloc, si
 * odata cu ea si triunghiul vecin de pe aceeasi latura: plasa ramane inchisa, fara crapaturi.
 * Plasa trebuie sa aiba varfurile sudate (vezi sudeazaVarfuri), altfel vecinii nu se vad.
 */
export function subdivizeaza(p: Plasa, selectie: Uint8Array, lungimeMax: number, triunghiuriMax: number): RezultatSubdivizare {
  const v: number[] = Array.from(p.varfuri);
  const f: number[] = Array.from(p.fete);
  const c: number[] = Array.from(p.culori);
  const sel: number[] = Array.from(selectie);
  const prag = Math.max(1e-6, lungimeMax) ** 2;
  const nInitial = f.length / 3;

  // latura -> triunghiurile ei (cel mult doua intr-o plasa buna)
  const laturi = new Map<number, number[]>();
  const leaga = (t: number) => {
    for (let e = 0; e < 3; e += 1) {
      const k = cheieLatura(f[t * 3 + e], f[t * 3 + ((e + 1) % 3)]);
      const l = laturi.get(k);
      if (l) { if (!l.includes(t)) l.push(t); } else laturi.set(k, [t]);
    }
  };
  const dezleaga = (t: number) => {
    for (let e = 0; e < 3; e += 1) {
      const k = cheieLatura(f[t * 3 + e], f[t * 3 + ((e + 1) % 3)]);
      const l = laturi.get(k);
      if (!l) continue;
      const i = l.indexOf(t);
      if (i >= 0) l.splice(i, 1);
      if (!l.length) laturi.delete(k);
    }
  };
  for (let t = 0; t < nInitial; t += 1) leaga(t);

  const mijloace = new Map<number, number>();
  const mijloc = (a: number, b: number) => {
    const k = cheieLatura(a, b);
    let m = mijloace.get(k);
    if (m === undefined) {
      m = v.length / 3;
      v.push((v[a * 3] + v[b * 3]) / 2, (v[a * 3 + 1] + v[b * 3 + 1]) / 2, (v[a * 3 + 2] + v[b * 3 + 2]) / 2);
      mijloace.set(k, m);
    }
    return m;
  };
  const ceaMaiLunga = (t: number): [number, number] => {
    let best = 0, bestL = -1;
    for (let e = 0; e < 3; e += 1) {
      const l = lungime2(v, f[t * 3 + e], f[t * 3 + ((e + 1) % 3)]);
      if (l > bestL) { bestL = l; best = e; }
    }
    return [best, bestL];
  };
  /** Taie triunghiul t pe latura e (de la varful e la e+1) cu varful m: t devine (a,m,c), se adauga (m,b,c). */
  const taie = (t: number, e: number, m: number) => {
    const a = f[t * 3 + e], b = f[t * 3 + ((e + 1) % 3)], x = f[t * 3 + ((e + 2) % 3)];
    dezleaga(t);
    f[t * 3] = a; f[t * 3 + 1] = m; f[t * 3 + 2] = x;
    const nou = f.length / 3;
    f.push(m, b, x);
    c.push(c[t]);
    sel.push(sel[t]);
    leaga(t);
    leaga(nou);
    return nou;
  };

  let limitaAtinsa = false;
  const coada: number[] = [];
  for (let t = 0; t < nInitial; t += 1) if (sel[t] && ceaMaiLunga(t)[1] > prag) coada.push(t);
  while (coada.length) {
    const t = coada.pop()!;
    const [e, l] = ceaMaiLunga(t);
    if (!sel[t] || l <= prag) continue;
    if (f.length / 3 + 2 > triunghiuriMax) { limitaAtinsa = true; break; }
    const a = f[t * 3 + e], b = f[t * 3 + ((e + 1) % 3)];
    const vecini = (laturi.get(cheieLatura(a, b)) ?? []).filter((u) => u !== t);
    const m = mijloc(a, b);
    const noi = [t, taie(t, e, m)];
    // Vecinul de pe aceeasi latura se taie si el, oricare ar fi latura lui cea mai lunga.
    for (const u of vecini.slice(0, 1)) {
      let eu = 0;
      for (let k = 0; k < 3; k += 1) {
        const p0 = f[u * 3 + k], p1 = f[u * 3 + ((k + 1) % 3)];
        if ((p0 === a && p1 === b) || (p0 === b && p1 === a)) eu = k;
      }
      noi.push(u, taie(u, eu, m));
    }
    for (const x of noi) if (sel[x] && ceaMaiLunga(x)[1] > prag) coada.push(x);
  }
  return {
    varfuri: new Float32Array(v),
    fete: new Uint32Array(f),
    culori: new Uint8Array(c),
    selectie: new Uint8Array(sel),
    adaugate: f.length / 3 - nInitial,
    limitaAtinsa,
  };
}

/**
 * Uneste varfurile aflate in acelasi loc (toleranta in mm) si scoate triunghiurile turtite intr-o
 * linie sau un punct. Ordinea triunghiurilor ramase nu se schimba; culorile le urmeaza.
 */
export function sudeazaVarfuri(p: Plasa, toleranta = 1e-4): Plasa & { unite: number; scoase: number; pastrate: Uint32Array } {
  const n = p.varfuri.length / 3;
  const harta = new Map<string, number>();
  const nou = new Int32Array(n);
  const v: number[] = [];
  for (let i = 0; i < n; i += 1) {
    const k = `${Math.round(p.varfuri[i * 3] / toleranta)},${Math.round(p.varfuri[i * 3 + 1] / toleranta)},${Math.round(p.varfuri[i * 3 + 2] / toleranta)}`;
    let id = harta.get(k);
    if (id === undefined) {
      id = v.length / 3;
      harta.set(k, id);
      v.push(p.varfuri[i * 3], p.varfuri[i * 3 + 1], p.varfuri[i * 3 + 2]);
    }
    nou[i] = id;
  }
  const f: number[] = [];
  const c: number[] = [];
  const pastrate: number[] = [];
  let scoase = 0;
  for (let t = 0; t < p.fete.length / 3; t += 1) {
    const a = nou[p.fete[t * 3]], b = nou[p.fete[t * 3 + 1]], x = nou[p.fete[t * 3 + 2]];
    if (a === b || b === x || x === a) { scoase += 1; continue; }
    f.push(a, b, x);
    c.push(p.culori[t]);
    pastrate.push(t);
  }
  return { varfuri: new Float32Array(v), fete: new Uint32Array(f), culori: new Uint8Array(c), unite: n - v.length / 3, scoase, pastrate: new Uint32Array(pastrate) };
}

/**
 * Intoarce triunghiurile ca toate sa aiba aceeasi orientare cu vecinii lor (o latura comuna se
 * parcurge in sensuri opuse), apoi fiecare bucata cu volum negativ se intoarce de tot, ca normalele
 * sa iasa in afara. Plasa trebuie sa aiba varfurile sudate.
 */
export function orienteazaNormale(p: Plasa): Plasa & { intoarse: number } {
  const f = new Uint32Array(p.fete);
  const n = f.length / 3;
  const laturi = new Map<number, number[]>();
  for (let t = 0; t < n; t += 1) for (let e = 0; e < 3; e += 1) {
    const k = cheieLatura(f[t * 3 + e], f[t * 3 + ((e + 1) % 3)]);
    const l = laturi.get(k);
    if (l) l.push(t); else laturi.set(k, [t]);
  }
  const directie = (t: number, a: number, b: number) => {
    for (let e = 0; e < 3; e += 1) if (f[t * 3 + e] === a && f[t * 3 + ((e + 1) % 3)] === b) return true;
    return false;
  };
  const intoarce = (t: number) => { const x = f[t * 3 + 1]; f[t * 3 + 1] = f[t * 3 + 2]; f[t * 3 + 2] = x; };
  const vazut = new Uint8Array(n);
  let intoarse = 0;
  for (let s = 0; s < n; s += 1) {
    if (vazut[s]) continue;
    const bucata: number[] = [s];
    vazut[s] = 1;
    for (let i = 0; i < bucata.length; i += 1) {
      const t = bucata[i];
      for (let e = 0; e < 3; e += 1) {
        const a = f[t * 3 + e], b = f[t * 3 + ((e + 1) % 3)];
        const l = laturi.get(cheieLatura(a, b))!;
        if (l.length !== 2) continue; // margine sau latura ne-manifold: nu decide nimic
        const u = l[0] === t ? l[1] : l[0];
        if (vazut[u]) continue;
        // Vecinul trebuie sa parcurga latura b -> a.
        if (directie(u, a, b)) { intoarce(u); intoarse += 1; }
        vazut[u] = 1;
        bucata.push(u);
      }
    }
    // Volumul (cu semn) al bucatii: negativ = normalele in interior.
    let vol = 0;
    for (const t of bucata) {
      const a = f[t * 3] * 3, b = f[t * 3 + 1] * 3, c = f[t * 3 + 2] * 3, w = p.varfuri;
      vol += w[a] * (w[b + 1] * w[c + 2] - w[b + 2] * w[c + 1]) - w[a + 1] * (w[b] * w[c + 2] - w[b + 2] * w[c]) + w[a + 2] * (w[b] * w[c + 1] - w[b + 1] * w[c]);
    }
    if (vol < 0) { for (const t of bucata) intoarce(t); intoarse += bucata.length; }
  }
  return { varfuri: p.varfuri, fete: f, culori: p.culori, intoarse };
}

/** Inchide gaurile mici (lib/meshHoleFill); capacele iau culoarea triunghiului de pe marginea lor. */
export function inchideGauri(p: Plasa): Plasa & { inchise: number; ramase: number } {
  const vertices: Vec3[] = [];
  for (let i = 0; i < p.varfuri.length; i += 3) vertices.push([p.varfuri[i], p.varfuri[i + 1], p.varfuri[i + 2]]);
  const faces: [number, number, number][] = [];
  for (let t = 0; t < p.fete.length / 3; t += 1) faces.push([p.fete[t * 3], p.fete[t * 3 + 1], p.fete[t * 3 + 2]]);
  const mesh: MeshData = { name: "pictura", vertices, faces };
  const rez = closeSmallMeshHoles(mesh);
  if (rez.closed === 0) return { ...p, inchise: 0, ramase: rez.open };
  // Plasa e sudata si fara triunghiuri turtite, deci triunghiurile vechi raman primele, in ordine.
  const n = p.fete.length / 3;
  const v = new Float32Array(rez.mesh.vertices.flatMap((x) => x));
  const f = new Uint32Array(rez.mesh.faces.flatMap((x) => x));
  const c = new Uint8Array(rez.mesh.faces.length);
  c.set(p.culori.subarray(0, Math.min(n, c.length)));
  const laturi = new Map<number, number>();
  for (let t = 0; t < n; t += 1) for (let e = 0; e < 3; e += 1) laturi.set(cheieLatura(f[t * 3 + e], f[t * 3 + ((e + 1) % 3)]), t);
  for (let t = n; t < c.length; t += 1) {
    for (let e = 0; e < 3; e += 1) {
      const vecin = laturi.get(cheieLatura(f[t * 3 + e], f[t * 3 + ((e + 1) % 3)]));
      if (vecin !== undefined) { c[t] = c[vecin]; break; }
    }
  }
  return { varfuri: v, fete: f, culori: c, inchise: rez.closed, ramase: rez.open };
}

export type RaportReparare = { unite: number; scoase: number; inchise: number; ramase: number; intoarse: number };

/** Repararea de baza, in ordine: sudare, gauri mici, orientarea normalelor. */
export function repara(p: Plasa): { plasa: Plasa; raport: RaportReparare } {
  const s = sudeazaVarfuri(p);
  const g = inchideGauri(s);
  const o = orienteazaNormale(g);
  return { plasa: { varfuri: o.varfuri, fete: o.fete, culori: o.culori }, raport: { unite: s.unite, scoase: s.scoase, inchise: g.inchise, ramase: g.ramase, intoarse: o.intoarse } };
}

/** Simplificare (lib/meshSimplify, meshoptimizer); culorile vin de la cel mai apropiat triunghi vechi. */
export async function simplifica(p: Plasa, tinta: number): Promise<Plasa> {
  const n = p.fete.length / 3;
  const soup = new Float32Array(n * 9);
  for (let t = 0; t < n; t += 1) for (let k = 0; k < 3; k += 1) {
    const i = p.fete[t * 3 + k] * 3;
    soup[t * 9 + k * 3] = p.varfuri[i]; soup[t * 9 + k * 3 + 1] = p.varfuri[i + 1]; soup[t * 9 + k * 3 + 2] = p.varfuri[i + 2];
  }
  const rez = await simplifyTrianglePositions(soup, tinta);
  const m = rez.positions.length / 9;
  // grila de centre vechi, ca sa gasim repede vecinul cel mai apropiat
  const centru = (arr: ArrayLike<number>, t: number, k: number) => (arr[t * 9 + k] + arr[t * 9 + 3 + k] + arr[t * 9 + 6 + k]) / 3;
  let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let t = 0; t < n; t += 1) for (let k = 0; k < 3; k += 1) { const x = centru(soup, t, k); if (x < min[k]) min[k] = x; if (x > max[k]) max[k] = x; }
  if (n === 0) { min = [0, 0, 0]; max = [0, 0, 0]; }
  const pas = Math.max(1e-3, Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]) / Math.max(1, Math.cbrt(n)));
  const celula = (x: number, y: number, z: number) => `${Math.floor((x - min[0]) / pas)},${Math.floor((y - min[1]) / pas)},${Math.floor((z - min[2]) / pas)}`;
  const grila = new Map<string, number[]>();
  for (let t = 0; t < n; t += 1) {
    const k = celula(centru(soup, t, 0), centru(soup, t, 1), centru(soup, t, 2));
    const l = grila.get(k);
    if (l) l.push(t); else grila.set(k, [t]);
  }
  const culori = new Uint8Array(m);
  for (let t = 0; t < m; t += 1) {
    const x = centru(rez.positions, t, 0), y = centru(rez.positions, t, 1), z = centru(rez.positions, t, 2);
    let best = -1, bestD = Infinity;
    for (let r = 1; best < 0 && r <= 8; r += 1) {
      const cx = Math.floor((x - min[0]) / pas), cy = Math.floor((y - min[1]) / pas), cz = Math.floor((z - min[2]) / pas);
      for (let a = -r; a <= r; a += 1) for (let b = -r; b <= r; b += 1) for (let d = -r; d <= r; d += 1) {
        for (const u of grila.get(`${cx + a},${cy + b},${cz + d}`) ?? []) {
          const dd = (centru(soup, u, 0) - x) ** 2 + (centru(soup, u, 1) - y) ** 2 + (centru(soup, u, 2) - z) ** 2;
          if (dd < bestD) { bestD = dd; best = u; }
        }
      }
    }
    culori[t] = best >= 0 ? p.culori[best] : 0;
  }
  const s = sudeazaVarfuri({ varfuri: new Float32Array(rez.positions), fete: new Uint32Array(m * 3).map((_, i) => i), culori });
  return { varfuri: s.varfuri, fete: s.fete, culori: s.culori };
}

/** Plasa unui corp pictat, pentru retusare. */
export const plasaCorpului = (c: CorpPictat): Plasa => ({ varfuri: c.varfuri, fete: c.fete, culori: c.culori });

/** Cati octeti ar avea un 3MF cu atatea triunghiuri (orientativ, pentru avertisment). */
export function marime3mfEstimata(triunghiuri: number) {
  // ~0,5 varfuri pe triunghi intr-o plasa inchisa, ~50 de octeti pe varf si ~60 pe triunghi in XML, comprimat ~4x
  return Math.round((triunghiuri * (0.5 * 50 + 60)) / 4);
}
