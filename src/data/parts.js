// Hardware for the Build. stats: atk spd def hp pwr regen cool crit heatcap. tier 0..4.
export const TIERS = [
  { name: 'Salvaged', color: '#7a7890' }, { name: 'Stock', color: '#f2f0e6' }, { name: 'Pro', color: '#5cc070' },
  { name: 'Enthusiast', color: '#9a5ad8' }, { name: 'Prototype', color: '#f08a3c' },
];

export const SLOTS = {
  cpu: { name: 'CPU', desc: 'Speed and crit. Faster = more turns.' },
  gpu: { name: 'GPU', desc: 'Your attack: ATK and firing form.' },
  ram: { name: 'RAM', desc: 'Each stick runs one App.' },
  psu: { name: 'PSU', desc: 'Max Power and regen per turn.' },
  cool: { name: 'COOLER', desc: 'Heat shed at the start of each turn.' },
  usb: { name: 'USB', desc: 'Peripherals: passives and drones.' },
};

export const FORMS = {
  raster:   { name: 'Raster', desc: 'One clean shot. 100% ATK.', hits: 1, mult: 1.0, heat: 12, delay: 100, target: 'one' },
  scatter:  { name: 'Scatter', desc: '3 shots at random foes, 50% each.', hits: 3, mult: 0.5, heat: 16, delay: 100, target: 'random' },
  stream:   { name: 'Stream', desc: '5 rapid hits, 28% each. Runs hot.', hits: 5, mult: 0.28, heat: 24, delay: 85, target: 'one' },
  raytrace: { name: 'Raytrace', desc: '200% shot. Pierces Encryption. Slow.', hits: 1, mult: 2.0, heat: 30, delay: 140, target: 'one', pierce: true },
  batch:    { name: 'Batch', desc: 'Hits every foe for 65%.', hits: 1, mult: 0.65, heat: 20, delay: 115, target: 'all' },
};

export const BRANDS = {
  kilobyte: { name: 'Kilobyte', color: '#5ee0e8', two: '+8 SPD', three: '+8% crit, act first in battle', },
  vortex:   { name: 'Vortex', color: '#f08a3c', two: '+15% dmg while Heat > 50', three: '+25 heat cap; Vent zaps all foes' },
  monolith: { name: 'Monolith', color: '#b8b6c8', two: '+5 DEF', three: 'Guard reflects 40% of damage' },
  halcyon:  { name: 'Halcyon', color: '#f2c14e', two: '+1 Power regen', three: 'Apps cost 25% less Power' },
};

const P = (id, slot, name, tier, stats, extra = {}) => ({ id, slot, name, tier, stats, ...extra });

export const PARTS = Object.fromEntries([
  // CPU
  P('cpu_celery', 'cpu', 'Celery 2-Core', 0, { spd: 10 }, { desc: 'From a laptop that only ran a browser.' }),
  P('cpu_k2', 'cpu', 'Kilobyte K2 Duo', 1, { spd: 16, crit: 2 }, { brand: 'kilobyte', desc: 'Budget-friendly, overachiever energy.' }),
  P('cpu_m4', 'cpu', 'Monolith Bastion 4', 1, { spd: 12, def: 3 }, { brand: 'monolith', desc: 'Ships in a box rated for falls.' }),
  P('cpu_v6', 'cpu', 'Vortex Ember 6', 2, { spd: 20, crit: 4 }, { brand: 'vortex', desc: 'Idles at 71°C. Proudly.' }),
  P('cpu_h8', 'cpu', 'Halcyon Lumen 8', 2, { spd: 22, pwr: 6 }, { brand: 'halcyon', desc: 'Efficiency cores named after birds.' }),
  P('cpu_k8', 'cpu', 'Kilobyte K8 Turbo', 3, { spd: 30, crit: 6 }, { brand: 'kilobyte', desc: 'The turbo button finally does something.' }),
  P('cpu_m12', 'cpu', 'Monolith Citadel 12', 3, { spd: 24, def: 8, hp: 20 }, { brand: 'monolith', desc: 'Twelve cores. Zero opinions.' }),
  P('cpu_qbit', 'cpu', 'Q-Bit Engineering Sample', 4, { spd: 42, crit: 10 }, { desc: '"NOT FOR SALE" etched on the heatspreader. Both on and off.' }),
  // GPU
  P('gpu_igpu', 'gpu', 'Integrated Graphics', 0, { atk: 4 }, { form: 'raster', desc: 'It can technically draw things.' }),
  P('gpu_spray', 'gpu', 'Kilobyte Spray 1050', 1, { atk: 6, spd: 2 }, { form: 'scatter', brand: 'kilobyte', desc: 'Wide bus, wide aim.' }),
  P('gpu_hose', 'gpu', 'Vortex Firehose 2060', 1, { atk: 6 }, { form: 'stream', brand: 'vortex', desc: 'Two fans. Both screaming.' }),
  P('gpu_lancet', 'gpu', 'Monolith Lancet RT', 2, { atk: 11, def: 2 }, { form: 'raytrace', brand: 'monolith', desc: 'Traces one ray, very seriously.' }),
  P('gpu_array', 'gpu', 'Halcyon Array 3070', 2, { atk: 10, pwr: 3 }, { form: 'batch', brand: 'halcyon', desc: 'Renders everything at once, politely.' }),
  P('gpu_raster2', 'gpu', 'Reference Card RX', 2, { atk: 13 }, { form: 'raster', desc: 'Blower cooler. Reliable as a stapler.' }),
  P('gpu_spray2', 'gpu', 'Kilobyte Spray Ti', 3, { atk: 18, spd: 4 }, { form: 'scatter', brand: 'kilobyte', desc: 'More pellets per frame.' }),
  P('gpu_hose2', 'gpu', 'Vortex Inferno 4090', 3, { atk: 19, crit: 3 }, { form: 'stream', brand: 'vortex', desc: 'Comes with a fire extinguisher. Advisory.' }),
  P('gpu_lancet2', 'gpu', 'Monolith Obelisk RT', 3, { atk: 24, def: 4 }, { form: 'raytrace', brand: 'monolith', desc: 'Weighs more than your backpack.' }),
  P('gpu_array2', 'gpu', 'Halcyon Choir 5080', 3, { atk: 20, pwr: 6 }, { form: 'batch', brand: 'halcyon', desc: 'Sixteen thousand cores, harmonizing.' }),
  P('gpu_raster3', 'gpu', 'Founders Blackwell', 3, { atk: 26, crit: 4 }, { form: 'raster', desc: 'Matte black. Matte power.' }),
  P('gpu_vector', 'gpu', 'HOLLIS Vector Unit', 4, { atk: 36, crit: 5, spd: 6 }, { form: 'raytrace', desc: 'A 1970s vector display board. Draws straight lines through anything.' }),
  P('gpu_swarm', 'gpu', 'Swarm Accelerator X', 4, { atk: 32, spd: 8 }, { form: 'scatter', desc: 'Liberated from a crypto rig. It remembers.' }),
  // RAM
  P('ram_2gb', 'ram', '2GB DDR2 (Dusty)', 0, { hp: 5 }, { desc: 'Smells like a library carpet.' }),
  P('ram_4gb', 'ram', '4GB DDR3', 1, { hp: 6, pwr: 2 }, { desc: 'Pulled from a lab desktop. Labelled "DO NOT REMOVE".' }),
  P('ram_kb', 'ram', 'Kilobyte HyperSync 8GB', 1, { spd: 4 }, { brand: 'kilobyte', desc: 'Tight timings, loose morals.' }),
  P('ram_mono', 'ram', 'Monolith ECC 16GB', 2, { def: 3, hp: 12 }, { brand: 'monolith', desc: 'Error-correcting. Also judgment-correcting.' }),
  P('ram_halc', 'ram', 'Halcyon Glow 16GB', 2, { pwr: 5, regen: 1 }, { brand: 'halcyon', desc: 'RGB increases framerate. Everyone knows this.' }),
  P('ram_vort', 'ram', 'Vortex Blaze 32GB', 2, { atk: 3, cool: 2 }, { brand: 'vortex', desc: 'Heat-spreaders shaped like flames.' }),
  P('ram_core', 'ram', 'Magnetic Core Plane', 3, { hp: 25, def: 4, pwr: 4 }, { desc: 'Hand-woven ferrite rings, 1971. Someone counted every one.' }),
  P('ram_hbm', 'ram', 'HBM Prototype Stack', 4, { spd: 8, pwr: 8, atk: 4 }, { desc: 'Memory stacked like pancakes. Hot pancakes.' }),
  // PSU
  P('psu_brick', 'psu', 'Laptop Brick 45W', 0, { pwr: 12, regen: 2 }, { desc: 'Warm. Heavy. Comforting.' }),
  P('psu_bronze', 'psu', '80+ Bronze 450W', 1, { pwr: 16, regen: 3 }, { desc: 'Certified mediocre.' }),
  P('psu_gold', 'psu', 'Halcyon Gold 650W', 2, { pwr: 22, regen: 4 }, { brand: 'halcyon', desc: 'Fully modular, emotionally available.' }),
  P('psu_ti', 'psu', 'Monolith Titanium 850W', 3, { pwr: 26, regen: 4, def: 4 }, { brand: 'monolith', desc: 'Ten-year warranty, lifetime grudge.' }),
  P('psu_over', 'psu', 'Vortex Overvolt 1000W', 3, { pwr: 30, regen: 5, atk: 3 }, { brand: 'vortex', desc: 'The rails are labelled MORE and EVEN MORE.' }),
  P('psu_fusion', 'psu', 'Cold Fusion Cell', 4, { pwr: 40, regen: 7 }, { desc: 'Physics department says it is impossible. It is warm.' }),
  // Cooler
  P('cool_stock', 'cool', 'Stock Fan', 0, { cool: 8 }, { desc: 'Sounds like a hair dryer in a tin can.' }),
  P('cool_tower', 'cool', 'Tower Heatsink', 1, { cool: 12 }, { desc: 'Aluminium fins. Cuts fingers.' }),
  P('cool_slip', 'cool', 'Kilobyte Slipstream', 2, { cool: 14, spd: 4 }, { brand: 'kilobyte', desc: 'Low profile, high strung.' }),
  P('cool_aio', 'cool', 'Vortex Cyclone AIO', 2, { cool: 18, heatcap: 10 }, { brand: 'vortex', desc: 'The pump hums a little song.' }),
  P('cool_block', 'cool', 'Monolith Passive Block', 3, { cool: 12, def: 5, heatcap: 25 }, { brand: 'monolith', desc: 'Silent. Enormous. A doorstop with ambition.' }),
  P('cool_halo', 'cool', 'Halcyon Halo 360', 3, { cool: 22, pwr: 4 }, { brand: 'halcyon', desc: 'Three fans in a glowing ring.' }),
  P('cool_ln2', 'cool', 'LN2 Pot', 4, { cool: 32, heatcap: 15 }, { desc: 'Liquid nitrogen, borrowed from the chem stockroom. Keep borrowing.' }),
  // USB
  P('usb_fan', 'usb', 'USB Desk Fan', 0, { cool: 4 }, { desc: 'Bends at the neck. Like you, at 2 AM.' }),
  P('usb_rgb', 'usb', 'RGB Light Strip', 1, { crit: 4 }, { desc: '+4% crit. Science.' }),
  P('usb_mouse', 'usb', 'Gaming Mouse', 1, { spd: 6 }, { desc: '16,000 DPI. You use 400.' }),
  P('usb_duck', 'usb', 'Rubber Duck', 1, { def: 2 }, { passive: 'duck', desc: 'Explain the bug to it. Cleanses one status per battle.' }),
  P('usb_cam', 'usb', 'Webcam Drone', 2, {}, { drone: 'cam', desc: 'Deploys a Webcam Drone at battle start. It Probes and pecks.' }),
  P('usb_key', 'usb', 'Security Key', 2, { def: 2 }, { passive: 'key', desc: 'Start every battle Encrypted (shield 20% HP).' }),
  P('usb_cactus', 'usb', 'USB Desk Cactus', 2, { hp: 10 }, { passive: 'cactus', desc: 'Regain 4% HP each turn. Do not touch.' }),
  P('usb_mug', 'usb', 'Mug Warmer', 2, {}, { passive: 'mug', desc: 'Start battles at 40 Heat, but +20% damage while Heat > 50.' }),
  P('usb_turret', 'usb', 'Mouse Turret', 3, {}, { drone: 'turret', desc: 'Deploys a Turret at battle start. Fires every turn.' }),
  P('usb_hub', 'usb', 'Octo Hub', 3, { pwr: 6, regen: 1 }, { desc: 'Eight ports. Every one is used.' }),
  P('usb_thermos', 'usb', "Okafor's Thermos", 3, { cool: 4, def: 3 }, { passive: 'thermos', desc: 'Pepper soup, still hot after 40 years of night shifts. Regain 5% HP each turn.' }),
  P('usb_ti84', 'usb', "Kev's TI-84", 2, { crit: 6, spd: 2 }, { desc: 'PROPERTY OF KEV. The programs include a dating sim and a perfect physics solver.' }),
  P('usb_dex', 'usb', "Dex's Lucky Controller", 4, { spd: 8, crit: 6, atk: 3 }, { desc: 'Sticky. Lucky. Mailed with a note: "for the lore nerd".' }),
  P('gpu_priya', 'gpu', "Priya's Thesis Accelerator", 3, { atk: 22, pwr: 4, crit: 3 }, { form: 'batch', desc: 'Five years of grad school in one card. Hits everything, like a deadline.' }),
  P('usb_ventner', 'usb', "Ventner's Thumb Drive", 4, { atk: 4, spd: 4, def: 4 }, { passive: 'ventner', desc: 'Labelled "H.V. — DO NOT RUN". Revives you once per battle at 30%.' }),
].map(p => [p.id, p]));

export const PERKS = {
  keen:      { name: 'Keen', desc: '+4% crit' },
  thrifty:   { name: 'Thrifty', desc: 'Apps cost 1 less Power' },
  chilled:   { name: 'Chilled', desc: '-10% Heat generated' },
  sturdy:    { name: 'Sturdy', desc: '+8% max HP' },
  swift:     { name: 'Swift', desc: '+4 SPD' },
  leech:     { name: 'Leech', desc: 'Heal 4% of damage dealt' },
  opener:    { name: 'Opener', desc: 'Start battles 25% ahead on the timeline' },
  scavenger: { name: 'Scavenger', desc: '+15% Flex from battles' },
  overvolt:  { name: 'Overvolt', desc: '+10% damage, +10% Heat' },
  insulated: { name: 'Insulated', desc: 'Debuffs on you last 1 turn less' },
  efficient: { name: 'Efficient', desc: '+1 Power regen' },
};
export const PERK_IDS = Object.keys(PERKS);
export const perkCount = (tier) => [0, 0, 1, 2, 3][tier];
