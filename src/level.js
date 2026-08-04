import { LANE_FAR, LANE_NEAR } from './constants.js';

// Level authoring in plain data. Coordinates are world-space.
//   - solids:  { lane, x, y, w, h, tex, kind }   x/y = TOP-LEFT
//   - coins:   { lane, x, y, value }             x/y = CENTRE
//   - enemies: { lane, x, min, max }             patrol bounds
//
// The far lane's ground surface sits at y=290, the near lane's at y=460
// (see LANES in constants.js). Jump height is ~140px, so anything within
// ~135px of a standing surface is reachable.

const G = 'terrain-body'; // ground body — the moonlit cap is added automatically
const S = 'stone';
const W = 'plank';

// Which stage runs the rotating drum. `stages` and `interactables` are sibling
// keys of one object literal, so neither can read the other through LEVEL while
// it is still being constructed; this constant is the single place both consult.
// Set it to null to retire the pilot — the stage's `drum` block and the slot
// dial then disappear together, and section III falls back to the ordered queue
// every other stage uses.
// Section III. Named for what the room now is rather than for the deleted drum.
// The index is still needed because the shared interactable builder has to know
// which stage gets air-circuit machines (kind 'air-lock') instead of
// queue-punch controls.
const AIR_LOCK_STAGE = 2;
// Phase IV (junction-4) runs the WEIGHT/ADHESION slice: no timetable queue,
// no run handle, no manual window — the devices act on the shared airNetwork
// and the motor directly (kind 'weight-transfer').
const WEIGHT_TRANSFER_STAGE = 3;
// Phase V (junction-5) runs READ THE BOGIE: the service devices act on the
// faulty bogie's local brake branch (kind 'bogie-service').
const BOGIE_SERVICE_STAGE = 4;
// Phase VI (junction-6) runs PAST RIDES THE LOAD: the departure stand reads
// the echo-driven load window (kind 'echo-load').
const ECHO_LOAD_STAGE = 5;

export const LEVEL = {
  spawn: { x: 70, y: 400, lane: LANE_NEAR },
  tutorialPuzzle: {
    mode: 'timetable',
    endX: 4800,
    stages: [
      {
        id: 'junction-1',
        title: 'I  /  PUNCH THE DOOR',
        startX: 0,
        endX: 790,
        rackX: 250,
        commandX: 430,
        runX: 650,
        commands: ['door'],
        solution: ['door'],
        autoRun: true,
        showRack: false,
        showMachinery: false,
        guidance: 'direct',
        lesson: 'One punched instruction becomes a real train action.',
      },
      {
        id: 'junction-2',
        title: 'II  /  CONTACT',
        startX: 800,
        endX: 1590,
        // DEAD LAYOUT DATA, kept only because the shared rack-face builder in
        // TimetablePuzzle.build() still positions its (refresh-hidden) rack
        // objects from rackX for every stage; deleting it would leave NaN
        // coordinates on the hidden assembly. commandX/runX were deleted once
        // their last readers went away (completeStage falls back to the room
        // centre for the score popup).
        rackX: 910,
        // Phase II is now the door-latch / power-contactor interlock
        // (src/tutorial/phases/contactInterlock.js): no command devices, no
        // RUN handle, no guideSequence, no rack face in this room. The latch
        // at x=850 and the contactor at x=1440 are `contact-interlock`
        // interactables below; completion is owned by that state machine.
        showRack: false,
        // The shared pneumatic machinery cluster (gauge, brake shoes, motor,
        // flywheel, power lamp) is the retired brake-suspension narrative and
        // would sit 100px from the new contactor. junction-1 precedent: hide
        // the whole cluster; GameScene's completion reveal then skips its
        // camera pan too.
        showMachinery: false,
        guidance: 'interlock',
        // DESCRIPTIVE ONLY, exactly like junction-3: nothing queues or judges
        // these commands any more. The field stays because shared completion
        // art (setCompletedMachinery) and the room pictogram in
        // tutorialTrainRoomsArt read `stage.solution` unguarded.
        solution: ['brake', 'power'],
        lesson: 'The open door latch breaks the circuit; the contactor only holds once the line has gone live.',
      },
      {
        id: 'junction-3',
        title: 'III  /  THE AIR THAT KEEPS COMING BACK',
        startX: 1600,
        endX: 2390,
        // UNDERCARRIAGE VIEW TEACHING: this stage teaches the hold-S look-down
        // verb (camera, QA warp, [S] prompt). It deliberately does NOT carry
        // `underfloor`: that flag would relocate the hand-placed air-circuit
        // run (header y=545, wall-eye-height gauge) into the deep machinery
        // band and strip the custom pipe pulses. See src/tutorial/underfloorView.js.
        underfloorView: true,
        // The drum is gone rather than disabled. One screen cannot sell two
        // solutions: whichever of the drum slots and the air line looked
        // brighter would be read as the real puzzle and the other as decoration.
        guidance: 'machine',
        lesson: 'A branch fed by the main reservoir cannot be bled dry — close its isolator first.',
        // DESCRIPTIVE ONLY. Completion is gated by the local-air-circuit state
        // machine in src/tutorial/phases/localAirCircuit.js, not by this array.
        // It stays because 28 call sites read `stage.solution` unguarded for
        // completion art and objective text; removing those readers is a
        // separate refactor (SYSTEM ARC LOCK §9).
        solution: ['brake', 'vent', 'door'],
        // LOCAL AIR CIRCUIT (SYSTEM ARC LOCK §3). One door branch of the shared
        // PARALLEL air network: reservoir -> ISOLATE -> gauge -> BLEED -> door
        // cylinder and claw. Bleeding against the open supply floors above the
        // release band (the whole lesson); only closing ISOLATE lets the
        // cylinder retract the claw. All numbers live in
        // phases/airNetwork.js + phases/localAirCircuit.js, locked by tests —
        // none may be tuned here.
        airCircuit: {
          interactRadius: 62,
          machines: {
            // Spatial order is locked by the arc: reservoir, ISOLATE, gauge,
            // BLEED, cylinder+latch. The claw keeps its old clearance: the
            // incomplete-stage guard resets the player to endX - 12 = 2378,
            // so 2330 keeps 48px. Nothing may move right for symmetry's sake.
            reservoir: { x: 1650, y: 430, surface: 'underfloor-tank' },
            isolate: { x: 1750, y: 430, surface: 'floor-bracket' },
            gauge: { x: 1900, y: 300, surface: 'wall-eye-height', interactive: false },
            bleed: { x: 2110, y: 430, surface: 'wall-wheel' },
            latch: { x: 2330, y: 430, surface: 'door-claw' },
          },
        },
      },
      {
        id: 'junction-4',
        title: 'IV  /  WEIGHT TRANSFER',
        startX: 2400,
        endX: 3190,
        rackX: 2510,
        commandX: 2630,
        runX: 2800,
        // WEIGHT / ADHESION (SYSTEM ARC LOCK §4). The suspension branch of the
        // SHARED airNetwork is found damaged (cut off + venting flat); the
        // player seals the drain cock, admits the header through the levelling
        // valve, walks the counterweight trolley over the drive bogie, and
        // TESTs the motor. All physics lives in phases/weightTransfer.js +
        // phases/motorAdhesion.js + phases/airNetwork.js, locked by tests —
        // none may be tuned here. The old manualX/manualWindowMs reflex
        // window is abolished (lock §9 disposal table); the incomplete-stage
        // guard at endX - 12 (3178) still bounds device placement.
        weightTransfer: {
          interactRadius: 62,
          trolley: { leftX: 2480, rightX: 3060, y: 560 },
          machines: {
            drain: { x: 2560, y: 430, surface: 'underfloor-drain-cock' },
            supply: { x: 2660, y: 430, surface: 'levelling-valve' },
            test: { x: 2900, y: 430, surface: 'motor-test-stand' },
          },
        },
        // The timetable strip is demolished in this room too: no rack, no
        // punch keys, no RUN handle. The hardware itself is the interface.
        showRack: false,
        // UNDERCARRIAGE VIEW TEACHING: full underfloor machinery band (the
        // weight/adhesion lesson lives below the floor: bags, bogie, wheels,
        // motor) plus the look-down teaching flag — IV shows the weak [S]
        // nudge after a dwell, then retires it (src/tutorial/underfloorView.js).
        underfloor: true,
        underfloorView: true,
      },
      {
        id: 'junction-5',
        title: 'V  /  READ THE BOGIE',
        startX: 3200,
        endX: 3990,
        rackX: 3310,
        commandX: 3370,
        runX: 3860,
        underfloor: true,
        showRack: false,
        // READ THE BOGIE (SYSTEM ARC LOCK §5). Two bogies accept the same
        // TEST: the front one turns, the rear one does not — while contactor,
        // current, line pressure and axle load all read normal. The break is
        // local (locked fault: brake-actuator-seized, rear bogie). The repair
        // is the Gate 0 chain on the rear bogie's LOCAL brake line (the
        // airNetwork 'brake' branch): isolate -> HOLD-vent flat -> seat the
        // service pin -> free the piston -> withdraw the pin -> restore ->
        // re-TEST. The healthy side carries no service cocks and cannot be
        // stripped. Physics lives in phases/bogieDiagnosis.js +
        // phases/bogieSnapshot.js + the shared airNetwork/motor, locked by
        // tests — none may be tuned here. The old pressureHold analogue band
        // is abolished (lock §9 disposal table); the incomplete-stage guard
        // at endX - 12 (3978) still bounds device placement.
        bogieService: {
          interactRadius: 62,
          bogies: { front: 3300, rear: 3700 },
          machines: {
            test: { x: 3350, y: 430, surface: 'test-stand' },
            isolate: { x: 3560, y: 430, surface: 'local-cutout-cock' },
            vent: { x: 3660, y: 430, surface: 'local-bleed-wheel' },
            lock: { x: 3760, y: 430, surface: 'service-pin-bracket' },
            repair: { x: 3860, y: 430, surface: 'actuator-access' },
          },
        },
      },
      {
        id: 'junction-6',
        title: 'VI  /  PAST RIDES THE LOAD',
        startX: 4000,
        endX: 4790,
        rackX: 4110,
        commandX: 4160,
        runX: 4660,
        // PAST RIDES THE LOAD (SYSTEM ARC LOCK §6). The past self re-rides the
        // counterweight trolley along the trace the player actually recorded in
        // Phase IV (canonical fallback when QA skips IV — lock §2.4), and the
        // moving load periodically re-weights the drive bogie. The player
        // cannot steer the echo; they read its rhythm and energize the
        // departure stand INSIDE the load window, with the systems they
        // already repaired (II interlock, III air path, V brake branch) held
        // aligned. The old three-gate echoGates design is abolished (lock §9
        // disposal table). Physics lives in phases/echoReplay.js +
        // phases/traceContract.js + the shared motor — none may be tuned here.
        // The incomplete-stage guard at endX - 12 (4778) still bounds device
        // placement.
        echoLoad: {
          interactRadius: 62,
          machines: {
            test: { x: 4400, y: 430, surface: 'departure-test-stand' },
          },
          // The echo's trolley rail below the floor: echoTrolleyX 0..1 maps
          // onto x0..x1.
          echoRail: { x0: 4060, x1: 4740 },
        },
        underfloor: true,
        showRack: false,
      },
    ],
  },
  goal: { x: 9300, y: 388 },
  checkpoints: [{ x: 6895, y: 400, lane: LANE_NEAR }],

  solids: [
    // ---------------------------------------------------------- NEAR ground
    // Car 01 is now a continuous 4,800px first chapter. All teammate-authored
    // later-world geometry is shifted by the same 2,400px expansion.
    { lane: LANE_NEAR, x: 0, y: 460, w: 4800, h: 140, tex: G, kind: 'ground' },
    { lane: LANE_NEAR, x: 4920, y: 460, w: 780, h: 140, tex: G, kind: 'ground' },
    { lane: LANE_NEAR, x: 5830, y: 460, w: 900, h: 140, tex: G, kind: 'ground' },
    { lane: LANE_NEAR, x: 6890, y: 460, w: 1100, h: 140, tex: G, kind: 'ground' },
    { lane: LANE_NEAR, x: 8110, y: 460, w: 1390, h: 140, tex: G, kind: 'ground' },

    // ------------------------------------------------------- NEAR platforms
    { lane: LANE_NEAR, x: 5080, y: 385, w: 140, h: 24, tex: S, kind: 'platform' },
    { lane: LANE_NEAR, x: 5330, y: 330, w: 120, h: 24, tex: S, kind: 'platform' },
    { lane: LANE_NEAR, x: 6050, y: 375, w: 160, h: 24, tex: S, kind: 'platform' },
    { lane: LANE_NEAR, x: 7150, y: 380, w: 130, h: 24, tex: S, kind: 'platform' },
    { lane: LANE_NEAR, x: 7420, y: 320, w: 130, h: 24, tex: S, kind: 'platform' },
    { lane: LANE_NEAR, x: 8300, y: 375, w: 150, h: 24, tex: S, kind: 'platform' },

    // ----------------------------------------------------------- FAR ground
    // Gaps: 700-900, 1800-2400 (the lever bridge), 3400-3560
    // The far path is a balcony, not a second enormous wall. Its thinner
    // silhouette leaves the city visible through the lane gap.
    { lane: LANE_FAR, x: 4800, y: 290, w: 900, h: 26, tex: G, kind: 'ground' },
    { lane: LANE_FAR, x: 6300, y: 290, w: 1000, h: 26, tex: G, kind: 'ground' },
    { lane: LANE_FAR, x: 7460, y: 290, w: 2040, h: 26, tex: G, kind: 'ground' },

    // -------------------------------------------------------- FAR platforms
    { lane: LANE_FAR, x: 5150, y: 220, w: 120, h: 20, tex: S, kind: 'platform' },
    { lane: LANE_FAR, x: 6600, y: 215, w: 140, h: 20, tex: S, kind: 'platform' },
    { lane: LANE_FAR, x: 7900, y: 220, w: 150, h: 20, tex: S, kind: 'platform' },
  ],

  // Eight planks spanning the 1800-2400 gap in the far lane. Disabled until
  // the player pulls the lever over in the near lane.
  bridge: {
    lane: LANE_FAR,
    y: 290,
    h: 22,
    tex: W,
    planks: Array.from({ length: 8 }, (_, i) => ({ x: 5700 + i * 75, w: 75 })),
  },

  // Blood echoes are deliberately absent from the opening frame. The player
  // should first read the hunt, the enemy, and the jump—not a row of glowing
  // collectibles. They can be reintroduced later as rare, authored rewards.
  coins: [],

  // Non-collidable set dressing. Lamps carry an additive glow that is never
  // lane-tinted, so they still read as light sources against a black lane.
  decor: [
    { tex: 'lamp-post', lane: LANE_NEAR, x: 5660, light: 1 },
    { tex: 'lamp-post', lane: LANE_NEAR, x: 6760, light: 1 },
    { tex: 'lamp-post', lane: LANE_NEAR, x: 7880, light: 1 },
    { tex: 'lamp-post', lane: LANE_NEAR, x: 8980, light: 1 },
    { tex: 'lamp-post', lane: LANE_FAR, x: 5420, light: 0.55 },
    { tex: 'lamp-post', lane: LANE_FAR, x: 7000, light: 0.55 },
    { tex: 'lamp-post', lane: LANE_FAR, x: 8280, light: 0.55 },

    { tex: 'hearse', lane: LANE_FAR, x: 4980 },
    { tex: 'hearse', lane: LANE_FAR, x: 8600 },

    { tex: 'fence', lane: LANE_FAR, x: 6400, repeat: 8 },
    { tex: 'fence', lane: LANE_FAR, x: 7600, repeat: 7 },

    { tex: 'sign', lane: LANE_NEAR, x: 7240 },
    { tex: 'sign', lane: LANE_FAR, x: 4880 },
    { tex: 'sign', lane: LANE_FAR, x: 8100 },
  ],

  enemies: [
    // A lone hound gives the opening a readable threat and introduces the
    // cleaver before the level asks for any trickier traversal.
    { lane: LANE_NEAR, x: 5020, min: 4940, max: 5220 },
    { lane: LANE_NEAR, x: 7300, min: 6910, max: 7970 },
    { lane: LANE_NEAR, x: 8600, min: 8130, max: 9200 },
    { lane: LANE_FAR, x: 6900, min: 6310, max: 7290 },
  ],

  interactables: [
    ...[
      { stage: 0, commandX: 430, runX: 650, commands: ['door'] },
      // Stage 1 (junction-2) is deliberately absent: its punch keys and its
      // RUN handle are demolished. The room's only interactables are the two
      // contact-interlock devices added explicitly after this flatMap.
      // Section III's two devices are placed explicitly along the locked
      // spatial order (reservoir 1650 -> ISOLATE 1750 -> gauge 1900 -> BLEED
      // 2110 -> cylinder/claw 2330): the player must be able to walk the pipe
      // backwards from the bleeding valve to the isolator. See
      // stages[2].airCircuit for the layout contract.
      //
      // The commands are 'isolate' and 'bleed'. The claw is a passive
      // mechanical consumer — it gets no button of its own.
      {
        stage: 2,
        commands: ['isolate', 'bleed'],
        layout: [1750, 2110],
      },
      // Stage 3 (junction-4) devices ride the same layout contract as
      // Section III: the drain cock, the levelling valve, the counterweight
      // trolley itself and the motor test stand, in spatial order along the
      // underfloor run. No punch keys, no RUN handle — the timetable strip is
      // demolished here too.
      {
        stage: 3,
        commands: ['level-drain', 'level-supply', 'trolley', 'test'],
        layout: [2560, 2660, 2480, 2900],
      },
      // Stage 4 (junction-5) service devices, mounted ON the hardware of the
      // two-bogie diagnostic space (VISIBLE SYSTEM ARC CORRECTION §3): the
      // shared TEST bench BETWEEN the bogies, the cutout cock on the rear
      // bogie's local brake supply riser, the bleed wheel at that pipe's
      // lowest point, the service pin at its guide on the actuator linkage
      // and the seized actuator's access cover. The healthy bogie carries no
      // cocks at all.
      {
        stage: 4,
        commands: ['test', 'brake-isolate', 'brake-vent', 'service-lock', 'repair'],
        layout: [3500, 3580, 3660, 3775, 3860],
      },
      // Stage 5 (junction-6): the departure test stand only. The past self
      // re-rides the Phase IV counterweight trace below the floor; the
      // player's single verb is to energize the stand inside the load window
      // while the repaired systems stay aligned (lock §6). No punch keys, no
      // RUN handle, no echo gates.
      {
        stage: 5,
        commands: ['test'],
        layout: [4400],
      },
    ].flatMap(({ stage, commandX = 0, runX = 0, commands, physical = false, layout = null }) => {
      // Stages carrying an explicit `layout` need no interval and no runX, so
      // both default to 0 rather than producing NaN positions.
      const interval = !layout && commands.length > 1
        ? (runX - commandX - 96) / (commands.length - 1)
        : 0;
      return [
        ...commands.map((command, index) => ({
          id: `timetable-${stage}-${command}`,
          // Section III's three devices are air-lock machines: pressing them
          // acts on the pipe immediately instead of queueing a command for a
          // later run. Everywhere else these stay the punch-a-command control
          // they have always been.
          kind: stage === AIR_LOCK_STAGE
            ? 'air-lock'
            : stage === WEIGHT_TRANSFER_STAGE
              ? 'weight-transfer'
            : stage === BOGIE_SERVICE_STAGE
              ? 'bogie-service'
            : stage === ECHO_LOAD_STAGE
              ? 'echo-load'
            : (physical ? 'rail-control' : 'timetable-command'),
          command,
          stage,
          lane: LANE_NEAR,
          x: layout ? layout[index] : commandX + interval * index,
          y: 430,
        })),
        // The drum's planning bench, punch keys, RESET and RUN handles are all
        // deleted along with the drum itself. Section III's causality is
        // immediate, so there is nothing to write down and nothing to run.
        ...(!physical && stage !== AIR_LOCK_STAGE && stage !== WEIGHT_TRANSFER_STAGE && stage !== ECHO_LOAD_STAGE ? [{
          id: `timetable-run-${stage}`,
          kind: 'timetable-run',
          stage,
          lane: LANE_NEAR,
          x: runX,
          y: 430,
        }] : []),
      ];
    }),
    // Phase II (junction-2) interlock devices. Their sprites stay invisible —
    // ContactInterlockArt draws the latch and the contactor — so these defs
    // exist purely to reuse GameScene's dx<62 / dy<100 proximity pick and its
    // E-key routing. `command` is the interlock target: 'latch' | 'power'.
    {
      id: 'contact-latch-1',
      kind: 'contact-interlock',
      command: 'latch',
      stage: 1,
      lane: LANE_NEAR,
      x: 850,
      y: 430,
    },
    {
      id: 'contact-power-1',
      kind: 'contact-interlock',
      command: 'power',
      stage: 1,
      lane: LANE_NEAR,
      x: 1440,
      y: 430,
    },
    // The mid-car relay cabinet (THE MISSING CONTACT). Same invisible-anchor
    // pattern: ContactInterlockArt draws the world cabinet, RelayCabinetArt
    // owns the close-up; this def only feeds the dx<62 proximity pick and
    // routes E to TimetablePuzzle.openRelayCloseup().
    {
      id: 'contact-relay-1',
      kind: 'contact-interlock',
      command: 'relay',
      stage: 1,
      lane: LANE_NEAR,
      x: 1195,
      y: 430,
    },
    {
      id: 'sign-lever',
      kind: 'sign',
      lane: LANE_NEAR,
      x: 6370,
      y: 430,
      message: 'That lever builds a bridge... somewhere behind you.',
    },
    {
      id: 'bridge-lever',
      kind: 'lever',
      lane: LANE_NEAR,
      x: 6500,
      y: 430,
      once: true,
      message: 'A bridge rumbles into place in the far lane.',
    },
  ],

  // The people are not enemies and do not collide. They are anchors for the
  // story: each one remembers a different failed explanation of the world.
  npcs: [
    { id: 'caretaker', lane: LANE_NEAR, x: 125 },
    { id: 'mara', lane: LANE_FAR, x: 5000 },
    { id: 'operator', lane: LANE_NEAR, x: 5260 },
    { id: 'archivist', lane: LANE_FAR, x: 5460 },
    { id: 'mother', lane: LANE_NEAR, x: 6250 },
    { id: 'child', lane: LANE_FAR, x: 6660 },
    { id: 'janitor', lane: LANE_NEAR, x: 8180 },
    { id: 'last', lane: LANE_NEAR, x: 9040 },
  ],
};
