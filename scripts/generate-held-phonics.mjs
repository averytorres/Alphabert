import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import ffmpeg from '../tools/audio/node_modules/ffmpeg-static/index.js';
import { wav } from './phonics-reference.mjs';
import { sustain } from './sustain-phoneme.mjs';

const index = JSON.parse(fs.readFileSync('audio/index.json')),
  reference = JSON.parse(fs.readFileSync('audio/phonics-reference.json')),
  report = {
    version: 2,
    method:
      'Steady-state sustain; continuous consonants exclude final 40 percent of source and fade out without word-derived release; native sample/playback rate',
    sounds: {},
  };
const brief = new Set([
    'b',
    'd',
    'g',
    'k',
    'p',
    't',
    'j',
    'ch',
    'qu',
    'kw',
    'ks',
    'w',
    'y',
    'ue',
    'yoo',
  ]),
  noise = new Set(['s', 'sh', 'f', 'th', 'h']);
const continuous = new Set(['f', 'h', 'l', 'm', 'n', 'ng', 'r', 's', 'sh', 'th', 'v', 'z']);
for (const [token, entry] of Object.entries(reference.references)) {
  if (brief.has(token)) {
    index.clips['phoneme-held:' + token] = entry.file;
    report.sounds[token] = {
      file: entry.file,
      sustained: false,
      reason: 'Keep stop release or glide intact',
    };
    continue;
  }
  const source = fs.readFileSync('.phonics-reference-cache/' + token + '.wav'),
    rate = source.readUInt32LE(24),
    input = new Int16Array((source.length - 44) / 2);
  for (let i = 0; i < input.length; i++) input[i] = source.readInt16LE(44 + i * 2);
  const steadyRelease = continuous.has(token),
    output = sustain(input, rate, 0.85, { noise: noise.has(token), steadyRelease }),
    file = `audio/phoneme-${token}-held-v2.ogg`,
    temp = '.phonics-reference-cache/' + token + '-held.wav';
  fs.writeFileSync(temp, wav(output, rate));
  let peak = 0;
  for (const n of output) peak = Math.max(peak, Math.abs(n) / 32768);
  const encoded = spawnSync(
    ffmpeg,
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-i',
      temp,
      '-af',
      `volume=${Math.min(3, 0.55 / peak).toFixed(4)},apad=pad_dur=0.12`,
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
  assert.equal(encoded.status, 0, encoded.stderr);
  index.clips['phoneme-held:' + token] = file;
  report.sounds[token] = {
    file,
    sustained: true,
    steadyRelease,
    sourceEndFraction: steadyRelease ? 0.6 : 1,
    fadeOutSeconds: steadyRelease ? 0.025 : 0,
    originalSeconds: input.length / rate,
    heldSeconds: output.length / rate,
    sampleRate: rate,
    playbackRate: 1,
  };
}
fs.writeFileSync('audio/index.json', JSON.stringify(index, null, 2) + '\n');
fs.writeFileSync('audio/phonics-held.json', JSON.stringify(report, null, 2) + '\n');
console.log(
  `Published Letter Sounds audio: ${Object.values(report.sounds).filter((s) => s.sustained).length} held sounds; ${brief.size} stop/glide sounds retain their native articulation.`,
);
