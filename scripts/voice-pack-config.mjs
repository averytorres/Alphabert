import fs from 'node:fs';
import assert from 'node:assert/strict';

// One catalog drives settings, generation, publishing and Android packaging.
// Roger's original pack is deliberately excluded from replacement generation.
export function voicePackConfig(args = process.argv.slice(2)) {
  const id = args.find((argument) => argument.startsWith('--voice='))?.slice(8) || 'amelia';
  const catalog = JSON.parse(fs.readFileSync('audio/voices.json'));
  const voice = catalog.voices.find((voice) => voice.id === id);
  assert.ok(
    voice && id !== 'roger' && /^[a-z-]+$/.test(id),
    'Choose a configured additional voice',
  );
  assert.ok(
    voice.elevenlabsVoiceId && voice.model && voice.name,
    'Voice generation metadata missing',
  );
  return { ...voice, cache: `.elevenlabs-cache/${id}`, destination: `audio/${id}` };
}
