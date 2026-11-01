import { browserOptions } from './browser-config.mjs';
import assert from 'node:assert/strict';
import { chromium } from '../tools/test-browser/node_modules/playwright/index.mjs';
const browser = await chromium.launch({
  ...browserOptions(),
  headless: true,
  args: ['--autoplay-policy=no-user-gesture-required'],
});
try {
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:4173');
  await page.waitForSelector('.activity-card');
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.screenshot({ path: 'test-results/preview-desktop.png', fullPage: true });
  const result = await page.evaluate(async () => {
    const index = await (await fetch('audio/index.json')).json();
    const samples = ['a is for ant.', 'a is for ape.', 'letter:a', 'phoneme:a', 'phoneme:sh'];
    const results = [];
    for (const key of samples) {
      const audio = new Audio(index.clips[key]);
      results.push(
        await new Promise((resolve) => {
          let began = false;
          const timer = setTimeout(() => resolve({ key, error: 'timeout' }), 12000);
          audio.onplaying = () => (began = true);
          audio.onerror = () => {
            clearTimeout(timer);
            resolve({ key, error: 'decode/playback' });
          };
          audio.onended = () => {
            clearTimeout(timer);
            resolve({ key, began, duration: audio.duration });
          };
          audio.play().catch((e) => {
            clearTimeout(timer);
            resolve({ key, error: e.message });
          });
        }),
      );
    }
    const ctx = new OfflineAudioContext(1, 24000, 24000);
    let decoded = 0;
    for (const [key, file] of Object.entries(index.clips).filter(
      ([k]) =>
        k.startsWith('phoneme:') ||
        k.startsWith('letter:') ||
        k.startsWith('word-phoneme:') ||
        k.startsWith('phoneme-clear:') ||
        k.startsWith('phoneme-natural:'),
    )) {
      const buffer = await ctx.decodeAudioData(await (await fetch(file)).arrayBuffer());
      const samples = buffer.getChannelData(0);
      let peak = 0;
      for (const sample of samples) {
        if (!Number.isFinite(sample)) throw Error('Nonfinite audio ' + key);
        peak = Math.max(peak, Math.abs(sample));
      }
      if (peak < 0.005) throw Error('Silent sound ' + key);
      if (key.startsWith('phoneme:')) {
        let first = samples.findIndex((s) => Math.abs(s) > peak * 0.1),
          last = samples.length - 1;
        while (last > first && Math.abs(samples[last]) <= peak * 0.1) last--;
        const active = (last - first) / buffer.sampleRate;
        if (active < 0.015 || peak > 0.95)
          throw Error(
            'Phoneme too short or clipped: ' + key + ' ' + JSON.stringify({ active, peak }),
          );
      }
      decoded++;
    }
    const heldReport = await (await fetch('audio/phonics-held.json')).json();
    for (const [token, entry] of Object.entries(heldReport.sounds)) {
      if (index.clips['phoneme-held:' + token] !== entry.file)
        throw Error('Wrong held mapping ' + token);
      if (entry.sustained) {
        const buffer = await ctx.decodeAudioData(await (await fetch(entry.file)).arrayBuffer());
        const data = buffer.getChannelData(0);
        let peak = 0;
        for (const n of data) peak = Math.max(peak, Math.abs(n));
        let a = data.findIndex((n) => Math.abs(n) > peak * 0.1),
          b = data.length - 1;
        while (b > a && Math.abs(data[b]) < peak * 0.1) b--;
        if ((b - a) / buffer.sampleRate < 0.7 || peak > 0.95 || !Number.isFinite(peak))
          throw Error('Bad held sound ' + token);
      }
    }
    const blendReport = await (await fetch('audio/blend-reference.json')).json();
    for (const entry of blendReport) {
      const buffer = await ctx.decodeAudioData(await (await fetch(entry.file)).arrayBuffer());
      let peak = 0;
      for (const n of buffer.getChannelData(0)) peak = Math.max(peak, Math.abs(n));
      if (!Number.isFinite(peak) || peak < 0.005 || peak > 0.95)
        throw Error('Bad blend ' + entry.word + '/' + entry.blend);
    }
    const voice = new SpeechService();
    const states = [];
    const listener = (e) => states.push(e.detail);
    window.addEventListener('speech-state', listener);
    await voice.say('ant');
    await voice.phoneme('sh', { held: true });
    window.removeEventListener('speech-state', listener);
    return { results, states, decoded };
  });
  for (const r of result.results) {
    assert.equal(r.error, undefined, JSON.stringify(r));
    assert.ok(r.began && r.duration > 0, JSON.stringify(r));
  }
  assert.deepEqual(result.states, [false, true, false, false, true, false]);
  assert.equal(result.decoded, 140);
  console.log(
    'Real browser playback passed; all 26 letter names, 52 phoneme clips six insect sounds 52 clear sound clips and four human recordings decoded with non-silent finite samples. Phoneme playback completes at its native rate.',
  );
} finally {
  await browser.close();
}
