import { describe, expect, it } from "vitest";
import type { MeshData } from "@/lib/editorMeshCore";
import {
  estePeTelefon,
  linkWhatsApp,
  mesajOferta,
  muchiiDeschise,
  normalizeazaConfig,
  OFERTA_IMPLICIT,
  peretiSubtiri,
  seIncadreaza,
  telefonValid,
  type DateOferta,
} from "@/magic3d/oferta/oferta";

/** Un paralelipiped inchis, cu fetele orientate spre exterior. */
function cutie(x: number, y: number, z: number): MeshData {
  const v: [number, number, number][] = [
    [0, 0, 0], [x, 0, 0], [x, y, 0], [0, y, 0],
    [0, 0, z], [x, 0, z], [x, y, z], [0, y, z],
  ];
  const f: [number, number, number][] = [
    [0, 2, 1], [0, 3, 2], // jos (z=0), normala -z
    [4, 5, 6], [4, 6, 7], // sus
    [0, 1, 5], [0, 5, 4], // y=0
    [2, 3, 7], [2, 7, 6], // y=max
    [1, 2, 6], [1, 6, 5], // x=max
    [3, 0, 4], [3, 4, 7], // x=0
  ];
  return { name: "cutie", vertices: v, faces: f };
}

const date: DateOferta = {
  nume: "Ana Pop",
  telefon: "0744 000 000",
  oras: "Cluj",
  material: "PETG",
  culoare: "",
  cantitate: 3,
  student: true,
  observatii: "",
  dimensiuni: "10 × 20 × 30 mm",
  volum: "4,2 cm³",
  greutate: "",
  link: "https://magic3d.ro/oferta/d.php?id=abc",
  zile: 20,
};

describe("cererea de oferta (Magic3D)", () => {
  it("ia din configuratie doar ce e valid si pastreaza restul implicit", () => {
    const config = normalizeazaConfig({ whatsapp: "+40 744 330 466", volumMaxMm: { x: 200, y: -1 }, materiale: [], mesaj: "nu e lista" });
    expect(config.whatsapp).toBe("40744330466");
    expect(config.volumMaxMm).toEqual({ x: 200, y: OFERTA_IMPLICIT.volumMaxMm.y, z: OFERTA_IMPLICIT.volumMaxMm.z });
    expect(config.materiale).toEqual(OFERTA_IMPLICIT.materiale);
    expect(config.mesaj).toEqual(OFERTA_IMPLICIT.mesaj);
    expect(normalizeazaConfig(null)).toEqual(OFERTA_IMPLICIT);
  });

  it("verifica incadrarea in volumul de print in orice orientare", () => {
    const volum = { x: 250, y: 210, z: 220 };
    expect(seIncadreaza({ x: 200, y: 240, z: 100 }, volum)).toBe(true);
    expect(seIncadreaza({ x: 260, y: 10, z: 10 }, volum)).toBe(false);
    expect(seIncadreaza({ x: 230, y: 230, z: 230 }, volum)).toBe(false);
  });

  it("scrie mesajul din sablon, cu Student da/nu, si sare randurile ramase goale", () => {
    const mesaj = mesajOferta(OFERTA_IMPLICIT.mesaj, date);
    expect(mesaj).toContain("Nume: Ana Pop");
    expect(mesaj).toContain("Student: da");
    expect(mesaj).toContain("Cantitate: 3");
    expect(mesaj).toContain("Linkul expiră în 20 de zile.");
    expect(mesaj).toContain("Volum estimat: 4,2 cm³");
    expect(mesaj).not.toContain("Greutate estimată:");
    expect(mesaj).not.toContain("Culoare:");
    expect(mesaj).not.toContain("Observații:");
    expect(mesajOferta(OFERTA_IMPLICIT.mesaj, { ...date, student: false })).toContain("Student: nu");
  });

  it("face linkul wa.me cu mesajul codat", () => {
    const url = linkWhatsApp("+40 744 330 466", "Bună & ziua?\nRând");
    expect(url.startsWith("https://wa.me/40744330466?text=")).toBe(true);
    expect(decodeURIComponent(url.split("text=")[1])).toBe("Bună & ziua?\nRând");
  });

  it("recunoaste telefonul si numerele de telefon plauzibile", () => {
    expect(estePeTelefon("Mozilla/5.0 (Linux; Android 14) Mobile", 5)).toBe(true);
    expect(estePeTelefon("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)", 5)).toBe(true);
    expect(estePeTelefon("Mozilla/5.0 (Windows NT 10.0; Win64; x64)", 0)).toBe(false);
    expect(telefonValid("0744 330 466")).toBe(true);
    expect(telefonValid("+40 (744) 330-466")).toBe(true);
    expect(telefonValid("123")).toBe(false);
  });

  it("numara muchiile deschise: 0 pentru un corp inchis", () => {
    const inchisa = cutie(10, 10, 10);
    expect(muchiiDeschise([inchisa])).toBe(0);
    const deschisa = { ...inchisa, faces: inchisa.faces.slice(2) };
    expect(muchiiDeschise([deschisa])).toBe(4);
  });

  it("semnaleaza peretii subtiri: o placa de 0,4 mm da, un cub de 10 mm nu", () => {
    const placa = peretiSubtiri([cutie(20, 20, 0.4)], 0.8);
    expect(placa.suprafataSubtire).toBeGreaterThan(0.5);
    expect(placa.minimMm).toBeCloseTo(0.4, 2);
    const cub = peretiSubtiri([cutie(10, 10, 10)], 0.8);
    expect(cub.suprafataSubtire).toBe(0);
  });
});
