import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = (path) => readFileSync(resolve(root, path), 'utf8');

test('every delivered film is preserved as a production runtime asset', () => {
  for (const name of ['start', '1-2', '2-3', '3-4', '4-5', 'end']) {
    assert.equal(existsSync(resolve(root, `public/cinematics/${name}.mp4`)), true, `${name}.mp4 missing`);
  }
});

test('the completed chapter route owns all four film handoffs', () => {
  assert.match(source('src/scenes/GameScene.js'), /CINEMATICS\.chapter1To2/);
  assert.match(source('src/cars/cyberpunkParkour/CyberpunkParkourScene.js'), /CINEMATICS\.chapter2To3/);
  assert.match(source('src/cars/presentCity3d/Chapter3OpeningRuntime.js'), /CINEMATICS\.chapter3To4/);
  assert.match(source('src/chapters/paintedCountry/PigmentTrainScene.js'), /CINEMATICS\.chapter4To5/);
});

test('every transition preloads its next chapter while the film is playing', () => {
  const flow = source('src/shell/gameFlow.js');
  const title = source('src/shell/titleMenu.js');
  const chapter1 = source('src/scenes/GameScene.js');
  const chapter2 = source('src/cars/cyberpunkParkour/CyberpunkParkourScene.js');
  const chapter3 = source('src/cars/presentCity3d/Chapter3OpeningRuntime.js');
  const chapter4 = source('src/chapters/paintedCountry/PigmentTrainScene.js');
  assert.match(flow, /video\.addEventListener\('playing', beginPreload/);
  for (const [file, chapter] of [[title, 1], [chapter1, 2], [chapter2, 3], [chapter3, 4], [chapter4, 5]]) {
    assert.match(file, new RegExp(`preloadChapterId: 'chapter${chapter}'`));
  }
});

test('the playable Chapter 5 collapse starts preloading the final boss', () => {
  const museum = source('src/chapters/museum3d/Museum3DApp.js');
  assert.match(museum, /directionId === CHAPTER05_DIRECTIONS\.LABYRINTH.*preloadChapter\('chapter6'\)/s);
  assert.match(museum, /labyrinthComplete[\s\S]*preloadChapter\('chapter6'\)/);
  const profiles = source('src/shell/chapterPreloader.js');
  assert.match(profiles, /route: '\/final-boss\.html\?from=chapter5'/);
  assert.match(profiles, /6\.1_threshold_modern\.mp3/);
});

test('Chapter 5 black threshold lands directly in the final boss', () => {
  const collapse = source('src/chapters/museum3d/state/collapseGauntlet.js');
  const boss = source('src/chapters/finalBoss/spectacleBattle.js');
  assert.match(collapse, /\/final-boss\.html\?from=chapter5/);
  assert.match(boss, /get\('from'\) === 'chapter5'/);
  assert.match(boss, /CINEMATICS\.ending/);
  assert.match(boss, /window\.location\.assign\('\/\?credits=1'\)/);
  assert.match(source('src/main.js'), /creditsRequested[\s\S]*openCredits: true/);
  assert.match(source('src/main.js'), /DEV_MODE \|\| playRequested/);
  assert.match(source('src/shell/saveSystem.js'), /window\.location\.assign\('\/\?play=1'\)/);
  assert.match(source('src/scenes/GameScene.js'), /music\.play\(`prologue-\$\{cue\}`/);
  assert.match(source('src/cars/cyberpunkParkour/CyberpunkParkourScene.js'), /chapter-two-neon-safety-test/);
  assert.match(source('src/cars/presentCity3d/Chapter3OpeningRuntime.js'), /c3-\$\{cue\}/);
  assert.match(source('src/chapters/museum3d/Museum3DApp.js'), /ch5-dies-irae/);
});

test('the shared ESC pause menu exposes resume, save, settings and title exit', () => {
  const pause = source('src/shell/pauseMenu.js');
  for (const label of ['RESUME', 'SAVE', 'SETTINGS', 'RETURN TO TITLE']) {
    assert.match(pause, new RegExp(`action\\('${label}'`));
  }
  assert.match(pause, /event\.key !== 'Escape'/);
  assert.match(pause, /pausedPhaserScenes = game\.scene\.getScenes\(true\)/);
  assert.match(pause, /pausedPhaserScenes\.forEach/);
  assert.doesNotMatch(pause, /else scene\.scene\.resume\(\)/);
});

test('the invisible 1111 title code opens all six chapter transition entries', () => {
  const title = source('src/shell/titleMenu.js');
  assert.match(title, /hiddenChapterSequence === '1111'/);
  assert.match(title, /SELECT CHAPTER ENTRY/);
  for (const cinematic of ['opening', 'chapter1To2', 'chapter2To3', 'chapter3To4', 'chapter4To5']) {
    assert.match(title, new RegExp(`CINEMATICS\\.${cinematic}`));
  }
  assert.match(title, /museum-3d\.html\?beat=collapse/);
});
