// Night Shift: optional three-wave gauntlets from Okafor's clipboard, one per cleared sector.
// Each run gets a twist. Twists rotate with the number of shifts worked, never with real time.
export const SHIFTS = [
  { id: 'lobby', name: 'Lobby Sweep', need: 'vendor', sector: 'lobby', waves: [['fizzbit', 'lampy'], ['jam', 'dustbun'], ['lampy', 'jam', 'fizzbit']], flex: 90, scrap: 5, silicon: 1 },
  { id: 'labs', name: 'Lab Lockdown', need: 'autograder', sector: 'labs', waves: [['solderimp', 'crawler'], ['printhead', 'oscillo'], ['crawler', 'crawler', 'solderimp']], flex: 180, scrap: 7, silicon: 1 },
  { id: 'servers', name: 'Cold Aisle Patrol', need: 'raid', sector: 'servers', waves: [['packetrat', 'fanwraith'], ['cacheghoul', 'sentinel'], ['packetrat', 'packetrat', 'fanwraith']], flex: 280, scrap: 9, silicon: 2 },
  { id: 'archive', name: 'Overdue Notices', need: 'thesis', sector: 'archive', waves: [['bookworm', 'margin'], ['overdue', 'inkblot'], ['margin', 'margin', 'bookworm']], flex: 400, scrap: 11, silicon: 2 },
  { id: 'tunnels', name: 'Pressure Check', need: 'hydra', sector: 'tunnels', waves: [['steamhound', 'cablerat'], ['pipemimic', 'pingbat'], ['steamhound', 'pingbat']], flex: 560, scrap: 13, silicon: 3 },
  { id: 'core', name: 'Graveyard Shift', need: 'minima', sector: 'core', waves: [['punchgolem', 'tapereel'], ['tubewisp', 'nullptr'], ['punchgolem', 'nullptr']], flex: 800, scrap: 16, silicon: 3 },
];

export const TWISTS = [
  { id: 'brownout', name: 'Brownout', desc: 'The PSU is on backup power: no Power regen.', mods: { regen: 0 }, bonus: 1.25 },
  { id: 'heatwave', name: 'Heatwave', desc: 'The boiler is stuck on: your Heat builds 50% faster.', mods: { heat: 1.5 }, bonus: 1.25 },
  { id: 'overtime', name: 'Overtime', desc: 'Glitches have 40% more HP. Pays time and a half.', mods: { enemyHp: 1.4 }, bonus: 1.5 },
  { id: 'coldsnap', name: 'Cold Snap', desc: 'Your cooler sheds twice the Heat, but Glitches hit 25% harder.', mods: { cool: 2, enemyDmg: 1.25 }, bonus: 1.25 },
];

export const twistFor = (s, i) => TWISTS[((s.shiftRuns || 0) + i) % TWISTS.length];
export const openShifts = (s) => SHIFTS.filter(x => s.bosses[x.need]);
