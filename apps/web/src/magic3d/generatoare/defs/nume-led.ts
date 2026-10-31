import type { GeneratorDef } from "@/magic3d/generatoare/tipuri";

/*
 * Nume LED: valorile si limitele din src/apps/nume-led/main.ts (magic3d-legacy). Butonul vechi
 * "pune ingrosarea minima care merge" devine bifa `ingrosareAuto`: constructorul cauta ingrosarea
 * (ingrosareaCareMerge) la fiecare generare si o foloseste in locul valorii manuale.
 */

export const NUME_LED: GeneratorDef = {
  id: "nume-led",
  titlu: "comutator.numeLed",
  versiune: 1,
  implicit: {
    text: "Maria",
    font: "GreatVibes-Regular.ttf",
    inaltimeLitera: 80,
    ingrosare: 3,
    ingrosareAuto: false,
    modProdus: "perete",
    tipAgatare: "cheie",
    pozitieCanal: "spate",
    locCanal: "jos",
    diametruCanal: 4,
    tipBanda: "60",
    latimeBanda: 10,
    adancimeCorp: 25,
    grosimeFata: 1.6,
    grosimePerete: 2,
    grosimeSpate: 2,
    latimePrag: 1.2,
    adancimePrag: 2,
    jocFata: 0.2,
    culoare: "#2b2f38",
    culoareFata: "#f2efe6",
  },
  parametri: [
    { cheie: "text", tip: "text", eticheta: "numeled.text", grup: "numeled.grupText" },
    { cheie: "font", tip: "font", eticheta: "numeled.font", grup: "numeled.grupText" },
    { cheie: "inaltimeLitera", tip: "numar", eticheta: "numeled.inaltimeLitera", grup: "numeled.grupText", min: 50, max: 250, pas: 5 },
    { cheie: "ingrosareAuto", tip: "bifa", eticheta: "numeled.ingrosareAuto", grup: "numeled.grupText" },
    { cheie: "ingrosare", tip: "numar", eticheta: "numeled.ingrosare", grup: "numeled.grupText", min: 0, max: 10, pas: 0.5, vizibil: (p) => p.ingrosareAuto !== true },

    {
      cheie: "modProdus",
      tip: "alegere",
      eticheta: "numeled.modProdus",
      grup: "numeled.grupMontaj",
      optiuni: [
        { valoare: "masa", eticheta: "numeled.mod_masa" },
        { valoare: "perete", eticheta: "numeled.mod_perete" },
      ],
    },
    {
      cheie: "tipAgatare",
      tip: "alegere",
      eticheta: "numeled.tipAgatare",
      grup: "numeled.grupMontaj",
      optiuni: [
        { valoare: "cheie", eticheta: "numeled.agatare_cheie" },
        { valoare: "grila", eticheta: "numeled.agatare_grila" },
      ],
      vizibil: (p) => p.modProdus === "perete",
    },
    {
      cheie: "pozitieCanal",
      tip: "alegere",
      eticheta: "numeled.pozitieCanal",
      grup: "numeled.grupMontaj",
      optiuni: [
        { valoare: "spate", eticheta: "numeled.canal_spate" },
        { valoare: "jos", eticheta: "numeled.canal_jos" },
        { valoare: "lateral", eticheta: "numeled.canal_lateral" },
      ],
    },
    {
      cheie: "locCanal",
      tip: "alegere",
      eticheta: "numeled.locCanal",
      grup: "numeled.grupMontaj",
      optiuni: [
        { valoare: "jos", eticheta: "numeled.loc_jos" },
        { valoare: "mijloc", eticheta: "numeled.loc_mijloc" },
        { valoare: "sus", eticheta: "numeled.loc_sus" },
      ],
    },
    { cheie: "diametruCanal", tip: "numar", eticheta: "numeled.diametruCanal", grup: "numeled.grupMontaj", min: 2, max: 10, pas: 0.5 },

    {
      cheie: "tipBanda",
      tip: "alegere",
      eticheta: "numeled.tipBanda",
      grup: "numeled.grupLumina",
      optiuni: [
        { valoare: "30", eticheta: "numeled.banda30" },
        { valoare: "60", eticheta: "numeled.banda60" },
        { valoare: "120", eticheta: "numeled.banda120" },
      ],
    },
    { cheie: "latimeBanda", tip: "numar", eticheta: "numeled.latimeBanda", grup: "numeled.grupLumina", min: 4, max: 20, pas: 0.5 },
    { cheie: "adancimeCorp", tip: "numar", eticheta: "numeled.adancimeCorp", grup: "numeled.grupLumina", min: 8, max: 60, pas: 1 },
    { cheie: "grosimeFata", tip: "numar", eticheta: "numeled.grosimeFata", grup: "numeled.grupLumina", min: 0.8, max: 4, pas: 0.2 },

    { cheie: "grosimePerete", tip: "numar", eticheta: "numeled.grosimePerete", grup: "numeled.grupPereti", min: 1, max: 6, pas: 0.2 },
    { cheie: "grosimeSpate", tip: "numar", eticheta: "numeled.grosimeSpate", grup: "numeled.grupPereti", min: 1, max: 6, pas: 0.2 },
    { cheie: "latimePrag", tip: "numar", eticheta: "numeled.latimePrag", grup: "numeled.grupPereti", min: 0.6, max: 4, pas: 0.2 },
    { cheie: "adancimePrag", tip: "numar", eticheta: "numeled.adancimePrag", grup: "numeled.grupPereti", min: 1, max: 6, pas: 0.2 },
    { cheie: "jocFata", tip: "numar", eticheta: "numeled.jocFata", grup: "numeled.grupPereti", min: 0, max: 0.6, pas: 0.05 },

    { cheie: "culoare", tip: "culoare", eticheta: "numeled.culoare", grup: "numeled.grupAfisare" },
    { cheie: "culoareFata", tip: "culoare", eticheta: "numeled.culoareFata", grup: "numeled.grupAfisare" },
  ],
};
