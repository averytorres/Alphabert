import assert from 'node:assert/strict';
import fs from 'node:fs';
import { firstClue, CLUE_TEXT } from '../context-hints.js';
import { ACTIVITIES } from '../core.js';
const word = { id: 'frog', word: 'frog', category: 'animals' },
  sample = {
    word,
    index: 0,
    input: '',
    used: [],
    count: 7,
    blend: { text: 'fr', start: 0 },
    question: 'What letter comes before B?',
    group: { lesson: { hint: 'Two pictures are animals.' } },
    placed: [
      {
        cells: [
          [0, 0],
          [0, 1],
          [0, 2],
        ],
      },
    ],
    found: [],
    searchPath: [],
    sequence: [word],
    lastLetter: 'e',
  };
for (const mode of ACTIVITIES.map((a) => a.id)) {
  const state = { ...sample, mode },
    before = structuredClone(state),
    hint = firstClue(state);
  assert.deepEqual(state, before, 'First clue must not mutate ' + mode);
  assert.ok(hint.text && hint.text.length <= 100, mode + ' concise clue');
  assert.ok(
    !hint.answer && !hint.solve && !hint.selectCell && !hint.correctLetter,
    mode + ' no direct-answer action',
  );
}
assert.notEqual(
  firstClue({ ...sample, mode: 'missing', index: 0 }).text,
  firstClue({ ...sample, mode: 'missing', index: 3 }).text,
);
assert.notEqual(
  firstClue({ ...sample, mode: 'blends' }).text,
  firstClue({ ...sample, mode: 'blends', blend: { text: 'ft', start: 2 } }).text,
);
assert.notEqual(
  firstClue({ ...sample, mode: 'scramble', input: '' }).text,
  firstClue({ ...sample, mode: 'scramble', input: 'fro' }).text,
);
assert.equal(firstClue({ ...sample, mode: 'order' }).anchorLetter, 'b');
assert.notEqual(firstClue({ ...sample, mode: 'order' }).anchorLetter, 'a');
assert.equal(
  firstClue({ ...sample, mode: 'search', searchPath: [[0, 0]] }).text,
  CLUE_TEXT.searchStarted,
);
assert.notEqual(
  firstClue({ ...sample, mode: 'search', searchPath: [[4, 4]] }).text,
  CLUE_TEXT.searchStarted,
);
assert.equal(
  firstClue({ ...sample, mode: 'hangman' }).sayWord,
  undefined,
  'Do not name the mystery word',
);
const clips = JSON.parse(fs.readFileSync('audio/index.json')).clips;
for (const text of Object.values(CLUE_TEXT))
  assert.ok(clips[text.toLowerCase()], 'Missing offline contextual clue ' + text);
console.log(
  'Context clues cover all 16 modes without state mutation or answer actions; position/progress/direction variants and offline narration checked.',
);
