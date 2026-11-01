// Only replace the built-in picture; custom word-pack emoji stay editable.
const pictures = {
  acorn: '🌰',
  eel: '🐟',
  emu: '🐦',
  gate: '🚪',
  ink: '🖋️',
  jam: '🫙',
  jug: '🏺',
  lamp: '💡',
  mop: '🧹',
  net: '🥅',
  oak: '🌳',
  oat: '🌾',
  plum: '🟣',
  quilt: '🛌',
  top: '🌀',
  unit: '🧊',
  vet: '🧑‍⚕️',
  wig: '💇',
  xylophone: '🎼',
  yak: '🐃',
  zip: '🤐',
  zoo: '🦁',
  glue: '🧴',
  well: '🕳️',
};
export function wordPicturePath(word) {
  return word && pictures[word.id] === word.emoji
    ? 'assets/words/' + word.id + '.svg'
    : word?.id === 'sun' && word.emoji === '☀️'
      ? 'assets/sun.svg'
      : null;
}
