import type { GeneratorDef, Parametri } from "@/magic3d/generatoare/tipuri";

/* Cutii Litere: valorile, limitele si conditiile din src/apps/cutii/main.ts (magic3d-legacy). */

/*
 * Copiate din apps/cutii/cutii.ts (INALTIME_MIN/MAX, PERETE_MIN/MAX, FORME_GOL) si
 * core/geometry/tipare.ts (TIPARE), nu importate: definitia ajunge in panou, pe firul principal,
 * iar importul ar trage dupa el tot modulul de geometrie. Testul le compara cu originalele.
 */
export const INALTIME_MIN = 60;
export const INALTIME_MAX = 300;
export const PERETE_MIN = 1.6;
export const PERETE_MAX = 6;
export const FORME_GOL = ["hexagon", "rotund", "dreptunghi"];
export const TIPARE = ["fagure", "perforat", "voronoi", "diagonal", "triunghiular", "caramida", "valuri", "radial", "spirala"];

/** Diacriticele nu se ofera: caciula literei cu breve ar iesi o cutiuta separata (vezi main.ts vechi). */
export const CARACTERE_CUTII = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"];

const mare = (s: string) => s[0].toUpperCase() + s.slice(1);
const perete = (p: Parametri) => p.modProdus === "perete";
const agatare = (p: Parametri) => (perete(p) ? String(p.tipAgatare) : "fara");
const trafor = (p: Parametri) => p.traforPereti === true;
const cuModelFund = (p: Parametri) => p.modelFund !== "fara";

export const CUTII: GeneratorDef = {
  id: "cutii",
  titlu: "comutator.cutii",
  versiune: 1,
  implicit: {
    litera: "A",
    font: "ArchivoBlack-Regular.ttf",
    inaltimeLitera: 120,
    culoare: "#8fbf6a",
    // se deschide ca cutie de masa: configuratia etansa
    modProdus: "masa",
    adancime: 60,
    grosimePerete: 2.5,
    grosimeFund: 2,
    traforPereti: false,
    formaGol: "hexagon",
    deschidere: 14,
    nervura: 2.5,
    bandaJos: 10,
    buzaSus: 6,
    modelFund: "fara",
    pasFund: 8,
    pereteFund: 1.6,
    ramaFund: 2,
    unghiFund: 0,
    variantaFund: 1,
    // Vechea interfata trecea agatarea pe "cheie" cand se alegea modul perete si o oprea pe masa.
    // Aici agatarea se vede si conteaza doar in modul perete, deci implicitul ei e direct "cheie".
    tipAgatare: "cheie",
    surubCap: 5,
    surubTija: 2.5,
    latimeGrila: 20,
    inaltimeCapSurub: 3,
  },
  parametri: [
    {
      cheie: "litera",
      tip: "alegere",
      eticheta: "cutii.litera",
      grup: "cutii.grupLitera",
      optiuni: CARACTERE_CUTII.map((c) => ({ valoare: c, eticheta: c })),
    },
    { cheie: "font", tip: "font", eticheta: "cutii.font", grup: "cutii.grupLitera" },
    { cheie: "inaltimeLitera", tip: "numar", eticheta: "cutii.inaltime", grup: "cutii.grupLitera", min: INALTIME_MIN, max: INALTIME_MAX, pas: 5 },
    { cheie: "culoare", tip: "culoare", eticheta: "cutii.culoare", grup: "cutii.grupLitera" },

    {
      cheie: "modProdus",
      tip: "alegere",
      eticheta: "cutii.modProdus",
      grup: "cutii.grupCutie",
      optiuni: [
        { valoare: "masa", eticheta: "cutii.modMasa" },
        { valoare: "perete", eticheta: "cutii.modPerete" },
      ],
    },
    { cheie: "adancime", tip: "numar", eticheta: "cutii.adancime", grup: "cutii.grupCutie", min: 20, max: 150, pas: 5 },
    { cheie: "grosimePerete", tip: "numar", eticheta: "cutii.grosimePerete", grup: "cutii.grupCutie", min: PERETE_MIN, max: PERETE_MAX, pas: 0.1 },
    { cheie: "grosimeFund", tip: "numar", eticheta: "cutii.grosimeFund", grup: "cutii.grupCutie", min: 1.2, max: 6, pas: 0.2 },

    { cheie: "traforPereti", tip: "bifa", eticheta: "cutii.traforPereti", grup: "cutii.grupPereti" },
    {
      cheie: "formaGol",
      tip: "alegere",
      eticheta: "cutii.formaGol",
      grup: "cutii.grupPereti",
      optiuni: FORME_GOL.map((g) => ({ valoare: g, eticheta: "cutii.gol" + mare(g) })),
      vizibil: trafor,
    },
    { cheie: "deschidere", tip: "numar", eticheta: "cutii.deschidere", grup: "cutii.grupPereti", min: 8, max: 24, pas: 1, vizibil: trafor },
    { cheie: "nervura", tip: "numar", eticheta: "cutii.nervura", grup: "cutii.grupPereti", min: 1.6, max: 6, pas: 0.1, vizibil: trafor },
    { cheie: "bandaJos", tip: "numar", eticheta: "cutii.bandaJos", grup: "cutii.grupPereti", min: 4, max: 30, pas: 1, vizibil: trafor },
    { cheie: "buzaSus", tip: "numar", eticheta: "cutii.buzaSus", grup: "cutii.grupPereti", min: 3, max: 20, pas: 1, vizibil: trafor },

    {
      cheie: "modelFund",
      tip: "alegere",
      eticheta: "cutii.modelFund",
      grup: "cutii.grupFund",
      optiuni: [{ valoare: "fara", eticheta: "cutii.fundPlin" }, ...TIPARE.map((m) => ({ valoare: m, eticheta: "cutii.tipar" + mare(m) }))],
    },
    { cheie: "pasFund", tip: "numar", eticheta: "cutii.pasFund", grup: "cutii.grupFund", min: 4, max: 25, pas: 0.5, vizibil: cuModelFund },
    { cheie: "pereteFund", tip: "numar", eticheta: "cutii.pereteFund", grup: "cutii.grupFund", min: 1, max: 4, pas: 0.1, vizibil: cuModelFund },
    { cheie: "ramaFund", tip: "numar", eticheta: "cutii.ramaFund", grup: "cutii.grupFund", min: 0, max: 10, pas: 0.5, vizibil: cuModelFund },
    { cheie: "unghiFund", tip: "numar", eticheta: "cutii.unghiFund", grup: "cutii.grupFund", min: 0, max: 90, pas: 5, vizibil: cuModelFund },
    { cheie: "variantaFund", tip: "numar", eticheta: "cutii.variantaFund", grup: "cutii.grupFund", min: 1, max: 999, pas: 1, vizibil: (p) => p.modelFund === "voronoi" },

    // grupul de agatare apare doar in modul perete: la o cutie de masa ar fi un panou mort
    {
      cheie: "tipAgatare",
      tip: "alegere",
      eticheta: "cutii.tipAgatare",
      grup: "cutii.grupAgatare",
      optiuni: [
        { valoare: "cheie", eticheta: "cutii.agatareCheie" },
        { valoare: "grila", eticheta: "cutii.agatareGrila" },
        { valoare: "fara", eticheta: "cutii.agatareFara" },
      ],
      vizibil: perete,
    },
    { cheie: "surubCap", tip: "numar", eticheta: "cutii.surubCap", grup: "cutii.grupAgatare", min: 5, max: 16, pas: 0.5, vizibil: (p) => agatare(p) === "cheie" },
    { cheie: "surubTija", tip: "numar", eticheta: "cutii.surubTija", grup: "cutii.grupAgatare", min: 2, max: 8, pas: 0.5, vizibil: (p) => agatare(p) === "cheie" },
    { cheie: "latimeGrila", tip: "numar", eticheta: "cutii.latimeGrila", grup: "cutii.grupAgatare", min: 12, max: 80, pas: 2, vizibil: (p) => agatare(p) === "grila" },
    { cheie: "inaltimeCapSurub", tip: "numar", eticheta: "cutii.inaltimeCapSurub", grup: "cutii.grupAgatare", min: 1.5, max: 8, pas: 0.5, vizibil: (p) => agatare(p) !== "fara" },
  ],
};

/** Agatarea efectiva: pe masa nu exista (vechea interfata o oprea la trecerea pe masa). */
export const agatareCutie = agatare;
