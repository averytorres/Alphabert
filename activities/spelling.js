import { shuffle } from '../core.js';
import { select, renderLetterTiles } from '../ui.js';

// The coordinator owns round state; read it when an interaction begins.
export function createSpellingActivity(runtime) {
  function renderSpelling() {
    const { word, input, mode } = runtime.state;
    select('#spelling').innerHTML = renderLetterTiles(
      input + word.word.slice(input.length),
      [...word.word].flatMap((_, i) => (i >= input.length ? [i] : [])),
    );
    if (mode === 'scramble') {
      const remaining = [...word.word];
      for (const letter of input) {
        const i = remaining.indexOf(letter);
        if (i >= 0) remaining.splice(i, 1);
      }
      select('#spelling-controls').innerHTML = `<div class="choices">${runtime.state.letters
        .map((letter, i) => {
          const available = remaining.includes(letter);
          if (available) remaining.splice(remaining.indexOf(letter), 1);
          return `<button class="tile" data-spell="${letter}" ${available && !runtime.state.solved ? '' : 'disabled'} aria-label="Letter ${letter}">${letter}</button>`;
        })
        .join('')}</div>`;
    } else {
      const next = word.word[input.length];
      select('#spelling-controls').innerHTML = runtime.state.solved
        ? ''
        : [
            `<div class="catch-field" aria-label="Moving letter choices">`,
            `${shuffle([
              ...new Set([
                next,
                ...shuffle(
                  [...'abcdefghijklmnopqrstuvwxyz'].filter((letter) => letter !== next),
                ).slice(0, 2),
              ]),
            ])
              .map(
                (letter, i) =>
                  `<button class="catch-letter" data-spell="${letter}" style="animation-delay:-${i * 2.3}s" aria-label="Catch ${letter}">${letter}</button>`,
              )
              .join('')}`,
            `</div>`,
            `<div class="prompt-small">Tap the moving letter you need next. You can also use your keyboard.</div>`,
          ].join('');
    }
  }

  function spell(letter) {
    if (runtime.state.solved) return;
    if (
      runtime.state.mode === 'catch' &&
      letter !== runtime.state.word.word[runtime.state.input.length]
    )
      return runtime.wrong();
    if (runtime.state.mode === 'scramble') {
      const available = [...runtime.state.word.word];
      for (const used of runtime.state.input) {
        const i = available.indexOf(used);
        if (i >= 0) available.splice(i, 1);
      }
      if (!available.includes(letter)) return runtime.wrong();
    }
    runtime.state.input += letter;
    renderSpelling();
    if (runtime.state.input.length === runtime.state.word.word.length) {
      if (runtime.state.input === runtime.state.word.word) {
        runtime.win();
        renderSpelling();
      } else {
        runtime.wrong();
        const roundAtStart = runtime.roundGeneration,
          attempted = runtime.state.input;
        runtime.scheduleRoundTask(() => {
          if (
            roundAtStart === runtime.roundGeneration &&
            runtime.state.input === attempted &&
            !runtime.state.solved
          ) {
            runtime.state.input = '';
            renderSpelling();
          }
        }, 900);
      }
    } else runtime.resultSound('letter', () => runtime.speech.letter(letter));
  }
  return { renderSpelling, spell };
}
