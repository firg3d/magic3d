---
title: Text și litere pe arc
summary: Litere în relief sau gravate, în opt fonturi sau într-unul propriu, și, dacă vrei, de-a lungul unui arc de cerc, ca pe o monedă, un capac sau un inel.
---

## Adăugarea textului

Alege {{ui:shape.text}} din biblioteca de forme și plasează-l. În câmpul {{ui:prop.text}} din dreapta, tastează ce să scrie. Setările de dedesubt:

- **{{ui:prop.font}}:** Ai la dispoziție opt fonturi: Multilanguage, Sans, Serif, Script, Monospace, Rounded, Stencil (litere din linii drepte) și Japanese (Zen Maru Gothic). Un text nou pornește cu Sans. Literele cu diacritice, cum ar fi ä, ö, ü, é, și semnul € există în fiecare font, la fel și kana, kanji-urile uzuale și multe dintre cele rare din nume, cum ar fi 澤, 槇 și 檜: un nume japonez merge în orice font și pe o etichetă cu nume. Literele japoneze sunt descărcate prima dată când un text are nevoie de ele (kanji-urile rare într-un al doilea fișier, doar când un text conține unul), așa că un astfel de text arată pentru o clipă semne de întrebare. După aceea sunt păstrate pe calculator, deci de atunci japoneza merge și offline. Fonturile proprii vin în plus, vezi mai jos [Fonturile tale](#fonturile-tale).
- **{{ui:nameTag.letterSize}}:** Cât de mari sunt literele, văzute de sus; {{ui:prop.height}} stabilește cât de groase sunt.
- **{{ui:prop.height}}:** Cât de mult ies literele din suprafață.
- **{{ui:prop.bevel}}:** Rotunjește marginile literelor ca să pară mai moi. Cu {{ui:prop.segments}} hotărăști în câți pași.
- **{{ui:nameTag.letterEdge}}:** rotunjește sau teșește muchia de sus a literelor, ca pe o etichetă cu nume: {{ui:nameTag.edge.none}}, {{ui:nameTag.edge.round}} sau {{ui:nameTag.edge.chamfer}}, cu {{ui:nameTag.letterEdgeSize}} (la început 0,4 mm, cel mult cât înălțimea textului). Merge mai departe decât {{ui:prop.bevel}}, dar doar cât permite lățimea trăsăturilor: acolo unde o trăsătură e mai subțire decât dublul dimensiunii, muchia se termină cu un vârf mai îngust. Partea de jos rămâne plată, așa că literele separate pot fi lipite după aceea. Cât timp e aleasă o muchie, ea ia locul lui {{ui:prop.bevel}}.
- **Dimensiune:** Setezi lungimea și lățimea rândului ca la orice formă. Trage de mânere sau tastează dimensiunile.
- **{{ui:prop.textSpacing}}:** Spațiul dintre litere, peste cel pe care îl are fontul, în procente din mărimea literei: 0 îl lasă cum l-a făcut fontul, peste 0 literele stau mai depărtate, sub 0 (până la -50) mai strânse, de care are adesea nevoie un font propriu. Literele își păstrează mărimea, iar caseta urmează rândul, la textul drept și la cel curbat. Spațierea nu se aplică la arabă și ebraică, ale căror litere se leagă între ele.
- **{{ui:prop.textStretch}}:** La început e dezactivat: literele își păstrează proporțiile și stau în mijlocul cadrului, așa că un cadru tras mai lat sau mai adânc decât are nevoie cuvântul rămâne mai mare decât literele. Activează-l și literele sunt întinse ca să umple tot cadrul în ambele direcții: o majusculă poate fi făcută mai joasă sau mai îngustă, ca în Tinkercad. E pentru textul drept; textul curbat are propria mărime a literelor.
- **{{ui:prop.textVertical}}:** Așază literele una sub alta, fiecare în mijlocul unui rând vertical, pentru o plăcuță pe tocul ușii sau un nume de-a lungul unui pix. Caseta devine verticală, iar literele își păstrează mărimea; {{ui:prop.textSpacing}} stabilește distanța dintre ele. La textul curbat, literele formează o coloană pe partea stângă a cercului, fiecare stând drept; {{ui:prop.textInwardColumn}} pune coloana pe partea dreaptă.

La început, textul e un singur corp. Dacă vrei să lucrezi cu literele separat, dă clic pe {{ui:inspector.separateParts}}. Atunci fiecare literă e o formă separată.

Și muchiile textului pot fi teșite sau rotunjite, drepte sau curbate, vezi [Teșirea muchiilor și golirea corpurilor](chapter:edges-and-hollowing). Folosește dimensiuni mici, cum ar fi 0,2–0,5 mm, pentru că trăsăturile literelor sunt înguste.

## Fonturile tale

Lista de la {{ui:prop.font}} desenează fiecare font cu propriile litere, folosind cuvintele textului tău, așa că vezi cum vor arăta înainte să alegi. La fel și fonturile din fereastra de mai jos; fonturile listate de pe calculatorul tău își arată numele cu propriile litere. În listă merg tastele săgeți și [[Enter]], iar o literă sare la următorul font care începe cu ea.

Pe lângă cele opt fonturi integrate poți folosi orice font propriu: un fișier de font de pe calculator sau, în Chrome și Edge, un font instalat pe calculator. Alege {{ui:font.manage}} jos în lista {{ui:prop.font}}. Se deschide fereastra {{ui:font.title}}.

- **{{ui:font.addFile}}** acceptă un fișier TrueType (`.ttf`), OpenType (`.otf`) sau WOFF (`.woff`). Poți și să tragi pur și simplu fișierul în fereastră.
- **Pe Windows**, fonturile instalate se află în folderul Fonts (`C:\Windows\Fonts`). Dialogul de fișiere al browserului îl ascunde. Deschide-l în schimb în Explorer și trage fontul în fereastra {{ui:font.title}}. Fonturile instalate doar pentru tine se află în `%LOCALAPPDATA%\Microsoft\Windows\Fonts`, pe care dialogul de fișiere îl arată. Pe Mac, fonturile se află în `/Library/Fonts` și `~/Library/Fonts`.
- **{{ui:font.fromSystem}}** listează fonturile instalate pe calculator. Prima dată, browserul întreabă dacă Magic3D le poate citi. Câmpul de căutare găsește repede un font, iar un clic îl preia.

Dacă e selectat un text, primește imediat fontul nou. Altfel, fontul apare la {{ui:prop.font}} în grupul {{ui:font.customGroup}}, iar {{ui:font.use}} din fereastră îl aplică textelor selectate. Fonturile proprii funcționează ca cele integrate: textul pe arc de cerc, teșiturile și rotunjirile muchiilor și exportul STEP merg la fel. Literele care lipsesc dintr-un font sunt luate din Sans.

### Arabă și ebraică

Araba, persana, urdu și ebraica se scriu de la dreapta la stânga: prima literă stă în dreapta, iar într-un text mixt, cum ar fi „Name عربي", doar cuvântul arab merge invers, cifrele rămân ca de obicei. Literele arabe se leagă de vecinele lor cum cere scrierea, iar lam-alef devine o ligatură. Pentru asta ai nevoie de un font care are aceste litere; cele integrate nu le au. Adaugă unul propriu, cum ar fi Arial, Tahoma sau Segoe UI pe Windows, ori unul gratuit, ca Noto Naskh Arabic, Noto Sans Arabic sau Amiri. Semnele vocalice stau pe litera căreia îi aparțin. Textul pe arc de cerc, conturul, silueta, straturile și etichetele cu nume funcționează cu el ca la orice alt text.

### Ce funcționează în fiecare browser

| Browser | Alegerea unui fișier de font | Font de pe calculator |
| --- | --- | --- |
| Chrome și Edge pe calculator, inclusiv aplicația Magic3D instalată | da | da, după ce întreabă browserul |
| Firefox | da | nu |
| Safari pe Mac | da | nu |
| Tabletă și telefon | da, din fișierele dispozitivului | nu |

Paginile web nu au voie să citească pur și simplu fonturile instalate. Doar Chrome și Edge au o permisiune pentru asta și doar pe paginile securizate, prin `https`, ca pe magic3d.ro. Când Magic3D rulează prin `http`, de exemplu pe propriul tău server sau ca instalare Docker în rețeaua de acasă, {{ui:font.fromSystem}} lipsește; în cazul acesta, trage fontul din Explorer. În celelalte browsere alegi fișierul de font din folderul de fonturi, cu același rezultat. Dacă ai refuzat întrebarea în Chrome sau Edge, permite din nou accesul din setările site-ului, din spatele lacătului din stânga adresei.

Magic3D nu poate citi fișiere WOFF2 (aproape întotdeauna există o versiune TTF sau OTF), colecții de fonturi (`.ttc`, mai multe fonturi într-un fișier) sau fonturi emoji color. Din fonturile foarte mari, cum sunt cele chinezești, Magic3D ia primele 8000 de caractere. Un font variabil e citit în setarea lui implicită, de obicei greutatea normală.

Unele fonturi, mai ales cele script și cele variabile, desenează o literă din trăsături care se suprapun. Magic3D le unește într-un singur contur curat când citește fontul, ca să rămână corpul printabil. Astfel de litere sunt atunci formate din bucăți drepte foarte scurte în loc de curbe; nu se vede.

### Unde se păstrează fonturile

Un font propriu rămâne **în acest browser, pe acest calculator**. Alt browser sau alt calculator nu îl cunoaște până nu îl adaugi și acolo. Dacă ștergi datele site-ului din browser, se șterg și fonturile. În fereastra {{ui:font.title}}, coșul de gunoi elimină un font din browser. Proiectele tale nu pierd nimic din cauza asta, cum arată secțiunea următoare.

### Transmiterea proiectelor cu un font propriu

Un proiect **nu stochează fișierul de font**, ci doar contururile literelor folosite în textele lui, inclusiv cele din pașii anteriori din istoric. Dacă un text spune „Hello", doar H, e, l și o călătoresc cu el. Asta e valabil pentru orice mod de salvare a unui proiect: în browser, pe propriul server, ca fișier `.lyl` și în {{ui:myShapes.title}}.

Așadar:

- **Proiectul se deschide corect oriunde**, chiar și pe un calculator fără font. Textele arată la fel și pot fi mutate, rotite, scalate și rotunjite.
- **Literele noi au nevoie de font.** Dacă cineva fără font tastează o literă pe care proiectul n-a adus-o cu el, Magic3D o desenează din Sans. La {{ui:prop.font}}, fontul e marcat atunci {{ui:font.fromDesign}}. Adăugarea fișierului de font readuce toate literele.
- **Exporturile conțin doar geometrie.** STL, 3MF, OBJ, STEP și SVG conțin corpuri și contururi, niciun font.
- **Versiunile mai vechi de Magic3D** nu cunosc încă fonturile proprii și desenează astfel de texte cu Multilanguage.

**Licențe:** Fonturile sunt protejate de drepturile de autor, iar licența lor spune ce ai voie să faci cu ele. Contururile de litere încorporate sunt ceea ce preiau și fișierele PDF dintr-un font, iar majoritatea licențelor permit asta. Unele fonturi comerciale interzic totuși transmiterea chiar și a unor litere separate. Înainte să transmiți sau să publici un proiect cu un font propriu, verifică licența fontului. Fonturile gratuite, cum sunt cele de pe Google Fonts (în mare parte sub SIL Open Font License), pot fi transmise fără grijă. Pentru o piesă printată sau un STL exportat nu contează: nu mai conțin niciun font, doar geometrie.

## În relief sau gravat

- **În relief:** Pune textul pe suprafață și grupează-l cu corpul. Iese în afară ca un relief.
- **Gravat:** Comută textul pe {{ui:inspector.hole}}, lasă-l să intre puțin în suprafață și grupează-l cu corpul. Literele sunt atunci gravate.

Pentru litere pe o față laterală, pune întâi planul de lucru pe fața aceea, vezi [Vederea și planul de lucru](chapter:view-and-workplane).

## Contur, siluetă și mai lat

Un text nu trebuie neapărat construit din litere pline. {{ui:prop.textFill}} din proprietăți oferă aceeași alegere ca Tinkercad:

- **{{ui:prop.textFill.filled}}:** literele așa cum sunt.
- **{{ui:prop.textFill.outline}}:** o linie de-a lungul conturului literelor, jumătate în interiorul lui și jumătate în afară.
- **{{ui:prop.textFill.outer}}:** o linie pe exteriorul literelor.
- **{{ui:prop.textFill.inner}}:** o linie pe interiorul literelor.

Cu o linie aleasă, chiar sub listă apar două setări: {{ui:prop.sketchLineWidth}} stabilește cât de groasă e linia, {{ui:sketch.strokeJoin}} cum ocolește colțurile ({{ui:sketch.strokeJoin.round}}, {{ui:sketch.strokeJoin.bevel}} sau {{ui:sketch.strokeJoin.miter}}). Setările mai rar folosite sunt la {{ui:inspector.more}}: {{ui:prop.sketchSilhouette}} lasă deoparte găurile din O, A sau e, iar {{ui:prop.textWider}} păstrează literele pline și le îngroașă de jur împrejur cu lățimea liniei; literele care se ating se unesc într-o singură bucată.

Cu o linie exterioară, o linie centrată sau „Mai lat", caseta textului crește, iar literele își păstrează mărimea. {{ui:prop.bevel}} și {{ui:prop.segments}} există doar pentru literele pline.

## Straturi și etichete cu nume

O etichetă cu nume pentru printare multicoloră e un text în straturi: literele sus, sub ele același text puțin mai lat, într-o a doua culoare, iar jos o placă fără găuri, într-o a treia. Magic3D o face dintr-un clic:

- **O etichetă cu nume nouă:** alege {{ui:shape.nameTag}} din biblioteca de forme și plaseaz-o. Scrie „Name" cu litere albe pe o margine roșie și o placă închisă la culoare.
- **Dintr-un text:** selectează textul și dă clic pe {{ui:nameTag.makeLayers}} în partea de sus a setărilor lui.

Toate setările etichetei sunt în cartonașul {{ui:nameTag.title}}, în partea de sus a setărilor:

- **{{ui:prop.text}}** și **{{ui:prop.font}}**, inclusiv fonturi proprii. Eticheta crește odată cu cuvintele.
- **{{ui:nameTag.letterSize}}:** cât de înalte sunt majusculele, în mm. Toate straturile urmează și rămân aliniate.
- **{{ui:prop.textVertical}}:** așază eticheta vertical, cu literele una sub alta, împreună cu toate straturile.
- **{{ui:nameTag.layers}}:** câte un rând pe strat, de sus în jos. Fiecare rând are culoarea (dă clic pe pătratul colorat), cât de mult e mai lat stratul decât literele, înălțimea lui și {{ui:nameTag.noHoles}}, care umple găurile din litere ca O și A. {{ui:nameTag.corners}} stabilește cum ocolește un strat mai lat colțurile literelor: {{ui:nameTag.corner.round}}, {{ui:nameTag.corner.bevel}} sau {{ui:nameTag.corner.miter}}. Rândul de sus sunt literele însele. **+** adaugă un strat jos, **–** elimină stratul de jos. O etichetă are între două și șase straturi.
- **{{ui:nameTag.keyring}}:** dă stratului de jos o urechiușă dreaptă cu capăt rotund și o gaură pentru inelul de chei; urechiușa crește odată cu gaura. O gaură de 3 mm, valoarea implicită, face o urechiușă lată de 6,5 mm care iese în afară 6,75 mm, cu marginea găurii la 2 mm de marginea stratului de jos. Alege {{ui:nameTag.keyringDiameter}} și {{ui:nameTag.keyringSide}}: {{ui:nameTag.side.left}}, {{ui:nameTag.side.right}} sau {{ui:nameTag.side.top}}. {{ui:nameTag.side.free}} scoate gaura de pe etichetă și pune alături o {{ui:nameTag.keyringTab}} separată, în culoarea și la înălțimea stratului de jos: o formă obișnuită pe care o muți și o rotești cu mânerele ei oriunde are nevoie eticheta. Când stă la locul ei, {{ui:nameTag.keyringTabFix}} din panoul ei o face parte din cea mai apropiată etichetă, exact acolo unde e: gaura trece prin fiecare strat la care ajunge, urechiușa se unește cu stratul de jos și amândouă rămân la colțul acela al literelor când se schimbă cuvintele sau mărimea. {{ui:nameTag.side.free}} scoate din nou urechiușa unde era, ca s-o muți încă o dată. Gaura trece prin fiecare strat pe care îl atinge, iar urechiușa se mută odată cu schimbarea cuvintelor, a mărimii literelor sau a fontului. {{ui:nameTag.keyringAlong}} mută urechiușa în sus sau în jos de-a lungul laturii ei (sus: la stânga sau la dreapta), până acolo unde ar ieși de pe latură; 0 e mijlocul. Folosește-l când mijlocul laturii nimerește într-un gol, ca lângă un J, și mută urechiușa pe partea literei care iese în afară.
- **{{ui:nameTag.letterEdge}}:** rotunjește sau teșește muchia de sus a literelor de pe stratul de sus, cum se finisează o etichetă printată: {{ui:nameTag.edge.none}}, {{ui:nameTag.edge.round}} sau {{ui:nameTag.edge.chamfer}}, cu {{ui:nameTag.letterEdgeSize}} (la început 0,4 mm, cel mult cât înălțimea stratului). Funcționează pentru orice font și orice cuvânt. Muchia face parte din mesh-ul literelor, așa că unealta pentru muchii ar lua un astfel de text ca mesh, ceea ce pentru un text atât de fin e greu; alege muchia de aici în schimb.

Fiecare modificare se vede imediat. Eticheta e un pachet: se mișcă întreagă, iar fiecare strat rămâne un corp separat, în propria culoare, cum are nevoie slicerul pentru o printare multicoloră. Ca să rotunjești sau să teșești muchiile unui strat, dă clic pe {{ui:group.editBundle}} și alege stratul, vezi [Teșirea muchiilor și golirea corpurilor](chapter:edges-and-hollowing).

### Multe etichete cu nume deodată

Tastează numele în {{ui:textLayers.names}}, câte unul pe rând, până la o sută. Butonul de dedesubt spune câte etichete va face, de exemplu „Fă 12 etichete cu nume". Fiecare etichetă primește aceleași straturi, aceeași mărime a literelor și aceeași gaură pentru inelul de chei și e un obiect separat; sunt așezate pe rânduri sub prima, la 5 mm una de alta. Și un text simplu are lista de nume, mai jos în setările lui.

## Etichete cu pictogramă

O etichetă cu pictogramă e aceeași etichetă, dar cu o pictogramă SVG în loc de litere: o inimă, un nor, logoul unui club. Pictograma sus, sub ea același contur puțin mai lat, într-o a doua culoare, iar jos o placă fără găuri.

- **O etichetă cu pictogramă nouă:** alege {{ui:shape.iconTag}} din biblioteca de forme. Se deschide o fereastră mică: dă clic pe {{ui:iconTag.browse}}, alege un fișier SVG, PNG sau JPG, verifică imaginea, tastează {{ui:iconTag.width}} pictogramei și dă clic pe {{ui:iconTag.ok}}. Eticheta apare în mijlocul plăcii, cu aceleași straturi ca o etichetă cu nume nouă.
- **Dintr-un corp din schiță:** un SVG importat sau o schiță desenată de tine are {{ui:nameTag.makeLayers}} în partea de sus a setărilor.

Cartonașul {{ui:iconTag.title}} din partea de sus a setărilor conține:

- **{{ui:iconTag.replace}}:** pune pe etichetă pictograma din alt fișier (SVG, PNG sau JPG); straturile și lățimea rămân cum sunt.
- **{{ui:iconTag.iconWidth}}:** cât de lată e pictograma de sus, în mm. Toate straturile urmează și rămân aliniate.
- **{{ui:nameTag.layers}}:** rândurile ca la o etichetă cu nume - culoare, cu cât e mai lat, {{ui:nameTag.corners}}, înălțime și {{ui:nameTag.noHoles}}, **+** și **–**, între două și șase straturi. Rândul de sus e pictograma însăși.
- **{{ui:nameTag.keyring}}:** ca la o etichetă cu nume: o gaură pentru inelul de chei prin fiecare strat, cu o urechiușă cu capăt rotund pe stratul de jos, dincolo de pictogramă. {{ui:nameTag.keyringDiameter}} și {{ui:nameTag.keyringSide}} îi aleg mărimea și locul; {{ui:nameTag.side.free}} dă o urechiușă separată, ca la o etichetă cu nume. Urechiușa e făcută pentru conturul pictogramei, așa că la o pictogramă foarte zimțată verifică unde se întâlnește cu placa. {{ui:nameTag.keyringAlong}} mută urechiușa de-a lungul laturii ei, ca la eticheta cu nume.
- **{{ui:iconTag.count}}:** câte etichete vrei, între 1 și 100. {{ui:iconTag.fill}} calculează numărul după placa imprimantei alese în setări; pentru logouri mici, o placă plină. Butonul de dedesubt le face, la 5 mm una de alta, așezate în mijlocul plăcii; prima e eticheta însăși.

SVG-ul are nevoie de contururi închise; un desen doar din linii deschise nu poate deveni etichetă. Un corp din schiță a cărui umplere e o linie o păstrează: suprafața liniei respective e pictograma.

**O imagine (PNG sau JPG)** e transformată prin trasare într-un contur, iar previzualizarea arată conturul. La {{ui:iconTag.part}} alegi dacă {{ui:iconTag.part.dark}} sau {{ui:iconTag.part.light}} devine pictograma; la început e partea care nu e fundal. Pixelii transparenți nu aparțin niciodată pictogramei. Un SVG care conține doar o imagine, cum salvează Inkscape un bitmap importat, e trasat la fel. Conturul urmează pixelii, așa că o imagine mică dă o margine aspră: cel mai bine merg imaginile de câteva sute de pixeli sau mai mari. {{ui:iconTag.replace}} preia partea unei imagini care nu e fundalul ei.

## Coduri QR

Un cod QR transformă un text sau o adresă web într-un model pe care îl citește camera unui telefon: un link către magazinul tău pe o plăcuță, numele rețelei Wi-Fi pe un suport de pahar, un număr de telefon pe un breloc.

Alege {{ui:shape.qrCode}} din biblioteca de forme. Se deschide o fereastră; cursorul e deja în câmpul de text:

- **{{ui:qrCode.text}}:** ce conține codul. Enter face codul, Shift+Enter începe un rând nou. Sub câmp vezi cât din spațiu e folosit; diacriticele și alte litere speciale ocupă doi octeți. Când textul e prea lung, câmpul îți spune.
- **{{ui:qrCode.errorCorrection}}:** L, M, Q sau H. Un nivel mai mare poate fi citit și când o parte din cod e murdară sau zgâriată (L circa 7 %, M 15 %, Q 25 %, H 30 %), dar are nevoie de mai multe module pentru același text, așa că fiecare modul devine mai mic. La început e ales M.
- **{{ui:qrCode.style}}:** {{ui:qrCode.style.code}} face doar codul, înalt de 4 mm. {{ui:qrCode.style.raised}} îl pune la 1 mm înălțime pe o placă albă groasă de 3 mm, ca pachet din două culori, așa că o printare multicoloră printează codul închis și placa deschisă. {{ui:qrCode.style.engraved}} taie codul la 1 mm adâncime în placă.
- **{{ui:qrCode.sizeBy}}:** tastează {{ui:qrCode.sizeBy.width}} întregului cod (la început 40 mm) sau mărimea unui modul; celălalt număr apare dedesubt. Modulele sub 0,8 mm primesc un avertisment. E o regulă orientativă pentru o duză de 0,4 mm, nu o garanție: imprimanta, materialul, culorile și telefonul contează toate.
- **{{ui:qrCode.quietZone}}:** scanerele au nevoie de o margine goală, lată de patru module, în jurul codului. Pe o placă, marginea face parte din placă; dezactiveaz-o doar dacă placa stă pe o suprafață deschisă mai mare. Codul singur nu are margine proprie: lasă spațiul din jurul lui liber.
- **Înălțimi:** înălțimea codului sau, pe o placă, înălțimea codului ori adâncimea gravării, plus grosimea plăcii.

Previzualizarea arată codul așa cum va fi construit. {{ui:qrCode.ok}} îl pune în mijlocul plăcii.

Codul e un corp ca oricare altul: îl muți, îl rotești, îl scalezi (păstrează lățimea și adâncimea egale, altfel codul se întinde), îl grupezi sau îl faci gaură și îl grupezi într-o piesă proprie ca să-l gravezi acolo. Scalarea scalează tot codul; fiecare modul rămâne pătrat.

Cartonașul {{ui:qrCode.title}} din partea de sus a setărilor conține textul. Modifică-l și dă clic pe {{ui:qrCode.regenerate}}: codul se reconstruiește acolo unde stă și cu lățimea pe care o are acum. Corecția erorilor, zona liberă și tipul de construcție rămân cum au fost alese; pentru alte opțiuni, fă un cod nou din bibliotecă.

Scanează codul cu telefonul înainte să-l printezi și încă o dată după printare. Închis pe deschis se citește cel mai bine; un cod deschis pe o placă închisă nu e citit de orice telefon.

## Text pe arc de cerc

Vrei ca literele să nu meargă drept, ci să urmeze marginea unei monede, a unui capac sau a unui inel? Pentru asta există setarea {{ui:prop.textCurved}}.

![Textul urmează un cerc. Toate literele stau pe aceeași linie comună.](shot:curved-text)

Imediat ce o activezi, textul merge de-a lungul cercului. Toate literele stau pe aceeași linie de bază, la fel de uniform ca la textul normal. Există patru setări:

- **{{ui:prop.textRadius}}** (între 5 și 500 mm): Raza cercului pe care merge linia de bază a literelor. Literele rămân unde sunt; se schimbă doar curbura lor.
- **{{ui:nameTag.letterSize}}:** Cât de înalte sunt literele. Nu mai depinde de lățimea formei.
- **{{ui:prop.textInward}}:** Mută textul din partea de sus a cercului în partea de jos. Literele au atunci capul spre centru.
- **{{ui:prop.textFlipped}}:** Întoarce doar literele, ca să le poți citi din partea cealaltă. Textul rămâne la locul lui pe cerc.

**Centrul cercului e centrul formei.** De aceea alinierea funcționează ca de obicei: dacă centrezi textul cu un cilindru sau un inel, stă exact concentric pe el. Când tragi de un mâner, raza și mărimea literelor cresc împreună, așa că literele nu se deformează.

> **Sfat:** În partea de sus a cercului, literele stau în afara liniei de bază; cu {{ui:prop.textInward}} stau înăuntru, cu capul spre centru. Ca literele să încapă pe un disc, raza plus mărimea literelor trebuie să fie mai mică decât raza discului.
