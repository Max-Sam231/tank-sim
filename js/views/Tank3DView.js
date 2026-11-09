let THREE = null;
let OrbitControls = null;
let GLTFLoader = null;

async function loadThree() {
  if (THREE) return true;
  try {
    THREE = await import("three");
    const oc = await import("three/addons/controls/OrbitControls.js");
    const gltf = await import("three/addons/loaders/GLTFLoader.js");
    OrbitControls = oc.OrbitControls;
    GLTFLoader = gltf.GLTFLoader;
    return true;
  } catch {
    return false;
  }
}

/** Ожидаемый экспорт из Blender: models/t72/tank.glb */
export const TANK_GLB_URL = "./models/t72/tank.glb";

/**
 * Хитпоинты в координатах Blender (X right, Y length, Z up).
 * Танк: нос ≈ −Y, корма ≈ +Y. В glTF (Y-up): (x, y, z)_b → (x, z, −y).
 */
const HOTSPOT_DEFS = [
  {
    id: "driver",
    hatch: "driver",
    label: "Люк механика-водителя",
    blender: [-0.28, -1.85, 0.98],
    radius: 0.3,
    color: 0x3ddc97,
  },
  {
    id: "gunner",
    hatch: "gunner",
    label: "Люк наводчика",
    blender: [-0.48, 0.12, 1.58],
    radius: 0.28,
    color: 0x58a6ff,
  },
  {
    id: "commander",
    hatch: "commander",
    label: "Люк командира",
    blender: [0.48, 0.55, 1.58],
    radius: 0.28,
    color: 0xffb454,
  },
  {
    id: "zip-box",
    zone: "zip-box",
    label: "Ящик ЗИП",
    blender: [0.55, 1.2, 1.28],
    radius: 0.34,
    color: 0xff7b72,
  },
  {
    id: "heater-rear-left",
    zone: "heater-rear-left",
    label: "Подогреватель (борт кормы слева)",
    blender: [-1.25, 2.15, 0.95],
    radius: 0.35,
    color: 0xff9800,
  },
];

const CLICK_DRAG_PX = 6;

/**
 * Палитра с 2D-спрайтов ангара (img/hangar/tank*.png).
 * В GLB почти нет окраски — красим материалы после загрузки.
 */
const TANK_PAINT = {
  hull: 0x5f5c4f, // оливково-хаки корпус / башня
  tracks: 0x252420, // гусеницы / тёмные детали
  metalness: 0.08,
  roughness: 0.82,
};

/**
 * 3D-осмотр танка в ангаре. Свой render-loop — не зависит от training loop.
 */
export class Tank3DView {
  constructor(app, hangarScene) {
    this.app = app;
    this.hangarScene = hangarScene;
    this.rootEl = document.getElementById("tank-3d-view");
    this.canvas = document.getElementById("tank-3d-canvas");
    this.statusEl = document.getElementById("tank-3d-status");

    this._rafId = null;
    this._resizeObserver = null;
    this._pointerDown = null;
    this._hovered = null;
    this.hotspots = [];

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
  }

  async init() {
    if (!this.canvas) return;

    this._setStatus("Загрузка 3D-модели…");

    const ok = await loadThree();
    if (!ok || !THREE) {
      this._setStatus("3D-просмотр недоступен");
      return;
    }

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x2a2c28);
    this.scene.fog = new THREE.Fog(0x2a2c28, 28, 55);

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
    this.camera.position.set(8, 5, 10);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 1.2, 0);
    this.controls.autoRotate = false;
    this.controls.autoRotateSpeed = 0.6;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 22;

    this.raycaster = new THREE.Raycaster();
    this._ndc = new THREE.Vector2();

    this._buildHangar();
    this._addLights();
    this._loadModel();
    this._observeResize();
    this._startRenderLoop();

    this.canvas.addEventListener("pointerdown", this._onPointerDown);
    this.canvas.addEventListener("pointermove", this._onPointerMove);
    this.canvas.addEventListener("pointerup", this._onPointerUp);
    this.canvas.addEventListener("pointerleave", () => this._setHovered(null));

    if (typeof window !== "undefined") {
      window.tank3d = this;
    }

    if (this._pendingMenuMode) {
      this.setMenuMode(true);
      this._pendingMenuMode = false;
    }

    // Для отладки хитпоинтов в консоли / автотестах
    window.__tank3dView = this;
  }

  /**
   * Режим фона стартового меню: автоповорот, без подсказок и кликов по люкам.
   * Можно вызвать до init() — применится после инициализации.
   */
  setMenuMode(enabled) {
    this._menuMode = Boolean(enabled);
    if (!this.controls) {
      this._pendingMenuMode = this._menuMode;
      return;
    }

    this.controls.autoRotate = this._menuMode;
    this.controls.enableZoom = !this._menuMode;
    this.controls.enablePan = !this._menuMode;
    this.controls.enabled = !this._menuMode;

    if (this.hotspotGroup) this.hotspotGroup.visible = !this._menuMode;

    if (this.statusEl) {
      this.statusEl.classList.toggle("hidden", this._menuMode);
    }
    if (!this._menuMode && this.tankRoot) {
      this._setExploreStatus();
    }
  }

  /**
   * Простой 3D-ангар (пол / стены / брезент / потолочные лампы).
   * 2D JPG из img/hangar/ — вид сверху/сбоку для спрайтов, как 360°-комнату их не взять.
   */
  _buildHangar() {
    const hangar = new THREE.Group();
    hangar.name = "hangar";

    const W = 22;
    const L = 36;
    const H = 9;
    const wallT = 0.25;

    const concrete = new THREE.MeshStandardMaterial({
      color: 0x6a6a62,
      roughness: 0.92,
      metalness: 0.05,
    });
    const metal = new THREE.MeshStandardMaterial({
      color: 0x4a4e48,
      roughness: 0.7,
      metalness: 0.45,
    });
    const canvas = new THREE.MeshStandardMaterial({
      color: 0x8a7a58,
      roughness: 0.95,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });
    const lampMat = new THREE.MeshStandardMaterial({
      color: 0xf2f0e0,
      emissive: 0xfff4c8,
      emissiveIntensity: 1.4,
      roughness: 1,
      metalness: 0,
    });

    // Пол с разметкой (жёлтая / белые линии как на 2D)
    const floorMap = this._makeFloorTexture();
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(W, L),
      new THREE.MeshStandardMaterial({
        map: floorMap,
        color: 0xffffff,
        roughness: 0.9,
        metalness: 0.04,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    hangar.add(floor);

    // Задняя стена
    const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, wallT), metal);
    back.position.set(0, H / 2, -L / 2);
    back.receiveShadow = true;
    hangar.add(back);

    // Боковые стены + проёмы с брезентом
    for (const side of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(wallT, H, L), metal);
      wall.position.set(side * (W / 2), H / 2, 0);
      wall.receiveShadow = true;
      hangar.add(wall);

      for (let i = -2; i <= 2; i++) {
        const tarp = new THREE.Mesh(new THREE.PlaneGeometry(4.2, H * 0.78), canvas);
        tarp.position.set(side * (W / 2 - 0.2), H * 0.42, i * 6.2);
        tarp.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        hangar.add(tarp);

        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.35, H, 0.35), metal);
        pillar.position.set(side * (W / 2 - 0.15), H / 2, i * 6.2 + 2.6);
        pillar.castShadow = true;
        hangar.add(pillar);
      }
    }

    // Потолок / фермы
    const ceiling = new THREE.Mesh(new THREE.BoxGeometry(W, wallT, L), concrete);
    ceiling.position.y = H;
    hangar.add(ceiling);

    for (let i = -3; i <= 3; i++) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(W - 0.5, 0.28, 0.28), metal);
      beam.position.set(0, H - 0.35, i * 4.5);
      hangar.add(beam);

      const lamp = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.12, 0.7), lampMat);
      lamp.position.set(0, H - 0.55, i * 4.5);
      hangar.add(lamp);
    }

    // Брезент на дальнем торце
    const backTarp = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.92, H * 0.75), canvas);
    backTarp.position.set(0, H * 0.4, -L / 2 + 0.2);
    hangar.add(backTarp);

    this.hangarRoot = hangar;
    this.scene.add(hangar);
  }

  _makeFloorTexture() {
    const size = 1024;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");

    ctx.fillStyle = "#6a6a62";
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 1800; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const s = 2 + Math.random() * 18;
      const v = 80 + Math.floor(Math.random() * 50);
      ctx.fillStyle = `rgba(${v},${v},${v - 8},0.18)`;
      ctx.fillRect(x, y, s, s * (0.4 + Math.random()));
    }

    // Жёлтая линия слева, белые справа — как на 2D-ангаре
    ctx.fillStyle = "#d4b22a";
    ctx.fillRect(size * 0.18, 0, 10, size);
    ctx.fillStyle = "#e8e8e0";
    ctx.fillRect(size * 0.78, 0, 6, size);
    ctx.fillRect(size * 0.82, 0, 6, size);

    // Решётки
    ctx.fillStyle = "#3a3a36";
    for (const y of [0.28, 0.55, 0.78]) {
      ctx.fillRect(size * 0.42, size * y, size * 0.16, size * 0.045);
    }

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }

  _addLights() {
    this.scene.add(new THREE.AmbientLight(0xc8cbb8, 0.45));
    this.scene.add(new THREE.HemisphereLight(0xe8ead8, 0x3a3a32, 0.35));

    const key = new THREE.DirectionalLight(0xfff5e0, 0.95);
    key.position.set(4, 16, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 40;
    key.shadow.camera.left = -14;
    key.shadow.camera.right = 14;
    key.shadow.camera.top = 14;
    key.shadow.camera.bottom = -14;
    key.shadow.bias = -0.0002;
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0xb8c0a8, 0.28);
    fill.position.set(-10, 6, -8);
    this.scene.add(fill);

    // Мягкие «лампы» вдоль ангара
    for (const z of [-9, -3, 3, 9]) {
      const p = new THREE.PointLight(0xfff2c8, 18, 22, 2);
      p.position.set(0, 7.8, z);
      this.scene.add(p);
    }
  }

  _loadModel() {
    const loader = new GLTFLoader();
    loader.load(
      TANK_GLB_URL,
      (gltf) => {
        this.tankRoot = gltf.scene;
        this._normalizeModel(this.tankRoot);
        this._paintModelLike2d(this.tankRoot);
        this._enableTankShadows(this.tankRoot);
        this.scene.add(this.tankRoot);
        this._addHotspots(this.tankRoot);
        this._frameModel(this.tankRoot);
        if (this._menuMode) {
          this.statusEl?.classList.add("hidden");
          if (this.hotspotGroup) this.hotspotGroup.visible = false;
        } else {
          this._setExploreStatus();
        }
      },
      (event) => {
        if (event.total) {
          const pct = Math.round((event.loaded / event.total) * 100);
          this._setStatus(`Загрузка… ${pct}%`);
        }
      },
      () => {
        this._setStatus(
          `Файл не найден: ${TANK_GLB_URL}. Экспортируй 072SHALL.blend → tank.glb (см. models/t72/README.md).`,
        );
        console.warn("[Tank3DView] GLB load failed:", TANK_GLB_URL);
      },
    );
  }

  _normalizeModel(root) {
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = 6 / maxDim;
    root.scale.setScalar(scale);

    root.updateMatrixWorld(true);
    const box2 = new THREE.Box3().setFromObject(root);
    const center = box2.getCenter(new THREE.Vector3());
    root.position.x -= center.x;
    root.position.z -= center.z;
    root.position.y -= box2.min.y;
  }

  _enableTankShadows(root) {
    root.traverse((obj) => {
      if (!obj.isMesh) return;
      obj.castShadow = true;
      obj.receiveShadow = true;
    });
  }

  /** Красит GLB под цвет 2D-спрайтов: корпус хаки, гусеницы тёмные. */
  _paintModelLike2d(root) {
    const cache = new Map();

    const paintOne = (mat) => {
      if (!mat || cache.has(mat.uuid)) return cache.get(mat?.uuid) ?? mat;

      const next = mat.clone();
      const name = (mat.name || "").toLowerCase();
      const isTrack =
        name.includes("гусениц") ||
        name.includes("gusen") ||
        name.includes("track") ||
        name.includes("tread");

      next.color = new THREE.Color(isTrack ? TANK_PAINT.tracks : TANK_PAINT.hull);
      if ("metalness" in next) next.metalness = TANK_PAINT.metalness;
      if ("roughness" in next) next.roughness = TANK_PAINT.roughness;
      if ("map" in next) next.map = null;
      next.needsUpdate = true;
      cache.set(mat.uuid, next);
      return next;
    };

    root.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      if (Array.isArray(obj.material)) {
        obj.material = obj.material.map(paintOne);
      } else {
        obj.material = paintOne(obj.material);
      }
    });
  }

  /** Blender XYZ (Z-up) → glTF/Three local (Y-up). */
  _blenderToLocal([x, y, z]) {
    return new THREE.Vector3(x, z, -y);
  }

  _addHotspots(root) {
    this.hotspotGroup = new THREE.Group();
    this.hotspotGroup.name = "hotspots";
    this.hotspots = [];

    for (const def of HOTSPOT_DEFS) {
      const marker = this._makeHotspotMarker(def);
      marker.position.copy(this._blenderToLocal(def.blender));
      marker.userData.hotspot = {
        id: def.id,
        hatch: def.hatch,
        zone: def.zone,
        label: def.label,
      };
      this.hotspotGroup.add(marker);
      this.hotspots.push(marker);
    }

    root.add(this.hotspotGroup);
  }

  _makeHotspotMarker(def) {
    const group = new THREE.Group();
    group.name = `hotspot-${def.id}`;

    const glowMat = new THREE.MeshBasicMaterial({
      color: def.color,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const sphere = new THREE.Mesh(new THREE.SphereGeometry(def.radius * 0.55, 20, 16), glowMat);
    const ring = new THREE.Mesh(new THREE.RingGeometry(def.radius * 0.7, def.radius, 32), ringMat);
    ring.rotation.x = -Math.PI / 2;

    // Невидимый коллайдер чуть крупнее — проще попасть
    const hit = new THREE.Mesh(
      new THREE.SphereGeometry(def.radius * 1.15, 12, 10),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    hit.userData.isHotspotHit = true;

    group.add(sphere, ring, hit);
    group.userData.pulse = { sphere, ring, t0: Math.random() * Math.PI * 2 };
    return group;
  }

  _frameModel(root) {
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    // Ближе к танку при открытии (было 1.8)
    const dist = Math.max(size.x, size.y, size.z) * 1.05;
    this.controls.target.copy(center);
    this.camera.position.set(center.x + dist * 0.55, center.y + dist * 0.32, center.z + dist);
    this.controls.update();
  }

  _pointerNdc(event) {
    const rect = this.canvas.getBoundingClientRect();
    this._ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this._ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    return this._ndc;
  }

  _pickHotspot(event) {
    if (!this.hotspotGroup?.visible) return null;
    this.raycaster.setFromCamera(this._pointerNdc(event), this.camera);
    const hits = this.raycaster.intersectObjects(this.hotspots, true);
    if (!hits.length) return null;

    let obj = hits[0].object;
    while (obj) {
      if (obj.userData?.hotspot) return obj;
      obj = obj.parent;
    }
    return null;
  }

  _onPointerDown(event) {
    if (this._menuMode) return;
    this._pointerDown = { x: event.clientX, y: event.clientY };
  }

  _onPointerMove(event) {
    if (this._menuMode || !this.tankRoot) return;
    const spot = this._pickHotspot(event);
    this._setHovered(spot);
  }

  _onPointerUp(event) {
    if (this._menuMode || !this._pointerDown) return;
    const dx = event.clientX - this._pointerDown.x;
    const dy = event.clientY - this._pointerDown.y;
    this._pointerDown = null;
    if (dx * dx + dy * dy > CLICK_DRAG_PX * CLICK_DRAG_PX) return;

    const spot = this._pickHotspot(event);
    if (!spot) return;

    const data = spot.userData.hotspot;
    this.hangarScene.activateHotspot(data);
  }

  _setHovered(spot) {
    if (this._hovered === spot) return;

    if (this._hovered?.userData?.pulse) {
      const { sphere, ring } = this._hovered.userData.pulse;
      sphere.scale.setScalar(1);
      ring.scale.setScalar(1);
    }

    this._hovered = spot;
    this.canvas.style.cursor = spot ? "pointer" : "";

    if (spot) {
      this._setStatus(`${spot.userData.hotspot.label} — клик, чтобы открыть`);
    } else if (this.tankRoot && !this._menuMode) {
      this._setExploreStatus();
    }
  }

  _setExploreStatus() {
    this._setStatus("Крути · кликай маркеры (люки / ЗИП) · «2D вид сверху» — схемы");
  }

  _pulseHotspots(timeSec) {
    for (const spot of this.hotspots) {
      const pulse = spot.userData.pulse;
      if (!pulse) continue;
      const hovered = spot === this._hovered;
      const wave = 1 + Math.sin(timeSec * 2.4 + pulse.t0) * (hovered ? 0.18 : 0.08);
      const boost = hovered ? 1.25 : 1;
      pulse.sphere.scale.setScalar(wave * boost);
      pulse.ring.scale.setScalar((2 - wave) * boost);
      pulse.sphere.material.opacity = hovered ? 0.85 : 0.5;
    }
  }

  /**
   * Корректировка положения точки в 3D (координаты Blender: [X right, Y length, Z up]).
   * Вызов из консоли DevTools:
   *   tank3d.setHotspot("heater-rear-left", -1.2, 2.2, 1.0)
   */
  setHotspot(id, x, y, z) {
    const marker = this.hotspots?.find(
      (m) => m.userData?.hotspot?.id === id || m.userData?.hotspot?.zone === id,
    );
    if (!marker) {
      const available = this.hotspots?.map((m) => m.userData?.hotspot?.id).join(", ");
      console.warn(`[Tank3DView] Точка "${id}" не найдена. Доступные: ${available}`);
      return null;
    }
    const def = HOTSPOT_DEFS.find((d) => d.id === id || d.zone === id);
    if (def) def.blender = [x, y, z];
    marker.position.copy(this._blenderToLocal([x, y, z]));
    console.log(`[Tank3DView] Точка "${id}" перемещена: [${x}, ${y}, ${z}]`);
    return [x, y, z];
  }

  getHotspots() {
    return HOTSPOT_DEFS.map((d) => ({
      id: d.id,
      label: d.label,
      blender: [...d.blender],
      color: `#${d.color.toString(16)}`,
    }));
  }

  _observeResize() {
    const container = this.rootEl?.querySelector(".hangar-view-container");
    if (!container) return;

    const apply = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w < 1 || h < 1) return;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h, false);
    };

    apply();
    this._resizeObserver = new ResizeObserver(apply);
    this._resizeObserver.observe(container);
  }

  _startRenderLoop() {
    const tick = (t) => {
      this._rafId = requestAnimationFrame(tick);
      this.controls?.update();
      if (!this._menuMode) this._pulseHotspots(t * 0.001);
      this.renderer?.render(this.scene, this.camera);
    };
    this._rafId = requestAnimationFrame(tick);
  }

  _setStatus(text) {
    if (this.statusEl) this.statusEl.textContent = text;
  }

  update() {
    // render loop уже крутится отдельно
  }

  dispose() {
    if (this._rafId != null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this._resizeObserver?.disconnect();
    this._resizeObserver = null;
    this.canvas?.removeEventListener("pointerdown", this._onPointerDown);
    this.canvas?.removeEventListener("pointermove", this._onPointerMove);
    this.canvas?.removeEventListener("pointerup", this._onPointerUp);
    if (this.canvas) this.canvas.style.cursor = "";

    this.controls?.dispose();
    this.renderer?.dispose();
    this.scene = null;
    this.tankRoot = null;
    this.hotspotGroup = null;
    this.hotspots = [];
  }
}
