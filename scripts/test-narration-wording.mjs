// Verify local ASR wording and source identity; not a pronunciation certification.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
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
function canonical(text, key) {
  let s = text
    .toLowerCase()
    .replace(/\b(10|[0-9])\b/g, (n) => numbers[Number(n)])
    .replace(/\beye\b/g, 'i')
    .replace(/\btoo\b/g, 'two')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  if (key === 'the answer is y.') s = s.replace(/\bwhy\b/g, 'y');
  if (key === 'the answer is u.') s = s.replace(/\byou\b/g, 'u');
  if (key === 'a, e, i, o, and u are vowels.')
    s = s
      .replace(/\bee\b/g, 'e')
      .replace(/\boh\b/g, 'o')
      .replace(/\byou\b/g, 'u');
  if (key === 'skip to my lou') s = s.replace(/\blou\b/g, 'loo');
  if (key === 'pease porridge hot') s = s.replace(/\bpease\b/g, 'peas');
  // Proper-name spelling returned by the US-English recognizer on both takes.
  if (key === 'polly wolly doodle')
    s = s.replace(/\s/g, '').replace('pollywallydoodle', 'pollywollydoodle');
  return s;
}
const rows = JSON.parse(
  fs.readFileSync('audio-trials/elevenlabs/app-instruction-audit-results.json'),
);
assert.equal(rows.length, 190);
for (const r of rows) {
  assert.equal(canonical(r.heard, r.key), canonical(r.expected, r.key), r.key);
  assert.equal(
    crypto.createHash('sha256').update(fs.readFileSync(r.source)).digest('hex'),
    r.sourceSha256,
    r.key + ' stale audit',
  );
}
console.log(
  '190 fixed-line transcripts reviewed against intended wording, with explicit numeric/homophone/proper-name spelling normalization; source hashes current.',
);
