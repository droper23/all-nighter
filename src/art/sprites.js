// Overworld sprites: player, NPCs (recolors), map objects, roaming Glitches.
import { Pix, addTexture } from './pix.js';

const HEAD_DOWN = [
  '......eeee......', '.....eeeeee.....', '....eeeeeeee....', '....esssssse....',
  '....skssssks....', '....ssssssss....', '.....ssSSss.....', '...TTTTTTTTTT...',
  '..TTTtTTTTtTTT..', '..sTTTTTTTTTTs..', '...TTTTTTTTTT...',
];
const HEAD_UP = [
  '......eeee......', '.....eeeeee.....', '....eeeeeeee....', '....eeeeeeee....',
  '....eeeeeeee....', '....seeeeees....', '.....ssssss.....', '...TTOOOOOOTT...',
  '..TTOOooooOOTT..', '..sTOOOOOOOOTs..', '...TTOOOOOOTT...',
];
const HEAD_SIDE = [
  '.....eeeee......', '....eeeeeee.....', '...eeeeeeeee....', '...eeeessssse...',
  '...eeessssks....', '...eeesssssss...', '....eessssss....', '....OOTTTTTT....',
  '...OOOTTTTTT....', '...OOOTTsTTT....', '....OOTTTTTT....',
];
const LEGS_FRONT = [
  ['....bbbbbbbb....', '....bbb..bbb....', '....bbb..bbb....', '....www..www....', '................'],
  ['....bbbbbbbb....', '....bbb..bbb....', '....www..bbb....', '.........www....', '................'],
  ['....bbbbbbbb....', '....bbb..bbb....', '....bbb..www....', '....www.........', '................'],
];
const LEGS_SIDE = [
  ['.....bbbbbb.....', '.....bbbbbb.....', '.....bb..bb.....', '.....ww..www....', '................'],
  ['.....bbbbbb.....', '....bbb..bbb....', '...bbb....bbb...', '...ww......www..', '................'],
  ['.....bbbbbb.....', '.....bbbbb......', '......bbbb......', '......wwww......', '................'],
];

export const LOOKS = {
  jules:   { e: '#3a2418', s: '#c8906a', S: '#8a5a3e', k: '#0d0b14', T: '#2f9aa8', t: '#1f5f6a', O: '#f08a3c', o: '#c25a1e', b: '#24376e', w: '#f2f0e6' },
  okafor:  { e: '#b8b6c8', s: '#8a5a3e', S: '#5a3626', k: '#0d0b14', T: '#4a74d6', t: '#24376e', O: '#4a74d6', o: '#24376e', b: '#2e2c40', w: '#0d0b14' },
  priya:   { e: '#0d0b14', s: '#c8906a', S: '#8a5a3e', k: '#0d0b14', T: '#9a5ad8', t: '#4e2c78', O: '#9a5ad8', o: '#4e2c78', b: '#1c1a2b', w: '#e0485e' },
  student1:{ e: '#d9a53a', s: '#f2c8a0', S: '#c8906a', k: '#5ee0e8', T: '#e0485e', t: '#9e2a3c', O: '#e0485e', o: '#9e2a3c', b: '#4a4860', w: '#f2f0e6' },
  student2:{ e: '#4a2e22', s: '#8a5a3e', S: '#5a3626', k: '#5ee0e8', T: '#5cc070', t: '#2f7a46', O: '#5cc070', o: '#2f7a46', b: '#24376e', w: '#0d0b14' },
  student3:{ e: '#0d0b14', s: '#dcb07a', S: '#b07a4a', k: '#5ee0e8', T: '#d9a53a', t: '#7a4e32', O: '#d9a53a', o: '#7a4e32', b: '#2e2c40', w: '#f2f0e6' },
  student4:{ e: '#9e2a3c', s: '#f2c8a0', S: '#c8906a', k: '#5ee0e8', T: '#4e2c78', t: '#2e2c40', O: '#4e2c78', o: '#2e2c40', b: '#4a74d6', w: '#b8b6c8' },
  student5:{ e: '#5a3626', s: '#b07a4a', S: '#7a4e32', k: '#5ee0e8', T: '#b8b6c8', t: '#7a7890', O: '#7a7890', o: '#4a4860', b: '#0d0b14', w: '#f2f0e6' },
  guard:   { e: '#2e2c40', s: '#c8906a', S: '#8a5a3e', k: '#5ee0e8', T: '#24376e', t: '#0d0b14', O: '#24376e', o: '#0d0b14', b: '#1c1a2b', w: '#0d0b14' },
  ghost:   { e: '#b8f6f8', s: '#5ee0e8', S: '#2f9aa8', k: '#ffffff', T: '#2f9aa8', t: '#1f5f6a', O: '#2f9aa8', o: '#1f5f6a', b: '#1f5f6a', w: '#2f9aa8' },
};

function person(look) {
  // 9 frames: down0..2, up0..2, side0..2
  const p = new Pix(16 * 9, 16);
  const sets = [[HEAD_DOWN, LEGS_FRONT], [HEAD_UP, LEGS_FRONT], [HEAD_SIDE, LEGS_SIDE]];
  sets.forEach(([head, legs], d) => {
    for (let f = 0; f < 3; f++) {
      const ox = (d * 3 + f) * 16;
      const bob = f === 0 ? 0 : 0;
      p.grid(ox, bob, head.concat(legs[f]).slice(0, 15), look);
      p.outline('#0d0b14', ox, 0, 16, 16);
    }
  });
  return p;
}

function anims(scene, key) {
  const mk = (name, frames, rate = 8) => scene.anims.create({ key: `${key}_${name}`, frames: frames.map(f => ({ key, frame: f })), frameRate: rate, repeat: -1 });
  mk('down', [1, 0, 2, 0]); mk('up', [4, 3, 5, 3]); mk('side', [7, 6, 8, 6]);
  mk('idle_down', [0], 1); mk('idle_up', [3], 1); mk('idle_side', [6], 1);
}

// Roaming Glitch on the map (2-frame bob), recolored per sector.
function glitchBlob(c1, c2, eye) {
  const p = new Pix(32, 16);
  for (let f = 0; f < 2; f++) {
    const ox = f * 16, dy = f;
    p.ellipse(ox + 8, 9 + dy, 6, 5 - dy, c1);
    p.rect(ox + 3, 6 + dy, 3, 2, c2).rect(ox + 10, 4 + dy, 2, 3, c2);
    p.rect(ox + 5, 8, 2, 2, eye).rect(ox + 10, 8, 2, 2, eye);
    p.hline(ox + 3, 14, 10, 'rgba(0,0,0,0)');
    for (let i = 0; i < 3; i++) p.px(ox + 4 + i * 4 + f, 14 - (i % 2), c1);
    p.px(ox + 1 + f * 12, 3, eye).px(ox + 14 - f * 11, 12, c2);
    p.outline('#0d0b14', ox, 0, 16, 16);
  }
  return p;
}

export function buildSprites(scene) {
  for (const [name, look] of Object.entries(LOOKS)) {
    addTexture(scene, 'pp_' + name, person(look), 16, 16);
    anims(scene, 'pp_' + name);
  }

  const blobs = {
    blob_lobby: ['#f08a3c', '#ffe08a', '#0d0b14'], blob_labs: ['#5cc070', '#a6e07a', '#0d0b14'],
    blob_servers: ['#4a74d6', '#8fb0ff', '#f2f0e6'], blob_archive: ['#b07a4a', '#f2f0e6', '#9e2a3c'],
    blob_tunnels: ['#8a7a58', '#d9a53a', '#e0485e'], blob_core: ['#9a5ad8', '#e0485e', '#f2f0e6'],
    blob_void: ['#f2f0e6', '#7a7890', '#0d0b14'], blob_boss: ['#e0485e', '#ffe08a', '#f2f0e6'],
  };
  for (const [k, c] of Object.entries(blobs)) {
    addTexture(scene, k, glitchBlob(...c), 16, 16);
    scene.anims.create({ key: k + '_bob', frames: [{ key: k, frame: 0 }, { key: k, frame: 1 }], frameRate: 3, repeat: -1 });
  }

  // Outlet (save point): wall plate with glowing sockets, 2 frames.
  let p = new Pix(32, 16);
  for (let f = 0; f < 2; f++) {
    const ox = f * 16, glow = f ? '#b8f6f8' : '#5ee0e8';
    p.rect(ox + 3, 1, 10, 14, '#f2f0e6').rect(ox + 4, 2, 8, 12, '#b8b6c8');
    p.rect(ox + 6, 4, 1, 2, '#0d0b14').rect(ox + 9, 4, 1, 2, '#0d0b14').rect(ox + 7, 6, 2, 1, '#0d0b14');
    p.rect(ox + 6, 9, 1, 2, '#0d0b14').rect(ox + 9, 9, 1, 2, '#0d0b14').rect(ox + 7, 11, 2, 1, '#0d0b14');
    p.px(ox + 7, 2, glow).px(ox + 8, 2, glow).px(ox + 7, 13, glow).px(ox + 8, 13, glow);
    p.outline(glow, ox, 0, 16, 16);
  }
  addTexture(scene, 'outlet', p, 16, 16);
  scene.anims.create({ key: 'outlet_glow', frames: [{ key: 'outlet', frame: 0 }, { key: 'outlet', frame: 1 }], frameRate: 2, repeat: -1 });

  // Supply box (chest): closed / open.
  p = new Pix(32, 16);
  [0, 1].forEach(f => {
    const ox = f * 16;
    p.rect(ox + 2, 5, 12, 10, '#b07a4a').hline(ox + 2, 9, 12, '#7a4e32').vline(ox + 7, 5, 10, '#dcb07a').vline(ox + 8, 5, 10, '#dcb07a');
    if (!f) p.rect(ox + 1, 3, 14, 3, '#dcb07a').rect(ox + 6, 3, 4, 3, '#f2f0e6');
    else { p.rect(ox + 2, 5, 12, 2, '#4a2e22'); p.line(ox + 1, 4, ox + 4, 1, '#dcb07a').line(ox + 14, 4, ox + 11, 1, '#dcb07a'); }
    p.outline('#0d0b14', ox, 0, 16, 16);
  });
  addTexture(scene, 'box', p, 16, 16);

  // Pickups: sticky note, flash drive, tool, keycard, heart (vital).
  p = new Pix(16 * 7, 16);
  p.rect(4, 4, 8, 8, '#ffe08a').rect(4, 4, 8, 2, '#d9a53a').hline(5, 8, 5, '#7a7890').hline(5, 10, 4, '#7a7890'); p.outline('#0d0b14', 0, 0, 16, 16);
  p.rect(16 + 5, 3, 6, 9, '#4a74d6').rect(16 + 6, 12, 4, 3, '#b8b6c8').px(16 + 7, 13, '#0d0b14').px(16 + 8, 13, '#0d0b14').px(16 + 7, 5, '#5ee0e8'); p.outline('#0d0b14', 16, 0, 16, 16);
  p.rect(32 + 3, 5, 10, 7, '#d9a53a').rect(32 + 4, 6, 8, 5, '#ffe08a').rect(32 + 7, 2, 2, 3, '#b8b6c8').rect(32 + 5, 12, 6, 2, '#7a4e32'); p.outline('#0d0b14', 32, 0, 16, 16);
  p.rect(48 + 3, 4, 10, 8, '#f2f0e6').rect(48 + 4, 5, 3, 3, '#4a74d6').hline(48 + 8, 6, 4, '#7a7890').hline(48 + 8, 8, 3, '#7a7890').hline(48 + 4, 10, 8, '#5cc070'); p.outline('#0d0b14', 48, 0, 16, 16);
  p.disc(64 + 8, 8, 4, '#e0485e').disc(64 + 7, 7, 1, '#ffe08a'); p.outline('#0d0b14', 64, 0, 16, 16);
  p.rect(80 + 4, 3, 8, 10, '#2e2c40').rect(80 + 5, 4, 6, 5, '#5ee0e8').rect(80 + 6, 10, 4, 2, '#e0485e'); p.outline('#0d0b14', 80, 0, 16, 16);
  // tiny calibration boat (Benchy)
  p.rect(96 + 3, 10, 10, 3, '#e0485e').rect(96 + 4, 13, 8, 1, '#9e2a3c').rect(96 + 6, 6, 4, 4, '#e0485e').rect(96 + 7, 7, 2, 2, '#0d0b14').rect(96 + 9, 3, 1, 3, '#e0485e').px(96 + 12, 9, '#e0485e'); p.outline('#0d0b14', 96, 0, 16, 16);
  addTexture(scene, 'pickups', p, 16, 16);

  // Doors (keycard colors), each closed 16x16.
  const doorCols = { student: '#5cc070', ta: '#4a74d6', staff: '#f08a3c', faculty: '#9a5ad8', root: '#e0485e', plain: '#7a7890' };
  p = new Pix(16 * 6, 16);
  Object.values(doorCols).forEach((c, i) => {
    const ox = i * 16;
    p.rect(ox, 0, 16, 16, '#2e2c40').rect(ox + 1, 1, 14, 15, '#7a7890').rect(ox + 2, 2, 12, 14, '#4a4860');
    p.vline(ox + 7, 2, 14, '#2e2c40').vline(ox + 8, 2, 14, '#7a7890');
    p.rect(ox + 11, 6, 3, 5, '#1c1a2b').rect(ox + 12, 7, 1, 2, c).rect(ox + 2, 2, 12, 2, c);
  });
  addTexture(scene, 'doors', p, 16, 16);

  // Heavy crate (pushable), valve, broken-wire spot, terminal (Ventner).
  p = new Pix(64, 16);
  p.rect(1, 1, 14, 14, '#4a4860').frame(1, 1, 14, 14, '#7a7890').rect(4, 4, 8, 8, '#2e2c40').hline(4, 7, 8, '#f08a3c').hline(4, 9, 8, '#0d0b14'); p.outline('#0d0b14', 0, 0, 16, 16);
  p.rect(16 + 7, 6, 2, 9, '#7a7890').disc(16 + 8, 6, 5, '#9e2a3c').disc(16 + 8, 6, 2, '#e0485e').px(16 + 8, 6, '#ffe08a'); p.outline('#0d0b14', 16, 0, 16, 16);
  p.rect(32 + 2, 3, 12, 11, '#1c1a2b').rect(32 + 3, 4, 10, 7, '#0f2a20').hline(32 + 4, 6, 6, '#5cc070').hline(32 + 4, 8, 4, '#5cc070').px(32 + 9, 8, '#a6e07a').rect(32 + 4, 12, 8, 2, '#4a4860'); p.outline('#0d0b14', 32, 0, 16, 16);
  p.rect(48 + 1, 1, 14, 14, '#2e2c40').frame(48 + 1, 1, 14, 14, '#4a4860'); for (let i = 0; i < 6; i++) p.px(48 + 3 + i * 2, 7, i % 2 ? '#e0485e' : '#ffe08a'); p.rect(48 + 3, 10, 10, 3, '#7a7890');
  addTexture(scene, 'props', p, 16, 16);

  // FX: swing arc, sleep z, exclamation, sparkle.
  p = new Pix(64, 16);
  for (let a = -1.2; a <= 1.2; a += 0.05) { p.px(8 + Math.round(Math.cos(a) * 6), 8 + Math.round(Math.sin(a) * 6), '#f2f0e6'); p.px(8 + Math.round(Math.cos(a) * 5), 8 + Math.round(Math.sin(a) * 5), '#5ee0e8'); }
  p.grid(16 + 4, 3, ['zzzz', '...z', '..z.', '.z..', 'zzzz'], { z: '#b8f6f8' });
  p.rect(32 + 6, 1, 4, 9, '#ffe08a').rect(32 + 6, 12, 4, 3, '#ffe08a'); p.outline('#0d0b14', 32, 0, 16, 16);
  p.vline(48 + 8, 3, 11, '#ffffff').hline(48 + 3, 8, 11, '#ffffff').px(48 + 8, 8, '#ffe08a'); 
  addTexture(scene, 'fx', p, 16, 16);
}
