// Animated room details and sector lighting, layered over the tilemap. All procedural.
import { T } from '../art/tiles.js';

const LIGHT = {
  lobby: { tint: 0x3a1a50, alpha: 0.10 }, labs: { tint: 0x0a4048, alpha: 0.10 }, servers: { tint: 0x0a1850, alpha: 0.16 },
  archive: { tint: 0x5a3010, alpha: 0.14 }, tunnels: { tint: 0x2a1a08, alpha: 0.22 }, core: { tint: 0x40082a, alpha: 0.16 }, void: { tint: 0x000000, alpha: 0.2 },
};
const MAX_FX = 60;

export function addRoomDetails(sc) {
  const th = sc.room.theme, grid = sc.grid, rnd = seeded(hash(sc.room.name));
  const fx = []; const add = (o) => { fx.push(o); return o; };
  const each = (chars, fn, chance = 1) => {
    for (let y = 0; y < sc.gh; y++) for (let x = 0; x < sc.gw; x++) {
      if (fx.length >= MAX_FX) return;
      if (chars.includes(grid[y][x]) && rnd() < chance) fn(x * T, y * T, x, y);
    }
  };
  const blink = (o, min, max, lo = 0.15) => sc.time.addEvent({ delay: min + rnd() * (max - min), loop: true, callback: () => o.setAlpha(o.alpha > 0.5 ? lo : 1) });

  // Monitors on desks flicker; status screens scroll.
  each('T', (x, y) => { const s = add(sc.add.rectangle(x + 4 + Math.floor(rnd() * 6), y + 3, 4, 3, th === 'lobby' ? 0x9a5ad8 : 0x5ee0e8, 0.8).setDepth(y + 2)); blink(s, 200, 1600, 0.35); }, 0.5);
  each('Y', (x, y) => { const s = add(sc.add.rectangle(x + 4, y + 6, 8, 1, 0x5cc070, 0.9).setDepth(y + 2)); sc.tweens.add({ targets: s, y: y + 11, duration: 900 + rnd() * 600, repeat: -1 }); });
  // Server racks blink LEDs.
  each('S', (x, y) => {
    for (let i = 0; i < 2; i++) {
      const c = [0x5cc070, 0xffe08a, 0x4a74d6, 0xe0485e][Math.floor(rnd() * (th === 'core' ? 4 : 3))];
      const d = add(sc.add.rectangle(x + 3 + Math.floor(rnd() * 10), y + 3 + Math.floor(rnd() * 10), 1, 1, c).setDepth(y + 2));
      blink(d, 120, 900);
    }
  }, 0.3);
  // Oscilloscopes trace a moving dot; 3D printers move their heads.
  each('o', (x, y) => { const d = add(sc.add.rectangle(x + 4, y + 6, 1, 1, 0x5cc070).setDepth(y + 2)); sc.tweens.add({ targets: d, x: x + 11, duration: 700, repeat: -1, onUpdate: () => { d.y = y + 6 + Math.round(Math.sin(d.x * 0.9) * 2); } }); }, 0.6);
  each('a', (x, y) => { const h = add(sc.add.rectangle(x + 4, y + 5, 3, 2, 0xf08a3c).setDepth(y + 2)); sc.tweens.add({ targets: h, x: x + 12, duration: 500 + rnd() * 400, yoyo: true, repeat: -1, ease: 'sine.inOut' }); }, 0.7);
  // Cold air from floor vents, steam from leaks and coffee machines.
  const puff = (x, y, col, rise, dur) => {
    const p = add(sc.add.circle(x, y, 2, col, 0.5).setDepth(y + 20));
    sc.tweens.add({ targets: p, y: y - rise, alpha: 0, scale: 2.5, duration: dur, repeat: -1, delay: rnd() * dur });
  };
  if (th === 'servers') each(':', (x, y) => puff(x + 4 + rnd() * 8, y + 10, 0xb8f6f8, 14, 1600), 0.25);
  each('&', (x, y) => { puff(x + 6, y + 6, 0xf2f0e6, 18, 900); puff(x + 10, y + 8, 0xf2f0e6, 22, 1100); });
  each('k', (x, y) => puff(x + 8, y + 2, 0xf2f0e6, 10, 1800), 0.4);
  // Warm reading lamps glow; violet static shimmers.
  each('t', (x, y) => { if (th !== 'archive' && th !== 'lobby') return; const g = add(sc.add.circle(x + 8, y + 6, 10, 0xffd080, 0.1).setDepth(y + 1).setBlendMode('ADD')); sc.tweens.add({ targets: g, alpha: 0.2, duration: 1200 + rnd() * 800, yoyo: true, repeat: -1 }); }, 0.6);
  each('X', (x, y) => { const s = add(sc.add.rectangle(x + rnd() * 14, y + rnd() * 14, 2, 1, 0xd4a0ff, 0.9).setDepth(9000)); blink(s, 80, 400, 0); }, 0.6);
  // Tunnels drip; the basement pulses.
  if (th === 'tunnels') sc.time.addEvent({ delay: 700, loop: true, callback: () => {
    const x = Math.floor(rnd() * sc.gw), y = Math.floor(rnd() * sc.gh);
    if (!grid[y] || grid[y][x] !== '.') return;
    const d = sc.add.rectangle(x * T + 8, y * T, 1, 2, 0x8fb0ff, 0.8).setDepth(9000);
    sc.tweens.add({ targets: d, y: y * T + 12, duration: 350, ease: 'quad.in', onComplete: () => { d.destroy(); const r = sc.add.ellipse(x * T + 8, y * T + 12, 2, 1).setStrokeStyle(1, 0x8fb0ff, 0.6).setDepth(10); sc.tweens.add({ targets: r, scale: 4, alpha: 0, duration: 400, onComplete: () => r.destroy() }); } });
  } });

  // Sector lighting: a color grade plus, in the basement, a slow pulse.
  const L = LIGHT[th] || LIGHT.lobby;
  const grade = sc.add.rectangle(0, 0, sc.scale.width, sc.scale.height, L.tint, L.alpha).setOrigin(0).setScrollFactor(0).setDepth(9300).setBlendMode('MULTIPLY');
  if (th === 'core' || sc.room.eerie) sc.tweens.add({ targets: grade, alpha: L.alpha + 0.08, duration: 1800, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  return fx;
}

function hash(str) { let h = 2166136261; for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; }
function seeded(a) { return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
