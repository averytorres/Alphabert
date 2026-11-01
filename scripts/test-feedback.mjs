import assert from 'node:assert/strict';
import { FeedbackPlayer, RESULT_TUNES } from '../feedback.js';
const originalTimeout = globalThis.setTimeout,
  originalClear = globalThis.clearTimeout,
  originalContext = globalThis.AudioContext;
const timers = new Map();
let timerId = 0,
  contexts = 0;
globalThis.setTimeout = (fn, ms) => {
  const id = ++timerId;
  timers.set(id, { fn, ms });
  return id;
};
globalThis.clearTimeout = (id) => timers.delete(id);
class Context {
  constructor() {
    contexts++;
    this.currentTime = 0;
    this.destination = {};
  }
  resume() {
    return Promise.resolve();
  }
  createGain() {
    return {
      gain: {
        value: 0,
        setValueAtTime() {},
        linearRampToValueAtTime() {},
        exponentialRampToValueAtTime() {},
        setTargetAtTime() {},
      },
      connect() {},
      disconnect() {},
    };
  }
  createOscillator() {
    return { frequency: { value: 0 }, connect() {}, disconnect() {}, start() {}, stop() {} };
  }
}
globalThis.AudioContext = Context;
try {
  const picker = new FeedbackPlayer();
  for (const kind of ['correct', 'incorrect']) {
    assert.equal(RESULT_TUNES[kind].length, 5);
    const sequence = Array.from({ length: 50 }, () => picker.nextVariant(kind));
    for (let i = 0; i < sequence.length; i++) {
      if (i) assert.notEqual(sequence[i], sequence[i - 1], 'No consecutive repeats');
      if (i % 5 === 0)
        assert.equal(
          new Set(sequence.slice(i, i + 5)).size,
          5,
          'Every five plays includes all five variations',
        );
    }
  }
  const player = new FeedbackPlayer();
  const positive = player.play('correct');
  assert.equal(timers.size, 1);
  assert.ok([...timers.values()][0].ms >= 3000 && [...timers.values()][0].ms <= 5000);
  const negative = player.play('incorrect');
  assert.equal(await positive, false, 'New feedback cancels old feedback');
  assert.equal(timers.size, 1);
  const timer = [...timers.values()][0];
  assert.ok(timer.ms >= 3000 && timer.ms <= 5000);
  timer.fn();
  assert.equal(await negative, true);
  assert.equal(timers.size, 0);
  assert.equal(contexts, 1, 'Reuse one audio context');
  const cancelled = player.play('correct');
  player.stop();
  assert.equal(await cancelled, false);
  assert.equal(timers.size, 0);
  player.volume = 0;
  assert.equal(await player.play('correct'), true);
  assert.equal(timers.size, 0, 'Muted jingles complete without delaying speech');
  player.volume = 1;
  const chime = player.play('letter');
  assert.ok([...timers.values()][0].ms < 700);
  player.stop();
  assert.equal(await chime, false);
  console.log(
    'Answer sound checks passed: 3–5 second result tunes, replacement/cancellation, one audio context, mute and short letter chimes.',
  );
} finally {
  globalThis.setTimeout = originalTimeout;
  globalThis.clearTimeout = originalClear;
  globalThis.AudioContext = originalContext;
}
