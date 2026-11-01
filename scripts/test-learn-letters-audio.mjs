import {browserOptions} from './browser-config.mjs';
import fs from 'node:fs';import assert from 'node:assert/strict';
import {chromium} from '../tools/test-browser/node_modules/playwright/index.mjs';
const index=JSON.parse(fs.readFileSync('audio/index.json')).clips;
const browser=await chromium.launch({...browserOptions(),headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});await page.goto('http://127.0.0.1:4173');await page.waitForSelector('.activity-card');
 await page.evaluate(()=>{window.__audioFiles=[];SpeechService.prototype.play=async function(file){window.__audioFiles.push(file);return true;};SpeechService.prototype.fallback=async function(text){throw Error('Unexpected native fallback: '+text);};});
 await page.locator('.activity-card[data-mode="letters"]').click();await page.waitForSelector('[data-explore="a"]');
 for(const letter of 'abcdefghijklmnopqrstuvwxyz'){
  await page.evaluate(()=>window.__audioFiles=[]);await page.locator(`[data-explore="${letter}"]`).click();
  const examples=await page.locator('#explore .choices b').allTextContents();
  const keys=[`this is the letter ${letter}.`,...examples.map(w=>`${letter} is for ${w}.`)];
  await page.waitForFunction(n=>window.__audioFiles.length>=n,keys.length);
  const files=await page.evaluate(()=>window.__audioFiles);assert.deepEqual(files,keys.map(k=>index[k]),letter+' must select the complete introduction and example sentence recordings');
 }
 console.log('Real Learn Letters UI selects complete recorded sentences for all 26 keys and both vowel examples; no native voice fallback or separate is-for fragment playback.');
}finally{await browser.close();}
