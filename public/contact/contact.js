/**
 * PAGINA DE CONTACT — ce nu se poate exprima în HTML static.
 *
 * Formularul e complet în DOM la livrare și are `action` real: fără scriptul ăsta se completează
 * și se trimite în continuare, doar că fără previzualizări și cu o navigare clasică. Aici se
 * adaugă trage-și-lasă, lista de fișiere, validarea din browser și stările de trimitere.
 *
 * TOATE TEXTELE VIN DIN PAGINĂ, din atributul `data-texte` scris de generator din
 * site.<lang>.json. Niciun șir scris aici: altfel pagina engleză ar arăta mesaje românești, iar
 * asta se descoperă mereu prea târziu, la primul om care greșește ceva.
 *
 * VALIDAREA DE AICI E O CURTOAZIE, NU O GARANȚIE. Endpointul verifică din nou tot — mărime,
 * extensie, MIME real, număr de fișiere. Ce câștigăm în browser e că omul află înainte să
 * aștepte un upload de 15 MB care oricum ar fi fost respins.
 */
const form = document.querySelector('.ct-form');
if (form) porneste(form);

function porneste(form) {
  const T = JSON.parse(form.dataset.texte);
  const L = T.limite;
  const input = form.querySelector('input[type=file]');
  const zona = form.querySelector('[data-zona]');
  const lista = form.querySelector('[data-lista]');
  const contor = form.querySelector('.ct-contor');
  const stare = form.querySelector('.ct-stare');
  const buton = form.querySelector('button[type=submit]');
  const campAplicatie = form.querySelector('[data-camp="aplicatie"]');
  const selCategorie = form.querySelector('select[name=categorie]');
  const selAplicatie = form.querySelector('select[name=aplicatie]');

  const interp = (s, v) => String(s).replace(/\{(\w+)\}/g, (m, k) => (v[k] !== undefined ? v[k] : m));

  /**
   * Fișierele alese, ținute de NOI, nu de `input.files`.
   *
   * `FileList` e read-only: nu poți scoate un fișier din ea. Fără lista proprie, butonul de
   * ștergere n-ar avea ce șterge, iar a doua alegere de fișiere ar înlocui-o pe prima în loc
   * s-o completeze. La trimitere se construiește un `FormData` din lista asta.
   */
  let fisiere = [];

  // ── pre-completare din adresă ─────────────────────────────────────────────
  // O valoare necunoscută se ignoră TĂCUT. Adresa poate veni de oriunde — dintr-un link vechi,
  // dintr-un email, dintr-o greșeală de tastare — iar o pagină de contact care întâmpină omul
  // cu o eroare pentru ceva ce n-a făcut el e exact ce nu vrem.
  const par = new URLSearchParams(location.search);
  const cere = (cheie, sel, permise) => {
    const v = par.get(cheie);
    if (v && permise.includes(v)) sel.value = v;
  };
  cere('categorie', selCategorie, T.categorii);
  cere('aplicatie', selAplicatie, T.aplicatii);

  // ── „la ce aplicație" doar unde are sens ──────────────────────────────────
  const aratAplicatie = () => {
    const arata = L.cuAplicatie.includes(selCategorie.value);
    campAplicatie.hidden = !arata;
    // ascuns înseamnă și neutru: altfel o alegere făcută înainte de schimbarea categoriei ar
    // pleca mai departe, invizibilă, și ar ajunge în email
    if (!arata) selAplicatie.value = 'nu-se-aplica';
  };
  selCategorie.addEventListener('change', aratAplicatie);
  aratAplicatie();

  // ── fișiere ───────────────────────────────────────────────────────────────
  const octetiMax = L.megaMax * 1024 * 1024;
  const extensia = (nume) => (nume.split('.').pop() || '').toLowerCase();
  const mb = (n) => (n / 1048576).toFixed(1);

  function adauga(noi) {
    const respinse = [];
    for (const f of noi) {
      if (fisiere.length >= L.fisiereMax) { respinse.push(interp(T.erori.preaMulte, { max: L.fisiereMax, nume: f.name })); continue; }
      if (!L.extensii.includes(extensia(f.name))) { respinse.push(interp(T.erori.extensie, { nume: f.name })); continue; }
      if (f.size > octetiMax) { respinse.push(interp(T.erori.preaMare, { nume: f.name, mb: mb(f.size), max: L.megaMax })); continue; }
      fisiere.push(f);
    }
    deseneaza();
    arataStare(respinse.join(' '), respinse.length ? 'eroare' : '');
  }

  function deseneaza() {
    lista.textContent = '';
    for (const [i, f] of fisiere.entries()) {
      const li = document.createElement('li');
      if (f.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(f);
        // eliberăm URL-ul după ce imaginea s-a afișat: altfel fiecare previzualizare ține
        // fișierul în memorie până la închiderea filei
        img.onload = () => URL.revokeObjectURL(img.src);
        li.append(img);
      } else {
        const ext = document.createElement('span');
        ext.className = 'ct-ext';
        ext.textContent = extensia(f.name).toUpperCase();
        li.append(ext);
      }
      const nume = document.createElement('span');
      nume.className = 'ct-nume';
      nume.textContent = `${f.name} · ${mb(f.size)} MB`;
      const sterge = document.createElement('button');
      sterge.type = 'button';
      sterge.className = 'ct-sterge';
      sterge.title = T.stergeFisier;
      sterge.setAttribute('aria-label', `${T.stergeFisier}: ${f.name}`);
      sterge.textContent = '✕';
      sterge.onclick = () => { fisiere.splice(i, 1); deseneaza(); };
      li.append(nume, sterge);
      lista.append(li);
    }
    contor.hidden = fisiere.length === 0;
    contor.textContent = interp(T.contorFisiere, { n: fisiere.length, max: L.fisiereMax });
  }

  form.querySelector('.ct-alege').onclick = () => input.click();
  input.addEventListener('change', () => { adauga([...input.files]); input.value = ''; });

  for (const ev of ['dragenter', 'dragover']) {
    zona.addEventListener(ev, (x) => { x.preventDefault(); zona.classList.add('peste'); });
  }
  for (const ev of ['dragleave', 'drop']) {
    zona.addEventListener(ev, (x) => { x.preventDefault(); zona.classList.remove('peste'); });
  }
  zona.addEventListener('drop', (x) => adauga([...(x.dataTransfer?.files ?? [])]));

  // ── stări ─────────────────────────────────────────────────────────────────
  function arataStare(text, fel) {
    stare.textContent = text || '';
    stare.className = `ct-stare${fel ? ` ct-${fel}` : ''}`;
  }

  // ── trimitere ─────────────────────────────────────────────────────────────
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const date = new FormData(form);
    // fișierele le punem noi, din lista proprie: câmpul din formular a fost golit la fiecare
    // alegere, tocmai ca a doua selecție să nu o înlocuiască pe prima
    date.delete('fisiere[]');
    for (const f of fisiere) date.append('fisiere[]', f, f.name);

    const mesaj = (date.get('mesaj') ?? '').toString().trim();
    if (!date.get('nume') || !date.get('email') || !mesaj) { return arataStare(T.erori.campuri, 'eroare'); }
    if (mesaj.length < L.mesajMin) {
      return arataStare(interp(T.erori.mesajScurt, { min: L.mesajMin, are: mesaj.length }), 'eroare');
    }
    // aceeași verificare pe care o face și endpointul; aici doar ca omul să nu aștepte degeaba
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(date.get('email')))) {
      return arataStare(T.erori.email, 'eroare');
    }
    const captcha = window.grecaptcha?.getResponse?.();
    if (window.grecaptcha && !captcha) return arataStare(T.erori.recaptcha, 'eroare');

    buton.disabled = true;
    arataStare(T.seTrimite, 'lucru');
    try {
      const r = await fetch(form.action, { method: 'POST', body: date });
      const raspuns = await r.json().catch(() => ({}));
      if (r.ok && raspuns.ok) {
        form.reset();
        fisiere = [];
        deseneaza();
        aratAplicatie();
        window.grecaptcha?.reset?.();
        arataStare(T.succes, 'succes');
      } else {
        // MESAJUL EXACT AL SERVERULUI, nu unul inventat de noi: el știe de ce a refuzat
        arataStare(raspuns.error || interp(T.erori.retea, { eroare: r.status }), 'eroare');
        window.grecaptcha?.reset?.();
      }
    } catch (x) {
      arataStare(interp(T.erori.retea, { eroare: x?.message ?? x }), 'eroare');
    } finally {
      buton.disabled = false;
    }
  });
}
