/**
 * NUCLEU — CIOBURILE NUMERICE, ELIMINATE ÎNAINTE DE EXPORT (regulă de nucleu, HUS.2).
 *
 * DE CE EXISTĂ. O deschidere morfologică (`offset(−r)` urmat de `offset(+r)`) sau un boolean cu
 * un tipar dens lasă contururi de lățime numerică — 0,1 × 0,0 mm. Ele nu se văd în volum, nu se
 * văd pe ecran și nu schimbă bounding box-ul, dar după boolean ies COMPONENTE separate: cochilii
 * goale, cu volum 0,0 mm³.
 *
 * Prins pe viu la spatele perforat al huselor: piesa raporta 3–7 bucăți în loc de una. Un 3MF cu
 * șase cochilii goale e exact ce interzice stratul 1 din A.2 („exportul conține un singur obiect,
 * fără componente"), iar slicerul le arată ca obiecte reale pe care omul le șterge de mână.
 *
 * REGULA, în două jumătăți care nu se despart:
 *   1. componentele sub `VOLUM_MINIM_COMPONENTA` se ELIMINĂ — sunt resturi, nu piese;
 *   2. dacă după curățare rămâne mai mult de UNA, e EROARE, nu resturi: geometria chiar s-a rupt
 *      în bucăți, iar asta nu se repară tăcut.
 *
 * Fără a doua jumătate, regula ar deveni o mătură sub covor: o piesă ruptă în două jumătăți
 * adevărate ar trece mai departe cu jumătatea mai mare, iar omul ar primi jumătate de husă.
 */

let MOD: any = null;
export function configureManifold(mod: any): void { MOD = mod; }

/**
 * Sub atâta, o componentă nu e piesă, e rest numeric (mm³).
 *
 * 0,001 cm³ = 1 mm³. Un cub de un milimetru pe latură. Nimic ce vrea cineva să printeze nu e mai
 * mic de atât, iar cioburile măsurate au ieșit toate sub 0,001 mm³ — patru ordine de mărime mai
 * jos, deci pragul nu e o linie fină pe care să stea ceva adevărat.
 */
export const VOLUM_MINIM_COMPONENTA = 1;

export class PiesaInBucati extends Error {
  constructor(public unde: string, public bucati: number, public volume: number[]) {
    // Mesaj de DEZVOLTATOR, fara diacritice, ca toate erorile interne din nucleu.
    super(`piesa "${unde}" a iesit in ${bucati} bucati adevarate: `
      + volume.map((v) => v.toFixed(1)).join(', ') + ' mm3. '
      + 'Exportul cere un singur corp (stratul 1). Cioburile numerice au fost deja scoase, '
      + 'deci astea sunt componente reale.');
    this.name = 'PiesaInBucati';
  }
}

export interface RaportCioburi {
  corp: any;
  /** câte componente au fost aruncate ca resturi */
  sterse: number;
  /** cât volum s-a aruncat (mm³) — trebuie să fie neglijabil, se raportează ca să se vadă */
  volumSters: number;
}

/**
 * CURĂȚĂ CIOBURILE și pretinde un singur corp.
 *
 * Se cheamă după orice deschidere morfologică sau boolean cu tipar, ÎNAINTE de export.
 *
 * Când nu e nimic de curățat — cazul obișnuit — întoarce CHIAR corpul primit, neatins: nu se
 * reconstruiește o piesă bună doar ca să treacă printr-o funcție. Așa regula poate sta pe drumul
 * oricărui generator fără să-i schimbe geometria.
 *
 * NU eliberează argumentul când îl întoarce neschimbat; când îl înlocuiește, corpul vechi rămâne
 * al apelantului, ca peste tot în proiect.
 */
export function curataCioburi(corp: any, unde: string): RaportCioburi {
  if (!MOD) throw new Error('manifold neconfigurat: curataCioburi');
  const parti = corp.decompose();
  if (parti.length <= 1) {
    for (const p of parti) p.delete();
    return { corp, sterse: 0, volumSters: 0 };
  }

  const cuVolum = parti.map((p: any) => ({ p, v: p.volume() }));
  const reale = cuVolum.filter((x: any) => x.v >= VOLUM_MINIM_COMPONENTA);
  const resturi = cuVolum.filter((x: any) => x.v < VOLUM_MINIM_COMPONENTA);
  const volumSters = resturi.reduce((s: number, x: any) => s + x.v, 0);

  if (reale.length > 1) {
    const volume = reale.map((x: any) => x.v).sort((a: number, b: number) => b - a);
    for (const x of cuVolum) x.p.delete();
    throw new PiesaInBucati(unde, reale.length, volume);
  }
  if (reale.length === 0) {
    for (const x of cuVolum) x.p.delete();
    throw new PiesaInBucati(unde, 0, []);
  }

  const pastrat = reale[0].p;
  for (const x of cuVolum) if (x.p !== pastrat) x.p.delete();
  return { corp: pastrat, sterse: resturi.length, volumSters };
}
