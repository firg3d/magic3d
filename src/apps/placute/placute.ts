/**
 * APP PLĂCUȚE & ETICHETE — o plăcuță cu text și o formă de prindere aleasă.
 *
 * Consolidează într-un singur produs ce la alte platforme sunt cinci: breloc, etichetă de
 * cablu, tăbliță de plantă, marcaj de pahar, magnet. Mecanica de bază — plăcuță din silueta
 * textului, dilatată și netezită — e aceeași ca la Brelocuri; ce diferă e PRINDEREA.
 *
 * Nucleul nu știe ce e o plăcuță: fișierul întoarce geometrie (manifold) și măsurători, iar
 * `main.ts` judecă ce e acceptabil. Reguli de fabricabilitate impuse aici, nu în interfață:
 * perete minim în jurul găurii, țăruș destul de gros să nu se rupă, locaș de magnet care NU
 * străpunge plăcuța.
 */
import { configureManifold as configTextSolid, textSolid, type SolidReport } from '../../core/geometry/textSolid.js';

let MOD: any = null;
export function configureManifold(mod: any): void { MOD = mod; configTextSolid(mod); }

/** cele cinci prinderi. `gaura` = inel; restul, forme dedicate. */
export type Prindere = 'gaura' | 'cablu' | 'terus' | 'pahar' | 'magnet';

export interface PlacutaConfig {
  text: string;
  font: any;
  inaltimeText: number;     // mm, capHeight
  reliefText: number;       // mm, cât iese textul din plăcuță
  latimePlacuta: number;    // mm, ramă în jurul textului
  netezire: number;         // mm, închiderea crestăturilor
  grosimePlacuta: number;   // mm
  prindere: Prindere;
  diametruGaura: number;    // mm — gaură / lățime fantă / Ø magnet, după caz
  lungimeTerus: number;     // mm — cât coboară țărușul sub plăcuță (doar la `terus`)
  culoarePlacuta: string;
  culoareText: string;
}

/** reguli de rezistență, în mm */
export const PERETE_MIN = 1.6;      // material minim în jurul unei găuri/fante
export const TERUS_MIN = 6;         // lățimea minimă a bazei țărușului
export const MAGNET_FUND = 1.2;     // material rămas sub locașul de magnet
const OVERHANG = 0.05;

export interface Diagnostice {
  dimPlacuta: [number, number];
  grosimeTotala: number;
  prindere: Prindere;
  /** avertisment de fabricabilitate, sau '' */
  avert: string;
  bucati: number;
  glifeLipsa: string[];
}

export interface PlacutaResult {
  corpPlacuta: any;   // plăcuța + prinderea, o piesă
  corpText: any | null;
  diagnostice: Diagnostice;
  ms: number;
}

/** scoate componentele 2D cu arie zero (reziduu de offset) — vezi brelocuri pentru istoric */
function faraCioburi(CrossSection: any, cs: any) {
  const parti: any[] = cs.decompose();
  const bune = parti.filter((p: any) => p.area() > 1e-9);
  if (bune.length === parti.length) { for (const p of parti) p.delete(); return cs; }
  const curat = bune.length ? CrossSection.union(bune) : cs;
  for (const p of parti) p.delete();
  if (bune.length) cs.delete();
  return curat;
}

export function buildPlacuta(cfg: PlacutaConfig): PlacutaResult {
  if (!MOD) throw new Error('placute: manifold neconfigurat');
  const { Manifold, CrossSection } = MOD;
  const t0 = performance.now();
  const rep: Partial<SolidReport> = {};

  // ---- textul + silueta plăcuței ----
  const textSol = textSolid(cfg.font, cfg.text, cfg.inaltimeText, cfg.reliefText, rep);
  const silText = textSol.project();
  let sil = cfg.latimePlacuta > 0 ? silText.offset(cfg.latimePlacuta, 'Round') : silText.offset(0.01, 'Round');
  if (cfg.netezire > 0) {
    const inchis = sil.offset(cfg.netezire, 'Round').offset(-cfg.netezire, 'Round');
    sil.delete(); sil = faraCioburi(CrossSection, inchis);
  }
  let bb = sil.bounds();
  const latime = bb.max[0] - bb.min[0], adancime = bb.max[1] - bb.min[1];
  const cx = (bb.min[0] + bb.max[0]) / 2;

  // ---- ȚĂRUȘUL se unește cu silueta ÎNAINTE de extrudare ----
  // Ca solid separat s-ar atinge de fundul rotunjit al plăcuței doar într-un punct și ar ieși
  // în două bucăți. Unit în 2D, conexiunea e garantată. Restul prinderilor lucrează pe solid.
  let avert = '';
  if (cfg.prindere === 'terus') {
    const bazaW = Math.max(cfg.latimePlacuta * 2 + 4, TERUS_MIN, latime * 0.28);
    if (bazaW < TERUS_MIN) avert = `terusIngust:${bazaW.toFixed(1)}:${TERUS_MIN}`;
    // țărușul iese din partea de JOS a scrisului (linia de bază = max Y în convenția Y-jos a textului),
    // ca la un răzuitor de plante: textul se citește normal, țărușul coboară în pământ.
    const yJos = bb.max[1], varf = yJos + cfg.lungimeTerus;
    // baza intră adânc în plăcuță (peste banda plină), ca uniunea 2D să prindă material
    let ring: [number, number][] = [
      [cx - bazaW / 2, yJos - cfg.latimePlacuta - 3], [cx + bazaW / 2, yJos - cfg.latimePlacuta - 3], [cx, varf],
    ];
    const arie2 = ring.reduce((s, [x1, y1], i) => {
      const [x2, y2] = ring[(i + 1) % ring.length]; return s + (x1 * y2 - x2 * y1);
    }, 0);
    if (arie2 < 0) ring = ring.reverse();
    const unit = sil.add(new CrossSection([ring], 'Positive'));
    sil.delete(); sil = faraCioburi(CrossSection, unit);
    bb = sil.bounds();
  }

  // ---- plăcuța ca solid ----
  let placuta = Manifold.extrude(sil, cfg.grosimePlacuta);

  // ---- prinderea (țărușul e deja tratat în siluetă, mai sus) ----
  const d = cfg.diametruGaura;
  const gaura2D = (formaSil: any, dz = -OVERHANG, h = cfg.grosimePlacuta + 2 * OVERHANG) => {
    const t = Manifold.extrude(formaSil, h).translate([0, 0, dz]);
    placuta = placuta.subtract(t);
  };

  if (cfg.prindere === 'gaura' || cfg.prindere === 'cablu') {
    // gaură rotundă (breloc/tag) sau fantă alungită (etichetă de cablu)
    const sus = bb.max[1] - cfg.latimePlacuta / 2 - d / 2;
    if (cfg.prindere === 'gaura') {
      gaura2D(CrossSection.circle(d / 2, 48).translate([cx, sus]));
    } else {
      // fantă: două capete rotunde + corp, ca un cablu să treacă prin ea
      const lung = Math.max(d * 2.2, 10);
      const fanta = CrossSection.square([lung, d], true).offset(d / 2, 'Round').translate([cx, sus]);
      gaura2D(fanta);
    }
    // perete rămas peste gaură până la marginea de sus
    const perete = bb.max[1] - (sus + d / 2);
    if (perete < PERETE_MIN) avert = `perete:${perete.toFixed(1)}:${PERETE_MIN}`;

  } else if (cfg.prindere === 'pahar') {
    // marcaj de pahar: gaură rotundă + fantă deschisă la marginea de SUS, ca să gliseze pe buză
    const sus = bb.max[1] - cfg.latimePlacuta / 2 - d / 2;
    const cerc = CrossSection.circle(d / 2, 48).translate([cx, sus]);
    const canal = CrossSection.square([d * 0.7, adancime], true).translate([cx, bb.max[1]]);
    gaura2D(cerc.add(canal));

  } else if (cfg.prindere === 'magnet') {
    // magnet: locaș cilindric în SPATE (z=0), care NU străpunge — rămâne MAGNET_FUND material
    const adanc = Math.min(cfg.grosimePlacuta - MAGNET_FUND, 2.5);
    if (adanc <= 0.5) avert = `magnetSubtire:${cfg.grosimePlacuta}`;
    else {
      const loc = Manifold.cylinder(adanc + OVERHANG, d / 2, d / 2, 48, false)
        .translate([cx, (bb.min[1] + bb.max[1]) / 2, -OVERHANG]);
      placuta = placuta.subtract(loc);
    }
  }

  // ---- textul, ridicat pe fața plăcuței ----
  const corpText = cfg.reliefText > 0
    ? textSol.translate([0, 0, cfg.grosimePlacuta]) : null;

  silText.delete(); sil.delete();

  const parti = placuta.decompose();
  const bucati = parti.filter((p: any) => p.volume() > 1).length;
  for (const p of parti) p.delete();

  return {
    corpPlacuta: placuta,
    corpText,
    diagnostice: {
      dimPlacuta: [+latime.toFixed(1), +adancime.toFixed(1)],
      grosimeTotala: +(cfg.grosimePlacuta + (cfg.prindere === 'terus' ? 0 : Math.max(0, cfg.reliefText))).toFixed(1),
      prindere: cfg.prindere,
      avert,
      bucati,
      glifeLipsa: (rep as any).glifeLipsa?.flatMap((g: any) => g.caractere) ?? [],
    },
    ms: performance.now() - t0,
  };
}
