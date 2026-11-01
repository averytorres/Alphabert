import {browserOptions} from './browser-config.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from '../tools/test-browser/node_modules/playwright/index.mjs';
import {MENU_HELP} from '../menu-help.js';
import {BERTIE_REACTIONS} from '../bertie-reactions.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.wav':'audio/wav'};
const server=http.createServer(async(req,res)=>{try {
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  let body=await fs.readFile(file);
  if(pathname==='/app.js') body=Buffer.from(body.toString()+ '\nwindow.__gameTest={get state(){return state},get roundToken(){return roundToken},get progress(){return progress},get words(){return words},start,makeRound};');
  if(pathname==='/speech.js') body=Buffer.from(`window.__speechCalls=[];window.SpeechService=class {constructor(){this.enabled=true;this.rate=.85;this.serial=0;}stop(){this.serial++;}async say(text){window.__lastSpeech=String(text);window.__speechCalls.push({kind:'say',text,time:performance.now()});if(window.__speechHold)await window.__speechHold;}async word(word){window.__lastSpeech=word.word;window.__speechCalls.push({kind:'word',text:word.word});}async letter(text){window.__lastSpeech=String(text);window.__speechCalls.push({kind:'letter',text,time:performance.now()});}async phoneme(text,options){window.__lastSpeech=String(text);window.__speechCalls.push({kind:'phoneme',text,options,time:performance.now()});}async blend(word,blend){window.__speechCalls.push({kind:'blend',text:blend.text,word:word.id,time:performance.now()});}async play(){return true;}};`);
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(body);
}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({...browserOptions(),headless:true});
const errors=[];
const page=await browser.newPage({viewport:{width:1280,height:900},reducedMotion:'reduce'});
page.on('pageerror',e=>errors.push(e.message));
const url=`http://127.0.0.1:${server.address().port}/`;
const state=()=>page.evaluate(()=>structuredClone(window.__gameTest.state));
const start=async mode=>{await page.evaluate(m=>window.__gameTest.start(m),mode);await page.waitForSelector('#play');if(mode==='hangman')await page.waitForFunction(()=>!window.__gameTest.state.guessPreview);};
const feedback=()=>page.locator('#feedback').textContent();
const answer=async value=>page.locator(`[data-answer="${value}"]`).click();
await fs.mkdir(path.join(root,'test-results'),{recursive:true});
try {
  await page.goto(url);await page.waitForSelector('.activity-card');
  assert.equal(await page.locator('.activity-card').count(),16);
  assert.equal(await page.locator('.activity-card .picture-icon').count(),16,'every activity has a bundled picture');
  assert.ok(await page.locator('.activity-card').evaluateAll(cards=>cards.every(card=>{const art=card.querySelector('.picture-icon').getBoundingClientRect(),title=card.querySelector('strong').getBoundingClientRect();return art.bottom<=title.top+1;})),'activity pictures stay above their labels');
  assert.equal(await page.locator('#home [data-icon="home"]').count(),1);
  assert.equal(await page.locator('#grownups [data-icon="grownups"]').count(),1);
  await page.evaluate(()=>{const random=Math.random;try{Math.random=()=>.999;document.querySelector('.hero [data-mode="random"]').click();}finally{Math.random=random;}});
  assert.equal((await state()).mode,'songs','Let’s play chooses from the activity list rather than always opening letters');
  await page.locator('#home').click();
  await start('order');
  for(const [control,picture] of [['hint','help'],['repeat','hear'],['next','next'],['back','home']])assert.equal(await page.locator(`#${control} [data-icon="${picture}"]`).count(),1,control+' has a picture');
  const timingState=await state();
  const wrongChoice=await page.locator('[data-answer]').evaluateAll((bs,right)=>bs.map(b=>b.dataset.answer).find(v=>v!==right),timingState.answer);
  await page.evaluate(()=>window.__speechCalls=[]);
  await answer(wrongChoice);await page.waitForTimeout(600);
  assert.equal(await page.evaluate(()=>window.__speechCalls.length),0,'speech waits for the try-again tune');
  await page.waitForTimeout(3100);
  assert.ok(await page.evaluate(()=>window.__speechCalls.some(c=>c.text==="Let's try again.")),'spoken feedback follows the tune');
  await answer(timingState.answer);await page.evaluate(()=>window.__speechCalls=[]);
  await start('songs');await page.evaluate(()=>window.__speechCalls=[]);await page.waitForTimeout(3700);
  assert.equal(await page.evaluate(()=>window.__speechCalls.length),0,'navigation cancels queued result speech');
  await start('order');
  await page.evaluate(()=>{window.__speechHold=new Promise(resolve=>window.__releaseSpeech=resolve);});
  await answer((await state()).answer);await page.waitForTimeout(5100);
  assert.equal((await state()).solved,true,'Auto-next waits for spoken feedback to finish');
  await page.evaluate(()=>{window.__releaseSpeech();window.__speechHold=null;});await page.waitForTimeout(1350);
  assert.equal((await state()).solved,false,'Completed round automatically advances after speech and a short pause');
  await answer((await state()).answer);await page.locator('#next').click();
  const manualToken=await page.evaluate(()=>window.__gameTest.roundToken);await page.waitForTimeout(4900);
  assert.equal(await page.evaluate(()=>window.__gameTest.roundToken),manualToken,'Manual Next cancels the old automatic transition');
  await page.locator('#home').click();
  await page.screenshot({path:path.join(root,'test-results/home-desktop.png'),fullPage:true});
  await page.evaluate(()=>window.__gameTest.start('hangman'));const preview=await state();assert.equal(preview.guessPreview,true);assert.equal(await page.locator('.guess-preview [data-word-say]').count(),0);assert.equal(await page.locator('.guess-preview [data-robot-clue]').count(),1);assert.equal(await page.locator('[data-guess]:disabled').count(),26);await page.keyboard.press('a');assert.deepEqual((await state()).used,[],'No guesses consumed while showing the clue');await page.waitForFunction(()=>!window.__gameTest.state.guessPreview);assert.equal(await page.locator('.guess-preview').count(),0);assert.equal(await page.locator('[data-guess]:not(:disabled)').count(),26);await page.keyboard.press(preview.word.word[0]);const beforeReplay=await state();await page.locator('#repeat').click();assert.equal((await state()).guessPreview,true);assert.deepEqual((await state()).used,beforeReplay.used);assert.equal((await state()).chances,beforeReplay.chances);await page.locator('#back').click();assert.equal(await page.locator('.guess-preview').count(),0);
  const bertie=page.locator('.hero-art [data-bertie]');await bertie.click();const firstReaction=await bertie.getAttribute('data-reaction-id');assert.ok(BERTIE_REACTIONS.some(r=>r.id===firstReaction));assert.equal((await state()).mode,undefined);assert.ok(await page.evaluate(()=>window.__speechCalls.some(c=>c.kind==='say'&&c.text===window.__gameTest.state.spoken)),'Home robot speaks');await bertie.click();assert.equal(await bertie.getAttribute('data-reaction-id'),firstReaction,'Rapid taps are debounced');await page.waitForTimeout(520);await bertie.focus();await page.keyboard.press('Enter');assert.notEqual(await bertie.getAttribute('data-reaction-id'),firstReaction,'Keyboard plays a different reaction');
  await start('letters');await page.evaluate(()=>window.__speechCalls=[]);await page.waitForTimeout(520);await page.locator('.companion [data-bertie]').click();assert.equal((await state()).mode,'letters');assert.ok(await page.evaluate(()=>window.__speechCalls.some(c=>c.kind==='say'&&c.text===window.__gameTest.state.spoken)),'Idle in-game robot speaks a reaction');
  await page.waitForTimeout(520);await page.evaluate(()=>{window.__speechCalls=[];window.dispatchEvent(new CustomEvent('speech-state',{detail:true}));});await page.locator('.companion [data-bertie]').click();assert.deepEqual(await page.evaluate(()=>window.__speechCalls),[],'Existing speech keeps priority over a robot tap');assert.equal(await page.locator('.companion [data-bertie][data-reaction]').count(),1,'Busy robot still reacts visually');await page.evaluate(()=>window.dispatchEvent(new CustomEvent('speech-state',{detail:false})));
  await page.waitForTimeout(520);await start('words');await page.locator('[data-explore="a"]').click();await page.evaluate(()=>window.__speechCalls=[]);await page.locator('.companion [data-bertie]').click();assert.deepEqual(await page.evaluate(()=>window.__speechCalls),[],'Robot stays silent between sounds in a narration sequence');await page.locator('#back').click();assert.equal(await page.locator('[data-reaction]').count(),0,'Navigation clears reaction animation');
  for(const [id,text] of Object.entries(MENU_HELP)){
    const button=page.locator(`button[data-mode="${id}"]`);await button.scrollIntoViewIfNeeded();await page.waitForTimeout(60);const box=await button.boundingBox();await page.evaluate(()=>window.__speechCalls=[]);await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(600);await page.mouse.up();assert.equal((await state()).mode,undefined,'Hold describes without opening');assert.deepEqual(await page.evaluate(()=>window.__speechCalls.map(c=>c.text)),[text],id+' speaks one child-friendly description');
  }
  await page.locator('[data-mode="letters"]').scrollIntoViewIfNeeded();await page.waitForTimeout(60);
  const heldCard=page.locator('[data-mode="letters"]');await page.evaluate(()=>window.__speechCalls=[]);await heldCard.dispatchEvent('pointerdown',{pointerId:44,isPrimary:true,button:0,clientX:20,clientY:20});await heldCard.dispatchEvent('pointermove',{pointerId:44,clientX:20,clientY:50});await page.waitForTimeout(600);assert.deepEqual(await page.evaluate(()=>window.__speechCalls),[],'Scrolling movement cancels hold');
  await heldCard.dispatchEvent('pointerdown',{pointerId:45,isPrimary:true,button:0,clientX:20,clientY:20});await heldCard.dispatchEvent('pointercancel',{pointerId:45});await page.waitForTimeout(600);assert.deepEqual(await page.evaluate(()=>window.__speechCalls),[],'Touch cancellation cancels hold');
  await heldCard.click();assert.equal((await state()).mode,'letters','Normal tap still opens the activity');await page.locator('#back').click();await heldCard.focus();await page.keyboard.press('Enter');assert.equal((await state()).mode,'letters','Keyboard activation still opens the activity');await page.locator('#back').click();
  for(const mode of ['letters','sounds','words']) {
    await start(mode);await page.locator('[data-explore="a"]').click();await page.waitForTimeout(20);
    assert.ok((await page.locator('#explore').textContent()).trim().length>0);
    await page.locator('#repeat').click();await page.locator('#hint').click();
  }
  await page.evaluate(()=>window.__speechCalls=[]);await start('vowels');const vowelWord=(await state()).word.word;
  const vowelPrompt=`Find the missing vowel in ${vowelWord}.`;assert.ok(await page.evaluate(text=>window.__speechCalls.some(c=>c.text===text),vowelPrompt));
  assert.equal(await page.locator('#play .prompt').textContent(),'Find the missing vowel.','Visual prompt must not reveal the complete spelling');
  await page.evaluate(()=>window.__speechCalls=[]);await page.locator('#repeat').click();assert.deepEqual(await page.evaluate(()=>window.__speechCalls.map(c=>c.text)),[vowelPrompt],'Replay speaks one complete sentence without repeating the word separately');
  for(const mode of ['letters','order','sounds','words','missing','vowels','rhymes','blends','groups','scramble','search','catch','hangman','memory','count','songs']){
    await start(mode);if(['letters','sounds','words'].includes(mode))await page.locator('[data-explore="u"]').click();if(mode==='memory')await page.waitForFunction(()=>!window.__gameTest.state.listening);const before=await state(),choices=await page.locator('[data-answer]:not(:disabled)').count();await page.evaluate(()=>window.__speechCalls=[]);await page.locator('#hint').click();const after=await state();for(const key of ['answer','input','used','count','index','found','searchPath','sequence','chances'])assert.deepEqual(after[key],before[key],mode+' first Help preserves '+key);assert.equal(after.solved,before.solved,mode+' first Help never solves');assert.equal(await page.locator('[data-answer]:not(:disabled)').count(),choices,mode+' first Help leaves answer choices');assert.equal(await page.locator('[data-answer].hint-target').count(),0,mode+' no correct answer highlighted');assert.ok((await feedback()).length>0,mode+' has contextual guidance');if(['missing','vowels','blends','memory','hangman'].includes(mode))assert.equal(await page.evaluate(()=>window.__speechCalls.filter(c=>c.kind==='phoneme').length),0,mode+' first Help does not speak the answer sound');if(mode==='hangman')assert.ok(!await page.evaluate(word=>window.__speechCalls.some(c=>c.text===word),before.word.word));
  }
  await start('letters');await page.locator('[data-explore="a"]').click();await page.waitForTimeout(20);
  for(const id of ['ant','ape']){await page.evaluate(()=>window.__speechCalls=[]);await page.locator(`[data-word-say="${id}"]`).click();assert.deepEqual(await page.evaluate(()=>window.__speechCalls.map(c=>c.text)),[id],'Picture speaks only its own word');assert.equal((await state()).lastLetter,'a','Picture tap keeps the selected letter');}
  await page.locator('[data-word-say="ape"]').focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>window.__lastSpeech),'ape','Picture supports keyboard activation');
  await start('sounds');await page.locator('[data-explore="u"]').click();
  for(const sound of ['u','yoo']){await page.evaluate(()=>window.__speechCalls=[]);await page.locator(`[data-letter-sound="${sound}"]`).click();assert.deepEqual(await page.evaluate(()=>window.__speechCalls.map(c=>[c.kind,c.text,c.options?.held])),[['phoneme',sound,true]],'Letter Sounds picture replays only its matching held sound');assert.equal((await state()).lastLetter,'u');}
  await page.locator('[data-letter-sound="yoo"]').focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>window.__lastSpeech),'yoo');await page.evaluate(()=>window.__speechCalls=[]);await page.waitForTimeout(650);assert.deepEqual(await page.evaluate(()=>window.__speechCalls),[],'Picture tap cancels remaining automatic narration');
  await start('sounds');await page.evaluate(()=>window.__speechCalls=[]);await page.locator('[data-explore="e"]').click();await page.waitForFunction(()=>window.__speechCalls.some(c=>c.kind==='phoneme'&&c.text==='ee'));const eSteps=await page.evaluate(()=>window.__speechCalls);assert.equal(eSteps.find(c=>c.kind==='letter').text,'e');assert.ok(eSteps.findIndex(c=>c.text==='Short sound.')<eSteps.findIndex(c=>c.kind==='phoneme'&&c.text==='e'));assert.ok(eSteps.findIndex(c=>c.text==='Long sound.')<eSteps.findIndex(c=>c.kind==='phoneme'&&c.text==='ee'));
  await start('words');await page.locator('[data-explore="l"]').click();assert.equal((await state()).word.id,'log');
  for(const [index,sound] of [[0,'l'],[1,'aw'],[2,'g']]){await page.evaluate(()=>window.__speechCalls=[]);await page.locator(`[data-sound-index="${index}"]`).click();assert.deepEqual(await page.evaluate(()=>window.__speechCalls.map(c=>[c.kind,c.text])),[['phoneme',sound]],'Sound button plays the phoneme, not its letter name');assert.equal((await state()).word.id,'log');}
  await page.locator('[data-sound-index="1"]').focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>window.__lastSpeech),'aw');
  await page.evaluate(()=>window.__speechCalls=[]);await page.waitForTimeout(650);assert.deepEqual(await page.evaluate(()=>window.__speechCalls),[],'Sound tap cancels the automatic sequence');
  await page.locator('[data-explore="i"]').click();assert.equal((await state()).word.id,'insect');await page.evaluate(()=>window.__speechCalls=[]);await page.locator('[data-sound-index="3"]').click();assert.ok(await page.evaluate(()=>window.__speechCalls.some(c=>c.kind==='phoneme'&&c.text==='e'&&c.options.wordId==='insect'&&c.options.index===3)),'Insect replays its matching contextual short-e clip');
  for(const mode of ['scramble','catch','missing','vowels','words','blends']){
    await start(mode);if(mode==='words')await page.locator('[data-explore="a"]').click();const before=await state();await page.evaluate(()=>window.__speechCalls=[]);await page.locator('#play [data-word-say]').first().click();assert.deepEqual(await page.evaluate(()=>window.__speechCalls.map(c=>[c.kind,c.text])),[['say',before.word.word]],mode+' picture says its word');const after=await state();for(const key of ['mode','answer','input','count','index'])assert.deepEqual(after[key],before[key],mode+' picture preserves '+key);assert.equal(after.word.id,before.word.id);assert.equal(after.solved,before.solved);
  }
  await start('count');const counting=await state();await page.evaluate(()=>window.__speechCalls=[]);await page.locator('.count-objects > span').first().click({clickCount:3});assert.deepEqual(await page.evaluate(()=>window.__speechCalls),[],'Counting picture taps stay silent');assert.equal((await state()).count,counting.count);assert.equal((await state()).solved,false);assert.equal(await page.locator('.count-objects [data-word-say],button.count-objects').count(),0);
  await start('hangman');const hinted=await state();await page.evaluate(()=>window.__speechCalls=[]);await page.locator('#hint').click();assert.equal(await page.locator('.hear-hint-word').count(),0,'First robot clue does not reveal the mystery picture or word');assert.equal((await state()).chances,hinted.chances);assert.ok(!await page.evaluate(word=>window.__speechCalls.some(c=>c.text===word),hinted.word.word));
  await start('hangman');const lossWord=(await state()).word;await page.keyboard.press(lossWord.word[0]);const guessed=lossWord.word[0],missed=[...new Set(lossWord.word)].filter(c=>c!==guessed),badLetters=[...'abcdefghijklmnopqrstuvwxyz'].filter(c=>!lossWord.word.includes(c)).slice(0,10);await page.evaluate(()=>window.__speechCalls=[]);for(const c of badLetters)await page.keyboard.press(c);assert.equal((await state()).solved,true);assert.deepEqual((await state()).missedLetters,missed);await page.waitForFunction(()=>window.__speechCalls.some(c=>c.kind==='say'&&c.text==="Let's try again."));const lossCalls=await page.evaluate(()=>window.__speechCalls);assert.ok(lossCalls.some(c=>c.kind==='say'&&c.text===lossWord.word));assert.deepEqual(lossCalls.filter(c=>c.kind==='letter').map(c=>c.text),[...lossWord.word,...missed],'Loss spells the whole word then only the missed unique letters');assert.ok(await page.locator('.missed-letter').count()>0);assert.equal((await state()).word.id,lossWord.id,'No automatic next during the explanation');await page.locator('#repeat').click();await page.waitForFunction(()=>window.__speechCalls.filter(c=>c.kind==='say'&&c.text==='The missing letters were.').length===2);await page.locator('#back').click();
  for(let i=0;i<24;i++){
    await start('groups');const s=await state();assert.equal(s.group.same.length,2);assert.ok(s.group.same.every(w=>w.category===s.group.lesson.id));assert.notEqual(s.group.odd.category,s.group.lesson.id);assert.ok(![...s.group.same,s.group.odd].some(w=>['well','star','tree'].includes(w.id)));
    await page.locator('#hint').click();assert.equal(await feedback(),s.group.lesson.hint);assert.equal((await state()).solved,false);assert.equal(await page.locator('[data-answer]:not(:disabled)').count(),3,'First clue leaves all choices available');
  }
  await page.evaluate(()=>{const old=Math.random;try{Math.random=()=>.99999;window.__gameTest.start('rhymes');}finally{Math.random=old;}});
  const variedRhyme=await state();assert.equal(variedRhyme.index,variedRhyme.word.word.length-1);assert.equal(variedRhyme.answer,variedRhyme.word.word.at(-1),'Rhyme gap can be outside the first position');
  assert.equal(await page.locator('.rhyme-target .tile.blank').textContent(),'?');assert.ok((await page.locator('.rhyme-target').getAttribute('aria-label')).includes(variedRhyme.word.word));assert.equal(await page.locator('.rhyme-reference .tile.blank').count(),0);
  for(const word of [variedRhyme.other,variedRhyme.word]){await page.evaluate(()=>window.__speechCalls=[]);await page.locator(`[data-word-say="${word.id}"]`).click();assert.deepEqual(await page.evaluate(()=>window.__speechCalls.map(c=>c.text)),[word.word]);assert.equal((await state()).solved,false);assert.equal((await state()).answer,variedRhyme.answer,'Hearing pictures does not change the answer');}
  await page.locator('.rhyme-target [data-word-say]').focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>window.__lastSpeech),variedRhyme.word.word);
  for(let i=0;i<30;i++){await start('blends');const b=await state();assert.ok(b.blend.start===0||b.blend.start+b.blend.text.length===b.word.word.length,'Blend is at the beginning or end');}
  await start('blends');await page.evaluate(()=>window.__gameTest.makeRound(window.__gameTest.words.find(w=>w.id==='drum')));assert.equal((await state()).answer,'dr');await page.locator('#hint').click();await page.evaluate(()=>window.__speechCalls=[]);await page.locator('#hint').click();await page.waitForFunction(()=>window.__speechCalls.filter(c=>c.kind==='letter').length===2);assert.deepEqual(await page.evaluate(()=>window.__speechCalls.filter(c=>c.kind==='letter').map(c=>c.text)),['d','r'],'Blend answer spells D R rather than reading dr as a word');assert.equal((await state()).solved,false);assert.match(await feedback(),/D · R/);
  await start('order');const letterAnswer=(await state()).answer;await page.locator('#hint').click();await page.evaluate(()=>window.__speechCalls=[]);await page.locator('#hint').click();await page.waitForFunction(()=>window.__speechCalls.some(c=>c.kind==='letter'));assert.deepEqual(await page.evaluate(()=>window.__speechCalls.filter(c=>c.kind==='letter').map(c=>c.text)),[letterAnswer]);
  await page.evaluate(()=>window.__speechCalls=[]);await start('blends');await page.waitForTimeout(50);assert.ok(await page.evaluate(()=>window.__speechCalls.some(c=>c.kind==='blend')),'Blend question includes its sound');
  await start('groups');
  const groupBefore=await state(),groupStars=await page.evaluate(()=>window.__gameTest.progress.stars);
  for(const word of [...groupBefore.group.same,groupBefore.group.odd]){
    await page.evaluate(()=>window.__speechCalls=[]);
    const target=page.locator(`.odd-answers [data-answer="${word.id}"] .choice-emoji`),box=await target.boundingBox();
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(620);await page.mouse.up();
    assert.deepEqual(await page.evaluate(()=>window.__speechCalls.filter(c=>c.kind==='word').map(c=>c.text)),[word.word]);
    assert.equal((await state()).solved,false,'Holding an odd-one-out picture only speaks');
    assert.equal(await page.evaluate(()=>window.__gameTest.progress.stars),groupStars);
  }
  await answer(groupBefore.answer);assert.equal((await state()).solved,true,'A normal tap still answers');
  for(const mode of ['order','missing','vowels','rhymes','blends','groups','count']) {
    await start(mode);const s=await state();
    const opts=await page.locator('[data-answer]').evaluateAll(bs=>bs.map(b=>b.dataset.answer));
    const wrong=opts.find(v=>v!==s.answer);if(wrong){await answer(wrong);assert.match(await feedback(),/try again/i);}
    await page.locator('#hint').click();await page.locator('#hint').click();if(mode==='count'){assert.equal(await page.locator('[data-answer]:not(:disabled)').count(),3);await page.locator('#hint').click();assert.equal(await page.locator('[data-answer]:not(:disabled)').count(),2);await page.locator('#hint').click();}if(mode==='groups'){assert.equal(await page.locator('[data-answer].hint-target').count(),2);await page.locator('#hint').click();}assert.match(await feedback(),/try /i);
    await answer(s.answer);assert.match(await feedback(),/great job/i);
    const stars=await page.evaluate(()=>window.__gameTest.progress.stars);await answer(s.answer);assert.equal(await page.evaluate(()=>window.__gameTest.progress.stars),stars);
    await page.locator('#next').click();assert.equal((await state()).solved,false);
  }
  for(const mode of ['scramble','catch']) {
    await start(mode);let s=await state();
    if(mode==='catch'){const wrong=await page.locator('[data-spell]').evaluateAll((bs,next)=>bs.map(b=>b.dataset.spell).find(c=>c!==next),s.word.word[0]);await page.keyboard.press(wrong);assert.match(await feedback(),/try again/i);}
    await page.locator('#hint').click();s=await state();assert.equal(s.input.length,0,'First hint helps without spelling for the child');
    await page.locator('#hint').click();s=await state();assert.equal(s.input.length,1);
    for(const c of s.word.word.slice(1)) await page.keyboard.press(c);
    assert.match(await feedback(),/great job/i);
  }
  await start('search');let s=await state();await page.evaluate(()=>window.__speechCalls=[]);await page.locator('[data-search-say="0"]').click();assert.equal(await page.evaluate(()=>window.__speechCalls.at(-1).text),s.placed[0].word.word);assert.deepEqual((await state()).found,[],'Listening does not mark a word found');
  const firstWord=s.placed[0];await page.locator(`[data-cell="${firstWord.cells[0].join(',')}"]`).click();await page.locator(`[data-cell="${firstWord.cells.at(-1).join(',')}"]`).click();assert.deepEqual((await state()).found,[],'Skipping the middle letters does not find a word');
  const beforeSearchClue=await state();await page.locator('#hint').click();assert.deepEqual((await state()).searchPath,beforeSearchClue.searchPath,'First search clue preserves the attempt without revealing a start cell');
  await page.locator(`[data-cell="${firstWord.cells[0].join(',')}"]`).click();await page.locator(`[data-cell="${firstWord.cells[0].join(',')}"]`).click();assert.equal((await state()).searchPath.length,1,'Accidental repeat tap does not add another letter');
  await page.locator('[data-search-say="0"]').click();assert.equal((await state()).searchPath.length,1,'Hearing a target preserves the selected letters');
  for(const cell of firstWord.cells.slice(1))await page.locator(`[data-cell="${cell.join(',')}"]`).click();assert.ok((await state()).found.includes(0));await page.locator('[data-search-say="0"]').click();assert.equal(await page.evaluate(()=>window.__speechCalls.at(-1).text),firstWord.word.word);assert.ok(await page.locator('#search-word-0').evaluate(el=>el.classList.contains('found')),'Found words remain tappable and marked');
  for(const p of s.placed.slice(1))for(const cell of p.cells)await page.locator(`[data-cell="${cell.join(',')}"]`).click();
  assert.match(await feedback(),/all the words/i);
  await start('hangman');s=await state();const wrong=[...'abcdefghijklmnopqrstuvwxyz'].find(c=>!s.word.word.includes(c));await page.keyboard.press(wrong);assert.equal((await state()).chances,9);
  await page.locator('#hint').click();assert.equal((await state()).chances,9,'Picture clue does not spend a guess');assert.equal((await state()).used.length,1,'First clue does not choose a letter');
  for(const c of new Set(s.word.word))await page.keyboard.press(c);assert.match(await feedback(),/great job/i);
  await start('memory');await page.waitForFunction(()=>window.__gameTest.state.listening===false);s=await state();assert.equal(s.pool.length,26,'Memory uses the full alphabet object pool');assert.equal(await page.locator('.keyboard [data-memory]').count(),26);assert.equal(await page.locator('.keyboard .key-upper').count(),26);for(const w of s.pool)assert.equal(await page.locator(`[data-memory="${w.id}"] small`).count(),1,'Memory object has a picture key');
  const wrongId=s.pool.find(w=>w.id!==s.sequence[0].id).id;await page.locator(`[data-memory="${wrongId}"]`).click();assert.match(await feedback(),/try again/i);assert.equal(await page.locator('[data-memory]:disabled').count(),26,'Full keyboard locks while the sequence is presented');
  await page.locator('#hint').click();await page.waitForFunction(()=>window.__gameTest.state.listening===false);s=await state();await page.locator(`[data-memory="${s.sequence[0].id}"]`).click();assert.match(await feedback(),/remembered/i);
  await start('songs');await page.locator('[data-song="0"]').click();await page.waitForTimeout(100);assert.ok((await page.locator('#song-lyrics').textContent()).length>0);await page.locator('#stop-song').click();assert.match(await feedback(),/stopped/i);
  const songIds=[];
  do {songIds.push(...await page.locator('[data-song]').evaluateAll(bs=>bs.map(b=>Number(b.dataset.song))));if(await page.locator('#song-next').isDisabled())break;await page.locator('#song-next').click();}while(true);
  assert.equal(new Set(songIds).size,JSON.parse(await fs.readFile(path.join(root,'content/lessons.json'),'utf8')).songs.length);
  await page.locator('#music-volume').fill('40');await page.locator('#music-volume').dispatchEvent('input');assert.equal(await page.locator('#music-percent').textContent(),'40%');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('alphabert-prefs')).musicVolume),.4);
  await page.locator('#music-volume').fill('85');await page.locator('#music-volume').dispatchEvent('input');
  await page.locator('#grownups').click();
  const custom={schemaVersion:1,words:[{id:'string',word:'string',letter:'s',emoji:'🧵',category:'objects',phonemes:['s','t','r','i','ng'],blends:[{text:'str',start:0}]}]};
  await page.locator('#pack-json').fill(JSON.stringify(custom));await page.locator('#import-pack').click();assert.match(await page.locator('#settings-status').textContent(),/Imported 1/);
  assert.ok(await page.evaluate(()=>JSON.parse(localStorage.getItem('alphabert-custom')).some(w=>w.id==='string')));
  await page.locator('#copy-pack').click();assert.equal(JSON.parse(await page.locator('#pack-json').inputValue()).words[0].word,'string');
  await page.evaluate(()=>{const old=Math.random;Math.random=()=>.999999;try{window.__gameTest.start('blends');}finally{Math.random=old;}});
  assert.equal((await state()).word.word,'string');await page.locator('#hint').click();await page.evaluate(()=>window.__speechCalls=[]);await page.locator('#hint').click();await page.waitForFunction(()=>window.__speechCalls.filter(c=>c.kind==='letter').length===3);assert.deepEqual(await page.evaluate(()=>window.__speechCalls.filter(c=>c.kind==='letter').map(c=>c.text)),['s','t','r'],'Custom three-letter blend is spelled as letter names');await answer('str');assert.match(await feedback(),/great job/i);
  await page.locator('#grownups').click();
  await page.locator('#new-word').fill('kiwi');await page.locator('#new-emoji').fill('🥝');await page.locator('#new-letter').fill('k');await page.locator('#new-category').fill('food');await page.locator('#new-sounds').fill('k, ee, w, ee');await page.locator('#word-form button').click();assert.match(await page.locator('#settings-status').textContent(),/Added kiwi/);
  const injection=structuredClone(custom);Object.assign(injection.words[0],{id:'sun',word:'sun',letter:'s',emoji:'<svg/onload=1>',blends:[]});
  await page.locator('#pack-json').fill(JSON.stringify(injection));await page.locator('#import-pack').click();
  if((await page.locator('#settings-status').textContent()).includes('Imported')) {
    await start('letters');await page.locator('[data-explore="s"]').click();assert.equal(await page.locator('#explore svg').count(),0);assert.ok((await page.locator('#explore').textContent()).includes('<svg/onload=1>'));
  }
  await start('letters');await page.locator('[data-explore="a"]').click();await page.waitForTimeout(20);assert.match(await page.locator('#explore').textContent(),/ant/);assert.match(await page.locator('#explore').textContent(),/ape/);
  await start('words');await page.evaluate(()=>window.__speechCalls=[]);await page.locator('[data-explore="a"]').click();await page.waitForTimeout(1500);
  const soundCalls=await page.evaluate(()=>window.__speechCalls);const soundSteps=soundCalls.filter(c=>c.kind==='phoneme');assert.deepEqual(soundSteps.map(c=>c.text),['a','n','t']);assert.equal(soundSteps[0].options.rate,1);assert.equal(soundSteps.at(-1).options.rate,1);assert.ok(soundSteps[1].time-soundSteps[0].time>=400);assert.equal(soundCalls.at(-1).text,'ant');
  await page.locator('#repeat').click();await page.waitForTimeout(1500);assert.equal(await page.evaluate(()=>window.__speechCalls.filter(c=>c.kind==='phoneme').length),6);
  await start('hangman');assert.equal(await page.locator('#guess-display .robot-body').evaluate(el=>getComputedStyle(el).visibility),'hidden');let mystery=await state();for(const c of [...'abcdefghijklmnopqrstuvwxyz'].filter(c=>!mystery.word.word.includes(c)).slice(0,3))await page.keyboard.press(c);assert.equal(await page.locator('#guess-display .robot-body').evaluate(el=>getComputedStyle(el).visibility),'visible');
  await start('memory');await page.waitForFunction(()=>!window.__gameTest.state.listening);await page.locator('#hint').click();await page.waitForFunction(()=>!window.__gameTest.state.listening);await page.locator('#hint').click();await page.waitForFunction(()=>!window.__gameTest.state.listening);assert.ok(await page.locator('#sequence span').count()>0);
  await start('blends');await page.evaluate(()=>window.__gameTest.makeRound(window.__gameTest.words.find(w=>w.id==='frog')));await page.waitForTimeout(60);
  assert.equal(await page.locator('.keyboard,.blend-word-panel,[data-blend-word]').count(),0);assert.equal(await page.locator('.blend-answers [data-answer]').count(),3);assert.deepEqual((await page.locator('.blend-answers [data-answer]').evaluateAll(bs=>bs.map(b=>b.dataset.answer))).sort(),['fr','og','ro']);
  const starsBeforeHold=await page.evaluate(()=>window.__gameTest.progress.stars);
  for(const choice of ['ro','og','fr']){await page.evaluate(()=>window.__speechCalls=[]);const button=page.locator(`.blend-answers [data-answer="${choice}"]`);const box=await button.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(620);await page.mouse.up();assert.ok(await page.evaluate(text=>window.__speechCalls.some(c=>c.kind==='blend'&&c.text===text),choice));assert.equal((await state()).solved,false,'Holding previews without submitting');assert.equal(await page.evaluate(()=>window.__gameTest.progress.stars),starsBeforeHold);}
  const soundChoice=page.locator('.blend-answers [data-answer="ro"]');await soundChoice.focus();await page.evaluate(()=>window.__speechCalls=[]);await page.keyboard.down('Space');await page.waitForTimeout(620);await page.keyboard.up('Space');assert.equal((await state()).solved,false);assert.ok(await page.evaluate(()=>window.__speechCalls.some(c=>c.kind==='blend'&&c.text==='ro')));
  await page.locator('.blend-answers [data-answer="fr"]').press('Enter');assert.equal((await state()).solved,true,'Short keyboard activation submits');
  await start('blends');await page.evaluate(()=>window.__gameTest.makeRound(window.__gameTest.words.find(w=>w.id==='string')));assert.equal((await state()).answer,'str');assert.equal(await page.locator('.blend-answers [data-answer]').count(),3,'Imported three-letter blends remain playable');
  await page.reload();await page.waitForSelector('.activity-card');assert.ok(await page.evaluate(()=>window.__gameTest.words.some(w=>w.id==='string')));
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(root,'test-results/home-mobile.png'),fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'home: horizontal overflow');
  for(const mode of ['letters','blends','search','scramble','memory','count','songs']) {
    await start(mode);await page.screenshot({path:path.join(root,`test-results/${mode}-mobile.png`),fullPage:true});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),`${mode}: horizontal overflow`);
  }
  for(const viewport of [{width:390,height:740},{width:360,height:640},{width:740,height:360}]){
    await page.setViewportSize(viewport);
    for(const mode of ['letters','order','sounds','words','missing','vowels','rhymes','blends','groups','scramble','search','catch','hangman','memory','count','songs']){
      await start(mode);if(['letters','sounds','words'].includes(mode))await page.locator('[data-explore="a"]').click();
      await page.waitForTimeout(40);
      const fit=await page.evaluate(()=>{const a=document.querySelector('#play').getBoundingClientRect(),s=document.querySelector('.play-content').getBoundingClientRect();return {page:document.documentElement.scrollHeight<=innerHeight+1,content:s.bottom<=a.bottom+1,inside:a.bottom<=innerHeight+1};});
      assert.ok(fit.page&&fit.content&&fit.inside,`${mode} ${viewport.width}x${viewport.height}: ${JSON.stringify(fit)}`);
    }
  }
  await page.setViewportSize({width:390,height:740});await start('letters');await page.locator('[data-explore="a"]').click();await page.waitForTimeout(50);await page.screenshot({path:path.join(root,'test-results/activity-fit-mobile.png')});
  await page.locator('#grownups').click();await page.locator('#motion').selectOption('true');
  await start('catch');
  const boxes=await page.locator('.catch-letter').evaluateAll(bs=>bs.map(b=>{const r=b.getBoundingClientRect();return {left:r.left,right:r.right,visible:r.width>0};}));
  assert.ok(boxes.every(b=>b.visible&&b.left>=0&&b.right<=390),'reduced-motion catch letters remain visible');
  await start('memory');await page.waitForFunction(()=>window.__gameTest.state.listening===false);
  await page.evaluate(()=>window.dispatchEvent(new Event('androidpause')));assert.equal((await state()).listening,true);
  assert.match(await page.locator('#memory-status').textContent(),/Paused/);await page.locator('#repeat').click();await page.waitForFunction(()=>window.__gameTest.state.listening===false);
  assert.deepEqual(errors,[]);
  console.log('Browser checks passed: all16 modes, correct/wrong/hint interactions, duplicate-win guard, custom persistence/export/XSS escaping, music stop, desktop and mobile layouts.');
} finally {await browser.close();await new Promise(r=>server.close(r));}


