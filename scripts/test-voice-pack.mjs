import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { chromium } from '../tools/test-browser/node_modules/playwright/index.mjs';
import { browserOptions } from './browser-config.mjs';

const catalog = JSON.parse(fs.readFileSync('audio/voices.json'));
const additionalVoices = catalog.voices.filter((voice) => voice.id !== 'roger' && voice.available);
assert.ok(additionalVoices.length > 0, 'No additional complete voice packs enabled');
for (const voice of additionalVoices) {
  const report = JSON.parse(fs.readFileSync(`audio/${voice.id}/report.json`));
  const index = JSON.parse(fs.readFileSync(voice.index)).clips;
  const roger = JSON.parse(fs.readFileSync('audio/roger-library.json'));
  assert.equal(report.complete, true);
  assert.equal(report.voiceId, voice.elevenlabsVoiceId);
  for (const phrase of roger.phrases)
    assert.ok(index[phrase.key], `Missing narration: ${phrase.key}`);
  for (const letter of 'abcdefghijklmnopqrstuvwxyz') assert.ok(index[`letter-eleven:${letter}`]);
  const originalPhonics = JSON.parse(fs.readFileSync('audio/elevenlabs-phonics.json'));
  for (const token of Object.keys(originalPhonics.sounds))
    assert.ok(index[`phoneme-eleven:${token}`]);
  for (const blend of originalPhonics.blends)
    assert.ok(index[`blend-eleven:${blend.word}:${blend.text}`]);
  const paths = new Set(report.recordings.map((recording) => recording.file));
  for (const [key, path] of Object.entries(index)) {
    assert.ok(path.startsWith(`audio/${voice.id}/`) && !path.includes('..'), key);
    assert.ok(paths.has(path), `Provenance required: ${key}`);
  }
  for (const recording of report.recordings) {
    assert.equal(recording.independent, true);
    assert.equal(recording.playbackRate, 1);
    assert.equal(recording.timeStretched, false);
    assert.equal(recording.looped, false);
    assert.equal(
      crypto.createHash('sha256').update(fs.readFileSync(recording.file)).digest('hex'),
      recording.outputSha256,
    );
  }
  const browser = await chromium.launch({ ...browserOptions(), headless: true });
  try {
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:4173');
    const decoded = await page.evaluate(async (recordings) => {
      const context = new OfflineAudioContext(1, 24000, 24000);
      for (const recording of recordings) {
        const response = await fetch(recording.file);
        if (!response.ok) throw new Error(`Missing ${recording.file}`);
        const audio = await context.decodeAudioData(await response.arrayBuffer());
        let sum = 0;
        let peak = 0;
        for (const sample of audio.getChannelData(0)) {
          if (!Number.isFinite(sample)) throw new Error(`Invalid samples: ${recording.file}`);
          sum += sample * sample;
          peak = Math.max(peak, Math.abs(sample));
        }
        if (Math.abs(audio.duration - recording.seconds) > 0.025)
          throw new Error(`Changed native duration: ${recording.file}`);
        if (Math.sqrt(sum / audio.length) < 0.001 || peak < 0.01 || peak > 1.01)
          throw new Error(`Bad signal: ${recording.file}`);
      }
      return recordings.length;
    }, report.recordings);
    await page.locator('#grownups').click();
    await page.locator('#voice-choice').selectOption(voice.id);
    await page.waitForFunction(
      (id) => JSON.parse(localStorage.getItem('alphabert-prefs')).voice === id,
      voice.id,
    );
    await page.reload();
    await page.waitForSelector('.activities');
    await page.locator('#grownups').click();
    assert.equal(await page.locator('#voice-choice').inputValue(), voice.id);
    assert.equal(await page.locator(`a[href="voice-review.html?voice=${voice.id}"]`).count(), 1);
    await page.goto(`http://127.0.0.1:4173/voice-review.html?voice=${voice.id}`);
    await page.waitForFunction(() => document.querySelectorAll('audio').length === 109);
    console.log(
      `${voice.name}: ${decoded} independent recordings decoded; all narration and 109 phonics mappings covered, hashes/native timing verified, real saved selector and review screen passed. Pronunciation listening is separate.`,
    );
  } finally {
    await browser.close();
  }
}
