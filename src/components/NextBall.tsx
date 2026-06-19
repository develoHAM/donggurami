import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { getBall } from '../utils/ballConfig';
import { FRUIT_IMAGE_SOURCES } from '../utils/fruitImages';

interface Props {
  level: number;
}

export function NextBall({ level }: Props) {
  const ball = getBall(level);
  const source = FRUIT_IMAGE_SOURCES[level];
  const size = 44;
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>NEXT</Text>
      {source ? (
        <Image source={source} style={{ width: size, height: size }} resizeMode="contain" />
      ) : (
        <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: ball.color }]}>
          <Text style={styles.num}>{level + 1}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 8 },
  label: { fontSize: 11, fontWeight: '700', color: '#B08968', letterSpacing: 1, marginBottom: 4 },
  circle: { alignItems: 'center', justifyContent: 'center' },
  num: { color: 'rgba(255,255,255,0.95)', fontWeight: '800' },
});
