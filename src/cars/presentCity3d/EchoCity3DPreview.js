import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import {
  CAMERA_HOME,
  CAMERA_FOCUS_TARGETS,
  CITY_MODELS,
  CITY_PALETTE,
  COURTS,
  MODEL_ROOT,
  OBSTACLES,
  WORLD_EDGES,
  WORLD_NODES,
} from './city3dConfig.js';

const MATERIAL_ROOT = '/assets/chapter03-3d/materials';
const GRID_STEP = 1;
const NAV_HALF_EXTENT = 39;
const PROP_OBSTACLES = CITY_MODELS
  .filter((spec) => spec.collision)
  .map((spec) => ({ ...spec.collision, center: [spec.position[0], spec.position[2]], sourceId: spec.id }));
const ALL_OBSTACLES = [...OBSTACLES, ...PROP_OBSTACLES];

function configureTexture(texture, { color = false, repeat = [1, 1] } = {}) {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat[0], repeat[1]);
  texture.anisotropy = 8;
  if (color) texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function cloneTexture(texture, repeat, color = false) {
  const clone = texture.clone();
  clone.needsUpdate = true;
  return configureTexture(clone, { color, repeat });
}

function insideCourt(x, z, court) {
  const dx = Math.abs(x - court.center[0]);
  const dz = Math.abs(z - court.center[1]);
  if (court.shape === 'box') {
    return dx <= court.size[0] * 0.5 && dz <= court.size[1] * 0.5;
  }
  const r = court.radius;
  return Math.max(dx, dz) + Math.min(dx, dz) * 0.4142 <= r;
}

function distanceToSegmentSquared(px, pz, ax, az, bx, bz) {
  const vx = bx - ax;
  const vz = bz - az;
  const wx = px - ax;
  const wz = pz - az;
  const len = vx * vx + vz * vz;
  const t = len > 0 ? THREE.MathUtils.clamp((wx * vx + wz * vz) / len, 0, 1) : 0;
  const dx = px - (ax + vx * t);
  const dz = pz - (az + vz * t);
  return dx * dx + dz * dz;
}

function insideObstacle(x, z, obstacle, padding = 0) {
  const dx = Math.abs(x - obstacle.center[0]);
  const dz = Math.abs(z - obstacle.center[1]);
  if (obstacle.type === 'circle') {
    return dx * dx + dz * dz < (obstacle.radius + padding) ** 2;
  }
  return dx < obstacle.size[0] * 0.5 + padding && dz < obstacle.size[1] * 0.5 + padding;
}

function isWalkable(x, z) {
  const inCourt = COURTS.some((court) => insideCourt(x, z, court));
  const inRibbon = WORLD_EDGES.some(([aId, bId]) => {
    const a = WORLD_NODES[aId];
    const b = WORLD_NODES[bId];
    return distanceToSegmentSquared(x, z, a[0], a[1], b[0], b[1]) <= 2.35 ** 2;
  });
  if (!inCourt && !inRibbon) return false;
  return !ALL_OBSTACLES.some((obstacle) => insideObstacle(x, z, obstacle, 0.65));
}

function gridKey(x, z) {
  return `${x},${z}`;
}

function worldToGrid(value) {
  return Math.round(value / GRID_STEP);
}

function gridToWorld(value) {
  return value * GRID_STEP;
}

function nearestWalkableGrid(x, z) {
  const gx = worldToGrid(x);
  const gz = worldToGrid(z);
  if (isWalkable(gridToWorld(gx), gridToWorld(gz))) return [gx, gz];
  for (let radius = 1; radius <= 6; radius += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      for (let dz = -radius; dz <= radius; dz += 1) {
        if (Math.abs(dx) !== radius && Math.abs(dz) !== radius) continue;
        const nx = gx + dx;
        const nz = gz + dz;
        if (isWalkable(gridToWorld(nx), gridToWorld(nz))) return [nx, nz];
      }
    }
  }
  return null;
}

function findPath(start, goal) {
  const startGrid = nearestWalkableGrid(start.x, start.z);
  const goalGrid = nearestWalkableGrid(goal.x, goal.z);
  if (!startGrid || !goalGrid) return [];

  const startKey = gridKey(...startGrid);
  const goalKey = gridKey(...goalGrid);
  const open = [{ point: startGrid, score: 0 }];
  const cameFrom = new Map();
  const cost = new Map([[startKey, 0]]);
  const directions = [
    [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
    [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
  ];

  while (open.length) {
    open.sort((a, b) => a.score - b.score);
    const current = open.shift().point;
    const currentKey = gridKey(...current);
    if (currentKey === goalKey) break;

    for (const [dx, dz, travel] of directions) {
      const next = [current[0] + dx, current[1] + dz];
      if (Math.abs(next[0]) > NAV_HALF_EXTENT || Math.abs(next[1]) > NAV_HALF_EXTENT) continue;
      const wx = gridToWorld(next[0]);
      const wz = gridToWorld(next[1]);
      if (!isWalkable(wx, wz)) continue;
      if (dx && dz) {
        if (!isWalkable(gridToWorld(current[0] + dx), gridToWorld(current[1])) ||
            !isWalkable(gridToWorld(current[0]), gridToWorld(current[1] + dz))) continue;
      }
      const nextKey = gridKey(...next);
      const nextCost = cost.get(currentKey) + travel;
      if (nextCost >= (cost.get(nextKey) ?? Infinity)) continue;
      cost.set(nextKey, nextCost);
      cameFrom.set(nextKey, current);
      const heuristic = Math.hypot(goalGrid[0] - next[0], goalGrid[1] - next[1]);
      open.push({ point: next, score: nextCost + heuristic });
    }
  }

  if (!cameFrom.has(goalKey) && startKey !== goalKey) return [];
  const path = [goalGrid];
  let cursor = goalGrid;
  while (gridKey(...cursor) !== startKey) {
    cursor = cameFrom.get(gridKey(...cursor));
    if (!cursor) return [];
    path.push(cursor);
  }
  path.reverse();
  return path.slice(1).map(([gx, gz]) => new THREE.Vector3(gridToWorld(gx), 0.5, gridToWorld(gz)));
}

async function makeMaterialSet(renderer) {
  const maxAnisotropy = Math.min(12, renderer.capabilities.getMaxAnisotropy());
  const loader = new THREE.TextureLoader();
  const [limestoneImage, heightImage, roughnessImage, darkLimestoneImage, darkImage] = await Promise.all([
    loader.loadAsync(`${MATERIAL_ROOT}/worn-limestone-albedo.webp`),
    loader.loadAsync(`${MATERIAL_ROOT}/worn-limestone-height.webp`),
    loader.loadAsync(`${MATERIAL_ROOT}/worn-limestone-roughness.webp`),
    loader.loadAsync(`${MATERIAL_ROOT}/worn-limestone-dark-albedo.webp`),
    loader.loadAsync(`${MATERIAL_ROOT}/dark-city-cobbles.webp`),
  ]);
  const limestone = configureTexture(limestoneImage, { color: true });
  const height = configureTexture(heightImage);
  const roughness = configureTexture(roughnessImage);
  const darkLimestone = configureTexture(darkLimestoneImage, { color: true });
  const dark = configureTexture(darkImage, { color: true });
  for (const texture of [limestone, height, roughness, darkLimestone, dark]) texture.anisotropy = maxAnisotropy;

  return {
    paving(width, depth, tint = 0xffffff) {
      const repeat = [Math.max(1, width / 6), Math.max(1, depth / 6)];
      return new THREE.MeshStandardMaterial({
        color: tint,
        map: cloneTexture(limestone, repeat, true),
        bumpMap: cloneTexture(height, repeat),
        bumpScale: 0.12,
        roughnessMap: cloneTexture(roughness, repeat),
        roughness: 0.94,
        metalness: 0,
      });
    },
    darkPaving(width, depth) {
      const repeat = [Math.max(1, width / 5.5), Math.max(1, depth / 5.5)];
      return new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: cloneTexture(darkLimestone, repeat, true),
        bumpMap: cloneTexture(height, repeat),
        bumpScale: 0.095,
        roughnessMap: cloneTexture(roughness, repeat),
        roughness: 0.96,
        metalness: 0,
      });
    },
    street: new THREE.MeshStandardMaterial({
      color: 0x514344,
      map: cloneTexture(dark, [14, 12], true),
      roughness: 0.96,
      metalness: 0,
    }),
    earth: new THREE.MeshStandardMaterial({ color: CITY_PALETTE.earth, roughness: 1 }),
    edge: new THREE.MeshStandardMaterial({ color: CITY_PALETTE.stoneEdge, roughness: 0.86, metalness: 0.04 }),
    bronze: new THREE.MeshStandardMaterial({ color: CITY_PALETTE.bronze, roughness: 0.64, metalness: 0.42 }),
    iron: new THREE.MeshStandardMaterial({ color: CITY_PALETTE.iron, roughness: 0.72, metalness: 0.62 }),
    patina: new THREE.MeshStandardMaterial({ color: CITY_PALETTE.patina, roughness: 0.48, metalness: 0.32 }),
    water: new THREE.MeshPhysicalMaterial({
      color: CITY_PALETTE.water,
      roughness: 0.2,
      metalness: 0,
      transmission: 0.12,
      transparent: true,
      opacity: 0.86,
    }),
  };
}

function addShadowFlags(root) {
  root.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (!material) continue;
      if ('roughness' in material) material.roughness = Math.max(material.roughness ?? 0.5, 0.5);
      if ('envMapIntensity' in material) material.envMapIntensity = 0.45;
    }
  });
}

function addCourt(scene, walkMeshes, materials, court) {
  let edgeGeometry;
  let surfaceGeometry;
  let width;
  let depth;
  if (court.shape === 'box') {
    width = court.size[0];
    depth = court.size[1];
    edgeGeometry = new THREE.BoxGeometry(width + 0.75, 0.24, depth + 0.75);
    surfaceGeometry = new THREE.BoxGeometry(width, 0.18, depth);
  } else {
    width = court.radius * 2;
    depth = width;
    edgeGeometry = new THREE.CylinderGeometry(court.radius + 0.45, court.radius + 0.45, 0.24, 8);
    surfaceGeometry = new THREE.CylinderGeometry(court.radius, court.radius, 0.18, 8);
  }
  const edge = new THREE.Mesh(edgeGeometry, materials.edge);
  edge.position.set(court.center[0], 0.02, court.center[1]);
  edge.receiveShadow = true;
  scene.add(edge);

  const surface = new THREE.Mesh(surfaceGeometry, materials.darkPaving(width, depth));
  surface.position.set(court.center[0], 0.19, court.center[1]);
  surface.receiveShadow = true;
  surface.userData.walkable = true;
  walkMeshes.push(surface);
  scene.add(surface);
}

function addRibbon(scene, walkMeshes, materials, a, b, width = 3.05) {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const length = Math.hypot(dx, dz);
  const centerX = (a[0] + b[0]) * 0.5;
  const centerZ = (a[1] + b[1]) * 0.5;
  const angle = Math.atan2(dx, dz);

  const edge = new THREE.Mesh(new THREE.BoxGeometry(width + 0.65, 0.18, length + 0.45), materials.edge);
  edge.position.set(centerX, 0.24, centerZ);
  edge.rotation.y = angle;
  edge.receiveShadow = true;
  scene.add(edge);

  const surface = new THREE.Mesh(new THREE.BoxGeometry(width, 0.14, length), materials.paving(width, length, 0xf2dfc1));
  surface.position.set(centerX, 0.36, centerZ);
  surface.rotation.y = angle;
  surface.receiveShadow = true;
  surface.userData.walkable = true;
  walkMeshes.push(surface);
  scene.add(surface);
}

function addCeremonialPad(scene, walkMeshes, materials, x, z, radius) {
  const edge = new THREE.Mesh(
    new THREE.CylinderGeometry(radius + 0.42, radius + 0.42, 0.2, 8),
    materials.edge,
  );
  edge.position.set(x, 0.27, z);
  edge.receiveShadow = true;
  scene.add(edge);

  const surface = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, 0.16, 8),
    materials.paving(radius * 2, radius * 2),
  );
  surface.position.set(x, 0.41, z);
  surface.receiveShadow = true;
  surface.userData.walkable = true;
  walkMeshes.push(surface);
  scene.add(surface);
}

function addRail(scene, materials) {
  for (const x of [-1.32, 1.32]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 18), materials.iron);
    rail.position.set(x, 0.38, 20.2);
    rail.castShadow = rail.receiveShadow = true;
    scene.add(rail);
  }
  for (let z = 12; z <= 28; z += 2) {
    const sleeper = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.08, 0.19), materials.bronze);
    sleeper.position.set(0, 0.32, z);
    sleeper.castShadow = sleeper.receiveShadow = true;
    scene.add(sleeper);
  }
}

function addLandmarkIslands(scene, materials) {
  const clockRim = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 0.32, 64), materials.bronze);
  clockRim.position.set(0, 0.36, 0);
  clockRim.receiveShadow = true;
  scene.add(clockRim);
  const clockInset = new THREE.Mesh(new THREE.CylinderGeometry(4.1, 4.1, 0.34, 64), materials.patina);
  clockInset.position.set(0, 0.48, 0);
  clockInset.receiveShadow = true;
  scene.add(clockInset);

  const fountainRim = new THREE.Mesh(new THREE.CylinderGeometry(4.45, 4.45, 0.34, 64), materials.edge);
  fountainRim.position.set(20, 0.37, 0);
  fountainRim.receiveShadow = true;
  scene.add(fountainRim);
  const fountainWater = new THREE.Mesh(new THREE.CylinderGeometry(3.85, 3.85, 0.18, 64), materials.water);
  fountainWater.position.set(20, 0.57, 0);
  fountainWater.receiveShadow = true;
  scene.add(fountainWater);
}

function addLamp(scene, materials, x, z) {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 3.9, 12), materials.iron);
  pole.position.y = 1.95;
  pole.castShadow = true;
  group.add(pole);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 0.4, 10), materials.bronze);
  crown.position.y = 3.85;
  crown.castShadow = true;
  group.add(crown);
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 16, 10),
    new THREE.MeshStandardMaterial({ color: 0xffd69a, emissive: 0xffa84c, emissiveIntensity: 2.2, roughness: 0.4 }),
  );
  bulb.position.y = 4.15;
  group.add(bulb);
  group.position.set(x, 0.3, z);
  scene.add(group);
}

function addStreetFurniture(scene, materials) {
  [
    [-8.8, 8.8], [8.8, 8.8], [-8.8, -8.8], [8.8, -8.8],
    [-23.5, 8], [-23.5, -8], [12, 8.5], [28.5, 7], [28.5, -7],
    [-6.5, -15.5], [6.5, -20.5],
  ].forEach(([x, z]) => addLamp(scene, materials, x, z));
}

function addModelSupport(scene, materials, spec) {
  if (!spec.support) return;
  const rotationY = THREE.MathUtils.degToRad(spec.rotationY);
  if (spec.support.type === 'counter') {
    const [width, height, depth] = spec.support.size;
    const counter = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), materials.edge);
    counter.position.set(spec.position[0], 0.5 + height * 0.5, spec.position[2]);
    counter.rotation.y = rotationY;
    counter.castShadow = counter.receiveShadow = true;
    scene.add(counter);
    const top = new THREE.Mesh(new THREE.BoxGeometry(width + 0.14, 0.1, depth + 0.14), materials.bronze);
    top.position.set(spec.position[0], 0.54 + height, spec.position[2]);
    top.rotation.y = rotationY;
    top.castShadow = top.receiveShadow = true;
    scene.add(top);
    return;
  }
  if (spec.support.type === 'pole') {
    const height = spec.support.height;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, height, 14), materials.iron);
    pole.position.set(spec.position[0], 0.5 + height * 0.5, spec.position[2]);
    pole.castShadow = pole.receiveShadow = true;
    scene.add(pole);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 0.22, 14), materials.bronze);
    collar.position.set(spec.position[0], 0.61, spec.position[2]);
    collar.castShadow = collar.receiveShadow = true;
    scene.add(collar);
  }
}

function makePlayer(scene) {
  const group = new THREE.Group();
  const coat = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.38, 0.95, 6, 10),
    new THREE.MeshStandardMaterial({ color: 0x4c2420, roughness: 0.82 }),
  );
  coat.position.y = 1.02;
  coat.castShadow = true;
  group.add(coat);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 18, 12),
    new THREE.MeshStandardMaterial({ color: 0xb8794f, roughness: 0.76 }),
  );
  head.position.y = 2.05;
  head.castShadow = true;
  group.add(head);
  const marker = new THREE.Mesh(
    new THREE.RingGeometry(0.5, 0.62, 32),
    new THREE.MeshBasicMaterial({ color: CITY_PALETTE.teal, transparent: true, opacity: 0.75, side: THREE.DoubleSide }),
  );
  marker.rotation.x = -Math.PI / 2;
  marker.position.y = 0.05;
  group.add(marker);
  group.position.set(0, 0.49, 16.8);
  scene.add(group);
  return group;
}

function makeDestinationMarker(scene) {
  const material = new THREE.MeshBasicMaterial({ color: CITY_PALETTE.amber, transparent: true, opacity: 0 });
  const marker = new THREE.Mesh(new THREE.RingGeometry(0.44, 0.65, 40), material);
  marker.rotation.x = -Math.PI / 2;
  marker.position.y = 0.51;
  marker.visible = false;
  scene.add(marker);
  return marker;
}

function createRenderer(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  return renderer;
}

function requestedCameraPreset() {
  const focus = new URLSearchParams(window.location.search).get('focus');
  const target = CAMERA_FOCUS_TARGETS[focus];
  if (!target) return { ...CAMERA_HOME, focus: 'overview' };
  const dx = target[0] - CAMERA_HOME.target[0];
  const dz = target[2] - CAMERA_HOME.target[2];
  return {
    focus,
    target,
    position: [CAMERA_HOME.position[0] + dx, CAMERA_HOME.position[1], CAMERA_HOME.position[2] + dz],
    zoom: 3,
  };
}

function createCamera(container, preset) {
  const aspect = container.clientWidth / container.clientHeight;
  const halfHeight = 35;
  const camera = new THREE.OrthographicCamera(-halfHeight * aspect, halfHeight * aspect, halfHeight, -halfHeight, 0.1, 320);
  camera.position.fromArray(preset.position);
  camera.lookAt(...preset.target);
  camera.zoom = preset.zoom;
  camera.updateProjectionMatrix();
  return camera;
}

function addLights(scene) {
  const hemi = new THREE.HemisphereLight(0xaac8c4, 0x4a2a20, 1.8);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffd39a, 4.3);
  sun.position.set(-34, 52, 26);
  sun.target.position.set(4, 0, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -52;
  sun.shadow.camera.right = 52;
  sun.shadow.camera.top = 52;
  sun.shadow.camera.bottom = -52;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 135;
  sun.shadow.bias = -0.00025;
  sun.shadow.normalBias = 0.035;
  scene.add(sun, sun.target);

  const fill = new THREE.DirectionalLight(0x5b9ca4, 1.1);
  fill.position.set(20, 28, -30);
  scene.add(fill);
}

export class EchoCity3DPreview {
  constructor({ container, statusElement, loadingPanel, loadingLabel, loadingCount, loadingFill }) {
    this.container = container;
    this.statusElement = statusElement;
    this.loadingPanel = loadingPanel;
    this.loadingLabel = loadingLabel;
    this.loadingCount = loadingCount;
    this.loadingFill = loadingFill;
    this.expectedUniqueModels = CITY_MODELS.filter((spec) => !spec.cloneOf).length;
    this.loadedModelIds = [];
    this.loadErrors = [];
    this.walkMeshes = [];
    this.path = [];
    this.clickCount = 0;
    this.lastClick = null;
    this.elapsed = 0;
    this.lastFrame = performance.now();
    this.fps = 0;
    this.fpsFrames = 0;
    this.fpsWindow = 0;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(CITY_PALETTE.sky);
    this.scene.fog = new THREE.FogExp2(CITY_PALETTE.fog, 0.0085);
    this.renderer = createRenderer(container);
    this.cameraPreset = requestedCameraPreset();
    this.camera = createCamera(container, this.cameraPreset);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.fromArray(this.cameraPreset.target);
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minZoom = 0.72;
    this.controls.maxZoom = 3.2;
    this.controls.minPolarAngle = THREE.MathUtils.degToRad(35);
    this.controls.maxPolarAngle = THREE.MathUtils.degToRad(72);
    this.controls.mouseButtons.LEFT = null;
    this.controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
    this.controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;

    addLights(this.scene);
    this.materials = null;
    this.player = makePlayer(this.scene);
    this.destinationMarker = makeDestinationMarker(this.scene);
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.clock = new THREE.Clock();
    this.modelCache = new Map();

    this.onResize = this.onResize.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.animate = this.animate.bind(this);
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    this.renderer.domElement.addEventListener('pointerup', this.onPointerUp);
  }

  async initialize() {
    this.materials = await makeMaterialSet(this.renderer);
    this.buildGround();
  }

  buildGround() {
    const base = new THREE.Mesh(new THREE.BoxGeometry(84, 0.5, 74), this.materials.earth);
    base.position.y = -0.42;
    base.receiveShadow = true;
    this.scene.add(base);

    const street = new THREE.Mesh(new THREE.BoxGeometry(76, 0.24, 66), this.materials.street);
    street.position.y = -0.12;
    street.receiveShadow = true;
    this.scene.add(street);

    for (const [aId, bId] of WORLD_EDGES) {
      addRibbon(this.scene, this.walkMeshes, this.materials, WORLD_NODES[aId], WORLD_NODES[bId]);
    }
    for (const court of COURTS) addCourt(this.scene, this.walkMeshes, this.materials, court);
    addCeremonialPad(this.scene, this.walkMeshes, this.materials, 0, 0, 9.15);
    addCeremonialPad(this.scene, this.walkMeshes, this.materials, 20, 0, 8.1);
    addLandmarkIslands(this.scene, this.materials);
    addRail(this.scene, this.materials);
    addStreetFurniture(this.scene, this.materials);

    // Use one continuous, invisible plane for pointer projection. The visible
    // paving is deliberately layered at several heights, so raycasting those
    // small meshes directly leaves cracks between courts and path ribbons.
    // Walkability is still decided by the authored courts/graph below.
    const navMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      colorWrite: false,
      side: THREE.DoubleSide,
    });
    this.navPlane = new THREE.Mesh(new THREE.PlaneGeometry(84, 74), navMaterial);
    this.navPlane.rotation.x = -Math.PI / 2;
    this.navPlane.position.y = 0.64;
    this.navPlane.name = 'pointer-navigation-plane';
    this.scene.add(this.navPlane);
  }

  async loadModels() {
    await MeshoptDecoder.ready;
    const manager = new THREE.LoadingManager();
    const loader = new GLTFLoader(manager);
    loader.setMeshoptDecoder(MeshoptDecoder);
    const uniqueModels = CITY_MODELS.filter((spec) => !spec.cloneOf);
    let completed = 0;
    const total = uniqueModels.length;

    manager.onProgress = (_url, loaded, itemTotal) => {
      const ratio = itemTotal ? loaded / itemTotal : 0;
      this.loadingFill.style.width = `${Math.round(ratio * 100)}%`;
    };

    const loadOne = async (spec) => {
      try {
        const gltf = await loader.loadAsync(`${MODEL_ROOT}/${spec.file}`);
        const root = gltf.scene;
        root.name = spec.id;
        addShadowFlags(root);
        this.modelCache.set(spec.id, root);
        this.placeModel(root, spec);
        this.loadedModelIds.push(spec.id);
      } catch (error) {
        this.loadErrors.push({ id: spec.id, message: error?.message || String(error) });
        console.error(`Failed to load ${spec.id}`, error);
      } finally {
        completed += 1;
        this.loadingCount.textContent = `${completed} / ${total}`;
        this.loadingLabel.textContent = completed === total ? 'ASSEMBLING LIVE SCENE' : 'STREAMING GLB MODELS';
      }
    };

    await Promise.all(uniqueModels.map(loadOne));
    for (const spec of CITY_MODELS.filter((item) => item.cloneOf)) {
      const source = this.modelCache.get(spec.cloneOf);
      if (!source) continue;
      const clone = source.clone(true);
      clone.name = spec.id;
      this.placeModel(clone, spec);
      this.loadedModelIds.push(spec.id);
    }

    const ok = this.loadErrors.length === 0;
    this.statusElement.textContent = ok
      ? `REAL-TIME GLB · ${total} ASSETS LIVE`
      : `REAL-TIME GLB · ${this.loadErrors.length} LOAD ERROR`;
    this.loadingFill.style.width = '100%';
    this.loadingCount.textContent = ok ? `${total} / ${total}` : `${completed} / ${total}`;
    this.loadingLabel.textContent = ok ? 'LIVE 3D READY' : 'PARTIAL LOAD';
    setTimeout(() => this.loadingPanel.classList.add('done'), 650);
  }

  placeModel(root, spec) {
    root.position.fromArray(spec.position);
    root.rotation.y = THREE.MathUtils.degToRad(spec.rotationY);
    root.scale.setScalar(spec.scale);
    if (spec.alignToGround) {
      root.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(root);
      root.position.y += spec.position[1] - bounds.min.y;
      root.updateMatrixWorld(true);
    }
    root.userData.assetId = spec.id;
    root.userData.assetCategory = spec.category || 'landmark';
    root.userData.interactionRole = spec.role || null;
    addModelSupport(this.scene, this.materials, spec);
    this.scene.add(root);
  }

  resetCamera() {
    this.camera.position.fromArray(CAMERA_HOME.position);
    this.camera.zoom = CAMERA_HOME.zoom;
    this.controls.target.fromArray(CAMERA_HOME.target);
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  onPointerUp(event) {
    if (event.button !== 0) return;
    if (!this.navPlane) return;
    this.clickCount += 1;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.camera.updateMatrixWorld();
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const [hit] = this.raycaster.intersectObject(this.navPlane, false);
    if (!hit) {
      this.lastClick = { result: 'miss-ray' };
      return;
    }
    if (!isWalkable(hit.point.x, hit.point.z)) {
      this.lastClick = {
        result: 'blocked',
        x: Number(hit.point.x.toFixed(2)),
        z: Number(hit.point.z.toFixed(2)),
      };
      return;
    }
    const target = new THREE.Vector3(hit.point.x, 0.5, hit.point.z);
    const nextPath = findPath(this.player.position, target);
    if (!nextPath.length) {
      this.lastClick = { result: 'no-path', x: target.x, z: target.z };
      return;
    }
    nextPath[nextPath.length - 1].copy(target);
    this.path = nextPath;
    this.destinationMarker.position.set(target.x, 0.52, target.z);
    this.destinationMarker.visible = true;
    this.destinationMarker.material.opacity = 0.82;
    this.lastClick = { result: 'path', x: target.x, z: target.z, nodes: nextPath.length };
  }

  onKeyDown(event) {
    if (event.key.toLowerCase() === 'r') this.resetCamera();
    if (event.key.toLowerCase() === 'f') {
      if (!document.fullscreenElement) this.container.requestFullscreen?.();
      else document.exitFullscreen?.();
    }
  }

  onResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    const aspect = width / height;
    const halfHeight = 35;
    this.camera.left = -halfHeight * aspect;
    this.camera.right = halfHeight * aspect;
    this.camera.top = halfHeight;
    this.camera.bottom = -halfHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  update(dt) {
    this.elapsed += dt;
    this.controls.update();
    if (this.path.length) {
      const target = this.path[0];
      const delta = target.clone().sub(this.player.position);
      delta.y = 0;
      const distance = delta.length();
      const travel = 5.4 * dt;
      if (distance <= travel) {
        this.player.position.x = target.x;
        this.player.position.z = target.z;
        this.path.shift();
      } else {
        delta.normalize();
        this.player.position.addScaledVector(delta, travel);
        this.player.rotation.y = Math.atan2(delta.x, delta.z);
      }
      if (!this.path.length) this.destinationMarker.visible = false;
    }

    if (this.destinationMarker.visible) {
      const pulse = 1 + Math.sin(this.elapsed * 5.5) * 0.12;
      this.destinationMarker.scale.setScalar(pulse);
      this.destinationMarker.material.opacity = 0.55 + Math.sin(this.elapsed * 5.5) * 0.22;
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
    this.statusElement.dataset.player = `${this.player.position.x.toFixed(2)},${this.player.position.z.toFixed(2)}`;
    this.statusElement.dataset.pathNodes = String(this.path.length);
    this.statusElement.dataset.clickCount = String(this.clickCount);
    this.statusElement.dataset.lastClick = JSON.stringify(this.lastClick);
    this.statusElement.dataset.triangles = String(this.renderer.info.render.triangles);
    this.statusElement.dataset.cameraFocus = this.cameraPreset.focus;
  }

  animate(now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - this.lastFrame) / 1000));
    this.lastFrame = now;
    this.update(dt);
    this.render();
    this.fpsFrames += 1;
    this.fpsWindow += dt;
    if (this.fpsWindow >= 0.5) {
      this.fps = Math.round(this.fpsFrames / this.fpsWindow);
      this.fpsFrames = 0;
      this.fpsWindow = 0;
    }
    this.frameHandle = requestAnimationFrame(this.animate);
  }

  start() {
    this.lastFrame = performance.now();
    this.frameHandle = requestAnimationFrame(this.animate);
  }

  advanceTime(ms) {
    const steps = Math.max(1, Math.round(ms / (1000 / 60)));
    for (let index = 0; index < steps; index += 1) this.update(1 / 60);
    this.render();
  }

  textState() {
    return JSON.stringify({
      mode: 'echo-city-real-time-3d-preview',
      coordinateSystem: 'Three.js world; +X east/right, +Y up, +Z south/toward tram',
      models: {
        expectedUnique: this.expectedUniqueModels,
        expectedInstances: CITY_MODELS.length,
        loadedInstances: [...this.loadedModelIds],
        errors: [...this.loadErrors],
      },
      narrativeProps: CITY_MODELS
        .filter((spec) => spec.category === 'prop')
        .map((spec) => ({
          id: spec.id,
          label: spec.label,
          role: spec.role,
          position: [spec.position[0], spec.position[1], spec.position[2]],
          collidable: Boolean(spec.collision),
        })),
      player: {
        x: Number(this.player.position.x.toFixed(2)),
        y: Number(this.player.position.y.toFixed(2)),
        z: Number(this.player.position.z.toFixed(2)),
        pathNodesRemaining: this.path.length,
      },
      camera: {
        type: 'orthographic',
        focus: this.cameraPreset.focus,
        x: Number(this.camera.position.x.toFixed(2)),
        y: Number(this.camera.position.y.toFixed(2)),
        z: Number(this.camera.position.z.toFixed(2)),
        zoom: Number(this.camera.zoom.toFixed(2)),
      },
      renderer: {
        fps: this.fps,
        drawCalls: this.renderer.info.render.calls,
        triangles: this.renderer.info.render.triangles,
      },
      interaction: 'left click pale paving to A* walk; right drag inspect; wheel zoom; R camera reset; F fullscreen',
    });
  }
}
