import { getLanguage } from "@/lib/i18n";

/* Textele panoului de generatoare (romana, engleza); etichetele parametrilor vin din core/i18n. */

const RO = {
  buton: "Generatoare",
  titlu: "Generatoare Magic3D",
  alege: "Alege ce vrei să faci. Piesa apare pe placă și o poți ajusta din panou.",
  inCurand: "Celelalte generatoare Magic3D vin pe rând.",
  adauga: "Adaugă pe placă",
  lucreaza: "Construiesc…",
  viu: "Modificările se văd pe placă (ultima construcție: {ms} ms).",
  eroare: "Nu am putut construi piesa: {motiv}",
  faraDiacritice: "Fontul nu are: {litere}",
  inapoi: "Înapoi la listă",
  inchide: "Închide",
  editeaza: "Editează în generator",
} as const;

export type CheieGen = keyof typeof RO;

const EN: Record<CheieGen, string> = {
  buton: "Generators",
  titlu: "Magic3D generators",
  alege: "Choose what to make. The part appears on the plate and you can adjust it from this panel.",
  inCurand: "The other Magic3D generators follow one by one.",
  adauga: "Add to the plate",
  lucreaza: "Building…",
  viu: "Changes show on the plate (last build: {ms} ms).",
  eroare: "The part could not be built: {motiv}",
  faraDiacritice: "The font lacks: {litere}",
  inapoi: "Back to the list",
  inchide: "Close",
  editeaza: "Edit in the generator",
};

export function tg(cheie: CheieGen, valori: Record<string, string | number> = {}): string {
  const sablon = getLanguage() === "ro" ? RO[cheie] : EN[cheie];
  return sablon.replace(/\{(\w+)\}/g, (all, nume: string) => (nume in valori ? String(valori[nume]) : all));
}
