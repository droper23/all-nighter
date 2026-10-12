// Exploration scene: one room at a time. Movement, entities, tools, roaming Glitches, story triggers.
import { Input } from '../core/input.js';
import { Dialogue } from '../core/dialogue.js';
import { audio } from '../core/audio.js';
import { G, computeStats, makePart, addItem, saveGame } from '../core/state.js';
import { text, shadowText, panel, bar, C, W, H, fadeIn, fadeTo } from '../core/ui.js';
import { T, isSolid, tileIndexAt } from '../art/tiles.js';
import { ROOMS } from '../data/rooms/index.js';
import { SCRIPTS } from '../data/scripts.js';
import { PARTS } from '../data/parts.js';
import { APPS, ITEMS } from '../data/apps.js';
import { NOTES } from '../data/notes.js';

const MARKERS = /[0-9ACDEGHIJKNQRUZ@]/;
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const TOOL_NAMES = { multimeter: 'Multimeter', iron: 'Soldering Iron', truck: 'Hand Truck', wrench: 'Pipe Wrench' };
const KEY_NAMES = { student: 'Student ID', ta: 'TA Keycard', staff: 'Staff Keycard', faculty: 'Faculty Keycard', root: 'Root Key' };

export class World extends Phaser.Scene {
  constructor() { super('World'); }

  create(data = {}) {
    const s = G.state;
    this.room = ROOMS[s.room];
    if (!this.room) { console.error('Missing room', s.room); s.room = 'studio'; this.room = ROOMS.studio; }
    this.keys = new Input(this);
    this.dialogue = new Dialogue(this);
    this.ents = []; this.busy = false; this.dark = null; this.layer = null; this.map = null; this.toast = null; this.pushT = 0; this.stepT = 0; this.minuteT = 0;
    s.visited[s.room] = true;
    this.buildRoom();
    this.spawnPlayer(data);
    this.buildHud();
    this.cameras.main.startFollow(this.player, true, 0.2, 0.2).setRoundPixels(true);
    const rw = this.gw * T, rh = this.gh * T;
    this.cameras.main.setBounds(Math.min(0, (rw - W) / 2), Math.min(0, (rh - H) / 2), Math.max(W, rw), Math.max(H, rh));
    fadeIn(this, 200);
    audio.play(this.room.music || this.room.theme);
    this.events.on('wake', (sys, result) => this.onWake(result));
    this.showRoomName();
    if (G.pendingToast) { this.notify(G.pendingToast, C.warn); G.pendingToast = null; }
    // Story hooks
    const enter = this.room.onEnter && SCRIPTS[this.room.onEnter];
    if (enter && !(this.room.onEnterOnce && s.flags['enter_' + s.room])) {
      if (this.room.onEnterOnce) s.flags['enter_' + s.room] = true;
      const sc = typeof enter === 'function' ? enter(s) : enter;
      if (sc && sc.length) this.time.delayedCall(350, () => this.runScript(sc));
    }
  }

  // ---------------- room building ----------------
  buildRoom() {
    const s = G.state, r = this.room;
    this.gh = r.grid.length; this.gw = Math.max(...r.grid.map(row => row.length));
    this.markers = {};
    this.grid = r.grid.map((row, y) => [...row.padEnd(this.gw, '#')].map((ch, x) => {
      if (MARKERS.test(ch)) { this.markers[ch] = { x, y }; const d = r.ents && r.ents[ch]; return (d && d.tile) || r.under || '.'; }
      return ch;
    }));
    // persistent modifications
    for (let y = 0; y < this.gh; y++) for (let x = 0; x < this.gw; x++) {
      const ch = this.grid[y][x];
      if (ch === '?' && s.flags[`rev_${s.room}_${x}_${y}`]) this.grid[y][x] = '.';
      if (ch === '^' && s.flags[`fix_${s.room}_${x}_${y}`]) this.grid[y][x] = '-';
      if (ch === '&' && s.flags[`steam_${r.steamFlag || s.room}`]) this.grid[y][x] = ':';
      if (ch === 'X' && r.glitchFlag && s.flags[r.glitchFlag]) this.grid[y][x] = '.';
    }
    this.drawTiles();
    // entities
    for (const [m, def] of Object.entries(r.ents || {})) {
      const pos = this.markers[m];
      if (!pos) { console.warn('marker missing', s.room, m); continue; }
      this.spawnEnt(m, def, pos.x, pos.y);
    }
    // atmosphere
    if (r.dark) this.makeDark();
    this.ambience();
  }
  drawTiles() {
    if (this.layer) { this.layer.destroy(); this.map.destroy(); }
    const data = this.grid.map((row, y) => row.map((ch, x) => tileIndexAt(this.grid, x, y)));
    this.map = this.make.tilemap({ data, tileWidth: T, tileHeight: T });
    const ts = this.map.addTilesetImage('tiles_' + this.room.theme, 'tiles_' + this.room.theme, T, T, 0, 0);
    this.layer = this.map.createLayer(0, ts, 0, 0).setDepth(0);
  }
  setTile(x, y, ch) { this.grid[y][x] = ch; this.drawTiles(); }

  spawnEnt(m, def, tx, ty) {
    const s = G.state, id = `${s.room}:${m}`;
    const e = { m, id, def, type: def.type, tx, ty, x: tx * T + 8, y: ty * T + 16, solid: false, sprite: null };
    const add = (key, frame = 0, opts = {}) => {
      e.sprite = this.add.sprite(e.x, e.y + (opts.dy || 0), key, frame).setOrigin(0.5, 1).setDepth(e.y);
      return e.sprite;
    };
    switch (def.type) {
      case 'door': if (def.key && !s.flags['open_' + id]) { add('doors', ['student', 'ta', 'staff', 'faculty', 'root', 'plain'].indexOf(def.key)); e.solid = true; e.sprite.setDepth(e.y - 8); } break;
      case 'npc': case 'sleeper': {
        if (def.hideIf && s.flags[def.hideIf]) return;
        if (def.showIf && !s.flags[def.showIf]) return;
        if (def.type === 'sleeper' && s.flags.postgame) return;
        const sp = add('pp_' + (def.look || 'student1'));
        sp.play('pp_' + (def.look || 'student1') + '_idle_' + (def.face === 'up' ? 'up' : def.face === 'left' || def.face === 'right' ? 'side' : 'down'));
        if (def.face === 'left') sp.setFlipX(true);
        e.solid = true;
        if (def.type === 'sleeper') {
          sp.setTint(0xb8c8ff);
          const z = this.add.image(e.x + 6, e.y - 18, 'fx', 1).setDepth(9000).setAlpha(0.8);
          this.tweens.add({ targets: z, y: e.y - 24, alpha: 0, duration: 1600, repeat: -1 });
        }
        break;
      }
      case 'note': if (s.notes.includes(def.id)) return; add('pickups', NOTES[def.id] && NOTES[def.id].kind === 'drive' ? 1 : 0); this.bob(e.sprite); break;
      case 'read': break;
      case 'box': { const opened = s.opened[id]; add('box', opened ? 1 : 0); e.solid = true; break; }
      case 'outlet': add('outlet').play('outlet_glow'); e.solid = true; break;
      case 'tool': if (s.tools.includes(def.tool) || (def.flag && s.flags[def.flag])) return; add('pickups', 2); this.bob(e.sprite); break;
      case 'enemy': {
        if (s.cleared[id]) return;
        if (def.showIf && !s.flags[def.showIf]) return;
        const key = def.sprite || 'blob_' + this.room.theme;
        add(key).play(key + '_bob');
        e.home = { x: e.x, y: e.y }; e.vx = 0; e.vy = 0; e.t = 0; e.stun = 800;
        break;
      }
      case 'boss': {
        if (s.bosses[def.boss] || (def.showIf && !s.flags[def.showIf])) return;
        add('bt_' + def.sprite); e.solid = true; e.sprite.setScale(def.scale || 1);
        this.tweens.add({ targets: e.sprite, y: e.y - 2, yoyo: true, repeat: -1, duration: 900, ease: 'sine.inOut' });
        break;
      }
      case 'crate': {
        const saved = s.flags['crate_' + id];
        if (saved) { e.tx = saved[0]; e.ty = saved[1]; e.x = e.tx * T + 8; e.y = e.ty * T + 16; }
        add('props', 0); e.solid = true; break;
      }
      case 'valve': add('props', 1); e.solid = true; break;
      case 'terminal': add('props', 2); e.solid = true; this.time.addEvent({ delay: 500, loop: true, callback: () => e.sprite && e.sprite.setAlpha(e.sprite.alpha === 1 ? 0.85 : 1) }); break;
      case 'shop': case 'bench': { const sp = add('pp_' + def.look); sp.play('pp_' + def.look + '_idle_down'); e.solid = true; break; }
      case 'trigger': if (def.once && s.flags['trig_' + id]) return; break;
      case 'deco': add(def.key, def.frame || 0); e.solid = !!def.solid; break;
    }
    this.ents.push(e);
    return e;
  }
  bob(sp) { this.tweens.add({ targets: sp, y: sp.y - 2, yoyo: true, repeat: -1, duration: 700, ease: 'sine.inOut' }); }

  makeDark() {
    this.dark = this.add.renderTexture(0, 0, W, H).setScrollFactor(0).setDepth(9500);
    if (!this.textures.exists('light')) {
      const c = this.textures.createCanvas('light', 160, 160), ctx = c.getContext();
      const g = ctx.createRadialGradient(80, 80, 10, 80, 80, 80);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.6, 'rgba(0,0,0,0.8)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 160, 160); c.refresh();
    }
  }
  ambience() {
    const th = this.room.theme;
    const col = { lobby: 0xf08a3c, labs: 0x5ee0e8, servers: 0x8fb0ff, archive: 0xdcb07a, tunnels: 0xf2f0e6, core: 0xd4a0ff, void: 0xffffff }[th] || 0xffffff;
    for (let i = 0; i < 14; i++) {
      const d = this.add.rectangle(Math.random() * this.gw * T, Math.random() * this.gh * T, 1, 1, col, 0.5).setDepth(8000);
      this.tweens.add({ targets: d, y: d.y - 40 - Math.random() * 40, x: d.x + (Math.random() - 0.5) * 30, alpha: 0, duration: 4000 + Math.random() * 4000, repeat: -1, delay: Math.random() * 4000 });
    }
    // vignette
    if (!this.textures.exists('vignette')) {
      const c = this.textures.createCanvas('vignette', W, H), ctx = c.getContext();
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.6)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); c.refresh();
    }
    this.add.image(0, 0, 'vignette').setOrigin(0).setScrollFactor(0).setDepth(9400);
    if (this.room.eerie) {
      this.time.addEvent({ delay: 2500, loop: true, callback: () => {
        if (Math.random() < 0.35 && !this.busy) { this.cameras.main.setScroll(this.cameras.main.scrollX + (Math.random() < 0.5 ? -2 : 2), this.cameras.main.scrollY); audio.sfx('glitch'); this.cameras.main.flash(60, 80, 20, 90); }
      } });
    }
  }

  // ---------------- player ----------------
  spawnPlayer(data) {
    const s = G.state;
    let x, y;
    if (data.at && this.markers[data.at]) {
      const m = this.markers[data.at];
      let tx = m.x, ty = m.y;
      if (tx === 0) tx++; else if (tx === this.gw - 1) tx--; else if (ty === 0) ty++; else if (ty === this.gh - 1) ty--;
      x = tx * T + 8; y = ty * T + 14;
      this.ignoreDoor = data.at;
    } else if (s.x != null) { x = s.x; y = s.y; }
    else { const m = this.markers['@'] || { x: 2, y: 2 }; x = m.x * T + 8; y = m.y * T + 14; }
    this.player = this.add.sprite(x, y, 'pp_jules', 0).setOrigin(0.5, 1);
    this.facing = data.facing || s.facing || 'down';
    this.playIdle();
  }
  playIdle() {
    const f = this.facing;
    this.player.play('pp_jules_idle_' + (f === 'left' || f === 'right' ? 'side' : f), true);
    this.player.setFlipX(f === 'left');
  }
  solidAt(px, py, ignore) {
    const tx = Math.floor(px / T), ty = Math.floor(py / T);
    if (tx < 0 || ty < 0 || tx >= this.gw || ty >= this.gh) return true;
    if (isSolid(this.grid[ty][tx])) return true;
    for (const e of this.ents) if (e.solid && e !== ignore && tx === Math.floor(e.x / T) && ty === Math.floor((e.y - 1) / T)) return e;
    return false;
  }
  blocked(x, y) {
    const pts = [[x - 5, y - 6], [x + 5, y - 6], [x - 5, y - 1], [x + 5, y - 1]];
    for (const [px, py] of pts) { const b = this.solidAt(px, py); if (b) return b; }
    return false;
  }

  // ---------------- HUD ----------------
  buildHud() {
    this.hud = this.add.container(0, 0).setScrollFactor(0).setDepth(9600);
    this.hudG = this.add.graphics();
    this.hudClock = shadowText(this, 8, 6, '', C.gold);
    this.hudHp = shadowText(this, 8, 18, '', C.text);
    this.hud.add([this.hudG, this.hudClock.shadow, this.hudClock, this.hudHp.shadow, this.hudHp]);
    this.toast = null;
    this.refreshHud();
  }
  refreshHud() {
    const s = G.state, st = computeStats(s);
    s.hp = Math.min(s.hp, st.maxHp);
    const min = Math.min(59, Math.floor((s.minutes || 0)));
    this.hudClock.setText(`${s.hour}:${String(min).padStart(2, '0')} AM`);
    this.hudHp.setText(`HP ${s.hp}/${st.maxHp}   $${s.flex}`);
    this.hudG.clear();
    bar(this.hudG, 8, 28, 70, 3, s.hp / st.maxHp, s.hp / st.maxHp < 0.3 ? C.bad : C.good);
  }
  showRoomName() {
    const t = shadowText(this, W / 2 - this.room.name.length * 3, 30, this.room.name, C.text).setScrollFactor(0).setDepth(9700).setAlpha(0);
    this.tweens.add({ targets: [t, t.shadow], alpha: 1, duration: 300, yoyo: true, hold: 1400, onComplete: () => t.destroy() });
  }
  notify(msg, color = C.text) {
    if (this.toast) this.toast.destroy();
    const w = msg.length * 6 + 14;
    const c = this.add.container(W / 2 - w / 2, H - 30).setScrollFactor(0).setDepth(9800);
    c.add(panel(this, 0, 0, w, 16));
    c.add(text(this, 7, 4, msg, color));
    this.toast = c;
    this.tweens.add({ targets: c, alpha: 0, delay: 1800, duration: 400, onComplete: () => { c.destroy(); if (this.toast === c) this.toast = null; } });
  }

  // ---------------- update ----------------
  update(time, delta) {
    const s = G.state;
    s.playtime += delta / 1000;
    s.minutes = (s.minutes || 0) + delta / 60000 * 2;
    this.minuteT += delta; if (this.minuteT > 5000) { this.minuteT = 0; this.refreshHud(); }
    if (this.dark) {
      this.dark.clear().fill(0x000000, this.room.dark);
      const cam = this.cameras.main;
      this.dark.erase('light', this.player.x - cam.scrollX - 80, this.player.y - 8 - cam.scrollY - 80);
    }
    if (this.dialogue.active) { this.dialogue.update(this.keys, delta); this.player.anims.isPlaying && this.playIdle(); return; }
    if (this.busy) return;
    if (this.keys.pressed('back')) return this.openMenu();
    if (this.keys.pressed('build')) return this.openMenu('build');
    if (this.keys.pressed('map')) return this.openMenu('map');
    if (this.keys.pressed('tool')) return this.useTool();
    if (this.keys.pressed('ok')) { this.interact(); return; }
    this.move(delta);
    this.updateEnemies(delta);
  }

  move(delta) {
    const k = this.keys;
    let dx = (k.held('right') ? 1 : 0) - (k.held('left') ? 1 : 0);
    let dy = (k.held('down') ? 1 : 0) - (k.held('up') ? 1 : 0);
    const p = this.player;
    if (!dx && !dy) { this.playIdle(); this.pushT = 0; return; }
    if (dx && dy) { dx *= 0.7071; dy *= 0.7071; }
    this.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    const sp = (k.held('run') ? 105 : 72) * delta / 1000;
    const nx = p.x + dx * sp, ny = p.y + dy * sp;
    let moved = false;
    const bx = this.blocked(nx, p.y); if (!bx) { p.x = nx; moved = true; }
    const by = this.blocked(p.x, ny); if (!by) { p.y = ny; moved = true; }
    const hit = (bx && bx !== true) ? bx : (by && by !== true ? by : null);
    if (hit && hit.type === 'crate') { this.pushT += delta; if (this.pushT > 220) { this.pushT = 0; this.pushCrate(hit); } } else this.pushT = 0;
    const anim = this.facing === 'left' || this.facing === 'right' ? 'side' : this.facing;
    p.play('pp_jules_' + anim, true); p.setFlipX(this.facing === 'left');
    p.setDepth(p.y);
    G.state.x = p.x; G.state.y = p.y; G.state.facing = this.facing;
    if (moved) { this.stepT += delta; if (this.stepT > 280) { this.stepT = 0; G.state.stats.steps++; } }
    this.checkTiles();
  }

  checkTiles() {
    const p = this.player, tx = Math.floor(p.x / T), ty = Math.floor((p.y - 3) / T);
    for (const e of this.ents) {
      if (e.tx !== tx || e.ty !== ty) continue;
      if (e.type === 'door' && !e.solid && e.def.to) {
        if (this.ignoreDoor === e.m) continue;
        return this.goDoor(e);
      }
      if (e.type === 'trigger') {
        const s = G.state;
        if (e.def.if && !s.flags[e.def.if]) continue;
        if (e.def.unless && s.flags[e.def.unless]) continue;
        if (e.def.once) { s.flags['trig_' + e.id] = true; this.ents = this.ents.filter(x => x !== e); }
        return this.runScript(SCRIPTS[e.def.script]);
      }
    }
    if (this.ignoreDoor && !this.ents.some(e => e.m === this.ignoreDoor && e.tx === tx && e.ty === ty)) this.ignoreDoor = null;
  }

  goDoor(e) {
    const d = e.def;
    if (d.if && !G.state.flags[d.if]) { this.player.y -= 0; return this.runScript(SCRIPTS[d.blocked] || [{ who: 'sys', text: d.blockedText || "It won't budge." }], () => this.stepBack()); }
    this.busy = true;
    audio.sfx('door');
    fadeTo(this, () => {
      G.state.room = d.to; G.state.x = null; G.state.y = null;
      this.scene.restart({ at: d.at, facing: this.facing });
    }, 180);
  }
  stepBack() { const [dx, dy] = DIRS[this.facing]; this.player.x -= dx * 10; this.player.y -= dy * 10; }

  frontEnt() {
    const [dx, dy] = DIRS[this.facing];
    const px = this.player.x + dx * 12, py = this.player.y - 5 + dy * 12;
    const tx = Math.floor(px / T), ty = Math.floor(py / T);
    let best = null;
    for (const e of this.ents) {
      if (e.type === 'door' && !e.solid) continue;
      if (e.type === 'trigger' || e.type === 'enemy') continue;
      const etx = Math.floor(e.x / T), ety = Math.floor((e.y - 1) / T);
      if (etx === tx && ety === ty) best = e;
      else if (e.def.wide && Math.abs(e.x - px) < 20 && Math.abs(e.y - 8 - py) < 20) best = best || e;
    }
    return { ent: best, tx, ty };
  }

  interact() {
    const { ent, tx, ty } = this.frontEnt();
    if (!ent) {
      const ch = this.grid[ty] && this.grid[ty][tx];
      const flavor = this.room.flavor && this.room.flavor[ch];
      if (flavor) return this.runScript([{ who: 'sys', text: Array.isArray(flavor) ? flavor[Math.floor(Math.random() * flavor.length)] : flavor }]);
      return this.swing();
    }
    const s = G.state, d = ent.def;
    switch (ent.type) {
      case 'npc': case 'sleeper': case 'read': case 'terminal': {
        if (ent.sprite && ent.type !== 'terminal' && ent.type !== 'read') this.faceToward(ent);
        const sc = SCRIPTS[d.script];
        if (sc) return this.runScript(typeof sc === 'function' ? sc(s) : sc);
        if (d.text) return this.runScript([{ who: d.who || 'sys', name: d.name, text: d.text }]);
        return;
      }
      case 'note': return this.collectNote(ent);
      case 'box': return this.openBox(ent);
      case 'outlet': return this.useOutlet(ent);
      case 'tool': return this.pickTool(ent);
      case 'door': return this.tryLock(ent);
      case 'boss': return this.runScript(typeof SCRIPTS[d.script] === 'function' ? SCRIPTS[d.script](s) : SCRIPTS[d.script]);
      case 'valve': return this.useValve(ent);
      case 'crate': return this.runScript(s.tools.includes('truck') ? [{ choice: [{ label: 'Leave it', then: [] }, { label: 'Reset crates in this room', then: [{ call: (sc) => sc.resetCrates() }] }], prompt: 'A heavy server crate. Walk into it to push it with the Hand Truck.' }] : [{ who: 'sys', text: 'A server crate. Far too heavy to move by hand.' }]);
      case 'shop': this.faceToward(ent); return this.runScript(typeof SCRIPTS[d.script] === 'function' ? SCRIPTS[d.script](s) : SCRIPTS[d.script]);
      case 'bench': this.faceToward(ent); return this.runScript(typeof SCRIPTS[d.script] === 'function' ? SCRIPTS[d.script](s) : SCRIPTS[d.script]);
    }
  }
  faceToward(ent) {
    if (!ent.sprite || ent.type === 'sleeper') return;
    const dx = this.player.x - ent.x, dy = this.player.y - ent.y;
    const look = ent.def.look || 'student1';
    if (Math.abs(dx) > Math.abs(dy)) { ent.sprite.play(`pp_${look}_idle_side`); ent.sprite.setFlipX(dx < 0); }
    else { ent.sprite.play(`pp_${look}_idle_${dy < 0 ? 'up' : 'down'}`); ent.sprite.setFlipX(false); }
  }

  swing() {
    audio.sfx('swing');
    const [dx, dy] = DIRS[this.facing];
    const fx = this.add.image(this.player.x + dx * 12, this.player.y - 8 + dy * 10, 'fx', 0).setDepth(this.player.depth + 1);
    fx.setRotation(Math.atan2(dy, dx));
    this.tweens.add({ targets: fx, alpha: 0, duration: 160, onComplete: () => fx.destroy() });
    for (const e of this.ents) {
      if (e.type !== 'enemy' || !e.sprite) continue;
      const ex = e.sprite.x, ey = e.sprite.y - 6;
      const hx = this.player.x + dx * 12, hy = this.player.y - 8 + dy * 12;
      if (Math.abs(ex - hx) < 16 && Math.abs(ey - hy) < 16) return this.enemyBattle(e, 'player');
    }
  }

  // ---------------- enemies ----------------
  updateEnemies(delta) {
    const p = this.player;
    for (const e of this.ents) {
      if (e.type !== 'enemy' || !e.sprite) continue;
      const sp = e.sprite;
      if (e.stun > 0) { e.stun -= delta; sp.setAlpha(0.5 + 0.5 * Math.sin(this.time.now / 60)); continue; }
      sp.setAlpha(1);
      const dx = p.x - sp.x, dy = p.y - sp.y, dist = Math.hypot(dx, dy);
      let vx = 0, vy = 0, speed = 28;
      if (dist < (e.def.sight || 70)) { vx = dx / dist; vy = dy / dist; speed = e.def.speed || 46; }
      else {
        e.t -= delta;
        if (e.t <= 0) { e.t = 1000 + Math.random() * 1500; const a = Math.random() * Math.PI * 2; e.vx = Math.random() < 0.3 ? 0 : Math.cos(a); e.vy = Math.random() < 0.3 ? 0 : Math.sin(a); }
        const hx = e.home.x - sp.x, hy = e.home.y - sp.y;
        if (Math.hypot(hx, hy) > 40) { const l = Math.hypot(hx, hy); e.vx = hx / l; e.vy = hy / l; }
        vx = e.vx; vy = e.vy;
      }
      const step = speed * delta / 1000;
      const nx = sp.x + vx * step, ny = sp.y + vy * step;
      if (!this.solidAt(nx, sp.y - 3, e)) sp.x = nx;
      if (!this.solidAt(sp.x, ny - 3, e)) sp.y = ny;
      sp.setDepth(sp.y);
      if (dist < 11) {
        const [fx, fy] = DIRS[this.facing];
        const behind = (dx * fx + dy * fy) > 4; // enemy is behind the player's facing
        return this.enemyBattle(e, behind ? 'enemy' : null);
      }
    }
  }

  enemyBattle(e, preempt) {
    const group = e.def.group;
    this.startBattle(group, {
      preempt, music: e.def.music,
      onWin: () => { G.state.cleared[e.id] = true; e.sprite.destroy(); e.sprite = null; this.ents = this.ents.filter(x => x !== e); },
      onFlee: () => { e.stun = 2500; },
    });
  }

  startBattle(group, opts = {}) {
    this.busy = true;
    this.battleOpts = opts;
    audio.sfx('battle');
    const cam = this.cameras.main;
    cam.flash(120, 255, 255, 255);
    this.tweens.add({ targets: cam, zoom: 1.6, duration: 320, ease: 'quad.in' });
    this.time.delayedCall(340, () => {
      cam.setZoom(1);
      this.scene.sleep();
      this.scene.run('Battle', { group, preempt: opts.preempt, boss: opts.boss, music: opts.music, bg: this.room.theme, canFlee: opts.canFlee !== false && !opts.boss });
    });
  }
  onWake(result) {
    this.keys.flush();
    const o = this.battleOpts || {};
    this.battleOpts = null;
    this.busy = false;
    audio.play(this.room.music || this.room.theme);
    this.refreshHud();
    if (!result) return;
    if (result.outcome === 'win') { o.onWin && o.onWin(); if (o.after) this.runScript(o.after); }
    else if (result.outcome === 'fled') { o.onFlee && o.onFlee(); }
    else if (result.outcome === 'lose') this.respawn();
  }
  respawn() {
    const s = G.state;
    const lost = Math.floor(s.flex * 0.1);
    s.flex -= lost;
    s.hp = computeStats(s).maxHp;
    const o = s.lastOutlet || { room: 'studio' };
    s.room = o.room; s.x = o.x; s.y = o.y;
    this.scene.restart({});
    this.time.delayedCall(10, () => {});
    G.pendingToast = lost ? `Rebooted at the last Outlet. Lost $${lost}.` : 'Rebooted at the last Outlet.';
  }

  // ---------------- scripted helpers ----------------
  runScript(script, done) {
    if (!script) return;
    this.player.play('pp_jules_idle_' + (this.facing === 'left' || this.facing === 'right' ? 'side' : this.facing), true);
    this.dialogue.run(script, () => { this.keys.flush(); this.refreshHud(); done && done(); });
  }
  rewardText(g) {
    if (g.part) return `Got ${PARTS[g.part].name}! [${PARTS[g.part].slot.toUpperCase()}]`;
    if (g.app) return `Got App: ${APPS[g.app].name}!`;
    if (g.item) return `Got ${ITEMS[g.item].name}${g.n > 1 ? ' x' + g.n : ''}!`;
    if (g.mat) return `Got ${ITEMS[g.mat].name} x${g.n || 1}.`;
    if (g.flex) return `Found $${g.flex} in Flex Dollars.`;
    if (g.tool) return `Got the ${TOOL_NAMES[g.tool]}! (Press Q to use)`;
    if (g.key) return `Got the ${KEY_NAMES[g.key]}!`;
    if (g.ram) return 'Installed a DIMM riser: +1 RAM slot!';
    return 'Got something.';
  }
  giveReward(g) {
    const s = G.state;
    if (g.part) s.parts.push(makePart(g.part, { perks: g.perks }));
    if (g.app && !s.apps.includes(g.app)) s.apps.push(g.app);
    if (g.item) addItem(s, g.item, g.n || 1);
    if (g.mat) s.mats[g.mat] = (s.mats[g.mat] || 0) + (g.n || 1);
    if (g.flex) s.flex += g.flex;
    if (g.tool && !s.tools.includes(g.tool)) s.tools.push(g.tool);
    if (g.key && !s.keys.includes(g.key)) s.keys.push(g.key);
    if (g.ram) s.flags[g.ram] = true;
    audio.sfx('pickup');
    this.refreshHud && this.hudHp && this.refreshHud();
  }

  collectNote(ent) {
    const s = G.state, n = NOTES[ent.def.id];
    if (!n) return;
    s.notes.push(ent.def.id);
    audio.sfx('pickup');
    ent.sprite && ent.sprite.destroy();
    this.ents = this.ents.filter(x => x !== ent);
    const label = { note: 'Sticky Note', drive: 'Lost Flash Drive', email: 'Open Email', page: 'Notebook Page', flyer: 'Flyer', log: 'Terminal Log' }[n.kind] || 'Note';
    this.runScript([{ who: 'sys', name: `${label}: ${n.title}`, text: n.text }, { who: 'sys', text: `(Saved to Notes. ${s.notes.length} found.)` }]);
  }
  openBox(ent) {
    const s = G.state;
    if (s.opened[ent.id]) return this.runScript([{ who: 'sys', text: 'Empty. Someone (you) already raided it.' }]);
    s.opened[ent.id] = true; ent.sprite.setFrame(1);
    const loot = ent.def.loot;
    this.giveReward(loot);
    this.runScript([{ who: 'sys', text: this.rewardText(loot) }]);
  }
  pickTool(ent) {
    const d = ent.def;
    ent.sprite.destroy(); this.ents = this.ents.filter(x => x !== ent);
    this.giveReward({ tool: d.tool });
    if (d.flag) G.state.flags[d.flag] = true;
    audio.sfx('levelup');
    this.runScript([{ who: 'sys', text: this.rewardText({ tool: d.tool }) }, ...(SCRIPTS[d.script] || [])]);
  }
  tryLock(ent) {
    const s = G.state, k = ent.def.key;
    if (s.keys.includes(k)) {
      s.flags['open_' + ent.id] = true;
      audio.sfx('door');
      ent.solid = false; this.tweens.add({ targets: ent.sprite, alpha: 0, y: ent.sprite.y - 6, duration: 300, onComplete: () => ent.sprite.destroy() });
      this.notify(`${KEY_NAMES[k]} accepted.`, C.good);
    } else {
      audio.sfx('error');
      this.runScript([{ who: 'sys', text: `Locked. The reader blinks: "${KEY_NAMES[k].toUpperCase()} REQUIRED."` }]);
    }
  }
  useValve(ent) {
    const s = G.state, flag = 'steam_' + (ent.def.steam || s.room);
    if (s.flags[flag]) return this.runScript([{ who: 'sys', text: 'The valve is shut tight. The pipes tick as they cool.' }]);
    if (!s.tools.includes('wrench')) return this.runScript([{ who: 'sys', text: 'A rusted steam valve. It needs a serious wrench.' }]);
    s.flags[flag] = true; audio.sfx('vent');
    for (let y = 0; y < this.gh; y++) for (let x = 0; x < this.gw; x++) if (this.grid[y][x] === '&' && (!ent.def.steam || ent.def.steam === s.room)) this.grid[y][x] = ':';
    this.drawTiles();
    this.cameras.main.shake(200, 0.004);
    this.runScript([{ who: 'sys', text: 'You crank the Pipe Wrench. With a shriek, the steam dies down somewhere nearby.' }]);
  }
  pushCrate(c) {
    const s = G.state;
    if (!s.tools.includes('truck')) { this.notify('Too heavy. You need a Hand Truck.', C.dim); return; }
    const [dx, dy] = DIRS[this.facing];
    const nx = c.tx + dx, ny = c.ty + dy;
    if (nx < 0 || ny < 0 || nx >= this.gw || ny >= this.gh) return;
    if (isSolid(this.grid[ny][nx]) || this.grid[ny][nx] === '^' || this.ents.some(e => e !== c && e.tx === nx && e.ty === ny)) { audio.sfx('error'); return; }
    c.tx = nx; c.ty = ny; c.x = nx * T + 8; c.y = ny * T + 16;
    s.flags['crate_' + c.id] = [nx, ny];
    audio.sfx('door');
    this.tweens.add({ targets: c.sprite, x: c.x, y: c.y, duration: 160 });
    c.sprite.setDepth(c.y);
  }

  resetCrates() {
    const s = G.state;
    for (const e of this.ents.filter(x => x.type === 'crate')) {
      delete s.flags['crate_' + e.id];
      const m = this.markers[e.m];
      e.tx = m.x; e.ty = m.y; e.x = m.x * T + 8; e.y = m.y * T + 16;
      e.sprite.setPosition(e.x, e.y).setDepth(e.y);
    }
    audio.sfx('door');
  }

  useTool() {
    const s = G.state;
    if (!s.tools.length) { this.notify('No field tools yet.', C.dim); return; }
    const p = this.player, ptx = Math.floor(p.x / T), pty = Math.floor((p.y - 4) / T);
    // Soldering iron: repair adjacent gaps
    if (s.tools.includes('iron')) {
      const fixes = [];
      for (let y = pty - 2; y <= pty + 2; y++) for (let x = ptx - 2; x <= ptx + 2; x++) if (this.grid[y] && this.grid[y][x] === '^') fixes.push([x, y]);
      if (fixes.length) {
        audio.sfx('zap');
        for (const [x, y] of fixes) { s.flags[`fix_${s.room}_${x}_${y}`] = true; this.grid[y][x] = '-'; const sp = this.add.image(x * T + 8, y * T + 8, 'fx', 3).setDepth(9000); this.tweens.add({ targets: sp, alpha: 0, scale: 2, duration: 400, onComplete: () => sp.destroy() }); }
        this.drawTiles();
        // keep repairing outward for long gaps
        this.notify(`Soldering Iron: repaired ${fixes.length} section${fixes.length > 1 ? 's' : ''}.`, C.good);
        return;
      }
    }
    if (s.tools.includes('multimeter')) {
      audio.sfx('tool');
      const ring = this.add.circle(p.x, p.y - 8, 6).setStrokeStyle(1, 0x5ee0e8).setDepth(9000);
      this.tweens.add({ targets: ring, scale: 9, alpha: 0, duration: 600, onComplete: () => ring.destroy() });
      const found = [];
      for (let y = pty - 4; y <= pty + 4; y++) for (let x = ptx - 4; x <= ptx + 4; x++) if (this.grid[y] && this.grid[y][x] === '?') found.push([x, y]);
      if (found.length) {
        this.time.delayedCall(300, () => {
          audio.sfx('door');
          for (const [x, y] of found) { s.flags[`rev_${s.room}_${x}_${y}`] = true; this.grid[y][x] = '.'; }
          this.drawTiles();
          this.cameras.main.shake(150, 0.003);
          this.notify('Multimeter: hidden wiring! The panel swings open.', C.accent);
        });
      } else {
        const hint = this.grid.some(r => r.includes('?'));
        this.notify(hint ? 'Multimeter: faint current somewhere in this room...' : 'Multimeter: no hidden wiring nearby.', hint ? C.gold : C.dim);
      }
      return;
    }
    this.notify('Nothing to use a tool on here.', C.dim);
  }

  useOutlet(ent) {
    const s = G.state;
    const here = { room: s.room, x: this.player.x, y: this.player.y, name: this.room.name };
    if (!s.outlets.some(o => o.room === s.room)) s.outlets.push(here);
    s.lastOutlet = here;
    const travel = s.outlets.filter(o => o.room !== s.room);
    this.runScript([
      { choice: [
        { label: 'Rest & Save', then: [{ call: (sc) => sc.rest() }, { sfx: 'save' }, { who: 'sys', text: `You plug in and recharge. HP restored. Glitches in the building reset. Game saved to slot ${G.slot}.` }] },
        ...(travel.length ? [{ label: 'Fast Travel', then: [{ call: (sc, done) => sc.fastTravel(travel, done) }] }] : []),
        { label: 'Leave', then: [] },
      ], prompt: 'An Outlet. Still live, somehow. It hums the way a computer hums before it boots.' },
    ]);
  }
  rest() {
    const s = G.state;
    s.hp = computeStats(s).maxHp;
    for (const k of Object.keys(s.cleared)) delete s.cleared[k];
    s.x = this.player.x; s.y = this.player.y; s.facing = this.facing;
    saveGame(s, G.slot);
    this.refreshHud();
    // respawn enemies in this room
    this.ents.filter(e => e.type === 'enemy').forEach(e => e.sprite && e.sprite.destroy());
    this.ents = this.ents.filter(e => e.type !== 'enemy');
    for (const [m, def] of Object.entries(this.room.ents || {})) if (def.type === 'enemy' && this.markers[m]) this.spawnEnt(m, def, this.markers[m].x, this.markers[m].y);
  }
  fastTravel(list, done) {
    this.dialogue.queue.unshift({ choice: [...list.map(o => ({ label: o.name, then: [{ call: (sc) => sc.travelTo(o) }] })), { label: 'Cancel', then: [] }] });
    done();
  }
  travelTo(o) {
    const s = G.state;
    this.dialogue.queue = [];
    this.busy = true;
    audio.sfx('save');
    fadeTo(this, () => { s.room = o.room; s.x = o.x; s.y = o.y + 2; this.scene.restart({}); }, 300);
  }

  warp(room, at) {
    this.dialogue.queue = [];
    this.busy = true;
    audio.sfx('door');
    fadeTo(this, () => { G.state.room = room; G.state.x = null; G.state.y = null; this.scene.restart({ at }); }, 400);
  }
  startEnding(kind, done) {
    done();
    this.dialogue.queue = [];
    this.busy = true;
    audio.stop();
    this.cameras.main.fadeOut(1500, 255, 255, 255);
    this.cameras.main.once('camerafadeoutcomplete', () => { this.scene.stop(); this.scene.start('Ending', { kind }); });
  }

  openMenu(tab) {
    this.busy = true;
    this.playIdle();
    this.scene.pause();
    this.scene.launch('Menu', { tab });
    this.scene.get('Menu').events.once('shutdown', () => { this.busy = false; this.keys.flush(); this.refreshHud(); });
  }
  openShop(id) { this.busy = true; this.scene.pause(); this.scene.launch('Shop', { id }); this.scene.get('Shop').events.once('shutdown', () => { this.busy = false; this.keys.flush(); this.refreshHud(); }); }
  openBench() { this.busy = true; this.scene.pause(); this.scene.launch('Bench'); this.scene.get('Bench').events.once('shutdown', () => { this.busy = false; this.keys.flush(); this.refreshHud(); }); }
}
