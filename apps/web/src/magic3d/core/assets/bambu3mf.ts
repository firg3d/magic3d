import { strToU8, zipSync } from "fflate";

/*
 * 3MF in formatul de proiect Bambu Studio / OrcaSlicer: fiecare piesa pe placa ei, cu setarile ei de
 * print (Metadata/model_settings.config) si extruderul / filamentul ei. Un program care nu stie
 * extensiile Bambu vede doar geometria (obiectele din 3D/Objects, referite ca componente).
 *
 * Un obiect poate avea mai multe parti (un ornament: baza, textul, rama), fiecare cu extruderul ei:
 * se printeaza impreuna, in culori diferite. Folosit de termoformare si de generatoare.
 *
 * Triunghiurile vin neindexate, Z in sus, mm; varfurile identice se unesc aici.
 *
 * Bambu Studio citeste setarile pe obiect si pe parte (extruderul, umplerea, peretii) doar dintr-un
 * proiect al lui: aplicatia din 3dmodel.model incepe cu "BambuStudio-" (de acolo ia versiunea
 * formatului) si exista Metadata/project_settings.config. Altfel spune "invalid config" si incarca
 * doar geometria. Config-ul numeste imprimanta, procesul si filamentele (inherits_group leaga fiecare
 * slot de presetul lui de sistem); restul setarilor le completeaza Bambu Studio din preseturi.
 */

/** O parte a unui obiect, in coordonatele comune ale obiectului. */
export type ParteBambu = {
  nume: string;
  positions: Float32Array;
  extruder: number;
  /** "modifier_part": nu se printeaza, doar schimba setarile (extruderul) acolo unde acopera obiectul. */
  tip?: "normal_part" | "modifier_part";
  /** Setari de print ale partii (wall_loops, sparse_infill_density...), peste cele ale obiectului. */
  setari?: Record<string, string>;
};

export type ObiectBambu = {
  nume: string;
  /** Triunghiuri neindexate: x y z de trei ori pe triunghi, Z in sus, mm. */
  positions: Float32Array;
  extruder: number;
  setari: Record<string, string>;
  /** Cand exista, obiectul e facut din aceste parti (iar positions si extruder nu se mai folosesc). */
  parti?: ParteBambu[];
  /** Centrul obiectului fata de centrul placii (mm), cand obiectele placii sunt deja asezate; altfel stau in rand pe X. */
  pozitie?: [number, number];
};

export type PlacaBambu = { nume: string; obiecte: ObiectBambu[] };

/** Un slot de filament: presetul de sistem (dupa nume), codul lui, culoarea "#rrggbb" si tipul. */
export type FilamentBambu = { preset: string; id: string; culoare: string; tip: string };

/** Imprimanta, procesul si filamentele numite de proiect; le alege aplicatia (vezi bambuPreseturi). */
export type SlicerBambu = {
  model: string;
  varianta: string;
  duza: number;
  imprimanta: string;
  proces: string;
  /** Cate unul pentru fiecare extruder folosit, in ordinea sloturilor. */
  filamente: FilamentBambu[];
  /**
   * Coltul turnului de curatare (mm, fata de coltul din fata-stanga al placii). Lipsa lui lasa pozitia
   * implicita din Bambu Studio, gandita pentru alt pat: pe A1 mini turnul iese din placa si feliatorul
   * refuza ("G-code path goes beyond plate boundaries").
   */
  turn: { x: number; y: number };
};

export type ProiectBambu = {
  titlu: string;
  /** Text simplu; ajunge in descrierea proiectului si intr-un fisier separat. */
  instructiuni: string;
  /** Latura patului imprimantei, mm (placile se aseaza in grila, ca in Bambu Studio). */
  pat: number;
  placi: PlacaBambu[];
  slicer: SlicerBambu;
};

const CORE = "http://schemas.microsoft.com/3dmanufacturing/core/2015/02";
const PRODUCTIE = "http://schemas.microsoft.com/3dmanufacturing/production/2015/06";
const BAMBU = "http://schemas.bambulab.com/package/2021";
/** Versiunea de format declarata (Bambu Studio 2.8); fara ea proiectul nu e citit ca proiect. */
const VERSIUNE_BAMBU = "02.08.02.61";
const REL_MODEL = "http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel";
/** Distanta dintre placi, ca fractiune din pat (LOGICAL_PART_PLATE_GAP in Bambu Studio). */
const DISTANTA_PLACI = 0.2;

const xml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");

const nr = (v: number) => {
  const r = Math.round(v * 1e5) / 1e5;
  return Object.is(r, -0) ? "0" : String(r);
};

/** UUID determinist (acelasi fisier pentru aceeasi geometrie), in forma ceruta de extensia de productie. */
const uuid = (grup: number, i: number) => `${grup.toString(16).padStart(8, "0")}-${i.toString(16).padStart(4, "0")}-4000-8000-${"0".repeat(12)}`;

/** Varfurile unite si fetele indexate; si cutia, ca obiectul sa poata fi centrat pe placa. */
function indexeaza(positions: Float32Array) {
  const harta = new Map<string, number>();
  const varfuri: number[] = [];
  const fete: number[] = [];
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    const cheie = `${Math.round(positions[i] * 1e4)},${Math.round(positions[i + 1] * 1e4)},${Math.round(positions[i + 2] * 1e4)}`;
    let index = harta.get(cheie);
    if (index === undefined) {
      index = varfuri.length / 3;
      harta.set(cheie, index);
      varfuri.push(positions[i], positions[i + 1], positions[i + 2]);
      for (let a = 0; a < 3; a += 1) { min[a] = Math.min(min[a], positions[i + a]); max[a] = Math.max(max[a], positions[i + a]); }
    }
    fete.push(index);
  }
  // Triunghiurile care s-au strans intr-o linie sau un punct nu mai sunt fete.
  const bune: number[] = [];
  for (let i = 0; i < fete.length; i += 3) if (fete[i] !== fete[i + 1] && fete[i + 1] !== fete[i + 2] && fete[i] !== fete[i + 2]) bune.push(fete[i], fete[i + 1], fete[i + 2]);
  return { varfuri, fete: bune, min, max };
}

/** project_settings.config: doar ce leaga proiectul de preseturile de sistem; restul vine din ele. */
function setariProiect(s: SlicerBambu, placi: number) {
  const f = s.filamente;
  const pePlaca = (v: number) => Array.from({ length: placi }, () => nr(v));
  return {
    name: "project_settings",
    from: "project",
    version: VERSIUNE_BAMBU,
    printer_technology: "FFF",
    printer_model: s.model,
    printer_variant: s.varianta,
    nozzle_diameter: [String(s.duza)],
    printer_settings_id: s.imprimanta,
    print_settings_id: s.proces,
    filament_settings_id: f.map((x) => x.preset),
    filament_ids: f.map((x) => x.id),
    filament_colour: f.map((x) => x.culoare.toUpperCase()),
    filament_type: f.map((x) => x.tip),
    inherits_group: [s.proces, ...f.map((x) => x.preset), s.imprimanta],
    different_settings_to_system: ["", ...f.map(() => ""), ""],
    // cate o pozitie pentru fiecare placa
    wipe_tower_x: pePlaca(s.turn.x),
    wipe_tower_y: pePlaca(s.turn.y),
  };
}

export function proiectBambu(proiect: ProiectBambu): Uint8Array {
  const fisiere: Record<string, Uint8Array> = {};
  const obiecteModel: string[] = [];
  const itemi: string[] = [];
  const setari: string[] = [];
  const placi: string[] = [];
  const asamblare: string[] = [];
  const relatii: string[] = [];
  const coloane = Math.max(1, Math.ceil(Math.sqrt(proiect.placi.length)));
  const pas = proiect.pat * (1 + DISTANTA_PLACI);
  let urmatorId = 1;
  let fisier = 0;

  proiect.placi.forEach((placa, iPlaca) => {
    const col = iPlaca % coloane;
    const rand = Math.floor(iPlaca / coloane);
    const centru = [col * pas + proiect.pat / 2, -rand * pas + proiect.pat / 2];
    const instante: string[] = [];
    // Mai multe obiecte pe o placa stau unul langa altul pe X, centrate impreuna.
    const indexate = placa.obiecte.map((o) => {
      const parti = (o.parti ?? [{ nume: o.nume, positions: o.positions, extruder: o.extruder }]).map((p) => ({ p, m: indexeaza(p.positions) }));
      const min = [0, 1, 2].map((a) => Math.min(...parti.map(({ m }) => m.min[a])));
      const max = [0, 1, 2].map((a) => Math.max(...parti.map(({ m }) => m.max[a])));
      return { o, parti, min, max };
    });
    const latimi = indexate.map(({ min, max }) => max[0] - min[0]);
    const total = latimi.reduce((s, l) => s + l, 0) + 5 * Math.max(0, latimi.length - 1);
    let x = centru[0] - total / 2;
    indexate.forEach(({ o, parti, min, max }, iObiect) => {
      fisier += 1;
      const cale = `3D/Objects/object_${fisier}.model`;
      // Partile centrate impreuna in X/Y, cu baza obiectului la z = 0; asezarea pe placa o face transformarea itemului.
      const cx = (min[0] + max[0]) / 2;
      const cy = (min[1] + max[1]) / 2;
      const meshuri = parti.map(({ p, m }) => {
        const idMesh = urmatorId++;
        const varfuri: string[] = [];
        for (let i = 0; i < m.varfuri.length; i += 3) varfuri.push(`<vertex x="${nr(m.varfuri[i] - cx)}" y="${nr(m.varfuri[i + 1] - cy)}" z="${nr(m.varfuri[i + 2] - min[2])}"/>`);
        const triunghiuri: string[] = [];
        for (let i = 0; i < m.fete.length; i += 3) triunghiuri.push(`<triangle v1="${m.fete[i]}" v2="${m.fete[i + 1]}" v3="${m.fete[i + 2]}"/>`);
        const xmlMesh = `  <object id="${idMesh}" p:UUID="${uuid(idMesh, 1)}" type="model">\n   <mesh>\n    <vertices>\n` + varfuri.join("\n") + `\n    </vertices>\n    <triangles>\n` + triunghiuri.join("\n") + `\n    </triangles>\n   </mesh>\n  </object>`;
        return { p, idMesh, xmlMesh, fete: m.fete.length / 3 };
      });
      const idObiect = urmatorId++;
      fisiere[cale] = strToU8(
        `<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="en-US" xmlns="${CORE}" xmlns:BambuStudio="${BAMBU}" xmlns:p="${PRODUCTIE}" requiredextensions="p">\n` +
          ` <metadata name="BambuStudio:3mfVersion">1</metadata>\n <resources>\n` + meshuri.map((x) => x.xmlMesh).join("\n") + `\n </resources>\n <build/>\n</model>\n`,
      );
      relatii.push(` <Relationship Target="/${cale}" Id="rel-${fisier}" Type="${REL_MODEL}"/>`);
      const componente = meshuri.map((x) => `    <component p:path="/${cale}" objectid="${x.idMesh}" p:UUID="${uuid(x.idMesh, 3)}" transform="1 0 0 0 1 0 0 0 1 0 0 0"/>`);
      obiecteModel.push(`  <object id="${idObiect}" p:UUID="${uuid(idObiect, 2)}" type="model">\n   <components>\n${componente.join("\n")}\n   </components>\n  </object>`);
      const tx = o.pozitie ? centru[0] + o.pozitie[0] : x + latimi[iObiect] / 2;
      const ty = o.pozitie ? centru[1] + o.pozitie[1] : centru[1];
      x += latimi[iObiect] + 5;
      const transformare = `1 0 0 0 1 0 0 0 1 ${nr(tx)} ${nr(ty)} 0`;
      itemi.push(`  <item objectid="${idObiect}" p:UUID="${uuid(idObiect, 4)}" transform="${transformare}" printable="1"/>`);
      const chei = Object.entries({ extruder: String(meshuri[0].p.extruder), ...o.setari }).map(([k, v]) => `    <metadata key="${xml(k)}" value="${xml(v)}"/>`);
      const parteXml = meshuri.map((x) =>
        `    <part id="${x.idMesh}" subtype="${x.p.tip ?? "normal_part"}">\n      <metadata key="name" value="${xml(x.p.nume)}"/>\n      <metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/>\n` +
          `      <metadata key="extruder" value="${x.p.extruder}"/>\n` +
          Object.entries(x.p.setari ?? {}).map(([k, v]) => `      <metadata key="${xml(k)}" value="${xml(v)}"/>\n`).join("") +
          `      <mesh_stat face_count="${x.fete}" edges_fixed="0" degenerate_facets="0" facets_removed="0" facets_reversed="0" backwards_edges="0"/>\n    </part>`);
      setari.push(`  <object id="${idObiect}">\n    <metadata key="name" value="${xml(o.nume)}"/>\n${chei.join("\n")}\n${parteXml.join("\n")}\n  </object>`);
      instante.push(`    <model_instance>\n      <metadata key="object_id" value="${idObiect}"/>\n      <metadata key="instance_id" value="0"/>\n      <metadata key="identify_id" value="${100 + idObiect}"/>\n    </model_instance>`);
      asamblare.push(`   <assemble_item object_id="${idObiect}" instance_id="0" transform="${transformare}" offset="0 0 0"/>`);
    });
    placi.push(
      `  <plate>\n    <metadata key="plater_id" value="${iPlaca + 1}"/>\n    <metadata key="plater_name" value="${xml(placa.nume)}"/>\n    <metadata key="locked" value="false"/>\n${instante.join("\n")}\n  </plate>`,
    );
  });

  const descriere = xml(proiect.instructiuni).replace(/\n/g, "&#10;");
  fisiere["3D/3dmodel.model"] = strToU8(
    `<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="en-US" xmlns="${CORE}" xmlns:BambuStudio="${BAMBU}" xmlns:p="${PRODUCTIE}" requiredextensions="p">\n` +
      ` <metadata name="Application">BambuStudio-${VERSIUNE_BAMBU}</metadata>\n <metadata name="BambuStudio:3mfVersion">1</metadata>\n <metadata name="Magic3D:Generator">Magic3D</metadata>\n` +
      ` <metadata name="Title">${xml(proiect.titlu)}</metadata>\n <metadata name="Description">${descriere}</metadata>\n` +
      ` <resources>\n${obiecteModel.join("\n")}\n </resources>\n <build p:UUID="${uuid(0, 5)}">\n${itemi.join("\n")}\n </build>\n</model>\n`,
  );
  fisiere["3D/_rels/3dmodel.model.rels"] = strToU8(`<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n${relatii.join("\n")}\n</Relationships>\n`);
  fisiere["_rels/.rels"] = strToU8(`<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n <Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="${REL_MODEL}"/>\n</Relationships>\n`);
  fisiere["[Content_Types].xml"] = strToU8(
    `<?xml version="1.0" encoding="UTF-8"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>\n <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>\n <Default Extension="png" ContentType="image/png"/>\n <Default Extension="txt" ContentType="text/plain"/>\n</Types>\n`,
  );
  fisiere["Metadata/model_settings.config"] = strToU8(`<?xml version="1.0" encoding="UTF-8"?>\n<config>\n${setari.join("\n")}\n${placi.join("\n")}\n  <assemble>\n${asamblare.join("\n")}\n  </assemble>\n</config>\n`);
  fisiere["Metadata/project_settings.config"] = strToU8(JSON.stringify(setariProiect(proiect.slicer, proiect.placi.length), null, 4));
  fisiere["Metadata/instructiuni.txt"] = strToU8(proiect.instructiuni);
  return zipSync(fisiere, { level: 6 });
}
