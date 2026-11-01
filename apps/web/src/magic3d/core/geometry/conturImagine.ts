/*
 * Conturul unei imagini ca text: forma vectorizata a unui logo incarcat de client, pastrata ca
 * parametru de generator (Parametri accepta doar text, numere si bife). Imaginea insasi nu se
 * pastreaza nicaieri; ramane doar conturul, ca la "logo -> obiect".
 *
 * Formatul: "c1;latime;inaltime;x,y,x,y,...;x,y,..." - pixelii imaginii conturate (x la dreapta,
 * y in jos), cu o zecimala, cate un inel pe camp. Fara DOM si fara manifold: il citesc si panoul,
 * si worker-ul generatoarelor.
 */

export type ConturImagine = { latime: number; inaltime: number; inele: Array<Array<[number, number]>> };

const VERSIUNE = "c1";
const zecimala = (v: number) => String(Math.round(v * 10) / 10);

export function codeazaContur(latime: number, inaltime: number, inele: ReadonlyArray<ReadonlyArray<{ x: number; y: number }>>): string {
  const campuri = inele.filter((inel) => inel.length >= 3).map((inel) => inel.map((p) => `${zecimala(p.x)},${zecimala(p.y)}`).join(","));
  return [VERSIUNE, latime, inaltime, ...campuri].join(";");
}

/** Conturul din text; null cand textul e gol sau nu e un contur (alta versiune, numere stricate). */
export function decodeazaContur(text: string): ConturImagine | null {
  const campuri = text.split(";");
  if (campuri[0] !== VERSIUNE || campuri.length < 4) return null;
  const latime = Number(campuri[1]);
  const inaltime = Number(campuri[2]);
  if (!(latime > 0 && inaltime > 0)) return null;
  const inele: ConturImagine["inele"] = [];
  for (const camp of campuri.slice(3)) {
    const v = camp.split(",").map(Number);
    if (v.length < 6 || v.length % 2 || v.some((x) => !Number.isFinite(x))) return null;
    const inel: Array<[number, number]> = [];
    for (let i = 0; i < v.length; i += 2) inel.push([v[i], v[i + 1]]);
    inele.push(inel);
  }
  return inele.length ? { latime, inaltime, inele } : null;
}
