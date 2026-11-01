import assert from 'node:assert/strict';
import { chromium } from '../tools/test-browser/node_modules/playwright/index.mjs';
import { browserOptions } from './browser-config.mjs';
const browser = await chromium.launch({ ...browserOptions(), headless: true });
try {
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:4173');
  await page.locator('#grownups').click();
  assert.equal(await page.locator('#game-lock-section').isVisible(), false);
  await page.evaluate(() => {
    window.__pinned = false;
    window.__pinRequests = 0;
    window.AndroidGameLock = {
      isPinned: () => window.__pinned,
      toggle: () => window.__pinRequests++,
    };
    window.dispatchEvent(new Event('android-game-lock'));
  });
  const toggle = page.locator('#game-lock-toggle');
  assert.equal(await toggle.getAttribute('aria-pressed'), 'false');
  await toggle.click();
  assert.equal(await page.evaluate(() => window.__pinRequests), 1);
  // Requesting pinning is not success: only the native state confirms it.
  assert.equal(await toggle.getAttribute('aria-pressed'), 'false');
  await page.evaluate(() => {
    window.__pinned = true;
    window.dispatchEvent(new Event('android-game-lock'));
  });
  assert.equal(await toggle.getAttribute('aria-pressed'), 'true');
  await page.evaluate(() => window.dispatchEvent(new Event('androidback')));
  assert.equal(await page.locator('#grownups').isVisible(), true);
  await page.locator('#grownups').click();
  assert.equal(await toggle.getAttribute('aria-pressed'), 'true');
  await page.evaluate(() => {
    window.__pinned = false;
    window.dispatchEvent(new Event('android-game-lock'));
  });
  assert.equal(await toggle.getAttribute('aria-pressed'), 'false');
  console.log('PASS pinning controls, cancellation, native state refresh, and Back');
} finally {
  await browser.close();
}
