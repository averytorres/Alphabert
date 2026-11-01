export const MENU_HELP = {
  letters: 'Learn letters. Tap a letter and meet its pictures.',
  order: 'Alphabet order. Find the letter that comes before or after.',
  sounds: 'Letter sounds. Listen to the sounds each letter makes.',
  words: 'Sound it out. Hear the little sounds that make a word.',
  missing: 'Missing letters. Find the letter missing from the word.',
  vowels: 'Missing vowels. Find the missing vowel to finish the word.',
  rhymes: 'Rhyme time. Make two words that end with the same sound.',
  blends: 'Blend detectives. Find the letters that make the blend.',
  groups: 'Odd one out. Find the picture that belongs to a different group.',
  scramble: 'Word scramble. Put the letters in order to make a word.',
  search: 'Word search. Find a word and tap each of its letters.',
  catch: 'Letter catch. Catch the letters to spell the word.',
  hangman: 'Build a robot. Guess the letters to build your robot.',
  memory: 'Memory trail. Listen to the pictures, then tap them in the same order.',
  count: 'Count with me. Count the pictures and choose the number.',
  songs: 'Music corner. Pick a song and listen to the music.',
  random: "Let's play. I will pick a game for you.",
};
export function installMenuHold({ root = document, onDescribe, delay = 550 }) {
  let pending = null;
  const suppressed = new WeakSet();
  const clear = () => {
    if (pending) {
      clearTimeout(pending.timer);
      pending.button.classList.remove('hearing-help');
      pending = null;
    }
  };
  root.addEventListener('pointerdown', (event) => {
    clear();
    if (!event.isPrimary || event.button !== 0) return;
    const button = event.target.closest('.activity-card[data-mode],.hero button[data-mode]');
    if (!button) return;
    suppressed.delete(button);
    const help = MENU_HELP[button.dataset.mode];
    if (!help) return;
    const press = (pending = {
      button,
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      timer: null,
    });
    press.timer = setTimeout(() => {
      if (pending !== press || !button.isConnected) return;
      suppressed.add(button);
      button.classList.add('hearing-help');
      onDescribe(help);
    }, delay);
  });
  root.addEventListener('pointermove', (event) => {
    if (
      pending &&
      event.pointerId === pending.id &&
      Math.hypot(event.clientX - pending.x, event.clientY - pending.y) > 12
    )
      clear();
  });
  for (const type of ['pointerup', 'pointercancel'])
    root.addEventListener(type, (event) => {
      if (pending?.id === event.pointerId) clear();
    });
  root.addEventListener(
    'click',
    (event) => {
      const button = event.target.closest('button[data-mode]');
      if (button && event.detail !== 0 && suppressed.has(button)) {
        suppressed.delete(button);
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true,
  );
  root.addEventListener('contextmenu', (event) => {
    if (event.target.closest('.activity-card[data-mode],.hero button[data-mode]'))
      event.preventDefault();
  });
  root.addEventListener('visibilitychange', clear);
  window.addEventListener('blur', clear);
  window.addEventListener('scroll', clear, { passive: true });
}
