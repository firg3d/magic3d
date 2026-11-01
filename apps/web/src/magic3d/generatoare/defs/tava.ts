import { TAVA } from "@/magic3d/apps/tava/config";
import { t } from "@/magic3d/core/i18n/index";
import type { GeneratorDef, Parametri } from "@/magic3d/generatoare/tipuri";

/* Matrita tava (cavitati in grila, turnare deschisa) sau master pentru silicon. Limitele vin din apps/tava/config.ts. */

const din = (s: string) => (p: Parametri) => p.sursa === s;
const contur = (p: Parametri) => p.sursa !== "model";
const FORME = ["inima", "cerc", "patrat", "stea", "hexagon"] as const;

export const TAVA_DEF: GeneratorDef = {
  id: "tava",
  titlu: "comutator.tava",
  versiune: 1,
  categorie: "matrite",
  implicit: {
    mod: "tava",
    sursa: "forma",
    forma: "inima",
    imagine: "",
    hartaImagine: "",
    reliefPoza: false,
    inaltimeRelief: TAVA.reliefPoza,
    model: "",
    latime: 45,
    adancime: 18,
    draft: TAVA.draft,
    racordare: TAVA.racordare,
    randuri: 2,
    coloane: 3,
    distanta: 6,
    rama: 8,
    culoare: "#e11d48",
  },
  parametri: [
    { cheie: "mod", tip: "alegere", eticheta: "tava.mod", grup: "tava.grupForma", optiuni: [{ valoare: "tava", eticheta: "tava.modTava" }, { valoare: "master", eticheta: "tava.modMaster" }] },
    { cheie: "sursa", tip: "alegere", eticheta: "tava.sursa", grup: "tava.grupForma", optiuni: [{ valoare: "forma", eticheta: "tava.sursaForma" }, { valoare: "imagine", eticheta: "tava.sursaImagine" }, { valoare: "model", eticheta: "tava.sursaModel" }] },
    { cheie: "forma", tip: "alegere", eticheta: "tava.forma", grup: "tava.grupForma", vizibil: din("forma"), optiuni: FORME.map((f) => ({ valoare: f, eticheta: `tava.forma_${f}` })) },
    { cheie: "imagine", tip: "imagine", eticheta: "tava.imagine", grup: "tava.grupForma", vizibil: din("imagine"), harta: "hartaImagine", laturaHarta: TAVA.laturaHarta },
    { cheie: "reliefPoza", tip: "bifa", eticheta: "tava.reliefPoza", grup: "tava.grupForma", vizibil: din("imagine") },
    { cheie: "inaltimeRelief", tip: "numar", eticheta: "tava.inaltimeRelief", grup: "tava.grupForma", vizibil: (p) => p.sursa === "imagine" && p.reliefPoza === true, min: 0.4, max: 4, pas: 0.1 },
    { cheie: "model", tip: "model", eticheta: "tava.model", grup: "tava.grupForma", vizibil: din("model"), maxTriunghiuri: TAVA.maxTriunghiuri },
    { cheie: "latime", tip: "numar", eticheta: "tava.latime", grup: "tava.grupForma", min: TAVA.latimeMin, max: TAVA.latimeMax, pas: 1 },
    { cheie: "adancime", tip: "numar", eticheta: "tava.adancime", grup: "tava.grupForma", vizibil: contur, min: TAVA.adancimeMin, max: TAVA.adancimeMax, pas: 0.5 },
    { cheie: "draft", tip: "numar", eticheta: "tava.draft", grup: "tava.grupForma", vizibil: contur, min: 0, max: 10, pas: 0.5 },
    { cheie: "racordare", tip: "numar", eticheta: "tava.racordare", grup: "tava.grupForma", vizibil: contur, min: 0, max: 5, pas: 0.5 },
    { cheie: "randuri", tip: "numar", eticheta: "tava.randuri", grup: "tava.grupGrila", min: 1, max: TAVA.randuriMax, pas: 1 },
    { cheie: "coloane", tip: "numar", eticheta: "tava.coloane", grup: "tava.grupGrila", min: 1, max: TAVA.coloaneMax, pas: 1 },
    { cheie: "distanta", tip: "numar", eticheta: "tava.distanta", grup: "tava.grupGrila", min: 2, max: 20, pas: 0.5 },
    { cheie: "rama", tip: "numar", eticheta: "tava.rama", grup: "tava.grupGrila", min: 3, max: 25, pas: 0.5 },
    { cheie: "culoare", tip: "culoare", eticheta: "tava.culoare", grup: "tava.grupGrila" },
  ],
  instructiuni: (p) => t(p.mod === "master" ? "tava.instrMaster" : "tava.instrTava", { capac: TAVA.capacSilicon }),
};
