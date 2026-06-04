# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

ThoughtMap is a spatial thought-mapping application. Users converse with an AI co-cartographer, then extract insights as nodes on an infinite canvas. Nodes connect via typed edges and are organized into hierarchical maps and categorical realms.

## Commands

```bash
# Run the API server (port 5000)
pnpm --filter @workspace/api-server run dev

# Run the web frontend (requires PORT and BASE_PATH env vars)
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/living-thought-map run dev

# Full typecheck across all packages
pnpm run typecheck

# Regenerate API client hooks and Zod schemas from the OpenAPI spec
pnpm --filter @workspace/api-spec run codegen

# Push DB schema changes to the database (dev only)
pnpm --filter @workspace/db run push
```

There are no automated tests. Typechecking via `pnpm run typecheck` is the main correctness check.

## Required environment variables

Copy `.env.example` to `.env` and fill in:
- `GEMINI_API_KEY` — Google Gemini API key
- `DATABASE_URL` — PostgreSQL connection string
- `PORT` — Port for the API server (5000) and the Vite frontend
- `BASE_PATH` — Vite base path (`/` for local dev)

The Vite config (`artifacts/living-thought-map/vite.config.ts`) hard-fails at startup if `PORT` or `BASE_PATH` are missing.

## Monorepo structure

```
artifacts/
  api-server/          — Express 5 API (@workspace/api-server)
  living-thought-map/  — Main React SPA (@workspace/living-thought-map)
  living-thought-map-mobile/ — Expo mobile version
lib/
  api-spec/            — OpenAPI spec + Orval codegen config (@workspace/api-spec)
  api-client-react/    — Generated React Query hooks (@workspace/api-client-react)
  api-zod/             — Generated Zod validators (@workspace/api-zod)
  db/                  — Drizzle ORM schema + client (@workspace/db)
apps/
  mobile/              — Older standalone mobile app
```

`pnpm-workspace.yaml` defines the workspace and a shared `catalog:` for pinned dependency versions across packages. Always use `catalog:` references when adding dependencies that belong in the catalog.

## Architecture

### Frontend state: Zustand + localStorage

All application state lives in a single Zustand store (`artifacts/living-thought-map/src/store/index.ts`) using the `persist` middleware, keyed as `thought-map-storage` in localStorage. **There is no server-side state for the canvas** — the DB schema exists but the frontend does not currently read from or write to it. The store is the source of truth.

The store holds: all maps, nodes, edges, realms, chat history, per-node chat histories, Cartographer state, and UI state.

### Map hierarchy

Maps form a two-level tree:
- **Master map** (`MASTER_MAP_ID = 'master-map'`) — top-level grid of all maps
- **Detail maps** — created by `splitNodeIntoNewMap()` or `createSemanticField()`, linked to a parent node via `childMapId`/`subMapId`

`switchMap()` serializes the current map's nodes/edges back into `maps[currentMapId]` before switching. The active `nodes` and `edges` arrays in the store always reflect the current map only.

### Canvas rendering: ReactFlow

`SpatialCanvas` (`src/components/SpatialCanvas.tsx`) wraps ReactFlow. Three custom node types are registered:
- `thoughtMapNode` — standard node card
- `clusterMarker` — aggregated cluster dot at low zoom
- `semanticFieldNode` — node that links to a sub-map

The canvas uses **zoom-based visual modes** with hysteresis to avoid flicker. Transitions use different thresholds depending on direction to prevent rapid toggling:
- Zooming out: `FULL_CARD` → `COMPACT_CARD` at 0.84, `COMPACT_CARD` → `DOT` at 0.5, `DOT` → cluster mode below the cluster threshold
- Zooming in: cluster mode → `DOT` → `COMPACT_CARD` at 0.62, `COMPACT_CARD` → `FULL_CARD` at 0.95

Node drag positions are committed to the store only on `onNodeDragStop` — not during drag — to prevent coordinate feedback loops.

### AI: Gemini 2.0 Flash only

Both API routes call Google's Generative Language REST API directly (no SDK). The model is `gemini-2.0-flash`. **The app does not use OpenAI.**

**`POST /api/chat`** — streaming SSE chat. Supports `voice` parameter (6 styles: `default | mythic | academic | systems | ritual | void`). The AI can emit `LINK: <title1> → <title2> | <edgeType>` tokens that the store parses into edges automatically.

**`POST /api/cartographer`** — AI agent with 4 modes:
- `extract` — returns JSON variations of node candidates (non-streaming)
- `analyze` — returns structured JSON analysis of the map topology (non-streaming)
- `converse` / `wander` — streaming SSE prose responses (both are handled by the same code path and are functionally identical at the API level; any distinction is in prompt wording only)

Both routes have an in-memory IP-based rate limiter (20 req/min).

### Domain types

Defined in `artifacts/living-thought-map/src/types/index.ts`:

**Node types** (exact string values): `thought | joke | character | myth | research | canon | contradiction | artifact | fragment`

**Edge types** (exact string values): `evolves_from | contradicts | references | remixes | supports`

**Cartographer styles**: `default | mythic | academic | systems | ritual | void`

**Cartographer modes**: `extract | converse | wander | analyze`

### API codegen pipeline

`lib/api-spec/openapi.yaml` → Orval → two generated outputs:
1. `lib/api-client-react/src/generated/` — React Query hooks using the `customFetch` mutator
2. `lib/api-zod/src/generated/` — Zod validators

The OpenAPI spec title must stay `Api` (a hard assumption in import paths; see the Orval config's `titleTransformer`). Run codegen after any spec change.

### API server build

The server is bundled with esbuild (ESM output) via `artifacts/api-server/build.mjs`. The `dev` script runs build then start. pino logging transport files are handled by `esbuild-plugin-pino`.

### Import system

`importAdapters.ts` supports two import formats:
- **ThoughtMap JSON** — native export format (`{ nodes, edges, realms }`)
- **VaultMind** — external app format (detected by presence of any of: `artifacts`, `concepts`, or `relationships` fields)

Imports flow through Cartographer suggestions: nodes are staged as `cartographerSuggestions` and placed on the map one at a time by the user.

### Debug overlays

In development, press `Shift+D` to toggle debug overlays on the canvas. Individual debug channels are toggled in `artifacts/living-thought-map/src/config/debug.ts`.

## Gotchas

- The Vite frontend expects `PORT` and `BASE_PATH` as environment variables — it throws at startup without them.
- ReactFlow requires position values to be finite numbers. The store and canvas defensively guard against `NaN`/`Infinity` coordinates throughout — preserve these guards when modifying node position logic.
- `switchMap()` must be called to change maps; do not directly mutate `currentMapId` without syncing the current map's nodes/edges first.
- The OpenAPI spec title must remain `Api` — changing it breaks generated import paths.
- The `pnpm-workspace.yaml` has platform-specific binary overrides (esbuild, rollup, etc.) to strip packages irrelevant to the Linux Replit environment. Do not remove these.
