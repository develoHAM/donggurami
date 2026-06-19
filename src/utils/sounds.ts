import { Audio } from 'expo-av';
import type { AVPlaybackSource } from 'expo-av';

/**
 * When sound files arrive, fill these in, e.g.:
 *   merge: require('../../assets/sounds/merge.mp3'),
 */
const SOURCES: Partial<Record<'merge' | 'drop' | 'gameover', AVPlaybackSource>> = {};

type Key = keyof typeof SOURCES;
const sounds: Partial<Record<Key, Audio.Sound>> = {};
let enabled = true;
let loaded = false;

export function setSoundEnabled(value: boolean): void {
  enabled = value;
}

export async function preloadSounds(): Promise<void> {
  if (loaded) return;
  loaded = true;
  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
  } catch {
    /* ignore */
  }
  await Promise.all(
    (Object.keys(SOURCES) as Key[]).map(async (key) => {
      const src = SOURCES[key];
      if (!src) return;
      try {
        const { sound } = await Audio.Sound.createAsync(src);
        sounds[key] = sound;
      } catch {
        /* skip missing */
      }
    }),
  );
}

export async function play(key: Key): Promise<void> {
  if (!enabled) return;
  const sound = sounds[key];
  if (!sound) return;
  try {
    await sound.replayAsync();
  } catch {
    /* ignore */
  }
}

export async function unloadSounds(): Promise<void> {
  await Promise.all(Object.values(sounds).map((s) => s?.unloadAsync().catch(() => {})));
}
