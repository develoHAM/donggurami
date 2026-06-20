# 🍉 Suika

A web-first Suika (Watermelon) game built on Expo. Drop fruits; two equal fruits that
touch merge into the next bigger one; the game ends when a ball rests 50% over the top line.

**Live demo:** `https://<your-user>.github.io/<repo>/` (published by the deploy workflow)

## Tech

- Expo (SDK 56) + React Native + react-native-web, TypeScript (strict)
- Matter.js physics + HTML Canvas, hosted in an `<iframe>` (web) / `react-native-webview` (native)
- Zustand state, Jest unit tests

See [`CLAUDE.md`](./CLAUDE.md) for architecture and [`docs/superpowers/`](./docs/superpowers) for the design + plan.

## Develop

```bash
npm ci
npm run web         # play in the browser (primary target)
npm run ios         # / npm run android — native (later)
npm test            # unit tests
npm run typecheck   # tsc --noEmit
npm run build:web   # static web export -> dist/
```

## CI/CD

Two GitHub Actions workflows:

- **CI** (`.github/workflows/ci.yml`) — on every push and pull request: typecheck, unit
  tests, and a web build to catch compile errors.
- **Deploy** (`.github/workflows/deploy.yml`) — on push to `main` and on `v*` tags:
  builds the web export and publishes it to **GitHub Pages** (free hosting).

### One-time setup to enable the live site

1. Push this repo to GitHub (public, so Pages is free).
2. In **Settings → Pages**, set **Source = GitHub Actions**.
3. Push to `main` (or run the Deploy workflow) — the site goes live at the URL above.

The build serves from the repo subpath via `EXPO_BASE_URL` (set automatically in the
deploy workflow). For a user/org root site (`<user>.github.io`), leave it empty.

## Versioning

Current release: **v1.0.0**. Tag releases as `vX.Y.Z`; pushing a `v*` tag also triggers a deploy.
