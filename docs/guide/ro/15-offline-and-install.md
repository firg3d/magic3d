---
title: Instalarea ca aplicație, lucrul offline și găzduirea proprie
summary: Pornește Magic3D ca pe un program obișnuit, chiar și fără rețea, și află cum îl rulezi pe propriul calculator.
---

## Instalarea ca aplicație

Magic3D poate fi instalat ca un program obișnuit. Primește atunci o pictogramă și o fereastră proprie, fără bară de adrese. După prima vizită pornește chiar și **fără internet**. Proiectele tale rămân pe calculatorul tău. Instalarea merită: aplicația pornește mai repede, pentru că nu trebuie încărcată din nou de fiecare dată, funcționează fără internet și scutește serverul. Nu pierzi nimic, fiindcă Magic3D îți spune în continuare când apare o versiune nouă. Asta îți protejează și proiectele: Safari pe Mac, pe iPhone și pe iPad șterge datele stocate ale unui site care n-a fost vizitat timp de șapte zile, dar nu și pe ale unei aplicații instalate.

Pe pagina de start apare un indiciu cu {{ui:installHint.install}} dacă browserul tău poate face asta. Altfel:

- **Chrome și Edge:** Dă clic pe pictograma de instalare din dreapta barei de adrese sau alege „Instalează ca aplicație" din meniul browserului.
- **Safari pe Mac:** Meniul „Fișier", apoi „Adaugă în Dock".
- **Safari pe iPhone și iPad:** Pictograma de partajare, apoi „Adaugă pe ecranul principal".
- **Firefox:** nu poate instala aplicații. Magic3D pornește totuși offline într-o filă.

Poți închide indiciul de pe pagina de start cu {{ui:installHint.dismiss}}. Dacă pornești a doua oară aplicația instalată în Chrome sau Edge, fereastra deschisă vine în față în loc să se deschidă alta.

Pe un calculator, Magic3D instalat în Chrome sau Edge se înregistrează și ca program pentru fișierele `.lyl`: un dublu clic pe un proiect în managerul de fișiere îl deschide în Magic3D, iar [[Ctrl]]+[[S]] salvează înapoi în acel fișier. Pe Android asta nu funcționează, acolo browserul nu oferă asocierea fișierelor pentru aplicațiile web instalate; deschide un proiect cu {{ui:dashboard.importGeometry}} de pe pagina de start.

## Actualizări

Când există o versiune mai nouă, Magic3D o arată pe pagina de start. Prin {{ui:dashboard.updateBannerLink}} citești ce s-a schimbat. Numărul versiunii e în dreapta jos. După ce reîncarci pagina, ai versiunea nouă.

Pe magic3d.ro și pe alte servere web, o pagină deschisă observă singură o actualizare. Își întreabă din când în când serverul ce versiune are, când revii în filă, și imediat dacă a dispărut un fișier de program de care are nevoie. Când între timp s-a instalat ceva nou, un card din dreapta jos îți spune asta și listează noutățile. {{ui:newVersion.reload}} scrie întâi în browser proiectul deschis și apoi reîncarcă pagina; proiectul revine cum l-ai lăsat. {{ui:newVersion.later}} amână cardul cu 15 minute. Reîncarcă repede: o pagină care rămâne pe versiunea veche poate încărca părți din cea nouă care nu se potrivesc. Același card apare când s-a întâmplat deja asta: procesele CAD de fundal (workerii), care se încarcă doar când ai prima dată nevoie de ele, spun din ce build provin, iar dacă nu e cel al paginii - după o actualizare sau cu o copie stocată a unei versiuni mai vechi - cardul cere o reîncărcare înainte ca cele două să nu se mai înțeleagă între ele.

Când Magic3D e deschis în mai multe file, ele au grijă una de alta: dacă altă filă rulează deja o versiune mai nouă, o notă în partea de jos a filei vechi îți cere s-o reîncarci. Iar dacă același proiect e deschis în două file, amândouă te avertizează, pentru că salvează automat și s-ar suprascrie una pe alta. Dacă deschizi Magic3D într-o filă în plus când unul e deja deschis, fila nouă îți sugerează să continui în cea veche și se oferă să se închidă singură. Dacă vrei intenționat două file, de exemplu pentru două proiecte unul lângă altul, dă clic acolo pe {{ui:tabs.keepHere}}. Și acest ghid se deschide într-o filă proprie: cât timp Magic3D e deschis lângă el, butonul lui din dreapta sus arată „Înapoi la editor" și închide ghidul în loc să deschidă editorul a doua oară.

## Limba și aspectul

Limba o alegi în dreapta sus, din lista de limbi. Schema de culori de lângă ea oferă {{ui:theme.short.system}} (urmează sistemul de operare), {{ui:theme.short.light}}, {{ui:theme.short.dark}} și {{ui:theme.short.graphite}}, un gri închis neutru.

## Rularea pe propriul calculator

Magic3D e software liber (AGPL-3.0) și poate fi rulat pe propriul calculator sau server, de exemplu într-un atelier, un club sau o școală. Există mai multe variante, descrise în [README pe GitHub](https://github.com/firg3d/magic3d/blob/main/README.md):

- **Export static:** Rezultatul sunt fișiere simple pe care le poate servi orice server web. Locul lor e la rădăcina unei adrese (`https://magic3d.example.com/` sau `http://192.168.0.5:8080/`), nu într-un subdosar și nu deschise de pe disc; pașii sunt în README. Cu un dosar `store` în care se poate scrie, lângă `index.html`, și cu PHP pe server, devine și stocarea comună pentru proiecte.

## Ajutor și feedback

- În editor, zona {{ui:editor.group.help}} conține {{ui:editor.guide}}, cu cele mai importante mișcări, și lista [scurtăturilor de tastatură](chapter:shortcuts). Fiecare secțiune a ghidului rapid are un semn al întrebării care duce la capitolul potrivit de aici.

![Ghidul rapid din editor. Videoclipurile făcute de alții sunt listate sus, iar fiecare secțiune are un semn al întrebării.](shot:quick-guide)

- Ce s-a schimbat în fiecare versiune găsești în notele de versiune, din partea de jos a paginii de start și a editorului.
