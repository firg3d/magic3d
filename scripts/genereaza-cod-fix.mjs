/**
 * GENERATOR DE COD FIX pentru licența comercială.
 *
 *   node scripts/genereaza-cod-fix.mjs
 *
 * Tipărește un cod și numărul seriei propuse. ATÂT: nu scrie în `coduri-fixe.ts`, nu salvează
 * nicăieri, nu trimite nimic. Codul se lipește manual, de om, în lista de serii — un script care
 * ar edita singur fișierul ar putea, într-o zi cu grabă, să înlocuiască seria activă a
 * clienților care au plătit deja.
 *
 * ALFABET FĂRĂ CARACTERE AMBIGUE. Lipsesc `0`, `O`, `1`, `l` și `I`, fiindcă acest cod se
 * citește cu ochiul dintr-un email și se tastează. Un client care confundă `l` cu `1` scrie
 * „codul nu merge", iar noi căutăm o oră un defect care nu există.
 *
 * ALEATORIU CRIPTOGRAFIC, nu `Math.random()`: 24 de caractere din alfabetul ăsta înseamnă ~123
 * de biți de entropie, adică nu se ghicește. Nu fiindcă ar fi o cheie — e o dovadă de licență —
 * dar un cod ghicibil ar face inutilă și dovada.
 */
import { randomInt } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './continut.mjs';

const ALFABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
const LUNGIME = 24;
/** grupuri de 6, cu cratimă: se citește și se dictează la telefon fără să pierzi rândul */
const GRUP = 6;

const cod = Array.from({ length: LUNGIME }, () => ALFABET[randomInt(ALFABET.length)]).join('');
const codGrupat = cod.match(new RegExp(`.{1,${GRUP}}`, 'g')).join('-');

/** ultima serie din fișier, ca să propunem următorul număr — citit, nu scris */
function ultimaSerie() {
  try {
    const sursa = readFileSync(join(ROOT, 'src', 'core', 'config', 'coduri-fixe.ts'), 'utf8');
    const numere = [...sursa.matchAll(/serie:\s*(\d+)/g)].map((m) => Number(m[1]));
    return numere.length ? Math.max(...numere) : 0;
  } catch { return 0; }
}

const serie = ultimaSerie() + 1;

console.log(`
  COD FIX NOU — nu s-a scris nicaieri, se lipeste manual

  cod (fara cratime, asa se compara):   ${cod}
  cod (grupat, asa se pune in email):   ${codGrupat}
  seria propusa:                        ${serie}

  In src/core/config/coduri-fixe.ts:

    { cod: '${cod}', serie: ${serie}, plan: 'web-perpetua', activ: true },

  Cand adaugi o serie noua fiindca cea veche s-a scurs, LASA seria veche cu activ: true inca o
  perioada: clientii care au platit deja nu trebuie sa ramana fara licenta peste noapte.
`);
