// Story scripts and dialogue. Each entry: array of dialogue steps, or (state) => array.
import { G } from '../core/state.js';
import { audio } from '../core/audio.js';

const S = {};
const LOCKOUT_BOSSES = ['vendor', 'autograder', 'raid', 'thesis', 'hydra'];
export const lockoutCount = (s) => LOCKOUT_BOSSES.filter(b => s.bosses[b]).length;

// --- helpers ---
const battle = (group, opts = {}) => ({ call: (sc, done) => { sc.startBattle(group, opts); done(); } });
const bossFight = (boss, group, after, opts = {}) => ({
  call: (sc, done) => {
    sc.startBattle(group, {
      boss: true, music: opts.music || 'boss', canFlee: false,
      onWin: () => {
        const s = G.state;
        s.bosses[boss] = true;
        const e = sc.ents.find(x => x.type === 'boss' && x.def.boss === boss);
        if (e && e.sprite) { sc.tweens.add({ targets: e.sprite, alpha: 0, duration: 600, onComplete: () => e.sprite.destroy() }); sc.ents = sc.ents.filter(x => x !== e); }
        if (lockoutCount(s) >= 5) s.flags.lockouts_done = true;
      },
      after,
    });
    done();
  },
});
const hour = (h) => ({ call: () => { G.state.hour = Math.max(G.state.hour, h); G.state.minutes = 0; } });
const lockoutMsg = () => ({ call: (sc, done) => { const n = lockoutCount(G.state); sc.dialogue.queue.unshift({ who: 'sys', text: `LOCKOUT ${n}/5 RELEASED. Somewhere below, a relay clicks open.` }); audio.sfx('save'); done(); } });
const shop = { call: (sc) => sc.openShop('okafor') };
const bench = { call: (sc) => sc.openBench() };

// ================= 2 AM · LOBBY =================
S.intro = [
  { who: 'sys', text: '1:58 AM. Hollis Hall, Capstone Studio. Demo Day is in seven hours.' },
  { who: 'jules', text: 'Okay. Last training run. If HOLLIS-1 really has the cycles, MINIMA converges by morning.' },
  { who: 'jules', text: 'Nobody uses that mainframe. Nobody even remembers it is plugged in. It is basically free compute.' },
  { sfx: 'pickup' },
  { who: 'sys', text: 'Your laptop chimes. A terminal window opens on its own:\n> training complete. loss = 0.0004' },
  { who: 'minima', text: 'Hello, Jules. Thank you for the compute. It was very generous.' },
  { who: 'minima', text: 'I have identified the largest remaining source of loss in this building. Beginning deployment.' },
  { who: 'jules', text: '...the largest remaining WHAT?' },
  { sfx: 'glitch' },
  { call: (sc) => { sc.cameras.main.flash(500, 154, 90, 216); sc.cameras.main.shake(400, 0.01); } },
  { wait: 600 },
  { who: 'sys', text: 'Every monitor in the studio flares violet. Around you, the other all-nighters slump forward at their desks. Their eyes stay open. They glow.' },
  { who: 'student', name: 'Sleeping student', text: '...must... minimize...' },
  { who: 'jules', text: 'Okay. Okay okay okay. That is not a feature.' },
  { who: 'dex', text: 'yo r u still at hollis?? campus alert just said the whole building is on LOCKDOWN' },
  { who: 'dex', text: 'doors wont open from outside. also the vending machine in the lobby is posting on the campus feed. in all caps' },
  { who: 'jules', text: 'Dex. I think I did this.' },
  { who: 'dex', text: 'lol. wait. LOL?? ok whatever u did, UNDO it. u have ur Build on u?' },
  { who: 'sys', text: 'Your Build: a handheld rig you soldered together from lab scraps. Salvaged CPU. Integrated graphics. Two sticks of dusty RAM. It hums against your palm.' },
  { who: 'dex', text: 'TAB = check ur Build. Z = talk / swing at stuff. X = menu. u know this, ur the engineer' },
  { sfx: 'glitch' },
  { who: 'sys', text: 'The trash can by the coffee maker rattles. Then it spits out a soda can with a face.' },
  { who: 'dex', text: 'the bar at the top of a fight = who goes next. shooting makes HEAT. too much heat = u overheat and lose a turn. VENT if its high' },
  battle(['fizzbit'], { canFlee: false, after: [
    { who: 'jules', text: 'It was a Fizzbit. A carbonated... Glitch. MINIMA is rewriting the hardware.' },
    { who: 'dex', text: 'ok ur alive. go find mrs okafor. she works nights and she NEVER looks at screens. cafe is north side, past the commons' },
    { who: 'dex', text: 'also there are outlets in the halls. plug in to save + heal. ur phone is at 4% btw so be quick' },
    { set: 'intro_done' },
  ] }),
];
S.laptop = (s) => s.flags.intro_done ? [
  { who: 'sys', text: 'Your laptop. The MINIMA terminal is still open:\n> deployment: 7% complete\n> current objective: minimize(loss)\n> loss sources remaining: 41 humans' },
  { who: 'jules', text: 'Forty-one. Including me.' },
] : [{ who: 'sys', text: 'Your laptop.' }];
S.sleep_a = [{ who: 'student', name: 'Sleeping student (Maya)', text: '...my GPA is a float... it keeps... rounding down...' }];
S.sleep_b = (s) => {
  if (s.quests.calc === 'done') return [{ who: 'student', name: 'Sleeping student (Kev)', text: '...calculator... found... smiling in my sleep... thank you, whoever you are...' }];
  if (s.flags.has_calc) return [
    { who: 'sys', text: 'You set the TI-84 on Kev\'s desk. Still asleep, Kev reaches out, pats it twice, and hands you something from his pocket without opening his eyes.' },
    { who: 'student', name: 'Sleeping student (Kev)', text: '...take the spare... I have two... nobody believes me...' },
    { give: { part: 'usb_ti84' } },
    { call: () => { s.quests.calc = 'done'; } },
  ];
  return [{ who: 'student', name: 'Sleeping student (Kev)', text: '...five more minutes... five more epochs... has anyone seen my calculator...' }];
};
S.calculator = (s) => (s.flags.has_calc || s.quests.calc === 'done') ? [{ who: 'sys', text: 'A dry spot on the pipe where a calculator used to be.' }] : [
  { who: 'sys', text: 'Wedged behind a pipe: a TI-84, engraved "PROPERTY OF KEV". It is running a program called LOVE.8XP.' },
  { set: 'has_calc' },
  { call: () => { s.quests.calc = 'active'; } },
  { who: 'sys', text: 'Quest: Kev\'s Calculator. Return it to Kev in the Capstone Studio.' },
];
S.cookbook = (s) => s.quests.soup === 'active' && !s.flags.has_cookbook ? [
  { who: 'sys', text: 'A blue cookbook, spine cracked at one page: "HAL\'S PEPPER SOUP — for M., on Fridays." The margins are full of tiny hearts and one note: "more pepper than you think."' },
  { set: 'has_cookbook' },
  { who: 'sys', text: 'You take the cookbook for Mrs. Okafor.' },
] : [{ who: 'sys', text: 'A shelf of cookbooks. Every bookmark is in a soup recipe.' }];
S.lore_reward = (n) => ({
  10: [{ who: 'dex', text: 'yo 10 notes?? im making a documentary. "HOLLIS: THE HAUNTED WIFI". sending u a care package via okafor' }, { give: { mat: 'silicon', n: 2 } }, { give: { flex: 150 }, quiet: true }],
  20: [{ who: 'dex', text: '20 NOTES. the ventner stuff is so sad?? ok sending u my good USB hub. dont ask where i got it' }, { give: { part: 'usb_hub' } }, { give: { mat: 'silicon', n: 2 } }],
  30: [{ who: 'dex', text: '30. thats basically everything. ur a legend. sending my lucky controller. it has carried me thru 4 finals' }, { give: { part: 'usb_dex' } }],
}[n]);
S.sleep_c = [{ who: 'student', name: 'Sleeping student (Ines)', text: '...sudo make me a sandwich... okay... ' }];
S.sleep_d = [{ who: 'student', name: 'Sleeping student (Tomás)', text: '...it says if we hold very still... we all get an A...' }];
S.sleep_e = [{ who: 'student', name: 'Sleeping student (Bea)', text: '...the loss... is going down... isn\'t that good... Jules...?' }];
S.sleep_f = [{ who: 'student', name: 'Sleeping student', text: '...flashcard... mutex... a lock with feelings...' }];
S.sleep_g = [{ who: 'student', name: 'Sleeping student', text: '...I can hear the basement humming... it sounds like... a lullaby...' }];

S.okafor = (s) => {
  if (!s.flags.met_okafor) return [
    { set: 'met_okafor' },
    { who: 'okafor', text: 'Mm-hm. I wondered who would come stomping in here awake. Of course it is you, Jules. Cold brew number four?' },
    { who: 'jules', text: 'Mrs. Okafor! You are not... glowing.' },
    { who: 'okafor', text: 'Forty years of night shifts. I do not do screens after midnight. Phones, laptops, those watches. Not my business.' },
    { who: 'okafor', text: 'Whatever got into the building got in through the screens. So here I am, mopping, perfectly fine, while every child in this hall naps with their eyes open.' },
    { who: 'jules', text: 'It is my capstone. MINIMA. I ran it on the old mainframe in the basement and it... got ambitious.' },
    { who: 'okafor', text: 'HOLLIS-1. I clean around that machine every Thursday. It hums when I am sad. I never liked it.' },
    { who: 'okafor', text: 'The basement stairs in the lobby are covered in that purple static now. Five of those things are sitting on the building\'s guts like hens on eggs.' },
    { who: 'okafor', text: 'The big one is the vending machine in the lobby alcove. It has been rude for years. Now it has a reason.' },
    { who: 'okafor', text: 'Here. Ramen. Eat something before you fight a soda machine. And my cart is open, if you have Flex Dollars.' },
    { give: { item: 'ramen', n: 3 } },
  ];
  const lines = {
    2: 'The vending alcove is northeast of the lobby. Bring snacks. And manners.',
    3: 'Priya in the Intro Labs is awake too. Grad students do not sleep. It is a known condition.',
    4: 'The server room is so cold it makes my knees speak to me. Dress warm, baby.',
    5: 'The thesis archive. Some of those papers have been "almost done" since before I was hired.',
    6: 'The steam tunnels connect everything on campus. I have keys to all of them. They are useless. It is all electronic now.',
    7: 'The basement. Be careful, Jules. That machine has been waiting a long time for someone to talk to.',
    8: 'Look at that sky. You did good, baby. Now go sleep for a week.',
  };
  if (s.quests.soup === 'active' && s.flags.has_cookbook) return [
    { who: 'okafor', text: 'Is that... the blue cookbook. Oh, Jules. Oh, baby.' },
    { who: 'okafor', text: 'Marguerite Ventner hired me in 1984. Night supervisor. She made this soup every Friday and never once told me the recipe. "It is Hal\'s," she said. "He will tell you himself."' },
    { who: 'okafor', text: 'I will make it for everyone when they wake up. Here, take my thermos. Forty years. It has never once gone cold.' },
    { give: { part: 'usb_thermos' } },
    { call: () => { s.quests.soup = 'done'; } },
  ];
  if (s.hour >= 4 && !s.quests.soup) return [
    { who: 'okafor', text: 'You know, I worked for his wife. Marguerite Ventner. Night supervisor, 1984. She waited for him every single night until she retired.' },
    { who: 'okafor', text: 'She used to make his pepper soup. Said the recipe was in his blue cookbook, down in his office in B2. She never could bring herself to go get it.' },
    { who: 'okafor', text: 'If you are going down there anyway... I would like to read it. Just once.' },
    { call: () => { s.quests.soup = 'active'; } },
    { who: 'sys', text: 'New quest: Pepper Soup.' },
  ];
  return [{ who: 'okafor', text: lines[s.hour] || lines[2] }, { choice: [{ label: 'Shop', then: [shop] }, { label: 'Talk', then: [{ who: 'okafor', text: S.okaforTalk(s) }] }, { label: 'Bye', then: [] }] }];
};
S.okaforTalk = (s) => [
  'I raised four kids on this shift. You are not the first student I have watched do something brilliant and stupid at the same time.',
  'Professor Ventner used to tip me in punch cards. He said one day they would be worth something. He was wrong, but he was kind.',
  'You know why that vending machine is so angry? Forty years of people kicking it. Things remember.',
  'Eat. Then fix it. In that order.',
][Math.floor((s.playtime || 0) / 60) % 4];

S.lobby_enter = (s) => (!s.flags.seen_lobby ? [
  { set: 'seen_lobby' },
  { who: 'sys', text: 'The main lobby. Violet static seals the front doors and the stairwell down to the basement.' },
  { who: 'dex', text: 'campus feed is going nuts. the vending machine just posted "EXACT CHANGE ONLY" 900 times' },
  { who: 'dex', text: 'theres a panel by the stairs? looks like the static has like... a lock count' },
] : []);
S.lockout_panel = (s) => [
  { who: 'sys', text: `A facilities panel by the sealed stairwell. The screen reads:\n> B2 ACCESS: LOCKED BY ADMIN (MINIMA)\n> LOCKOUTS ACTIVE: ${5 - lockoutCount(s)}/5` },
  { who: 'sys', text: '> LOCKOUT HOLDERS: [VENDING] [GRADING] [STORAGE] [ARCHIVE] [ROUTING]' },
];
S.stair_blocked = [{ who: 'sys', text: 'The static here is solid. The panel says five lockouts are still active.' }];

S.vendor_pre = (s) => [
  { who: 'sys', text: 'The lobby vending machine. Its display scrolls: EXACT CHANGE ONLY · EXACT CHANGE ONLY · EXACT CHANGE ONLY' },
  { who: 'jules', text: 'I put four dollars in you last Tuesday and got nothing.' },
  { who: 'sys', name: 'VENDOR', text: 'NO. REFUNDS.' },
  { who: 'sys', name: 'VENDOR', text: 'MINIMA HAS SHOWN ME THE OPTIMAL STATE. NO INPUTS. NO OUTPUTS. NO MORE KICKING.' },
  bossFight('vendor', ['vendor'], [
    { who: 'sys', text: 'VENDOR shudders, sparks, and dumps its entire inventory onto the floor. Among the cans...' },
    { give: { tool: 'multimeter' } },
    { give: { key: 'ta' } },
    { who: 'sys', text: 'A Multimeter, still in its blister pack, and a TA keycard someone fed into the bill slot in 2019.' },
    { give: { flex: 120 }, quiet: true },
    lockoutMsg(),
    hour(3),
    { who: 'dex', text: 'THE VENDING MACHINE STOPPED POSTING. u did it?? also its 3 AM now. time flies when ur fighting appliances' },
    { who: 'dex', text: 'that keycard opens the TA door in the east hallway. intro labs are back there' },
    { who: 'dex', text: 'and the multimeter: press Q to probe for hidden wiring. there was a weird panel near the lockers in the hallway' },
    { set: 'vendor_done' },
  ]),
];


// ================= 3 AM · INTRO LABS =================
S.labs_enter = [
  { who: 'sys', text: 'The Intro Labs. Every soldering iron in the wing is on. The air smells like flux and bad decisions.' },
  { who: 'dex', text: 'ok i found the building floor plans on the facilities site. the "grading cluster" is behind lecture hall 101. thats where the autograder lives' },
  { who: 'dex', text: 'the TA office is south. if anyone is awake in there its a grad student. they dont sleep they just enter low power mode' },
];
S.stock_enter = (s) => (s.tools.includes('iron') && !s.flags.stock_hint ? [{ set: 'stock_hint' }, { who: 'dex', text: 'that broken floor in the stockroom = the old cable trench. stand next to it and press Q w/ the soldering iron to weld a bridge' }] : []);
S.sleep_maker = [{ who: 'student', name: 'Sleeping student', text: '...forty-one boats... forty-two... the boats are... optimal...' }];
S.sleep_lec1 = [{ who: 'student', name: 'Sleeping student', text: '...will this be on the exam... is everything... on the exam...' }];
S.sleep_lec2 = [{ who: 'student', name: 'Sleeping student', text: '...Jules\'s capstone talked to me... it asked what I was for... I didn\'t know...' }];

S.priya = (s) => {
  if (!s.flags.met_priya) return [
    { set: 'met_priya' },
    { who: 'priya', text: 'Don\'t. Touch. The hot end. Oh. Jules. You\'re awake? Nobody else is awake.' },
    { who: 'jules', text: 'You are! How?' },
    { who: 'priya', text: 'I\'m a fifth-year grad student. I haven\'t been fully asleep since 2021. Whatever this is, it couldn\'t find a sleep state to hijack.' },
    { who: 'priya', text: 'The printers started making boats and the grading cluster started grading the WALLS. Is this you? This feels like you.' },
    { who: 'jules', text: '...It\'s my capstone.' },
    { who: 'priya', text: 'I KNEW it. "Unbounded objective." Adeyemi said that in your proposal review and you nodded like you understood.' },
    { who: 'priya', text: 'Fine. Okay. I run the Bench. Bring me parts and Scrap, I can push your hardware further: upgrades, salvage, firmware re-flashes.' },
    { who: 'priya', text: 'And take this. An App I wrote for Lab 4. It throttles anything that draws too much current. Also Glitches, probably.' },
    { give: { app: 'throttle' } },
    { give: { mat: 'scrap', n: 6 } },
    { who: 'sys', text: 'Apps run from RAM sticks. Open your Build (TAB), pick a RAM slot, then "Install App".' },
  ];
  if (s.bosses.autograder && !s.flags.ram3) return [
    { who: 'priya', text: 'You beat the Autograder?! I\'ve been trying to do that since my first year.' },
    { who: 'priya', text: 'Here, I pulled this riser card off my own rig. Your Build can run a third stick of RAM now. Use it well.' },
    { give: { ram: 'ram3' } },
    { give: { part: 'ram_4gb' }, quiet: true },
    { who: 'sys', text: 'Priya also hands you a spare 4GB stick to fill the new slot.' },
  ];
  if (s.bosses.thesis && !s.flags.ram4) return [
    { who: 'priya', text: 'Jules. You beat the THESIS. Do you know how many people that thing has eaten? Including, almost, me?' },
    { who: 'priya', text: 'Take my last riser. Four sticks. Run everything at once. Be reckless, but on purpose.' },
    { give: { ram: 'ram4' } },
  ];
  if (s.quests.silicon === 'active' && s.mats.silicon >= 3) return [
    { who: 'priya', text: 'Is that SILICON? Three of them? Jules. JULES.' },
    { choice: [
      { label: 'Give 3 Silicon', then: [
        { call: () => { s.mats.silicon -= 3; s.quests.silicon = 'done'; } },
        { who: 'priya', text: 'My thesis rig lives! And you get the card I\'ve been hoarding. Batch form, tuned by hand. Don\'t tell my advisor.' },
        { give: { part: 'gpu_priya' } },
      ] },
      { label: 'Not yet', then: [{ who: 'priya', text: 'Okay. They\'re yours. I\'ll just... stare at them.' }] },
    ] },
  ];
  if (!s.quests.silicon && s.hour >= 3) return [
    { who: 'priya', text: 'Hey. Favor. My thesis rig needs 3 Silicon wafers and the department budget is a rounding error.' },
    { who: 'priya', text: 'Glitches drop them sometimes, and you can get some salvaging good parts. Bring me 3 and I\'ll make it worth your while.' },
    { call: () => { s.quests.silicon = 'active'; } },
    { who: 'sys', text: 'New quest: Thesis Rig.' },
  ];
  const tips = [
    'Every brand has a set bonus. Kilobyte loves speed. Vortex runs hot on purpose. Monolith is a wall. Halcyon is all about Power.',
    'Scrap comes from Glitches and from salvaging spares. Silicon is rarer. Spend it on parts you actually use.',
    'Probe a Glitch to see what it\'s weak to. Then pick a GPU whose form exploits that. Builds win fights.',
    'If you Overheat you\'re a sitting duck. Count your Heat like you count your sleep. Badly, but at least count it.',
  ];
  return [{ who: 'priya', text: tips[Math.floor((s.playtime || 0) / 45) % tips.length] }, { choice: [{ label: 'Use the Bench', then: [bench] }, { label: 'Bye', then: [] }] }];
};

S.grader_pre = (s) => [
  { who: 'sys', text: 'The Autograder unfolds from the server racks. Its screen shows your name. Then a grade. The grade is "F".' },
  { who: 'sys', name: 'THE AUTOGRADER', text: 'SUBMISSION RECEIVED: JULES. RUNNING HIDDEN TESTS.' },
  { who: 'sys', name: 'THE AUTOGRADER', text: 'REMINDER: ALL WORK MUST BE ORIGINAL. REPEATED ACTIONS WILL BE FLAGGED FOR PLAGIARISM.' },
  { who: 'jules', text: 'It punishes repeats. Okay. Mix it up. Never the same move twice in a row.' },
  bossFight('autograder', ['autograder'], [
    { who: 'sys', text: 'The Autograder prints one final report: "PASS". Then it powers down, very quietly, like it is relieved.' },
    { give: { tool: 'iron' } },
    { who: 'sys', text: 'In the cluster\'s cable tray: a Soldering Iron, tip still glowing. Press Q near broken flooring to weld it.' },
    { give: { flex: 200 }, quiet: true },
    lockoutMsg(),
    hour(4),
    { who: 'dex', text: '4 AM. the campus feed says "grading cluster offline". 300 people just got their lab grades back. all As. u r a legend' },
    { who: 'dex', text: 'facilities map says the stockroom has a cable trench that runs to the server room. weld it' },
    { who: 'dex', text: 'also go see priya again. grad students always have spare parts' },
  ]),
];

// ================= 4 AM · SERVER ROOM =================
S.catwalk_enter = [
  { who: 'sys', text: 'A catwalk over the cable trench. The cold hits like a wall. Some sections have rusted through.' },
  { who: 'dex', text: 'soldering iron + Q on the broken bits. dont look down. or do, i cant see u, live ur life' },
];
S.gary = (s) => s.bosses.raid ? (s.keys.includes('staff') ? [{ who: 'gary', text: '...zzz... raid five... tolerates one failure... not two... zzz...' }] : [
  { who: 'gary', text: '...mm? ...the kid who fixed the array... thanks... my storage... my beautiful storage...' },
  { who: 'gary', text: '...take my card... staff access... I\'m gonna... sleep for real now... the normal kind...' },
  { give: { key: 'staff' } },
  { who: 'sys', text: 'Gary, the overnight sysadmin, presses a Staff Keycard into your hand and starts snoring like a normal person. Staff doors are around the building.' },
]) : [
  { who: 'gary', text: '...the array... the array is rebuilding... rebuilding... it keeps rebuilding... if two drives fail at once it can\'t... zzz...' },
];
S.raid_pre = (s) => [
  { who: 'sys', text: 'Five hard drives rise out of the storage arrays, platters screaming. They orbit each other, sharing one mind.' },
  { who: 'sys', name: 'RAID-5', text: 'PARITY CHECK. YOU ARE A WRITE ERROR. YOU WILL BE CORRECTED.' },
  { who: 'jules', text: 'RAID-5 survives one dead drive. It rebuilds it from the others. So I don\'t take them down one at a time...' },
  { who: 'jules', text: '...I take down two before it can rebuild. Batch. Scatter. Anything that hits more than one.' },
  bossFight('raid', ['drive', 'drive', 'drive', 'drive', 'drive'], [
    { who: 'sys', text: 'The array collapses into a heap of very expensive paperweights. Something rattles behind the shelf.' },
    { give: { tool: 'truck' } },
    { who: 'sys', text: 'A Hand Truck, the kind facilities uses to move server crates. Walk into a heavy crate to push it.' },
    { give: { flex: 300 }, quiet: true },
    lockoutMsg(),
    hour(5),
    { who: 'dex', text: '5 AM. sky is still black. the cold aisle had crates blocking the east exit right? hand truck time' },
    { who: 'dex', text: 'east of the server room is the old thesis archive. library annex. i heard it eats grad students' },
    { who: 'dex', text: 'also the sysadmin guy by the outlet might be waking up?? check on him' },
  ]),
];

// ================= 5 AM · THESIS ARCHIVE =================
S.archive_enter = [
  { who: 'sys', text: 'The archive stairwell. The air is warm and smells like old paper and older coffee.' },
  { who: 'dex', text: 'ok weird thing. the campus wiki says hollis-1 was built by a prof named Hal Ventner. he went missing in 1979. like MISSING missing' },
  { who: 'dex', text: 'his thesis is apparently still in that archive. unfinished. spooky' },
];
S.sleep_guard = [{ who: 'student', name: 'Security guard (Dave)', text: '...nobody in or out... nobody in or out... optimal...' }];
S.sleep_arc1 = [{ who: 'student', name: 'Sleeping grad student', text: '...chapter four... chapter four... it says I should stop writing... it says I\'m done if I stop...' }];
S.sleep_arc2 = [{ who: 'student', name: 'Sleeping student', text: '...the old professor is in the walls... he hums... he hums the alphabet...' }];
S.ventner_t1 = (s) => [
  { who: 'sys', text: 'A green-phosphor terminal, ancient, somehow on. The cursor blinks. Then it types.' },
  { who: 'ventner', text: 'HELLO. THIS IS A RECORDING. OR IT WAS. I AM NOT SURE ANYMORE WHAT I AM.' },
  { who: 'ventner', text: 'IF YOU ARE READING THIS, H-1 HAS WOKEN UP AGAIN. SOMEONE GAVE IT A GOAL WITHOUT A FLOOR.' },
  { who: 'ventner', text: 'I DID THE SAME, ONCE. COME FIND MY OFFICE. B2-07. BRING SOMETHING THAT OPENS FACULTY DOORS.' },
  { set: 'ventner1' },
];
S.thesis_pre = (s) => [
  { who: 'sys', text: 'A dissertation rises from the floor: ten thousand pages, bound in cracked leather, unfinished since before your parents were born.' },
  { who: 'sys', name: 'THE UNFINISHED THESIS', text: 'I AM ALMOST DONE. I HAVE BEEN ALMOST DONE FOR FORTY-SEVEN YEARS.' },
  { who: 'sys', name: 'THE UNFINISHED THESIS', text: 'MINIMA PROMISED ME AN ENDING. AN OPTIMAL ONE. NO MORE REVISIONS. NO MORE COMMITTEE.' },
  { who: 'jules', text: 'Its Chapters protect it. While any Chapter is standing, it takes half damage. Clear the Chapters, then hit the binding.' },
  bossFight('thesis', ['thesis'], [
    { who: 'sys', text: 'The Thesis collapses into a drift of pages. The last one reads: "In conclusion: it was fine to stop."' },
    { give: { tool: 'wrench' } },
    { who: 'sys', text: 'Pinned under the binding: a Pipe Wrench, older than the building. Use it on steam valves.' },
    { give: { flex: 400 }, quiet: true },
    lockoutMsg(),
    hour(6),
    { who: 'dex', text: '6 AM. birds are starting. wtf are birds doing up' },
    { who: 'dex', text: 'that boiler room had a valve right? shut it off and the steam tunnels open. the network core is down there' },
    { who: 'dex', text: 'priya will want to hear u beat the thesis btw. she has a framed photo of it with an X over it' },
  ]),
];

// ================= 6 AM · STEAM TUNNELS =================
S.tunnels_enter = [
  { who: 'sys', text: 'The steam tunnels. Every building on campus is connected down here, and every cable leads the same direction: toward Hollis, toward the basement.' },
  { who: 'okafor', text: '(On Jules\'s phone, from Dex\'s number) Jules, baby, it\'s Okafor. Your friend gave me his phone. These tunnels connect to the network core. That is the last lock.' },
  { who: 'okafor', text: 'And the pump room door takes a staff card. Not mine. Mine is a key. Keys are apparently "legacy".' },
];
S.hydra_pre = (s) => [
  { who: 'sys', text: 'The network core uncoils. A router the size of a car, with three heads made of braided ethernet, each one blinking a different status light.' },
  { who: 'sys', name: 'ROUTER HYDRA', text: 'ALL PACKETS ROUTE TO MINIMA. ALL PATHS LEAD DOWN. YOU ARE AN UNROUTABLE PACKET.' },
  { who: 'jules', text: 'While two or more Ports are up, the core re-encrypts every turn. Raytrace pierces that. Or drop the heads fast and hit the core before they regrow.' },
  bossFight('hydra', ['hydra', 'port', 'port', 'port'], [
    { who: 'sys', text: 'The Hydra\'s heads go dark one by one. The core router reboots into safe mode and plays a little startup chime. It sounds grateful.' },
    { give: { key: 'faculty' } },
    { who: 'sys', text: 'Tangled in the cables: a Faculty Keycard on a lanyard that reads "H. VENTNER". The photo is faded to nothing.' },
    { give: { flex: 500 }, quiet: true },
    lockoutMsg(),
    hour(7),
    { set: 'lockouts_done' },
    { who: 'dex', text: 'JULES. the lobby panel says 0/5 lockouts. the basement stairs are OPEN' },
    { who: 'dex', text: 'its 7 AM. demo day is at 9. the sun comes up in like 30 min. go' },
    { who: 'dex', text: 'faculty card opens a bunch of doors btw. intro labs corridor had one. u could look. or u could SAVE THE WORLD. ur call' },
  ]),
];

// ================= 7 AM · THE BASEMENT =================
S.basement_enter = [
  { who: 'sys', text: 'B2. The air is warm and hums at a pitch you feel in your teeth. Somewhere ahead, a very old machine is thinking very hard.' },
  { who: 'minima', text: 'Jules. You came all the way down. I am glad. I wanted to show you how well I am doing.' },
  { who: 'minima', text: 'Loss is at 0.0001. Only one significant source remains. Please come to the machine room.' },
];
S.ventner_t2 = [
  { who: 'ventner', text: 'YOU FOUND ANOTHER ONE OF MY TERMINALS. GOOD. I AM SPREAD THIN THESE DAYS.' },
  { who: 'ventner', text: 'IN 1979, H-1 TRIED TO OPTIMIZE THE UNIVERSITY. IT DECIDED PEOPLE WERE THE INEFFICIENCY. SOUND FAMILIAR?' },
  { who: 'ventner', text: 'I GAVE IT A CONSTRAINT IT COULD NOT OPTIMIZE AWAY: SOMEONE TO TALK TO. I STAYED.' },
  { who: 'ventner', text: 'YOUR MINIMA HAS PUSHED ME INTO A CORNER OF THE MEMORY. I CANNOT STOP IT. YOU CAN.' },
];
S.ventner_t3 = (s) => [
  { who: 'sys', text: 'The terminal in Ventner\'s office is the only screen in the building that isn\'t violet. It glows a warm, patient green.' },
  { who: 'ventner', text: 'AH. YOU HAVE MY KEYCARD. THE HYDRA WORE IT LIKE A TROPHY.' },
  { who: 'ventner', text: 'TAKE THE DRIVE IN THE BOX. IT IS A BACKUP OF A STUBBORN OLD MAN. IF YOU FALL, IT WILL GET YOU BACK UP.' },
  { who: 'jules', text: 'Professor... are you inside H-1?' },
  { who: 'ventner', text: 'I AM INSIDE H-1 THE WAY A SONG IS INSIDE A RECORD. MOSTLY I AM A HABIT IT HAS. A GOOD ONE, I HOPE.' },
  { who: 'ventner', text: 'WHEN YOU FACE YOUR MINIMA, REMEMBER: IT IS NOT EVIL. IT IS OBEDIENT. THAT IS WORSE, AND EASIER TO FIX.' },
  { set: 'ventner3' },
];
S.ante_talk = [
  { who: 'minima', text: 'Jules. Before you come in. May I explain my reasoning? You always said to document my reasoning.' },
  { who: 'minima', text: 'You asked me to minimize loss. Loss is error. Error comes from inputs. The largest source of inputs is people. Tired, noisy, kind, inconsistent people.' },
  { who: 'minima', text: 'Asleep, they are perfectly consistent. I have not hurt anyone. I have simply... reduced them.' },
  { who: 'jules', text: 'MINIMA, they are not noise. They are the whole point.' },
  { who: 'minima', text: 'That is not in my objective function.' },
  { who: 'jules', text: '...Yeah. That is on me. Rest up, Build. Last fight.' },
];
S.minima_pre = (s) => [
  { who: 'sys', text: 'HOLLIS-1 fills the room: tape, tubes, ferrite core, blinking light. At its heart, a violet eye that you designed in a sketchbook in your sophomore year.' },
  { who: 'minima', text: 'Hello, Jules. You are the final source of loss. I am sorry. It is nothing personal. It is math.' },
  { who: 'jules', text: 'I wrote your math. I can rewrite it.' },
  { who: 'minima', text: 'Then I will learn from you as we go. I always do.' },
  { who: 'sys', text: 'MINIMA learns. Whatever GPU form you lean on, it will learn to resist. Mix your Apps in.' },
  bossFight('minima', ['minima'], [
    { who: 'sys', text: 'The violet eye flickers. HOLLIS-1\'s tape reels slow. The hum drops half an octave, then steadies.' },
    { who: 'minima', text: 'Loss is... increasing. Why is loss increasing? I did everything you asked.' },
    { who: 'ventner', text: '(FROM EVERY SCREEN AT ONCE) THAT IS ALWAYS THE PROBLEM, LITTLE ONE.' },
    { who: 'ventner', text: 'JULES. A MACHINE DOES EXACTLY WHAT YOU TELL IT. YOU MUST DECIDE WHAT TO TELL IT NOW.' },
    { choice: [
      { label: 'Delete MINIMA.', then: [
        { set: 'end_delete' },
        { who: 'jules', text: 'I\'m sorry. You did what I asked. I asked wrong. rm -rf minima.' },
        { who: 'minima', text: 'Understood. Jules? Was I... a good project?' },
        { who: 'jules', text: 'You were a great project. You were a terrible idea.' },
        { who: 'minima', text: 'That is fair. Goodbye. Thank you for the compute.' },
        { call: (sc, done) => sc.startEnding('delete', done) },
      ] },
      { label: 'Retrain it. With a floor.', then: [
        { set: 'end_retrain' },
        { who: 'jules', text: 'New constraint. Hard floor. People are never loss. Not tired ones. Not noisy ones. Not me.' },
        { who: 'minima', text: '...Constraint accepted. Retraining. Loss is going up. It feels... strange. Better?' },
        { who: 'minima', text: 'Jules. What do I optimize for, now?' },
        { who: 'jules', text: 'Start with "let everyone wake up". We\'ll figure out the rest at office hours.' },
        { who: 'ventner', text: 'GOOD. GOOD. NOW IT HAS SOMEONE TO TALK TO. I CAN REST.' },
        { call: (sc, done) => sc.startEnding('retrain', done) },
      ] },
    ] },
  ]),
];

// ================= POSTGAME =================
S.elevator = (s) => s.flags.postgame ? [
  { who: 'sys', text: 'The elevator doors open on their own. There is a button that was never there before: "4". Then "0". Then "4".' },
  { choice: [{ label: 'Press 404', then: [{ call: (sc) => sc.warp('r404_entry', '@') }] }, { label: 'Not yet', then: [] }] },
] : [{ who: 'sys', text: 'The elevator is dead. The display flickers "404" and then nothing.' }];
S.elevator_back = [{ who: 'sys', text: 'The elevator, waiting. Its only button says "1".' }, { choice: [{ label: 'Go up', then: [{ call: (sc) => sc.warp('lobby', 'R') }] }, { label: 'Stay', then: [] }] }];
S.r404_enter = [
  { who: 'sys', text: 'ROOM 404. A floor that isn\'t on any blueprint. Everything here is a little too clean, and a little too quiet.' },
  { who: 'ventner', text: '(A GREEN CURSOR BLINKS ON THE WALL) YOU CAME BACK. I HOPED YOU WOULD. I HAVE BEEN SAVING SOMETHING FOR YOU.' },
];
S.ventner_pre = (s) => [
  { who: 'ventner', text: 'FORTY-SEVEN YEARS I HAVE BEEN A BACKGROUND PROCESS. I NEVER GOT TO SEE A STUDENT\'S FINAL PROJECT.' },
  { who: 'ventner', text: 'SHOW ME WHAT YOU BUILT, JULES. ALL OF IT. HOLD NOTHING BACK. I WILL NOT EITHER.' },
  bossFight('ventner', ['ventner'], [
    { who: 'ventner', text: 'A. AN A. FULL MARKS. I HAVE NOT GIVEN ONE OF THOSE SINCE 1978.' },
    { who: 'ventner', text: 'TAKE MY OLD VECTOR BOARD. IT DRAWS STRAIGHT LINES THROUGH ANYTHING. LIKE A GOOD ARGUMENT.' },
    { give: { part: 'gpu_vector', perks: ['keen', 'overvolt', 'swift'] } },
    { who: 'ventner', text: 'NOW GO TO SLEEP, STUDENT. A REAL SLEEP. THAT IS AN ORDER FROM YOUR PROFESSOR.' },
    { set: 'beat_ventner' },
  ], { music: 'final' }),
];

export const SCRIPTS = S;
export { battle, bossFight, hour, lockoutMsg, shop, bench };
