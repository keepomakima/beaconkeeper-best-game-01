// Beaconkeeper — shared constants. One place for every number the game
// tunes: arena, keeper, beam, lantern, enemies, waves, scoring.
export const ARENA = { w: 1280, h: 720, wall: 26 };

export const KEEPER = {
  radius: 16,
  speed: 250,
  maxHearts: 3,
  maxFuel: 100,
  fuelDrain: 26, // per second of beam
  fuelRegen: 6, // per second while not beaming
  beamRange: 300,
  beamHalfAngle: 0.38, // radians either side of aim
  beamDps: 95,
  dashSpeed: 560,
  dashTime: 0.16,
  dashCooldown: 1.15,
  hurtIframes: 1.2,
  pickupRadius: 34,
};

export const LANTERN = {
  x: ARENA.w / 2,
  y: ARENA.h / 2,
  radius: 44,
  maxIntegrity: 140,
  lightRadius: 210,
};

export const WAVES = 10;

export const ENEMY_KINDS = {
  wisp: {
    name: 'wisp', radius: 13, hp: 34, speed: 118, damage: 1, score: 100,
    ember: 1, color: '#b78cff', glow: '#7a3cff', hunts: 'keeper',
  },
  crawler: {
    name: 'crawler', radius: 17, hp: 95, speed: 62, damage: 2, score: 150,
    ember: 2, color: '#ff9a5c', glow: '#c24e00', hunts: 'lantern',
  },
  brute: {
    name: 'brute', radius: 26, hp: 260, speed: 46, damage: 2, score: 400,
    ember: 4, color: '#ff5c7a', glow: '#a3002a', hunts: 'keeper', hitStop: 0.07,
  },
};

// Wave n (1-based): how many of each kind, and how fast they arrive.
export function wavePlan(n) {
  const wisps = 5 + 2 * n;
  const crawlers = n >= 2 ? 1 + n : 0;
  const brutes = n >= 3 ? Math.floor((n - 1) / 2) : 0;
  return { wisps, crawlers, brutes, spawnGap: Math.max(0.7, 1.5 - n * 0.1) };
}

export const UPGRADES = [
  { id: 'fuel', name: 'Deep Flask', desc: '+30 max fuel, refill 30', apply: (k) => { k.maxFuel += 30; k.fuel = Math.min(k.maxFuel, k.fuel + 30); } },
  { id: 'power', name: 'Bright Coil', desc: '+25% beam damage', apply: (k) => { k.beamDps *= 1.25; } },
  { id: 'swift', name: 'Wind Boots', desc: '+15% move speed', apply: (k) => { k.speed *= 1.15; } },
  { id: 'heart', name: 'Warm Hearth', desc: '+1 heart (max 5)', apply: (k) => { k.maxHearts = Math.min(5, k.maxHearts + 1); k.hearts = Math.min(k.maxHearts, k.hearts + 1); } },
  { id: 'reach', name: 'Long Wick', desc: '+60 beam range', apply: (k) => { k.beamRange += 60; } },
  { id: 'dash', name: 'Quick Step', desc: 'Dash recharges 30% faster', apply: (k) => { k.dashCooldown *= 0.7; } },
  { id: 'magnet', name: 'Ember Charm', desc: '+90 ember pickup radius', apply: (k) => { k.pickupRadius += 90; } },
  { id: 'mend', name: 'Lantern Mend', desc: 'Repair the lantern +45', apply: (k, g) => { g.lantern.integrity = Math.min(g.lantern.maxIntegrity, g.lantern.integrity + 45); } },
];
