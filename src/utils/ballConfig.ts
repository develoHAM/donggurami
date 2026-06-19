export interface Ball {
  /** 0..10 */
  level: number;
  name: string;
  /** physics + draw radius in canvas px */
  radius: number;
  /** hex fill used for the fallback circle */
  color: string;
  /** points awarded for FORMING this fruit (triangular: level*(level+1)/2) */
  score: number;
  /** key into the fruit image map (assets added later) */
  imageKey: string;
}

const NAMES = [
  'Cherry', 'Strawberry', 'Grape', 'Dekopon', 'Persimmon',
  'Apple', 'Pear', 'Peach', 'Pineapple', 'Melon', 'Watermelon',
] as const;

const RADII = [15, 22, 30, 38, 46, 55, 64, 75, 86, 96, 108] as const;

const COLORS = [
  '#E23B3B', '#E2553B', '#9B5FC0', '#F4A93B', '#F4683B',
  '#D7263D', '#A7C957', '#F6BD60', '#E9C46A', '#88C057', '#2A9D3F',
] as const;

export const BALLS: Ball[] = NAMES.map((name, level) => ({
  level,
  name,
  radius: RADII[level]!,
  color: COLORS[level]!,
  score: (level * (level + 1)) / 2,
  imageKey: name.toLowerCase(),
}));

export const MAX_LEVEL = 10;
export const SPAWN_LEVELS = [0, 1, 2, 3, 4];

export function getBall(level: number): Ball {
  const ball = BALLS[level];
  if (!ball) throw new Error(`No ball for level ${level}`);
  return ball;
}
