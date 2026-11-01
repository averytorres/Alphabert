import fs from 'node:fs';
import assert from 'node:assert/strict';
import { makeBlendChoices, alignBlendWord } from '../blend-choices.js';
const words = JSON.parse(fs.readFileSync('content/words.json')).words,
  index = JSON.parse(fs.readFileSync('audio/index.json')).clips;
for (const word of words.filter((w) => w.blends.length)) {
  assert.ok(alignBlendWord(word), 'Missing sound alignment: ' + word.id);
  for (const blend of word.blends) {
    const choices = makeBlendChoices(word, blend);
    assert.equal(choices.length, 3);
    assert.equal(new Set(choices.map((c) => c.text)).size, 3);
    assert.equal(choices.filter((c) => c.correct).length, 1);
    assert.ok(choices.some((c) => c.text === blend.text && c.correct));
    for (const choice of choices) {
      if (choice.fromWord)
        assert.equal(word.word.slice(choice.start, choice.start + choice.text.length), choice.text);
      assert.ok(choice.sounds.length);
      for (const token of choice.sounds)
        assert.ok(
          index['phoneme-eleven:' + token] || index['phoneme:' + token],
          'No audio for ' + word.id + '/' + choice.text + '/' + token,
        );
    }
  }
}
const frog = words.find((w) => w.id === 'frog'),
  choices = makeBlendChoices(frog, frog.blends[0]);
assert.deepEqual(choices.map((c) => c.text).sort(), ['fr', 'og', 'ro']);
assert.deepEqual(choices.find((c) => c.text === 'ro').sounds, ['r', 'o']);
assert.deepEqual(choices.find((c) => c.text === 'og').sounds, ['o', 'g']);
const blue = words.find((w) => w.id === 'blue'),
  blueChoices = makeBlendChoices(blue, blue.blends[0]);
assert.deepEqual(blueChoices.find((c) => c.text === 'lu').sounds, ['l', 'oo']);
assert.deepEqual(blueChoices.find((c) => c.text === 'ue').sounds, ['oo']);
const custom = { word: 'string', phonemes: ['s', 't', 'r', 'i', 'ng'] };
assert.equal(makeBlendChoices(custom, { text: 'str', start: 0 }).length, 3);
console.log(
  'All built-in blend words have three distinct word-related choices with contextual sound mappings; frog fr/ro/og and blue vowel digraph previews are correct.',
);
