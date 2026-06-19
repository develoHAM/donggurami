import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

interface Props {
  visible: boolean;
  score: number;
  highScore: number;
  onRetry: () => void;
  onHome: () => void;
}

export function GameOverModal({ visible, score, highScore, onRetry, onHome }: Props) {
  const isBest = score >= highScore && score > 0;
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Game Over</Text>
          {isBest && <Text style={styles.best}>New Best!</Text>}
          <Text style={styles.score}>{score}</Text>
          <Text style={styles.sub}>Best: {highScore}</Text>
          <Pressable style={[styles.btn, styles.btnPrimary]} onPress={onRetry}>
            <Text style={[styles.btnText, styles.btnTextPrimary]}>Play Again</Text>
          </Pressable>
          <Pressable style={styles.btn} onPress={onHome}>
            <Text style={styles.btnText}>Home</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: '#FFF7EC', borderRadius: 20, padding: 24, width: 280, gap: 8, alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: '#5C4033' },
  best: { fontSize: 14, fontWeight: '800', color: '#E2553B' },
  score: { fontSize: 48, fontWeight: '900', color: '#E2553B' },
  sub: { fontSize: 14, color: '#B08968', marginBottom: 12 },
  btn: { backgroundColor: '#EADBC8', borderRadius: 12, paddingVertical: 12, alignItems: 'center', alignSelf: 'stretch' },
  btnPrimary: { backgroundColor: '#E2553B' },
  btnText: { fontSize: 16, fontWeight: '700', color: '#5C4033' },
  btnTextPrimary: { color: '#fff' },
});
