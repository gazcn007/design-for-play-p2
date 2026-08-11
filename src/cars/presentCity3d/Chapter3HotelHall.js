import * as THREE from 'three';

export const HOTEL_POSITIONS = Object.freeze({
  playerStart: [0, 0.5, 5.2], lev: [-1.3, 0.5, 4.7], hana: [0.3, 0, -1.8], deskApproach: [0.4, 0.5, 0.3],
  irena: [3.35, 0, 2.55], irenaApproach: [2.1, 0.5, 2.25], vesna: [3.55, 0, 0.7], vesnaApproach: [2.2, 0.5, 1.0],
  daro: [-3.55, 0, -3.25], daroApproach: [-2.2, 0.5, -2.55],
  corridorEntrance: [-3.55, 1.25, 0.5], corridorEntranceApproach: [-2.45, 0.5, 0.7],
  lobbyStairArrival: [-2.35, 0.5, 0.7],
  lobbyExit: [0, 1.25, 4.82], lobbyExitApproach: [0, 0.5, 4.25],
  corridorPlayerStart: [0, 0.5, 5.8], corridorLev: [-0.85, 0.5, 5.05],
  corridorRoomExitStart: [0, 0.5, -6.1],
  butchRoomDoor: [0, 1.25, -7.08], butchRoomDoorApproach: [0, 0.5, -6.05],
  corridorStairExit: [0, 1.25, 7.05], corridorStairExitApproach: [0, 0.5, 6.1],
  roomPlayerStart: [0, 0.5, -8.65], roomLev: [1.1, 0.5, -9.3],
  evidenceTable: [-1.45, 0.5, -11.45], evidenceApproach: [-0.45, 0.5, -10.25],
  bed: [1.75, 0.35, -12.55], bedApproach: [0.8, 0.5, -11.25],
  roomExit: [0, 1.25, -7.08], roomExitApproach: [0, 0.5, -8.05],
  levDoorThreshold: [0, 0.5, -6.15],
  levCorridorExit: [0, 0.5, 6.35],
});

function actor(color, position) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.82, 5, 10), new THREE.MeshStandardMaterial({ color, roughness: 0.82 }));
  body.position.y = 0.92;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 12, 10), new THREE.MeshStandardMaterial({ color: 0xb88f70, roughness: 0.94 }));
  head.position.y = 1.7;
  group.add(body, head);
  group.position.set(...position);
  return group;
}

function addRoomShell(group, mat, { floorColor, wallColor, rugColor }) {
  const floor = new THREE.Mesh(new THREE.BoxGeometry(11, 0.18, 10), mat(floorColor));
  floor.position.y = -0.1;
  const rug = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.03, 6.4), mat(rugColor, 0.95));
  rug.position.set(0, 0.03, 1.2);
  group.add(floor, rug);
  for (const x of [-4.7, 4.7]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.8, 10), mat(wallColor, 0.96));
    wall.position.set(x, 1.4, 0);
    group.add(wall);
  }
  const back = new THREE.Mesh(new THREE.BoxGeometry(9.6, 2.8, 0.2), mat(wallColor, 0.96));
  back.position.set(0, 1.4, -4.8);
  group.add(back);
}

export function createChapter3HotelHall(scene) {
  const group = new THREE.Group();
  group.name = 'chapter-03-copper-heron-greybox';
  const lobbyGroup = new THREE.Group();
  lobbyGroup.name = 'chapter-03-copper-heron-lobby-greybox';
  const corridorGroup = new THREE.Group();
  corridorGroup.name = 'chapter-03-copper-heron-corridor-greybox';
  const roomGroup = new THREE.Group();
  roomGroup.name = 'chapter-03-butch-private-room-greybox';
  const mat = (color, roughness = 0.9) => new THREE.MeshStandardMaterial({ color, roughness });

  addRoomShell(lobbyGroup, mat, { floorColor: 0x574b3d, wallColor: 0x857965, rugColor: 0x6d3e37 });
  const desk = new THREE.Mesh(new THREE.BoxGeometry(5.8, 1.2, 1.15), mat(0x38271d, 0.78));
  desk.position.set(0, 0.6, -0.65);
  const register = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.08, 1.05), mat(0xc8b68f, 0.94));
  register.position.set(0.55, 1.24, -0.52);
  register.rotation.y = -0.12;
  const hana = actor(0x70574a, HOTEL_POSITIONS.hana);
  const irena = actor(0x4d6670, HOTEL_POSITIONS.irena);
  const vesna = actor(0x6e5b45, HOTEL_POSITIONS.vesna);
  const daro = actor(0x4c5145, HOTEL_POSITIONS.daro);
  const lobbyExit = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.5, 0.18), mat(0x38271d, 0.82));
  lobbyExit.position.set(...HOTEL_POSITIONS.lobbyExit);
  const corridorEntrance = new THREE.Mesh(new THREE.BoxGeometry(1.35, 2.5, 0.18), mat(0x4c3021, 0.82));
  corridorEntrance.position.set(...HOTEL_POSITIONS.corridorEntrance);
  corridorEntrance.rotation.y = Math.PI / 2;
  for (let index = 0; index < 4; index += 1) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.18 + index * 0.16, 0.6), mat(0x665748, 0.9));
    step.position.set(-2.9 - index * 0.34, 0.09 + index * 0.08, 1.9 - index * 0.42);
    lobbyGroup.add(step);
  }
  lobbyGroup.add(desk, register, hana, irena, vesna, daro, lobbyExit, corridorEntrance);
  lobbyGroup.add(new THREE.HemisphereLight(0xb9c9c5, 0x1b100b, 1.28));
  const lobbyKey = new THREE.PointLight(0xffb56f, 28, 18, 1.8);
  lobbyKey.position.set(-1.8, 4.2, 1.5);
  const lobbyWindowFill = new THREE.PointLight(0x6d9eaa, 17, 15, 1.9);
  lobbyWindowFill.position.set(4.0, 3.0, -2.5);
  const lobbyDeskLight = new THREE.PointLight(0xffd091, 24, 10, 1.9);
  lobbyDeskLight.position.set(0.4, 2.8, -0.4);
  const lobbyDoorLight = new THREE.PointLight(0xd7783c, 17, 11, 1.9);
  lobbyDoorLight.position.set(0, 2.3, 4.25);
  lobbyGroup.add(lobbyKey, lobbyWindowFill, lobbyDeskLight, lobbyDoorLight);

  const corridorFloor = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.18, 15.2), mat(0x413c35, 0.95));
  corridorFloor.position.y = -0.1;
  const corridorRunner = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.03, 13.6), mat(0x603c36, 0.96));
  corridorRunner.position.set(0, 0.03, -0.1);
  corridorGroup.add(corridorFloor, corridorRunner);
  for (const x of [-3.6, 3.6]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.8, 15.2), mat(0x777063, 0.96));
    wall.position.set(x, 1.4, 0);
    corridorGroup.add(wall);
  }
  for (const x of [-2.65, 2.65]) {
    const endWall = new THREE.Mesh(new THREE.BoxGeometry(2.1, 2.8, 0.2), mat(0x777063, 0.96));
    endWall.position.set(x, 1.4, -7.5);
    corridorGroup.add(endWall);
  }

  const backgroundDoors = [];
  const doorZs = [4.2, 1.2, -1.8, -4.8];
  for (const side of [-1, 1]) {
    for (const [index, z] of doorZs.entries()) {
      const door = new THREE.Mesh(new THREE.BoxGeometry(1.45, 2.45, 0.16), mat(0x493529, 0.88));
      door.position.set(side * 3.48, 1.23, z);
      door.rotation.y = Math.PI / 2;
      door.name = `copper-heron-background-room-${side < 0 ? 'left' : 'right'}-${index + 1}`;
      const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.04), mat(0x9a8762, 0.76));
      plaque.position.set(0, 0.48, -0.11);
      door.add(plaque);
      backgroundDoors.push(door);
      corridorGroup.add(door);
    }
  }
  const butchRoomDoor = new THREE.Group();
  butchRoomDoor.position.set(...HOTEL_POSITIONS.butchRoomDoor);
  butchRoomDoor.name = 'copper-heron-butch-room-door';
  const butchDoorLeaf = new THREE.Mesh(new THREE.BoxGeometry(1.55, 2.55, 0.2), mat(0x5f3d2b, 0.8));
  butchDoorLeaf.position.y = 0;
  const butchPlaque = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.22, 0.05), mat(0xc0a36a, 0.68));
  butchPlaque.position.set(-0.13, 0.52, 0);
  butchDoorLeaf.add(butchPlaque);
  butchRoomDoor.add(butchDoorLeaf);
  const corridorStairExit = new THREE.Mesh(new THREE.BoxGeometry(1.55, 2.5, 0.18), mat(0x38271d, 0.82));
  corridorStairExit.position.set(...HOTEL_POSITIONS.corridorStairExit);
  for (const z of [4.7, 1.6, -1.5, -4.6]) {
    const light = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.08, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xe4c58a, emissive: 0x8e5b2f, emissiveIntensity: 1.2, roughness: 0.5 }),
    );
    light.position.set(0, 2.55, z);
    const pool = new THREE.PointLight(0xe8aa67, 12, 7.5, 1.85);
    pool.position.set(0, 2.3, z);
    corridorGroup.add(light, pool);
  }
  corridorGroup.add(butchRoomDoor, corridorStairExit);
  corridorGroup.add(new THREE.HemisphereLight(0x9fb0ae, 0x160c08, 1.12));
  const corridorNearLight = new THREE.PointLight(0xe9aa68, 21, 13, 1.85);
  corridorNearLight.position.set(-0.5, 3.25, 3.5);
  const corridorFarLight = new THREE.PointLight(0xb97952, 20, 13, 1.85);
  corridorFarLight.position.set(0.7, 3.15, -4.6);
  corridorGroup.add(corridorNearLight, corridorFarLight);
  corridorGroup.visible = false;

  const roomFloor = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.18, 7.4), mat(0x48443e, 0.94));
  roomFloor.position.set(0, -0.1, -11.2);
  const roomRug = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.03, 4.6), mat(0x3f5860, 0.95));
  roomRug.position.set(0, 0.03, -11.2);
  for (const x of [-3.6, 3.6]) {
    const roomSideWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.8, 7.4), mat(0x766f63, 0.96));
    roomSideWall.position.set(x, 1.4, -11.2);
    roomGroup.add(roomSideWall);
  }
  const roomBackWall = new THREE.Mesh(new THREE.BoxGeometry(7.4, 2.8, 0.2), mat(0x766f63, 0.96));
  roomBackWall.position.set(0, 1.4, -14.9);
  roomGroup.add(roomFloor, roomRug, roomBackWall);
  const evidenceTable = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.78, 1.7), mat(0x463126, 0.8));
  evidenceTable.position.set(...HOTEL_POSITIONS.evidenceTable);
  const evidencePapers = [];
  const paperLayouts = [
    ['oil-route', 'Oil route sketch', -0.78, 0.43, -0.34, -0.12, 0.82, 0.54, 0xcdbf9e],
    ['issue-copy', 'Municipal issue copy', 0.02, 0.44, -0.28, 0.08, 0.76, 0.58, 0xb9c7bd],
    ['order-c441', 'Maintenance order C-441', 0.75, 0.45, -0.18, -0.1, 0.8, 0.56, 0xd0b6a0],
    ['witness-notes', 'Witness notes', -0.42, 0.46, 0.38, 0.16, 0.9, 0.52, 0xc8c0a6],
    ['reservation', 'Eastbound reservation', 0.5, 0.47, 0.4, -0.06, 0.72, 0.5, 0xd7c89f],
  ];
  const evidencePaperSpecs = [];
  for (const [id, label, x, y, z, rotation, width, depth, color] of paperLayouts) {
    const paper = new THREE.Mesh(new THREE.BoxGeometry(width, 0.045, depth), mat(color, 0.96));
    paper.position.set(evidenceTable.position.x + x, evidenceTable.position.y + y, evidenceTable.position.z + z);
    paper.rotation.y = rotation;
    paper.name = `hotel-evidence-paper-${id}`;
    paper.userData.hotelPaperId = id;
    paper.userData.hotelPaperLabel = label;
    evidencePapers.push(paper);
    evidencePaperSpecs.push({ id, label, paper, approach: HOTEL_POSITIONS.evidenceApproach });
    roomGroup.add(paper);
  }
  const bed = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.55, 1.75), mat(0x6a7274, 0.96));
  bed.position.set(...HOTEL_POSITIONS.bed);
  const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.18, 1.25), mat(0xb9b1a1, 0.98));
  pillow.position.set(-0.95, 0.38, 0);
  bed.add(pillow);
  const washstand = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 0.7), mat(0x3e332b, 0.86));
  washstand.position.set(-2.45, 0.45, -13.55);
  const roomExit = butchRoomDoor;
  roomGroup.add(evidenceTable, bed, washstand);
  roomGroup.add(new THREE.HemisphereLight(0xa8b8b5, 0x160b08, 1.3));
  const roomLamp = new THREE.PointLight(0xf2aa64, 34, 12, 1.8);
  roomLamp.position.set(-1.5, 3.4, -11.2);
  const roomBedLight = new THREE.PointLight(0xffcf92, 25, 9, 1.9);
  roomBedLight.position.set(1.8, 2.6, -12.3);
  const roomNightFill = new THREE.PointLight(0x5d8792, 19, 12, 1.9);
  roomNightFill.position.set(2.7, 3.2, -9.0);
  roomGroup.add(roomLamp, roomBedLight, roomNightFill);
  roomGroup.visible = false;

  group.add(lobbyGroup, corridorGroup, roomGroup);
  group.visible = false;
  scene.add(group);
  return {
    group, lobbyGroup, corridorGroup, roomGroup, desk, register, hana, irena, vesna, daro,
    lobbyExit, corridorEntrance, corridorStairExit, backgroundDoors, butchRoomDoor,
    evidenceTable, evidencePapers, evidencePaperSpecs, bed, roomExit, butchDoorLeaf,
  };
}
