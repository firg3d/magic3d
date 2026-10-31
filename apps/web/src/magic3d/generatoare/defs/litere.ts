import type { GeneratorDef, Parametri } from "@/magic3d/generatoare/tipuri";

/*
 * Litere Decor: litera mare cu chenar si scris (relief, gravat sau in locas), din
 * src/apps/litere/main.ts (magic3d-legacy). Pozitia scrisului e numerica (offsetX/Y, rotatie,
 * adancime), nu trasa cu mouse-ul. Tematicile si bazele vin din biblioteca de modele, ca piese
 * separate aranjate cu uneltele editorului; diacriticele, permise vechi doar pe baza, raman afara.
 */

const CARACTERE = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", "&", "♥"];
const cuScris = (p: Parametri) => String(p.scris).trim().length > 0;
const ingropat = (p: Parametri) => cuScris(p) && p.modScris !== "relief";

export const LITERE: GeneratorDef = {
  id: "litere",
  titlu: "comutator.litereDecor",
  versiune: 1,
  implicit: {
    litera: "A",
    fontLitera: "Baloo2-Regular.ttf",
    inaltimeLitera: 120,
    grosimeLitera: 25,
    culoareLitera: "#889ec8",
    chenarActiv: true,
    latimeChenar: 3,
    adancimeChenar: 3,
    razaMuchie: 1.2,
    taiereBaza: 2,
    scris: "Andrei",
    fontScris: "Pacifico-Regular.ttf",
    inaltimeScris: 40,
    modScris: "locas",
    reliefScris: 2.5,
    grosimeScris: 4.5,
    jocInsertie: 0.2,
    pozitieScris: -1.04,
    offsetX: 0.84,
    offsetY: -35.2,
    rotatieScris: 0,
    culoareScris: "#ffffff",
  },
  parametri: [
    { cheie: "litera", tip: "alegere", eticheta: "litere.litera", grup: "litere.grupLitera", optiuni: CARACTERE.map((ch) => ({ valoare: ch, eticheta: ch })) },
    { cheie: "fontLitera", tip: "font", eticheta: "litere.fontLitera", grup: "litere.grupLitera" },
    { cheie: "inaltimeLitera", tip: "numar", eticheta: "litere.inaltimeCap", grup: "litere.grupLitera", min: 20, max: 300, pas: 1 },
    { cheie: "grosimeLitera", tip: "numar", eticheta: "litere.grosime", grup: "litere.grupLitera", min: 3, max: 60, pas: 0.5 },
    { cheie: "culoareLitera", tip: "culoare", eticheta: "litere.culoare", grup: "litere.grupLitera" },
    { cheie: "chenarActiv", tip: "bifa", eticheta: "litere.chenar", grup: "litere.grupLitera" },
    { cheie: "latimeChenar", tip: "numar", eticheta: "litere.latimeChenar", grup: "litere.grupLitera", min: 0.5, max: 15, pas: 0.5, vizibil: (p) => p.chenarActiv === true },
    { cheie: "adancimeChenar", tip: "numar", eticheta: "litere.adancimeChenar", grup: "litere.grupLitera", min: 0.5, max: 20, pas: 0.5, vizibil: (p) => p.chenarActiv === true },
    { cheie: "razaMuchie", tip: "numar", eticheta: "litere.razaMuchie", grup: "litere.grupLitera", min: 0, max: 3, pas: 0.1 },
    { cheie: "taiereBaza", tip: "numar", eticheta: "litere.taiereBaza", grup: "litere.grupLitera", min: 0, max: 15, pas: 0.5 },
    { cheie: "scris", tip: "text", eticheta: "litere.text", grup: "litere.grupScris" },
    { cheie: "fontScris", tip: "font", eticheta: "litere.fontScris", grup: "litere.grupScris", vizibil: cuScris },
    { cheie: "inaltimeScris", tip: "numar", eticheta: "litere.inaltime", grup: "litere.grupScris", min: 5, max: 200, pas: 1, vizibil: cuScris },
    {
      cheie: "modScris",
      tip: "alegere",
      eticheta: "litere.mod",
      grup: "litere.grupScris",
      vizibil: cuScris,
      optiuni: [
        { valoare: "relief", eticheta: "litere.modRelief" },
        { valoare: "gravat", eticheta: "litere.modGravat" },
        { valoare: "locas", eticheta: "litere.modLocas" },
      ],
    },
    { cheie: "reliefScris", tip: "numar", eticheta: "litere.relief", grup: "litere.grupScris", min: 0.4, max: 20, pas: 0.1, vizibil: cuScris },
    { cheie: "grosimeScris", tip: "numar", eticheta: "litere.grosimePiesa", grup: "litere.grupScris", min: 0.5, max: 30, pas: 0.5, vizibil: ingropat },
    { cheie: "pozitieScris", tip: "numar", eticheta: "litere.adancimeScris", grup: "litere.grupScris", min: -20, max: 0, pas: 0.1, vizibil: ingropat },
    { cheie: "jocInsertie", tip: "numar", eticheta: "litere.jocInsertie", grup: "litere.grupScris", min: 0, max: 1, pas: 0.05, vizibil: (p) => cuScris(p) && p.modScris === "locas" },
    { cheie: "offsetX", tip: "numar", eticheta: "litere.scrisX", grup: "litere.grupScris", min: -150, max: 150, pas: 0.5, vizibil: cuScris },
    { cheie: "offsetY", tip: "numar", eticheta: "litere.scrisY", grup: "litere.grupScris", min: -150, max: 150, pas: 0.5, vizibil: cuScris },
    { cheie: "rotatieScris", tip: "numar", eticheta: "litere.scrisRotatie", grup: "litere.grupScris", min: -180, max: 180, pas: 1, vizibil: cuScris },
    { cheie: "culoareScris", tip: "culoare", eticheta: "litere.culoare", grup: "litere.grupScris", vizibil: cuScris },
  ],
};
