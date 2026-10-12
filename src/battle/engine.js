// Pure turn-based battle logic. No Phaser. Produces event lists for the Battle scene to animate.
import { ENEMIES, DRONES } from '../data/enemies.js';
import { APPS, ITEMS } from '../data/apps.js';
import { FORMS } from '../data/parts.js';
import { BOSS_AI } from './bosses.js';

const DEBUFFS = ['throttled', 'exposed', 'glitched', 'lag', 'vulnerable', 'marked'];
const BUFFS = ['overclocked', 'amped', 'hotfix', 'guarding', 'sudo', 'backup'];
export const STATUS_INFO = {
  throttled: { name: 'Throttled', short: 'THR', color: '#f08a3c', desc: 'Deals 30% less damage.' },
  exposed: { name: 'Exposed', short: 'EXP', color: '#e0485e', desc: 'Takes 30% more damage.' },
  glitched: { name: 'Glitched', short: 'GLT', color: '#9a5ad8', desc: 'Takes damage each turn.' },
  vulnerable: { name: 'Vulnerable', short: 'VUL', color: '#e0485e', desc: 'Overheated: takes 50% more damage.' },
  marked: { name: 'Probed', short: 'PRB', color: '#5ee0e8', desc: 'Your crit chance vs. it +25%.' },
  overclocked: { name: 'Overclocked', short: 'OC', color: '#ffe08a', desc: '+40% SPD, +50% Heat.' },
  amped: { name: 'Amped', short: 'AMP', color: '#ffe08a', desc: 'Deals 30% more damage.' },
  hotfix: { name: 'Hotfix', short: 'HFX', color: '#5cc070', desc: 'Heals each turn.' },
  guarding: { name: 'Guarding', short: 'GRD', color: '#b8b6c8', desc: 'Takes half damage.' },
  sudo: { name: 'sudo', short: 'SU', color: '#5ee0e8', desc: 'Next action: no Heat, auto-crit.' },
  backup: { name: 'Backup', short: 'BAK', color: '#5cc070', desc: 'Revives once at 40%.' },
  cited: { name: 'Cited', short: 'CIT', color: '#dcb07a', desc: 'Takes half damage while Chapters stand.' },
};

export class Battle {
  constructor({ player, stats, enemies, diff, preempt = null, rng = Math.random, items = {}, boss = false, canFlee = true }) {
    this.rng = rng; this.diff = diff; this.stats = stats; this.items = items; this.boss = boss; this.canFlee = canFlee && !boss;
    this.units = []; this.turn = 0; this.log = []; this.memory = { forms: {}, lastAction: null, actions: {} };
    this.uid = 0;
    const p = this.addUnit({
      side: 'player', kind: 'player', name: 'Jules', sprite: 'jules', hp: Math.min(player.hp, stats.maxHp), maxHp: stats.maxHp,
      atk: stats.atk, def: stats.def, spd: stats.spd, crit: stats.crit,
    });
    p.heat = stats.passives.has('mug') ? 40 : 0; p.heatCap = stats.heatCap; p.pwr = stats.maxPwr; p.maxPwr = stats.maxPwr;
    p.hpHist = [p.hp, p.hp];
    p.revives = stats.passives.has('ventner') ? 1 : 0;
    p.duckUsed = !stats.passives.has('duck');
    if (stats.passives.has('key')) p.shield = Math.round(stats.maxHp * 0.2);
    this.player = p;
    for (const d of stats.drones) this.addDrone(d);
    for (const id of enemies) this.addEnemy(id);
    // Initial timeline
    for (const u of this.units) u.next = this.delayFor(u, 100) * (u.side === 'player' ? 0.45 : 0.7 + this.rng() * 0.3);
    const opener = stats.perks.opener || 0;
    if (opener) p.next *= Math.max(0.3, 1 - 0.25 * opener);
    if ((stats.brands.kilobyte || 0) >= 3) p.next = 0;
    if (preempt === 'player') this.units.filter(u => u.side === 'enemy').forEach(u => { u.next += 60; });
    if (preempt === 'enemy') { p.next += 70; }
    this.units.filter(u => u.side === 'enemy').forEach(u => this.chooseIntent(u));
  }

  addUnit(u) {
    const unit = { id: ++this.uid, statuses: {}, shield: 0, alive: true, next: 0, ...u };
    this.units.push(unit); return unit;
  }
  addEnemy(key) {
    const e = ENEMIES[key];
    const hp = Math.round(e.hp * this.diff.enemyHp);
    return this.addUnit({ side: 'enemy', kind: 'enemy', key, def: e.def, name: e.name, sprite: e.sprite, hp, maxHp: hp, atk: e.atk, spd: e.spd * this.diff.spd, crit: 5, data: e, step: 0, boss: !!e.boss, mem: {} });
  }
  addDrone(key) {
    const d = DRONES[key];
    const hp = Math.max(1, Math.round(this.stats.maxHp * d.hp));
    return this.addUnit({ side: 'player', kind: 'drone', key, name: d.name, sprite: d.sprite, hp, maxHp: hp, atk: Math.round(this.stats.atk * d.atkMul), def: Math.round(this.stats.def * 0.5), spd: d.spd, crit: 5, life: d.life || 0, data: d, acted: 0 });
  }

  get enemies() { return this.units.filter(u => u.side === 'enemy' && u.alive); }
  get allies() { return this.units.filter(u => u.side === 'player' && u.alive); }
  has(u, s) { return !!u.statuses[s]; }

  effSpd(u) { return u.spd * (this.has(u, 'overclocked') ? 1.4 : 1); }
  delayFor(u, d) { return d * 100 / Math.max(10, this.effSpd(u)); }

  nextUnit() {
    const alive = this.units.filter(u => u.alive);
    alive.sort((a, b) => a.next - b.next || (a.side === 'player' ? -1 : 1));
    return alive[0];
  }
  // Predicted order of the next n turns.
  preview(n = 8) {
    const sim = this.units.filter(u => u.alive).map(u => ({ u, next: u.next }));
    const out = [];
    for (let i = 0; i < n && sim.length; i++) {
      sim.sort((a, b) => a.next - b.next || (a.u.side === 'player' ? -1 : 1));
      const s = sim[0]; out.push(s.u);
      let d = 100;
      if (s.u.kind === 'enemy' && s.u.intent && out.filter(x => x === s.u).length === 1) d = s.u.intent.move.delay;
      s.next += this.delayFor(s.u, d);
    }
    return out;
  }

  outcome() {
    if (!this.player.alive) return 'lose';
    if (!this.enemies.length) return 'win';
    return null;
  }

  // ---------- turn lifecycle ----------
  startTurn(u) {
    const ev = [];
    this.turn++;
    this.actor = u;
    delete u.statuses.guarding;
    if (u.statuses.glitched && u.alive) {
      const dmg = u.statuses.glitched.val;
      ev.push(...this.applyDamage(null, u, dmg, { raw: true, label: 'glitch' }));
    }
    if (u.statuses.hotfix && u.alive) ev.push(this.heal(u, Math.round(u.maxHp * 0.1)));
    if (u.kind === 'player' && u.alive) {
      if (this.stats.passives.has('cactus')) ev.push(this.heal(u, Math.round(u.maxHp * 0.04)));
      const shed = Math.min(u.heat, this.stats.cool);
      u.heat -= shed;
      const gain = Math.min(u.maxPwr - u.pwr, this.stats.regen);
      u.pwr += gain;
      if (shed || gain) ev.push({ t: 'tick', u, shed, gain });
      u.hpHist.push(u.hp); if (u.hpHist.length > 3) u.hpHist.shift();
    }
    if (u.kind === 'enemy' && u.data.ai === 'thesis') {
      const chapters = this.enemies.filter(e => e.key === 'chapter').length;
      if (chapters) u.statuses.cited = { turns: 99 }; else delete u.statuses.cited;
    }
    return ev;
  }
  endTurn(u, delay) {
    u.next += this.delayFor(u, delay);
    for (const [k, s] of Object.entries(u.statuses)) {
      if (k === 'guarding' || k === 'sudo' || k === 'backup' || k === 'cited') continue;
      if (s.fresh) { s.fresh = false; continue; }
      s.turns--; if (s.turns <= 0) delete u.statuses[k];
    }
  }

  // ---------- damage ----------
  attackPower(src) {
    let a = src.atk;
    if (this.has(src, 'throttled')) a *= 0.7;
    if (this.has(src, 'amped')) a *= 1.3;
    if (src.kind === 'player') {
      const heat = src.heat;
      if ((this.stats.brands.vortex || 0) >= 2 && heat > 50) a *= 1.15;
      if (this.stats.passives.has('mug') && heat > 50) a *= 1.2;
      a *= 1 + 0.1 * (this.stats.perks.overvolt || 0);
    }
    if (src.side === 'enemy') a *= this.diff.enemyDmg;
    return a;
  }
  calc(src, tgt, mult, { form = null, crit = 0, noRand = false } = {}) {
    let dmg = this.attackPower(src) * mult;
    let weak = false, resist = false;
    if (form && tgt.data && tgt.data.weak && tgt.data.weak.includes(form)) { dmg *= 1.5; weak = true; }
    if (form && tgt.data && tgt.data.resist && tgt.data.resist.includes(form)) { dmg *= 0.5; resist = true; }
    if (form && tgt.mem && tgt.mem.learned === form) { dmg *= 0.65; resist = true; }
    if (this.has(tgt, 'exposed')) dmg *= 1.3;
    if (this.has(tgt, 'vulnerable')) dmg *= 1.5;
    if (this.has(tgt, 'guarding')) dmg *= 0.5;
    if (this.has(tgt, 'cited')) dmg *= 0.5;
    dmg *= 50 / (50 + tgt.def);
    let isCrit = false;
    if (!noRand) {
      let cc = src.crit + crit + (this.has(tgt, 'marked') && src.side === 'player' ? 25 : 0);
      if (this.has(src, 'sudo')) cc = 100;
      isCrit = this.rng() * 100 < cc;
      if (isCrit) dmg *= 1.6;
      dmg *= 0.92 + this.rng() * 0.16;
    }
    return { dmg: Math.max(1, Math.round(dmg)), weak, resist, crit: isCrit };
  }
  hit(src, tgt, mult, opts = {}) {
    const r = this.calc(src, tgt, mult, opts);
    const ev = this.applyDamage(src, tgt, r.dmg, { ...opts, ...r });
    if (src && src.kind === 'player' && this.stats.perks.leech) {
      const dealt = ev.reduce((s, e) => s + (e.t === 'hit' ? e.dmg : 0), 0);
      const amt = Math.round(dealt * 0.04 * this.stats.perks.leech);
      if (amt > 0) ev.push(this.heal(src, amt));
    }
    return ev;
  }
  applyDamage(src, tgt, dmg, opts = {}) {
    const ev = [];
    if (!tgt.alive) return ev;
    let absorbed = 0;
    if (tgt.shield > 0 && !opts.pierce && !opts.raw) {
      absorbed = Math.min(tgt.shield, dmg); tgt.shield -= absorbed; dmg -= absorbed;
    }
    tgt.hp -= dmg;
    ev.push({ t: 'hit', src, tgt, dmg, absorbed, crit: opts.crit, weak: opts.weak, resist: opts.resist, label: opts.label });
    if (src && tgt.kind === 'player' && this.has(tgt, 'guarding') && (this.stats.brands.monolith || 0) >= 3 && src.alive) {
      ev.push(...this.applyDamage(null, src, Math.round((dmg + absorbed) * 0.4), { raw: true, label: 'reflect' }));
    }
    if (tgt.hp <= 0) {
      if (tgt.kind === 'player' && tgt.statuses.backup) {
        delete tgt.statuses.backup; tgt.hp = Math.round(tgt.maxHp * 0.4); ev.push({ t: 'revive', u: tgt, text: 'Backup restored!' });
      } else if (tgt.kind === 'player' && tgt.revives > 0) {
        tgt.revives--; tgt.hp = Math.round(tgt.maxHp * 0.3); ev.push({ t: 'revive', u: tgt, text: "Ventner's drive boots you back up." });
      } else {
        tgt.hp = 0; tgt.alive = false; ev.push({ t: 'die', u: tgt });
        if (tgt.kind === 'enemy' && tgt.data.ai === 'raid') this.raidDeath(tgt, ev);
      }
    }
    return ev;
  }
  heal(u, amt) {
    const real = Math.max(0, Math.min(u.maxHp - u.hp, amt));
    u.hp += real;
    return { t: 'heal', u, amt: real };
  }
  addStatus(u, id, turns, extra = {}) {
    if (!u.alive) return null;
    if (id === 'lag') { u.next += this.delayFor(u, 45 * turns); return { t: 'status', u, id: 'lag', text: 'Lagged!' }; }
    if (u.kind === 'player' && DEBUFFS.includes(id)) {
      if (!this.player.duckUsed) { this.player.duckUsed = true; return { t: 'status', u, id: 'duck', text: 'The Rubber Duck absorbs it.' }; }
      turns = Math.max(1, turns - (this.stats.perks.insulated || 0));
    }
    const cur = u.statuses[id];
    u.statuses[id] = { turns: Math.max(turns, cur ? cur.turns : 0), fresh: u === this.actor, ...extra };
    return { t: 'status', u, id, text: (STATUS_INFO[id] || { name: id }).name + '!' };
  }
  cleanse(u) {
    let n = 0;
    for (const k of DEBUFFS) if (u.statuses[k]) { delete u.statuses[k]; n++; }
    return n;
  }

  // ---------- player ----------
  heatMul() {
    let m = this.diff.heat;
    if (this.has(this.player, 'overclocked')) m *= 1.5;
    m *= 1 - 0.1 * (this.stats.perks.chilled || 0);
    m *= 1 + 0.1 * (this.stats.perks.overvolt || 0);
    return m;
  }
  addHeat(h) {
    const p = this.player, ev = [];
    if (this.has(p, 'sudo') && h > 0) { delete p.statuses.sudo; return ev; }
    p.heat = Math.max(0, p.heat + (h > 0 ? h * this.heatMul() : h));
    if (p.heat >= p.heatCap) {
      p.heat = 35; p.stunned = true;
      this.addStatus(p, 'vulnerable', 2);
      ev.push({ t: 'overheat', u: p });
    }
    return ev;
  }
  appCost(id) {
    let c = APPS[id].pwr;
    if ((this.stats.brands.halcyon || 0) >= 3) c = Math.ceil(c * 0.75);
    c -= this.stats.perks.thrifty || 0;
    return Math.max(id === 'gc' ? 0 : 1, c);
  }
  pickRandom(list) { return list[Math.floor(this.rng() * list.length)]; }

  playerAction(a) {
    const p = this.player, ev = [];
    const key = a.type === 'app' ? 'app:' + a.app : a.type;
    // Autograder: repeating the same action is "plagiarism".
    const grader = this.enemies.find(e => e.data.ai === 'autograder');
    if (grader && this.memory.lastAction === key && a.type !== 'item') {
      ev.push({ t: 'log', text: 'PLAGIARISM DETECTED. -10 points.' });
      ev.push(this.addStatus(p, 'exposed', 2));
      ev.push(...this.hit(grader, p, 0.6));
    }
    this.memory.lastAction = key;
    this.memory.actions[key] = (this.memory.actions[key] || 0) + 1;
    let delay = 100;
    if (a.type === 'attack') {
      const f = this.stats.formDef;
      this.memory.forms[this.stats.form] = (this.memory.forms[this.stats.form] || 0) + 1;
      ev.push({ t: 'anim', kind: 'attack', form: this.stats.form, u: p });
      const hitOpts = { form: this.stats.form, pierce: !!f.pierce };
      if (f.target === 'all') for (const e of this.enemies) ev.push(...this.hit(p, e, f.mult, hitOpts));
      else for (let i = 0; i < f.hits; i++) {
        const tgt = f.target === 'random' ? this.pickRandom(this.enemies) : (a.target && a.target.alive ? a.target : this.enemies[0]);
        if (!tgt) break;
        ev.push(...this.hit(p, tgt, f.mult, hitOpts));
      }
      delete p.statuses.sudo;
      ev.push(...this.addHeat(f.heat));
      delay = f.delay;
    } else if (a.type === 'app') {
      const app = APPS[a.app];
      p.pwr -= this.appCost(a.app);
      ev.push({ t: 'anim', kind: 'app', app: a.app, u: p });
      ev.push({ t: 'log', text: `Jules runs ${app.name}.` });
      ev.push(...this.runApp(a.app, a.target));
      if (a.app === 'panic') { p.heat = p.heatCap; ev.push(...this.addHeat(1)); }
      else if (a.app !== 'sudo') { if (app.heat) ev.push(...this.addHeat(app.heat)); }
      delay = app.delay;
    } else if (a.type === 'guard') {
      ev.push(this.addStatus(p, 'guarding', 1));
      p.heat = Math.max(0, p.heat - Math.round(this.stats.cool * 0.5));
      ev.push({ t: 'log', text: 'Jules braces behind the Build.' });
      delay = 60;
    } else if (a.type === 'vent') {
      const before = p.heat;
      p.heat = Math.max(0, p.heat - 50 - this.stats.cool);
      ev.push({ t: 'vent', u: p, amt: Math.round(before - p.heat) });
      if ((this.stats.brands.vortex || 0) >= 3 && before > 0) for (const e of this.enemies) ev.push(...this.hit(p, e, 0.5 * Math.max(0.3, before / 60)));
      delay = 70;
    } else if (a.type === 'item') {
      ev.push(...this.useItem(a.item, a.target));
      delay = 70;
    } else if (a.type === 'flee') {
      const avg = this.enemies.reduce((s, e) => s + e.spd, 0) / this.enemies.length;
      const ch = Math.min(0.9, 0.5 + (p.spd - avg) / 200);
      if (this.rng() < ch) { ev.push({ t: 'flee', ok: true }); this.fled = true; return ev; }
      ev.push({ t: 'flee', ok: false, text: "Couldn't get away!" });
    }
    this.endTurn(p, delay);
    return ev.filter(Boolean);
  }

  runApp(id, tgt) {
    const p = this.player, ev = [], S = this.stats;
    const target = tgt && tgt.alive ? tgt : this.enemies[0];
    switch (id) {
      case 'patch': ev.push(this.heal(p, Math.round(p.maxHp * 0.35))); break;
      case 'firewall': p.shield = Math.max(p.shield, Math.round(p.maxHp * 0.3)); ev.push({ t: 'shield', u: p, amt: p.shield }); break;
      case 'probe': if (target) { target.probed = true; ev.push(this.addStatus(target, 'marked', 3)); ev.push({ t: 'probe', u: target }); } break;
      case 'throttle': ev.push(this.addStatus(target, 'throttled', 3)); break;
      case 'lagspike': ev.push(...this.hit(p, target, 0.5)); ev.push(this.addStatus(target, 'lag', 2)); break;
      case 'overclock': ev.push(this.addStatus(p, 'overclocked', 3)); break;
      case 'cryo': p.heat = Math.max(0, p.heat - 50); ev.push({ t: 'vent', u: p, amt: 50 }); break;
      case 'glitch': ev.push(this.addStatus(target, 'glitched', 3, { val: Math.round(S.atk * 0.6) })); break;
      case 'defrag': this.cleanse(p); ev.push({ t: 'cleanse', u: p }); ev.push(this.heal(p, Math.round(p.maxHp * 0.15))); break;
      case 'bruteforce': ev.push(...this.hit(p, target, Math.min(3, 0.8 * (1 + p.heat / 40)))); break;
      case 'dump': { const h = p.heat; p.heat = 0; for (const e of this.enemies) ev.push(...this.applyDamage(p, e, Math.max(1, Math.round((h * 0.9 + S.atk * 0.5) * 40 / (40 + e.def))), {})); ev.push({ t: 'vent', u: p, amt: Math.round(h) }); break; }
      case 'exploit': { const deb = DEBUFFS.some(d => target.statuses[d]); ev.push(...this.hit(p, target, deb ? 2.4 : 1.2)); break; }
      case 'sudo': ev.push(this.addStatus(p, 'sudo', 99)); break;
      case 'rollback': { const best = Math.max(...p.hpHist); ev.push(this.heal(p, best - p.hp)); break; }
      case 'gc': p.pwr = Math.min(p.maxPwr, p.pwr + Math.round(p.maxPwr * 0.4)); ev.push({ t: 'power', u: p }); break;
      case 'hotfix': ev.push(this.addStatus(p, 'hotfix', 4)); break;
      case 'forkbomb': for (let i = 0; i < 2; i++) { const d = this.addDrone('fork'); d.next = p.next + 1 + i; ev.push({ t: 'summon', u: d }); } break;
      case 'turret': if (!this.allies.some(u => u.key === 'turret')) { const d = this.addDrone('turret'); d.next = p.next + 5; ev.push({ t: 'summon', u: d }); } else ev.push({ t: 'log', text: 'A Turret is already deployed.' }); break;
      case 'broadcast': for (const e of this.enemies) { ev.push(...this.hit(p, e, 0.6)); ev.push(this.addStatus(e, 'lag', 1)); } break;
      case 'decompile': ev.push(this.addStatus(target, 'exposed', 3)); break;
      case 'ddos': for (let i = 0; i < 7; i++) { const e = this.pickRandom(this.enemies); if (!e) break; ev.push(...this.hit(p, e, 0.25)); } break;
      case 'backup': ev.push(this.addStatus(p, 'backup', 99)); break;
      case 'panic': ev.push(...this.hit(p, target, 4.0)); break;
    }
    return ev.filter(Boolean);
  }

  useItem(id, tgt) {
    const p = this.player, ev = [];
    if (!this.items[id]) return ev;
    this.items[id]--; if (!this.items[id]) delete this.items[id];
    ev.push({ t: 'log', text: `Jules uses ${ITEMS[id].name}.` });
    switch (id) {
      case 'ramen': ev.push(this.heal(p, 40)); break;
      case 'burrito': ev.push(this.heal(p, 120)); break;
      case 'pizza': ev.push(this.heal(p, Math.round(p.maxHp * 0.6))); break;
      case 'volt': p.pwr = Math.min(p.maxPwr, p.pwr + 15); ev.push({ t: 'power', u: p }); break;
      case 'coldbrew': ev.push(this.addStatus(p, 'overclocked', 3)); break;
      case 'paste': ev.push({ t: 'vent', u: p, amt: Math.round(p.heat) }); p.heat = 0; break;
      case 'gummy': this.cleanse(p); ev.push({ t: 'cleanse', u: p }); break;
      case 'duster': for (const e of this.enemies) ev.push(...this.applyDamage(p, e, 40, {})); break;
      case 'tape': p.shield = Math.max(p.shield, 50); ev.push({ t: 'shield', u: p, amt: p.shield }); break;
    }
    return ev;
  }

  // Skip turn (overheated).
  stunnedTurn(u) {
    u.stunned = false;
    this.endTurn(u, 100);
    return [{ t: 'log', text: 'Jules is OVERHEATED and can\'t act!' }];
  }

  // ---------- drones ----------
  droneAction(d) {
    const ev = [];
    const foes = this.enemies;
    if (!foes.length) return ev;
    if (d.key === 'cam' && !d.acted) {
      const t = foes.find(e => !e.probed) || foes[0];
      t.probed = true; ev.push(this.addStatus(t, 'marked', 3)); ev.push({ t: 'probe', u: t });
      ev.push({ t: 'log', text: 'Webcam Drone scans ' + t.name + '.' });
    } else {
      const t = this.pickRandom(foes);
      ev.push({ t: 'anim', kind: 'drone', u: d, tgt: t });
      ev.push(...this.hit(d, t, 1));
    }
    d.acted++;
    if (d.life && d.acted >= d.life) { d.alive = false; ev.push({ t: 'die', u: d, quiet: true }); }
    this.endTurn(d, 100);
    return ev.filter(Boolean);
  }

  // ---------- enemies ----------
  chooseIntent(u) {
    const d = u.data; let key;
    if (typeof d.ai === 'string') key = BOSS_AI[d.ai].choose(this, u);
    else if (Array.isArray(d.ai)) key = d.ai[u.step++ % d.ai.length];
    else {
      const ents = Object.entries(d.ai.rand), total = ents.reduce((s, [, w]) => s + w, 0);
      let r = this.rng() * total;
      for (const [k, w] of ents) { if ((r -= w) < 0) { key = k; break; } }
      key = key || ents[0][0];
    }
    u.intent = { key, move: d.moves[key] };
    return u.intent;
  }
  // Intent label for UI, with rough damage numbers.
  intentLabel(u) {
    if (!u.intent) return '';
    const m = u.intent.move, p = this.player;
    const est = (pow) => this.calc(u, p, pow, { noRand: true }).dmg;
    switch (m.kind) {
      case 'atk': return `${est(m.pow)}`;
      case 'multi': return `${est(m.pow)}x${m.hits}`;
      case 'aoe': return `${est(m.pow)} ALL`;
      case 'drain': return `${est(m.pow)}`;
      case 'debuff': return m.pow ? `${est(m.pow)}` : '';
      default: return '';
    }
  }

  enemyAction(u) {
    const ev = [];
    const pre = typeof u.data.ai === 'string' && BOSS_AI[u.data.ai].before ? BOSS_AI[u.data.ai].before(this, u) : null;
    if (pre) ev.push(...pre);
    if (!u.alive) return ev;
    const { key, move: m } = u.intent || this.chooseIntent(u);
    ev.push({ t: 'log', text: `${u.name}: ${m.name}` });
    ev.push({ t: 'anim', kind: 'enemy', u, move: m });
    const targets = () => {
      const allies = this.allies;
      const drones = allies.filter(a => a.kind === 'drone');
      if (drones.length && this.rng() < 0.3) return this.pickRandom(drones);
      return this.player;
    };
    const statusTo = (t) => {
      if (!m.status) return;
      let [sid, turns] = m.status;
      if (sid === 'purge') {
        for (const k of BUFFS) delete t.statuses[k];
        t.shield = 0; ev.push({ t: 'status', u: t, id: 'purge', text: 'Buffs deleted!' }); return;
      }
      if (sid === 'random') sid = this.pickRandom(['throttled', 'exposed', 'glitched', 'lag']);
      ev.push(this.addStatus(t, sid, turns, sid === 'glitched' ? { val: Math.max(1, Math.round(u.atk * 0.45 * this.diff.enemyDmg)) } : {}));
    };
    switch (m.kind) {
      case 'atk': case 'drain': { const t = targets(); for (let i = 0; i < m.hits; i++) ev.push(...this.hit(u, t, m.pow)); statusTo(t); if (m.drain && t.kind === 'player') { t.pwr = Math.max(0, t.pwr - m.drain); ev.push({ t: 'log', text: `Drained ${m.drain} Power!` }); } break; }
      case 'multi': { for (let i = 0; i < m.hits; i++) { const t = targets(); ev.push(...this.hit(u, t, m.pow)); } break; }
      case 'aoe': for (const t of this.allies) { ev.push(...this.hit(u, t, m.pow)); statusTo(t); } break;
      case 'debuff': { const t = this.player; if (m.pow) ev.push(...this.hit(u, t, m.pow)); statusTo(t); break; }
      case 'buff': { const tg = m.target === 'allies' ? this.enemies : [u]; for (const t of tg) ev.push(this.addStatus(t, m.status[0], m.status[1])); break; }
      case 'shield': { const tg = m.target === 'allies' ? this.enemies : [u]; for (const t of tg) { t.shield = Math.max(t.shield, Math.round(m.shield <= 1 ? t.maxHp * m.shield : m.shield)); ev.push({ t: 'shield', u: t, amt: t.shield }); } break; }
      case 'heal': {
        if (m.target === 'ally') { const t = this.enemies.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]; ev.push(this.heal(t, Math.round(t.maxHp * m.heal))); }
        else if (m.heal) ev.push(this.heal(u, Math.round(u.maxHp * m.heal)));
        break;
      }
      case 'summon': {
        if (this.enemies.length < 5) { const s = this.addEnemy(m.summon); s.next = u.next + this.delayFor(s, 60); this.chooseIntent(s); ev.push({ t: 'summon', u: s }); }
        else ev.push({ t: 'log', text: 'But there was no room.' });
        break;
      }
      case 'charge': ev.push({ t: 'charge', u }); break;
    }
    const post = typeof u.data.ai === 'string' && BOSS_AI[u.data.ai].after ? BOSS_AI[u.data.ai].after(this, u, key) : null;
    if (post) ev.push(...post);
    if (u.alive) { this.endTurn(u, m.delay); this.chooseIntent(u); }
    return ev.filter(Boolean);
  }

  raidDeath(dead, ev) {
    const drives = this.units.filter(x => x.key === 'drive');
    const deadCount = drives.filter(x => !x.alive).length;
    if (deadCount >= 2 && !this.raidDegraded) {
      this.raidDegraded = true;
      ev.push({ t: 'log', text: 'ARRAY DEGRADED. Parity lost. No more rebuilds!' });
    }
  }

  rewards() {
    let xp = 0, flex = 0;
    for (const u of this.units.filter(x => x.kind === 'enemy')) { xp += u.data.xp; flex += u.data.flex; }
    xp = Math.round(xp * this.diff.xp);
    flex = Math.round(flex * (1 + 0.15 * (this.stats.perks.scavenger || 0)));
    return { xp, flex, killed: this.units.filter(x => x.kind === 'enemy').map(u => u.key) };
  }
}

export { DEBUFFS, BUFFS };
