Original prompt: 你把管线搭一下但是跟玩法有关的先不用管 因为玩法我们还会整一些更有意思的机制

## Scope

- Build only the reusable world-background content pipeline.
- Do not change movement, combat, puzzles, NPCs, level geometry, story logic, or game rules.

## Work log

- 2026-07-28: Confirmed the repository is clean and has no existing pipeline or progress file.
- 2026-07-28: Pulled teammate commit `f3fb9b4`, which added story gameplay and eleven eager full-resolution panorama imports. Preserved all gameplay/story behavior while routing panorama assets through a new generated manifest.
- 2026-07-28: Added 4096px texture chunking, JPEG compression, cyberpunk deduplication, lazy current/neighbor loading, distant-texture release, URL preview selection, and read-only test diagnostics.
- 2026-07-28: Generated 30 textures from 10 unique panoramas: 108.7 MiB of source PNGs became 17.1 MiB of game assets; the production build is about 19 MiB instead of about 114 MiB.
- 2026-07-28: `assets:check`, production build, and dependency audit pass. Visually inspected Tutorial, Medieval, Final Choice, and the shared Cyberpunk asset with no seams or browser console errors. The bundled standalone Playwright client could not resolve its own Playwright package, so browser-backed local QA was used instead.
- 2026-07-28: Re-ran the full pre-push gate against the latest remote `main`: asset verification, production build, dependency audit, whitespace validation, and fresh browser checks of worlds 1, 5, 8, and 11 all passed with no console warnings or errors.

## TODO

## Chapter 6 pairwise world-fusion slice

- 2026-08-04: Added an isolated `car06.html` Chapter 6 vertical slice. It proves one player-controlled Grid → Paper switch, one automatic Paper → Grid brush-boundary cut, and a persistent `POWER → WIND → BRIDGE` state chain that opens the witness door. The pure model has 5/5 focused regressions; the standalone Vite build and whitespace check pass. Browser inspection confirmed the visual composition and no console errors. The browser automation surface did not retain a simulated held key, so a full natural keyboard traversal remains a human QA gate.
- 2026-08-04: Locked the Chapter 6 pre-integration pipeline in `chapterOutputRegistry.js`: five independent named slots for Night Service, Borrowed Grid, Echo City, Painted Country, and Museum of One Answer. Unfinished chapters remain explicit placeholders; a finished chapter may replace only its own slot with a validated serializable relationship packet. The registry and pairwise slice now pass 11/11 focused tests, and the standalone Chapter 6 production build passes.
- 2026-08-04: George accepted the Chapter 6 `moving memory theatre` art direction. Added a shared data-only camera/art/model manifest plus the locked production spec: one Fusion Spine, five material/rule layers, directed three-quarter 2.5D camera, seamless coordinate-preserving world changes, a three-world pullback, and a Butch/Mara two-target reunion. Original model and FX slots now use stable Blender/AE/Phaser names.
- 2026-08-04: Implemented the first actual Fusion Spine P0 greybox in the isolated Chapter 6 entry: a continuous 2880px route using all eight module slots, three-quarter deck geometry, shared mechanical ribs, safety gate, foreground world-change occluder, Brush Anchor, chasm/bridge, Witness Door, World Loom, and distant Mara proxy. Added a pure directed camera with deadzone, look-ahead, bounds, deterministic reset, and Butch/Mara two-target completion mode. Chapter 6 focused tests pass 21/21 and the standalone build passes. Browser play traversed the complete route with discrete native key presses and caught/fixed low-contrast Paper HUD text; sustained held-key feel still needs one human pass.

- Optional: add a CI job that runs `npm ci`, `npm run assets:check`, and `npm run build`.
- Optional: add a dedicated automated traversal test once the team settles the final gameplay mechanics.

## Car 01 Phase V–VI reasoning pass

- 2026-08-05: Raised difficulty without adding hidden rules or another button row. Phase V now requires a live A/B comparison before the brake-cylinder fault can be localized; blind diagnosis and unsafe service refuse locally without clearing progress. The old sequential next-device highlight is gone after the first TEST.
- Phase VI now asks two linked questions: route the replayed counterweight to either reference bogie A or repaired drive bogie B, then apply traction during the existing load window. The safe entry route is deliberately A; catching the timing window on A produces a readable free-rev failure and preserves the retry.
- Both sections remain diegetic point-and-click close-ups. Browser QA covered blind diagnosis, live localization, the full safe repair, observation-loop input refusal, wrong-route free-rev, route correction, window bite, and departure. Evidence is in `outputs/car1-phase56-thinking/`.
- Verification: 425/425 tutorial tests, 10 panoramas / 30 textures, production build, and touched-file whitespace check all pass. No commit or push.

## Phase II playable-QA input repair

- 2026-08-01: Fixed the exact `?qa=phase2&state=entry` route handed to the user. It had been treated like the six screenshot fixtures, so the world prompt displayed `[E] RESET LATCH` while `operateContactInterlock()` rejected every press behind `contactQaFreeze`.
- `entry` is now explicitly the playable Phase II shortcut; only `power-fail`, `latch-closed`, `signal-mid`, `energized`, `complete`, and `reset-replay` remain frozen for deterministic screenshots. Added a regression assertion for that contract.
- Browser verification on the current localhost page: focused the canvas, pressed E once, observed the latch prompt clear and the underfloor signal illuminate/finish its 1.2-second propagation. Browser console remained clean.
- Full verification passes: 116/116 Node tests, 10 panoramas / 30 generated textures, production build, and whitespace check. The bundled game client was attempted again but its isolated runtime still cannot resolve `playwright`; the in-app browser supplied the real keyboard and visual check.

## Phase II relay-cabinet insert design

- 2026-08-01: Locked a new Phase II middle beat, `THE MISSING CONTACT`, without changing Phase III–VI: the latch signal stops at a real underfloor relay cabinet; the player opens a diegetic close-up, patches the relay coil, watches the armature switch from NC to NO, patches the output, tests it, then returns to the world as the signal resumes toward the contactor.
- The insert rejects an automatic modal, generic password, color matching, Simon Says, timers and reset-on-error. It uses local recoverable relay behavior and makes the first connection physically reveal the second.
- Wrote the Kimi multi-Agent implementation contract in `docs/PHASE_II_RELAY_CABINET_KIMI_WORK_PACKAGE.md`, including research basis, final art direction, pure logic contract, file ownership, six execution waves, browser QA, and a start-without-reconfirmation prompt. Existing Phase II latch/contactor art remains the baseline; the old x≈1200 passive break and single uninterrupted propagation are the only superseded portions.

## Tutorial-car vertical slice

- 2026-07-28: Began the first complete art work package for `CAR 01 // NORMAL SERVICE` while keeping gameplay rules unchanged.
- Added a reusable camera-fixed train shell with three framed windows, glass reflections, ceiling/route details, animated straps, foreground seats and trolley, floor perspective, ambient motes, and a four-state auxiliary-power panel.
- Replaced the inherited tricorn/cleaver player placeholder with a neutral modern passenger silhouette and gave the tutorial caretaker a dedicated conductor silhouette.
- The visual state can be previewed with `?world=1&artState=off|partial|error|complete`; `render_game_to_text` reports the active tutorial art state.
- The shell geometry, window positions, foreground rules, and power-state interface are intended to be reused by later cars with material/lighting swaps.

## Tutorial-car TODO

- Replace the temporary player/NPC silhouettes after the team locks final character direction.
- After the visual direction is accepted, split reusable train-shell primitives into a shared car-art base for cars 2–10.

## Tutorial-car playable animation pass

- 2026-07-28: Added a complete first-car interaction loop without extending combat: walk to the auxiliary-power switch, restore power, watch the car reboot, and unlock the next-car boundary.
- Added procedural passenger idle/walk/jump/fall/interact frames, a conductor idle animation, animated switch states, panel fault/restart/stable sequencing, objective feedback, and an explicit locked-exit response.
- Made the Phaser canvas keyboard-focusable on click so controls work reliably after opening the game in a browser.
- Extended `render_game_to_text` with player animation, current tutorial objective, power state, exit lock, and nearby interaction diagnostics.
- Verified the opening, power prompt, reboot middle frame, stable-power result, and unlocked transition into world 2 in a real browser with no console warnings or errors; asset validation, production build, and whitespace checks pass.

## Tutorial-car echo puzzle

- 2026-07-28: The user approved replacing the one-button power restore with `The Train Remembers You`, a story-facing synchronization puzzle built around cooperation with a six-second recording of the player.
- Implementing PAST/PRESENT/SERVICE circuits: the recorded past self holds a pressure plate, the present player activates a generator, and the conductor turns the service key.
- The recorded figure is intentionally faint in the car and stronger in the window reflection; after successful power restoration it remains one beat too long and looks back at the player.
- Added deterministic development previews for idle, recording, playback, failed sync, successful sync/anomaly, and unlocked exit states. Browser QA verified every state, the automatic recording-to-playback transition, fault recovery, the delayed narrative unlock, and a clean transition into world 2 with no console warnings or errors.
- The installed standalone game client is still blocked because Playwright is unavailable in its runtime, so the in-app browser and the existing QA state routes remain the verified fallback.

## Tutorial-car spatial redesign

- 2026-07-28: Rebuilt Car 01 as one composed, single-layer 960px train-car screen; removed the unused upper lane from the first world and moved its first combat encounter into world 2.
- Reordered the onboarding path left-to-right: conductor briefing, memory recorder, PAST plate, two routing junctions, PRESENT generator, and the next-car exit.
- Added a readable circuit-tracing puzzle. The PAST pulse travels along the floor, stops at the first incorrectly routed junction, exposes its dead branch in red, and advances to the next junction after correction.
- Added staged visual direction: the conductor is the only initial interaction, amber floor arrows lead to the recorder, and a moving objective marker advances through PAST, each wrong junction, and PRESENT.
- Shortened the opening title so it clears before the first instruction, added QA previews for both routing stages, and updated diagnostics with briefing, relay, route, and powered-segment state.
- Verified opening composition, first and second circuit leaks, synchronized power/anomaly, and the unlocked transition to world 2 in the in-app browser. Asset validation, production build, and whitespace checks pass.

## Tutorial-car scrolling progression

- 2026-07-28: Superseded the one-screen Car 01 layout after playtest feedback. Car 01 now spans 2,400px and the teammate-authored later worlds were shifted 1,500px to preserve their relative geometry.
- Reworked the tutorial into three gated junctions with a repeated teach/develop/twist rhythm: Junction I teaches one recorded past self holding PAST; Junction II adds one visible route correction; Junction III hides a two-router schematic in an underfloor service void.
- Added a platformer camera rig with a 220x170 dead zone, smoothed horizontal follow, directional look-ahead, stable vertical framing during ordinary jumps, and an intentional DOWN-look that reveals the service void only in Junction III.
- Kept the train shell camera-fixed while making devices, gates, signs, floor arrows, echo routes, and circuit pulses world-space. Removed the old fixed power cabinet and foreground seats where they could obscure live scrolling interactions.
- Added development previews for each junction, both inter-junction unlocks, the underfloor look, final completion, and the world-2 exit. Browser checks verified the three compositions, staged gate progression, downward camera reveal, final anomaly, and camera reset on exit.
- The bundled game Playwright client was attempted again, but its runtime still lacks the `playwright` package; in-app browser QA remains the verified visual fallback. Asset validation, production build, and whitespace checks pass.

## Tutorial-car playtest clarity pass

- 2026-07-28: Replaced the camera-fixed train shell with three world-space train rooms. Window frames, pillars, ceiling trim, and floor structure now move with the player camera, while each junction has its own accent color and physical partition.
- Replaced instant partition disappearance with a mechanical unlock sequence: warning-light pulses, synthesized motor sound, camera vibration, sparks, and an upward door slide. The final door waits for the memory anomaly to resolve before opening.
- Reduced tutorial UI density. Permanent device labels are hidden, only the current junction title is visible, the opening-car counters are suppressed, and floor guidance/objective arrows stay hidden until the player presses Record.
- Rebuilt dialogue as a compact lower-left caption card with a typewriter reveal. Pressing E first completes the current line, then advances it, and interactions now have button compression, glow, sound, and a small camera response.
- Redesigned Junction III into a spatial loop: route the first junction on the right, follow the pulse back left through the underfloor void, invert it at a phase breaker, then return right to route the second junction and synchronize PRESENT. The solution is communicated by the live circuit rather than answer arrows.
- Production build and asset verification pass. Browser QA verified the uncluttered opening, compact dialogue, distinct world-space rooms, underfloor loop, staged partition animation, anomaly, and fully opened final exit.

## Tutorial-car mechanical-variety redesign

- 2026-07-28: Replaced Junction III's two routers and phase-breaker backtracking with `Below / Above Resonance`. The recorded past self now replays inside the underfloor electrical layer while the present player remains in the passenger cabin.
- Two vertically paired resonance columns teach the rule without prose: when past and present occupy the same x-position, the full column flashes amber and locks cyan after a short simultaneous hold. Completing both feeds the final generator. Junction III therefore changes interaction type instead of repeating Junction II's switch routing.
- Added deterministic QA routes for no resonance, one resonance, both resonances, and a live first-resonance trigger. Browser QA confirmed the live overlap detector, progression to the second column, complete two-column state, and visible underfloor echo.
- Reduced the conductor's first conversation from five instructional lines to two narrative lines. Added a silent first-room demonstration with a cyan remembered body on PAST, an amber present body by the generator, and a traveling pulse; removed the delayed opening toast.
- Shrunk the train windows and expanded the visible machine deck. The service layer now includes power buses, coils, cable bundles, fuse blocks, route rails, and two readable upper/lower coupling shafts.
- Added enclosed inter-car vestibules around the first two partitions. An opened door reveals a dark train corridor and the next room rather than exposing the exterior backdrop.

## Tutorial-car next playtest questions

- Can a first-time player infer “record a path through the two marks, then align above the shadow” without spoken explanation?
- Is the 260ms resonance hold generous enough during a naturally recorded replay?
- Does Junction II's single manual router remain useful contrast, or should it become a different physical interaction in the next pass?

## Tutorial-car timetable chapter expansion

- 2026-07-28: Reframed Car 01 as a 4,800px, six-section Prologue using a brass ticket punch and mechanical timetable. The progression is DOOR; BRAKE→POWER; BRAKE→VENT→DOOR; a timed physical trolley-latch release; BRAKE→VENT→POWER at the bogie; and a final BRAKE→VENT→POWER→COUPLE sequence.
- Kept the memory/shadow idea as a selective authored payoff instead of a second character the player must continuously control. The timed latch action in section four is recorded by the train and automatically replayed underfloor in section six, allowing the player to complete a new action above it.
- Varied the reasoning pattern across the six sections: direct onboarding, ordered causality, pressure-state reading, timed spatial intervention, observation of real undercarriage hardware, and finally combining a remembered physical action with a longer timetable.
- Shifted all later-world geometry, NPCs, encounters, checkpoints, world transitions, and the final goal by 2,400px so the longer first chapter does not overlap teammate-authored content.
- Added protagonist-owned brass-tool readability, stage-local timetable racks, command punch stations, sequential execution, causal fault feedback, animated brakes/pressure/power/trolley/coupler, and recognizable undercarriage art with wheelsets, suspension, brake shoes, reservoirs, pipes, traction motors, and draft gear.
- Reframed the station panorama so rooftops, tree line, lights, and hills sit inside the train windows instead of leaving the focal scenery hidden behind the shell.
- Added a Prologue ending cinematic: the train wakes, window scenery moves backward, speed streaks remain clipped behind the train shell, the image falls to black, and a restrained `CHAPTER ONE // THE SAFETY TEST` card introduces the next car.
- Added deterministic development routes for each timetable stage, the manual intervention window, selective echo replay, train departure, chapter card, and full Prologue exit.
- Asset validation, production build, whitespace validation, and a full browser-backed Prologue-to-Chapter-One run pass. The final run reached world 2 with all six stages complete, the echo recorded, and no new console errors; the only observed transition-time text-render error was fixed by suppressing tutorial objective updates once the Prologue is hidden.

## Tutorial onboarding clarity and bug repair

- 2026-07-28: Reworked the first-minute difficulty curve after playtest feedback that the timetable system arrived all at once. Before the conductor is addressed, all puzzle UI and controls now remain dormant; the opening composition contains only the conductor, the locked partition, and the train environment.
- Junction I now teaches one causal action only. The timetable rack and separate RUN control are hidden; one highlighted DOOR punch automatically executes, visibly opens the partition, and establishes “punch becomes train motion.”
- Junction II now introduces the actual two-slot timetable with explicit `1 BRAKE → 2 POWER` scaffolding, stateful next-step highlighting, a blocked/reversible wrong-first action, and a visible suspension contact that closes before it takes power.
- Added an `approach` phase between sections. A newly opened section does not project its title, rack, controls, objective, or prompt back into the previous room; it activates only after the player physically crosses the partition.
- Reordered the later physical controls into causal left-to-right sequences. Difficulty now comes from withdrawing guidance, reading air/undercarriage state, performing a timed manual intervention, and synthesizing the stored echo—not from arbitrary right-left-right button backtracking.
- Fixed duplicate objective/prompt stacking by hiding the floating objective while the contextual interaction prompt is visible. Removed the redundant first-section title and the irrelevant generic machinery from the opening lesson.
- Added deterministic QA coverage for automatic first-punch completion, section-entry activation, guided wrong/partial/complete two-step states, third-section failure recovery, timed trolley success, selective echo replay, and the full Prologue-to-Chapter-One transition.
- Production asset validation, build, whitespace validation, all new state regressions, failure recovery, and the final transition pass with no new browser warnings or errors.
- 2026-07-28 follow-up: fixed a real soft lock in the new `approach` phase. The next puzzle correctly stayed dormant, but the static black vestibule still read as a closed wall and all guidance had disappeared. Completed partitions now show a pulsing cyan threshold, a rightward passage arrow, and one short `OPEN — KEEP GOING` cue while the player remains in the previous room. The cue clears as soon as the next section activates.
- Verified that the approach-state player is not frozen, the first partition completion produces the passage cue, crossing the threshold activates Junction II, the cue then disappears, and no browser warnings or errors are introduced.

## Persistent rooms and period-mechanical motion

- 2026-07-28: Completed Prologue sections now remain physically present after the player crosses a partition. Their punched timetable, command stations, run handle, machine deck, gauge state, contact shoe, trolley, motor, and completion lamp settle into a dim non-interactive `SERVICE SET` state instead of disappearing.
- Seeded and live completion use the same deterministic final machinery state, so returning the camera toward an earlier room preserves the causal result rather than rebuilding an empty set.
- Reworked the visual motion language toward an older night-service carriage: tungsten ceiling tubes breathe subtly, leather grab straps sway, enamel service lamps change from amber to cyan, ticket punches drive a brass head through a paper strip, and pressure changes move an analog gauge needle.
- Expanded partition opening into a staged pneumatic sequence with a warning lamp, retracting brass latches, bilateral steam release, vestibule illumination, camera vibration, and the door lifting into its header. Context prompts now clear while a partition is opening.
- Browser QA verified the first completed room from inside Junction II, the retained powered state after Junction II, seeded persistence through Junction V, and the new door opening lifecycle. Asset validation, production build, and whitespace checks pass.

## Physical-bogie and echo-synthesis redesign

- 2026-07-28: Replaced sections five and six as timetable-order repeats. Section V is now a direct bogie-control sequence with no timetable rack or RUN handle: the player operates a brake shoe, bleed valve, and axle motor while looking into the real undercarriage.
- The lower machinery now carries the explanation. Thick mechanical rods/hoses connect each upper control to its component; the bogie drops, brake shoes close with sparks, the reservoir visibly contracts, the whole air pipe loses charge and vents from multiple points, axle energy pulses across the frame, and both wheel spokes rotate with the traction motor.
- Section VI now combines earlier mechanics instead of adding a longer command list. The player clamps the wheel; the visibly recorded past self traverses the lower layer and holds the bleed valve open; the present player then powers the unloaded axle and releases the draft gear. The past action is an automatic authored partner action, not a second directly controlled character.
- Replaced the six unrelated room palettes with one exterior-matched material family for the Prologue: damp twilight blue-grey enamel, oxidized aluminium, wine vinyl, tarnished brass, rivets, and warm tungsten light.
- Added QA routes for direct bogie completion, wrong-first physical feedback, visible echo replay, final synthesis, and the full Chapter-One exit. Browser checks confirmed the new state chain and final transition; asset validation, production build, and whitespace checks pass. The standalone skill client remains unavailable because its runtime cannot resolve Playwright, so the in-app browser remains the verified visual fallback.

## Active past-self sync and cinematic feedback pass

- 2026-07-28: Promoted the recorded past self from a cosmetic automatic replay into a required final-room mechanic. After the player clamps the brake, PAST physically travels through the lower bogie, vents the line, and holds two successive contacts; the player must reach the matching axle-motor and draft-gear controls above while each contact is live.
- Missed synchronization windows now recover in place: PAST loops back to the same contact and clearly reopens the timing window instead of resetting the room or soft-locking progression.
- Added a completion-camera grammar for mechanical rooms. The player freezes briefly, the camera descends to show the affected wheelset, reservoir, motor, or coupler moving, then rises to frame the period pneumatic partition as it unlocks and opens.
- Future rooms now exist in a dim dormant state behind their closed partitions. Their shell and machinery are already rendered, then wake when crossed, eliminating the previous door-open content pop.
- Switched Phaser rendering to crisp pixel-art sampling and added chunky planar wear/shading so the carriage interior shares the low-pixel, low-poly texture language of the exterior panoramas.
- Replaced the visible post-Prologue map seam with a sealed driver cab containing a sloped nose, cab window, gauges, console, and throttle. The Chapter One scene is revealed only by the existing departure transition.
- Browser QA verified the live first sync, missed-window retry, successful final synthesis, downward machinery reveal, upward door return, dormant next-room preview, sealed driver cab, and the full Prologue-to-Chapter-One transition. Asset validation, production build, and whitespace checks pass.

## Completion-cinematic timing and performance repair

- 2026-07-28: Fixed the completion reveal playing its important machinery action before the camera arrived. Correct timetable sequences and the final physical/manual action are now held as pending actions; the camera settles on the undercarriage first, then the train performs the brake/vent/power/release/coupler motion, and only afterward does the camera return to the partition.
- Shortened the two camera pans from 620ms to 420ms and made the machinery itself determine the hold duration. Removed the redundant repeated lamp/axle flourish that previously ran on top of the real action.
- Removed permanent wheel, flywheel, axle-pulse, and lamp tweens from every completed room. Completed machinery now rests in a deterministic static service state, preventing offscreen animation cost from accumulating across the six-section Prologue.
- Reduced brake sparks, vent puffs, door steam particles, repeated warning-light flashes, long camera shake, and door-lift duration while preserving the same physical cause-and-effect read.
- The room just completed remains strongly visible while the player is still in its doorway/approach state; its rack, controls, labels, echo hardware, and completion light no longer drop immediately to the distant-room dim level when the camera returns.
- Added camera-center, completion-cinematic, and live FPS fields to `render_game_to_text`, plus a delayed cinematic QA route for frame-accurate inspection.
- Browser QA visually inspected pre-pan, camera travel, machinery action, return-to-door, and settled-room frames. The timetable, manual-action, final echo, departure, and complete Prologue-to-Chapter-One paths all pass; observed settled framerate remained above the display refresh target, and production build/asset/whitespace checks pass.

## Codex / Claude Code collaboration setup

- 2026-07-28: The user assigned Claude Code the product-lead role and Codex the implementation-engineer role for the Infinity Train game.
- Added repository-local role instructions for both tools, a shared product-state handoff, and a single next-task contract. Product choices become implementation work only when `docs/NEXT_TASK.md` is marked `READY` with acceptance criteria and a QA route.
- The first pending product decision is the central interaction for Chapter One, `THE SAFETY TEST`; Codex will preserve the working Prologue and will not treat the inherited combat prototype as approved final car design.
- Confirmed the current baseline still passes world-asset validation, the production build, and whitespace validation before adding the collaboration files.

## Phase 1 Task 1 — Prologue game-feel and presentation

- 2026-07-29: Implemented the `READY` presentation-only task from `docs/NEXT_TASK.md` without changing puzzle solutions, guidance rules, time windows, or stage data.
- Added a quiet two-oscillator carriage rumble that follows the Prologue lifecycle, plus per-trigger pitch variation for the synthesized effects and removal of the unused stomp cue.
- Added guarded 40–80ms hitstop to accepted punches, mechanical landings, and echo success/miss. Completion/departure phases reject hitstop, native restoration always returns scene time scale to exactly `1`, and fault reset clears a pending dip.
- Added jump anticipation, two-frame landing recovery, stronger six-fps idle breathing, and a corrected non-duplicate walk frame.
- Added red fault and restrained blue-grey completion vignette responses, plus period-mechanical easing on clamps, air release, motor, trolley, coupler, signal transfer, and door lift.
- Added deterministic QA coverage for a correct section III sequence and five repeated section V blocked presses. `render_game_to_text` now reports the existing FPS diagnostic with current time scale for regression checks.
- Browser QA covered start/jump/landing, sections I–VI success states, section III fault, section IV success/miss, five blocked presses, echo success/miss, completion-camera descent/return, retained room contents, departure, and the Chapter One card. Time scale was observed at `0.14` on a mechanical landing and `0.08` on echo miss, then exactly `1` after recovery; no new browser errors appeared in clean routes.
- Departure FPS measured `107` before and `107` after at the same deterministic route/time point. Asset verification, production build, and whitespace validation pass. The bundled standalone game client was attempted again but still cannot resolve its own Playwright dependency; the in-app browser provided frame-by-frame visual and state QA instead.

## Phase 1 Task 2 — Completion-cinematic continuity

- 2026-07-29: Began the `READY` visual-continuity task from `docs/NEXT_TASK.md`; puzzle logic, stage data, guidance, timing windows, and the section V/VI redesign remain untouched.
- Added a continuous quiet service underframe beneath all six Prologue sections. Sections I–IV now carry a dark chassis bay, floor/side rails, cross-members, diagonal braces, conduit, inspection clamps, and service boxes below y=600; sections V–VI retain their complete bogie/wheelset/suspension/reservoir/motor/coupler art in front of the shared structure.
- Completion pan height now derives from each built machinery assembly's `underY` and `wheelY`, rather than the `underfloor` flag. The camera therefore settles on existing machinery in every section that actually uses the completion camera.
- Reduced the completion vignette peak and fade the camera-fixed foreground silhouette out only during the downward reveal, restoring it on return. Normal standing composition remains unchanged.
- Browser visual checks confirm continuous understructure in sections II–IV, unchanged full bogie readability in V–VI, foreground restoration after the camera return, matching `render_game_to_text` camera/cinematic state, and no new console warnings or errors. Section I intentionally has no completion pan because existing stage data sets `showMachinery: false`; its new underframe still exists continuously but the task does not override that product choice.
- Simplified the service-layer bracing after an initial performance sample fell below baseline while several live test tabs were open. A clean single-tab rerun at the matched departure point measured `108 FPS` versus the accepted `107 FPS` baseline, with the same visible chassis continuity and no loss of section V/VI detail.

## Section VI soft-lock repair

- 2026-07-29: Fixed `PAST HOLDS THE VALVE` after playtesting exposed an impossible second step. The stage definition, physical interactable list, and solution now agree on `BRAKE → VENT → COUPLE`, so the center control is a readable `BLEED VALVE` instead of an unusable axle motor.
- Echo visuals now instantiate for the new `echoGates` mechanic and begin at `echoStartX`; previously the new mechanic still depended on the removed `echoAssist` creation gate, so PAST never appeared or advanced after the first control.
- Retimed the deterministic section-VI QA route to operate only after PAST reaches each obstacle. Browser QA confirmed the visible echo stops at the charged pipe after BRAKE, requests VENT, then completes all three gates, reaches the valve, and transitions to the Chapter One card with no console warnings or errors. Observed completion-route frame rate was 112 FPS.

## Section III pilot — the Living Timetable (rotating drum)

- 2026-07-30: Built the drum pilot for section III only. Direction A is the spine; the single slice of direction B is VENT's held valve. Sections I, II, IV, V, and VI are untouched — the drum is gated on a `stage.drum` field, and deleting that one field from `junction-3` restores today's ordered-queue stage. New file `src/tutorial/drum.js`; edits in `src/level.js` and `src/tutorial/TimetablePuzzle.js`. Nothing committed or pushed.
- Six slots at 1.1 s, 6.6 s per revolution. The player punches command **and** slot, then has to be at the machine when the pointer arrives: BRAKE fires unattended as the free teaching slot, VENT and DOOR require presence within 70 px, and VENT additionally requires E held 0.4 s. Failure chars that one card; every other slot keeps its result and only failed slots are re-punched.
- Shipped layout after re-deriving the arithmetic against `MOVE.speedWalk` 200: slot dial 1668, RUN 1770, BRAKE 1880, valve 2040, door 2260. The first-draft 2080/2320 was discarded because it left a walking player 0.08 s at the door once the reaction grace was charged. Sparse route (slots 0/2/4) now clears with 0.13 s at the valve and 0.28 s at the door; adjacent slots still fail even at run speed, so tension stays something the player buys.
- Three real defects found by auditing the built code, all fixed and all now regression items in the QA route:
  - Completion could **soft-lock**. A re-punch leaves the charred card in its original slot while the retry lands elsewhere, so one command owns two cards; judging completion by the first card bearing that command kept reading the charred one, and the stage could never close even with all three commands fired. Verified the exact scenario now completes, and that a genuinely unfinished command still blocks.
  - A frame hitch or backgrounded tab **skipped slots silently** — never fired, never charred, card ejecting unmarked. The sweep now advances one slot per step; simulated a 3 s hitch and a 20 s background jump and all six slots are entered in both.
  - The VENT hold had **no reaction window**, so a player standing correctly at the valve who pressed E a frame late charred with nothing on screen to explain it. Added a 0.32 s grace charged against the slot, and the valve prompt reads `[HOLD E]` during a run so the hold teaches itself.
- Also verified rather than assumed: `run()` returns before the legacy path freezes the player, so the body stays mobile during a revolution; device actions are absolute assignments with absolute tween targets, so a re-run cannot un-clamp a brake or re-close a door; causal order is checked against persistent machine state rather than the slot list, so a re-punched VENT is not blocked by a BRAKE that already succeeded and has left the drum; punch and dial both refuse input while the drum turns; the drum uses no Phaser timers and is torn down on both stage advance and QA warp; the 118 px of door-to-boundary clearance keeps the incomplete-stage guard from teleporting a player mid-hold.
- `npm run build` clean. **No browser playtest yet** — every claim about pacing above is arithmetic and code reading, not observation. The walk-only completion time, departure FPS, and the rollback drill are still open and are the first items of the next session.
- External reviews were used for where they made me look, not for their conclusions. The A+E (search beam) ranking was rejected because it leaves the player spectating during execution, which is the one thing this pilot exists to test; A+C was rejected for position rather than quality. A critique claiming the 0.4 s hold was unsatisfiable was wrong — the hold accumulates after slot entry — but checking it is what surfaced the missing reaction window.

## Section III reset and control-layout clarity pass

- 2026-07-30: Added the user-requested dedicated RESET handle to the rotating-drum section. RESET is available both while editing and during a live revolution; it stops the real-clock scheduler, clears all six cards, restores the pointer to slot 1, resets the local machine state, and preserves player position plus completed earlier rooms.
- Reorganized the section into a readable left-to-right line: `SLOT +1 → RESET → RUN → BRAKE → VENT → DOOR`. SLOT and RESET now have permanent labels and distinct brass/red treatments instead of relying on an unexplained proximity prompt.
- Updated the safe sparse-route arithmetic for the new positions. The walk-only route retains 0.305 s of conservative valve slack and 0.38 s at the door, while adjacent VENT/DOOR slots remain unsatisfiable even at run speed once the required hold is included.
- Extended `render_game_to_text()` with drum cursor, running state, active slot, and per-slot command/status diagnostics. Added a deterministic `?qa=timetable-3-reset` route that resets a partly executed live drum.
- Browser QA inspected the active control layout and verified the hard reset from `BRAKE done + VENT pending` to six empty slots, cursor 0, stopped scheduler, programming phase, unfrozen player, and no console warnings or errors. Asset verification, production build, syntax checks, and whitespace validation pass.

## Timetable readability and separation pass

- 2026-07-30: Enlarged every visible TIMETABLE face from 138 x 78 to 202 x 100, strengthened its brass outline, title, schedule type, status lamp, paper strip, and moving slot marker.
- Moved every command label plus section III's SLOT, RESET, and RUN labels into a dedicated lower control band. The enlarged rack no longer covers any interactive label or handle; planning controls use compact single-line labels, while the three machine controls remain distinct two-line blocks.
- Raised all section identity plaques above the larger instrument face so the readability fix does not trade control overlap for chapter-title overlap.
- Browser QA visually inspected sections II, III, and IV. Their timetable faces are legible at gameplay scale, section III reads left-to-right as `SLOT +1 → RESET → RUN → BRAKE → VENT → DOOR`, and contextual prompts remain above the active machine rather than behind the rack.

## Section III duplicate-card safeguard

- 2026-07-30: Fixed the playtest state where five repeated BRAKE cards could all resolve with checkmarks while VENT and DOOR were absent, leaving the partition correctly closed but the timetable misleadingly successful.
- A command now permits only one pending or completed card. Repeating it gives a local machine-specific refusal; only a charred card can be retried in another slot. RUN preflights the three required machine cards and refuses an incomplete drum instead of spending a full revolution on a plan that cannot open the partition.
- Replaced the drum's abstract command glyphs with explicit `B`, `V`, and `D` initials. Browser QA confirmed the duplicate route retains exactly one pending BRAKE card, stays in programming mode, and reports no console errors; the safe sparse programming route renders as `B · V · D ·`.

## Section III projection-and-controls visual repair

- 2026-07-30: Replaced Section III's oversized enamel TIMETABLE board with a short, translucent signal projection in the upper window band. It shows the live `B / V / D` sequence and pointer without covering the carriage, player, or controls.
- Built a physical low-pixel code console beneath it: three separately etched `BRAKE`, `VENT`, and `DOOR` keycaps form the input vocabulary; `RESET` and `RUN` remain visually separate operating handles. The three real train machines retain their own captions on the right.
- This was a presentation-only change: the existing drum state machine, causal order, timing, and completion rules remain untouched. Browser QA at `?qa=timetable-3-layout` and `?qa=timetable-3-sparse` confirmed the projection is clear, the completed `B V D` strip updates, and no console warnings/errors appear. `assets:check`, syntax check, and direct Vite production build pass.

## Section III air-lock independent verification

- 2026-08-01: Re-ran `tmp/section3.mjs` against the real `src/tutorial/airLock.js` API: all 36 assertions pass, including the intended BRAKE / VENT / LATCH solution, three distinct failure classes, in-place retry, ten clean reset/replay cycles, diagnostics, and bad-delta handling.
- Re-ran syntax checks on the air-lock integration files, verified all 10 panoramas and 30 generated textures, and completed a direct Vite production build successfully. The only build output is the existing large-chunk advisory.
- A fresh automated visual playthrough could not be performed because browser control rejected the localhost QA page under its URL policy. Visual clarity, live key input, prompt occlusion, and state-to-animation agreement therefore remain explicitly unverified in this pass and require a human playthrough at `?qa=timetable-3-layout`.
- Sections IV-VI remain unimplemented; the prior Claude/Kimi run stopped after two consecutive 300-second Kimi MCP timeouts.

## Section III boot-crash repair

- 2026-08-01: Fixed the QA page freezing on `loading the first memory`. The AIR LOCK redesign intentionally removed the legacy `stage.commands` queue, but the shared visual builder still called `stage.commands.map(...)` before GameScene could finish creating. Command-label construction now treats a missing queue as intentional; AIR LOCK continues to use its physical machines and contextual prompts.
- Reloaded `?qa=timetable-3-layout` in the browser and visually confirmed the AIR LOCK room renders instead of leaving the BootScene loading card on screen. Syntax validation, all 10 panorama/30 texture checks, and the production build pass.

## Phase II–VI Design Lock and Kimi execution start

- 2026-08-01: The user approved the Phase II–VI direction as `DESIGN LOCK`. The locked progression is door/traction interlock → local pneumatic door circuit → spatial weight transfer → bogie diagnosis → replay of the player's real Phase IV trolley trajectory. Work remains local only; no commit or push.
- Folded four final product constraints into `docs/PROLOGUE_II_VI_KIMI_CLUSTER_EXECUTION_PLAN.md`: the IV→VI trace contract is frozen before Phase IV implementation; Phase VI has a canonical fallback when no valid player recording exists; Phase III uses an open threshold plus hysteresis rather than absolute zero; and the II/III cross-stage blind comparison happens before IV/V production.
- Kimi Wave 0 completed a read-only repository map in `docs/WAVE_0_REPOSITORY_MAP.md`. Chief verification added one missed blocker: `createAirLock(stage.airLock)` currently discards the stage config, while `AIR_LOCK_TUNING` independently controls runtime logic, leaving two apparent sources of truth.
- Kimi Wave 2A implemented the frozen IV→VI data contract in `src/tutorial/phases/traceContract.js` with validation, normalization, canonical fallback, summaries, and immutable copies. Chief review found that `Number(Symbol())` violated the promised no-throw boundary; Kimi repaired it and added Symbol plus throwing-coercion regressions. Final result: 30 tests pass, asset verification passes, and the production build passes.
- Kimi Wave 2B implemented the pure Phase II contact-interlock state machine in `src/tutorial/phases/contactInterlock.js`. It models a locally bouncing POWER contactor, a visible 550 ms copper-trace propagation, successful traction only after the latch circuit is energized, exact reset/replay, one-shot transition events, and safe teardown. Chief review found a successful retry could retain the prior `signal-in-transit` fault; Kimi repaired it and added the exact failure→recovery event-order regression. Final result: 32 tests pass, asset verification passes, and the production build passes.
- Neither module is wired into the player-visible Phaser scene yet. The next bounded task is the Phase II art module followed by a single integration-owner pass that removes the old `guideSequence: ['brake', 'power']` path instead of running two systems in parallel.

## Phase II contact-interlock visible integration and browser QA

- 2026-08-01: Independently verified the completed multi-agent Phase II integration. The old ordering/timetable interaction is absent from the live room; the player now resets a door-post latch, follows a spatial copper signal run, and closes the remote traction contactor. The old pneumatic machinery group is hidden in this section.
- Fixed the development QA route so each fixture frames the device that proves its state. Previously every state spawned and framed the latch, leaving the remote contactor and its transient failure flash outside the viewport; `power-fail`, `energized`, and `complete` now frame the contactor, while `signal-mid` frames the transmission path.
- In-app browser QA captured and visually compared entry, open-circuit failure, mid-signal, and complete states. The failure red flash is now visible, the teal signal front reads along the horizontal wire, and the completed contactor state is distinct from the dormant room. No gameplay rules or tuning changed in this pass.
- Full verification remains green: 114/114 tutorial tests, all 10 panoramas and 30 textures, production build, and whitespace validation. The standalone skill-supplied Playwright client remains unusable in this environment because its bundled script cannot resolve Playwright; the connected in-app browser supplied the real rendered-frame QA instead.

## Phase II underfloor visual-teaching revision

- 2026-08-01: Player feedback correctly rejected the window-band copper trace as non-intuitive: it read as a debug/UI line rather than train hardware. Routed the entire latch-to-contactor conductor into a steel cable trough at y=556 beneath the carriage floor, with real vertical drops through the floor at both devices, ceramic supports, inspection-slot framing, and the same fault/signal/completion states.
- Slowed the room-specific propagation from 550ms to 1200ms so a first-time player can visually follow `door latch → underfloor trough → remote contactor`. The pure reusable interlock keeps its 550ms default; the longer duration is a Phase II scene-tuning value, preserving the module contract and its existing tests.
- Browser inspection confirmed that the dormant trough is readable beneath the floor without obscuring the protagonist, the entry prompt remains localized beside the latch, and the teal propagation front travels through the lower mechanical layer instead of across the windows. The dedicated underfloor-housing regression brings the suite to 115/115; asset verification, production build, and whitespace validation pass.

## Phase II relay-cabinet visual correction + micro polish — FINAL PASS

- 2026-08-02: Visual Correction Wave closed by the chief: Agent A enlarged terminal labels 9px→14px with engraved chips, added tween-free lead sway/hover brighten/grab feedback, a 12x12 moving contact with visible 16px/12px gaps for NO-vs-NC mechanical reading, and a cast-iron operator console grouping TEST/RESET; Agent B proved NC-flash/dead-wire/armature-fall feedback already existed and added the single dropout hint line (`CONTACT DROPPED — TRACE THE LIVE ARM`) through logic-layer `dropoutHint`; the integration owner hid MEMORY/WITNESSES inside the Phase II room (HudScene) and landed the TEST-lever dropout springback plus hint rendering. 315/315 tests, build, diff clean.
- First-time UX reviewer (blind playtest) confirmed the dropout screenshot is a same-camera failure state, not a camera jump; its zero-feedback claims were traced to its own contaminated session (player wandered to x=3186), and a clean-session chief rerun passed the full chain twice. Human playthrough then passed Phase II for real.
- Micro polish pass (single-threaded, no logic changes): point-and-click cursor states (game baseline → grab over lead tips → grabbing while dragging → baseline), hover lug swell, glowing drag origin, magnetic snap with widened 34px landing radius and 45% tip ease, bronze/cyan pulsing snap ring on legal terminals, restrained red break mark on the dead A2 screw, one-shot attract sway on first open, and a decorative patina layer (stud washers, brass busbars, wire channel, engraved `RELAY 110V DC` spec plate, low-contrast etching, rivets, wear). Four-state screenshots (rest / hover lead / dragging / hover terminal) and a full wiring run verified in a real browser; 315/315 tests, production build, and `git diff --check` all pass.
- **Phase II is marked FINAL PASS. No further Phase II audit waves.** Next: Phase III (AIR LOCK pneumatic circuit) per `docs/III_VI_IMPLEMENTATION_SPEC.md` Part 1 and the new Phase III Kimi work package.

## Car 03 Qwen bounded-repair Codex review

- 2026-08-03: Independently re-ran the bounded Car 03 gate: 92/92 tests across 26 suites, 10 panoramas / 30 textures, the main Vite build, isolated Car 03 build, and `git diff --check` all pass.
- Headed Playwright with real keyboard input verified natural entry movement (x=100 to approximately x=646) and four isolated QA-start scenarios: the active scan cone/reticle remains aligned with world-space drone/player after camera scroll; valid final alignment without E crosses the end but does not complete; one E establishes the duo and permits completion; R clears establishment/completion and restores the entry state.
- These four final-state scenarios start from QA fixtures. The complete natural entry-to-final playthrough remains `NOT RUN`, so this review accepts Qwen's two bounded repairs but does not declare the whole Car 03 integrated, published, or finally accepted. The only browser console item was the page's missing favicon 404; no game-script exception appeared.
- 2026-08-03 final natural-play supplement closes the remaining gameplay gate. Codex inspected the complete 424-line Playwright driver, all 718 valid trace rows, the JSON report, and all eight 960×601 screenshots under `/tmp/car03-nat/`. The run used `http://localhost:5179/car03.html` without query/QA parameters, wrote no page or model state, sent only Playwright keyboard events, and read state only through `render_game_to_text()`. The trace proves entry → slow-I anchor → slow-III rescue → alert → one contextual E establishes the duo → completion after x=4800 → R reset; a full replay that sends no E after rescue crosses x=4800 with `complete=false` and `duo.established=false`.
- The run's P4 `FAIL` and process exit code 1 are a harness-label error, not a game failure: the P4 E was incorrectly described as a detach attempt, but the locked interaction priority correctly uses that same E to establish the final duo. P5 occurs after completion and is not counted as a separate one-E proof. With that correction, **Car 03 core-gameplay browser acceptance and Qwen's bounded implementation benchmark PASS**. Qwen is promoted to the default Car 03 implementation owner under frozen scope and Codex final review; MiniMax remains the fast mechanical fallback. This does not by itself approve final art direction, shared-world integration, publication, or unrelated local changes.

## Car 03 human visual-UX rejection

- 2026-08-03: The user's first blind playtest could not identify the objective or understand the mechanic. Codex captured and inspected the current entry, joined-slow, isolated-warning, and duo-sync states at the live viewport; the report and four screenshots are in `outputs/car03-human-audit/`.
- Verdict: **CORE LOGIC PASS / HUMAN VISUAL-UX REJECT**. The present-day-city premise remains compatible with the mechanic, but the detailed photographic panorama and procedural low-pixel actors are an incoherent visual pairing. The current screen does not visibly distinguish free movement, anchoring, scan danger, companion rescue, or the final two-person pattern, and the page exposes development/QA copy instead of an in-world objective.
- Next gate: freeze Car 03 code while Gemini supplies three coherent visual directions showing entry, anchored, and alert/duo states. After the user selects one, Qwen may implement only that chosen art/onboarding layer without changing accepted model rules; Codex then repeats first-five-seconds and natural-play acceptance.
- Gemini's revised Direction A2 now passes the static visual-direction gate: a repeatable hero silhouette, integrated ceiling scanner, explicit scan cone, two-lane intent, outward alarm dispersal, and centered duo relationship are legible. Codex review is saved in `outputs/car03-gemini-visual-directions/CODEX_REVIEW_A2.md`. The files advertised as 960×600/1920×1080 are actually all 1376×768, and the aggregate sheet mixes in an incompatible over-the-shoulder camera; implementation is therefore locked to the three side-view references and the existing 960×600 two-lane model.
- Qwen remains paused because the A2 files are flattened concept images, not production assets. Gemini must first deliver a separated, transparent A2 asset kit (characters/poses, modular carriage layers, ceiling scanner, softened city-window layer, manifest/provenance). Concept screenshots must not be cropped into sprites and Qwen must not approximate the painterly target with procedural placeholder blocks.

## Six-chapter V2 product redesign and Borrowed Grid inspection

- 2026-08-04: Safely fetched the team remote without merging into the dirty worktree. The remote contains only `main`; its latest change merges the existing Prologue PRs and does not contain a separate teammate Car 02 branch. The working Car 02 candidate exists locally as the uncommitted standalone `src/cars/retroCyberpunk/` / `THE BORROWED GRID` slice, currently labelled Car 04.
- Independent review passed all 39 Car 04 logic tests and its standalone Vite production build. The slice already varies one system across bridge, conductor, battery branch choice, vertical cargo transport and final traffic-grid activation. Live preview confirmed the first ladder drag and also exposed three failed background-chunk loads, leaving black/green missing-texture presentation; current procedural art and story framing remain prototype quality.
- Added `docs/GAME_MASTER_V2_SIX_CHAPTERS.md` as the new product-direction draft: Car 01 is locked as a short tutorial; the local Borrowed Grid becomes Chapter 2; Chapters 3–5 use social matching, painterly environment manipulation and evidence composition rather than repeating platforming; Chapter 6 transfers persistent state across fused worlds. No gameplay source was changed, committed or pushed in this review.

## Night Service Phase V–VI audit baseline

- 2026-08-04: Expanded the bounded Night Service review from only the final room to Phase V and Phase VI. Added `docs/NIGHT_SERVICE_PHASE_V_VI_KIMI_AUDIT_WORK_PACKAGE.md` with ordinary-input audit evidence, mechanical cause-to-outcome criteria, frozen files, and implementation gates.
- Replaced Phase VI's Chinese traction prompts with English `ENGAGE TRACTION / DISENGAGE TRACTION` text. Phase V and VI now use a persistent undercarriage camera toggle: one S/Down press looks down, key release keeps the view down, and the next press returns to the cab. The automatic Phase VI observation pass latches the down view instead of snapping upright when control returns.
- Added pure regressions for V/VI latch, stage reset, Phase VI automatic handoff, and English inspect/return hint actions. Focused underfloor-view tests pass 15/15; the full tutorial suite passes 418/418, assets verify at 10 panoramas / 30 textures, production build and whitespace checks pass. Headless rendered QA confirmed Phase VI shows `[E] ENGAGE TRACTION` and `[S] RETURN TO CAB` while `lookingDown` remains true after observation; a complete natural Phase V→VI human run remains for Kimi's read-only audit.

## Chapter 6 pause and shared-asset-first pass

- 2026-08-04: George rejected the Chapter 6 P0 greybox as representative of final gameplay and paused further finale gameplay production until Chapters 1–5 have real playable outputs. The existing Chapter 6 registry, model, camera, tests, and `car06.html` remain technical scaffolding only; they are not accepted gameplay or final visual quality.
- Shifted Codex work to shared assets that do not depend on unfinished mechanics or character designs. Created an unintegrated v01 source pack under `src/assets/shared/painterly/`: a warm ivory paper surface, a 16-frame black/white brush-mask atlas, and a 12-frame cyan/amber/red feedback atlas with exact frame metadata and provenance notes.
- No chapter code, Butch/Mara design, or world-specific prop was changed. Runtime integration remains blocked on George's visual approval and later seam/contrast/compression checks.

## External 3D environment source library and character-ownership boundary

- 2026-08-04: George explicitly assigned final character modeling to another person. Codex stopped character production. The three existing Butch/Mara silhouette boards under `src/assets/characters/concepts/v01/` are preserved only as optional discussion references; they are not approved models, sprites, rigs, or final art. The assigned character contributor's delivered result is authoritative.
- Downloaded and verified only non-character, general-purpose CC0 environment sources into the repository-external `NIGHTFALL_Source_Assets` library: Kenney City Kit Industrial (25 GLB), Kenney City Kit Roads (72 GLB), Quaternius Downtown City MegaKit Standard (153 glTF / 691 extracted files), Ultimate Stylized Nature aggregate Blender file, Medieval Village (44 Blender files), and Furniture (23 Blender files).
- The official Downtown free standard archive is 223 MB and passed a complete ZIP test; the 918 MB paid source edition was not downloaded. G08–G13 provenance, license, local locations, intended chapters, integrity hashes, and runtime restrictions are recorded in `NIGHTFALL_EXTERNAL_ASSET_MANIFEST_v01.md`.
- All downloaded 3D files remain source-only outside Git. Nothing has been wired into Phaser, and no pack establishes final art direction: gameplay owners must select a small subset after camera/whitebox approval, then repaint/render/compress it through the shared 2.5D visual pipeline.

## Prologue Phase V–VI sparse-world / point-and-click correction

- 2026-08-04: Replaced the dense undercarriage overlays in Phase V and VI with a shared presentation rule: the world view shows only the load-bearing railway system, while detailed operation lives in a screen-space point-and-click inspection panel. Frozen puzzle state machines, tuning, pass conditions, and the Phase IV→VI trace contract were not changed.
- Phase V world view now reads as two comparable bogies on one TEST bus plus one faulty-side service hatch. Its inspection panel isolates TEST, branch cut-off, held bleed, physical service pin, and actuator cover into five large non-overlapping controls with live A/B and local-pressure evidence.
- Phase VI world view now reads as two repaired supply trunks feeding one drive bogie, plus one replay rail and capture bay. Its synchronizer close-up reduces the action to watching the recorded load enter the physical bay and throwing one traction handle. Stable world prompts now open the panel at any non-complete state; the time window is taught inside the mechanism rather than through a disappearing world prompt.
- Lifecycle/input integration is closed: pointer down/up routes to the modal, held bleed releases on pointer-out/blur, E/ESC dispatches through the existing close-up gate, completion closes the panel before reveal, and repeated open/close does not grow the tracked-object list. Tutorial tests remain 423/423, direct Vite production build and whitespace/syntax checks pass. Connected-browser inspection confirmed the simplified Phase V world silhouette; the browser safety layer interrupted the final synthetic key sequence before modal screenshot capture, so the point-and-click close-ups still need one short human visual check.

## Car 01 Phase V brake-service inspection tray — FINAL PASS

- 2026-08-05: Finished the half-complete Phase V point-and-click conversion without changing the frozen diagnosis state machine or its solution. The modal now presents one mechanically continuous branch (reservoir → quarter-turn cut-off → gauge → low drain ring → brake cylinder → piston linkage → removable service pin → tread shoes) beside the healthy Bogie A spring-test reference.
- Reconnected refusal feedback to the modal itself: an unsafe service-pin attempt visibly kicks the pin back and an unsafe repair attempt shudders the piston in its bore. Previously those tweens only played on world machinery hidden behind the inspection tray. Added read-only panel diagnostics for open/hover/pressed/held/bounce/hit regions so browser QA can prove visual input and logic remain synchronized.
- Fixed the advertised E-to-close path. The panel did close, but the same E edge fell through to the world interactable and reopened it in the same frame; the close frame now consumes that edge. ESC, X, held-drain release on pointer-up, and cursor restoration remain intact.
- A focused real-browser run now passes the entire route: open → hover cut-off → TEST reference → unsafe pin bounce → unsafe piston bounce → isolate → hold drain below 20 PSI → seat pin → free cylinder → remove pin → restore supply → TEST both bogies → completion. Closing/reopening with E preserves state and produces no tracked-object growth. Evidence is in `outputs/car1-brake-panel/`.
- Final verification: tutorial tests 423/423, all 10 panoramas and 30 textures, production build, syntax, browser console, and whitespace checks pass. Work remains local; no commit or push.

## Car 01 Phase IV–VI real-control grammar correction

- 2026-08-05: Human feedback identified the hidden Phase IV success threshold: an early live TEST could remain energized while D moved the counterweight, then silently complete as the load crossed the adhesion threshold. Weight Transfer now records each TEST pull as `stale` or `armed`; a stale live test cannot regain grip when the conditions later become ready. The player must return the handle to OFF and deliberately re-test. A regression reproduces the exact early-TEST + D sequence.
- Phase V now borrows a single-car brake-test method instead of presenting repair controls immediately. One A/B selector routes the same spring TEST to each bogie; the player reads the same brake-line pressure against different piston travel, returns TEST to OFF before changing selection, and may open the brake-cylinder service face only after confirming B's same-pressure/zero-travel contradiction. Browser QA completed the entire diagnosis and safe repair chain.
- Phase VI's abstract routing diagram was replaced with locomotive control-stand grammar: a strip-chart load recorder with a marked sector, two large Bogie A/B traction-current meters, a detented motor-group selector, and one OFF/NOTCH 1 master controller. Wrong group A now visibly raises only the A ammeter; selecting the repaired B group and applying Notch 1 in the recorder sector raises B current and bites. Frozen window and biting fixtures were visually inspected.
- Verification after the redesign: 426/426 tutorial tests, direct Vite production build, syntax and whitespace checks pass. Phase V browser QA passes; Phase VI targeted state-machine tests and short rendered-state visual smoke pass. A long Phase VI headless timing run was interrupted repeatedly by an unrelated concurrent process touching the whole repository and restarting Vite, so the final human feel/timing pass remains the authoritative gate. No commit or push.

## Car 01 Phase IV–VI shared rolling-bearing table redesign

- 2026-08-05: Superseded the separate Phase IV weight, Phase V brake-service, and Phase VI traction-console runtime presentations with one persistent point-and-click rolling-bearing service table. The same physical board now layers pressure launch, three counterweight detents, A/B electrical routing, a visible contact bridge, and a spring release; IV teaches pressure + weight, V asks for an A reference then a B fault comparison and repair, and VI combines the repaired route with the player's recorded IV weight movement as a timing partner.
- The board uses a generated 1960s cast-iron base plate plus CC0 pipe/industrial source art with repository provenance. Brass rails carry the bearing, a separate cyan run exposes the electrical route, the reservoir fluid is the pressure readout, and failed bearings stop at the rejecting part before recirculating. Old IV/V/VI modules remain historical code only and are no longer selected by the live stage data.
- Browser QA found and fixed a runtime-only integration bug where mechanical-table objective copy had been inserted into `buildMachinery()` and referenced an undefined `puzzle`; the code now lives in `objectiveText()`. The focused model has 9/9 tests, the full tutorial suite has 435/435, syntax and `git diff --check` pass, and direct Vite production build succeeds. `assets:check` still stalls while reading existing iCloud on-demand source panoramas, although all generated build assets bundled successfully. Final first-time visual/feel judgment remains a human playtest gate. No commit or push.

## Chapter 3 painterly civic-square visual rebuild

- 2026-08-05: George rejected the Gate 5 Chapter 3 greybox as final art: flat grey baked layers, capsule heroes, line-like crowds, debug-looking relationship overlays, and no convincing 3D depth or painterly world identity. The selected replacement target is the warm late-afternoon civic-square concept with a clock-centered mosaic plaza, worn stucco architecture, tram/market/fountain landmarks, long shadows, ochre/coral/oxidized-teal palette, and fully modeled readable people.
- Scope is visual only. Preserve `echoCityIsoModel.js`, the waypoint graph, camera beats, state/event vocabulary, inputs, reset and the complete golden path. Use real CC0 3D sources from Quaternius/Kenney/Poly Haven or the already verified external library, then repaint/render them into the Phaser 2.5D pipeline. Do not use the selected AI concept as a flattened runtime background.
- 2026-08-05: Integrated George's four Hunyuan environment GLBs. Each source was a single roughly 1.5M-triangle mesh with three embedded 4K PBR maps. The reusable Blender optimizer reduced them to 24k clock / 36k tram / 28k fountain / 40k stall triangles (97.3–98.4% reduction), normalized authored meter scale and repacked 2K textures. Optimized sources live outside Git under `NIGHTFALL_Source_Assets/05_CH03_CITY/HUNYUAN_GENERATED/optimized/`; Phaser now loads the camera-locked `assets-iso-v2/city_full_hunyuan_v2.webp` derivative. The clock faces the fixed camera to avoid the earlier flower-like four-face read. Browser entry/market movement and console passed; 75/75 Car 03 tests, asset check and isolated production build passed. Remaining visual bottlenecks are the generic building shell, flat tiled ground, procedural transit/surveillance mechanisms and placeholder characters/crowd—not these four hero props.
- 2026-08-05 follow-up human review superseded the earlier "visual only / freeze waypoint behavior" constraint. The visible paving and actual point-and-click space must be one contract: market, train, clock, transit and fountain courts are now broad click-exact walkable areas routed through the gated waypoint spine; connecting lanes still snap to their rendered centerline; dark streets reject explicitly. This fixes the observed case where plausible visible destinations could not be reached while preserving every named gate, checkpoint, field crossing and golden-path event.
- Rebuilt the offline city as Blender v4 with two authored civic buildings, a physical scanner tower, tram rails, enlarged Hunyuan clock, Hunyuan tram/fountain/stalls and broad graph-aligned limestone courts. The calibrated v4 bake then received a project-generated, geometry-preserving painterly surface pass: worn cobbles, cracked plaster, grime, oxidized copper, long amber shadows and deep plum non-walkable streets. Phaser now loads `assets-iso-v2/city_full_painterly_v5.webp` (535KB); the full-resolution generated source is retained at `outputs/chapter03-visual-redesign/city_full_painterly_v5-source.png`.
- Replaced the market gate's four opaque red debug-like banners with two retracting wrought-iron leaves so the live mechanism sits inside the painted architecture. Runtime QA confirmed the new asset loads from the restarted Vite server, ordinary broad-court clicks and dark-ground rejection produce no browser errors, and the console is clean. Chapter 3 tests are 77/77; asset verification, isolated Car 03 production build, full production build and whitespace checks pass. The bundled Playwright client was attempted but unavailable because its package runtime is not installed; the in-app browser was used for live input and rendering QA.

## Prologue IV–VI Kentucky-stage environment rebuild

- 2026-08-05: Replaced the shared rolling-bearing board's flat control-panel presentation with one continuous theatrical train cutaway derived from Kentucky Route Zero's stagecraft principles rather than any copied asset: a narrow passenger saloon above, three selective underfloor light pools, large negative space, a continuous cyan pressure trunk and brass bearing path, and fixed spatial roles for pump, rocker/bogie, route break and output.
- IV, V and VI now reuse the same environment while changing the question. IV teaches pressure and load through a full bogie/rocker silhouette; V proves A, exposes a fixed B-branch open contact and lets the player seat a hanging physical jumper; VI replays the IV trajectory on an upper rail and adds a launch cam exactly one bearing-travel time before the coupling cradle. Failed runs leave a persistent mark at the rejecting component instead of disappearing with a toast.
- Real connected-browser input verified IV's underpowered recovery and correct completion, V's A-reference → B-gap → bridge → B-pass chain, and VI's cam-window release → coupling completion. The model now exposes `lastObservation`, `attemptCount`, `ghost.releaseProgress` and `ghost.releaseWindowActive`; all are read-only presentation evidence and do not change the locked success rules.
- Saved the target keyframe at `outputs/prologue-iv-vi-environment-target/krz-stage-target-v1.png` and an isolated Hunyuan-ready bogie/rocker/counterweight modeling reference at `outputs/prologue-iv-vi-environment-target/modeling-reference/bogie-rocker-counterweight-hunyuan-reference.png`.
- 2026-08-05: George returned the generated Hunyuan bogie GLB. Inspection confirmed a coherent 1.499M-triangle single mesh with three embedded 4K PBR maps. The reusable Blender pipeline normalized it to a 3.20m railway scale, decimated it to 48k triangles (96.8% reduction), repacked 2K maps and stored the roughly 11MB editable derivative outside Git under `NIGHTFALL_Source_Assets/01_PROLOGUE/HUNYUAN_GENERATED/optimized/`.
- Phaser now loads only a fixed-camera transparent WebP derivative (`src/assets/tutorial/mechanical-table/hunyuan/bogie-stage-v1.webp`, roughly 73KB) as the subdued centre-bay structural layer. Interactive rocker tilt, counterweight detents, spring compression, bearing travel, route gap and failure evidence remain live graphics above it. Connected-browser IV/V/VI screenshots are in `outputs/prologue-iv-vi-bogie-import/browser/`; 437/437 tutorial tests, 10 panoramas / 30 textures, production build and whitespace checks pass. No commit or push.
- 2026-08-05 human visual review **superseded the runtime Hunyuan underlayer**. Even at low contrast it read as a pasted photographic object and obscured the puzzle's causal grammar. The optimized GLB and derivative remain archived as source/reference material, but Phase IV no longer preloads or renders them.
- Phase IV is now one coherent suspension-balance machine instead of a decorated control panel: a four-step air reservoir visibly lifts one side of an equalizer beam, a trolley supplies the opposing moment at three physical detents, and a moving pin must enter a fixed fork before the bearing release becomes live. One pump stroke can align the mechanism but lacks working pressure; the second stroke supplies enough pressure but tips the beam, forcing the player to infer the load correction before committing. Underpowered and misweighted launches leave different physical evidence and recover in place. Focused tests (12/12), the full tutorial suite (438/438), asset verification, production build and whitespace checks pass.
- 2026-08-05 follow-up human playtest **rejected this balance-rig revision and the shared IV–VI bearing-table premise**. The right-side receiver and launched bearing had no legible real-world meaning, success/failure depended on designer explanation, and the red warning banner substituted text for physical feedback. Do not continue polishing or extending this implementation. The replacement arc must be confirmed at gameplay level before further code: IV spatial load transfer, V evidence-based diagnosis and safe repair, VI automated traction handoff combining pneumatic load sensing with electrical routing.

## Chapter 3 Hunyuan civic-building optimization and v6 integration

- 2026-08-06: George delivered the isolated municipal archive, transit ministry and scanner-tower GLBs. Each source was a single roughly 1.5M-triangle mesh with embedded 4K PBR maps and was too heavy for direct browser use. A streaming meshoptimizer first pass preserved mesh boundaries before the existing Blender pipeline performed final decimation, scale normalization and 2K PBR repacking.
- Final editable sources are outside Git under `NIGHTFALL_Source_Assets/05_CH03_CITY/HUNYUAN_GENERATED/optimized_v2/`: archive 1,496,608 → 79,999 triangles (18.5MB), transit ministry 1,498,702 → 70,000 triangles (15.5MB), scanner tower 1,500,000 → 31,999 triangles (15.1MB). Visual preview inspection retained the archive buttresses/windows/entrance, transit steps/arches/clock and the tower sensor cage/legs.
- Replaced the procedural archive, ministry and scanner geometry in the camera-locked Blender city and rendered the v5 geometry pass. A geometry-locked painterly treatment then transferred only the approved warm civic-square material/light language while preserving the seven Hunyuan landmarks, walkable paving boundaries and fixed camera. Phaser now loads `src/cars/presentCity/assets-iso-v2/city_full_painterly_v6.webp` (1586×992, about 577KB); its full-resolution source is `outputs/chapter03-visual-redesign/city_full_painterly_v6-source.png`.
- Final verification: 77/77 Chapter 3 tests, 10 panoramas / 30 textures, isolated Car 03 build, full production build, GLB validation and whitespace checks pass. In-app browser QA at 1280×720 confirmed the v6 image loads cleanly and the world/UI registration remains aligned. No Chapter 5 file was touched; no commit or push.

## Prologue Phase IV — The First Weight playable replacement

- 2026-08-06: Replaced the rejected Phase IV rolling-bearing/service-table entry with one world-space narrative puzzle. A loose baggage case falls at the right detent and visibly tilts a shared equalizer beam; carrying it to the middle levels the car and exposes a witness tag for the persistent ticket-punch verb. After the punch, walking toward the exit adds the player's own weight and spoils that apparent answer. The final composition is case left + player right, held level for 600ms; the partition then opens.
- The route has one visible start and one visible exit, three physical detents, no close-up panel, gauge, red warning, death, timer display, or full reset. Wrong placements remain on screen and are recoverable. A pure `firstWeight.js` state machine owns causality, while `firstWeightArt.js` redraws the rail, case, tag, cable, beam, springs and exit plate from the same snapshot.
- Browser input completed the playable checkpoint through final door opening with no console errors. Evidence is in `outputs/phase4-first-weight/`. Six focused logic tests and the full tutorial suite pass (444/444); direct Vite production build and whitespace checks pass. Work remains local; no commit or push.

## Chapter 3 real-time GLB preview

- 2026-08-06: The flattened v6 bake remains available for comparison, but the active visual direction is now an actual Three.js scene at `car03-3d.html`. Seven unique Hunyuan assets load as Meshopt-compressed GLBs at runtime: clock tower, tram, reunion fountain, market stall, municipal archive, transit ministry and scanner tower. The stall is instanced twice; all landmarks receive live light and shadow.
- Added a real 3D civic-square ground system instead of using the generated city image as a background: warm worn-limestone albedo/height/roughness material, darker court paving, non-walkable cobbled streets, raised stone edging, graph-aligned path ribbons, rails, sleepers, lamps, fountain water and patinated landmark islands. The generated texture is used only as a seamless material source; the plaza layout and depth remain authored geometry.
- The isolated preview uses a fixed orthographic 3/4 starting camera with optional right-drag inspection and wheel zoom. Left click projects onto a continuous navigation plane, validates the authored courts/waypoint ribbons and A* routes the placeholder player while rejecting buildings, clock, fountain and dark streets. Connected-browser QA confirmed all 7/7 GLBs load, live click movement works, blockers reject, the current renderer draws about 714k triangles, and the current navigation produced no new console warnings or errors.
- The seven runtime GLBs are stored under `public/assets/chapter03-3d/models/`; material maps and provenance are under `public/assets/chapter03-3d/materials/` and `public/assets/chapter03-3d/ASSET_MANIFEST.json`. This is an isolated visual/play-space preview and does not yet replace the accepted Chapter 3 puzzle entry or final contributor-owned character models.
- 2026-08-06: George approved the real-time 3D civic square as the basis for a short literary narrative chapter and asked to design before adding more art. The first abstract **THE MISSING MINUTE** exploration was immediately rejected and is marked superseded. The replacement authority is `docs/CHAPTER_03_MOVE_AS_ONE_NARRATIVE_LOCK.md`: Chapter 2 has already put one Mara on the train; Chapter 3 asks Butch to reach a second Mara whose civic pass was canceled as a duplicate, then bring her aboard before lockdown. The concrete arc is urge (make Mara recognize him) → objective (reach and return with her) → external obstacle (behaviour scanner and duplicate-pass bureaucracy) → internal obstacle (Butch treats her as evidence and walks ahead) → need/payoff (walk beside her; the train accepts both). The lock includes exact opening/Eda/Sava/Mara dialogue, 14 required interactive objects, 20 optional small-object interactions, model priorities and full-game state outputs.
- 2026-08-06 dialogue/prop production supplement: `docs/CHAPTER_03_DIALOGUE_SCRIPT_V01.md` now carries the complete playable English script from the tram threshold through scanner teaching, Eda, the porter routine, Sava's force/evidence/appeal branches, optional Archive evidence, Mara's fountain conversation, paired-movement failure barks, the two-ticket door test and the final boarding exchange. `docs/CHAPTER_03_P0_PROP_MODEL_PROMPTS.md` provides one short Hunyuan-ready prompt, scale and movable-part contract for every P0 interaction object, while correctly keeping passes/forms and the scanner return plate as lightweight local geometry/textures. Six high-risk props have reviewed isolated image-to-3D references under `docs/visual-references/chapter03-props-v01/`: queue dispenser, produce scale, porter handcart, receipt spike, crosswalk signal and night-train ticket reader.

## Prologue Phase V–VI playable narrative replacement

- 2026-08-06: George accepted Phase IV `THE FIRST WEIGHT` and rejected further
  rolling-bearing-table polish. Phase V and VI now continue that world-space
  language instead of opening another control panel. V `TWO TRUE THINGS` asks
  the player to punch two contradictory case records and independently restore
  an amber winch and cyan air cushion so both cases can remain on separate
  supports. VI `THE TRAIN REMEMBERS` replays the player's Phase IV case movement
  as an amber past action; the player counterbalances it in the present, then
  abandons balance to catch a redacted record while the train supplies the
  missing counter-movement. Minimal carriage stencils distinguish PAST from
  PRESENT. Phase IV runtime is preserved apart from exporting its performed
  trace. Full tutorial suite passes 457/457, production build and browser
  console checks pass. No commit or push.

## Chapter 3 Hunyuan narrative-prop integration

- 2026-08-06: Began the user-requested runtime integration of all ten optimized Hunyuan props into the isolated `car03-3d.html` Three.js scene. Copied only the 7k–14k / 1024px PBR runtime GLBs into `public/assets/chapter03-3d/models/`; the roughly 500k-triangle sources remain outside the repository.
- Added semantic placement by district instead of undirected square dressing: arrival receives the queue dispenser and night reader; market receives the produce scale, porter handcart and receipt device; transit/scanner receives the queue stanchion, clerk stamp machine, crosswalk signal and PA speaker; fountain receives the reunion bench. Ground props contribute authored A* obstacles, the stamp machine receives a physical counter, the speaker receives a pole, and generated meshes align their actual bounds to the intended support height.
- Updated the runtime manifest and loading diagnostics from 7 to 17 unique GLBs. Six small interaction anchors were enlarged 20–35% after district close-up review, with matching obstacle dimensions, so they remain readable without becoming architectural-scale props.
- Final connected-browser verification loads 17/17 assets with no console warnings or errors. A real centre-screen market click produced a 21-node A* route and the player completed it from the tram entrance to `[-17.10, -0.10]` while avoiding the new prop blockers. The focused prop contract passes 3/3, the isolated Car 03 build and full direct Vite production build pass, and scoped whitespace validation is clean. The repository-wide `assets:check` remains affected by the already-documented iCloud/on-demand source scan stall; the new ten runtime GLBs are independently covered by the focused existence/size contract.

## Prologue Phase V–VI placeholder-replacement verification pass

- 2026-08-06: Completed the placeholder-replacement acceptance for Phase V
  `TWO TRUE THINGS` and Phase VI `THE TRAIN REMEMBERS`. The frozen state
  machines, answers, timings and Phase IV trace contract remain unchanged.
- Added aspect-ratio-safe `fitNarrativeSprite()` use for memory inserts,
  cradles, cases, crop gate and redaction strips. The primary cradle now shows
  empty before the fall, overloaded after it, and stable only after settling.
- Both art modules re-apply their latest snapshot when shown, preventing hidden
  future-state sprites from waking early. Redaction strips now stay at the crop
  gate while the strained record falls separately; PRESENT/caption placement
  and the PAST teaching label were adjusted to reduce overlap.
- Added DEV-only `hanging`, `city-witnessed` and `caught` QA states plus camera
  framing for the pivot and catch beats. The copied-workspace acceptance saved
  13 state screenshots under `outputs/phase5-6-placeholder-pass/`, reported
  457/457 tutorial tests, a successful production build and clean whitespace.
- 2026-08-06: Closed the remaining Phase VI travelling-counterweight asset
  delta. Generated an isolated, transparent theatrical railway counterweight
  sprite with a dark trolley yoke, brass rollers, three stacked mass plates
  and a cyan service witness mark. `TrainRemembersArt` now moves this sprite
  along the live winch cable from `trainCounterweightX`; the former 48x25
  procedural brass box is gone. The puzzle state machine and timings remain
  unchanged. Browser QA checked the `caught` and `solved` fixtures with no new
  console warnings, 457/457 tutorial tests pass, and the production build
  includes the new asset.
- Human review is still needed for the echo/title overlap, player visibility
  behind a carried case, and the intentionally squashed unpressurized cyan
  cushion.

## Phase V–VI narrative PNG withdrawal

- 2026-08-06: George rejected the complete Kimi narrative-PNG replacement,
  not only the later travelling counterweight. Phase V and VI now render the
  archive cases, memory inserts, both cradles, ticket punch, amber winch, cyan
  cushion, jettison hatch, Archivist crop gate/redaction, and travelling mass
  with Phaser Graphics again. The V/VI state machines, answers, timings,
  failure recovery and Phase IV trace contract were not changed.
- Removed the narrative preload from `GameScene`. The former loader and all
  `narrative-v2` PNG/source files were moved intact to
  `outputs/withdrawn-narrative-v2/` so the experiment is recoverable but no
  longer part of runtime or the production bundle.
- Verification: 457/457 tutorial tests pass, direct Vite production build
  passes, browser QA for V entry and VI solved reports no console errors, and
  the live preview remains available at `http://127.0.0.1:5187/`.
