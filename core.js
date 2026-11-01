export const ACTIVITIES = [
  ['letters', 'Learn letters', 'Meet every letter', 'Aa', 'START HERE'],
  ['order', 'Alphabet order', 'What comes next?', '↔', 'LETTERS'],
  ['sounds', 'Letter sounds', 'Listen, then explore', '♪', 'PHONICS'],
  ['words', 'Sound it out', 'Little sounds, big words', '◌', 'PHONICS'],
  ['missing', 'Missing letters', 'Find the little gap', '_', 'SPELLING'],
  ['vowels', 'Missing vowels', 'A, E, I, O, U', 'ae', 'SPELLING'],
  ['rhymes', 'Rhyme time', 'Find a sound-alike', '≋', 'LISTENING'],
  ['blends', 'Blend detectives', 'Two letters, together', 'bl', 'PHONICS'],
  ['groups', 'Odd one out', 'Find the odd one out', '◈', 'THINKING'],
  ['scramble', 'Word scramble', 'Put letters in their places', '⇄', 'SPELLING'],
  ['search', 'Word search', 'A tiny letter adventure', '⌕', 'DISCOVERY'],
  ['catch', 'Letter catch', 'Catch a word, one by one', '↓', 'PLAY'],
  ['hangman', 'Build a robot', 'Guess the secret word', '⚑', 'PLAY'],
  ['memory', 'Memory trail', 'Listen. Remember. Repeat.', '☷', 'LISTENING'],
  ['count', 'Count with me', 'How many can you see?', '123', 'NUMBERS'],
  ['songs', 'Music corner', 'A little learning melody', '♬', 'MUSIC'],
].map(([id, title, subtitle, icon, group]) => ({ id, title, subtitle, icon, group }));
export const pick = (a) => a[Math.floor(Math.random() * a.length)];
export function shuffle(a) {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function norm(s) {
  return String(s).trim().toLowerCase();
}
export function validatePack(pack) {
  if (!pack || pack.schemaVersion !== 1 || !Array.isArray(pack.words) || !pack.words.length)
    throw Error('Use a version 1 word pack with a words list.');
  if (pack.words.length > 2000) throw Error('Please use at most 2,000 words per pack.');
  const ids = new Set();
  for (const w of pack.words) {
    if (!w || !/^[a-z][a-z0-9-]{0,49}$/.test(w.id) || ids.has(w.id))
      throw Error('Each word needs a unique lowercase id (letters, digits, hyphens).');
    ids.add(w.id);
    if (
      !/^[a-z]{2,14}$/.test(w.word) ||
      !/^[a-z]$/i.test(w.letter) ||
      typeof w.emoji !== 'string' ||
      w.emoji.length > 20 ||
      !w.emoji.trim() ||
      typeof w.category !== 'string' ||
      !/^[a-z-]{1,40}$/.test(w.category)
    )
      throw Error(
        'Each word needs a 2–14 letter lowercase word, letter, short emoji, and category.',
      );
    if (
      !Array.isArray(w.phonemes) ||
      !w.phonemes.length ||
      w.phonemes.some((x) => typeof x !== 'string' || x.length > 50)
    )
      throw Error('Each word needs a phonemes list of short sound hints.');
    if (
      w.audio !== undefined &&
      (typeof w.audio !== 'string' ||
        !/^audio\/[a-zA-Z0-9/_ .-]+\.(wav|mp3|ogg)$/.test(w.audio) ||
        w.audio.includes('..'))
    )
      throw Error('Audio must be a local audio/ file path.');
    if (
      w.blends !== undefined &&
      (!Array.isArray(w.blends) ||
        w.blends.some(
          (b) =>
            !b ||
            typeof b.text !== 'string' ||
            b.text.length < 2 ||
            !Number.isInteger(b.start) ||
            b.start < 0 ||
            w.word.slice(b.start, b.start + b.text.length) !== b.text,
        ))
    )
      throw Error('Blend text must match the letters at its zero-based start position.');
  }
  return pack;
}
export function mergedWords(base, custom) {
  const map = new Map(base.map((w) => [w.id, w]));
  for (const w of custom) map.set(w.id, w);
  return [...map.values()];
}
export function makeSearch(words, size = 7) {
  const grid = Array.from({ length: size }, () => Array(size).fill(''));
  const placed = [];
  for (const w of words.filter((w) => w.word.length <= size)) {
    let ok = false;
    for (let n = 0; n < 100 && !ok; n++) {
      const horizontal = Math.random() < 0.5;
      const r = Math.floor(Math.random() * (horizontal ? size : size - w.word.length + 1));
      const c = Math.floor(Math.random() * (horizontal ? size - w.word.length + 1 : size));
      const cells = [...w.word].map((_, i) => [r + (horizontal ? 0 : i), c + (horizontal ? i : 0)]);
      if (cells.every(([y, x], i) => !grid[y][x] || grid[y][x] === w.word[i])) {
        cells.forEach(([y, x], i) => (grid[y][x] = w.word[i]));
        placed.push({ word: w, cells });
        ok = true;
      }
    }
  }
  return {
    grid: grid.map((row) => row.map((c) => c || pick([...'abcdefghijklmnopqrstuvwxyz']))),
    placed,
  };
}
