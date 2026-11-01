/**
 * BALAMA PRINT-IN-PLACE PENTRU DOUA PARTI PLIABILE — balamaua editorului (forma "Balama" din
 * layerling, lib/hingeGeometry.ts), adusa in manifold ca sa i se poata lipi alte corpuri.
 *
 * Nu e o a doua balama: zalele, axul, gaura cu joc si frunzele vin din hingeTriangles, exact cum le
 * construieste si le printeaza editorul. Aici doar se schimba cadrul si se despart cele doua parti:
 *   · in editor axul e pe X, Y in sus, frunzele pe Z; aici Z e in sus si frunzele pe Y
 *     (partea A spre y negativ, B spre y pozitiv), axul la inaltimea `ax`;
 *   · inchiderea: B se roteste 180° in jurul axului, (y, z) -> (-y, 2·ax - z).
 *
 * Nucleul nu alege cotele: inaltimea axului, axul, jocul, grosimea frunzelor si zalele vin de la produs.
 */
import { hingePlan, hingeTriangles, type HingeShapeFields } from '@/lib/hingeGeometry';

let MOD: any = null;
export function configureManifold(mod: any): void { MOD = mod; }

export interface CereriBalama {
  /** Latimea pe X a balamalei, mm (centrata pe x = 0). */
  latime: number;
  /** Inaltimea axului deasupra placii, mm (zalele au diametrul 2·ax). */
  ax: number;
  /** Raza axului printat, mm. */
  razaAx: number;
  /** Jocul dintre ax si gaura, dintre zale si dintre frunze si zalele celeilalte parti, mm. */
  joc: number;
  /** Grosimea frunzelor (si a bratelor care se lipesc de ele), mm. */
  grosime: number;
  /** Numarul de zale (impar: A le are pe cele de la capete). */
  zale: number;
}

export interface Balama {
  /** Partea A (spre y negativ): frunza, zalele ei si axul. */
  a: any;
  /** Partea B (spre y pozitiv): frunza si zalele ei, cu gaura axului. */
  b: any;
  /** De unde (|y|) poate incepe bratul unei parti pe toata latimea, fara sa atinga zalele celeilalte. */
  inceputBrat: number;
  /** Grosimea frunzelor dupa limitele editorului (trebuie sa fie cea ceruta). */
  grosime: number;
}

export function balamaPliabila(c: CereriBalama): Balama {
  const { Manifold, Mesh } = MOD;
  const forma: HingeShapeFields = {
    width: c.latime,
    height: 2 * c.ax,
    hingeKnuckles: c.zale,
    hingePinDiameter: 2 * c.razaAx,
    hingeLeafThickness: c.grosime,
    hingeClearance: c.joc,
    hingeAngle: 0,
  };
  // Frunzele cat mai scurte: bratele produsului le continua.
  const plan = hingePlan({ ...forma, depth: 0 });
  const triunghiuri = hingeTriangles({ ...forma, depth: plan.depth });

  // Triunghiurile sudate intr-o plasa indexata; (x, y, z) -> (x, z, y) e o oglindire, deci ordinea varfurilor se inverseaza.
  const id = new Map<string, number>();
  const varfuri: number[] = [];
  const fete: number[] = [];
  for (const t of triunghiuri) {
    for (const [x, y, z] of [t[0], t[2], t[1]]) {
      const cheie = `${Math.round(x * 1e5)},${Math.round(y * 1e5)},${Math.round(z * 1e5)}`;
      let i = id.get(cheie);
      if (i === undefined) {
        i = id.size;
        id.set(cheie, i);
        varfuri.push(x, z, y);
      }
      fete.push(i);
    }
  }
  const plasa = new Mesh({ numProp: 3, vertProperties: new Float32Array(varfuri), triVerts: new Uint32Array(fete) });
  plasa.merge();
  const parti = new Manifold(plasa).decompose();
  const mijloc = (m: any) => { const b = m.boundingBox(); return (b.min[1] + b.max[1]) / 2; };
  const a = parti.filter((m: any) => mijloc(m) < 0);
  const b = parti.filter((m: any) => mijloc(m) >= 0);
  if (a.length !== 1 || b.length !== 1) throw new Error(`balama: ${a.length}+${b.length} parti`);
  return { a: a[0], b: b[0], inceputBrat: plan.leafStart, grosime: plan.leaf };
}
