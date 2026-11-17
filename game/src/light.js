// The light map: every tile's light level (0..3) is the strongest glow
// reaching it from any living plant. Chebyshev distance keeps the map
// readable: a plant of glow g lights every tile within g steps.
import { COLS, LANES } from './config.js';

// Recompute the whole map from the plant list. Called on plant / death /
// growth-stage change, and once at wave start — never per frame.
export function computeLight(plants) {
  const map = [];
  for (let lane = 0; lane < LANES; lane++) map.push(new Array(COLS).fill(0));
  for (const p of plants) {
    if (p.dead || p.stage === 0) continue; // sprouts cast no light yet
    const g = p.glow;
    for (let lane = Math.max(0, p.lane - g); lane <= Math.min(LANES - 1, p.lane + g); lane++) {
      for (let col = Math.max(0, p.col - g); col <= Math.min(COLS - 1, p.col + g); col++) {
        const d = Math.max(Math.abs(lane - p.lane), Math.abs(col - p.col));
        const level = Math.min(3, g - d + 1);
        if (level > map[lane][col]) map[lane][col] = level;
      }
    }
  }
  return map;
}

// Light level at a pixel position (for enemies walking between tiles).
export function lightAt(map, x, y, gardenX, gardenY, tile) {
  const col = Math.floor((x - gardenX) / tile);
  const lane = Math.floor((y - gardenY) / tile);
  if (lane < 0 || lane >= LANES || col < 0 || col >= COLS) return 0;
  return map[lane][col];
}
