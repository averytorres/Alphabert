import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import ffmpeg from '../tools/audio/node_modules/ffmpeg-static/index.js';
const plan = JSON.parse(fs.readFileSync('.elevenlabs-cache/library-plan.json')),
  index = JSON.parse(fs.readFileSync('audio/index.json'));
// Optional exact keys permit a targeted repair without rewriting unrelated audio.
const selectedKeys = new Set(process.argv.slice(2));
const previousPhrases = selectedKeys.size
  ? new Map(JSON.parse(fs.readFileSync('audio/roger-library.json')).phrases.map((p) => [p.key, p]))
  : null;
for (const key of selectedKeys)
  assert.ok(
    plan.outputs.some((o) => o.key === key),
    'Unknown phrase key: ' + key,
  );
const repairPlan = JSON.parse(fs.readFileSync('.elevenlabs-cache/independent/plan.json'));
const independent = new Map();
for (const job of repairPlan.jobs) {
  const path = `.elevenlabs-cache/independent/${job.id}.json`;
  if (fs.existsSync(path)) independent.set(job.id, JSON.parse(fs.readFileSync(path)));
}
const completeSentences = new Map(
  [...independent.values()].filter((j) => j.kind === 'sentence').map((j) => [j.key, j]),
);
// Validate the whole selected set before touching any published audio.
for (const output of plan.outputs) {
  if (selectedKeys.size && !selectedKeys.has(output.key)) continue;
  const source =
    completeSentences.get(output.key) ||
    (output.parts.length === 1 && independent.get(output.parts[0].id));
  assert.ok(
    source?.independent && fs.existsSync(source.file),
    'Complete independent recording required: ' + output.key,
  );
  assert.equal(
    crypto.createHash('sha256').update(fs.readFileSync(source.file)).digest('hex'),
    source.sha256,
    'Source hash mismatch: ' + output.key,
  );
}
const rate = 24000,
  pcm = new Map(),
  pieces = new Map();
function decode(file) {
  if (pcm.has(file)) return pcm.get(file);
  const r = spawnSync(
    ffmpeg,
    ['-v', 'error', '-i', file, '-ar', String(rate), '-ac', '1', '-f', 's16le', 'pipe:1'],
    { windowsHide: true, maxBuffer: 100e6 },
  );
  assert.equal(r.status, 0, String(r.stderr));
  pcm.set(file, r.stdout);
  return r.stdout;
}
for (const job of plan.jobs)
  if (independent.has(job.id)) pieces.set(job.id, decode(independent.get(job.id).file));
const vowelPromptKeys = new Set(
  JSON.parse(fs.readFileSync('content/words.json'))
    .words.filter((w) => w.word.length <= 7 && /[aeiou]/.test(w.word))
    .map((w) => 'find the missing vowel in ' + w.word + '.'),
);
const report = {
  version: 2,
  model: plan.model,
  voiceId: plan.voiceId,
  voice: plan.voice,
  generatedCharacters: plan.characters + repairPlan.characters,
  uniquePieces: plan.jobs.length,
  independentPieces: repairPlan.jobs.filter((j) => j.kind === 'piece').length,
  completeLessonSentences: [...completeSentences.keys()].filter(
    (k) => /^[a-z] is for [a-z]+\.$/.test(k) || /^this is the letter [a-z]\.$/.test(k),
  ).length,
  completeVowelPrompts: [...completeSentences.keys()].filter((k) => vowelPromptKeys.has(k)).length,
  phrases: [],
  method:
    'Every published utterance uses a complete independent response at native speed. No batch timestamp cuts or fragment assembly. Only trailing silence is added.',
  sourceListeningVerified: false,
};
let done = 0;
for (const output of plan.outputs) {
  if (selectedKeys.size && !selectedKeys.has(output.key)) {
    const previous = previousPhrases.get(output.key);
    assert.ok(previous && fs.existsSync(previous.file), 'Missing retained phrase: ' + output.key);
    report.phrases.push(previous);
    continue;
  }
  const id = crypto
      .createHash('sha256')
      .update('roger-library-v2/' + JSON.stringify(output))
      .digest('hex'),
    file = `audio/roger-${id}.ogg`;
  const direct = completeSentences.get(output.key);
  assert.ok(
    direct || (output.parts.length === 1 && pieces.has(output.parts[0].id)),
    'Complete independent recording required: ' + output.key,
  );
  const data = direct ? [decode(direct.file)] : [pieces.get(output.parts[0].id)];
  const source = direct || independent.get(output.parts[0].id);
  assert.equal(source.independent, true);
  const joined = [...data, Buffer.alloc(Math.round(rate * 0.1) * 2)];
  const samples = Buffer.concat(joined);
  assert.ok(samples.length > rate * 0.1 * 2, output.key);
  const result = spawnSync(
    ffmpeg,
    [
      '-v',
      'error',
      '-y',
      '-f',
      's16le',
      '-ar',
      String(rate),
      '-ac',
      '1',
      '-i',
      'pipe:0',
      '-c:a',
      'libvorbis',
      '-q:a',
      '5',
      file,
    ],
    { input: samples, windowsHide: true },
  );
  assert.equal(result.status, 0, String(result.stderr));
  index.clips[output.key] = file;
  report.phrases.push({
    key: output.key,
    file,
    parts: direct ? [{ independentSentence: direct.id }] : output.parts,
    seconds: samples.length / (rate * 2),
    independent: true,
    spokenText: source.spokenText,
    sourceSha256: source.sha256,
    sourceSeconds: data[0].length / (rate * 2),
  });
  if (++done % 250 === 0)
    console.log(`Encoded ${done}/${plan.outputs.length} offline Roger phrases`);
}
index.voice = plan.voice + ' / Eleven v4';
index.narrationSource = 'ElevenLabs native-speed offline recordings';
index.rogerLibrary = 'audio/roger-library.json';
// Commit the complete mapping only after every output has been generated.
fs.writeFileSync('audio/roger-library.json', JSON.stringify(report, null, 2) + '\n');
fs.writeFileSync('audio/index.json', JSON.stringify(index, null, 2) + '\n');
console.log(`Published all ${report.phrases.length} Roger narration/word clips.`);
