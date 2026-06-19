import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGameStore } from '../store/gameStore';
import type { RootStackParamList } from '../../App';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const highScore = useGameStore((s) => s.highScore);
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const toggleSound = useGameStore((s) => s.toggleSound);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.body}>
        <Text style={styles.title}>🍉 Suika</Text>
        <Text style={styles.subtitle}>Merge the fruits!</Text>
        <Text style={styles.best}>Best: {highScore}</Text>

        <Pressable style={styles.play} onPress={() => navigation.navigate('Game')}>
          <Text style={styles.playText}>Play</Text>
        </Pressable>

        <Pressable style={styles.sound} onPress={() => toggleSound()}>
          <Text style={styles.soundText}>Sound: {soundEnabled ? 'On' : 'Off'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FDF6E3' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  title: { fontSize: 48, fontWeight: '900', color: '#5C4033' },
  subtitle: { fontSize: 18, color: '#B08968', marginBottom: 24 },
  best: { fontSize: 16, fontWeight: '700', color: '#5C4033', marginBottom: 24 },
  play: { backgroundColor: '#E2553B', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 64 },
  playText: { fontSize: 22, fontWeight: '800', color: '#fff' },
  sound: { paddingVertical: 10, paddingHorizontal: 24 },
  soundText: { fontSize: 15, fontWeight: '700', color: '#B08968' },
});
