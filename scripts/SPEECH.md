# Offline speech and phonics

The app plays bundled recordings first. New custom content without a recording uses the device or browser voice. Playback does not require an ElevenLabs account or API key.

## Narration

Generate each new or replacement utterance as one complete independent response. Do not cut sentences from a multi-utterance batch or assemble narration from fragments. The publisher verifies source hashes, keeps the complete native-duration source, and adds only trailing silence.

The current recording workflow uses Roger and the model settings recorded in the generation plans. Preserve the exact text keys used by the game; changing a prompt requires a matching recording or it falls back to device speech.

## Generation inputs

Generation requires local plans, original recordings and receipts under the ignored `.elevenlabs-cache/` directory. These are separate from the bundled runtime files in `audio/`. A fresh clone can play the bundled recordings; restoring development masters/plans is necessary before regenerating them.

Set `ELEVENLABS_API_KEY` or use the local ignored `.elevenlabs-cache/api-key.txt`. Never commit credentials or include them in an APK. Review the pending character count and available credits before generation. The tools do not purchase credits or change account/key limits.

```powershell
node scripts/repair-roger-boundaries.mjs --plan-only
node scripts/repair-roger-boundaries.mjs
node scripts/publish-roger-library.mjs
```

The repair command resumes completed responses from receipts. Publishing requires a full independent source for each selected output. To publish a targeted repair, pass its exact normalized phrase key as an argument to `publish-roger-library.mjs`.

## Phonics and alphabet names

Letter names, phonics and blends are separate from ordinary narration. `speech.js` prefers the reviewed ElevenLabs bank, with earlier indexed recordings retained as fallbacks. Keep the distinction between an alphabet name and a sound: a blend must not be sent to ordinary TTS as an abbreviation.

Phonics play at native speed and pitch. Teaching pauses are separate silence, not slowed recordings. Keep reviewed source choices, source credits, pinned sound hashes and contextual sound mappings unless deliberately replacing a sound after listening review. Whole-utterance narration rules do not mean existing reviewed phonics excerpts should be regenerated automatically.

`audio/index.json` maps exact text/sound keys to bundled files. `audio/roger-library.json` describes narration provenance; `audio/elevenlabs-phonics.json` describes the phonics bank. Keep `phonics-credits.html`, bundled license notices and source attribution with their recordings.

## Validation

Start the preview server and install browser test dependencies using [the developer guide](../CONTRIBUTING.md), then run:

```powershell
npm test
node scripts/test-roger-library.mjs
node scripts/test-elevenlabs.mjs
node scripts/test-complete-narration-ui.mjs
```

Some checks require the local generation masters/receipts. Local transcription tools additionally need Python audio dependencies and their model cache. They use the host-specific ffmpeg installation or `FFMPEG_PATH`.

Check complete wording, native timing, audibility and routing. Automated checks cannot establish every pronunciation's clarity or naturalness; review sounds with an adult and the intended learner.

## Earlier tooling

Older Kokoro, eSpeak and human-recording tools remain for maintaining existing source banks. They are not the default narration workflow and can overwrite mappings. Legacy external tools require explicit configuration described in [CONTRIBUTING.md](../CONTRIBUTING.md); do not run them as a routine setup step.
