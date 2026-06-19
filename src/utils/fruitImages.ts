import { Asset } from 'expo-asset';
import type { ImageSourcePropType } from 'react-native';

/**
 * When fruit PNGs arrive, add them here keyed by level, e.g.:
 *   0: require('../../assets/fruits/cherry.png'),
 * Leave a level out to use the colored-circle fallback.
 */
export const FRUIT_IMAGE_SOURCES: Partial<Record<number, ImageSourcePropType>> = {};

/**
 * Resolve fruit images to data URIs / URLs for injection into the canvas document.
 * Returns {} until assets are added, so the canvas uses its circle fallback.
 */
export async function loadFruitImageMap(): Promise<Record<number, string>> {
  const entries = Object.entries(FRUIT_IMAGE_SOURCES);
  const out: Record<number, string> = {};
  await Promise.all(
    entries.map(async ([level, src]) => {
      try {
        const asset = Asset.fromModule(src as number);
        await asset.downloadAsync();
        if (asset.uri) out[Number(level)] = asset.uri;
      } catch {
        /* fall back to circle */
      }
    }),
  );
  return out;
}
