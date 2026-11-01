import assert from 'node:assert/strict';import fs from 'node:fs';
import {BERTIE_REACTIONS,BertieReactionPicker} from '../bertie-reactions.js';
assert.ok(BERTIE_REACTIONS.length>=110);assert.equal(new Set(BERTIE_REACTIONS.map(r=>r.text)).size,BERTIE_REACTIONS.length);
const picker=new BertieReactionPicker(()=>.37),seen=new Set();for(let i=0;i<BERTIE_REACTIONS.length;i++)seen.add(picker.next().id);assert.equal(seen.size,BERTIE_REACTIONS.length);const last=picker.last;assert.notEqual(picker.next().id,last,'No repeat across shuffle boundary');
const css=fs.readFileSync('styles.css','utf8')+fs.readFileSync('bertie-animations.css','utf8'),index=JSON.parse(fs.readFileSync('audio/index.json')).clips;
for(const r of BERTIE_REACTIONS){assert.ok(css.includes(`[data-reaction="${r.motion}"]`),'Missing animation '+r.motion);assert.ok(index[r.text.toLowerCase()],'Missing offline voice '+r.text);}
console.log(`Bertie: ${BERTIE_REACTIONS.length} unique offline reactions, ${new Set(BERTIE_REACTIONS.map(r=>r.motion)).size} motions, no repeated reactions within each shuffle.`);
