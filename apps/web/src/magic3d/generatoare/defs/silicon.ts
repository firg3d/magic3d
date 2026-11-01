import { SILICON } from "@/magic3d/apps/silicon/config";
import { PRINTER_PRESETS } from "@/lib/printerPresets.generated";
import { t } from "@/magic3d/core/i18n/index";
import type { GeneratorDef, Parametri } from "@/magic3d/generatoare/tipuri";

/* Matrita de silicon din model 3D: pozitivul, placa de separatie cu chei, cutia de turnare, tijele. Limitele vin din apps/silicon/config.ts. */

const manual = (p: Parametri) => p.separatie === "manual";

export const SILICON_DEF: GeneratorDef = {
  id: "silicon",
  titlu: "comutator.silicon",
  versiune: 1,
  categorie: "matrite",
  implicit: {
    model: "",
    scara: 100,
    umplere: true,
    distanta: SILICON.distanta,
    separatie: "auto",
    inaltimeSeparatie: 50,
    inclinareX: 0,
    inclinareY: 0,
    pereti: "2",
    canalDx: 0,
    canalDy: 0,
    marja: SILICON.marja,
    imprimanta: SILICON.imprimanta,
    culoare: "#0d9488",
  },
  parametri: [
    { cheie: "model", tip: "model", eticheta: "silicon.model", grup: "silicon.grupModel", maxTriunghiuri: SILICON.maxTriunghiuri },
    { cheie: "scara", tip: "numar", eticheta: "silicon.scara", grup: "silicon.grupModel", min: SILICON.scaraMin, max: SILICON.scaraMax, pas: 1 },
    { cheie: "umplere", tip: "bifa", eticheta: "silicon.umplere", grup: "silicon.grupModel" },
    { cheie: "separatie", tip: "alegere", eticheta: "silicon.separatie", grup: "silicon.grupSeparatie", optiuni: [{ valoare: "auto", eticheta: "silicon.separatieAuto" }, { valoare: "manual", eticheta: "silicon.separatieManual" }] },
    { cheie: "inaltimeSeparatie", tip: "numar", eticheta: "silicon.inaltimeSeparatie", grup: "silicon.grupSeparatie", vizibil: manual, min: 0, max: 100, pas: 1 },
    { cheie: "inclinareX", tip: "numar", eticheta: "silicon.inclinareX", grup: "silicon.grupSeparatie", min: -SILICON.inclinareMax, max: SILICON.inclinareMax, pas: 1 },
    { cheie: "inclinareY", tip: "numar", eticheta: "silicon.inclinareY", grup: "silicon.grupSeparatie", min: -SILICON.inclinareMax, max: SILICON.inclinareMax, pas: 1 },
    { cheie: "canalDx", tip: "numar", eticheta: "silicon.canalDx", grup: "silicon.grupSeparatie", min: -60, max: 60, pas: 1 },
    { cheie: "canalDy", tip: "numar", eticheta: "silicon.canalDy", grup: "silicon.grupSeparatie", min: -60, max: 60, pas: 1 },
    { cheie: "distanta", tip: "numar", eticheta: "silicon.distanta", grup: "silicon.grupCutie", min: SILICON.distantaMin, max: SILICON.distantaMax, pas: 0.5 },
    { cheie: "pereti", tip: "alegere", eticheta: "silicon.pereti", grup: "silicon.grupCutie", optiuni: [{ valoare: "2", eticheta: "silicon.pereti2" }, { valoare: "4", eticheta: "silicon.pereti4" }] },
    { cheie: "marja", tip: "numar", eticheta: "silicon.marja", grup: "silicon.grupCutie", min: 0, max: 30, pas: 1 },
    { cheie: "imprimanta", tip: "alegere", eticheta: "silicon.imprimanta", grup: "silicon.grupCutie", optiuni: PRINTER_PRESETS.map((x) => ({ valoare: x.id, eticheta: `${x.vendor} ${x.model}` })) },
    { cheie: "culoare", tip: "culoare", eticheta: "tava.culoare", grup: "silicon.grupCutie" },
  ],
  instructiuni: () => t("silicon.instructiuni"),
  servicii: () => [{ id: "silicon", eticheta: t("silicon.serviciu"), nota: t("silicon.serviciuNota"), mesaj: t("silicon.serviciuMesaj") }],
};
