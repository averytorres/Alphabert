import { browserOptions } from './browser-config.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { chromium } from '../tools/test-browser/node_modules/playwright/index.mjs';
const report = JSON.parse(fs.readFileSync('audio/elevenlabs-phonics.json')),
  clips = JSON.parse(fs.readFileSync('audio/index.json')).clips;
const words = JSON.parse(fs.readFileSync('content/words.json')).words;
for (const word of words)
  for (const token of word.phonemes)
    assert.ok(report.sounds[token], `${word.id}/${token} has the new voice`);
assert.notEqual(
  clips['phoneme-eleven:shortoo'],
  clips['phoneme-eleven:oo'],
  'book and moon must stay distinct',
);
let used = [],
  rates = [];
const window = { dispatchEvent() {}, speechSynthesis: { cancel() {} } };
class Audio {
  constructor(file) {
    this.file = file;
  }
  pause() {}
  play() {
    used.push(this.file);
    rates.push(this.playbackRate);
    queueMicrotask(() => this.onended());
    return Promise.resolve();
  }
}
vm.runInNewContext(fs.readFileSync('speech.js', 'utf8'), {
  window,
  Audio,
  CustomEvent: class {},
  fetch: async () => ({ ok: true, json: async () => ({ clips }) }),
  setTimeout,
  clearTimeout,
});
const voice = new window.SpeechService();
for (const word of words)
  for (const [i, token] of word.phonemes.entries()) {
    await voice.phoneme(token, { wordId: word.id, index: i, held: true });
    assert.equal(
      used.at(-1),
      report.sounds[token].file,
      `${word.id}/${token} must not fall back to the old insect/human/synthetic bank`,
    );
  }
for (const letter of 'abcdefghijklmnopqrstuvwxyz') {
  await voice.letter(letter);
  assert.equal(used.at(-1), report.letters[letter].file);
}
for (const word of words)
  for (const blend of word.blends) {
    await voice.blend(word, blend);
    assert.equal(used.at(-1), clips[`blend-eleven:${word.id}:${blend.text}`]);
  }
assert.ok(
  rates.every((r) => r === 1),
  'All new speech retains natural pitch and speed',
);
const browser = await chromium.launch({ ...browserOptions(), headless: true });
try {
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:4173');
  const files = [
    ...new Set(
      [...Object.values(report.sounds), ...Object.values(report.letters), ...report.blends].map(
        (s) => s.file,
      ),
    ),
  ];
  const result = await page.evaluate(async (files) => {
    const ctx = new OfflineAudioContext(1, 24000, 24000),
      result = [];
    for (const file of files) {
      const response = await fetch(file);
      if (!response.ok) throw Error(file + ' missing');
      const buffer = await ctx.decodeAudioData(await response.arrayBuffer());
      const samples = buffer.getChannelData(0);
      let peak = 0,
        energy = 0;
      for (const sample of samples) {
        if (!Number.isFinite(sample)) throw Error(file + ' invalid samples');
        peak = Math.max(peak, Math.abs(sample));
        energy += sample * sample;
      }
      if (peak < 0.003 || peak > 0.99 || buffer.duration < 0.13 || buffer.duration > 2.5)
        throw Error(
          file + ' invalid signal ' + JSON.stringify({ peak, duration: buffer.duration }),
        );
      let first = samples.findIndex((s) => Math.abs(s) > peak * 0.1),
        last = samples.length - 1;
      while (last > first && Math.abs(samples[last]) <= peak * 0.1) last--;
      result.push({
        file,
        seconds: buffer.duration,
        peak,
        rms: Math.sqrt(energy / samples.length),
        activeSeconds: (last - first) / buffer.sampleRate,
      });
    }
    return result;
  }, files);
  fs.mkdirSync('test-results/elevenlabs', { recursive: true });
  fs.writeFileSync('test-results/elevenlabs/decode.json', JSON.stringify(result, null, 2));
  for (const [token, minimum] of Object.entries({
    b: 0.4,
    d: 0.47,
    g: 0.41,
    k: 0.31,
    p: 0.24,
    t: 0.27,
  })) {
    const s = report.sounds[token];
    assert.equal(s.source, 'stops', 'Stop sounds must come from freshly articulated cues');
    assert.ok(s.end - s.start >= minimum, token + ' must retain the complete new articulation');
    const signal = result.find((r) => r.file === s.file);
    assert.ok(signal.rms > 0.008, token + ' must be audible, not padded silence');
  }
  assert.equal(report.sounds.j.independent, true);
  const jSignal = result.find((r) => r.file === report.sounds.j.file);
  assert.ok(
    jSignal.activeSeconds > 0.2 && jSignal.rms > 0.01,
    'J must contain audible articulation, not just playback padding',
  );
  assert.equal(report.sounds.kw.independent, true);
  assert.equal(report.sounds.qu.file, report.sounds.kw.file);
  const qSignal = result.find((r) => r.file === report.sounds.kw.file);
  assert.ok(
    qSignal.activeSeconds > 0.2 && qSignal.rms > 0.01,
    'Q/kw must contain audible articulation, not just playback padding',
  );
  await voice.phoneme('q');
  assert.equal(used.at(-1), report.sounds.kw.file, 'Q must select the fresh kw cue');
  assert.equal(report.sounds.w.independent, true);
  const wSignal = result.find((r) => r.file === report.sounds.w.file);
  assert.ok(
    wSignal.activeSeconds > 0.2 && wSignal.rms > 0.01,
    'W must contain audible articulation, not just playback padding',
  );
  assert.equal(report.sounds.ks.independent, true);
  const xSignal = result.find((r) => r.file === report.sounds.ks.file);
  assert.ok(
    xSignal.activeSeconds > 0.3 && xSignal.rms > 0.01,
    'X/ks must retain an audible consonant cluster, not just padding',
  );
  await voice.phoneme('x', { held: true });
  assert.equal(used.at(-1), report.sounds.ks.file, 'X must select the independent ks cue');
  assert.equal(report.sounds.y.independent, true);
  const ySignal = result.find((r) => r.file === report.sounds.y.file);
  assert.ok(
    ySignal.activeSeconds > 0.2 && ySignal.rms > 0.01,
    'Y/yak must retain audible articulation, not just padding',
  );
  const yLesson = JSON.parse(fs.readFileSync('content/lessons.json')).letters.find(
    (l) => l.letter === 'y',
  );
  assert.equal(yLesson.sounds.find((s) => s.exampleId === 'yak').sound, 'y');
  assert.equal(yLesson.sounds.find((s) => s.exampleId === 'ivy').sound, 'ee');
  assert.notEqual(report.sounds.y.file, report.sounds.ue.file, 'Consonant Y is distinct from yoo');
  assert.equal(report.sounds.ng.isolatedCue, true);
  assert.equal(report.sounds.ng.excerpt.file, 'audio-trials/elevenlabs/extended-take1.mp3');
  const ngSignal = result.find((r) => r.file === report.sounds.ng.file);
  assert.ok(
    ngSignal.activeSeconds > 0.3 && ngSignal.rms > 0.025 && ngSignal.peak > 0.15,
    'ng needs audible sustained articulation, not a faint word tail',
  );
  await voice.phoneme('ng', { wordId: 'king', index: 2 });
  assert.equal(used.at(-1), report.sounds.ng.file);
  assert.deepEqual(words.find((w) => w.id === 'king').phonemes, ['k', 'i', 'ng']);
  assert.equal(report.sounds.schwa.independent, true);
  assert.equal(report.sounds.schwa.individualListeningVerified, true);
  assert.equal(report.sounds.schwa.gain, 1);
  assert.equal(
    report.sources['standalone-schwa'].sha256,
    JSON.parse(fs.readFileSync('audio/schwa-approved.json')).sourceSha256,
  );
  const schwaSignal = result.find((r) => r.file === report.sounds.schwa.file);
  assert.ok(
    schwaSignal.activeSeconds > 0.15 && schwaSignal.rms > 0.01 && schwaSignal.peak < 0.99,
    'Schwa needs audible native articulation',
  );
  for (const id of ['zebra', 'xylophone']) {
    const word = words.find((w) => w.id === id),
      at = word.phonemes.indexOf('schwa');
    assert.ok(at >= 0);
    await voice.phoneme('schwa', { wordId: id, index: at });
    assert.equal(used.at(-1), report.sounds.schwa.file);
  }
  for (const token of ['kw', 'w']) {
    const source = report.sounds[token];
    assert.equal(source.style, 'clear');
    assert.equal(source.gain, 1.5);
    const restored = JSON.parse(fs.readFileSync('audio/restored-qw.json')).sounds[token];
    assert.equal(source.file, restored.file);
    assert.equal(
      (await import('node:crypto'))
        .createHash('sha256')
        .update(fs.readFileSync(source.file))
        .digest('hex'),
      restored.sha256,
      'Restore the exact pre-whisper recording: ' + token,
    );
  }
  console.log(
    `${result.length} unique ElevenLabs clips decoded in Chrome; all 106 word sound sequences, 26 letter names, and 30 blends select native-speed recordings. Signal and routing checks do not certify pronunciation.`,
  );
} finally {
  await browser.close();
}
