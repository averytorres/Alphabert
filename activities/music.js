import { songPicture } from '../song-pictures.js';
import { icon } from '../icons.js';
import { scheduleMelody } from '../music.js';
import { select, renderPrompt, escapeHtml, renderRobot } from '../ui.js';

// The coordinator owns round state; read it when an interaction begins.
export function createMusicActivity(runtime) {
  let musicOutputGain = null;
  function musicVolume(value) {
    runtime.preferences.musicVolume = Math.max(0, Math.min(1, Number(value) || 0));
    if (musicOutputGain && runtime.music)
      musicOutputGain.gain.setTargetAtTime(
        runtime.preferences.musicVolume,
        runtime.music.currentTime,
        0.025,
      );
    runtime.save();
  }

  function renderSongMenu(page = 0) {
    runtime.state.songPage = Math.max(
      0,
      Math.min(Math.ceil(runtime.lessons.songs.length / 6) - 1, page),
    );
    const first = runtime.state.songPage * 6;
    select('#play').innerHTML =
      renderPrompt(
        'A pocketful of melodies',
        'Choose a song, or press its letter on your keyboard.',
      ) +
      [
        `<div class="song-grid">`,
        `${runtime.lessons.songs
          .slice(first, first + 6)
          .map((s, i) =>
            [
              `<button class="song-card" data-song="`,
              `${first + i}`,
              `">`,
              `<span class="song-label">`,
              `<span class="song-letter">`,
              `${escapeHtml(s.letter?.toUpperCase() || '♫')}`,
              `</span>`,
              `<span class="song-title">`,
              `${escapeHtml(s.title)}`,
              `</span>`,
              `</span>`,
              `${songPicture(s.id)}`,
              `</button>`,
            ].join(''),
          )
          .join('')}`,
        `</div>`,
        `<div class="song-pages">`,
        `<button class="secondary" id="song-prev" `,
        `${first === 0 ? 'disabled' : ''}`,
        `>`,
        `${icon('previous')}`,
        `<span>Previous</span>`,
        `</button>`,
        `<span>`,
        `${runtime.state.songPage + 1}`,
        ` / `,
        `${Math.ceil(runtime.lessons.songs.length / 6)}`,
        `</span>`,
        `<button class="secondary" id="song-next" `,
        `${first + 6 >= runtime.lessons.songs.length ? 'disabled' : ''}`,
        `>`,
        `${icon('next')}`,
        `<span>More songs</span>`,
        `</button>`,
        `</div>`,
        `<div class="song-now">`,
        `<div class="song-robot">`,
        `${renderRobot()}`,
        `</div>`,
        `<div id="song-lyrics" class="prompt-small">Bertie is ready to dance!</div>`,
        `</div>`,
        `<label class="music-volume" for="music-volume">Music volume <input id="music-volume" type="range" min="0" max="100" value="`,
        `${Math.round(runtime.preferences.musicVolume * 100)}`,
        `" aria-label="Music volume">`,
        `<output id="music-percent">`,
        `${Math.round(runtime.preferences.musicVolume * 100)}`,
        `%</output>`,
        `</label>`,
        `<div class="toolbar">`,
        `<button class="secondary" id="stop-song">`,
        `${icon('stop')}`,
        `<span>Stop music</span>`,
        `</button>`,
        `<button class="secondary" id="hint">`,
        `${icon('help')}`,
        `<span>Help me</span>`,
        `</button>`,
        `</div>`,
        `<div class="feedback" id="feedback" role="status">`,
        `</div>`,
      ].join('');
    select('#music-volume').oninput = (e) => {
      musicVolume(e.target.value / 100);
      select('#music-percent').textContent = e.target.value + '%';
    };
  }

  async function song(index) {
    runtime.cancelRoundWork();
    runtime.state.solved = false;
    const s = runtime.lessons.songs[index];
    const roundAtStart = runtime.roundGeneration;
    select('#song-lyrics').textContent = Array.isArray(s.lyrics)
      ? s.lyrics.join(' ')
      : s.lyrics || '';
    await runtime.say(s.title);
    if (roundAtStart !== runtime.roundGeneration) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      runtime.feedback('Music playback is unavailable on this device.', false);
      return;
    }
    runtime.music = new AudioContext();
    await runtime.music.resume();
    musicOutputGain = runtime.music.createGain();
    musicOutputGain.gain.value = runtime.preferences.musicVolume;
    const compressor = runtime.music.createDynamicsCompressor();
    musicOutputGain.connect(compressor);
    compressor.connect(runtime.music.destination);
    document.body.classList.add('music-playing');
    const offset = scheduleMelody(runtime.music, musicOutputGain, s);
    runtime.feedback('Hum, sing, and tap along!');
    runtime.scheduleRoundTask(() => {
      if (roundAtStart === runtime.roundGeneration) {
        document.body.classList.remove('music-playing');
        runtime.win('Great job!');
        if (runtime.music) {
          runtime.music.close();
          runtime.music = null;
        }
      }
    }, offset * 1000);
  }
  return { musicVolume, renderSongMenu, song };
}
