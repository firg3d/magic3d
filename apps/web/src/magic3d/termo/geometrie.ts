import type { CrossSection, Manifold, ManifoldToplevel } from "manifold-3d";
import { departeStift, jocMatrite, latimeMaxima, TERMO, type SetariTermo } from "@/magic3d/termo/config";
import type { StraturiCulori } from "@/magic3d/termo/culoriPoza";

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
  /** Cutie: cate cleme, axa de simetrie a formei (null = nesimetrica) si cate seturi de matrite. */
  cleme: number;
  simetrie: "x" | "y" | null;
  seturi: 1 | 2;
  /** Filamentele, in ordinea extruderelor: plasa (baza) primul, apoi culorile desenului si rama; gol fara desen. */
  culori: string[];
  /** Cate parti de linii subtiri au primit umplerea deasa. */
  liniiDense: number;
  /** Incape pe placa imprimantei (fiecare piesa pe placa ei). */
  incape: boolean;
  /** Chei de avertizare (texte in texte.ts). */
  avertizari: string[];
};

/** Piesele de printat: plasa (A), la cutie si plasa B si clemele, matritele (si setul in oglinda, la o forma nesimetrica). */
export type CheiePiesa = "plasa" | "plasa2" | "cleme" | "jos" | "sus" | "jos2" | "sus2";
/**
 * O parte de culoare a plasei: placa plata cat membrana, peste ea, in culoarea ei, cu setarile ei
 * (fara pereti, umplerea deasa la linii); sau modificatorul ramei colorate.
 */
export type ParteCuloare<T> = { nume: "linii" | "zone" | "rama"; culoare: string; corp: T; tip: "normal_part" | "modifier_part"; densitate?: number };
/** O piesa de printat; plasa are si partile ei de culoare, in acelasi obiect. */
export type PiesaTermo<T> = { cheie: CheiePiesa; corp: T; parti?: ParteCuloare<T>[] };

/** Ce arata previzualizarea: rolul da culoarea. */
export type RolVedere = "plasa" | "jos" | "sus";
export type PiesaVedere<T> = { rol: RolVedere; corp: T; culoare?: string };
export type Vedere<T> = { rezultat: PiesaVedere<T>[]; presare: PiesaVedere<T>[]; plata: PiesaVedere<T>[] };

export type RezultatTermo = {
  /** Jumatatea A la folosire: plasa plata asezata, matrita de jos, matrita de sus apasata. */
  folosire: Piese<Manifold>;
  print: PiesaTermo<Manifold>[];
  /** Bolul format (sau cutia inchisa) si presarea; doar cand a fost cerut. */
  vedere: Vedere<Manifold> | null;
  /** Conturul final (dupa ingrosare) si zonele ingrosate, in mm, centrate: pentru previzualizare. */
  contur: Inele;
  zone: Inele;
  /** Gura cavitatii, pentru previzualizare. */
  gura: Inele;
  /** Cutie: centrele gaurilor de clema din plasa A (plasa B le are in oglinda). */
  gauriCleme: Pt[];
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


/** Punctele de pe conturul exterior, la distante egale pe lungimea lui. */
function puncteContur(cs: CrossSection, n: number): Pt[] {
  const poligoane = cs.toPolygons() as Pt[][];
  if (!poligoane.length || n <= 0) return [];
  const p = poligoane.reduce((a, b) => (b.length > a.length ? b : a));
  const lungimi = p.map((q, i) => Math.hypot(p[(i + 1) % p.length][0] - q[0], p[(i + 1) % p.length][1] - q[1]));
  const total = lungimi.reduce((s, l) => s + l, 0);
  const pas = total / n;
  const puncte: Pt[] = [];
  let parcurs = 0;
  let urmator = pas / 2;
  for (let i = 0; i < p.length && puncte.length < n; i += 1) {
    while (urmator <= parcurs + lungimi[i] && puncte.length < n) {
      const u = (urmator - parcurs) / (lungimi[i] || 1);
      const r = p[(i + 1) % p.length];
      puncte.push([p[i][0] + u * (r[0] - p[i][0]), p[i][1] + u * (r[1] - p[i][1])]);
      urmator += pas;
    }
    parcurs += lungimi[i];
  }
  return puncte;
}

/** Lungimea conturului exterior. */
function perimetru(cs: CrossSection): number {
  const poligoane = cs.toPolygons() as Pt[][];
  const p = poligoane.reduce((a, b) => (b.length > a.length ? b : a), [] as Pt[]);
  return p.reduce((s, q, i) => s + Math.hypot(p[(i + 1) % p.length][0] - q[0], p[(i + 1) % p.length][1] - q[1]), 0);
}

/** Cel mai apropiat punct de `p` de pe conturul unei sectiuni. */
function celMaiAproape(cs: CrossSection, p: Pt): Pt {
  let cel: Pt = p;
  let dist = Infinity;
  for (const poligon of cs.toPolygons() as Pt[][]) {
    for (let i = 0; i < poligon.length; i += 1) {
      const a = poligon[i], b = poligon[(i + 1) % poligon.length];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const u = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
      const q: Pt = [a[0] + u * dx, a[1] + u * dy];
      const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (d < dist) { dist = d; cel = q; }
    }
  }
  return cel;
}

/** Axa fata de care forma (centrata) e simetrica: "x" = stanga-dreapta, "y" = sus-jos; null daca niciuna. */
export function simetrie(P: CrossSection): "x" | "y" | null {
  const arie = P.area();
  for (const [axa, normala] of [["x", [1, 0]], ["y", [0, 1]]] as Array<["x" | "y", [number, number]]>) {
    const oglinda = P.mirror(normala);
    const diferenta = P.subtract(oglinda).area() + oglinda.subtract(P).area();
    if (diferenta / arie < TERMO.simetrieToleranta) return axa;
  }
  return null;
}

/**
 * Clema in U, culcata pe masa (profilul in XY, latimea pe Z): spatele la x = 0, gura spre +x. Prinde
 * cele doua membrane puse fata in fata; umflaturile de pe interiorul bratelor intra in gaurile lor.
 */
export function clema(mod: ManifoldToplevel): Manifold {
  const t = TERMO.membrana;
  const w = TERMO.clemaPerete;
  const g = 2 * t + TERMO.clemaJoc;
  const razaGaura = TERMO.gauraClemaDiametru / 2;
  const brat = TERMO.gauraClemaDepartare + razaGaura + 1.2;
  const h = TERMO.clemaLatime;
  const exterior = mod.CrossSection.square([w + brat, 2 * w + g]);
  const interior = mod.CrossSection.square([brat + 1, g]).translate([w, w]);
  const u = exterior.subtract(interior).extrude(h);
  const razaUmflatura = razaGaura - 0.25;
  const x = w + TERMO.gauraClemaDepartare;
  // Cilindrii umflaturilor, pe axa Y: unul iese din bratul de jos in sus, celalalt din cel de sus in jos.
  const umflatura = (y0: number, sens: 1 | -1) =>
    mod.Manifold.cylinder(TERMO.clemaUmflatura + SUPRAPUNERE, razaUmflatura, razaUmflatura, 24)
      .rotate([sens === 1 ? -90 : 90, 0, 0])
      .translate([x, y0 - sens * SUPRAPUNERE, h / 2]);
  return mod.Manifold.union([u, umflatura(w, 1), umflatura(w + g, -1)]);
}

/**
 * Construieste piesele. `inele` e conturul in orice unitate, cu y in sus; se scaleaza la
 * `setari.latime`. Arunca "termo-gol" cand nu exista forma si "termo-ingust" cand forma e prea
 * ingusta ca sa aiba o cavitate. `cuVedere` adauga bolul format si presarea, pentru previzualizare.
 */
export function construiesteTermo(mod: ManifoldToplevel, inele: Inele, setari: SetariTermo, cuVedere = false, straturi: StraturiCulori | null = null): RezultatTermo {
  const avertizari: string[] = [];
  const cutie = setari.mod === "cutie";
  const latimeCeruta = Math.max(TERMO.latimeMin, Math.min(latimeMaxima(), setari.latime));
  if (latimeCeruta !== setari.latime) avertizari.push("avLatime");
  const forma0 = formaPlina(mod, inele, avertizari);
  const ingrosat = ingroasa(mod, laLatime(forma0, latimeCeruta));
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

  // ---- Cutie: clemele, gaurile lor in flansa si oglinda jumatatii B ----
  const axa = cutie ? simetrie(P) : null;
  const normala3: [number, number, number] = axa === "y" ? [0, 1, 0] : [1, 0, 0];
  const oglindaPt = ([x, y]: Pt): Pt => (axa === "y" ? [x, -y] : [-x, y]);
  if (cutie && !axa) avertizari.push("avAsimetric");
  const nCleme = cutie ? Math.max(TERMO.clemeMin, Math.min(TERMO.clemeMax, Math.round(perimetru(P) / TERMO.clemaPas))) : 0;
  const margini = cutie ? puncteContur(P, nCleme) : [];
  const interiorGauri = offset(P, -TERMO.gauraClemaDepartare);
  const gauri = margini.map((p) => celMaiAproape(interiorGauri, p));
  // Matrita A primeste pernitele ambelor plase cand forma e simetrica (plasa B se formeaza tot in ea).
  const pernite: Pt[] = [...gauri];
  if (axa) for (const g of gauri.map(oglindaPt)) if (pernite.every((q) => Math.hypot(q[0] - g[0], q[1] - g[1]) > 3)) pernite.push(g);

  let gura = offset(P, -(TERMO.ramaLatime + TERMO.canalJoc + TERMO.polita));
  if (pernite.length) {
    gura = gura.subtract(mod.CrossSection.union(pernite.map(([x, y]) => mod.CrossSection.circle(TERMO.pernitaClema, 32).translate([x, y]))));
    gura = offset(offset(gura, -0.4), 0.4);
  }
  if (gura.isEmpty() || gura.area() < 4 * joc * joc) throw new Error("termo-ingust");

  // Stifturile: in marginea blocului, cat mai departe unul de altul; blocul se lateste in jurul lor.
  const razaGaura = TERMO.stiftDiametru / 2 + TERMO.stiftJoc;
  const stifturi = puncteOpuse(offset(P, departeStift()), TERMO.stifturi);
  const pernStift = stifturi.map(([x, y]) => mod.CrossSection.circle(razaGaura + TERMO.stiftPerete, 48).translate([x, y]));
  const conturBloc = mod.CrossSection.union([offset(P, TERMO.margineBloc), ...pernStift]);

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

  // ---- Plasa (membrana pe polita, rama in canal); la cutie cu gaurile clemelor si rama intrerupta la ele ----
  const interiorRama = offset(P, -TERMO.ramaLatime);
  const cercuri = (puncte: Pt[], raza: number) => (puncte.length ? mod.CrossSection.union(puncte.map(([x, y]) => mod.CrossSection.circle(raza, 24).translate([x, y]))) : null);
  const gauriPlasa = cercuri(gauri, TERMO.gauraClemaDiametru / 2);
  const golRama = cercuri(margini, TERMO.clemaLatime / 2 + 0.75);
  let membrana = setari.model === "fagure" ? fagure(mod, interiorRama, setari.densitate).add(P.subtract(interiorRama)) : P;
  if (gauriPlasa) membrana = membrana.subtract(gauriPlasa);
  let rama = P.subtract(interiorRama);
  if (golRama) rama = rama.subtract(golRama);
  const plasa = mod.Manifold.union([intre(membrana, L, L + t), intre(rama, L + t - TERMO.ramaInaltime, L + t)]);

  // ---- Desenul colorat: piese plate cat membrana, peste ea, in acelasi obiect ----
  // Fiecare culoare a pozei (in afara bazei, pe care se printeaza plasa insasi) devine zone groase si
  // linii subtiri (cele mai inguste de latimeLinie), fiecare o parte cu umplerea ei; petele mai mici
  // decat celula plasei se lasa deoparte. Rama colorata e un modificator: schimba doar extruderul.
  const partiA: ParteCuloare<Manifold>[] = [];
  const zoneA: Array<{ zona: CrossSection; culoare: string }> = [];
  const culori: string[] = [];
  let liniiDense = 0;
  const desen = setari.desen === "culori" && straturi ? straturi : null;
  if (desen) {
    culori.push(desen.culori[0]);
    const b0 = forma0.bounds();
    const f0 = latimeCeruta / Math.max(1e-9, b0.max[0] - b0.min[0]);
    const laForma = (cs: CrossSection) => laLoc(cs.translate([-(b0.min[0] + b0.max[0]) / 2, -(b0.min[1] + b0.max[1]) / 2]).scale([f0, f0]));
    const interior = offset(P, -TERMO.ramaLatime);
    const fara = (cs: CrossSection) => { const b = cs.decompose().filter((x) => x.area() >= TERMO.celulaPlasa * TERMO.celulaPlasa); return b.length ? mod.CrossSection.compose(b) : null; };
    const r = TERMO.latimeLinie / 2;
    desen.inele.forEach((ine, i) => {
      if (i === 0 || !ine.length) return;
      const zona = fara(laForma(new mod.CrossSection(ine.filter((x) => x.length >= 3), "EvenOdd")).intersect(interior));
      if (!zona) return;
      const groase = offset(offset(zona, -r), r).intersect(zona);
      const zone = groase.isEmpty() ? null : fara(groase);
      const linii = fara(zona.subtract(groase));
      if (!zone && !linii) return;
      const culoare = desen.culori[i];
      culori.push(culoare);
      if (zone) { partiA.push({ nume: "zone", culoare, corp: intre(zone, L, L + t), tip: "normal_part", densitate: TERMO.densitateZone }); zoneA.push({ zona: zone, culoare }); }
      if (linii) { partiA.push({ nume: "linii", culoare, corp: intre(linii, L, L + t), tip: "normal_part", densitate: TERMO.densitateLinii }); zoneA.push({ zona: linii, culoare }); liniiDense += 1; }
    });
    if (D / latimeCeruta > TERMO.raportDesen) avertizari.push("avDesenAdanc");
  }
  const lumina = (h: string) => 0.299 * parseInt(h.slice(1, 3), 16) + 0.587 * parseInt(h.slice(3, 5), 16) + 0.114 * parseInt(h.slice(5, 7), 16);
  if (setari.ramaColorata) {
    if (!culori.length) culori.push(TERMO.culoarePlasa);
    const culoareRama = /^#[0-9a-f]{6}$/i.test(setari.culoareRama) ? setari.culoareRama.toLowerCase() : [...culori].sort((a, b) => lumina(a) - lumina(b))[0];
    if (!culori.includes(culoareRama)) culori.push(culoareRama);
    const inel = offset(P, TERMO.modificatorPeste).subtract(interiorRama);
    partiA.push({ nume: "rama", culoare: culoareRama, corp: intre(inel, L + t - TERMO.ramaInaltime - TERMO.modificatorInaltime, L + t + TERMO.modificatorInaltime), tip: "modifier_part" });
  }
  // Jumatatea din spate a cutiei: tot desenul, doar liniile si culoarea dominanta, sau simpla.
  const dominanta = zoneA.filter((z) => partiA.some((p) => p.nume === "zone" && p.culoare === z.culoare)).sort((a, b) => b.zona.area() - a.zona.area())[0]?.culoare;
  const partiB = partiA.filter((p) => p.tip === "modifier_part" || setari.spate === "oglinda" || (setari.spate === "contur" && (p.nume === "linii" || p.culoare === dominanta)));

  // ---- Pozitia de print ----
  const peMasa = (m: Manifold) => m.translate([0, 0, -m.boundingBox().min[2]]);
  const intoarsa = (m: Manifold) => peMasa(m.rotate([180, 0, 0]));
  // Partile de culoare se intorc odata cu plasa lor (aceeasi rotire si aceeasi ridicare).
  const intoarsaCa = (ref: Manifold) => { const dz = -ref.rotate([180, 0, 0]).boundingBox().min[2]; return (m: Manifold) => m.rotate([180, 0, 0]).translate([0, 0, dz]); };
  const cuParti = (ref: Manifold, parti: ParteCuloare<Manifold>[], oglinda: boolean) => {
    const tr = intoarsaCa(ref);
    return parti.map((p) => ({ ...p, corp: tr(oglinda ? p.corp.mirror(normala3) : p.corp) }));
  };
  const print: PiesaTermo<Manifold>[] = [{ cheie: "plasa", corp: intoarsa(plasa), ...(partiA.length ? { parti: cuParti(plasa, partiA, false) } : {}) }];
  if (cutie) {
    // Plasa B e oglinda plasei A: intoarsa peste A, gaurile ei cad peste gaurile lui A.
    const plasaB = plasa.mirror(normala3);
    print.push({ cheie: "plasa2", corp: intoarsa(plasaB), ...(partiB.length ? { parti: cuParti(plasaB, partiB, true) } : {}) });
    const una = clema(mod);
    const pas = 2 * TERMO.clemaPerete + 2 * t + TERMO.clemaJoc + 3;
    print.push({ cheie: "cleme", corp: mod.Manifold.union(Array.from({ length: nCleme }, (_, i) => una.translate([0, i * pas, 0]))) });
  }
  print.push({ cheie: "jos", corp: peMasa(jos) }, { cheie: "sus", corp: intoarsa(sus) });
  const seturi: 1 | 2 = cutie && !axa ? 2 : 1;
  if (seturi === 2) print.push({ cheie: "jos2", corp: peMasa(jos.mirror(normala3)) }, { cheie: "sus2", corp: intoarsa(sus.mirror(normala3)) });

  // ---- Previzualizarea: membrana formata in jocul dintre matrite ----
  let vedere: Vedere<Manifold> | null = null;
  if (cuVedere) {
    const ra = R - (joc - t) / 2;
    const rb = ra - t;
    const sectiune = (r: number, d: number) => offset(gura, -(R - Math.sqrt(Math.max(0, r * r - d * d))));
    const coaja: Manifold[] = [];
    const niv = niveluri(ra, ra);
    // Treptele raman in joc: fata exterioara ia sectiunea de la baza treptei (mai mica decat cavitatea),
    // golul interior pe cea de la varf (mai mare decat domul).
    for (let k = 0; k + 1 < niv.length; k += 1) {
      let s = sectiune(ra, niv[k + 1]);
      if (s.isEmpty()) break;
      if (niv[k] < rb) s = s.subtract(sectiune(rb, niv[k]));
      if (!s.isEmpty()) coaja.push(intre(s, L - niv[k + 1], L - niv[k] + SUPRAPUNERE));
    }
    let flansa = P.subtract(offset(gura, -(R - ra) - 0.05));
    if (gauriPlasa) flansa = flansa.subtract(gauriPlasa);
    const format = mod.Manifold.union([...coaja, intre(flansa, L, L + t), intre(rama, L + t - TERMO.ramaInaltime, L + t)]);
    // Desenul pe piesa formata: fiecare zona, proiectata vertical pe coaja (fara pre-deformare, ca la print).
    const colorata = (baza: Manifold, zone: Array<{ zona: CrossSection; culoare: string }>): PiesaVedere<Manifold>[] => {
      if (!zone.length) return [{ rol: "plasa", corp: baza }];
      const prisme = zone.map((z) => ({ culoare: z.culoare, corp: intre(z.zona, L - 2 * H, L + 2 * H) }));
      const rest = baza.subtract(mod.Manifold.union(prisme.map((p) => p.corp)));
      return [{ rol: "plasa", corp: rest, culoare: culori[0] }, ...prisme.map((p) => ({ rol: "plasa" as const, culoare: p.culoare, corp: baza.intersect(p.corp) }))];
    };
    const rezultat: PiesaVedere<Manifold>[] = colorata(format, zoneA);
    if (cutie) {
      const zoneB = zoneA.filter((z) => setari.spate === "oglinda" || (setari.spate === "contur" && partiB.some((p) => p.culoare === z.culoare)));
      for (const p of colorata(format, zoneB)) rezultat.push({ ...p, corp: p.corp.mirror(normala3).mirror([0, 0, 1]).translate([0, 0, 2 * (L + t)]) });
    }
    const plata: PiesaVedere<Manifold>[] = colorata(plasa, zoneA);
    vedere = {
      plata,
      rezultat,
      presare: [{ rol: "jos", corp: jos }, { rol: "plasa", corp: format }, { rol: "sus", corp: sus.translate([0, 0, TERMO.ridicareSus]) }],
    };
  }

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
    cleme: nCleme,
    simetrie: axa,
    seturi,
    culori,
    liniiDense,
    incape,
    avertizari,
  };
  return {
    folosire: { plasa, jos, sus },
    print,
    vedere,
    contur: P.toPolygons() as Inele,
    zone: zone.flatMap((z) => z.toPolygons() as Inele),
    gura: gura.toPolygons() as Inele,
    gauriCleme: gauri,
    info,
  };
}

/** Triunghiurile neindexate ale unui corp manifold, Z in sus, mm. */
export function triunghiuri(m: Manifold): Float32Array {
  const { vertProperties: v, triVerts: t, numProp } = m.getMesh();
  const out = new Float32Array(t.length * 3);
  for (let i = 0; i < t.length; i += 1) {
    out[i * 3] = v[t[i] * numProp];
    out[i * 3 + 1] = v[t[i] * numProp + 1];
    out[i * 3 + 2] = v[t[i] * numProp + 2];
  }
  return out;
}

export type PieseTermo = PiesaTermo<Float32Array>[];
export type VedereTermo = Vedere<Float32Array>;

export const piesePrint = (rez: RezultatTermo): PieseTermo => rez.print.map((p) => ({
  cheie: p.cheie,
  corp: triunghiuri(p.corp),
  ...(p.parti ? { parti: p.parti.map((x) => ({ ...x, corp: triunghiuri(x.corp) })) } : {}),
}));

export const vedereTriunghiuri = (rez: RezultatTermo): VedereTermo | null =>
  rez.vedere && {
    rezultat: rez.vedere.rezultat.map((p) => ({ rol: p.rol, culoare: p.culoare, corp: triunghiuri(p.corp) })),
    presare: rez.vedere.presare.map((p) => ({ rol: p.rol, culoare: p.culoare, corp: triunghiuri(p.corp) })),
    plata: rez.vedere.plata.map((p) => ({ rol: p.rol, culoare: p.culoare, corp: triunghiuri(p.corp) })),
  };
