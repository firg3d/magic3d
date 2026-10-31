# Plan — aplicația „Brelocuri"

Punct de pornire pentru a doua aplicație. Scris înainte de prima linie de cod, ca să nu
depindă de memoria unei conversații.

Stare la momentul scrierii: aplicația de litere e auditată și stabilă, comit `054e5ba`.

---

## Produsul

Breloc dintr-o singură literă, culcat, gata de printat:

- **plăcuța** — conturul literei dilatat și netezit, extrudat ~3 mm, în culoarea 1
- **litera** — deasupra plăcuței, ~1.8 mm relief, în culoarea 2
- **gaura de inel** — străpunsă prin plăcuță, sus

Referință vizuală: brelocuri „bubble letter", literă albă pe plăcuță roz/verde/piersică.

**O singură literă**, nu cuvinte. Asta simplifică mult: nu e nevoie de union între siluete
înainte de dilatare.

---

## Unde se leagă

```
brelocuri.html            -> <script type="module" src="/src/apps/brelocuri/main.ts">
src/apps/brelocuri/       -> aplicația nouă, folder propriu
landing.html              -> cardul „Brelocuri" devine activ (acum: „Indisponibil încă")
```

`isolation.test.ts` impune mecanic separarea: fiecare aplicație are exact o pagină, nucleul nu
importă din aplicații, o aplicație nu importă din alta. **Aplicația de litere nu se atinge.**
Dacă se atinge din greșeală, suita pică.

---

## Ce se refolosește din nucleu, fără nicio modificare

Viewport și gizmo · unelte de mutare/rotire/scalare · rigla de măsurare · manualul de
utilizare · preseturi · identitatea firmei · export 3MF cu culori per corp · gruparea
„mai multe corpuri = o singură piesă fizică" · aranjarea pe plăci · fișa de producție.

Din aplicația de litere se **copiază** (nu se importă — izolarea interzice):
`textSolid.ts` pentru solidul din font.

---

## Geometria

```
sil       = silueta literei (proiecția solidului din font)
contur    = sil.offset(+R, 'Round')                    R ≈ 5 mm, lățimea plăcuței
neted     = contur.offset(+S).offset(-S)               S ≈ 2 mm, închide crestăturile
placuta   = extrude(neted, Gp)                         Gp ≈ 3 mm
litera    = extrude(sil, Gl).translate([0,0,Gp])       Gl ≈ 1.8 mm
gaura     = cilindru Ø Dg, străpuns prin plăcuță       Dg ≈ 3.5 mm
```

**Netezirea e esențială.** O dilatare simplă păstrează fiecare colț interior al literei; la „A"
sau „R" ies crestături urâte. Dilatare urmată de retragere le închide și dă forma curgătoare
din poză.

### Poziția găurii

Nu fixă. Se caută automat: sus, pe axa de simetrie a plăcuței, coborâtă până când
**gaura nu atinge litera** și **peretele până la marginea plăcuței rămâne ≥ 2 mm**.
Dacă nu există poziție validă (literă foarte înaltă, plăcuță subțire), se avertizează în loc
să se taie prin literă.

---

## Verificări obligatorii (aceeași disciplină ca la litere)

1. **Gaura nu atinge litera** — coliziune 0 între cilindru și corpul literei.
2. **Perete minim** de la gaură la marginea plăcuței ≥ 2 mm.
3. **Trăsătura minimă a literei** ≥ 2 extrudări (~0.85 mm la duză 0.4). Sub atât iese zimțat.
4. **Genus neschimbat** de gaură, în afară de gaura însăși.
5. **Alfabet** — toate literele × fonturile disponibile produc geometrie validă.

Fiecare devine aserțiune într-un test permanent, nu verificare manuală.

---

## Decizia deschisă: o piesă sau două

**Recomandat: o singură piesă, cu schimbare de culoare.** Plăcuța și litera se exportă ca două
corpuri cu culori diferite, marcate cu același `grup` — mecanismul există deja și e folosit la
baza de vinil. Zero lipit, zero joc, zero piese pierdute.

Alternativa (literă separată, lipită în locaș) dă muchii mai curate dar înseamnă lipit la
fiecare bucată. La serie, nu se justifică.

**Dacă nu se decide altfel, se implementează varianta cu schimbare de culoare**, iar lipirea
rămâne opțiune adăugată ulterior — e mai ușor de adăugat un joc de inserție decât de scos.

---

## Parametrii din panou

| parametru | implicit | interval |
|---|---|---|
| literă | A | caracterele pe care le are fontul |
| font | de ales | din biblioteca existentă |
| înălțime literă | 40 mm | 20–80 |
| lățime plăcuță | 5 mm | 2–15 |
| netezire contur | 2 mm | 0–6 |
| grosime plăcuță | 3 mm | 1.5–6 |
| relief literă | 1.8 mm | 0.6–4 |
| diametru gaură | 3.5 mm | 2–6 |
| culoare plăcuță / literă | — | paleta existentă |

---

## Ordinea de implementare

1. **Schelet** — `brelocuri.html`, `src/apps/brelocuri/main.ts`, contractul `AppDefinition`,
   cardul din landing activat. Suita trebuie să treacă, inclusiv izolarea.
2. **Geometria de bază** — plăcuță + literă, fără gaură. Verificat în aplicație.
3. **Gaura**, cu poziționare automată și cele două verificări de siguranță.
4. **Panoul** cu parametrii de mai sus.
5. **Export** — două corpuri, același grup, culcate. Fișa de producție se generează deja.
6. **Teste permanente** — cele cinci verificări, plus alfabetul.

Fiecare pas: verificat în aplicație, suita verde, commit separat.

---

## Ce NU se face în prima versiune

Decorațiuni/tematici pe breloc (cardul din landing le pomenește, dar sunt etapă ulterioară) ·
mai multe litere · text pe spate · inel modelat, nu doar gaură.
