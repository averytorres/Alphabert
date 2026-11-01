import { engine, SOUNDS, cleanIPA } from './phonics-reference.mjs';
const synth = await engine();
for (const [token, [word, target]] of Object.entries(SOUNDS)) {
  const r = synth(word);
  let match = null;
  for (let a = 0; a < r.phones.length && !match; a++)
    for (let b = a; b < r.phones.length; b++)
      if (
        cleanIPA(
          r.phones
            .slice(a, b + 1)
            .map((p) => p.id)
            .join(''),
        ) === target
      )
        match = { a, b };
  if (!match)
    console.log(
      'MISSING',
      token,
      target,
      word,
      r.phones.map((p) => p.id),
    );
}
