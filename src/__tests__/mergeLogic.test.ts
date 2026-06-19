import { getMergeResult, randomSpawnLevel } from '../utils/mergeLogic';

describe('getMergeResult', () => {
  it('merges two cherries (0) into a strawberry (1) for 1 point', () => {
    expect(getMergeResult(0)).toEqual({ nextLevel: 1, scoreGained: 1 });
  });

  it('merges two melons (8) into a level-9 fruit for 45 points', () => {
    expect(getMergeResult(8)).toEqual({ nextLevel: 9, scoreGained: 45 });
  });

  it('forms a watermelon (10) from two level-9 fruits for 55 points', () => {
    expect(getMergeResult(9)).toEqual({ nextLevel: 10, scoreGained: 55 });
  });

  it('returns null when two watermelons (10) touch — no further merge', () => {
    expect(getMergeResult(10)).toBeNull();
  });
});

describe('randomSpawnLevel', () => {
  it('always returns a spawnable level (0..4)', () => {
    for (let i = 0; i < 200; i++) {
      const lvl = randomSpawnLevel(() => Math.random());
      expect(lvl).toBeGreaterThanOrEqual(0);
      expect(lvl).toBeLessThanOrEqual(4);
    }
  });

  it('maps rng extremes to the ends of the spawn range', () => {
    expect(randomSpawnLevel(() => 0)).toBe(0);
    expect(randomSpawnLevel(() => 0.999999)).toBe(4);
  });
});
