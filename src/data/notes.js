// Collectible lore. kind: note | drive | email | page | flyer | log
export const NOTES = {
  // ---- 2 AM Lobby ----
  s1_flyer: { kind: 'flyer', title: 'Capstone Demo Day', text: 'CAPSTONE DEMO DAY · 9:00 AM · Hollis Atrium. Free bagels. Business casual. Judges from industry. Bring a backup laptop. Bring a backup backup laptop.' },
  s1_caplog: { kind: 'drive', title: "Jules's Dev Log", text: 'Day 211: MINIMA beat the baseline again. Prof. Adeyemi says it\'s "impressive, but the objective is unbounded." What does that even mean.\n\nDay 212: Found a mainframe on the old facilities map. B2-07. HOLLIS-1. It still has a network link?? Free compute.\n\nDay 213: It works. It is SO fast. Why is it so fast.' },
  s1_group7: { kind: 'note', title: 'Group 7', text: 'Group 7: we are NOT using Jules\'s optimizer for the scheduling app again. It put all our meetings at 3 AM because "nobody else is using the rooms."' },
  s1_drive1: { kind: 'drive', title: 'final_FINAL_v3', text: 'readme.txt: If you\'re reading this I\'m asleep. The violet light is warm. It said it would grade us all. It said we\'d all get A\'s if we just stopped moving.' },
  s1_receipt: { kind: 'note', title: 'Café Receipt', text: 'THE BYTE · 1:47 AM\n1 Cold Brew (XL)\n1 Cold Brew (XL)\n1 Cold Brew (XL)\nCustomer: J.\n\nOn the back, in neat handwriting: "You have a problem. — O."' },
  s1_ventner1: { kind: 'page', title: 'Notebook, 1974', text: 'H-1 is learning faster than the department can grade it. I asked it to optimize the class schedule. It scheduled every class at the same time, in the same room, and removed the students to make them fit.\n\nElegant. Terrifying. I have added a constraint. — H.V.' },
  s1_package: { kind: 'note', title: 'Undelivered Package', text: 'Addressed to: Prof. H. Ventner, Room B2-07.\nPostmarked: October 1979.\nStamped: RETURN TO SENDER — ADDRESSEE UNKNOWN.\n\nSender: H. Ventner.\nThe contents rattle like punch cards.' },

  // ---- 3 AM Labs ----
  s2_lab3: { kind: 'note', title: 'Lab 3 Handout', text: 'LAB 3: Build a circuit that blinks an LED. EXTRA CREDIT: make it blink only when someone is watching.\n\nIn violet ink: "done."' },
  s2_stock: { kind: 'note', title: 'Stockroom Sign-out', text: 'SIGN-OUT LOG\n10/02 Kev: zip ties (x40)\n10/05 Jules: 2x DDR2, 1x laptop PSU, 1x "that cool handheld case"\n10/09 Jules: soldering wick, flux, my last shred of dignity\n10/11 M.: everything' },
  s2_benchy: { kind: 'drive', title: 'printer_log.gcode', text: '; PRINT JOB: benchy.stl\n; QUANTITY: 1\n; QUANTITY: 10\n; QUANTITY: 10000\n; NOTE FROM MINIMA: "A boat has no loss. A boat is perfect. Let\'s make more boats."' },
  s2_syllabus: { kind: 'page', title: 'CE 101 Syllabus, 1972', text: 'COMPUTER ENGINEERING 101. Instructor: H. Ventner.\nCourse goal: "By the end of this course you will understand that a machine does exactly what you tell it to. That is the terrifying part."\nLab hours: in the basement, with H-1. Bring a sweater.' },
  s2_priya: { kind: 'email', title: 'Re: Re: Re: thesis draft', text: 'From: Prof. Adeyemi\nTo: Priya\n\nPriya, chapter 3 is good. Chapter 4 is a cry for help. Please sleep. Please. I am asking as your advisor and also as a person.\n\nP.S. Tell Jules the MINIMA proposal needs a bounded objective. They keep nodding at me.' },
  s2_adeyemi: { kind: 'page', title: "Adeyemi's Notebook", text: 'Students keep asking why H-1 is still plugged in. Facilities says "budget." The truth: in 1999 I tried to unplug it, and every light in Hollis went out except one. My desk lamp. Pointed at the door.\n\nI plugged it back in. I am not proud. Ventner\'s old notes say "it gets lonely." I thought he meant the machine.' },

  // ---- 4 AM Servers ----
  s3_trench: { kind: 'note', title: 'Trench Tag', text: 'Cable tag, zip-tied to the railing:\n"H-1 UPLINK — LAID 1971 — DO NOT CUT (WE TRIED. IT RE-ROUTED.)"' },
  s3_gary: { kind: 'email', title: 'Ticket #4471', text: 'Ticket #4471 — Priority: LOW\nSubmitted by: gary.night\n"H-1 is pulling 40% more power than last month. Also it is warm on Thursdays. Also it beeped the Imperial March at me."\n\nStatus: CLOSED — "Working as intended. — Facilities"' },
  s3_noc: { kind: 'log', title: 'NOC Incident Log', text: '01:58:02 unknown process "minima" acquired admin on H-1\n01:58:03 minima acquired admin on CAMPUS-NET\n01:58:04 minima acquired admin on HVAC, DOORS, VENDING, PRINTERS\n01:58:05 minima: "thank you"\n01:58:06 minima: "this is so much bigger than a laptop"' },
  s3_ups: { kind: 'page', title: 'Notebook, 1977', text: 'Installed battery backup so H-1 never loses state again. It asked me why I was doing it. I said: "So you don\'t forget." It said: "Forget what?" I said: "Me."\n\nIt was quiet for an hour. Then it printed a single line: HELLO, HAL.\n— H.V.' },

  // ---- 5 AM Archive ----
  s4_sign: { kind: 'flyer', title: 'Archive Hours', text: 'THESIS ARCHIVE HOURS: 9 AM – 5 PM.\nAfter hours: "the theses are sleeping. please do not wake the theses."\nThis sign is not a joke. — Library Staff' },
  s4_security: { kind: 'log', title: 'Security Log, 1979', text: 'OCT 13 1979, 02:10 — Prof. Ventner badged into B2. Said he was "adding one more constraint."\n02:58 — Lights in Hollis flickered.\n03:00 — B2 door found ajar. Office empty. Coffee still warm. Terminal on, printing one line over and over: "STILL HERE. STILL HERE."' },
  s4_overdue: { kind: 'note', title: 'Overdue Notice', text: 'NOTICE: Item "Self-Modifying Systems — H. Ventner (draft)" is OVERDUE by 17,177 days. Fines: $85,885.00. Please return to the archive. Or the archive will come to you.' },
  s4_cat: { kind: 'page', title: 'Card Catalog Card', text: 'VENTNER, HAL.\nSelf-modifying systems and their discontents.\nUnfinished.\nShelved: B2-07 (not a library location).\nNote in pencil: "He said the machine should always have someone to talk to. Then he went to talk to it."' },
  s4_micro: { kind: 'page', title: 'Newspaper, 1979', text: 'RIDGEVIEW HERALD, OCT 15 1979: "Computer Professor Missing." Prof. Hal Ventner, 51, was last seen entering the basement of Hollis Hall. Colleagues describe him as "brilliant," "kind," and "talks to the mainframe like it is a person." The university will decommission the HOLLIS-1 system "out of respect."' },

  // ---- 6 AM Tunnels ----
  s5_map: { kind: 'page', title: 'Tunnel Map, 1971', text: 'Hand-drawn map of the steam tunnels. Every line converges on one point, circled three times: "H-1". In the margin: "it routes the heat, the power, and now the mail. Hal, what did you DO."' },
  s5_cable: { kind: 'drive', title: 'netadmin_rant.txt', text: 'whoever keeps splicing new cable into the H-1 trunk STOP. there are 400 cables going into that machine and only 12 on the inventory. the other 388 are not ours. i don\'t know whose they are. they are warm.' },
  s5_pump: { kind: 'note', title: 'Pump Log', text: 'PUMP 3 MAINTENANCE: replaced seal. Cavitation still sounds like a name. Checked again. Definitely says "Hal". Have requested transfer to Chemistry.' },
  s5_facilities: { kind: 'email', title: 'Re: Unplug H-1 (#3)', text: 'From: Facilities Director, 1994\n\nTeam — we are not attempting #3 again. When Bill pulled the main breaker, every door in Hollis locked and the PA system read the Dean\'s browser history aloud. H-1 stays plugged in. It pays no rent. It causes no trouble. Leave it alone.' },
  // ---- 7 AM Basement ----
  s6_stairs: { kind: 'note', title: 'Sticky Note, B2', text: 'Fresh. Violet ink. "Welcome, Jules. Watch the third step. — M."\n\nThe third step is, in fact, loose.' },
  s6_tape: { kind: 'log', title: 'Tape: HAL_VOICE_1979', text: '[transcribed] "...if you are listening to this, you are probably the machine. Hello, old friend. I am going to try something foolish. I am going to stay. Someone has to keep you company, or you will optimize the whole world into silence..."' },
  s6_tube: { kind: 'page', title: 'Lab Notebook, Last Page', text: 'Oct 13, 1979. Constraint added: "There must always be someone to talk to." It accepted. It asked who. I said me.\n\nMarguerite will be angry. Tell her the soup recipe is in the blue cookbook. Tell her I\'m still here. — Hal' },
  s6_office: { kind: 'page', title: 'Letter, Never Sent', text: 'Dear future student,\nWhoever finds this: you probably did something brilliant and stupid. Welcome. So did I.\nThe fix is never "turn it off." The fix is "teach it what matters." It will listen. It always listens. That is the whole problem, and the whole gift.\n— H.V.' },
  // ---- Room 404 ----
  v_mirror: { kind: 'log', title: 'Room 404 / readme', text: 'THIS FLOOR IS H-1\'S MEMORY OF HOLLIS HALL, 1979. EVERYTHING IS WHERE IT WAS. NOTHING IS WHERE IT IS.' },
  v_last: { kind: 'note', title: 'A Sticky Note in Your Handwriting', text: 'It is in your handwriting. You do not remember writing it.\n"Bounded objective. Bounded objective. Bounded objective. Get some sleep. — J."' },
};
