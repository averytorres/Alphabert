import assert from 'node:assert/strict';import fs from 'node:fs';
import {LETTER_NAMES,letterNameText} from './letter-pronunciation.mjs';
assert.equal(LETTER_NAMES.a,'ˈ A');assert.equal(Object.keys(LETTER_NAMES).length,26);
for(const c of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'){
 const token='bertletter'+c.toLowerCase();
 for(const text of [`${c} is for example.`,`${c} is the missing letter in example.`,`This is the letter ${c}.`,`What letter comes before ${c}?`,`The letter ${c} comes after B.`]){
  assert.ok(letterNameText(text).includes(token),text);
 }
}
assert.equal(letterNameText('A is for ant.'),'bertlettera is for ant.');
assert.equal(letterNameText('A is for ape.'),'bertlettera is for ape.');
assert.equal(letterNameText('A custom word.'),'A custom word.','Articles must remain normal speech');
assert.equal(letterNameText('ant'),'ant','Phonics and whole words stay separate');
const plan=JSON.parse(fs.readFileSync(new URL('../.speech-cache/plan.json',import.meta.url)));
const index=JSON.parse(fs.readFileSync(new URL('../audio/index.json',import.meta.url))).clips;
for(const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'){
 const jobs=plan.jobs.filter(j=>j.displayText.startsWith(letter+' is for '));
 assert.ok(jobs.length>0,letter);for(const job of jobs)assert.ok(job.text.startsWith('bertletter'+letter.toLowerCase()+' is for '));
}
if(process.argv.includes('--published'))for(const job of plan.jobs.filter(j=>j.text!==j.displayText)){
 assert.equal(index[job.displayText.toLowerCase()],`audio/${job.source}.ogg`,`Published phrase must point to corrected audio: ${job.displayText}`);
}
console.log('All 26 letters use explicit name pronunciations in example sentences, hints, questions, and feedback; ordinary articles remain unchanged.');
