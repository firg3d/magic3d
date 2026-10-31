/**
 * NUCLEU — PRIMITIVE DE CARCASĂ (HUS.1, B.6).
 *
 * Funcții PURE, testate individual, din care se compun cele șase șabloane de husă. Stau în nucleu,
 * nu în `apps/huse`, fiindcă niciuna nu știe ce e o husă: un contur cu joc, un decupaj cu margine,
 * o buză, un perete subțiat și o tăietură de flexibilitate sunt utile oricărei carcase — a doua
 * aplicație care are nevoie de ele nu trebuie să le rescrie.
 *
 * CE NU CONȚIN: nicio cotă de telefon, nicio decizie de produs. Primesc numere și întorc
 * geometrie. Ce e „margine implicită 1,0 mm" sau „perete subțiat la 0,8" se decide în șablon.
 *
 * CONVENȚIA DE COORDONATE, aceeași cu a datelor de telefon: originea în centrul spatelui,
 * X spre dreapta privit din spate, Y în sus, Z spre exterior.
 */

/** un inel de puncte 2D, ca peste tot în proiect */
export type Punct = [number, number];

// ---------- 1. contur ----------

/**
 * DREPTUNGHI ROTUNJIT, centrat pe origine.
 *
 * Baza oricărei huse: conturul telefonului. Raza se limitează singură la jumătatea laturii mici —
 * o rază mai mare decât atât n-are sens geometric, iar la un offset negativ mare ar produce
 * inele care se auto-intersectează în loc de o formă goală.
 */
export function dreptunghiRotunjit(latime: number, inaltime: number, raza: number,
  segmentePeColt = 16): Punct[] {
  const r = Math.max(0, Math.min(raza, Math.min(latime, inaltime) / 2));
  const x = latime / 2 - r, y = inaltime / 2 - r;
  if (r < 1e-9) return [[-latime / 2, -inaltime / 2], [latime / 2, -inaltime / 2],
    [latime / 2, inaltime / 2], [-latime / 2, inaltime / 2]];
  const out: Punct[] = [];
  // colțurile în ordine trigonometrică, ca inelul să iasă POZITIV (vezi regula de winding)
  const colturi: [number, number, number][] = [
    [x, y, 0], [-x, y, Math.PI / 2], [-x, -y, Math.PI], [x, -y, -Math.PI / 2],
  ];
  for (const [cx, cy, a0] of colturi) {
    for (let i = 0; i <= segmentePeColt; i++) {
      const a = a0 + (i / segmentePeColt) * (Math.PI / 2);
      out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  }
  return out;
}

// ---------- 2. margini pe laturi ----------

export interface Insula { x: number; y: number; latime: number; inaltime: number }
export interface Corp { latime: number; lungime: number }

export interface MarginiDecupaj {
  stanga: number; dreapta: number; jos: number; sus: number;
  /** laturile pe care marginea s-a strâns sub cea dorită */
  stramte: ('stanga' | 'dreapta' | 'jos' | 'sus')[];
  /** laturile pe care decupajul ajunge efectiv la peretele husei */
  laPerete: ('stanga' | 'dreapta' | 'jos' | 'sus')[];
}

/**
 * MARGINEA DECUPAJULUI, PE FIECARE LATURĂ SEPARAT — regula marginii strânse (B.6, șablonul 2).
 *
 * De ce nu o singură margine pentru tot conturul: la iPhone 15 Pro insula ajunge la 34,26 mm
 * dintr-o limită de 34,30. Pe latura aceea nu mai există loc nici pentru margine, nici pentru
 * buză. O margine uniformă ar împinge decupajul peste peretele husei și ar deschide o fantă.
 *
 * Pe latura unde marginea s-a strâns la zero, BUZA DE PROTECȚIE E CHIAR PERETELE lateral al
 * husei — nu se mai construiește una separată, fiindcă n-are unde. Consumatorul citește
 * `laPerete` și sare peste buză pe acele laturi.
 *
 * Nu e un defect al piesei, ci o consecință a telefonului: verificarea care însoțește regula e
 * INFORMATIVĂ, nu avertisment.
 */
export function marginiDecupaj(insula: Insula, corp: Corp, marginiDorita: number): MarginiDecupaj {
  const halfW = corp.latime / 2, halfL = corp.lungime / 2;
  const disponibil = {
    stanga: (insula.x - insula.latime / 2) - (-halfW),
    dreapta: halfW - (insula.x + insula.latime / 2),
    jos: (insula.y - insula.inaltime / 2) - (-halfL),
    sus: halfL - (insula.y + insula.inaltime / 2),
  };
  const out = { stanga: 0, dreapta: 0, jos: 0, sus: 0,
    stramte: [] as MarginiDecupaj['stramte'], laPerete: [] as MarginiDecupaj['laPerete'] };
  for (const latura of ['stanga', 'dreapta', 'jos', 'sus'] as const) {
    const d = Math.max(0, disponibil[latura]);
    out[latura] = Math.min(marginiDorita, d);
    if (out[latura] < marginiDorita - 1e-9) out.stramte.push(latura);
    // „la perete" înseamnă că decupajul ajunge chiar la marginea corpului: sub o zecime de
    // milimetru nu mai rămâne material în care să stea o buză
    if (d <= 0.1) out.laPerete.push(latura);
  }
  return out;
}

/**
 * Conturul decupajului, cu marginile calculate pe fiecare latură.
 *
 * Iese un dreptunghi rotunjit CENTRAT PE INSULĂ ȘI DEPLASAT: marginile fiind diferite pe laturi,
 * centrul decupajului nu mai coincide cu centrul insulei.
 */
export function conturDecupaj(insula: Insula, m: MarginiDecupaj, raza: number,
  segmentePeColt = 16): Punct[] {
  const latime = insula.latime + m.stanga + m.dreapta;
  const inaltime = insula.inaltime + m.jos + m.sus;
  const cx = insula.x + (m.dreapta - m.stanga) / 2;
  const cy = insula.y + (m.sus - m.jos) / 2;
  return dreptunghiRotunjit(latime, inaltime, raza + Math.max(m.stanga, m.dreapta, m.jos, m.sus),
    segmentePeColt).map(([x, y]) => [x + cx, y + cy] as Punct);
}

// ---------- 3. buză ----------

/**
 * ÎNĂLȚIMEA MAXIMĂ A UNEI BUZE, din conul de keepout al camerei.
 *
 * Conul spune: dincolo de unghiul ăsta, la distanța asta de suprafața de referință, nu are voie
 * să intre nimic. O buză prea înaltă intră în câmpul lentilei și apare în poză ca o umbră pe colț.
 *
 * `departare` e cât de departe stă buza de axa lentilei, în plan. Din triunghiul conului iese
 * cât poate urca înainte să-l atingă.
 *
 * Întoarce `Infinity` când nu există con: fără cotă, nu se poate impune o limită, iar o limită
 * inventată ar fi mai rea decât niciuna.
 */
export function inaltimeMaximaBuza(con: { unghi: number | null; distanta: number | null } | null | undefined,
  departare: number): number {
  if (!con || con.unghi === null || con.distanta === null) return Infinity;
  // semi-unghiul conului, măsurat de la axă
  const semi = (con.unghi / 2) * (Math.PI / 180);
  if (semi <= 0 || semi >= Math.PI / 2) return Infinity;
  const tan = Math.tan(semi);
  // Conul pleacă din suprafața de referință și se LĂRGEȘTE în sus. `distanta` spune până unde
  // e cotat: dincolo de raza lui la bază, nu atinge nimic, deci nu impune nicio limită.
  const razaLaBaza = tan * con.distanta;
  if (departare >= razaLaBaza) return Infinity;
  /**
   * Cât poate urca buza până intră în con.
   *
   * Conul are raza `tan(semi) · h` la înălțimea `h`, deci un punct aflat la `departare` de axă
   * e liber cât timp `departare > tan(semi) · h`, adică până la `departare / tan(semi)`.
   *
   * CU CÂT MAI DEPARTE DE AXĂ, CU ATÂT MAI ÎNALTĂ poate fi buza — prima versiune scădea, adică
   * spunea exact pe dos. Se vede și fizic: lângă lentilă conul e îngust și te lasă puțin; la
   * marginea insulei s-a lărgit deja, deci acolo e loc mai mult, nu mai puțin.
   */
  return departare / tan;
}

// ---------- 4. perete subțiat ----------

/**
 * PERETE SUBȚIAT peste un buton, în loc de decupaj.
 *
 * La TPU, un buton acoperit cu 0,8 mm de material se apasă prin husă. Adâncitura se face pe
 * INTERIOR: peretele rămâne întreg la exterior, deci husa arată continuu.
 *
 * Întoarce cât material trebuie SCOS din interior, sau `null` dacă peretele e deja mai subțire
 * decât ținta — caz în care nu se scobește nimic, altfel s-ar face gaură.
 */
export function adancimeSubtiere(grosimePerete: number, grosimeTinta: number): number | null {
  const scos = grosimePerete - grosimeTinta;
  return scos > 1e-6 ? scos : null;
}

// ---------- 5. tăietură de flexibilitate ----------

export interface TaieturaFlex {
  /** punctul de pe contur, la mijlocul racordului */
  centru: Punct;
  /** direcția spre exterior, în grade */
  unghi: number;
  /** centrul cercului de racord — cu el, consumatorul poate muta tăietura pe arc */
  centruRacord: Punct;
  /** raza racordului */
  raza: number;
}

/**
 * TĂIETURI DE FLEXIBILITATE la colțuri (B.6, șablonul 6) — doar la presetul rigid.
 *
 * Un PETG nu se întinde: colțul husei trebuie să se poată deschide la montare. Tăieturile stau
 * pe DIAGONALA colțului, unde materialul se îndoaie cel mai mult, câte una pe colț.
 *
 * Întoarce doar POZIȚIILE și unghiurile; forma tăieturii o face șablonul, fiindcă ea depinde de
 * grosimea peretelui, iar primitiva n-o cunoaște.
 */
export function pozitiiFlexColt(latime: number, inaltime: number, raza: number): TaieturaFlex[] {
  const r = Math.max(0, Math.min(raza, Math.min(latime, inaltime) / 2));
  const x = latime / 2 - r, y = inaltime / 2 - r;
  const d = r / Math.SQRT2;
  return [
    { centru: [x + d, y + d], unghi: 45, centruRacord: [x, y], raza: r },
    { centru: [-x - d, y + d], unghi: 135, centruRacord: [-x, y], raza: r },
    { centru: [-x - d, -y - d], unghi: 225, centruRacord: [-x, -y], raza: r },
    { centru: [x + d, -y - d], unghi: 315, centruRacord: [x, -y], raza: r },
  ];
}

// ---------- 6. decupaje unite ----------

export interface Decupaj { tip: string; x: number; latime: number }

/**
 * DECUPAJELE APROPIATE SE UNESC (B.6, șablonul 4).
 *
 * Două găuri la 2 mm una de alta lasă între ele un dinte de 2 mm care se rupe la prima montare.
 * Sub `distantaMin`, se unesc într-un singur decupaj care le acoperă pe amândouă.
 *
 * Funcția lucrează pe intervale 1D — laturile de jos și de sus ale husei sunt drepte, deci
 * poziția pe X e tot ce contează.
 */
export function unesteDecupaje(decupaje: Decupaj[], distantaMin: number): Decupaj[] {
  if (decupaje.length < 2) return decupaje.map((d) => ({ ...d }));
  const intervale = decupaje
    .map((d) => ({ tip: d.tip, st: d.x - d.latime / 2, dr: d.x + d.latime / 2 }))
    .sort((a, b) => a.st - b.st);
  const out: { tipuri: string[]; st: number; dr: number }[] = [];
  for (const iv of intervale) {
    const ultim = out[out.length - 1];
    if (ultim && iv.st - ultim.dr < distantaMin) {
      ultim.dr = Math.max(ultim.dr, iv.dr);
      if (!ultim.tipuri.includes(iv.tip)) ultim.tipuri.push(iv.tip);
    } else {
      out.push({ tipuri: [iv.tip], st: iv.st, dr: iv.dr });
    }
  }
  return out.map((g) => ({
    tip: g.tipuri.length === 1 ? g.tipuri[0] : g.tipuri.join('+'),
    x: +((g.st + g.dr) / 2).toFixed(4),
    latime: +(g.dr - g.st).toFixed(4),
  }));
}
