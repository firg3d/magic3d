import * as THREE from "three";
import { MeshBVH } from "three-mesh-bvh";
import { meshDataPositions, positionsBoundaryEdges, type MeshData } from "@/lib/editorMeshCore";

/*
 * "Printeaza in Romania - cere oferta": logica fara interfata. Configuratia vine din
 * /oferta/config.json (editabil pe server, fara rebuild); valorile de mai jos sunt doar plasa de
 * siguranta daca fisierul lipseste sau e stricat.
 */

export type DimensiuniMm = { x: number; y: number; z: number };

export type OfertaConfig = {
  /** Numarul WhatsApp, doar cifre, cu prefixul tarii (40...). */
  whatsapp: string;
  uploadUrl: string;
  atelierUrl: string;
  atelierNume: string;
  maxMbFisier: number;
  expirareZile: number;
  /** Cea mai mare piesa pe care o poate printa atelierul, in orice orientare. */
  volumMaxMm: DimensiuniMm;
  /** Sub grosimea asta un perete e semnalat ca subtire. */
  peretiMinimMm: number;
  materiale: string[];
  /** Mesajul WhatsApp, rand cu rand, cu {campuri}. */
  mesaj: string[];
};

export const OFERTA_IMPLICIT: OfertaConfig = {
  whatsapp: "40744330466",
  uploadUrl: "/oferta/upload.php",
  atelierUrl: "https://praktik3d.ro",
  atelierNume: "Praktik3D",
  maxMbFisier: 50,
  expirareZile: 20,
  volumMaxMm: { x: 300, y: 300, z: 300 },
  peretiMinimMm: 0.8,
  materiale: ["PLA", "PETG", "TPU", "ABS/ASA"],
  mesaj: [
    "Bună ziua! Aș dori o ofertă de print 3D prin Magic3D.",
    "",
    "Nume: {nume}",
    "Telefon: {telefon}",
    "Oraș: {oras}",
    "Material: {material}",
    "Culoare: {culoare}",
    "Cantitate: {cantitate}",
    "Student: {student}",
    "Dimensiuni: {dimensiuni}",
    "Volum estimat: {volum}",
    "Greutate estimată: {greutate}",
    "Observații: {observatii}",
    "",
    "Fișiere: {link}",
    "Linkul expiră în {zileText}.",
  ],
};

const pozitiv = (value: unknown, fallback: number) => (typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback);
const text = (value: unknown, fallback: string) => (typeof value === "string" && value.trim() ? value.trim() : fallback);

/** Pune peste valorile implicite doar ce e valid in fisierul de configurare. */
export function normalizeazaConfig(raw: unknown): OfertaConfig {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const volum = (r.volumMaxMm && typeof r.volumMaxMm === "object" ? r.volumMaxMm : {}) as Record<string, unknown>;
  const lista = (value: unknown, fallback: string[]) =>
    Array.isArray(value) && value.length && value.every((item) => typeof item === "string") ? (value as string[]) : fallback;
  const whatsapp = text(r.whatsapp, OFERTA_IMPLICIT.whatsapp).replace(/\D/g, "");
  return {
    whatsapp: whatsapp.length >= 8 ? whatsapp : OFERTA_IMPLICIT.whatsapp,
    uploadUrl: text(r.uploadUrl, OFERTA_IMPLICIT.uploadUrl),
    atelierUrl: text(r.atelierUrl, OFERTA_IMPLICIT.atelierUrl),
    atelierNume: text(r.atelierNume, OFERTA_IMPLICIT.atelierNume),
    maxMbFisier: pozitiv(r.maxMbFisier, OFERTA_IMPLICIT.maxMbFisier),
    expirareZile: pozitiv(r.expirareZile, OFERTA_IMPLICIT.expirareZile),
    volumMaxMm: {
      x: pozitiv(volum.x, OFERTA_IMPLICIT.volumMaxMm.x),
      y: pozitiv(volum.y, OFERTA_IMPLICIT.volumMaxMm.y),
      z: pozitiv(volum.z, OFERTA_IMPLICIT.volumMaxMm.z),
    },
    peretiMinimMm: pozitiv(r.peretiMinimMm, OFERTA_IMPLICIT.peretiMinimMm),
    materiale: lista(r.materiale, OFERTA_IMPLICIT.materiale),
    mesaj: Array.isArray(r.mesaj) && r.mesaj.every((line) => typeof line === "string") ? (r.mesaj as string[]) : OFERTA_IMPLICIT.mesaj,
  };
}

export async function incarcaConfigOferta(url = "/oferta/config.json", fetchFn: typeof fetch = fetch): Promise<OfertaConfig> {
  try {
    const response = await fetchFn(url, { cache: "no-store" });
    return normalizeazaConfig(response.ok ? await response.json() : null);
  } catch {
    return OFERTA_IMPLICIT;
  }
}

/** Incape piesa in volumul de print, intoarsa cum trebuie? Compara laturile sortate. */
export function seIncadreaza(piesa: DimensiuniMm, volum: DimensiuniMm): boolean {
  const a = [piesa.x, piesa.y, piesa.z].sort((p, q) => p - q);
  const b = [volum.x, volum.y, volum.z].sort((p, q) => p - q);
  return a.every((latura, i) => latura <= b[i] + 1e-6);
}

/** Muchiile deschise ale pieselor exportate: 0 inseamna corp inchis (etans). */
export function muchiiDeschise(meshes: readonly MeshData[]): number {
  return meshes.reduce((total, mesh) => total + positionsBoundaryEdges(meshDataPositions(mesh)).length, 0);
}

export type PeretiSubtiri = {
  /** Cat din suprafata (0..1) are sub ea mai putin decat pragul pana la fata opusa. */
  suprafataSubtire: number;
  /** Cea mai mica grosime gasita, in mm (null daca nu s-a putut masura nimic). */
  minimMm: number | null;
};

/**
 * Pereti subtiri, estimat: din centrul fiecarui triunghi (esantionat dupa arie) trage o raza spre
 * interiorul corpului si masoara pana la prima fata. Unde distanta e sub prag, peretele e subtire.
 * E o avertizare, nu o verdict: o muchie ascutita sau un text fin dau si ele distante mici.
 */
export function peretiSubtiri(meshes: readonly MeshData[], pragMm: number, esantioane = 4000): PeretiSubtiri {
  let ariaTotala = 0;
  let ariaSubtire = 0;
  let minim: number | null = null;
  const totalTriunghiuri = meshes.reduce((sum, mesh) => sum + mesh.faces.length, 0);
  const pas = Math.max(1, Math.floor(totalTriunghiuri / esantioane));
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const ray = new THREE.Ray();
  for (const mesh of meshes) {
    if (mesh.faces.length === 0) continue;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(meshDataPositions(mesh), 3));
    const bvh = new MeshBVH(geometry);
    for (let index = 0; index < mesh.faces.length; index += pas) {
      const [ia, ib, ic] = mesh.faces[index];
      a.fromArray(mesh.vertices[ia]);
      b.fromArray(mesh.vertices[ib]);
      c.fromArray(mesh.vertices[ic]);
      normal.subVectors(b, a).cross(c.clone().sub(a));
      const aria = normal.length() / 2;
      if (aria < 1e-9) continue;
      normal.normalize();
      const start = new THREE.Vector3().add(a).add(b).add(c).divideScalar(3);
      // Putin inauntru, ca raza sa nu loveasca propriul triunghi.
      ray.origin.copy(start).addScaledVector(normal, -1e-3);
      ray.direction.copy(normal).negate();
      const hit = bvh.raycastFirst(ray, THREE.DoubleSide);
      ariaTotala += aria;
      if (!hit) continue;
      const grosime = hit.distance + 1e-3;
      if (minim === null || grosime < minim) minim = grosime;
      if (grosime < pragMm) ariaSubtire += aria;
    }
    geometry.dispose();
  }
  return { suprafataSubtire: ariaTotala > 0 ? ariaSubtire / ariaTotala : 0, minimMm: minim };
}

/** Peste cat la suta din suprafata subtire merita avertizat. */
export const PRAG_AVERTIZARE_SUBTIRE = 0.01;

export type DateOferta = {
  nume: string;
  telefon: string;
  oras: string;
  material: string;
  culoare: string;
  cantitate: number;
  student: boolean;
  observatii: string;
  dimensiuni: string;
  /** Estimarea, deja formatata ("12,3 cm³", "≈ 15 g"); goala daca nu exista. */
  volum: string;
  greutate: string;
  link: string;
  zile: number;
};

/** "1 zi", "7 zile", "20 de zile", "101 zile": cu "de" cand ultimele doua cifre nu sunt intre 1 si 19. */
export function zileText(zile: number): string {
  if (zile === 1) return "1 zi";
  const rest = zile % 100;
  return rest >= 1 && rest <= 19 ? `${zile} zile` : `${zile} de zile`;
}

/** Mesajul WhatsApp din sablonul din config; un rand al carui camp a ramas gol dispare. */
export function mesajOferta(sablon: readonly string[], date: DateOferta): string {
  const valori: Record<string, string> = {
    nume: date.nume.trim(),
    telefon: date.telefon.trim(),
    oras: date.oras.trim(),
    material: date.material.trim(),
    culoare: date.culoare.trim(),
    cantitate: String(date.cantitate),
    student: date.student ? "da" : "nu",
    observatii: date.observatii.trim(),
    dimensiuni: date.dimensiuni,
    volum: date.volum,
    greutate: date.greutate,
    link: date.link,
    zile: String(date.zile),
    zileText: zileText(date.zile),
  };
  return sablon
    .filter((line) => {
      const campuri = [...line.matchAll(/\{(\w+)\}/g)].map((match) => match[1]);
      return campuri.length === 0 || campuri.some((camp) => (valori[camp] ?? "") !== "");
    })
    .map((line) => line.replace(/\{(\w+)\}/g, (all, camp: string) => valori[camp] ?? all))
    .join("\n");
}

export function linkWhatsApp(numar: string, mesaj: string): string {
  return `https://wa.me/${numar.replace(/\D/g, "")}?text=${encodeURIComponent(mesaj)}`;
}

/** Telefon (sau tableta cu WhatsApp ca aplicatie): acolo linkul deschide direct aplicatia, fara QR. */
export function estePeTelefon(userAgent: string, maxTouchPoints: number): boolean {
  return /Android|iPhone|iPod|Mobile|Windows Phone/i.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
}

/** Un telefon romanesc sau international plauzibil: 9-15 cifre, cu + sau spatii permise. */
export function telefonValid(telefon: string): boolean {
  const cifre = telefon.replace(/[\s().-]/g, "");
  return /^\+?\d{9,15}$/.test(cifre);
}

export function formatDimensiuni(d: DimensiuniMm, format: (value: number) => string): string {
  return `${format(d.x)} × ${format(d.y)} × ${format(d.z)} mm`;
}
