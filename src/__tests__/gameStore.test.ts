import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGameStore } from '../store/gameStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const reset = () =>
  useGameStore.setState({
    score: 0, highScore: 0, nextLevel: 0, status: 'home', soundEnabled: true,
  });

beforeEach(async () => {
  await AsyncStorage.clear();
  reset();
});

describe('gameStore', () => {
  it('startGame moves to playing and zeroes the score', () => {
    useGameStore.setState({ score: 99, status: 'gameover' });
    useGameStore.getState().startGame();
    expect(useGameStore.getState().status).toBe('playing');
    expect(useGameStore.getState().score).toBe(0);
  });

  it('recordMerge adds to the score', () => {
    useGameStore.getState().startGame();
    useGameStore.getState().recordMerge(10);
    useGameStore.getState().recordMerge(5);
    expect(useGameStore.getState().score).toBe(15);
  });

  it('pause and resume toggle status', () => {
    useGameStore.getState().startGame();
    useGameStore.getState().pauseGame();
    expect(useGameStore.getState().status).toBe('paused');
    useGameStore.getState().resumeGame();
    expect(useGameStore.getState().status).toBe('playing');
  });

  it('endGame persists a new high score', async () => {
    useGameStore.getState().startGame();
    useGameStore.getState().setScore(120);
    await useGameStore.getState().endGame();
    expect(useGameStore.getState().status).toBe('gameover');
    expect(useGameStore.getState().highScore).toBe(120);
    expect(await AsyncStorage.getItem('suika.highScore')).toBe('120');
  });

  it('endGame keeps the old high score when not beaten', async () => {
    useGameStore.setState({ highScore: 200 });
    useGameStore.getState().startGame();
    useGameStore.getState().setScore(50);
    await useGameStore.getState().endGame();
    expect(useGameStore.getState().highScore).toBe(200);
  });

  it('loadHighScore hydrates from storage', async () => {
    await AsyncStorage.setItem('suika.highScore', '321');
    await useGameStore.getState().loadHighScore();
    expect(useGameStore.getState().highScore).toBe(321);
  });

  it('toggleSound flips and persists the flag', async () => {
    await useGameStore.getState().toggleSound();
    expect(useGameStore.getState().soundEnabled).toBe(false);
    expect(await AsyncStorage.getItem('suika.sound')).toBe('off');
  });
});
