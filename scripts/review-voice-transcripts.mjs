// A diagnostic for local ASR output, not a pronunciation certification.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { voicePackConfig } from './voice-pack-config.mjs';
const config = voicePackConfig();
const plan = JSON.parse(fs.readFileSync(`${config.cache}/plan.json`));
const names = {
  bee: 'b',
  see: 'c',
  dee: 'd',
  ee: 'e',
  eff: 'f',
  jee: 'g',
  gee: 'g',
  aitch: 'h',
  eye: 'i',
  jay: 'j',
  kay: 'k',
  ell: 'l',
  em: 'm',
  en: 'n',
  oh: 'o',
  pee: 'p',
  cue: 'q',
  ar: 'r',
  ess: 's',
  tee: 't',
  you: 'u',
  vee: 'v',
  ex: 'x',
  why: 'y',
  zee: 'z',
};
const numbers = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
];
function canonical(text) {
  return text
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/\bim\b/g, 'i am')
    .replace(/\bits\b/g, 'it is')
    .replace(/\blets\b/g, 'let us')
    .replace(/\bdont\b/g, 'do not')
    .replace(/\bthats\b/g, 'that is')
    .replace(/\byoure\b/g, 'you are')
    .replace(/\bwhats\b/g, 'what is')
    .replace(/\b(10|[0-9])\b/g, (n) => numbers[Number(n)])
    .replace(/\bdouble[ -]you\b/g, 'w')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((word) => names[word] || word)
    .join(' ');
}
function distance(left, right) {
  let row = Array.from({ length: right.length + 1 }, (_, i) => i);
  for (let i = 0; i < left.length; i++) {
    const next = [i + 1];
    for (let j = 0; j < right.length; j++)
      next.push(Math.min(row[j + 1] + 1, next[j] + 1, row[j] + Number(left[i] !== right[j])));
    row = next;
  }
  return row[right.length];
}
const differences = [];
let checked = 0;
for (const job of plan.jobs) {
  const file = `audio-trials/elevenlabs/audit-${job.id}.json`;
  if (!fs.existsSync(file)) continue;
  const result = JSON.parse(fs.readFileSync(file));
  const source = `${config.cache}/${job.id}.mp3`;
  if (
    !fs.existsSync(source) ||
    crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex') !==
      result.sourceSha256
  )
    continue;
  checked++;
  const receipt = JSON.parse(fs.readFileSync(`${config.cache}/${job.id}.json`));
  const expectedText = receipt.spokenText || job.text;
  const expected = canonical(expectedText);
  const heard = canonical(result.heard);
  if (expected !== heard)
    differences.push({
      id: job.id,
      key: job.keys[0],
      expected: expectedText,
      heard: result.heard,
      editDistance: distance(expected.split(' '), heard.split(' ')),
    });
}
differences.sort((a, b) => b.editDistance - a.editDistance);
fs.mkdirSync(`test-results/${config.id}`, { recursive: true });
fs.writeFileSync(
  `test-results/${config.id}/wording-differences.json`,
  JSON.stringify({ checked, total: plan.jobs.length, differences }, null, 2),
);
console.log(
  JSON.stringify(
    {
      checked,
      total: plan.jobs.length,
      differences: differences.length,
      largestDifferences: differences.slice(0, 15),
    },
    null,
    2,
  ),
);
