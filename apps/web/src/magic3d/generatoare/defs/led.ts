import type { GeneratorDef, Parametri } from "@/magic3d/generatoare/tipuri";

/*
 * Litere LED: valorile si limitele din src/apps/led/main.ts (magic3d-legacy). Litera era un select
 * cu A-Z si 0-9; aici e un camp de text din care constructorul ia primul caracter (optiunile unui
 * "alegere" sunt chei i18n, iar 36 de chei doar pentru caractere n-ar spune nimic).
 */

const agatare = (p: Parametri) => String(p.tipAgatare);

export const LED: GeneratorDef = {
  id: "led",
  titlu: "comutator.led",
  versiune: 1,
  implicit: {
    litera: "A",
    font: "ArchivoBlack-Regular.ttf",
    inaltimeLitera: 150,
    culoare: "#3A3A3C",
    adancimeCorp: 25,
    ingrosare: 0,
    grosimePerete: 2,
    grosimeSpate: 2,
    grosimeFata: 1.6,
    adancimePrag: 2,
    latimePrag: 1.2,
    jocFata: 0.2,
    culoareFata: "#F2F0E6",
    tipAgatare: "cheie",
    surubCap: 5,
    surubTija: 2.5,
    latimeGrila: 20,
    inaltimeCapSurub: 3,
    pozitieCanal: "spate",
    locCanal: "jos",
    diametruCanal: 4,
    tipBanda: "60",
    latimeBanda: "10",
  },
  parametri: [
    { cheie: "litera", tip: "text", eticheta: "led.litera", grup: "led.grupLitera" },
    { cheie: "font", tip: "font", eticheta: "led.font", grup: "led.grupLitera" },
    { cheie: "inaltimeLitera", tip: "numar", eticheta: "led.inaltime", grup: "led.grupLitera", min: 60, max: 300, pas: 5 },
    { cheie: "culoare", tip: "culoare", eticheta: "led.culoare", grup: "led.grupLitera" },

    { cheie: "adancimeCorp", tip: "numar", eticheta: "led.adancimeCorp", grup: "led.grupCorp", min: 10, max: 60, pas: 1 },
    { cheie: "ingrosare", tip: "numar", eticheta: "led.ingrosare", grup: "led.grupCorp", min: 0, max: 10, pas: 0.5 },
    { cheie: "grosimePerete", tip: "numar", eticheta: "led.grosimePerete", grup: "led.grupCorp", min: 1.6, max: 5, pas: 0.1 },
    { cheie: "grosimeSpate", tip: "numar", eticheta: "led.grosimeSpate", grup: "led.grupCorp", min: 1.2, max: 5, pas: 0.2 },

    { cheie: "grosimeFata", tip: "numar", eticheta: "led.grosimeFata", grup: "led.grupFata", min: 1.2, max: 3, pas: 0.1 },
    { cheie: "adancimePrag", tip: "numar", eticheta: "led.adancimePrag", grup: "led.grupFata", min: 1, max: 4, pas: 0.2 },
    { cheie: "latimePrag", tip: "numar", eticheta: "led.latimePrag", grup: "led.grupFata", min: 0.6, max: 3, pas: 0.1 },
    { cheie: "jocFata", tip: "numar", eticheta: "led.jocFata", grup: "led.grupFata", min: 0.1, max: 0.5, pas: 0.05 },
    { cheie: "culoareFata", tip: "culoare", eticheta: "led.culoareFata", grup: "led.grupFata" },

    {
      cheie: "tipAgatare",
      tip: "alegere",
      eticheta: "led.tipAgatare",
      grup: "led.grupAgatare",
      optiuni: [
        { valoare: "cheie", eticheta: "led.agatareCheie" },
        { valoare: "grila", eticheta: "led.agatareGrila" },
        { valoare: "fara", eticheta: "led.agatareFara" },
      ],
    },
    { cheie: "surubCap", tip: "numar", eticheta: "led.surubCap", grup: "led.grupAgatare", min: 4, max: 12, pas: 0.5, vizibil: (p) => agatare(p) === "cheie" },
    { cheie: "surubTija", tip: "numar", eticheta: "led.surubTija", grup: "led.grupAgatare", min: 2, max: 6, pas: 0.5, vizibil: (p) => agatare(p) === "cheie" },
    { cheie: "latimeGrila", tip: "numar", eticheta: "led.latimeGrila", grup: "led.grupAgatare", min: 12, max: 80, pas: 2, vizibil: (p) => agatare(p) === "grila" },
    { cheie: "inaltimeCapSurub", tip: "numar", eticheta: "led.inaltimeCapSurub", grup: "led.grupAgatare", min: 1.5, max: 8, pas: 0.5, vizibil: (p) => agatare(p) !== "fara" },

    {
      cheie: "pozitieCanal",
      tip: "alegere",
      eticheta: "led.pozitieCanal",
      grup: "led.grupCanal",
      optiuni: [
        { valoare: "spate", eticheta: "led.canal_spate" },
        { valoare: "jos", eticheta: "led.canal_jos" },
        { valoare: "lateral", eticheta: "led.canal_lateral" },
      ],
    },
    {
      cheie: "locCanal",
      tip: "alegere",
      eticheta: "led.locCanal",
      grup: "led.grupCanal",
      optiuni: [
        { valoare: "jos", eticheta: "led.loc_jos" },
        { valoare: "mijloc", eticheta: "led.loc_mijloc" },
        { valoare: "sus", eticheta: "led.loc_sus" },
      ],
    },
    { cheie: "diametruCanal", tip: "numar", eticheta: "led.diametruCanal", grup: "led.grupCanal", min: 2, max: 8, pas: 0.5 },

    {
      cheie: "tipBanda",
      tip: "alegere",
      eticheta: "led.tipBanda",
      grup: "led.grupBanda",
      optiuni: [
        { valoare: "30", eticheta: "led.banda30" },
        { valoare: "60", eticheta: "led.banda60" },
        { valoare: "120", eticheta: "led.banda120" },
      ],
    },
    {
      cheie: "latimeBanda",
      tip: "alegere",
      eticheta: "led.latimeBanda",
      grup: "led.grupBanda",
      optiuni: [
        { valoare: "8", eticheta: "led.lat8" },
        { valoare: "10", eticheta: "led.lat10" },
        { valoare: "12", eticheta: "led.lat12" },
      ],
    },
  ],
};
