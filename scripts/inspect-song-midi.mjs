import fs from 'node:fs';
import { readMidi } from './read-midi.mjs';
const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export function melodyFromMidi(file) {
  const midi = readMidi(file),
    track = midi.tracks.find((t) => t.notes.length),
    lead = [],
    groups = new Map();
  for (const n of track.notes) {
    const start = (Math.round((n.start / midi.ppq) * 16) / 16) * midi.ppq,
      note = { ...n, start, end: start + n.end - n.start };
    if (!groups.has(start) || groups.get(start).pitch < note.pitch) groups.set(start, note);
  }
  for (const note of [...groups.values()].sort((a, b) => a.start - b.start)) {
    if (lead.at(-1)?.end > note.start) continue;
    lead.push(note);
  }
  const notes = [];
  for (let i = 0; i < lead.length; i++) {
    const n = lead[i],
      duration = Math.round(((n.end - n.start) / midi.ppq / 0.95) * 4) / 4;
    notes.push({ note: names[n.pitch % 12] + (Math.floor(n.pitch / 12) - 1), duration });
    const gap =
      (lead[i + 1]?.start ?? n.start + duration * midi.ppq) / midi.ppq -
      n.start / midi.ppq -
      duration;
    if (gap >= 0.24) notes.push({ note: 'rest', duration: Math.round(gap * 4) / 4 });
  }
  return notes;
}
if (process.argv[1]?.endsWith('inspect-song-midi.mjs')) {
  for (const file of fs
    .readdirSync('.music-review')
    .filter((f) => f.endsWith('.mid') && f !== 'jack-and-jill.mid'))
    console.log(
      file,
      melodyFromMidi('.music-review/' + file)
        .map((n) => n.note + ':' + n.duration)
        .join(' '),
    );
}
