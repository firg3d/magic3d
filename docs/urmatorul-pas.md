# Următorul pas — unificarea `textSolid`

Predare către o sesiune nouă. Scris la `420a787`, când contextul sesiunii curente s-a epuizat.

> ## ✅ FĂCUT la 2026-08-01
>
> O singură copie, în `core/geometry/textSolid.ts`. Cele 14 linii erau **o reparație reală**
> (banda de sanitate pe `sCapHeight`), nu o adaptare de aplicație — au intrat în versiunea
> unificată. `brelocuri` și `fagure` erau deja identice între ele la nivel de cod; singura
> diferență era antetul comentariului.
>
> Ce a ieșit la iveală pe parcurs: **testul de alfabet nu putea confirma nimic**, fiindcă
> oracolul lui își calcula scara la fel ca `textSolid`, deci eroarea se simplifica. Cu bug-ul
> reintrodus intenționat, Courgette trecea cu ✓ pe toate cele 42 de caractere. S-a adăugat o
> verificare separată, de înălțime măsurată pe solidul final; ea îl prinde (5,20×).
>
> Restul documentului rămâne valabil.

---

## Ce se cere

**Unificarea celor trei copii de `textSolid.ts` într-una singură, în `core/geometry/`.**

## Starea la momentul scrierii

Trei copii, care **au divergit deja**:

```
src/apps/litere/textSolid.ts
src/apps/brelocuri/textSolid.ts      14 linii diferite față de litere
src/apps/fagure/textSolid.ts         nediferențiat încă
```

Fișierul are ~633 de linii și conține **clasificarea contur/gaură** — cea mai fragilă bucată de
geometrie din proiect, reparată de trei ori (vezi „Datorie tehnică" în [roadmap.md](roadmap.md)).

## De ce e urgent

La fiecare aplicație nouă apare o copie. O reparație de font ajunge într-una și lipsește din
celelalte, **fără ca nimeni să observe** — fiecare aplicație are propriul test de alfabet, care
trece pe copia ei.

## Condiții înainte de a începe

1. Arborele **curat**, nicio modificare necomisă (altă sesiune poate lucra în paralel).
2. Fiecare aplicație are testul ei de alfabet și **trece**.
3. Nicio altă sesiune nu lucrează simultan la `core/` sau la aplicațiile atinse.

## Ordinea corectă

**Pasul 1 nu e mutarea, e diff-ul.** Se compară cele trei copii și se decide, împreună cu
utilizatorul, ce intră în versiunea unificată. Cele 14 linii pot fi:
- o îmbunătățire reală făcută în brelocuri, care trebuie păstrată, sau
- o adaptare specifică aplicației, care nu are ce căuta în nucleu.

**Nu se ghicește pe fișierul ăsta.**

Apoi: o singură copie în `core/geometry/`, importurile actualizate în toate aplicațiile, testul
de alfabet rulat **pentru fiecare aplicație în parte**, commit unic.

## Ce NU se mută încă

Verificarea de **lățime minimă a trăsăturii** apare în planurile a trei aplicații (brelocuri,
fagure, cutii), dar nu există încă niciun apelant real. Se scrie local în prima aplicație care
o folosește; se mută la al doilea consumator, nu înainte.

Când se mută: doar măsurătoarea (`latimeMinimaSiluetei(sil) -> mm`, prin căutare binară pe
`offset(-r)`), **nu pragurile și nu mesajele** — fiecare aplicație judecă altfel același număr.

---

## Alte lucruri agreate, neîncepute

| ce | unde e descris |
|---|---|
| Comutator de produs lângă logo | [roadmap.md](roadmap.md), secțiune dedicată |
| Bilingv RO / EN cu comutator | [roadmap.md](roadmap.md), secțiune dedicată |
| Aplicația Cutii Litere | [plan-cutii-litere.md](plan-cutii-litere.md) |
| Împachetare Windows + notificare de update | discutat, nescris — vezi mai jos |

### Împachetare, pe scurt (nescris încă într-un plan)

Tauri preferat Electron (10 MB vs 180). Update prin **reinstalare**, ca la Bambu: un
`versiune.json` pe un server, verificat la pornire cu timeout scurt, eșec în tăcere fără
internet, popup o singură dată per versiune.

**Condiție blocantă înainte de împachetare:** biblioteca de tematici, fonturi, baze, preseturi
și setări trebuie mutată din `public/` într-un folder de utilizator (`%APPDATA%`). Instalatorul
șterge folderul aplicației — tematicile adăugate manual s-ar pierde la fiecare actualizare.

Licențiere: **după** primele vânzări, nu înainte. Fișier semnat, fără server, e suficient la
început.
