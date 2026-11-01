// API key stays in the ignored local cache and is never printed or packaged.
import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
const plan=JSON.parse(fs.readFileSync('.elevenlabs-cache/library-plan.json'));
const key=(process.env.ELEVENLABS_API_KEY||fs.readFileSync('.elevenlabs-cache/api-key.txt','utf8')).trim();
const dir='.elevenlabs-cache/library';fs.mkdirSync(dir,{recursive:true});
const maxJobs=Number(process.env.ROGER_MAX_JOBS||Infinity);
const batchSize=Number(process.env.ROGER_BATCH_SIZE||10),workers=Number(process.env.ROGER_WORKERS||2);
const jobs=plan.jobs.filter(j=>!fs.existsSync(`${dir}/${j.id}.json`)).slice(0,maxJobs);
assert.ok(plan.characters<20000,'Plan exceeds the restricted project key budget');
const batches=[];let batch=[];let chars=0;
for(const job of jobs){if(batch.length>=batchSize||chars+job.characters>1100){batches.push(batch);batch=[];chars=0;}batch.push(job);chars+=job.characters;}if(batch.length)batches.push(batch);
let cursor=0,done=0;
async function worker(){while(cursor<batches.length){const batch=batches[cursor++],id=crypto.createHash('sha256').update(batch.map(j=>j.id).join('/')).digest('hex');
 const rawPath=`${dir}/batch-${id}.json`;let result;
 if(fs.existsSync(rawPath))result=JSON.parse(fs.readFileSync(rawPath));
 else{
  const response=await fetch('https://api.elevenlabs.io/v1/text-to-dialogue/with-timestamps?output_format=mp3_44100_128',{method:'POST',headers:{'xi-api-key':key,'Content-Type':'application/json'},body:JSON.stringify({inputs:batch.map(j=>({text:j.text,voice_id:plan.voiceId})),model_id:plan.model,language_code:'en',apply_text_normalization:'off',seed:4271}),signal:AbortSignal.timeout(180000)});
  if(!response.ok){const error=await response.json().catch(()=>({}));throw Error(`ElevenLabs HTTP ${response.status}: ${String(error.detail?.message||error.detail?.status||'request rejected').slice(0,250)}`);}
  result=await response.json();fs.writeFileSync(rawPath,JSON.stringify(result));
 }
 assert.ok(result.audio_base64&&result.voice_segments,'Missing audio/timestamps');fs.writeFileSync(`${dir}/batch-${id}.mp3`,Buffer.from(result.audio_base64,'base64'));
 for(const [i,job] of batch.entries()){
  const segments=result.voice_segments.filter(s=>s.dialogue_input_index===i);assert.ok(segments.length,`No segment for input ${i}; cached response retained`);
  const start=Math.min(...segments.map(s=>s.start_time_seconds)),end=Math.max(...segments.map(s=>s.end_time_seconds));assert.ok(end>start&&end-start<60,job.text);
  fs.writeFileSync(`${dir}/${job.id}.json`,JSON.stringify({...job,source:`${dir}/batch-${id}.mp3`,start,end,segments},null,2));
 }
 done+=batch.length;console.log(`Saved ${done}/${jobs.length} pieces; batch characters ${batch.reduce((n,j)=>n+j.characters,0)}`);
}}
await Promise.all(Array.from({length:workers},worker));console.log('Roger generation queue finished. Existing runtime audio index unchanged.');
