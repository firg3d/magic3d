import type { GeneratorDef } from "@/magic3d/generatoare/tipuri";

/*
 * Brelocuri Articulate: valorile si limitele din src/apps/articulat/main.ts (magic3d-legacy).
 * ALTO_MIN e copiat din apps/articulat/articulat.ts (diametrul ochiului balamalei), ca panoul sa nu
 * traga geometria in pachetul interfetei; testul magic3dGen-rame il compara cu sursa.
 */
export const ALTO_MIN = 6;

export const ARTICULAT: GeneratorDef = {
  id: "articulat",
  titlu: "comutator.articulat",
  versiune: 1,
  implicit: {
    text: "CLAUDIU",
    font: "Baloo2-Regular.ttf",
    inaltimeLitera: 8,
    alturaLitera: 1,
    alto: 6,
    ancho: 12,
    largo: 15,
    linkPrim: true,
    linkUltim: false,
    culoareBaza: "#1D7400",
    culoareLitera: "#ffffff",
  },
  parametri: [
    { cheie: "text", tip: "text", eticheta: "articulat.text", grup: "articulat.grupText" },
    { cheie: "font", tip: "font", eticheta: "articulat.font", grup: "articulat.grupText" },
    { cheie: "inaltimeLitera", tip: "numar", eticheta: "articulat.inaltime", grup: "articulat.grupText", min: 4, max: 16, pas: 0.5 },
    { cheie: "alturaLitera", tip: "numar", eticheta: "articulat.altura", grup: "articulat.grupText", min: -4, max: 5, pas: 0.1 },
    { cheie: "alto", tip: "numar", eticheta: "articulat.alto", grup: "articulat.grupSegment", min: ALTO_MIN, max: 12, pas: 0.5 },
    { cheie: "ancho", tip: "numar", eticheta: "articulat.ancho", grup: "articulat.grupSegment", min: 8, max: 20, pas: 1 },
    { cheie: "largo", tip: "numar", eticheta: "articulat.largo", grup: "articulat.grupSegment", min: 10, max: 30, pas: 1 },
    { cheie: "culoareBaza", tip: "culoare", eticheta: "articulat.culoareBaza", grup: "articulat.grupCulori" },
    { cheie: "culoareLitera", tip: "culoare", eticheta: "articulat.culoareLitera", grup: "articulat.grupCulori" },
    { cheie: "linkPrim", tip: "bifa", eticheta: "articulat.linkPrim", grup: "articulat.grupBreloc" },
    { cheie: "linkUltim", tip: "bifa", eticheta: "articulat.linkUltim", grup: "articulat.grupBreloc" },
  ],
};
