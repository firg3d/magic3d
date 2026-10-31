/**
 * NUCLEU — shell-ul aplicației, reorganizat stil slicer (Bambu Studio).
 * Sus: logo + unelte de TRANSFORMARE (valide pt. orice obiect) + export.
 * Stânga: panou CONTEXTUAL cu proprietățile obiectului selectat (declarate de app).
 * Jos: obiecte în scenă. Dreapta-jos: info-box. Bibliotecile se deschid modal.
 * REGULA de împărțire: transformări = sus (core), proprietăți = stânga (app). Fără duplicare.
 * Nu conține nimic despre litere.
 */
import './theme.css';
import { Viewer } from '../viewport/scene.js';
import { manifoldToGeometry } from '../geometry/manifold.js';
import { contorInAfaraArenei } from '../geometry/arena.js';
import { download3MF } from '../geometry/export3mf.js';
import { layoutOnPlates, verificaInPlaca } from '../geometry/layout.js';
import { t, limba, seteazaLimba, type Limba } from '../i18n/index.js';
import { arataLicenta } from './licenta.js';
import { incarcaLicenta, salveazaLicenta, tokenSalvat, stareLicenta,
  instaleazaDinAdresa } from '../config/licenta.js';
import { esteCodFix, areDreptComercial } from '../config/licenta-token.js';
import { linkCheckout, pretAfisat } from '../config/produse.js';
import { zileRamase } from '../config/licenta-token.js';
import { deschideRaport } from './raport.js';
import { incarcaManifestScene, incarcaScena, orizontCalculat, type IntrareManifestScena, type ScenaFoto } from '../config/scena-foto.js';
import { citesteIdentitate, scrieIdentitate, areTransparenta, aplicaWatermark, type IdentitateFirma, type ColtWatermark } from '../config/identitate.js';
import { APLICATII_VIZIBILE, esteAplicatiaCurenta } from '../config/aplicatii.js';
import type { AppDefinition, PanelControl, LibraryItem } from '../app.js';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, any> = {}, kids: (Node | string)[] = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) { if (k === 'class') n.className = v; else if (k.startsWith('on')) (n as any)[k.toLowerCase()] = v; else if (v !== undefined && v !== null) n.setAttribute(k, String(v)); }
  for (const c of kids) n.append(c);
  return n;
}
function svg(inner: string, attrs: Record<string, string> = {}): SVGElement {
  const wrap = document.createElement('div'); wrap.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" ${Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ')}>${inner}</svg>`;
  return wrap.firstElementChild as SVGElement;
}
// pictograme cu contur subțire, geometrice (fără librărie externă)
const ICONS: Record<string, string> = {
  undo: '<path d="M8 7 L4 11 L8 15"/><path d="M4 11 H14 a5 5 0 0 1 0 10 H9"/>',
  redo: '<path d="M16 7 L20 11 L16 15"/><path d="M20 11 H10 a5 5 0 0 0 0 10 H15"/>',
  move: '<path d="M12 3 V21 M3 12 H21"/><path d="M12 3 9.5 6 M12 3 14.5 6 M12 21 9.5 18 M12 21 14.5 18 M3 12 6 9.5 M3 12 6 14.5 M21 12 18 9.5 M21 12 18 14.5"/>',
  rotate: '<path d="M20 12 a8 8 0 1 1 -2.3 -5.6"/><path d="M20 4 V8 H16"/>',
  scale: '<rect x="4" y="4" width="9" height="9"/><path d="M11 11 L20 20"/><path d="M20 15 V20 H15"/>',
  depth: '<path d="M12 4 V20 M12 4 9.5 7 M12 4 14.5 7 M12 20 9.5 17 M12 20 14.5 17"/>',
  align: '<path d="M4 4 V20"/><rect x="7" y="6.5" width="9" height="4"/><rect x="7" y="13.5" width="6" height="4"/>',
  views: '<path d="M12 3 L20 7 V15 L12 19 L4 15 V7 Z"/><path d="M4 7 L12 11 L20 7 M12 11 V19"/>',
  proj: '<path d="M6 9 H15 V19 H6 Z"/><path d="M6 9 L11 5 H20 L15 9 M15 19 L20 15 V5"/>',
  plate: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10 H20 M4 14 H20 M10 4 V20 M14 4 V20"/>',
  plates: '<path d="M4 8 L12 4 L20 8 L12 12 Z"/><path d="M4 8 V13 L12 17 L20 13 V8 M4 13 L12 17"/>',
  tematici: '<path d="M9.6 4 L11.3 7.5 L15.2 8.1 L12.4 10.8 L13.1 14.6 L9.6 12.8 L6.1 14.6 L6.8 10.8 L4 8.1 L7.9 7.5 Z"/><path d="M17.5 15 V20 M15 17.5 H20"/>',
  baza: '<path d="M4 11 L10.5 7.5 L17 11 L10.5 14.5 Z"/><path d="M4 11 V13.8 L10.5 17.3 L17 13.8 V11"/><path d="M17.6 15.6 V20 M15.4 17.8 H19.8"/>',
  // dosar cu semn de carte — o configurație pusă deoparte și regăsită
  presets: '<path d="M4 7 a1.6 1.6 0 0 1 1.6-1.6 H9.2 L11.2 8 H18.4 A1.6 1.6 0 0 1 20 9.6 V17.4 A1.6 1.6 0 0 1 18.4 19 H5.6 A1.6 1.6 0 0 1 4 17.4 Z"/><path d="M9.8 10.5 V16.4 L12.3 14.7 L14.8 16.4 V10.5"/>',
  // aparat foto: corp, ridicătura vizorului, obiectiv, declanșator
  imagine: '<path d="M4 8.8 A1.6 1.6 0 0 1 5.6 7.2 H8.4 L9.8 5 H14.2 L15.6 7.2 H18.4 A1.6 1.6 0 0 1 20 8.8 V17.4 A1.6 1.6 0 0 1 18.4 19 H5.6 A1.6 1.6 0 0 1 4 17.4 Z"/><circle cx="12" cy="13" r="3.2"/><path d="M17 9.9 h0.4"/>',
  // rotiță dințată: inel + butuc + opt dinți scurți, în aceeași bandă 4..20 ca restul
  setari: '<circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2.5"/><path d="M12 6 V4.4 M12 18 V19.6 M6 12 H4.4 M18 12 H19.6 M7.76 7.76 L6.63 6.63 M16.24 16.24 L17.37 17.37 M16.24 7.76 L17.37 6.63 M7.76 16.24 L6.63 17.37"/>',
  // obiect pe fundal infinit (perete care curge în podea), cu două raze de lumină
  prezentare: '<path d="M4 5.5 V13.5 a5 5 0 0 0 5 5 H20"/><rect x="11" y="11.5" width="6.5" height="7" rx="1"/><path d="M6.5 4 L8.2 6.2 M10.8 3.6 L11.7 6"/>',
  // cutie cu săgeată în afară — exportul fișierelor de tipărit
  export: '<path d="M12 3.6 V13.2 M8.6 7 L12 3.6 L15.4 7"/><path d="M4.6 13.6 V18.4 A1.6 1.6 0 0 0 6.2 20 H17.8 A1.6 1.6 0 0 0 19.4 18.4 V13.6"/>',
  // semn de întrebare în cerc — manualul de utilizare
  ajutor: '<circle cx="12" cy="12" r="8.4"/><path d="M9.7 9.4 a2.4 2.4 0 1 1 2.9 2.6 v1.4"/><path d="M12.6 16.6 h0.01"/>',
  // riglă înclinată, cu gradații pe muchia lungă
  rigla: '<rect x="2.6" y="8.2" width="18.8" height="7.6" rx="1.2" transform="rotate(-25 12 12)"/><path d="M7.2 8.4 L8.6 11.1 M10.4 6.9 L11.8 9.6 M13.6 5.4 L15 8.1 M16.8 3.9 L18.2 6.6"/>',
  // grilă de pătrate — comutatorul între aplicații
  apps: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.4"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.4"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.4"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.4"/>',
  // monedă cu „T" — tokenul de licență
  token: '<circle cx="12" cy="12" r="8.2"/><path d="M8.4 9.4 H15.6 M12 9.4 V15.2"/>',
};
function icon(name: string): SVGElement {
  return svg(ICONS[name] ?? '', { viewBox: '0 0 24 24', width: '24', height: '24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.6', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', class: 'ticon-svg' });
}

export async function runApp(app: AppDefinition) {
  const hasLib = !!app.library;
  document.body.innerHTML = '';
  const shell = el('div', { class: 'app-shell' + (hasLib ? '' : ' no-library') });

  /**
   * Paginile de CONȚINUT au două variante, una pe limbă: `/` și `/en/`, `/token.html` și
   * `/en/token.html`. Aplicațiile n-au — e aceeași pagină, tradusă din dicționar. Deci orice
   * link din shell către conținut trebuie să țină cont de limba curentă, altfel omul care
   * lucrează în engleză aterizează pe pagina în română.
   *
   * Rădăcina se cere ca `/`, nu ca `/index.html`: aceeași pagină la două adrese își împarte
   * autoritatea în căutări, iar canonicul din <head> e cel fără nume de fișier.
   */
  const paginaLimba = (fisier: string) => (limba() === 'en' ? `/en/${fisier}` : `/${fisier}`);

  // ---------- TOP: logo · unelte · export ----------
  const logo = el('a', { class: 'logo', href: paginaLimba(''), title: t('toolbar.acasa') }, [
    svg('<g class="logo-wandgrp"><path d="M7 28 L21 12" stroke="var(--violet)" stroke-width="3.6" stroke-linecap="round"/>' +
      '<path class="logo-star" d="M23 3 L25.4 8 L30 10 L25.4 12 L23 17 L20.6 12 L16 10 L20.6 8 Z" fill="#f0a02c"/></g>' +
      '<path class="logo-spark" d="M30 2.5 l1.2 2.6 2.6 1.2 -2.6 1.2 -1.2 2.6 -1.2 -2.6 -2.6 -1.2 2.6 -1.2 Z" fill="#f0a02c"/>' +
      '<path class="logo-spark" d="M26.5 16 l1 2.3 2.3 1 -2.3 1 -1 2.3 -1 -2.3 -2.3 -1 2.3 -1 Z" fill="var(--violet)"/>',
      { viewBox: '0 0 34 34', width: '42', height: '42', class: 'logo-svg' }),
    el('span', { class: 'logo-txt' }, ['Magic3D']),
  ]);
  // sclipire: o dată la ~8s + imediat la hover; sub 1s, fără buclă; respectă reduced-motion
  const sparkle = () => { logo.classList.remove('sparkling'); void (logo as HTMLElement).offsetWidth; logo.classList.add('sparkling'); setTimeout(() => logo.classList.remove('sparkling'), 850); };
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) { logo.addEventListener('mouseenter', sparkle); setInterval(sparkle, 8000); setTimeout(sparkle, 1600); }
  // ---------- COMUTATOR DE APLICAȚII (lângă logo) ----------
  // Buton + meniu simplu (fără dependențe): deschide la click, se închide la click în afară / Escape.
  const swMenu = el('div', { class: 'appsw-menu', role: 'menu' },
    APLICATII_VIZIBILE().map((ap) => el('a', { class: 'appsw-item' + (esteAplicatiaCurenta(ap.href) ? ' pe' : ''), href: ap.href, role: 'menuitem' }, [t(ap.cheie)])));
  const swBtn = el('button', { class: 'appsw-btn', 'aria-haspopup': 'true', 'aria-expanded': 'false', title: t('toolbar.comutaApp') },
    [icon('apps'), el('span', { class: 'appsw-lbl' }, [t('toolbar.comutaApp')])]);
  const swWrap = el('div', { class: 'appsw' }, [swBtn, swMenu]);
  const swToggle = (v: boolean) => { swWrap.classList.toggle('open', v); swBtn.setAttribute('aria-expanded', String(v)); };
  swBtn.addEventListener('click', (e) => { e.stopPropagation(); swToggle(!swWrap.classList.contains('open')); });
  document.addEventListener('click', () => swToggle(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') swToggle(false); });

  const toolbar = el('div', { class: 'toolbar' });
  const exportBtn = el('button', { class: 'export-btn' }, [t('toolbar.export')]);
  const exportWrap = el('div', { class: 'export-wrap' }, [exportBtn]);
  // configurările generale stau la capătul din dreapta, lângă export — nu în grupul de
  // unelte de lucru din mijloc, fiindcă nu sunt operații pe model
  const setariBtn = el('button', { class: 'tool' }, [icon('setari'), el('span', { class: 'tlabel' }, [t('toolbar.setari')])]);
  // COMUTATORUL DE LIMBĂ, lângă setări. Arată limba CEALALTĂ, nu pe cea curentă: butonul spune
  // unde ajungi dacă apeși, nu unde ești — unde ești se vede din tot ecranul.
  const alta: Limba = limba() === 'ro' ? 'en' : 'ro';
  const limbaBtn = el('button', { class: 'tool lang-btn', title: t(`limba.${alta}`) },
    [el('span', { class: 'tlabel' }, [alta.toUpperCase()])]);
  limbaBtn.onclick = () => seteazaLimba(alta);
  const zonaDreapta = el('div', { class: 'topbar-dreapta' }, [limbaBtn, setariBtn, exportWrap]);
  shell.append(el('header', { class: 'topbar' }, [logo, swWrap, toolbar, zonaDreapta]));

  const propsEl = el('aside', { class: 'props' });
  const viewEl = el('main', { class: 'viewport' });
  const listEl = el('footer', { class: 'objectlist' });
  // semnătura stă pe linia „Obiecte în scenă", în dreapta: e vizibilă permanent, fără să
  // ocupe spațiu de lucru și fără să intre în capturile din modul prezentare.
  // Statutul licentei sta ALATURI de semnatura, permanent vizibil. Fereastra de licentiere se
  // arata o data; angajamentul insa trebuie sa ramana la vedere, nu acceptat o data si uitat.
  const etichetaLic = el('span', { class: 'lic-stare' }, [t('licenta.uzPersonal')]);
  // Buton TOKEN — mărit și evidențiat, jos-dreapta, deasupra semnăturii. Duce la pagina de
  // licențe & tokeni (explicații + linkuri de plată).
  const tokenBtn = el('a', { class: 'btn-token', href: paginaLimba('token.html'), title: t('licenta.butonTokenTitlu') },
    [icon('token'), el('span', {}, [t('licenta.butonToken')])]);
  /**
   * MARCAJUL, IN ACELASI RAND CU LICENTA (A.6, plasare decisa la OPRIRE 1).
   *
   * Nu sub butonul de export: acolo, masurat, textul iesea pe sase randuri intr-o coloana de
   * 130 px si depasea fereastra. Aici sta langa eticheta de licenta, unde informatia despre
   * licenta traieste deja — un singur adevar despre licenta pe ecran, pe un singur rand.
   *
   * Apare doar la generatoarele care declara `poartaMarcaj`, si doar cat timp licenta nu da
   * drept comercial. Pretul vine din `produse.ts`: scris de mana, ar ramane in urma.
   */
  const notaMarcaj = app.poartaMarcaj
    ? el('span', { class: 'lic-marcaj' }, [
      ' · ', t('marcaj.notaExport'), ' · ',
      el('a', { href: paginaLimba('token.html') + '#comercial' },
        [t('marcaj.notaLink', { pret: pretAfisat('licenta') })]),
    ])
    : null;
  listEl.append(tokenBtn, el('div', { class: 'semnatura' }, [
    el('b', {}, [t('ajutor.semnatura')]), ' · ', t('ajutor.versiuneData'), ' · ', etichetaLic,
    ...(notaMarcaj ? [notaMarcaj] : [])]));
  /** reia eticheta din starea curenta; chemat la pornire si dupa fiecare salvare de token */
  function actualizeazaEtichetaLicenta() {
    const st = stareLicenta();
    // textul vizibil vine din dictionar, nu din modulul de licenta: acolo regula proiectului
    // interzice diacriticele, deci ar fi ajuns „Licenta Comerciala" in interfata.
    // codul fix n-are numar de licenta: eticheta lui se opreste la „Licenta Comerciala"
    etichetaLic.textContent = esteCodFix(st) ? t('licenta.baraFixa')
      : st.fel === 'valida' ? t('licenta.baraActiva', { id: st.licenta.id })
      : st.fel === 'expirat' ? t('licenta.baraExpirata', { id: st.licenta.id })
      : t('licenta.uzPersonal');
    etichetaLic.className = 'lic-stare' + (st.fel === 'valida' ? ' activa' : st.fel === 'expirat' ? ' expirata' : '');
    // se reia din ACEEASI stare, langa eticheta: doua adevaruri despre licenta pe acelasi
    // ecran ar fi mai rau decat niciunul
    if (notaMarcaj) notaMarcaj.hidden = areDreptComercial(st);
    /**
     * GEOMETRIA SE REFACE cand se schimba dreptul comercial.
     *
     * Marcajul iese din starea licentei, dar starea se poate schimba DUPA ce s-a construit
     * piesa — un cod fix instalat din adresa ajunge dupa pornire, iar unul tastat in Setari
     * oricand. Prins pe viu: dupa `?licenta=…` bara spunea „Licenta Comerciala", iar piesa
     * ramanea cu semnatura pana cand se atingea un parametru. Adica exportul ar fi plecat
     * marcat, cu licenta activa.
     *
     * Se reface doar la SCHIMBARE, si doar la generatoarele care poarta marcaj: altfel fiecare
     * pornire ar construi de doua ori.
     */
    if (app.poartaMarcaj && dreptAnterior !== null && dreptAnterior !== areDreptComercial(st)) refresh();
  }
  /**
   * Dreptul comercial cu care s-a construit ULTIMA geometrie. Se pune in `refresh`, nu la
   * pornire: verificarea licentei e asincrona, deci prima constructie pleaca inainte ca starea
   * sa fie gata. Legat de pornire, comparatia se facea intre „inca nu stiu" si adevar, si nu
   * declansa nimic — exact bugul prins pe viu.
   */
  let dreptAnterior: boolean | null = null;
  shell.append(propsEl, viewEl, listEl);
  document.body.append(shell);

  const viewer = new Viewer(viewEl);
  // punte de diagnostic, DOAR pe serverul de dezvoltare: verificările automate au nevoie să
  // citească ce ajunge efectiv în scenă (culori de material, număr de mesh-uri), nu doar DOM.
  if ((import.meta as any).env?.DEV) (window as any).__magic3d = { viewer, app };

  // ---------- unelte de TRANSFORMARE (sus) ----------
  const undoStack: unknown[] = []; const redoStack: unknown[] = [];
  const pushUndo = () => { if (app.snapshot) { undoStack.push(app.snapshot()); redoStack.length = 0; if (undoStack.length > 40) undoStack.shift(); } };
  /** buton de unealtă: pictogramă 24px + etichetă dedesubt; tooltip = DOAR scurtătura. */
  const toolBtn = (ic: string, label: string, shortcut = '', extra: Record<string, any> = {}) =>
    el('button', { class: 'tool', ...(shortcut ? { title: shortcut } : {}), ...extra }, [icon(ic), el('span', { class: 'tlabel' }, [label])]);

  const undoBtn = toolBtn('undo', t('toolbar.anuleaza'), 'Ctrl+Z');
  const redoBtn = toolBtn('redo', t('toolbar.refa'), 'Ctrl+Y');
  toolbar.append(undoBtn, redoBtn, el('span', { class: 'tsep' }));

  const modeBtns = new Map<string, HTMLElement>();
  const setMode = (m: 'move' | 'rotate' | 'scale' | 'depth') => { viewer.setMode(m); modeBtns.forEach((b, k) => b.classList.toggle('on', k === m)); };
  const toolDefs: [('move' | 'rotate' | 'scale' | 'depth'), string, string, string, (p: HTMLElement) => void][] = [
    ['move', 'move', t('toolbar.muta'), 'M', renderMove], ['rotate', 'rotate', t('toolbar.roteste'), 'R', renderRotate],
    ['scale', 'scale', t('toolbar.scaleaza'), 'S', renderScale], ['depth', 'depth', t('toolbar.adancime'), 'D', renderDepth],
  ];
  let rotPan: HTMLElement | null = null, rotBtn: HTMLElement | null = null;
  let movPan: HTMLElement | null = null, movBtn: HTMLElement | null = null;
  const toolByKey = new Map<string, HTMLElement>();
  for (const [m, ic, name, key, render] of toolDefs) { const b = toolBtn(ic, name, key); modeBtns.set(m, b); toolByKey.set(key, b); toolbar.append(b); const pan = floatingUnder(b, render, () => setMode(m)); if (m === 'rotate') { rotPan = pan; rotBtn = b; } if (m === 'move') { movPan = pan; movBtn = b; } }
  const alignBtn = toolBtn('align', t('toolbar.aliniaza'), 'A'); toolByKey.set('A', alignBtn); toolbar.append(alignBtn); floatingUnder(alignBtn, renderAlign);
  toolbar.append(el('span', { class: 'tsep' }));
  // grup: BIBLIOTECI (înainte plutitoare peste viewport; acum unelte ca oricare)
  if (hasLib) {
    toolbar.append(toolBtn('tematici', t('toolbar.tematici'), '', { onclick: () => openLibrary('tematici') }));
    if (app.baseLibrary) toolbar.append(toolBtn('baza', t('toolbar.baza'), '', { onclick: () => openLibrary('baze') }));
    toolbar.append(el('span', { class: 'tsep' }));
  }
  // scurtături M/R/S/D/A -> activează unealta (deschide panoul + setează modul), nu în câmpuri
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const a = document.activeElement; if (a && /INPUT|SELECT|TEXTAREA/.test(a.tagName)) return;
    const b = toolByKey.get(e.key.toUpperCase()); if (b) { e.preventDefault(); (b as HTMLElement).click(); }
  });

  // grup: vederi + proiecție
  let ortho = false; // implicit izometric perspectivă
  const projBtn = toolBtn('proj', t('toolbar.persp'), t('toolbar.tooltipProiectiePersp'), { onclick: () => { ortho = !ortho; viewer.setProjection(ortho ? 'ortho' : 'persp'); (projBtn.querySelector('.tlabel') as HTMLElement).textContent = ortho ? t('toolbar.orto') : t('toolbar.persp'); projBtn.setAttribute('title', ortho ? t('toolbar.tooltipProiectieOrto') : t('toolbar.tooltipProiectiePersp')); projBtn.classList.toggle('on', ortho); } });
  const viewsBtn = toolBtn('views', t('toolbar.vederi'));
  const viewsMenu = floatingUnder(viewsBtn);
  const views = ['fata', 'spate', 'sus', 'jos', 'stanga', 'dreapta', 'izo'].map((v) => [v, t(`views.${v}`)] as [string, string]);
  viewsMenu.append(...views.map(([v, l]) => el('button', { class: 'menu-item', onclick: () => { viewer.setView(v as any); closeFloating(); } }, [l])), el('button', { class: 'menu-item', onclick: () => { viewer.frame(); closeFloating(); } }, [t('views.incadreaza')]));
  toolbar.append(viewsBtn, projBtn, el('span', { class: 'tsep' }));
  // grup: placă — dimensiune (meniu) + vizualizare plăci
  const plateSizeBtn = toolBtn('plate', t('toolbar.placa'));
  const plateMenu = floatingUnder(plateSizeBtn);
  const plates: [string, number, number][] = [['256×256 (A1/P1S/X1C)', 256, 256], ['350×320 (H2D)', 350, 320], ['180×180 (A1 mini)', 180, 180]];
  plateMenu.append(...plates.map((p) => el('button', { class: 'menu-item', onclick: () => { viewer.setPlate(p[1], p[2]); refresh(); closeFloating(); } }, [p[0]])));
  const plateBtn = toolBtn('plates', t('toolbar.placi'));
  toolbar.append(plateSizeBtn, plateBtn);

  // grup: preseturi + imagine de produs
  if (app.getPreset && app.loadPreset) {
    const presetBtn = toolBtn('presets', t('toolbar.preseturi'));
    const presetPan = floatingUnder(presetBtn, (pan) => renderPresets(pan));
    toolbar.append(el('span', { class: 'tsep' }), presetBtn);
    void presetPan;
  }
  const imgBtn = toolBtn('imagine', t('toolbar.imagine'));
  floatingUnder(imgBtn, (pan) => renderImagine(pan));
  const prezBtn = toolBtn('prezentare', t('toolbar.prezentare'));
  const prezPan = floatingUnder(prezBtn, (pan) => renderPrezentare(pan));
  const riglaBtn = toolBtn('rigla', t('toolbar.rigla'));
  const riglaPan = floatingUnder(riglaBtn, (pan) => renderRigla(pan));
  const ajutorBtn = toolBtn('ajutor', t('toolbar.ajutor'), '', { onclick: (ev: any) => { ev.stopPropagation(); deschideAjutor(); } });
  toolbar.append(imgBtn, prezBtn, riglaBtn, ajutorBtn);
  void prezPan; void riglaPan;

  viewEl.append(el('div', { class: 'hint' }, [t('hint.viewport')]));

  // bibliotecile sunt unelte în bara de sus (viewport-ul rămâne liber)
  const visible = new Map<string, boolean>();
  let framed = false; let plateView = false;
  // reconstrucția geometriei se amână cât timp se tastează (vezi `fireTastare`)
  const INTARZIERE_TASTARE_MS = 220;
  let tastareTimer = 0;

  // REPERE DE PORNIRE. Timpul pana la primul model a fost reclamat de mai multe ori si de
  // fiecare data l-am estimat, nu masurat. Marcajele sunt permanente si aproape gratuite;
  // se citesc din consola cu:  performance.getEntriesByType('measure')
  performance.mark('app:init-start');
  await app.init({
    refresh: () => { if (!plateView) refresh(); renderProps(); },
    placa: () => viewer.plateSize,
  });
  performance.mark('app:init-gata');
  performance.measure('pornire: init aplicatie (wasm + fonturi)', 'app:init-start', 'app:init-gata');

  // ---------- refresh scenă ----------
  let lastIds = new Set<string>();
  /** ultima reconstrucție a eșuat: scena de pe ecran nu mai corespunde parametrilor */
  let reconstructieEsuata: string | null = null;
  /**
   * PREVIZUALIZARE IN DOUA ETAPE, adaptiva.
   *
   * La litere, rotunjirea muchiei costa ~2300 ms din ~2950 — 78% din toata reconstructia.
   * E memorata, deci tastarea textului n-o plateste; dar orice tragere de cursor care tine de
   * litera (inaltime, grosime, raza, chenar) invalideaza cache-ul si o plateste integral, la
   * FIECARE pas al tragerii.
   *
   * Regula: daca ultima reconstructie completa a durat peste prag, urmatoarele deseneaza intai
   * varianta ieftina si revin cu cea completa dupa ce omul se opreste. Daca reconstructia
   * completa e oricum rapida (cache plin), nu se face nimic in doua etape — altfel am dubla
   * munca exact in cazul care n-avea nevoie de ajutor.
   */
  const PRAG_DOUA_ETAPE = 400;   // ms: sub atat, o singura reconstructie completa
  const LINISTE_MS = 450;        // cat asteptam dupa ultima schimbare inainte de finisare
  let ultimaDurataCompleta = 0;
  let avertizatArena = false;
  let ultimaAFostRapida = false;
  let temporizatorFinisare: ReturnType<typeof setTimeout> | null = null;

  /** exportul nu pleaca niciodata de la o previzualizare */
  function asiguraCompleta() { if (ultimaAFostRapida) refresh({ fin: true }); }

  function refresh(optiuni: { fin?: boolean } = {}) {
    dreptAnterior = areDreptComercial(stareLicenta());
    if (plateView) return;
    if (temporizatorFinisare) { clearTimeout(temporizatorFinisare); temporizatorFinisare = null; }
    // `=== 0` inseamna PRIMA reconstructie, cea de la pornire: n-avem cu ce compara, dar ea e
    // exact cea mai vizibila — 75% din timpul pana la primul model. Se deseneaza ieftin si se
    // finiseaza imediat dupa, deci ecranul se umple mult mai devreme.
    const cerRapid = !optiuni.fin && !!app.suportaPreviewRapid
      && (ultimaDurataCompleta === 0 || ultimaDurataCompleta > PRAG_DOUA_ETAPE);
    const t0 = performance.now();
    // O EXCEPTIE AICI LASA MODELUL VECHI PE ECRAN. Fara tratare, ea iese din temporizatorul de
    // tastare, browserul o inghite, iar utilizatorul vede la nesfarsit o geometrie care nu mai
    // corespunde campurilor — fara niciun semn ca ceva n-a mers. Se prinde si se ANUNTA.
    const inainteDeArena = contorInAfaraArenei();
    let built;
    try { built = app.rebuild(cerRapid ? { rapid: true } : undefined); reconstructieEsuata = null; }
    catch (e: any) {
      reconstructieEsuata = String(e?.message ?? e);
      console.error('[reconstructie] esec; modelul afisat ramane cel vechi:', e);   // consola, nu interfata
      renderStatus([{ key: 'rebuildfail', warn: true,
        text: t('status.reconstructieEsuata', { eroare: reconstructieEsuata.slice(0, 90) }) }]);
      return;
    }
    // DIAGNOSTIC DE SCURGERE. Handle-urile create in afara oricarei arene sunt singura sursa
    // posibila de scurgere in heap-ul WASM. Nu inseamna automat defect — o aplicatie poate sa
    // le elibereze de mana — dar o aplicatie care nu si-a pus arena se anunta aici, la prima
    // reconstructie, in loc sa fie descoperita cand cedeaza la client. Se scrie o SINGURA data
    // pe sesiune, in consola, nu in interfata: e mesaj pentru dezvoltator.
    const inAfara = contorInAfaraArenei() - inainteDeArena;
    if (inAfara > 20 && !avertizatArena) {
      avertizatArena = true;
      console.warn(`[arena] „${app.title}" a creat ${inAfara} obiecte WASM in afara oricarei arene, `
        + 'intr-o singura reconstructie. Daca nu sunt eliberate de mana, heap-ul creste pana '
        + 'cand WASM-ul incepe sa arunce, iar pe ecran ramane modelul vechi. Vezi tiparul din '
        + 'apps/litere/build.ts si core/geometry/arena.ts.');
    }
    ultimaAFostRapida = cerRapid;
    if (!cerRapid) ultimaDurataCompleta = performance.now() - t0;
    // reconstructia fina vine dupa ce se face liniste; orice schimbare noua o amana
    if (cerRapid) temporizatorFinisare = setTimeout(() => {
      temporizatorFinisare = null; refresh({ fin: true });
    }, LINISTE_MS);
    const objects = built.objects; let status = built.status;
    const ids = new Set(objects.map((o) => o.id));
    for (const id of lastIds) if (!ids.has(id)) viewer.removeObject(id);
    for (const o of objects) { const vis = visible.get(o.id) ?? o.visible ?? true; visible.set(o.id, vis); viewer.setObject(o.id, o.geometry, o.color, o.movable, vis, o.corpuri, o.opacitate ?? 1); }
    lastIds = ids;
    if (!framed) { viewer.frame(); framed = true; }
    // avertisment placă: conținutul depășește placa de print (nu blochează)
    const cb = viewer.contentBounds(); const ps = viewer.plateSize;
    if (!cb.isEmpty()) {
      const over = Math.max(0, cb.max.x - ps.w / 2, -cb.min.x - ps.w / 2, cb.max.z - ps.d / 2, -cb.min.z - ps.d / 2);
      if (over > 0.5) status = [...status, { key: 'plate', text: t('warnings.depasestePlaca', { mm: over.toFixed(0) }), warn: true }];
    }
    renderStatus(status);
    renderList(objects.map((o) => ({ id: o.id, nume: o.nume, color: o.color, warn: !!o.warn })));
    renderInfo();
    actualizeazaNote();
  }

  /**
   * NOTELE ARATĂ REZULTATE, deci trebuie reîmprospătate după fiecare reconstrucție.
   *
   * Fără asta rămâneau în urmă cu un pas, și nu întotdeauna: panoul se redesenează doar la
   * controalele care îl RESTRUCTUREAZĂ (select, checkbox, buton). La un câmp numeric nu se
   * redesena deloc, deci nota afișa rezultatul dinaintea schimbării. S-a văzut la Litere LED —
   * „banda încape și fără îngroșare" apărea fix pe litera la care nu încăpea.
   *
   * Se actualizează PE LOC, nu prin `renderProps`: o redesenare completă ar șterge câmpul în
   * care omul tocmai tastează și i-ar lua focusul.
   */
  function actualizeazaNote() {
    const noduri = propsEl.querySelectorAll('[data-nota]');
    if (!noduri.length) return;
    const valori = new Map<string, string>();
    for (const g of app.panels(viewer.selected)) {
      for (const c of g.controls) if (c.kind === 'note') valori.set(c.key, c.value);
    }
    for (const n of Array.from(noduri)) {
      const v = valori.get((n as HTMLElement).dataset.nota ?? '');
      const span = n.querySelector('.ctl-val');
      if (v !== undefined && span) span.textContent = v;
    }
  }
  function renderStatus(status: { key: string; text: string; warn?: boolean }[]) {
    let sb = listEl.querySelector('.statusbar') as HTMLElement;
    if (!sb) { sb = el('div', { class: 'statusbar' }); listEl.append(sb); }
    sb.innerHTML = ''; for (const s of status) sb.append(el('span', { class: s.warn ? 'warn' : '' }, [s.text]));
  }
  function renderList(objs: { id: string; nume: string; color: string; warn?: boolean }[]) {
    let box = listEl.querySelector('.obj-rows') as HTMLElement;
    if (!box) { listEl.prepend(el('h2', {}, [t('objects.titlu')])); box = el('div', { class: 'obj-rows' }); listEl.insertBefore(box, listEl.querySelector('.statusbar')); }
    box.innerHTML = '';
    for (const o of objs) {
      const vis = visible.get(o.id) ?? true;
      const row = el('div', { 'data-id': o.id, class: 'obj-row' + (viewer.selected === o.id ? ' sel' : ''), onclick: () => selectObject(o.id) }, [
        el('span', { class: 'dot', style: `background:${o.color}` }), el('span', {}, [o.warn ? '⚠ ' + o.nume : o.nume]),
        el('button', { class: 'vis', title: t('objects.vizibilitate'), onclick: (e: any) => { e.stopPropagation(); const nv = !(visible.get(o.id) ?? true); visible.set(o.id, nv); viewer.setVisible(o.id, nv); (e.target as HTMLElement).textContent = nv ? '👁' : '🚫'; } }, [vis ? '👁' : '🚫']),
      ]);
      box.append(row);
    }
  }
  function markSel() { listEl.querySelectorAll('.obj-row').forEach((r) => r.classList.toggle('sel', (r as HTMLElement).getAttribute('data-id') === viewer.selected)); }
  /** Gizmo-ul trebuie sa ofere DOAR ce aplicatia chiar salveaza: planul de mutare si axele de
   *  rotatie permise. Un maner pe o axa ignorata de `onRotate` face obiectul sa sara inapoi la
   *  eliberare, si arata ca un bug de rotatie. */
  function aplicaLimitariGizmo(id: string | null) {
    const tr = id ? app.getTransform?.(id) : null;
    viewer.setGroundMove(!!tr?.moveOnGround);
    viewer.setRotAxes(tr?.rotAxes ?? null);
    viewer.setPlanRot(tr?.rotPlan ?? 0);
  }
  function selectObject(id: string | null) { viewer.select(id); app.onSelect?.(id); aplicaLimitariGizmo(id); renderProps(); markSel(); renderInfo(); }

  // ---------- panou proprietăți (stânga, contextual) ----------
  function control(c: PanelControl): HTMLElement {
    const sel = viewer.selected;
    const restructures = c.kind === 'checkbox' || c.kind === 'select' || c.kind === 'button';
    const fire = (v: unknown) => { pushUndo(); app.onControl(c.key, v, sel); if (!plateView) refresh(); if (restructures) renderProps(); };
    // TASTAREA nu mai declanșează o reconstrucție per tastă. Starea se scrie imediat, ca bara de
    // stare și restul interfeței să rămână coerente, dar geometria se reface o singură dată,
    // după ce s-a oprit tastatul. Fără asta, „Madalina" însemna 8 reconstrucții în lanț.
    const fireTastare = (v: unknown) => {
      pushUndo(); app.onControl(c.key, v, sel);
      clearTimeout(tastareTimer);
      tastareTimer = window.setTimeout(() => { if (!plateView) refresh(); }, INTARZIERE_TASTARE_MS);
    };
    if (c.kind === 'button') return el('button', { class: 'wide', onclick: () => fire(true) }, [c.label]);
    // `data-nota` marchează nota cu cheia ei, ca valoarea să poată fi reîmprospătată PE LOC
    // după fiecare reconstrucție — vezi `actualizeazaNote`
    if (c.kind === 'note') return el('div', { class: 'ctl note', 'data-nota': c.key }, [el('span', { class: 'ctl-lbl' }, [c.label]), el('span', { class: 'ctl-val' }, [c.value])]);
    if (c.kind === 'fontselect') return fontSelect(c, fire);
    let input: HTMLElement;
    if (c.kind === 'number') input = el('input', { type: 'number', value: String(c.value), min: c.min, max: c.max, step: c.step, oninput: (e: any) => fireTastare(parseFloat(e.target.value)) });
    else if (c.kind === 'text') input = el('input', { type: 'text', value: c.value, oninput: (e: any) => fireTastare(e.target.value) });
    else if (c.kind === 'color') return colorPicker(c, fire);
    else if (c.kind === 'checkbox') input = el('input', { type: 'checkbox', ...(c.value ? { checked: '' } : {}), onchange: (e: any) => fire(e.target.checked) });
    else {
      // opțiunile cu `grup` se strâng în <optgroup>, păstrând ordinea de apariție
      const optiune = (o: { value: string; label: string }) =>
        el('option', { value: o.value, ...(o.value === c.value ? { selected: '' } : {}) }, [o.label]);
      const grupuri: { nume: string; optiuni: typeof c.options }[] = [];
      for (const o of c.options) {
        const g = o.grup ?? '';
        const ultim = grupuri[grupuri.length - 1];
        if (ultim && ultim.nume === g) ultim.optiuni.push(o); else grupuri.push({ nume: g, optiuni: [o] });
      }
      const copii = grupuri.flatMap((g) => (g.nume
        ? [el('optgroup', { label: g.nume }, g.optiuni.map(optiune))]
        : g.optiuni.map(optiune)));
      input = el('select', { onchange: (e: any) => fire(e.target.value) }, copii);
    }
    return el('label', { class: 'ctl' }, [el('span', { class: 'ctl-lbl' }, [c.label]), input]);
  }
  // ---------- paletă de culori (panou flotant) ----------
  // Panoul e `position: fixed`, în afara fluxului coloanei din stânga: altfel i-ar lăți
  // layout-ul, exact ca bug-ul de la selectorul de fonturi.
  const RECENTE_KEY = 'magic3d-culori-recente';
  const PREDEFINITE = [
    '#FFFFFF', '#000000', '#3A3A3C', '#9E9E9E', '#E8E2D4', '#C9B28A', '#6D4C41', '#889EC8',
    '#E53935', '#FB8C00', '#FDD835', '#43A047', '#00ACC1', '#1E88E5', '#8E24AA', '#D81B60',
  ];
  const citesteRecente = (): string[] => {
    try { const v = JSON.parse(localStorage.getItem(RECENTE_KEY) || '[]'); return Array.isArray(v) ? v.slice(0, 8) : []; } catch { return []; }
  };
  const salveazaRecenta = (hex: string) => {
    const l = [hex.toUpperCase(), ...citesteRecente().filter((c) => c.toUpperCase() !== hex.toUpperCase())].slice(0, 8);
    try { localStorage.setItem(RECENTE_KEY, JSON.stringify(l)); } catch { /* localStorage blocat: mergem mai departe */ }
  };
  const clamp255 = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const hexToRgb = (h: string): [number, number, number] => {
    const m = /^#?([0-9a-f]{6})$/i.exec(h.trim());
    if (!m) return [0, 0, 0];
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const rgbToHex = (r: number, g: number, b: number) =>
    '#' + [r, g, b].map((v) => clamp255(v).toString(16).padStart(2, '0')).join('').toUpperCase();
  const rgbToHsv = (r: number, g: number, b: number): [number, number, number] => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h = 0;
    if (d) {
      if (max === r) h = ((g - b) / d) % 6; else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    return [h, max ? d / max : 0, max];
  };
  const hsvToRgb = (h: number, s: number, v: number): [number, number, number] => {
    const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
    const i = Math.floor(h / 60) % 6;
    const [r, g, b] = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][i < 0 ? 0 : i];
    return [clamp255((r + m) * 255), clamp255((g + m) * 255), clamp255((b + m) * 255)];
  };

  function colorPicker(c: Extract<PanelControl, { kind: 'color' }>, fire: (v: unknown) => void): HTMLElement {
    let [h, sat, val] = rgbToHsv(...hexToRgb(c.value));
    const sw = el('span', { class: 'colsel-sw', style: `background:${c.value}` });
    const hexEticheta = el('span', { class: 'colsel-hex' }, [c.value.toUpperCase()]);
    const btn = el('button', { class: 'colsel-btn' }, [sw, hexEticheta]);

    const pop = el('div', { class: 'colsel-pop' });
    const tintaSV = el('span', { class: 'colsel-tinta' });
    const patrat = el('div', { class: 'colsel-sv' }, [tintaSV]);
    const tintaH = el('span', { class: 'colsel-tinta pe-bara' });
    const bara = el('div', { class: 'colsel-hue' }, [tintaH]);
    const prev = el('div', { class: 'colsel-prev' });
    const campHex = el('input', { type: 'text', spellcheck: 'false', 'aria-label': 'HEX' }) as HTMLInputElement;
    const campR = el('input', { type: 'text', inputmode: 'numeric', 'aria-label': 'R' }) as HTMLInputElement;
    const campG = el('input', { type: 'text', inputmode: 'numeric', 'aria-label': 'G' }) as HTMLInputElement;
    const campB = el('input', { type: 'text', inputmode: 'numeric', 'aria-label': 'B' }) as HTMLInputElement;
    const grilaRecente = el('div', { class: 'colsel-grila' });

    const hexCurent = () => rgbToHex(...hsvToRgb(h, sat, val));
    /** redesenează tot ce depinde de (h, sat, val); `dinCampuri` evită să suprascrii ce tastează omul */
    const deseneaza = (dinCampuri = false) => {
      const hex = hexCurent();
      patrat.style.backgroundColor = `hsl(${h}, 100%, 50%)`;
      tintaSV.style.left = sat * 100 + '%';
      tintaSV.style.top = (1 - val) * 100 + '%';
      tintaH.style.left = (h / 360) * 100 + '%';
      prev.style.background = hex;
      sw.style.background = hex;
      hexEticheta.textContent = hex;
      if (!dinCampuri) {
        const [r, g, b] = hexToRgb(hex);
        campHex.value = hex; campR.value = String(r); campG.value = String(g); campB.value = String(b);
      }
    };
    /** singurul loc care schimbă modelul; la commit se salvează și în „recente" */
    const comita = () => { const hex = hexCurent(); salveazaRecenta(hex); deseneazaRecente(); fire(hex); };
    const setDinHex = (hex: string, commit: boolean) => {
      [h, sat, val] = rgbToHsv(...hexToRgb(hex));
      deseneaza(); if (commit) comita();
    };

    // tragere pe pătrat / bară: previzualizarea se mișcă live, modelul se schimbă la
    // eliberare — un rebuild de geometrie durează ~350 ms, deci nu unul per pixel.
    const trage = (elem: HTMLElement, la: (e: PointerEvent, r: DOMRect) => void) => {
      elem.addEventListener('pointerdown', (e: PointerEvent) => {
        elem.setPointerCapture(e.pointerId);
        const misca = (ev: PointerEvent) => { la(ev, elem.getBoundingClientRect()); deseneaza(); };
        misca(e);
        const sus = (ev: PointerEvent) => {
          elem.removeEventListener('pointermove', misca);
          elem.removeEventListener('pointerup', sus);
          elem.releasePointerCapture(ev.pointerId);
          comita();
        };
        elem.addEventListener('pointermove', misca);
        elem.addEventListener('pointerup', sus);
      });
    };
    trage(patrat, (e, r) => {
      sat = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      val = 1 - Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    });
    trage(bara, (e, r) => { h = Math.max(0, Math.min(359.99, ((e.clientX - r.left) / r.width) * 360)); });

    // câmpuri: HEX și RGB, ambele bidirecționale
    campHex.addEventListener('input', () => {
      if (/^#?[0-9a-f]{6}$/i.test(campHex.value.trim())) { setDinHex(campHex.value, false); deseneaza(true); }
    });
    campHex.addEventListener('change', () => { if (/^#?[0-9a-f]{6}$/i.test(campHex.value.trim())) setDinHex(campHex.value, true); else deseneaza(); });
    for (const camp of [campR, campG, campB]) {
      const citesteRGB = () => rgbToHex(+campR.value || 0, +campG.value || 0, +campB.value || 0);
      camp.addEventListener('input', () => { setDinHex(citesteRGB(), false); deseneaza(true); });
      camp.addEventListener('change', () => setDinHex(citesteRGB(), true));
    }

    const swatch = (hex: string) => el('button', { class: 'colsel-cul', style: `background:${hex}`, title: hex.toUpperCase(),
      onclick: () => setDinHex(hex, true) });
    function deseneazaRecente() {
      grilaRecente.innerHTML = '';
      const r = citesteRecente();
      grilaRecente.append(...r.map(swatch), ...Array.from({ length: Math.max(0, 8 - r.length) }, () => el('span', { class: 'colsel-gol' })));
    }
    deseneazaRecente();

    pop.append(
      patrat, bara,
      el('div', { class: 'colsel-rand' }, [prev, el('div', { class: 'colsel-campuri' }, [
        campHex, el('div', { class: 'colsel-rgb' }, [campR, campG, campB]),
      ])]),
      el('div', { class: 'colsel-ttl' }, [t('color.recente')]), grilaRecente,
      el('div', { class: 'colsel-ttl' }, [t('color.predefinite')]),
      el('div', { class: 'colsel-grila' }, PREDEFINITE.map(swatch)),
    );

    const aseaza = () => plaseazaPanou(pop, btn);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const deschis = pop.classList.toggle('open');
      if (!deschis) return;
      deseneaza(); deseneazaRecente(); aseaza();
    });
    pop.addEventListener('click', (e) => e.stopPropagation());
    const oprire = new AbortController();
    window.addEventListener('click', () => pop.classList.remove('open'), { signal: oprire.signal });
    window.addEventListener('resize', () => { if (pop.classList.contains('open')) aseaza(); }, { signal: oprire.signal });
    document.body.append(pop);
    curatarePanou.push(() => { oprire.abort(); pop.remove(); });
    deseneaza();
    return el('label', { class: 'ctl' }, [el('span', { class: 'ctl-lbl' }, [c.label]), btn]);
  }

  // ---------- selector de font: grupat pe categorii, cu previzualizare în propriul caracter ----------
  const faceStyle = el('style', {}); document.head.append(faceStyle);
  const faceDone = new Set<string>();
  const faceFor = (url: string) => {
    const fam = 'f_' + url.replace(/[^a-z0-9]/gi, '');
    if (!faceDone.has(fam)) { faceDone.add(fam); faceStyle.append(`@font-face{font-family:"${fam}";src:url("${url}");font-display:swap}`); }
    return fam;
  };
  function fontSelect(c: Extract<PanelControl, { kind: 'fontselect' }>, fire: (v: unknown) => void): HTMLElement {
    const all = c.groups.flatMap((g) => g.items);
    const cur = all.find((i) => i.value === c.value);
    const btn = el('button', { class: 'fontsel-btn', title: cur?.label ?? '' }, [
      el('span', { class: 'fontsel-name', style: cur ? `font-family:"${faceFor(cur.url)}",system-ui` : '' }, [cur?.label ?? t('fonts.alege')]),
      el('span', { class: 'fontsel-caret' }, ['▾']),
    ]);
    const pop = el('div', { class: 'fontsel-pop' });
    const search = el('input', { class: 'fontsel-search', type: 'search', placeholder: t('fonts.cauta') }) as HTMLInputElement;
    const list = el('div', { class: 'fontsel-list' });
    pop.append(search, list);
    const draw = (q = '') => {
      list.innerHTML = ''; const ql = q.trim().toLowerCase();
      for (const g of c.groups) {
        const items = g.items.filter((i) => !ql || i.label.toLowerCase().includes(ql));
        if (!items.length) continue;
        list.append(el('div', { class: 'fontsel-grp' }, [g.categorie]));
        for (const it of items) {
          const activ = it.value === c.value;
          // fontul RESPINS rămâne alegibil, doar gri și cu motivul în locul numelui: ascuns,
          // omul l-ar căuta și n-ar înțelege unde a dispărut
          const prev = el('span', { class: 'fontsel-prev' }, [it.label]);
          const plain = el('span', { class: 'fontsel-plain' }, [it.respins ?? it.label]);
          const row = el('button', { class: 'fontsel-item' + (activ ? ' on' : '') + (it.respins ? ' respins' : ''),
            title: it.respins ?? (it.missing.length ? t('fonts.fara', { litere: it.missing.join(' ') }) : it.label),
            onclick: () => { pop.classList.remove('open'); fire(it.value); } }, [
            el('span', { class: 'fontsel-col' }, [prev, plain]),
            ...(it.missing.length ? [el('span', { class: 'fontsel-warn' }, ['⚠ ' + it.missing.join('')])] : []),
          ]);
          if (activ) (row as any).dataset.curent = '1';
          // PREVIZUALIZAREA ȘI VERDICTUL SE CER ABIA CÂND RÂNDUL SE VEDE. `@font-face` pus aici,
          // pe loc, ar face browserul să descarce fontul în clipa în care lista se deschide —
          // măsurat: 202 fișiere dintr-o apăsare. Observatorul de mai jos le cere una câte una,
          // pe măsură ce ajung sub ochi.
          (row as any).__pune = () => {
            prev.style.fontFamily = `"${faceFor(it.url)}",system-ui`;
            c.cereVerdict?.(it.value).then((motiv) => {
              if (!motiv) return;
              row.classList.add('respins');
              row.title = motiv;
              plain.textContent = motiv;
            }).catch(() => { /* fara verdict: randul ramane nemarcat */ });
          };
          // ÎNTÂI în pagină, apoi observat: un element încă detașat nu produce niciodată o
          // intersecție, deci observarea lui se pierde în tăcere. Prima variantă făcea exact
          // asta — lista se deschidea și nicio previzualizare nu se desena.
          list.append(row);
        }
      }
      if (!list.children.length) list.append(el('div', { class: 'fontsel-empty' }, [t('fonts.niciunul')]));
      pictaVizibile();
    };

    /**
     * PREVIZUALIZAREA ȘI VERDICTUL, DOAR PENTRU RÂNDURILE CHIAR VIZIBILE.
     *
     * Fiecare rând știe (în `__pune`) cum să-și pună fontul și cum să-și ceară verdictul; aici
     * se decide CÂND. Un `@font-face` pus pe toate rândurile deodată face browserul să descarce
     * fiecare font în clipa în care lista se deschide — măsurat, 202 fișiere dintr-o apăsare.
     *
     * DE CE NU `IntersectionObserver`, care ar fi unealta firească: livrarea lui e legată de
     * ciclul de randare al paginii. O măturare pornită din chiar evenimentele care schimbă ce
     * se vede — deschidere, derulare, căutare — nu depinde de nimic altceva și se poate
     * verifica direct, numărând cererile. 240 de dreptunghiuri citite la o derulare nu se simt.
     *
     * `MARJA` pregătește rândurile de imediat sub margine, ca derularea să nu arate o clipă de
     * text nestilizat. Ce s-a pus o dată nu se mai pune: `__pune` se șterge după apel.
     */
    const MARJA = 200;
    function pictaVizibile() {
      const lb = list.getBoundingClientRect();
      for (const row of [...list.querySelectorAll<HTMLElement>('.fontsel-item')]) {
        const pune = (row as any).__pune;
        if (!pune) continue;
        const b = row.getBoundingClientRect();
        if (b.bottom < lb.top - MARJA || b.top > lb.bottom + MARJA) continue;
        (row as any).__pune = null;
        pune();
      }
    }
    list.addEventListener('scroll', pictaVizibile, { passive: true });
    search.addEventListener('input', () => draw(search.value));
    /** poziționare FIXĂ, în afara fluxului panoului: nu-i mai schimbă lățimea și nu produce
     *  scroll orizontal. Se deschide în jos; dacă nu încape, în sus. */
    const aseaza = () => {
      const r = btn.getBoundingClientRect();
      // lățimea și înălțimea maximă sunt specifice listei; POZIȚIA vine din funcția comună
      pop.style.width = Math.min(Math.max(r.width, 260), window.innerWidth - 2 * MARGINE_ECRAN) + 'px';
      pop.style.maxHeight = Math.min(340, Math.max(window.innerHeight - r.bottom - 12, r.top - 12)) + 'px';
      plaseazaPanou(pop, btn);
    };
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = pop.classList.toggle('open');
      if (!open) return;
      draw(); search.value = ''; aseaza(); search.focus();
      // derulează la fontul curent și îl evidențiază
      const cur = list.querySelector('[data-curent]') as HTMLElement | null;
      if (cur) cur.scrollIntoView({ block: 'center' });
    });
    pop.addEventListener('click', (e) => e.stopPropagation());
    const oprire = new AbortController();
    window.addEventListener('click', () => pop.classList.remove('open'), { signal: oprire.signal });
    window.addEventListener('resize', () => { if (pop.classList.contains('open')) aseaza(); }, { signal: oprire.signal });
    curatarePanou.push(() => oprire.abort());
    return el('label', { class: 'ctl fontsel' }, [el('span', { class: 'ctl-lbl' }, [c.label]), el('div', { class: 'fontsel-wrap' }, [btn, pop])]);
  }

  /**
   * Paleta de culori își pune panoul în `document.body` (ca să nu lățească coloana) și
   * ascultă pe `window`. `renderProps()` golește doar panoul, deci panourile plutitoare și
   * ascultătorii lor SUPRAVIEȚUIAU: după câteva zeci de re-randări se adunau zeci de
   * panouri orfane, iar fiecare click din pagină rula toți ascultătorii acumulați.
   * Fiecare control care iese din panou își lasă aici funcția de curățare.
   */
  let curatarePanou: (() => void)[] = [];
  function curataPanouAnterior() { for (const f of curatarePanou) f(); curatarePanou = []; }

  const collapsed = new Set<string>(['Scris']); // Scris închis implicit; restul deschise
  function renderProps() {
    curataPanouAnterior();
    propsEl.innerHTML = '';
    const groups = app.panels(viewer.selected);
    if (!groups.length) { propsEl.append(el('div', { class: 'empty' }, [t('panels.gol')])); return; }
    for (const g of groups) {
      const col = collapsed.has(g.title);
      const hd = el('h2', { class: 'grp-hd' + (col ? ' col' : ''), onclick: () => { if (col) collapsed.delete(g.title); else collapsed.add(g.title); renderProps(); } }, [el('span', {}, [g.title]), el('span', { class: 'caret' }, [col ? '▸' : '▾'])]);
      const body = el('div', { class: 'grp-body' + (col ? ' col' : '') }, g.controls.map(control));
      propsEl.append(el('div', { class: 'grp' }, [hd, body]));
    }
  }

  // ---------- info-box (dreapta-jos) ----------
  const infoBox = el('div', { class: 'infobox' });
  let infoOpen = true;
  const infoToggle = el('button', { class: 'info-toggle', title: t('info.obiect'), onclick: () => { infoOpen = !infoOpen; renderInfo(); } }, ['ℹ']);
  viewEl.append(infoBox, infoToggle);
  function renderInfo() {
    const info = app.objectInfo?.(viewer.selected);
    if (!infoOpen || !info) { infoBox.style.display = 'none'; infoToggle.style.display = info ? 'block' : 'none'; return; }
    infoToggle.style.display = 'none'; infoBox.style.display = 'block';
    infoBox.innerHTML = '';
    infoBox.append(
      el('div', { class: 'info-hd' }, [el('span', {}, [info.nume]), el('button', { class: 'info-x', title: t('info.inchide'), onclick: () => { infoOpen = false; renderInfo(); } }, ['×'])]),
      el('div', { class: 'info-row' }, [`${info.dimMM[0]} × ${info.dimMM[1]} × ${info.dimMM[2]} mm`]),
      el('div', { class: 'info-row' }, [t('info.volum', { v: info.volumeMM3.toLocaleString('en-US') })]),
      el('div', { class: 'info-row' }, [t('info.triunghiuri', { n: info.triangles.toLocaleString('en-US') })]),
    );
  }

  // ---------- modal bibliotecă ----------
  const overlay = el('div', { class: 'modal-overlay', onclick: (e: any) => { if (e.target === overlay) closeLibrary(); } });
  const modal = el('div', { class: 'modal' });
  overlay.append(modal); document.body.append(overlay);
  const thumbKey = (id: string) => 'magic3d-thumb:' + id;
  const thumbSrc = (it: LibraryItem) => { try { return localStorage.getItem(thumbKey(it.id)) || it.thumb || ''; } catch { return it.thumb || ''; } };
  function openLibrary(which: 'tematici' | 'baze') {
    const getItems = () => (which === 'tematici' ? (app.library?.() ?? []) : (app.baseLibrary?.() ?? []));
    const add = which === 'tematici' ? app.onAddFromLibrary : app.onAddBase;
    let items = getItems();
    modal.innerHTML = '';
    const grid = el('div', { class: 'modal-grid' });
    const status = el('div', { class: 'modal-status' });
    const draw = (tema: string, q: string) => {
      grid.innerHTML = '';
      const ql = q.trim().toLowerCase();
      const shown = items.filter((i) => (!tema || i.tema === tema) && (!ql || i.nume.toLowerCase().includes(ql)));
      if (!shown.length) { grid.append(el('div', { class: 'empty' }, [t('modals.niciunModel')])); return; }
      for (const it of shown) {
        const src = thumbSrc(it);
        grid.append(el('div', { class: 'lib-card', title: t('modals.clickAdauga'), onclick: async () => { await add?.(it.id); closeLibrary(); refresh(); } }, [
          el('div', { class: 'thumb' }, src ? [el('img', { src, loading: 'lazy', alt: it.nume })] : []),
          el('div', { class: 'cap' }, [it.nume]),
        ]));
      }
    };
    const refreshTeme = () => {
      const teme = [...new Set(items.map((i) => i.tema))].sort();
      filter.innerHTML = ''; filter.append(el('option', { value: '' }, [t('modals.toateTemele')]), ...teme.map((t) => el('option', { value: t }, [t])));
    };
    // RESCANARE: scanează pe disc și regenerează miniaturile lipsă. Endpoint-ul `/__rescan`
    // e servit de un plugin Vite cu `apply: 'serve'`, deci EXISTĂ DOAR ÎN DEZVOLTARE. Pe domeniu
    // ar da 404, iar butonul ar afișa o eroare fără nicio explicație pentru utilizator.
    // Ascuns în producție și pentru că biblioteca e, prin decizie, doar de partea serverului:
    // adăugarea de elemente rămâne o operație de administrare, nu una din interfață.
    const rescanBtn = el('button', { class: 'modal-rescan', onclick: async () => {
      const before = items.length;
      (rescanBtn as HTMLButtonElement).disabled = true; rescanBtn.textContent = t('modals.rescanez');
      status.className = 'modal-status busy'; status.textContent = t('modals.seScaneaza');
      try {
        const r = await fetch('/__rescan', { method: 'POST' });
        const j = await r.json();
        if (!j.ok) throw new Error(j.error || t('modals.eroareServer'));
        await app.reloadLibraries?.();
        items = getItems(); refreshTeme(); draw(filter.value, search.value);
        const noi = items.length - before;
        const s = which === 'tematici' ? j.stats.tematici : j.stats.baze;
        status.className = 'modal-status ok';
        status.textContent = t('modals.rescanareOk', { total: items.length, thumbs: s.thumbsNoi,
          noi: noi > 0 ? t('modals.elementeNoi', { n: noi }) : t('modals.niciunElementNou') });
      } catch (e: any) {
        status.className = 'modal-status err';
        status.textContent = t('modals.rescanareEsuata', { eroare: e?.message ?? e });
      } finally { (rescanBtn as HTMLButtonElement).disabled = false; rescanBtn.textContent = t('modals.rescaneaza'); }
    } }, [t('modals.rescaneaza')]);
    const search = el('input', { class: 'modal-search', type: 'search', placeholder: t('modals.cautaDupaNume'), oninput: (e: any) => draw(filter.value, e.target.value) }) as HTMLInputElement;
    const filter = el('select', { class: 'lib-filter', onchange: (e: any) => draw(e.target.value, search.value) }, []) as HTMLSelectElement;
    modal.append(
      el('div', { class: 'modal-hd' }, [el('h2', {}, [which === 'tematici' ? t('modals.tematici') : t('modals.baze')]), el('button', { class: 'modal-x', onclick: closeLibrary }, ['×'])]),
      el('div', { class: 'modal-tools' }, [search, filter, rescanBtn]),
      status, grid,
    );
    // DUPA append, nu inainte: `.remove()` pe un element care inca n-are parinte nu face nimic,
    // iar el ajungea oricum in modal. Verificat pe buildul de productie — prima incercare a
    // lasat butonul acolo.
    if (import.meta.env.PROD) rescanBtn.remove();
    refreshTeme(); draw('', '');
    overlay.classList.add('open');
  }
  function closeLibrary() { overlay.classList.remove('open'); }

  // ---------- panouri flotante sub unelte ----------
  let floatingOpen: HTMLElement | null = null;
  /**
   * POZIȚIONAREA UNICĂ a oricărui panou flotant.
   *
   * Logica asta a fost scrisă de trei ori (fonturi, paletă, setări) și de fiecare dată a
   * reapărut același bug: panoul iese din ecran. Acum există într-un singur loc și toate
   * panourile trec prin ea.
   *
   * Reguli: butonul în jumătatea dreaptă a ecranului → panoul se aliniază la marginea lui
   * DREAPTĂ; altfel la stânga. Sub buton dacă încape, altfel deasupra. În ambele axe,
   * poziția e limitată la fereastră — limitarea e ultimul pas, deci nu poate fi ocolită.
   *
   * Se apelează DUPĂ ce panoul are conținut: altfel `offsetWidth/Height` sunt zero.
   */
  const MARGINE_ECRAN = 8;
  function plaseazaPanou(pan: HTMLElement, anchor: HTMLElement) {
    const r = anchor.getBoundingClientRect();
    const w = pan.offsetWidth || 240;
    const h = pan.offsetHeight || 240;
    const laDreapta = r.left + r.width / 2 > window.innerWidth / 2;
    let x = laDreapta ? r.right - w : r.left;
    x = Math.max(MARGINE_ECRAN, Math.min(x, window.innerWidth - w - MARGINE_ECRAN));
    const incapeJos = window.innerHeight - r.bottom - 12 >= h;
    let y = incapeJos ? r.bottom + 4 : r.top - 4 - h;
    y = Math.max(MARGINE_ECRAN, Math.min(y, window.innerHeight - h - MARGINE_ECRAN));
    pan.style.left = x + 'px'; pan.style.top = y + 'px'; pan.style.bottom = 'auto';
  }
  /** repoziționează un panou care și-a schimbat înălțimea după re-randare */
  function replaseaza(pan: HTMLElement) {
    const a = (pan as any).__ancora as HTMLElement | undefined;
    if (a && pan.classList.contains('open')) plaseazaPanou(pan, a);
  }
  function floatingUnder(anchor: HTMLElement, onOpen?: (pan: HTMLElement) => void, onToggle?: () => void): HTMLElement {
    const pan = el('div', { class: 'floating' });
    (pan as any).__ancora = anchor;
    anchor.addEventListener('click', (e) => {
      e.stopPropagation();
      const wasOpen = floatingOpen === pan; closeFloating();
      if (wasOpen) return;
      pan.classList.add('open'); floatingOpen = pan;
      onToggle?.(); onOpen?.(pan);
      plaseazaPanou(pan, anchor);     // după conținut, ca măsurătorile să fie reale
    });
    pan.addEventListener('click', (e) => e.stopPropagation());
    document.body.append(pan);
    return pan;
  }
  function closeFloating() {
    // Rigla e activă doar cât panoul ei e deschis. Fără asta rămânea armată după închidere,
    // iar orice click pe model mai fixa puncte — utilizatorul o percepea ca viewport blocat.
    viewer.setMasurare(false);
    if (floatingOpen) { floatingOpen.classList.remove('open'); floatingOpen = null; }
  }
  function openFloatingProg(pan: HTMLElement, anchor: HTMLElement, onOpen?: (p: HTMLElement) => void) {
    if (floatingOpen === pan) return; closeFloating();
    (pan as any).__ancora = anchor;
    pan.classList.add('open'); floatingOpen = pan;
    onOpen?.(pan);
    plaseazaPanou(pan, anchor);
  }
  // Un click în afara panoului îl închide — corect pentru meniuri, GREȘIT pentru uneltele
  // care se folosesc CHIAR în viewport. Rigla cere două click-uri pe model: fără excepția
  // asta, primul click îi închidea panoul și o dezarma, iar al doilea punct nu se mai putea
  // fixa fără redeschiderea uneltei.
  window.addEventListener('click', (e) => {
    if (floatingOpen?.dataset.lucreazaInViewport === '1'
        && e.target instanceof Node && viewEl.contains(e.target)) return;
    closeFloating();
  });
  window.addEventListener('resize', () => { if (floatingOpen) replaseaza(floatingOpen); });
  const normDeg = (d: number) => +(((d + 180) % 360 + 360) % 360 - 180).toFixed(0);

  // ---------- PRESETURI (salvate local) ----------
  // Aplicația dă o stare serializabilă; nucleul nu știe ce e înăuntru, doar o pune în
  // localStorage sub numele dat de utilizator.
  const presetKey = () => 'magic3d-preseturi:' + (app.id ?? 'app');
  type Preset = { nume: string; data: unknown; cand: string };
  const citestePreseturi = (): Preset[] => {
    try { const v = JSON.parse(localStorage.getItem(presetKey()) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
  };
  const scriePreseturi = (l: Preset[]) => {
    try { localStorage.setItem(presetKey(), JSON.stringify(l)); return true; }
    catch { return false; }   // cotă depășită / localStorage blocat
  };
  function renderPresets(pan: HTMLElement) {
    pan.innerHTML = '';
    pan.classList.add('preset-pan');
    pan.append(el('div', { class: 'fttl' }, [t('presets.titlu')]));
    const stare = el('div', { class: 'preset-stare' });
    const nume = el('input', { type: 'text', class: 'preset-nume', placeholder: t('presets.numePlaceholder') }) as HTMLInputElement;
    const salveaza = () => {
      const n = nume.value.trim(); if (!n) { nume.focus(); return; }
      let data: unknown;
      try { data = app.getPreset!(); } catch (e: any) { stare.className = 'preset-stare err'; stare.textContent = String(e?.message ?? e); return; }
      const l = citestePreseturi().filter((x) => x.nume !== n);
      l.unshift({ nume: n, data, cand: new Date().toISOString().slice(0, 10) });
      if (!scriePreseturi(l)) { stare.className = 'preset-stare err'; stare.textContent = t('presets.nuSePoateSalva'); return; }
      nume.value = ''; renderPresets(pan);
    };
    nume.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); salveaza(); } });
    pan.append(el('div', { class: 'preset-rand-nou' }, [nume,
      el('button', { class: 'menu-item preset-salveaza', onclick: salveaza }, [t('presets.salveaza')])]));

    const lista = citestePreseturi();
    if (!lista.length) pan.append(el('div', { class: 'preset-gol' }, [t('presets.niciunul')]));
    for (const pr of lista) {
      pan.append(el('div', { class: 'preset-rand' }, [
        el('button', { class: 'preset-incarca', title: t('presets.incarca'), onclick: async () => {
          stare.className = 'preset-stare busy'; stare.textContent = t('presets.seIncarca');
          try {
            pushUndo();
            await app.loadPreset!(pr.data);
            refresh(); renderProps(); renderInfo(); markSel();
            stare.className = 'preset-stare ok'; stare.textContent = t('presets.incarcat', { nume: pr.nume });
          } catch (e: any) {
            refresh(); renderProps();
            stare.className = 'preset-stare err'; stare.textContent = String(e?.message ?? e);
          }
        } }, [el('span', { class: 'preset-n' }, [pr.nume]), el('span', { class: 'preset-d' }, [pr.cand])]),
        el('button', { class: 'preset-x', title: t('presets.sterge'), onclick: () => {
          scriePreseturi(citestePreseturi().filter((x) => x.nume !== pr.nume)); renderPresets(pan);
        } }, ['✕']),
      ]));
    }
    pan.append(stare);
    replaseaza(pan);
  }

  // ---------- IDENTITATE FIRMĂ (configurare, nu setare de captură) ----------
  // Stă în panoul ei, nu în cel de captură: e ceva ce se face o dată. Datele vin din
  // core/config/identitate.ts, ca să le poată folosi și fișa de producție mai târziu.
  let identitate: IdentitateFirma = citesteIdentitate();
  // Panoul de SETĂRI: locul evident pentru configurări generale. Identitatea firmei e
  // prima secțiune; ce mai apare pe viitor se adaugă aici, nu într-un panou de lucru.
  floatingUnder(setariBtn, (pan) => renderSetari(pan));
  /**
   * Campul in care clientul lipeste tokenul. Mesajul de sub el spune EXACT ce s-a intamplat:
   * acceptat, expirat sau respins — si de ce. „Nu merge" e cel mai prost raspuns posibil cand
   * omul tocmai a platit.
   */
  function sectiuneLicenta(pan: HTMLElement) {
    pan.append(el('div', { class: 'colsel-ttl' }, [t('licenta.setariTitlu')]));
    const mesaj = el('div', { class: 'lic-mesaj' });
    const camp = el('input', { class: 'lic-input', type: 'text', spellcheck: 'false',
      placeholder: t('licenta.placeholderToken'), value: tokenSalvat() }) as HTMLInputElement;
    const arataStarea = () => {
      const st = stareLicenta();
      if (esteCodFix(st)) {
        // permanenta: nicio data de expirare, niciun avertisment de reinnoire, niciun titular
        mesaj.textContent = t('licenta.starFixa');
        mesaj.className = 'lic-mesaj ok';
      } else if (st.fel === 'valida') {
        const zile = zileRamase(st.licenta);
        mesaj.textContent = zile <= 30
          ? t('licenta.starExpira', { nume: st.licenta.nume, zile })
          : t('licenta.starValida', { nume: st.licenta.nume, data: st.licenta.expira });
        mesaj.className = 'lic-mesaj ok';
      } else if (st.fel === 'expirat') {
        mesaj.textContent = t('licenta.starExpirata', { id: st.licenta.id, data: st.licenta.expira });
        mesaj.className = 'lic-mesaj err';
      } else if (st.fel === 'invalid') {
        mesaj.textContent = t('licenta.starInvalida', { motiv: st.motiv });
        mesaj.className = 'lic-mesaj err';
      } else {
        mesaj.textContent = t('licenta.starLipsa');
        mesaj.className = 'lic-mesaj';
      }
    };
    arataStarea();
    const aplica = el('button', { class: 'menu-item lic-aplica', onclick: async () => {
      await salveazaLicenta(camp.value);
      arataStarea(); reiaNota(); reiaCumpara(); actualizeazaEtichetaLicenta();
    } }, [t('licenta.aplica')]);
    /**
     * Linkul de cumparare, DOAR cand licenta nu e activa.
     *
     * Cine a platit deja nu are de ce sa mai vada un buton de cumparare in propriile Setari —
     * la fel cum nu vrei sa ti se ofere iar ce ai in mana. Se ascunde, nu se sterge, fiindca
     * starea se poate schimba la loc daca omul isi goleste campul.
     */
    const cumpara = el('a', { class: 'lic-cumpara', href: linkCheckout('licenta', limba()),
      target: '_blank', rel: 'noopener noreferrer' },
      [t('licenta.cumparaLicenta', { pret: pretAfisat('licenta') })]);
    const reiaCumpara = () => { cumpara.hidden = stareLicenta().fel === 'valida'; };
    reiaCumpara();
    const nota = el('div', { class: 'lic-nota' }, [t('licenta.explicatie')]);
    /** nota de sub camp: la codul fix explica si ca licenta e legata de browser */
    const reiaNota = () => {
      nota.textContent = esteCodFix(stareLicenta())
        ? `${t('licenta.notaFixa')} ${t('licenta.explicatie')}`
        : t('licenta.explicatie');
    };
    reiaNota();
    pan.append(el('div', { class: 'lic-rand' }, [camp, aplica]), mesaj, cumpara, nota);

    // RAPORTAREA sta tot aici: e locul in care omul ajunge cand ceva nu merge cum crede el.
    // Contextul se calculeaza LA DESCHIDERE, nu acum, ca sa prinda starea din acel moment.
    pan.append(el('button', { class: 'menu-item', onclick: () => deschideRaport(() => ({
      aplicatie: app.title,
      preset: app.getPreset?.(),
      stare: [...document.querySelectorAll('.status-item')].map((e) => (e.textContent ?? '').trim()).filter(Boolean),
      eroare: reconstructieEsuata,
    })) }, [t('raport.deschide')]));
  }

  function renderSetari(pan: HTMLElement) {
    pan.innerHTML = '';
    pan.classList.add('ident-pan');
    pan.append(el('div', { class: 'fttl' }, [t('setari.titlu')]));
    sectiuneLicenta(pan);
    pan.append(el('div', { class: 'colsel-ttl' }, [t('ident.titlu')]));
    sectiuneIdentitate(pan, () => renderSetari(pan));
    replaseaza(pan);
  }
  // scurtătură din panoul de prezentare — nu mai e singura cale, dar rămâne la îndemână
  const identAncora = el('button', { class: 'ident-link' }, [t('ident.deschide')]);
  floatingUnder(identAncora, (pan) => renderIdentitate(pan));
  function salveazaIdentitate(stare?: HTMLElement) {
    if (!scrieIdentitate(identitate) && stare) { stare.className = 'preset-stare err'; stare.textContent = t('ident.nuSePoateSalva'); }
  }
  function renderIdentitate(pan: HTMLElement) {
    pan.innerHTML = '';
    pan.classList.add('ident-pan');
    pan.append(el('div', { class: 'fttl' }, [t('ident.titlu')]));
    sectiuneIdentitate(pan, () => renderIdentitate(pan));
    replaseaza(pan);
  }
  /** conținutul propriu-zis, ca să arate la fel și în „setări", și în scurtătură */
  function sectiuneIdentitate(pan: HTMLElement, reimprospateaza: () => void) {
    const stare = el('div', { class: 'preset-stare' });

    // logo
    const prev = el('div', { class: 'ident-logo' + (identitate.logo ? '' : ' gol') },
      identitate.logo ? [el('img', { src: identitate.logo, alt: '' })] : [t('ident.faraLogo')]);
    const fisier = el('input', { type: 'file', accept: 'image/png,image/webp', style: 'display:none',
      onchange: async (e: any) => {
        const f = e.target.files?.[0]; if (!f) return;
        const dataURL = await new Promise<string>((res, rej) => {
          const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); r.readAsDataURL(f);
        }).catch(() => '');
        if (!dataURL) { stare.className = 'preset-stare err'; stare.textContent = t('ident.nuSePoateCiti'); return; }
        identitate.logo = dataURL; identitate.logoNume = f.name;
        salveazaIdentitate(stare); reimprospateaza(); renderPrezentareDacaEDeschis();
        // un logo fără alfa apare ca dreptunghi peste fotografie — merită spus, nu blocat
        if (!(await areTransparenta(dataURL))) {
          const st = pan.querySelector('.preset-stare') as HTMLElement | null;
          if (st) { st.className = 'preset-stare err'; st.textContent = t('ident.faraAlfa'); }
        }
      } }) as HTMLInputElement;
    pan.append(prev, fisier, el('div', { class: 'ident-butoane' }, [
      el('button', { class: 'menu-item', onclick: () => fisier.click() }, [t('ident.incarcaLogo')]),
      ...(identitate.logo ? [el('button', { class: 'menu-item', onclick: () => {
        delete identitate.logo; delete identitate.logoNume; salveazaIdentitate(stare);
        reimprospateaza(); renderPrezentareDacaEDeschis();
      } }, [t('ident.stergeLogo')])] : []),
    ]));

    // nume + site
    const camp = (eticheta: string, valoare: string, pune: (v: string) => void) => {
      const i = el('input', { type: 'text', value: valoare, class: 'preset-nume',
        oninput: (e: any) => { pune(e.target.value.trim()); salveazaIdentitate(stare); } });
      return el('label', { class: 'ctl' }, [el('span', { class: 'ctl-lbl' }, [eticheta]), i]);
    };
    pan.append(camp(t('ident.nume'), identitate.nume ?? '', (v) => { identitate.nume = v; }));
    pan.append(camp(t('ident.site'), identitate.site ?? '', (v) => { identitate.site = v; }));

    // watermark: poziție, opacitate, dimensiune
    pan.append(el('div', { class: 'colsel-ttl' }, [t('ident.watermark')]));
    const colturi: ColtWatermark[] = ['stanga-sus', 'dreapta-sus', 'stanga-jos', 'dreapta-jos'];
    const gc = el('div', { class: 'ident-colturi' });
    for (const c of colturi) gc.append(el('button', { class: 'menu-item' + (identitate.watermark.colt === c ? ' on' : ''),
      onclick: () => { identitate.watermark.colt = c; salveazaIdentitate(stare); reimprospateaza(); } }, [t('ident.colt_' + c)]));
    pan.append(gc);
    const glisor = (eticheta: string, val: number, min: number, max: number, pas: number, pune: (v: number) => void, fmt: (v: number) => string) => {
      const et = el('span', { class: 'prez-val' }, [fmt(val)]);
      const i = el('input', { type: 'range', min: String(min), max: String(max), step: String(pas), value: String(val),
        oninput: (e: any) => { const v = +e.target.value; et.textContent = fmt(v); pune(v); salveazaIdentitate(stare); } });
      return el('div', { class: 'frow' }, [el('label', {}, [eticheta]), i, et]);
    };
    pan.append(glisor(t('ident.opacitate'), Math.round(identitate.watermark.opacitate * 100), 5, 100, 5,
      (v) => { identitate.watermark.opacitate = v / 100; }, (v) => v + '%'));
    pan.append(glisor(t('ident.dimensiune'), Math.round(identitate.watermark.latimeProcent * 100), 4, 40, 1,
      (v) => { identitate.watermark.latimeProcent = v / 100; }, (v) => v + '%'));
    pan.append(stare);
  }
  const renderPrezentareDacaEDeschis = () => {
    const p = document.querySelector('.floating.open.prez-pan') as HTMLElement | null;
    if (p) renderPrezentare(p);
  };

  // ---------- MOD PREZENTARE (fotografii de produs) ----------
  // Alt lucru decât „imagine": acolo se captează exact ce se vede; aici scena e curățată,
  // iluminată ca într-un studio și materialul primește textura de straturi de print.
  let prezRezolutie = 3000;
  let sceneDisponibile: IntrareManifestScena[] = [];
  let scenaCurenta: ScenaFoto | null = null;
  incarcaManifestScene().then((l) => { sceneDisponibile = l; renderPrezentareDacaEDeschis(); });
  /** încarcă scena și imaginea ei, apoi le dă viewer-ului; `null` = înapoi la studio */
  async function alegeScena(intrare: IntrareManifestScena | null, stare?: HTMLElement) {
    try {
      if (!intrare) { scenaCurenta = null; viewer.setScenaFoto(null, null); return; }
      const sc = await incarcaScena(intrare);
      const img = await new Promise<HTMLImageElement>((res, rej) => {
        const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error(sc.imagine)); i.src = sc.urlImagine!;
      });
      scenaCurenta = sc;
      viewer.setScenaFoto(sc, img);
    } catch (e: any) {
      scenaCurenta = null;
      if (stare) { stare.className = 'preset-stare err'; stare.textContent = t('prez.scenaEsuata', { eroare: e?.message ?? e }); }
    }
  }
  let prezCuloare = '#f4f5f7';
  const setPrezentare = (on: boolean) => {
    viewer.setPrezentare(on);
    // elementele de interfață care n-au ce căuta într-o fotografie de produs
    viewEl.classList.toggle('prezentare', on);
  };
  function renderPrezentare(pan: HTMLElement) {
    pan.innerHTML = '';
    pan.classList.add('prez-pan');
    const o = viewer.prezentareOptiuni;
    const activ = viewer.prezentareActiva;
    pan.append(el('div', { class: 'fttl' }, [t('prez.titlu')]));
    pan.append(el('button', { class: 'menu-item prez-comutator' + (activ ? ' on' : ''),
      onclick: () => { setPrezentare(!activ); renderPrezentare(pan); } },
      [activ ? t('prez.opreste') : t('prez.porneste')]));

    /** rând de butoane exclusive */
    const rand = (eticheta: string, valori: (string | number)[], curent: string | number,
                  eticheteaza: (v: any) => string, seteaza: (v: any) => void) => {
      const g = el('div', { class: 'img-optiuni' });
      for (const v of valori) g.append(el('button', { class: 'menu-item' + (v === curent ? ' on' : ''),
        onclick: () => { seteaza(v); renderPrezentare(pan); } }, [eticheteaza(v)]));
      return el('div', { class: 'frow' }, [el('label', {}, [eticheta]), g]);
    };
    pan.append(rand(t('prez.fundal'), ['alb', 'transparent', 'culoare'], o.fundal,
      (v) => t('prez.fundal_' + v), (v) => viewer.setPrezentareOptiuni({ fundal: v })));
    if (o.fundal === 'culoare') {
      const inp = el('input', { type: 'color', value: prezCuloare,
        oninput: (e: any) => { prezCuloare = e.target.value; viewer.setPrezentareOptiuni({ culoare: prezCuloare }); } });
      pan.append(el('div', { class: 'frow' }, [el('label', {}, [t('prez.culoare')]), inp]));
    }
    pan.append(rand(t('prez.grosimeStrat'), [0.08, 0.12, 0.16, 0.2, 0.28], o.grosimeStrat,
      (v) => String(v), (v) => viewer.setPrezentareOptiuni({ grosimeStrat: v })));

    // intensitatea straturilor: continuă, cu valoarea afișată
    const val = el('span', { class: 'prez-val' }, [Math.round(o.straturiIntensitate * 100) + '%']);
    const sl = el('input', { type: 'range', min: '0', max: '100', step: '5',
      value: String(Math.round(o.straturiIntensitate * 100)),
      oninput: (e: any) => { const v = +e.target.value; val.textContent = v + '%'; viewer.setPrezentareOptiuni({ straturiIntensitate: v / 100 }); } });
    pan.append(el('div', { class: 'frow' }, [el('label', {}, [t('prez.straturi')]), sl, val]));

    // ---- scene de fundal ----
    if (sceneDisponibile.length) {
      pan.append(el('div', { class: 'colsel-ttl' }, [t('prez.scena')]));
      const g = el('div', { class: 'prez-scene' });
      const card = (id: string | null, eticheta: string, thumb?: string) =>
        el('button', { class: 'prez-scena' + ((scenaCurenta?.id ?? null) === id ? ' on' : ''), title: eticheta,
          onclick: async () => { await alegeScena(id ? sceneDisponibile.find((x) => x.id === id)! : null, stare); renderPrezentare(pan); } },
          [thumb ? el('img', { src: '/scene/' + thumb, alt: '' }) : el('span', { class: 'prez-scena-gol' }, ['—']),
           el('span', { class: 'prez-scena-nume' }, [eticheta])]);
      g.append(card(null, t('prez.faraScena')), ...sceneDisponibile.map((x) => card(x.id, x.nume, x.thumb)));
      pan.append(g);
    }
    if (scenaCurenta) {
      // reperul de scară: fără el nu se vede dacă litera e de 120 sau de 300 mm
      const d = viewer.dimensiuneObiecte();
      pan.append(el('div', { class: 'prez-reper' }, [t('prez.dimensiuneReala', { x: d[0], y: d[1], z: d[2] })]));
      if (scenaCurenta.reperScara) pan.append(el('div', { class: 'prez-reper mic' }, [scenaCurenta.reperScara]));
      pan.append(el('div', { class: 'prez-reper mic' }, [t('prez.orizont', { p: Math.round(orizontCalculat(scenaCurenta.camera) * 100) })]));
      const inc = viewer.incadrareFoto;
      const fin = (eticheta: string, cheie: 'offsetX' | 'offsetY' | 'zoom', min: number, max: number, pas: number, fmt: (v: number) => string) => {
        const et = el('span', { class: 'prez-val' }, [fmt(inc[cheie])]);
        const i = el('input', { type: 'range', min: String(min), max: String(max), step: String(pas), value: String(inc[cheie]),
          oninput: (e: any) => { const v = +e.target.value; et.textContent = fmt(v); viewer.setIncadrareFoto({ [cheie]: v } as any); } });
        return el('div', { class: 'frow' }, [el('label', {}, [eticheta]), i, et]);
      };
      pan.append(fin(t('prez.pozX'), 'offsetX', -200, 200, 2, (v) => v + ' mm'));
      pan.append(fin(t('prez.pozY'), 'offsetY', -200, 200, 2, (v) => v + ' mm'));
      pan.append(fin(t('prez.marime'), 'zoom', 0.4, 3, 0.05, (v) => v.toFixed(2) + '×'));
    }

    pan.append(el('div', { class: 'colsel-ttl' }, [t('prez.unghi')]));
    const gu = el('div', { class: 'prez-unghiuri' });
    for (const u of ['trei-sferturi-stanga', 'trei-sferturi-dreapta', 'frontal', 'usor-de-sus'] as const) {
      gu.append(el('button', { class: 'menu-item', onclick: () => viewer.setUnghiFoto(u) }, [t('prez.unghi_' + u)]));
    }
    pan.append(gu);

    pan.append(rand(t('prez.rezolutie'), [2000, 3000, 4000], prezRezolutie, (v) => `${v} px`, (v) => { prezRezolutie = v; }));

    // watermark: comutatorul stă aici, dar setările lui sunt în „identitate firmă"
    if (identitate.logo) {
      const cb = el('input', { type: 'checkbox', ...(identitate.watermark.activ ? { checked: '' } : {}) }) as HTMLInputElement;
      cb.addEventListener('change', () => { identitate.watermark.activ = cb.checked; scrieIdentitate(identitate); });
      pan.append(el('div', { class: 'frow' }, [el('label', {}, [t('prez.watermark')]), cb]));
    }
    pan.append(identAncora);
    const stare = el('div', { class: 'preset-stare' });
    pan.append(el('button', { class: 'menu-item prez-captura', onclick: async () => {
      try {
        // în mod prezentare fundalul e deja pus de viewer; îi spunem doar să nu-l suprascrie
        // 4:3 fix: toate fotografiile din set ies cu același cadru, indiferent de fereastră
        const brut = viewer.exportPNG(prezRezolutie, viewer.prezentareActiva ? 'pastreaza' : 'alb', 4 / 3);
        // watermark-ul se aplică DUPĂ randare, peste PNG-ul gata făcut
        const url = await aplicaWatermark(brut, identitate);
        const a = el('a', { href: url, download: `${app.exportName?.() ?? 'imagine'}-prezentare.png` }) as HTMLAnchorElement;
        document.body.append(a); a.click(); a.remove();
        stare.className = 'preset-stare ok';
        stare.textContent = t('image.gata', { w: prezRezolutie, kb: Math.round(url.length * 0.75 / 1024) });
      } catch (e: any) { stare.className = 'preset-stare err'; stare.textContent = String(e?.message ?? e); }
    } }, [t('prez.captura')]), stare);
    replaseaza(pan);
  }

  // ---------- IMAGINE DE PRODUS (PNG) ----------
  let imgFundal: 'alb' | 'transparent' = 'alb';
  let imgLatime = 2000;
  function renderImagine(pan: HTMLElement) {
    pan.innerHTML = '';
    pan.append(el('div', { class: 'fttl' }, [t('image.titlu')]));
    const optiuni = (eticheta: string, valori: (string | number)[], curent: () => string | number, seteaza: (v: any) => void) => {
      const rand = el('div', { class: 'frow' }, [el('label', {}, [eticheta])]);
      const grup = el('div', { class: 'img-optiuni' });
      for (const v of valori) {
        grup.append(el('button', { class: 'menu-item' + (v === curent() ? ' on' : ''), onclick: () => { seteaza(v); renderImagine(pan); } },
          [typeof v === 'number' ? `${v} px` : t('image.fundal_' + v)]));
      }
      rand.append(grup);
      return rand;
    };
    pan.append(optiuni(t('image.fundal'), ['alb', 'transparent'], () => imgFundal, (v) => { imgFundal = v; }));
    pan.append(optiuni(t('image.latime'), [2000, 3000, 4000], () => imgLatime, (v) => { imgLatime = v; }));
    const stare = el('div', { class: 'preset-stare' });
    pan.append(el('button', { class: 'menu-item', onclick: () => {
      try {
        const url = viewer.exportPNG(imgLatime, imgFundal);
        const a = el('a', { href: url, download: `${app.exportName?.() ?? 'imagine'}.png` }) as HTMLAnchorElement;
        document.body.append(a); a.click(); a.remove();
        stare.className = 'preset-stare ok';
        stare.textContent = t('image.gata', { w: imgLatime, kb: Math.round(url.length * 0.75 / 1024) });
      } catch (e: any) { stare.className = 'preset-stare err'; stare.textContent = String(e?.message ?? e); }
    } }, [t('image.descarca')]), stare);
  }

  // ---------- RIGLĂ ----------
  // Măsurare punct-la-punct pe model, ca în slicer. Cât e activă, click-stânga fixează puncte
  // în loc să rotească camera sau să selecteze — altfel n-ai putea nimeri un colț.
  let riglaRez: { d: number; dx: number; dy: number; dz: number } | null = null;
  let riglaVal: HTMLElement | null = null;
  const scrieRigla = () => {
    if (!riglaVal) return;
    riglaVal.textContent = riglaRez
      ? `${riglaRez.d.toFixed(2)} mm   ·   ΔX ${riglaRez.dx.toFixed(2)}   ΔY ${riglaRez.dy.toFixed(2)}   ΔZ ${riglaRez.dz.toFixed(2)}`
      : t('rigla.fara');
  };
  viewer.onMasura = (r) => { riglaRez = r; scrieRigla(); };
  function renderRigla(pan: HTMLElement) {
    pan.replaceChildren();
    pan.dataset.lucreazaInViewport = '1';   // click-ul pe model nu închide unealta
    viewer.setMasurare(true);
    pan.append(el('div', { class: 'pan-title' }, [t('rigla.titlu')]));
    pan.append(el('div', { class: 'pan-note' }, [t('rigla.ajutor')]));
    pan.append(el('div', { class: 'pan-note' }, [t('rigla.prindere')]));
    riglaVal = el('div', { class: 'rigla-val' }, [t('rigla.fara')]);
    pan.append(el('div', { class: 'ctl note' }, [el('span', { class: 'ctl-lbl' }, [t('rigla.distanta')]), riglaVal]));
    scrieRigla();
    pan.append(el('button', { class: 'wide', onclick: () => viewer.stergeMasura() }, [t('rigla.sterge')]));
    curatarePanou.push(() => { viewer.setMasurare(false); riglaVal = null; });
    replaseaza(pan);
  }
  // dezactivarea riglei la închiderea panoului se face în renderRigla, prin registrul de
  // curățare al panourilor: altfel click-ul ar rămâne confiscat după ce închizi unealta.

  // ---------- MANUAL DE UTILIZARE ----------
  // Ecran complet, derulabil. Fiecare unealtă apare cu PICTOGRAMA EI REALĂ, luată din același
  // set ca bara de sus: dacă se schimbă o iconiță, manualul o arată pe cea nouă, fără sincronizare
  // manuală. Numărul de combinații se calculează din bibliotecile încărcate, nu e scris de mână.
  /** câte fonturi oferă aplicația — se citesc din selectorul de font, nu se scriu de mână */
  function numarFonturi(): number {
    for (const g of app.panels(null)) {
      for (const c of g.controls) {
        if (c.kind === 'fontselect') return c.groups.reduce((n, gr) => n + gr.items.length, 0);
      }
    }
    return 0;
  }
  function deschideAjutor() {
    const inv = {
      car: 37,                                   // 26 litere + 10 cifre + &
      font: numarFonturi(),
      mod: 3,                                    // relief · gravat · locaș
      baze: (app.baseLibrary?.() ?? []).length + 1,
      tem: (app.library?.() ?? []).length + 1,
    };
    const total = inv.car * inv.font * inv.mod * inv.baze * inv.tem;
    const grupa = (n: number) => n.toLocaleString('ro-RO');
    const ov = el('div', { class: 'ajutor-overlay' });
    const inchide = () => { ov.remove(); document.removeEventListener('keydown', peTasta); };
    const peTasta = (e: KeyboardEvent) => { if (e.key === 'Escape') inchide(); };
    document.addEventListener('keydown', peTasta);
    ov.addEventListener('click', (e) => { if (e.target === ov) inchide(); });

    const foaie = el('div', { class: 'ajutor-foaie' });
    foaie.append(el('div', { class: 'ajutor-cap' }, [
      el('div', {}, [el('h2', {}, [t('ajutor.titlu')]), el('p', {}, [t('ajutor.subtitlu')])]),
      el('button', { class: 'ajutor-x', title: t('ajutor.inchide'), onclick: inchide }, ['✕']),
    ]));
    const corp = el('div', { class: 'ajutor-corp' });

    corp.append(el('h3', {}, [t('ajutor.sectiuneBara')]));
    for (const k of ['undo','redo','move','rotate','scale','depth','align','tematici','baza','views','proj','plate','plates','presets','imagine','prezentare','rigla','setari','export']) {
      const r = el('div', { class: 'ajutor-rand' });
      r.append(el('div', { class: 'ajutor-ic' }, [icon(k)]));
      const txt = el('div', { class: 'ajutor-txt' });
      txt.append(el('div', { class: 'ajutor-nume' }, [t(`ajutor.${k}_t`)]));
      txt.append(el('div', { class: 'ajutor-desc' }, [t(`ajutor.${k}_d`)]));
      txt.append(el('div', { class: 'ajutor-cum' }, [
        el('b', {}, [t('ajutor.etCum') + ': ']), t(`ajutor.${k}_c`)]));
      r.append(txt); corp.append(r);
    }

    corp.append(el('h3', {}, [t('ajutor.sectiuneFlux')]));
    const ol = el('ol', { class: 'ajutor-flux' });
    for (let i = 1; i <= 7; i++) ol.append(el('li', {}, [t(`ajutor.flux${i}`)]));
    corp.append(ol);

    corp.append(el('h3', {}, [t('ajutor.sectiuneSfaturi')]));
    const ul = el('ul', { class: 'ajutor-flux' });
    for (let i = 1; i <= 4; i++) ul.append(el('li', {}, [t(`ajutor.sfat${i}`)]));
    corp.append(ul);

    corp.append(el('h3', {}, [t('ajutor.sectiuneCombinatii')]));
    corp.append(el('p', {}, [t('ajutor.combIntro')]));
    corp.append(el('pre', { class: 'ajutor-calcul' }, [
      t('ajutor.combFormula', { car: inv.car, font: inv.font, mod: inv.mod, baze: inv.baze, tem: inv.tem }),
      '\n', t('ajutor.combTotal', { total: grupa(total) })]));
    corp.append(el('p', { class: 'ajutor-desc' }, [t('ajutor.combNota1')]));
    corp.append(el('p', { class: 'ajutor-desc' }, [t('ajutor.combNota2')]));

    corp.append(el('div', { class: 'ajutor-subsol' }, [
      el('span', {}, [t('ajutor.semnatura')]),
      el('span', {}, [t('ajutor.versiune') + ' · ' + t('ajutor.dataVersiune')])]));
    foaie.append(corp); ov.append(foaie); document.body.append(ov);
  }

  // ---------- conținutul panourilor de transformare ----------
  const AX: ('x' | 'y' | 'z')[] = ['x', 'y', 'z'];
  function numInput(val: number, step: number, on: (v: number) => void): HTMLInputElement {
    const inp = el('input', { type: 'number', step: String(step), value: String(+val.toFixed(2)) }) as HTMLInputElement;
    inp.addEventListener('change', () => { const v = parseFloat(inp.value); if (!isNaN(v)) on(v); });
    return inp;
  }
  function doT(kind: 'move' | 'rotate' | 'scale', axis: 'x' | 'y' | 'z' | undefined, value: number, mode: 'relative' | 'absolute', render: (p: HTMLElement) => void, pan: HTMLElement) {
    const sel = viewer.selected; if (!sel) return;
    pushUndo(); app.applyTransform?.(sel, { kind, axis, value, mode }); refresh(); renderProps(); markSel(); render(pan);
  }
  function hint(pan: HTMLElement, msg: string) { pan.innerHTML = ''; pan.append(el('div', { class: 'fttl' }, [msg])); }

  function renderMove(pan: HTMLElement) {
    const sel = viewer.selected; const tr = sel ? app.getTransform?.(sel) : null;
    if (!tr || tr.canMove === false) return hint(pan, t('panels.selecteazaMutabil'));
    pan.innerHTML = ''; pan.append(el('div', { class: 'fttl' }, [t('panels.muta')]));
    AX.forEach((ax, i) => pan.append(el('div', { class: 'frow' }, [el('label', {}, [ax.toUpperCase()]), numInput(tr.pos[i], 1, (v) => doT('move', ax, v, 'absolute', renderMove, pan))])));
    pan.append(el('button', { class: 'menu-item', onclick: () => { pushUndo(); app.align?.(sel!, 'centerXY'); refresh(); renderProps(); renderMove(pan); } }, [t('panels.centreazaPeLitera')]));
  }
  function renderRotate(pan: HTMLElement) {
    const sel = viewer.selected; const tr = sel ? app.getTransform?.(sel) : null;
    if (!tr || tr.canRotate === false) return hint(pan, t('panels.selecteazaObiect'));
    pan.innerHTML = '';
    // Panoul lucrează în GRADE DE ECRAN, ca inelul de gizmo. Convenția internă e inversă
    // (world Y e oglindit față de model), deci se neagă la citire și la scriere — altfel
    // panoul și gizmo-ul ar roti în sensuri opuse pentru aceeași valoare.
    const ec = (v: number) => -v;
    pan.append(el('div', { class: 'fttl' }, [t('panels.rotatieRelativ')]));
    for (const ax of AX) pan.append(el('div', { class: 'frow' }, [
      el('label', {}, [ax.toUpperCase()]), numInput(0, 5, (v) => doT('rotate', ax, ec(v), 'relative', renderRotate, pan)),
      el('button', { class: 'menu-item', onclick: () => doT('rotate', ax, ec(90), 'relative', renderRotate, pan) }, ['+90']),
      el('button', { class: 'menu-item', onclick: () => doT('rotate', ax, ec(-90), 'relative', renderRotate, pan) }, ['−90']),
    ]));
    pan.append(el('div', { class: 'fttl' }, [t('panels.rotatieAbsolut')]));
    AX.forEach((ax, i) => pan.append(el('div', { class: 'frow' }, [el('label', {}, [ax.toUpperCase()]),
      numInput(ec(tr.rot[i]), 5, (v) => doT('rotate', ax, ec(v), 'absolute', renderRotate, pan))])));
    pan.append(el('button', { class: 'menu-item', onclick: () => { pushUndo(); app.resetRot?.(sel!); refresh(); renderProps(); renderRotate(pan); } }, [t('panels.reseteazaRotatia')]));
  }
  function renderScale(pan: HTMLElement) {
    const sel = viewer.selected; const tr = sel ? app.getTransform?.(sel) : null;
    if (!tr || tr.canScale === false) return hint(pan, t('panels.selecteazaScalabil'));
    pan.innerHTML = '';
    const kp = el('input', { type: 'checkbox', ...(tr.keepProp ? { checked: '' } : {}) }) as HTMLInputElement;
    kp.addEventListener('change', () => { pushUndo(); app.onControl(sel === 'baza' ? 'bazaKeepProp' : 'keepProp', kp.checked, sel); refresh(); renderProps(); renderScale(pan); });
    pan.append(el('div', { class: 'frow' }, [el('label', {}, [t('panels.proportii')]), kp]));
    pan.append(el('div', { class: 'fttl' }, [t('panels.scara')]));
    if (tr.keepProp) pan.append(el('div', { class: 'frow' }, [el('label', {}, [t('panels.toate')]), numInput(tr.scale[0], 5, (v) => doT('scale', undefined, v, 'absolute', renderScale, pan))]));
    else AX.forEach((ax, i) => pan.append(el('div', { class: 'frow' }, [el('label', {}, [ax.toUpperCase()]), numInput(tr.scale[i], 5, (v) => doT('scale', ax, v, 'absolute', renderScale, pan))])));
  }
  function renderDepth(pan: HTMLElement) {
    const sel = viewer.selected; const tr = sel ? app.getTransform?.(sel) : null;
    if (!tr || tr.canMove === false) return hint(pan, t('panels.selecteazaObiect'));
    pan.innerHTML = ''; pan.append(el('div', { class: 'fttl' }, [t('panels.adancime')]));
    const isLetter = sel === 'litera';
    const ax: 'y' | 'z' = isLetter ? 'y' : 'z';
    const val = isLetter ? tr.pos[1] : tr.pos[2];
    pan.append(el('div', { class: 'frow' }, [el('label', {}, [isLetter ? t('panels.infigere') : 'Z']), numInput(val, 0.5, (v) => doT('move', ax, v, 'absolute', renderDepth, pan))]));
  }
  function renderAlign(pan: HTMLElement) {
    const sel = viewer.selected; const tr = sel ? app.getTransform?.(sel) : null;
    if (!tr) return hint(pan, t('panels.selecteazaObiect'));
    pan.innerHTML = ''; pan.append(el('div', { class: 'fttl' }, [t('panels.aliniaza')]));
    const aln = (how: any) => { pushUndo(); app.align?.(sel!, how); refresh(); renderProps(); renderAlign(pan); };
    pan.append(
      el('button', { class: 'menu-item', onclick: () => aln('centerXY') }, [t('panels.centreazaXY')]),
      el('button', { class: 'menu-item', onclick: () => aln('centerX') }, [t('panels.centreazaX')]),
      el('button', { class: 'menu-item', onclick: () => aln('centerY') }, [t('panels.centreazaY')]),
    );
    if (app.layFlat && sel && sel.startsWith('tem')) pan.append(el('button', { class: 'menu-item', onclick: () => { pushUndo(); app.layFlat?.(sel!); refresh(); renderProps(); renderAlign(pan); } }, [t('panels.asazaPeFataPlata')]));
  }

  // ---------- viewport events ----------
  viewer.onSelect = (id) => { app.onSelect?.(id); aplicaLimitariGizmo(id); renderProps(); markSel(); renderInfo(); };
  viewer.onDragEnd = (id, dx, dy, dz) => {
    pushUndo(); app.onMove(id, dx, dy, dz); refresh(); renderProps(); markSel();
    if (autoMove && floatingOpen === movPan) { closeFloating(); autoMove = false; }
    else if (movPan && floatingOpen === movPan) renderMove(movPan);
  };
  // Panoul de mutare se deschide când apuci gizmo-ul și arată poziția live (ca la rotație).
  let autoMove = false; let movPrePos: number[] = [0, 0, 0];
  viewer.getPeers = (id) => app.getTransform?.(id)?.movesWith ?? [];
  viewer.onClampMove = (id, dx, dy) => app.clampMove?.(id, dx, dy) ?? { dx, dy };
  viewer.onMoveStart = (id) => {
    const tr = app.getTransform?.(id); if (!tr) return; movPrePos = tr.pos.slice();
    if (movPan && movBtn && floatingOpen !== movPan) { autoMove = true; openFloatingProg(movPan, movBtn, renderMove); } else autoMove = false;
  };
  // ---------- MENIU CONTEXTUAL (click-dreapta fără tragere) ----------
  // Nu dublează nicio comandă: cele generice trec prin aceleași metode ca bara de sus, iar
  // cele specifice se CITESC din butoanele pe care aplicația le declară singură în panels().
  // Așa meniul e corect în toate cele opt aplicații fără ca nucleul să știe ce e o literă,
  // și rămâne corect când o aplicație își schimbă butoanele.
  const meniuCtx = el('div', { class: 'ctx-menu' });
  viewEl.append(meniuCtx);
  const inchideMeniuCtx = () => meniuCtx.classList.remove('open');
  viewer.onContext = (id, x, y) => {
    closeFloating();
    if (id) selectObject(id);
    meniuCtx.textContent = '';
    const item = (eticheta: string, fn: () => void) => meniuCtx.append(
      el('button', { class: 'menu-item', onclick: () => { inchideMeniuCtx(); fn(); } }, [eticheta]));
    const dupa = () => { refresh(); renderProps(); markSel(); renderInfo(); };
    if (id) {
      const tr = app.getTransform?.(id);
      const nume = app.objectInfo?.(id)?.nume ?? '';
      if (nume) meniuCtx.append(el('div', { class: 'ctx-cap' }, [nume]));
      if (app.align && tr?.canMove !== false)
        item(t('panels.centreazaPeLitera'), () => { pushUndo(); app.align?.(id, 'centerXY'); dupa(); });
      if (app.layFlat && tr?.canRotate !== false)
        item(t('panels.asazaPeFataPlata'), () => { pushUndo(); app.layFlat?.(id); dupa(); });
      if (app.resetRot && tr?.canRotate !== false)
        item(t('panels.reseteazaRotatia'), () => { pushUndo(); app.resetRot?.(id); dupa(); });
      const proprii = app.panels(id).flatMap((g) => g.controls).filter((c) => c.kind === 'button');
      if (proprii.length) {
        meniuCtx.append(el('div', { class: 'ctx-sep' }));
        for (const b of proprii) item(b.label, () => { pushUndo(); app.onControl(b.key, null, id); dupa(); });
      }
    } else {
      item(t('views.incadreaza'), () => viewer.frame());
    }
    // deschide întâi (ca să aibă dimensiuni), apoi ține-l în interiorul viewportului
    meniuCtx.classList.add('open');
    const r = viewEl.getBoundingClientRect();
    meniuCtx.style.left = `${Math.max(4, Math.min(x - r.left, r.width - meniuCtx.offsetWidth - 4))}px`;
    meniuCtx.style.top = `${Math.max(4, Math.min(y - r.top, r.height - meniuCtx.offsetHeight - 4))}px`;
  };
  // capture: se închide înaintea oricărui alt gest; clicul PE meniu nu se închide singur
  window.addEventListener('pointerdown', (e) => {
    if (!meniuCtx.contains(e.target as Node)) inchideMeniuCtx();
  }, true);
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') inchideMeniuCtx(); });

  viewer.onMoveLive = (id, dx, dy, dz = 0) => {
    if (!movPan || floatingOpen !== movPan) return;
    const tr = app.getTransform?.(id); const horiz = !!tr?.moveOnGround;
    const rows = movPan.querySelectorAll('.frow');
    const set = (i: number, v: number) => { const inp = rows[i]?.querySelector('input') as HTMLInputElement | undefined; if (inp) inp.value = String(+v.toFixed(2)); };
    // (dx, dy) = axele din plan, dz = perpendiculara -> pe bază: X,Z,Y ; pe față: X,Y,Z
    set(0, movPrePos[0] + dx);
    if (horiz) { set(2, movPrePos[2] + dy); set(1, movPrePos[1] + dz); }
    else { set(1, movPrePos[1] + dy); set(2, movPrePos[2] + dz); }
  };
  // Panoul de rotație se deschide când apuci un inel; arată unghiul absolut live pe axa apucată.
  let autoRotate = false; let rotPreRot: number[] = [0, 0, 0];
  viewer.onRotateStart = (id, axis) => {
    const tr = app.getTransform?.(id); if (!tr) return; rotPreRot = tr.rot.slice();
    if (rotPan && rotBtn && floatingOpen !== rotPan) { autoRotate = true; openFloatingProg(rotPan, rotBtn, renderRotate); } else autoRotate = false;
  };
  viewer.onRotateLive = (id, deltaDeg, axis) => {
    if (!rotPan || floatingOpen !== rotPan) return;
    const idx = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
    const abs = normDeg(rotPreRot[idx] - deltaDeg);           // onRotate face rot -= Δworld
    const rows = rotPan.querySelectorAll('.frow');            // 0-2 relativ, 3-5 absolut
    const inp = rows[3 + idx]?.querySelector('input') as HTMLInputElement | undefined;
    if (inp) inp.value = String(abs);
  };
  viewer.onRotateEnd = (id, deg, axis) => {
    pushUndo(); app.onRotate?.(id, deg, axis); refresh(); renderProps(); markSel();
    if (autoRotate && floatingOpen === rotPan) { closeFloating(); autoRotate = false; }
    else if (rotPan && floatingOpen === rotPan) renderRotate(rotPan);
  };
  viewer.onScaleEnd = (id, f) => { pushUndo(); app.onScale?.(id, f); refresh(); renderProps(); markSel(); };
  viewer.onDepthEnd = (id, dz) => { pushUndo(); app.onDepth?.(id, dz); refresh(); renderProps(); markSel(); };

  // ---------- export ----------
  exportBtn.addEventListener('click', async () => {
    try {
      asiguraCompleta();   // exportul pleaca doar de la geometria completa, nu de la previzualizare
      const bodies = app.exportBodies();
      const ps = viewer.plateSize;
      // AȘEZARE PE PLACĂ: tot în interior, margine 5 mm, 3 mm între piese; ce nu încape -> placă nouă
      const lay = layoutOnPlates(bodies, ps.w, ps.d, 5, 3);
      if (lay.preaMari.length) {
        throw new Error(t('export.preaMare', { w: ps.w, d: ps.d,
          piese: lay.preaMari.map((p) => t('export.preaMareDim', { nume: p.name, w: p.w, d: p.d })).join(', ') }));
      }
      const nume = app.exportName();
      const multi = lay.placi.length > 1;
      let total = 0;
      for (let i = 0; i < lay.placi.length; i++) {
        const v = verificaInPlaca(lay.placi[i], ps.w, ps.d);   // verificare prin coordonate
        if (!v.ok) throw new Error(t('export.iesDinPlaca', { piese: v.iesite.join(', ') }));
        total += await download3MF(lay.placi[i], `${nume}${multi ? `-placa${i + 1}` : ''}.3mf`);
      }
      /**
       * A.4 — RANDUL DE MARCAJ IN FISA DE PRODUCTIE.
       *
       * Se adauga AICI, nu in `exportNotes()` al fiecarui generator: altfel fiecare generator
       * nou ar trebui sa-si aminteasca sa-l scrie, iar unul care uita ar livra o fisa care tace
       * despre marcaj. Textul iese din aceeasi stare de licenta ca randul din bara de jos.
       */
      const note = app.exportNotes?.() ?? [];
      if (app.poartaMarcaj) note.push(randFisaMarcaj(stareLicenta()));
      descarcaFisa(nume, lay.placi, ps, note);
      const culori = new Set(bodies.map((b: any) => String(b.culoare ?? '').toUpperCase())).size;
      flashExport(true, t('export.reusit', { kb: (total / 1024).toFixed(1), n: bodies.length,
        placi: multi ? t('export.sufixPlaci', { n: lay.placi.length }) : '' })
        + t('export.sufixCulori', { n: culori }) + (culori > 4 ? ' ⚠' : ''));
    } catch (e: any) {
      // Toast-ul arată doar mesajul, iar erorile venite din WASM („table index is out of bounds")
      // n-au niciun context în el: nu se știe dacă a picat așezarea pe placă, un `getMesh()` sau
      // scrierea 3MF. Fără stivă nu se poate diagnostica după fapt, deci se scrie în consolă.
      console.error('[export 3MF] esec:', e);   // mesaj de consola, nu text de interfata
      flashExport(false, '⚠ ' + (e?.message ?? e));
    }
  });
  /** rândul „Marcaj: …" din fișa de producție (A.4), din starea curentă a licenței */
  function randFisaMarcaj(st: ReturnType<typeof stareLicenta>): string {
    // detaliul vine de la generator: „(vizibilă)" / „(discretă)". Nucleul nu-l poate ști.
    const detaliu = app.detaliuMarcaj?.() ?? '';
    if (!areDreptComercial(st)) return t('marcaj.fisaSemnatura') + (detaliu ? ` (${detaliu})` : '');
    // cu drept comercial: „fara" sau „logo propriu". Logo-ul incarcat nu trece inca prin shell
    // (interfata de incarcare vine in VIS.1), deci deocamdata singura varianta e „fara".
    const id = st.fel === 'valida' && 'licenta' in st ? st.licenta.id
      : st.fel === 'valida' ? `CF${st.serie}` : '';
    return t('marcaj.fisaFara', { id });
  }

  /** fișa de producție (.txt lângă 3MF): ce obiect, ce culoare, ce orientare, ce se lipește unde */
  function descarcaFisa(nume: string, placi: any[][], ps: { w: number; d: number }, note: string[]) {
    const toate = placi.flat();
    const L: string[] = [];
    const linie = () => L.push(t('sheet.linie'));
    const sub = () => L.push(t('sheet.subLinie'));
    const gol = () => L.push('');

    linie();
    L.push('  ' + nume);
    L.push('  ' + t('sheet.titlu') + '  ·  ' + t('sheet.generatDe'));
    // REGIMUL DE LICENTA, pe hartia care pleaca odata cu comanda. Aici are tokenul valoare
    // comerciala reala: atelierul poate arata unui client ca productia e licentiata. Fara
    // licenta scrie limpede ca e uz personal — nu ascundem, ca sa nu para ca am ascuns.
    const stL = stareLicenta();
    L.push('  ' + (esteCodFix(stL) ? t('licenta.fisaFixa')
      : stL.fel === 'valida'
        ? t('licenta.fisaComerciala', { id: stL.licenta.id, nume: stL.licenta.nume, data: stL.licenta.expira })
        : t('licenta.fisaPersonal')));
    linie(); gol();

    // ---- 1. conținut ----
    L.push(t('sheet.sec1')); sub();
    L.push('  ' + t('sheet.antet', { w: ps.w, d: ps.d, corpuri: toate.length, n: placi.length,
      placa: placi.length === 1 ? t('sheet.placa') : t('sheet.placi') }));
    gol();
    const lat = Math.max(...toate.map((b: any) => b.name.length), 16) + 2;
    L.push(t('sheet.capTabel', { spatiu: ' '.repeat(Math.max(1, lat - 6)) }));
    let nr = 0;
    placi.forEach((placa, pi) => {
      if (placi.length > 1) { gol(); L.push('  ' + t('sheet.placaN', { n: pi + 1 })); }
      for (const b of placa) {
        const hex = b.culoare ? String(b.culoare).toUpperCase() : t('sheet.faraCuloare');
        L.push(t('sheet.rand', { nr: String(++nr).padStart(2),
          nume: String(b.name).padEnd(lat),
          orientare: (b.orientare ?? t('sheet.orientareImplicita')).padEnd(26), culoare: hex }));
      }
      for (const g of [...new Set(placa.filter((b: any) => b.grup).map((b: any) => b.grup))]) {
        const m = placa.filter((b: any) => b.grup === g);
        if (m.length > 1) L.push(t('sheet.grupMulticolor', { piese: m.map((b: any) => b.name).join(' + ') }));
      }
    });
    gol();

    // ---- 2. culorile, pasul pe care slicerul NU îl face singur ----
    L.push(t('sheet.sec2')); sub();
    for (const k of ['culoriIntro', 'culoriPunct1', 'culoriPunct2', 'culoriPunct3']) L.push('  ' + t('sheet.' + k));
    gol();
    for (const k of ['culoriBambu', 'culoriBambu2', 'culoriPrusa', 'culoriCura']) L.push('  ' + t('sheet.' + k));
    gol();
    for (const k of ['culoriVerif', 'culoriVerif2']) L.push('  ' + t('sheet.' + k));
    const culori = new Set(toate.map((b: any) => String(b.culoare ?? '').toUpperCase()));
    if (culori.size > 4) { gol(); L.push('  ' + t('sheet.preaMulteCulori', { n: culori.size })); L.push(t('sheet.preaMulteCulori2')); }
    gol();

    // ---- 3. tipărire ----
    L.push(t('sheet.sec3')); sub();
    for (const k of ['print1', 'print2', 'print3', 'print4']) L.push('  ' + t('sheet.' + k));
    gol();

    // ---- 4. montaj: pașii calculați din model + regulile generale ----
    L.push(t('sheet.sec4')); sub();
    for (const n of note) L.push('  ' + n.replace(/^\s+/, ''));
    if (note.length) gol();
    for (const k of ['montaj0', 'montajProba', 'montajLipici', 'montajLipici2']) L.push('  ' + t('sheet.' + k));
    gol();

    // ---- 5. verificare finală ----
    L.push(t('sheet.sec5')); sub();
    for (const k of ['verif1', 'verif2', 'verif3', 'verif4']) L.push('  [ ] ' + t('sheet.' + k));
    gol(); linie();

    const blob = new Blob([L.join('\n') + '\n'], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${nume}.txt`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
  function flashExport(ok: boolean, msg: string) {
    // succes: 4 steluțe se ridică și dispar o singură dată (fără buclă). Blocat: fără animație.
    if (ok && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      ['12%', '38%', '62%', '86%'].forEach((left, i) => {
        const s = el('span', { class: 'exp-spark', style: `left:${left};animation-delay:${i * 0.05}s` }, ['✦']);
        exportWrap.append(s); setTimeout(() => s.remove(), 950);
      });
    }
    let toast = document.querySelector('.export-toast') as HTMLElement;
    if (!toast) { toast = el('div', { class: 'export-toast' }); document.body.append(toast); }
    toast.textContent = msg; toast.className = 'export-toast show' + (ok ? '' : ' err');
    setTimeout(() => { toast.className = 'export-toast'; }, ok ? 2800 : 5000);
  }

  // ---------- plate view ----------
  let plateIds: string[] = [];
  plateBtn.addEventListener('click', () => {
    plateView = !plateView;
    plateBtn.classList.toggle('on', plateView);
    if (plateView) { asiguraCompleta(); viewer.clearObjects(); const bodies = app.exportBodies(); plateIds = bodies.map((b, i) => 'plate_' + i); bodies.forEach((b, i) => viewer.setObject(plateIds[i], manifoldToGeometry(b.manifold), i % 2 ? '#c9b28a' : '#8fb7e8', false)); viewer.frame(); }
    else { viewer.clearObjects(); lastIds = new Set(); framed = false; refresh(); }
  });

  // ---------- undo / redo ----------
  const doUndo = () => { if (app.restore && undoStack.length) { if (app.snapshot) redoStack.push(app.snapshot()); app.restore(undoStack.pop()); afterHistory(); } };
  const doRedo = () => { if (app.restore && redoStack.length) { if (app.snapshot) undoStack.push(app.snapshot()); app.restore(redoStack.pop()); afterHistory(); } };
  function afterHistory() { if (plateView) { plateView = false; plateBtn.classList.remove('on'); viewer.clearObjects(); lastIds = new Set(); } framed = false; refresh(); renderProps(); }
  undoBtn.addEventListener('click', doUndo); redoBtn.addEventListener('click', doRedo);
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); doUndo(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); doRedo(); }
  });

  // LICENȚIEREA — la fiecare deschidere, în orice aplicație. Vezi ui/licenta.ts pentru
  // motivul pentru care acceptul NU se ține minte.
  arataLicenta();
  /**
   * Bannerul de licenta: nemodal, se inchide singur, nu opreste nimic.
   *
   * Omul tocmai a apasat un link dintr-un email si vrea sa ajunga in aplicatie, nu sa confirme
   * o casuta. De asta e banner si nu dialog: spune ce s-a intamplat si dispare.
   */
  function bannerLicenta(text: string, fel: 'ok' | 'err', cuCumparare = false) {
    const b = el('div', { class: `lic-banner ${fel}` }, [
      el('span', {}, [text]),
      // la esec, omul are nevoie de doua drumuri: sa-si recupereze codul (scris in text) sau
      // sa cumpere unul. Linkul e aici ca sa nu trebuiasca sa caute pagina magazinului.
      ...(cuCumparare ? [el('a', { class: 'lic-banner-lk', href: linkCheckout('licenta', limba()),
        target: '_blank', rel: 'noopener noreferrer' }, [t('licenta.bannerCumpara')])] : []),
      el('button', { class: 'lic-banner-x', title: t('licenta.bannerInchide'),
        onclick: () => b.remove() }, ['✕']),
    ]);
    document.body.append(b);
    if (fel === 'ok') setTimeout(() => b.remove(), 6000);
  }

  // LICENTA DIN ADRESA, inaintea celei salvate: linkul din emailul de cumparare poate duce pe
  // orice pagina a platformei, deci verificarea sta in pornirea comuna, nu intr-o aplicatie.
  instaleazaDinAdresa().then(async (rez) => {
    if (rez.fel === 'nimic') await incarcaLicenta();
    else if (rez.fel === 'activata') bannerLicenta(t('licenta.bannerActivata'), 'ok');
    else if (rez.fel === 'pastrata') bannerLicenta(t('licenta.bannerPastrata'), 'ok');
    else { await incarcaLicenta(); bannerLicenta(t('licenta.bannerInvalida'), 'err', true); }
    actualizeazaEtichetaLicenta();
  });

  // pornire — izometric perspectivă, încadrează conținutul + placa
  setMode('move');
  performance.mark('app:prim-build-start');
  refresh(); renderProps(); framed = true; viewer.setView('izo');
  performance.mark('app:gata');
  performance.measure('pornire: prima reconstructie', 'app:prim-build-start', 'app:gata');
  // fara marcaj de start, masurarea pleaca de la navigare
  performance.measure('pornire: TOTAL de la navigare', { end: 'app:gata' });
  (window as any).__viewer = viewer;
  // `contorArena` = cate obiecte WASM a creat aplicatia in afara oricarei arene. Expus aici,
  // nu importat separat: sub Vite un import dinamic nimereste ALTA instanta a modulului, cu
  // propriul contor pe zero — o capcana in care se cade usor cand masori din consola.
  (window as any).__shell = { openLibrary, selectObject, contorArena: contorInAfaraArenei };
}
