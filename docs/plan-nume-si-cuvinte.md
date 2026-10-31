# Plan — „Nume 3D" și „Cuvinte Decor"

**Rescris la 2026-08-01**, după o observație corectă a utilizatorului: prima versiune trata
contactul între litere ca marea necunoscută. La fonturi cursive nu e o necunoscută — e deja
rezolvat. Vezi „Ce s-a corectat" la final.

---

## Produsele, cum sunt descrise pe landing

**Nume 3D** — „Numele întreg în cursiv, ca obiect de sine stătător. Contur colorat, litere
legate, stă singur în picioare."

**Cuvinte Decor** — „Cuvinte întregi cu literele lipite. Un simbol — inimă, stea, casă — în
locul unei litere."

---

## Nume 3D e, în esență, scrisul din Litere Decor extrudat

Generarea de text multi-caracter există și e testată. Măsurat, componente conexe pe fonturi
cursive:

```
GreatVibes „matei"      2
GreatVibes „Ianis"      3
GreatVibes „Mădălina"   5
```

Cele 2, 3, 5 **nu sunt litere despărțite** — sunt punctul de pe „i" și diacriticele. Corpul
cuvântului e deja o singură bucată, fiindcă literele cursive se leagă natural.

Pentru punctele și diacriticele care plutesc **există deja mecanismul de punți** din modul
relief (`reliefContactBridges`): le leagă automat de litera cea mai apropiată. Al doilea
consumator, deci se mută în `core/`.

**Ce se refolosește, aproape neschimbat:** generarea textului · punțile · verificarea de
stabilitate · detectarea glifelor lipsă · aranjarea pe plăci · exportul · fișa de producție.

### Ce e nou la Nume 3D

**1. Conturul colorat.** Aceeași tehnică din brelocuri: silueta cuvântului dilatată cu R,
netezită prin `offset(+S).offset(-S)`, extrudată — a doua culoare, sub sau în jurul numelui.
Netezirea e obligatorie, altfel colțurile interioare dintre litere dau crestături.

Două variante de construcție, de ales:
- **contur ca placă în spate** — numele stă pe o placă profilată, ca la brelocuri
- **contur ca ramă în jur** — bandă care urmează conturul, în plan cu numele

Recomandat prima: mai simplă, mai rigidă, și dă suprafață de sprijin.

**2. Grosimea de sine stătător.** 30–40 mm în loc de 4.5. Doar un parametru, dar schimbă
verificarea de stabilitate din informativă în blocantă.

**3. Lungimea față de placă.** „Alexandra" la 80 mm depășește 256 mm. **Singura bucată cu
adevărat grea.** Două opțiuni, decizie de produs:
- limitezi dimensiunea și spui utilizatorului cât încape
- tai în segmente cu îmbinare mecanică, la limita dintre litere

Prima e livrabilă imediat. A doua e o etapă separată, nu o funcție.

### Contactul, redus la ce e

Doar pentru **fonturi drepte**, unde literele chiar nu se ating. Aplicația măsoară distanța
minimă între perechi vecine și, dacă e mai mare ca zero, propune: apropiere prin kerning negativ,
punte automată, sau pur și simplu **schimbă fontul cu unul cursiv**.

Ultima variantă e adesea răspunsul corect și nu costă nimic de implementat — un avertisment.

---

## Cuvinte Decor

Pornește de la Nume 3D. Adaugă un singur lucru, dar central.

**Substituția de simboluri.** Constatarea din [roadmap.md](roadmap.md) rămâne validă: **niciun
font instalat nu are glifa ♥** (U+2665) sau ❤ (U+2764). Inima nu se obține din contur de font.

Consecința: contractul intern nu mai poate fi „un caracter → o glifă", ci **„o poziție în cuvânt
→ un solid, provenit fie dintr-o glifă, fie dintr-un fișier"**. Restul lanțului — contur, punți,
stabilitate, export — funcționează identic în ambele cazuri.

**Decizia de luat la implementare:** metricile tipografice ale unui simbol adus din fișier —
lățimea de avans, linia de bază, înălțimea. Un STL nu le are.

Recomand **declarate în manifest**, nu derivate din bounding box. O inimă așezată corect pe linia
de bază, la mărimea potrivită față de literele vecine, nu iese din bbox — iese din trei numere
scrise o dată, la adăugarea simbolului în bibliotecă.

---

## Verificări obligatorii

1. **O singură componentă conexă**, după punți. Verificarea care contează cel mai mult.
2. **Punți ≥ 2 extrudări**, altfel se rup la manipulare.
3. **Stabilitate** — aria de sprijin peste prag; la Nume 3D **blochează exportul**, nu doar
   avertizează.
4. **Încape pe placă** — cu mesaj care spune cât încape, nu doar că nu încape.
5. **Glife lipsă** — la Cuvinte Decor, un caracter fără glifă și fără simbol blochează exportul.
6. **Cuvinte, nu litere** — testul de alfabet se extinde la combinații de 3–6 caractere pe toate
   fonturile, verificând componenta unică.

---

## Ordinea de implementare

1. **Schelet Nume 3D** — text, font cursiv, înălțime, grosime 30–40 mm. Refolosind generarea
   existentă. Deja arată produsul.
2. **Punțile** pentru puncte și diacritice, mutate în `core/`. Plus verificarea de componentă
   unică.
3. **Conturul colorat** — tehnica din brelocuri.
4. **Stabilitatea** ca blocaj, și avertismentul de lungime.
5. **Cuvinte Decor** — pornește de la 1–4, adaugă substituția de simboluri și manifestul de
   metrici.
6. **Segmentarea pentru placă** — abia dacă se dovedește necesară în practică.

---

## Ce s-a corectat față de prima versiune

Prima versiune propunea **trei strategii de contact ca fundație** a aplicației. Era
supra-inginerie: la fonturile cursive, care sunt tocmai cele folosite pentru nume, literele se
leagă singure, iar punctele și diacriticele au deja soluție în cod.

Contactul rămâne, dar ca **opțiune pentru fonturi drepte**, nu ca temelie. Efortul se mută unde
chiar e: conturul colorat, stabilitatea la 40 mm grosime, și lungimea față de placă.

Observația a venit de la utilizator, cu întrebarea corectă: „dacă scrisul de la Litere Decor
încape, de ce nu folosim scrisul ăla, îngroșat?"

---

## Ce NU se face în prima versiune

Mai multe rânduri · curbarea cuvântului pe arc · simboluri desenate în aplicație · îmbinare
între segmente altfel decât mecanică.
