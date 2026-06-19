import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface Props {
  score: number;
  highScore: number;
}

export function ScoreBoard({ score, highScore }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.box}>
        <Text style={styles.label}>SCORE</Text>
        <Text style={styles.value}>{score}</Text>
      </View>
      <View style={styles.box}>
        <Text style={styles.label}>BEST</Text>
        <Text style={styles.value}>{highScore}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  box: { backgroundColor: '#fff', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 18, alignItems: 'center', minWidth: 96 },
  label: { fontSize: 11, fontWeight: '700', color: '#B08968', letterSpacing: 1 },
  value: { fontSize: 24, fontWeight: '800', color: '#5C4033' },
});
