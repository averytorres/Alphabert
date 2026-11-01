import { select, renderRobot, renderPicture, renderLetterTiles } from '../ui.js';

// The coordinator owns round state; read it when an interaction begins.
export function createRobotActivity(runtime) {
  let cluePreviewTimer = null;
  function finishGuessPreview() {
    clearTimeout(cluePreviewTimer);
    cluePreviewTimer = null;
    if (runtime.state.mode === 'hangman' && runtime.state.guessPreview) {
      runtime.state.guessPreview = false;
      if (select('#guess-display')) renderGuess();
    }
  }

  function showGuessPreview() {
    runtime.cancelRoundWork();
    runtime.state.guessPreview = true;
    renderGuess();
    const roundAtStart = runtime.roundGeneration,
      narration = runtime.say("Watch the picture closely. It's your clue!");
    // The clue remains visible until the complete reminder finishes; never name the answer.
    cluePreviewTimer = setTimeout(async () => {
      cluePreviewTimer = null;
      await narration;
      if (roundAtStart !== runtime.roundGeneration || runtime.state.mode !== 'hangman') return;
      finishGuessPreview();
      runtime.say(runtime.state.question);
    }, 2300);
  }

  function renderGuess() {
    const visible = runtime.state.revealWord
      ? runtime.state.word.word
      : [...runtime.state.word.word]
          .map((letter) => (runtime.state.used.includes(letter) ? letter : '·'))
          .join('');
    select('#guess-display').innerHTML =
      '<div class="robot-stage ' +
      (runtime.state.guessPreview ? 'previewing' : '') +
      '" aria-label="' +
      (runtime.state.guessPreview ? 'Mystery picture clue' : 'Robot building area') +
      '">' +
      renderRobot() +
      (runtime.state.guessPreview
        ? '<div class="guess-preview"><button class="word-art hear-word" data-robot-clue aria-label="Watch the picture clue again"><span class="guess-clue-picture">' +
          renderPicture(runtime.state.word) +
          '</span></button></div>'
        : '') +
      '</div><div class="guess-status prompt-small">' +
      (runtime.state.guessPreview
        ? 'Watch the picture…'
        : runtime.state.chances + ' guesses left') +
      '</div><div id="guess-word">' +
      renderLetterTiles(visible) +
      '</div>';
    const r = select('#guess-display .robot');
    r.style.margin = 'auto';
    const missed = 10 - runtime.state.chances;
    if (runtime.state.revealWord)
      select('#guess-word')
        .querySelectorAll('.tile')
        .forEach((tile, i) => {
          if (runtime.state.missedLetters?.includes(runtime.state.word.word[i])) {
            tile.classList.add('missed-letter');
            tile.setAttribute(
              'aria-label',
              'Missing letter ' + runtime.state.word.word[i].toUpperCase(),
            );
          }
        });
    const parts = [
      ['.robot-head', 1],
      ['.antenna', 2],
      ['.robot-body', 3],
      ['.arm:not(.right)', 4],
      ['.arm.right', 5],
      ['.leg:not(.right)', 6],
      ['.leg.right', 7],
      ['.mouth', 8],
      ['.robot-body span', 9],
    ];
    for (const [selector, at] of parts)
      r.querySelector(selector).style.visibility = missed >= at ? 'visible' : 'hidden';
    // The face and two eyes start visible; a faint head outline anchors them.
    r.querySelector('.robot-head').classList.toggle('bare', missed === 0);
    r.querySelector('.robot-head').style.visibility = 'visible';
    r.querySelector('.robot-head').style.background = missed >= 1 ? '' : 'transparent';
    r.querySelector('.robot-head').style.borderColor = missed >= 1 ? '' : 'transparent';
    r.querySelector('.robot-head').style.boxShadow = missed >= 1 ? '' : 'none';
    r.querySelector('.face').style.background = missed >= 1 ? '' : 'transparent';
    r.querySelectorAll('.eye').forEach((e) => (e.style.background = missed >= 1 ? '' : '#236451'));
    select('#guess-keys').innerHTML = runtime.renderLetterKeyboard('guess', runtime.state.used);
    if (runtime.state.solved || runtime.state.guessPreview)
      select('#guess-keys')
        .querySelectorAll('button')
        .forEach((b) => (b.disabled = true));
  }

  function guess(letter) {
    if (runtime.state.guessPreview || runtime.state.solved || runtime.state.used.includes(letter))
      return;
    runtime.state.used.push(letter);
    if (!runtime.state.word.word.includes(letter)) runtime.state.chances--;
    renderGuess();
    if ([...runtime.state.word.word].every((letter) => runtime.state.used.includes(letter)))
      runtime.win();
    else if (runtime.state.chances <= 0) {
      runtime.state.solved = true;
      runtime.state.missedLetters = [...new Set(runtime.state.word.word)].filter(
        (letter) => !runtime.state.used.includes(letter),
      );
      runtime.feedback(
        `${runtime.state.word.word.toUpperCase()}. Missing: ${runtime.state.missedLetters.map((l) => l.toUpperCase()).join(' · ')}.`,
      );
      runtime.state.revealWord = true;
      renderGuess();
      runtime.finishRoundSound('incorrect', runtime.explainRobotLoss);
    } else if (!runtime.state.word.word.includes(letter)) runtime.wrong();
    else runtime.resultSound('letter', () => runtime.speech.letter(letter));
  }
  return { finishGuessPreview, showGuessPreview, renderGuess, guess };
}
