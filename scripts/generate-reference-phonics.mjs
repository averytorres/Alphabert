import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import ffmpeg from '../tools/audio/node_modules/ffmpeg-static/index.js';
import { engine, SOUNDS, cleanIPA, wav } from './phonics-reference.mjs';
const root = process.cwd(),
  cache = '.phonics-reference-cache',
  synth = await engine();
fs.mkdirSync(cache, { recursive: true });
const index = JSON.parse(fs.readFileSync('audio/index.json')),
  references = {},
  stops = new Set(['b', 'd', 'g', 'k', 'p', 't', 'j', 'ch', 'qu', 'kw', 'ks']);
const naturalStops = await engine({ rate: 80 }),
  naturalHeld = await engine({ rate: 80 });
for (const [token, [word, targetIPA]] of Object.entries(SOUNDS)) {
  const source = (stops.has(token) ? naturalStops : naturalHeld)(word);
  let match;
  for (let a = 0; a < source.phones.length && !match; a++)
    for (let b = a; b < source.phones.length; b++)
      if (
        cleanIPA(
          source.phones
            .slice(a, b + 1)
            .map((p) => p.id)
            .join(''),
        ) === targetIPA
      )
        match = { a, b };
  assert.ok(match, `Cannot identify ${token} in ${word}`);
  const start = source.phones[match.a].audio_position / 1000;
  const following = source.events.find(
    (e) => e.type === 'phoneme' && e.audio_position > source.phones[match.b].audio_position,
  );
  const end = (following?.audio_position ?? source.samples.length / 22.05) / 1000;
  // Remove boundary transitions rather than including a neighboring vowel.
  const from = Math.round((start + 0.002) * source.sampleRate),
    to = Math.round((end - 0.004) * source.sampleRate),
    samples = source.samples.slice(from, to);
  let peak = 0;
  for (const n of samples) peak = Math.max(peak, Math.abs(n) / 32768);
  assert.ok(peak > 0.005, `Silent reference: ${token}`);
  const target = (to - from) / source.sampleRate,
    filters = ['volume=' + Math.min(3, 0.55 / peak).toFixed(4), 'apad=pad_dur=0.12'];
  const input = path.join(cache, token + '.wav'),
    file = `audio/phoneme-${token}-reference-v3.ogg`;
  fs.writeFileSync(input, wav(samples, source.sampleRate));
  const result = spawnSync(
    ffmpeg,
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-i',
      input,
      '-af',
      filters.join(','),
      '-ar',
      '24000',
      '-c:a',
      'libvorbis',
      '-q:a',
      '5',
      file,
    ],
    { encoding: 'utf8', windowsHide: true },
  );
  if (result.status !== 0) throw Error(result.stderr);
  index.clips['phoneme:' + token] = file;
  references[token] = {
    keyword: word,
    targetIPA,
    sourcePhones: source.phones.map((p) => p.id),
    selectedPhones: source.phones.slice(match.a, match.b + 1).map((p) => p.id),
    from: start,
    to: end,
    targetDuration: target,
    synthesisRate: 80,
    timeStretched: false,
    file,
  };
}
const words = JSON.parse(fs.readFileSync('content/words.json')).words,
  audit = [];
for (const w of words) {
  const expected = w.phonemes.map((p) => SOUNDS[p]?.[1] || '?').join(''),
    events = synth(w.word).phones,
    actual = cleanIPA(events.map((p) => p.id).join(''));
  const accepted = w.word === 'kitten' ? actual.replace('ʔn̩', 'tən') : actual;
  assert.equal(
    expected,
    accepted,
    `Word pronunciation mismatch: ${w.word} (${expected} / ${actual})`,
  );
  audit.push({
    word: w.word,
    phonemes: w.phonemes,
    targetIPA: expected,
    referenceIPA: actual,
    ...(w.word === 'kitten'
      ? {
          variant:
            'Teaching pronunciation uses t + schwa + n; reference has an American glottal stop and syllabic n.',
        }
      : {}),
  });
}
index.phonicsSource = 'Contextual eSpeak NG phoneme extraction (en-us)';
index.phonicsTimingVersion = 6;
delete index.phonicsTiming;
fs.writeFileSync('audio/index.json', JSON.stringify(index, null, 2) + '\n');
fs.writeFileSync(
  'audio/phonics-reference.json',
  JSON.stringify(
    { version: 1, engine: 'eSpeak NG', voice: 'en-us', references, words: audit },
    null,
    2,
  ) + '\n',
);
fs.copyFileSync(
  'tools/phonics/node_modules/@echogarden/espeak-ng-emscripten/COPYING',
  'audio/licenses/eSpeak-NG-COPYING.txt',
);
fs.writeFileSync(
  'audio/licenses/eSpeak-NG-NOTICE.txt',
  'Phonics samples generated with eSpeak NG via @echogarden/espeak-ng-emscripten 0.3.5. Source: https://github.com/echogarden-project/espeak-ng-emscripten . Engine is GPL-3.0; the engine is used as a development tool and is not bundled in the Android app. Samples are extracted using phoneme event timings in ordinary English words. Normal narration and alphabet names remain Kokoro.\n',
);
console.log(
  `Published ${Object.keys(references).length} contextual phoneme clips; checked all ${audit.length} word sound sequences against English-US pronunciation events.`,
);
