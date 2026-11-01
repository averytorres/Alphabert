# Android app

This folder contains a small native Java wrapper around the offline reading game. It does not require Unity, Gradle, an account, Internet access, or third-party Android libraries at runtime. The APK requests no network, microphone, advertising, or storage permissions. Android's document picker grants access only to the content file the parent chooses.

## Build

From the project root in PowerShell 7:

```powershell
./scripts/build-android.ps1
```

Set `ANDROID_HOME` (or `ANDROID_SDK_ROOT`) and `JAVA_HOME`, or provide `-Sdk /path/to/android-sdk -Jdk /path/to/jdk` (JDK 17+). Alternatively configure `ANDROID_PLAYER_HOME` or pass `-AndroidPlayer` for a Unity AndroidPlayer installation of your choice. No Unity version or installation path is assumed. A JDK can also be discovered from `javac` on PATH. Native tool suffixes follow the host OS; macOS/Linux execution has not yet been validated. SDK build tools with aapt2, D8, apksigner, zipalign and an Android platform API 35+ are needed. No Unity project or Gradle download is involved.

Output: `android/AlphabertWordLab.apk`, a debug-signed APK for Android 8.0+ (API 26), targeting Android 15 (API 35). Keep `android/debug.keystore` to install later builds as updates without resetting saved progress. This is a local development signing key, not a Play Store release key.

## Web/native contract

The local origin is `https://appassets.androidplatform.net/assets/index.html`. All network requests outside that exact host are blocked. Relative fetches resolve bundled JSON and audio. localStorage retains settings/progress across launches and APK updates signed with the same key.

- `AndroidVoice.speak(text)` reads a prompt with the installed Android English TTS engine.
- `AndroidVoice.speakWithId(text, id)` also dispatches `android-speech-end` on `window` with `event.detail === id` on completion/error. Use `isReady()` before this API. Audio quality and offline availability depend on the phone's installed TTS voice.
- `AndroidVoice.stop()` cancels queued/current speech.
- `AndroidVoice.setRate(rate)` adjusts TTS speed (clamped to 0.5–1.5).
- `AndroidVoice.isReady()` reports whether English TTS initialized.
- The system back button dispatches `androidback` on `window`; the game handles navigation.
- Standard HTML `<input type="file">` uses Android's document picker for content packs.
- `AndroidFiles.exportJson(json)` opens Android's save document picker and saves a JSON content pack without storage permission. Cancellation leaves the pack unchanged.
- Backgrounding dispatches `androidpause` on `window` so the game can stop bundled audio/timers.

Bundled recorded audio plays through the WebView independently of Android TTS. The script copies root HTML/CSS/JS and the runtime `content`, `audio`, `assets`, `images`, `fonts` folders. It does not include the original VTech ISO or extracted software.

No old VTech executable is run by this application or its build process.

