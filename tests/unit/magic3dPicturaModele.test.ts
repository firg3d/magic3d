import * as THREE from "three";
import { describe, expect, it } from "vitest";
import type { CorpPictat } from "@/magic3d/pictura/date";
import { IMPRIMANTE, estimeaza, limitaCulori, sistem, sistemPentruProfil } from "@/magic3d/pictura/imprimante";
import { MODELE, PARAMETRI_IMPLICITI, PROIECTII, calculeazaModel, cutieVarfuri, type ParametriModel } from "@/magic3d/pictura/modele";
import { PRESETARI, modeleleMele, salveazaModelulMeu, stergeModelulMeu } from "@/magic3d/pictura/presetari";
import { distanta, reduceCulori, unesteSloturi } from "@/magic3d/pictura/reducere";
import { topologie } from "@/magic3d/pictura/topologie";
import { PRINTER_PRESETS } from "@/lib/printerPresets.generated";

function corp(geom: THREE.BufferGeometry): CorpPictat {
  const varfuri = new Float32Array(geom.getAttribute("position").array as ArrayLike<number>);
  const fete = new Uint32Array(geom.index!.array as ArrayLike<number>);
  return { id: "c", nume: "c", varfuri, fete, culori: new Uint8Array(fete.length / 3) };
}

function niveluri(c: CorpPictat, p: Partial<ParametriModel>) {
  const t = topologie(c);
  return calculeazaModel(t.centre, t.normale, cutieVarfuri(c.varfuri), { ...PARAMETRI_IMPLICITI, ...p })!;
}

const sfera = () => corp(new THREE.SphereGeometry(20, 48, 24));

describe("pictura: modele de culoare", () => {
  it("fiecare model, pe fiecare proiectie, da numai niveluri 0..k-1 si e reproductibil", () => {
    const c = sfera();
    for (const model of MODELE) for (const proiectie of PROIECTII) {
      const p = { model, proiectie, culori: 3, marime: 4, seed: 9 };
      const a = niveluri(c, p);
      expect(a.length).toBe(c.culori.length);
      expect(Math.max(...a), `${model}/${proiectie}`).toBeLessThan(3);
      expect(niveluri(c, p)).toEqual(a);
    }
  });

  it("modelele aleatoare se schimba cu seed-ul, cele geometrice nu", () => {
    const c = sfera();
    expect(niveluri(c, { model: "camuflaj", seed: 1, culori: 3 })).not.toEqual(niveluri(c, { model: "camuflaj", seed: 2, culori: 3 }));
    expect(niveluri(c, { model: "voronoi", seed: 1, culori: 4 })).not.toEqual(niveluri(c, { model: "voronoi", seed: 2, culori: 4 }));
    expect(niveluri(c, { model: "dungi", seed: 1 })).toEqual(niveluri(c, { model: "dungi", seed: 2 }));
  });

  it("dungile de sus, pe o placa, alterneaza la fiecare `marime` mm", () => {
    const placa = corp(new THREE.PlaneGeometry(40, 40, 40, 1).rotateX(-Math.PI / 2));
    const t = topologie(placa);
    const n = niveluri(placa, { model: "dungi", proiectie: "sus", marime: 5, culori: 2 });
    for (let i = 0; i < t.triunghiuri; i += 1) {
      const x = t.centre[i * 3] + 20; // fata de marginea placii, 0..40
      expect(n[i]).toBe(Math.floor((x - 20) / 5 + 100) % 2);
    }
  });

  it("gradientul pe inaltime urca de jos in sus prin toate culorile", () => {
    const c = corp(new THREE.CylinderGeometry(5, 5, 30, 16, 30));
    const t = topologie(c);
    const n = niveluri(c, { model: "gradientInaltime", culori: 5 });
    // In ordinea inaltimii, nivelul nu scade niciodata.
    const ordine = [...Array(t.triunghiuri).keys()].sort((a, b) => t.centre[a * 3 + 1] - t.centre[b * 3 + 1]);
    const scaderi = ordine.slice(1).filter((tri, k) => n[tri] < n[ordine[k]]);
    expect(scaderi).toEqual([]);
    expect(new Set(n).size).toBe(5);
  });

  it("buline: o singura culoare de fond si forme pe celelalte", () => {
    const c = sfera();
    const n = niveluri(c, { model: "buline", culori: 3, densitate: 0.6, marime: 6 });
    const nr = [0, 1, 2].map((k) => n.filter((x) => x === k).length);
    expect(nr[0]).toBeGreaterThan(nr[1]);
    expect(nr[1] + nr[2]).toBeGreaterThan(0);
  });

  it("calculul se poate anula", () => {
    const c = corp(new THREE.SphereGeometry(20, 400, 200));
    const t = topologie(c);
    expect(calculeazaModel(t.centre, t.normale, cutieVarfuri(c.varfuri), PARAMETRI_IMPLICITI, () => false)).toBeNull();
  });
});

describe("pictura: presetari si Modelele mele", () => {
  it("presetarile din config au numele cerute si destule culori", () => {
    const nume = PRESETARI.map((p) => p.nume.ro);
    for (const n of ["Pepene", "Militar", "Crăciun", "Galaxie", "Zebră", "Curcubeu", "Marmură albă"]) expect(nume).toContain(n);
    for (const p of PRESETARI) expect(p.culori.length).toBeGreaterThanOrEqual(p.parametri.culori);
  });

  it("modelele mele se salveaza, se citesc si se sterg din stocarea browserului", () => {
    const date = new Map<string, string>();
    const stocare = { getItem: (k: string) => date.get(k) ?? null, setItem: (k: string, v: string) => void date.set(k, v) };
    expect(modeleleMele(stocare)).toEqual([]);
    const lista = salveazaModelulMeu({ nume: "Al meu", parametri: { ...PARAMETRI_IMPLICITI, model: "valuri" }, culori: ["#ffffff", "#000000"] }, stocare);
    expect(modeleleMele(stocare)).toEqual(lista);
    expect(lista[0].parametri.model).toBe("valuri");
    // Acelasi nume inlocuieste.
    expect(salveazaModelulMeu({ nume: "Al meu", parametri: PARAMETRI_IMPLICITI, culori: ["#ffffff"] }, stocare)).toHaveLength(1);
    expect(stergeModelulMeu(modeleleMele(stocare)[0].id, stocare)).toEqual([]);
    date.set("magic3d.pictura.modele", "{stricat");
    expect(modeleleMele(stocare)).toEqual([]);
  });
});

describe("pictura: limita de culori dupa imprimanta", () => {
  it("se schimba odata cu profilul de imprimanta", () => {
    expect(sistemPentruProfil("bambu-lab-a1-mini")?.id).toBe("bambu-ams-lite");
    expect(limitaCulori(sistemPentruProfil("bambu-lab-a1-mini")!)).toBe(4);
    const ams = sistemPentruProfil("bambu-lab-x1-carbon")!;
    expect(ams.id).toBe("bambu-ams");
    expect([1, 2, 3, 4].map((u) => limitaCulori(ams, u))).toEqual([4, 8, 12, 16]);
    expect(limitaCulori(ams, 9)).toBe(16);
    expect(limitaCulori(sistemPentruProfil("prusa-mk4s")!)).toBe(5);
    expect(sistemPentruProfil("creality-ender-3")).toBeNull();
    expect(sistemPentruProfil(null)).toBeNull();
    expect(limitaCulori(sistem("fara"))).toBe(1);
  });

  it("configul e consistent: fiecare regula numeste un profil care exista, nicio limita peste 16", () => {
    const ids = PRINTER_PRESETS.map((p) => p.id);
    for (const r of IMPRIMANTE.profile) {
      const potrivite = r.profil.endsWith("*") ? ids.filter((id) => id.startsWith(r.profil.slice(0, -1))) : ids.filter((id) => id === r.profil);
      expect(potrivite.length, r.profil).toBeGreaterThan(0);
    }
    for (const s of IMPRIMANTE.sisteme) expect(limitaCulori(s, s.unitatiMax)).toBeLessThanOrEqual(16);
  });
});

describe("pictura: estimari", () => {
  it("dungi orizontale pe un cilindru: o schimbare la fiecare granita, material si timp pe masura", () => {
    const c = corp(new THREE.CylinderGeometry(10, 10, 20, 24, 10).translate(0, 10, 0));
    const t = topologie(c);
    for (let i = 0; i < t.triunghiuri; i += 1) c.culori[i] = Math.min(9, Math.floor(t.centre[i * 3 + 1] / 2)) % 2;
    const s = sistem("bambu-ams");
    const e = estimeaza([c], s);
    expect(e.straturi).toBe(100);
    expect(e.schimbari).toBeGreaterThanOrEqual(9);
    expect(e.schimbari).toBeLessThanOrEqual(12);
    expect(e.grame).toBeCloseTo(e.schimbari * s.gramePerSchimbare, 1);
    expect(e.secunde).toBe(e.schimbari * s.secundePerSchimbare);
    c.culori.fill(0);
    expect(estimeaza([c], s).schimbari).toBe(0);
  });
});

describe("pictura: reducerea la N culori", () => {
  const rand = (seed: number) => () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

  it("nu depaseste niciodata limita, iar fiecare slot merge la cea mai apropiata culoare aleasa", () => {
    const r = rand(42);
    const hex = () => `#${Math.floor(r() * 0xffffff).toString(16).padStart(6, "0")}`;
    const paleta = Array.from({ length: 12 }, hex);
    for (let caz = 0; caz < 200; caz += 1) {
      const n = 1 + Math.floor(r() * 16);
      const sloturi = Array.from({ length: n }, hex);
      const ponderi = sloturi.map(() => (r() < 0.2 ? 0 : Math.floor(r() * 1000)));
      const limita = 1 + Math.floor(r() * 8);
      for (const cuPaleta of [false, true]) {
        const rez = reduceCulori({ sloturi, ponderi, limita, paleta: cuPaleta ? paleta : undefined, fixate: r() < 0.5 ? [Math.floor(r() * n)] : [] });
        expect(rez.sloturi.length).toBeLessThanOrEqual(limita);
        expect(rez.mapare).toHaveLength(n);
        if (cuPaleta) for (const s of rez.sloturi) expect(paleta.map((p) => p.toLowerCase())).toContain(s);
        rez.mapare.forEach((j, i) => {
          const dMin = Math.min(...rez.sloturi.map((s) => distanta(sloturi[i].toLowerCase(), s)));
          expect(distanta(sloturi[i].toLowerCase(), rez.sloturi[j])).toBeCloseTo(dMin, 9);
        });
      }
    }
  });

  it("cand incap, culorile alese sunt exact cele mai apropiate din paleta", () => {
    const paleta = ["#ffffff", "#000000", "#ff0000", "#00ff00", "#0000ff", "#ffff00"];
    const rez = reduceCulori({ sloturi: ["#f0f0f0", "#e01010", "#1010d0"], ponderi: [10, 5, 5], limita: 4, paleta });
    expect(rez.sloturi).toEqual(["#ffffff", "#ff0000", "#0000ff"]);
    expect(rez.mapare).toEqual([0, 1, 2]);
  });

  it("strange culorile asemanatoare si pastreaza slotul fixat", () => {
    const sloturi = ["#ffffff", "#c8282e", "#d03030", "#1f5fbf", "#2a66c4"];
    const ponderi = [100, 50, 40, 30, 20];
    const rez = reduceCulori({ sloturi, ponderi, limita: 3 });
    expect(rez.sloturi).toHaveLength(3);
    expect(rez.mapare[1]).toBe(rez.mapare[2]); // cele doua rosii
    expect(rez.mapare[3]).toBe(rez.mapare[4]); // cele doua albastre
    const fixat = reduceCulori({ sloturi, ponderi, limita: 3, fixate: [4] });
    expect(fixat.sloturi).toContain("#2a66c4");
    // Culorile nefolosite dispar.
    expect(reduceCulori({ sloturi, ponderi: [1, 0, 0, 1, 0], limita: 4 }).sloturi).toEqual(["#ffffff", "#1f5fbf"]);
  });

  it("unirea manuala muta un slot in altul si renumeroteaza", () => {
    expect(unesteSloturi(["#a00000", "#00a000", "#0000a0", "#a0a000"], 1, 3)).toEqual({ sloturi: ["#a00000", "#0000a0", "#a0a000"], mapare: [0, 2, 1, 2] });
    expect(unesteSloturi(["#a00000", "#00a000"], 1, 1).mapare).toEqual([0, 1]);
  });
});
