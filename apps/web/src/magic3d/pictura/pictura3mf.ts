/*
 * 3MF multicolor din modul Pictura, si citirea lui inapoi.
 *
 * EXPORT: fiecare corp e un obiect; fiecare triunghi poarta
 *   - `paint_color` (Bambu Studio, OrcaSlicer): starea = slotul (slotul 1 nu se scrie: e
 *     extruderul obiectului, 1); cu `pentru: "prusa"`, acelasi cod in `slic3rpe:mmu_segmentation`;
 *   - `pid`/`p1` spre un `m:colorgroup` cu culorile sloturilor, in ordinea lor, pentru programele
 *     care citesc culori, nu extrudere.
 * Lista filamentelor (ordinea sloturilor) sta in `Metadata/magic3d_pictura.json` si, pe scurt, in
 * metadatele modelului. Detaliile si verificarile: docs/pictura-3mf.md.
 *
 * IMPORT: corpurile cu culoarea pe triunghi, din paint_color / mmu_segmentation, altfel din
 * culorile 3MF (colorgroup, basematerials). Obiectele din alte fisiere ale pachetului (asa scriu
 * Bambu si Prusa proiectele) si transformarile se urmeaza.
 */
import { strToU8, strFromU8, unzipSync, zip, zipSync } from "fflate";
import { layerlingToZUp, zUpToLayerling } from "@/lib/meshCoordinates";
import { codeazaStare, decodeazaStare, STARE_MAXIMA } from "@/magic3d/pictura/culoarePeTriunghi";
import { SLOTURI_MAXIME, type CorpPictat } from "@/magic3d/pictura/date";

export type SlotExport = { culoare: string; nume?: string; material?: string };

export type PentruSlicer = "bambu" | "prusa";

const MODEL = "3D/3dmodel.model";
const META = "Metadata/magic3d_pictura.json";
const CORE = "http://schemas.microsoft.com/3dmanufacturing/core/2015/02";
const MATERIAL = "http://schemas.microsoft.com/3dmanufacturing/material/2015/02";
const PRODUCTIE = "http://schemas.microsoft.com/3dmanufacturing/production/2015/06";

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
  <Default Extension="json" ContentType="application/json"/>
</Types>
`;
const RELS = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/${MODEL}" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>
`;

function xml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
}

function nr(x: number) {
  const r = Math.round(x * 1e6) / 1e6;
  return Object.is(r, -0) ? "0" : String(r);
}

function culoareHex(c: string) {
  return /^#[0-9a-f]{6}$/i.test(c) ? c.toUpperCase() : "#808080";
}

function fisierePictura(corpuri: readonly CorpPictat[], sloturi: readonly SlotExport[], titlu: string, pentru: PentruSlicer) {
  if (sloturi.length < 1 || sloturi.length > SLOTURI_MAXIME) throw new Error(`Numar de sloturi in afara limitelor: ${sloturi.length}`);
  const atribut = pentru === "prusa" ? "slic3rpe:mmu_segmentation" : "paint_color";
  const coduri = sloturi.map((_, i) => (i === 0 ? "" : codeazaStare(i + 1)));
  const obiecte: string[] = [];
  const iteme: string[] = [];
  corpuri.forEach((corp, index) => {
    const n = corp.fete.length / 3;
    if (n === 0) return;
    const id = index + 3; // 1 = basematerials, 2 = colorgroup
    const v = corp.varfuri;
    const varfuri: string[] = [];
    for (let i = 0; i < v.length; i += 3) {
      const [x, y, z] = layerlingToZUp([v[i], v[i + 1], v[i + 2]]);
      varfuri.push(`<vertex x="${nr(x)}" y="${nr(y)}" z="${nr(z)}"/>`);
    }
    const tri: string[] = [];
    for (let t = 0; t < n; t += 1) {
      const slot = Math.min(corp.culori[t], sloturi.length - 1);
      const cod = coduri[slot];
      tri.push(`<triangle v1="${corp.fete[t * 3]}" v2="${corp.fete[t * 3 + 1]}" v3="${corp.fete[t * 3 + 2]}" pid="2" p1="${slot}"${cod ? ` ${atribut}="${cod}"` : ""}/>`);
    }
    obiecte.push(`  <object id="${id}" type="model" name="${xml(corp.nume || `Corp ${index + 1}`)}" pid="1" pindex="0"><mesh><vertices>${varfuri.join("")}</vertices><triangles>${tri.join("")}</triangles></mesh></object>`);
    iteme.push(`  <item objectid="${id}"/>`);
  });
  if (obiecte.length === 0) throw new Error("Exportul 3MF are nevoie de cel putin un corp cu triunghiuri");

  const culori = sloturi.map((s) => culoareHex(s.culoare));
  const baze = culori.map((c, i) => `<base name="${xml(sloturi[i].nume || `Filament ${i + 1}`)}" displaycolor="${c}"/>`).join("");
  const grup = culori.map((c) => `<m:color color="${c}FF"/>`).join("");
  const lista = sloturi.map((s, i) => `${i + 1}:${culori[i]}${s.nume ? ` ${s.nume}` : ""}${s.material ? ` (${s.material})` : ""}`).join("; ");
  const prusaNs = pentru === "prusa" ? ` xmlns:slic3rpe="http://schemas.slic3r.org/3mf/2017/06"` : "";
  const model = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="${CORE}" xmlns:m="${MATERIAL}"${prusaNs}>
${titlu.trim() ? `  <metadata name="Title">${xml(titlu.trim())}</metadata>\n` : ""}  <metadata name="Application">Magic3D</metadata>
  <metadata name="Magic3D:Filamente">${xml(lista)}</metadata>
 <resources>
  <basematerials id="1">${baze}</basematerials>
  <m:colorgroup id="2">${grup}</m:colorgroup>
${obiecte.join("\n")}
 </resources>
 <build>
${iteme.join("\n")}
 </build>
</model>
`;
  const meta = { versiune: 1, pentru, sloturi: sloturi.map((s, i) => ({ slot: i + 1, culoare: culori[i], nume: s.nume ?? "", material: s.material ?? "" })) };
  return {
    "[Content_Types].xml": strToU8(CONTENT_TYPES),
    "_rels/.rels": strToU8(RELS),
    [MODEL]: strToU8(model),
    [META]: strToU8(JSON.stringify(meta, null, 2)),
  };
}

export function exportaPictura3mf(corpuri: readonly CorpPictat[], sloturi: readonly SlotExport[], titlu = "", pentru: PentruSlicer = "bambu"): Uint8Array {
  return zipSync(fisierePictura(corpuri, sloturi, titlu, pentru), { level: 6 });
}

export async function exportaPictura3mfAsync(corpuri: readonly CorpPictat[], sloturi: readonly SlotExport[], titlu = "", pentru: PentruSlicer = "bambu"): Promise<Uint8Array> {
  const fisiere = fisierePictura(corpuri, sloturi, titlu, pentru);
  try {
    return await new Promise<Uint8Array>((ok, nu) => zip(fisiere, { level: 6 }, (e, d) => (e ? nu(e) : ok(d))));
  } catch {
    return zipSync(fisiere, { level: 6 });
  }
}

// ---------------------------------------------------------------------------------------------
// Import

export type PicturaCitita = { corpuri: CorpPictat[]; sloturi: SlotExport[]; pictat: boolean };

type Matrice = number[]; // 12 valori, ca in 3MF: m00 m01 m02 m10 m11 m12 m20 m21 m22 m30 m31 m32
const IDENTITATE: Matrice = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];

function matrice(text: string | null): Matrice {
  if (!text) return IDENTITATE;
  const m = text.trim().split(/\s+/).map(Number);
  return m.length === 12 && m.every(Number.isFinite) ? m : IDENTITATE;
}

/** a, apoi b (vector-rand: p' = p * a * b). */
function compune(a: Matrice, b: Matrice): Matrice {
  const r = new Array<number>(12);
  for (let i = 0; i < 4; i += 1) for (let j = 0; j < 3; j += 1) {
    r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j] + (i === 3 ? b[9 + j] : 0);
  }
  return r;
}

function aplica(m: Matrice, x: number, y: number, z: number): [number, number, number] {
  return [x * m[0] + y * m[3] + z * m[6] + m[9], x * m[1] + y * m[4] + z * m[7] + m[10], x * m[2] + y * m[5] + z * m[8] + m[11]];
}

function copii(el: Element, nume: string) {
  return [...el.children].filter((c) => c.localName === nume);
}

function copil(el: Element | null | undefined, nume: string) {
  return el ? copii(el, nume)[0] ?? null : null;
}

const PALETA_REZERVA = ["#f4f4f1", "#c8282e", "#1f5fbf", "#f5c518", "#1f8a5b", "#1d1f1e", "#ee7a1e", "#7b3fa0"];

/** Culorile filamentelor dintr-un proiect Bambu/Orca (project_settings.config), daca exista. */
function culoriProiectSlicer(fisiere: Record<string, Uint8Array>): string[] | null {
  const cheie = Object.keys(fisiere).find((k) => k.toLowerCase() === "metadata/project_settings.config");
  if (!cheie) return null;
  try {
    const json = JSON.parse(strFromU8(fisiere[cheie])) as { filament_colour?: unknown };
    const lista = Array.isArray(json.filament_colour) ? json.filament_colour.filter((c): c is string => typeof c === "string") : [];
    return lista.length ? lista.map((c) => c.slice(0, 7).toLowerCase()) : null;
  } catch {
    return null;
  }
}

export function citestePictura3mf(bytes: Uint8Array, numeFisier = "Model"): PicturaCitita {
  const fisiere = unzipSync(bytes);
  const chei = new Map(Object.keys(fisiere).map((k) => [k.toLowerCase().replace(/^\//, ""), k]));
  const parser = new DOMParser();
  const documente = new Map<string, Document>();
  const document = (cale: string) => {
    const k = chei.get(cale.toLowerCase().replace(/^\//, ""));
    if (!k) return null;
    let d = documente.get(k);
    if (!d) {
      d = parser.parseFromString(strFromU8(fisiere[k]), "application/xml");
      documente.set(k, d);
    }
    return d;
  };
  const principal = document(MODEL) ?? document([...chei.keys()].find((k) => k.endsWith(".model")) ?? "");
  if (!principal) throw new Error("Fisierul 3MF nu are model 3D");

  // Culorile 3MF (colorgroup / basematerials) dupa "fisier#id".
  const grupuri = new Map<string, string[]>();
  const culoriDin = (doc: Document, cale: string) => {
    for (const el of doc.getElementsByTagNameNS("*", "colorgroup")) grupuri.set(`${cale}#${el.getAttribute("id")}`, copii(el, "color").map((c) => (c.getAttribute("color") ?? "").slice(0, 7).toLowerCase()));
    for (const el of doc.getElementsByTagNameNS("*", "basematerials")) grupuri.set(`${cale}#${el.getAttribute("id")}`, copii(el, "base").map((c) => (c.getAttribute("displaycolor") ?? "").slice(0, 7).toLowerCase()));
  };

  let meta: { sloturi?: { culoare?: unknown; nume?: unknown; material?: unknown }[] } | null = null;
  const cheieMeta = chei.get(META.toLowerCase());
  if (cheieMeta) try { meta = JSON.parse(strFromU8(fisiere[cheieMeta])); } catch { meta = null; }

  let pictat = false;
  const culoriVazute: string[] = [];
  const corpuri: CorpPictat[] = [];

  type Bucata = { pozitii: number[]; stari: number[]; culori: (string | null)[] };
  const adaugaObiect = (doc: Document, cale: string, id: string, m: Matrice, bucata: Bucata, adancime: number) => {
    if (adancime > 16) return;
    const obiect = [...doc.getElementsByTagNameNS("*", "object")].find((o) => o.getAttribute("id") === id);
    if (!obiect) return;
    if (!grupuri.has(`${cale}#__vazut`)) { culoriDin(doc, cale); grupuri.set(`${cale}#__vazut`, []); }
    const plasa = copil(obiect, "mesh");
    if (plasa) {
      const varfuri = copii(copil(plasa, "vertices")!, "vertex").map((v) => aplica(m, Number(v.getAttribute("x")), Number(v.getAttribute("y")), Number(v.getAttribute("z"))));
      const pidObiect = obiect.getAttribute("pid");
      const pindexObiect = Number(obiect.getAttribute("pindex") ?? 0);
      for (const t of copii(copil(plasa, "triangles")!, "triangle")) {
        const idx = [t.getAttribute("v1"), t.getAttribute("v2"), t.getAttribute("v3")].map(Number);
        if (idx.some((i) => !Number.isInteger(i) || i < 0 || i >= varfuri.length)) throw new Error("Triunghi cu varf in afara listei");
        for (const i of idx) bucata.pozitii.push(...zUpToLayerling(varfuri[i]));
        const cod = t.getAttribute("paint_color") ?? t.getAttribute("slic3rpe:mmu_segmentation");
        if (cod) pictat = true;
        bucata.stari.push(Math.min(STARE_MAXIMA, decodeazaStare(cod)));
        const pid = t.getAttribute("pid") ?? pidObiect;
        const p1 = Number(t.getAttribute("p1") ?? (t.getAttribute("pid") ? 0 : pindexObiect));
        bucata.culori.push(pid ? grupuri.get(`${cale}#${pid}`)?.[p1] ?? null : null);
      }
    }
    const componente = copil(obiect, "components");
    if (componente) for (const c of copii(componente, "component")) {
      const caleCopil = c.getAttributeNS(PRODUCTIE, "path") ?? c.getAttribute("p:path");
      const docCopil = caleCopil ? document(caleCopil) : doc;
      if (docCopil) adaugaObiect(docCopil, caleCopil ?? cale, c.getAttribute("objectid") ?? "", compune(matrice(c.getAttribute("transform")), m), bucata, adancime + 1);
    }
  };

  const build = copil(principal.documentElement, "build");
  const iteme = build ? copii(build, "item") : [];
  iteme.forEach((item, i) => {
    const bucata: Bucata = { pozitii: [], stari: [], culori: [] };
    adaugaObiect(principal, MODEL, item.getAttribute("objectid") ?? "", matrice(item.getAttribute("transform")), bucata, 0);
    if (bucata.stari.length === 0) return;
    const n = bucata.stari.length;
    const varfuri = new Float32Array(bucata.pozitii);
    const fete = new Uint32Array(n * 3).map((_, k) => k);
    const culori = new Uint8Array(n);
    for (let t = 0; t < n; t += 1) {
      if (pictat) culori[t] = Math.max(0, bucata.stari[t] - 1);
      else {
        const c = bucata.culori[t];
        if (c && /^#[0-9a-f]{6}$/.test(c)) {
          let k = culoriVazute.indexOf(c);
          if (k < 0 && culoriVazute.length < SLOTURI_MAXIME) { culoriVazute.push(c); k = culoriVazute.length - 1; }
          culori[t] = Math.max(0, k);
        }
      }
    }
    const nume = obiectNume(principal, item.getAttribute("objectid")) || (iteme.length > 1 ? `${numeFisier} ${i + 1}` : numeFisier);
    corpuri.push({ id: `import-${i}`, nume, varfuri, fete, culori });
  });
  if (corpuri.length === 0) throw new Error("Fisierul 3MF nu are corpuri cu triunghiuri");

  const maxim = corpuri.reduce((m, c) => c.culori.reduce((x, y) => (y > x ? y : x), m), 0);
  const nrSloturi = Math.min(SLOTURI_MAXIME, maxim + 1);
  const dinMeta = meta?.sloturi?.map((s) => ({
    culoare: typeof s.culoare === "string" ? s.culoare.toLowerCase() : "",
    nume: typeof s.nume === "string" && s.nume ? s.nume : undefined,
    material: typeof s.material === "string" && s.material ? s.material : undefined,
  }));
  const dinSlicer = culoriProiectSlicer(fisiere);
  const dinGrup = pictat ? [...grupuri.entries()].find(([k, v]) => !k.endsWith("__vazut") && v.length >= nrSloturi)?.[1] : culoriVazute;
  const sloturi: SlotExport[] = [];
  for (let i = 0; i < Math.max(nrSloturi, dinMeta?.length ?? 0, 1); i += 1) {
    const m = dinMeta?.[i];
    const culoare = [m?.culoare, dinSlicer?.[i], dinGrup?.[i], PALETA_REZERVA[i % PALETA_REZERVA.length]].find((c) => !!c && /^#[0-9a-f]{6}$/.test(c))!;
    sloturi.push({ culoare, nume: m?.nume, material: m?.material });
  }
  return { corpuri, sloturi, pictat };
}

function obiectNume(doc: Document, id: string | null) {
  return [...doc.getElementsByTagNameNS("*", "object")].find((o) => o.getAttribute("id") === id)?.getAttribute("name") ?? "";
}
