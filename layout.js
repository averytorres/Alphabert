import { select } from './ui.js';

// Layout observes the current screen; it never changes the activity's answers.
// Reparent the same controls on rotation so their listeners and values survive.
export function createActivityLayout(getState) {
  let layoutFitQueued = false;
  function fitActivity() {
    if (layoutFitQueued) return;
    layoutFitQueued = true;
    requestAnimationFrame(() => {
      layoutFitQueued = false;
      const area = select('#play');
      if (!area) return;
      let stage = area.querySelector(':scope > .play-content');
      if (!stage) {
        stage = document.createElement('div');
        stage.className = 'play-content';
        while (area.firstChild) stage.appendChild(area.firstChild);
        area.appendChild(stage);
      }
      const landscape = innerWidth > innerHeight && innerHeight <= 600;
      let cue = stage.querySelector(':scope > .keyboard-cue');
      if (landscape && stage.querySelector('.keyboard')) {
        if (!cue) {
          cue = document.createElement('div');
          cue.className = 'keyboard-cue';
          stage.prepend(cue);
        }
        if (getState().mode === 'words') {
          const parts =
            cue.querySelector('.sound-parts') || stage.querySelector('#explore .sound-parts');
          if (parts) stage.appendChild(parts);
        }
        if (getState().mode === 'blends') {
          const choices =
            cue.querySelector(':scope > .choices') || stage.querySelector(':scope > .choices');
          if (choices) {
            choices.classList.add('blend-choices');
            if (choices.parentElement === cue) stage.appendChild(choices);
          }
        }
        for (const child of [...stage.children])
          if (
            child !== cue &&
            !child.matches('.keyboard,#guess-keys,.toolbar,.feedback,.blend-choices,.sound-parts')
          )
            cue.appendChild(child);
      } else if (cue) {
        for (const child of [...cue.children]) stage.insertBefore(child, cue);
        cue.remove();
        const choices = stage.querySelector('.blend-choices');
        if (choices) {
          stage.insertBefore(choices, stage.querySelector(':scope > .keyboard'));
          choices.classList.remove('blend-choices');
        }
      }
      if (!landscape) {
        const parts = stage.querySelector(':scope > .sound-parts'),
          explore = stage.querySelector('#explore');
        if (parts && explore) explore.insertBefore(parts, explore.querySelector('.prompt-small'));
      }
      let songCue = stage.querySelector(':scope > .song-cue');
      if (landscape && getState().mode === 'songs' && stage.querySelector('.song-grid')) {
        if (!songCue) {
          [...stage.children].forEach((child, i) => (child.dataset.songOrder = i));
          songCue = document.createElement('div');
          songCue.className = 'song-cue';
          stage.prepend(songCue);
        }
        for (const child of [...stage.children])
          if (child !== songCue && !child.matches('.song-grid,.song-pages'))
            songCue.appendChild(child);
      } else if (songCue) {
        for (const child of [...songCue.children]) stage.insertBefore(child, songCue);
        songCue.remove();
        for (const child of [...stage.children].sort(
          (a, b) => Number(a.dataset.songOrder) - Number(b.dataset.songOrder),
        ))
          stage.appendChild(child);
      }
      if (landscape) {
        stage.style.transform = 'none';
        return;
      }
      stage.style.transform = 'none';
      const style = getComputedStyle(area),
        available =
          area.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
      const scale = Math.min(1, available / Math.max(1, stage.scrollHeight));
      stage.style.transform = `scale(${scale})`;
    });
  }
  return fitActivity;
}
