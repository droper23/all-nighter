// Save compatibility, deterministic rotations, and quest bookkeeping that depends on room data.
import test from 'node:test';
import assert from 'node:assert';
import { migrate, computeStats, SAVE_VERSION, newGame } from '../src/core/state.js';
import { ROOMS } from '../src/data/rooms/index.js';
import { BOATS, SLEEPERS_TOTAL } from '../src/data/scripts.js';
import { specials } from '../src/data/specials.js';
import { SHIFTS, TWISTS, twistFor } from '../src/data/shifts.js';
import { ENEMIES } from '../src/data/enemies.js';
import { PARTS } from '../src/data/parts.js';

// The shape v1.0.1 wrote to localStorage (an_save_N).
const V1 = {
  version: 1, difficulty: 'standard', playtime: 1234, created: 1700000000000, room: 'labs_hall', x: 120, y: 60, facing: 'down',
  level: 6, xp: 12, hp: 80, flex: 300,
  parts: [{ uid: 'pa', id: 'cpu_k2', plus: 1, perks: [] }, { uid: 'pb', id: 'gpu_hose', plus: 0, perks: [] }, { uid: 'pc', id: 'ram_2gb', plus: 0, perks: [] }, { uid: 'pd', id: 'psu_brick', plus: 0, perks: [] }, { uid: 'pe', id: 'cool_stock', plus: 0, perks: [] }],
  apps: ['patch', 'probe', 'throttle'], items: { ramen: 2 }, mats: { scrap: 3, silicon: 1 },
  build: { cpu: 'pa', gpu: 'pb', ram: ['pc', null], ramApps: ['patch', 'probe'], psu: 'pd', cool: 'pe', usb: [null, null] },
  tools: ['multimeter'], keys: ['student', 'ta'], flags: { intro_done: true }, opened: {}, notes: ['s1_flyer'], cleared: {}, bosses: { vendor: true }, visited: {}, outlets: [],
  quests: {}, hour: 3, lastOutlet: null, stats: { battles: 9, wins: 9, steps: 100 },
};

test('v1 saves migrate and still compute stats', () => {
  const s = migrate(JSON.parse(JSON.stringify(V1)));
  assert.equal(s.version, SAVE_VERSION);
  assert.deepEqual(s.shifts, {}); assert.deepEqual(s.probed, {}); assert.equal(s.shiftRuns, 0);
  assert.equal(s.room, 'labs_hall'); assert.equal(s.level, 6);
  const st = computeStats(s);
  assert.ok(st.maxHp > 0 && st.atk > 0); assert.equal(st.form, 'stream');
  assert.ok(ROOMS[migrate({ ...V1, room: 'dorm_desk' }).room], 'legacy start room is remapped');
});

test('new games start in a real room at the current save version', () => {
  const s = newGame();
  assert.ok(ROOMS[s.room]); assert.equal(s.version, SAVE_VERSION);
});

test('Night Specials rotate with progress, not time, and are buyable parts', () => {
  const s = newGame(); s.hour = 4;
  const a = specials(s).list.map(x => x.part), b = specials(s).list.map(x => x.part);
  assert.deepEqual(a, b, 'same state, same stock');
  s.stats.wins += 6;
  assert.notDeepEqual(specials(s).list.map(x => x.key), specials({ ...s, stats: { ...s.stats, wins: 0 } }).list.map(x => x.key));
  for (const x of specials(s).list) { assert.ok(PARTS[x.part]); assert.ok(x.perks.length >= 1 && x.price > 0); }
});

test('Night Shift data is valid and twists rotate', () => {
  for (const sh of SHIFTS) sh.waves.forEach(w => w.forEach(k => assert.ok(ENEMIES[k], `${sh.id}: ${k}`)));
  const s = { shiftRuns: 0 }, seen = new Set();
  for (let i = 0; i < TWISTS.length; i++) { seen.add(twistFor(s, 0).id); s.shiftRuns++; }
  assert.equal(seen.size, TWISTS.length);
});

test('quest counts match the rooms', () => {
  const ents = Object.values(ROOMS).flatMap(r => Object.values(r.ents || {}));
  assert.deepEqual(ents.filter(e => e.type === 'boat').map(e => e.id).sort(), BOATS.slice().sort());
  assert.equal(ents.filter(e => e.type === 'sleeper').length, SLEEPERS_TOTAL);
});
