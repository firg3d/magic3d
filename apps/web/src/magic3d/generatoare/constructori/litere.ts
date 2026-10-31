import { buildAssembly, configureManifold as configAssembly, solideMemorate, type TematicaInput } from "@/magic3d/apps/litere/assembly";
import type { CorpModel } from "@/magic3d/core/assets/threemf";
import { configureManifold as configTextSolid } from "@/magic3d/core/geometry/textSolid";
import { t } from "@/magic3d/core/i18n/index";
import { bool, num, piese, str, type Constructor, type PiesaManifold } from "@/magic3d/generatoare/constructori/comun";
import { DIACRITICE, NR_TEMATICI } from "@/magic3d/generatoare/defs/litere";

/*
 * Litere Decor: litera, scrisul, pana la trei tematici si baza, asamblate de apps/litere/assembly.ts
 * (buzunarele tematicilor si locasul din baza se taie acolo). Rotunjirea muchiei e memorata intre
 * constructii (solideMemorate), deci solidele ei trec peste arena worker-ului.
 *
 * Asamblarea lucreaza in "cadrul modelului": Y in jos (ca SVG), adancimea pe Z, litera in picioare.
 * O rotatie de -90° pe X o aduce in conventia Z-sus a generatoarelor, iar conversia comuna spre scena
 * o lasa in picioare, cu fata literei spre privitor - ca in vechea previzualizare.
 */

type Mod = {
  Mesh: new (opts: { numProp: number; vertProperties: Float32Array; triVerts: Uint32Array }) => unknown;
  Manifold: { new (mesh: unknown): Solid; compose(lista: Solid[]): Solid };
};
type Solid = { status(): unknown; boundingBox(): { min: number[]; max: number[] }; scale(s: number | number[]): Solid; rotate(r: number[]): Solid };

/** Corpurile unui model 3MF ca solide manifold; un corp care nu e inchis opreste constructia, cu numele lui. */
function solide(mod: Mod, corpuri: CorpModel[], numeModel: string): { compus: Solid; corpuri: { nume: string; culoare?: string; manifold: Solid }[] } {
  const lista = corpuri.map((corp) => {
    const manifold = new mod.Manifold(new mod.Mesh({ numProp: 3, vertProperties: corp.verts, triVerts: corp.tris }));
    if (String(manifold.status()) !== "NoError") throw new Error(t("litere.modelNeinchis", { model: numeModel, corp: corp.nume }));
    return { nume: corp.nume, culoare: corp.culoare, manifold };
  });
  return { compus: lista.length === 1 ? lista[0].manifold : mod.Manifold.compose(lista.map((c) => c.manifold)), corpuri: lista };
}

const numeFisier = (cale: string) => cale.split("/").pop()?.replace(/\.3mf$/i, "") ?? cale;

export const litere: Constructor = (p, modul, fonturi, modele) => {
  const mod = modul as Mod;
  configTextSolid(mod);
  configAssembly(mod);
  const scris = str(p, "scris").trim();
  const modScris = str(p, "modScris") as "relief" | "gravat" | "locas";
  const litera = str(p, "litera") || "A";
  const avertizari: string[] = [];

  const tematici: TematicaInput[] = [];
  for (let i = 1; i <= NR_TEMATICI; i += 1) {
    const cale = str(p, `fisier3mfTema${i}`);
    const corpuri = modele[`fisier3mfTema${i}`];
    if (!cale || !corpuri) continue;
    const nume = numeFisier(cale);
    const s = solide(mod, corpuri, nume);
    const bb = s.compus.boundingBox();
    const latura = Math.max(bb.max[0] - bb.min[0], bb.max[1] - bb.min[1], bb.max[2] - bb.min[2]) || 1;
    const scara = num(p, `marimeTema${i}`) / latura;
    tematici.push({
      id: `tema${i}`,
      nume,
      manifold: s.compus.scale(scara),
      offX: num(p, `xTema${i}`),
      offY: num(p, `yTema${i}`),
      rotX: 0,
      rotY: 0,
      rotZ: num(p, `rotTema${i}`),
      pozitieZ: num(p, `adancimeTema${i}`),
      culoare: str(p, `culoareTema${i}`),
      // Un model in mai multe culori isi pastreaza culorile din fisier; unul singur ia culoarea aleasa.
      corpuri: s.corpuri.length > 1 ? s.corpuri.map((c) => ({ nume: c.nume, culoare: c.culoare, manifold: c.manifold.scale(scara) })) : undefined,
    });
  }

  let baza: Parameters<typeof buildAssembly>[0]["baza"] = null;
  const caleBaza = str(p, "fisier3mfBaza");
  if (caleBaza && modele.fisier3mfBaza) {
    const s = solide(mod, modele.fisier3mfBaza, numeFisier(caleBaza));
    const scara = num(p, "scaraBaza") / 100;
    baza = {
      manifold: s.compus.scale(scara),
      corpuri: s.corpuri.map((c) => ({ nume: c.nume, culoare: c.culoare, manifold: c.manifold.scale(scara) })),
      adancimeInfigere: num(p, "adancimeInfigere"),
      jocInfigere: num(p, "jocInfigere"),
      pozitieLiteraX: num(p, "literaX"),
      pozitieLiteraZ: num(p, "literaZ"),
      rotatieLitera: num(p, "rotatieLitera"),
    };
  } else if (DIACRITICE.includes(litera)) {
    avertizari.push(t("litere.diacriticeFaraBaza"));
  }

  const r = buildAssembly({
    litera,
    fontLitera: fonturi.fontLitera,
    inaltimeLitera: num(p, "inaltimeLitera"),
    grosimeLitera: num(p, "grosimeLitera"),
    culoareLitera: str(p, "culoareLitera"),
    scris,
    fontScris: fonturi.fontScris,
    inaltimeScris: num(p, "inaltimeScris"),
    reliefScris: num(p, "reliefScris"),
    culoareScris: str(p, "culoareScris"),
    scrisOffX: num(p, "offsetX"),
    scrisOffY: num(p, "offsetY"),
    rotatieScris: num(p, "rotatieScris"),
    scrisRotX: 0,
    scrisRotY: 0,
    // In relief scrisul sta pe fata literei; gravat sau in locas intra cat spune "pozitieScris".
    scrisPozitieZ: modScris === "relief" ? 0 : num(p, "pozitieScris"),
    modScris,
    grosimeScris: num(p, "grosimeScris"),
    jocInsertie: num(p, "jocInsertie"),
    chenarActiv: bool(p, "chenarActiv"),
    latimeChenar: num(p, "latimeChenar"),
    adancimeChenar: num(p, "adancimeChenar"),
    razaMuchie: num(p, "razaMuchie"),
    taiereBaza: num(p, "taiereBaza"),
    tematici,
    puntiAutomate: true,
    baza,
  });

  const d = r.diagnostice;
  for (const lipsa of d.glifeLipsa) avertizari.push(t("litere.glifeLipsa", { sursa: lipsa.sursa, litere: lipsa.caractere.join(" ") }));
  if (!baza && d.stabilitate.avertisment) avertizari.push(d.stabilitate.avertisment);
  for (const obiect of d.obiecteContact) {
    if (obiect.floats) avertizari.push(t("litere.scrisPluteste", { nume: obiect.nume }));
    else if (obiect.limitaAtinsa) avertizari.push(t("litere.limitaAdancime", { nume: obiect.nume }));
  }
  if (d.baza && d.baza.contactProcent <= 0) avertizari.push(t("litere.bazaFaraContact"));

  const inPicioare = (m: unknown) => (m as Solid).rotate([-90, 0, 0]);
  const lista: (PiesaManifold | null)[] = [
    { nume: t("litere.numeLitera", { litera }), culoare: str(p, "culoareLitera"), manifold: inPicioare(r.corpLitera) },
    scris && r.corpScris ? { nume: t("litere.numeScris", { scris }), culoare: str(p, "culoareScris"), manifold: inPicioare(r.corpScris) } : null,
  ];
  for (const tema of r.pieseTematici) {
    if (tema.corpuri?.length) {
      tema.corpuri.forEach((c) => lista.push({ nume: `${tema.nume} · ${c.nume}`, culoare: c.culoare ?? tema.culoare, manifold: inPicioare(c.manifold) }));
    } else {
      lista.push({ nume: tema.nume, culoare: tema.culoare, manifold: inPicioare(tema.manifold) });
    }
  }
  if (r.corpBaza) {
    const numeBaza = t("litere.numeBaza", { nume: numeFisier(caleBaza) });
    if (r.corpBazaCorpuri.length) {
      r.corpBazaCorpuri.forEach((c, i) => lista.push({ nume: `${numeBaza} · ${i + 1}`, culoare: c.culoare ?? "#c8c8c8", manifold: inPicioare(c.manifold) }));
    } else {
      lista.push({ nume: numeBaza, culoare: "#c8c8c8", manifold: inPicioare(r.corpBaza) });
    }
  }
  return { piese: piese(...lista), avertizari, pastreaza: solideMemorate() };
};
