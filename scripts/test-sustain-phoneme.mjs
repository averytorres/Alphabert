import assert from 'node:assert/strict';
import fs from 'node:fs';
import { sustain } from './sustain-phoneme.mjs';
const rate = 22050,
  input = Int16Array.from({ length: 4410 }, (_, i) =>
    i < 2646 ? Math.round(1000 * Math.sin((i * 2 * Math.PI * 180) / rate)) : 30000,
  );
for (const noise of [false, true]) {
  const out = sustain(input, rate, 0.85, { noise, steadyRelease: true });
  assert.equal(out.length, Math.round(rate * 0.85));
  assert.ok(
    out.every((n) => Math.abs(n) <= 1000),
    'Do not append the marked vowel-boundary tail',
  );
  assert.equal(out.at(-1), 0, 'Fade cleanly to silence');
}
const report = JSON.parse(fs.readFileSync('audio/phonics-held.json'));
for (const token of ['f', 'h', 'l', 'm', 'n', 'ng', 'r', 's', 'sh', 'th', 'v', 'z']) {
  assert.equal(report.sounds[token].steadyRelease, true);
  assert.equal(report.sounds[token].sourceEndFraction, 0.6);
  assert.equal(report.sounds[token].playbackRate, 1);
}
for (const token of ['ay', 'oa', 'ow'])
  assert.equal(report.sounds[token].steadyRelease, false, 'Preserve changing vowel sounds');
console.log(
  'Held consonants exclude word-boundary tails, keep native timing, and fade to zero; vowel endings preserved.',
);
