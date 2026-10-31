# Plan — aplicația „Litere Fagure"

Scris înainte de prima linie de cod, ca să nu depindă de memoria unei conversații.
Aceeași abordare ca la [plan-brelocuri.md](plan-brelocuri.md).

---

## Produsul

Literă în care **interiorul e umplut cu un model, nu cu material plin**. Trei modele:

- **fagure hexagonal** — celule hexagonale, pereți subțiri
- **grilă diagonală** — două familii de benzi la ±45°
- **triunghiular** — trei familii de benzi, la 0°, 60°, 120°

Litera are o **ramă plină pe contur**, altfel modelul n-are de ce se prinde și piesa se rupe.

---

## Unde se leagă

```
fagure.html               -> <script type="module" src="/src/apps/fagure/main.ts">
src/apps/fagure/          -> aplicația nouă, folder propriu
landing.html              -> cardul „Litere Fagure" devine activ
```

Izolarea e impusă de `isolation.test.ts`. `textSolid.ts` se **copiază** local, nu se importă
din `apps/litere` — la fel ca la brelocuri.

---

## Geometria

```
sil       = silueta literei
interior  = sil.offset(-W)                     W = lățimea ramei, ~2.5 mm
rama      = sil \ interior
model     = tiparul 2D, generat pe tot dreptunghiul literei
umplut    = model ∩ interior
litera    = extrude(rama ∪ umplut, G)
```

### Cum se generează fiecare model

Toate trei se reduc la **reuniune de benzi sau inele subțiri**, intersectate cu interiorul.

**Fagure:** centre hexagonale pe grilă alternată, pas P. Pentru fiecare centru, un hexagon de
rază P/2. Pereții = `⋃hexagoane \ ⋃(hexagoane retrase cu T/2)`, unde T e grosimea peretelui.
Echivalent și mai ieftin: se generează o singură dată reuniunea hexagoanelor retrase și se
scade din dreptunghiul plin.

**Diagonală:** benzi de lățime T, repetate la pas P, rotite cu +45°; același set rotit cu −45°;
reuniune.

**Triunghiular:** identic, trei familii la 0°, 60°, 120°.

Diagonala și triunghiularul sunt mult mai ieftine de calculat decât fagurele — merită începute
cu ele, ca să se valideze restul pipeline-ului pe geometrie simplă.

---

## Verificări obligatorii

1. **CONECTIVITATE** — cea mai importantă. Modelul trebuie prins de ramă peste tot; nicio
   bucată plutitoare în interior. Se verifică prin **numărul de componente conexe**, care
   trebuie să rămână cel al literei (1 pentru „A", 2 pentru „i").
2. **Grosime minimă de perete** ≥ 2 extrudări (~0.85 mm la duză 0.4). Sub atât nu se printează.
3. **Fără așchii** — acolo unde modelul atinge tangențial rama apar fragmente de sub 1 mm².
   Se elimină, sau se evită retrăgând ușor interiorul.
4. **Alfabet** — toate literele × fonturile, cu fiecare din cele trei modele.

### Atenție: testul de genus NU se aplică aici

La litere și brelocuri invariantul e „genus neschimbat de operație". Aici modelul **creează
sute de goluri, prin proiect**. Invariantul corect e **numărul de componente conexe**, nu genus.

Copierea oarbă a testului din `goluri.test.ts` ar da eșecuri false la fiecare rulare.

---

## Parametrii din panou

| parametru | implicit | interval |
|---|---|---|
| literă, font, înălțime, grosime | ca la litere | — |
| model | fagure | fagure / diagonal / triunghiular |
| pas celulă | 8 mm | 4–20 |
| grosime perete | 1.2 mm | 0.8–3 |
| lățime ramă | 2.5 mm | 1.5–6 |
| unghi model | 0° | 0–90, doar la diagonal/triunghiular |

---

## Ordinea de implementare

1. **Schelet** — pagină, `AppDefinition`, card activat. Suita verde, inclusiv izolarea.
2. **Grila diagonală** — cel mai simplu model, validează pipeline-ul ramă + umplutură.
3. **Verificarea de conectivitate**, ca test permanent, înainte de restul modelelor.
4. **Triunghiular**, apoi **fagure**.
5. **Panoul** cu parametrii.
6. **Export** — o singură piesă, o culoare. Mai simplu decât la brelocuri.

Fiecare pas: verificat în aplicație, suita verde, commit separat.

---

## Riscuri identificate

**Numărul de triunghiuri.** O literă de 120 mm cu celule de 6 mm are câteva sute de celule,
fiecare cu pereți. Poate depăși ușor 500k triunghiuri și încetini reconstrucția. Dacă se
întâmplă, măsurat înainte de optimizat — la aplicația de litere, 94% din timp stătea într-un
singur loc, iar bănuiala inițială era greșită.

**Timpul de boolean.** `model ∩ interior` pe câteva sute de celule e cea mai scumpă operație.
Merită memorat pe aceeași cheie ca rotunjirea de la litere: se schimbă doar la modificarea
literei sau a parametrilor de model.

---

## Ce NU se face în prima versiune

Model variabil pe suprafață (celule mai dese la margine) · umplutură cu două culori ·
modele importate de utilizator · pattern pe grosime, nu doar străpuns.
