import type { GeneratorDef, Parametri } from "@/magic3d/generatoare/tipuri";

/* Litere Fagure: valorile, limitele si conditiile din src/apps/fagure/main.ts (magic3d-legacy). */

const agatare = (p: Parametri) => String(p.tipAgatare);

/** Litera sta in picioare: diacriticele n-au pe ce se sprijini, deci nu se ofera (ca in main.ts vechi). */
export const CARACTERE_FAGURE = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"];

/** Ordinea din meniu: intai cele geometrice, apoi cele decorative. */
const MODELE = ["fagure", "perforat", "voronoi", "diagonal", "triunghiular", "caramida", "valuri", "radial", "spirala"];
const cheieModel = (m: string) => "fagure.model" + m[0].toUpperCase() + m.slice(1);

export const FAGURE: GeneratorDef = {
  id: "fagure",
  titlu: "comutator.fagure",
  versiune: 1,
  implicit: {
    litera: "A",
    font: "ArchivoBlack-Regular.ttf",
    inaltimeLitera: 120,
    // 14 mm, nu 8: la 120 mm o placa de 8 mm se rastoarna la 4 grade (vezi main.ts vechi)
    grosime: 14,
    taiereBaza: 0,
    culoare: "#e8709b",
    tipAgatare: "fara",
    surubCap: 5,
    surubTija: 2.5,
    inaltimeCapSurub: 3,
    capacel: true,
    grosimeCapac: 2,
    latimeGrila: 20,
    model: "fagure",
    modModel: "strapuns",
    adancimeGravare: 2,
    culoareModel: "#f0a02c",
    pasCelula: 8,
    grosimePerete: 1.2,
    latimeRama: 2.5,
    talpaPlina: 6,
    unghiModel: 0,
    variantaModel: 1,
  },
  parametri: [
    {
      cheie: "litera",
      tip: "alegere",
      eticheta: "fagure.litera",
      grup: "fagure.grupLitera",
      optiuni: CARACTERE_FAGURE.map((c) => ({ valoare: c, eticheta: c })),
    },
    { cheie: "font", tip: "font", eticheta: "fagure.font", grup: "fagure.grupLitera" },
    { cheie: "inaltimeLitera", tip: "numar", eticheta: "fagure.inaltime", grup: "fagure.grupLitera", min: 40, max: 250, pas: 5 },
    { cheie: "grosime", tip: "numar", eticheta: "fagure.grosime", grup: "fagure.grupLitera", min: 3, max: 25, pas: 0.5 },
    { cheie: "taiereBaza", tip: "numar", eticheta: "fagure.taiereBaza", grup: "fagure.grupLitera", min: 0, max: 5, pas: 0.5 },
    { cheie: "culoare", tip: "culoare", eticheta: "fagure.culoare", grup: "fagure.grupLitera" },

    {
      cheie: "tipAgatare",
      tip: "alegere",
      eticheta: "fagure.tipAgatare",
      grup: "fagure.grupAgatare",
      optiuni: [
        { valoare: "fara", eticheta: "fagure.agatareFara" },
        { valoare: "cheie", eticheta: "fagure.agatareCheie" },
        { valoare: "grila", eticheta: "fagure.agatareGrila" },
        { valoare: "gaura", eticheta: "fagure.agatareGaura" },
      ],
    },
    { cheie: "surubCap", tip: "numar", eticheta: "fagure.surubCap", grup: "fagure.grupAgatare", min: 5, max: 16, pas: 0.5, vizibil: (p) => agatare(p) === "cheie" || agatare(p) === "gaura" },
    { cheie: "surubTija", tip: "numar", eticheta: "fagure.surubTija", grup: "fagure.grupAgatare", min: 2, max: 8, pas: 0.5, vizibil: (p) => agatare(p) === "cheie" || agatare(p) === "gaura" },
    { cheie: "latimeGrila", tip: "numar", eticheta: "fagure.latimeGrila", grup: "fagure.grupAgatare", min: 12, max: 80, pas: 2, vizibil: (p) => agatare(p) === "grila" },
    { cheie: "inaltimeCapSurub", tip: "numar", eticheta: "fagure.inaltimeCapSurub", grup: "fagure.grupAgatare", min: 1.5, max: 8, pas: 0.5, vizibil: (p) => agatare(p) !== "fara" },
    { cheie: "capacel", tip: "bifa", eticheta: "fagure.capacel", grup: "fagure.grupAgatare", vizibil: (p) => agatare(p) === "gaura" },
    { cheie: "grosimeCapac", tip: "numar", eticheta: "fagure.grosimeCapac", grup: "fagure.grupAgatare", min: 1, max: 6, pas: 0.5, vizibil: (p) => agatare(p) === "gaura" && p.capacel === true },

    {
      cheie: "model",
      tip: "alegere",
      eticheta: "fagure.model",
      grup: "fagure.grupModel",
      optiuni: MODELE.map((m) => ({ valoare: m, eticheta: cheieModel(m) })),
    },
    {
      cheie: "modModel",
      tip: "alegere",
      eticheta: "fagure.modModel",
      grup: "fagure.grupModel",
      optiuni: [
        { valoare: "strapuns", eticheta: "fagure.modStrapuns" },
        { valoare: "gravat", eticheta: "fagure.modGravat" },
      ],
    },
    { cheie: "adancimeGravare", tip: "numar", eticheta: "fagure.adancimeGravare", grup: "fagure.grupModel", min: 0.6, max: 8, pas: 0.2, vizibil: (p) => p.modModel === "gravat" },
    { cheie: "culoareModel", tip: "culoare", eticheta: "fagure.culoareModel", grup: "fagure.grupModel", vizibil: (p) => p.modModel === "gravat" },
    { cheie: "pasCelula", tip: "numar", eticheta: "fagure.pasCelula", grup: "fagure.grupModel", min: 4, max: 20, pas: 0.5 },
    { cheie: "grosimePerete", tip: "numar", eticheta: "fagure.grosimePerete", grup: "fagure.grupModel", min: 0.8, max: 3, pas: 0.1 },
    { cheie: "latimeRama", tip: "numar", eticheta: "fagure.latimeRama", grup: "fagure.grupModel", min: 1.5, max: 6, pas: 0.5 },
    { cheie: "talpaPlina", tip: "numar", eticheta: "fagure.talpaPlina", grup: "fagure.grupModel", min: 0, max: 25, pas: 1 },
    { cheie: "unghiModel", tip: "numar", eticheta: "fagure.unghiModel", grup: "fagure.grupModel", min: 0, max: 90, pas: 5 },
    // "varianta" schimba doar voronoi; la celelalte ar fi un buton mort
    { cheie: "variantaModel", tip: "numar", eticheta: "fagure.varianta", grup: "fagure.grupModel", min: 1, max: 999, pas: 1, vizibil: (p) => p.model === "voronoi" },
  ],
};
