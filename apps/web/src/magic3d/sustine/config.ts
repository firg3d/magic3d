import { getLanguage } from "@/lib/i18n";

/*
 * "Sustine Magic3D": un link benevol catre pagina de sustinere Praktik3D. Nimic din editor nu depinde
 * de el: nicio functie, niciun export, nicio limita. Adresa vine din NEXT_PUBLIC_SUPPORT_URL
 * (apps/web/.env.production); fara ea, butonul si nota nu apar deloc.
 */

/** Unde sta butonul; ajunge in utm_content, ca sa se vada in Shopify de unde vin sustinerile. */
export type LocSustinere = "support-footer" | "support-menu" | "support-after-export";

export const SUPPORT_URL = process.env.NEXT_PUBLIC_SUPPORT_URL?.trim() ?? "";

/** Adresa pentru un loc anume, cu utm_content-ul lui; null daca nu e configurata sau nu e o adresa valida. */
export function linkSustinere(loc: LocSustinere, baza: string = SUPPORT_URL): string | null {
  if (!baza) return null;
  try {
    const url = new URL(baza);
    url.searchParams.set("utm_content", loc);
    return url.href;
  } catch {
    return null;
  }
}

/** Evenimentul trimis de editor dupa un export reusit (STL, 3MF, STEP). */
export const EXPORT_REUSIT = "magic3d:export-reusit";
export const FORMATE_NOTA = ["STL", "3MF", "STEP"];

export function semnaleazaExport(format: string): void {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(EXPORT_REUSIT, { detail: { format } }));
}

/* Nota de dupa export: cel mult o data la 10 exporturi, niciodata dupa "Nu mai arata". */
export const LA_FIECARE = 10;
export const CHEIE_NUMAR = "magic3d.sustine.exporturi";
export const CHEIE_ASCUNS = "magic3d.sustine.ascuns";

export type Pastrare = { getItem(cheie: string): string | null; setItem(cheie: string, valoare: string): void };

function pastrare(): Pastrare | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Numara un export si spune daca nota apare acum: la primul export, apoi la al 11-lea, al 21-lea...
 * Fara localStorage (blocat, mod privat) nota nu apare deloc: mai bine nimic decat la fiecare export.
 */
export function numaraExport(store: Pastrare | null = pastrare()): boolean {
  if (!store) return false;
  try {
    if (store.getItem(CHEIE_ASCUNS) === "1") return false;
    const numar = (Number(store.getItem(CHEIE_NUMAR)) || 0) + 1;
    store.setItem(CHEIE_NUMAR, String(numar));
    return (numar - 1) % LA_FIECARE === 0;
  } catch {
    return false;
  }
}

export function nuMaiArata(store: Pastrare | null = pastrare()): void {
  try {
    store?.setItem(CHEIE_ASCUNS, "1");
  } catch {
    // fara stocare: nota tot nu mai apare in sesiunea asta (componenta o ascunde)
  }
}

const RO = {
  titlu: "Susține Magic3D",
  subtitlu: "Editorul rămâne gratuit pentru toți. Contribuția e benevolă.",
  notaTitlu: "Ți-a fost util? Susține Magic3D",
  nuMaiArata: "Nu mai arăta",
  inchide: "Închide",
} as const;
const EN: Record<keyof typeof RO, string> = {
  titlu: "Support Magic3D",
  subtitlu: "The editor stays free for everyone. Contributing is optional.",
  notaTitlu: "Was it useful? Support Magic3D",
  nuMaiArata: "Don't show again",
  inchide: "Close",
};

export const ts = (cheie: keyof typeof RO) => (getLanguage() === "ro" ? RO[cheie] : EN[cheie]);
