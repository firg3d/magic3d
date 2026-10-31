/**
 * NUCLEU — produsele din magazin: identificatori, prețuri și linkuri de checkout.
 *
 * SINGURA SURSĂ a acestor date. Niciun link de checkout nu se construiește altundeva și niciun
 * preț nu se scrie de mână în interfață. Verificarea e mecanică: `npm run test:produse` caută
 * „praktik3d.ro/cart" în tot depozitul și pică dacă îl găsește în afara acestui fișier.
 *
 * ┌─────────────────────────────────────────────────────────────────────────────────────────┐
 * │ PREȚURILE DE MAI JOS TREBUIE SĂ CORESPUNDĂ CU CELE DIN SHOPIFY.                          │
 * │                                                                                          │
 * │ Nu sunt citite din magazin — aplicația nu sună acasă și nu are cum. Sunt scrise aici cu  │
 * │ mâna, deci când schimbi prețul în Shopify îl schimbi ȘI aici, în acest fișier, care e    │
 * │ singurul loc din aplicație unde apare. Un preț afișat mai mic decât cel de la casă e o   │
 * │ reclamație, nu o eroare de program.                                                      │
 * └─────────────────────────────────────────────────────────────────────────────────────────┘
 *
 * LINKUL SARE PESTE PAGINA DE PRODUS ȘI PESTE COȘ. Forma `/cart/<variantId>:<cantitate>` duce
 * direct la checkout, cu produsul deja în coș. Un pas mai puțin înseamnă mai puțini oameni
 * pierduți pe drum — iar cine a ajuns să apese butonul din aplicație s-a hotărât deja.
 */

export type CheieProdus = 'licenta' | 'suporter';

export interface Produs {
  /** ID-ul VARIANTEI din Shopify, nu al produsului: linkul de checkout pe el se face */
  variantId: string;
  /** adresa de checkout, cu varianta și cantitatea deja în ea */
  checkout: string;
  /** prețul, ca număr, în moneda de mai jos — vezi caseta de sus înainte să-l schimbi */
  pret: number;
  moneda: 'RON';
  sku: string;
  /** licența comercială nu expiră; e scris aici ca să nu se presupună altceva în interfață */
  permanent: boolean;
}

export const PRODUSE: Record<CheieProdus, Produs> = {
  licenta: {
    variantId: '58784023282009',
    checkout: 'https://praktik3d.ro/cart/58784023282009:1',
    pret: 149,
    moneda: 'RON',
    sku: 'M3D-LIC-WEB',
    permanent: true,
  },
  suporter: {
    variantId: '58784804766041',
    checkout: 'https://praktik3d.ro/cart/58784804766041:1',
    pret: 15,
    moneda: 'RON',
    sku: 'M3D-SUP',
    permanent: false,
  },
};

/**
 * Linkul de checkout pentru un produs, în limba cerută.
 *
 * `?locale=en` fiindcă magazinul are selector de limbă: fără el, un client care citește site-ul
 * în engleză ajunge la o casă în română și abandonează. Româna e limba implicită a magazinului,
 * deci acolo nu se adaugă nimic — un parametru redundant e un parametru care ajunge în analytics
 * și în linkuri copiate.
 */
export function linkCheckout(produs: CheieProdus, limba: string = 'ro'): string {
  const baza = PRODUSE[produs].checkout;
  return limba === 'en' ? `${baza}?locale=en` : baza;
}

/** prețul, gata de afișat: „149 RON". Interfața nu compune niciodată singură șirul ăsta. */
export function pretAfisat(produs: CheieProdus): string {
  const p = PRODUSE[produs];
  return `${p.pret} ${p.moneda}`;
}
