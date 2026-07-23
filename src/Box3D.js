import Phaser from 'phaser';
import { GAME_W, GAME_H } from './constants.js';

// Genuine 3D geometry composited over the 2D scene.
//
// Phaser's Mesh game object projects vertices through a real perspective
// matrix, so these are actual cubes — not sprites faked with parallelograms.
// Everything behind them (parallax layers, both lanes, the terrain) stays flat
// 2D; only these are three-dimensional. That split is the "2.5D".

const FOV = 45;
const PAN_Z = 4; // camera distance in model units — small enough for visible foreshortening

// Starting scale only. Phaser's NDC-to-pixel mapping does not match the
// textbook pinhole relation — measured ~375 px/unit against this formula's 181
// — and a rotated cube's silhouette runs ~1.45x its edge length. The 3.0
// factor folds both in so frame one is within a few percent; `calibrate()`
// then measures the real projection and corrects it exactly, which is what
// keeps this correct if anyone retunes FOV or PAN_Z.
const PINHOLE_PX = GAME_H / (2 * PAN_Z * Math.tan(Phaser.Math.DegToRad(FOV) / 2));
const START_PX = PINHOLE_PX * 3.0;

const S = 0.5;
const CORNERS = [
  [-S, -S, -S], // 0
  [S, -S, -S], // 1
  [S, S, -S], // 2
  [-S, S, -S], // 3
  [-S, -S, S], // 4
  [S, -S, S], // 5
  [S, S, S], // 6
  [-S, S, S], // 7
];

// Each face gets its own four vertices so it can carry a flat colour. Sharing
// corners between faces would smear the shading across the whole cube.
const FACES = [
  { quad: [0, 1, 2, 3], shade: 0xf0f0f0 }, // front
  { quad: [5, 4, 7, 6], shade: 0x8f8f8f }, // back
  { quad: [4, 0, 3, 7], shade: 0xa8a8a8 }, // left
  { quad: [1, 5, 6, 2], shade: 0xc6c6c6 }, // right
  { quad: [4, 5, 1, 0], shade: 0xffffff }, // top — catches the most light
  { quad: [3, 2, 6, 7], shade: 0x6b6b6b }, // bottom
];

const UV = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
];

/** Multiply two packed RGB values, same as a sprite tint. */
function mulHex(a, b) {
  const r = Math.round((((a >> 16) & 255) * ((b >> 16) & 255)) / 255);
  const g = Math.round((((a >> 8) & 255) * ((b >> 8) & 255)) / 255);
  const bl = Math.round(((a & 255) * (b & 255)) / 255);
  return (r << 16) | (g << 8) | bl;
}

function cubeGeometry(shade) {
  const vertices = [];
  const uvs = [];
  const indicies = [];
  const colors = [];
  let base = 0;

  FACES.forEach((face) => {
    // Face shading and the lane's silhouette darkening collapse into one
    // vertex colour — Mesh has no setTint, so this is where a cube joins the
    // same near-black scheme as everything else in its lane.
    const shaded = mulHex(face.shade, shade);
    face.quad.forEach((cornerIndex, k) => {
      const c = CORNERS[cornerIndex];
      vertices.push(c[0], c[1], c[2]);
      uvs.push(UV[k][0], UV[k][1]);
      colors.push(shaded);
    });
    indicies.push(base, base + 1, base + 2, base, base + 2, base + 3);
    base += 4;
  });

  return { vertices, uvs, indicies, colors };
}

/**
 * A perspective-projected cube positioned like any other game object.
 * Falls back to a flat image when WebGL is unavailable — Mesh is WebGL-only
 * and renders nothing under the Canvas renderer.
 */
export function createBox3D(scene, x, y, cfg = {}) {
  const {
    size = 56,
    texture = 'crate-face',
    depth = 32,
    scrollFactor = 1,
    tilt = { x: -0.32, y: 0.62, z: 0 },
    spin = null,
    sway = null,
    shade = 0xffffff,
  } = cfg;

  if (scene.game.renderer.type !== Phaser.WEBGL) {
    const img = scene.add
      .image(x, y, texture)
      .setDepth(depth)
      .setScrollFactor(scrollFactor)
      .setTint(shade);
    img.setDisplaySize(size, size);
    img.isFallback2D = true;
    return img;
  }

  const g = cubeGeometry(shade);
  const mesh = scene.add.mesh(x, y, texture);
  mesh.addVertices(g.vertices, g.uvs, g.indicies, true, undefined, g.colors, 1);

  // Draw every face and order them back-to-front instead of culling by winding.
  // For an opaque convex cube depth sorting alone is correct, and it sidesteps
  // getting the triangle winding backwards.
  mesh.hideCCW = false;

  mesh.setPerspective(GAME_W, GAME_H, FOV);
  mesh.panZ(PAN_Z);

  const s = size / START_PX;
  mesh.modelScale.set(s, s, s);
  mesh.modelRotation.set(tilt.x, tilt.y, tilt.z);

  mesh.setDepth(depth).setScrollFactor(scrollFactor);

  mesh.spin = spin;
  mesh.sway = sway;
  mesh.swayBase = tilt.y;
  mesh.boxSize = size;

  // `size` is the on-screen silhouette in pixels — for a crate that's exactly
  // its collision footprint, so the cube you see is the block you land on.
  mesh.fitPx = size;
  mesh.calibrated = false;

  return mesh;
}

/**
 * Correct modelScale so the cube's projected silhouette is exactly `fitPx`.
 * Runs once, on the first frame where the vertices have actually been through
 * the projection matrix.
 */
function calibrate(box) {
  const verts = box.vertices;
  if (!verts || verts.length === 0) return;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < verts.length; i++) {
    const { tx, ty } = verts[i];
    if (!Number.isFinite(tx) || !Number.isFinite(ty)) return; // not projected yet
    if (tx < minX) minX = tx;
    if (tx > maxX) maxX = tx;
    if (ty < minY) minY = ty;
    if (ty > maxY) maxY = ty;
  }

  const span = Math.max(maxX - minX, maxY - minY);
  if (span <= 0) return;

  const k = box.fitPx / span;
  box.modelScale.set(box.modelScale.x * k, box.modelScale.y * k, box.modelScale.z * k);
  box.calibrated = true;
}

/** Advance rotation and re-sort faces. Call once per frame per box. */
export function updateBox3D(box, deltaMs, nowMs) {
  if (box.isFallback2D) return;
  if (!box.calibrated) calibrate(box);

  const dt = deltaMs / 1000;

  if (box.spin) {
    box.modelRotation.x += box.spin.x * dt;
    box.modelRotation.y += box.spin.y * dt;
    box.modelRotation.z += box.spin.z * dt;
  }

  if (box.sway) {
    box.modelRotation.y = box.swayBase + Math.sin((nowMs / 1000) * box.sway.speed) * box.sway.amp;
  }

  box.depthSort();
}
