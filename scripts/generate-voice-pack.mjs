// Resumable, complete utterances only. Existing speakers and runtime indexes stay untouched.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { voicePackConfig } from './voice-pack-config.mjs';

const config = voicePackConfig();
const voiceId = config.elevenlabsVoiceId;
const model = config.model;
const folder = config.cache;
const hash = (text) => crypto.createHash('sha256').update(text).digest('hex');
fs.mkdirSync(folder, { recursive: true });
const source = JSON.parse(fs.readFileSync('audio/roger-library.json'));
const unique = new Map();
for (const phrase of source.phrases) {
  const text = phrase.spokenText;
  const id = hash(`${model}/${voiceId}/${text}`);
  if (!unique.has(id)) unique.set(id, { id, text, keys: [] });
  unique.get(id).keys.push(phrase.key);
}
const jobs = [...unique.values()];
const plan = {
  voiceId,
  model,
  jobs,
  characters: jobs.reduce((sum, job) => sum + job.text.length, 0),
};
fs.writeFileSync(`${folder}/plan.json`, JSON.stringify(plan, null, 2));
console.log(`${jobs.length} independent utterances / ${plan.characters} characters.`);
if (process.argv.includes('--plan-only')) process.exit(0);
const key = (
  process.env.ELEVENLABS_API_KEY || fs.readFileSync('.elevenlabs-cache/api-key.txt', 'utf8')
).trim();
let charged = 0;
let completed = 0;
let cursor = 0;
let failure;
const creditCap = 30_000;
async function worker() {
  while (cursor < jobs.length && !failure) {
    const job = jobs[cursor++];
    const file = `${folder}/${job.id}.mp3`;
    const receiptPath = `${folder}/${job.id}.json`;
    try {
      if (fs.existsSync(receiptPath)) {
        const receipt = JSON.parse(fs.readFileSync(receiptPath));
        assert.equal(receipt.sha256, hash(fs.readFileSync(file)), 'Cached source changed');
        charged += receipt.chargedCredits;
      } else {
        // Plain TTS is steadier for one-word picture labels; dialogue preserves
        // the expressive delivery of full instructions, encouragement and jokes.
        const plainWord = /^[a-z]+$/i.test(job.text.trim());
        assert.ok(
          charged + job.text.length < creditCap,
          'Voice-pack generation reached its credit cap',
        );
        let response;
        for (let attempt = 0; attempt < 5; attempt++) {
          response = await fetch(
            plainWord
              ? `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`
              : 'https://api.elevenlabs.io/v1/text-to-dialogue?output_format=mp3_44100_128',
            {
              method: 'POST',
              headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
              body: JSON.stringify(
                plainWord
                  ? {
                      text: `${job.text}.`,
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
                      apply_text_normalization: 'off',
                      seed: 4272,
                    },
              ),
              signal: AbortSignal.timeout(90_000),
            },
          );
          if (response.status !== 429) break;
          await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
        }
        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(
            `ElevenLabs ${response.status}: ${error.detail?.status || 'generation rejected'}`,
          );
        }
        const bytes = Buffer.from(await response.arrayBuffer());
        assert.ok(bytes.length > 1000, 'Empty speech response');
        const cost = Number(response.headers.get('character-cost'));
        assert.ok(Number.isFinite(cost) && cost > 0, 'Generation charge missing');
        const receipt = {
          ...job,
          file,
          voiceId,
          model,
          chargedCredits: cost,
          independent: true,
          sha256: hash(bytes),
        };
        fs.writeFileSync(file, bytes);
        fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2));
        charged += cost;
      }
      completed++;
      if (completed % 10 === 0)
        console.log(`${completed}/${jobs.length} saved; ${charged} credits accounted for`);
    } catch (error) {
      failure = error;
    }
  }
}
await Promise.all([worker(), worker()]);
fs.writeFileSync(
  `${folder}/generation-status.json`,
  JSON.stringify({ completed, total: jobs.length, charged, error: failure?.message }, null, 2),
);
if (failure) throw failure;
console.log(`Complete: ${completed} recordings, ${charged} credits. Runtime indexes unchanged.`);
