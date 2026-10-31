/**
 * NUCLEU — viewport three.js. Obiecte generice (id, geometrie, culoare, movable).
 * Manipulare DIRECTĂ stil Tinkercad: click = selecție, tragere pe obiect = mutare 1:1
 * în planul feței (Z blocat), tragere în gol = rotire cameră, Shift = o axă.
 * Fără gizmo cu săgeți.
 */
import * as THREE from 'three';
import { temperaturaLaCuloare, type ScenaFoto } from '../config/scena-foto.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/** Expunerea camerei virtuale. Singurul numar de reglat daca scena pare prea intunecata
 *  sau prea spalata; restul intensitatilor sunt echilibrate in jurul lui. */
const EXPUNERE = 1.05;

/** opțiunile modului prezentare (fotografii de produs) */
export interface PrezentareOptiuni {
  fundal: 'alb' | 'transparent' | 'culoare';
  culoare: string;              // folosită doar când fundal = 'culoare'
  straturiIntensitate: number;  // 0 = suprafață netedă, 1 = straturi pronunțate
  grosimeStrat: number;         // mm, valorile reale de print: 0.08…0.28
}

interface Obj {
  mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial; movable: boolean;
  /** corpuri randate separat, copii ai mesh-ului principal (postament multicolor) */
  parti: { mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial }[];
}

export class Viewer {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private persp: THREE.PerspectiveCamera;
  private ortho: THREE.OrthographicCamera;
  private active: THREE.Camera;
  private orbit: OrbitControls;
  private container: HTMLElement;
  private objects = new Map<string, Obj>();
  private selectedId: string | null = null;
  private target = new THREE.Vector3();

  private ray = new THREE.Raycaster();
  private dragging: string | null = null;
  private dragPlane = new THREE.Plane();
  private dragStart = new THREE.Vector3();
  private dragStartPos = new THREE.Vector3();
  private moved = false;
  private guideX: THREE.Line; private guideY: THREE.Line;

  // manipulare pe mâner: mod + gest curent
  private mode: 'move' | 'rotate' | 'scale' | 'depth' = 'move';
  private handles = new THREE.Group();
  private plate = new THREE.Group();      // placa de print (podea) + grilă mm
  // --- mod prezentare (fotografii de produs) ---
  private prez = false;
  private prezOpt: PrezentareOptiuni = { fundal: 'alb', culoare: '#ffffff', straturiIntensitate: 0.3, grosimeStrat: 0.2 };
  private prezGrup = new THREE.Group();   // lumini de studio + captatorul de umbră
  private prezSalvat: { fundal: THREE.Scene['background']; placa: boolean; manere: boolean; gx: boolean; gy: boolean; luminiVechi: boolean } | null = null;
  private luminiScena: THREE.Light[] = [];
  // --- scenă de fundal (fotografie de interior) ---
  private scenaFoto: ScenaFoto | null = null;
  private texturaFundal: THREE.Texture | null = null;
  private grupScena = new THREE.Group();
  private incadrare = { offsetX: 0, offsetY: 0, zoom: 1 };
  private fovInainteDeScena: number | null = null;
  private plateW = 256; private plateD = 256;
  private gesture: 'move' | 'rotate' | 'scale' | 'depth' | null = null;
  private pivot = new THREE.Vector3();
  private startAngle = 0; private startDist = 1; private startZ = 0; private curDz = 0;
  private curRotDeg = 0; private curScale = 1;
  private rotAxis: 'x' | 'y' | 'z' = 'z';
  private groundMove = false; // obiectul selectat se mută pe planul orizontal (ex. litera pe bază)
  // axele pe care obiectul selectat poate fi rotit; null = toate trei. Un inel oferit pe o axă
  // pe care aplicația nu o salvează face obiectul să sară înapoi la eliberare.
  private rotAxes: ('x' | 'y' | 'z')[] | null = null;
  // Unghiul (grade, în jurul verticalei) al planului de lucru pentru obiectele care trăiesc pe
  // fața literei. Când litera e rotită pe bază, fața ei nu mai e paralelă cu planul XY al lumii:
  // fără asta, tragerea „la dreapta" mută piesa în diagonală sau chiar perpendicular.
  private planRot = 0;
  // RIGLĂ: două puncte fixate pe suprafață, cu prindere pe vârful cel mai apropiat.
  private masurare = false;
  private puncteMasura: THREE.Vector3[] = [];
  private grupMasura = new THREE.Group();
  private masuraDown: [number, number] | null = null;
  private etichetaMasura!: HTMLElement;
  /** anunță aplicația când s-a fixat/șters un punct (null = mai puțin de două puncte) */
  onMasura?: (r: { d: number; dx: number; dy: number; dz: number } | null) => void;
  private axisVec = new THREE.Vector3(0, 0, 1); private axisU = new THREE.Vector3(1, 0, 0); private axisV = new THREE.Vector3(0, 1, 0);
  private angleLabel!: HTMLElement;
  private hoveredKey: string | null = null;
  private gizmoRoot: THREE.Group | null = null;   // gizmo normalizat (rază 1), scalat per frame
  private gizmoParts: THREE.Object3D[] = [];      // piese interactive (pt. hover + raycast)
  private gizmoPx = 130;                          // „raza" gizmo-ului, în pixeli de ecran (axe lungi, ușor de apucat)
  // --- translație pe axă (gizmo cu săgeți) ---
  private moveAxis: 'x' | 'y' | 'z' | null = null;   // null = liber în plan (pătratul central)
  private axisOrigin = new THREE.Vector3(); private axisDir = new THREE.Vector3(1, 0, 0);
  private axisT0 = 0;
  private peers: THREE.Mesh[] = [];                  // obiecte care se mișcă solidar (previzualizate la fel)
  private curA = 0; private curB = 0; private curC = 0; // deplasarea FINALĂ (preview == rezultat, fără recalcul)
  private activePointer: number | null = null;          // gest legat de UN pointer; restul se ignoră

  onSelect: ((id: string | null) => void) | null = null;
  onDrag: ((id: string, x: number, y: number) => void) | null = null;
  onDragEnd: ((id: string, dx: number, dy: number, dz?: number) => void) | null = null;
  onRotateEnd: ((id: string, deltaDeg: number, axis: 'x' | 'y' | 'z') => void) | null = null;
  onRotateStart: ((id: string, axis: 'x' | 'y' | 'z') => void) | null = null;
  onMoveStart: ((id: string) => void) | null = null;
  onMoveLive: ((id: string, dx: number, dy: number, dz?: number) => void) | null = null;
  /** limitare din aplicație (ex. litera nu iese de pe bază); preview-ul o respectă. */
  onClampMove: ((id: string, dx: number, dy: number) => { dx: number; dy: number; warn?: string }) | null = null;
  /** obiectele care se mișcă solidar cu cel tras (previzualizate identic). */
  getPeers: ((id: string) => string[]) | null = null;
  onRotateLive: ((id: string, deltaDeg: number, axis: 'x' | 'y' | 'z') => void) | null = null;
  onScaleEnd: ((id: string, factor: number) => void) | null = null;
  onDepthEnd: ((id: string, dzWorld: number) => void) | null = null;
  /** harta de mediu (IBL), generata o data din RoomEnvironment */
  mediu: THREE.Texture | null = null;
  /** click-dreapta FARA tragere, peste un obiect (id) sau in gol (null) */
  onContext: ((id: string | null, x: number, y: number) => void) | null = null;
  private dreaptaDown: [number, number] | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    const w = container.clientWidth || 800, h = container.clientHeight || 600;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.renderer.setClearColor(0xeef1f5, 1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Tone mapping: fara el, cele patru lumini insumeaza ~3.0 si zonele luminate se taie in
    // alb pur — suprafata isi pierde forma exact acolo unde ar trebui sa se vada cel mai bine.
    // „Neutral" e facut pentru vizualizare de produs: comprima varfurile fara sa spele culoarea,
    // spre deosebire de ACES, care trage vizibil spre portocaliu culorile saturate.
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = EXPUNERE;
    container.appendChild(this.renderer.domElement);

    this.persp = new THREE.PerspectiveCamera(45, w / h, 0.1, 8000);
    this.persp.position.set(120, 120, 240);
    this.ortho = new THREE.OrthographicCamera(-160, 160, 160 * h / w, -160 * h / w, -8000, 8000);
    this.ortho.position.set(0, 60, 400);
    this.active = this.persp; // implicit izometric perspectivă (se vede placa + scara)
    // OrbitControls trebuie să conducă camera ACTIVĂ (altfel rotația mișcă o cameră nerandată)
    this.orbit = new OrbitControls(this.active, this.renderer.domElement);
    this.orbit.enableDamping = true;
    this.orbit.enableRotate = true; this.orbit.enablePan = true; this.orbit.enableZoom = true;
    this.orbit.minPolarAngle = THREE.MathUtils.degToRad(5);   // aproape complet, fără să treacă prin podea
    this.orbit.maxPolarAngle = THREE.MathUtils.degToRad(175);
    // azimut liber 360°; pan cu mijloc/dreapta, zoom cu scroll; Shift+stânga = pan (mai jos)
    this.orbit.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.PAN };

    this.scene.background = new THREE.Color(0xeef1f5);
    // MEDIU (IBL) — cea mai mare diferenta vizuala dintre toate. Un MeshStandardMaterial fara
    // `scene.environment` nu are NICIO reflexie in afara luminilor directe: suprafetele curbe
    // ies plate, ca plastilina. Harta de mediu da gradientul care descrie forma. Fundalul
    // ramane culoarea plata — folosim camera doar ca sursa de lumina, nu ca decor.
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    pmrem.compileEquirectangularShader();
    this.mediu = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.mediu;
    this.scene.environmentIntensity = 0.55;
    pmrem.dispose();
    // Luminile directe scad: mediul duce acum baza. Pastrate pentru umbra si pentru
    // directionalitate (fara ele, piesa n-ar avea o sursa clara si ar arata „spalata").
    const hemi = new THREE.HemisphereLight(0xffffff, 0xd8dde5, 0.22);
    this.scene.add(hemi); this.luminiScena.push(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 1.05); key.position.set(120, 260, 180);
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
    const sc = key.shadow.camera as THREE.OrthographicCamera;
    sc.left = -260; sc.right = 260; sc.top = 260; sc.bottom = -260; sc.near = 1; sc.far = 900;
    key.shadow.bias = -0.0006; key.shadow.normalBias = 0.5;
    this.scene.add(key); this.luminiScena.push(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.28); fill.position.set(-140, 40, 60); this.scene.add(fill); this.luminiScena.push(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 0.22); rim.position.set(0, -60, -160); this.scene.add(rim); this.luminiScena.push(rim);
    this.scene.add(this.prezGrup); this.prezGrup.visible = false;
    this.scene.add(this.grupScena); this.grupScena.visible = false;

    this.scene.add(this.plate);
    this.buildPlate();

    const gmat = new THREE.LineBasicMaterial({ color: 0x1a8cff, transparent: true, opacity: 0.6 });
    this.guideX = new THREE.Line(new THREE.BufferGeometry(), gmat);
    this.guideY = new THREE.Line(new THREE.BufferGeometry(), gmat.clone());
    this.guideX.visible = this.guideY.visible = false; this.scene.add(this.guideX, this.guideY);
    this.scene.add(this.handles);
    this.scene.add(this.grupMasura);   // urmele riglei, desenate peste model

    this.renderer.domElement.addEventListener('pointerdown', (e) => this.onPointerDown(e), true);
    this.renderer.domElement.addEventListener('pointermove', (e) => this.onPointerMove(e));
    window.addEventListener('pointerup', (e) => this.onPointerUp(e as PointerEvent));
    window.addEventListener('pointercancel', (e) => this.onPointerUp(e as PointerEvent));
    // Meniul propriu al browserului nu apare niciodata peste viewport.
    this.renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
    // Click-dreapta = meniu DOAR daca nu s-a tras (acelasi prag de 3 px ca la rigla):
    // altfel fiecare pan s-ar termina cu un meniu in fata.
    window.addEventListener('pointerup', (e) => {
      const p = this.dreaptaDown; this.dreaptaDown = null;
      if (!p || (e as PointerEvent).button !== 2 || !this.onContext) return;
      const ev = e as PointerEvent;
      if (Math.hypot(ev.clientX - p[0], ev.clientY - p[1]) >= 3) return;
      if (ev.target !== this.renderer.domElement) return;
      this.ray.setFromCamera(this.ndc(ev), this.active as any);
      const tinte = [...this.objects.values()].filter((o) => o.mesh.visible).map((o) => o.mesh);
      const hit = this.ray.intersectObjects(tinte, false)[0];
      const id = hit ? ([...this.objects.entries()].find(([, o]) => o.mesh === hit.object)?.[0] ?? null) : null;
      this.onContext(id, ev.clientX, ev.clientY);
    });
    this.angleLabel = document.createElement('div'); this.angleLabel.className = 'angle-label'; this.angleLabel.style.display = 'none';
    container.appendChild(this.angleLabel);
    this.etichetaMasura = document.createElement('div'); this.etichetaMasura.className = 'masura-label';
    this.etichetaMasura.style.display = 'none';
    container.appendChild(this.etichetaMasura);
    new ResizeObserver(() => this.onResize()).observe(container);
    this.animate();
  }

  /** placa de print: 256×256 mm implicit, grilă mm (10 fine / 50 vizibile), origine, muchii rotunjite, mată. */
  setPlate(w: number, d: number) { this.plateW = w; this.plateD = d; this.buildPlate(); }
  get plateSize() { return { w: this.plateW, d: this.plateD }; }
  /** extinderea XZ a conținutului vizibil (pt. avertisment „depășește placa"). */
  contentBounds(): THREE.Box3 {
    const box = new THREE.Box3();
    for (const o of this.objects.values()) if (o.mesh.visible) box.expandByObject(o.mesh);
    return box;
  }
  private roundedRectShape(w: number, d: number, r: number): THREE.Shape {
    const hw = w / 2, hd = d / 2; const s = new THREE.Shape();
    s.moveTo(-hw + r, -hd);
    s.lineTo(hw - r, -hd); s.quadraticCurveTo(hw, -hd, hw, -hd + r);
    s.lineTo(hw, hd - r); s.quadraticCurveTo(hw, hd, hw - r, hd);
    s.lineTo(-hw + r, hd); s.quadraticCurveTo(-hw, hd, -hw, hd - r);
    s.lineTo(-hw, -hd + r); s.quadraticCurveTo(-hw, -hd, -hw + r, -hd);
    return s;
  }
  private buildPlate() {
    for (const c of [...this.plate.children]) { this.plate.remove(c); (c as any).geometry?.dispose?.(); (c as any).material?.dispose?.(); }
    const w = this.plateW, d = this.plateD, hw = w / 2, hd = d / 2;
    const shape = this.roundedRectShape(w, d, 8);
    // corp cu grosime (muchii vizibile), mat, luminos
    const bodyGeo = new THREE.ExtrudeGeometry(shape, { depth: 4, bevelEnabled: false }); bodyGeo.rotateX(Math.PI / 2);
    const body = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({ color: 0xe9edf3, roughness: 0.96, metalness: 0, transparent: true, opacity: 0.5, depthWrite: false }));
    body.position.y = -0.05; body.receiveShadow = true; this.plate.add(body);
    // grilă mm, aliniată la origine (0)
    const fine: number[] = [], bold: number[] = [], yT = 0.06;
    const nx = Math.floor(hw / 10), nz = Math.floor(hd / 10);
    for (let k = -nx; k <= nx; k++) { const x = k * 10; (k % 5 === 0 ? bold : fine).push(x, yT, -hd, x, yT, hd); }
    for (let k = -nz; k <= nz; k++) { const z = k * 10; (k % 5 === 0 ? bold : fine).push(-hw, yT, z, hw, yT, z); }
    const lines = (arr: number[], color: number, op: number) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity: op })); };
    this.plate.add(lines(fine, 0xc4ccd6, 0.45), lines(bold, 0x9aa6b8, 0.8));
    // muchie plăcii (contur rotunjit)
    const pts = shape.getPoints(48).map((p) => new THREE.Vector3(p.x, yT, p.y));
    this.plate.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x8a95a8 })));
    // marcaj origine (cruce violet discretă)
    this.plate.add(lines([-7, 0.1, 0, 7, 0.1, 0, 0, 0.1, -7, 0, 0.1, 7], 0x5b4dd1, 0.9));
  }

  private ndc(e: PointerEvent): THREE.Vector2 {
    const r = this.renderer.domElement.getBoundingClientRect();
    return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  }
  private onPointerDown(e: PointerEvent) {
    // BUTONUL DREPT nu selecteaza si nu transforma NIMIC. Tras, e pan-ul din OrbitControls,
    // care e util si ramane; apasat scurt, deschide meniul contextual (vezi onPointerUp).
    // Fara garda asta, click-dreapta peste un obiect intra in startTransform si il MUTA in
    // loc sa roteasca vederea — se vedea ca o saritura a piesei la fiecare pan inceput pe ea.
    if (e.button === 2) { this.dreaptaDown = [e.clientX, e.clientY]; return; }
    this.ray.setFromCamera(this.ndc(e), this.active as any);
    // RIGLA: nu confiscă gestul. Se reține doar unde s-a apăsat; punctul se fixează la
    // ridicare, DACĂ nu s-a tras. Așa rotirea camerei rămâne funcțională tot timpul, iar
    // închiderea uneltei nu mai poate lăsa viewport-ul blocat.
    if (this.masurare && e.button === 0) { this.masuraDown = [e.clientX, e.clientY]; return; }
    // 1) mânerele au prioritate (inel de rotație / colțuri de scalare)
    if (this.selectedId) {
      // matricele mânerelor pot fi „vechi" dacă gizmo-ul tocmai a fost reconstruit și nu s-a
      // randat încă un frame (ex. click imediat după selecție) -> altfel raycast-ul ratează.
      this.updateGizmoScale(); this.handles.updateMatrixWorld(true);
      const hh = this.ray.intersectObjects(this.gizmoParts, false).find((h) => (h.object as any).userData?.handle);
      if (hh) { this.startTransform((hh.object as any).userData.handle, e, (hh.object as any).userData.axis); return; }
    }
    // 2) corp mutabil
    const movables = [...this.objects.values()].filter((o) => o.movable && o.mesh.visible).map((o) => o.mesh);
    const hit = this.ray.intersectObjects(movables, false)[0];
    if (hit) {
      const id = [...this.objects.entries()].find(([, o]) => o.mesh === hit.object)![0];
      this.select(id); this.onSelect?.(id);
      this.startTransform(e.altKey ? 'rotate' : this.mode, e);
    } else {
      // tragere în gol -> orbit (rotire), sau pan cu Shift+stânga
      (this.orbit.mouseButtons as any).LEFT = e.shiftKey ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
      this.select(null); this.onSelect?.(null);
    }
  }
  /** pornește un gest (mută/rotește/scalează/adâncime) în jurul centrului obiectului selectat */
  private startTransform(kind: 'move' | 'rotate' | 'scale' | 'depth', e: PointerEvent, axis?: 'x' | 'y' | 'z') {
    const id = this.selectedId; if (!id) return;
    const o = this.objects.get(id); if (!o) return;
    // gestul aparține ACESTUI pointer; evenimentele altui pointer sunt ignorate
    this.activePointer = e.pointerId;
    try { this.renderer.domElement.setPointerCapture(e.pointerId); } catch { /* sintetic/neacceptat */ }
    this.orbit.enabled = false; this.gesture = kind; this.dragging = id; this.moved = false;
    o.mesh.geometry.computeBoundingBox(); const bb = o.mesh.geometry.boundingBox!;
    this.pivot.set((bb.min.x + bb.max.x) / 2 + o.mesh.position.x, (bb.min.y + bb.max.y) / 2 + o.mesh.position.y, (bb.min.z + bb.max.z) / 2);
    if (kind === 'rotate') {
      // axa inelului apucat (Alt+trage fără inel -> Z). Planul de lucru = perpendicular pe axă.
      // Dacă obiectul nu acceptă axa cerută, cade pe prima permisă — altfel Alt+trage ar produce
      // o rotație pe care aplicația o aruncă, iar obiectul ar sări înapoi la eliberare.
      let ax = axis ?? 'z';
      if (this.rotAxes && !this.rotAxes.includes(ax)) ax = this.rotAxes[0];
      this.rotAxis = ax;
      if (this.rotAxis === 'x') { this.axisVec.set(1, 0, 0); this.axisU.set(0, 1, 0); this.axisV.set(0, 0, 1); }
      else if (this.rotAxis === 'y') { this.axisVec.set(0, 1, 0); this.axisU.set(0, 0, 1); this.axisV.set(1, 0, 0); }
      else { this.axisVec.set(0, 0, 1); this.axisU.set(1, 0, 0); this.axisV.set(0, 1, 0); }
      this.dragPlane.setFromNormalAndCoplanarPoint(this.axisVec, this.pivot);
    } else if (kind === 'depth') {
      const n = new THREE.Vector3().subVectors(this.active.position, this.pivot); n.z = 0;
      if (n.lengthSq() < 1e-6) n.set(0, 1, 0);
      this.dragPlane.setFromNormalAndCoplanarPoint(n.normalize(), this.pivot);
    } else if (kind === 'move' && this.groundMove) {
      this.dragPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), this.pivot); // plan orizontal
    } else {
      this.dragPlane.setFromNormalAndCoplanarPoint(this.normalaFata(), this.pivot);
    }
    if (kind === 'move') {
      // obiectele care urmează (copiii): previzualizate identic, ca nimic să nu „sară" la eliberare
      this.peers = (this.getPeers?.(id) ?? []).map((pid) => this.objects.get(pid)?.mesh).filter(Boolean) as THREE.Mesh[];
      this.moveAxis = (axis as any) ?? null;
      this.curA = this.curB = 0;
      this.dragStartPos.copy(o.mesh.position);
      if (this.moveAxis) {
        this.axisOrigin.copy(this.pivot);
        // axa săgeții, în lume: X și Z urmează fața literei, Y rămâne verticala
        if (this.moveAxis === 'y') this.axisDir.set(0, 1, 0);
        else if (this.moveAxis === 'x') this.axisDir.copy(this.axaFataX());
        else this.axisDir.copy(this.normalaFata());
        this.axisT0 = this.rayAxisT(e);
      } else {
        const p0 = new THREE.Vector3(); this.ray.setFromCamera(this.ndc(e), this.active as any);
        if (!this.ray.ray.intersectPlane(this.dragPlane, p0)) return;
        this.dragStart.copy(p0);
      }
      this.onMoveStart?.(id);
      return;
    }
    const p = new THREE.Vector3(); this.ray.setFromCamera(this.ndc(e), this.active as any);
    if (!this.ray.ray.intersectPlane(this.dragPlane, p)) return;
    else if (kind === 'rotate') { const d = new THREE.Vector3().subVectors(p, this.pivot); this.startAngle = Math.atan2(d.dot(this.axisV), d.dot(this.axisU)); this.curRotDeg = 0; this.onRotateStart?.(id, this.rotAxis); }
    else if (kind === 'depth') { this.startZ = p.z; this.curDz = 0; }
    else { this.startDist = Math.max(1e-3, Math.hypot(p.x - this.pivot.x, p.y - this.pivot.y)); this.curScale = 1; }
  }
  /** parametrul t al punctului de pe axa de translație cel mai apropiat de raza cursorului */
  private rayAxisT(e: PointerEvent): number {
    this.ray.setFromCamera(this.ndc(e), this.active as any);
    const R0 = this.ray.ray.origin, E = this.ray.ray.direction, D = this.axisDir;
    const w0 = new THREE.Vector3().subVectors(this.axisOrigin, R0);
    const a = D.dot(D), b = D.dot(E), c = E.dot(E), d = D.dot(w0), ee = E.dot(w0);
    const den = a * c - b * b;
    if (Math.abs(den) < 1e-9) return this.axisT0;      // axa ~paralelă cu raza: nu mișcăm
    return (b * ee - c * d) / den;
  }
  private onPointerMove(e: PointerEvent) {
    if (!this.gesture || !this.dragging) { this.hoverRings(e); return; }
    if (this.activePointer !== null && e.pointerId !== this.activePointer) return;  // alt pointer: ignorat
    const m = this.objects.get(this.dragging)!.mesh;
    if (this.gesture === 'move') { this.moveDrag(e, m); return; }
    this.ray.setFromCamera(this.ndc(e), this.active as any);
    const p = new THREE.Vector3();
    if (!this.ray.ray.intersectPlane(this.dragPlane, p)) return;
    if (this.gesture === 'rotate') {
      const d = new THREE.Vector3().subVectors(p, this.pivot);
      let deg = (Math.atan2(d.dot(this.axisV), d.dot(this.axisU)) - this.startAngle) * 180 / Math.PI;
      if (e.shiftKey) deg = Math.round(deg / 15) * 15;              // snap 15°
      this.curRotDeg = deg;
      this.previewMatrix(m, new THREE.Matrix4().makeRotationAxis(this.axisVec, deg * Math.PI / 180));
      if (Math.abs(deg) > 0.4) this.moved = true;
      this.showAngle(e, deg);
      this.onRotateLive?.(this.dragging, deg, this.rotAxis);
    } else if (this.gesture === 'depth') {
      let dz = p.z - this.startZ;
      if (e.shiftKey) dz = Math.round(dz / 0.5) * 0.5;             // snap 0.5 mm
      this.curDz = dz;
      m.position.set(0, 0, dz);                                    // previzualizare pe axa de adâncime
      if (Math.abs(dz) > 0.05) this.moved = true;
    } else {
      let f = Math.hypot(p.x - this.pivot.x, p.y - this.pivot.y) / this.startDist;
      f = Math.max(0.1, f); if (e.shiftKey) f = Math.round(f * 20) / 20;   // snap 5%
      this.curScale = f;
      this.previewMatrix(m, new THREE.Matrix4().makeScale(f, f, f));
      if (Math.abs(f - 1) > 0.004) this.moved = true;
    }
  }
  /**
   * Translația. Pe săgeată: proiecție rază->axă (robust, independent de divergența planului).
   * În pătratul central: rază∩plan. Shift = pas de 1 mm. Limitarea din aplicație e aplicată
   * ÎNAINTE de preview, deci ce vezi = ce se trimite la eliberare (fără salt).
   */
  private moveDrag(e: PointerEvent, m: THREE.Mesh) {
    const horiz = this.groundMove;              // planul de lucru: XZ (pe bază) sau XY (fața literei)
    let dx = 0, dy = 0, dz = 0;
    if (this.moveAxis) {
      const d = this.rayAxisT(e) - this.axisT0;
      if (this.moveAxis === 'x') dx = d; else if (this.moveAxis === 'y') dy = d; else dz = d;
    } else {
      this.ray.setFromCamera(this.ndc(e), this.active as any);
      const p = new THREE.Vector3();
      if (!this.ray.ray.intersectPlane(this.dragPlane, p)) return;
      if (horiz) { dx = p.x - this.dragStart.x; dz = p.z - this.dragStart.z; }
      else {
        // proiecție pe axele planului feței, nu pe X/Y ale lumii
        const d = new THREE.Vector3().subVectors(p, this.dragStart);
        dx = d.dot(this.axaFataX());
        dy = d.y;
      }
    }
    const snap = (v: number) => (e.shiftKey ? Math.round(v) : v);       // Shift => 1 mm
    dx = snap(dx); dy = snap(dy); dz = snap(dz);
    // În modul „mută" TOATE cele trei săgeți translatează. Adâncimea are modul ei propriu —
    // nu mai comutăm pe alt sistem de gest (asta producea „alunecarea" de după eliberare).
    // (a, b) = axele din planul de lucru, c = axa perpendiculară.
    let a = dx, b = horiz ? dz : dy, c = horiz ? dy : dz;
    let warn: string | undefined;
    if (this.onClampMove) { const r = this.onClampMove(this.dragging!, a, b); a = r.dx; b = r.dy; warn = r.warn; }
    this.curA = a; this.curB = b; this.curC = c;
    const off = horiz ? new THREE.Vector3(a, c, b) : new THREE.Vector3(a, b, c);
    m.position.set(this.dragStartPos.x + off.x, this.dragStartPos.y + off.y, this.dragStartPos.z + off.z);
    for (const pm of this.peers) pm.position.set(off.x, off.y, off.z);   // copiii urmează IDENTIC
    if (Math.hypot(a, b, c) > 0.05) this.moved = true;
    if (!horiz) this.updateGuides(m);
    const ax = this.moveAxis ? this.moveAxis.toUpperCase() + ': ' : '';
    const val = this.moveAxis ? (this.moveAxis === 'x' ? a : this.moveAxis === (horiz ? 'z' : 'y') ? b : c).toFixed(1) : `${a.toFixed(1)}, ${b.toFixed(1)}`;
    this.showHint(e, `${ax}${val} mm${warn ? '  ⚠ ' + warn : ''}`);
    this.onMoveLive?.(this.dragging!, a, b, c);
    this.onDrag?.(this.dragging!, a, b);
  }
  private onPointerUp(e?: PointerEvent) {
    if (this.masurare && this.masuraDown && e) {
      const [x, y] = this.masuraDown; this.masuraDown = null;
      if (Math.hypot(e.clientX - x, e.clientY - y) < 3) {     // click, nu tragere de cameră
        this.ray.setFromCamera(this.ndc(e), this.active as any);
        this.fixeazaPunct(e);
      }
    }
    if (e && this.activePointer !== null && e.pointerId !== this.activePointer) return;   // alt pointer
    if (e) { try { this.renderer.domElement.releasePointerCapture(e.pointerId); } catch { /* ignoră */ } }
    this.activePointer = null;
    this.guideX.visible = this.guideY.visible = false; this.angleLabel.style.display = 'none';
    if (!this.gesture || !this.dragging) { this.dragging = null; this.gesture = null; return; }
    // gestul se ÎNCHIDE înainte de a aplica: orice event rezidual de după nu mai are efect
    const id = this.dragging, g = this.gesture; this.dragging = null; this.gesture = null; this.orbit.enabled = true;
    const m = this.objects.get(id)!.mesh;
    if (g === 'move') {
      // EXACT valoarea din ultimul pointermove (deja limitată), O SINGURĂ dată, printr-un
      // SINGUR callback — fără recalcul din raycast și fără al doilea sistem de gest.
      const a = this.curA, b = this.curB, c = this.curC;
      for (const pm of this.peers) this.resetMesh(pm);
      this.peers = []; this.moveAxis = null;
      if (this.moved && (a || b || c)) this.onDragEnd?.(id, a, b, c); else this.resetMesh(m);
    }
    else if (g === 'rotate') { if (this.moved && Math.abs(this.curRotDeg) > 0.5 && this.onRotateEnd) this.onRotateEnd(id, this.curRotDeg, this.rotAxis); else this.resetMesh(m); }
    else if (g === 'depth') { if (this.moved && Math.abs(this.curDz) > 0.05 && this.onDepthEnd) this.onDepthEnd(id, this.curDz); else this.resetMesh(m); }
    else { if (this.moved && Math.abs(this.curScale - 1) > 0.005 && this.onScaleEnd) this.onScaleEnd(id, this.curScale); else this.resetMesh(m); }
  }
  /** evidențiază mânerul de sub cursor (inel de rotație / săgeată de translație). */
  private hoverRings(e: PointerEvent) {
    if (!this.selectedId || !this.gizmoParts.length) { this.hoveredKey = null; return; }
    this.ray.setFromCamera(this.ndc(e), this.active as any);
    this.updateGizmoScale(); this.handles.updateMatrixWorld(true);
    const hit = this.ray.intersectObjects(this.gizmoParts, false).find((h) => (h.object as any).userData?.handle);
    const key = hit ? ((hit.object as any).userData.axis ?? 'liber') : null;
    if (key === this.hoveredKey) return;
    this.hoveredKey = key;
    // sub cursor: piesele axei devin opace, iar inelul primește torul subțire de „îngroșare"
    for (const c of this.gizmoParts as any[]) {
      const ud = c.userData ?? {}; const on = key !== null && (ud.axis ?? 'liber') === key;
      if (ud.emph) { c.visible = on; continue; }                       // torul de hover
      const mat = c.material as THREE.Material & { opacity: number; visible: boolean };
      if (mat && mat.visible) mat.opacity = on ? 1 : (ud.baseOpacity ?? 0.85);
    }
  }
  /** etichetă lângă cursor în timpul unui gest (unghi / deplasare). */
  private showHint(e: PointerEvent, text: string) {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.angleLabel.textContent = text;
    this.angleLabel.style.left = (e.clientX - r.left + 14) + 'px';
    this.angleLabel.style.top = (e.clientY - r.top + 12) + 'px';
    this.angleLabel.style.display = 'block';
  }
  private showAngle(e: PointerEvent, deg: number) { this.showHint(e, `${this.rotAxis.toUpperCase()}: ${deg.toFixed(0)}°`); }
  /** transformare de PREVIZUALIZARE în jurul pivotului (fără să atingă geometria) */
  private previewMatrix(mesh: THREE.Mesh, mat: THREE.Matrix4) {
    const T = new THREE.Matrix4().makeTranslation(this.pivot.x, this.pivot.y, this.pivot.z);
    const Ti = new THREE.Matrix4().makeTranslation(-this.pivot.x, -this.pivot.y, -this.pivot.z);
    mesh.matrixAutoUpdate = false; mesh.matrix.copy(T.multiply(mat).multiply(Ti));
  }
  private resetMesh(mesh: THREE.Mesh) {
    mesh.matrixAutoUpdate = true; mesh.position.set(0, 0, 0); mesh.rotation.set(0, 0, 0); mesh.scale.set(1, 1, 1); mesh.updateMatrix();
  }
  /** obiectul selectat se mută pe planul orizontal (litera pe bază) în loc de planul feței. */
  setGroundMove(v: boolean) {
    if (this.groundMove === v) return;
    this.groundMove = v;
    // gizmo-ul depinde de flag (pe bază dispare axa verticală), iar `select()` îl construiește
    // ÎNAINTE ca shell-ul să apuce să seteze flagul — deci trebuie reconstruit aici.
    this.refreshHandles();
  }
  /** axele de rotație permise pentru selecția curentă; null = toate trei. */
  /** unghiul planului de lucru al feței (grade, în jurul verticalei); 0 = paralel cu XY. */
  setPlanRot(deg: number) {
    const v = Number.isFinite(deg) ? deg : 0;
    if (Math.abs(this.planRot - v) < 1e-6) return;
    this.planRot = v;
    this.refreshHandles();   // gizmo-ul trebuie să arate axele literei, nu ale lumii
  }
  /** normala feței literei, rotită cu `planRot` în jurul verticalei */
  private normalaFata() {
    const t = this.planRot * Math.PI / 180;
    return new THREE.Vector3(Math.sin(t), 0, Math.cos(t));
  }
  /** axa X locală a feței literei, exprimată în lume */
  private axaFataX() {
    const t = this.planRot * Math.PI / 180;
    return new THREE.Vector3(Math.cos(t), 0, -Math.sin(t));
  }
  setRotAxes(a: ('x' | 'y' | 'z')[] | null) {
    const acum = this.rotAxes ? this.rotAxes.join('') : '';
    const nou = a ? a.join('') : '';
    if (acum === nou) return;
    this.rotAxes = a && a.length ? a.slice() : null;
    this.refreshHandles();   // ca la setGroundMove: shell-ul setează flagul DUPĂ select()
  }
  /** mod de manipulare pentru obiectul selectat */
  setMode(m: 'move' | 'rotate' | 'scale' | 'depth') { this.mode = m; this.refreshHandles(); }
  get transformMode() { return this.mode; }
  /**
   * (re)construiește gizmo-ul pentru selecția curentă.
   * Desen SUBȚIRE (linii de 1px, inele semi-transparente) ca modelul să rămână vizibil;
   * zonele de prindere sunt corpuri INVIZIBILE, groase. Geometria e în unități NORMALIZATE
   * (rază 1) într-un grup scalat la fiecare frame -> gizmo-ul pare constant pe ecran la orice zoom.
   */
  private refreshHandles() {
    const dispose = (o: THREE.Object3D) => o.traverse((c: any) => { c.geometry?.dispose?.(); c.material?.dispose?.(); });
    dispose(this.handles); this.handles.clear();
    this.gizmoRoot = null; this.gizmoParts = [];
    this.hoveredKey = null;   // piesele sunt noi (fără evidențiere) — altfel hover-ul următor e ignorat
    const id = this.selectedId; if (!id) return;
    const o = this.objects.get(id); if (!o || !o.movable || !o.mesh.visible) return;
    o.mesh.geometry.computeBoundingBox(); const bb = o.mesh.geometry.boundingBox!;
    const cx = (bb.min.x + bb.max.x) / 2, cy = (bb.min.y + bb.max.y) / 2, cz = (bb.min.z + bb.max.z) / 2;
    const X = 0xe0483a, Y = 0x2ea44f, Z = 0x3b6fe0, FREE = 0x5b4dd1;
    const root = new THREE.Group(); root.position.set(cx, cy, cz);
    // gizmo-ul se aliniază cu fața literei, ca săgețile să arate direcțiile în care chiar se mută
    if (this.planRot) root.rotation.y = this.planRot * Math.PI / 180;
    this.handles.add(root);
    this.gizmoRoot = root;
    const tag = (obj: THREE.Object3D, handle: string, axis?: 'x' | 'y' | 'z', baseOpacity = 1) => {
      (obj as any).userData = { handle, axis, baseOpacity }; obj.renderOrder = 999; this.gizmoParts.push(obj); return obj;
    };
    const lineMat = (color: number, opacity: number, dashed = false) => dashed
      ? new THREE.LineDashedMaterial({ color, transparent: true, opacity, depthTest: false, dashSize: 0.06, gapSize: 0.05 })
      : new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthTest: false });
    const solidMat = (color: number, opacity: number) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthTest: false });
    const invisible = () => new THREE.MeshBasicMaterial({ visible: false });
    const ROT: Record<'x' | 'y' | 'z', [number, number, number]> = { x: [0, 0, -Math.PI / 2], y: [0, 0, 0], z: [Math.PI / 2, 0, 0] };

    if (this.mode === 'move') {
      // TRANSLAȚIE: linie subțire (punctată lângă centru) + vârf conic mic + tub invizibil de prindere
      for (const [ax, color] of [['x', X], ['y', Y], ['z', Z]] as ['x' | 'y' | 'z', number][]) {
        const g = new THREE.Group(); g.rotation.set(...ROT[ax]); root.add(g);
        const dash = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.12, 0), new THREE.Vector3(0, 0.55, 0)]), lineMat(color, 0.55, true));
        dash.computeLineDistances(); g.add(tag(dash, 'move', ax, 0.55));
        const solid = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.55, 0), new THREE.Vector3(0, 0.86, 0)]), lineMat(color, 0.95));
        g.add(tag(solid, 'move', ax, 0.95));
        const head = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.16, 16), solidMat(color, 0.95));
        head.position.y = 0.93; g.add(tag(head, 'move', ax, 0.95));
        const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.95, 8), invisible());
        hit.position.y = 0.52; g.add(tag(hit, 'move', ax));
      }
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.11), solidMat(FREE, 0.75));
      root.add(tag(box, 'move', undefined, 0.75));
    } else if (this.mode === 'rotate') {
      // ROTAȚIE: inele-linie subțiri, semi-transparente + mâner mic la un capăt + tor invizibil de prindere
      const circle = (n = 128) => { const p: THREE.Vector3[] = []; for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2; p.push(new THREE.Vector3(Math.cos(a), Math.sin(a), 0)); } return p; };
      for (const [ax, color, rot] of [['z', Z, [0, 0, 0]], ['x', X, [0, Math.PI / 2, 0]], ['y', Y, [Math.PI / 2, 0, 0]]] as ['x' | 'y' | 'z', number, [number, number, number]][]) {
        if (this.rotAxes && !this.rotAxes.includes(ax)) continue;   // axă pe care aplicația n-o salvează
        const g = new THREE.Group(); g.rotation.set(...rot); root.add(g);
        const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(circle()), lineMat(color, 0.6));
        g.add(tag(ring, 'rotate', ax, 0.6));
        // îngroșare la hover: tor foarte subțire, ascuns implicit
        const thick = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 8, 96), solidMat(color, 1));
        thick.visible = false; (thick as any).userData = { handle: 'rotate', axis: ax, emph: true }; thick.renderOrder = 999; g.add(thick); this.gizmoParts.push(thick);
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), solidMat(color, 0.9));
        knob.position.set(1, 0, 0); g.add(tag(knob, 'rotate', ax, 0.9));
        const hit = new THREE.Mesh(new THREE.TorusGeometry(1, 0.07, 6, 48), invisible());
        g.add(tag(hit, 'rotate', ax));
      }
    } else if (this.mode === 'scale') {
      // SCALARE: mânere în colțurile amprentei (poziții absolute, urmăresc bbox-ul)
      const s = Math.max(4, Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y) * 0.06);
      for (const [x, y] of [[bb.min.x, bb.min.y], [bb.max.x, bb.min.y], [bb.min.x, bb.max.y], [bb.max.x, bb.max.y]] as const) {
        const h = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), solidMat(FREE, 0.9));
        h.position.set(x, y, bb.max.z + 0.5); this.handles.add(tag(h, 'scale', undefined, 0.9));
        const hit = new THREE.Mesh(new THREE.BoxGeometry(s * 2.2, s * 2.2, s * 2.2), invisible());
        hit.position.copy(h.position); this.handles.add(tag(hit, 'scale'));
      }
    }
    this.updateGizmoScale();
  }
  /** gizmo de dimensiune CONSTANTĂ pe ecran, indiferent de zoom/distanță */
  private updateGizmoScale() {
    const g = this.gizmoRoot; if (!g) return;
    const h = this.container.clientHeight || 600;
    let unitPerPx: number;
    const cam: any = this.active;
    if (cam.isPerspectiveCamera) {
      const dist = cam.position.distanceTo(g.position);
      unitPerPx = (2 * dist * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2)) / h;
    } else {
      unitPerPx = (cam.top - cam.bottom) / cam.zoom / h;
    }
    g.scale.setScalar(Math.max(1e-4, unitPerPx * this.gizmoPx));
  }
  private updateGuides(m: THREE.Mesh) {
    const base = [...this.objects.values()].find((o) => !o.movable && o.mesh.visible);
    this.guideX.visible = this.guideY.visible = false;
    if (!base) return;
    base.mesh.geometry.computeBoundingBox(); const bb = base.mesh.geometry.boundingBox!;
    const cx = (bb.min.x + bb.max.x) / 2, cy = (bb.min.y + bb.max.y) / 2;
    m.geometry.computeBoundingBox(); const mb = m.geometry.boundingBox!;
    const mcx = (mb.min.x + mb.max.x) / 2 + m.position.x, mcy = (mb.min.y + mb.max.y) / 2 + m.position.y;
    const S = 400;
    if (Math.abs(mcx - cx) < 0.8) { this.guideX.geometry.setFromPoints([new THREE.Vector3(cx, cy - S, 1), new THREE.Vector3(cx, cy + S, 1)]); this.guideX.visible = true; }
    if (Math.abs(mcy - cy) < 0.8) { this.guideY.geometry.setFromPoints([new THREE.Vector3(cx - S, cy, 1), new THREE.Vector3(cx + S, cy, 1)]); this.guideY.visible = true; }
  }

  setObject(id: string, geom: THREE.BufferGeometry, color: string, movable: boolean, visible = true,
            corpuri?: { geometry: THREE.BufferGeometry; color: string }[], opacitate = 1) {
    const translucid = opacitate < 1;
    let o = this.objects.get(id);
    if (o) { o.mesh.geometry.dispose(); o.mesh.geometry = geom; o.mat.color.set(color); o.movable = movable; }
    else {
      const mat = new THREE.MeshStandardMaterial({ color, metalness: 0.0, roughness: 0.55 });
      this.pregatesteStraturi(mat);
      const mesh = new THREE.Mesh(geom, mat);
      // si PRIMESC umbra, nu doar o arunca: fara asta piesa din locas n-are linia de contact
      // cu litera si arata lipita deasupra, nu asezata in ea. `normalBias` pe lumina cheie
      // tine artefactele de auto-umbrire departe de fetele plate.
      mesh.castShadow = true; mesh.receiveShadow = true;
      this.scene.add(mesh);
      o = { mesh, mat, movable, parti: [] }; this.objects.set(id, o);
    }
    /**
     * TRANSLUCIDUL, aplicat la fiecare trecere, nu doar la creare: opacitatea se poate schimba
     * de la un `rebuild` la altul, iar materialul e refolosit.
     *
     * `depthWrite: false` — fără el, fantoma și-ar ascunde propriile fețe din spate și ar
     * arăta ca o coajă tăiată, nu ca un corp. Umbrele se sting: un manechin care lasă umbră
     * pe husă arată ca o pată pe piesă.
     */
    o.mat.transparent = translucid;
    o.mat.opacity = opacitate;
    o.mat.depthWrite = !translucid;
    o.mesh.castShadow = !translucid;
    o.mesh.receiveShadow = !translucid;
    o.mat.needsUpdate = true;
    // Corpuri separate: un mesh COPIL per corp, cu materialul lui. Mesh-ul părinte rămâne
    // ținta pentru raycast, gizmo și încadrare, dar nu se randează (`material.visible`),
    // fiindcă geometria lui compusă ar acoperi corpurile cu o singură culoare.
    for (const p of o.parti) { o.mesh.remove(p.mesh); p.mesh.geometry.dispose(); p.mat.dispose(); }
    o.parti = [];
    o.mat.visible = !corpuri?.length;
    for (const c of corpuri ?? []) {
      const mat = new THREE.MeshStandardMaterial({ color: c.color, metalness: 0.0, roughness: 0.55 });
      this.pregatesteStraturi(mat);
      const mesh = new THREE.Mesh(c.geometry, mat);
      mesh.castShadow = true; mesh.receiveShadow = true; o.mesh.add(mesh);
      o.parti.push({ mesh, mat });
    }
    this.resetMesh(o.mesh); o.mesh.visible = visible;
    this.applyHighlight();
  }
  /** ce e efectiv în scenă: id, culoarea MATERIALULUI, triunghiuri. Pentru verificări automate. */
  sceneReport() {
    return [...this.objects.entries()].map(([id, o]) => ({
      id, culoare: '#' + o.mat.color.getHexString().toUpperCase(),
      emissive: '#' + o.mat.emissive.getHexString().toUpperCase(),
      randat: o.mat.visible, vizibil: o.mesh.visible,
      triunghiuri: (o.mesh.geometry.getAttribute('position')?.count ?? 0) / 3,
      corpuri: o.parti.map((p) => ({ culoare: '#' + p.mat.color.getHexString().toUpperCase(),
        triunghiuri: (p.mesh.geometry.getAttribute('position')?.count ?? 0) / 3 })),
    }));
  }
  removeObject(id: string) {
    const o = this.objects.get(id); if (!o) return;
    if (this.selectedId === id) this.selectedId = null;
    for (const p of o.parti) { p.mesh.geometry.dispose(); p.mat.dispose(); }
    this.scene.remove(o.mesh); o.mesh.geometry.dispose(); this.objects.delete(id);
  }
  clearObjects() { for (const id of [...this.objects.keys()]) this.removeObject(id); }
  setVisible(id: string, v: boolean) { const o = this.objects.get(id); if (o) o.mesh.visible = v; }
  hasObject(id: string) { return this.objects.has(id); }
  get selected() { return this.selectedId; }
  /** activează/dezactivează rigla. La oprire, urmele rămân până la `stergeMasura()`. */
  setMasurare(on: boolean) {
    this.masurare = on;
    this.masuraDown = null;
    if (on) this.select(null);
    if (!on) this.etichetaMasura.style.display = 'none';
  }
  stergeMasura() { this.puncteMasura = []; this.deseneazaMasura(); this.onMasura?.(null); }
  /** fixează un punct pe suprafață, prins de vârful cel mai apropiat dacă e la sub 2 mm */
  private fixeazaPunct(e: PointerEvent) {
    const tinte = [...this.objects.values()].filter((o) => o.mesh.visible)
      .flatMap((o) => (o.parti.length ? o.parti.map((x) => x.mesh) : [o.mesh]));
    const hit = this.ray.intersectObjects(tinte, false)[0];
    if (!hit) return;
    let p = hit.point.clone();
    // prindere pe vârf: dintre cele trei vârfuri ale triunghiului lovit, cel mai apropiat
    const g: any = (hit.object as THREE.Mesh).geometry;
    if (hit.face && g?.attributes?.position) {
      const poz = g.attributes.position;
      let best: THREE.Vector3 | null = null, bd = Infinity;
      for (const idx of [hit.face.a, hit.face.b, hit.face.c]) {
        const v = new THREE.Vector3().fromBufferAttribute(poz, idx).applyMatrix4(hit.object.matrixWorld);
        const d = v.distanceTo(hit.point);
        if (d < bd) { bd = d; best = v; }
      }
      if (best && bd < 2) p = best;
    }
    if (this.puncteMasura.length >= 2) this.puncteMasura = [];
    this.puncteMasura.push(p);
    this.deseneazaMasura();
    if (this.puncteMasura.length === 2) {
      const [a, b] = this.puncteMasura;
      // Y-ul lumii e oglindit față de model; raportăm valoarea din model, ca restul cifrelor.
      this.etichetaMasura.textContent = `${a.distanceTo(b).toFixed(2)} mm`;
      this.pozitioneazaEticheta();   // imediat, nu doar la următorul cadru (randarea poate fi pe pauză)
      this.onMasura?.({ d: a.distanceTo(b), dx: b.x - a.x, dy: -(b.y - a.y), dz: b.z - a.z });
    } else { this.etichetaMasura.style.display = 'none'; this.onMasura?.(null); }
  }
  private deseneazaMasura() {
    this.grupMasura.traverse((c: any) => { c.geometry?.dispose?.(); c.material?.dispose?.(); });
    this.grupMasura.clear();
    const r = Math.max(0.6, this.dimScena() * 0.006);
    for (const p of this.puncteMasura) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12),
        new THREE.MeshBasicMaterial({ color: 0xff3b30, depthTest: false }));
      m.position.copy(p); m.renderOrder = 998; this.grupMasura.add(m);
    }
    if (this.puncteMasura.length === 2) {
      const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(this.puncteMasura),
        new THREE.LineBasicMaterial({ color: 0xff3b30, depthTest: false }));
      l.renderOrder = 998; this.grupMasura.add(l);
    }
  }
  private dimScena(): number {
    const b = new THREE.Box3();
    for (const o of this.objects.values()) if (o.mesh.visible) b.expandByObject(o.mesh);
    return b.isEmpty() ? 100 : b.getSize(new THREE.Vector3()).length();
  }
  select(id: string | null) { this.selectedId = id; this.applyHighlight(); }
  private applyHighlight() {
    for (const [id, o] of this.objects) {
      const on = id === this.selectedId;
      for (const m of [o.mat, ...o.parti.map((p) => p.mat)]) { m.emissive.set(on ? 0x5b4dd1 : 0x000000); (m as any).emissiveIntensity = on ? 0.3 : 0; }
    }
    this.refreshHandles();
  }

  /** bbox = conținut vizibil + placa de print (ca încadrarea să arate mereu scara plăcii). */
  private combinedBounds(): THREE.Box3 {
    const box = new THREE.Box3();
    for (const o of this.objects.values()) if (o.mesh.visible) box.expandByObject(o.mesh);
    box.expandByPoint(new THREE.Vector3(this.plateW / 2, 0, this.plateD / 2));
    box.expandByPoint(new THREE.Vector3(-this.plateW / 2, 0, -this.plateD / 2));
    return box;
  }
  frame() {
    const box = this.combinedBounds();
    if (box.isEmpty()) return;
    const c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
    this.target.copy(c); this.orbit.target.copy(c);
    const r = Math.max(s.x, s.y, s.z) || 100;
    // izometric, ușor de sus (ca la Bambu): X ≈ Z + peste
    this.persp.position.set(c.x + r * 1.0, c.y + r * 0.8, c.z + r * 1.0);
    this.ortho.position.set(c.x, c.y, c.z + r * 4);
    const aspect = (this.container.clientWidth || 800) / (this.container.clientHeight || 600);
    const half = r * 0.72; this.ortho.left = -half * aspect; this.ortho.right = half * aspect; this.ortho.top = half; this.ortho.bottom = -half;
    this.ortho.updateProjectionMatrix(); this.orbit.update();
  }
  setProjection(mode: 'persp' | 'ortho') {
    const dir = this.active.position.clone().sub(this.target); // păstrează direcția privirii
    this.active = mode === 'persp' ? this.persp : this.ortho;
    this.active.position.copy(this.target).add(dir.setLength(dir.length() || 300));
    this.orbit.object = this.active as any; this.orbit.update();
  }
  /** vederi rapide */
  setView(name: 'fata' | 'spate' | 'sus' | 'jos' | 'stanga' | 'dreapta' | 'izo') {
    const box = this.combinedBounds();
    const c = box.isEmpty() ? this.target.clone() : box.getCenter(new THREE.Vector3());
    const r = box.isEmpty() ? 300 : Math.max(...box.getSize(new THREE.Vector3()).toArray()) * 1.05 || 300;
    const dirs: Record<string, [number, number, number]> = {
      fata: [0, 0, 1], spate: [0, 0, -1], sus: [0, 1, 0], jos: [0, -1, 0], stanga: [-1, 0, 0], dreapta: [1, 0, 0], izo: [1, 0.8, 1],
    };
    const d = new THREE.Vector3(...dirs[name]).normalize().multiplyScalar(r);
    this.target.copy(c); this.orbit.target.copy(c);
    this.active.up.set(0, 1, 0);
    this.active.position.copy(c).add(d);
    this.orbit.update();
  }
  private onResize() {
    const w = this.container.clientWidth, h = this.container.clientHeight; if (!w || !h) return;
    this.potrivesteFundal();
    this.renderer.setSize(w, h); const a = w / h;
    this.persp.aspect = a; this.persp.updateProjectionMatrix();
    const top = this.ortho.top; this.ortho.left = -top * a; this.ortho.right = top * a; this.ortho.updateProjectionMatrix();
  }
  // ===================================================================
  // MOD PREZENTARE — scenă curățată, lumini de studio, textură de straturi
  // ===================================================================

  /**
   * Textura de straturi de print, procedurală: nicio imagine, nicio coordonată UV.
   * Luminozitatea e modulată dintr-o funcție de ÎNĂLȚIMEA REALĂ a punctului (world Y), deci
   * pe suprafețe curbe straturile urmează forma corect, exact ca la o piesă printată.
   * Profilul e sinusoidal, nu prag: la 120 mm ies ~600 de straturi, iar linii dure ar da zebră.
   */
  private pregatesteStraturi(mat: THREE.MeshStandardMaterial) {
    const u = { uStratH: { value: this.prezOpt.grosimeStrat }, uStratAmp: { value: this.prez ? this.prezOpt.straturiIntensitate : 0 } };
    (mat as any).userData.straturi = u;
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uStratH = u.uStratH;
      shader.uniforms.uStratAmp = u.uStratAmp;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying float vAltitudine;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n  vAltitudine = (modelMatrix * vec4(transformed, 1.0)).y;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vAltitudine;\nuniform float uStratH;\nuniform float uStratAmp;')
        // `val`  = dinte de fierăstrău neted: fiecare strat e puțin mai luminos sus, mai stins jos.
        // `muchie` = trecerea dintre straturi, îngustată, ca să se vadă treapta fără să devină dungă.
        // Amplitudinile sunt mici intenționat (6% / 10%): la 120 mm ies ~600 de straturi.
        .replace('#include <color_fragment>', `#include <color_fragment>
        if (uStratAmp > 0.0001) {
          float faza = vAltitudine / max(uStratH, 0.01);
          float val = sin(faza * 6.2831853);
          float muchie = smoothstep(0.82, 1.0, abs(val));
          float f = 1.0 + uStratAmp * (0.06 * val - 0.10 * muchie);
          diffuseColor.rgb *= clamp(f, 0.0, 2.0);
        }`);
    };
    mat.customProgramCacheKey = () => 'straturi';
    mat.needsUpdate = true;
  }
  /** actualizează uniformele de straturi pe toate materialele din scenă */
  private aplicaStraturi() {
    for (const o of this.objects.values()) {
      for (const m of [o.mat, ...o.parti.map((p) => p.mat)]) {
        const u = (m as any).userData.straturi;
        if (!u) continue;
        u.uStratH.value = this.prezOpt.grosimeStrat;
        u.uStratAmp.value = this.prez ? this.prezOpt.straturiIntensitate : 0;
      }
    }
  }
  get prezentareActiva() { return this.prez; }
  get prezentareOptiuni(): PrezentareOptiuni { return { ...this.prezOpt }; }

  /** pornește/oprește modul prezentare; la oprire scena revine exact cum era */
  setPrezentare(on: boolean, optiuni?: Partial<PrezentareOptiuni>) {
    Object.assign(this.prezOpt, optiuni ?? {});
    if (on && !this.prez) {
      this.prezSalvat = { fundal: this.scene.background, placa: this.plate.visible, manere: this.handles.visible,
        gx: this.guideX.visible, gy: this.guideY.visible, luminiVechi: true };
      this.plate.visible = false; this.handles.visible = false;
      this.guideX.visible = false; this.guideY.visible = false;
      for (const l of this.luminiScena) l.visible = false;
      this.construiesteStudio();
      this.prezGrup.visible = true;
    } else if (!on && this.prez) {
      const v = this.prezSalvat!;
      // scena foto se scoate PRIMA: altfel `setScenaFoto(null)` rescrie fundalul
      // pe care tocmai l-am restaurat (modul e încă pornit când o apelăm)
      if (this.scenaFoto) { this.setScenaFoto(null, null); this.scene.environment = null; }
      this.plate.visible = v.placa; this.handles.visible = v.manere;
      this.guideX.visible = v.gx; this.guideY.visible = v.gy;
      for (const l of this.luminiScena) l.visible = true;
      this.prezGrup.visible = false;
      this.scene.background = v.fundal;
      this.renderer.setClearAlpha(1);
      this.prezSalvat = null;
    }
    this.prez = on;
    if (on) this.aplicaFundal();
    this.aplicaStraturi();
  }
  /** doar opțiunile, fără să comute modul */
  setPrezentareOptiuni(optiuni: Partial<PrezentareOptiuni>) {
    Object.assign(this.prezOpt, optiuni);
    if (this.prez) { this.aplicaFundal(); this.aplicaStraturi(); }
  }
  private aplicaFundal() {
    if (this.scenaFoto) return;         // fundalul vine din scenă
    const f = this.prezOpt.fundal;
    this.scene.background = f === 'transparent' ? null : new THREE.Color(f === 'alb' ? 0xffffff : this.prezOpt.culoare);
    this.renderer.setClearAlpha(f === 'transparent' ? 0 : 1);
  }
  /** trei surse (key / fill / rim) + un mediu neutru pentru reflexii, plus captatorul de umbră */
  private construiesteStudio() {
    for (const c of [...this.prezGrup.children]) {
      this.prezGrup.remove(c);
      (c as any).geometry?.dispose?.(); (c as any).material?.dispose?.();
    }
    const key = new THREE.DirectionalLight(0xffffff, 2.1); key.position.set(150, 300, 220);
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
    key.shadow.radius = 6;                       // umbră difuză, nu conturată
    const sc = key.shadow.camera as THREE.OrthographicCamera;
    sc.left = -300; sc.right = 300; sc.top = 300; sc.bottom = -300; sc.near = 1; sc.far = 1200;
    key.shadow.bias = -0.0006;
    const fill = new THREE.DirectionalLight(0xffffff, 0.75); fill.position.set(-220, 90, 140);
    const rim = new THREE.DirectionalLight(0xffffff, 1.1); rim.position.set(-60, 130, -260);
    // mediu neutru: cer alb / podea gri deschis, doar pentru reflexii ușoare pe plastic
    const mediu = new THREE.HemisphereLight(0xffffff, 0xe6e8ec, 0.55);
    // plan care primește DOAR umbra: podeaua reală e ascunsă, dar fără umbră obiectele plutesc
    const captator = new THREE.Mesh(
      new THREE.PlaneGeometry(this.plateW * 3, this.plateD * 3).rotateX(-Math.PI / 2),
      new THREE.ShadowMaterial({ opacity: 0.18 }),
    );
    captator.position.y = -0.02; captator.receiveShadow = true;
    this.prezGrup.add(key, fill, rim, mediu, captator);
  }
  // ---------- SCENĂ DE FUNDAL (fotografie de interior) ----------
  get scenaFotoActiva() { return this.scenaFoto; }

  /**
   * Pune obiectele într-o fotografie. Nu e doar un fundal: camera, planul umbrei, direcția
   * și temperatura luminii vin din scenă, ca umbra să cadă în aceeași parte ca în poză și
   * perspectiva să se potrivească. `null` scoate scena și revine la studioul neutru.
   */
  setScenaFoto(scena: ScenaFoto | null, imagine: HTMLImageElement | null) {
    for (const c of [...this.grupScena.children]) {
      this.grupScena.remove(c);
      (c as any).geometry?.dispose?.(); (c as any).material?.dispose?.();
    }
    this.texturaFundal?.dispose(); this.texturaFundal = null;
    // FOV-ul de lucru se pune deoparte la prima scenă și se pune la loc când scena pleacă
    if (scena && this.fovInainteDeScena === null) this.fovInainteDeScena = this.persp.fov;
    if (!scena && this.fovInainteDeScena !== null) {
      this.persp.fov = this.fovInainteDeScena; this.persp.updateProjectionMatrix();
      this.fovInainteDeScena = null;
      this.incadrare = { offsetX: 0, offsetY: 0, zoom: 1 };
    }
    this.scenaFoto = scena;
    this.grupScena.visible = !!scena;
    this.prezGrup.visible = this.prez && !scena;      // studioul neutru se stinge sub o scenă
    if (!scena || !imagine) { if (this.prez) this.aplicaFundal(); this.aplicaStraturi(); return; }

    const tex = new THREE.Texture(imagine);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    this.texturaFundal = tex;
    this.scene.background = tex;
    this.renderer.setClearAlpha(1);
    this.potrivesteFundal();
    if (scena.environment) this.scene.environment = tex;   // reflexii aproximative pe plastic

    // lumina principală, din direcția declarată, cu temperatura declarată
    const d = new THREE.Vector3(...scena.lumina.directie).normalize().multiplyScalar(420);
    const key = new THREE.DirectionalLight(temperaturaLaCuloare(scena.lumina.temperatura), scena.lumina.intensitate);
    key.position.copy(d);
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 5;
    const sc = key.shadow.camera as THREE.OrthographicCamera;
    sc.left = -300; sc.right = 300; sc.top = 300; sc.bottom = -300; sc.near = 1; sc.far = 1400;
    key.shadow.bias = -0.0006;
    const ambient = new THREE.HemisphereLight(0xffffff, 0xd9d2c8, 0.45);

    // planul care primește umbra = suprafața din fotografie
    const plan = new THREE.Mesh(
      new THREE.PlaneGeometry(4000, 4000).rotateX(-Math.PI / 2),
      new THREE.ShadowMaterial({ opacity: scena.umbra.opacitate }),
    );
    plan.position.y = scena.planUmbra.inaltime;
    plan.rotation.y = (scena.planUmbra.rotatieY * Math.PI) / 180;
    plan.receiveShadow = true;
    this.grupScena.add(key, ambient, plan);

    this.aplicaCameraScenei();
    this.aplicaStraturi();
  }
  /** camera declarată de scenă, plus ajustarea fină a utilizatorului */
  private aplicaCameraScenei() {
    const s = this.scenaFoto; if (!s) return;
    this.persp.fov = s.camera.fov / this.incadrare.zoom;
    this.persp.updateProjectionMatrix();
    const t = new THREE.Vector3(...s.camera.tinta);
    t.x += this.incadrare.offsetX; t.y += this.incadrare.offsetY;
    this.target.copy(t); this.orbit.target.copy(t);
    this.active = this.persp;
    this.active.up.set(0, 1, 0);
    this.active.position.set(...s.camera.pozitie);
    this.active.lookAt(t);
    this.orbit.object = this.persp;
    this.orbit.update();
  }
  /** ajustare fină: mută obiectul în cadru și îi schimbă mărimea aparentă */
  setIncadrareFoto(v: Partial<{ offsetX: number; offsetY: number; zoom: number }>) {
    Object.assign(this.incadrare, v);
    this.aplicaCameraScenei();
  }
  get incadrareFoto() { return { ...this.incadrare }; }
  /** fundalul acoperă cadrul păstrându-și proporțiile (ca `background-size: cover`) */
  private potrivesteFundal() {
    const tex = this.texturaFundal; if (!tex?.image) return;
    const aImg = tex.image.width / tex.image.height;
    const aEcran = this.renderer.domElement.width / this.renderer.domElement.height || 1;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    if (aEcran > aImg) { const k = aImg / aEcran; tex.repeat.set(1, k); tex.offset.set(0, (1 - k) / 2); }
    else { const k = aEcran / aImg; tex.repeat.set(k, 1); tex.offset.set((1 - k) / 2, 0); }
  }
  /** dimensiunea reală a obiectelor, în mm — reperul de scară cerut lângă previzualizare */
  dimensiuneObiecte(): [number, number, number] {
    const b = new THREE.Box3();
    for (const o of this.objects.values()) if (o.mesh.visible) b.expandByObject(o.mesh);
    if (b.isEmpty()) return [0, 0, 0];
    const d = b.getSize(new THREE.Vector3());
    return [+d.x.toFixed(1), +d.y.toFixed(1), +d.z.toFixed(1)];
  }

  /** unghiuri fixe pentru fotografii consistente (26 de litere, același cadru) */
  setUnghiFoto(nume: 'trei-sferturi-stanga' | 'trei-sferturi-dreapta' | 'frontal' | 'usor-de-sus') {
    const dirs: Record<string, [number, number, number]> = {
      'trei-sferturi-stanga': [-0.72, 0.42, 1], 'trei-sferturi-dreapta': [0.72, 0.42, 1],
      frontal: [0, 0.12, 1], 'usor-de-sus': [0, 0.75, 1],
    };
    const box = this.combinedBoundsObiecte();
    const c = box.isEmpty() ? this.target.clone() : box.getCenter(new THREE.Vector3());
    const r = box.isEmpty() ? 300 : Math.max(...box.getSize(new THREE.Vector3()).toArray()) * 1.9 || 300;
    const d = new THREE.Vector3(...dirs[nume]).normalize().multiplyScalar(r);
    this.target.copy(c); this.orbit.target.copy(c);
    this.active.up.set(0, 1, 0);
    this.active.position.copy(c).add(d);
    this.orbit.update();
  }
  /** bbox doar pe obiecte (fără placă) — încadrarea pentru fotografie */
  private combinedBoundsObiecte() {
    const box = new THREE.Box3();
    for (const o of this.objects.values()) if (o.mesh.visible) box.expandByObject(o.mesh);
    return box;
  }

  /**
   * Imagine de produs: randează scena la rezoluție mare, fără placă, grilă, ghidaje sau
   * gizmo-uri — doar obiectele. Umbra de contact e păstrată cu un plan care primește doar
   * umbră (`ShadowMaterial`), fiindcă podeaua reală, care o primea, e ascunsă.
   * Camera și încadrarea rămân exact cele de pe ecran.
   */
  exportPNG(latime = 2000, fundal: 'alb' | 'transparent' | 'pastreaza' = 'alb', aspectFix?: number): string {
    const wOld = this.renderer.domElement.width, hOld = this.renderer.domElement.height;
    // `aspectFix` dă un cadru INDEPENDENT de forma ferestrei. Fără el, două capturi făcute
    // după o redimensionare ies cu proporții diferite — inacceptabil pentru un set de
    // fotografii de produs. Exportul simplu („ce se vede") păstrează aspectul ferestrei.
    const aspect = aspectFix || wOld / hOld || 1;
    const w = Math.round(latime), h = Math.round(latime / aspect);
    const fundalVechi = this.scene.background;
    const vizPlaca = this.plate.visible, vizManere = this.handles.visible;
    const vizGX = this.guideX.visible, vizGY = this.guideY.visible;

    // plan care prinde doar umbra, cât placa
    // în mod prezentare studioul are deja captatorul lui de umbră și fundalul pus
    const captator = this.prez ? null : new THREE.Mesh(
      new THREE.PlaneGeometry(this.plateW * 2, this.plateD * 2).rotateX(-Math.PI / 2),
      new THREE.ShadowMaterial({ opacity: 0.22 }),
    );
    if (captator) { captator.position.y = -0.02; captator.receiveShadow = true; this.scene.add(captator); }
    this.plate.visible = false; this.handles.visible = false;
    this.guideX.visible = false; this.guideY.visible = false;
    if (fundal !== 'pastreaza') {
      this.scene.background = fundal === 'alb' ? new THREE.Color(0xffffff) : null;
      this.renderer.setClearAlpha(fundal === 'alb' ? 1 : 0);
    }

    let url = '';
    // pixelRatio 1 pe durata exportului: altfel `setSize` înmulțește cu raportul ecranului
    // și cine cere 3000 px primește 3750 pe un monitor la 125%.
    const ratioVechi = this.renderer.getPixelRatio();
    try {
      this.renderer.setPixelRatio(1);
      this.renderer.setSize(w, h, false);
      this.potrivesteFundal();          // fundalul se recadrează la proporția capturii
      this.persp.aspect = aspect; this.persp.updateProjectionMatrix();
      this.renderer.render(this.scene, this.active);
      url = this.renderer.domElement.toDataURL('image/png');
    } finally {
      // restaurare, orice s-ar fi întâmplat: altfel rămâne viewport-ul stricat
      if (captator) { this.scene.remove(captator); captator.geometry.dispose(); (captator.material as THREE.Material).dispose(); }
      this.plate.visible = vizPlaca; this.handles.visible = vizManere;
      this.guideX.visible = vizGX; this.guideY.visible = vizGY;
      if (fundal !== 'pastreaza') { this.scene.background = fundalVechi; this.renderer.setClearAlpha(1); }
      this.renderer.setPixelRatio(ratioVechi);
      this.renderer.setSize(wOld, hOld, false);
      this.onResize();
      this.renderer.render(this.scene, this.active);
    }
    return url;
  }

  private running = true;
  private animate = () => { if (!this.running) return; requestAnimationFrame(this.animate);
    this.orbit.update(); this.updateGizmoScale(); this.pozitioneazaEticheta();
    this.renderer.render(this.scene, this.active); };
  /** eticheta cu distanța stă pe MIJLOCUL liniei și urmărește camera la fiecare cadru. */
  private pozitioneazaEticheta() {
    if (this.puncteMasura.length !== 2) { this.etichetaMasura.style.display = 'none'; return; }
    const [a, b] = this.puncteMasura;
    const m = a.clone().add(b).multiplyScalar(0.5).project(this.active);
    const r = this.renderer.domElement.getBoundingClientRect();
    this.etichetaMasura.style.left = ((m.x + 1) / 2 * r.width) + 'px';
    this.etichetaMasura.style.top = ((1 - m.y) / 2 * r.height) + 'px';
    this.etichetaMasura.style.display = 'block';
  }
  pauseRender() { this.running = false; this.renderer.render(this.scene, this.active); }
  resumeRender() { if (!this.running) { this.running = true; this.animate(); } }
}
