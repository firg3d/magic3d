/* Magic3D landing — animații și interacțiuni. Zero dependențe, zero apeluri externe.
   Tot ce mișcă se oprește sub prefers-reduced-motion, fără excepții — inclusiv contorul. */

document.documentElement.classList.remove('no-js');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* --- dezvăluire la scroll + declanșatori o singură dată (contor, bară) --- */
const obs = new IntersectionObserver((intrari) => {
  for (const it of intrari) {
    if (!it.isIntersecting) continue;
    it.target.classList.add('vazut');
    obs.unobserve(it.target);
  }
}, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });
for (const el of document.querySelectorAll('.reveal')) {
  if (reduce) { el.classList.add('vazut'); continue; }
  obs.observe(el);
}

/* --- contor 0 → valoare, o singură dată, la intrarea în viewport --- */
function numara(el) {
  const tinta = parseInt(el.dataset.numara, 10);
  if (!Number.isFinite(tinta)) { el.textContent = el.dataset.numara; return; }
  if (reduce) { el.textContent = tinta.toLocaleString('ro-RO'); return; }
  const dur = 1400; let t0 = null;
  const pas = (t) => {
    if (t0 === null) t0 = t;
    const k = Math.min(1, (t - t0) / dur);
    const val = Math.round(tinta * (1 - Math.pow(1 - k, 3)));   // ease-out
    el.textContent = val.toLocaleString('ro-RO');
    if (k < 1) requestAnimationFrame(pas);
  };
  requestAnimationFrame(pas);
}
const contor = document.querySelector('[data-numara]');
if (contor) {
  /* Pragul e 0, nu 0.6.
     Cu 0.6, contorul cerea 60% din el vizibil ca sa porneasca. El sta in hero, la ~626 px de
     sus, si are 44 px inaltime — deci pe un laptop cu fereastra de ~645 px se vedea PE JUMATATE
     (masurat: 20 din 44 px, raport 0.46) si ramanea inghetat pe „0" sub ochii omului, fiindca
     observatorul nu se declansa niciodata. La 720 px si pe mobil mergea, de-aia trecuse neobservat.
     Cu prag 0 porneste de indata ce apare orice bucata din el; daca e sub linia de plutire,
     asteapta scroll-ul, ca inainte. */
  const co = new IntersectionObserver((e) => {
    if (e[0].isIntersecting) { numara(contor); co.disconnect(); }
  }, { threshold: 0 });
  co.observe(contor);
}

/* --- consola hero: numele se tastează, parametrii se schimbă sincron --- */
/* Doar peste 768px, doar fără reduced-motion: pe mobil rămâne starea statică. */
if (!reduce && innerWidth > 768) {
  const consola = document.querySelector('[data-consola]');
  if (consola) {
    const elNume = consola.querySelector('.consola-nume');
    let lista;
    try { lista = JSON.parse(consola.getAttribute('data-nume')); } catch { lista = null; }
    if (!Array.isArray(lista) || !lista.length) lista = [elNume.textContent];
    const parametri = [...consola.querySelectorAll('[data-par]')].map((dd) => ({
      dd, valori: JSON.parse(dd.getAttribute('data-par')),
    }));
    let idx = 0, timer = null;
    const scrieNume = (text, gata) => {
      let i = 0;
      const tick = () => {
        elNume.textContent = text.slice(0, i);
        if (i++ <= text.length) timer = setTimeout(tick, 90);
        else gata();
      };
      tick();
    };
    const cicleaza = () => {
      const nume = lista[idx % lista.length];
      // parametrii se schimbă odată cu numele nou
      for (const p of parametri) p.dd.textContent = p.valori[idx % p.valori.length];
      scrieNume(nume, () => { timer = setTimeout(() => { idx++; cicleaza(); }, 2200); });
    };
    // pornește doar când e vizibilă, ca să nu consume când nu se vede
    const vo = new IntersectionObserver((e) => {
      if (e[0].isIntersecting) { cicleaza(); vo.disconnect(); }
    }, { threshold: 0.3 });
    vo.observe(consola);
  }
}

/* --- sugestie de limbă la prima vizită: discretă, refuzabilă, niciodată redirect --- */
(function sugestieLimba() {
  const CHEIE = 'magic3d.limbaRefuzata';
  try { if (localStorage.getItem(CHEIE)) return; } catch { return; }
  const esteEn = location.pathname.startsWith('/en');
  const prefEn = (navigator.languages || [navigator.language || '']).some((l) => /^en/i.test(l));
  // arată doar dacă preferința diferă de pagina curentă
  if (esteEn || !prefEn) return;
  const link = document.querySelector('.lang');
  if (!link) return;
  const bara = document.createElement('div');
  bara.className = 'lang-sug';
  bara.innerHTML = `<span>This site is also available in English.</span>
    <a href="${link.getAttribute('href')}">Switch to English</a>
    <button type="button">Rămân pe română</button>`;
  bara.querySelector('button').addEventListener('click', () => {
    try { localStorage.setItem(CHEIE, '1'); } catch {}
    bara.remove();
  });
  document.body.appendChild(bara);
})();
