# Magic3D — rezumat de platformă

Document de context, de lipit într-o discuție nouă. Scopul lui: cine îl citește să înțeleagă
**ce este** platforma asta și, mai ales, **cu ce nu seamănă**. Nu e un site web cu un
configurator; e o aplicație de CAD parametric care se întâmplă să ruleze în browser.

Stare la 2026-08-04.

---

## 1. Ce este, în două fraze

Un **generator parametric de obiecte 3D printabile**, construit ca un nucleu reutilizabil
(`core/`) peste care stau aplicații complet izolate (`apps/`), câte una per produs.
Utilizatorul-țintă e un **atelier de printare**: rezultatul nu e o poză, ci un fișier 3MF
multicolor, orientat pentru placă, însoțit de o fișă de producție.

Numele comercial: **Magic3D powered by Firg3D**, versiunea 1.0.

## 2. Stiva

| Ce | De ce |
|---|---|
| **Vite + TypeScript**, fără framework UI | DOM direct. Nu există React/Vue/Svelte în tot proiectul. |
| **manifold-3d** (WASM) | Motorul de geometrie: CSG exact pe solide, cu garanții de manifold. Inima aplicației. |
| **three.js** | Doar viewport: randare, gizmo, orbit. Nu face geometrie. |
| **opentype.js** | Conturul glifelor din fonturi reale (39 fonturi locale). |
| **earcut**, **polygon-clipping** | Triangulare și operații 2D pe contururi. |
| **JSZip** | Împachetarea 3MF (care e un ZIP cu XML). |

Fără backend, fără bază de date, fără conturi, fără CMS. Buildul e static.
Singura componentă „de server" e un plugin de dev care rescanează bibliotecile locale de pe
disc și scrie un manifest JSON.

## 3. Arhitectura — regula centrală

Totul se învârte în jurul unui contract, `src/core/app.ts` → `AppDefinition`.
Nucleul (viewport, UI, geometrie, assets) **nu știe ce e o literă**. Primește totul prin
contract: panouri declarative, obiecte de scenă, corpuri de export, transformări.

```
apps/*  ──importă──>  core/*        NICIODATĂ invers
apps/A  ──╳──────>  apps/B          niciodată deloc
```

Metodele contractului acoperă: `panels()`, `rebuild()`, `onControl()`, `onMove/onRotate/
onScale/onDepth`, `exportBodies()`, `getTransform()`, `clampMove()`, preseturi, biblioteci,
undo. Ce e opțional în contract e opțional și în UI — nucleul ascunde ce aplicația nu declară.

**Regulile sunt impuse de un test, nu de convenție** (`src/_tests/isolation.test.ts`):
una singură pagină `.html` per aplicație, `core/` nu importă din `apps/`, `apps/A` nu importă
din `apps/B`. O eroare într-o aplicație nu poate ajunge în alta — sunt pagini separate.

## 4. Produsele

Șapte aplicații peste același nucleu, fiecare cu pagina ei:
**Litere Decor** (`litere`, cea mai matură), **Brelocuri**, **Litere Fagure**, **Cutii Litere**,
**Litere LED**, **Nume 3D**, **Cuvinte Decor**. Plus `demo`.

Intenția pe termen lung: împachetate ca **o singură aplicație de Windows** cu un comutator de
produse lângă logo, nu șapte instalări.

## 5. Modelul geometric — ce trebuie știut ca să nu strici nimic

- Geometria se construiește ca **CSG pe solide**, nu ca mesh editat. Litera e un solid;
  scrisul e un solid; buzunarul e diferența dintre ele.
- **Convenția de afișare**: `manifoldToGeometry` inversează Y (fonturile vin cu Y în jos).
  Exportul aplică `mirror([0,1,0])`. Cine uită asta obține piese oglindite.
- **Buzunarele** (locașurile de inlay) sunt negativul piesei: fund **plat**, la fața inferioară
  a piesei, iar scula străpunge tot materialul de deasupra. Variantele „cu adâncime locală"
  arată bine pe hărți de cote și produc piese care nu intră — s-a încercat, a picat testul.
- **Soclul în trepte** (`socketVertical`): fiecare strat ia silueta materialului aflat la sau
  sub nivelul lui, deci silueta e monotonă spre suprafață și piesa chiar poate fi introdusă.
- **Invariantele diferă pe aplicație**: la litere și brelocuri contează *genusul neschimbat*;
  la aplicațiile cu pattern (fagure, cutii) contează *numărul de componente conexe*.

## 6. Memoria WASM — capcana cea mai scumpă

Obiectele `Manifold`/`CrossSection` sunt **handle-uri embind**: memoria lor stă în heap-ul
WASM și se eliberează **doar** prin `.delete()`. Garbage collectorul JS nu o atinge.

`src/core/geometry/arena.ts` interceptează o singură dată metodele **și constructorii** și
eliberează automat intermediarele la ieșirea din `build()`. De reținut dacă atingi codul:

- la embind, `Manifold.prototype` e **gol**; prototipul real e al unei instanțe;
- constructorii (`new Manifold(mesh)`) trebuie interceptați separat de metode;
- rezultatul precedent se eliberează la reconstrucția *următoare*, nu mai devreme — exportul
  lucrează pe ultimul build;
- o construcție eșuată nu are voie să lase nimic în urmă.

Fără asta: ~12 MB scurși pe reconstrucție și `memory access out of bounds` la reconstrucția
113. Simptomul vizibil nu era „crapă", ci „modelul nu se actualizează".

## 7. Testarea — partea care chiar face diferența

**4 700 de linii de teste la ~14 000 de linii de sursă.** Nu sunt teste de snapshot; sunt
**aserțiuni pe invariante fizice și de fabricabilitate**, rulate pe tot alfabetul × mai multe
fonturi. Ce verifică, concret:

- piesa de inlay **intră** în locaș (coliziune 0 mm³), inclusiv înclinată;
- buzunarul **nu creează goluri închise** (genus neschimbat) și chiar **sparge suprafața**;
- litera **stă singură în picioare** (aria feliei de sprijin peste prag);
- pereții rămân peste grosimea minimă; trăsăturile subțiri sunt detectate și raportate;
- procentul de **contact 3D** dintre piese;
- memoria nu se scurge între reconstrucții;
- izolația între aplicații și regulile de i18n.

14 suite, rulate cu `npm test`. Regula de lucru: **suita se citește integral înainte de
commit**, nu se filtrează prin `grep` — s-a comis de două ori cu suita roșie fiindcă ieșirea
era filtrată.

## 8. Limbă

Româna e limba primară. **Tot** textul vizibil trece prin dicționarul `src/core/i18n/ro.json`
(`t('cheie')`); nimic hardcodat în componente. Un test interzice diacriticele românești în
literalii `.ts`. EN e planificat, cu comutator lângă setări.

## 9. Ce produce, de fapt

- **3MF multicolor**, cu culoare per corp; corpurile care formează o singură piesă fizică sunt
  marcate cu `grup` ca să nu fie despărțite la aranjarea pe placă;
- compatibil cu **Bambu Studio** (extruder în `model_settings.config` → `filament_colour` în
  `project_settings.config`);
- **fișă de producție** `.txt` alături: ce se lipește unde, cu ce jocuri, la ce adâncimi
  efective (nu cele cerute — cele limitate de regulile de rezistență);
- verificare de încadrare pe placa aleasă, cu orientarea fiecărei piese.

Biblioteci locale pe disc, scanate cu miniaturi generate: **44 de tematici**, **22 de baze**,
39 de fonturi. Se pot adăuga fișiere proprii; nu există „catalog în cloud".

## 10. Unelte de atelier din UI

Riglă cu snap pe vertex (ca în Bambu Studio), gizmo cu limitare pe axele care chiar sunt
permise, manual „Ajutor" pe tot ecranul cu iconițele reale, preseturi salvate local, undo,
avertismente de contact/plutire în bara de stare.

---

## 11. Diferența față de un site web de tip configurator

Comparația e cu **layermodels.com**, cel mai apropiat exemplu public (verificat pe 2026-08-04).

**Ce am putut verifica la ei:** e un **WordPress 7.0.2** (temă Astra, Easy Digital Downloads
Pro, Patreon Connect, Breeze cache, Google Site Kit). Vinde acces la customizere pentru
obiecte simple — name keychain, cable tag, articulated name, nameplate, plant label, magnet,
wall art, planter. Model comercial: abonament + **descărcări contorizate** (Free €0, 0
descărcări, €4 bucata, doar uz personal · Maker €10/lună, 15 descărcări, uz comercial · Pro
€45/lună, 150 descărcări), cu legătură spre Cults3D.

**Ce NU am putut verifica:** motorul lor de geometrie. Toate URL-urile de customizer
redirecționează la `/pricing/` fără cont, iar cont nu am făcut. Deci nu afirm nimic despre cum
generează ei geometria.

Diferențele reale, pe ce se poate susține:

| | Magic3D | Site tip configurator |
|---|---|---|
| Natura produsului | aplicație desktop-first, offline, fișiere pe disc | serviciu web cu cont și abonament |
| Platformă | build static Vite, fără server, fără DB, fără conturi | CMS (la ei WordPress) + plugin de e-commerce |
| Geometrie | CSG exact în WASM, local, pe mașina utilizatorului | necunoscut public |
| Bibliotecă | fișiere proprii pe disc, rescanabile | catalog al furnizorului |
| Livrabil | 3MF multicolor + fișă de producție + verificare pe placă | descărcare contorizată |
| Preocuparea centrală | **fabricabilitate**: intră piesa, ține peretele, stă în picioare | personalizare vizuală |
| Monetizare | licență/cdkey pentru aplicație (planificat) | abonament + plată per descărcare |

**Steagul cel mai simplu de recunoaștere:** dacă discuția e despre WordPress, rute, API,
conturi, sesiuni, SQL sau SSR — nu e despre platforma asta. Aici nu există niciunul dintre ele.
Dacă e despre `AppDefinition`, `manifold`, buzunare, genus, handle-uri WASM sau 3MF cu grupuri
de culoare — e despre platforma asta.

---

## 12. Ce nu e făcut încă

Comutator de produse, EN, împachetare Windows (condiție: mutarea bibliotecii în `%APPDATA%`),
licențiere, aplicație web de probă cu opțiuni blocate. Din audit rămân deschise: atribuirea în
masă a culorilor, ancorarea tematicilor la bază, deriva de adâncime la rotirea tematicii,
deduplicarea materialelor 3MF, exportul ZIP pe mai multe plăci, două erori TS preexistente.
