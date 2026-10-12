// Title screen: press start, new game (slot + difficulty), continue, settings.
import { Input } from '../core/input.js';
import { audio } from '../core/audio.js';
import { G, newGame, listSaves, fmtTime, DIFFICULTY, deleteGame } from '../core/state.js';
import { text, shadowText, panel, C, W, H, ListMenu, wrapText } from '../core/ui.js';
import { ROOMS } from '../data/rooms/index.js';

export class Title extends Phaser.Scene {
  constructor() { super('Title'); }
  create() {
    this.keys = new Input(this);
    this.objs = [];
    this.drawScene();
    this.started = false;
    this.prompt = shadowText(this, W / 2 - 66, 196, 'PRESS Z OR ENTER', C.text);
    this.tweens.add({ targets: [this.prompt, this.prompt.shadow], alpha: 0.2, yoyo: true, repeat: -1, duration: 600 });
    text(this, 4, H - 10, 'v' + (G.version || '1.0'), 0x4a4860);
    if (G.unlocked) this.start();
  }
  drawScene() {
    const g = this.add.graphics();
    for (let y = 0; y < H; y++) { const t = y / H; g.fillStyle(Phaser.Display.Color.GetColor(10 + t * 30, 6 + t * 10, 24 + t * 40), 1).fillRect(0, y, W, 1); }
    for (let i = 0; i < 70; i++) g.fillStyle(0xffffff, Math.random() * 0.8).fillRect(Math.random() * W, Math.random() * 120, 1, 1);
    g.fillStyle(0xf2f0e6, 1).fillCircle(400, 46, 14); g.fillStyle(0x1a1028, 1).fillCircle(394, 42, 12);
    // Hollis Hall silhouette with windows
    g.fillStyle(0x0d0b14, 1).fillRect(120, 110, 240, 160).fillRect(200, 84, 80, 30).fillRect(232, 64, 16, 22);
    g.fillStyle(0x0d0b14, 1).fillRect(0, 230, W, 40);
    this.windows = [];
    for (let r = 0; r < 6; r++) for (let c = 0; c < 12; c++) {
      const lit = Math.random() < 0.3;
      const w = this.add.rectangle(132 + c * 19, 122 + r * 18, 9, 9, lit ? 0x5ee0e8 : 0x1c1a2b).setAlpha(lit ? 0.8 : 1);
      if (lit) this.windows.push(w);
    }
    this.add.rectangle(240, 76, 8, 8, 0xe0485e);
    this.time.addEvent({ delay: 400, loop: true, callback: () => { const w = Phaser.Utils.Array.GetRandom(this.windows); if (w) { w.fillColor = Math.random() < 0.5 ? 0x9a5ad8 : 0x5ee0e8; w.setAlpha(Math.random() * 0.6 + 0.4); } } });
    // Logo
    this.logo = shadowText(this, W / 2 - 132, 20, 'ALL-NIGHTER', C.text, 4);
    this.logoGlitch = text(this, W / 2 - 132, 20, 'ALL-NIGHTER', 0xe0485e, 4).setAlpha(0);
    shadowText(this, W / 2 - 129, 58, 'Debug the building before the sun comes up.', C.accent);
    this.time.addEvent({ delay: 1800, loop: true, callback: () => {
      this.logoGlitch.setAlpha(0.8).setX(W / 2 - 132 + (Math.random() < 0.5 ? -3 : 3));
      if (G.unlocked) audio.sfx('glitch');
      this.time.delayedCall(90, () => this.logoGlitch.setAlpha(0));
    } });
    shadowText(this, W / 2 - 24, 232, '2:00 AM', C.gold);
  }
  start() {
    this.started = true;
    if (this.prompt) { this.prompt.destroy(); this.prompt = null; }
    audio.unlock(); G.unlocked = true;
    audio.play('title');
    this.openRoot();
  }
  clear() { this.objs.forEach(o => o.destroy()); this.objs = []; if (this.list) this.list.destroy(); this.list = null; }
  o(x) { this.objs.push(x); return x; }
  openRoot(cursor = 0) {
    this.clear();
    const hasSave = listSaves().some(x => x.data);
    this.o(panel(this, W / 2 - 60, 178, 120, 64));
    const items = [{ label: 'Continue', disabled: !hasSave }, { label: 'New Game' }, { label: 'How to Play' }];
    if (window.location.search.includes('desktop')) items.push({ label: 'Quit' });
    this.list = new ListMenu(this, W / 2 - 50, 186, 104, items, {
      rows: 4, lineH: 13, cursor: hasSave ? cursor : Math.max(cursor, 1),
      onSelect: (it, i) => [() => this.openSlots('load'), () => this.openSlots('new'), () => this.howTo(), () => window.close()][i](),
    });
  }
  openSlots(mode) {
    this.clear();
    this.o(panel(this, 60, 150, 360, 100));
    this.o(text(this, 70, 156, mode === 'new' ? 'NEW GAME: choose a save slot' : 'CONTINUE: choose a save slot', C.accent));
    const items = listSaves().map(({ slot, data }) => ({
      label: data ? `Slot ${slot}  LV${data.level}  ${data.hour} AM  ${(ROOMS[data.room] || {}).short || (ROOMS[data.room] || {}).name || ''}`.slice(0, 44) : `Slot ${slot}  (empty)`,
      right: data ? fmtTime(data.playtime) : '', slot, data, disabled: mode === 'load' && !data,
    }));
    this.list = new ListMenu(this, 70, 172, 340, items, {
      rows: 3, lineH: 14,
      onSelect: (it) => {
        if (mode === 'load') { G.state = it.data; G.slot = it.slot; return this.begin(); }
        if (it.data) return this.confirmOverwrite(it.slot);
        this.chooseDifficulty(it.slot);
      },
      onBack: () => this.openRoot(mode === 'new' ? 1 : 0),
    });
  }
  confirmOverwrite(slot) {
    this.clear();
    this.o(panel(this, 90, 160, 300, 70));
    this.o(text(this, 100, 168, `Overwrite slot ${slot}? This erases that save.`, C.warn));
    this.list = new ListMenu(this, 100, 188, 280, [{ label: 'No' }, { label: 'Yes, overwrite', color: C.bad }], {
      rows: 2, lineH: 13,
      onSelect: (it, i) => (i ? (deleteGame(slot), this.chooseDifficulty(slot)) : this.openSlots('new')),
      onBack: () => this.openSlots('new'),
    });
  }
  chooseDifficulty(slot) {
    this.clear();
    this.o(panel(this, 40, 120, 400, 140));
    this.o(text(this, 50, 126, 'DIFFICULTY  (change anytime in Settings)', C.accent));
    const desc = this.o(text(this, 200, 146, '', C.text));
    const keys = Object.keys(DIFFICULTY);
    this.list = new ListMenu(this, 50, 146, 140, keys.map(k => ({ label: DIFFICULTY[k].name, k })), {
      rows: 4, lineH: 16, cursor: 1,
      onMove: (it) => desc.setText(wrapText(DIFFICULTY[it.k].desc, 230).join('\n')),
      onSelect: (it) => { G.state = newGame(it.k); G.slot = slot; this.begin(true); },
      onBack: () => this.openSlots('new'),
    });
    this.list.onMove(this.list.items[1]);
  }
  howTo() {
    this.clear();
    this.o(panel(this, 20, 14, 440, 242));
    const lines = [
      'CONTROLS (keyboard)',
      '  Arrows / WASD ..... move (hold Shift to run)',
      '  Z / Enter / Space . talk, interact, swing at Glitches',
      '  X / Esc ........... back / pause menu',
      '  Tab / B ........... open your Build (motherboard)',
      '  M ................. map      Q ...... use field tool',
      '',
      'BATTLES are turn-based. The bar at the top shows who acts next;',
      'fast actions bring your next turn sooner. Attacks build HEAT.',
      'Hit the cap and you OVERHEAT: lose a turn and take extra damage.',
      'Vent or Guard to cool down. Apps cost POWER.',
      'Icons over Glitches show what they will do next. Plan for it.',
      '',
      'Swing at a Glitch on the map for a first strike.',
      'Let one catch you from behind and IT strikes first.',
      'Outlets heal, save, and let you fast travel.',
    ];
    this.o(text(this, 32, 24, lines.join('\n'), C.text));
    this.list = new ListMenu(this, 380, 236, 70, [{ label: 'Back' }], { rows: 1, onSelect: () => this.openRoot(2), onBack: () => this.openRoot(2) });
  }
  begin(isNew = false) {
    audio.sfx('select');
    this.list && (this.list.active = false);
    this.cameras.main.fadeOut(500, 7, 6, 12);
    this.cameras.main.once('camerafadeoutcomplete', () => { audio.stop(); this.scene.start('World', {}); });
    void isNew;
  }
  update(t, d) {
    if (!this.started) { if (this.keys.pressed('ok') || this.keys.pressed('back')) { audio.unlock(); this.start(); audio.sfx('select'); } return; }
    if (this.list) this.list.update(this.keys, d);
  }
}
