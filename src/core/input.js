// Keyboard-only input. Presses are buffered from DOM events so quick taps are never lost.
const MAP = {
  up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'], left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'],
  ok: ['KeyZ', 'Enter', 'Space', 'NumpadEnter'], back: ['KeyX', 'Escape', 'Backspace'], build: ['Tab', 'KeyB'], map: ['KeyM'], tool: ['KeyQ'],
  pageL: ['BracketLeft', 'Comma'], pageR: ['BracketRight', 'Period'], run: ['ShiftLeft', 'ShiftRight'],
};
const CODE_TO_ACT = {};
for (const [act, codes] of Object.entries(MAP)) for (const c of codes) (CODE_TO_ACT[c] = CODE_TO_ACT[c] || []).push(act);
const PREVENT = new Set(['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Backspace']);

// Global held-key state shared by all scenes.
const down = new Set();
const listeners = new Set();
let installed = false;
function install() {
  if (installed) return; installed = true;
  window.addEventListener('keydown', (e) => {
    if (PREVENT.has(e.code)) e.preventDefault();
    const acts = CODE_TO_ACT[e.code]; if (!acts) return;
    acts.forEach(a => down.add(a));
    if (e.repeat) return;
    listeners.forEach(l => { if (l.scene.sys.isActive()) acts.forEach(a => l.buffer.add(a)); });
  });
  window.addEventListener('keyup', (e) => { const acts = CODE_TO_ACT[e.code]; if (acts) acts.forEach(a => down.delete(a)); });
  window.addEventListener('blur', () => down.clear());
}

export class Input {
  constructor(scene) {
    install();
    this.scene = scene; this.buffer = new Set(); this.repeat = { dir: null, t: 0 }; this.locked = false;
    listeners.add(this);
    scene.events.once('shutdown', () => listeners.delete(this));
    scene.events.once('destroy', () => listeners.delete(this));
    // Only the topmost active scene should consume input: ignore presses while this scene is paused/asleep.
    // Unconsumed presses expire after the frame they arrive in.
    scene.events.on('postupdate', () => this.buffer.clear());
    scene.events.on('pause', () => this.buffer.clear());
    scene.events.on('sleep', () => this.buffer.clear());
  }
  held(act) { return !this.locked && down.has(act); }
  pressed(act) {
    if (this.locked) return false;
    if (this.buffer.has(act)) { this.buffer.delete(act); return true; }
    return false;
  }
  nav(delta) {
    if (this.locked) return null;
    for (const d of ['up', 'down', 'left', 'right']) {
      if (this.pressed(d)) { this.repeat = { dir: d, t: 280 }; return d; }
    }
    const d = this.repeat.dir;
    if (d && this.held(d)) {
      this.repeat.t -= delta;
      if (this.repeat.t <= 0) { this.repeat.t = 70; return d; }
    } else this.repeat.dir = null;
    return null;
  }
  flush() { this.buffer.clear(); }
}
