import {LETTER_NAMES} from './letter-pronunciation.mjs';
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const root=process.cwd(),original=JSON.parse(fs.readFileSync('.speech-cache/plan.json','utf8')),cacheRoot=path.join(root,'.speech-letter-cache'),modelRoot=path.join(cacheRoot,'model');fs.mkdirSync(modelRoot,{recursive:true});
for(const name of ['model.int8.onnx','voices.bin','tokens.txt','lexicon-gb-en.txt','lexicon-us-en.txt']){const target=path.join(modelRoot,name);if(!fs.existsSync(target))fs.copyFileSync(path.join(original.modelRoot,name),target);}
const names=LETTER_NAMES;
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');let lexicon=fs.readFileSync(path.join(original.modelRoot,'game-lexicon.txt'),'utf8');
const jobs=Object.entries(names).map(([letter,phones])=>{const text='bertletter'+letter;lexicon+=`\n${text} ${phones}`;const key=hash(`0/1.000/${text}`);return {key,text,source:hash(`letter-name-v1/${key}`),master:hash(`letter-name-v1/${key}`),voice:0};});fs.writeFileSync(path.join(modelRoot,'game-lexicon.txt'),lexicon+'\n');fs.writeFileSync(path.join(cacheRoot,'plan.json'),JSON.stringify({...original,modelRoot,cacheRoot,jobs,corpus:hash(JSON.stringify(jobs))},null,2));
