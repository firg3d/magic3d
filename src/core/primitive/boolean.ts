/**
 * NUCLEU — UNIREA SIGURĂ A DOUĂ SOLIDE (regulă de nucleu, HUS.1).
 *
 * DE CE EXISTĂ. Două corpuri care se ating pe o față coplanară se pot uni sau NU, după forma
 * contactului — iar din cod nu se vede în care caz ești.
 *
 * Măsurat: două cuburi aliniate care se ating pe o față întreagă ies o singură bucată. Buza
 * camerei, lipită de fundul husei pe geometria reală, iese în DOUĂ — iar la 0,001 mm de
 * suprapunere, într-una. Aceeași natură de contact, rezultate diferite, și nu se poate spune
 * dinainte care e care fără să construiești.
 *
 * Când nu se unesc, volumul e corect și forma arată corect pe ecran; defectul se vede abia în
 * slicer sau într-un 3MF cu două obiecte. De-aia verificarea e NECONDIȚIONATĂ: nu se poate
 * decide de la caz la caz care contact e „destul de bun".
 *
 * S-a întâmplat de trei ori în proiect, în locuri fără legătură între ele:
 *   · locașul feței la corpul luminos (rezolvat cu 0,2 mm depășire);
 *   · bara de picior la Rame Tematice;
 *   · buza camerei la huse, prinsă de testul de conectivitate din HUS.1.
 *
 * A treia oară nu mai e ghinion, e o unealtă care lipsește. `uneste` verifică INTERSECȚIA
 * înainte de boolean și aruncă la atingere coplanară, cu numele locului. Costul e o intersecție
 * în plus; prețul greșelii e un export stricat livrat clientului.
 *
 * REGULA: în `src/core/` și în șabloanele care compun geometrie, unirile trec pe aici. `subtract`
 * nu are nevoie: o scădere care nu atinge nimic lasă corpul neschimbat, ceea ce se vede în volum.
 */

let MOD: any = null;
export function configureManifold(mod: any): void { MOD = mod; }

/**
 * Sub ce volum de intersecție se consideră „doar se ating" (mm³).
 *
 * O suprapunere reală de 0,2 mm pe un inel de câteva sute de mm² dă zeci de mm³, deci pragul nu
 * trebuie să fie fin. E pus doar ca zgomotul numeric al unui contact tangent — care ar trebui să
 * dea exact 0 — să nu treacă drept suprapunere.
 */
export const PRAG_SUPRAPUNERE = 1e-3;


export class AtingereCoplanara extends Error {
  constructor(public unde: string, public volum: number) {
    // Mesaj de DEZVOLTATOR, nu de interfata: fara diacritice, ca toate erorile interne din
    // nucleu. Omul nu-l vede niciodata — daca ajunge la el, e un bug de compunere, nu o alegere.
    super(`unire fara suprapunere la "${unde}": intersectia e ${volum.toFixed(6)} mm3. `
      + 'Doua corpuri care doar se ating pot ramane doua componente. '
      + `Suprapune-le cu ~${SUPRAPUNERE} mm inainte de unire.`);
    this.name = 'AtingereCoplanara';
  }
}

/**
 * UNEȘTE două solide, după ce verifică că se suprapun cu adevărat.
 *
 * `unde` ajunge în mesajul erorii: fără el, un eșec într-un lanț de cinci uniri n-ar spune care
 * dintre ele a fost.
 *
 * NU eliberează argumentele — cine le-a creat le eliberează, ca peste tot în proiect.
 */
export function uneste(a: any, b: any, unde: string): any {
  if (!MOD) throw new Error('manifold neconfigurat: uneste');
  const comun = a.intersect(b);
  const volum = comun.volume();
  comun.delete();
  if (volum <= PRAG_SUPRAPUNERE) throw new AtingereCoplanara(unde, volum);
  return a.add(b);
}

/**
 * Cât trebuie suprapuse două solide ca unirea să țină (mm).
 *
 * Nu e o toleranță de printare, e una de boolean: destul cât fețele să nu fie coplanare, destul
 * de puțin cât să nu schimbe cota niciunei piese. Aceeași valoare e folosită deja la locașul feței
 * din corpul luminos și la buza camerei.
 */
export const SUPRAPUNERE = 0.2;
