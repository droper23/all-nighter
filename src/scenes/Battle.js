// Turn-based battle presentation. Logic lives in battle/engine.js; this scene animates its events.
import { Battle as Engine, STATUS_INFO, DEBUFFS, HOT_AT, actionName } from '../battle/engine.js';
import { Input } from '../core/input.js';
import { audio } from '../core/audio.js';
import { G, computeStats, gainXp, DIFFICULTY, makePart, addItem } from '../core/state.js';
import { text, shadowText, panel, bar, C, W, H, ListMenu, toInt, wrapText } from '../core/ui.js';
import { THEMES } from '../art/palette.js';
import { APPS, ITEMS } from '../data/apps.js';
import { FORMS, PARTS } from '../data/parts.js';
import { LOOT } from '../data/enemies.js';

const INTENT_ICON = { atk: '►', multi: '»', aoe: '✶', drain: '►', debuff: '▼', buff: '▲', shield: '■', heal: '+', summon: '@', charge: '!', special: '?' };
const FORM_COL = { raster: 0x5ee0e8, scatter: 0xffe08a, stream: 0xf08a3c, raytrace: 0xffffff, batch: 0xb57aff };
const INTENT_COL = { atk: C.bad, multi: C.bad, aoe: C.bad, drain: C.warn, debuff: C.purple, buff: C.gold, shield: 0x8fb0ff, heal: C.good, summon: C.warn, charge: C.bad, special: C.text };

export class Battle extends Phaser.Scene {
  constructor() { super('Battle'); }

  create(data) {
    this.data0 = data;
    Object.assign(this, { ended: false, resultUpdate: null, waitKey: null, targeting: null, banner: null, lastTarget: null, lastCmd: 0, lastForm: null, menu: null, sub: null, subPanel: null });
    const s = G.state;
    this.keys = new Input(this);
    this.stats = computeStats(s);
    this.eng = new Engine({ player: s, stats: this.stats, enemies: data.group, diff: DIFFICULTY[s.difficulty], preempt: data.preempt, items: s.items, boss: data.boss, canFlee: data.canFlee, known: new Set(Object.keys(s.probed || {})), mods: data.mods, habits: s.habits });
    this.sprites = new Map(); this.busy = true; this.menu = null; this.sub = null; this.ui = [];
    this.drawBackground(data.bg || 'lobby');
    this.layoutUnits(true);
    this.hudG = this.add.graphics().setDepth(500);
    this.timelineObjs = [];
    this.logText = shadowText(this, W / 2, 30, '', C.text).setDepth(600);
    this.buildPanel();
    this.refresh();
    const KEY = { lobby: 0, labs: 2, servers: -3, archive: -5, tunnels: 1, core: -2, void: -6 };
    audio.play(data.music || (data.boss ? 'boss' : 'battle'), { transpose: data.music === 'final' ? 0 : KEY[data.bg] || 0 });
    this.cameras.main.fadeIn(200, 255, 255, 255);
    const intro = data.preempt === 'player' ? 'First strike! You caught them off guard.' : data.preempt === 'enemy' ? 'Ambushed from behind!' : (data.boss ? '' : 'Glitches materialize!');
    this.setLog(intro);
    this.time.delayedCall(500, () => this.loop());
  }

  // ---------- visuals ----------
  drawBackground(theme) {
    const th = THEMES[theme] || THEMES.lobby, key = 'bbg_' + theme;
    if (!this.textures.exists(key)) {
      const c = this.textures.createCanvas(key, W, H), ctx = c.getContext();
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, th.sky[0]); g.addColorStop(0.6, th.sky[1]); g.addColorStop(1, th.sky[0]);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      for (let i = 0; i < 18; i++) { const w = 14 + (i * 37) % 30, h = 30 + (i * 53) % 70; ctx.fillRect((i * 29) % W, 140 - h, w, h); }
      ctx.strokeStyle = th.accent; ctx.globalAlpha = 0.18;
      for (let i = -20; i <= 20; i++) { ctx.beginPath(); ctx.moveTo(W / 2 + i * 8, 120); ctx.lineTo(W / 2 + i * 60, H); ctx.stroke(); }
      for (let j = 0; j < 8; j++) { const y = 120 + Math.pow(j / 8, 2) * 150; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; for (let y = 0; y < H; y += 2) ctx.fillRect(0, y, W, 1);
      c.refresh();
    }
    this.add.image(0, 0, key).setOrigin(0).setDepth(0);
  }
  homeFor(u, i, n) {
    if (u.kind === 'player') return { x: 110, y: 176 };
    if (u.kind === 'drone') return { x: 60 + (i % 2) * 22, y: 120 + i * 26 };
    const big = u.data && u.data.boss;
    if (n === 1) return { x: 340, y: big ? 180 : 170 };
    const cols = [[300, 380, 330, 410, 260], [150, 150, 108, 108, 130]];
    const order = [[0], [0, 1], [0, 1, 2], [0, 1, 2, 3], [0, 1, 2, 3, 4]][n - 1];
    const slots = [{ x: 300, y: 120 }, { x: 400, y: 124 }, { x: 340, y: 180 }, { x: 440, y: 184 }, { x: 250, y: 178 }];
    if (big) return { x: 330, y: 170 };
    return slots[order[i]] || slots[i % 5];
  }
  layoutUnits(initial = false) {
    const enemies = this.eng.units.filter(u => u.side === 'enemy' && (u.alive || this.sprites.has(u.id) && this.sprites.get(u.id).visible));
    const aliveE = this.eng.units.filter(u => u.side === 'enemy' && u.alive);
    const boss = aliveE.find(u => u.data.boss);
    const minions = aliveE.filter(u => !u.data.boss);
    const drones = this.eng.units.filter(u => u.kind === 'drone' && u.alive);
    const place = (u, pos) => {
      let sp = this.sprites.get(u.id);
      if (!sp) {
        sp = this.add.image(pos.x, pos.y, 'bt_' + u.sprite).setOrigin(0.5, 1).setDepth(100 + pos.y);
        sp.setScale(u.kind === 'drone' ? 1.5 : sp.width > 40 ? 1.6 : 2);
        if (u.side === 'enemy') sp.setFlipX(false);
        this.sprites.set(u.id, sp);
        sp.home = pos;
        sp.shadow = this.add.ellipse(pos.x, pos.y, sp.displayWidth * 0.8, 6, 0x000000, 0.4).setDepth(90);
        sp.bob = this.tweens.add({ targets: sp, y: pos.y - 2, yoyo: true, repeat: -1, duration: 700 + Math.random() * 400, ease: 'sine.inOut' });
        if (!initial) { sp.setAlpha(0); this.tweens.add({ targets: sp, alpha: 1, duration: 300 }); }
      } else if (sp.home.y !== pos.y) {
        // moved to a new slot (e.g. a neighbour died): re-seat the idle bob on the new baseline
        if (sp.bob) sp.bob.remove();
        sp.y = pos.y;
        sp.bob = this.tweens.add({ targets: sp, y: pos.y - 2, yoyo: true, repeat: -1, duration: 700 + Math.random() * 400, ease: 'sine.inOut' });
      }
      sp.home = pos; sp.x = pos.x; sp.shadow.x = pos.x; sp.shadow.y = pos.y;
      return sp;
    };
    place(this.eng.player, this.homeFor(this.eng.player));
    drones.forEach((u, i) => place(u, this.homeFor(u, i, drones.length)));
    if (boss) {
      place(boss, { x: 350, y: 178 });
      const mslots = [{ x: 252, y: 116 }, { x: 448, y: 116 }, { x: 258, y: 184 }, { x: 452, y: 184 }];
      minions.forEach((u, i) => place(u, mslots[i % 4]));
    } else aliveE.forEach((u, i) => place(u, this.homeFor(u, i, aliveE.length)));
    void enemies;
  }

  buildPanel() {
    this.add.existing(panel(this, 4, 196, 190, 70).setDepth(400));
    this.add.existing(panel(this, 198, 196, 278, 70).setDepth(400));
    this.pName = text(this, 12, 202, 'JULES', C.accent).setDepth(501);
    this.pHp = text(this, 12, 214, '', C.text).setDepth(501);
    this.pPwr = text(this, 12, 230, '', C.text).setDepth(501);
    this.pHeat = text(this, 12, 246, '', C.text).setDepth(501);
    this.pStat = text(this, 104, 202, '', C.dim).setDepth(501);
    this.infoText = text(this, 290, 204, '', C.dim).setDepth(501);
  }
  refresh() {
    const p = this.eng.player, g = this.hudG;
    g.clear();
    this.pHp.setText(`HP  ${Math.max(0, p.hp)}/${p.maxHp}${p.shield ? '  +' + p.shield : ''}`);
    bar(g, 12, 224, 120, 3, p.hp / p.maxHp, p.hp / p.maxHp < 0.3 ? C.bad : C.good);
    if (p.shield) bar(g, 12, 224, 120, 1, Math.min(1, p.shield / p.maxHp), 0x8fb0ff, 0x8fb0ff);
    this.pPwr.setText(`PWR ${p.pwr}/${p.maxPwr}`);
    bar(g, 12, 240, 120, 3, p.maxPwr ? p.pwr / p.maxPwr : 0, 0xffe08a);
    const hf = p.heat / p.heatCap, hot = hf >= HOT_AT;
    this.pHeat.setText(`HEAT ${Math.round(p.heat)}/${p.heatCap}${p.stunned ? ' OVERHEATED' : hot ? '  HOT +15%' : ''}`);
    bar(g, 12, 256, 120, 4, hf, hf > 0.8 ? C.bad : hot ? C.warn : C.accent);
    g.fillStyle(0xffffff, 0.6).fillRect(12 + Math.round(120 * HOT_AT), 254, 1, 8);
    this.pHeat.setTint(hf > 0.8 ? C.bad : hot ? C.warn : C.text);
    // enemy overhead UI
    this.ui.forEach(o => o.destroy()); this.ui = [];
    this.chips(g, 104, 202, p, 84);
    const crowd = this.eng.enemies.length >= 3;
    for (const u of this.eng.units) {
      if (!u.alive) continue;
      const sp = this.sprites.get(u.id); if (!sp) continue;
      const top = sp.home.y - sp.displayHeight - 4;
      if (u.side === 'enemy' || u.kind === 'drone') {
        const w = Math.max(26, Math.min(48, sp.displayWidth));
        bar(g, sp.home.x - w / 2, sp.home.y + 4, w, 2, u.hp / u.maxHp, u.side === 'enemy' ? C.bad : C.good);
        if (u.shield) bar(g, sp.home.x - w / 2, sp.home.y + 7, w, 1, Math.min(1, u.shield / u.maxHp), 0x8fb0ff);
        this.chips(g, sp.home.x, sp.home.y + 10, u, 80, true);
      }
      if (u.side === 'enemy' && u.intent) this.drawIntent(g, u, sp.home.x, Math.max(44, top - 8), crowd);
    }
    this.drawTimeline();
    const boss = this.eng.enemies.find(u => u.boss);
    audio.setIntensity(p.hp < p.maxHp * 0.35 ? 2 : boss && (boss.mem.phase || boss.mem.p2 || boss.hp < boss.maxHp * 0.5) ? 1 : 0);
  }
  // Status chips: colored tag + turns left.
  chips(g, x, y, u, maxW, centered = false) {
    const list = Object.entries(u.statuses).filter(([k]) => k !== 'guarding' || u.kind === 'player').map(([k, v]) => {
      const info = STATUS_INFO[k] || { short: k.slice(0, 3).toUpperCase(), color: '#f2f0e6' };
      const n = v.turns >= 99 ? '' : String(v.turns);
      return { str: info.short + n, col: toInt(info.color) };
    });
    if (!list.length) return;
    const widths = list.map(c => c.str.length * 6 + 3);
    const rows = []; let row = [], rw = 0;
    list.forEach((c, i) => { if (rw + widths[i] > maxW && row.length) { rows.push([row, rw]); row = []; rw = 0; } row.push([c, widths[i]]); rw += widths[i] + 2; });
    rows.push([row, rw]);
    rows.forEach(([r, total], ri) => {
      let cx = centered ? x - total / 2 : x;
      for (const [c, cw] of r) {
        const cy = y + ri * 10;
        g.fillStyle(0x000000, 0.75).fillRect(cx, cy, cw, 9);
        g.fillStyle(c.col, 1).fillRect(cx, cy, 1, 9);
        this.ui.push(text(this, cx + 2, cy + 1, c.str, c.col).setDepth(511));
        cx += cw + 2;
      }
    });
  }
  // Intent badge: icon, move name and estimated damage. "!" charges blink.
  drawIntent(g, u, x, y, compact) {
    const m = u.intent.move, lbl = this.eng.intentLabel(u);
    const col = INTENT_COL[m.kind] || C.text;
    let str;
    if (m.kind === 'charge') str = `! ${compact ? 'CHARGE' : m.name.slice(0, 14)}`;
    else str = `${INTENT_ICON[m.kind] || '?'}${compact ? '' : ' ' + m.name.slice(0, 12)}${lbl ? ' ' + lbl : ''}`;
    const w = str.length * 6 + 6, bx = Math.round(x - w / 2);
    const blink = m.kind === 'charge' && Math.floor(this.time.now / 300) % 2;
    g.fillStyle(blink ? 0x4a1018 : 0x000000, 0.8).fillRect(bx, y - 2, w, 11);
    g.lineStyle(1, col, 0.9).strokeRect(bx + 0.5, y - 1.5, w - 1, 10);
    this.ui.push(text(this, bx + 3, y, str, col).setDepth(512));
    if (u.mem && u.mem.predict) {
      const ps = `expects: ${actionName(u.mem.predict)}`;
      const pw = ps.length * 6 + 6;
      g.fillStyle(0x1a0a20, 0.9).fillRect(Math.round(x - pw / 2), y - 13, pw, 10);
      this.ui.push(text(this, Math.round(x - pw / 2) + 3, y - 12, ps, 0xd4a0ff).setDepth(512));
    }
  }
  drawTimeline() {
    this.timelineObjs.forEach(o => o.destroy()); this.timelineObjs = [];
    const order = this.eng.preview(10);
    const x0 = 6, y0 = 4, cw = 22;
    const g = this.add.graphics().setDepth(600);
    g.fillStyle(0x000000, 0.6).fillRect(x0 - 2, y0 - 2, 40 + order.length * cw, 38);
    this.timelineObjs.push(g, text(this, x0 + 1, y0 + 2, 'TURN', C.dim).setDepth(601), text(this, x0 + 1, y0 + 12, 'ORDER', C.dim).setDepth(601));
    order.forEach((u, i) => {
      const x = x0 + 36 + i * cw, y = y0, me = u.side === 'player';
      g.fillStyle(me ? 0x1f5f6a : 0x4a1018, 1).fillRect(x, y, 20, 20);
      if (u.kind === 'player') g.lineStyle(1, 0x5ee0e8, 1).strokeRect(x + 0.5, y + 0.5, 19, 19);
      if (i === 0) { g.lineStyle(2, 0xffe08a, 1).strokeRect(x - 1, y - 1, 22, 22); }
      const key = u.kind === 'player' ? 'pt_jules' : 'bt_' + u.sprite;
      const im = this.add.image(x + 10, y + 10, key).setDepth(602);
      const sc = Math.min(18 / im.width, 18 / im.height); im.setScale(sc);
      this.timelineObjs.push(im);
      // enemy's next move, as a colored pip under its first appearance
      if (u.side === 'enemy' && u.intent && order.indexOf(u) === i) {
        const col = INTENT_COL[u.intent.move.kind] || C.text;
        g.fillStyle(0x000000, 1).fillRect(x + 12, y + 14, 9, 9);
        this.timelineObjs.push(text(this, x + 14, y + 15, INTENT_ICON[u.intent.move.kind] || '?', col).setDepth(603));
      }
    });
    if (order[0]) this.timelineObjs.push(text(this, x0 + 36, y0 + 25, order[0].kind === 'player' ? 'YOUR TURN' : order[0].name, order[0].kind === 'player' ? C.accent : C.dim).setDepth(601));
  }
  setLog(t) { this.logText.setText(t || ''); this.logText.x = W / 2 - (t || '').length * 3; this.logText.shadow.x = this.logText.x + 1; }

  popup(u, str, color, big = false) {
    const sp = this.sprites.get(u.id); if (!sp) return;
    const size = big ? 2 : 1;
    const t = shadowText(this, sp.home.x - str.length * 3 * size + (Math.random() * 10 - 5), sp.home.y - sp.displayHeight / 2 - 6, str, color, size).setDepth(700);
    t.setScale(size * 1.8); t.shadow.setScale(size * 1.8);
    this.tweens.add({ targets: [t, t.shadow], scale: size, duration: 110, ease: 'back.out' });
    this.tweens.add({ targets: [t, t.shadow], y: '-=18', alpha: 0, delay: 380, duration: 700, ease: 'quad.out', onComplete: () => t.destroy() });
  }
  // Freeze motion for a beat so hits land.
  hitStop(ms) {
    this.tweens.pauseAll();
    this.time.delayedCall(ms, () => this.tweens.resumeAll());
  }
  // One-time contextual tips for new players.
  tip(id, str) {
    const s = G.state;
    if (s.flags['tip_' + id] || this.tipObjs) return false;
    s.flags['tip_' + id] = true;
    const lines = wrapText(str, 264);
    const h = lines.length * 10 + 12;
    this.tipObjs = [panel(this, 90, 188 - h, 300, h, { fill: 0x10202a, edge: 0x5ee0e8, hi: 0xa8f4f8 }).setDepth(560), text(this, 98, 194 - h, 'TIP', C.gold).setDepth(561), text(this, 120, 194 - h, lines.join('\n'), C.text).setDepth(561)];
    this.tipObjs.forEach(o => this.add.existing(o));
    return true;
  }
  clearTip() { if (this.tipObjs) { this.tipObjs.forEach(o => o.destroy()); this.tipObjs = null; } }
  flash(u) {
    const sp = this.sprites.get(u.id); if (!sp) return;
    sp.setTintFill(0xffffff);
    this.time.delayedCall(70, () => sp.clearTint());
    this.tweens.add({ targets: sp, x: sp.home.x + (u.side === 'enemy' ? 4 : -4), duration: 40, yoyo: true, repeat: 1, onComplete: () => { sp.x = sp.home.x; } });
  }
  shot(src, tgt, form, idx = 0) {
    const a = this.sprites.get(src.id), b = this.sprites.get(tgt.id); if (!a || !b) return;
    const x0 = a.home.x + (src.side === 'player' ? 14 : -10), y0 = a.home.y - a.height * 0.55;
    const x1 = b.home.x + (Math.random() - 0.5) * 8, y1 = b.home.y - b.displayHeight / 2 + (Math.random() - 0.5) * 8;
    const col = FORM_COL[form] || 0xe0485e;
    const burst = (r = 4, c = col) => { const o = this.add.circle(x1, y1, r, c, 0.9).setDepth(651); this.tweens.add({ targets: o, scale: 2.2, alpha: 0, duration: 180, onComplete: () => o.destroy() }); };
    if (form === 'scatter' || form === 'stream') {
      const pel = this.add.rectangle(x0, y0, form === 'stream' ? 5 : 3, form === 'stream' ? 2 : 3, col).setDepth(650);
      pel.rotation = Math.atan2(y1 - y0, x1 - x0);
      this.tweens.add({ targets: pel, x: x1, y: y1, duration: form === 'stream' ? 70 : 110, onComplete: () => { pel.destroy(); burst(form === 'stream' ? 2 : 3); } });
      return;
    }
    const g = this.add.graphics().setDepth(650);
    if (form === 'raytrace') {
      g.lineStyle(9, 0xbfe8ff, 0.35).lineBetween(x0, y0, x1, y1);
      g.lineStyle(3, 0xffffff, 1).lineBetween(x0, y0, x1, y1);
      this.cameras.main.flash(90, 220, 240, 255);
      burst(7, 0xffffff);
    } else if (form === 'batch') {
      const ring = this.add.circle(x1, y1, 6).setStrokeStyle(2, col).setDepth(651);
      this.tweens.add({ targets: ring, scale: 3, alpha: 0, duration: 260, onComplete: () => ring.destroy() });
      g.lineStyle(1, col, 0.8).lineBetween(x0, y0, x1, y1);
    } else {
      g.lineStyle(form === 'enemy' ? 2 : 2, col, 1).lineBetween(x0, y0, x1, y1);
      burst(form === 'enemy' ? 3 : 4);
    }
    if (src.side === 'player' && idx === 0) { const m = this.add.circle(x0, y0, 4, 0xffffff, 1).setDepth(652); this.tweens.add({ targets: m, scale: 0.2, alpha: 0, duration: 100, onComplete: () => m.destroy() }); }
    this.tweens.add({ targets: g, alpha: 0, duration: form === 'raytrace' ? 260 : 160, onComplete: () => g.destroy() });
  }
  // Per-form muzzle wind-up before the shots.
  windUp(form) {
    const sp = this.sprites.get(this.eng.player.id);
    const x = sp.home.x + 14, y = sp.home.y - sp.height * 0.55;
    if (form === 'raytrace') {
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2, d = this.add.rectangle(x + Math.cos(a) * 24, y + Math.sin(a) * 24, 2, 2, 0xffffff).setDepth(652);
        this.tweens.add({ targets: d, x, y, duration: 260, onComplete: () => d.destroy() });
      }
      this.tweens.add({ targets: sp, x: sp.home.x - 6, duration: 260 });
      return 300;
    }
    if (form === 'batch') {
      const arc = this.add.circle(x, y, 4).setStrokeStyle(2, FORM_COL.batch).setDepth(652);
      this.tweens.add({ targets: arc, scale: 4, alpha: 0, duration: 240, onComplete: () => arc.destroy() });
      return 200;
    }
    if (form === 'stream') { this.tweens.add({ targets: sp, x: sp.home.x - 2, duration: 30, yoyo: true, repeat: 4 }); return 90; }
    if (form === 'scatter') { this.tweens.add({ targets: sp, angle: -6, duration: 60, yoyo: true }); return 110; }
    this.tweens.add({ targets: sp, x: sp.home.x - 4, duration: 60, yoyo: true });
    return 110;
  }

  // ---------- turn loop ----------
  loop() {
    if (this.ended) return;
    const out = this.eng.outcome();
    if (out) return this.finish(out);
    this.refresh();
    const u = this.eng.nextUnit();
    const ev = this.eng.startTurn(u);
    this.play(ev, () => {
      if (this.eng.outcome()) return this.loop();
      if (!u.alive) return this.loop();
      this.refresh();
      if (u.kind === 'player') {
        if (u.stunned) return this.play(this.eng.stunnedTurn(u), () => this.loop());
        return this.openCommands();
      }
      if (u.kind === 'drone') return this.time.delayedCall(250, () => this.play(this.eng.droneAction(u), () => this.loop()));
      const sp = this.sprites.get(u.id);
      if (sp) this.tweens.add({ targets: sp, alpha: 0.6, yoyo: true, duration: 120 });
      this.time.delayedCall(380, () => this.play(this.eng.enemyAction(u), () => this.loop()));
    });
  }

  play(events, done) {
    const list = events.filter(Boolean);
    const step = () => {
      if (!list.length) { this.refresh(); return done(); }
      const e = list.shift();
      const wait = this.show(e);
      this.refresh();
      if (wait === 'key') { this.waitKey = step; return; }
      this.time.delayedCall(wait, step);
    };
    step();
  }
  show(e) {
    switch (e.t) {
      case 'log': this.setLog(e.text); return 380;
      case 'anim': {
        if (e.kind === 'attack') {
          audio.sfx(e.form === 'raytrace' ? 'laser' : e.form === 'batch' ? 'wave' : e.form === 'stream' ? 'burst' : 'zap');
          this.setLog(`Jules fires: ${FORMS[e.form].name}!`);
          this.lastForm = e.form; this.shotIdx = 0;
          return this.windUp(e.form);
        }
        if (e.kind === 'app') {
          const sp = this.sprites.get(e.u.id);
          this.tweens.add({ targets: sp, x: sp.home.x + 10, duration: 90, yoyo: true });
          audio.sfx('buff'); this.lastForm = 'raster'; this.shotIdx = 0;
          return 160;
        }
        if (e.kind === 'enemy') {
          const sp = this.sprites.get(e.u.id); if (!sp) return 100;
          this.lastForm = null;
          this.tweens.add({ targets: sp, x: sp.home.x - 16, duration: 110, yoyo: true, ease: 'quad.out' });
          return 200;
        }
        if (e.kind === 'drone') { this.lastForm = 'raster'; audio.sfx('zap'); return 120; }
        return 100;
      }
      case 'hit': {
        const form = e.src && e.src.side === 'player' ? (this.lastForm || 'raster') : 'enemy';
        if (e.src && e.src.alive !== undefined && e.tgt && e.label !== 'glitch' && e.label !== 'reflect') this.shot(e.src, e.tgt, form, this.shotIdx++);
        this.flash(e.tgt);
        audio.sfx(e.crit ? 'crit' : 'hit');
        const heavy = e.dmg > e.tgt.maxHp * 0.15;
        if (e.tgt.kind === 'player') this.cameras.main.shake(heavy ? 200 : 110, heavy ? 0.014 : 0.005);
        else if (e.crit || heavy) this.cameras.main.shake(90, e.crit ? 0.006 : 0.004);
        const stop = e.crit ? 110 : heavy ? 70 : form === 'stream' || form === 'scatter' ? 0 : 35;
        if (stop) this.hitStop(stop);
        if (e.absorbed) this.popup(e.tgt, `-${e.absorbed}`, 0x8fb0ff);
        if (e.dmg > 0 || !e.absorbed) this.popup(e.tgt, `${e.dmg}${e.crit ? '!' : ''}`, e.crit ? C.gold : e.label === 'glitch' ? C.purple : e.weak ? C.warn : C.text, e.crit || heavy);
        if (e.weak) this.time.delayedCall(80, () => this.popup(e.tgt, this.eng.knows(e.tgt) ? 'WEAK!' : 'weak?', C.warn));
        if (e.resist) this.time.delayedCall(80, () => this.popup(e.tgt, 'resist', C.dim));
        const fast = form === 'stream' ? 90 : form === 'scatter' ? 120 : 170;
        return (e.crit ? 260 : fast) + stop;
      }
      case 'predict': {
        audio.sfx(e.hit ? 'debuff' : 'glitch');
        this.popup(e.u, e.hit ? 'PREDICTED' : 'SURPRISED', e.hit ? C.bad : C.good, true);
        this.setLog(e.text); return 650;
      }
      case 'die': {
        const sp = this.sprites.get(e.u.id); if (!sp) return 50;
        if (!e.quiet) audio.sfx('enemyDie');
        this.tweens.killTweensOf(sp);
        this.tweens.add({ targets: sp, alpha: 0, scaleX: 1.3, scaleY: 0.2, duration: 300, onComplete: () => { sp.setVisible(false); sp.shadow.setVisible(false); } });
        for (let i = 0; i < 10; i++) {
          const d = this.add.rectangle(sp.home.x, sp.home.y - sp.displayHeight / 2, 2, 2, [0xe0485e, 0x5ee0e8, 0xffe08a, 0x9a5ad8][i % 4]).setDepth(650);
          this.tweens.add({ targets: d, x: d.x + (Math.random() - 0.5) * 60, y: d.y + (Math.random() - 0.5) * 50, alpha: 0, duration: 500, onComplete: () => d.destroy() });
        }
        if (e.u.kind !== 'player') this.time.delayedCall(320, () => { this.sprites.delete(e.u.id); sp.shadow.destroy(); sp.destroy(); this.layoutUnits(); });
        return 330;
      }
      case 'heal': if (e.amt > 0) { audio.sfx('heal'); this.popup(e.u, `+${e.amt}`, C.good); } return 220;
      case 'status': this.popup(e.u, e.text, toInt((STATUS_INFO[e.id] || { color: '#f2f0e6' }).color)); audio.sfx(DEBUFFS.includes(e.id) ? 'debuff' : 'buff'); return 260;
      case 'shield': audio.sfx('shield'); this.popup(e.u, `ENCRYPT ${e.amt}`, 0x8fb0ff); return 260;
      case 'summon': audio.sfx('summon'); this.layoutUnits(); this.popup(e.u, e.u.name, C.warn); return 320;
      case 'revive': {
        let sp = this.sprites.get(e.u.id);
        if (e.u.kind === 'enemy') { if (sp) { sp.shadow.destroy(); sp.destroy(); this.sprites.delete(e.u.id); } this.layoutUnits(); }
        audio.sfx('heal'); this.setLog(e.text || ''); this.popup(e.u, 'RESTORED', C.good); return 500;
      }
      case 'overheat': {
        audio.sfx('overheat');
        this.cameras.main.flash(250, 224, 72, 94);
        const t = shadowText(this, W / 2 - 48, 90, 'OVERHEAT!', C.bad, 2).setDepth(800);
        this.tweens.add({ targets: [t, t.shadow], alpha: 0, delay: 600, duration: 300, onComplete: () => t.destroy() });
        return 700;
      }
      case 'vent': {
        audio.sfx('vent');
        const sp = this.sprites.get(e.u.id);
        for (let i = 0; i < 12; i++) {
          const d = this.add.circle(sp.home.x + 10, sp.home.y - 18, 3, 0xf2f0e6, 0.7).setDepth(650);
          this.tweens.add({ targets: d, x: d.x + (Math.random() - 0.3) * 50, y: d.y - 30 - Math.random() * 30, alpha: 0, scale: 3, duration: 600 + Math.random() * 300, onComplete: () => d.destroy() });
        }
        this.popup(e.u, `-${e.amt} HEAT`, C.accent); return 350;
      }
      case 'power': audio.sfx('buff'); this.popup(e.u, 'POWER UP', 0xffe08a); return 250;
      case 'cleanse': audio.sfx('heal'); this.popup(e.u, 'CLEANSED', C.good); return 250;
      case 'tick': return 0;
      case 'charge': {
        const sp = this.sprites.get(e.u.id);
        if (sp) { sp.setTint(0xff6b6b); this.time.delayedCall(400, () => sp.clearTint()); }
        audio.sfx('debuff'); this.popup(e.u, 'CHARGING!', C.bad); return 400;
      }
      case 'probe': {
        const d = e.u.data;
        G.state.probed = G.state.probed || {}; G.state.probed[e.u.key] = true;
        const sp = this.sprites.get(e.u.id);
        if (sp) { const ring = this.add.rectangle(sp.home.x, sp.home.y - sp.displayHeight / 2, sp.displayWidth + 6, sp.displayHeight + 6).setStrokeStyle(1, 0x5ee0e8).setDepth(650); this.tweens.add({ targets: ring, alpha: 0, scale: 1.3, duration: 500, onComplete: () => ring.destroy() }); }
        const w = d.weak.length ? 'Weak: ' + d.weak.join(', ') : 'No weakness';
        const r = d.resist.length ? '  Resists: ' + d.resist.join(', ') : '';
        this.setLog(`${e.u.name}: ${w}${r}`); audio.sfx('tool'); return 900;
      }
      case 'phase': {
        const sp = this.sprites.get(e.u.id);
        this.cameras.main.shake(300, 0.01); audio.sfx('glitch');
        if (sp) { sp.setTintFill(0xff6b6b); this.time.delayedCall(200, () => sp.clearTint()); }
        if (e.text) { this.showBanner(e.text); return 'key'; }
        return 500;
      }
      case 'flee': if (e.ok) { audio.sfx('back'); this.finish('fled'); return 99999; } this.setLog(e.text); audio.sfx('error'); return 500;
      default: return 50;
    }
  }
  showBanner(str) {
    const lines = wrapText(str, W - 80);
    const h = lines.length * 10 + 16;
    this.banner = [panel(this, 30, 70, W - 60, h, { fill: 0x1a0a20, edge: 0x9a5ad8, hi: 0xd4a0ff }).setDepth(900), text(this, 40, 78, lines.join('\n'), 0xd4a0ff).setDepth(901)];
    this.banner.forEach(b => this.add.existing(b));
  }

  // ---------- commands ----------
  openCommands() {
    this.busy = false;
    const st = this.stats, p = this.eng.player, e = this.eng;
    this.setLog('');
    const foes = e.enemies;
    if (foes.some(u => u.data.ai === 'minima' && u.mem.predict)) this.tip('predict', 'MINIMA shows what it expects you to do next. Do something else and it is Exposed. Do what it expects and it counters.');
    else if (p.heat >= p.heatCap * HOT_AT) this.tip('heat', 'You are Running Hot: +15% damage. At max Heat you Overheat and lose a turn. Vent or Guard to cool down.');
    else if (foes.some(u => u.intent && u.intent.move.kind === 'charge')) this.tip('charge', 'A Glitch is CHARGING. Its next move hits hard. Guard halves it.');
    else if (st.apps.includes('probe') && foes.some(u => !e.knows(u) && u.data.weak.length)) this.tip('probe', 'Probe reveals a Glitch\'s weak points. Once probed, hits on its weakness do full bonus damage, forever.');
    else if (foes.some(u => u.boss)) this.tip('boss', 'Bosses have a trick. Read the Glitchdex entry (and its intents) before you mash Attack.');
    else this.tip('timeline', 'The bar at the top is the turn order. Icons over Glitches show their next move and damage.');
    const items = [
      { label: `Attack  ${FORMS[st.form].name}`, act: 'attack' },
      { label: 'Apps', act: 'apps', disabled: !st.apps.length },
      { label: 'Guard', act: 'guard' },
      { label: `Vent  -${50 + st.cool} heat`, act: 'vent', disabled: p.heat <= 0 },
      { label: 'Items', act: 'items', disabled: !Object.keys(this.eng.items).some(k => ITEMS[k] && ITEMS[k].battle) },
      { label: 'Flee', act: 'flee', disabled: !this.eng.canFlee },
    ];
    this.menu = new ListMenu(this, 206, 203, 128, items, {
      rows: 6, lineH: 10, depth: 520, cursor: this.lastCmd || 0,
      onSelect: (it, i) => { this.lastCmd = i; this.command(it.act); },
      onMove: (it) => this.describe(it.act),
    });
    this.describe(items[this.menu.cursor].act);
  }
  describe(act, extra) {
    const st = this.stats, f = FORMS[st.form];
    const desc = {
      attack: (() => { const p = this.eng.player, h = Math.round(f.heat * this.eng.heatMul()), after = p.heat + h; return `${f.desc}\nHeat +${h} (${Math.round(after)}/${p.heatCap})${after >= p.heatCap ? ' OVERHEAT!' : ''}`; })(),
      apps: 'Run an App from RAM. Costs Power.',
      guard: 'Halve damage until your next turn. Sheds a little Heat. Quick.',
      vent: 'Dump heat fast. Costs tempo, not Power.',
      items: 'Snacks and supplies.',
      flee: 'Try to escape. Not from bosses.',
    }[act] || extra || '';
    this.infoText.setText(wrapText(desc, 128).join('\n'));
    this.infoText.x = 340;
  }
  closeMenus() { if (this.menu) { this.menu.destroy(); this.menu = null; } if (this.sub) { this.sub.destroy(); this.sub = null; } if (this.subPanel) { this.subPanel.destroy(); this.subPanel = null; } this.infoText.setText(''); }

  command(act) {
    if (act === 'attack') return this.pickTarget(FORMS[this.stats.form].target, (t) => this.doAction({ type: 'attack', target: t }));
    if (act === 'guard') return this.doAction({ type: 'guard' });
    if (act === 'vent') return this.doAction({ type: 'vent' });
    if (act === 'flee') return this.doAction({ type: 'flee' });
    if (act === 'apps') return this.openSub(this.stats.apps.map(id => {
      const a = APPS[id], cost = this.eng.appCost(id);
      return { label: a.name, right: `${cost}P`, rightColor: 0xffe08a, id, disabled: this.eng.player.pwr < cost, desc: a.desc };
    }), (it) => this.pickTarget(APPS[it.id].target, (t) => this.doAction({ type: 'app', app: it.id, target: t })));
    if (act === 'items') return this.openSub(Object.entries(this.eng.items).filter(([k]) => ITEMS[k] && ITEMS[k].battle).map(([k, n]) => ({ label: ITEMS[k].name, right: 'x' + n, id: k, desc: ITEMS[k].desc })), (it) => this.doAction({ type: 'item', item: it.id }));
  }
  openSub(items, onPick) {
    this.menu.setActive(false);
    this.subPanel = panel(this, 200, 110, 140, 84).setDepth(530);
    this.sub = new ListMenu(this, 206, 116, 130, items, {
      rows: 7, lineH: 10, depth: 540,
      onSelect: (it) => { this.sub.destroy(); this.sub = null; this.subPanel.destroy(); this.subPanel = null; onPick(it); },
      onBack: () => { this.sub.destroy(); this.sub = null; this.subPanel.destroy(); this.subPanel = null; this.menu.setActive(true); this.describe(this.menu.items[this.menu.cursor].act); },
      onMove: (it) => this.infoText.setText(wrapText(it.desc || '', 130).join('\n')),
    });
    if (items[0]) this.infoText.setText(wrapText(items[0].desc || '', 130).join('\n'));
  }
  pickTarget(kind, cb) {
    if (kind !== 'one') return cb(null);
    const foes = this.eng.enemies;
    if (foes.length === 1) return cb(foes[0]);
    if (this.menu) this.menu.setActive(false);
    let idx = Math.max(0, foes.indexOf(this.lastTarget));
    const cursor = text(this, 0, 0, '▼', C.gold).setDepth(800);
    const showInfo = () => {
      const u = foes[idx], sp = this.sprites.get(u.id);
      cursor.setPosition(sp.home.x - 3, sp.home.y - sp.displayHeight - 18);
      const w = u.probed ? ` W:${u.data.weak.join(',') || '-'}` : '';
      this.setLog(`${u.name}  ${u.hp}/${u.maxHp}${w}`);
    };
    showInfo();
    this.targeting = (input, delta) => {
      const d = input.nav(delta);
      if (d === 'left' || d === 'up') { idx = (idx - 1 + foes.length) % foes.length; audio.sfx('move'); showInfo(); }
      else if (d === 'right' || d === 'down') { idx = (idx + 1) % foes.length; audio.sfx('move'); showInfo(); }
      else if (input.pressed('ok')) { audio.sfx('select'); cursor.destroy(); this.targeting = null; this.lastTarget = foes[idx]; cb(foes[idx]); }
      else if (input.pressed('back')) { audio.sfx('back'); cursor.destroy(); this.targeting = null; this.setLog(''); if (this.menu) this.menu.setActive(true); }
    };
  }
  doAction(a) {
    this.clearTip();
    this.closeMenus();
    this.busy = true;
    const ev = this.eng.playerAction(a);
    this.play(ev, () => this.loop());
  }

  update(time, delta) {
    if (this.waitKey) {
      if (this.keys.pressed('ok') || this.keys.pressed('back')) { const f = this.waitKey; this.waitKey = null; if (this.banner) { this.banner.forEach(b => b.destroy()); this.banner = null; } f(); }
      return;
    }
    if (this.resultUpdate) return this.resultUpdate();
    if (this.targeting) return this.targeting(this.keys, delta);
    if (this.sub) return this.sub.update(this.keys, delta);
    if (this.menu && !this.busy) this.menu.update(this.keys, delta);
  }

  // ---------- end ----------
  finish(outcome) {
    if (this.ended) return; this.ended = true;
    this.closeMenus();
    const s = G.state;
    s.hp = Math.max(1, this.eng.player.hp);
    s.stats.battles++;
    // MINIMA is watching: remember how Jules fights, across the whole night.
    s.habits = s.habits || { forms: {}, actions: {} };
    for (const [k, n] of Object.entries(this.eng.memory.forms)) s.habits.forms[k] = (s.habits.forms[k] || 0) + n;
    for (const [k, n] of Object.entries(this.eng.memory.actions)) s.habits.actions[k] = (s.habits.actions[k] || 0) + n;
    if (outcome === 'win') {
      s.stats.wins++;
      const r = this.eng.rewards();
      s.dex = s.dex || {};
      r.killed.forEach(k => { s.dex[k] = (s.dex[k] || 0) + 1; });
      s.flex += r.flex;
      const ups = gainXp(s, r.xp);
      if (!ups.length) s.hp = Math.max(1, this.eng.player.hp);
      const drops = this.rollDrops(r.killed);
      audio.stop(); audio.sfx('victory');
      const lines = [`+${r.xp} XP    +$${r.flex}`];
      if (ups.length) lines.push(`LEVEL UP! Jules is now level ${s.level}. HP fully restored.`);
      drops.forEach(d => lines.push(d));
      this.showResult('SYSTEM CLEAN', C.good, lines, () => this.exit({ outcome }));
      if (ups.length) this.time.delayedCall(600, () => audio.sfx('levelup'));
    } else if (outcome === 'lose') {
      audio.stop(); audio.sfx('enemyDie');
      this.showResult('SYSTEM FAILURE', C.bad, ['Jules collapses. The Build reboots...', 'You wake at the last Outlet you used.'], () => this.exit({ outcome }));
    } else this.time.delayedCall(300, () => this.exit({ outcome }));
  }
  rollDrops(killed) {
    const s = G.state, out = [];
    const sector = this.data0.bg || 'lobby';
    const table = LOOT[sector] || LOOT.lobby;
    for (const k of killed) {
      const e = this.eng.units.find(u => u.key === k).data;
      if (e.boss) continue;
      const r = Math.random();
      if (r < (e.minion ? 0.03 : 0.11)) {
        const id = table.parts[Math.floor(Math.random() * table.parts.length)];
        s.parts.push(makePart(id)); out.push(`Salvaged: ${PARTS[id].name}`);
      } else if (r < 0.3) {
        const id = table.items[Math.floor(Math.random() * table.items.length)];
        addItem(s, id); out.push(`Found: ${ITEMS[id].name}`);
      } else if (r < 0.75) { const n = 1 + Math.floor(Math.random() * 2); s.mats.scrap += n; out.push(`Scrap x${n}`); }
      if (Math.random() < (e.minion ? 0.02 : 0.07)) { s.mats.silicon++; out.push('Silicon x1'); }
    }
    const merged = {};
    out.forEach(l => { merged[l] = (merged[l] || 0) + 1; });
    return Object.entries(merged).map(([l, n]) => (n > 1 && !l.startsWith('Scrap') ? `${l} x${n}` : l)).slice(0, 5);
  }
  showResult(title, color, lines, cb) {
    const h = 40 + lines.length * 11;
    this.add.existing(panel(this, 90, 70, 300, h).setDepth(900));
    shadowText(this, 240 - title.length * 6, 78, title, color, 2).setDepth(901);
    lines.forEach((l, i) => text(this, 104, 100 + i * 11, l, i === 0 ? C.gold : C.text).setDepth(901));
    let ready = false;
    this.time.delayedCall(500, () => { ready = true; });
    this.resultUpdate = () => { if (ready && (this.keys.pressed('ok') || this.keys.pressed('back'))) { this.resultUpdate = () => {}; cb(); } };
  }
  exit(result) {
    this.cameras.main.fadeOut(200, 7, 6, 12);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop();
      this.scene.wake('World', result);
    });
  }
}
