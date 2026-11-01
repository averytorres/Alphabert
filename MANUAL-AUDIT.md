# Manual alignment audit — October 31, 2026 — v1.3.7

Reference: [VTech AlphaBert parent guide](https://www.vtechkids.com/assets/data/products/%7B6650432F-6F91-487B-8BEA-D8837781BC63%7D/manuals/Alphabert.pdf). Page references are printed page numbers. Rechecked instructions against runtime code, content, speech routing, and browser interactions. This replaces an earlier audit that overstated alignment and contained outdated Help behavior.

**All 16 activity types are present. This is an adaptation, not a verified 1:1 recreation.**

| Activity | Manual pages; core check | Current implementation and qualification |
|---|---|---|
| Learn Letters | 4; names and examples | Upper/lowercase, picture keys, prepared name sentences, both vowel examples. Expanded vocabulary differs from toy. |
| Alphabet Order | 5–6; before/after | Random questions, correct relationship spoken, retry repeats question. Clue-first Help is requested. |
| Sounds of Letters | 6–7; alternative sounds | Eight multi-sound letters checked. Held clips and example dialogue are adaptations. |
| Sounds of Words | 7–8; sounds then word | Native phonemes, sequential visual cues, pauses, whole word. Vocabulary/segmentation differ from original recordings. |
| Missing Letters | 8–9; one gap | Random gap, picture, full answer explanation, retry. Help gives a clue first. |
| Missing Vowels | 9–11; vowel gap | Full keyboard, colored vowels, random vowel gap. Added missing spoken vowel-name introduction. |
| Matching Rhymes | 11–12; complete pair | Fixed first-letter-only gaps: any position may be blank. Added bundled pair narration. Removed log from dog/frog group because current reference vowels differ. |
| Beginning/Ending Blends | 13–14; select heard blend | Fixed missing audio cue with 28 contextual recordings in question/repeat and correct feedback. Excluded internal-only pairs; adjacent choices remain tappable. |
| Word Groups | 14–16; three pictures, one outlier | Reviewed pools, Odd one out title, added clues/explanations. Arbitrary nature/home classification removed. |
| Word Scramble | 16–17; rearrange letters | Letter multiset, final spelling/identification, retry. First Help gives a clue before placing a letter. |
| Word Search | 18–19; endpoints, fraction, review | Four listed targets in a 5×5 right/down grid, found count, final spoken review. User-requested v1.3.6 uses every letter tapped in order instead of endpoints. Target buttons speak words. Only placed targets count; original puzzle dictionary is not recreated. First Help marks a start cell before revealing a word. |
| Letter Catch | 19–21; ordered spelling | Moving choices, immediate retry, final spelling/word. Touch replaces arrows/Enter; clue-first Help precedes insertion. |
| Hangman / Build a Robot | 21–22; ten chances, progressive robot | Ten incorrect guesses, used-key protection, progressive art, answer reveal. Picture clues and penalty-free Help are deliberate changes. Old audit incorrectly claimed Help costs a chance. |
| Memory Challenge | 23–24; growing sequence | Adds one item per success; old sequence shown after error, then new trail. Replaced the six-choice simplification with a full 26-key letter/object keyboard in v1.3.7. Picture associations match the other keyboards; keys lock during narration. First Help retains first picture; second retains sequence. |
| Counting | 24–25; four choices | Objects, four answers, retry, progressive elimination. Range 1–10; complete toy range is unspecified. First Help adds a strategy before elimination. |
| Hear a Song | 26; 26 letter assignments | All A–Z title mappings verified; bonus Twinkle is additional. Newly synthesized arrangements/excerpts; note-for-note and timbre parity unverified. |

## Requested changes retained

Clue-first Help, longer held sounds at native playback speed, keyboard pictures, random Let's play, result-jingle variations, clear picture groups, screen fit, and automatic progression take priority over literal firmware behavior. Touch replaces physical controls. Voice, artwork, animation, rewards, word bank, and jingles are newly created. Startup/hardware auto-off are not emulated.

## Evidence and limits

Rechecked against the manual and current v1.3.6 code on October 31, then corrected the Memory keyboard for v1.3.7. The remaining deliberate differences are not all claims of exact manual behavior: Build a Robot supplies Help without a chance penalty, Counting currently covers 1–10, introductory wording differs, the word bank is expanded, and illustrations/animations/audio arrangements are newly created. The manual does not specify a complete word bank, melody transcription, precise audio timing, or counting range. User-requested clue-first Help and tap-every-letter Word Search are retained rather than reverted.

- `test-game.mjs`: all activities, correct/incorrect answers, progressive Help, cancellation/automatic next, non-first rhyme gaps, blend cue and edge eligibility, imports, mobile layouts.
- `test-manual-content.mjs`: multi-sound letters, rhyme-ending consistency/offline narration, contextual blend identity/mapping, vowel introduction.
- `test-song-catalog.mjs`: 26 letter/song mappings.
- `test-layout-audit.mjs`: ten sizes, landscape touch targets, rotation, picture/key/artwork containment. Follow-up v1.3.1 uses a 5×5 word search so its cells remain large in landscape.
- `test-speech.mjs` / `test-playback.mjs`: routing, cancellation, offline assets, native-rate playback, held duration, blend decoding.

These checks do not establish child-perceived speech clarity, exact recorded melodies, or identical private question banks. The user's reference videos remain useful for audiovisual comparison; captions alone cannot establish sound parity.

### User-requested Blend Detectives update (v1.6.0)

The activity intentionally replaces the full letter keyboard with answer buttons. In v1.12.0, the user's revised preference removes the word picker and uses exactly three choices, drawn from adjacent letter pairs in the target word (frog: fr / ro / og). Short words with insufficient unique pairs use a similar blend as the remaining distractor. Holding a choice previews its contextual sounds without guessing; tapping answers. Imported eligible words remain in the round pool. This is a user-requested interface difference from the toy, preserving beginning/ending blend identification and spoken blend cues.

### Build a Robot clue introduction (v1.6.2)

Manual activity 13 confirms Hangman with ten chances and construction on incorrect guesses. Its instructions do not explicitly specify an initial object animation. The user's reference/request adds an animated picture before guessing, replayable with Hear Again while preserving guesses/chances. In v1.13.1 the preview keeps the answer secret and says Watch the picture closely. It's your clue! It lasts at least 2.3 seconds and waits for the complete reminder; tapping the picture replays the clue rather than speaking the answer. The keyboard is inactive only during the preview; normal guessing resumes afterward. This is an observed/requested behavior addition, not a claim that the manual describes it.

### First-Help policy update (v1.9.0)

At the user's request, first Help now supplies non-revealing contextual strategies across all 16 activities. This intentionally replaces first-click question/sequence replay in exploration/Memory and answer-proximate cues in other games. Later stronger help remains. See HELP-AUDIT.md for the per-activity first/later matrix and validation.
