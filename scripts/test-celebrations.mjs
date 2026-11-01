import {browserOptions} from './browser-config.mjs';
import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {CELEBRATIONS,CelebrationPicker} from '../celebrations.js';
import {chromium} from '../tools/test-browser/node_modules/playwright/index.mjs';
const picker=new CelebrationPicker(),sequence=Array.from({length:120},()=>picker.next());
for(let i=0;i<sequence.length;i++){if(i)assert.notEqual(sequence[i],sequence[i-1]);if(i%6===0)assert.equal(new Set(sequence.slice(i,i+6)).size,6);}
await fs.mkdir('test-results/celebrations',{recursive:true});
const browser=await chromium.launch({...browserOptions(),headless:true});
try{
 const page=await browser.newPage({viewport:{width:740,height:360},reducedMotion:'no-preference'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173');await page.locator('[data-mode="count"]').click();const seen=[];
 const solve=async()=>{const n=await page.locator('.count-objects>span').count();await page.locator(`[data-answer="${n}"]`).click();};
 for(let i=0;i<6;i++){
  await solve();const kind=await page.locator('#confetti').getAttribute('data-celebration');seen.push(kind);assert.ok(CELEBRATIONS.includes(kind));
  await page.waitForTimeout(650);
  assert.ok(await page.locator('#confetti i').evaluateAll(nodes=>nodes.some(n=>{const s=getComputedStyle(n);return s.display!=='none'&&Number(s.opacity)>.1;})),kind+' visibly animates');
  assert.ok(await page.locator('#next').evaluate(button=>{const r=button.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===button;}),'Celebration cannot intercept Next');
  await page.screenshot({path:`test-results/celebrations/${kind}.png`});
  await page.locator('#next').click();assert.equal(await page.locator('#confetti>*').count(),0,'Next clears old effects');
 }
 assert.equal(new Set(seen).size,6,'Six wins use all six celebrations');
 await solve();await page.waitForTimeout(2900);assert.equal(await page.locator('#confetti>*').count(),0,'Effects clean themselves up');
 await page.locator('#next').click();await page.emulateMedia({reducedMotion:'reduce'});await solve();assert.equal(await page.locator('#confetti>*').count(),0,'System reduced motion suppresses effects');
 await page.locator('#grownups').click();await page.locator('#motion').selectOption('true');await page.locator('#back').click();await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('[data-mode="count"]').click();await solve();assert.equal(await page.locator('#confetti>*').count(),0,'In-game reduced motion suppresses effects');
 assert.deepEqual(errors,[]);console.log('Celebrations passed: six distinct rendered effects, shuffled cycles/no repeats, visible animation, unblocked buttons, cleanup and both reduced-motion settings.');
}finally{await browser.close();}
