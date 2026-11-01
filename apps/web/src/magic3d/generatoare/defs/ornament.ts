import { ORNAMENT } from "@/magic3d/apps/ornament/config";
import { t } from "@/magic3d/core/i18n/index";
import type { GeneratorDef, Parametri } from "@/magic3d/generatoare/tipuri";

/* Ornamente de Craciun: disc plat cu nume sau glob 3D din doua jumatati. Limitele vin din apps/ornament/config.ts. */

const plat = (p: Parametri) => p.tip === "plat";
const glob = (p: Parametri) => p.tip === "glob";

const FORME = ["cerc", "stea", "brad", "fulg", "inima"] as const;
const PICTOGRAME = ["fara", "stea", "brad", "fulg", "inima", "clopotel"] as const;

export const ORNAMENT_DEF: GeneratorDef = {
  id: "ornament",
  titlu: "comutator.ornament",
  versiune: 1,
  categorie: "personalizate",
  implicit: {
    tip: "plat",
    forma: "cerc",
    diametru: 80,
    grosime: 3,
    text: "Ana",
    text2: "2026",
    font: "Baloo2-Regular.ttf",
    inaltimeText: 13,
    curbare: 0,
    mod: "relief",
    relief: 1.2,
    rama: 2.5,
    pictograma: "stea",
    prindere: "ureche",
    diametruGaura: 4,
    perete: ORNAMENT.pereteGlob,
    turtire: 1,
    imbinare: "inel",
    lista: "",
    culoareBaza: "#b91c1c",
    culoareText: "#f8fafc",
    culoareRama: "#eab308",
  },
  parametri: [
    { cheie: "tip", tip: "alegere", eticheta: "ornament.tip", grup: "ornament.grupForma", optiuni: [{ valoare: "plat", eticheta: "ornament.tipPlat" }, { valoare: "glob", eticheta: "ornament.tipGlob" }] },
    { cheie: "forma", tip: "alegere", eticheta: "ornament.forma", grup: "ornament.grupForma", vizibil: plat, optiuni: FORME.map((f) => ({ valoare: f, eticheta: `ornament.forma_${f}` })) },
    { cheie: "diametru", tip: "numar", eticheta: "ornament.diametru", grup: "ornament.grupForma", min: ORNAMENT.diametruMin, max: ORNAMENT.diametruMax, pas: 1 },
    { cheie: "grosime", tip: "numar", eticheta: "ornament.grosime", grup: "ornament.grupForma", vizibil: plat, min: 2, max: 6, pas: 0.2 },
    { cheie: "perete", tip: "numar", eticheta: "ornament.perete", grup: "ornament.grupForma", vizibil: glob, min: ORNAMENT.pereteMinGlob, max: 4, pas: 0.1 },
    { cheie: "turtire", tip: "numar", eticheta: "ornament.turtire", grup: "ornament.grupForma", vizibil: glob, min: ORNAMENT.turtireMin, max: 1, pas: 0.05 },
    { cheie: "imbinare", tip: "alegere", eticheta: "ornament.imbinare", grup: "ornament.grupForma", vizibil: glob, optiuni: [{ valoare: "inel", eticheta: "ornament.imbinareInel" }, { valoare: "stifturi", eticheta: "ornament.imbinareStifturi" }] },
    { cheie: "culoareBaza", tip: "culoare", eticheta: "ornament.culoareBaza", grup: "ornament.grupForma" },
    { cheie: "text", tip: "text", eticheta: "ornament.text", grup: "ornament.grupText" },
    { cheie: "text2", tip: "text", eticheta: "ornament.text2", grup: "ornament.grupText" },
    { cheie: "font", tip: "font", eticheta: "ornament.font", grup: "ornament.grupText" },
    { cheie: "inaltimeText", tip: "numar", eticheta: "ornament.inaltimeText", grup: "ornament.grupText", min: ORNAMENT.textMin, max: 30, pas: 0.5 },
    { cheie: "curbare", tip: "numar", eticheta: "ornament.curbare", grup: "ornament.grupText", vizibil: plat, min: 0, max: 180, pas: 5 },
    { cheie: "mod", tip: "alegere", eticheta: "ornament.mod", grup: "ornament.grupText", optiuni: [{ valoare: "relief", eticheta: "ornament.modRelief" }, { valoare: "gravat", eticheta: "ornament.modGravat" }] },
    { cheie: "relief", tip: "numar", eticheta: "ornament.relief", grup: "ornament.grupText", min: 0.4, max: 3, pas: 0.1 },
    { cheie: "pictograma", tip: "alegere", eticheta: "ornament.pictograma", grup: "ornament.grupText", vizibil: plat, optiuni: PICTOGRAME.map((f) => ({ valoare: f, eticheta: `ornament.pict_${f}` })) },
    { cheie: "culoareText", tip: "culoare", eticheta: "ornament.culoareText", grup: "ornament.grupText" },
    { cheie: "rama", tip: "numar", eticheta: "ornament.rama", grup: "ornament.grupRama", vizibil: plat, min: 0, max: 8, pas: 0.5 },
    { cheie: "culoareRama", tip: "culoare", eticheta: "ornament.culoareRama", grup: "ornament.grupRama", vizibil: (p) => plat(p) && Number(p.rama) > 0 },
    { cheie: "prindere", tip: "alegere", eticheta: "ornament.prindere", grup: "ornament.grupRama", vizibil: plat, optiuni: [{ valoare: "gaura", eticheta: "ornament.prindGaura" }, { valoare: "ureche", eticheta: "ornament.prindUreche" }, { valoare: "carlig", eticheta: "ornament.prindCarlig" }] },
    { cheie: "diametruGaura", tip: "numar", eticheta: "ornament.diametruGaura", grup: "ornament.grupRama", vizibil: plat, min: 2, max: 8, pas: 0.5 },
    { cheie: "lista", tip: "text", eticheta: "ornament.lista", grup: "ornament.grupPachet", vizibil: plat },
  ],
  instructiuni: (p) => t(glob(p) ? (p.imbinare === "inel" ? "ornament.instrGlobInel" : "ornament.instrGlobStifturi") : "ornament.instrPlat", { lungime: 2 * ORNAMENT.adancimeStift - 0.5 }),
};
