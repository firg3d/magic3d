/**
 * NUCLEU — PUNȚI ÎNTRE BUCĂȚI CARE PLUTESC.
 *
 * A stat în apps/litere (`reliefContactBridges`), unde leagă de literă punctele și accentele
 * scrisului în relief. Nume 3D are exact aceeași problemă și aceeași soluție — un nume cursiv
 * iese într-o singură bucată, plus punctele de pe „i" și diacriticele — deci al doilea consumator,
 * deci nucleu. Regula proiectului: se mută la al DOILEA, nu la al patrulea.
 *
 * Ce NU intră aici: cine e ancoră. Asta e decizie de produs și diferă:
 *   · la scrisul în relief, ancorate sunt bucățile care ating litera de dedesubt;
 *   · la un nume care stă singur, ancoră e bucata cea mai mare, restul se leagă de ea.
 * Fișierul primește ancorele gata alese și întoarce barele plus măsurătorile.
 *
 * ALGORITMUL e creștere din aproape în aproape (Prim), nu o singură trecere. La fiecare pas se
 * ia perechea (bucată liberă, bucată deja legată) cu distanța cea mai mică și se pune o punte;
 * bucata legată devine ea însăși ancoră. Diferența față de „fiecare liberă la cea mai apropiată
 * ancoră INIȚIALĂ" se vede la două puncte apropiate între ele și departe de rest: cu o singură
 * trecere ele rămân amândouă nelegate, deși una singură ar fi ajuns.
 */
import type { Pt, Ring } from './forme2d.js';

export interface ParamPunti {
  /** lățimea barei, mm. Sub două lățimi de extrudare (0.8 mm la duză de 0.4) puntea se rupe. */
  latime: number;
  /** înălțimea barei pe Z, mm */
  grosime: number;
  /** cota Z de la care pornește bara */
  z: number;
  /**
   * Peste distanța asta nu se mai leagă: o punte lungă e mai vizibilă decât bucata pe care o ține.
   * Un TABLOU dă o limită proprie fiecărei bucăți — cât merită o punte nu e același lucru pentru
   * un punct de pe „i" și pentru o treime de cuvânt desprinsă.
   */
  distantaMax: number | number[];
}

export interface Punte { de: Pt; la: Pt; lungime: number }

export interface RaportPunti {
  /** câte bucăți avea piesa înainte */
  componente: number;
  punti: Punte[];
  /** bucăți rămase nelegate: prea departe de orice ancoră */
  ramase: number;
  /** cea mai lungă punte pusă, mm — cifra care spune dacă rezultatul e discret sau nu */
  lungimeMaxMM: number;
}

/** aria cu semn, aici doar ca să alegem inelul EXTERIOR al unei bucăți */
function arie(r: Ring): number {
  let a = 0;
  for (let i = 0; i < r.length; i++) { const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % r.length]; a += x1 * y2 - x2 * y1; }
  return a / 2;
}

/** conturul exterior al unei secțiuni: inelul cu aria absolută cea mai mare */
export function conturExterior(cs: any): Ring {
  const inele: Ring[] = (cs.toPolygons() as any[]).map((r: any) => r.map((p: any) => [p[0], p[1]] as Pt));
  if (!inele.length) return [];
  return inele.reduce((b, r) => (Math.abs(arie(r)) > Math.abs(arie(b)) ? r : b), inele[0]);
}

function proiectiePeSegment(p: Pt, a: Pt, b: Pt): Pt {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  let t = l2 === 0 ? 0 : ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return [a[0] + t * dx, a[1] + t * dy];
}

/**
 * Cele mai apropiate două puncte dintre două contururi.
 *
 * Se scanează în ambele sensuri (vârfurile lui A față de laturile lui B ȘI invers): un vârf
 * ascuțit al unuia poate fi cel mai apropiat punct, dar la fel de bine mijlocul unei laturi lungi.
 */
export function celMaiApropiat(rA: Ring, rB: Ring): { dist: number; pA: Pt; pB: Pt } {
  let best = { dist: Infinity, pA: rA[0] ?? [0, 0] as Pt, pB: rB[0] ?? [0, 0] as Pt };
  const scan = (din: Ring, spre: Ring, invers: boolean) => {
    for (const p of din) {
      for (let i = 0; i < spre.length; i++) {
        const c = proiectiePeSegment(p, spre[i], spre[(i + 1) % spre.length]);
        const d = Math.hypot(p[0] - c[0], p[1] - c[1]);
        if (d < best.dist) best = { dist: d, pA: invers ? c : p, pB: invers ? p : c };
      }
    }
  };
  if (!rA.length || !rB.length) return best;
  scan(rA, rB, false);
  scan(rB, rA, true);
  return best;
}

/** bara care leagă două puncte: o prismă lată `latime`, înaltă `grosime`, cu capetele înfipte */
function bara(Manifold: any, de: Pt, la: Pt, p: ParamPunti): any {
  const dx = la[0] - de[0], dy = la[1] - de[1];
  const L = Math.hypot(dx, dy) || 1;
  // 1.6 mm în plus pe lungime: capetele trebuie să INTRE în material, nu să se atingă de el.
  // Fețe care se ating exact = booleane fragile, aceeași lecție ca peste tot în proiect.
  return Manifold.cube([L + 1.6, p.latime, p.grosime], true)
    .rotate([0, 0, (Math.atan2(dy, dx) * 180) / Math.PI])
    .translate([(de[0] + la[0]) / 2, (de[1] + la[1]) / 2, p.z + p.grosime / 2]);
}

/**
 * UNDE ar veni punțile — calcul pur 2D, fără geometrie construită.
 *
 * Separat de construcție fiindcă răspunsul e folosit și înainte de a exista o piesă: aplicația de
 * nume evaluează în fundal fiecare font („se leagă literele? rămâne ceva liber?") și n-are rost
 * să extrudeze 22 de solide ca să afle.
 */
export function planificaPunti(contur: Ring[], ancorat: boolean[], distantaMax: number | number[]): RaportPunti {
  const legat = ancorat.slice();
  const punti: Punte[] = [];
  const limita = (i: number) => (Array.isArray(distantaMax) ? distantaMax[i] ?? 0 : distantaMax);

  // creștere din aproape în aproape: de fiecare dată cea mai scurtă punte ADMISĂ
  for (;;) {
    const libere = legat.map((a, i) => (a ? -1 : i)).filter((i) => i >= 0);
    if (!libere.length) break;
    let best: { i: number; d: number; pA: Pt; pB: Pt } | null = null;
    for (const i of libere) {
      for (let j = 0; j < contur.length; j++) {
        if (!legat[j]) continue;
        const n = celMaiApropiat(contur[i], contur[j]);
        if (n.dist > limita(i)) continue;
        if (!best || n.dist < best.d) best = { i, d: n.dist, pA: n.pA, pB: n.pB };
      }
    }
    if (!best) break;
    punti.push({ de: best.pA, la: best.pB, lungime: +best.d.toFixed(2) });
    legat[best.i] = true;
  }

  return {
    componente: contur.length,
    punti,
    ramase: legat.filter((x) => !x).length,
    lungimeMaxMM: punti.reduce((m, b) => Math.max(m, b.lungime), 0),
  };
}

/**
 * Leagă bucățile neancorate de cele ancorate, prin punți.
 *
 * `piese` sunt componentele conexe (decompose), `ancorat[i]` spune care pornesc ancorate.
 * Întoarce BARELE, nu solidul unit: cine cheamă decide dacă le adaugă la piesă, în ce ordine și
 * cu ce culoare.
 */
export function leagaComponente(Manifold: any, piese: any[], ancorat: boolean[], p: ParamPunti): {
  bare: any[]; raport: RaportPunti;
} {
  const contur: Ring[] = piese.map((piesa: any) => {
    const s = piesa.project();
    const r = conturExterior(s);
    s.delete();
    return r;
  });
  const raport = planificaPunti(contur, ancorat, p.distantaMax);
  return { bare: raport.punti.map((b) => bara(Manifold, b.de, b.la, p)), raport };
}
