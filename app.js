import { renderHomeView, renderActivityShell, renderSettingsView } from './views.js';
import { createActivityLayout } from './layout.js';
import {
  select,
  escapeHtml,
  renderLetterTiles,
  renderActivityTools,
  renderPrompt,
  renderKeyboard,
} from './ui.js';
import { renderActivityRound } from './activities/rounds.js';
import { createSpellingActivity } from './activities/spelling.js';
import { createRobotActivity } from './activities/robot.js';
import { createSearchActivity } from './activities/search.js';
import { createMemoryActivity } from './activities/memory.js';
import { createMusicActivity } from './activities/music.js';
import { createExplorationActivity } from './activities/exploration.js';
import { BertieReactionPicker } from './bertie-reactions.js';

import { installMenuHold } from './menu-help.js';
import { installBlendHold } from './blend-choices.js';
import { icon } from './icons.js';
import { firstClue, CLUE_TEXT } from './context-hints.js';
import { CelebrationPicker, celebrationMarkup } from './celebrations.js';
import { ACTIVITIES, pick, norm, validatePack, mergedWords } from './core.js';

import { FeedbackPlayer } from './feedback.js';

const speechService = new window.SpeechService();
let builtInWordPack;
let lessonContent;
let wordBank;
let customWords = [];
// Scratch state for the current activity; saved progress/preferences live separately.
let state = {};
let roundGeneration = 0;
let roundTimers = [];
let music = null;
let activeNarrationCount = 0;
// Keep Bertie from interrupting a lesson, including pauses between its sound clips.
async function runNarration(action) {
  activeNarrationCount++;
  try {
    return await action();
  } finally {
    activeNarrationCount--;
  }
}
async function explore(...args) {
  return runNarration(() => exploreNarration(...args));
}
async function narrate(...args) {
  return runNarration(() => narrateNarration(...args));
}
async function speakLetterAnswer(letters) {
  return runNarration(async () => {
    const roundAtStart = roundGeneration,
      feedbackAtStart = feedbackGeneration;
    await say('The answer is.');
    await speakLetterNames(letters, roundAtStart, feedbackAtStart);
  });
}
async function speakLetterNames(
  letters,
  roundAtStart = roundGeneration,
  feedbackAtStart = feedbackGeneration,
) {
  for (const letter of letters) {
    if (roundAtStart !== roundGeneration || feedbackAtStart !== feedbackGeneration) return false;
    await speechService.letter(letter);
    if (!(await pauseBetweenSounds(180, roundAtStart)) || feedbackAtStart !== feedbackGeneration)
      return false;
  }
  return true;
}
async function explainRobotLoss() {
  return runNarration(async () => {
    const roundAtStart = roundGeneration,
      feedbackAtStart = feedbackGeneration,
      word = state.word.word,
      missing = [...state.missedLetters];
    const line = async (text) => {
      if (roundAtStart !== roundGeneration || feedbackAtStart !== feedbackGeneration) return false;
      await say(text);
      return roundAtStart === roundGeneration && feedbackAtStart === feedbackGeneration;
    };
    if (
      !(await line('The word was.')) ||
      !(await line(word)) ||
      !(await line("Let's spell it.")) ||
      !(await speakLetterNames(word, roundAtStart, feedbackAtStart))
    )
      return;
    if (
      missing.length &&
      (!(await line('The missing letters were.')) ||
        !(await speakLetterNames(missing, roundAtStart, feedbackAtStart)))
    )
      return;
    await line("Let's try again.");
  });
}
async function speakQuestionWord(...args) {
  return runNarration(() => speakQuestionWordNarration(...args));
}
async function playSequence(...args) {
  return runNarration(() => playSequenceNarration(...args));
}

const bertiePicker = new BertieReactionPicker();
let bertieReactionTimer = null,
  lastRobotTapTime = -Infinity;
function clearBertieReaction() {
  clearTimeout(bertieReactionTimer);
  document.querySelectorAll('[data-bertie][data-reaction]').forEach((el) => {
    delete el.dataset.reaction;
    delete el.dataset.reactionId;
  });
}
function playWithBertie(robotElement) {
  const now = performance.now();
  if (now - lastRobotTapTime < 500) return;
  lastRobotTapTime = now;
  clearBertieReaction();
  const reaction = bertiePicker.next();
  robotElement.dataset.reaction = reaction.motion;
  robotElement.dataset.reactionId = reaction.id;
  // Speak during idle play, while preserving narration (including gaps) and feedback.
  if (
    !document.body.classList.contains('talking') &&
    !activeNarrationCount &&
    !answerSounds.pending &&
    !state.listening &&
    !state.guessPreview
  ) {
    const roundAtStart = roundGeneration,
      feedbackAtStart = feedbackGeneration;
    clearTimeout(nextRoundTimer);
    nextRoundTimer = null;
    say(reaction.text).finally(() => {
      if (
        roundAtStart === roundGeneration &&
        feedbackAtStart === feedbackGeneration &&
        state.solved
      )
        queueNext();
    });
  }
  bertieReactionTimer = setTimeout(clearBertieReaction, 3500);
}
installMenuHold({
  onDescribe: (text) => {
    cancelRoundWork();
    say(text);
  },
});
installBlendHold({
  onPreview: (text) => {
    if (state.mode !== 'blends' || state.solved) return;
    const choice = state.blendChoices.find((c) => c.text === text);
    if (!choice) return;
    cancelRoundWork();
    runNarration(() =>
      choice.correct
        ? speechService.blend(state.word, state.blend)
        : speechService.blend(
            { id: 'preview-' + state.word.id + '-' + text, word: text, phonemes: choice.sounds },
            { text, start: 0 },
          ),
    );
  },
});
installBlendHold({
  selector: '.odd-answers button[data-answer]',
  onPreview: (id) => {
    if (state.mode !== 'groups' || state.solved) return;
    const word = [...state.group.same, state.group.odd].find((w) => w.id === id);
    if (!word) return;
    cancelRoundWork();
    runNarration(() => speechService.word(word));
  },
});

const fitActivity = createActivityLayout(() => state);
new MutationObserver(fitActivity).observe(select('#main'), { childList: true, subtree: true });
window.addEventListener('resize', fitActivity);
window.visualViewport?.addEventListener('resize', fitActivity);
let progress = { stars: 0, played: {} };
try {
  progress = JSON.parse(localStorage.getItem('alphabert-progress')) || progress;
  customWords = JSON.parse(localStorage.getItem('alphabert-custom')) || [];
  if (customWords.length) validatePack({ schemaVersion: 1, words: customWords });
} catch {
  customWords = [];
}
if (!Number.isInteger(progress.stars) || !progress.played) progress = { stars: 0, played: {} };
let preferences = {
  speech: true,
  rate: 0.85,
  motion: false,
  musicVolume: 0.85,
  feedbackVolume: 0.75,
};
try {
  Object.assign(preferences, JSON.parse(localStorage.getItem('alphabert-prefs')) || {});
} catch {}
select('#home .brand-mark').innerHTML = icon('home');
select('#grownups').innerHTML = icon('grownups');
const answerSounds = new FeedbackPlayer();
answerSounds.volume = preferences.feedbackVolume;
let feedbackGeneration = 0,
  nextRoundTimer = null;
// A replay can cancel feedback within the same round, so it has its own generation.
function cancelAnswerSound() {
  clearTimeout(nextRoundTimer);
  nextRoundTimer = null;
  feedbackGeneration++;
  answerSounds.stop();
}
function queueNext() {
  clearTimeout(nextRoundTimer);
  if (!state.solved || !select('#next')) return;
  const roundAtStart = roundGeneration,
    feedbackAtStart = feedbackGeneration;
  nextRoundTimer = setTimeout(() => {
    nextRoundTimer = null;
    if (
      roundAtStart === roundGeneration &&
      feedbackAtStart === feedbackGeneration &&
      state.solved &&
      select('#next')
    )
      makeRound();
  }, 1200);
}
async function finishRoundSound(kind, after) {
  if (await resultSound(kind, after)) queueNext();
}
async function resultSound(kind, after) {
  const feedbackAtStart = ++feedbackGeneration,
    roundAtStart = roundGeneration;
  speechService.stop();
  const completed = await answerSounds.play(kind);
  if (!completed || feedbackAtStart !== feedbackGeneration || roundAtStart !== roundGeneration)
    return false;
  if (after) await after();
  return feedbackAtStart === feedbackGeneration && roundAtStart === roundGeneration;
}

function musicVolume(...args) {
  return activityControllers.music.musicVolume(...args);
}
function renderSongMenu(...args) {
  return activityControllers.music.renderSongMenu(...args);
}
speechService.enabled = preferences.speech;
speechService.rate = preferences.rate;
document.body.classList.toggle('reduce-motion', preferences.motion);
window.addEventListener('speech-state', (e) => document.body.classList.toggle('talking', e.detail));
window.addEventListener('phoneme-unavailable', (e) =>
  feedback(`This sound needs a recording: ${e.detail}`, false),
);
window.addEventListener('voice-recording-unavailable', () =>
  feedback('This needs a recording in your chosen voice.', false),
);
function save() {
  try {
    localStorage.setItem('alphabert-progress', JSON.stringify(progress));
    localStorage.setItem('alphabert-prefs', JSON.stringify(preferences));
  } catch {}
  select('#stars').textContent = `★ ${progress.stars}`;
  select('#sound').innerHTML = icon(speechService.enabled ? 'sound' : 'muted');
  select('#sound').setAttribute(
    'aria-label',
    speechService.enabled ? 'Turn voice off' : 'Turn voice on',
  );
  select('#sound').setAttribute('aria-pressed', String(speechService.enabled));
}
// Incrementing the generation invalidates delayed speech/timers from the old screen.
function cancelRoundWork() {
  finishGuessPreview();
  clearBertieReaction();
  cancelAnswerSound();
  select('#confetti').replaceChildren();
  document.body.classList.remove('music-playing');
  roundGeneration++;
  speechService.stop();
  roundTimers.forEach(clearTimeout);
  roundTimers = [];
  if (music) {
    music.close();
    music = null;
  }
}
function scheduleRoundTask(callback, delayMs) {
  roundTimers.push(setTimeout(callback, delayMs));
}
function say(text) {
  state.spoken = text;
  return speechService.say(text);
}
// Space teaching sounds with silence, never by slowing the recordings themselves.
async function pauseBetweenSounds(ms, roundAtStart) {
  await new Promise((r) => setTimeout(r, ms));
  return roundAtStart === roundGeneration;
}
async function narrateNarration(parts, roundAtStart = roundGeneration) {
  for (const text of parts) {
    if (roundAtStart !== roundGeneration) return;
    await say(text);
  }
}
async function replay() {
  const roundAtStart = roundGeneration,
    playing = replayPrompt(),
    feedbackAtStart = feedbackGeneration;
  await playing;
  if (roundAtStart === roundGeneration && feedbackAtStart === feedbackGeneration) queueNext();
}
async function replayPrompt() {
  cancelAnswerSound();
  if (state.mode === 'memory') return playSequence();
  if (state.mode === 'hangman' && !state.solved) return showGuessPreview();
  if (state.mode === 'hangman' && state.solved && state.chances <= 0) return explainRobotLoss();
  if (['letters', 'sounds', 'words'].includes(state.mode) && state.lastLetter)
    return explore(state.lastLetter, true);
  if (state.question) {
    await speakQuestionWord();
    return;
  }
  return say(state.spoken || 'Press a letter to begin.');
}
async function explainAnswer() {
  const roundAtStart = roundGeneration;
  if (state.mode === 'order')
    return narrate(
      [
        state.question
          .replace('What letter', `The letter ${state.answer.toUpperCase()}`)
          .replace('?', '.'),
        'Great job!',
      ],
      roundAtStart,
    );
  if (['missing', 'vowels'].includes(state.mode))
    return narrate(
      [
        `${state.answer.toUpperCase()} is the missing ${state.mode === 'vowels' ? 'vowel' : 'letter'} in ${state.word.word}.`,
        'Great job!',
      ],
      roundAtStart,
    );
  if (state.mode === 'rhymes')
    return narrate(
      [`${state.other.word} rhymes with ${state.word.word}.`, 'Great job!'],
      roundAtStart,
    );
  if (state.mode === 'blends') {
    await speechService.blend(state.word, state.blend);
    if (roundAtStart !== roundGeneration) return;
    await say('Great job!');
    if (roundAtStart !== roundGeneration) return;
    for (const c of state.blend.text) {
      if (roundAtStart !== roundGeneration) return;
      await speechService.letter(c);
    }
    if (roundAtStart === roundGeneration)
      await say(`${state.blend.start === 0 ? 'Beginning' : 'Ending'} blend in ${state.word.word}.`);
    return;
  }
  if (['scramble', 'catch'].includes(state.mode)) {
    for (const c of state.word.word) {
      if (roundAtStart !== roundGeneration) return;
      await speechService.letter(c);
    }
    if (roundAtStart === roundGeneration) await say(state.word.word);
    return;
  }
  if (state.mode === 'count') return narrate([String(state.count), 'Great job!'], roundAtStart);
  if (state.mode === 'groups')
    return narrate(
      [
        state.group.lesson.explanation,
        ...state.group.same.map((w) => w.word),
        state.group.odd.word,
        state.group.lesson.oddExplanation,
        'Great job!',
      ],
      roundAtStart,
    );
  if (state.mode === 'hangman') return narrate([state.word.word, 'Great job!'], roundAtStart);
  return say('Great job!');
}
const celebrations = new CelebrationPicker();
let celebrationSerial = 0;
function confetti() {
  if (preferences.motion || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const id = ++celebrationSerial,
    kind = celebrations.next();
  select('#confetti').dataset.celebration = kind;
  select('#confetti').innerHTML = celebrationMarkup(kind);
  scheduleRoundTask(() => {
    if (id === celebrationSerial) select('#confetti').replaceChildren();
  }, 2800);
}
function feedback(text, good = true) {
  const el = select('#feedback');
  if (el) {
    el.textContent = text;
    el.classList.toggle('try', !good);
  }
}
function win(text = 'Great job!', after) {
  if (state.solved) return;
  state.solved = true;
  if (state.mode === 'hangman') renderGuess();
  progress.stars++;
  progress.played[state.mode] = (progress.played[state.mode] || 0) + 1;
  save();
  feedback(text);
  finishRoundSound(
    'correct',
    after || (() => (text === 'Great job!' ? explainAnswer() : say(text))),
  );
  confetti();
  select('#next')?.focus({ preventScroll: true });
}
async function wrong() {
  feedback("Let's try again.", false);
  const roundAtStart = roundGeneration;
  return resultSound('incorrect', async () => {
    await say("Let's try again.");
    if (
      roundAtStart === roundGeneration &&
      !state.solved &&
      state.question &&
      !['memory', 'hangman', 'catch', 'scramble'].includes(state.mode)
    )
      await speakQuestionWord();
  });
}
function getWord(id) {
  return wordBank.find((w) => w.id === id);
}
function edgeBlends(word) {
  return (word.blends || []).filter(
    (b) => b.start === 0 || b.start + b.text.length === word.word.length,
  );
}

function wordFor(letter) {
  return pick(wordBank.filter((w) => w.letter.toLowerCase() === letter));
}

function renderLetterKeyboard(handler, used = []) {
  return renderKeyboard(handler, used, wordForDisplay);
}
// Keep picture-key associations stable across every full alphabet keyboard.
function wordForDisplay(letter) {
  return wordBank.find((word) => word.letter.toLowerCase() === letter);
}

function home() {
  delete document.body.dataset.activity;
  document.body.classList.remove('playing');
  cancelRoundWork();
  state = {};
  select('#main').innerHTML = renderHomeView(progress);
  save();
}
function start(mode) {
  document.body.dataset.activity = mode;
  document.body.classList.add('playing');
  window.scrollTo(0, 0);
  cancelRoundWork();
  state = { mode, hints: 0, solved: false };
  const activity = ACTIVITIES.find((a) => a.id === mode);
  if (!activity) return home();
  select('#main').innerHTML = renderActivityShell(activity, progress.played[mode] || 0);
  makeRound();
}
function makeRound(blendWord = null) {
  const mode = state.mode;
  cancelRoundWork();
  state = { mode, hints: 0, solved: false, blendWord };
  if (!select('#play')) return;
  renderActivityRound(activityRuntime);
}
function unavailable(message) {
  select('#play').innerHTML =
    renderPrompt('A little more content needed', message) + renderActivityTools();
}
function missingVowelPrompt() {
  return 'Find the missing vowel in ' + state.word.word + '.';
}
async function speakQuestionWordNarration() {
  const roundAtStart = roundGeneration;
  if (state.mode === 'hangman') return say(state.question);
  if (state.mode === 'vowels') return say(missingVowelPrompt());
  if (state.mode === 'rhymes') {
    await say(`${state.other.word} rhymes with ${state.word.word}.`);
    if (roundAtStart === roundGeneration) await say(state.question);
    return;
  }
  await say(state.question);
  if (roundAtStart === roundGeneration && state.word) await say(state.word.word);
  if (roundAtStart === roundGeneration && state.other) await say(state.other.word);
  if (roundAtStart === roundGeneration && state.mode === 'blends') {
    await say('Listen to the blend.');
    if (roundAtStart === roundGeneration) await speechService.blend(state.word, state.blend);
  }
}
function exploreNarration(...args) {
  return activityControllers.exploration.exploreNarration(...args);
}
function hearWordSound(...args) {
  return activityControllers.exploration.hearWordSound(...args);
}
function answer(value) {
  if (state.solved) return;
  if (norm(value) === norm(state.answer)) {
    if (['missing', 'vowels', 'rhymes'].includes(state.mode)) {
      const t = select('#play .tiles');
      if (t) t.outerHTML = renderLetterTiles(state.word.word);
    }
    win();
  } else wrong();
}
function renderSpelling(...args) {
  return activityControllers.spelling.renderSpelling(...args);
}
function spell(...args) {
  return activityControllers.spelling.spell(...args);
}
function finishGuessPreview(...args) {
  return activityControllers.robot.finishGuessPreview(...args);
}
function showGuessPreview(...args) {
  return activityControllers.robot.showGuessPreview(...args);
}
function renderGuess(...args) {
  return activityControllers.robot.renderGuess(...args);
}
function guess(...args) {
  return activityControllers.robot.guess(...args);
}
function resetSearchSelection(...args) {
  return activityControllers.search.resetSearchSelection(...args);
}
function selectCell(...args) {
  return activityControllers.search.selectCell(...args);
}
function hearSearchWord(...args) {
  return activityControllers.search.hearSearchWord(...args);
}
function playSequenceNarration(...args) {
  return activityControllers.memory.playSequenceNarration(...args);
}
function memoryTap(...args) {
  return activityControllers.memory.memoryTap(...args);
}
// First help teaches a strategy; later presses deliberately offer stronger support.
async function firstHint() {
  return runNarration(async () => {
    if (state.mode !== 'songs') cancelRoundWork();
    const roundAtStart = roundGeneration,
      feedbackAtStart = feedbackGeneration,
      plan = firstClue(state, {
        playingMusic: document.body.classList.contains('music-playing'),
        letterSoundCount:
          lessonContent.letters.find((l) => l.letter === state.lastLetter)?.sounds.length || 1,
      });
    feedback(plan.text);
    if (plan.markBlank) select('#play .tile.blank')?.classList.add('hint-target');
    if (plan.anchorLetter)
      select(`[data-answer="${plan.anchorLetter}"]`)?.classList.add('hint-anchor');
    await say(plan.text);
    if (roundAtStart !== roundGeneration || feedbackAtStart !== feedbackGeneration) return;
    if (plan.anchorLetter) await speechService.letter(plan.anchorLetter);
    if (plan.sayWord && roundAtStart === roundGeneration && feedbackAtStart === feedbackGeneration)
      await say(state.word.word);
  });
}
function hint() {
  if (state.solved && state.mode !== 'songs') return;
  if (state.mode === 'memory' && state.listening) {
    feedback(CLUE_TEXT.memoryListen);
    return;
  }
  cancelAnswerSound();
  state.hints++;
  if (state.hints === 1 || state.mode === 'songs') return firstHint();
  if (['letters', 'sounds', 'words'].includes(state.mode)) {
    replay();
    return;
  }
  if (state.mode === 'memory') {
    state.showSequence = true;
    return playSequence();
  }
  if (state.mode === 'groups') {
    if (state.hints === 2) {
      state.group.same.forEach((w) =>
        select('[data-answer="' + w.id + '"]').classList.add('hint-target'),
      );
      feedback(state.group.lesson.explanation);
      return narrate([state.group.lesson.explanation, ...state.group.same.map((w) => w.word)]);
    }
    feedback(`Try ${state.group.odd.word}.`);
    return say(state.group.odd.word);
  }
  if (state.mode === 'search') {
    resetSearchSelection();
    const remaining = state.placed.filter((_, i) => !state.found.includes(i)),
      reveal = remaining.length === 1 ? state.placed : remaining.slice(0, 1);
    for (const entry of reveal)
      entry.cells.forEach((c) =>
        select('[data-cell="' + c.join(',') + '"]').classList.add('selected'),
      );
    narrate(reveal.map((p) => p.word.word));
    feedback(remaining.length === 1 ? 'Here are all the words.' : 'Here is one hidden word.');
    return;
  }
  if (state.mode === 'scramble' || state.mode === 'catch') {
    if (!state.word.word.startsWith(state.input)) state.input = '';
    spell(state.word.word[state.input.length]);
    return;
  }
  if (state.mode === 'hangman') {
    const c = [...state.word.word].find((c) => !state.used.includes(c));
    guess(c);
    return;
  }
  if (state.mode === 'count') {
    const choices = [...document.querySelectorAll('[data-answer]:not(:disabled)')];
    if (choices.length > 2) {
      pick(choices.filter((b) => b.dataset.answer !== state.answer)).disabled = true;
      feedback('One choice is gone. Count again.');
      say('How many objects can you count?');
    } else {
      feedback(`Try ${state.answer}.`);
      say(`The answer is ${state.answer}.`);
    }
    return;
  }
  if (state.hints === 1) {
    speakQuestionWord();
    feedback('Listen again. Tap Help me once more for the answer.');
  } else {
    if (/^[a-z]+$/i.test(state.answer)) speakLetterAnswer(state.answer.toLowerCase());
    else say(`The answer is ${state.answer}.`);
    feedback(`Try ${state.answer.toUpperCase().split('').join(' · ')}.`);
  }
}
function song(...args) {
  return activityControllers.music.song(...args);
}
function settings() {
  delete document.body.dataset.activity;
  document.body.classList.remove('playing');
  cancelRoundWork();
  state = { mode: 'settings' };
  select('#main').innerHTML = renderSettingsView({
    wordCount: wordBank.length,
    preferences,
    voices: speechService.voices,
    stars: progress.stars,
    customWordCount: customWords.length,
  });
  updateGameLockControl();
  select('#answer-volume').oninput = (e) => {
    preferences.feedbackVolume = Number(e.target.value) / 100;
    answerSounds.volume = preferences.feedbackVolume;
    save();
  };
  select('#voice-rate').value = String(preferences.rate);
  select('#voice-choice').value = preferences.voice || 'roger';
  select('#voice-choice').onchange = async (event) => {
    const control = event.target;
    const previous = {
      voice: speechService.voice,
      index: speechService.index,
      strictVoice: speechService.strictVoice,
    };
    control.disabled = true;
    try {
      await speechService.selectVoice(control.value);
      // Confirm durable storage before reporting success. If storage is full or
      // unavailable, restore the previous bank rather than promise a saved choice.
      localStorage.setItem(
        'alphabert-prefs',
        JSON.stringify({ ...preferences, voice: speechService.voice }),
      );
      preferences.voice = speechService.voice;
      save();
      status('Voice saved for all activities.');
    } catch (error) {
      speechService.stop();
      Object.assign(speechService, previous);
      control.value = speechService.voice;
      status(error.message);
    } finally {
      control.disabled = false;
    }
  };
  select('#motion').value = String(preferences.motion);
  select('#word-form').addEventListener('submit', addWord);
  select('#voice-rate').onchange = (e) => {
    preferences.rate = Number(e.target.value);
    speechService.rate = preferences.rate;
    save();
  };
  select('#motion').onchange = (e) => {
    preferences.motion = e.target.value === 'true';
    document.body.classList.toggle('reduce-motion', preferences.motion);
    save();
  };
  select('#import-file').onchange = async (e) => {
    try {
      const f = e.target.files[0];
      if (!f) return;
      if (f.size > 2e6) throw Error('Please use a JSON file smaller than 2 MB.');
      select('#pack-json').value = await f.text();
      status('File opened. Press Import word pack to add these words.');
    } catch (e) {
      status(e.message);
    }
  };
}
function updateGameLockControl() {
  const control = select('#game-lock-toggle');
  if (!control || !window.AndroidGameLock) return;
  select('#game-lock-section').hidden = false;
  const pinned = window.AndroidGameLock.isPinned();
  control.textContent = `Keep game open: ${pinned ? 'On — turn off' : 'Off — turn on'}`;
  control.setAttribute('aria-pressed', String(pinned));
}
window.addEventListener('android-game-lock', updateGameLockControl);
function status(text) {
  select('#settings-status').textContent = text;
}
function storeCustom(next) {
  validatePack({ schemaVersion: 1, words: next });
  localStorage.setItem('alphabert-custom', JSON.stringify(next));
  customWords = next;
  wordBank = mergedWords(builtInWordPack.words, customWords);
}
function addWord(e) {
  e.preventDefault();
  try {
    const word = norm(select('#new-word').value),
      blend = norm(select('#new-blend').value);
    const w = {
      id: word,
      word,
      letter: norm(select('#new-letter').value),
      emoji: select('#new-emoji').value.trim(),
      category: norm(select('#new-category').value),
      phonemes: select('#new-sounds')
        .value.split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      blends: blend ? [{ text: blend, start: word.indexOf(blend) }] : [],
    };
    storeCustom(mergedWords(customWords, [w]));
    status(`Added ${word}. It’s ready to play!`);
    select('#word-form').reset();
  } catch (e) {
    status(e.message);
  }
}
document.addEventListener('click', (event) => {
  const control = event.target.closest('[data-bertie],button,[data-mode]');
  if (!control) return;
  const action = control.dataset;
  if ('bertie' in action) return playWithBertie(control);
  if (action.letterSound && state.mode === 'sounds') {
    cancelRoundWork();
    speechService.phoneme(action.letterSound, { held: true });
    return;
  }
  if (action.soundIndex !== undefined) return hearWordSound(Number(action.soundIndex));
  if (action.robotClue !== undefined && state.mode === 'hangman' && !state.solved) {
    showGuessPreview();
    return;
  }
  if (
    action.wordSay &&
    ['letters', 'rhymes', 'scramble', 'catch', 'missing', 'vowels', 'words', 'blends'].includes(
      state.mode,
    )
  ) {
    const word = getWord(action.wordSay);
    if (word) {
      cancelRoundWork();
      const roundAtStart = roundGeneration;
      say(word.word).then(() => {
        if (roundAtStart === roundGeneration && state.solved) queueNext();
      });
    }
    return;
  }
  if (action.mode) return start(action.mode === 'random' ? pick(ACTIVITIES).id : action.mode);
  if (action.blendLetter) {
    const w = pick(wordBank.filter((w) => w.letter === action.blendLetter && edgeBlends(w).length));
    if (w) makeRound(w);
    else {
      feedback('Choose another letter. This word has no blend.');
      say('Choose another letter.');
    }
    return;
  }
  if (action.explore) return explore(action.explore);
  if (action.answer !== undefined) return answer(action.answer);
  if (action.spell) return spell(action.spell);
  if (action.guess) return guess(action.guess);
  if (action.searchSay !== undefined) return hearSearchWord(Number(action.searchSay));
  if (action.cell) return selectCell(action.cell);
  if (action.memory) return memoryTap(action.memory);
  if (action.song !== undefined) return song(Number(action.song));
  switch (control.id) {
    case 'game-lock-toggle':
      window.AndroidGameLock?.toggle();
      break;
    case 'home':
    case 'back':
      home();
      break;
    case 'grownups':
      settings();
      break;
    case 'sound':
      speechService.enabled = !speechService.enabled;
      preferences.speech = speechService.enabled;
      if (!speechService.enabled) speechService.stop();
      else say("Hello! I'm Bertie. Let's learn and play!");
      save();
      break;
    case 'next':
      makeRound();
      break;
    case 'repeat':
      replay();
      break;
    case 'hint':
      hint();
      break;
    case 'memory-new':
      makeRound();
      break;
    case 'song-prev':
      cancelRoundWork();
      renderSongMenu(state.songPage - 1);
      break;
    case 'song-next':
      cancelRoundWork();
      renderSongMenu(state.songPage + 1);
      break;
    case 'stop-song':
      cancelRoundWork();
      feedback('Music stopped. Pick another melody.');
      break;
    case 'preview-happy':
      cancelRoundWork();
      resultSound('correct');
      break;
    case 'preview-sad':
      cancelRoundWork();
      resultSound('incorrect');
      break;
    case 'test-voice':
      cancelAnswerSound();
      speechService.enabled = true;
      preferences.speech = true;
      save();
      say("Hello! I'm Bertie. Let's learn and play!");
      break;
    case 'import-pack':
      try {
        const pack = validatePack(JSON.parse(select('#pack-json').value));
        storeCustom(mergedWords(customWords, pack.words));
        status(`Imported ${pack.words.length} words. ${wordBank.length} words are ready to play.`);
      } catch (err) {
        status('Could not import: ' + err.message);
      }
      break;
    case 'copy-pack':
      select('#pack-json').value = JSON.stringify(
        { schemaVersion: 1, words: customWords },
        null,
        2,
      );
      status('Your additions are shown above. You can copy and save this text.');
      break;
    case 'export-pack': {
      if (window.AndroidFiles?.exportJson) {
        window.AndroidFiles.exportJson(
          JSON.stringify({ schemaVersion: 1, words: customWords }, null, 2),
        );
        status('Choose a location to save your word pack.');
        break;
      }
      const blob = new Blob([JSON.stringify({ schemaVersion: 1, words: customWords }, null, 2)], {
          type: 'application/json',
        }),
        a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'alphabert-words.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      select('#pack-json').value = JSON.stringify(
        { schemaVersion: 1, words: customWords },
        null,
        2,
      );
      status('Backup JSON is also shown above for copying.');
      break;
    }
    case 'reset-progress':
      if (confirm('Reset stars and activity history? Your added words will stay.')) {
        progress = { stars: 0, played: {} };
        save();
        status('Stars and activity history reset.');
      }
      break;
  }
});
document.addEventListener('keydown', (e) => {
  if (e.target.closest('[data-bertie]') && ['Enter', ' '].includes(e.key)) {
    e.preventDefault();
    if (!e.repeat) playWithBertie(e.target.closest('[data-bertie]'));
    return;
  }
  if (e.target.matches('input,textarea,select') || e.ctrlKey || e.altKey || e.metaKey || e.repeat)
    return;
  const c = e.key.toLowerCase();
  if (!/^[a-z]$/.test(c) || !state.mode || state.mode === 'settings') return;
  if (state.mode === 'songs') {
    const i = lessonContent.songs.findIndex((s) => s.letter === c);
    if (i >= 0) song(i);
  } else if (['letters', 'sounds', 'words'].includes(state.mode)) explore(c);
  else if (['scramble', 'catch'].includes(state.mode)) spell(c);
  else if (state.mode === 'hangman') guess(c);
  else if (state.mode === 'memory') memoryTap(wordForDisplay(c)?.id);
  else if (['missing', 'vowels', 'order', 'rhymes'].includes(state.mode)) answer(c);
});
function pauseGame() {
  cancelRoundWork();
  if (state.mode === 'memory' && select('#memory-status')) {
    select('#memory-status').textContent = 'Paused. Tap Hear again to continue.';
    state.listening = true;
  }
}
window.addEventListener('androidpause', pauseGame);
window.addEventListener('androidback', home);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseGame();
});

// Shared services are explicit; activity modules never own saved preferences or navigation.
const activityRuntime = {
  get state() {
    return state;
  },
  get roundGeneration() {
    return roundGeneration;
  },
  get speech() {
    return speechService;
  },
  get feedbackGeneration() {
    return feedbackGeneration;
  },
  get progress() {
    return progress;
  },
  get preferences() {
    return preferences;
  },
  get music() {
    return music;
  },
  get lessons() {
    return lessonContent;
  },
  get words() {
    return wordBank;
  },
  set music(value) {
    music = value;
  },
  wrong,
  win,
  scheduleRoundTask,
  resultSound,
  cancelRoundWork,
  say,
  feedback,
  finishRoundSound,
  explainRobotLoss,
  renderLetterKeyboard,
  cancelAnswerSound,
  narrate,
  queueNext,
  getWord,
  playSequence,
  save,
  confetti,
  wordForDisplay,
  pauseBetweenSounds,
  missingVowelPrompt,
  speakQuestionWord,
  unavailable,
  edgeBlends,
  renderSpelling,
  showGuessPreview,
  renderSongMenu,
};
const activityControllers = {
  spelling: createSpellingActivity(activityRuntime),
  robot: createRobotActivity(activityRuntime),
  search: createSearchActivity(activityRuntime),
  memory: createMemoryActivity(activityRuntime),
  music: createMusicActivity(activityRuntime),
  exploration: createExplorationActivity(activityRuntime),
};
try {
  [builtInWordPack, lessonContent] = await Promise.all(
    ['content/words.json', 'content/lessons.json'].map(async (url) => {
      const r = await fetch(url);
      if (!r.ok) throw Error(`Could not load ${url}`);
      return r.json();
    }),
  );
  validatePack(builtInWordPack);
  wordBank = mergedWords(builtInWordPack.words, customWords);
  await speechService.catalogReady;
  if (preferences.voice) {
    try {
      await speechService.selectVoice(preferences.voice);
    } catch (error) {
      // Preserve the saved choice and prevent the default bank speaking while
      // its replacement is unavailable. Grown-ups can explicitly choose another.
      await speechService.ready;
      speechService.stop();
      speechService.index = {};
      speechService.strictVoice = true;
      throw error;
    }
  }
  home();
} catch (e) {
  select('#main').innerHTML = [
    `<div class="error">`,
    `<h1>Let’s get the word lab ready</h1>`,
    `<p>`,
    `${escapeHtml(e.message)}`,
    `</p>`,
    `<p>Use the Android app, or run the included local preview server.</p>`,
    `</div>`,
  ].join('');
}
