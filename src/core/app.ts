/**
 * NUCLEU — contractul dintre nucleu și o aplicație de generare parametrică.
 * Nucleul (viewport, ui, geometry, assets) NU știe ce e o literă; primește totul
 * prin AppDefinition. apps/* implementează contractul; nu atinge niciodată alt app.
 * Direcția dependențelor: apps/* -> core/*, NICIODATĂ invers.
 */
import type { BufferGeometry } from 'three';

/** Un corp afișat în viewport. */
export interface SceneObject {
  id: string;
  nume: string;
  geometry: BufferGeometry;
  color: string;
  movable: boolean;   // poate fi selectat și tras în planul feței
  visible?: boolean;
  warn?: boolean;     // marcaj în listă (ex. obiect care plutește, fără contact)
  /**
   * Corpuri SEPARATE pentru randare, fiecare cu culoarea lui (ex. un postament multicolor).
   * Când lipsește, se randează `geometry` cu `color` — comportamentul de până acum.
   * Când e prezentă, `geometry` NU se randează, dar rămâne: e geometria compusă folosită
   * pentru selecție, gizmo și încadrare, deci elementul se mișcă în continuare solidar.
   */
  corpuri?: { geometry: BufferGeometry; color: string }[];
  /**
   * Opacitate 0–1 pentru randare. Lipsă sau 1 = opac, cum a fost până acum.
   *
   * Există pentru MANECHIN: telefonul desenat în husă, ca omul să vadă alinierea înainte de
   * export. Un obiect translucid nu aruncă și nu primește umbră — o fantomă care lasă umbră pe
   * piesă arată ca un defect al piesei.
   */
  opacitate?: number;
}

/** Control declarativ dintr-un panou. Nucleul îl randează; aplicația reacționează. */
export type PanelControl =
  | { kind: 'number'; key: string; label: string; min: number; max: number; step: number; value: number }
  // `grup` opțional: opțiunile cu același grup ajung într-un <optgroup> (ex. Litere / Cifre)
  | { kind: 'select'; key: string; label: string; options: { value: string; label: string; grup?: string }[]; value: string }
  | { kind: 'text'; key: string; label: string; value: string }
  | { kind: 'color'; key: string; label: string; value: string }
  | { kind: 'checkbox'; key: string; label: string; value: boolean }
  | { kind: 'button'; key: string; label: string }
  | { kind: 'note'; key: string; label: string; value: string }   // text read-only (afișaj)
  // selector de font: grupat pe categorii, fiecare opțiune afișată cu propriul caracter
  | { kind: 'fontselect'; key: string; label: string; value: string;
      groups: { categorie: string; items: {
        value: string; label: string; url: string; missing: string[];
        /**
         * MOTIVUL pentru care fontul nu merge la configurația curentă. Prezent = opțiunea se
         * arată GRI, cu motivul dedesubt — dar RĂMÂNE în listă și rămâne alegibilă.
         *
         * Ascunderea ar fi mai simplă și mai proastă: omul ar căuta un font pe care îl știe și
         * n-ar înțelege de ce a dispărut. Cu motivul afișat („trăsătură 6.2 mm, sunt necesari
         * 11"), știe și ce s-a întâmplat, și ce să schimbe.
         */
        respins?: string;
      }[] }[];
      /**
       * Cere verdictul unui font, LA CERERE. Nucleul o cheamă doar pentru rândurile care chiar
       * devin vizibile în listă, prin IntersectionObserver, și marchează rândul când răspunsul
       * sosește.
       *
       * Fără ea, evaluarea se făcea în bloc la pornire: 204 fișiere .ttf, ~15 MB, pentru un
       * panou pe care omul nu-l deschisese. Aplicațiile fără filtrare dinamică (Litere Decor,
       * Brelocuri…) pur și simplu n-o dau.
       */
      cereVerdict?: (fisier: string) => Promise<string | null>;
    };

export interface PanelGroup { title: string; controls: PanelControl[]; }
export interface StatusItem { key: string; text: string; warn?: boolean; }
export interface ExportBody { name: string; manifold: any; culoare?: string;
  /** cum stă piesa pe placă, pentru fișa de producție (ex. „fața cu locașuri în SUS") */
  orientare?: string;
  /** corpurile cu același `grup` = același obiect fizic (culori diferite, suprapuse):
   *  aranjarea pe placă le mută împreună, nu le desparte. */
  grup?: string; }
export interface LibraryItem { id: string; nume: string; tema: string; thumb?: string; }

/** Ce primește aplicația de la nucleu la pornire (ex. ca să ceară o reîmprospătare async). */
export interface AppContext {
  refresh(): void;
  /**
   * Placa de print aleasă în bara de sus, în mm.
   *
   * Nucleul avertizează singur când CONȚINUTUL DIN VIEWPORT depășește placa, dar asta nu e
   * mereu aceeași măsurătoare cu amprenta de PRINT: un nume stă în picioare pe masă, iar la
   * print se culcă pe spate — în viewport ocupă lățime × grosime, pe placă lățime × înălțime.
   * Aplicația care știe cum se așază piesa poate spune și PÂNĂ LA CE dimensiune încape, în loc
   * de „depășește cu 91 mm".
   */
  placa(): { w: number; d: number };
}

/** Definiția unei aplicații pe care nucleul o rulează. */
export interface AppDefinition {
  title: string;
  /**
   * Aplicatia poarta MARCAJUL de la SEM.1 (semnatura Praktik3D in exportul gratuit).
   *
   * Lipsa sau `false` = generator EXISTENT: gratuit, fara filigran, fara semnatura, exact ca
   * pana acum (DECIZIA 1). Cele 12 aplicatii de azi nu o declara, deci nu se schimba nimic la
   * ele - nici geometria, nici interfata.
   *
   * `true` = generator NOU, care cheama `aplicaMarcaj` in constructia lui; shell-ul arata atunci
   * linia de sub butonul de export, si doar cat timp licenta nu da drept comercial.
   */
  poartaMarcaj?: boolean;
  /**
   * Detaliu pe care generatorul îl adaugă la rândul de marcaj din fișă — de exemplu cât de mare
   * e semnătura. Nucleul nu-l poate ști: mărimea e o alegere de produs, nu de licență.
   */
  detaliuMarcaj?: () => string;
  /** identificator stabil, folosit ca prefix pentru datele salvate local (preseturi) */
  id?: string;
  init(ctx: AppContext): Promise<void>;
  /** Controalele pentru selecția curentă (dreapta). id=null => proprietăți globale. */
  panels(selectedId: string | null): PanelGroup[];
  /** PRESETURI — starea completă, SERIALIZABILĂ (fără manifolds: doar referințe la fișiere).
   *  `loadPreset` are voie să fie async: poate reîncărca geometria tematicilor și a bazei. */
  getPreset?(): unknown;
  loadPreset?(preset: unknown): Promise<void> | void;
  /**
   * Reconstruiește scena după orice schimbare.
   *
   * `rapid` cere o versiune de PREVIZUALIZARE, în care aplicația are voie să sară peste
   * finisajele scumpe care nu schimbă poziții sau cote de montaj (la litere: rotunjirea
   * muchiei, 78% din timpul unei reconstrucții). Nucleul o cere doar când reconstrucția
   * completă s-a dovedit lentă, și revine singur cu una completă după ce omul se oprește
   * din tras de cursor. Aplicațiile care nu declară `suportaPreviewRapid` nu o primesc
   * niciodată, deci pot ignora parametrul.
   *
   * Exportul NU folosește niciodată o versiune rapidă — nucleul forțează o reconstrucție
   * completă înainte să ceară corpurile.
   */
  rebuild(optiuni?: { rapid?: boolean }): { objects: SceneObject[]; status: StatusItem[] };
  /** aplicația chiar are un mod de previzualizare mai ieftin; fără el, `rapid` nu se cere */
  suportaPreviewRapid?: boolean;
  /** Un control a fost schimbat (din panou), pentru selecția curentă. */
  onControl(key: string, value: unknown, selectedId: string | null): void;
  /** Un obiect a fost tras. (dx, dy) = cele două axe din planul de lucru, dz = axa perpendiculară.
   *  În modul „mută" toate cele trei săgeți translatează; adâncimea are modul ei separat. */
  onMove(id: string, dxWorld: number, dyWorld: number, dzWorld?: number): void;
  /** Obiect rotit cu mânerul (Δ grade, pe axa inelului apucat; implicit Z). */
  onRotate?(id: string, deltaDeg: number, axis?: 'x' | 'y' | 'z'): void;
  /** Obiect scalat cu mânerul (factor uniform relativ). */
  onScale?(id: string, factor: number): void;
  /** Obiect mutat pe axa de adâncime (Δ world Z, perpendicular pe fața literei). */
  onDepth?(id: string, dzWorld: number): void;
  /** Corpuri pregătite de print (aplicația face orientarea). */
  exportBodies(): ExportBody[];
  /** Numele fișierului de export (fără extensie). */
  exportName(): string;
  /** rânduri de montaj pentru fișa de producție (.txt de lângă 3MF) */
  exportNotes?(): string[];

  modeIndicator?(): string | null;          // ex. "relief"/"gravat"/"locaș"
  library?(): LibraryItem[];                 // biblioteca de tematici (modal „+ tematici")
  onAddFromLibrary?(itemId: string): Promise<void>;
  baseLibrary?(): LibraryItem[];             // biblioteca de baze (modal „+ bază")
  onAddBase?(itemId: string): Promise<void>;
  /** reîncarcă manifestele bibliotecilor (după o rescanare pe server) */
  reloadLibraries?(): Promise<void>;
  onSelect?(id: string | null): void;
  snapshot?(): unknown;                      // pentru undo
  restore?(s: unknown): void;

  // --- info-box (dreapta-jos): date despre obiectul selectat ---
  objectInfo?(id: string | null): { nume: string; dimMM: [number, number, number]; volumeMM3: number; triangles: number } | null;
  // --- TRANSFORMĂRI GENERICE (bara de sus) — valide pentru orice obiect selectat ---
  // getTransform: valorile ABSOLUTE curente (poziție/rotație/scară) ale obiectului.
  getTransform?(id: string): { pos: [number, number, number]; rot: [number, number, number]; scale: [number, number, number]; keepProp?: boolean; canMove?: boolean; canRotate?: boolean; canScale?: boolean; moveOnGround?: boolean;
    /** axele pe care obiectul chiar POATE fi rotit; lipsă = toate trei.
     *  Gizmo-ul arată doar inelele din listă. Fără asta, aplicația poate oferi un inel pe care
     *  `onRotate` îl ignoră, iar obiectul sare înapoi la eliberare — arată exact ca un bug. */
    rotAxes?: ('x' | 'y' | 'z')[];
    /** unghiul (grade, în jurul verticalei) al planului în care se mută obiectul. Lipsă = 0,
     *  adică planul XY al lumii. Obiectele care trăiesc pe fața unei piese rotite trebuie să-l
     *  declare, altfel tragerea „la dreapta" le mută în diagonală sau perpendicular. */
    rotPlan?: number;
    /** obiecte care se mișcă SOLIDAR cu acesta (previzualizate identic, ca să nu „sară" la eliberare) */
    movesWith?: string[] } | null;
  /** limitează o deplasare propusă (ex. litera nu poate ieși de pe bază). Preview-ul folosește
   *  valoarea întoarsă, deci previzualizarea și rezultatul final sunt IDENTICE. */
  clampMove?(id: string, dx: number, dy: number): { dx: number; dy: number; warn?: string };
  // applyTransform: aplică o operație. mode 'relative' = adaugă; 'absolute' = setează.
  applyTransform?(id: string, op: { kind: 'move' | 'rotate' | 'scale'; axis?: 'x' | 'y' | 'z'; value?: number; values?: [number, number, number]; mode: 'relative' | 'absolute' }): void;
  align?(id: string, how: 'centerX' | 'centerY' | 'centerXY' | 'left' | 'right' | 'top' | 'bottom'): void;
  layFlat?(id: string): void;                 // așază obiectul pe fața plată (rotație)
  resetRot?(id: string): void;                // resetează rotația
}
