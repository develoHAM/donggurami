import type { StyleProp, ViewStyle } from 'react-native';

export type GameEvent =
  | { type: 'ready' }
  | { type: 'drop'; level: number }
  | { type: 'merge'; level: number; score: number }
  | { type: 'score'; value: number }
  | { type: 'next'; level: number }
  | { type: 'gameover'; score: number };

export interface GameCanvasHandle {
  pause: () => void;
  resume: () => void;
  restart: () => void;
}

export interface GameCanvasProps {
  html: string;
  width: number;
  height: number;
  onEvent: (e: GameEvent) => void;
  style?: StyleProp<ViewStyle>;
}
