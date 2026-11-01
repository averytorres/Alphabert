import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import ffmpeg from '../tools/audio/node_modules/ffmpeg-static/index.js';
import { SOUNDS, wav } from './phonics-reference.mjs';
import { sustain } from './sustain-phoneme.mjs';
const words = JSON.parse(fs.readFileSync('content/words.json')).words,
  index = JSON.parse(fs.readFileSync('audio/index.json')),
  references = JSON.parse(fs.readFileSync('audio/phonics-reference.json')).references,
  report = [];
const naturalCache = new Map();
function naturalSound(token) {
  if (naturalCache.has(token)) return naturalCache.get(token);
  const file = index.clips['phoneme-natural:' + token];
  if (!file) return null;
  const decoded = spawnSync(
    ffmpeg,
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      file,
      '-af',
      'silenceremove=stop_periods=1:stop_duration=0.06:stop_threshold=-55dB',
      '-ar',
      '22050',
      '-ac',
      '1',
      '-f',
      's16le',
      'pipe:1',
    ],
    { windowsHide: true },
  );
  assert.equal(decoded.status, 0, String(decoded.stderr));
  const samples = Int16Array.from({ length: decoded.stdout.length / 2 }, (_, i) =>
    decoded.stdout.readInt16LE(i * 2),
  );
  assert.ok(samples.length > 2205, 'Human sound too short');
  const value = { file, samples };
  naturalCache.set(token, value);
  return value;
}
const continuous = new Set(['f', 'l', 'r', 'm', 'n', 'ng', 's', 'z', 'v', 'sh', 'th']),
  noise = new Set(['s', 'sh', 'f', 'th']);
for (const word of words)
  for (const blend of word.blends || []) {
    if (blend.start !== 0 && blend.start + blend.text.length !== word.word.length) continue;
    const tokens =
        blend.start === 0
          ? word.phonemes.slice(0, blend.text.length)
          : word.phonemes.slice(-blend.text.length),
      parts = [],
      segments = [];
    for (const token of tokens) {
      const natural = naturalSound(token),
        rate = 22050;
      let input;
      if (natural) input = natural.samples.slice();
      else {
        const source = fs.readFileSync('.phonics-reference-cache/' + token + '.wav');
        assert.equal(source.readUInt32LE(24), rate);
        input = Int16Array.from({ length: (source.length - 44) / 2 }, (_, i) =>
          source.readInt16LE(44 + i * 2),
        );
      }
      // Exclude the reference keyword's boundary too (e.g. the vowel in red).
      // Holding a trimmed clip with its original release could still replay that tail.
      if (!natural && continuous.has(token))
        input = sustain(input, rate, 0.48, { noise: noise.has(token), steadyRelease: true });
      let peak = 0;
      for (const n of input) peak = Math.max(peak, Math.abs(n));
      assert.ok(peak > 0);
      const gain = Math.min(4, 18000 / peak),
        part = Float64Array.from(input, (n) => n * gain);
      const fade = Math.min(110, Math.floor(part.length * 0.08));
      for (let i = 0; i < fade; i++) {
        part[i] *= i / fade;
        part[part.length - 1 - i] *= i / fade;
      }
      segments.push({
        token,
        seconds: part.length / rate,
        sustained: !natural && continuous.has(token),
        steadyRelease: !natural && continuous.has(token),
        sourceEndFraction: !natural && continuous.has(token) ? 0.6 : 1,
        source: natural?.file || references[token].file,
        human: !!natural,
        looped: !natural && continuous.has(token),
      });
      parts.push(part);
    }
    const joined = [];
    for (const part of parts) {
      const overlap = Math.min(110, joined.length);
      for (let i = 0; i < overlap; i++) {
        const t = (i + 1) / (overlap + 1),
          at = joined.length - overlap + i;
        joined[at] = joined[at] * (1 - t) + part[i] * t;
      }
      for (let i = overlap; i < part.length; i++) joined.push(part[i]);
    }
    const samples = Int16Array.from(joined, (n) =>
        Math.max(-32768, Math.min(32767, Math.round(n))),
      ),
      file = `audio/blend-${word.id}-${blend.text}-v4.ogg`,
      temp = `.phonics-reference-cache/blend-${word.id}-${blend.text}-v4.wav`;
    fs.writeFileSync(temp, wav(samples, 22050));
    const result = spawnSync(
      ffmpeg,
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
        '-i',
        temp,
        '-af',
        'apad=pad_dur=0.12',
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
    assert.equal(result.status, 0, result.stderr);
    index.clips[`blend:${word.id}:${blend.text}`] = file;
    report.push({
      word: word.id,
      blend: blend.text,
      tokens,
      ipa: tokens.map((t) => SOUNDS[t][1]).join(''),
      selectedPhones: tokens.flatMap((t) => references[t].selectedPhones),
      segments,
      seconds: samples.length / 22050,
      playbackRate: 1,
      timeStretched: false,
      method:
        'Isolated consonants; continuous sounds exclude keyword-boundary tails and fade cleanly',
      file,
    });
  }
fs.writeFileSync('audio/index.json', JSON.stringify(index, null, 2) + '\n');
fs.writeFileSync('audio/blend-reference.json', JSON.stringify(report, null, 2) + '\n');
console.log(`Published ${report.length} isolated, sustained beginning/ending blend cues.`);
const humanBlends = report.filter((r) => r.segments.some((s) => s.human));
if (humanBlends.length)
  fs.writeFileSync(
    'audio/licenses/HUMAN-BLENDS-CREDITS.txt',
    'The following adapted blend recordings incorporate human phonics sources credited in HUMAN-PHONICS-CREDITS.txt. These blend adaptations are distributed under CC BY-SA 3.0: https://creativecommons.org/licenses/by-sa/3.0/\nChanges: natural sound segment with trailing silence trimmed, gain/edge fades, joined to generated consonant(s), mono/resampling/Ogg encoding; no stretching or looping of human audio.\n' +
      humanBlends
        .map(
          (r) =>
            r.file +
            ' — ' +
            r.segments
              .filter((s) => s.human)
              .map((s) => s.source)
              .join(', '),
        )
        .join('\n') +
      '\n',
  );
if (humanBlends.length && fs.existsSync('phonics-credits.html')) {
  let page = fs
    .readFileSync('phonics-credits.html', 'utf8')
    .replace(/<!-- human-blend-credits -->[\s\S]*?<!-- end-human-blend-credits -->/g, '');
  const credit = fs
    .readFileSync('audio/licenses/HUMAN-BLENDS-CREDITS.txt', 'utf8')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;');
  page = page.replace(
    '</html>',
    '<!-- human-blend-credits --><h2>Blend recording adaptations</h2><pre>' +
      credit +
      '</pre><!-- end-human-blend-credits --></html>',
  );
  fs.writeFileSync('phonics-credits.html', page);
}
