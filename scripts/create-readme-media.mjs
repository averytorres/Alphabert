// Generate GitHub-friendly README media from the game's existing robot and CSS.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from '../tools/test-browser/node_modules/playwright/index.mjs';
import ffmpeg from '../tools/audio/node_modules/ffmpeg-static/index.js';
import { browserOptions } from './browser-config.mjs';
const origin = process.env.PREVIEW_URL || 'http://127.0.0.1:4173',
  out = 'docs/images',
  work = 'test-results/readme-media';
fs.mkdirSync(out, { recursive: true });
fs.mkdirSync(work, { recursive: true });
const browser = await chromium.launch({ ...browserOptions(), headless: true });
function shell(content, style, body = '') {
  return `<!doctype html><meta charset="utf-8"><base href="${origin}/"><link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="bertie-animations.css"><style>${style}</style><body ${body}>${content}</body>`;
}
async function capture(page, name, width, height) {
  const folder = path.join(work, name);
  fs.mkdirSync(folder, { recursive: true });
  await page.setViewportSize({ width, height });
  await page.evaluate(() => document.fonts.ready);
  for (let n = 0; n < 40; n++) {
    await page.evaluate((time) => {
      for (const a of document.getAnimations()) {
        a.pause();
        a.currentTime = time;
      }
    }, n * 80);
    await page.screenshot({
      path: path.join(folder, `${String(n).padStart(3, '0')}.png`),
      animations: 'allow',
    });
  }
  fs.copyFileSync(path.join(folder, '000.png'), path.join(out, name + '.png'));
  const result = spawnSync(
    ffmpeg,
    [
      '-v',
      'error',
      '-y',
      '-framerate',
      '12.5',
      '-i',
      path.join(folder, '%03d.png'),
      '-filter_complex',
      '[0:v]split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle',
      '-loop',
      '0',
      path.join(out, name + '.gif'),
    ],
    { encoding: 'utf8', windowsHide: true },
  );
  if (result.status !== 0) throw Error(result.stderr);
  console.log(name + ': ' + fs.statSync(path.join(out, name + '.gif')).size + ' bytes');
}
try {
  const game = await browser.newPage({
    viewport: { width: 740, height: 360 },
    reducedMotion: 'no-preference',
  });
  await game.route('**/app.js', async (route) => {
    const r = await route.fetch();
    await route.fulfill({
      response: r,
      body: (await r.text()) + '\nwindow.__readmeMedia={start};',
    });
  });
  await game.goto(origin);
  await game.waitForSelector('.hero-art .robot');
  const robot = await game.locator('.hero-art .robot').evaluate((el) => el.outerHTML);
  const page = await browser.newPage({
    viewport: { width: 1200, height: 420 },
    reducedMotion: 'no-preference',
  });
  await page.setContent(
    shell(
      `<div class="banner"><div class="ring"></div><div class="copy"><div class="eyebrow-banner">LEARN · PLAY · GROW</div><div class="wordmark">alphabert<span>LITTLE WORD LAB</span></div><p>Small steps. Big discoveries.</p><div class="pills"><b>16 playful activities</b><b>106 picture words</b><b>27 melodies</b></div></div><div class="robot-wrap">${robot.replace('class="robot"', 'class="robot" data-reaction="kick-dance"')}</div><div class="tile tile-a">Aa</div><div class="tile tile-note">♫</div><div class="spark one">✦</div><div class="spark two">✦</div><div class="spark three">✧</div></div>`,
      `html,body{margin:0;width:1200px;height:420px;overflow:hidden}.banner{position:relative;height:420px;overflow:hidden;background:radial-gradient(circle at 80% 50%,#2d7563,#123e37 65%);color:#fff7df;font-family:'Trebuchet MS',sans-serif}.banner:after{content:'';position:absolute;inset:17px;border:1px solid #ffffff20;border-radius:24px;pointer-events:none}.copy{position:absolute;left:55px;top:45px;z-index:2}.eyebrow-banner{color:#d6efbc;font-size:14px;letter-spacing:5px;font-weight:800}.wordmark{font-size:87px;font-weight:900;letter-spacing:-5px;line-height:1.1;margin-top:13px}.wordmark span{display:block;letter-spacing:6px;font-size:23px;color:#f8cc59;margin-top:10px}.copy p{font-size:28px;color:#e2eddb;margin:23px 0}.pills{display:flex;gap:12px;margin-top:27px}.pills b{background:#ffffff12;border:1px solid #ffffff24;border-radius:30px;padding:10px 15px;font-size:14px;color:#fff5d8}.ring{position:absolute;left:795px;top:36px;width:346px;height:346px;border-radius:50%;border:1px solid #c9e8a84a;background:radial-gradient(circle,#d3edac25,#d3edac07)}.robot-wrap{position:absolute;left:870px;top:95px;transform:scale(1.1)}.robot{animation:none!important}.tile{position:absolute;display:grid;place-items:center;width:78px;height:78px;border-radius:21px;font-size:40px;font-weight:900;box-shadow:0 8px 0 #082f3030;animation:float 3.2s ease-in-out infinite}.tile-a{left:765px;top:57px;background:#fff6d9;color:#246451;transform:rotate(-12deg)}.tile-note{left:1090px;top:284px;background:#f8cc59;color:#164c42;animation-delay:-1.6s}.spark{position:absolute;color:#f8cc59}.one{left:1110px;top:58px;font-size:40px}.two{left:788px;top:310px;font-size:30px}.three{left:720px;top:190px;font-size:31px;color:#badfbc}@keyframes float{0%,100%{translate:0 0;rotate:-9deg}50%{translate:0 -10px;rotate:5deg}}`,
    ),
  );
  await capture(page, 'banner', 1200, 420);
  await page.setContent(
    shell(
      `<div class="card"><div class="dots"></div><div class="card-copy"><div class="eyebrow-banner">MEET YOUR ROBOT PAL</div><h1>Big moves.<br>Little giggles.</h1><p>Tap Bertie and see what happens.</p></div><div class="card-robot">${robot.replace('class="robot"', 'class="robot" data-reaction="cartwheel"')}</div><div class="card-star">✦</div></div>`,
      `html,body{margin:0;width:740px;height:360px;overflow:hidden}.card{position:relative;height:360px;background:#f6f4e8;border:2px solid #dce6d5;border-radius:24px;overflow:hidden;font-family:'Trebuchet MS',sans-serif;color:#183f3a}.card-copy{position:absolute;left:35px;top:65px;width:360px}.eyebrow-banner{font-size:12px;font-weight:800;letter-spacing:3px;color:#538565}h1{font-size:40px;line-height:1.1;margin:17px 0}p{font-size:17px;max-width:310px;line-height:1.5;color:#687d69}.dots{position:absolute;left:440px;top:12px;width:300px;height:330px;border-radius:50%;background:#e2ecd5}.card-robot{position:absolute;left:480px;top:69px}.robot{animation:none!important}.card-star{position:absolute;left:424px;top:45px;font-size:42px;color:#e4b43d}`,
    ),
  );
  await capture(page, 'bertie-dance', 740, 360);
  await game.waitForFunction(() => window.__readmeMedia);
  await game.evaluate(() => window.__readmeMedia.start('hangman'));
  await game.waitForSelector('.guess-preview');
  const markup = await game.locator('.app-shell').evaluate((el) => el.outerHTML);
  await page.setContent(
    shell(markup, 'body{margin:0;overflow:hidden}', `class="playing" data-activity="hangman"`),
  );
  await capture(page, 'animated-clue', 740, 360);
} finally {
  await browser.close();
}
