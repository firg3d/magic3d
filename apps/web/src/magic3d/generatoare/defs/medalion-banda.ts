import { CULORI_MEDALION, FONT_MEDALION, FONTURI_CRACIUN, MEDALION, PATURI } from "@/magic3d/apps/craciun/config";
import { listaNume } from "@/magic3d/apps/craciun/pachet";
import { t } from "@/magic3d/core/i18n/index";
import type { GeneratorDef, Parametri } from "@/magic3d/generatoare/tipuri";

/* Medalion cu banda (colectia "Craciun"). Limitele vin din apps/craciun/config.ts. */

const FORME = ["cerc", "oval"] as const;
const DECOR = ["amestec", "fulgi", "brazi", "oameni", "fara"] as const;
const areDecor = (p: Parametri) => p.decor !== "fara";

export const MEDALION_BANDA_DEF: GeneratorDef = {
  id: "medalion-banda",
  titlu: "comutator.medalionBanda",
  versiune: 1,
  categorie: "craciun",
  implicit: {
    forma: "cerc",
    latime: MEDALION.latime,
    latimeRama: MEDALION.latimeRama,
    grosimeRama: MEDALION.grosimeRama,
    fundal: "plin",
    culoareDisc: CULORI_MEDALION.disc,
    latimeBanda: MEDALION.latimeBanda,
    inclinare: MEDALION.inclinare,
    capete: true,
    culoareBanda: CULORI_MEDALION.banda,
    text: "Ana",
    font: FONT_MEDALION,
    culoareText: CULORI_MEDALION.text,
    decor: "amestec",
    densitate: 3,
    culoareDecor: CULORI_MEDALION.decor,
    lista: "",
    pat: "180",
  },
  parametri: [
    { cheie: "forma", tip: "alegere", eticheta: "medalion.forma", grup: "medalion.grupDisc", optiuni: FORME.map((f) => ({ valoare: f, eticheta: `medalion.forma_${f}` })) },
    { cheie: "latime", tip: "numar", eticheta: "medalion.latime", grup: "medalion.grupDisc", min: MEDALION.latimeMin, max: MEDALION.latimeMax, pas: 1 },
    { cheie: "latimeRama", tip: "numar", eticheta: "medalion.latimeRama", grup: "medalion.grupDisc", min: MEDALION.latimeRamaMin, max: MEDALION.latimeRamaMax, pas: 0.1 },
    { cheie: "grosimeRama", tip: "numar", eticheta: "medalion.grosimeRama", grup: "medalion.grupDisc", min: MEDALION.grosimeRamaMin, max: MEDALION.grosimeRamaMax, pas: 0.1 },
    { cheie: "fundal", tip: "alegere", eticheta: "medalion.fundal", grup: "medalion.grupDisc", optiuni: ["plin", "decupat"].map((v) => ({ valoare: v, eticheta: `medalion.fundal_${v}` })) },
    { cheie: "culoareDisc", tip: "culoare", eticheta: "medalion.culoareDisc", grup: "medalion.grupDisc" },
    { cheie: "latimeBanda", tip: "numar", eticheta: "medalion.latimeBanda", grup: "medalion.grupBanda", min: MEDALION.latimeBandaMin, max: MEDALION.latimeBandaMax, pas: 0.5 },
    { cheie: "inclinare", tip: "numar", eticheta: "medalion.inclinare", grup: "medalion.grupBanda", min: -MEDALION.inclinareMax, max: MEDALION.inclinareMax, pas: 1 },
    { cheie: "capete", tip: "bifa", eticheta: "medalion.capete", grup: "medalion.grupBanda" },
    { cheie: "culoareBanda", tip: "culoare", eticheta: "medalion.culoareBanda", grup: "medalion.grupBanda" },
    { cheie: "text", tip: "text", eticheta: "medalion.text", grup: "medalion.grupNume" },
    { cheie: "font", tip: "font", eticheta: "medalion.font", grup: "medalion.grupNume", fonturi: { "globNume.fonturiScript": FONTURI_CRACIUN.script, "globNume.fonturiRotunjite": FONTURI_CRACIUN.rotunjite, "globNume.fonturiBloc": FONTURI_CRACIUN.bloc } },
    { cheie: "culoareText", tip: "culoare", eticheta: "medalion.culoareText", grup: "medalion.grupNume" },
    { cheie: "decor", tip: "alegere", eticheta: "medalion.decor", grup: "medalion.grupDecor", optiuni: DECOR.map((v) => ({ valoare: v, eticheta: `medalion.decor_${v}` })) },
    { cheie: "densitate", tip: "numar", eticheta: "medalion.densitate", grup: "medalion.grupDecor", vizibil: areDecor, min: 1, max: MEDALION.decorMaxBucati, pas: 1 },
    { cheie: "culoareDecor", tip: "culoare", eticheta: "medalion.culoareDecor", grup: "medalion.grupDecor", vizibil: areDecor },
    { cheie: "lista", tip: "text", randuri: 6, eticheta: "globNume.lista", grup: "globNume.grupPachet" },
    { cheie: "pat", tip: "alegere", eticheta: "globNume.pat", grup: "globNume.grupPachet", optiuni: PATURI.map((v) => ({ valoare: String(v), eticheta: `globNume.pat_${v}` })) },
  ],
  instructiuni: () => t("medalion.instructiuni"),
  bucati: (p) => Math.max(1, listaNume(String(p.lista ?? "")).length),
  pat: (p) => (Number(p.pat) === 256 ? 256 : 180),
};
