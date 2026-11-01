import { select } from '../ui.js';

// The coordinator owns round state; read it when an interaction begins.
export function createSearchActivity(runtime) {
  function resetSearchSelection() {
    runtime.state.searchPath = [];
    runtime.state.selected = null;
    document
      .querySelectorAll('.search-cell.selected')
      .forEach((el) => el.classList.remove('selected'));
  }

  function selectCell(value) {
    if (runtime.state.solved) return;
    const cell = value.split(',').map(Number);
    if (cell.length !== 2 || !runtime.state.grid[cell[0]]?.[cell[1]]) return;
    const same = (a, b) => a[0] === b[0] && a[1] === b[1],
      path = runtime.state.searchPath || [];
    if (path.length && same(path.at(-1), cell)) return;
    const matches = (trial) =>
      runtime.state.placed.flatMap((p, i) =>
        !runtime.state.found.includes(i) &&
        trial.length <= p.cells.length &&
        trial.every((c, n) => same(c, p.cells[n]))
          ? [i]
          : [],
      );
    let trial = [...path, cell],
      candidates = matches(trial);
    if (!candidates.length) {
      trial = [cell];
      candidates = matches(trial);
      if (!candidates.length) {
        resetSearchSelection();
        if (
          !path.length &&
          runtime.state.found.some((i) => runtime.state.placed[i].cells.some((c) => same(c, cell)))
        )
          return;
        return runtime.wrong();
      }
    }
    resetSearchSelection();
    runtime.state.searchPath = trial;
    for (const c of trial) select('[data-cell="' + c.join(',') + '"]').classList.add('selected');
    const i = candidates.find((i) => runtime.state.placed[i].cells.length === trial.length);
    if (i === undefined) {
      runtime.feedback(trial.map((c) => runtime.state.grid[c[0]][c[1]].toUpperCase()).join(' · '));
      runtime.cancelAnswerSound();
      runtime.speech.letter(runtime.state.grid[cell[0]][cell[1]]);
      return;
    }
    resetSearchSelection();
    runtime.state.found.push(i);
    select('#search-count').textContent =
      runtime.state.found.length + ' / ' + runtime.state.placed.length + ' found';
    runtime.state.placed[i].cells.forEach((c) =>
      select('[data-cell="' + c.join(',') + '"]').classList.add('found'),
    );
    select('#search-word-' + i).classList.add('found');
    if (runtime.state.found.length === runtime.state.placed.length)
      runtime.win('Well done! You found all the words.', () =>
        runtime.narrate([
          'Well done! You found all the words.',
          ...runtime.state.placed.map((p) => p.word.word),
        ]),
      );
    else {
      runtime.feedback('You got it!');
      runtime.resultSound('correct', () => runtime.say(runtime.state.placed[i].word.word));
    }
  }

  async function hearSearchWord(index) {
    if (runtime.state.mode !== 'search' || !runtime.state.placed[index]) return;
    const roundAtStart = runtime.roundGeneration;
    runtime.cancelAnswerSound();
    const feedbackAtStart = runtime.feedbackGeneration;
    await runtime.say(runtime.state.placed[index].word.word);
    if (roundAtStart === runtime.roundGeneration && feedbackAtStart === runtime.feedbackGeneration)
      runtime.queueNext();
  }
  return { resetSearchSelection, selectCell, hearSearchWord };
}
