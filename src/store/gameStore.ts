import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

export type GameStatus = 'home' | 'playing' | 'paused' | 'gameover';

const HIGH_SCORE_KEY = 'suika.highScore';
const SOUND_KEY = 'suika.sound';

interface GameState {
  score: number;
  highScore: number;
  nextLevel: number;
  status: GameStatus;
  soundEnabled: boolean;

  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: () => Promise<void>;
  setScore: (value: number) => void;
  setNext: (level: number) => void;
  recordMerge: (points: number) => void;
  resetGame: () => void;
  loadHighScore: () => Promise<void>;
  toggleSound: () => Promise<void>;
}

export const useGameStore = create<GameState>((set, get) => ({
  score: 0,
  highScore: 0,
  nextLevel: 0,
  status: 'home',
  soundEnabled: true,

  startGame: () => set({ status: 'playing', score: 0 }),
  pauseGame: () => set({ status: 'paused' }),
  resumeGame: () => set({ status: 'playing' }),

  endGame: async () => {
    const { score, highScore } = get();
    const nextHigh = Math.max(score, highScore);
    set({ status: 'gameover', highScore: nextHigh });
    if (nextHigh > highScore) {
      await AsyncStorage.setItem(HIGH_SCORE_KEY, String(nextHigh));
    }
  },

  setScore: (value) => set({ score: value }),
  setNext: (level) => set({ nextLevel: level }),
  recordMerge: (points) => set((s) => ({ score: s.score + points })),
  resetGame: () => set({ status: 'home', score: 0 }),

  loadHighScore: async () => {
    const [hs, sound] = await Promise.all([
      AsyncStorage.getItem(HIGH_SCORE_KEY),
      AsyncStorage.getItem(SOUND_KEY),
    ]);
    set({
      highScore: hs ? Number(hs) : 0,
      soundEnabled: sound !== 'off',
    });
  },

  toggleSound: async () => {
    const next = !get().soundEnabled;
    set({ soundEnabled: next });
    await AsyncStorage.setItem(SOUND_KEY, next ? 'on' : 'off');
  },
}));
