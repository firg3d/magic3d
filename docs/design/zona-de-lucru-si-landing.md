# Magic3D — Zona de lucru și landing: comportament, sistem de design, reîmprospătare vizuală

Document de design pentru agentul de cod. Continuă seria SEM/HUS; convențiile sunt aceleași: **DECIZIE** = închis, **OPRIRE** = raport și așteptare. Numele de directoare urmează repo-ul (`src/core/`, `src/apps/`), nu convenția din documentul anterior.

Patru valuri:

| Val | Conținut | Probleme acoperite |
|---|---|---|
| **WS.1** | Interacțiune 3D și elemente | 1, 2, 3, 4, 5, 6, 10, 11, 15, 16, 17, 18 |
| **VIS.1** | Sistem de design + layout zonă de lucru | 7, 8, 9 + reproiectarea tuturor panourilor |
| **WS.2** | Mod prezentare | 12, 13, 14 |
| **VIS.2** | Landing | reîmprospătare + repoziționare |

Ordinea în planul general: **SEM.1 → HUS.1 → WS.1 → VIS.1 → HUS.2 → WS.2 → VIS.2.**
Motiv: WS.1 corectează comportamente pe care VIS.1 le îmbracă; HUS.2 se construiește pe VIS.1; WS.2 (prezentarea) produce fotografiile de produs de care VIS.2 (landing-ul) are nevoie.

---

## 0. Decizii închise din prototipuri

> Copiate textual din promptul de val, înainte de orice cod. Prototipurile din
> `docs/design/referinta/` sunt referința vizuală obligatorie. Unde documentul și prototipul
> diferă, **prototipul câștigă** (e mai nou). Unde prototipul are un stub (§0.3), documentul câștigă.

### 0.1 Direcție și tokeni — DECIZIE

Direcția „Atelier" e aprobată. Tokenii se preiau **exact** din `:root` și `[data-theme="dark"]` ale prototipului de aplicație și devin `src/core/ui/tokens.css` (primitiv → semantic → componentă). Landing-ul folosește aceiași tokeni plus cei din `:root` al prototipului de landing (`--paper`, `--sand`, `--accent-deep`, `--pla`). Font: Manrope (400/500/600/700/800) cu `font-feature-settings:"tnum"`. Iconuri: Tabler, un singur set, 18 px în bare, 16 px în rânduri. Un lint (stylelint sau script propriu în CI) respinge orice culoare hex, rgb sau hsl în CSS-ul aplicațiilor și al landing-ului în afara `tokens.css`.

### 0.2 Layout-ul zonei de lucru — DECIZIE

- **Bara de sus (52 px):** stânga — marca + comutatorul de aplicație („Litere ▾"); spațiu liber; dreapta, un singur bloc: grupul de unelte (Selectare Q · Mută G · Rotește R · Scalează S, unealta activă cu fundal violet plin și text alb) · separator · selector de placă, Plăci · separator · Prezentare, temă, ajutor · separator · cont, **Export 3MF** (singurul buton primar). Nu există „Adaugă" în bară.
- **Adaugă** este un buton rotund violet în colțul stânga-sus al scenei, cu meniu: Bază, Element, Text, Imagine SVG (ultima vizibilă mereu, activă doar cu licență). Plusul din capul listei de elemente deschide același meniu.
- **Stânga (340 px):** antet „Parametri" cu buton de strângere; secțiuni pliabile Conținut / Dimensiuni / Finisaj / Avansat (Avansat pliat implicit, cu notă explicativă). Conținut are previzualizarea literei/textului în fontul ales, într-o placă de 88 px, plus câmpurile Literă și Font (numele fontului randat în fontul respectiv). Dimensiuni: fiecare parametru = rând cu eticheta în stânga și câmpul numeric cu unitate în dreapta, slider dedesubt pe toată lățimea. Finisaj: swatch-uri de culoare (28 px) + „altă culoare"; Chenar ca și comutator care își deschide sub-câmpurile.
- **Dreapta (300 px):** antet „Scenă" cu buton de strângere; lista de elemente (icon, nume, ochi, lacăt, coș; copiii indentați); panoul de proprietăți intitulat „<Unealtă> — <Element>" cu Poziție X/Y/Z, Rotire X/Y/Z, „Pe placă"; sumarul „Piesa" (dimensiuni, volum în cm³, timp estimat, culori). Fără selecție: „Selectează un element ca să-i vezi proprietățile."
- **Strângere:** fiecare panou lateral se strânge la o șină de 44 px cu butonul de deschidere și eticheta pe verticală; **Tab** ascunde ambele; stările se memorează.
- **Scenă:** fundal `--canvas`; grid 16 mm pe placă; cub de navigare în dreapta-sus (Sus / Față / Izo / persp-orto); indicație de utilizare în pastilă centrată jos, cu buton de închidere, arătată o singură dată; pastila „Recalculez geometria…" sus-centru.
- **Bară de stare (36 px):** verificările ca bife/avertismente, „actualizat în X s" la dreapta. Nimic de tip debug.
- **Mod întunecat:** comutator în bara de sus, memorat; implicit deschis.

### 0.3 Comportamente demonstrate în prototip — DECIZIE

Se implementează exact așa (vezi funcțiile `pointerdown/move/up`, `closestOnAxis`, `fitTo`, `setPres`, `setPane` din prototip):

- tragere de corp = mutare în planul plăcii la înălțimea curentă; când camera e sub ~13° deasupra orizontului, mutarea se face în planul ecranului;
- tragere de o săgeată a gizmo-ului = mutare doar pe axa ei; săgeata verde (Y) stinge „Pe placă"; „Pe placă" reaprins lipește piesa la Y = 0;
- click = selectare doar dacă mouse-ul s-a mișcat < 4 px; orbitarea nu atinge selecția; Esc deselectează;
- orbitare fără limită polară; vederile presetate încadrează bounding box-ul elementelor vizibile (nu placa) și comută pe ortografic; Izo revine la perspectivă;
- Prezentare intră direct în mod (stânga și bara de stare dispar, dreapta arată panoul de prezentare), Esc iese;
- Plăci = vedere ortografică de sus pe aranjarea pe plăci, comutator, fără răsturnare;
- gizmo în două faze: matrice în timpul tragerii, reconstrucție la eliberare.

**Stub-uri din prototip care NU se copiază** (se implementează conform documentului, nu prototipului): scrisul ca plan cu textură (în produs e geometrie din motorul de font); fontul helvetiker din hero (în produs: Baloo 2 prin motorul opentype existent); estimarea de timp din formula fictivă (folosește estimatorul existent dacă există; altfel omite rândul, nu inventa); `alert()`-urile din meniul Adaugă; cardurile de generatoare hardcodate (vin din `src/core/config/aplicatii.ts`); Rotește și Scalează fără gizmo (în produs au gizmo propriu, cf. WS.1.3).

### 0.4 Landing — DECIZIE

Structura, ordinea secțiunilor, textele și motivul vizual unic („straturile" de print: linia de secțiune, marginea cardurilor, textura laturilor din hero) se preiau din prototipul de landing. Hero-ul e interactiv: wordmark 3D real, reconstruit la tastare, cu fața deschisă și laturile violet cu linii de strat; se rotește singur, se oprește la interacțiune, respectă `prefers-reduced-motion`. Contorul „11 din 22" și „combinații" dispar; în loc, „Următorul generator — tu alegi" cu vot. Cardurile folosesc fotografii din WS.2.

### 0.5 Constatări la depunerea referințelor (agent, 2026-09-04)

Două lucruri găsite la citirea prototipurilor, raportate fără a fi „reparate":

1. **Ghidul de frontend lipsește.** Promptul îl cere la `docs/skills/frontend-design.md`; fișierul nu există în depozit (nici calea din valul SEM.1, `/mnt/skills/public/frontend-design/SKILL.md`, nu există pe mașina de lucru). Blochează orice componentă nouă de UI.
2. **Grila din prototipul de landing nu se potrivește cu cele 12 generatoare reale.** Prototipul are 8 carduri disponibile — lipsesc Cuvinte Decor, Brelocuri Decor, Brelocuri Articulate și Litere LED — deși linia de încredere de deasupra spune „12 generatoare". În plus, cardul **„Rame"** e descris ca „rame foto la dimensiunea exactă a pozei", pe când aplicația existentă e **Rame Tematice** (pânză de păianjen, stea, inimă, cu nume, pe bază ovală) — alt produs, nu altă formulare. Conform VIS.2.3 grila se generează oricum din `aplicatii.ts`, deci se rezolvă acolo; textul cardului „Rame" din prototip NU se preia ca atare.

---

## Lista problemelor (numerotare de referință)

1. Gizmo-urile de mutare/rotire/scalare nu urmăresc elementul în timp real cât ține click-ul apăsat.
2. Litere: textul aplicat taie corect doar pe fața plată; pe bordură/muchie nu taie.
3. Scalare: handle-uri doar pe două axe; lipsește axa grosimii (Z).
4. Baza „teren de fotbal" trebuie rotită 90° pe Z (pe lățime, nu pe lungime).
5. Brelocuri articulate: literele nu se pot deplasa stânga/dreapta pe segment; la lățire se suprapun pe balama.
6. Rotirea camerei deselectează elementul selectat.
7. Uneori panoul numeric nu apare când selectezi mută/scalează/rotește.
8. Lista obiectelor din scenă trebuie în dreapta, ca Layers (Photoshop) / Outliner (Blender).
9. Fiecare unealtă din bara de sus trebuie să aibă propriul panou, vizibil permanent cât ai ceva selectat cu ea.
10. Placa: pe lângă preseturi, două câmpuri pentru dimensiuni manuale.
11. Butonul „Plăci" nu funcționează — întoarce scena cu capul în jos.
12. Prezentare: butonul din meniu trebuie să intre direct în mod; modificările în timp real.
13. Fundalul „Masă" randează greșit; trebuie plan poligonal care se mișcă cu scena, orizont corect, grid infinit.
14. Unghiurile de fotografiere nu funcționează; trebuie să se centreze pe obiecte, nu pe dimensiunea scenei vs. ecran.
15. Lipsește vederea ortografică de sus; camera e limitată la ~170° pe verticală; sus/jos sunt stricate.
16. Bazele nu se pot șterge decât înlocuindu-le; tematicile nu se pot șterge deloc.
17. „Tematici" se redenumește „Elemente".
18. Bazele nu se pot muta/potrivi în scenă în mai multe generatoare.

---

## Val WS.1 — Interacțiune 3D și elemente

### WS.1.1 Model de scenă (fundație pentru 6, 16, 17, 18 și pentru VIS.1)

**DECIZIE** Orice lucru vizibil în viewport, în orice generator, este un **Element** cu aceeași interfață:

```ts
interface Element {
  id: string;
  tip: 'text' | 'baza' | 'decor' | 'segment' | 'balama' | 'placa' | ...;
  nume: string;               // afișat în listă
  transform: { pozitie: Vec3; rotatie: Vec3; scara: Vec3 };
  blocat: boolean;            // nu se selectează/mută
  vizibil: boolean;
  stergibil: boolean;         // false doar pentru elemente structurale ale generatorului
  mutabil: boolean;           // false doar unde generatorul o cere explicit
  parinte?: string;           // pentru text pe segment, decor pe bază etc.
}
```

Toate generatoarele expun lista de elemente printr-o singură funcție `elemente(): Element[]` din `AppDefinition`. Selecția, gizmo-urile, lista din dreapta (VIS.1) și ștergerea lucrează pe această interfață, nu pe structuri per generator. Regula de izolare `apps/A → apps/B` rămâne; interfața stă în `src/core/scena/`.

Migrarea: fiecare din cele 12 generatoare își mapează structurile interne pe `Element[]`. Un generator care nu are nimic mutabil (ex. Plăcuțe) expune tot lista, cu `mutabil: false`.

### WS.1.2 Gizmo în timp real (problema 1)

**Cauza probabilă**: fiecare mișcare a mouse-ului declanșează reconstrucția geometriei (boolean manifold), care durează zeci–sute de ms, deci gizmo-ul și piesa rămân în urmă.

**Comportament-țintă**: două faze.
- **În timpul tragerii**: se modifică doar `Object3D.matrix` al mesh-ului Three.js existent (și al gizmo-ului, care e copil sau urmărește aceeași matrice). Zero reconstrucție. Cadru cu cadru, 60 fps.
- **La eliberare**: se scrie transformul în `Element.transform` și se reconstruiește geometria o singură dată. Dacă reconstrucția durează > 120 ms, se afișează indicatorul de „recalculez" existent, fără să blocheze UI-ul.
- Câmpurile numerice din panoul uneltei se actualizează și ele în timpul tragerii (citesc din matrice, nu din geometrie).

Criteriu: pe un laptop obișnuit, tragerea unei litere într-un cuvânt de 8 litere nu scade sub 50 fps; măsurat cu `performance.now()` în test.

### WS.1.3 Scalare pe trei axe (problema 3)

- Gizmo de scalare cu handle pe X, Y, Z și un handle central pentru scalare uniformă.
- Z = grosimea (extrudarea). Pentru text, scalarea pe Z modifică parametrul de grosime al generatorului, nu doar matricea, ca să rămână consistent cu panoul de parametri (sincronizare bidirecțională).
- Panoul numeric afișează X, Y, Z separat cu un comutator „proporțional" (lacăt) pornit implicit pentru X/Y, oprit pentru Z.

### WS.1.4 Selecția supraviețuiește rotirii camerei (problema 6)

- Un click se consideră „selectare/deselectare" doar dacă între `pointerdown` și `pointerup` mouse-ul s-a mutat < 4 px și au trecut < 300 ms. Altfel e orbit și nu atinge selecția.
- Deselectarea se face exclusiv prin click pe alt element sau click în gol (spațiu fără geometrie), plus `Esc`.
- Selecția e stare globală în `src/core/scena/selectie.ts`, nu în fiecare unealtă.

### WS.1.5 Camera și vederile (problema 15)

**DECIZIE** Camera orbitează fără limită de unghi polar: 0° (exact de sus) și 180° (exact de jos) sunt atingibile. Se folosește un up-vector stabil (nu se recalculează din poziție) ca să nu existe salturi la poli.

- Vederi presetate, accesibile din bara de sus și cu taste: Sus, Jos, Față, Spate, Stânga, Dreapta, Izometric. Fiecare vedere încadrează bounding box-ul elementelor vizibile (nu al plăcii), cu margine de 10%.
- Comutator **Perspectivă / Ortografic**. Vederile Sus/Jos/Față/Spate/Stânga/Dreapta comută automat pe ortografic; Izometric și orbitarea liberă revin la perspectivă (comportament Blender, cunoscut utilizatorilor).
- Tranziție animată de 250 ms între vederi; se poate opri din setări.

### WS.1.6 Tăiere pe muchie (problema 2)

**Cauza probabilă**: solidul de text pentru tăiere e construit ca extrudare de la planul feței superioare în jos cu adâncimea `d`; dacă textul e mutat pe bordură, o parte din solid nu intersectează piesa sau pornește sub suprafață.

**Comportament-țintă**:
- Solidul de tăiere se extrudează de la `zMax(piesa) + 1 mm` până la `zMax(piesa) − d`, indiferent unde e poziționat în XY. Astfel taie orice atinge, inclusiv bordura, muchia rotunjită sau o bază curbată.
- Dacă utilizatorul a ales „gravare la adâncime de la suprafață" pe o suprafață curbată, se folosește adâncimea de la cel mai înalt punct al piesei de sub text (aproximare acceptată în v1; se documentează).
- Verificare nouă în lista de printabilitate: „Textul nu atinge piesa" când intersecția e goală (volumul boolean nu se schimbă), în loc de export tăcut fără gravură.

### WS.1.7 Elemente: ștergere, redenumire, mutare (problemele 16, 17, 18)

- Orice element cu `stergibil: true` se șterge cu tasta `Delete`/`Backspace` când e selectat și cu butonul de ștergere din lista de elemente (VIS.1) sau, până la VIS.1, din panoul actual de tematici/baze.
- Bazele au `stergibil: true` în toate generatoarele. Ștergerea unei baze readuce piesa la starea „fără bază", nu cere înlocuire.
- Decorațiunile au `stergibil: true`, individual (nu tot setul).
- **DECIZIE** „Tematici" devine **„Elemente"** peste tot: chei i18n RO/EN, etichete UI, nume de fișiere și identificatori interni unde redenumirea nu rupe date salvate; unde există proiecte salvate cu cheia veche, se păstrează alias de citire. Termenul intern din cod: `decor`. Documentația și textele de site se actualizează în același val.
- Bazele au `mutabil: true` implicit în toate generatoarele; se mută și se rotesc cu aceleași gizmo-uri ca orice element. Excepție doar unde geometria o cere (segmentele din Articulate, care sunt legate de balamale), marcată explicit `mutabil: false` cu motiv în cod.

### WS.1.8 Teren de fotbal (problema 4)

Rotația implicită a bazei „teren de fotbal" devine 90° pe Z (terenul pe lățime). Fiind un element mutabil după WS.1.7, utilizatorul îl poate roti înapoi. Se verifică dacă alte baze au aceeași problemă de orientare (agentul raportează lista).

### WS.1.9 Brelocuri articulate: poziția literei pe segment (problema 5)

- Textul de pe segment primește parametrul **„Poziție pe segment"** (−50% … +50%, 0 = centrat), expus în panoul numeric și tras cu gizmo-ul pe axa segmentului.
- La modificarea lățimii segmentului, litera își păstrează poziția relativă (procentul), nu cea absolută.
- Verificare nouă: „Litera se suprapune cu balamaua" — se calculează intersecția bounding box-ului literei cu zona de balama + 1 mm; afișată ca avertisment în lista de verificări, cu buton „Centrează automat".

### WS.1.10 Placa (problemele 10, 11)

- Selectorul de placă primește sub preseturi două câmpuri **Lățime / Adâncime** (mm), cu validare 50–500 mm; alegerea unui preset le completează, editarea lor selectează automat „Personalizată". Valoarea se salvează în același loc ca presetul (`AppContext.placa()`).
- Butonul „Plăci": agentul determină în explorare ce era menit să facă (probabil vederea de aranjare pe mai multe plăci din `layoutOnPlates`). **DECIZIE** Se repară, nu se scoate: comută între *Scenă* și *Plăci* (vederea de aranjare, ortografică de sus, cu fiecare placă desenată și numerotată). Cauza răsturnării e cel mai probabil up-vectorul camerei; se rezolvă odată cu WS.1.5. Dacă în explorare se constată că funcția nu are nicio implementare în spate, agentul se oprește și raportează înainte să construiască una.

### WS.1.11 Teste și OPRIRE

Teste: pentru fiecare problemă din WS.1 un test care reproduce comportamentul vechi (roșu înainte) și îl verifică pe cel nou. Regresia de export pe cele 12 generatoare rămâne obligatorie (transformurile migrate în `Element` trebuie să producă geometrie identică pentru proiectele existente).

**OPRIRE WS.1**: tabel problemă → fișier → test, fps măsurat pentru gizmo, lista bazelor cu orientare suspectă, ce s-a găsit în spatele butonului „Plăci", confirmarea regresiei.

---

## Val VIS.1 — Sistem de design și layout-ul zonei de lucru

### VIS.1.1 Direcție vizuală (propusă; se aprobă la OPRIRE 0 a valului)

Numele direcției: **„Atelier"**. Unealtă profesională, calmă, care lasă piesa să fie vedeta.

- **Viewport**: fundal neutru cald deschis (gri-bej foarte deschis) implicit, cu **mod întunecat** ca opțiune persistentă. Culorile PLA trebuie să se citească corect pe fundal; niciun gradient în spatele piesei în modul de lucru.
- **Chrome UI**: panouri albe (sau gri-închis în dark) cu border de 1 px, fără umbre mari, fără sticlă. Densitate medie: rânduri de 32 px, câmpuri de 28 px.
- **Culoarea de brand** (violetul actual) se păstrează, dar cu un singur rol: acțiunea primară (Export), starea de selecție în viewport și în listă, focus. Nu apare pe fundaluri de panouri, nu apare în titluri.
- **Tipografie**: un singur font sans (cel folosit deja pe site, dacă are cifre tabulare; altfel Inter), scală 12 / 13 / 15 / 20 / 28. Cifre tabulare în toate câmpurile numerice.
- **Iconuri**: un singur set (Tabler), 18 px în bare, 16 px în rânduri. Se elimină orice icon din alt set.
- **Raze**: 6 px câmpuri, 8 px panouri, 999 px pentru badge-uri.
- **Spațiere**: scală de 4 px (4, 8, 12, 16, 24, 32).

Tokenii se definesc o singură dată în `src/core/ui/tokens.css` (CSS variables, trei straturi: primitiv → semantic → componentă) și sunt singura sursă de culoare, spațiere și tipografie pentru toate aplicațiile și pentru landing. Orice valoare hardcodată de culoare/spațiere în CSS-ul aplicațiilor e o eroare de lint.

Agentul citește `/mnt/skills/public/frontend-design/SKILL.md` înainte de orice componentă.

### VIS.1.2 Layout-ul zonei de lucru (desktop ≥ 1200 px)

```
┌────────────────────────────────────────────────────────────────────┐
│ Bară de sus: [Aplicații ▾] [Selectare Mută Rotește Scalează]       │
│              [Vederi ▾] [Persp/Orto] [Placă ▾] [Plăci] [Prezentare] │
│                                                    [Export ●]       │
├───────────┬───────────────────────────────────┬────────────────────┤
│ Parametri │                                   │ Elemente (listă)   │
│ (stânga,  │            Viewport               │ ─────────────────  │
│ 320 px)   │                                   │ Proprietăți /      │
│           │                                   │ panoul uneltei     │
│ acordeon: │                                   │ (dreapta, 300 px)  │
│ Text      │                                   │                    │
│ Bază      │                                   │                    │
│ Elemente  │                                   │                    │
│ Export    │                                   │                    │
├───────────┴───────────────────────────────────┴────────────────────┤
│ Bară de stare: ✓ perete 2,4 mm  ✓ stabil  ✓ încape · 84 × 32 × 12 mm │
└────────────────────────────────────────────────────────────────────┘
```

- **Stânga — Parametrii generatorului.** Ce are fiecare aplicație azi, reorganizat în secțiuni pliabile cu aceeași ordine în toate aplicațiile: conținut (text/font), formă, bază, elemente, finisaj, export. Secțiunea activă rămâne deschisă; restul se pliază.
- **Centru — Viewport** cu gizmo-uri, vederi, grid. Fără butoane plutitoare peste viewport în afară de comutatorul de vederi din colțul dreapta-sus (cub de navigare mic).
- **Dreapta sus — Elemente** (problema 8): lista tuturor elementelor din `elemente()`, ierarhică (text pe segment sub segment, decor sub bază), cu iconul tipului, nume editabil prin dublu-click, ochi (vizibil), lacăt (blocat), coș (șterge, doar dacă `stergibil`). Click = selectează; selecția din viewport se reflectă în listă și invers. Drag pentru reordonare acolo unde ordinea contează (litere într-un cuvânt).
- **Dreapta jos — Proprietăți** (problemele 7, 9): panoul uneltei active pentru elementul selectat. Mută → X/Y/Z; Rotește → X/Y/Z în grade cu pași de 15° la Shift; Scalează → X/Y/Z + uniform + lacăt. Sub ele, proprietățile specifice tipului (pentru text: font, grosime, poziție pe segment; pentru bază: preset, dimensiuni). Panoul e **întotdeauna vizibil** când există selecție; când nu există, arată „Selectează un element" și un rezumat al piesei (dimensiuni, volum estimat, timp estimat dacă există). Problema 7 se rezolvă prin construcție: panoul nu mai e o fereastră care apare/dispare, ci o zonă fixă cu conținut care se schimbă.
- **Bara de stare** (jos): verificările de printabilitate ca rând de bife/avertismente, click pe una deschide detaliul; dimensiunile piesei; indicatorul de „recalculez".
- Ambele panouri laterale se pot plia (tastă `Tab` ascunde tot pentru viewport pe tot ecranul, ca în Blender).

### VIS.1.3 Layout-uri responsive

- **1024–1199 px**: dreapta devine sertar peste viewport, deschis implicit cu lista; proprietățile sub listă, derulabile.
- **768–1023 px**: stânga devine sertar; dreapta devine sertar; bara de stare rămâne.
- **< 768 px (mobil)**: viewport pe tot ecranul cu trei file jos: *Parametri*, *Scenă* (elemente + proprietăți), *Export*. Gizmo-urile rămân, dar cu handle-uri de 44 px. Mesaj discret la primul export: „Exportul merge și pe telefon; pentru scene mari recomandăm desktop".

### VIS.1.4 Componente (în `src/core/ui/`)

Panou, Secțiune pliabilă, Câmp numeric cu unitate și drag-to-scrub (trage orizontal pe etichetă ca să schimbi valoarea, ca în Blender), Slider cu câmp numeric alături, Select, Comutator, Buton de bară (cu stare activă), Listă de elemente (rând cu icon/nume/ochi/lacăt/coș), Rând de verificare (bifă/avertisment/eroare + text + acțiune), Badge, Tooltip cu scurtătura de tastatură. Fiecare componentă are o pagină în `src/apps/demo` (pagina de probă existentă) ca vitrină și test vizual.

### VIS.1.5 Scurtături de tastatură (afișate în tooltip-uri)

`Q` selectare, `G` mută, `R` rotește, `S` scalează, `Delete` șterge, `Esc` deselectează, `1/3/7` față/dreapta/sus (numpad și rând), `5` persp/orto, `Tab` ascunde panourile, `Ctrl+E` export. Se documentează într-un panou „?" din bara de sus.

### VIS.1.6 Migrarea celor 12 aplicații

Toate cele 12 se mută pe noul layout și pe componente în același val, în ordinea: Litere (cea mai complexă) ca pilot → **OPRIRE VIS.1a** cu capturi desktop/tabletă/mobil, mod deschis și întunecat → restul de 11 → **OPRIRE VIS.1b**. Fără excepții „mai târziu": o aplicație rămasă pe vechiul chrome e o regresie.

Regresia de export pe cele 12 e obligatorie și aici (VIS.1 nu are voie să atingă geometria).

---

## Val WS.2 — Mod prezentare

### WS.2.1 Intrare directă (problema 12)

- Butonul **Prezentare** din bara de sus intră direct în mod: viewport pe tot ecranul, panourile stânga/dreapta se pliază, dreapta afișează panoul de prezentare. Fără al doilea buton de pornire.
- Toate schimbările din panou (fundal, scenă, lumină, unghi) se aplică imediat în viewport.
- `Esc` sau butonul „Înapoi la editare" ies din mod. Starea prezentării (fundal, unghi) se păstrează per proiect.

### WS.2.2 Scena „Masă" (problema 13)

**DECIZIE** „Masa" e un plan poligonal real în scenă, nu o imagine de fundal.
- Un `PlaneGeometry` mare (ex. 20 × dimensiunea piesei, minimum 2 m) la Z = 0, cu material mat, primește umbre de la piesă (o lumină direcțională cu umbre + ambient).
- Grid infinit prin shader (grid pe plan cu atenuare la distanță), pas de 10 mm cu linie principală la 50 mm; se poate opri.
- Orizontul apare corect pentru că e geometrie reală văzută de aceeași cameră; fundalul de deasupra orizontului e o culoare uniformă sau un gradient vertical de cer, ales din panou.
- Variantă „Placă": planul ia forma și culoarea plăcii imprimantei alese (reutilizează geometria plăcii din `layout.ts`), pentru fotografii „așa arată pe placă".
- Alte scene: Gol (doar culoare), Gradient, Studio (fundal curbat tip ciclorama: plan + sfert de cilindru).

### WS.2.3 Unghiuri de fotografiere (problema 14)

- Fiecare unghi presetat (Față, Trei sferturi stânga/dreapta, Sus, Detaliu, Nivel masă) calculează bounding box-ul **elementelor vizibile** și încadrează camera pe el: centrul țintei = centrul bounding box-ului, distanța = cea la care box-ul umple 80% din latura mică a viewportului, la FOV-ul ales.
- Raportul de aspect al exportului (1:1, 4:5, 16:9, 3:2) se alege din panou și viewportul arată ghidul de decupare; încadrarea se recalculează la schimbarea raportului.
- Export PNG la 1×/2×/4× rezoluția viewportului, cu fundal transparent opțional (doar pentru scena Gol).
- Buton „Reîncadrează" care aplică aceeași logică pentru orice poziție liberă a camerei.

### WS.2.4 Teste și OPRIRE

Test pentru încadrare: pentru trei scene cu dimensiuni diferite, bounding box-ul proiectat ocupă 80% ± 2% din latura mică. Test pentru intrare: click pe „Prezentare" → panoul de prezentare e vizibil și panourile de editare pliate, într-un singur pas.

**OPRIRE WS.2**: patru fotografii exportate (Masă, Placă, Studio, Gol) ale aceleiași piese, la 4:5 și 16:9.

---

## Val VIS.2 — Landing

Se bazează pe analiza anterioară a site-ului și pe tokenii din VIS.1. Se aplică aceleași reguli de skill (`frontend-design`).

### VIS.2.1 Repoziționare

- Titlu și meta: din „Generator de litere 3D personalizate" în „Obiecte 3D gata de printat, configurate în minute". Subtitlu care numește familiile: cadouri personalizate, birou, casă, huse.
- Contorul „11 din 22" și „0 combinații" dispar. În loc: „12 generatoare · Următorul: votează" cu trei opțiuni și buton.

### VIS.2.2 Hero interactiv

- Un câmp de text în care se tastează singur un nume și piesa se construiește în viewport în timp real (folosește generatorul Litere în mod redus, fără panouri). Randare statică (imagine) pentru LCP, WebGL hidratat după interacțiune sau după 2 s pe desktop; pe mobil rămâne imaginea cu buton „Încearcă".
- Sub hero, două butoane: „Începe gratuit" și „Nu ai imprimantă? Ți-o printăm noi" (către praktik3d.ro, secțiunea de comandă).

### VIS.2.3 Grila de aplicații

- Grupată pe categorii: Cadouri personalizate / Birou și organizare / Casă / Huse (goală până la HUS.2, cu „în curând" fără contor). Filtre ca chip-uri.
- Cardurile folosesc **fotografii de piese printate** produse cu WS.2 (scena Masă, 4:5), nu randări. Fiecare card: fotografie, nume, o linie, badge „nou" sub 30 de zile.

### VIS.2.4 Secțiuni păstrate, restilizate

Cum funcționează (3 pași), Academia (cu capitolele 3 și 4 marcate ca „în lucru" doar dacă chiar sunt), Prețuri (cu textele din SEM.1 A.6), FAQ, subsol. Toate pe tokenii din VIS.1; nicio valoare de culoare în CSS-ul landing-ului.

### VIS.2.5 Performanță și teste

LCP < 2,5 s pe mobil 4G simulat; CLS < 0,1; fără regresie la scorul Lighthouse actual. Contorul (reparat în SEM.1) se scoate odată cu secțiunea.

**OPRIRE VIS.2**: capturi desktop/mobil, scoruri Lighthouse înainte/după, confirmarea că textele RO/EN de prețuri corespund cu A.6.

---

## Ce trebuie de la operator înainte de VIS.1

1. Aprobarea direcției „Atelier" (sau observații pe ea) — la OPRIRE 0 a valului VIS.1, pe baza a două machete statice pe care agentul le produce înainte de cod: Litere pe desktop, deschis și întunecat.
2. Decizia dacă modul întunecat e implicit sau opțional (propunere: opțional, memorat).
3. Fotografii reale pentru VIS.2 vin din WS.2; până atunci cardurile folosesc randările actuale.
