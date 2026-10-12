// Synthesized audio: chiptune SFX + a small chord-based music sequencer. No asset files.
const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const QUAL = { '': [0, 4, 7, 12], m: [0, 3, 7, 12], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], dim: [0, 3, 6, 9], sus4: [0, 5, 7, 12], sus2: [0, 2, 7, 12], aug: [0, 4, 8, 12], m9: [0, 3, 7, 14] };
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

function parseChord(sym) {
  const m = /^([A-G][#b]?)(.*)$/.exec(sym);
  return { root: NOTE[m[1]], tones: QUAL[m[2]] || QUAL[''] };
}

class AudioEngine {
  constructor() {
    this.ctx = null; this.music = null; this.song = null; this.timer = null;
    this.vol = { music: 0.5, sfx: 0.7 };
    try { Object.assign(this.vol, JSON.parse(localStorage.getItem('an_vol') || '{}')); } catch (e) { /* storage unavailable */ }
  }
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain(); this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain(); this.sfxGain.connect(this.master);
      this.applyVol();
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, len);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }
  applyVol() {
    if (!this.ctx) return;
    this.musicGain.gain.value = this.vol.music * 0.35;
    this.sfxGain.gain.value = this.vol.sfx * 0.5;
  }
  setVol(kind, v) {
    this.vol[kind] = Math.max(0, Math.min(1, Math.round(v * 10) / 10));
    try { localStorage.setItem('an_vol', JSON.stringify(this.vol)); } catch (e) { /* ignore */ }
    this.applyVol();
  }

  tone(freq, dur, { type = 'square', vol = 0.3, at = 0, slide = 0, out = null, attack = 0.005 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + at;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out || this.sfxGain);
    o.start(t); o.stop(t + dur + 0.02);
  }
  noise(dur, { vol = 0.3, at = 0, filter = 3000, out = null, sweep = 0 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + at;
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(filter, t);
    if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(50, filter + sweep), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(out || this.sfxGain);
    s.start(t); s.stop(t + dur + 0.02);
  }

  sfx(name) {
    if (!this.ctx) return;
    const S = {
      move: () => this.tone(880, 0.04, { vol: 0.12 }),
      select: () => { this.tone(660, 0.06, { vol: 0.18 }); this.tone(990, 0.08, { vol: 0.18, at: 0.05 }); },
      back: () => this.tone(440, 0.08, { vol: 0.15, slide: -200 }),
      error: () => { this.tone(140, 0.12, { type: 'sawtooth', vol: 0.15 }); this.tone(120, 0.15, { type: 'sawtooth', vol: 0.15, at: 0.1 }); },
      text: () => this.tone(520 + Math.random() * 80, 0.025, { vol: 0.05 }),
      hit: () => { this.noise(0.12, { vol: 0.35, filter: 2500 }); this.tone(200, 0.1, { vol: 0.2, slide: -120 }); },
      crit: () => { this.noise(0.2, { vol: 0.45, filter: 5000 }); this.tone(900, 0.15, { vol: 0.2, slide: -600 }); this.tone(1200, 0.1, { vol: 0.15, at: 0.05 }); },
      zap: () => { this.tone(1400, 0.12, { type: 'sawtooth', vol: 0.12, slide: -1100 }); },
      burst: () => { for (let i = 0; i < 4; i++) this.tone(1100 - i * 90, 0.05, { type: 'sawtooth', vol: 0.08, slide: -500, at: i * 0.05 }); },
      wave: () => { this.tone(220, 0.35, { type: 'triangle', vol: 0.2, slide: 600 }); this.noise(0.3, { vol: 0.1, filter: 2000, sweep: 3000 }); },
      laser: () => { this.tone(2000, 0.3, { type: 'square', vol: 0.12, slide: -1700 }); this.noise(0.3, { vol: 0.1, filter: 6000, sweep: -5000 }); },
      heal: () => [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.12, { type: 'triangle', vol: 0.2, at: i * 0.06 })),
      shield: () => { this.tone(300, 0.25, { type: 'triangle', vol: 0.25, slide: 400 }); this.tone(600, 0.2, { type: 'sine', vol: 0.12, at: 0.1 }); },
      buff: () => [392, 523, 659].forEach((f, i) => this.tone(f, 0.1, { vol: 0.14, at: i * 0.05 })),
      debuff: () => [659, 523, 392].forEach((f, i) => this.tone(f, 0.1, { vol: 0.14, at: i * 0.05 })),
      overheat: () => { for (let i = 0; i < 4; i++) this.tone(i % 2 ? 660 : 880, 0.1, { type: 'square', vol: 0.18, at: i * 0.11 }); },
      vent: () => this.noise(0.6, { vol: 0.3, filter: 6000, sweep: -5500 }),
      enemyDie: () => { this.noise(0.4, { vol: 0.35, filter: 3000, sweep: -2800 }); this.tone(600, 0.35, { type: 'sawtooth', vol: 0.12, slide: -550 }); },
      summon: () => [262, 392, 523, 784].forEach((f, i) => this.tone(f, 0.08, { type: 'triangle', vol: 0.18, at: i * 0.04 })),
      battle: () => { for (let i = 0; i < 6; i++) this.tone(200 + i * 120, 0.06, { vol: 0.2, at: i * 0.04 }); this.noise(0.4, { vol: 0.2, at: 0.25, filter: 4000 }); },
      swing: () => this.noise(0.1, { vol: 0.2, filter: 8000, sweep: -6000 }),
      door: () => { this.tone(180, 0.15, { type: 'triangle', vol: 0.3 }); this.noise(0.15, { vol: 0.1, filter: 1200 }); },
      pickup: () => [784, 988, 1318].forEach((f, i) => this.tone(f, 0.08, { vol: 0.16, at: i * 0.06 })),
      save: () => [523, 784, 659, 1046].forEach((f, i) => this.tone(f, 0.25, { type: 'triangle', vol: 0.2, at: i * 0.12 })),
      levelup: () => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => this.tone(f, 0.14, { vol: 0.18, at: i * 0.08 })),
      victory: () => [523, 523, 523, 659, 784, 659, 784].forEach((f, i) => this.tone(f, i === 6 ? 0.5 : 0.12, { vol: 0.2, at: [0, .12, .24, .4, .55, .75, .9][i] })),
      step: () => this.noise(0.03, { vol: 0.04, filter: 900 }),
      glitch: () => { for (let i = 0; i < 5; i++) this.tone(100 + Math.random() * 1500, 0.04, { type: 'square', vol: 0.1, at: i * 0.03 }); },
      tool: () => { this.tone(330, 0.1, { type: 'triangle', vol: 0.2 }); this.tone(495, 0.15, { type: 'triangle', vol: 0.2, at: 0.08 }); },
    };
    (S[name] || S.move)();
  }

  // ---- room tone: a quiet continuous bed per sector, under the music ----
  ambient(kind) {
    if (this.ambKind === kind) return;
    if (this.amb) { const a = this.amb; try { a.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2); setTimeout(() => a.nodes.forEach(n => { try { n.stop(); } catch (e) { /* already stopped */ } }), 800); } catch (e) { /* ignore */ } clearInterval(a.timer); }
    this.amb = null; this.ambKind = kind;
    if (!kind || !this.ctx) return;
    const P = AMBIENT[kind]; if (!P) return;
    const ctx = this.ctx, gain = ctx.createGain(), nodes = [];
    gain.gain.value = 0; gain.connect(this.sfxGain);
    gain.gain.setTargetAtTime(P.vol, ctx.currentTime, 0.6);
    if (P.noise) {
      const src = ctx.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
      const f = ctx.createBiquadFilter(); f.type = P.noise.type || 'lowpass'; f.frequency.value = P.noise.freq; f.Q.value = P.noise.q || 0.7;
      src.connect(f); f.connect(gain); src.start(); nodes.push(src);
    }
    for (const [freq, v, type] of P.tones || []) {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type || 'sine'; o.frequency.value = freq; g.gain.value = v;
      o.connect(g); g.connect(gain); o.start(); nodes.push(o);
    }
    const timer = P.tick ? setInterval(() => P.tick(this), P.every) : null;
    this.amb = { gain, nodes, timer };
  }

  // ---- music ----
  // transpose: semitones (battle music shifts key per sector). Intensity layers are set separately.
  play(name, { transpose = 0 } = {}) {
    const key = name + ':' + transpose;
    if (this.songName === key) return;
    this.stop();
    this.songName = key; this.transpose = transpose; this.intensity = 0;
    const song = SONGS[name];
    if (!song || !this.ctx) return;
    this.song = song; this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 25);
  }
  stop() {
    clearInterval(this.timer); this.timer = null; this.songName = null; this.song = null;
  }
  schedule() {
    const s = this.song; if (!s) return;
    const stepDur = 60 / s.bpm / 4;
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      this.playStep(s, this.step, this.nextTime - this.ctx.currentTime, stepDur);
      this.step++;
      this.nextTime += stepDur * (s.swing && this.step % 2 ? 1 + s.swing : s.swing && this.step % 2 === 0 ? 1 - s.swing : 1);
    }
  }
  // 0 calm, 1 tense (boss phase / low foe HP), 2 danger (Jules low): adds percussion and doubles.
  setIntensity(n) { this.intensity = n; }
  playStep(s, step, at, sd) {
    const out = this.musicGain;
    const bar = Math.floor(step / 16) % s.chords.length;
    const ch0 = parseChord(s.chords[bar]);
    const ch = { root: ch0.root + (this.transpose || 0), tones: ch0.tones };
    const lvl = this.intensity || 0;
    if (lvl >= 1 && s.drums && step % 2 === 1) this.noise(0.025, { vol: 0.05, filter: 9000, at, out });
    if (lvl >= 1 && s.bass && step % 4 === 0) this.tone(mtof(12 * ((s.bassOct || 3) + 1) + ch.root), sd * 1.5, { type: 'square', vol: 0.05, at, out });
    if (lvl >= 2 && step % 4 === 0) this.tone(150, 0.1, { type: 'sine', vol: 0.4, slide: -110, at, out });
    if (lvl >= 2 && step % 8 === 4) this.tone(mtof(12 * 6 + ch.root + ch.tones[(step >> 3) % 3]), sd * 2, { type: 'square', vol: 0.045, at, out });
    const i = step % 16;
    const tok = (pat) => { const a = pat.split(' '); return a[step % a.length]; };
    if (s.arp) {
      const t = tok(s.arp);
      if (t !== '.') {
        const idx = parseInt(t, 10);
        const m = 12 * (s.arpOct || 5) + ch.root + ch.tones[idx % 4] + (idx >= 4 ? 12 : 0);
        this.tone(mtof(m), sd * (s.arpLen || 1.6), { type: s.arpWave || 'square', vol: s.arpVol || 0.12, at, out });
      }
    }
    if (s.pad && i === 0) ch.tones.slice(0, 3).forEach(t => this.tone(mtof(12 * (s.padOct || 4) + ch.root + t), sd * 15, { type: s.padWave || 'triangle', vol: s.padVol || 0.05, at, out, attack: 0.3 }));
    if (s.bass) {
      const t = tok(s.bass);
      if (t !== '.') {
        const off = t === 'o' ? 12 : t === '5' ? 7 : 0;
        this.tone(mtof(12 * (s.bassOct || 3) + ch.root + off), sd * (s.bassLen || 1.8), { type: s.bassWave || 'triangle', vol: s.bassVol || 0.3, at, out });
      }
    }
    if (s.drums) {
      const t = tok(s.drums);
      if (t === 'k') { this.tone(150, 0.12, { type: 'sine', vol: 0.5, slide: -110, at, out }); }
      else if (t === 's') this.noise(0.12, { vol: 0.22, filter: 3500, at, out });
      else if (t === 'h') this.noise(0.03, { vol: 0.08, filter: 9000, at, out });
    }
    if (s.lead) {
      const toks = s.lead.split(' ');
      const t = toks[step % toks.length];
      if (t && t !== '.' && t !== '-') {
        const m = /^([A-G][#b]?)(\d)$/.exec(t);
        if (m) {
          let len = 1; while (toks[(step + len) % toks.length] === '-') len++;
          this.tone(mtof(12 * (+m[2] + 1) + NOTE[m[1]] + (this.transpose || 0)), sd * len * 0.95, { type: s.leadWave || 'square', vol: s.leadVol || 0.1, at, out });
        }
      }
    }
  }
}

// Songs: chords cycle one per bar (16 steps). arp/bass/drums patterns loop independently.
export const SONGS = {
  title:   { bpm: 84, chords: ['Am', 'F', 'C', 'E'], arp: '0 2 4 2 1 2 4 2', arpWave: 'triangle', arpVol: 0.1, pad: true, bass: '0 . . . . . . . 0 . . . . . 5 .', lead: 'E5 - - - D5 - C5 - B4 - - - - - . . C5 - - - D5 - E5 - G5 - - - E5 - . . E5 - - - D5 - C5 - D5 - - - E5 - - - G#4 - - - - - - - . . . . . . . .' },
  lobby:   { bpm: 72, chords: ['Dm', 'Bb', 'Gm', 'A'], arp: '0 . 2 . 1 . 2 . 0 . 2 . 4 . 2 .', arpWave: 'triangle', arpVol: 0.09, pad: true, padVol: 0.04, bass: '0 . . . . . . . . . . . 0 . . .' },
  labs:    { bpm: 96, chords: ['Em', 'C', 'D', 'Bm'], arp: '0 1 2 4 2 1', arpWave: 'square', arpVol: 0.06, bass: '0 . 0 . . . 5 . 0 . 0 . o . 5 .', drums: 'k . . . h . . . s . . . h . . .' },
  servers: { bpm: 104, chords: ['F#m', 'D', 'A', 'E'], arp: '0 2 4 2 0 2 4 2 1 2 4 2', arpWave: 'square', arpVol: 0.05, pad: true, padWave: 'sine', bass: '0 . . 0 . . 0 . 0 . . 0 . . 5 .', drums: 'k . h . k . h . s . h . k . h h' },
  archive: { bpm: 66, chords: ['Am7', 'Dm7', 'Gmaj7', 'Cmaj7', 'Fmaj7', 'Bdim', 'E7', 'E7'], arp: '0 2 1 3 2 4 3 2', arpWave: 'sine', arpVol: 0.12, arpLen: 3, bass: '0 . . . . . . . . . . . . . . .' },
  tunnels: { bpm: 88, chords: ['Cm', 'Cm', 'Ab', 'G'], arp: '. . 0 . . . 2 . . . 1 . . 4 . .', arpWave: 'sawtooth', arpVol: 0.04, pad: true, padWave: 'sawtooth', padVol: 0.025, bass: '0 . . 0 . . . . 0 . . 0 . 5 . .', drums: 'k . . . . . . . s . . . . . . h' },
  core:    { bpm: 100, chords: ['Ebm', 'Cb', 'Gb', 'Db'].map(c => c.replace('Cb', 'B')), arp: '0 1 2 4 0 1 2 4 4 2 1 0', arpWave: 'square', arpVol: 0.05, pad: true, padVol: 0.04, bass: '0 . o . 0 . o . 0 . o . 5 . o .', drums: 'k . h . s . h . k k h . s . h .' },
  battle:  { bpm: 148, chords: ['Am', 'F', 'G', 'E'], arp: '0 2 4 2 0 2 4 2', arpWave: 'square', arpVol: 0.07, bass: '0 0 . 0 o . 0 . 0 0 . 0 o . 5 .', bassWave: 'square', bassVol: 0.12, drums: 'k . h . s . h k k . h . s . h h', lead: 'A4 - C5 - E5 - D5 C5 B4 - G4 - B4 - - - A4 - C5 - F5 - E5 D5 C5 - A4 - C5 - - - B4 - D5 - G5 - F5 E5 D5 - B4 - D5 - - - E5 - - - B4 - - - G#4 - - - E4 - - -' },
  boss:    { bpm: 160, chords: ['Dm', 'Dm', 'Bb', 'C', 'Dm', 'Dm', 'Gm', 'A'], arp: '0 1 2 4 2 1 0 1', arpWave: 'sawtooth', arpVol: 0.05, bass: '0 0 o 0 0 o 0 o', bassWave: 'square', bassVol: 0.12, drums: 'k h s h k k s h', lead: 'D5 - - - F5 - - - A5 - G5 - F5 - E5 - D5 - - - C5 - D5 - E5 - - - - - - - F5 - - - E5 - - - D5 - C5 - Bb4 - C5 - D5 - - - - - - - . . . . . . . .' },
  final:   { bpm: 168, chords: ['Ebm', 'B', 'Db', 'Bbm', 'Ebm', 'B', 'Ab', 'Bb'], arp: '0 2 4 2 1 2 4 2', arpWave: 'square', arpVol: 0.06, pad: true, padWave: 'sawtooth', padVol: 0.03, bass: '0 0 o 0 5 0 o 0', bassWave: 'sawtooth', bassVol: 0.1, drums: 'k h s h k k s s', lead: 'Eb5 - - - Gb5 - Bb5 - Ab5 - Gb5 - F5 - Db5 - Eb5 - - - - - - - . . . . . . . . Gb5 - - - F5 - Eb5 - Db5 - Eb5 - F5 - Bb4 - Eb5 - - - - - - - . . . . . . . .' },
  outlet:  { bpm: 60, chords: ['Cmaj7', 'Am7', 'Fmaj7', 'G'], arp: '0 2 3 4 3 2', arpWave: 'triangle', arpVol: 0.1, arpLen: 2.5, pad: true, padWave: 'sine' },
  ending:  { bpm: 76, chords: ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'F'], arp: '0 2 4 2 1 2 4 2', arpWave: 'triangle', arpVol: 0.1, pad: true, bass: '0 . . . 5 . . . o . . . 5 . . .', lead: 'E5 - - - D5 - C5 - D5 - - - G4 - - - C5 - - - D5 - E5 - F5 - - - E5 - D5 - E5 - - - D5 - C5 - D5 - - - G5 - - - A5 - - - G5 - E5 - C5 - - - - - - -' },
  void:    { bpm: 50, chords: ['Cdim', 'Ebdim'], arp: '0 . . 3 . . 1 . . . 2 . . . . .', arpWave: 'sine', arpVol: 0.12, arpLen: 6, pad: true, padWave: 'sine', padVol: 0.04 },
};

// Room tone per sector theme. vol is relative to the SFX volume.
const AMBIENT = {
  lobby: { vol: 0.05, noise: { freq: 320 }, tones: [[60, 0.15]] },
  labs: { vol: 0.04, noise: { freq: 2400, type: 'bandpass', q: 0.4 }, tones: [[120, 0.08, 'sawtooth']] },
  servers: { vol: 0.09, noise: { freq: 900 }, tones: [[110, 0.05], [220, 0.02]] },
  archive: { vol: 0.035, noise: { freq: 220 }, every: 1000, tick: (a) => a.tone(2400, 0.015, { type: 'square', vol: 0.03, out: a.amb && a.amb.gain }) },
  tunnels: { vol: 0.05, noise: { freq: 3000, type: 'bandpass', q: 0.6 }, every: 2300, tick: (a) => Math.random() < 0.6 && a.tone(1800 + Math.random() * 900, 0.06, { type: 'sine', vol: 0.12, slide: -900, out: a.amb && a.amb.gain }) },
  core: { vol: 0.07, tones: [[55, 0.35], [82.4, 0.2], [110.5, 0.08, 'triangle']] },
  void: { vol: 0.03, tones: [[1180, 0.05], [1187, 0.05]] },
};

export const audio = new AudioEngine();
