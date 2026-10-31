/**
 * Export 3MF — ZIP cu [Content_Types].xml, _rels/.rels, 3D/3dmodel.model.
 *
 * Un <object> per corp, fiecare cu <mesh> propriu; <build> cu câte un <item>
 * per obiect. FĂRĂ culoare. Coordonatele sunt ABSOLUTE (transformările sunt
 * deja aplicate în mesh), iar <item> nu poartă transform -> poziția relativă
 * dintre corpuri se păstrează la import.
 */
import JSZip from 'jszip';

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
</Types>`;

const RELS = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>`;

export interface Body { name: string; manifold: any; culoare?: string; }

function num(n: number): string {
  // fără notație științifică; precizie de μm e mai mult decât suficientă
  if (Math.abs(n) < 1e-7) return '0';
  return n.toFixed(5).replace(/\.?0+$/, '');
}

function meshXml(manifold: any): string {
  const mesh = manifold.getMesh();
  const vp: Float32Array = mesh.vertProperties;
  const tv: Uint32Array = mesh.triVerts;
  const np: number = mesh.numProp;
  const nVert = vp.length / np;
  const nTri = tv.length / 3;

  const parts: string[] = ['<mesh><vertices>'];
  for (let i = 0; i < nVert; i++) {
    parts.push(`<vertex x="${num(vp[i * np])}" y="${num(vp[i * np + 1])}" z="${num(vp[i * np + 2])}"/>`);
  }
  parts.push('</vertices><triangles>');
  for (let t = 0; t < nTri; t++) {
    parts.push(`<triangle v1="${tv[t * 3]}" v2="${tv[t * 3 + 1]}" v3="${tv[t * 3 + 2]}"/>`);
  }
  parts.push('</triangles></mesh>');
  return parts.join('');
}

/** #RRGGBB (sau #RRGGBBAA) normalizat la formatul cerut de 3MF: #RRGGBBAA majuscule */
function displayColor(c?: string): string | null {
  if (!c) return null;
  const h = c.trim().replace(/^#/, '');
  if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(h)) return null;
  return '#' + (h.length === 6 ? h + 'FF' : h).toUpperCase();
}

function modelXml(bodies: Body[]): string {
  // CULOARE STANDARD 3MF: un singur <basematerials>, cu câte un <base> per corp colorat;
  // obiectul trimite la el prin pid (grupul) + pindex (poziția culorii). Formatul citit
  // de slicere fără dialog de conversie.
  const MAT_ID = 1000;
  const culori: string[] = [];
  const indexCuloare = new Map<number, number>();
  bodies.forEach((b, i) => {
    const c = displayColor(b.culoare);
    if (c) { indexCuloare.set(i, culori.length); culori.push(c); }
  });
  const materiale = culori.length
    ? `  <basematerials id="${MAT_ID}">\n${culori.map((c, i) => `   <base name="culoare-${i + 1}" displaycolor="${c}"/>`).join('\n')}\n  </basematerials>`
    : '';

  const objects: string[] = [];
  const items: string[] = [];
  bodies.forEach((b, i) => {
    const id = i + 1; // id-urile 3MF trebuie pozitive și unice
    const ci = indexCuloare.get(i);
    const attrCuloare = ci === undefined ? '' : ` pid="${MAT_ID}" pindex="${ci}"`;
    objects.push(`  <object id="${id}" type="model" name="${b.name}"${attrCuloare}>${meshXml(b.manifold)}</object>`);
    items.push(`  <item objectid="${id}"/>`);
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
 <resources>
${[materiale, ...objects].filter(Boolean).join('\n')}
 </resources>
 <build>
${items.join('\n')}
 </build>
</model>`;
}

/**
 * Construiește arhiva 3MF în memorie (fără I/O) — folosibilă și în browser.
 * Node scrie pe disc prin export3mf-node.ts; browserul descarcă blob-ul.
 */
export async function build3MF(bodies: Body[]): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', CONTENT_TYPES);
  zip.folder('_rels')!.file('.rels', RELS);
  zip.folder('3D')!.file('3dmodel.model', modelXml(bodies));
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}

/** Declanșează descărcarea 3MF în browser. */
export async function download3MF(bodies: Body[], filename: string): Promise<number> {
  const bytes = await build3MF(bodies);
  /*
   * COPIA SCURTA NU E DE PRISOS: leaga tipul de `ArrayBuffer`.
   *
   * De la TypeScript 5.7, `Uint8Array` e generic peste tipul bufferului, iar `BlobPart` accepta
   * doar vederi legate de `ArrayBuffer`, nu si de `SharedArrayBuffer`. `jszip` returneaza
   * `Uint8Array<ArrayBufferLike>`, adica „poate fi si partajat", deci nu intra in `Blob`.
   *
   * `new Uint8Array(bytes)` copiaza intr-un buffer propriu si ingusteaza tipul la ce e adevarat
   * oricum: datele astea n-au fost niciodata in memorie partajata. Costa o copie de cateva sute
   * de kiloocteti, o data, la apasarea butonului de descarcare.
   */
  const blob = new Blob([new Uint8Array(bytes)], { type: 'model/3mf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  return bytes.length;
}
