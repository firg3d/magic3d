import { FONTURI_CRACIUN, GLOB_NUME, PATURI } from "@/magic3d/apps/craciun/config";
import { listaNume } from "@/magic3d/apps/craciun/pachet";
import { t } from "@/magic3d/core/i18n/index";
import type { GeneratorDef, Parametri } from "@/magic3d/generatoare/tipuri";

/* Glob cu nume decupat (colectia "Craciun"). Limitele vin din apps/craciun/config.ts. */

const FORME = ["cerc", "oval", "stea", "brad"] as const;
const DECOR = ["fulgi", "stele", "brazi", "amestec", "fara"] as const;
const areDecor = (p: Parametri) => p.decor !== "fara";

export const GLOB_NUME_DEF: GeneratorDef = {
  id: "glob-nume",
  titlu: "comutator.globNume",
  versiune: 1,
  categorie: "craciun",
  implicit: {
    forma: "cerc",
    latime: GLOB_NUME.latime,
    latimeRama: GLOB_NUME.latimeRama,
    grosime: GLOB_NUME.grosime,
    text: "Ana",
    font: FONTURI_CRACIUN.script[0],
    legatura: "auto",
    decor: "fulgi",
    densitate: 6,
    samanta: 1,
    fundal: false,
    culoareRama: "#c8282e",
    culoareDecor: "#c8282e",
    culoareFundal: "#f4f4f1",
    lista: "",
    pat: "180",
  },
  parametri: [
    { cheie: "forma", tip: "alegere", eticheta: "globNume.forma", grup: "globNume.grupForma", optiuni: FORME.map((f) => ({ valoare: f, eticheta: `globNume.forma_${f}` })) },
    { cheie: "latime", tip: "numar", eticheta: "globNume.latime", grup: "globNume.grupForma", min: GLOB_NUME.latimeMin, max: GLOB_NUME.latimeMax, pas: 1 },
    { cheie: "latimeRama", tip: "numar", eticheta: "globNume.latimeRama", grup: "globNume.grupForma", min: GLOB_NUME.latimeRamaMin, max: GLOB_NUME.latimeRamaMax, pas: 0.5 },
    { cheie: "grosime", tip: "numar", eticheta: "globNume.grosime", grup: "globNume.grupForma", min: GLOB_NUME.grosimeMin, max: GLOB_NUME.grosimeMax, pas: 0.1 },
    { cheie: "culoareRama", tip: "culoare", eticheta: "globNume.culoareRama", grup: "globNume.grupForma" },
    { cheie: "text", tip: "text", eticheta: "globNume.text", grup: "globNume.grupNume" },
    { cheie: "font", tip: "font", eticheta: "globNume.font", grup: "globNume.grupNume", fonturi: { "globNume.fonturiScript": FONTURI_CRACIUN.script, "globNume.fonturiRotunjite": FONTURI_CRACIUN.rotunjite, "globNume.fonturiBloc": FONTURI_CRACIUN.bloc } },
    { cheie: "legatura", tip: "alegere", eticheta: "globNume.legatura", grup: "globNume.grupNume", optiuni: ["auto", "bara", "fara"].map((v) => ({ valoare: v, eticheta: `globNume.legatura_${v}` })) },
    { cheie: "decor", tip: "alegere", eticheta: "globNume.decor", grup: "globNume.grupDecor", optiuni: DECOR.map((v) => ({ valoare: v, eticheta: `globNume.decor_${v}` })) },
    { cheie: "densitate", tip: "numar", eticheta: "globNume.densitate", grup: "globNume.grupDecor", vizibil: areDecor, min: 1, max: GLOB_NUME.decorMaxBucati, pas: 1 },
    { cheie: "samanta", tip: "numar", eticheta: "globNume.samanta", grup: "globNume.grupDecor", vizibil: areDecor, min: 1, max: 999, pas: 1 },
    { cheie: "culoareDecor", tip: "culoare", eticheta: "globNume.culoareDecor", grup: "globNume.grupDecor", vizibil: areDecor },
    { cheie: "fundal", tip: "bifa", eticheta: "globNume.fundal", grup: "globNume.grupDecor" },
    { cheie: "culoareFundal", tip: "culoare", eticheta: "globNume.culoareFundal", grup: "globNume.grupDecor", vizibil: (p) => p.fundal === true },
    { cheie: "lista", tip: "text", randuri: 6, eticheta: "globNume.lista", grup: "globNume.grupPachet" },
    { cheie: "pat", tip: "alegere", eticheta: "globNume.pat", grup: "globNume.grupPachet", optiuni: PATURI.map((v) => ({ valoare: String(v), eticheta: `globNume.pat_${v}` })) },
  ],
  instructiuni: () => t("globNume.instructiuni"),
  bucati: (p) => Math.max(1, listaNume(String(p.lista ?? "")).length),
  pat: (p) => (Number(p.pat) === 256 ? 256 : 180),
};
