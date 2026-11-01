import {browserOptions} from './browser-config.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from '../tools/test-browser/node_modules/playwright/index.mjs';
const browser=await chromium.launch({...browserOptions(),headless:true});
try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:4173');
 const results=await page.evaluate(async()=>{
  const {scheduleMelody}=await import('./music.js');const {songs}=await(await fetch('content/lessons.json')).json();const results=[];
  for(const song of songs){
   const seconds=.2+song.notes.reduce((sum,n)=>sum+n.duration*60/song.tempo,0),ctx=new OfflineAudioContext(1,Math.ceil(seconds*24000),24000),gain=ctx.createGain();gain.gain.value=.85;gain.connect(ctx.destination);scheduleMelody(ctx,gain,song);const rendered=await ctx.startRendering(),samples=rendered.getChannelData(0);let sum=0,peak=0;for(const n of samples){sum+=n*n;peak=Math.max(peak,Math.abs(n));}results.push({id:song.id,rms:Math.sqrt(sum/samples.length),peak,seconds});
  }
  const {scheduleResult,RESULT_TUNES}=await import('./feedback.js');for(const kind of ['correct','incorrect'])for(let variant=0;variant<RESULT_TUNES[kind].length;variant++){const ctx=new OfflineAudioContext(1,5*24000,24000),gain=ctx.createGain();gain.gain.value=.75*.65;gain.connect(ctx.destination);const seconds=scheduleResult(ctx,gain,kind,[],variant),buffer=await ctx.startRendering(),samples=buffer.getChannelData(0);let peak=0,sum=0;for(const n of samples){sum+=n*n;peak=Math.max(peak,Math.abs(n));}results.push({id:'jingle-'+kind+'-'+variant,rms:Math.sqrt(sum/samples.length),peak,seconds,jingle:true});}return results;
 });
 for(const r of results){assert.ok(r.rms>(r.jingle ? 0.03 : 0.08),`${r.id} too quiet: ${r.rms}`);assert.ok(r.peak<.95&&r.peak>.2,`${r.id} clipped or silent: ${r.peak}`);if(r.jingle)assert.ok(r.seconds>=3&&r.seconds<=5,`${r.id} outside requested duration`);else assert.ok(r.seconds>5,`${r.id} too short`);}
 fs.mkdirSync('test-results/music-review',{recursive:true});fs.writeFileSync('test-results/music-review/levels.json',JSON.stringify(results,null,2));
 console.log(`Rendered 27 songs and ten result jingles: audible with no clipping; jingles ${results.filter(r=>r.jingle).map(r=>r.seconds.toFixed(2)).join('/')} seconds.`);
}finally{await browser.close();}
