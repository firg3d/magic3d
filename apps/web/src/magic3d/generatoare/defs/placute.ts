import type { GeneratorDef, Parametri } from "@/magic3d/generatoare/tipuri";

/* Placute & Etichete: valorile si limitele din src/apps/placute/main.ts (magic3d-legacy). */

const prindere = (p: Parametri) => String(p.prindere);

export const PLACUTE: GeneratorDef = {
  id: "placute",
  titlu: "comutator.placute",
  versiune: 1,
  implicit: {
    text: "Ana",
    font: "Baloo2-Regular.ttf",
    inaltimeText: 24,
    reliefText: 1.8,
    latimePlacuta: 7,
    netezire: 2,
    grosimePlacuta: 3,
    prindere: "terus",
    diametruGaura: 4,
    lungimeTerus: 45,
    culoarePlacuta: "#15803d",
    culoareText: "#ffffff",
  },
  parametri: [
    { cheie: "text", tip: "text", eticheta: "placute.text", grup: "placute.grupText" },
    { cheie: "font", tip: "font", eticheta: "placute.font", grup: "placute.grupText" },
    { cheie: "inaltimeText", tip: "numar", eticheta: "placute.inaltime", grup: "placute.grupText", min: 8, max: 60, pas: 1 },
    { cheie: "reliefText", tip: "numar", eticheta: "placute.relief", grup: "placute.grupText", min: 0, max: 6, pas: 0.2 },
    { cheie: "culoareText", tip: "culoare", eticheta: "placute.culoareText", grup: "placute.grupText" },
    { cheie: "latimePlacuta", tip: "numar", eticheta: "placute.latime", grup: "placute.grupPlacuta", min: 2, max: 20, pas: 0.5 },
    { cheie: "grosimePlacuta", tip: "numar", eticheta: "placute.grosime", grup: "placute.grupPlacuta", min: 2, max: 8, pas: 0.5 },
    { cheie: "netezire", tip: "numar", eticheta: "placute.netezire", grup: "placute.grupPlacuta", min: 0, max: 6, pas: 0.5 },
    { cheie: "culoarePlacuta", tip: "culoare", eticheta: "placute.culoarePlacuta", grup: "placute.grupPlacuta" },
    {
      cheie: "prindere",
      tip: "alegere",
      eticheta: "placute.prindere",
      grup: "placute.grupPrindere",
      optiuni: [
        { valoare: "gaura", eticheta: "placute.prindGaura" },
        { valoare: "cablu", eticheta: "placute.prindCablu" },
        { valoare: "terus", eticheta: "placute.prindTerus" },
        { valoare: "pahar", eticheta: "placute.prindPahar" },
        { valoare: "magnet", eticheta: "placute.prindMagnet" },
      ],
    },
    {
      cheie: "diametruGaura",
      tip: "numar",
      eticheta: (p) => (prindere(p) === "magnet" ? "placute.diamMagnet" : "placute.diamGaura"),
      grup: "placute.grupPrindere",
      min: (p) => (prindere(p) === "magnet" ? 4 : 2),
      max: (p) => (prindere(p) === "magnet" ? 20 : 12),
      pas: 0.5,
    },
    { cheie: "lungimeTerus", tip: "numar", eticheta: "placute.lungimeTerus", grup: "placute.grupPrindere", min: 15, max: 90, pas: 1, vizibil: (p) => prindere(p) === "terus" },
  ],
};
