import { CULORI_GLOB_MODELE, FONT_GLOB_MODELE, FONTURI_CRACIUN, GLOB_MODELE } from "@/magic3d/apps/craciun/config";
import { t } from "@/magic3d/core/i18n/index";
import type { GeneratorDef, Parametri } from "@/magic3d/generatoare/tipuri";

/* Globuri cu modele (colectia "Craciun"). Limitele vin din apps/craciun/config.ts. */

const MODELE = ["nervuri", "rasucite", "spirala", "fante", "romburi", "hexagoane", "fatete"] as const;
const areNume = (p: Parametri) => String(p.text ?? "").trim() !== "";

export const GLOB_MODELE_DEF: GeneratorDef = {
  id: "glob-modele",
  titlu: "comutator.globModele",
  versiune: 1,
  categorie: "craciun",
  implicit: {
    diametru: GLOB_MODELE.diametru,
    constructie: "jumatati",
    perete: GLOB_MODELE.perete,
    culoare: CULORI_GLOB_MODELE.glob,
    model: "rasucite",
    numar: GLOB_MODELE.numar,
    adancime: GLOB_MODELE.adancime,
    rasucire: GLOB_MODELE.rasucire,
    ture: GLOB_MODELE.ture,
    latimeFanta: GLOB_MODELE.latimeFanta,
    culoareCapac: CULORI_GLOB_MODELE.capac,
    text: "",
    font: FONT_GLOB_MODELE,
    culoareText: CULORI_GLOB_MODELE.glob,
  },
  parametri: [
    { cheie: "diametru", tip: "numar", eticheta: "globModele.diametru", grup: "globModele.grupGlob", min: GLOB_MODELE.diametruMin, max: GLOB_MODELE.diametruMax, pas: 1 },
    { cheie: "constructie", tip: "alegere", eticheta: "globModele.constructie", grup: "globModele.grupGlob", optiuni: ["jumatati", "vaza"].map((v) => ({ valoare: v, eticheta: `globModele.constructie_${v}` })) },
    { cheie: "perete", tip: "numar", eticheta: "globModele.perete", grup: "globModele.grupGlob", vizibil: (p) => p.constructie !== "vaza", min: GLOB_MODELE.pereteMin, max: GLOB_MODELE.pereteMax, pas: 0.1 },
    { cheie: "culoare", tip: "culoare", eticheta: "globModele.culoare", grup: "globModele.grupGlob" },
    { cheie: "model", tip: "alegere", eticheta: "globModele.model", grup: "globModele.grupModel", optiuni: MODELE.map((v) => ({ valoare: v, eticheta: `globModele.model_${v}` })) },
    { cheie: "numar", tip: "numar", eticheta: "globModele.numar", grup: "globModele.grupModel", min: GLOB_MODELE.numarMin, max: GLOB_MODELE.numarMax, pas: 1 },
    { cheie: "adancime", tip: "numar", eticheta: "globModele.adancime", grup: "globModele.grupModel", vizibil: (p) => p.model !== "fatete" && p.model !== "fante", min: GLOB_MODELE.adancimeMin, max: GLOB_MODELE.adancimeMax, pas: 0.1 },
    { cheie: "rasucire", tip: "numar", eticheta: "globModele.rasucire", grup: "globModele.grupModel", vizibil: (p) => p.model === "rasucite", min: -GLOB_MODELE.rasucireMax, max: GLOB_MODELE.rasucireMax, pas: 5 },
    { cheie: "ture", tip: "numar", eticheta: "globModele.ture", grup: "globModele.grupModel", vizibil: (p) => p.model === "spirala", min: GLOB_MODELE.tureMin, max: GLOB_MODELE.tureMax, pas: 0.25 },
    { cheie: "latimeFanta", tip: "numar", eticheta: "globModele.latimeFanta", grup: "globModele.grupModel", vizibil: (p) => p.model === "fante", min: GLOB_MODELE.latimeFantaMin, max: GLOB_MODELE.latimeFantaMax, pas: 0.1 },
    { cheie: "culoareCapac", tip: "culoare", eticheta: "globModele.culoareCapac", grup: "globModele.grupModel" },
    { cheie: "text", tip: "text", eticheta: "globModele.text", grup: "globModele.grupNume" },
    { cheie: "font", tip: "font", eticheta: "globModele.font", grup: "globModele.grupNume", vizibil: areNume, fonturi: { "globNume.fonturiRotunjite": FONTURI_CRACIUN.rotunjite, "globNume.fonturiBloc": FONTURI_CRACIUN.bloc, "globNume.fonturiScript": FONTURI_CRACIUN.script } },
    { cheie: "culoareText", tip: "culoare", eticheta: "globModele.culoareText", grup: "globModele.grupNume", vizibil: areNume },
  ],
  instructiuni: (p) => t(p.constructie === "vaza" ? "globModele.instructiuniVaza" : "globModele.instructiuni"),
  pat: (p) => (Number(p.diametru) > 80 ? 256 : 180),
};
