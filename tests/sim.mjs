// Battle simulation helpers shared by the balance tests and tools/sim.mjs.
// Two players: `smart` reads intents, manages Heat/Power and plays each boss's mechanic;
// `masher` only attacks (and eats when low), to prove mechanics matter.
import { Battle } from '../src/battle/engine.js';
import { newGame, computeStats, DIFFICULTY, makePart } from '../src/core/state.js';
import { FORMS } from '../src/data/parts.js';

const partOfUid = (s, uid) => s.parts.find(p => p.uid === uid);

export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Gear a player realistically has when they reach each boss without grinding:
// guaranteed boxes and rewards up to that point, sensible shop buys and modest Bench upgrades.
export const BOSSES = {
  // Sectors 1-2 use only guaranteed gear (no shop buys): the floor a new player can be at.
  vendor: { level: 3, foes: ['vendor'], gear: { gpu: 'gpu_hose', cpu: 'cpu_celery', psu: 'psu_brick', cool: 'cool_stock', usb: ['usb_fan'] }, apps: ['patch', 'probe'], items: { ramen: 4, volt: 1, paste: 1 } },
  autograder: { level: 5, foes: ['autograder'], gear: { gpu: 'gpu_hose', cpu: 'cpu_celery', psu: 'psu_brick', cool: 'cool_stock', usb: ['usb_fan', 'usb_duck'], ram: ['ram_vort'] }, apps: ['patch', 'throttle'], items: { ramen: 2, paste: 1 } },
  raid: { level: 8, foes: ['drive', 'drive', 'drive', 'drive', 'drive'], gear: { gpu: ['gpu_lancet', 1], cpu: ['cpu_k2', 1], psu: 'psu_gold', cool: 'cool_slip', usb: ['usb_key', 'usb_fan'], ram: ['ram_vort'] }, apps: ['patch', 'probe', 'glitch'], items: { burrito: 2, ramen: 2, coldbrew: 1 } },
  thesis: { level: 10, foes: ['thesis'], gear: { gpu: ['gpu_lancet', 2], cpu: ['cpu_k2', 2], psu: 'psu_gold', cool: 'cool_aio', usb: ['usb_key', 'usb_fan'], ram: ['ram_core', 'ram_vort'] }, apps: ['patch', 'probe', 'glitch'], items: { burrito: 2, pizza: 1, tape: 1 } },
  hydra: { level: 13, foes: ['hydra', 'port', 'port', 'port'], gear: { gpu: ['gpu_lancet', 3], cpu: ['cpu_k2', 3], psu: 'psu_over', cool: 'cool_halo', usb: ['usb_key', 'usb_turret'], ram: ['ram_core', 'ram_vort', 'ram_halc'] }, apps: ['patch', 'probe', 'exploit', 'decompile'], items: { pizza: 2, burrito: 2 } },
  minima: { level: 15, foes: ['minima'], gear: { gpu: ['gpu_lancet2', 2], cpu: ['cpu_k8', 1], psu: 'psu_over', cool: 'cool_halo', usb: ['usb_ventner', 'usb_turret'], ram: ['ram_core', 'ram_vort', 'ram_halc', 'ram_mono'] }, apps: ['patch', 'exploit', 'decompile', 'firewall'], items: { pizza: 2, burrito: 2 } },
  // postgame (Room 404): after MINIMA, with HOLLIS's vector GPU and some void parts
  void: { level: 19, foes: ['ventner'], gear: { gpu: ['gpu_vector', 2], cpu: ['cpu_k8', 2], psu: 'psu_over', cool: 'cool_halo', usb: ['usb_ventner', 'usb_turret'], ram: ['ram_core', 'ram_vort', 'ram_halc', 'ram_mono'] }, apps: ['patch', 'exploit', 'decompile', 'firewall'], items: { pizza: 2, burrito: 2 } },
};

// Players on harder settings engage more with the optional fights and the Bench.
export const ENGAGED = { pass: { level: 0, plus: 0 }, standard: { level: 0, plus: 0 }, honors: { level: 1, plus: 0 }, deans: { level: 2, plus: 1 } };

export function setup(spec, diff = 'standard') {
  const eng = ENGAGED[diff] || ENGAGED.standard;
  const s = newGame(diff); s.level = spec.level + eng.level;
  s.flags.ram3 = spec.level >= 6; s.flags.ram4 = spec.level >= 11;
  const put = (id) => { const [pid, plus] = Array.isArray(id) ? id : [id, 0]; const p = makePart(pid, { plus, perks: [] }); s.parts.push(p); return p.uid; };
  const g = spec.gear;
  for (const slot of ['gpu', 'cpu', 'psu', 'cool']) if (g[slot]) s.build[slot] = put(g[slot]);
  if (eng.plus) partOfUid(s, s.build.gpu).plus += eng.plus;
  s.build.usb = [null, null]; (g.usb || []).forEach((id, i) => { s.build.usb[i] = put(id); });
  (g.ram || []).forEach((id, i) => { s.build.ram[i] = put(id); });
  for (let i = 0; i < 4; i++) if (!s.build.ram[i]) s.build.ram[i] = put('ram_2gb');
  s.build.ramApps = spec.apps.slice();
  const stats = computeStats(s); s.hp = stats.maxHp;
  return { s, stats };
}

const big = (b, u) => {
  if (!u.intent) return false;
  const m = u.intent.move;
  if (!['atk', 'aoe', 'drain', 'multi'].includes(m.kind)) return false;
  const dmg = b.calc(u, b.player, m.pow, { noRand: true }).dmg * (m.hits || 1);
  return dmg >= b.player.maxHp * 0.18;
};

// A reasonable human: reads intents, keeps Heat in check, heals sensibly, probes once,
// varies inputs against the Autograder and MINIMA, and focuses the right targets.
export function smart(b) {
  const p = b.player, st = b.stats, mem = b.memory, foes = b.enemies;
  const f = st.formDef, heatNext = f.heat * b.heatMul();
  const boss = foes.find(e => e.boss);
  const minions = foes.filter(e => !e.boss);
  const can = (app) => st.apps.includes(app) && p.pwr >= b.appCost(app);
  const grader = foes.some(e => e.key === 'autograder');
  const minima = foes.find(e => e.key === 'minima');
  const avoid = new Set();
  if (grader && mem.lastAction) avoid.add(mem.lastAction);
  if (minima && minima.mem.predict) avoid.add(minima.mem.predict);
  const ok = (a) => !avoid.has(a.type === 'app' ? 'app:' + a.app : a.type);
  const opts = [];
  // only brace for big hits that land before our next turn (read the timeline)
  const order = b.preview(10), nextMe = order.indexOf(p, 1);
  const soon = new Set(order.slice(1, nextMe < 0 ? 4 : nextMe));
  const threat = foes.some(e => soon.has(e) && big(b, e));
  if (p.hp < p.maxHp * 0.4 && can("patch") && mem.patches < 4) opts.push({ type: 'app', app: 'patch' });
  if (p.hp < p.maxHp * 0.35) for (const it of ['pizza', 'burrito', 'ramen']) if (b.items[it]) { opts.push({ type: 'item', item: it }); break; }
  if (threat) opts.push({ type: 'guard' });
  if (p.heat + heatNext >= p.heatCap) opts.push({ type: 'vent' });
  // probe the boss (or an unknown species) once when it pays off
  const unknown = foes.find(e => !b.knows(e) && e.data.weak && e.data.weak.includes(st.form));
  if (unknown && can('probe')) opts.push({ type: 'app', app: 'probe', target: unknown });
  // targeting
  let tgt = boss || foes[0];
  if (boss && boss.key === 'thesis' && minions.length) tgt = minions.sort((x, y) => x.hp - y.hp)[0];
  else if (boss && boss.key === 'hydra' && minions.length >= 2) tgt = minions.sort((x, y) => x.hp - y.hp)[0];
  else if (boss && boss.key === 'vendor' && minions.length && !boss.statuses.tilted) tgt = minions[0];
  else if (foes.every(e => e.key === 'drive')) {
    const drives = foes.slice().sort((x, y) => x.hp - y.hp);
    const pending = b.units.some(x => x.key === 'drive' && !x.alive) && !b.raidDegraded;
    const est = (u) => b.calc(p, u, f.mult * (f.target === 'one' ? f.hits : 1), { form: st.form, noRand: true }).dmg;
    // spread damage until two drives are low, then finish them back to back
    tgt = pending || drives.length < 2 ? drives[0] : (drives[1].hp <= est(drives[1]) * 0.92 && drives[0].hp <= est(drives[0]) * 0.92 ? drives[0] : drives[drives.length - 1]);
  } else if (!boss) tgt = foes.slice().sort((x, y) => x.hp - y.hp)[0];
  // situational apps
  if (boss && boss.statuses.tilted && can('exploit')) opts.push({ type: 'app', app: 'exploit', target: boss });
  if (boss && !boss.statuses.exposed && can('decompile') && boss.hp > boss.maxHp * 0.3) opts.push({ type: 'app', app: 'decompile', target: boss });
  if (tgt && !tgt.statuses.glitched && can('glitch') && tgt.hp > tgt.maxHp * 0.5) opts.push({ type: 'app', app: 'glitch', target: tgt });
  if (boss && (boss.intent && boss.intent.move.kind === 'charge') && can('throttle') && !boss.statuses.throttled) opts.push({ type: 'app', app: 'throttle', target: boss });
  opts.push({ type: 'attack', target: tgt });
  if (can('exploit')) opts.push({ type: 'app', app: 'exploit', target: tgt });
  if (can('probe')) opts.push({ type: 'app', app: 'probe', target: tgt });
  opts.push({ type: 'guard' });
  if (p.heat > 0) opts.push({ type: 'vent' });
  return opts.find(ok) || opts[0];
}

export function masher(b) {
  const p = b.player;
  if (p.hp < p.maxHp * 0.3) for (const it of ['pizza', 'burrito', 'ramen']) if (b.items[it]) return { type: 'item', item: it };
  const boss = b.enemies.find(e => e.boss);
  return { type: 'attack', target: boss || b.enemies[0] };
}

export function play(b, policy, maxTurns = 600) {
  let n = 0, pt = 0;
  while (!b.outcome() && n++ < maxTurns) {
    const u = b.nextUnit();
    b.startTurn(u);
    if (b.outcome()) break;
    if (!u.alive) { b.endTurn(u, 100); continue; }
    if (u.kind === 'player') {
      pt++;
      if (u.stunned) { b.stunnedTurn(u); continue; }
      b.playerAction(policy(b));
    } else if (u.kind === 'drone') b.droneAction(u);
    else b.enemyAction(u);
  }
  return { result: b.outcome() || 'timeout', turns: pt, hpLeft: b.player.hp / b.player.maxHp };
}

export function runBoss(name, { diff = 'standard', policy = smart, n = 30, seed = 1 } = {}) {
  const spec = BOSSES[name];
  let wins = 0, turns = 0, hp = 0;
  for (let i = 0; i < n; i++) {
    const { s, stats } = setup(spec, diff);
    const b = new Battle({ player: s, stats, enemies: spec.foes, diff: DIFFICULTY[diff], items: { ...spec.items }, rng: rng(seed * 1000 + i), boss: true });
    const r = play(b, policy);
    if (r.result === 'win') { wins++; hp += r.hpLeft; }
    turns += r.turns;
  }
  return { wins, n, turns: turns / n, hpLeft: wins ? hp / wins : 0 };
}

export { FORMS };
