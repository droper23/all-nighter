import { actionName } from './engine.js';
// Boss scripts: choose(battle, unit) -> move key; optional before()/after() hooks return extra events.
const CHARGE_NEXT = { exact: 'dispense', deadline: 'late', defend: 'committee', overfit: 'predict', thesis: 'tenure' };

function cycle(u, pattern, b) {
  if (u.mem.force) { const f = u.mem.force; u.mem.force = null; return f; }
  u.mem.i = (u.mem.i || 0);
  const key = pattern[u.mem.i++ % pattern.length];
  return typeof key === 'function' ? key(b, u) : key;
}
function chargeFollow(u, key) { if (CHARGE_NEXT[key]) u.mem.force = CHARGE_NEXT[key]; }
// MINIMA models the player's recent inputs: the most frequent of the last five (ties go to the latest).
export function predictHabit(b) {
  const r = b.memory.recent;
  if (r.length < 3) return null;
  const n = {}; let best = null;
  r.forEach((k) => { n[k] = (n[k] || 0) + 1; if (!best || n[k] >= n[best]) best = k; });
  return n[best] >= 2 ? best : null;
}

export const BOSS_AI = {
  vendor: {
    choose(b, u) {
      const fizz = b.enemies.filter(e => e.key === 'fizzbit').length;
      const restock = () => (fizz < 1 ? 'restock' : 'barrage');
      return cycle(u, u.mem.p2 ? ['barrage', 'exact', restock, 'glow', 'barrage', 'coin'] : ['barrage', 'glow', 'exact', restock, 'coin'], b);
    },
    before(b, u) {
      if (!u.mem.p2 && u.hp < u.maxHp * 0.5) {
        u.mem.p2 = true; u.spd *= 1.2;
        return [{ t: 'log', text: 'VENDOR: *** OUT OF ORDER *** OUT OF ORDER ***' }, b.addStatus(u, 'amped', 3), { t: 'phase', u }];
      }
      return null;
    },
    after(b, u, key) {
      chargeFollow(u, key);
      if (key === 'dispense') return [{ t: 'log', text: 'VENDOR rocks back on its legs. It is TILTED!' }, b.addStatus(u, 'tilted', 2)];
      return null;
    },
  },

  autograder: {
    choose(b, u) {
      const heal = () => (u.hp < u.maxHp * 0.6 && !(u.mem.heals > 2) ? ((u.mem.heals = (u.mem.heals || 0) + 1), 'partial') : 'redpen');
      return cycle(u, ['redpen', 'rubric', 'deadline', 'redpen', heal], b);
    },
    after(b, u, key) { chargeFollow(u, key); return null; },
  },

  raid: {
    choose(b, u) {
      const drives = b.units.filter(x => x.key === 'drive');
      const dead = drives.filter(x => !x.alive).length;
      const claimed = drives.some(x => x.alive && x !== u && x.intent && x.intent.key === 'rebuild');
      if (u.mem.rebuilding && !b.raidDegraded && dead >= 1) return 'rebuild';
      u.mem.rebuilding = 0;
      if (!b.raidDegraded && dead === 1 && !claimed) return 'rebuild';
      if (b.raidDegraded) return b.rng() < 0.5 ? 'seek' : 'spin';
      return cycle(u, ['spin', 'seek', 'spin', 'click'], b);
    },
    after(b, u, key) {
      if (key !== 'rebuild') return null;
      const dead = b.units.find(x => x.key === 'drive' && !x.alive);
      if (b.raidDegraded || !dead) { u.mem.rebuilding = 0; return [{ t: 'log', text: 'Nothing to rebuild.' }]; }
      if (!u.mem.rebuilding) { u.mem.rebuilding = 1; return [{ t: 'log', text: 'PARITY REBUILD 50%... Kill another drive before it finishes!' }]; }
      u.mem.rebuilding = 0;
      dead.alive = true; dead.hp = Math.round(dead.maxHp * 0.8); dead.statuses = {}; dead.shield = 0;
      dead.next = u.next + b.delayFor(dead, 80); b.chooseIntent(dead);
      return [{ t: 'revive', u: dead, text: 'Parity rebuilt a drive!' }];
    },
  },

  thesis: {
    choose(b, u) {
      const heal = () => (u.hp < u.maxHp * 0.6 ? 'revise' : 'lit');
      const write = () => (b.enemies.filter(e => e.key === 'chapter').length < 3 ? 'write' : 'lit');
      return cycle(u, [write, 'lit', 'defend', 'lit', heal], b);
    },
    after(b, u, key) { chargeFollow(u, key); return null; },
  },

  hydra: {
    choose(b, u) {
      const ports = b.enemies.filter(e => e.key === 'port').length;
      // every live Port widens the flood
      u.data = { ...u.data, moves: { ...u.data.moves, flood: { ...u.data.moves.flood, pow: 0.4 + 0.22 * ports } } };
      const reroute = () => (ports < 3 ? 'reroute' : 'flood');
      return cycle(u, ['flood', 'handshake', 'flood', 'flood', reroute, 'handshake'], b);
    },
    before(b, u) {
      const ports = b.enemies.filter(e => e.key === 'port').length;
      if (ports >= 2) {
        u.shield = Math.max(u.shield, Math.round(u.maxHp * 0.15));
        return [{ t: 'shield', u, amt: u.shield }, { t: 'log', text: 'Ports up: the core re-encrypts.' }];
      }
      return null;
    },
    after(b, u, key) {
      if (key !== 'reroute') return null;
      const p = b.units.filter(x => x.key === 'port' && x.alive).pop();
      if (p && p.hp === p.maxHp) p.hp = Math.round(p.maxHp * 0.7);
      return null;
    },
  },

  minima: {
    choose(b, u) {
      u.mem.predict = predictHabit(b);
      const spawn = () => (b.enemies.length < 3 ? 'spawn' : 'epoch');
      const pats = [
        ['descent', 'epoch', 'overfit', 'backprop', 'epoch'],
        ['dropout', 'epoch', spawn, 'overfit', 'descent'],
        ['minimize', 'epoch', 'overfit', spawn, 'descent', 'minimize'],
      ];
      return cycle(u, pats[u.mem.phase || 0], b);
    },
    before(b, u) {
      const ev = [];
      if (!u.mem.phase && u.hp < u.maxHp * 0.66) {
        u.mem.phase = 1; u.mem.i = 0;
        const forms = Object.entries(b.memory.forms).sort((a, c) => c[1] - a[1]);
        u.mem.learned = forms.length ? forms[0][0] : 'raster';
        ev.push({ t: 'phase', u, text: `MINIMA: I have been watching you. Your ${u.mem.learned.toUpperCase()} is predictable.` });
        ev.push({ t: 'log', text: `MINIMA now resists ${u.mem.learned}.` });
      } else if (u.mem.phase === 1 && u.hp < u.maxHp * 0.33) {
        u.mem.phase = 2; u.mem.i = 0; u.spd *= 1.15;
        const all = Object.entries((b.habits && b.habits.actions) || {}).sort((x, y) => y[1] - x[1])[0];
        const habit = all ? `${actionName(all[0]).toUpperCase()}: ${all[1]} times tonight. ` : '';
        ev.push({ t: 'phase', u, text: `MINIMA: ${habit}I know what you do when you are tired. Loss approaching zero. Please hold still.` });
        ev.push(b.addStatus(u, 'amped', 99));
      }
      return ev.length ? ev : null;
    },
    after(b, u, key) { chargeFollow(u, key); return null; },
  },

  ventner: {
    choose(b, u) {
      const heal = () => (u.hp < u.maxHp * 0.5 ? 'office' : 'quiz');
      return cycle(u, ['lecture', 'quiz', 'punch', 'thesis', heal, 'punch'], b);
    },
    before(b, u) {
      if (!u.mem.p2 && u.hp < u.maxHp * 0.5) {
        u.mem.p2 = true;
        return [{ t: 'phase', u, text: 'VENTNER: Good. Now show me you understand WHY it works.' }, b.addStatus(u, 'amped', 99)];
      }
      return null;
    },
    after(b, u, key) { chargeFollow(u, key); return null; },
  },
};
