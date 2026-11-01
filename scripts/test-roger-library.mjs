import {browserOptions} from './browser-config.mjs';
import fs from 'node:fs';import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {BERTIE_REACTIONS} from '../bertie-reactions.js';
import {CLUE_TEXT} from '../context-hints.js';
import {MENU_HELP} from '../menu-help.js';
import {chromium} from '../tools/test-browser/node_modules/playwright/index.mjs';
const report=JSON.parse(fs.readFileSync('audio/roger-library.json')),index=JSON.parse(fs.readFileSync('audio/index.json')).clips,words=JSON.parse(fs.readFileSync('content/words.json')).words;
const plan=JSON.parse(fs.readFileSync('.elevenlabs-cache/narration-plan.json'));
const compact=JSON.parse(fs.readFileSync('.elevenlabs-cache/library-plan.json')),pieceText=new Map(compact.jobs.map(j=>[j.id,j.text]));
const wordsOnly=s=>s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
for(const output of compact.outputs){const rebuilt=output.parts.map(p=>p.letter||pieceText.get(p.id)).join(' ');assert.equal(wordsOnly(rebuilt),wordsOnly(output.text),'Assembly must preserve every spoken word: '+output.key);}
assert.equal(report.phrases.length,plan.jobs.length,'Migrate the entire existing narration library');
assert.equal(report.independentPieces,171,'Every unpunctuated word or fragment must have its own source recording');
for(const phrase of report.phrases){
 assert.equal(phrase.independent,true,'All narration must use whole independent recordings: '+phrase.key);
 assert.equal(phrase.parts.length,1,'No fragment assembly: '+phrase.key);
 assert.ok(phrase.sourceSha256,'Source provenance required: '+phrase.key);
 const sourceId=phrase.parts[0].independentSentence||phrase.parts[0].id;
 const source=JSON.parse(fs.readFileSync(`.elevenlabs-cache/independent/${sourceId}.json`));
 assert.equal(source.independent,true);
 assert.equal(phrase.sourceSha256,source.sha256);
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(source.file)).digest('hex'),source.sha256,'Source changed: '+phrase.key);
 assert.ok(Math.abs(phrase.seconds-phrase.sourceSeconds-.1)<.001,'Preserve complete native source duration: '+phrase.key);
}
assert.equal(report.completeLessonSentences,132,'All Learn Letters introductions and examples must be complete recordings');
const oddPrompt=report.phrases.find(p=>p.key==='which picture does not belong?');
assert.equal(oddPrompt?.independent,true,'Odd One Out question must use an isolated utterance without neighboring batch speech');
assert.equal(oddPrompt.parts.length,1);
const pictureGroups=JSON.parse(fs.readFileSync('content/lessons.json')).pictureGroups;
for(const text of [...pictureGroups.flatMap(g=>[g.hint,g.explanation,g.oddExplanation]),MENU_HELP.groups,'Great job!',"Let's try again."]){
 const sentence=report.phrases.find(p=>p.key===text.toLowerCase());
 assert.equal(sentence?.independent,true,'Odd One Out must use a whole isolated recording: '+text);
 assert.equal(sentence.parts.length,1);
 assert.equal(sentence.spokenText,text);
}
for(const id of pictureGroups.flatMap(g=>g.words)){
 const word=words.find(w=>w.id===id),phrase=report.phrases.find(p=>p.key===word.word);
 assert.equal(phrase.parts.length,1,'Odd One Out word must use one independent source: '+id);
 const receipt=JSON.parse(fs.readFileSync('.elevenlabs-cache/independent/'+phrase.parts[0].id+'.json'));
 assert.equal(receipt.independent,true);
 assert.equal(receipt.text.toLowerCase(),word.word);
}
for(const key of ['spellStart','spellMiddle','spellLast']){
 const hint=report.phrases.find(p=>p.key===CLUE_TEXT[key].toLowerCase());
 assert.equal(hint?.independent,true,'Word Scramble hint must be a complete isolated recording: '+key);
 assert.equal(hint.parts.length,1);
 assert.equal(hint.spokenText,CLUE_TEXT[key]);
}
const vowelWords=words.filter(w=>w.word.length<=7&&/[aeiou]/.test(w.word));assert.equal(report.completeVowelPrompts,vowelWords.length);for(const word of vowelWords){const phrase=report.phrases.find(p=>p.key===`find the missing vowel in ${word.word}.`);assert.equal(phrase?.independent,true,'Missing Vowels must use a whole prompt: '+word.word);assert.equal(phrase.parts.length,1);}
for(const phrase of report.phrases.filter(p=>/^[a-z] is for [a-z]+\.$/.test(p.key)||/^this is the letter [a-z]\.$/.test(p.key))){
 assert.equal(phrase.independent,true,phrase.key+' must not stitch a letter name to is-for');assert.equal(phrase.parts.length,1);assert.ok(phrase.parts[0].independentSentence);assert.ok(!phrase.spokenText.includes('undefined'));
}
for(const job of plan.jobs)assert.ok(index[job.key]?.startsWith('audio/roger-'),'Old voice remains for '+job.key);
for(const word of words)assert.ok(index[word.word]?.startsWith('audio/roger-'),'Whole word '+word.id);
for(const reaction of BERTIE_REACTIONS)assert.ok(index[reaction.text.toLowerCase()]?.startsWith('audio/roger-'),reaction.text);
const browser=await chromium.launch({...browserOptions(),headless:true,args:['--autoplay-policy=no-user-gesture-required']});
try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:4173');
 const decoded=await page.evaluate(async phrases=>{
  const context=new OfflineAudioContext(1,24000,24000);let n=0,minRms=1,maxDuration=0;
  for(const {key,file,seconds} of phrases){const r=await fetch(file);if(!r.ok)throw Error('Missing '+key);const audio=await context.decodeAudioData(await r.arrayBuffer()),samples=audio.getChannelData(0);let sum=0,peak=0;for(const s of samples){if(!Number.isFinite(s))throw Error('Invalid '+key);peak=Math.max(peak,Math.abs(s));sum+=s*s;}const rms=Math.sqrt(sum/samples.length);if(Math.abs(audio.duration-seconds)>.02)throw Error("Truncated or padded narration: "+key);if(rms<.001||peak<.01||peak>1.01||audio.duration<.1||audio.duration>60)throw Error('Bad speech '+key+' '+JSON.stringify({rms,peak,duration:audio.duration}));n++;minRms=Math.min(minRms,rms);maxDuration=Math.max(maxDuration,audio.duration);}
  return {n,minRms,maxDuration};
 },report.phrases);
 fs.mkdirSync('test-results/elevenlabs',{recursive:true});fs.writeFileSync('test-results/elevenlabs/narration-decode.json',JSON.stringify(decoded,null,2));
 console.log(`All ${decoded.n} Roger narration clips decoded in Chrome; every built-in word and all Bertie reactions migrated. This verifies coverage and audio signals, not listening quality.`);
}finally{await browser.close();}
