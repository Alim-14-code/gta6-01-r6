// Harbor Lights — shared constants: city layout, palette, tuning, story.
// A dusk-lit harbor city of three islands joined by bridges.
export const WORLD = {
  width: 3840,
  height: 2560,
  tile: 160, // one city block edge, in world pixels
};

export const ISLANDS = [
  // Palmetto Cay — downtown, north island
  { name: 'Palmetto Cay', x: 240, y: 160, w: 1600, h: 880, hue: 'downtown' },
  // Marina Key — harbor island, middle, docks on its east shore
  { name: 'Marina Key', x: 240, y: 1200, w: 1600, h: 800, hue: 'marina' },
  // Sunset Isle — beachfront, south island, lighthouse at its tip
  { name: 'Sunset Isle', x: 240, y: 2160, w: 1600, h: 320, hue: 'beach' },
];

// Bridges join the islands north-south at x = 960 (west) and x = 1440 (east).
export const BRIDGES = [
  { x: 960, y0: 1040, y1: 1200, name: 'Palmetto Bridge' },
  { x: 1440, y0: 1040, y1: 1200, name: 'Cay Bridge' },
  { x: 960, y0: 2000, y1: 2160, name: 'Marina Bridge' },
  { x: 1440, y0: 2000, y1: 2160, name: 'Sunset Bridge' },
];

export const PALETTE = {
  water: '#16324a',
  waterDeep: '#0e2233',
  sand: '#c9a86a',
  grass: '#3d6b35',
  road: '#2e2f38',
  roadLine: '#d8c25a',
  sidewalk: '#5a5f6b',
  bridge: '#4a4238',
  buildingRoof: ['#7a4a3a', '#4a5a7a', '#6b5a8a', '#8a6b4a', '#3a6b5a', '#94555a'],
  buildingEdge: '#241f1c',
  dock: '#6b4a2a',
  lighthouse: '#e8e0d0',
  playerCar: '#ff5a3c',
  copCar: '#2a5aff',
  heli: '#20242c',
};

export const TUNING = {
  walkSpeed: 170,
  carAccel: 420,
  carBrake: 700,
  carMaxSpeed: 520,
  carReverseMax: 180,
  carTurn: 2.6,
  carDrag: 0.6,
  copAccel: 460,
  copMaxSpeed: 540,
  trafficCount: 14,
  pedCount: 26,
  wantedDecaySeconds: 9,
  heliAtStars: 4,
  roadblockAtStars: 3,
};

export const STORY = {
  hero: 'Kai Marlin',
  crew: 'Harbor Lights crew',
  intro:
    'Dusk over Port Alegre. Kai Marlin is back in town with one fast car, no cash, and a crew that owes the harbor boss. Six jobs stand between Kai and a clean slate.',
};

// Six story missions, in order. Each: id, title, briefing, target point, reward.
export const MISSIONS = [
  {
    id: 1, title: 'First Delivery', reward: 250,
    brief: 'Pick up the parcel at the Palmetto docks and drop it at the boulevard cafe. No cops, no fuss.',
    target: { x: 1560, y: 420 }, pickup: { x: 420, y: 900 }, timed: 0,
  },
  {
    id: 2, title: 'Dockside Chase', reward: 400,
    brief: 'The harbor boss wants his ledger back. Chase the courier van across Marina Key and ram it to a stop.',
    target: { x: 1500, y: 1500 }, pickup: null, timed: 0, chase: true,
  },
  {
    id: 3, title: 'Lighthouse Run', reward: 500,
    brief: 'Race the sunset: reach the lighthouse on Sunset Isle before the timer runs out. Bridges are your friends.',
    target: { x: 1680, y: 2300 }, pickup: null, timed: 75,
  },
  {
    id: 4, title: 'Quiet Tail', reward: 550,
    brief: 'Tail the grey sedan through downtown without being spotted. Stay back, stay calm, stay out of sight.',
    target: { x: 700, y: 500 }, pickup: null, timed: 0, tail: true,
  },
  {
    id: 5, title: 'Getaway', reward: 700,
    brief: 'The job went loud. Lose a 3-star wanted level, then reach the safehouse on Marina Key.',
    target: { x: 500, y: 1600 }, pickup: null, timed: 0, getaway: true,
  },
  {
    id: 6, title: 'Harbor Heist', reward: 1200,
    brief: 'One last job: lift the strongbox from the marina warehouse and bring it to the lighthouse. The whole harbor will be watching.',
    target: { x: 1680, y: 2300 }, pickup: { x: 1560, y: 1450 }, timed: 150,
  },
];

export const SAVE_KEY = 'harbor-lights-save-v1';
// Harbor Lights — recorded build touch
