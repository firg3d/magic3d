import type { GeneratorDef, Parametri } from "@/magic3d/generatoare/tipuri";

/* Brelocuri: valorile si limitele din src/apps/brelocuri/main.ts (magic3d-legacy). */

const tip = (p: Parametri) => String(p.tipPrindere);

export const BRELOCURI: GeneratorDef = {
  id: "brelocuri",
  titlu: "comutator.brelocuri",
  versiune: 1,
  implicit: {
    text: "Mateo",
    font: "Baloo2-Regular.ttf",
    lungimePlacuta: 70,
    reliefLitera: 1.8,
    culoareLitera: "#FFFFFF",
    latimePlacuta: 3,
    netezire: 2,
    grosimePlacuta: 3,
    culoarePlacuta: "#E8709B",
    tipPrindere: "ureche",
    diametruGaura: 4,
    grosimePrindere: 2.5,
    latura: "stanga",
  },
  parametri: [
    { cheie: "text", tip: "text", eticheta: "brelocuri.text", grup: "brelocuri.grupLitera" },
    { cheie: "font", tip: "font", eticheta: "brelocuri.font", grup: "brelocuri.grupLitera" },
    // inaltimea literei nu se cere: rezulta din lungimea brelocului si lungimea numelui
    { cheie: "lungimePlacuta", tip: "numar", eticheta: "brelocuri.lungime", grup: "brelocuri.grupLitera", min: 25, max: 150, pas: 1 },
    { cheie: "reliefLitera", tip: "numar", eticheta: "brelocuri.relief", grup: "brelocuri.grupLitera", min: 0.6, max: 4, pas: 0.1 },
    { cheie: "culoareLitera", tip: "culoare", eticheta: "brelocuri.culoareLitera", grup: "brelocuri.grupLitera" },
    { cheie: "latimePlacuta", tip: "numar", eticheta: "brelocuri.latimePlacuta", grup: "brelocuri.grupPlacuta", min: 2, max: 15, pas: 0.5 },
    { cheie: "netezire", tip: "numar", eticheta: "brelocuri.netezire", grup: "brelocuri.grupPlacuta", min: 0, max: 6, pas: 0.5 },
    { cheie: "grosimePlacuta", tip: "numar", eticheta: "brelocuri.grosimePlacuta", grup: "brelocuri.grupPlacuta", min: 1.5, max: 6, pas: 0.5 },
    { cheie: "culoarePlacuta", tip: "culoare", eticheta: "brelocuri.culoarePlacuta", grup: "brelocuri.grupPlacuta" },
    {
      cheie: "tipPrindere",
      tip: "alegere",
      eticheta: "brelocuri.tip",
      grup: "brelocuri.grupPrindere",
      optiuni: [
        { valoare: "gaura", eticheta: "brelocuri.tipGaura" },
        { valoare: "ureche", eticheta: "brelocuri.tipUreche" },
        { valoare: "inel", eticheta: "brelocuri.tipInel" },
      ],
    },
    {
      cheie: "diametruGaura",
      tip: "numar",
      // aceeasi marime, alt nume: la inel gaura E interiorul inelului
      eticheta: (p) => (tip(p) === "inel" ? "brelocuri.diametruInterior" : "brelocuri.diametruGaura"),
      grup: "brelocuri.grupPrindere",
      min: 2,
      max: 20,
      pas: 0.5,
    },
    { cheie: "grosimePrindere", tip: "numar", eticheta: "brelocuri.grosimePrindere", grup: "brelocuri.grupPrindere", min: 1.5, max: 6, pas: 0.5, vizibil: (p) => tip(p) !== "gaura" },
    {
      cheie: "latura",
      tip: "alegere",
      eticheta: "brelocuri.latura",
      grup: "brelocuri.grupPrindere",
      optiuni: [
        { valoare: "stanga", eticheta: "brelocuri.laturaStanga" },
        { valoare: "dreapta", eticheta: "brelocuri.laturaDreapta" },
        { valoare: "sus", eticheta: "brelocuri.laturaSus" },
      ],
    },
  ],
};
