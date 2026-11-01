import fs from 'node:fs';
export function readMidi(file){
 const data=fs.readFileSync(file);if(data.toString('ascii',0,4)!=='MThd')throw Error('Not MIDI '+file);const ppq=data.readUInt16BE(12),tracks=[];let cursor=8+data.readUInt32BE(4);
 while(cursor<data.length){const tag=data.toString('ascii',cursor,cursor+4),size=data.readUInt32BE(cursor+4);cursor+=8;if(tag!=='MTrk'){cursor+=size;continue;}const end=cursor+size,notes=[],active=new Map(),events=[];let tick=0,running=0,name='';
  const vlq=()=>{let n=0,b;do{b=data[cursor++];n=n*128+(b&127);}while(b&128);return n;};
  while(cursor<end){tick+=vlq();let status=data[cursor];if(status&128){cursor++;if(status<240)running=status;}else status=running;
   if(status===255){const type=data[cursor++],n=vlq(),bytes=data.subarray(cursor,cursor+n);cursor+=n;if(type===3)name=bytes.toString();events.push({tick,type,bytes:[...bytes]});continue;}
   if(status===240||status===247){cursor+=vlq();continue;}
   const kind=status>>4,channel=status&15,a=data[cursor++],b=kind===12||kind===13?0:data[cursor++],key=channel+':'+a;
   if(kind===9&&b>0){if(!active.has(key))active.set(key,[]);active.get(key).push({pitch:a,start:tick,velocity:b,channel});}
   if(kind===8||kind===9&&b===0){const queue=active.get(key),note=queue?.shift();if(note){notes.push({...note,end:tick});if(!queue.length)active.delete(key);}}
  }
  tracks.push({name,notes:notes.sort((a,b)=>a.start-b.start||b.pitch-a.pitch),events});cursor=end;
 }
 return {ppq,tracks};
}
if(process.argv[1]?.endsWith('read-midi.mjs')){const m=readMidi(process.argv[2]);console.log(JSON.stringify({ppq:m.ppq,tracks:m.tracks.map(t=>({name:t.name,count:t.notes.length,first:t.notes.slice(0,40).map(n=>({pitch:n.pitch,start:n.start/m.ppq,duration:(n.end-n.start)/m.ppq}))}))},null,2));}
