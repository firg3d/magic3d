/**
 * APP LITERE — punte între nucleu (manifold) și logica de litere (textSolid/assembly).
 * Configurează modulele de litere cu instanța MOD a nucleului și oferă build().
 */
import { initManifold } from '../../core/geometry/manifold.js';
import { adunaHandle, elibereaza, inArena, type RaportArena } from '../../core/geometry/arena.js';
import { configureManifold as configTextSolid } from '../../core/geometry/textSolid.js';
import { configureManifold as configAssembly, buildAssembly, solideMemorate, AssemblyConfig, Diagnostics, Piesa } from './assembly.js';

export async function initLitere(): Promise<void> {
  const MOD = await initManifold();
  configTextSolid(MOD);
  configAssembly(MOD);
}

export interface BuildResult {
  corpLitera: any;
  corpScris: any | null;
  pieseTematici: Piesa[];
  pocketSils: Record<string, any>;
  /** partea ÎNGROPATĂ a fiecărei piese, ca solid — referința verificării de potrivire la export */
  solideMontaj: Record<string, any>;
  diagnostice: Diagnostics;
  corpBaza: any | null;
  corpBazaCorpuri: { nume: string; culoare?: string; manifold: any }[];
  ms: number;
}

/**
 * Rezultatul reconstrucţiei precedente. Handle-urile lui trăiesc în heap-ul WASM până le
 * eliberăm explicit; le ţinem o tură în plus pentru că exportul lucrează pe ultimul build.
 */
let precedent: BuildResult | null = null;

/** Contabilitatea ultimei arene — citită de teste ca să prindă o scurgere fără a epuiza heap-ul. */
let raportArena: RaportArena | null = null;
export function ultimulRaportArena(): RaportArena | null { return raportArena; }

export function build(config: AssemblyConfig): BuildResult {
  const t0 = performance.now();

  // Toate obiectele intermediare (siluete, scule de buzunar, straturi de soclu, paşii de
  // rotunjire) se eliberează la ieşirea din arenă. Supravieţuiesc doar rezultatul întors şi
  // solidele din memo-cache-ul rotunjirii, care se refolosesc între reconstrucţii.
  const r = inArena(
    () => buildAssembly(config),
    (rez) => [rez, solideMemorate()],
    (rap) => { raportArena = rap; },
  );

  // Reconstrucţia a reuşit, deci rezultatul precedent nu mai e afişat şi nici nu mai poate fi
  // exportat: eliberăm ce nu e partajat cu rezultatul nou sau cu memo-cache-ul. Dacă
  // buildAssembly ar fi aruncat, am fi ieşit mai sus şi precedentul ar fi rămas viu — corect,
  // fiindcă pe ecran rămâne el.
  if (precedent) {
    const vii = adunaHandle(r);
    adunaHandle(solideMemorate(), vii);
    const vechi = adunaHandle(precedent);
    const deSters: any[] = [];
    for (const o of vechi) if (!vii.has(o)) deSters.push(o);
    elibereaza(deSters);
  }

  const out: BuildResult = { ...r, ms: performance.now() - t0 };
  precedent = out;
  return out;
}

/** Eliberează tot ce mai ţine app-ul (schimbare de aplicaţie / reîncărcare). */
export function elibereazaUltimulBuild(): void {
  if (!precedent) return;
  const pastrate = adunaHandle(solideMemorate());
  const deSters: any[] = [];
  for (const o of adunaHandle(precedent)) if (!pastrate.has(o)) deSters.push(o);
  elibereaza(deSters);
  precedent = null;
}
