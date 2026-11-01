/* Prepared offline voice first; native device voice handles newly added content. */
(() => {
  const normalize = (text) => String(text).replace(/\s+/g, ' ').trim().toLowerCase();
  class SpeechService {
    constructor() {
      this.enabled = true;
      this.rate = 0.85;
      this.index = {};
      this.serial = 0;
      this.pending = null;
      this.ready = fetch('audio/index.json')
        .then((r) => (r.ok ? r.json() : {}))
        .then((data) => {
          this.index = data.clips || data;
        })
        .catch(() => {});
    }
    stop() {
      this.serial++;
      if (this.audio) {
        this.audio.pause();
        this.audio.src = '';
        this.audio = null;
      }
      try {
        window.AndroidVoice?.stop();
      } catch (_) {}
      window.speechSynthesis?.cancel();
      this.pending?.();
      this.pending = null;
      window.dispatchEvent(new CustomEvent('speech-state', { detail: false }));
    }
    async say(text) {
      text = String(text).replace(
        /\b(10|[0-9])\b/g,
        (n) =>
          ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][
            Number(n)
          ],
      );
      if (/^[a-z]$/i.test(String(text).trim())) return this.letter(String(text).trim());
      this.stop();
      if (!this.enabled || !String(text).trim()) return;
      const serial = this.serial;
      await this.ready;
      if (serial !== this.serial) return;
      window.dispatchEvent(new CustomEvent('speech-state', { detail: true }));
      try {
        const clip = this.index[normalize(text)];
        if (clip) {
          const played = await this.play(typeof clip === 'string' ? clip : clip.file, serial);
          if (played || serial !== this.serial) return;
        }
        // New custom words may not have a full sentence recording yet. Keep the
        // explicit alphabet name instead of allowing TTS to read A as "uh".
        const letterPhrase = /^([A-Z]) (is .+)$/.exec(text);
        const nameFile =
          letterPhrase &&
          (this.index[`letter-eleven:${letterPhrase[1].toLowerCase()}`] ||
            this.index[`letter:${letterPhrase[1].toLowerCase()}`]);
        if (nameFile) {
          await this.play(nameFile, serial);
          if (serial === this.serial) await this.say(letterPhrase[2]);
          return;
        }
        await this.fallback(String(text), serial);
      } finally {
        if (serial === this.serial)
          window.dispatchEvent(new CustomEvent('speech-state', { detail: false }));
      }
    }
    async letter(letter) {
      const key = String(letter).toLowerCase();
      await this.ready;
      if (this.index[`letter-eleven:${key}`]) return this.say(`letter-eleven:${key}`);
      if (this.index[`letter-natural:${key}`]) return this.say(`letter-natural:${key}`);
      if (this.index[`letter:${key}`]) return this.say(`letter:${key}`);
      return this.say(`This is the letter ${key.toUpperCase()}.`);
    }
    async phoneme(token, options = {}) {
      this.stop();
      if (!this.enabled) return;
      const serial = this.serial;
      await this.ready;
      if (serial !== this.serial) return;
      const sound = { c: 'k', q: 'kw', x: 'ks' }[normalize(token)] || normalize(token);
      // Preserve the reviewed phonics bank before any older contextual/fallback source.
      const file =
        this.index[`phoneme-eleven:${sound}`] ||
        (options.wordId &&
          Number.isInteger(options.index) &&
          this.index[`word-phoneme:${options.wordId}:${options.index}`]) ||
        this.index[`phoneme-natural:${sound}`] ||
        (options.wordId && this.index[`phoneme-clear:${sound}`]) ||
        (options.held && this.index[`phoneme-held:${sound}`]) ||
        this.index[`phoneme:${sound}`];
      if (!file) {
        window.dispatchEvent(new CustomEvent('phoneme-unavailable', { detail: String(token) }));
        return;
      }
      window.dispatchEvent(new CustomEvent('speech-state', { detail: true }));
      try {
        // Phonemes play at native speed/pitch, independently of narration preferences.
        await this.play(file, serial, 1);
      } finally {
        if (serial === this.serial)
          window.dispatchEvent(new CustomEvent('speech-state', { detail: false }));
      }
    }
    async word(word) {
      if (!word.audio) return this.say(word.word);
      this.stop();
      if (!this.enabled) return;
      const serial = this.serial;
      window.dispatchEvent(new CustomEvent('speech-state', { detail: true }));
      try {
        const played = await this.play(word.audio, serial);
        if (!played && serial === this.serial) await this.say(word.word);
      } finally {
        if (serial === this.serial)
          window.dispatchEvent(new CustomEvent('speech-state', { detail: false }));
      }
    }
    async blend(word, blend) {
      this.stop();
      if (!this.enabled) return;
      const serial = this.serial;
      await this.ready;
      if (serial !== this.serial) return;
      const file =
        this.index[`blend-eleven:${word.id}:${blend.text}`] ||
        this.index[`blend:${word.id}:${blend.text}`];
      if (file) {
        window.dispatchEvent(new CustomEvent('speech-state', { detail: true }));
        try {
          await this.play(file, serial, 1);
        } finally {
          if (serial === this.serial)
            window.dispatchEvent(new CustomEvent('speech-state', { detail: false }));
        }
        return;
      }
      const sounds = Array.isArray(blend.sounds)
        ? blend.sounds
        : blend.start === 0
          ? word.phonemes.slice(0, blend.text.length)
          : word.phonemes.slice(-blend.text.length);
      let expected = serial;
      for (const sound of sounds) {
        if (this.serial !== expected) return;
        await this.phoneme(sound, { held: true });
        expected++;
        if (this.serial !== expected) return;
      }
    }
    play(file, serial, rate) {
      return new Promise((resolve) => {
        const audio = (this.audio = new Audio(file));
        audio.preservesPitch = true;
        audio.playbackRate = Math.max(0.65, Math.min(1.3, rate ?? this.rate / 0.85));
        let finished = false;
        const done = (value) => {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          this.pending = null;
          resolve(value);
        };
        const timer = setTimeout(() => done(false), 90000);
        this.pending = () => done(true);
        audio.onended = () => done(true);
        audio.onerror = () => done(false);
        audio.play().catch(() => done(false));
        if (serial !== this.serial) done(true);
      });
    }
    fallback(text, serial) {
      return new Promise((resolve) => {
        let timer,
          finished = false;
        const id = String(serial);
        const onEnd = (event) => {
          if (String(event.detail) === id) done();
        };
        const done = () => {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          window.removeEventListener('android-speech-end', onEnd);
          this.pending = null;
          resolve();
        };
        this.pending = done;
        timer = setTimeout(done, Math.max(4000, text.length * 180));
        if (window.AndroidVoice) {
          window.addEventListener('android-speech-end', onEnd);
          try {
            window.AndroidVoice.setRate?.(this.rate);
            if (window.AndroidVoice.speakWithId) window.AndroidVoice.speakWithId(text, id);
            else window.AndroidVoice.speak(text);
          } catch (_) {
            done();
          }
        } else if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'en-US';
          utterance.rate = this.rate;
          utterance.onend = done;
          utterance.onerror = done;
          window.speechSynthesis.speak(utterance);
        } else done();
        if (serial !== this.serial) done();
      });
    }
  }
  window.SpeechService = SpeechService;
})();
