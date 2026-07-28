// Everything is built as a silhouette read: the further away something is, the
// more fog washes it toward the sky's value. Textures are drawn at their FAR
// (hazy) brightness and the lane tints in constants.js multiply them down —
// tint can only darken, so the drawn value has to be the lightest one needed.

export const PAL = {
  skyTop: 0x03050a,
  skyMid: 0x2b333f,
  skyHorizon: 0x454e5c,
  skyLow: 0x1b1f26,

  // The skyline is now a set of painted simulation panoramas, not generated
  // layers — but the rule it has to obey still governs everything
  // else. The scene is one monotonic value ramp, darker the closer a plane is
  // to the camera:
  //   backdrop > FAR lane > NEAR lane > foreground brambles
  // Break the monotonicity anywhere and the depth read collapses, however
  // pretty the individual layer looks on its own. BACKDROP.tint in
  // constants.js is what holds the painting above the far lane.

  // Terrain as drawn. Far lane keeps most of this; near lane is crushed to
  // near-black by its tint, leaving only the rim catching moonlight.
  terrain: 0x4a5260,
  terrainRim: 0xdfe7f2, // drawn bright: the lane tint multiplies it down hard,
                        // and it is the only cue for where a ledge actually is

  prop: 0x6b7480, // levers, signs, fences — same tinting treatment
  actor: 0x717b88, // player + beasts

  lamp: 0xffc98a,
  rune: 0x86b8d8,
  echo: 0xcfe0f0,
  blood: 0x8e1f24,
};
