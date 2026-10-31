# Plan — aplicația „Cutii Litere"

Scris înainte de prima linie de cod. Aceeași abordare ca la
[plan-brelocuri.md](plan-brelocuri.md) și [plan-litere-fagure.md](plan-litere-fagure.md).

---

## Produsul

Literă cu **pereți și fund, interior gol** — cutie pentru flori, dulciuri sau cadouri.

Două familii:
- **plin** — pereți și fund solizi
- **cu model** — fagure, triunghiuri sau grilă

Adâncimea cutiei reglabilă. Modelul, la fel.

---

## Unde se leagă

```
cutii.html                -> <script type="module" src="/src/apps/cutii/main.ts">
src/apps/cutii/           -> aplicația nouă, folder propriu
landing.html              -> cardul „Cutii Litere" devine activ
```

> **ACTUALIZAT 2026-08-01.** `textSolid` **NU se mai copiază.** A fost unificat în
> `core/geometry/textSolid.ts`; se importă de acolo, ca orice altă bucată de nucleu. Copierea
> locală era soluția de dinainte de unificare — o copie nouă ar anula exact munca aceea.
> Izolarea interzice `apps/A -> apps/B`, nu `apps/A -> core/`.

---

## Geometria de bază

```
sil       = silueta literei
interior  = sil.offset(-Wp)              Wp = grosimea peretelui, ~2.5 mm
pereti    = extrude(sil \ interior, H)   H = adâncimea cutiei
fund      = extrude(sil, Gf)             Gf = grosimea fundului, ~2 mm
cutia     = fund ∪ pereti.translate([0,0,Gf])
```

**Contra-formele se rezolvă singure.** La „A" sau „O", golul interior al literei nu face parte
din `sil`, deci nu apare nici în fund. Nu curge nimic prin el — e în afara cutiei. Peretele
înconjoară și conturul interior, iar cavitatea devine un canal inelar.

---

## Deciziile de produs pe care le iau, cu motive

### 1. Volumul util, afișat în mililitri

Cel mai valoros număr din toată aplicația și cel mai ieftin de calculat: volumul prismei
interioare. „Cutia ține 340 ml" e informație de vânzare, nu detaliu tehnic. Se pune în bara de
stare și în fișa de producție.

### 2. Detectarea literelor la care nu iese cutie

La „I", la fonturile subțiri sau la pereți groși, `sil.offset(-Wp)` poate ieși **gol sau rupt în
bucăți**. Utilizatorul ar primi un bloc plin fără să înțeleagă de ce.

Verificare obligatorie: dacă interiorul e gol sau are componente sub un prag de arie, se
avertizează explicit — „la această literă și grosime de perete nu rămâne interior utilizabil;
mărește litera sau subțiază peretele". Cu valorile concrete, nu generic.

### 3. Avertisment de etanșeitate

Fund cu model = **nu ține apă**. Pentru o cutie de flori asta contează. Când modelul e activ pe
fund, apare avertisment; când e activ doar pe pereți, nu.

### 4. Aderență la print

Fundul cu model are contact redus cu placa. Se semnalează în fișa de producție: recomandare de
brim. E genul de detaliu care se plătește în rebuturi dacă lipsește.

### 5. Modelul pe pereți — scopul realist

Pe **fund** e ușor: suprafață plană, exact tehnica din Litere Fagure.

Pe **pereți** e altă problemă. Un fagure adevărat pe un perete curb cere desfășurarea suprafeței
și reînfășurarea modelului — nu se face rezonabil cu operațiile disponibile.

Ce se face în schimb, și arată foarte bine:
- **benzi orizontale** — inele tăiate la înălțimi regulate
- **nervuri verticale** — prisme radiale
- **grilă** = ambele împreună

Cu pas și grosime reglabile, rezultatul e o cutie cu perete traforat, competitivă vizual.
Fagurele adevărat pe pereți rămâne pentru o versiune ulterioară, ca extindere, nu ca promisiune
nelivrată.

### 6. Buză de rigidizare la gură

Ultimii 2–3 mm de perete, îngroșați ușor spre exterior. Arată terminat și ține forma la cutii
înalte, unde peretele subțire se deformează. Opțional, implicit pornit.

---

## Parametrii din panou

| parametru | implicit | interval |
|---|---|---|
| literă, font, înălțime | ca la litere | — |
| adâncime cutie | 60 mm | 20–150 |
| grosime perete | 2.5 mm | 1.6–6 |
| grosime fund | 2 mm | 1.2–6 |
| model fund | fără | fără / fagure / triunghi / grilă |
| model pereți | fără | fără / benzi / nervuri / grilă |
| pas model | 8 mm | 4–20 |
| grosime element | 1.6 mm | 1–4 |
| buză de rigidizare | pornit | pornit / oprit |

---

## Verificări obligatorii

1. **Interior utilizabil** — nu gol, nu fragmentat. Cu mesaj care spune ce să schimbe.
2. **Grosime minimă** ≥ 2 extrudări (~0.85 mm) pe perete, fund și elemente de model.
3. **Conectivitate** — numărul de componente conexe rămâne cel al literei. Ca la Litere Fagure,
   **NU se folosește invariantul de genus**: modelul creează goluri prin proiect.
4. **Cutia e etanșă când n-are model** — verificare de volum: solidul închis, fără scurgeri.
5. **Încape pe placă** — cutiile sunt mari; verificarea există deja în nucleu, dar aici e
   regula, nu excepția.
6. **Alfabet** — toate literele × fonturi × cele două familii.

---

## Ordinea de implementare

1. **Schelet** — pagină, `AppDefinition`, card activat. Suita verde.
2. **Cutia plină** — pereți + fund + adâncime reglabilă. Plus volumul în ml și detectarea
   interiorului inexistent. Ăsta e deja un produs vandabil.
3. **Testele** de interior, grosime și etanșeitate, înainte de a adăuga modele.
4. **Model pe fund** — refolosind generatoarele din Litere Fagure, dacă aplicația aceea e gata;
   altfel se scriu aici și se mută în nucleu când există al doilea consumator.
5. **Model pe pereți** — benzi, nervuri, grilă.
6. **Buza de rigidizare**, panoul complet, fișa de producție cu volum și avertismente.

Fiecare pas: verificat în aplicație, suita verde, commit separat.

---

## Riscuri

**Timpul de calcul.** O cutie înaltă cu grilă pe pereți e cea mai grea geometrie din tot
proiectul. Se **măsoară** înainte de optimizat — precedent: la aplicația de litere, 94% din timp
stătea într-un singur loc, iar bănuiala inițială era greșită.

**Memorarea.** Pereții cu model depind doar de literă și de parametrii de model, nu de restul.
Se memorează pe cheie, ca rotunjirea de la litere.

---

---

## Destinația reală: iarbă și licheni artificiali — consecințe

Cutia se umple cu iarbă sau lichen artificial, iar **golurile din pereți există ca vegetația să
iasă prin ele și să se vadă**. Asta nu e decorațiune, e funcție. Schimbă trei lucruri.

### Golurile trebuie să fie MARI, nu fine

Un fagure de 8 mm cu pereți de 1.6 mm lasă deschideri de ~5 mm — prea mici, lichenul nu iese, se
vede doar un perete găurit. Pentru ca vegetația să iasă și să acopere peretele, deschiderea
utilă trebuie să fie de ordinul **10–18 mm**.

Deci la această aplicație modelul de perete nu e „textură", ci **traforare**: puține goluri mari,
nu multe mici. Implicit propus: deschidere 14 mm, nervură 3 mm.

### Fundul rămâne PLIN, implicit

Inversează recomandarea de mai sus. Buretele floral e ud, iar lichenul trebuie să stea pe ceva.
Fundul cu model devine opțiune secundară, nu implicită. Avertismentul de etanșeitate rămâne, dar
capătă context: fund plin = se poate uda buretele.

### Rezistența devine problemă reală

Un perete cu goluri de 14 mm e mult mai slab decât unul cu fagure fin, iar cutia se ține în mână
plină cu material umed. Trei măsuri, toate implicite:

- **bandă plină jos**, 8–10 mm de la fund — acolo se concentrează efortul și acolo stă apa
- **buză plină sus**, 5–6 mm — ține forma la gură, unde peretele se deschide
- **nervură minimă 2.5 mm** între goluri, nu 1.6 ca la modelele fine

Golurile se generează doar în banda dintre cele două, nu pe toată înălțimea.

---

## Restrângerea fonturilor la această aplicație

Cerută explicit, și e decizia corectă — dar o fac **măsurat, nu prin listă scrisă de mână**.

Motivul: peretele are 2.5 mm, banda plină jos și sus mănâncă din înălțime, iar golurile de 14 mm
au nevoie de perete lat. Un font cursiv subțire nu are unde să le primească: `sil.offset(-Wp)`
iese fragmentat, iar traforarea ar tăia peretele în bucăți.

**Cum se filtrează, automat:**

1. Pentru fiecare font, la litera și înălțimea curente, se calculează **lățimea minimă a
   trăsăturii**.
2. Fontul e oferit doar dacă trăsătura minimă ≥ `2×Wp + deschidere minimă`. Altfel nu are cum
   să iasă o cutie cu goluri.
3. Fonturile respinse nu dispar din listă — apar **gri, cu motivul**: „trăsătură 6.2 mm, sunt
   necesari 11 mm la această configurație". Utilizatorul înțelege ce să schimbe: literă mai
   mare, perete mai subțire, sau alt font.

Filtrarea e **dinamică**: dacă mărește litera de la 120 la 200 mm, fonturi respinse înainte devin
disponibile. O listă fixă ar minți în ambele sensuri.

**Grup „recomandate"** în selector, cu fonturile groase care merg la orice dimensiune
rezonabilă — ca utilizatorul să nu caute prin toate.

### Consecință pentru celelalte aplicații

Verificarea de lățime minimă a trăsăturii apare acum a treia oară: la brelocuri, la fagure și
aici. Când se scrie a doua oară, se mută în `core/` — conform regulii, mutarea în nucleu se face
la al doilea consumator, nu la primul.

## Ce NU se face în prima versiune

Capac · fagure adevărat pe pereți (cere desfășurarea suprafeței) · căptușeală interioară
separată pentru flori · compartimentări · text pe peretele exterior.
