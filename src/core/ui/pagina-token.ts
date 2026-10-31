/**
 * PAGINA „Licențe & tokeni" — prețurile și butoanele de cumpărare, din `produse.ts`.
 *
 * Pagina e scrisă de mână, nu generată, iar numerele stăteau în text: „149" în trei locuri și
 * „15" în alte două. Scriptul ăsta le înlocuiește la încărcare din sursa unică, deci un preț
 * schimbat în Shopify se schimbă într-un singur fișier și apare peste tot.
 *
 * NUMERELE RĂMÂN ȘI ÎN HTML. Nu sunt un al doilea adevăr, sunt ce vede un crawler și cine are
 * JavaScript oprit; testul `npm run test:produse` compară textul din pagină cu `produse.ts` și
 * pică dacă cele două au divergat. Așa nu poate rămâne pe pagină un preț vechi fără să afle
 * cineva.
 *
 * Marcajul din HTML:
 *   <span data-produs="licenta" data-camp="pret">149</span>
 *   <a data-produs="suporter" data-camp="checkout" href="...">Cumpără</a>
 */
import { PRODUSE, linkCheckout, type CheieProdus } from '../config/produse.js';

/**
 * Limba PAGINII, nu preferința salvată în aplicație.
 *
 * `limba()` din i18n întoarce ce a ales omul pentru interfața generatoarelor, iar preferința aia
 * are prioritate față de `<html lang>` — corect acolo, greșit aici: pe `/en/token.html` butonul
 * trebuie să ducă la casa în engleză chiar dacă în aplicație lucrează în română. Pagina pe care
 * o citește acum e cea care decide. Prins pe engleză, unde linkul ieșea fără `?locale=en`.
 */
const limbaPaginii = (): string => (document.documentElement.lang === 'en' ? 'en' : 'ro');

const esteCheie = (x: string): x is CheieProdus => x === 'licenta' || x === 'suporter';

for (const el of document.querySelectorAll<HTMLElement>('[data-produs]')) {
  const cheie = el.dataset.produs ?? '';
  if (!esteCheie(cheie)) continue;
  const p = PRODUSE[cheie];

  switch (el.dataset.camp) {
    case 'pret':
      el.textContent = String(p.pret);
      break;
    case 'moneda':
      el.textContent = p.moneda;
      break;
    case 'checkout': {
      const a = el as HTMLAnchorElement;
      a.href = linkCheckout(cheie, limbaPaginii());
      // fila nouă, peste tot: în aplicație poate fi lucru nesalvat, iar butonul de cumpărare
      // n-are voie să-l ia cu el
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.removeAttribute('aria-disabled');
      break;
    }
    default:
      break;
  }
}
