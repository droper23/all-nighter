import { BOATS, sleepersHeard, SLEEPERS_TOTAL } from './scripts.js';

// Side quests. status(s): 'hidden' | 'active' | 'done'. progress(s): short status line.
export const QUESTS = {
  soup: {
    title: 'Pepper Soup', giver: 'Mrs. Okafor',
    desc: 'Okafor once worked for Marguerite Ventner. Hal\'s soup recipe is in a blue cookbook down in B2. Bring it to her.',
    status: (s) => s.quests.soup || 'hidden',
    progress: (s) => (s.flags.has_cookbook ? 'Return the cookbook to Okafor at the Byte Café.' : 'Find the blue cookbook in Ventner\'s office (B2-07).'),
  },
  silicon: {
    title: 'Thesis Rig', giver: 'Priya',
    desc: 'Priya needs 3 Silicon to finish her thesis rig. She promises something good in return.',
    status: (s) => s.quests.silicon || 'hidden',
    progress: (s) => `Silicon: ${Math.min(3, s.mats.silicon)}/3. Bring it to Priya at the Bench.`,
  },
  calc: {
    title: "Kev's Calculator", giver: 'Notice board',
    desc: 'Someone named Kev lost a TI-84. Kev is asleep in the Capstone Studio, mumbling about it.',
    status: (s) => s.quests.calc || 'hidden',
    progress: (s) => (s.flags.has_calc ? 'Put the calculator on Kev\'s desk in the Capstone Studio.' : 'Find the calculator.'),
  },
  lore: {
    title: 'Lore Hunter', giver: 'Dex',
    desc: 'Dex is collecting everything you read for a "documentary". Rewards at 10, 20 and 30 notes.',
    status: (s) => (s.flags.lore30 ? 'done' : s.notes.length ? 'active' : 'hidden'),
    progress: (s) => `Notes: ${s.notes.length}. Next reward at ${s.notes.length < 10 ? 10 : s.notes.length < 20 ? 20 : 30}.`,
  },
  benchy: {
    title: 'Benchy Census', giver: 'Dex',
    desc: 'The Maker Space printers made thousands of tiny boats. A few escaped into corners you could not reach the first time through.',
    status: (s) => (s.flags.benchy_done ? 'done' : BOATS.some(b => s.flags['boat_' + b]) ? 'active' : 'hidden'),
    progress: (s) => `Boats: ${BOATS.filter(b => s.flags['boat_' + b]).length}/${BOATS.length}. Check the early floors with your newer tools.`,
  },
  sleep: {
    title: 'Sleep Study', giver: 'Dex',
    desc: 'Listen to every sleeping student in Hollis Hall. Maybe their dreams explain what MINIMA wants.',
    status: (s) => (s.flags.sleep_done ? 'done' : sleepersHeard(s) ? 'active' : 'hidden'),
    progress: (s) => `Sleepers heard: ${sleepersHeard(s)}/${SLEEPERS_TOTAL}.`,
  },
  shift: {
    title: 'Night Shift', giver: 'Mrs. Okafor',
    desc: 'Okafor keeps a clipboard of Glitch nests. Clear a shift from the Byte Cafe board for Silicon and rare parts. Every run has a different twist.',
    status: (s) => (s.flags.shift_seen ? 'active' : 'hidden'),
    progress: (s) => `Shifts cleared: ${Object.values(s.shifts || {}).reduce((a, b) => a + b, 0)}.`,
  },
};
