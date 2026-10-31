import { groupedShape } from "@/lib/editorBooleans";
import { createLocalId } from "@/lib/localIds";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";
import { forma } from "@/magic3d/logo/constructie";
import type { CorpPiesa, PiesaCalculata } from "@/magic3d/logo/piese";
import { tl } from "@/magic3d/logo/texte";

/*
 * Piesa din masuratori ca forme ale editorului: cilindri, cutii si un con, iar gaurile ca forme-gaura
 * in acelasi grup, ca orice piesa desenata de mana. Se editeaza deci mai departe ("Editeaza grupul"),
 * iar exportul o face un singur corp.
 */

const CULOARE = "#1f8a5b";

function formaCorp(corp: CorpPiesa, i: number): WorkplaneShape {
  const nume = corp.gaura ? `${tl("numeGaura")} ${i + 1}` : tl("numePiesa");
  if (corp.forma === "cutie") {
    return forma({ nume, culoare: CULOARE, latime: corp.latime, adancime: corp.adancime, inaltime: corp.inaltime, x: corp.x, z: corp.z, elevatie: corp.elevatie, gaura: corp.gaura, colturi: 0 });
  }
  if (corp.forma === "con") {
    return forma({ nume, culoare: CULOARE, latime: corp.latime, adancime: corp.adancime, inaltime: corp.inaltime, x: corp.x, z: corp.z, elevatie: corp.elevatie, gaura: corp.gaura, tip: "cone", razaJos: (corp.diamJos ?? corp.latime) / 2, razaSus: (corp.diamSus ?? 0) / 2 });
  }
  if (corp.culcat) {
    // Cilindrul culcat: intors 90 de grade in jurul lui x, axa lui ajunge pe z. Se roteste in jurul mijlocului,
    // deci elevatia (a cilindrului nerotit) se socoteste din mijlocul dorit.
    const mijlocY = corp.elevatie + corp.inaltime / 2;
    return forma({ nume, culoare: CULOARE, latime: corp.latime, adancime: corp.latime, inaltime: corp.adancime, x: corp.x, z: corp.z, elevatie: mijlocY - corp.adancime / 2, gaura: corp.gaura, tip: "cylinder", rotatieX: 90 });
  }
  return forma({ nume, culoare: CULOARE, latime: corp.latime, adancime: corp.adancime, inaltime: corp.inaltime, x: corp.x, z: corp.z, elevatie: corp.elevatie, gaura: corp.gaura, tip: "cylinder" });
}

/** Piesa calculata ca un singur grup (solidele unite, gaurile scazute), cu numele dat. */
export function construiestePiesa(piesa: PiesaCalculata, nume: string): WorkplaneShape {
  const forme = piesa.corpuri.map(formaCorp);
  if (forme.length === 1) return canonicalizeShape({ ...forme[0], name: nume });
  const grup = groupedShape(forme);
  if (!grup) throw new Error(tl("eroareConstructie"));
  return canonicalizeShape({ ...grup, id: createLocalId("piesa"), name: nume });
}
