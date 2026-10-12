// Progression reachability: BFS over every room tile with the tools/keys available at each stage.
import test from 'node:test';
import assert from 'node:assert';
import { ROOMS } from '../src/data/rooms/index.js';
import { isSolid } from '../src/art/tiles.js';

const MARK = /[0-9ACDEGHIJKNQRUZ@]/;
const BLOCKING = new Set(['npc', 'sleeper', 'box', 'outlet', 'boss', 'shop', 'bench', 'valve', 'terminal']);

function walkable(ch, kit) {
  if (ch === '^') return kit.tools.has('iron');
  if (ch === '?') return kit.tools.has('multimeter');
  if (ch === '&') return kit.tools.has('wrench');
  if (ch === 'X') return kit.flags.has('lockouts_done');
  return !isSolid(ch) && !'#W_neY'.includes(ch);
}

function explore(kit) {
  const seen = new Set(), reached = new Set(), q = [];
  const push = (room, x, y) => { const k = `${room}:${x}:${y}`; if (!seen.has(k)) { seen.add(k); q.push([room, x, y]); } };
  const spawn = (room, m) => {
    const r = ROOMS[room], h = r.grid.length, w = r.grid[0].length;
    for (let y = 0; y < h; y++) { const x = r.grid[y].indexOf(m); if (x >= 0) { let tx = x, ty = y; if (tx === 0) tx++; else if (tx === w - 1) tx--; else if (ty === 0) ty++; else if (ty === h - 1) ty--; push(room, tx, ty); return; } }
  };
  spawn('studio', '@');
  if (kit.flags.has('postgame')) spawn('r404_entry', '@');
  while (q.length) {
    const [room, x, y] = q.shift();
    const r = ROOMS[room];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [0, 0]]) {
      const nx = x + dx, ny = y + dy;
      if (ny < 0 || ny >= r.grid.length || nx < 0 || nx >= r.grid[0].length) continue;
      const ch = r.grid[ny][nx];
      if (MARK.test(ch)) {
        const e = (r.ents || {})[ch];
        if (e) reached.add(`${room}:${ch}`);
        if (!e) { push(room, nx, ny); continue; }
        if (e.type === 'door') {
          if (e.key && !kit.keys.has(e.key)) continue;
          if (e.if && !kit.flags.has(e.if)) continue;
          if (e.to) { spawn(e.to, e.at); continue; }
          push(room, nx, ny); continue;
        }
        if (e.type === 'crate' && !kit.tools.has('truck')) continue;
        if (BLOCKING.has(e.type)) continue;
        const under = e.tile || r.under || '.';
        if (walkable(under, kit)) push(room, nx, ny);
        continue;
      }
      if (walkable(ch, kit)) push(room, nx, ny);
    }
  }
  return reached;
}

const STAGES = [
  { tools: [], keys: ['student'], flags: [], need: ['alcove:1'], not: ['labs_hall:1', 'closet:1'] },
  { tools: ['multimeter'], keys: ['student', 'ta'], flags: [], need: ['grading:1', 'closet:1', 'ta_office:1'], not: ['srv_hall:1'] },
  { tools: ['multimeter', 'iron'], keys: ['student', 'ta'], flags: [], need: ['raid_vault:1'], not: ['arc_stairs:1'] },
  { tools: ['multimeter', 'iron', 'truck'], keys: ['student', 'ta', 'staff'], flags: [], need: ['thesis_room:1', 'security:2'], not: ['tun_entry:1'] },
  { tools: ['multimeter', 'iron', 'truck', 'wrench'], keys: ['student', 'ta', 'staff'], flags: [], need: ['router_core:1', 'facilities:1', 'tun_dark:3'], not: ['b_stairs:1', 'prof_office:1'] },
  { tools: ['multimeter', 'iron', 'truck', 'wrench'], keys: ['student', 'ta', 'staff', 'faculty'], flags: ['lockouts_done'], need: ['hollis_core:1', 'ventner_office:2', 'prof_office:1'] },
  { tools: ['multimeter', 'iron', 'truck', 'wrench'], keys: ['student', 'ta', 'staff', 'faculty'], flags: ['lockouts_done', 'postgame'], need: ['r404_core:1'] },
];

test('progression is reachable at every stage', () => {
  for (const st of STAGES) {
    const reached = explore({ tools: new Set(st.tools), keys: new Set(st.keys), flags: new Set(st.flags) });
    for (const n of st.need) assert.ok(reached.has(n), `stage with tools [${st.tools}] cannot reach ${n}`);
    for (const n of st.not || []) assert.ok(!reached.has(n), `stage with tools [${st.tools}] should NOT reach ${n} yet`);
  }
});

test('every box, note and boss is reachable with the full kit', () => {
  const last = STAGES[STAGES.length - 1];
  const reached = explore({ tools: new Set(last.tools), keys: new Set(last.keys), flags: new Set(last.flags) });
  const missing = [];
  for (const [id, r] of Object.entries(ROOMS)) for (const [m, e] of Object.entries(r.ents || {})) {
    if (['box', 'note', 'boss', 'tool', 'shop', 'bench', 'outlet', 'terminal'].includes(e.type) && !reached.has(`${id}:${m}`)) missing.push(`${id}:${m} (${e.type})`);
  }
  if (missing.length) console.log('unreachable:', missing.join(', '));
  assert.equal(missing.length, 0);
});
