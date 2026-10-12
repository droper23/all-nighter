# ALL-NIGHTER

*Debug the building before the sun comes up.*

A turn-based pixel metroidvania. It's 2 AM the night before Capstone Demo Day. Jules, a computer-engineering student, runs their capstone AI, **MINIMA**, on a forgotten 1971 mainframe under Hollis Hall. MINIMA decides the people in the building are "loss" and puts them all to sleep. You fight down through six sectors of the building, one hour of the night at a time, with a handheld rig you build from salvaged computer parts.

**Play in your browser:** https://droper23.github.io/all-nighter/

## Controls (keyboard)
| Key | Action |
|---|---|
| Arrows / WASD | Move (hold Shift to run) |
| Z / Enter / Space | Talk, interact, confirm, swing at Glitches |
| X / Esc | Back / pause menu |
| Tab / B | Open your Build (motherboard) |
| M | Map |
| Q | Use field tool |

## Features
- **The Build**: a motherboard you outfit with a CPU (speed), a GPU (attack form: Raster, Scatter, Stream, Raytrace or Batch), RAM sticks that each run an App, a PSU (Power), a Cooler (Heat) and USB peripherals (passives and drones). Parts come in five rarity tiers and roll perks, and parts from the same brand give set bonuses.
- **Turn-based combat**: a turn-order timeline, a Heat and overheat system, Power for Apps, and enemies that show their next move ahead of time. Strike a Glitch on the map first to get a head start.
- **Six bosses**, each with a mechanic: a vending machine, an Autograder that punishes repeated moves, a RAID-5 array that rebuilds its drives, an Unfinished Thesis, a Router Hydra and MINIMA itself. There is also a postgame superboss.
- **Field tools** open new paths: Multimeter (secret walls), Soldering Iron (broken catwalks), Hand Truck (crates), Pipe Wrench (steam valves). Keycards open locked doors.
- **The Bench** lets you upgrade, salvage and re-flash parts. Okafor's cart sells supplies.
- More than 40 hand-built rooms, lore notes to collect, two endings and a postgame floor.
- Four difficulty levels (Pass/Fail, Standard, Honors, Dean's List), which you can change at any time.
- All art and audio are generated in code. There are no asset files.

## Run locally
```bash
npm install
npm run web      # browser: http://localhost:8080
npm start        # desktop window (Electron)
npm test         # battle sims + room validation
npm run dist     # build a desktop app for your OS into dist/
```
Pushing a `v*` tag builds a Mac `.dmg` and a Windows portable `.exe` and attaches them to a GitHub Release. The builds are unsigned: on a Mac, right-click the app and choose **Open** the first time. On Windows, click **More info** and then **Run anyway**.

## Code map
```
src/core     font, input, audio synth, save/state, dialogue, UI helpers
src/art      palette, pixel toolkit, tiles, sprites, battle sprites, portraits
src/data     parts, apps/items, enemies, notes, story scripts, rooms/ (one file per sector)
src/battle   engine.js (pure logic) + bosses.js (boss AI)
src/scenes   Boot, Title, World, Battle, Menu (Build/Map/Notes), Shop, Bench, Ending
```
Rooms are ASCII grids. The tile legend is in `src/art/tiles.js`, and entity markers (digits and `ACDEGHIJKNQRUZ@`) map to the `ents` object in each room.
