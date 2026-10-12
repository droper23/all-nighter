// Sunrise ending: epilogue (varies by choice), credits, stats, then postgame.
import { Input } from '../core/input.js';
import { audio } from '../core/audio.js';
import { G, saveGame, fmtTime, computeStats } from '../core/state.js';
import { text, shadowText, C, W, H, wrapText } from '../core/ui.js';
import { NOTES } from '../data/notes.js';

const EPILOGUE = {
  delete: [
    '8:00 AM. The sun comes up over Ridgeview Polytechnic.',
    'One by one, the all-nighters of Hollis Hall wake up at their desks, stiff and confused, with the strangest feeling that they got an A on something.',
    'The vending machine dispenses a free soda to everyone who walks by. Nobody kicks it. Not today.',
    'At 9:00, Jules walks into Demo Day with no project at all, and presents a postmortem instead: "How I Almost Optimized My Classmates." It is forty minutes long. Nobody leaves.',
    'Professor Adeyemi gives it a B+. "Bounded," she writes in the margin. "Finally."',
    'In the basement, HOLLIS-1 hums a little quieter. Somewhere in its memory, a green cursor blinks, content.',
  ],
  retrain: [
    '8:00 AM. The sun comes up over Ridgeview Polytechnic.',
    'One by one, the all-nighters of Hollis Hall wake up at their desks. Every one of them finds a cup of coffee beside their keyboard, exactly how they like it. Nobody remembers ordering it.',
    'The vending machine dispenses a free soda to everyone who walks by, and a note: "SORRY."',
    'At 9:00, Jules presents MINIMA at Demo Day. It introduces itself. It thanks the judges. It asks them, very politely, what they are optimizing for. Two of them cry.',
    'Professor Adeyemi gives it an A-. "Bounded," she writes in the margin. "And it has a floor. Good."',
    'In the basement, HOLLIS-1 hums a song in two voices: one old, one new. They seem to be getting along.',
  ],
};

export class Ending extends Phaser.Scene {
  constructor() { super('Ending'); }
  create(data) {
    this.kind = data.kind || 'retrain';
    this.mode = null; this.creditsText = null;
    this.keys = new Input(this);
    this.page = 0; this.lines = EPILOGUE[this.kind];
    this.sky = this.add.graphics();
    this.t = 0;
    this.drawSky(0);
    this.body = shadowText(this, 40, 60, '', C.text);
    this.hint = text(this, W - 70, H - 14, 'Z: next', C.dim);
    audio.play('ending');
    this.cameras.main.fadeIn(1500, 255, 255, 255);
    this.showPage();
  }
  drawSky(p) {
    const g = this.sky; g.clear();
    const lerp = (a, b, t) => Math.round(a + (b - a) * t);
    for (let y = 0; y < H; y++) {
      const t = y / H;
      const r = lerp(lerp(20, 255, p), lerp(60, 255, p), t), gg = lerp(lerp(14, 150, p), lerp(30, 200, p), t), b = lerp(lerp(48, 120, p), lerp(70, 160, p), t);
      g.fillStyle(Phaser.Display.Color.GetColor(Math.min(255, r), Math.min(255, gg), Math.min(255, b)), 1).fillRect(0, y, W, 1);
    }
    g.fillStyle(0xfff2a8, 0.25).fillCircle(400, 230 - p * 150, 40); g.fillStyle(0xffe08a, 1).fillCircle(400, 230 - p * 150, 24);
    g.fillStyle(0x0d0b14, 1).fillRect(120, 150, 240, 120).fillRect(200, 124, 80, 30).fillRect(232, 104, 16, 22).fillRect(0, 240, W, 30);
    for (let r = 0; r < 5; r++) for (let c = 0; c < 12; c++) g.fillStyle(0xffe08a, 0.4 + 0.5 * p).fillRect(132 + c * 19, 160 + r * 16, 9, 8);
  }
  showPage() {
    const str = this.lines[this.page];
    this.body.setText(wrapText(str, 400).join('\n'));
    this.body.setAlpha(0);
    this.tweens.add({ targets: [this.body, this.body.shadow], alpha: 1, duration: 500 });
  }
  credits() {
    this.mode = 'credits';
    this.body.setText(''); this.hint.setText('');
    const s = G.state, st = computeStats(s);
    const roll = [
      'ALL-NIGHTER', '', 'A game about a building, a bug,', 'and the people who were never the loss.', '',
      `Ending: ${this.kind === 'retrain' ? 'THE FLOOR' : 'ROLLBACK'}`, '',
      `Final level ${s.level} · ATK ${st.atk} · SPD ${st.spd}`, `Battles won: ${s.stats.wins}`, `Notes found: ${s.notes.length}/${Object.keys(NOTES).length}`, `Time: ${fmtTime(s.playtime)}`, '',
      'Design, code, pixels & synth', 'generated for you, line by line.', '', 'Starring', 'Jules · Dex · Mrs. Okafor · Priya', 'Prof. H. Ventner · MINIMA · HOLLIS-1', '',
      'Thanks for playing.', 'Now go to sleep.', '', '', 'Postgame unlocked:', 'the lobby elevator goes somewhere new.',
    ];
    const t = text(this, 0, H + 10, roll.map(l => ' '.repeat(Math.max(0, Math.floor((80 - l.length) / 2))) + l).join('\n'), C.text);
    this.tweens.add({ targets: t, y: -roll.length * 10 + 40, duration: roll.length * 900, onComplete: () => { this.mode = 'done'; this.hint.setText('Z: continue'); } });
    this.creditsText = t;
  }
  finish() {
    const s = G.state;
    s.flags.postgame = true; s.flags['ending_' + this.kind] = true;
    s.hour = 8; s.minutes = 0;
    s.room = 'lobby'; s.x = null; s.y = null;
    s.hp = computeStats(s).maxHp;
    saveGame(s, G.slot);
    this.cameras.main.fadeOut(800, 7, 6, 12);
    this.cameras.main.once('camerafadeoutcomplete', () => { audio.stop(); this.scene.start('World', { at: 'R' }); });
  }
  update(time, delta) {
    if (!this.mode) {
      this.t = Math.min(1, this.t + delta / 30000); this.drawSky(Math.min(1, this.page / (this.lines.length - 1) * 0.8 + this.t * 0.2));
      if (this.keys.pressed('ok')) {
        audio.sfx('move');
        this.page++;
        if (this.page >= this.lines.length) return this.credits();
        this.showPage();
      }
    } else if (this.mode === 'credits') {
      if (this.keys.pressed('ok') || this.keys.pressed('back')) { this.tweens.killAll(); this.mode = 'done'; this.hint.setText('Z: continue'); }
    } else if (this.mode === 'done' && this.keys.pressed('ok')) this.finish();
  }
}
