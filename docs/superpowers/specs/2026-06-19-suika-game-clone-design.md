# Suika Game Clone — Design

**Date:** 2026-06-19
**Status:** Approved (design phase)

## 1. Overview

A mobile clone of the Suika Game (Watermelon Game): the player drops fruits into a
jar; two fruits of the same size that touch merge into the next larger fruit. Score
grows with every merge. The game ends when fruits overflow the top of the jar.

There are 11 fruit levels, smallest to largest:

`Cherry → Strawberry → Grape → Dekopon → Persimmon → Apple → Pear → Peach → Pineapple → Melon → Watermelon`

## 2. Platform strategy: web-first, app later

The game ships to **web first** (`expo start --web`) and is built into a native app
later from the **same codebase**. This is possible because the entire game core
(Matter.js + canvas drawing + input) lives in one self-contained canvas document of
standard web tech that doesn't care what hosts it:

- **Web phase (now):** the document runs directly in the browser via Expo web. No
  WebView involved.
- **App phase (later):** the same document is hosted inside `react-native-webview`.
  The game core and the message protocol are unchanged.

Only a thin, platform-split host component differs between the two (see §3).

## 3. Tech Stack

- **Expo** (latest SDK) — foundation for both web (`expo start --web`) and native
  (`expo run:ios/android` / EAS) from one codebase.
- **React Native** + **react-native-web** + **TypeScript (strict mode)**.
- **react-native-webview** — hosts the physics canvas on **native only**.
- **HTML Canvas + Matter.js** — 2D rigid-body physics and rendering, vendored and
  inlined into the canvas document (no CDN; works offline).
- **Zustand** — game state (score, high score, next ball, status, sound).
- **expo-av** — sound effects. **expo-haptics** — merge vibration.
  **expo-asset** — load fruit images into the canvas. **@react-native-async-storage/async-storage** — high score persistence.
- **@react-navigation/native** + **native-stack** — Home/Game navigation (keeps the
  `src/screens/` layout literal; chosen over Expo Router for that reason).

Orientation is **portrait-locked** on native (`app.json` `orientation: "portrait"`);
the web layout is constrained to a portrait-aspect play area.

## 3. Architecture

```
App.tsx — React Navigation native-stack, portrait-locked
 ├─ src/screens/HomeScreen.tsx   → Play button, high score, sound toggle
 └─ src/screens/GameScreen.tsx   → orchestrates the game
      ├─ components/ScoreBoard.tsx     (current + best)
      ├─ components/NextBall.tsx       (upcoming fruit preview)
      ├─ components/GameCanvas.tsx     (the WebView — physics authority)
      ├─ components/PauseModal.tsx     (Resume / Restart / Home)
      └─ components/GameOverModal.tsx  (final + best, Retry / Home)
```

### Bridge model: the canvas document is the authority

Matter.js, the canvas, and input all live inside a single self-contained HTML
document. The app shell (web or native) owns navigation, score UI, persistence,
sound, and haptics — it never touches physics. Small events cross the bridge;
physics never chatters frame-by-frame across it.

The message **protocol** is identical on both platforms; only the host glue differs.

- **Canvas → shell** (JSON message):
  - `{type:'ready'}` — canvas initialized
  - `{type:'drop', level}` — a ball was dropped
  - `{type:'merge', level, score}` — a merge happened (level = the *resulting* fruit)
  - `{type:'score', value}` — authoritative score update
  - `{type:'next', level}` — next droppable fruit assigned
  - `{type:'gameover', score}` — overflow detected
- **Shell → canvas** (command): `pause()` (`runner.enabled = false`),
  `resume()` (`runner.enabled = true`), `restart()` (clear all bodies, reset score,
  spawn a fresh ball).

### `GameCanvas` — the platform-split host

`GameCanvas` is the only file that differs by platform; Metro auto-selects the
right one. Same HTML, same protocol.

| | Web (`GameCanvas.web.tsx`) | Native (`GameCanvas.native.tsx`) |
|---|---|---|
| Host | `<iframe srcDoc={html}>` | `<WebView source={{ html }}>` |
| Canvas → shell | `window.postMessage` + parent `message` listener | `ReactNativeWebView.postMessage` + `onMessage` |
| Shell → canvas | `iframe.contentWindow.postMessage(...)` | `webViewRef.injectJavaScript(...)` |

### Animation

No React animation library touches gameplay. Inside the canvas document:

- **Physics tick** — Matter.js `Runner` advances the simulation on its own rAF.
- **Render loop** — our own `requestAnimationFrame` clears the canvas and redraws
  each body at its current `position`/`angle` every frame; this redraw *is* the
  animation.
- **Merge pop** — a new merged fruit starts slightly scaled up and eases back to 1.0
  over ~150ms in the render loop (optional polish).

UI chrome (modals, buttons) animates separately — CSS on web, `Animated` on native.

### Input — Pointer Events

Input is handled inside the canvas using **Pointer Events**
(`pointerdown`/`pointermove`/`pointerup`), the one standard that unifies mouse
(desktop web), touch (mobile web), and touch (WebView in the app) with no branching:

- `pointermove` → the current fruit hovers at the top following the pointer x,
  clamped between the walls; rAF-throttled.
- `pointerup` → drop at that x, brief cooldown, then the next fruit appears.

## 4. State — `src/store/gameStore.ts` (Zustand)

State: `score`, `highScore`, `nextLevel`, `status: 'home' | 'playing' | 'paused' | 'gameover'`, `soundEnabled`.

Actions: `startGame`, `pauseGame`, `resumeGame`, `endGame`, `setScore`, `setNext`,
`recordMerge`, `resetGame`, `loadHighScore`, `toggleSound`.

`highScore` is hydrated from AsyncStorage on app start (`loadHighScore`) and written
whenever a game ends with a new best. `soundEnabled` is also persisted.

## 5. Pure, testable logic — `src/utils/`

- **`ballConfig.ts`** — single source of truth. Array of 11 fruits:
  `{ level, name, radius, color, score, imageKey }`. Radii strictly increase. Only
  levels 0–4 (Cherry→Persimmon) spawn as drop balls (canonical Suika). Imported by RN
  (NextBall) **and** serialized into the HTML so both sides agree.
- **`mergeLogic.ts`** — pure `getMergeResult(level) → { nextLevel, scoreGained }`
  using the canonical Suika score table. Level 10 (Watermelon) does not merge further.
  Unit-testable; its logic is also embedded into the WebView.
- **`gameHtml.ts`** — builds the self-contained HTML document consumed by both
  `GameCanvas` hosts: inlined Matter.js + injected `ballConfig` + the game loop
  (gravity, walls, Pointer-Event drop control, merge collision handling, render loop,
  danger-line game-over check, postMessage bridge).

## 6. Game rules

- **Input:** handled inside the canvas. A preview ball tracks the finger (clamped to
  the walls); release drops it at that x.
- **Merge:** on `collisionStart`, if both bodies are the same level and that level < 10,
  remove both, spawn level+1 at their midpoint, award `scoreGained`, emit `merge`.
- **Game over:** a body whose top edge stays above the danger line *at rest* for ~1s
  triggers `gameover`. Freshly dropped balls passing through the line get a grace
  period so they don't trigger it on the way down.
- **Scoring:** canonical Suika triangular table (forming each fruit awards
  progressively more): 0, 1, 3, 6, 10, 15, 21, 28, 36, 45, 55.

## 7. Assets (arriving later)

- **`assets/fruits/`** — 11 images keyed by `imageKey`. Loaded via `expo-asset`,
  passed to the canvas document as data URIs. Canvas draws the image if loaded,
  otherwise a colored-circle + level-number fallback. NextBall mirrors this fallback.
- **`assets/sounds/`** — merge / drop / gameover. `expo-av` plays them on the matching
  bridge events; silently no-ops if a file is missing.

The render path is built now so the game runs today with fallbacks and upgrades
cleanly when real assets are dropped in.

## 8. Folder structure

```
src/
  components/   ScoreBoard, NextBall, PauseModal, GameOverModal,
                GameCanvas.web.tsx, GameCanvas.native.tsx, GameCanvas.types.ts
  screens/      HomeScreen, GameScreen
  store/        gameStore.ts
  utils/        ballConfig.ts, mergeLogic.ts, gameHtml.ts
  assets/       fruits/, sounds/
App.tsx
CLAUDE.md
```

## 9. Testing

- **Jest unit tests:**
  - `ballConfig` — exactly 11 levels, strictly increasing radii, valid spawn set (0–4).
  - `mergeLogic` — score table correctness, level cap at 10 (Watermelon no-ops).
- **Manual:** physics, input, merging, sound, haptics, and game-over verified first in
  the browser (`expo start --web`), then later on device for the native build.

## 10. Out of scope (v1, YAGNI)

- Persisting an in-progress board across app restarts (pause/resume is in-session only).
- Online leaderboards, accounts, ads, themes.
- Landscape orientation.
