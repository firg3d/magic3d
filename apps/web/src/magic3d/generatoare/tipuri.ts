/*
 * Generatoarele Magic3D in editor: ce stie interfata despre un generator (parametrii, cu etichete
 * din core/i18n) si ce intoarce worker-ul (piesele, ca triunghiuri gata de pus in scena).
 * Geometria insasi ramane in apps/<generator>/ si core/geometry/, neschimbata.
 */

export type ValoareParam = string | number | boolean;
export type Parametri = Record<string, ValoareParam>;

type ParamComun = {
  cheie: string;
  /** Cheie din core/i18n (ro.json / en.json), de pilda "placute.inaltime". */
  eticheta: string | ((p: Parametri) => string);
  /** Cheia grupului din panou (tot din core/i18n), pentru titlurile de sectiune. */
  grup?: string;
  /** Ascuns cand intoarce false (de pilda lungimea tarusului, doar la prinderea "terus"). */
  vizibil?: (p: Parametri) => boolean;
};

export type ParamDef =
  | (ParamComun & { tip: "text" })
  | (ParamComun & { tip: "font" })
  | (ParamComun & { tip: "culoare" })
  | (ParamComun & { tip: "bifa" })
  | (ParamComun & { tip: "numar"; min: number | ((p: Parametri) => number); max: number | ((p: Parametri) => number); pas: number })
  | (ParamComun & { tip: "alegere"; optiuni: { valoare: string; eticheta: string }[] });

export type GeneratorDef = {
  id: string;
  /** Cheia numelui in core/i18n (comutator.<id>). */
  titlu: string;
  /** Versiunea parametrilor: urca la o schimbare care face vechile valori sa insemne altceva. */
  versiune: number;
  implicit: Parametri;
  parametri: ParamDef[];
};

/** O piesa construita: triunghiuri in coordonatele scenei (Y in sus, mm), neindexate. */
export type PiesaGenerata = { nume: string; culoare: string; positions: Float32Array };

export type RezultatGenerare = {
  piese: PiesaGenerata[];
  /** Avertizari de fabricabilitate, deja traduse. */
  avertizari: string[];
  ms: number;
};

export type CerereGenerare = { id: number; generator: string; parametri: Parametri; limba: "ro" | "en"; assetBase: string };
export type RaspunsGenerare = { id: number; ok: true; rezultat: RezultatGenerare } | { id: number; ok: false; eroare: string };

/** Ce se salveaza pe pachetul din scena, ca generatorul sa poata fi redeschis cu aceleasi valori. */
export type Magic3dGenerat = { generator: string; versiune: number; parametri: Parametri };

export function esteMagic3dGenerat(value: unknown): value is Magic3dGenerat {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.generator === "string" && typeof v.versiune === "number" && !!v.parametri && typeof v.parametri === "object"
    && Object.values(v.parametri as object).every((x) => ["string", "number", "boolean"].includes(typeof x));
}
