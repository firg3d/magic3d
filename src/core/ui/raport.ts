/**
 * NUCLEU — raportarea unei probleme sau a unei propuneri, direct din aplicatie.
 *
 * DE CE CU DIAGNOSTIC. Un raport la un generator 3D e inutil fara context: ce aplicatie, ce
 * font, ce cote, ce parametri. Toata ziua de azi s-a dus pe defecte care n-au putut fi
 * reproduse tocmai fiindca lipsea starea. Aici se trimite AUTOMAT, iar presetul pleaca si ca
 * fisier: se incarca inapoi in aplicatie si se vede exact ce vedea omul.
 *
 * CE NU SE TRIMITE: nimic fara ca utilizatorul sa apese. Nu exista telemetrie, nici raportare
 * automata de erori. Fereastra arata inainte de trimitere TOT ce pleaca, ca sa nu fie surprize.
 *
 * Endpoint-ul `raport.php` sta pe ACELASI domeniu cu aplicatia, deci nu e nevoie de CORS.
 */
import { t } from '../i18n/index.js';
import { stareLicenta } from '../config/licenta.js';
import { esteCodFix, type StareLicenta } from '../config/licenta-token.js';

/**
 * Eticheta de licenta pentru raport, DIN DICTIONAR.
 *
 * `etichetaLicenta()` din licenta-token.ts intoarce siruri fara diacritice („Licenta
 * Comerciala"), fiindca modulul acela e pur si offline si nu trece prin i18n. Bara de stare
 * foloseste de mult cheile din dictionar; raportul ramasese pe functia veche, asa ca in emailul
 * primit scria altfel decat pe ecranul omului care l-a trimis. Aceleasi chei acum, deci acelasi
 * text — si, ca bonus, raportul trimis dintr-o interfata engleza spune „Commercial Licence".
 */
function etichetaPentruRaport(st: StareLicenta): string {
  if (esteCodFix(st)) return t('licenta.baraFixa');
  if (st.fel === 'valida') return t('licenta.baraActiva', { id: st.licenta.id });
  if (st.fel === 'expirat') return t('licenta.baraExpirata', { id: st.licenta.id });
  return t('licenta.uzPersonal');
}

export interface ContextRaport {
  /** numele aplicatiei (`AppDefinition.title`) */
  aplicatie: string;
  /** starea completa, serializabila — inima raportului */
  preset?: unknown;
  /** randurile din bara de stare, asa cum le vede omul */
  stare: string[];
  /** ultima eroare de reconstructie, daca a fost vreuna */
  eroare?: string | null;
}

/** Blocul de diagnostic, in clar. Se arata utilizatorului inainte de trimitere. */
export function construiesteDiagnostic(ctx: ContextRaport): string {
  const n = navigator as any;
  const L: string[] = [];
  L.push(`aplicatie:  ${ctx.aplicatie}`);
  L.push(`licenta:    ${etichetaPentruRaport(stareLicenta())}`);
  L.push(`adresa:     ${location.pathname}`);
  L.push(`browser:    ${n.userAgent}`);
  L.push(`platforma:  ${n.userAgentData?.platform ?? n.platform ?? '-'}`);
  L.push(`ecran:      ${innerWidth}x${innerHeight} @${devicePixelRatio}x`);
  L.push(`memorie JS: ${(performance as any).memory ? Math.round((performance as any).memory.usedJSHeapSize / 1048576) + ' MB' : '-'}`);
  // Placa video conteaza: o parte din defectele de randare sunt de driver, nu de geometrie.
  try {
    const gl = document.createElement('canvas').getContext('webgl2') as WebGL2RenderingContext | null;
    const info = gl?.getExtension('WEBGL_debug_renderer_info');
    L.push(`placa video: ${info ? gl!.getParameter((info as any).UNMASKED_RENDERER_WEBGL) : '-'}`);
  } catch { L.push('placa video: -'); }
  const porniri = performance.getEntriesByType('measure').filter((m) => m.name.startsWith('pornire'));
  if (porniri.length) L.push(`pornire:    ${porniri.map((m) => `${m.name.replace('pornire: ', '')} ${Math.round(m.duration)}ms`).join(' · ')}`);
  if (ctx.eroare) L.push(`EROARE:     ${ctx.eroare}`);
  if (ctx.stare.length) { L.push('', 'bara de stare:'); for (const s of ctx.stare) L.push(`  ${s}`); }
  if (ctx.preset !== undefined) {
    L.push('', 'preset:');
    try { L.push(JSON.stringify(ctx.preset, null, 1)); } catch { L.push('  (nu s-a putut serializa)'); }
  }
  return L.join('\n');
}

/** Deschide fereastra de raportare. `ctx` se calculeaza la deschidere, nu inainte. */
export function deschideRaport(ctx: () => ContextRaport): void {
  const c = ctx();
  const diagnostic = construiesteDiagnostic(c);

  const overlay = document.createElement('div');
  overlay.className = 'licenta-overlay';
  const cutie = document.createElement('div');
  cutie.className = 'licenta raport';
  cutie.setAttribute('role', 'dialog');
  cutie.setAttribute('aria-modal', 'true');

  const h = (tag: string, cls: string, txt?: string) => {
    const e = document.createElement(tag); e.className = cls; if (txt) e.textContent = txt; return e;
  };
  cutie.append(h('h2', 'licenta-titlu', t('raport.titlu')));
  cutie.append(h('p', 'licenta-sub', t('raport.subtitlu')));

  const fel = document.createElement('select');
  fel.className = 'rap-camp';
  for (const [v, k] of [['problema', 'raport.felProblema'], ['propunere', 'raport.felPropunere']] as const) {
    const o = document.createElement('option'); o.value = v; o.textContent = t(k); fel.append(o);
  }
  const mesaj = document.createElement('textarea');
  mesaj.className = 'rap-camp rap-mesaj'; mesaj.rows = 5; mesaj.placeholder = t('raport.placeholderMesaj');
  const email = document.createElement('input');
  email.className = 'rap-camp'; email.type = 'email'; email.placeholder = t('raport.placeholderEmail');
  // capcana anti-spam: ascunsa la ochi, dar completata de roboti
  const capcana = document.createElement('input');
  capcana.type = 'text'; capcana.name = 'website'; capcana.tabIndex = -1;
  capcana.setAttribute('autocomplete', 'off'); capcana.style.display = 'none';

  cutie.append(h('label', 'rap-eticheta', t('raport.fel')), fel);
  cutie.append(h('label', 'rap-eticheta', t('raport.mesaj')), mesaj);
  cutie.append(h('label', 'rap-eticheta', t('raport.email')), email, capcana);
  cutie.append(h('div', 'rap-nota', t('raport.notaEmail')));

  // TOT ce pleaca, la vedere. Nu trimitem nimic pe care omul nu-l poate citi inainte.
  const detalii = document.createElement('details');
  detalii.className = 'rap-detalii';
  const rezumat = document.createElement('summary');
  rezumat.textContent = t('raport.vezeDiagnostic');
  const pre = document.createElement('pre');
  pre.className = 'rap-diag'; pre.textContent = diagnostic;
  detalii.append(rezumat, pre);
  cutie.append(detalii);

  const mesajStare = h('div', 'rap-stare');
  const actiuni = h('div', 'licenta-actiuni');
  const inchide = h('button', 'licenta-btn licenta-btn-sec', t('raport.renunta')) as HTMLButtonElement;
  const trimite = h('button', 'licenta-btn licenta-btn-pri', t('raport.trimite')) as HTMLButtonElement;
  actiuni.append(inchide, trimite);
  cutie.append(mesajStare, actiuni);

  const scrollVechi = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  const inchideTot = () => { overlay.remove(); document.body.style.overflow = scrollVechi; };
  inchide.addEventListener('click', inchideTot);
  overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') inchideTot(); });

  trimite.addEventListener('click', async () => {
    if (!mesaj.value.trim()) { mesajStare.className = 'rap-stare err'; mesajStare.textContent = t('raport.scrieCeva'); return; }
    trimite.disabled = true;
    mesajStare.className = 'rap-stare'; mesajStare.textContent = t('raport.seTrimite');
    const fd = new FormData();
    fd.set('fel', fel.value);
    fd.set('mesaj', mesaj.value);
    fd.set('email', email.value);
    fd.set('website', capcana.value);
    fd.set('aplicatie', c.aplicatie);
    fd.set('licenta', etichetaPentruRaport(stareLicenta()));
    fd.set('diagnostic', diagnostic);
    if (c.preset !== undefined) {
      try {
        fd.set('preset', new Blob([JSON.stringify(c.preset)], { type: 'application/json' }), 'preset.json');
      } catch { /* fara preset, raportul tot pleaca */ }
    }
    try {
      const r = await fetch('/raport.php', { method: 'POST', body: fd });
      const j = await r.json().catch(() => ({ ok: false, error: t('raport.raspunsNecitibil') }));
      if (j.ok) {
        mesajStare.className = 'rap-stare ok'; mesajStare.textContent = t('raport.trimis');
        trimite.style.display = 'none';
        inchide.textContent = t('raport.inchide');
      } else {
        mesajStare.className = 'rap-stare err';
        mesajStare.textContent = j.error || t('raport.esec');
        trimite.disabled = false;
      }
    } catch (e: any) {
      // reteaua a picat sau endpoint-ul lipseste; omul trebuie sa poata scrie oricum
      mesajStare.className = 'rap-stare err';
      mesajStare.textContent = t('raport.esecRetea', { eroare: String(e?.message ?? e).slice(0, 60) });
      trimite.disabled = false;
    }
  });

  overlay.append(cutie);
  document.body.append(overlay);
  mesaj.focus();
}
