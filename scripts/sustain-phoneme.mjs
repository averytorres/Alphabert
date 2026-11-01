import assert from 'node:assert/strict';
// Extend the steady sound, retaining its original onset/release and sample rate.
// Period-aligned loops preserve voice pitch; noise consonants use a crossfade.
export function sustain(input, rate, seconds, { noise = false, steadyRelease = false } = {}) {
  if (steadyRelease) {
    // The final portion of a word-derived consonant can anticipate its vowel.
    // Exclude it completely, including from the period search and looping window.
    const safe = input.slice(0, Math.floor(input.length * 0.6));
    const held = sustain(safe, rate, seconds, { noise });
    // Replace the inherited ending with continuation of the safe steady sample.
    // The recursive call only ever sees the safe prefix, never the vowel boundary.
    const fade = Math.min(Math.round(rate * 0.025), held.length);
    for (let i = 0; i < fade; i++)
      held[held.length - fade + i] = Math.round(
        held[held.length - fade + i] * (1 - i / (fade - 1)),
      );
    return held;
  }
  const target = Math.round(rate * seconds);
  if (input.length >= target) return input;
  let start = Math.floor(input.length * 0.3),
    period = 0,
    best = -Infinity;
  if (!noise) {
    const window = Math.min(Math.floor(input.length * 0.35), Math.floor(rate * 0.045));
    for (
      let lag = Math.floor(rate / 400);
      lag <= Math.min(Math.floor(rate / 65), Math.floor(input.length * 0.2));
      lag++
    ) {
      let xy = 0,
        xx = 0,
        yy = 0;
      for (let i = 0; i < window && start + i + lag < input.length; i++) {
        const a = input[start + i],
          b = input[start + i + lag];
        xy += a * b;
        xx += a * a;
        yy += b * b;
      }
      const score = xy / Math.sqrt(xx * yy || 1);
      if (score > best) {
        best = score;
        period = lag;
      }
    }
  }
  const length = period
    ? Math.min(period * 4, Math.floor(input.length * 0.45))
    : Math.min(Math.floor(rate * 0.065), Math.floor(input.length * 0.45));
  const fade = period ? period : Math.min(Math.floor(rate * 0.01), Math.floor(length / 4));
  assert.ok(length > fade && length > 0, 'Source sound too short to sustain');
  const segment = input.slice(start, start + length),
    tail = input.slice(start),
    result = Array.from(input.slice(0, start));
  const append = (chunk) => {
    const overlap = Math.min(fade, result.length, chunk.length);
    for (let i = 0; i < overlap; i++) {
      const t = (i + 1) / (overlap + 1),
        at = result.length - overlap + i;
      result[at] = Math.round(result[at] * (1 - t) + chunk[i] * t);
    }
    result.push(...chunk.slice(overlap));
  };
  const heldLength = target - tail.length + fade;
  while (result.length < heldLength) append(segment);
  result.length = heldLength;
  append(tail);
  return Int16Array.from(result);
}
