/*
 * Datele modului Pictura: un index de culoare pe triunghi (Uint8Array), sloturile de filament si
 * amprenta plasei pe care s-a pictat.
 *
 * Indexul 0 e culoarea de baza a corpului (slotul 1, extruderul obiectului in slicer); indexul k
 * e slotul k + 1. Radiera pune 0.
 *
 * AMPRENTA: pictura tine de triunghiuri, deci se reaplica numai cat timp plasa e aceeasi. Corpul
 * poate fi mutat sau rotit in Editor 3D (ariile triunghiurilor nu se schimba); orice schimbare de
 * forma sau de marime schimba ariile, iar pictura nu se mai aplica.
 */

export const SLOTURI_MAXIME = 16;

export type PlasaPictura = {
  /** x,y,z pe varf, in coordonatele editorului (Y in sus). */
  varfuri: Float32Array;
  /** Trei indici de varf pe triunghi. */
  fete: Uint32Array;
};

export type CorpPictat = PlasaPictura & {
  id: string;
  nume: string;
  /** Index de culoare pe triunghi: 0 = baza, k = slotul k + 1. */
  culori: Uint8Array;
};

export type Amprenta = { triunghiuri: number; varfuri: number; arie: number; mostre: number[] };

/** Ce se salveaza in proiect pe corp. */
export type PicturaSalvata = {
  amprenta: Amprenta;
  /** Indexurile de culoare, pe sarituri (vezi codeazaCulori). */
  culori: string;
  /** Culorile sloturilor, "#rrggbb", slotul 1 primul. */
  sloturi: string[];
};

const MOSTRE = 48;

function arieTriunghi(v: Float32Array, a: number, b: number, c: number) {
  const ux = v[b * 3] - v[a * 3], uy = v[b * 3 + 1] - v[a * 3 + 1], uz = v[b * 3 + 2] - v[a * 3 + 2];
  const wx = v[c * 3] - v[a * 3], wy = v[c * 3 + 1] - v[a * 3 + 1], wz = v[c * 3 + 2] - v[a * 3 + 2];
  const x = uy * wz - uz * wy, y = uz * wx - ux * wz, z = ux * wy - uy * wx;
  return Math.sqrt(x * x + y * y + z * z) / 2;
}

export function amprentaPlasei(plasa: PlasaPictura): Amprenta {
  const n = plasa.fete.length / 3;
  let arie = 0;
  const mostre: number[] = [];
  const pas = Math.max(1, Math.floor(n / MOSTRE));
  for (let i = 0; i < n; i += 1) {
    const a = arieTriunghi(plasa.varfuri, plasa.fete[i * 3], plasa.fete[i * 3 + 1], plasa.fete[i * 3 + 2]);
    arie += a;
    if (i % pas === 0 && mostre.length < MOSTRE) mostre.push(Number(a.toFixed(5)));
  }
  return { triunghiuri: n, varfuri: plasa.varfuri.length / 3, arie: Number(arie.toFixed(4)), mostre };
}

/** Aceeasi plasa, cu o toleranta pentru rotunjirile unei mutari sau rotiri. */
export function aceeasiPlasa(a: Amprenta, b: Amprenta): boolean {
  // Varfurile nu conteaza: aceleasi triunghiuri pot veni sudate (din retusare) sau cate trei pe
  // triunghi (o plasa importata din editor).
  if (a.triunghiuri !== b.triunghiuri || a.mostre.length !== b.mostre.length) return false;
  const aproape = (x: number, y: number) => Math.abs(x - y) <= 1e-3 + 1e-4 * Math.max(Math.abs(x), Math.abs(y));
  return aproape(a.arie, b.arie) && a.mostre.every((m, i) => aproape(m, b.mostre[i]));
}

/*
 * Culorile in proiect: perechi (culoare, lungime) pe sarituri, lungimea ca varint, totul in base64.
 * O pictura are zone mari de aceeasi culoare; un milion de triunghiuri dintr-o culoare ocupa 5 octeti.
 */
export function codeazaCulori(culori: Uint8Array): string {
  const out: number[] = [];
  let i = 0;
  while (i < culori.length) {
    const c = culori[i];
    let j = i + 1;
    while (j < culori.length && culori[j] === c) j += 1;
    out.push(c);
    let lungime = j - i;
    while (lungime >= 0x80) { out.push((lungime & 0x7f) | 0x80); lungime >>>= 7; }
    out.push(lungime);
    i = j;
  }
  let binar = "";
  for (let k = 0; k < out.length; k += 0x8000) binar += String.fromCharCode(...out.slice(k, k + 0x8000));
  return btoa(binar);
}

export function decodeazaCulori(text: string, triunghiuri: number): Uint8Array | null {
  let binar: string;
  try { binar = atob(text); } catch { return null; }
  const out = new Uint8Array(triunghiuri);
  let poz = 0;
  let k = 0;
  while (k < binar.length) {
    const c = binar.charCodeAt(k++);
    let lungime = 0;
    let deplasare = 0;
    for (;;) {
      if (k >= binar.length) return null;
      const octet = binar.charCodeAt(k++);
      lungime |= (octet & 0x7f) << deplasare;
      if (!(octet & 0x80)) break;
      deplasare += 7;
      if (deplasare > 28) return null;
    }
    if (c >= SLOTURI_MAXIME || poz + lungime > triunghiuri) return null;
    out.fill(c, poz, poz + lungime);
    poz += lungime;
  }
  return poz === triunghiuri ? out : null;
}

const HEX = /^#[0-9a-f]{6}$/i;

export function estePicturaSalvata(value: unknown): value is PicturaSalvata {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const a = v.amprenta as Record<string, unknown> | undefined;
  return typeof v.culori === "string"
    && Array.isArray(v.sloturi) && v.sloturi.length >= 1 && v.sloturi.length <= SLOTURI_MAXIME && v.sloturi.every((s) => typeof s === "string" && HEX.test(s))
    && !!a && typeof a === "object"
    && [a.triunghiuri, a.varfuri, a.arie].every((x) => typeof x === "number" && Number.isFinite(x))
    && Array.isArray(a.mostre) && a.mostre.every((x) => typeof x === "number" && Number.isFinite(x));
}

export function salveazaPictura(corp: CorpPictat, sloturi: readonly string[]): PicturaSalvata {
  return { amprenta: amprentaPlasei(corp), culori: codeazaCulori(corp.culori), sloturi: [...sloturi] };
}

/**
 * Culorile salvate pentru o plasa, sau null daca plasa s-a schimbat (alta forma, alta marime) ori
 * datele sunt stricate. Indexurile peste numarul de sloturi cad pe baza.
 */
export function reaplicaPictura(salvata: PicturaSalvata, plasa: PlasaPictura): Uint8Array | null {
  if (!aceeasiPlasa(salvata.amprenta, amprentaPlasei(plasa))) return null;
  const culori = decodeazaCulori(salvata.culori, plasa.fete.length / 3);
  if (!culori) return null;
  for (let i = 0; i < culori.length; i += 1) if (culori[i] >= salvata.sloturi.length) culori[i] = 0;
  return culori;
}

/** Plasa unui corp din editor (varfuri si fete ca liste), in forma compacta a modului. */
export function plasaDin(vertices: readonly (readonly [number, number, number])[], faces: readonly (readonly [number, number, number])[]): PlasaPictura {
  const varfuri = new Float32Array(vertices.length * 3);
  vertices.forEach(([x, y, z], i) => { varfuri[i * 3] = x; varfuri[i * 3 + 1] = y; varfuri[i * 3 + 2] = z; });
  const fete = new Uint32Array(faces.length * 3);
  faces.forEach(([a, b, c], i) => { fete[i * 3] = a; fete[i * 3 + 1] = b; fete[i * 3 + 2] = c; });
  return { varfuri, fete };
}
