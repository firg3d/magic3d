/**
 * NUCLEU — unde sta tokenul de licenta si care e starea lui curenta.
 *
 * Separat de `licenta-token.ts`, care doar verifica: acolo e criptografie pura, fara efecte,
 * usor de testat. Aici e pastrarea in browser si starea din interfata.
 *
 * Tokenul se tine in `localStorage`, deci PE CALCULATORUL OMULUI. Nu pleaca nicaieri si nu se
 * verifica pe niciun server — vezi motivul in licenta-token.ts. Consecinta practica, care
 * merita spusa clientilor: licenta se lipeste o data pe fiecare browser si fiecare calculator
 * de pe care lucreaza.
 */
import { verificaLicenta, etichetaLicenta, esteCodFix, type StareLicenta } from './licenta-token.js';

const CHEIE = 'magic3d.licenta';

let stare: StareLicenta = { fel: 'lipsa' };

/** starea CITITA ultima data; sincrona, ca s-o poata folosi randarea */
export function stareLicenta(): StareLicenta { return stare; }
/** eticheta scurta pentru bara de jos si pentru fisa de productie */
export function etichetaCurenta(): string { return etichetaLicenta(stare); }
/** tokenul brut, pentru campul din Setari si pentru raportul de problema */
export function tokenSalvat(): string { try { return localStorage.getItem(CHEIE) ?? ''; } catch { return ''; } }

/** Se cheama o data la pornire. Nu arunca: un token stricat nu opreste aplicatia. */
export async function incarcaLicenta(): Promise<StareLicenta> {
  stare = await verificaLicenta(tokenSalvat());
  return stare;
}

/**
 * Salveaza si verifica un token nou. Intoarce starea, ca interfata sa poata spune exact ce
 * s-a intamplat: acceptat, expirat sau respins.
 *
 * Un token gol STERGE licenta — asa se revine la „uz personal" fara sa umblam prin browser.
 */
export async function salveazaLicenta(token: string): Promise<StareLicenta> {
  const t = token.trim();
  try { if (t) localStorage.setItem(CHEIE, t); else localStorage.removeItem(CHEIE); } catch { /* mod privat */ }
  stare = await verificaLicenta(t);
  return stare;
}

/**
 * AUTO-INSTALARE DIN ADRESA: `?licenta=<token sau cod>`.
 *
 * Emailul de la Shopify poate duce oriunde pe site — pe orice generator, pe landing, pe o pagina
 * din Academie — deci verificarea asta ruleaza in pornirea COMUNA a aplicatiilor, nu intr-una
 * dintre ele. Parametrul se sterge din adresa imediat ce a fost citit: altfel ramane in
 * istoric, in bara de adresa si in orice captura de ecran pe care omul o trimite mai departe.
 *
 * NU SE SUPRASCRIE O LICENTA MAI BUNA. Daca in browser sta deja un token nominal valid si prin
 * link vine un cod fix, tokenul RAMANE: are titular si numar de licenta, adica exact ce se pune
 * pe fisa de productie. Codul poate fi aplicat oricand din Setari, iar interfata spune asta.
 *
 * Intoarce ce s-a intamplat, ca interfata sa arate bannerul potrivit. Nu arunca niciodata.
 */
export type RezultatAdresa =
  | { fel: 'nimic' }
  | { fel: 'activata'; stare: StareLicenta }
  | { fel: 'pastrata'; stare: StareLicenta }
  | { fel: 'respinsa' };

export async function instaleazaDinAdresa(): Promise<RezultatAdresa> {
  let valoare = '';
  try {
    valoare = (new URLSearchParams(location.search).get('licenta') ?? '').trim();
  } catch { return { fel: 'nimic' }; }
  if (!valoare) return { fel: 'nimic' };

  const curata = () => {
    try {
      const u = new URL(location.href);
      u.searchParams.delete('licenta');
      history.replaceState(null, '', u.toString());
    } catch { /* fara History API: parametrul ramane, licenta tot s-a aplicat */ }
  };

  const venita = await verificaLicenta(valoare);
  if (venita.fel !== 'valida') { curata(); return { fel: 'respinsa' }; }

  const existenta = await verificaLicenta(tokenSalvat());
  // „mai buna" inseamna aici: nominala si inca valabila. Un cod fix nu o inlocuieste.
  const esteMaiBuna = existenta.fel === 'valida' && !esteCodFix(existenta) && esteCodFix(venita);
  if (esteMaiBuna) {
    stare = existenta;
    curata();
    return { fel: 'pastrata', stare };
  }

  await salveazaLicenta(valoare);
  curata();
  return { fel: 'activata', stare };
}
