import { wordPicturePath } from './word-pictures.js';
import { icon } from './icons.js';
export function select(selector) {
  return document.querySelector(selector);
}
const HTML_ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
// Imported word packs provide text, not markup; escape their labels before rendering.
export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => HTML_ENTITIES[character]);
}
export const renderRobot = () =>
  [
    `<div class="robot" role="button" tabindex="0" data-bertie aria-label="Play with Bertie">`,
    `<div class="robot-performer">`,
    `<i class="antenna">`,
    `</i>`,
    `<div class="robot-head">`,
    `<div class="face">`,
    `<i class="eye">`,
    `</i>`,
    `<i class="eye">`,
    `</i>`,
    `<i class="mouth">`,
    `</i>`,
    `</div>`,
    `</div>`,
    `<i class="arm">`,
    `</i>`,
    `<i class="arm right">`,
    `</i>`,
    `<div class="robot-body">`,
    `<span>a</span>`,
    `</div>`,
    `<i class="leg">`,
    `</i>`,
    `<i class="leg right">`,
    `</i>`,
    `</div>`,
    `<i class="robot-shadow">`,
    `</i>`,
    `</div>`,
  ].join('');
export function renderPicture(word) {
  const path = wordPicturePath(word);
  return path
    ? '<img class="word-picture" src="' + path + '" alt="">'
    : escapeHtml(word?.emoji || '✦');
}
export function renderLetterTiles(text, hidden = []) {
  return `<div class="tiles">${[...text].map((c, i) => `<span class="tile ${hidden.includes(i) ? 'blank' : ''}">${hidden.includes(i) ? '·' : escapeHtml(c)}</span>`).join('')}</div>`;
}
export function renderActivityTools(next = true) {
  return [
    `<div class="toolbar">`,
    `<button class="secondary" id="repeat">`,
    `${icon('hear')}`,
    `<span>Hear again</span>`,
    `</button>`,
    `<button class="secondary" id="hint">`,
    `${icon('help')}`,
    `<span>Help me</span>`,
    `</button>`,
    `${next ? `<button class="primary" id="next">${icon('next')}<span>Next</span></button>` : ''}`,
    `</div>`,
    `<div class="feedback" id="feedback" role="status" aria-live="polite">`,
    `</div>`,
  ].join('');
}
export function renderWordPicture(word) {
  return `<button type="button" class="word-art hear-word" data-word-say="${escapeHtml(word.id)}" aria-label="Hear ${escapeHtml(word.word)}">${renderPicture(word)}</button>`;
}
export function renderPrompt(text, sub = '') {
  return `<h2 class="prompt">${escapeHtml(text)}</h2>${sub ? `<div class="prompt-small">${escapeHtml(sub)}</div>` : ''}`;
}
export function renderKeyboard(handler, used = [], wordForDisplay) {
  return `<div class="keyboard" aria-label="Letter keyboard">${[...'abcdefghijklmnopqrstuvwxyz']
    .map((c) =>
      [
        `<button class="key `,
        `${'aeiou'.includes(c) ? 'vowel' : ''}`,
        ` `,
        `${used.includes(c) ? 'used' : ''}`,
        `" data-`,
        `${handler}`,
        `="`,
        `${handler === 'memory' ? escapeHtml(wordForDisplay(c)?.id || c) : c}`,
        `" aria-label="Uppercase `,
        `${c.toUpperCase()}`,
        `, lowercase `,
        `${c}`,
        `, for `,
        `${escapeHtml(wordForDisplay(c)?.word || c)}`,
        `" `,
        `${used.includes(c) ? 'disabled' : ''}`,
        `>`,
        `<span class="key-letters" aria-hidden="true">`,
        `<span class="key-upper">`,
        `${c.toUpperCase()}`,
        `</span>`,
        `<span class="key-lower">`,
        `${c}`,
        `</span>`,
        `</span>`,
        `<small aria-hidden="true">`,
        `${renderPicture(wordForDisplay(c))}`,
        `</small>`,
        `</button>`,
      ].join(''),
    )
    .join('')}</div>`;
}
