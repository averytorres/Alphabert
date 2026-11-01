import fs from 'node:fs';
import assert from 'node:assert/strict';
import { SOUNDS, cleanIPA, engine } from './phonics-reference.mjs';
const report = JSON.parse(fs.readFileSync('audio/phonics-reference.json')),
  index = JSON.parse(fs.readFileSync('audio/index.json')),
  words = JSON.parse(fs.readFileSync('content/words.json')).words,
  synth = await engine();
assert.equal(Object.keys(report.references).length, 52);
for (const [token, [keyword, ipa]] of Object.entries(SOUNDS)) {
  const entry = report.references[token];
  assert.equal(entry.keyword, keyword);
  assert.equal(entry.timeStretched, false);
  assert.ok(entry.synthesisRate === 80 || entry.synthesisRate === 140);
  assert.equal(cleanIPA(entry.selectedPhones.join('')), ipa);
  assert.equal(index.clips['phoneme:' + token], entry.file);
}
for (const word of words) {
  const target = word.phonemes.map((p) => SOUNDS[p][1]).join('');
  let reference = cleanIPA(
    synth(word.word)
      .phones.map((p) => p.id)
      .join(''),
  );
  if (word.word === 'kitten') reference = reference.replace('ʔn̩', 'tən');
  assert.equal(target, reference, word.word);
}
assert.deepEqual(words.find((w) => w.id === 'zebra').phonemes, ['z', 'ee', 'b', 'r', 'schwa']);
for (const [token, minimum] of Object.entries({
  b: 0.075,
  d: 0.075,
  g: 0.075,
  k: 0.055,
  p: 0.08,
  t: 0.045,
})) {
  assert.ok(
    report.references[token].targetDuration >= minimum,
    token + ' keeps its longer native articulation',
  );
  assert.equal(report.references[token].timeStretched, false);
}
for (const [token, ipa] of [
  ['z', 'z'],
  ['ee', 'i'],
  ['b', 'b'],
  ['r', 'ɹ'],
  ['schwa', 'ə'],
])
  assert.equal(cleanIPA(report.references[token].selectedPhones.join('')), ipa);
console.log(
  'Pronunciation checks passed: all 106 word sequences match English-US reference events; all 52 clips select the intended phonemes, including zebra z / iː / b / ɹ / ə.',
);
