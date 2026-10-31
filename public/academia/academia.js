/**
 * ACADEMIA 3D — progresul de citire, ținut LOCAL.
 *
 * Fără conturi, fără sincronizare, fără nimic trimis undeva: un capitol deschis se marchează în
 * `localStorage`, iar pe hub titlul lui primește eticheta „citit". Atât. E singurul scop pentru
 * care există fișierul ăsta.
 *
 * Cheile stau sub `magic3d.academia.*`, SEPARAT de cheile de licență — care sunt scrise și citite
 * de aplicațiile de generare. Un „șterge progresul" scris fără prefix propriu ar putea într-o zi
 * să ia cu el licența omului.
 *
 * Dacă `localStorage` nu e disponibil (mod privat strict, cookie-uri blocate), pagina merge mai
 * departe fără marcaje. Progresul e un plus, nu o condiție de citire.
 */
const CHEIE = 'magic3d.academia.citite';

function citite() {
  try {
    const brut = localStorage.getItem(CHEIE);
    const lista = brut ? JSON.parse(brut) : [];
    return Array.isArray(lista) ? lista : [];
  } catch { return []; }
}

function marcheaza(slug) {
  try {
    const lista = citite();
    if (lista.includes(slug)) return;
    lista.push(slug);
    localStorage.setItem(CHEIE, JSON.stringify(lista));
  } catch { /* fără stocare: se citește la fel de bine, doar fără marcaj */ }
}

// pe pagina unui capitol: se marchează la deschidere. Nu la derulare până jos — un cititor care
// caută un singur defect și pleacă tot a folosit capitolul.
const articol = document.querySelector('article[data-capitol]');
if (articol) marcheaza(articol.dataset.capitol);

// pe hub: titlurile capitolelor deja citite primesc eticheta
const lista = citite();
if (lista.length) {
  const eticheta = document.documentElement.lang === 'en' ? 'read' : 'citit';
  // DOAR linkurile: marcajul de pe `article[data-capitol]` e cel care spune ce capitol se
  // citește ACUM. Prima variantă filtra cu `!closest('article')`, iar pe hub tot corpul e un
  // <article> — deci niciun titlu nu primea eticheta, deși progresul era salvat corect.
  for (const a of document.querySelectorAll('a[data-capitol]')) {
    if (lista.includes(a.dataset.capitol)) {
      a.classList.add('ac-citit');
      a.setAttribute('data-citit', eticheta);
    }
  }
}
