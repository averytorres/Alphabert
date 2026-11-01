import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';import {spawnSync} from 'node:child_process';
import ffmpeg from '../tools/audio/node_modules/ffmpeg-static/index.js';
const sources=[
 {token:'ee',ipa:'i',title:'Close_front_unrounded_vowel.ogg',author:'Denelson83',media:'9/91/Close_front_unrounded_vowel.ogg'},
 {token:'e',ipa:'ɛ',title:'Open-mid_front_unrounded_vowel.ogg',author:'Terfili; original upload by Denelson83',media:'7/71/Open-mid_front_unrounded_vowel.ogg'},
 {token:'i',ipa:'ɪ',title:'Near-close_near-front_unrounded_vowel.ogg',author:'Denelson83',media:'4/4c/Near-close_near-front_unrounded_vowel.ogg'},
 {token:'f',ipa:'f',title:'Voiceless_labiodental_fricative.ogg',author:'Peter Isotalo',media:'3/33/Voiceless_labiodental_fricative.ogg',from:.225,to:.505}
];
const index=JSON.parse(fs.readFileSync('audio/index.json')),report={version:1,license:'CC BY-SA 3.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/3.0/',sounds:{}};
for(const source of sources){
 const input=`.human-phonics-cache/${source.token}.ogg`,file=`audio/phoneme-${source.token}-human-v1.ogg`;
 assert.ok(fs.existsSync(input),'Download the source recording first: '+source.title);
 const trim=source.from!==undefined?[`atrim=start=${source.from}:end=${source.to}`,'asetpts=PTS-STARTPTS','afade=t=in:d=0.005','afade=t=out:st=0.26:d=0.02']:[];
 // No looping, repetition, pitch change or time stretching. Keep the natural take.
 const volume=source.token==='f'?'volume=12':'volume=0.8';
 const r=spawnSync(ffmpeg,['-hide_banner','-loglevel','error','-y','-i',input,'-af',[...trim,volume,'apad=pad_dur=0.12'].join(','),'-ar','24000','-ac','1','-c:a','libvorbis','-q:a','5',file],{encoding:'utf8',windowsHide:true});assert.equal(r.status,0,r.stderr);
 index.clips['phoneme-natural:'+source.token]=file;
 report.sounds[source.token]={...source,file,url:'https://commons.wikimedia.org/wiki/File:'+source.title,download:'https://upload.wikimedia.org/wikipedia/commons/'+source.media,sha256:crypto.createHash('sha256').update(fs.readFileSync(input)).digest('hex'),playbackRate:1,looped:false,timeStretched:false,changes:source.token==='f'?'Cropped the natural unvoiced F between the source vowels; edge fades; gain, mono conversion and resampling':'Gain, mono conversion and resampling; original duration retained'};
}
index.clips['letter-natural:e']=report.sounds.ee.file;
fs.writeFileSync('audio/index.json',JSON.stringify(index,null,2)+'\n');fs.writeFileSync('audio/human-phonics.json',JSON.stringify(report,null,2)+'\n');
const credits='Human phonics recordings — CC BY-SA 3.0\nLicense: '+report.licenseUrl+'\nThese adapted audio files remain available under CC BY-SA 3.0. No endorsement is implied.\n\n'+Object.values(report.sounds).map(s=>`${s.file}\nIPA: ${s.ipa}\nCreator: ${s.author}\nSource: ${s.url}\nOriginal SHA256: ${s.sha256}\nChanges: ${s.changes}\n`).join('\n');
const held=JSON.parse(fs.readFileSync('audio/phonics-held.json')).sounds,reference=JSON.parse(fs.readFileSync('audio/phonics-reference.json')).references;
const review=Object.entries(reference).map(([token,ref])=>({token,ipa:ref.targetIPA,example:ref.keyword,file:index.clips['phoneme-natural:'+token]||index.clips['phoneme-held:'+token],kind:report.sounds[token]?'Human recording':held[token].sustained?'Generated, sustained':'Generated, native articulation',listeningVerified:false}));
fs.writeFileSync('audio/phonics-review.json',JSON.stringify({version:1,note:'Source/routing and signal review of all 52 tokens. This is not a human listening certification.',sounds:review},null,2)+'\n');
fs.writeFileSync('audio/licenses/HUMAN-PHONICS-CREDITS.txt',credits);
fs.writeFileSync('phonics-credits.html','<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Phonics audio credits</title><style>body{font:17px sans-serif;line-height:1.5;max-width:780px;margin:24px auto;padding:16px;color:#183f3a;background:#faf8f0}button{padding:12px}pre{white-space:pre-wrap;overflow-wrap:anywhere}audio{max-width:100%}</style><button onclick="history.back()">Back to the game</button><h1>Phonics audio sources</h1><p>Human recordings keep their natural timing. Other sounds still use the synthetic phonics bank. Source recordings may use different speakers.</p>'+Object.values(report.sounds).map(s=>`<h2>${s.token} / ${s.ipa}</h2><audio controls src="${s.file}"></audio>`).join('')+'<pre>'+credits.replaceAll('&','&amp;').replaceAll('<','&lt;')+'</pre></html>');
let page=fs.readFileSync('phonics-credits.html','utf8');page=page.replace('<pre>','<h1>Review every letter sound</h1>'+review.map(r=>`<section><h2>${r.token} — ${r.example}</h2><p>${r.kind}</p><audio controls preload="none" src="${r.file}"></audio></section>`).join('')+'<h1>Recording credits</h1><pre>');fs.writeFileSync('phonics-credits.html',page);
console.log('Published four native-timing human sound recordings and the E letter-name override.');
