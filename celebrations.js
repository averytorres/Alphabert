export const CELEBRATIONS = ['confetti', 'fireworks', 'spiral', 'balloons', 'stars', 'ripples'];
const colors = ['#e8b52f', '#4a9c81', '#d76b45', '#438bb5', '#a075bc', '#e39aaf'];
export class CelebrationPicker {
  constructor() {
    this.bag = [];
    this.last = null;
  }
  next() {
    if (!this.bag.length) {
      this.bag = [...CELEBRATIONS];
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
      }
      if (this.bag[0] === this.last) [this.bag[0], this.bag[1]] = [this.bag[1], this.bag[0]];
    }
    return (this.last = this.bag.shift());
  }
}
const particle = (className, style) => `<i class="${className}" style="${style}"></i>`;
export function celebrationMarkup(kind) {
  if (kind === 'confetti')
    return Array.from({ length: 28 }, (_, i) =>
      particle(
        'confetti-bit',
        `left:${Math.random() * 100}%;background:${colors[i % 6]};animation-delay:${Math.random() * 0.35}s`,
      ),
    ).join('');
  if (kind === 'fireworks')
    return [18, 50, 82]
      .map(
        (x, j) =>
          `<div class="celebration-burst" style="left:${x}%;top:${22 + (j % 2) * 15}%;--delay:${j * 0.3}s">${Array.from(
            { length: 12 },
            (_, i) => {
              const angle = (i * Math.PI) / 6;
              return particle(
                'celebration-spark',
                `--dx:${Math.cos(angle) * 100}px;--dy:${Math.sin(angle) * 100}px;--spin:${i * 30 + 90}deg;--color:${colors[(i + j) % 6]}`,
              );
            },
          ).join('')}</div>`,
      )
      .join('');
  if (kind === 'spiral')
    return Array.from({ length: 28 }, (_, i) =>
      particle(
        'celebration-spiral',
        `--angle:${(i * 360) / 28}deg;--radius:${80 + (i % 5) * 18}px;--delay:${i * 0.012}s;--color:${colors[i % 6]}`,
      ),
    ).join('');
  if (kind === 'balloons')
    return Array.from({ length: 9 }, (_, i) =>
      particle(
        'celebration-balloon',
        `left:${5 + i * 10.5}%;--drift:${i % 2 ? 25 : -25}px;--delay:${(i % 3) * 0.12}s;--color:${colors[i % 6]}`,
      ),
    ).join('');
  if (kind === 'stars')
    return Array.from({ length: 24 }, (_, i) =>
      particle(
        'celebration-star',
        `--dx:${(i - 11.5) * 25}px;--height:${45 + (i % 4) * 8}vh;--delay:${(i % 4) * 0.06}s;--color:${colors[i % 6]}`,
      ),
    ).join('');
  if (kind === 'ripples')
    return colors
      .map((color, i) => particle('celebration-ring', `--delay:${i * 0.17}s;--color:${color}`))
      .join('');
  return '';
}
