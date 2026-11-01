import init from '../tools/phonics/node_modules/@echogarden/espeak-ng-emscripten/espeak-ng.js';
export const SOUNDS={
 a:['ant','æ'],ay:['ape','eɪ'],b:['cab','b'],k:['king','k'],d:['bed','d'],e:['egg','ɛ'],ee:['eel','i'],f:['fan','f'],g:['bag','ɡ'],h:['hat','h'],
 i:['ink','ɪ'],igh:['ice','aɪ'],j:['jam','dʒ'],l:['leaf','l'],m:['map','m'],n:['net','n'],o:['ox','ɑ'],oa:['oak','oʊ'],oo:['moon','u'],
 p:['cap','p'],r:['red','ɹ'],s:['sun','s'],t:['cat','t'],u:['up','ʌ'],ue:['unit','ju'],v:['van','v'],w:['web','w'],y:['yak','j'],z:['zoo','z'],
 sh:['ship','ʃ'],ch:['chip','tʃ'],th:['thin','θ'],ng:['sing','ŋ'],qu:['queen','kw'],ks:['box','ks'],or:['fork','ɔɹ'],ar:['car','ɑɹ'],er:['otter','əɹ'],
 ai:['ape','eɪ'],ow:['cow','aʊ'],oi:['boy','ɔɪ'],air:['chair','ɛɹ'],ear:['hear','ɪɹ'],eh:['egg','ɛ'],ah:['ox','ɑ'],uh:['up','ʌ'],aw:['ball','ɔ'],eye:['ice','aɪ'],oh:['oak','oʊ'],yoo:['unit','ju'],kw:['queen','kw'],schwa:['zebra','ə']
};
export const cleanIPA=s=>s.replace(/[ˈˌː\s]/g,'').replaceAll('ɾ','t').replaceAll('ɚ','əɹ');
export async function engine({rate=110}={}){const module=await init(),worker=new module.eSpeakNGWorker();worker.set_voice('en-us');worker.set_rate(rate);worker.set_pitch(48);return text=>{const chunks=[],events=[];worker.synthesize(text,(samples,ev)=>{if(samples?.length)chunks.push(Int16Array.from(samples));events.push(...ev);});const samples=new Int16Array(chunks.reduce((sum,c)=>sum+c.length,0));let offset=0;for(const c of chunks){samples.set(c,offset);offset+=c.length;}return {samples,events,phones:events.filter(e=>e.type==='phoneme'&&e.id),sampleRate:22050};};}
export function wav(samples,rate){const pcm=Buffer.alloc(samples.length*2);samples.forEach((s,i)=>pcm.writeInt16LE(s,i*2));const h=Buffer.alloc(44);h.write('RIFF');h.writeUInt32LE(36+pcm.length,4);h.write('WAVEfmt ',8);h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(1,22);h.writeUInt32LE(rate,24);h.writeUInt32LE(rate*2,28);h.writeUInt16LE(2,32);h.writeUInt16LE(16,34);h.write('data',36);h.writeUInt32LE(pcm.length,40);return Buffer.concat([h,pcm]);}
