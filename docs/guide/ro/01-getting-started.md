---
title: Primii pași
summary: De la o foaie goală la prima ta piesă pentru imprimanta 3D, în cinci minute, fără cont și fără nimic de instalat.
---

Magic3D este un program de proiectare pentru printare 3D care rulează direct în browser. Construiești o piesă din forme simple, faci găuri în ea, îi rotunjești muchiile și o trimiți în slicer. Nu ai nimic de instalat și nu trebuie să te înregistrezi. Ce construiești rămâne pe calculatorul tău.

![Pagina de start Magic3D: „Creează un proiect 3D nou" sus, proiectele tale și ghidul rapid dedesubt.](shot:start-page)

## Crearea unui proiect

Deschide [magic3d.ro](https://magic3d.ro/). Pe pagina de start, dă clic pe {{ui:dashboard.createDesign}}. Editorul se deschide cu un plan de lucru gol, grila pe care prinde formă totul.

Dacă ai deja un fișier pe care vrei să-l continui, folosește {{ui:dashboard.importGeometry}}. Merge atât pentru proiecte Magic3D (`.lyl`), cât și pentru fișiere STL, OBJ, 3MF, STEP sau SVG.

Toate proiectele tale apar apoi pe pagina de start, cu o imagine de previzualizare. Sunt păstrate în spațiul de stocare al browserului și se salvează automat după fiecare modificare, așa că nu există buton de salvare. **Magic3D nu își asumă nicio răspundere pentru proiectele păstrate în browser.** Un browser se poate strica sau o actualizare a lui poate crea probleme, așa că fă din când în când o copie de siguranță a proiectelor cu {{ui:dashboard.backupAll}} de pe pagina de start sau salvează-le ca fișiere. O copie de siguranță se recuperează cu {{ui:dashboard.restoreBackup}}. Cum împachetezi proiectele într-un fișier și cum le dai mai departe afli în [Fișiere și salvare](chapter:files-and-saving). Dacă vrei un memento, activează {{ui:workspace.confirmTabClose}} în setări (rotița dințată din panglică): browserul te întreabă atunci înainte să închidă sau să reîncarce o filă cu un proiect deschis.

## Editorul pe scurt

![Editorul cu două forme pe planul de lucru. Panglica sus, comenzile camerei în stânga, setările formei selectate în dreapta.](shot:editor-overview)

- **Sus** se află panglica. E ordonată după sarcini: {{ui:editor.group.clipboard}}, {{ui:editor.group.history}}, {{ui:editor.group.shapes}}, {{ui:editor.group.visibility}}, {{ui:editor.group.combine}}, {{ui:editor.group.modify}}, {{ui:editor.group.arrange}} și {{ui:editor.group.file}}; {{ui:editor.group.help}} stă deasupra ei, pe rândul titlului, iar căsuța de lângă file te duce înapoi la pagina de start. Când fereastra e prea îngustă pentru toate grupurile, cele folosite mai rar se strâng într-un singur buton sub numele lor, cu o săgeată mică în culoarea grupului atârnând dedesubt: indică-l cu mouse-ul sau atinge-l, iar uneltele lui se deschid sub el. Pioneza din dreapta sus, la stânga lupei, ține în schimb toate grupurile deschise. Ține mouse-ul deasupra unei pictograme ca să-i vezi numele, chiar și deasupra uneia gri; {{ui:interactiveHelp.title}} (semnul întrebării de sub {{ui:editor.group.help}} sau Shift+F1) explică oricare dintre ele printr-un clic și te duce la secțiunea ei din acest ghid. Oriunde vezi un semn al întrebării mic, de exemplu în setările unei forme, în biblioteca de forme sau în panourile uneltelor, el te duce direct la capitolul potrivit din acest ghid.
- **La mijloc** se află planul de lucru. Aici așezi forme, le tragi până capătă forma dorită și vezi rezultatul.
- **În dreapta** apar setările formei selectate: culoarea, dimensiunile, poziția și tot ce mai definește forma. Să tastezi numere e mai precis decât să tragi.
- **În stânga** sunt comenzile camerei, cu cubul de vedere deasupra. Cu ele te miști prin scenă; mai multe în [Vederea și planul de lucru](chapter:view-and-workplane).
- **Chiar sus** comuți între {{ui:editor.modeGeometry}} și {{ui:editor.modeSketch}}, redenumești proiectul și alegi limba și schema de culori.

## Butoanele din jurul zonei de lucru

Ține mouse-ul deasupra unui buton ca să-i vezi numele. Dacă nu ești sigur ce face un buton, dă clic pe {{ui:interactiveHelp.title}} în zona {{ui:editor.group.help}} ([[Shift]]+[[F1]]) și apoi pe buton. Acestea sunt cele despre care se întreabă cel mai des.

### Lipește

{{ui:editor.tool.paste}} ([[Ctrl]]+[[V]]) adaugă în proiect ce ai copiat cu {{ui:editor.tool.copy}}. {{ui:common.duplicate}} copiază și lipește dintr-un singur pas. La lipire, fiecare piesă ajunge puțin lângă locul unde era. Piesele care vin din alt program pot ateriza departe de placă; pentru ele există {{ui:workspace.pasteCentered}} în setări, la {{ui:workspace.appearance}}: atunci lipirea pune piesele împreună în mijlocul planului de lucru și le coboară pe el.

### Șterge

{{ui:common.delete}} ([[Delete]]) elimină formele selectate. {{ui:editor.tool.undo}} le aduce înapoi.

### Degrupează

{{ui:editor.tool.ungroup}} ([[Ctrl]]+[[Shift]]+[[G]]) desface grupul selectat înapoi în formele din care a fost făcut.

### Setările zonei de lucru

{{ui:editor.workspaceSettings}} deschide setările zonei de lucru: unitatea, mărimea plăcii, imprimanta, grila, culorile, lumina și altele. Mai multe în [Vederea și planul de lucru](chapter:view-and-workplane).

### Temă

{{ui:common.theme}}, chiar sus, alege cum arată Magic3D: ca sistemul tău, luminos, întunecat sau grafit.

### Redenumește proiectul

{{ui:editor.renameProject}}: creionul de lângă nume, chiar sus. Scrie noul nume și apasă [[Enter]].

### Numele proiectului

Numele proiectului ({{ui:confirm.projectName}}) stă chiar sus. Dă clic pe el, scrie, iar [[Enter]] păstrează numele.

### Opțiuni de vizibilitate

{{ui:editor.visibilityOptions}}, săgeata de lângă pictograma ochiului, conține ce poți afișa sau ascunde: lista de obiecte, tot ce ai ascuns, notele și surplombele printului. Mai multe în [Selectare și aranjare](chapter:select-and-arrange).

### Ascunde selecția

{{ui:editor.tool.hideSelected}} ([[Ctrl]]+[[H]]) ascunde formele selectate. Ele rămân în proiect și în lista de obiecte; {{ui:editor.visibilityOptions}} le afișează din nou.

### Caută comenzi

{{ui:palette.open}}: scrie ce cauți, o unealtă, o formă sau o setare, și dă clic pe rezultat.

### Ascunde comenzile camerei

{{ui:camera.hide}} strânge comenzile camerei din stânga și lasă mai mult loc zonei de lucru; {{ui:camera.show}} le aduce înapoi.

### Grila de aliniere

{{ui:inspector.snapGrid}}, în partea de jos a proprietăților, este pasul la care se aliniază mutarea și redimensionarea. Lângă el, comutatorul mic **mm | in** schimbă unitatea. Mai multe în [Vederea și planul de lucru](chapter:view-and-workplane).

### Unitatea: milimetri sau inchi

Comutatorul **mm | in** de lângă {{ui:inspector.snapGrid}} schimbă unitatea, grila plăcii și pasul de aliniere pentru acest proiect.

### Subsolul

În partea de jos a ferestrei: {{ui:dashboard.sponsor}} te duce la pagina unde poți susține proiectul; {{ui:dashboard.userGuide}} deschide acest ghid; {{ui:dashboard.forum}} te duce la locul pentru întrebări, idei și raportări de erori (discuțiile de pe GitHub, iar în germană forumul drucktipps3d); {{ui:editor.bugReport}} creează o arhivă ZIP pentru un raport de eroare; {{ui:dashboard.projectOnGitHub}} te duce la proiectul de pe GitHub, iar numărul versiunii deschide notele de lansare. Linkurile către pagina de informații legale (impressum) și politica de confidențialitate aparțin celui care rulează copia de Magic3D pe care o folosești.

## Prima ta piesă

Ca exemplu, construim un cub cu o gaură.

1. Dă clic pe {{ui:editor.addShape}} în panglică și alege {{ui:shape.box}}. Forma stă acum agățată de cursorul mouse-ului. Un clic pe planul de lucru o așază.
2. În dreapta, setează dimensiunile, de exemplu 40 mm lungime, 40 mm lățime și 20 mm înălțime.
3. Așază la fel un {{ui:shape.cylinder}} în mijloc, cu diametrul de 14 mm și înălțimea de 30 mm. Trebuie să fie mai înalt decât cubul, ca să treacă prin el de la un capăt la altul.
4. Selectează cilindrul și dă clic pe {{ui:inspector.hole}} în dreapta. Devine transparent: solidul s-a transformat într-o unealtă care îndepărtează material.
5. Selectează ambele forme și dă clic pe {{ui:editor.tool.group}}. Cubul are acum o gaură.

![Cilindrul este o gaură și iese prin partea de sus a cubului.](shot:hole-before)

![După grupare, cubul are un alezaj.](shot:hole-after)

Așa se fac alezajele, canalele și buzunarele. Capitolul [Solide și găuri](chapter:solids-and-holes) explică totul în detaliu.

## Nou de la ultima vizită

Când deschizi din nou Magic3D după o actualizare, un card pe pagina de start arată ce s-a adăugat de la ultima ta vizită: fiecare versiune de atunci, cea mai nouă prima. După o absență lungă, derulezi în jos în interiorul cardului. Sub ele, {{ui:whatsNew.earlier}} adaugă și versiunile de dinainte de ultima ta vizită. Închide-l cu {{ui:whatsNew.dismiss}} și nu mai apare până la următoarea actualizare. {{ui:whatsNew.footerLink}} din subsolul paginii de start arată oricând din nou cele mai recente noutăți. Browserul ține minte ultima versiune pe care ai văzut-o și nimic despre tine nu iese din el.

Pe o copie de Magic3D de pe propriul calculator sau server, notificarea „Actualizare disponibilă" are un buton, {{ui:update.previewShow}}, care arată ce aduce actualizarea înainte s-o instalezi. Lista este preluată de pe GitHub doar când apeși butonul.

## De la proiect la print

Când piesa e gata, dă clic pe {{ui:editor.export}}, alege STL sau 3MF și descarcă fișierul. Deschide-l în slicer, de exemplu Bambu Studio, PrusaSlicer, OrcaSlicer sau Cura. Dacă îți alegi imprimanta în setări, vezi încă din timpul construcției dacă piesa încape pe placa de printare. Mai multe în [Printare](chapter:printing).

> **Sfat:** Dacă vii din Tinkercad, te descurci repede: placa, formele, solidul și gaura, gruparea, alinierea și oglindirea funcționează aproape la fel. Noi sunt mai ales teșitura și rotunjirea, golirea, filetele și schițele. Și propriile proiecte Tinkercad pot veni cu tine, vezi [Fișiere, salvare și partajare](chapter:files-and-saving).
