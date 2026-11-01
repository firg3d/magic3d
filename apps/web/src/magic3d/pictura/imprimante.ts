/*
 * Cate culori duce imprimanta: sistemele multicolor si legatura lor cu profilele de imprimanta
 * din editor stau in imprimante-multicolor.json, nu in cod. Aici: alegerea sistemului dupa
 * profil, limita de culori si estimarile de schimbari, material si timp.
 */
import date from "@/magic3d/pictura/imprimante-multicolor.json";
import { SLOTURI_MAXIME, type CorpPictat } from "@/magic3d/pictura/date";

export type SistemMulticolor = {
  id: string;
  nume: { ro: string; en: string };
  culoriPeUnitate: number;
  unitatiMax: number;
  gramePerSchimbare: number;
  secundePerSchimbare: number;
};

type Config = { alegeriManuale: number[]; sisteme: SistemMulticolor[]; profile: { profil: string; sistem: string }[] };

function esteConfig(v: unknown): v is Config {
  if (!v || typeof v !== "object") return false;
  const c = v as Record<string, unknown>;
  const sisteme = c.sisteme as SistemMulticolor[] | undefined;
  return Array.isArray(c.alegeriManuale) && c.alegeriManuale.every((n) => Number.isInteger(n) && n >= 1 && n <= SLOTURI_MAXIME)
    && Array.isArray(sisteme) && sisteme.length > 0 && sisteme.every((s) => typeof s.id === "string" && typeof s.nume?.ro === "string" && typeof s.nume?.en === "string"
      && [s.culoriPeUnitate, s.unitatiMax, s.gramePerSchimbare, s.secundePerSchimbare].every((x) => typeof x === "number" && x >= 0))
    && Array.isArray(c.profile) && (c.profile as { profil: unknown; sistem: unknown }[]).every((p) => typeof p.profil === "string" && sisteme.some((s) => s.id === p.sistem));
}

if (!esteConfig(date)) throw new Error("imprimante-multicolor.json nu are structura asteptata");
export const IMPRIMANTE: Config = date;

export function sistem(id: string): SistemMulticolor {
  return IMPRIMANTE.sisteme.find((s) => s.id === id) ?? IMPRIMANTE.sisteme[0];
}

/** Sistemul unui profil de imprimanta din editor (id-ul presetului); prima regula care se potriveste. */
export function sistemPentruProfil(profil: string | null | undefined): SistemMulticolor | null {
  if (!profil) return null;
  for (const regula of IMPRIMANTE.profile) {
    const potrivire = regula.profil.endsWith("*") ? profil.startsWith(regula.profil.slice(0, -1)) : profil === regula.profil;
    if (potrivire) return sistem(regula.sistem);
  }
  return null;
}

/** Cate culori duce sistemul cu atatea unitati; niciodata peste cat poate scrie un 3MF (16). */
export function limitaCulori(s: SistemMulticolor, unitati = 1): number {
  const u = Math.max(1, Math.min(s.unitatiMax, Math.round(unitati)));
  return Math.max(1, Math.min(SLOTURI_MAXIME, s.culoriPeUnitate * u));
}

export type Estimare = { straturi: number; schimbari: number; grame: number; secunde: number };

/**
 * Estimare orientativa: modelul se taie in straturi de `strat` mm (Y e inaltimea); in fiecare strat
 * se numara culorile prezente. Un slicer ordoneaza culorile ca ultima dintr-un strat sa fie prima in
 * urmatorul, deci un strat cu c culori costa c - 1 schimbari, plus una cand doua straturi vecine nu
 * au nicio culoare comuna.
 */
export function estimeaza(corpuri: readonly CorpPictat[], s: SistemMulticolor, strat = 0.2): Estimare {
  let yMin = Infinity, yMax = -Infinity;
  for (const c of corpuri) for (let i = 1; i < c.varfuri.length; i += 3) {
    if (c.varfuri[i] < yMin) yMin = c.varfuri[i];
    if (c.varfuri[i] > yMax) yMax = c.varfuri[i];
  }
  if (!Number.isFinite(yMin) || yMax - yMin < strat / 2) return { straturi: 0, schimbari: 0, grame: 0, secunde: 0 };
  const straturi = Math.max(1, Math.ceil((yMax - yMin) / strat));
  // diferente pe slot: +1 la primul strat atins de un triunghi, -1 dupa ultimul
  const dif = Array.from({ length: SLOTURI_MAXIME }, () => new Int32Array(straturi + 1));
  for (const c of corpuri) {
    const n = c.fete.length / 3;
    for (let t = 0; t < n; t += 1) {
      let lo = Infinity, hi = -Infinity;
      for (let k = 0; k < 3; k += 1) {
        const y = c.varfuri[c.fete[t * 3 + k] * 3 + 1];
        if (y < lo) lo = y;
        if (y > hi) hi = y;
      }
      const a = Math.max(0, Math.min(straturi - 1, Math.floor((lo - yMin) / strat)));
      const b = Math.max(a, Math.min(straturi - 1, Math.floor((hi - yMin) / strat)));
      const slot = Math.min(SLOTURI_MAXIME - 1, c.culori[t]);
      dif[slot][a] += 1;
      dif[slot][b + 1] -= 1;
    }
  }
  const curent = new Int32Array(SLOTURI_MAXIME);
  let schimbari = 0;
  let anterior = 0; // masca de biti a culorilor din stratul anterior
  for (let l = 0; l < straturi; l += 1) {
    let masca = 0, nr = 0;
    for (let s2 = 0; s2 < SLOTURI_MAXIME; s2 += 1) {
      curent[s2] += dif[s2][l];
      if (curent[s2] > 0) { masca |= 1 << s2; nr += 1; }
    }
    if (nr > 0) {
      schimbari += nr - 1;
      if (anterior && !(anterior & masca)) schimbari += 1;
      anterior = masca;
    }
  }
  if (s.culoriPeUnitate * s.unitatiMax <= 1) schimbari = 0;
  return {
    straturi,
    schimbari,
    grame: Math.round(schimbari * s.gramePerSchimbare * 10) / 10,
    secunde: Math.round(schimbari * s.secundePerSchimbare),
  };
}
