# Validation · October 31, 2026

- Content: 106 words, 26 letter lessons, 13 rhyme groups, 27 melodies; schema and references pass.
- Core: pack validation, malformed/unsafe content rejection, word replacement, 100 generated word-search boards pass.
- Chrome gameplay: all 16 activities exercised, including incorrect/correct answers, hints, repeated-win protection, word editor, import/export, persistence, custom three-letter blends, escaped imported markup, music stop, memory pause/replay, and reduced-motion letter catch.
- Layout: desktop and 390px mobile screenshots inspected; horizontal overflow checks pass.
- Speech: prepared audio lookup, phonemes, alphabet names, fallback, completion, cancellation, and mute pass. All 1,667 indexed Ogg files are present; every built-in word, sound token, and song title is covered.
- Real Chrome audio: word, feedback, letter name, and two phoneme clips decode and play to completion; awaited SpeechService completion and talking state verified.
- Music update: all 26 manual song-to-letter selections plus bonus Twinkle verified. All 27 melodies rendered through OfflineAudioContext, with RMS 0.196–0.251 and no clipping at default music volume. Song pages expose every selection; saved volume slider tested. Six-song pages preserve the activity screen-fit behavior.
- Manual audit update (v1.1.0): browser checks verify both vowel examples, explained answers, count-choice elimination, progressive robot assembly, blend letter exploration, memory hint escalation, full sound replay, slow continuous sounds, brief stops, and inter-sound pauses. All 26 letter-name and 51 phoneme clips decode to non-silent finite audio; real slow playback completes. These are playback checks, not a listening assessment of pronunciation. See `MANUAL-AUDIT.md` for the 16-activity review and remaining adaptation limits.
- Installed v1.1.0 as an update on the connected Samsung. Its WebView loads the expanded 27-song data and 1,666-clip audio index. Existing device progress is retained. Full native interaction and human listening review remain separate from browser regression checks.

## Letter-name sentence correction · v1.1.1

The full “A is for…” sentence recordings were still using ordinary text-to-speech interpretation, allowing A to be spoken as an article. The shared alphabet pronunciation dictionary now applies inside every generated letter-name sentence, including Learn Letters, alphabet-order questions/answers, and missing-letter feedback. All 26 names have explicit targets; short vowel phonics retain their separate recordings. New custom words without a full sentence recording use the dedicated letter-name clip followed by the rest of the sentence.

`scripts/test-letter-pronunciation.mjs --published` checks that every affected display sentence points to its corrected recording, including both “A is for ant” and “A is for ape.” The normal article in “A custom word” remains unchanged. APK packaging includes indexed audio and skips superseded takes.

v1.1.1 was installed on the Samsung. An actual Learn Letters → A interaction played the corrected introduction, “A is for ant,” and “A is for ape” recordings in order and completed playback; activity height remained 813/813 pixels without scrolling. All 941 affected sentences passed the published-recording mapping check. The revised fallback and real browser audio playback checks also passed.

## Phonics duration correction · v1.1.2

Measured all 51 phonics recordings using active waveform energy, excluding silence. T/D were about 0.12 seconds and G about 0.11 seconds. Existing audio was trimmed and time-stretched with pitch preserved; no repeated playback was added. T is now 0.482 seconds of active sound, D 0.481, G 0.533. All 51 outputs have 0.476–0.782 seconds of active sound and pass non-silence/clipping checks. Detailed measurements and original source paths are in `audio/phonics-timing.json`. All alphabet-name sentence mapping tests remain passing, and real browser audio checks decode all revised sounds successfully. Listening quality still requires human judgment.

Installed v1.1.2 on the Samsung and copied `Alphabert-1.1.2.apk` to its `Download/FamilyGames` folder. Native Sound It Out → A played extended A, N, and T once each, followed by the whole word “ant.” Verified T's extended clip and duration metadata on the phone. The activity remained 813/813 pixels without scrolling.

## Pronunciation source correction · v1.1.3

User listening feedback showed that the isolated neural phonics clips were not reliable, despite the earlier timing and decode checks. They are superseded by 52 phoneme segments extracted from eSpeak NG English-US word audio using its actual phoneme timing events. Each selected segment is checked against its intended IPA sequence. All 106 word-bank sequences now match the reference pronunciation, with an explicit accepted teaching variant for kitten. Corrected schwa handling in apple, kitten, umbrella, xylophone, and zebra; corrected the otter R-colored vowel reference and aligned log with the reference US vowel. Zebra is z / iː / b / ɹ / ə. Normal narration and alphabet-name recordings remain Kokoro. Human listening remains essential; phoneme-event checks are stronger evidence than file/decode checks but are not a human assessment of clarity.

## Manual recheck and Memory keyboard · v1.3.7

Compared the current activity code/content against the manual again, reran content, song mapping, phonics-reference, letter-name and all-activity checks, and updated `MANUAL-AUDIT.md` to distinguish requested behavior from other adaptation limits. Corrected Memory Trail's six-object simplification: it now presents the shared full 26-key object keyboard and samples sequences from exactly the objects pictured on those keys. Aa case colors, pictures, narration lockout, sequence growth/retry and progressive hints are retained. Physical alphabet keys also choose their mapped objects. Tests verify 26 mapped picture keys, 26-object pool, lockout during narration, correct/incorrect sequences and pause/replay. No original recordings or full question bank are supplied by the manual, so these checks do not establish exact content/audio parity.

## Tap every search letter · v1.3.6

Hidden in Plain Sight now selects a word by tapping each grid cell in reading order, rather than selecting endpoints. Partial attempts are highlighted and letters spoken; only a complete stored word path earns a find. Skipping cells, turning off the word path or reversed spelling cannot complete a target. Repeating the same cell is ignored, and tapping another word's first cell starts a fresh attempt. Hints reset the attempt while retaining their progressive visual help. Target-word audio preserves an in-progress selection. Updated visible/spoken instructions and bundled the new instruction recording. This is an intentional departure from the manual's endpoint method, requested for easier child interaction.

Browser checks cover endpoint skipping, full cell-by-cell completion, accidental repeat taps, hint resets, target audio preserving selection, found status, all-target completion and existing games. Search-control layout checks pass at seven sizes, retaining landscape 48px targets.

## Celebration variations · v1.3.5

Added five celebrations to the existing falling confetti: fireworks, spiral, balloons, star fountain and rainbow ripples. A shuffled six-effect bag uses each once per cycle and prevents an immediate repeat at cycle boundaries. Existing correct-answer/memory-success events choose the effect. Effects clean up within 2.8 seconds, cannot intercept button taps, and are suppressed by both the app's reduced-motion setting and the system preference. A generation guard prevents an old cleanup timer from deleting a newer celebration. Activity changes clear particles immediately.

`test-celebrations.mjs` verifies 120 shuffled selections, six real game wins covering all effects, visible CSS animation, button hit testing/clicking, navigation cleanup, timed cleanup, both reduced-motion options, and no page errors. Effect previews are under `test-results/celebrations`; fireworks, spiral and balloons were visually inspected. Existing game checks pass.

## Speak word-search targets · v1.3.4

The target-word list in Hidden in Plain Sight is now a set of accessible picture buttons. Tapping any target speaks its word, including after it is found, without changing found status or grid selection. New taps cancel obsolete answer sound/narration; completed rounds resume their normal automatic-next pause after playback. Tests verify speech and unchanged progress before/after a find. Focused layout checks cover seven viewport sizes with landscape targets at least 48px; compact landscape spacing keeps instructions and all buttons visible.

## More deliberate stops · v1.3.3

Replaced very short stop references with longer native articulations: final B/D/G/P from cab/bed/bag/cap, final T from cat, and initial K from king. These sources retain the release inside the selected phoneme instead of cutting at the following vowel. Native synthesis uses rate 80; audio playback stays 1. No post-processing time stretch, burst repetition, added vowel, or padding-only duration claim. Selected sound durations are B 80 ms, D 80 ms, G 81 ms, K 61 ms, P 87 ms, T 49 ms (previously 38/26/26/49/33/42 ms). Both phoneme banks use these stop clips; held continuous sounds are unchanged. Pronunciation mappings, minimum source-sound duration, no-stretch metadata, native playback, audio decoding and existing content/speech checks pass. Device listening remains the assessment of perceived usefulness.

## Paired-case keyboard · v1.3.2

Every full keyboard shows both forms of each letter (Aa through Zz), with dark blue uppercase and dark orange lowercase. Pictures and vowel backgrounds remain. Accessible names identify both forms. Letter-pair sizing preserves existing key heights and landscape tap targets. `test-layout-audit.mjs --keycaps` checks all 26 pairs, distinct colors, letter/picture containment, and landscape 48-pixel targets at seven phone/tablet sizes. Existing game checks pass; portrait and landscape previews were inspected.

## Landscape touch targets · v1.3.1

Removed whole-activity scaling in compact landscape. A single header row and side-by-side activity layouts leave controls at their actual size. Landscape letter keys and other visible buttons have a minimum 48 by 48 CSS-pixel target; Help/Repeat/Next use larger picture controls with accessible text retained. Pictures remain on all letter keys. Memory's new-trail control shares the main toolbar. Songs and keyboard screens rearrange existing elements and restore them on rotation without resetting the round.

Word Search now uses a 5 by 5 board in both orientations, preserving its puzzle when rotated and allowing 48-pixel cells in landscape. Control visibility, containment and no-scroll checks passed for 686 states at ten sizes, including 640×360, 740×360, 844×390, 915×412 and 1024×600, plus portrait/tablet/desktop regression sizes. Added all built-in blend words at the two smallest landscape sizes and portrait/landscape/portrait rotation checks for every activity. Blend answer choices occupy a separate row under the keyboard, so even long words fit. Screenshots for all 16 landscape activities are under `test-results/landscape`; representative keyboards, Music, Word Groups, Counting, Memory and Word Search were visually inspected.

## Renewed manual audit · v1.3.0

Re-read the manual activity instructions and replaced `MANUAL-AUDIT.md` with a 16-row comparison that distinguishes core mechanics, requested changes, and unverified parity. Corrected rhyme gaps to allow any position, added target blend audio to question/repeat and success feedback, limited this game to beginning/end blends, added the spoken vowel introduction, and renamed the contradictory Which one belongs title to Odd one out. Removed log from the dog/frog rhyme family because the current prepared phonics have different vowel targets. Added 64 offline rhyme-pair sentences, two prompts, and 28 contextual blend clips.

New `test-manual-content.mjs` checks multi-sound letters, consistent phonemic rhyme endings, every built-in rhyme sentence, and contextual blend references. Browser tests check non-first rhyme gaps, 30 beginning/end blend rounds, cue playback, and all activities. Catalog, screen-fit, pronunciation-name, speech-routing, content, and real browser audio checks pass. Exact melodies, speech clarity to children, and original question-bank parity remain unverified; see the audit for explicit adaptations.

## Held Letter Sounds · v1.2.9

Letter Sounds now requests a separate `phoneme-held:` clip bank. Thirty-seven continuous/vowel sounds have about 850 ms of sound plus a trailing pause; 15 stop/glide tokens reuse their brief native articulation. The generator sustains the steady middle of each source sound using periodic alignment/crossfades while preserving the original onset and release. No resampling slowdown, atempo filter, or reduced playback rate is used. Existing Sound It Out clips remain unchanged. This is synthesized sustain, not a human recording, so perceived clarity still needs parent listening.

`generate-held-phonics.mjs` uses native source WAVs produced by `generate-reference-phonics.mjs`; rerun both in that order to rebuild. `phonics-held.json` records the mapping and durations. Speech routing checks verify held-clip selection and playback rate 1. The browser playback check decodes all held clips, checks sustained active audio exceeds 700 ms, checks clipping, and plays a held SH sound to completion.

## Clues before answers · v1.2.8

The first Help tap now gives a spoken strategy/clue rather than simply repeating a question or filling in an answer. Picture groups name the common property, second Help highlights/explains the matching pair, and third identifies the odd picture. Rounds use four reviewed disjoint lists (animals, foods, clothes, vehicles), removing ambiguous broad nature/home/object combinations. Correct answers explain the grouping. These lists and clue text are editable in `lessons.pictureGroups`.

Spelling/catch first Help highlights the empty slot and prompts listening before supplying a letter on subsequent taps. Build a Robot first shows a picture clue without spending a guess; later help supplies a letter without a penalty. Word search first marks only a word's starting cell; later help traces the word. Counting first gives a one-by-one counting strategy before eliminating choices. Missing-letter/vowel, alphabet-order, rhyme, and blend games give spoken clues. Memory first leaves its first picture visible; second Help leaves the whole sequence visible. Exploratory letter/sound screens retain replay.

Added 22 locally generated Kokoro recordings for clues/explanations, preserving all phoneme clips. Content checks validate group references, category consistency, and disjoint membership. Browser checks cover 24 generated group rounds and first-clue behavior, progressive spelling help, penalty-free robot clues, game interactions, and screen fit. All clue phrases are verified in the offline speech index.

## Automatic next round · v1.2.7

Completed activities with a Next button advance after the answer jingle, all spoken feedback, and a 1.2-second viewing pause. This includes a completed Build a Robot loss after revealing/speaking its answer. Wrong guesses within an unfinished round do not advance. Manual Next, home/activity navigation, and app pause cancel the old transition. Hear again cancels the old transition and schedules a fresh pause after replay finishes; Help does not interrupt a finished round's feedback. Exploratory screens and songs without Next remain on their screen; memory retains its existing sequence progression. Browser tests hold speech completion to verify the round waits, then verify automatic progression and cancellation by manual Next.

## Answer tune variations · v1.2.6

Five distinct major happy melodies and five gentle minor try-again melodies replace the single tune per result. Each result type has its own shuffled bag; all five variations play before reshuffling, and a new bag cannot immediately repeat the preceding tune. Happy tunes last 3.40 seconds, try-again tunes 3.45 seconds. Volume, cancellation, and narration-after-tune behavior are unchanged. The answer-sound checks verify 50 selections per result type, full five-tune cycles, and no consecutive repeats. Offline browser rendering checks all ten variations for duration, audible levels, and clipping.

## Menu icon lettering · v1.2.5

Activity-icon letters now use white fill with a dark outer stroke painted behind the fill. Reduced lettering size and moved the alphabet/catch labels inward to avoid clipping. The phone-sized main-menu screenshot was visually inspected; existing game/browser checks pass.

## Random play · v1.2.4

The home-screen Let's play button now randomly chooses one of the 16 activities on each tap, using the same activity list as the menu. Individual activity cards still open the selected activity. Browser verification checks that the hero button can open an activity other than Learn Letters.

## Picture keyboards · v1.2.3

Every full A–Z keyboard now uses the same letter-to-picture mapping as Learn Letters, including alphabet order, missing letters/vowels, rhymes, blends, and Build a Robot. Used and disabled keys retain their pictures. The shared keyboard renderer always includes pictures; there is no picture-free option. The screen-fit audit checks all 26 keys have pictures and that pictures remain inside the keys at six screen sizes, alongside the existing artwork/overflow checks.

## Picture navigation · v1.2.2

Replaced the Help me star with a bundled puzzled-face illustration in a highlighted button. Home, hear again, next/previous, stop music, new memory trail, play, voice on/off, and grown-ups have consistent vector pictures alongside existing labels. All 16 activity cards have illustrations; rhymes use a cat and hat, Build a Robot uses a robot, and word search uses a magnifying glass. SVG avoids dependence on device emoji fonts for navigation. Buttons retain accessible names and the existing game interactions. Browser checks cover icon presence, activity-picture spacing, controls, and the existing screen-fit audit. This improves picture cues; comprehension by a particular child still needs observation.

## Native phoneme timing · v1.2.1

Parent listening found the previous clips sounded unnaturally slowed. Removed all FFmpeg time stretching from the reference generator and forced phoneme playback to rate 1, independent of the narration-speed setting. Regenerated all 52 clips using native synthesis timing (80 words/minute for sustained sounds, 140 for stops/stop-containing sounds), with a short trailing pause. Stops retain their brief release rather than a stretched burst. The existing 450 ms pauses in Sound It Out remain. This supersedes the earlier minimum 250 ms active-sound requirement, which encouraged distortion of stop sounds. Tests verify native playback, no time-stretch metadata, intended phoneme selection, and browser decoding. These remain synthetic samples; perceived naturalness needs parent listening on the device.

## Answer jingles · v1.2.0

Correct answers play a rising major melody (3.40 seconds); incorrect guesses play a gentle descending minor melody (3.45 seconds). These are newly synthesized tunes. Spoken feedback follows the tune, with short chimes for intermediate correct letters. Settings provide a saved answer-volume slider and both previews. Activity changes, replay/help, and app pause cancel pending sounds and queued narration. Memory waits for feedback to finish before replaying its sequence.

`test-feedback.mjs` verifies durations, cancellation/replacement, mute, and reuse of one audio context. `test-music.mjs` renders both tunes and all 27 songs to check audible levels and clipping. `test-game.mjs` checks that speech waits for the tune and that navigation cancels queued result speech, alongside the activity checks. Phone listening remains pending while the Android device is disconnected.

## Artwork layout correction · v1.1.4

Build a Robot now reserves a separate drawing frame above the guesses/word rows and keyboard. The original CSS changed the robot’s layout height while its absolutely positioned parts still extended to the original height. Removed that sizing mismatch, contained the art, separated the landscape columns, and made the losing state reveal one answer row rather than append a duplicate. Finished rounds disable guessing keys.

Guide robots in the header, song screen, and companion panel also have explicit frames. Object motion stays inside its layout box; switching activities clears old celebration particles. Compact landscape branding fits inside the header, and tablets show a single companion guide rather than duplicate guide robots.

`node scripts/test-layout-audit.mjs` checks 360 states across all 16 activities at 360×640, 390×844, 740×360, 768×1024, 1024×768, and 1280×900. It checks initial/expanded screens, retries/hints/results, all ten robot construction steps, losing/winning states, memory hints, song pages/lyrics, and completed word searches/spelling. Assertions check artwork containment, overlap with text/controls, duplicate answer rows, cleanup on activity changes, and viewport overflow. Robot screenshots at phone portrait/landscape and tablet sizes were visually inspected.
- Android: SDK resource/Java compilation, APK packaging, and debug signing verification pass. Offline runtime assets and 869 Ogg clips included. Android 8+, target API 35, no requested permissions.

Android follow-up: installed on the connected Samsung SM-G975F. Found and corrected Windows path separators in nested APK asset names by packaging assets with the JDK archive tool; the build now guards exact asset paths. Device WebView verified 16 home activities, 106 words loaded with HTTP 200, 869 indexed speech clips loaded with HTTP 200, and an Ogg word clip playing to completion. Document picker and every activity still need full physical interaction review. Synthesized phonics recordings still need a listening review; automated playback establishes working audio, not educational pronunciation quality.


## Music Corner review · v1.4.0

Reviewed the 27-song catalog against published melody references and documented variants/limits in MUSIC-AUDIT.md. Corrected Jack and Jill and other inaccurate notes, pickups, holds, and syllable rhythms. Added nine instrument profiles; Hickory's exact notes, tempo, and classic renderer are preserved. Song arrangements now have a canonical editable JSON source, so regeneration retains the corrections.

Passed npm test, song-catalog validation (including instrument coverage and Hickory hash), all-16-mode browser regression, and offline rendering of all 27 songs plus ten result jingles. All rendered tracks met existing loudness and peak thresholds. Levels saved in test-results/music-review/levels.json. These checks establish functioning audio and signal levels, not a human listening review of every song on a phone.

Android v1.4.0/code 25 built and signature-verified. APK SHA256: FAA15EF7442ECE865D884C72FEFB0FEB436D9247363B98F02D997FE6F91220ED.

## Word picture review · v1.4.1

Visually inspected a contact sheet of all 106 built-in word pictures. Added 24 bundled vector illustrations: acorn, eel, emu, gate, ink, jam, jug, lamp, mop, net, oak, oat, plum, quilt, top, unit, vet, wig, xylophone, yak, zip, zoo, glue, well. Color words retain color circles. Existing sun illustration retained. Pictures are reviewed adult illustrations; recognition by a particular child is not established by automated tests.

All activities now use the shared picture function, including odd-one-out choices, counting objects, and memory sequences. Previously these paths displayed raw emoji and bypassed illustration overrides. Built-in overrides apply only while the original emoji is unchanged, preserving parent-edited word packs.

Source artwork: scripts/build-word-pictures.mjs; regenerate with node scripts/build-word-pictures.mjs. Generated assets: assets/words/*.svg; lookup module: word-pictures.js. Full contact sheet: test-results/pictures/catalog.png. Picture decode and override checks, npm test, and all-16-mode browser regression pass.

Android v1.4.1/code 26 signature-verified and installed on Samsung [test-device]; dumpsys confirms versionName 1.4.1. Share copy pushed to /sdcard/Download/FamilyGames/Alphabert-1.4.1.apk. APK SHA256 50BDADC0C9E51BB29776ED04A6EC20604BE344E44EA5FBD4F38C8F4A7E21E475.
Final layout audit passed: 686 states across all 16 activities and ten viewport sizes, including rotation. No activity scrolling, block overlap, or artwork escape; landscape touch targets at least 48 pixels.

## Learn Letters picture speech · v1.4.2

Each example picture in Learn Letters is now a button labeled Hear [word]. Tapping it cancels the current introduction and says only that pictured word, preserving the chosen letter and examples. Supports touch, mouse, Enter, and Space through native button behavior. Custom examples and bundled illustrations share the same handler. Browser regression covers separate ant/ape picture taps, preserving letter selection, and Enter activation.

## Blend Detective audio · v1.4.3

Replaced all 28 target-word blend cuts with cues assembled only from isolated reference consonants. Whole-word cuts could include vowel transitions (reported as sno for sn in snow). Continuous consonants now last 0.48 seconds each at native pitch and rate. SN lasts about 0.955 seconds before its trailing silence. Stop consonants keep their natural releases rather than adding an uh vowel. Custom blend fallback uses the held phoneme bank.

npm test and real browser playback/decode checks passed, including all 28 new blend files, native playback rate, finite/non-silent/non-clipped samples, and sustained-consonant timing assertions. Snow and snail have byte-identical source SN waveforms, establishing that their different target vowels are not present in the generated cue. Automated identity/decode checks do not establish perceptual clarity for every learner.

## Sound replay buttons and insect · v1.4.4

Sound It Out's phoneme chips are now native buttons with 48-pixel minimum touch targets. A tap cancels the automatic sequence, highlights the selected chip, and plays its phoneme at rate 1, preserving the selected word. Multi-letter phonemes such as aw are routed as a single sound. Browser tests cover l/aw/g in log, Enter activation, and cancellation of subsequent automatic speech. Landscape places the chips beside the picture below the full keyboard; rotation restores their portrait position. Learn Letters picture buttons no longer shrink their touch targets during artwork animation.

Following confirmation that insect's separate sounds were unclear, added six word-specific phoneme clips from its English-US word context. Continuous sounds/vowels use 0.45-second steady-state holds, with vowel boundary transitions trimmed; k/t keep natural releases. No playback slowing. Automatic playback and individual replay use the same word-specific clips, falling back to the generic bank for other words. Generation source: scripts/generate-insect-sounds.mjs; phoneme identities and timings: audio/insect-sounds.json. Perceptual review on the phone remains distinct from routing and decode checks.

Validation: npm test, all-16-mode browser regression, real playback/decode including all six insect clips, and 686-state ten-viewport layout/rotation audit pass. Android v1.4.4/code 29 signature-verified, installed, version-confirmed, and copied to Downloads/FamilyGames/Alphabert-1.4.4.apk. APK SHA256 AEA688BD15516EBAAAA3BF21A58581922FF2A7AD1DF45E3C13E1929B5A6F1EC8.

## Spoken menu help · v1.4.5

Holding any of the 16 activity cards or Let's Play for 550 ms speaks its name and a short child-facing explanation in the existing offline Kokoro voice. Release after a hold stays on the menu; normal tap/keyboard activation opens the activity. Movement beyond 12 pixels, pointer cancellation, scrolling, blur, and visibility changes cancel pending holds. Cards highlight while held; text selection and native context menus are disabled on those buttons.

MENU_HELP in menu-help.js is shared by the gesture and speech preparation. Generated 17 new offline descriptions while retaining existing indexed phoneme/blend/word clips. npm test and browser regression pass, including all 17 holds, release suppression, subsequent normal tap, keyboard activation, scrolling movement, and pointer cancellation. All 17 generated recordings decode with audible samples and expected duration.
Android v1.4.5/code 30 signature-verified, installed on [test-device], version-confirmed, and copied to Downloads/FamilyGames/Alphabert-1.4.5.apk. APK SHA256 49E9073A2F0EEDE604774426CB9A3FEA1032B190C6C9E9AD13C1CC09DD99C21D.

## Playful Bertie · v1.5.0

Tapping Bertie runs one of 60 original reaction lines paired with 12 motion styles: wave, bounce, wiggle, twist, march, peekaboo, nod, head shake, disco, sleepy, flap, and stretch. A shuffled bag visits every reaction before repeating, including avoiding the last/first repeat across bag boundaries. Lines include greetings, pretend play, short jokes, and gentle encouragement. All 60 use new bundled recordings in the existing Kokoro voice. Source: bertie-reactions.js; edit the list and regenerate speech to extend it.

Bertie speaks on the main menu; in games, tapping triggers visual reactions only, preserving questions, word sounds, memory trails, music and automatic next behavior. A 500 ms debounce prevents rapid tap spam. Navigation/app pause clears motions and existing speech. Robot art is a focusable button role supporting Enter/Space, including the phone hero previously inside a pointer-events-disabled decoration. Both app and system reduced-motion settings use a static face-color response instead of animated movement.

Passed npm test with 60-unique/offline/shuffle/motion checks, all-16-mode browser regression with reaction/cooldown/keyboard/lesson-preservation coverage, and phone-sized touch/reduced-motion/navigation checks. Decoded all 60 new recordings with finite audible samples and expected duration; visually inspected 12 motion poses in test-results/bertie/motions.png. Automated audio checks do not substitute for a listening review.
Full 686-state layout/rotation audit passed. Android v1.5.0/code 31 signature-verified, installed on [test-device], version-confirmed, and copied to Downloads/FamilyGames/Alphabert-1.5.0.apk. APK SHA256 6E3F9C7EF665A6E8FBA9B3A8C827F49219A8D6C5BD6D83C38A5D3BBB3B83D7A4.

## Letter Sounds picture replay · v1.5.1

Each Letter Sounds example picture is now a keyboard-accessible button that replays its own lesson sound using the held phoneme bank. For U, Up selects u (short /ʌ/) and Unicorn selects yoo (/ju/), rather than speaking the object word or alphabet name. Tapping cancels the remaining automatic narration while preserving the selected letter and examples. Applies to every lesson sound, including multiple examples for vowels, C/G, and Y. Reuses the existing picture-button styles and native offline audio bank; no new synthesis or global pronunciation changes.

Browser regression verifies separate u/yoo picture routes, held playback, selected-letter preservation, Enter activation, and cancellation of later automatic speech.
Android v1.5.1/code 32 signature-verified, installed on [test-device], version-confirmed, and copied to Downloads/FamilyGames/Alphabert-1.5.1.apk. APK SHA256 8A8599A33D498CD4754BAC55C2AA9CF85A46420547183F4CDE101E64FEE8FAF5.
Final layout audit passed: 686 states across all 16 activities and ten viewports, including rotation, 48-pixel landscape targets, and no artwork overlap or activity scrolling.

## Clean sustained-consonant endings · v1.5.2

Letter Sounds previously extended the steady portion and then appended the original reference release. For m extracted from map, that release could anticipate the following vowel, consistent with the reported mmmme ending. Rebuilt the held bank: f, h, l, m, n, ng, r, s, sh, th, v, z now exclude the final 40 percent of the source from both period selection and sustain output, and end with a 25 ms fade to silence. Length remains 0.85 seconds at native pitch/rate. Vowel/diphthong endings and stop/glide clips remain as before. Sound It Out, blend and insect clips were not regenerated.

New regression test supplies a deliberately marked tail and verifies none of it enters either voiced or noise sustain output, checks exact duration and zero final sample, and verifies consonant/vowel routing metadata. npm test and real browser playback/decode pass, including held-duration and peak checks. Files are versioned held-v2 and index paths updated to avoid stale audio. These checks verify signal construction; phone listening remains the perceptual check.
Android v1.5.2/code 33 signature-verified, installed on [test-device], version-confirmed, and copied to Downloads/FamilyGames/Alphabert-1.5.2.apk. APK SHA256 F49CD4826D2FD8A53159BBF6C99C70FDB4AF574D5202AFFDDC8AC619E4B80C2D.

## Sound It Out boundary cleanup · v1.5.3

The prior clean endings were only in Letter Sounds' held bank. Sound It Out continued to use the generic references: ee extracted from eel and r extracted from red could retain neighboring sound transitions. Added a dedicated phoneme-clear bank for all 52 tokens. Steady consonants and simple vowels use only the first 60 percent of their source, sustain for 0.5 seconds, and fade cleanly; changing vowels retain their glide. b/d/g/k/p/t now come from word-initial releases (bat/dog/goat/cat/pig/top), rather than weak final releases, with no added vowel or stretched playback. Zebra remains z / ee / b / r / schwa. This affects all built-in Sound It Out words and both automatic and individual-button replay.

Insect retains its six context-matched clips, rebuilt as v2 with the same safe-tail exclusion for its sustained sounds. Letter Sounds' held bank is unchanged. New generation script scripts/generate-clear-phonics.mjs; audit audio/phonics-clear.json. Speech routing chooses a word-specific clip, then the clear bank when wordId is supplied, with existing held/generic fallbacks.

npm test and real browser decoding/playback pass, including all 52 new clear clips and six insect clips. Speech regression explicitly checks zebra's ee routes to the clear bank at native playback rate. Listening on the phone remains the perceptual review.
Android v1.5.3/code 34 signature-verified, installed on [test-device], version-confirmed, and copied to Downloads/FamilyGames/Alphabert-1.5.3.apk. APK SHA256 5D865879686FA41FB015A0FBB17CAAE0C22D039DB893A920388CC703949A0AD0.

## Rhyme Time pictures and target clarity · v1.5.4

Both rhyme pictures are now native buttons that say their own word, preserving the answer and selected pair. The reference is labeled Rhymes with; the word requiring a letter has a yellow panel, strong green border, downward arrow, Finish this word label, and a large question mark in a dashed blank. Narration says the pair and explicitly names the target: Find the missing letter in [word]. Existing offline recordings cover these prompts. Picture taps cancel queued narration; on solved rounds they defer automatic Next until the picture word finishes.

All-16-mode browser regression passed, including both picture voices, keyboard activation, target-marker placement, and unchanged answer state. Visually reviewed phone portrait and landscape in test-results/rhymes/portrait.png and landscape.png. The compact layout retains 48-pixel picture touch targets.
Android v1.5.4/code 35 signature-verified, installed on [test-device], version-confirmed, and copied to Downloads/FamilyGames/Alphabert-1.5.4.apk. APK SHA256 8A9B8C57F00660C9E11D0732EDF637090A1AC9138251ED05860CC6D8CD12A320.
Full layout audit passed: 686 states across all 16 activities at ten viewports, including rotation, minimum 48-pixel landscape touch targets, and no activity scrolling or artwork overlap.

## Blend boundary endings · v1.5.5

Blend Detectives still used v2 blend clips, where trimming the last 18 percent of each reference phoneme did not exclude all of its keyword transition. The sustain helper then replayed the remaining source release. This could make fr sound like fro even though the clips were not cut from frog itself. Rebuilt all 28 blend cues as v3: continuous components use the safe-release helper, excluding the final 40 percent of the reference source from sustain processing and fading the held sound cleanly. Each continuous component stays 0.48 seconds at native pitch/rate; stops are unchanged. Frog uses only f/r; the fr/ro/og answer choices remain unchanged.

npm test includes all blend metadata checks and a specific frog f/r regression. Existing synthetic-tail sustain tests verify that excluded endings cannot be appended. Real browser playback decodes all 28 blend files and checks finite, audible, unclipped signals. Actual phone listening remains the perceptual check.
Android v1.5.5/code 36 signature-verified, installed on [test-device], version-confirmed, and copied to Downloads/FamilyGames/Alphabert-1.5.5.apk. APK SHA256 653CAA81A363F27636A0065168BAB47B4E4F6342DBEDE5ED47C82113ABAD3DDE.

## Blend Detectives choices · v1.6.0

Removed the full alphabet keyboard at the user's request. Each built-in round now has six distinct, valid consonant-blend answers of the target length, with the correct answer once. Distractors come from blends in other words and a small consonant-blend fallback list, rather than arbitrary adjacent vowel-containing pairs such as ro/og for frog. Three-letter custom blends remain supported.

Added a paged picture-and-word picker covering all 27 existing built-in blend words, six per page. The current word is highlighted. Selecting a word starts its round; paging only changes the picker and preserves the current question. Imported words with eligible beginning/ending blends appear automatically. This exposes the existing word pool; it does not add new vocabulary or recordings.

Browser coverage checks no keyboard, six answer buttons, word selection, selected styling, all pages including the imported string word, and preservation of the active round when paging. Phone portrait and compact 640x360 landscape screenshots visually reviewed in test-results/blends/. The new three-column landscape layout keeps picture, answers, and word picker separate.
All-16-mode browser regression and full 686-state layout audit pass. Android v1.6.0/code 37 signature-verified, installed on [test-device], version-confirmed, and copied to Downloads/FamilyGames/Alphabert-1.6.0.apk. APK SHA256 56BB260DE10852A509AB6B4CAA98DEE20039759B1E43B15B01AEF2AA85D08E7C.

## Contextual picture replay · v1.6.1

The shared art() renderer now produces accessible Hear [word] buttons. Word Scramble, Letter Catch, Missing Letters, Missing Vowels, Sound It Out's main illustration, and Blend Detectives' main illustration all replay the depicted word. Counting's object group is one speech button so tapping any counted picture names the object without choosing a number. Build a Robot's revealed hint picture also speaks. Learn Letters, Rhyme Time, and Word Search retain their established word replay behavior. Letter Sounds retains sound-specific picture playback. Letter/sound answer keys, odd-one-out choices, blend-word selection, and memory inputs keep their existing game actions.

Picture replay cancels queued narration and preserves the selected word, answer, input, count, and missing-letter index. Solved rounds reschedule automatic Next after the requested word finishes, rather than advancing during speech. All use existing offline word recordings and custom-word fallback; no audio regeneration.

Browser regression adds picture speech/state-preservation checks for seven additional modes and the robot hint, alongside existing letter/sound/rhyme/search checks. Full layout audit also covers the new native picture buttons and minimum landscape touch sizes.
Android v1.6.1/code 38 signature-verified, installed on [test-device], version-confirmed, and copied to Downloads/FamilyGames/Alphabert-1.6.1.apk. APK SHA256 B5C8B44B1CF20F6A59A2B9D39BB8FC1CC07D7509E71E3F7DC21FF260F36EBBAC.
Final full layout audit passed: 686 states across all 16 activities and ten viewport sizes, with rotation, 48-pixel landscape touch targets, no block overlaps, no escaped artwork, and no activity scrolling.

## Build a Robot picture preview · v1.6.2

The manual's activity 13 is Hangman: ten chances, eyes/blank spaces at the start, and robot parts added after incorrect guesses (PDF pages 22-23 / printed pages 21-22). Those instructions do not explicitly describe a starting object animation. Following the user's observed toy behavior/request, added a picture-clue introduction: show and name the selected mystery object for 2.3 seconds, animate its picture inside the existing robot frame, then remove it and enable the letter keyboard. Spelling remains hidden. Reduced motion shows the same static clue.

Guess attempts, including physical keys, are ignored during the preview without consuming chances. Hear Again replays the same clue, preserving word, guesses and chances. Navigation, pause, next round, or picture replay cancels the preview timer cleanly. Picture taps retain the established word playback behavior. The clue uses the current built-in/custom word picture; this is an original UI animation rather than a reproduction of the toy's original animation frames.

Browser regression covers intro picture identity, 26 disabled keys, ignored premature guesses, transition to normal play, replay preservation, navigation cleanup and existing win/loss rules. Portrait and 640x360 landscape preview screenshots visually reviewed under test-results/robot-preview/. Layout audit adds preview-state checks and waits for guessing to unlock before testing all ten construction steps.
Android v1.6.2/code 39 signature-verified, installed on [test-device], version-confirmed, and copied to Downloads/FamilyGames/Alphabert-1.6.2.apk. APK SHA256 2FC7338FBF717A1DEC8564FDB45318AB6E852F1F75F2BCBBF91D292124B845E3.
Final layout audit passed: 696 states across all 16 activities and ten viewports, including the new picture preview, rotation, construction steps, minimum 48-pixel landscape targets, and no artwork overlap or activity scrolling.

## Human E/F phonics references · v1.7.0

Investigated the reported E-name confusion and unnatural F. Lesson mapping remains short e = /ɛ/ in egg and long ee = /i/ in eel; the letter name E is /i/. Added a natural letter-name override for E and four openly licensed human pronunciation recordings: ee /i/, short e /ɛ/, short i /ɪ/, and f /f/. They take precedence over held/generated clips, except existing word-specific insect clips. Automatic vowel exploration now explicitly announces Short sound and Long sound before the corresponding example.

F is a cropped natural unvoiced interval (0.225-0.505 s) from Peter Isotalo's [afa] reference. It is intentionally shorter than the 0.85-second synthetic held F: no looping, repeating, slowing or pitch modification was applied. Human vowel takes retain native durations. These recordings may differ in speaker from Bertie's narration. Sources, creators, source hashes, crop times, modifications and CC BY-SA 3.0 terms are in audio/human-phonics.json and audio/licenses/HUMAN-PHONICS-CREDITS.txt. Publication script: scripts/publish-human-phonics.mjs. Original downloads are development-only in .human-phonics-cache.

Plugin Management discovery for phonics/speech/pronunciation returned Descript, an editor; no dedicated phonics integration was found in that search. Research found Commons human phonetic references, with source/licensing checked before publication. Some additional vowel references were examined/downloaded for comparison but not published: no wholesale replacement was made from unreviewed files.

Inventoried all 52 phoneme tokens in audio/phonics-review.json with their effective Letter Sounds source. Most remain generated; no human listening certification is claimed. The grown-up settings link Phonics audio sources and recordings opens a bundled page with the four human recordings, listening controls for all 52 current sounds, and attribution. No account/network is required in the game.

npm test passed, including human E-name routing, unchanged short/long E mapping, native playback rate, no loop/stretch metadata, attribution and review inventory. Real browser playback decodes all four human files alongside all existing phonics/blend banks. These establish identity/routing/signal behavior, not a perceptual guarantee of all 52 sounds.
All-16-mode browser regression including short/long E narration passed. Review page has 56 working audio controls; four human files have finite audible peaks with no clipping. Android v1.7.0/code 40 signature-verified, installed on [test-device], version-confirmed, and copied to Downloads/FamilyGames/Alphabert-1.7.0.apk. APK SHA256 0DEC5F8E897DF5809181FACAC9D656870DAA03C27F23385DE452F4ED4FF72831.

## Blend Detectives human F propagation · v1.7.1

Blend Detectives played preassembled blend files, so the new natural F override in Letter Sounds/Sound It Out did not affect its F components. Updated the blend generator to prefer any currently indexed human consonant recording. Human components have trailing silence trimmed, keep their original articulation, and are not sustained, looped or stretched. Generated components retain the existing safe-release sustain. Rebuilt all 28 files as v4; flag/fl, frog/fr and gift/ft now incorporate the same human F recording used by the phoneme player.

Added a regression requiring every blend component with a current natural override to reference that recording and mark it human/non-looped/non-sustained. This makes a stale synthetic component fail checks when another human override is added. npm test and browser playback/decode checks pass, including all 28 blend files. Other blend consonants remain generated; this is not a claim that the entire blend bank is human-recorded or perceptually certified.

Adapted human-containing blends and source/modification/license information are listed in audio/licenses/HUMAN-BLENDS-CREDITS.txt under CC BY-SA 3.0. Regeneration order: publish human phonics first, then generate-blend-audio.mjs, so the generator picks up current overrides.
Final blend metadata regression passed after rebuilding, with human blend attribution included in the grown-up credits page. Android v1.7.1/code 41 signature-verified, installed on [test-device], version-confirmed, and copied to Downloads/FamilyGames/Alphabert-1.7.1.apk. APK SHA256 D2E2B9249DB5885915DD93CCF14F7AC6272735B812CD19A629B26B913B2F8A14.

## Spoken Bertie reactions during games · v1.7.2

Removed the menu-only restriction on Bertie's 60 spoken reactions at the user's request. When idle, any visible Bertie can speak the same greeting, joke, or playful line as on the menu. An active voice, feedback jingle, memory-listening phase, or robot picture preview keeps priority; the tap still animates Bertie but does not start competing speech. Narration scopes reserve the pauses between Sound It Out phonemes, letter-sound examples, memory objects, and multipart questions/explanations, avoiding a joke starting in the middle of an unfinished lesson sequence.

Reaction speech preserves the current round and does not call the game stop/reset path. User actions/new lesson speech can supersede the reaction as usual. If a solved round is waiting for automatic Next, the timer is deferred until the reaction finishes, with token/result-serial checks to avoid advancing after navigation or newer feedback. Repeated taps during current speech keep the visual reaction without replacing the spoken line.

Browser coverage updated for idle in-game speech, active-speech priority with visual reactions, and silence during the gap between Sound It Out phonemes. Existing tests continue to cover cooldown, keyboard activation, navigation cleanup and all 16 activities.
All-16-mode browser regression passed with the updated in-game idle-speech and narration-priority checks. Android v1.7.2/code 42 signature-verified, installed on [test-device], version-confirmed, and copied to Downloads/FamilyGames/Alphabert-1.7.2.apk. APK SHA256 D2EA6A55D719D841DB781867C6E7067BA45F48DC35043D49F179B0A0F4693241.

## Help answers spell letters explicitly · v1.7.3

The generic second-Help path interpolated state.answer into a sentence, so blend dr was sent as The answer is dr. and could be pronounced as a word/abbreviation such as dry. Alphabetic help answers now use a dedicated offline The answer is. prefix followed by SpeechService.letter for each character, with a 180 ms gap. Visual blend hints separate uppercase letter names (D · R). Applies to Blend Detectives and generic single-letter reveals in Alphabet Order, Missing Letters/Vowels and Rhyme Time. Number, object-word, incremental spelling, and memory hint paths retain their own context-specific behavior.

The answer sequence reserves narration priority so Bertie cannot start a joke in its gaps, and checks round/result tokens between letters so navigation, newer feedback or another hint cancels the remainder. No phoneme audio or whole-word pronunciations changed.

Added browser regressions for drum/dr -> D/R, a single alphabet-order answer, and an imported string/str -> S/T/R. Offline prefix coverage is checked by npm test. General source inspection found the other raw state.answer sentence in Counting; that path intentionally speaks a number and remains unchanged.
npm test and all-16-mode browser regression passed, including D/R and S/T/R help spelling. Android v1.7.3/code 43 signature-verified, installed on [test-device], version-confirmed, and copied to Downloads/FamilyGames/Alphabert-1.7.3.apk. APK SHA256 733BBCD37762AD56E5D0B02D64EB4470184C0E2A0A43FF9705232F512D37C80C.

## Fifty more jokes and full-body Bertie · v1.8.0

Added exactly 50 new short question/answer jokes in bertie-jokes.js, bringing the reaction catalog from 60 to 110 unique spoken reactions. All new lines are generated offline in the existing Kokoro narrator voice; four pronunciation dictionary entries were added for new words/inflections. Existing shuffle/no-immediate-repeat behavior and narration priority remain intact.

Replaced the subtle movement assignments with 12 articulated routines in bertie-animations.css: big wave, squash-and-stretch jump, double full spin, cartwheel, high-kick dance, moonwalk, stepped robot dance, cover-the-face peekaboo, victory dance, sleepy fall/wake, jumping-jack star jump, and bend/reach routine. A separate inner performer moves the torso/head/arms/legs while the outer robot's hit target and layout scale remain fixed. The shadow stays on the floor. Routines use preparation, large poses, turns, and returns to neutral; old 3-degree wiggles are no longer the active reaction assignments. Both app/system reduced motion disable the articulated animation.

npm test passed with 110 unique indexed reactions and non-repeating shuffled bags. test-bertie-animation.mjs exercised multiple timeline poses for all 12 routines, verified unchanged outer touch-target dimensions, respected system reduced motion, and decoded all 50 new joke recordings with finite audible signals and expected duration. All-16-mode browser regression passed after the rig change. Moving preview frames and GIF are under test-results/bertie-dynamic; three timeline poses for four routines were visually reviewed. The preview is captured from actual app CSS/markup, not concept art.
Android v1.8.0/code 44 signature-verified, installed on [test-device], version-confirmed, and copied to Downloads/FamilyGames/Alphabert-1.8.0.apk. APK SHA256 82FDCE5A29B008ABE79AC13E414D5CCF37B13E870EBE706E7381A76C561F9C0E.
Final layout audit passed: 696 states across all 16 activities and ten viewports, including rotation and robot construction/preview, with no block overlaps, escaped artwork or activity scrolling; landscape touch targets remain at least 48 pixels.

## Build a Robot loss explanation · v1.8.1

After all ten chances are used, capture the target letters the child never guessed (unique letters in word order), reveal the word, and highlight all occurrences of those letters with a dashed amber border. The gentle incorrect-result jingle is followed by The word was [word], Let's spell it [every letter name, including repeats], The missing letters were [only unguessed unique letter names], and Let's try again. Three new offline narrator clips supply the phrases; alphabet names use the existing explicit letter-name bank.

Automatic Next waits for the entire explanation and normal pause. Hear Again on a lost round replays the explanation rather than asking the child to guess with a disabled keyboard. Sequence token/result checks stop it on navigation or newer actions; narration reservation protects it from Bertie joke interruptions. Individual incorrect letter guesses retain normal gameplay; the full answer/spelling explanation occurs when the round is lost.

Added browser regression: guess one correct letter, exhaust ten incorrect guesses, check captured missing letters, assert spoken whole-word spelling followed by only missed letters, verify highlighting, prevent early automatic Next, replay the explanation, and navigate away. Offline speech tests require the new narration clips.
npm test and all-16-mode browser regression passed, including full-word/missed-letter loss narration and replay. Compact landscape loss screenshot visually reviewed. Android v1.8.1/code 45 signature-verified, installed on [test-device], version-confirmed, and copied to Downloads/FamilyGames/Alphabert-1.8.1.apk. APK SHA256 600C299174791E856458F7B8B4E001ECF3B90E37DD2C10750AFC2C258CC178B2.
Full 696-state layout audit passed across all 16 activities and ten viewports, including loss/reveal states, rotation, and at least 48-pixel landscape touch targets, with no block overlap, escaped artwork or activity scrolling.

## Context-aware first Help across all activities · v1.9.0

Reviewed all 16 modes and replaced the generic first-hint behavior with the state-aware selector in context-hints.js. Full first/later behavior matrix is in HELP-AUDIT.md. New clues use gap position, blend position/length, spelling progress, search direction/valid prefix, prior robot guesses/category, memory progress, object count grouping, selected letter properties, and current music state. All 49 finite clue texts have offline narration.

Removed first-click answer leakage: no isolated missing-letter phoneme, mystery-word picture/name, memory sequence replay/first-object reveal, or hidden-word start cell. First Help preserves partial input and answer choices. Later stronger help remains, including explicit blend-letter spelling and the robot-loss explanation. Music Corner now has its own Help button. Pure and live browser tests cover the non-revealing first click in all 16 activities.
npm test, pure all-mode contextual clue checks, all-16-mode live first-Help invariants and full browser regression passed. Full 696-state layout audit passed with Music Corner Help and new clue text. Android v1.9.0/code 46 signature-verified, installed on [test-device], version-confirmed, and copied to Downloads/FamilyGames/Alphabert-1.9.0.apk. APK SHA256 CA25B487EBBC05C2E826D21A2B5748B7F141385A07C885976DD1CF87EBD2581B.
# ElevenLabs phonics release · v1.10.0 / code 47

Installed successfully on [test-device]; dumpsys confirms versionName 1.10.0 and versionCode 47. Relaunched the app and copied the APK to Download/FamilyGames/Alphabert-1.10.0.apk. Android rejected incremental installation, then ADB's streamed-install fallback succeeded.

Published 53 sound labels (45 unique sound recordings), 26 separate alphabet names, and 30 assembled word-specific blends from the parent-approved Roger / Eleven v4 trials. Ant/book/web use the separately approved retry. Original timing retained; no looping or stretching. Short-oo/book is separate from oo/moon. New bank takes precedence over earlier synthetic and human phonics, including insect's contextual overrides. Narration and complete word recordings retain the existing voice.

`npm test`, all-16-activity browser regression, and `node scripts/test-elevenlabs.mjs` passed. Dedicated checks exercised every built-in word's individual sounds, all alphabet names, and all blends at playbackRate 1; Chrome decoded all 101 unique new recordings with finite non-silent samples. APK ZIP inspection confirmed every new file, playback code, report, and review page is packaged. Signature verification passed. APK SHA256 BE18C14AD2621C47E620B014EB406A1C0A05E881948C19C3DB835C0CE6D6E95B.

Listening evidence is the parent's source-take approval. Engineering-selected cut boundaries and newly joined blends have not received individual listening approval; automated checks do not establish naturalness or phonetic correctness. Grown-ups includes a complete playable review. Full layout audit was not repeated: child activity layout did not change.

# Full Roger voice migration · v1.11.0 / code 49

Subsequent installation completed on [test-device] after reconnection. ADB streamed install returned Success; package inspection confirms versionName 1.11.0 / versionCode 49. Relaunched MainActivity. Share copy saved to Download/FamilyGames/Alphabert-1.11.0.apk; on-device SHA256 matches FF69D3C6D0E6ABFEA946F7759267BFBE3BCDDFA76602B074C6712679F598B2B1.

All 1,834 existing whole-word/narration keys migrated to Roger / Eleven v4, covering the 106 built-in words, instructions, contextual hints, greetings and all 110 Bertie reactions. Compositional planning reduces the 52,099-character corpus to 444 reusable pieces / 12,948 input characters. API turn timestamps locate complete pieces; repeated wording is assembled locally with 35 ms pauses, preserving all original spoken words. No runtime API calls or credentials are needed. Unprepared future custom content retains the existing device-voice fallback.

The six short stop consonants were replaced first in v1.10.1/code 48 with fresh naturally articulated cues, 0.25–0.485 seconds before playback padding, moderate gain and peak limiting. No looping or time stretching. That intermediate release was installed and version-confirmed on [test-device] and copied to Download/FamilyGames/Alphabert-1.10.1.apk (SHA256 357AB0149B040696A3B4B0AE935BA0EC76F9E6A07435B7D5F7D8D55B73BFF9E8).

Full release checks passed: npm test; all-16-mode browser regression; Chrome decoding of every 1,834 narration outputs and 101 unique phonics/name/blend clips; all built-in word/letter/blend routing at natural rate; literal-word reconstruction checks for every composed phrase; new consonant duration/RMS regression guards. API generation recovered from a temporary 502 by retrying only remaining pieces in smaller batches. Publisher accommodates up to 250 ms of provider timestamps extending into MP3 end padding, clamping only to the full decoded source end.

APK signature passed; ZIP inspection verified all 1,834 narration assets and scanned every entry to establish the local API key/cache is absent. SHA256 FF69D3C6D0E6ABFEA946F7759267BFBE3BCDDFA76602B074C6712679F598B2B1. Output: android/AlphabertWordLab.apk and android/Alphabert-1.11.0.apk. Phone disconnected before full-release installation; v1.11.0 is built/verified but not yet installed. Individual new clips still need parent listening review; automated checks establish coverage, routing and signal health, not perceptual correctness.

# Speech boundary repair · v1.11.1 / code 50

Parent reported Learn Letters sounding like "A dis for and" on every letter. The shared is-for fragment came from consecutive unpunctuated dialogue inputs immediately after gift. Provider timestamps/text checks were insufficient to prevent neighboring speech/coarticulation crossing the cuts. Old assembled A example was locally transcribed as "A does four and".

Regenerated 171 unpunctuated words/fragments independently, one utterance per API response without timestamp cuts. Regenerated all 132 Learn Letters introductions/example lines as complete independent sentences; their runtime recordings bypass composition. The repair plan has 3,607 input characters, with five initial A candidates subsequently regenerated using literal A after the local transcription check flagged ambiguous Ay. No additional account purchase or key permission expansion was performed.

Local ASR matched the new A/ant, A/ape and B/bat sentences, and all 26 complete letter introductions in order. This is additional content evidence, not a human naturalness certification. Browser checks decoded every 1,834 narration outputs and 101 unique phonics/name/blend recordings. Full npm checks passed. Targeted real Learn Letters UI regression clicked all 26 keys, checked complete introduction/example recording selection (including both vowel examples), and rejected native fallback. Manifest guards require 171 independent pieces and 132 independent complete lesson sentences.

APK signature and complete audio packaging passed; every ZIP entry was scanned to verify the API credential is absent. SHA256 999AAB01C922915CD31224BD6FA092F94BEF51648BCCDAFA7393F520A622ED33. Installed successfully on [test-device], versionName 1.11.1 / versionCode 50 confirmed, MainActivity relaunched. Share copy Download/FamilyGames/Alphabert-1.11.1.apk has matching on-device SHA256. Older share APKs remain available; use the 1.11.1 file for sharing.

# Music Corner pictures · v1.11.2 / code 51

Added bundled vector pictures on the right of all 27 song labels via song-pictures.js (clock/mouse, lamb, bus, bridge, horse, rain, well, spider, star and other title-related subjects). Kept the letter badges and adjusted title flow. Compact landscape uses two columns to leave room for the picture and readable title.

Full 696-state layout audit passed during the change across all 16 activities and ten viewports. After the final title-wrap and compact-column refinement, a targeted check covered all 27 buttons across all five pages at six phone sizes (162 buttons): right-side picture placement, label containment, buttons inside the play area, and landscape targets at least 48 pixels. Portrait and landscape screenshots visually reviewed under test-results/song-pictures. Packaged module and final compact layout verified in the APK.

APK signature passed; SHA256 5ED8EA448BCD717549F7FE220073993F835D8414BFDF45A0ED6AE7D045DFF3E6. Installed successfully on [test-device], versionName 1.11.2 / versionCode 51 confirmed, and app relaunched. Share copy Download/FamilyGames/Alphabert-1.11.2.apk has matching on-device SHA256.

# J audibility · v1.11.3 / code 52

Replaced the 110 ms J onset cut with one complete independently generated Roger cue. Source 1.12 seconds; encoded clip 1.22 seconds with padding; browser-measured active articulation 0.489 seconds, RMS .088 and peak .809. No looping or time stretching. The new J is selected in Letter Sounds and Sound It Out; alphabet-name Jay stays separate. New regression guards require standalone provenance, active articulation over 200 ms and RMS over .01. All phonics routing/decoding checks and npm checks passed. These are signal/routing checks; the new cue still benefits from parent listening review.

APK signature and packaged J mapping/file verified. SHA256 95A16E6D3765969A2BCADCF4D569E5E885A59D7C70D1A05BDF27F70E47E47ED9. Installed successfully on [test-device]; versionName 1.11.3 and code 52 confirmed, app relaunched. Share copy Download/FamilyGames/Alphabert-1.11.3.apk has matching on-device SHA256.

# Q/kw audibility · v1.11.4 / code 53

Replaced the 120 ms kw cut with a complete independently generated Roger cue. Browser-measured active articulation 0.469 seconds, RMS .099 and peak .796; encoded duration 1.06 seconds including silence/padding. Both kw and qu map to it, and the q alias selects it. No slowing, stretching or repetition. Dedicated independent-source, active-duration, RMS and alias-routing guards passed, along with all phonics decoding/routing and npm checks. Parent listening remains the perceptual check.

APK signature and packaged kw/qu file mappings verified. SHA256 03A8DFE7633769163E810EB9F23CE16CA84BA6BCB15780CCC6B1DB929205E473. Installed successfully on [test-device]; versionName 1.11.4 and code 53 confirmed, app relaunched. Share copy Download/FamilyGames/Alphabert-1.11.4.apk has matching on-device SHA256.

# W audibility · v1.11.5 / code 54

Replaced the 140 ms W extraction with a complete independent Roger cue. Browser-measured active articulation 0.358 seconds, RMS .082, peak .855, encoded duration 1.06 seconds including silence/padding. No slowing, stretching or repetition. Dedicated independent-source, active-articulation and RMS guards passed along with all phonics decoding/routing and npm checks. Parent listening remains the perceptual check.

APK signature and packaged W file/mapping verified. SHA256 80F41529EBA92E420F10EDA81EA47B1B28235F5FDE3C41578AC2049474B8577E. Installed successfully on [test-device]; versionName 1.11.5 and code 54 confirmed, app relaunched. Share copy Download/FamilyGames/Alphabert-1.11.5.apk has matching on-device SHA256.

# X/ks audibility · v1.11.6 / code 55

Replaced the 265 ms ks extraction with one complete independent Roger cue. Browser-measured active sound 0.527 seconds, RMS .045, peak .363; encoded duration 1.14 seconds including silence/padding. No slowing, stretching or repetition. Independent-source, active-articulation, RMS and x-to-ks routing checks passed, along with phonics decoding/routing and npm checks. Parent listening remains the perceptual check.

APK signature and packaged ks file/mapping verified. SHA256 3B3FE9D70E424286C425998C0F99DF387AB26D978D55F2103C9682E9128950B0. Installed successfully on [test-device]; versionName 1.11.6 and code 55 confirmed, app relaunched. Share copy Download/FamilyGames/Alphabert-1.11.6.apk has matching on-device SHA256.

# Y/yak audibility · v1.11.7 / code 56

Replaced the 110 ms consonant Y extraction with a complete independent Roger cue. Browser-measured active articulation 0.446 seconds, RMS .104 and peak .772; encoded duration 1.14 seconds including silence/padding. No slowing, stretching or repetition. Dedicated independent-source, active-articulation, RMS and yak/ivy mapping checks passed, along with phonics decoding/routing and npm checks. The consonant y cue remains separate from ee/ivy, yoo and alphabet-name Why. Parent listening remains the perceptual check.

APK signature and packaged Y file/mapping verified. SHA256 44C9C8F07305028AC76708B7098D5D4A18504115828548E21DA959E0702F649A. Installed successfully on [test-device]; versionName 1.11.7 and code 56 confirmed, app relaunched. Share copy Download/FamilyGames/Alphabert-1.11.7.apk has matching on-device SHA256.

# Gentler Q and W · v1.11.8 / code 57

Regenerated Q/kw and W with gentle delivery prompts after the parent reported aggressive/cough-like articulation. Reduced their publishing gain from 1.5 to .75 and peak limit from .85 to .6; full independent cues retain native timing without slowing, stretching or repetition. Browser measurements: kw active .568 s, RMS .026, peak .146; w active .328 s, RMS .041, peak .210. Loudness, active-duration, independent-source and routing guards passed alongside all phonics decode checks and npm checks. These do not certify the perceived coughing quality; parent listening remains required to assess it.

APK signature and packaged gentle file mappings verified. SHA256 ACE10A4BB098BC8E2766FB712CBDAA10F32D828D5F68E36E10C8F266A357922F. Installed successfully on [test-device]; versionName 1.11.8 and code 57 confirmed, app relaunched. Share copy Download/FamilyGames/Alphabert-1.11.8.apk has matching on-device SHA256.

# Restore previous Q and W · v1.11.9 / code 58

Parent preferred the pre-whisper Q and W. Restored exact Ogg bytes from v1.11.7 and original source MP3s, clear delivery and prior gain 1.5 / limiter .85. No new generation or credits. kw/qu/q routing remains consistent, and the review page uses restored files. Source and Ogg hashes are recorded in audio/restored-qw.json; publisher preserves those pinned bytes when source hashes match. Exact-file regression, phonics decoding/routing and npm checks passed. APK verification compared both packaged Ogg hashes against the original files.

APK signature passed. SHA256 E8F92C996B4D6B7611607B3BE92A294462E16F0FA262CA9DF9CC2718B4D8C752. Installed successfully on [test-device]; versionName 1.11.9 and code 58 confirmed, app relaunched. Share copy Download/FamilyGames/Alphabert-1.11.9.apk has matching on-device SHA256.

# ng in king · v1.11.10 / code 59

The ng path was routed correctly but used a faint 185 ms tail from ring (peak .088 / RMS .020). Replaced it with the whole isolated ng cue at 82.95–83.54 s of the previously parent-approved extended Roger review, with native timing and gain/limiting. Browser-measured active sound .533 s, RMS .123 and peak .438; encoded duration .679 s. No stretching or looping. An initial independently generated candidate was not selected after a local transcription check flagged an ambiguous grunt; it was never installed.

Final source/provenance, active-duration, RMS/peak, contextual king/ng routing and phonics decoding checks passed; npm checks passed. A targeted real UI check verified automatic selection during king and replay when its ng tile is tapped. Exact restored Q/W hashes still pass. Source approval applies to the original review; isolated pronunciation still benefits from parent listening review.

Final APK signature and approved-source ng mapping/file verified. SHA256 94170C41FEBB87FE95BBE0994D7CDCA2F2CFBBD6B1C82563490CD383605E3DB0. Installed successfully on [test-device]; versionName 1.11.10 and code 59 confirmed, app relaunched. Share copy Download/FamilyGames/Alphabert-1.11.10.apk has matching on-device SHA256.

# Schwa/uh audibility · v1.11.11 / code 60

Xylophone and zebra already place schwa in their middle/final syllables respectively. Replaced the faint 170 ms source tail with a complete independent Roger uh cue; active articulation .308 s, RMS .056, peak .512, encoded duration 1.06 s including silence/padding. Native timing retained without stretching or looping. Child-facing sound tiles and accessible labels show uh instead of IPA ə; internal token remains schwa. Dedicated provenance, audibility and contextual routing checks cover both words. Real UI tests confirm label/replay and no scrolling at 390x844 and 740x360. Phonics decoding/routing and npm checks passed; restored Q/W hashes remain exact. Automated checks do not certify perceptual phonetic accuracy.

APK signature, packaged schwa file/mapping and uh UI labels verified. SHA256 1B33302EB4006DE3FD5B99DD55671F3859F7B5D61D68A141B6FE1348F9AC2DCF. Installed successfully on [test-device]; versionName 1.11.11 and code 60 confirmed, app relaunched. Share copy Download/FamilyGames/Alphabert-1.11.11.apk has matching on-device SHA256.

# Missing Vowels complete prompts · v1.11.12 / code 61

The runtime had spoken `Find the missing vowel.` followed by the word separately, omitting in. Initial narration and question replay/wrong-answer repeats now use one complete `Find the missing vowel in WORD.` recording. The generic visible prompt remains unchanged to avoid revealing the completed spelling. Added 104 independent complete prompt recordings for every eligible built-in word (at most seven letters and containing a/e/i/o/u). The repair generator reused prior recordings and generated only the new prompts; no subscription/key changes.

Local transcription samples for ant, egg and queen matched the target sentence including missing vowel in. Full activity regression passed with new assertions for initial complete wording, single-sentence replay and generic visible prompt. All 1,834 narration files and 101 phonics/name/blend files decoded in Chrome; complete-prompt coverage, exact restored Q/W hashes and npm checks passed. These tests do not certify naturalness for every sentence.

APK signature, all 104 complete prompt assets and corrected runtime helper verified. SHA256 88E4A3951485B72FEFD55184777518234C3EEE16D5F31EA91CEDC8C774C55D93. Installed successfully on [test-device]; versionName 1.11.12 and code 61 confirmed, app relaunched. Share copy Download/FamilyGames/Alphabert-1.11.12.apk has matching on-device SHA256.


# Three-choice Blend Detectives and approved uh · v1.12.0 / code 63

Removed the word picker. Each round has three distinct choices based on adjacent pairs in its target word (frog: fr / ro / og). Short words lacking three unique pairs receive a similar blend distractor. Imported eligible words remain in the round pool. Pointer or keyboard holds preview contextual phonemes without submitting an answer; short taps choose. Sound alignment preserves vowel digraphs (blue: lu includes l + oo). Added scoped large landscape buttons and an ear cue.

The parent selected fresh ElevenLabs plain-spoken uh Take A. Published as eleven-phoneme-schwa-v7.ogg at approved original gain 1.0, native timing, with no stretching or looping. Source SHA256 05d63b72ffbd78d4dcbf371eebeb1c16427a6a9a8a59b1159c187f0289474490. Zebra/xylophone route to this recording. Short i remains unchanged; restored Q/W exact-hash checks pass.

Validation: npm checks, all-16-activity browser regression (including pointer/keyboard hold preview without guessing), all 1834 narration clips and 101 phonics/name/blend clips decode and routing checks passed. Layout audit passed 696 states across ten viewports/all built-in blend words, with no activity scrolling or overlaps and landscape targets at least 48px. Portrait/landscape screenshots visually reviewed under test-results/blend-three-choices. Signal and routing checks do not certify every pronunciation; Take A was explicitly selected by the parent.

APK signature passed; packaged blend module and approved schwa asset confirmed. APK SHA256 9B5D4ACB47B175B939CC4160D12C753FD11B6773A626D2E136480781079F7D41. Installed successfully on [test-device], versionName 1.12.0/code63 confirmed, app relaunched. Share copy Download/FamilyGames/Alphabert-1.12.0.apk has matching device SHA256.

# Odd One Out hold-to-hear and isolated question · v1.12.1 / code 64

Holding any picture in Odd One Out now speaks its whole word without choosing it. Short taps continue to answer. Reuses the pointer/keyboard hold controller with a scoped selector, cancellation, context-menu suppression and a visible hold cue. All three answer pictures have accessible hold/tap descriptions. No layout sizing changed.

Regenerated Which picture does not belong? as a complete independent Roger utterance instead of using the earlier batch-cut sentence. Local transcription returned exactly the intended question with no additional words; this checks wording rather than certifying all auditory qualities. The repair plan and narration regression require the independent sentence so future republishing retains the fix. Unselected R audition recordings have not been installed.

Validation: npm checks and full all-16-activity browser regression passed, including holds on all three Odd One Out pictures leaving the round unsolved and stars unchanged, followed by normal-tap completion. All 1834 Roger narration files and 101 phonics/name/blend clips decoded successfully; isolated-question provenance and unchanged approved phonics routing passed. Packaged handlers/question bytes match final sources. Signature verified. APK SHA256 989372AA2A34CB92FDBE5583F2A328B0AADC5BD28D95DBD333918043F23EA5C6. Installed on [test-device], versionName1.12.1/code64 confirmed and relaunched. Share copy Download/FamilyGames/Alphabert-1.12.1.apk has matching device checksum.

# Word Scramble hint boundary repair · v1.12.2 / code 65

Re-recorded all three contextual first-Help variants in Word Scramble (start, middle, last) as complete independent Roger utterances. Each response contains only its intended hint, avoiding neighboring speech from the former batch-cut source. Local transcription matched each intended sentence exactly with no extra prefix. Source regeneration and narration regressions now retain and require the three independent hints. Gameplay wording, hint progression and the following spoken target word are unchanged. Unselected R auditions remain uninstalled.

Final npm/content/speech/hint checks passed after publishing (an earlier concurrent check encountered a file while it was being rewritten; the completed library passes). All 1834 narration clips and 101 phonics/name/blend clips decoded successfully. New regression requires isolated provenance and exact wording for all three hints. All three packaged audio files match final sources; APK signature passed. SHA256 EFE39A20A3F3509FF1C004309C2E6AD0CFC3EE93C07DB5A26CB4C2D774A8D979. Installed successfully on [test-device], versionName1.12.2/code65 confirmed and relaunched. Share copy Download/FamilyGames/Alphabert-1.12.2.apk has matching device SHA256.

# Complete Odd One Out hints and explanations · v1.12.3 / code 66

Generated all four category hints and eight category explanations as complete independent Roger responses. Includes the animal hint Two pictures show animals. Which picture is not an animal? No source timestamp cuts or sentence assembly. Local transcripts match all 12 target utterances in full (two/too homophone treated equivalently), with no extra prefix or missing ending detected. Transcript matching does not certify every vocal quality. Also adopts the fresh independently generated question take from odd-question-clean-ending.mp3, replacing the prior question with the reported l-like ending. Hold-to-hear and gameplay unchanged. Unselected R auditions remain uninstalled.

The repair plan and narration regressions now require independent whole recordings for all category hints/explanations. README records the user's direction to generate new/replacement narration in complete responses rather than cutting batch sentences.

Expanded per the user's follow-up to audit every standard Odd One Out speech path: four first hints, four second-Help/correct category explanations, four odd explanations, opening/repeat question, menu-hold introduction, shared Great job / Let's try again feedback, and all 24 picture-name recordings (including hold-to-hear and later Help). Regenerated the menu introduction and feedback as additional whole responses. Picture words already have separate independent sources. Local transcription found intended wording throughout (plum/plumb and two/too homophones accepted); no added or missing words detected. Reusable Bertie jokes are separate from activity instruction speech and were not regenerated. Transcript/signal checks cannot guarantee every subtle vocal artifact is absent.

Added exact-key publishing support so targeted speech repairs retain unrelated files instead of rewriting the whole library. Regression requires all Odd One Out sentences and picture names to have independent sources. npm, full narration decode (1834), and phonics routing/decode (101) checks passed.

Final APK signature and all 16 independent Odd One Out instruction/feedback files verified against final sources. SHA256 0F7C73FCA74BC8B11612B21405913BEE52F66F10D148ED64E051CB1F8E261F47. Installed successfully on [test-device], versionName1.12.3/code66 confirmed, app relaunched. Share copy Download/FamilyGames/Alphabert-1.12.3.apk has matching on-device SHA256.

# Fresh Word Scramble Help takes · v1.12.4 / code 67

Parent reported a similar artifact after the previous independent-hint update. Regenerated all three first-Help variants again using fresh seeds 4292–4294, keeping whole responses without source cuts, looping or stretching. Kept previous sources as spellStart/Middle/Last-previous.mp3 for comparison. Local transcripts match intended complete wording, with no stray prefix or omitted ending detected. Targeted publishing replaces only these three audio files; unrelated Odd One Out and phonics assets retained. All eligible picture-name outputs following the hint retain independent complete source recordings. No gameplay/timing changes.

npm checks, full narration decode/provenance (1834 clips), and phonics routing/decode (101 clips) pass. Automated wording/signal checks do not certify every subtle vocal quality.

Final signature and all three packaged fresh hint files verified. APK SHA256 5C26FF2EF7B22B02830D768FA13F52DCD50D378F568704A64222006AEC5711AD. Installed successfully on [test-device], versionName1.12.4/code67 confirmed and relaunched. Share copy Download/FamilyGames/Alphabert-1.12.4.apk has matching on-device SHA256.

# App-wide complete narration migration · v1.13.0 / code 68

The parent reported a stray alpha-like sound after the Letter Catch introduction and requested an app-wide review. Audit found 1452 remaining output lines with batch-cut or assembled source history (1171 assembled outputs and 281 other lines), requiring 47220 newly spoken characters after phonetic letter-name substitutions. The new plan covers every output with an independent complete response, retaining previously generated/selected independent sources. Whole picture names already have independent sources. No new narration is cut from a batch. Phonics/name/blend banks remain separate and unchanged.

Publishing now rejects any sentence without a complete independent source, removes legacy timestamp-cut and fragment-joining fallback, records source SHA256/duration, and preserves every decoded source sample plus 100 ms trailing silence. Narration regression requires one independent source per output, verifies receipt/file hashes, and verifies complete source duration. Generation can resume from saved independent receipts without duplicating successful requests.

Local transcription audit covered 67 primary activity/menu introductions and contextual hints. Fresh Letter Catch prompt/intro contain intended wording without the reported alpha prefix/tail. Rhyme Time's new intro was flagged as Run Time and regenerated with seed4298; refreshed transcripts match all 67 expected lines with Eye/I and two/too homophones normalized. This is a wording check, not certification of every subtle vocal quality. Source hashes invalidate stale transcript caches. Real UI/speech routing test passed for Letter Catch across 12 rounds and all three Word Scramble hint variants: only intended whole prompt/hint plus target word is selected.

Generation initially stopped at the restricted key's 20000-credit cap after 874 of 1452 new lines. At that checkpoint 578 responses / 18373 characters remained (roughly 9187 credits at the observed half-character rate). The user explicitly approved raising the existing key cap to 35000. Saved and re-opened the ElevenLabs UI to verify 35000; Text to Speech remains the only enabled endpoint, expiry stays unchanged, and no purchase/subscription change was made. Screenshot evidence: test-results/elevenlabs-quota-35000.png. Resumed from cached receipts without regenerating completed outputs.

All 1452 remaining narration outputs now have independent complete sources. All 1834 published narration/word clips have exactly one full source, source SHA256 and source duration. No narration timestamp cuts or fragment assembly remain in the publisher. Previously independent sources were reused, with fresh retries for the flagged Rhyme Time intro, Polly Wolly Doodle title, and one strawberry joke. Rhyme Time's refreshed transcript matches; Polly's US recognizer spelling remains Pollywallydoodle on both takes, accepted as a proper-name transcription variant. The strawberry joke still receives a possessive apostrophe in ASR after retry; this is retained as a recognition/word-boundary ambiguity rather than asserted to be a certified literal pronunciation.

Expanded local ASR audit covers 190 fixed narration lines across activities, hints, feedback and song titles, with source-hash checks and explicit numeric/homophone/proper-name spelling normalization. Another 28 contextual samples cover rhyme pairs, missing letters/vowels, before/after letters, blend feedback and Bertie reactions. These checks catch missing/extra words but do not certify every vocal artifact or pronunciation in all 1834 recordings. Sources and raw transcript evidence remain under audio-trials/elevenlabs.

Validation: npm checks passed. Strict source identity/integrity, single-source provenance, full native source duration plus only 100ms padding, and real Chrome decode/signal checks passed for all 1834 narration/word files. Two metadata counters initially included extra legacy combined Learn Letters lines and long-word vowel prompts newly migrated by the full plan; counters now describe the actual 132 Learn Letters sentences and 104 eligible Missing Vowels prompts, while those extra outputs also remain complete recordings. All 101 phonics/name/blend clips decode and all 106 word sequences route correctly. A baseline hash comparison confirms every colon-key phonics/name/blend asset and mapping unchanged, including the selected uh, restored Q/W and short i. Real UI/speech routing verifies Letter Catch prompt plus target word only across 12 rounds and the three Word Scramble first-Help variants selecting only the whole hint plus target word. No gameplay/layout code changed.

Final generation plan reports zero pending responses. APK signature passed. Every one of the 1834 narration/word files and the provenance report matches the final packaged asset; generation caches, trial files and credentials are excluded. APK SHA256 248DC88CD8C364848ABA849BCBEDD812B8CB8040B8B334F4ABB4F465BF560BB4. Installed successfully on [test-device]; versionName1.13.0/code68 confirmed and app relaunched. Share copy Download/FamilyGames/Alphabert-1.13.0.apk has matching on-device SHA256.

# Build a Robot secret picture clue · v1.13.1 / code 69

The animated mystery picture now says Watch the picture closely. It's your clue! instead of speaking the answer word. The reminder is a new complete independent Roger recording, registered in the narration plans and published without cuts. Local transcription matches the intended wording. Picture taps and Hear Again replay the generic reminder/animation, preserving guesses/chances; accessible button text also avoids naming the answer. The animation loops during the preview and lasts at least 2.3s, waiting for full narration completion before enabling the keyboard and saying the guessing instruction. Cancellation/navigation guards prevent an older preview finishing a newer round. Reduced-motion behavior remains.

Generic question narration has an explicit hangman branch that only reads the guessing instruction. Wrong guesses already excluded generic question/word playback and continue to say Let's try again without revealing the answer. Correct/lost round word reveals, spelling and missing-letter explanations remain. Updated manual adaptation notes. No other activity behavior changed.

Validation: npm checks passed; all1835 narration/word files pass full-source integrity/duration and real Chrome decode tests; unchanged phonics/name/blend routing/decode checks pass. Full all-16-activity gameplay regression passed. Focused real-SpeechService UI test holds narration beyond the old timer and verifies the clue/animation remain, keys are disabled, picture/replay never select the whole-word recording, ordinary wrong guesses only retry, and a lost round still reveals the word. Portrait/landscape preview screenshots under test-results/robot-clue; landscape visually inspected. Initial focused-test expectations incorrectly looked for a repeated question after a wrong guess, corrected to the pre-existing retry-only behavior. No production wrong-guess bug was found.

Final signature and packaged preview code/styles/new whole reminder asset verified. APK SHA256 97261EC8EF484F02E718EA3F74C624495BA0061E3F99029F9F09B47D25011C54. Installed successfully on [test-device]; versionName1.13.1/code69 confirmed and app relaunched. Share copy Download/FamilyGames/Alphabert-1.13.1.apk has matching on-device SHA256.

# Silent counting pictures · v1.13.2 / code 70

Count with Me's picture collection is now a non-speaking group rather than a whole-word playback button. Individual picture taps have no speech/answer action, allowing manual touch-counting without interruptions. Removed count from generic picture-word playback routing. Kept existing artwork sizing and count/answer state. Other activities retain their contextual picture playback. Updated existing gameplay regression to assert repeated picture taps produce no speech and do not solve/change the counting round. npm checks passed.

Full all-16-activity browser regression passed, including repeated silent counting-picture taps and unchanged round state. Final signature and packaged count markup/styles verified. APK SHA256 7E5E182A656A7093F6604A139E06C590591A0A6316867E4D8293F345ACEB6C02. Installed successfully on [test-device]; versionName1.13.2/code70 confirmed and app relaunched. Share copy Download/FamilyGames/Alphabert-1.13.2.apk has matching on-device SHA256.

# Repository publication privacy audit

Reviewed Git-tracked and nonignored untracked files. Replaced personal checkout paths in documentation with a generic example and removed the test phone's unique identifier from historical validation notes. Downloaded songbook source containing an unrelated historical author's matching name was moved to ignored local research storage, preserving attribution. Public third-party license contact notices remain intact. Expanded ignores for credentials/signing formats, caches, tools, generated packages and local artifacts.

Added scripts/audit-repo-privacy.mjs and npm run audit:privacy. The final audit scanned 7337 Git-publication files with no findings for the supplied personal-name term, home-directory paths, device identifiers, common credential patterns or unreviewed email patterns. The email-like binary match was inspected: the Ogg file has only encoder metadata and no email metadata. Public license notices are explicitly reported separately. This is a pattern-based publication audit, not a blanket certification of arbitrary encoded data or ignored local files. Per explicit user preference, existing Git author name/email metadata was not changed. No application behavior or audio changed; no APK rebuild was required.

# Portable development tooling and reader-friendly project page

Removed fixed browser, Unity installation/version and external speech checkout paths from Alphabert scripts. Browser helpers now use Playwright's installed-browser channel, CHROME_PATH or BROWSER_CHANNEL. Android build tools use SDK/JDK parameters or environment settings (ANDROID_HOME/ANDROID_SDK_ROOT, JAVA_HOME, optional ANDROID_PLAYER_HOME), PATH-based JDK discovery and host-specific executable suffixes. Legacy speech tools require explicit MONSTER_RESCUE_PATH and configurable/PATH .NET; no external project was modified. Python audio audits select host ffmpeg names or FFMPEG_PATH. All runtime content and recordings remain unchanged.

Updated developer/Android setup documentation. Rewrote the main README for parents and players, with game features, simple installation, word additions and four committed screenshot images under docs/images. These are documentation assets, not additional Android runtime assets. Technical details live in linked guides.

Checks passed: JavaScript syntax across scripts, PowerShell parser checks, Python syntax, browser-configuration option checks, actual Chrome discovery and narration UI test, README relative links and PNG integrity, and Git publication privacy audit (7343 files, no findings). Built and signature-verified Android APK using explicitly supplied SDK/JDK locations; test-build SHA256 782219CD4EFFEAAB875ADFE63921BBFA72DB278D051DEA406FC5268853DE0CD4. No phone installation was needed for these tooling/documentation changes. macOS/Linux execution has not been tested; host tools and dependencies must be installed/configured there.

# Animated README media

Added a custom animated banner and two looping previews using the existing game robot, CSS animations and actual Build a Robot clue layout. Media is stored under docs/images for GitHub rendering; the game and Android runtime assets were not changed. Static PNG alternatives remain linked. Added scripts/create-readme-media.mjs to reproduce the assets using the local preview, portable browser configuration and ffmpeg-static.

Verified GIF headers and decoding, 40 frames each, with 38/35/30 distinct frames respectively. Banner is 632113 bytes, Bertie preview 245028 bytes and clue preview 111440 bytes. Visually inspected all three posters and verified all README media links. Publication privacy audit passes for 7348 candidate files. No APK rebuild or installation needed.
