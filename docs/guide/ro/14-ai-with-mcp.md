---
title: Construiește cu un AI (MCP)
summary: Cum creează și modifică un asistent AI, ca Gemini, Claude sau Codex, forme, cum le grupează și cum face imagini ale vederii din editorul tău deschis.
---

Magic3D vine cu un server MCP. MCP e un standard prin care un asistent AI poate folosi unelte din alte programe. Cu el, un client AI ca Gemini, Claude sau Codex vede o filă de editor deschisă și lucrează în ea: creează forme, schimbă dimensiuni, grupează, taie, rotunjește muchii, citește scena și face imagini ale vederii. Tu descrii piesa, AI-ul o construiește, iar tu te uiți și poți interveni oricând.

Puntea dintre clientul AI și editor rulează **local, pe calculatorul tău**. Ține totuși minte: ce citește AI-ul, adică scena și imaginile vederii, ajunge la furnizorul clientului tău AI, ca orice altă informație pe care i-o dai acolo.

> **Important:** Puntea MCP există în serverul de dezvoltare pe care îl pornești tu pe calculatorul tău. Pe magic3d.ro și în instalările cu găzduire statică e dezactivată. O copie pe care o găzduiești tu, cum ar fi imaginea Docker pe un NAS, o poate activa cu un token de acces; vezi mai jos „O copie pe un NAS sau server".

## Configurare

1. Descarcă Magic3D de pe [GitHub](https://github.com/henmedia/layerling) și pornește-l în folderul proiectului cu `npm run dev`. Trebuie să ai instalat Node.js. Pe Windows, linia de pornire rapidă din README se ocupă de asta.
2. Deschide o filă de editor, de exemplu `http://127.0.0.1:3000/?editor=1`. Poți lăsa asta în seama AI-ului: când nu e deschis niciun editor, prima unealtă care are nevoie de unul pornește browserul cu un editor și așteaptă până se conectează. Asta merge pentru un Magic3D de pe propriul calculator; la o copie pe un NAS sau server trebuie să deschizi tu editorul. Setează `LAYERLING_MCP_OPEN_EDITOR=0` pentru serverul MCP ca să dezactivezi asta.
3. Conectează clientul AI la serverul MCP. Clientul îl pornește singur cu `node scripts/layerling-mcp-server.mjs`.

### Claude Code

Nu trebuie instalat nimic: proiectul aduce un `.mcp.json` care înregistrează serverul, plus skill-ul din `.claude/skills/layerling-mcp-skill`. Deschide folderul Magic3D în Claude Code și cere, de exemplu: „Folosește uneltele MCP Magic3D ca să listezi editoarele mele deschise și să inspectezi scena."

### Claude Desktop

Claude Desktop nu citește fișierele proiectului. Adaugă serverul în configurația lui. Ca șablon folosește `docs/mcp/claude-desktop-config.example.json` din proiect și înlocuiește calea scriptului cu calea absolută de pe calculatorul tău. Apoi repornește Claude Desktop.

### Codex

Copiază skill-ul din `docs/skills/layerling-mcp-skill` în folderul de skill-uri Codex, adaugă serverul în configurația Codex folosind `docs/mcp/codex-config.example.toml` și repornește Codex.

### Gemini & Antigravity

Antigravity descoperă singur skill-ul din spațiul de lucru, din `.agents/skills/layerling-mcp-skill`. Pentru Gemini CLI, copiază skill-ul din `docs/skills/layerling-mcp-skill` în folderul global de skill-uri (`~/.gemini/skills/`), adaugă serverul în setări folosind `docs/mcp/gemini-config.example.json` și repornește clientul.

Instrucțiunile detaliate pentru fiecare client sunt în [README-ul de pe GitHub](https://github.com/henmedia/layerling/blob/main/README.md#layerling-mcp-skill).

## O copie pe un NAS sau server

O copie pe care o găzduiești tu poate lăsa un client AI să-i controleze editoarele deschise prin rețea. Implicit e dezactivat, pentru că oricine poate controla puntea poate citi și modifica proiectele deschise. Pe server, setează `LAYERLING_MCP_REMOTE` la `true` și `LAYERLING_MCP_TOKEN` la un secret de cel puțin 16 caractere (pentru imaginea Docker, în `environment:` din fișierul compose; nu e nevoie de reconstruire). Deschide o filă de editor a acelei copii și ține-o deschisă, apoi dă clientului MCP adresa și același token: `LAYERLING_URL=http://nas:3000` și `LAYERLING_MCP_TOKEN=<the token>`.

Doar un client cu tokenul poate lista sau controla editoarele. Paginile editorului nu au nevoie de el, dar contează doar sub o adresă sau un nume pe care îl poate folosi numai rețeaua ta (o adresă IP, un nume fără punct sau unul care se termină în `.local` sau `.lan`); un domeniu real din spatele unui reverse proxy se trece în `LAYERLING_MCP_ALLOWED_HOSTS`. Folosește-o într-o rețea în care ai încredere, iar dincolo de ea cu HTTPS. README-ul are detaliile.

## Ce poate face AI-ul

AI-ul lucrează cu aceleași funcții ca tine, pe aceeași cale ca operațiile tale din editor. Funcțiile noi din Magic3D primesc imediat acțiunea MCP corespunzătoare. Uneltele:

| Unealtă | Ce face |
| --- | --- |
| `layerling_list_editors` | listează filele de editor deschise |
| `layerling_open_editor` | deschide o filă nouă de editor în browserul implicit și așteaptă până se conectează (doar pe propriul calculator) |
| `layerling_read_scene` | citește scena, selecția, unitățile și dimensiunile exacte ale tuturor obiectelor |
| `layerling_list_objects` | listează toate obiectele cu dimensiuni, poziție, rotație și id |
| `layerling_select_objects` | selectează obiecte |
| `layerling_delete_objects` | șterge obiecte |
| `layerling_create_shape` | creează o formă: cub, cilindru, text (inclusiv curbat), filet, roată dințată, corp din schiță și toate celelalte |
| `layerling_import_file` | importă un fișier cum face fereastra de import: un OBJ sau 3MF colorat ca un corp pe culoare, un 3MF cu mai multe obiecte ca un corp pe obiect |
| `layerling_add_font` | adaugă un font propriu pentru text dintr-un fișier TrueType, OpenType sau WOFF; rămâne în browser, iar un proiect păstrează doar literele pe care le folosește |
| `layerling_list_fonts` | listează fonturile integrate și fonturile proprii, cu id și nume |
| `layerling_import_mesh` | aduce un mesh (rețea de triunghiuri) în proiect |
| `layerling_update_object` | schimbă dimensiunile, poziția, culoarea, numele, solid sau gaură și tot ce mai definește forma, inclusiv muchia literelor unui text |
| `layerling_align_objects` | aliniază obiecte între ele |
| `layerling_scale_objects` | scalează obiecte cu un procent, împreună sau fiecare pe loc |
| `layerling_lay_flat` | așază un obiect cu o față pe placă |
| `layerling_place_on_face` | așază obiecte pe o față a altuia, inclusiv pe fețe înclinate, ca tasta C |
| `layerling_perforate_face` | taie un model de găuri într-o față plată; găurile rămân găuri grupate cu corpul |
| `layerling_sweep_sketch` | trage o secțiune dreptunghiulară sau rotundă de-a lungul unui traseu de puncte, ca un singur corp exact; un traseu închis face un inel |
| `layerling_push_face` | împinge în afară o față plată sau taie un buzunar în ea, cu o retragere de la margine și o rază de colț; partea nouă e un corp din schiță grupat cu corpul sau, cu `separate`, un corp separat |
| `layerling_mate_faces` | aduce o față a unui obiect lângă o față a altuia, față în față sau la același nivel, ori pune două fețe rotunde pe aceeași axă |
| `layerling_open_group` | deschide un grup ca să-i poți modifica părțile una câte una, inclusiv un grup din interiorul unuia deschis |
| `layerling_close_group` | îl închide din nou („Gata") sau anulează |
| `layerling_group_objects` | grupează obiecte |
| `layerling_ungroup_objects` | desface grupuri |
| `layerling_boolean_cut` | taie solide cu găuri |
| `layerling_intersect_objects` | păstrează doar ce au obiectele în comun (Intersecție) |
| `layerling_hull_objects` | învelește obiectele într-un singur corp convex, ca într-o folie strânsă (Înveliș) |
| `layerling_cookie_cutter` | face din obiecte o formă de tăiat prăjituri: un perete cu muchie tăietoare și o bordură în jurul conturului oglindit (Formă de prăjituri) |
| `layerling_flexi_joints` | taie un corp plat în segmente cu articulații printate dintr-o bucată (print-in-place), care se balansează lateral (Articulații flexibile) |
| `layerling_make_lid` | face un capac pentru un corp deschis sus: introdus, peste margine sau plat, cu ajustajul ales (Capac) |
| `layerling_loft_sketches` | unește două corpuri din schiță într-un loft de la un contur la celălalt (Loft între schițe) |
| `layerling_separate_parts` | separă o formă în părțile ei libere, un corp din schiță într-un corp pe contur |
| `layerling_split_objects` | taie solide sau găuri în două cu un plan |
| `layerling_list_edges` | listează muchiile CAD reale ale unui obiect |
| `layerling_apply_edge_treatment` | teșește sau rotunjește muchiile alese |
| `layerling_hollow_object` | golește un corp cu un perete uniform |
| `layerling_cut_out` | taie un solid din altul ca să se potrivească: piesa rămâne, iar o copie mărită cu jocul e scăzută din celălalt corp |
| `layerling_offset_object` | construiește jocul pentru o îmbinare prin presare: mărește sau micșorează un solid, adaugă copia mărită ca gaură sau mută doar laturile |
| `layerling_list_faces` | listează fețele unui corp exact |
| `layerling_delete_faces` | șterge fețe și închide golul |
| `layerling_array_objects` | multiplică pe un rând sau pe un cerc |
| `layerling_bundle_objects` | împachetează obiecte ca Ctrl+B: se mișcă împreună, își păstrează culoarea și tipul și ies separat la export |
| `layerling_layer_text` | transformă un text într-o stivă de straturi pentru printare multicoloră (litere, margini mai late, o placă fără găuri) sau reconstruiește o stivă, cu gaură pentru inelul de chei, colțurile pe strat și muchia literelor rotunjită sau teșită; cu o listă de nume, câte o etichetă pentru fiecare nume |
| `layerling_layer_icon` | transformă o pictogramă SVG (textul fișierului sau un corp extrudat din schiță) într-o etichetă cu pictogramă în straturi pentru printare multicoloră - pictograma, margini mai late, o placă fără găuri - sau reconstruiește una cu altă lățime sau alte straturi; cu un număr, umple placa cu copii |
| `layerling_create_qr_code` | face un cod QR dintr-un text sau o adresă web, ca {{ui:shape.qrCode}} din biblioteca de forme - doar codul, în relief pe o placă sau gravat, cu corecție a erorilor, lățime, înălțime, zonă liberă și, la cerere, ca gaură; avertizează când un modul scade sub 0,8 mm |
| `layerling_reference_image` | adaugă o imagine de referință dintr-o poză, cum face {{ui:import.referenceImage}}, sau mută, rotește, calibrează (două puncte din imagine și distanța lor reală), estompează ori blochează una - un ghidaj care nu e niciodată exportat sau printat; `trace` transformă partea ei întunecată sau luminoasă într-un corp din schiță care stă pe ea |
| `layerling_measure_section` | măsoară pe un plan de secțiune între două puncte care se aliniază la contur - grosimea peretelui, distanțe, ajustaje |
| `layerling_show_overhangs` | activează sau dezactivează hașurarea surplombelor, setează unghiul și raportează pentru fiecare corp suprafața care ar avea nevoie de suporturi |
| `layerling_estimate_print` | estimează volumul, greutatea și filamentul pentru selecție sau pentru tot proiectul: pentru un corp plin și, ca estimare aproximativă, cu pereți și umplere, ca fereastra de export |
| `layerling_add_reference_points` | marchează puncte de referință - în centrul, colțurile sau mijloacele muchiilor obiectelor ori la poziții exacte - la care se aliniază formele |
| `layerling_list_reference_points` | listează punctele de referință cu id-urile și pozițiile lor |
| `layerling_remove_reference_points` | șterge puncte de referință după id sau pe toate |
| `layerling_inspect_errors` | arată ultimul mesaj și ultima eroare, plus mesajele și erorile din sesiune |
| `layerling_wrap_around_cylinder` | înfășoară un corp așezat plat, de exemplu un SVG sau un text, în jurul unui cilindru, spre exterior sau spre interior, ca gravură |
| `layerling_texture_surface` | aplică o textură pe suprafața unui corp: caneluri, moletare, fagure sau proeminențe, pentru aderență sau pentru aspect, și o modifică ori o elimină mai târziu |
| `layerling_simplify_mesh` | reduce numărul de triunghiuri al unui mesh importat, la un procent sau la un număr de triunghiuri |
| `layerling_save_custom_shape` | păstrează corpuri ca formă proprie, pe server sau în browser, ca să le inserezi în alte proiecte |
| `layerling_list_custom_shapes` | listează formele proprii de pe server și din browser |
| `layerling_insert_custom_shape` | inserează o formă proprie în proiectul deschis, dacă vrei într-un punct x/z |
| `layerling_delete_custom_shape` | elimină o formă proprie; corpurile inserate rămân |
| `layerling_show_workplane` | ascunde și arată placa cu grila ei, de exemplu pentru o imagine a părții de dedesubt (doar vederea) |
| `layerling_set_section_view` | deschide vederea în secțiune de-a lungul unui plan, ca să vezi înăuntru (doar vederea, nu se taie nimic) |
| `layerling_measurements` | arată sau ascunde măsurătorile ruletei și le listează cu lungimile lor și ascunde sau arată dimensiunile din jurul selecției, ca [[Q]] |
| `layerling_saved_view` | salvează vederea curentă pe tasta 7, 8, 9 sau 0 și revine la ea, ca Shift+tastă și tasta (doar vederea); setează și vederea de pornire a proiectelor noi |
| `layerling_clear_history` | șterge definitiv toți pașii de anulare, cum face butonul „Șterge istoricul" din vederea Istoric; necesită `confirm: true` |
| `layerling_set_history_view` | privește o stare anterioară a proiectului, ca vederea Istoric (proiectul real rămâne neatins; uneltele care modifică așteaptă până se închide) |
| `layerling_restore_from_history` | aduce obiecte (inclusiv părți din grupuri) dintr-o stare anterioară în proiect, ca copii, cum face „Adu în proiect" din vederea Istoric - un singur pas, pe care îl anulează Anulează |
| `layerling_export_section_svg` | returnează contururile de pe un plan de secțiune ca SVG la 1:1, din aceleași corpuri ca exportul |
| `layerling_sketch_from_section` | face o schiță din contururile de pe un plan de secțiune, așezată pe tăietură: deschisă în editor ca s-o modifici sau construită imediat într-un corp de o înălțime dată |
| `layerling_export_drawing` | face desenul de atelier al exportului „2D": trei vederi la 1:1 pe o foaie ISO, cu dimensiunile de gabarit și un tabel al găurilor rotunde, ca text SVG sau PDF |
| `layerling_export_mesh` | scrie fișierul ferestrei de export ca STL, 3MF, OBJ, SVG (vedere de sus, amprentă sau muchii vizibile) sau DXF pentru tăiere laser, din aceleași corpuri; la o cale de pe acest calculator sau ca base64 |
| `layerling_save_project` | salvează tot proiectul editabil ca fișier .lyl la o cale de pe calculatorul unde rulează serverul MCP, fără dialog; un fișier existent e înlocuit doar cu `overwrite`, scrierea trece printr-un fișier temporar, iar ținta lui Ctrl+S din editor rămâne aceeași |
| `layerling_list_attachments` | listează fișierele atașate proiectului (nume, tip, mărime), cum le arată panoul Atașamente |
| `layerling_get_attachment` | citește un fișier atașat, cu octeții lui ca base64, cum face Descarcă din panou |
| `layerling_add_attachment` | atașează un fișier dat ca base64, cu verificările panoului; un nume deja atașat e suprascris doar cu `replace` |
| `layerling_rename_attachment` | dă unui fișier atașat alt nume; conținutul rămâne |
| `layerling_remove_attachment` | elimină definitiv un fișier atașat; necesită `confirm: true` |
| `layerling_set_workplane` | pune planul de lucru pe o latură a unui corp sau înapoi pe placa de bază și îl ascunde sau îl arată |
| `layerling_capture_image` | face o imagine a vederii: din față, de sus, din lateral, în diagonală dintr-un colț și altele |

Așa se poate verifica AI-ul singur: creează ceva, face o imagine, se uită și îmbunătățește.

## Un exemplu

Spui: „Construiește-mi o cutie rotundă cu diametrul de 60 mm, înaltă de 40 mm, cu peretele de 2,5 mm, deschisă sus, plus un capac plat cu «Ceai» scris pe arc." AI-ul creează cilindrii, golește unul, pune textul curbat pe capac și face imagini la final ca să vadă dacă se potrivește.

> **Sfat:** Dă AI-ului dimensiuni concrete și spune-i la ce folosește piesa („suport pentru o tijă de 12 mm, încape pe o Bambu Lab A1"). Atunci ia decizii mai bune. Și urmărește-l cum construiește: poți interveni oricând, pentru că e același editor.
