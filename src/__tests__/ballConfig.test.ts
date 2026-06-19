import { BALLS, SPAWN_LEVELS, MAX_LEVEL, getBall } from '../utils/ballConfig';

describe('ballConfig', () => {
  it('defines exactly 11 fruit levels 0..10', () => {
    expect(BALLS).toHaveLength(11);
    BALLS.forEach((b, i) => expect(b.level).toBe(i));
  });

  it('has strictly increasing radii', () => {
    for (let i = 1; i < BALLS.length; i++) {
      expect(BALLS[i]!.radius).toBeGreaterThan(BALLS[i - 1]!.radius);
    }
  });

  it('uses the canonical triangular score table', () => {
    expect(BALLS.map((b) => b.score)).toEqual([0, 1, 3, 6, 10, 15, 21, 28, 36, 45, 55]);
  });

  it('spawns only the first five fruits', () => {
    expect(SPAWN_LEVELS).toEqual([0, 1, 2, 3, 4]);
  });

  it('exposes MAX_LEVEL = 10 and getBall by level', () => {
    expect(MAX_LEVEL).toBe(10);
    expect(getBall(10).name).toBe('Watermelon');
  });

  it('gives every fruit a non-empty name and color', () => {
    BALLS.forEach((b) => {
      expect(b.name.length).toBeGreaterThan(0);
      expect(b.color).toMatch(/^#/);
    });
  });
});
