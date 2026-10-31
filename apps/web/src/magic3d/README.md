# Magic3D — generatoare parametrice

Codul geometric al generatoarelor Magic3D, adus din depozitul vechi (privat) fără istoric și fără
licențiere. Licență: AGPL-3.0-only, ca restul proiectului.

**Încă nu e legat de editor.** Portarea în biblioteca de forme vine după PASUL 3.

- `apps/<generator>/` — câte o funcție de construcție per produs (12 generatoare)
- `core/geometry/` — font → solid, punți, agățare, LED, tipare, trăsături subțiri
- `core/i18n/` — textele generatoarelor (ro, en); se mută în sistemul i18n layerling la portare
- `date/simboluri/` — contururile simbolurilor pentru Cuvinte Decor (date proprii)
- `scripts/download-fonts.mjs`, `fonts-list.json` — lista celor 440 de fonturi Google
  (OFL/Apache); binarele nu sunt incluse, se aduc odată cu fișierele lor de licență

Regulile de lucru din `CLAUDE.md`-ul vechi se aplică aici: obiectele manifold sunt handle-uri WASM
(`core/geometry/arena.ts`), pragurile din nucleu sunt parametri, nu constante.
