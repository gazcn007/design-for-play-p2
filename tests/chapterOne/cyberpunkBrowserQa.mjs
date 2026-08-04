import { mkdir, writeFile } from 'node:fs/promises';

const port = process.env.CHROME_DEBUG_PORT ?? '9222';
const baseUrl = process.env.GAME_URL ?? 'http://127.0.0.1:5180';
const outputDir = process.env.QA_OUTPUT_DIR ?? '/private/tmp/cyberpunk-parkour-qa';

const targets = await fetch(`http://127.0.0.1:${port}/json`).then((response) => response.json());
const target = targets.find(({ type }) => type === 'page');
if (!target) throw new Error('No debuggable Chrome page target found.');

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

let nextId = 0;
const pending = new Map();
const pageErrors = [];
socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  }
  if (message.method === 'Runtime.exceptionThrown') {
    pageErrors.push(message.params.exceptionDetails.text);
  }
  if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') {
    const entry = message.params.entry;
    // The development document has never declared a favicon. Chrome reports
    // that harmless document-level 404 through Log.entryAdded; it is not a
    // game resource or scene-console failure.
    if (!entry.url?.endsWith('/favicon.ico')) pageErrors.push(entry.text);
  }
});

const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++nextId;
  pending.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params }));
});

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const evaluate = async (expression) => {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
};
const keyEvent = (type, key, code, keyCode) => send('Input.dispatchKeyEvent', {
  type,
  key,
  code,
  text: type === 'keyDown' ? key : undefined,
  windowsVirtualKeyCode: keyCode,
  nativeVirtualKeyCode: keyCode,
});

await mkdir(outputDir, { recursive: true });
await send('Runtime.enable');
await send('Log.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: 960,
  height: 636,
  deviceScaleFactor: 1,
  mobile: false,
});

const states = [
  ['entrance', 'chapter=cyberpunk'],
  ['illegal-drag', 'qa=parkour-drag'],
  ['moving-car', 'qa=parkour-car'],
  ['recovery', 'qa=parkour-recovery'],
  ['recovery-car-b', 'qa=parkour-recovery-car-b'],
  ['spikes', 'qa=parkour-spikes'],
  ['after-reset', 'qa=parkour-reset'],
  ['completion', 'qa=parkour-goal'],
];

const evidence = {};
for (const [name, query] of states) {
  await send('Page.navigate', { url: `${baseUrl}/?${query}` });
  const deadline = Date.now() + 20000;
  let snapshot = null;
  while (Date.now() < deadline) {
    await delay(120);
    const rendered = await evaluate('window.render_game_to_text?.() ?? null');
    if (!rendered) continue;
    const candidate = JSON.parse(rendered);
    if (candidate.scene === 'CyberpunkParkour') {
      snapshot = candidate;
      break;
    }
  }
  if (!snapshot) throw new Error(`Timed out waiting for ${name} parkour state.`);
  if (name === 'completion') {
    await send('Page.bringToFront');
    await evaluate("document.querySelector('canvas').focus()")
    await keyEvent('keyDown', 'd', 'KeyD', 68);
    let goalSnapshot = null;
    let nextAreaSnapshot = null;
    for (const deadline = Date.now() + 12000; Date.now() < deadline;) {
      await delay(80);
      const rendered = await evaluate('window.render_game_to_text()');
      const candidate = JSON.parse(rendered);
      if (candidate.scene === 'CyberpunkParkour' && candidate.parkour.goalComplete) {
        goalSnapshot = candidate;
      }
      if (candidate.scene === 'Game' && candidate.world?.index === 2) {
        nextAreaSnapshot = candidate;
        break;
      }
    }
    await keyEvent('keyUp', 'd', 'KeyD', 68);
    if (!goalSnapshot) {
      throw new Error('Ordinary movement did not trigger the goal door before leaving the parkour.');
    }
    if (!nextAreaSnapshot) {
      throw new Error('The completed parkour did not enter story world 2.');
    }
    if (Math.abs(nextAreaSnapshot.player.x - 5291) > 80
      || nextAreaSnapshot.player.lane !== 1) {
      throw new Error(`Next-area arrival was not at its authored entrance: ${JSON.stringify(nextAreaSnapshot.player)}`);
    }
    evidence['completion-door'] = goalSnapshot;
    snapshot = nextAreaSnapshot;
  } else if (name === 'recovery' || name === 'recovery-car-b') {
    await send('Page.bringToFront');
    await evaluate("document.querySelector('canvas').focus()")
    await keyEvent('keyDown', 'w', 'KeyW', 87);
    await delay(name === 'recovery' ? 3000 : 1800);
    await keyEvent('keyUp', 'w', 'KeyW', 87);
    await delay(250);
    snapshot = JSON.parse(await evaluate('window.render_game_to_text()'));
    const recovered = name === 'recovery'
      ? snapshot.parkour.player.x >= 1130 && snapshot.parkour.player.x <= 1200 && snapshot.parkour.player.y <= 200
      : snapshot.parkour.player.x >= 3750 && snapshot.parkour.player.x <= 3800 && snapshot.parkour.player.y <= 350;
    if (!recovered) {
      throw new Error(`Recovery ladder did not return the player to the prior route: ${JSON.stringify(snapshot.parkour.player)}`);
    }
  } else if (name === 'spikes') {
    const spikes = snapshot.parkour.hazards.find(({ label }) => label === 'spikes');
    if (spikes.width !== 96 || spikes.visualSegments !== 4) {
      throw new Error(`Spike strip did not render as four segments: ${JSON.stringify(spikes)}`);
    }
  }
  // Let the smoothed follow camera reach seeded ride/goal positions before
  // capturing, while leaving enough motion for the flying-car phase to prove
  // it is live rather than a static prop.
  await delay(1200);
  const screenshot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  await writeFile(`${outputDir}/${name}.png`, Buffer.from(screenshot.data, 'base64'));
  evidence[name] = snapshot;
  if (name === 'moving-car') {
    await send('Page.bringToFront');
    await evaluate("document.querySelector('canvas').focus()")
    const carryStart = JSON.parse(await evaluate('window.render_game_to_text()'));
    const startCar = carryStart.parkour.flyingCars.find(({ id }) => id === 'car-a');
    const startOffset = carryStart.parkour.player.x - startCar.visualX;
    await delay(900);
    const carryEnd = JSON.parse(await evaluate('window.render_game_to_text()'));
    const endCar = carryEnd.parkour.flyingCars.find(({ id }) => id === 'car-a');
    const endOffset = carryEnd.parkour.player.x - endCar.visualX;
    if (carryEnd.parkour.player.ridingCar !== 'car-a'
      || Math.abs(endOffset - startOffset) > 2
      || Math.abs(endCar.x - startCar.x) < 35
      || Math.abs(endCar.visualX - endCar.x) > 4
      || endCar.collisionX !== endCar.visualX) {
      throw new Error(`Idle rider did not inherit the flying car delta: ${JSON.stringify({ carryStart: carryStart.parkour.player, startCar, carryEnd: carryEnd.parkour.player, endCar })}`);
    }
    await keyEvent('keyDown', 'd', 'KeyD', 68);
    await delay(140);
    await keyEvent('keyUp', 'd', 'KeyD', 68);
    await delay(120);
    const movedOnCar = JSON.parse(await evaluate('window.render_game_to_text()'));
    const movedCar = movedOnCar.parkour.flyingCars.find(({ id }) => id === 'car-a');
    if (movedOnCar.parkour.player.ridingCar !== 'car-a'
      || movedOnCar.parkour.player.x - movedCar.visualX <= endOffset + 5) {
      throw new Error(`A/D did not move the rider relative to the flying car: ${JSON.stringify(movedOnCar.parkour.player)}`);
    }
    evidence['ride-controls'] = { carryStart, carryEnd, movedOnCar };
    await keyEvent('keyDown', 'a', 'KeyA', 65);
    await delay(240);
    await keyEvent('keyUp', 'a', 'KeyA', 65);
    let launchReady = false;
    let lastRideState = null;
    let rideExit = null;
    for (const deadline = Date.now() + 8000; Date.now() < deadline;) {
      await delay(100);
      const candidate = JSON.parse(await evaluate('window.render_game_to_text()'));
      const car = candidate.parkour.flyingCars.find(({ id }) => id === 'car-a');
      lastRideState = { player: candidate.parkour.player, car };
      if (!candidate.parkour.player.ridingCar && candidate.parkour.player.x >= 1570) {
        // At the extreme endpoint Arcade can place a standing rider directly
        // onto the overlapping roof lip. That is also a safe full-route exit.
        rideExit = candidate;
        launchReady = true;
        break;
      }
      if (candidate.parkour.player.ridingCar === 'car-a' && car.phase >= 0.88) {
        launchReady = true;
        break;
      }
    }
    if (!launchReady) throw new Error(`Flying car never carried the player to its jump-off window: ${JSON.stringify(lastRideState)}`);
    if (!rideExit) {
      await keyEvent('keyDown', 'd', 'KeyD', 68);
      await keyEvent('keyDown', ' ', 'Space', 32);
      await delay(180);
      await keyEvent('keyUp', ' ', 'Space', 32);
      await delay(1050);
      await keyEvent('keyUp', 'd', 'KeyD', 68);
      await delay(350);
      rideExit = JSON.parse(await evaluate('window.render_game_to_text()'));
    }
    if (rideExit.parkour.player.x < 1570 || rideExit.parkour.player.ridingCar) {
      throw new Error(`Player did not jump off the flying car onto the next roof: ${JSON.stringify(rideExit.parkour.player)}`);
    }
    evidence['ride-exit'] = rideExit;
  }
}

// Exercise the real pointer/keyboard path for both movable kinds, the first
// ladder climb, and R reset. Model tests cover the full authored bounds; this
// pass proves Phaser input, view placement and collision commit are wired to
// that model in the running scene.
await send('Page.navigate', { url: `${baseUrl}/?chapter=cyberpunk` });
let liveReady = false;
for (const deadline = Date.now() + 20000; Date.now() < deadline;) {
  await delay(120);
  const rendered = await evaluate('window.render_game_to_text?.() ?? null');
  if (rendered && JSON.parse(rendered).scene === 'CyberpunkParkour') {
    liveReady = true;
    break;
  }
}
if (!liveReady) throw new Error('Timed out waiting for live-input parkour state.');
await send('Page.bringToFront');
await evaluate("document.querySelector('canvas').focus()")
const canvas = await evaluate(`(() => {
  const rect = document.querySelector('canvas').getBoundingClientRect();
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
})()`);
const point = (worldX, worldY) => ({
  x: canvas.left + worldX * canvas.width / 960,
  y: canvas.top + worldY * canvas.height / 600,
});
const drag = async (fromX, fromY, toX, toY) => {
  const from = point(fromX, fromY);
  const to = point(toX, toY);
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...from, button: 'none', buttons: 0 });
  await delay(50);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...from, button: 'left', buttons: 1, clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...to, button: 'left', buttons: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...to, button: 'left', buttons: 0, clickCount: 1 });
  await delay(160);
};
await drag(550, 260, 735, 260);
const ladderDragState = JSON.parse(await evaluate('window.render_game_to_text()'));
const liveLadder = ladderDragState.parkour.movables.find(({ id }) => id === 'ladder-a');
if (Math.abs(liveLadder.x - 735) > 2) {
  throw new Error(`Live ladder drag did not commit: ${JSON.stringify({ ladder: liveLadder, drag: ladderDragState.parkour.drag, pointer: ladderDragState.parkour.lastPointerEvent })}`);
}
await drag(180, 509, 420, 509);
await keyEvent('keyDown', 'd', 'KeyD', 68);
await delay(1400);
await keyEvent('keyDown', ' ', 'Space', 32);
await delay(250);
await keyEvent('keyUp', 'd', 'KeyD', 68);
await delay(450);
await keyEvent('keyUp', ' ', 'Space', 32);
await delay(600);
await keyEvent('keyDown', 'd', 'KeyD', 68);
await keyEvent('keyDown', ' ', 'Space', 32);
await delay(900);
await keyEvent('keyUp', ' ', 'Space', 32);
await delay(1800);
await keyEvent('keyUp', 'd', 'KeyD', 68);
await keyEvent('keyDown', 'w', 'KeyW', 87);
await delay(1600);
await keyEvent('keyUp', 'w', 'KeyW', 87);
await delay(250);
const climbed = JSON.parse(await evaluate('window.render_game_to_text()'));
if (!climbed.parkour.movedKinds.includes('ladder')
  || !climbed.parkour.movedKinds.includes('block')
  || climbed.parkour.player.y >= 260) {
  throw new Error(`Live drag or ladder-climb route did not reach the first rooftop: ${JSON.stringify({ player: climbed.parkour.player, movables: climbed.parkour.movables, lastPointerEvent: climbed.parkour.lastPointerEvent })}`);
}
const movedBlock = climbed.parkour.movables.find(({ id }) => id === 'block-a');
if (Math.abs(movedBlock.x - 420) > 2 || movedBlock.collisionX !== movedBlock.x) {
  throw new Error(`Block view/body mismatch after drag: ${JSON.stringify(movedBlock)}`);
}
// Return to the ground approach while preserving the committed drag so the
// moved block's live collision can be tested independently of the roof route.
await evaluate("window.game.scene.getScene('CyberpunkParkour').player.body.reset(70, 490)");
await delay(180);
await keyEvent('keyDown', 'd', 'KeyD', 68);
await delay(1800);
await keyEvent('keyUp', 'd', 'KeyD', 68);
await delay(180);
const blockCollision = JSON.parse(await evaluate('window.render_game_to_text()'));
if (blockCollision.parkour.player.x < 362 || blockCollision.parkour.player.x > 385) {
  throw new Error(`Player did not pass the old block and stop at the moved block: ${JSON.stringify(blockCollision.parkour.player)}`);
}
const liveScreenshot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
await writeFile(`${outputDir}/live-controls.png`, Buffer.from(liveScreenshot.data, 'base64'));
await keyEvent('keyDown', 'r', 'KeyR', 82);
await delay(100);
await keyEvent('keyUp', 'r', 'KeyR', 82);
await delay(300);
const resetByKey = JSON.parse(await evaluate('window.render_game_to_text()'));
if (resetByKey.parkour.resetCount !== 1 || resetByKey.parkour.movedKinds.length !== 0) {
  throw new Error('R did not restore the authored parkour state.');
}
evidence['live-controls'] = { climbed, blockCollision, resetByKey };

// Integration boundary: the real departure cinematic owns the scene switch.
// The fixture seeds only the already-tested final Prologue room, then invokes
// the same departure method that final puzzle completion calls.
await send('Page.navigate', { url: `${baseUrl}/?qa=tutorial-exit` });
let gameReady = false;
for (const deadline = Date.now() + 20000; Date.now() < deadline;) {
  await delay(120);
  const rendered = await evaluate('window.render_game_to_text?.() ?? null');
  if (rendered && JSON.parse(rendered).scene === 'Game') {
    gameReady = true;
    break;
  }
}
if (!gameReady) throw new Error('Timed out waiting for the Prologue hand-off fixture.');
await evaluate("window.game.scene.getScene('Game').playPrologueDeparture()")
let handoff = null;
for (const deadline = Date.now() + 12000; Date.now() < deadline;) {
  await delay(160);
  const rendered = await evaluate('window.render_game_to_text?.() ?? null');
  if (!rendered) continue;
  const candidate = JSON.parse(rendered);
  if (candidate.scene === 'CyberpunkParkour') {
    handoff = candidate;
    break;
  }
}
if (!handoff) throw new Error('Prologue departure did not enter the cyberpunk parkour scene.');
evidence['prologue-handoff'] = handoff;

await writeFile(`${outputDir}/states.json`, `${JSON.stringify(evidence, null, 2)}\n`);
socket.close();

if (pageErrors.length) {
  throw new Error(`Browser errors:\n${pageErrors.join('\n')}`);
}
console.log(JSON.stringify({ states: Object.keys(evidence), pageErrors }, null, 2));
