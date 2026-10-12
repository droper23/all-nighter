// Game state: creation, derived stats from the Build, inventory, progression, saves.
import { PARTS, PERK_IDS, perkCount, FORMS } from '../data/parts.js';

export const DIFFICULTY = {
  pass:     { name: 'Pass/Fail', desc: 'Story first. Glitches hit softer and fold faster.', enemyDmg: 0.55, enemyHp: 0.75, xp: 1.3, heat: 0.8, spd: 0.95 },
  standard: { name: 'Standard', desc: 'The intended challenge. Builds matter.', enemyDmg: 1, enemyHp: 1, xp: 1, heat: 1, spd: 1 },
  honors:   { name: 'Honors', desc: 'Tougher Glitches. Plan around intents.', enemyDmg: 1.2, enemyHp: 1.15, xp: 1, heat: 1.1, spd: 1.03 },
  deans:    { name: "Dean's List", desc: 'Brutal. Every turn counts. For build nerds.', enemyDmg: 1.4, enemyHp: 1.35, xp: 0.9, heat: 1.15, spd: 1.08 },
};

export const xpToNext = (L) => Math.floor(10 * Math.pow(L, 1.7));
let uidCounter = 1;

export function makePart(id, { plus = 0, perks = null } = {}) {
  const base = PARTS[id];
  if (!base) throw new Error('Unknown part ' + id);
  if (!perks) {
    const pool = PERK_IDS.slice(); perks = [];
    for (let i = 0; i < perkCount(base.tier); i++) perks.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return { uid: `p${Date.now().toString(36)}${(uidCounter++).toString(36)}`, id, plus, perks };
}

export function newGame(difficulty = 'standard') {
  const s = {
    version: 1, difficulty, playtime: 0, created: Date.now(),
    room: 'dorm_desk', x: null, y: null, facing: 'down',
    level: 1, xp: 0, hp: 50, flex: 20,
    parts: [], apps: ['patch', 'probe'], items: { ramen: 3, volt: 1 }, mats: { scrap: 0, silicon: 0 },
    build: { cpu: null, gpu: null, ram: [null, null], ramApps: ['patch', 'probe'], psu: null, cool: null, usb: [null, null] },
    tools: [], keys: ['student'], flags: {}, opened: {}, notes: [], cleared: {}, bosses: {}, visited: {}, outlets: [],
    quests: {}, hour: 2, lastOutlet: null, stats: { battles: 0, wins: 0, steps: 0 },
  };
  const give = (id, slot, idx) => { const p = makePart(id); s.parts.push(p); if (idx == null) s.build[slot] = p.uid; else s.build[slot][idx] = p.uid; };
  give('cpu_celery', 'cpu'); give('gpu_igpu', 'gpu'); give('ram_2gb', 'ram', 0); give('ram_2gb', 'ram', 1);
  give('psu_brick', 'psu'); give('cool_stock', 'cool'); give('usb_fan', 'usb', 0);
  s.hp = computeStats(s).maxHp;
  return s;
}

export const partOf = (s, uid) => s.parts.find(p => p.uid === uid);
export const baseOf = (inst) => PARTS[inst.id];

export function partStats(inst) {
  const base = PARTS[inst.id], out = {};
  for (const [k, v] of Object.entries(base.stats)) {
    out[k] = v > 0 ? Math.max(Math.round(v * (1 + 0.12 * inst.plus)), v + inst.plus) : v;
  }
  return out;
}

export function equippedUids(s) {
  const b = s.build;
  return [b.cpu, b.gpu, ...b.ram.slice(0, ramSlots(s)), b.psu, b.cool, ...b.usb].filter(Boolean);
}
export const ramSlots = (s) => 2 + (s.flags.ram3 ? 1 : 0) + (s.flags.ram4 ? 1 : 0);

export function computeStats(s) {
  const L = s.level;
  const st = { maxHp: 60 + 12 * (L - 1), atk: 4 + Math.floor(1.5 * L), def: 1 + Math.floor(L * 0.8), spd: 80, maxPwr: 0, regen: 0, cool: 0, crit: 5, heatCap: 100 };
  const perks = {}, brands = {}, passives = new Set(), drones = [];
  let hpPct = 0;
  for (const uid of equippedUids(s)) {
    const inst = partOf(s, uid); if (!inst) continue;
    const base = PARTS[inst.id], ps = partStats(inst);
    st.atk += ps.atk || 0; st.spd += ps.spd || 0; st.def += ps.def || 0; st.maxHp += ps.hp || 0;
    st.maxPwr += ps.pwr || 0; st.regen += ps.regen || 0; st.cool += ps.cool || 0; st.crit += ps.crit || 0; st.heatCap += ps.heatcap || 0;
    for (const pk of inst.perks) perks[pk] = (perks[pk] || 0) + 1;
    if (base.brand) brands[base.brand] = (brands[base.brand] || 0) + 1;
    if (base.passive) passives.add(base.passive);
    if (base.drone) drones.push(base.drone);
  }
  // perks
  st.crit += 4 * (perks.keen || 0); st.spd += 4 * (perks.swift || 0); st.regen += perks.efficient || 0;
  hpPct += 0.08 * (perks.sturdy || 0);
  // brand sets
  if ((brands.kilobyte || 0) >= 2) st.spd += 8;
  if ((brands.kilobyte || 0) >= 3) st.crit += 8;
  if ((brands.monolith || 0) >= 2) st.def += 5;
  if ((brands.halcyon || 0) >= 2) st.regen += 1;
  if ((brands.vortex || 0) >= 3) st.heatCap += 25;
  st.maxHp = Math.round(st.maxHp * (1 + hpPct));
  const gpu = partOf(s, s.build.gpu);
  st.form = gpu ? PARTS[gpu.id].form : 'raster';
  st.formDef = FORMS[st.form];
  st.apps = s.build.ramApps.slice(0, ramSlots(s)).map((a, i) => (s.build.ram[i] ? a : null)).filter(Boolean);
  Object.assign(st, { perks, brands, passives, drones });
  return st;
}

export function gainXp(s, amount) {
  const ups = [];
  s.xp += amount;
  while (s.xp >= xpToNext(s.level) && s.level < 40) {
    s.xp -= xpToNext(s.level); s.level++;
    ups.push(s.level);
  }
  if (ups.length) s.hp = computeStats(s).maxHp;
  return ups;
}

export function addItem(s, id, n = 1) { s.items[id] = (s.items[id] || 0) + n; }
export function useItem(s, id) { if (!s.items[id]) return false; s.items[id]--; if (!s.items[id]) delete s.items[id]; return true; }

// --- persistence ---
const KEY = (slot) => `an_save_${slot}`;
export function saveGame(s, slot) {
  s.slot = slot; s.savedAt = Date.now();
  try { localStorage.setItem(KEY(slot), JSON.stringify(s)); return true; } catch (e) { return false; }
}
export function loadGame(slot) {
  try { const raw = localStorage.getItem(KEY(slot)); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}
export function deleteGame(slot) { try { localStorage.removeItem(KEY(slot)); } catch (e) { /* ignore */ } }
export function listSaves() { return [1, 2, 3].map(slot => ({ slot, data: loadGame(slot) })); }
export function fmtTime(sec) {
  const h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

// Global session holder (current game state shared across scenes).
export const G = { state: null, slot: 1 };
