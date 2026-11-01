import { browserOptions } from './browser-config.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { wordPicturePath } from '../word-pictures.js';
import { chromium } from '../tools/test-browser/node_modules/playwright/index.mjs';
const words = JSON.parse(fs.readFileSync('content/words.json')).words;
const illustrated = words.filter((w) => wordPicturePath(w));
assert.equal(illustrated.length, 25); // 24 replacements plus the existing sun.
assert.equal(
  wordPicturePath({ ...words.find((w) => w.id === 'plum'), emoji: '🍑' }),
  null,
  'Custom pictures take precedence',
);
assert.equal(wordPicturePath({ id: '../bad', emoji: 'x' }), null);
for (const word of illustrated) assert.ok(fs.existsSync(wordPicturePath(word)), word.id);
const browser = await chromium.launch({ ...browserOptions(), headless: true });
try {
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:4173');
  const failures = await page.evaluate(async (words) => {
    const { wordPicturePath } = await import('./word-pictures.js');
    const failed = [];
    for (const w of words) {
      const image = new Image();
      image.src = wordPicturePath(w);
      try {
        await image.decode();
        if (!image.naturalWidth) failed.push(w.id);
      } catch {
        failed.push(w.id);
      }
    }
    return failed;
  }, illustrated);
  assert.deepEqual(failures, []);
} finally {
  await browser.close();
}
console.log('All 25 bundled word pictures decode; custom picture overrides remain editable.');
