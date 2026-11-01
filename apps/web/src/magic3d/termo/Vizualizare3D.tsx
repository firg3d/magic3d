"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TERMO } from "@/magic3d/termo/config";
import type { PiesaVedere, RolVedere } from "@/magic3d/termo/geometrie";

/*
 * Previzualizarea formarii, in panou: cateva corpuri (Z in sus, mm) intr-o scena mica cu lumina si
 * rotire din mouse. Unghiul ales se pastreaza cand piesele se reconstruiesc.
 */

const CULORI: Record<RolVedere, string> = { plasa: TERMO.culoarePlasa, jos: TERMO.culoareJos, sus: TERMO.culoareSus };

export function Vizualizare3D({ piese, testid }: { piese: PiesaVedere<Float32Array>[]; testid: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const vedereSalvata = useRef<{ pozitie: THREE.Vector3; tinta: THREE.Vector3 } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !piese.length) return;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 5000);
    const grup = new THREE.Group();
    const deEliberat: Array<{ dispose(): void }> = [];
    for (const { rol, corp, culoare } of piese) {
      // Z in sus (print) -> Y in sus (three): (x, y, z) -> (x, z, -y).
      const pozitii = new Float32Array(corp.length);
      for (let i = 0; i < corp.length; i += 3) {
        pozitii[i] = corp[i];
        pozitii[i + 1] = corp[i + 2];
        pozitii[i + 2] = -corp[i + 1];
      }
      const geometrie = new THREE.BufferGeometry();
      geometrie.setAttribute("position", new THREE.BufferAttribute(pozitii, 3));
      geometrie.computeVertexNormals();
      const material = new THREE.MeshStandardMaterial({ color: culoare ?? CULORI[rol], roughness: 0.62, metalness: 0.02, side: THREE.DoubleSide, flatShading: true });
      grup.add(new THREE.Mesh(geometrie, material));
      deEliberat.push(geometrie, material);
    }
    scene.add(grup);
    scene.add(new THREE.HemisphereLight("#ffffff", "#b7cadd", 2.0));
    const cheie = new THREE.DirectionalLight("#ffffff", 2.8);
    cheie.position.set(-3, 5, 4);
    scene.add(cheie);
    const umplere = new THREE.DirectionalLight("#cfe6ff", 1.1);
    umplere.position.set(4, 2, -3);
    scene.add(umplere);

    const cutie = new THREE.Box3().setFromObject(grup);
    const centru = cutie.getCenter(new THREE.Vector3());
    const raza = Math.max(1, cutie.getBoundingSphere(new THREE.Sphere()).radius);
    camera.position.set(centru.x + raza * 1.3, centru.y + raza * 1.5, centru.z + raza * 1.9);
    camera.near = raza / 100;
    camera.far = raza * 20;
    const controale = new OrbitControls(camera, canvas);
    controale.target.copy(centru);
    controale.minDistance = raza * 0.6;
    controale.maxDistance = raza * 6;
    if (vedereSalvata.current) {
      camera.position.copy(vedereSalvata.current.pozitie);
      controale.target.copy(vedereSalvata.current.tinta);
    }
    controale.update();

    const deseneaza = () => {
      const latime = Math.max(1, canvas.clientWidth);
      const inaltime = Math.max(1, canvas.clientHeight);
      renderer.setSize(latime, inaltime, false);
      camera.aspect = latime / inaltime;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };
    deseneaza();
    controale.addEventListener("change", deseneaza);
    const observator = new ResizeObserver(deseneaza);
    observator.observe(canvas);
    return () => {
      vedereSalvata.current = { pozitie: camera.position.clone(), tinta: controale.target.clone() };
      controale.dispose();
      observator.disconnect();
      deEliberat.forEach((x) => x.dispose());
      renderer.dispose();
    };
  }, [piese]);

  return <canvas ref={canvasRef} className="termo-vizualizare" data-testid={testid} />;
}
