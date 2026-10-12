// Tile legend + procedural tileset generation (one tileset per sector theme).
import { Pix, addTexture } from './pix.js';
import { THEMES } from './palette.js';

export const T = 16;

// Each legend char -> { solid, draw(p, x, y, th) }. Wall-like chars autotile to a "face" when floor is below.
const WALLISH = new Set(['#', 'W', '_', 'n', 'e', '?', 'Y']);
export const isWallish = (ch) => WALLISH.has(ch);

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + amt)));
  return '#' + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map(v => v.toString(16).padStart(2, '0')).join('');
}

function floor(p, x, y, th, v = 0) {
  p.rect(x, y, T, T, th.floor[0]);
  if (v === 1) { p.rect(x, y, 8, 8, th.floor[1]); p.rect(x + 8, y + 8, 8, 8, th.floor[1]); }
  p.hline(x, y + 15, T, shade(th.floor[0], -10)).vline(x + 15, y, T, shade(th.floor[0], -10));
  p.noise(x, y, T, T, [shade(th.floor[0], 8), shade(th.floor[0], -8)], 0.06, x * 31 + y * 17 + v + 3);
}
function alt(p, x, y, th) {
  p.rect(x, y, T, T, th.alt[0]);
  p.noise(x, y, T, T, [th.alt[1], shade(th.alt[0], 10)], 0.25, x + y * 7 + 11);
}
function wallTop(p, x, y, th) {
  p.rect(x, y, T, T, th.wallTop);
  p.hline(x, y + 7, T, shade(th.wallTop, 8)).hline(x, y + 15, T, shade(th.wallTop, 8));
  p.vline(x + 4, y, 7, shade(th.wallTop, 6)).vline(x + 12, y + 8, 7, shade(th.wallTop, 6));
}
function wallFace(p, x, y, th) {
  p.rect(x, y, T, T, th.wallFace);
  p.rect(x, y, T, 2, th.trim).hline(x, y + 2, T, shade(th.wallFace, -20));
  p.vline(x + 7, y + 3, 10, shade(th.wallFace, -12)).vline(x + 8, y + 3, 10, shade(th.wallFace, 10));
  p.rect(x, y + 13, T, 3, shade(th.wallFace, -45)).hline(x, y + 13, T, shade(th.wallFace, -25));
}

const DEFS = {
  '.': { draw: (p, x, y, th) => floor(p, x, y, th, 0) },
  ':': { draw: (p, x, y, th) => floor(p, x, y, th, 1) },
  ',': { draw: alt },
  '"': { draw: (p, x, y, th) => { alt(p, x, y, th); p.frame(x + 1, y + 1, 14, 14, shade(th.accent, -40)); } },
  '*': { draw: (p, x, y, th) => { floor(p, x, y, th); p.rect(x + 5, y + 5, 6, 6, shade(th.accent, -30)).rect(x + 6, y + 6, 4, 4, th.accent).px(x + 7, y + 7, '#ffffff'); } },
  '~': { draw: (p, x, y, th) => { floor(p, x, y, th); p.line(x, y + 4, x + 15, y + 10, '#1c1a2b').line(x, y + 5, x + 15, y + 11, '#2a7f8a').line(x, y + 11, x + 15, y + 6, '#1c1a2b').line(x, y + 12, x + 15, y + 7, '#9e2a3c'); } },
  '-': { draw: (p, x, y, th) => { p.rect(x, y, T, T, '#0d0b14'); p.rect(x, y + 2, T, 12, '#6a6488'); for (let i = 0; i < 16; i += 4) p.vline(x + i, y + 2, 12, '#4a4860'); p.hline(x, y + 2, T, '#b8b6c8').hline(x, y + 13, T, '#2e2c40'); } },
  '^': { solid: true, draw: (p, x, y) => { p.rect(x, y, T, T, '#07060c'); p.noise(x, y, T, T, ['#1c1a2b'], 0.15, x + y); p.line(x + 1, y + 2, x + 6, y + 7, '#4a4860').line(x + 14, y + 12, x + 10, y + 9, '#4a4860'); p.px(x + 7, y + 8, '#f08a3c').px(x + 9, y + 8, '#f08a3c'); } },
  'w': { solid: true, draw: (p, x, y) => { p.rect(x, y, T, T, '#1a4a6a'); p.hline(x + 2, y + 4, 5, '#5ee0e8').hline(x + 9, y + 10, 5, '#5ee0e8').hline(x + 4, y + 13, 3, '#2f9aa8'); } },
  '#': { solid: true, wall: true },
  'W': { solid: true, wall: true, face: (p, x, y, th) => { wallFace(p, x, y, th); p.rect(x + 2, y + 3, 12, 9, '#0d0b14').rect(x + 3, y + 4, 10, 7, '#1a2448'); p.px(x + 5, y + 5, '#ffffff').px(x + 10, y + 7, '#b8b6c8').px(x + 7, y + 9, '#ffe08a'); p.vline(x + 7, y + 4, 7, '#0d0b14'); } },
  '_': { solid: true, wall: true, face: (p, x, y, th) => { wallFace(p, x, y, th); p.rect(x + 1, y + 3, 14, 9, '#b8b6c8').rect(x + 2, y + 4, 12, 7, '#f2f0e6'); p.hline(x + 3, y + 5, 6, '#4a74d6').hline(x + 3, y + 7, 9, '#4a74d6').hline(x + 4, y + 9, 4, '#e0485e').line(x + 9, y + 9, x + 12, y + 5, '#2f7a46'); } },
  'n': { solid: true, wall: true, face: (p, x, y, th) => { wallFace(p, x, y, th); p.rect(x + 2, y + 3, 12, 9, '#7a4e32').rect(x + 3, y + 4, 10, 7, '#b07a4a'); p.rect(x + 4, y + 5, 3, 3, '#ffe08a').rect(x + 8, y + 5, 4, 2, '#f2f0e6').rect(x + 8, y + 8, 3, 2, '#9a5ad8').px(x + 5, y + 5, '#e0485e'); } },
  'e': { solid: true, wall: true, face: (p, x, y, th) => { wallFace(p, x, y, th); p.rect(x + 1, y + 2, 14, 12, '#4a4860').rect(x + 2, y + 3, 12, 11, '#7a7890'); p.vline(x + 7, y + 3, 11, '#2e2c40').vline(x + 8, y + 3, 11, '#b8b6c8'); p.px(x + 7, y, '#e0485e'); } },
  '?': { solid: true, wall: true, face: (p, x, y, th) => { wallFace(p, x, y, th); p.line(x + 4, y + 4, x + 7, y + 8, shade(th.wallFace, -30)).line(x + 7, y + 8, x + 5, y + 11, shade(th.wallFace, -30)); } },
  'Y': { solid: true, wall: true, face: (p, x, y, th) => { wallFace(p, x, y, th); p.rect(x + 3, y + 3, 10, 10, '#2e2c40').rect(x + 4, y + 4, 8, 6, '#5ee0e8'); p.hline(x + 5, y + 6, 4, '#1f5f6a').hline(x + 5, y + 8, 6, '#1f5f6a'); } },
  '=': { solid: true, draw: (p, x, y, th) => { floor(p, x, y, th); p.rect(x, y + 3, T, 9, '#7a4e32').rect(x, y + 3, T, 2, '#b07a4a').rect(x, y + 12, T, 2, '#4a2e22'); p.rect(x + 2, y + 5, 4, 3, '#f2f0e6').rect(x + 9, y + 6, 3, 2, '#d9a53a'); } },
  'T': { solid: true, draw: (p, x, y, th) => { floor(p, x, y, th); p.rect(x, y + 6, T, 7, '#7a4e32').rect(x, y + 6, T, 2, '#b07a4a').rect(x, y + 13, T, 1, '#4a2e22'); p.rect(x + 3, y, 10, 7, '#1c1a2b').rect(x + 4, y + 1, 8, 5, '#2f9aa8'); p.hline(x + 5, y + 2, 4, '#b8f6f8').hline(x + 5, y + 4, 6, '#5ee0e8'); p.rect(x + 7, y + 7, 2, 1, '#1c1a2b').rect(x + 4, y + 9, 8, 2, '#2e2c40'); } },
  'h': { draw: (p, x, y, th) => { floor(p, x, y, th); p.rect(x + 4, y + 3, 8, 6, '#24376e').rect(x + 4, y + 9, 8, 3, '#4a74d6').vline(x + 5, y + 12, 3, '#1c1a2b').vline(x + 10, y + 12, 3, '#1c1a2b'); } },
  'L': { solid: true, draw: (p, x, y, th) => { floor(p, x, y, th); p.rect(x, y, T, 15, '#4a74d6').rect(x, y, T, 1, '#8fb0ff'); p.vline(x + 7, y, 15, '#24376e').vline(x + 15, y, 15, '#24376e'); for (let i = 0; i < 3; i++) { p.hline(x + 2, y + 2 + i * 2, 4, '#24376e').hline(x + 10, y + 2 + i * 2, 4, '#24376e'); } p.px(x + 5, y + 9, '#ffe08a').px(x + 13, y + 9, '#ffe08a'); p.hline(x, y + 15, T, '#0d0b14'); } },
  'S': { solid: true, draw: (p, x, y) => { p.rect(x, y, T, T, '#0d0b14'); p.rect(x + 1, y, 14, 16, '#2e2c40'); for (let i = 0; i < 5; i++) { p.rect(x + 2, y + 1 + i * 3, 12, 2, '#1c1a2b'); p.px(x + 3, y + 1 + i * 3, i % 2 ? '#5cc070' : '#5ee0e8').px(x + 5, y + 1 + i * 3, i === 3 ? '#e0485e' : '#5cc070'); p.hline(x + 8, y + 2 + i * 3, 5, '#4a4860'); } } },
  'B': { solid: true, draw: (p, x, y, th) => { floor(p, x, y, th); p.rect(x, y, T, 15, '#4a2e22').rect(x + 1, y + 1, 14, 6, '#2a1a12').rect(x + 1, y + 8, 14, 6, '#2a1a12'); const cs = ['#9e2a3c', '#24376e', '#2f7a46', '#d9a53a', '#4e2c78', '#b8b6c8']; for (let i = 0; i < 7; i++) { p.rect(x + 1 + i * 2, y + 2 + (i % 2), 2, 5 - (i % 2), cs[(i + x) % 6]); p.rect(x + 1 + i * 2, y + 9 + ((i + 1) % 2), 2, 5 - ((i + 1) % 2), cs[(i * 3 + y) % 6]); } } },
  'P': { solid: true, draw: (p, x, y, th) => { floor(p, x, y, th); p.rect(x + 4, y + 10, 8, 5, '#c25a1e').hline(x + 4, y + 10, 8, '#f08a3c'); p.disc(x + 8, y + 6, 5, '#2f7a46'); p.disc(x + 6, y + 4, 2, '#5cc070').disc(x + 10, y + 7, 2, '#5cc070'); p.px(x + 8, y + 2, '#a6e07a'); } },
  'V': { solid: true, draw: (p, x, y, th) => { floor(p, x, y, th); p.rect(x + 1, y, 14, 15, '#9e2a3c').rect(x + 2, y + 1, 8, 11, '#1c1a2b'); for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) p.rect(x + 3 + j * 4, y + 2 + i * 3, 3, 2, ['#ffe08a', '#5ee0e8', '#5cc070'][(i + j) % 3]); p.rect(x + 11, y + 2, 3, 4, '#f2f0e6').rect(x + 11, y + 8, 3, 2, '#0d0b14').rect(x + 3, y + 13, 7, 1, '#0d0b14'); } },
  'F': { solid: true, draw: (p, x, y, th) => { floor(p, x, y, th); p.rect(x, y + 3, T, 6, '#4e2c78').rect(x, y + 9, T, 5, '#9a5ad8').hline(x, y + 9, T, '#d4a0ff').vline(x + 8, y + 9, 5, '#4e2c78'); p.hline(x, y + 14, T, '#0d0b14'); } },
  'O': { solid: true, draw: (p, x, y, th) => { floor(p, x, y, th); p.rect(x + 3, y, 10, 16, th.wallFace).vline(x + 3, y, 16, shade(th.wallFace, 25)).vline(x + 12, y, 16, shade(th.wallFace, -30)).rect(x + 2, y + 13, 12, 3, shade(th.wallFace, -40)); } },
  'c': { solid: true, draw: (p, x, y, th) => { floor(p, x, y, th); p.rect(x + 1, y + 2, 14, 13, '#b07a4a').frame(x + 1, y + 2, 14, 13, '#7a4e32').line(x + 2, y + 3, x + 13, y + 13, '#7a4e32').hline(x + 1, y + 7, 14, '#dcb07a'); } },
  'x': { solid: true, draw: (p, x, y, th) => { floor(p, x, y, th); p.rect(x + 4, y + 5, 8, 10, '#4a4860').rect(x + 3, y + 4, 10, 2, '#7a7890').vline(x + 6, y + 7, 7, '#2e2c40').vline(x + 9, y + 7, 7, '#2e2c40'); p.px(x + 7, y + 3, '#f2f0e6').px(x + 8, y + 2, '#f2f0e6'); } },
  't': { solid: true, draw: (p, x, y, th) => { floor(p, x, y, th); p.ellipse(x + 8, y + 7, 7, 5, '#b07a4a'); p.ellipse(x + 8, y + 6, 6, 3, '#dcb07a'); p.vline(x + 8, y + 12, 3, '#4a2e22'); p.rect(x + 5, y + 5, 3, 2, '#f2f0e6').px(x + 10, y + 6, '#9e2a3c'); } },
  'o': { solid: true, draw: (p, x, y, th) => { floor(p, x, y, th); p.rect(x, y + 6, T, 8, '#4a4860').hline(x, y + 6, T, '#7a7890'); p.rect(x + 2, y, 9, 7, '#2e2c40').rect(x + 3, y + 1, 7, 5, '#0f2a20'); p.line(x + 3, y + 4, x + 5, y + 2, '#5cc070').line(x + 5, y + 2, x + 7, y + 5, '#5cc070').line(x + 7, y + 5, x + 9, y + 2, '#5cc070'); p.rect(x + 12, y + 3, 3, 4, '#c25a1e').px(x + 13, y + 2, '#f2f0e6'); p.px(x + 3, y + 9, '#ffe08a').px(x + 6, y + 9, '#e0485e'); } },
  'a': { solid: true, draw: (p, x, y, th) => { floor(p, x, y, th); p.rect(x + 1, y + 1, 14, 14, '#2e2c40').rect(x + 3, y + 3, 10, 9, '#0d0b14').rect(x + 5, y + 8, 6, 4, '#f08a3c').rect(x + 7, y + 3, 2, 3, '#b8b6c8'); p.hline(x + 3, y + 3, 10, '#7a7890'); p.px(x + 12, y + 13, '#5cc070'); } },
  'M': { solid: true, draw: (p, x, y) => { p.rect(x, y, T, T, '#1c1a2b'); p.rect(x + 1, y + 1, 14, 14, '#7a7890').rect(x + 2, y + 2, 12, 12, '#b8b6c8'); p.disc(x + 5, y + 6, 3, '#2e2c40').disc(x + 11, y + 6, 3, '#2e2c40'); p.disc(x + 5, y + 6, 1, '#7a7890').disc(x + 11, y + 6, 1, '#7a7890'); for (let i = 0; i < 5; i++) p.px(x + 3 + i * 2, y + 12, i % 2 ? '#e0485e' : '#ffe08a'); } },
  'k': { solid: true, draw: (p, x, y, th) => { floor(p, x, y, th); p.rect(x, y + 4, T, 11, '#b8b6c8').rect(x, y + 4, T, 2, '#f2f0e6').hline(x, y + 14, T, '#4a4860'); p.rect(x + 2, y, 6, 5, '#2e2c40').rect(x + 3, y + 1, 4, 2, '#e0485e'); p.rect(x + 10, y + 1, 4, 4, '#7a4e32').px(x + 11, y, '#f2f0e6'); } },
  'g': { solid: true, draw: (p, x, y, th) => { floor(p, x, y, th); p.rect(x, y + 1, T, 14, '#2f9aa8').rect(x + 1, y + 2, 14, 12, '#1f5f6a'); p.line(x + 3, y + 12, x + 8, y + 4, '#b8f6f8'); p.rect(x + 6, y + 9, 4, 4, '#d9a53a'); } },
  'p': { solid: true, draw: (p, x, y, th) => { floor(p, x, y, th); p.rect(x + 2, y, 5, 16, '#6a5e48').vline(x + 2, y, 16, '#8a7a58').rect(x + 9, y, 5, 16, '#3a3428').vline(x + 9, y, 16, '#6a5e48'); p.rect(x + 1, y + 6, 7, 2, '#d9a53a').rect(x + 8, y + 11, 7, 2, '#c25a1e'); } },
  'r': { solid: true, draw: (p, x, y, th) => { floor(p, x, y, th); p.rect(x + 1, y + 1, 14, 14, '#4a4860').rect(x + 2, y + 2, 12, 12, '#2e2c40'); for (let i = 0; i < 4; i++) p.rect(x + 3 + i * 3, y + 4, 2, 8, ['#d9a53a', '#b8b6c8', '#7a7890', '#d9a53a'][i]); } },
  's': { draw: (p, x, y, th) => { p.rect(x, y, T, T, shade(th.floor[0], -30)); for (let i = 0; i < 4; i++) { p.rect(x, y + i * 4, T, 3, shade(th.floor[0], 10 - i * 12)); p.hline(x, y + i * 4, T, shade(th.floor[0], 30 - i * 12)); } } },
  'X': { solid: true, draw: (p, x, y) => { p.rect(x, y, T, T, '#1c0a1a'); p.noise(x, y, T, T, ['#e0485e', '#9a5ad8', '#5ee0e8', '#0d0b14', '#f2f0e6'], 0.5, x * 13 + y * 7); for (let i = 0; i < 4; i++) p.hline(x, y + i * 4 + 1, T, '#0d0b14'); } },
  '&': { solid: true, draw: (p, x, y, th) => { floor(p, x, y, th); p.rect(x + 3, y + 10, 10, 5, '#3a3428').hline(x + 3, y + 10, 10, '#8a7a58'); p.disc(x + 8, y + 6, 4, '#b8b6c8'); p.disc(x + 6, y + 3, 3, '#f2f0e6'); p.disc(x + 10, y + 2, 2, '#f2f0e6'); } },
};

export const LEGEND = Object.keys(DEFS);
export const isSolid = (ch) => !!(DEFS[ch] && DEFS[ch].solid);

// Tile indices in a theme sheet: [char] -> index; walls get 'top' and 'face' variants; floor '.' gets 2 variants.
const ORDER = [];
for (const ch of LEGEND) {
  if (DEFS[ch].wall) { ORDER.push(ch + '|top', ch + '|face'); }
  else ORDER.push(ch);
}
ORDER.push('.|2');
export const TILE_INDEX = Object.fromEntries(ORDER.map((k, i) => [k, i]));

export function buildTilesets(scene) {
  for (const [name, th] of Object.entries(THEMES)) {
    const cols = 8, rows = Math.ceil(ORDER.length / cols);
    const p = new Pix(cols * T, rows * T);
    ORDER.forEach((key, i) => {
      const x = (i % cols) * T, y = Math.floor(i / cols) * T;
      const [ch, variant] = key.split('|');
      const def = DEFS[ch];
      if (variant === 'top') wallTop(p, x, y, th);
      else if (variant === 'face') (def.face || wallFace)(p, x, y, th);
      else if (variant === '2') floor(p, x, y, th, 2);
      else def.draw(p, x, y, th);
    });
    addTexture(scene, 'tiles_' + name, p);
  }
}

// Resolve a char at (x,y) in grid to a tileset index (autotiling walls).
export function tileIndexAt(grid, x, y) {
  const ch = grid[y][x];
  if (isWallish(ch)) {
    const below = y + 1 < grid.length ? grid[y + 1][x] : '#';
    return TILE_INDEX[ch + (isWallish(below) ? '|top' : '|face')];
  }
  if (ch === '.' && ((x * 7 + y * 13) % 11 === 0)) return TILE_INDEX['.|2'];
  return TILE_INDEX[ch] ?? TILE_INDEX['.'];
}
