// One isolated teaching cue per response. Preserve the complete articulation.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const [token, text] = process.argv.slice(2);
assert.ok(/^[a-z]+$/.test(token || '') && text, 'Usage: token "spoken cue"');
const seed = Number(process.env.PHONICS_SEED || 4273);
const dir = '.elevenlabs-cache/standalone-phonics';
fs.mkdirSync(dir, { recursive: true });
const file = `${dir}/${token}.mp3`,
  receipt = `${dir}/${token}.json`;
if (
  fs.existsSync(receipt) &&
  JSON.parse(fs.readFileSync(receipt)).text === text &&
  (JSON.parse(fs.readFileSync(receipt)).seed ?? 4273) === seed
) {
  console.log('Reusing independent cue:', token);
  process.exit(0);
}
const key = (
  process.env.ELEVENLABS_API_KEY || fs.readFileSync('.elevenlabs-cache/api-key.txt', 'utf8')
).trim();
const response = await fetch(
  'https://api.elevenlabs.io/v1/text-to-dialogue?output_format=mp3_44100_128',
  {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      inputs: [{ text, voice_id: 'CwhRBWXzGAHq8TQ4Fs17' }],
      model_id: 'eleven_v4',
      language_code: 'en',
      apply_text_normalization: 'off',
      seed,
    }),
    signal: AbortSignal.timeout(90000),
  },
);
if (!response.ok) throw Error('ElevenLabs request failed: HTTP ' + response.status);
const audio = Buffer.from(await response.arrayBuffer());
assert.ok(audio.length > 1000);
fs.writeFileSync(file, audio);
fs.writeFileSync(
  receipt,
  JSON.stringify(
    {
      token,
      text,
      file,
      seed,
      model: 'eleven_v4',
      voiceId: 'CwhRBWXzGAHq8TQ4Fs17',
      independent: true,
      sha256: crypto.createHash('sha256').update(audio).digest('hex'),
    },
    null,
    2,
  ) + '\n',
);
console.log('Saved complete independent phonics cue:', token);
