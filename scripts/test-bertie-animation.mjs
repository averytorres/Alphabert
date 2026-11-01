import {browserOptions} from './browser-config.mjs';
import assert from 'node:assert/strict';import fs from 'node:fs';
import {chromium} from '../tools/test-browser/node_modules/playwright/index.mjs';
import {BERTIE_REACTIONS} from '../bertie-reactions.js';import {EXTRA_BERTIE_JOKES} from '../bertie-jokes.js';
assert.equal(EXTRA_BERTIE_JOKES.length,50);
const browser=await chromium.launch({...browserOptions(),headless:true});
try{
 const page=await browser.newPage({viewport:{width:1100,height:900},reducedMotion:'no-preference'});await page.goto('http://127.0.0.1:4173');await page.waitForSelector('[data-bertie]');
 const result=await page.evaluate(async({motions,jokes})=>{
  const root=document.querySelector('.hero-art [data-bertie]'),frames=[];
  for(const motion of motions){root.dataset.reaction=motion;void root.offsetWidth;const animations=root.getAnimations({subtree:true});if(!animations.length)throw Error('No animation '+motion);const poses=[];
   for(const time of [0,400,800,1200,1800,2400,3000]){for(const a of animations){a.pause();a.currentTime=time;}const actor=root.querySelector('.robot-performer'),r=root.getBoundingClientRect(),pose=getComputedStyle(actor).transform;poses.push(pose);const bounds=actor.getBoundingClientRect();if(bounds.width<40||bounds.height<40)throw Error('Vanishing robot '+motion);if(Math.abs(r.width-210)>1||Math.abs(r.height-235)>1)throw Error('Animated touch target '+motion);}
   if(new Set(poses).size<3)throw Error('No substantial body motion '+motion);frames.push({motion,poses:new Set(poses).size});
  }
  const {clips}=await(await fetch('audio/index.json')).json(),ctx=new OfflineAudioContext(1,24000,24000);for(const text of jokes){const audio=await ctx.decodeAudioData(await(await fetch(clips[text.toLowerCase()])).arrayBuffer());if(audio.duration<1||audio.duration>15)throw Error('Bad joke duration '+text);let peak=0;for(const n of audio.getChannelData(0))peak=Math.max(peak,Math.abs(n));if(peak<.01||!Number.isFinite(peak))throw Error('Silent joke '+text);}
  return frames;
 },{motions:[...new Set(BERTIE_REACTIONS.map(r=>r.motion))],jokes:EXTRA_BERTIE_JOKES});
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.hero-art .robot-performer').evaluate(el=>getComputedStyle(el).animationName),'none','System reduced motion stops full-body animation');
 fs.mkdirSync('test-results/bertie-dynamic',{recursive:true});fs.writeFileSync('test-results/bertie-dynamic/checks.json',JSON.stringify(result,null,2));
 console.log('All 12 full-body routines change poses while the touch target stays fixed; 50 new jokes decode; reduced motion respected.');
}finally{await browser.close();}
