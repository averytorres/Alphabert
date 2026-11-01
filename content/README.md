# Adding words and lessons

The game reads `words.json` and `lessons.json`. Editing these files changes the
content without changing the activity code. Rebuild the Android app after editing
bundled content. Keep `schemaVersion` set to `1`.

## Add a word

Copy a word entry in `words.json` and give it a unique `id`:

```json
{
  "id": "frog",
  "word": "frog",
  "letter": "f",
  "emoji": "🐸",
  "category": "animals",
  "phonemes": ["f", "r", "o", "g"],
  "phoneticHint": "f · r · o · g",
  "blends": [{ "text": "fr", "start": 0 }]
}
```

- `word`: lowercase English letters only, with no spaces, apostrophes, or hyphens.
  This keeps spelling games and the letter keyboard consistent.
- `letter`: the alphabet key associated with the word. Usually its first letter.
- `emoji`: the picture shown by the activities. Devices can draw emoji differently.
- `category`: an existing category ID from `lessons.json`. Add a category there if
  necessary. For odd-one-out questions, choose a clear, concrete grouping.
- `phonemes`: readable sound cues in pronunciation order, **not** one entry per
  written letter. For example `fish` uses `f`, `i`, `sh`. These are pronunciation
  hints, not IPA and not verified phonics recordings. Text-to-speech may pronounce
  isolated sounds inaccurately; use reviewed recordings for final phonics audio.
- `phoneticHint`: the same sound sequence formatted for display.
- `blends`: adjacent consonants whose sounds remain distinguishable (`fr`, `st`,
  `nd`). `start` counts from zero in the written word. Use `[]` if there is no
  blend. Do not mark digraphs like `sh`, `ch`, or `th` as blends.
- Optional `vowelSound`: `short` or `long` for the initial-vowel teaching examples.

Keep words concrete, familiar to young children, and short where possible. Review
spellings, meaning, picture clarity, and pronunciation before adding them.

## Extend lessons

`letters` has one entry for each lowercase letter. Each `sounds` item includes a
`label`, a child-readable `hint`, and an `exampleId` that references a word ID.
Examples may illustrate sounds inside words: the usual X sound occurs in `box`.

`rhymes` contains groups of word IDs that rhyme when spoken. Add at least two
words per group. Matching spelling endings alone do not prove a rhyme. The
starter groups use a standard US English pronunciation.

`categories` contains `{ "id": "animals", "label": "Animals" }` entries.

`songs` contains public-domain traditional melodies with a title, lyrics, tempo in
beats per minute, and notes such as `{ "note": "C4", "duration": 1 }`. Duration
is in beats, not seconds. The starter songs are instrumental melodies; lyrics are
provided as text rather than sung recordings.

The song library has the manual’s 26 A–Z selections and bonus Twinkle. A song’s
`letter` sets its keyboard shortcut; omit it for a bonus song. `source` and
`section` document the melody reference and whether it is a verse, refrain, or
opening excerpt. These are new simple arrangements rather than original toy
recordings. The music screen shows six selections per page. Edit the compact
note definitions in `scripts/build-song-data.mjs` and run it to regenerate the
song list; it preserves the vocabulary and other lesson definitions.

Music playback uses a sustained triangle tone plus a quiet octave, controlled by
the music screen’s saved volume slider independently of speech. Rest notes use
`"rest"`; note durations and tempo determine the playback length.

## Validate

From the project folder, run:

```text
node scripts/validate-content.mjs
```

This checks unique IDs, all 26 alphabet keys, lesson references, category IDs,
blend spelling/indexes, and song note data. It does not replace a human review of
phonics, rhyme quality, or suitability for a particular child's reading level.

Picture odd-one-out rounds use the reviewed `pictureGroups` lists in `lessons.json`, rather than mixing arbitrary word categories. Each group has word IDs, a spoken `hint`, an `explanation` for the pair, and an `oddExplanation`. Add only pictures that have an obvious common property, and keep groups distinct. A word added through the app does not automatically enter these rounds; add its ID to a reviewed group in the source content. Run validation and regenerate speech when editing the clue text.

## Built-in illustrations

For a built-in word whose emoji is unclear, edit its vector illustration in `scripts/build-word-pictures.mjs` and run `node scripts/build-word-pictures.mjs`. This generates `assets/words/*.svg` and `word-pictures.js`. All activities use the same picture lookup. Custom words still use their chosen emoji; changing a built-in word's emoji overrides its bundled illustration.
