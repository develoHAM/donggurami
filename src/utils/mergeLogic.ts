import { MAX_LEVEL, SPAWN_LEVELS, getBall } from './ballConfig';

export interface MergeResult {
  nextLevel: number;
  scoreGained: number;
}

/**
 * Result of two fruits of `level` touching.
 * Returns null at MAX_LEVEL (watermelons do not merge).
 */
export function getMergeResult(level: number): MergeResult | null {
  if (level >= MAX_LEVEL) return null;
  const nextLevel = level + 1;
  return { nextLevel, scoreGained: getBall(nextLevel).score };
}

/** Pick a spawnable fruit level. `rng` defaults to Math.random; injectable for tests. */
export function randomSpawnLevel(rng: () => number = Math.random): number {
  const idx = Math.min(SPAWN_LEVELS.length - 1, Math.floor(rng() * SPAWN_LEVELS.length));
  return SPAWN_LEVELS[idx]!;
}
