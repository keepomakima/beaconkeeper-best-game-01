# Beaconkeeper — Last Light of the Ember Vale

A complete top-down arena survival game for make.fun best-game-01.
You are the keeper of the last lantern in a night vale. Shadows pour
in from the dark; your lantern beam banishes them, embers refuel it,
and the lantern itself must survive — crawlers chew it apart while
wisps hunt you. Hold 10 waves until dawn.

## How to play

- **WASD / arrows** — move
- **Mouse** — aim the beam
- **Hold click / Space** — fire the lantern beam (drains fuel)
- **Shift** — dash (brief burst, recharges)
- **P** — pause, **M** — mute
- **1 / 2 / 3 or click** — pick an upgrade after each cleared wave

## The loop

- 10 waves, each bigger and faster than the last; 3 shadow kinds
  (wisp, crawler, brute) with different targets and toughness.
- Shadows materialise through a violet telegraph ring (0.45 s) and
  cannot be burned until they arrive — no cheap spawn kills.
- Banishing a brute freezes the world for a hit-stop beat.
- Kills build a combo multiplier; embers drop fuel and score; brutes
  sometimes drop a heart. After each wave, choose 1 of 3 blessings
  from a pool of 8 (fuel, damage, speed, hearts, range, dash, magnet,
  lantern repair).
- Win at dawn after wave 10; lose if the keeper falls or the lantern
  is devoured. Best score is kept in localStorage.

## Feel and polish

- Deterministic fixed 60 Hz simulation (seeded PRNG): the same seed
  replays byte-identically, which the headless tests prove.
- Pooled particles, screen shake, floating score text, hurt flashes,
  spawn telegraphs, brute hit-stop.
- All sound is synthesised WebAudio at run time (shots, pickups, wave
  fanfares, a low ambient pad) — no audio files, no network.
- Screenshots are real renders of the game's own code, staged
  deterministically from `?shot=<scene>&seed=11` (see shots.json).

## Run it

```sh
node serve.ts        # then open http://localhost:8080
node --test tests/playthrough.test.mjs
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Structure

- `game/src/config.js` — every tuned number
- `game/src/random.js` — seeded PRNG and angle helpers
- `game/src/input.js` — keyboard + mouse
- `game/src/audio.js` — synthesised WebAudio sound
- `game/src/player.js` — the keeper (move, beam, dash, hearts, fuel)
- `game/src/enemies.js` — shadow kinds, telegraphs, targeting
- `game/src/waves.js` — wave plans and the upgrade choice
- `game/src/pickups.js` — embers and hearts
- `game/src/particles.js` — pooled particles, texts, shake
- `game/src/game.js` — state machine, beam, scoring, autopilot
- `game/src/render.js` — all canvas drawing and menus
- `game/src/shots.js` — deterministic screenshot scenes
- `game/src/main.js` — browser loop and `?test=1` hook

License: MIT.
