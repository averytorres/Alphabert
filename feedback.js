import {scheduleMelody} from './music.js';
export const RESULT_TUNES={
 correct:[
  {tempo:120,notes:[['C5',.5],['E5',.5],['G5',.5],['C6',1],['E6',.5],['D6',.5],['C6',3]]},
  {tempo:120,notes:[['G4',.5],['C5',.5],['E5',1],['G5',.5],['E5',.5],['G5',1],['C6',2.5]]},
  {tempo:120,notes:[['F5',.75],['A5',.25],['C6',.75],['A5',.25],['G5',.5],['A5',.5],['F6',3.5]]},
  {tempo:120,notes:[['D5',.5],['F#5',.5],['A5',.5],['F#5',.5],['D6',1],['A5',.5],['D6',3]]},
  {tempo:120,notes:[['E5',.5],['G5',.5],['C6',.75],['G5',.25],['A5',.5],['B5',.5],['C6',3.5]]}
 ],
 incorrect:[
  {tempo:100,notes:[['A4',.75],['F4',.75],['E4',.5],['D4',1],['A3',.5],['D4',2]]},
  {tempo:100,notes:[['E5',.5],['C5',.5],['B4',1],['A4',.5],['E4',.5],['A4',2.5]]},
  {tempo:100,notes:[['D5',.75],['Bb4',.75],['A4',.5],['G4',1],['D4',.5],['G4',2]]},
  {tempo:100,notes:[['C5',.5],['Ab4',1],['G4',.5],['F4',.5],['C4',.5],['F4',2.5]]},
  {tempo:100,notes:[['B4',.75],['G4',.25],['A4',.5],['F#4',1],['E4',1],['E4',2]]}
 ],
 letter:[{tempo:160,notes:[['E5',.25],['G5',.25]]}]
};
export function scheduleResult(context,output,kind,nodes=[],variant=0){const tune=RESULT_TUNES[kind][variant];return scheduleMelody(context,output,{tempo:tune.tempo,notes:tune.notes.map(([note,duration])=>({note,duration}))},nodes);}
export class FeedbackPlayer{
 constructor(){this._volume=.75;this.context=null;this.pending=null;this.nodes=[];this.bags={};this.last={};}
 nextVariant(kind){
  if(!this.bags[kind]?.length){
   const bag=RESULT_TUNES[kind].map((_,i)=>i);
   for(let i=bag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}
   if(bag.length>1&&bag[0]===this.last[kind])[bag[0],bag[1]]=[bag[1],bag[0]];
   this.bags[kind]=bag;
  }
  return this.last[kind]=this.bags[kind].shift();
 }
 get volume(){return this._volume;}
 set volume(value){this._volume=Math.max(0,Math.min(1,Number(value)||0));if(this.gain&&this.context)this.gain.gain.setTargetAtTime(this._volume*.65,this.context.currentTime,.02);}
 stop(){if(this.pending)this.pending(false);for(const node of this.nodes){try{node.stop();node.disconnect();}catch{}}this.nodes=[];if(this.gain){this.gain.disconnect();this.gain=null;}}
 async play(kind){
  this.stop();if(this._volume===0)return true;
  const Context=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Context)return true;
  try{this.context??=new Context();this.context.resume().catch(()=>{});this.gain=this.context.createGain();this.gain.gain.value=this._volume*.65;this.gain.connect(this.context.destination);const seconds=scheduleResult(this.context,this.gain,kind,this.nodes,this.nextVariant(kind));
   return await new Promise(resolve=>{let done=false;const finish=completed=>{if(done)return;done=true;clearTimeout(timer);this.pending=null;resolve(completed);};const timer=setTimeout(()=>{finish(true);this.stop();},seconds*1000+50);this.pending=finish;});
  }catch{this.stop();return true;}
 }
}
