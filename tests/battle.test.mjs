// Balance sims. A "smart" player (reads intents, manages Heat, plays each boss's mechanic) and a
// "masher" (attack only) fight every boss with the gear actually available at that point.
// Seeded, so results are stable. Print the table with: node tools/sim.mjs
import test from 'node:test';
import assert from 'node:assert';
import { Battle } from '../src/battle/engine.js';
import { DIFFICULTY } from '../src/core/state.js';
import { ENEMIES } from '../src/data/enemies.js';
import { ROOMS } from '../src/data/rooms/index.js';
import { BOSSES, runBoss, smart, masher, setup, play, rng } from './sim.mjs';

const DIFF = process.env.DIFF || 'standard';
const results = {};
const get = (k, d = DIFF, policy = smart) => {
  const key = `${k}:${d}:${policy.name}`;
  return (results[key] = results[key] || runBoss(k, { diff: d, policy }));
};

const MAIN = Object.keys(BOSSES).filter(k => k !== 'void');
for (const k of MAIN) {
  test(`boss ${k} (${DIFF}): a careful player wins, mashing attack does not`, () => {
    const s = get(k), m = get(k, DIFF, masher);
    console.log(`  ${k.padEnd(10)} smart ${s.wins}/${s.n} (${s.turns.toFixed(0)} turns, ${Math.round(s.hpLeft * 100)}% HP left)  masher ${m.wins}/${m.n}`);
    if (DIFF === 'standard') {
      assert.ok(s.wins >= 24, `${k}: smart player should usually win on Standard (${s.wins}/30)`);
      assert.ok(s.turns >= 12, `${k}: fight is over too fast to use its mechanic (${s.turns.toFixed(1)} turns)`);
      assert.ok(m.wins <= s.wins - 10, `${k}: mashing attack wins too often (${m.wins}/30 vs ${s.wins}/30)`);
    }
  });
}

test('difficulties are ordered for every boss', () => {
  const order = ['pass', 'standard', 'honors', 'deans'];
  for (const k of MAIN) {
    const w = order.map(d => get(k, d).wins);
    for (let i = 1; i < w.length; i++) assert.ok(w[i] <= w[i - 1] + 2, `${k}: ${order[i]} (${w[i]}) easier than ${order[i - 1]} (${w[i - 1]})`);
    assert.equal(get(k, 'pass').wins, 30, `${k}: Pass/Fail must be a sure thing for a careful player`);
  }
});

// Every roaming Glitch group, fought with the gear of the boss of its sector.
const SECTOR_SPEC = { lobby: 'vendor', labs: 'autograder', servers: 'raid', archive: 'thesis', tunnels: 'hydra', core: 'minima', void: 'void' };
test(`no roaming Glitch group is a wall (${DIFF})`, () => {
  const walls = [];
  for (const [id, r] of Object.entries(ROOMS)) for (const [m, e] of Object.entries(r.ents || {})) {
    if (e.type !== 'enemy') continue;
    const spec = { ...BOSSES[SECTOR_SPEC[r.sector]] };
    let wins = 0;
    for (let i = 0; i < 20; i++) {
      const { s, stats } = setup(spec, DIFF);
      const b = new Battle({ player: s, stats, enemies: e.group, diff: DIFFICULTY[DIFF], items: { ramen: 2 }, rng: rng(7000 + i) });
      if (play(b, smart).result === 'win') wins++;
    }
    if (wins < (r.sector === 'void' ? (DIFF === 'deans' ? 4 : 12) : DIFF === 'deans' ? 10 : 18)) walls.push(`${id}:${m} [${e.group}] ${wins}/20`);
  }
  if (walls.length) console.log('  walls:', walls.join(', '));
  assert.equal(walls.length, 0);
});

test('every enemy has valid moves for its ai', () => {
  for (const [k, e] of Object.entries(ENEMIES)) {
    if (Array.isArray(e.ai)) e.ai.forEach(m => assert.ok(e.moves[m], `${k}.${m}`));
    else if (e.ai.rand) Object.keys(e.ai.rand).forEach(m => assert.ok(e.moves[m], `${k}.${m}`));
  }
});
