/*
 * Culoarea pe triunghi din 3MF-urile slicerelor: atributul `paint_color` (Bambu Studio, OrcaSlicer)
 * si `slic3rpe:mmu_segmentation` (PrusaSlicer) poarta acelasi cod.
 *
 * FORMATUL (verificat pe fisiere salvate de Bambu Studio 2.8; descris in docs/pictura-3mf.md):
 * un sir de biti scris in cifre hexazecimale, de la coada la cap (ultima cifra e primul grup de
 * 4 biti), fiecare cifra cu bitul cel mai putin semnificativ primul. Fiecare triunghi incepe cu
 * 2 biti = cate laturi are impartite (0 = triunghi intreg). Un triunghi intreg urmeaza cu starea:
 *   - stare 0..2: 2 biti;
 *   - stare 3..15: bitii "11", apoi 4 biti cu (stare - 3).
 * Starea 0 = culoarea obiectului (extruderul lui), starea k = extruderul k.
 * Un triunghi impartit urmeaza cu 2 biti (latura speciala) si apoi copiii lui, recursiv.
 *
 *   extruder 1 -> "4", extruder 2 -> "8", extruder 3 -> "0C", extruder 5 -> "2C", extruder 16 -> "DC".
 *
 * Magic3D scrie numai triunghiuri intregi. La citire, un triunghi impartit de slicer primeste
 * starea care acopera cea mai mare parte din el.
 */

export const STARE_MAXIMA = 16;

/** Codul unui triunghi intreg cu starea data (1..16); "" pentru starea 0 (culoarea obiectului). */
export function codeazaStare(stare: number): string {
  if (!Number.isInteger(stare) || stare < 0 || stare > STARE_MAXIMA) throw new Error(`Stare de culoare in afara limitelor: ${stare}`);
  if (stare === 0) return "";
  if (stare < 3) return (stare * 4).toString(16).toUpperCase();
  return `${(stare - 3).toString(16).toUpperCase()}C`;
}

/** Bitii codului, in ordinea in care i-a scris slicerul. */
function biti(cod: string): number[] {
  const out: number[] = [];
  for (let i = cod.length - 1; i >= 0; i -= 1) {
    const cifra = parseInt(cod[i], 16);
    if (Number.isNaN(cifra)) throw new Error(`Cod de culoare invalid: ${cod}`);
    for (let b = 0; b < 4; b += 1) out.push((cifra >> b) & 1);
  }
  return out;
}

/**
 * Starea dominanta a unui triunghi codat (0 daca nu e pictat). Copiii unui triunghi impartit
 * acopera parti egale din parintele lor - asa imparte slicerul.
 */
export function decodeazaStare(cod: string | null | undefined): number {
  if (!cod) return 0;
  const b = biti(cod.trim());
  let poz = 0;
  const citeste = (n: number) => {
    let v = 0;
    for (let i = 0; i < n; i += 1) v |= (b[poz++] ?? 0) << i;
    return v;
  };
  const arii = new Map<number, number>();
  const nod = (pondere: number, adancime: number) => {
    if (poz >= b.length || adancime > 32) return;
    const laturi = citeste(2);
    if (laturi === 0) {
      let stare = citeste(2);
      if (stare === 3) stare = citeste(4) + 3;
      arii.set(stare, (arii.get(stare) ?? 0) + pondere);
      return;
    }
    citeste(2); // latura speciala: nu conteaza pentru culoarea dominanta
    const copii = laturi + 1;
    for (let i = 0; i < copii; i += 1) nod(pondere / copii, adancime + 1);
  };
  nod(1, 0);
  let castig = 0;
  let maxim = -1;
  for (const [stare, arie] of arii) if (arie > maxim + 1e-12) { castig = stare; maxim = arie; }
  return castig;
}
