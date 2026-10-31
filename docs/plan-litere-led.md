# Plan — aplicația „Litere LED"

Scris înainte de prima linie de cod, ca la celelalte. Cea mai grea dintre cele șapte: are
toleranțe fine, două piese care trebuie să se potrivească, și constrângeri **optice**, nu doar
geometrice.

---

## Produsul

Literă luminoasă, din **două piese**:

- **corpul** — pereți și spate, material **opac**
- **fața** — placă **translucidă** care închide litera în față

Înăuntru, o bandă LED. Lumina difuzează prin față. Cablul iese printr-un canal.

---

## Unde se leagă

```
led.html                  -> <script type="module" src="/src/apps/led/main.ts">
src/apps/led/             -> aplicația nouă, folder propriu
landing.html              -> cardul „Litere LED" devine activ
```

`textSolid` se importă din `core/geometry/textSolid.ts` — unificat, **nu se copiază local**.

---

## Reutilizare: e Cutii Litere plus un capac

Corpul e **exact** o cutie: `sil`, `interior = sil.offset(-Wp)`, pereți, fund. Dacă Cutii Litere
e gata, geometria de bază se refolosește aproape integral.

Ce se adaugă: praguri pentru față, canalul de cablu, și constrângerile optice.

**Recomandare de ordine:** se face **după** Cutii Litere, nu înainte. Altfel se scrie de două ori
aceeași cutie.

---

## Geometria

```
sil       = silueta literei
interior  = sil.offset(-Wp)                Wp = perete opac, ≥1.6 mm
corp      = extrude(sil \ interior, H) ∪ fund
prag      = sil.offset(-Wp) \ sil.offset(-Wp-Pp)   umăr pe care se așază fața
fata      = extrude(sil.offset(-Wp+Jf), Gf)        Gf = grosime translucidă
canal     = cilindru prin peretele din spate
```

Fața se așază pe prag, nu pe muchia peretelui: iese la același nivel cu conturul și nu se vede
rostul din lateral.

---

## Constrângerile OPTICE — partea care diferențiază aplicația

Aici se joacă totul. O literă LED prost dimensionată arată ca un șir de puncte, nu ca o suprafață
luminoasă. Aplicația trebuie să **calculeze și să avertizeze**, nu să lase utilizatorul să afle
după print.

### 1. Adâncimea decide uniformitatea, nu grosimea feței

Regula practică: **distanța de la bandă la față ≥ pasul dintre LED-uri**.

| bandă | pas | adâncime minimă |
|---|---|---|
| 30 LED/m | 33 mm | ~33 mm |
| 60 LED/m | 16.7 mm | ~17 mm |
| 120 LED/m | 8.3 mm | ~9 mm |

Sub atât se văd punctele. Aplicația cere tipul de bandă din panou și avertizează cu cifre:
„adâncime 12 mm cu bandă de 60 LED/m — se vor vedea punctele; minim 17 mm sau treci la 120 LED/m".

Ăsta e cel mai valoros avertisment din toată aplicația.

### 2. Grosimea feței translucide

1.2–2 mm. Sub 1.2 se vede structura stratului și LED-urile transpar; peste 2.5 pierzi din
luminozitate fără câștig de uniformitate. Implicit 1.6 mm.

### 3. Peretele opac trebuie să rămână opac

Sub ~1.6 mm, PLA-ul lasă lumina să treacă și litera „curge" pe lateral. Minim impus, cu
avertisment sub el.

---

## Ce mai calculează aplicația, fiindcă poate

**Lungimea de bandă necesară** — perimetrul interior, în cm.
**Numărul de LED-uri** — din lungime și tipul de bandă.
**Consumul** — din numărul de LED-uri și tensiune: „42 cm bandă · 26 LED · ~3.1 W la 12 V".

Merg în bara de stare și în fișa de producție. Sunt exact informațiile pe care altfel le
calculează cineva pe hârtie, greșit.

---

## Verificări obligatorii

1. **Încape banda** — lățimea benzii (8 sau 10 mm) plus joc trebuie să intre în cavitate. La
   litere subțiri nu încape: avertisment cu lățimea reală disponibilă.
2. **Adâncime vs pas LED** — vezi mai sus.
3. **Perete opac** ≥ 1.6 mm.
4. **Fața intră în prag** — coliziune 0 între cele două piese, ca la inlay-ul de la litere.
   Verificare de aceeași natură, se refolosește abordarea.
5. **Canalul nu slăbește peretele** — perete rămas ≥ 1.2 mm în jurul lui.
6. **Componente conexe** — corpul rămâne o singură piesă; fața la fel.
7. **Alfabet** — toate literele × fonturi, ambele piese.

---

## Parametrii din panou

| parametru | implicit | interval |
|---|---|---|
| literă, font, înălțime | ca la litere | — |
| adâncime corp | 25 mm | 10–60 |
| perete opac | 2 mm | 1.6–5 |
| grosime față | 1.6 mm | 1.2–3 |
| joc față | 0.2 mm | 0.1–0.5 |
| adâncime prag | 2 mm | 1–4 |
| tip bandă | 60 LED/m | 30 / 60 / 120 |
| lățime bandă | 10 mm | 8 / 10 / 12 |
| diametru canal cablu | 4 mm | 2–8 |
| poziție canal | spate, jos | spate / jos / lateral |

---

## Ordinea de implementare

1. **Schelet** — pagină, `AppDefinition`, card activat.
2. **Corpul** — pereți, fund, adâncime. Dacă Cutii Litere există, refolosit.
3. **Fața plus pragul**, cu verificarea de coliziune între piese.
4. **Avertismentele optice** — adâncime vs pas LED, perete opac, lățime disponibilă pentru bandă.
5. **Canalul de cablu.**
6. **Calculele** — lungime bandă, număr LED, consum. În stare și în fișă.
7. **Export** — două piese, culori diferite, marcate ca aceeași lucrare.

---

## Ce NU se face în prima versiune

Difuzor intern separat · montaj pe perete · alimentare integrată sau conector modelat ·
mai multe litere legate în serie · canal de cablu între litere.
