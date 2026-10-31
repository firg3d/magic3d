import manifestBaze from "../../../../public/magic3d/base/base-manifest.json";
import manifestTematici from "../../../../public/magic3d/tematici/manifest.json";
import type { GeneratorDef, ParamDef, Parametri } from "@/magic3d/generatoare/tipuri";

/*
 * Litere Decor: litera mare cu chenar si scris (relief, gravat sau in locas), pana la trei tematici
 * lipite pe ea si o baza cu locas, din src/apps/litere/main.ts (magic3d-legacy). Pozitiile (scris,
 * tematici, litera pe baza) sunt numerice, nu trase cu mouse-ul. Diacriticele au nevoie de baza:
 * fara ea, accentul ar fi o piesa de 2-3 mm fara sprijin (regula aplicatiei vechi).
 */

const CARACTERE = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ", "Ă", "Â", "Î", "Ș", "Ț", ..."0123456789", "&", "♥"];
export const DIACRITICE = ["Ă", "Â", "Î", "Ș", "Ț"];
export const NR_TEMATICI = 3;

const modele = (lista: { fisier: string; nume: string }[], folder: string) => [
  { valoare: "", eticheta: "litere.faraModel" },
  ...lista.map((m) => ({ valoare: `${folder}/${m.fisier}`, eticheta: m.nume })),
];
const OPTIUNI_TEMATICI = modele(manifestTematici, "tematici");
const OPTIUNI_BAZE = modele(manifestBaze, "base");

const cuTema = (i: number) => (p: Parametri) => String(p[`fisier3mfTema${i}`] ?? "") !== "";
const cuBaza = (p: Parametri) => String(p.fisier3mfBaza ?? "") !== "";

/** Campurile unei tematici: modelul, marimea (latura cea mai lunga), pozitia pe fata literei, rotatia, adancimea, culoarea. */
function campuriTema(i: number): ParamDef[] {
  const grup = `litere.tema${i}`;
  const vizibil = cuTema(i);
  return [
    { cheie: `fisier3mfTema${i}`, tip: "alegere", eticheta: "litere.model", grup, optiuni: OPTIUNI_TEMATICI },
    { cheie: `marimeTema${i}`, tip: "numar", eticheta: "litere.temaMarime", grup, min: 5, max: 250, pas: 1, vizibil },
    { cheie: `xTema${i}`, tip: "numar", eticheta: "litere.temaX", grup, min: -150, max: 150, pas: 0.5, vizibil },
    { cheie: `yTema${i}`, tip: "numar", eticheta: "litere.temaY", grup, min: -150, max: 150, pas: 0.5, vizibil },
    { cheie: `rotTema${i}`, tip: "numar", eticheta: "litere.temaRotatie", grup, min: -180, max: 180, pas: 1, vizibil },
    { cheie: `adancimeTema${i}`, tip: "numar", eticheta: "litere.temaAdancime", grup, min: -20, max: 20, pas: 0.1, vizibil },
    { cheie: `culoareTema${i}`, tip: "culoare", eticheta: "litere.culoare", grup, vizibil },
  ];
}
const PALETA = ["#88aaff", "#ff9a6b", "#7fd6a0"];
const implicitTeme = Object.fromEntries(Array.from({ length: NR_TEMATICI }, (_, k) => k + 1).flatMap((i) => [
  [`fisier3mfTema${i}`, ""], [`marimeTema${i}`, 35], [`xTema${i}`, 0], [`yTema${i}`, 0], [`rotTema${i}`, 0],
  [`adancimeTema${i}`, -3], [`culoareTema${i}`, PALETA[i - 1]],
]));
const cuScris = (p: Parametri) => String(p.scris).trim().length > 0;
const ingropat = (p: Parametri) => cuScris(p) && p.modScris !== "relief";

export const LITERE: GeneratorDef = {
  id: "litere",
  titlu: "comutator.litereDecor",
  versiune: 1,
  implicit: {
    litera: "A",
    fontLitera: "Baloo2-Regular.ttf",
    inaltimeLitera: 120,
    grosimeLitera: 25,
    culoareLitera: "#889ec8",
    chenarActiv: true,
    latimeChenar: 3,
    adancimeChenar: 3,
    razaMuchie: 1.2,
    taiereBaza: 2,
    scris: "Andrei",
    fontScris: "Pacifico-Regular.ttf",
    inaltimeScris: 40,
    modScris: "locas",
    reliefScris: 2.5,
    grosimeScris: 4.5,
    jocInsertie: 0.2,
    pozitieScris: -1.04,
    offsetX: 0.84,
    offsetY: -35.2,
    rotatieScris: 0,
    culoareScris: "#ffffff",
    ...implicitTeme,
    fisier3mfBaza: "",
    scaraBaza: 100,
    adancimeInfigere: 5,
    jocInfigere: 0.2,
    literaX: 0,
    literaZ: 0,
    rotatieLitera: 0,
  },
  parametri: [
    { cheie: "litera", tip: "alegere", eticheta: "litere.litera", grup: "litere.grupLitera", optiuni: CARACTERE.map((ch) => ({ valoare: ch, eticheta: ch })) },
    { cheie: "fontLitera", tip: "font", eticheta: "litere.fontLitera", grup: "litere.grupLitera" },
    { cheie: "inaltimeLitera", tip: "numar", eticheta: "litere.inaltimeCap", grup: "litere.grupLitera", min: 20, max: 300, pas: 1 },
    { cheie: "grosimeLitera", tip: "numar", eticheta: "litere.grosime", grup: "litere.grupLitera", min: 3, max: 60, pas: 0.5 },
    { cheie: "culoareLitera", tip: "culoare", eticheta: "litere.culoare", grup: "litere.grupLitera" },
    { cheie: "chenarActiv", tip: "bifa", eticheta: "litere.chenar", grup: "litere.grupLitera" },
    { cheie: "latimeChenar", tip: "numar", eticheta: "litere.latimeChenar", grup: "litere.grupLitera", min: 0.5, max: 15, pas: 0.5, vizibil: (p) => p.chenarActiv === true },
    { cheie: "adancimeChenar", tip: "numar", eticheta: "litere.adancimeChenar", grup: "litere.grupLitera", min: 0.5, max: 20, pas: 0.5, vizibil: (p) => p.chenarActiv === true },
    { cheie: "razaMuchie", tip: "numar", eticheta: "litere.razaMuchie", grup: "litere.grupLitera", min: 0, max: 3, pas: 0.1 },
    { cheie: "taiereBaza", tip: "numar", eticheta: "litere.taiereBaza", grup: "litere.grupLitera", min: 0, max: 15, pas: 0.5 },
    { cheie: "scris", tip: "text", eticheta: "litere.text", grup: "litere.grupScris" },
    { cheie: "fontScris", tip: "font", eticheta: "litere.fontScris", grup: "litere.grupScris", vizibil: cuScris },
    { cheie: "inaltimeScris", tip: "numar", eticheta: "litere.inaltime", grup: "litere.grupScris", min: 5, max: 200, pas: 1, vizibil: cuScris },
    {
      cheie: "modScris",
      tip: "alegere",
      eticheta: "litere.mod",
      grup: "litere.grupScris",
      vizibil: cuScris,
      optiuni: [
        { valoare: "relief", eticheta: "litere.modRelief" },
        { valoare: "gravat", eticheta: "litere.modGravat" },
        { valoare: "locas", eticheta: "litere.modLocas" },
      ],
    },
    { cheie: "reliefScris", tip: "numar", eticheta: "litere.relief", grup: "litere.grupScris", min: 0.4, max: 20, pas: 0.1, vizibil: cuScris },
    { cheie: "grosimeScris", tip: "numar", eticheta: "litere.grosimePiesa", grup: "litere.grupScris", min: 0.5, max: 30, pas: 0.5, vizibil: ingropat },
    { cheie: "pozitieScris", tip: "numar", eticheta: "litere.adancimeScris", grup: "litere.grupScris", min: -20, max: 0, pas: 0.1, vizibil: ingropat },
    { cheie: "jocInsertie", tip: "numar", eticheta: "litere.jocInsertie", grup: "litere.grupScris", min: 0, max: 1, pas: 0.05, vizibil: (p) => cuScris(p) && p.modScris === "locas" },
    { cheie: "offsetX", tip: "numar", eticheta: "litere.scrisX", grup: "litere.grupScris", min: -150, max: 150, pas: 0.5, vizibil: cuScris },
    { cheie: "offsetY", tip: "numar", eticheta: "litere.scrisY", grup: "litere.grupScris", min: -150, max: 150, pas: 0.5, vizibil: cuScris },
    { cheie: "rotatieScris", tip: "numar", eticheta: "litere.scrisRotatie", grup: "litere.grupScris", min: -180, max: 180, pas: 1, vizibil: cuScris },
    { cheie: "culoareScris", tip: "culoare", eticheta: "litere.culoare", grup: "litere.grupScris", vizibil: cuScris },
    ...Array.from({ length: NR_TEMATICI }, (_, k) => campuriTema(k + 1)).flat(),
    { cheie: "fisier3mfBaza", tip: "alegere", eticheta: "litere.model", grup: "litere.grupBaza", optiuni: OPTIUNI_BAZE },
    { cheie: "scaraBaza", tip: "numar", eticheta: "litere.scaraProcent", grup: "litere.grupBaza", min: 10, max: 400, pas: 1, vizibil: cuBaza },
    { cheie: "adancimeInfigere", tip: "numar", eticheta: "litere.adancimeInfigere", grup: "litere.grupBaza", min: 1, max: 30, pas: 0.5, vizibil: cuBaza },
    { cheie: "jocInfigere", tip: "numar", eticheta: "litere.jocInfigere", grup: "litere.grupBaza", min: 0, max: 1, pas: 0.05, vizibil: cuBaza },
    { cheie: "literaX", tip: "numar", eticheta: "litere.literaPeBazaX", grup: "litere.grupBaza", min: -150, max: 150, pas: 0.5, vizibil: cuBaza },
    { cheie: "literaZ", tip: "numar", eticheta: "litere.literaPeBazaZ", grup: "litere.grupBaza", min: -150, max: 150, pas: 0.5, vizibil: cuBaza },
    { cheie: "rotatieLitera", tip: "numar", eticheta: "litere.rotatieLitera", grup: "litere.grupBaza", min: -180, max: 180, pas: 1, vizibil: cuBaza },
  ],
};
