import fs from 'node:fs';import assert from 'node:assert/strict';
const report=JSON.parse(fs.readFileSync('audio/human-phonics.json')),index=JSON.parse(fs.readFileSync('audio/index.json')).clips,lessons=JSON.parse(fs.readFileSync('content/lessons.json'));
assert.equal(report.sounds.ee.ipa,'i');assert.equal(report.sounds.e.ipa,'ɛ');assert.equal(report.sounds.f.ipa,'f');
for(const s of Object.values(report.sounds)){assert.equal(s.looped,false);assert.equal(s.timeStretched,false);assert.equal(s.playbackRate,1);assert.equal(index['phoneme-natural:'+s.token],s.file);assert.ok(s.sha256.length===64);}
assert.equal(index['letter-natural:e'],report.sounds.ee.file,'E name is EEE, not ay or short eh');
assert.equal(lessons.letters.find(l=>l.letter==='e').sounds.find(s=>s.label==='short').sound,'e');assert.equal(lessons.letters.find(l=>l.letter==='e').sounds.find(s=>s.label==='long').sound,'ee');
const review=JSON.parse(fs.readFileSync('audio/phonics-review.json'));assert.equal(review.sounds.length,52);assert.ok(review.sounds.every(s=>s.listeningVerified===false),'Do not claim a listening certification from signal tests');
assert.ok(fs.existsSync('audio/licenses/HUMAN-PHONICS-CREDITS.txt'));
console.log('Human E/ee, short e/i and F routing, native timing, source credits, and 52-sound review inventory passed.');
