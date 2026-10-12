// 40x40 dialogue portraits, generated from a few face parameters.
import { Pix, addTexture } from './pix.js';

const FACES = {
  jules:   { skin: '#c8906a', shade: '#8a5a3e', hair: '#3a2418', hairHi: '#6a4430', style: 'curly', shirt: '#2f9aa8', shirt2: '#1f5f6a', eye: '#0d0b14', bg: '#1f3a48' },
  dex:     { skin: '#8a5a3e', shade: '#5a3626', hair: '#0d0b14', hairHi: '#2e2c40', style: 'cap', shirt: '#e0485e', shirt2: '#9e2a3c', eye: '#0d0b14', bg: '#3a1a28', cap: '#4a74d6' },
  okafor:  { skin: '#8a5a3e', shade: '#5a3626', hair: '#b8b6c8', hairHi: '#f2f0e6', style: 'wrap', shirt: '#4a74d6', shirt2: '#24376e', eye: '#0d0b14', bg: '#1c2848', wrap: '#f08a3c' },
  priya:   { skin: '#c8906a', shade: '#8a5a3e', hair: '#0d0b14', hairHi: '#2e2c40', style: 'long', shirt: '#9a5ad8', shirt2: '#4e2c78', eye: '#0d0b14', bg: '#2a1a40', glasses: true },
  gary:    { skin: '#f2c8a0', shade: '#c8906a', hair: '#7a4e32', hairHi: '#b07a4a', style: 'bald', shirt: '#4a4860', shirt2: '#2e2c40', eye: '#5ee0e8', bg: '#14182a', beard: '#7a4e32', glow: true },
  student: { skin: '#dcb07a', shade: '#b07a4a', hair: '#d9a53a', hairHi: '#ffe08a', style: 'short', shirt: '#5cc070', shirt2: '#2f7a46', eye: '#5ee0e8', bg: '#14182a', glow: true },
  ventner: { skin: '#0f2a18', shade: '#0a1a10', hair: '#5cc070', hairHi: '#a6e07a', style: 'bald', shirt: '#0f2a18', shirt2: '#0a1a10', eye: '#a6e07a', bg: '#020a04', glasses: true, beard: '#5cc070', crt: true },
};

function drawFace(p, f) {
  p.rect(0, 0, 40, 40, f.bg);
  for (let y = 0; y < 40; y += 3) p.hline(0, y, 40, 'rgba(255,255,255,0.03)');
  // shoulders
  p.ellipse(20, 40, 16, 7, f.shirt); p.ellipse(20, 41, 12, 4, f.shirt2); p.rect(17, 30, 6, 4, f.shade);
  // head
  p.ellipse(20, 20, 10, 12, f.skin); p.rect(10, 20, 3, 6, f.shade).rect(28, 22, 2, 4, f.shade);
  // hair
  if (f.style === 'curly') { for (let i = 0; i < 9; i++) p.disc(11 + i * 2.3, 9 + (i % 2) * 2, 4, f.hair); p.disc(10, 15, 3, f.hair).disc(30, 15, 3, f.hair); [[14, 7], [22, 6], [27, 9]].forEach(([x, y]) => p.px(x, y, f.hairHi)); }
  if (f.style === 'long') { p.ellipse(20, 12, 12, 8, f.hair); p.rect(8, 12, 4, 22, f.hair).rect(28, 12, 4, 22, f.hair); p.hline(13, 8, 8, f.hairHi); }
  if (f.style === 'short') { p.ellipse(20, 11, 11, 6, f.hair); p.rect(9, 11, 3, 6, f.hair).rect(28, 11, 3, 6, f.hair); p.hline(15, 7, 6, f.hairHi); }
  if (f.style === 'cap') { p.ellipse(20, 11, 11, 6, f.cap); p.rect(9, 12, 22, 3, f.cap).rect(20, 13, 14, 2, f.cap); p.px(20, 6, '#f2f0e6'); }
  if (f.style === 'wrap') { p.ellipse(20, 10, 12, 8, f.wrap); p.rect(8, 10, 24, 4, f.wrap); p.hline(10, 12, 20, '#ffe08a'); p.disc(30, 6, 3, f.wrap); }
  if (f.style === 'bald') { p.hline(14, 8, 12, 'rgba(255,255,255,0.15)'); p.rect(9, 16, 3, 6, f.hair).rect(28, 16, 3, 6, f.hair); }
  if (f.beard) { p.ellipse(20, 28, 8, 5, f.beard); p.rect(16, 26, 8, 1, f.skin); }
  // eyes, brows, nose, mouth
  p.rect(14, 19, 3, 3, f.eye).rect(23, 19, 3, 3, f.eye);
  if (f.glow) { p.px(14, 19, '#ffffff').px(23, 19, '#ffffff'); }
  else { p.px(15, 19, '#f2f0e6').px(24, 19, '#f2f0e6'); }
  p.hline(13, 16, 5, f.hair).hline(22, 16, 5, f.hair);
  p.vline(20, 21, 4, f.shade).px(19, 25, f.shade);
  p.hline(17, 28, 6, f.shade);
  if (f.glasses) { p.frame(12, 17, 7, 6, f.crt ? f.hairHi : '#2e2c40').frame(21, 17, 7, 6, f.crt ? f.hairHi : '#2e2c40').hline(19, 19, 2, f.crt ? f.hairHi : '#2e2c40'); }
  if (f.crt) for (let y = 0; y < 40; y += 2) p.hline(0, y, 40, 'rgba(0,0,0,0.3)');
}

function minimaFace(p) {
  p.rect(0, 0, 40, 40, '#0a0410');
  for (let y = -12; y <= 12; y++) { const w = 12 - Math.abs(y); p.hline(20 - w, 20 + y, w * 2 + 1, '#2a1040'); p.px(20 - w, 20 + y, '#d4a0ff').px(20 + w, 20 + y, '#d4a0ff'); }
  p.ellipse(20, 20, 7, 4, '#f2f0e6'); p.disc(20, 20, 3, '#e0485e'); p.disc(20, 20, 1, '#0d0b14'); p.px(19, 19, '#ffffff');
  [[4, 6], [36, 6], [4, 34], [36, 34]].forEach(([x, y]) => { p.line(x, y, 20, 20, 'rgba(154,90,216,0.4)'); p.disc(x, y, 2, '#9a5ad8'); });
}
function phoneFace(p) {
  p.rect(0, 0, 40, 40, '#14182a');
  p.rect(11, 3, 18, 34, '#2e2c40').rect(12, 6, 16, 26, '#4a74d6').rect(18, 4, 4, 1, '#0d0b14').disc(20, 34, 1, '#7a7890');
  p.rect(14, 9, 10, 4, '#f2f0e6').rect(16, 15, 10, 4, '#5cc070').rect(14, 21, 8, 4, '#f2f0e6');
}

export function buildPortraits(scene) {
  for (const [k, f] of Object.entries(FACES)) { const p = new Pix(40, 40); drawFace(p, f); addTexture(scene, 'pt_' + k, p); }
  let p = new Pix(40, 40); minimaFace(p); addTexture(scene, 'pt_minima', p);
  p = new Pix(40, 40); phoneFace(p); addTexture(scene, 'pt_phone', p);
}
