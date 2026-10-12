// Dialogue / script runner. Steps: {who,text,phone} {choice} {set} {unset} {if} {give} {call} {sfx} {music} {wait}
import { text, panel, wrapText, C, W, H, ListMenu } from './ui.js';
import { audio } from './audio.js';
import { G } from './state.js';

export const SPEAKERS = {
  jules: { name: 'Jules', face: 'pt_jules', color: '#5ee0e8' },
  dex: { name: 'Dex', face: 'pt_dex', color: '#ff6b6b', phone: true },
  okafor: { name: 'Mrs. Okafor', face: 'pt_okafor', color: '#f08a3c' },
  priya: { name: 'Priya', face: 'pt_priya', color: '#d4a0ff' },
  minima: { name: 'MINIMA', face: 'pt_minima', color: '#d4a0ff' },
  ventner: { name: 'H. VENTNER', face: 'pt_ventner', color: '#a6e07a' },
  student: { name: '???', face: 'pt_student', color: '#b8f6f8' },
  gary: { name: 'Gary (asleep)', face: 'pt_gary', color: '#b8f6f8' },
  sys: { name: '', face: null, color: '#f2f0e6' },
};

export class Dialogue {
  constructor(scene) {
    this.scene = scene; this.active = false; this.queue = []; this.objs = []; this.menu = null;
  }
  run(script, onDone) {
    this.active = true; this.onDone = onDone;
    this.queue = Array.isArray(script) ? script.slice() : [script];
    this.next();
  }
  clear() { this.objs.forEach(o => o.destroy()); this.objs = []; if (this.menu) { this.menu.destroy(); this.menu = null; } }
  finish() {
    this.clear(); this.active = false; this.mode = null;
    const cb = this.onDone; this.onDone = null;
    cb && cb();
  }
  next() {
    this.clear();
    if (!this.queue.length) return this.finish();
    const st = this.queue.shift();
    const s = G.state;
    if (typeof st === 'function') { st(this.scene); return this.next(); }
    if (st.text != null) return this.showText(st);
    if (st.choice) return this.showChoice(st);
    if (st.set) { s.flags[st.set] = true; return this.next(); }
    if (st.unset) { delete s.flags[st.unset]; return this.next(); }
    if (st.if) {
      const ok = typeof st.if === 'function' ? st.if(s) : !!s.flags[st.if];
      this.queue.unshift(...((ok ? st.then : st.else) || []));
      return this.next();
    }
    if (st.give) { this.scene.giveReward && this.scene.giveReward(st.give, st.quiet); return st.quiet ? this.next() : this.showText({ who: 'sys', text: this.scene.rewardText(st.give) }); }
    if (st.sfx) { audio.sfx(st.sfx); return this.next(); }
    if (st.music) { audio.play(st.music); return this.next(); }
    if (st.wait) { this.mode = 'wait'; this.scene.time.delayedCall(st.wait, () => this.next()); return; }
    if (st.call) {
      if (st.call.length >= 2) { this.mode = 'wait'; st.call(this.scene, () => this.next()); }
      else { st.call(this.scene); this.next(); }
      return;
    }
    this.next();
  }
  showText(st) {
    this.mode = 'text';
    const sp = SPEAKERS[st.who] || SPEAKERS.sys;
    const phone = st.phone || sp.phone;
    const dep = 1000;
    if (phone) {
      const x = W - 196, y = 8, w = 188;
      const lines = wrapText(st.text, w - 50);
      const h = Math.max(46, 22 + lines.length * 10);
      this.objs.push(panel(this.scene, x, y, w, h, { fill: 0x101a30, edge: 0x4a74d6, hi: 0x8fb0ff }).setScrollFactor(0).setDepth(dep));
      this.objs.push(this.scene.add.image(x + 20, y + 22, 'pt_' + (st.who === 'dex' ? 'dex' : 'phone')).setScrollFactor(0).setDepth(dep + 1).setScale(0.7));
      this.objs.push(text(this.scene, x + 40, y + 6, (sp.name || 'Phone') + ' ✉', sp.color).setScrollFactor(0).setDepth(dep + 1));
      this.full = lines.join('\n');
      this.body = text(this.scene, x + 40, y + 18, '', C.text).setScrollFactor(0).setDepth(dep + 1);
      audio.sfx('pickup');
    } else {
      const x = 6, h = 66, y = H - h - 6, w = W - 12;
      this.objs.push(panel(this.scene, x, y, w, h).setScrollFactor(0).setDepth(dep));
      let tx = x + 10;
      if (sp.face) {
        this.objs.push(this.scene.add.image(x + 28, y + 33, sp.face).setScrollFactor(0).setDepth(dep + 1));
        const g = this.scene.add.graphics().setScrollFactor(0).setDepth(dep + 2);
        g.lineStyle(1, C.edgeHi).strokeRect(x + 7.5, y + 12.5, 41, 41);
        this.objs.push(g);
        tx = x + 56;
      }
      const name = st.name || sp.name;
      if (name) this.objs.push(text(this.scene, tx, y + 6, name, sp.color).setScrollFactor(0).setDepth(dep + 1));
      const lines = wrapText(st.text, w - (tx - x) - 10);
      this.full = lines.slice(0, 5).join('\n');
      this.body = text(this.scene, tx, y + (name ? 18 : 10), '', C.text).setScrollFactor(0).setDepth(dep + 1);
      this.arrow = text(this.scene, x + w - 14, y + h - 12, '▼', C.accent).setScrollFactor(0).setDepth(dep + 1).setVisible(false);
      this.objs.push(this.arrow);
    }
    this.objs.push(this.body);
    this.shown = 0; this.tick = 0;
  }
  showChoice(st) {
    this.mode = 'choice';
    const opts = st.choice.filter(c => !c.if || c.if(G.state));
    const w = Math.max(120, ...opts.map(o => o.label.length * 6 + 26));
    const h = opts.length * 12 + 10;
    const x = W - w - 10, y = H - 80 - h;
    if (st.prompt) {
      const sp = SPEAKERS[st.who || 'sys'];
      this.objs.push(panel(this.scene, 6, H - 72, W - 12, 66).setScrollFactor(0).setDepth(1000));
      this.objs.push(text(this.scene, 16, H - 62, wrapText(st.prompt, W - 40).join('\n'), sp ? C.text : C.text).setScrollFactor(0).setDepth(1001));
    }
    this.objs.push(panel(this.scene, x, y, w, h).setScrollFactor(0).setDepth(1002));
    this.menu = new ListMenu(this.scene, x + 6, y + 6, w - 10, opts.map(o => ({ label: o.label, opt: o })), {
      rows: opts.length, lineH: 12, depth: 1003,
      onSelect: (it) => { this.queue.unshift(...(it.opt.then || [])); this.next(); },
    });
    this.menu.objs.forEach(o => o.setScrollFactor && o.setScrollFactor(0));
    const render = this.menu.render.bind(this.menu);
    this.menu.render = () => { render(); this.menu.objs.forEach(o => o.setScrollFactor && o.setScrollFactor(0)); };
  }
  update(input, delta) {
    if (!this.active) return;
    if (this.mode === 'choice' && this.menu) return this.menu.update(input, delta);
    if (this.mode !== 'text') return;
    const speed = G.textSpeed || 1;
    if (this.shown < this.full.length) {
      this.tick += delta * speed;
      const n = Math.min(this.full.length, Math.floor(this.tick / 16));
      if (n > this.shown) {
        if (Math.floor(n / 3) !== Math.floor(this.shown / 3)) audio.sfx('text');
        this.shown = n; this.body.setText(this.full.slice(0, n));
      }
      if (input.pressed('ok') || input.pressed('back')) { this.shown = this.full.length; this.body.setText(this.full); }
    } else {
      if (this.arrow) this.arrow.setVisible(Math.floor(this.scene.time.now / 300) % 2 === 0);
      if (input.pressed('ok') || input.pressed('back')) { audio.sfx('move'); this.next(); }
    }
  }
}
