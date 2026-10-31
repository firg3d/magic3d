/**
 * ACADEMIA 3D — citirea capitolelor din `content/academia/` și randarea lor în HTML.
 *
 * Textul capitolelor e SURSA, nu o ilustrare a ei: se preia ca atare, nu se rescrie și nu se
 * rezumă la generare. Aici se face doar conversia din markdown în HTML și se pun ancorele pe
 * titluri, ca fotografiile și (mai târziu) testul să poată trimite la o secțiune anume.
 *
 * RANDAREA E DELIBERAT INCOMPLETĂ ȘI ZGOMOTOASĂ. Suportă exact ce folosesc capitolele scrise:
 * titluri, paragrafe, aldin, cursiv, linkuri, linie de secțiune și citat. Orice altceva — liste,
 * tabele, blocuri de cod, imagini în markdown — OPREȘTE generarea cu numărul liniei.
 *
 * Alternativa ar fi fost un parser complet de markdown, adică o dependență nouă, sau unul care
 * ignoră ce nu înțelege. A doua e cea periculoasă: un tabel scris în capitolul 3 peste șase luni
 * ar dispărea tăcut din pagina publicată, iar nimeni nu compară pagina cu fișierul sursă. Mai
 * bine un build picat cu „linia 47: liste nesuportate" decât o pagină din care lipsește o treime.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './continut.mjs';

const DIR = join(ROOT, 'content', 'academia');
/**
 * Capitolele fiecărei limbi: româna la rădăcină, engleza în `en/`.
 *
 * Textul e proză scrisă de om, nu șiruri de interfață, deci stă în markdown, nu în JSON — la fel
 * pentru amândouă limbile. Traducerea e un fișier lângă original, cu același frontmatter, deci se
 * editează într-un singur loc: cine traduce vede și textul, și metadatele care îl însoțesc.
 */
const DIRUL = (limba) => (limba === 'ro' ? DIR : join(DIR, limba));

const e = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const a = (s) => e(s).replace(/"/g, '&quot;');

/** diacriticele cad, restul devine cratimă: „Colțurile se ridică" → „colturile-se-ridica" */
export const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[ăâ]/gi, 'a').replace(/[îí]/gi, 'i').replace(/ș/gi, 's').replace(/ț/gi, 't')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * Frontmatter YAML, subsetul folosit: `cheie: valoare` și liste cu `- `.
 * Ghilimelele din jurul valorii se scot; numerele rămân numere.
 */
function frontmatter(text, fisier) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) throw new Error(`${fisier}: lipsește frontmatter-ul`);
  const meta = {};
  let cheieLista = null;
  for (const linie of m[1].split(/\r?\n/)) {
    const lista = linie.match(/^\s*-\s+(.*)$/);
    if (lista && cheieLista) { meta[cheieLista].push(lista[1].trim()); continue; }
    const kv = linie.match(/^([a-zA-Z][\w]*):\s*(.*)$/);
    if (!kv) continue;
    const [, k, v] = kv;
    if (v === '') { meta[k] = []; cheieLista = k; continue; }
    cheieLista = null;
    const curat = v.replace(/^"(.*)"$/, '$1');
    meta[k] = /^\d+$/.test(curat) ? Number(curat) : curat;
  }
  return { meta, corp: m[2] };
}

/** aldin, cursiv, linkuri — aplicate DUPĂ escape, ca textul să rămână text */
function inline(s) {
  return e(s)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, u) => {
      const extern = /^https?:\/\//.test(u) && !u.includes('magic3d.ro');
      return `<a href="${a(u)}"${extern ? ' target="_blank" rel="noopener"' : ''}>${t}</a>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
}

/**
 * Markdown → HTML, subsetul de mai sus.
 *
 * `peSectiune(slugSectiune)` se apelează la închiderea fiecărei secțiuni de nivel 2 și poate
 * întoarce HTML (o fotografie, un locaș gol) care se insereazăimediat după primul paragraf al
 * secțiunii — acolo unde cititorul tocmai a citit cum arată defectul.
 */
export function md(text, { fisier = '?', dupaPrimulParagraf = () => '', peTitlu = () => null } = {}) {
  const linii = text.split(/\r?\n/);
  const out = [];
  let i = 0;
  let sectiune = null;          // slug-ul secțiunii curente de nivel 2
  let paragrafeInSectiune = 0;

  const refuza = (n, ce) => { throw new Error(`${fisier}: linia ${n + 1}: ${ce} — nesuportat de randorul Academiei`); };

  while (i < linii.length) {
    const l = linii[i];
    if (!l.trim()) { i++; continue; }

    if (/^(\s*[-*+]\s+|\s*\d+\.\s+)/.test(l)) refuza(i, 'liste');
    if (l.trim().startsWith('|')) refuza(i, 'tabele');
    if (l.trim().startsWith('```')) refuza(i, 'blocuri de cod');
    if (/^!\[/.test(l.trim())) refuza(i, 'imagini în markdown (se pun din manifest)');

    if (/^---+\s*$/.test(l)) { out.push('<hr>'); i++; continue; }

    const h = l.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      const nivel = h[1].length;
      const titlu = h[2].trim();
      if (nivel === 2) { sectiune = slug(titlu); paragrafeInSectiune = 0; }
      // `peTitlu` poate înlocui CONȚINUTUL titlului (ex. să-l facă link către capitol). Textul
      // rămâne al autorului; se schimbă doar ce e în jurul lui.
      const inner = peTitlu(nivel, titlu, slug(titlu)) ?? inline(titlu);
      out.push(nivel === 1
        ? `<h1>${inner}</h1>`
        : `<h${nivel} id="${a(slug(titlu))}">${inner}</h${nivel}>`);
      i++; continue;
    }

    if (l.startsWith('>')) {
      const bloc = [];
      while (i < linii.length && (linii[i].startsWith('>') || (bloc.length && linii[i].trim() && !linii[i].startsWith('#')))) {
        const continut = linii[i].replace(/^>\s?/, '');
        if (continut.trim()) bloc.push(continut);
        else if (bloc.length) bloc.push('');
        i++;
        if (i < linii.length && !linii[i].startsWith('>')) break;
      }
      const paragrafe = bloc.join('\n').split(/\n{2,}/).filter((p) => p.trim());
      out.push(`<blockquote>${paragrafe.map((p) => `<p>${inline(p.replace(/\n/g, ' '))}</p>`).join('')}</blockquote>`);
      continue;
    }

    // paragraf: liniile până la primul rând gol
    const bloc = [];
    while (i < linii.length && linii[i].trim() && !/^(#{1,3}\s|>|---+\s*$)/.test(linii[i])) {
      bloc.push(linii[i]); i++;
    }
    const txt = bloc.join(' ').trim();
    // un rând singur, integral cursiv, e o notă (ex. „*9 minute*") — nu un paragraf de proză
    const nota = txt.match(/^\*([^*]+)\*$/);
    out.push(nota ? `<p class="ac-nota">${inline(nota[1])}</p>` : `<p>${inline(txt)}</p>`);
    paragrafeInSectiune++;
    if (sectiune && paragrafeInSectiune === 1) {
      const extra = dupaPrimulParagraf(sectiune);
      if (extra) out.push(extra);
    }
  }
  return out.join('\n');
}

/** un capitol citit de pe disc; `corp` e markdown-ul brut, fără frontmatter */
export function citesteCapitol(fisier, limba = 'ro') {
  const cale = join(DIRUL(limba), fisier);
  const { meta, corp } = frontmatter(readFileSync(cale, 'utf8'), fisier);
  for (const cheie of ['slug', 'titlu', 'h1', 'titluSeo', 'metaDescriere']) {
    if (!meta[cheie]) throw new Error(`${fisier}: lipsește „${cheie}" din frontmatter`);
  }
  return { ...meta, fisier, corp };
}

/**
 * Toate capitolele, în ordinea numărului din nume. Capitolul 0 e hub-ul.
 *
 * Fișierul hub-ului conține și specificația secțiunii de landing și notele de implementare;
 * pagina publică se oprește la primul titlu de nivel 1 de după corpul propriu-zis.
 */
export function capitole(limba = 'ro') {
  const dir = DIRUL(limba);
  if (!existsSync(dir)) throw new Error(`Academia: lipsește folderul de capitole pentru „${limba}" (${dir})`);
  return readdirSync(dir).filter((f) => /^\d\d-.*\.md$/.test(f)).sort()
    .map((f) => citesteCapitol(f, limba));
}

/** partea publicabilă a hub-ului: până la „# Secțiune pentru landing" */
export function corpHub(hub) {
  const taiere = hub.corp.indexOf('\n# Secțiune pentru landing');
  return taiere > 0 ? hub.corp.slice(0, taiere) : hub.corp;
}

/** intrările din `public/academia/imagini.json`, sau {} dacă importul n-a rulat încă */
export function imagini() {
  const cale = join(ROOT, 'public', 'academia', 'imagini.json');
  return existsSync(cale) ? JSON.parse(readFileSync(cale, 'utf8')) : {};
}
