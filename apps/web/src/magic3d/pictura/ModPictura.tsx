"use client";

/*
 * Modul Pictura din editor (al treilea tab, langa Editor 3D si Schita): corpurile scenei se
 * picteaza pe triunghiuri si ies ca 3MF multicolor.
 *
 * Vederea e a modului (un renderer three.js propriu), ca editorul sa nu se schimbe: corpurile
 * intra ca plase, iar la iesire editorul primeste pictura fiecarui corp si o pune in istoric
 * intr-un singur pas. In mod, fiecare actiune de pictura are anulare/refacere proprie.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from "three-mesh-bvh";
import { t } from "@/magic3d/core/i18n/index";
import { SLOTURI_MAXIME, type CorpPictat } from "@/magic3d/pictura/date";
import { PALETA_ATELIER, filamentAtelier } from "@/magic3d/pictura/paleta";
import { deschideOferta } from "@/magic3d/oferta/OfertaButton";
import { culoriFaraStoc, detaliiOferta } from "@/magic3d/pictura/ofertaPictura";
import { exportaPictura3mfAsync } from "@/magic3d/pictura/pictura3mf";
import { calculeazaModelInFundal, type CalculModel } from "@/magic3d/pictura/calculWorker";
import { estimeaza, limitaCulori, sistem as sistemDupaId, sistemPentruProfil } from "@/magic3d/pictura/imprimante";
import { PARAMETRI_IMPLICITI, cutieVarfuri, type ParametriModel } from "@/magic3d/pictura/modele";
import { PRESETARI, modeleleMele as citesteModeleleMele, salveazaModelulMeu, stergeModelulMeu, type ModelulMeu } from "@/magic3d/pictura/presetari";
import { reduceCulori, unesteSloturi, type RezultatReducere } from "@/magic3d/pictura/reducere";
import { FARA, proiecteazaDecal, reduceImagine, type Decal, type ImagineRedusa } from "@/magic3d/pictura/imagine";
import { marime3mfEstimata, repara, simplifica, subdivizeaza, sudeazaVarfuri } from "@/magic3d/pictura/retusare";
import { dreptunghi, selecteazaInPoligon, type Punct } from "@/magic3d/pictura/selectie";
import { SectiuneImagine, SectiuneRetusare, SectiuneSelectie, type ModSelectie, type SursaImagine } from "@/magic3d/pictura/SectiuniRetusare";
import { SectiuneEstimari, SectiuneImprimanta, SectiuneModele, SectiuneReducere, type SursaReducere, type TintaModel } from "@/magic3d/pictura/SectiuniPictura";
import { subPensula, topologie, zonaGaleata, type ModGaleata, type ModPensula, type Topologie } from "@/magic3d/pictura/topologie";

export type Unealta = "pensula" | "galeata" | "pipeta" | "radiera" | "selectie" | "imagine";

/** O actiune de pictura: ce triunghiuri, ce culori aveau, ce culoare au primit. */
type ActiunePictura = { tip: "pictura"; corp: number; triunghiuri: Uint32Array; vechi: Uint8Array; nou: number };
/** Culorile tuturor corpurilor si sloturile, inainte si dupa: un model aplicat, o reducere, o unire. */
type StarePictura = { culori: Uint8Array[]; sloturi: string[] };
type ActiuneStare = { tip: "stare"; inainte: StarePictura; dupa: StarePictura };
/** O schimbare de geometrie (subdivizare, reparare, simplificare): corpurile intregi, inainte si dupa. */
type ActiuneGeometrie = { tip: "geometrie"; inainte: CorpPictat[]; dupa: CorpPictat[] };
type Actiune = ActiunePictura | ActiuneStare | ActiuneGeometrie;

/** Peste atatea triunghiuri in total, modul propune simplificarea si nu mai subdivizeaza. */
const TRIUNGHIURI_MAX = 2_000_000;
const EVIDENTA = new THREE.Color("#3b82f6");
const copieCorp = (c: CorpPictat): CorpPictat => ({ ...c, culori: new Uint8Array(c.culori) });

/** Cata memorie poate tine istoricul modului (instantaneele unui model mare sunt mari). */
const ISTORIC_OCTETI_MAX = 160 * 1024 * 1024;
const octeti = (a: Actiune) => (a.tip === "pictura" ? a.triunghiuri.byteLength + a.vechi.byteLength
  : a.tip === "stare" ? a.inainte.culori.reduce((s, c) => s + c.byteLength * 2, 0)
    : [...a.inainte, ...a.dupa].reduce((s, c) => s + c.varfuri.byteLength + c.fete.byteLength + c.culori.byteLength, 0));

export type RezultatPictura = { corpuri: CorpPictat[]; sloturi: string[] };

type Props = {
  corpuri: CorpPictat[];
  sloturi: string[];
  titlu: string;
  /** Editorul cere starea curenta cand se iese din mod. */
  inregistreaza: (colector: (() => RezultatPictura) | null) => void;
  onGata: () => void;
  /** O actiune s-a terminat (pictura, anulare, sloturi): editorul o poate salva pe corpuri. */
  onSchimbare?: () => void;
  onAnunt: (text: string, eroare?: boolean) => void;
  /** Profilul de imprimanta ales in editor (id de preset): da sistemul multicolor si limita. */
  profilImprimanta?: string | null;
};

const AVERTISMENT_VAZUT = "magic3d.pictura.avertisment";
const NEUTRU = new THREE.Color("#d9dcd8");

function formatOcteti(n: number) {
  return n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB";
}

function nrFormat(n: number) {
  return n.toLocaleString("ro-RO");
}

export function ModPictura({ corpuri: intrare, sloturi: sloturiInitiale, titlu, inregistreaza, onGata, onSchimbare, onAnunt, profilImprimanta }: Props) {
  const onSchimbareRef = useRef(onSchimbare);
  onSchimbareRef.current = onSchimbare;
  const gazda = useRef<HTMLDivElement>(null);
  // Corpurile sunt stare: retusarea le poate schimba geometria (scena se reface atunci).
  const [corpuri, setCorpuri] = useState<CorpPictat[]>(() => intrare.map(copieCorp));
  const intrarePrimita = useRef(intrare);
  useEffect(() => {
    if (intrarePrimita.current === intrare) return;
    intrarePrimita.current = intrare;
    setCorpuri(intrare.map(copieCorp));
  }, [intrare]);
  /** Selectia: un octet pe triunghi, pe corp. */
  const selectii = useRef<Uint8Array[]>([]);
  if (selectii.current.length !== corpuri.length || selectii.current.some((x, i) => x.length !== corpuri[i].culori.length)) {
    selectii.current = corpuri.map((c, i) => (selectii.current[i]?.length === c.culori.length ? selectii.current[i] : new Uint8Array(c.culori.length)));
  }
  const [nrSelectate, setNrSelectate] = useState(0);
  /** Imaginea pusa pe model, inainte de "Aplica": indexuri pe triunghi si culorile lor. */
  const decalPrev = useRef<{ index: Uint8Array[]; culori: THREE.Color[] } | null>(null);
  /** Vederea camerei, pastrata cand scena se reface dupa o retusare. */
  const vedere = useRef<{ pozitie: THREE.Vector3; tinta: THREE.Vector3 } | null>(null);
  const topologii = useMemo<Topologie[]>(() => corpuri.map((c) => topologie(c)), [corpuri]);
  const [sloturi, setSloturi] = useState<string[]>(sloturiInitiale);
  const [activ, setActiv] = useState(Math.min(1, sloturiInitiale.length - 1));
  const [ascunse, setAscunse] = useState<Set<number>>(new Set());
  const [unealta, setUnealta] = useState<Unealta>("pensula");
  const [modPensula, setModPensula] = useState<ModPensula>("vizibil");
  const [modGaleata, setModGaleata] = useState<ModGaleata>("muchii");
  const [unghi, setUnghi] = useState(30);
  const [muchii, setMuchii] = useState(false);
  // Istoricul sta intr-o referinta (anularea schimba culorile o singura data, si in StrictMode);
  // starea doar reimprospateaza butoanele.
  const istoricRef = useRef<{ pasi: Actiune[]; index: number }>({ pasi: [], index: 0 });
  const [istoric, setIstoric] = useState(istoricRef.current);
  const [avertisment, setAvertisment] = useState(() => {
    try { return window.localStorage.getItem(AVERTISMENT_VAZUT) !== "da"; } catch { return true; }
  });
  const [exporta, setExporta] = useState(false);

  const diag = useMemo(() => {
    const box = new THREE.Box3();
    corpuri.forEach((c) => {
      for (let i = 0; i < c.varfuri.length; i += 3) box.expandByPoint(new THREE.Vector3(c.varfuri[i], c.varfuri[i + 1], c.varfuri[i + 2]));
    });
    return box.isEmpty() ? 100 : box.min.distanceTo(box.max);
  }, [corpuri]);
  const [marime, setMarime] = useState(() => Math.max(0.5, Math.round(diag * 0.03 * 10) / 10));
  const marimeMax = Math.max(5, Math.round(diag * 0.3));

  // Starea pe care o citesc evenimentele vederii fara sa refaca scena.
  const [modSelectie, setModSelectie] = useState<ModSelectie>("dreptunghi");
  const [selectiePrin, setSelectiePrin] = useState(false);
  const stare = useRef({ unealta, modPensula, modGaleata, unghi, marime, activ, sloturi, ascunse, modSelectie, selectiePrin });
  stare.current = { unealta, modPensula, modGaleata, unghi, marime, activ, sloturi, ascunse, modSelectie, selectiePrin };
  const contur = useRef<SVGSVGElement>(null);
  /** Ce cheama vederea din handler-ele ei (mereu varianta curenta). */
  const actiuni = useRef<{
    seteazaSelectie: (liste: number[][], op: "nou" | "adauga" | "scade") => void;
    plaseazaDecal: (centru: [number, number, number], directie: [number, number, number], sus: [number, number, number]) => void;
  }>({ seteazaSelectie: () => undefined, plaseazaDecal: () => undefined });
  const scena = useRef<{ plase: THREE.Mesh[]; fire: THREE.Mesh[]; inel: THREE.Mesh; randeaza: () => void } | null>(null);
  /** Creste la fiecare schimbare de culori (culorile se schimba pe loc, in typed arrays). */
  const [versiune, setVersiune] = useState(0);
  /** Reducerea propusa, aratata pe model inainte de a fi aplicata. */
  const [previzualizare, setPrevizualizare] = useState<RezultatReducere | null>(null);
  const previzRef = useRef(previzualizare);
  previzRef.current = previzualizare;
  const actiuneCurenta = useRef<{ corp: number; vechi: Map<number, number>; nou: number } | null>(null);

  /** Culorile unui corp, din indexuri, in bufferul plasei. */
  const coloreaza = useCallback((index: number, triunghiuri?: Iterable<number>) => {
    const s = scena.current;
    if (!s) return;
    const geom = s.plase[index].geometry;
    const atr = geom.getAttribute("color") as THREE.BufferAttribute;
    const arr = atr.array as Float32Array;
    const culori = stare.current.sloturi.map((hex) => new THREE.Color(hex));
    const prev = previzRef.current;
    const culoriPrev = prev ? prev.sloturi.map((hex) => new THREE.Color(hex)) : null;
    const corp = corpuri[index];
    // Selectia si imaginea previzualizata sunt calculate pe o plasa anume; dupa o retusare,
    // pana se recalculeaza, nu se potrivesc cu plasa noua si nu se folosesc.
    const sel = selectii.current[index]?.length === corp.culori.length ? selectii.current[index] : undefined;
    const decIndex = decalPrev.current?.index[index];
    const dec = decIndex?.length === corp.culori.length ? decIndex : undefined;
    const decCulori = decalPrev.current?.culori;
    const amestec = new THREE.Color();
    const scrie = (tri: number) => {
      const slot = corp.culori[tri];
      let c = culoriPrev ? culoriPrev[prev!.mapare[slot]] ?? culoriPrev[0]
        : stare.current.ascunse.has(slot) ? NEUTRU : culori[slot] ?? culori[0];
      if (dec && decCulori && dec[tri] !== FARA) c = decCulori[dec[tri]] ?? c;
      if (sel && sel[tri]) c = amestec.copy(c).lerp(EVIDENTA, 0.55);
      for (let k = 0; k < 3; k += 1) { arr[tri * 9 + k * 3] = c.r; arr[tri * 9 + k * 3 + 1] = c.g; arr[tri * 9 + k * 3 + 2] = c.b; }
    };
    if (triunghiuri) for (const tri of triunghiuri) scrie(tri);
    else for (let tri = 0; tri < corp.culori.length; tri += 1) scrie(tri);
    atr.needsUpdate = true;
    s.randeaza();
  }, [corpuri]);

  /** Pune o stare intreaga (culorile tuturor corpurilor si sloturile). */
  const puneStare = useCallback((st: StarePictura) => {
    corpuri.forEach((c, i) => c.culori.set(st.culori[i]));
    stare.current.sloturi = st.sloturi;
    setSloturi(st.sloturi);
    setActiv((a) => Math.min(a, st.sloturi.length - 1));
    corpuri.forEach((_, i) => coloreaza(i));
  }, [coloreaza, corpuri]);
  const instantaneu = useCallback((): StarePictura => ({ culori: corpuri.map((c) => new Uint8Array(c.culori)), sloturi: [...stare.current.sloturi] }), [corpuri]);

  const aplicaActiune = useCallback((a: Actiune, invers: boolean) => {
    if (a.tip === "geometrie") {
      setCorpuri((invers ? a.inainte : a.dupa).map(copieCorp));
      return;
    }
    if (a.tip === "stare") {
      puneStare(invers ? a.inainte : a.dupa);
      return;
    }
    const culori = corpuri[a.corp].culori;
    a.triunghiuri.forEach((tri, i) => { culori[tri] = invers ? a.vechi[i] : a.nou; });
    coloreaza(a.corp, a.triunghiuri);
  }, [coloreaza, corpuri, puneStare]);

  const adaugaPas = useCallback((pas: Actiune) => {
    const h = istoricRef.current;
    const pasi = [...h.pasi.slice(0, h.index), pas];
    let total = pasi.reduce((s2, x) => s2 + octeti(x), 0);
    while (pasi.length > 1 && (pasi.length > 200 || total > ISTORIC_OCTETI_MAX)) total -= octeti(pasi.shift()!);
    istoricRef.current = { pasi, index: pasi.length };
    setIstoric(istoricRef.current);
    setVersiune((v) => v + 1);
    onSchimbareRef.current?.();
  }, []);

  const anuleaza = useCallback(() => {
    const h = istoricRef.current;
    if (h.index === 0) return;
    aplicaActiune(h.pasi[h.index - 1], true);
    istoricRef.current = { ...h, index: h.index - 1 };
    setIstoric(istoricRef.current);
    setVersiune((v) => v + 1);
    onSchimbareRef.current?.();
  }, [aplicaActiune]);
  const reface = useCallback(() => {
    const h = istoricRef.current;
    if (h.index >= h.pasi.length) return;
    aplicaActiune(h.pasi[h.index], false);
    istoricRef.current = { ...h, index: h.index + 1 };
    setIstoric(istoricRef.current);
    setVersiune((v) => v + 1);
    onSchimbareRef.current?.();
  }, [aplicaActiune]);

  /** Pune culoarea pe triunghiuri; in timpul unei trasaturi, totul intra intr-o singura actiune. */
  const picteaza = useCallback((index: number, triunghiuri: number[], culoare: number) => {
    const culori = corpuri[index].culori;
    let a = actiuneCurenta.current;
    if (!a || a.corp !== index || a.nou !== culoare) {
      inchideActiune();
      a = { corp: index, vechi: new Map(), nou: culoare };
      actiuneCurenta.current = a;
    }
    const schimbate: number[] = [];
    for (const tri of triunghiuri) {
      if (culori[tri] === culoare) continue;
      if (!a.vechi.has(tri)) a.vechi.set(tri, culori[tri]);
      culori[tri] = culoare;
      schimbate.push(tri);
    }
    if (schimbate.length) coloreaza(index, schimbate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coloreaza, corpuri]);

  const inchideActiune = useCallback(() => {
    const a = actiuneCurenta.current;
    actiuneCurenta.current = null;
    if (!a || a.vechi.size === 0) return;
    adaugaPas({ tip: "pictura", corp: a.corp, triunghiuri: Uint32Array.from(a.vechi.keys()), vechi: Uint8Array.from(a.vechi.values()), nou: a.nou });
  }, [adaugaPas]);

  // Editorul cere rezultatul la iesire, dupa ce modul s-a inchis: colectorul ramane al lui.
  useEffect(() => {
    inregistreaza(() => ({ corpuri, sloturi: stare.current.sloturi }));
  }, [corpuri, inregistreaza]);

  // Scena: o plasa ne-indexata pe corp (culoarea e pe triunghi), firele triunghiurilor, inelul pensulei.
  useEffect(() => {
    const el = gazda.current;
    if (!el || corpuri.length === 0) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    el.append(renderer.domElement);
    renderer.domElement.dataset.testid = "pictura-vedere";
    const three = new THREE.Scene();
    three.add(new THREE.HemisphereLight(0xffffff, 0x8a8f8c, 1.6));
    const soare = new THREE.DirectionalLight(0xffffff, 1.4);
    three.add(soare);
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100000);
    const controale = new OrbitControls(camera, renderer.domElement);
    controale.enableDamping = false;
    controale.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };

    const box = new THREE.Box3();
    const plase: THREE.Mesh[] = [];
    const fire: THREE.Mesh[] = [];
    corpuri.forEach((c) => {
      const n = c.fete.length / 3;
      const poz = new Float32Array(n * 9);
      for (let tri = 0; tri < n; tri += 1) for (let k = 0; k < 3; k += 1) {
        const v = c.fete[tri * 3 + k] * 3;
        poz[tri * 9 + k * 3] = c.varfuri[v]; poz[tri * 9 + k * 3 + 1] = c.varfuri[v + 1]; poz[tri * 9 + k * 3 + 2] = c.varfuri[v + 2];
      }
      const geom = new THREE.BufferGeometry();
      geom.setAttribute("position", new THREE.BufferAttribute(poz, 3));
      geom.setAttribute("color", new THREE.BufferAttribute(new Float32Array(n * 9), 3));
      geom.computeVertexNormals();
      (geom as THREE.BufferGeometry & { computeBoundsTree: typeof computeBoundsTree }).computeBoundsTree = computeBoundsTree;
      (geom as unknown as { computeBoundsTree: (o?: object) => void }).computeBoundsTree({ indirect: true });
      const plasa = new THREE.Mesh(geom, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0, flatShading: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
      plasa.raycast = acceleratedRaycast;
      three.add(plasa);
      plase.push(plasa);
      const fir = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color: 0x1d2420, wireframe: true, transparent: true, opacity: 0.35 }));
      fir.visible = false;
      fir.raycast = () => undefined;
      three.add(fir);
      fire.push(fir);
      geom.computeBoundingBox();
      box.union(geom.boundingBox!);
    });
    const inel = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 48), new THREE.MeshBasicMaterial({ color: 0x121815, side: THREE.DoubleSide, depthTest: false, transparent: true, opacity: 0.9 }));
    inel.renderOrder = 10;
    inel.visible = false;
    three.add(inel);

    const centru = box.getCenter(new THREE.Vector3());
    const raza = Math.max(1, box.getSize(new THREE.Vector3()).length() / 2);
    camera.position.copy(centru).add(new THREE.Vector3(1, 0.8, 1.2).normalize().multiplyScalar(raza * 2.6));
    camera.near = raza / 100;
    camera.far = raza * 100;
    controale.target.copy(centru);
    if (vedere.current) {
      camera.position.copy(vedere.current.pozitie);
      controale.target.copy(vedere.current.tinta);
    }
    controale.update();
    controale.addEventListener("change", () => { vedere.current = { pozitie: camera.position.clone(), tinta: controale.target.clone() }; });

    let cadru = 0;
    const randeaza = () => {
      if (cadru) return;
      cadru = requestAnimationFrame(() => {
        cadru = 0;
        soare.position.copy(camera.position);
        renderer.render(three, camera);
      });
    };
    const masoara = () => {
      const w = Math.max(1, el.clientWidth), h = Math.max(1, el.clientHeight);
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      randeaza();
    };
    const observator = new ResizeObserver(masoara);
    observator.observe(el);
    controale.addEventListener("change", randeaza);
    scena.current = { plase, fire, inel, randeaza };
    corpuri.forEach((_, i) => coloreaza(i));
    masoara();

    const raycaster = new THREE.Raycaster();
    (raycaster as THREE.Raycaster & { firstHitOnly?: boolean }).firstHitOnly = true;
    const lovitura = (ev: PointerEvent) => {
      const r = renderer.domElement.getBoundingClientRect();
      raycaster.setFromCamera(new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1), camera);
      const hit = raycaster.intersectObjects(plase, false)[0];
      if (!hit || hit.faceIndex == null) return null;
      const corp = plase.indexOf(hit.object as THREE.Mesh);
      // Arborele e "indirect": geometria ramane in ordinea ei, deci faceIndex e chiar triunghiul.
      return { corp, tri: hit.faceIndex, punct: hit.point, normala: hit.face?.normal ?? new THREE.Vector3(0, 1, 0) };
    };

    const unealtaEfectiva = (ev: PointerEvent): Unealta => (ev.shiftKey && stare.current.unealta === "pensula" ? "radiera" : stare.current.unealta);
    const aplica = (ev: PointerEvent, h: NonNullable<ReturnType<typeof lovitura>>) => {
      const u = unealtaEfectiva(ev);
      const st = stare.current;
      if (u === "pipeta") {
        setActiv(corpuri[h.corp].culori[h.tri]);
        return;
      }
      if (u === "galeata") {
        const zona = zonaGaleata(topologii[h.corp], h.tri, st.modGaleata, st.unghi, corpuri[h.corp].culori);
        picteaza(h.corp, zona, st.activ);
        inchideActiune();
        return;
      }
      const spre = camera.position.clone().sub(h.punct).normalize();
      const zona = subPensula(topologii[h.corp], h.tri, [h.punct.x, h.punct.y, h.punct.z], st.marime, st.modPensula, [spre.x, spre.y, spre.z]);
      picteaza(h.corp, zona, u === "radiera" ? 0 : st.activ);
    };

    // Selectia: poligonul desenat pe ecran (coordonate in canvas), aratat in conturul SVG.
    let poligon: Punct[] | null = null;
    let opSelectie: "nou" | "adauga" | "scade" = "nou";
    const punctEcran = (ev: PointerEvent): Punct => {
      const r = renderer.domElement.getBoundingClientRect();
      return [ev.clientX - r.left, ev.clientY - r.top];
    };
    const formaSelectiei = (pol: Punct[]) => (stare.current.modSelectie === "dreptunghi" ? dreptunghi(pol[0], pol[pol.length - 1]) : pol);
    const deseneazaContur = () => {
      const forma = poligon && poligon.length >= 2 ? formaSelectiei(poligon) : null;
      contur.current?.querySelector("polygon")?.setAttribute("points", forma ? forma.map(([x, y]) => x + "," + y).join(" ") : "");
    };
    const terminaSelectia = () => {
      if (!poligon) return;
      const forma = formaSelectiei(poligon);
      poligon = null;
      deseneazaContur();
      const r = renderer.domElement.getBoundingClientRect();
      const v = new THREE.Vector3();
      const laEcran = (x: number, y: number, z: number): [number, number, boolean] => {
        v.set(x, y, z).project(camera);
        return [((v.x + 1) / 2) * r.width, ((1 - v.y) / 2) * r.height, v.z > -1 && v.z < 1];
      };
      const cam = stare.current.selectiePrin ? null : ([camera.position.x, camera.position.y, camera.position.z] as const);
      actiuni.current.seteazaSelectie(topologii.map((top) => selecteazaInPoligon(top, forma, laEcran, cam)), opSelectie);
    };

    let picteazaAcum = false;
    const jos = (ev: PointerEvent) => {
      if (ev.button !== 0) return;
      if (stare.current.unealta === "selectie") {
        controale.enabled = false;
        renderer.domElement.setPointerCapture(ev.pointerId);
        opSelectie = ev.shiftKey ? "adauga" : ev.altKey ? "scade" : "nou";
        poligon = [punctEcran(ev)];
        return;
      }
      const h = lovitura(ev);
      if (!h) return; // in afara modelului, butonul stang roteste
      if (stare.current.unealta === "imagine") {
        const dir = h.punct.clone().sub(camera.position).normalize();
        actiuni.current.plaseazaDecal([h.punct.x, h.punct.y, h.punct.z], [dir.x, dir.y, dir.z], [camera.up.x, camera.up.y, camera.up.z]);
        return;
      }
      controale.enabled = false;
      picteazaAcum = unealtaEfectiva(ev) === "pensula" || unealtaEfectiva(ev) === "radiera";
      renderer.domElement.setPointerCapture(ev.pointerId);
      aplica(ev, h);
    };
    const misca = (ev: PointerEvent) => {
      if (poligon) {
        const p = punctEcran(ev);
        const ultim = poligon[poligon.length - 1];
        if (stare.current.modSelectie === "dreptunghi") poligon = [poligon[0], p];
        else if (Math.hypot(p[0] - ultim[0], p[1] - ultim[1]) > 3) poligon.push(p);
        deseneazaContur();
        return;
      }
      const h = lovitura(ev);
      const st = stare.current;
      if (h && (st.unealta === "pensula" || st.unealta === "radiera")) {
        inel.visible = true;
        inel.position.copy(h.punct);
        const n = h.normala.clone().transformDirection(plase[h.corp].matrixWorld);
        inel.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
        inel.scale.setScalar(st.marime);
        (inel.material as THREE.MeshBasicMaterial).color.set(unealtaEfectiva(ev) === "radiera" ? "#c8282e" : "#121815");
      } else inel.visible = false;
      if (picteazaAcum && h) aplica(ev, h);
      randeaza();
    };
    const sus = (ev: PointerEvent) => {
      if (renderer.domElement.hasPointerCapture(ev.pointerId)) renderer.domElement.releasePointerCapture(ev.pointerId);
      terminaSelectia();
      picteazaAcum = false;
      controale.enabled = true;
      inchideActiune();
    };
    const iese = () => { inel.visible = false; randeaza(); };
    const c = renderer.domElement;
    c.addEventListener("pointerdown", jos);
    c.addEventListener("pointermove", misca);
    c.addEventListener("pointerup", sus);
    c.addEventListener("pointercancel", sus);
    c.addEventListener("pointerleave", iese);
    return () => {
      c.removeEventListener("pointerdown", jos);
      c.removeEventListener("pointermove", misca);
      c.removeEventListener("pointerup", sus);
      c.removeEventListener("pointercancel", sus);
      c.removeEventListener("pointerleave", iese);
      cancelAnimationFrame(cadru);
      observator.disconnect();
      controale.dispose();
      plase.forEach((p) => {
        disposeBoundsTree.call(p.geometry);
        p.geometry.dispose();
        (p.material as THREE.Material).dispose();
      });
      fire.forEach((f) => (f.material as THREE.Material).dispose());
      inel.geometry.dispose();
      (inel.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.domElement.remove();
      scena.current = null;
    };
    // Scena se face o data pe intrare; uneltele se citesc din `stare`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [corpuri, topologii]);

  // Culorile sloturilor sau ce e ascuns s-au schimbat: se recoloreaza tot.
  useEffect(() => { corpuri.forEach((_, i) => coloreaza(i)); }, [sloturi, ascunse, previzualizare, corpuri, coloreaza]);
  const sloturiPrimite = useRef(sloturi);
  useEffect(() => {
    if (sloturiPrimite.current !== sloturi) onSchimbareRef.current?.();
  }, [sloturi]);
  useEffect(() => {
    scena.current?.fire.forEach((f) => (f.visible = muchii));
    scena.current?.randeaza();
  }, [muchii]);

  // Tastele modului; restul tastelor nu mai ajung la scurtaturile editorului cat timp se picteaza.
  useEffect(() => {
    const tasta = (ev: KeyboardEvent) => {
      const tinta = ev.target as HTMLElement | null;
      if (tinta && (tinta.tagName === "INPUT" || tinta.tagName === "TEXTAREA" || tinta.isContentEditable)) {
        ev.stopPropagation();
        return;
      }
      const ctrl = ev.ctrlKey || ev.metaKey;
      const k = ev.key.toLowerCase();
      let folosita = true;
      if (ctrl && k === "z" && !ev.shiftKey) anuleaza();
      else if (ctrl && (k === "y" || (k === "z" && ev.shiftKey))) reface();
      else if (ctrl) folosita = false;
      else if (k === "b") setUnealta("pensula");
      else if (k === "g") setUnealta("galeata");
      else if (k === "i") setUnealta("pipeta");
      else if (k === "e") setUnealta((u) => (u === "radiera" ? "pensula" : "radiera"));
      else if (k === "s") setUnealta("selectie");
      else if (k === "m") setUnealta("imagine");
      else if (k === "escape" && stare.current.unealta === "selectie") actiuni.current.seteazaSelectie([], "nou");
      else if (k === "[") setMarime((m) => Math.max(0.2, Math.round(m * 8) / 10));
      else if (k === "]") setMarime((m) => Math.min(marimeMax, Math.round(m * 12.5) / 10));
      else if (/^[1-9]$/.test(k) && Number(k) <= stare.current.sloturi.length) setActiv(Number(k) - 1);
      else folosita = false;
      if (folosita) ev.preventDefault();
      // Tastele editorului (Delete, mutari, grupari) nu au ce cauta aici: corpurile nu se vad.
      ev.stopPropagation();
    };
    document.addEventListener("keydown", tasta);
    return () => document.removeEventListener("keydown", tasta);
  }, [anuleaza, reface, marimeMax]);

  // --- imprimanta, limita, estimari ---
  const [sistemId, setSistemId] = useState(() => sistemPentruProfil(profilImprimanta)?.id ?? "bambu-ams");
  const [unitati, setUnitati] = useState(1);
  const [limitaManuala, setLimitaManuala] = useState<number | null>(null);
  const sistemAles = sistemDupaId(sistemId);
  const limita = limitaManuala ?? limitaCulori(sistemAles, unitati);
  const ponderi = useMemo(() => {
    const p = new Array<number>(SLOTURI_MAXIME).fill(0);
    corpuri.forEach((c) => c.culori.forEach((x) => { p[x] += 1; }));
    return p.slice(0, sloturi.length);
    // versiune: culorile se schimba pe loc
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [corpuri, sloturi.length, versiune]);
  const folosite = ponderi.filter((x) => x > 0).length;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const estimare = useMemo(() => estimeaza(corpuri, sistemAles), [corpuri, sistemAles, versiune]);

  /** O stare noua pentru toate corpurile, ca un singur pas de anulare. */
  const aplicaStare = useCallback((culoriNoi: Uint8Array[], sloturiNoi: string[]) => {
    const inainte = instantaneu();
    const dupa = { culori: culoriNoi, sloturi: sloturiNoi };
    puneStare(dupa);
    adaugaPas({ tip: "stare", inainte, dupa: { culori: culoriNoi.map((c) => new Uint8Array(c)), sloturi: [...sloturiNoi] } });
  }, [adaugaPas, instantaneu, puneStare]);
  const aplicaMapare = useCallback((rez: RezultatReducere) => {
    aplicaStare(corpuri.map((c) => c.culori.map((x) => Math.max(0, rez.mapare[x] ?? 0))), rez.sloturi);
  }, [aplicaStare, corpuri]);

  // --- reducerea de culori ---
  const [sursaReducere, setSursaReducere] = useState<SursaReducere>("folosite");
  const [fixate, setFixate] = useState<Set<number>>(new Set());
  const [arataPrevizualizare, setArataPrevizualizare] = useState(false);
  const propunereReducere = useCallback((): RezultatReducere => reduceCulori({
    sloturi,
    ponderi,
    limita,
    paleta: sursaReducere === "atelier" ? PALETA_ATELIER.filamente.filter((f) => f.disponibil).map((f) => f.hex) : undefined,
    fixate: [...fixate],
  }), [fixate, limita, ponderi, sloturi, sursaReducere]);
  useEffect(() => { setPrevizualizare(arataPrevizualizare ? propunereReducere() : null); }, [arataPrevizualizare, propunereReducere]);
  const aplicaReducerea = () => {
    setArataPrevizualizare(false);
    aplicaMapare(propunereReducere());
    setFixate(new Set());
  };
  const uneste = (din: number, inSlot: number) => {
    setArataPrevizualizare(false);
    aplicaMapare(unesteSloturi(sloturi, din, inSlot));
    setFixate(new Set());
  };

  // --- modele de culoare ---
  const [parametri, setParametri] = useState<ParametriModel>(PARAMETRI_IMPLICITI);
  const [culoriModel, setCuloriModel] = useState<string[]>(() => Array.from({ length: PARAMETRI_IMPLICITI.culori }, (_, i) => sloturiInitiale[i % sloturiInitiale.length]));
  const [presetareId, setPresetareId] = useState("");
  const [modeleleMele, setModeleleMele] = useState<ModelulMeu[]>(() => citesteModeleleMele());
  const [tinta, setTinta] = useState<TintaModel>("tot");
  const [progres, setProgres] = useState<number | null>(null);
  const calcul = useRef<CalculModel | null>(null);
  const alegePresetare = (id: string) => {
    setPresetareId(id);
    const p = PRESETARI.find((x) => x.id === id) ?? modeleleMele.find((x) => x.id === id);
    if (!p) return;
    setParametri(p.parametri);
    setCuloriModel(p.culori.map((c) => c.toLowerCase()));
  };
  const aplicaModel = async () => {
    if (calcul.current) return;
    // Culorile modelului devin sloturi: o culoare deja folosita isi pastreaza slotul.
    const sloturiNoi = [...sloturi];
    const nivelLaSlot = culoriModel.slice(0, parametri.culori).map((hex) => {
      const h = hex.toLowerCase();
      let k = sloturiNoi.indexOf(h);
      if (k < 0 && sloturiNoi.length < SLOTURI_MAXIME) { sloturiNoi.push(h); k = sloturiNoi.length - 1; }
      return Math.max(0, k);
    });
    const culoriNoi: Uint8Array[] = [];
    setProgres(0);
    try {
      for (let i = 0; i < corpuri.length; i += 1) {
        const top = topologii[i];
        const c = calculeazaModelInFundal(top.centre, top.normale, cutieVarfuri(corpuri[i].varfuri), parametri, (f) => setProgres((i + f) / corpuri.length));
        calcul.current = c;
        const niveluri = await c.rezultat;
        if (!niveluri) return; // anulat
        const noua = new Uint8Array(corpuri[i].culori);
        for (let tri = 0; tri < noua.length; tri += 1) {
          const inTinta = tinta === "tot" || (tinta === "selectie" ? selectii.current[i][tri] === 1 : corpuri[i].culori[tri] === tinta);
          if (inTinta) noua[tri] = nivelLaSlot[niveluri[tri]] ?? 0;
        }
        culoriNoi.push(noua);
      }
      aplicaStare(culoriNoi, sloturiNoi);
    } catch (e) {
      onAnunt(t("pictura.modelEsuat", { motiv: e instanceof Error ? e.message : String(e) }), true);
    } finally {
      calcul.current = null;
      setProgres(null);
    }
  };
  const anuleazaModel = () => calcul.current?.anuleaza();
  useEffect(() => () => calcul.current?.anuleaza(), []);

  const schimbaCuloare = (hex: string) => setSloturi((s) => s.map((c, i) => (i === activ ? hex.toLowerCase() : c)));
  const adaugaSlot = () => {
    if (sloturi.length >= SLOTURI_MAXIME) return;
    const urmatoarea = PALETA_ATELIER.filamente.find((f) => f.disponibil && !sloturi.includes(f.hex.toLowerCase()))?.hex.toLowerCase() ?? "#808080";
    setSloturi((s) => [...s, urmatoarea]);
    setActiv(sloturi.length);
  };
  const stergeSlot = () => {
    if (sloturi.length <= 1) return;
    // Triunghiurile ultimului slot trec pe baza, ca un singur pas de anulare.
    aplicaMapare(unesteSloturi(sloturi, sloturi.length - 1, 0));
  };
  const comutaAscuns = (slot: number) => setAscunse((s) => {
    const n = new Set(s);
    if (n.has(slot)) n.delete(slot); else n.add(slot);
    return n;
  });

  // --- selectia ---
  const numaraSelectia = useCallback(() => setNrSelectate(selectii.current.reduce((s2, x) => s2 + x.reduce((a, b) => a + b, 0), 0)), []);
  const reimprospateazaSelectia = useCallback(() => {
    numaraSelectia();
    corpuri.forEach((_, i) => coloreaza(i));
  }, [coloreaza, corpuri, numaraSelectia]);
  actiuni.current.seteazaSelectie = (liste, op) => {
    liste.forEach((lista, i) => {
      const sel = selectii.current[i];
      if (!sel) return;
      if (op === "nou") sel.fill(0);
      for (const t2 of lista) sel[t2] = op === "scade" ? 0 : 1;
    });
    reimprospateazaSelectia();
  };
  const selecteazaTot = () => { selectii.current.forEach((x) => x.fill(1)); reimprospateazaSelectia(); };
  const inverseazaSelectia = () => { selectii.current.forEach((x) => x.forEach((v, i) => { x[i] = v ? 0 : 1; })); reimprospateazaSelectia(); };
  const golesteSelectia = () => { selectii.current.forEach((x) => x.fill(0)); reimprospateazaSelectia(); };
  const culoarePeSelectie = () => {
    aplicaStare(corpuri.map((c, i) => c.culori.map((x, t2) => (selectii.current[i][t2] ? activ : x))), [...sloturi]);
  };

  // --- retusarea ---
  const [latura, setLatura] = useState(() => Math.max(0.5, Math.round((diag / 60) * 10) / 10));
  const [ocupat, setOcupat] = useState(false);
  const triunghiuriTotal = corpuri.reduce((s2, c) => s2 + c.culori.length, 0);
  const schimbaGeometria = useCallback((dupa: CorpPictat[], selectiiNoi?: Uint8Array[]) => {
    const inainte = corpuri.map(copieCorp);
    selectii.current = selectiiNoi ?? dupa.map((c) => new Uint8Array(c.culori.length));
    setCorpuri(dupa.map(copieCorp));
    adaugaPas({ tip: "geometrie", inainte, dupa: dupa.map(copieCorp) });
    numaraSelectia();
  }, [adaugaPas, corpuri, numaraSelectia]);
  const subdivizeazaSelectia = () => {
    const toataSelectia = nrSelectate === 0;
    let buget = TRIUNGHIURI_MAX;
    let adaugate = 0, limitaAtinsa = false;
    const selNoi: Uint8Array[] = [];
    const dupa = corpuri.map((c, i) => {
      const sud = sudeazaVarfuri({ varfuri: c.varfuri, fete: c.fete, culori: c.culori });
      const sel = toataSelectia ? new Uint8Array(sud.culori.length).fill(1) : Uint8Array.from(sud.pastrate, (t2) => selectii.current[i][t2]);
      const altii = triunghiuriTotal - c.culori.length;
      const r = subdivizeaza(sud, sel, latura, Math.max(sud.culori.length, buget - altii));
      adaugate += r.adaugate;
      limitaAtinsa ||= r.limitaAtinsa;
      buget -= r.adaugate;
      selNoi.push(toataSelectia ? new Uint8Array(r.culori.length) : r.selectie);
      return { ...c, varfuri: r.varfuri, fete: r.fete, culori: r.culori };
    });
    if (adaugate === 0) { onAnunt(t("pictura.nimicDeSubdivizat", { mm: latura })); return; }
    schimbaGeometria(dupa, selNoi);
    onAnunt(t(limitaAtinsa ? "pictura.subdivizatLimita" : "pictura.subdivizat", { n: adaugate.toLocaleString(), m: TRIUNGHIURI_MAX.toLocaleString() }), limitaAtinsa);
  };
  const reparaModelul = () => {
    const raport = { unite: 0, scoase: 0, inchise: 0, ramase: 0, intoarse: 0 };
    const dupa = corpuri.map((c) => {
      const r = repara({ varfuri: c.varfuri, fete: c.fete, culori: c.culori });
      (Object.keys(raport) as (keyof typeof raport)[]).forEach((k) => { raport[k] += r.raport[k]; });
      return { ...c, ...r.plasa };
    });
    schimbaGeometria(dupa);
    onAnunt(t("pictura.reparat", { unite: raport.unite, scoase: raport.scoase, inchise: raport.inchise, ramase: raport.ramase, intoarse: raport.intoarse }));
  };
  const simplificaModelul = async (fractie: number) => {
    setOcupat(true);
    try {
      const dupa: CorpPictat[] = [];
      for (const c of corpuri) {
        const r = await simplifica({ varfuri: c.varfuri, fete: c.fete, culori: c.culori }, Math.max(4, Math.round((c.fete.length / 3) * fractie)));
        dupa.push({ ...c, ...r });
      }
      schimbaGeometria(dupa);
      onAnunt(t("pictura.simplificat", { n: dupa.reduce((s2, c) => s2 + c.culori.length, 0).toLocaleString() }));
    } catch (e) {
      onAnunt(t("pictura.modelEsuat", { motiv: e instanceof Error ? e.message : String(e) }), true);
    } finally {
      setOcupat(false);
    }
  };

  // --- imaginea pe model ---
  const [imagine, setImagine] = useState<{ nume: string; original: string; rgba: Uint8ClampedArray; latime: number; inaltime: number; colt: string } | null>(null);
  const [culoriImagine, setCuloriImagine] = useState(4);
  const [sursaImagine, setSursaImagine] = useState<SursaImagine>("atelier");
  const [faraFundal, setFaraFundal] = useState(true);
  const [decal, setDecal] = useState<Pick<Decal, "centru" | "directie" | "sus"> | null>(null);
  const [latimeDecal, setLatimeDecal] = useState(() => Math.max(5, Math.round(diag / 3)));
  const [rotireDecal, setRotireDecal] = useState(0);
  const [mutareDecal, setMutareDecal] = useState<[number, number]>([0, 0]);
  const imagineRedusa = useMemo<ImagineRedusa | null>(() => {
    if (!imagine) return null;
    const paleta = sursaImagine === "atelier" ? PALETA_ATELIER.filamente.filter((f) => f.disponibil).map((f) => f.hex) : sloturi;
    return reduceImagine(imagine.rgba, imagine.latime, imagine.inaltime, paleta, Math.min(culoriImagine, limita), faraFundal ? imagine.colt : undefined);
  }, [culoriImagine, faraFundal, imagine, limita, sloturi, sursaImagine]);
  const imagineRedusaUrl = useMemo(() => {
    if (!imagineRedusa || typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = imagineRedusa.latime;
    canvas.height = imagineRedusa.inaltime;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const date = ctx.createImageData(canvas.width, canvas.height);
    const rgb = imagineRedusa.culori.map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
    imagineRedusa.index.forEach((k, i) => { if (k !== FARA) date.data.set([...rgb[k], 255], i * 4); });
    ctx.putImageData(date, 0, 0);
    return canvas.toDataURL("image/png");
  }, [imagineRedusa]);
  const incarcaImagine = (fisier: File) => {
    const url = URL.createObjectURL(fisier);
    const img = new Image();
    img.onload = () => {
      const lat0 = img.naturalWidth || 512, ina0 = img.naturalHeight || 512;
      const k = Math.min(1, 384 / Math.max(lat0, ina0));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(lat0 * k));
      canvas.height = Math.max(1, Math.round(ina0 * k));
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      URL.revokeObjectURL(url);
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const colt = "#" + [rgba[0], rgba[1], rgba[2]].map((x) => x.toString(16).padStart(2, "0")).join("");
      setImagine({ nume: fisier.name, original: canvas.toDataURL("image/png"), rgba, latime: canvas.width, inaltime: canvas.height, colt });
      setUnealta("imagine");
    };
    img.onerror = () => { URL.revokeObjectURL(url); onAnunt(t("pictura.imagineEsuata", { nume: fisier.name }), true); };
    img.src = url;
  };
  actiuni.current.plaseazaDecal = (centru, directie, sus) => {
    setDecal({ centru, directie, sus });
    setMutareDecal([0, 0]);
  };
  // Previzualizarea imaginii pe model, la fiecare schimbare de pozitie, marime sau culori.
  useEffect(() => {
    if (!decal || !imagineRedusa) {
      if (decalPrev.current) { decalPrev.current = null; corpuri.forEach((_, i) => coloreaza(i)); }
      return;
    }
    const d: Decal = { ...decal, latime: latimeDecal, rotire: rotireDecal, mutare: mutareDecal };
    decalPrev.current = { index: topologii.map((top) => proiecteazaDecal(top, imagineRedusa, d)), culori: imagineRedusa.culori.map((h) => new THREE.Color(h)) };
    corpuri.forEach((_, i) => coloreaza(i));
  }, [coloreaza, corpuri, decal, imagineRedusa, latimeDecal, mutareDecal, rotireDecal, topologii]);
  const renuntaImagine = () => { setDecal(null); setUnealta("pensula"); };
  const aplicaImaginea = () => {
    const prev = decalPrev.current;
    if (!prev || !imagineRedusa) return;
    const sloturiNoi = [...sloturi];
    const laSlot = imagineRedusa.culori.map((h) => {
      let k = sloturiNoi.indexOf(h);
      if (k < 0 && sloturiNoi.length < SLOTURI_MAXIME) { sloturiNoi.push(h); k = sloturiNoi.length - 1; }
      return Math.max(0, k);
    });
    const culoriNoi = corpuri.map((c, i) => c.culori.map((x, t2) => (prev.index[i][t2] !== FARA ? laSlot[prev.index[i][t2]] : x)));
    decalPrev.current = null;
    setDecal(null);
    aplicaStare(culoriNoi, sloturiNoi);
  };

  // --- exportul ---
  const [pentruSlicer, setPentruSlicer] = useState<"bambu" | "prusa">("bambu");

  // --- legatura cu atelierul ---
  const faraStoc = useMemo(() => culoriFaraStoc(sloturi, ponderi), [ponderi, sloturi]);
  /** Culorile care nu sunt pe stoc trec pe cel mai apropiat filament disponibil (sloturile identice se unesc). */
  const folosesteStocul = () => {
    aplicaMapare(reduceCulori({ sloturi, ponderi, limita: sloturi.length, paleta: PALETA_ATELIER.filamente.filter((f) => f.disponibil).map((f) => f.hex) }));
  };
  const [pregatesteOferta, setPregatesteOferta] = useState(false);
  const printeazaLaNoi = async () => {
    setPregatesteOferta(true);
    try {
      const sl = sloturi.map((hex) => {
        const f = filamentAtelier(hex);
        return { culoare: hex, nume: f?.nume, material: f?.material };
      });
      const threeMf = await exportaPictura3mfAsync(corpuri, sl, titlu, "bambu");
      deschideOferta({ generator: t("pictura.generatorOferta"), detalii: detaliiOferta(sloturi, ponderi, estimare.schimbari), threeMf });
    } catch (e) {
      onAnunt(t("pictura.exportEsuat", { motiv: e instanceof Error ? e.message : String(e) }), true);
    } finally {
      setPregatesteOferta(false);
    }
  };

  const exportaFisier = async () => {
    setExporta(true);
    try {
      const sl = sloturi.map((hex) => {
        const f = filamentAtelier(hex);
        return { culoare: hex, nume: f?.nume, material: f?.material };
      });
      const bytes = await exportaPictura3mfAsync(corpuri, sl, titlu, pentruSlicer);
      const nume = `${(titlu || "pictura").replace(/[\\/:*?"<>|]+/g, "-").trim() || "pictura"}-${pentruSlicer === "prusa" ? "prusaslicer" : "multicolor"}.3mf`;
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "model/3mf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = nume;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      onAnunt(t("pictura.exportGata", { nume }));
    } catch (e) {
      onAnunt(t("pictura.exportEsuat", { motiv: e instanceof Error ? e.message : String(e) }), true);
    } finally {
      setExporta(false);
    }
  };

  const triunghiuri = corpuri.reduce((s, c) => s + c.culori.length, 0);
  const unelte: { id: Unealta; tasta: string }[] = [
    { id: "pensula", tasta: "B" },
    { id: "galeata", tasta: "G" },
    { id: "pipeta", tasta: "I" },
    { id: "radiera", tasta: "E" },
    { id: "selectie", tasta: "S" },
    { id: "imagine", tasta: "M" },
  ];

  if (corpuri.length === 0) {
    return (
      <div className="m3d-pictura m3d-pictura-gol" data-testid="pictura-mod">
        <p>{t("pictura.nimic")}</p>
        <button type="button" className="m3d-pictura-buton" onClick={onGata}>{t("pictura.gata")}</button>
      </div>
    );
  }

  return (
    <div className="m3d-pictura" data-testid="pictura-mod">
      <aside className="m3d-pictura-panou stanga" aria-label={t("pictura.unelte")}>
        <h3>{t("pictura.unelte")}</h3>
        <div className="m3d-pictura-unelte" role="radiogroup" aria-label={t("pictura.unelte")}>
          {unelte.map((u) => (
            <button key={u.id} type="button" role="radio" aria-checked={unealta === u.id} className={unealta === u.id ? "activ" : ""}
              data-testid={`pictura-unealta-${u.id}`} title={`${t(`pictura.${u.id}`)} (${u.tasta})`} onClick={() => setUnealta(u.id)}>
              <span className="m3d-pictura-icon" aria-hidden="true" data-unealta={u.id} />
              {t(`pictura.${u.id}`)}
            </button>
          ))}
        </div>
        {unealta === "pensula" || unealta === "radiera" ? (
          <>
            <label className="m3d-pictura-camp">
              <span>{t("pictura.marime")} <output>{marime.toFixed(1)} mm</output></span>
              <input type="range" min={0.2} max={marimeMax} step={0.1} value={marime} data-testid="pictura-marime" onChange={(e) => setMarime(Number(e.target.value))} />
            </label>
            <label className="m3d-pictura-camp">
              <span>{t("pictura.modPensula")}</span>
              <select value={modPensula} data-testid="pictura-mod-pensula" onChange={(e) => setModPensula(e.target.value as ModPensula)}>
                <option value="vizibil">{t("pictura.vizibil")}</option>
                <option value="prin">{t("pictura.prin")}</option>
              </select>
            </label>
          </>
        ) : null}
        {unealta === "galeata" ? (
          <>
            <label className="m3d-pictura-camp">
              <span>{t("pictura.modGaleata")}</span>
              <select value={modGaleata} data-testid="pictura-mod-galeata" onChange={(e) => setModGaleata(e.target.value as ModGaleata)}>
                <option value="muchii">{t("pictura.muchii")}</option>
                <option value="culoare">{t("pictura.aceeasiCuloare")}</option>
              </select>
            </label>
            {modGaleata === "muchii" ? (
              <label className="m3d-pictura-camp">
                <span>{t("pictura.unghi")} <output>{unghi}°</output></span>
                <input type="range" min={1} max={90} step={1} value={unghi} data-testid="pictura-unghi" onChange={(e) => setUnghi(Number(e.target.value))} />
              </label>
            ) : null}
          </>
        ) : null}
        {unealta === "selectie" || nrSelectate > 0 ? (
          <SectiuneSelectie mod={modSelectie} prin={selectiePrin} selectate={nrSelectate} onMod={setModSelectie} onPrin={setSelectiePrin}
            onCuloare={culoarePeSelectie} onTot={selecteazaTot} onInverseaza={inverseazaSelectia} onGoleste={golesteSelectia} />
        ) : null}
        {unealta === "imagine" ? <p className="m3d-pictura-nota">{imagine ? t("pictura.plaseazaNota") : t("pictura.imagineIntai")}</p> : null}
        <SectiuneRetusare triunghiuri={triunghiuriTotal} maxim={TRIUNGHIURI_MAX} marimeFisier={formatOcteti(marime3mfEstimata(triunghiuriTotal))}
          lungime={latura} lungimeMax={Math.max(5, Math.round(diag / 4))} selectate={nrSelectate} ocupat={ocupat}
          onLungime={setLatura} onSubdivizeaza={subdivizeazaSelectia} onRepara={reparaModelul} onSimplifica={(f) => void simplificaModelul(f)} />
        <h3>{t("pictura.previzualizare")}</h3>
        <label className="m3d-pictura-bifa">
          <input type="checkbox" checked={muchii} data-testid="pictura-muchii" onChange={(e) => setMuchii(e.target.checked)} />
          {t("pictura.aratMuchii")}
        </label>
        <div className="m3d-pictura-istoric">
          <button type="button" data-testid="pictura-anuleaza" disabled={istoric.index === 0} onClick={anuleaza}>{t("pictura.anuleaza")}</button>
          <button type="button" data-testid="pictura-reface" disabled={istoric.index >= istoric.pasi.length} onClick={reface}>{t("pictura.reface")}</button>
        </div>
        <p className="m3d-pictura-taste">{t("pictura.taste")}</p>
      </aside>

      <div className="m3d-pictura-vedere" ref={gazda} role="img" aria-label={t("pictura.aria")}>
        <svg ref={contur} className="m3d-pictura-contur" aria-hidden="true"><polygon points="" /></svg>
        <p className="m3d-pictura-info" data-testid="pictura-info">
          {corpuri.length === 1 ? t("pictura.corp", { t: nrFormat(triunghiuri) }) : t("pictura.corpuri", { n: corpuri.length, t: nrFormat(triunghiuri) })}
        </p>
        {avertisment ? (
          <div className="m3d-pictura-avertisment" role="note" data-testid="pictura-avertisment">
            <p>{t("pictura.avertisment")}</p>
            <button type="button" onClick={() => {
              setAvertisment(false);
              try { window.localStorage.setItem(AVERTISMENT_VAZUT, "da"); } catch { /* fara stocare: apare din nou data viitoare */ }
            }}>{t("pictura.inteles")}</button>
          </div>
        ) : null}
      </div>

      <aside className="m3d-pictura-panou dreapta" aria-label={t("pictura.sloturi")}>
        <SectiuneImprimanta sistem={sistemAles} unitati={unitati} manual={limitaManuala} limita={limita} folosite={folosite}
          onSistem={(id) => { setSistemId(id); setUnitati(1); }} onUnitati={setUnitati} onManual={setLimitaManuala} />
        <h3>{t("pictura.sloturi")}</h3>
        <ol className="m3d-pictura-sloturi">
          {sloturi.map((hex, i) => {
            const f = filamentAtelier(hex);
            return (
              <li key={i} className={i === activ ? "activ" : ""}>
                <button type="button" className="m3d-pictura-slot" data-testid={`pictura-slot-${i + 1}`} aria-pressed={i === activ}
                  title={t("pictura.slotActiv", { n: i + 1 })} onClick={() => setActiv(i)}>
                  <span className="m3d-pictura-numar">{i + 1}</span>
                  <span className="m3d-pictura-mostra" style={{ background: hex }} />
                  <span className="m3d-pictura-nume">{f ? `${f.nume} · ${f.material}` : hex.toUpperCase()}{i === 0 ? <em> · {t("pictura.baza")}</em> : null}</span>
                </button>
                <button type="button" className="m3d-pictura-ochi" data-testid={`pictura-ascunde-${i + 1}`} aria-pressed={ascunse.has(i)}
                  title={ascunse.has(i) ? t("pictura.arata", { n: i + 1 }) : t("pictura.ascunde", { n: i + 1 })} aria-label={ascunse.has(i) ? t("pictura.arata", { n: i + 1 }) : t("pictura.ascunde", { n: i + 1 })}
                  onClick={() => comutaAscuns(i)}>{ascunse.has(i) ? "○" : "●"}</button>
              </li>
            );
          })}
        </ol>
        <div className="m3d-pictura-istoric">
          <button type="button" data-testid="pictura-adauga-slot" disabled={sloturi.length >= SLOTURI_MAXIME} onClick={adaugaSlot}>+ {t("pictura.adaugaSlot")}</button>
          <button type="button" data-testid="pictura-sterge-slot" disabled={sloturi.length <= 1} onClick={stergeSlot}>− {t("pictura.stergeSlot")}</button>
        </div>
        <h3>{t("pictura.paleta")}</h3>
        {PALETA_ATELIER.exemplu ? <p className="m3d-pictura-nota">{t("pictura.paletaExemplu")}</p> : null}
        <div className="m3d-pictura-paleta">
          {PALETA_ATELIER.filamente.map((f) => (
            <button key={f.id} type="button" data-testid={`pictura-paleta-${f.id}`} disabled={!f.disponibil}
              className={sloturi[activ] === f.hex.toLowerCase() ? "ales" : ""} style={{ background: f.hex }}
              title={`${f.nume} · ${f.material}${f.disponibil ? "" : ` (${t("pictura.indisponibil")})`}`}
              aria-label={`${f.nume} · ${f.material}${f.disponibil ? "" : ` (${t("pictura.indisponibil")})`}`}
              onClick={() => schimbaCuloare(f.hex)} />
          ))}
        </div>
        <label className="m3d-pictura-camp linie">
          <span>{t("pictura.culoareProprie")}</span>
          <input type="color" value={sloturi[activ] ?? "#808080"} data-testid="pictura-culoare-proprie" onChange={(e) => schimbaCuloare(e.target.value)} />
        </label>
        <SectiuneModele parametri={parametri} culoriModel={culoriModel} sloturi={sloturi} presetareId={presetareId} presetari={PRESETARI}
          modeleleMele={modeleleMele} tinta={tinta} selectate={nrSelectate} progres={progres}
          onParametri={(p) => { setParametri(p); setPresetareId(""); }} onCulori={(c) => { setCuloriModel(c); setPresetareId(""); }} onPresetare={alegePresetare} onTinta={setTinta}
          onAplica={() => void aplicaModel()} onAnuleaza={anuleazaModel}
          onSalveaza={(nume) => setModeleleMele(salveazaModelulMeu({ nume, parametri, culori: culoriModel.slice(0, parametri.culori) }))}
          onSterge={(id) => { setModeleleMele(stergeModelulMeu(id)); setPresetareId(""); }} />
        <SectiuneImagine incarcata={imagine ? { nume: imagine.nume, original: imagine.original, redusa: imagineRedusaUrl, culori: imagineRedusa?.culori ?? [] } : null}
          culori={culoriImagine} culoriMax={Math.max(2, limita)} sursa={sursaImagine} fundal={faraFundal} plasata={!!decal}
          latime={latimeDecal} latimeMax={Math.max(10, Math.round(diag))} rotire={rotireDecal} mutare={mutareDecal}
          onFisier={incarcaImagine} onCulori={setCuloriImagine} onSursa={setSursaImagine} onFundal={setFaraFundal}
          onPlaseaza={() => setUnealta("imagine")} onLatime={setLatimeDecal} onRotire={setRotireDecal} onMutare={setMutareDecal}
          onAplica={aplicaImaginea} onRenunta={renuntaImagine} />
        <SectiuneReducere sloturi={sloturi} ponderi={ponderi} limita={limita} sursa={sursaReducere} fixate={fixate}
          previzualizare={arataPrevizualizare} deschisa={folosite > limita}
          onSursa={setSursaReducere} onFixeaza={(i) => setFixate((f) => { const n = new Set(f); if (n.has(i)) n.delete(i); else n.add(i); return n; })}
          onPrevizualizare={setArataPrevizualizare} onAplica={aplicaReducerea} onUneste={uneste} />
        <SectiuneEstimari estimare={estimare} sistem={sistemAles} />
        <div className="m3d-pictura-export">
          <label className="m3d-pictura-camp">
            <span>{t("pictura.exportPentru")}</span>
            <select value={pentruSlicer} data-testid="pictura-export-slicer" onChange={(e) => setPentruSlicer(e.target.value as "bambu" | "prusa")}>
              <option value="bambu">Bambu Studio / OrcaSlicer</option>
              <option value="prusa">PrusaSlicer</option>
            </select>
          </label>
          <button type="button" className="m3d-pictura-buton principal" data-testid="pictura-export" disabled={exporta} onClick={() => void exportaFisier()}>{t("pictura.export")}</button>
          <p className="m3d-pictura-nota">{t(pentruSlicer === "prusa" ? "pictura.exportNotaPrusa" : "pictura.exportNota")}</p>
          {folosite > limita ? <p className="m3d-pictura-nota m3d-pictura-avertizare">{t("pictura.exportPesteLimita", { n: folosite, m: limita })}</p> : null}
          {faraStoc.length ? (
            <div className="m3d-pictura-stoc" role="note" data-testid="pictura-fara-stoc">
              <p>{t("pictura.faraStoc")}</p>
              <ul>
                {faraStoc.map((x) => (
                  <li key={x.slot}>
                    <span className="m3d-pictura-mostra mica" style={{ background: x.culoare }} /> {t("pictura.slot", { n: x.slot + 1 })} → <span className="m3d-pictura-mostra mica" style={{ background: x.propunere.hex }} /> {x.propunere.nume} · {x.propunere.material}
                  </li>
                ))}
              </ul>
              <button type="button" className="m3d-pictura-buton" data-testid="pictura-foloseste-stocul" onClick={folosesteStocul}>{t("pictura.folosesteStocul")}</button>
            </div>
          ) : null}
          <button type="button" className="m3d-pictura-buton principal" data-testid="pictura-printeaza" disabled={pregatesteOferta} onClick={() => void printeazaLaNoi()}>{t("pictura.printeazaLaNoi")}</button>
          <p className="m3d-pictura-nota">{t("pictura.printeazaNota")}</p>
          <button type="button" className="m3d-pictura-buton" data-testid="pictura-gata" onClick={onGata}>{t("pictura.gata")}</button>
        </div>
      </aside>
    </div>
  );
}
