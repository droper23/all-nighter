// Validates room grids, markers, doors, and referenced data.
import test from 'node:test';
import assert from 'node:assert';
import { ROOMS } from '../src/data/rooms/index.js';
import { NOTES } from '../src/data/notes.js';
import { ENEMIES } from '../src/data/enemies.js';
import { PARTS } from '../src/data/parts.js';
import { SCRIPTS } from '../src/data/scripts.js';
import { isSolid } from '../src/art/tiles.js';

test('rooms are well formed', () => {
  const problems = [];
  for (const [id, r] of Object.entries(ROOMS)) {
    const w = r.grid[0].length;
    r.grid.forEach((row, y) => { if (row.length !== w) problems.push(`${id} row ${y} len ${row.length} != ${w}`); });
    const markers = new Set();
    r.grid.forEach(row => [...row].forEach(ch => { if (/[0-9ACDEGHIJKNQRUZ@]/.test(ch)) { if (markers.has(ch)) problems.push(`${id} duplicate marker ${ch}`); markers.add(ch); } }));
    for (const [m, e] of Object.entries(r.ents || {})) {
      if (!markers.has(m)) problems.push(`${id} ent ${m} has no marker`);
      if (e.type === 'door' && e.to) {
        const t = ROOMS[e.to];
        if (!t) problems.push(`${id}:${m} -> missing room ${e.to}`);
        else if (!t.grid.some(row => row.includes(e.at))) problems.push(`${id}:${m} -> ${e.to} missing marker ${e.at}`);
      }
      if (e.type === 'note' && !NOTES[e.id]) problems.push(`${id}: missing note ${e.id}`);
      if (e.type === 'enemy') e.group.forEach(g => { if (!ENEMIES[g]) problems.push(`${id}: missing enemy ${g}`); });
      if (e.type === 'box' && e.loot.part && !PARTS[e.loot.part]) problems.push(`${id}: missing part ${e.loot.part}`);
      if (e.script && !SCRIPTS[e.script]) problems.push(`${id}:${m} missing script ${e.script}`);
    }
    // door spawn tiles must be walkable
    const h = r.grid.length, w2 = r.grid[0].length;
    r.grid.forEach((row, y) => [...row].forEach((ch, x) => {
      const e = (r.ents || {})[ch];
      if (!e || e.type !== 'door' || !e.to || e.gated) return;
      let tx = x, ty = y;
      if (tx === 0) tx++; else if (tx === w2 - 1) tx--; else if (ty === 0) ty++; else if (ty === h - 1) ty--;
      const t = r.grid[ty][tx];
      const under = /[0-9ACDEGHIJKNQRUZ@]/.test(t) ? ((r.ents[t] && r.ents[t].tile) || r.under || '.') : t;
      if (isSolid(under) || '#W_neY?'.includes(under)) problems.push(`${id}:${ch} spawn tile (${tx},${ty}) '${under}' is solid`);
    }));
    for (const m of markers) if (m !== '@' && !(r.ents || {})[m]) problems.push(`${id} marker ${m} without ent`);
    if (r.onEnter && !SCRIPTS[r.onEnter]) problems.push(`${id} missing onEnter ${r.onEnter}`);
  }
  if (problems.length) console.log(problems.join('\n'));
  assert.equal(problems.length, 0);
});
