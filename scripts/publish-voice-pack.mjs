// Publish complete native-speed responses, without trimming or assembling fragments.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import ffmpeg from '../tools/audio/node_modules/ffmpeg-static/index.js';
import { voicePackConfig } from './voice-pack-config.mjs';

const config = voicePackConfig();
const cache = config.cache;
const destination = config.destination;
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
// Fricatives can be naturally quiet. Bound gain and peaks without changing
// articulation, playback speed or pitch, and leave normal narration untouched.
const cueGain = (kind, rms, peak) =>
  kind === 'phonics' ? Math.max(1, Math.min(4, 0.02 / rms, 0.85 / peak)) : 1;
const phonicsOnly = process.argv.includes('--phonics-only');
const clips = {};
const recordings = [];
const phonics = [];
const listening = fs.existsSync(`${cache}/phonics/listening-review.json`)
  ? JSON.parse(fs.readFileSync(`${cache}/phonics/listening-review.json`))
  : { approved: [] };
const sources = new Map();
fs.mkdirSync(destination, { recursive: true });
const previous = fs.existsSync(`${destination}/report.json`)
  ? new Map(
      JSON.parse(fs.readFileSync(`${destination}/report.json`)).recordings.map((recording) => [
        recording.id,
        recording,
      ]),
    )
  : new Map();
const plans = [
  ...(!phonicsOnly ? [{ folder: cache, kind: 'narration' }] : []),
  { folder: `${cache}/phonics`, kind: 'phonics' },
];
for (const { folder, kind } of plans) {
  const plan = JSON.parse(fs.readFileSync(`${folder}/plan.json`));
  for (const job of plan.jobs) {
    const source = JSON.parse(fs.readFileSync(`${folder}/${job.id}.json`));
    assert.equal(source.voiceId, config.elevenlabsVoiceId);
    assert.equal(source.independent, true);
    assert.equal(hash(fs.readFileSync(source.file)), source.sha256, `Changed source: ${job.id}`);
    sources.set(job.id, source);
  }
  for (const job of plan.jobs) {
    const source = sources.get(job.id);
    const file = `${destination}/${job.id}.ogg`;
    const retained = previous.get(job.id);
    if (
      retained?.sourceSha256 === source.sha256 &&
      (retained.gain || 1) ===
        cueGain(kind, retained.sourceRms ?? retained.rms, retained.sourcePeak ?? retained.peak) &&
      fs.existsSync(file) &&
      hash(fs.readFileSync(file)) === retained.outputSha256
    ) {
      recordings.push({
        ...retained,
        gain: retained.gain || 1,
        sourceRms: retained.sourceRms ?? retained.rms,
        sourcePeak: retained.sourcePeak ?? retained.peak,
      });
      for (const key of job.keys || []) clips[key] = file;
      continue;
    }
    const pcm = spawnSync(
      ffmpeg,
      ['-v', 'error', '-i', source.file, '-ar', '24000', '-ac', '1', '-f', 's16le', 'pipe:1'],
      { windowsHide: true, maxBuffer: 100e6 },
    );
    assert.equal(pcm.status, 0, String(pcm.stderr));
    const samples = new Int16Array(pcm.stdout.buffer, pcm.stdout.byteOffset, pcm.stdout.length / 2);
    let peak = 0;
    let sum = 0;
    let first = -1;
    let last = -1;
    for (const [index, sample] of samples.entries()) {
      const value = sample / 32768;
      peak = Math.max(peak, Math.abs(value));
      sum += value * value;
      if (Math.abs(value) > 0.005) {
        if (first === -1) first = index;
        last = index;
      }
    }
    const seconds = samples.length / 24000;
    const rms = Math.sqrt(sum / samples.length);
    assert.ok(peak > 0.01 && rms > 0.001 && seconds > 0.1 && seconds < 60, `Bad signal: ${job.id}`);
    const gain = cueGain(kind, rms, peak);
    const result = spawnSync(
      ffmpeg,
      [
        '-v',
        'error',
        '-y',
        '-i',
        source.file,
        '-ar',
        '24000',
        '-ac',
        '1',
        '-af',
        `volume=${gain},apad=pad_dur=0.1`,
        '-c:a',
        'libvorbis',
        '-q:a',
        '5',
        file,
      ],
      { windowsHide: true },
    );
    assert.equal(result.status, 0, String(result.stderr));
    recordings.push({
      id: job.id,
      kind,
      file,
      text: source.spokenText || job.text,
      sourceSha256: source.sha256,
      outputSha256: hash(fs.readFileSync(file)),
      sourceSeconds: seconds,
      seconds: seconds + 0.1,
      activeSeconds: (last - first + 1) / 24000,
      sourcePeak: peak,
      sourceRms: rms,
      gain,
      peak: peak * gain,
      rms: rms * gain,
      independent: true,
      playbackRate: 1,
      looped: false,
      timeStretched: false,
    });
    for (const key of job.keys || []) clips[key] = file;
  }
  for (const output of plan.outputs || []) {
    clips[output.key] = `${destination}/${output.id}.ogg`;
    phonics.push({ ...output, file: clips[output.key] });
  }
}
const report = {
  voice: config.name,
  voiceId: config.elevenlabsVoiceId,
  model: config.model,
  complete: !phonicsOnly,
  listeningVerified: false,
  parentApprovedCues: listening.approved.filter((entry) => {
    const cue = phonics.find((cue) => cue.key === entry.key);
    return cue && sources.get(cue.id)?.sha256 === entry.sourceSha256;
  }),
  method:
    'Complete independent responses at native timing, with bounded gain on quiet cues and 100ms trailing silence. No source audio uploads, batch cuts, time stretching, or assembled fragments.',
  phonics,
  recordings,
};
fs.writeFileSync(`${destination}/report.json`, JSON.stringify(report, null, 2));
fs.writeFileSync(`${destination}/index.json`, JSON.stringify({ clips }, null, 2));
console.log(
  `Published ${recordings.length} recordings and ${Object.keys(clips).length} mappings. Catalog availability unchanged; listening review is separate.`,
);
