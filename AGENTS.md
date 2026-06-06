# AGENTS.md

## Rules

- **Never run `pnpm build` or `npx astro build` unless explicitly requested.**
- No lint, typecheck, or test scripts exist — do not look for them.

## Stack

- **Astro 6.3.3** SSR (`output: 'server'`), deployed on **Vercel**
- **Preact 10** via `@astrojs/preact` (`compat: true` — `react`/`react-dom` aliased to `preact/compat`)
- **Tailwind CSS v4** via `@tailwindcss/vite` plugin (PostCSS-less, Vite-native)
- **TypeScript** strict, `@/*` → `src/*`
- **PostgreSQL + Drizzle ORM** (`drizzle-orm` + `drizzle-kit`)
- **Pusher** (`pusher-js` 7.6 client, `pusher` 5.2 server) for realtime
- **Auth**: `auth-astro` / Better Auth
- **Icons**: `lucide-preact`

## Commands

```sh
pnpm dev              # astro dev
pnpm db:generate      # drizzle-kit generate
pnpm db:migrate       # tsx ./src/db/migrator.ts
```

## Config

- `@/*` → `src/*` (tsconfig.json)
- `class` attribute in both Astro and Preact/TSX (Preact supports both)
- Environment variables in `astro.config.mjs` `env.schema`, accessed via `astro:env/client` or `astro:env/server`
- CDN: `https://cdn.saltouruguayserver.com/sounds/` for audio, `https://cdn.saltouruguayserver.com` for images

## Project structure

- `src/actions/` — Astor server actions (RPC endpoints, one file per domain)
- `src/components/` — Preact/React components, organized by feature
- `src/pages/` — Astro file-based routes
- `src/layouts/` — Astro layouts
- `src/db/schema.ts` — All Drizzle table definitions (~1300 lines)
- `src/services/` — Singleton services (Pusher, Discord, cache, etc.)
- `src/utils/` — Backend logic, organized by domain
- `src/consts/` — Constants: Pusher events/channels, sounds, teams, emotes
- `src/stores/` — Zustand stores
- `src/assets/styles/global.css` — Tailwind v4 theme with custom fonts and utilities

## Architecture notes

- **Pusher client** is a singleton (`PusherService` in `src/services/pusher.client.ts`). Never create multiple instances. Use `pusherService.bind/unbind()` over `channel.bind/unbind()` to avoid leaking handlers.
- **Dark theme only** — `data-theme="dark"` on `<html>` always.
- **Tailwind v4** — uses `@tailwindcss/vite` (no PostCSS config). Theme vars in `global.css` under `@theme`.
- **Drizzle** schema-first: update `src/db/schema.ts`, run `pnpm db:generate`, then `pnpm db:migrate`.
- **Fonts**: `font-anton`, `font-rubik`, `font-teko`, `font-atomic`, `font-squids`, `font-press-start-2p` available globally.

## Ruleta Loca Multiplayer — Status

### Done
- DB schema: added `roomCode`, `ownerId`, `playerIds[]`, `scores` (jsonb), `currentTurnIdx`, `turnOrder[]`, `maxPlayers`, `gameMode` to `ruleta_loca_game_sessions`
- Migration generated (`0002_sour_silver_fox.sql`) and applied
- Pusher constants: `PUSHER_CHANNELS_RULETA` + `PUSHER_EVENTS_RULETA` in `src/consts/pusher.ts`
- Pusher service helper: `src/services/ruleta-loca-pusher.ts` — `RuletaLocaPusher` with methods for all room/game events
- Multiplayer utils: `createMultiplayerRoom`, `getRoomByCode`, `joinRoomByCode`, `leaveRoomByCode`, `startMultiplayerGame`, `advanceTurn`, `getCurrentRoomSession`, `completeMultiplayerGame` in `src/utils/games/ruleta-loca.ts`
- Server actions: `createRoom`, `joinRoom`, `leaveRoom`, `startMultiplayerGame`, `getRoomState`, `spinWheelMulti`, `guessLetterMulti`, `solvePuzzleMulti`, `forfeitMulti` in `src/actions/games/ruleta-loca.ts`

### Done
- `src/pages/pusher/auth.ts` — validates room membership for `presence-ruleta-*` channels
- `src/components/games/RuletaLoca.tsx` — lobby UI (create/join room, player list, start button, copy room code), Pusher subscription via `usePusherChannel`, turn-based blocking with turn indicator, multiplayer spin/guess/solve actions, scoreboard with current-turn highlighting, game-over with final scores
- `src/pages/comunidad/juegos/ruleta-loca.astro` — passes `userId` prop to component
