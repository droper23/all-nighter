// Turn-based battle presentation. Logic lives in battle/engine.js; this scene animates its events.
import { Battle as Engine, STATUS_INFO, DEBUFFS } from '../battle/engine.js';
import { Input } from '../core/input.js';
import { audio } from '../core/audio.js';
import { G, computeStats, gainXp, DIFFICULTY, makePart, addItem } from '../core/state.js';
import { text, shadowText, panel, bar, C, W, H, ListMenu, toInt, wrapText } from '../core/ui.js';
import { THEMES } from '../art/palette.js';
import { APPS, ITEMS } from '../data/apps.js';
import { FORMS, PARTS } from '../data/parts.js';
import { LOOT } from '../data/enemies.js';

const INTENT_ICON = { atk: '►', multi: '»', aoe: '✶', drain: '►', debuff: '▼', buff: '▲', shield: '■', heal: '+', summon: '@', charge: '!', special: '?' };
const INTENT_COL = { atk: C.bad, multi: C.bad, aoe: C.bad, drain: C.warn, debuff: C.purple, buff: C.gold, shield: 0x8fb0ff, heal: C.good, summon: C.warn, charge: C.bad, special: C.text };

export class Battle extends Phaser.Scene {
  constructor() { super('Battle'); }

  create(data) {
    this.data0 = data;
    Object.assign(this, { ended: false, resultUpdate: null, waitKey: null, targeting: null, banner: null, lastTarget: null, lastCmd: 0, lastForm: null, menu: null, sub: null, subPanel: null });
    const s = G.state;
    this.keys = new Input(this);
    this.stats = computeStats(s);
    this.eng = new Engine({ player: s, stats: this.stats, enemies: data.group, diff: DIFFICULTY[s.difficulty], preempt: data.preempt, items: s.items, boss: data.boss, canFlee: data.canFlee });
    this.sprites = new Map(); this.busy = true; this.menu = null; this.sub = null; this.ui = [];
    this.drawBackground(data.bg || 'lobby');
    this.layoutUnits(true);
    this.hudG = this.add.graphics().setDepth(500);
    this.timelineObjs = [];
    this.logText = shadowText(this, W / 2, 30, '', C.text).setDepth(600);
    this.buildPanel();
    this.refresh();
    audio.play(data.music || (data.boss ? 'boss' : 'battle'));
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
        this.tweens.add({ targets: sp, y: pos.y - 2, yoyo: true, repeat: -1, duration: 700 + Math.random() * 400, ease: 'sine.inOut' });
        if (!initial) { sp.setAlpha(0); this.tweens.add({ targets: sp, alpha: 1, duration: 300 }); }
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
    const hf = p.heat / p.heatCap;
    this.pHeat.setText(`HEAT ${Math.round(p.heat)}/${p.heatCap}${p.stunned ? ' OVERHEATED' : ''}`);
    bar(g, 12, 256, 120, 4, hf, hf > 0.75 ? C.bad : hf > 0.5 ? C.warn : C.accent);
    this.pHeat.setTint(hf > 0.75 ? C.bad : C.text);
    // statuses
    const sts = Object.keys(p.statuses).map(k => (STATUS_INFO[k] || { short: k }).short);
    this.pStat.setText(wrapText(sts.join(' '), 84).join('\n'));
    // enemy overhead UI
    this.ui.forEach(o => o.destroy()); this.ui = [];
    for (const u of this.eng.units) {
      if (!u.alive) continue;
      const sp = this.sprites.get(u.id); if (!sp) continue;
      const top = sp.home.y - sp.displayHeight - 4;
      if (u.side === 'enemy' || u.kind === 'drone') {
        const w = Math.max(26, Math.min(48, sp.displayWidth));
        bar(g, sp.home.x - w / 2, sp.home.y + 4, w, 2, u.hp / u.maxHp, u.side === 'enemy' ? C.bad : C.good);
        if (u.shield) bar(g, sp.home.x - w / 2, sp.home.y + 7, w, 1, Math.min(1, u.shield / u.maxHp), 0x8fb0ff);
        const st = Object.keys(u.statuses).filter(k => k !== 'guarding').map(k => STATUS_INFO[k] ? STATUS_INFO[k].short : k).join(' ');
        if (st) this.ui.push(text(this, sp.home.x - st.length * 3, sp.home.y + 10, st, C.purple).setDepth(510));
      }
      if (u.side === 'enemy' && u.intent) {
        const m = u.intent.move, lbl = this.eng.intentLabel(u);
        const str = `${INTENT_ICON[m.kind] || '?'}${lbl ? ' ' + lbl : ''}`;
        const t = shadowText(this, sp.home.x - str.length * 3, Math.max(40, top - 8), str, INTENT_COL[m.kind] || C.text).setDepth(510);
        this.ui.push(t.shadow, t);
      }
    }
    this.drawTimeline();
  }
  drawTimeline() {
    this.timelineObjs.forEach(o => o.destroy()); this.timelineObjs = [];
    const order = this.eng.preview(9);
    const x0 = 8, y0 = 6;
    const g = this.add.graphics().setDepth(600);
    g.fillStyle(0x000000, 0.55).fillRect(x0 - 2, y0 - 2, 52 + order.length * 20, 22);
    this.timelineObjs.push(g, text(this, x0 + 2, y0 + 5, 'NEXT', C.dim).setDepth(601));
    order.forEach((u, i) => {
      const x = x0 + 34 + i * 20, y = y0;
      g.fillStyle(u.side === 'player' ? 0x1f5f6a : 0x4a1018, 1).fillRect(x, y, 18, 18);
      if (i === 0) g.lineStyle(1, 0xffe08a).strokeRect(x - 0.5, y - 0.5, 19, 19);
      const key = u.kind === 'player' ? 'pt_jules' : 'bt_' + u.sprite;
      const im = this.add.image(x + 9, y + 9, key).setDepth(602);
      const sc = Math.min(16 / im.width, 16 / im.height); im.setScale(sc);
      this.timelineObjs.push(im);
    });
  }
  setLog(t) { this.logText.setText(t || ''); this.logText.x = W / 2 - (t || '').length * 3; this.logText.shadow.x = this.logText.x + 1; }

  popup(u, str, color, big = false) {
    const sp = this.sprites.get(u.id); if (!sp) return;
    const t = shadowText(this, sp.home.x - str.length * 3 * (big ? 2 : 1) + (Math.random() * 10 - 5), sp.home.y - sp.displayHeight / 2 - 6, str, color, big ? 2 : 1).setDepth(700);
    this.tweens.add({ targets: [t, t.shadow], y: '-=18', alpha: 0, duration: 900, ease: 'quad.out', onComplete: () => t.destroy() });
  }
  flash(u) {
    const sp = this.sprites.get(u.id); if (!sp) return;
    sp.setTintFill(0xffffff);
    this.time.delayedCall(70, () => sp.clearTint());
    this.tweens.add({ targets: sp, x: sp.home.x + (u.side === 'enemy' ? 4 : -4), duration: 40, yoyo: true, repeat: 1, onComplete: () => { sp.x = sp.home.x; } });
  }
  shot(src, tgt, form) {
    const a = this.sprites.get(src.id), b = this.sprites.get(tgt.id); if (!a || !b) return;
    const x0 = a.home.x + (src.side === 'player' ? 14 : -10), y0 = a.home.y - a.height * 0.55;
    const x1 = b.home.x, y1 = b.home.y - b.height / 2;
    const col = { raster: 0x5ee0e8, scatter: 0xffe08a, stream: 0xf08a3c, raytrace: 0xffffff, batch: 0x9a5ad8 }[form] || 0xe0485e;
    const g = this.add.graphics().setDepth(650);
    const thick = form === 'raytrace' ? 4 : form === 'stream' ? 1 : 2;
    g.lineStyle(thick, col, 1).lineBetween(x0, y0, x1, y1);
    g.fillStyle(0xffffff, 1).fillCircle(x1, y1, thick + 2);
    this.tweens.add({ targets: g, alpha: 0, duration: 160, onComplete: () => g.destroy() });
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
        if (e.kind === 'attack' || e.kind === 'app') {
          const sp = this.sprites.get(e.u.id);
          this.tweens.add({ targets: sp, x: sp.home.x + 10, duration: 90, yoyo: true });
          if (e.kind === 'attack') { audio.sfx(e.form === 'raytrace' ? 'laser' : 'zap'); this.setLog(`Jules fires: ${FORMS[e.form].name}!`); }
          else audio.sfx('buff');
          this.lastForm = e.kind === 'attack' ? e.form : 'raster';
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
        if (e.src && e.src.alive !== undefined && e.tgt && e.label !== 'glitch' && e.label !== 'reflect') this.shot(e.src, e.tgt, e.src.side === 'player' ? (this.lastForm || 'raster') : 'enemy');
        this.flash(e.tgt);
        audio.sfx(e.crit ? 'crit' : 'hit');
        if (e.tgt.kind === 'player') this.cameras.main.shake(120, e.dmg > e.tgt.maxHp * 0.15 ? 0.012 : 0.005);
        if (e.absorbed) this.popup(e.tgt, `-${e.absorbed}`, 0x8fb0ff);
        if (e.dmg > 0 || !e.absorbed) this.popup(e.tgt, `${e.dmg}${e.crit ? '!' : ''}`, e.crit ? C.gold : e.label === 'glitch' ? C.purple : C.text, e.crit);
        if (e.weak) this.time.delayedCall(80, () => this.popup(e.tgt, 'WEAK', C.warn));
        if (e.resist) this.time.delayedCall(80, () => this.popup(e.tgt, 'resist', C.dim));
        return e.crit ? 260 : 170;
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
    const st = this.stats, p = this.eng.player;
    this.setLog('');
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
      attack: `${f.desc}\nHeat +${Math.round(f.heat * this.eng.heatMul())}  Delay ${f.delay}`,
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
    if (outcome === 'win') {
      s.stats.wins++;
      const r = this.eng.rewards();
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
