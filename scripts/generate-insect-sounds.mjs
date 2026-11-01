import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import ffmpeg from '../tools/audio/node_modules/ffmpeg-static/index.js';
import { engine, cleanIPA, SOUNDS, wav } from './phonics-reference.mjs';
import { sustain } from './sustain-phoneme.mjs';
const word = JSON.parse(fs.readFileSync('content/words.json')).words.find((w) => w.id === 'insect'),
  source = (await engine({ rate: 80 }))(word.word),
  index = JSON.parse(fs.readFileSync('audio/index.json')),
  report = [];
assert.equal(source.phones.length, word.phonemes.length);
for (const [i, token] of word.phonemes.entries()) {
  const phone = source.phones[i];
  assert.equal(cleanIPA(phone.id), SOUNDS[token][1]);
  const next = source.events.find(
      (e) => e.type === 'phoneme' && e.audio_position > phone.audio_position,
    ),
    start = phone.audio_position / 1000,
    end = (next?.audio_position ?? source.samples.length / 22.05) / 1000;
  const stop = ['k', 't'].includes(token),
    from = start + 0.003,
    to = end - (stop ? 0.004 : Math.max(0.012, (end - start) * 0.12));
  let samples = source.samples.slice(
    Math.round(from * source.sampleRate),
    Math.round(to * source.sampleRate),
  );
  if (!stop)
    samples = sustain(samples, source.sampleRate, 0.45, {
      noise: token === 's',
      steadyRelease: true,
    });
  let peak = 0;
  for (const n of samples) peak = Math.max(peak, Math.abs(n));
  assert.ok(peak > 0);
  const gain = Math.min(4, 18000 / peak);
  samples = Int16Array.from(samples, (n) => Math.round(n * gain));
  const file = `audio/word-phoneme-insect-${i}-v2.ogg`,
    temp = `.phonics-reference-cache/insect-${i}.wav`;
  fs.writeFileSync(temp, wav(samples, source.sampleRate));
  const r = spawnSync(
    ffmpeg,
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-i',
      temp,
      '-af',
      'afade=t=in:d=0.003,apad=pad_dur=0.12',
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
  assert.equal(r.status, 0, r.stderr);
  index.clips[`word-phoneme:insect:${i}`] = file;
  report.push({
    token,
    ipa: cleanIPA(phone.id),
    from,
    to,
    seconds: samples.length / source.sampleRate,
    sustained: !stop,
    playbackRate: 1,
    file,
  });
}
fs.writeFileSync('audio/index.json', JSON.stringify(index, null, 2) + '\n');
fs.writeFileSync('audio/insect-sounds.json', JSON.stringify(report, null, 2) + '\n');
console.log('Published six context-matched insect sounds');
