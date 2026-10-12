// Generates every texture (font, tiles, sprites, battlers, portraits), then goes to Title.
import { registerFont } from '../core/font.js';
import { buildTilesets } from '../art/tiles.js';
import { buildSprites } from '../art/sprites.js';
import { buildBattlers } from '../art/battlers.js';
import { buildPortraits } from '../art/portraits.js';
import { G } from '../core/state.js';

export class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    registerFont(this);
    buildTilesets(this);
    buildSprites(this);
    buildBattlers(this);
    buildPortraits(this);
    try { G.textSpeed = Number(localStorage.getItem('an_text')) || 1; } catch (e) { G.textSpeed = 1; }
    this.scene.start('Title');
  }
}
