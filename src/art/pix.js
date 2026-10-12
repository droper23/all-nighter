// Small pixel-drawing toolkit over a 2D canvas. All coords are integers.
import { PAL } from './palette.js';

const col = (c) => (c && c[0] === '#') ? c : PAL[c] || c;

export class Pix {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.canvas = document.createElement('canvas');
    this.canvas.width = w; this.canvas.height = h;
    this.ctx = this.canvas.getContext('2d');
  }
  px(x, y, c) { this.ctx.fillStyle = col(c); this.ctx.fillRect(x | 0, y | 0, 1, 1); return this; }
  rect(x, y, w, h, c) { this.ctx.fillStyle = col(c); this.ctx.fillRect(x | 0, y | 0, w | 0, h | 0); return this; }
  frame(x, y, w, h, c) { this.rect(x, y, w, 1, c).rect(x, y + h - 1, w, 1, c).rect(x, y, 1, h, c).rect(x + w - 1, y, 1, h, c); return this; }
  hline(x, y, w, c) { return this.rect(x, y, w, 1, c); }
  vline(x, y, h, c) { return this.rect(x, y, 1, h, c); }
  line(x0, y0, x1, y1, c) {
    let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy;
    for (;;) {
      this.px(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return this;
  }
  disc(cx, cy, r, c) {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) this.px(cx + x, cy + y, c);
    return this;
  }
  ellipse(cx, cy, rx, ry, c) {
    for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if ((x * x) / (rx * rx + 0.01) + (y * y) / (ry * ry + 0.01) <= 1.05) this.px(cx + x, cy + y, c);
    return this;
  }
  // Draw a char-grid sprite. rows: array of strings; map overrides palette keys.
  grid(x, y, rows, map = {}, flip = false) {
    rows.forEach((row, j) => {
      const r = flip ? [...row].reverse().join('') : row;
      [...r].forEach((ch, i) => {
        if (ch === '.' || ch === ' ') return;
        this.px(x + i, y + j, map[ch] || ch);
      });
    });
    return this;
  }
  noise(x, y, w, h, colors, density, seed = 1) {
    let s = seed;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (rnd() < density) this.px(x + i, y + j, colors[Math.floor(rnd() * colors.length)]);
    return this;
  }
  // Adds a 1px outline around opaque pixels within region.
  outline(c = 'k', x0 = 0, y0 = 0, w = this.w, h = this.h) {
    const img = this.ctx.getImageData(x0, y0, w, h), d = img.data;
    const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0;
    const pts = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (solid(x, y)) continue;
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) pts.push([x, y]);
    }
    pts.forEach(([x, y]) => this.px(x0 + x, y0 + y, c));
    return this;
  }
  // Recolor every pixel of a given hex color within a region.
  copyFrom(src, sx, sy, w, h, dx, dy, flip = false) {
    this.ctx.save();
    if (flip) { this.ctx.translate(dx + w, dy); this.ctx.scale(-1, 1); this.ctx.drawImage(src.canvas || src, sx, sy, w, h, 0, 0, w, h); }
    else this.ctx.drawImage(src.canvas || src, sx, sy, w, h, dx, dy, w, h);
    this.ctx.restore();
    return this;
  }
}

// Register a Pix as a texture; optional frames as [w,h] grid for spritesheets.
export function addTexture(scene, key, pix, frameW, frameH) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.addCanvas(key, pix.canvas);
  if (frameW) {
    const cols = Math.floor(pix.w / frameW), rows = Math.floor(pix.h / frameH);
    let i = 0;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) tex.add(i++, 0, x * frameW, y * frameH, frameW, frameH);
  }
  return tex;
}

export function rng(seed) {
  let s = seed % 2147483647; if (s <= 0) s += 2147483646;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}
