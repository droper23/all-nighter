// Simulates battles with a simple auto-player to catch crashes and sanity-check balance.
import test from 'node:test';
import assert from 'node:assert';
import { Battle } from '../src/battle/engine.js';
import { newGame, computeStats, DIFFICULTY, makePart } from '../src/core/state.js';
import { ENEMIES } from '../src/data/enemies.js';

function autoplay(b, maxTurns = 400) {
  let n = 0, pt = 0;
  while (!b.outcome() && n++ < maxTurns) {
    const u = b.nextUnit();
    b.startTurn(u);
    if (b.outcome()) break;
    if (!u.alive) { b.endTurn(u, 100); continue; }
    if (u.kind === 'player') {
      pt++;
      if (u.stunned) { b.stunnedTurn(u); continue; }
      const st = b.stats;
      let a;
      const grader = b.enemies.some(e => e.key === 'autograder');
      if (u.hp < u.maxHp * 0.45 && st.apps.includes('patch') && u.pwr >= b.appCost('patch') && b.memory.lastAction !== 'app:patch') a = { type: 'app', app: 'patch' };
      else if (u.hp < u.maxHp * 0.35 && b.items.ramen) a = { type: 'item', item: 'ramen' };
      else if (u.heat + st.formDef.heat * 1.2 >= u.heatCap && b.memory.lastAction !== 'vent') a = { type: 'vent' };
      else if (grader && b.memory.lastAction === 'attack') a = u.pwr >= 2 ? { type: 'app', app: 'probe', target: b.enemies[0] } : { type: 'guard' };
      else {
        const boss = b.enemies.find(e => e.boss);
        const minions = b.enemies.filter(e => !e.boss);
        const focusMinions = boss && (boss.statuses.cited || (boss.key === 'hydra' && minions.length >= 2) || minions.length >= 2);
        const tgt = boss && !focusMinions ? boss : minions.sort((x, y) => x.hp - y.hp)[0] || boss;
        a = { type: 'attack', target: tgt };
      }
      b.playerAction(a);
    } else if (u.kind === 'drone') b.droneAction(u);
    else b.enemyAction(u);
  }
  return { result: b.outcome(), turns: pt };
}

function setup(level, gear = []) {
  const s = newGame('standard'); s.level = level;
  for (const [slot, id] of gear) { const p = makePart(id); s.parts.push(p); if (slot === 'ram') s.build.ram[0] = p.uid; else s.build[slot] = p.uid; }
  const stats = computeStats(s); s.hp = stats.maxHp;
  return { s, stats };
}

const CASES = [
  ['lobby trio', 2, [], ['fizzbit', 'lampy', 'jam']],
  ['vendor', 4, [['gpu', 'gpu_hose'], ['cpu', 'cpu_k2']], ['vendor']],
  ['autograder', 7, [['gpu', 'gpu_hose'], ['cpu', 'cpu_k2'], ['psu', 'psu_bronze'], ['cool', 'cool_tower']], ['autograder']],
  ['raid', 10, [['gpu', 'gpu_array'], ['cpu', 'cpu_v6'], ['psu', 'psu_gold'], ['cool', 'cool_aio']], ['drive', 'drive', 'drive', 'drive', 'drive']],
  ['thesis', 13, [['gpu', 'gpu_lancet'], ['cpu', 'cpu_h8'], ['psu', 'psu_gold'], ['cool', 'cool_block']], ['thesis']],
  ['hydra', 16, [['gpu', 'gpu_lancet2'], ['cpu', 'cpu_k8'], ['psu', 'psu_ti'], ['cool', 'cool_halo']], ['hydra', 'port', 'port', 'port']],
  ['minima', 20, [['gpu', 'gpu_raster3'], ['cpu', 'cpu_k8'], ['psu', 'psu_over'], ['cool', 'cool_halo']], ['minima']],
];

for (const [name, lvl, gear, foes] of CASES) {
  test(`battle runs: ${name}`, () => {
    let wins = 0, turns = 0;
    for (let i = 0; i < 30; i++) {
      const { s, stats } = setup(lvl, gear);
      const b = new Battle({ player: s, stats, enemies: foes, diff: DIFFICULTY[process.env.DIFF || 'standard'], items: { ramen: 3 } });
      const r = autoplay(b);
      if (r.result === 'win') wins++;
      turns += r.turns;
    }
    console.log(`  ${name}: win ${wins}/30, avg player turns ${(turns / 30).toFixed(1)}`);
    assert.ok(turns > 0);
  });
}

test('every enemy has valid moves for its ai', () => {
  for (const [k, e] of Object.entries(ENEMIES)) {
    if (Array.isArray(e.ai)) e.ai.forEach(m => assert.ok(e.moves[m], `${k}.${m}`));
    else if (e.ai.rand) Object.keys(e.ai.rand).forEach(m => assert.ok(e.moves[m], `${k}.${m}`));
  }
});
