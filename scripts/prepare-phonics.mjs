import fs from 'node:fs';
throw new Error(
  'Isolated neural phonics are superseded. Use node scripts/generate-reference-phonics.mjs.',
);
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const original = JSON.parse(fs.readFileSync(path.join(root, '.speech-cache/plan.json'), 'utf8'));
const modelRoot = path.join(root, '.speech-phonics-cache/model');
fs.mkdirSync(modelRoot, { recursive: true });
for (const name of [
  'model.int8.onnx',
  'voices.bin',
  'tokens.txt',
  'lexicon-gb-en.txt',
  'lexicon-us-en.txt',
]) {
  const destination = path.join(modelRoot, name);
  if (!fs.existsSync(destination))
    fs.copyFileSync(path.join(original.modelRoot, name), destination);
}
// Pure consonant targets avoid an added uh vowel; stop sounds remain brief.
const sounds = {
  a: 'ˈ æ',
  ay: 'ˈ A',
  b: 'b',
  k: 'k',
  d: 'd',
  e: 'ˈ ɛ',
  ee: 'ˈ i',
  f: 'f',
  g: 'ɡ',
  h: 'h',
  i: 'ˈ ɪ',
  igh: 'ˈ I',
  j: 'ʤ',
  l: 'l',
  m: 'm',
  n: 'n',
  o: 'ˈ ɑ',
  oa: 'ˈ O',
  oo: 'ˈ u',
  p: 'p',
  r: 'ɹ',
  s: 's',
  t: 't',
  u: 'ˈ ʌ',
  ue: 'j ˈ u',
  v: 'v',
  w: 'w',
  y: 'j',
  z: 'z',
  sh: 'ʃ',
  ch: 'ʧ',
  th: 'θ',
  ng: 'ŋ',
  qu: 'k w',
  ks: 'k s',
  or: 'ˈ ɔ ɹ',
  ar: 'ˈ ɑ ɹ',
  er: 'ˈ ɜ ɹ',
  ai: 'ˈ A',
  ow: 'ˈ W',
  oi: 'ˈ Y',
  air: 'ˈ ɛ ɹ',
  ear: 'ˈ ɪ ɹ',
  eh: 'ˈ ɛ',
  ah: 'ˈ ɑ',
  uh: 'ˈ ʌ',
  aw: 'ˈ ɔ',
  eye: 'ˈ I',
  oh: 'ˈ O',
  yoo: 'j ˈ u',
  kw: 'k w',
};
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
let lexicon = fs.readFileSync(path.join(original.modelRoot, 'game-lexicon.txt'), 'utf8');
const jobs = Object.entries(sounds).map(([token, phones]) => {
  const text = `bertphonics${token}`;
  lexicon += `\n${text} ${phones}`;
  const key = hash(`0/1.000/${text}`);
  return {
    key,
    text,
    source: hash(`phonics-pure-v2/${key}`),
    master: hash(`phonics-pure-v2/${key}`),
    voice: 0,
  };
});
fs.writeFileSync(path.join(modelRoot, 'game-lexicon.txt'), lexicon + '\n');
const cacheRoot = path.join(root, '.speech-phonics-cache');
const plan = { ...original, modelRoot, cacheRoot, jobs, corpus: hash(JSON.stringify(jobs)) };
fs.writeFileSync(path.join(cacheRoot, 'plan.json'), JSON.stringify(plan, null, 2));
console.log(`Prepared ${jobs.length} synthesized sound clips.`);
