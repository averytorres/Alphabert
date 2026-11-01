// Fresh isolated utterances: no uploads, batch cuts, looping, or time stretching.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { SOUNDS } from './phonics-reference.mjs';
import { voicePackConfig } from './voice-pack-config.mjs';

const config = voicePackConfig();
const folder = `${config.cache}/phonics`;
const voiceId = config.elevenlabsVoiceId;
const model = config.model;
const hash = (text) => crypto.createHash('sha256').update(text).digest('hex');
fs.mkdirSync(folder, { recursive: true });
const bank = JSON.parse(fs.readFileSync('audio/elevenlabs-phonics.json'));
const sounds = { ...SOUNDS, shortoo: ['book', 'ʊ'] };
// Explicit names avoid ambiguous isolated letters (notably G, H, W and Y).
// Per-voice overrides use plain TTS where a spelled name was ambiguous.
const letterNames = [
  'Ay',
  'Bee',
  'See',
  'Dee',
  'Ee',
  'Eff',
  'Jee',
  'Aitch',
  'Eye',
  'Jay',
  'Kay',
  'Ell',
  'Em',
  'En',
  'Oh',
  'Pee',
  'Cue',
  'Ar',
  'Ess',
  'Tee',
  'You',
  'Vee',
  'Double-you',
  'Ex',
  'Why',
  'Zee',
];
const sustained = new Set([
  'æ',
  'ɛ',
  'i',
  'f',
  'ɪ',
  'l',
  'm',
  'n',
  'ɑ',
  'u',
  'ɹ',
  's',
  'ʌ',
  'v',
  'z',
  'ʃ',
  'θ',
  'ŋ',
  'ɔ',
  'ə',
]);
const jobs = new Map();
const outputs = [];
function add(key, text, kind, label) {
  const id = hash(`${model}/${voiceId}/${text}`);
  if (!jobs.has(id))
    jobs.set(id, {
      id,
      text,
      kind,
      plain: kind === 'letter' && (config.plainLetterNames || ['e']).includes(label),
    });
  outputs.push({ key, id, kind, label });
}
for (const token of Object.keys(bank.sounds)) {
  const ipa = sounds[token]?.[1];
  assert.ok(ipa, `IPA missing: ${token}`);
  add(
    `phoneme-eleven:${token}`,
    `[gently] /${ipa}${sustained.has(ipa) ? 'ː' : ''}/.`,
    'phoneme',
    token,
  );
}
for (const [index, letter] of [...'abcdefghijklmnopqrstuvwxyz'].entries()) {
  const name = (config.plainLetterNames || ['e']).includes(letter)
    ? letter.toUpperCase()
    : letterNames[index];
  add(`letter-eleven:${letter}`, config.letterNameText?.[letter] || `${name}.`, 'letter', letter);
}
for (const blend of bank.blends) {
  const ipa = blend.tokens.map((token) => sounds[token][1]).join('');
  add(
    `blend-eleven:${blend.word}:${blend.text}`,
    `[gently] /${ipa}/.`,
    'blend',
    `${blend.word} / ${blend.text}`,
  );
}
const plan = {
  voiceId,
  model,
  jobs: [...jobs.values()],
  outputs,
  characters: [...jobs.values()].reduce((n, job) => n + job.text.length, 0),
};
fs.writeFileSync(`${folder}/plan.json`, JSON.stringify(plan, null, 2));
console.log(
  `${plan.jobs.length} isolated cues, ${outputs.length} mappings, ${plan.characters} characters.`,
);
if (process.argv.includes('--plan-only')) process.exit(0);
const key = (
  process.env.ELEVENLABS_API_KEY || fs.readFileSync('.elevenlabs-cache/api-key.txt', 'utf8')
).trim();
let total = 0;
for (const [index, job] of plan.jobs.entries()) {
  const file = `${folder}/${job.id}.mp3`;
  const receiptPath = `${folder}/${job.id}.json`;
  if (fs.existsSync(receiptPath)) {
    const receipt = JSON.parse(fs.readFileSync(receiptPath));
    assert.equal(receipt.sha256, hash(fs.readFileSync(file)));
    total += receipt.chargedCredits;
    continue;
  }
  let response;
  for (let attempt = 0; attempt < 12; attempt++) {
    response = await fetch(
      job.plain
        ? `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`
        : 'https://api.elevenlabs.io/v1/text-to-dialogue?output_format=mp3_44100_128',
      {
        method: 'POST',
        headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify(
          job.plain
            ? {
                text: job.text,
                model_id: model,
                language_code: 'en',
                seed: 4277,
                voice_settings: {
                  stability: 0.75,
                  similarity_boost: 0.75,
                  style: 0,
                  use_speaker_boost: true,
                },
              }
            : {
                inputs: [{ text: job.text, voice_id: voiceId }],
                model_id: model,
                language_code: 'en',
                seed: 4272,
              },
        ),
        signal: AbortSignal.timeout(90_000),
      },
    );
    if (response.status !== 429) break;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`ElevenLabs ${response.status}: ${error.detail?.status || 'phonics rejected'}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.ok(bytes.length > 1000);
  const cost = Number(response.headers.get('character-cost'));
  total += cost;
  assert.ok(total < 2000, 'Phonics generation credit cap reached');
  fs.writeFileSync(file, bytes);
  fs.writeFileSync(
    receiptPath,
    JSON.stringify(
      {
        ...job,
        file,
        voiceId,
        model,
        independent: true,
        chargedCredits: cost,
        sha256: hash(bytes),
      },
      null,
      2,
    ),
  );
  if ((index + 1) % 5 === 0)
    console.log(`${index + 1}/${plan.jobs.length} isolated cues saved; ${total} credits`);
}
console.log(`Isolated cues complete: ${total} credits. Review required before publishing.`);
