# Working on Alphabert

## Project map

| Files | Purpose |
| --- | --- |
| `app.js`, `core.js` | Activities, game state, controls and word-pack validation |
| `index.html`, `styles.css`, `bertie-animations.css` | Interface and animations |
| `speech.js`, `feedback.js`, `music.js` | Voice playback, answer jingles and melodies |
| `content/words.json`, `content/lessons.json` | Vocabulary and lesson definitions |
| `assets/`, `audio/` | Bundled artwork, recordings and credits |
| `android/src/com/alphabert/reading/MainActivity.java` | Android WebView and native bridges |
| `scripts/` | Preview server, build tools, audio tools and checks |

## Preview and basic checks

Install Node.js and run from the project root:

```powershell
npm start
```

Open `http://127.0.0.1:4173`. In a second terminal:

```powershell
npm run validate
npm test
```

Browser gameplay checks require installed Chrome and the test-only Playwright dependency:

```powershell
npm install --prefix tools/test-browser --no-save playwright
node scripts/test-game.mjs
```

Some audio provenance checks also depend on ignored local generation receipts and source recordings. See [the speech guide](scripts/SPEECH.md) before running audio regeneration tools.

Browser tools use Playwright's installed Chrome channel on any supported host. Set `CHROME_PATH` to a browser executable to override it, or `BROWSER_CHANNEL` for another Playwright channel. To use downloaded Chromium, run `npx --prefix tools/test-browser playwright install chromium` and set `BROWSER_CHANNEL=chromium`. Browser tools do not assume a Windows installation path.

## Content changes

Read [the content guide](content/README.md). Add words through Grown-ups in the app, import a word pack, or edit the shared JSON files for bundled content. Validate JSON content after edits. Added words without bundled speech use device/browser text-to-speech.

## Behavior to preserve

- Activity screens fit portrait and landscape without scrolling; the main menu may scroll.
- New/replacement narration is generated as a complete independent utterance. Do not cut sentences from batches or assemble them from fragments.
- Keep reviewed phonics source choices and native playback speed unless intentionally changing a sound. Playback tests do not certify educational pronunciation.
- Build a Robot previews the animated clue without naming the answer. Word reveals happen at the end of the round.
- Count with Me picture taps stay silent for manual counting.
- Keep contextual picture playback in other activities, and hold-to-hear choices where supported.

## Android builds

Read [Android build notes](android/README.md). The PowerShell build needs a local Android SDK/JDK; the script accepts `-Sdk` and `-Jdk` overrides. When preparing an update, keep `package.json` and the Android version name aligned and increment the Android version code. Preserve the existing signing key for updates to installed copies.

Use **PowerShell 7**, set `ANDROID_HOME` (or `ANDROID_SDK_ROOT`) and `JAVA_HOME`, then run `./scripts/build-android.ps1`. Alternatively pass `-Sdk` and `-Jdk`, or set `ANDROID_PLAYER_HOME` to your own Unity AndroidPlayer folder. No Unity version or location is assumed. SDK binaries must match the host operating system. The builder selects native executable names for Windows or Unix hosts; macOS/Linux execution still needs validation on those systems.

Current Roger speech tooling does not depend on another game checkout. Historical Kokoro scripts require an explicit `MONSTER_RESCUE_PATH` (or `-MonsterRescue`) and .NET on PATH; `DOTNET_PATH` / `-Dotnet` can override .NET discovery. Those scripts can overwrite audio mappings, so use them only when intentionally working on that historical pipeline.

Local Python audio audits use the host-specific `ffmpeg-static` binary under `tools/audio`, or an executable supplied by `FFMPEG_PATH`. Their model and generation caches remain local development inputs.

Check the built APK and relevant behavior before installing/sharing it. Record actual checks and device installation evidence in `VALIDATION.md`, distinguishing automated verification from listening or physical-device review.

## Repository hygiene

Keep API keys, environment secrets, signing keys, downloaded dependencies, generated APKs, local caches and trial output out of commits. Preserve asset credits and license notices. A project-wide license has not been selected; do not invent licensing terms for third-party assets.

Before publishing, run `npm run audit:privacy`. To also check a personal name, add `-- --forbid-name NAME` (or use your local username environment variable). The scanner covers the actual Git publication set, reports public license contacts separately, and does not change Git author metadata.
