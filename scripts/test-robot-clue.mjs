import { browserOptions } from './browser-config.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from '../tools/test-browser/node_modules/playwright/index.mjs';
const index = JSON.parse(fs.readFileSync('audio/index.json')).clips,
  hint = index["watch the picture closely. it's your clue!"];
assert.ok(hint, 'New reminder must have offline Roger speech');
const browser = await chromium.launch({ ...browserOptions(), headless: true });
try {
  const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      reducedMotion: 'no-preference',
    }),
    errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/app.js', async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body:
        (await response.text()) +
        '\nwindow.__robotTest={start,guess,hint,get state(){return state}};',
    });
  });
  await page.route('**/speech.js', async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body:
        (await response.text()) +
        `\nwindow.__heard=[];window.SpeechService.prototype.play=async function(file){window.__heard.push(file);if(file===${JSON.stringify(hint)}&&window.__clueHold)await window.__clueHold;return true;};`,
    });
  });
  await page.goto('http://127.0.0.1:4173');
  await page.waitForFunction(() => window.__robotTest);
  await page.evaluate(() => {
    window.__clueHold = new Promise((r) => (window.__releaseClue = r));
    window.__robotTest.start('hangman');
  });
  await page.waitForFunction(() => window.__heard.length > 0);
  const word = await page.evaluate(() => window.__robotTest.state.word.word);
  assert.deepEqual(await page.evaluate(() => window.__heard), [hint]);
  assert.equal(await page.locator('.guess-preview [data-word-say]').count(), 0);
  assert.equal(await page.locator('[data-guess]:disabled').count(), 26);
  await page.waitForTimeout(2450);
  assert.equal(
    await page.evaluate(() => window.__robotTest.state.guessPreview),
    true,
    'Keep showing clue until speech finishes',
  );
  assert.equal(
    await page
      .locator('.guess-clue-picture')
      .evaluate((el) => getComputedStyle(el).animationIterationCount),
    'infinite',
  );
  await page.keyboard.press('a');
  assert.deepEqual(await page.evaluate(() => window.__robotTest.state.used), []);
  fs.mkdirSync('test-results/robot-clue', { recursive: true });
  await page.screenshot({ path: 'test-results/robot-clue/portrait.png' });
  await page.setViewportSize({ width: 740, height: 360 });
  await page.screenshot({ path: 'test-results/robot-clue/landscape.png' });
  await page.evaluate(() => {
    window.__releaseClue();
    window.__clueHold = null;
  });
  await page.waitForFunction(() => !window.__robotTest.state.guessPreview);
  assert.deepEqual(await page.evaluate(() => window.__heard), [
    hint,
    index['guess the word. choose a letter.'],
  ]);
  await page.locator('#repeat').click();
  await page.locator('[data-robot-clue]').click();
  await page.waitForFunction(() => !window.__robotTest.state.guessPreview);
  assert.ok(
    !(await page.evaluate(() => window.__heard)).includes(index[word]),
    'Picture/replay must not name answer',
  );
  const wrong = [...'abcdefghijklmnopqrstuvwxyz'].filter((c) => !word.includes(c));
  await page.evaluate((c) => {
    window.__heard = [];
    window.__robotTest.guess(c);
  }, wrong[0]);
  await page.waitForFunction((file) => window.__heard.includes(file), index["let's try again."], {
    timeout: 10000,
  });
  assert.ok(
    !(await page.evaluate(() => window.__heard)).includes(index[word]),
    'Wrong guess must not reveal word',
  );
  await page.evaluate(
    (chars) => {
      window.__heard = [];
      for (const c of chars) window.__robotTest.guess(c);
    },
    wrong.slice(1, 10),
  );
  await page.waitForFunction((file) => window.__heard.includes(file), index[word], {
    timeout: 15000,
  });
  assert.equal(
    await page.evaluate(() => window.__robotTest.state.chances),
    0,
    'Word reveal remains available after loss',
  );
  assert.deepEqual(errors, []);
  console.log(
    'Robot clue: whole reminder only; animation waits for speech, picture/replay and wrong guesses do not name answer, keys locked during preview, loss still reveals word.',
  );
} finally {
  await browser.close();
}
