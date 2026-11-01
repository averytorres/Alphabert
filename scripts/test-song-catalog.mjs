import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {INSTRUMENTS} from '../music.js';
const {songs}=JSON.parse(fs.readFileSync(new URL('../content/lessons.json',import.meta.url),'utf8'));
const names=['alphabet','bonnie','camptown','lassie','farmer','jacques','mulberry','hickory','king cole','raining','jack and jill','miss muffet','london bridge','mary','macdonald','pease','polly','row','sailing','shenandoah','sixpence','skip','ball game','wheels','kittens','weasel'];
const compact=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
for(const [i,name] of names.entries()){
 const letter=String.fromCharCode(97+i),matches=songs.filter(s=>s.letter===letter);
 assert.equal(matches.length,1,`One song for letter ${letter}`);assert.ok(compact(matches[0].title).includes(name),`${letter}: ${matches[0].title}`);
 assert.ok(matches[0].notes.length>=12,`${letter}: substantial melody`);
}
assert.ok(songs.some(s=>s.id==='twinkle'),'Bonus Twinkle preserved');
assert.deepEqual(songs,JSON.parse(fs.readFileSync('scripts/song-arrangements.json','utf8')),'Generated song data matches reviewed source');
assert.ok(new Set(songs.map(s=>s.instrument)).size>=9,'Varied instrument palette');
for(const song of songs){assert.ok(song.instrument==='classic'||INSTRUMENTS[song.instrument],song.id+' instrument');for(const n of song.notes){assert.ok(n.duration>0&&n.duration<=8,song.id+' duration');assert.match(n.note,/^(rest|[A-G][#b]?[0-7])$/);}}
assert.equal(songs.find(s=>s.id==='hickory').instrument,'classic');
const hickory=songs.find(s=>s.id==='hickory');assert.equal(crypto.createHash('sha256').update(JSON.stringify({tempo:hickory.tempo,notes:hickory.notes})).digest('hex'),'7888399f37459b5185729b502275e8ab32da9ce00920a0b86afa9f87069a3298','Preserve the approved Hickory melody');
const jack=songs.find(s=>s.id==='jack-jill');assert.deepEqual(jack.notes.slice(0,4),[{note:'G4',duration:1},{note:'G4',duration:.5},{note:'G4',duration:1},{note:'G4',duration:.5}]);
console.log('Song catalog passed: all 26 manual letter selections plus bonus Twinkle.');
