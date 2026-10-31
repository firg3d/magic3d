/*
 * "Din măsurători -> piesă de schimb": tipurile de piese, cotele pe care le masoara omul si jocul
 * pe care il adauga printul. Totul e calcul pur (testat in tests/unit/magic3dPiese.test.ts); corpurile
 * le face constructie din pieseConstructie.ts, ca forme obisnuite ale editorului.
 *
 * Jocul e pe raza, in mm, si depinde de material: ASA se strange mai mult la racire decat PETG, iar
 * PETG mai mult decat PLA, deci gaurile lui ies mai stramte si cer mai mult loc.
 */

export type Material = "PLA" | "PETG" | "ASA";
export const MATERIALE: Material[] = ["PLA", "PETG", "ASA"];

/** Felul potrivirii: alunecare (se misca liber), presare (sta stramt, fara joc mare), surub (trece un surub). */
export type Potrivire = "alunecare" | "presare" | "surub";

/** Jocul pe raza, in mm, dupa material si potrivire. Valori de pornire bune pentru un print la 0,2 mm. */
export const JOC: Record<Material, Record<Potrivire, number>> = {
  PLA: { alunecare: 0.2, presare: 0.05, surub: 0.25 },
  PETG: { alunecare: 0.25, presare: 0.08, surub: 0.3 },
  ASA: { alunecare: 0.3, presare: 0.1, surub: 0.35 },
};

export type TipPiesa = "bucsa" | "capac" | "dop" | "suportL" | "clema" | "adaptor";
export const TIPURI_PIESE: TipPiesa[] = ["bucsa", "capac", "dop", "suportL", "clema", "adaptor"];

/** O cota de masurat: litera de pe desen, cheia textului, valoarea de pornire si limitele, in mm. */
export type Cota = { cheie: string; litera: string; implicit: number; min: number; max: number };

export const COTE: Record<TipPiesa, Cota[]> = {
  bucsa: [
    { cheie: "diamAx", litera: "A", implicit: 8, min: 1, max: 200 },
    { cheie: "diamExterior", litera: "B", implicit: 16, min: 3, max: 250 },
    { cheie: "lungime", litera: "C", implicit: 10, min: 1, max: 250 },
  ],
  capac: [
    { cheie: "diamTubExterior", litera: "A", implicit: 25, min: 3, max: 250 },
    { cheie: "adancime", litera: "B", implicit: 10, min: 2, max: 100 },
    { cheie: "perete", litera: "C", implicit: 2, min: 0.8, max: 10 },
    { cheie: "grosimeCapac", litera: "D", implicit: 2, min: 0.8, max: 10 },
  ],
  dop: [
    { cheie: "diamTubInterior", litera: "A", implicit: 20, min: 3, max: 250 },
    { cheie: "adancime", litera: "B", implicit: 10, min: 2, max: 100 },
    { cheie: "guler", litera: "C", implicit: 2, min: 0, max: 15 },
    { cheie: "grosimeCapac", litera: "D", implicit: 2, min: 0.8, max: 10 },
  ],
  suportL: [
    { cheie: "latime", litera: "A", implicit: 20, min: 5, max: 200 },
    { cheie: "bratOrizontal", litera: "B", implicit: 40, min: 10, max: 250 },
    { cheie: "bratVertical", litera: "C", implicit: 40, min: 10, max: 250 },
    { cheie: "grosime", litera: "D", implicit: 4, min: 1.2, max: 20 },
    { cheie: "diamSurub", litera: "E", implicit: 4, min: 0, max: 16 },
  ],
  clema: [
    { cheie: "diamTeava", litera: "A", implicit: 22, min: 4, max: 160 },
    { cheie: "latime", litera: "B", implicit: 12, min: 4, max: 100 },
    { cheie: "perete", litera: "C", implicit: 3, min: 1.2, max: 12 },
    { cheie: "diamSurub", litera: "D", implicit: 4, min: 0, max: 12 },
  ],
  adaptor: [
    { cheie: "diam1", litera: "A", implicit: 12, min: 3, max: 200 },
    { cheie: "diam2", litera: "B", implicit: 20, min: 3, max: 200 },
    { cheie: "lungimeCapat", litera: "C", implicit: 15, min: 3, max: 150 },
    { cheie: "perete", litera: "D", implicit: 2, min: 0.8, max: 10 },
  ],
};

export type ValoriCote = Record<string, number>;

export const valoriImplicite = (tip: TipPiesa): ValoriCote => Object.fromEntries(COTE[tip].map((cota) => [cota.cheie, cota.implicit]));

/** Un corp simplu al piesei, in mm: x, z pe placa (mijlocul), elevatia de jos, axa cilindrului in sus (sau culcata pe z). */
export type CorpPiesa = {
  forma: "cilindru" | "cutie" | "con";
  gaura?: boolean;
  x: number;
  z: number;
  elevatie: number;
  latime: number;
  adancime: number;
  inaltime: number;
  /** Cilindru culcat: axa de-a lungul lui z (intoarcere de 90 de grade in jurul lui x). */
  culcat?: boolean;
  /** Con: diametrul de jos si de sus. */
  diamJos?: number;
  diamSus?: number;
};

/** O masura finala si de unde vine: ce a masurat omul, jocul adaugat si cat iese pe piesa. */
export type MasuraFinala = { cheie: string; masurat: number; joc: number; final: number };

export type PiesaCalculata = { corpuri: CorpPiesa[]; masuri: MasuraFinala[]; avertizari: string[] };

const r2 = (valoare: number) => Math.round(valoare * 100) / 100;
const val = (valori: ValoriCote, tip: TipPiesa, cheie: string) => {
  const cota = COTE[tip].find((c) => c.cheie === cheie)!;
  const v = Number(valori[cheie]);
  return Number.isFinite(v) ? Math.min(cota.max, Math.max(cota.min, v)) : cota.implicit;
};

/**
 * O gaura sau un ax dupa o cota: `semn` +1 cand piesa se aseaza peste ceva (gaura mai mare cu
 * dublul jocului pe raza), -1 cand intra in ceva (ax mai mic).
 */
function masura(cheie: string, masurat: number, joc: number, semn: 1 | -1): MasuraFinala {
  return { cheie, masurat, joc: r2(semn * 2 * joc), final: r2(masurat + semn * 2 * joc) };
}

/** Corpurile si masurile finale ale piesei, din cote, material si optiuni. */
export function calculeazaPiesa(tip: TipPiesa, valori: ValoriCote, material: Material, optiuni: { inGaura?: boolean } = {}): PiesaCalculata {
  const joc = JOC[material];
  const v = (cheie: string) => val(valori, tip, cheie);
  const avertizari: string[] = [];

  if (tip === "bucsa") {
    const interior = masura("diamAx", v("diamAx"), joc.alunecare, 1);
    // Exteriorul ramane cum e, sau intra stramt intr-o gaura.
    const exterior = optiuni.inGaura ? masura("diamExterior", v("diamExterior"), joc.presare, -1) : masura("diamExterior", v("diamExterior"), 0, 1);
    const lungime = v("lungime");
    if (exterior.final - interior.final < 1.6) avertizari.push("pereteSubtire");
    return {
      masuri: [interior, exterior, { cheie: "lungime", masurat: lungime, joc: 0, final: lungime }],
      avertizari,
      corpuri: [
        { forma: "cilindru", x: 0, z: 0, elevatie: 0, latime: exterior.final, adancime: exterior.final, inaltime: lungime },
        { forma: "cilindru", gaura: true, x: 0, z: 0, elevatie: -1, latime: interior.final, adancime: interior.final, inaltime: lungime + 2 },
      ],
    };
  }

  if (tip === "capac") {
    // Capacul se aseaza peste tub: cavitatea, cat tubul plus jocul de presare (sta pus, nu cade).
    const cavitate = masura("diamTubExterior", v("diamTubExterior"), joc.presare, 1);
    const perete = v("perete");
    const adancime = v("adancime");
    const fund = v("grosimeCapac");
    const exterior = r2(cavitate.final + 2 * perete);
    return {
      masuri: [cavitate, { cheie: "diamExteriorCapac", masurat: exterior, joc: 0, final: exterior }],
      avertizari,
      corpuri: [
        { forma: "cilindru", x: 0, z: 0, elevatie: 0, latime: exterior, adancime: exterior, inaltime: fund + adancime },
        // Printat cu fundul pe placa: cavitatea deschisa in sus.
        { forma: "cilindru", gaura: true, x: 0, z: 0, elevatie: fund, latime: cavitate.final, adancime: cavitate.final, inaltime: adancime + 1 },
      ],
    };
  }

  if (tip === "dop") {
    // Dopul intra in tub: mai mic cu jocul de presare; gulerul il opreste la margine.
    const corp = masura("diamTubInterior", v("diamTubInterior"), joc.presare, -1);
    const guler = r2(v("diamTubInterior") + 2 * v("guler"));
    const capac = v("grosimeCapac");
    return {
      masuri: [corp, { cheie: "diamGuler", masurat: guler, joc: 0, final: guler }],
      avertizari,
      corpuri: [
        { forma: "cilindru", x: 0, z: 0, elevatie: 0, latime: Math.max(guler, corp.final), adancime: Math.max(guler, corp.final), inaltime: capac },
        { forma: "cilindru", x: 0, z: 0, elevatie: capac, latime: corp.final, adancime: corp.final, inaltime: v("adancime") },
      ],
    };
  }

  if (tip === "suportL") {
    const a = v("latime");
    const b = v("bratOrizontal");
    const c = v("bratVertical");
    const g = v("grosime");
    const surub = v("diamSurub");
    const gaura = surub > 0 ? masura("diamSurub", surub, joc.surub, 1) : null;
    const corpuri: CorpPiesa[] = [
      // Bratul culcat pe placa, de-a lungul lui z; bratul in picioare la capatul din spate.
      { forma: "cutie", x: 0, z: 0, elevatie: 0, latime: a, adancime: b, inaltime: g },
      { forma: "cutie", x: 0, z: -b / 2 + g / 2, elevatie: 0, latime: a, adancime: g, inaltime: c },
    ];
    if (gaura) {
      if (gaura.final > a - 2 * 1.2) avertizari.push("gauraPreaMare");
      corpuri.push(
        // Gaura bratului culcat: la mijlocul partii lui libere, intre bratul in picioare (z = -b/2 + g) si capat (z = b/2).
        { forma: "cilindru", gaura: true, x: 0, z: g / 2, elevatie: -1, latime: gaura.final, adancime: gaura.final, inaltime: g + 2 },
        { forma: "cilindru", gaura: true, culcat: true, x: 0, z: -b / 2 + g / 2, elevatie: g + (c - g) / 2 - gaura.final / 2, latime: gaura.final, adancime: g + 2, inaltime: gaura.final },
      );
    }
    return { masuri: gaura ? [gaura] : [], avertizari, corpuri };
  }

  if (tip === "clema") {
    // Clema se inchide peste teava: interiorul cu jocul de presare, o deschidere in fata de trei sferturi din diametru.
    const interior = masura("diamTeava", v("diamTeava"), joc.presare, 1);
    const perete = v("perete");
    const latime = v("latime");
    const exterior = r2(interior.final + 2 * perete);
    const surub = v("diamSurub");
    const gaura = surub > 0 ? masura("diamSurub", surub, joc.surub, 1) : null;
    const urechi = gaura ? gaura.final + 2 * perete : 0;
    const placa = exterior + 2 * urechi;
    const corpuri: CorpPiesa[] = [
      { forma: "cilindru", x: 0, z: 0, elevatie: 0, latime: exterior, adancime: exterior, inaltime: latime },
      { forma: "cilindru", gaura: true, x: 0, z: 0, elevatie: -1, latime: interior.final, adancime: interior.final, inaltime: latime + 2 },
      { forma: "cutie", gaura: true, x: 0, z: exterior / 2 - perete / 2, elevatie: -1, latime: r2(interior.final * 0.75), adancime: perete * 2 + 1, inaltime: latime + 2 },
      // Placa de prindere in spate, cu urechile pentru suruburi.
      { forma: "cutie", x: 0, z: -exterior / 2 + perete / 2, elevatie: 0, latime: r2(placa), adancime: perete, inaltime: latime },
    ];
    if (gaura) {
      for (const semn of [-1, 1]) corpuri.push({ forma: "cilindru", gaura: true, culcat: true, x: r2(semn * (exterior / 2 + urechi / 2)), z: -exterior / 2 + perete / 2, elevatie: latime / 2 - gaura.final / 2, latime: gaura.final, adancime: perete + 2, inaltime: gaura.final });
    }
    return { masuri: gaura ? [interior, gaura] : [interior], avertizari, corpuri };
  }

  // Adaptor: doua capete care intra stramt in doua furtunuri sau tevi de diametre diferite, cu o trecere conica.
  const capat1 = masura("diam1", v("diam1"), joc.presare, -1);
  const capat2 = masura("diam2", v("diam2"), joc.presare, -1);
  const lungime = v("lungimeCapat");
  const perete = v("perete");
  const trecere = 6;
  const canal = r2(Math.min(capat1.final, capat2.final) - 2 * perete);
  if (canal < 2) avertizari.push("canalPreaMic");
  return {
    masuri: [capat1, capat2, { cheie: "canal", masurat: canal, joc: 0, final: canal }],
    avertizari,
    corpuri: [
      { forma: "cilindru", x: 0, z: 0, elevatie: 0, latime: capat1.final, adancime: capat1.final, inaltime: lungime },
      { forma: "con", x: 0, z: 0, elevatie: lungime, latime: Math.max(capat1.final, capat2.final), adancime: Math.max(capat1.final, capat2.final), inaltime: trecere, diamJos: capat1.final, diamSus: capat2.final },
      { forma: "cilindru", x: 0, z: 0, elevatie: lungime + trecere, latime: capat2.final, adancime: capat2.final, inaltime: lungime },
      ...(canal >= 2 ? [{ forma: "cilindru" as const, gaura: true, x: 0, z: 0, elevatie: -1, latime: canal, adancime: canal, inaltime: 2 * lungime + trecere + 2 }] : []),
    ],
  };
}
