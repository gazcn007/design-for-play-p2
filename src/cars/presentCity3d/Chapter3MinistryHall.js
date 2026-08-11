import * as THREE from 'three';

export const MINISTRY_POSITIONS = Object.freeze({
  // The imported shell has a 0.32 m stone floor. Actor hosts retain the
  // legacy +0.49 m capsule anchor, so 0.82 places model soles on that floor.
  playerStart: [-0.4, 0.82, 3.35],
  lev: [1.15, 0.82, 3.45],
  queueDispenser: [-3.55, -0.06, 1.85],
  queueApproach: [-2.65, 0.82, 2.25],
  sava: [-1.4, 0.82, -3.7],
  savaApproach: [-1.4, 0.82, -1.5],
  nika: [3.2, 0.82, -3.7],
  nikaApproach: [3.2, 0.82, -1.45],
  bosko: [-3.75, 0.82, -0.1],
  boskoApproach: [-2.75, 0.82, 0.2],
  discardedPrint: [5.15, 0.77, -2.9],
  discardedPrintApproach: [4.1, 0.5, -1.35],
});

function material(color, roughness = 0.82, metalness = 0.02) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function addBox(group, size, position, meshMaterial, name = '') {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), meshMaterial);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = name;
  group.add(mesh);
  return mesh;
}

function addCylinder(group, radius, height, position, meshMaterial, name = '') {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 14), meshMaterial);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.name = name;
  group.add(mesh);
  return mesh;
}

function makeActor(group, { name, color, position, scale = 1 }) {
  const actor = new THREE.Group();
  actor.name = name;
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.38 * scale, 0.86 * scale, 5, 10),
    material(color),
  );
  body.position.y = 0.92 * scale;
  body.castShadow = true;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.27 * scale, 12, 10),
    material(0xc7a27f, 0.94),
  );
  head.position.y = 1.72 * scale;
  head.castShadow = true;
  actor.add(body, head);
  actor.position.fromArray(position);
  group.add(actor);
  return actor;
}

function makeLabel(text, width = 512, height = 128) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  context.fillStyle = '#d5ceb8';
  context.fillRect(0, 0, width, height);
  context.fillStyle = '#253538';
  context.font = '700 50px Georgia, serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, width / 2, height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
}

function makeQueueDispenser(group, brass, enamel, paper) {
  const dispenser = new THREE.Group();
  dispenser.name = 'ministry-queue-dispenser';
  addBox(dispenser, [0.78, 1.34, 0.64], [0, 1.05, 0], enamel, 'queue-machine-body');
  addBox(dispenser, [0.54, 0.12, 0.18], [0, 0.83, 0.38], paper, 'queue-ticket-slot');
  const lever = addCylinder(dispenser, 0.07, 0.72, [0.54, 1.35, 0], brass, 'queue-lever');
  lever.rotation.z = -0.45;
  addCylinder(dispenser, 0.18, 0.18, [0.34, 1.08, 0], brass, 'queue-lever-pivot').rotation.z = Math.PI / 2;
  addBox(dispenser, [0.38, 0.08, 0.28], [0, 0.56, 0.28], paper, 'queue-paper-roll');
  const ticket = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.26), makeLabel('M-17', 256, 128));
  ticket.name = 'queue-number-m17';
  ticket.position.set(0, 0.56, 0.44);
  ticket.rotation.x = -0.32;
  ticket.visible = false;
  dispenser.add(ticket);
  dispenser.position.fromArray(MINISTRY_POSITIONS.queueDispenser);
  group.add(dispenser);
  return { dispenser, lever, ticket };
}

export function createChapter3MinistryHall(scene) {
  const group = new THREE.Group();
  group.name = 'chapter-03-ministry-public-hall';
  group.visible = false;

  const stone = material(0x999b91, 0.92);
  const wall = material(0x758b8e, 0.9);
  const wallDark = material(0x3f5559, 0.88);
  const wood = material(0x674638, 0.82);
  const enamel = material(0x5e6b5c, 0.62, 0.12);
  const brass = material(0xa77c42, 0.45, 0.5);
  const leather = material(0x865746, 0.72);
  const paper = material(0xe4dcc3, 0.96);

  addBox(group, [18, 0.32, 18], [0, 0.16, 2.2], stone, 'ministry-floor');
  addBox(group, [18, 5.4, 0.42], [0, 2.7, -6.65], wall, 'ministry-back-wall');
  addBox(group, [0.42, 1.5, 18], [-8.8, 0.75, 2.2], wallDark, 'ministry-left-wall');
  addBox(group, [0.42, 1.5, 18], [8.8, 0.75, 2.2], wallDark, 'ministry-right-wall');
  addBox(group, [17.2, 0.22, 1.8], [0, 2.75, -5.45], wood, 'ministry-counter-canopy');
  addBox(group, [17.2, 1.15, 1.45], [0, 0.9, -4.75], wood, 'ministry-public-counter');
  addBox(group, [17.2, 0.12, 1.8], [0, 1.52, -4.35], brass, 'ministry-counter-cap');

  const hallLabel = new THREE.Mesh(new THREE.PlaneGeometry(5.3, 1.05), makeLabel('PUBLIC SERVICES'));
  hallLabel.position.set(0, 3.72, -6.42);
  group.add(hallLabel);

  for (const x of [-6.5, -2.2, 2.2, 6.5]) {
    addBox(group, [0.08, 2.2, 0.08], [x, 2.12, -4.0], brass);
  }

  for (const x of [-2.7, 2.7]) {
    for (const z of [2.2, 5.5]) addCylinder(group, 0.1, 1.2, [x, 0.76, z], brass);
  }
  // The two rails create a simple switchback without turning the hall into a maze.
  addBox(group, [5.4, 0.06, 0.09], [0, 1.23, 2.2], leather, 'queue-rope-near');
  addBox(group, [5.4, 0.06, 0.09], [0, 1.23, 5.5], leather, 'queue-rope-far');

  for (const z of [-0.8, 0.5, 1.8]) {
    addBox(group, [2.5, 0.16, 0.72], [-5.7, 0.76, z], leather, 'ministry-waiting-bench');
    addBox(group, [2.5, 0.82, 0.14], [-5.7, 1.15, z - 0.28], leather);
  }

  const queue = makeQueueDispenser(group, brass, enamel, paper);
  const sava = makeActor(group, { name: 'ministry-sava-placeholder', color: 0x594f43, position: MINISTRY_POSITIONS.sava });
  const nika = makeActor(group, { name: 'ministry-nika-placeholder', color: 0x53656a, position: MINISTRY_POSITIONS.nika, scale: 0.94 });
  const bosko = makeActor(group, { name: 'ministry-bosko-placeholder', color: 0x6d6159, position: MINISTRY_POSITIONS.bosko, scale: 1.02 });
  addBox(group, [2.2, 1.35, 0.75], [3.2, 1.16, -5.35], enamel, 'nika-terminal');
  addBox(group, [0.9, 0.35, 0.65], [4.65, 1.72, -5.08], paper, 'nika-printer');
  addBox(group, [1.0, 0.72, 0.82], [5.3, 0.52, -3.35], wallDark, 'ministry-waste-bin');
  const discardedPrint = addBox(
    group,
    [0.78, 0.035, 0.5],
    MINISTRY_POSITIONS.discardedPrint,
    paper,
    'discarded-maintenance-print',
  );
  discardedPrint.rotation.y = -0.28;
  discardedPrint.rotation.x = -0.08;
  discardedPrint.visible = false;

  const ambient = new THREE.HemisphereLight(0xdbe7e4, 0x493a32, 1.85);
  group.add(ambient);
  const key = new THREE.DirectionalLight(0xffd3a0, 3.25);
  key.position.set(-5, 10, 8);
  key.castShadow = true;
  group.add(key);
  const warm = new THREE.PointLight(0xffd8a0, 31, 23, 1.7);
  warm.position.set(-4.2, 4.6, 3.4);
  group.add(warm);
  const cool = new THREE.PointLight(0x88b5bd, 23, 21, 1.8);
  cool.position.set(5.5, 3.8, -1.8);
  group.add(cool);
  const counterPractical = new THREE.PointLight(0xffbd72, 20, 11, 1.9);
  counterPractical.position.set(1.5, 3.0, -4.4);
  group.add(counterPractical);

  scene.add(group);
  return {
    group,
    queueDispenser: queue.dispenser,
    queueLever: queue.lever,
    queueTicket: queue.ticket,
    sava,
    nika,
    bosko,
    discardedPrint,
  };
}
