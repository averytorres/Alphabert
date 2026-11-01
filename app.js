import {BertieReactionPicker} from './bertie-reactions.js';
import {wordPicturePath} from './word-pictures.js';
import {songPicture} from './song-pictures.js';
import {installMenuHold} from './menu-help.js';
import {makeBlendChoices,installBlendHold} from './blend-choices.js';
import {icon,activityIcon} from './icons.js';
import {firstClue,CLUE_TEXT} from './context-hints.js';
import {CelebrationPicker,celebrationMarkup} from './celebrations.js';
import {ACTIVITIES,pick,shuffle,norm,validatePack,mergedWords,makeSearch} from './core.js';
import {scheduleMelody} from './music.js';
import {FeedbackPlayer} from './feedback.js';
const $=s=>document.querySelector(s), esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const robot=()=>`<div class="robot" role="button" tabindex="0" data-bertie aria-label="Play with Bertie"><div class="robot-performer"><i class="antenna"></i><div class="robot-head"><div class="face"><i class="eye"></i><i class="eye"></i><i class="mouth"></i></div></div><i class="arm"></i><i class="arm right"></i><div class="robot-body"><span>a</span></div><i class="leg"></i><i class="leg right"></i></div><i class="robot-shadow"></i></div>`;
const speech=new window.SpeechService();let base,lessons,words,custom=[],state={},roundToken=0,timers=[],music=null;
let activeNarrations=0;
async function runNarration(action){activeNarrations++;try{return await action();}finally{activeNarrations--;}}
async function explore(...args){return runNarration(()=>exploreNarration(...args));}
async function narrate(...args){return runNarration(()=>narrateNarration(...args));}
async function speakLetterAnswer(letters){return runNarration(async()=>{
 const token=roundToken,serial=resultSerial;await say('The answer is.');
 await speakLetterNames(letters,token,serial);
});}
async function speakLetterNames(letters,token=roundToken,serial=resultSerial){
 for(const letter of letters){if(token!==roundToken||serial!==resultSerial)return false;await speech.letter(letter);if(!await pauseBetweenSounds(180,token)||serial!==resultSerial)return false;}return true;
}
async function explainRobotLoss(){return runNarration(async()=>{
 const token=roundToken,serial=resultSerial,word=state.word.word,missing=[...state.missedLetters];
 const line=async text=>{if(token!==roundToken||serial!==resultSerial)return false;await say(text);return token===roundToken&&serial===resultSerial;};
 if(!await line('The word was.')||!await line(word)||!await line("Let's spell it.")||!await speakLetterNames(word,token,serial))return;
 if(missing.length&&(!await line('The missing letters were.')||!await speakLetterNames(missing,token,serial)))return;
 await line("Let's try again.");
});}
async function speakQuestionWord(...args){return runNarration(()=>speakQuestionWordNarration(...args));}
async function playSequence(...args){return runNarration(()=>playSequenceNarration(...args));}
let guessPreviewTimer=null;
const bertiePicker=new BertieReactionPicker();let bertieTimer=null,lastBertieTap=-Infinity;
function clearBertieReaction(){clearTimeout(bertieTimer);document.querySelectorAll('[data-bertie][data-reaction]').forEach(el=>{delete el.dataset.reaction;delete el.dataset.reactionId;});}
function playWithBertie(robot){
 const now=performance.now();if(now-lastBertieTap<500)return;lastBertieTap=now;
 clearBertieReaction();const reaction=bertiePicker.next();robot.dataset.reaction=reaction.motion;robot.dataset.reactionId=reaction.id;
 // Speak during idle play, while preserving narration (including gaps) and feedback.
 if(!document.body.classList.contains('talking')&&!activeNarrations&&!answerSounds.pending&&!state.listening&&!state.guessPreview){
  const token=roundToken,serial=resultSerial;clearTimeout(nextTimer);nextTimer=null;
  say(reaction.text).finally(()=>{if(token===roundToken&&serial===resultSerial&&state.solved)queueNext();});
 }
 bertieTimer=setTimeout(clearBertieReaction,3500);
}
installMenuHold({onDescribe:text=>{stop();say(text);}});
installBlendHold({onPreview:text=>{if(state.mode!=='blends'||state.solved)return;const choice=state.blendChoices.find(c=>c.text===text);if(!choice)return;stop();runNarration(()=>choice.correct?speech.blend(state.word,state.blend):speech.blend({id:'preview-'+state.word.id+'-'+text,word:text,phonemes:choice.sounds},{text,start:0}));}});
installBlendHold({selector:'.odd-answers button[data-answer]',onPreview:id=>{if(state.mode!=='groups'||state.solved)return;const word=[...state.group.same,state.group.odd].find(w=>w.id===id);if(!word)return;stop();runNarration(()=>speech.word(word));}});
let fitQueued=false;
function fitActivity(){
 if(fitQueued)return;fitQueued=true;
 requestAnimationFrame(()=>{fitQueued=false;const area=$('#play');if(!area)return;
  let stage=area.querySelector(':scope > .play-content');if(!stage){stage=document.createElement('div');stage.className='play-content';while(area.firstChild)stage.appendChild(area.firstChild);area.appendChild(stage);}
  const landscape=innerWidth>innerHeight&&innerHeight<=600;
  let cue=stage.querySelector(':scope > .keyboard-cue');
  if(landscape&&stage.querySelector('.keyboard')){
   if(!cue){cue=document.createElement('div');cue.className='keyboard-cue';stage.prepend(cue);}
   if(state.mode==='words'){const parts=cue.querySelector('.sound-parts')||stage.querySelector('#explore .sound-parts');if(parts)stage.appendChild(parts);}
   if(state.mode==='blends'){const choices=cue.querySelector(':scope > .choices')||stage.querySelector(':scope > .choices');if(choices){choices.classList.add('blend-choices');if(choices.parentElement===cue)stage.appendChild(choices);}}
   for(const child of [...stage.children])if(child!==cue&&!child.matches('.keyboard,#guess-keys,.toolbar,.feedback,.blend-choices,.sound-parts'))cue.appendChild(child);
  }else if(cue){for(const child of [...cue.children])stage.insertBefore(child,cue);cue.remove();const choices=stage.querySelector('.blend-choices');if(choices){stage.insertBefore(choices,stage.querySelector(':scope > .keyboard'));choices.classList.remove('blend-choices');}}
  if(!landscape){const parts=stage.querySelector(':scope > .sound-parts'),explore=stage.querySelector('#explore');if(parts&&explore)explore.insertBefore(parts,explore.querySelector('.prompt-small'));}
  let songCue=stage.querySelector(':scope > .song-cue');
  if(landscape&&state.mode==='songs'&&stage.querySelector('.song-grid')){if(!songCue){[...stage.children].forEach((child,i)=>child.dataset.songOrder=i);songCue=document.createElement('div');songCue.className='song-cue';stage.prepend(songCue);}for(const child of [...stage.children])if(child!==songCue&&!child.matches('.song-grid,.song-pages'))songCue.appendChild(child);}
  else if(songCue){for(const child of [...songCue.children])stage.insertBefore(child,songCue);songCue.remove();for(const child of [...stage.children].sort((a,b)=>Number(a.dataset.songOrder)-Number(b.dataset.songOrder)))stage.appendChild(child);}
  if(landscape){stage.style.transform='none';return;}
  stage.style.transform='none';const style=getComputedStyle(area),available=area.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom);const scale=Math.min(1,available/Math.max(1,stage.scrollHeight));stage.style.transform=`scale(${scale})`;
 });
}
new MutationObserver(fitActivity).observe($('#main'),{childList:true,subtree:true});window.addEventListener('resize',fitActivity);window.visualViewport?.addEventListener('resize',fitActivity);
let progress={stars:0,played:{}};try{progress=JSON.parse(localStorage.getItem('alphabert-progress'))||progress;custom=JSON.parse(localStorage.getItem('alphabert-custom'))||[];if(custom.length)validatePack({schemaVersion:1,words:custom});}catch{custom=[];}
if(!Number.isInteger(progress.stars)||!progress.played)progress={stars:0,played:{}};
let prefs={speech:true,rate:.85,motion:false,musicVolume:.85,feedbackVolume:.75};try{Object.assign(prefs,JSON.parse(localStorage.getItem('alphabert-prefs'))||{});}catch{}
$('#home .brand-mark').innerHTML=icon('home');$('#grownups').innerHTML=icon('grownups');
const answerSounds=new FeedbackPlayer();answerSounds.volume=prefs.feedbackVolume;let resultSerial=0,nextTimer=null;
function cancelAnswerSound(){clearTimeout(nextTimer);nextTimer=null;resultSerial++;answerSounds.stop();}
function queueNext(){
 clearTimeout(nextTimer);if(!state.solved||!$('#next'))return;
 const token=roundToken,serial=resultSerial;
 nextTimer=setTimeout(()=>{nextTimer=null;if(token===roundToken&&serial===resultSerial&&state.solved&&$('#next'))makeRound();},1200);
}
async function finishRoundSound(kind,after){if(await resultSound(kind,after))queueNext();}
async function resultSound(kind,after){const id=++resultSerial,token=roundToken;speech.stop();const completed=await answerSounds.play(kind);if(!completed||id!==resultSerial||token!==roundToken)return false;if(after)await after();return id===resultSerial&&token===roundToken;}
let musicGain=null;
function musicVolume(value){prefs.musicVolume=Math.max(0,Math.min(1,Number(value)||0));if(musicGain&&music)musicGain.gain.setTargetAtTime(prefs.musicVolume,music.currentTime,.025);save();}
function renderSongMenu(page=0){
 state.songPage=Math.max(0,Math.min(Math.ceil(lessons.songs.length/6)-1,page));const first=state.songPage*6;
 $('#play').innerHTML=prompt('A pocketful of melodies','Choose a song, or press its letter on your keyboard.')+`<div class="song-grid">${lessons.songs.slice(first,first+6).map((s,i)=>`<button class="song-card" data-song="${first+i}"><span class="song-label"><span class="song-letter">${esc(s.letter?.toUpperCase()||'♫')}</span><span class="song-title">${esc(s.title)}</span></span>${songPicture(s.id)}</button>`).join('')}</div><div class="song-pages"><button class="secondary" id="song-prev" ${first===0?'disabled':''}>${icon('previous')}<span>Previous</span></button><span>${state.songPage+1} / ${Math.ceil(lessons.songs.length/6)}</span><button class="secondary" id="song-next" ${first+6>=lessons.songs.length?'disabled':''}>${icon('next')}<span>More songs</span></button></div><div class="song-now"><div class="song-robot">${robot()}</div><div id="song-lyrics" class="prompt-small">Bertie is ready to dance!</div></div><label class="music-volume" for="music-volume">Music volume <input id="music-volume" type="range" min="0" max="100" value="${Math.round(prefs.musicVolume*100)}" aria-label="Music volume"><output id="music-percent">${Math.round(prefs.musicVolume*100)}%</output></label><div class="toolbar"><button class="secondary" id="stop-song">${icon('stop')}<span>Stop music</span></button><button class="secondary" id="hint">${icon('help')}<span>Help me</span></button></div><div class="feedback" id="feedback" role="status"></div>`;
 $('#music-volume').oninput=e=>{musicVolume(e.target.value/100);$('#music-percent').textContent=e.target.value+'%';};
}
speech.enabled=prefs.speech;speech.rate=prefs.rate;document.body.classList.toggle('reduce-motion',prefs.motion);
window.addEventListener('speech-state',e=>document.body.classList.toggle('talking',e.detail));
window.addEventListener('phoneme-unavailable',e=>feedback(`This sound needs a recording: ${e.detail}`,false));
function save(){try{localStorage.setItem('alphabert-progress',JSON.stringify(progress));localStorage.setItem('alphabert-prefs',JSON.stringify(prefs));}catch{}$('#stars').textContent=`★ ${progress.stars}`;$('#sound').innerHTML=icon(speech.enabled?'sound':'muted');$('#sound').setAttribute('aria-label',speech.enabled?'Turn voice off':'Turn voice on');$('#sound').setAttribute('aria-pressed',String(speech.enabled));}
function stop(){finishGuessPreview();clearBertieReaction();cancelAnswerSound();$('#confetti').replaceChildren();document.body.classList.remove('music-playing');roundToken++;speech.stop();timers.forEach(clearTimeout);timers=[];if(music){music.close();music=null;}}
function later(fn,ms){timers.push(setTimeout(fn,ms));}
function say(text){state.spoken=text;return speech.say(text);}
async function pauseBetweenSounds(ms,token){await new Promise(r=>setTimeout(r,ms));return token===roundToken;}
async function narrateNarration(parts,token=roundToken){for(const text of parts){if(token!==roundToken)return;await say(text);}}
async function replay(){
 const token=roundToken,playing=replayPrompt(),serial=resultSerial;await playing;if(token===roundToken&&serial===resultSerial)queueNext();
}
async function replayPrompt(){
 cancelAnswerSound();
 if(state.mode==='memory')return playSequence();
 if(state.mode==='hangman'&&!state.solved)return showGuessPreview();
 if(state.mode==='hangman'&&state.solved&&state.chances<=0)return explainRobotLoss();
 if(['letters','sounds','words'].includes(state.mode)&&state.lastLetter)return explore(state.lastLetter,true);
 if(state.question){await speakQuestionWord();return;}
 return say(state.spoken||'Press a letter to begin.');
}
async function explainAnswer(){
 const token=roundToken;
 if(state.mode==='order')return narrate([state.question.replace('What letter',`The letter ${state.answer.toUpperCase()}`).replace('?','.'),'Great job!'],token);
 if(['missing','vowels'].includes(state.mode))return narrate([`${state.answer.toUpperCase()} is the missing ${state.mode==='vowels'?'vowel':'letter'} in ${state.word.word}.`,'Great job!'],token);
 if(state.mode==='rhymes')return narrate([`${state.other.word} rhymes with ${state.word.word}.`,'Great job!'],token);
 if(state.mode==='blends'){await speech.blend(state.word,state.blend);if(token!==roundToken)return;await say('Great job!');if(token!==roundToken)return;for(const c of state.blend.text){if(token!==roundToken)return;await speech.letter(c);}if(token===roundToken)await say(`${state.blend.start===0?'Beginning':'Ending'} blend in ${state.word.word}.`);return;}
 if(['scramble','catch'].includes(state.mode)){for(const c of state.word.word){if(token!==roundToken)return;await speech.letter(c);}if(token===roundToken)await say(state.word.word);return;}
 if(state.mode==='count')return narrate([String(state.count),'Great job!'],token);
 if(state.mode==='groups')return narrate([state.group.lesson.explanation,...state.group.same.map(w=>w.word),state.group.odd.word,state.group.lesson.oddExplanation,'Great job!'],token);
 if(state.mode==='hangman')return narrate([state.word.word,'Great job!'],token);
 return say('Great job!');
}
const celebrations=new CelebrationPicker();let celebrationSerial=0;
function confetti(){if(prefs.motion||matchMedia('(prefers-reduced-motion: reduce)').matches)return;const id=++celebrationSerial,kind=celebrations.next();$('#confetti').dataset.celebration=kind;$('#confetti').innerHTML=celebrationMarkup(kind);later(()=>{if(id===celebrationSerial)$('#confetti').replaceChildren();},2800);}
function feedback(text,good=true){const el=$('#feedback');if(el){el.textContent=text;el.classList.toggle('try',!good);}}
function win(text='Great job!',after){if(state.solved)return;state.solved=true;if(state.mode==='hangman')renderGuess();progress.stars++;progress.played[state.mode]=(progress.played[state.mode]||0)+1;save();feedback(text);finishRoundSound('correct',after||(()=>text==='Great job!'?explainAnswer():say(text)));confetti();$('#next')?.focus({preventScroll:true});}
async function wrong(){feedback("Let's try again.",false);const token=roundToken;return resultSound('incorrect',async()=>{await say("Let's try again.");if(token===roundToken&&!state.solved&&state.question&&!['memory','hangman','catch','scramble'].includes(state.mode))await speakQuestionWord();});}
function getWord(id){return words.find(w=>w.id===id);}
function edgeBlends(word){return (word.blends||[]).filter(b=>b.start===0||b.start+b.text.length===word.word.length);}

function wordFor(letter){return pick(words.filter(w=>w.letter.toLowerCase()===letter));}
function picture(w){const path=wordPicturePath(w);return path?'<img class="word-picture" src="'+path+'" alt="">':esc(w?.emoji||'✦');}
function keyboard(handler,used=[]){return `<div class="keyboard" aria-label="Letter keyboard">${[...'abcdefghijklmnopqrstuvwxyz'].map(c=>`<button class="key ${'aeiou'.includes(c)?'vowel':''} ${used.includes(c)?'used':''}" data-${handler}="${handler==='memory'?esc(wordForDisplay(c)?.id||c):c}" aria-label="Uppercase ${c.toUpperCase()}, lowercase ${c}, for ${esc(wordForDisplay(c)?.word||c)}" ${used.includes(c)?'disabled':''}><span class="key-letters" aria-hidden="true"><span class="key-upper">${c.toUpperCase()}</span><span class="key-lower">${c}</span></span><small aria-hidden="true">${picture(wordForDisplay(c))}</small></button>`).join('')}</div>`;}
function wordForDisplay(c){return words.find(w=>w.letter.toLowerCase()===c);}
function tiles(text,hidden=[]){return `<div class="tiles">${[...text].map((c,i)=>`<span class="tile ${hidden.includes(i)?'blank':''}">${hidden.includes(i)?'·':esc(c)}</span>`).join('')}</div>`;}
function tools(next=true){return `<div class="toolbar"><button class="secondary" id="repeat">${icon('hear')}<span>Hear again</span></button><button class="secondary" id="hint">${icon('help')}<span>Help me</span></button>${next?`<button class="primary" id="next">${icon('next')}<span>Next</span></button>`:''}</div><div class="feedback" id="feedback" role="status" aria-live="polite"></div>`;}
function art(w){return `<button type="button" class="word-art hear-word" data-word-say="${esc(w.id)}" aria-label="Hear ${esc(w.word)}">${picture(w)}</button>`;}
function prompt(text,sub=''){return `<h2 class="prompt">${esc(text)}</h2>${sub?`<div class="prompt-small">${esc(sub)}</div>`:''}`;}
function home(){delete document.body.dataset.activity;document.body.classList.remove('playing');stop();state={};$('#main').innerHTML=`<section class="hero"><div><span class="eyebrow">A LITTLE PLAY. A LOT OF POSSIBILITY.</span><h1>Hello, little<br><em>word explorer.</em></h1><p>Letters become sounds. Sounds become words.<br>Let’s discover them together with Bertie.</p><button class="primary" data-mode="random" aria-label="Play a random activity">${icon('play')}<span>Let’s play</span></button></div><div class="hero-art">${robot()}<span class="orbit">Aa</span><span class="orbit two">B</span><span class="orbit three">✦</span></div></section><div class="section-heading"><h2>Pick a little adventure</h2><span>16 ways to learn & play</span></div><section class="activities" aria-label="Learning activities">${ACTIVITIES.map((a,i)=>`<button class="activity-card" data-mode="${a.id}"><span class="card-number ${progress.played[a.id]?'done':''}">${progress.played[a.id]?'★':String(i+1).padStart(2,'0')}</span><span class="activity-icon">${activityIcon(a.id)}</span><strong>${a.title}</strong><small>${a.subtitle}</small></button>`).join('')}</section><div class="home-note"><span style="font-size:28px">✦</span><span><b>Every little discovery counts.</b><br>No rush, no scores to beat. Just a friendly voice and room to grow.</span></div>`;save();}
function start(mode){document.body.dataset.activity=mode;document.body.classList.add('playing');window.scrollTo(0,0);stop();state={mode,hints:0,solved:false};const activity=ACTIVITIES.find(a=>a.id===mode);if(!activity)return home();$('#main').innerHTML=`<div class="game-top"><button class="back" id="back">${icon('home')}<span>All adventures</span></button><h1>${activity.title}</h1><div class="tiny-bertie">${robot()}</div><span class="progress-dots">${esc(activity.group)} · ★ ${progress.played[mode]||0}</span></div><div class="play-layout"><aside class="companion"><div class="companion-robot-frame">${robot()}</div><strong>Your pal, Bertie</strong><p>Take your time.<br>We’ll figure it out together.</p><span class="badge">CURIOUS IS CLEVER</span></aside><section class="play-area" id="play"></section></div>`;makeRound();}
function makeRound(blendWord=null){const mode=state.mode;stop();state={mode,hints:0,solved:false,blendWord};const p=$('#play');if(!p)return;
 if(['letters','sounds','words'].includes(mode)){
  const intro={letters:"Let's learn the letters. Press a letter.",sounds:"Let's learn the sounds of letters. Press a letter.",words:"Let's sound out some words. Press a letter."}[mode];
  p.innerHTML=prompt('A whole alphabet to explore','Tap a letter. Bertie will tell you about it.')+`<div id="explore"><div class="big-letter">Aa</div><div class="prompt-small">Your adventure starts with a tap.</div></div>`+keyboard('explore')+tools(false);say(intro);return;
 }
 if(mode==='order'){
  const before=Math.random()<.5,index=before?1+Math.floor(Math.random()*25):Math.floor(Math.random()*25);state.answer=String.fromCharCode(97+index+(before?-1:1));state.question=`What letter comes ${before?'before':'after'} ${String.fromCharCode(65+index)}?`;
  p.innerHTML=prompt(state.question)+`<div class="big-letter">${before?'?':String.fromCharCode(65+index)} <span style="color:#d6b75e">→</span> ${before?String.fromCharCode(65+index):'?'}</div>`+keyboard('answer')+tools();say(state.question);return;
 }
 if(mode==='missing'||mode==='vowels'){
  state.word=pick(words.filter(w=>w.word.length<=7&&(mode!=='vowels'||/[aeiou]/.test(w.word))));const indices=[...state.word.word].flatMap((c,i)=>mode==='missing'||'aeiou'.includes(c)?[i]:[]);state.index=pick(indices);state.answer=state.word.word[state.index];state.question=mode==='vowels'?'Find the missing vowel.':'Find the missing letter.';
  p.innerHTML=prompt(state.question)+art(state.word)+tiles(state.word.word,[state.index])+keyboard('answer')+tools();if(mode==='vowels')narrate(['A, E, I, O, and U are vowels.',missingVowelPrompt()]);else speakQuestionWord();return;
 }
 if(mode==='rhymes'){
  const families=lessons.rhymes.map(f=>f.words.map(getWord).filter(Boolean)).filter(f=>f.length>=2);if(!families.length)return unavailable('Add a rhyme family in content/lessons.json.');const pair=shuffle(pick(families));state.other=pair[0];state.word=pair[1];state.index=Math.floor(Math.random()*state.word.word.length);state.answer=state.word.word[state.index];state.question=`Find the missing letter in ${state.word.word}.`;
  const hearPicture=(w,label)=>`<button type="button" class="word-art hear-word" data-word-say="${esc(w.id)}" aria-label="Hear ${esc(w.word)}${label}">${picture(w)}</button>`;
  p.innerHTML=prompt('Let’s make a rhyming pair')+`<div class="choices rhyme-pair"><div class="rhyme-card rhyme-reference"><span class="rhyme-label">Rhymes with</span>${hearPicture(state.other,'') }<strong>${esc(state.other.word)}</strong></div><div class="rhyme-card rhyme-target" aria-label="Word to finish: ${esc(state.word.word)}"><span class="rhyme-label"><span aria-hidden="true">↓</span> Finish this word</span>${hearPicture(state.word,', word to finish')}${tiles(state.word.word,[state.index]).replace('>·</span>','>?</span>')}</div></div>`+keyboard('answer')+tools();speakQuestionWord();return;
 }
 if(mode==='blends'){
  state.word=state.blendWord||pick(words.filter(w=>edgeBlends(w).length));if(!state.word)return unavailable('Add words with beginning or ending blends to play.');state.blend={...pick(edgeBlends(state.word))};state.answer=state.blend.text;state.question='Choose the letters that make the blend.';
  const beginning=state.blend.start===0;state.blendChoices=makeBlendChoices(state.word,state.blend);state.blend.sounds=state.blendChoices.find(c=>c.correct).sounds;
  p.innerHTML=`<div class="blend-prompt">${prompt('Be a blend detective')}${art(state.word)}${tiles(state.word.word)}<div class="prompt-small">Find the ${beginning?'beginning':'ending'} blend.</div></div><div class="blend-answer-panel"><h3>Choose the blend</h3><div class="choices blend-answers">${state.blendChoices.map(s=>`<button class="choice ${s.text.length>2?'long-blend':''}" data-answer="${esc(s.text)}" aria-label="${esc([...s.text].join(' ').toUpperCase())}. Tap to choose; hold to hear."><span>${esc(s.text)}</span><span class="blend-listen">${icon('hear')}</span></button>`).join('')}</div></div>`+tools();speakQuestionWord();return;
 }
 if(mode==='groups'){
  const pools=(lessons.pictureGroups||[]).map(lesson=>({lesson,words:lesson.words.map(getWord).filter(Boolean)})).filter(p=>p.words.length>=2);const pool=pick(pools);if(!pool)return unavailable('Add clear picture groups in content/lessons.json.');const same=shuffle(pool.words).slice(0,2),odd=pick(pools.filter(p=>p!==pool).flatMap(p=>p.words));if(!odd)return unavailable('Add a second picture group to play.');state.group={same,odd,lesson:pool.lesson};state.answer=odd.id;state.question='Which picture does not belong?';
  p.innerHTML=prompt(state.question)+`<div class="choices odd-answers">${shuffle([...same,odd]).map(w=>`<button class="choice" data-answer="${esc(w.id)}" aria-label="${esc(w.word)}. Tap to choose; hold to hear."><span class="choice-emoji">${picture(w)}</span><small>${esc(w.word)}</small></button>`).join('')}</div><p class="prompt-small">Two pictures are in the same group.</p>`+tools();say(state.question);return;
 }
 if(mode==='scramble'||mode==='catch'){
  state.word=pick(words.filter(w=>w.word.length<=7));state.input='';state.question=mode==='scramble'?'Put the letters in order to spell the word.':'Catch the letters in order to spell the word.';state.letters=shuffle([...state.word.word]);
  p.innerHTML=prompt(mode==='scramble'?'A little letter mix-up':'Catch a little word')+art(state.word)+`<div id="spelling">${tiles(state.word.word,[...state.word.word].map((_,i)=>i))}</div><div id="spelling-controls"></div>`+tools();renderSpelling();speakQuestionWord();return;
 }
 if(mode==='search'){
  const puzzle=makeSearch(shuffle(words.filter(w=>w.word.length>=3&&w.word.length<=5)).slice(0,4),5);Object.assign(state,puzzle,{found:[],selected:null,searchPath:[],question:'Find the hidden words. Tap every letter of a word in order.'});
  p.innerHTML=prompt('Hidden in plain sight','Tap each letter in order. Words go right or down.')+`<div id="search-count" class="progress-dots">0 / ${state.placed.length} found</div><div class="search-words">${state.placed.map((w,i)=>`<button class="search-word" id="search-word-${i}" data-search-say="${i}" aria-label="Hear ${esc(w.word.word)}"><span aria-hidden="true">${picture(w.word)}</span><span>${esc(w.word.word)}</span></button>`).join('')}</div><div class="search-grid" style="grid-template-columns:repeat(5,1fr)">${state.grid.flatMap((row,y)=>row.map((c,x)=>`<button class="search-cell" data-cell="${y},${x}" aria-label="Row ${y+1}, column ${x+1}, ${c}">${c}</button>`)).join('')}</div>`+tools();say(state.question);return;
 }
 if(mode==='hangman'){
  state.word=pick(words.filter(w=>w.word.length<=7));state.used=[];state.chances=10;state.question='Guess the word. Choose a letter.';p.innerHTML=prompt('A mystery word. A new robot.','Watch the picture, then guess its letters.')+`<div id="guess-display"></div><div id="guess-keys"></div>`+tools();showGuessPreview();return;
 }
 if(mode==='memory'){
  state.pool=[...'abcdefghijklmnopqrstuvwxyz'].map(wordForDisplay).filter(Boolean);state.sequence=[pick(state.pool)];state.input=[];state.question='Listen to the objects, then tap them in the same order.';p.innerHTML=prompt('Follow the memory trail')+`<div class="prompt-small" id="memory-status">Listen to Bertie…</div><div class="sequence" id="sequence"></div>`+keyboard('memory')+tools(false)+`<div class="toolbar"><button class="secondary" id="memory-new">${icon('next')}<span>New trail</span></button></div>`;const trailButton=$('#memory-new'),trailRow=trailButton.parentElement;$('#play .toolbar').append(trailButton);trailRow.remove();playSequence(true);return;
 }
 if(mode==='count'){
  state.count=1+Math.floor(Math.random()*10);state.word=pick(words);state.answer=String(state.count);state.question='How many objects can you count?';const numbers=shuffle([state.count,...shuffle(Array.from({length:10},(_,i)=>i+1).filter(n=>n!==state.count)).slice(0,3)]);
  p.innerHTML=prompt(state.question)+`<div class="count-objects" role="group" aria-label="Pictures to count">${Array.from({length:state.count},()=>`<span>${picture(state.word)}</span>`).join('')}</div><div class="choices">${numbers.map(n=>`<button class="choice" data-answer="${n}">${n}</button>`).join('')}</div>`+tools();say(state.question);return;
 }
 if(mode==='songs'){
  renderSongMenu();say('Choose a song and sing along.');
 }
}
function unavailable(message){$('#play').innerHTML=prompt('A little more content needed',message)+tools();}
function missingVowelPrompt(){return 'Find the missing vowel in '+state.word.word+'.';}
async function speakQuestionWordNarration(){const token=roundToken;if(state.mode==='hangman')return say(state.question);if(state.mode==='vowels')return say(missingVowelPrompt());if(state.mode==='rhymes'){await say(`${state.other.word} rhymes with ${state.word.word}.`);if(token===roundToken)await say(state.question);return;}await say(state.question);if(token===roundToken&&state.word)await say(state.word.word);if(token===roundToken&&state.other)await say(state.other.word);if(token===roundToken&&state.mode==='blends'){await say('Listen to the blend.');if(token===roundToken)await speech.blend(state.word,state.blend);}}
async function exploreNarration(letter,repeating=false){
 const previous=state.lastLetter;stop();state.hints=0;const token=roundToken;let w=wordForDisplay(letter);if(!w)return;state.word=w;state.lastLetter=letter;
 if(state.mode==='letters'){
  const choices=words.filter(x=>x.letter.toLowerCase()===letter);state.exampleIndex=repeating?(state.exampleIndex||0):((previous===letter?state.exampleIndex:-1)+1)%choices.length;
  const vowelExamples='aeiou'.includes(letter)?lessons.letters.find(l=>l.letter===letter).sounds.map(s=>getWord(s.exampleId)).filter(Boolean):[];
  const examples=vowelExamples.length?vowelExamples:[choices[state.exampleIndex]];state.word=examples[0];
  $('#explore').innerHTML='<div class="big-letter">'+letter.toUpperCase()+letter+'</div><div class="choices">'+examples.map(v=>'<div><button type="button" class="word-art object-bounce hear-word" data-word-say="'+esc(v.id)+'" aria-label="Hear '+esc(v.word)+'">'+picture(v)+'</button><b>'+esc(v.word)+'</b></div>').join('')+'</div>';
  await say('This is the letter '+letter.toUpperCase()+'.');for(const v of examples){if(token!==roundToken)return;await say(letter.toUpperCase()+' is for '+v.word+'.');}
 }else if(state.mode==='sounds'){
  const lesson=lessons.letters.find(l=>l.letter.toLowerCase()===letter),sounds=lesson?.sounds||[{sound:w.phonemes[0],hint:w.phoneticHint||w.word,exampleId:w.id}];
  $('#explore').innerHTML='<div class="big-letter">'+letter.toUpperCase()+letter+'</div><div class="choices">'+sounds.map(s=>{const v=getWord(s.exampleId)||w,sound=s.sound||s.hint.split(/\s+as\s/)[0];return '<div><button type="button" class="word-art hear-word" data-letter-sound="'+esc(sound)+'" aria-label="Hear the sound in '+esc(v.word)+'">'+picture(v)+'</button><div>'+esc(s.hint)+'</div></div>';}).join('')+'</div>';
  await speech.letter(letter);if(token!==roundToken)return;await say('Listen to the sound.');
  for(const s of sounds){if(token!==roundToken)return;if(s.label==='short'||s.label==='long'){await say(s.label==='short'?'Short sound.':'Long sound.');if(token!==roundToken)return;}await speech.phoneme(s.sound||s.hint.split(/\s+as\s/)[0],{held:true});if(!await pauseBetweenSounds(350,token))return;await say((getWord(s.exampleId)||w).word);if(!await pauseBetweenSounds(300,token))return;}
 }else{
  $('#play .play-content > .sound-parts')?.remove();
  $('#explore').innerHTML=art(w)+'<div id="sound-tiles">'+tiles(w.word)+'</div><div class="sound-parts">'+w.phonemes.map((sound,i)=>'<button type="button" class="sound-chip" data-sound-index="'+i+'" aria-label="Hear the '+esc(sound==='schwa'?'uh':sound)+' sound">'+esc(sound==='schwa'?'uh':sound)+'</button>').join('')+'</div><div class="prompt-small">Tap a sound to hear it again.</div>';
  if(w.audio){await speech.word(w);}else for(const [i,sound] of w.phonemes.entries()){
   if(token!==roundToken)return;document.querySelectorAll('.sound-chip').forEach((el,n)=>el.classList.toggle('sound-active',n===i));
   await speech.phoneme(sound,{rate:1,wordId:w.id,index:i});if(!await pauseBetweenSounds(450,token))return;
  }
  if(token!==roundToken)return;document.querySelectorAll('.sound-chip').forEach(el=>el.classList.remove('sound-active'));await say(w.word);
 }
 if(token===roundToken){progress.played[state.mode]=(progress.played[state.mode]||0)+1;save();}
}
async function hearWordSound(index){
 if(state.mode!=='words'||!Number.isInteger(index)||!state.word?.phonemes[index])return;
 const sound=state.word.phonemes[index];stop();const token=roundToken;
 document.querySelectorAll('.sound-chip').forEach((el,i)=>el.classList.toggle('sound-active',i===index));
 await speech.phoneme(sound,{rate:1,wordId:state.word.id,index});
 if(token===roundToken)document.querySelectorAll('.sound-chip').forEach(el=>el.classList.remove('sound-active'));
}
function answer(value){if(state.solved)return;if(norm(value)===norm(state.answer)){if(['missing','vowels','rhymes'].includes(state.mode)){const t=$('#play .tiles');if(t)t.outerHTML=tiles(state.word.word);}win();}else wrong();}
function renderSpelling(){const {word,input,mode}=state;$('#spelling').innerHTML=tiles(input+word.word.slice(input.length),[...word.word].flatMap((_,i)=>i>=input.length?[i]:[]));if(mode==='scramble'){
 const remaining=[...word.word];for(const c of input){const i=remaining.indexOf(c);if(i>=0)remaining.splice(i,1);}$('#spelling-controls').innerHTML=`<div class="choices">${state.letters.map((c,i)=>{const available=remaining.includes(c);if(available)remaining.splice(remaining.indexOf(c),1);return `<button class="tile" data-spell="${c}" ${available&&!state.solved?'':'disabled'} aria-label="Letter ${c}">${c}</button>`;}).join('')}</div>`;
 }else{const next=word.word[input.length];$('#spelling-controls').innerHTML=state.solved?'':`<div class="catch-field" aria-label="Moving letter choices">${shuffle([...new Set([next,...shuffle([...'abcdefghijklmnopqrstuvwxyz'].filter(c=>c!==next)).slice(0,2)])]).map((c,i)=>`<button class="catch-letter" data-spell="${c}" style="animation-delay:-${i*2.3}s" aria-label="Catch ${c}">${c}</button>`).join('')}</div><div class="prompt-small">Tap the moving letter you need next. You can also use your keyboard.</div>`;}}
function spell(c){
 if(state.solved)return;
 if(state.mode==='catch'&&c!==state.word.word[state.input.length])return wrong();
 if(state.mode==='scramble'){const available=[...state.word.word];for(const used of state.input){const i=available.indexOf(used);if(i>=0)available.splice(i,1);}if(!available.includes(c))return wrong();}
 state.input+=c;renderSpelling();
 if(state.input.length===state.word.word.length){if(state.input===state.word.word){win();renderSpelling();}else{wrong();const token=roundToken,attempted=state.input;later(()=>{if(token===roundToken&&state.input===attempted&&!state.solved){state.input='';renderSpelling();}},900);}}
 else resultSound('letter',()=>speech.letter(c));
}
function finishGuessPreview(){
 clearTimeout(guessPreviewTimer);guessPreviewTimer=null;
 if(state.mode==='hangman'&&state.guessPreview){state.guessPreview=false;if($('#guess-display'))renderGuess();}
}
function showGuessPreview(){
 stop();state.guessPreview=true;renderGuess();const token=roundToken,narration=say("Watch the picture closely. It's your clue!");
 guessPreviewTimer=setTimeout(async()=>{guessPreviewTimer=null;await narration;if(token!==roundToken||state.mode!=='hangman')return;finishGuessPreview();say(state.question);},2300);
}
function renderGuess(){
 const visible=state.revealWord?state.word.word:[...state.word.word].map(c=>state.used.includes(c)?c:'·').join('');
 $('#guess-display').innerHTML='<div class="robot-stage '+(state.guessPreview?'previewing':'')+'" aria-label="'+(state.guessPreview?'Mystery picture clue':'Robot building area')+'">'+robot()+(state.guessPreview?'<div class="guess-preview"><button class="word-art hear-word" data-robot-clue aria-label="Watch the picture clue again"><span class="guess-clue-picture">'+picture(state.word)+'</span></button></div>':'')+'</div><div class="guess-status prompt-small">'+(state.guessPreview?'Watch the picture…':state.chances+' guesses left')+'</div><div id="guess-word">'+tiles(visible)+'</div>';
 const r=$('#guess-display .robot');r.style.margin='auto';const missed=10-state.chances;
 if(state.revealWord)$('#guess-word').querySelectorAll('.tile').forEach((tile,i)=>{if(state.missedLetters?.includes(state.word.word[i])){tile.classList.add('missed-letter');tile.setAttribute('aria-label','Missing letter '+state.word.word[i].toUpperCase());}});
 const parts=[['.robot-head',1],['.antenna',2],['.robot-body',3],['.arm:not(.right)',4],['.arm.right',5],['.leg:not(.right)',6],['.leg.right',7],['.mouth',8],['.robot-body span',9]];
 for(const [selector,at] of parts)r.querySelector(selector).style.visibility=missed>=at?'visible':'hidden';
 // The face and two eyes start visible; a faint head outline anchors them.
 r.querySelector('.robot-head').classList.toggle('bare',missed===0);r.querySelector('.robot-head').style.visibility='visible';r.querySelector('.robot-head').style.background=missed>=1?'':'transparent';r.querySelector('.robot-head').style.borderColor=missed>=1?'':'transparent';r.querySelector('.robot-head').style.boxShadow=missed>=1?'':'none';r.querySelector('.face').style.background=missed>=1?'':'transparent';r.querySelectorAll('.eye').forEach(e=>e.style.background=missed>=1?'':'#236451');
 $('#guess-keys').innerHTML=keyboard('guess',state.used);if(state.solved||state.guessPreview)$('#guess-keys').querySelectorAll('button').forEach(b=>b.disabled=true);
}
function guess(c){if(state.guessPreview||state.solved||state.used.includes(c))return;state.used.push(c);if(!state.word.word.includes(c))state.chances--;renderGuess();if([...state.word.word].every(c=>state.used.includes(c)))win();else if(state.chances<=0){state.solved=true;state.missedLetters=[...new Set(state.word.word)].filter(letter=>!state.used.includes(letter));feedback(`${state.word.word.toUpperCase()}. Missing: ${state.missedLetters.map(l=>l.toUpperCase()).join(' · ')}.`);state.revealWord=true;renderGuess();finishRoundSound('incorrect',explainRobotLoss);}else if(!state.word.word.includes(c))wrong();else resultSound('letter',()=>speech.letter(c));}
function resetSearchSelection(){state.searchPath=[];state.selected=null;document.querySelectorAll('.search-cell.selected').forEach(el=>el.classList.remove('selected'));}
function selectCell(value){
 if(state.solved)return;const cell=value.split(',').map(Number);if(cell.length!==2||!state.grid[cell[0]]?.[cell[1]])return;
 const same=(a,b)=>a[0]===b[0]&&a[1]===b[1],path=state.searchPath||[];
 if(path.length&&same(path.at(-1),cell))return;
 const matches=trial=>state.placed.flatMap((p,i)=>!state.found.includes(i)&&trial.length<=p.cells.length&&trial.every((c,n)=>same(c,p.cells[n]))?[i]:[]);
 let trial=[...path,cell],candidates=matches(trial);
 if(!candidates.length){trial=[cell];candidates=matches(trial);if(!candidates.length){resetSearchSelection();if(!path.length&&state.found.some(i=>state.placed[i].cells.some(c=>same(c,cell))))return;return wrong();}}
 resetSearchSelection();state.searchPath=trial;for(const c of trial)$('[data-cell="'+c.join(',')+'"]').classList.add('selected');
 const i=candidates.find(i=>state.placed[i].cells.length===trial.length);
 if(i===undefined){feedback(trial.map(c=>state.grid[c[0]][c[1]].toUpperCase()).join(' · '));cancelAnswerSound();speech.letter(state.grid[cell[0]][cell[1]]);return;}
 resetSearchSelection();state.found.push(i);$('#search-count').textContent=state.found.length+' / '+state.placed.length+' found';state.placed[i].cells.forEach(c=>$('[data-cell="'+c.join(',')+'"]').classList.add('found'));$('#search-word-'+i).classList.add('found');
 if(state.found.length===state.placed.length)win('Well done! You found all the words.',()=>narrate(['Well done! You found all the words.',...state.placed.map(p=>p.word.word)]));else{feedback('You got it!');resultSound('correct',()=>say(state.placed[i].word.word));}
}
async function hearSearchWord(index){
 if(state.mode!=='search'||!state.placed[index])return;
 const token=roundToken;cancelAnswerSound();const serial=resultSerial;
 await say(state.placed[index].word.word);
 if(token===roundToken&&serial===resultSerial)queueNext();
}
async function playSequenceNarration(intro=false){stop();const token=roundToken;state.listening=true;state.input=[];$('#sequence').innerHTML=state.showSequence?state.sequence.map(w=>'<span>'+picture(w)+'</span>').join(''):'';$('#memory-status').textContent='Listen to Bertie…';document.querySelectorAll('[data-memory]').forEach(b=>b.disabled=true);if(intro)await say(state.question);
 for(const w of state.sequence){if(token!==roundToken)return;$('#sequence').innerHTML=`<span>${picture(w)}</span>`;await say(w.word);if(token!==roundToken)return;await new Promise(resolve=>setTimeout(resolve,220));}
 if(token!==roundToken)return;$('#sequence').innerHTML=state.showSequence?state.sequence.map(w=>'<span>'+picture(w)+'</span>').join(''):'';$('#memory-status').textContent=`Your turn! ${state.sequence.length} ${state.sequence.length===1?'picture':'pictures'} to remember.`;state.listening=false;document.querySelectorAll('[data-memory]').forEach(b=>b.disabled=false);await say('Tap the pictures in order.');}
async function memoryTap(id){
 if(state.listening||state.solved)return;const w=getWord(id),token=roundToken;
 if(state.sequence[state.input.length].id!==id){
  $('#sequence').innerHTML=state.sequence.map(w=>'<span>'+picture(w)+'</span>').join('');state.input=[];state.sequence=[pick(state.pool)];state.hints=0;state.showSequence=false;state.listening=true;document.querySelectorAll('[data-memory]').forEach(b=>b.disabled=true);
  if(await wrong()&&token===roundToken)later(()=>playSequence(),400);return;
 }
 state.input.push(id);$('#sequence').insertAdjacentHTML('beforeend','<span>'+picture(w)+'</span>');
 if(state.input.length===state.sequence.length){
  progress.stars++;progress.played.memory=(progress.played.memory||0)+1;save();feedback('You remembered the whole sequence!');confetti();state.listening=true;document.querySelectorAll('[data-memory]').forEach(b=>b.disabled=true);state.hints=0;state.showSequence=false;state.sequence.push(pick(state.pool));
  if(await resultSound('correct',()=>say('You remembered the whole sequence!'))&&token===roundToken)later(()=>playSequence(),400);
 }else resultSound('letter',()=>say(w.word));
}
async function firstHint(){
 return runNarration(async()=>{
 if(state.mode!=='songs')stop();
 const token=roundToken,serial=resultSerial,plan=firstClue(state,{playingMusic:document.body.classList.contains('music-playing'),letterSoundCount:lessons.letters.find(l=>l.letter===state.lastLetter)?.sounds.length||1});feedback(plan.text);
 if(plan.markBlank)$('#play .tile.blank')?.classList.add('hint-target');
 if(plan.anchorLetter)$(`[data-answer="${plan.anchorLetter}"]`)?.classList.add('hint-anchor');
 await say(plan.text);if(token!==roundToken||serial!==resultSerial)return;
 if(plan.anchorLetter)await speech.letter(plan.anchorLetter);
 if(plan.sayWord&&token===roundToken&&serial===resultSerial)await say(state.word.word);
 });
}
function hint(){if(state.solved&&state.mode!=='songs')return;if(state.mode==='memory'&&state.listening){feedback(CLUE_TEXT.memoryListen);return;}cancelAnswerSound();state.hints++;if(state.hints===1||state.mode==='songs')return firstHint();if(['letters','sounds','words'].includes(state.mode)){replay();return;}if(state.mode==='memory'){state.showSequence=true;return playSequence();}
 if(state.mode==='groups'){if(state.hints===2){state.group.same.forEach(w=>$('[data-answer="'+w.id+'"]').classList.add('hint-target'));feedback(state.group.lesson.explanation);return narrate([state.group.lesson.explanation,...state.group.same.map(w=>w.word)]);}feedback(`Try ${state.group.odd.word}.`);return say(state.group.odd.word);}
 if(state.mode==='search'){
  resetSearchSelection();
  const remaining=state.placed.filter((_,i)=>!state.found.includes(i)),reveal=remaining.length===1?state.placed:remaining.slice(0,1);
  for(const entry of reveal)entry.cells.forEach(c=>$('[data-cell="'+c.join(',')+'"]').classList.add('selected'));
  narrate(reveal.map(p=>p.word.word));feedback(remaining.length===1?'Here are all the words.':'Here is one hidden word.');return;
 }
 if(state.mode==='scramble'||state.mode==='catch'){if(!state.word.word.startsWith(state.input))state.input='';spell(state.word.word[state.input.length]);return;}
 if(state.mode==='hangman'){const c=[...state.word.word].find(c=>!state.used.includes(c));guess(c);return;}
 if(state.mode==='count'){
  const choices=[...document.querySelectorAll('[data-answer]:not(:disabled)')];
  if(choices.length>2){pick(choices.filter(b=>b.dataset.answer!==state.answer)).disabled=true;feedback('One choice is gone. Count again.');say('How many objects can you count?');}
  else{feedback(`Try ${state.answer}.`);say(`The answer is ${state.answer}.`);}return;
 }
 if(state.hints===1){speakQuestionWord();feedback('Listen again. Tap Help me once more for the answer.');}else{if(/^[a-z]+$/i.test(state.answer))speakLetterAnswer(state.answer.toLowerCase());else say(`The answer is ${state.answer}.`);feedback(`Try ${state.answer.toUpperCase().split('').join(' · ')}.`);}}
async function song(index){stop();state.solved=false;const s=lessons.songs[index];const token=roundToken;$('#song-lyrics').textContent=Array.isArray(s.lyrics)?s.lyrics.join(' '):s.lyrics||'';await say(s.title);if(token!==roundToken)return;
 const AudioContext=window.AudioContext||window.webkitAudioContext;if(!AudioContext){feedback('Music playback is unavailable on this device.',false);return;}music=new AudioContext();await music.resume();musicGain=music.createGain();musicGain.gain.value=prefs.musicVolume;const compressor=music.createDynamicsCompressor();musicGain.connect(compressor);compressor.connect(music.destination);document.body.classList.add('music-playing');const offset=scheduleMelody(music,musicGain,s);
 feedback('Hum, sing, and tap along!');later(()=>{if(token===roundToken){document.body.classList.remove('music-playing');win('Great job!');if(music){music.close();music=null;}}},offset*1000);
}
function settings(){delete document.body.dataset.activity;document.body.classList.remove('playing');stop();state={mode:'settings'};$('#main').innerHTML=`<div class="settings"><button class="back" id="back">${icon('home')}<span>Back to adventures</span></button><span class="eyebrow">FOR GROWN-UPS</span><h1>A little room to grow</h1><p>${words.length} words ready to explore. Add words here, or import a JSON word pack. Your additions stay on this device and work across the spelling, counting, and letter activities.</p><div class="form-grid"><div><label for="voice-rate">Speaking speed</label><select id="voice-rate"><option value="0.7">Extra gentle</option><option value="0.85">Gentle</option><option value="1">Regular</option></select></div><div><label for="motion">Animations</label><select id="motion"><option value="false">On</option><option value="true">Reduced motion</option></select></div></div><label for="answer-volume">Answer sounds volume</label><input id="answer-volume" type="range" min="0" max="100" value="${Math.round(prefs.feedbackVolume*100)}"><div class="toolbar"><button class="secondary" id="preview-happy">Happy sound</button><button class="secondary" id="preview-sad">Try-again sound</button></div><button class="secondary" id="test-voice" style="margin-top:18px">♫ Test Bertie’s voice</button><section><h2>Add a word</h2><form id="word-form"><div class="form-grid"><div><label for="new-word">Word (2–14 letters)</label><input id="new-word" required pattern="[A-Za-z]{2,14}" placeholder="crab" maxlength="14"></div><div><label for="new-emoji">Picture emoji</label><input id="new-emoji" required placeholder="🦀" maxlength="20"></div><div><label for="new-letter">Letter key</label><input id="new-letter" required pattern="[A-Za-z]" maxlength="1" placeholder="c"></div><div><label for="new-category">Category</label><input id="new-category" required pattern="[a-z-]{1,40}" placeholder="animals"></div></div><label for="new-sounds">Sounds, separated by commas</label><input id="new-sounds" required placeholder="k, r, a, b"><label for="new-blend">Blend (optional, e.g. cr)</label><input id="new-blend" pattern="[a-z]{2,4}" maxlength="4"><button class="primary" type="submit" style="margin-top:18px">Add to word lab +</button></form></section><section><p><a href="elevenlabs-review.html">Roger’s letter sounds, names and blends</a> · <a href="phonics-credits.html">Earlier phonics sources</a></p><h2>Word packs</h2><p>Import adds or replaces words by ID. Built-in words remain available. Export makes a backup of your additions. See content/README.md in the project for the complete format and rhyme lessons.</p><div class="toolbar"><button class="secondary" id="export-pack">Export additions</button><button class="secondary" id="copy-pack">Show additions as JSON</button><label class="secondary" style="margin:0;cursor:pointer">Open JSON file<input id="import-file" type="file" accept=".json,application/json" style="display:none"></label></div><label for="pack-json">Paste a word pack here</label><textarea id="pack-json" spellcheck="false" placeholder='{"schemaVersion":1,"words":[...]}'></textarea><button class="primary" id="import-pack">Import word pack</button></section><section><h2>Saved discoveries</h2><p>${progress.stars} stars collected. Added words: ${custom.length}.</p><button class="secondary" id="reset-progress">Reset stars and activity history</button><p class="prompt-small">Speech uses bundled recordings first. New words use your device’s English voice. For offline speech with new content, install an English voice in Android’s text-to-speech settings. Built-in words, instructions, hints, jokes, letter names and sounds use offline ElevenLabs Roger recordings. New custom content uses the device voice until its recordings are prepared. Review the isolated sound clips with your child.</p></section><p id="settings-status" class="status" role="status"></p></div>`;$('#answer-volume').oninput=e=>{prefs.feedbackVolume=Number(e.target.value)/100;answerSounds.volume=prefs.feedbackVolume;save();};$('#voice-rate').value=String(prefs.rate);$('#motion').value=String(prefs.motion);$('#word-form').addEventListener('submit',addWord);$('#voice-rate').onchange=e=>{prefs.rate=Number(e.target.value);speech.rate=prefs.rate;save();};$('#motion').onchange=e=>{prefs.motion=e.target.value==='true';document.body.classList.toggle('reduce-motion',prefs.motion);save();};$('#import-file').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;if(f.size>2e6)throw Error('Please use a JSON file smaller than 2 MB.');$('#pack-json').value=await f.text();status('File opened. Press Import word pack to add these words.');}catch(e){status(e.message);}};}
function status(text){$('#settings-status').textContent=text;}
function storeCustom(next){validatePack({schemaVersion:1,words:next});localStorage.setItem('alphabert-custom',JSON.stringify(next));custom=next;words=mergedWords(base.words,custom);}
function addWord(e){e.preventDefault();try{const word=norm($('#new-word').value),blend=norm($('#new-blend').value);const w={id:word,word,letter:norm($('#new-letter').value),emoji:$('#new-emoji').value.trim(),category:norm($('#new-category').value),phonemes:$('#new-sounds').value.split(',').map(s=>s.trim()).filter(Boolean),blends:blend?[{text:blend,start:word.indexOf(blend)}]:[]};storeCustom(mergedWords(custom,[w]));status(`Added ${word}. It’s ready to play!`);$('#word-form').reset();}catch(e){status(e.message);}}
document.addEventListener('click',e=>{const b=e.target.closest('[data-bertie],button,[data-mode]');if(!b)return;const d=b.dataset;
 if('bertie' in d)return playWithBertie(b);
 if(d.letterSound&&state.mode==='sounds'){stop();speech.phoneme(d.letterSound,{held:true});return;}
 if(d.soundIndex!==undefined)return hearWordSound(Number(d.soundIndex));
 if(d.robotClue!==undefined&&state.mode==='hangman'&&!state.solved){showGuessPreview();return;}
 if(d.wordSay&&['letters','rhymes','scramble','catch','missing','vowels','words','blends'].includes(state.mode)){const word=getWord(d.wordSay);if(word){stop();const token=roundToken;say(word.word).then(()=>{if(token===roundToken&&state.solved)queueNext();});}return;}
 if(d.mode)return start(d.mode==='random'?pick(ACTIVITIES).id:d.mode);if(d.blendLetter){const w=pick(words.filter(w=>w.letter===d.blendLetter&&edgeBlends(w).length));if(w)makeRound(w);else{feedback('Choose another letter. This word has no blend.');say('Choose another letter.');}return;}if(d.explore)return explore(d.explore);if(d.answer!==undefined)return answer(d.answer);if(d.spell)return spell(d.spell);if(d.guess)return guess(d.guess);if(d.searchSay!==undefined)return hearSearchWord(Number(d.searchSay));if(d.cell)return selectCell(d.cell);if(d.memory)return memoryTap(d.memory);if(d.song!==undefined)return song(Number(d.song));
 switch(b.id){case'home':case'back':home();break;case'grownups':settings();break;case'sound':speech.enabled=!speech.enabled;prefs.speech=speech.enabled;if(!speech.enabled)speech.stop();else say("Hello! I'm Bertie. Let's learn and play!");save();break;case'next':makeRound();break;case'repeat':replay();break;case'hint':hint();break;case'memory-new':makeRound();break;case'song-prev':stop();renderSongMenu(state.songPage-1);break;case'song-next':stop();renderSongMenu(state.songPage+1);break;case'stop-song':stop();feedback('Music stopped. Pick another melody.');break;case'preview-happy':stop();resultSound('correct');break;case'preview-sad':stop();resultSound('incorrect');break;case'test-voice':cancelAnswerSound();speech.enabled=true;prefs.speech=true;save();say("Hello! I'm Bertie. Let's learn and play!");break;case'import-pack':try{const pack=validatePack(JSON.parse($('#pack-json').value));storeCustom(mergedWords(custom,pack.words));status(`Imported ${pack.words.length} words. ${words.length} words are ready to play.`);}catch(err){status('Could not import: '+err.message);}break;case'copy-pack':$('#pack-json').value=JSON.stringify({schemaVersion:1,words:custom},null,2);status('Your additions are shown above. You can copy and save this text.');break;case'export-pack':{if(window.AndroidFiles?.exportJson){window.AndroidFiles.exportJson(JSON.stringify({schemaVersion:1,words:custom},null,2));status('Choose a location to save your word pack.');break;}const blob=new Blob([JSON.stringify({schemaVersion:1,words:custom},null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='alphabert-words.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);$('#pack-json').value=JSON.stringify({schemaVersion:1,words:custom},null,2);status('Backup JSON is also shown above for copying.');break;}case'reset-progress':if(confirm('Reset stars and activity history? Your added words will stay.')){progress={stars:0,played:{}};save();status('Stars and activity history reset.');}break;
 }});
document.addEventListener('keydown',e=>{if(e.target.closest('[data-bertie]')&&['Enter',' '].includes(e.key)){e.preventDefault();if(!e.repeat)playWithBertie(e.target.closest('[data-bertie]'));return;}if(e.target.matches('input,textarea,select')||e.ctrlKey||e.altKey||e.metaKey||e.repeat)return;const c=e.key.toLowerCase();if(!/^[a-z]$/.test(c)||!state.mode||state.mode==='settings')return;if(state.mode==='songs'){const i=lessons.songs.findIndex(s=>s.letter===c);if(i>=0)song(i);}else if(['letters','sounds','words'].includes(state.mode))explore(c);else if(['scramble','catch'].includes(state.mode))spell(c);else if(state.mode==='hangman')guess(c);else if(state.mode==='memory')memoryTap(wordForDisplay(c)?.id);else if(['missing','vowels','order','rhymes'].includes(state.mode))answer(c);});
function pauseGame(){stop();if(state.mode==='memory'&&$('#memory-status')){$('#memory-status').textContent='Paused. Tap Hear again to continue.';state.listening=true;}}
window.addEventListener('androidpause',pauseGame);window.addEventListener('androidback',home);document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseGame();});
try{[base,lessons]=await Promise.all(['content/words.json','content/lessons.json'].map(async url=>{const r=await fetch(url);if(!r.ok)throw Error(`Could not load ${url}`);return r.json();}));validatePack(base);words=mergedWords(base.words,custom);home();}catch(e){$('#main').innerHTML=`<div class="error"><h1>Let’s get the word lab ready</h1><p>${esc(e.message)}</p><p>Use the Android app, or run the included local preview server.</p></div>`;}








