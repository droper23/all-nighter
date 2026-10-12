import { PARTS, PERK_IDS, perkCount } from './parts.js';
import { LOOT } from './enemies.js';

// Night Specials: three perk-rolled parts that restock with progress (every 6 wins and after each boss), never with real time.
const SECTOR_ORDER = ['lobby', 'labs', 'servers', 'archive', 'tunnels', 'core', 'void'];
const SPECIAL_EVERY = 6;
export function specials(s) {
  const bosses = Object.keys(s.bosses || {}).length;
  const rot = `${bosses}-${Math.floor((s.stats.wins || 0) / SPECIAL_EVERY)}`;
  let h = 2166136261; for (const ch of rot + (s.created || 0)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  const rnd = () => { h = (h + 0x6D2B79F5) >>> 0; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const reach = Math.min(SECTOR_ORDER.length - 1, Math.max(0, s.hour - 2) + (s.flags.postgame ? 1 : 0));
  const pool = [...new Set(SECTOR_ORDER.slice(Math.max(0, reach - 1), reach + 1).flatMap(k => LOOT[k].parts))];
  const out = [];
  for (let i = 0; i < 3 && pool.length; i++) {
    const id = pool.splice(Math.floor(rnd() * pool.length), 1)[0], b = PARTS[id];
    const perks = [], free = PERK_IDS.slice();
    for (let n = 0; n < Math.min(3, perkCount(b.tier) + 1); n++) perks.push(free.splice(Math.floor(rnd() * free.length), 1)[0]);
    out.push({ special: true, key: `spec_${rot}_${i}`, part: id, perks, price: Math.round(25 * Math.pow(b.tier + 1, 2) * (1 + 0.3 * perks.length)) });
  }
  return { list: out, left: SPECIAL_EVERY - ((s.stats.wins || 0) % SPECIAL_EVERY) };
}
