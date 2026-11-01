import { browserOptions } from './browser-config.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from '../tools/test-browser/node_modules/playwright/index.mjs';
import { CLUE_TEXT } from '../context-hints.js';
const index = JSON.parse(fs.readFileSync('audio/index.json')).clips;
const browser = await chromium.launch({ ...browserOptions(), headless: true });
try {
  const page = await browser.newPage();
  await page.route('**/app.js', async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body:
        (await response.text()) +
        '\nwindow.__narrationTest={start,hint,makeRound,get state(){return state},get words(){return wordBank}};',
    });
  });
  await page.route('**/speech.js', async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body:
        (await response.text()) +
        '\nwindow.__heard=[];window.SpeechService.prototype.play=async function(file){window.__heard.push(file);return true;};',
    });
  });
  await page.goto('http://127.0.0.1:4173');
  await page.waitForFunction(() => window.__narrationTest?.words?.length);
  for (let n = 0; n < 12; n++) {
    await page.evaluate(() => {
      window.__heard = [];
      window.__narrationTest.start('catch');
    });
    await page.waitForFunction(() => window.__heard.length >= 2);
    const initial = await page.evaluate(() => ({
      files: window.__heard,
      word: window.__narrationTest.state.word.word,
    }));
    assert.deepEqual(initial.files, [
      index['catch the letters in order to spell the word.'],
      index[initial.word],
    ]);
  }
  for (const [name, input] of [
    ['spellStart', ''],
    ['spellMiddle', 'f'],
    ['spellLast', 'fro'],
  ]) {
    await page.evaluate(() => window.__narrationTest.start('scramble'));
    await page.waitForTimeout(20);
    await page.evaluate((input) => {
      const t = window.__narrationTest;
      t.state.word = t.words.find((w) => w.id === 'frog');
      t.state.input = input;
      t.state.hints = 0;
      window.__heard = [];
      t.hint();
    }, input);
    await page.waitForFunction(() => window.__heard.length >= 2);
    assert.deepEqual(await page.evaluate(() => window.__heard), [
      index[CLUE_TEXT[name].toLowerCase()],
      index.frog,
    ]);
  }
  console.log(
    'Real speech routing: Letter Catch prompt + target word only across 12 rounds; all three Word Scramble first-Help variants play only their whole hint and target word.',
  );
} finally {
  await browser.close();
}
