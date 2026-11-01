import {shuffle} from './core.js';
const spellings={a:['a'],ay:['a','ai','ay'],ai:['ai','a','ay'],b:['b','bb'],k:['ck','c','k','ch'],d:['d','dd'],e:['e','ea'],eh:['e'],ee:['ee','ea','e','y','i'],f:['ph','ff','f'],g:['gg','g'],h:['h'],i:['i','y'],igh:['igh','i','y'],eye:['igh','i','y'],j:['dge','dg','j','g'],l:['ll','l'],m:['mm','m'],n:['nn','kn','n'],o:['o','a'],ah:['o','a'],oa:['oa','ow','o'],oh:['oa','ow','o'],oo:['oo','ue','ew','u'],p:['pp','p'],r:['rr','wr','r'],s:['ss','ce','s','c'],t:['tt','t'],u:['u','o','ou'],uh:['u','o'],ue:['ue','ew','u'],yoo:['ue','ew','u'],v:['ve','v'],w:['wh','w'],y:['y'],z:['z','s','x'],sh:['sh','ti','ci'],ch:['tch','ch'],th:['th'],ng:['ng','n'],kw:['qu'],qu:['qu'],ks:['x','ks'],or:['ore','oor','or','ar'],ar:['ar'],er:['ear','er','ir','ur','or'],ow:['ow','ou'],oi:['oi','oy'],air:['air','are'],ear:['ear','eer'],aw:['aw','au','a'],schwa:['a','e','i','o','u']};
const letterSound=c=>({c:'k',q:'kw',x:'ks'})[c]||c;
export function alignBlendWord(word){
 const name=word.word.toLowerCase(),sounds=word.phonemes;
 function visit(at,index){
  if(index===sounds.length)return at===name.length||name.slice(at)==='e'?[]:null;
  for(const spelling of spellings[sounds[index]]||[sounds[index]])if(name.startsWith(spelling,at)){const rest=visit(at+spelling.length,index+1);if(rest)return [{start:at,end:at+spelling.length,sound:sounds[index]},...rest];}
  return null;
 }
 // A written q can be represented by separate k/w tokens in older word packs.
 if(name.startsWith('qu')&&sounds[0]==='k'&&sounds[1]==='w'){
  const rest=alignBlendWord({...word,word:name.slice(2),phonemes:sounds.slice(2)});
  if(rest)return [{start:0,end:1,sound:'k'},{start:1,end:2,sound:'w'},...rest.map(p=>({...p,start:p.start+2,end:p.end+2}))];
 }
 return visit(0,0);
}
export function makeBlendChoices(word,blend){
 const length=blend.text.length,alignment=alignBlendWord(word),boundaries=new Set(alignment?.flatMap(p=>[p.start,p.end])||[]),seen=new Set([blend.text]);
 const soundsFor=(start,text)=>alignment?alignment.filter(p=>p.start<start+text.length&&p.end>start).map(p=>p.sound):[...text].map(letterSound);
 const correct={text:blend.text,start:blend.start,sounds:soundsFor(blend.start,blend.text),fromWord:true,correct:true},candidates=[];
 for(let start=0;start<=word.word.length-length;start++){const text=word.word.slice(start,start+length);if(seen.has(text))continue;seen.add(text);candidates.push({text,start,sounds:soundsFor(start,text),fromWord:true,strict:!!alignment&&boundaries.has(start)&&boundaries.has(start+length)});}
 candidates.sort((a,b)=>Number(b.strict)-Number(a.strict)||Math.abs(a.start-blend.start)-Math.abs(b.start-blend.start));
 const selected=candidates.slice(0,2);
 // Three-letter words have only two adjacent pairs. Add a similar legal blend.
 const extra=length===3?['str','spr','scr','spl','thr','shr']:blend.start===0?['bl','br','cl','cr','dr','fl','fr','gl','gr','pl','pr','sl','sm','sn','sp','st','sw','tr','tw']:['nt','nd','nk','mp','ft','st','lt','ct','sk','sp'];
 const related=shuffle(extra).filter(s=>!seen.has(s)).sort((a,b)=>{
  const score=s=>[...s].reduce((n,c,i)=>n+(c===blend.text[i]?4:0)+(word.word.includes(c)?1:0),0);
  return score(b)-score(a);
 });
 for(const text of related){if(selected.length===2)break;selected.push({text,start:0,sounds:[...text].map(letterSound),fromWord:false});}
 return shuffle([correct,...selected]);
}
export function installBlendHold({root=document,onPreview,delay=550,selector='.blend-answers button[data-answer]'}){
 let pending=null;const suppressed=new WeakSet();
 const clear=()=>{if(pending){clearTimeout(pending.timer);pending.button.classList.remove('hearing-help');pending=null;}};
 const begin=(button,details)=>{const press=pending={button,...details,fired:false};press.timer=setTimeout(()=>{if(pending!==press||!button.isConnected||button.disabled)return;press.fired=true;if(press.pointerId!==undefined)suppressed.add(button);button.classList.add('hearing-help');onPreview(button.dataset.answer);},delay);};
 root.addEventListener('pointerdown',e=>{clear();if(!e.isPrimary||e.button!==0)return;const button=e.target.closest(selector);if(!button||button.disabled)return;suppressed.delete(button);begin(button,{pointerId:e.pointerId,x:e.clientX,y:e.clientY});});
 root.addEventListener('pointermove',e=>{if(pending?.pointerId===e.pointerId&&Math.hypot(e.clientX-pending.x,e.clientY-pending.y)>12){suppressed.add(pending.button);clear();}});
 for(const name of ['pointerup','pointercancel'])root.addEventListener(name,e=>{if(pending?.pointerId===e.pointerId)clear();});
 root.addEventListener('click',e=>{const button=e.target.closest(selector);if(button&&e.detail!==0&&suppressed.has(button)){suppressed.delete(button);e.preventDefault();e.stopImmediatePropagation();}},true);
 root.addEventListener('keydown',e=>{const button=e.target.closest(selector);if(!button||button.disabled||!['Enter',' '].includes(e.key))return;e.preventDefault();if(e.repeat)return;clear();begin(button,{key:e.key});},true);
 root.addEventListener('keyup',e=>{if(pending?.key!==e.key)return;e.preventDefault();const {button,fired}=pending;clear();if(!fired&&button.isConnected&&!button.disabled)button.click();},true);
 root.addEventListener('contextmenu',e=>{if(e.target.closest(selector))e.preventDefault();});
 root.addEventListener('visibilitychange',clear);window.addEventListener('blur',clear);window.addEventListener('scroll',clear,{passive:true});
}
