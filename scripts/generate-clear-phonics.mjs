import fs from 'node:fs';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';
import ffmpeg from '../tools/audio/node_modules/ffmpeg-static/index.js';
import {engine,cleanIPA,SOUNDS,wav} from './phonics-reference.mjs';import {sustain} from './sustain-phoneme.mjs';
const index=JSON.parse(fs.readFileSync('audio/index.json')),references=JSON.parse(fs.readFileSync('audio/phonics-reference.json')).references,report={version:1,sounds:{}},synth=await engine({rate:80});
const steady=new Set(['a','e','i','o','u','ee','oo','schwa','ah','eh','uh','aw','f','h','l','m','n','ng','r','s','sh','th','v','z']),noise=new Set(['s','sh','f','th','h']);
const onsetWords={b:'bat',d:'dog',g:'goat',k:'cat',p:'pig',t:'top'};
for(const [token,entry] of Object.entries(references)){
 let input,rate=22050,source=entry.keyword;
 if(onsetWords[token]){source=onsetWords[token];const sound=synth(source),phone=sound.phones.find(p=>cleanIPA(p.id)===SOUNDS[token][1]);assert.ok(phone);const next=sound.events.find(e=>e.type==='phoneme'&&e.audio_position>phone.audio_position);assert.ok(next);input=sound.samples.slice(Math.round((phone.audio_position/1000+.002)*rate),Math.round((next.audio_position/1000-.005)*rate));}
 else{const data=fs.readFileSync('.phonics-reference-cache/'+token+'.wav');assert.equal(data.readUInt32LE(24),rate);input=Int16Array.from({length:(data.length-44)/2},(_,i)=>data.readInt16LE(44+i*2));}
 const steadyRelease=steady.has(token);let output=steadyRelease?sustain(input,rate,.5,{noise:noise.has(token),steadyRelease:true}):input.slice();
 if(!steadyRelease){const fade=Math.min(Math.round(rate*.004),Math.floor(output.length*.08));for(let i=0;i<fade;i++)output[output.length-1-i]=Math.round(output[output.length-1-i]*i/fade);}
 let peak=0;for(const n of output)peak=Math.max(peak,Math.abs(n));assert.ok(peak>0);const file=`audio/phoneme-${token}-clear-v1.ogg`,temp=`.phonics-reference-cache/${token}-clear.wav`;fs.writeFileSync(temp,wav(output,rate));
 const r=spawnSync(ffmpeg,['-hide_banner','-loglevel','error','-y','-i',temp,'-af',`volume=${Math.min(4,18000/peak)},apad=pad_dur=0.12`,'-ar','24000','-c:a','libvorbis','-q:a','5',file],{encoding:'utf8',windowsHide:true});assert.equal(r.status,0,r.stderr);
 index.clips['phoneme-clear:'+token]=file;report.sounds[token]={source,ipa:SOUNDS[token][1],steadyRelease,sourceEndFraction:steadyRelease?.6:1,seconds:output.length/rate,playbackRate:1,file};
}
fs.writeFileSync('audio/index.json',JSON.stringify(index,null,2)+'\n');fs.writeFileSync('audio/phonics-clear.json',JSON.stringify(report,null,2)+'\n');console.log('Published 52 clear Sound It Out clips');
