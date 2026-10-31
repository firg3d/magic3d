/**
 * NUCLEU — lista aplicațiilor platformei, pentru comutatorul din bara de sus (shell).
 *
 * SURSĂ UNICĂ. Fiecare aplicație are o pagină `.html` proprie (vezi vite.config.ts și testul de
 * izolare). Când adaugi o aplicație nouă, adaug-o și aici + în i18n (secțiunea `comutator`).
 * Numele vizibile stau în dicționar (regula de localizare: fără text scris direct în cod), aici
 * păstrăm doar cheia i18n + calea paginii.
 */
export interface AplicatieLink {
  cheie: string;
  href: string;
  /**
   * ASCUNSĂ DIN INTERFAȚĂ, dar vie în depozit.
   *
   * O aplicație ascunsă nu apare în comutator, nu are card în grila de pe prima pagină și nu i se
   * generează pagina de prezentare — dar pagina ei rămâne înregistrată în build, deci se ajunge
   * la ea direct pe adresă, pentru dezvoltare. Codul, datele și testele rămân neatinse: suita
   * continuă s-o acopere.
   *
   * E pentru aplicațiile care funcționează dar nu sunt gata de public. Alternativa — ștergerea —
   * ar arunca și munca, și acoperirea de teste.
   */
  ascuns?: boolean;
}

/** aplicațiile pe care le vede utilizatorul; ascunsele rămân în `APLICATII` pentru dezvoltare */
export const APLICATII_VIZIBILE = (): AplicatieLink[] => APLICATII.filter((a) => !a.ascuns);

export const APLICATII: AplicatieLink[] = [
  { cheie: 'comutator.litereDecor', href: '/litere.html' },
  { cheie: 'comutator.nume3d', href: '/nume.html' },
  { cheie: 'comutator.brelocuri', href: '/brelocuri.html' },
  { cheie: 'comutator.articulat', href: '/articulat.html' },
  { cheie: 'comutator.brelocDecor', href: '/breloc-decor.html' },
  { cheie: 'comutator.cuvinte', href: '/cuvinte.html' },
  { cheie: 'comutator.fagure', href: '/fagure.html' },
  { cheie: 'comutator.led', href: '/led.html' },
  { cheie: 'comutator.numeLed', href: '/nume-led.html' },
  { cheie: 'comutator.cutii', href: '/cutii.html' },
  { cheie: 'comutator.placute', href: '/placute.html' },
  { cheie: 'comutator.rame', href: '/rame.html' },
  /**
   * HUSELE SUNT ÎN FUNDAL PÂNĂ LA VALIDAREA COTELOR.
   *
   * Din cele 26 de modele, doar patru sunt verificate fizic; restul sunt transcrise din desene și
   * se recitesc acum, după ce prima husă printată pe cote estimate n-a nimerit. Aplicația merge și
   * e acoperită de suită — dar un utilizator care printează o husă care nu se potrivește nu se
   * întoarce. Se scoate flagul când cotele sunt confirmate.
   */
  { cheie: 'comutator.huse', href: '/huse.html', ascuns: true },
];

/** true dacă `href` corespunde paginii curente */
export function esteAplicatiaCurenta(href: string): boolean {
  const p = location.pathname;
  if (href === '/litere.html') return p === '/litere.html';
  return p === href;
}
