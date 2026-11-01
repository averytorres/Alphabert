# Music Corner

Music Corner uses synthesized instrumental arrangements of familiar melodies. Song titles, letter assignments, notes, timing and instruments are editable content; no network playback is required.

## Editing songs

Edit `scripts/song-arrangements.json`, then run:

```powershell
node scripts/build-song-data.mjs
npm run validate
node scripts/test-music.mjs
node scripts/test-song-catalog.mjs
```

Read the test scripts for their local preview/browser prerequisites. Instruments are defined in `music.js`. Each song records note pitches, beat durations, tempo, instrument and reference information. Keep source references when adjusting an arrangement, and listen to the result as well as checking its data.

Folk melodies can have regional variants. Choose a coherent arrangement and check rhythm, repeated phrases, endings and audible instrument levels on the intended device. Music volume is separate from speech and answer jingles.

## Sources

Per-song reference URLs are stored with the arrangements. Useful source collections include:

- [Everyday Song Book](https://trillian.mit.edu/~jc/music/book/EverydaySongBook/EverydaySongBook1.abc)
- [mfiles: Jack and Jill](https://www.mfiles.co.uk/scores/jack-and-jill.htm)
- [Flutetunes: Polly Wolly Doodle](https://www.flutetunes.com/tunes.php?id=343)
- [Flutetunes: Take Me Out to the Ball Game](https://www.flutetunes.com/tunes.php?id=73)
- [Beth's Notes: Sailing](https://www.bethsnotesplus.com/2013/06/sailing-sailing.html)
- [Beth's Notes: Skip to My Lou](https://www.bethsnotesplus.com/2012/10/skip-to-my-lou.html)

Downloaded reference scans and listening transcripts belong in ignored local research folders. Preserve applicable credits and license notices when distributing assets.
