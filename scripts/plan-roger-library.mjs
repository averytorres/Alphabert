import fs from 'node:fs';
import crypto from 'node:crypto';
const hash = (s) => crypto.createHash('sha256').update(s).digest('hex');
const previous = JSON.parse(fs.readFileSync('.elevenlabs-cache/narration-plan.json'));
const words = JSON.parse(fs.readFileSync('content/words.json')).words.map((w) => w.word);
const pattern = new RegExp(
  '\\b(' + words.sort((a, b) => b.length - a.length).join('|') + '|[A-Z])\\b',
  'g',
);
const groups = new Map();
for (const job of previous.jobs) {
  const template = job.text.replace(pattern, '{}');
  if (!groups.has(template)) groups.set(template, []);
  groups.get(template).push(job);
}
const jobs = new Map(),
  outputs = [];
function speech(text) {
  text = text.replace(/^[\s.,?!]+|\s+$/g, '');
  if (!text) return null;
  const id = hash('roger-v4-library-v1/' + text);
  jobs.set(id, { id, text, characters: text.length });
  return { id };
}
for (const [template, group] of groups) {
  for (const job of group) {
    let parts = [];
    if (group.length >= 3) {
      let at = 0;
      for (const match of job.text.matchAll(pattern)) {
        const prefix = speech(job.text.slice(at, match.index));
        if (prefix) parts.push(prefix);
        const value = match[0];
        parts.push(/^[A-Z]$/.test(value) ? { letter: value.toLowerCase() } : speech(value));
        at = match.index + value.length;
      }
      const tail = speech(job.text.slice(at));
      if (tail) parts.push(tail);
    } else parts = [speech(job.text)];
    outputs.push({ key: job.key, text: job.text, parts: parts.filter(Boolean) });
  }
}
const plan = {
  version: 1,
  model: 'eleven_v4',
  voiceId: 'CwhRBWXzGAHq8TQ4Fs17',
  voice: 'Roger - Laid-Back, Casual, Resonant',
  characters: [...jobs.values()].reduce((n, j) => n + j.characters, 0),
  jobs: [...jobs.values()],
  outputs,
};
fs.writeFileSync('.elevenlabs-cache/library-plan.json', JSON.stringify(plan, null, 2) + '\n');
console.log(
  `${plan.jobs.length} unique speech pieces, ${plan.characters} characters -> ${outputs.length} complete offline phrases. No credits spent.`,
);
