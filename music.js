// Additive instrument voices: a clear fundamental, gentle upper partials, no samples.
export const INSTRUMENTS = {
  piano: { partials: [1, 0.38, 0.16, 0.07], decay: true, attack: 0.008 },
  marimba: { partials: [1, 0.16, 0.05], decay: true, attack: 0.006 },
  flute: { partials: [1, 0.12, 0.035], attack: 0.045 },
  clarinet: { partials: [1, 0, 0.3, 0, 0.12], attack: 0.025 },
  harp: { partials: [1, 0.3, 0.13, 0.06, 0.025], decay: true, attack: 0.012 },
  bells: { partials: [1, 0.3, 0.08, 0.12], decay: true, attack: 0.004 },
  accordion: { partials: [1, 0.3, 0.24, 0.12, 0.08], attack: 0.035 },
  organ: { partials: [1, 0.45, 0.16, 0.22], attack: 0.018 },
  musicbox: { partials: [1, 0.08, 0.2, 0.04, 0.08], decay: true, attack: 0.005 },
};
// Shared by live playback and the offline audio quality check.
export function scheduleMelody(context, output, song, nodes = []) {
  const semitones = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  let offset = 0.15;
  for (const note of song.notes) {
    const duration = (note.duration * 60) / (song.tempo || 125),
      at = context.currentTime + offset;
    const match = /^([A-G])(#|b)?(\d)$/.exec(note.note);
    if (match) {
      const midi =
        (Number(match[3]) + 1) * 12 +
        semitones[match[1]] +
        (match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0);
      const voice = INSTRUMENTS[song.instrument];
      if (voice) {
        const envelope = context.createGain(),
          attack = Math.min(voice.attack, duration * 0.15);
        envelope.gain.setValueAtTime(0, at);
        envelope.gain.linearRampToValueAtTime(0.66, at + attack);
        if (voice.decay) {
          envelope.gain.exponentialRampToValueAtTime(0.23, at + duration * 0.72);
        } else envelope.gain.setValueAtTime(0.57, at + duration * 0.78);
        envelope.gain.exponentialRampToValueAtTime(0.001, at + duration * 0.98);
        envelope.connect(output);
        const total = voice.partials.reduce((a, b) => a + b, 0),
          frequency = 440 * 2 ** ((midi - 69) / 12);
        voice.partials.forEach((level, i) => {
          if (!level || frequency * (i + 1) > context.sampleRate * 0.45) return;
          const osc = context.createOscillator(),
            gain = context.createGain();
          osc.type = 'sine';
          osc.frequency.value = frequency * (i + 1);
          gain.gain.value = level / total;
          osc.connect(gain);
          gain.connect(envelope);
          nodes.push(osc);
          osc.start(at);
          osc.stop(at + duration);
        });
        offset += duration;
        continue;
      }
      const oscillator = context.createOscillator(),
        envelope = context.createGain();
      oscillator.type = 'triangle';
      oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12);
      envelope.gain.setValueAtTime(0, at);
      envelope.gain.linearRampToValueAtTime(0.58, at + 0.015);
      envelope.gain.setValueAtTime(0.48, at + duration * 0.72);
      envelope.gain.exponentialRampToValueAtTime(0.001, at + duration * 0.95);
      oscillator.connect(envelope);
      // A quiet octave makes the tune clearer on small phone speakers.
      const octave = context.createOscillator(),
        octaveLevel = context.createGain();
      nodes.push(oscillator, octave);
      octave.type = 'sine';
      octave.frequency.value = oscillator.frequency.value * 2;
      octaveLevel.gain.value = 0.25;
      octave.connect(octaveLevel);
      octaveLevel.connect(envelope);
      envelope.connect(output);
      oscillator.start(at);
      oscillator.stop(at + duration);
      octave.start(at);
      octave.stop(at + duration);
    }
    offset += duration;
  }
  return offset;
}
