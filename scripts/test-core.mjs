import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ACTIVITIES, validatePack, mergedWords, makeSearch, shuffle } from '../core.js';

const base = JSON.parse(fs.readFileSync(new URL('../content/words.json', import.meta.url)));
validatePack(base);
assert.equal(ACTIVITIES.length, 16);
assert.equal(new Set(ACTIVITIES.map(a => a.id)).size, 16);
const word = { id:'string', word:'string', letter:'s', emoji:'🧵', category:'objects', phonemes:['s','t','r','i','ng'], blends:[{text:'str',start:0}] };
assert.equal(validatePack({schemaVersion:1,words:[word]}).words[0], word);
for (const mutation of [
  {id:'<script>'}, {word:'<img>'}, {category:'"><svg>'}, {audio:'https://evil.test/voice.mp3'},
  {audio:'audio/../voice.mp3'}, {blends:[{text:'zz',start:0}]}, {phonemes:['x'.repeat(51)]}, {emoji:'x'.repeat(21)}
]) assert.throws(() => validatePack({schemaVersion:1,words:[{...word,...mutation}]}));
assert.throws(() => validatePack({schemaVersion:1,words:[word,word]}));
assert.throws(() => validatePack({schemaVersion:2,words:[word]}));
assert.throws(() => validatePack({schemaVersion:1,words:Array.from({length:2001},(_,i)=>({...word,id:`w-${i}`}))}));
validatePack({schemaVersion:1,words:[{...word,audio:'audio/custom/string.wav'}]});
assert.equal(mergedWords([word],[{...word,emoji:'⭐'}]).length,1);
assert.equal(mergedWords([word],[{...word,emoji:'⭐'}])[0].emoji,'⭐');
const original=[1,2,3,4]; assert.deepEqual(shuffle(original).sort(),original); assert.deepEqual(original,[1,2,3,4]);
for(let run=0;run<100;run++) {
  const source=shuffle(base.words.filter(w=>w.word.length>=3&&w.word.length<=5)).slice(0,4);
  const puzzle=makeSearch(source);
  assert.equal(puzzle.grid.length,7);
  assert.ok(puzzle.placed.length>0);
  for(const placed of puzzle.placed) {
    assert.equal(placed.cells.map(([r,c])=>puzzle.grid[r][c]).join(''),placed.word.word);
    assert.equal(placed.cells.length,placed.word.word.length);
  }
}
console.log('Core checks passed: 16 unique modes, pack validation/security, merge replacement, and 100 generated word searches.');
