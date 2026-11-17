# STARSEED ORCHARD — grow light, hold back the night

A best-game-01 entry ($1,000). A lane-defense garden game: plant
star-seeds, grow living light, and hold back the creatures of the dark
for ten waves. Written from scratch in this session — canvas 2D, plain
ES modules, no assets, no network. WebAudio synth sound, no files.

## The central idea — the light map

Every plant is a lamp. Each tile has a light level (0–3) from the
plants around it. Enemies standing in light **burn and slow down**;
enemies in darkness **regenerate and speed up**. So where you plant
matters as much as what you plant: you sculpt a map of light across
the garden, and the dark keeps trying to eat it back.

## How to play

- **Mouse:** click a seed card, then click a tile to plant. Click
  falling suns for +25. **1–8:** pick a seed. **F:** fuse mode —
  click a grown plant, then a seed, to graft a hybrid.
- **Space:** pause. **M:** mute. **C:** codex. **R:** restart.
- **Goal:** keep the Heart Tree alive (5 hearts) through 10 waves.
  Wave 5 brings the Hollow Moth (it dims the garden); wave 10 the
  Rootrot Titan (it crushes plants). Win, and the endless night opens.

## Systems

- **8 seeds** (Sunbloom, Thornspike, Emberpod, Frostberry, Barkwall,
  Sporeburst, Moonpetal, Starlance), each growing sprout → bloom →
  radiant, with its own glow radius.
- **8 fusions** — graft two grown plants into a hybrid (Frostfire Pod,
  Dawnspire, Bramblewall, Sunlance, Mistbloom, Minefield Thorn,
  Emberheart, Bastion Lance). First graft of each kind is recorded in
  the codex.
- **Draft & reroll** — after every wave, pick 1 of 3 boons (sun,
  discounts, hearts, instant growth, free fusion, wider glow); reroll
  costs sunlight and climbs each time.
- **3 difficulties** — Sprout (gentle), Bloom (the true night),
  Blight (merciless). Boss HP, enemy HP/speed and sun income scale.
- **7 enemies** — Mothling, Crawler, Brute, Spitter (shoots from
  range, keeps creeping), Burrower (dives underground), Swarm,
  Wisp (flies over plants) — plus 2 bosses and an endless mode.
- **Score** — kills × wave multiplier, wave-clear bonuses, hearts
  left and time bonus at the win. Best score is kept locally.

## Tests

`node --test tests/playthrough.test.mjs` (Node stdlib only):

- careful pilot wins Bloom on 8/8 seeds (scores ~77–87k, 8–11 min);
- careless pilot loses (random planting, no sun clicks);
- same seed replays identically (score, kills, ticks);
- fusion, light map and draft unit checks; all four shot scenes stage.

## Run it

`node serve.ts` → http://localhost:8080 — or open `game/index.html`
through any static server. `?test=1` exposes a read-only
`window.__gameTest` hook; `?shot=start|play|draft|win&seed=11`
stages a screenshot scene (`window.__shotReady` when painted).

## Files

- `game/index.html` — the page (canvas 1280×720).
- `game/src/` — one job per file: `config` (tuning tables), `random`
  (seeded PRNG), `light` (light map), `plants` (growth, fusion),
  `enemies` (7 kinds + bosses), `waves` (director), `draft` (boons),
  `particles`, `audio` (synth), `input`, `game` (the simulation +
  the careful/careless pilots), `render`, `shots`, `main` (bootstrap).
- `main.ts` — copies `game/` + `screenshots/` to the output and
  writes `dossier.json` with the vendored make.fun library.
- `tests/playthrough.test.mjs` — the headless tests above.
