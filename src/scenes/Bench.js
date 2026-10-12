// Priya's Bench: upgrade (+1..+5), salvage, re-flash perks.
import { Input } from '../core/input.js';
import { audio } from '../core/audio.js';
import { G, partOf, partStats, equippedUids, computeStats } from '../core/state.js';
import { text, panel, C, W, H, ListMenu, wrapText, toInt } from '../core/ui.js';
import { PARTS, TIERS, PERKS, PERK_IDS, perkCount } from '../data/parts.js';

export const upgradeCost = (inst) => { const t = PARTS[inst.id].tier; return { scrap: 3 * (inst.plus + 1) * (t + 1), silicon: Math.max(0, inst.plus - 1) + (t >= 3 ? 1 : 0) }; };
export const salvageYield = (inst) => { const t = PARTS[inst.id].tier; return { scrap: 2 + t * 2 + inst.plus * 2, silicon: t >= 2 ? t - 1 : 0 }; };
const REFLASH = { scrap: 4, silicon: 1 };

export class Bench extends Phaser.Scene {
  constructor() { super('Bench'); }
  create() {
    this.keys = new Input(this); this.objs = []; this.list = null;
    this.add.rectangle(0, 0, W, H, 0x07060c, 0.9).setOrigin(0);
    this.openRoot();
  }
  clear() { this.objs.forEach(o => o.destroy()); this.objs = []; if (this.list) this.list.destroy(); this.list = null; }
  o(x) { this.objs.push(x); return x; }
  header(title) {
    const s = G.state;
    this.o(panel(this, 8, 8, 464, 40));
    this.o(this.add.image(30, 28, 'pt_priya').setScale(0.75));
    this.o(text(this, 56, 14, title, 0xd4a0ff));
    this.o(text(this, 56, 28, `Scrap: ${s.mats.scrap}   Silicon: ${s.mats.silicon}`, C.gold));
  }
  openRoot() {
    this.clear(); this.header("The Bench: \"Don't touch the hot end. I mean it.\"");
    this.o(panel(this, 8, 54, 200, 86));
    this.list = new ListMenu(this, 16, 62, 184, [{ label: 'Upgrade a part' }, { label: 'Salvage a part' }, { label: 'Re-flash firmware' }, { label: 'Done' }], {
      rows: 4, lineH: 15,
      onSelect: (it, i) => [() => this.pick('up'), () => this.pick('salv'), () => this.pick('flash'), () => this.leave()][i](),
      onBack: () => this.leave(),
    });
    this.o(panel(this, 214, 54, 258, 86));
    this.o(text(this, 222, 62, wrapText('Upgrade: +12% to every stat per level, up to +5.\nSalvage: break a spare part into Scrap/Silicon.\nRe-flash: reroll the perks on a Pro or better part.', 244).join('\n'), C.dim));
  }
  leave() { audio.sfx('back'); this.scene.resume('World'); this.scene.stop(); }
  pick(mode, cursor = 0) {
    this.clear();
    this.header({ up: 'Upgrade', salv: 'Salvage', flash: 'Re-flash firmware' }[mode]);
    const s = G.state, eq = new Set(equippedUids(s));
    this.o(panel(this, 8, 54, 250, 208)); this.o(panel(this, 264, 54, 208, 208));
    const desc = this.o(text(this, 272, 62, '', C.text));
    let parts = s.parts.slice();
    if (mode === 'salv') parts = parts.filter(p => !eq.has(p.uid));
    if (mode === 'flash') parts = parts.filter(p => perkCount(PARTS[p.id].tier) > 0);
    if (mode === 'up') parts = parts.filter(p => p.plus < 5);
    parts.sort((a, b) => (eq.has(b.uid) ? 1 : 0) - (eq.has(a.uid) ? 1 : 0) || PARTS[b.id].tier - PARTS[a.id].tier);
    const rows = parts.map(p => {
      const b = PARTS[p.id];
      const cost = mode === 'up' ? upgradeCost(p) : mode === 'flash' ? REFLASH : salvageYield(p);
      const afford = mode === 'salv' || (s.mats.scrap >= cost.scrap && s.mats.silicon >= cost.silicon);
      return { label: (eq.has(p.uid) ? '• ' : '') + b.name + (p.plus ? ' +' + p.plus : ''), color: toInt(TIERS[b.tier].color), uid: p.uid, cost, disabled: !afford };
    });
    if (!rows.length) rows.push({ label: '(nothing eligible)', disabled: true });
    const show = (it) => {
      if (!it.uid) return desc.setText('');
      const inst = partOf(s, it.uid), b = PARTS[inst.id], ps = partStats(inst);
      let str = `${b.slot.toUpperCase()} · ${TIERS[b.tier].name}\n${Object.entries(ps).map(([k, v]) => k.toUpperCase() + ' ' + v).join('  ')}`;
      if (inst.perks.length) str += '\nPerks: ' + inst.perks.map(p => PERKS[p].name + ' (' + PERKS[p].desc + ')').join('; ');
      if (mode === 'up') { const nx = partStats({ ...inst, plus: inst.plus + 1 }); str += `\n\nAt +${inst.plus + 1}: ${Object.entries(nx).map(([k, v]) => k.toUpperCase() + ' ' + v).join('  ')}\nCost: ${it.cost.scrap} Scrap${it.cost.silicon ? ', ' + it.cost.silicon + ' Silicon' : ''}`; }
      if (mode === 'salv') str += `\n\nYields: ${it.cost.scrap} Scrap${it.cost.silicon ? ', ' + it.cost.silicon + ' Silicon' : ''}`;
      if (mode === 'flash') str += `\n\nCost: ${REFLASH.scrap} Scrap, ${REFLASH.silicon} Silicon`;
      desc.setText(wrapText(str, 192).slice(0, 18).join('\n'));
    };
    this.list = new ListMenu(this, 16, 62, 236, rows, {
      rows: 16, lineH: 12, cursor,
      onMove: show,
      onSelect: (it, i) => {
        const inst = partOf(s, it.uid);
        if (mode === 'up') { s.mats.scrap -= it.cost.scrap; s.mats.silicon -= it.cost.silicon; inst.plus++; audio.sfx('levelup'); }
        if (mode === 'salv') { s.mats.scrap += it.cost.scrap; s.mats.silicon += it.cost.silicon; s.parts = s.parts.filter(p => p.uid !== it.uid); audio.sfx('enemyDie'); }
        if (mode === 'flash') {
          s.mats.scrap -= REFLASH.scrap; s.mats.silicon -= REFLASH.silicon;
          const pool = PERK_IDS.slice(); inst.perks = [];
          for (let k = 0; k < perkCount(PARTS[inst.id].tier); k++) inst.perks.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
          audio.sfx('glitch');
        }
        s.hp = Math.min(s.hp, computeStats(s).maxHp);
        this.pick(mode, Math.min(i, rows.length - 1));
      },
      onBack: () => this.openRoot(),
    });
    show(rows[this.list.cursor]);
  }
  update(t, d) { if (this.list) this.list.update(this.keys, d); }
}
