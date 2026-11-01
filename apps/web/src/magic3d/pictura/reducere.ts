/*
 * Reducerea la N culori: cand modelul are mai multe culori decat duce imprimanta, culorile se
 * strang in cele mai apropiate N, dupa distanta perceptuala in OKLab (Bjorn Ottosson, 2020),
 * cantarita cu cate triunghiuri are fiecare culoare.
 *
 * Doua surse de culori-tinta: culorile deja folosite (se pastreaza N dintre ele) sau o paleta
 * (de pilda filamentele atelierului: se aleg N filamente). Sloturile fixate raman sigur in rezultat.
 */

export type Lab = [number, number, number];

function liniar(c: number) {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function oklab(hex: string): Lab {
  const r = liniar(parseInt(hex.slice(1, 3), 16) / 255);
  const g = liniar(parseInt(hex.slice(3, 5), 16) / 255);
  const b = liniar(parseInt(hex.slice(5, 7), 16) / 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export function distanta(a: string, b: string) {
  const x = oklab(a), y = oklab(b);
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
}

export type CerereReducere = {
  /** Culorile sloturilor de acum. */
  sloturi: readonly string[];
  /** Cate triunghiuri are fiecare slot (0 = nefolosit). */
  ponderi: readonly number[];
  /** Cate culori raman cel mult. */
  limita: number;
  /** Culori-tinta; fara ele, se aleg dintre culorile folosite. */
  paleta?: readonly string[];
  /** Sloturi care raman sigur (culoarea lor, sau cel mai apropiat filament din paleta). */
  fixate?: readonly number[];
};

export type RezultatReducere = {
  /** Sloturile noi (cel mult `limita`), slotul de baza primul cand e folosit. */
  sloturi: string[];
  /** Pentru fiecare slot vechi, slotul nou in care intra. */
  mapare: number[];
};

/**
 * Alegere lacoma (ca la k-medoizi): pornind de la culorile fixate, se adauga pe rand culoarea-tinta
 * care scade cel mai mult suma distantelor cantarite; apoi fiecare slot vechi merge la cea mai
 * apropiata culoare aleasa.
 */
export function reduceCulori(c: CerereReducere): RezultatReducere {
  const limita = Math.max(1, Math.floor(c.limita));
  const folosite = c.sloturi.map((_, i) => i).filter((i) => (c.ponderi[i] ?? 0) > 0);
  const surse = folosite.length ? folosite : [0];
  const tinte = c.paleta?.length ? [...new Set(c.paleta.map((h) => h.toLowerCase()))] : [...new Set(surse.map((i) => c.sloturi[i].toLowerCase()))];
  const lab = new Map<string, Lab>();
  const L = (h: string) => { let v = lab.get(h); if (!v) { v = oklab(h); lab.set(h, v); } return v; };
  const d = (a: string, b: string) => { const x = L(a), y = L(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };
  const celMaiAproape = (h: string, lista: readonly string[]) => lista.reduce((best, t) => (d(h, t) < d(h, best) ? t : best), lista[0]);

  const alese: string[] = [];
  for (const f of c.fixate ?? []) {
    if (f < 0 || f >= c.sloturi.length || alese.length >= limita) continue;
    const t = c.paleta?.length ? celMaiAproape(c.sloturi[f].toLowerCase(), tinte) : c.sloturi[f].toLowerCase();
    if (!alese.includes(t)) alese.push(t);
  }
  const cost = (set: readonly string[]) => surse.reduce((s, i) => s + (c.ponderi[i] || 1) * (set.length ? Math.min(...set.map((t) => d(c.sloturi[i].toLowerCase(), t))) : 1e3), 0);
  // Cand incap toate: fiecare culoare folosita primeste exact cea mai apropiata tinta.
  const apropiate = [...new Set(surse.map((i) => celMaiAproape(c.sloturi[i].toLowerCase(), tinte)))];
  const toate = [...new Set([...alese, ...apropiate])];
  if (toate.length <= limita) alese.splice(0, alese.length, ...toate);
  else {
    while (alese.length < Math.min(limita, tinte.length)) {
      const acum = cost(alese);
      let best: string | null = null, bestCost = Infinity;
      for (const t of tinte) {
        if (alese.includes(t)) continue;
        const v = cost([...alese, t]);
        if (v < bestCost - 1e-12) { bestCost = v; best = t; }
      }
      // O culoare care nu apropie nimic n-ar ocupa decat un slot.
      if (!best || bestCost >= acum - 1e-12) break;
      alese.push(best);
    }
  }

  // Ordinea: slotul de baza (sau ce il inlocuieste) primul, apoi in ordinea sloturilor vechi.
  const tinta = c.sloturi.map((h) => celMaiAproape(h.toLowerCase(), alese));
  const ordine: string[] = [];
  for (const i of [0, ...surse]) if (!ordine.includes(tinta[i]) && (i === 0 || folosite.includes(i))) ordine.push(tinta[i]);
  for (const a of alese) if (!ordine.includes(a)) ordine.push(a);
  const sloturi = ordine.slice(0, limita);
  return { sloturi, mapare: c.sloturi.map((h) => sloturi.indexOf(celMaiAproape(h.toLowerCase(), sloturi))) };
}

/** Uneste manual slotul `din` in slotul `in`: slotul `din` dispare, celelalte se renumeroteaza. */
export function unesteSloturi(sloturi: readonly string[], din: number, inSlot: number): RezultatReducere {
  if (din === inSlot || din < 0 || inSlot < 0 || din >= sloturi.length || inSlot >= sloturi.length) {
    return { sloturi: [...sloturi], mapare: sloturi.map((_, i) => i) };
  }
  const noi = sloturi.filter((_, i) => i !== din);
  const mapare = sloturi.map((_, i) => {
    const j = i === din ? inSlot : i;
    return j > din ? j - 1 : j;
  });
  return { sloturi: noi, mapare };
}
