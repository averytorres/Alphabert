import fs from 'node:fs';
const file = 'content/lessons.json',
  data = JSON.parse(fs.readFileSync(file, 'utf8'));
data.songs = JSON.parse(fs.readFileSync('scripts/song-arrangements.json', 'utf8'));
fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
console.log('Wrote', data.songs.length, 'reviewed melodies');
