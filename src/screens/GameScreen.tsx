import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GameCanvas } from '../components/GameCanvas';
import type { GameCanvasHandle, GameEvent } from '../components/GameCanvas.types';
import { GameOverModal } from '../components/GameOverModal';
import { NextBall } from '../components/NextBall';
import { PauseModal } from '../components/PauseModal';
import { ScoreBoard } from '../components/ScoreBoard';
import { useGameStore } from '../store/gameStore';
import { loadFruitImageMap } from '../utils/fruitImages';
import { buildGameHtml } from '../utils/gameHtml';
import { play, preloadSounds, setSoundEnabled } from '../utils/sounds';
import type { RootStackParamList } from '../../App';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function GameScreen() {
  const navigation = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  const canvasWidth = Math.min(360, width);
  const canvasHeight = Math.round(canvasWidth * (580 / 360));

  const [html, setHtml] = useState<string | null>(null);
  const canvasRef = useRef<GameCanvasHandle>(null);

  const score = useGameStore((s) => s.score);
  const highScore = useGameStore((s) => s.highScore);
  const nextLevel = useGameStore((s) => s.nextLevel);
  const status = useGameStore((s) => s.status);
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const { startGame, pauseGame, resumeGame, endGame, setScore, setNext } = useGameStore.getState();

  // Build the canvas document once (with whatever fruit images resolve).
  useEffect(() => {
    let alive = true;
    (async () => {
      const images = await loadFruitImageMap();
      if (alive) setHtml(buildGameHtml({ width: canvasWidth, height: canvasHeight, images }));
    })();
    return () => { alive = false; };
  }, [canvasWidth, canvasHeight]);

  useEffect(() => { setSoundEnabled(soundEnabled); }, [soundEnabled]);
  useEffect(() => { preloadSounds(); startGame(); }, [startGame]);

  const onEvent = useCallback(
    (e: GameEvent) => {
      switch (e.type) {
        case 'ready':
          break;
        case 'next':
          setNext(e.level);
          break;
        case 'drop':
          play('drop');
          break;
        case 'merge':
          // The engine's authoritative 'score' event (handled below) is the sole
          // score writer; 'merge' only drives feedback.
          play('merge');
          if (Platform.OS !== 'web') {
            const strength = e.level >= 7 ? Haptics.ImpactFeedbackStyle.Heavy
              : e.level >= 4 ? Haptics.ImpactFeedbackStyle.Medium
              : Haptics.ImpactFeedbackStyle.Light;
            Haptics.impactAsync(strength).catch(() => {});
          }
          break;
        case 'score':
          setScore(e.value);
          break;
        case 'gameover':
          play('gameover');
          endGame();
          break;
      }
    },
    [setScore, setNext, endGame],
  );

  const handlePause = () => { canvasRef.current?.pause(); pauseGame(); };
  const handleResume = () => { canvasRef.current?.resume(); resumeGame(); };
  const handleRestart = () => { canvasRef.current?.restart(); setScore(0); startGame(); };
  const handleHome = () => navigation.navigate('Home');

  const canvas = useMemo(() => {
    if (!html) return null;
    return (
      <GameCanvas
        ref={canvasRef}
        html={html}
        width={canvasWidth}
        height={canvasHeight}
        onEvent={onEvent}
      />
    );
  }, [html, canvasWidth, canvasHeight, onEvent]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <ScoreBoard score={score} highScore={highScore} />
        <View style={styles.headerRight}>
          <NextBall level={nextLevel} />
          <Pressable style={styles.pauseBtn} onPress={handlePause} accessibilityLabel="Pause">
            <Text style={styles.pauseIcon}>II</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.canvasWrap, { width: canvasWidth, height: canvasHeight }]}>{canvas}</View>

      <PauseModal
        visible={status === 'paused'}
        onResume={handleResume}
        onRestart={handleRestart}
        onHome={handleHome}
      />
      <GameOverModal
        visible={status === 'gameover'}
        score={score}
        highScore={highScore}
        onRetry={handleRestart}
        onHome={handleHome}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FDF6E3', alignItems: 'center' },
  header: { width: '100%', maxWidth: 360, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 12 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pauseBtn: { backgroundColor: '#fff', borderRadius: 12, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pauseIcon: { fontSize: 18, fontWeight: '900', color: '#5C4033', letterSpacing: 2 },
  canvasWrap: { borderRadius: 8, overflow: 'hidden', borderWidth: 3, borderColor: '#EADBC8' },
});
