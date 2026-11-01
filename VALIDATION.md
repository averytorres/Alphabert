# Testing and validation

Run checks appropriate to the files you change. Automated checks establish specific behaviors; they do not certify pronunciation, educational suitability, or every physical-device interaction.

## Basic checks

From the project root:

```powershell
npm ci
npm run format:check
npm run validate
npm test
npm run audit:privacy
```

The privacy audit scans tracked and nonignored files. Supply `-- --forbid-name NAME` to check a particular name as well. Review findings before committing; keep required third-party notices intact.

## Browser behavior and layout

After a broad refactor, run `npm run test:all`. It discovers every `test-*.mjs` suite, starts a preview server if needed, and saves individual logs and a summary under ignored `test-results/full-suite/`. It also checks the published letter recordings. Some audio provenance suites require the local caches described below. A failed or unavailable suite must be reported explicitly.

Install the test browser dependency as described in [CONTRIBUTING.md](CONTRIBUTING.md). The gameplay and layout suites start their own local servers:

```powershell
node scripts/test-game.mjs
node scripts/test-layout-audit.mjs
```

These cover activity interactions, correct/incorrect answers, hints, custom words, persistence, cancellation, rotation, touch targets and screen fit.

For focused checks, start `npm start` in a separate terminal, then run the relevant suite:

```powershell
node scripts/test-saved-progress.mjs
node scripts/test-robot-clue.mjs
node scripts/test-complete-narration-ui.mjs
node scripts/test-bertie-animation.mjs
```

Keep saved-data checks when changing persistence. Keep clue/cancellation checks when changing activity lifecycle or speech sequencing.

## Audio checks

With the preview server running:

```powershell
node scripts/test-elevenlabs.mjs
node scripts/test-roger-library.mjs
```

Narration provenance checks require the local source recordings and generation receipts. See [the speech guide](scripts/SPEECH.md). Do not regenerate recordings just to make a missing-cache check pass. Decoding, routing, signal and transcript checks are separate from listening review.

## Android checks

Follow [the build guide](android/README.md). Confirm the APK signature and packaged content, then test relevant changes on an Android phone or tablet. Check portrait/landscape layout, touch controls, audio completion/cancellation, background/resume and retained progress. Keep the existing signing key when updating an installed copy.

Put screenshots, transcripts and one-off test output in ignored local working folders. Put release summaries in GitHub Releases, rather than accumulating machine-specific installation logs in project documentation.
