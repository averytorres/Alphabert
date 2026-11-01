# Offline speech and phonics

The app plays bundled recordings first. Playback does not require an ElevenLabs account or API key. Older preferences without an explicit voice choice retain the device/browser fallback for new custom content. An explicit voice choice disables that fallback, so a missing recording cannot silently change the speaker.

## Voice packs and saved choice

`audio/voices.json` lists the voice packs and their availability. Roger uses `audio/index.json`; additional speakers use their own complete index and files under `audio/<voice-id>/`. Keep a pack unavailable until all built-in narration, words, letter names, phonics and blends are generated and reviewed. The runtime rejects additional packs whose files point outside that speaker's folder.

Letter-name exceptions belong in the catalog's optional `plainLetterNames` and `letterNameText` fields. These let a speaker use plain TTS or an explicit IPA spelling for an ambiguous name without changing any activity code. Quiet isolated cues receive bounded gain; pronunciation, speed and pitch are unchanged by publishing.

Grown-up settings save the chosen ID in `alphabert-prefs.voice`. Startup loads that pack before showing activities. A load failure preserves the preference and shows an error instead of reverting to a different speaker. Added words require a recording for the selected speaker.

`node scripts/test-voice-choice.mjs` exercises saved selection and routing using synthetic test mappings. It does not certify the availability or pronunciation of new recordings.

### Adding another speaker

Add an entry to `audio/voices.json` with a lowercase `id`, display `name` and `label`, `elevenlabsVoiceId`, `model`, `index` (`audio/<id>/index.json`) and `available: false`. The activity code does not need changes.

Prepare the queue without spending credits, then generate only after reviewing the budget:

```powershell
node scripts/generate-voice-pack.mjs --voice=amelia --plan-only
node scripts/generate-voice-phonics.mjs --voice=amelia --plan-only
node scripts/generate-voice-pack.mjs --voice=amelia
node scripts/generate-voice-phonics.mjs --voice=amelia
node scripts/publish-voice-pack.mjs --voice=amelia
```

Replace `amelia` with the configured ID. Tools keep separate resumable caches and receipts per speaker, with generation credit caps. They never purchase credits or enable billing. Isolated cues use fresh text/IPA responses; review pronunciation separately. Parent approvals are stored against source hashes, not inherited by other voices.

After complete publication, enable the catalog entry and run `npm run test:all`. The voice-pack test covers every enabled additional speaker. Android packaging reads the same catalog and includes each enabled pack's indexes and recordings. A `voice-review.html?voice=<id>` page is available for each additional speaker.

## Narration

Generate each new or replacement utterance as one complete independent response. Do not cut sentences from a multi-utterance batch or assemble narration from fragments. The publisher verifies source hashes, keeps the complete native-duration source, and adds only trailing silence.

The original Roger report supplies the shared phrase inventory for additional speakers; the catalog supplies each speaker's voice and model settings. Preserve the exact text keys used by the game; changing a prompt requires a matching recording in each available voice pack.

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
