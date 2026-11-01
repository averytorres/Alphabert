// Build a reviewable migration queue without generating audio or spending credits.
import fs from 'node:fs';import crypto from 'node:crypto';
const hash=text=>crypto.createHash('sha256').update(text).digest('hex');
const normalize=text=>text.replace(/\s+/g,' ').trim().toLowerCase();
const index=JSON.parse(fs.readFileSync('audio/index.json')).clips;
const prepared=JSON.parse(fs.readFileSync('.speech-cache/plan.json')).jobs;
const display=new Map(prepared.map(j=>[normalize(j.displayText||j.text),j.displayText||j.text]));
const corpus=new Map(Object.entries(index).filter(([key])=>!key.includes(':')));
for(const job of prepared){const key=normalize(job.displayText||job.text);if(!corpus.has(key))corpus.set(key,null);}
const jobs=[...corpus].filter(([key])=>!/^[a-z]$/.test(key)).map(([key,previousFile])=>{
 const text=display.get(key)||key;
 return {key,text,characters:text.length,id:hash('eleven_v4/Roger/'+text),previousFile};
});
const plan={version:1,model:'eleven_v4',voice:'Roger - Laid-Back, Casual, Resonant',status:'prepared-not-generated',characters:jobs.reduce((n,j)=>n+j.characters,0),notes:'One output per phrase avoids cutting narration from long batches. Letter names, isolated phonics, and blends remain in the separately reviewed bank. Existing narration stays available until the complete queue has been generated and validated. No credentials are stored in this plan.',jobs};
fs.mkdirSync('.elevenlabs-cache',{recursive:true});fs.writeFileSync('.elevenlabs-cache/narration-plan.json',JSON.stringify(plan,null,2)+'\n');
console.log(`${jobs.length} narration/word recordings; ${plan.characters} input characters. No audio generated and no credits spent.`);
