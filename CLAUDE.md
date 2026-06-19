@AGENTS.md

# Suika Game Clone

A web-first Suika (Watermelon) game built on Expo. Drop fruits; two equal fruits that
touch merge into the next bigger one; the game ends when fruits overflow the top.

## Run

- Web (primary): `npm run web`
- Native later: `npm run ios` / `npm run android`
- Tests: `npm test` · Typecheck: `npm run typecheck`

## Architecture

- **Canvas document** (`src/utils/gameHtml.ts`): a self-contained HTML doc running
  Matter.js physics + Canvas rendering + Pointer-Event input. It is the game authority.
- **GameCanvas host** (`src/components/GameCanvas.web.tsx` / `.native.tsx`): embeds the
  document — an `<iframe>` on web, `react-native-webview` on native. Same HTML, same
  JSON message protocol; only the host glue differs. `GameCanvas.tsx` is a TypeScript
  barrel so `import { GameCanvas } from './GameCanvas'` type-checks; Metro picks the
  platform file at runtime (`.web.tsx` on web, `.native.tsx` on native).
- **Bridge protocol**: canvas → shell events `ready | drop | merge | score | next | gameover`;
  shell → canvas commands `pause() | resume() | restart()`.
- **State** (`src/store/gameStore.ts`): Zustand — score, highScore, nextLevel, status,
  soundEnabled. High score + sound flag persist via AsyncStorage.
- **Pure logic** (`src/utils/ballConfig.ts`, `mergeLogic.ts`): fruit table + merge rules,
  shared by React and the canvas, unit-tested under `src/__tests__/`.

## Adding assets

- **Fruit images**: drop PNGs in `assets/fruits/`, then map them by level in
  `src/utils/fruitImages.ts` (`FRUIT_IMAGE_SOURCES`). Missing levels fall back to a
  colored circle automatically.
- **Sounds**: drop files in `assets/sounds/`, then map them in `src/utils/sounds.ts`
  (`SOURCES`). Missing sounds are silently skipped.

## Conventions

- TypeScript strict. Keep physics inside the canvas document; the React side only
  reacts to bridge events. Import the canvas host as `./GameCanvas` (Metro picks the
  platform file).
