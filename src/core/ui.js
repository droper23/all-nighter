// Shared UI helpers: pixel text, windows, bars, simple list menus.
import { wrap, CHAR_W } from './font.js';
import { audio } from './audio.js';

export const W = 480, H = 270;
export const C = {
  bg: 0x0d0b14, panel: 0x16142a, panel2: 0x221f3a, edge: 0x4a4860, edgeHi: 0x8a84b8, text: 0xf2f0e6, dim: 0x7a7890,
  accent: 0x5ee0e8, warn: 0xf08a3c, bad: 0xe0485e, good: 0x5cc070, gold: 0xffe08a, purple: 0x9a5ad8,
};
export const toInt = (c) => typeof c === 'number' ? c : parseInt(c.replace('#', ''), 16);

export function text(scene, x, y, str, color = C.text, size = 1) {
  const t = scene.add.bitmapText(x, y, 'px', String(str)).setTint(toInt(color));
  if (size !== 1) t.setScale(size);
  return t;
}
export function shadowText(scene, x, y, str, color = C.text, size = 1) {
  const s = text(scene, x + size, y + size, str, 0x000000, size).setAlpha(0.8);
  const t = text(scene, x, y, str, color, size);
  t.shadow = s;
  const setText = t.setText.bind(t);
  t.setText = (v) => { s.setText(v); return setText(v); };
  const setDepth = t.setDepth.bind(t);
  t.setDepth = (d) => { s.setDepth(d - 0.01); return setDepth(d); };
  const setVisible = t.setVisible.bind(t);
  t.setVisible = (v) => { s.setVisible(v); return setVisible(v); };
  const destroy = t.destroy.bind(t);
  t.destroy = () => { s.destroy(); destroy(); };
  const setScrollFactor = t.setScrollFactor.bind(t);
  t.setScrollFactor = (v) => { s.setScrollFactor(v); return setScrollFactor(v); };
  return t;
}
export const textWidth = (str, size = 1) => String(str).length * CHAR_W * size;

export function panel(scene, x, y, w, h, { fill = C.panel, edge = C.edge, hi = C.edgeHi, alpha = 0.96 } = {}) {
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.5).fillRect(x + 2, y + 2, w, h);
  g.fillStyle(fill, alpha).fillRect(x, y, w, h);
  g.lineStyle(1, edge, 1).strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  g.lineStyle(1, hi, 1).lineBetween(x + 2, y + 1.5, x + w - 2, y + 1.5);
  g.fillStyle(hi, 1).fillRect(x, y, 2, 2).fillRect(x + w - 2, y, 2, 2).fillRect(x, y + h - 2, 2, 2).fillRect(x + w - 2, y + h - 2, 2, 2);
  return g;
}

export function bar(g, x, y, w, h, frac, color, back = 0x1c1a2b) {
  frac = Math.max(0, Math.min(1, frac || 0));
  g.fillStyle(0x000000, 1).fillRect(x - 1, y - 1, w + 2, h + 2);
  g.fillStyle(back, 1).fillRect(x, y, w, h);
  g.fillStyle(color, 1).fillRect(x, y, Math.round(w * frac), h);
  g.fillStyle(0xffffff, 0.25).fillRect(x, y, Math.round(w * frac), 1);
}

export function wrapText(str, widthPx) { return wrap(str, Math.floor(widthPx / CHAR_W)); }

// A vertical list menu. items: [{label, color?, disabled?, right?}] ; returns controller object.
export class ListMenu {
  constructor(scene, x, y, w, items, { rows = 8, lineH = 11, depth = 100, onSelect, onBack, onMove, cursor = 0 } = {}) {
    Object.assign(this, { scene, x, y, w, rows, lineH, depth, onSelect, onBack, onMove });
    this.items = items; this.cursor = Math.min(cursor, Math.max(0, items.length - 1)); this.top = 0; this.objs = [];
    this.active = true;
    this.render();
  }
  setItems(items) { this.items = items; this.cursor = Math.min(this.cursor, Math.max(0, items.length - 1)); this.render(); }
  render() {
    this.objs.forEach(o => o.destroy()); this.objs = [];
    if (this.cursor < this.top) this.top = this.cursor;
    if (this.cursor >= this.top + this.rows) this.top = this.cursor - this.rows + 1;
    const vis = this.items.slice(this.top, this.top + this.rows);
    vis.forEach((it, i) => {
      const idx = this.top + i, sel = idx === this.cursor;
      const y = this.y + i * this.lineH;
      if (sel && this.active) {
        const g = this.scene.add.graphics().setDepth(this.depth);
        g.fillStyle(C.accent, 0.18).fillRect(this.x - 2, y - 2, this.w, this.lineH);
        this.objs.push(g);
      }
      const col = it.disabled ? C.dim : (it.color ?? C.text);
      this.objs.push(text(this.scene, this.x + 8, y, it.label, col).setDepth(this.depth + 1));
      if (it.right != null) {
        const r = String(it.right);
        this.objs.push(text(this.scene, this.x + this.w - 6 - textWidth(r), y, r, it.rightColor ?? C.dim).setDepth(this.depth + 1));
      }
      if (sel && this.active) this.objs.push(text(this.scene, this.x, y, '►', C.accent).setDepth(this.depth + 1));
    });
    if (this.top > 0) this.objs.push(text(this.scene, this.x + this.w - 10, this.y - 9, '▲', C.dim).setDepth(this.depth + 1));
    if (this.top + this.rows < this.items.length) this.objs.push(text(this.scene, this.x + this.w - 10, this.y + this.rows * this.lineH - 2, '▼', C.dim).setDepth(this.depth + 1));
  }
  update(input, delta) {
    if (!this.active || !this.items.length && !input.pressed('back')) return;
    const d = input.nav(delta);
    if (d === 'up' || d === 'down') {
      const n = this.items.length;
      if (n) {
        this.cursor = (this.cursor + (d === 'up' ? -1 : 1) + n) % n;
        audio.sfx('move'); this.render();
        this.onMove && this.onMove(this.items[this.cursor], this.cursor);
      }
    } else if (input.pressed('ok')) {
      const it = this.items[this.cursor];
      if (!it) return;
      if (it.disabled) { audio.sfx('error'); return; }
      audio.sfx('select');
      this.onSelect && this.onSelect(it, this.cursor);
    } else if (input.pressed('back')) {
      if (this.onBack) { audio.sfx('back'); this.onBack(); }
    }
  }
  setActive(a) { this.active = a; this.render(); }
  destroy() { this.objs.forEach(o => o.destroy()); this.objs = []; }
}

// Fade helpers
export function fadeIn(scene, ms = 250) { scene.cameras.main.fadeIn(ms, 7, 6, 12); }
export function fadeTo(scene, cb, ms = 250) {
  scene.cameras.main.fadeOut(ms, 7, 6, 12);
  scene.cameras.main.once('camerafadeoutcomplete', cb);
}
