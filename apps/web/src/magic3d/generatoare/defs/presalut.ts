import { PRESA_LUT } from "@/magic3d/apps/presalut/config";
import { STAMPILA } from "@/magic3d/apps/stampila/config";
import { t } from "@/magic3d/core/i18n/index";
import type { GeneratorDef, Parametri } from "@/magic3d/generatoare/tipuri";

/*
 * Presa pentru lut si sapun: doua jumatati cu cavitate (canal de surplus, stifturi de centrare) sau o
 * singura fata, ca o stampila mare de sapun (aceeasi geometrie ca stampila pentru lut).
 */

const doua = (p: Parametri) => p.tip === "doua";
const fata = (p: Parametri) => p.tip === "fata";
const FORME = ["patrat", "cerc", "inima", "hexagon", "stea"] as const;

export const PRESA_LUT_DEF: GeneratorDef = {
  id: "presalut",
  titlu: "comutator.presalut",
  versiune: 1,
  categorie: "matrite",
  implicit: {
    tip: "doua",
    sursa: "forma",
    forma: "patrat",
    imagine: "",
    latime: 70,
    adancime: 10,
    perete: 4,
    draft: PRESA_LUT.draft,
    racordare: PRESA_LUT.racordare,
    text: "Lavanda",
    font: "Baloo2-800.ttf",
    continut: "text",
    formaFata: "rotunda",
    relief: 3,
    maner: "ciuperca",
    culoare: "#7c3aed",
  },
  parametri: [
    { cheie: "tip", tip: "alegere", eticheta: "presalut.tip", grup: "presalut.grupForma", optiuni: [{ valoare: "doua", eticheta: "presalut.tipDoua" }, { valoare: "fata", eticheta: "presalut.tipFata" }] },
    { cheie: "sursa", tip: "alegere", eticheta: "presalut.sursa", grup: "presalut.grupForma", vizibil: doua, optiuni: [{ valoare: "forma", eticheta: "tava.sursaForma" }, { valoare: "imagine", eticheta: "tava.sursaImagine" }] },
    { cheie: "forma", tip: "alegere", eticheta: "tava.forma", grup: "presalut.grupForma", vizibil: (p) => doua(p) && p.sursa === "forma", optiuni: FORME.map((f) => ({ valoare: f, eticheta: `tava.forma_${f}` })) },
    { cheie: "continut", tip: "alegere", eticheta: "stampila.continut", grup: "presalut.grupForma", vizibil: fata, optiuni: [{ valoare: "text", eticheta: "stampila.continutText" }, { valoare: "imagine", eticheta: "stampila.continutImagine" }, { valoare: "ambele", eticheta: "stampila.continutAmbele" }] },
    { cheie: "imagine", tip: "imagine", eticheta: "tava.imagine", grup: "presalut.grupForma", vizibil: (p) => (doua(p) ? p.sursa === "imagine" : p.continut !== "text") },
    { cheie: "formaFata", tip: "alegere", eticheta: "stampila.forma", grup: "presalut.grupForma", vizibil: fata, optiuni: (["rotunda", "patrata", "dreptunghi", "contur"] as const).map((f) => ({ valoare: f, eticheta: `stampila.forma_${f}` })) },
    { cheie: "latime", tip: "numar", eticheta: "presalut.latime", grup: "presalut.grupForma", min: PRESA_LUT.latimeMin, max: (p) => (fata(p) ? STAMPILA.latimeMax : PRESA_LUT.latimeMax), pas: 1 },
    { cheie: "adancime", tip: "numar", eticheta: "presalut.adancime", grup: "presalut.grupForma", vizibil: doua, min: PRESA_LUT.adancimeMin, max: PRESA_LUT.adancimeMax, pas: 0.5 },
    { cheie: "relief", tip: "numar", eticheta: "presalut.relief", grup: "presalut.grupForma", vizibil: fata, min: 2, max: 6, pas: 0.5 },
    { cheie: "perete", tip: "numar", eticheta: "presalut.perete", grup: "presalut.grupForma", vizibil: doua, min: PRESA_LUT.pereteMin, max: PRESA_LUT.pereteMax, pas: 0.2 },
    { cheie: "draft", tip: "numar", eticheta: "tava.draft", grup: "presalut.grupForma", vizibil: doua, min: 0, max: 10, pas: 0.5 },
    { cheie: "racordare", tip: "numar", eticheta: "tava.racordare", grup: "presalut.grupForma", vizibil: doua, min: 0, max: 5, pas: 0.5 },
    { cheie: "text", tip: "text", eticheta: (p) => (doua(p) ? "presalut.textSus" : "stampila.text"), grup: "presalut.grupText", vizibil: (p) => doua(p) || p.continut !== "imagine" },
    { cheie: "font", tip: "font", eticheta: "stampila.font", grup: "presalut.grupText", vizibil: (p) => doua(p) || p.continut !== "imagine" },
    { cheie: "maner", tip: "alegere", eticheta: "stampila.maner", grup: "presalut.grupText", vizibil: fata, optiuni: (["ciuperca", "cilindru", "bloc"] as const).map((f) => ({ valoare: f, eticheta: `stampila.maner_${f}` })) },
    { cheie: "culoare", tip: "culoare", eticheta: "tava.culoare", grup: "presalut.grupText" },
  ],
  instructiuni: (p) => t(doua(p) ? "presalut.instrDoua" : "stampila.instrLut"),
};
