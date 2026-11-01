// Additive instrument voices: a clear fundamental, gentle upper partials, no samples.
export const INSTRUMENTS={
 piano:{partials:[1,.38,.16,.07],decay:true,attack:.008},
 marimba:{partials:[1,.16,.05],decay:true,attack:.006},
 flute:{partials:[1,.12,.035],attack:.045},
 clarinet:{partials:[1,0,.3,0,.12],attack:.025},
 harp:{partials:[1,.3,.13,.06,.025],decay:true,attack:.012},
 bells:{partials:[1,.3,.08,.12],decay:true,attack:.004},
 accordion:{partials:[1,.3,.24,.12,.08],attack:.035},
 organ:{partials:[1,.45,.16,.22],attack:.018},
 musicbox:{partials:[1,.08,.2,.04,.08],decay:true,attack:.005}
};
// Shared by live playback and the offline audio quality check.
export function scheduleMelody(context, output, song, nodes=[]) {
 const semitones={C:0,D:2,E:4,F:5,G:7,A:9,B:11};let offset=.15;
 for(const note of song.notes){
  const duration=note.duration*60/(song.tempo||125),at=context.currentTime+offset;
  const match=/^([A-G])(#|b)?(\d)$/.exec(note.note);
  if(match){
   const midi=(Number(match[3])+1)*12+semitones[match[1]]+(match[2]==='#'?1:match[2]==='b'?-1:0);
   const voice=INSTRUMENTS[song.instrument];
   if(voice){
    const envelope=context.createGain(),attack=Math.min(voice.attack,duration*.15);
    envelope.gain.setValueAtTime(0,at);envelope.gain.linearRampToValueAtTime(.66,at+attack);
    if(voice.decay){envelope.gain.exponentialRampToValueAtTime(.23,at+duration*.72);}
    else envelope.gain.setValueAtTime(.57,at+duration*.78);
    envelope.gain.exponentialRampToValueAtTime(.001,at+duration*.98);envelope.connect(output);
    const total=voice.partials.reduce((a,b)=>a+b,0),frequency=440*2**((midi-69)/12);
    voice.partials.forEach((level,i)=>{if(!level||frequency*(i+1)>context.sampleRate*.45)return;const osc=context.createOscillator(),gain=context.createGain();osc.type='sine';osc.frequency.value=frequency*(i+1);gain.gain.value=level/total;osc.connect(gain);gain.connect(envelope);nodes.push(osc);osc.start(at);osc.stop(at+duration);});
    offset+=duration;continue;
   }
   const oscillator=context.createOscillator(),envelope=context.createGain();
   oscillator.type='triangle';oscillator.frequency.value=440*2**((midi-69)/12);
   envelope.gain.setValueAtTime(0,at);envelope.gain.linearRampToValueAtTime(.58,at+.015);
   envelope.gain.setValueAtTime(.48,at+duration*.72);envelope.gain.exponentialRampToValueAtTime(.001,at+duration*.95);
   oscillator.connect(envelope);
   // A quiet octave makes the tune clearer on small phone speakers.
   const octave=context.createOscillator(),octaveLevel=context.createGain();
   nodes.push(oscillator,octave);
   octave.type='sine';octave.frequency.value=oscillator.frequency.value*2;octaveLevel.gain.value=.25;
   octave.connect(octaveLevel);octaveLevel.connect(envelope);envelope.connect(output);
   oscillator.start(at);oscillator.stop(at+duration);octave.start(at);octave.stop(at+duration);
  }
  offset+=duration;
 }
 return offset;
}
