// Prints boss win rates for every difficulty: node tools/sim.mjs [pass,standard,...]
import { runBoss, smart, masher, BOSSES } from '../tests/sim.mjs';

const diffs = process.argv[2] ? process.argv[2].split(',') : ['pass', 'standard', 'honors', 'deans'];
for (const d of diffs) {
  console.log(`\n${d}`);
  for (const k of Object.keys(BOSSES)) {
    const a = runBoss(k, { diff: d, policy: smart }), m = runBoss(k, { diff: d, policy: masher });
    console.log(`  ${k.padEnd(10)} smart ${String(a.wins).padStart(2)}/${a.n}  ${a.turns.toFixed(0).padStart(3)} turns  ${String(Math.round(a.hpLeft * 100)).padStart(3)}% HP   masher ${String(m.wins).padStart(2)}/${m.n}`);
  }
}
