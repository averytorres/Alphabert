import { browserOptions } from './browser-config.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { chromium } from '../tools/test-browser/node_modules/playwright/index.mjs';
import ffmpeg from '../tools/audio/node_modules/ffmpeg-static/index.js';
const root = process.cwd(),
  index = JSON.parse(fs.readFileSync('audio/index.json', 'utf8')),
  cache = path.join(root, '.phonics-timing-cache');
fs.mkdirSync(cache, { recursive: true });
if (index.phonicsSource?.startsWith('Contextual'))
  throw Error(
    'Use generate-reference-phonics.mjs for current phonics. This older script is for the superseded neural clips.',
  );
const stops = new Set(['b', 'd', 'g', 'k', 'p', 't', 'j', 'ch', 'qu', 'kw', 'ks']);
const saved = fs.existsSync('audio/phonics-timing.json')
  ? JSON.parse(fs.readFileSync('audio/phonics-timing.json', 'utf8')).timing
  : {};
const sources = Object.entries(index.clips)
  .filter(([k]) => k.startsWith('phoneme:'))
  .map(([key, file]) => ({
    key,
    file: file.includes('-extended-v1.')
      ? index.phonicsTiming?.[key]?.source || saved[key]?.source || file
      : file,
    target: stops.has(key.slice(8)) ? 0.48 : 0.7,
  }));
const browser = await chromium.launch({ ...browserOptions(), headless: true });
try {
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:4173');
  const decoded = await page.evaluate(async (sources) => {
    const context = new OfflineAudioContext(1, 24000, 24000),
      out = [];
    for (const source of sources) {
      const buffer = await context.decodeAudioData(await (await fetch(source.file)).arrayBuffer()),
        samples = buffer.getChannelData(0);
      let peak = 0;
      for (const s of samples) peak = Math.max(peak, Math.abs(s));
      let first = samples.findIndex((s) => Math.abs(s) > peak * 0.1),
        last = samples.length - 1;
      while (last > first && Math.abs(samples[last]) <= peak * 0.1) last--;
      const active = (last - first) / buffer.sampleRate;
      const start = Math.max(0, first - Math.round(0.025 * buffer.sampleRate)),
        end = Math.min(samples.length, last + Math.round(0.045 * buffer.sampleRate));
      const pcm = Array.from(samples.slice(start, end), (s) =>
        Math.round(Math.max(-1, Math.min(1, s)) * 32767),
      );
      out.push({ ...source, sampleRate: buffer.sampleRate, active, pcm });
    }
    return out;
  }, sources);
  const timing = {};
  for (const clip of decoded) {
    const pcm = Buffer.alloc(clip.pcm.length * 2);
    clip.pcm.forEach((s, i) => pcm.writeInt16LE(s, i * 2));
    const header = Buffer.alloc(44);
    header.write('RIFF');
    header.writeUInt32LE(36 + pcm.length, 4);
    header.write('WAVEfmt ', 8);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(1, 22);
    header.writeUInt32LE(clip.sampleRate, 24);
    header.writeUInt32LE(clip.sampleRate * 2, 28);
    header.writeUInt16LE(2, 32);
    header.writeUInt16LE(16, 34);
    header.write('data', 36);
    header.writeUInt32LE(pcm.length, 40);
    const token = clip.key.slice(8),
      input = path.join(cache, token + '.wav'),
      file = `audio/phoneme-${token}-extended-v1.ogg`;
    fs.writeFileSync(input, Buffer.concat([header, pcm]));
    let tempo = Math.min(1, clip.active / clip.target);
    const filters = [];
    while (tempo < 0.5) {
      filters.push('atempo=0.5');
      tempo /= 0.5;
    }
    filters.push('atempo=' + tempo.toFixed(6), 'volume=1.5');
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
        path.join(root, file),
      ],
      { encoding: 'utf8', windowsHide: true },
    );
    if (result.status !== 0) throw Error(result.stderr || 'Audio processing failed');
    index.clips[clip.key] = file;
    timing[clip.key] = { source: clip.file, activeBefore: clip.active, target: clip.target };
  }
  // Check the audio actually became longer; counting silence would not help.
  const checked = await page.evaluate(
    async (sources) => {
      const ctx = new OfflineAudioContext(1, 24000, 24000),
        out = [];
      for (const { key, file } of sources) {
        const b = await ctx.decodeAudioData(await (await fetch(file)).arrayBuffer()),
          a = b.getChannelData(0);
        let peak = 0;
        for (const n of a) peak = Math.max(peak, Math.abs(n));
        let first = a.findIndex((n) => Math.abs(n) > peak * 0.1),
          last = a.length - 1;
        while (last > first && Math.abs(a[last]) <= peak * 0.1) last--;
        out.push({ key, active: (last - first) / b.sampleRate, peak, duration: b.duration });
      }
      return out;
    },
    sources.map((s) => ({ key: s.key, file: index.clips[s.key] })),
  );
  for (const c of checked) {
    assert.ok(c.active >= 0.35, `${c.key}: still too brief (${c.active})`);
    assert.ok(c.peak > 0.05 && c.peak < 0.95, `${c.key}: silent/clipped`);
    timing[c.key].activeAfter = c.active;
    timing[c.key].duration = c.duration;
  }
  index.phonicsTimingVersion = 3;
  index.phonicsTiming = timing;
  fs.writeFileSync('audio/index.json', JSON.stringify(index, null, 2) + '\n');
  fs.writeFileSync(
    'audio/phonics-timing.json',
    JSON.stringify({ version: 3, timing }, null, 2) + '\n',
  );
  console.log(
    `Extended all ${checked.length} phonics recordings with pitch-preserving time stretch; active audio ${Math.min(...checked.map((c) => c.active)).toFixed(3)}–${Math.max(...checked.map((c) => c.active)).toFixed(3)} seconds, no clipping.`,
  );
  console.log(checked.filter((c) => ['phoneme:t', 'phoneme:d', 'phoneme:g'].includes(c.key)));
} finally {
  await browser.close();
}
