// Pause menu: Build (motherboard), Items, Notes, Map, Status, Settings.
import { Input } from '../core/input.js';
import { audio } from '../core/audio.js';
import { G, computeStats, partOf, partStats, ramSlots, xpToNext, fmtTime, DIFFICULTY, useItem } from '../core/state.js';
import { text, shadowText, panel, bar, C, W, H, ListMenu, wrapText, toInt } from '../core/ui.js';
import { PARTS, TIERS, FORMS, BRANDS, PERKS, SLOTS } from '../data/parts.js';
import { APPS, ITEMS } from '../data/apps.js';
import { NOTES } from '../data/notes.js';
import { ROOMS, SECTORS } from '../data/rooms/index.js';

const STAT_LABELS = [['maxHp', 'HP'], ['atk', 'ATK'], ['def', 'DEF'], ['spd', 'SPD'], ['crit', 'CRIT'], ['maxPwr', 'PWR'], ['regen', 'REGEN'], ['cool', 'COOL'], ['heatCap', 'HEATCAP']];
const PSTAT = { atk: 'ATK', spd: 'SPD', def: 'DEF', hp: 'HP', pwr: 'PWR', regen: 'REGEN', cool: 'COOL', crit: 'CRIT', heatcap: 'HEATCAP' };

// Motherboard hotspots: [slot, index, x, y, w, h]
const HOT = {
  psu: { slot: 'psu', i: null, x: 18, y: 44, w: 40, h: 46 },
  cpu: { slot: 'cpu', i: null, x: 84, y: 40, w: 60, h: 56 },
  cool: { slot: 'cool', i: null, x: 152, y: 40, w: 44, h: 44 },
  ram0: { slot: 'ram', i: 0, x: 210, y: 34, w: 11, h: 82 },
  ram1: { slot: 'ram', i: 1, x: 225, y: 34, w: 11, h: 82 },
  ram2: { slot: 'ram', i: 2, x: 240, y: 34, w: 11, h: 82 },
  ram3: { slot: 'ram', i: 3, x: 255, y: 34, w: 11, h: 82 },
  gpu: { slot: 'gpu', i: null, x: 70, y: 136, w: 196, h: 30 },
  usb0: { slot: 'usb', i: 0, x: 14, y: 112, w: 34, h: 16 },
  usb1: { slot: 'usb', i: 1, x: 14, y: 134, w: 34, h: 16 },
};
const NAV = {
  psu: { right: 'cpu', down: 'usb0' }, cpu: { left: 'psu', right: 'cool', down: 'gpu' }, cool: { left: 'cpu', right: 'ram0', down: 'gpu' },
  ram0: { left: 'cool', right: 'ram1', down: 'gpu' }, ram1: { left: 'ram0', right: 'ram2', down: 'gpu' }, ram2: { left: 'ram1', right: 'ram3', down: 'gpu' }, ram3: { left: 'ram2', down: 'gpu' },
  gpu: { up: 'cpu', left: 'usb1' }, usb0: { up: 'psu', down: 'usb1', right: 'cpu' }, usb1: { up: 'usb0', right: 'gpu' },
};

export class Menu extends Phaser.Scene {
  constructor() { super('Menu'); }
  create(data = {}) {
    this.keys = new Input(this);
    this.objs = []; this.mode = null; this.list = null; this.list2 = null; this.infoObjs = null; this.descObj = null; this.settingsAdjust = null; this.sparks = []; this.fan = null;
    this.add.rectangle(0, 0, W, H, 0x07060c, 0.92).setOrigin(0);
    if (data.tab === 'build') this.openBuild(true);
    else if (data.tab === 'map') this.openMap(true);
    else this.openMain();
  }
  clear() { this.objs.forEach(o => o.destroy()); this.objs = []; if (this.list) this.list.destroy(); if (this.list2) this.list2.destroy(); this.list = null; this.list2 = null; this.settingsAdjust = null; if (this.infoObjs) { this.infoObjs.forEach(o => o.destroy()); this.infoObjs = null; } if (this.descObj) { this.descObj.destroy(); this.descObj = null; } this.sparks = []; this.fan = null; this.selG = null; this.youDot = null; }
  o(obj) { this.objs.push(obj); return obj; }
  close() { audio.sfx('back'); this.scene.resume('World'); this.scene.stop(); }

  // ---------- main ----------
  openMain(cursor = 0) {
    this.clear(); this.mode = 'main';
    const s = G.state, st = computeStats(s);
    this.o(panel(this, 8, 8, 120, 160));
    this.o(text(this, 18, 16, 'PAUSED', C.accent));
    const items = ['Build', 'Items', 'Notes', 'Map', 'Status', 'Settings', 'Title Screen', 'Resume'].map(l => ({ label: l }));
    this.list = new ListMenu(this, 16, 32, 106, items, { rows: 8, lineH: 15, cursor, onSelect: (it, i) => this.pickMain(i), onBack: () => this.close() });
    this.objs.push({ destroy: () => this.list.destroy() });
    // summary
    this.o(panel(this, 136, 8, 336, 160));
    this.o(this.add.image(166, 46, 'pt_jules').setScale(1.2));
    this.o(text(this, 196, 18, `JULES  ·  CompE '27  ·  LV ${s.level}`, C.text));
    this.o(text(this, 196, 32, `HP ${s.hp}/${st.maxHp}`, C.text));
    const g = this.o(this.add.graphics());
    bar(g, 196, 42, 120, 3, s.hp / st.maxHp, C.good);
    this.o(text(this, 196, 50, `XP ${s.xp}/${xpToNext(s.level)}`, C.text));
    bar(g, 196, 60, 120, 3, s.xp / xpToNext(s.level), C.gold);
    this.o(text(this, 330, 32, `Flex  $${s.flex}`, C.gold));
    this.o(text(this, 330, 44, `Scrap ${s.mats.scrap}`, C.text));
    this.o(text(this, 330, 56, `Silicon ${s.mats.silicon}`, C.accent));
    this.o(text(this, 150, 80, `${s.hour}:${String(Math.floor(s.minutes || 0) % 60).padStart(2, '0')} AM  ·  Played ${fmtTime(s.playtime)}  ·  ${DIFFICULTY[s.difficulty].name}`, C.dim));
    this.o(text(this, 150, 96, `Form: ${FORMS[st.form].name}   Apps: ${st.apps.map(a => APPS[a].name).join(', ') || '-'}`, C.text));
    const tools = s.tools.map(t => ({ multimeter: 'Multimeter', iron: 'Soldering Iron', truck: 'Hand Truck', wrench: 'Pipe Wrench' }[t]));
    this.o(text(this, 150, 112, wrapText('Tools: ' + (tools.join(', ') || 'none'), 310).join('\n'), C.text));
    this.o(text(this, 150, 126, 'Keys: ' + s.keys.map(k => k.toUpperCase()).join(' · '), C.text));
    const lockouts = ['vendor', 'autograder', 'raid', 'thesis', 'hydra'].filter(b => s.bosses[b]).length;
    this.o(text(this, 150, 142, `Lockouts cleared: ${lockouts}/5   Notes: ${s.notes.length}/${Object.keys(NOTES).length}`, C.purple));
    this.o(text(this, 12, 252, 'Z/Enter select · X/Esc back · Tab: Build · M: Map', C.dim));
  }
  pickMain(i) {
    [() => this.openBuild(), () => this.openItems(), () => this.openNotes(), () => this.openMap(), () => this.openStatus(), () => this.openSettings(), () => this.confirmTitle(), () => this.close()][i]();
  }

  // ---------- BUILD ----------
  openBuild(direct = false) {
    this.clear(); this.mode = 'build'; this.direct = direct;
    this.hot = this.hot || 'cpu';
    this.drawBoard();
    this.drawBuildInfo();
  }
  drawBoard() {
    const s = G.state, g = this.o(this.add.graphics());
    const bx = 6, by = 6, bw = 286, bh = 180;
    // PCB
    g.fillStyle(0x0d2a1c, 1).fillRect(bx, by, bw, bh);
    g.fillStyle(0x12382a, 1).fillRect(bx + 3, by + 3, bw - 6, bh - 6);
    for (let i = 0; i < 40; i++) g.fillStyle(0x0d2a1c, 1).fillRect(bx + 6 + (i * 53) % (bw - 12), by + 6 + (i * 31) % (bh - 12), 2, 2);
    // traces
    g.lineStyle(1, 0x1f5a3a, 1);
    for (let i = 0; i < 9; i++) {
      g.lineBetween(64, 56 + i * 4, 84, 56 + i * 4);
      g.lineBetween(144, 50 + i * 4, 152, 50 + i * 4);
      g.lineBetween(114 + i * 3, 96, 114 + i * 3, 136);
      g.lineBetween(200, 60 + i * 5, 210, 60 + i * 5);
      g.lineBetween(48, 118 + (i % 4) * 4, 70, 118 + (i % 4) * 4);
    }
    // mounting holes & labels
    [[12, 12], [284, 12], [12, 178], [284, 178]].forEach(([x, y]) => { g.fillStyle(0xb8b6c8, 1).fillCircle(x, y, 3); g.fillStyle(0x0d2a1c, 1).fillCircle(x, y, 1.5); });
    this.o(text(this, 196, 172, 'RIDGEVIEW REV.C', 0x2f7a46));
    this.o(text(this, 14, 172, 'THE BUILD', 0x2f7a46));
    // capacitors
    for (let i = 0; i < 6; i++) { g.fillStyle(0x24376e, 1).fillCircle(78 + i * 8, 112, 3); g.fillStyle(0x8fb0ff, 1).fillRect(77 + i * 8, 110, 2, 1); }
    // chipset
    g.fillStyle(0x1c1a2b, 1).fillRect(160, 92, 26, 26); g.fillStyle(0x2e2c40, 1).fillRect(163, 95, 20, 20);
    this.o(text(this, 164, 102, 'PCH', 0x7a7890));
    // CMOS battery
    g.fillStyle(0xb8b6c8, 1).fillCircle(262, 150, 7); g.fillStyle(0xf2f0e6, 1).fillCircle(261, 149, 5);
    // slots
    const slots = ramSlots(s);
    for (const [key, h] of Object.entries(HOT)) {
      const uid = h.i == null ? s.build[h.slot] : s.build[h.slot][h.i];
      const locked = h.slot === 'ram' && h.i >= slots;
      const inst = uid && partOf(s, uid);
      const tierCol = inst ? toInt(TIERS[PARTS[inst.id].tier].color) : 0x4a4860;
      this.drawSlot(g, key, h, inst, tierCol, locked);
    }
    // selection
    const sel = HOT[this.hot];
    this.selG = this.o(this.add.graphics());
    this.selRect = sel;
    this.pulse = 0;
    // animated current dots
    this.sparks = [];
    for (let i = 0; i < 8; i++) {
      const d = this.o(this.add.rectangle(0, 0, 2, 1, 0x5ee0e8));
      d.path = [[64, 56 + i * 4, 84, 56 + i * 4], [114 + i * 3, 96, 114 + i * 3, 136], [200, 60 + i * 5, 210, 60 + i * 5], [48, 118 + (i % 4) * 4, 70, 118 + (i % 4) * 4]][i % 4];
      d.t = Math.random();
      this.sparks.push(d);
    }
  }
  drawSlot(g, key, h, inst, tc, locked) {
    const { x, y, w, h: hh } = h;
    if (h.slot === 'cpu') {
      g.fillStyle(0x7a7890, 1).fillRect(x, y, w, hh); g.fillStyle(0x4a4860, 1).fillRect(x + 3, y + 3, w - 6, hh - 6);
      if (inst) { g.fillStyle(0xb8b6c8, 1).fillRect(x + 8, y + 8, w - 16, hh - 16); g.fillStyle(tc, 1).fillRect(x + 8, y + 8, 3, 3); g.fillStyle(0x7a7890, 1).fillRect(x + 12, y + 12, w - 24, hh - 24); }
      this.o(text(this, x + 4, y + hh - 12, 'CPU', 0x1c1a2b));
    } else if (h.slot === 'cool') {
      g.fillStyle(0x2e2c40, 1).fillRect(x, y, w, hh);
      if (inst) { g.fillStyle(0x1c1a2b, 1).fillCircle(x + w / 2, y + hh / 2, 18); this.fan = this.o(this.add.star(x + w / 2, y + hh / 2, 5, 4, 16, tc).setAlpha(0.9)); g.fillStyle(0x4a4860, 1).fillCircle(x + w / 2, y + hh / 2, 5); }
      this.o(text(this, x + 2, y + 2, 'FAN', 0x7a7890));
    } else if (h.slot === 'ram') {
      g.fillStyle(locked ? 0x1c1a2b : 0x2e2c40, 1).fillRect(x, y, w, hh);
      g.fillStyle(0xd9a53a, 1).fillRect(x + 1, y + hh - 4, w - 2, 3);
      if (locked) { this.o(text(this, x + 3, y + 36, '×', 0x4a4860)); return; }
      if (inst) {
        g.fillStyle(0x24376e, 1).fillRect(x + 1, y + 2, w - 2, hh - 8); g.fillStyle(tc, 1).fillRect(x + 1, y + 2, w - 2, 3);
        for (let i = 0; i < 6; i++) g.fillStyle(0x0d0b14, 1).fillRect(x + 3, y + 10 + i * 10, w - 6, 6);
        const app = G.state.build.ramApps[h.i];
        if (app) { g.fillStyle(0x5ee0e8, 1).fillRect(x + 4, y + 8, 3, 3); }
      }
    } else if (h.slot === 'gpu') {
      g.fillStyle(0x1c1a2b, 1).fillRect(x, y + hh - 6, w, 6);
      if (inst) {
        g.fillStyle(0x2e2c40, 1).fillRect(x, y, w, hh - 4); g.fillStyle(tc, 1).fillRect(x, y, w, 2);
        for (let i = 0; i < 3; i++) { g.fillStyle(0x0d0b14, 1).fillCircle(x + 30 + i * 60, y + 13, 11); g.fillStyle(0x4a4860, 1).fillCircle(x + 30 + i * 60, y + 13, 3); }
        g.fillStyle(0xd9a53a, 1).fillRect(x + 10, y + hh - 5, w - 20, 2);
      }
      this.o(text(this, x + w - 26, y + 3, 'GPU', 0x7a7890));
    } else if (h.slot === 'psu') {
      g.fillStyle(0xf2f0e6, 1).fillRect(x, y, w, hh); g.fillStyle(0x2e2c40, 1).fillRect(x + 2, y + 2, w - 4, hh - 4);
      for (let r = 0; r < 6; r++) for (let c2 = 0; c2 < 4; c2++) g.fillStyle(inst ? (r % 2 ? 0xffe08a : 0x0d0b14) : 0x1c1a2b, 1).fillRect(x + 6 + c2 * 8, y + 6 + r * 6, 5, 4);
      if (inst) g.fillStyle(tc, 1).fillRect(x + 2, y + hh - 5, w - 4, 3);
      this.o(text(this, x + 6, y + hh + 2, 'PSU', 0x7a7890));
    } else if (h.slot === 'usb') {
      g.fillStyle(0xb8b6c8, 1).fillRect(x, y, w, hh); g.fillStyle(0x0d0b14, 1).fillRect(x + 4, y + 4, w - 8, hh - 8);
      if (inst) { g.fillStyle(tc, 1).fillRect(x + 6, y + 6, w - 12, 4); }
      this.o(text(this, x + w + 2, y + 4, 'USB', 0x7a7890));
    }
  }
  drawBuildInfo() {
    if (this.infoObjs) this.infoObjs.forEach(o => o.destroy());
    this.infoObjs = [];
    const add = (o) => { this.infoObjs.push(o); return o; };
    const s = G.state, st = computeStats(s), h = HOT[this.hot];
    const uid = h.i == null ? s.build[h.slot] : s.build[h.slot][h.i];
    const inst = uid && partOf(s, uid);
    add(panel(this, 298, 6, 176, 180));
    add(text(this, 306, 12, `${SLOTS[h.slot].name}${h.i != null ? ' ' + (h.i + 1) : ''}`, C.accent));
    if (h.slot === 'ram' && h.i >= ramSlots(s)) {
      add(text(this, 306, 26, wrapText('Empty DIMM slot. Needs a riser to activate. (Defeat stronger Glitches.)', 160).join('\n'), C.dim));
    } else if (inst) {
      const b = PARTS[inst.id];
      add(text(this, 306, 26, wrapText(b.name + (inst.plus ? ` +${inst.plus}` : ''), 162).join('\n'), toInt(TIERS[b.tier].color)));
      let y = 38 + (b.name.length > 26 ? 10 : 0);
      add(text(this, 306, y, `${TIERS[b.tier].name}${b.brand ? ' · ' + BRANDS[b.brand].name : ''}`, C.dim)); y += 11;
      const ps = partStats(inst);
      const sl = Object.entries(ps).map(([k, v]) => `${PSTAT[k]} +${v}`).join('  ');
      add(text(this, 306, y, wrapText(sl || 'No stats', 162).join('\n'), C.text)); y += 11 * Math.max(1, wrapText(sl, 162).length);
      if (b.form) { add(text(this, 306, y, `Form: ${FORMS[b.form].name}`, C.gold)); y += 11; }
      if (inst.perks.length) { add(text(this, 306, y, wrapText('Perks: ' + inst.perks.map(p => PERKS[p].name).join(', '), 162).join('\n'), C.good)); y += 11 * wrapText('Perks: ' + inst.perks.map(p => PERKS[p].name).join(', '), 162).length; }
      if (h.slot === 'ram') { const a = s.build.ramApps[h.i]; add(text(this, 306, y, `App: ${a ? APPS[a].name : '(none)'}`, C.accent)); y += 11; }
      add(text(this, 306, y + 2, wrapText(b.desc, 162).slice(0, 4).join('\n'), C.dim));
    } else add(text(this, 306, 26, '(empty)', C.dim));
    // totals
    add(panel(this, 6, 192, 468, 72));
    STAT_LABELS.forEach(([k, l], i) => add(text(this, 14 + (i % 5) * 92, 200 + Math.floor(i / 5) * 12, `${l} ${st[k]}`, C.text)));
    add(text(this, 14 + 4 * 92, 212, `FORM ${FORMS[st.form].name}`, C.gold));
    const sets = Object.entries(st.brands).filter(([, n]) => n >= 2).map(([b, n]) => `${BRANDS[b].name} ${n}pc: ${BRANDS[b].two}${n >= 3 ? '; ' + BRANDS[b].three : ''}`);
    add(text(this, 14, 228, wrapText(sets.length ? sets.join(' | ') : 'No brand set bonus. Match 2-3 parts of one brand.', 450).slice(0, 2).join('\n'), sets.length ? C.gold : C.dim));
    add(text(this, 14, 252, 'Arrows: select slot · Z: change · X: back', C.dim));
  }
  updateBuild(delta) {
    // selection pulse & sparks
    this.pulse += delta;
    const r = this.selRect, g = this.selG;
    if (g) { g.clear(); g.lineStyle(1, 0xffe08a, 0.6 + 0.4 * Math.sin(this.pulse / 150)).strokeRect(r.x - 2.5, r.y - 2.5, r.w + 5, r.h + 5); }
    if (this.fan) this.fan.rotation += delta / 120;
    for (const d of this.sparks || []) { d.t = (d.t + delta / 900) % 1; const [x0, y0, x1, y1] = d.path; d.setPosition(x0 + (x1 - x0) * d.t, y0 + (y1 - y0) * d.t); }
    if (this.list2) return this.list2.update(this.keys, delta);
    const d = this.keys.nav(delta);
    if (d && NAV[this.hot][d]) { this.hot = NAV[this.hot][d]; this.selRect = HOT[this.hot]; audio.sfx('move'); this.drawBuildInfo(); }
    else if (this.keys.pressed('ok')) { audio.sfx('select'); this.chooseForSlot(); }
    else if (this.keys.pressed('back') || this.keys.pressed('build')) { if (this.direct) this.close(); else { audio.sfx('back'); this.openMain(0); } }
  }
  chooseForSlot() {
    const s = G.state, h = HOT[this.hot];
    if (h.slot === 'ram' && h.i >= ramSlots(s)) { audio.sfx('error'); return; }
    if (h.slot === 'ram') {
      return this.popList('RAM ' + (h.i + 1), [{ label: 'Swap stick', v: 'stick' }, { label: 'Install App', v: 'app', disabled: !s.build.ram[h.i] }], (it) => (it.v === 'app' ? this.chooseApp(h.i) : this.choosePart(h)));
    }
    this.choosePart(h);
  }
  choosePart(h) {
    const s = G.state, st = computeStats(s);
    const cur = h.i == null ? s.build[h.slot] : s.build[h.slot][h.i];
    const used = new Set([s.build.cpu, s.build.gpu, ...s.build.ram, s.build.psu, s.build.cool, ...s.build.usb].filter(Boolean));
    const cands = s.parts.filter(p => PARTS[p.id].slot === h.slot && (!used.has(p.uid) || p.uid === cur))
      .sort((a, b) => PARTS[b.id].tier - PARTS[a.id].tier || b.plus - a.plus);
    const items = cands.map(p => {
      const b = PARTS[p.id];
      return { label: (p.uid === cur ? '• ' : '') + b.name + (p.plus ? ` +${p.plus}` : ''), color: toInt(TIERS[b.tier].color), uid: p.uid };
    });
    if (h.slot === 'usb' && cur) items.push({ label: '(remove)', uid: null });
    this.popList(SLOTS[h.slot].name, items, (it) => {
      if (h.i == null) s.build[h.slot] = it.uid; else s.build[h.slot][h.i] = it.uid;
      const nst = computeStats(s); s.hp = Math.min(s.hp, nst.maxHp);
      audio.sfx('door'); this.openBuild(this.direct);
    }, (it) => this.preview(h, it.uid, st));
  }
  chooseApp(i) {
    const s = G.state;
    const items = s.apps.map(a => ({ label: (s.build.ramApps[i] === a ? '• ' : '') + APPS[a].name, right: APPS[a].pwr + 'P', app: a, desc: APPS[a].desc }));
    items.push({ label: '(none)', app: null, desc: 'Leave this stick idle.' });
    this.popList('APPS', items, (it) => {
      const other = s.build.ramApps.indexOf(it.app);
      if (it.app && other >= 0 && other !== i) s.build.ramApps[other] = s.build.ramApps[i];
      s.build.ramApps[i] = it.app; audio.sfx('door'); this.openBuild(this.direct);
    }, (it) => this.showDesc(it.desc));
  }
  preview(h, uid, before) {
    const s = G.state;
    const saved = h.i == null ? s.build[h.slot] : s.build[h.slot][h.i];
    if (h.i == null) s.build[h.slot] = uid; else s.build[h.slot][h.i] = uid;
    const after = computeStats(s);
    if (h.i == null) s.build[h.slot] = saved; else s.build[h.slot][h.i] = saved;
    const diffs = STAT_LABELS.map(([k, l]) => [l, after[k] - before[k]]).filter(([, d]) => d);
    let str = diffs.map(([l, d]) => `${l} ${d > 0 ? '+' : ''}${d}`).join('  ') || 'No stat change';
    if (after.form !== before.form) str += `\nForm → ${FORMS[after.form].name}`;
    const inst = uid && partOf(s, uid);
    if (inst) { const b = PARTS[inst.id]; if (inst.perks.length) str += '\nPerks: ' + inst.perks.map(p => PERKS[p].name).join(', '); if (b.brand) str += `\n${BRANDS[b.brand].name}`; str += '\n' + b.desc; }
    this.showDesc(str);
  }
  showDesc(str) {
    if (this.descObj) this.descObj.destroy();
    this.descObj = text(this, 306, 120, wrapText(str || '', 160).slice(0, 6).join('\n'), C.text).setDepth(210);
  }
  popList(title, items, onPick, onMove) {
    if (!items.length) { audio.sfx('error'); return; }
    const pg = panel(this, 298, 6, 176, 110).setDepth(200);
    const tt = text(this, 306, 12, title, C.accent).setDepth(201);
    const close = () => { pg.destroy(); tt.destroy(); this.list2 && this.list2.destroy(); this.list2 = null; if (this.descObj) { this.descObj.destroy(); this.descObj = null; } };
    this.list2 = new ListMenu(this, 304, 26, 166, items, {
      rows: 8, lineH: 11, depth: 202,
      onSelect: (it) => { close(); onPick(it); },
      onBack: () => { close(); this.drawBuildInfo(); },
      onMove: (it) => onMove && onMove(it),
    });
    onMove && onMove(items[0]);
  }

  // ---------- ITEMS ----------
  openItems() {
    this.clear(); this.mode = 'list';
    const s = G.state;
    this.o(panel(this, 8, 8, 300, 254)); this.o(text(this, 16, 14, 'ITEMS', C.accent));
    this.o(panel(this, 314, 8, 158, 254));
    const desc = this.o(text(this, 322, 16, '', C.text));
    const build = () => Object.entries(s.items).map(([k, n]) => ({ label: ITEMS[k].name, right: 'x' + n, id: k }));
    const items = build();
    if (!items.length) items.push({ label: '(no items)', disabled: true });
    this.list = new ListMenu(this, 16, 30, 284, items, {
      rows: 18, lineH: 12,
      onMove: (it) => desc.setText(it.id ? wrapText(ITEMS[it.id].desc + (ITEMS[it.id].field ? '\n\nZ: use now' : '\n\nBattle only.'), 140).join('\n') : ''),
      onSelect: (it) => {
        if (!it.id || !ITEMS[it.id].field) { audio.sfx('error'); return; }
        const st = computeStats(s);
        if (s.hp >= st.maxHp) { audio.sfx('error'); return; }
        useItem(s, it.id);
        s.hp = Math.min(st.maxHp, s.hp + (it.id === 'ramen' ? 40 : it.id === 'burrito' ? 120 : Math.round(st.maxHp * 0.6)));
        audio.sfx('heal'); this.list.setItems(build().length ? build() : [{ label: '(no items)', disabled: true }]);
        mats.setText(`HP ${s.hp}/${st.maxHp}\n\nScrap: ${s.mats.scrap}\nSilicon: ${s.mats.silicon}`);
      },
      onBack: () => this.openMain(1),
    });
    const st = computeStats(s);
    const mats = this.o(text(this, 322, 190, `HP ${s.hp}/${st.maxHp}\n\nScrap: ${s.mats.scrap}\nSilicon: ${s.mats.silicon}`, C.dim));
    this.list.onMove(items[0]);
  }

  // ---------- NOTES ----------
  openNotes() {
    this.clear(); this.mode = 'list';
    const s = G.state;
    this.o(panel(this, 8, 8, 170, 254)); this.o(text(this, 16, 14, `NOTES ${s.notes.length}/${Object.keys(NOTES).length}`, C.accent));
    this.o(panel(this, 184, 8, 288, 254));
    const body = this.o(text(this, 192, 16, '', C.text));
    const items = s.notes.map(id => ({ label: NOTES[id].title.slice(0, 26), id }));
    if (!items.length) items.push({ label: '(nothing yet)', disabled: true });
    this.list = new ListMenu(this, 14, 30, 160, items, {
      rows: 19, lineH: 11,
      onMove: (it) => { if (!it.id) return body.setText('Read sticky notes, flash drives,\nwhiteboards and terminals around\nHollis Hall to fill this log.'); const n = NOTES[it.id]; body.setText(wrapText(n.title.toUpperCase() + '\n\n' + n.text, 272).slice(0, 21).join('\n')); },
      onSelect: () => {}, onBack: () => this.openMain(2),
    });
    this.list.onMove(items[0]);
  }

  // ---------- MAP ----------
  openMap(direct = false) {
    this.clear(); this.mode = 'map'; this.direct = direct;
    const s = G.state, cur = ROOMS[s.room];
    this.mapSector = this.mapSector || cur.sector;
    const visitedSectors = SECTORS.filter(sec => Object.keys(s.visited).some(r => ROOMS[r] && ROOMS[r].sector === sec.id));
    this.o(panel(this, 8, 8, 464, 254));
    const sec = SECTORS.find(x => x.id === this.mapSector) || SECTORS[0];
    this.o(text(this, 16, 14, `${sec.hour}  ·  ${sec.name.toUpperCase()}`, C.accent));
    this.o(text(this, 300, 14, '◄ ► sector   X close', C.dim));
    const g = this.o(this.add.graphics());
    const rooms = Object.entries(ROOMS).filter(([, r]) => r.sector === this.mapSector && r.map);
    const cell = 34, ox = 40, oy = 40;
    // connections
    for (const [id, r] of rooms) {
      if (!s.visited[id]) continue;
      for (const e of Object.values(r.ents || {})) {
        if (e.type !== 'door' || !ROOMS[e.to] || !ROOMS[e.to].map || ROOMS[e.to].sector !== this.mapSector) continue;
        const a = r.map, b = ROOMS[e.to].map;
        g.lineStyle(2, 0x4a4860).lineBetween(ox + (a[0] + 0.5) * cell, oy + (a[1] + 0.5) * cell, ox + (b[0] + 0.5) * cell, oy + (b[1] + 0.5) * cell);
      }
    }
    for (const [id, r] of rooms) {
      const [mx, my, mw = 1, mh = 1] = r.map;
      const x = ox + mx * cell + 3, y = oy + my * cell + 3, w = mw * cell - 6, h = mh * cell - 6;
      const seen = s.visited[id];
      g.fillStyle(seen ? 0x221f3a : 0x0d0b14, 1).fillRect(x, y, w, h);
      g.lineStyle(1, id === s.room ? 0xffe08a : seen ? 0x8a84b8 : 0x2e2c40).strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      if (seen) {
        const hasOutlet = Object.values(r.ents || {}).some(e => e.type === 'outlet');
        const hasBoss = Object.values(r.ents || {}).find(e => e.type === 'boss');
        if (hasOutlet) g.fillStyle(0x5ee0e8, 1).fillRect(x + 3, y + 3, 4, 4);
        if (hasBoss && !s.bosses[hasBoss.boss]) g.fillStyle(0xe0485e, 1).fillRect(x + w - 7, y + 3, 4, 4);
        const label = r.short || r.name;
        this.o(text(this, x + 2, y + h - 10, label.slice(0, Math.floor(w / 6)), id === s.room ? C.gold : C.dim));
      }
      if (id === s.room) { this.youDot = this.o(this.add.rectangle(x + w / 2, y + h / 2, 4, 4, 0xffe08a)); }
    }
    this.o(text(this, 16, 246, '■ Outlet   ■ Boss', C.dim));
    this.o(this.add.rectangle(19, 249, 4, 4, 0x5ee0e8)); this.o(this.add.rectangle(73, 249, 4, 4, 0xe0485e));
    this.mapSectors = visitedSectors.map(x => x.id);
  }
  updateMap(delta) {
    if (this.youDot) this.youDot.setAlpha(0.5 + 0.5 * Math.sin(this.time.now / 120));
    const d = this.keys.nav(delta);
    if ((d === 'left' || d === 'right') && this.mapSectors.length > 1) {
      let i = this.mapSectors.indexOf(this.mapSector);
      i = (i + (d === 'left' ? -1 : 1) + this.mapSectors.length) % this.mapSectors.length;
      this.mapSector = this.mapSectors[i]; audio.sfx('move'); this.openMap(this.direct);
    } else if (this.keys.pressed('back') || this.keys.pressed('map') || this.keys.pressed('ok')) {
      this.mapSector = null;
      if (this.direct) this.close(); else { audio.sfx('back'); this.openMain(3); }
    }
  }

  // ---------- STATUS ----------
  openStatus() {
    this.clear(); this.mode = 'status';
    const s = G.state, st = computeStats(s);
    this.o(panel(this, 8, 8, 464, 254)); this.o(text(this, 16, 14, 'STATUS', C.accent));
    const lines = [
      `Level ${s.level}   XP ${s.xp}/${xpToNext(s.level)}`,
      ...STAT_LABELS.map(([k, l]) => `${l.padEnd(8, ' ')} ${st[k]}`),
      `FORM     ${FORMS[st.form].name}: ${FORMS[st.form].desc}`,
      '',
      `Difficulty: ${DIFFICULTY[s.difficulty].name}`,
      `Battles: ${s.stats.battles}   Wins: ${s.stats.wins}   Steps: ${s.stats.steps}`,
      `Parts owned: ${s.parts.length}   Apps known: ${s.apps.length}`,
      `Rooms explored: ${Object.keys(s.visited).length}/${Object.keys(ROOMS).length}   Supply boxes: ${Object.keys(s.opened).length}`,
    ];
    this.o(text(this, 18, 30, lines.join('\n'), C.text));
    const perks = Object.entries(st.perks).map(([k, n]) => `${PERKS[k].name}${n > 1 ? ' x' + n : ''}`).join(', ');
    this.o(text(this, 18, 200, wrapText('Active perks: ' + (perks || 'none'), 440).join('\n'), C.good));
  }

  // ---------- SETTINGS ----------
  openSettings(cursor = 0) {
    this.clear(); this.mode = 'list';
    const s = G.state;
    this.o(panel(this, 8, 8, 300, 140)); this.o(text(this, 16, 14, 'SETTINGS  (←/→ to change)', C.accent));
    const diffs = Object.keys(DIFFICULTY);
    const items = () => [
      { label: 'Music volume', right: Math.round(audio.vol.music * 10) + '/10', k: 'music' },
      { label: 'SFX volume', right: Math.round(audio.vol.sfx * 10) + '/10', k: 'sfx' },
      { label: 'Text speed', right: ['Slow', 'Normal', 'Fast', 'Instant'][[0.5, 1, 2, 99].indexOf(G.textSpeed || 1)], k: 'text' },
      { label: 'Difficulty', right: DIFFICULTY[s.difficulty].name, k: 'diff' },
      { label: 'Fullscreen', right: this.scale.isFullscreen ? 'On' : 'Off', k: 'fs' },
      { label: 'Back', k: 'back' },
    ];
    const desc = this.o(text(this, 16, 160, '', C.dim));
    const showDesc = (it) => desc.setText(it.k === 'diff' ? wrapText(DIFFICULTY[s.difficulty].desc, 290).join('\n') : '');
    this.list = new ListMenu(this, 16, 30, 284, items(), {
      rows: 6, lineH: 15, cursor,
      onSelect: (it) => { if (it.k === 'back') return this.openMain(5); if (it.k === 'fs') { this.scale.toggleFullscreen(); this.time.delayedCall(100, () => this.list.setItems(items())); } },
      onBack: () => this.openMain(5), onMove: showDesc,
    });
    this.settingsAdjust = (dir) => {
      const it = this.list.items[this.list.cursor];
      if (it.k === 'music' || it.k === 'sfx') audio.setVol(it.k, audio.vol[it.k] + dir * 0.1);
      if (it.k === 'text') { const sp = [0.5, 1, 2, 99]; G.textSpeed = sp[Math.max(0, Math.min(3, sp.indexOf(G.textSpeed || 1) + dir))]; try { localStorage.setItem('an_text', G.textSpeed); } catch (e) { /* ignore */ } }
      if (it.k === 'diff') s.difficulty = diffs[(diffs.indexOf(s.difficulty) + dir + diffs.length) % diffs.length];
      audio.sfx('move'); this.list.setItems(items()); showDesc(this.list.items[this.list.cursor]);
    };
  }
  confirmTitle() {
    this.clear(); this.mode = 'list';
    this.o(panel(this, 120, 90, 240, 80));
    this.o(text(this, 132, 100, wrapText('Return to title? Progress since your last Outlet save will be lost.', 220).join('\n'), C.text));
    this.list = new ListMenu(this, 140, 136, 200, [{ label: 'Stay' }, { label: 'Quit to title', color: C.bad }], {
      rows: 2, lineH: 12,
      onSelect: (it, i) => { if (i === 0) return this.openMain(6); this.scene.stop('World'); this.scene.stop(); this.scene.start('Title'); },
      onBack: () => this.openMain(6),
    });
  }

  update(time, delta) {
    if (this.mode === 'build') return this.updateBuild(delta);
    if (this.mode === 'map') return this.updateMap(delta);
    if (this.mode === 'status') { if (this.keys.pressed('back') || this.keys.pressed('ok')) { audio.sfx('back'); this.openMain(4); } return; }
    if (this.settingsAdjust && this.list && this.objs.length && this.list.items[0] && this.list.items[0].k === 'music') {
      if (this.keys.pressed('left')) return this.settingsAdjust(-1);
      if (this.keys.pressed('right')) return this.settingsAdjust(1);
    }
    if (this.list) this.list.update(this.keys, delta);
  }
}
