import type { GeneratorDef, ParamDef, Parametri } from "@/magic3d/generatoare/tipuri";

/*
 * Nume 3D: valorile si limitele din src/apps/nume/main.ts (magic3d-legacy), iar grupele comune
 * cu Cuvinte Decor (punti, contur, unde sta piesa) din src/core/ui/panouri-cuvant.ts.
 */

/*
 * Limitele piesei, copiate din core/geometry/cuvant.ts si nu importate: definitia ajunge in
 * bundle-ul interfetei, iar geometria trebuie sa ramana in worker. Testul magic3dGen-nume verifica
 * ca sunt egale cu cele din nucleu.
 */
export const LIMITE_PIESA = {
  INALTIME_MIN: 20,
  INALTIME_MAX: 200,
  PAS_INALTIME: 5,
  GROSIME_MIN: 8,
  GROSIME_MAX: 60,
  PUNTE_MIN: 0.8,
  PUNTE_MAX: 4,
  CONTUR_MIN: 1,
  CONTUR_MAX: 25,
  PAS_CONTUR: 0.5,
};
const { INALTIME_MIN, INALTIME_MAX, PAS_INALTIME, GROSIME_MIN, GROSIME_MAX, PUNTE_MIN, PUNTE_MAX, CONTUR_MIN, CONTUR_MAX, PAS_CONTUR } = LIMITE_PIESA;

const contur = (p: Parametri) => String(p.contur);
const perete = (p: Parametri) => String(p.modProdus) === "perete";
const agatare = (p: Parametri) => String(p.tipAgatare);

/** Starea comuna a piesei dintr-un cuvant (StarePiesa din panouri-cuvant.ts), fara text si font. */
export const IMPLICIT_PIESA: Parametri = {
  grosime: 35,
  punti: true,
  latimePunte: 1.2,
  contur: "rama",
  latimeContur: 5,
  netezireContur: 4,
  grosimeContur: 6,
  modProdus: "masa",
  // Vechiul panou trecea agatarea pe "cheie" la comutarea pe perete (comutaModProdus). Aici nu
  // exista reactii la schimbare, asa ca implicitul e direct "cheie": pe masa geometria il ignora.
  tipAgatare: "cheie",
  surubCap: 5,
  surubTija: 2.5,
  inaltimeCapSurub: 3,
  latimeGrila: 20,
  capac: true,
  grosimeCapac: 2,
  culoare: "#C9A227",
  culoareContur: "#3A3A3C",
  culoareCapac: "#C9A227",
};

/** Grupele comune din panouri-cuvant.ts (grupuriPiesa + controaleAgatare), aceleasi chei piesa.*. */
export const PARAMETRI_PIESA: ParamDef[] = [
  { cheie: "punti", tip: "bifa", eticheta: "piesa.punti", grup: "piesa.grupPunti" },
  { cheie: "latimePunte", tip: "numar", eticheta: "piesa.latimePunte", grup: "piesa.grupPunti", min: PUNTE_MIN, max: PUNTE_MAX, pas: 0.1, vizibil: (p) => p.punti === true },
  {
    cheie: "contur",
    tip: "alegere",
    eticheta: "piesa.contur",
    grup: "piesa.grupContur",
    optiuni: [
      { valoare: "fara", eticheta: "piesa.contur_fara" },
      { valoare: "placa", eticheta: "piesa.contur_placa" },
      { valoare: "rama", eticheta: "piesa.contur_rama" },
    ],
  },
  { cheie: "latimeContur", tip: "numar", eticheta: "piesa.latimeContur", grup: "piesa.grupContur", min: CONTUR_MIN, max: CONTUR_MAX, pas: PAS_CONTUR, vizibil: (p) => contur(p) !== "fara" },
  { cheie: "netezireContur", tip: "numar", eticheta: "piesa.netezireContur", grup: "piesa.grupContur", min: 0, max: CONTUR_MAX, pas: PAS_CONTUR, vizibil: (p) => contur(p) !== "fara" },
  { cheie: "grosimeContur", tip: "numar", eticheta: "piesa.grosimeContur", grup: "piesa.grupContur", min: 2, max: 20, pas: 0.5, vizibil: (p) => contur(p) === "placa" },
  { cheie: "culoareContur", tip: "culoare", eticheta: "piesa.culoareContur", grup: "piesa.grupContur", vizibil: (p) => contur(p) !== "fara" },
  {
    cheie: "modProdus",
    tip: "alegere",
    eticheta: "piesa.modProdus",
    grup: "piesa.grupUnde",
    optiuni: [
      { valoare: "masa", eticheta: "piesa.modMasa" },
      { valoare: "perete", eticheta: "piesa.modPerete" },
    ],
  },
  {
    cheie: "tipAgatare",
    tip: "alegere",
    eticheta: "piesa.tipAgatare",
    grup: "piesa.grupUnde",
    vizibil: perete,
    optiuni: [
      { valoare: "cheie", eticheta: "piesa.agatareCheie" },
      { valoare: "grila", eticheta: "piesa.agatareGrila" },
      { valoare: "gaura", eticheta: "piesa.agatareGaura" },
      { valoare: "fara", eticheta: "piesa.agatareFara" },
    ],
  },
  { cheie: "surubTija", tip: "numar", eticheta: "piesa.surubTija", grup: "piesa.grupUnde", min: 2, max: 8, pas: 0.5, vizibil: (p) => perete(p) && ["cheie", "gaura"].includes(agatare(p)) },
  { cheie: "surubCap", tip: "numar", eticheta: "piesa.surubCap", grup: "piesa.grupUnde", min: 5, max: 16, pas: 0.5, vizibil: (p) => perete(p) && ["cheie", "gaura"].includes(agatare(p)) },
  { cheie: "latimeGrila", tip: "numar", eticheta: "piesa.latimeGrila", grup: "piesa.grupUnde", min: 12, max: 120, pas: 2, vizibil: (p) => perete(p) && agatare(p) === "grila" },
  { cheie: "inaltimeCapSurub", tip: "numar", eticheta: "piesa.inaltimeCapSurub", grup: "piesa.grupUnde", min: 1.5, max: 8, pas: 0.5, vizibil: (p) => perete(p) && agatare(p) !== "fara" },
  { cheie: "capac", tip: "bifa", eticheta: "piesa.capac", grup: "piesa.grupUnde", vizibil: (p) => perete(p) && agatare(p) === "gaura" },
  { cheie: "grosimeCapac", tip: "numar", eticheta: "piesa.grosimeCapac", grup: "piesa.grupUnde", min: 0.8, max: 6, pas: 0.2, vizibil: (p) => perete(p) && agatare(p) === "gaura" && p.capac === true },
  { cheie: "culoareCapac", tip: "culoare", eticheta: "piesa.culoareCapac", grup: "piesa.grupUnde", vizibil: (p) => perete(p) && agatare(p) === "gaura" && p.capac === true },
];

/** Prima grupa (textul, fontul, marimea), cu cheile de i18n ale aplicatiei ("nume" sau "cuvinte"). */
export function parametriText(app: "nume" | "cuvinte", grup: string, etichetaText = `${app}.text`): ParamDef[] {
  return [
    { cheie: "text", tip: "text", eticheta: etichetaText, grup },
    { cheie: "font", tip: "font", eticheta: `${app}.font`, grup },
    { cheie: "inaltimeLitera", tip: "numar", eticheta: `${app}.inaltime`, grup, min: INALTIME_MIN, max: INALTIME_MAX, pas: PAS_INALTIME },
    { cheie: "grosime", tip: "numar", eticheta: `${app}.grosime`, grup, min: GROSIME_MIN, max: GROSIME_MAX, pas: 1 },
    { cheie: "culoare", tip: "culoare", eticheta: `${app}.culoare`, grup },
  ];
}

export const NUME: GeneratorDef = {
  id: "nume",
  titlu: "comutator.nume3d",
  versiune: 1,
  implicit: {
    text: "Maria",
    font: "GreatVibes-Regular.ttf",
    inaltimeLitera: 60,
    ...IMPLICIT_PIESA,
  },
  parametri: [...parametriText("nume", "nume.grupNume"), ...PARAMETRI_PIESA],
};
