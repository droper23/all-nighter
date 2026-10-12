// Mrs. Okafor's supply cart: buy consumables/parts/apps, sell spare parts.
import { Input } from '../core/input.js';
import { audio } from '../core/audio.js';
import { G, partOf, makePart, addItem, equippedUids } from '../core/state.js';
import { text, panel, C, W, H, ListMenu, wrapText, toInt } from '../core/ui.js';
import { PARTS, TIERS } from '../data/parts.js';
import { APPS, ITEMS } from '../data/apps.js';

// Stock unlocks by hour (state.hour).
const STOCK = [
  { hour: 2, item: 'ramen' }, { hour: 2, item: 'volt' }, { hour: 2, item: 'paste' }, { hour: 2, item: 'gummy' },
  { hour: 2, part: 'cool_tower', price: 90 }, { hour: 2, part: 'usb_mouse', price: 80 }, { hour: 2, app: 'firewall', price: 120 },
  { hour: 3, item: 'burrito' }, { hour: 3, item: 'tape' }, { hour: 3, app: 'cryo', price: 160 }, { hour: 3, part: 'psu_bronze', price: 140 }, { hour: 3, app: 'throttle', price: 180 },
  { hour: 4, item: 'coldbrew' }, { hour: 4, item: 'duster' }, { hour: 4, app: 'hotfix', price: 320 }, { hour: 4, part: 'ram_halc', price: 380 }, { hour: 4, part: 'usb_duck', price: 200 },
  { hour: 5, item: 'pizza' }, { hour: 5, app: 'exploit', price: 520 }, { hour: 5, part: 'cool_aio', price: 640 }, { hour: 5, app: 'gc', price: 480 },
  { hour: 6, app: 'broadcast', price: 800 }, { hour: 6, part: 'psu_ti', price: 1300 }, { hour: 6, app: 'backup', price: 900 },
  { hour: 7, part: 'gpu_raster3', price: 2600 }, { hour: 7, app: 'panic', price: 1800 },
];
export const sellPrice = (inst) => Math.round(8 * Math.pow(PARTS[inst.id].tier + 1, 2) * (1 + inst.plus * 0.5));

export class Shop extends Phaser.Scene {
  constructor() { super('Shop'); }
  create() {
    this.keys = new Input(this);
    this.add.rectangle(0, 0, W, H, 0x07060c, 0.9).setOrigin(0);
    this.objs = [];
    this.openRoot();
  }
  clear() { this.objs.forEach(o => o.destroy()); this.objs = []; if (this.list) this.list.destroy(); this.list = null; }
  o(x) { this.objs.push(x); return x; }
  header(title) {
    this.o(panel(this, 8, 8, 464, 40));
    this.o(this.add.image(30, 28, 'pt_okafor').setScale(0.75));
    this.o(text(this, 56, 14, title, C.warn));
    this.o(text(this, 56, 28, `Flex: $${G.state.flex}   Scrap: ${G.state.mats.scrap}   Silicon: ${G.state.mats.silicon}`, C.gold));
  }
  openRoot() {
    this.clear(); this.header("Okafor's Cart: \"Everything's half price. For you.\"");
    this.o(panel(this, 8, 54, 200, 70));
    this.list = new ListMenu(this, 16, 62, 184, [{ label: 'Buy' }, { label: 'Sell parts' }, { label: 'Leave' }], {
      rows: 3, lineH: 15,
      onSelect: (it, i) => [() => this.openBuy(), () => this.openSell(), () => this.leave()][i](),
      onBack: () => this.leave(),
    });
  }
  leave() { audio.sfx('back'); this.scene.resume('World'); this.scene.stop(); }
  openBuy(cursor = 0) {
    this.clear(); this.header('Buy');
    const s = G.state;
    this.o(panel(this, 8, 54, 270, 208)); this.o(panel(this, 284, 54, 188, 208));
    const desc = this.o(text(this, 292, 62, '', C.text));
    const rows = STOCK.filter(x => x.hour <= s.hour && !(x.app && s.apps.includes(x.app)) && !(x.part && s.flags['bought_' + x.part])).map(x => {
      if (x.item) return { label: ITEMS[x.item].name, right: '$' + ITEMS[x.item].price, price: ITEMS[x.item].price, x, desc: ITEMS[x.item].desc + `\n\nOwned: ${s.items[x.item] || 0}` };
      if (x.app) return { label: 'App: ' + APPS[x.app].name, right: '$' + x.price, price: x.price, x, color: C.accent, desc: APPS[x.app].desc + `\n\nCost ${APPS[x.app].pwr} Power.` };
      const b = PARTS[x.part];
      return { label: b.name, right: '$' + x.price, price: x.price, x, color: toInt(TIERS[b.tier].color), desc: `${b.slot.toUpperCase()} · ${TIERS[b.tier].name}\n${Object.entries(b.stats).map(([k, v]) => k.toUpperCase() + ' +' + v).join('  ')}\n\n${b.desc}` };
    });
    rows.forEach(r => { r.disabled = s.flex < r.price; });
    this.list = new ListMenu(this, 16, 62, 254, rows, {
      rows: 16, lineH: 12, cursor,
      onMove: (it) => desc.setText(wrapText(it.desc, 172).join('\n')),
      onSelect: (it, i) => {
        s.flex -= it.price;
        if (it.x.item) addItem(s, it.x.item);
        if (it.x.app) s.apps.push(it.x.app);
        if (it.x.part) { s.parts.push(makePart(it.x.part)); s.flags['bought_' + it.x.part] = true; }
        audio.sfx('pickup'); this.openBuy(i);
      },
      onBack: () => this.openRoot(),
    });
    if (rows[0]) this.list.onMove(rows[this.list.cursor]);
  }
  openSell(cursor = 0) {
    this.clear(); this.header('Sell spare parts');
    const s = G.state, eq = new Set(equippedUids(s));
    this.o(panel(this, 8, 54, 270, 208)); this.o(panel(this, 284, 54, 188, 208));
    const desc = this.o(text(this, 292, 62, '', C.text));
    const rows = s.parts.filter(p => !eq.has(p.uid)).map(p => ({ label: PARTS[p.id].name + (p.plus ? ' +' + p.plus : ''), right: '$' + sellPrice(p), uid: p.uid, color: toInt(TIERS[PARTS[p.id].tier].color), desc: PARTS[p.id].desc }));
    if (!rows.length) rows.push({ label: '(nothing spare)', disabled: true, desc: 'Equipped parts cannot be sold.' });
    this.list = new ListMenu(this, 16, 62, 254, rows, {
      rows: 16, lineH: 12, cursor,
      onMove: (it) => desc.setText(wrapText(it.desc || '', 172).join('\n')),
      onSelect: (it, i) => {
        const inst = partOf(s, it.uid);
        s.flex += sellPrice(inst); s.parts = s.parts.filter(p => p.uid !== it.uid);
        audio.sfx('pickup'); this.openSell(Math.max(0, i - 1));
      },
      onBack: () => this.openRoot(),
    });
    this.list.onMove(rows[this.list.cursor]);
  }
  update(t, d) { if (this.list) this.list.update(this.keys, d); }
}
