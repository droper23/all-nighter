// Entry point: Phaser config and scene list.
import { Boot } from './scenes/Boot.js';
import { Title } from './scenes/Title.js';
import { World } from './scenes/World.js';
import { Battle } from './scenes/Battle.js';
import { Menu } from './scenes/Menu.js';
import { Shop } from './scenes/Shop.js';
import { Bench } from './scenes/Bench.js';
import { Ending } from './scenes/Ending.js';
import { G, newGame } from './core/state.js';

G.version = '1.0.0';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 480, height: 270,
  pixelArt: true, roundPixels: true,
  backgroundColor: '#07060c',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [Boot, Title, World, Battle, Menu, Shop, Bench, Ending],
});
window.__game = game;
window.__G = G;

// Developer helpers (only with ?dev in the URL).
if (location.search.includes('dev')) {
  window.__dev = {
    start(diff = 'standard') { G.state = newGame(diff); G.slot = 3; G.state.flags.intro_done = true; G.state.flags.enter_studio = true; game.scene.getScenes(true).forEach(sc => sc.scene.stop()); game.scene.start('World'); },
    warp(room, at) { G.state.room = room; G.state.x = null; G.state.y = null; const w = game.scene.getScene('World'); w.scene.restart({ at }); },
  };
}
