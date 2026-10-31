import type { CrossSection, Manifold, ManifoldToplevel } from "manifold-3d";
import { departeStift, jocMatrite, latimeMaxima, TERMO, type SetariTermo } from "@/magic3d/termo/config";

/*
 * Termoformare: conturul -> plasa plata, matrita de jos (cavitatea) si matrita de sus (domul).
 *
 * Totul se construieste intai "la folosire", in acelasi cadru (Z in sus, mm): matrita de jos cu
 * fata de sus la z = H, plasa asezata pe polita ei, matrita de sus apasata pana la capat. Asa jocul
 * dintre matrite se poate masura direct pe sectiuni. Apoi fiecare piesa se roteste in pozitia de
 * print: matrita de jos cum sta, plasa si matrita de sus intoarse (membrana / placa pe pat).
 *
 * Peretele cavitatii e un sfert de cerc cu raza R = adancimea, cu centrul in planul membranei la
 * distanta R de marginea gurii: sectiunea la adancimea d e gura micsorata cu R - sqrt(R² - d²).
 * Domul e aceeasi suprafata cu raza R - joc, deci distanta dintre ele e jocul peste tot (functia
 * "distanta pana la margine" e 1-Lipschitz). Suprafetele se fac din trepte de cate o inaltime de
 * strat; treapta cavitatii foloseste sectiunea mai mare, a domului pe cea mai mica, deci treptele
 * doar maresc jocul, nu il micsoreaza niciodata.
 */

export type Pt = [number, number];
export type Inele = Pt[][];

export type Piese<T> = { plasa: T; jos: T; sus: T };

export type InfoTermo = {
  latime: number;
  inaltime: number;
  /** Adancimea folosita si cea mai mare sigura pentru forma. */
  adancime: number;
  adancimeSigura: number;
  /** Latimea celei mai inguste zone a formei (dupa ingrosare). */
  ingust: number;
  /** Cate zone prea inguste au fost ingrosate. */
  zoneIngrosate: number;
  joc: number;
  /** Marimea blocului matritei de jos: latime x adancime x inaltime. */
  bloc: [number, number, number];
  inaltimeSus: number;
  aerisiri: number;
  stifturi: number;
  /** Incape pe placa imprimantei (fiecare piesa pe placa ei). */
  incape: boolean;
  /** Chei de avertizare (texte in texte.ts). */
  avertizari: string[];
};

export type RezultatTermo = {
  folosire: Piese<Manifold>;
  print: Piese<Manifold>;
  /** Conturul final (dupa ingrosare) si zonele ingrosate, in mm, centrate: pentru previzualizare. */
  contur: Inele;
  zone: Inele;
  /** Gura cavitatii, pentru previzualizare. */
  gura: Inele;
  info: InfoTermo;
};

const ROTUND = "Round" as const;
/** Cat se intrepatrund corpurile lipite, ca reuniunile sa nu lase fete comune. */
const SUPRAPUNERE = 0.02;

const offset = (cs: CrossSection, d: number) => cs.offset(d, ROTUND, 2, 0).simplify(0.01);

/** Cea mai mare bucata a conturului, fara gauri: termoformarea are nevoie de o singura forma plina. */
function formaPlina(mod: ManifoldToplevel, inele: Inele, avertizari: string[]): CrossSection {
  const toate = new mod.CrossSection(inele.filter((inel) => inel.length >= 3), "EvenOdd");
  const bucati = toate.decompose().filter((b) => b.area() > TERMO.aschieMax);
  if (!bucati.length) throw new Error("termo-gol");
  bucati.sort((a, b) => b.area() - a.area());
  if (bucati.length > 1) avertizari.push("avBucati");
  const cea = bucati[0];
  const contururi = cea.toPolygons();
  const arie = (p: Pt[]) => p.reduce((s, q, i) => { const r = p[(i + 1) % p.length]; return s + q[0] * r[1] - r[0] * q[1]; }, 0) / 2;
  const exterior = contururi.reduce((a, b) => (Math.abs(arie(b as Pt[])) > Math.abs(arie(a as Pt[])) ? b : a));
  if (contururi.length > 1) avertizari.push("avGauri");
  return new mod.CrossSection([exterior], "NonZero");
}

/** Forma scalata la latimea ceruta si centrata in origine. */
function laLatime(cs: CrossSection, latime: number): CrossSection {
  const b = cs.bounds();
  const factor = latime / Math.max(1e-9, b.max[0] - b.min[0]);
  const scalat = cs.translate([-(b.min[0] + b.max[0]) / 2, -(b.min[1] + b.max[1]) / 2]).scale([factor, factor]);
  return scalat;
}

/** "Deschiderea" formei cu raza r: ce ramane dupa ce dispar partile mai inguste de 2r. */
const deschidere = (cs: CrossSection, r: number) => offset(offset(cs, -r), r);

/** Latimea celei mai inguste zone: cea mai mare raza la care deschiderea pastreaza aproape toata aria, dublata. */
export function latimeIngusta(cs: CrossSection): number {
  const arie = cs.area();
  const b = cs.bounds();
  let jos = 0.1;
  let sus = Math.min(b.max[0] - b.min[0], b.max[1] - b.min[1]) / 2;
  for (let pas = 0; pas < 14; pas += 1) {
    const mijloc = (jos + sus) / 2;
    if (deschidere(cs, mijloc).area() >= TERMO.ariePastrata * arie) jos = mijloc;
    else sus = mijloc;
  }
  return 2 * jos;
}

/** Zonele mai inguste decat latimea minima, ingrosate; zonele, ca sa poata fi aratate. */
function ingroasa(mod: ManifoldToplevel, cs: CrossSection): { forma: CrossSection; zone: CrossSection[] } {
  const r = TERMO.latimeMinima / 2;
  const ingust = cs.subtract(deschidere(cs, r));
  // Un colt ascutit pierde si el putin la deschidere: o "zona" mai mica decat r² e doar un colt.
  const zone = ingust.decompose().filter((z) => z.area() > r * r);
  if (!zone.length) return { forma: cs, zone: [] };
  const ingrosat = mod.CrossSection.union([cs, ...zone.map((z) => offset(z, r / 2))]);
  // O inchidere mica netezeste racordul dintre zona ingrosata si restul formei.
  return { forma: offset(offset(ingrosat, 0.6), -0.6), zone };
}

/** Adancimile treptelor de la 0 la `pana`, cu pasul de strat si fara salturi laterale mari langa fund. */
export function niveluri(raza: number, pana: number): number[] {
  const inset = (d: number) => raza - Math.sqrt(Math.max(0, raza * raza - d * d));
  const lista = [0];
  let d = 0;
  while (d < pana - 1e-6) {
    let urm = Math.min(pana, d + TERMO.pasTreapta);
    while (inset(urm) - inset(d) > TERMO.pasLateralMax && urm - d > 0.05) urm = d + (urm - d) / 2;
    lista.push(urm);
    d = urm;
  }
  return lista;
}

const insetCerc = (raza: number, d: number) => raza - Math.sqrt(Math.max(0, raza * raza - d * d));

/** Punctele unei sectiuni (par-impar), pentru a alege locuri in interior. */
function inauntru(poligoane: Pt[][], x: number, y: number): boolean {
  let in_ = false;
  for (const p of poligoane) {
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      if ((p[i][1] > y) !== (p[j][1] > y) && x < ((p[j][0] - p[i][0]) * (y - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]) in_ = !in_;
    }
  }
  return in_;
}

/** Pana la n puncte cat mai departe unele de altele, din cele aflate in sectiune (incepand de langa centrul ei). */
function puncteRaspandite(cs: CrossSection, n: number): Pt[] {
  if (cs.isEmpty() || n <= 0) return [];
  const poligoane = cs.toPolygons() as Pt[][];
  const b = cs.bounds();
  const pas = Math.max(0.5, Math.max(b.max[0] - b.min[0], b.max[1] - b.min[1]) / 40);
  const candidati: Pt[] = [];
  for (let x = b.min[0]; x <= b.max[0]; x += pas) for (let y = b.min[1]; y <= b.max[1]; y += pas) if (inauntru(poligoane, x, y)) candidati.push([x, y]);
  if (!candidati.length) return [];
  const cx = candidati.reduce((s, p) => s + p[0], 0) / candidati.length;
  const cy = candidati.reduce((s, p) => s + p[1], 0) / candidati.length;
  const alese: Pt[] = [candidati.reduce((a, p) => (Math.hypot(p[0] - cx, p[1] - cy) < Math.hypot(a[0] - cx, a[1] - cy) ? p : a))];
  while (alese.length < n) {
    let cel: Pt | null = null;
    let dist = 0;
    for (const p of candidati) {
      const d = Math.min(...alese.map((a) => Math.hypot(p[0] - a[0], p[1] - a[1])));
      if (d > dist) { dist = d; cel = p; }
    }
    if (!cel || dist < pas) break;
    alese.push(cel);
  }
  return alese;
}

/** Cele mai departate n puncte (n <= 2 aici) de pe conturul exterior al unei sectiuni. */
function puncteOpuse(cs: CrossSection, n: number): Pt[] {
  const poligoane = cs.toPolygons() as Pt[][];
  if (!poligoane.length || n <= 0) return [];
  const exterior = poligoane.reduce((a, b) => (b.length > a.length ? b : a));
  const rar = exterior.filter((_, i) => i % Math.max(1, Math.floor(exterior.length / 300)) === 0);
  let pereche: [Pt, Pt] = [rar[0], rar[0]];
  let dist = -1;
  for (let i = 0; i < rar.length; i += 1) for (let j = i + 1; j < rar.length; j += 1) {
    const d = Math.hypot(rar[i][0] - rar[j][0], rar[i][1] - rar[j][1]);
    if (d > dist) { dist = d; pereche = [rar[i], rar[j]]; }
  }
  return n === 1 ? [pereche[0]] : pereche;
}

const cilindru = (mod: ManifoldToplevel, [x, y]: Pt, raza: number, z0: number, z1: number) => mod.Manifold.cylinder(z1 - z0, raza, raza, 32).translate([x, y, z0]);

/** Sectiunea extrudata intre doua cote. */
const intre = (cs: CrossSection, z0: number, z1: number) => cs.extrude(z1 - z0).translate([0, 0, z0]);

/** Membrana cu gauri hexagonale (modelul "fagure"): pastreaza `densitate` % din arie. */
function fagure(mod: ManifoldToplevel, interior: CrossSection, densitate: number): CrossSection {
  const pasCelula = 4;
  const gol = pasCelula * Math.sqrt(Math.max(0.05, 1 - densitate / 100));
  const b = interior.bounds();
  const hexagoane: Pt[][] = [];
  const raza = gol / Math.sqrt(3);
  const rand = (pasCelula * Math.sqrt(3)) / 2;
  for (let j = 0, y = b.min[1]; y <= b.max[1] + pasCelula; j += 1, y += rand) {
    for (let x = b.min[0] + (j % 2 ? pasCelula / 2 : 0); x <= b.max[0] + pasCelula; x += pasCelula) {
      hexagoane.push(Array.from({ length: 6 }, (_, k) => [x + raza * Math.cos((Math.PI / 3) * k + Math.PI / 6), y + raza * Math.sin((Math.PI / 3) * k + Math.PI / 6)] as Pt));
    }
  }
  // Gaurile raman la cel putin o latime de rama fata de marginea interioara.
  const loc = offset(interior, -TERMO.ramaLatime / 2);
  const gauri = new mod.CrossSection(hexagoane, "NonZero").intersect(loc);
  return interior.subtract(gauri);
}

/**
 * Construieste cele trei piese. `inele` e conturul in orice unitate, cu y in sus; se scaleaza la
 * `setari.latime`. Arunca "termo-gol" cand nu exista forma si "termo-ingust" cand forma e prea
 * ingusta ca sa aiba o cavitate.
 */
export function construiesteTermo(mod: ManifoldToplevel, inele: Inele, setari: SetariTermo): RezultatTermo {
  const avertizari: string[] = [];
  const latimeCeruta = Math.max(TERMO.latimeMin, Math.min(latimeMaxima(), setari.latime));
  if (latimeCeruta !== setari.latime) avertizari.push("avLatime");
  const ingrosat = ingroasa(mod, laLatime(formaPlina(mod, inele, avertizari), latimeCeruta));
  // Ingrosarea unui varf poate lati forma: o readucem la latimea ceruta, zonele odata cu ea.
  const bi = ingrosat.forma.bounds();
  const corectie = latimeCeruta / (bi.max[0] - bi.min[0]);
  const centru: Pt = [-(bi.min[0] + bi.max[0]) / 2, -(bi.min[1] + bi.max[1]) / 2];
  const laLoc = (cs: CrossSection) => cs.translate(centru).scale(corectie);
  const P = laLoc(ingrosat.forma);
  const zone = ingrosat.zone.map(laLoc);
  if (zone.length) avertizari.push("avIngrosat");

  const t = TERMO.membrana;
  const joc = jocMatrite();
  const ingust = latimeIngusta(P);
  const adancimeSigura = Math.max(TERMO.adancimeMin, Math.floor(TERMO.adancimeDinIngust * ingust * 10) / 10);
  const D = Math.max(TERMO.adancimeMin, Math.min(setari.adancime, adancimeSigura));
  if (D < setari.adancime) avertizari.push("avAdancime");
  const R = Math.max(TERMO.razaMin, D);

  const c = TERMO.locasAdancime;
  const H = TERMO.fundJos + c + D;
  const L = H - c;

  const gura = offset(P, -(TERMO.ramaLatime + TERMO.canalJoc + TERMO.polita));
  if (gura.isEmpty() || gura.area() < 4 * joc * joc) throw new Error("termo-ingust");

  // Stifturile: in marginea blocului, cat mai departe unul de altul; blocul se lateste in jurul lor.
  const razaGaura = TERMO.stiftDiametru / 2 + TERMO.stiftJoc;
  const stifturi = puncteOpuse(offset(P, departeStift()), TERMO.stifturi);
  const pernite = stifturi.map(([x, y]) => mod.CrossSection.circle(razaGaura + TERMO.stiftPerete, 48).translate([x, y]));
  const conturBloc = mod.CrossSection.union([offset(P, TERMO.margineBloc), ...pernite]);

  // ---- Matrita de jos ----
  const locas = offset(P, TERMO.locasJoc);
  const interiorCanal = offset(P, -(TERMO.ramaLatime + TERMO.canalJoc));
  const adancimeCanal = TERMO.ramaInaltime + TERMO.canalPeste;
  const nivCavitate = niveluri(R, D);
  const sectiuneCavitate = (d: number) => (d <= 0 ? gura : offset(gura, -insetCerc(R, d)));
  const golJos: Manifold[] = [intre(locas, L, H + 1), intre(locas.subtract(interiorCanal), H - adancimeCanal, H + 1)];
  let ultimaCavitate = gura;
  for (let k = 0; k + 1 < nivCavitate.length; k += 1) {
    const s = sectiuneCavitate(nivCavitate[k]);
    if (s.isEmpty()) break;
    ultimaCavitate = s;
    golJos.push(intre(s, L - nivCavitate[k + 1], L - nivCavitate[k] + SUPRAPUNERE));
  }
  const razaAerisire = TERMO.aerisireDiametru / 2;
  const aerisiri = puncteRaspandite(offset(ultimaCavitate, -(razaAerisire + 1)), TERMO.aerisiri);
  if (aerisiri.length < TERMO.aerisiri) avertizari.push("avAerisiri");
  for (const p of aerisiri) golJos.push(cilindru(mod, p, razaAerisire, -1, L - D + 0.5));
  for (const p of stifturi) golJos.push(cilindru(mod, p, razaGaura, H - TERMO.stiftLungime - 0.5, H + 1));
  const jos = intre(conturBloc, 0, H).subtract(mod.Manifold.union(golJos));

  // ---- Matrita de sus (la folosire: placa deasupra lui H, domul in jos) ----
  const Rd = R - joc;
  const insetDom = (d: number) => R - Math.sqrt(Math.max(0, Rd * Rd - d * d));
  const plinSus: Manifold[] = [intre(conturBloc, H, H + TERMO.placaSus), intre(offset(gura, -joc), L, H + SUPRAPUNERE)];
  const nivDom = niveluri(Rd, Rd);
  for (let k = 0; k + 1 < nivDom.length; k += 1) {
    const s = offset(gura, -insetDom(nivDom[k + 1]));
    if (s.isEmpty()) break;
    plinSus.push(intre(s, L - nivDom[k + 1], L - nivDom[k] + SUPRAPUNERE));
  }
  for (const p of stifturi) plinSus.push(cilindru(mod, p, TERMO.stiftDiametru / 2, H - TERMO.stiftLungime, H + SUPRAPUNERE));
  const sus = mod.Manifold.union(plinSus);

  // ---- Plasa (membrana pe polita, rama in canal) ----
  const interiorRama = offset(P, -TERMO.ramaLatime);
  const membrana = setari.model === "fagure" ? fagure(mod, interiorRama, setari.densitate).add(P.subtract(interiorRama)) : P;
  const plasa = mod.Manifold.union([intre(membrana, L, L + t), intre(P.subtract(interiorRama), L + t - TERMO.ramaInaltime, L + t)]);

  // ---- Pozitia de print ----
  const peMasa = (m: Manifold) => m.translate([0, 0, -m.boundingBox().min[2]]);
  const intoarsa = (m: Manifold) => peMasa(m.rotate([180, 0, 0]));
  const print = { plasa: intoarsa(plasa), jos: peMasa(jos), sus: intoarsa(sus) };

  const bb = conturBloc.bounds();
  const bloc: [number, number, number] = [bb.max[0] - bb.min[0], bb.max[1] - bb.min[1], H];
  const incape = bloc[0] <= TERMO.placa && bloc[1] <= TERMO.placa;
  if (!incape) avertizari.push("avPlaca");
  const bp = P.bounds();
  const r1 = (x: number) => Math.round(x * 10) / 10;
  const info: InfoTermo = {
    latime: r1(bp.max[0] - bp.min[0]),
    inaltime: r1(bp.max[1] - bp.min[1]),
    adancime: r1(D),
    adancimeSigura,
    ingust: r1(ingust),
    zoneIngrosate: zone.length,
    joc,
    bloc: bloc.map(r1) as [number, number, number],
    inaltimeSus: r1(TERMO.placaSus + c + Rd),
    aerisiri: aerisiri.length,
    stifturi: stifturi.length,
    incape,
    avertizari,
  };
  return {
    folosire: { plasa, jos, sus },
    print,
    contur: P.toPolygons() as Inele,
    zone: zone.flatMap((z) => z.toPolygons() as Inele),
    gura: gura.toPolygons() as Inele,
    info,
  };
}

export type PieseTermo = Piese<Float32Array>;

/** Triunghiurile neindexate ale unui corp manifold, Z in sus, mm. */
function triunghiuri(m: Manifold): Float32Array {
  const { vertProperties: v, triVerts: t, numProp } = m.getMesh();
  const out = new Float32Array(t.length * 3);
  for (let i = 0; i < t.length; i += 1) {
    out[i * 3] = v[t[i] * numProp];
    out[i * 3 + 1] = v[t[i] * numProp + 1];
    out[i * 3 + 2] = v[t[i] * numProp + 2];
  }
  return out;
}

export const piesePrint = (rez: RezultatTermo): PieseTermo => ({ plasa: triunghiuri(rez.print.plasa), jos: triunghiuri(rez.print.jos), sus: triunghiuri(rez.print.sus) });
