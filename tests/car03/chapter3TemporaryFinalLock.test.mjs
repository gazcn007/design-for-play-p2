import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import path from 'node:path';

import { OPENING_POSITIONS } from '../../src/cars/presentCity3d/chapter3OpeningContent.js';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));

function filesBelow(relativeRoot, accept = () => true) {
  const root = path.join(repoRoot, relativeRoot);
  const entries = [];
  function visit(directory) {
    for (const name of readdirSync(directory).sort()) {
      const absolute = path.join(directory, name);
      const stat = statSync(absolute);
      if (stat.isDirectory()) visit(absolute);
      else if (accept(absolute)) entries.push(path.relative(repoRoot, absolute));
    }
  }
  visit(root);
  return entries;
}

function aggregateSignature(files) {
  const manifest = files.map((relativePath) => {
    const digest = createHash('sha256')
      .update(readFileSync(path.join(repoRoot, relativePath)))
      .digest('hex');
    return `${digest}  ${relativePath}`;
  }).join('\n');
  return createHash('sha256').update(`${manifest}\n`).digest('hex');
}

describe('Chapter 3 integrated final lock v32', () => {
  it('preserves the George-approved final Toma composition', () => {
    assert.deepEqual(OPENING_POSITIONS.toma, [37.68, 0.5, -15.87]);
    assert.deepEqual(OPENING_POSITIONS.transportApproach, [28.27, 0.5, -16.29]);
    assert.deepEqual(OPENING_POSITIONS.levTransportExterior, [26.77, 0.5, -15.09]);
  });

  it('preserves the complete temporary-final Chapter 3 runtime source', () => {
    const sourceFiles = [
      'car03-3d.html',
      'src/car03-3d-main.js',
      ...filesBelow('src/cars/presentCity3d', (file) => /\.(?:js|png)$/.test(file)),
    ];
    assert.equal(sourceFiles.length, 23);
    assert.equal(
      aggregateSignature(sourceFiles),
      'a6bbf70271b52420cad0453fbd4ebeb042377ab7947ee80b48f2cb931779051f',
      'Chapter 3 is locked. Reopen it explicitly and create a new lock version before changing runtime source.',
    );
  });

  it('preserves the complete temporary-final Chapter 3 runtime asset set', () => {
    const assetFiles = [
      ...filesBelow('public/assets/chapter03-3d'),
      ...filesBelow('public/assets/music/ch3'),
    ];
    assert.equal(assetFiles.length, 759);
    assert.equal(
      aggregateSignature(assetFiles),
      '18a1c13c021991d249b63569583ac006ff1a5e2e8c1e25a4bff3f42e00414b48',
      'Chapter 3 assets are locked. Reopen it explicitly and create a new lock version before changing assets.',
    );
  });
});
