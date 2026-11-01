import { strFromU8, unzipSync } from "fflate";
import type { ManifoldToplevel } from "manifold-3d";
import { beforeAll, describe, expect, it } from "vitest";
import { inArena } from "@/magic3d/core/geometry/arena";
import { proiectBambu } from "@/magic3d/core/assets/bambu3mf";
import { SETARI_IMPLICITE, TERMO, type SetariTermo } from "@/magic3d/termo/config";
import { numarCulori, straturiCulori } from "@/magic3d/termo/culoriPoza";
import { construiesteTermo, piesePrint, type RezultatTermo } from "@/magic3d/termo/geometrie";
import { listaFilamente, proiectTermo } from "@/magic3d/termo/export";
import { ineleCuYSus, siluetaDinPixeli } from "@/magic3d/termo/silueta";
import { manifold } from "./magic3dGenUtil";

let mod: ManifoldToplevel;
beforeAll(async () => {
  mod = await manifold();
}, 60_000);

/** Negru: toate canalele intunecate (albastrul are rosu mic, dar nu e negru). */
const esteNegru = (c: string) => [1, 3, 5].every((i) => parseInt(c.slice(i, i + 2), 16) < 40);

const BEJ = [232, 219, 183], ROSU = [193, 46, 31], ALBASTRU = [31, 95, 191], NEGRU = [10, 10, 10];

/** O imagine proprie, 4 culori pe fundal alb: un oval bej, o zona rosie sus, una albastra jos, doua linii negre subtiri. */
function poza() {
  const w = 240, h = 240;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    const i = (y * w + x) * 4;
    let c = [255, 255, 255];
    const inOval = ((x - 120) / 105) ** 2 + ((y - 120) / 105) ** 2 <= 1;
    if (inOval) {
      c = BEJ;
      if (y < 85 && y > 30) c = ROSU;
      if (y > 160 && y < 200 && x > 70 && x < 170) c = ALBASTRU;
      // linii de 3 px: ochi si gura
      if ((y >= 110 && y < 113 && ((x > 70 && x < 105) || (x > 135 && x < 170))) || (y >= 140 && y < 143 && x > 85 && x < 155)) c = NEGRU;
    }
    data.set([c[0], c[1], c[2], 255], i);
  }
  return { width: w, height: h, data };
}

const SETARI: SetariTermo = { ...SETARI_IMPLICITE, latime: 120, adancime: 18, desen: "culori", sistemCulori: "bambu-ams-lite", culori: 4, paletaCulori: "imagine" };

/** Construieste si masoara in aceeasi arena: corpurile manifold se elibereaza la iesire. */
function cu<T>(s: SetariTermo, masoara: (rez: RezultatTermo) => T): T {
  const p = poza();
  const sil = siluetaDinPixeli(p);
  const straturi = straturiCulori(p, { latime: sil.latime, inaltime: sil.inaltime }, s);
  return inArena(() => masoara(construiesteTermo(mod, ineleCuYSus(sil.inele), s, false, straturi)), () => []);
}

/** Partile din model_settings.config: subtip, extruder si setarile lor. */
function partiDin3mf(rez: RezultatTermo, s: SetariTermo) {
  const fisiere = unzipSync(proiectBambu(proiectTermo(piesePrint(rez), s, "ro", "Proba", rez.info)));
  const cfg = strFromU8(fisiere["Metadata/model_settings.config"]);
  return [...cfg.matchAll(/<part id="\d+" subtype="(\w+)">([\s\S]*?)<\/part>/g)].map((m) => {
    const chei = Object.fromEntries([...m[2].matchAll(/<metadata key="(\w+)" value="([^"]*)"\/>/g)].map((x) => [x[1], x[2]]));
    return { tip: m[1], ...chei } as Record<string, string>;
  }).concat([...cfg.matchAll(/<object id="\d+">\s*<metadata key="name" value="([^"]+)"\/>\s*<metadata key="extruder" value="(\d+)"/g)].map((m) => ({ tip: "obiect", name: m[1], extruder: m[2] })));
}

describe("termoformare: desenul colorat pe plasa", () => {
  it("o imagine cu 4 culori da plasa pe baza si cate o parte pe culoare, cu extruderele corecte si fara pereti", () => {
    cu(SETARI, (rez) => {
      expect(rez.info.culori).toHaveLength(4);
      const parti = partiDin3mf(rez, SETARI);
      const culoare = parti.filter((p) => p.tip === "normal_part" && p.wall_loops === "0");
      expect(culoare.length).toBeGreaterThanOrEqual(3);
      // Extruderele partilor de culoare: 2..4, fiecare culoare a desenului prezenta.
      expect(new Set(culoare.map((p) => p.extruder))).toEqual(new Set(["2", "3", "4"]));
      // Baza (plasa) pe extruderul 1, matritele dupa culori (5).
      expect(parti.some((p) => p.tip === "normal_part" && p.extruder === "1" && !p.wall_loops)).toBe(true);
      const obiecte = parti.filter((p) => p.tip === "obiect");
      expect(obiecte.filter((o) => /Matri/i.test(o.name)).every((o) => o.extruder === "5")).toBe(true);
      expect(listaFilamente(rez.info, SETARI, "ro").at(-1)).toMatch(/^5: /);
    });
  });

  it("proiectul are cate un slot de filament pentru fiecare extruder folosit, matritele in PETG", () => {
    cu(SETARI, (rez) => {
      const fisiere = unzipSync(proiectBambu(proiectTermo(piesePrint(rez), SETARI, "ro", "Proba", rez.info)));
      const cfg = JSON.parse(strFromU8(fisiere["Metadata/project_settings.config"])) as { filament_type: string[]; filament_colour: string[] };
      const folosite = [...strFromU8(fisiere["Metadata/model_settings.config"]).matchAll(/key="extruder" value="(\d+)"/g)].map((m) => Number(m[1]));
      expect(cfg.filament_type).toHaveLength(Math.max(...folosite));
      expect(cfg.filament_type).toEqual(["PLA", "PLA", "PLA", "PLA", "PETG"]);
      expect(cfg.filament_colour.slice(0, 4)).toEqual(rez.info.culori.map((c) => c.toUpperCase()));
    });
  });

  it("liniile subtiri primesc umplerea deasa, zonele mari umplerea zonelor", () => {
    cu(SETARI, (rez) => {
      const plasa = rez.print.find((p) => p.cheie === "plasa")!;
      const linii = plasa.parti!.filter((p) => p.nume === "linii");
      const zone = plasa.parti!.filter((p) => p.nume === "zone");
      expect(linii.length).toBeGreaterThan(0);
      expect(linii.every((p) => p.densitate === TERMO.densitateLinii)).toBe(true);
      expect(zone.every((p) => p.densitate === TERMO.densitateZone)).toBe(true);
      // Negrul (liniile ochilor si ale gurii) e linie, nu zona.
      const negru = rez.info.culori.find((c) => esteNegru(c))!;
      expect(linii.some((p) => p.culoare === negru)).toBe(true);
      expect(zone.some((p) => p.culoare === negru)).toBe(false);
      const parti = partiDin3mf(rez, SETARI);
      expect(parti.some((p) => p.sparse_infill_density === `${TERMO.densitateLinii}%` && p.wall_loops === "0")).toBe(true);
      expect(rez.info.liniiDense).toBe(linii.length);
    });
  });

  it("partile de culoare sunt plate, cat membrana, asezate peste ea (nu in grosimea ei)", () => {
    cu(SETARI, (rez) => {
      const plasa = rez.print.find((p) => p.cheie === "plasa")!;
      const bp = plasa.corp.boundingBox();
      for (const p of plasa.parti!.filter((x) => x.tip === "normal_part")) {
        const b = p.corp.boundingBox();
        expect(b.max[2] - b.min[2]).toBeCloseTo(TERMO.membrana, 3);
        // Membrana sta pe pat (0..t); culoarea incepe unde se termina ea. Suprapuse, slicerul ar da zona plasei.
        expect(b.min[2]).toBeCloseTo(bp.min[2] + TERMO.membrana, 3);
        expect(p.corp.intersect(plasa.corp).volume()).toBeLessThan(1e-3);
      }
      // Matritele lasa loc si stratului desenului.
      expect(rez.info.joc).toBeCloseTo(2 * TERMO.membrana + TERMO.jocPeste, 6);
    });
  });

  it("numarul de culori nu trece niciodata de limita imprimantei", () => {
    expect(numarCulori({ sistemCulori: "bambu-ams-lite", culori: 8 })).toBe(4);
    expect(numarCulori({ sistemCulori: "prusa-mmu3", culori: 0 })).toBe(5);
    cu({ ...SETARI, culori: 8, sistemCulori: "bambu-ams-lite" }, (rez) => {
      expect(rez.info.culori.length).toBeLessThanOrEqual(4);
    });
  });

  it("rama colorata e un modificator separat, in culoarea aleasa", () => {
    const s = { ...SETARI, ramaColorata: true, culoareRama: "" };
    cu(s, (rez) => {
      const parti = partiDin3mf(rez, s);
      const mod_ = parti.filter((p) => p.tip === "modifier_part");
      expect(mod_).toHaveLength(1);
      expect(mod_[0].wall_loops).toBeUndefined();
      // implicit: cea mai inchisa culoare din desen (negrul)
      const negru = rez.info.culori.findIndex((c) => esteNegru(c)) + 1;
      expect(mod_[0].extruder).toBe(String(negru));
      // Nicio parte sub pat: Bambu Studio ar ridica tot obiectul pana la ea, iar membrana ar incepe in aer.
      const plasa = rez.print.find((p) => p.cheie === "plasa")!;
      const jos = plasa.corp.boundingBox().min[2];
      for (const p of plasa.parti!) expect(p.corp.boundingBox().min[2]).toBeGreaterThanOrEqual(jos - 1e-6);
    });
  });

  it("la cutie, spatele: oglinda are tot desenul, conturul mai putin, simplu nimic", () => {
    const parti = (spate: SetariTermo["spate"]) => cu({ ...SETARI, mod: "cutie", spate }, (r) => r.print.find((p) => p.cheie === "plasa2")?.parti?.length ?? 0);
    const oglinda = parti("oglinda"), contur = parti("contur"), simplu = parti("simplu");
    const fata = cu({ ...SETARI, mod: "cutie" }, (r) => r.print.find((p) => p.cheie === "plasa")!.parti!.length);
    expect(oglinda).toBe(fata);
    expect(contur).toBeGreaterThan(0);
    expect(contur).toBeLessThan(oglinda);
    expect(simplu).toBe(0);
  }, 60_000);

  it("fara desen, plasa ramane de o culoare si matritele pe extruderul 2", () => {
    const s = { ...SETARI, desen: "fara" as const };
    cu(s, (rez) => {
      expect(rez.info.culori).toEqual([]);
      expect(rez.print.find((p) => p.cheie === "plasa")!.parti).toBeUndefined();
      expect(partiDin3mf(rez, s).filter((p) => p.tip === "obiect" && /Matri/i.test(p.name)).every((o) => o.extruder === "2")).toBe(true);
    });
  });
});
