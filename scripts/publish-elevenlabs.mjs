// Publish native-speed cuts of the recordings approved in the listening trial.
// Keep the original banks intact for provenance and fallback.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import ffmpeg from '../tools/audio/node_modules/ffmpeg-static/index.js';
const root = 'audio-trials/elevenlabs/';
const sources = {
  extended: 'extended-take1.mp3',
  retry: 'ant-book-web-take1.mp3',
  original: 'roger-v4-take1.mp3',
  stops: 'stop-sounds-v2.mp3',
};
// Boundaries use local word alignment plus the gaps in the source waveform.
// Stop consonants retain their native onset, without the alphabet-name vowel.
const cuts = {
  a: ['retry', 4.45, 4.92],
  shortoo: ['retry', 14.135, 14.57],
  w: ['retry', 22.875, 23.015],
  e: ['extended', 5.105, 5.4],
  i: ['extended', 7.38, 7.695],
  o: ['extended', 9.78, 10.24],
  u: ['extended', 12.315, 12.63],
  ay: ['extended', 14.325, 14.805],
  ee: ['original', 6.75, 7.76],
  igh: ['extended', 18.66, 19.15],
  oa: ['extended', 20.825, 21.275],
  ue: ['extended', 22.945, 23.465],
  oo: ['extended', 25.31, 25.8],
  aw: ['extended', 29.465, 29.935],
  ow: ['extended', 31.62, 32.15],
  oi: ['extended', 33.775, 34.255],
  ar: ['extended', 35.86, 36.33],
  or: ['extended', 37.935, 38.4],
  er: ['extended', 39.945, 40.4],
  air: ['extended', 41.97, 42.46],
  ear: ['extended', 44.015, 44.48],
  b: ['stops', 2.99, 3.4],
  d: ['stops', 7.205, 7.69],
  g: ['stops', 11.25, 11.67],
  k: ['stops', 15.255, 15.57],
  p: ['stops', 19.11, 19.36],
  t: ['stops', 22.78, 23.055],
  j: ['extended', 58.285, 58.395],
  ch: ['extended', 60.345, 60.685],
  h: ['extended', 62.195, 62.555],
  l: ['extended', 64.06, 64.52],
  n: ['extended', 66.18, 66.65],
  s: ['extended', 68.21, 68.75],
  v: ['extended', 70.36, 70.82],
  y: ['extended', 75.555, 75.665],
  z: ['extended', 76.605, 77.0],
  sh: ['extended', 78.84, 79.39],
  th: ['extended', 80.86, 81.385],
  f: ['original', 8.255, 8.955],
  m: ['original', 9.56, 10.565],
  r: ['original', 10.905, 11.645],
  ng: ['extended', 84.26, 84.445],
  kw: ['extended', 85.86, 85.98],
  ks: ['extended', 88.18, 88.445],
  schwa: ['original', 16.21, 16.38],
};
const aliases = { ai: 'ay', eh: 'e', ah: 'o', uh: 'u', eye: 'igh', oh: 'oa', yoo: 'ue', qu: 'kw' };
const index = JSON.parse(fs.readFileSync('audio/index.json'));
const report = {
  version: 2,
  model: 'eleven_v4',
  voice: 'Roger - Laid-Back, Casual, Resonant',
  stability: 0.5,
  similarity: 0.75,
  playbackRate: 1,
  timeStretched: false,
  looped: false,
  sourceApproval:
    'User approved the original full review recordings and ant/book/web retry. Fresh stop cues address the subsequent audibility report and have not yet received individual listening approval. Cut boundaries require in-game listening review.',
  sources: {},
  sounds: {},
  letters: {},
  blends: [],
};
for (const [id, name] of Object.entries(sources))
  report.sources[id] = {
    file: root + name,
    sha256: crypto
      .createHash('sha256')
      .update(fs.readFileSync(root + name))
      .digest('hex'),
  };
function run(args) {
  const result = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
    windowsHide: true,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
}
function cut(key, [source, start, end], kind = 'phoneme') {
  assert.ok(end > start && end - start > 0.06, key);
  const file = `audio/eleven-${kind}-${key}-v${source === 'stops' ? 2 : 1}.ogg`,
    duration = end - start;
  const gain = source === 'stops' ? ',volume=1.5,alimiter=limit=0.85:level=false:latency=true' : '';
  run([
    '-i',
    root + sources[source],
    '-af',
    `atrim=start=${start}:end=${end},asetpts=PTS-STARTPTS${gain},afade=t=in:d=0.003,afade=t=out:st=${duration - 0.008}:d=0.008,apad=pad_dur=0.10`,
    '-ar',
    '24000',
    '-ac',
    '1',
    '-c:a',
    'libvorbis',
    '-q:a',
    '5',
    file,
  ]);
  return {
    file,
    source,
    start,
    end,
    playbackRate: 1,
    timeStretched: false,
    looped: false,
    ...(source === 'stops'
      ? {
          method:
            'Fresh naturally released consonant cue; full articulation retained, gain 1.5 with peak limiter',
          individualListeningVerified: false,
        }
      : {}),
  };
}
for (const [key, range] of Object.entries(cuts)) {
  report.sounds[key] = cut(key, range);
  index.clips['phoneme-eleven:' + key] = report.sounds[key].file;
}
// Fresh single-cue responses need no timestamp cuts at all.
const standaloneDir = '.elevenlabs-cache/standalone-phonics';
if (fs.existsSync(standaloneDir))
  for (const name of fs.readdirSync(standaloneDir).filter((n) => /^[a-z]+\.json$/.test(n))) {
    const source = JSON.parse(fs.readFileSync(`${standaloneDir}/${name}`)),
      token = source.token;
    assert.ok(
      cuts[token] && (source.independent || source.isolatedCue),
      'Unknown standalone sound',
    );
    const decoded = spawnSync(
      ffmpeg,
      ['-v', 'error', '-i', source.file, '-ar', '24000', '-ac', '1', '-f', 's16le', 'pipe:1'],
      { windowsHide: true },
    );
    assert.equal(decoded.status, 0, String(decoded.stderr));
    const seconds = decoded.stdout.length / 48000;
    assert.ok(seconds > 0.25 && seconds < 3, 'Invalid standalone duration');
    const gentle = /^\[gently\]/.test(source.text),
      gain = source.gain ?? (gentle ? 0.75 : 1.5),
      peakLimit = source.peakLimit ?? (gentle ? 0.6 : 0.85);
    const file = `audio/eleven-phoneme-${token}-v${source.revision ?? (gentle ? 4 : 3)}.ogg`;
    const pinned = fs.existsSync('audio/restored-qw.json')
      ? JSON.parse(fs.readFileSync('audio/restored-qw.json')).sounds[token]
      : null;
    if (!gentle && pinned?.sourceSha256 === source.sha256 && pinned.file === file)
      fs.copyFileSync(pinned.backup, file);
    else
      run([
        '-i',
        source.file,
        '-af',
        `volume=${gain},alimiter=limit=${peakLimit}:level=false:latency=true,apad=pad_dur=0.10`,
        '-ar',
        '24000',
        '-ac',
        '1',
        '-c:a',
        'libvorbis',
        '-q:a',
        '5',
        file,
      ]);
    report.sources[`standalone-${token}`] = { file: source.file, sha256: source.sha256 };
    report.sounds[token] = {
      file,
      source: `standalone-${token}`,
      start: 0,
      end: seconds,
      playbackRate: 1,
      timeStretched: false,
      looped: false,
      independent: !!source.independent,
      isolatedCue: !!source.isolatedCue,
      ...(source.excerpt ? { excerpt: source.excerpt } : {}),
      ...(source.contextWord ? { contextWord: source.contextWord } : {}),
      gain,
      peakLimit,
      style:
        source.style ?? (gentle ? 'gentle' : source.contextWord ? 'natural word context' : 'clear'),
      method: source.contextWord
        ? 'Natural unstressed vowel extracted from an ordinary word; edge fades, native timing, gain and peak limiter'
        : source.excerpt
          ? 'Whole isolated cue from approved Roger review; native timing, gain and peak limiter'
          : 'Complete single-cue response, no timestamp cutting; gain and peak limiter',
      individualListeningVerified: source.parentListeningVerified === true,
    };
    index.clips['phoneme-eleven:' + token] = file;
  }
for (const [key, target] of Object.entries(aliases)) {
  report.sounds[key] = { ...report.sounds[target], aliasOf: target };
  index.clips['phoneme-eleven:' + key] = report.sounds[key].file;
}
// Alphabet names are separate from the phonics sounds.
const letters = [
  [115.61, 116.045],
  [116.11, 116.52],
  [116.55, 117.02],
  [117.04, 117.67],
  [117.76, 118.16],
  [118.2, 118.6],
  [118.62, 119.095],
  [119.39, 119.805],
  [119.865, 120.23],
  [120.25, 120.615],
  [120.635, 121.18],
  [121.27, 121.645],
  [121.71, 122.04],
  [122.095, 122.425],
  [122.48, 122.765],
  [122.815, 123.215],
  [123.6, 123.94],
  [123.96, 124.3],
  [124.32, 124.81],
  [124.915, 125.22],
  [125.24, 125.65],
  [125.67, 126.06],
  [126.25, 126.87],
  [126.925, 127.35],
  [127.43, 127.82],
  [127.84, 128.385],
];
for (const [i, letter] of [...'abcdefghijklmnopqrstuvwxyz'].entries()) {
  report.letters[letter] = cut(letter, ['extended', ...letters[i]], 'letter');
  index.clips['letter-eleven:' + letter] = report.letters[letter].file;
}
// Build clusters from the isolated consonants, avoiding abbreviations such as
// Dr. being read as "doctor". Crossfade only; no loops or time stretching.
const words = JSON.parse(fs.readFileSync('content/words.json')).words;
for (const word of words)
  for (const blend of word.blends || []) {
    const tokens =
      blend.start === 0
        ? word.phonemes.slice(0, blend.text.length)
        : word.phonemes.slice(-blend.text.length);
    assert.ok(
      tokens.every((t) => report.sounds[t]),
      word.id,
    );
    const file = `audio/eleven-blend-${word.id}-${blend.text}-v1.ogg`;
    const inputs = tokens.flatMap((t) => ['-i', report.sounds[t].file]);
    const filters = tokens.map(
      (_, i) =>
        `[${i}:a]atrim=end=${report.sounds[tokens[i]].end - report.sounds[tokens[i]].start},asetpts=PTS-STARTPTS[a${i}]`,
    );
    let previous = 'a0';
    for (let i = 1; i < tokens.length; i++) {
      filters.push(`[${previous}][a${i}]acrossfade=d=0.008:c1=tri:c2=tri[j${i}]`);
      previous = 'j' + i;
    }
    filters.push(`[${previous}]apad=pad_dur=0.10[out]`);
    run([
      ...inputs,
      '-filter_complex',
      filters.join(';'),
      '-map',
      '[out]',
      '-ar',
      '24000',
      '-ac',
      '1',
      '-c:a',
      'libvorbis',
      '-q:a',
      '5',
      file,
    ]);
    index.clips[`blend-eleven:${word.id}:${blend.text}`] = file;
    report.blends.push({
      word: word.id,
      text: blend.text,
      tokens,
      file,
      playbackRate: 1,
      timeStretched: false,
      looped: false,
    });
  }
index.elevenLabs = {
  model: report.model,
  voice: report.voice,
  report: 'audio/elevenlabs-phonics.json',
};
fs.writeFileSync('audio/index.json', JSON.stringify(index, null, 2) + '\n');
fs.writeFileSync('audio/elevenlabs-phonics.json', JSON.stringify(report, null, 2) + '\n');
const section = (title, entries) =>
  `<h2>${title}</h2><div class="grid">${entries.map(([key, s]) => `<section><h3>${key}</h3><audio controls preload="none" src="${s.file}"></audio></section>`).join('')}</div>`;
fs.writeFileSync(
  'elevenlabs-review.html',
  `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Roger voice review</title><style>body{font:18px system-ui;max-width:1100px;margin:auto;padding:20px;background:#faf8f0;color:#183f3a}a{color:#075e61}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px}section{background:white;padding:12px;border-radius:12px}audio{width:100%}</style><a href="index.html">Back to the game</a><h1>Roger voice review</h1><p>Voice generated with <a href="https://elevenlabs.io">ElevenLabs</a>, Eleven v4, Roger. These clips play at their original speed. Sounds were cut from the approved review takes; blends join consonants with short crossfades. No looping or time stretching.</p><p>Source takes passed the parent's listening review. Individual cuts and assembled blends still benefit from listening in the activity. <strong>shortoo</strong> is the vowel in book; <strong>oo</strong> is the vowel in moon.</p>${section('Letter sounds', Object.entries(report.sounds))}${section('Letter names', Object.entries(report.letters))}${section(
    'Blends',
    report.blends.map((s) => [s.word + ' / ' + s.text, s]),
  )}</html>`,
);
console.log(
  `Published ${Object.keys(report.sounds).length} sounds, 26 letter names and ${report.blends.length} blend clips at native speed.`,
);
