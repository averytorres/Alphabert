import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from '../tools/test-browser/node_modules/playwright/index.mjs';
import { browserOptions } from './browser-config.mjs';

const original = JSON.parse(fs.readFileSync('audio/index.json')).clips;
const catalog = JSON.parse(fs.readFileSync('audio/voices.json'));
// Exercise the complete selection flow without generating or claiming to review speech.
const alternative = Object.fromEntries(
  Object.keys(original).map((key, index) => [key, `audio/amelia/test-${index}.ogg`]),
);
catalog.voices.find((voice) => voice.id === 'amelia').available = true;
const browser = await chromium.launch({ ...browserOptions(), headless: true });
try {
  const context = await browser.newContext();
  await context.route('**/audio/voices.json', (route) => route.fulfill({ json: catalog }));
  await context.route('**/audio/amelia/index.json', (route) =>
    route.fulfill({ json: { clips: alternative } }),
  );
  await context.route('**/app.js', async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: (await response.text()).replace(
        'new window.SpeechService()',
        '(window.__voiceTest = new window.SpeechService())',
      ),
    });
  });
  await context.route('**/speech.js', async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body:
        (await response.text()) +
        `
      window.__voiceFiles = [];
      window.SpeechService.prototype.play = async function(file) {
        window.__voiceFiles.push(file);
        return true;
      };
    `,
    });
  });
  let page = await context.newPage();
  await page.goto('http://127.0.0.1:4173');
  await page.locator('#grownups').click();
  await page.locator('#voice-choice').selectOption('amelia');
  await page.waitForFunction(
    () => JSON.parse(localStorage.getItem('alphabert-prefs')).voice === 'amelia',
  );
  async function checkRouting() {
    const result = await page.evaluate(async () => {
      const speech = window.__voiceTest;
      window.__voiceFiles = [];
      await speech.say('Great job!');
      await speech.letter('a');
      await speech.phoneme('ng');
      await speech.blend({ id: 'frog' }, { text: 'fr' });
      await speech.word({ word: 'ant', audio: 'audio/wrong-speaker.ogg' });
      let missing = false;
      window.addEventListener('voice-recording-unavailable', () => (missing = true), {
        once: true,
      });
      await speech.say('An unrecorded custom sentence.');
      return { voice: speech.voice, files: window.__voiceFiles, missing };
    });
    assert.equal(result.voice, 'amelia');
    assert.equal(result.files.length, 5);
    assert.ok(result.files.every((file) => file.startsWith('audio/amelia/')));
    assert.equal(result.missing, true, 'Missing recordings do not switch to device TTS');
  }
  await checkRouting();
  await page.reload();
  await page.waitForSelector('.activities');
  await checkRouting();
  await page.close();
  page = await context.newPage();
  await page.goto('http://127.0.0.1:4173');
  await page.waitForSelector('.activities');
  await checkRouting();
  await page.locator('#grownups').click();
  assert.equal(await page.locator('#voice-choice').inputValue(), 'amelia');
  await page.locator('#voice-choice').selectOption('roger');
  await page.waitForFunction(
    () => JSON.parse(localStorage.getItem('alphabert-prefs')).voice === 'roger',
  );
  await page.reload();
  await page.waitForSelector('.activities');
  assert.equal(await page.evaluate(() => window.__voiceTest.voice), 'roger');
  await context.route('**/audio/amelia/index.json', (route) =>
    route.fulfill({ json: { clips: original } }),
  );
  await page.locator('#grownups').click();
  await page.locator('#voice-choice').selectOption('amelia');
  await page.waitForFunction(() =>
    document.querySelector('#settings-status').textContent.includes('another speaker'),
  );
  assert.equal(await page.locator('#voice-choice').inputValue(), 'roger');
  assert.equal(
    await page.evaluate(() => JSON.parse(localStorage.getItem('alphabert-prefs')).voice),
    'roger',
  );
  await context.route('**/audio/amelia/index.json', (route) =>
    route.fulfill({ json: { clips: alternative } }),
  );
  await page.evaluate(() => {
    const originalSet = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'alphabert-prefs') throw new Error('Storage unavailable');
      return originalSet.call(this, key, value);
    };
  });
  await page.locator('#voice-choice').selectOption('amelia');
  await page.waitForFunction(() =>
    document.querySelector('#settings-status').textContent.includes('Storage unavailable'),
  );
  assert.equal(await page.locator('#voice-choice').inputValue(), 'roger');
  assert.equal(await page.evaluate(() => window.__voiceTest.voice), 'roger');
  await page.reload();
  await page.waitForSelector('.activities');
  await page.locator('#grownups').click();
  await page.locator('#voice-choice').selectOption('amelia');
  await page.waitForFunction(
    () => JSON.parse(localStorage.getItem('alphabert-prefs')).voice === 'amelia',
  );
  await context.route('**/audio/amelia/index.json', (route) => route.fulfill({ status: 503 }));
  await page.reload();
  await page.waitForSelector('.error');
  assert.equal(
    await page.evaluate(() => JSON.parse(localStorage.getItem('alphabert-prefs')).voice),
    'amelia',
  );
  await page.evaluate(() => window.__voiceTest.say('Great job!'));
  assert.deepEqual(await page.evaluate(() => window.__voiceFiles), []);
  await page.locator('#grownups').click();
  await page.locator('#voice-choice').selectOption('roger');
  await page.waitForFunction(
    () => JSON.parse(localStorage.getItem('alphabert-prefs')).voice === 'roger',
  );
  await page.locator('#back').click();
  await page.waitForSelector('.activities');
  await context.close();
  console.log(
    'Voice choice persists across reload and closed/reopened pages; narration, names, sounds, blends and word audio stay with the chosen speaker; missing recordings never switch speakers. Synthetic routing fixture only, not an Amelia listening review.',
  );
} finally {
  await browser.close();
}
