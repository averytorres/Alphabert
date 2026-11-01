import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const wordData = JSON.parse(fs.readFileSync(path.join(root, 'content/words.json'), 'utf8'));
const lessons = JSON.parse(fs.readFileSync(path.join(root, 'content/lessons.json'), 'utf8'));
const errors = [];
const check = (ok, message) => { if (!ok) errors.push(message); };
check(wordData.schemaVersion === 1 && lessons.schemaVersion === 1, 'Unsupported schemaVersion');
const words = wordData.words;
check(Array.isArray(words) && words.length > 0, 'words must be a nonempty array');
const ids = new Set();
const categories = new Set(lessons.categories.map(c => c.id));
for (const word of words) {
  const name = word.id || '(missing id)';
  check(typeof word.id === 'string' && /^[a-z][a-z0-9-]*$/.test(word.id), `${name}: invalid id`);
  check(!ids.has(word.id), `${name}: duplicate id`);
  ids.add(word.id);
  check(typeof word.word === 'string' && /^[a-z]+$/.test(word.word), `${name}: word must contain lowercase a–z only`);
  check(/^[a-z]$/.test(word.letter), `${name}: letter must be one lowercase letter`);
  check(typeof word.emoji === 'string' && word.emoji.length > 0, `${name}: missing picture emoji`);
  check(categories.has(word.category), `${name}: unknown category ${word.category}`);
  check(Array.isArray(word.phonemes) && word.phonemes.length > 0 && word.phonemes.every(p => typeof p === 'string' && p.length), `${name}: phonemes must be nonempty sound hints`);
  check(typeof word.phoneticHint === 'string' && word.phoneticHint.length > 0, `${name}: missing phoneticHint`);
  check(Array.isArray(word.blends), `${name}: blends must be an array`);
  for (const blend of word.blends || []) {
    check(Number.isInteger(blend.start) && blend.start >= 0, `${name}: invalid blend start`);
    check(typeof blend.text === 'string' && blend.text.length >= 2, `${name}: invalid blend text`);
    check(word.word.slice(blend.start, blend.start + blend.text.length) === blend.text, `${name}: blend ${blend.text} does not match spelling at index ${blend.start}`);
  }
  check(word.vowelSound === undefined || ['short', 'long'].includes(word.vowelSound), `${name}: invalid vowelSound`);
}
const alphabet = 'abcdefghijklmnopqrstuvwxyz';
check(lessons.letters.length === 26, 'letters must have 26 entries');
check(new Set(lessons.letters.map(l => l.letter)).size === 26, 'Duplicate letter lessons');
for (const letter of alphabet) {
  check(words.some(w => w.letter === letter), `No word for letter ${letter}`);
  const lesson = lessons.letters.find(l => l.letter === letter);
  check(lesson && Array.isArray(lesson.sounds) && lesson.sounds.length > 0, `Missing sounds for ${letter}`);
  for (const sound of lesson?.sounds || []) {
    check(ids.has(sound.exampleId), `${letter}: unknown sound example ${sound.exampleId}`);
    check(sound.label && sound.hint, `${letter}: sound needs label and hint`);
  }
}
for (const rhyme of lessons.rhymes) {
  check(rhyme.words.length >= 2 && new Set(rhyme.words).size === rhyme.words.length, 'Rhyme group needs at least two distinct words');
  for (const id of rhyme.words) check(ids.has(id), `Unknown rhyme word ${id}`);
}
const songIds = new Set();
for (const song of lessons.songs) {
  check(!songIds.has(song.id), `Duplicate song ${song.id}`);
  songIds.add(song.id);
  check(song.title && song.lyrics, `${song.id}: missing title or lyrics`);
  check(song.tempo > 0 && song.tempo <= 240, `${song.id}: invalid tempo`);
  check(Array.isArray(song.notes) && song.notes.length > 0, `${song.id}: missing notes`);
  for (const note of song.notes) {
    check(/^[A-G](#|b)?[0-8]$/.test(note.note) || note.note === 'rest', `${song.id}: invalid note ${note.note}`);
    check(Number.isFinite(note.duration) && note.duration > 0, `${song.id}: invalid note duration`);
  }
}
const groupedIds=new Set();
check(lessons.pictureGroups?.length>=2,'Need at least two clear picture groups');
for(const group of lessons.pictureGroups||[]){
 check(group.words.length>=2,`${group.id}: need two pictures`);
 for(const id of group.words){check(ids.has(id),`${group.id}: missing word ${id}`);check(!groupedIds.has(id),`${id}: ambiguous picture group membership`);groupedIds.add(id);check(words.find(w=>w.id===id)?.category===group.id,`${id}: picture group differs from category`);}
 for(const key of ['hint','explanation','oddExplanation'])check(typeof group[key]==='string'&&group[key].length>10,`${group.id}: missing ${key}`);
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Content valid: ${words.length} words, 26 letters, ${lessons.rhymes.length} rhyme groups, ${lessons.songs.length} songs.`);
}
