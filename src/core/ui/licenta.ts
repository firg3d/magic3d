/**
 * NUCLEU — fereastra de licentiere, aratata o data pe browser.
 *
 * SE ARATA O SINGURA DATA PE BROWSER. Prima varianta o arata la fiecare deschidere, ca
 * angajamentul sa fie reluat de fiecare data. In practica e ostil: o fereastra blocanta la
 * fiecare incarcare, inclusiv pentru cine a platit deja licenta, pedepseste zilnic exact
 * oamenii cuminti.
 *
 * Steagul salvat nu contrazice „nu colectam date": sta in localStorage, pe calculatorul lui,
 * si nu pleaca nicaieri — exact ce spunem deja despre preseturi.
 *
 * Angajamentul nu se pierde insa: regimul de folosire ramane scris permanent in bara de jos
 * (`lic-stare`), deci nu e „acceptat o data si uitat", ci mereu la vedere.
 *
 * VERSIUNEA TERMENILOR e partea care conteaza juridic. Daca schimbi textul, cresti numarul de
 * mai jos si fereastra reapare o data pentru toata lumea: acordul se ia din nou pentru
 * conditiile noi, nu se mosteneste de la cele vechi.
 *
 * TEXTUL e in `i18n/ro.json`, sectiunea `licenta`. Aceleasi formulari exista, scrise de mana,
 * si in `index.html` — pagina de start e statica si trebuie sa functioneze fara build.
 * DACA SCHIMBI TEXTUL AICI, SCHIMBA-L SI ACOLO.
 *
 * Nu e consultanta juridica: e o formulare rezonabila pentru un instrument de hobby cu optiune
 * comerciala. Inainte de a vinde licente pe bune, textul merita citit de un jurist.
 */
import { t } from '../i18n/index.js';

/**
 * Unde trimite butonul „Vreau Licenta Comerciala".
 *
 * Adresa e pastrata PERCENT-ENCODED exact cum o serveste magazinul (`licen%C8%9Ba` = „licența"):
 * asa a raspuns cu 200 la verificare, si o rescriere „mai citeata" ar risca un 404 pe un
 * server care nu normalizeaza diacriticele din cale.
 */
export const LINK_LICENTA_COMERCIALA = 'https://praktik3d.ro/products/licen%C8%9Ba-comerciala-magic-3d';

/**
 * Creste-l DE FIECARE DATA cand se schimba textul termenilor. Fereastra reapare o data pentru
 * toti, inclusiv pentru cei care acceptasera versiunea veche.
 */
const VERSIUNE_TERMENI = 2;
const CHEIE_ACCEPT = 'magic3d.termeniAcceptati';

/** A acceptat deja versiunea CURENTA a termenilor? */
export function termeniAcceptati(): boolean {
  try { return Number(localStorage.getItem(CHEIE_ACCEPT)) === VERSIUNE_TERMENI; } catch { return false; }
}

export interface OptiuniLicenta {
  /** apelat dupa ce utilizatorul accepta (ex. deblocarea interfetei) */
  laAcceptare?: () => void;
  /** arata fereastra chiar daca termenii au fost deja acceptati (link „Termeni" din interfata) */
  mereu?: boolean;
}

/**
 * Deseneaza fereastra si o afiseaza. Blocanta: nu se inchide cu Escape, cu click in afara sau
 * cu un „x" — singura iesire e butonul de acceptare, fiindca altfel n-ar fi un angajament.
 */
export function arataLicenta(opt: OptiuniLicenta = {}): void {
  if (termeniAcceptati() && !opt.mereu) { opt.laAcceptare?.(); return; }
  const overlay = document.createElement('div');
  overlay.className = 'licenta-overlay';

  const h = (tag: string, cls: string, text?: string) => {
    const e = document.createElement(tag);
    e.className = cls;
    if (text) e.textContent = text;
    return e;
  };

  const cutie = h('div', 'licenta');
  cutie.setAttribute('role', 'dialog');
  cutie.setAttribute('aria-modal', 'true');

  cutie.append(h('h2', 'licenta-titlu', t('licenta.titlu')));
  cutie.append(h('p', 'licenta-sub', t('licenta.subtitlu')));

  for (const [cheieT, cheieC] of [
    ['licenta.hobbyTitlu', 'licenta.hobby'],
    ['licenta.comercialTitlu', 'licenta.comercial'],
    ['licenta.dateTitlu', 'licenta.date'],
    ['licenta.raspundereTitlu', 'licenta.raspundere'],
    ['licenta.angajamentTitlu', 'licenta.angajament'],
  ]) {
    const sec = h('div', 'licenta-sec');
    sec.append(h('h3', 'licenta-h', t(cheieT)));
    sec.append(h('p', 'licenta-p', t(cheieC)));
    cutie.append(sec);
  }

  const actiuni = h('div', 'licenta-actiuni');
  // Butonul comercial apare doar cand avem unde sa trimitem: un buton care nu duce nicaieri
  // e mai rau decat lipsa lui.
  if (LINK_LICENTA_COMERCIALA) {
    const a = document.createElement('a');
    a.className = 'licenta-btn licenta-btn-sec';
    a.href = LINK_LICENTA_COMERCIALA;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = t('licenta.vreauComercial');
    a.title = t('licenta.notaLink');
    actiuni.append(a);
  }
  const accept = h('button', 'licenta-btn licenta-btn-pri', t('licenta.accept')) as HTMLButtonElement;
  const scrollVechi = document.body.style.overflow;
  document.body.style.overflow = 'hidden';   // nimic nu se deruleaza in spate
  accept.addEventListener('click', () => {
    try { localStorage.setItem(CHEIE_ACCEPT, String(VERSIUNE_TERMENI)); } catch { /* mod privat */ }
    overlay.remove();
    document.body.style.overflow = scrollVechi;
    opt.laAcceptare?.();
  });
  actiuni.append(accept);
  cutie.append(actiuni);

  overlay.append(cutie);
  document.body.append(overlay);
  accept.focus();

  // Tab-ul nu poate iesi din fereastra cat timp e deschisa.
  overlay.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const focusabile = cutie.querySelectorAll<HTMLElement>('a[href], button');
    if (!focusabile.length) return;
    const prim = focusabile[0], ultim = focusabile[focusabile.length - 1];
    if (e.shiftKey && document.activeElement === prim) { e.preventDefault(); ultim.focus(); }
    else if (!e.shiftKey && document.activeElement === ultim) { e.preventDefault(); prim.focus(); }
  });
}
