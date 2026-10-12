// Room registry + sector list.
import s1 from './s1_lobby.js';
import s2 from './s2_labs.js';
import s3 from './s3_servers.js';
import s4 from './s4_archive.js';
import s5 from './s5_tunnels.js';
import s6 from './s6_core.js';
import s7 from './s7_void.js';

export const ROOMS = { ...s1, ...s2, ...s3, ...s4, ...s5, ...s6, ...s7 };

export const SECTORS = [
  { id: 'lobby', name: 'Lobby & Commons', hour: '2 AM' },
  { id: 'labs', name: 'Intro Labs', hour: '3 AM' },
  { id: 'servers', name: 'Server Room', hour: '4 AM' },
  { id: 'archive', name: 'Thesis Archive', hour: '5 AM' },
  { id: 'tunnels', name: 'Steam Tunnels', hour: '6 AM' },
  { id: 'core', name: 'The Basement', hour: '7 AM' },
  { id: 'void', name: 'Room 404', hour: '??' },
];
