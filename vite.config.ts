import { defineConfig, type Plugin } from 'vite';
import { resolve } from 'node:path';
import { scanAll } from './src/core/assets/scan.js';

/**
 * Plugin DOAR de dezvoltare: rescanează bibliotecile (tematici + baze) pe server.
 * - POST /__rescan  -> rulează scanarea și întoarce statisticile + manifestele noi
 * - la pornirea serverului de dev, o rescanare automată (modelele puse între sesiuni apar singure)
 * Miniaturile se regenerează doar pentru fișiere noi/modificate (vezi scan.ts, comparare mtime).
 */
function rescanPlugin(): Plugin {
  let running: Promise<any> | null = null;
  const run = () => (running ??= scanAll(true).finally(() => { running = null; }));
  return {
    name: 'magic3d-rescan',
    apply: 'serve',
    async configureServer(server) {
      // rescanare la pornire (nu blochează pornirea serverului)
      run().then((s) => server.config.logger.info(
        `  ➜  biblioteci rescanate: tematici ${s.tematici.total} (miniaturi noi ${s.tematici.thumbsNoi}) · baze ${s.baze.total} (miniaturi noi ${s.baze.thumbsNoi})`,
      )).catch((e) => server.config.logger.error(`  ➜  rescanare eșuată: ${e?.message ?? e}`));

      server.middlewares.use('/__rescan', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('POST only'); return; }
        try {
          const stats = await run();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, stats }));
        } catch (e: any) {
          res.statusCode = 500; res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: false, error: e?.message ?? String(e) }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [rescanPlugin()],
  // manifold-3d e un modul Emscripten; nu-l pre-bundla (păstrează încărcarea WASM)
  optimizeDeps: { exclude: ['manifold-3d'] },
  build: {
    rollupOptions: {
      /**
       * TOATE paginile, nu doar index.html.
       *
       * Vite construiește implicit o SINGURĂ pagină de intrare. Fără lista asta, `npm run build`
       * scotea un `dist/` cu index.html și atât: pagina de start și celelalte șapte aplicații
       * lipseau complet. Urcat pe domeniu, ar fi mers doar Litere Decor, iar restul ar fi dat
       * 404 — inclusiv landing-ul, adică fix pagina pe care aterizează lumea.
       *
       * O aplicație nouă TREBUIE adăugată aici. Testul de izolare verifică deja că fiecare
       * aplicație are exact o pagină; dacă adaugi una și uiți linia de mai jos, se vede la
       * prima încărcare a buildului, nu la primul client.
       */
      input: {
        litere: resolve(__dirname, 'litere.html'),
        brelocuri: resolve(__dirname, 'brelocuri.html'),
        brelocDecor: resolve(__dirname, 'breloc-decor.html'),
        cutii: resolve(__dirname, 'cutii.html'),
        cuvinte: resolve(__dirname, 'cuvinte.html'),
        fagure: resolve(__dirname, 'fagure.html'),
        led: resolve(__dirname, 'led.html'),
        numeled: resolve(__dirname, 'nume-led.html'),
        nume: resolve(__dirname, 'nume.html'),
        rame: resolve(__dirname, 'rame.html'),
        placute: resolve(__dirname, 'placute.html'),
        articulat: resolve(__dirname, 'articulat.html'),
        huse: resolve(__dirname, 'huse.html'),
        demo: resolve(__dirname, 'demo.html'),
        // landing generat din content/ + scripts/sabloane.mjs (vezi scripts/genereaza-pagini.mjs)
        landing: resolve(__dirname, 'index.html'),
        academia: resolve(__dirname, 'academia/index.html'),
        academiaCap1: resolve(__dirname, 'academia/primul-print-care-iese-prost/index.html'),
        academiaCap2: resolve(__dirname, 'academia/ce-filament-alegi/index.html'),
        academyEn: resolve(__dirname, 'en/academy/index.html'),
        academyEnCap1: resolve(__dirname, 'en/academy/why-3d-prints-fail/index.html'),
        academyEnCap2: resolve(__dirname, 'en/academy/which-filament-to-choose/index.html'),
        contact: resolve(__dirname, 'contact/index.html'),
        contactEn: resolve(__dirname, 'en/contact/index.html'),
        landingEn: resolve(__dirname, 'en/index.html'),
        // pagina statică de licențe & tokeni (scrisă de mână, RO + EN)
        token: resolve(__dirname, 'token.html'),
        tokenEn: resolve(__dirname, 'en/token.html'),
      },
    },
  },
  server: {
    port: 3005,
    // obligatoriu: dacă 3005 e ocupat, Vite crapă cu eroare în loc să sară
    // pe alt port — ca să știm mereu exact unde rulează.
    strictPort: true,
    // expune serverul în rețeaua locală (deschidere de pe telefon / alt PC din atelier)
    host: true,
    watch: {
      /*
       * `content/` NU se urmărește.
       *
       * Serverul de dezvoltare a murit de două ori la rând cu EBUSY — o dată pe un .md din
       * content/academia/, o dată pe un .php din content/contact/ — de fiecare dată în clipa în
       * care un alt program ținea fișierul deschis. Pe Windows asta se întâmplă des: un editor,
       * o sincronizare, un script care scrie. Watcher-ul lui Vite nu tratează eroarea, o aruncă
       * mai departe, și procesul cade cu totul.
       *
       * Iar folderul ăsta nu are ce căuta acolo: nimic din `content/` nu e importat de
       * aplicație. E INTRAREA generatorului de pagini, citită o dată, la `npm run genereaza`.
       * Ce produce el — index.html, academia/, en/ — stă în rădăcină și rămâne urmărit, deci
       * reîncărcarea la modificarea unei pagini funcționează ca înainte.
       */
      ignored: ['**/content/**'],
    },
  },
});
