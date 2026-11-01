# Music Corner review — 1.4.0

Reviewed all 27 selections on October 31, 2026. These are instrumental, synthesized arrangements of traditional melodies, not recordings or instrument samples from the original toy. Folk songs can have regional variants.

The editable source is `scripts/song-arrangements.json`; run `node scripts/build-song-data.mjs` after editing it. Each song has notes, beat durations, tempo, source, and instrument. Instruments are defined in `music.js`. Feedback jingles retain their original renderer.

| Selection | Review result |
|---|---|
| Alphabet Song | Retained familiar Twinkle-based melody; checked Everyday Song Book transcription. |
| My Bonnie | Retained source-book verse and refrain. |
| Camptown Races | Corrected holds, dotted rhythm, and refrain against Franzdorfer's published melody. |
| Did You Ever See a Lassie | Retained source-book arrangement. |
| Farmer in the Dell | Corrected dotted rhythm and phrase lengths from mfiles' Farmer's in His Den variant. |
| Frère Jacques | Retained familiar variant, including low dominant ending; mfiles has an alternate ending. |
| Mulberry Bush | Retained source-book arrangement. |
| Hickory Dickory Dock | Notes, tempo, and original triangle/sine sound preserved exactly. |
| Old King Cole | Retained MIT ABC opening verse. |
| It's Raining, It's Pouring | Retained familiar so-mi-la chant contour. Published Music You Can Read notation is low resolution; no claim of exact rhythmic identity. |
| Jack and Jill | Replaced incorrect pitches and rhythm with published mfiles melody; transposed into C for a clearer phone register. |
| Little Miss Muffet | Corrected pickup and missing altered note from mfiles. |
| London Bridge | Retained melody and beat scaling; matches mfiles. |
| Mary Had a Little Lamb | Retained familiar straight-rhythm variant; source book has a dotted variant. |
| Old MacDonald | Corrected animal-call syllable timing and removed extra notes from mfiles verse. |
| Pease Porridge Hot | Replaced guessed chant with Franzdorfer's published C-major melody. |
| Polly Wolly Doodle | Replaced with Flutetunes' published verse and refrain. |
| Row Your Boat | Retained melody and rhythm matching mfiles. |
| Sailing, Sailing | Corrected flats and phrase contour against Beth's Notes; preserved printed chromatic natural. |
| Shenandoah | Retained MIT ABC arrangement. |
| Sing a Song of Sixpence | Retained melody and rhythm matching mfiles. |
| Skip to My Lou | Corrected short syllables and repeated-note rhythm against Beth's Notes. |
| Take Me Out to the Ball Game | Replaced inaccurate contour with Flutetunes' published chorus, transposed lower. |
| Wheels on the Bus | Corrected dotted syllables and phrase holds from mfiles. |
| Three Little Kittens | Retained source-book opening excerpt, not every lyrical verse. |
| Pop Goes the Weasel | Retained familiar American variant; removed duplicate pickup. mfiles uses the different British variant. |
| Twinkle | Retained melody matching mfiles. |

Nine synthesized instrument colors are distributed consistently across songs: piano, harp, marimba, accordion, clarinet, flute, bells, organ, and music box. Hickory keeps its classic sound. Instruments use distinct harmonic balances and envelopes, with no playback-rate changes. Offline rendering measures every song's signal level and peak, and all ten result jingles; this is not a substitute for a listener's judgment on the phone speaker.

Reference URLs are stored per song. Additional review references: [Everyday Song Book](https://trillian.mit.edu/~jc/music/book/EverydaySongBook/EverydaySongBook1.abc), [Jack and Jill](https://www.mfiles.co.uk/scores/jack-and-jill.htm), [Polly Wolly Doodle](https://www.flutetunes.com/tunes.php?id=343), [Ball Game](https://www.flutetunes.com/tunes.php?id=73), [Sailing](https://www.bethsnotesplus.com/2013/06/sailing-sailing.html), [Skip to My Lou](https://www.bethsnotesplus.com/2012/10/skip-to-my-lou.html).
