import { pick } from '../core.js';
import { select, renderPicture } from '../ui.js';

// The coordinator owns round state; read it when an interaction begins.
export function createMemoryActivity(runtime) {
  async function playSequenceNarration(intro = false) {
    runtime.cancelRoundWork();
    const roundAtStart = runtime.roundGeneration;
    // Input stays locked until every item in the spoken trail has finished.
    runtime.state.listening = true;
    runtime.state.input = [];
    select('#sequence').innerHTML = runtime.state.showSequence
      ? runtime.state.sequence.map((w) => '<span>' + renderPicture(w) + '</span>').join('')
      : '';
    select('#memory-status').textContent = 'Listen to Bertie…';
    document.querySelectorAll('[data-memory]').forEach((b) => (b.disabled = true));
    if (intro) await runtime.say(runtime.state.question);
    for (const w of runtime.state.sequence) {
      if (roundAtStart !== runtime.roundGeneration) return;
      select('#sequence').innerHTML = `<span>${renderPicture(w)}</span>`;
      await runtime.say(w.word);
      if (roundAtStart !== runtime.roundGeneration) return;
      await new Promise((resolve) => setTimeout(resolve, 220));
    }
    if (roundAtStart !== runtime.roundGeneration) return;
    select('#sequence').innerHTML = runtime.state.showSequence
      ? runtime.state.sequence.map((w) => '<span>' + renderPicture(w) + '</span>').join('')
      : '';
    select('#memory-status').textContent =
      `Your turn! ${runtime.state.sequence.length} ${runtime.state.sequence.length === 1 ? 'picture' : 'pictures'} to remember.`;
    runtime.state.listening = false;
    document.querySelectorAll('[data-memory]').forEach((b) => (b.disabled = false));
    await runtime.say('Tap the pictures in order.');
  }

  async function memoryTap(id) {
    if (runtime.state.listening || runtime.state.solved) return;
    const w = runtime.getWord(id),
      roundAtStart = runtime.roundGeneration;
    if (runtime.state.sequence[runtime.state.input.length].id !== id) {
      select('#sequence').innerHTML = runtime.state.sequence
        .map((w) => '<span>' + renderPicture(w) + '</span>')
        .join('');
      runtime.state.input = [];
      runtime.state.sequence = [pick(runtime.state.pool)];
      runtime.state.hints = 0;
      runtime.state.showSequence = false;
      runtime.state.listening = true;
      document.querySelectorAll('[data-memory]').forEach((b) => (b.disabled = true));
      if ((await runtime.wrong()) && roundAtStart === runtime.roundGeneration)
        runtime.scheduleRoundTask(() => runtime.playSequence(), 400);
      return;
    }
    runtime.state.input.push(id);
    select('#sequence').insertAdjacentHTML('beforeend', '<span>' + renderPicture(w) + '</span>');
    if (runtime.state.input.length === runtime.state.sequence.length) {
      runtime.progress.stars++;
      runtime.progress.played.memory = (runtime.progress.played.memory || 0) + 1;
      runtime.save();
      runtime.feedback('You remembered the whole sequence!');
      runtime.confetti();
      runtime.state.listening = true;
      document.querySelectorAll('[data-memory]').forEach((b) => (b.disabled = true));
      runtime.state.hints = 0;
      runtime.state.showSequence = false;
      runtime.state.sequence.push(pick(runtime.state.pool));
      if (
        (await runtime.resultSound('correct', () =>
          runtime.say('You remembered the whole sequence!'),
        )) &&
        roundAtStart === runtime.roundGeneration
      )
        runtime.scheduleRoundTask(() => runtime.playSequence(), 400);
    } else runtime.resultSound('letter', () => runtime.say(w.word));
  }
  return { playSequenceNarration, memoryTap };
}
