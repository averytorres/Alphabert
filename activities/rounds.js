import { pick, shuffle, makeSearch } from '../core.js';
import { makeBlendChoices } from '../blend-choices.js';
import { icon } from '../icons.js';
import {
  renderPrompt,
  renderActivityTools,
  renderWordPicture,
  renderLetterTiles,
  escapeHtml,
  renderPicture,
  select,
} from '../ui.js';

// Each renderer initializes exactly one round, then delegates narration/actions.
function renderExplorationRound(runtime) {
  const { state } = runtime;
  const mode = state.mode;
  const playArea = select('#play');
  const intro = {
    letters: "Let's learn the letters. Press a letter.",
    sounds: "Let's learn the sounds of letters. Press a letter.",
    words: "Let's sound out some words. Press a letter.",
  }[mode];
  playArea.innerHTML =
    renderPrompt('A whole alphabet to explore', 'Tap a letter. Bertie will tell you about it.') +
    `<div id="explore"><div class="big-letter">Aa</div><div class="prompt-small">Your adventure starts with a tap.</div></div>` +
    runtime.renderLetterKeyboard('explore') +
    renderActivityTools(false);
  runtime.say(intro);
  return;
}

function renderAlphabetRound(runtime) {
  const { state } = runtime;

  const playArea = select('#play');
  const before = Math.random() < 0.5,
    index = before ? 1 + Math.floor(Math.random() * 25) : Math.floor(Math.random() * 25);
  state.answer = String.fromCharCode(97 + index + (before ? -1 : 1));
  state.question = `What letter comes ${before ? 'before' : 'after'} ${String.fromCharCode(65 + index)}?`;
  playArea.innerHTML =
    renderPrompt(state.question) +
    `<div class="big-letter">${before ? '?' : String.fromCharCode(65 + index)} <span style="color:#d6b75e">→</span> ${before ? String.fromCharCode(65 + index) : '?'}</div>` +
    runtime.renderLetterKeyboard('answer') +
    renderActivityTools();
  runtime.say(state.question);
  return;
}

function renderMissingLetterRound(runtime) {
  const { state, words: wordBank } = runtime;
  const mode = state.mode;
  const playArea = select('#play');
  state.word = pick(
    wordBank.filter((w) => w.word.length <= 7 && (mode !== 'vowels' || /[aeiou]/.test(w.word))),
  );
  const indices = [...state.word.word].flatMap((c, i) =>
    mode === 'missing' || 'aeiou'.includes(c) ? [i] : [],
  );
  state.index = pick(indices);
  state.answer = state.word.word[state.index];
  state.question = mode === 'vowels' ? 'Find the missing vowel.' : 'Find the missing letter.';
  playArea.innerHTML =
    renderPrompt(state.question) +
    renderWordPicture(state.word) +
    renderLetterTiles(state.word.word, [state.index]) +
    runtime.renderLetterKeyboard('answer') +
    renderActivityTools();
  if (mode === 'vowels')
    runtime.narrate(['A, E, I, O, and U are vowels.', runtime.missingVowelPrompt()]);
  else runtime.speakQuestionWord();
  return;
}

function renderRhymesRound(runtime) {
  const { state, lessons: lessonContent } = runtime;

  const playArea = select('#play');
  const families = lessonContent.rhymes
    .map((f) => f.words.map(runtime.getWord).filter(Boolean))
    .filter((f) => f.length >= 2);
  if (!families.length) return runtime.unavailable('Add a rhyme family in content/lessons.json.');
  const pair = shuffle(pick(families));
  state.other = pair[0];
  state.word = pair[1];
  state.index = Math.floor(Math.random() * state.word.word.length);
  state.answer = state.word.word[state.index];
  state.question = `Find the missing letter in ${state.word.word}.`;
  const hearPicture = (w, label) =>
    `<button type="button" class="word-art hear-word" data-word-say="${escapeHtml(w.id)}" aria-label="Hear ${escapeHtml(w.word)}${label}">${renderPicture(w)}</button>`;
  playArea.innerHTML =
    renderPrompt('Let’s make a rhyming pair') +
    [
      `<div class="choices rhyme-pair">`,
      `<div class="rhyme-card rhyme-reference">`,
      `<span class="rhyme-label">Rhymes with</span>`,
      `${hearPicture(state.other, '')}`,
      `<strong>`,
      `${escapeHtml(state.other.word)}`,
      `</strong>`,
      `</div>`,
      `<div class="rhyme-card rhyme-target" aria-label="Word to finish: `,
      `${escapeHtml(state.word.word)}`,
      `">`,
      `<span class="rhyme-label">`,
      `<span aria-hidden="true">↓</span> Finish this word</span>`,
      `${hearPicture(state.word, ', word to finish')}`,
      `${renderLetterTiles(state.word.word, [state.index]).replace('>·</span>', '>?</span>')}`,
      `</div>`,
      `</div>`,
    ].join('') +
    runtime.renderLetterKeyboard('answer') +
    renderActivityTools();
  runtime.speakQuestionWord();
  return;
}

function renderBlendsRound(runtime) {
  const { state, words: wordBank } = runtime;

  const playArea = select('#play');
  state.word = state.blendWord || pick(wordBank.filter((w) => runtime.edgeBlends(w).length));
  if (!state.word) return runtime.unavailable('Add words with beginning or ending blends to play.');
  state.blend = { ...pick(runtime.edgeBlends(state.word)) };
  state.answer = state.blend.text;
  state.question = 'Choose the letters that make the blend.';
  const beginning = state.blend.start === 0;
  state.blendChoices = makeBlendChoices(state.word, state.blend);
  state.blend.sounds = state.blendChoices.find((c) => c.correct).sounds;
  playArea.innerHTML =
    [
      `<div class="blend-prompt">`,
      `${renderPrompt('Be a blend detective')}`,
      `${renderWordPicture(state.word)}`,
      `${renderLetterTiles(state.word.word)}`,
      `<div class="prompt-small">Find the `,
      `${beginning ? 'beginning' : 'ending'}`,
      ` blend.</div>`,
      `</div>`,
      `<div class="blend-answer-panel">`,
      `<h3>Choose the blend</h3>`,
      `<div class="choices blend-answers">`,
      `${state.blendChoices
        .map((s) =>
          [
            `<button class="choice `,
            `${s.text.length > 2 ? 'long-blend' : ''}`,
            `" data-answer="`,
            `${escapeHtml(s.text)}`,
            `" aria-label="`,
            `${escapeHtml([...s.text].join(' ').toUpperCase())}`,
            `. Tap to choose; hold to hear.">`,
            `<span>`,
            `${escapeHtml(s.text)}`,
            `</span>`,
            `<span class="blend-listen">`,
            `${icon('hear')}`,
            `</span>`,
            `</button>`,
          ].join(''),
        )
        .join('')}`,
      `</div>`,
      `</div>`,
    ].join('') + renderActivityTools();
  runtime.speakQuestionWord();
  return;
}

function renderGroupsRound(runtime) {
  const { state, lessons: lessonContent } = runtime;

  const playArea = select('#play');
  const pools = (lessonContent.pictureGroups || [])
    .map((lesson) => ({ lesson, words: lesson.words.map(runtime.getWord).filter(Boolean) }))
    .filter((p) => p.words.length >= 2);
  const pool = pick(pools);
  if (!pool) return runtime.unavailable('Add clear picture groups in content/lessons.json.');
  const same = shuffle(pool.words).slice(0, 2),
    odd = pick(pools.filter((p) => p !== pool).flatMap((p) => p.words));
  if (!odd) return runtime.unavailable('Add a second picture group to play.');
  state.group = { same, odd, lesson: pool.lesson };
  state.answer = odd.id;
  state.question = 'Which picture does not belong?';
  playArea.innerHTML =
    renderPrompt(state.question) +
    [
      `<div class="choices odd-answers">`,
      `${shuffle([...same, odd])
        .map((w) =>
          [
            `<button class="choice" data-answer="`,
            `${escapeHtml(w.id)}`,
            `" aria-label="`,
            `${escapeHtml(w.word)}`,
            `. Tap to choose; hold to hear.">`,
            `<span class="choice-emoji">`,
            `${renderPicture(w)}`,
            `</span>`,
            `<small>`,
            `${escapeHtml(w.word)}`,
            `</small>`,
            `</button>`,
          ].join(''),
        )
        .join('')}`,
      `</div>`,
      `<p class="prompt-small">Two pictures are in the same group.</p>`,
    ].join('') +
    renderActivityTools();
  runtime.say(state.question);
  return;
}

function renderSpellingRound(runtime) {
  const { state, words: wordBank } = runtime;
  const mode = state.mode;
  const playArea = select('#play');
  state.word = pick(wordBank.filter((w) => w.word.length <= 7));
  state.input = '';
  state.question =
    mode === 'scramble'
      ? 'Put the letters in order to spell the word.'
      : 'Catch the letters in order to spell the word.';
  state.letters = shuffle([...state.word.word]);
  playArea.innerHTML =
    renderPrompt(mode === 'scramble' ? 'A little letter mix-up' : 'Catch a little word') +
    renderWordPicture(state.word) +
    `<div id="spelling">${renderLetterTiles(
      state.word.word,
      [...state.word.word].map((_, i) => i),
    )}</div><div id="spelling-controls"></div>` +
    renderActivityTools();
  runtime.renderSpelling();
  runtime.speakQuestionWord();
  return;
}

function renderSearchRound(runtime) {
  const { state, words: wordBank } = runtime;

  const playArea = select('#play');
  const puzzle = makeSearch(
    shuffle(wordBank.filter((w) => w.word.length >= 3 && w.word.length <= 5)).slice(0, 4),
    5,
  );
  Object.assign(state, puzzle, {
    found: [],
    selected: null,
    searchPath: [],
    question: 'Find the hidden words. Tap every letter of a word in order.',
  });
  playArea.innerHTML =
    renderPrompt('Hidden in plain sight', 'Tap each letter in order. Words go right or down.') +
    [
      `<div id="search-count" class="progress-dots">0 / `,
      `${state.placed.length}`,
      ` found</div>`,
      `<div class="search-words">`,
      `${state.placed
        .map((w, i) =>
          [
            `<button class="search-word" id="search-word-`,
            `${i}`,
            `" data-search-say="`,
            `${i}`,
            `" aria-label="Hear `,
            `${escapeHtml(w.word.word)}`,
            `">`,
            `<span aria-hidden="true">`,
            `${renderPicture(w.word)}`,
            `</span>`,
            `<span>`,
            `${escapeHtml(w.word.word)}`,
            `</span>`,
            `</button>`,
          ].join(''),
        )
        .join('')}`,
      `</div>`,
      `<div class="search-grid" style="grid-template-columns:repeat(5,1fr)">`,
      `${state.grid.flatMap((row, y) => row.map((c, x) => `<button class="search-cell" data-cell="${y},${x}" aria-label="Row ${y + 1}, column ${x + 1}, ${c}">${c}</button>`)).join('')}`,
      `</div>`,
    ].join('') +
    renderActivityTools();
  runtime.say(state.question);
  return;
}

function renderRobotRound(runtime) {
  const { state, words: wordBank } = runtime;

  const playArea = select('#play');
  state.word = pick(wordBank.filter((w) => w.word.length <= 7));
  state.used = [];
  state.chances = 10;
  state.question = 'Guess the word. Choose a letter.';
  playArea.innerHTML =
    renderPrompt('A mystery word. A new robot.', 'Watch the picture, then guess its letters.') +
    `<div id="guess-display"></div><div id="guess-keys"></div>` +
    renderActivityTools();
  runtime.showGuessPreview();
  return;
}

function renderMemoryRound(runtime) {
  const { state } = runtime;

  const playArea = select('#play');
  state.pool = [...'abcdefghijklmnopqrstuvwxyz'].map(runtime.wordForDisplay).filter(Boolean);
  state.sequence = [pick(state.pool)];
  state.input = [];
  state.question = 'Listen to the objects, then tap them in the same order.';
  playArea.innerHTML =
    renderPrompt('Follow the memory trail') +
    `<div class="prompt-small" id="memory-status">Listen to Bertie…</div><div class="sequence" id="sequence"></div>` +
    runtime.renderLetterKeyboard('memory') +
    renderActivityTools(false) +
    `<div class="toolbar"><button class="secondary" id="memory-new">${icon('next')}<span>New trail</span></button></div>`;
  const trailButton = select('#memory-new'),
    trailRow = trailButton.parentElement;
  select('#play .toolbar').append(trailButton);
  trailRow.remove();
  runtime.playSequence(true);
  return;
}

function renderCountingRound(runtime) {
  const { state, words: wordBank } = runtime;

  const playArea = select('#play');
  state.count = 1 + Math.floor(Math.random() * 10);
  state.word = pick(wordBank);
  state.answer = String(state.count);
  state.question = 'How many objects can you count?';
  const numbers = shuffle([
    state.count,
    ...shuffle(Array.from({ length: 10 }, (_, i) => i + 1).filter((n) => n !== state.count)).slice(
      0,
      3,
    ),
  ]);
  playArea.innerHTML =
    renderPrompt(state.question) +
    [
      `<div class="count-objects" role="group" aria-label="Pictures to count">`,
      `${Array.from({ length: state.count }, () => `<span>${renderPicture(state.word)}</span>`).join('')}`,
      `</div>`,
      `<div class="choices">`,
      `${numbers.map((n) => `<button class="choice" data-answer="${n}">${n}</button>`).join('')}`,
      `</div>`,
    ].join('') +
    renderActivityTools();
  runtime.say(state.question);
  return;
}

function renderMusicRound(runtime) {
  runtime.renderSongMenu();
  runtime.say('Choose a song and sing along.');
}

const ROUND_RENDERERS = {
  letters: renderExplorationRound,
  sounds: renderExplorationRound,
  words: renderExplorationRound,
  order: renderAlphabetRound,
  missing: renderMissingLetterRound,
  vowels: renderMissingLetterRound,
  rhymes: renderRhymesRound,
  blends: renderBlendsRound,
  groups: renderGroupsRound,
  scramble: renderSpellingRound,
  catch: renderSpellingRound,
  search: renderSearchRound,
  hangman: renderRobotRound,
  memory: renderMemoryRound,
  count: renderCountingRound,
  songs: renderMusicRound,
};
export function renderActivityRound(runtime) {
  return ROUND_RENDERERS[runtime.state.mode]?.(runtime);
}
