# Cotele telefoanelor — de completat din ghidul Apple

> Generat de `scripts/genereaza-telefoane.mjs`. **Nu se editează de mână**: se completează
> fișierele JSON din `date/telefoane/apple/`, iar tabelul ăsta e doar foaia de transcriere.

Sursa: **Apple Accessory Design Guidelines**, secțiunile *Device Dimensional Drawings* și
keep-out-uri. Document public, nu cere cont MFi.

**Regula de aur (B.2):** nicio cotă nu se inventează și nu se deduce din altă sursă. Un model cu
cote incomplete nu apare în interfață. Un model complet dar cu `verificat: false` apare cu
eticheta „din desenele Apple, neverificat fizic".

Toate cotele în **mm, cu două zecimale**. Sistem de coordonate: originea în centrul spatelui,
**X** spre dreapta **privit din spate**, **Y** în sus, **Z** spre exterior.

Trei convenții stabilite la completarea piloților, ca să nu se mai deducă de fiecare dată:

1. **Lentilele și blițul sunt în coordonate GLOBALE**, aceeași origine ca insula — nu față de
   centrul insulei. La iPhone SE se vede direct: centrul lentilei e identic cu al insulei.
2. **`butoane[].latura` e tot privit din spate.** Butoanele de volum, care privite din față sunt
   pe stânga, apar pe **dreapta**. Dacă interfața vrea „stânga/dreapta" din față, se inversează
   la afișare, nu în date.
3. **Sursa e desenul cotat per dispozitiv**, de la developer.apple.com/accessories/dimensional-drawings
   — nu „Accessory Design Guidelines", care nu mai conține desene. De-aia `sursa` are și `fisier`
   (numele PDF-ului) și `foaie` (ce foaie și ce detalii); un număr de pagină singur nu duce înapoi
   la sursă.

**Modelele-pilot pentru OPRIRE 2** sunt marcate cu ★: iPhone 15, iPhone 15 Pro, iPhone 16,
iPhone SE (a 3-a generație). Cu ele se fac primele rame de probă.

---

## 1. Corp, ecran, insulă, port

Câmpuri cu valori din listă:
- `corp.profilMargine`: `plat` sau `curbat`
- `insulaCamera.forma`: `patrat`, `pilula-verticala`, `bara-lata` sau `lentila-simpla`
- `port.tip`: `usb-c` sau `lightning`

| model | profil | formă insulă | tip port | lungime | lățime | grosime | rază colț | rază muchie | grosime max husă | inel X | inel Y | inel Ø | ecran iese | insulă X | insulă Y | insulă lățime | insulă înălțime | insulă rază | insulă iese | port X | port lățime | port înălțime |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| iPhone 12 mini |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
| iPhone 12 |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
| iPhone 12 Pro |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
| iPhone 12 Pro Max |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
| iPhone 13 mini |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
| iPhone 13 |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
| iPhone 13 Pro |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
| iPhone 13 Pro Max |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
| iPhone 14 |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
| iPhone 14 Plus |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
| iPhone 14 Pro |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
| iPhone 14 Pro Max |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
| ★ iPhone 15 |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
| iPhone 15 Plus |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
| ★ iPhone 15 Pro |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
| iPhone 15 Pro Max |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
| ★ iPhone 16 |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
| iPhone 16 Plus |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
| iPhone 16 Pro |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
| iPhone 16 Pro Max |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
| iPhone 16e |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
| iPhone 17 |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
| iPhone 17 Pro |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
| iPhone 17 Pro Max |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
| iPhone Air |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |
| ★ iPhone SE (a 3-a generație) |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |

**Ce înseamnă fiecare coloană**

- **lungime** (`corp.lungime`) — mm — cota mare a corpului
- **lățime** (`corp.latime`) — mm
- **grosime** (`corp.grosime`) — mm — fără proeminența camerei
- **rază colț** (`corp.razaColt`) — mm — raza colțului conturului
- **rază muchie** (`corp.razaMuchie`) — mm — racordul dintre spate și laterală
- **grosime max husă** (`corp.grosimeMaxHusaSpate`) — mm — cât acceptă Apple pe spate; peste ea, avertisment, nu blocare
- **inel X** (`corp.zonaIncarcare.x`) — mm — centrul inelului de încărcare magnetică
- **inel Y** (`corp.zonaIncarcare.y`) — mm
- **inel Ø** (`corp.zonaIncarcare.diametru`) — mm — grosimea maximă se verifică DOAR în cercul ăsta
- **ecran iese** (`ecran.proeminentaFataDeCorp`) — mm — cât iese sticla peste ramă; 0 dacă e la nivel
- **insulă X** (`insulaCamera.x`) — mm — centrul insulei față de centrul spatelui, + spre dreapta
- **insulă Y** (`insulaCamera.y`) — mm — + în sus
- **insulă lățime** (`insulaCamera.latime`) — mm
- **insulă înălțime** (`insulaCamera.inaltime`) — mm
- **insulă rază** (`insulaCamera.razaColt`) — mm
- **insulă iese** (`insulaCamera.proeminenta`) — mm — cât iese insula din spate
- **port X** (`port.x`) — mm — 0 = centrat
- **port lățime** (`port.latime`) — mm
- **port înălțime** (`port.inaltime`) — mm

---

## 2. Liste (lungime variabilă)

Astea nu încap într-un rând per model, fiindcă fiecare telefon are alt număr de lentile și de
butoane. Se completează direct în JSON, în listele respective.

### Lentile — `insulaCamera.lentile`

| model | x | y | diametru | proeminentaSuplimentara | con.unghi | con.distanta | con.referinta |
|---|---|---|---|---|---|---|---|
| _(un rând per element)_ |   |   |   |   |   |   |   |

### Butoane — `butoane`

| model | tip | latura | y | lungime | latime | acoperibil | keepout.latime | keepout.inaltime | keepout.subtire.latime | keepout.subtire.inaltime |
|---|---|---|---|---|---|---|---|---|---|---|
| _(un rând per element)_ |   |   |   |   |   |   |   |   |   |   |

### Decupaje jos — `decupajeJos`

| model | tip | x | latime |
|---|---|---|---|
| _(un rând per element)_ |   |   |   |

### Decupaje sus — `decupajeSus`

| model | tip | x | latime |
|---|---|---|---|
| _(un rând per element)_ |   |   |   |

### Zone interzise — `keepOut`

| model | nume | x | y | latime | inaltime | motiv |
|---|---|---|---|---|---|---|
| _(un rând per element)_ |   |   |   |   |   |   |

**Valori din listă:**
- `lentile[].con.referinta` și `blit.con.referinta`: `sticla-fata` sau `sticla-spate` —
  de la ce suprafață se măsoară `distanta`. Jeton închis, nu text liber.
- `con.unghi` e cel **interior** acolo unde desenul dă două (blițul are și unul exterior, mai
  larg); exteriorul rămâne în `note`, fiindcă buza e constrânsă de cel interior.
- `butoane[].tip`: `pornire`, `volum+`, `volum-`, `actiune`, `mut`, `camera-control`
- `butoane[].latura`: `stanga` sau `dreapta`
- `butoane[].acoperibil`: `true` dacă husa îl poate acoperi cu perete subțiat (TPU) în loc de
  decupaj. **Camera Control se tratează implicit ca decupaj** — are suprafață tactilă.
- `decupaje*[].tip`: `difuzor` sau `microfon`

---

## 3. Sursa, pentru fiecare model

Obligatoriu, altfel modelul nu se publică:

- `sursa.versiune` — versiunea ghidului (ex. „Release R18")
- `sursa.pagina` — pagina de unde ai luat desenul
- `verificat` — rămâne `false` până la măsurarea fizică în atelier
- `verificatLa` — data măsurării, când `verificat` devine `true`

---

## 4. Cum verifici ce ai completat

```bash
npm run verifica:telefoane
```

Spune care modele sunt complete, care incomplete și care au erori de consistență (insula nu
încape în corp, lentilele nu încap în insulă, butoane suprapuse pe aceeași latură). Cotele
lipsă sunt raportate ca **incomplete**, nu ca erori — încă nu s-au completat, nu sunt greșite.
