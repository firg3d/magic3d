import { PRESA } from "@/magic3d/apps/presa/config";
import { t } from "@/magic3d/core/i18n/index";
import type { GeneratorDef, Parametri } from "@/magic3d/generatoare/tipuri";

/* Presa de hartie (embosser): cleste cu balama print-in-place sau doua placi cu stifturi. Limitele vin din apps/presa/config.ts. */

const cuText = (p: Parametri) => p.continut !== "imagine";
const cuImagine = (p: Parametri) => p.continut !== "text";

export const PRESA_DEF: GeneratorDef = {
  id: "presa",
  titlu: "comutator.presa",
  versiune: 1,
  categorie: "personalizate",
  implicit: {
    corp: "cleste",
    continut: "text",
    text: "Ex Libris",
    font: "Baloo2-800.ttf",
    imagine: "",
    diametru: 36,
    bordura: 1,
    relief: 0.8,
    hartie: PRESA.hartie,
    culoarePozitiv: "#2563eb",
    culoareNegativ: "#2563eb",
  },
  parametri: [
    { cheie: "corp", tip: "alegere", eticheta: "presa.corp", grup: "presa.grupCorp", optiuni: [{ valoare: "cleste", eticheta: "presa.corpCleste" }, { valoare: "placi", eticheta: "presa.corpPlaci" }] },
    { cheie: "hartie", tip: "numar", eticheta: "presa.hartie", grup: "presa.grupCorp", min: 0.08, max: 0.6, pas: 0.02 },
    { cheie: "culoarePozitiv", tip: "culoare", eticheta: "presa.culoarePozitiv", grup: "presa.grupCorp" },
    { cheie: "culoareNegativ", tip: "culoare", eticheta: "presa.culoareNegativ", grup: "presa.grupCorp" },
    { cheie: "continut", tip: "alegere", eticheta: "presa.continut", grup: "presa.grupEmblema", optiuni: [{ valoare: "text", eticheta: "stampila.continutText" }, { valoare: "imagine", eticheta: "stampila.continutImagine" }, { valoare: "ambele", eticheta: "stampila.continutAmbele" }] },
    { cheie: "text", tip: "text", eticheta: "presa.text", grup: "presa.grupEmblema", vizibil: cuText },
    { cheie: "font", tip: "font", eticheta: "presa.font", grup: "presa.grupEmblema", vizibil: cuText },
    { cheie: "imagine", tip: "imagine", eticheta: "presa.imagine", grup: "presa.grupEmblema", vizibil: cuImagine },
    { cheie: "diametru", tip: "numar", eticheta: "presa.diametru", grup: "presa.grupEmblema", min: PRESA.diametruMin, max: PRESA.diametruMax, pas: 1 },
    { cheie: "bordura", tip: "numar", eticheta: "presa.bordura", grup: "presa.grupEmblema", min: 0, max: 3, pas: 0.5 },
    { cheie: "relief", tip: "numar", eticheta: "presa.relief", grup: "presa.grupEmblema", min: 0.5, max: 1.5, pas: 0.1 },
  ],
  instructiuni: (p) => t(p.corp === "placi" ? "presa.instrPlaci" : "presa.instrCleste", { joc: (Number(p.hartie) + PRESA.toleranta).toFixed(2) }),
};
