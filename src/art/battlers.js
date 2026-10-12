// Battle sprites (player, drones, every Glitch). Procedural pixel art, outlined.
import { Pix, addTexture, rng } from './pix.js';

const JULES = [
  '', '...........eeeee', '.........eeeeEeeee', '........eeeeeEEeeee', '.......eeeeeeeeeeeee', '.......eeeEeeeeeeeee',
  '......eeeeeeeesssssse', '......eeeeeeesssssssss', '......eeeeeesssssskssS', '......eeeeeesssssskssss',
  '.......eeeeessssssssss', '.......eeeeSsssssssSS', '........eeeSSssssss', '.........eeTTSSSSTT',
  '........TTTTTTTTTTTTT', '.......TTTTTTTTTTTTTTT......a', '......TTTTtTTTTTTTTTTTT.....a', '......TTTTtTTTTTTsssqqqqqqq.a',
  '......TTTTtTTTTTTsssqccccCq', '.....OOTTTtTTTTTTTTTqcCcccq', '.....OOTTTtTTTTTTTTTqccccrq', '.....OOTTTTTTTTTTsssqqqqqqq',
  '.....OOTTTTTTTTTTTT..qq', '......OTTTTTTTTTTTT', '.......tttttttttttt', '.......bbbbbbbbbbbb',
  '.......bbbbbb.bbbbbb', '.......bbbbb...bbbbb', '......bbbbb.....bbbb', '......bbbb.......bbbb',
  '.....wwwwww......wwwww', '.....kkkkkk......kkkkk',
];
const JMAP = { e: '#3a2418', E: '#6a4430', s: '#c8906a', S: '#8a5a3e', k: '#0d0b14', T: '#2f9aa8', t: '#1f5f6a', O: '#f08a3c', b: '#24376e', w: '#f2f0e6', q: '#2e2c40', c: '#5ee0e8', C: '#b8f6f8', r: '#e0485e', a: '#7a7890' };

const face = (p, x, y, eye = '#0d0b14', glow = null) => { p.rect(x, y, 2, 3, eye).rect(x + 5, y, 2, 3, eye); if (glow) { p.px(x, y, glow).px(x + 5, y, glow); } };
const mirror = (p, w) => { const c = p.ctx, d = c.getImageData(0, 0, w, p.h); const half = Math.floor(w / 2); for (let y = 0; y < p.h; y++) for (let x = 0; x < half; x++) { const i = (y * w + x) * 4, j = (y * w + (w - 1 - x)) * 4; for (let k = 0; k < 4; k++) d.data[j + k] = d.data[i + k]; } c.putImageData(d, 0, 0); };

const D = {
  jules: [32, 32, (p) => p.grid(0, 0, JULES, JMAP)],
  drone_cam: [20, 16, (p) => { p.hline(1, 2, 7, '#7a7890').hline(12, 2, 7, '#7a7890').vline(4, 2, 3, '#4a4860').vline(15, 2, 3, '#4a4860'); p.rect(5, 5, 10, 8, '#2e2c40').disc(10, 9, 3, '#0d0b14').disc(10, 9, 2, '#4a74d6').px(9, 8, '#f2f0e6').px(13, 6, '#e0485e'); }],
  drone_turret: [20, 20, (p) => { p.ellipse(10, 9, 6, 8, '#b8b6c8').ellipse(10, 9, 5, 7, '#f2f0e6').vline(10, 2, 6, '#7a7890').rect(4, 15, 12, 4, '#4a4860').rect(14, 8, 6, 2, '#2e2c40').px(10, 12, '#e0485e'); }],
  drone_fork: [14, 14, (p) => { p.disc(7, 7, 5, '#5cc070').disc(7, 7, 3, '#a6e07a'); p.vline(7, 3, 8, '#0d0b14').line(7, 6, 4, 3, '#0d0b14').line(7, 6, 10, 3, '#0d0b14'); }],

  fizzbit: [32, 32, (p) => {
    p.rect(10, 9, 12, 19, '#e0485e').rect(10, 9, 3, 19, '#ff7a8a').rect(19, 9, 3, 19, '#9e2a3c');
    p.ellipse(16, 9, 6, 2, '#b8b6c8').ellipse(16, 9, 4, 1, '#7a7890').rect(15, 7, 3, 2, '#f2f0e6');
    p.line(10, 18, 21, 15, '#f2f0e6').line(10, 19, 21, 16, '#f2f0e6');
    p.rect(12, 12, 3, 3, '#f2f0e6').rect(18, 12, 3, 3, '#f2f0e6').px(13, 13, '#0d0b14').px(19, 13, '#0d0b14');
    p.line(12, 11, 14, 12, '#0d0b14').line(20, 11, 18, 12, '#0d0b14');
    p.rect(13, 21, 6, 2, '#0d0b14').px(14, 22, '#f2f0e6');
    p.rect(11, 28, 2, 3, '#7a7890').rect(19, 28, 2, 3, '#7a7890');
    [[13, 3], [18, 1], [21, 4], [10, 2]].forEach(([x, y]) => p.disc(x, y, 1, '#b8f6f8'));
  }],
  lampy: [32, 32, (p) => {
    p.ellipse(10, 28, 8, 2, '#2e2c40').rect(4, 27, 13, 2, '#4a4860');
    for (let i = 0; i < 3; i++) { p.line(10 + i, 27, 13 + i, 16, '#7a7890'); p.line(13 + i, 16, 18 + i, 8, '#7a7890'); }
    p.disc(14, 16, 2, '#4a4860');
    p.ellipse(22, 9, 8, 6, '#2f7a46'); p.ellipse(22, 8, 7, 4, '#5cc070'); p.rect(15, 11, 14, 3, '#2f7a46');
    p.ellipse(22, 14, 5, 2, '#ffe08a').disc(22, 14, 1, '#ffffff');
    p.rect(18, 7, 2, 2, '#ffe08a').rect(25, 7, 2, 2, '#ffe08a');
  }],
  jam: [32, 32, (p) => {
    p.rect(3, 11, 26, 15, '#b8b6c8').rect(3, 11, 26, 3, '#f2f0e6').rect(3, 23, 26, 3, '#7a7890');
    p.rect(6, 15, 20, 3, '#0d0b14');
    p.rect(8, 16, 6, 9, '#f2f0e6').rect(16, 16, 7, 12, '#f2f0e6').hline(9, 20, 4, '#7a7890').hline(17, 22, 5, '#7a7890').hline(17, 25, 4, '#7a7890');
    p.rect(9, 6, 14, 6, '#f2f0e6').hline(10, 8, 10, '#b8b6c8');
    p.rect(7, 12, 3, 2, '#e0485e').rect(22, 12, 3, 2, '#e0485e');
    p.rect(24, 19, 3, 2, '#5cc070');
    p.disc(28, 6, 2, '#f2f0e6').disc(4, 4, 2, '#f2f0e6');
  }],
  dustbun: [32, 32, (p) => {
    p.ellipse(16, 21, 13, 7, '#2e2c40'); p.ellipse(16, 19, 12, 6, '#4a4860'); p.ellipse(16, 18, 9, 4, '#7a7890');
    p.disc(16, 17, 2, '#0d0b14').px(16, 17, '#e0485e');
    p.hline(5, 22, 22, '#1c1a2b'); p.rect(10, 13, 3, 2, '#5ee0e8').rect(20, 13, 3, 2, '#5ee0e8');
    [[4, 27], [8, 29], [26, 28], [29, 25]].forEach(([x, y]) => p.disc(x, y, 2, '#7a7890'));
    p.line(28, 18, 31, 15, '#b8b6c8').line(4, 18, 1, 15, '#b8b6c8');
  }],
  vendor: [64, 64, (p) => {
    p.rect(10, 4, 44, 58, '#9e2a3c').rect(10, 4, 44, 3, '#e0485e').rect(10, 4, 3, 58, '#c83a50').rect(51, 4, 3, 58, '#6e1a2a');
    p.rect(14, 10, 26, 38, '#0d0b14').rect(15, 11, 24, 36, '#1a2448');
    const cans = ['#ffe08a', '#5ee0e8', '#5cc070', '#f08a3c', '#9a5ad8', '#f2f0e6'];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) { p.rect(17 + c * 6, 13 + r * 7, 4, 5, cans[(r * 3 + c) % 6]); p.px(17 + c * 6, 13 + r * 7, '#ffffff'); }
    p.line(15, 46, 38, 12, 'rgba(255,255,255,0.25)');
    p.rect(43, 10, 8, 10, '#0d0b14').rect(44, 11, 6, 8, '#3a0a14');
    p.rect(44, 12, 2, 2, '#ff6b6b').rect(48, 12, 2, 2, '#ff6b6b').hline(44, 16, 6, '#ff6b6b');
    p.rect(44, 23, 6, 12, '#7a7890'); for (let i = 0; i < 4; i++) p.rect(45, 24 + i * 3, 4, 2, '#b8b6c8');
    p.rect(44, 38, 6, 4, '#0d0b14').rect(46, 39, 2, 2, '#ffe08a');
    p.rect(16, 51, 22, 7, '#0d0b14').rect(17, 52, 20, 5, '#2e2c40');
    p.rect(10, 60, 44, 3, '#4a1018');
    p.rect(44, 44, 6, 2, '#5ee0e8');
  }],

  solderimp: [32, 32, (p) => {
    p.ellipse(16, 20, 9, 8, '#b8b6c8'); p.ellipse(15, 18, 7, 6, '#f2f0e6'); p.ellipse(17, 24, 7, 3, '#f08a3c');
    p.line(9, 13, 7, 7, '#f08a3c').line(23, 13, 25, 7, '#f08a3c').line(10, 13, 8, 8, '#f08a3c').line(22, 13, 24, 8, '#f08a3c');
    face(p, 12, 17, '#e0485e'); p.hline(13, 22, 6, '#4a4860');
    p.line(25, 19, 31, 25, '#4a4860').line(25, 20, 31, 26, '#2e2c40').px(31, 26, '#ffe08a');
    [[5, 25], [27, 12], [8, 30]].forEach(([x, y]) => p.disc(x, y, 1, '#f08a3c'));
  }],
  crawler: [32, 32, (p) => {
    const cols = ['#e0485e', '#4a74d6', '#5cc070', '#ffe08a'];
    for (let i = 0; i < 4; i++) {
      p.line(12, 14 + i * 2, 3, 10 + i * 5, cols[i]).line(3, 10 + i * 5, 1, 18 + i * 4, cols[i]);
      p.line(20, 14 + i * 2, 29, 10 + i * 5, cols[3 - i]).line(29, 10 + i * 5, 31, 18 + i * 4, cols[3 - i]);
    }
    p.rect(10, 11, 12, 12, '#1c1a2b').rect(11, 12, 10, 10, '#2e2c40');
    for (let i = 0; i < 5; i++) { p.px(9, 12 + i * 2, '#b8b6c8').px(22, 12 + i * 2, '#b8b6c8'); }
    p.rect(13, 14, 2, 2, '#e0485e').rect(17, 14, 2, 2, '#e0485e').px(15, 18, '#7a7890').px(16, 18, '#7a7890');
  }],
  oscillo: [32, 32, (p) => {
    p.rect(3, 6, 26, 21, '#7a7890').rect(3, 6, 26, 2, '#b8b6c8').rect(5, 9, 16, 14, '#0d0b14').rect(6, 10, 14, 12, '#0f2a20');
    for (let x = 0; x < 14; x++) { const y = Math.round(16 + Math.sin(x / 2) * 4); p.px(6 + x, y, '#5cc070'); p.px(6 + x, y - 1, '#a6e07a'); }
    p.rect(8, 12, 2, 2, '#a6e07a').rect(15, 12, 2, 2, '#a6e07a');
    p.disc(25, 12, 2, '#2e2c40').disc(25, 19, 2, '#2e2c40').px(25, 11, '#f2f0e6').px(26, 19, '#f2f0e6');
    p.rect(5, 27, 4, 3, '#4a4860').rect(23, 27, 4, 3, '#4a4860');
  }],
  printhead: [32, 32, (p) => {
    p.rect(3, 4, 3, 26, '#4a4860').rect(26, 4, 3, 26, '#4a4860').rect(3, 4, 26, 3, '#7a7890').rect(3, 26, 26, 4, '#2e2c40');
    p.rect(12, 7, 8, 7, '#f08a3c').rect(15, 14, 2, 3, '#b8b6c8').px(15, 17, '#ffe08a');
    p.rect(13, 9, 2, 2, '#0d0b14').rect(17, 9, 2, 2, '#0d0b14');
    p.rect(9, 22, 13, 3, '#5ee0e8').rect(13, 19, 4, 3, '#5ee0e8').vline(15, 17, 2, '#2f9aa8');
  }],
  benchy: [24, 18, (p) => { p.rect(2, 9, 20, 5, '#f08a3c').rect(4, 14, 16, 2, '#c25a1e').rect(8, 3, 9, 6, '#f08a3c').rect(10, 5, 2, 2, '#0d0b14').rect(14, 5, 2, 2, '#0d0b14').rect(16, 1, 2, 3, '#c25a1e'); }],
  autograder: [64, 64, (p) => {
    p.rect(8, 8, 48, 44, '#2e2c40').rect(8, 8, 48, 3, '#7a7890').rect(12, 13, 40, 28, '#0d0b14').rect(13, 14, 38, 26, '#2a0a10');
    p.grid(18, 18, ['FFFF..', 'F.....', 'FFF...', 'F.....', 'F.....'], { F: '#ff6b6b' });
    p.grid(26, 18, ['.F.', 'FFF', '.F.'], { F: '#ff6b6b' });
    p.hline(34, 19, 14, '#ffe08a').hline(34, 22, 10, '#ffe08a').hline(34, 25, 12, '#ffe08a').hline(18, 30, 30, '#7a7890').hline(18, 33, 22, '#7a7890');
    p.rect(14, 44, 36, 6, '#4a4860'); for (let i = 0; i < 8; i++) p.rect(16 + i * 4, 45, 3, 2, '#b8b6c8');
    p.line(56, 20, 62, 34, '#e0485e').line(57, 20, 63, 34, '#9e2a3c').px(62, 35, '#f2f0e6');
    p.line(8, 20, 2, 34, '#e0485e').line(7, 20, 1, 34, '#9e2a3c').px(1, 35, '#f2f0e6');
    p.rect(20, 52, 24, 8, '#1c1a2b').rect(16, 58, 32, 4, '#2e2c40');
  }],

  fanwraith: [32, 32, (p) => {
    p.disc(16, 15, 12, 'rgba(184,246,248,0.25)'); p.rect(4, 3, 24, 24, '#2e2c40').rect(5, 4, 22, 22, '#1c1a2b');
    for (let a = 0; a < 5; a++) { const t = a * 1.256; for (let r = 3; r < 10; r++) { const x = 16 + Math.round(Math.cos(t + r * 0.12) * r), y = 15 + Math.round(Math.sin(t + r * 0.12) * r); p.px(x, y, '#8fb0ff').px(x + 1, y, '#4a74d6'); } }
    p.disc(16, 15, 3, '#4a4860').px(15, 14, '#5ee0e8').px(17, 14, '#5ee0e8');
    p.rect(5, 26, 4, 5, 'rgba(184,246,248,0.5)').rect(14, 26, 4, 6, 'rgba(184,246,248,0.4)').rect(23, 26, 4, 4, 'rgba(184,246,248,0.5)');
  }],
  packetrat: [32, 32, (p) => {
    p.ellipse(15, 20, 10, 7, '#b8b6c8'); p.rect(7, 15, 16, 10, '#f2f0e6'); p.line(7, 15, 15, 21, '#7a7890').line(23, 15, 15, 21, '#7a7890');
    p.ellipse(25, 17, 5, 4, '#b8b6c8'); p.disc(22, 12, 2, '#e0485e').disc(28, 13, 2, '#e0485e'); p.px(27, 16, '#0d0b14').px(30, 18, '#e0485e');
    p.line(5, 22, 1, 28, '#4a74d6').line(1, 28, 4, 31, '#4a74d6'); p.rect(3, 29, 3, 2, '#5ee0e8');
    p.rect(9, 26, 2, 3, '#7a7890').rect(19, 26, 2, 3, '#7a7890');
  }],
  cacheghoul: [32, 32, (p) => {
    p.ellipse(16, 13, 10, 10, '#b8b6c8'); p.rect(6, 13, 21, 14, '#b8b6c8');
    for (let i = 0; i < 4; i++) p.rect(7 + i * 5, 26, 4, 4 - (i % 2), '#b8b6c8');
    p.rect(10, 16, 13, 6, '#24376e'); for (let i = 0; i < 5; i++) p.rect(11 + i * 2.5, 17, 1, 4, '#ffe08a');
    p.rect(10, 9, 4, 4, '#0d0b14').rect(19, 9, 4, 4, '#0d0b14').px(11, 10, '#5ee0e8').px(20, 10, '#5ee0e8');
  }],
  sentinel: [32, 32, (p) => {
    p.rect(5, 6, 22, 24, '#9e2a3c'); for (let r = 0; r < 6; r++) { p.hline(5, 6 + r * 4, 22, '#4a1018'); for (let c = 0; c < 3; c++) p.vline(5 + c * 8 + (r % 2) * 4, 6 + r * 4, 4, '#4a1018'); }
    p.disc(16, 5, 4, '#f08a3c'); p.disc(16, 3, 2, '#ffe08a'); p.disc(9, 7, 2, '#f08a3c'); p.disc(23, 7, 2, '#f08a3c');
    p.rect(11, 14, 3, 2, '#ffe08a').rect(18, 14, 3, 2, '#ffe08a');
  }],
  drive: [32, 32, (p) => {
    p.rect(4, 3, 24, 27, '#7a7890').rect(5, 4, 22, 25, '#b8b6c8');
    p.disc(14, 15, 9, '#4a4860'); p.disc(14, 15, 8, '#b8b6c8'); p.disc(14, 15, 7, '#d8d6e8'); p.disc(14, 15, 2, '#4a4860');
    p.line(24, 25, 15, 10, '#2e2c40').line(25, 25, 16, 10, '#2e2c40').disc(24, 25, 2, '#2e2c40');
    p.rect(22, 5, 3, 2, '#5cc070'); p.rect(10, 13, 2, 2, '#0d0b14').rect(16, 13, 2, 2, '#0d0b14');
  }],

  bookworm: [32, 32, (p) => {
    p.rect(3, 12, 18, 16, '#9e2a3c').rect(3, 12, 18, 2, '#e0485e').rect(19, 12, 2, 16, '#f2f0e6'); p.hline(5, 18, 12, '#dcb07a');
    p.disc(23, 11, 5, '#a6e07a'); p.disc(19, 18, 4, '#5cc070'); p.disc(27, 7, 4, '#a6e07a');
    p.rect(25, 5, 2, 2, '#0d0b14').rect(29, 5, 2, 2, '#0d0b14'); p.rect(25, 3, 6, 1, '#2e2c40').rect(24, 2, 1, 2, '#2e2c40');
  }],
  margin: [32, 32, (p) => {
    p.rect(6, 4, 20, 24, '#f2f0e6').rect(6, 4, 20, 2, '#b8b6c8'); for (let i = 0; i < 5; i++) p.hline(8, 9 + i * 3, 14, '#b8b6c8');
    p.line(9, 12, 13, 10, '#e0485e').line(18, 10, 22, 12, '#e0485e'); p.disc(11, 14, 1, '#e0485e').disc(20, 14, 1, '#e0485e');
    p.line(10, 21, 22, 20, '#e0485e').line(10, 22, 22, 21, '#e0485e'); p.line(24, 26, 30, 30, '#e0485e');
    p.ellipse(16, 30, 9, 1, 'rgba(224,72,94,0.3)');
  }],
  overdue: [32, 32, (p) => {
    p.rect(3, 12, 26, 3, '#7a4e32').rect(3, 21, 26, 3, '#7a4e32').vline(3, 10, 16, '#4a2e22').vline(28, 10, 16, '#4a2e22');
    const cs = ['#9e2a3c', '#24376e', '#2f7a46', '#d9a53a', '#4e2c78'];
    for (let i = 0; i < 8; i++) { p.rect(5 + i * 3, 4 + (i % 3), 3, 8 - (i % 3), cs[i % 5]); p.rect(5 + i * 3, 15 + (i % 2), 3, 6 - (i % 2), cs[(i + 2) % 5]); }
    p.disc(7, 28, 3, '#2e2c40').disc(25, 28, 3, '#2e2c40').px(7, 28, '#7a7890').px(25, 28, '#7a7890');
    p.rect(11, 7, 2, 2, '#ffe08a').rect(19, 7, 2, 2, '#ffe08a');
  }],
  inkblot: [32, 32, (p) => {
    const r = rng(77);
    for (let i = 0; i < 26; i++) p.disc(4 + Math.floor(r() * 12), 4 + Math.floor(r() * 24), 1 + Math.floor(r() * 4), '#1c1a2b');
    mirror(p, 32);
    p.rect(10, 12, 3, 4, '#e0485e').rect(19, 12, 3, 4, '#e0485e');
  }],
  chapter: [28, 24, (p) => {
    p.rect(2, 5, 12, 16, '#f2f0e6').rect(14, 5, 12, 16, '#f2f0e6').vline(14, 5, 16, '#7a7890').rect(2, 20, 24, 2, '#7a4e32');
    for (let i = 0; i < 4; i++) { p.hline(4, 8 + i * 3, 8, '#b8b6c8'); p.hline(16, 8 + i * 3, 8, '#b8b6c8'); }
    p.rect(6, 10, 2, 3, '#0d0b14').rect(19, 10, 2, 3, '#0d0b14');
  }],
  thesis: [64, 64, (p) => {
    for (let i = 0; i < 12; i++) { p.rect(10 + (i % 3), 12 + i * 4, 44, 4, i % 2 ? '#f2f0e6' : '#dcdace'); p.hline(10 + (i % 3), 15 + i * 4, 44, '#b8b6c8'); }
    p.rect(8, 6, 48, 7, '#4a2e22').rect(8, 6, 48, 2, '#7a4e32'); p.rect(26, 7, 12, 4, '#dcb07a');
    p.rect(20, 24, 8, 8, '#0d0b14').rect(36, 24, 8, 8, '#0d0b14').rect(22, 26, 3, 3, '#e0485e').rect(38, 26, 3, 3, '#e0485e');
    p.rect(22, 42, 20, 3, '#0d0b14');
    [[4, 10], [58, 18], [2, 40], [60, 46]].forEach(([x, y], i) => { p.rect(x - 2, y - 3, 5, 6, '#f2f0e6'); p.hline(x - 1, y - 1, 3, '#b8b6c8'); });
    p.rect(8, 60, 50, 3, '#4a2e22');
  }],

  steamhound: [32, 32, (p) => {
    p.rect(7, 13, 16, 8, '#6a5e48').rect(7, 13, 16, 2, '#8a7a58'); p.rect(20, 8, 9, 8, '#6a5e48').rect(27, 12, 4, 3, '#3a3428');
    p.rect(8, 21, 3, 8, '#3a3428').rect(19, 21, 3, 8, '#3a3428').rect(7, 28, 5, 2, '#8a7a58').rect(18, 28, 5, 2, '#8a7a58');
    p.disc(13, 17, 2, '#d9a53a').rect(22, 10, 2, 2, '#e0485e');
    p.line(7, 14, 2, 8, '#6a5e48'); p.disc(4, 5, 3, '#f2f0e6').disc(8, 3, 2, '#f2f0e6').disc(25, 4, 2, '#f2f0e6');
  }],
  cablerat: [32, 32, (p) => {
    p.ellipse(14, 20, 9, 6, '#4a74d6'); p.ellipse(13, 19, 7, 4, '#8fb0ff');
    p.ellipse(24, 17, 5, 4, '#4a74d6'); p.disc(21, 12, 2, '#8fb0ff'); p.rect(25, 15, 2, 2, '#e0485e'); p.px(29, 18, '#f2f0e6');
    p.line(5, 21, 1, 14, '#4a74d6').line(1, 14, 4, 8, '#4a74d6'); p.rect(2, 4, 5, 5, '#b8b6c8').rect(3, 5, 3, 1, '#ffe08a');
    p.rect(9, 25, 2, 4, '#24376e').rect(18, 25, 2, 4, '#24376e');
  }],
  pipemimic: [32, 32, (p) => {
    p.rect(2, 10, 28, 12, '#6a5e48').rect(2, 10, 28, 3, '#8a7a58').rect(12, 2, 10, 28, '#6a5e48').rect(12, 2, 3, 28, '#8a7a58');
    p.rect(10, 9, 14, 14, '#3a3428'); p.rect(11, 12, 12, 7, '#0d0b14');
    for (let i = 0; i < 4; i++) { p.px(12 + i * 3, 12, '#f2f0e6').px(13 + i * 3, 18, '#f2f0e6'); }
    p.rect(13, 10, 2, 1, '#e0485e').rect(19, 10, 2, 1, '#e0485e'); p.disc(26, 5, 2, '#d9a53a');
  }],
  pingbat: [32, 32, (p) => {
    p.ellipse(16, 16, 4, 6, '#2e2c40'); p.rect(14, 13, 1, 2, '#e0485e').rect(17, 13, 1, 2, '#e0485e');
    for (let i = 0; i < 12; i++) { p.vline(12 - i, 12 + Math.floor(i / 3), 6 - Math.floor(i / 3), '#4a4860'); p.vline(20 + i, 12 + Math.floor(i / 3), 6 - Math.floor(i / 3), '#4a4860'); }
    p.line(13, 10, 12, 6, '#2e2c40').line(18, 10, 19, 6, '#2e2c40');
    for (let r = 4; r < 13; r += 4) for (let a = -0.6; a < 0.6; a += 0.1) p.px(16 + Math.round(Math.sin(a) * r), 22 + Math.round(Math.cos(a) * r), '#5ee0e8');
  }],
  hydra: [64, 64, (p) => {
    p.rect(6, 30, 52, 22, '#1c1a2b').rect(6, 30, 52, 3, '#4a4860').rect(6, 50, 52, 3, '#0d0b14');
    for (let i = 0; i < 8; i++) p.rect(10 + i * 6, 38, 4, 3, i % 3 ? '#5cc070' : '#ffe08a');
    for (let i = 0; i < 6; i++) p.rect(12 + i * 7, 44, 5, 4, '#0d0b14');
    [[10, 4], [30, 0], [50, 4]].forEach(([x, y]) => { p.rect(x, y + 2, 3, 28 - y, '#2e2c40'); p.disc(x + 1, y + 2, 2, '#e0485e'); });
    p.rect(26, 34, 12, 2, '#5ee0e8');
  }],
  port: [32, 32, (p) => {
    p.rect(4, 14, 10, 6, '#4a74d6').rect(4, 20, 6, 10, '#4a74d6');
    p.rect(12, 6, 16, 16, '#d8d6e8').rect(12, 6, 16, 3, '#f2f0e6'); for (let i = 0; i < 6; i++) p.rect(14 + i * 2, 17, 1, 4, '#d9a53a');
    p.rect(16, 10, 3, 3, '#e0485e').rect(22, 10, 3, 3, '#e0485e'); p.rect(18, 22, 6, 3, '#4a74d6');
  }],

  punchgolem: [32, 32, (p) => {
    for (let i = 0; i < 6; i++) { p.rect(8, 6 + i * 4, 16, 3, '#dcb07a'); for (let h = 0; h < 5; h++) if ((h + i) % 2) p.px(10 + h * 3, 7 + i * 4, '#4a2e22'); }
    p.rect(2, 10, 6, 12, '#dcb07a').rect(24, 10, 6, 12, '#dcb07a'); p.rect(9, 30, 5, 2, '#b07a4a').rect(18, 30, 5, 2, '#b07a4a');
    p.rect(11, 2, 10, 5, '#dcb07a').rect(13, 4, 2, 2, '#e0485e').rect(17, 4, 2, 2, '#e0485e');
  }],
  tapereel: [32, 32, (p) => {
    p.disc(9, 14, 8, '#2e2c40').disc(9, 14, 6, '#4a4860').disc(9, 14, 2, '#b8b6c8');
    p.disc(23, 14, 8, '#2e2c40').disc(23, 14, 6, '#4a4860').disc(23, 14, 2, '#b8b6c8');
    p.line(9, 22, 23, 22, '#7a4e32').line(1, 14, 1, 28, '#7a4e32').line(1, 28, 31, 28, '#7a4e32');
    p.px(8, 13, '#e0485e').px(22, 13, '#e0485e');
  }],
  tubewisp: [32, 32, (p) => {
    p.disc(16, 14, 11, 'rgba(240,138,60,0.18)'); p.ellipse(16, 13, 7, 10, '#b8f6f8'); p.ellipse(16, 13, 6, 9, 'rgba(200,240,255,0.6)');
    p.rect(13, 8, 6, 10, '#f08a3c').rect(14, 9, 4, 8, '#ffe08a'); p.rect(10, 22, 12, 5, '#2e2c40'); for (let i = 0; i < 4; i++) p.vline(12 + i * 3, 27, 3, '#b8b6c8');
    p.px(14, 12, '#9e2a3c').px(17, 12, '#9e2a3c');
  }],
  nullptr: [32, 32, (p) => {
    p.ellipse(13, 15, 8, 12, '#0d0b14'); p.ellipse(13, 15, 7, 11, '#1c1a2b');
    p.rect(9, 10, 2, 2, '#f2f0e6').rect(15, 10, 2, 2, '#f2f0e6');
    p.hline(20, 15, 8, '#f2f0e6').line(27, 15, 24, 12, '#f2f0e6').line(27, 15, 24, 18, '#f2f0e6');
    p.frame(27, 11, 4, 9, '#7a7890');
  }],
  minima: [64, 64, (p) => {
    const nodes = [[8, 12], [8, 32], [8, 52], [56, 12], [56, 32], [56, 52], [32, 4], [32, 60]];
    nodes.forEach(([x, y]) => { p.line(x, y, 32, 32, 'rgba(154,90,216,0.6)'); });
    nodes.forEach(([x, y]) => { p.disc(x, y, 3, '#4e2c78'); p.disc(x, y, 2, '#9a5ad8'); p.px(x, y, '#f2f0e6'); });
    for (let y = -16; y <= 16; y++) { const w = 16 - Math.abs(y); p.hline(32 - w, 32 + y, w * 2 + 1, Math.abs(y) > 12 ? '#4e2c78' : '#2a1040'); }
    p.ellipse(32, 32, 10, 6, '#f2f0e6'); p.disc(32, 32, 5, '#e0485e'); p.disc(32, 32, 2, '#0d0b14'); p.px(30, 30, '#ffffff');
    for (let y = -16; y <= 16; y++) { const w = 16 - Math.abs(y); p.px(32 - w, 32 + y, '#d4a0ff').px(32 + w, 32 + y, '#d4a0ff'); }
  }],
  missing: [32, 32, (p) => { for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) p.rect(4 + x * 6, 4 + y * 6, 6, 6, (x + y) % 2 ? '#0d0b14' : '#ff00ff'); p.rect(10, 12, 3, 3, '#ffffff').rect(19, 12, 3, 3, '#ffffff'); }],
  segfault: [32, 32, (p) => {
    p.disc(16, 13, 10, '#b8b6c8'); p.rect(10, 20, 12, 8, '#b8b6c8'); p.rect(10, 10, 5, 5, '#0d0b14').rect(18, 10, 5, 5, '#0d0b14');
    p.px(12, 12, '#e0485e').px(20, 12, '#e0485e'); for (let i = 0; i < 4; i++) p.vline(12 + i * 3, 23, 4, '#0d0b14');
    p.line(16, 3, 13, 9, '#0d0b14').line(13, 9, 17, 13, '#0d0b14').line(17, 13, 15, 18, '#0d0b14');
  }],
  ventner: [64, 64, (p) => {
    p.rect(4, 4, 56, 48, '#b8b6c8').rect(4, 4, 56, 3, '#f2f0e6').rect(8, 9, 48, 36, '#0d0b14').rect(9, 10, 46, 34, '#0a1a10');
    const g = '#5cc070', G = '#a6e07a';
    p.ellipse(32, 25, 11, 12, g); p.ellipse(32, 23, 10, 10, '#0a1a10'); p.ellipse(32, 24, 9, 11, '#0f2a18');
    p.frame(23, 21, 7, 5, G).frame(34, 21, 7, 5, G).hline(30, 23, 4, G); p.px(26, 23, G).px(37, 23, G);
    p.rect(26, 31, 12, 9, g); p.hline(28, 33, 8, '#0a1a10'); for (let y = 10; y < 44; y += 2) p.hline(9, y, 46, 'rgba(0,0,0,0.35)');
    p.rect(20, 52, 24, 6, '#7a7890').rect(10, 58, 44, 5, '#4a4860');
  }],
};

export function buildBattlers(scene) {
  for (const [key, [w, h, fn]] of Object.entries(D)) {
    const p = new Pix(w + 2, h + 2);
    const inner = new Pix(w, h);
    fn(inner);
    p.copyFrom(inner, 0, 0, w, h, 1, 1);
    p.outline('#0d0b14');
    addTexture(scene, 'bt_' + key, p);
  }
}
