import { groupedShape } from "@/lib/editorBooleans";
import { cadShapeFromSketchProfile } from "@/lib/editorSketchCad";
import { layeredIconShape } from "@/lib/editorTextTags";
import { createLocalId } from "@/lib/localIds";
import { sketchFromPieceRings } from "@/lib/svgSketch";
import type { TextLayer } from "@/lib/textLayers";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import type { SketchProfile, WorkplaneShape } from "@/types/layerling";
import { LOGO, type SetariIesire } from "@/magic3d/logo/config";
import { cadruLogo, profilDinInele, type CadruLogo } from "@/magic3d/logo/profil";
import type { TrasareLogo } from "@/magic3d/logo/trasare";
import { tl } from "@/magic3d/logo/texte";

/*
 * Logo -> obiect: fiecare iesire e un pachet de corpuri obisnuite ale editorului (corpuri-schita
 * construite de nucleul CAD, cutii rotunjite, cilindri), deci se editeaza mai departe cu "Editeaza
 * grupul", iar la export 3MF fiecare culoare ramane un corp separat. Refoloseste ce exista:
 * conturul devine corp prin cadShapeFromSketchProfile, brelocul ia baza si gaura de inel de la
 * eticheta cu iconita (layeredIconShape). Forma de prajitura o face unealta editorului (vezi
 * LogoPanel / LayerlingEditor), din silueta data ca un corp-schita.
 */

/** Cat lasa plăcuța libera intre logo si marginea ei, in afara de rama. */
const MARGINE = 4;
const r3 = (valoare: number) => Math.round(valoare * 1000) / 1000;

type Cutie = { nume: string; culoare: string; latime: number; adancime: number; inaltime: number; x?: number; z?: number; elevatie?: number; colturi?: number; gaura?: boolean; tip?: "roundedBox" | "cylinder" };

/** O forma simpla a editorului (cutie rotunjita sau cilindru), ca in keyringTabAt. */
function forma(cutie: Cutie): WorkplaneShape {
  const tip = cutie.tip ?? "roundedBox";
  return canonicalizeShape({
    id: createLocalId("logo"),
    name: cutie.nume,
    kind: tip,
    color: cutie.culoare,
    hole: Boolean(cutie.gaura),
    locked: false,
    hidden: false,
    x: r3(cutie.x ?? 0),
    z: r3(cutie.z ?? 0),
    elevation: r3(cutie.elevatie ?? 0),
    rotation: 0,
    width: r3(cutie.latime),
    depth: r3(cutie.adancime),
    height: r3(cutie.inaltime),
    size: r3(Math.max(cutie.latime, cutie.adancime)),
    ...(tip === "roundedBox" ? { cornerFillet: r3(Math.min(cutie.colturi ?? 0, cutie.latime / 2 - 0.01, cutie.adancime / 2 - 0.01)) } : {}),
  } as WorkplaneShape);
}

/** Un dreptunghi cu colturi rotunjite, ca inel de puncte (mm, centrat). */
export function dreptunghiRotunjit(latime: number, adancime: number, raza: number, pasi = 6): Array<{ x: number; y: number }> {
  const r = Math.max(0, Math.min(raza, latime / 2 - 0.01, adancime / 2 - 0.01));
  const hx = latime / 2 - r;
  const hy = adancime / 2 - r;
  if (r <= 0.01) return [{ x: -latime / 2, y: -adancime / 2 }, { x: latime / 2, y: -adancime / 2 }, { x: latime / 2, y: adancime / 2 }, { x: -latime / 2, y: adancime / 2 }];
  const colturi: Array<[number, number, number]> = [[hx, hy, 0], [-hx, hy, 90], [-hx, -hy, 180], [hx, -hy, 270]];
  return colturi.flatMap(([cx, cy, start]) => Array.from({ length: pasi + 1 }, (_, i) => {
    const unghi = ((start + (90 * i) / pasi) * Math.PI) / 180;
    return { x: cx + r * Math.cos(unghi), y: cy + r * Math.sin(unghi) };
  }));
}

/** Rama: inelul dintre doua dreptunghiuri rotunjite, ca profil de schita. */
function profilRama(latime: number, adancime: number, colturi: number, grosime: number): SketchProfile {
  const exterior = dreptunghiRotunjit(latime, adancime, colturi);
  const interior = dreptunghiRotunjit(latime - 2 * grosime, adancime - 2 * grosime, Math.max(0, colturi - grosime)).reverse();
  const bucati = [exterior, interior].map((inel) => inel.map((p, i) => ({ start: p, end: inel[(i + 1) % inel.length] })));
  const schita = sketchFromPieceRings(bucati, ({ x, y }) => ({ x: r3(x), z: r3(y) }), "rama");
  return { points: schita.points, segments: schita.segments };
}

/** Un profil ridicat la `inaltime`, asezat la elevatia data, cu numele si culoarea lui. */
async function corp(profil: SketchProfile, inaltime: number, elevatie: number, nume: string, culoare: string, gaura = false): Promise<WorkplaneShape> {
  const construit = await cadShapeFromSketchProfile(profil, inaltime);
  return canonicalizeShape({ ...construit, id: createLocalId("logo"), name: nume, color: culoare, hole: gaura, elevation: r3(elevatie) });
}

/** Straturile logo-ului ca relief (sau ca goluri, la gravat), la elevatia data. */
async function relief(trasare: TrasareLogo, cadru: CadruLogo, inaltime: number, elevatie: number, oglindit = false): Promise<WorkplaneShape[]> {
  const multe = trasare.straturi.length > 1;
  return Promise.all(trasare.straturi.map((strat, i) => corp(profilDinInele(strat.inele, cadru, oglindit, `logo${i}`), inaltime, elevatie, multe ? `${tl("numeLogo")} ${i + 1}` : tl("numeLogo"), strat.culoare)));
}

function pachet(piese: WorkplaneShape[], nume: string): WorkplaneShape {
  if (piese.length === 1) return canonicalizeShape({ ...piese[0], name: nume });
  const grup = groupedShape(piese);
  if (!grup) throw new Error(tl("eroareConstructie"));
  return canonicalizeShape({ ...grup, id: createLocalId("logo"), name: nume, groupOperation: "bundle" });
}

/** Plăcuța: baza rotunjita, rama si logo-ul in relief sau gravat, cu gaura de prindere optionala. */
async function placuta(trasare: TrasareLogo, setari: SetariIesire, cadru: CadruLogo): Promise<WorkplaneShape[]> {
  const latime = cadru.latime + 2 * (MARGINE + setari.rama);
  const gauraSus = setari.gaura > 0 ? setari.gaura + 6 : 0;
  const adancime = cadru.adancime + 2 * (MARGINE + setari.rama) + gauraSus;
  // Cu gaura de prindere sus, logo-ul coboara cat ii ia locul.
  const zLogo = gauraSus / 2;
  const baza = forma({ nume: tl("numeBaza"), culoare: LOGO.culoareBaza, latime, adancime, inaltime: setari.baza, colturi: setari.colturi });
  const goluri: WorkplaneShape[] = [];
  if (setari.gaura > 0) goluri.push(forma({ nume: tl("numeGaura"), culoare: "#888888", latime: setari.gaura, adancime: setari.gaura, inaltime: setari.baza + 2, elevatie: -1, z: -adancime / 2 + MARGINE + setari.rama + setari.gaura / 2, gaura: true, tip: "cylinder" }));
  const piese: WorkplaneShape[] = [];
  if (setari.gravat) {
    const adanc = Math.min(setari.relief, setari.baza - 0.4);
    const logo = (await relief(trasare, cadru, adanc + 0.2, setari.baza - adanc)).map((p) => canonicalizeShape({ ...p, z: r3(p.z + zLogo), hole: true }));
    const gravat = groupedShape([baza, ...logo, ...goluri]);
    if (!gravat) throw new Error(tl("eroareConstructie"));
    piese.push(canonicalizeShape({ ...gravat, name: tl("numeBaza") }));
  } else {
    if (goluri.length) {
      const cuGaura = groupedShape([baza, ...goluri]);
      if (!cuGaura) throw new Error(tl("eroareConstructie"));
      piese.push(canonicalizeShape({ ...cuGaura, name: tl("numeBaza") }));
    } else piese.push(baza);
    piese.push(...(await relief(trasare, cadru, setari.relief, setari.baza)).map((p) => canonicalizeShape({ ...p, z: r3(p.z + zLogo) })));
  }
  if (setari.rama > 0) piese.push(await corp(profilRama(latime, adancime, setari.colturi, setari.rama), setari.relief, setari.baza, tl("numeRama"), trasare.straturi[0].culoare));
  return piese;
}

/** Brelocul: baza dupa conturul logo-ului (largita cu rama) cu gaura de inel, de la eticheta cu iconita, si logo-ul deasupra. */
async function breloc(trasare: TrasareLogo, setari: SetariIesire, cadru: CadruLogo): Promise<WorkplaneShape[]> {
  const silueta = profilDinInele(trasare.silueta, cadru, false, "silueta");
  const strat: TextLayer = { grow: Math.max(1, setari.rama), height: setari.baza, color: LOGO.culoareBaza, silhouette: true };
  const loc = { x: 0, z: 0, elevation: 0, rotation: 0, rotationX: 0, rotationZ: 0 };
  const inel = setari.gaura > 0 ? { side: "top" as const, diameter: setari.gaura } : null;
  const baza = await layeredIconShape(silueta, [strat], loc, [], createLocalId("logo"), { locked: false, hidden: false, name: tl("numeBaza") }, inel);
  return [baza, ...(await relief(trasare, cadru, setari.relief, setari.baza))];
}

/** Stampila: logo-ul oglindit in relief pe un bloc, si un maner langa el (se lipeste de spatele blocului). */
async function stampila(trasare: TrasareLogo, setari: SetariIesire, cadru: CadruLogo): Promise<WorkplaneShape[]> {
  const margine = 3;
  const latime = cadru.latime + 2 * margine;
  const adancime = cadru.adancime + 2 * margine;
  const bloc = forma({ nume: tl("numeBloc"), culoare: LOGO.culoareBaza, latime, adancime, inaltime: setari.baza, colturi: setari.colturi });
  // Stampila se imprima monocrom: relieful e silueta, oglindita ca sa iasa citibila pe hartie.
  const logo = await corp(profilDinInele(trasare.silueta, cadru, true, "stampila"), setari.relief, setari.baza, tl("numeLogo"), trasare.straturi[0].culoare);
  const diametru = Math.min(30, Math.max(15, Math.min(latime, adancime) * 0.5));
  const maner = forma({ nume: tl("numeManer"), culoare: LOGO.culoareBaza, latime: diametru, adancime: diametru, inaltime: 35, x: latime / 2 + diametru / 2 + 8, tip: "cylinder" });
  return [bloc, logo, maner];
}

/**
 * Semnul de birou: plăcuța in picioare (intoarsa cu +90 de grade in jurul axei X, fata spre privitor,
 * partea de sus a imaginii in sus) pe un picior lat. Mereu in relief.
 */
async function semn(trasare: TrasareLogo, setari: SetariIesire, cadru: CadruLogo): Promise<WorkplaneShape[]> {
  const latime = cadru.latime + 2 * (MARGINE + setari.rama);
  const adancime = cadru.adancime + 2 * (MARGINE + setari.rama);
  const picior = 5;
  const culcate: WorkplaneShape[] = [
    forma({ nume: tl("numeBaza"), culoare: LOGO.culoareBaza, latime, adancime, inaltime: setari.baza, colturi: setari.colturi }),
    ...(await relief(trasare, cadru, setari.relief, setari.baza)),
  ];
  if (setari.rama > 0) culcate.push(await corp(profilRama(latime, adancime, setari.colturi, setari.rama), setari.relief, setari.baza, tl("numeRama"), trasare.straturi[0].culoare));
  // Rotatia cu +90 in jurul lui X duce mijlocul (x, y, z) in (x, -z, y); placa sta apoi pe picior.
  const ridicate = culcate.map((piesa) => {
    const mijlocY = (piesa.elevation ?? 0) + piesa.height / 2;
    const y = -piesa.z + adancime / 2 + picior;
    return canonicalizeShape({ ...piesa, x: piesa.x, z: r3(mijlocY), elevation: r3(y - piesa.height / 2), rotationX: 90 });
  });
  const lungimePicior = Math.max(40, adancime * 0.45);
  const piciorul = forma({ nume: tl("numePicior"), culoare: LOGO.culoareBaza, latime, adancime: lungimePicior, inaltime: picior, colturi: Math.min(setari.colturi, 4), z: lungimePicior / 2 - 10 });
  return [piciorul, ...ridicate];
}

/** Obiectul cerut, din logo-ul conturat. Forma de prajitura nu e aici: o construieste unealta editorului din {@link siluetaCaCorp}. */
export async function construiesteLogo(trasare: TrasareLogo, setari: SetariIesire): Promise<WorkplaneShape> {
  const cadru = cadruLogo(trasare, setari.marime);
  const constructori = { placuta, breloc, stampila, semn } as const;
  if (setari.tip === "prajitura") throw new Error("prajitura: unealta editorului");
  const piese = await constructori[setari.tip](trasare, setari, cadru);
  return pachet(piese, tl(`iesire_${setari.tip}`));
}

/** Silueta logo-ului ca un corp-schita subtire: din el unealta "Forma de prajitura" a editorului face forma. */
export async function siluetaCaCorp(trasare: TrasareLogo, marime: number): Promise<WorkplaneShape> {
  const cadru = cadruLogo(trasare, marime);
  return corp(profilDinInele(trasare.silueta, cadru, false, "silueta"), 2, 0, tl("numeLogo"), LOGO.culoareRelief);
}
