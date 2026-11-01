# Activity help

First Help now gives a strategy or relevant clue. It never fills a letter, solves a round, eliminates an answer, speaks the missing letter/phoneme, names the robot mystery word, reveals a memory trail, or marks a hidden word. Naming a visible picture in spelling activities repeats the question word, not its spelling answer. Later Help remains progressively stronger.

| Activity | First Help | Later Help |
|---|---|---|
| Learn Letters | Guidance changes before/after choosing a letter; picture-name exploration. | Replay selected letter examples. |
| Alphabet Order | Mark the reference letter, not the answer; before/after direction clue. | Say the answer as an explicit alphabet name. |
| Letter Sounds | Different guidance for vowels, multi-sound consonants, and single sounds. | Replay the selected letter's sounds. |
| Sound It Out | Explain tapping individual sounds and blending them into a word. | Replay the sound sequence. |
| Missing Letters | Beginning/middle/end gap cue; repeat picture name; mark only the gap. | Name the missing letter. |
| Missing Vowels | Identify vowel-gap position without speaking the answer vowel. | Name the missing vowel letter. |
| Rhyme Time | Match endings and distinguish a starting gap from another gap in the yellow target. | Name the missing letter. |
| Blend Detectives | Beginning/ending location and two-/three-consonant structure. | Spell the blend using alphabet names. |
| Odd One Out | Use the actual picture group's category clue. | Mark the matching pair, then identify the odd picture. |
| Word Scramble | Starting, next, or final-box strategy based on letters already placed. | Add the next letter. |
| Word Search | Actual across/down direction, or continue a valid partial path; no new highlighted cells. | Reveal a word path. |
| Letter Catch | First/next/final-letter strategy based on letters already caught. | Supply the next letter. |
| Build a Robot | Category cue or unused-vowel/consonant strategy based on prior guesses. No mystery-word reveal. | Supply one correct letter. |
| Memory Trail | Recall strategy based on progress; preserve input and do not replay/reveal the answer. While listening, let the presentation finish. | Replay and show the trail. |
| Count With Me | Count individually or in smaller groups, based on amount; do not name the total. | Eliminate wrong choices, then identify the total. |
| Music Corner | Add Help control; choosing/page guidance when idle, humming/clapping guidance while playing. | Repeat contextual guidance. |

## Implementation

`context-hints.js` selects the first clue without changing game state. The coordinator handles cancellation and narration; activity modules supply the current state. First Help offers a strategy, while later Help can reveal more. Memory playback stays locked until narration finishes.

Run `npm test` and `node scripts/test-game.mjs` to check clue selection, state preservation and stronger-help behavior.
