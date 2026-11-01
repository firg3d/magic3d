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
import { exportaPictura3mfAsync } from "@/magic3d/pictura/pictura3mf";
import { subPensula, topologie, zonaGaleata, type ModGaleata, type ModPensula, type Topologie } from "@/magic3d/pictura/topologie";

export type Unealta = "pensula" | "galeata" | "pipeta" | "radiera";

/** O actiune de pictura: ce triunghiuri, ce culori aveau, ce culoare au primit. */
type Actiune = { corp: number; triunghiuri: Uint32Array; vechi: Uint8Array; nou: number };

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
};

const AVERTISMENT_VAZUT = "magic3d.pictura.avertisment";
const NEUTRU = new THREE.Color("#d9dcd8");

function nrFormat(n: number) {
  return n.toLocaleString("ro-RO");
}

export function ModPictura({ corpuri: intrare, sloturi: sloturiInitiale, titlu, inregistreaza, onGata, onSchimbare, onAnunt }: Props) {
  const onSchimbareRef = useRef(onSchimbare);
  onSchimbareRef.current = onSchimbare;
  const gazda = useRef<HTMLDivElement>(null);
  const corpuri = useMemo(() => intrare.map((c) => ({ ...c, culori: new Uint8Array(c.culori) })), [intrare]);
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
  const stare = useRef({ unealta, modPensula, modGaleata, unghi, marime, activ, sloturi, ascunse });
  stare.current = { unealta, modPensula, modGaleata, unghi, marime, activ, sloturi, ascunse };
  const scena = useRef<{ plase: THREE.Mesh[]; fire: THREE.Mesh[]; inel: THREE.Mesh; randeaza: () => void } | null>(null);
  const actiuneCurenta = useRef<{ corp: number; vechi: Map<number, number>; nou: number } | null>(null);

  /** Culorile unui corp, din indexuri, in bufferul plasei. */
  const coloreaza = useCallback((index: number, triunghiuri?: Iterable<number>) => {
    const s = scena.current;
    if (!s) return;
    const geom = s.plase[index].geometry;
    const atr = geom.getAttribute("color") as THREE.BufferAttribute;
    const arr = atr.array as Float32Array;
    const culori = stare.current.sloturi.map((hex) => new THREE.Color(hex));
    const corp = corpuri[index];
    const scrie = (tri: number) => {
      const slot = corp.culori[tri];
      const c = stare.current.ascunse.has(slot) ? NEUTRU : culori[slot] ?? culori[0];
      for (let k = 0; k < 3; k += 1) { arr[tri * 9 + k * 3] = c.r; arr[tri * 9 + k * 3 + 1] = c.g; arr[tri * 9 + k * 3 + 2] = c.b; }
    };
    if (triunghiuri) for (const tri of triunghiuri) scrie(tri);
    else for (let tri = 0; tri < corp.culori.length; tri += 1) scrie(tri);
    atr.needsUpdate = true;
    s.randeaza();
  }, [corpuri]);

  const aplicaActiune = useCallback((a: Actiune, invers: boolean) => {
    const culori = corpuri[a.corp].culori;
    a.triunghiuri.forEach((tri, i) => { culori[tri] = invers ? a.vechi[i] : a.nou; });
    coloreaza(a.corp, a.triunghiuri);
  }, [coloreaza, corpuri]);

  const anuleaza = useCallback(() => {
    const h = istoricRef.current;
    if (h.index === 0) return;
    aplicaActiune(h.pasi[h.index - 1], true);
    istoricRef.current = { ...h, index: h.index - 1 };
    setIstoric(istoricRef.current);
    onSchimbareRef.current?.();
  }, [aplicaActiune]);
  const reface = useCallback(() => {
    const h = istoricRef.current;
    if (h.index >= h.pasi.length) return;
    aplicaActiune(h.pasi[h.index], false);
    istoricRef.current = { ...h, index: h.index + 1 };
    setIstoric(istoricRef.current);
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
    const triunghiuri = Uint32Array.from(a.vechi.keys());
    const vechi = Uint8Array.from(a.vechi.values());
    const h = istoricRef.current;
    const pasi = [...h.pasi.slice(0, h.index), { corp: a.corp, triunghiuri, vechi, nou: a.nou }].slice(-200);
    istoricRef.current = { pasi, index: pasi.length };
    setIstoric(istoricRef.current);
    onSchimbareRef.current?.();
  }, []);

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
    controale.update();

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

    let picteazaAcum = false;
    const jos = (ev: PointerEvent) => {
      if (ev.button !== 0) return;
      const h = lovitura(ev);
      if (!h) return; // in afara modelului, butonul stang roteste
      controale.enabled = false;
      picteazaAcum = unealtaEfectiva(ev) === "pensula" || unealtaEfectiva(ev) === "radiera";
      renderer.domElement.setPointerCapture(ev.pointerId);
      aplica(ev, h);
    };
    const misca = (ev: PointerEvent) => {
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
  useEffect(() => { corpuri.forEach((_, i) => coloreaza(i)); }, [sloturi, ascunse, corpuri, coloreaza]);
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

  const schimbaCuloare = (hex: string) => setSloturi((s) => s.map((c, i) => (i === activ ? hex.toLowerCase() : c)));
  const adaugaSlot = () => {
    if (sloturi.length >= SLOTURI_MAXIME) return;
    const urmatoarea = PALETA_ATELIER.filamente.find((f) => f.disponibil && !sloturi.includes(f.hex.toLowerCase()))?.hex.toLowerCase() ?? "#808080";
    setSloturi((s) => [...s, urmatoarea]);
    setActiv(sloturi.length);
  };
  const stergeSlot = () => {
    if (sloturi.length <= 1) return;
    const ultim = sloturi.length - 1;
    corpuri.forEach((c, i) => {
      const tri: number[] = [];
      c.culori.forEach((x, k) => { if (x === ultim) tri.push(k); });
      if (tri.length) { picteaza(i, tri, 0); inchideActiune(); }
    });
    setSloturi((s) => s.slice(0, -1));
    setActiv((a) => Math.min(a, ultim - 1));
  };
  const comutaAscuns = (slot: number) => setAscunse((s) => {
    const n = new Set(s);
    if (n.has(slot)) n.delete(slot); else n.add(slot);
    return n;
  });

  const exportaFisier = async () => {
    setExporta(true);
    try {
      const sl = sloturi.map((hex) => {
        const f = filamentAtelier(hex);
        return { culoare: hex, nume: f?.nume, material: f?.material };
      });
      const bytes = await exportaPictura3mfAsync(corpuri, sl, titlu, "bambu");
      const nume = `${(titlu || "pictura").replace(/[\\/:*?"<>|]+/g, "-").trim() || "pictura"}-multicolor.3mf`;
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
        <div className="m3d-pictura-export">
          <button type="button" className="m3d-pictura-buton principal" data-testid="pictura-export" disabled={exporta} onClick={() => void exportaFisier()}>{t("pictura.export")}</button>
          <p className="m3d-pictura-nota">{t("pictura.exportNota")}</p>
          <button type="button" className="m3d-pictura-buton" data-testid="pictura-gata" onClick={onGata}>{t("pictura.gata")}</button>
        </div>
      </aside>
    </div>
  );
}
