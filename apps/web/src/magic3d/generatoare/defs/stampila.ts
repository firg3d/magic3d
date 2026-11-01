import { STAMPILA } from "@/magic3d/apps/stampila/config";
import { t } from "@/magic3d/core/i18n/index";
import type { GeneratorDef, Parametri } from "@/magic3d/generatoare/tipuri";

/* Stampila personalizata: pentru cerneala (fata TPU + maner PLA) sau pentru lut, fondant si biscuiti. Limitele vin din apps/stampila/config.ts. */

const lut = (p: Parametri) => p.varianta === "lut";
const cuText = (p: Parametri) => p.continut !== "imagine";
const cuImagine = (p: Parametri) => p.continut !== "text";

export const STAMPILA_DEF: GeneratorDef = {
  id: "stampila",
  titlu: "comutator.stampila",
  versiune: 1,
  categorie: "personalizate",
  implicit: {
    varianta: "cerneala",
    continut: "text",
    text: "Lucrat manual",
    font: "Baloo2-800.ttf",
    imagine: "",
    forma: "dreptunghi",
    latime: 60,
    inaltime: 25,
    bordura: 1.5,
    reliefCerneala: 1.8,
    reliefLut: 3,
    oglindit: true,
    maner: "ciuperca",
    marcaj: "model",
    culoareFata: "#1f2937",
    culoareManer: "#d97706",
    culoareMarcaj: "#f8fafc",
  },
  parametri: [
    { cheie: "varianta", tip: "alegere", eticheta: "stampila.varianta", grup: "stampila.grupDesen", optiuni: [{ valoare: "cerneala", eticheta: "stampila.variantaCerneala" }, { valoare: "lut", eticheta: "stampila.variantaLut" }] },
    { cheie: "continut", tip: "alegere", eticheta: "stampila.continut", grup: "stampila.grupDesen", optiuni: [{ valoare: "text", eticheta: "stampila.continutText" }, { valoare: "imagine", eticheta: "stampila.continutImagine" }, { valoare: "ambele", eticheta: "stampila.continutAmbele" }] },
    { cheie: "text", tip: "text", eticheta: "stampila.text", grup: "stampila.grupDesen", vizibil: cuText },
    { cheie: "font", tip: "font", eticheta: "stampila.font", grup: "stampila.grupDesen", vizibil: cuText },
    { cheie: "imagine", tip: "imagine", eticheta: "stampila.imagine", grup: "stampila.grupDesen", vizibil: cuImagine },
    { cheie: "oglindit", tip: "bifa", eticheta: "stampila.oglindit", grup: "stampila.grupDesen", vizibil: lut },
    { cheie: "forma", tip: "alegere", eticheta: "stampila.forma", grup: "stampila.grupFata", optiuni: (["rotunda", "patrata", "dreptunghi", "contur"] as const).map((f) => ({ valoare: f, eticheta: `stampila.forma_${f}` })) },
    { cheie: "latime", tip: "numar", eticheta: (p) => (p.forma === "rotunda" ? "stampila.diametru" : "stampila.latime"), grup: "stampila.grupFata", min: STAMPILA.latimeMin, max: STAMPILA.latimeMax, pas: 1 },
    { cheie: "inaltime", tip: "numar", eticheta: "stampila.inaltime", grup: "stampila.grupFata", vizibil: (p) => p.forma === "dreptunghi" || p.forma === "contur", min: STAMPILA.inaltimeMin, max: STAMPILA.latimeMax, pas: 1 },
    { cheie: "bordura", tip: "numar", eticheta: "stampila.bordura", grup: "stampila.grupFata", min: 0, max: 4, pas: 0.5 },
    { cheie: "reliefCerneala", tip: "numar", eticheta: "stampila.relief", grup: "stampila.grupFata", vizibil: (p) => !lut(p), min: 1, max: 3, pas: 0.1 },
    { cheie: "reliefLut", tip: "numar", eticheta: "stampila.relief", grup: "stampila.grupFata", vizibil: lut, min: 2, max: 6, pas: 0.5 },
    { cheie: "culoareFata", tip: "culoare", eticheta: "stampila.culoareFata", grup: "stampila.grupFata" },
    { cheie: "maner", tip: "alegere", eticheta: "stampila.maner", grup: "stampila.grupManer", optiuni: (["ciuperca", "cilindru", "bloc"] as const).map((f) => ({ valoare: f, eticheta: `stampila.maner_${f}` })) },
    { cheie: "marcaj", tip: "alegere", eticheta: "stampila.marcaj", grup: "stampila.grupManer", optiuni: [{ valoare: "model", eticheta: "stampila.marcajModel" }, { valoare: "sageata", eticheta: "stampila.marcajSageata" }] },
    { cheie: "culoareManer", tip: "culoare", eticheta: "stampila.culoareManer", grup: "stampila.grupManer" },
    { cheie: "culoareMarcaj", tip: "culoare", eticheta: "stampila.culoareMarcaj", grup: "stampila.grupManer" },
  ],
  instructiuni: (p) => t(lut(p) ? "stampila.instrLut" : "stampila.instrCerneala"),
};
