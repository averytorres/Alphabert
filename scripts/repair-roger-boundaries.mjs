// All narration uses complete independent responses. Never cut batch sentences.
// Each response contains exactly one utterance, so no neighboring audio is cut in.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { CLUE_TEXT } from '../context-hints.js';
import { MENU_HELP } from '../menu-help.js';
const hash = (s) => crypto.createHash('sha256').update(s).digest('hex');
const plan = JSON.parse(fs.readFileSync('.elevenlabs-cache/library-plan.json'));
const names = {
  a: 'A',
  b: 'Bee',
  c: 'See',
  d: 'Dee',
  e: 'Ee',
  f: 'Eff',
  g: 'Jee',
  h: 'Aitch',
  i: 'Eye',
  j: 'Jay',
  k: 'Kay',
  l: 'Ell',
  m: 'Em',
  n: 'En',
  o: 'Oh',
  p: 'Pee',
  q: 'Cue',
  r: 'Ar',
  s: 'Ess',
  t: 'Tee',
  u: 'You',
  v: 'Vee',
  w: 'Double-you',
  x: 'Ex',
  y: 'Why',
  z: 'Zee',
};
const jobs = plan.jobs
  .filter((j) => !/[.!?]$/.test(j.text.trim()))
  .map((j) => ({ ...j, kind: 'piece', spokenText: j.text }));
for (const output of plan.outputs) {
  // Whole word names already have independent piece recordings.
  if (/^[a-z]+$/.test(output.key) && output.parts.length === 1) continue;
  const spokenText = output.text.replace(/\b[A-Z]\b/g, (l) => names[l.toLowerCase()]);
  jobs.push({
    id: hash('roger-whole-lesson-v1/' + output.key),
    kind: 'sentence',
    key: output.key,
    text: output.text,
    spokenText,
  });
}
const priority = new Set(
  [
    ...Object.values(CLUE_TEXT),
    ...Object.values(MENU_HELP),
    'Catch the letters in order to spell the word.',
  ].map((s) => s.toLowerCase()),
);
jobs.sort((a, b) => Number(priority.has(b.key)) - Number(priority.has(a.key)));
const dir = '.elevenlabs-cache/independent';
fs.mkdirSync(dir, { recursive: true });
const requestPlan = {
  model: plan.model,
  voiceId: plan.voiceId,
  jobs,
  characters: jobs.reduce((n, j) => n + j.spokenText.length, 0),
};
fs.writeFileSync(`${dir}/plan.json`, JSON.stringify(requestPlan, null, 2) + '\n');
console.log(`${jobs.length} independent utterances / ${requestPlan.characters} characters.`);
const pending = jobs.filter(
  (j) =>
    !fs.existsSync(`${dir}/${j.id}.json`) ||
    JSON.parse(fs.readFileSync(`${dir}/${j.id}.json`)).spokenText !== j.spokenText,
);
console.log(
  `${pending.length} remaining / ${pending.reduce((n, j) => n + j.spokenText.length, 0)} new characters.`,
);
if (process.argv.includes('--plan-only')) process.exit(0);
const key = (
  process.env.ELEVENLABS_API_KEY || fs.readFileSync('.elevenlabs-cache/api-key.txt', 'utf8')
).trim();
let at = 0,
  done = 0;
async function worker() {
  while (at < jobs.length) {
    const job = jobs[at++],
      file = `${dir}/${job.id}.mp3`,
      receipt = `${dir}/${job.id}.json`;
    if (
      !fs.existsSync(receipt) ||
      JSON.parse(fs.readFileSync(receipt)).spokenText !== job.spokenText
    ) {
      const response = await fetch(
        'https://api.elevenlabs.io/v1/text-to-dialogue?output_format=mp3_44100_128',
        {
          method: 'POST',
          headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inputs: [{ text: job.spokenText, voice_id: plan.voiceId }],
            model_id: plan.model,
            language_code: 'en',
            apply_text_normalization: 'off',
            seed: 4272,
          }),
          signal: AbortSignal.timeout(90000),
        },
      );
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw Error(
          `ElevenLabs HTTP ${response.status}: ${String(error.detail?.message || error.detail?.status || 'request rejected').slice(0, 200)}`,
        );
      }
      const audio = Buffer.from(await response.arrayBuffer());
      assert.ok(audio.length > 1000, 'Empty response for ' + job.text);
      fs.writeFileSync(file, audio);
      fs.writeFileSync(
        receipt,
        JSON.stringify(
          {
            ...job,
            file,
            model: plan.model,
            voiceId: plan.voiceId,
            independent: true,
            sha256: hash(audio),
          },
          null,
          2,
        ),
      );
    }
    if (++done % 25 === 0) console.log(`Saved ${done}/${jobs.length} independent recordings`);
  }
}
await Promise.all([worker(), worker()]);
console.log('Independent recording repair complete; game index unchanged until publishing.');
