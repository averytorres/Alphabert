import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {FIRST_HINTS,MEMORY_HINT} from '../hints.js';
import {MENU_HELP} from '../menu-help.js';
const listeners = new Map();
let played = [], native = [], mode='ok',instances=[];
const window = {
  dispatchEvent(event) { for (const listener of listeners.get(event.type)||[]) listener(event); },
  addEventListener(type, callback) { const set=listeners.get(type)||new Set();set.add(callback);listeners.set(type,set); },
  removeEventListener(type, callback) { listeners.get(type)?.delete(callback); },
  AndroidVoice: {
    stop() {},
    speakWithId(text,id) { native.push(text); queueMicrotask(()=>window.dispatchEvent({type:'android-speech-end',detail:id})); }
  }
};
class Audio {
  constructor(file) { this.file=file;instances.push(this); }
  pause() {}
  play() { played.push(this.file); if(mode==='error') return Promise.reject(Error('missing')); if(mode==='ok') queueMicrotask(()=>this.onended?.()); return Promise.resolve(); }
}
const context={window,Audio,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},fetch:async()=>({ok:true,json:async()=>({clips:{'hello.':'audio/hello.ogg','phoneme:m':'audio/m.ogg','phoneme-clear:ee':'audio/ee-clear.ogg','phoneme-natural:ee':'audio/ee-human.ogg','phoneme-natural:f':'audio/f-human.ogg','letter-natural:e':'audio/ee-human.ogg','word-phoneme:insect:0':'audio/insect-i.ogg','phoneme-held:m':'audio/m-held.ogg','blend:hand:nd':'audio/hand-nd.ogg','letter:a':'audio/letter-a.ogg'}})}),setTimeout,clearTimeout};
vm.runInNewContext(fs.readFileSync(new URL('../speech.js',import.meta.url),'utf8'),context);
const speech=new window.SpeechService();
await speech.say('  HELLO. ');
assert.deepEqual(played,['audio/hello.ogg']);
assert.equal(native.length,0);
await speech.say('A custom word.');
assert.deepEqual(native,['A custom word.']);
await speech.phoneme('m');
assert.equal(played.at(-1),'audio/m.ogg');
await speech.phoneme('m',{rate:.72});assert.equal(instances.at(-1).playbackRate,1);assert.equal(instances.at(-1).preservesPitch,true);
await speech.say('A');assert.equal(played.at(-1),'audio/letter-a.ogg');
await speech.say('A is for aardvark.');assert.equal(played.at(-1),'audio/letter-a.ogg');assert.equal(native.at(-1),'is for aardvark.');
await speech.say('The answer is 3.');assert.equal(native.at(-1),'The answer is three.');
await speech.phoneme('i',{wordId:'insect',index:0});assert.equal(instances.at(-1).file,'audio/insect-i.ogg');assert.equal(instances.at(-1).playbackRate,1);
await speech.phoneme('ee',{wordId:'zebra',index:1});assert.equal(instances.at(-1).file,'audio/ee-human.ogg');assert.equal(instances.at(-1).playbackRate,1);
await speech.letter('e');assert.equal(instances.at(-1).file,'audio/ee-human.ogg');
await speech.phoneme('f',{held:true});assert.equal(instances.at(-1).file,'audio/f-human.ogg');assert.equal(instances.at(-1).playbackRate,1);
await speech.phoneme('m',{held:true});assert.equal(instances.at(-1).file,'audio/m-held.ogg');assert.equal(instances.at(-1).playbackRate,1);
await speech.blend({id:'hand',word:'hand',phonemes:['h','a','n','d']},{text:'nd',start:2});assert.equal(instances.at(-1).file,'audio/hand-nd.ogg');assert.equal(instances.at(-1).playbackRate,1);
const beforeMissing=native.length;await speech.phoneme('unrecorded');assert.equal(native.length,beforeMissing,'Never substitute a letter name for an unavailable sound');
mode='error'; await speech.say('Hello.');
assert.equal(native.at(-1),'Hello.');
mode='pending'; const pending=speech.say('Hello.'); await speech.ready; await new Promise(resolve=>setTimeout(resolve,0)); speech.stop(); await pending;
speech.enabled=false;await speech.say('Muted');assert.notEqual(native.at(-1),'Muted');
assert.equal(listeners.get('android-speech-end')?.size||0,0);
console.log('Speech checks passed: offline audio, native completion, phonemes, missing-audio fallback, cancellation, mute.');
const indexURL=new URL('../audio/index.json',import.meta.url);
if(fs.existsSync(indexURL)) {
 const index=JSON.parse(fs.readFileSync(indexURL,'utf8')).clips;
 assert.ok(index['the answer is.'],'Answer spelling prefix must have offline narration');
 for(const text of ['the word was.',"let's spell it.",'the missing letters were.'])assert.ok(index[text],'Missing robot-loss narration: '+text);
 for(const [text,file] of Object.entries(index)) {
  const data=fs.readFileSync(new URL('../'+file,import.meta.url));
  assert.ok(data.length>100,`Empty audio: ${text}`);
  assert.equal(data.toString('ascii',0,4),'OggS',`Invalid Ogg container: ${text}`);
 }
 const words=JSON.parse(fs.readFileSync(new URL('../content/words.json',import.meta.url),'utf8')).words;
 for(const text of Object.values(MENU_HELP))assert.ok(index[text.toLowerCase()],`Missing offline menu description: ${text}`);
 const lessons=JSON.parse(fs.readFileSync(new URL('../content/lessons.json',import.meta.url),'utf8'));
 for(const text of [...Object.values(FIRST_HINTS),MEMORY_HINT,...lessons.pictureGroups.flatMap(g=>[g.hint,g.explanation,g.oddExplanation])])assert.ok(index[text.toLowerCase()],`Missing spoken hint: ${text}`);
 for(const letter of 'abcdefghijklmnopqrstuvwxyz')assert.ok(index['letter:'+letter],`Missing explicit letter name: ${letter}`);
 for(const word of words) { assert.ok(index[word.word],`Missing word audio: ${word.word}`);for(const token of word.phonemes) assert.ok(index['phoneme:'+token],`Missing phoneme: ${token}`); }
 for(const letter of lessons.letters) for(const sound of letter.sounds) assert.ok(index['phoneme:'+sound.hint.split(/\s+as\s/)[0]],`Missing letter sound: ${sound.hint}`);
 for(const song of lessons.songs) assert.ok(index[song.title.toLowerCase().replace(/\s+/g,' ').trim()],`Missing song title audio: ${song.title}`);
 console.log(`Verified ${Object.keys(index).length} bundled Ogg clips; every built-in word, sound, and song title has audio.`);
}
