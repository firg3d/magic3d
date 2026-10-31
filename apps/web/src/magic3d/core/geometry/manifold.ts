/**
 * NUCLEU — init manifold-3d în browser + conversie mesh manifold -> THREE.BufferGeometry.
 * Generic: nu știe nimic despre litere. Aplicația își configurează modulele geometrice
 * proprii cu instanța MOD returnată de initManifold().
 */
import * as THREE from 'three';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import ManifoldModule from 'manifold-3d';
import { instrumenteazaArena } from './arena.js';

let MOD: any = null;
export function manifoldModule(): any { return MOD; }

/**
 * Adresa fisierului .wasm, luata de la BUNDLER, nu dintr-o cale scrisa de noi.
 *
 * Inainte era `/manifold.wasm`, o copie pusa de mana in public/ — deci fisierul pleca la client
 * de doua ori: o data copiat verbatim si o data emis de Vite cu hash in nume, 528 kB fiecare.
 * Copia din public/ n-avea nici hash, deci la o actualizare de biblioteca browserele ar fi
 * servit-o pe cea veche din cache, langa un glue JS nou.
 *
 * `import.meta.url` rezolva chiar fisierul emis de bundler: acelasi in dezvoltare si in build,
 * cu hash, deci cache lung fara riscul versiunii vechi.
 */
const caleWasm = new URL('manifold-3d/manifold.wasm', import.meta.url).href;

/**
 * DECLARATIA BIBLIOTECII E GRESITA AICI, deci se re-tipeaza local.
 *
 * `manifold-3d` declara `Module(config?: { locateFile: () => string })` — fara parametru.
 * Emscripten insa cheama `locateFile` CU calea fisierului cerut, si de-aia avem nevoie de el:
 * raspundem cu adresa noastra doar pentru `.wasm` si lasam restul neatins. O functie cu un
 * parametru nu e atribuibila uneia declarate fara, deci `tsc` pica pe apel desi codul e corect
 * la rulare.
 *
 * Se re-tipeaza intr-un singur loc, cu motivul scris, in loc de `@ts-expect-error`: asa apelul
 * ramane verificat fata de forma reala a optiunilor. Daca biblioteca isi repara declaratia,
 * alias-ul devine inutil si se scoate.
 */
type ConfigManifold = { locateFile?: (cale: string) => string };
const incarcaManifold = ManifoldModule as unknown as (config?: ConfigManifold) => Promise<any>;

export async function initManifold(): Promise<any> {
  MOD = await incarcaManifold({ locateFile: (p: string) => (p.endsWith('.wasm') ? caleWasm : p) });
  MOD.setup();
  // obiectele manifold trăiesc în heap-ul WASM şi nu sunt colectate de GC-ul JS; arena le
  // urmăreşte ca reconstrucţiile repetate să nu epuizeze heap-ul (vezi arena.ts)
  instrumenteazaArena(MOD);
  return MOD;
}

/**
 * Manifold -> BufferGeometry pentru afișare. Y inversat (convenție de lizibilitate,
 * fonturile vin y-jos) cu winding reintors ca normalele să rămână spre exterior.
 * Normale cu prag 30° (curbe netede, muchii ascuțite).
 */
export function manifoldToGeometry(manifold: any): THREE.BufferGeometry {
  const mesh = manifold.getMesh();
  const np: number = mesh.numProp;
  const src: Float32Array = mesh.vertProperties;
  const nVert = src.length / np;
  const pos = new Float32Array(nVert * 3);
  for (let i = 0; i < nVert; i++) {
    pos[i * 3] = src[i * np];
    pos[i * 3 + 1] = -src[i * np + 1];
    pos[i * 3 + 2] = src[i * np + 2];
  }
  const tv: Uint32Array = mesh.triVerts;
  const idx = new Uint32Array(tv.length);
  for (let t = 0; t < tv.length; t += 3) {
    idx[t] = tv[t]; idx[t + 1] = tv[t + 2]; idx[t + 2] = tv[t + 1];
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  return toCreasedNormals(g, (30 * Math.PI) / 180);
}
