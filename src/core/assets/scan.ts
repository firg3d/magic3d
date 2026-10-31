/**
 * npm run scan-tematici
 * Scanează recursiv public/tematici/ după .stl, .3mf și .obj și scrie manifest.json.
 * Fiecare element: { fisier, format, nume, tema, corpuri:[{index,nume,dimensiuni}], dimensiuniTotale }
 * Un fișier cu MAI MULTE obiecte (ex. 3MF MakerWorld) = UN element cu mai multe corpuri.
 * Ignoră complet culoarea. Nu repară nimic.
 */
import { readdirSync, statSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, relative, dirname, basename, sep, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { threeMFBBoxes, parseThreeMF } from './threemf-load.js';
import { renderThumb } from './thumb.js';
// @ts-ignore — opentype.js nu are declarații de tip (ca în restul proiectului)
import opentype from 'opentype.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..'); // src/core/assets -> proiect
const TEMATICI_DIR = join(ROOT, 'public', 'tematici');
const BASE_DIR = join(ROOT, 'public', 'base');
const FONTS_DIR = join(ROOT, 'public', 'fonts');

interface Dim { x: number; y: number; z: number; }
interface Corp { index: number; nume: string; dimensiuni: Dim; }
interface Entry { fisier: string; format: string; nume: string; tema: string; corpuri: Corp[]; dimensiuniTotale: Dim; thumb: string; }

type BBox = { min: number[]; max: number[] };
const emptyBBox = (): BBox => ({ min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] });
const addPt = (bb: BBox, x: number, y: number, z: number) => {
  if (x < bb.min[0]) bb.min[0] = x; if (y < bb.min[1]) bb.min[1] = y; if (z < bb.min[2]) bb.min[2] = z;
  if (x > bb.max[0]) bb.max[0] = x; if (y > bb.max[1]) bb.max[1] = y; if (z > bb.max[2]) bb.max[2] = z;
};
const dimOf = (bb: BBox): Dim => ({ x: +(bb.max[0] - bb.min[0]).toFixed(3), y: +(bb.max[1] - bb.min[1]).toFixed(3), z: +(bb.max[2] - bb.min[2]).toFixed(3) });
const mergeBBox = (a: BBox, b: BBox): BBox => ({ min: [Math.min(a.min[0], b.min[0]), Math.min(a.min[1], b.min[1]), Math.min(a.min[2], b.min[2])], max: [Math.max(a.max[0], b.max[0]), Math.max(a.max[1], b.max[1]), Math.max(a.max[2], b.max[2])] });

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (['.stl', '.3mf', '.obj'].includes(extname(name).toLowerCase())) acc.push(p);
  }
  return acc;
}

// ---------- STL (un singur corp) ----------
function stlBodies(buf: Buffer): BBox[] {
  const bb = emptyBBox();
  const nTriBin = buf.length >= 84 ? buf.readUInt32LE(80) : -1;
  const isBinary = nTriBin >= 0 && buf.length === 84 + nTriBin * 50;
  if (isBinary) {
    let off = 84;
    for (let t = 0; t < nTriBin; t++) { off += 12; for (let v = 0; v < 3; v++) { addPt(bb, buf.readFloatLE(off), buf.readFloatLE(off + 4), buf.readFloatLE(off + 8)); off += 12; } off += 2; }
  } else {
    const re = /vertex\s+(-?[\d.eE+]+)\s+(-?[\d.eE+]+)\s+(-?[\d.eE+]+)/g;
    const s = buf.toString('utf8'); let m: RegExpExecArray | null;
    while ((m = re.exec(s))) addPt(bb, parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]));
  }
  return [bb];
}

// ---------- OBJ (corpuri = grupuri o/g) ----------
function objBodies(buf: Buffer): { bboxes: BBox[]; names: string[] } {
  const lines = buf.toString('utf8').split(/\r?\n/);
  const verts: number[][] = [];
  const groups: { name: string; bb: BBox }[] = [];
  let cur: { name: string; bb: BBox } | null = null;
  const ensure = (name: string) => { cur = { name, bb: emptyBBox() }; groups.push(cur); };
  for (const ln of lines) {
    if (ln.startsWith('v ')) { const p = ln.split(/\s+/); verts.push([parseFloat(p[1]), parseFloat(p[2]), parseFloat(p[3])]); }
    else if (ln.startsWith('o ') || ln.startsWith('g ')) ensure(ln.slice(2).trim() || 'corp');
    else if (ln.startsWith('f ')) {
      if (!cur) ensure('corp');
      for (const tok of ln.slice(2).trim().split(/\s+/)) {
        let vi = parseInt(tok.split('/')[0], 10); if (isNaN(vi)) continue;
        if (vi < 0) vi = verts.length + vi; else vi -= 1;
        const v = verts[vi]; if (v) addPt(cur!.bb, v[0], v[1], v[2]);
      }
    }
  }
  if (groups.length === 0) { const bb = emptyBBox(); for (const v of verts) addPt(bb, v[0], v[1], v[2]); return { bboxes: [bb], names: ['corp'] }; }
  return { bboxes: groups.map((g) => g.bb), names: groups.map((g) => g.name) };
}

// ---------- 3MF: parser partajat (core/assets/threemf-load.ts), refolosit de browser ----------
async function threeMFBodies(buf: Buffer): Promise<{ bboxes: BBox[]; names: string[]; note?: string }> {
  return threeMFBBoxes(buf);
}

// ---------- mesh unic (verts+tris) pentru miniaturi ----------
function stlMesh(buf: Buffer): { verts: number[][]; tris: number[] } {
  const verts: number[][] = []; const tris: number[] = [];
  const nBin = buf.length >= 84 ? buf.readUInt32LE(80) : -1;
  const isBinary = nBin >= 0 && buf.length === 84 + nBin * 50;
  if (isBinary) {
    let off = 84;
    for (let t = 0; t < nBin; t++) { off += 12; const base = verts.length; for (let v = 0; v < 3; v++) { verts.push([buf.readFloatLE(off), buf.readFloatLE(off + 4), buf.readFloatLE(off + 8)]); off += 12; } off += 2; tris.push(base, base + 1, base + 2); }
  } else {
    const re = /vertex\s+(-?[\d.eE+]+)\s+(-?[\d.eE+]+)\s+(-?[\d.eE+]+)/g; const s = buf.toString('utf8'); let m: RegExpExecArray | null; const tmp: number[][] = [];
    while ((m = re.exec(s))) tmp.push([parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])]);
    for (let i = 0; i + 2 < tmp.length; i += 3) { const base = verts.length; verts.push(tmp[i], tmp[i + 1], tmp[i + 2]); tris.push(base, base + 1, base + 2); }
  }
  return { verts, tris };
}
function objMesh(buf: Buffer): { verts: number[][]; tris: number[] } {
  const verts: number[][] = []; const tris: number[] = [];
  for (const ln of buf.toString('utf8').split(/\r?\n/)) {
    if (ln.startsWith('v ')) { const p = ln.split(/\s+/); verts.push([parseFloat(p[1]), parseFloat(p[2]), parseFloat(p[3])]); }
    else if (ln.startsWith('f ')) {
      const idx = ln.slice(2).trim().split(/\s+/).map((tok) => { let vi = parseInt(tok.split('/')[0], 10); if (vi < 0) vi = verts.length + vi; else vi -= 1; return vi; });
      for (let k = 1; k + 1 < idx.length; k++) tris.push(idx[0], idx[k], idx[k + 1]); // fan
    }
  }
  return { verts, tris };
}
async function threeMFMesh(buf: Buffer): Promise<{ verts: number[][]; tris: number[] }> {
  const { corpuri } = await parseThreeMF(buf); const verts: number[][] = []; const tris: number[] = [];
  for (const c of corpuri) { const base = verts.length; for (const v of c.verts) verts.push(v); for (const ti of c.tris) tris.push(base + ti); }
  return { verts, tris };
}
async function meshOf(fmt: string, buf: Buffer): Promise<{ verts: number[][]; tris: number[] }> {
  return fmt === 'stl' ? stlMesh(buf) : fmt === 'obj' ? objMesh(buf) : threeMFMesh(buf);
}
/**
 * Miniatura: imagine utilizator existentă (png/jpg/jpeg/webp) are prioritate; altfel randează PNG
 * lângă fișier. INCREMENTAL: regenerează doar dacă miniatura lipsește sau modelul e mai nou
 * decât ea (mtime). Întoarce și dacă a fost (re)generată, pentru raport.
 */
async function thumbFor(abs: string, fmt: string, dir: string): Promise<{ thumb: string; generated: boolean }> {
  const stem = abs.replace(/\.(stl|3mf|obj)$/i, '');
  const rel = (p: string) => relative(dir, p).split(sep).join('/');
  for (const ext of ['png', 'jpg', 'jpeg', 'webp']) { const p = `${stem}.${ext}`; if (existsSync(p)) return { thumb: rel(p), generated: false }; }
  const out = `${stem}.thumb.png`;
  if (existsSync(out) && statSync(out).mtimeMs >= statSync(abs).mtimeMs) return { thumb: rel(out), generated: false }; // la zi
  const mesh = await meshOf(fmt, readFileSync(abs));
  if (!mesh.tris.length) return { thumb: '', generated: false };
  writeFileSync(out, renderThumb(mesh.verts, mesh.tris));
  return { thumb: rel(out), generated: true };
}

function prettyName(file: string): string { return basename(file).replace(/\.(stl|3mf|obj)$/i, '').replace(/[_-]+/g, ' ').trim(); }

export interface ScanStats { eticheta: string; total: number; fisiere: number; thumbsNoi: number; multiCorp: number; note: string[]; }

// ---------- FONTURI: scanează TOT ce e în public/fonts/, indiferent de listă ----------
export interface FontEntry { fisier: string; familie: string; categorie: string; weight: number; italic: boolean; eticheta: string; lipsaDiacritice: string[]; }
const RO_DIACRITICE: [string, number][] = [['Ș', 0x0218], ['ș', 0x0219], ['Ț', 0x021A], ['ț', 0x021B], ['Ă', 0x0102], ['ă', 0x0103], ['Î', 0x00CE], ['î', 0x00EE], ['Â', 0x00C2], ['â', 0x00E2]];
const numeWeight = (w: number, italic: boolean) => {
  const b: Record<number, string> = { 100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' };
  return (b[w] ?? String(w)) + (italic ? ' Italic' : '');
};
async function scanFonts(quiet = false): Promise<ScanStats> {
  const dir = FONTS_DIR;
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  // categoriile din scripts/fonts-list.json (dacă există); ce nu e în listă => „Altele"
  const catByFamily = new Map<string, string>();
  const listFile = join(ROOT, 'scripts', 'fonts-list.json');
  if (existsSync(listFile)) {
    try {
      const l = JSON.parse(readFileSync(listFile, 'utf8'));
      for (const [cat, fams] of Object.entries(l.categorii ?? {})) for (const f of fams as string[]) catByFamily.set(String(f).replace(/[^a-z0-9]/gi, '').toLowerCase(), cat);
    } catch { /* listă invalidă — toate ajung în „Altele" */ }
  }
  const files = readdirSync(dir).filter((f) => /\.(ttf|otf)$/i.test(f)).sort();
  const entries: FontEntry[] = []; const notes: string[] = [];
  for (const f of files) {
    try {
      const b = readFileSync(join(dir, f));
      const font: any = (opentype as any).parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
      const n = font.names ?? {};
      const familie = (n.preferredFamily?.en || n.fontFamily?.en || basename(f).split('-')[0]).trim();
      const os2 = font.tables?.os2;
      const weight = os2?.usWeightClass || 400;
      const italic = !!(os2?.fsSelection & 1) || /italic/i.test(f);
      const cheie = familie.replace(/[^a-z0-9]/gi, '').toLowerCase();
      const lipsa = RO_DIACRITICE.filter(([, cp]) => font.charToGlyphIndex(String.fromCodePoint(cp)) === 0).map(([nm]) => nm);
      entries.push({ fisier: f, familie, categorie: catByFamily.get(cheie) ?? 'Altele', weight, italic, eticheta: numeWeight(weight, italic), lipsaDiacritice: lipsa });
    } catch (e: any) { notes.push(`EȘEC ${f}: ${e?.message ?? e}`); }
  }
  entries.sort((a, b) => a.familie.localeCompare(b.familie) || a.weight - b.weight || Number(a.italic) - Number(b.italic));
  writeFileSync(join(dir, 'fonts-manifest.json'), JSON.stringify(entries, null, 2));
  const familii = new Set(entries.map((e) => e.familie)).size;
  if (!quiet) {
    console.log(`\n[fonturi] fonts-manifest.json — ${entries.length} fișiere, ${familii} familii`);
    const perCat: Record<string, Set<string>> = {};
    for (const e of entries) (perCat[e.categorie] ??= new Set()).add(e.familie);
    for (const [c, s] of Object.entries(perCat)) console.log(`  ${c}: ${s.size} familii`);
    if (notes.length) { console.log('  eșecuri:'); for (const n of notes) console.log('    ' + n); }
  }
  return { eticheta: 'fonturi', total: entries.length, fisiere: files.length, thumbsNoi: 0, multiCorp: familii, note: notes };
}

// ---------- scan (ACELAȘI parser pentru orice folder de bibliotecă) ----------
async function scanFolder(dir: string, manifestName: string, eticheta: string, quiet = false): Promise<ScanStats> {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const files = walk(dir);
  const entries: Entry[] = [];
  const perFormat: Record<string, number> = { stl: 0, '3mf': 0, obj: 0 };
  const multi: string[] = [];
  const notes: string[] = [];
  let thumbsNoi = 0;

  for (const abs of files) {
    const rel = relative(dir, abs).split(sep).join('/');
    const fmt = extname(abs).slice(1).toLowerCase();
    perFormat[fmt] = (perFormat[fmt] ?? 0) + 1;
    const tema = rel.split('/').length > 1 ? rel.split('/')[0] : 'general';
    try {
      let bboxes: BBox[], names: string[];
      if (fmt === 'stl') { bboxes = stlBodies(readFileSync(abs)); names = [prettyName(abs)]; }
      else if (fmt === 'obj') { const r = objBodies(readFileSync(abs)); bboxes = r.bboxes; names = r.names; }
      else { const r = await threeMFBodies(readFileSync(abs)); bboxes = r.bboxes; names = r.names; if (r.note) notes.push(`${rel}: ${r.note}`); }
      if (!bboxes.length || bboxes.some((b) => !isFinite(b.min[0]))) throw new Error('geometrie goală/invalidă');
      const corpuri: Corp[] = bboxes.map((bb, i) => ({ index: i, nume: names[i] || `corp ${i}`, dimensiuni: dimOf(bb) }));
      const total = bboxes.reduce((a, b) => mergeBBox(a, b), emptyBBox());
      let thumb = '';
      try { const t = await thumbFor(abs, fmt, dir); thumb = t.thumb; if (t.generated) thumbsNoi++; } catch (e: any) { notes.push(`thumb ${rel}: ${e?.message ?? e}`); }
      entries.push({ fisier: rel, format: fmt, nume: prettyName(abs), tema, corpuri, dimensiuniTotale: dimOf(total), thumb });
      if (corpuri.length > 1) multi.push(`${rel} (${corpuri.length} corpuri)`);
    } catch (e: any) {
      notes.push(`EȘEC ${rel}: ${e?.message ?? e}`);
    }
  }

  entries.sort((a, b) => a.tema.localeCompare(b.tema) || a.nume.localeCompare(b.nume));
  writeFileSync(join(dir, manifestName), JSON.stringify(entries, null, 2));

  if (!quiet) {
    console.log(`\n[${eticheta}] ${manifestName} — ${entries.length} elemente din ${files.length} fișiere (miniaturi noi: ${thumbsNoi})`);
    console.log(`  per format: STL=${perFormat.stl} · 3MF=${perFormat['3mf']} · OBJ=${perFormat.obj}`);
    console.log(`  cu mai multe corpuri: ${multi.length}${multi.length ? ' -> ' + multi.join(', ') : ''}`);
    if (notes.length) { console.log('  note/eșecuri:'); for (const n of notes) console.log('    ' + n); }
    for (const e of entries) console.log(`    [${e.tema}] ${e.nume} (${e.format}, ${e.corpuri.length} corp) ${e.dimensiuniTotale.x}×${e.dimensiuniTotale.y}×${e.dimensiuniTotale.z} mm`);
  }
  return { eticheta, total: entries.length, fisiere: files.length, thumbsNoi, multiCorp: multi.length, note: notes };
}

/** Scanează AMBELE biblioteci. Folosit de CLI și de pluginul Vite (/__rescan, pornire dev). */
export async function scanAll(quiet = false): Promise<{ tematici: ScanStats; baze: ScanStats; fonturi: ScanStats }> {
  const tematici = await scanFolder(TEMATICI_DIR, 'manifest.json', 'tematici', quiet);
  const baze = await scanFolder(BASE_DIR, 'base-manifest.json', 'baze', quiet);
  const fonturi = await scanFonts(quiet);
  return { tematici, baze, fonturi };
}

// rulare directă din CLI (npm run scan-tematici); la import (plugin Vite) NU se execută nimic
const invokedAsScript = !!process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (invokedAsScript) await scanAll();
