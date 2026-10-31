/**
 * UNEALTĂ DE CAPTURĂ A RANDĂRILOR pentru landing — se rulează ÎN BROWSERUL TĂU real.
 *
 * DE CE MANUAL, NU AUTOMAT. Randarea WebGL are nevoie de un browser care compune cadre pe
 * ecran. Mediul de dezvoltare automat nu face asta: framebuffer-ul iese incomplet, iar captura
 * e o mâzgăleală. În Chrome/Edge deschis normal, cadrul e complet și captura e curată.
 *
 * PROTOCOLUL, identic pentru toate — de aici vine consistența grilei:
 *   · vedere IZOMETRICĂ fixă (setView('izo'))
 *   · încadrare automată identică (frame())
 *   · lumină + tone mapping = cele din aplicație (IBL, NeutralToneMapping)
 *   · ieșire 600×450, fundal #f1eefb, model centrat „cover", PNG (ca restul din /produse/)
 *
 * CUM SE FOLOSEȘTE:
 *   1. Deschide fiecare aplicație în Chrome/Edge (nu în panoul de dezvoltare), acceptă licența,
 *      lasă modelul implicit sau configurează-l cum vrei să apară pe card.
 *   2. Deschide consola (F12) și lipește:
 *          import('/landing/_captura-randari.js').then(m => m.captura())
 *   3. Se descarcă `<slug>.png`. Mută-l în public/produse/, peste plasatorul temporar.
 *   4. Repetă pentru fiecare aplicație. Pentru cele două noi: deschide placute.html și
 *      articulat.html și rulează comanda de la pasul 2 — ies `placute.png` si `articulat.png`.
 *      Pentru hero: rulează `m.captura({ nume:'hero', w:640, h:560 })` din Litere Decor.
 *
 * Numele fișierului se ia din titlul aplicației -> slug, deci se potrivește cu ce așteaptă
 * șabloanele (vezi aplicatiiLista din content/site.*.json).
 */

const SLUG = {
  'litere-generator': 'litere-decor', litere: 'litere-decor',
  nume: 'nume-3d', brelocuri: 'brelocuri', fagure: 'litere-fagure',
  cutii: 'cutii-litere', cuvinte: 'cuvinte-decor', led: 'litere-led',
  articulat: 'articulat', placute: 'placute',
};

export async function captura(opt = {}) {
  const V = window.__viewer || window.__magic3d?.viewer;
  const A = window.__magic3d?.app;
  if (!V) { console.error('[captura] viewer indisponibil — ești pe o pagină de aplicație?'); return; }

  const W = opt.w ?? 600, H = opt.h ?? 450;
  // numele = slug-ul aplicatiei, ca fisierul sa cada direct in public/produse/<slug>.png
  const nume = opt.nume ?? SLUG[A?.title] ?? 'captura';
  const fmt = opt.fmt ?? 'png';                 // png pentru cardurile din /produse/

  // PROTOCOL: aceeași vedere + aceeași încadrare pentru toate
  V.setView('izo');
  V.frame?.();
  // două cadre, ca orbit-damping + framing să se așeze înainte de captură
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  V.render?.();
  await new Promise((r) => requestAnimationFrame(r));

  const src = document.querySelector('.viewport canvas') || document.querySelector('canvas');
  const off = document.createElement('canvas');
  off.width = W; off.height = H;
  const g = off.getContext('2d');
  g.fillStyle = '#f1eefb'; g.fillRect(0, 0, W, H);
  const s = Math.max(W / src.width, H / src.height);
  const dw = src.width * s, dh = src.height * s;
  g.drawImage(src, (W - dw) / 2, (H - dh) / 2, dw, dh);

  const url = fmt === 'webp' ? off.toDataURL('image/webp', 0.9) : off.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url; a.download = `${nume}.${fmt}`;
  document.body.appendChild(a); a.click(); a.remove();
  console.log(`[captura] descărcat ${nume}.${fmt} (${W}×${H}, ${Math.round(url.length / 1024)} KB) — muta in public/produse/`);
}
