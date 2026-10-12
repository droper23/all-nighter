// Boss scripts: choose(battle, unit) -> move key; optional before()/after() hooks return extra events.
const CHARGE_NEXT = { exact: 'dispense', deadline: 'late', defend: 'committee', overfit: 'predict', thesis: 'tenure' };

function cycle(u, pattern, b) {
  if (u.mem.force) { const f = u.mem.force; u.mem.force = null; return f; }
  u.mem.i = (u.mem.i || 0);
  const key = pattern[u.mem.i++ % pattern.length];
  return typeof key === 'function' ? key(b, u) : key;
}
function chargeFollow(u, key) { if (CHARGE_NEXT[key]) u.mem.force = CHARGE_NEXT[key]; }

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
    after(b, u, key) { chargeFollow(u, key); return null; },
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
      if (!b.raidDegraded && dead === 1 && !claimed) return 'rebuild';
      if (b.raidDegraded) return b.rng() < 0.5 ? 'seek' : 'spin';
      return cycle(u, ['spin', 'seek', 'spin', 'click'], b);
    },
    after(b, u, key) {
      if (key !== 'rebuild') return null;
      const dead = b.units.find(x => x.key === 'drive' && !x.alive);
      if (b.raidDegraded || !dead) return [{ t: 'log', text: 'Nothing to rebuild.' }];
      dead.alive = true; dead.hp = Math.round(dead.maxHp * 0.6); dead.statuses = {}; dead.shield = 0;
      dead.next = u.next + b.delayFor(dead, 80); b.chooseIntent(dead);
      return [{ t: 'revive', u: dead, text: 'Parity rebuilt a drive!' }];
    },
  },

  thesis: {
    choose(b, u) {
      const heal = () => (u.hp < u.maxHp * 0.6 ? 'revise' : 'lit');
      const write = () => (b.enemies.filter(e => e.key === 'chapter').length < 3 ? 'write' : 'lit');
      return cycle(u, [write, 'lit', 'defend', write, heal], b);
    },
    after(b, u, key) { chargeFollow(u, key); return null; },
  },

  hydra: {
    choose(b, u) {
      const ports = b.enemies.filter(e => e.key === 'port').length;
      const reroute = () => (ports < 3 ? 'reroute' : 'flood');
      return cycle(u, ['flood', 'handshake', 'flood', reroute], b);
    },
    before(b, u) {
      const ports = b.enemies.filter(e => e.key === 'port').length;
      if (ports >= 2) {
        u.shield = Math.max(u.shield, Math.round(u.maxHp * 0.15));
        return [{ t: 'shield', u, amt: u.shield }, { t: 'log', text: 'Ports up: the core re-encrypts.' }];
      }
      return null;
    },
  },

  minima: {
    choose(b, u) {
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
        ev.push({ t: 'phase', u, text: 'MINIMA: Loss approaching zero. Please hold still.' });
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
