import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { letterNameText, letterNameLexicon } from './letter-pronunciation.mjs';
import { FIRST_HINTS, MEMORY_HINT } from '../hints.js';
import { MENU_HELP } from '../menu-help.js';
import { BERTIE_REACTIONS } from '../bertie-reactions.js';
import { CLUE_TEXT } from '../context-hints.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const monster = process.argv[2] || process.env.MONSTER_RESCUE_PATH;
if (!monster)
  throw Error(
    'Set MONSTER_RESCUE_PATH or pass the legacy speech project path. Current Roger generation does not need it.',
  );
const original = JSON.parse(
  fs.readFileSync(path.join(monster, 'GeneratedSpeech/plan.json'), 'utf8'),
);
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const normalize = (text) =>
  text
    .replace(/<.*?>/g, '')
    .replace(/\u2019/g, "'")
    .replace(/(?<!\p{L})'|'(?!\p{L})/gu, '')
    .replace(/"/g, '')
    .replace(/\s+/g, ' ')
    .trim();
const texts = new Set();
const add = (value) => {
  if (typeof value === 'string' && value.trim()) texts.add(normalize(value));
};
const prompts = JSON.parse(fs.readFileSync(path.join(root, 'scripts/speech-prompts.json'), 'utf8'));
prompts.forEach(add);
Object.values(MENU_HELP).forEach(add);
BERTIE_REACTIONS.forEach((r) => add(r.text));
Object.values(FIRST_HINTS).forEach(add);
add(MEMORY_HINT);
Object.values(CLUE_TEXT).forEach(add);
const words = JSON.parse(fs.readFileSync(path.join(root, 'content/words.json'), 'utf8')).words;
for (const word of words) {
  add(word.word);
  add(`${word.letter.toUpperCase()} is for ${word.word}.`);
  for (const letter of new Set(word.word)) {
    add(`${letter.toUpperCase()} is the missing letter in ${word.word}.`);
    if ('aeiou'.includes(letter))
      add(`${letter.toUpperCase()} is the missing vowel in ${word.word}.`);
  }
  for (const blend of word.blends || [])
    add(`${blend.start === 0 ? 'Beginning' : 'Ending'} blend in ${word.word}.`);
  add(
    `This is the letter ${word.letter.toUpperCase()}. ${word.letter.toUpperCase()} is for ${word.word}.`,
  );
  add(`Find the missing letter in ${word.word}.`);
  add(`Find the missing vowel in ${word.word}.`);
  add(`Can you spell ${word.word}?`);
  add(`Catch the letters to spell ${word.word}.`);
}
for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
  add(letter);
  add(`This is the letter ${letter}.`);
  add(`Press ${letter}.`);
  add(`What letter comes before ${letter}?`);
  add(`What letter comes after ${letter}?`);
  const i = letter.charCodeAt(0) - 65;
  if (i > 0) add(`The letter ${String.fromCharCode(64 + i)} comes before ${letter}.`);
  if (i < 25) add(`The letter ${String.fromCharCode(66 + i)} comes after ${letter}.`);
  add(`The answer is ${letter.toLowerCase()}.`);
}
add('Choose another letter.');
for (const number of 'one two three four five six seven eight nine ten'.split(' '))
  add(`The answer is ${number}.`);
add('Listen to the sound.');
const lessons = JSON.parse(fs.readFileSync(path.join(root, 'content/lessons.json'), 'utf8'));
for (const song of lessons.songs) add(song.title);
for (const family of lessons.rhymes)
  for (const a of family.words)
    for (const b of family.words)
      if (a !== b)
        add(
          `${words.find((w) => w.id === a).word} rhymes with ${words.find((w) => w.id === b).word}.`,
        );
for (const group of lessons.pictureGroups || []) {
  add(group.hint);
  add(group.explanation);
  add(group.oddExplanation);
}
for (const number of 'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty'.split(
  ' ',
))
  add(number);
const voice = 0;
const jobs = [...texts].sort().map((displayText) => {
  const text = letterNameText(displayText);
  const key = hash(`${voice}/1.000/${text}`);
  return {
    key,
    text,
    displayText,
    source: hash(`alphabert-kokoro-v1/${key}`),
    master: hash(`alphabert-master-v1/${key}`),
    voice,
  };
});
const cacheRoot = path.join(root, '.speech-cache');
fs.mkdirSync(cacheRoot, { recursive: true });
// Extra proper names live only in this project; never modify MonsterRescue's model dictionary.
const supplement = path.join(root, 'scripts/speech-lexicon.txt');
let modelRoot = original.modelRoot;
if (fs.existsSync(supplement)) {
  modelRoot = path.join(cacheRoot, 'model');
  fs.mkdirSync(modelRoot, { recursive: true });
  for (const name of [
    'model.int8.onnx',
    'voices.bin',
    'tokens.txt',
    'lexicon-gb-en.txt',
    'lexicon-us-en.txt',
  ]) {
    const target = path.join(modelRoot, name);
    if (!fs.existsSync(target)) fs.copyFileSync(path.join(original.modelRoot, name), target);
  }
  fs.writeFileSync(
    path.join(modelRoot, 'game-lexicon.txt'),
    fs.readFileSync(path.join(original.modelRoot, 'game-lexicon.txt'), 'utf8') +
      '\n' +
      fs.readFileSync(supplement, 'utf8') +
      '\n' +
      letterNameLexicon() +
      '\n',
  );
}
const plan = {
  ...original,
  modelRoot,
  workspace: root,
  cacheRoot,
  jobs,
  corpus: hash(JSON.stringify(jobs)),
};
fs.writeFileSync(path.join(cacheRoot, 'plan.json'), JSON.stringify(plan, null, 2));
console.log(`Prepared ${jobs.length} offline speech jobs in ${cacheRoot}`);
