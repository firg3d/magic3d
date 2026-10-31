import { strFromU8, unzipSync } from "fflate";

/*
 * Parser 3MF pentru modelele Magic3D (tematici, baze), portat din core/assets/threemf-load.ts al
 * aplicatiei vechi, cu fflate in loc de jszip si sincron (ruleaza in worker-ul generatoarelor).
 * Urmeaza extensia "production" Bambu: radacina 3D/3dmodel.model poate avea doar <components>
 * cu p:path catre parti externe. Fiecare mesh frunza e un CORP, cu culoarea lui daca fisierul o
 * spune (basematerials/colorgroup standard sau extruderul din metadatele Bambu).
 * Nu depinde de manifold: intoarce varfuri si triunghiuri; manifold-ul il face constructorul.
 */

export type CorpModel = { verts: Float32Array; tris: Uint32Array; nume: string; culoare?: string };
type Obiect = {
  verts?: number[];
  tris?: number[];
  name?: string;
  pid?: string;
  pindex?: string;
  comps?: { path: string; oid: string; t: number[] | null }[];
};

const UNIT_MM: Record<string, number> = { micron: 0.001, millimeter: 1, centimeter: 10, inch: 25.4, foot: 304.8, meter: 1000 };
const atribut = (attrs: string, nume: string) => attrs.match(new RegExp(`\\b${nume}="([^"]+)"`))?.[1];

/** Transformare 3MF: 12 numere (4x3, pe randuri); punct-rand: p' = p·M. */
function aplica(v: number[], t: number[] | null): number[] {
  if (!t || t.length < 12) return v;
  return [
    v[0] * t[0] + v[1] * t[3] + v[2] * t[6] + t[9],
    v[0] * t[1] + v[1] * t[4] + v[2] * t[7] + t[10],
    v[0] * t[2] + v[1] * t[5] + v[2] * t[8] + t[11],
  ];
}

function culoareHex(c: string): string {
  const h = c.trim().replace(/^#/, "");
  return "#" + (h.length >= 6 ? h.slice(0, 6) : h.padEnd(6, "0")).toUpperCase();
}

function grupuriCuloare(xml: string): Map<string, string[]> {
  const grupuri = new Map<string, string[]>();
  for (const [tag, element, camp] of [["basematerials", "base", "displaycolor"], ["colorgroup", "color", "color"]] as const) {
    const re = new RegExp(`<(?:\\w+:)?${tag}\\b([^>]*)>([\\s\\S]*?)<\\/(?:\\w+:)?${tag}>`, "gi");
    for (const m of xml.matchAll(re)) {
      const id = atribut(m[1], "id");
      if (!id) continue;
      const culori = [...m[2].matchAll(new RegExp(`<(?:\\w+:)?${element}\\b[^>]*\\b${camp}="([^"]+)"`, "gi"))].map((x) => culoareHex(x[1]));
      if (culori.length) grupuri.set(id, culori);
    }
  }
  return grupuri;
}

function parseazaModel(xml: string): Map<string, Obiect> {
  const obiecte = new Map<string, Obiect>();
  for (const om of xml.matchAll(/<object\b([^>]*)>([\s\S]*?)<\/object>/gi)) {
    const [, attrs, corp] = om;
    const id = atribut(attrs, "id");
    if (!id) continue;
    const comun = { name: atribut(attrs, "name"), pid: atribut(attrs, "pid"), pindex: atribut(attrs, "pindex") };
    if (/<mesh>/.test(corp)) {
      const verts: number[] = [];
      for (const v of corp.matchAll(/<vertex\b[^>]*\bx="([^"]+)"[^>]*\by="([^"]+)"[^>]*\bz="([^"]+)"/gi)) verts.push(+v[1], +v[2], +v[3]);
      const tris: number[] = [];
      for (const t of corp.matchAll(/<triangle\b([^>]*)\/?>/gi)) {
        const v1 = atribut(t[1], "v1");
        const v2 = atribut(t[1], "v2");
        const v3 = atribut(t[1], "v3");
        if (v1 && v2 && v3) tris.push(+v1, +v2, +v3);
      }
      obiecte.set(id, { ...comun, verts, tris });
    } else if (/<components>/.test(corp)) {
      const comps = [...corp.matchAll(/<component\b([^>]*)\/?>/gi)].map((c) => {
        const tr = atribut(c[1], "transform");
        return { path: atribut(c[1], "p:path") ?? "", oid: atribut(c[1], "objectid") ?? "", t: tr ? tr.trim().split(/\s+/).map(Number) : null };
      });
      obiecte.set(id, { ...comun, comps });
    }
  }
  return obiecte;
}

/** Culorile Bambu: extruderul obiectului si al fiecarei parti, citit in paleta filamentelor. */
function culoriBambu(fisiere: Record<string, Uint8Array>): { obiect: Map<string, string>; parti: Map<string, string[]> } {
  const obiect = new Map<string, string>();
  const parti = new Map<string, string[]>();
  try {
    const ms = fisiere["Metadata/model_settings.config"];
    const ps = fisiere["Metadata/project_settings.config"];
    if (!ms || !ps) return { obiect, parti };
    const paleta = JSON.parse(strFromU8(ps)).filament_colour as string[] | undefined;
    if (!paleta?.length) return { obiect, parti };
    const laCuloare = (ex: string) => (paleta[+ex - 1] ?? paleta[0]).toUpperCase();
    for (const m of strFromU8(ms).matchAll(/<object\s+id="([^"]+)"([\s\S]*?)<\/object>/gi)) {
      const ex = m[2].split(/<part\b/)[0].match(/key="extruder"\s+value="(\d+)"/)?.[1];
      if (ex) obiect.set(m[1], laCuloare(ex));
      const lista = [...m[2].matchAll(/<part\b([\s\S]*?)<\/part>/gi)].map((p) => {
        const exP = p[1].match(/key="extruder"\s+value="(\d+)"/)?.[1];
        return exP ? laCuloare(exP) : ex ? laCuloare(ex) : paleta[0].toUpperCase();
      });
      if (lista.length) parti.set(m[1], lista);
    }
  } catch {
    // fara metadate Bambu: corpurile raman fara culoare proprie
  }
  return { obiect, parti };
}

/** Corpurile unui fisier 3MF, in mm, cu transformarile componentelor si ale build item-urilor aplicate. */
export function parseaza3mf(bytes: Uint8Array): CorpModel[] {
  const fisiere = unzipSync(bytes);
  const radacinaCale = Object.keys(fisiere).find((cale) => /(^|\/)3dmodel\.model$/i.test(cale));
  if (!radacinaCale) throw new Error("3MF fara 3D/3dmodel.model");
  const radacinaXml = strFromU8(fisiere[radacinaCale]);
  const unitate = (radacinaXml.match(/<model[^>]*\bunit="([^"]+)"/i)?.[1] ?? "millimeter").toLowerCase();
  const scara = UNIT_MM[unitate] ?? 1;
  const modele = new Map<string, Map<string, Obiect>>([[radacinaCale, parseazaModel(radacinaXml)]]);
  const model = (cale: string) => {
    const norm = cale.replace(/^\//, "");
    let m = modele.get(norm);
    if (!m) {
      if (!fisiere[norm]) throw new Error(`3MF: lipseste ${norm}`);
      m = parseazaModel(strFromU8(fisiere[norm]));
      modele.set(norm, m);
    }
    return m;
  };
  const grupuri = grupuriCuloare(radacinaXml);
  const bambu = culoriBambu(fisiere);
  const culoareStandard = (o?: Obiect) => (o?.pid ? grupuri.get(o.pid)?.[o.pindex ? +o.pindex : 0] : undefined);

  const corpuri: CorpModel[] = [];
  const rezolva = (cale: string, oid: string, lant: (number[] | null)[], radacina: string) => {
    const obj = model(cale).get(oid);
    if (!obj) throw new Error(`3MF: obiectul ${oid} lipseste din ${cale}`);
    if (obj.verts && obj.tris) {
      const verts = new Float32Array(obj.verts.length);
      for (let i = 0; i < obj.verts.length; i += 3) {
        let p = [obj.verts[i], obj.verts[i + 1], obj.verts[i + 2]];
        for (let c = lant.length - 1; c >= 0; c -= 1) p = aplica(p, lant[c]);
        verts[i] = p[0] * scara;
        verts[i + 1] = p[1] * scara;
        verts[i + 2] = p[2] * scara;
      }
      const culoare = culoareStandard(obj) ?? culoareStandard(modele.get(radacinaCale)?.get(radacina))
        ?? bambu.parti.get(radacina)?.[corpuri.length] ?? bambu.obiect.get(radacina);
      corpuri.push({ verts, tris: new Uint32Array(obj.tris), nume: obj.name || `corp ${corpuri.length + 1}`, culoare });
    } else if (obj.comps) {
      for (const c of obj.comps) rezolva(c.path || cale, c.oid, [...lant, c.t], radacina);
    }
  };
  const iteme = [...radacinaXml.matchAll(/<item\b([^>]*)\/?>/gi)];
  if (!iteme.length) throw new Error("3MF fara build items");
  for (const item of iteme) {
    const oid = atribut(item[1], "objectid");
    if (!oid) continue;
    const tr = atribut(item[1], "transform");
    rezolva(radacinaCale, oid, [tr ? tr.trim().split(/\s+/).map(Number) : null], oid);
  }
  if (!corpuri.length) throw new Error("3MF fara niciun corp");
  return corpuri;
}
