import type { GeneratorDef, Parametri } from "@/magic3d/generatoare/tipuri";

/*
 * Rame Tematice: valorile si limitele din src/apps/rame/main.ts (magic3d-legacy). Limitele care
 * acolo veneau din apps/rame/rame.ts sunt copiate aici, ca panoul sa nu traga geometria in pachetul
 * interfetei; testul magic3dGen-rame le compara cu sursa.
 */
export const LIMITE_RAME = { RAZA_MIN: 30, RAZA_MAX: 120, FIR_MIN: 2, FIR_MAX: 8, INFIGERE_MIN: 3, INFIGERE_MAX: 12 };
export const TIPURI_RAMA = ["panza", "stea", "inima", "cerc"];
const { RAZA_MIN, RAZA_MAX, FIR_MIN, FIR_MAX, INFIGERE_MIN, INFIGERE_MAX } = LIMITE_RAME;

const G_RAMA = "rame.grupRama";
const G_NUME = "rame.grupNume";
const G_GRAVURA = "rame.grupGravura";
const G_BAZA = "rame.grupBaza";

/** Infigerea nu poate depasi baza (ca in onControl-ul vechi): ar taia-o in doua. */
export const infigereMax = (p: Parametri) => Math.max(INFIGERE_MIN, Math.min(INFIGERE_MAX, Number(p.inaltimeBaza) - 2));

export const RAME: GeneratorDef = {
  id: "rame",
  titlu: "comutator.rame",
  versiune: 1,
  implicit: {
    text: "Maria",
    // cursiv din start: la fonturile drepte literele nu se ating, iar placuta ar iesi in bucati
    font: "GreatVibes-Regular.ttf",
    tip: "panza",
    raza: 50,
    grosimeFir: 3,
    colturi: 12,
    inele: 4,
    lasare: 0.18,
    grosimeRama: 6,
    culoareRama: "#3A3A3C",
    inaltimeText: 22,
    grosimeText: 5,
    culoareText: "#C9A227",
    latimeAura: 2.5,
    netezireAura: 2,
    culoareAura: "#1C1C1E",
    adancimeGravura: 0.8,
    jocGravura: 0.3,
    lungimeBaza: 120,
    latimeBaza: 30,
    inaltimeBaza: 12,
    adancimeInfigere: 6,
    jocInfigere: 0.2,
    latimePicior: 25,
    inaltimePicior: 3,
    culoareBaza: "#3A3A3C",
  },
  parametri: [
    {
      cheie: "tip",
      tip: "alegere",
      eticheta: "rame.tip",
      grup: G_RAMA,
      optiuni: TIPURI_RAMA.map((v) => ({ valoare: v, eticheta: `rame.tip_${v}` })),
    },
    { cheie: "raza", tip: "numar", eticheta: "rame.raza", grup: G_RAMA, min: RAZA_MIN, max: RAZA_MAX, pas: 5 },
    { cheie: "grosimeFir", tip: "numar", eticheta: "rame.grosimeFir", grup: G_RAMA, min: FIR_MIN, max: FIR_MAX, pas: 0.5 },
    { cheie: "colturi", tip: "numar", eticheta: "rame.colturi", grup: G_RAMA, min: 6, max: 24, pas: 1 },
    { cheie: "inele", tip: "numar", eticheta: "rame.inele", grup: G_RAMA, min: 1, max: 8, pas: 1 },
    { cheie: "lasare", tip: "numar", eticheta: "rame.lasare", grup: G_RAMA, min: 0, max: 0.4, pas: 0.02, vizibil: (p) => p.tip === "panza" },
    { cheie: "grosimeRama", tip: "numar", eticheta: "rame.grosimeRama", grup: G_RAMA, min: 3, max: 12, pas: 0.5 },
    { cheie: "culoareRama", tip: "culoare", eticheta: "rame.culoare", grup: G_RAMA },

    { cheie: "text", tip: "text", eticheta: "rame.text", grup: G_NUME },
    { cheie: "font", tip: "font", eticheta: "rame.font", grup: G_NUME },
    { cheie: "inaltimeText", tip: "numar", eticheta: "rame.inaltimeText", grup: G_NUME, min: 8, max: 60, pas: 1 },
    { cheie: "grosimeText", tip: "numar", eticheta: "rame.grosimeText", grup: G_NUME, min: 2, max: 15, pas: 0.5 },
    { cheie: "culoareText", tip: "culoare", eticheta: "rame.culoare", grup: G_NUME },
    { cheie: "latimeAura", tip: "numar", eticheta: "rame.latimeAura", grup: G_NUME, min: 0, max: 8, pas: 0.5 },
    { cheie: "netezireAura", tip: "numar", eticheta: "rame.netezireAura", grup: G_NUME, min: 0, max: 6, pas: 0.5, vizibil: (p) => Number(p.latimeAura) > 0 },
    { cheie: "culoareAura", tip: "culoare", eticheta: "rame.culoareAura", grup: G_NUME, vizibil: (p) => Number(p.latimeAura) > 0 },

    { cheie: "adancimeGravura", tip: "numar", eticheta: "rame.adancimeGravura", grup: G_GRAVURA, min: 0.2, max: 2, pas: 0.1 },
    { cheie: "jocGravura", tip: "numar", eticheta: "rame.jocGravura", grup: G_GRAVURA, min: 0, max: 1, pas: 0.1 },

    { cheie: "lungimeBaza", tip: "numar", eticheta: "rame.lungimeBaza", grup: G_BAZA, min: 60, max: 250, pas: 5 },
    { cheie: "latimeBaza", tip: "numar", eticheta: "rame.latimeBaza", grup: G_BAZA, min: 20, max: 80, pas: 2 },
    { cheie: "inaltimeBaza", tip: "numar", eticheta: "rame.inaltimeBaza", grup: G_BAZA, min: 6, max: 30, pas: 1 },
    { cheie: "adancimeInfigere", tip: "numar", eticheta: "rame.adancimeInfigere", grup: G_BAZA, min: INFIGERE_MIN, max: infigereMax, pas: 0.5 },
    { cheie: "jocInfigere", tip: "numar", eticheta: "rame.jocInfigere", grup: G_BAZA, min: 0, max: 0.6, pas: 0.05 },
    { cheie: "latimePicior", tip: "numar", eticheta: "rame.latimePicior", grup: G_BAZA, min: 10, max: 80, pas: 1 },
    { cheie: "inaltimePicior", tip: "numar", eticheta: "rame.inaltimePicior", grup: G_BAZA, min: 0, max: 10, pas: 0.5 },
    { cheie: "culoareBaza", tip: "culoare", eticheta: "rame.culoare", grup: G_BAZA },
  ],
};
