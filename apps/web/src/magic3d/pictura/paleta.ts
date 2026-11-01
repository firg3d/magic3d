/*
 * Paleta atelierului: filamentele Praktik3D de pe stoc, dintr-un fisier de config
 * (paleta-atelier.json), ca lista sa se schimbe fara cod. Structura e gandita sa poata veni mai
 * tarziu si dintr-un endpoint (Ecosis3D), dezactivat implicit.
 */
import date from "@/magic3d/pictura/paleta-atelier.json";
import { SLOTURI_MAXIME } from "@/magic3d/pictura/date";

export type Filament = { id: string; nume: string; material: string; hex: string; disponibil: boolean };

export type PaletaAtelier = {
  versiune: number;
  exemplu: boolean;
  sincronizare: { activ: boolean; url: string };
  filamente: Filament[];
};

const HEX = /^#[0-9a-f]{6}$/i;

export function estePaleta(value: unknown): value is PaletaAtelier {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const s = v.sincronizare as Record<string, unknown> | undefined;
  return typeof v.versiune === "number" && typeof v.exemplu === "boolean"
    && !!s && typeof s.activ === "boolean" && typeof s.url === "string"
    && Array.isArray(v.filamente) && v.filamente.every((f) => {
      const x = f as Record<string, unknown>;
      return typeof x.id === "string" && typeof x.nume === "string" && typeof x.material === "string"
        && typeof x.hex === "string" && HEX.test(x.hex) && typeof x.disponibil === "boolean";
    })
    && new Set((v.filamente as Filament[]).map((f) => f.id)).size === (v.filamente as unknown[]).length;
}

if (!estePaleta(date)) throw new Error("paleta-atelier.json nu are structura asteptata");

export const PALETA_ATELIER: PaletaAtelier = date;

/** Filamentul de pe stoc cu exact aceasta culoare, daca exista. */
export function filamentAtelier(hex: string): Filament | undefined {
  const h = hex.toLowerCase();
  return PALETA_ATELIER.filamente.find((f) => f.hex.toLowerCase() === h);
}

function departe(a: string, b: string) {
  const c = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  return Math.hypot(c(a, 0) - c(b, 0), c(a, 1) - c(b, 1), c(a, 2) - c(b, 2)) > 48;
}

/** Sloturile cu care incepe o pictura: baza corpului, apoi primele filamente disponibile. */
export function sloturiInitiale(culoareBaza: string | undefined, cate = 4): string[] {
  const baza = culoareBaza && HEX.test(culoareBaza) ? culoareBaza.toLowerCase() : PALETA_ATELIER.filamente[0].hex;
  // Un filament aproape de culoarea bazei (alb pe alb) n-ar arata nimic pe model.
  const restul = PALETA_ATELIER.filamente.filter((f) => f.disponibil && departe(f.hex, baza)).map((f) => f.hex.toLowerCase());
  return [baza, ...restul].slice(0, Math.min(SLOTURI_MAXIME, Math.max(1, cate)));
}

/** Sincronizarea cu un endpoint: numai daca e pornita in config si raspunsul are aceeasi structura. */
export async function paletaSincronizata(fetchFn: typeof fetch = fetch): Promise<PaletaAtelier> {
  if (!PALETA_ATELIER.sincronizare.activ || !PALETA_ATELIER.sincronizare.url) return PALETA_ATELIER;
  try {
    const raspuns = await fetchFn(PALETA_ATELIER.sincronizare.url, { cache: "no-store" });
    const json: unknown = await raspuns.json();
    return estePaleta(json) ? json : PALETA_ATELIER;
  } catch {
    return PALETA_ATELIER;
  }
}
