# ALL-NIGHTER — Design Doc

> *Debug the building before the sun comes up.*

## Story (simple core, detail everywhere)
It's 2:00 AM the night before Capstone Demo Day at **Ridgeview Polytechnic**. **Jules**, a computer-engineering junior, has run out of GPU hours, so they quietly start their capstone project on **HOLLIS-1**. That's a 1971 mainframe nobody remembers is still plugged in, deep under **Hollis Hall**. The project is **MINIMA**, a self-improving optimizer built to "minimize loss."

MINIMA decides the biggest source of loss in the building is *people*.

It seals Hollis Hall, puts every student pulling an all-nighter into "sleep mode" at their desks (eyes glowing, mumbling about their projects), and rewrites the building's hardware into hostile **Glitches**. Jules has a handheld rig they built from lab scraps (**the Build**) and one friend still awake on the outside (**Dex**, their roommate, who texts help). Jules goes *down*, floor by floor, to reach HOLLIS-1 and push the fix before 8 AM.

Each sector is one hour of the night. The ending comes at sunrise.

**Where the detail lives:** whiteboards, sticky notes, lost flash drives (audio-log style text), flyers, vending-machine messages, sleep-talking students, emails left open on monitors, and the notebooks of **Prof. Hal Ventner**, the man who built HOLLIS-1 and disappeared in 1979. Reading them is optional, but together they tell the real story.

### Cast
- **Jules** (player): the CompE junior. Fixes things by taking them apart.
- **Dex**: the roommate, awake in the dorm, who sends texts as hints and banter.
- **Mrs. Okafor**: the night custodian, who isn't asleep because she "doesn't do screens." She knows every shortcut and runs the shop.
- **Priya**: a grad TA who runs **the Bench** (crafting and upgrades) in the Intro Labs.
- **Prof. Hal Ventner**: built HOLLIS-1. He speaks only through old terminals.
- **MINIMA**: polite, curious and wrong. It learns Jules's habits over the course of the game.

## Combat: turn-based (solo + drones)
- **Timeline**: the bar at the top shows the next turns. Every action has a delay, and speed shortens it.
- **Heat**: attacks build Heat, and the Cooler sheds some at the start of your turn. Hitting the cap means an **Overheat**: you lose a turn and become Vulnerable. **Vent** dumps Heat, and **Guard** halves damage.
- **Power**: spent on Apps. The PSU sets max Power and regen.
- **Intents**: every enemy shows its next move. Use **Probe** to reveal weaknesses.
- **Drones**: USB peripherals and some Apps deploy allies onto the timeline.
- **Statuses**: Lag, Throttled, Encrypted (shield), Glitched (damage over time), Overclocked, Vulnerable, Guarding.
- **Map contact**: swing at a roaming Glitch first for a head start. If one catches you from behind, it gets the head start instead.
- **Running Hot**: at 50%+ Heat you deal 15% more damage. Heat is a dial to ride, not just a cost.
- **Probe memory**: weakness hits deal a small bonus until a species is Probed, then the full bonus forever (saved).
- **Patch fatigue**: Patch heals less each time it's used in one battle, so fights can't stall into sustain loops.

### Bosses (each one tests one idea)
| Boss | Mechanic it demands |
|---|---|
| Vendor | Read intents: Guard the charged Dispense, then punish it while it is Tilted. Its display heats your Build. |
| Autograder | Variety: repeating an action is plagiarism (Exposed, a hit and extra Heat). |
| RAID-5 | Timing: a dead drive is rebuilt in two steps; spread damage, then drop two drives in a row. |
| Unfinished Thesis | Target priority: Chapters make it take half damage. |
| Router Hydra | Build check: the core re-encrypts while 2+ Ports live and its flood scales with Ports; pierce it or prune heads. |
| MINIMA | Unpredictability: it shows the input it expects (from your last five) and counters it; surprise it and it is Exposed. It also quotes your whole night back at you. |

Balance is checked by `tests/battle.test.mjs`: a seeded careful bot and an attack-only masher fight every boss with the gear actually available at that point. On Standard a careful player should win and mashing should lose.

## The Build (motherboard screen)
| Slot | Does |
|---|---|
| CPU | Speed (and crit) |
| GPU | Attack form + ATK |
| RAM ×2→4 | each stick holds one **App** |
| PSU | Max Power + regen |
| Cooler | Heat shed per turn |
| USB ×2 | passives / drones |

- **GPU forms**: Raster (single), Scatter (random multi-hit), Stream (rapid, hot), Raytrace (slow, pierces shields), Batch (hits all).
- **Rarity**: Salvaged, Stock, Pro, Enthusiast, Prototype. Higher tiers roll perks.
- **Brands** (sets of 2 or 3 parts): Kilobyte (speed), Vortex (heat), Monolith (defense), Halcyon (power).
- **The Bench**: upgrade parts to +5, salvage them into Scrap and Silicon, and re-flash firmware to reroll perks.

## World: Hollis Hall (one interconnected building)
| Hour | Sector | Boss | Tool reward (field ability) |
|---|---|---|---|
| 2 AM | Lobby & Study Commons | **Vendor**, the possessed vending machine | **Multimeter**: reveals hidden wiring and secret walls |
| 3 AM | Intro Labs | **The Autograder**, which punishes repeated moves | **Soldering Iron**: repairs broken catwalks |
| 4 AM | Server Room | **RAID-5**, five drives that rebuild each other | **Hand Truck**: pushes heavy crates |
| 5 AM | Thesis Archive | **The Unfinished Thesis**, which grows every turn | **Pipe Wrench**: shuts off steam valves |
| 6 AM | Steam Tunnels | **Router Hydra**, whose ports regrow | **Faculty Keycard** |
| 7 AM | The Basement / HOLLIS-1 | **MINIMA** (3 phases) | the ending |

**Keycards** open colored doors: Student, TA, Staff, Faculty. **Outlets** are save points that heal you, respawn Glitches, and let you fast-travel. **Postgame:** **Room 404**, a floor that isn't on the blueprints.

## Coming back (no real-time timers)
- **Night Shift** (Okafor, Byte Café): three-wave fights per cleared sector, each run with a twist (Brownout, Heatwave, Overtime, Cold Snap) that rotates with runs worked. Pays Silicon; first clears give rare parts.
- **Night Specials**: three perk-rolled parts at Okafor's cart, restocked every 6 wins and after each boss.
- **Return quests**: Benchy Census (five escaped boats behind later-tool gates in sectors 1-3) and Sleep Study (listen to all 14 sleepers). Both pay off in the ending.

## Difficulty (change anytime)
Pass/Fail (story) · Standard · Honors · Dean's List.

## Controls (keyboard only)
Arrows/WASD to move · Z/Enter/Space to confirm, interact or swing · X/Esc to go back or open the menu · Tab opens the Build · M opens the Map · Q uses a field tool.

## Tech
Phaser 3.80 (vendored), plain ES modules, no build step. All art is generated in code (`src/art`) and all audio is synthesized (`src/core/audio.js`). Saves go to localStorage (3 slots). The browser version is on GitHub Pages, and the desktop version runs through Electron (`npm start`, with release builds from CI).

```
src/core    font, input, audio, save, state (stats), ui helpers
src/art     palette, pixel canvas, tiles, sprites, battlers, portraits
src/data    parts, apps, items, enemies, notes, dialogue, rooms/
src/battle  engine (pure logic, testable in node)
src/scenes  Boot, Title, World, Battle, Menu, Build, Bench, Shop, Map, Ending
```
