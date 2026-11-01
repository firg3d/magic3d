/**
 * PACHETUL FAMILIE, comun generatoarelor colectiei "Craciun": o lista de nume (cate unul pe rand)
 * si asezarea ornamentelor in grila pe placile patului ales.
 */
import { GLOB_NUME } from './config.js';

export function listaNume(text: string): string[] {
  return text.split(/[,;\n]+/).map((n) => n.trim()).filter(Boolean).slice(0, GLOB_NUME.numeMax);
}

/** Asezarea in grila pe placi de latura `pat`: coltul fiecarui ornament si placa lui. */
export function grilaPachet(n: number, latime: number, adancime: number, pat: number): Array<{ x: number; y: number; placa: number }> {
  const pasX = latime + GLOB_NUME.distantaPachet;
  const pasY = adancime + GLOB_NUME.distantaPachet;
  const peRand = Math.max(1, Math.floor((pat + GLOB_NUME.distantaPachet) / pasX));
  const randuri = Math.max(1, Math.floor((pat + GLOB_NUME.distantaPachet) / pasY));
  const pePlaca = peRand * randuri;
  return Array.from({ length: n }, (_, i) => {
    const k = i % pePlaca;
    return { x: (k % peRand) * pasX, y: Math.floor(k / peRand) * pasY, placa: Math.floor(i / pePlaca) };
  });
}
