# Suika Game Clone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web-first Suika (Watermelon) game clone — drop fruits, merge equal fruits into bigger ones, score, and end on overflow — on an Expo codebase that later builds into a native app unchanged.

**Architecture:** All physics, rendering, and input live in one self-contained HTML canvas document (Matter.js + Canvas + Pointer Events). A thin platform-split host (`GameCanvas.web.tsx` = iframe, `GameCanvas.native.tsx` = react-native-webview) embeds that document and relays a small JSON message protocol. React owns navigation, score UI, persistence, sound, and haptics via a Zustand store. Pure game data/logic (`ballConfig`, `mergeLogic`) is shared by both the React side and the canvas document and is unit-tested.

**Tech Stack:** Expo (latest SDK), React Native + react-native-web, TypeScript (strict), Matter.js, Zustand, react-native-webview, expo-av, expo-haptics, expo-asset, AsyncStorage, React Navigation native-stack, Jest (jest-expo).

**Reference spec:** `docs/superpowers/specs/2026-06-19-suika-game-clone-design.md`

---

## File Structure

```
App.tsx                              Navigation root + high-score hydration
CLAUDE.md                            Project guide
app.json                             Expo config (portrait, name)
cspell.json                          (exists) project word list
src/
  store/
    gameStore.ts                     Zustand store (score/highScore/nextLevel/status/sound)
  utils/
    ballConfig.ts                    11 fruit definitions + spawn set (pure)
    mergeLogic.ts                    getMergeResult (pure)
    gameHtml.ts                      Builds the self-contained canvas document
    sounds.ts                        expo-av wrapper (load/play/no-op)
    fruitImages.ts                   Fruit image asset map + loader (fallback-aware)
    vendor/
      matterMin.ts                   AUTO-GENERATED vendored Matter.js source string
  components/
    GameCanvas.types.ts              Shared GameEvent/handle/props types
    GameCanvas.web.tsx               iframe host (web)
    GameCanvas.native.tsx            WebView host (native)
    ScoreBoard.tsx                   Current + best score
    NextBall.tsx                     Upcoming fruit preview (image/fallback)
    PauseModal.tsx                   Resume / Restart / Home
    GameOverModal.tsx                Final + best, Retry / Home
  screens/
    HomeScreen.tsx                   Play, best score, sound toggle
    GameScreen.tsx                   Orchestrates canvas + store + sound/haptics
  __tests__/
    ballConfig.test.ts
    mergeLogic.test.ts
    gameStore.test.ts
assets/
  fruits/                            11 fruit images (added later)
  sounds/                            merge/drop/gameover (added later)
```

---

## Task 1: Project scaffold, dependencies, and tooling

**Files:**
- Create: `package.json`, `app.json`, `tsconfig.json`, `babel.config.js`, `jest.config.js`, `App.tsx` (placeholder), `.gitignore`
- Create: `src/__tests__/sanity.test.ts`

- [ ] **Step 1: Initialize the Expo project in place**

The working directory `/Users/daewonkim/Desktop/donggurami` already contains files (`docs/`, `cspell.json`, `.agents/`, `.omc/`). Create the Expo app in a temp dir and copy it in to avoid the non-empty-dir error.

Run:
```bash
cd /Users/daewonkim/Desktop && \
npx create-expo-app@latest _suika_tmp --template blank-typescript && \
cp -R _suika_tmp/. donggurami/ && \
rm -rf _suika_tmp donggurami/App.tsx donggurami/.git && \
cd donggurami && ls
```
Expected: `package.json`, `app.json`, `tsconfig.json`, `babel.config.js`, `assets/` now exist alongside `docs/`.

- [ ] **Step 2: Install runtime dependencies**

Run:
```bash
cd /Users/daewonkim/Desktop/donggurami && npx expo install \
  react-native-webview \
  @react-navigation/native @react-navigation/native-stack \
  react-native-screens react-native-safe-area-context \
  zustand \
  expo-av expo-haptics expo-asset \
  @react-native-async-storage/async-storage \
  matter-js
```
Expected: installs complete, `package.json` lists each package.

- [ ] **Step 3: Install dev dependencies for web + tests**

Run:
```bash
cd /Users/daewonkim/Desktop/donggurami && \
npx expo install react-dom react-native-web @expo/metro-runtime && \
npm install --save-dev jest jest-expo @types/jest @types/matter-js
```
Expected: dev deps installed.

- [ ] **Step 4: Configure strict TypeScript**

Replace `tsconfig.json` with:
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 5: Add Jest config and scripts**

Create `jest.config.js`:
```js
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@react-navigation/.*|zustand|matter-js))',
  ],
};
```

Merge these into the `"scripts"` block of `package.json`:
```json
{
  "scripts": {
    "start": "expo start",
    "web": "expo start --web",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "test": "jest",
    "test:watch": "jest --watch",
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 6: Configure portrait orientation and app identity in `app.json`**

In `app.json`, set inside `"expo"`: `"name": "Suika"`, `"slug": "suika"`, `"orientation": "portrait"`. Leave the rest of the generated config as-is.

- [ ] **Step 7: Add a placeholder `App.tsx`**

Create `App.tsx`:
```tsx
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text>Suika scaffold OK</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
```

- [ ] **Step 8: Write a sanity test**

Create `src/__tests__/sanity.test.ts`:
```ts
describe('toolchain', () => {
  it('runs jest', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 9: Run typecheck and tests**

Run: `cd /Users/daewonkim/Desktop/donggurami && npm run typecheck && npm test`
Expected: typecheck passes; jest runs `sanity.test.ts` → 1 passed.

- [ ] **Step 10: Verify web boots**

Run: `cd /Users/daewonkim/Desktop/donggurami && timeout 45 npx expo start --web --non-interactive || true`
Expected: Metro bundles for web without fatal errors (it will time out after 45s — that's fine; you're checking the bundle builds).

- [ ] **Step 11: Commit**

```bash
cd /Users/daewonkim/Desktop/donggurami && git init && git add -A && \
git commit -m "chore: scaffold Expo + web + jest toolchain for Suika clone"
```

---

## Task 2: Ball configuration (`ballConfig.ts`)

**Files:**
- Create: `src/utils/ballConfig.ts`
- Test: `src/__tests__/ballConfig.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/ballConfig.test.ts`:
```ts
import { BALLS, SPAWN_LEVELS, MAX_LEVEL, getBall } from '../utils/ballConfig';

describe('ballConfig', () => {
  it('defines exactly 11 fruit levels 0..10', () => {
    expect(BALLS).toHaveLength(11);
    BALLS.forEach((b, i) => expect(b.level).toBe(i));
  });

  it('has strictly increasing radii', () => {
    for (let i = 1; i < BALLS.length; i++) {
      expect(BALLS[i]!.radius).toBeGreaterThan(BALLS[i - 1]!.radius);
    }
  });

  it('uses the canonical triangular score table', () => {
    expect(BALLS.map((b) => b.score)).toEqual([0, 1, 3, 6, 10, 15, 21, 28, 36, 45, 55]);
  });

  it('spawns only the first five fruits', () => {
    expect(SPAWN_LEVELS).toEqual([0, 1, 2, 3, 4]);
  });

  it('exposes MAX_LEVEL = 10 and getBall by level', () => {
    expect(MAX_LEVEL).toBe(10);
    expect(getBall(10).name).toBe('Watermelon');
  });

  it('gives every fruit a non-empty name and color', () => {
    BALLS.forEach((b) => {
      expect(b.name.length).toBeGreaterThan(0);
      expect(b.color).toMatch(/^#/);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/daewonkim/Desktop/donggurami && npx jest ballConfig -v`
Expected: FAIL — cannot find module `../utils/ballConfig`.

- [ ] **Step 3: Implement `ballConfig.ts`**

Create `src/utils/ballConfig.ts`:
```ts
export interface Ball {
  /** 0..10 */
  level: number;
  name: string;
  /** physics + draw radius in canvas px */
  radius: number;
  /** hex fill used for the fallback circle */
  color: string;
  /** points awarded for FORMING this fruit (triangular: level*(level+1)/2) */
  score: number;
  /** key into the fruit image map (assets added later) */
  imageKey: string;
}

const NAMES = [
  'Cherry', 'Strawberry', 'Grape', 'Dekopon', 'Persimmon',
  'Apple', 'Pear', 'Peach', 'Pineapple', 'Melon', 'Watermelon',
] as const;

const RADII = [15, 22, 30, 38, 46, 55, 64, 75, 86, 96, 108] as const;

const COLORS = [
  '#E23B3B', '#E2553B', '#9B5FC0', '#F4A93B', '#F4683B',
  '#D7263D', '#A7C957', '#F6BD60', '#E9C46A', '#88C057', '#2A9D3F',
] as const;

export const BALLS: Ball[] = NAMES.map((name, level) => ({
  level,
  name,
  radius: RADII[level]!,
  color: COLORS[level]!,
  score: (level * (level + 1)) / 2,
  imageKey: name.toLowerCase(),
}));

export const MAX_LEVEL = 10;
export const SPAWN_LEVELS = [0, 1, 2, 3, 4];

export function getBall(level: number): Ball {
  const ball = BALLS[level];
  if (!ball) throw new Error(`No ball for level ${level}`);
  return ball;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/daewonkim/Desktop/donggurami && npx jest ballConfig -v`
Expected: PASS — all 6 tests green.

- [ ] **Step 5: Commit**

```bash
cd /Users/daewonkim/Desktop/donggurami && git add src/utils/ballConfig.ts src/__tests__/ballConfig.test.ts && \
git commit -m "feat: add fruit ball configuration with tests"
```

---

## Task 3: Merge logic (`mergeLogic.ts`)

**Files:**
- Create: `src/utils/mergeLogic.ts`
- Test: `src/__tests__/mergeLogic.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/mergeLogic.test.ts`:
```ts
import { getMergeResult, randomSpawnLevel } from '../utils/mergeLogic';

describe('getMergeResult', () => {
  it('merges two cherries (0) into a strawberry (1) for 1 point', () => {
    expect(getMergeResult(0)).toEqual({ nextLevel: 1, scoreGained: 1 });
  });

  it('merges two melons (8) into a level-9 fruit for 45 points', () => {
    expect(getMergeResult(8)).toEqual({ nextLevel: 9, scoreGained: 45 });
  });

  it('forms a watermelon (10) from two level-9 fruits for 55 points', () => {
    expect(getMergeResult(9)).toEqual({ nextLevel: 10, scoreGained: 55 });
  });

  it('returns null when two watermelons (10) touch — no further merge', () => {
    expect(getMergeResult(10)).toBeNull();
  });
});

describe('randomSpawnLevel', () => {
  it('always returns a spawnable level (0..4)', () => {
    for (let i = 0; i < 200; i++) {
      const lvl = randomSpawnLevel(() => Math.random());
      expect(lvl).toBeGreaterThanOrEqual(0);
      expect(lvl).toBeLessThanOrEqual(4);
    }
  });

  it('maps rng extremes to the ends of the spawn range', () => {
    expect(randomSpawnLevel(() => 0)).toBe(0);
    expect(randomSpawnLevel(() => 0.999999)).toBe(4);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/daewonkim/Desktop/donggurami && npx jest mergeLogic -v`
Expected: FAIL — cannot find module `../utils/mergeLogic`.

- [ ] **Step 3: Implement `mergeLogic.ts`**

Create `src/utils/mergeLogic.ts`:
```ts
import { MAX_LEVEL, SPAWN_LEVELS, getBall } from './ballConfig';

export interface MergeResult {
  nextLevel: number;
  scoreGained: number;
}

/**
 * Result of two fruits of `level` touching.
 * Returns null at MAX_LEVEL (watermelons do not merge).
 */
export function getMergeResult(level: number): MergeResult | null {
  if (level >= MAX_LEVEL) return null;
  const nextLevel = level + 1;
  return { nextLevel, scoreGained: getBall(nextLevel).score };
}

/** Pick a spawnable fruit level. `rng` defaults to Math.random; injectable for tests. */
export function randomSpawnLevel(rng: () => number = Math.random): number {
  const idx = Math.min(SPAWN_LEVELS.length - 1, Math.floor(rng() * SPAWN_LEVELS.length));
  return SPAWN_LEVELS[idx]!;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/daewonkim/Desktop/donggurami && npx jest mergeLogic -v`
Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
cd /Users/daewonkim/Desktop/donggurami && git add src/utils/mergeLogic.ts src/__tests__/mergeLogic.test.ts && \
git commit -m "feat: add pure merge logic and spawn picker with tests"
```

---

## Task 4: Game store (`gameStore.ts`)

**Files:**
- Create: `src/store/gameStore.ts`
- Test: `src/__tests__/gameStore.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/gameStore.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/daewonkim/Desktop/donggurami && npx jest gameStore -v`
Expected: FAIL — cannot find module `../store/gameStore`.

- [ ] **Step 3: Implement `gameStore.ts`**

Create `src/store/gameStore.ts`:
```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/daewonkim/Desktop/donggurami && npx jest gameStore -v`
Expected: PASS — all 7 tests green.

- [ ] **Step 5: Commit**

```bash
cd /Users/daewonkim/Desktop/donggurami && git add src/store/gameStore.ts src/__tests__/gameStore.test.ts && \
git commit -m "feat: add Zustand game store with persistence tests"
```

---

## Task 5: Vendor Matter.js as a string

**Files:**
- Create: `src/utils/vendor/matterMin.ts` (auto-generated)

- [ ] **Step 1: Generate the vendored source file**

Run:
```bash
cd /Users/daewonkim/Desktop/donggurami && mkdir -p src/utils/vendor && \
node -e "const fs=require('fs');const s=fs.readFileSync('node_modules/matter-js/build/matter.min.js','utf8');fs.writeFileSync('src/utils/vendor/matterMin.ts','/* AUTO-GENERATED from matter-js. Do not edit. */\n/* eslint-disable */\n// @ts-nocheck\nexport const MATTER_MIN: string = '+JSON.stringify(s)+';\n');"
```
Expected: `src/utils/vendor/matterMin.ts` created, exporting `MATTER_MIN` as a string literal.

- [ ] **Step 2: Verify it imports and is non-trivial**

Run:
```bash
cd /Users/daewonkim/Desktop/donggurami && node -e "const s=require('fs').readFileSync('src/utils/vendor/matterMin.ts','utf8');if(s.length<50000)throw new Error('matterMin too small');console.log('matterMin OK', s.length, 'chars');"
```
Expected: prints `matterMin OK <large number> chars`.

- [ ] **Step 3: Commit**

```bash
cd /Users/daewonkim/Desktop/donggurami && git add src/utils/vendor/matterMin.ts && \
git commit -m "chore: vendor matter.js source as injectable string"
```

---

## Task 6: The canvas game document (`gameHtml.ts`)

This is the physics/render/input engine. It is a pure string builder (no React), so it is easy to inject into either host. There are no unit tests here — it's verified manually in the browser in Task 11.

**Files:**
- Create: `src/utils/gameHtml.ts`

- [ ] **Step 1: Implement `gameHtml.ts`**

Create `src/utils/gameHtml.ts`:
```ts
import { BALLS, MAX_LEVEL, SPAWN_LEVELS } from './ballConfig';
import { MATTER_MIN } from './vendor/matterMin';

export interface GameHtmlOptions {
  /** canvas logical width in px */
  width?: number;
  /** canvas logical height in px */
  height?: number;
  /** level -> data URI; missing levels fall back to a colored circle */
  images?: Record<number, string>;
}

const WALL = 12;
const DROP_Y = 46;
const DANGER_Y = 96;

export function buildGameHtml(opts: GameHtmlOptions = {}): string {
  const width = opts.width ?? 360;
  const height = opts.height ?? 580;
  const config = {
    balls: BALLS,
    spawnLevels: SPAWN_LEVELS,
    maxLevel: MAX_LEVEL,
    width,
    height,
    wall: WALL,
    dropY: DROP_Y,
    dangerY: DANGER_Y,
    images: opts.images ?? {},
  };

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>
  html,body{margin:0;padding:0;background:#FDF6E3;overflow:hidden;
    -webkit-user-select:none;user-select:none;-webkit-touch-callout:none;touch-action:none;}
  #c{display:block;margin:0 auto;touch-action:none;}
</style>
</head>
<body>
<canvas id="c"></canvas>
<script>${MATTER_MIN}</script>
<script>
(function(){
  var CFG = ${JSON.stringify(config)};
  var M = Matter;
  var canvas = document.getElementById('c');
  var ctx = canvas.getContext('2d');
  var dpr = window.devicePixelRatio || 1;
  canvas.style.width = CFG.width + 'px';
  canvas.style.height = CFG.height + 'px';
  canvas.width = Math.floor(CFG.width * dpr);
  canvas.height = Math.floor(CFG.height * dpr);
  ctx.scale(dpr, dpr);

  // ---- preload images (fallback to colored circle if absent) ----
  var imgs = {};
  Object.keys(CFG.images).forEach(function(k){
    var im = new Image(); im.src = CFG.images[k]; imgs[k] = im;
  });

  // ---- bridge ----
  function send(msg){
    var s = JSON.stringify(msg);
    if (window.ReactNativeWebView) { window.ReactNativeWebView.postMessage(s); }
    else if (window.parent) { window.parent.postMessage(s, '*'); }
  }

  // ---- engine ----
  var engine = M.Engine.create();
  engine.gravity.y = 1;
  var world = engine.world;
  var runner = M.Runner.create();
  M.Runner.run(runner, engine);

  var w = CFG.width, h = CFG.height, t = CFG.wall;
  var opts = { isStatic:true, render:{visible:false} };
  M.Composite.add(world, [
    M.Bodies.rectangle(w/2, h + t/2, w, t, opts),          // floor
    M.Bodies.rectangle(-t/2, h/2, t, h*2, opts),           // left
    M.Bodies.rectangle(w + t/2, h/2, t, h*2, opts),        // right
  ]);

  function ballDef(level){ return CFG.balls[level]; }

  var current = pickSpawn();
  var next = pickSpawn();
  var previewX = w/2;
  var canDrop = true;
  var overSince = {}; // bodyId -> timestamp first seen above danger line
  var gameOver = false;
  var popScale = {}; // bodyId -> spawn animation progress 0..1
  var rng = Math.random;

  function pickSpawn(){
    var i = Math.min(CFG.spawnLevels.length-1, Math.floor(rng()*CFG.spawnLevels.length));
    return CFG.spawnLevels[i];
  }

  function makeBall(level, x, y, pop){
    var def = ballDef(level);
    var body = M.Bodies.circle(x, y, def.radius, {
      restitution: 0.15, friction: 0.4, frictionStatic: 0.6, density: 0.001,
    });
    body.plugin = { level: level };
    M.Composite.add(world, body);
    if (pop) popScale[body.id] = 0;
    return body;
  }

  function clampX(x, level){
    var r = ballDef(level).radius;
    return Math.max(t + r, Math.min(w - t - r, x));
  }

  // ---- input (Pointer Events: mouse + touch, web + native) ----
  function localX(e){
    var rect = canvas.getBoundingClientRect();
    return (e.clientX - rect.left);
  }
  canvas.addEventListener('pointermove', function(e){
    previewX = clampX(localX(e), current);
  });
  canvas.addEventListener('pointerdown', function(e){
    previewX = clampX(localX(e), current);
  });
  canvas.addEventListener('pointerup', function(e){
    if (!canDrop || gameOver) return;
    previewX = clampX(localX(e), current);
    makeBall(current, previewX, CFG.dropY, false);
    send({ type:'drop', level: current });
    canDrop = false;
    current = next;
    next = pickSpawn();
    send({ type:'next', level: next });
    setTimeout(function(){ canDrop = true; }, 380);
  });

  // ---- merging ----
  var score = 0;
  M.Events.on(engine, 'collisionStart', function(ev){
    for (var i=0;i<ev.pairs.length;i++){
      var a = ev.pairs[i].bodyA, b = ev.pairs[i].bodyB;
      if (!a.plugin || !b.plugin) continue;
      if (a.plugin.merged || b.plugin.merged) continue;
      if (a.plugin.level !== b.plugin.level) continue;
      var level = a.plugin.level;
      if (level >= CFG.maxLevel) continue;
      a.plugin.merged = true; b.plugin.merged = true;
      var mx = (a.position.x + b.position.x)/2;
      var my = (a.position.y + b.position.y)/2;
      M.Composite.remove(world, a);
      M.Composite.remove(world, b);
      delete popScale[a.id]; delete popScale[b.id];
      var nextLevel = level + 1;
      makeBall(nextLevel, mx, my, true);
      score += ballDef(nextLevel).score;
      send({ type:'merge', level: nextLevel, score: ballDef(nextLevel).score });
      send({ type:'score', value: score });
    }
  });

  // ---- game-over watch: a settled body above the danger line for >1s ----
  M.Events.on(engine, 'afterUpdate', function(){
    if (gameOver) return;
    var now = engine.timing.timestamp;
    var bodies = M.Composite.allBodies(world);
    for (var i=0;i<bodies.length;i++){
      var body = bodies[i];
      if (body.isStatic || !body.plugin) continue;
      var r = ballDef(body.plugin.level).radius;
      var top = body.position.y - r;
      var settled = body.speed < 0.6;
      if (top < CFG.dangerY && settled){
        if (!overSince[body.id]) overSince[body.id] = now;
        else if (now - overSince[body.id] > 1000){
          gameOver = true;
          M.Runner.stop(runner);
          send({ type:'gameover', score: score });
          return;
        }
      } else {
        delete overSince[body.id];
      }
    }
  });

  // ---- render loop ----
  function drawBall(level, x, y, angle, scale){
    var def = ballDef(level);
    var r = def.radius * (scale==null?1:scale);
    var im = imgs[String(level)];
    if (im && im.complete && im.naturalWidth > 0){
      ctx.save();
      ctx.translate(x, y); ctx.rotate(angle||0);
      ctx.drawImage(im, -r, -r, r*2, r*2);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI*2);
      ctx.fillStyle = def.color; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = 'bold '+Math.max(10, r*0.7)+'px sans-serif';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(String(level+1), x, y);
    }
  }

  function frame(){
    ctx.clearRect(0,0,w,h);
    // danger line
    ctx.strokeStyle = 'rgba(226,59,59,0.35)';
    ctx.setLineDash([6,6]); ctx.beginPath();
    ctx.moveTo(0, CFG.dangerY); ctx.lineTo(w, CFG.dangerY); ctx.stroke();
    ctx.setLineDash([]);

    var bodies = M.Composite.allBodies(world);
    for (var i=0;i<bodies.length;i++){
      var body = bodies[i];
      if (body.isStatic || !body.plugin) continue;
      var s = popScale[body.id];
      if (s != null && s < 1){ s = Math.min(1, s + 0.12); popScale[body.id] = s; }
      var scale = s==null?1:(0.6 + 0.4*s);
      drawBall(body.plugin.level, body.position.x, body.position.y, body.angle, scale);
    }
    // preview (current ball waiting to drop)
    if (canDrop && !gameOver){
      ctx.globalAlpha = 0.85;
      drawBall(current, previewX, CFG.dropY, 0, 1);
      ctx.globalAlpha = 1;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ---- commands from the shell ----
  window.__suika = {
    pause: function(){ runner.enabled = false; },
    resume: function(){ if(!gameOver) runner.enabled = true; },
    restart: function(){
      M.Composite.allBodies(world).forEach(function(b){
        if (!b.isStatic) M.Composite.remove(world, b);
      });
      overSince = {}; popScale = {}; score = 0; gameOver = false;
      current = pickSpawn(); next = pickSpawn(); canDrop = true;
      runner.enabled = true;
      if (!runner.enabled) {}
      M.Runner.run(runner, engine);
      send({ type:'score', value: 0 });
      send({ type:'next', level: next });
    }
  };
  // web host sends commands via postMessage({cmd:'pause'})
  window.addEventListener('message', function(e){
    var data = e.data;
    try { if (typeof data === 'string') data = JSON.parse(data); } catch(_) { return; }
    if (data && data.cmd && window.__suika[data.cmd]) window.__suika[data.cmd]();
  });

  send({ type:'ready' });
  send({ type:'next', level: next });
})();
</script>
</body>
</html>`;
}
```

- [ ] **Step 2: Sanity-check it builds a string with the engine inlined**

Create a throwaway check (do not commit this test; delete after):
```bash
cd /Users/daewonkim/Desktop/donggurami && cat > /tmp/htmlcheck.test.ts <<'EOF'
import { buildGameHtml } from '../src/utils/gameHtml';
it('builds html containing matter + bridge', () => {
  const html = buildGameHtml();
  expect(html).toContain('Matter');
  expect(html).toContain("type:'ready'");
  expect(html.length).toBeGreaterThan(60000);
});
EOF
npx jest --rootDir . /tmp/htmlcheck.test.ts 2>/dev/null || npx jest --config jest.config.js --roots /tmp 2>/dev/null; echo "manual: if jest path config blocks /tmp, instead add the test under src/__tests__ temporarily"
```
Expected: passes. If the temp-path approach is awkward in jest-expo, place the check at `src/__tests__/gameHtml.smoke.test.ts`, run `npx jest gameHtml.smoke`, confirm PASS, then `rm src/__tests__/gameHtml.smoke.test.ts`.

- [ ] **Step 3: Typecheck**

Run: `cd /Users/daewonkim/Desktop/donggurami && npm run typecheck`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
cd /Users/daewonkim/Desktop/donggurami && git add src/utils/gameHtml.ts && \
git commit -m "feat: add self-contained Matter.js canvas game document builder"
```

---

## Task 7: GameCanvas types + platform hosts

**Files:**
- Create: `src/components/GameCanvas.types.ts`
- Create: `src/components/GameCanvas.web.tsx`
- Create: `src/components/GameCanvas.native.tsx`

- [ ] **Step 1: Define shared types**

Create `src/components/GameCanvas.types.ts`:
```ts
import type { StyleProp, ViewStyle } from 'react-native';

export type GameEvent =
  | { type: 'ready' }
  | { type: 'drop'; level: number }
  | { type: 'merge'; level: number; score: number }
  | { type: 'score'; value: number }
  | { type: 'next'; level: number }
  | { type: 'gameover'; score: number };

export interface GameCanvasHandle {
  pause: () => void;
  resume: () => void;
  restart: () => void;
}

export interface GameCanvasProps {
  html: string;
  width: number;
  height: number;
  onEvent: (e: GameEvent) => void;
  style?: StyleProp<ViewStyle>;
}
```

- [ ] **Step 2: Implement the web host (iframe)**

Create `src/components/GameCanvas.web.tsx`:
```tsx
import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { GameCanvasHandle, GameCanvasProps, GameEvent } from './GameCanvas.types';

export const GameCanvas = forwardRef<GameCanvasHandle, GameCanvasProps>(
  ({ html, width, height, onEvent }, ref) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const send = (cmd: string) =>
      iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ cmd }), '*');

    useImperativeHandle(ref, () => ({
      pause: () => send('pause'),
      resume: () => send('resume'),
      restart: () => send('restart'),
    }));

    useEffect(() => {
      const onMessage = (e: MessageEvent) => {
        if (iframeRef.current && e.source !== iframeRef.current.contentWindow) return;
        let data: unknown = e.data;
        if (typeof data === 'string') {
          try { data = JSON.parse(data); } catch { return; }
        }
        if (data && typeof data === 'object' && 'type' in data) {
          onEvent(data as GameEvent);
        }
      };
      window.addEventListener('message', onMessage);
      return () => window.removeEventListener('message', onMessage);
    }, [onEvent]);

    return (
      <iframe
        ref={iframeRef}
        srcDoc={html}
        title="suika"
        width={width}
        height={height}
        style={{ border: 'none', background: '#FDF6E3' }}
      />
    );
  },
);
GameCanvas.displayName = 'GameCanvas';
```

- [ ] **Step 3: Implement the native host (WebView)**

Create `src/components/GameCanvas.native.tsx`:
```tsx
import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { GameCanvasHandle, GameCanvasProps, GameEvent } from './GameCanvas.types';

export const GameCanvas = forwardRef<GameCanvasHandle, GameCanvasProps>(
  ({ html, width, height, onEvent, style }, ref) => {
    const webRef = useRef<WebView>(null);

    const run = (cmd: string) => {
      webRef.current?.injectJavaScript(`window.__suika && window.__suika.${cmd}(); true;`);
    };

    useImperativeHandle(ref, () => ({
      pause: () => run('pause'),
      resume: () => run('resume'),
      restart: () => run('restart'),
    }));

    const handleMessage = (e: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(e.nativeEvent.data) as GameEvent;
        if (data && 'type' in data) onEvent(data);
      } catch {
        /* ignore malformed */
      }
    };

    return (
      <WebView
        ref={webRef}
        source={{ html }}
        style={[{ width, height, backgroundColor: '#FDF6E3' }, style]}
        originWhitelist={['*']}
        scrollEnabled={false}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        setBuiltInZoomControls={false}
      />
    );
  },
);
GameCanvas.displayName = 'GameCanvas';
```

- [ ] **Step 4: Typecheck**

Run: `cd /Users/daewonkim/Desktop/donggurami && npm run typecheck`
Expected: passes (Metro resolves `./GameCanvas` to `.web.tsx` on web and `.native.tsx` on native; importers use `from './GameCanvas'`).

- [ ] **Step 5: Commit**

```bash
cd /Users/daewonkim/Desktop/donggurami && git add src/components/GameCanvas.types.ts src/components/GameCanvas.web.tsx src/components/GameCanvas.native.tsx && \
git commit -m "feat: add platform-split GameCanvas hosts (iframe/WebView)"
```

---

## Task 8: Fruit images map + sound wrapper

**Files:**
- Create: `src/utils/fruitImages.ts`
- Create: `src/utils/sounds.ts`

- [ ] **Step 1: Implement the fruit image loader (fallback-aware)**

Assets do not exist yet. This module returns an empty map today and is the single place to wire real assets later. Create `src/utils/fruitImages.ts`:
```ts
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
```

- [ ] **Step 2: Implement the sound wrapper (no-op until assets exist)**

Create `src/utils/sounds.ts`:
```ts
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
```

- [ ] **Step 3: Typecheck**

Run: `cd /Users/daewonkim/Desktop/donggurami && npm run typecheck`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
cd /Users/daewonkim/Desktop/donggurami && git add src/utils/fruitImages.ts src/utils/sounds.ts && \
git commit -m "feat: add fallback-aware fruit image loader and sound wrapper"
```

---

## Task 9: Presentational components (ScoreBoard, NextBall)

**Files:**
- Create: `src/components/ScoreBoard.tsx`
- Create: `src/components/NextBall.tsx`

- [ ] **Step 1: Implement `ScoreBoard.tsx`**

Create `src/components/ScoreBoard.tsx`:
```tsx
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
```

- [ ] **Step 2: Implement `NextBall.tsx`**

Create `src/components/NextBall.tsx`:
```tsx
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
```

- [ ] **Step 3: Typecheck**

Run: `cd /Users/daewonkim/Desktop/donggurami && npm run typecheck`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
cd /Users/daewonkim/Desktop/donggurami && git add src/components/ScoreBoard.tsx src/components/NextBall.tsx && \
git commit -m "feat: add ScoreBoard and NextBall components"
```

---

## Task 10: Modal components (PauseModal, GameOverModal)

**Files:**
- Create: `src/components/PauseModal.tsx`
- Create: `src/components/GameOverModal.tsx`

- [ ] **Step 1: Implement `PauseModal.tsx`**

Create `src/components/PauseModal.tsx`:
```tsx
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

interface Props {
  visible: boolean;
  onResume: () => void;
  onRestart: () => void;
  onHome: () => void;
}

export function PauseModal({ visible, onResume, onRestart, onHome }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Paused</Text>
          <Btn label="Resume" primary onPress={onResume} />
          <Btn label="Restart" onPress={onRestart} />
          <Btn label="Home" onPress={onHome} />
        </View>
      </View>
    </Modal>
  );
}

function Btn({ label, onPress, primary }: { label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable style={[styles.btn, primary && styles.btnPrimary]} onPress={onPress}>
      <Text style={[styles.btnText, primary && styles.btnTextPrimary]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: '#FFF7EC', borderRadius: 20, padding: 24, width: 260, gap: 10 },
  title: { fontSize: 24, fontWeight: '800', color: '#5C4033', textAlign: 'center', marginBottom: 8 },
  btn: { backgroundColor: '#EADBC8', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#E2553B' },
  btnText: { fontSize: 16, fontWeight: '700', color: '#5C4033' },
  btnTextPrimary: { color: '#fff' },
});
```

- [ ] **Step 2: Implement `GameOverModal.tsx`**

Create `src/components/GameOverModal.tsx`:
```tsx
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
```

- [ ] **Step 3: Typecheck**

Run: `cd /Users/daewonkim/Desktop/donggurami && npm run typecheck`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
cd /Users/daewonkim/Desktop/donggurami && git add src/components/PauseModal.tsx src/components/GameOverModal.tsx && \
git commit -m "feat: add Pause and GameOver modals"
```

---

## Task 11: GameScreen orchestration

**Files:**
- Create: `src/screens/GameScreen.tsx`

- [ ] **Step 1: Implement `GameScreen.tsx`**

Create `src/screens/GameScreen.tsx`:
```tsx
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
  const { startGame, pauseGame, resumeGame, endGame, setScore, setNext, recordMerge } = useGameStore.getState();

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
          recordMerge(e.score);
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
    [recordMerge, setScore, setNext, endGame],
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
  canvasWrap: { borderRadius: 16, overflow: 'hidden', borderWidth: 3, borderColor: '#EADBC8' },
});
```

- [ ] **Step 2: Typecheck (expect one error until App.tsx exports the param list — fixed in Task 12)**

Run: `cd /Users/daewonkim/Desktop/donggurami && npm run typecheck`
Expected: only error is the unresolved `RootStackParamList` import from `../../App`. That is resolved in Task 12; proceed.

- [ ] **Step 3: Commit**

```bash
cd /Users/daewonkim/Desktop/donggurami && git add src/screens/GameScreen.tsx && \
git commit -m "feat: add GameScreen orchestration wiring canvas, store, sound, haptics"
```

---

## Task 12: HomeScreen + App navigation

**Files:**
- Create: `src/screens/HomeScreen.tsx`
- Overwrite: `App.tsx`

- [ ] **Step 1: Implement `HomeScreen.tsx`**

Create `src/screens/HomeScreen.tsx`:
```tsx
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
```

- [ ] **Step 2: Overwrite `App.tsx` with navigation + high-score hydration**

Replace `App.tsx`:
```tsx
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GameScreen } from './src/screens/GameScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { useGameStore } from './src/store/gameStore';

export type RootStackParamList = {
  Home: undefined;
  Game: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const loadHighScore = useGameStore((s) => s.loadHighScore);

  useEffect(() => {
    loadHighScore();
  }, [loadHighScore]);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Game" component={GameScreen} />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
```

- [ ] **Step 3: Full typecheck and test run**

Run: `cd /Users/daewonkim/Desktop/donggurami && npm run typecheck && npm test`
Expected: typecheck passes with no errors; all jest suites (ballConfig, mergeLogic, gameStore, sanity) pass.

- [ ] **Step 4: Commit**

```bash
cd /Users/daewonkim/Desktop/donggurami && git add App.tsx src/screens/HomeScreen.tsx && \
git commit -m "feat: add HomeScreen and navigation with high-score hydration"
```

---

## Task 13: CLAUDE.md and manual web verification

**Files:**
- Create: `CLAUDE.md`

- [ ] **Step 1: Write `CLAUDE.md`**

Create `CLAUDE.md`:
```markdown
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
  JSON message protocol; only the host glue differs.
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
```

- [ ] **Step 2: Launch the web build and verify gameplay manually**

Run: `cd /Users/daewonkim/Desktop/donggurami && npm run web`
Then in the browser, confirm:
- Home screen shows, "Best: 0", Play works.
- On the Game screen, a preview fruit follows the cursor and clamps to the walls.
- Clicking drops a fruit; it falls and stacks.
- Two equal fruits merge into the next fruit; score increases.
- Next preview updates after each drop.
- Pause button freezes the simulation; Resume continues; Restart clears the board.
- Filling above the dashed danger line ends the game; Game Over shows the score and best.
- Reloading the page preserves the best score.

- [ ] **Step 3: Commit**

```bash
cd /Users/daewonkim/Desktop/donggurami && git add CLAUDE.md && \
git commit -m "docs: add CLAUDE.md project guide"
```

---

## Self-Review notes (spec coverage)

- CLAUDE.md + scaffold → Tasks 1, 13. ✅
- ballConfig/mergeLogic + Jest → Tasks 2, 3. ✅
- gameHtml engine (gravity, walls, Pointer input, merge, render loop, danger line, bridge) → Task 6. ✅
- GameCanvas web/native split → Task 7. ✅
- gameStore (score/highScore/nextLevel/status/sound + persistence) → Task 4. ✅
- Screens (Home/Game) → Tasks 11, 12. ✅
- Components (ScoreBoard/NextBall/PauseModal/GameOverModal) → Tasks 9, 10. ✅
- Sound + haptics + persistence wiring → Tasks 4, 8, 11. ✅
- Asset fallbacks (images + sounds) → Tasks 6, 8, 9. ✅
- Pause/resume in-session, portrait, web-first → Tasks 1, 7, 11. ✅
```
