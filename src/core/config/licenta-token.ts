/**
 * NUCLEU — tokenul de Licenta Comerciala: citire si verificare, complet OFFLINE.
 *
 * DE CE ASIMETRIC. Varianta simpla ar fi fost o semnatura HMAC, cu un secret comun. Dar
 * aplicatia se descarca, iar secretul ar fi stat in pachet: oricine il citeste ar fi putut
 * emite licente valide la nesfarsit. Cu ECDSA, cheia PRIVATA ramane doar la noi (o foloseste
 * `scripts/emite-licenta.mjs`), iar in aplicatie sta doar cheia PUBLICA, cu care se poate
 * verifica dar nu se poate semna. Un token fals ar cere spargerea semnaturii, nu citirea unui
 * fisier.
 *
 * DE CE NU SE VERIFICA PE SERVER. Ar insemna ca aplicatia sa sune acasa la fiecare pornire,
 * ceea ce ar rupe exact promisiunea care o diferentiaza: merge offline si nu trimite nimic.
 * Verificarea offline e mai slaba doar impotriva cuiva care modifica el insusi aplicatia — iar
 * pe acela nu-l opreste nicio schema.
 *
 * CE NU FACE TOKENUL. Nu deblocheaza nimic. Aplicatia e la fel de completa cu el si fara el.
 * Rolul lui e sa arate statutul in interfata, sa puna numarul licentei pe fisa de productie
 * si sa insoteasca rapoartele de problema, ca sa stim cine e client platitor. Restrictionarea
 * ar fi oricum ocolibila intr-o aplicatie care ruleaza integral in browserul omului.
 */

import { seriiActive, COMERCIAL_FIX, type PlanFix } from './coduri-fixe.js';

/** Cheia PUBLICA de verificare (SPKI, base64). Perechea ei privata NU se afla in acest depozit. */
const CHEIE_PUBLICA_B64 =
  'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE0HbbctOaqzF9ztWurKASvv18QwlCfj5LKAYNAXufP01j4gxa5NWmXif3k4Cmo6ijBX6dRPOFu75ZwqXjvKm07Q==';

export type PlanLicenta = '1luna' | '3luni' | '1an';

export interface Licenta {
  /** numarul licentei, cel afisat si pus pe fisa de productie */
  id: string;
  /** pe numele cui e emisa (persoana sau firma) */
  nume: string;
  /** ultima zi de valabilitate, ISO `AAAA-LL-ZZ` */
  expira: string;
  plan: PlanLicenta;
  /**
   * DREPTUL COMERCIAL (DECIZIA 4b din docs/design/semnatura-huse-iphone.md).
   *
   * Optional si absent = `false`, deliberat: toate tokenurile emise pana acum n-au campul, deci
   * raman valide si raman FARA drept comercial. Un camp obligatoriu le-ar fi invalidat pe toate.
   *
   * `plan` de deasupra e DURATA abonamentului, nu un drept — nu se poate deduce dreptul din ea.
   */
  comercial?: boolean;
}

/**
 * Starea licentei.
 *
 * Doua feluri de licenta VALIDA, deliberat sub acelasi `fel`:
 *   · cu `licenta` — token semnat ECDSA, nominal, cu titular si data de expirare;
 *   · cu `plan`    — cod fix, permanent, FARA titular si fara expirare.
 *
 * Sunt membri separati ai uniunii, nu un camp optional, tocmai ca sa nu poata fi confundati:
 * compilatorul cere `'licenta' in st` inainte de a citi `st.licenta.nume`, deci fiecare loc care
 * afiseaza numele titularului e obligat sa spuna ce face cand titular nu exista. Asa nu se poate
 * strecura un „undefined" pe ecran.
 */
export type StareLicenta =
  | { fel: 'lipsa' }
  | { fel: 'invalid'; motiv: string }
  | { fel: 'expirat'; licenta: Licenta }
  | { fel: 'valida'; licenta: Licenta }
  | { fel: 'valida'; plan: PlanFix; serie: number };

/**
 * ARE DREPT COMERCIAL? — singurul loc care raspunde la intrebarea asta.
 *
 * Cele DOUA cai de licentiere raspund aici, ca geometria sa nu le stie pe amandoua:
 *   · token ECDSA — campul `comercial` din payload-ul VERIFICAT, absent = false;
 *   · cod fix     — planul, prin `COMERCIAL_FIX`.
 *
 * O licenta EXPIRATA nu da drept: `fel: 'expirat'` nu intra pe nicio ramura de mai jos.
 */
export function areDreptComercial(st: StareLicenta): boolean {
  if (st.fel !== 'valida') return false;
  if ('licenta' in st) return st.licenta.comercial === true;
  return COMERCIAL_FIX[st.plan] === true;
}

const b64urlLaOcteti = (s: string): Uint8Array<ArrayBuffer> => {
  // `=` existent se scoate INTAI: cheia publica vine in base64 standard, deja cu padding, iar
  // adaugarea altuia peste el strica decodarea. Prima versiune facea exact asta si respingea
  // pana si tokenurile emise corect — testele de falsificare treceau degeaba, fiindca era
  // respins tot.
  const curat = s.replace(/=+$/, '').replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(curat + '==='.slice((curat.length + 3) % 4));
  // ArrayBuffer explicit, nu `new Uint8Array(n)`: WebCrypto cere `BufferSource`, iar TypeScript
  // nu accepta varianta generica `Uint8Array<ArrayBufferLike>` pentru el.
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

let cheie: CryptoKey | null = null;
let cheieB64 = CHEIE_PUBLICA_B64;

/**
 * SCHIMBA CHEIA PUBLICA — numai pentru teste.
 *
 * Implicit e cheia de PRODUCTIE, iar aplicatia n-o atinge niciodata. Exista fiindca altfel
 * verificarea de semnatura nu se poate proba cap-coada: cheia privata de productie nu e in
 * depozit, si nici nu trebuie sa fie. Suita isi genereaza o pereche P-256 efemera la rulare,
 * o pune aici si semneaza cu ea — deci trece prin acelasi `crypto.subtle.verify` ca in produs,
 * fara ca vreun token valid de productie sa existe in cod.
 *
 * Fara argument, revine la cheia de productie.
 */
export function foloseteCheiaPublica(b64?: string): void {
  cheieB64 = b64 ?? CHEIE_PUBLICA_B64;
  cheie = null;                 // cheia importata se arunca: altfel ar ramane cea veche
}

async function cheiaPublica(): Promise<CryptoKey> {
  if (cheie) return cheie;
  cheie = await crypto.subtle.importKey(
    'spki', b64urlLaOcteti(cheieB64),
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'],
  );
  return cheie;
}

/**
 * Verifica un token. Nu arunca niciodata: orice problema devine o stare, fiindca un token
 * gresit nu are voie sa impiedice pornirea aplicatiei.
 *
 * `azi` se poate da explicit ca testele sa nu depinda de ceasul masinii.
 */
export async function verificaToken(token: string | null | undefined, azi = new Date()): Promise<StareLicenta> {
  const t = (token ?? '').trim();
  if (!t) return { fel: 'lipsa' };

  const parti = t.split('.');
  if (parti.length !== 3 || parti[0] !== 'M3D1') return { fel: 'invalid', motiv: 'format necunoscut' };

  let date: Licenta;
  try {
    date = JSON.parse(new TextDecoder().decode(b64urlLaOcteti(parti[1])));
  } catch { return { fel: 'invalid', motiv: 'continut necitibil' }; }
  if (!date?.id || !date?.expira) return { fel: 'invalid', motiv: 'campuri lipsa' };

  let semnaturaOk = false;
  try {
    semnaturaOk = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' }, await cheiaPublica(),
      b64urlLaOcteti(parti[2]), new TextEncoder().encode(parti[1]),
    );
  } catch { return { fel: 'invalid', motiv: 'semnatura necitibila' }; }
  if (!semnaturaOk) return { fel: 'invalid', motiv: 'semnatura nu se potriveste' };

  // Comparatie pe SIRURI de forma AAAA-LL-ZZ: ordinea lexicografica e si cea cronologica, si
  // nu depinde de fusul orar al masinii. Ziua de expirare e inclusiv.
  const aziISO = `${azi.getFullYear()}-${String(azi.getMonth() + 1).padStart(2, '0')}-${String(azi.getDate()).padStart(2, '0')}`;
  if (date.expira < aziISO) return { fel: 'expirat', licenta: date };
  return { fel: 'valida', licenta: date };
}

/**
 * Comparatie in TIMP CONSTANT intre doua siruri.
 *
 * Nu fiindca timing-ul ar fi o amenintare serioasa aici — codul e in pachetul descarcat, cine
 * vrea sa-l afle il citeste direct. E gratis si e obiceiul corect: o comparatie care se opreste
 * la primul caracter diferit spune, prin durata ei, cate caractere ai nimerit. Odata scrisa asa,
 * ramane corecta si daca maine codul ajunge sa fie verificat altundeva.
 */
function egalTimpConstant(a: string, b: string): boolean {
  const n = Math.max(a.length, b.length);
  let dif = a.length ^ b.length;
  for (let i = 0; i < n; i++) dif |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return dif === 0;
}

/**
 * Verifica un COD FIX. Nu arunca niciodata.
 *
 * Nu exista stare `expirat` pe calea asta: licenta e permanenta prin definitie, deci nu se
 * calculeaza nicio data si nu se retine niciun moment al activarii.
 *
 * `async` desi nu asteapta nimic: apelantii trateaza cele doua verificari la fel, iar o functie
 * sincrona strecurata printre ele ar cere `await` uneori si nu altadata — exact genul de
 * asimetrie care produce o stare citita inainte sa fie gata.
 */
export async function verificaCodFix(cod: string | null | undefined): Promise<StareLicenta> {
  const c = (cod ?? '').trim();
  if (!c) return { fel: 'lipsa' };
  for (const s of seriiActive()) {
    if (egalTimpConstant(c, s.cod)) return { fel: 'valida', plan: s.plan, serie: s.serie };
  }
  return { fel: 'invalid', motiv: MOTIV_NEUTRU };
}

/**
 * Motivul aratat cand o intrare nu e recunoscuta, ORICARE dintre cele doua cai ar fi picat.
 *
 * Un mesaj care spune „semnatura nu se potriveste" fata de unul care spune „cod necunoscut" ii
 * arata celui care incearca pe care drum e — si care merita continuat. Campul din Setari
 * primeste acelasi text in ambele cazuri.
 */
const MOTIV_NEUTRU = 'cod nerecunoscut';

/**
 * INTRAREA UNICA pentru campul din Setari si pentru linkul din email: decide singura ce a primit.
 *
 * Detectarea e dupa prefix, nu prin incercarea amandurora: un token semnat incepe intotdeauna cu
 * `M3D1.`, iar codurile fixe nu au voie sa inceapa asa (alfabetul lor nici nu contine punct).
 */
export async function verificaLicenta(text: string | null | undefined, azi = new Date()): Promise<StareLicenta> {
  const v = (text ?? '').trim();
  if (!v) return { fel: 'lipsa' };
  if (v.startsWith('M3D1.')) {
    const st = await verificaToken(v, azi);
    // motivul detaliat ramane pentru teste si pentru emiterea licentelor; interfata primeste
    // acelasi text ca la un cod fix gresit
    return st.fel === 'invalid' ? { fel: 'invalid', motiv: MOTIV_NEUTRU } : st;
  }
  return verificaCodFix(v);
}

/** licenta valida FARA titular — codul fix. Folosit peste tot unde se afiseaza un nume. */
export const esteCodFix = (st: StareLicenta): st is { fel: 'valida'; plan: PlanFix; serie: number } =>
  st.fel === 'valida' && !('licenta' in st);

/** Eticheta scurta pentru bara de jos si pentru fisa de productie. */
export function etichetaLicenta(stare: StareLicenta): string {
  // Codul fix n-are titular si n-are numar de licenta: eticheta lui se opreste la „Licenta
  // Comerciala". Fara ramura asta, `stare.licenta.id` ar fi fost `undefined` si ar fi ajuns
  // ca atare pe ecran si pe fisa de productie.
  if (esteCodFix(stare)) return 'Licenta Comerciala';
  switch (stare.fel) {
    case 'valida': return `Licenta Comerciala #${stare.licenta.id}`;
    case 'expirat': return `Licenta Comerciala #${stare.licenta.id} (expirata)`;
    default: return 'uz personal';
  }
}

/** Cate zile mai are; negativ daca a trecut. Pentru avertismentul „expira in curand". */
export function zileRamase(licenta: Licenta, azi = new Date()): number {
  const [a, l, z] = licenta.expira.split('-').map(Number);
  const cap = Date.UTC(a, l - 1, z);
  const acum = Date.UTC(azi.getFullYear(), azi.getMonth(), azi.getDate());
  return Math.round((cap - acum) / 86400000);
}
