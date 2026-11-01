export const CLUE_TEXT = {
  lettersStart: 'Choose any letter. Its pictures help you remember it.',
  lettersChosen: 'The big and little letters are a matching pair. Tap a picture to hear its name.',
  soundsStart: 'Choose a letter, then tap its picture to listen to the sound.',
  soundsVowel: 'This vowel has a short sound and a long sound. Compare the two pictures.',
  soundsMany: 'This letter can make different sounds. Tap each picture to compare them.',
  soundsOne: 'Tap the picture and copy the sound with your own mouth.',
  wordsStart: 'Choose a letter to pick a word. Then listen to its little sounds.',
  wordsChosen: 'Tap one sound at a time. Say the sounds together to make the picture word.',
  before: 'Start at the marked letter. Which letter comes just before it?',
  after: 'Start at the marked letter. Which letter comes just after it?',
  alphabet: 'Say the alphabet in order. Stop at the letter I asked about.',
  firstGap: 'The gap is at the beginning. Listen for the first sound.',
  middleGap: 'The gap is inside the word. Listen between the sounds you can see.',
  lastGap: 'The gap is at the end. Listen for the last sound.',
  vowelFirst: 'The first box needs a vowel. Say the picture name slowly.',
  vowelMiddle: 'A vowel is missing inside the word. Try the vowel sounds as you say it.',
  vowelLast: 'The last box needs a vowel. Say the whole picture word slowly.',
  rhymeStart: 'The endings rhyme. Listen for the first sound of the yellow picture word.',
  rhymeOther: 'Say both picture names. Match their endings, then check the yellow word.',
  blendStart2: 'Listen at the start of the word. Two consonant sounds work together.',
  blendStart3: 'Listen at the start of the word. Three consonant sounds work together.',
  blendEnd2: 'Listen at the end of the word. Two consonant sounds work together.',
  blendEnd3: 'Listen at the end of the word. Three consonant sounds work together.',
  spellStart: 'Start with the first sound of the picture word. Find a letter for that sound.',
  spellMiddle: 'Keep the letters you placed. Say the word and listen for the next sound.',
  spellLast: 'Only the last box is empty. Say the word and listen to its ending.',
  catchStart: 'Watch the moving letters. Catch the first sound of the picture word.',
  catchMiddle: 'Keep what you caught. Listen for the next sound, then watch for its letter.',
  catchLast: 'One letter is left to catch. Listen to the end of the word.',
  searchAcross: 'One hidden word runs across a row. Look from left to right.',
  searchDown: 'One hidden word runs down a column. Look from top to bottom.',
  searchStarted: 'You started a word. Keep going in one straight line, right or down.',
  memoryStart: 'Think back to the pictures you heard. Tap them in the same order.',
  memoryNext: 'You started the trail. Think about which picture you heard next.',
  memoryListen: 'Listen to the whole trail first. Then take your turn.',
  countSmall: 'Move your finger from picture to picture. Count each one only once.',
  countMany: 'Count a small group first, then keep counting the rest.',
  robotVowel: 'Think back to the picture. Try a vowel you have not used yet.',
  robotConsonant: 'Keep the letters you found. Try a new consonant that fits the picture name.',
  robotStart: 'Remember the picture. Each box needs one letter from its name.',
  songsStart: 'Tap a song to hear it. Use the arrows to find more songs.',
  songsPlaying: 'Listen for the tune repeating. You can hum or clap along.',
  animal: 'The picture was an animal. Think about its name.',
  food: 'The picture was something to eat. Think about its name.',
  clothes: 'The picture was something people wear.',
  vehicle: 'The picture was something people can travel in.',
  body: 'The picture was part of a body.',
  color: 'The picture showed a color.',
  fallback: 'Look at the picture and think about what the game is asking.',
};
export function firstClue(s, { playingMusic = false, letterSoundCount = 1 } = {}) {
  const result = { text: CLUE_TEXT.fallback };
  const text = (key) => ({ ...result, text: CLUE_TEXT[key] });
  switch (s.mode) {
    case 'letters':
      return text(s.lastLetter ? 'lettersChosen' : 'lettersStart');
    case 'sounds':
      return text(
        !s.lastLetter
          ? 'soundsStart'
          : 'aeiou'.includes(s.lastLetter)
            ? 'soundsVowel'
            : letterSoundCount > 1
              ? 'soundsMany'
              : 'soundsOne',
      );
    case 'words':
      return text(s.word ? 'wordsChosen' : 'wordsStart');
    case 'order': {
      const m = /\b(before|after) ([a-z])\?/i.exec(s.question || '');
      return {
        ...text(m?.[1]?.toLowerCase() === 'before' ? 'before' : 'after'),
        anchorLetter: m?.[2]?.toLowerCase(),
      };
    }
    case 'missing':
    case 'vowels': {
      const at = s.index === 0 ? 'First' : s.index === s.word.word.length - 1 ? 'Last' : 'Middle';
      return {
        ...text(s.mode === 'vowels' ? 'vowel' + at : at.toLowerCase() + 'Gap'),
        markBlank: true,
        sayWord: true,
      };
    }
    case 'rhymes':
      return { ...text(s.index === 0 ? 'rhymeStart' : 'rhymeOther'), markBlank: true };
    case 'blends':
      return text(
        'blend' + (s.blend.start === 0 ? 'Start' : 'End') + (s.blend.text.length === 3 ? '3' : '2'),
      );
    case 'groups':
      return { ...result, text: s.group.lesson.hint };
    case 'scramble':
    case 'catch': {
      const at = !s.input ? 'Start' : s.word.word.length - s.input.length === 1 ? 'Last' : 'Middle';
      return {
        ...text((s.mode === 'catch' ? 'catch' : 'spell') + at),
        markBlank: true,
        sayWord: true,
      };
    }
    case 'search': {
      const active = s.placed.filter((_, i) => !s.found.includes(i));
      if (
        s.searchPath?.length &&
        active.some((p) =>
          s.searchPath.every(
            (cell, i) => p.cells[i]?.[0] === cell[0] && p.cells[i]?.[1] === cell[1],
          ),
        )
      )
        return text('searchStarted');
      const p = active[0];
      return text(p?.cells[0][0] === p?.cells[1]?.[0] ? 'searchAcross' : 'searchDown');
    }
    case 'memory':
      return text(s.listening ? 'memoryListen' : s.input?.length ? 'memoryNext' : 'memoryStart');
    case 'count':
      return text(s.count > 4 ? 'countMany' : 'countSmall');
    case 'hangman': {
      const category = {
        animals: 'animal',
        food: 'food',
        clothes: 'clothes',
        vehicles: 'vehicle',
        body: 'body',
        colors: 'color',
      }[s.word?.category];
      const unusedVowel = [...'aeiou'].some((c) => !s.used.includes(c));
      return text(
        s.used.length ? (unusedVowel ? 'robotVowel' : 'robotConsonant') : category || 'robotStart',
      );
    }
    case 'songs':
      return text(playingMusic ? 'songsPlaying' : 'songsStart');
    default:
      return result;
  }
}
