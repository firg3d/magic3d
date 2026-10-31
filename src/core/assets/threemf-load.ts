/**
 * NUCLEU — parser 3MF partajat (scaner Node + loader browser). Urmărește extensia
 * "production" a Bambu: rădăcina 3D/3dmodel.model conține doar
 * <components p:path="/3D/Objects/object_N.model">, iar geometria e în părți externe.
 * Compune transformările componentelor cu cele din build items. Fiecare instanță de
 * mesh (frunză) = un CORP. Atributele paint_color (culoare proprietară) sunt IGNORATE.
 * Nu depinde de manifold-3d (parserul e pur); construcția Manifold e opțională.
 */
import { t } from '../i18n/index.js';
import JSZip from 'jszip';

export type ThreeObj = {
  verts?: number[][]; tris?: number[]; name?: string; pid?: string; pindex?: string;
  comps?: { path: string; oid: string; t: number[] | null }[];
};
export interface ThreeMFCorp { verts: number[][]; tris: number[]; name: string; culoare?: string; sursaCuloare?: 'basematerials' | 'colorgroup' | 'extruder'; }
export interface ThreeMFParsed { corpuri: ThreeMFCorp[]; unit: string; scale: number; }

/** grupuri de culoare STANDARD: <basematerials> cu displaycolor și <colorgroup> (Materials & Properties) */
function parseColorGroups(xml: string): Map<string, string[]> {
  const grupuri = new Map<string, string[]>();
  const norm = (c: string) => { const h = c.trim().replace(/^#/, ''); return '#' + (h.length >= 6 ? h.slice(0, 6) : h.padEnd(6, '0')).toUpperCase(); };
  const bm = /<(?:\w+:)?basematerials\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?basematerials>/gi; let m: RegExpExecArray | null;
  while ((m = bm.exec(xml))) {
    const id = m[1].match(/\bid="([^"]+)"/)?.[1]; if (!id) continue;
    const cols: string[] = [];
    const b = /<(?:\w+:)?base\b[^>]*\bdisplaycolor="([^"]+)"/gi; let bmm: RegExpExecArray | null;
    while ((bmm = b.exec(m[2]))) cols.push(norm(bmm[1]));
    if (cols.length) grupuri.set(id, cols);
  }
  const cg = /<(?:\w+:)?colorgroup\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?colorgroup>/gi;
  while ((m = cg.exec(xml))) {
    const id = m[1].match(/\bid="([^"]+)"/)?.[1]; if (!id) continue;
    const cols: string[] = [];
    const c = /<(?:\w+:)?color\b[^>]*\bcolor="([^"]+)"/gi; let cmm: RegExpExecArray | null;
    while ((cmm = c.exec(m[2]))) cols.push(norm(cmm[1]));
    if (cols.length) grupuri.set(id, cols);
  }
  return grupuri;
}

/** Rezervă Bambu: obiect -> extruder (model_settings.config) + paleta filamentelor (project_settings.config).
 *  NU e decodor de triunghiuri pictate — doar atribuirea per obiect, care e o simplă căutare în paletă. */
/**
 * Culorile Bambu, pe două niveluri.
 *
 * `filament_colour` din project_settings.config e paleta; extruderul care o indexează stă în
 * model_settings.config. Atenție: apare în DOUĂ locuri — pe `<object>` (culoarea întregului
 * model) și pe fiecare `<part>` din el. Un model multicolor are extrudere DIFERITE pe părți,
 * iar obiectul are doar una, așa că citirea doar de la nivel de obiect face un model în trei
 * culori să pară monocrom.
 *
 * Părțile se potrivesc cu corpurile ÎN ORDINE: a i-a parte din config = al i-lea corp
 * întors de parser, fiindcă amândouă urmează ordinea componentelor din model.
 */
async function bambuColors(zip: JSZip): Promise<{ obiect: Map<string, string>; parti: Map<string, string[]> }> {
  const obiect = new Map<string, string>();
  const parti = new Map<string, string[]>();
  try {
    const ms = zip.file('Metadata/model_settings.config'); const ps = zip.file('Metadata/project_settings.config');
    if (!ms || !ps) return { obiect, parti };
    const paleta = JSON.parse(await ps.async('string')).filament_colour as string[] | undefined;
    if (!paleta?.length) return { obiect, parti };
    const laCuloare = (ex: string) => (paleta[+ex - 1] ?? paleta[0]).toUpperCase();
    const cfg = await ms.async('string');
    const re = /<object\s+id="([^"]+)"([\s\S]*?)<\/object>/gi; let m: RegExpExecArray | null;
    while ((m = re.exec(cfg))) {
      const id = m[1], corp = m[2];
      // extruderul obiectului: doar metadata dinaintea primei <part>
      const inainteDePart = corp.split(/<part\b/)[0];
      const ex = inainteDePart.match(/key="extruder"\s+value="(\d+)"/)?.[1];
      if (ex) obiect.set(id, laCuloare(ex));
      // extruderul fiecărei părți, în ordine
      const lista: string[] = [];
      const reP = /<part\b([\s\S]*?)<\/part>/gi; let mp: RegExpExecArray | null;
      while ((mp = reP.exec(corp))) {
        const exP = mp[1].match(/key="extruder"\s+value="(\d+)"/)?.[1];
        lista.push(exP ? laCuloare(exP) : (ex ? laCuloare(ex) : paleta[0].toUpperCase()));
      }
      if (lista.length) parti.set(id, lista);
    }
  } catch { /* fără metadate Bambu */ }
  return { obiect, parti };
}

const UNIT_MM: Record<string, number> = { micron: 0.001, millimeter: 1, centimeter: 10, inch: 25.4, foot: 304.8, meter: 1000 };

/** transform 3MF = 12 numere (4x3 row-major); punct-rând: p' = p·M */
export const applyT3MF = (v: number[], t: number[] | null): number[] =>
  !t || t.length < 12 ? v
    : [v[0] * t[0] + v[1] * t[3] + v[2] * t[6] + t[9], v[0] * t[1] + v[1] * t[4] + v[2] * t[7] + t[10], v[0] * t[2] + v[1] * t[5] + v[2] * t[8] + t[11]];

export function parseThreeMFModel(xml: string): Map<string, ThreeObj> {
  const objs = new Map<string, ThreeObj>();
  const objRe = /<object\b([^>]*)>([\s\S]*?)<\/object>/gi;
  let om: RegExpExecArray | null;
  while ((om = objRe.exec(xml))) {
    const attrs = om[1], body = om[2];
    const id = attrs.match(/\bid="([^"]+)"/)?.[1]; if (!id) continue;
    const name = attrs.match(/\bname="([^"]+)"/)?.[1];
    const pid = attrs.match(/\bpid="([^"]+)"/)?.[1];        // grup de culoare (standard 3MF)
    const pindex = attrs.match(/\bpindex="([^"]+)"/)?.[1];  // indexul culorii în grup
    if (/<mesh>/.test(body)) {
      const verts: number[][] = [];
      const vRe = /<vertex\b[^>]*\bx="([^"]+)"[^>]*\by="([^"]+)"[^>]*\bz="([^"]+)"/gi;
      let vm: RegExpExecArray | null;
      while ((vm = vRe.exec(body))) verts.push([parseFloat(vm[1]), parseFloat(vm[2]), parseFloat(vm[3])]);
      const tris: number[] = [];
      const tRe = /<triangle\b([^>]*)\/?>/gi; let tm: RegExpExecArray | null;
      while ((tm = tRe.exec(body))) {
        const a = tm[1];
        const v1 = a.match(/\bv1="([^"]+)"/), v2 = a.match(/\bv2="([^"]+)"/), v3 = a.match(/\bv3="([^"]+)"/);
        if (v1 && v2 && v3) tris.push(+v1[1], +v2[1], +v3[1]); // paint_color IGNORAT
      }
      objs.set(id, { verts, tris, name, pid, pindex });
    } else if (/<components>/.test(body)) {
      const comps: { path: string; oid: string; t: number[] | null }[] = [];
      const cRe = /<component\b([^>]*)\/?>/gi; let cm: RegExpExecArray | null;
      while ((cm = cRe.exec(body))) {
        const a = cm[1];
        const path = a.match(/\bp:path="([^"]+)"/)?.[1] || '';
        const oid = a.match(/\bobjectid="([^"]+)"/)?.[1] || '';
        const tr = a.match(/\btransform="([^"]+)"/)?.[1];
        comps.push({ path, oid, t: tr ? tr.trim().split(/\s+/).map(Number) : null });
      }
      objs.set(id, { comps, name, pid, pindex });
    }
  }
  return objs;
}

/** Parsează un 3MF în corpuri (verts transformate în mm + tris), urmărind p:path. */
export async function parseThreeMF(buf: ArrayBuffer | Uint8Array | Buffer): Promise<ThreeMFParsed> {
  const zip = await JSZip.loadAsync(buf as any);
  const rootFile = zip.file('3D/3dmodel.model') || zip.file(/3dmodel\.model$/i)[0];
  if (!rootFile) throw new Error(t('errors.lipsaModel'));
  const rootXml = await rootFile.async('string');
  const unit = (rootXml.match(/<model[^>]*\bunit="([^"]+)"/i)?.[1] || 'millimeter').toLowerCase();
  const scale = UNIT_MM[unit] ?? 1;

  const models = new Map<string, Map<string, ThreeObj>>();
  models.set('3D/3dmodel.model', parseThreeMFModel(rootXml));
  const loadModel = async (path: string): Promise<Map<string, ThreeObj>> => {
    const norm = path.replace(/^\//, '');
    if (models.has(norm)) return models.get(norm)!;
    const zf = zip.file(norm);
    if (!zf) throw new Error(t('errors.lipsaPath', { cale: norm }));
    const mm = parseThreeMFModel(await zf.async('string'));
    models.set(norm, mm);
    return mm;
  };

  const items: { oid: string; t: number[] | null }[] = [];
  const itemRe = /<item\b([^>]*)\/?>/gi; let im: RegExpExecArray | null;
  while ((im = itemRe.exec(rootXml))) {
    const a = im[1];
    const oid = a.match(/\bobjectid="([^"]+)"/)?.[1]; if (!oid) continue;
    const tr = a.match(/\btransform="([^"]+)"/)?.[1];
    items.push({ oid, t: tr ? tr.trim().split(/\s+/).map(Number) : null });
  }
  if (!items.length) throw new Error(t('errors.lipsaBuildItems'));

  // CULOARE: întâi standardul 3MF (basematerials/colorgroup + pid/pindex), apoi rezerva Bambu
  const grupuriCuloare = parseColorGroups(rootXml);
  const culoriBambu = await bambuColors(zip);
  const culoareStandard = (o?: ThreeObj): string | undefined => {
    if (!o?.pid) return undefined;
    const g = grupuriCuloare.get(o.pid); if (!g) return undefined;
    return g[o.pindex ? +o.pindex : 0];
  };

  const corpuri: ThreeMFCorp[] = [];
  const resolve = async (path: string, oid: string, chain: (number[] | null)[], fallback: string, radacina?: string): Promise<void> => {
    const mm = await loadModel(path);
    const obj = mm.get(oid);
    if (!obj) throw new Error(t('errors.obiectInexistent', { oid, cale: path }));
    if (obj.verts && obj.tris) {
      const verts = obj.verts.map((raw) => {
        let p = raw;
        for (let ci = chain.length - 1; ci >= 0; ci--) p = applyT3MF(p, chain[ci]); // frunză -> rădăcină
        return [p[0] * scale, p[1] * scale, p[2] * scale];
      });
      const std = culoareStandard(obj) ?? (radacina ? culoareStandard(models.get('3D/3dmodel.model')?.get(radacina)) : undefined);
      // întâi extruderul PĂRȚII (modele multicolore), apoi cel al obiectului întreg
      const parti = radacina ? culoriBambu.parti.get(radacina) : undefined;
      const bambu = parti?.[corpuri.length] ?? (radacina ? culoriBambu.obiect.get(radacina) : undefined);
      const culoare = std ?? bambu;
      corpuri.push({ verts, tris: obj.tris, name: obj.name || fallback, culoare,
        sursaCuloare: culoare ? (std ? (grupuriCuloare.size && /basematerials/i.test(rootXml) ? 'basematerials' : 'colorgroup') : 'extruder') : undefined });
    } else if (obj.comps) {
      for (const c of obj.comps) await resolve(c.path || path, c.oid, [...chain, c.t], t('objects.corpN', { n: corpuri.length + 1 }), radacina);
    }
  };
  for (const it of items) await resolve('3D/3dmodel.model', it.oid, [it.t], t('objects.corpN', { n: corpuri.length + 1 }), it.oid);
  if (!corpuri.length) throw new Error(t('errors.niciunCorp'));
  return { corpuri, unit, scale };
}

/** bbox-uri per corp (pentru scaner). */
export async function threeMFBBoxes(buf: ArrayBuffer | Uint8Array | Buffer): Promise<{ bboxes: { min: number[]; max: number[] }[]; names: string[] }> {
  const { corpuri } = await parseThreeMF(buf);
  const bboxes = corpuri.map((c) => {
    const bb = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
    for (const v of c.verts) for (let i = 0; i < 3; i++) { if (v[i] < bb.min[i]) bb.min[i] = v[i]; if (v[i] > bb.max[i]) bb.max[i] = v[i]; }
    return bb;
  });
  return { bboxes, names: corpuri.map((c) => c.name) };
}

/**
 * Loader browser: construiește un Manifold per corp și le COMPUNE într-unul singur
 * (corpurile se mișcă solidar). Buzunarul se va tăia din silueta unită (project()).
 */
export async function threeMFToManifold(
  MOD: any, buf: ArrayBuffer | Uint8Array | Buffer,
): Promise<{ ok: true; data: { manifold: any; triangles: number; dim: [number, number, number]; corpuri: number;
      info: { manifold: any; culoare?: string; sursaCuloare?: string; nume: string; volum: number }[] } } | { ok: false; motiv: string }> {
  let parsed: ThreeMFParsed;
  try { parsed = await parseThreeMF(buf); } catch (e: any) { return { ok: false, motiv: `3MF neparsabil (${e?.message ?? e})` }; }
  const mans: any[] = [];
  let triangles = 0;
  for (const corp of parsed.corpuri) {
    try {
      const flat: number[] = []; for (const v of corp.verts) flat.push(v[0], v[1], v[2]);
      const mesh = new MOD.Mesh({ numProp: 3, vertProperties: new Float32Array(flat), triVerts: new Uint32Array(corp.tris) });
      const man = new MOD.Manifold(mesh);
      if (String(man.status()) !== 'NoError') return { ok: false, motiv: `corp „${corp.name}" nu e manifold (${man.status()})` };
      mans.push(man); triangles += corp.tris.length / 3;
    } catch (e: any) { return { ok: false, motiv: `corp „${corp.name}" nu e manifold (${e?.message ?? e})` }; }
  }
  if (!mans.length) return { ok: false, motiv: 'niciun corp valid' };
  const manifold = mans.length === 1 ? mans[0] : MOD.Manifold.compose(mans);
  const bb = manifold.boundingBox();
  // info per corp, ORDONATĂ DESCRESCĂTOR DUPĂ VOLUM: la export re-împărțim solidul final
  // prin decompose() și potrivim culorile în aceeași ordine (transformările fiind rigide,
  // ordinea după volum se păstrează).
  // Corpurile rămân SEPARATE, exact cum vin din fișier (NU se recuperează prin decompose():
  // corpurile care se ating ar forma o singură componentă conexă și culorile s-ar amesteca).
  // `manifold` (compus) rămâne doar pentru geometria de ansamblu: buzunar + mișcare solidară.
  const info = mans.map((m, i) => ({ manifold: m, culoare: parsed.corpuri[i].culoare, sursaCuloare: parsed.corpuri[i].sursaCuloare, nume: parsed.corpuri[i].name, volum: m.volume() }));
  return { ok: true, data: { manifold, triangles, dim: [bb.max[0] - bb.min[0], bb.max[1] - bb.min[1], bb.max[2] - bb.min[2]], corpuri: parsed.corpuri.length, info } };
}
