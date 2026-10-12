// Master palette. Single-character keys are used by sprite grids ('.' = transparent).
export const PAL = {
  k: '#0d0b14', K: '#1c1a2b', q: '#2e2c40', Q: '#4a4860', h: '#7a7890', H: '#b8b6c8', w: '#f2f0e6', W: '#ffffff',
  r: '#9e2a3c', R: '#e0485e', o: '#c25a1e', O: '#f08a3c', y: '#d9a53a', Y: '#ffe08a',
  g: '#2f7a46', G: '#5cc070', l: '#a6e07a', t: '#1f5f6a', T: '#2f9aa8', c: '#5ee0e8', C: '#b8f6f8',
  b: '#24376e', B: '#4a74d6', u: '#8fb0ff', p: '#4e2c78', P: '#9a5ad8', v: '#d4a0ff', m: '#b83a84', M: '#f07ab8',
  n: '#4a2e22', N: '#7a4e32', j: '#b07a4a', J: '#dcb07a', s: '#f2c8a0', S: '#c8906a', d: '#8a5a3e', e: '#5a3626',
  x: '#3a3428', X: '#6a5e48', z: '#2a2236', Z: '#3e3450',
};

export const hex = (k) => parseInt(PAL[k].slice(1), 16);

// Per-sector visual themes: floor, alt floor, wall top, wall face, trim, accent, battle sky.
export const THEMES = {
  lobby:   { floor: ['#3a3450', '#342e48'], alt: ['#5a3a3a', '#4e3232'], wallTop: '#1c1a2b', wallFace: '#6a6488', trim: '#8a84a8', accent: '#f08a3c', sky: ['#1a1430', '#3a2050'] },
  labs:    { floor: ['#2e4a4a', '#284242'], alt: ['#3a5a52', '#34524a'], wallTop: '#15232a', wallFace: '#4e7a7e', trim: '#7ab0b0', accent: '#5ee0e8', sky: ['#0c1e24', '#1e4048'] },
  servers: { floor: ['#262c40', '#21263a'], alt: ['#30384e', '#2a3146'], wallTop: '#0e1020', wallFace: '#3e4a72', trim: '#6a80c0', accent: '#4a74d6', sky: ['#080c1c', '#1a2850'] },
  archive: { floor: ['#4a3a2a', '#423324'], alt: ['#5a2e2e', '#502828'], wallTop: '#1e140e', wallFace: '#7a5a3e', trim: '#b08a5a', accent: '#dcb07a', sky: ['#1a1008', '#40281a'] },
  tunnels: { floor: ['#33302a', '#2d2a24'], alt: ['#3e3a30', '#38342a'], wallTop: '#141210', wallFace: '#5a5040', trim: '#8a7a58', accent: '#d9a53a', sky: ['#100c08', '#2e2416'] },
  core:    { floor: ['#1e1426', '#1a1020'], alt: ['#2a1a34', '#24162e'], wallTop: '#0a0610', wallFace: '#4e2c78', trim: '#9a5ad8', accent: '#e0485e', sky: ['#0a0410', '#3a0c28'] },
  void:    { floor: ['#101018', '#0c0c12'], alt: ['#16161f', '#121219'], wallTop: '#000000', wallFace: '#2a2a38', trim: '#4a4a60', accent: '#ffffff', sky: ['#000000', '#141420'] },
};
