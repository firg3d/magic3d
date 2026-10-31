# Reguli de lucru — Magic3D

Reguli scrise **după ce au fost încălcate**, fiecare cu costul care le-a produs. Nu sunt
principii generale; sunt cicatrici.

---

## Nucleul nu decide constrângeri de produs

O funcție din `core/` care alege o limită în locul aplicației e un bug de design, nu o comoditate.

`limitePunte` a primit o reîncercare adaptivă cu plafon 3.2, cablat în nucleu. A reparat Cuvinte
Decor și a stricat Nume 3D — 17 eșecuri, „punte de 28.88 mm, peste limita de 26.3". Ambele cerințe
erau legitime și incompatibile: la Cuvinte Decor literele **trebuie** să se atingă, la Nume 3D o
punte lungă e o bară slabă prin aer.

Compromisul — limita cea mai strictă — ar fi fost aceeași greșeală în direcția opusă. Soluția e ca
apelantul să declare: `factorMaxPunte` vine din configurația aplicației. `litere` făcea deja asta
corect, cu `PUNTE_DISTANTA_MAX` propriu.

**Regulă:** dacă o funcție din nucleu conține un prag care ar putea fi diferit pentru alt produs,
pragul e parametru, nu constantă.

## Orice atingere de nucleu rulează suitele tuturor consumatorilor

Nu doar pe cea pentru care faci modificarea.

```bash
grep -rn "numeFunctie" src/ --include=*.ts     # cine o folosește, înainte de a o schimba
```

Regresia de mai sus a fost comisă cu suita Cuvinte Decor verde. Nume 3D n-a fost rulat.

## Valorile de afișaj nu se folosesc în aserțiuni

`diagnostice.dim` e rotunjit la 0.1 mm — e pentru interfață. Folosit într-o comparație de
încadrare, a acuzat aplicația de prudență pentru o piesă care depășea placa cu sutimi. Aplicația
avea dreptate; testul măsura altceva.

Periculos mai ales la **praguri**: o valoare rotunjită trecută printr-un `>=` eșuează exact la
limită, adică fix unde contează.

**Regulă:** în teste măsoară din geometrie, nu din câmpurile raportate pentru afișare.

## `decompose().length` nu e un număr de piese

Numără și cioburi de 0.18 mm² lângă o glifă de 9 000 mm². A trimis pe piste greșite de trei ori
într-o zi: la brelocuri („piesa se rupe" — nu se rupea), la o reuniune care părea imposibilă, la
fagure („litera are 3 bucăți" — avea una).

**Regulă:** filtrează după arie înainte de a număra. `ASCHIE_MAX` există deja în proiect.

## Potrivirea pe subșir într-un catalog care crește

`FONTS.find(x => x.includes('Baloo2'))` alegea Baloo2-Regular când era singurul. După ce catalogul
a ajuns la 440 de fonturi, alege Baloo2-500 — altă greutate, alt rezultat. `FONTURI_EXTREME` cu
același tipar a crescut de la 2 la 14 fonturi și a epuizat heap-ul WASM.

Nu dă niciodată eroare. Doar începe să testeze altceva decât credeai.

**Regulă:** numește fișierul exact. Dacă selecția e o felie (vezi `PARTE`), caută în lista
completă, nu în felie.

## Obiectele manifold sunt handle-uri WASM

Memoria lor nu e atinsă de GC-ul JS; se eliberează doar prin `.delete()`. Simptomul unei scurgeri
nu e „crapă", ci **„modelul nu se actualizează"**: reconstrucția aruncă și pe ecran rămâne
geometria veche.

Vezi `core/geometry/arena.ts`. Contorul se citește din consolă cu `__shell.contorArena()` și
trebuie să rămână aproape de 0 între reconstrucții.

Heap-ul WASM **nu se micșorează niciodată**. Ce rămâne după ce ai eliberat tot e fragmentare, iar
împotriva ei niciun `.delete()` nu ajută — singura soluție e mai puțină muncă per proces.

## Suita se citește integral

`npm test` rulează toate suitele și raportează la final; nu se oprește la prima picată. Un test
care **crapă** (semnal) e altceva decât unul care **pică** (aserțiune) — rulatorul le distinge.

Nu filtra ieșirea prin `grep` înainte de commit. S-a comis de două ori cu suita roșie exact așa.

## Modificările de cod nu se fac în comenzi de fundal

Un patch rulat într-un lanț backgrounded a eșuat tăcut, iar `git add` n-a avut ce lua: a rezultat
un commit care descria o reparație inexistentă. Aplică schimbarea, **verifică în fișier că e
acolo**, apoi mergi mai departe.

## Limba

Româna e limba primară. Tot textul vizibil trece prin `src/core/i18n/ro.json`; un test interzice
diacriticele în literalii `.ts`. Consecință: un text compus într-un `.ts` va ieși fără diacritice
în interfață — a scăpat o dată așa, „Licenta Comerciala" în bara de jos.
