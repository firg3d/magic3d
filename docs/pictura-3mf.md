# Pictura — formatul 3MF multicolor

Modul Pictură (`apps/web/src/magic3d/pictura/`) colorează corpurile pe triunghiuri și exportă un
3MF multicolor. Aici e formatul scris, cum s-a verificat și ce mai trebuie verificat manual.

## Ce scrie Magic3D

Un fișier `3D/3dmodel.model` cu un obiect pe corp. Fiecare triunghi poartă două informații despre
culoare, pentru două feluri de programe:

```xml
<basematerials id="1"> <base name="Alb" displaycolor="#F4F4F1"/> … </basematerials>
<m:colorgroup id="2"> <m:color color="#F4F4F1FF"/> … </m:colorgroup>
<object id="3" type="model" name="Cub" pid="1" pindex="0">
  <mesh> …
    <triangle v1="0" v2="1" v3="2" pid="2" p1="0"/>                    <!-- slotul 1 -->
    <triangle v1="3" v2="4" v3="5" pid="2" p1="2" paint_color="0C"/>  <!-- slotul 3 -->
```

- **`paint_color`**: atributul de pictare pe triunghi din Bambu Studio și OrcaSlicer. Valoarea e
  starea triunghiului, adică extruderul. Slotul 1 nu se scrie: triunghiul rămâne pe extruderul
  obiectului (1).
- **`slic3rpe:mmu_segmentation`** (exportul „prusa”): același cod, cu numele de atribut din
  PrusaSlicer.
- **`pid`/`p1` spre `m:colorgroup`**: culoarea slotului, pentru programele care citesc culori 3MF
  standard, nu extrudere.
- **`Metadata/magic3d_pictura.json`**: lista sloturilor, în ordine (culoare, nume, material). Tot
  aici sunt și în metadatele modelului (`Magic3D:Filamente`). Magic3D le citește înapoi la import.

### Codul unei stări

Codul e un șir de biți scris în cifre hexazecimale, de la coadă la cap. Ultima cifră conține
primii 4 biți, iar în fiecare cifră bitul cel mai puțin semnificativ vine primul.

Fiecare triunghi începe cu 2 biți: câte laturi are împărțite (0 = triunghi întreg). Pentru un
triunghi întreg urmează starea:

- **stările 0–2**: pe 2 biți;
- **stările 3–15**: biții `11`, apoi 4 biți cu valoarea `stare − 3`.

Un triunghi împărțit continuă cu 2 biți pentru latura specială, apoi cu copiii lui, recursiv.

| extruder | 1 | 2 | 3 | 4 | 5 | 10 | 16 |
|---|---|---|---|---|---|---|---|
| cod | `4` | `8` | `0C` | `1C` | `2C` | `7C` | `DC` |

Magic3D scrie numai triunghiuri întregi. La citire, un triunghi împărțit de slicer primește
starea care acoperă cea mai mare parte din el (`culoarePeTriunghi.ts`).

## Cum s-a verificat (1 noiembrie 2026)

- **Codurile**: comparate cu un proiect salvat de Bambu Studio 2.8.2 (folosit doar local, nu e în
  depozit). Valorile din el, `4`, `0C`, `2C`, `3C` … `7C`, corespund tabelului de mai sus.
- **Dus-întors în Magic3D**: modelul exportat, citit înapoi, are aceleași culori pe aceleași
  triunghiuri, atât în varianta Bambu, cât și în varianta Prusa (`tests/unit/magic3dPictura.test.ts`).
- **Linia de comandă Bambu Studio** (`bambu-studio.exe --slice`) **nu poate verifica fișierul**:
  - Un proiect pictat chiar în Bambu iese cu sute de schimbări de filament când e feliat cu
    setările lui.
  - Cu `--load-settings` (imprimantă sau proces date din afară), același proiect iese fără nicio
    schimbare de filament. Linia de comandă aruncă pictura când i se dau setări.
  - Un 3MF din alt program nu-și aduce setările (Bambu citește configurația de proiect numai din
    fișierele cu `Application` = `BambuStudio-…`), deci în linia de comandă rămâne mereu pe un
    singur filament.
- **Codul sursă Bambu Studio** (`src/libslic3r/Format/bbs_3mf.cpp`):
  - `paint_color` se citește și se aplică pentru orice fișier;
  - culorile 3MF de pe triunghiuri se păstrează separat pentru fișierele din alte programe;
  - atributul `slic3rpe:mmu_segmentation` nu e citit de Bambu. Exportul „prusa” e numai pentru
    PrusaSlicer.
- **Codul sursă PrusaSlicer 2.8.1** (`src/libslic3r/Format/3mf.cpp`, tag `version_2.8.1`):
  - `_handle_start_triangle` citește `slic3rpe:mmu_segmentation` pentru orice triunghi, fără nicio
    condiție de versiune, `Application` sau `Metadata/Slic3r_PE_model.config`; dacă atributul
    lipsește, citește `paint_color` (deci și exportul Bambu se deschide pictat în PrusaSlicer);
  - fără `Slic3r_PE_model.config`, tot obiectul devine un singur volum, iar `_generate_volumes`
    pune pictura pe el cu `set_triangle_from_string`;
  - `slic3rpe:Version3mf` lipsă înseamnă versiunea 0: schimbă doar numele obiectelor și
    instanțele, nu pictura. Nu există o verificare a numărului de extrudere la încărcare.

## Verificare manuală (de făcut cu interfața deschisă)

Fișierele de probă se generează cu:

```bash
PICTURA_OUT=tmp/pictura npx vitest run --config tests/vitest.tools.config.ts tests/tools/picturaProba.tool.ts
```

Comanda scrie un cub și un cilindru pictați în 4 sloturi (alb, roșu, albastru, galben):

- `pictura-proba-bambu.3mf`;
- `pictura-proba-prusa.3mf`.

| Program | Fișier | Ce trebuie să se vadă | Rezultat |
|---|---|---|---|
| Bambu Studio | pictura-proba-bambu.3mf | sus roșu, o latură albastră, una galbenă; cilindrul cu capac roșu și dungi; în „Pictură multi-material” sloturile 1–4 | de verificat |
| OrcaSlicer | pictura-proba-bambu.3mf | la fel | de verificat |
| PrusaSlicer | pictura-proba-prusa.3mf | la fel, în „Pictură multi-material” | de verificat |

Notați rezultatul și, dacă se poate, o captură pentru fiecare program.
