/**
 * NUCLEU — arenă de obiecte WASM pentru manifold-3d.
 *
 * DE CE EXISTĂ. Obiectele Manifold/CrossSection sunt handle-uri embind: memoria lor stă în
 * heap-ul WASM și se eliberează DOAR prin `.delete()`. Garbage collectorul JS nu o atinge.
 * O reconstrucție a unei litere alocă sute de obiecte intermediare (rotunjirea singură face
 * până la 64 de pași, soclul până la 24 de straturi). Fără eliberare, heap-ul creşte
 * monoton şi, după ~113 reconstrucţii pe o scenă uşoară, WASM-ul dă erori de genul
 * „memory access out of bounds", „table index is out of bounds" sau
 * „parameter 0 has unknown type <gunoi>" — ultima fiind un nume de tip citit dintr-un
 * pointer corupt. Simptomul vizibil pentru utilizator: reconstrucţia crapă şi pe ecran
 * rămâne modelul vechi.
 *
 * CUM FUNCŢIONEAZĂ. În loc să presărăm sute de `.delete()` prin codul de geometrie (uşor
 * de ratat unul, şi mai uşor de şters unul încă folosit), interceptăm o singură dată
 * metodele care produc obiecte noi. Cât timp o arenă e deschisă, fiecare obiect produs se
 * înregistrează în ea. La închidere se eliberează tot ce NU e în lista de păstrate.
 *
 * Obiectele intrate ca argument (tematici importate, de pildă) sunt alocate în afara arenei,
 * deci nu sunt niciodată eliberate de ea.
 */

let arenaCurenta: Set<any> | null = null;
let instrumentat = false;

/** Handle WASM viu? (obiectele embind au delete + isDeleted; datele simple, nu) */
function eHandle(x: any): boolean {
  return !!x && typeof x.delete === 'function' && typeof x.isDeleted === 'function';
}

/**
 * Cate handle-uri s-au creat IN AFARA oricarei arene. Un obiect creat fara arena nu e
 * neaparat o scurgere — poate fi eliberat de mana — dar e singurul loc din care scurgerile
 * pot veni, deci contorul spune imediat unde sa te uiti.
 *
 * Exista fiindca aceeasi clasa de defect a fost gasita de trei ori, pe trei cai diferite, si
 * de fiecare data dupa ce facuse rau. Cu contorul, o aplicatie care nu si-a pus arena se
 * anunta singura la prima reconstructie, in loc sa fie descoperita cand cedeaza la client.
 */
let creariInAfaraArenei = 0;
export function contorInAfaraArenei(): number { return creariInAfaraArenei; }

function inregistreaza(rez: any): void {
  if (!rez) return;
  if (!arenaCurenta) {
    if (eHandle(rez)) creariInAfaraArenei++;
    else if (Array.isArray(rez)) for (const x of rez) if (eHandle(x)) creariInAfaraArenei++;
    return;
  }
  if (eHandle(rez)) { arenaCurenta.add(rez); return; }
  if (Array.isArray(rez)) { for (const x of rez) if (eHandle(x)) arenaCurenta.add(x); }
}

/** Adună recursiv toate handle-urile dintr-o structură (rezultatul unui build, un cache...). */
export function adunaHandle(x: any, out: Set<any> = new Set(), adanc = 0): Set<any> {
  if (!x || adanc > 5) return out;
  if (eHandle(x)) { out.add(x); return out; }
  if (Array.isArray(x)) { for (const v of x) adunaHandle(v, out, adanc + 1); return out; }
  if (typeof x === 'object') for (const v of Object.values(x)) adunaHandle(v, out, adanc + 1);
  return out;
}

function inveleste(tinta: any, eticheta: string): void {
  if (!tinta) return;
  const sarite = new Set(['constructor', 'delete', 'isDeleted', 'deleteLater']);
  for (const cheie of Object.getOwnPropertyNames(tinta)) {
    if (sarite.has(cheie)) continue;
    const desc = Object.getOwnPropertyDescriptor(tinta, cheie);
    if (!desc || !desc.writable || typeof desc.value !== 'function') continue;
    const orig = desc.value;
    if ((orig as any).__arena) continue;
    const invelit = function (this: any, ...a: any[]) {
      const r = orig.apply(this, a);
      inregistreaza(r);
      return r;
    };
    (invelit as any).__arena = eticheta;
    try { tinta[cheie] = invelit; } catch { /* proprietate blocată: o lăsăm neinstrumentată */ }
  }
}

/**
 * Se apelează O SINGURĂ DATĂ după initManifold(). Înveleşte metodele de instanţă şi statice
 * ale claselor Manifold şi CrossSection. Fără o arenă deschisă, învelişul nu face nimic.
 */
export function instrumenteazaArena(MOD: any): void {
  if (instrumentat || !MOD) return;

  // ATENŢIE la embind: `MOD.Manifold.prototype` e GOL, iar prototipul real al instanţelor NU
  // e el (`Object.getPrototypeOf(inst) !== Manifold.prototype`). Metodele de instanţă trăiesc
  // pe prototipul unui obiect construit efectiv, deci îl luăm de la o mostră. Prima versiune a
  // acestui fişier învelea `Cls.prototype` şi prindea doar metodele statice: dintr-o
  // reconstrucţie completă se înregistrau 43 de obiecte în loc de câteva sute, iar restul
  // continuau să se scurgă. Testul de memorie prinde exact regresia asta.
  const mostra = (fn: () => any): any => { try { return fn(); } catch { return null; } };
  const tinte: [string, any][] = [
    ['Manifold.static', MOD.Manifold],
    ['CrossSection.static', MOD.CrossSection],
  ];
  const deSters: any[] = [];
  for (const [nume, gen] of [
    ['Manifold', () => MOD.Manifold?.cube([1, 1, 1], true)],
    ['CrossSection', () => MOD.CrossSection?.square([1, 1], true)],
  ] as [string, () => any][]) {
    const m = mostra(gen);
    if (!m) continue;
    deSters.push(m);
    tinte.push([`${nume}.proto`, Object.getPrototypeOf(m)]);
  }
  for (const [nume, tinta] of tinte) if (tinta) inveleste(tinta, nume);
  elibereaza(deSters);   // mostrele au fost create înainte de învelire, deci nu-s în nicio arenă

  // CONSTRUCTORII, nu doar metodele. `textSolid.ts` — drumul fierbinte, rulat la fiecare
  // reconstrucţie — face `new Manifold(mesh)` şi `new CrossSection(inele, 'Positive')`.
  // Învelirea metodelor nu le prinde: fără asta rămânea o scurgere de ~1.4 MB pe
  // reconstrucţie, cu heap-ul WASM tot în creştere liniară. Modulele iau clasele din MOD la
  // fiecare apel (`const { Manifold, Mesh, CrossSection } = MOD`), deci înlocuirea aici
  // ajunge peste tot.
  // NU cu Proxy: un Proxy taxează FIECARE acces de proprietate pe clasă, nu doar `new`, iar
  // apelurile statice (Manifold.cube, Manifold.extrude...) sunt dese în drumul fierbinte.
  // O funcţie-înveliş obişnuită costă doar la construcţie: constructorul care întoarce un
  // obiect îl impune ca rezultat al lui `new`, prototipul partajat păstrează `instanceof`,
  // iar setPrototypeOf face ca metodele statice să se rezolve printr-o simplă căutare în lanţ.
  for (const nume of ['Manifold', 'CrossSection', 'Mesh']) {
    const Cls = MOD[nume];
    if (typeof Cls !== 'function' || (Cls as any).__arena) continue;
    const Invelis = function (this: any, ...a: any[]) {
      const o = new (Cls as any)(...a);
      inregistreaza(o);
      return o;
    } as any;
    Invelis.prototype = Cls.prototype;
    Object.setPrototypeOf(Invelis, Cls);   // metodele statice rămân accesibile
    Invelis.__arena = `${nume}.ctor`;
    try { MOD[nume] = Invelis; } catch { /* proprietate blocată: constructorul rămâne neinstrumentat */ }
  }

  instrumentat = true;
}

/** Eliberează un set de handle-uri, sărind peste cele deja eliberate. Nu aruncă niciodată. */
export function elibereaza(obiecte: Iterable<any>): number {
  let n = 0;
  for (const o of obiecte) {
    try { if (eHandle(o) && !o.isDeleted()) { o.delete(); n++; } } catch { /* deja mort */ }
  }
  return n;
}

export interface RaportArena { alocate: number; pastrate: number; eliberate: number }

/**
 * Rulează `fn` cu o arenă deschisă. `pastreaza(rez)` întoarce structurile ale căror handle-uri
 * trebuie să SUPRAVIEŢUIASCĂ (rezultatul întors, memo-cache-uri). Restul se eliberează.
 *
 * Dacă `fn` aruncă, arena se eliberează integral: nimic din construcţia eşuată nu supravieţuieşte.
 * Arenele se pot imbrica; la închiderea celei interioare, ce se păstrează trece în cea exterioară.
 */
export function inArena<T>(fn: () => T, pastreaza: (rez: T) => any[], raport?: (r: RaportArena) => void): T {
  const exterioara = arenaCurenta;
  const a = new Set<any>();
  arenaCurenta = a;
  let rez: T;
  try {
    rez = fn();
  } catch (e) {
    arenaCurenta = exterioara;
    elibereaza(a);
    throw e;
  }
  arenaCurenta = exterioara;

  const tine = new Set<any>();
  for (const structura of pastreaza(rez)) adunaHandle(structura, tine);

  const deSters: any[] = [];
  for (const o of a) if (!tine.has(o)) deSters.push(o);
  const eliberate = elibereaza(deSters);

  // ce supravieţuieşte trece în grija arenei exterioare (dacă există)
  if (exterioara) for (const o of tine) if (a.has(o)) exterioara.add(o);

  raport?.({ alocate: a.size, pastrate: tine.size, eliberate });
  return rez;
}

/** Doar pentru teste/diagnostic: câte obiecte are arena deschisă acum. */
export function marimeArena(): number { return arenaCurenta ? arenaCurenta.size : -1; }
