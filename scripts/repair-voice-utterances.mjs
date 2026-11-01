// Generate full replacement takes for an explicit review list. Never edit neighboring audio.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { voicePackConfig } from './voice-pack-config.mjs';
const config = voicePackConfig();
const path = process.argv.find((argument) => argument.startsWith('--list='))?.slice(7);
assert.ok(path, 'Supply --list=path/to/review-list.json');
const selections = JSON.parse(fs.readFileSync(path));
const plan = JSON.parse(fs.readFileSync(`${config.cache}/plan.json`));
const key = (
  process.env.ELEVENLABS_API_KEY || fs.readFileSync('.elevenlabs-cache/api-key.txt', 'utf8')
).trim();
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
let charged = 0;
for (const selection of selections) {
  const job = plan.jobs.find((job) => job.keys.includes(selection.key));
  assert.ok(job, `Unknown phrase: ${selection.key}`);
  const receiptPath = `${config.cache}/${job.id}.json`;
  const previous = JSON.parse(fs.readFileSync(receiptPath));
  const seed = selection.seed || 4273;
  if (previous.retakeSeed === seed) continue;
  const spokenText = selection.text || job.text;
  const text = selection.plain
    ? selection.requestText || spokenText
    : `[clearly] ${selection.requestText || spokenText}`;
  let response;
  for (let attempt = 0; attempt < 10; attempt++) {
    response = await fetch(
      selection.plain
        ? `https://api.elevenlabs.io/v1/text-to-speech/${config.elevenlabsVoiceId}?output_format=mp3_44100_128`
        : 'https://api.elevenlabs.io/v1/text-to-dialogue?output_format=mp3_44100_128',
      {
        method: 'POST',
        headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify(
          selection.plain
            ? {
                text,
                model_id: config.model,
                language_code: 'en',
                seed,
                voice_settings: {
                  stability: 0.75,
                  similarity_boost: 0.75,
                  style: 0,
                  use_speaker_boost: true,
                },
              }
            : {
                inputs: [{ text, voice_id: config.elevenlabsVoiceId }],
                model_id: config.model,
                language_code: 'en',
                apply_text_normalization: 'off',
                seed,
              },
        ),
        signal: AbortSignal.timeout(90000),
      },
    );
    if (response.status !== 429) break;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`ElevenLabs ${response.status}: ${error.detail?.status || 'retake rejected'}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.ok(bytes.length > 1000);
  const cost = Number(response.headers.get('character-cost'));
  charged += cost;
  assert.ok(charged < 2000, 'Utterance repair cap reached');
  const history = `${config.cache}/retakes/${job.id}-${previous.sha256}`;
  fs.mkdirSync(`${config.cache}/retakes`, { recursive: true });
  fs.copyFileSync(previous.file, `${history}.mp3`);
  fs.writeFileSync(`${history}.json`, JSON.stringify(previous, null, 2));
  fs.writeFileSync(previous.file, bytes);
  fs.writeFileSync(
    receiptPath,
    JSON.stringify(
      {
        ...previous,
        requestText: text,
        spokenText,
        retakeSeed: seed,
        chargedCredits: cost,
        previousCharge: previous.chargedCredits,
        sha256: hash(bytes),
      },
      null,
      2,
    ),
  );
  console.log(`Full retake saved: ${selection.key} (${cost} credits)`);
}
console.log(`Retakes complete: ${charged} new credits.`);
