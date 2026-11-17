// STARSEED ORCHARD — tuning tables. Every number the balance tests
// exercise lives here, so a tuning pass touches one file only.
export const TILE = 106; // px per garden tile
export const COLS = 9;
export const LANES = 5;
export const GARDEN_X = 178; // left edge of column 0
export const GARDEN_Y = 96; // top edge of lane 0
export const W = 1280;
export const H = 720;

export const DIFFICULTY = {
  sprout: { label: 'Sprout', desc: 'Gentle night — learn the garden', hp: 0.8, speed: 0.9, sun: 1.25, bossHp: 0.8, scoreMult: 0.8 },
  bloom: { label: 'Bloom', desc: 'The true night — fair and winnable', hp: 1.0, speed: 1.0, sun: 1.0, bossHp: 1.0, scoreMult: 1.0 },
  blight: { label: 'Blight', desc: 'Merciless dark — for master keepers', hp: 1.35, speed: 1.15, sun: 0.9, bossHp: 1.5, scoreMult: 1.5 },
};
export const DIFFICULTY_ORDER = ['sprout', 'bloom', 'blight'];

// Sun economy
export const SUN_START = 150;
export const SKY_SUN_EVERY = 6; // seconds between sky suns
export const SKY_SUN_VALUE = 20;
export const SKY_SUN_CLICK_BONUS = 25; // extra when clicked before landing
export const SKY_SUN_FADE = 9; // seconds a landed sun waits before auto-collect

// Growth stages: sprout (50% stats) -> bloom (full) -> radiant (+50% dmg, +1 glow)
export const GROW_SPROUT_S = 10;
export const GROW_RADIANT_S = 55;

// Light: burn dps per light level, slow per level, dark regen / speed bonus.
export const LIGHT_BURN_DPS = 9;
export const LIGHT_SLOW = 0.1;
export const DARK_REGEN_DPS = 9;
export const DARK_SPEED_BONUS = 0.15;

// Base seeds. glow = light radius in tiles (Chebyshev). range in tiles.
// cost is reduced by draft boons (discounts stack to -50%).
export const SEEDS = {
  sunbloom: { name: 'Sunbloom', key: '1', cost: 50, cd: 4, hp: 300, glow: 1, sunEvery: 8, sunValue: 25, color: '#ffd94d', desc: 'Grows sunlight. +25 sun every 8s.' },
  thornspike: { name: 'Thornspike', key: '2', cost: 100, cd: 5, hp: 420, glow: 1, dmg: 22, rate: 0.8, melee: true, color: '#8be04e', desc: 'Thorns slash neighbours every 0.8s.' },
  emberpod: { name: 'Emberpod', key: '3', cost: 100, cd: 5, hp: 350, glow: 1, dmg: 26, rate: 1.6, range: 6, color: '#ff9a3d', desc: 'Spits burning seeds down its lane.' },
  frostberry: { name: 'Frostberry', key: '4', cost: 75, cd: 5, hp: 320, glow: 1, slow: 0.4, slowRange: 3, color: '#7dd7ff', desc: 'Chills its lane: foes 40% slower.' },
  barkwall: { name: 'Barkwall', key: '5', cost: 50, cd: 6, hp: 950, glow: 0, color: '#c98f5a', desc: 'A stubborn wall. No light, all bark.' },
  sporeburst: { name: 'Sporeburst', key: '6', cost: 25, cd: 3, hp: 150, glow: 0, boom: 130, boomRadius: 1, color: '#d97bff', desc: 'Mine. Explodes when stepped on.' },
  moonpetal: { name: 'Moonpetal', key: '7', cost: 125, cd: 6, hp: 350, glow: 2, heal: 16, color: '#e8e6ff', desc: 'Heals neighbours 16 HP/s. Wide glow.' },
  starlance: { name: 'Starlance', key: '8', cost: 175, cd: 7, hp: 420, glow: 2, dmg: 65, rate: 3.0, pierce: true, color: '#fff3a0', desc: 'A lance of starlight pierces its lane.' },
};
export const SEED_ORDER = ['sunbloom', 'thornspike', 'emberpod', 'frostberry', 'barkwall', 'sporeburst', 'moonpetal', 'starlance'];

// Fusions: plant seed B onto a grown plant of kind A (cost = seed B cost).
// The hybrid keeps the better HP of the two and merges their powers.
export const FUSIONS = {
  'emberpod+frostberry': { kind: 'frostfire', name: 'Frostfire Pod', desc: 'Burning seeds that chill: 32 dmg + 30% slow.', glow: 1, hp: 380, dmg: 32, rate: 1.6, range: 6, slow: 0.3 },
  'sunbloom+moonpetal': { kind: 'dawnspire', name: 'Dawnspire', desc: 'A small sun: +40 sun/8s, heals, wide glow.', glow: 3, hp: 400, sunEvery: 8, sunValue: 40, heal: 16 },
  'thornspike+barkwall': { kind: 'bramblewall', name: 'Bramblewall', desc: 'A wall with thorns: 1500 HP, slashes 32/0.8s.', glow: 1, hp: 1500, dmg: 32, rate: 0.8, melee: true },
  'emberpod+starlance': { kind: 'sunlance', name: 'Sunlance', desc: 'Pierces its lane every 2s for 85 dmg.', glow: 2, hp: 450, dmg: 85, rate: 2.0, pierce: true },
  'frostberry+moonpetal': { kind: 'mistbloom', name: 'Mistbloom', desc: 'Mist slows the whole garden 20% and heals.', glow: 2, hp: 380, slowAll: 0.2, heal: 16 },
  'thornspike+sporeburst': { kind: 'minefield', name: 'Minefield Thorn', desc: 'Slashes neighbours; explodes for 110 on death.', glow: 1, hp: 450, dmg: 22, rate: 0.8, melee: true, boomOnDeath: 110 },
  'sunbloom+emberpod': { kind: 'emberheart', name: 'Emberheart', desc: 'Grows sun (+30/8s) and spits fire (26 dmg).', glow: 1, hp: 380, sunEvery: 8, sunValue: 30, dmg: 26, rate: 1.6, range: 6 },
  'starlance+barkwall': { kind: 'bastion', name: 'Bastion Lance', desc: '1500 HP wall that pierces its lane (65/3s).', glow: 2, hp: 1500, dmg: 65, rate: 3.0, pierce: true },
};
export const FUSION_LIST = Object.entries(FUSIONS).map(([pair, def]) => ({ pair, ...def }));

// Enemies. speed px/s. bite = damage per bite to a plant (1 bite/s).
// flying: immune to melee + mines. burrower: dives underground for a while.
export const ENEMIES = {
  mothling: { name: 'Mothling', hp: 130, speed: 22, bite: 10, score: 100, color: '#b78cff', radius: 14 },
  crawler: { name: 'Crawler', hp: 75, speed: 44, bite: 6, score: 60, color: '#ff7d9c', radius: 11 },
  brute: { name: 'Brute', hp: 620, speed: 13, bite: 26, score: 300, color: '#ff5d5d', radius: 20 },
  spitter: { name: 'Spitter', hp: 150, speed: 18, bite: 8, score: 150, color: '#7dff8a', radius: 13, ranged: true, boltDmg: 20, boltEvery: 2.5, boltRange: 2.5 },
  burrower: { name: 'Burrower', hp: 170, speed: 26, bite: 12, score: 180, color: '#c9a06a', radius: 13, burrows: true },
  swarm: { name: 'Swarm', hp: 45, speed: 33, bite: 4, score: 50, color: '#ffd166', radius: 8, count: 3 },
  wisp: { name: 'Wisp', hp: 95, speed: 38, bite: 8, score: 120, color: '#aef3ff', radius: 10, flying: true },
};

// Wave composition: points budget + fixed roster. A wave spawns its roster
// over its duration; the budget adds filler mothlings/crawlers.
export const WAVES = [
  { budget: 3, roster: [['mothling', 4]] },
  { budget: 5, roster: [['mothling', 6], ['crawler', 2]] },
  { budget: 7, roster: [['mothling', 6], ['crawler', 4], ['swarm', 1]] },
  { budget: 9, roster: [['mothling', 6], ['crawler', 4], ['brute', 1], ['swarm', 2]] },
  { budget: 0, roster: [], boss: 'hollow' },
  { budget: 11, roster: [['mothling', 8], ['crawler', 5], ['brute', 2], ['spitter', 2], ['wisp', 2]] },
  { budget: 13, roster: [['mothling', 8], ['crawler', 6], ['brute', 2], ['spitter', 3], ['burrower', 2], ['wisp', 3]] },
  { budget: 15, roster: [['mothling', 10], ['crawler', 6], ['brute', 3], ['spitter', 3], ['burrower', 3], ['swarm', 3], ['wisp', 3]] },
  { budget: 17, roster: [['mothling', 10], ['crawler', 8], ['brute', 4], ['spitter', 4], ['burrower', 3], ['swarm', 4], ['wisp', 4]] },
  { budget: 0, roster: [], boss: 'rootrot' },
];
export const WAVE_SPAWN_INTERVAL = 0.7; // seconds between spawns (shrinks per wave)
export const WAVE_CLEAR_BONUS = 100; // sun bonus on wave clear

export const BOSSES = {
  hollow: { name: 'Hollow Moth', hp: 2800, speed: 14, bite: 30, score: 5000, radius: 34, color: '#d9b8ff', dimEvery: 9, dimRadius: 3, spawnEvery: 14, spawnKind: 'mothling', spawnCount: 3 },
  rootrot: { name: 'Rootrot Titan', hp: 5800, speed: 10, bite: 40, score: 10000, radius: 44, color: '#8a6d4b', crushEvery: 4, spawnEvery: 12, spawnKind: 'crawler', spawnCount: 2 },
};

// Draft boons offered after each wave (3 drawn, pick 1; reroll costs sun).
export const BOONS = [
  { id: 'sun', name: '+150 Sunlight', desc: 'A burst of morning light. +150 sun now.' },
  { id: 'discount', name: 'Seed Bargain', desc: 'One random seed costs 25% less, forever.' },
  { id: 'heart', name: 'Heartwood', desc: 'The Heart Tree grows a heart. +1 heart (max 7).' },
  { id: 'grow', name: 'Dawn Bloom', desc: 'Every plant grows one stage at once.' },
  { id: 'fusion', name: 'Grafting Charm', desc: 'Your next fusion is free.' },
  { id: 'glow', name: 'Bright Roots', desc: 'Every Sunbloom glows one tile further.' },
  { id: 'roots', name: 'Deep Roots', desc: 'Every plant gains +150 max health, now and later.' },
  { id: 'thornmail', name: 'Thornmail', desc: 'Attackers take 8 damage whenever they bite a plant.' },
  { id: 'meteor', name: 'Meteor Call', desc: 'A meteor strikes the next wave: all foes take 150 damage.' },
];
export const REROLL_BASE = 25;
