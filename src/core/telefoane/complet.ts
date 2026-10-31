/**
 * NUCLEU — CÂND E COMPLET UN MODEL DE TELEFON (HUS.1, B.2/B.5).
 *
 * O SINGURĂ LISTĂ, folosită și de verificarea de date, și de catalogul din aplicație. Dacă ar fi
 * două, ar putea ajunge un model care trece verificarea dar nu apare în listă, sau invers — unul
 * care apare în listă și cade la construcție fiindcă îi lipsește o cotă pe care doar validatorul
 * o cerea. „Complet" trebuie să însemne același lucru în amândouă locurile.
 *
 * Regula de aur (DECIZIE, B.2): cotele nu se inventează. Ce lipsește rămâne `null`, iar modelul
 * NU se publică — nu apare în lista de modele a generatorului.
 */

/** o cotă poate lipsi cât timp nu s-a transcris din desen */
export type Nr = number | null;

/** doar cât atinge lista de mai jos; ambele definiții de `Telefon` din proiect se potrivesc */
export interface CoteTelefon {
  corp: { lungime: Nr; latime: Nr; grosime: Nr; razaColt: Nr;
    profilMargine: string | null; razaMuchie: Nr };
  ecran: { proeminentaFataDeCorp: Nr };
  insulaCamera: { forma: string | null; x: Nr; y: Nr; latime: Nr; inaltime: Nr; proeminenta: Nr;
    lentile: unknown[] };
  port: { latime: Nr; inaltime: Nr; tip: string | null };
}

/** câmpurile fără de care un model nu se poate construi */
export const CAMPURI_OBLIGATORII: [string, (t: CoteTelefon) => unknown][] = [
  ['corp.lungime', (t) => t.corp.lungime], ['corp.latime', (t) => t.corp.latime],
  ['corp.grosime', (t) => t.corp.grosime], ['corp.razaColt', (t) => t.corp.razaColt],
  ['corp.profilMargine', (t) => t.corp.profilMargine], ['corp.razaMuchie', (t) => t.corp.razaMuchie],
  ['ecran.proeminentaFataDeCorp', (t) => t.ecran.proeminentaFataDeCorp],
  ['insulaCamera.forma', (t) => t.insulaCamera.forma],
  ['insulaCamera.x', (t) => t.insulaCamera.x], ['insulaCamera.y', (t) => t.insulaCamera.y],
  ['insulaCamera.latime', (t) => t.insulaCamera.latime],
  ['insulaCamera.inaltime', (t) => t.insulaCamera.inaltime],
  ['insulaCamera.proeminenta', (t) => t.insulaCamera.proeminenta],
  ['port.latime', (t) => t.port.latime], ['port.inaltime', (t) => t.port.inaltime],
  ['port.tip', (t) => t.port.tip],
];

/**
 * `0` NU e o cotă lipsă.
 *
 * `ecran.proeminentaFataDeCorp` e chiar 0 pe toate modelele cu ramă plată — sticla e la nivel cu
 * corpul. Dacă zeroul ar conta drept „necompletat", cei mai mulți iPhone-i n-ar apărea niciodată
 * în listă. Lipsa se scrie `null`, și doar `null` se citește ca lipsă.
 */
const are = (v: unknown) => v !== null && v !== undefined && v !== '';

export function coteLipsa(t: CoteTelefon): string[] {
  const lipsa = CAMPURI_OBLIGATORII.filter(([, ia]) => !are(ia(t))).map(([nume]) => nume);
  if (!t.insulaCamera.lentile.length) lipsa.push('insulaCamera.lentile (cel putin una)');
  return lipsa;
}

export const esteComplet = (t: CoteTelefon): boolean => coteLipsa(t).length === 0;
