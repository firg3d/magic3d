---
title: Generatoarele Magic3D
summary: Piese gata făcute din câteva cifre - litere, nume, brelocuri, ștampile, prese, ornamente de Crăciun, matrițe - și cum ceri printarea.
---

## Deschiderea generatoarelor

Un generator construiește o piesă gata din câteva valori: scrii textul sau dimensiunea, piesa apare pe placă, iar apoi o modifici liber în editor, ca pe orice altă formă.

Le deschizi cu {{m3d:gen.buton}} din rândul de titlu al editorului sau alegi unul din catalogul numerotat de pe pagina de start: pagina de start deschide un design nou, cu generatorul deja deschis. Panoul arată piesa pe placă în timp ce schimbi valorile; {{m3d:gen.adauga}} o păstrează.

## Litere, nume și brelocuri

Acestea fac piese dintr-un text și un font:

- {{m3d:comutator.litereDecor}}, {{m3d:comutator.nume3d}} și {{m3d:comutator.cuvinte}} - litere și cuvinte care stau în picioare, legate ca să se printeze dintr-o bucată;
- {{m3d:comutator.brelocuri}}, {{m3d:comutator.articulat}} și {{m3d:comutator.brelocDecor}} - brelocuri cu gaură de inel, și cu părți mobile;
- {{m3d:comutator.fagure}}, {{m3d:comutator.led}}, {{m3d:comutator.numeLed}} și {{m3d:comutator.cutii}} - litere fagure, litere cu canal pentru bandă LED, cutii în formă de litere;
- {{m3d:comutator.placute}}, {{m3d:comutator.rame}} și {{m3d:comutator.huse}} - plăcuțe, rame tematice și huse de telefon.

Când fontul nu are o literă (o diacritică, de pildă), panoul îți spune, în loc să lase un gol.

## Ștampile, prese și ornamente

La {{m3d:gen.personalizate}}:

- {{m3d:comutator.stampila}} - un text sau un logo dintr-o poză, pentru cerneală sau pentru lut și fondant, cu mânerul ales;
- {{m3d:comutator.presa}} - o emblemă în relief pe hârtie și carton: clește printat cu balamaua deja montată;
- {{m3d:comutator.ornament}} - un disc cu nume sau un glob din două jumătăți, și ca pachet pentru toată familia.

Logo-ul vine dintr-un PNG, JPG sau SVG: panoul îi urmărește conturul. Încarcă doar poze pe care ai dreptul să le folosești.

## Colecția Crăciun

La {{m3d:gen.craciun}} sunt ornamentele cu nume. Între 1 noiembrie și 6 ianuarie au și un card mare pe pagina de start.

- {{m3d:comutator.globNume}} - numele traversează globul și se prinde de ramă la ambele capete; în jur fulgi, steluțe sau brazi, cu un fundal subțire opțional, pe altă culoare.
- {{m3d:comutator.turtaDulce}} - zece forme (om de turtă dulce, glob, brad, stea, ren, ciorap, ursuleț, sac, inimă, clopoțel): biscuitul maro și glazura albă deasupra, cu decorul pe trei niveluri; numele stă doar în zona lui și se micșorează sau trece pe două rânduri, fără să despartă un cuvânt.
- {{m3d:comutator.medalionBanda}} - un disc cu ramă și o bandă peste mijloc, dreaptă sau înclinată, cu capete pliate; numele pe bandă, om de zăpadă, brazi sau fulgi deasupra și dedesubt.
- {{m3d:comutator.globModele}} - un glob cu nervuri drepte sau răsucite, spirală, fante, romburi, hexagoane sau fațete, cu capac și ureche; gol, din două jumătăți îmbinate cu un inel, sau dintr-o bucată pentru modul vază. Numele, dacă îl scrii, stă pe o bandă la ecuator.

La primele trei, o listă de nume (câte unul pe rând) face câte un ornament pentru fiecare, așezate singure pe plăci după patul imprimantei. Culorile sunt piese separate în același obiect, fiecare pe extruderul ei: fișierul 3MF se deschide în Bambu Studio cu culorile și setările de print deja puse. Panoul te anunță când un nume iese prea mic sau are linii prea subțiri ca să se printeze.

> **Sfat:** Fonturile din aceste generatoare au toate diacriticele românești, cu virgula dedesubt (Ș, Ț).

## Matrițe

La {{m3d:gen.matrite}}:

- {{m3d:comutator.tava}} - forme în grilă pentru săpun, ceară, ipsos sau rășină, sau un master pentru matrița de silicon, cu volumul calculat;
- {{m3d:comutator.silicon}} - încarci un model (STL, OBJ, 3MF) sau iei obiectul selectat în editor: primești cutia de turnare, placa de separație cu chei, canalul de turnare și cât silicon îți trebuie;
- {{m3d:comutator.presalut}} - două jumătăți cu canal de surplus și știfturi, sau o ștampilă mare de săpun.

## Modifici din nou o piesă generată

O piesă făcută de un generator își ține minte valorile. Selecteaz-o și apasă {{m3d:gen.editeaza}}: panoul se deschide cu valorile cu care a fost făcută, iar piesa se reface pe loc. După ce îi schimbi forma de mână în editor, devine un corp obișnuit.

## Ceri printarea

N-ai imprimantă? {{m3d:oferta.buton}} din rândul de titlu pregătește fișierele (3MF, STL și o captură), arată o estimare și verifică dacă piesa e închisă și încape în imprimanta atelierului. Completezi numele, telefonul și orașul, bifezi {{m3d:oferta.student}} dacă e cazul, iar fișierele pleacă la atelier cu un mesaj WhatsApp deja scris. Linkul spre fișiere expiră după 20 de zile; datele din formular nu se păstrează pe server.
