import { select, escapeHtml, renderPicture, renderWordPicture, renderLetterTiles } from '../ui.js';

// The coordinator owns round state; read it when an interaction begins.
export function createExplorationActivity(runtime) {
  async function exploreNarration(letter, repeating = false) {
    const previous = runtime.state.lastLetter;
    runtime.cancelRoundWork();
    runtime.state.hints = 0;
    const roundAtStart = runtime.roundGeneration;
    let word = runtime.wordForDisplay(letter);
    if (!word) return;
    runtime.state.word = word;
    runtime.state.lastLetter = letter;
    if (runtime.state.mode === 'letters') {
      const choices = runtime.words.filter((x) => x.letter.toLowerCase() === letter);
      runtime.state.exampleIndex = repeating
        ? runtime.state.exampleIndex || 0
        : ((previous === letter ? runtime.state.exampleIndex : -1) + 1) % choices.length;
      const vowelExamples = 'aeiou'.includes(letter)
        ? runtime.lessons.letters
            .find((l) => l.letter === letter)
            .sounds.map((s) => runtime.getWord(s.exampleId))
            .filter(Boolean)
        : [];
      const examples = vowelExamples.length ? vowelExamples : [choices[runtime.state.exampleIndex]];
      runtime.state.word = examples[0];
      select('#explore').innerHTML =
        '<div class="big-letter">' +
        letter.toUpperCase() +
        letter +
        '</div><div class="choices">' +
        examples
          .map(
            (v) =>
              '<div><button type="button" class="word-art object-bounce hear-word" data-word-say="' +
              escapeHtml(v.id) +
              '" aria-label="Hear ' +
              escapeHtml(v.word) +
              '">' +
              renderPicture(v) +
              '</button><b>' +
              escapeHtml(v.word) +
              '</b></div>',
          )
          .join('') +
        '</div>';
      await runtime.say('This is the letter ' + letter.toUpperCase() + '.');
      for (const v of examples) {
        if (roundAtStart !== runtime.roundGeneration) return;
        await runtime.say(letter.toUpperCase() + ' is for ' + v.word + '.');
      }
    } else if (runtime.state.mode === 'sounds') {
      const lesson = runtime.lessons.letters.find((l) => l.letter.toLowerCase() === letter),
        sounds = lesson?.sounds || [
          { sound: word.phonemes[0], hint: word.phoneticHint || word.word, exampleId: word.id },
        ];
      select('#explore').innerHTML =
        '<div class="big-letter">' +
        letter.toUpperCase() +
        letter +
        '</div><div class="choices">' +
        sounds
          .map((s) => {
            const v = runtime.getWord(s.exampleId) || word,
              sound = s.sound || s.hint.split(/\s+as\s/)[0];
            return (
              '<div><button type="button" class="word-art hear-word" data-letter-sound="' +
              escapeHtml(sound) +
              '" aria-label="Hear the sound in ' +
              escapeHtml(v.word) +
              '">' +
              renderPicture(v) +
              '</button><div>' +
              escapeHtml(s.hint) +
              '</div></div>'
            );
          })
          .join('') +
        '</div>';
      await runtime.speech.letter(letter);
      if (roundAtStart !== runtime.roundGeneration) return;
      await runtime.say('Listen to the sound.');
      for (const s of sounds) {
        if (roundAtStart !== runtime.roundGeneration) return;
        if (s.label === 'short' || s.label === 'long') {
          await runtime.say(s.label === 'short' ? 'Short sound.' : 'Long sound.');
          if (roundAtStart !== runtime.roundGeneration) return;
        }
        await runtime.speech.phoneme(s.sound || s.hint.split(/\s+as\s/)[0], { held: true });
        if (!(await runtime.pauseBetweenSounds(350, roundAtStart))) return;
        await runtime.say((runtime.getWord(s.exampleId) || word).word);
        if (!(await runtime.pauseBetweenSounds(300, roundAtStart))) return;
      }
    } else {
      select('#play .play-content > .sound-parts')?.remove();
      select('#explore').innerHTML =
        renderWordPicture(word) +
        '<div id="sound-tiles">' +
        renderLetterTiles(word.word) +
        '</div><div class="sound-parts">' +
        word.phonemes
          .map(
            (sound, i) =>
              '<button type="button" class="sound-chip" data-sound-index="' +
              i +
              '" aria-label="Hear the ' +
              escapeHtml(sound === 'schwa' ? 'uh' : sound) +
              ' sound">' +
              escapeHtml(sound === 'schwa' ? 'uh' : sound) +
              '</button>',
          )
          .join('') +
        '</div><div class="prompt-small">Tap a sound to hear it again.</div>';
      if (word.audio) {
        await runtime.speech.word(word);
      } else
        for (const [i, sound] of word.phonemes.entries()) {
          if (roundAtStart !== runtime.roundGeneration) return;
          document
            .querySelectorAll('.sound-chip')
            .forEach((el, n) => el.classList.toggle('sound-active', n === i));
          await runtime.speech.phoneme(sound, { rate: 1, wordId: word.id, index: i });
          if (!(await runtime.pauseBetweenSounds(450, roundAtStart))) return;
        }
      if (roundAtStart !== runtime.roundGeneration) return;
      document.querySelectorAll('.sound-chip').forEach((el) => el.classList.remove('sound-active'));
      await runtime.say(word.word);
    }
    if (roundAtStart === runtime.roundGeneration) {
      runtime.progress.played[runtime.state.mode] =
        (runtime.progress.played[runtime.state.mode] || 0) + 1;
      runtime.save();
    }
  }

  async function hearWordSound(index) {
    if (
      runtime.state.mode !== 'words' ||
      !Number.isInteger(index) ||
      !runtime.state.word?.phonemes[index]
    )
      return;
    const sound = runtime.state.word.phonemes[index];
    runtime.cancelRoundWork();
    const roundAtStart = runtime.roundGeneration;
    document
      .querySelectorAll('.sound-chip')
      .forEach((el, i) => el.classList.toggle('sound-active', i === index));
    await runtime.speech.phoneme(sound, { rate: 1, wordId: runtime.state.word.id, index });
    if (roundAtStart === runtime.roundGeneration)
      document.querySelectorAll('.sound-chip').forEach((el) => el.classList.remove('sound-active'));
  }
  return { exploreNarration, hearWordSound };
}
