/**
 * NUCLEU — EVALUAREA FONTURILOR, LA CERERE, pentru filtrarea din selector.
 *
 * Scris pentru Cutii Litere, folosit acum și de Litere LED, Nume 3D și Cuvinte Decor. Ce e
 * comun e MECANISMUL, nu criteriul: fiecare aplicație are alt motiv să respingă un font (la
 * cutii nu rămâne interior de umplut, la LED nu încape banda, la nume literele nu se ating),
 * deci măsurătoarea propriu-zisă vine ca funcție de la apelant.
 *
 * DE CE FILTRAREA NU POATE FI O LISTĂ SCRISĂ DE MÂNĂ: e dinamică. La 120 mm un font subțire e
 * respins, la 200 nu. Deci se măsoară — dar măsurătoarea cere fontul PARSAT, iar asta înseamnă
 * descărcat.
 *
 * ┌──────────────────────────────────────────────────────────────────────────────────────────┐
 * │ DE CE LA CERERE ȘI NU ÎN BLOC. Varianta dinainte mătura toate familiile după primul       │
 * │ randat: 204 fișiere .ttf, ~15 MB, la deschiderea aplicației, fără ca omul să fi atins     │
 * │ selectorul de fonturi. Măsurat în fila de rețea: ultima cerere sosea la 20 de secunde pe  │
 * │ localhost. Pe o conexiune de telefon, aceleași 15 MB blochează minute întregi rețeaua de  │
 * │ care au nevoie WASM-ul și scena 3D — adică exact pornirea aplicației.                     │
 * │                                                                                           │
 * │ Ironia: comentariul de aici spunea deja, din prima zi, „NU se face în bloc la pornire".   │
 * │ Se făcea totuși, fiindcă `porneste()` era chemat din `rebuild()`, care rulează la         │
 * │ pornire. Intenția era scrisă, codul făcea altceva, iar nimeni nu s-a uitat în fila de     │
 * │ rețea.                                                                                    │
 * └──────────────────────────────────────────────────────────────────────────────────────────┘
 *
 * Acum se evaluează UN font, când cineva chiar are nevoie de verdictul lui — adică atunci când
 * rândul lui devine vizibil în listă. Verdictele se țin până se schimbă configurația.
 *
 * Până sosește verdictul, fontul nu e marcat — mai bine niciun avertisment decât unul fals.
 */
import { fontCached, loadFont } from './fonts.js';

export interface Evaluator<V> {
  /** verdictul deja calculat, sau undefined dacă fontul n-a fost încă cerut */
  verdict(fisier: string): V | undefined;
  /**
   * Cere verdictul unui font. Îl descarcă și îl parsează dacă e prima oară, altfel întoarce
   * imediat ce are în cache. Nu aruncă: un font indisponibil rămâne fără verdict, deci nemarcat.
   */
  cere(fisier: string): Promise<V | undefined>;
}

export function creeazaEvaluatorFonturi<V>(
  /** semnătura configurației care influențează verdictul; când se schimbă, cache-ul cade */
  cheie: () => string,
  /** măsurătoarea propriu-zisă, a aplicației */
  evalueaza: (font: any) => V,
): Evaluator<V> {
  const verdicte = new Map<string, V>();
  /** cererile în curs, ca două rânduri vizibile deodată să nu descarce același font de două ori */
  const inCurs = new Map<string, Promise<V | undefined>>();
  let cheieEvaluata = '';

  /** cache-ul e valabil doar pentru configurația curentă */
  function verificaCheia(): void {
    const k = cheie();
    if (k === cheieEvaluata) return;
    verdicte.clear();
    inCurs.clear();
    cheieEvaluata = k;
  }

  return {
    verdict(fisier: string) {
      verificaCheia();
      return verdicte.get(fisier);
    },

    cere(fisier: string) {
      verificaCheia();
      const gata = verdicte.get(fisier);
      if (gata !== undefined) return Promise.resolve(gata);
      const pornit = inCurs.get(fisier);
      if (pornit) return pornit;

      const k = cheieEvaluata;
      const p = (async () => {
        try {
          const font = fontCached(fisier) ?? await loadFont(fisier);
          const v = evalueaza(font);
          // configurația s-a schimbat cât timp se descărca: verdictul e pentru altceva
          if (cheie() === k) verdicte.set(fisier, v);
          return v;
        } catch {
          return undefined;      // font indisponibil — rămâne nemarcat
        } finally {
          inCurs.delete(fisier);
        }
      })();
      inCurs.set(fisier, p);
      return p;
    },
  };
}
