import assert from 'node:assert/strict';
import { chromium } from '../tools/test-browser/node_modules/playwright/index.mjs';
import { browserOptions } from './browser-config.mjs';

// These keys/shapes are the format used by previously installed versions.
const saved = {
  'alphabert-progress': { stars: 17, played: { count: 2 } },
  'alphabert-prefs': {
    speech: false,
    rate: 0.7,
    motion: true,
    musicVolume: 0.5,
    feedbackVolume: 0.4,
  },
  'alphabert-custom': [
    {
      id: 'family-crab',
      word: 'crab',
      letter: 'c',
      emoji: '🦀',
      category: 'animals',
      phonemes: ['k', 'r', 'a', 'b'],
    },
  ],
};
const browser = await chromium.launch({ ...browserOptions(), headless: true });
try {
  const page = await browser.newPage();
  await page.addInitScript((values) => {
    for (const [key, value] of Object.entries(values))
      localStorage.setItem(key, JSON.stringify(value));
  }, saved);
  await page.goto('http://127.0.0.1:4173');
  await page.waitForSelector('.activities');
  assert.equal(await page.locator('#stars').textContent(), '★ 17');
  assert.equal(await page.locator('#sound').getAttribute('aria-label'), 'Turn voice on');
  assert.equal(
    await page.locator('body').evaluate((el) => el.classList.contains('reduce-motion')),
    true,
  );
  await page.locator('#grownups').click();
  assert.match(await page.locator('.settings').textContent(), /107 words ready to explore/);
  assert.equal(await page.locator('#voice-rate').inputValue(), '0.7');
  assert.equal(await page.locator('#answer-volume').inputValue(), '40');
  const values = await page.evaluate(
    (keys) => Object.fromEntries(keys.map((key) => [key, JSON.parse(localStorage.getItem(key))])),
    Object.keys(saved),
  );
  assert.deepEqual(values, saved);
  console.log(
    'Previously saved progress, preferences and custom words load without schema/key changes or data loss.',
  );
} finally {
  await browser.close();
}
